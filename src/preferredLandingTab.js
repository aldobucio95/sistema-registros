import { isAdminOrSuper } from './rbac/roles.js';
import {
  getUserAllowedEventIds,
  getUserAllowedLocationsLegacy,
  getUserAllowedLocationNamesForEvent,
  getUserAllowedPanelSectionsForEvent,
  getPanelNavKeysEnabledInAnyEvent,
  isPanelNavKeyAllowed,
  userCanAccessExpenseList,
} from './rbac/permissions.js';
import { getTransportSectionEligibleForEventDoc, eventTypeIsDesayuno } from './transportPlanningEligibility.js';
import { isResponsivaEventSectionVisible } from './responsivaSignLogic.js';
import { resolvePanelNavConfigItemCopy } from './panelNavUi.js';

/** Pestaña interna (`activeTab`) → clave del menú lateral (`panelNav`). */
export const PANEL_NAV_TAB_KEYS = {
  Summary: 'dashboard',
  Bautizados: 'bautizados',
  ServersPage: 'serversPage',
  ExpenseList: 'expenseList',
  CashCut: 'cashCut',
  Becados: 'becados',
  BautizosCompanions: 'becados',
  Responsivas: 'responsivas',
  RegistroGlobal: 'registroGlobal',
  TransportPlanning: 'transporte',
};

export const PANEL_LANDING_TAB_VALUES = new Set([
  ...Object.keys(PANEL_NAV_TAB_KEYS),
  'PastoresPage',
]);

const PANEL_KEY_TO_TAB = {
  dashboard: 'Summary',
  bautizados: 'Bautizados',
  serversPage: 'ServersPage',
  becados: 'Becados',
  cashCut: 'CashCut',
  expenseList: 'ExpenseList',
  responsivas: 'Responsivas',
  registroGlobal: 'RegistroGlobal',
  transporte: 'TransportPlanning',
};

const LANDING_SECTION_ORDER = [
  'dashboard',
  'bautizados',
  'serversPage',
  'becados',
  'registroGlobal',
  'transporte',
  'cashCut',
  'expenseList',
  'responsivas',
];

/** True si la preferencia es una sede (nombre libre), no una sección del menú. */
export function isLandingLocationTab(preferred) {
  const p = String(preferred || '').trim();
  if (!p || p === 'Summary') return false;
  return !PANEL_LANDING_TAB_VALUES.has(p);
}

/** Ajusta Becados ↔ Acompañantes según el tipo de evento. */
export function normalizeLandingTabForEventType(tab, eventType) {
  const t = String(tab || '').trim();
  const et = String(eventType || '').trim();
  if (et === 'Bautizos' && t === 'Becados') return 'BautizosCompanions';
  if (et !== 'Bautizos' && t === 'BautizosCompanions') return 'Becados';
  return t;
}

function scopedEventsForUser(user, events) {
  const list = Array.isArray(events) ? events : [];
  const ids = getUserAllowedEventIds(user);
  if (ids.length === 0) return list;
  const set = new Set(ids.map((id) => String(id)));
  return list.filter((ev) => set.has(String(ev.id)));
}

function eventPanelContext(eventLike, editorConfig) {
  const eventType = String(eventLike?.eventType || eventLike?.type || '').trim();
  return {
    eventType,
    isCampa: eventType === 'Campa',
    isBautizos: eventType === 'Bautizos',
    transportSectionEligible:
      editorConfig && typeof editorConfig === 'object'
        ? getTransportSectionEligibleForEventDoc(eventLike, editorConfig)
        : !eventTypeIsDesayuno(eventType),
  };
}

function isPastoresLandingAllowed(user, hasAdminRights) {
  return hasAdminRights || isAdminOrSuper(user?.role);
}

function isResponsivasLandingAllowed(user, eventLike, ctx) {
  if (!isPastoresLandingAllowed(user, ctx.hasAdminRights)) return false;
  if (!eventLike) return true;
  return isResponsivaEventSectionVisible(eventLike);
}

function isPanelTabAllowedForEvent(user, tab, eventLike, ctx) {
  if (tab === 'PastoresPage') {
    return isPastoresLandingAllowed(user, ctx.hasAdminRights);
  }
  if (tab === 'Responsivas') {
    return isResponsivasLandingAllowed(user, eventLike, ctx);
  }
  const panelKey = PANEL_NAV_TAB_KEYS[tab];
  if (!panelKey) return false;
  const { isCampa, isBautizos, transportSectionEligible } = eventPanelContext(eventLike, ctx.editorConfig);
  return isPanelNavKeyAllowed(user, panelKey, {
    globalPanelNav: ctx.globalPanelNav,
    eventId: eventLike?.id ?? null,
    isCampa,
    isBautizos,
    isSuperUser: ctx.sessionIsSuperUser,
    transportSectionEligible,
  });
}

