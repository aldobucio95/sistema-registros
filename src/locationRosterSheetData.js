/**
 * Modelo memoizable para roster por sede (filtros, filas aplanadas, conteos canónicos).
 */
import {
  BAUTIZOS_ATTENDANCE,
  getBautizosCompanionsArray,
  isBautizosCompanionBaptized,
} from './bautizosParty.js';
import { getLocationRosterSectionCountsFromSummary } from './locationRosterTypeSummary.js';
import { createEmptyLocationRosterFilters } from './userListFiltersPrefs.js';

/** Filas activas aplanadas: titular + subregistros de acompañantes bautizados (Bautizos). */
export function buildFlattenedActiveRows(participants, { isBautizos = false } = {}) {
  const flattened = [];
  for (const person of participants || []) {
    flattened.push({ kind: 'main', person, key: String(person?.id || '') });
    if (!isBautizos) continue;
    const branchRows = getBautizosCompanionsArray(person).filter(
      (c) => String(c?.name || '').trim() && isBautizosCompanionBaptized(c)
    );
    for (let i = 0; i < branchRows.length; i++) {
      const c = branchRows[i] || {};
      const nm = String(c?.name || '').trim();
      if (!nm) continue;
      const branchId = `branch-${String(person.id)}-${String(c?.id || i)}`;
      flattened.push({
        kind: 'branch',
        parent: person,
        companion: c,
        key: branchId,
        branchPerson: {
          id: branchId,
          name: nm,
          location: person.location,
          relationship: String(c?.relationship || '').trim(),
          willBeBaptized: 'Si',
          bautizosAttendanceType: BAUTIZOS_ATTENDANCE.bautizado,
          status: 'active',
        },
      });
    }
  }
  return flattened;
}

function countNonBautizosSectionRows(activeParticipants, waitlistRows, cancelledRows, { isBautizos }) {
  return {
    active: buildFlattenedActiveRows(activeParticipants, { isBautizos }).length,
    waitlist: (waitlistRows || []).length,
    cancelled: (cancelledRows || []).length,
  };
}

/**
 * Conteos estables para chips (sin búsqueda). Bautizos usa resumen canónico.
 */
export function buildRosterSectionDisplayCounts({
  isBautizos,
  locationTypeSummary,
  activeParticipantsUnfiltered,
  waitlistUnfiltered,
  cancelledUnfiltered,
}) {
  if (isBautizos && locationTypeSummary) {
    return getLocationRosterSectionCountsFromSummary(locationTypeSummary);
  }
  return countNonBautizosSectionRows(
    activeParticipantsUnfiltered,
    waitlistUnfiltered,
    cancelledUnfiltered,
    { isBautizos }
  );
}

/** Cache de finanzas por persona para filas colapsadas del roster por sede. */
export function buildLocationRosterFinanceByPersonId(persons, getLiquidationTarget) {
  const map = new Map();
  for (const person of persons || []) {
    const id = String(person?.id || '').trim();
    if (!id) continue;
    map.set(id, {
      liquidationTarget: getLiquidationTarget(person),
      paid: parseFloat(person?.paid || 0),
      paymentHistoryLen: Array.isArray(person?.paymentHistory) ? person.paymentHistory.length : 0,
    });
  }
  return map;
}

export function computeLocationRosterSheetModel({
  loc,
  isBautizos = false,
  locationTypeSummary = null,
  activeTitulars = [],
  sortedWaitlist = [],
  sortedCancelled = [],
  applyRosterLikeFilters,
  appliedSearch = '',
  sortBy = 'registered-desc',
  filterParticipantRows,
}) {
  const locKey = String(loc || '').trim();
  if (!locKey) return null;

  const sortPreservesWaitlistBaseDateOrder = sortBy === 'registered-asc' || sortBy === 'none';
  const search = String(appliedSearch || '').trim();

  const activeParticipantsUnfiltered = applyRosterLikeFilters(activeTitulars, false, '');
  const waitlistUnfiltered = applyRosterLikeFilters(
    sortedWaitlist,
    sortPreservesWaitlistBaseDateOrder,
    ''
  );
  const cancelledUnfiltered = applyRosterLikeFilters(
    sortedCancelled,
    sortPreservesWaitlistBaseDateOrder,
    ''
  );

  const visibleParticipants = applyRosterLikeFilters(activeTitulars, false, appliedSearch);
  const waitlistFilteredForLoc = applyRosterLikeFilters(
    sortedWaitlist,
    sortPreservesWaitlistBaseDateOrder,
    appliedSearch
  );
  const cancelledFilteredForLoc = applyRosterLikeFilters(
    sortedCancelled,
    sortPreservesWaitlistBaseDateOrder,
    appliedSearch
  );

  const flattenedActiveRowsForLoc = buildFlattenedActiveRows(visibleParticipants, { isBautizos });
  const flattenedActiveUnfiltered = buildFlattenedActiveRows(activeParticipantsUnfiltered, {
    isBautizos,
  });

  const visibleBautizedCompanionCount = isBautizos
    ? visibleParticipants.reduce(
        (sum, p) =>
          sum +
          getBautizosCompanionsArray(p).filter(
            (c) => String(c?.name || '').trim() && isBautizosCompanionBaptized(c)
          ).length,
        0
      )
    : 0;

  const rosterSectionDisplayCounts = buildRosterSectionDisplayCounts({
    isBautizos,
    locationTypeSummary,
    activeParticipantsUnfiltered,
    waitlistUnfiltered,
    cancelledUnfiltered,
  });

  const rosterSectionFilteredCounts = {
    active: flattenedActiveRowsForLoc.length,
    waitlist: waitlistFilteredForLoc.length,
    cancelled: cancelledFilteredForLoc.length,
  };

  const rosterFilterCountBaseAllStatuses = [
    ...activeTitulars,
    ...sortedWaitlist,
    ...sortedCancelled,
  ];

  const rosterRegStatusFilterCount = (value) =>
    filterParticipantRows(rosterFilterCountBaseAllStatuses, true, {
      ...createEmptyLocationRosterFilters(),
      filterRegistrationStatus: value,
    }).length;

  const rosterEventAttendanceFilterCount = (value) =>
    filterParticipantRows(rosterFilterCountBaseAllStatuses, true, {
      ...createEmptyLocationRosterFilters(),
      filterEventAttendance: value,
    }).length;

  const rosterSearchMatchCount =
    visibleParticipants.length +
    visibleBautizedCompanionCount +
    waitlistFilteredForLoc.length +
    cancelledFilteredForLoc.length;

  return {
    loc: locKey,
    visibleParticipants,
    visibleBautizedCompanionCount,
    waitlistFilteredForLoc,
    cancelledFilteredForLoc,
    flattenedActiveRowsForLoc,
    flattenedActiveUnfiltered,
    rosterSectionDisplayCounts,
    rosterSectionFilteredCounts,
    rosterSearchMatchCount,
    rosterRegStatusFilterCount,
    rosterEventAttendanceFilterCount,
    rosterSearchActive: search.length > 0,
    sortPreservesWaitlistBaseDateOrder,
    locationTypeSummary,
  };
}
