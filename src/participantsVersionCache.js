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
  return (prev || []).map((p) => (String(p.id) === id ? { ...p, ...patch } : p));
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

/** Prefer IndexedDB (lecturas gratis); solo va al servidor si no hay caché persistente. */
async function loadEventParticipantsQueryFromStore(eventId) {
  const q = query(getColRef('app_participants'), where('eventId', '==', eventId));
  try {
    const cached = await getDocsFromCache(q);
    if (!cached.empty) {
      logCacheDecision(`pe_event_${eventId}`, { event: 'participants-from-idb-cache', rows: cached.size });
      return cached;
    }
  } catch {
    /* sin caché local */
  }
  return getDocs(q);
}

function isParticipantSliceHit(local, remoteV) {
  return Boolean(
    local?.data &&
      Array.isArray(local.data) &&
      participantCacheVersionsCompatible(local.version, remoteV)
  );
}

/**
 * Carga participantes del evento usando versión por sede + IndexedDB.
 * Si alguna sede no coincide, una sola lectura `eventId == …` y se actualizan las cachés.
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
      const remoteV = await fetchRemoteCacheVersion(scope);
      const local = await readVersionCacheRecord(scope);
      versionByLoc.set(loc, { scope, remoteV, local });
    })
  );

  const isHit = (loc) => {
    const { remoteV, local } = versionByLoc.get(loc);
    return isParticipantSliceHit(local, remoteV);
  };

  const anyMiss = locs.some((loc) => !isHit(loc));

  if (!anyMiss) {
    const merged = locs.flatMap((loc) => versionByLoc.get(loc).local.data);
    const byId = new Map();
    for (const p of merged) byId.set(String(p.id), p);
    for (const loc of locs) {
      const { scope, remoteV, local } = versionByLoc.get(loc);
      logCacheDecision(scope, {
        event: 'hit',
        version: remoteV,
        rows: local.data.length,
        source: 'indexedDB',
        sede: loc,
      });
    }
    return stripCompanionWaitlistPhantomRows([...byId.values()]);
  }

  const snap = await loadEventParticipantsQueryFromStore(eid);
  const all = stripCompanionWaitlistPhantomRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));

  for (const loc of locs) {
    const { scope, remoteV } = versionByLoc.get(loc);
    const slice = all.filter((p) => normalizeLocKey(p.location) === loc);
    const vToStore = await resolveVersionForStore(scope, remoteV);
    await writeLocalVersionCache(scope, vToStore, slice, { eventId: eid, location: loc });
    logCacheDecision(scope, {
      event: anyMiss && !isHit(loc) ? 'miss-refetch' : 'refresh-cache',
      version: vToStore,
      rows: slice.length,
      source: 'firestore',
      sede: loc,
    });
  }

  return all;
}

export async function refetchParticipantsForLocation(eventId, location) {
  const eid = String(eventId || '').trim();
  const loc = normalizeLocKey(location);
  if (!eid || !loc) return [];

  const scope = scopeParticipantsLocation(eid, loc);
  const remoteV = await fetchRemoteCacheVersion(scope);

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

  const vToStore = await resolveVersionForStore(scope, remoteV);
  await writeLocalVersionCache(scope, vToStore, slice, { eventId: eid, location: loc });
  logCacheDecision(scope, { event: 'refetch', version: vToStore, rows: slice.length, sede: loc });
  return stripCompanionWaitlistPhantomRows(slice);
}

export function replaceParticipantsForLocation(prev, eventId, location, slice) {
  const eid = String(eventId || '').trim();
  const loc = normalizeLocKey(location);
  const filtered = (prev || []).filter(
    (p) => !(String(p.eventId) === eid && normalizeLocKey(p.location) === loc)
  );
  return [...filtered, ...slice];
}

/**
 * Escucha cambios de versión por sede; si cambia, pide recargar esa sede.
 */
export function subscribeParticipantsLocationVersions(eventId, locations, onLocationStale) {
  const eid = String(eventId || '').trim();
  const locs = [...new Set((locations || []).map(normalizeLocKey).filter(Boolean))];
  const unsubs = [];

  for (const loc of locs) {
    const scope = scopeParticipantsLocation(eid, loc);
    const unsub = onSnapshot(
      getDocRef('app_cache_versions', scope),
      { includeMetadataChanges: false },
      (snap) => {
        const remoteV = snap.exists() ? normalizeCacheVersion(snap.data()?.v) : 0;
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

  return () => {
    for (const u of unsubs) u();
  };
}

/**
 * Coalesce avisos de sedes obsoletas (evita N refetch seguidos al abrir un evento con muchas sedes).
 * @param {(eventId: string, locations: string[]) => void} onLocationsStale
 */
export function subscribeParticipantsLocationVersionsDebounced(
  eventId,
  locations,
  onLocationsStale,
  debounceMs = 400
) {
  const pendingLocs = new Set();
  let timer = null;
  const eid = String(eventId || '').trim();

  const flush = () => {
    timer = null;
    if (pendingLocs.size === 0) return;
    const locs = [...pendingLocs];
    pendingLocs.clear();
    onLocationsStale(eid, locs);
  };

  const unsub = subscribeParticipantsLocationVersions(eid, locations, (_ev, loc) => {
    const key = normalizeLocKey(loc);
    if (!key) return;
    pendingLocs.add(key);
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, Math.max(100, Number(debounceMs) || 400));
  });

  return () => {
    if (timer) clearTimeout(timer);
    unsub();
  };
}

export async function loadArchivedParticipantsWithVersionCache() {
  const scope = scopeParticipantsArchive();
  const remoteV = await fetchRemoteCacheVersion(scope);
  const local = await readVersionCacheRecord(scope);

  if (
    local?.data &&
    Array.isArray(local.data) &&
    participantCacheVersionsCompatible(local.version, remoteV)
  ) {
    logCacheDecision(scope, { event: 'hit', version: remoteV, rows: local.data.length, source: 'indexedDB' });
    return local.data;
  }

  const PARTICIPANT_STATUS_ARCHIVED = 'archived';
  const snap = await getDocs(
    query(getColRef('app_participants'), where('status', '==', PARTICIPANT_STATUS_ARCHIVED))
  );
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const vToStore = await resolveVersionForStore(scope, remoteV);
  await writeLocalVersionCache(scope, vToStore, all, { kind: 'archive' });
  logCacheDecision(scope, {
    event: 'miss-refetch',
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
