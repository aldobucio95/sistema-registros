/**
 * Clean LocationRoster extraction: fix imports, shell destructure, App.jsx shell merge.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const appPath = path.join(root, 'src', 'App.jsx');

const PAGE_FILES = [
  'src/features/locationRoster/LocationRosterPageContent.jsx',
  'src/features/locationRoster/NewRegistrationModal.jsx',
];

const INVALID_SHELL_KEYS = new Set([
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  'L', 'el', 'en', 'la', 'gr', 'ef', 'bz', 'pt', 'res', 'ref', 'cap', 'top', 'tot', 'all', 'map', 'set', 'key', 'keys', 'id', 'cell',
  'body', 'card', 'row', 'rows', 'col', 'cols', 'show', 'type', 'text', 'name', 'event', 'unit', 'step', 'self', 'prev', 'next', 'slice',
  'start', 'end', 'min', 'max', 'count', 'total', 'amount', 'method', 'service', 'location', 'locations', 'action', 'target', 'panel',
  'partial', 'expanded', 'available', 'allowed', 'checked', 'active', 'pending', 'invalid', 'entries', 'items', 'stats', 'base', 'balance',
  'has', 'hay', 'lista', 'nombre', 'fecha', 'estado', 'participante', 'tipo', 'sede', 'seg', 'mb', 'w', 'u', 'v', 'ackKeys',
  'current', 'displayMembers', 'displayName', 'donationId', 'draft', 'entry', 'eventId', 'eventType', 'host', 'hostId', 'hostPerson',
  'hostSourceKey', 'kind', 'label', 'locFieldSuggestions', 'locLabel', 'locSugList', 'local', 'na', 'ok', 'paid', 'personId',
  'personName', 'phone', 'plan', 'preferred', 'privacyAccepted', 'reason', 'single', 'status', 'teens', 'jovenes', 'ambos', 'campa',
  'companion', 'companions', 'concept', 'header', 'missingInitialPaid', 'cardAllowedNewReg', 'baseCost', 'displayIndex',
]);

const SHELL_ONLY_FROM_APP = new Set([
  'ATTENDANCE_SPECIAL', 'CopyButton', 'DASHBOARD_COMMISSION_VIEW_TITLE', 'DEFAULT_ALLERGY_OPTIONS', 'DEFAULT_SERVE_AREA_OPTIONS',
  'GENDERS', 'NEW_REG_DONATION_BTN', 'NEW_REG_TOOLBAR_INDIGO_BTN', 'REGISTRY_CONFIRM_BAUTIZOS_EMPTY', 'RESPONSIVA_STATUSES',
  'ROSTER_LIST_TABLE_CLASS', 'ROSTER_QUICK_ACTIONS_ROW_PRIMARY', 'ROSTER_QUICK_ACTION_BTN_BASE', 'ROSTER_QUICK_ACTION_ICON_PROPS',
  'ROSTER_TD_ACTIONS', 'ROSTER_TD_FINANCES', 'ROSTER_TH_ACTIONS', 'ROSTER_TH_FINANCES', 'ROSTER_TH_PARTICIPANT',
  'RosterListColgroup', 'RosterPersonOfInterestButton', 'RosterResponsivaLocalButton', 'RosterResponsivaWaButton', 'RosterWhatsAppButton',
  'SI', 'fieldStack', 'inputClasses', 'labelClasses', 'newRegGeneralCommentRef',
]);

function parseAppBindings(appText) {
  const names = new Set();
  const appStart = appText.indexOf('const App = () => {');
  const appEnd = appText.indexOf('const workspaceShell = mergeWorkspaceShellParts');
  const block = appText.slice(appStart, appEnd);
  for (const m of block.matchAll(/^\s+const\s+\[\s*([^\]]+)\]/gm)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(':')[0].trim();
      if (/^[\w$]+$/.test(name)) names.add(name);
    }
  }
  for (const m of block.matchAll(/^\s+const\s+([A-Za-z_$][\w$]*)\s*=/gm)) names.add(m[1]);
  for (const m of block.matchAll(/^\s+function\s+([A-Za-z_$][\w$]*)\s*\(/gm)) names.add(m[1]);
  return names;
}

function parseModuleLevelNames(header) {
  const names = new Set();
  for (const m of header.matchAll(/(?:^|\n)(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  for (const m of header.matchAll(/(?:^|\n)(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=/g)) names.add(m[1]);
  return names;
}

function cleanPageFile(relPath, appBindings, moduleNames) {
  const p = path.join(root, relPath);
  let src = fs.readFileSync(p, 'utf8');
  src = src.replace(/^import \{ React \} from 'react';\n/m, '');
  src = src.replace(
    /import \{ RosterSectionScrollWrap \} from '([^']+)';/,
    "import RosterSectionScrollWrap from '$1';"
  );

  const m = src.match(/const \{\n([\s\S]*?)\n  \} = useWorkspaceShell\(\);/);
  if (!m) throw new Error(`No shell destructure in ${relPath}`);
  const keys = m[1]
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)
    .filter((k) => !INVALID_SHELL_KEYS.has(k))
    .filter((k) => appBindings.has(k) || moduleNames.has(k) || SHELL_ONLY_FROM_APP.has(k));

  src = src.replace(
    /const \{\n[\s\S]*?\n  \} = useWorkspaceShell\(\);/,
    `const {\n    ${keys.join(',\n    ')}\n  } = useWorkspaceShell();`
  );
  fs.writeFileSync(p, src, 'utf8');
  return keys;
}

let app = fs.readFileSync(appPath, 'utf8');
const appStart = app.indexOf('const App = () => {');
const header = app.slice(0, appStart);
const appBindings = parseAppBindings(app);
const moduleNames = parseModuleLevelNames(header);

const allNeeded = new Set();
for (const rel of PAGE_FILES) {
  for (const k of cleanPageFile(rel, appBindings, moduleNames)) allNeeded.add(k);
}

const shellStart = app.indexOf('const workspaceShell = mergeWorkspaceShellParts');
const shellEnd = app.indexOf(']);', shellStart);
const shellBlock = app.slice(shellStart, shellEnd);
const existingShell = new Set();
for (const m of shellBlock.matchAll(/^\s+([A-Za-z_$][\w$]*)\s*,?\s*$/gm)) existingShell.add(m[1]);

// Remove invalid keys from shell merge
const validShellKeys = [...existingShell].filter((k) => !INVALID_SHELL_KEYS.has(k));
const neededFromPages = [...allNeeded].filter((k) => appBindings.has(k) || moduleNames.has(k) || SHELL_ONLY_FROM_APP.has(k));
const finalShell = new Set(validShellKeys);
for (const k of neededFromPages) finalShell.add(k);
finalShell.delete('renderLocationSheet');

// Rebuild last shell part: from registryConfirmModalEl through resetEditRegistryModal
const lastPartStart = app.indexOf('      registryConfirmModalEl,', shellStart);
const lastPartEnd = app.indexOf('      resetEditRegistryModal,', lastPartStart);
if (lastPartStart === -1 || lastPartEnd === -1) throw new Error('Shell last part markers not found');

const beforeLastPart = app.slice(0, lastPartStart);
const afterReset = app.slice(app.indexOf('    },\n  ]);', lastPartEnd));

const rosterShellKeys = [...finalShell]
  .filter((k) => !existingShell.has(k) || INVALID_SHELL_KEYS.has(k) === false)
  .filter((k) => neededFromPages.includes(k) || SHELL_ONLY_FROM_APP.has(k))
  .sort();

// Keys that were wrongly added - rebuild by removing everything between promoteOverCap and resetEditRegistryModal extras
const cleanExtraKeys = [...new Set([...neededFromPages, ...SHELL_ONLY_FROM_APP])].sort();

const newLastPart = `      registryConfirmModalEl,
      promoteOverCapConfirmModalEl,
${cleanExtraKeys.map((k) => `      ${k},`).join('\n')}
      resetEditRegistryModal,
`;

app = beforeLastPart + newLastPart + afterReset;
fs.writeFileSync(appPath, app, 'utf8');

console.log(`Cleaned shell extras: ${cleanExtraKeys.length} keys`);
console.log(`Page shell keys: ${allNeeded.size}`);
for (const rel of PAGE_FILES) {
  const lines = fs.readFileSync(path.join(root, rel), 'utf8').split('\n').length;
  console.log(`${rel}: ${lines} lines`);
}
console.log(`App.jsx: ${app.split('\n').length} lines`);
