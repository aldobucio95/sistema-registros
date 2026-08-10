/**
 * Purga automática de datos sensibles post-retención (LFPDPPP).
 * Mantener alineado con src/privacyNotice.js
 */

const logger = require('firebase-functions/logger');
const {
  stripSensitiveParticipantFields,
  stripAllPersonalParticipantFields,
  getEventEffectiveEndDateFromDoc,
  isEventPastSensitiveRetention,
  getArchiveProfileDocId,
  hasPrivacyNoticeAcceptance,
  resolveRetentionPurgeAction,
} = require('./privacyNoticeCore.cjs');

const DEFAULT_RETENTION_DAYS = 90;
const MAX_DOCS_PER_RUN = 400;

function todayIsoMx() {
  return new Date().toISOString().slice(0, 10);
}

async function loadPrivacyConfig(db) {
  try {
    const snap = await db.doc('app_data/config').get();
    const pn = snap.exists ? snap.data()?.privacyNotice : null;
    const days = Number(pn?.sensitiveRetentionDays);
    return {
      retentionDays: Number.isFinite(days) && days > 0 ? Math.floor(days) : DEFAULT_RETENTION_DAYS,
      dryRun: pn?.retentionDryRun === true,
    };
  } catch (e) {
    logger.warn('privacyRetention: config read failed', e);
    return { retentionDays: DEFAULT_RETENTION_DAYS, dryRun: false };
  }
}

async function maybePurgeArchivedProfile(db, person, stripFn, participantId) {
  const archId = getArchiveProfileDocId(person);
  if (!archId) return;
  try {
    const archRef = db.doc(`app_archived_profiles/${archId}`);
    const archSnap = await archRef.get();
    if (archSnap.exists) {
      const archPatch = stripFn(archSnap.data());
      // Marcas / status de participante no aplican al índice de archivo.
      delete archPatch.sensitiveDataPurgedAt;
      delete archPatch.privacyRetentionPurgedAt;
      delete archPatch.status;
      await archRef.update(archPatch);
    }
  } catch (e) {
    logger.warn('privacyRetention: archived profile update failed', { participantId, archId, error: e });
  }
}

async function purgeParticipantSensitive(db, participantId, person, dryRun) {
  const patch = stripSensitiveParticipantFields(person);
  delete patch.sensitiveDataPurgedAt;
  const update = {
    ...patch,
    sensitiveDataPurgedAt: new Date().toISOString(),
  };
  if (dryRun) return { dryRun: true, participantId, kind: 'sensitive' };
  await db.doc(`app_participants/${participantId}`).update(update);
  const activityCol = db.collection(`app_participants/${participantId}/participant_activity`);
  await activityCol.add({
    eventId: String(person.eventId || ''),
    at: Date.now(),
    actorUsername: 'Sistema',
    actorUserId: '',
    kind: 'privacidad',
    message: 'Purga automática de datos sensibles (90 días post-evento sin consentimiento expreso).',
  });
  await maybePurgeArchivedProfile(db, person, stripSensitiveParticipantFields, participantId);
  return { purged: true, participantId, kind: 'sensitive' };
}

