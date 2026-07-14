/**
 * Finds identifiers used in *PageContent components that destructure useWorkspaceShell
 * but forget to pull required keys from context.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = fs.readFileSync(path.join(root, 'src/app/AppMain.jsx'), 'utf8');

const shellStart = app.indexOf('const workspaceShell = mergeWorkspaceShellParts');
const shellEnd = app.indexOf(']);', shellStart);
const shellKeys = new Set(
  [...app.slice(shellStart, shellEnd).matchAll(/^\s+([A-Za-z_$][\w$]*)\s*,?\s*$/gm)].map((m) => m[1])
);

const reserved = new Set([
  'true', 'false', 'null', 'undefined', 'return', 'if', 'else', 'for', 'while', 'switch', 'case', 'break',
  'continue', 'new', 'typeof', 'instanceof', 'in', 'of', 'try', 'catch', 'finally', 'throw', 'function', 'class',
  'const', 'let', 'var', 'import', 'export', 'default', 'async', 'await', 'void', 'delete', 'do', 'with', 'yield',
  'React', 'loc', 'person', 'row', 'opts', 'e', 'ev', 'p', 'bp', 'key', 'value', 'idx', 'i', 'n', 'id', 'el',
  'section', 'summary', 'emptyF', 'partyRow', 'host', 'cluster', 'meta', 'item', 'part', 'bit', 'm', 'fn', 'args',
]);

function parseDestructured(text) {
  const m = text.match(/const\s+\{([\s\S]*?)\}\s*=\s*useWorkspaceShell\(\)/);
  if (!m) return new Set();
  return new Set(
    m[1]
      .split(',')
      .map((p) => p.trim().split(':')[0].trim())
      .filter(Boolean)
  );
}

function collectUsedIds(body) {
  const local = new Set();
  for (const m of body.matchAll(/\b(?:const|let|function)\s+([A-Za-z_$][\w$]*)/g)) local.add(m[1]);
  for (const m of body.matchAll(/\b(?:const|let)\s+\{([^}]+)\}/g)) {
    for (const part of m[1].split(',')) {
      const n = part.trim().split(':')[0].trim();
      if (n) local.add(n);
    }
  }
  for (const m of body.matchAll(/\(([A-Za-z_$][\w$]*(?:,\s*[A-Za-z_$][\w$]*)*)\)\s*=>/g)) {
    for (const p of m[1].split(',')) local.add(p.trim());
  }

  const used = new Set();
  for (const m of body.matchAll(/\b([A-Za-z_$][\w$]*)\b/g)) {
    const id = m[1];
    if (reserved.has(id) || local.has(id)) continue;
    if (shellKeys.has(id)) used.add(id);
  }
  return used;
}

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else if (ent.name.endsWith('.jsx') || ent.name.endsWith('.js')) out.push(p);
  }
  return out;
}

let anyMissing = false;
for (const file of walk(path.join(root, 'src'))) {
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes('useWorkspaceShell()')) continue;
  const destructured = parseDestructured(text);
  const body = text.split('} = useWorkspaceShell()')[1] || '';
  const used = collectUsedIds(body);
  const missing = [...used].filter((k) => !destructured.has(k)).sort();
  if (!missing.length) continue;
  anyMissing = true;
  const rel = path.relative(root, file).replace(/\\/g, '/');
  console.log(`\n${rel}:`);
  console.log(missing.join(', '));
}

if (!anyMissing) {
  console.log('All useWorkspaceShell consumers destructure their shell keys.');
} else {
  process.exit(1);
}
