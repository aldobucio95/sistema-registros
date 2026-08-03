/**
 * Terminal states for cancelled-participant refund balances:
 * - mark as donation (keeps money; writes app_donations)
 * - disburse refund (cash/card out; writes paymentHistory row)
 *
 * These must be mutually exclusive and atomic: a half-write (participant
 * patched without donation, or concurrent donation+disbursement) corrupts
 * cash-cut / donation accounting.
 */

import {
  getCancelledRefundPendingAmount,
  participantHasRefundDisbursement,
  participantIsCancelledForRefund,
  buildRefundDisbursementPaymentHistoryRow,
  resolveCancelledRefundSede,
} from './cashCutRefunds.js';
import { buildFirestoreDocId } from './firestoreDocId.js';

export const REFUND_TERMINAL_REASONS = Object.freeze({
  NOT_CANCELLED: 'not_cancelled',
  ALREADY_DONATION: 'already_donation',
  ALREADY_DISBURSED: 'already_disbursed',
  NO_PENDING: 'no_pending',
  INVALID_AT: 'invalid_at',
  NO_SEDE_ACCESS: 'no_sede_access',
});

/**
 * @param {object|null|undefined} person live participant doc (+ id)
 * @returns {{ ok: true, pendingAmount: number } | { ok: false, reason: string }}
 */
export function evaluateMarkCancelledRefundAsDonation(person) {
  if (!participantIsCancelledForRefund(person)) {
    return { ok: false, reason: REFUND_TERMINAL_REASONS.NOT_CANCELLED };
  }
  if (person.refundAsDonation) {
    return { ok: false, reason: REFUND_TERMINAL_REASONS.ALREADY_DONATION };
  }
  if (participantHasRefundDisbursement(person)) {
    return { ok: false, reason: REFUND_TERMINAL_REASONS.ALREADY_DISBURSED };
  }
  const pendingAmount = getCancelledRefundPendingAmount(person);
  if (pendingAmount <= 0) {
    return { ok: false, reason: REFUND_TERMINAL_REASONS.NO_PENDING };
  }
  return { ok: true, pendingAmount };
}

/**
 * @param {object|null|undefined} person
 * @param {number} disbursedAtMs
 */
export function evaluateDisburseCancelledRefund(person, disbursedAtMs) {
  if (!participantIsCancelledForRefund(person)) {
    return { ok: false, reason: REFUND_TERMINAL_REASONS.NOT_CANCELLED };
  }
  if (person.refundAsDonation) {
    return { ok: false, reason: REFUND_TERMINAL_REASONS.ALREADY_DONATION };
  }
  if (participantHasRefundDisbursement(person)) {
    return { ok: false, reason: REFUND_TERMINAL_REASONS.ALREADY_DISBURSED };
  }
  const atMs = Number(disbursedAtMs);
  if (!Number.isFinite(atMs) || atMs <= 0) {
    return { ok: false, reason: REFUND_TERMINAL_REASONS.INVALID_AT };
  }
  const pendingAmount = getCancelledRefundPendingAmount(person);
  if (pendingAmount <= 0) {
    return { ok: false, reason: REFUND_TERMINAL_REASONS.NO_PENDING };
  }
  return { ok: true, pendingAmount, atMs };
}

/**
 * Builds the two writes that must commit together for "mark as donation".
 */
export function planMarkCancelledRefundAsDonation({
  person,
  personId,
  pendingAmount,
  markedAt,
  eventId,
  createdBy,
  debugPatch = null,
}) {
  const pid = String(personId);
  const sede = String(person?.cancelledFromLocation || person?.location || '').trim() || '?';
  const at = Number(markedAt);
  const donationId = buildFirestoreDocId(['don', 'refund', pid, at], {
    fallback: `don-refund-${at}`,
  });
  const participantPatch = {
    refundAsDonation: true,
    refundMarkedAsDonationAt: at,
    refundMarkedAsDonationAmount: pendingAmount,
    refundPendingAmount: 0,
    ...(debugPatch && typeof debugPatch === 'object' ? debugPatch : {}),
  };
  const donationRow = {
    id: donationId,
    amount: pendingAmount,
    donorName: (person?.name || '').trim() || 'Participante (baja)',
    location: sede,
    fromCancelledRefundDonation: true,
    sourceParticipantId: pid,
    createdAt: new Date(at).toISOString(),
    createdBy: createdBy || 'Desconocido',
  };
  if (eventId != null && String(eventId).trim()) {
    donationRow.eventId = eventId;
  }
  return { participantPatch, donationId, donationRow, sede };
}

/**
 * Builds the participant patch for disbursement from live history.
 */
