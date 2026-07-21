/**
 * Extrae handlers grandes a módulos cargados con import() dinámico.
 * Reduce el chunk síncrono AppRoot / useAppMainHandlers.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const handlersPath = path.join(root, 'src/hooks/workspace/useAppMainHandlers.jsx');
const outDir = path.join(root, 'src/hooks/workspace/handlers');
fs.mkdirSync(outDir, { recursive: true });

const src = fs.readFileSync(handlersPath, 'utf8');
const lines = src.split(/\n/);

/**
 * Extrae el cuerpo de `const name = async (...) => { ... };`
 * start/end son 1-based inclusive (end = línea del `};`).
 */
function extractArrowFunction(startLine, endLine) {
  const startIdx = startLine - 1;
  const endIdx = endLine - 1;
  const header = lines[startIdx];
  const nameMatch = header.match(/^  const ([A-Za-z0-9_]+) = (async\s*)?\(/);
  if (!nameMatch) throw new Error(`No match at ${startLine}: ${header.slice(0, 80)}`);
  const arrowIdx = header.indexOf('=>');
  if (arrowIdx < 0) throw new Error(`No => at ${startLine}`);
  const afterArrow = header.slice(arrowIdx + 2).trim();
  const bodyLines = [];
  if (afterArrow.startsWith('{')) {
    const rest = afterArrow.slice(1);
    if (rest.trim()) bodyLines.push(rest);
    for (let i = startIdx + 1; i < endIdx; i++) bodyLines.push(lines[i]);
  } else {
    for (let i = startIdx + 1; i < endIdx; i++) bodyLines.push(lines[i]);
  }
  while (bodyLines.length && bodyLines[bodyLines.length - 1].trim() === '') bodyLines.pop();
  if (!/^\s*\};?\s*$/.test(lines[endIdx])) {
    throw new Error(`End line ${endLine} is not '};': ${JSON.stringify(lines[endIdx])}`);
  }
  return { name: nameMatch[1], body: bodyLines.join('\n') };
}

function rewriteRegistrationBody(body) {
  let next = body;
  next = next.replace(/\bshowRegistrationValidationIssues\s*\(/g, 'getScope().showRegistrationValidationIssues(');
  next = next.replace(/\bgetRegistrationFormIssues\s*\(/g, 'getScope().getRegistrationFormIssues(');
  next = next.replace(/\bresetEditRegistryModal\s*\(/g, 'getScope().resetEditRegistryModal(');
  // llamadas a lista de espera (misma unidad)
  next = next.replace(/\bhandleAddToWaitlist\s*\(/g, 'runAddToWaitlist(getScope, ');
  // ref de registro (debe vivir en getScope)
  next = next.replace(/\bisRegisteringRef\b/g, 'getScope().isRegisteringRef');
  return next;
}

const excel = extractArrowFunction(8, 1857);
fs.writeFileSync(
  path.join(outDir, 'runExportExcel.js'),
  `/** Carga bajo demanda: export Excel (antes en useAppMainHandlers). */\nexport async function runExportExcel(getScope, exportScope = null) {\n${excel.body}\n}\n`,
  'utf8',
);

const updateUser = extractArrowFunction(4964, 5419);
fs.writeFileSync(
  path.join(outDir, 'runUpdateUser.js'),
  `/** Carga bajo demanda: actualizar usuario. */\nexport async function runUpdateUser(getScope, e) {\n${updateUser.body}\n}\n`,
  'utf8',
);

const addEntry = extractArrowFunction(8307, 9124);
const addWaitlist = extractArrowFunction(9126, 9799);
const updateEntry = extractArrowFunction(9877, 10711);

const regModule = `/** Carga bajo demanda: altas / lista de espera / edición de registro. */
export async function runAddToWaitlist(getScope, loc, _calledInternally = false, waitlistOptions = null, entrySource) {
${rewriteRegistrationBody(addWaitlist.body)}
}

export async function runAddEntry(getScope, loc, entrySource) {
${rewriteRegistrationBody(addEntry.body)}
}

export async function runUpdateEntry(getScope, e) {
${rewriteRegistrationBody(updateEntry.body)}
}
`;
fs.writeFileSync(path.join(outDir, 'registrationWriteHandlers.js'), regModule, 'utf8');

const replacements = [
  {
    start: 9877,
    end: 10711,
    stub: `  const handleUpdateEntry = async (e) => {
    const mod = await import('./handlers/registrationWriteHandlers.js');
    return mod.runUpdateEntry(getScope, e);
  };`,
  },
  {
    start: 9126,
    end: 9799,
    stub: `  const handleAddToWaitlist = async (loc, _calledInternally = false, waitlistOptions = null, entrySource) => {
    const mod = await import('./handlers/registrationWriteHandlers.js');
    return mod.runAddToWaitlist(getScope, loc, _calledInternally, waitlistOptions, entrySource);
  };`,
  },
  {
    start: 8307,
    end: 9124,
    stub: `  const handleAddEntry = async (loc, entrySource) => {
    const mod = await import('./handlers/registrationWriteHandlers.js');
    return mod.runAddEntry(getScope, loc, entrySource);
  };`,
  },
  {
    start: 4964,
    end: 5419,
    stub: `  const handleUpdateUser = async (e) => {
    const mod = await import('./handlers/runUpdateUser.js');
    return mod.runUpdateUser(getScope, e);
  };`,
  },
  {
    start: 8,
    end: 1857,
    stub: `  const handleExportExcel = async (exportScope = null) => {
    const mod = await import('./handlers/runExportExcel.js');
    return mod.runExportExcel(getScope, exportScope);
  };`,
  },
];

let next = lines.slice();
for (const rep of replacements) {
  const before = next.slice(0, rep.start - 1);
  const after = next.slice(rep.end);
  next = [...before, rep.stub, ...after];
}

fs.writeFileSync(handlersPath, `${next.join('\n')}\n`, 'utf8');
console.log(`useAppMainHandlers: ${lines.length} → ${next.length} lines`);
for (const f of ['runExportExcel.js', 'runUpdateUser.js', 'registrationWriteHandlers.js']) {
  const p = path.join(outDir, f);
  console.log(`  ${f}: ${(fs.statSync(p).size / 1024).toFixed(1)} KB`);
}
