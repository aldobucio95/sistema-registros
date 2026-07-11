import { getDoc, getDocs, query, setDoc, where, writeBatch } from 'firebase/firestore';
import { db, getDocRef, getTransportVehicleDocRef, getTransportVehiclesColRef } from '../../firebaseRefs.js';
import { normalizeTransportPlanning } from '../../transportPlanningCore.js';
import { buildRegistrationV2Vehicles, v2VehicleDocsToLegacyMetaMap } from './transportLegacyAdapter.js';
import { v1PatchesToV2VehicleDocs } from './transportLegacyAdapter.js';
import { migrateEventTransportToV2, isTransportV2Plan } from './transportMigration.js';
import { TRANSPORT_MODEL_VERSION } from './transportSchema.js';
import { buildVehicleDocId, legacyVehicleKeyFromVehicleDoc } from './transportSchema.js';
import {
  coalesceVehiclePatchForPersist,
  legacyPatchToVehicleDoc,
  normalizeTransportVehicleDoc,
} from './transportVehicleModel.js';

export { isTransportV2Plan, migrateEventTransportToV2 };
export { validateRegistrationTransport } from './transportValidation.js';
export { v2VehicleDocsToLegacyMetaMap } from './transportLegacyAdapter.js';

export function isTransportV2(eventOrPlan) {
  if (eventOrPlan?.transportPlanning) return isTransportV2Plan(eventOrPlan.transportPlanning);
  return isTransportV2Plan(eventOrPlan);
}

/** Vehículos de un titular (v2). */
export async function getFamilyVehicles(eventId, ownerParticipantId) {
  const eid = String(eventId || '').trim();
  const owner = String(ownerParticipantId || '').trim();
  if (!eid || !owner) return [];

  const q = query(
    getTransportVehiclesColRef(eid),
    where('ownerParticipantId', '==', owner)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => normalizeTransportVehicleDoc({ ...d.data(), id: d.id }, d.id));
}

/** Mapa legacy para UI v1 desde v2. */
export async function fetchLegacyCarMetaForTitularV2(eventId, ownerParticipantId) {
  const owner = String(ownerParticipantId || '').trim();
  const pid = owner.startsWith('p:') ? owner.slice(2) : owner;
  const vehicles = await getFamilyVehicles(eventId, pid);
  return v2VehicleDocsToLegacyMetaMap(vehicles);
}

/** Toda la meta del evento desde subcolección v2 (sin escanear v1). */
export async function fetchAllCarMetaForEventV2(eventId) {
  const eid = String(eventId || '').trim();
  if (!eid) return {};
  const snap = await getDocs(getTransportVehiclesColRef(eid));
  const vehicles = snap.docs.map((d) => normalizeTransportVehicleDoc({ ...d.data(), id: d.id }, d.id));
  return v2VehicleDocsToLegacyMetaMap(vehicles);
}

/** Batch write vehículos (sin updateDoc de evento). */
export async function upsertTransportVehicles(eventId, vehicleDocs) {
  const eid = String(eventId || '').trim();
  const docs = (vehicleDocs || []).filter(Boolean);
  if (!eid || !docs.length) return { written: 0 };

  const batch = writeBatch(db);
  for (const raw of docs) {
    const v = normalizeTransportVehicleDoc(raw);
    if (!v.id) continue;
    const ref = getTransportVehicleDocRef(eid, v.id);
    const snap = await getDoc(ref);
    const merged = coalesceVehiclePatchForPersist(
      v,
      snap.exists() ? snap.data() : null
    );
    const doc = legacyPatchToVehicleDoc({
      eventId: eid,
      ownerParticipantId: v.ownerParticipantId,
      carIndex: v.carIndex,
      patch: merged,
      vehicleDocId: v.id,
    });
    batch.set(ref, { ...doc, eventId: eid, updatedAt: Date.now() }, { merge: true });
  }
  await batch.commit();
  return { written: docs.length };
}