function isPanelTabAllowedInAnyEvent(user, tab, events, ctx) {
  if (tab === 'PastoresPage') return isPastoresLandingAllowed(user, ctx.hasAdminRights);
  const scoped = scopedEventsForUser(user, events);
  if (scoped.length === 0) {
    if (tab === 'Responsivas') return isPastoresLandingAllowed(user, ctx.hasAdminRights);
    const panelKey = PANEL_NAV_TAB_KEYS[tab];
    if (!panelKey) return false;
    if (panelKey === 'expenseList') {
      return userCanAccessExpenseList(user, ctx.sessionIsSuperUser);
    }
    return isAdminOrSuper(user?.role);
  }
  return scoped.some((ev) => isPanelTabAllowedForEvent(user, tab, ev, ctx));
}

function landingSectionLabel(panelKey, events, user) {
  if (panelKey === 'dashboard') return 'Dashboard';
  if (panelKey === 'expenseList') return 'Lista de gastos';
  if (panelKey === 'cashCut') return 'Corte de caja';
  if (panelKey === 'registroGlobal') return 'Registro global';
  if (panelKey === 'transporte') return 'Transporte';
  if (panelKey === 'responsivas') return 'Responsivas';
  if (panelKey === 'bautizados') return 'Bautizados';

  const scoped = scopedEventsForUser(user, events);
  const hasBautizos = scoped.some((ev) => String(ev?.eventType || '').trim() === 'Bautizos');
  const hasCampa = scoped.some((ev) => String(ev?.eventType || '').trim() === 'Campa');

  if (panelKey === 'becados') {
    if (hasBautizos && !hasCampa) return 'Acompañantes';
    if (hasBautizos && hasCampa) return 'Becados / Acompañantes';
    return 'Becados';
  }
  if (panelKey === 'serversPage') {
    if (hasBautizos && !hasCampa) return 'Servidores y empleados';
    if (hasBautizos && hasCampa) return 'Servidores';
    return 'Página Servidores';
  }

  const sampleType = scoped[0]?.eventType;
  const stub = { key: panelKey, label: panelKey, hint: '' };
  return resolvePanelNavConfigItemCopy(stub, sampleType).label || panelKey;
}

function collectLocationOptions(user, events, allKnownLocationNames) {
  const names = new Set();
  const isWideRole = ['Administrador', 'SuperUsuario'].includes(user?.role);
  if (isWideRole) {
    for (const loc of allKnownLocationNames || []) {
      const s = String(loc).trim();
      if (s) names.add(s);
    }
    return [...names].sort((a, b) => a.localeCompare(b, 'es'));
  }

  const legacy = getUserAllowedLocationsLegacy(user);
  if (legacy.length > 0) {
    legacy.forEach((loc) => {
      const s = String(loc).trim();
      if (s) names.add(s);
    });
  }

  const byEvent = user?.allowedLocationsByEvent;
  if (byEvent && typeof byEvent === 'object') {
    for (const locs of Object.values(byEvent)) {
      if (!Array.isArray(locs)) continue;
      locs.forEach((loc) => {
        const s = String(loc).trim();
        if (s) names.add(s);
      });
    }
  }

  if (names.size === 0) {
    for (const loc of allKnownLocationNames || []) {
      const s = String(loc).trim();
      if (s) names.add(s);
    }
  }

  return [...names].sort((a, b) => a.localeCompare(b, 'es'));
}

/**
 * Opciones para `<select>` de ventana inicial: secciones del menú + sedes.
 */
export function buildPreferredLandingTabOptionGroups({ user, events = [], globalPanelNav = {}, allKnownLocationNames = [], editorConfig = null, sessionIsSuperUser = false, hasAdminRights = false }) {
  const ctx = { globalPanelNav, editorConfig, sessionIsSuperUser, hasAdminRights };
  const sectionOptions = [];
  const enabledKeys = getPanelNavKeysEnabledInAnyEvent(user, events, globalPanelNav, editorConfig);

  for (const panelKey of LANDING_SECTION_ORDER) {
    if (panelKey === 'dashboard') continue;
    if (panelKey === 'expenseList') {
      if (!isPanelTabAllowedInAnyEvent(user, 'ExpenseList', events, ctx)) continue;
    } else if (!enabledKeys.has(panelKey)) {
      continue;
    }
    const tab = PANEL_KEY_TO_TAB[panelKey];
    if (!tab) continue;
    sectionOptions.push({ value: tab, label: landingSectionLabel(panelKey, events, user) });
  }

  if (isPastoresLandingAllowed(user, hasAdminRights)) {
    sectionOptions.push({ value: 'PastoresPage', label: 'Pastores' });
  }

  let locationOptions = collectLocationOptions(user, events, allKnownLocationNames).map((loc) => ({
    value: loc,
    label: loc,
  }));

  const pref = String(user?.preferredLandingTab || '').trim();
  if (pref && isLandingLocationTab(pref) && !locationOptions.some((o) => o.value === pref)) {
    locationOptions = [{ value: pref, label: pref }, ...locationOptions];
  }
  if (pref && PANEL_LANDING_TAB_VALUES.has(pref) && !sectionOptions.some((o) => o.value === pref)) {
    const panelKey = PANEL_NAV_TAB_KEYS[pref];
    sectionOptions.push({
      value: pref,
      label: pref === 'PastoresPage' ? 'Pastores' : landingSectionLabel(panelKey, events, user),
    });
  }

  return { sectionOptions, locationOptions };
}

