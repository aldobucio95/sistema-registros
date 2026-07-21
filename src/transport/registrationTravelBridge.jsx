/**
 * Bloque de transporte en registro: misma semántica que tab Transporte (carro propio).
 */
import React from 'react';
import { ensureCarUnitForPerson, TRAVEL_MODE, normalizeTravelMode } from './registrationTransportShared.js';
import { uiForm } from '../ui/uiFormatClasses.js';

export async function syncRegistrationTravelToTransportPlan({
  eventId,
  plan,
  setPlan,
  personSourceKey,
  personName,
  llegaEnCarro,
  travelMode,
}) {
  const mode = normalizeTravelMode(travelMode) || (llegaEnCarro ? TRAVEL_MODE.ownCar : TRAVEL_MODE.eventTransport);
  if (mode !== TRAVEL_MODE.ownCar) return { ok: true, skipped: true };
  return ensureCarUnitForPerson({
    eventId,
    plan,
    setPlan,
    personSourceKey,
    personName,
    asDriver: true,
  });
}

export function RegistrationTravelModeHint() {
  return (
    <p className={`${uiForm.help} text-[10px]`}>
      Si llega en carro propio, se usa la misma lógica de flota que en Transporte (conductor / pasajeros del padrón).
    </p>
  );
}
