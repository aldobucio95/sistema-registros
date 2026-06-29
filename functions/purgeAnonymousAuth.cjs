const { getAuth } = require('firebase-admin/auth');
const logger = require('firebase-functions/logger');

/** Cuenta creada con signInAnonymously (sin correo de staff). */
function isAnonymousAuthUserRecord(userRecord) {
  if (!userRecord) return false;
  if (userRecord.email) return false;
  const providers = userRecord.providerData || [];
  if (providers.length === 0) return true;
  return providers.every((p) => p && p.providerId === 'anonymous');
}

/**
 * UIDs de panel (app_users.authUid) que nunca deben borrarse.
 * @param {import('firebase-admin/firestore').Firestore} db
 */
async function loadProtectedStaffAuthUids(db) {
  const protectedUids = new Set();
  const snap = await db.collection('app_users').get();
  for (const doc of snap.docs) {
    const uid = String(doc.data()?.authUid || '').trim();
    if (uid) protectedUids.add(uid);
  }
  return protectedUids;
}

/**
 * Elimina usuarios anónimos en Firebase Auth (paginado).
 * @param {{ minAgeMs?: number, protectedUids?: Set<string> }} opts
 * @returns {Promise<{ scanned: number, deleted: number, skippedProtected: number, skippedYoung: number }>}
 */
async function purgeAnonymousAuthUsers(opts = {}) {
  const minAgeMs = Math.max(0, Number(opts.minAgeMs) || 0);
  const protectedUids = opts.protectedUids || new Set();
  const cutoff = Date.now() - minAgeMs;

  let scanned = 0;
  let deleted = 0;
  let skippedProtected = 0;
  let skippedYoung = 0;
  let nextPageToken;

  do {
    const page = await getAuth().listUsers(1000, nextPageToken);
    for (const user of page.users) {
      scanned += 1;
      if (protectedUids.has(user.uid)) {
        skippedProtected += 1;
        continue;
      }
      if (!isAnonymousAuthUserRecord(user)) continue;

      if (minAgeMs > 0) {
        const created = new Date(user.metadata.creationTime).getTime();
        if (!Number.isFinite(created) || created > cutoff) {
          skippedYoung += 1;
          continue;
        }
      }

      try {
        await getAuth().deleteUser(user.uid);
        deleted += 1;
      } catch (e) {
        if (e?.code === 'auth/user-not-found') {
          deleted += 1;
        } else {
          logger.warn('purgeAnonymousAuthUsers: delete failed', { uid: user.uid, code: e?.code, message: e?.message });
        }
      }
    }
    nextPageToken = page.pageToken;
  } while (nextPageToken);

  return { scanned, deleted, skippedProtected, skippedYoung };
}

/**
 * Lista cuentas anónimas en Authentication (excepto authUid de app_users).
 * @param {{ protectedUids?: Set<string> }} opts
 */
async function listAnonymousAuthUsers(opts = {}) {
  const protectedUids = opts.protectedUids || new Set();
  const users = [];
  let nextPageToken;

  do {
    const page = await getAuth().listUsers(1000, nextPageToken);
    for (const user of page.users) {
      if (protectedUids.has(user.uid)) continue;
      if (!isAnonymousAuthUserRecord(user)) continue;
      const createdMs = new Date(user.metadata.creationTime).getTime();
      users.push({
        uid: user.uid,
        createdAt: user.metadata.creationTime,
        lastSignInAt: user.metadata.lastSignInTime || null,
        ageMinutes: Number.isFinite(createdMs) ? Math.floor((Date.now() - createdMs) / 60000) : null,
      });
    }
    nextPageToken = page.pageToken;
  } while (nextPageToken);

  users.sort((a, b) => {
    const ta = new Date(a.createdAt).getTime() || 0;
    const tb = new Date(b.createdAt).getTime() || 0;
    return tb - ta;
  });

  return { count: users.length, users };
}

/**
 * Elimina una cuenta anónima por UID (no borra staff protegido).
 * @param {string} uid
 * @param {Set<string>} protectedUids
 */
async function deleteAnonymousAuthUserByUid(uid, protectedUids) {
  const id = String(uid || '').trim();
  if (!id) {
    return { ok: false, reason: 'missing_uid' };
  }
  if (protectedUids.has(id)) {
    return { ok: false, reason: 'protected' };
  }

  let record;
  try {
    record = await getAuth().getUser(id);
  } catch (e) {
    if (e?.code === 'auth/user-not-found') {
      return { ok: true, uid: id, alreadyGone: true };
    }
    throw e;
  }

  if (!isAnonymousAuthUserRecord(record)) {
    return { ok: false, reason: 'not_anonymous' };
  }

  try {
    await getAuth().deleteUser(id);
  } catch (e) {
    if (e?.code === 'auth/user-not-found') {
      return { ok: true, uid: id, alreadyGone: true };
    }
    throw e;
  }

  return { ok: true, uid: id };
}

module.exports = {
  isAnonymousAuthUserRecord,
  loadProtectedStaffAuthUids,
  purgeAnonymousAuthUsers,
  listAnonymousAuthUsers,
  deleteAnonymousAuthUserByUid,
};
