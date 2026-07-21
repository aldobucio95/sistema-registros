import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  startTransition,
} from 'react';
import { buildPathFromNavState, isEventSelectionPath } from '../../appRoutes.js';
import { canViewSystemLogs } from '../../rbac/permissions.js';
import { isResponsivaEventSectionVisible } from '../../responsivaSignLogic.js';
import { ATTENDANCE_ROLE_PANEL_KEY, ATTENDANCE_ROLE_TAB } from '../../attendanceRoles.js';
import { isAttendanceTypeEnabled } from '../../eventTypePresets.js';

const PANEL_NAV_TAB_KEYS = {
  Summary: 'dashboard',
  RoleServidor: 'roleServidor',
  RoleEmpleado: 'roleEmpleado',
  RoleBautizado: 'roleBautizado',
  RoleBecado: 'roleBecado',
  RoleCampero: 'roleCampero',
  RoleCortesia: 'roleCortesia',
  RolePastor: 'rolePastor',
  RoleAsistente: 'roleAsistente',
  Bautizados: 'roleBautizado',
  ServersPage: 'roleServidor',
  ExpenseList: 'expenseList',
  CashCut: 'cashCut',
  Becados: 'roleBecado',
  Responsivas: 'responsivas',
  RegistroGlobal: 'registroGlobal',
  TransportPlanning: 'transporte',
  PastoresPage: 'rolePastor',
};

const EVENT_NAV_TABS_WITHOUT_LOCATION = [
  'Summary',
  ...Object.values(ATTENDANCE_ROLE_TAB),
  'Bautizados',
  'ServersPage',
  'ExpenseList',
  'CashCut',
  'Becados',
  'Responsivas',
  'RegistroGlobal',
  'TransportPlanning',
  'PastoresPage',
];

/**
 * Event workspace tab state + programmatic navigation (goTo / goBack / goForward).
 * URL sync and popstate reconciliation remain in App.jsx for Phase C.
 *
 * @param {Object} deps
 */
