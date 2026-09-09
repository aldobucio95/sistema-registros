/**
 * Unidades de cupo del evento: misma noción que «Registros totales» del dashboard (deduplicación canónica en Bautizos).
 */

import {
  buildParticipantLikeForBautizosSplitSlot,
  buildSplitPartyCompanionsForSlot,
  getBautizosSplitPartySlotDescriptors,
  hasBautizosBaptizedCompanionInParty,
  normalizeBautizosAttendanceType,
  normalizeBautizosCompanionsForPersist,
} from './bautizosParty.js';
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
export function buildCapSimulationRows(entryPayload, eventRow, loc, vnpHelpers) {
  const eventId = String(eventRow?.id || '').trim();
  const eventType = String(eventRow?.eventType || '');
  const locKey = String(loc || '').trim();

  if (eventType !== 'Bautizos') {
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

  if (hasBautizosBaptizedCompanionInParty(entryPayload)) {
    const splitDesc = getBautizosSplitPartySlotDescriptors(entryPayload);
    const docIdBySlotKey = Object.fromEntries(
      splitDesc.map((d) => [d.slotKey, `__cap_${d.slotKey}__`])
    );
    return splitDesc.map((d) => {
      const pl = buildParticipantLikeForBautizosSplitSlot(entryPayload, locKey, d);
      const comps = buildSplitPartyCompanionsForSlot({
        personLike: entryPayload,
        loc: locKey,
        targetSlotKey: d.slotKey,
        docIdBySlotKey,
        vnpCompanionHelpers: vnpHelpers,
      });
      return {
        ...pl,
        id: docIdBySlotKey[d.slotKey],
        eventId,
        location: locKey,
        status: 'active',
        bautizosCompanions: comps,
      };
    });
  }

  const comps = normalizeBautizosCompanionsForPersist(entryPayload, locKey, vnpHelpers);
  return [
    {
      ...entryPayload,
      id: '__cap_sim_host__',
      eventId,
      location: locKey,
      status: 'active',
      bautizosCompanions: comps,
      bautizosAttendanceType: normalizeBautizosAttendanceType(entryPayload?.bautizosAttendanceType),
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

/**
 * True if adding `incomingUnits` would exceed the active cupo.
 * Global event cap takes precedence (same as alta / promote companion); otherwise per-sede cap.
 * A seat remaining is not enough when the incoming party consumes more than one unit
 * (Campa servidor Ambos ×2, Bautizos titular + companions).
 */
export function wouldIncomingUnitsExceedCap({
  globalCap,
  globalUsed,
  locCap,
  locUsed,
  incomingUnits,
}) {
  const units = Math.max(0, Number(incomingUnits) || 0);
  const gCap = Number(globalCap) || 0;
  if (gCap > 0) {
    return (Number(globalUsed) || 0) + units > gCap;
  }
  const lCap = Number(locCap) || 0;
  if (lCap > 0) {
    return (Number(locUsed) || 0) + units > lCap;
  }
  return false;
}
