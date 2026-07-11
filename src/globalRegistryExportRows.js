/**
 * Filas del Registro Global para exportación Excel (misma lógica que la UI).
 */
import { resolveParticipantEffectiveLocation, isCompanionWaitlistPhantomStoredParticipant } from './bautizosCompanionWaitlist.js';
import {
  buildGlobalRegistryPartySections,
  filterGlobalRegistryPartyRowsByParticipantFilters,
  partitionGlobalRegistryActivePartyRowsForExport,
  sortGlobalRegistryPartyRows,
  visibleBautizosActiveGlobalRegistryPartyRows,
} from './globalRegistryPartyRows.js';

const PARTICIPANT_STATUS_ARCHIVED = 'archived';
const PARTICIPANT_STATUS_CANCELLED = 'cancelled';

/**
 * @returns {object[]} personas en orden de visualización (titular → acompañantes)
 */
export function buildGlobalRegistryFilteredPartyPersons({
  event,
  allParticipants,
  visibleLocations,
  globalLocationFilters,
  activeByLocation,
  waitlistByLocation,
  cancelledByLocation,
  globalRegistryListFilters,
  filterParticipantRows,
  getSortedWaitlistForLocation,
  getDebt,
  isBautizos,
}) {
  const eventId = String(event?.id || '');
  const eventLocs = new Set((event?.locations || []).map((x) => String(x).trim()).filter(Boolean));
  const rosterForEvent = (allParticipants || []).filter((p) => String(p?.eventId || '') === eventId);
  const vis = (visibleLocations || []).map((l) => String(l).trim()).filter(Boolean);

  const isValidEventLocation = (p) => {
    const r = resolveParticipantEffectiveLocation(p, rosterForEvent);
    return r && eventLocs.has(r);
  };

  const sourceRows = rosterForEvent.filter((p) => {
    if (isCompanionWaitlistPhantomStoredParticipant(p)) return false;
    const status = p?.status || 'active';
    if (status === PARTICIPANT_STATUS_ARCHIVED) return false;
    if (!(status === 'active' || status === 'waitlist' || status === PARTICIPANT_STATUS_CANCELLED)) return false;
    const locRaw = resolveParticipantEffectiveLocation(p, rosterForEvent);
    const validLoc = locRaw && eventLocs.has(locRaw);
    if (validLoc && !vis.includes(locRaw)) return false;
    return true;
  });

  const validSource = sourceRows.filter((p) => isValidEventLocation(p));

  const locsInScope = (() => {
    const glf = Array.isArray(globalLocationFilters) ? globalLocationFilters : [];
    const base = glf.length > 0 ? glf.filter((loc) => vis.includes(loc)) : [...vis];
    return base.map((l) => String(l).trim()).filter(Boolean);
  })();

  const matchesGlobalRegistryPartyPerson = (person) =>
    filterParticipantRows([person], true, globalRegistryListFilters, {
      expandBautizosCompanions: false,
    }).length > 0;
  const filterPartyRows = (partyRows) =>
    filterGlobalRegistryPartyRowsByParticipantFilters(partyRows, matchesGlobalRegistryPartyPerson);

  const activosTitularsInScope = locsInScope.flatMap((loc) => activeByLocation[loc] || []);
  const waitlistInScope = locsInScope.flatMap((loc) => getSortedWaitlistForLocation(loc));
  const cancelledTitularsInScope = locsInScope.flatMap((loc) => cancelledByLocation[loc] || []);

  const grSortKey = String(globalRegistryListFilters?.sortBy || 'registered-desc').trim();
  const applyGlobalRegistryPartySort = (partyRows) =>
    sortGlobalRegistryPartyRows(partyRows, grSortKey, { getDebt });

  const partySections = buildGlobalRegistryPartySections({
    isBautizos,
    activeTitulars: activosTitularsInScope,
    waitlistRows: waitlistInScope,
    cancelledTitulars: cancelledTitularsInScope,
    rosterForPlan: validSource,
  });

  const activeFiltered = filterPartyRows(partySections.active);
  const activeCountable = isBautizos
    ? visibleBautizosActiveGlobalRegistryPartyRows(activeFiltered)
    : partitionGlobalRegistryActivePartyRowsForExport(activeFiltered).activeCountable;
  const { companionWaitlistUnderActive, companionCancelledUnderActive } =
    partitionGlobalRegistryActivePartyRowsForExport(activeFiltered);
  const waitlistForExport = [
    ...filterPartyRows(partySections.waitlist),
    ...companionWaitlistUnderActive,
  ];
  const cancelledForExport = [
    ...filterPartyRows(partySections.cancelled),
    ...companionCancelledUnderActive,
  ];

  const allPartyRows = [
    ...applyGlobalRegistryPartySort(activeCountable),
    ...applyGlobalRegistryPartySort(waitlistForExport),
    ...applyGlobalRegistryPartySort(cancelledForExport),
  ];

  return allPartyRows.map((row) => row.person);
}
