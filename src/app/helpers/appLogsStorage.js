import { omitUndefinedDeep } from '../../firestorePayloadSanitize.js';

export const LOGS_SESSION_CACHE_MAX = 2500;
export const LOGS_SESSION_CACHE_KEY = 'vnpm_logs_cache';

/** Campos de `app_data/config` que no deben perderse al revertir otro cambio de configuración. */
export const CONFIG_LOG_META_PRESERVE_KEYS = [
  'logStorageMaxEntries',
  'logStorageMaxEntriesUpdatedAt',
  'logsTotalCount',
  'logsTotalCountUpdatedAt',
];

/** Caché de logs revertibles por sesión de depuración (sessionStorage). */
export const debugRevertStorageKey = (sessionId) => `vnpm_debug_revert_${String(sessionId)}`;

/**
 * Al revertir un `app_events` con `setDoc(previousData)`, un `previousData` capturado antes
 * de que el snapshot actualizara el estado puede omitir sedes añadidas al evento (p. ej. Querétaro/Neza).
 * Se conserva la unión de sedes entre el snapshot revertido y el documento actual.
 */
export function isPartialAppEventRevertData(previousData) {
  if (!previousData || typeof previousData !== 'object') return false;
  const keys = Object.keys(previousData).filter((k) => k !== 'id');
  if (!keys.length) return false;
  const hasCoreEventFields = keys.some((k) =>
    ['name', 'eventType', 'startDate', 'endDate', 'paymentDeadlineDate'].includes(k)
  );
  return !hasCoreEventFields;
}

export function mergeAppEventDocForRevert(previousData, currentData, docId) {
  const prev = previousData && typeof previousData === 'object' ? { ...previousData } : {};
  const cur = currentData && typeof currentData === 'object' ? currentData : {};
  const locSet = new Set(
    [...(Array.isArray(prev.locations) ? prev.locations : []), ...(Array.isArray(cur.locations) ? cur.locations : [])]
      .map((x) => String(x).trim())
      .filter(Boolean)
  );
  const { id: _dropId, ...prevRest } = prev;
  return omitUndefinedDeep({
    ...prevRest,
    id: String(docId || prev.id || '').trim() || docId,
    locations: [...locSet],
    regStatus: { ...(cur.regStatus || {}), ...(prev.regStatus || {}) },
    locationCaps: { ...(cur.locationCaps || {}), ...(prev.locationCaps || {}) },
    cardPaymentByLocation: { ...(cur.cardPaymentByLocation || {}), ...(prev.cardPaymentByLocation || {}) },
  });
}

/** Añade al evento de respaldo sedes que aparecen en participantes pero faltan en `events[].locations`. */
export function enrichBackupEventsWithParticipantLocations(events, participants) {
  return (events || []).map((ev) => {
    const locSet = new Set(
      (Array.isArray(ev.locations) ? ev.locations : []).map((x) => String(x).trim()).filter(Boolean)
    );
    for (const p of participants || []) {
      if (String(p?.eventId || '') !== String(ev?.id || '')) continue;
      const loc = String(p?.location ?? '').trim();
      if (loc) locSet.add(loc);
    }
    if (locSet.size === 0) return ev;
    return { ...ev, locations: [...locSet] };
  });
}

/** Clon de `snapshot.data()` para `revertInfo.previousData` (revertir con `setDoc` completo). */
export function cloneFirestoreDocDataForRevert(raw) {
  if (raw == null || typeof raw !== 'object') return null;
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(raw);
    } catch {
      /* no clonable */
    }
  }
  try {
    return JSON.parse(JSON.stringify(raw));
  } catch {
    return { ...raw };
  }
}

export function persistLogsToSessionCache(entries) {
  try {
    const toStore = entries.slice(0, LOGS_SESSION_CACHE_MAX);
    sessionStorage.setItem(LOGS_SESSION_CACHE_KEY, JSON.stringify({ ts: Date.now(), entries: toStore }));
  } catch (_) {
    /* quota u otro */
  }
}

export function clearLogsSessionCache() {
  try {
    sessionStorage.removeItem(LOGS_SESSION_CACHE_KEY);
  } catch (_) {}
}
