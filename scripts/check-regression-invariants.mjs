/**
 * Comprueba invariantes de negocio conocidas (anti-regresión).
 * Uso: pnpm run check:invariants
 */
import { readFileSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const APP = join(ROOT, 'src/App.jsx');

let failures = 0;

function fail(msg) {
  console.error(`[check:invariants] FAIL: ${msg}`);
  failures += 1;
}

function pass(msg) {
  console.log(`[check:invariants] OK: ${msg}`);
}

function readApp() {
  return readFileSync(APP, 'utf8');
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

/** Falla si el componente se importa pero no aparece como JSX (<Name …>). */
function checkImportedComponentUsedAsJsx(app, componentName) {
  const importRe = new RegExp(`import\\s+${componentName}\\s+from`);
  const jsxRe = new RegExp(`<${componentName}[\\s/>]`);
  if (!importRe.test(app)) return;
  if (!jsxRe.test(app)) {
    fail(`${componentName} importado en App.jsx pero nunca usado como <${componentName}>`);
  } else {
    pass(`${componentName} importado y usado en JSX`);
  }
}

function checkSymbolInvoked(app, symbolName) {
  if (!app.includes(symbolName)) return false;
  const callRe = new RegExp(`${symbolName}\\s*\\(`);
  return callRe.test(app);
}

function checkCompanionWaitlistWiring(app) {
  const waitlistExpandOk =
    checkSymbolInvoked(app, 'expandBautizosWaitlistRegistryRows') ||
    checkSymbolInvoked(app, 'collectCompanionWaitlistVirtualRows');
  if (!waitlistExpandOk) {
    fail(
      'lista de espera bautizos: falta invocar expandBautizosWaitlistRegistryRows o collectCompanionWaitlistVirtualRows'
    );
  } else {
    pass('acompañantes en espera cableados (expand o collect virtual rows)');
  }
}

function checkTransportPlanningProps(app) {
  const block = extractBetween(app, 'const renderTransportPlanningPage', 'const renderCashCutPage');
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

function checkSedeRosterMobileParity(app) {
  const locSheet = extractBetween(app, 'const renderLocationSheet = (loc) => {', 'const renderGlobalRegistryPage');
  const activosHasMobile =
    locSheet.includes('renderRosterPersonMobileCard') && locSheet.includes('uiRosterMobile.list');
  const waitlistHasMobile =
    /showRosterWaitlist[\s\S]{0,2500}renderRosterPersonMobileCard/.test(locSheet);
  const cancelledHasMobile =
    /showRosterCancelled[\s\S]{0,2500}renderRosterPersonMobileCard/.test(locSheet);
  if (!activosHasMobile) {
    fail('sección Activos sin tarjetas móvil (renderRosterPersonMobileCard / uiRosterMobile.list)');
  } else if (!waitlistHasMobile || !cancelledHasMobile) {
    fail('Espera o Cancelados sin tarjetas móvil (solo Activos tiene cards)');
  } else {
    pass('secciones sede Activos/Espera/Cancelados con tarjetas móvil');
  }
}

function checkCashCutMobilePayments(app) {
  const cashCut = extractBetween(app, 'const renderCashCutPage = () => {', 'const renderGlobalRegistryPage');
  const ok =
    cashCut.includes('renderCashCutPaymentsBlock') ||
    cashCut.includes('uiCashCutSedeService.paymentsList');
  if (!ok) {
    fail('Corte de caja sin lista móvil de pagos (renderCashCutPaymentsBlock o paymentsList)');
  } else {
    pass('Corte de caja con lista móvil de pagos');
  }
}

function checkGlobalRegistryRosterInvariants(app) {
  const hasRowsBlock = app.includes('renderGlobalRegistryRowsBlock');
  const globalPage = extractBetween(
    app,
    'const renderGlobalRegistryPage = () => {',
    'const renderServerProfilesPage'
  );
  const hasThreeSectionsInGlobal =
    hasRowsBlock ||
    (globalPage.includes('Activos (inscritos)') &&
      globalPage.includes('Lista de espera') &&
      globalPage.includes('Cancelados'));
  if (!hasThreeSectionsInGlobal) {
    fail(
      'Registro Global sin bloque de 3 secciones (Activos / Lista de espera / Cancelados): falta renderGlobalRegistryRowsBlock o equivalente'
    );
  } else {
    pass('Registro Global con secciones Activos / Espera / Cancelados');
  }

  if (!app.includes('expandBautizosGlobalRegistryRows')) {
    fail('falta expandBautizosGlobalRegistryRows en App.jsx (import o uso)');
  } else if (!app.includes('expandBautizosGlobalRegistryRows(')) {
    fail('expandBautizosGlobalRegistryRows importado pero nunca invocado en App.jsx');
  } else {
    pass('expandBautizosGlobalRegistryRows referenciado e invocado');
  }
}

function main() {
  let app;
  try {
    app = readApp();
  } catch (err) {
    fail(`no se pudo leer App.jsx: ${err.message}`);
    process.exit(1);
  }

  const lines = lineCount(app);
  if (lines < 35000) {
    fail(`App.jsx parece truncado (${lines} líneas; mínimo esperado 35000)`);
  } else {
    pass(`App.jsx tamaño (${lines} líneas)`);
  }

  if (!app.includes('rosterSectionDisplayCounts')) {
    fail('falta rosterSectionDisplayCounts en App.jsx');
  } else {
    pass('rosterSectionDisplayCounts definido');
  }

  if (!app.includes('getLocationRosterSectionCountsFromSummary')) {
    fail('falta import/uso de getLocationRosterSectionCountsFromSummary');
  } else {
    pass('getLocationRosterSectionCountsFromSummary referenciado');
  }

  if (!app.includes('activeCount={rosterSectionDisplayCounts.active}')) {
    fail('App.jsx no pasa rosterSectionDisplayCounts.active al chip Activos');
  } else {
    pass('chip Activos cableado a conteo canónico');
  }

  if (!app.includes('waitlistCount={rosterSectionDisplayCounts.waitlist}')) {
    fail('App.jsx no pasa rosterSectionDisplayCounts.waitlist al chip Espera');
  } else {
    pass('chip Lista de espera cableado a conteo canónico');
  }

  if (!app.includes('cancelledCount={rosterSectionDisplayCounts.cancelled}')) {
    fail('App.jsx no pasa rosterSectionDisplayCounts.cancelled al chip Cancelados');
  } else {
    pass('chip Cancelados cableado a conteo canónico');
  }

  if (
    app.includes("import { buildLocationRosterTypeSummaryByStatus, getLocationRosterSectionCountsFromSummary }") &&
    !app.includes('getLocationRosterSectionCountsFromSummary(locationTypeSummary)')
  ) {
    fail('import canónico sin uso en locationTypeSummary');
  } else {
    pass('wiring resumen canónico → chips');
  }

  checkImportedComponentUsedAsJsx(app, 'RosterSectionScrollWrap');
  checkImportedComponentUsedAsJsx(app, 'RosterParticipantMobileCard');
  checkGlobalRegistryRosterInvariants(app);
  checkCompanionWaitlistWiring(app);
  checkTransportPlanningProps(app);
  checkSedeRosterMobileParity(app);
  checkCashCutMobilePayments(app);

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
