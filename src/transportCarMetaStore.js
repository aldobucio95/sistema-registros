/**
 * Almacenamiento de metadatos de carro en subcolección Firestore.
 * Reduce lecturas: el doc `app_events` ya no incluye `carMetaBySource` completo.
 *
 * Ruta: app_events/{eventId}/transport_car_meta/{vehicleDocId}
 */
import { getDocs, getDoc, query, where, writeBatch } from 'firebase/firestore';
import { db, getTransportCarMetaColRef, getTransportCarMetaDocRef } from './firebaseRefs.js';
import {
  applyCarMetaPassengerInheritance,
  buildCarCrewMembersFromMeta,
  buildCrewOptsByTitularFromPlan,
  buildCarMetaCrewOptsForTitular,
  buildRosterSourceKeyLabelIndex,
  mergeCarMetaPatchesIntoPlan,
  normalizeCarMetaWithCrewDedupe,
  normalizeCarVehicleMeta,
  vehicleMetaFieldsAndDriverComplete,
} from './bautizosCarMeta.js';
import {
  carVehicleMetaStorageKey,
  normalizeTransportPlanning,
} from './transportPlanningCore.js';

export const TRANSPORT_CAR_META_STORAGE_VERSION = 1;

/** Codifica `p:id|c1` como id de documento Firestore. */
export function vehicleKeyToDocId(vehicleKey) {
  return String(vehicleKey || '')
    .trim()
    .replace(/\|/g, '__PIPE__')
    .replace(/:/g, '__COLON__');
}

export function docIdToVehicleKey(docId) {
  return String(docId || '')
    .trim()
    .replace(/__PIPE__/g, '|')
    .replace(/__COLON__/g, ':');
}

function parseVehicleMetaKey(vehicleKey) {
  const s = String(vehicleKey || '').trim();
  if (!s) return null;
  const pipeIdx = s.lastIndexOf('|c');
  if (pipeIdx > 0) {
    const suffix = s.slice(pipeIdx + 2);
    const carIndex = parseInt(suffix, 10);
    if (Number.isFinite(carIndex) && carIndex >= 1 && String(carIndex) === suffix) {
      return { ownerSourceKey: s.slice(0, pipeIdx), carIndex };
    }
  }
  return { ownerSourceKey: s, carIndex: 1 };
}

/** Plan para persistir en `app_events` (sin mapa inline de car meta). */
export function transportPlanningForEventDoc(plan) {
  const normalized = normalizeTransportPlanning(plan);
  return {
    ...normalized,
    carMetaBySource: {},
    transportCarMetaStorageVersion: TRANSPORT_CAR_META_STORAGE_VERSION,
    bautizosCarMetaSummaryByTitular: normalized.bautizosCarMetaSummaryByTitular || {},
  };
}

/** Plan en memoria al cargar evento ya migrado (sin inline legacy). */
export function transportPlanningFromEventDoc(raw) {
  const normalized = normalizeTransportPlanning(raw);
  if (Number(normalized.transportCarMetaStorageVersion) >= TRANSPORT_CAR_META_STORAGE_VERSION) {
    return { ...normalized, carMetaBySource: {} };
  }
  return normalized;
}

export function mergeCarMetaCacheIntoPlan(plan, carMetaCacheByKey) {
  const cache = carMetaCacheByKey && typeof carMetaCacheByKey === 'object' ? carMetaCacheByKey : {};
  if (!Object.keys(cache).length) return normalizeTransportPlanning(plan);
  return normalizeTransportPlanning({
    ...plan,
    carMetaBySource: { ...(plan?.carMetaBySource || {}), ...cache },
  });
}

