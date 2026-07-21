/**
 * Capa compartida de transporte en registro ↔ tab Transporte (carro propio).
 * Reutiliza el modelo v3 sin divergir carAssign / carUnits.
 */
import {
  assignPersonToCarUnit,
  getCarUnits,
  getDefaultCarCapacity,
  normalizeTransportPlanning,
} from '../transportPlanningCore.js';
import {
  blankCarUnitDoc,
  buildCarUnitSummaryEntry,
  makeCarUnitId,
  normalizeCarUnitPlanEntry,
  saveCarUnitPatch,
} from './v3/index.js';

export const TRAVEL_MODE = {
  eventTransport: 'event_transport',
  ownCar: 'own_car',
};

export function normalizeTravelMode(raw) {
  const s = String(raw || '').trim();
  if (s === TRAVEL_MODE.ownCar || s === 'carro' || s === 'car' || s === 'Carro') return TRAVEL_MODE.ownCar;
  if (s === TRAVEL_MODE.eventTransport || s === 'camion' || s === 'bus' || s === 'Camión') {
    return TRAVEL_MODE.eventTransport;
  }
  return '';
}

/**
 * Asegura una unidad de carro y asigna a la persona como conductor (o pasajero si ya hay conductor).
 * Misma semántica que el drawer / board de Transporte.
 */
export async function ensureCarUnitForPerson({
  eventId,
  plan,
  setPlan,
  personSourceKey,
  personName = '',
  asDriver = true,
}) {
  const eid = String(eventId || '').trim();
  const sk = String(personSourceKey || '').trim();
  if (!eid || !sk) return { ok: false, error: 'Falta evento o persona.' };

  let unitId = '';
  let nextPlan = normalizeTransportPlanning(plan);

  const existingUnitId = String(nextPlan.carAssign?.[sk] || '').trim();
  if (existingUnitId) {
    unitId = existingUnitId;
  } else {
    unitId = makeCarUnitId();
    const cap = getDefaultCarCapacity(nextPlan);
    const entry = normalizeCarUnitPlanEntry({
      id: unitId,
      label: personName ? `Carro · ${personName}` : 'Carro',
      capacity: cap,
    });
    nextPlan = {
      ...nextPlan,
      carUnits: [...getCarUnits(nextPlan), entry],
      carAssign: { ...(nextPlan.carAssign || {}), [sk]: unitId },
    };
  }

  const blank = blankCarUnitDoc({
    eventId: eid,
    unitId,
    label: personName ? `Carro · ${personName}` : 'Carro',
    capacity: getDefaultCarCapacity(nextPlan),
  });
  const patch = asDriver
    ? { driverSourceKey: sk, pendingDriver: false }
    : {
        passengerSourceKeys: [sk],
        pendingPassengers: false,
      };

  const saved = await saveCarUnitPatch(eid, unitId, { ...blank, ...patch }, {
    driverLabel: asDriver ? personName : '',
  });

  if (saved) {
    nextPlan = {
      ...nextPlan,
      carAssign: assignPersonToCarUnit(nextPlan, sk, unitId).carAssign,
      carUnitSummaryById: {
        ...(nextPlan.carUnitSummaryById || {}),
        [unitId]: buildCarUnitSummaryEntry(saved, { driverLabel: asDriver ? personName : '' }),
      },
    };
  }

  if (typeof setPlan === 'function') setPlan(nextPlan);
  return { ok: true, unitId, plan: nextPlan };
}

export function assignExistingCarUnit(plan, personSourceKey, unitId) {
  return assignPersonToCarUnit(plan, personSourceKey, unitId);
}
