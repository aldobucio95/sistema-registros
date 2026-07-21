import { getDocs, updateDoc, writeBatch } from 'firebase/firestore';
import {
  db,
  getDocRef,
  getTransportCarMetaColRef,
  getTransportVehicleDocRef,
  getTransportVehiclesColRef,
} from '../../firebaseRefs.js';
import { docIdToVehicleKey } from '../../transportCarMetaStore.js';
import { normalizeTransportPlanning } from '../../transportPlanningCore.js';
import { normalizeTransportVehicleDoc } from '../v2/transportVehicleModel.js';
import { v1CarMetaSubdocToV2Vehicle } from '../v2/transportLegacyAdapter.js';
import { migrateEventTransportToV2, isTransportV2Plan } from '../v2/transportMigration.js';
import {
  buildCarUnitSummaryEntry,
  carAssignFromUnitDocs,
  normalizeCarUnitDoc,
  normalizeCarUnitPlanEntry,
} from './transportCarUnitModel.js';
import { isCarUnitId, makeCarUnitId, TRANSPORT_MODEL_VERSION_V3, isTransportV3Plan } from './transportSchema.js';

function isManualCarPlanGroup(g) {
  return String(g?.id || '').trim().startsWith('cg-');
}

function labelFromLegacy(vehicle, index) {
  const brand = String(vehicle?.brand || '').trim();
  const model = String(vehicle?.model || '').trim();
  if (brand || model) return [brand, model].filter(Boolean).join(' ');
  const plates = String(vehicle?.plates || '').trim();
  if (plates) return plates;
  return `Carro ${index + 1}`;
}

function v2DocToCarUnit(eventId, v2Doc, index) {
  const legacy = normalizeTransportVehicleDoc(v2Doc, v2Doc?.id);
  const unitId = isCarUnitId(legacy.id) ? legacy.id : makeCarUnitId();
  return normalizeCarUnitDoc({
    id: unitId,
    eventId,
    label: labelFromLegacy(legacy, index),
    capacity: 5,
    brand: legacy.brand,
    model: legacy.model,
    color: legacy.color,
    plates: legacy.plates,
    maybeAbsent: legacy.maybeAbsent,
    pendingBrand: legacy.pendingBrand,
    pendingModel: legacy.pendingModel,
    pendingColor: legacy.pendingColor,
    pendingPlates: legacy.pendingPlates,
    pendingDriver: legacy.pendingDriver,
    pendingPassengers: legacy.pendingPassengers,
    driverSourceKey: legacy.driverSourceKey,
    passengerSourceKeys: legacy.passengerSourceKeys,
    migratedFromVehicleId: String(legacy.id || '').trim(),
    legacyOwnerParticipantId: String(legacy.ownerParticipantId || '').trim(),
  });
}

/**
 * Migra plan + docs a unidades v3.
 * - Copia vehículos v2 (o v1 vía v2) a ids `cu-*`
 * - Construye carUnits + carAssign + carUnitSummaryById
 * - Grupos manuales cg-* sin docs → una unidad vacía por grupo
 */
