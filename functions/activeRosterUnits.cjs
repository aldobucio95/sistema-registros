/**
 * `activeRosterUnitsTotal` en `app_events` (Cloud Function al cambiar participantes).
 *
 * Campa / tipos simples: delta incremental (`FieldValue.increment`).
 * Bautizos (y lotes rápidos): recálculo completo con debounce por evento.
 */

const admin = require('firebase-admin');
const {
  computeDashboardTodosRosterTotal,
  computeRowTodosUnitContribution,
} = require('./lib/dashboardTodosRosterTotal.cjs');

const FULL_RECOMPUTE_DEBOUNCE_MS = 800;
/** @type {Map<string, ReturnType<typeof setTimeout>>} */
const pendingFullRecompute = new Map();

/**
 * @param {object[]} participantRows — { id, ...data } por participante
 * @param {object} eventRow — doc app_events + id
 */
function computeDashboardTodosTotalForEvent(participantRows, eventRow) {
  return computeDashboardTodosRosterTotal(participantRows, eventRow);
}

/**
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} eventId
 */
async function recomputeEventActiveRosterTotal(db, eventId) {
  const eid = String(eventId || '').trim();
  if (!eid) return;
  const evRef = db.collection('app_events').doc(eid);
  const evSnap = await evRef.get();
  if (!evSnap.exists) return;
  const eventData = { id: eid, ...evSnap.data() };
  const partsSnap = await db.collection('app_participants').where('eventId', '==', eid).get();
  const rows = partsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const total = computeDashboardTodosTotalForEvent(rows, eventData);
  await evRef.update({ activeRosterUnitsTotal: Math.max(0, Math.floor(Number(total) || 0)) });
}

/**
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} eventId
 */
function scheduleFullRecomputeEventActiveRosterTotal(db, eventId) {
  const eid = String(eventId || '').trim();
  if (!eid) return;
  const prev = pendingFullRecompute.get(eid);
  if (prev) clearTimeout(prev);
  pendingFullRecompute.set(
    eid,
    setTimeout(() => {
      pendingFullRecompute.delete(eid);
      recomputeEventActiveRosterTotal(db, eid).catch((e) => {
        console.error('scheduleFullRecomputeEventActiveRosterTotal', eid, e);
      });
    }, FULL_RECOMPUTE_DEBOUNCE_MS)
  );
}

/**
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} eventId
 * @param {object|null|undefined} before
 * @param {object|null|undefined} after
 */
async function updateEventActiveRosterTotalFromWrite(db, eventId, before, after) {
  const eid = String(eventId || '').trim();
  if (!eid) return;

  const evRef = db.collection('app_events').doc(eid);
  const evSnap = await evRef.get();
  if (!evSnap.exists) return;
  const eventData = { id: eid, ...evSnap.data() };
  const evType = String(eventData.eventType || '');

  if (evType === 'Bautizos') {
    scheduleFullRecomputeEventActiveRosterTotal(db, eid);
    return;
  }

  const beforeRow = before && typeof before === 'object' ? { ...before } : null;
  const afterRow = after && typeof after === 'object' ? { ...after } : null;

  const beforeContrib = beforeRow ? computeRowTodosUnitContribution(beforeRow, eventData) : 0;
  const afterContrib = afterRow ? computeRowTodosUnitContribution(afterRow, eventData) : 0;

  if (beforeContrib === null || afterContrib === null) {
    scheduleFullRecomputeEventActiveRosterTotal(db, eid);
    return;
  }

  const delta = afterContrib - beforeContrib;
  if (delta === 0) return;

  await evRef.set(
    { activeRosterUnitsTotal: admin.firestore.FieldValue.increment(delta) },
    { merge: true }
  );
}

module.exports = {
  computeDashboardTodosTotalForEvent,
  recomputeEventActiveRosterTotal,
  updateEventActiveRosterTotalFromWrite,
};
