/** Versión del modelo de transporte persistido en Firestore. */
export const TRANSPORT_MODEL_VERSION = 2;

export const TRANSPORT_VEHICLES_SUBCOL = 'transport_vehicles';

export const VEHICLE_META_FIELDS = [
  'brand',
  'model',
  'color',
  'plates',
  'maybeAbsent',
  'pendingBrand',
  'pendingModel',
  'pendingColor',
  'pendingPlates',
  'pendingDriver',
  'pendingPassengers',
  'driverSourceKey',
  'passengerSourceKeys',
  'ownerSourceKey',
  'inheritsFromVehicleKey',
];

/** Id estable: ownerParticipantId + índice de carro. */
export function buildVehicleDocId(ownerParticipantId, carIndex = 1) {
  const owner = String(ownerParticipantId || '').trim();
  const idx = Math.max(1, parseInt(carIndex, 10) || 1);
  if (!owner) return '';
  return `${owner}__c${idx}`;
}

export function parseVehicleDocId(vehicleDocId) {
  const s = String(vehicleDocId || '').trim();
  const m = /^(.+)__c(\d+)$/.exec(s);
  if (!m) return { ownerParticipantId: s, carIndex: 1 };
  return { ownerParticipantId: m[1], carIndex: parseInt(m[2], 10) || 1 };
}

/** Clave legacy `p:id|cN` para compatibilidad con UI v1. */
export function legacyVehicleKeyFromVehicleDoc(ownerParticipantId, carIndex) {
  const owner = String(ownerParticipantId || '').trim();
  if (!owner) return '';
  const sk = owner.startsWith('p:') ? owner : `p:${owner}`;
  return `${sk}|c${Math.max(1, parseInt(carIndex, 10) || 1)}`;
}

export function vehicleDocIdFromLegacyKey(legacyKey) {
  const s = String(legacyKey || '').trim();
  const pipeIdx = s.lastIndexOf('|c');
  if (pipeIdx <= 0) {
    const owner = s.startsWith('p:') ? s.slice(2) : s;
    return buildVehicleDocId(owner, 1);
  }
  const ownerSk = s.slice(0, pipeIdx);
  const carIndex = parseInt(s.slice(pipeIdx + 2), 10) || 1;
  const owner = ownerSk.startsWith('p:') ? ownerSk.slice(2) : ownerSk;
  return buildVehicleDocId(owner, carIndex);
}
