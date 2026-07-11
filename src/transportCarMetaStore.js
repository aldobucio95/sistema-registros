/**
 * Almacenamiento de metadatos de carro en subcolección Firestore.
 * Reduce lecturas: el doc `app_events` ya no incluye `carMetaBySource` completo.
 *
 * Ruta: app_events/{eventId}/transport_car_meta/{vehicleDocId}
 */
import { deleteField, FieldPath, getDocs, getDoc, query, where, writeBatch } from 'firebase/firestore';
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
  vehicleMetaHasBasicVehicleFields,
} from './bautizosCarMeta.js';
import { coalesceVehiclePatchForPersist } from './transport/v2/transportVehicleModel.js';
import {
  carVehicleMetaStorageKey,
  collectTransportAttendanceAffectedKeys,
  patchTransportAttendanceOnPlan,
  buildTransportAttendanceMapFirestorePatch,
  buildTransportPlanningGranularFirestorePatch,
  buildTransportPlanningStructureFirestorePatch,
  normalizeTransportPlanning,
  TRANSPORT_PLAN_MAP_KEY_DELETE,
} from './transportPlanningCore.js';

export const TRANSPORT_CAR_META_STORAGE_VERSION = 1;

async function applyTransportPlanningGranularPatch(updateDoc, docRef, entries) {
  if (!entries?.length) return;
  const args = [];
  for (const { segments, value } of entries) {
    args.push(
      new FieldPath(...segments),
      value === TRANSPORT_PLAN_MAP_KEY_DELETE ? deleteField() : value
    );
  }
  await updateDoc(docRef, ...args);
}

/** Persiste solo claves de asistencia (sin reescribir todo `transportPlanning`). */
export async function saveTransportAttendancePatch({
  eventId,
  plan,
  sourceKey,
  confirmed,
  confirmedBy = '',
  getDocRef,
  updateDoc,
}) {
  const eid = String(eventId || '').trim();
  const sk = String(sourceKey || '').trim();
  if (!eid || !sk) return normalizeTransportPlanning(plan);

  const base = normalizeTransportPlanning(plan);
  const next = patchTransportAttendanceOnPlan(base, sk, confirmed, confirmedBy);
  const keys = collectTransportAttendanceAffectedKeys(base, sk);
  const args = [];
  for (const k of keys) {
    const entry = next.transportAttendanceBySource?.[k];
    args.push(
      new FieldPath('transportPlanning', 'transportAttendanceBySource', k),
      entry ? entry : deleteField()
    );
  }
  if (args.length) {
    await updateDoc(getDocRef('app_events', eid), ...args);
  }
  return transportPlanningFromEventDoc({
    ...next,
    bautizosCarMetaSummaryByTitular: base.bautizosCarMetaSummaryByTitular || {},
    transportCarMetaStorageVersion:
      base.transportCarMetaStorageVersion || TRANSPORT_CAR_META_STORAGE_VERSION,
  });
}

/** Persiste diff de `transportAttendanceBySource` (varias claves en un solo updateDoc). */
export async function saveTransportAttendanceMapDiff({
  eventId,
  localPlan,
  remotePlan,
  getDocRef,
  updateDoc,
}) {
  const eid = String(eventId || '').trim();
  if (!eid) return normalizeTransportPlanning(localPlan);

  const local = normalizeTransportPlanning(localPlan);
  const entries = buildTransportAttendanceMapFirestorePatch(local, remotePlan);
  if (entries.length) {
    await applyTransportPlanningGranularPatch(updateDoc, getDocRef('app_events', eid), entries);
  }
  return transportPlanningFromEventDoc({
    ...local,
    bautizosCarMetaSummaryByTitular: local.bautizosCarMetaSummaryByTitular || {},
    transportCarMetaStorageVersion:
      local.transportCarMetaStorageVersion || TRANSPORT_CAR_META_STORAGE_VERSION,
  });
}

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
    // Plan edits (pending save) must win over lazy-loaded Firestore cache.
    carMetaBySource: { ...cache, ...(plan?.carMetaBySource || {}) },
  });
}

