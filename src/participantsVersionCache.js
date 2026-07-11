import { getDocs, getDocsFromCache, getDocsFromServer, onSnapshot, query, where } from 'firebase/firestore';
import { getColRef, getDocRef } from './firebaseRefs.js';
import {
  scopeParticipantsLocation,
  scopeParticipantsArchive,
  fetchRemoteCacheVersion,
  readLocalVersionCache,
  readVersionCacheRecord,
  writeLocalVersionCache,
  cacheVersionsMatch,
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

/** Parche que no afecta índices de roster Bautizos ni agrupación por sede. */
export function isAssignedServeAreaOnlyPatch(patch) {
  if (!patch || typeof patch !== 'object') return false;
  const keys = Object.keys(patch);
  return keys.length === 1 && keys[0] === 'assignedServeArea';
}

/**
 * @deprecated La Cloud Function invalida caché al escribir participantes; no bump en cliente.
 */
export async function bumpParticipantsForPerson(_person, _action = '', _options = {}) {
  return null;
}

/** @deprecated La Cloud Function invalida caché por sede en batch. */
export async function bumpParticipantsLocationsForEvent(_eventId, _locations, _action = '') {
  return;
}

/**
 * @deprecated Usar invalidación vía Cloud Function únicamente.
 */
export async function bumpParticipantsLocationCache(_eventId, _location, _action = '') {
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

export function mergeParticipantRowsById(rows) {
  const byId = new Map();
  for (const row of rows || []) {
    const id = String(row?.id || '').trim();
    if (!id) continue;
    byId.set(id, row);
  }
  return [...byId.values()];
}

function participantsFromCachedLocationSlices(versionByLoc, locs) {
  return mergeParticipantRowsById(
    stripCompanionWaitlistPhantomRows(
      locs.flatMap((loc) => {
        const local = versionByLoc.get(loc)?.local;
        return Array.isArray(local?.data) ? local.data : [];
      })
    )
  );
}

async function storeParticipantSlicesFromEventRows(eid, locs, versionByLoc, all) {
  for (const loc of locs) {
    const { scope, remoteV, local } = versionByLoc.get(loc);
    const slice = all.filter((p) => normalizeLocKey(p.location) === loc);
    const vToStore = await resolveVersionForStore(scope, remoteV);
    await writeLocalVersionCache(scope, vToStore, slice, { eventId: eid, location: loc });
    logCacheDecision(scope, {
      event: isParticipantSliceHit(local, remoteV) ? 'refresh-cache' : 'miss-refetch',
      version: vToStore,
      rows: slice.length,
      source: 'firestore',
      sede: loc,
    });
  }
}

/**
 * Carga participantes del evento usando caché por sede cuando la versión coincide.
 * Solo relee `app_participants` en miss (total o por sede); los listeners mantienen datos frescos en sesión.
 */
export async function loadEventParticipantsWithVersionCache(eventId, locations) {
  const eid = String(eventId || '').trim();
  if (!eid) return [];

  const locs = [...new Set((locations || []).map(normalizeLocKey).filter(Boolean))];
  if (locs.length === 0) {
    const snap = await loadEventParticipantsQueryFromStore(eid);
    return stripCompanionWaitlistPhantomRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }

  const versionByLoc = new Map();
  await Promise.all(
    locs.map(async (loc) => {
      const scope = scopeParticipantsLocation(eid, loc);
      const [remoteV, local] = await Promise.all([
        fetchRemoteCacheVersion(scope, { preferServer: true }),
        readVersionCacheRecord(scope),
      ]);
      versionByLoc.set(loc, { scope, remoteV, local });
    })
  );

  const hitLocs = [];
  const missLocs = [];
  for (const loc of locs) {
    const { remoteV, local } = versionByLoc.get(loc);
    if (isParticipantSliceHit(local, remoteV)) hitLocs.push(loc);
    else missLocs.push(loc);
  }

  if (missLocs.length === 0) {
    const merged = participantsFromCachedLocationSlices(versionByLoc, hitLocs);
    logCacheDecision(`pe_event_${eid}`, {
      event: 'participants-cache-hit',
      rows: merged.length,
      sedes: hitLocs.length,
    });
    return merged;
  }

  if (hitLocs.length === 0) {
    const snap = await loadEventParticipantsQueryFromStore(eid);
    const all = stripCompanionWaitlistPhantomRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    await storeParticipantSlicesFromEventRows(eid, locs, versionByLoc, all);
    return all;
  }

  let merged = participantsFromCachedLocationSlices(versionByLoc, hitLocs);
  const refetchResults = await Promise.all(
    missLocs.map((loc) => {
      const { remoteV } = versionByLoc.get(loc);
      return refetchParticipantsForLocation(eid, loc, { remoteV });
    })
  );
  missLocs.forEach((_loc, i) => {
    merged = mergeParticipantRowsById([...merged, ...(refetchResults[i]?.slice || [])]);
  });
  logCacheDecision(`pe_event_${eid}`, {
    event: 'participants-partial-cache',
    rows: merged.length,
    hitSedes: hitLocs.length,
    missSedes: missLocs.length,
  });
  return merged;
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

/** Tras escritura local: alinea IndexedDB con memoria sin releer todos los documentos de la sede. */
export async function syncLocalParticipantLocationCacheFromMemory(eventId, location, allRows) {
  const eid = String(eventId || '').trim();
  const loc = normalizeLocKey(location);
  if (!eid || !loc) return 0;

  const slice = stripCompanionWaitlistPhantomRows(
    (allRows || []).filter(
      (p) => String(p.eventId) === eid && normalizeLocKey(p.location) === loc
    )
  );
  const scope = scopeParticipantsLocation(eid, loc);
  const latestV = await fetchRemoteCacheVersion(scope, { preferServer: true });
  const vToStore = latestV > 0 ? latestV : await resolveVersionForStore(scope, 0);
  await writeLocalVersionCache(scope, vToStore, slice, { eventId: eid, location: loc });
  logCacheDecision(scope, {
    event: 'local-sync-after-write',
    version: vToStore,
    rows: slice.length,
    sede: loc,
  });
  return vToStore;
}

/** Lee versión remota de caché de sede tras escritura propia (documento pequeño, sin refetch de roster). */
export async function fetchParticipantLocationCacheVersionAfterWrite(eventId, location, opts = {}) {
  const eid = String(eventId || '').trim();
  const loc = normalizeLocKey(location);
  if (!eid || !loc) return 0;
  const scope = scopeParticipantsLocation(eid, loc);
  return fetchRemoteCacheVersion(scope, { preferServer: opts.preferServer === true });
}

/**
 * Versión para ack del listener sin bloquear la UI (caché Firestore, espera corta al bump de CF).
 * @param {number} [opts.maxWaitMs]
 */
export async function resolveParticipantLocationVersionForAck(eventId, location, opts = {}) {
  const eid = String(eventId || '').trim();
  const loc = normalizeLocKey(location);
  if (!eid || !loc) return 0;
  const scope = scopeParticipantsLocation(eid, loc);
  const baseline = normalizeCacheVersion(readLocalVersionCache(scope)?.version);
  const maxWaitMs = Math.max(200, Number(opts.maxWaitMs) || 1200);
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    const cachedV = await fetchRemoteCacheVersion(scope, { preferServer: false, networkFallback: false });
    if (cachedV > baseline) return cachedV;
    if (cachedV > 0 && baseline <= 0) return cachedV;
    await new Promise((r) => setTimeout(r, 100));
  }

  const finalV = await fetchRemoteCacheVersion(scope, { preferServer: false, networkFallback: false });
  if (finalV > 0) return finalV;
  return baseline;
}

/** IndexedDB de sede en segundo plano (no bloquear UI tras parches optimistas). */
export function deferSyncLocalParticipantLocationCacheFromMemory(eventId, location, allRows) {
  const eid = String(eventId || '').trim();
  const loc = normalizeLocKey(location);
  if (!eid || !loc) return;
  const run = () => {
    void syncLocalParticipantLocationCacheFromMemory(eid, loc, allRows);
  };
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(run, { timeout: 8000 });
  } else {
    setTimeout(run, 300);
  }
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

const OWN_WRITE_SKIP_REFETCH_MS = 20000;
/** @type {Map<string, number>} */
const ownWriteSkipRefetchUntil = new Map();

/** Tras escritura propia con parche en memoria: omitir refetch del listener de versión. */
export function markParticipantLocationOwnWrite(eventId, location, ttlMs = OWN_WRITE_SKIP_REFETCH_MS) {
  const eid = String(eventId || '').trim();
  const loc = normalizeLocKey(location);
  if (!eid || !loc) return;
  ownWriteSkipRefetchUntil.set(
    scopeParticipantsLocation(eid, loc),
    Date.now() + Math.max(1000, Number(ttlMs) || OWN_WRITE_SKIP_REFETCH_MS)
  );
}

export function shouldSkipParticipantLocationOwnWriteRefetch(eventId, location) {
  const eid = String(eventId || '').trim();
  const loc = normalizeLocKey(location);
  if (!eid || !loc) return false;
  const scope = scopeParticipantsLocation(eid, loc);
  const until = ownWriteSkipRefetchUntil.get(scope);
  if (!until) return false;
  if (Date.now() > until) {
    ownWriteSkipRefetchUntil.delete(scope);
    return false;
  }
  return true;
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

  const refetchT0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const results = await Promise.all(
    locs.map((loc) => refetchParticipantsForLocation(eid, loc, { remoteV: opts.remoteV }))
  );
  const refetchMs = refetchT0 && typeof performance !== 'undefined' ? performance.now() - refetchT0 : 0;
  if (opts.onRefetchComplete) {
    opts.onRefetchComplete({ ms: refetchMs, locs, rowCounts: results.map((r) => r?.slice?.length ?? 0) });
  }

  const applyMerge = () => {
    applyToState((prev) => {
      let next = prev || [];
      locs.forEach((loc, i) => {
        next = replaceParticipantsForLocation(next, eid, loc, results[i]?.slice || []);
      });
      return next;
    });
  };

  if (typeof opts.startTransition === 'function') {
    opts.startTransition(applyMerge);
  } else {
    applyMerge();
  }

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
  const cachedRows = local?.data?.length ?? 0;

  const PARTICIPANT_STATUS_ARCHIVED = 'archived';
  const q = query(getColRef('app_participants'), where('status', '==', PARTICIPANT_STATUS_ARCHIVED));
  let snap;
  try {
    snap = await getDocsFromServer(q);
  } catch {
    if (isParticipantSliceHit(local, remoteV)) {
      logCacheDecision(scope, { event: 'hit-offline', version: remoteV, rows: local.data.length, source: 'indexedDB' });
      return local.data;
    }
    snap = await getDocs(q);
  }
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const vToStore = await resolveVersionForStore(scope, remoteV);
  await writeLocalVersionCache(scope, vToStore, all, { kind: 'archive' });
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
