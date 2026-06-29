/** Pestañas del evento que no son una sede con listas Activos / Espera / Cancelados. */
export const EVENT_NAV_TABS_WITHOUT_LOCATION = new Set([
  'Summary',
  'Bautizados',
  'ServersPage',
  'ExpenseList',
  'CashCut',
  'Becados',
  'BautizosCompanions',
  'Responsivas',
  'RegistroGlobal',
  'TransportPlanning',
]);

export function isLocationRosterTab(activeTab) {
  const t = String(activeTab || '').trim();
  return t.length > 0 && !EVENT_NAV_TABS_WITHOUT_LOCATION.has(t);
}

import {
  ROSTER_EXTRA_FILTER_DEFAULTS,
  BAUTIZOS_DROPDOWN_FILTER_COUNT_KEYS,
} from './rosterParticipantFilters.js';

/** Filtros de lista por sede (misma forma que el estado en App.jsx). */
export function createEmptyLocationRosterFilters() {
  return {
    searchTerm: '',
    sortBy: 'registered-desc',
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
    filterPaymentMethod: { efectivo: true, tarjeta: true },
    ...ROSTER_EXTRA_FILTER_DEFAULTS,
  };
}

export function locationPrefsKey(locationName) {
  return encodeURIComponent(String(locationName || '').trim() || '_');
}

export function mergeLocationRosterFilters(saved) {
  const empty = createEmptyLocationRosterFilters();
  if (!saved || typeof saved !== 'object') return empty;
  const out = { ...empty };
  for (const key of Object.keys(empty)) {
    if (key === 'filterPaymentMethod') {
      const pm = saved.filterPaymentMethod;
      if (pm && typeof pm === 'object' && typeof pm.efectivo === 'boolean' && typeof pm.tarjeta === 'boolean') {
        out.filterPaymentMethod = { efectivo: pm.efectivo, tarjeta: pm.tarjeta };
      }
      continue;
    }
    if (typeof saved[key] === 'string') out[key] = saved[key];
  }
  if (out.sortBy === 'none') out.sortBy = 'registered-asc';
  if (typeof saved.filterRosterRole === 'string' && saved.filterRosterRole !== 'all') {
    out.filterRosterRole = saved.filterRosterRole;
  } else if (saved.filterServer || saved.filterAttendanceSpecial) {
    out.filterRosterRole = migrateLegacyRosterRoleFilter(saved);
  }
  return out;
}

/** Filtros de lista listos para aplicar: rellena defaults y anula filtros de Campa en eventos Bautizos. */
export function listFiltersForEventApplication(saved, eventType) {
  const merged = mergeLocationRosterFilters(saved);
  if (String(eventType || '').trim() !== 'Bautizos') return merged;
  return {
    ...merged,
    filterRosterRole: 'all',
    filterAssignment: 'all',
    filterBaptism: 'all',
    filterScholarship: 'all',
    filterMaritalStatus: 'all',
    filterPaymentType: 'all',
    filterTravelFrom: 'all',
    filterTravelTo: 'all',
    filterSwim: 'all',
    filterMedical: 'all',
    filterGender: 'all',
    filterBloodType: 'all',
    filterBautizosFood: 'all',
    filterBautizosTransport: 'all',
    filterBautizosCompanions: 'all',
    filterDiscountCampaign: 'all',
    filterCustomFieldKey: 'all',
    filterCustomFieldPresence: 'all',
  };
}

const CAMP_DROPDOWN_FILTER_COUNT_KEYS = [
  'filterRegistrationStatus',
  'filterAssignment',
  'filterRosterRole',
  'filterScholarship',
  'filterBaptism',
  'filterMaritalStatus',
  'filterPaymentType',
  'filterTransport',
  'filterLiquidation',
  'filterWhatsAppPending',
  'filterFirstTimeId',
  'filterPendingRefund',
  'filterResponsiva',
  'filterPersonOfInterest',
  'filterGender',
  'filterMedical',
  'filterSwim',
  'filterTravelFrom',
  'filterTravelTo',
];

/** Badge de filtros activos: solo claves visibles para el tipo de evento. */
export function countActiveDropdownListFilters(saved, eventType) {
  const defaults = mergeLocationRosterFilters(null);
  const merged = mergeLocationRosterFilters(saved);
  const et = String(eventType || '').trim();
  const keys =
    et === 'Bautizos'
      ? BAUTIZOS_DROPDOWN_FILTER_COUNT_KEYS
      : et === 'Campa'
        ? CAMP_DROPDOWN_FILTER_COUNT_KEYS
        : [
            'filterRegistrationStatus',
            'filterRosterRole',
            'filterLiquidation',
            'filterWhatsAppPending',
            'filterFirstTimeId',
            'filterPendingRefund',
            'filterResponsiva',
            'filterPersonOfInterest',
          ];
  let n = 0;
  for (const key of keys) {
    if (merged[key] !== defaults[key]) n += 1;
  }
  return n;
}

