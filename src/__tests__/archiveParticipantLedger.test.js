import { describe, expect, it } from 'vitest';
import {
  ARCHIVE_SOURCE_EVENT_DELETED,
  ARCHIVE_SOURCE_ROSTER,
  ARCHIVE_SOURCE_WAITLIST,
  archivedParticipantCountsInCashCut,
  buildArchiveParticipantStatusPatch,
  getLiveArchiveFinanceBlockReason,
  participantCountsInCashCutInflows,
  participantIncludedInCashCutRefundDisbursements,
  resolveArchiveCashCutLocation,
  shouldMintArchivedManualCreditDonation,
  shouldWipeFinanceOnArchive,
} from '../archiveParticipantLedger.js';

describe('archiveParticipantLedger', () => {
  it('no borra finanzas al archivar en un evento vivo', () => {
    expect(shouldWipeFinanceOnArchive(ARCHIVE_SOURCE_ROSTER)).toBe(false);
    expect(shouldWipeFinanceOnArchive(ARCHIVE_SOURCE_WAITLIST)).toBe(false);
    expect(shouldMintArchivedManualCreditDonation(ARCHIVE_SOURCE_ROSTER)).toBe(false);
  });

  it('sí limpia finanzas al archivar por borrado de evento (id reutilizado)', () => {
    expect(shouldWipeFinanceOnArchive(ARCHIVE_SOURCE_EVENT_DELETED)).toBe(true);
    expect(shouldMintArchivedManualCreditDonation(ARCHIVE_SOURCE_EVENT_DELETED)).toBe(true);
  });

  it('bloquea archivo vivo de cancelado con devolución pendiente', () => {
    const person = {
      status: 'cancelled',
      paid: 500,
      refundPendingAmount: 500,
    };
    expect(getLiveArchiveFinanceBlockReason(person, ARCHIVE_SOURCE_ROSTER)).toMatch(/pendiente de devolución/);
    expect(getLiveArchiveFinanceBlockReason(person, ARCHIVE_SOURCE_EVENT_DELETED)).toBeNull();
  });

  it('permite archivar activo pagado (el dinero permanece en el evento)', () => {
    const person = { status: 'active', paid: 500, paymentHistory: [{ id: 'a', amount: 500 }] };
    expect(getLiveArchiveFinanceBlockReason(person, ARCHIVE_SOURCE_ROSTER)).toBeNull();
  });

  it('permite archivar cancelado ya donado o devuelto', () => {
    const donated = {
      status: 'cancelled',
      paid: 400,
      refundPendingAmount: 0,
      refundAsDonation: true,
    };
    const disbursed = {
      status: 'cancelled',
      paid: 400,
      refundPendingAmount: 0,
      refundDisbursedAmount: 400,
      refundDisbursedAt: Date.now(),
    };
    expect(getLiveArchiveFinanceBlockReason(donated, ARCHIVE_SOURCE_ROSTER)).toBeNull();
    expect(getLiveArchiveFinanceBlockReason(disbursed, ARCHIVE_SOURCE_ROSTER)).toBeNull();
  });

  it('marca sourceKind en el patch de archivo', () => {
    const patch = buildArchiveParticipantStatusPatch({
      loc: 'Norte',
      now: 1700000000000,
      profileSnapshot: { name: 'Ana' },
      sourceKind: ARCHIVE_SOURCE_WAITLIST,
    });
    expect(patch.status).toBe('archived');
    expect(patch.archivedFromLocation).toBe('Norte');
    expect(patch.archivedSourceKind).toBe(ARCHIVE_SOURCE_WAITLIST);
    expect(patch.paymentHistory).toBeUndefined();
    expect(patch.paid).toBeUndefined();
  });

  it('incluye archivo vivo en corte y excluye archivo por borrado de evento', () => {
    const live = {
      status: 'archived',
      archivedSourceKind: ARCHIVE_SOURCE_ROSTER,
      archivedFromLocation: 'Norte',
      paymentHistory: [{ id: 'a', amount: 200 }],
    };
    const deleted = {
      status: 'archived',
      archivedSourceKind: ARCHIVE_SOURCE_EVENT_DELETED,
      archivedFromLocation: 'Norte',
    };
    expect(archivedParticipantCountsInCashCut(live)).toBe(true);
    expect(archivedParticipantCountsInCashCut(deleted)).toBe(false);
    expect(participantCountsInCashCutInflows(live, () => false)).toBe(true);
    expect(resolveArchiveCashCutLocation(live)).toBe('Norte');
  });

  it('sigue contando egreso de devolución si se archiva tras devolver', () => {
    const archivedRefunded = {
      status: 'archived',
      archivedSourceKind: ARCHIVE_SOURCE_ROSTER,
      refundDisbursedAmount: 300,
      refundDisbursedAt: Date.now(),
      paymentHistory: [{ id: 'refund-disb-p1', amount: -300, kind: 'refund_disbursement' }],
    };
    expect(participantIncludedInCashCutRefundDisbursements(archivedRefunded)).toBe(true);
    expect(
      participantIncludedInCashCutRefundDisbursements({
        ...archivedRefunded,
        archivedSourceKind: ARCHIVE_SOURCE_EVENT_DELETED,
      })
    ).toBe(false);
  });
});
