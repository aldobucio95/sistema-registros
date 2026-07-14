import fs from 'fs';
import path from 'path';

const file = 'src/app/helpers/appMainModuleScope.jsx';
let src = fs.readFileSync(file, 'utf8');
const dir = path.dirname(file);

function existsFor(spec) {
  const base = path.resolve(dir, spec);
  return [
    base,
    base + '.js',
    base + '.jsx',
    base + '.ts',
    base + '.tsx',
    base + '.mjs',
    path.join(base, 'index.js'),
    path.join(base, 'index.jsx'),
  ].some((c) => fs.existsSync(c));
}

let changed = 0;
src = src.replace(/from\s+(['"])(\.\.[^'"]+)\1/g, (full, q, spec) => {
  if (existsFor(spec)) return full;
  // try one more parent
  if (spec.startsWith('../') && !spec.startsWith('../../')) {
    const up = '../' + spec;
    if (existsFor(up)) {
      changed++;
      return `from ${q}${up}${q}`;
    }
  }
  // try two more if still ../x from helpers (../../x missing, ../../../x?)
  if (spec.startsWith('../../') && !spec.startsWith('../../../')) {
    const up = '../' + spec;
    if (existsFor(up)) {
      changed++;
      return `from ${q}${up}${q}`;
    }
  }
  return full;
});

fs.writeFileSync(file, src);
console.log('rewrote', changed, 'imports');

// report still missing
const re = /from\s+(['"])(\.[^'"]+)\1/g;
let m;
const missing = [];
while ((m = re.exec(src))) {
  if (!existsFor(m[2])) missing.push(m[2]);
}
console.log('still missing', missing.length);
for (const x of missing.slice(0, 40)) console.log(x);
