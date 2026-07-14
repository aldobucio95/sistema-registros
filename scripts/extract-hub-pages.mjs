/**
 * Extract renderUsers / renderLogs from App.jsx into EventHub page content components.
 * Run: node scripts/extract-hub-pages.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const appPath = path.join(root, 'src', 'app', 'AppMain.jsx');
const providerPath = path.join(root, 'src', 'app', 'providers', 'EventHubProvider.jsx');
const hubScreenPath = path.join(root, 'src', 'screens', 'EventHubScreen.jsx');

const INVALID_HUB_KEYS = new Set([
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  'L', 'el', 'en', 'la', 'gr', 'ef', 'bz', 'pt', 'res', 'ref', 'cap', 'top', 'tot', 'all', 'map', 'set', 'key', 'keys', 'id', 'cell',
  'body', 'card', 'row', 'rows', 'col', 'cols', 'show', 'type', 'text', 'name', 'event', 'unit', 'step', 'self', 'prev', 'next', 'slice',
  'start', 'end', 'min', 'max', 'count', 'total', 'amount', 'method', 'service', 'location', 'locations', 'action', 'target', 'panel',
  'partial', 'expanded', 'available', 'allowed', 'checked', 'active', 'pending', 'invalid', 'entries', 'items', 'stats', 'base', 'balance',
  'has', 'hay', 'lista', 'nombre', 'fecha', 'estado', 'participante', 'tipo', 'sede', 'seg', 'mb', 'w', 'u', 'v', 'ctx', 'current',
  'local', 'range', 'kind', 'status', 'single', 'form', 'deleted', 'uid', 'username', 'eventId', 'eventName', 'revertInfo',
  // Falsos positivos frecuentes al extraer JSX (props, campos de fila, destructuring local)
  'label', 'hint', 'createdAt', 'updatedAt', 'timestamp', 'title', 'value', 'open', 'tone', 'variant', 'size', 'icon', 'Icon',
  'hasAny', 'isSubRegistration', 'paymentService', 'roster',
]);

const EXTRACTIONS = [
  {
    renderFn: 'renderUsers',
    componentName: 'UsersPageContent',
    outFile: 'src/screens/users/UsersPageContent.jsx',
    lazyName: 'UsersPageContentLazy',
    lazyImport: './users/UsersPageContent.jsx',
    start: 'const renderUsers = () => (',
    end: 'const toggleLogSelection = (id) => {',
    stripWrapper: true,
    wrapReturn: true,
    extraBlocks: [],
  },
  {
    renderFn: 'renderLogs',
    componentName: 'LogsPageContent',
    outFile: 'src/screens/logs/LogsPageContent.jsx',
    lazyName: 'LogsPageContentLazy',
    lazyImport: './logs/LogsPageContent.jsx',
    start: 'const toggleLogSelection = (id) => {',
    end: 'const editorRegFieldsModalEl =',
    stripWrapper: false,
    extraBlocks: [],
    transformEnd: (code) => {
      const logsStart = code.indexOf('const renderLogs = () => {');
      if (logsStart === -1) throw new Error('renderLogs not found in logs block');
      const helpers = code.slice(0, logsStart).trimEnd();
      const fnBlock = code.slice(logsStart);
      const open = fnBlock.indexOf('{');
      let depth = 0;
      let closeIdx = -1;
      for (let i = open; i < fnBlock.length; i++) {
        if (fnBlock[i] === '{') depth++;
        else if (fnBlock[i] === '}') {
          depth--;
          if (depth === 0) {
            closeIdx = i;
            break;
          }
        }
      }
      if (closeIdx === -1) throw new Error('Unbalanced braces in renderLogs');
      const logsBody = fnBlock.slice(open + 1, closeIdx).trimEnd();
      return `${helpers}\n\n${logsBody}`;
    },
  },
];

function extractBetween(text, startMarker, endMarker) {
  const startIdx = text.indexOf(startMarker);
  if (startIdx === -1) throw new Error(`Start marker not found: ${startMarker.slice(0, 60)}`);
  const endIdx = text.indexOf(endMarker, startIdx + startMarker.length);
  if (endIdx === -1) throw new Error(`End marker not found: ${endMarker.slice(0, 60)}`);
  return text.slice(startIdx, endIdx);
}

function stripRenderUsersWrapper(block) {
  let body = block.replace(/^const renderUsers = \(\) => \(\s*/, '');
  body = body.replace(/\);\s*$/, '');
  return body.trimEnd();
}

