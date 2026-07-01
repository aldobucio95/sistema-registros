/**
 * Versiones circulares en Firestore (`app_cache_versions`) + caché local.
 * Índice de versión en localStorage; blobs de datos en IndexedDB (`versionCacheStore.js`).
 * Si la versión remota coincide con la local, se evita releer colecciones grandes.
 */
import { getDoc, getDocFromCache, getDocFromServer, onSnapshot, updateDoc, setDoc, increment } from 'firebase/firestore';
import { getDocRef } from './firebaseRefs.js';
import { sanitizeFirestoreDocId } from './firestoreDocId.js';
import { idbGetRecord, idbPutRecord, idbDeleteRecord } from './versionCacheStore.js';

/** Máximo inclusive; al incrementar desde aquí se reinicia a 1. */
export const CACHE_VERSION_MAX = 999999;

export const LS_PREFIX = 'vnpm_cv1_';

const MIGRATION_FLAG_KEY = 'vnpm_cv1_idb_migrated';

/** Serializa bumps de `logs_head` en esta pestaña (varios addLog seguidos). */
let logsHeadBumpQueue = Promise.resolve();

export function nextCircularVersion(current) {
  const n = Math.floor(Number(current) || 0);
  if (n < 1) return 1;
  if (n >= CACHE_VERSION_MAX) return 1;
  return n + 1;
}

export function normalizeCacheVersion(v) {
  const n = Math.floor(Number(v) || 0);
  if (n < 1) return 0;
  if (n > CACHE_VERSION_MAX) return ((n - 1) % CACHE_VERSION_MAX) + 1;
  return n;
}

/** Comparación estricta; versiones 0 (ausentes) nunca coinciden con datos cacheados. */
export function cacheVersionsMatch(a, b) {
  const na = normalizeCacheVersion(a);
  const nb = normalizeCacheVersion(b);
  if (na === 0 || nb === 0) return false;
  return na === nb;
}

/**
 * Participantes/archivo (`pe_*`): la caché local sembrada (v≥1) sigue válida mientras no exista
 * doc remoto (v=0). La invalidación real solo ocurre cuando la Cloud Function incrementa `v`.
 */
export function participantCacheVersionsCompatible(localV, remoteV) {
  const local = normalizeCacheVersion(localV);
  const remote = normalizeCacheVersion(remoteV);
  if (cacheVersionsMatch(local, remote)) return true;
  if (remote === 0 && local >= 1) return true;
  return false;
}

export function scopeParticipantsLocation(eventId, location) {
  const e = sanitizeFirestoreDocId(eventId, { maxChars: 240, fallback: 'event' });
  const loc = sanitizeFirestoreDocId(location, { maxChars: 120, fallback: 'sin-sede' });
  return `pe_${e}_${loc}`;
}

export function scopeLogsHead() {
  return 'logs_head';
}

export function scopeParticipantsArchive() {
  return 'pe_archive_global';
}

function lsKey(scope) {
  return `${LS_PREFIX}${scope}`;
}

function scopeFromLsKey(key) {
  const k = String(key || '');
  if (!k.startsWith(LS_PREFIX)) return '';
  return k.slice(LS_PREFIX.length);
}

function parseIndexPayload(raw) {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    if (!p || typeof p !== 'object') return null;
    return {
      version: normalizeCacheVersion(p.version),
      savedAt: Number(p.savedAt) || 0,
      meta: p.meta && typeof p.meta === 'object' ? p.meta : {},
    };
  } catch {
    return null;
  }
}

/**
 * Índice sincrónico (solo versión/meta) para listeners y bumps.
 * Los datos viven en IndexedDB; usar `readVersionCacheRecord` para cargar el blob.
 */
export function readLocalVersionCache(scope) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(lsKey(scope));
    return parseIndexPayload(raw);
  } catch {
    return null;
  }
}

/** Escribe el índice pequeño en localStorage (sin datos). */
export function writeLocalVersionIndex(scope, version, meta = {}) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      lsKey(scope),
      JSON.stringify({
        version: normalizeCacheVersion(version),
        savedAt: Date.now(),
        meta,
      })
    );
  } catch (e) {
    console.warn('[cache-version] no se pudo guardar índice en localStorage:', scope, e);
  }
}

/**
 * Registro completo desde IndexedDB (versión + datos + meta).
 * @returns {Promise<{ version: number, savedAt: number, data: unknown, meta: object } | null>}
 */
