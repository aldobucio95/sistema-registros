/**
 * Finish extraction: remove render bodies from App.jsx (bottom-up), clean shell, fix imports.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const appPath = path.join(root, 'src', 'App.jsx');

const RENDER_FNS = [
  'renderCashCutPage',
  'renderExpenseListPage',
  'renderGlobalRegistryPage',
  'renderServerProfilesPage',
  'renderSummary',
];

// Remove from bottom of file upward so end markers stay valid.
const BLOCK_REMOVALS = [
  ['const renderGlobalRegistryPage = () => {', 'const renderServerProfilesPage = () => {'],
  ['const renderServerProfilesPage = () => {', 'const workspaceShell = mergeWorkspaceShellParts'],
  ['const renderDuplicateGroups = (clusters, context) => {', 'const renderSummary = () => {'],
  ['const renderCompanionCollisionGroups = (clusters, context = \'summary\') => {', 'const renderDuplicateGroups = (clusters, context) => {'],
  ['const renderDupPersonDetail = (p, duplicateCluster = null) => {', 'const renderCompanionCollisionGroups = (clusters, context = \'summary\') => {'],
  ['const toggleDupGroup = (key) => {', 'const renderDupPersonDetail = (p, duplicateCluster = null) => {'],
  ['const renderExpenseListPage = () => {', 'const toggleDupGroup = (key) => {'],
  ['const renderCashCutPage = () => {', 'const renderExpenseListPage = () => {'],
  ['const renderSummary = () => {', 'const bautizosCompanionChipCountByRegistrant = bautizosRosterIndex.companionChipCountByRegistrant;'],
  ['const renderSummaryDashScopeSlot = useCallback(', 'const buildExcelExportSectionAvailability = useCallback(() => {'],
  ['const renderBautizosDashboardFixedScopeBar = useCallback(() => {', 'const renderSummaryDashScopeSlot = useCallback('],
  ['const renderCampaScopeSegmentToggle = useCallback(', 'const renderBautizosDashboardFixedScopeBar = useCallback(() => {'],
];

function removeBetween(text, startMarker, endMarker) {
  const startIdx = text.indexOf(startMarker);
  if (startIdx === -1) {
    console.warn('Skip (start not found):', startMarker.slice(0, 55));
    return text;
  }
  const endIdx = text.indexOf(endMarker, startIdx + startMarker.length);
  if (endIdx === -1) {
    console.warn('Skip (end not found):', endMarker.slice(0, 55));
    return text;
  }
  console.log('Removed', startMarker.slice(0, 45), '...', (endIdx - startIdx), 'chars');
  return text.slice(0, startIdx) + text.slice(endIdx);
}

let app = fs.readFileSync(appPath, 'utf8');
const beforeLines = app.split('\n').length;

for (const [s, e] of BLOCK_REMOVALS) app = removeBetween(app, s, e);
for (const fn of RENDER_FNS) {
  if (app.includes(`      ${fn},\n`)) {
    app = app.replace(`      ${fn},\n`, '');
    console.log('Removed shell ref:', fn);
  }
}

fs.writeFileSync(appPath, app, 'utf8');
console.log(`App.jsx: ${beforeLines} -> ${app.split('\n').length} lines`);

const pageFiles = [
  'src/features/finance/CashCutPageContent.jsx',
  'src/features/finance/ExpenseListPageContent.jsx',
  'src/features/globalRegistry/GlobalRegistryPageContent.jsx',
  'src/features/servers/ServerProfilesPageContent.jsx',
  'src/features/dashboard/DashboardSummaryPageContent.jsx',
];

const INVALID_SHELL_KEYS = new Set([
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  'L', 'SI', 'el', 'en', 'la', 'gr', 'ef', 'bz', 'pt', 'res', 'ref', 'cap', 'top', 'tot', 'all', 'map', 'set', 'key', 'keys', 'id', 'cell',
  'body', 'card', 'row', 'rows', 'col', 'cols', 'show', 'type', 'text', 'name', 'event', 'unit', 'step', 'self', 'prev', 'next', 'slice',
  'start', 'end', 'min', 'max', 'count', 'total', 'amount', 'method', 'service', 'location', 'locations', 'action', 'target', 'panel',
  'partial', 'expanded', 'available', 'allowed', 'checked', 'active', 'pending', 'invalid', 'entries', 'items', 'stats', 'base', 'balance',
  'has', 'hay', 'lista', 'nombre', 'fecha', 'estado', 'participante', 'tipo', 'sede', 'seg', 'mb', 'w', 'u', 'v', 'ackKeys', 'canonicalizeVnpPersonId',
]);

for (const rel of pageFiles) {
  const p = path.join(root, rel);
  let src = fs.readFileSync(p, 'utf8');
  src = src.replace(/^import \{ React \} from 'react';\n/m, '');
  src = src.replace(/^import \{ useCallback \} from 'react';\n/m, '');
  src = src.replace(
    /import \{ RosterSectionScrollWrap \} from '([^']+)';/,
    "import RosterSectionScrollWrap from '$1';"
  );
  const destructureMatch = src.match(/const \{\n([\s\S]*?)\n  \} = useWorkspaceShell\(\);/);
  if (destructureMatch) {
    const keys = destructureMatch[1]
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)
      .filter((k) => !INVALID_SHELL_KEYS.has(k));
    src = src.replace(
      /const \{\n[\s\S]*?\n  \} = useWorkspaceShell\(\);/,
      `const {\n    ${keys.join(',\n    ')}\n  } = useWorkspaceShell();`
    );
  }
  fs.writeFileSync(p, src, 'utf8');
}

app = fs.readFileSync(appPath, 'utf8');
const shellNeeded = new Set();
for (const rel of pageFiles) {
  const src = fs.readFileSync(path.join(root, rel), 'utf8');
  const m = src.match(/const \{\n([\s\S]*?)\n  \} = useWorkspaceShell\(\);/);
  if (m) for (const k of m[1].split(',').map((x) => x.trim()).filter(Boolean)) shellNeeded.add(k);
}

const shellStart = app.indexOf('const workspaceShell = mergeWorkspaceShellParts');
const shellEnd = app.indexOf(']);', shellStart);
const shellBlock = app.slice(shellStart, shellEnd);
const existingShell = new Set();
for (const m of shellBlock.matchAll(/^\s+([A-Za-z_$][\w$]*)\s*,?\s*$/gm)) existingShell.add(m[1]);

const toAdd = [...shellNeeded].filter((k) => !existingShell.has(k)).sort();
if (toAdd.length) {
  const marker = '      resetEditRegistryModal,\n    },\n  ]);';
  const insert = toAdd.map((k) => `      ${k},`).join('\n') + '\n';
  if (app.includes(marker)) {
    app = app.replace(marker, insert + '      resetEditRegistryModal,\n    },\n  ]);');
    fs.writeFileSync(appPath, app, 'utf8');
    console.log('Added', toAdd.length, 'shell keys');
  }
}

console.log('Done');
