/**
 * Invalida cachés del panel (`app_cache_versions`) tras escrituras en Firestore.
 * Garantiza que otros usuarios (y otras pestañas) recarguen participantes/archivo
 * aunque el cambio no pase por el bump del cliente.
 */
const admin = require('firebase-admin');
const CACHE_VERSION_MAX = 999999;
const PARTICIPANT_STATUS_ARCHIVED = 'archived';

/** Coalesce bumps de `logs_head` en la función (ráfagas de `addLog`). */
const LOGS_BUMP_DEBOUNCE_MS = 1500;
let logsHeadBumpTimer = null;
let logsHeadBumpPending = false;
let logsCountDeltaPending = 0;

/** Coalesce bumps por sede/archivo (ráfagas de backfill WA, etc.). */
const PARTICIPANT_BUMP_DEBOUNCE_MS = 1500;
/** @type {Map<string, NodeJS.Timeout>} */
const participantBumpTimers = new Map();
/** @type {Map<string, { db: import('firebase-admin/firestore').Firestore, meta: object }>} */
const participantBumpPending = new Map();

/** Campos que no alteran el roster cacheado en el panel (no invalidar por ellos solos). */
const CACHE_NO_INVALIDATE_KEYS = new Set(['whatsAppFinanceNotifications', 'whatsAppMessageHistory']);

function nextCircularVersion(current) {
  const n = Math.floor(Number(current) || 0);
  if (n < 1) return 1;
  if (n >= CACHE_VERSION_MAX) return 1;
  return n + 1;
}

function sanitizeScopePart(input, maxChars, fallback) {
  let s = String(input ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u00f1/gi, 'n')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (!s) s = fallback;
  if (maxChars > 0 && s.length > maxChars) s = s.slice(0, maxChars);
  return s;
}

function scopeParticipantsLocation(eventId, location) {
  const e = sanitizeScopePart(eventId, 240, 'event');
  const loc = sanitizeScopePart(location, 120, 'sin-sede');
  return `pe_${e}_${loc}`;
}

function scopeParticipantsArchive() {
  return 'pe_archive_global';
}

function scopeLogsHead() {
  return 'logs_head';
}

function stripCacheIrrelevantFields(row) {
  if (!row || typeof row !== 'object') return row;
  const out = { ...row };
  for (const k of CACHE_NO_INVALIDATE_KEYS) delete out[k];
  return out;
}

/**
 * ¿El write cambia datos de roster? Crear/borrar siempre; updates solo si cambia algo fuera de WA/cosmética.
 */
function participantWriteAffectsRosterCache(before, after) {
  if (!before || !after) return true;
  const a = stripCacheIrrelevantFields(before);
  const b = stripCacheIrrelevantFields(after);
  return JSON.stringify(a) !== JSON.stringify(b);
}

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 */
async function bumpCacheVersionDoc(db, scope, meta = {}) {
  const ref = db.collection('app_cache_versions').doc(scope);
  const action = meta.action != null ? String(meta.action).slice(0, 240) : '';
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const cur = snap.exists ? Math.floor(Number(snap.data()?.v) || 0) : 0;
    const nv = nextCircularVersion(cur);
    tx.set(
      ref,
      {
        v: nv,
        updatedAt: Date.now(),
        ...(action ? { lastAction: action } : {}),
        ...(meta.source ? { lastSource: String(meta.source) } : {}),
        ...(meta.eventId ? { eventId: String(meta.eventId) } : {}),
        ...(meta.location ? { location: String(meta.location) } : {}),
      },
      { merge: true }
    );
  });
}