export async function readVersionCacheRecord(scope) {
  const idbRec = await idbGetRecord(scope);
  if (!idbRec || typeof idbRec !== 'object') return null;
  return {
    version: normalizeCacheVersion(idbRec.version),
    savedAt: Number(idbRec.savedAt) || 0,
    data: idbRec.data,
    meta: idbRec.meta && typeof idbRec.meta === 'object' ? idbRec.meta : {},
  };
}

/** Persiste datos en IndexedDB e índice de versión en localStorage. */
export async function writeLocalVersionCache(scope, version, data, meta = {}) {
  const v = normalizeCacheVersion(version);
  const savedAt = Date.now();
  const metaObj = meta && typeof meta === 'object' ? meta : {};
  try {
    await idbPutRecord(scope, { version: v, savedAt, data, meta: metaObj });
  } catch (e) {
    console.warn('[cache-version] no se pudo guardar en IndexedDB:', scope, e);
  }
  writeLocalVersionIndex(scope, v, metaObj);
}

export async function clearLocalVersionCache(scope) {
  try {
    await idbDeleteRecord(scope);
  } catch {
    /* ignore */
  }
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(lsKey(scope));
  } catch {
    /* ignore */
  }
}

/**
 * Migra blobs legacy en localStorage a IndexedDB (una vez por navegador).
 * Libera cuota de localStorage dejando solo el índice de versión.
 */
export async function migrateLegacyLocalStorageCache() {
  if (typeof window === 'undefined') return;
  try {
    if (window.localStorage.getItem(MIGRATION_FLAG_KEY) === '1') return;
  } catch {
    return;
  }

  let migrated = 0;
  try {
    const keys = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(LS_PREFIX)) keys.push(key);
    }

    for (const key of keys) {
      const scope = scopeFromLsKey(key);
      if (!scope) continue;
      let raw;
      try {
        raw = window.localStorage.getItem(key);
      } catch {
        continue;
      }
      if (!raw) continue;

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        continue;
      }
      if (!parsed || typeof parsed !== 'object') continue;

      const version = normalizeCacheVersion(parsed.version);
      const savedAt = Number(parsed.savedAt) || Date.now();
      const meta = parsed.meta && typeof parsed.meta === 'object' ? parsed.meta : {};
      const hasLegacyData = Object.prototype.hasOwnProperty.call(parsed, 'data');

      if (hasLegacyData && version > 0) {
        const existing = await idbGetRecord(scope);
        if (!existing) {
          await idbPutRecord(scope, {
            version,
            savedAt,
            data: parsed.data,
            meta,
          });
        }
        migrated += 1;
      }

      if (hasLegacyData || version > 0) {
        writeLocalVersionIndex(scope, version || 1, meta);
      }
    }

    window.localStorage.setItem(MIGRATION_FLAG_KEY, '1');
    if (migrated > 0) {
      logCacheDecision('migration', { event: 'legacy-localStorage-to-idb', scopes: migrated });
    }
  } catch (e) {
    console.warn('[cache-version] migración legacy falló', e);
  }
}

export function logCacheDecision(scope, detail) {
  if (detail && typeof detail === 'object') {
    console.info('[cache-version]', scope, detail);
  } else {
    console.info('[cache-version]', scope, detail ?? '');
  }
}

export async function fetchRemoteCacheVersion(scope, opts = {}) {
  const ref = getDocRef('app_cache_versions', scope);
  const preferServer = opts.preferServer !== false;
  try {
    if (preferServer) {
      try {
        const serverSnap = await getDocFromServer(ref);
        if (serverSnap.exists()) return normalizeCacheVersion(serverSnap.data()?.v);
        return 0;
      } catch {
        /* offline o sin red: caer a caché local de Firestore */
      }
    }
    try {
      const cached = await getDocFromCache(ref);
      if (cached.exists()) return normalizeCacheVersion(cached.data()?.v);
    } catch {
      /* sin caché local de Firestore */
    }
    const snap = await getDoc(ref);
    if (!snap.exists()) return 0;
    return normalizeCacheVersion(snap.data()?.v);
  } catch (e) {
    console.warn('[cache-version] lectura remota falló:', scope, e);
    return 0;
  }
}

/**
 * Repara el índice localStorage cuando IndexedDB tiene datos pero el índice falta o difiere.
 * Evita que el listener dispare refetch en cada snapshot tras un cache HIT.
 */