export function useAppNavigation({
  navigate,
  systemView,
  setSystemView,
  selectedEventId,
  setSelectedEventId,
  activeTab,
  setActiveTab,
  currentUserRef,
  events,
  hasEventAccess,
  hasLocationAccess,
  isPanelNavAllowedForTargetEvent,
  hasAdminRights,
  showToast,
  setIsMobileMenuOpen,
  setShowViewSettings,
  resolveVisibleLocationsForEvent,
  navSnapshotRef,
}) {
  const [navHistory, setNavHistory] = useState([]);
  const [forwardNavStack, setForwardNavStack] = useState([]);
  const forwardNavStackRef = useRef([]);
  const navHistoryRef = useRef([]);
  const programmaticNavTargetRef = useRef(null);
  const eventHubBackGuardTokenRef = useRef(0);

  useLayoutEffect(() => {
    navSnapshotRef.current = { systemView, selectedEventId, activeTab };
  }, [systemView, selectedEventId, activeTab]);

  useEffect(() => {
    forwardNavStackRef.current = forwardNavStack;
  }, [forwardNavStack]);

  useEffect(() => {
    navHistoryRef.current = navHistory;
  }, [navHistory]);

  const goTo = useCallback(
    (view, eventId, tab) => {
      if (view === 'archive' || view === 'users' || view === 'logs') {
        if (view === 'logs' && currentUserRef.current && !canViewSystemLogs(currentUserRef.current)) {
          showToast('No tienes permiso para ver el registro de actividad.');
          setIsMobileMenuOpen(false);
          return;
        }
        if (view === systemView && !eventId && tab === activeTab) {
          setIsMobileMenuOpen(false);
          return;
        }
        {
          const path = view === 'archive' ? '/archivo' : view === 'users' ? '/usuarios' : '/logs';
          programmaticNavTargetRef.current = path;
          setForwardNavStack([]);
          setNavHistory((prev) => [...prev, { systemView, selectedEventId, activeTab }]);
          setSystemView(view);
          setSelectedEventId(null);
          setActiveTab(tab || 'Summary');
          setShowViewSettings(false);
          setIsMobileMenuOpen(false);
          navigate(path);
        }
        return;
      }
      if (view === 'events' && eventId && !hasEventAccess(eventId)) {
        showToast('No tienes acceso a este evento.');
        setIsMobileMenuOpen(false);
        return;
      }
      const evForNav = eventId ? events.find((e) => String(e.id) === String(eventId)) : null;
      let resolvedTab = tab;
      if (view === 'events' && eventId && resolvedTab && ATTENDANCE_ROLE_TAB) {
        const roleEntry = Object.entries(ATTENDANCE_ROLE_TAB).find(([, t]) => t === resolvedTab);
        const legacyRole =
          resolvedTab === 'Bautizados'
            ? 'bautizado'
            : resolvedTab === 'ServersPage'
              ? 'servidor'
              : resolvedTab === 'Becados'
                ? 'becado'
                : resolvedTab === 'PastoresPage'
                  ? 'pastor'
                  : null;
        const roleKey = roleEntry?.[0] || legacyRole;
        if (roleKey && evForNav && !isAttendanceTypeEnabled(evForNav, roleKey)) {
          showToast(`El tipo «${roleKey}» no está habilitado en este evento.`);
          setIsMobileMenuOpen(false);
          return;
        }
      }
      if (view === 'events' && eventId && tab === 'Responsivas') {
        if (!hasAdminRights) {
          showToast('Solo administradores pueden acceder a Responsivas.');
          setIsMobileMenuOpen(false);
          return;
        }
        if (evForNav && !isResponsivaEventSectionVisible(evForNav)) {
          showToast('Responsivas no está activa para este evento (revisa la configuración por edad).');
          setIsMobileMenuOpen(false);
          return;
        }
      }
      if (view === 'events' && eventId && resolvedTab) {
        const panelKey = PANEL_NAV_TAB_KEYS[resolvedTab];
        if (panelKey && !isPanelNavAllowedForTargetEvent(panelKey, eventId)) {
          showToast('Esta sección no está habilitada en el menú para tu usuario.');
          setIsMobileMenuOpen(false);
          return;
        }
        if (!EVENT_NAV_TABS_WITHOUT_LOCATION.includes(resolvedTab)) {
          if (!hasLocationAccess(resolvedTab, eventId)) {
            showToast('No tienes acceso a esta sede.');
            setIsMobileMenuOpen(false);
            return;
          }
          if (!isPanelNavAllowedForTargetEvent('locations', eventId)) {
            showToast('El acceso a sedes desde el menú no está habilitado para tu usuario.');
            setIsMobileMenuOpen(false);
            return;
          }
        }
      }
      if (view === systemView && eventId === selectedEventId && resolvedTab === activeTab) {
        setIsMobileMenuOpen(false);
        return;
      }
      const targetEvent = evForNav;
      const locs = targetEvent ? resolveVisibleLocationsForEvent(targetEvent) : [];
      const path = buildPathFromNavState(view, eventId, resolvedTab, targetEvent, events, locs);
      programmaticNavTargetRef.current = path;
      setActiveTab(resolvedTab);
      setShowViewSettings(false);
      setIsMobileMenuOpen(false);
      startTransition(() => {
        setForwardNavStack([]);
        setNavHistory((prev) => [...prev, { systemView, selectedEventId, activeTab }]);
        setSystemView(view);
        setSelectedEventId(eventId);
        navigate(path);
      });
    },
    [
      systemView,
      selectedEventId,
      activeTab,
      hasEventAccess,
      hasLocationAccess,
      isPanelNavAllowedForTargetEvent,
      showToast,
      navigate,
      events,
      resolveVisibleLocationsForEvent,
      hasAdminRights,
      currentUserRef,
      setSystemView,
      setSelectedEventId,
      setIsMobileMenuOpen,
      setShowViewSettings,
    ]
  );

  const applyNavSnapshot = useCallback(
    (snap, { replace = false } = {}) => {
      if (!snap || typeof snap !== 'object') return;
      const targetEvent =
        snap.selectedEventId != null && snap.selectedEventId !== ''
          ? events.find((e) => String(e.id) === String(snap.selectedEventId))
          : null;
      const locs = targetEvent ? resolveVisibleLocationsForEvent(targetEvent) : [];
      const path = buildPathFromNavState(
        snap.systemView,
        snap.selectedEventId,
        snap.activeTab,
        targetEvent,
        events,
        locs
      );
      programmaticNavTargetRef.current = path;
      setSystemView(snap.systemView);
      setSelectedEventId(snap.selectedEventId);
      setActiveTab(snap.activeTab);
      setShowViewSettings(false);
      setIsMobileMenuOpen(false);
      navigate(path, replace ? { replace: true } : undefined);
    },
    [events, navigate, resolveVisibleLocationsForEvent, setSystemView, setSelectedEventId, setIsMobileMenuOpen, setShowViewSettings]
  );

  const isEventSelectionHubSnapshot = useCallback((snap) => {
    if (!snap || typeof snap !== 'object') return false;
    return snap.systemView === 'events' && (snap.selectedEventId == null || snap.selectedEventId === '');
  }, []);

  const rearmEventHubBackGuard = useCallback(() => {
    if (typeof window === 'undefined') return;
    const snap = navSnapshotRef.current;
    if (!currentUserRef.current || !isEventSelectionHubSnapshot(snap)) return;
    if (!isEventSelectionPath(window.location.pathname)) return;
    const token = ++eventHubBackGuardTokenRef.current;
    window.history.pushState({ vnpmHubBackGuard: token }, '', window.location.href);
  }, [currentUserRef, isEventSelectionHubSnapshot]);

  const applyNavSnapshotRef = useRef(applyNavSnapshot);
  useEffect(() => {
    applyNavSnapshotRef.current = applyNavSnapshot;
  }, [applyNavSnapshot]);

  const rearmEventHubBackGuardRef = useRef(rearmEventHubBackGuard);
  useEffect(() => {
    rearmEventHubBackGuardRef.current = rearmEventHubBackGuard;
  }, [rearmEventHubBackGuard]);

  const goBack = useCallback(() => {
    if (navHistory.length === 0) return;
    const parent = navHistory[navHistory.length - 1];
    const child = { ...navSnapshotRef.current };
    setForwardNavStack((fs) => [...fs, { parent, child }]);
    setNavHistory((prev) => prev.slice(0, -1));
    applyNavSnapshot(parent);
  }, [navHistory, applyNavSnapshot]);

  const goForward = useCallback(() => {
    if (forwardNavStack.length === 0) return;
    const pair = forwardNavStack[forwardNavStack.length - 1];
    setForwardNavStack((prev) => prev.slice(0, -1));
    setNavHistory((h) => [...h, pair.parent]);
    applyNavSnapshot(pair.child);
  }, [forwardNavStack, applyNavSnapshot]);

  return {
    navHistory,
    setNavHistory,
    forwardNavStack,
    setForwardNavStack,
    forwardNavStackRef,
    navHistoryRef,
    programmaticNavTargetRef,
    eventHubBackGuardTokenRef,
    goTo,
    goBack,
    goForward,
    applyNavSnapshot,
    applyNavSnapshotRef,
    rearmEventHubBackGuard,
    rearmEventHubBackGuardRef,
    isEventSelectionHubSnapshot,
  };
}
