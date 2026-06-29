/**
 * Sincronización en vivo tras escrituras en Firestore:
 * - Participantes / archivo: parche en memoria; invalidación de caché vía Cloud Function.
 * - Donaciones / gastos / evento: parche optimista en memoria; otros clientes vía onSnapshot.
 * - Logs: bump de cabecera solo en Cloud Function `syncLogsCacheVersionOnLogWrite`.
 */
import { patchParticipantsInList } from './participantsVersionCache.js';

/** Parche o reemplazo de una fila en un arreglo indexado por `id`. */
export function patchListRow(prev, rowId, patchOrRow, { remove = false } = {}) {
  const id = String(rowId || '').trim();
  if (!id) return prev || [];
  const map = new Map((prev || []).map((r) => [String(r.id), r]));
  if (remove) map.delete(id);
  else if (patchOrRow && typeof patchOrRow === 'object') {
    const cur = map.get(id) || { id };
    map.set(id, { ...cur, ...patchOrRow, id });
  }
  return [...map.values()];
}

/**
 * Participantes: actualiza `allParticipants` en memoria (la caché por sede la invalida la Cloud Function).
 */
export function syncParticipantAfterWrite(setAllParticipants, person, action, opts = {}) {
  const pid = opts.personId != null ? String(opts.personId) : String(person?.id || '');
  if (pid && opts.patch && typeof opts.patch === 'object') {
    setAllParticipants((prev) => patchParticipantsInList(prev, pid, opts.patch));
  }
}

export function syncParticipantsBatchAfterWrite(_eventId, _locations, _action = '') {
  /* invalidación en Cloud Function */
}

export function syncArchiveParticipantsAfterWrite(_action = '') {
  /* invalidación en Cloud Function */
}

/** Invalidación de logs: solo Cloud Function `syncLogsCacheVersionOnLogWrite` (sin bump en cliente). */
export function syncLogsAfterWrite(_action = '') {
  /* no-op */
}

export function syncDonationAfterWrite(setDonations, donationId, row, opts = {}) {
  if (!setDonations || !donationId) return;
  setDonations((prev) => patchListRow(prev, donationId, row, { remove: opts.remove === true }));
}

export function syncExpenseAfterWrite(setExpenses, expenseId, row, opts = {}) {
  if (!setExpenses || !expenseId) return;
  setExpenses((prev) => patchListRow(prev, expenseId, row, { remove: opts.remove === true }));
}

/** Configuración del evento activo (cupos, sedes, precios, etc.). */
export function syncEventAfterWrite(setEvents, eventId, patch) {
  const eid = String(eventId || '').trim();
  if (!setEvents || !eid || !patch || typeof patch !== 'object') return;
  setEvents((prev) =>
    (prev || []).map((e) => (String(e.id) === eid ? { ...e, ...patch } : e))
  );
}

/** Config global (`app_data/config`); otros clientes ya reciben onSnapshot. */
export function syncGlobalConfigAfterWrite(setGlobalConfig, patch) {
  if (!setGlobalConfig || !patch || typeof patch !== 'object') return;
  setGlobalConfig((prev) => (prev && typeof prev === 'object' ? { ...prev, ...patch } : prev));
}
