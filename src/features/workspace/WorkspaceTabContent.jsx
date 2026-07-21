import React, { Suspense } from 'react';
import { useWorkspaceShell } from '../../screens/eventWorkspace/WorkspaceShellContext.jsx';
import ScreenLoadingFallback from '../../screens/ScreenLoadingFallback.jsx';
import {
  DashboardSummaryPage,
  LocationRosterPage,
  GlobalRegistryPage,
  CashCutPage,
  ExpenseListPage,
  ResponsivasWorkspacePage,
  TransportPlanningWorkspacePage,
  AttendanceRoleWorkspacePage,
} from './WorkspaceLazyPages.jsx';
import { ATTENDANCE_ROLE_PANEL_KEY, ATTENDANCE_ROLE_TAB } from '../../attendanceRoles.js';
import { isResponsivaEventSectionVisible } from '../../responsivaSignLogic.js';

const ROLE_TABS = new Set(Object.values(ATTENDANCE_ROLE_TAB));
const LEGACY_ROLE_TABS = new Set(['Bautizados', 'ServersPage', 'Becados', 'PastoresPage']);

function roleKeyFromTab(tab) {
  const entry = Object.entries(ATTENDANCE_ROLE_TAB).find(([, t]) => t === tab);
  if (entry) return entry[0];
  if (tab === 'Bautizados') return 'bautizado';
  if (tab === 'ServersPage') return 'servidor';
  if (tab === 'Becados') return 'becado';
  if (tab === 'PastoresPage') return 'pastor';
  return null;
}

/**
 * Renders the active workspace tab via lazy-loaded page wrappers that delegate to shell.renderX().
 */
export default function WorkspaceTabContent({ contentTab }) {
  const shell = useWorkspaceShell();

  if (contentTab === 'Summary' && shell.isPanelNavSectionAllowed('dashboard')) {
    return (
      <Suspense fallback={<ScreenLoadingFallback title="Cargando dashboard…" />}>
        <DashboardSummaryPage />
      </Suspense>
    );
  }

  if (ROLE_TABS.has(contentTab) || LEGACY_ROLE_TABS.has(contentTab)) {
    const roleKey = roleKeyFromTab(contentTab);
    const panelKey = roleKey ? ATTENDANCE_ROLE_PANEL_KEY[roleKey] : null;
    if (roleKey && panelKey && shell.isPanelNavSectionAllowed(panelKey)) {
      return (
        <Suspense fallback={<ScreenLoadingFallback title="Cargando asistencia…" />}>
          <AttendanceRoleWorkspacePage roleKey={roleKey} />
        </Suspense>
      );
    }
  }

  if (
    contentTab === 'Responsivas' &&
    shell.hasAdminRights &&
    shell.isPanelNavSectionAllowed('responsivas') &&
    isResponsivaEventSectionVisible(shell.currentEvent)
  ) {
    return (
      <Suspense fallback={<ScreenLoadingFallback title="Cargando responsivas…" />}>
        <ResponsivasWorkspacePage />
      </Suspense>
    );
  }

  if (contentTab === 'TransportPlanning' && shell.isPanelNavSectionAllowed('transporte')) {
    return (
      <Suspense fallback={<ScreenLoadingFallback title="Cargando transporte…" />}>
        <TransportPlanningWorkspacePage />
      </Suspense>
    );
  }

  if (contentTab === 'RegistroGlobal' && shell.isPanelNavSectionAllowed('registroGlobal')) {
    return (
      <Suspense fallback={<ScreenLoadingFallback title="Cargando registro global…" />}>
        <GlobalRegistryPage />
      </Suspense>
    );
  }

  if (contentTab === 'CashCut' && shell.isPanelNavSectionAllowed('cashCut')) {
    return (
      <Suspense fallback={<ScreenLoadingFallback title="Cargando corte de caja…" />}>
        <CashCutPage />
      </Suspense>
    );
  }

  if (
    contentTab === 'ExpenseList' &&
    shell.canAccessExpenses &&
    shell.isPanelNavSectionAllowed('expenseList')
  ) {
    return (
      <Suspense fallback={<ScreenLoadingFallback title="Cargando gastos…" />}>
        <ExpenseListPage />
      </Suspense>
    );
  }

  if (shell.visibleLocations.includes(contentTab) && shell.isPanelNavSectionAllowed('locations')) {
    return (
      <Suspense fallback={<ScreenLoadingFallback title="Cargando sede…" />}>
        <LocationRosterPage loc={contentTab} />
      </Suspense>
    );
  }

  return null;
}
