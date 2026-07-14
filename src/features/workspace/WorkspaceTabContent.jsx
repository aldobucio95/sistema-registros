import React, { Suspense } from 'react';
import { useWorkspaceShell } from '../../screens/eventWorkspace/WorkspaceShellContext.jsx';
import ScreenLoadingFallback from '../../screens/ScreenLoadingFallback.jsx';
import {
  DashboardSummaryPage,
  LocationRosterPage,
  GlobalRegistryPage,
  ServerProfilesPage,
  CashCutPage,
  ExpenseListPage,
  PastoresWorkspacePage,
  BecadosWorkspacePage,
  BautizadosWorkspacePage,
  BautizosCompanionsWorkspacePage,
  BautizosAsistentesWorkspacePage,
  BautizosCortesiasWorkspacePage,
  ResponsivasWorkspacePage,
  TransportPlanningWorkspacePage,
} from './WorkspaceLazyPages.jsx';

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

  if (
    contentTab === 'Bautizados' &&
    (shell.isCampa || shell.isBautizos) &&
    shell.isPanelNavSectionAllowed('bautizados')
  ) {
    return (
      <Suspense fallback={<ScreenLoadingFallback title="Cargando bautizados…" />}>
        <BautizadosWorkspacePage />
      </Suspense>
    );
  }

  if (
    contentTab === 'ServersPage' &&
    (shell.isCampa || shell.isBautizos) &&
    shell.isPanelNavSectionAllowed('serversPage')
  ) {
    return (
      <Suspense fallback={<ScreenLoadingFallback title="Cargando servidores…" />}>
        <ServerProfilesPage />
      </Suspense>
    );
  }

  if (contentTab === 'Becados' && !shell.isBautizos && shell.isPanelNavSectionAllowed('becados')) {
    return (
      <Suspense fallback={<ScreenLoadingFallback title="Cargando becados…" />}>
        <BecadosWorkspacePage />
      </Suspense>
    );
  }

  if (contentTab === 'BautizosCompanions' && shell.isPanelNavSectionAllowed('becados') && shell.isBautizos) {
    return (
      <Suspense fallback={<ScreenLoadingFallback title="Cargando acompañantes…" />}>
        <BautizosCompanionsWorkspacePage />
      </Suspense>
    );
  }

  if (contentTab === 'BautizosAsistentes' && shell.isBautizos) {
    return (
      <Suspense fallback={<ScreenLoadingFallback title="Cargando asistentes…" />}>
        <BautizosAsistentesWorkspacePage />
      </Suspense>
    );
  }

  if (contentTab === 'BautizosCortesias' && shell.isBautizos) {
    return (
      <Suspense fallback={<ScreenLoadingFallback title="Cargando cortesías…" />}>
        <BautizosCortesiasWorkspacePage />
      </Suspense>
    );
  }

  if (contentTab === 'Responsivas' && shell.hasAdminRights && shell.isCampa) {
    return (
      <Suspense fallback={<ScreenLoadingFallback title="Cargando responsivas…" />}>
        <ResponsivasWorkspacePage />
      </Suspense>
    );
  }

  if (contentTab === 'PastoresPage' && shell.hasAdminRights) {
    return (
      <Suspense fallback={<ScreenLoadingFallback title="Cargando pastores…" />}>
        <PastoresWorkspacePage />
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
