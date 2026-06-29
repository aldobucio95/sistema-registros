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
  isSiValue,
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
  const vnpId = String(person.vnpPersonId || '').trim();
  if (vnpId) {
    try {
      const archRef = db.doc(`app_archived_profiles/${vnpId}`);
      const archSnap = await archRef.get();
      if (archSnap.exists) {
        const archPatch = stripSensitiveParticipantFields(archSnap.data());
        delete archPatch.sensitiveDataPurgedAt;
        await archRef.update(archPatch);
      }
    } catch (e) {
      logger.warn('privacyRetention: archived profile update failed', { participantId, vnpId, error: e });
    }
  }
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
  const vnpId = String(person.vnpPersonId || '').trim();
  if (vnpId) {
    try {
      const archRef = db.doc(`app_archived_profiles/${vnpId}`);
      const archSnap = await archRef.get();
      if (archSnap.exists) {
        const archPatch = stripAllPersonalParticipantFields(archSnap.data());
        await archRef.update(archPatch);
      }
    } catch (e) {
      logger.warn('privacyRetention: archived profile full purge failed', { participantId, vnpId, error: e });
    }
  }
  return { purged: true, participantId, kind: 'full' };
}

function hasPrivacyNoticeAcceptance(person) {
  return !!String(person?.privacyNoticeAcceptedAt || '').trim();
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
        if (data.privacyRetentionPurgedAt || data.sensitiveDataPurgedAt) continue;
        const status = String(data.status || 'active');
        if (status === 'cancelled') continue;

        let result;
        if (!hasPrivacyNoticeAcceptance(data)) {
          result = await purgeParticipantFullPersonal(db, pDoc.id, data, dryRun);
        } else if (!isSiValue(data.sensitiveDataConsent)) {
          result = await purgeParticipantSensitive(db, pDoc.id, data, dryRun);
        } else {
          continue;
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
      if (data.sensitiveDataConsent === 'Si' || data.sensitiveDataConsent === 'No') {
        if (pastRetention && data.sensitiveDataConsent !== 'Si' && !data.sensitiveDataPurgedAt) {
          await purgeParticipantSensitive(db, pDoc.id, data, false);
          purged += 1;
        }
        continue;
      }
      if (pastRetention && !data.sensitiveDataPurgedAt) {
        await purgeParticipantSensitive(db, pDoc.id, data, false);
        purged += 1;
      } else {
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
};
