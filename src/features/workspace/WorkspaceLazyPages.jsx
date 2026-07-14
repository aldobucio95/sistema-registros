import { lazy } from 'react';

export const DashboardSummaryPage = lazy(() => import('./pages/DashboardSummaryPage.jsx'));
export const LocationRosterPage = lazy(() => import('./pages/LocationRosterPage.jsx'));
export const GlobalRegistryPage = lazy(() => import('./pages/GlobalRegistryPage.jsx'));
export const ServerProfilesPage = lazy(() => import('./pages/ServerProfilesPage.jsx'));
export const CashCutPage = lazy(() => import('./pages/CashCutPage.jsx'));
export const ExpenseListPage = lazy(() => import('./pages/ExpenseListPage.jsx'));
export const PastoresWorkspacePage = lazy(() => import('./pages/PastoresWorkspacePage.jsx'));
export const BecadosWorkspacePage = lazy(() => import('./pages/BecadosWorkspacePage.jsx'));
export const BautizadosWorkspacePage = lazy(() => import('./pages/BautizadosWorkspacePage.jsx'));
export const ResponsivasWorkspacePage = lazy(() => import('./pages/ResponsivasWorkspacePage.jsx'));
export const TransportPlanningWorkspacePage = lazy(() => import('./pages/TransportPlanningWorkspacePage.jsx'));

const TAB_CHUNK_IMPORTS = {
  Summary: () => import('./pages/DashboardSummaryPage.jsx'),
  Bautizados: () => import('./pages/BautizadosWorkspacePage.jsx'),
  ServersPage: () => import('./pages/ServerProfilesPage.jsx'),
  Becados: () => import('./pages/BecadosWorkspacePage.jsx'),
  Responsivas: () => import('./pages/ResponsivasWorkspacePage.jsx'),
  PastoresPage: () => import('./pages/PastoresWorkspacePage.jsx'),
  TransportPlanning: () => import('./pages/TransportPlanningWorkspacePage.jsx'),
  CashCut: () => import('./pages/CashCutPage.jsx'),
  ExpenseList: () => import('./pages/ExpenseListPage.jsx'),
  RegistroGlobal: () => import('./pages/GlobalRegistryPage.jsx'),
};

/** Prefetch the lazy chunk for a workspace tab (sidebar hover / focus). */
export function preloadWorkspaceTab(tab) {
  const load = TAB_CHUNK_IMPORTS[tab];
  if (load) void load();
}

/** Prefetch the location roster tab chunk. */
export function preloadWorkspaceLocationTab() {
  void import('./pages/LocationRosterPage.jsx');
}

/** Props to spread on sidebar nav buttons for optional chunk prefetch. */
export function workspaceTabPreloadProps(tab) {
  return {
    onMouseEnter: () => preloadWorkspaceTab(tab),
    onFocus: () => preloadWorkspaceTab(tab),
  };
}

export function workspaceLocationTabPreloadProps() {
  return {
    onMouseEnter: preloadWorkspaceLocationTab,
    onFocus: preloadWorkspaceLocationTab,
  };
}
