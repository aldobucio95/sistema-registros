/**
 * Build de producción con candado y tope de heap Node.
 * Uso: pnpm run build:prod
 */
import { runWithLock } from './heavy-task-lock.mjs';
import { runViteProductionBuild } from './vite-production-build.mjs';

runWithLock('build', () => {
  runViteProductionBuild();
  console.log('[build:prod] Listo.');
});
