/**
 * Copia archivos críticos a .local-snapshots/ antes de ediciones grandes.
 * Uso: pnpm run snapshot:critical
 *      pnpm run snapshot:critical -- src/App.jsx src/cashCutRefunds.js
 */
import { copyFile, mkdir, readdir, rm, stat } from 'fs/promises';
import { dirname, join, relative } from 'path';

const ROOT = process.cwd();
const SNAPSHOT_ROOT = join(ROOT, '.local-snapshots');
const MAX_SNAPSHOTS = 20;

const DEFAULT_FILES = [
  'src/App.jsx',
  'src/locationRosterTypeSummary.js',
  'src/rosterCanonicalCounts.js',
  'src/cashCutRefunds.js',
];

function pad2(n) {
  return String(n).padStart(2, '0');
}

function snapshotDirName(date = new Date()) {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  const h = pad2(date.getHours());
  const min = pad2(date.getMinutes());
  return `${y}${m}${d}-${h}${min}`;
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function pruneOldSnapshots() {
  if (!(await exists(SNAPSHOT_ROOT))) return;
  const entries = await readdir(SNAPSHOT_ROOT, { withFileTypes: true });
  const dirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  const excess = dirs.length - MAX_SNAPSHOTS + 1;
  if (excess <= 0) return;
  for (const name of dirs.slice(0, excess)) {
    await rm(join(SNAPSHOT_ROOT, name), { recursive: true, force: true });
    console.log(`[snapshot:critical] eliminado snapshot antiguo: ${name}`);
  }
}

async function main() {
  const extraArgs = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const files = extraArgs.length > 0 ? extraArgs : DEFAULT_FILES;
  const destDir = join(SNAPSHOT_ROOT, snapshotDirName());
  await mkdir(destDir, { recursive: true });

  const copied = [];
  for (const rel of files) {
    const src = join(ROOT, rel);
    if (!(await exists(src))) {
      console.warn(`[snapshot:critical] omitido (no existe): ${rel}`);
      continue;
    }
    const dest = join(destDir, rel);
    await mkdir(dirname(dest), { recursive: true });
    await copyFile(src, dest);
    copied.push(rel);
  }

  await pruneOldSnapshots();

  console.log(`[snapshot:critical] ${copied.length} archivo(s) → ${relative(ROOT, destDir)}`);
  for (const f of copied) console.log(`  - ${f}`);
}

main().catch((err) => {
  console.error('[snapshot:critical] error:', err);
  process.exit(1);
});