export function planDisburseCancelledRefund({
  person,
  personId,
  pendingAmount,
  method,
  atMs,
  registeredBy,
  computeNetAmountByMethod,
  service,
  debugPatch = null,
}) {
  const pid = String(personId);
  const refundMethod = method === 'Tarjeta' ? 'Tarjeta' : 'Efectivo';
  const sede = resolveCancelledRefundSede(person) || '?';
  const refundHistoryRow = buildRefundDisbursementPaymentHistoryRow({
    personId: pid,
    grossAmount: pendingAmount,
    method: refundMethod,
    atMs,
    registeredBy: registeredBy || 'Desconocido',
    computeNetAmountByMethod,
    service,
  });
  const participantPatch = {
    refundPendingAmount: 0,
    refundDisbursedAt: atMs,
    refundDisbursedAmount: pendingAmount,
    refundDisbursedBy: registeredBy || 'Desconocido',
    refundDisbursedMethod: refundMethod,
    refundDisbursedLocation: sede,
    ...(refundHistoryRow
      ? { paymentHistory: [...(person?.paymentHistory || []), refundHistoryRow] }
      : {}),
    ...(debugPatch && typeof debugPatch === 'object' ? debugPatch : {}),
  };
  return { participantPatch, refundHistoryRow, refundMethod, sede };
}

/**
 * Toast / UI copy for terminal evaluation failures.
 */
export function refundTerminalFailureMessage(reason, { forDonation = false } = {}) {
  switch (reason) {
    case REFUND_TERMINAL_REASONS.ALREADY_DONATION:
      return forDonation
        ? 'Este saldo ya estaba marcado como donación.'
        : 'Este saldo ya fue marcado como donación.';
    case REFUND_TERMINAL_REASONS.ALREADY_DISBURSED:
      return forDonation
        ? 'Este saldo ya fue devuelto; no se puede marcar como donación.'
        : 'Este saldo ya fue devuelto.';
    case REFUND_TERMINAL_REASONS.NO_PENDING:
      return forDonation
        ? 'No hay saldo pendiente de devolución para marcar como donación.'
        : 'No hay saldo pendiente de devolución.';
    case REFUND_TERMINAL_REASONS.INVALID_AT:
      return 'Fecha u hora de devolución no válida.';
    case REFUND_TERMINAL_REASONS.NO_SEDE_ACCESS:
      return 'No tienes permiso para registrar devoluciones en esta sede.';
    case REFUND_TERMINAL_REASONS.NOT_CANCELLED:
    default:
      return forDonation
        ? 'No se pudo marcar el saldo como donación.'
        : 'No se pudo registrar la devolución.';
  }
}

/**
 * Atomically mark cancelled refund as donation (participant + donation doc).
 * @param {{
 *   runTransaction: Function,
 *   db: object,
 *   participantRef: object,
 *   donationRefForId: (id: string) => object,
 *   livePersonFromSnap: (snap: object) => object,
 *   eventId: string,
 *   createdBy: string,
 *   markedAt?: number,
 *   debugPatch?: object|null,
 * }} args
 */
export async function commitMarkCancelledRefundAsDonation(args) {
  const {
    runTransaction,
    db,
    participantRef,
    donationRefForId,
    livePersonFromSnap,
    eventId,
    createdBy,
    markedAt = Date.now(),
    debugPatch = null,
  } = args;

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(participantRef);
    if (!snap.exists()) {
      return { ok: false, reason: REFUND_TERMINAL_REASONS.NOT_CANCELLED };
    }
    const live = livePersonFromSnap(snap);
    const evalResult = evaluateMarkCancelledRefundAsDonation(live);
    if (!evalResult.ok) return evalResult;

    const planned = planMarkCancelledRefundAsDonation({
      person: live,
      personId: live.id,
      pendingAmount: evalResult.pendingAmount,
      markedAt,
      eventId,
      createdBy,
      debugPatch,
    });
    tx.set(donationRefForId(planned.donationId), planned.donationRow);
    tx.update(participantRef, planned.participantPatch);
    return {
      ok: true,
      pendingAmount: evalResult.pendingAmount,
      ...planned,
      livePerson: live,
    };
  });
}

/**
 * Atomically disburse cancelled refund using live participant state.
 */
export async function commitDisburseCancelledRefund(args) {
  const {
    runTransaction,
    db,
    participantRef,
    livePersonFromSnap,
    method = 'Efectivo',
    disbursedAtMs = Date.now(),
    registeredBy,
    computeNetAmountByMethod,
    getAutoPaymentService,
    canAccessSede = null,
    debugPatch = null,
  } = args;

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(participantRef);
    if (!snap.exists()) {
      return { ok: false, reason: REFUND_TERMINAL_REASONS.NOT_CANCELLED };
    }
    const live = livePersonFromSnap(snap);
    const evalResult = evaluateDisburseCancelledRefund(live, disbursedAtMs);
    if (!evalResult.ok) return evalResult;

    const sede = resolveCancelledRefundSede(live) || '?';
    if (typeof canAccessSede === 'function' && !canAccessSede(sede)) {
      return { ok: false, reason: REFUND_TERMINAL_REASONS.NO_SEDE_ACCESS };
    }
    const service =
      typeof getAutoPaymentService === 'function'
        ? getAutoPaymentService(new Date(evalResult.atMs), sede !== '?' ? sede : undefined)
        : 'Devolución';

    const planned = planDisburseCancelledRefund({
      person: live,
      personId: live.id,
      pendingAmount: evalResult.pendingAmount,
      method,
      atMs: evalResult.atMs,
      registeredBy,
      computeNetAmountByMethod,
      service,
      debugPatch,
    });
    tx.update(participantRef, planned.participantPatch);
    return {
      ok: true,
      pendingAmount: evalResult.pendingAmount,
      atMs: evalResult.atMs,
      ...planned,
      livePerson: live,
    };
  });
}
