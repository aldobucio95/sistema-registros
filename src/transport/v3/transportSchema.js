/** Versión del modelo de carros como unidades independientes. */
export const TRANSPORT_MODEL_VERSION_V3 = 3;

/** Prefijo de id de unidad de carro en el plan. */
export const CAR_UNIT_ID_PREFIX = 'cu-';

export const CAR_UNIT_META_FIELDS = [
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
];

/** Id estable de unidad de carro (`cu-<uuid>`). */
export function makeCarUnitId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${CAR_UNIT_ID_PREFIX}${crypto.randomUUID()}`;
  }
  return `${CAR_UNIT_ID_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isCarUnitId(id) {
  return String(id || '').trim().startsWith(CAR_UNIT_ID_PREFIX);
}

export function isTransportV3Plan(plan) {
  return Number(plan?.transportVersion) >= TRANSPORT_MODEL_VERSION_V3;
}
