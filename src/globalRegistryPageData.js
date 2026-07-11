/**
 * Cálculo memoizable de filas para Registro Global (evita reconstruir ~800 filas en cada render de App).
 */
import { isCompanionWaitlistPhantomStoredParticipant } from './bautizosCompanionWaitlist.js';
import {
  buildGlobalRegistryPartySections,
  countBautizosGlobalRegistryActivePartyRows,
  countGlobalRegistryCoincidenceTotal,
  filterGlobalRegistryPartyRowsByParticipantFilters,
  globalRegistryPartyRowsToPersons,
  sortGlobalRegistryPartyRows,
  visibleBautizosActiveGlobalRegistryPartyRows,
} from './globalRegistryPartyRows.js';
/**
 * @returns {null | {
 *   rosterForEvent,
 *   validSource,
 *   activeRowsVisible,
 *   waitlistRows,
 *   cancelledRows,
 *   validSourceExpanded,
 *   invalidFiltered,
 *   coincidenceTotal,
 *   globalRegistryActiveCount,
 * }}
 */
export function computeGlobalRegistryPageModel({
  currentEvent,
  allParticipants,
  visibleLocations,
  globalLocationFilters,
  globalRegistryListFilters,
  data,
  cancelledData,
  getSortedWaitlistForLocation,
  filterParticipantRows,
  resolveParticipantEffectiveLocation,
  isBautizos,
  getDebt,
}) {
  const eventId = String(currentEvent?.id || '').trim();
  if (!eventId) return null;

  const eventLocs = new Set((currentEvent?.locations || []).map((x) => String(x).trim()).filter(Boolean));
  const rosterForEvent = (allParticipants || []).filter(
    (p) => String(p?.eventId || '') === eventId
  );

  const isValidEventLocation = (p) => {
    const r = resolveParticipantEffectiveLocation(p, rosterForEvent);
    return r && eventLocs.has(r);
  };

  const sourceRows = rosterForEvent.filter((p) => {
    if (isCompanionWaitlistPhantomStoredParticipant(p)) return false;
    const status = p?.status || 'active';
    if (status === 'archived') return false;
    if (!(status === 'active' || status === 'waitlist' || status === 'cancelled')) {
      return false;
    }
    const locRaw = resolveParticipantEffectiveLocation(p, rosterForEvent);
    const validLoc = locRaw && eventLocs.has(locRaw);
    if (validLoc && !visibleLocations.includes(locRaw)) return false;
    return true;
  });

  const invalidSource = sourceRows.filter((p) => !isValidEventLocation(p));
  const validSource = sourceRows.filter((p) => isValidEventLocation(p));

  const locsInScope = (() => {
    const base =
      globalLocationFilters.length > 0
        ? globalLocationFilters.filter((loc) => visibleLocations.includes(loc))
        : [...visibleLocations];
    return base.map((l) => String(l).trim()).filter(Boolean);
  })();

  const activosTitularsInScope = locsInScope.flatMap((loc) => data[loc] || []);
  const grSortKey = String(globalRegistryListFilters.sortBy || 'registered-desc').trim();

  const filterGlobalRegistrySectionRows = (rows, preserveOrder = false) =>
    filterParticipantRows(rows, preserveOrder, globalRegistryListFilters, {
      expandBautizosCompanions: false,
    });

  const matchesGlobalRegistryPartyPerson = (person) =>
    filterParticipantRows([person], true, globalRegistryListFilters, {
      expandBautizosCompanions: false,
    }).length > 0;

  const filterGlobalRegistryPartyRows = (partyRows) =>
    filterGlobalRegistryPartyRowsByParticipantFilters(partyRows, matchesGlobalRegistryPartyPerson);

  const waitlistInScope = locsInScope.flatMap((loc) => getSortedWaitlistForLocation(loc));
  const cancelledTitularsInScope = locsInScope.flatMap((loc) => cancelledData[loc] || []);

  const applyGlobalRegistryPartySort = (partyRows) =>
    sortGlobalRegistryPartyRows(partyRows, grSortKey, { getDebt });

  const partySectionsRaw = buildGlobalRegistryPartySections({
    isBautizos,
    activeTitulars: activosTitularsInScope,
    waitlistRows: waitlistInScope,
    cancelledTitulars: cancelledTitularsInScope,
    rosterForPlan: validSource,
  });

  const activeRowsFiltered = filterGlobalRegistryPartyRows(partySectionsRaw.active);
  const activeRowsVisible = applyGlobalRegistryPartySort(
    isBautizos ? visibleBautizosActiveGlobalRegistryPartyRows(activeRowsFiltered) : activeRowsFiltered
  );
  const waitlistRows = applyGlobalRegistryPartySort(filterGlobalRegistryPartyRows(partySectionsRaw.waitlist));
  const cancelledRows = applyGlobalRegistryPartySort(filterGlobalRegistryPartyRows(partySectionsRaw.cancelled));

  const globalRegistryActiveCount = isBautizos
    ? countBautizosGlobalRegistryActivePartyRows(activeRowsVisible)
    : activeRowsVisible.length;

  const validSourceExpanded = [
    ...globalRegistryPartyRowsToPersons(partySectionsRaw.active),
    ...globalRegistryPartyRowsToPersons(partySectionsRaw.waitlist),
    ...globalRegistryPartyRowsToPersons(partySectionsRaw.cancelled),
  ];

  const invalidFiltered = filterGlobalRegistrySectionRows(invalidSource);
  const coincidenceTotal = countGlobalRegistryCoincidenceTotal({
    isBautizos,
    activeRows: activeRowsVisible,
    waitlistRows,
    cancelledRows,
    invalidCount: invalidFiltered.length,
    filterRegistrationStatus: globalRegistryListFilters.filterRegistrationStatus,
  });

  return {
    rosterForEvent,
    validSource,
    activeRowsVisible,
    waitlistRows,
    cancelledRows,
    validSourceExpanded,
    invalidFiltered,
    coincidenceTotal,
    globalRegistryActiveCount,
  };
}
