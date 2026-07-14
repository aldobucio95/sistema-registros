import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = fs.readFileSync(path.join(root, 'src/app/AppMain.jsx'), 'utf8');

const appStart = app.indexOf('const App = () => {');
const screen1 = app.indexOf('// --- SCREEN 1: LOGIN ---');
const header = app.slice(0, appStart);

const imports = new Set();
for (const m of header.matchAll(/^import\s+([\s\S]*?)\s+from\s+['"][^'"]+['"]/gm)) {
  const stmt = m[1];
  if (stmt.includes('{')) {
    for (const part of stmt.match(/\{([\s\S]*?)\}/)[1].split(',')) {
      const bit = part.trim();
      if (!bit) continue;
      const asMatch = bit.match(/^([\w$]+)\s+as\s+([\w$]+)$/);
      imports.add(asMatch ? asMatch[2] : bit.split(/\s+/)[0]);
    }
  }
  const defOnly = stmt.match(/^([\w$]+)\s+from/);
  if (defOnly && !stmt.includes('{')) imports.add(defOnly[1]);
  const defWith = stmt.match(/^([\w$]+)\s*,/);
  if (defWith) imports.add(defWith[1]);
}
for (const m of header.matchAll(/(?:^|\n)(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g)) imports.add(m[1]);
for (const m of header.matchAll(/(?:^|\n)(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=/g)) imports.add(m[1]);

let depth = 0;
let inHookDestructure = false;
const bindings = new Set();
for (const line of app.slice(appStart, screen1).split('\n')) {
  if (depth >= 1) {
    if (/^\s+const\s+\{\s*$/.test(line)) inHookDestructure = true;
    if (inHookDestructure) {
      const dm = line.match(/^\s+([A-Za-z_$][\w$]*)\s*,?\s*$/);
      if (dm) bindings.add(dm[1]);
      if (/^\s+\}\s*=\s*(use[A-Z]\w+|useNavigate|useLocation)\b/.test(line)) inHookDestructure = false;
    }
  }
  if (depth === 1) {
    let m = line.match(/^\s+const\s+([A-Za-z_$][\w$]*)\s*=/);
    if (m) bindings.add(m[1]);
    m = line.match(/^\s+function\s+([A-Za-z_$][\w$]*)\s*\(/);
    if (m) bindings.add(m[1]);
    m = line.match(/^\s+const\s+\[\s*([^\]]+)\]/);
    if (m) {
      for (const part of m[1].split(',')) {
        const name = part.trim().split(':')[0].trim();
        if (/^[\w$]+$/.test(name)) bindings.add(name);
      }
    }
    m = line.match(/^\s+const\s+\{([^}]+)\}\s*=/);
    if (m) {
      for (const part of m[1].split(',')) {
        const name = part.trim().split(':')[0].trim();
        if (/^[\w$]+$/.test(name)) bindings.add(name);
      }
    }
  }
  depth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
}

const hubStart = app.indexOf('const eventHubValue = {');
const hubEnd = app.indexOf('};', hubStart);
const keys = [...new Set([...app.slice(hubStart, hubEnd).matchAll(/^\s+([A-Za-z_$][\w$]*)\s*(?::|,)/gm)].map((m) => m[1]))];

const missing = keys
  .filter((k) => k !== 'onReloadAfterBulkRestore' && !bindings.has(k) && !imports.has(k))
  .sort();

console.log('eventHub keys:', keys.length);
console.log('bindings before SCREEN 1:', bindings.size);
console.log('missing before SCREEN 1:', missing.length);
console.log(missing.join('\n'));
