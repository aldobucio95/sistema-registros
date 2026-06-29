/**
 * Núcleo de "logs como segunda fuente de verdad".
 *
 * Objetivo: que cada acción importante guarde un snapshot íntegro en texto plano
 * (colección lateral `app_log_snapshots`) ANTES del write principal en Firestore,
 * de modo que si el write principal falla (permisos, bug, offline) los datos sigan
 * siendo recuperables desde los logs. Incluye una cola de reintento en IndexedDB
 * para que un fallo de escritura del propio log no pierda la información.
 *
 * Este módulo es framework-agnóstico (sin React) para poder usarse también desde
 * `errorLogger.js` y `main.jsx`.
 */
import { setDoc } from 'firebase/firestore';
import { getDocRef, getPublicDocRef } from './firebaseRefs.js';

/** Colección lateral con el snapshot completo (JSON plano) por log. Se carga solo al expandir. */
export const LOG_SNAPSHOTS_COLLECTION = 'app_log_snapshots';
/** Colección lateral con `previousData` para revertir (esquema previo, se mantiene). */
export const LOG_REVERTS_COLLECTION = 'app_log_reverts';
/** Colección principal de actividad. */
export const LOGS_COLLECTION = 'app_logs';

/** Cap defensivo por debajo del límite de 1 MB por documento de Firestore. */
const SNAPSHOT_MAX_BYTES = 900 * 1024;

/** Estados posibles del write asociado a un log. */
export const LOG_STATUS = Object.freeze({
  OK: 'ok',
  ERROR: 'error',
  PENDING: 'pending',
});

/** Genera un id de log único (timestamp + sufijo aleatorio), igual que el `addLog` histórico. */
export function buildLogId(createdAt = Date.now()) {
  return `${createdAt}${Math.random().toString(36).slice(2, 10)}`;
}

/** Resuelve el doc ref usando la base del panel o la pública (registro por QR). */
function resolveDocRef(collectionName, docId, usePublic) {
  return usePublic ? getPublicDocRef(collectionName, docId) : getDocRef(collectionName, docId);
}

/** Reemplazo seguro para JSON.stringify: rompe ciclos, normaliza fechas y descarta funciones. */
function makeSafeReplacer() {
  const seen = new WeakSet();
  return (key, value) => {
    if (typeof value === 'function') return undefined;
    if (typeof value === 'bigint') return String(value);
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value.toISOString();
    }
    // Firestore Timestamp u objetos con toDate()/toJSON().
    if (value && typeof value === 'object' && typeof value.toDate === 'function') {
      try {
        const d = value.toDate();
        if (d instanceof Date && !Number.isNaN(d.getTime())) return d.toISOString();
      } catch {
        /* ignore */
      }
    }
    if (value && typeof value === 'object') {
      if (seen.has(value)) return '[circular]';
      seen.add(value);
    }
    return value;
  };
}

/**
 * Serializa cualquier payload a JSON de texto plano apto para guardar como respaldo total.
 * No trunca datos de registro salvo el cap defensivo (~900KB) para no romper el límite de Firestore.
 */
export function serializeLogSnapshot(payload) {
  let json;
  try {
    json = JSON.stringify(payload ?? null, makeSafeReplacer());
  } catch {
    try {
      json = JSON.stringify({ __unserializable: true, value: String(payload) });
    } catch {
      json = '{"__unserializable":true}';
    }
  }
  if (json == null) json = 'null';
  if (json.length > SNAPSHOT_MAX_BYTES) {
    json = JSON.stringify({
      __truncated: true,
      __originalLength: json.length,
      preview: json.slice(0, SNAPSHOT_MAX_BYTES),
    });
  }
  return json;
}

