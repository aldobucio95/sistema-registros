import {
  carVehicleMetaStorageKey,
  normalizeCarVehicleMeta,
  getCarVehicleMetaFromPlan,
  normalizeTransportPlanning,
} from './transportPlanningCore.js';
import {
  normalizeArrivalCarCount,
  bautizosLlegaEnCarroForTransportPricing,
  getBautizosCompanionsArray,
} from './bautizosParty.js';

export const CAR_META_VEHICLE_FIELDS = ['brand', 'model', 'color', 'plates'];

const PENDING_FIELD_BY_VEHICLE_FIELD = {
  brand: 'pendingBrand',
  model: 'pendingModel',
  color: 'pendingColor',
  plates: 'pendingPlates',
};

/** Re-export con el esquema extendido (pending*, tripulación, owner). */
export { normalizeCarVehicleMeta };

/** Alias de `normalizeCarVehicleMeta` para el módulo de datos de carro Bautizos. */
export function normalizeCarMeta(raw) {
  return normalizeCarVehicleMeta(raw);
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

function resolveHostSourceKey(hostPerson, hostSourceKey) {
  const explicit = String(hostSourceKey || '').trim();
  if (explicit) return explicit;
  const id = String(hostPerson?.id || '').trim();
  return id ? `p:${id}` : 'p:draft-host';
}

function resolveHostId(hostPerson, hostSourceKey) {
  const sk = resolveHostSourceKey(hostPerson, hostSourceKey);
  if (sk.startsWith('p:')) return sk.slice(2);
  return String(hostPerson?.id || 'draft-host').trim() || 'draft-host';
}

function draftCompanionKeyAt(draftCompanionKeys, index) {
  if (!draftCompanionKeys || typeof draftCompanionKeys !== 'object') return '';
  return String(draftCompanionKeys[index] ?? draftCompanionKeys[String(index)] ?? '').trim();
}

/** Lee metadatos por clave completa (`p:<id>|c1`, `c:<host>::<cid>|c2`, etc.). */
export function getCarVehicleMetaFromPlanByKey(plan, vehicleKey) {
  const key = String(vehicleKey || '').trim();
  if (!key) return normalizeCarVehicleMeta(null);
  const normalizedPlan = normalizeTransportPlanning(plan);
  const direct = normalizedPlan?.carMetaBySource?.[key];
  if (direct != null) return normalizeCarVehicleMeta(direct);
  const parsed = parseVehicleMetaKey(key);
  if (!parsed) return normalizeCarVehicleMeta(null);
  return getCarVehicleMetaFromPlan(normalizedPlan, parsed.ownerSourceKey, parsed.carIndex);
}

export function isCarFieldSatisfied(meta, field) {
  const m = normalizeCarVehicleMeta(meta);
  const f = String(field || '').trim();
  if (!CAR_META_VEHICLE_FIELDS.includes(f)) return false;
  if (String(m[f] || '').trim()) return true;
  const pendingKey = PENDING_FIELD_BY_VEHICLE_FIELD[f];
  return m[pendingKey] === true;
}

export function isCarCrewFieldSatisfied(meta, role, opts = {}) {
  const m = normalizeCarVehicleMeta(meta);
  const r = String(role || '').trim();
  if (r === 'driver') {
    return Boolean(String(m.driverSourceKey || '').trim()) || m.pendingDriver === true;
  }
  if (r === 'passengers') {
    if (opts.requiresPassengers === false) return true;
    return (
      (Array.isArray(m.passengerSourceKeys) && m.passengerSourceKeys.length > 0) ||
      m.pendingPassengers === true
    );
  }
  return false;
}

const VEHICLE_FIELD_LABELS = {
  brand: 'Marca',
  model: 'Modelo',
  color: 'Color',
  plates: 'Placas',
};

export function isCarVehicleFullyCaptured(meta, opts = {}) {
  const m = normalizeCarVehicleMeta(meta);
  if (m.maybeAbsent) return true;
  for (const field of CAR_META_VEHICLE_FIELDS) {
    if (!isCarFieldSatisfied(m, field)) return false;
  }
  if (!isCarCrewFieldSatisfied(m, 'driver', opts)) return false;
  if (!isCarCrewFieldSatisfied(m, 'passengers', opts)) return false;
  return true;
}

/** Hay valores reales sin capturar (chip roster, WA, modal). Incluye rubros solo marcados como pendientes. */
export function carMetaNeedsAttention(meta, opts = {}) {
  const m = normalizeCarVehicleMeta(meta);
  if (m.maybeAbsent) return false;
  for (const field of CAR_META_VEHICLE_FIELDS) {
    if (!String(m[field] || '').trim()) return true;
  }
  if (!String(m.driverSourceKey || '').trim()) return true;
  if (opts.requiresPassengers !== false) {
    if (!Array.isArray(m.passengerSourceKeys) || m.passengerSourceKeys.length === 0) return true;
  }
  return false;
}

/** Rubros del vehículo sin valor capturado (para mensajes WA / Excel). */
export function collectCarMetaMissingFieldLabels(meta, opts = {}) {
  const m = normalizeCarVehicleMeta(meta);
  if (m.maybeAbsent) return [];
  const out = [];
  for (const field of CAR_META_VEHICLE_FIELDS) {
    if (!String(m[field] || '').trim()) {
      out.push(VEHICLE_FIELD_LABELS[field]);
    }
  }
  if (!String(m.driverSourceKey || '').trim()) {
    out.push('conductor');
  }
  if (opts.requiresPassengers !== false) {
    if (!Array.isArray(m.passengerSourceKeys) || m.passengerSourceKeys.length === 0) {
      out.push('pasajeros');
    }
  }
  return out;
}

/** Rubros sin valor ni marca de pendiente (bloquea guardar). */
export function getCarMetaValidationIssues(meta, prefix = '', opts = {}) {
  const m = normalizeCarVehicleMeta(meta);
  if (m.maybeAbsent) return [];
  const issues = [];
  const p = String(prefix || '').trim();
  const lead = p ? `${p}: ` : '';
  for (const field of CAR_META_VEHICLE_FIELDS) {
    if (!isCarFieldSatisfied(m, field)) {
      issues.push(`${lead}${VEHICLE_FIELD_LABELS[field]}: indique el dato o márquelo como pendiente.`);
    }
  }
  if (!isCarCrewFieldSatisfied(m, 'driver', opts)) {
    issues.push(`${lead}Conductor: seleccione quién conduce o márquelo como pendiente.`);
  }
  if (!isCarCrewFieldSatisfied(m, 'passengers', opts)) {
    issues.push(`${lead}Pasajeros: seleccione al menos uno o márquelos como pendientes.`);
  }
  return issues;
}

export function familyHasNamedCompanionsForCarCrew(hostPerson, companions) {
  const comps = Array.isArray(companions) ? companions : getBautizosCompanionsArray(hostPerson);
  return comps.some((c) => String(c?.name || '').trim());
}

export function carCrewRequiresPassengerSelection(hostPerson, companions) {
  return familyHasNamedCompanionsForCarCrew(hostPerson, companions);
}

function resolveCarCrewContextOpts(crewContext = {}) {
  const { hostPerson, companions, requiresPassengers } = crewContext;
  if (typeof requiresPassengers === 'boolean') {
    return { requiresPassengers };
  }
  if (hostPerson != null || companions != null) {
    return { requiresPassengers: carCrewRequiresPassengerSelection(hostPerson, companions) };
  }
  return { requiresPassengers: true };
}

export function getFamilyCarInventoryValidationIssues(inventory, crewContext = {}) {
  const crewOpts = resolveCarCrewContextOpts(crewContext);
  const issues = [];
  for (const slot of inventory || []) {
    const label =
      slot.slotKind === 'additional'
        ? `Carro adicional ${slot.carIndex}`
        : `Carro familiar ${slot.carIndex}`;
    issues.push(...getCarMetaValidationIssues(slot.meta, label, crewOpts));
  }
  return issues;
}

/** Inventario con borrador del formulario aplicado. */
export function buildMergedFamilyCarInventory({
  hostPerson,
  companions,
  plan,
  hostSourceKey,
  draftMetaByVehicleKey,
  draftCompanionKeys,
}) {
  const base = buildBautizosFamilyCarInventory({
    hostPerson,
    companions,
    plan,
    hostSourceKey,
    draftCompanionKeys,
  });
  return base.map((slot) => ({
    ...slot,
    meta: normalizeCarVehicleMeta({
      ...slot.meta,
      ...(draftMetaByVehicleKey?.[slot.vehicleKey] || {}),
    }),
  }));
}

/** Colores distintos ya registrados en el plan de transporte del evento. */
export function collectCarColorSuggestions(planOrCarMetaBySource) {
  const raw = planOrCarMetaBySource?.carMetaBySource ?? planOrCarMetaBySource ?? {};
  const seen = new Set();
  const out = [];
  for (const meta of Object.values(raw)) {
    const c = String(meta?.color || '').trim();
    if (!c) continue;
    const key = c.toLocaleLowerCase('es');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  out.sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  return out;
}

export function getCompanionSourceKey(hostId, companion, index) {
  const hid = String(hostId || '').trim() || 'draft-host';
  const cid = String(companion?.id || '').trim() || `idx-${index}`;
  return `c:${hid}::${cid}`;
}

export function companionGoesByCar(companion) {
  return bautizosLlegaEnCarroForTransportPricing(companion);
}

export function buildBautizosFamilyMemberOptions({
  hostPerson,
  companions,
  hostSourceKey,
  draftCompanionKeys,
}) {
  const hostSk = resolveHostSourceKey(hostPerson, hostSourceKey);
  const hostName = String(hostPerson?.name || '').trim() || 'Titular';
  const hostId = resolveHostId(hostPerson, hostSourceKey);
  const comps = Array.isArray(companions) ? companions : getBautizosCompanionsArray(hostPerson);
  const out = [{ sourceKey: hostSk, label: hostName, kind: 'host' }];

  comps.forEach((c, index) => {
    const name = String(c?.name || '').trim();
    if (!name) return;
    const sourceKey = draftCompanionKeyAt(draftCompanionKeys, index) || getCompanionSourceKey(hostId, c, index);
    const relationship = String(c?.relationship || '').trim();
    out.push({
      sourceKey,
      label: relationship ? `${name} (${relationship})` : name,
      kind: 'companion',
    });
  });

  return out;
}

/** Pasajeros asignados en otros carros de la misma familia (excluye el carro actual). */
export function collectPassengerSourceKeysOnOtherCars(inventory, excludeVehicleKey) {
  const excluded = new Set();
  const self = String(excludeVehicleKey || '').trim();
  for (const slot of inventory || []) {
    if (String(slot.vehicleKey || '').trim() === self) continue;
    const m = normalizeCarVehicleMeta(slot.meta);
    if (m.maybeAbsent || m.pendingPassengers) continue;
    for (const sk of m.passengerSourceKeys || []) {
      const k = String(sk || '').trim();
      if (k) excluded.add(k);
    }
  }
  return excluded;
}

/**
 * Conductores y pasajeros ya asignados en otros carros del mismo grupo (excluye el carro actual).
 * Cada persona solo puede ser conductor o pasajero en un carro a la vez.
 */
export function collectAssignedCrewSourceKeysOnOtherCars(inventory, excludeVehicleKey) {
  const excluded = new Set();
  const self = String(excludeVehicleKey || '').trim();
  for (const slot of inventory || []) {
    if (String(slot.vehicleKey || '').trim() === self) continue;
    const m = normalizeCarVehicleMeta(slot.meta);
    if (m.maybeAbsent) continue;
    if (!m.pendingDriver) {
      const driver = String(m.driverSourceKey || '').trim();
      if (driver) excluded.add(driver);
    }
    if (!m.pendingPassengers) {
      for (const sk of m.passengerSourceKeys || []) {
        const k = String(sk || '').trim();
        if (k) excluded.add(k);
      }
    }
  }
  return excluded;
}

/** Inventario de slots de carro (`ownerSk|cN`) para un titular y cantidad efectiva. */
export function buildCarInventorySlotsForOwner(plan, ownerSourceKey, carCount) {
  const normalizedPlan = normalizeTransportPlanning(plan);
  const owner = String(ownerSourceKey || '').trim();
  const K = Math.max(1, parseInt(carCount, 10) || 1);
  const inventory = [];
  for (let carIndex = 1; carIndex <= K; carIndex += 1) {
    const vehicleKey = carVehicleMetaStorageKey(owner, carIndex);
    inventory.push({
      vehicleKey,
      carIndex,
      meta: getCarVehicleMetaFromPlanByKey(normalizedPlan, vehicleKey),
    });
  }
  return inventory;
}

/**
 * Parches para quitar a `personKeys` como conductor o pasajero en otros carros del inventario.
 */
export function buildClearPersonFromOtherCarsCrewPatches(inventory, excludeVehicleKey, personKeys) {
  const people = new Set(
    (Array.isArray(personKeys) ? personKeys : [personKeys])
      .map((k) => String(k || '').trim())
      .filter(Boolean)
  );
  if (!people.size) return [];
  const self = String(excludeVehicleKey || '').trim();
  const patches = [];
  for (const slot of inventory || []) {
    if (String(slot.vehicleKey || '').trim() === self) continue;
    const m = normalizeCarVehicleMeta(slot.meta);
    if (m.maybeAbsent) continue;
    const patch = {};
    const driver = String(m.driverSourceKey || '').trim();
    if (driver && people.has(driver)) {
      patch.driverSourceKey = '';
      patch.pendingDriver = false;
    }
    const prevPassengers = Array.isArray(m.passengerSourceKeys) ? m.passengerSourceKeys : [];
    const nextPassengers = prevPassengers.filter((p) => !people.has(String(p || '').trim()));
    if (nextPassengers.length !== prevPassengers.length) {
      patch.passengerSourceKeys = nextPassengers;
      patch.pendingPassengers = false;
    }
    if (Object.keys(patch).length) {
      patches.push({ vehicleKey: slot.vehicleKey, patch });
    }
  }
  return patches;
}

/** Parche del carro actual + limpieza de esas personas en los demás carros del grupo. */
export function buildCarCrewAssignmentPatches({ inventory, vehicleKey, patch, exclusivePersonKeys = [] }) {
  const patches = [{ vehicleKey, patch }];
  const keys = (exclusivePersonKeys || []).map((k) => String(k || '').trim()).filter(Boolean);
  if (keys.length) {
    patches.push(...buildClearPersonFromOtherCarsCrewPatches(inventory, vehicleKey, keys));
  }
  return patches;
}

/** Opciones de conductor o pasajero: excluye quien ya tiene rol en otro carro. */
export function filterDriverMemberOptions(memberOptions, excludedSourceKeys) {
  const blocked =
    excludedSourceKeys instanceof Set ? excludedSourceKeys : new Set(excludedSourceKeys || []);
  return (memberOptions || []).filter((m) => !blocked.has(String(m.sourceKey || '').trim()));
}

/** Claves de vehículo (`ownerSk|cN`) por encima del conteo permitido. */
export function vehicleKeysAboveCarCount(ownerSourceKey, previousCount, newCount) {
  const owner = String(ownerSourceKey || '').trim();
  const prev = Math.max(1, parseInt(previousCount, 10) || 1);
  const next = Math.max(1, parseInt(newCount, 10) || 1);
  if (next >= prev) return [];
  const keys = [];
  for (let i = next + 1; i <= prev; i += 1) {
    keys.push(carVehicleMetaStorageKey(owner, i));
  }
  return keys;
}

export function pruneDraftCarMetaKeys(draftMetaByVehicleKey, keysToRemove) {
  const remove = new Set((keysToRemove || []).map((k) => String(k || '').trim()).filter(Boolean));
  if (!remove.size) return draftMetaByVehicleKey || {};
  const next = { ...(draftMetaByVehicleKey || {}) };
  for (const k of remove) delete next[k];
  return next;
}

export function buildBautizosFamilyCarInventory({
  hostPerson,
  companions,
  plan,
  hostSourceKey,
  draftCompanionKeys,
}) {
  const hostSk = resolveHostSourceKey(hostPerson, hostSourceKey);
  const hostLabel = String(hostPerson?.name || '').trim() || 'Titular';
  const comps = Array.isArray(companions) ? companions : getBautizosCompanionsArray(hostPerson);
  const normalizedPlan = normalizeTransportPlanning(plan);
  const inventory = [];

  const hostGoesByCar = bautizosLlegaEnCarroForTransportPricing(hostPerson);
  const anyCompanionGoesByCar = comps.some((c) => companionGoesByCar(c));
  if (!hostGoesByCar && !anyCompanionGoesByCar) return inventory;

  const familyCarCount = normalizeArrivalCarCount(hostPerson?.carrosLlegada);
  for (let carIndex = 1; carIndex <= familyCarCount; carIndex += 1) {
    const vehicleKey = carVehicleMetaStorageKey(hostSk, carIndex);
    const meta = getCarVehicleMetaFromPlanByKey(normalizedPlan, vehicleKey);
    inventory.push({
      vehicleKey,
      ownerSourceKey: hostSk,
      ownerLabel: hostLabel,
      carIndex,
      slotKind: carIndex === 1 ? 'family' : 'additional',
      meta: normalizeCarVehicleMeta({ ...meta, ownerSourceKey: meta.ownerSourceKey || hostSk }),
    });
  }

  return inventory;
}

export function familyCarInventoryNeedsAttention(inventory, crewContext = {}) {
  const crewOpts = resolveCarCrewContextOpts(crewContext);
  const list = Array.isArray(inventory) ? inventory : [];
  return list.some((slot) => carMetaNeedsAttention(slot?.meta, crewOpts));
}

/** `true` si `sourceKey` figura como pasajero y no como conductor en el plan de transporte. */
export function sourceKeyIsCarPassengerNotDriver(plan, sourceKey) {
  const sk = String(sourceKey || '').trim();
  if (!sk) return false;
  const normalizedPlan = normalizeTransportPlanning(plan);
  let isPassenger = false;
  let isDriver = false;
  for (const meta of Object.values(normalizedPlan.carMetaBySource || {})) {
    const m = normalizeCarVehicleMeta(meta);
    if (m.maybeAbsent) continue;
    if (String(m.driverSourceKey || '').trim() === sk) isDriver = true;
    if ((m.passengerSourceKeys || []).some((p) => String(p || '').trim() === sk)) isPassenger = true;
  }
  return isPassenger && !isDriver;
}

function buildInheritCarMetaPatchFromHost(hostMeta, passengerOwnerSourceKey, inheritsFromVehicleKey) {
  const m = normalizeCarVehicleMeta(hostMeta);
  const owner = String(passengerOwnerSourceKey || '').trim();
  return normalizeCarVehicleMeta({
    brand: m.brand,
    model: m.model,
    color: m.color,
    plates: m.plates,
    pendingBrand: m.pendingBrand,
    pendingModel: m.pendingModel,
    pendingColor: m.pendingColor,
    pendingPlates: m.pendingPlates,
    maybeAbsent: m.maybeAbsent,
    ownerSourceKey: owner,
    inheritsFromVehicleKey: String(inheritsFromVehicleKey || '').trim(),
    // La tripulación vive solo en la clave canónica del titular (p:<id>|cN).
    driverSourceKey: '',
    passengerSourceKeys: [],
    pendingDriver: false,
    pendingPassengers: false,
  });
}

function isPassengerCarMetaMirrorKey(vehicleKey, rawMeta) {
  const parsed = parseVehicleMetaKey(vehicleKey);
  if (!parsed) return false;
  const m = normalizeCarVehicleMeta(rawMeta);
  if (String(m.inheritsFromVehicleKey || '').trim()) return true;
  return parsed.ownerSourceKey.startsWith('c:');
}

/**
 * Parches para copiar metadatos del carro titular a pasajeros asignados en tripulación
 * (`passengerSourceKeys`), cuando el carro titular ya no requiere atención.
 */
export function buildCarMetaPassengerInheritPatches(plan) {
  const normalizedPlan = normalizeTransportPlanning(plan);
  const patches = [];
  const seenVehicleKeys = new Set();

  for (const [vehicleKey, rawMeta] of Object.entries(normalizedPlan.carMetaBySource || {})) {
    const parsed = parseVehicleMetaKey(vehicleKey);
    if (!parsed) continue;
    const { ownerSourceKey, carIndex } = parsed;
    // Solo slots canónicos del titular; ignorar espejos heredados (c:…|cN).
    if (!ownerSourceKey.startsWith('p:')) continue;

    const hostMeta = normalizeCarVehicleMeta(rawMeta);
    if (hostMeta.maybeAbsent || carMetaNeedsAttention(hostMeta)) continue;

    const driverSk = String(hostMeta.driverSourceKey || '').trim();
    for (const passengerSk of hostMeta.passengerSourceKeys || []) {
      const psk = String(passengerSk || '').trim();
      if (!psk || psk === driverSk) continue;
      // El titular ya tiene el slot canónico p:<id>|cN; no crear espejo encima del carro 1.
      if (psk === ownerSourceKey) continue;

      const targetVehicleKey = carVehicleMetaStorageKey(psk, carIndex);
      if (seenVehicleKeys.has(targetVehicleKey)) continue;
      seenVehicleKeys.add(targetVehicleKey);

      patches.push({
        vehicleKey: targetVehicleKey,
        patch: buildInheritCarMetaPatchFromHost(hostMeta, psk, vehicleKey),
      });
    }
  }

  return patches;
}

/** Aplica herencia de pasajeros sobre un plan ya normalizado (sin persistir). */
export function applyCarMetaPassengerInheritance(plan) {
  const normalized = normalizeTransportPlanning(plan);
  const carMetaBySource = { ...(normalized.carMetaBySource || {}) };
  for (const key of Object.keys(carMetaBySource)) {
    if (isPassengerCarMetaMirrorKey(key, carMetaBySource[key])) {
      delete carMetaBySource[key];
    }
  }
  const cleaned = { ...normalized, carMetaBySource };
  const inheritPatches = buildCarMetaPassengerInheritPatches(cleaned);
  if (!inheritPatches.length) return cleaned;
  return mergeCarMetaPatchesIntoPlan(cleaned, inheritPatches);
}

export function mergeCarMetaPatchesIntoPlan(plan, patches) {
  const next = normalizeTransportPlanning(plan);
  const carMetaBySource = { ...(next.carMetaBySource || {}) };

  for (const item of patches || []) {
    const vehicleKey = String(item?.vehicleKey || '').trim();
    const patch = item?.patch;
    if (!vehicleKey || !patch || typeof patch !== 'object') continue;
    const current =
      carMetaBySource[vehicleKey] && typeof carMetaBySource[vehicleKey] === 'object'
        ? carMetaBySource[vehicleKey]
        : {};
    carMetaBySource[vehicleKey] = normalizeCarVehicleMeta({ ...current, ...patch });
  }

  return { ...next, carMetaBySource };
}

export function markAllEmptyAsPending(meta, opts = {}) {
  const m = normalizeCarVehicleMeta(meta);
  const out = { ...m };

  for (const field of CAR_META_VEHICLE_FIELDS) {
    const pendingKey = PENDING_FIELD_BY_VEHICLE_FIELD[field];
    if (!String(m[field] || '').trim()) {
      out[pendingKey] = true;
    }
  }
  if (!String(m.driverSourceKey || '').trim()) {
    out.pendingDriver = true;
  }
  if (opts.requiresPassengers !== false) {
    if (!Array.isArray(m.passengerSourceKeys) || m.passengerSourceKeys.length === 0) {
      out.pendingPassengers = true;
    }
  }

  return out;
}

export function formatCarMetaDisplayValue(meta, field) {
  const m = normalizeCarVehicleMeta(meta);
  const f = String(field || '').trim();
  if (!CAR_META_VEHICLE_FIELDS.includes(f)) return '';
  const value = String(m[f] || '').trim();
  if (value) return value;
  return 'Pendiente';
}

export function buildRosterSourceKeyLabelIndex(roster) {
  const map = new Map();
  for (const p of roster || []) {
    const id = String(p?.id || '').trim();
    if (!id) continue;
    const name = String(p?.name || '').trim();
    if (!name) continue;
    map.set(`p:${id}`, name);
    map.set(id, name);
    const comps = getBautizosCompanionsArray(p);
    comps.forEach((c, i) => {
      const cname = String(c?.name || '').trim();
      if (!cname) return;
      map.set(getCompanionSourceKey(id, c, i), cname);
    });
  }
  return map;
}

function buildCarSummaryFromTitular(titular, plan, roster, { inherited = false } = {}) {
  const companions = getBautizosCompanionsArray(titular);
  const hostSk = `p:${String(titular?.id || '').trim()}`;
  const inventory = buildBautizosFamilyCarInventory({
    hostPerson: titular,
    companions,
    plan,
    hostSourceKey: hostSk,
  });
  return {
    hostPerson: titular,
    companions,
    hostSourceKey: hostSk,
    inventory,
    inheritedFromTitular: inherited,
    titularName: String(titular?.name || '').trim() || 'Titular',
    carCount: normalizeArrivalCarCount(titular?.carrosLlegada),
    labelIndex: buildRosterSourceKeyLabelIndex(roster),
  };
}

/** Titular cuyo carro incluye a `passengerSk` como pasajero (familia, bautizado derivado o grupo manual). */
export function findTitularParticipantForCarPassenger(plan, passengerSk, roster) {
  const psk = String(passengerSk || '').trim();
  if (!psk) return null;
  const normalizedPlan = applyCarMetaPassengerInheritance(normalizeTransportPlanning(plan));

  for (const [vehicleKey, rawMeta] of Object.entries(normalizedPlan.carMetaBySource || {})) {
    const m = normalizeCarVehicleMeta(rawMeta);
    if (m.maybeAbsent) continue;
    const isPassenger = (m.passengerSourceKeys || []).some((p) => String(p || '').trim() === psk);
    if (!isPassenger) continue;

    const parsed = parseVehicleMetaKey(vehicleKey);
    const ownerSk = String(parsed?.ownerSourceKey || '').trim();
    if (!ownerSk.startsWith('p:')) continue;
    const titularId = ownerSk.slice(2);
    const titular = (roster || []).find((p) => String(p?.id || '').trim() === titularId);
    if (titular) return titular;
  }
  return null;
}

/**
 * Inventario y contexto de la tarjeta «Datos de carros» en el resumen expandido del roster.
 * Pasajeros (bautizados derivados, grupo manual) heredan la vista del titular del carro.
 */
export function buildCarDataSummaryForRosterPerson({ person, companions, plan, roster }) {
  const normalizedPlan = applyCarMetaPassengerInheritance(normalizeTransportPlanning(plan));
  const personSk = `p:${String(person?.id || '').trim()}`;
  const labelIndex = buildRosterSourceKeyLabelIndex(roster);
  const comps = Array.isArray(companions) ? companions : getBautizosCompanionsArray(person);

  const splitHostId = String(person?.bautizosSplitPartyHostParticipantId || '').trim();
  if (splitHostId) {
    const titular = (roster || []).find((p) => String(p?.id || '').trim() === splitHostId);
    if (titular) return buildCarSummaryFromTitular(titular, normalizedPlan, roster, { inherited: true });
  }

  const inventory = buildBautizosFamilyCarInventory({
    hostPerson: person,
    companions: comps,
    plan: normalizedPlan,
    hostSourceKey: personSk,
  });
  if (inventory.length) {
    return {
      hostPerson: person,
      companions: comps,
      hostSourceKey: personSk,
      inventory,
      inheritedFromTitular: false,
      titularName: '',
      carCount: normalizeArrivalCarCount(person?.carrosLlegada),
      labelIndex,
    };
  }

  if (sourceKeyIsCarPassengerNotDriver(normalizedPlan, personSk)) {
    const titular = findTitularParticipantForCarPassenger(normalizedPlan, personSk, roster);
    if (titular) return buildCarSummaryFromTitular(titular, normalizedPlan, roster, { inherited: true });
  }

  const ownInherited = getCarVehicleMetaFromPlanByKey(
    normalizedPlan,
    carVehicleMetaStorageKey(personSk, 1)
  );
  const inheritVk = String(ownInherited.inheritsFromVehicleKey || '').trim();
  if (inheritVk) {
    const parsed = parseVehicleMetaKey(inheritVk);
    const ownerSk = String(parsed?.ownerSourceKey || '').trim();
    if (ownerSk.startsWith('p:')) {
      const titularId = ownerSk.slice(2);
      const titular = (roster || []).find((p) => String(p?.id || '').trim() === titularId);
      if (titular) return buildCarSummaryFromTitular(titular, normalizedPlan, roster, { inherited: true });
    }
  }

  return {
    hostPerson: person,
    companions: comps,
    hostSourceKey: personSk,
    inventory: [],
    inheritedFromTitular: false,
    titularName: '',
    carCount: normalizeArrivalCarCount(person?.carrosLlegada),
    labelIndex,
  };
}

export function rosterPersonHasCarDataSummary(ctx) {
  return !!(ctx?.inventory?.length);
}

export function resolveMemberLabel(sourceKey, hostPerson, companions, labelIndex) {
  const sk = String(sourceKey || '').trim();
  if (!sk) return '';

  const hostSk = resolveHostSourceKey(hostPerson, '');
  if (sk === hostSk || sk === 'p:draft-host') {
    return String(hostPerson?.name || '').trim() || 'Titular';
  }

  const comps = Array.isArray(companions) ? companions : getBautizosCompanionsArray(hostPerson);
  const hostId = resolveHostId(hostPerson, '');

  for (let i = 0; i < comps.length; i += 1) {
    if (getCompanionSourceKey(hostId, comps[i], i) === sk) {
      return String(comps[i]?.name || '').trim() || `Acompañante ${i + 1}`;
    }
  }

  if (sk.startsWith('c:')) {
    const compId = sk.slice(2).split('::')[1];
    if (compId) {
      for (let i = 0; i < comps.length; i += 1) {
        const cid = String(comps[i]?.id || '').trim() || `idx-${i}`;
        if (cid === compId) {
          return String(comps[i]?.name || '').trim() || `Acompañante ${i + 1}`;
        }
      }
    }
  }

  if (labelIndex instanceof Map) {
    const fromIndex = labelIndex.get(sk);
    if (fromIndex) return fromIndex;
    if (sk.startsWith('p:')) {
      const fromId = labelIndex.get(sk.slice(2));
      if (fromId) return fromId;
    }
  }

  if (sk.startsWith('p:')) {
    const pid = sk.slice(2);
    const rosterList = Array.isArray(labelIndex) ? labelIndex : null;
    if (rosterList) {
      const hit = rosterList.find((p) => String(p?.id || '').trim() === pid);
      if (hit?.name) return String(hit.name).trim();
    }
    return 'Participante';
  }
  if (sk.startsWith('c:')) return 'Acompañante';

  return '';
}

export function countAdditionalCarsForHost(hostPerson) {
  const total = normalizeArrivalCarCount(hostPerson?.carrosLlegada);
  return Math.max(0, total - 1);
}

/** Titular o algún acompañante declaró llegada en carro. */
export function familyHasAnyCarTransport(hostPerson, companions) {
  if (bautizosLlegaEnCarroForTransportPricing(hostPerson)) return true;
  const comps = Array.isArray(companions) ? companions : getBautizosCompanionsArray(hostPerson);
  return comps.some((c) => companionGoesByCar(c));
}

/** Aplica parches de carMeta al plan del evento y persiste en Firestore. */
export async function persistEventCarMetaPatches({
  eventId,
  patches,
  currentPlan,
  getDocRef,
  updateDoc,
}) {
  const eid = String(eventId || '').trim();
  if (!eid || !patches?.length) return normalizeTransportPlanning(currentPlan);
  const mergedPlan = mergeCarMetaPatchesIntoPlan(currentPlan, patches);
  const nextPlan = applyCarMetaPassengerInheritance(mergedPlan);
  await updateDoc(getDocRef('app_events', eid), { transportPlanning: nextPlan });
  return nextPlan;
}

/** Convierte inventario con meta editada a parches para persistir. */
export function inventoryToCarMetaPatches(inventory) {
  return (inventory || []).map((slot) => ({
    vehicleKey: slot.vehicleKey,
    patch: { ...(slot.meta || {}), ownerSourceKey: slot.ownerSourceKey || '' },
  }));
}

/** Reemplaza claves de borrador (`p:draft-host`, `c:draft-host::`) por ids reales tras guardar. */
export function translateDraftVehicleKeysToPersisted(patches, hostId) {
  const hid = String(hostId || '').trim();
  const hostSk = `p:${hid}`;
  return (patches || []).map(({ vehicleKey, patch }) => {
    let vk = String(vehicleKey || '').trim();
    vk = vk.replace(/^p:draft-host\b/, hostSk);
    vk = vk.replace(/^c:draft-host::/, `c:${hid}::`);
    return { vehicleKey: vk, patch };
  });
}

/** Parches listos tras crear participante (inventario + borrador del formulario). */
export function buildCarMetaPatchesAfterSave({
  hostPerson,
  companions,
  plan,
  draftMetaByVehicleKey,
  hostId,
}) {
  const hostSk = `p:${String(hostId || '').trim()}`;
  const inventory = buildBautizosFamilyCarInventory({
    hostPerson: { ...hostPerson, id: hostId },
    companions,
    plan,
    hostSourceKey: hostSk,
  });
  const patches = inventory.map((slot) => ({
    vehicleKey: slot.vehicleKey,
    patch: normalizeCarVehicleMeta({
      ...slot.meta,
      ...(draftMetaByVehicleKey?.[slot.vehicleKey] || {}),
      ownerSourceKey: slot.ownerSourceKey,
    }),
  }));
  const draftOnly = Object.entries(draftMetaByVehicleKey || {})
    .filter(([k]) => !inventory.some((s) => s.vehicleKey === k))
    .map(([vehicleKey, meta]) => ({ vehicleKey, patch: normalizeCarVehicleMeta(meta) }));
  return translateDraftVehicleKeysToPersisted([...patches, ...draftOnly], hostId);
}
