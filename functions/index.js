const { setGlobalOptions } = require('firebase-functions/v2');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentWritten, onDocumentDeleted } = require('firebase-functions/v2/firestore');
const { updateEventActiveRosterTotalFromWrite, recomputeEventActiveRosterTotal } = require('./activeRosterUnits.cjs');
const { bumpParticipantCacheVersionsFromWrite, scheduleLogsCacheBumps } = require('./cacheVersionBump.cjs');
const { DateTime } = require('luxon');
const { computeParticipantLiquidationTarget } = require('./reminderFinance.cjs');
const { buildPaymentReminderWhatsAppMessage } = require('./paymentReminderMessage.cjs');
const {
  loadProtectedStaffAuthUids,
  purgeAnonymousAuthUsers,
  listAnonymousAuthUsers,
  deleteAnonymousAuthUserByUid,
} = require('./purgeAnonymousAuth.cjs');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const logger = require('firebase-functions/logger');

setGlobalOptions({ region: 'us-central1' });

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = getFirestore(admin.app(), 'registros-vnpm');

/**
 * Mantiene `activeRosterUnitsTotal` en cada `app_events` al crear/editar/borrar participantes.
 * El hub del panel solo lee ese campo (sin consultar `app_participants`).
 */
exports.syncEventActiveRosterUnitsOnParticipantWrite = onDocumentWritten(
  {
    document: 'app_participants/{participantId}',
    database: 'registros-vnpm',
    memory: '512MiB',
  },
  async (event) => {
    const beforeSnap = event.data.before;
    const afterSnap = event.data.after;
    const before = beforeSnap && beforeSnap.exists ? beforeSnap.data() : null;
    const after = afterSnap && afterSnap.exists ? afterSnap.data() : null;
    const ids = new Set();
    if (before?.eventId != null && String(before.eventId).trim()) ids.add(String(before.eventId).trim());
    if (after?.eventId != null && String(after.eventId).trim()) ids.add(String(after.eventId).trim());
    for (const eid of ids) {
      try {
        await updateEventActiveRosterTotalFromWrite(db, eid, before, after);
      } catch (e) {
        logger.error('syncEventActiveRosterUnitsOnParticipantWrite', { eid, error: e });
      }
    }
    try {
      await bumpParticipantCacheVersionsFromWrite(db, before, after);
    } catch (e) {
      logger.error('bumpParticipantCacheVersionsFromWrite', { error: e });
    }
  }
);

const CONFIG_REF = () => db.collection('app_data').doc('config');
const LOGS_ORDER_FIELD = 'createdAt';

/** Invalida caché de logs recientes cuando se escribe en `app_logs` (cualquier origen). */
exports.syncLogsCacheVersionOnLogWrite = onDocumentWritten(
  {
    document: 'app_logs/{logId}',
    database: 'registros-vnpm',
  },
  async (event) => {
    const beforeExists = event.data.before.exists;
    const afterExists = event.data.after.exists;
    if (!afterExists) return;
    try {
      scheduleLogsCacheBumps(db, {
        countDelta: beforeExists ? 0 : 1,
        action: 'log-write',
      });
    } catch (e) {
      logger.error('syncLogsCacheVersionOnLogWrite', { error: e });
    }
  }
);

/** Mantiene contador si el borrado no pasa por onDocumentWritten (delete directo). */
exports.syncLogsCountOnLogDelete = onDocumentDeleted(
  {
    document: 'app_logs/{logId}',
    database: 'registros-vnpm',
  },
  async (event) => {
    try {
      scheduleLogsCacheBumps(db, { countDelta: -1, action: 'log-delete' });
    } catch (e) {
      logger.error('syncLogsCountOnLogDelete', { error: e });
    }
    // Cascada: al borrar un log, elimina su snapshot lateral y su revert (mismo id).
    try {
      const logId = String(event?.params?.logId || '').trim();
      if (logId) {
        await Promise.allSettled([
          db.collection('app_log_snapshots').doc(logId).delete(),
          db.collection('app_log_reverts').doc(logId).delete(),
        ]);
      }
    } catch (e) {
      logger.error('syncLogsCountOnLogDelete cascade', { error: e });
    }
  }
);

