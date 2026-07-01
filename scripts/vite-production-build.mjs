/**
 * Vite build + persist buildSeq + last-successful-build.json (sin candado).
 */
import { spawnSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { readPackageSemver, getStoredBuildSeq } from './vite-build-version.mjs';

const ROOT = process.cwd();
const LAST_BUILD_FILE = join(ROOT, '.agent', 'last-successful-build.json');

export function mergeProductionNodeOptions() {
  const flag = '--max-old-space-size=6144';
  const existing = String(process.env.NODE_OPTIONS || '').trim();
  if (existing.includes('max-old-space-size')) return existing;
  return existing ? `${existing} ${flag}` : flag;
}

export function writeLastSuccessfulBuild() {
  if (!existsSync(join(ROOT, '.agent'))) mkdirSync(join(ROOT, '.agent'), { recursive: true });
  const semver = readPackageSemver();
  const buildSeq = getStoredBuildSeq(semver);
  writeFileSync(
    LAST_BUILD_FILE,
    `${JSON.stringify({ semver, buildSeq: String(buildSeq), builtAt: new Date().toISOString() }, null, 2)}\n`,
    'utf8'
  );
}

export function runViteProductionBuild() {
  const env = { ...process.env, NODE_OPTIONS: mergeProductionNodeOptions() };
  const vite = spawnSync('pnpm', ['exec', 'vite', 'build'], { cwd: ROOT, stdio: 'inherit', env, shell: true });
  if (vite.status !== 0) process.exit(vite.status ?? 1);
  const persist = spawnSync('node', ['scripts/persist-vite-build-seq.mjs'], { cwd: ROOT, stdio: 'inherit' });
  if (persist.status !== 0) process.exit(persist.status ?? 1);
  writeLastSuccessfulBuild();
}
