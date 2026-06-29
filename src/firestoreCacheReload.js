/**
 * Tras una restauración masiva (p. ej. copia de seguridad), Firestore puede tener
 * escrituras pendientes en IndexedDB que al sincronizar reintroducirían datos viejos.
 * Se incrementa `dataBulkGeneration` en config; si el cliente no ha «reconocido» ese
 * valor, se ofrece terminar la instancia, limpiar la caché local y recargar.
 */
import { terminate, clearIndexedDbPersistence } from 'firebase/firestore';
import { db } from './firebaseRefs.js';

const STORAGE_ACK_KEY = 'vnpm_data_bulk_generation_ack';

export function getAckBulkGeneration() {
  if (typeof window === 'undefined') return 0;
  try {
    const v = window.localStorage.getItem(STORAGE_ACK_KEY);
    if (v == null || v === '') return 0;
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function setAckBulkGeneration(n) {
  if (typeof window === 'undefined') return;
  try {
    const v = Math.max(0, Math.floor(Number(n) || 0));
    window.localStorage.setItem(STORAGE_ACK_KEY, String(v));
  } catch {
    /* ignore */
  }
}

/**
 * @param {number} serverGeneration Valor actual de `app_data/config.dataBulkGeneration` (se guarda en localStorage antes de recargar).
 */
export async function reloadAppAfterClearingFirestorePersistence(serverGeneration) {
  try {
    await terminate(db);
  } catch (e) {
    console.warn('[firestoreCacheReload] terminate', e);
  }
  try {
    await clearIndexedDbPersistence(db);
  } catch (e) {
    console.warn('[firestoreCacheReload] clearIndexedDbPersistence', e);
  }
  if (Number.isFinite(serverGeneration) && serverGeneration >= 0) {
    setAckBulkGeneration(serverGeneration);
  }
  window.location.reload();
}