const { trimActivityLogsToLimit, backfillLogVisibleInPanel } = require('./activityLogsTrim.cjs');

async function readLogStorageMaxEntriesLimit() {
  const cfgSnap = await CONFIG_REF().get();
  return Math.min(
    50000,
    Math.max(1000, Math.floor(Number(cfgSnap.data()?.logStorageMaxEntries) || 10000))
  );
}

async function runLogStorageTrimJob() {
  const limitTarget = await readLogStorageMaxEntriesLimit();
  const result = await trimActivityLogsToLimit(db, limitTarget, LOGS_ORDER_FIELD);
  return { limitTarget, ...result };
}

/** Recorte programado de `app_logs` según `logStorageMaxEntries` en config. */
exports.trimActivityLogsScheduled = onSchedule(
  {
    schedule: '0 */6 * * *',
    timeZone: 'America/Mexico_City',
    memory: '512MiB',
  },
  async () => {
    try {
      const result = await runLogStorageTrimJob();
      logger.info('trimActivityLogsScheduled', result);
    } catch (e) {
      logger.error('trimActivityLogsScheduled failed', e);
    }
  }
);

/** Admin: recorte inmediato según `logStorageMaxEntries` (p. ej. tras bajar el límite). */
exports.adminTrimActivityLogsNow = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
  }
  const callerQuery = await db.collection('app_users').where('authUid', '==', request.auth.uid).limit(1).get();
  if (callerQuery.empty) {
    throw new HttpsError('permission-denied', 'Sin perfil en el sistema.');
  }
  const callerRole = String(callerQuery.docs[0].data()?.role || '');
  if (callerRole !== 'SuperUsuario' && callerRole !== 'Administrador') {
    throw new HttpsError('permission-denied', 'Solo administradores pueden recortar el historial.');
  }
  const result = await runLogStorageTrimJob();
  return { ok: true, ...result };
});

/**
 * Una sola vez tras desplegar: SuperUsuario recalcula todos los eventos (rellena el campo en docs viejos).
 */
exports.adminBackfillEventActiveRosterTotals = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
  }
  const callerQuery = await db.collection('app_users').where('authUid', '==', request.auth.uid).limit(1).get();
  if (callerQuery.empty) {
    throw new HttpsError('permission-denied', 'Sin perfil en el sistema.');
  }
  const role = String(callerQuery.docs[0].data().role || '');
  if (role !== 'SuperUsuario') {
    throw new HttpsError('permission-denied', 'Solo SuperUsuario puede ejecutar el rellenado.');
  }
  const eventsSnap = await db.collection('app_events').get();
  let ok = 0;
  for (const d of eventsSnap.docs) {
    try {
      await recomputeEventActiveRosterTotal(db, d.id);
      ok += 1;
    } catch (e) {
      logger.error('adminBackfillEventActiveRosterTotals event', { id: d.id, error: e });
    }
  }
  return { ok: true, eventsUpdated: ok, total: eventsSnap.size };
});

function normalizeAuthEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

function normalizeUsernameKey(username) {
  const safe = String(username || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '_');
  return safe || 'user';
}


/**
 * Login con «solo usuario»: resuelve el correo real de Firebase guardado en app_users (sin leer Firestore desde el cliente anónimo).
 */
exports.resolveLoginAuthEmail = onCall(async (request) => {
  const raw = String(request.data?.username || '').trim();
  if (!raw || raw.includes('@')) {
    throw new HttpsError('invalid-argument', 'Indica solo el nombre de usuario.');
  }
  const variants = [
    ...new Set([
      raw,
      raw.toLowerCase(),
      raw.toUpperCase(),
      raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase(),
      normalizeUsernameKey(raw),
    ]),
  ].filter(Boolean);

  for (const v of variants) {
    const snap = await db.collection('app_users').where('username', '==', v).limit(1).get();
    if (!snap.empty) {
      const ae = normalizeAuthEmail(snap.docs[0].data().authEmail || '');
      return { authEmail: ae || null };
    }
  }
  return { authEmail: null };
});

/**
 * Administradores: actualiza el correo de acceso en Firebase Auth y en app_users.
 */