export async function migrateEventTransportToV3(eventId, { updateDoc: updateDocFn = updateDoc, plan: planRaw } = {}) {
  const eid = String(eventId || '').trim();
  if (!eid) return { migrated: false, count: 0, reason: 'missing_event' };

  let plan = normalizeTransportPlanning(planRaw);

  if (!isTransportV2Plan(plan)) {
    try {
      await migrateEventTransportToV2(eid, { updateDoc: updateDocFn });
    } catch {
      /* best-effort */
    }
  }

  const v2Snap = await getDocs(getTransportVehiclesColRef(eid));
  let v2Docs = v2Snap.docs.map((d) => ({ ...d.data(), id: d.id }));

  if (!v2Docs.length) {
    const v1Snap = await getDocs(getTransportCarMetaColRef(eid));
    v2Docs = v1Snap.docs.map((d) => {
      const vehicle = v1CarMetaSubdocToV2Vehicle(eid, d.id, d.data());
      return normalizeTransportVehicleDoc(vehicle, vehicle.id || d.id);
    });
  }

  const unitDocs = [];
  const seenLegacy = new Set();
  let idx = 0;
  for (const raw of v2Docs) {
    if (isCarUnitId(raw?.id) && !raw?.migratedFromVehicleId && !String(raw?.id || '').includes('__c')) {
      // Ya es unidad v3
      unitDocs.push(normalizeCarUnitDoc(raw, raw.id));
      continue;
    }
    const legacyId = String(raw?.id || '').trim();
    if (legacyId && seenLegacy.has(legacyId)) continue;
    if (legacyId) seenLegacy.add(legacyId);
    unitDocs.push(v2DocToCarUnit(eid, raw, idx));
    idx += 1;
  }

  // Grupos manuales sin vehículo migrado
  const coveredKeys = new Set();
  for (const d of unitDocs) {
    if (d.driverSourceKey) coveredKeys.add(d.driverSourceKey);
    for (const sk of d.passengerSourceKeys || []) coveredKeys.add(sk);
  }

  const groups = Array.isArray(plan.carGroups) ? plan.carGroups : [];
  for (const g of groups) {
    if (!isManualCarPlanGroup(g)) continue;
    const memberKeys = (g.memberKeys || []).map((k) => String(k || '').trim()).filter(Boolean);
    if (memberKeys.length < 2) continue;
    const already = memberKeys.some((sk) => coveredKeys.has(sk));
    if (already) continue;
    const unitId = makeCarUnitId();
    const capacity = Math.max(1, parseInt(plan.bautizosCarCapacity, 10) || 5);
    const driverSourceKey = memberKeys.find((k) => k.startsWith('p:')) || memberKeys[0] || '';
    const passengerSourceKeys = memberKeys.filter((k) => k && k !== driverSourceKey);
    const doc = normalizeCarUnitDoc({
      id: unitId,
      eventId: eid,
      label: `Grupo ${String(g.id || '').slice(0, 8)}`,
      capacity,
      driverSourceKey,
      passengerSourceKeys,
    });
    unitDocs.push(doc);
    for (const sk of memberKeys) coveredKeys.add(sk);
  }

  const carUnits = unitDocs.map((d, i) =>
    normalizeCarUnitPlanEntry(
      {
        id: d.id,
        label: d.label || `Carro ${i + 1}`,
        capacity: d.capacity || Math.max(1, parseInt(plan.bautizosCarCapacity, 10) || 5),
        locationKey: d.locationKey || '',
      },
      i
    )
  );

  const carAssign = carAssignFromUnitDocs(unitDocs);
  const carUnitSummaryById = {};
  for (const d of unitDocs) {
    carUnitSummaryById[d.id] = buildCarUnitSummaryEntry(d);
  }

  // Escribir docs con nuevos ids (batch); no borrar legacy en la misma pasada
  if (unitDocs.length) {
    const batch = writeBatch(db);
    for (const d of unitDocs) {
      batch.set(getTransportVehicleDocRef(eid, d.id), { ...d, eventId: eid, updatedAt: Date.now() }, { merge: true });
    }
    await batch.commit();
  }

  await updateDocFn(getDocRef('app_events', eid), {
    'transportPlanning.transportVersion': TRANSPORT_MODEL_VERSION_V3,
    'transportPlanning.carUnits': carUnits,
    'transportPlanning.carAssign': carAssign,
    'transportPlanning.carUnitSummaryById': carUnitSummaryById,
  });

  return {
    migrated: true,
    count: unitDocs.length,
    reason: 'migrated_to_v3',
    carUnits,
    carAssign,
    carUnitSummaryById,
  };
}

export { isTransportV3Plan };

/** Diagnóstico: keys v1. */
export function listLegacyKeysFromV1Snapshot(docs) {
  return (docs || []).map((d) => docIdToVehicleKey(d.id));
}
