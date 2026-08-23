/**
 * Archivo de participantes y efecto en el ledger financiero.
 *
 * Archivar en un evento vivo no debe borrar `paymentHistory` / `paid` / terminales de
 * devolución: el dinero ya está en caja. Solo el archivo por *borrado de evento*
 * limpia finanzas, para que un evento recreado con el mismo id (nombre) no herede
 * abonos del evento anterior.
 */

import {
  getCancelledRefundPendingAmount,
  participantHasRefundDisbursement,
  participantIsCancelledForRefund,
} from './cashCutRefunds.js';

export const ARCHIVE_SOURCE_ROSTER = 'roster';
export const ARCHIVE_SOURCE_WAITLIST = 'waitlist';
export const ARCHIVE_SOURCE_EVENT_DELETED = 'event_deleted';
export const PARTICIPANT_STATUS_ARCHIVED = 'archived';

export const ARCHIVE_FINANCE_DELETE_KEYS = [
  'paid',
  'paidNet',
  'registeredCost',
  'registeredCostManual',
  'discountCampaignId',
  'discountCampaignConcept',
  'discountCampaignAppliedAt',
  'refundPendingAmount',
  'refundPendingReason',
  'refundAsDonation',
  'scholarshipPartialAmount',
  'paymentMethod',
  'paymentService',
  'cardReference',
  'isPastorChild',
  'pastorChildWithoutPay',
  'pastorChildSpecialDonationFinanceId',
  'archivedManualCreditAmount',
  'archivedManualCreditListRef',
];

export function isEventDeletedArchiveSource(sourceKind) {
  return String(sourceKind || '').trim() === ARCHIVE_SOURCE_EVENT_DELETED;
}

export function shouldWipeFinanceOnArchive(sourceKind) {
  return isEventDeletedArchiveSource(sourceKind);
}

export function shouldMintArchivedManualCreditDonation(sourceKind) {
  return isEventDeletedArchiveSource(sourceKind);
}

/**
 * Impide archivar (evento vivo) un cancelado con devolución pendiente.
 * El archivo cambia `status` a `archived` y los recolectores de pendiente exigen `cancelled`.
 */
export function getLiveArchiveFinanceBlockReason(person, sourceKind) {
  if (isEventDeletedArchiveSource(sourceKind)) return null;
  if (!participantIsCancelledForRefund(person)) return null;
  const pending = getCancelledRefundPendingAmount(person);
  if (pending > 0.005) {
    return 'No se puede archivar: hay saldo pendiente de devolución o donación por baja. Resuélvelo primero.';
  }
  return null;
}

export function buildArchiveParticipantStatusPatch({
  loc,
  now,
  profileSnapshot,
  sourceKind,
  debug = null,
}) {
  const kind = String(sourceKind || ARCHIVE_SOURCE_ROSTER).trim() || ARCHIVE_SOURCE_ROSTER;
  return {
    status: PARTICIPANT_STATUS_ARCHIVED,
    archivedAt: now,
    archivedFromLocation: loc,
    archivedProfileSnapshot: profileSnapshot,
    archivedSourceKind: kind,
    scholarshipPendingApproval: false,
    ...(debug && typeof debug === 'object' ? debug : {}),
  };
}

export function resolveArchiveCashCutLocation(person) {
  const status = person?.status || 'active';
  if (status === PARTICIPANT_STATUS_ARCHIVED) {
    return String(person?.archivedFromLocation || person?.cancelledFromLocation || person?.location || '').trim();
  }
  return String(person?.cancelledFromLocation || person?.location || '').trim();
}

export function archivedParticipantCountsInCashCut(person) {
  if ((person?.status || 'active') !== PARTICIPANT_STATUS_ARCHIVED) return false;
  return !isEventDeletedArchiveSource(person?.archivedSourceKind);
}

export function participantCountsInCashCutInflows(person, isActiveInRoster) {
  if (!person) return false;
  if ((person.status || 'active') === PARTICIPANT_STATUS_ARCHIVED) {
    return archivedParticipantCountsInCashCut(person);
  }
  if (typeof isActiveInRoster === 'function') return !!isActiveInRoster(person);
  return (person.status || 'active') === 'active';
}

export function participantIncludedInCashCutRefundDisbursements(person) {
  if (participantIsCancelledForRefund(person)) return true;
  if ((person?.status || 'active') !== PARTICIPANT_STATUS_ARCHIVED) return false;
  if (isEventDeletedArchiveSource(person?.archivedSourceKind)) return false;
  return participantHasRefundDisbursement(person);
}
