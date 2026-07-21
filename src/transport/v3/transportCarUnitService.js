import { deleteDoc, getDoc, getDocs, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db, getDocRef, getTransportVehicleDocRef, getTransportVehiclesColRef } from '../../firebaseRefs.js';
import {
  buildCarUnitSummaryEntry,
  carAssignFromUnitDocs,
  normalizeCarUnitDoc,
  patchCarUnitDoc,
} from './transportCarUnitModel.js';
import { TRANSPORT_MODEL_VERSION_V3 } from './transportSchema.js';

/** Lectura bajo demanda — sin listener (solo al expandir unidad). */
export async function fetchCarUnitDoc(eventId, unitId) {
  const eid = String(eventId || '').trim();
  const uid = String(unitId || '').trim();
  if (!eid || !uid) return null;
  const snap = await getDoc(getTransportVehicleDocRef(eid, uid));
  if (!snap.exists()) return null;
  return normalizeCarUnitDoc({ ...snap.data(), id: snap.id }, snap.id);
}

export async function fetchAllCarUnitDocs(eventId) {
  const eid = String(eventId || '').trim();
  if (!eid) return [];
  const snap = await getDocs(getTransportVehiclesColRef(eid));
  return snap.docs.map((d) => normalizeCarUnitDoc({ ...d.data(), id: d.id }, d.id));
}

/** Patch de un carro. El resumen en el evento es opcional (por defecto sí). */
export async function saveCarUnitPatch(eventId, unitId, patch, { driverLabel = '', updateEventSummary = true } = {}) {
  const eid = String(eventId || '').trim();
  const uid = String(unitId || '').trim();
  if (!eid || !uid) return null;

  const existing = await fetchCarUnitDoc(eid, uid);
  const next = patchCarUnitDoc(existing || { id: uid, eventId: eid }, { ...patch, id: uid, eventId: eid });
  await setDoc(getTransportVehicleDocRef(eid, uid), next, { merge: true });

  if (updateEventSummary) {
    const summary = buildCarUnitSummaryEntry(next, { driverLabel });
    // Solo el campo de resumen — no reescribe todo transportPlanning (evita churn con autosave de estructura).
    await updateDoc(getDocRef('app_events', eid), {
      [`transportPlanning.carUnitSummaryById.${uid}`]: summary,
    });
  }
  return next;
}

export async function upsertCarUnitDocs(eventId, docs) {
  const eid = String(eventId || '').trim();
  const list = (docs || []).filter(Boolean);
  if (!eid || !list.length) return { written: 0 };

  const batch = writeBatch(db);
  for (const raw of list) {
    const v = normalizeCarUnitDoc(raw);
    if (!v.id) continue;
    batch.set(getTransportVehicleDocRef(eid, v.id), { ...v, eventId: eid, updatedAt: Date.now() }, { merge: true });
  }
  await batch.commit();
  return { written: list.length };
}

export async function deleteCarUnitDoc(eventId, unitId) {
  const eid = String(eventId || '').trim();
  const uid = String(unitId || '').trim();
  if (!eid || !uid) return;
  await deleteDoc(getTransportVehicleDocRef(eid, uid));
}

/** Actualiza solo el mapa de resumen en el evento. */
export async function persistCarUnitSummaries(eventId, summaryById) {
  const eid = String(eventId || '').trim();
  if (!eid) return;
  await updateDoc(getDocRef('app_events', eid), {
    'transportPlanning.carUnitSummaryById': summaryById && typeof summaryById === 'object' ? summaryById : {},
  });
}

export async function markEventTransportV3(eventId) {
  const eid = String(eventId || '').trim();
  if (!eid) return;
  await updateDoc(getDocRef('app_events', eid), {
    'transportPlanning.transportVersion': TRANSPORT_MODEL_VERSION_V3,
  });
}

/**
 * Aplica crew a un doc y recalcula carAssign parcial (caller fusiona en plan).
 */
export function applyCrewToCarUnitDoc(doc, { driverSourceKey, passengerSourceKeys }) {
  const next = patchCarUnitDoc(doc, {
    driverSourceKey: String(driverSourceKey || '').trim(),
    passengerSourceKeys: Array.isArray(passengerSourceKeys) ? passengerSourceKeys : [],
  });
  // Conductor no debe estar también en pasajeros
  next.passengerSourceKeys = next.passengerSourceKeys.filter((sk) => sk && sk !== next.driverSourceKey);
  return next;
}

export { carAssignFromUnitDocs, buildCarUnitSummaryEntry, normalizeCarUnitDoc };
