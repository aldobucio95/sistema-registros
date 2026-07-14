/**
 * Fix default vs named imports in location roster extracted files.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const appPath = path.join(root, 'src', 'App.jsx');
const files = [
  'src/features/locationRoster/LocationRosterPageContent.jsx',
  'src/features/locationRoster/NewRegistrationModal.jsx',
];

const appImports = fs.readFileSync(appPath, 'utf8');
const defaultExports = new Set();
const namedExports = new Map();

for (const m of appImports.matchAll(/^import\s+([\w$]+)\s+from\s+['"]([^'"]+)['"]/gm)) {
  defaultExports.add(m[1]);
}
for (const m of appImports.matchAll(/^import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/gm)) {
  for (const part of m[1].split(',')) {
    const bit = part.trim();
    if (!bit) continue;
    const asMatch = bit.match(/^([\w$]+)\s+as\s+([\w$]+)$/);
    if (asMatch) namedExports.set(asMatch[2], asMatch[1]);
    else namedExports.set(bit.split(/\s+/)[0], bit.split(/\s+/)[0]);
  }
}
for (const m of appImports.matchAll(/^import\s+([\w$]+)\s*,\s*\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/gm)) {
  defaultExports.add(m[1]);
  for (const part of m[2].split(',')) {
    const bit = part.trim();
    if (!bit) continue;
    namedExports.set(bit.split(/\s+/)[0], bit.split(/\s+/)[0]);
  }
}

function fixFile(rel) {
  const p = path.join(root, rel);
  let src = fs.readFileSync(p, 'utf8');
  src = src.replace(
    /^import\s+\{\s*([A-Za-z_$][\w$]*)\s*\}\s+from\s+(['"]([^'"]+)['"]);/gm,
    (full, name, quotePath) => {
      if (defaultExports.has(name) && !namedExports.has(name)) {
        return `import ${name} from ${quotePath};`;
      }
      return full;
    }
  );
  fs.writeFileSync(p, src, 'utf8');
}

for (const f of files) fixFile(f);
console.log('Fixed default imports');
