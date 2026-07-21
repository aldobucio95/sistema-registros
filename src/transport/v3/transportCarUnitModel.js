import { CAR_UNIT_META_FIELDS, makeCarUnitId } from './transportSchema.js';

export function normalizeCarUnitPlanEntry(raw, index = 0) {
  const id = String(raw?.id || '').trim() || makeCarUnitId();
  const capacity = Math.max(1, parseInt(raw?.capacity, 10) || 5);
  const label = String(raw?.label || '').trim() || `Carro ${index + 1}`;
  const locationKey = String(raw?.locationKey || '').trim();
  return { id, label, capacity, ...(locationKey ? { locationKey } : {}) };
}

export function normalizeCarUnitDoc(raw, vehicleId = '') {
  const id = String(raw?.id || vehicleId || '').trim() || makeCarUnitId();
  const passengerSourceKeys = Array.isArray(raw?.passengerSourceKeys)
    ? raw.passengerSourceKeys.map((k) => String(k || '').trim()).filter(Boolean)
    : [];
  const capacity = Math.max(1, parseInt(raw?.capacity, 10) || 5);
  const out = {
    id,
    eventId: String(raw?.eventId || '').trim(),
    label: String(raw?.label || '').trim(),
    capacity,
    locationKey: String(raw?.locationKey || '').trim(),
    brand: String(raw?.brand || '').trim(),
    model: String(raw?.model || '').trim(),
    color: String(raw?.color || '').trim(),
    plates: String(raw?.plates || '').trim(),
    maybeAbsent: raw?.maybeAbsent === true,
    pendingBrand: raw?.pendingBrand === true,
    pendingModel: raw?.pendingModel === true,
    pendingColor: raw?.pendingColor === true,
    pendingPlates: raw?.pendingPlates === true,
    pendingDriver: raw?.pendingDriver === true,
    pendingPassengers: raw?.pendingPassengers === true,
    driverSourceKey: String(raw?.driverSourceKey || '').trim(),
    passengerSourceKeys,
    migratedFromVehicleId: String(raw?.migratedFromVehicleId || '').trim(),
    legacyOwnerParticipantId: String(raw?.legacyOwnerParticipantId || '').trim(),
    updatedAt: Number(raw?.updatedAt) || Date.now(),
  };
  return out;
}

export function blankCarUnitDoc({ eventId, unitId, label, capacity = 5, locationKey = '' } = {}) {
  return normalizeCarUnitDoc({
    id: unitId || makeCarUnitId(),
    eventId,
    label: label || '',
    capacity,
    locationKey,
  });
}

export function carUnitDocNeedsAttention(doc, { requirePassengers = true } = {}) {
  const d = normalizeCarUnitDoc(doc);
  if (d.maybeAbsent) return false;
  if (d.pendingBrand || d.pendingModel || d.pendingColor || d.pendingPlates) return true;
  if (d.pendingDriver || (requirePassengers && d.pendingPassengers)) return true;
  if (!d.brand || !d.model || !d.color || !d.plates) return true;
  if (!d.driverSourceKey) return true;
  if (requirePassengers && !d.passengerSourceKeys.length) return true;
  return false;
}

export function buildCarUnitSummaryEntry(doc, { driverLabel = '', requirePassengers = true } = {}) {
  const d = normalizeCarUnitDoc(doc);
  const passengerCount = d.passengerSourceKeys.length + (d.driverSourceKey ? 1 : 0);
  return {
    brand: d.brand,
    model: d.model,
    color: d.color,
    plates: d.plates,
    driverLabel: String(driverLabel || '').trim(),
    driverSourceKey: d.driverSourceKey,
    passengerCount,
    capacity: d.capacity,
    label: d.label,
    maybeAbsent: d.maybeAbsent === true,
    needsAttention: carUnitDocNeedsAttention(d, { requirePassengers }),
    updatedAt: d.updatedAt || Date.now(),
  };
}

export function patchCarUnitDoc(existing, patch) {
  const base = normalizeCarUnitDoc(existing);
  const next = { ...base };
  if (!patch || typeof patch !== 'object') return next;
  for (const key of CAR_UNIT_META_FIELDS) {
    if (patch[key] === undefined) continue;
    if (key === 'passengerSourceKeys') {
      next.passengerSourceKeys = Array.isArray(patch.passengerSourceKeys)
        ? patch.passengerSourceKeys.map((k) => String(k || '').trim()).filter(Boolean)
        : [];
      continue;
    }
    if (typeof patch[key] === 'boolean') {
      next[key] = patch[key] === true;
      continue;
    }
    next[key] = String(patch[key] ?? '').trim();
  }
  if (patch.label !== undefined) next.label = String(patch.label || '').trim();
  if (patch.capacity !== undefined) next.capacity = Math.max(1, parseInt(patch.capacity, 10) || 5);
  if (patch.locationKey !== undefined) next.locationKey = String(patch.locationKey || '').trim();
  next.updatedAt = Date.now();
  return normalizeCarUnitDoc(next);
}

/** Sincroniza carAssign desde driver + pasajeros del doc. */
export function carAssignFromUnitDocs(docs) {
  const assign = {};
  for (const raw of docs || []) {
    const d = normalizeCarUnitDoc(raw);
    if (!d.id) continue;
    if (d.driverSourceKey) assign[d.driverSourceKey] = d.id;
    for (const sk of d.passengerSourceKeys) {
      if (sk) assign[sk] = d.id;
    }
  }
  return assign;
}
