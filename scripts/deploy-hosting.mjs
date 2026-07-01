/**
 * Build (opcional) + deploy Firebase Hosting con candado.
 * Uso: pnpm run deploy:hosting
 *      pnpm run deploy:hosting:skip-build
 */
import { spawnSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { runWithLock } from './heavy-task-lock.mjs';
import { readPackageSemver, getStoredBuildSeq } from './vite-build-version.mjs';
import { runViteProductionBuild } from './vite-production-build.mjs';

const ROOT = process.cwd();
const skipBuildFlag = process.argv.includes('--skip-build');

function distMatchesCurrentBuildSeq() {
  const versionPath = join(ROOT, 'dist', 'version.json');
  if (!existsSync(versionPath)) return false;
  try {
    const dist = JSON.parse(readFileSync(versionPath, 'utf8'));
    const semver = readPackageSemver();
    const seq = String(getStoredBuildSeq(semver));
    return String(dist.semver) === semver && String(dist.buildSeq) === seq;
  } catch {
    return false;
  }
}

function shouldSkipBuild() {
  if (!skipBuildFlag) return false;
  if (distMatchesCurrentBuildSeq()) {
    console.log('[deploy:hosting] dist/ actualizado; se omite build.');
    return true;
  }
  console.warn('[deploy:hosting] --skip-build pero dist/ no coincide; se compila.');
  return false;
}

runWithLock('deploy-hosting', () => {
  if (!shouldSkipBuild()) {
    runViteProductionBuild();
  }
  const deploy = spawnSync('pnpm', ['exec', 'firebase', 'deploy', '--only', 'hosting'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
  });
  if (deploy.status !== 0) process.exit(deploy.status ?? 1);
  console.log('[deploy:hosting] Listo.');
});
