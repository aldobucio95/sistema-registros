/**
 * `activeRosterUnitsTotal` en `app_events` (Cloud Function al cambiar participantes).
 *
 * Campa / tipos simples: delta incremental (`FieldValue.increment`).
 * Bautizos (y cualquier recálculo completo): await del recuento en la misma invocación.
 *
 * No usar setTimeout/debounce aquí: en Cloud Functions Gen 2 la CPU se recorta al
 * terminar el handler, así que un recálculo programado a 800 ms a menudo nunca corre
 * y el hub queda en 0 o en un total viejo.
 *
 * Recálculos concurrentes (p. ej. grupo Bautizos partido) usan `activeRosterUnitsComputedAt`
 * para que una invocación más vieja no pise un total más reciente.
 */

const admin = require('firebase-admin');
const {
  computeDashboardTodosRosterTotal,
  computeRowTodosUnitContribution,
} = require('./lib/dashboardTodosRosterTotal.cjs');

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
 * @param {number} [computedAtMs]
 */
async function recomputeEventActiveRosterTotal(db, eventId, computedAtMs) {
  const eid = String(eventId || '').trim();
  if (!eid) return;
  const evRef = db.collection('app_events').doc(eid);
  const evSnap = await evRef.get();
  if (!evSnap.exists) return;
  const eventData = { id: eid, ...evSnap.data() };
  const partsSnap = await db.collection('app_participants').where('eventId', '==', eid).get();
  const rows = partsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const total = Math.max(0, Math.floor(Number(computeDashboardTodosTotalForEvent(rows, eventData)) || 0));
  const computedAt = Number(computedAtMs);
  const stamp = Number.isFinite(computedAt) && computedAt > 0 ? computedAt : Date.now();

  await db.runTransaction(async (tx) => {
    const fresh = await tx.get(evRef);
    if (!fresh.exists) return;
    const prevAt = Number(fresh.data()?.activeRosterUnitsComputedAt) || 0;
    if (stamp < prevAt) return;
    tx.update(evRef, {
      activeRosterUnitsTotal: total,
      activeRosterUnitsComputedAt: stamp,
    });
  });
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
  const computedAtMs = Date.now();

  if (evType === 'Bautizos') {
    await recomputeEventActiveRosterTotal(db, eid, computedAtMs);
    return;
  }

  const beforeRow = before && typeof before === 'object' ? { ...before } : null;
  const afterRow = after && typeof after === 'object' ? { ...after } : null;

  const beforeContrib = beforeRow ? computeRowTodosUnitContribution(beforeRow, eventData) : 0;
  const afterContrib = afterRow ? computeRowTodosUnitContribution(afterRow, eventData) : 0;

  if (beforeContrib === null || afterContrib === null) {
    await recomputeEventActiveRosterTotal(db, eid, computedAtMs);
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