/** Construye el documento del snapshot lateral (texto plano + metadatos mínimos). */
export function buildSnapshotDocData(logId, { entityType, entityId, kind = 'snapshot', snapshot, snapshotJson, createdAt = Date.now() } = {}) {
  const json = snapshotJson != null ? String(snapshotJson) : serializeLogSnapshot(snapshot);
  return {
    logId: String(logId),
    createdAt,
    entityType: String(entityType || ''),
    entityId: entityId != null ? String(entityId) : '',
    kind: String(kind || 'snapshot'),
    snapshotJson: json,
  };
}

/**
 * Escribe el snapshot lateral. Si la escritura falla, lo encola en IndexedDB para reintento
 * y NO lanza (para no bloquear la operación principal); devuelve si quedó persistido en Firestore.
 */
export async function writeSnapshotDoc(logId, opts = {}) {
  const id = String(logId);
  const usePublic = !!opts.usePublic;
  const docData = buildSnapshotDocData(id, opts);
  try {
    await setDoc(resolveDocRef(LOG_SNAPSHOTS_COLLECTION, id, usePublic), docData);
    return { ok: true, docData };
  } catch (e) {
    await enqueuePendingLogWrite({
      collectionName: LOG_SNAPSHOTS_COLLECTION,
      docId: id,
      data: docData,
      usePublic,
    });
    return { ok: false, docData, error: e };
  }
}

/** Alias semántico: "respaldo primero" — escribe el snapshot antes del write principal. */
export async function logSnapshotBackup(logId, opts = {}) {
  return writeSnapshotDoc(logId, opts);
}

/**
 * Escribe un documento de `app_logs` con resiliencia: si la escritura falla, lo encola para reintento.
 * Devuelve si quedó persistido en Firestore.
 */
export async function writeLogDoc(logDoc, { usePublic = false } = {}) {
  const id = String(logDoc?.id || buildLogId());
  const data = { ...logDoc, id };
  try {
    await setDoc(resolveDocRef(LOGS_COLLECTION, id, usePublic), data);
    return { ok: true, data };
  } catch (e) {
    await enqueuePendingLogWrite({
      collectionName: LOGS_COLLECTION,
      docId: id,
      data,
      usePublic,
    });
    return { ok: false, data, error: e };
  }
}

/**
 * Orquesta el flujo "respaldo primero":
 *   1) snapshot lateral  -> 2) write principal  -> 3) commit del log (ok/error).
 * `write` ejecuta la mutación real; `commit({ logId, status, errorMessage, hasSnapshot })`
 * persiste el documento de actividad (lo inyecta el llamador, p. ej. envolviendo `addLog`).
 * Relanza el error del write principal tras registrar el log para no alterar el manejo existente.
 */
export async function withLoggedWrite({
  logId,
  entityType,
  entityId,
  snapshot,
  snapshotJson,
  usePublic = false,
  write,
  commit,
}) {
  const id = String(logId || buildLogId());
  let hasSnapshot = false;
  if (snapshot !== undefined || snapshotJson != null) {
    const res = await writeSnapshotDoc(id, { entityType, entityId, snapshot, snapshotJson, usePublic });
    hasSnapshot = res.ok;
  }

  let result;
  let writeError = null;
  try {
    result = typeof write === 'function' ? await write() : undefined;
  } catch (e) {
    writeError = e;
  }

  if (typeof commit === 'function') {
    try {
      await commit({
        logId: id,
        status: writeError ? LOG_STATUS.ERROR : LOG_STATUS.OK,
        errorMessage: writeError ? normalizeErrorMessage(writeError) : '',
        hasSnapshot,
        entityType,
        entityId,
      });
    } catch {
      /* el commit ya tiene su propio fallback; no debe tumbar la operación */
    }
  }

  if (writeError) throw writeError;
  return result;
}

/** Texto corto y seguro a partir de un error (para `errorMessage` del log). */
export function normalizeErrorMessage(err) {
  if (!err) return '';
  if (typeof err === 'string') return err.slice(0, 500);
  const code = err.code ? `[${err.code}] ` : '';
  const msg = err.message || String(err);
  return `${code}${msg}`.slice(0, 500);
}