function scheduleParticipantCacheBump(db, scope, meta = {}) {
  participantBumpPending.set(scope, { db, meta });
  const prev = participantBumpTimers.get(scope);
  if (prev) clearTimeout(prev);
  participantBumpTimers.set(
    scope,
    setTimeout(() => {
      participantBumpTimers.delete(scope);
      const pending = participantBumpPending.get(scope);
      participantBumpPending.delete(scope);
      if (!pending) return;
      bumpCacheVersionDoc(pending.db, scope, pending.meta).catch((e) => {
        console.error('scheduleParticipantCacheBump', scope, e);
      });
    }, PARTICIPANT_BUMP_DEBOUNCE_MS)
  );
}

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {object|null|undefined} before
 * @param {object|null|undefined} after
 */
async function bumpParticipantCacheVersionsFromWrite(db, before, after) {
  if (!participantWriteAffectsRosterCache(before, after)) return;

  const locationScopes = new Set();
  let bumpArchive = false;

  for (const row of [before, after]) {
    if (!row || typeof row !== 'object') continue;
    const eid = String(row.eventId || '').trim();
    const loc = String(row.location || '').trim();
    const cancelledLoc = String(row.cancelledFromLocation || '').trim();
    const archivedFrom = String(row.archivedFromLocation || '').trim();
    if (eid && loc) locationScopes.add(scopeParticipantsLocation(eid, loc));
    if (eid && cancelledLoc && cancelledLoc !== loc) {
      locationScopes.add(scopeParticipantsLocation(eid, cancelledLoc));
    }
    if (eid && archivedFrom && archivedFrom !== loc && archivedFrom !== cancelledLoc) {
      locationScopes.add(scopeParticipantsLocation(eid, archivedFrom));
    }
    if (String(row.status || '').trim() === PARTICIPANT_STATUS_ARCHIVED) bumpArchive = true;
  }

  for (const scope of locationScopes) {
    scheduleParticipantCacheBump(db, scope, { action: 'participant-write', source: 'cloud' });
  }
  if (bumpArchive) {
    scheduleParticipantCacheBump(db, scopeParticipantsArchive(), {
      action: 'participant-archived',
      source: 'cloud',
    });
  }
}

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 */
async function bumpLogsHeadCache(db, action = '') {
  return bumpCacheVersionDoc(db, scopeLogsHead(), { action: action || 'log-write', source: 'cloud' });
}

/**
 * Agrupa bumps de contador + cabecera de logs para reducir escrituras en ráfaga.
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {{ countDelta?: number, action?: string }} [opts]
 */
function scheduleLogsCacheBumps(db, opts = {}) {
  const countDelta = Math.floor(Number(opts.countDelta) || 0);
  if (countDelta) logsCountDeltaPending += countDelta;
  logsHeadBumpPending = true;
  if (logsHeadBumpTimer) clearTimeout(logsHeadBumpTimer);
  logsHeadBumpTimer = setTimeout(() => {
    logsHeadBumpTimer = null;
    const delta = logsCountDeltaPending;
    logsCountDeltaPending = 0;
    const bumpHead = logsHeadBumpPending;
    logsHeadBumpPending = false;
    const action = opts.action || 'log-write-batch';
    (async () => {
      if (delta) {
        try {
          await db.collection('app_data').doc('config').set(
            {
              logsTotalCount: admin.firestore.FieldValue.increment(delta),
              logsTotalCountUpdatedAt: Date.now(),
            },
            { merge: true }
          );
        } catch (e) {
          console.error('scheduleLogsCacheBumps count', e);
        }
      }
      if (bumpHead) {
        try {
          await bumpLogsHeadCache(db, action);
        } catch (e) {
          console.error('scheduleLogsCacheBumps head', e);
        }
      }
    })();
  }, LOGS_BUMP_DEBOUNCE_MS);
}

module.exports = {
  bumpParticipantCacheVersionsFromWrite,
  bumpLogsHeadCache,
  scheduleLogsCacheBumps,
  scopeParticipantsLocation,
  scopeParticipantsArchive,
  scopeLogsHead,
  participantWriteAffectsRosterCache,
  stripCacheIrrelevantFields,
  CACHE_NO_INVALIDATE_KEYS,
};
