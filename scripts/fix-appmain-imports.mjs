import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const p = path.join(__dirname, '..', 'src', 'app', 'AppMain.jsx');
let s = fs.readFileSync(p, 'utf8');

function fixRel(rel) {
  if (rel.startsWith('./app/')) return './' + rel.slice('./app/'.length);
  if (rel.startsWith('./')) return '../' + rel.slice(2);
  return rel;
}

s = s.replace(/from '(\.\/[^']+)'/g, (_, rel) => `from '${fixRel(rel)}'`);
s = s.replace(/from "(\.\/[^"]+)"/g, (_, rel) => `from "${fixRel(rel)}"`);
s = s.replace(/import\('(\.\/[^']+)'\)/g, (_, rel) => `import('${fixRel(rel)}')`);

fs.writeFileSync(p, s, 'utf8');
console.log('Fixed AppMain.jsx imports');
