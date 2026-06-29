import { deleteCurrentUserIfAnonymous } from './anonymousAuthCleanup.js';

/** Sin registro exitoso: cerrar sesión y borrar cuenta anónima tras 1 h. */
export const PUBLIC_ANON_BROWSE_MS = 60 * 60 * 1000;
/** Tras cada registro exitoso: conservar cuenta anónima 10 min (p. ej. otro registro). */
export const PUBLIC_ANON_SUCCESS_RETAIN_MS = 10 * 60 * 1000;

const STORAGE_PREFIX = 'vnpm_pub_anon_v1:';
const browseTimers = new Map();
const successTimers = new Map();

function storageKey(linkId) {
  return `${STORAGE_PREFIX}${String(linkId || '').trim()}`;
}

function readRecord(linkId) {
  if (!linkId) return null;
  try {
    const raw = sessionStorage.getItem(storageKey(linkId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeRecord(linkId, record) {
  if (!linkId) return;
  try {
    sessionStorage.setItem(storageKey(linkId), JSON.stringify(record));
  } catch {
    /* cuota / privado */
  }
}

export function clearPublicAnonSessionRecord(linkId) {
  if (!linkId) return;
  try {
    sessionStorage.removeItem(storageKey(linkId));
  } catch {
    /* */
  }
}

function clearBrowseTimer(linkId) {
  const id = browseTimers.get(linkId);
  if (id != null) window.clearTimeout(id);
  browseTimers.delete(linkId);
}

function clearSuccessTimer(linkId) {
  const id = successTimers.get(linkId);
  if (id != null) window.clearTimeout(id);
  successTimers.delete(linkId);
}

export function clearPublicAnonymousTimers(linkId) {
  if (!linkId) return;
  clearBrowseTimer(linkId);
  clearSuccessTimer(linkId);
}

function ensureSessionStarted(linkId) {
  const now = Date.now();
  const prev = readRecord(linkId);
  if (!prev?.startedAt) {
    writeRecord(linkId, { startedAt: now, lastSuccessAt: null });
    return now;
  }
  return prev.startedAt;
}

/** true si pasó 1 h desde abrir el enlace sin ningún registro exitoso. */
export function isPublicBrowseSessionExpired(linkId) {
  const rec = readRecord(linkId);
  if (!rec?.startedAt || rec.lastSuccessAt) return false;
  return Date.now() - rec.startedAt >= PUBLIC_ANON_BROWSE_MS;
}

/** Borra la sesión anónima de inmediato (p. ej. ya pasó 1 h al recargar). */
export async function expirePublicBrowseSessionNow(authInstance, linkId, onExpire) {
  clearPublicAnonymousTimers(linkId);
  await deleteCurrentUserIfAnonymous(authInstance);
  clearPublicAnonSessionRecord(linkId);
  onExpire?.();
}

/**
 * Al mostrar el formulario (enlace abierto, sin registro aún): vigilar 1 h y ejecutar onExpire.
 */
export function startPublicBrowseSessionWatch(authInstance, linkId, onExpire) {
  if (!linkId) return () => {};
  clearBrowseTimer(linkId);

  const startedAt = ensureSessionStarted(linkId);
  const rec = readRecord(linkId);
  if (rec?.lastSuccessAt) {
    return () => clearBrowseTimer(linkId);
  }

  const runExpire = async () => {
    clearBrowseTimer(linkId);
    clearSuccessTimer(linkId);
    await deleteCurrentUserIfAnonymous(authInstance);
    clearPublicAnonSessionRecord(linkId);
    onExpire?.();
  };

  const elapsed = Date.now() - startedAt;
  if (elapsed >= PUBLIC_ANON_BROWSE_MS) {
    void runExpire();
    return () => {};
  }

  const remaining = PUBLIC_ANON_BROWSE_MS - elapsed;
  const timerId = window.setTimeout(() => void runExpire(), remaining);
  browseTimers.set(linkId, timerId);
  return () => clearBrowseTimer(linkId);
}

/**
 * Tras registro exitoso: cancela el límite de 1 h y programa borrado a los 10 min.
 */
export function registerPublicRegistrationSuccess(authInstance, linkId) {
  if (!linkId) return;
  const rec = readRecord(linkId) || { startedAt: Date.now(), lastSuccessAt: null };
  writeRecord(linkId, { ...rec, lastSuccessAt: Date.now() });
  clearBrowseTimer(linkId);
  clearSuccessTimer(linkId);

  const runDelete = async () => {
    clearSuccessTimer(linkId);
    await deleteCurrentUserIfAnonymous(authInstance);
    clearPublicAnonSessionRecord(linkId);
  };

  const timerId = window.setTimeout(() => void runDelete(), PUBLIC_ANON_SUCCESS_RETAIN_MS);
  successTimers.set(linkId, timerId);
}