export function buildCarMetaSummaryCarEntry(meta, roster, crewOpts = {}) {
  const m = normalizeCarVehicleMeta(meta);
  const parsed = parseVehicleMetaKey(meta?.vehicleKey || '');
  const ownerSk = String(m.ownerSourceKey || parsed?.ownerSourceKey || '').trim();
  const labelIndex = buildRosterSourceKeyLabelIndex(roster);
  const hostPerson = (roster || []).find((p) => `p:${String(p?.id || '').trim()}` === ownerSk);
  const crew = buildCarCrewMembersFromMeta(m, hostPerson, [], labelIndex, roster);
  const requiresPassengers = crewOpts.requiresPassengers !== false;
  const vehicleFieldsComplete = vehicleMetaFieldsAndDriverComplete(m);
  const hasPassengers = Array.isArray(m.passengerSourceKeys) && m.passengerSourceKeys.length > 0;
  const vehiclePending =
    !m.maybeAbsent &&
    (!vehicleFieldsComplete || (requiresPassengers && !hasPassengers));
  return {
    carIndex: parsed?.carIndex || 1,
    maybeAbsent: m.maybeAbsent === true,
    vehicleFieldsComplete,
    hasPassengers,
    vehiclePending,
    crewPreview: crew.map((c) => ({ name: c.name || '—', crewRole: c.crewRole })),
  };
}

/** Resumen por titular para vista colapsada (sin leer subcolección). */
export function buildTitularCarMetaSummaryEntry(titularSk, metaByVehicleKey, roster, crewOpts = {}) {
  const owner = String(titularSk || '').trim();
  const cars = [];
  for (const [vehicleKey, rawMeta] of Object.entries(metaByVehicleKey || {})) {
    const parsed = parseVehicleMetaKey(vehicleKey);
    if (String(parsed?.ownerSourceKey || '').trim() !== owner) continue;
    cars.push(
      buildCarMetaSummaryCarEntry({ ...rawMeta, vehicleKey }, roster, crewOpts)
    );
  }
  cars.sort((a, b) => a.carIndex - b.carIndex);
  const requiresPassengers = crewOpts.requiresPassengers !== false;
  const needsAttention = cars.some((c) => carSummaryEntryNeedsAttention(c, requiresPassengers));
  return { needsAttention, requiresPassengers, cars };
}

function carSummaryEntryNeedsAttention(car, requiresPassengers) {
  if (car?.maybeAbsent) return false;
  if (typeof car.vehicleFieldsComplete === 'boolean') {
    if (!car.vehicleFieldsComplete) return true;
    if (requiresPassengers && !car.hasPassengers) return true;
    return false;
  }
  if (!car.vehiclePending) return false;
  if (requiresPassengers === false) {
    const preview = car.crewPreview || [];
    const hasDriver = preview.some((m) => m.crewRole === 'driver');
    if (!hasDriver) return true;
    return false;
  }
  return true;
}

export function titularSummaryNeedsAttention(summaryEntry, crewOpts = {}) {
  if (!summaryEntry) return false;
  const requiresPassengers =
    typeof crewOpts.requiresPassengers === 'boolean'
      ? crewOpts.requiresPassengers
      : summaryEntry.requiresPassengers !== false;
  const cars = summaryEntry.cars || [];
  if (cars.length) {
    return cars.some((car) => carSummaryEntryNeedsAttention(car, requiresPassengers));
  }
  return summaryEntry.needsAttention === true;
}

export function buildCarMetaSummaryByTitularFromPlan(plan, roster, crewOptsByTitular = null) {
  const normalized = normalizeTransportPlanning(plan);
  const resolvedCrewOpts =
    crewOptsByTitular && typeof crewOptsByTitular === 'object'
      ? crewOptsByTitular
      : buildCrewOptsByTitularFromPlan(normalized, roster);
  const byOwner = {};
  for (const [vehicleKey, rawMeta] of Object.entries(normalized.carMetaBySource || {})) {
    const parsed = parseVehicleMetaKey(vehicleKey);
    const owner = String(parsed?.ownerSourceKey || '').trim();
    if (!owner) continue;
    if (!byOwner[owner]) byOwner[owner] = {};
    byOwner[owner][vehicleKey] = rawMeta;
  }
  const summary = {};
  for (const [ownerSk, metaMap] of Object.entries(byOwner)) {
    const crewOpts = resolvedCrewOpts[ownerSk] || buildCarMetaCrewOptsForTitular(ownerSk, normalized, roster);
    summary[ownerSk] = buildTitularCarMetaSummaryEntry(ownerSk, metaMap, roster, crewOpts);
  }
  return summary;
}

