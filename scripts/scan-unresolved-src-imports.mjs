import fs from 'fs';
import path from 'path';

const SRC = 'src';
const exts = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.css', '.json'];

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === 'dist') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.(js|jsx|mjs|ts|tsx)$/.test(ent.name)) out.push(p);
  }
  return out;
}

function resolveImport(fromFile, spec) {
  if (!spec.startsWith('.')) return 'external';
  const base = path.resolve(path.dirname(fromFile), spec);
  const candidates = [base, ...exts.map((e) => base + e)];
  for (const e of exts) candidates.push(path.join(base, 'index' + e));
  return candidates.find((c) => fs.existsSync(c)) || null;
}

const files = walk(SRC);
const missing = new Map(); // spec -> [files]
for (const file of files) {
  const s = fs.readFileSync(file, 'utf8');
  const re =
    /(?:import\s+(?:[\s\S]*?)\s+from\s+|import\s*\(\s*|export\s+[\s\S]*?\s+from\s+)(['"])(\.[^'"]+)\1/g;
  let m;
  while ((m = re.exec(s))) {
    const spec = m[2];
    const resolved = resolveImport(file, spec);
    if (resolved === 'external' || resolved) continue;
    if (!missing.has(spec)) missing.set(spec, []);
    missing.get(spec).push(file);
  }
}

const entries = [...missing.entries()].sort((a, b) => b[1].length - a[1].length);
console.log('unresolved relative import specs:', entries.length);
for (const [spec, froms] of entries.slice(0, 80)) {
  console.log(spec, '<-', froms.slice(0, 3).join(', '), froms.length > 3 ? `(+${froms.length - 3})` : '');
}
