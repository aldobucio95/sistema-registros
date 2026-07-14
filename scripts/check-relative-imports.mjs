import fs from 'fs';
import path from 'path';

function resolveImport(fromFile, spec) {
  if (!spec.startsWith('.')) return null;
  const base = path.resolve(path.dirname(fromFile), spec);
  const candidates = [
    base,
    base + '.js',
    base + '.jsx',
    base + '.ts',
    base + '.tsx',
    base + '.mjs',
    path.join(base, 'index.js'),
    path.join(base, 'index.jsx'),
  ];
  return candidates.find((c) => fs.existsSync(c)) || null;
}

const file = process.argv[2];
const s = fs.readFileSync(file, 'utf8');
const re = /from\s+(['"])([^'"]+)\1/g;
let m;
const missing = [];
while ((m = re.exec(s))) {
  const spec = m[2];
  if (!spec.startsWith('.')) continue;
  if (!resolveImport(file, spec)) missing.push(spec);
}
console.log('missing', missing.length);
for (const x of missing) console.log(x);