/** Un vehículo — auto-guardado Transporte. */
export async function saveVehiclePatch(eventId, ownerParticipantId, carIndex, patch) {
  const eid = String(eventId || '').trim();
  const vehicleDocId = buildVehicleDocId(ownerParticipantId, carIndex);
  if (!eid || !vehicleDocId) return null;

  const ref = getTransportVehicleDocRef(eid, vehicleDocId);
  const snap = await getDoc(ref);
  const mergedPatch = coalesceVehiclePatchForPersist(patch, snap.exists() ? snap.data() : null);
  const doc = legacyPatchToVehicleDoc({
    eventId: eid,
    ownerParticipantId,
    carIndex,
    patch: mergedPatch,
    vehicleDocId,
  });
  await setDoc(ref, doc, { merge: true });
  return doc;
}

/**
 * Tras registrar participante: persiste vehículos v2 (o v1 fallback vía caller).
 * No actualiza resumen en app_events.
 */
export async function saveRegistrationTransport({
  eventId,
  hostPerson,
  companions,
  plan,
  draftMetaByVehicleKey,
  hostId,
  roster,
  useBlankSlotMeta = true,
  ensureV2 = true,
  updateDoc,
}) {
  const eid = String(eventId || '').trim();
  if (!eid || !hostId) return { saved: 0, skipped: true };

  const normalizedPlan = normalizeTransportPlanning(plan);

  if (ensureV2 && !isTransportV2Plan(normalizedPlan) && typeof updateDoc === 'function') {
    try {
      await migrateEventTransportToV2(eid, { updateDoc });
    } catch {
      /* migración best-effort */
    }
  }

  const vehicles = buildRegistrationV2Vehicles({
    eventId: eid,
    hostPerson,
    companions,
    plan: normalizedPlan,
    draftMetaByVehicleKey,
    hostId,
    roster,
    useBlankSlotMeta,
  });

  if (!vehicles.length) {
    return { saved: 0, skipped: true, reason: 'pending_only' };
  }

  const result = await upsertTransportVehicles(eid, vehicles);
  return { saved: result.written, skipped: false, vehicleIds: vehicles.map((v) => v.id) };
}

/** Escribe parches legacy (v1) en subcolección transport_vehicles (v2). */
export async function upsertCarMetaPatchesToTransportV2(eventId, patches) {
  const eid = String(eventId || '').trim();
  if (!eid || !patches?.length) return { written: 0 };

  const byOwner = new Map();
  for (const item of patches) {
    const ownerSk = String(item?.patch?.ownerSourceKey || '').trim();
    const ownerId = ownerSk.startsWith('p:') ? ownerSk.slice(2) : '';
    if (!ownerId) continue;
    if (!byOwner.has(ownerId)) byOwner.set(ownerId, []);
    byOwner.get(ownerId).push(item);
  }

  const allDocs = [];
  for (const [ownerId, list] of byOwner) {
    allDocs.push(...v1PatchesToV2VehicleDocs(eid, list, ownerId));
  }
  if (!allDocs.length) return { written: 0 };
  const result = await upsertTransportVehicles(eid, allDocs);
  return { written: result.written };
}

/** Asegura flag v2 en evento sin migrar datos. */
export async function markEventTransportV2(eventId, updateDoc) {
  if (!eventId || typeof updateDoc !== 'function') return;
  await updateDoc(getDocRef('app_events', eventId), {
    'transportPlanning.transportVersion': TRANSPORT_MODEL_VERSION,
  });
}

/** Lee evento y comprueba versión. */
export async function readEventTransportVersion(eventId) {
  const snap = await getDoc(getDocRef('app_events', eventId));
  if (!snap.exists()) return 0;
  return Number(snap.data()?.transportPlanning?.transportVersion) || 0;
}

export { legacyVehicleKeyFromVehicleDoc, buildVehicleDocId };
