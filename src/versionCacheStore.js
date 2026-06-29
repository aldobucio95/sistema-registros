/**
 * Almacén IndexedDB para blobs de caché versionada (participantes por sede, archivo, logs).
 * localStorage solo guarda el índice de versión; los datos viven aquí.
 */

const DB_NAME = 'vnpm_cache';
const DB_VERSION = 1;
const STORE_NAME = 'versioned';

let dbOpenPromise = null;

function isIdbAvailable() {
  return typeof indexedDB !== 'undefined';
}

function openDb() {
  if (!isIdbAvailable()) return Promise.resolve(null);
  if (dbOpenPromise) return dbOpenPromise;
  dbOpenPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onerror = () => {
        console.warn('[cache-version] IndexedDB open failed');
        resolve(null);
      };
      req.onsuccess = () => resolve(req.result);
      req.onupgradeneeded = (ev) => {
        const db = ev.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'scope' });
        }
      };
    } catch (e) {
      console.warn('[cache-version] IndexedDB unavailable', e);
      resolve(null);
    }
  });
  return dbOpenPromise;
}

/**
 * @param {string} scope
 * @returns {Promise<{ scope: string, version: number, savedAt: number, data: unknown, meta: object } | null>}
 */
export async function idbGetRecord(scope) {
  const key = String(scope || '').trim();
  if (!key) return null;
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        const raw = req.result;
        resolve(raw && typeof raw === 'object' ? raw : null);
      };
      req.onerror = () => {
        console.warn('[cache-version] IndexedDB get failed');
        resolve(null);
      };
    } catch (e) {
      console.warn('[cache-version] IndexedDB get error', e);
      resolve(null);
    }
  });
}

/**
 * @param {string} scope
 * @param {{ version: number, savedAt?: number, data: unknown, meta?: object }} record
 */
export async function idbPutRecord(scope, record) {
  const key = String(scope || '').trim();
  if (!key || !record || typeof record !== 'object') return;
  const db = await openDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({
        scope: key,
        version: record.version,
        savedAt: record.savedAt ?? Date.now(),
        data: record.data,
        meta: record.meta && typeof record.meta === 'object' ? record.meta : {},
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => {
        console.warn('[cache-version] IndexedDB put failed');
        resolve();
      };
    } catch (e) {
      console.warn('[cache-version] IndexedDB put error', e);
      resolve();
    }
  });
}

/** @param {string} scope */
export async function idbDeleteRecord(scope) {
  const key = String(scope || '').trim();
  if (!key) return;
  const db = await openDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/** @returns {Promise<string[]>} */
export async function idbListScopes() {
  const db = await openDb();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAllKeys();
      req.onsuccess = () => {
        const keys = req.result || [];
        resolve(keys.map((k) => String(k)));
      };
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}
