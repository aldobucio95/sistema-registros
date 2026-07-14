import { getDocs, getDocsFromCache, getDocsFromServer, onSnapshot, query, where } from 'firebase/firestore';
import { getColRef, getDocRef } from './firebaseRefs.js';
import {
  scopeParticipantsLocation,
  scopeParticipantsArchive,
  fetchRemoteCacheVersion,
  readLocalVersionCache,
  readVersionCacheRecord,
  writeLocalVersionCache,
  logCacheDecision,
  normalizeCacheVersion,
  participantCacheVersionsCompatible,
  resolveVersionForStore,
  syncLocalVersionIndexFromIdb,
} from './firestoreVersionCache.js';

/** Documentos huérfanos `cw:…` en Firestore (duplican filas virtuales del titular activo). */
function isCompanionWaitlistPhantomStoredParticipant(personLike) {
  if (personLike?._isCompanionWaitlistVirtual === true) return true;
  return String(personLike?.id || '').trim().startsWith('cw:');
}

function stripCompanionWaitlistPhantomRows(rows) {
  return (rows || []).filter((p) => !isCompanionWaitlistPhantomStoredParticipant(p));
}

export { stripCompanionWaitlistPhantomRows };

/**
 * Aplica un parche a un participante en un arreglo en memoria (p. ej. `allParticipants`).
 */
export function patchParticipantsInList(prev, personId, patch) {
  const id = String(personId || '').trim();
  if (!id || !patch || typeof patch !== 'object') return prev || [];
  const list = prev || [];
  const exists = list.some((p) => String(p.id) === id);
  if (!exists) return [...list, { ...patch, id }];
  return list.map((p) => (String(p.id) === id ? { ...p, ...patch } : p));
}

/**
 * @deprecated La Cloud Function invalida caché al escribir participantes; no bump en cliente.
 */
export async function bumpParticipantsForPerson() {
  return null;
}

/** @deprecated La Cloud Function invalida caché por sede en batch. */
export async function bumpParticipantsLocationsForEvent() {
  return;
}

/**
 * @deprecated Usar invalidación vía Cloud Function únicamente.
 */
export async function bumpParticipantsLocationCache() {
  return null;
}

function normalizeLocKey(location) {
  return String(location || '').trim();
}

/** Lectura del roster completo del evento; prioriza servidor para datos frescos al abrir la app. */
async function loadEventParticipantsQueryFromStore(eventId) {
  const q = query(getColRef('app_participants'), where('eventId', '==', eventId));
  try {
    const serverSnap = await getDocsFromServer(q);
    logCacheDecision(`pe_event_${eventId}`, { event: 'participants-from-server', rows: serverSnap.size });
    return serverSnap;
  } catch {
    /* sin red: caer a caché offline de Firestore */
  }
  try {
    const cached = await getDocsFromCache(q);
    if (!cached.empty) {
      logCacheDecision(`pe_event_${eventId}`, {
        event: 'participants-from-firestore-cache-offline',
        rows: cached.size,
      });
      return cached;
    }
  } catch {
    /* sin caché local */
  }
  return getDocs(q);
}

/**
 * ¿Usar slice local en IndexedDB al abrir evento?
 * Si no hay doc remoto de versión (v=0), siempre refrescar: la caché local no tiene señal de invalidación.
 */
export function isParticipantSliceHit(local, remoteV) {
  if (!local?.data || !Array.isArray(local.data) || local.data.length === 0) return false;
  if (normalizeCacheVersion(remoteV) === 0) return false;
  return participantCacheVersionsCompatible(local.version, remoteV);
}

/**
 * Carga participantes del evento. Al abrir la app siempre lee Firestore (servidor primero)
 * y actualiza la caché local; los listeners por sede mantienen datos frescos en sesión.
 */