/** Plazas para UI colapsada desde resumen (sin meta completa). */
export function slotsFromTitularCarMetaSummary(summaryEntry) {
  const cars = summaryEntry?.cars || [];
  return cars.map((car) => ({
    carIndex: car.carIndex,
    members: (car.crewPreview || []).map((p, idx) => ({
      sourceKey: `summary-${car.carIndex}-${idx}`,
      name: p.name,
      kind: p.crewRole === 'driver' ? 'participant' : 'companion',
      crewRole: p.crewRole,
    })),
  }));
}

/**
 * Lectura bajo demanda (getDocs + where) — no listener en tiempo real.
 * Razón: datos de carro solo se necesitan al expandir tarjeta/formulario.
 */
export async function fetchCarMetaForTitular(eventId, titularSk) {
  const eid = String(eventId || '').trim();
  const owner = String(titularSk || '').trim();
  if (!eid || !owner) return {};

  const col = getTransportCarMetaColRef(eid);
  const q = query(col, where('ownerSourceKey', '==', owner));
  const snap = await getDocs(q);
  const out = {};
  for (const d of snap.docs) {
    const vehicleKey = docIdToVehicleKey(d.id);
    out[vehicleKey] = normalizeCarVehicleMeta(d.data());
  }
  return out;
}

export async function fetchCarMetaForVehicleKeys(eventId, vehicleKeys) {
  const eid = String(eventId || '').trim();
  const keys = (Array.isArray(vehicleKeys) ? vehicleKeys : [])
    .map((k) => String(k || '').trim())
    .filter(Boolean);
  if (!eid || !keys.length) return {};

  const out = {};
  await Promise.all(
    keys.map(async (vehicleKey) => {
      const docId = vehicleKeyToDocId(vehicleKey);
      const ref = getTransportCarMetaDocRef(eid, docId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        out[vehicleKey] = normalizeCarVehicleMeta(snap.data());
      }
    })
  );
  return out;
}

function carMetaDocPayload(vehicleKey, meta) {
  const m = normalizeCarVehicleMeta(meta);
  const parsed = parseVehicleMetaKey(vehicleKey);
  return {
    ...m,
    vehicleKey: String(vehicleKey || '').trim(),
    ownerSourceKey: String(m.ownerSourceKey || parsed?.ownerSourceKey || '').trim(),
    carIndex: parsed?.carIndex || 1,
    updatedAt: Date.now(),
  };
}

/** Escribe parches en subcolección (batch). */
export async function upsertCarMetaDocs(eventId, patches, roster = null) {
  const eid = String(eventId || '').trim();
  if (!eid || !patches?.length) return;

  const batch = writeBatch(db);
  for (const item of patches) {
    const vehicleKey = String(item?.vehicleKey || '').trim();
    const patch = item?.patch;
    if (!vehicleKey || !patch || typeof patch !== 'object') continue;
    const normalized = roster?.length
      ? normalizeCarMetaWithCrewDedupe(patch, roster)
      : normalizeCarVehicleMeta(patch);
    const docId = vehicleKeyToDocId(vehicleKey);
    batch.set(getTransportCarMetaDocRef(eid, docId), carMetaDocPayload(vehicleKey, normalized), {
      merge: true,
    });
  }
  await batch.commit();
}

