import { normalizeRole } from './roles.js';
import {
  getUserAllowedEventIds,
  getUserAllowedLocationNamesForEvent,
  isPanelNavKeyAllowed,
  mergePanelSectionsForUser,
  PANEL_NAV_KEYS,
  userCanAccessExpenseList,
} from './permissions.js';
import { getTransportSectionEligibleForEventDoc } from '../transportPlanningEligibility.js';

export const PANEL_KEY_LABELS = {
  dashboard: 'Dashboard',
  bautizados: 'Bautizados',
  serversPage: 'Servidores',
  becados: 'Becados',
  cashCut: 'Corte caja',
  expenseList: 'Lista gastos',
  responsivas: 'Responsivas',
  registroGlobal: 'Reg. global',
  transporte: 'Transporte',
  locations: 'Sedes menú',
};

export function adminScopeIsGloballyUnrestricted(user) {
  if (normalizeRole(user?.role) !== 'Administrador') return false;
  if (getUserAllowedEventIds(user).length > 0) return false;
  const locMap = user?.allowedLocationsByEvent;
  if (locMap && typeof locMap === 'object' && Object.keys(locMap).length > 0) return false;
  const panelMap = user?.allowedPanelSectionsByEvent;
  if (panelMap && typeof panelMap === 'object' && Object.keys(panelMap).length > 0) return false;
  return true;
}

export function buildScopeRows(targetUser, events, globalPanelNav, editorConfig = null) {
  const list = Array.isArray(events) ? events : [];
  const ids = getUserAllowedEventIds(targetUser);
  const inScope =
    ids.length === 0 ? list : list.filter((e) => ids.some((id) => String(id) === String(e.id)));

  return inScope.map((ev) => {
    const locNames = Array.isArray(ev.locations) ? ev.locations : [];
    const allowedLocs = getUserAllowedLocationNamesForEvent(targetUser, ev.id, locNames);
    let locLabel;
    if (allowedLocs.length === 0) locLabel = 'Ninguna';
    else if (locNames.length > 0 && allowedLocs.length >= locNames.length) locLabel = 'Todas';
    else locLabel = allowedLocs.join(', ');

    const eventType = String(ev.eventType || ev.type || '').trim();
    const isCampa = eventType === 'Campa';
    const isBautizos = eventType === 'Bautizos';
    const transportSectionEligible = getTransportSectionEligibleForEventDoc(ev, editorConfig || {});
    const sectionKeys = PANEL_NAV_KEYS.filter((k) =>
      isPanelNavKeyAllowed(targetUser, k, {
        globalPanelNav,
        isCampa,
        isBautizos,
        eventId: ev.id,
        isSuperUser: false,
        transportSectionEligible,
      })
    );
    const sectionLabel = sectionKeys
      .map((k) => {
        if (k === 'becados' && eventType === 'Bautizos') return 'Acompañantes';
        return PANEL_KEY_LABELS[k] || k;
      })
      .join(' · ');

    return {
      id: ev.id,
      name: ev.name || String(ev.id),
      locLabel,
      sectionLabel: sectionLabel || '—',
    };
  });
}

export function mergedMenuSummaryLine(targetUser, globalPanelNav) {
  const merged = mergePanelSectionsForUser(targetUser, globalPanelNav);
  const parts = [];
  if (merged.dashboard) parts.push(PANEL_KEY_LABELS.dashboard);
  if (merged.bautizados) parts.push(PANEL_KEY_LABELS.bautizados);
  if (merged.serversPage) parts.push(PANEL_KEY_LABELS.serversPage);
  if (merged.becados) parts.push(PANEL_KEY_LABELS.becados);
  if (merged.cashCut) parts.push(PANEL_KEY_LABELS.cashCut);
  if (merged.registroGlobal) parts.push(PANEL_KEY_LABELS.registroGlobal);
  if (merged.transporte) parts.push(PANEL_KEY_LABELS.transporte);
  if (merged.locations) parts.push(PANEL_KEY_LABELS.locations);
  if (merged.responsivas) parts.push(PANEL_KEY_LABELS.responsivas);
  if (merged.expenseList && userCanAccessExpenseList(targetUser, false)) {
    parts.push(PANEL_KEY_LABELS.expenseList);
  }
  return parts.length ? parts.join(' · ') : '—';
}
