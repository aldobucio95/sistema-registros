import { useEffect } from 'react';
import { getDocs } from 'firebase/firestore';
import { getTransportCarMetaColRef, getTransportVehiclesColRef } from '../../firebaseRefs.js';
import { isTransportV2Plan, migrateEventTransportToV2 } from '../v2/transportMigration.js';

/**
 * Migra v1 → v2 al abrir Transporte, o rellena v2 si el evento ya está marcado v2 pero los datos siguen en v1.
 */
export async function ensureTransportV2Data(eventId, transportPlanning, updateDoc) {
  const eid = String(eventId || '').trim();
  if (!eid || typeof updateDoc !== 'function') return { skipped: true };

  if (!isTransportV2Plan(transportPlanning)) {
    return migrateEventTransportToV2(eid, { updateDoc });
  }

  const [v1Snap, v2Snap] = await Promise.all([
    getDocs(getTransportCarMetaColRef(eid)),
    getDocs(getTransportVehiclesColRef(eid)),
  ]);
  if (v1Snap.empty || v2Snap.size >= v1Snap.size) {
    return { migrated: false, reason: v1Snap.empty ? 'v1_empty' : 'v2_synced', v1: v1Snap.size, v2: v2Snap.size };
  }
  return migrateEventTransportToV2(eid, { updateDoc });
}

/** Eventos ya sometidos a ensure en esta sesión (evita migraciones duplicadas). */
const migrationAttemptedEventIds = new Set();

function scheduleIdleWork(fn) {
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(fn, { timeout: 2000 });
    return () => cancelIdleCallback(id);
  }
  const t = setTimeout(fn, 0);
  return () => clearTimeout(t);
}

/**
 * Hook: migración / backfill lazy al abrir Transporte (una vez por evento).
 * Diferido al idle del navegador para no bloquear el primer paint.
 */
export function useTransportV2Migration(eventId, transportPlanning, updateDoc) {
  useEffect(() => {
    const eid = String(eventId || '').trim();
    if (!eid || typeof updateDoc !== 'function') return undefined;
    if (migrationAttemptedEventIds.has(eid)) return undefined;

    let cancelled = false;
    const run = () => {
      if (cancelled || migrationAttemptedEventIds.has(eid)) return;
      migrationAttemptedEventIds.add(eid);
      void ensureTransportV2Data(eid, transportPlanning, updateDoc).catch((err) => {
        console.error('[transport-v2] ensureTransportV2Data', err);
        migrationAttemptedEventIds.delete(eid);
      });
    };

    const cancelSchedule = scheduleIdleWork(run);
    return () => {
      cancelled = true;
      cancelSchedule();
    };
  }, [eventId, transportPlanning, updateDoc]);
}