/** Migra `carMetaBySource` inline → subcolección y limpia el doc del evento. */
export async function migrateInlineCarMetaToSubcollection(eventId, plan, roster, updateDoc, getDocRef) {
  const eid = String(eventId || '').trim();
  const normalized = normalizeTransportPlanning(plan);
  const inline = normalized.carMetaBySource || {};
  const keys = Object.keys(inline);
  if (!eid || !keys.length) {
    return { migrated: false, plan: normalized };
  }
  if (Number(normalized.transportCarMetaStorageVersion) >= TRANSPORT_CAR_META_STORAGE_VERSION && !keys.length) {
    return { migrated: false, plan: transportPlanningFromEventDoc(normalized) };
  }

  const patches = keys.map((vehicleKey) => ({
    vehicleKey,
    patch: inline[vehicleKey],
  }));
  await upsertCarMetaDocs(eid, patches, roster);

  const fullPlan = normalizeTransportPlanning({ ...normalized, carMetaBySource: inline });
  const summary = buildCarMetaSummaryByTitularFromPlan(fullPlan, roster);
  const eventPlan = {
    ...transportPlanningForEventDoc({ ...fullPlan, bautizosCarMetaSummaryByTitular: summary }),
  };

  await updateDoc(getDocRef('app_events', eid), {
    transportPlanning: eventPlan,
  });

  return {
    migrated: true,
    plan: transportPlanningFromEventDoc(eventPlan),
    summary,
  };
}

/**
 * Persiste plan de transporte: car meta → subcolección; evento → sin inline + resumen.
 */
export async function persistTransportPlanWithCarMeta({
  eventId,
  plan,
  roster,
  updateDoc,
  getDocRef,
  crewOptsByTitular = {},
}) {
  const eid = String(eventId || '').trim();
  const normalized = applyCarMetaPassengerInheritance(normalizeTransportPlanning(plan));
  const patches = Object.entries(normalized.carMetaBySource || {}).map(([vehicleKey, meta]) => ({
    vehicleKey,
    patch: meta,
  }));

  if (patches.length) {
    await upsertCarMetaDocs(eid, patches, roster);
  }

  const summary = buildCarMetaSummaryByTitularFromPlan(normalized, roster, crewOptsByTitular);
  const eventPlan = transportPlanningForEventDoc({
    ...normalized,
    bautizosCarMetaSummaryByTitular: summary,
  });

  await updateDoc(getDocRef('app_events', eid), {
    transportPlanning: eventPlan,
  });

  return transportPlanningFromEventDoc({
    ...normalized,
    bautizosCarMetaSummaryByTitular: summary,
    transportCarMetaStorageVersion: TRANSPORT_CAR_META_STORAGE_VERSION,
  });
}

/** Parches de registro/transporte: subcolección + resumen en evento. */
export async function persistCarMetaPatchesToSubcollection({
  eventId,
  patches,
  currentPlan,
  roster,
  getDocRef,
  updateDoc,
}) {
  const eid = String(eventId || '').trim();
  if (!eid || !patches?.length) return normalizeTransportPlanning(currentPlan);

  const mergedPlan = mergeCarMetaPatchesIntoPlan(currentPlan, patches);
  const nextPlan = applyCarMetaPassengerInheritance(mergedPlan);

  await upsertCarMetaDocs(eid, patches, roster);

  const summary = buildCarMetaSummaryByTitularFromPlan(nextPlan, roster);
  const eventPlan = transportPlanningForEventDoc({
    ...nextPlan,
    bautizosCarMetaSummaryByTitular: summary,
  });

  await updateDoc(getDocRef('app_events', eid), {
    transportPlanning: eventPlan,
  });

  return transportPlanningFromEventDoc({
    ...nextPlan,
    bautizosCarMetaSummaryByTitular: summary,
    transportCarMetaStorageVersion: TRANSPORT_CAR_META_STORAGE_VERSION,
  });
}

export function vehicleKeysForTitular(titularSk, carCount) {
  const owner = String(titularSk || '').trim();
  const K = Math.max(1, parseInt(carCount, 10) || 1);
  const keys = [];
  for (let i = 1; i <= K; i += 1) {
    keys.push(carVehicleMetaStorageKey(owner, i));
  }
  return keys;
}

/** Alias estable para persistencia desde Registro / App (evita import dinámico circular). */
export const persistEventCarMetaPatches = persistCarMetaPatchesToSubcollection;
