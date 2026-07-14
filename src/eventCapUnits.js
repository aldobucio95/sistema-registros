/**
 * Unidades de cupo del evento: misma noción que «Registros totales» del dashboard.
 */

import {
  computeDashboardTodosRosterTotal,
  filterEventCapRosterBase,
  computeEventCapUsedUnitsBySede,
} from './dashboardTodosRosterTotal.js';

export { filterEventCapRosterBase, computeEventCapUsedUnitsBySede };

export function computeEventCapUsedUnits(participantRows, eventRow) {
  return computeDashboardTodosRosterTotal(participantRows, eventRow);
}

export function computeEventCapUnitsDelta(beforeRows, afterRows, eventRow) {
  const before = computeEventCapUsedUnits(beforeRows, eventRow);
  const after = computeEventCapUsedUnits(afterRows, eventRow);
  return Math.max(0, after - before);
}

/**
 * Filas simuladas (status activo) para calcular cuántas unidades añadiría un registro nuevo o una promoción.
 */
export function buildCapSimulationRows(entryPayload, eventRow, loc, _vnpHelpers) {
  const eventId = String(eventRow?.id || '').trim();
  const locKey = String(loc || '').trim();

  return [
    {
      ...entryPayload,
      id: '__cap_sim__',
      eventId,
      location: locKey,
      status: 'active',
    },
  ];
}

/** Unidades que consumiría añadir `simulationRows` al roster activo actual. */
export function computeIncomingRegistrationCapUnits(simulationRows, participantRows, eventRow) {
  const base = filterEventCapRosterBase(participantRows, eventRow);
  const after = [...base, ...(simulationRows || [])];
  return computeEventCapUnitsDelta(base, after, eventRow);
}

/** Unidades que consumiría promover un registro de lista de espera a activo. */
export function computePromoteFromWaitlistCapUnits(personRow, participantRows, eventRow, loc) {
  const base = filterEventCapRosterBase(participantRows, eventRow);
  const promoted = {
    ...personRow,
    status: 'active',
    location: String(loc || personRow?.location || '').trim(),
  };
  return computeEventCapUnitsDelta(base, [...base, promoted], eventRow);
}
