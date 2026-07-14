import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.join(__dirname, '..', 'src', 'App.jsx');
let src = fs.readFileSync(appPath, 'utf8');
const lines = src.split(/\r?\n/);
const fnStart = lines.findIndex((l) => l.includes('const renderEditRegistryModalFormFields = (opts = {}) => {'));
if (fnStart < 0) throw new Error('function start not found');
let depth = 0;
let fnEnd = -1;
for (let i = fnStart; i < lines.length; i++) {
  for (const ch of lines[i]) {
    if (ch === '{') depth++;
    if (ch === '}') depth--;
  }
  if (i > fnStart && depth === 0) {
    fnEnd = i;
    break;
  }
}
if (fnEnd < 0) throw new Error('function end not found');
const newLines = [...lines.slice(0, fnStart), ...lines.slice(fnEnd + 1)];
src = newLines.join('\n');
if (!src.endsWith('\n')) src += '\n';
fs.writeFileSync(appPath, src);
console.log('Removed renderEditRegistryModalFormFields lines', fnStart + 1, '-', fnEnd + 1, 'removed', fnEnd - fnStart + 1);
