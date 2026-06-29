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
