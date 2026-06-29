/**
 * Cierra una sesión del agente: valida, compila y hace commit+push a agent/auto.
 * Uso: pnpm run agent:finish
 *      pnpm run agent:finish -- "mensaje opcional del commit"
 */
import { execSync, spawnSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const AGENT_BRANCH = 'agent/auto';

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd: ROOT, stdio: 'inherit', ...opts });
}

function readBuildSeq() {
  try {
    const raw = readFileSync(join(ROOT, '.vite-build-state.json'), 'utf8');
    const data = JSON.parse(raw);
    return data?.buildSeq ?? data?.seq ?? '?';
  } catch {
    return '?';
  }
}

function hasChanges() {
  const out = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf8' });
  return out.trim().length > 0;
}

function currentBranch() {
  return execSync('git rev-parse --abbrev-ref HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
}

function main() {
  const customMsg = process.argv.slice(2).join(' ').trim();
  const buildSeq = readBuildSeq();

  run('pnpm run check:utf8');
  run('pnpm run build');

  if (!hasChanges()) {
    console.log('\n[agent:finish] Sin cambios pendientes; no se hace commit.');
    return;
  }

  const branch = currentBranch();
  if (branch !== AGENT_BRANCH) {
    try {
      run(`git rev-parse --verify ${AGENT_BRANCH}`);
      run(`git checkout ${AGENT_BRANCH}`);
    } catch {
      run(`git checkout -b ${AGENT_BRANCH}`);
    }
  }

  run('git add -A');
  const message =
    customMsg ||
    `agent: snapshot buildSeq ${buildSeq} — respaldo automático de sesión`;
  const commit = spawnSync('git', ['commit', '-m', message], { cwd: ROOT, stdio: 'inherit' });
  if (commit.status !== 0) process.exit(commit.status ?? 1);

  try {
    run(`git push -u origin ${AGENT_BRANCH}`);
  } catch {
    console.warn('[agent:finish] push falló; el commit local quedó guardado.');
    process.exit(1);
  }

  console.log(`\n[agent:finish] Listo en rama ${AGENT_BRANCH} (buildSeq ${buildSeq}).`);
}

main();
