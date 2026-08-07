import { getDocs, getDocsFromServer, onSnapshot, query, where } from 'firebase/firestore';
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
  resolveVersionForStore,
} from './firestoreVersionCache.js';

/** Si el snapshot no es del servidor, no sellar IndexedDB con remoteV (evita hit falso). */
export function shouldPersistVersionedParticipantSlice(fromServer) {
  return fromServer === true;
}

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

/**
 * Tras un miss de versión, los datos DEBEN venir del servidor.
 * Usar `getDocsFromCache` aquí envenenaba IndexedDB: se guardaba el roster viejo
 * con el `remoteV` nuevo y el listener dejaba de refetch (hit falso permanente).
 */
async function loadEventParticipantsQueryFromServer(eventId) {
  const q = query(getColRef('app_participants'), where('eventId', '==', eventId));
  try {
    const snap = await getDocsFromServer(q);
    logCacheDecision(`pe_event_${eventId}`, {
      event: 'participants-from-server',
      rows: snap.size,
      fromCache: false,
    });
    return { snap, fromServer: true };
  } catch (e) {
    /* offline / sin red: última opción; el caller no debe sellar esta data con remoteV */
    const snap = await getDocs(q);
    const fromServer = !(snap?.metadata?.fromCache);
    logCacheDecision(`pe_event_${eventId}`, {
      event: fromServer ? 'participants-from-getDocs' : 'participants-from-cache-offline',
      rows: snap.size,
      fromCache: !fromServer,
      error: String(e?.code || e?.message || e || ''),
    });
    return { snap, fromServer };
  }
}

function isParticipantSliceHit(local, remoteV) {
  return Boolean(local?.data && Array.isArray(local.data) && cacheVersionsMatch(local.version, remoteV));
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
    const { snap } = await loadEventParticipantsQueryFromServer(eid);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
    return [...byId.values()];
  }

  const { snap, fromServer } = await loadEventParticipantsQueryFromServer(eid);
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const persistOk = shouldPersistVersionedParticipantSlice(fromServer);

  for (const loc of locs) {
    const { scope, remoteV } = versionByLoc.get(loc);
    const slice = all.filter((p) => normalizeLocKey(p.location) === loc);
    if (!persistOk) {
      logCacheDecision(scope, {
        event: 'miss-skip-stamp-offline',
        remoteVersion: remoteV,
        rows: slice.length,
        source: 'cache-offline',
        sede: loc,
      });
      continue;
    }
    const vToStore = await resolveVersionForStore(scope, remoteV);
    await writeLocalVersionCache(scope, vToStore, slice, { eventId: eid, location: loc });
    logCacheDecision(scope, {
      event: anyMiss && !isHit(loc) ? 'miss-refetch' : 'refresh-cache',
      version: vToStore,
      rows: slice.length,
      source: 'firestore-server',
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
  let fromServer = false;
  const runQuery = async (q) => {
    try {
      const snap = await getDocsFromServer(q);
      return { snap, fromServer: true };
    } catch {
      const snap = await getDocs(q);
      return { snap, fromServer: !(snap?.metadata?.fromCache) };
    }
  };
  try {
    const { snap, fromServer: ok } = await runQuery(
      query(
        getColRef('app_participants'),
        where('eventId', '==', eid),
        where('location', '==', loc)
      )
    );
    fromServer = ok;
    slice = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    const { snap, fromServer: ok } = await runQuery(
      query(getColRef('app_participants'), where('eventId', '==', eid))
    );
    fromServer = ok;
    slice = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((p) => normalizeLocKey(p.location) === loc);
  }

  if (!shouldPersistVersionedParticipantSlice(fromServer)) {
    logCacheDecision(scope, {
      event: 'refetch-skip-stamp-offline',
      remoteVersion: remoteV,
      rows: slice.length,
      sede: loc,
    });
    return slice;
  }

  const vToStore = await resolveVersionForStore(scope, remoteV);
  await writeLocalVersionCache(scope, vToStore, slice, { eventId: eid, location: loc });
  logCacheDecision(scope, { event: 'refetch', version: vToStore, rows: slice.length, sede: loc });
  return slice;
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
        if (local && cacheVersionsMatch(local.version, remoteV)) return;
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

export async function loadArchivedParticipantsWithVersionCache() {
  const scope = scopeParticipantsArchive();
  const remoteV = await fetchRemoteCacheVersion(scope);
  const local = await readVersionCacheRecord(scope);

  if (local?.data && Array.isArray(local.data) && cacheVersionsMatch(local.version, remoteV)) {
    logCacheDecision(scope, { event: 'hit', version: remoteV, rows: local.data.length, source: 'indexedDB' });
    return local.data;
  }

  const PARTICIPANT_STATUS_ARCHIVED = 'archived';
  const q = query(getColRef('app_participants'), where('status', '==', PARTICIPANT_STATUS_ARCHIVED));
  let snap;
  let fromServer = true;
  try {
    snap = await getDocsFromServer(q);
  } catch {
    snap = await getDocs(q);
    fromServer = !(snap?.metadata?.fromCache);
  }
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (!shouldPersistVersionedParticipantSlice(fromServer)) {
    logCacheDecision(scope, {
      event: 'miss-skip-stamp-offline',
      remoteVersion: remoteV,
      rows: all.length,
      source: 'cache-offline',
    });
    return all;
  }
  const vToStore = await resolveVersionForStore(scope, remoteV);
  await writeLocalVersionCache(scope, vToStore, all, { kind: 'archive' });
  logCacheDecision(scope, {
    event: 'miss-refetch',
    version: vToStore,
    rows: all.length,
    source: 'firestore-server',
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
      if (local && cacheVersionsMatch(local.version, remoteV)) return;
      logCacheDecision(scope, { event: 'version-changed', remoteVersion: remoteV, localVersion: local?.version ?? 0 });
      onStale(remoteV);
    },
    (err) => console.error('[cache-version] listener archivo', err)
  );
}