export async function loadEventParticipantsWithVersionCache(eventId, locations) {
  const eid = String(eventId || '').trim();
  if (!eid) return [];

  const locs = [...new Set((locations || []).map(normalizeLocKey).filter(Boolean))];
  const unspecifiedScope = scopeParticipantsLocation(eid, '__unspecified__');

  if (locs.length === 0) {
    const snap = await loadEventParticipantsQueryFromStore(eid);
    return stripCompanionWaitlistPhantomRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }

  const versionByLoc = new Map();
  await Promise.all([
    ...locs.map(async (loc) => {
      const scope = scopeParticipantsLocation(eid, loc);
      const remoteV = await fetchRemoteCacheVersion(scope, { preferServer: true });
      const local = await readVersionCacheRecord(scope);
      versionByLoc.set(loc, { scope, remoteV, local });
    }),
    (async () => {
      const localUnsp = await readVersionCacheRecord(unspecifiedScope);
      versionByLoc.set('__unspecified__', { scope: unspecifiedScope, local: localUnsp });
    })()
  ]);

  const isHit = (loc) => {
    const { remoteV, local } = versionByLoc.get(loc);
    return isParticipantSliceHit(local, remoteV);
  };

  const allHits = locs.every(isHit);

  if (allHits) {
    let all = [];
    for (const loc of locs) {
      const { local, scope } = versionByLoc.get(loc);
      all = [...all, ...local.data];
      logCacheDecision(scope, {
        event: 'hit-initial-load',
        version: local.version,
        rows: local.data.length,
        source: 'indexedDB',
        sede: loc,
      });
    }
    const { local: localUnsp } = versionByLoc.get('__unspecified__');
    const unspData = localUnsp?.data || [];
    all = [...all, ...unspData];
    logCacheDecision(unspecifiedScope, {
      event: 'hit-initial-load-unspecified',
      rows: unspData.length,
      source: 'indexedDB',
    });
    return all;
  }

  // If there is any miss, we load all event participants from the server once to rebuild the cache.
  const snap = await loadEventParticipantsQueryFromStore(eid);
  const all = stripCompanionWaitlistPhantomRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));

  for (const loc of locs) {
    const { scope, remoteV } = versionByLoc.get(loc);
    const slice = all.filter((p) => normalizeLocKey(p.location) === loc);
    const vToStore = await resolveVersionForStore(scope, remoteV);
    await writeLocalVersionCache(scope, vToStore, slice, { eventId: eid, location: loc });
    logCacheDecision(scope, {
      event: 'miss-refetch-initial-load',
      version: vToStore,
      rows: slice.length,
      source: 'firestore',
      sede: loc,
    });
  }

  const unspecifiedSlice = all.filter((p) => !locs.includes(normalizeLocKey(p.location)));
  await writeLocalVersionCache(unspecifiedScope, 1, unspecifiedSlice, { eventId: eid, location: '__unspecified__' });
  logCacheDecision(unspecifiedScope, {
    event: 'miss-refetch-initial-load-unspecified',
    rows: unspecifiedSlice.length,
    source: 'firestore',
  });

  return all;
}

export async function refetchParticipantsForLocation(eventId, location, opts = {}) {
  const eid = String(eventId || '').trim();
  const loc = normalizeLocKey(location);
  if (!eid || !loc) return { slice: [], versionWritten: 0 };

  const scope = scopeParticipantsLocation(eid, loc);

  let slice;
  const runQuery = async (q) => {
    try {
      return await getDocsFromServer(q);
    } catch {
      return getDocs(q);
    }
  };
  try {
    const snap = await runQuery(
      query(
        getColRef('app_participants'),
        where('eventId', '==', eid),
        where('location', '==', loc)
      )
    );
    slice = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    const snap = await runQuery(query(getColRef('app_participants'), where('eventId', '==', eid)));
    slice = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((p) => normalizeLocKey(p.location) === loc);
  }

  const latestV = await fetchRemoteCacheVersion(scope, { preferServer: true });
  const vToStore =
    latestV > 0 ? latestV : await resolveVersionForStore(scope, normalizeCacheVersion(opts.remoteV));
  const cleaned = stripCompanionWaitlistPhantomRows(slice);
  await writeLocalVersionCache(scope, vToStore, cleaned, { eventId: eid, location: loc });
  logCacheDecision(scope, { event: 'refetch', version: vToStore, rows: cleaned.length, sede: loc });
  return { slice: cleaned, versionWritten: vToStore };
}

export function replaceParticipantsForLocation(prev, eventId, location, slice) {
  const eid = String(eventId || '').trim();
  const loc = normalizeLocKey(location);
  const filtered = (prev || []).filter(
    (p) => !(String(p.eventId) === eid && normalizeLocKey(p.location) === loc)
  );
  return [...filtered, ...slice];
}

