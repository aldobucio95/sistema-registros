/**
 * Revertir un log de `app_participants` no debe borrar abonos/devoluciones
 * posteriores al movimiento revertido (setDoc de previousData / deleteDoc de un alta).
 */
import {
  buildParticipantPaidFieldsFromHistory,
  parsePaymentHistoryRecordedAtMs,
  parseRefundDisbursedAtMs,
  REFUND_DISBURSEMENT_PAYMENT_KIND,
} from './cashCutRefunds.js';

const identityNet = (gross) => Number(gross) || 0;

const LATER_REFUND_SCALAR_KEYS = [
  'refundDisbursedAt',
  'refundDisbursedAmount',
  'refundDisbursedMethod',
  'refundDisbursedBy',
  'refundDisbursedLocation',
];

function paymentHistoryRowKey(row) {
  if (!row || typeof row !== 'object') return '';
  if (row.id != null && String(row.id).trim() !== '') return String(row.id);
  return `${row.kind || ''}|${row.recordedAt || ''}|${row.amount || ''}|${row.date || ''}`;
}

function isPaymentMovementRow(row) {
  if (!row || typeof row !== 'object') return false;
  if (row.kind === 'comment') return false;
  return Math.abs(Number(row.amount) || 0) > 0 || row.kind === REFUND_DISBURSEMENT_PAYMENT_KIND;
}

/** Snapshot completo de registro (no un parche de un solo campo). */
export function isFullParticipantRevertSnapshot(previousData) {
  if (!previousData || typeof previousData !== 'object' || Array.isArray(previousData)) return false;
  const hasIdentity =
    previousData.name != null ||
    previousData.vnpPersonId != null ||
    previousData.eventId != null ||
    previousData.location != null;
  const hasRosterShape =
    previousData.status != null ||
    Array.isArray(previousData.paymentHistory) ||
    previousData.paid != null;
  return hasIdentity && hasRosterShape;
}

function isLaterThanLog(ts, logCreatedAtMs) {
  const logAt = Number(logCreatedAtMs);
  if (!Number.isFinite(logAt) || logAt <= 0) return true;
  if (ts == null || !Number.isFinite(ts)) return false;
  return ts > logAt;
}

/**
 * Filas de historial actuales que no estaban en el snapshot y se registraron después del log.
 * Sin timestamp de log, se conservan (prioriza no perder dinero frente a deshacer un abono).
 */
export function selectLaterPaymentHistoryRows(previousHistory, currentHistory, logCreatedAtMs) {
  const prev = Array.isArray(previousHistory) ? previousHistory : [];
  const cur = Array.isArray(currentHistory) ? currentHistory : [];
  const prevIds = new Set(prev.map(paymentHistoryRowKey).filter(Boolean));
  const logAt = Number(logCreatedAtMs);
  const logKnown = Number.isFinite(logAt) && logAt > 0;
  return cur.filter((row) => {
    if (!isPaymentMovementRow(row)) return false;
    const key = paymentHistoryRowKey(row);
    if (key && prevIds.has(key)) return false;
    const ts = parsePaymentHistoryRecordedAtMs(row);
    if (!logKnown) return true;
    if (ts == null) return false;
    return ts > logAt;
  });
}

export function mergeParticipantDocForRevert(previousData, currentData, logCreatedAtMs) {
  const prev = previousData && typeof previousData === 'object' ? { ...previousData } : {};
  const cur = currentData && typeof currentData === 'object' ? currentData : {};
  const laterRows = selectLaterPaymentHistoryRows(prev.paymentHistory, cur.paymentHistory, logCreatedAtMs);
  const mergedHistory = [...(Array.isArray(prev.paymentHistory) ? prev.paymentHistory : []), ...laterRows];
  const merged = { ...prev, paymentHistory: mergedHistory };
  const paidFields = buildParticipantPaidFieldsFromHistory(merged, identityNet);
  merged.paid = paidFields.paid;
  merged.paidNet = paidFields.paidNet;

  const keptLaterRefund = laterRows.some((row) => row && row.kind === REFUND_DISBURSEMENT_PAYMENT_KIND);
  const curDisbAt = parseRefundDisbursedAtMs(cur);
  if (keptLaterRefund || isLaterThanLog(curDisbAt, logCreatedAtMs)) {
    for (const key of LATER_REFUND_SCALAR_KEYS) {
      if (cur[key] != null && cur[key] !== '') merged[key] = cur[key];
    }
    merged.refundPendingAmount = 0;
  }

  const donationAt = Number(cur.refundMarkedAsDonationAt);
  if (
    cur.refundAsDonation &&
    isLaterThanLog(Number.isFinite(donationAt) && donationAt > 0 ? donationAt : null, logCreatedAtMs)
  ) {
    merged.refundAsDonation = true;
    if (cur.refundMarkedAsDonationAt != null) merged.refundMarkedAsDonationAt = cur.refundMarkedAsDonationAt;
    if (cur.refundMarkedAsDonationAmount != null) {
      merged.refundMarkedAsDonationAmount = cur.refundMarkedAsDonationAmount;
    }
    merged.refundPendingAmount = 0;
  }

  return merged;
}

/** No borrar un alta si el doc vivo ya tiene movimientos posteriores al log. */
export function participantCreateRevertShouldSkipDelete(currentData, logCreatedAtMs) {
  if (!currentData || typeof currentData !== 'object') return false;
  const hist = Array.isArray(currentData.paymentHistory) ? currentData.paymentHistory : [];
  const logAt = Number(logCreatedAtMs);
  const logKnown = Number.isFinite(logAt) && logAt > 0;
  return hist.some((row) => {
    if (!isPaymentMovementRow(row)) return false;
    const ts = parsePaymentHistoryRecordedAtMs(row);
    if (!logKnown) return true;
    if (ts == null) return false;
    return ts > logAt;
  });
}

export function planParticipantRevertWrite({ action, previousData, currentData, logCreatedAtMs }) {
  if (action === 'create') {
    if (participantCreateRevertShouldSkipDelete(currentData, logCreatedAtMs)) {
      return { type: 'skip_delete', reason: 'later_payments' };
    }
    return { type: 'delete' };
  }
  if (action === 'update' || action === 'delete') {
    if (!previousData || typeof previousData !== 'object') return { type: 'noop' };
    if (!isFullParticipantRevertSnapshot(previousData)) {
      return { type: 'set', payload: previousData, mergedFinance: false };
    }
    return {
      type: 'set',
      payload: mergeParticipantDocForRevert(previousData, currentData, logCreatedAtMs),
      mergedFinance: true,
    };
  }
  return { type: 'noop' };
}
