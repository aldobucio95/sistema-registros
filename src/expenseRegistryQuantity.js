import { countBautizosEventWideFilteredPeople } from './bautizosDashboardLocationStats.js';
import {
  isCompanionWaitlistPhantomStoredParticipant,
  resolveParticipantEffectiveLocation,
} from './bautizosCompanionWaitlist.js';
import { ROSTER_EXTRA_FILTER_DEFAULTS } from './rosterParticipantFilters.js';
import { countActiveDropdownListFilters, migrateLegacyRosterRoleFilter } from './userListFiltersPrefs.js';

export const EXPENSE_QUANTITY_MODE_MANUAL = 'manual';
export const EXPENSE_QUANTITY_MODE_REGISTRY = 'registry';

/** Caché en memoria para conteos de cantidad dinámica (evita O(n)×opciones por render). */
export function createExpenseRegistryCountCache(maxSize = 512) {
  const map = new Map();
  return {
    get(key, compute) {
      if (map.has(key)) return map.get(key);
      const value = compute();
      map.set(key, value);
      if (map.size > maxSize) map.clear();
      return value;
    },
    clear() {
      map.clear();
    },
  };
}

export function buildExpenseRegistryCountCacheKey({
  eventId,
  participantCount,
  filters,
  registryQuantityLocations,
  filterKey,
  optionValue,
  scope = 'option',
}) {
  return JSON.stringify({
    scope,
    eventId: String(eventId || ''),
    participantCount: Number(participantCount) || 0,
    filters: mergeExpenseRegistryQuantityFilters(filters),
    locs: Array.isArray(registryQuantityLocations) ? [...registryQuantityLocations].sort() : [],
    filterKey: String(filterKey || ''),
    optionValue: String(optionValue ?? ''),
  });
}

const PARTICIPANT_STATUS_ARCHIVED = 'archived';
const PARTICIPANT_STATUS_CANCELLED = 'cancelled';

/** Misma forma que filtros de Registro Global (sin búsqueda ni orden). */
export function createEmptyExpenseRegistryQuantityFilters() {
  return {
    filterWhatsAppPending: 'all',
    filterLiquidation: 'all',
    filterFirstTimeId: 'all',
    filterPendingRefund: 'all',
    filterResponsiva: 'all',
    filterGender: 'all',
    filterTransport: 'all',
    filterPaymentType: 'all',
    filterTravelFrom: 'all',
    filterTravelTo: 'all',
    filterRosterRole: 'all',
    filterAssignment: 'all',
    filterSwim: 'all',
    filterBaptism: 'all',
    filterMaritalStatus: 'all',
    filterScholarship: 'all',
    filterMedical: 'all',
    filterRegistrationStatus: 'all',
    filterEventAttendance: 'all',
    ...ROSTER_EXTRA_FILTER_DEFAULTS,
  };
}

export function mergeExpenseRegistryQuantityFilters(saved) {
  const empty = createEmptyExpenseRegistryQuantityFilters();
  if (!saved || typeof saved !== 'object') return empty;
  const out = { ...empty };
  for (const key of Object.keys(empty)) {
    if (typeof saved[key] === 'string') out[key] = saved[key];
  }
  out.filterRosterRole = migrateLegacyRosterRoleFilter(saved);
  return out;
}

export function countActiveExpenseRegistryQuantityCriteria(filters, locationFilters, eventType) {
  let n = countActiveDropdownListFilters(filters, eventType);
  if (Array.isArray(locationFilters) && locationFilters.length > 0) n += 1;
  return n;
}

/** Pool de participantes válidos del evento (activos, espera, cancelados) en sedes visibles. */
export function buildExpenseRegistryParticipantPool({
  event,
  allParticipants,
  visibleLocations,
  registryQuantityLocations = [],
}) {
  const eventId = String(event?.id || '');
  if (!eventId) return [];
  const eventLocs = new Set((event?.locations || []).map((x) => String(x).trim()).filter(Boolean));
  const vis = Array.isArray(visibleLocations) ? visibleLocations : [];
  const rosterForEvent = (allParticipants || []).filter((p) => String(p?.eventId || '') === eventId);

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

  const validSource = sourceRows.filter((p) => {
    const r = resolveParticipantEffectiveLocation(p, rosterForEvent);
    return r && eventLocs.has(r);
  });

  const locsInScope =
    Array.isArray(registryQuantityLocations) && registryQuantityLocations.length > 0
      ? registryQuantityLocations.filter((loc) => vis.includes(loc))
      : [...vis];
  const locSet = new Set(locsInScope.map((l) => String(l).trim()).filter(Boolean));
  if (locSet.size === 0) return [];

  return validSource.filter((p) => {
    const loc = resolveParticipantEffectiveLocation(p, rosterForEvent);
    return loc && locSet.has(loc);
  });
}

