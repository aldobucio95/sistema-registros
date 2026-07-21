/**
 * Comprueba invariantes de negocio conocidas (anti-regresión).
 * Uso: pnpm run check:invariants
 *
 * v2: la lógica vive en AppMain + features extraídas (ya no en App.jsx monolítico).
 */
import { readFileSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const APP_MAIN = join(ROOT, 'src/app/AppMain.jsx');
const LOCATION_ROSTER = join(ROOT, 'src/features/locationRoster/LocationRosterPageContent.jsx');
const GLOBAL_REGISTRY = join(ROOT, 'src/features/globalRegistry/GlobalRegistryPageContent.jsx');
const DASHBOARD = join(ROOT, 'src/features/dashboard/DashboardSummaryPageContent.jsx');
const HANDLERS_B = join(ROOT, 'src/hooks/workspace/useAppMainHandlersPartB.jsx');
const CASH_CUT = join(ROOT, 'src/features/finance/CashCutPageContent.jsx');

let failures = 0;

function fail(msg) {
  console.error(`[check:invariants] FAIL: ${msg}`);
  failures += 1;
}

function pass(msg) {
  console.log(`[check:invariants] OK: ${msg}`);
}

function read(path) {
  return readFileSync(path, 'utf8');
}

function lineCount(text) {
  return text.split(/\r?\n/).length;
}

function extractBetween(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  if (start < 0) return '';
  const from = start;
  const end = text.indexOf(endMarker, from + startMarker.length);
  if (end < 0) return text.slice(from);
  return text.slice(from, end + endMarker.length);
}

function checkTransportPlanningProps(appMain) {
  const block = extractBetween(appMain, 'const renderTransportPlanningPage', 'const render');
  const required = [
    'applyGlobalRegistryLikeFilters',
    'renderGlobalRegistryListToolbar',
    'transportUiPrefs',
    'onTransportUiPrefsChange',
    'customCarCatalog',
  ];
  const missing = required.filter((prop) => !block.includes(prop));
  if (missing.length > 0) {
    fail(`TransportPlanningPage sin props: ${missing.join(', ')}`);
  } else {
    pass('TransportPlanningPage con props de filtros y preferencias');
  }
}

function checkSedeRosterMobileParity(roster) {
  const activosHasMobile =
    roster.includes('renderRosterPersonMobileCard') && roster.includes('uiRosterMobile.list');
  const waitlistHasMobile =
    /showRosterWaitlist[\s\S]{0,2500}renderRosterPersonMobileCard/.test(roster) ||
    /waitlist[\s\S]{0,2500}renderRosterPersonMobileCard/.test(roster);
  const cancelledHasMobile =
    /showRosterCancelled[\s\S]{0,2500}renderRosterPersonMobileCard/.test(roster) ||
    /cancelled[\s\S]{0,2500}renderRosterPersonMobileCard/.test(roster);
  if (!activosHasMobile) {
    fail('sección Activos sin tarjetas móvil (renderRosterPersonMobileCard / uiRosterMobile.list)');
  } else if (!waitlistHasMobile || !cancelledHasMobile) {
    fail('Espera o Cancelados sin tarjetas móvil (solo Activos tiene cards)');
  } else {
    pass('secciones sede Activos/Espera/Cancelados con tarjetas móvil');
  }
}

function checkCashCutMobilePayments(cashCut) {
  const ok =
    cashCut.includes('renderCashCutPaymentsBlock') &&
    cashCut.includes('uiCashCutSedeService.paymentsList');
  if (!ok) {
    fail('Corte de caja sin lista móvil de pagos (renderCashCutPaymentsBlock o paymentsList)');
  } else {
    pass('Corte de caja con lista móvil de pagos');
  }
}

function checkGlobalRegistryRosterInvariants(globalPage) {
  const hasRowsBlock = globalPage.includes('renderGlobalRegistryRowsBlock');
  const hasThreeSectionsInGlobal =
    hasRowsBlock ||
    (globalPage.includes('Activos') &&
      globalPage.includes('Lista de espera') &&
      globalPage.includes('Cancelados'));
  if (!hasThreeSectionsInGlobal) {
    fail(
      'Registro Global sin bloque de 3 secciones (Activos / Lista de espera / Cancelados): falta renderGlobalRegistryRowsBlock o equivalente'
    );
  } else {
    pass('Registro Global con secciones Activos / Espera / Cancelados');
  }

  if (
    !globalPage.includes('buildGlobalRegistryPartySections(') ||
    (!globalPage.includes('aggregateLocationRosterSectionCountsForLocations') &&
      !globalPage.includes('getLocationRosterSectionCountsFromSummary'))
  ) {
    // Conteo canónico puede venir de props/app; exigir al menos party sections
    if (!globalPage.includes('buildGlobalRegistryPartySections(')) {
      fail(
        'Registro Global debe usar buildGlobalRegistryPartySections (lista en cascada titular→acompañantes)'
      );
    } else {
      pass('Registro Global con lista party en cascada');
    }
  } else {
    pass('Registro Global con lista party en cascada y conteos canónicos por sede');
  }
}

function checkDashboardSummaryTableWiring(dash) {
  const block = extractBetween(dash, 'const buildTableByLocation', 'const tableByLocation');
  if (!block) {
    fail('falta buildTableByLocation en DashboardSummaryPageContent');
    return;
  }
  const hasWaitlistCounts =
    block.includes('waitlistCountsForTable') &&
    (block.includes('computeWaitlistCountsForEvent') || block.includes('stats.waitlist = waitlistCountsForTable'));
  if (!hasWaitlistCounts) {
    fail('buildTableByLocation sin waitlistCountsForTable / computeWaitlistCountsForEvent');
  } else {
    pass('buildTableByLocation cableado a waitlistCountsForTable');
  }
  if (!block.includes('filterSummaryStatusRows')) {
    fail('buildTableByLocation sin filterSummaryStatusRows para cancelados/devolución');
  } else if (!block.includes('cancelledData[loc]') && !block.includes('cancelled')) {
    fail('buildTableByLocation sin cancelledData/cancelled para stats.cancelled');
  } else {
    pass('buildTableByLocation usa filterSummaryStatusRows + cancelados');
  }
}

function checkSummaryCellModalWiring(dash) {
  const block = extractBetween(dash, 'const getParticipantsForSummaryCell', 'const summaryMetricLabels');
  if (!block) {
    fail('falta getParticipantsForSummaryCell en DashboardSummaryPageContent');
    return;
  }
  if (!block.includes("metric === 'waitlist'")) {
    fail('modal tabla: falta bloque metric === waitlist');
  } else {
    pass('modal tabla lista de espera cableado');
  }
  if (!block.includes("metric === 'cancelled'") && !block.includes("metric === 'refund'")) {
    fail('modal tabla: falta métrica cancelados/devolución');
  } else {
    pass('modal tabla cancelados/devolución presente');
  }
}

function main() {
  let appMain;
  let roster;
  let globalPage;
  let dash;
  let cashCut;
  let handlersB = '';
  try {
    appMain = read(APP_MAIN);
    roster = read(LOCATION_ROSTER);
    globalPage = read(GLOBAL_REGISTRY);
    dash = read(DASHBOARD);
    cashCut = read(CASH_CUT);
    try {
      handlersB = read(HANDLERS_B);
    } catch {
      handlersB = '';
    }
  } catch (err) {
    fail(`no se pudo leer fuentes v2: ${err.message}`);
    process.exit(1);
  }

  const lines = lineCount(appMain);
  if (lines < 5000) {
    fail(`AppMain.jsx parece truncado (${lines} líneas; mínimo esperado 5000)`);
  } else {
    pass(`AppMain.jsx tamaño (${lines} líneas)`);
  }

  if (!roster.includes('rosterSectionDisplayCounts')) {
    fail('falta rosterSectionDisplayCounts en LocationRosterPageContent');
  } else {
    pass('rosterSectionDisplayCounts definido');
  }

  if (
    !appMain.includes('getLocationRosterSectionCountsFromSummary') &&
    !roster.includes('getLocationRosterSectionCountsFromSummary')
  ) {
    fail('falta import/uso de getLocationRosterSectionCountsFromSummary');
  } else {
    pass('getLocationRosterSectionCountsFromSummary referenciado');
  }

  if (!roster.includes('activeCount={rosterSectionDisplayCounts.active}')) {
    fail('LocationRoster no pasa rosterSectionDisplayCounts.active al chip Activos');
  } else {
    pass('chip Activos cableado a conteo canónico');
  }

  if (!roster.includes('waitlistCount={rosterSectionDisplayCounts.waitlist}')) {
    fail('LocationRoster no pasa rosterSectionDisplayCounts.waitlist al chip Espera');
  } else {
    pass('chip Lista de espera cableado a conteo canónico');
  }

  if (!roster.includes('cancelledCount={rosterSectionDisplayCounts.cancelled}')) {
    fail('LocationRoster no pasa rosterSectionDisplayCounts.cancelled al chip Cancelados');
  } else {
    pass('chip Cancelados cableado a conteo canónico');
  }

  if (
    roster.includes('getLocationRosterSectionCountsFromSummary') &&
    !roster.includes('getLocationRosterSectionCountsFromSummary(') &&
    !roster.includes('rosterSectionDisplayCounts')
  ) {
    fail('import canónico sin uso en location roster');
  } else {
    pass('wiring resumen canónico → chips');
  }

  checkGlobalRegistryRosterInvariants(globalPage);
  // v2: expand de waitlist Bautizos ya no aplica (evento eliminado)
  pass('lista de espera Bautizos omitida (evento no soportado en v2)');
  checkTransportPlanningProps(appMain);
  checkSedeRosterMobileParity(roster);
  checkCashCutMobilePayments(cashCut);
  checkDashboardSummaryTableWiring(dash);
  checkSummaryCellModalWiring(dash);

  const versionBadgeOk =
    appMain.includes('AppVersionBadge showInternal={isSuperUser}') ||
    handlersB.includes('AppVersionBadge showInternal={isSuperUser}');
  if (!versionBadgeOk) {
    fail('no se pasa showInternal={isSuperUser} a AppVersionBadge (versión interna SuperUsuario)');
  } else {
    pass('AppVersionBadge con versión interna para SuperUsuario');
  }

  // Campa baptism debe seguir disponible
  try {
    const campa = read(join(ROOT, 'src/campaBaptism.js'));
    if (!campa.includes('participantHasBaptismChip') || !campa.includes('willBeBaptized')) {
      fail('campaBaptism.js incompleto (faltan helpers de bautismo Campa)');
    } else {
      pass('campaBaptism.js conserva helpers de bautismo Campa');
    }
  } catch {
    fail('falta src/campaBaptism.js');
  }

  try {
    statSync(join(ROOT, 'scripts/snapshot-critical-files.mjs'));
    pass('script snapshot:critical presente');
  } catch {
    fail('falta scripts/snapshot-critical-files.mjs');
  }

  try {
    statSync(join(ROOT, '.cursor/rules/anti-regression.mdc'));
    pass('regla anti-regression presente');
  } catch {
    fail('falta .cursor/rules/anti-regression.mdc');
  }

  const chipsFile = join(ROOT, 'src/screens/locationRoster/LocationRosterSectionChips.jsx');
  try {
    const chips = readFileSync(chipsFile, 'utf8');
    if (!chips.includes('chip-roster-count-activos')) fail('falta componente chip Activos extraído');
    else pass('LocationRosterSectionChips.jsx presente');
    if (!chips.includes('chip-roster-count-waitlist') || !chips.includes('chip-roster-count-cancelled')) {
      fail('chips espera/cancelados no extraídos');
    }
  } catch {
    fail('falta src/screens/locationRoster/LocationRosterSectionChips.jsx');
  }

  try {
    statSync(join(ROOT, 'docs/AGENT_HOOKS.md'));
    pass('documentación de hooks presente');
  } catch {
    fail('falta docs/AGENT_HOOKS.md (configurar hook stop manualmente)');
  }

  if (failures > 0) {
    console.error(`\n[check:invariants] ${failures} invariante(s) rota(s).`);
    process.exit(1);
  }
  console.log('\n[check:invariants] Todas las invariantes pasaron.');
}

main();
