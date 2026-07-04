import { normalizeCarVehicleMeta } from '../../bautizosCarMeta.js';
import {
  buildVehicleDocId,
  legacyVehicleKeyFromVehicleDoc,
  parseVehicleDocId,
  VEHICLE_META_FIELDS,
} from './transportSchema.js';

export function normalizeTransportVehicleDoc(raw, vehicleDocId = '') {
  const parsed = parseVehicleDocId(vehicleDocId || raw?.id || '');
  const m = normalizeCarVehicleMeta(raw);
  const ownerParticipantId = String(
    raw?.ownerParticipantId || parsed.ownerParticipantId || m.ownerSourceKey?.replace(/^p:/, '') || ''
  ).trim();
  const carIndex = Number(raw?.carIndex) || parsed.carIndex || 1;
  const ownerSourceKey = ownerParticipantId.startsWith('p:')
    ? ownerParticipantId
    : `p:${ownerParticipantId}`;

  const out = {
    id: String(raw?.id || buildVehicleDocId(ownerParticipantId, carIndex)).trim(),
    ownerParticipantId,
    ownerSourceKey,
    carIndex,
    eventId: String(raw?.eventId || '').trim(),
    brand: String(m.brand || '').trim(),
    model: String(m.model || '').trim(),
    color: String(m.color || '').trim(),
    plates: String(m.plates || '').trim(),
    maybeAbsent: m.maybeAbsent === true,
    pendingBrand: m.pendingBrand === true,
    pendingModel: m.pendingModel === true,
    pendingColor: m.pendingColor === true,
    pendingPlates: m.pendingPlates === true,
    pendingDriver: m.pendingDriver === true,
    pendingPassengers: m.pendingPassengers === true,
    driverSourceKey: String(m.driverSourceKey || '').trim(),
    passengerSourceKeys: Array.isArray(m.passengerSourceKeys)
      ? m.passengerSourceKeys.map((k) => String(k || '').trim()).filter(Boolean)
      : [],
    inheritsFromVehicleKey: String(m.inheritsFromVehicleKey || '').trim(),
    manualGroupId: String(raw?.manualGroupId || '').trim(),
    updatedAt: Number(raw?.updatedAt) || Date.now(),
  };
  return out;
}

export function transportVehicleToLegacyMeta(vehicle) {
  const v = normalizeTransportVehicleDoc(vehicle);
  const meta = {};
  for (const key of VEHICLE_META_FIELDS) {
    if (v[key] !== undefined) meta[key] = v[key];
  }
  meta.ownerSourceKey = v.ownerSourceKey;
  meta.vehicleKey = legacyVehicleKeyFromVehicleDoc(v.ownerParticipantId, v.carIndex);
  return normalizeCarVehicleMeta(meta);
}

export function legacyPatchToVehicleDoc({
  eventId,
  ownerParticipantId,
  carIndex,
  patch,
  vehicleDocId,
}) {
  const v = normalizeTransportVehicleDoc(
    {
      ...patch,
      id: vehicleDocId,
      eventId,
      ownerParticipantId,
      carIndex,
    },
    vehicleDocId
  );
  return {
    ...v,
    updatedAt: Date.now(),
  };
}

export function vehicleDocNeedsPersist(vehicleOrPatch) {
  const v = normalizeTransportVehicleDoc(vehicleOrPatch);
  if (v.maybeAbsent) return true;
  if (v.brand || v.model || v.color || v.plates) return true;
  if (v.driverSourceKey) return true;
  if (v.passengerSourceKeys?.length) return true;
  return false;
}