exports.updateUserAuthEmail = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
  }
  const userId = request.data?.userId;
  const rawNew = request.data?.newEmail;
  if (!userId || typeof userId !== 'string') {
    throw new HttpsError('invalid-argument', 'Falta userId.');
  }
  const newEmail = normalizeAuthEmail(rawNew);
  if (!newEmail || !newEmail.includes('@')) {
    throw new HttpsError('invalid-argument', 'Indica un correo válido.');
  }

  const callerQuery = await db.collection('app_users').where('authUid', '==', request.auth.uid).limit(1).get();
  if (callerQuery.empty) {
    throw new HttpsError('permission-denied', 'Sin perfil en el sistema.');
  }
  const callerRole = callerQuery.docs[0].data().role;
  if (callerRole !== 'Administrador' && callerRole !== 'SuperUsuario') {
    throw new HttpsError('permission-denied', 'Solo administradores pueden cambiar el correo de acceso.');
  }

  const targetSnap = await db.collection('app_users').doc(userId).get();
  if (!targetSnap.exists) {
    throw new HttpsError('not-found', 'Usuario no encontrado.');
  }
  const authUid = targetSnap.data().authUid;
  if (!authUid) {
    throw new HttpsError('failed-precondition', 'El perfil no tiene cuenta de acceso vinculada.');
  }

  const dup = await db.collection('app_users').where('authEmail', '==', newEmail).limit(2).get();
  const conflict = dup.docs.find((d) => d.id !== userId);
  if (conflict) {
    throw new HttpsError('already-exists', 'Ese correo ya está asignado a otro usuario.');
  }

  try {
    await getAuth().updateUser(authUid, { email: newEmail });
    await db.collection('app_users').doc(userId).update({ authEmail: newEmail });
  } catch (e) {
    logger.error('updateUserAuthEmail', e);
    if (e?.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'Ese correo ya está en uso en Firebase Authentication.');
    }
    throw new HttpsError('internal', 'No se pudo actualizar el correo de acceso.');
  }
  return { ok: true };
});

/**
 * Administradores: elimina usuario en Firebase Authentication y su perfil en app_users.
 * Se conserva atomicidad lógica: si falla Auth, no se borra el perfil.
 */
exports.deleteUserAccount = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
  }
  const userId = String(request.data?.userId || '').trim();
  if (!userId) {
    throw new HttpsError('invalid-argument', 'Falta userId.');
  }

  const callerQuery = await db.collection('app_users').where('authUid', '==', request.auth.uid).limit(1).get();
  if (callerQuery.empty) {
    throw new HttpsError('permission-denied', 'Sin perfil en el sistema.');
  }
  const caller = callerQuery.docs[0].data() || {};
  const callerRole = String(caller.role || '');
  const callerDocId = String(callerQuery.docs[0].id || '');
  if (callerRole !== 'Administrador' && callerRole !== 'SuperUsuario') {
    throw new HttpsError('permission-denied', 'Solo administradores pueden eliminar usuarios.');
  }
  if (callerDocId === userId) {
    throw new HttpsError('failed-precondition', 'No puedes eliminar tu propia cuenta.');
  }

  const targetRef = db.collection('app_users').doc(userId);
  const targetSnap = await targetRef.get();
  if (!targetSnap.exists) {
    throw new HttpsError('not-found', 'Usuario no encontrado.');
  }
  const target = targetSnap.data() || {};
  const targetRole = String(target.role || '');
  if (targetRole === 'SuperUsuario' && callerRole !== 'SuperUsuario') {
    throw new HttpsError('permission-denied', 'Solo un SuperUsuario puede eliminar a otro SuperUsuario.');
  }

  const authUid = String(target.authUid || '').trim();
  if (authUid) {
    try {
      await getAuth().deleteUser(authUid);
    } catch (e) {
      logger.error('deleteUserAccount: delete auth user failed', { userId, authUid, error: e });
      if (e?.code === 'auth/user-not-found') {
        // Si ya no existe en Auth, seguimos con la limpieza de Firestore.
      } else {
        throw new HttpsError('internal', 'No se pudo eliminar la cuenta en Firebase Authentication.');
      }
    }
  }

  await targetRef.delete();
  return { ok: true };
});