/** Migra filterServer + filterAttendanceSpecial guardados antes del filtro unificado. */
export function migrateLegacyRosterRoleFilter(saved) {
  if (!saved || typeof saved !== 'object') return 'all';
  if (typeof saved.filterRosterRole === 'string' && saved.filterRosterRole !== 'all') return saved.filterRosterRole;
  const att = saved.filterAttendanceSpecial;
  const srv = saved.filterServer;
  if (att === 'empleado') return 'empleado';
  if (att === 'cortesia') return 'cortesia';
  if (att === 'ninguno' && srv === 'No') return 'camperos';
  if (srv === 'Teens') return 'servidor-teens';
  if (srv === 'Jóvenes') return 'servidor-jovenes';
  if (srv === 'Ambos') return 'servidor-ambos';
  if (srv === 'Si' || srv === 'S\u00ed') return 'servidor';
  return 'all';
}

export function createEmptyListFiltersPrefsRoot() {
  return { v: 1, events: {}, transportUi: createEmptyTransportUiPrefs() };
}

export function createEmptyTransportUiPrefs() {
  return {
    /** Sección «Personas por carro» (tarjetas familiares Bautizos). */
    bautizosCarCardsOpen: false,
    /** Bloque «Detalle fila a fila». */
    rowByRowOpen: false,
    /** Sección «Carros compartidos (grupos manuales)». */
    manualCarGroupsOpen: true,
    /** Claves de filas con datos de carro expandidos en detalle fila a fila. */
    expandedCarDetailKeys: [],
  };
}

export function normalizeTransportUiPrefs(raw) {
  const empty = createEmptyTransportUiPrefs();
  if (!raw || typeof raw !== 'object') return empty;
  const expandedCarDetailKeys = Array.isArray(raw.expandedCarDetailKeys)
    ? raw.expandedCarDetailKeys
        .filter((x) => typeof x === 'string' && String(x).trim())
        .map((x) => String(x).trim())
    : [];
  return {
    bautizosCarCardsOpen: raw.bautizosCarCardsOpen === true,
    rowByRowOpen: raw.rowByRowOpen === true,
    manualCarGroupsOpen: raw.manualCarGroupsOpen !== false,
    expandedCarDetailKeys,
  };
}

export function readTransportUiFromPrefs(root) {
  return normalizeTransportUiPrefs(root?.transportUi);
}

export function writeTransportUiToPrefs(root, snapshot) {
  const next = normalizeListFiltersPrefsRoot(root);
  next.transportUi = normalizeTransportUiPrefs(snapshot);
  return next;
}

export function normalizeListFiltersPrefsRoot(raw) {
  if (!raw || typeof raw !== 'object') return createEmptyListFiltersPrefsRoot();
  const events = raw.events && typeof raw.events === 'object' && !Array.isArray(raw.events) ? raw.events : {};
  return {
    v: 1,
    events: { ...events },
    transportUi: normalizeTransportUiPrefs(raw.transportUi),
  };
}

export function readLocationFiltersFromPrefs(root, eventId, locationName) {
  const ev = root?.events?.[String(eventId)];
  if (!ev?.locations || typeof ev.locations !== 'object') return null;
  const snap = ev.locations[locationPrefsKey(locationName)];
  return snap ? mergeLocationRosterFilters(snap) : null;
}

export function writeLocationFiltersToPrefs(root, eventId, locationName, snapshot) {
  const next = normalizeListFiltersPrefsRoot(root);
  const eid = String(eventId);
  const ev = next.events[eid] && typeof next.events[eid] === 'object' ? { ...next.events[eid] } : {};
  const locations =
    ev.locations && typeof ev.locations === 'object' && !Array.isArray(ev.locations)
      ? { ...ev.locations }
      : {};
  locations[locationPrefsKey(locationName)] = mergeLocationRosterFilters(snapshot);
  next.events[eid] = { ...ev, locations };
  return next;
}

export function readGlobalRegistryFiltersFromPrefs(root, eventId, mergeGlobalRegistryListFilters) {
  const ev = root?.events?.[String(eventId)];
  if (!ev?.globalRegistry || typeof ev.globalRegistry !== 'object') return null;
  return mergeGlobalRegistryListFilters(ev.globalRegistry);
}