export function countExpenseRegistryQuantityMatches(pool, filters, filterParticipantRows, bautizosCtx = null) {
  const merged = mergeExpenseRegistryQuantityFilters(filters);
  return countExpenseRegistryQuantityMatchesCore(merged, pool, filterParticipantRows, bautizosCtx);
}

function countExpenseRegistryQuantityMatchesCore(merged, pool, filterParticipantRows, bautizosCtx) {
  if (
    bautizosCtx?.eventType === 'Bautizos' &&
    bautizosCtx.data &&
    typeof filterParticipantRows === 'function'
  ) {
    const locations =
      Array.isArray(bautizosCtx.registryQuantityLocations) && bautizosCtx.registryQuantityLocations.length > 0
        ? bautizosCtx.registryQuantityLocations
        : null;
    return countBautizosEventWideFilteredPeople({
      dashboardLocs: bautizosCtx.dashboardLocs || [],
      data: bautizosCtx.data,
      waitlistData: bautizosCtx.waitlistData || {},
      cancelledData: bautizosCtx.cancelledData || {},
      filters: merged,
      filterParticipantRowsFn: filterParticipantRows,
      canonicalCompanionPlan: bautizosCtx.canonicalCompanionPlan || null,
      event: bautizosCtx.event,
      dashboardScope: bautizosCtx.dashboardScope || 'all',
      locationFilter: locations,
      allParticipants: bautizosCtx.allParticipants,
    });
  }
  if (!Array.isArray(pool) || pool.length === 0) return 0;
  if (typeof filterParticipantRows !== 'function') return 0;
  return filterParticipantRows(pool, true, merged, { expandBautizosCompanions: true }).length;
}

export function resolveExpenseRowAmounts(expense, ctx) {
  const unitPrice = parseFloat(expense?.unitPrice) || 0;
  const mode =
    expense?.quantityMode === EXPENSE_QUANTITY_MODE_REGISTRY
      ? EXPENSE_QUANTITY_MODE_REGISTRY
      : EXPENSE_QUANTITY_MODE_MANUAL;

  if (mode === EXPENSE_QUANTITY_MODE_MANUAL) {
    const quantity = Math.max(0, parseInt(expense?.quantity, 10) || 0);
    return {
      quantity,
      totalPrice: quantity * unitPrice,
      unitPrice,
      quantityMode: mode,
      isDynamic: false,
    };
  }

  const filters = mergeExpenseRegistryQuantityFilters(expense?.registryQuantityFilters);
  const locations = Array.isArray(expense?.registryQuantityLocations)
    ? expense.registryQuantityLocations
    : [];
  const pool = buildExpenseRegistryParticipantPool({
    event: ctx?.event,
    allParticipants: ctx?.allParticipants,
    visibleLocations: ctx?.visibleLocations,
    registryQuantityLocations: locations,
  });
  const quantity = countExpenseRegistryQuantityMatches(pool, filters, ctx?.filterParticipantRows, {
    eventType: ctx?.event?.eventType,
    event: ctx?.event,
    allParticipants: ctx?.allParticipants,
    dashboardLocs: ctx?.visibleLocations,
    data: ctx?.bautizosDataByLocation,
    waitlistData: ctx?.bautizosWaitlistByLocation,
    cancelledData: ctx?.bautizosCancelledByLocation,
    canonicalCompanionPlan: ctx?.bautizosCanonicalCompanionPlan,
    dashboardScope: ctx?.bautizosDashboardScope,
    registryQuantityLocations: locations,
  });
  return {
    quantity,
    totalPrice: quantity * unitPrice,
    unitPrice,
    quantityMode: mode,
    isDynamic: true,
  };
}

/** Aplica cantidad/total dinámicos y recalcula estado de pago según el total actual. */
export function applyResolvedExpenseAmounts(expense, ctx) {
  const resolved = resolveExpenseRowAmounts(expense, ctx);
  const paidAmount = Math.min(parseFloat(expense?.paidAmount) || 0, resolved.totalPrice);
  const paid = resolved.totalPrice > 0 && paidAmount >= resolved.totalPrice - 0.005;
  return {
    ...expense,
    quantity: resolved.quantity,
    totalPrice: resolved.totalPrice,
    unitPrice: resolved.unitPrice,
    quantityMode: resolved.quantityMode,
    isDynamic: resolved.isDynamic,
    paidAmount,
    paid,
  };
}