/** Lectura UI: conserva rubros del vehículo en caché si el plan solo trae tripulación vacía. */
export function mergeCarMetaCacheIntoPlanForRead(plan, carMetaCacheByKey) {
  const cache = carMetaCacheByKey && typeof carMetaCacheByKey === 'object' ? carMetaCacheByKey : {};
  const fromPlan = plan?.carMetaBySource || {};
  const keys = new Set([...Object.keys(cache), ...Object.keys(fromPlan)]);
  if (!keys.size) return normalizeTransportPlanning(plan);
  const carMetaBySource = {};
  for (const vk of keys) {
    carMetaBySource[vk] = normalizeCarVehicleMeta(
      coalesceVehiclePatchForPersist(fromPlan[vk] || {}, cache[vk] || null)
    );
  }
  return normalizeTransportPlanning({ ...plan, carMetaBySource });
}

export function titularCarMetaHasUsableVehicleData(plan, carMetaCacheByKey, titularSk, effectiveCars = 1) {
  const owner = String(titularSk || '').trim();
  if (!owner) return false;
  const merged = mergeCarMetaCacheIntoPlanForRead(plan, carMetaCacheByKey);
  const K = Math.max(1, parseInt(effectiveCars, 10) || 1);
  for (let i = 1; i <= K; i += 1) {
    const vk = carVehicleMetaStorageKey(owner, i);
    const meta = merged?.carMetaBySource?.[vk];
    if (vehicleMetaHasBasicVehicleFields(meta)) return true;
    if (meta?.maybeAbsent) return true;
    if (String(meta?.driverSourceKey || '').trim()) return true;
    if (Array.isArray(meta?.passengerSourceKeys) && meta.passengerSourceKeys.length > 0) return true;
  }
  return false;
}