export function writeGlobalRegistryFiltersToPrefs(root, eventId, globalRegistrySnap, globalLocationFilters) {
  const next = normalizeListFiltersPrefsRoot(root);
  const eid = String(eventId);
  const ev = next.events[eid] && typeof next.events[eid] === 'object' ? { ...next.events[eid] } : {};
  next.events[eid] = {
    ...ev,
    globalRegistry: { ...globalRegistrySnap },
    globalLocationFilters: Array.isArray(globalLocationFilters)
      ? globalLocationFilters.filter((x) => typeof x === 'string')
      : [],
  };
  return next;
}

/** Aplica snapshot de sede a los setters del panel de registro. */
export function applyLocationRosterFilters(snapshot, setters) {
  const f = mergeLocationRosterFilters(snapshot);
  if (typeof setters.setSearchTerm === 'function') {
    setters.setSearchTerm(f.searchTerm);
    setters.setDebouncedSearchTerm(f.searchTerm);
  }
  if (typeof setters.setSortBy === 'function') setters.setSortBy(f.sortBy);
  if (typeof setters.setFilterSwim === 'function') setters.setFilterSwim(f.filterSwim);
  if (typeof setters.setFilterMedical === 'function') setters.setFilterMedical(f.filterMedical);
  if (typeof setters.setFilterScholarship === 'function') setters.setFilterScholarship(f.filterScholarship);
  if (typeof setters.setFilterResponsiva === 'function') setters.setFilterResponsiva(f.filterResponsiva);
  if (typeof setters.setFilterPersonOfInterest === 'function') setters.setFilterPersonOfInterest(f.filterPersonOfInterest);
  if (typeof setters.setFilterGender === 'function') setters.setFilterGender(f.filterGender);
  if (typeof setters.setFilterTransport === 'function') setters.setFilterTransport(f.filterTransport);
  if (typeof setters.setFilterPaymentType === 'function') setters.setFilterPaymentType(f.filterPaymentType);
  if (typeof setters.setFilterTravelFrom === 'function') setters.setFilterTravelFrom(f.filterTravelFrom);
  if (typeof setters.setFilterTravelTo === 'function') setters.setFilterTravelTo(f.filterTravelTo);
  if (typeof setters.setFilterRosterRole === 'function') setters.setFilterRosterRole(f.filterRosterRole);
  if (typeof setters.setFilterFirstTimeId === 'function') setters.setFilterFirstTimeId(f.filterFirstTimeId);
  if (typeof setters.setFilterPendingRefund === 'function') setters.setFilterPendingRefund(f.filterPendingRefund);
  if (typeof setters.setFilterWhatsAppPending === 'function') setters.setFilterWhatsAppPending(f.filterWhatsAppPending);
  if (typeof setters.setFilterLiquidation === 'function') setters.setFilterLiquidation(f.filterLiquidation);
  if (typeof setters.setFilterAssignment === 'function') setters.setFilterAssignment(f.filterAssignment);
  if (typeof setters.setFilterBaptism === 'function') setters.setFilterBaptism(f.filterBaptism);
  if (typeof setters.setFilterMaritalStatus === 'function') setters.setFilterMaritalStatus(f.filterMaritalStatus);
  if (typeof setters.setFilterRegistrationStatus === 'function') setters.setFilterRegistrationStatus(f.filterRegistrationStatus);
  if (typeof setters.setFilterPaymentMethod === 'function') setters.setFilterPaymentMethod(f.filterPaymentMethod);
  if (typeof setters.setFilterBautizosAttendance === 'function') setters.setFilterBautizosAttendance(f.filterBautizosAttendance);
  if (typeof setters.setFilterBloodType === 'function') setters.setFilterBloodType(f.filterBloodType);
  if (typeof setters.setFilterBautizosFood === 'function') setters.setFilterBautizosFood(f.filterBautizosFood);
  if (typeof setters.setFilterBautizosTransport === 'function') setters.setFilterBautizosTransport(f.filterBautizosTransport);
  if (typeof setters.setFilterBautizosCompanions === 'function') setters.setFilterBautizosCompanions(f.filterBautizosCompanions);
  if (typeof setters.setFilterAge === 'function') setters.setFilterAge(f.filterAge);
  if (typeof setters.setFilterDiscountCampaign === 'function') setters.setFilterDiscountCampaign(f.filterDiscountCampaign);
  if (typeof setters.setFilterCustomFieldKey === 'function') setters.setFilterCustomFieldKey(f.filterCustomFieldKey);
  if (typeof setters.setFilterCustomFieldPresence === 'function') setters.setFilterCustomFieldPresence(f.filterCustomFieldPresence);
  if (typeof setters.setFilterCarDataPending === 'function') setters.setFilterCarDataPending(f.filterCarDataPending);
}