/**
 * Tras un intento de login con Google sin perfil en app_users: elimina la cuenta recién creada en Firebase Auth
 * para que no quede registrado un usuario no autorizado por administradores.
 * Solo actúa si el proveedor de la sesión es Google y no hay documento de app_users que corresponda.
 */
exports.removeUnauthorizedGoogleAuthUser = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sesión requerida.');
  }
  const uid = request.auth.uid;

  let rec;
  try {
    rec = await getAuth().getUser(uid);
  } catch (e) {
    logger.warn('removeUnauthorizedGoogleAuthUser: getUser', e);
    return { deleted: false, reason: 'no_auth_record' };
  }

  const hasGoogle = (rec.providerData || []).some((p) => p.providerId === 'google.com');
  if (!hasGoogle) {
    return { deleted: false, reason: 'not_google_provider' };
  }

  const email = normalizeAuthEmail(rec.email || '');
  if (!email) {
    await getAuth().deleteUser(uid);
    return { deleted: true, reason: 'no_email' };
  }

  let snap = await db.collection('app_users').where('authUid', '==', uid).limit(1).get();
  if (!snap.empty) {
    return { deleted: false, reason: 'profile_exists' };
  }

  snap = await db.collection('app_users').where('authEmail', '==', email).limit(1).get();
  if (!snap.empty) {
    return { deleted: false, reason: 'profile_exists' };
  }

  const at = email.lastIndexOf('@');
  const localRaw = at >= 0 ? email.slice(0, at) : email;
  const variants = [
    ...new Set([
      localRaw,
      localRaw.toLowerCase(),
      localRaw.toUpperCase(),
      localRaw.charAt(0).toUpperCase() + localRaw.slice(1).toLowerCase(),
      normalizeUsernameKey(localRaw),
    ]),
  ].filter(Boolean);

  for (const v of variants) {
    snap = await db.collection('app_users').where('username', '==', v).limit(1).get();
    if (!snap.empty) {
      return { deleted: false, reason: 'profile_exists' };
    }
  }

  const nameHintLower = localRaw.toLowerCase();
  const allUsers = await db.collection('app_users').get();
  for (const d of allUsers.docs) {
    const u = d.data()?.username;
    if (u != null && String(u).trim().toLowerCase() === nameHintLower) {
      return { deleted: false, reason: 'profile_exists' };
    }
  }

  try {
    await getAuth().deleteUser(uid);
    logger.info('removeUnauthorizedGoogleAuthUser: cuenta Google no autorizada eliminada de Auth.', { uid, email });
    return { deleted: true, reason: 'unauthorized' };
  } catch (e) {
    logger.error('removeUnauthorizedGoogleAuthUser: deleteUser', e);
    throw new HttpsError('internal', 'No se pudo revocar el acceso.');
  }
});

/** Lunes 11:00 (Ciudad de México): encola recordatorio WhatsApp si hay saldo y no hubo abono la semana calendario anterior. */
function paymentHistoryRowMs(row) {
  if (!row || row.kind === 'comment') return null;
  if (row.recordedAt) {
    const t = new Date(row.recordedAt).getTime();
    if (Number.isFinite(t)) return t;
  }
  if (row.date) {
    const t = new Date(row.date).getTime();
    if (Number.isFinite(t)) return t;
  }
  return null;
}

function hadQualifyingPaymentInRange(paymentHistory, startMs, endMs) {
  const hist = Array.isArray(paymentHistory) ? paymentHistory : [];
  for (const row of hist) {
    if (!row || row.kind === 'comment') continue;
    const amt = Number(row.amount);
    if (!Number.isFinite(amt) || amt <= 0) continue;
    const ms = paymentHistoryRowMs(row);
    if (ms == null) continue;
    if (ms >= startMs && ms <= endMs) return true;
  }
  return false;
}

function normalizeWhatsAppPhoneDigits(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  if (d.length === 10) return `52${d}`;
  if (d.startsWith('52') && d.length === 12) return d;
  if (d.length >= 11) return d;
  return null;
}

async function requireSuperUsuarioCaller(request) {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
  }
  const callerQuery = await db.collection('app_users').where('authUid', '==', request.auth.uid).limit(1).get();
  if (callerQuery.empty) {
    throw new HttpsError('permission-denied', 'Sin perfil en el sistema.');
  }
  const callerRole = String(callerQuery.docs[0].data()?.role || '');
  if (callerRole !== 'SuperUsuario') {
    throw new HttpsError('permission-denied', 'Solo el SuperUsuario puede realizar esta acción.');
  }
  return callerQuery.docs[0];
}