function fallbackTabForNoDashboard(user, eventObj, ctx) {
  const eventId = eventObj?.id != null && eventObj?.id !== '' ? eventObj.id : null;
  const fromEvent = eventObj?.locations;
  const visibleForEvent =
    user && eventObj ? getUserAllowedLocationNamesForEvent(user, eventId, fromEvent || []) : [];
  const available =
    visibleForEvent.length > 0
      ? visibleForEvent
      : Array.isArray(fromEvent) && fromEvent.length > 0
        ? fromEvent
        : (ctx.allKnownLocationNames?.length > 0 ? ctx.allKnownLocationNames : ctx.globalLocations) || [];

  const locCandidates =
    visibleForEvent.length > 0
      ? visibleForEvent
      : Array.isArray(fromEvent) && fromEvent.length > 0
        ? fromEvent
        : available;

  for (const loc of locCandidates) {
    if (visibleForEvent.length === 0 || visibleForEvent.includes(loc)) return loc;
  }
  if (visibleForEvent.length > 0) return visibleForEvent[0];

  const allowedLocs = getUserAllowedLocationsLegacy(user);
  for (const loc of locCandidates) {
    if (allowedLocs.length === 0 || allowedLocs.includes(loc)) return loc;
  }
  if (allowedLocs.length > 0) return allowedLocs[0];
  if (locCandidates.length > 0) return locCandidates[0];
  if (available.length > 0) return available[0];
  return 'Summary';
}

function resolveWithDashboardFallback(user, eventObj, ctx, dashboardAllowed) {
  return dashboardAllowed ? 'Summary' : fallbackTabForNoDashboard(user, eventObj, ctx);
}

/**
 * Resuelve la pestaña/sede inicial al entrar a un evento.
 */
export function resolvePreferredLandingTab(user, eventObj = null, ctx = {}) {
  const {
    globalPanelNav = {},
    allKnownLocationNames = [],
    globalLocations = [],
    sessionIsSuperUser = false,
    hasAdminRights = false,
    editorConfig = null,
  } = ctx;

  const fullCtx = {
    globalPanelNav,
    allKnownLocationNames,
    globalLocations,
    sessionIsSuperUser,
    hasAdminRights,
    editorConfig,
  };

  const fromEvent = eventObj?.locations;
  const eventId = eventObj?.id != null && eventObj?.id !== '' ? eventObj.id : null;
  const eventType = String(eventObj?.eventType || '').trim();
  const visibleForEvent =
    user && eventObj ? getUserAllowedLocationNamesForEvent(user, eventId, fromEvent || []) : [];
  const available =
    visibleForEvent.length > 0
      ? visibleForEvent
      : Array.isArray(fromEvent) && fromEvent.length > 0
        ? fromEvent
        : (allKnownLocationNames.length > 0 ? allKnownLocationNames : globalLocations) || [];

  const preferredRaw = String(user?.preferredLandingTab || '').trim();
  const preferred = normalizeLandingTabForEventType(preferredRaw, eventType);
  const merged = getUserAllowedPanelSectionsForEvent(user, eventId, globalPanelNav);
  const dashboardAllowed = merged.dashboard !== false;

  if (!preferred || preferred === 'Summary') {
    return dashboardAllowed ? 'Summary' : fallbackTabForNoDashboard(user, eventObj, fullCtx);
  }

  if (PANEL_LANDING_TAB_VALUES.has(preferred)) {
    if (eventObj && !isPanelTabAllowedForEvent(user, preferred, eventObj, fullCtx)) {
      return resolveWithDashboardFallback(user, eventObj, fullCtx, dashboardAllowed);
    }
    if (!eventObj && !isPanelTabAllowedInAnyEvent(user, preferred, [], fullCtx)) {
      return resolveWithDashboardFallback(user, eventObj, fullCtx, dashboardAllowed);
    }
    return preferred;
  }

  if (['Administrador', 'SuperUsuario'].includes(user?.role)) {
    if (preferred && available.includes(preferred)) return preferred;
    if (available.includes('Norte')) return 'Norte';
    return resolveWithDashboardFallback(user, eventObj, fullCtx, dashboardAllowed);
  }

  if (!available.includes(preferred)) {
    return resolveWithDashboardFallback(user, eventObj, fullCtx, dashboardAllowed);
  }
  if (visibleForEvent.length > 0 && !visibleForEvent.includes(preferred)) {
    return resolveWithDashboardFallback(user, eventObj, fullCtx, dashboardAllowed);
  }
  const allowedLocs = getUserAllowedLocationsLegacy(user);
  if (allowedLocs.length === 0 || allowedLocs.includes(preferred)) return preferred;
  return resolveWithDashboardFallback(user, eventObj, fullCtx, dashboardAllowed);
}