/* ------------------------------------------------------------------ */
/* Cola de reintento (IndexedDB con respaldo en localStorage)          */
/* ------------------------------------------------------------------ */

const PENDING_DB_NAME = 'vnpm_activity_log_queue';
const PENDING_STORE = 'pending';
const PENDING_DB_VERSION = 1;
const PENDING_LS_KEY = 'vnpm_pending_logs_fallback';
const PENDING_LS_MAX = 500;

function openPendingDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('no-indexeddb'));
      return;
    }
    let req;
    try {
      req = indexedDB.open(PENDING_DB_NAME, PENDING_DB_VERSION);
    } catch (e) {
      reject(e);
      return;
    }
    req.onupgradeneeded = () => {
      const idb = req.result;
      if (!idb.objectStoreNames.contains(PENDING_STORE)) {
        idb.createObjectStore(PENDING_STORE, { keyPath: 'queueId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function readLsQueue() {
  try {
    const arr = JSON.parse(localStorage.getItem(PENDING_LS_KEY) || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeLsQueue(arr) {
  try {
    localStorage.setItem(PENDING_LS_KEY, JSON.stringify((arr || []).slice(-PENDING_LS_MAX)));
  } catch {
    /* quota: nada más que hacer */
  }
}

/** Encola un write fallido (snapshot o log) para reintentarlo más tarde. */
export async function enqueuePendingLogWrite(item) {
  const entry = { queueId: buildLogId(), enqueuedAt: Date.now(), ...item };
  try {
    const idb = await openPendingDb();
    await new Promise((resolve, reject) => {
      const tx = idb.transaction(PENDING_STORE, 'readwrite');
      tx.objectStore(PENDING_STORE).put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    idb.close();
    return true;
  } catch {
    const arr = readLsQueue();
    arr.push(entry);
    writeLsQueue(arr);
    return false;
  }
}

async function readAllPending() {
  const out = [];
  try {
    const idb = await openPendingDb();
    const items = await new Promise((resolve, reject) => {
      const tx = idb.transaction(PENDING_STORE, 'readonly');
      const req = tx.objectStore(PENDING_STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    idb.close();
    out.push(...items.map((it) => ({ ...it, __source: 'idb' })));
  } catch {
    /* sin IndexedDB: solo localStorage */
  }
  for (const it of readLsQueue()) out.push({ ...it, __source: 'ls' });
  return out;
}

async function removePending(entry) {
  if (entry.__source === 'ls') {
    writeLsQueue(readLsQueue().filter((x) => x.queueId !== entry.queueId));
    return;
  }
  try {
    const idb = await openPendingDb();
    await new Promise((resolve, reject) => {
      const tx = idb.transaction(PENDING_STORE, 'readwrite');
      tx.objectStore(PENDING_STORE).delete(entry.queueId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    idb.close();
  } catch {
    /* ignore */
  }
}

let flushInFlight = false;

/**
 * Reintenta escribir en Firestore todos los logs/snapshots encolados. Idempotente
 * (los docs usan id estable). Llamar al iniciar la app y al recuperar conexión.
 */
export async function flushPendingLogQueue() {
  if (flushInFlight) return { attempted: 0, flushed: 0 };
  flushInFlight = true;
  let attempted = 0;
  let flushed = 0;
  try {
    const items = await readAllPending();
    for (const item of items) {
      if (!item?.collectionName || !item?.docId || !item?.data) {
        await removePending(item);
        continue;
      }
      attempted += 1;
      try {
        await setDoc(resolveDocRef(item.collectionName, item.docId, !!item.usePublic), item.data);
        await removePending(item);
        flushed += 1;
      } catch {
        /* sigue pendiente para el próximo intento */
      }
    }
  } finally {
    flushInFlight = false;
  }
  return { attempted, flushed };
}

/** Cantidad aproximada de writes pendientes (para diagnóstico/UI). */
export async function countPendingLogWrites() {
  try {
    const items = await readAllPending();
    return items.length;
  } catch {
    return 0;
  }
}