function parseAppImports(appText) {
  const appStart = appText.indexOf('const App = () => {');
  const header = appText.slice(0, appStart);
  /** @type {Map<string, { from: string, default?: boolean }>} */
  const imports = new Map();
  for (const m of header.matchAll(/^import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/gm)) {
    const stmt = m[0];
    const from = m[2];
    if (stmt.includes('{')) {
      for (const part of stmt.match(/\{([\s\S]*?)\}/)[1].split(',')) {
        const bit = part.trim();
        if (!bit) continue;
        const asMatch = bit.match(/^([\w$]+)\s+as\s+([\w$]+)$/);
        if (asMatch) imports.set(asMatch[2], { from, default: false });
        else imports.set(bit.split(/\s+/)[0], { from, default: false });
      }
    }
    const def = stmt.match(/^import\s+([\w$]+)\s*,/);
    if (def) imports.set(def[1], { from, default: true });
    const defOnly = stmt.match(/^import\s+([\w$]+)\s+from/);
    if (defOnly && !stmt.includes('{')) imports.set(defOnly[1], { from, default: true });
  }
  return { header, imports };
}

function parseModuleLevelNames(header) {
  const names = new Set();
  for (const m of header.matchAll(/(?:^|\n)(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  for (const m of header.matchAll(/(?:^|\n)(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=/g)) names.add(m[1]);
  return names;
}

function parseEventHubKeys(appText) {
  const keys = new Set();
  const hubStart = appText.indexOf('const eventHubValue = {');
  const hubEnd = appText.indexOf('};', hubStart);
  const block = appText.slice(hubStart, hubEnd);
  for (const m of block.matchAll(/^\s+([A-Za-z_$][\w$]*)\s*(?::|,)/gm)) keys.add(m[1]);
  for (const m of block.matchAll(/^\s+([A-Za-z_$][\w$]*)\s*,/gm)) keys.add(m[1]);
  return keys;
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
  const abs = path.normalize(path.join(root, 'src', fromAppImport.replace(/^\.\//, '')));
  let rel = path.relative(outDir, abs).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

function hubImportPath(outFile) {
  const outDir = path.dirname(path.join(root, outFile));
  const hubAbs = path.join(root, 'src', 'app', 'providers', 'EventHubProvider.jsx');
  let rel = path.relative(outDir, hubAbs).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

function groupImports(importMap) {
  const byFrom = new Map();
  for (const [name, meta] of importMap) {
    const key = `${meta.default ? 'default:' : 'named:'}${meta.from}`;
    if (!byFrom.has(key)) byFrom.set(key, { from: meta.from, default: meta.default, names: [] });
    byFrom.get(key).names.push(name);
  }
  return byFrom;
}

function buildImportLines(byFrom, outFile) {
  const lines = [];
  for (const [, group] of [...byFrom.entries()].sort((a, b) => a[1].from.localeCompare(b[1].from))) {
    const rel = relImport(group.from, outFile);
    const unique = [...new Set(group.names)].sort();
    if (group.default && unique.length === 1) {
      lines.push(`import ${unique[0]} from '${rel}';`);
    } else if (group.default) {
      const [first, ...rest] = unique;
      lines.push(`import ${first}${rest.length ? `, { ${rest.join(', ')} }` : ''} from '${rel}';`);
    } else {
      lines.push(`import { ${unique.join(', ')} } from '${rel}';`);
    }
  }
  const reactIdx = lines.findIndex((l) => l.includes("from 'react'"));
  if (reactIdx === -1) lines.unshift("import React from 'react';");
  else if (!lines[reactIdx].startsWith('import React')) {
    lines[reactIdx] = lines[reactIdx].replace(/^import \{/, 'import React, {');
  }
  return lines.join('\n');
}

function buildComponent({ componentName, body, outFile, hubKeys, moduleImports }) {
  const destructure = [...hubKeys].sort().join(',\n    ');
  const reactFromApp = moduleImports.includes("from 'react'") ? '' : "import React from 'react';\n";
  return `${reactFromApp}${moduleImports ? moduleImports + '\n' : ''}import { useEventHub } from '${hubImportPath(outFile)}';

export default function ${componentName}() {
  const {
    ${destructure}
  } = useEventHub();

${body.trimEnd()}
}
`;
}

function removeBlock(appText, startMarker, endMarker) {
  const block = extractBetween(appText, startMarker, endMarker);
  return appText.replace(block, '');
}

function removeRenderFnFromHub(appText, renderFn) {
  return appText.replace(new RegExp(`\\n      ${renderFn},\\n`), '\n');
}

function addKeysToEventHub(appText, keysToAdd) {
  if (!keysToAdd.length) return appText;
  const marker = '      onReloadAfterBulkRestore: handleReloadAfterBulkRestore,\n    };';
  const insert = keysToAdd.map((k) => `      ${k},`).join('\n') + '\n';
  if (!appText.includes(marker)) throw new Error('eventHubValue marker not found');
  return appText.replace(marker, insert + '      onReloadAfterBulkRestore: handleReloadAfterBulkRestore,\n    };');
}

function addProviderTypedefKeys(providerText, keysToAdd) {
  let text = providerText;
  for (const key of keysToAdd) {
    if (text.includes(`@property {`) && text.includes(`[${key}]`)) continue;
    const insertLine = ` * @property {unknown} [${key}]\n`;
    const marker = ' * @property {() => void | Promise<void>} [onReloadAfterBulkRestore]\n';
    if (!text.includes(insertLine.trim())) {
      text = text.replace(marker, marker + insertLine);
    }
  }
  text = text.replace(
    / \* @property {\(\) => React\.ReactNode} \[renderUsers\]\n/g,
    ''
  );
  text = text.replace(
    / \* @property {\(\) => React\.ReactNode} \[renderLogs\]\n/g,
    ''
  );
  return text;
}

function updateEventHubScreen(hubText, lazySpecs) {
  let text = hubText;
  if (!text.includes('lazy')) {
    text = text.replace(
      "import React, { useEffect, useState } from 'react';",
      "import React, { lazy, Suspense, useEffect, useState } from 'react';"
    );
  }
  for (const spec of lazySpecs) {
    if (!text.includes(spec.lazyName)) {
      const insertAfter = "import MobileSearchField from '../components/mobile/MobileSearchField.jsx';\n";
      text = text.replace(
        insertAfter,
        `${insertAfter}\nconst ${spec.lazyName} = lazy(() => import('${spec.lazyImport}'));\n`
      );
    }
  }
  text = text.replace(
    /    globalConfig, toggleDebugMode, goTo, hasAdminRights, handleLogout, renderUsers, renderLogs,\n/,
    '    globalConfig, toggleDebugMode, goTo, hasAdminRights, handleLogout,\n'
  );
  text = text.replace(
    `<div className="-mx-4 md:-mx-6 -mt-4 md:-mt-6">{renderUsers()}</div>`,
    `<div className="-mx-4 md:-mx-6 -mt-4 md:-mt-6"><Suspense fallback={null}><UsersPageContentLazy /></Suspense></div>`
  );
  text = text.replace(
    `<div className="-mx-4 md:-mx-6 -mt-4 md:-mt-6">{renderLogs()}</div>`,
    `<div className="-mx-4 md:-mx-6 -mt-4 md:-mt-6"><Suspense fallback={null}><LogsPageContentLazy /></Suspense></div>`
  );
  return text;
}

let appText = fs.readFileSync(appPath, 'utf8');
const eventHubKeys = parseEventHubKeys(appText);
const { header, imports: appImports } = parseAppImports(appText);
const moduleNames = parseModuleLevelNames(header);
const appBindings = parseAppBindings(appText);
const hubBindingNames = new Set([...eventHubKeys, ...appBindings, ...moduleNames]);

const report = [];
const keysAddedToHub = new Set();

for (const spec of EXTRACTIONS) {
  let block = extractBetween(appText, spec.start, spec.end);
  let fullCode = spec.stripWrapper ? stripRenderUsersWrapper(block) : block;
  if (spec.transformEnd) fullCode = spec.transformEnd(fullCode);
  if (spec.wrapReturn) fullCode = `return (\n${fullCode}\n);`;

  const ids = collectIdentifiers(fullCode);
  const localDeclared = collectLocalDeclared(fullCode);

  const neededHub = [...ids]
    .filter((id) => hubBindingNames.has(id) && !localDeclared.has(id) && !INVALID_HUB_KEYS.has(id))
    .sort();

  const neededImports = new Map();
  for (const id of ids) {
    if (localDeclared.has(id) || hubBindingNames.has(id)) continue;
    if (appImports.has(id)) neededImports.set(id, appImports.get(id));
  }

  const toAddHub = neededHub.filter((k) => !eventHubKeys.has(k) && !keysAddedToHub.has(k));
  for (const k of toAddHub) keysAddedToHub.add(k);

  const importLines = buildImportLines(groupImports(neededImports), spec.outFile);
  const component = buildComponent({
    componentName: spec.componentName,
    body: fullCode,
    outFile: spec.outFile,
    hubKeys: neededHub,
    moduleImports: importLines,
  });

  const outPath = path.join(root, spec.outFile);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, component, 'utf8');

  appText = removeBlock(appText, spec.start, spec.end);
  appText = removeRenderFnFromHub(appText, spec.renderFn);

  for (const k of toAddHub) eventHubKeys.add(k);

  report.push({
    component: spec.componentName,
    lines: component.split('\n').length,
    hubDeps: neededHub.length,
    addedToHub: toAddHub,
    externalImports: neededImports.size,
  });
  console.log(`Created ${spec.outFile} (${component.split('\n').length} lines, ${neededHub.length} hub deps)`);
}

appText = addKeysToEventHub(appText, [...keysAddedToHub].sort());
fs.writeFileSync(appPath, appText, 'utf8');

let providerText = fs.readFileSync(providerPath, 'utf8');
providerText = addProviderTypedefKeys(providerText, [...keysAddedToHub].sort());
fs.writeFileSync(providerPath, providerText, 'utf8');

let hubScreenText = fs.readFileSync(hubScreenPath, 'utf8');
hubScreenText = updateEventHubScreen(hubScreenText, EXTRACTIONS);
fs.writeFileSync(hubScreenPath, hubScreenText, 'utf8');

console.log('\nAdded to eventHubValue:', [...keysAddedToHub].sort().join(', ') || '(none)');
console.log(JSON.stringify(report, null, 2));
