/**
 * Extract render*Page bodies from App.jsx into lazy PageContent components.
 * Run: node scripts/extract-page-contents.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const appPath = path.join(root, 'src', 'App.jsx');

const EXTRACTIONS = [
  {
    renderFn: 'renderCashCutPage',
    componentName: 'CashCutPageContent',
    outFile: 'src/features/finance/CashCutPageContent.jsx',
    pageFile: 'src/features/workspace/pages/CashCutPage.jsx',
    start: 'const renderCashCutPage = () => {',
    end: 'const renderExpenseListPage = () => {',
    extraBlocks: [],
  },
  {
    renderFn: 'renderExpenseListPage',
    componentName: 'ExpenseListPageContent',
    outFile: 'src/features/finance/ExpenseListPageContent.jsx',
    pageFile: 'src/features/workspace/pages/ExpenseListPage.jsx',
    start: 'const renderExpenseListPage = () => {',
    end: 'const toggleDupGroup = (key) => {',
    extraBlocks: [],
  },
  {
    renderFn: 'renderGlobalRegistryPage',
    componentName: 'GlobalRegistryPageContent',
    outFile: 'src/features/globalRegistry/GlobalRegistryPageContent.jsx',
    pageFile: 'src/features/workspace/pages/GlobalRegistryPage.jsx',
    start: 'const renderGlobalRegistryPage = () => {',
    end: 'const renderServerProfilesPage = () => {',
    extraBlocks: [],
  },
  {
    renderFn: 'renderServerProfilesPage',
    componentName: 'ServerProfilesPageContent',
    outFile: 'src/features/servers/ServerProfilesPageContent.jsx',
    pageFile: 'src/features/workspace/pages/ServerProfilesPage.jsx',
    start: 'const renderServerProfilesPage = () => {',
    end: 'const workspaceShell = mergeWorkspaceShellParts',
    extraBlocks: [],
  },
  {
    renderFn: 'renderSummary',
    componentName: 'DashboardSummaryPageContent',
    outFile: 'src/features/dashboard/DashboardSummaryPageContent.jsx',
    pageFile: 'src/features/workspace/pages/DashboardSummaryPage.jsx',
    start: 'const renderSummary = () => {',
    end: 'const bautizosCompanionChipCountByRegistrant = bautizosRosterIndex.companionChipCountByRegistrant;',
    extraBlocks: [
      { start: 'const renderCampaScopeSegmentToggle = useCallback(', end: 'const renderBautizosDashboardFixedScopeBar = useCallback(() => {' },
      { start: 'const renderBautizosDashboardFixedScopeBar = useCallback(() => {', end: 'const renderSummaryDashScopeSlot = useCallback(' },
      { start: 'const renderSummaryDashScopeSlot = useCallback(', end: 'const buildExcelExportSectionAvailability = useCallback(() => {' },
      { start: 'const toggleDupGroup = (key) => {', end: 'const renderDupPersonDetail = (p, duplicateCluster = null) => {' },
      { start: 'const renderDupPersonDetail = (p, duplicateCluster = null) => {', end: 'const renderCompanionCollisionGroups = (clusters, context = \'summary\') => {' },
      { start: 'const renderCompanionCollisionGroups = (clusters, context = \'summary\') => {', end: 'const renderDuplicateGroups = (clusters, context) => {' },
      { start: 'const renderDuplicateGroups = (clusters, context) => {', end: 'const renderSummary = () => {' },
    ],
    extraImports: "import React, { useCallback } from 'react';\n",
  },
];

function extractBetween(text, startMarker, endMarker) {
  const startIdx = text.indexOf(startMarker);
  if (startIdx === -1) throw new Error(`Start marker not found: ${startMarker.slice(0, 60)}`);
  const endIdx = text.indexOf(endMarker, startIdx + startMarker.length);
  if (endIdx === -1) throw new Error(`End marker not found: ${endMarker.slice(0, 60)}`);
  return text.slice(startIdx, endIdx);
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
  const local = new Set();
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
  const abs = path.normalize(path.join(root, 'src', fromAppImport));
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

function buildComponent({ componentName, body, outFile, shellKeys, moduleImports, extraImports }) {
  const destructure = [...shellKeys].sort().join(',\n    ');
  const reactImport = extraImports || "import React from 'react';\n";
  const moduleImportBlock = moduleImports ? moduleImports + '\n' : '';
  return `${reactImport}${moduleImportBlock}import { useWorkspaceShell } from '${shellImportPath(outFile)}';

export default function ${componentName}() {
  const {
    ${destructure}
  } = useWorkspaceShell();

${body.trimEnd()}
}
`;
}

function updatePageWrapper(pageFile, componentName, contentRelImport) {
  const base = path.basename(pageFile, '.jsx');
  fs.writeFileSync(
    path.join(root, pageFile),
    `import React from 'react';
import ${componentName} from '${contentRelImport}';

export default function ${base}() {
  return <${componentName} />;
}
`,
    'utf8'
  );
}

function contentImportPath(pageFile, outFile) {
  const pageDir = path.dirname(path.join(root, pageFile));
  let rel = path.relative(pageDir, path.join(root, outFile)).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

function removeBlock(appText, startMarker, endMarker) {
  const block = extractBetween(appText, startMarker, endMarker);
  return appText.replace(block, '');
}

function removeRenderFnFromShell(appText, renderFn) {
  return appText.replace(new RegExp(`\\n      ${renderFn},\\n`), '\n');
}

function addKeysToShellMerge(appText, keysToAdd) {
  if (!keysToAdd.length) return appText;
  const marker = '      resetEditRegistryModal,\n    },\n  ]);';
  const insert = keysToAdd.map((k) => `      ${k},`).join('\n') + '\n';
  if (!appText.includes(marker)) throw new Error('Shell merge marker not found');
  return appText.replace(marker, insert + '      resetEditRegistryModal,\n    },\n  ]);');
}

let appText = fs.readFileSync(appPath, 'utf8');
const shellKeysAll = parseShellKeys(appText);
const { header, imports: appImports } = parseAppImports(appText);
const moduleNames = parseModuleLevelNames(header);
const appBindings = parseAppBindings(appText);
const allShellCandidates = new Set([...shellKeysAll, ...appBindings, ...moduleNames]);

const report = [];
const keysAddedToShell = new Set();

for (const spec of EXTRACTIONS) {
  let blocks = '';
  for (const eb of spec.extraBlocks || []) blocks += extractBetween(appText, eb.start, eb.end);
  const fnBlock = extractBetween(appText, spec.start, spec.end);
  const fnBody = extractBody(fnBlock);
  const fullCode = blocks + fnBody;
  const ids = collectIdentifiers(fullCode);
  const localDeclared = collectLocalDeclared(fullCode);

  const neededShell = [...ids]
    .filter((id) => allShellCandidates.has(id) && !localDeclared.has(id))
    .sort();

  const neededImports = new Map();
  for (const id of ids) {
    if (localDeclared.has(id) || allShellCandidates.has(id)) continue;
    if (appImports.has(id)) neededImports.set(id, appImports.get(id));
  }

  const toAddShell = neededShell.filter((k) => !shellKeysAll.has(k) && !keysAddedToShell.has(k));
  for (const k of toAddShell) keysAddedToShell.add(k);

  const component = buildComponent({
    componentName: spec.componentName,
    body: fullCode,
    outFile: spec.outFile,
    shellKeys: neededShell,
    moduleImports: buildImportLines(groupImports(neededImports), spec.outFile),
    extraImports: spec.extraImports,
  });

  const outPath = path.join(root, spec.outFile);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, component, 'utf8');
  updatePageWrapper(spec.pageFile, spec.componentName, contentImportPath(spec.pageFile, spec.outFile));

  for (const eb of spec.extraBlocks || []) {
    appText = removeBlock(appText, eb.start, eb.end);
  }
  appText = removeBlock(appText, spec.start, spec.end);
  appText = removeRenderFnFromShell(appText, spec.renderFn);

  for (const k of toAddShell) shellKeysAll.add(k);

  report.push({
    component: spec.componentName,
    lines: component.split('\n').length,
    shellDeps: neededShell.length,
    addedToShell: toAddShell,
    externalImports: neededImports.size,
  });
  console.log(`Created ${spec.outFile} (${component.split('\n').length} lines, ${neededShell.length} shell deps)`);
}

appText = addKeysToShellMerge(appText, [...keysAddedToShell].sort());
fs.writeFileSync(appPath, appText, 'utf8');
console.log('\nAdded to workspaceShell:', [...keysAddedToShell].sort().join(', ') || '(none)');
console.log(JSON.stringify(report, null, 2));