async function purgeParticipantFullPersonal(db, participantId, person, dryRun) {
  const patch = stripAllPersonalParticipantFields(person);
  if (dryRun) return { dryRun: true, participantId, kind: 'full' };
  await db.doc(`app_participants/${participantId}`).update(patch);
  const activityCol = db.collection(`app_participants/${participantId}/participant_activity`);
  await activityCol.add({
    eventId: String(person.eventId || ''),
    at: Date.now(),
    actorUsername: 'Sistema',
    actorUserId: '',
    kind: 'privacidad',
    message: 'Purga total de datos personales (sin aceptación del aviso de privacidad; 90 días post-evento).',
  });
  await maybePurgeArchivedProfile(db, person, stripAllPersonalParticipantFields, participantId);
  return { purged: true, participantId, kind: 'full' };
}

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 */
async function runSensitiveDataRetentionPurge(db, { forceAllPast = false } = {}) {
  const { retentionDays, dryRun } = await loadPrivacyConfig(db);
  const today = todayIsoMx();
  const eventsSnap = await db.collection('app_events').get();
  const eligibleEventIds = [];
  for (const evDoc of eventsSnap.docs) {
    const ev = evDoc.data();
    const endDate = getEventEffectiveEndDateFromDoc(ev);
    if (isEventPastSensitiveRetention(endDate, retentionDays, today)) {
      eligibleEventIds.push(evDoc.id);
    }
  }
  let purgedCount = 0;
  let scannedCount = 0;
  const byEvent = {};

  for (const eventId of eligibleEventIds) {
    if (purgedCount >= MAX_DOCS_PER_RUN && !forceAllPast) break;
    let lastDoc = null;
    let hasMore = true;
    while (hasMore && (forceAllPast || purgedCount < MAX_DOCS_PER_RUN)) {
      let q = db
        .collection('app_participants')
        .where('eventId', '==', eventId)
        .orderBy('__name__')
        .limit(100);
      if (lastDoc) q = q.startAfter(lastDoc);
      const snap = await q.get();
      if (snap.empty) {
        hasMore = false;
        break;
      }
      for (const pDoc of snap.docs) {
        if (!forceAllPast && purgedCount >= MAX_DOCS_PER_RUN) break;
        scannedCount += 1;
        const data = pDoc.data();
        const decision = resolveRetentionPurgeAction(data);
        if (decision.action === 'skip') continue;

        let result;
        if (decision.action === 'full') {
          result = await purgeParticipantFullPersonal(db, pDoc.id, data, dryRun);
        } else {
          result = await purgeParticipantSensitive(db, pDoc.id, data, dryRun);
        }

        if (result.purged || result.dryRun) {
          purgedCount += 1;
          byEvent[eventId] = (byEvent[eventId] || 0) + 1;
        }
      }
      lastDoc = snap.docs[snap.docs.length - 1];
      if (snap.size < 100) hasMore = false;
    }
  }

  if (purgedCount > 0 || dryRun) {
    await db.collection('app_logs').add({
      type: 'Privacidad',
      action: dryRun ? 'retention_dry_run' : 'retention_purge',
      message: dryRun
        ? `[DRY-RUN] Se habrían purgado ${purgedCount} registro(s) en ${Object.keys(byEvent).length} evento(s).`
        : `Purga de datos sensibles: ${purgedCount} registro(s) en ${Object.keys(byEvent).length} evento(s).`,
      details: { byEvent, scannedCount, retentionDays, dryRun },
      at: Date.now(),
      createdAt: new Date().toISOString(),
    });
  }

  return { purgedCount, scannedCount, eligibleEvents: eligibleEventIds.length, byEvent, dryRun };
}

/**
 * Backfill: eventos >90 días sin consentimiento → purga; resto → sensitiveDataConsent 'No'.
 * @param {import('firebase-admin/firestore').Firestore} db
 */
async function runPrivacyConsentBackfill(db) {
  const { retentionDays } = await loadPrivacyConfig(db);
  const today = todayIsoMx();
  const eventsSnap = await db.collection('app_events').get();
  let defaulted = 0;
  let purged = 0;

  for (const evDoc of eventsSnap.docs) {
    const ev = evDoc.data();
    const endDate = getEventEffectiveEndDateFromDoc(ev);
    const pastRetention = isEventPastSensitiveRetention(endDate, retentionDays, today);
    const partsSnap = await db.collection('app_participants').where('eventId', '==', evDoc.id).get();
    for (const pDoc of partsSnap.docs) {
      const data = pDoc.data();
      if (!pastRetention) {
        if (data.sensitiveDataConsent === 'Si' || data.sensitiveDataConsent === 'No') continue;
        await pDoc.ref.update({
          sensitiveDataConsent: 'No',
          sensitiveDataConsentAt: new Date().toISOString(),
        });
        defaulted += 1;
        continue;
      }

      const decision = resolveRetentionPurgeAction(data);
      if (decision.action === 'full') {
        await purgeParticipantFullPersonal(db, pDoc.id, data, false);
        purged += 1;
      } else if (decision.action === 'sensitive') {
        await purgeParticipantSensitive(db, pDoc.id, data, false);
        purged += 1;
      } else if (data.sensitiveDataConsent !== 'Si' && data.sensitiveDataConsent !== 'No') {
        await pDoc.ref.update({
          sensitiveDataConsent: 'No',
          sensitiveDataConsentAt: new Date().toISOString(),
        });
        defaulted += 1;
      }
    }
  }

  await db.collection('app_logs').add({
    type: 'Privacidad',
    action: 'consent_backfill',
    message: `Backfill privacidad: ${defaulted} con consentimiento «No» por defecto; ${purged} purgados.`,
    details: { defaulted, purged },
    at: Date.now(),
    createdAt: new Date().toISOString(),
  });

  return { defaulted, purged };
}

module.exports = {
  runSensitiveDataRetentionPurge,
  runPrivacyConsentBackfill,
  // exported for tests / tooling
  purgeParticipantSensitive,
  purgeParticipantFullPersonal,
  hasPrivacyNoticeAcceptance,
};
