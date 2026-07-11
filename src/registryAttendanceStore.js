/**
 * Plan de transporte local para asistencia en Registro Global.
 * Parches silenciosos: sin emit global (evita 700+ re-renders por toggle).
 */
import {
  collectTransportAttendanceAffectedKeys,
  normalizeTransportPlanning,
  patchTransportAttendanceOnPlan,
} from './transportPlanningCore.js';

let snapshot = normalizeTransportPlanning(null);
const keyListeners = new Map();

function emitForKeys(sourceKey) {
  const keys = collectTransportAttendanceAffectedKeys(snapshot, sourceKey);
  const notified = new Set();
  for (const k of keys) {
    const set = keyListeners.get(k);
    if (!set) continue;
    for (const cb of set) {
      if (notified.has(cb)) continue;
      notified.add(cb);
      cb();
    }
  }
}

export function getRegistryAttendancePlanSnapshot() {
  return snapshot;
}

export function subscribeRegistryAttendanceForKey(sourceKey, listener) {
  const sk = String(sourceKey || '').trim();
  if (!sk) return () => {};
  let set = keyListeners.get(sk);
  if (!set) {
    set = new Set();
    keyListeners.set(sk, set);
  }
  set.add(listener);
  return () => {
    set.delete(listener);
    if (set.size === 0) keyListeners.delete(sk);
  };
}

export function initRegistryAttendancePlan(plan) {
  snapshot = normalizeTransportPlanning(plan);
}

export function setRegistryAttendancePlanFromRemote(plan) {
  snapshot = normalizeTransportPlanning(plan);
}

/** Parche local instantáneo; no notifica suscriptores (UI optimista en el toggle). */
export function patchRegistryAttendancePlan(sourceKey, confirmed, confirmedBy = '') {
  snapshot = patchTransportAttendanceOnPlan(snapshot, sourceKey, confirmed, confirmedBy);
  return snapshot;
}

/** Tras snapshot remoto: actualiza solo filas cuyas claves cambiaron. */
export function syncRegistryAttendancePlanFromRemote(plan, sourceKeyHint = '') {
  const prev = snapshot;
  snapshot = normalizeTransportPlanning(plan);
  if (sourceKeyHint) {
    emitForKeys(sourceKeyHint);
    return snapshot;
  }
  const prevMap = prev?.transportAttendanceBySource || {};
  const nextMap = snapshot?.transportAttendanceBySource || {};
  const keys = new Set([...Object.keys(prevMap), ...Object.keys(nextMap)]);
  for (const k of keys) {
    if (JSON.stringify(prevMap[k]) === JSON.stringify(nextMap[k])) continue;
    const set = keyListeners.get(k);
    if (!set) continue;
    for (const cb of set) cb();
  }
  return snapshot;
}