/** Suprime refetch del listener mientras esta pestaña escribe participantes en ráfaga (p. ej. backfill WA). */
let participantVersionListenerSuppressDepth = 0;

export function suppressParticipantVersionListeners() {
  participantVersionListenerSuppressDepth += 1;
  return () => {
    participantVersionListenerSuppressDepth = Math.max(0, participantVersionListenerSuppressDepth - 1);
  };
}

export function isParticipantVersionListenerSuppressed() {
  return participantVersionListenerSuppressDepth > 0;
}

/**
 * Escucha cambios de versión por sede; si cambia, pide recargar esa sede.
 * @returns {{ unsub: () => void, acknowledgeLocationVersion: (loc: string, remoteV: number) => void }}
 */
export function subscribeParticipantsLocationVersions(eventId, locations, onLocationStale, opts = {}) {
  const shouldSuppressStale =
    typeof opts.shouldSuppressStale === 'function' ? opts.shouldSuppressStale : () => false;
  const eid = String(eventId || '').trim();
  const locs = [...new Set((locations || []).map(normalizeLocKey).filter(Boolean))];
  const unsubs = [];
  /** @type {Map<string, (remoteV: number) => void>} */
  const ackByLoc = new Map();

  for (const loc of locs) {
    const scope = scopeParticipantsLocation(eid, loc);
    let isFirst = true;
    let lastRemoteV = null;
    ackByLoc.set(loc, (remoteV) => {
      lastRemoteV = normalizeCacheVersion(remoteV);
    });
    const unsub = onSnapshot(
      getDocRef('app_cache_versions', scope),
      { includeMetadataChanges: false },
      async (snap) => {
        const remoteV = snap.exists() ? normalizeCacheVersion(snap.data()?.v) : 0;

        if (isFirst) {
          isFirst = false;
          lastRemoteV = remoteV;
          await syncLocalVersionIndexFromIdb(scope);
          return;
        }

        if (remoteV === lastRemoteV) return;
        lastRemoteV = remoteV;

        if (shouldSuppressStale()) return;

        const local = readLocalVersionCache(scope);
        if (local && participantCacheVersionsCompatible(local.version, remoteV)) return;
        logCacheDecision(scope, {
          event: 'version-changed',
          remoteVersion: remoteV,
          localVersion: local?.version ?? 0,
          sede: loc,
        });
        onLocationStale(eid, loc, remoteV);
      },
      (err) => console.error('[cache-version] listener sede', scope, err)
    );
    unsubs.push(unsub);
  }

  return {
    unsub: () => {
      for (const u of unsubs) u();
    },
    acknowledgeLocationVersion(loc, remoteV) {
      const key = normalizeLocKey(loc);
      const fn = ackByLoc.get(key);
      if (fn) fn(remoteV);
    },
  };
}

const DEFAULT_STALE_REFETCH_DEBOUNCE_MS = 1500;

/**
 * Coalesce avisos de sedes obsoletas (trailing debounce + un refetch a la vez).
 * @param {(eventId: string, staleItems: { loc: string, remoteV: number }[]) => Promise<{ loc: string, versionWritten: number }[]|void>} onLocationsStale
 */
export function subscribeParticipantsLocationVersionsDebounced(
  eventId,
  locations,
  onLocationsStale,
  debounceMs = DEFAULT_STALE_REFETCH_DEBOUNCE_MS
) {
  /** @type {Map<string, number>} */
  const pendingByLoc = new Map();
  let timer = null;
  let inFlight = false;
  let needsAnotherFlush = false;
  const eid = String(eventId || '').trim();
  const waitMs = Math.max(500, Number(debounceMs) || DEFAULT_STALE_REFETCH_DEBOUNCE_MS);

  const subscription = subscribeParticipantsLocationVersions(
    eid,
    locations,
    (_ev, loc, remoteV) => {
      if (isParticipantVersionListenerSuppressed()) return;
      const key = normalizeLocKey(loc);
      if (!key) return;
      const prev = pendingByLoc.get(key) || 0;
      pendingByLoc.set(key, Math.max(prev, normalizeCacheVersion(remoteV)));
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void runFlush(), waitMs);
    },
    { shouldSuppressStale: isParticipantVersionListenerSuppressed }
  );

  const runFlush = async () => {
    timer = null;
    if (inFlight) {
      needsAnotherFlush = true;
      return;
    }
    if (pendingByLoc.size === 0) return;
    if (isParticipantVersionListenerSuppressed()) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void runFlush(), waitMs);
      return;
    }

    const staleItems = [...pendingByLoc.entries()].map(([loc, remoteV]) => ({ loc, remoteV }));
    pendingByLoc.clear();
    inFlight = true;
    try {
      const acks = await onLocationsStale(eid, staleItems);
      if (Array.isArray(acks)) {
        for (const { loc, versionWritten } of acks) {
          if (versionWritten != null) subscription.acknowledgeLocationVersion(loc, versionWritten);
        }
      }
    } catch (err) {
      console.error('[cache-version] refetch sede(s) debounced', err);
    } finally {
      inFlight = false;
      if (needsAnotherFlush || pendingByLoc.size > 0) {
        needsAnotherFlush = false;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => void runFlush(), waitMs);
      }
    }
  };

  return {
    unsub: () => {
      if (timer) clearTimeout(timer);
      subscription.unsub();
    },
    acknowledgeLocationVersion: subscription.acknowledgeLocationVersion,
  };
}

