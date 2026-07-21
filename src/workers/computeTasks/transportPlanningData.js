import {
  buildTransportPlanningLines,
  sortTransportLinesByRosterOrder,
} from '../../transportPlanningCore.js';

/** Líneas de transporte (función pura; usable en Web Worker).
 * Pool de carros sin asignar y carUnits se resuelven en el hilo principal
 * a partir de plan.carAssign / plan.carUnits (v3) — no hace falta en el worker.
 */
export function computeTransportPlanningData({ roster, eventType, locations, eventLike }) {
  const built = buildTransportPlanningLines(roster, eventType, locations, eventLike);
  const busLines = sortTransportLinesByRosterOrder(built.busLines, roster);
  const carLines = sortTransportLinesByRosterOrder(built.carLines, roster);
  const bautizosCarDisplayGroups = [];
  return { busLines, carLines, bautizosCarDisplayGroups };
}

/** Campos mínimos del evento para serializar al worker.
 * No incluir `transportPlanning`: cambia con cada auto-guardado de carros/resumen
 * y no afecta el cálculo de busLines/carLines (solo lap-infant en Bautizos).
 */
export function slimEventForTransportWorker(eventLike) {
  if (!eventLike || typeof eventLike !== 'object') return null;
  return {
    id: eventLike.id,
    eventType: eventLike.eventType,
    locations: eventLike.locations,
    bautizosLapInfantMaxAge: eventLike.bautizosLapInfantMaxAge,
    bautizosLapInfantPolicy: eventLike.bautizosLapInfantPolicy,
  };
}
