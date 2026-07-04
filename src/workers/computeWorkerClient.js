import { computeWorkspaceSidebarBadges } from '../workspaceSidebarBadgesCompute.js';
import { computeTransportPlanningData } from './computeTasks/transportPlanningData.js';

/** A partir de este tamaño, los cálculos pesados se delegan al Web Worker. */
export const COMPUTE_WORKER_MIN_PARTICIPANTS = 120;

let worker = null;
let seq = 0;
const pending = new Map();

function runComputeSync(type, payload) {
  switch (type) {
    case 'sidebarBadges':
      return computeWorkspaceSidebarBadges(payload);
    case 'transportPlanning':
      return computeTransportPlanningData(payload);
    default:
      throw new Error(`Unknown compute job: ${type}`);
  }
}

function getWorker() {
  if (typeof Worker === 'undefined') return null;
  if (!worker) {
    worker = new Worker(new URL('./computeWorker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (event) => {
      const { id, ok, result, error } = event.data || {};
      const job = pending.get(id);
      if (!job) return;
      pending.delete(id);
      if (ok) job.resolve(result);
      else job.reject(new Error(error || 'Compute worker failed'));
    };
    worker.onerror = (err) => {
      for (const [, job] of pending) job.reject(err);
      pending.clear();
      worker?.terminate();
      worker = null;
    };
  }
  return worker;
}

export function shouldOffloadComputeToWorker(participantCount = 0) {
  return Number(participantCount) >= COMPUTE_WORKER_MIN_PARTICIPANTS && typeof Worker !== 'undefined';
}

/**
 * Ejecuta un trabajo de cómputo en Web Worker (o en el hilo principal si el roster es pequeño).
 * @param {'sidebarBadges'|'transportPlanning'} type
 */
export function runComputeWorkerJob(type, payload, { participantCount } = {}) {
  const count =
    participantCount ??
    payload?.allParticipants?.length ??
    payload?.roster?.length ??
    0;

  if (!shouldOffloadComputeToWorker(count)) {
    return Promise.resolve(runComputeSync(type, payload));
  }

  const w = getWorker();
  if (!w) return Promise.resolve(runComputeSync(type, payload));

  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ id, type, payload });
  });
}