/**
 * Relee participantes de Firestore por sede, actualiza IndexedDB y fusiona en el estado en memoria.
 * @param {(updater: (prev: object[]) => object[]) => void} applyToState
 */
export async function refetchAndMergeParticipantLocations(eventId, locations, applyToState, opts = {}) {
  const eid = String(eventId || '').trim();
  const locs = [...new Set((locations || []).map(normalizeLocKey).filter(Boolean))];
  if (!eid || locs.length === 0) return [];

  const results = await Promise.all(
    locs.map((loc) => refetchParticipantsForLocation(eid, loc, { remoteV: opts.remoteV }))
  );

  applyToState((prev) => {
    let next = prev || [];
    locs.forEach((loc, i) => {
      next = replaceParticipantsForLocation(next, eid, loc, results[i]?.slice || []);
    });
    return next;
  });

  const acks = locs.map((loc, i) => ({
    loc,
    versionWritten: results[i]?.versionWritten ?? 0,
  }));

  if (typeof opts.acknowledgeLocationVersion === 'function') {
    for (const { loc, versionWritten } of acks) {
      if (versionWritten != null) opts.acknowledgeLocationVersion(loc, versionWritten);
    }
  }

  return acks;
}

export async function loadArchivedParticipantsWithVersionCache() {
  const scope = scopeParticipantsArchive();
  const remoteV = await fetchRemoteCacheVersion(scope, { preferServer: true });
  const local = await readVersionCacheRecord(scope);

  if (isParticipantSliceHit(local, remoteV)) {
    logCacheDecision(scope, {
      event: 'hit-initial-load',
      version: remoteV,
      rows: local.data.length,
      source: 'indexedDB',
    });
    return local.data;
  }

  const PARTICIPANT_STATUS_ARCHIVED = 'archived';
  const q = query(getColRef('app_participants'), where('status', '==', PARTICIPANT_STATUS_ARCHIVED));
  let snap;
  try {
    snap = await getDocsFromServer(q);
  } catch {
    snap = await getDocs(q);
  }
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const vToStore = await resolveVersionForStore(scope, remoteV);
  await writeLocalVersionCache(scope, vToStore, all, { kind: 'archive' });
  const cachedRows = local?.data?.length ?? 0;
  logCacheDecision(scope, {
    event: cachedRows !== all.length ? 'refresh-cache' : 'open-refresh',
    version: vToStore,
    rows: all.length,
    source: 'firestore',
  });
  return all;
}

export function subscribeArchiveParticipantsVersion(onStale) {
  const scope = scopeParticipantsArchive();
  return onSnapshot(
    getDocRef('app_cache_versions', scope),
    { includeMetadataChanges: false },
    (snap) => {
      const remoteV = snap.exists() ? normalizeCacheVersion(snap.data()?.v) : 0;
      const local = readLocalVersionCache(scope);
      if (local && participantCacheVersionsCompatible(local.version, remoteV)) return;
      logCacheDecision(scope, { event: 'version-changed', remoteVersion: remoteV, localVersion: local?.version ?? 0 });
      onStale(remoteV);
    },
    (err) => console.error('[cache-version] listener archivo', err)
  );
}
