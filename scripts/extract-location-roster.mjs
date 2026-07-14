/**
 * Extract renderLocationSheet from App.jsx into LocationRosterPageContent + NewRegistrationModal.
 * Run: node scripts/extract-location-roster.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const appPath = path.join(root, 'src', 'App.jsx');

const MODAL_OUTER_START = '      {newRegModalOpen && canAddRegistrations(currentUser) && (';
const MODAL_OUTER_END = '      )}\n\n      <div className={uiLocationNewRegCta.listDivider}>';
const MODAL_REPLACEMENT = '      <NewRegistrationModal loc={loc} />\n\n      <div className={uiLocationNewRegCta.listDivider}>';

const EDITOR_FIELD_HELPERS = `    const restrictEditorForm = currentUser?.role === 'Editor';
    const blockAdminInputs = currentUser?.role === 'Administrador';
    const fv = (key) => !restrictEditorForm || editorRegistrationFieldVis[key] !== false;
    const fieldBlocked = (key) => blockAdminInputs && editorRegistrationFieldVis[key] === false;
`;

function extractBetween(text, startMarker, endMarker) {
  const startIdx = text.indexOf(startMarker);
  if (startIdx === -1) throw new Error(`Start marker not found: ${startMarker.slice(0, 60)}`);
  const endIdx = text.indexOf(endMarker, startIdx + startMarker.length);
  if (endIdx === -1) throw new Error(`End marker not found: ${endMarker.slice(0, 60)}`);
  return text.slice(startIdx, endIdx + endMarker.length);
}

function extractBody(fnBlock) {
  const open = fnBlock.indexOf('{');
  let depth = 0;
  for (let i = open; i < fnBlock.length; i++) {
    if (fnBlock[i] === '{') depth++;
    else if (fnBlock[i] === '}') {
      depth--;
      if (depth === 0) return fnBlock.slice(open + 1, i);
    }
  }
  throw new Error('Unbalanced braces');
}

function parseShellKeys(appText) {
  const keys = new Set();
  const shellStart = appText.indexOf('const workspaceShell = mergeWorkspaceShellParts');
  const shellEnd = appText.indexOf(']);', shellStart);
  const shellBlock = appText.slice(shellStart, shellEnd);
  for (const m of shellBlock.matchAll(/^\s+([A-Za-z_$][\w$]*)\s*,?\s*$/gm)) keys.add(m[1]);
  return keys;
}

function parseAppImports(appText) {
  const appStart = appText.indexOf('const App = () => {');
  const header = appText.slice(0, appStart);
  const imports = new Map();
  for (const m of header.matchAll(/^import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/gm)) {
    const stmt = m[0];
    const from = m[2];
    if (stmt.includes('{')) {
      for (const part of stmt.match(/\{([\s\S]*?)\}/)[1].split(',')) {
        const bit = part.trim();
        if (!bit) continue;
        const asMatch = bit.match(/^([\w$]+)\s+as\s+([\w$]+)$/);
        if (asMatch) imports.set(asMatch[2], from);
        else imports.set(bit.split(/\s+/)[0], from);
      }
    }
    const def = stmt.match(/^import\s+([\w$]+)\s*,/);
    if (def) imports.set(def[1], from);
    const defOnly = stmt.match(/^import\s+([\w$]+)\s+from/);
    if (defOnly && !stmt.includes('{')) imports.set(defOnly[1], from);
  }
  return { header, imports };
}

function parseModuleLevelNames(header) {
  const names = new Set();
  for (const m of header.matchAll(/(?:^|\n)(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  for (const m of header.matchAll(/(?:^|\n)(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=/g)) names.add(m[1]);
  return names;
}

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

function collectIdentifiers(code) {
  const ids = new Set();
  const reserved = new Set([
    'true', 'false', 'null', 'undefined', 'this', 'return', 'if', 'else', 'for', 'while', 'switch', 'case', 'break',
    'continue', 'new', 'typeof', 'instanceof', 'in', 'of', 'try', 'catch', 'finally', 'throw', 'function', 'class',
    'const', 'let', 'var', 'import', 'export', 'default', 'async', 'await', 'void', 'delete', 'do', 'with', 'yield',
  ]);
  for (const m of code.matchAll(/\b([A-Za-z_$][\w$]*)\b/g)) {
    if (!reserved.has(m[1])) ids.add(m[1]);
  }
  return ids;
}

function collectLocalDeclared(code) {
  const local = new Set(['loc']);
  for (const m of code.matchAll(/\b(?:const|let|function|class)\s+([A-Za-z_$][\w$]*)/g)) local.add(m[1]);
  for (const m of code.matchAll(/\b(?:const|let)\s+\{([^}]+)\}/g)) {
    for (const part of m[1].split(',')) {
      const name = part.split(':')[0].trim().split('=')[0].trim();
      if (name) local.add(name);
    }
  }
  for (const m of code.matchAll(/\(([A-Za-z_$][\w$]*(?:,\s*[A-Za-z_$][\w$]*)*)\)\s*=>/g)) {
    for (const p of m[1].split(',')) local.add(p.trim());
  }
  return local;
}

function relImport(fromAppImport, outFile) {
  if (!fromAppImport.startsWith('.')) return fromAppImport;
  const outDir = path.dirname(path.join(root, outFile));
  const abs = path.normalize(path.join(root, 'src', fromAppImport.replace(/^\.\//, '')));
  let rel = path.relative(outDir, abs).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

function shellImportPath(outFile) {
  const outDir = path.dirname(path.join(root, outFile));
  const shellAbs = path.join(root, 'src/screens/eventWorkspace/WorkspaceShellContext.jsx');
  let rel = path.relative(outDir, shellAbs).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

function groupImports(importMap) {
  const byFrom = new Map();
  for (const [name, from] of importMap) {
    if (!byFrom.has(from)) byFrom.set(from, []);
    byFrom.get(from).push(name);
  }
  return byFrom;
}

function buildImportLines(byFrom, outFile) {
  const lines = [];
  for (const [from, names] of [...byFrom.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const rel = relImport(from, outFile);
    lines.push(`import { ${[...new Set(names)].sort().join(', ')} } from '${rel}';`);
  }
  return lines.join('\n');
}

function buildComponent({ componentName, body, outFile, shellKeys, moduleImports, extraImports = '', props = '' }) {
  const destructure = [...shellKeys].sort().join(',\n    ');
  const reactImport = extraImports || "import React from 'react';\n";
  const moduleImportBlock = moduleImports ? moduleImports + '\n' : '';
  return `${reactImport}${moduleImportBlock}import { useWorkspaceShell } from '${shellImportPath(outFile)}';

export default function ${componentName}(${props}) {
  const {
    ${destructure}
  } = useWorkspaceShell();

${body.trimEnd()}
}
`;
}

function resolveNeeded(code, allShellCandidates, shellKeysAll, appImports) {
  const ids = collectIdentifiers(code);
  const localDeclared = collectLocalDeclared(code);
  const neededShell = [...ids]
    .filter((id) => allShellCandidates.has(id) && !localDeclared.has(id))
    .sort();
  const neededImports = new Map();
  for (const id of ids) {
    if (localDeclared.has(id) || allShellCandidates.has(id)) continue;
    if (appImports.has(id)) neededImports.set(id, appImports.get(id));
  }
  const toAddShell = neededShell.filter((k) => !shellKeysAll.has(k));
  return { neededShell, neededImports, toAddShell };
}

let appText = fs.readFileSync(appPath, 'utf8');
const shellKeysAll = parseShellKeys(appText);
const { header, imports: appImports } = parseAppImports(appText);
const moduleNames = parseModuleLevelNames(header);
const appBindings = parseAppBindings(appText);
const allShellCandidates = new Set([...shellKeysAll, ...appBindings, ...moduleNames]);

const fnBlock = extractBetween(appText, 'const renderLocationSheet = (loc) => {', 'const renderGlobalRegistryListToolbar = (baseRowsForCounts');
let fnBody = extractBody(fnBlock);

if (!fnBody.includes(MODAL_OUTER_START)) throw new Error('Modal outer start not found in renderLocationSheet body');
const modalOuterBlock = extractBetween(fnBody, MODAL_OUTER_START, MODAL_OUTER_END);

const providerStart = '        <NewRegModalDraftProvider';
const providerEnd = '        </NewRegModalDraftProvider>';
const providerIdx = modalOuterBlock.indexOf(providerStart);
const providerEndIdx = modalOuterBlock.indexOf(providerEnd);
if (providerIdx === -1 || providerEndIdx === -1) throw new Error('NewRegModalDraftProvider block not found');

const providerBlock = modalOuterBlock.slice(providerIdx, providerEndIdx + providerEnd.length);

// Inner children callback body: from `{({` through `}}` before `</NewRegModalDraftProvider>`
const childrenStart = providerBlock.indexOf('{({');
const childrenOpen = providerBlock.indexOf('}) => {', childrenStart);
const childrenClose = providerBlock.lastIndexOf('          }}');
const childrenInner = providerBlock.slice(childrenOpen + '}) => {'.length, childrenClose).trim();

const modalComponentBody = `${EDITOR_FIELD_HELPERS}
  if (!newRegModalOpen || !canAddRegistrations(currentUser)) return null;

  return (
${providerBlock.replace(
  childrenInner,
  childrenInner
)}
  );
`;

// Build modal file - reconstruct provider with same props
const modalProviderProps = providerBlock.slice(0, childrenStart).trim();
const modalInnerForFile = `${EDITOR_FIELD_HELPERS}
  if (!newRegModalOpen || !canAddRegistrations(currentUser)) return null;

  return (
    ${modalProviderProps}
      {({
            draft,
            setDraft,
            draftRef,
            profileSearch,
            setProfileSearch,
            profileImportMatches,
            companionCollisionHint: newRegCompanionCollisionHint,
          }) => {
${childrenInner}
          }}
    </NewRegModalDraftProvider>
  );
`;

// Simpler: extract exact provider block from source and wrap
const modalFullBody = `${EDITOR_FIELD_HELPERS}
  if (!newRegModalOpen || !canAddRegistrations(currentUser)) return null;

  return (
${providerBlock}
  );
`;

const pageBody = fnBody
  .replace(modalOuterBlock, MODAL_REPLACEMENT)
  .replace(EDITOR_FIELD_HELPERS, '');

const contentOut = 'src/features/locationRoster/LocationRosterPageContent.jsx';
const modalOut = 'src/features/locationRoster/NewRegistrationModal.jsx';

const pageResolved = resolveNeeded(pageBody, allShellCandidates, shellKeysAll, appImports);
const modalResolved = resolveNeeded(modalFullBody, allShellCandidates, shellKeysAll, appImports);

// NewRegistrationModal needs NewRegModalDraftProvider import
const modalImports = new Map(pageResolved.neededImports);
modalImports.set('NewRegModalDraftProvider', './components/registration/NewRegModalDraftProvider.jsx');

for (const [k, v] of modalResolved.neededImports) modalImports.set(k, v);
// Remove NewRegModalDraftProvider from page imports if present
pageResolved.neededImports.delete('NewRegModalDraftProvider');

const pageComponent = buildComponent({
  componentName: 'LocationRosterPageContent',
  body: pageBody,
  outFile: contentOut,
  shellKeys: pageResolved.neededShell,
  moduleImports: [
    buildImportLines(groupImports(pageResolved.neededImports), contentOut),
    "import NewRegistrationModal from './NewRegistrationModal.jsx';",
  ].filter(Boolean).join('\n'),
  props: '{ loc }',
});

const modalComponent = buildComponent({
  componentName: 'NewRegistrationModal',
  body: modalFullBody,
  outFile: modalOut,
  shellKeys: modalResolved.neededShell,
  moduleImports: buildImportLines(groupImports(modalImports), modalOut),
  props: '{ loc }',
});

const pageDir = path.join(root, 'src/features/locationRoster');
fs.mkdirSync(pageDir, { recursive: true });
fs.writeFileSync(path.join(root, contentOut), pageComponent, 'utf8');
fs.writeFileSync(path.join(root, modalOut), modalComponent, 'utf8');

// Update LocationRosterPage.jsx
fs.writeFileSync(
  path.join(root, 'src/features/workspace/pages/LocationRosterPage.jsx'),
  `import React from 'react';
import LocationRosterPageContent from '../../locationRoster/LocationRosterPageContent.jsx';

export default function LocationRosterPage({ loc }) {
  return <LocationRosterPageContent loc={loc} />;
}
`,
  'utf8'
);

// Remove renderLocationSheet from App.jsx
const renderStart = 'const renderLocationSheet = (loc) => {';
const renderEnd = 'const renderGlobalRegistryListToolbar = (baseRowsForCounts';
const startIdx = appText.indexOf(renderStart);
const endIdx = appText.indexOf(renderEnd, startIdx);
if (startIdx === -1 || endIdx === -1) throw new Error('renderLocationSheet block not found for removal');
appText = appText.slice(0, startIdx) + appText.slice(endIdx);
appText = appText.replace(/\n      renderLocationSheet,\n/, '\n');

// Add missing shell keys
const allToAdd = [...new Set([...pageResolved.toAddShell, ...modalResolved.toAddShell])].sort();
if (allToAdd.length) {
  const marker = '      resetEditRegistryModal,\n    },\n  ]);';
  const insert = allToAdd.map((k) => `      ${k},`).join('\n') + '\n';
  if (!appText.includes(marker)) throw new Error('Shell merge marker not found');
  appText = appText.replace(marker, insert + '      resetEditRegistryModal,\n    },\n  ]);');
}

fs.writeFileSync(appPath, appText, 'utf8');

console.log(`Created ${contentOut} (${pageComponent.split('\n').length} lines)`);
console.log(`Created ${modalOut} (${modalComponent.split('\n').length} lines)`);
console.log(`App.jsx now ${appText.split('\n').length} lines`);
console.log('Added shell keys:', allToAdd.join(', ') || '(none)');
console.log(`Page shell deps: ${pageResolved.neededShell.length}, Modal shell deps: ${modalResolved.neededShell.length}`);