/** Medianoche (CDMX): borra todas las cuentas anónimas huérfanas (excepto authUid de app_users). */
exports.purgeStaleAnonymousAuthUsers = onSchedule(
  {
    schedule: '0 0 * * *',
    timeZone: 'America/Mexico_City',
    memory: '256MiB',
    timeoutSeconds: 300,
  },
  async () => {
    const protectedUids = await loadProtectedStaffAuthUids(db);
    const result = await purgeAnonymousAuthUsers({
      minAgeMs: 0,
      protectedUids,
    });
    logger.info('purgeStaleAnonymousAuthUsers', result);
  }
);

/** SuperUsuario: lista cuentas anónimas atorradas en Authentication. */
exports.adminListAnonymousAuthUsers = onCall(async (request) => {
  await requireSuperUsuarioCaller(request);
  const protectedUids = await loadProtectedStaffAuthUids(db);
  return listAnonymousAuthUsers({ protectedUids });
});

/** SuperUsuario: elimina una cuenta anónima por UID. */
exports.adminDeleteAnonymousAuthUser = onCall(async (request) => {
  await requireSuperUsuarioCaller(request);
  const uid = String(request.data?.uid || '').trim();
  if (!uid) {
    throw new HttpsError('invalid-argument', 'Falta el UID de la cuenta anónima.');
  }
  const protectedUids = await loadProtectedStaffAuthUids(db);
  const result = await deleteAnonymousAuthUserByUid(uid, protectedUids);
  if (!result.ok) {
    if (result.reason === 'protected') {
      throw new HttpsError('failed-precondition', 'Esa cuenta está vinculada a un usuario del panel y no se puede borrar.');
    }
    if (result.reason === 'not_anonymous') {
      throw new HttpsError('failed-precondition', 'Esa cuenta no es anónima.');
    }
    throw new HttpsError('invalid-argument', 'No se pudo eliminar la cuenta.');
  }
  logger.info('adminDeleteAnonymousAuthUser', { caller: request.auth.uid, uid, ...result });
  return { ok: true, ...result };
});

/**
 * SuperUsuario: limpia cuentas anónimas huérfanas en Authentication.
 * @param {{ maxAgeMinutes?: number }} data — 0 = todas las anónimas (excepto authUid de app_users).
 */
exports.adminPurgeAnonymousAuthUsers = onCall(async (request) => {
  await requireSuperUsuarioCaller(request);

  const maxAgeMinutes = Math.max(0, Number(request.data?.maxAgeMinutes ?? 0));
  const protectedUids = await loadProtectedStaffAuthUids(db);
  const result = await purgeAnonymousAuthUsers({
    minAgeMs: maxAgeMinutes > 0 ? maxAgeMinutes * 60 * 1000 : 0,
    protectedUids,
  });
  logger.info('adminPurgeAnonymousAuthUsers', { caller: request.auth.uid, maxAgeMinutes, ...result });
  return { ok: true, maxAgeMinutes, ...result };
});

