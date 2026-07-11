import {
  buildBautizosCarDisplayGroups,
  buildTransportPlanningLines,
  sortTransportLinesByRosterOrder,
} from '../../transportPlanningCore.js';

/** Líneas de transporte + grupos Bautizos (función pura; usable en Web Worker). */
export function computeTransportPlanningData({ roster, eventType, locations, eventLike }) {
  const built = buildTransportPlanningLines(roster, eventType, locations, eventLike);
  const busLines = sortTransportLinesByRosterOrder(built.busLines, roster);
  const carLines = sortTransportLinesByRosterOrder(built.carLines, roster);
  const isBautizos = String(eventType || '').trim() === 'Bautizos';
  const bautizosCarDisplayGroups = isBautizos ? buildBautizosCarDisplayGroups(roster, carLines) : [];
  return { busLines, carLines, bautizosCarDisplayGroups };
}

/** Campos mínimos del evento para serializar al worker (sin transportPlanning: no afecta líneas bus/carro). */
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