/** Copia meta lazy-loaded al plan editable (una sola fuente de verdad en memoria). */
export function materializeCarMetaCacheIntoPlan(plan, carMetaCacheByKey) {
  return mergeCarMetaCacheIntoPlan(plan, carMetaCacheByKey);
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
function carMetaFetchEntryHasUsableData(meta) {
  const m = normalizeCarVehicleMeta(meta);
  if (m.maybeAbsent) return true;
  if (m.brand || m.model || m.color || m.plates || m.driverSourceKey) return true;
  return Array.isArray(m.passengerSourceKeys) && m.passengerSourceKeys.length > 0;
}

/** Fusiona mapas de meta; un origen con datos reales gana sobre entradas vacías del otro. */
export function mergeFetchedCarMetaMaps(...maps) {
  const out = {};
  for (const map of maps) {
    if (!map || typeof map !== 'object') continue;
    for (const [vehicleKey, meta] of Object.entries(map)) {
      const key = String(vehicleKey || '').trim();
      if (!key) continue;
      const prev = out[key];
      if (!prev) {
        out[key] = normalizeCarVehicleMeta(meta);
        continue;
      }
      const prevOk = carMetaFetchEntryHasUsableData(prev);
      const nextOk = carMetaFetchEntryHasUsableData(meta);
      if (nextOk && !prevOk) out[key] = normalizeCarVehicleMeta(meta);
      else if (nextOk && prevOk) out[key] = normalizeCarVehicleMeta(meta);
    }
  }
  return out;
}

export async function fetchCarMetaForTitular(eventId, titularSk, opts = {}) {
  const eid = String(eventId || '').trim();
  const owner = String(titularSk || '').trim();
  if (!eid || !owner) return {};

  const preferV2 = opts.preferV2 !== false;
  const ownerPid = owner.startsWith('p:') ? owner.slice(2) : owner;

  let v2Map = {};
  if (preferV2) {
    try {
      const { fetchLegacyCarMetaForTitularV2 } = await import('./transport/v2/transportService.js');
      v2Map = await fetchLegacyCarMetaForTitularV2(eid, ownerPid);
    } catch {
      /* fallback v1 */
    }
  }

  const col = getTransportCarMetaColRef(eid);
  const q = query(col, where('ownerSourceKey', '==', owner));
  const snap = await getDocs(q);
  const v1Map = {};
  for (const d of snap.docs) {
    const vehicleKey = docIdToVehicleKey(d.id);
    v1Map[vehicleKey] = normalizeCarVehicleMeta(d.data());
  }
  return mergeFetchedCarMetaMaps(v1Map, v2Map);
}

/** Toda la meta de carro del evento (subcolección); para sugerencias de color y lectura inicial. */
export async function fetchAllCarMetaForEvent(eventId, opts = {}) {
  const eid = String(eventId || '').trim();
  if (!eid) return {};

  const useV2 =
    opts.preferV2 === true || Number(opts.transportVersion) >= 2;

  if (useV2) {
    try {
      const { fetchAllCarMetaForEventV2 } = await import('./transport/v2/transportService.js');
      const v2Map = await fetchAllCarMetaForEventV2(eid);
      const v2Keys = Object.keys(v2Map).length;
      if (v2Keys > 0) {
        return v2Map;
      }
    } catch {
      /* fallback v1 */
    }
  }

  const snap = await getDocs(getTransportCarMetaColRef(eid));
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

const CAR_META_FIRESTORE_FIELDS = new Set([
  'brand',
  'model',
  'color',
  'plates',
  'maybeAbsent',
  'pendingBrand',
  'pendingModel',
  'pendingColor',
  'pendingPlates',
  'driverSourceKey',
  'passengerSourceKeys',
  'pendingDriver',
  'pendingPassengers',
  'ownerSourceKey',
  'inheritsFromVehicleKey',
]);

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

/** Solo incluye campos presentes en `patch` para no borrar datos existentes en Firestore. */
function carMetaPartialFirestorePayload(vehicleKey, patch, roster = null) {
  if (!patch || typeof patch !== 'object') return null;
  const parsed = parseVehicleMetaKey(vehicleKey);
  const normalized = roster?.length
    ? normalizeCarMetaWithCrewDedupe({ ...normalizeCarVehicleMeta(null), ...patch }, roster)
    : normalizeCarVehicleMeta({ ...normalizeCarVehicleMeta(null), ...patch });
  const out = {
    vehicleKey: String(vehicleKey || '').trim(),
    ownerSourceKey: String(normalized.ownerSourceKey || parsed?.ownerSourceKey || '').trim(),
    carIndex: parsed?.carIndex || 1,
    updatedAt: Date.now(),
  };
  for (const key of Object.keys(patch)) {
    if (CAR_META_FIRESTORE_FIELDS.has(key)) {
      out[key] = normalized[key];
    }
  }
  return out;
}

/** Escribe parches en subcolección (batch). `fullDocument: true` reemplaza el doc completo normalizado. */
export async function upsertCarMetaDocs(eventId, patches, roster = null, opts = {}) {
  const eid = String(eventId || '').trim();
  if (!eid || !patches?.length) return;
  const fullDocument = opts.fullDocument === true;

  const batch = writeBatch(db);
  for (const item of patches) {
    const vehicleKey = String(item?.vehicleKey || '').trim();
    const patch = item?.patch;
    if (!vehicleKey || !patch || typeof patch !== 'object') continue;
    const docId = vehicleKeyToDocId(vehicleKey);
    const ref = getTransportCarMetaDocRef(eid, docId);
    const payload = fullDocument
      ? carMetaDocPayload(
          vehicleKey,
          roster?.length ? normalizeCarMetaWithCrewDedupe(patch, roster) : normalizeCarVehicleMeta(patch)
        )
      : carMetaPartialFirestorePayload(vehicleKey, patch, roster);
    if (!payload) continue;
    batch.set(ref, payload, { merge: true });
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
  await upsertCarMetaDocs(eid, patches, roster, { fullDocument: true });

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

export async function saveCarMetaVehicleToFirestore({
  eventId,
  vehicleKey,
  meta,
  currentPlan,
  roster,
  getDocRef,
  updateDoc,
}) {
  const eid = String(eventId || '').trim();
  const vk = String(vehicleKey || '').trim();
  if (!eid || !vk || !meta) return normalizeTransportPlanning(currentPlan);

  await upsertCarMetaDocs(eid, [{ vehicleKey: vk, patch: meta }], roster, { fullDocument: true });

  const mergedPlan = mergeCarMetaPatchesIntoPlan(currentPlan, [{ vehicleKey: vk, patch: meta }]);
  const nextPlan = applyCarMetaPassengerInheritance(mergedPlan);
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

export async function saveTransportPlanStructure({
  eventId,
  plan,
  roster,
  getDocRef,
  updateDoc,
  crewOptsByTitular = {},
  /** Solo cambios de estructura (camiones/asignación): reutiliza resumen existente sin re-merge de car meta. */
  preserveCarMetaSummary = false,
  /** Plan remoto para parche parcial (solo campos que cambiaron). */
  remotePlan = null,
}) {
  const eid = String(eventId || '').trim();
  if (!eid) return normalizeTransportPlanning(plan);

  const normalized = preserveCarMetaSummary
    ? normalizeTransportPlanning(plan)
    : applyCarMetaPassengerInheritance(normalizeTransportPlanning(plan));

  const existingSummary = normalized.bautizosCarMetaSummaryByTitular || {};
  const remoteSummary =
    remotePlan?.bautizosCarMetaSummaryByTitular &&
    typeof remotePlan.bautizosCarMetaSummaryByTitular === 'object'
      ? remotePlan.bautizosCarMetaSummaryByTitular
      : {};
  const preservedSummary =
    preserveCarMetaSummary &&
    (Object.keys(existingSummary).length > 0 || Object.keys(remoteSummary).length > 0);
  const summary = preservedSummary
    ? Object.keys(existingSummary).length > 0
      ? existingSummary
      : remoteSummary
    : buildCarMetaSummaryByTitularFromPlan(normalized, roster, crewOptsByTitular);

  const granularEntries =
    preserveCarMetaSummary && remotePlan
      ? buildTransportPlanningGranularFirestorePatch(normalized, remotePlan)
      : [];

  if (granularEntries.length > 0) {
    await applyTransportPlanningGranularPatch(
      updateDoc,
      getDocRef('app_events', eid),
      granularEntries
    );
  } else if (!preserveCarMetaSummary || !remotePlan) {
    const eventPlan = transportPlanningForEventDoc({
      ...normalized,
      bautizosCarMetaSummaryByTitular: summary,
    });
    await updateDoc(getDocRef('app_events', eid), {
      transportPlanning: eventPlan,
    });
  }

  return transportPlanningFromEventDoc({
    ...normalized,
    bautizosCarMetaSummaryByTitular: summary,
    transportCarMetaStorageVersion: TRANSPORT_CAR_META_STORAGE_VERSION,
  });
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
    await upsertCarMetaDocs(eid, patches, roster, { fullDocument: true });
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
  deferEventDocUpdate = false,
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

  const resultPlan = transportPlanningFromEventDoc({
    ...nextPlan,
    bautizosCarMetaSummaryByTitular: summary,
    transportCarMetaStorageVersion: TRANSPORT_CAR_META_STORAGE_VERSION,
  });

  if (deferEventDocUpdate) {
    return resultPlan;
  }

  await updateDoc(getDocRef('app_events', eid), {
    transportPlanning: eventPlan,
  });

  return resultPlan;
}

/** Plan en memoria tras parches (sin escribir Firestore). */
export function applyCarMetaPatchesLocally(plan, patches, roster) {
  if (!patches?.length) return normalizeTransportPlanning(plan);
  const mergedPlan = mergeCarMetaPatchesIntoPlan(normalizeTransportPlanning(plan), patches);
  const nextPlan = applyCarMetaPassengerInheritance(mergedPlan);
  const summary = buildCarMetaSummaryByTitularFromPlan(nextPlan, roster);
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
