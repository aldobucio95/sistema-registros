/**
 * Deploy Firestore (reglas + índices) sin build de hosting.
 * Uso: pnpm run deploy:firestore
 */
import { spawnSync } from 'child_process';
import { runWithLock } from './heavy-task-lock.mjs';

const ROOT = process.cwd();

runWithLock('deploy-firestore', () => {
  const r = spawnSync('pnpm', ['exec', 'firebase', 'deploy', '--only', 'firestore'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
  console.log('[deploy:firestore] Listo.');
});
