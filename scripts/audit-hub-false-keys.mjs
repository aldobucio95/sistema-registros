/**
 * Finds eventHubValue shorthand keys that are not in App scope (would throw ReferenceError)
 * and useEventHub destructured names that are never used as standalone identifiers.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(p) {
  return fs.readFileSync(path.join(root, p), 'utf8');
}

function moduleScopeNames(header) {
  const names = new Set();
  for (const m of header.matchAll(/^import\s+([\s\S]*?)\s+from\s+['"][^'"]+['"]/gm)) {
    const stmt = m[1];
    if (stmt.includes('{')) {
      for (const part of stmt.match(/\{([\s\S]*?)\}/)[1].split(',')) {
        const bit = part.trim();
        if (!bit) continue;
        const asMatch = bit.match(/^([\w$]+)\s+as\s+([\w$]+)$/);
        names.add(asMatch ? asMatch[2] : bit.split(/\s+/)[0]);
      }
    }
    const defOnly = stmt.match(/^([\w$]+)\s+from/);
    if (defOnly && !stmt.includes('{')) names.add(defOnly[1]);
    const defWith = stmt.match(/^([\w$]+)\s*,/);
    if (defWith) names.add(defWith[1]);
  }
  for (const m of header.matchAll(/(?:^|\n)(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  for (const m of header.matchAll(/(?:^|\n)(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=/g)) names.add(m[1]);
  return names;
}

function appTopLevelBindings(appBody) {
  const names = new Set();
  let depth = 0;
  for (const line of appBody.split('\n')) {
    if (depth === 1) {
      let m = line.match(/^\s+const\s+([A-Za-z_$][\w$]*)\s*=/);
      if (m) names.add(m[1]);
      m = line.match(/^\s+function\s+([A-Za-z_$][\w$]*)\s*\(/);
      if (m) names.add(m[1]);
      m = line.match(/^\s+const\s+\[\s*([^\]]+)\]/);
      if (m) {
        for (const part of m[1].split(',')) {
          const n = part.trim().split(':')[0].trim();
          if (/^[\w$]+$/.test(n)) names.add(n);
        }
      }
    }
    depth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
  }
  // multiline hook destructuring
  for (const m of appBody.matchAll(/const\s+\{([\s\S]*?)\}\s*=\s*(?:use[A-Z]\w+|useNavigate|useLocation)\b/g)) {
    for (const part of m[1].split(',')) {
      const n = part.trim().split(':')[0].trim();
      if (/^[\w$]+$/.test(n)) names.add(n);
    }
  }
  return names;
}

function parseHubKeys(app) {
  const hubStart = app.indexOf('const eventHubValue = {');
  const hubEnd = app.indexOf('};', hubStart);
  const block = app.slice(hubStart, hubEnd);
  return [...new Set([...block.matchAll(/^\s+([A-Za-z_$][\w$]*)\s*(?::|,)/gm)].map((m) => m[1]))];
}

function parseDestructureKeys(fileText) {
  const m = fileText.match(/useEventHub\(\)[\s\S]*?const\s+\{([\s\S]*?)\}\s*=\s*useEventHub/);
  if (!m) {
    const m2 = fileText.match(/const\s+\{([\s\S]*?)\}\s*=\s*useEventHub\(\)/);
    if (!m2) return [];
    return m2[1]
      .split(',')
      .map((p) => p.trim().split(':')[0].trim())
      .filter(Boolean);
  }
  return [];
}

function standaloneUses(code, name) {
  const re = new RegExp(`\\b${name}\\b`, 'g');
  let count = 0;
  for (const m of code.matchAll(re)) count++;
  // destructure line counts once; prop access row.name doesn't count as standalone if only in destructure
  const destructureOnly = code.includes(`    ${name},`) || code.includes(`${name},\n`);
  const propAccess = new RegExp(`\\.${name}\\b|${name}=`, 'g');
  let propCount = 0;
  for (const m of code.matchAll(propAccess)) propCount++;
  const jsxProp = new RegExp(`\\b${name}=`, 'g');
  let jsxCount = 0;
  for (const m of code.matchAll(jsxProp)) jsxCount++;
  return { count, propCount, jsxCount, destructureOnly };
}

const app = read('src/app/AppMain.jsx');
const appStart = app.indexOf('const App = () => {');
const screen1 = app.indexOf('// --- SCREEN 1: LOGIN ---');
const moduleNames = moduleScopeNames(app.slice(0, appStart));
const appNames = appTopLevelBindings(app.slice(appStart, screen1));
const inScope = (k) => k === 'onReloadAfterBulkRestore' || moduleNames.has(k) || appNames.has(k);

const hubKeys = parseHubKeys(app);
const invalidHub = hubKeys.filter((k) => !inScope(k));

console.log('=== Invalid eventHubValue shorthand (ReferenceError risk) ===');
console.log(invalidHub.join(', ') || '(none)');

for (const rel of ['src/screens/users/UsersPageContent.jsx', 'src/screens/logs/LogsPageContent.jsx']) {
  const text = read(rel);
  const keys = parseDestructureKeys(text);
  const body = text.split('} = useEventHub()')[1] || '';
  const unused = keys.filter((k) => {
    const uses = standaloneUses(text, k);
    // used only in destructure + maybe as .prop or jsx prop
    const withoutDestructure = (text.match(new RegExp(`\\b${k}\\b`, 'g')) || []).length;
    if (withoutDestructure <= 1) return true;
    // check if only appears in destructure and as object property
    const lines = text.split('\n').filter((ln) => ln.includes(k) && !ln.trim().startsWith('//'));
    const standaloneLines = lines.filter(
      (ln) =>
        !ln.includes(`${k}.`) &&
        !ln.includes(`.${k}`) &&
        !ln.includes(`${k}=`) &&
        !ln.includes(`{${k}`) &&
        !ln.trim().match(new RegExp(`^${k},?$`))
    );
    return standaloneLines.length === 0;
  });
  console.log(`\n=== ${rel}: possibly unused hub destructuring ===`);
  console.log(unused.join(', ') || '(none)');
}
