/**
 * Parte useAppMainHandlers.jsx en PartA + PartB (carga síncrona, chunks separados via Vite groups).
 * Las refs A→B van por bridgeRef + getScope() enriquecido.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const handlersPath = path.join(root, 'src/hooks/workspace/useAppMainHandlers.jsx');
const dir = path.join(root, 'src/hooks/workspace');
const src = fs.readFileSync(handlersPath, 'utf8');
const lines = src.split(/\n/);

const headerEnd = 6; // blank line after imports; function starts at line 7 (index 6)
const returnLine = lines.findIndex((l) => l === '  return {');
if (returnLine < 0) throw new Error('return { not found');

const names = [];
for (let i = headerEnd + 1; i < returnLine; i++) {
  const m = lines[i].match(/^  const ([A-Za-z0-9_]+) = /);
  if (m) names.push({ name: m[1], line: i + 1, idx: i });
}

const midTarget = Math.floor((headerEnd + 1 + returnLine) / 2);
let cutIdx = 0;
for (let i = 0; i < names.length; i++) {
  if (names[i].idx >= midTarget) {
    cutIdx = i;
    break;
  }
}
// Prefer cut at a named boundary near mid
const cutName = names[cutIdx];
const cutStartIdx = cutName.idx; // first line of Part B
console.log(`Cut before ${cutName.name} @${cutName.line} (of ${names.length} consts)`);

const partANames = names.slice(0, cutIdx).map((n) => n.name);
const partBNames = names.slice(cutIdx).map((n) => n.name);

const partABody = lines.slice(headerEnd + 1, cutStartIdx).join('\n');
let partBBody = lines.slice(cutStartIdx, returnLine).join('\n');

// En Part B, reescribir llamadas a símbolos de A (salvo líneas getScope destructure)
const partASet = new Set(partANames);
const partBLines = partBBody.split('\n');
const rewritten = partBLines.map((line) => {
  if (line.includes('getScope()')) return line;
  let next = line;
  for (const name of partASet) {
    // llamadas / acceso a miembros: name( name. name)
    next = next.replace(new RegExp(`(?<!\\.)\\b${name}\\b(?=\\s*[.(])`, 'g'), `getScope().${name}`);
  }
  return next;
});
partBBody = rewritten.join('\n');

const returnBlock = lines.slice(returnLine).join('\n');
// return lists both parts' names — keep as compose return in orchestrator

const hookImports = `import { useCallback, useMemo, useEffect, useLayoutEffect, useRef } from 'react';\nimport * as appMainModuleScope from '../../app/helpers/appMainModuleScope.jsx';\n`;

const partAFile = `${hookImports}
/** Primera mitad de handlers (chunk app-handlers-a). */
export function useAppMainHandlersPartA(getScope) {
${partABody}
  return {
${partANames.map((n) => `    ${n},`).join('\n')}
  };
}
`;

const partBFile = `${hookImports}
/** Segunda mitad de handlers (chunk app-handlers-b). */
export function useAppMainHandlersPartB(getScope) {
${partBBody}
  return {
${partBNames.map((n) => `    ${n},`).join('\n')}
  };
}
`;

const orchestrator = `/** Large AppMain handlers (excel, logs-related tail, registry mutations, etc.). */
/* __EXTRACTED_APP_MAIN_HANDLERS__ */

import { useRef } from 'react';
import { useAppMainHandlersPartA } from './useAppMainHandlersPartA.jsx';
import { useAppMainHandlersPartB } from './useAppMainHandlersPartB.jsx';

export function useAppMainHandlers(getScope) {
  const bridgeRef = useRef({});
  const getScoped = () => ({ ...getScope(), ...bridgeRef.current });
  const partA = useAppMainHandlersPartA(getScoped);
  bridgeRef.current = partA;
  const partB = useAppMainHandlersPartB(getScoped);
  bridgeRef.current = { ...partA, ...partB };
  return { ...partA, ...partB };
}
`;

fs.writeFileSync(path.join(dir, 'useAppMainHandlersPartA.jsx'), partAFile, 'utf8');
fs.writeFileSync(path.join(dir, 'useAppMainHandlersPartB.jsx'), partBFile, 'utf8');
fs.writeFileSync(handlersPath, orchestrator, 'utf8');

console.log(`PartA: ${partANames.length} exports, ${(partAFile.length / 1024).toFixed(1)} KB`);
console.log(`PartB: ${partBNames.length} exports, ${(partBFile.length / 1024).toFixed(1)} KB`);
console.log(`First A: ${partANames[0]}, last A: ${partANames[partANames.length - 1]}`);
console.log(`First B: ${partBNames[0]}, last B: ${partBNames[partBNames.length - 1]}`);