export function captureLocationRosterFiltersFromState(state) {
  return mergeLocationRosterFilters({
    searchTerm: state.searchTerm,
    sortBy: state.sortBy,
    filterSwim: state.filterSwim,
    filterMedical: state.filterMedical,
    filterScholarship: state.filterScholarship,
    filterResponsiva: state.filterResponsiva,
    filterPersonOfInterest: state.filterPersonOfInterest,
    filterGender: state.filterGender,
    filterTransport: state.filterTransport,
    filterPaymentType: state.filterPaymentType,
    filterTravelFrom: state.filterTravelFrom,
    filterTravelTo: state.filterTravelTo,
    filterRosterRole: state.filterRosterRole,
    filterFirstTimeId: state.filterFirstTimeId,
    filterPendingRefund: state.filterPendingRefund,
    filterWhatsAppPending: state.filterWhatsAppPending,
    filterLiquidation: state.filterLiquidation,
    filterAssignment: state.filterAssignment,
    filterBaptism: state.filterBaptism,
    filterMaritalStatus: state.filterMaritalStatus,
    filterRegistrationStatus: state.filterRegistrationStatus,
    filterPaymentMethod: state.filterPaymentMethod,
    filterBautizosAttendance: state.filterBautizosAttendance,
    filterBloodType: state.filterBloodType,
    filterBautizosFood: state.filterBautizosFood,
    filterBautizosTransport: state.filterBautizosTransport,
    filterBautizosCompanions: state.filterBautizosCompanions,
    filterAge: state.filterAge,
    filterDiscountCampaign: state.filterDiscountCampaign,
    filterCustomFieldKey: state.filterCustomFieldKey,
    filterCustomFieldPresence: state.filterCustomFieldPresence,
    filterCarDataPending: state.filterCarDataPending,
  });
}

/** Migra blob antiguo de localStorage (filtros compartidos) a la sede indicada si aún no hay prefs. */
export function migrateLegacyLocalFiltersToPrefs(root, eventId, locationName, legacyParsed) {
  if (!legacyParsed || typeof legacyParsed !== 'object') return root;
  const existing = readLocationFiltersFromPrefs(root, eventId, locationName);
  if (existing) return root;
  const snap = captureLocationRosterFiltersFromState({
    searchTerm: legacyParsed.searchTerm,
    sortBy: legacyParsed.sortBy,
    filterSwim: legacyParsed.filterSwim,
    filterMedical: legacyParsed.filterMedical,
    filterScholarship: legacyParsed.filterScholarship,
    filterResponsiva: legacyParsed.filterResponsiva,
    filterPersonOfInterest: legacyParsed.filterPersonOfInterest,
    filterGender: legacyParsed.filterGender,
    filterTransport: legacyParsed.filterTransport,
    filterPaymentType: legacyParsed.filterPaymentType,
    filterTravelFrom: legacyParsed.filterTravelFrom,
    filterTravelTo: legacyParsed.filterTravelTo,
    filterRosterRole: legacyParsed.filterRosterRole,
    filterFirstTimeId: legacyParsed.filterFirstTimeId,
    filterPendingRefund: legacyParsed.filterPendingRefund,
    filterWhatsAppPending: legacyParsed.filterWhatsAppPending,
    filterLiquidation: legacyParsed.filterLiquidation,
    filterAssignment: legacyParsed.filterAssignment,
    filterBaptism: legacyParsed.filterBaptism,
    filterMaritalStatus: legacyParsed.filterMaritalStatus,
    filterPaymentMethod: legacyParsed.filterPaymentMethod,
    filterBautizosAttendance: legacyParsed.filterBautizosAttendance,
    filterBloodType: legacyParsed.filterBloodType,
    filterBautizosFood: legacyParsed.filterBautizosFood,
    filterBautizosTransport: legacyParsed.filterBautizosTransport,
    filterBautizosCompanions: legacyParsed.filterBautizosCompanions,
    filterAge: legacyParsed.filterAge,
    filterDiscountCampaign: legacyParsed.filterDiscountCampaign,
    filterCustomFieldKey: legacyParsed.filterCustomFieldKey,
    filterCustomFieldPresence: legacyParsed.filterCustomFieldPresence,
    filterCarDataPending: legacyParsed.filterCarDataPending,
  });
  return writeLocationFiltersToPrefs(root, eventId, locationName, snap);
}
