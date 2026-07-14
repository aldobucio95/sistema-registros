import {
  buildTransportPlanningLines,
  sortTransportLinesByRosterOrder,
} from '../../transportPlanningCore.js';

/** Líneas de transporte + grupos Bautizos (función pura; usable en Web Worker). */
export function computeTransportPlanningData({ roster, eventType, locations, eventLike }) {
  const built = buildTransportPlanningLines(roster, eventType, locations, eventLike);
  const busLines = sortTransportLinesByRosterOrder(built.busLines, roster);
  const carLines = sortTransportLinesByRosterOrder(built.carLines, roster);
  const bautizosCarDisplayGroups = [];
  return { busLines, carLines, bautizosCarDisplayGroups };
}

/** Campos mínimos del evento para serializar al worker. */
export function slimEventForTransportWorker(eventLike) {
  if (!eventLike || typeof eventLike !== 'object') return null;
  return {
    id: eventLike.id,
    eventType: eventLike.eventType,
    locations: eventLike.locations,
    transportPlanning: eventLike.transportPlanning,
    bautizosLapInfantMaxAge: eventLike.bautizosLapInfantMaxAge,
    bautizosLapInfantPolicy: eventLike.bautizosLapInfantPolicy,
  };
}