exports.enqueueWeeklyPaymentReminderWhatsApp = onSchedule(
  {
    schedule: '0 11 * * 1',
    timeZone: 'America/Mexico_City',
    memory: '512MiB',
    timeoutSeconds: 540,
  },
  async () => {
    const nowMx = DateTime.now().setZone('America/Mexico_City');
    const thisMonday = nowMx.startOf('week');
    const prevMonday = thisMonday.minus({ weeks: 1 });
    const prevSunday = thisMonday.minus({ days: 1 }).endOf('day');
    const startMs = prevMonday.toMillis();
    const endMs = prevSunday.toMillis();
    const weekKey = `${thisMonday.weekYear}-W${String(thisMonday.weekNumber).padStart(2, '0')}`;

    const eventsSnap = await db.collection('app_events').get();
    let batch = db.batch();
    let batchCount = 0;
    const flush = async () => {
      if (batchCount === 0) return;
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    };

    for (const evDoc of eventsSnap.docs) {
      const eventData = { id: evDoc.id, ...evDoc.data() };
      const deadline = String(eventData.paymentDeadlineDate || '').trim();
      if (!deadline) continue;

      const participantsSnap = await db.collection('app_participants').where('eventId', '==', evDoc.id).get();

      for (const pDoc of participantsSnap.docs) {
        const data = pDoc.data();
        const status = data?.status || 'active';
        if (status === 'waitlist' || status === 'archived' || status === 'cancelled') continue;

        const paid = parseFloat(data.paid) || 0;
        const person = { id: pDoc.id, ...data };
        const liq = computeParticipantLiquidationTarget(person, eventData);
        const debt = Math.max(0, liq - paid);
        if (debt < 0.02) continue;

        if (hadQualifyingPaymentInRange(data.paymentHistory, startMs, endMs)) continue;

        const phoneOk = normalizeWhatsAppPhoneDigits(data.phone);
        if (!phoneOk) continue;

        const notifId = `wa-pr-${evDoc.id}-${weekKey}`;
        const waList = Array.isArray(data.whatsAppFinanceNotifications) ? data.whatsAppFinanceNotifications : [];
        if (waList.some((n) => n && String(n.id) === notifId)) continue;

        const createdAt = Date.now();
        const loc = String(data.location || '').trim();
        const msg = buildPaymentReminderWhatsAppMessage({
          person,
          loc,
          pendingDebt: debt,
          paymentDeadlineDate: deadline,
          reportedAtMs: createdAt,
          eventSnapshot: eventData,
        });

        const notification = {
          id: notifId,
          kind: 'recordatorio_pago',
          createdAt,
          sent: false,
          sentAt: null,
          reminderWeekKey: weekKey,
          pendingDebt: debt,
          liquidationTarget: liq,
          paymentDeadlineDate: deadline,
          message: msg,
        };

        batch.update(pDoc.ref, {
          whatsAppFinanceNotifications: [...waList, notification],
        });
        batchCount += 1;
        if (batchCount >= 400) await flush();
      }
    }
    await flush();
    logger.info('enqueueWeeklyPaymentReminderWhatsApp ok', { weekKey, startMs, endMs });
  }
);

const { runSensitiveDataRetentionPurge, runPrivacyConsentBackfill } = require('./privacyRetention.cjs');

/** Purga diaria de datos sensibles 90 días post-evento (sin consentimiento expreso). */
exports.purgeSensitiveDataAfterEventRetention = onSchedule(
  {
    schedule: '0 3 * * *',
    timeZone: 'America/Mexico_City',
    memory: '512MiB',
  },
  async () => {
    try {
      const result = await runSensitiveDataRetentionPurge(db);
      logger.info('purgeSensitiveDataAfterEventRetention', result);
    } catch (e) {
      logger.error('purgeSensitiveDataAfterEventRetention failed', e);
    }
  }
);

/** SuperUsuario: backfill consentimiento «No» y purga inmediata en eventos vencidos. */
exports.adminBackfillPrivacyConsent = onCall(async (request) => {
  await requireSuperUsuarioCaller(request);
  const result = await runPrivacyConsentBackfill(db);
  return { ok: true, ...result };
});

/** SuperUsuario: backfill `visibleInPanel` en logs existentes. */
exports.adminBackfillLogVisibleInPanel = onCall(async (request) => {
  await requireSuperUsuarioCaller(request);
  const maxDocs = Math.min(50000, Math.max(100, Number(request.data?.maxDocs) || 5000));
  const result = await backfillLogVisibleInPanel(db, maxDocs);
  await CONFIG_REF().set(
    { logsVisibleInPanelBackfillAt: Date.now() },
    { merge: true }
  );
  return { ok: true, ...result };
});

/** SuperUsuario: reconcilia `logsTotalCount` con agregación real. */
exports.adminReconcileLogsTotalCount = onCall(async (request) => {
  await requireSuperUsuarioCaller(request);
  const countSnap = await db.collection('app_logs').count().get();
  const n = Number(countSnap.data().count || 0);
  await CONFIG_REF().set(
    { logsTotalCount: n, logsTotalCountUpdatedAt: Date.now() },
    { merge: true }
  );
  return { ok: true, logsTotalCount: n };
});
