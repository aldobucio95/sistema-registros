/**
 * Archivar un registro cancelado con saldo pendiente de devolución/donación
 * borra `refundPendingAmount` / historial y saca el caso del corte de caja.
 * Bloquear ese camino hasta resolver el saldo.
 */
import {
  getCancelledRefundPendingAmount,
  participantIsCancelledForRefund,
} from './cashCutRefunds.js';

/**
 * @param {object|null|undefined} person
 * @returns {string|null} mensaje de bloqueo, o null si se puede archivar
 */
export function getArchiveBlockedByPendingRefundMessage(person) {
  if (!participantIsCancelledForRefund(person)) return null;
  const pending = getCancelledRefundPendingAmount(person);
  if (!(pending > 0)) return null;
  const amt = pending.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    `No se puede archivar: hay $${amt} pendiente de devolución o donación. ` +
    'Registra la devolución o marca el saldo como donación antes de archivar.'
  );
}

/**
 * @param {Iterable<object>|null|undefined} people
 * @returns {{ blocked: object[], message: string|null }}
 */
export function findArchiveBlockedByPendingRefund(people) {
  const blocked = [];
  for (const person of people || []) {
    if (getArchiveBlockedByPendingRefundMessage(person)) blocked.push(person);
  }
  if (blocked.length === 0) return { blocked, message: null };
  const message =
    blocked.length === 1
      ? getArchiveBlockedByPendingRefundMessage(blocked[0])
      : `No se puede continuar: ${blocked.length} registro(s) cancelado(s) tienen saldo pendiente de devolución o donación. Resuélvelos antes de archivar o eliminar el evento.`;
  return { blocked, message };
}
