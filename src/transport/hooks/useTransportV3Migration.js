import { useEffect } from 'react';
import { isTransportV3Plan, migrateEventTransportToV3 } from '../v3/transportMigration.js';
import { ensureTransportV2Data } from './useTransportV2Migration.js';

const migrationAttemptedEventIds = new Set();

function scheduleIdleWork(fn) {
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(fn, { timeout: 2500 });
    return () => cancelIdleCallback(id);
  }
  const t = setTimeout(fn, 0);
  return () => clearTimeout(t);
}

/**
 * Asegura datos v3 (unidades de carro). Si hace falta, pasa por v2 primero.
 */
export async function ensureTransportV3Data(eventId, transportPlanning, updateDoc) {
  const eid = String(eventId || '').trim();
  if (!eid || typeof updateDoc !== 'function') return { skipped: true };

  if (isTransportV3Plan(transportPlanning)) {
    return { migrated: false, reason: 'already_v3' };
  }

  // Best-effort: tener v2 antes de v3
  try {
    await ensureTransportV2Data(eid, transportPlanning, updateDoc);
  } catch {
    /* ignore */
  }

  return migrateEventTransportToV3(eid, { updateDoc, plan: transportPlanning });
}

/**
 * Hook: migración / backfill lazy al abrir Transporte (una vez por evento).
 */
export function useTransportV3Migration(eventId, transportPlanning, updateDoc) {
  const transportVersion = Number(transportPlanning?.transportVersion) || 0;
  useEffect(() => {
    const eid = String(eventId || '').trim();
    if (!eid || typeof updateDoc !== 'function') return undefined;
    if (migrationAttemptedEventIds.has(eid)) return undefined;
    if (transportVersion >= 3) {
      migrationAttemptedEventIds.add(eid);
      return undefined;
    }

    let cancelled = false;
    const run = () => {
      if (cancelled || migrationAttemptedEventIds.has(eid)) return;
      migrationAttemptedEventIds.add(eid);
      void ensureTransportV3Data(eid, transportPlanning, updateDoc).catch((err) => {
        console.error('[transport-v3] ensureTransportV3Data', err);
        migrationAttemptedEventIds.delete(eid);
      });
    };

    const cancelSchedule = scheduleIdleWork(run);
    return () => {
      cancelled = true;
      cancelSchedule();
    };
    // Solo reaccionar a eventId / versión — no al objeto transportPlanning completo.
  }, [eventId, transportVersion, updateDoc, transportPlanning]);
}