export async function syncLocalVersionIndexFromIdb(scope) {
  const idbRec = await readVersionCacheRecord(scope);
  if (!idbRec || idbRec.version < 1) return false;
  const local = readLocalVersionCache(scope);
  const meta = idbRec.meta && typeof idbRec.meta === 'object' ? idbRec.meta : {};
  if (!local || !cacheVersionsMatch(local.version, idbRec.version)) {
    writeLocalVersionIndex(scope, idbRec.version, meta);
    return true;
  }
  return false;
}

/**
 * Incrementa la versión del documento de caché (`FieldValue.increment`, sin transacción).
 * Evita `failed-precondition` cuando varias pestañas escriben a la vez; la comparación usa `normalizeCacheVersion`.
 * @returns {Promise<number|null>} Nueva versión normalizada o null si falló.
 */
export async function bumpCacheVersion(scope, meta = {}) {
  const ref = getDocRef('app_cache_versions', scope);
  const action = meta.action != null ? String(meta.action).slice(0, 240) : '';
  const fields = {
    updatedAt: Date.now(),
    ...(action ? { lastAction: action } : {}),
    ...(meta.eventId ? { eventId: String(meta.eventId) } : {}),
    ...(meta.location ? { location: String(meta.location) } : {}),
  };
  try {
    try {
      await updateDoc(ref, { v: increment(1), ...fields });
    } catch (e) {
      if (String(e?.code || '') !== 'not-found') throw e;
      await setDoc(ref, { v: 1, ...fields }, { merge: true });
    }
    const local = readLocalVersionCache(scope);
    const estimated = local?.version ? nextCircularVersion(local.version) : 1;
    logCacheDecision(scope, { event: 'bump', version: estimated, action: action || '—' });
    return estimated;
  } catch (e) {
    console.error('[cache-version] bump falló:', scope, e);
    return null;
  }
}

export async function bumpParticipantsLocationCache(eventId, location, action = '') {
  const eid = String(eventId || '').trim();
  const loc = String(location || '').trim();
  if (!eid || !loc) return null;
  return bumpCacheVersion(scopeParticipantsLocation(eid, loc), {
    action,
    eventId: eid,
    location: loc,
  });
}

export function bumpLogsHeadCache(action = '') {
  const run = () => bumpCacheVersion(scopeLogsHead(), { action });
  logsHeadBumpQueue = logsHeadBumpQueue.then(run, run);
  return logsHeadBumpQueue;
}

/** Espera bumps de `logs_head` en curso (p. ej. antes de `signOut`). */
export async function waitLogsHeadBumpQueueIdle() {
  try {
    await logsHeadBumpQueue;
  } catch {
    /* ignore */
  }
}

/** Si no hay versión remota, crea la inicial (evita caché local con v=1 y remoto 0). */
export async function resolveVersionForStore(scope, remoteV) {
  const rv = normalizeCacheVersion(remoteV);
  if (rv > 0) return rv;
  /** Participantes/archivo: no incrementar `app_cache_versions` desde el cliente (solo Cloud Function). */
  if (String(scope || '').startsWith('pe_')) return 1;
  const bumped = await bumpCacheVersion(scope, { action: 'init-cache' });
  return bumped || 1;
}

export function subscribeLogsHeadVersion(onStale) {
  const scope = scopeLogsHead();
  return onSnapshot(
    getDocRef('app_cache_versions', scope),
    { includeMetadataChanges: false },
    (snap) => {
      const remoteV = snap.exists() ? normalizeCacheVersion(snap.data()?.v) : 0;
      const local = readLocalVersionCache(scope);
      if (local && cacheVersionsMatch(local.version, remoteV)) return;
      logCacheDecision(scope, {
        event: 'version-changed',
        remoteVersion: remoteV,
        localVersion: local?.version ?? 0,
      });
      onStale(remoteV);
    },
    (err) => console.error('[cache-version] listener logs', err)
  );
}

/**
 * Igual que subscribeLogsHeadVersion pero coalesce callbacks (p. ej. 500 ms) para evitar refetch en ráfaga.
 * @param {(remoteV: number) => void} onStale
 * @param {number} [debounceMs=500]
 */
export function subscribeLogsHeadVersionDebounced(onStale, debounceMs = 500) {
  let timer = null;
  const unsub = subscribeLogsHeadVersion((remoteV) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      onStale(remoteV);
    }, Math.max(100, Number(debounceMs) || 500));
  });
  return () => {
    if (timer) clearTimeout(timer);
    unsub();
  };
}
