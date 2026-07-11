import { describe, expect, it } from 'vitest';
import {
  buildCashCutRefundDisbursementRow,
  getParticipantCreditPendingAmount,
  getParticipantNetPaidFromHistory,
  getParticipantPhysicalRecaudadoGross,
  getRefundDisbursedGrossAmount,
  getRefundDonatedTotalAmount,
  participantHasRefundDisbursement,
  parsePaymentHistoryRecordedAtMs,
  REFUND_DISBURSEMENT_PAYMENT_KIND,
} from '../cashCutRefunds.js';
import { donationAddsToRecaudacionBalance } from '../donationHelpers.js';

const identityNet = (gross) => gross;

describe('cashCutRefunds', () => {
  it('detecta devolución registrada en historial', () => {
    const person = {
      id: 'p1',
      paid: 500,
      paymentHistory: [
        { id: 'ab1', amount: 500, method: 'Efectivo' },
        { id: 'refund-disb-p1', amount: -200, method: 'Efectivo', kind: 'refund_disbursement' },
      ],
      refundDisbursedAt: Date.now(),
      refundDisbursedAmount: 200,
    };
    expect(participantHasRefundDisbursement(person)).toBe(true);
    expect(getRefundDisbursedGrossAmount(person)).toBe(200);
    expect(getParticipantNetPaidFromHistory(person, identityNet)).toBe(300);
    expect(getParticipantPhysicalRecaudadoGross(person)).toBe(300);
  });

  it('suma devoluciones parciales múltiples', () => {
    const person = {
      id: 'p-partial',
      paid: 500,
      refundPendingAmount: 200,
      paymentHistory: [
        { id: 'ab1', amount: 500, method: 'Efectivo' },
        { id: 'refund-disb-p-partial-1', amount: -80, kind: REFUND_DISBURSEMENT_PAYMENT_KIND },
        { id: 'refund-disb-p-partial-2', amount: -50, kind: REFUND_DISBURSEMENT_PAYMENT_KIND },
      ],
    };
    expect(getRefundDisbursedGrossAmount(person)).toBe(130);
    expect(getParticipantCreditPendingAmount(person)).toBe(70);
    expect(getParticipantPhysicalRecaudadoGross(person)).toBe(370);
  });

  it('saldo pendiente resta donaciones parciales', () => {
    const person = {
      id: 'p-don',
      paid: 500,
      refundPendingAmount: 150,
      refundMarkedAsDonationAmount: 40,
      paymentHistory: [{ id: 'ab1', amount: 500 }],
    };
    expect(getRefundDonatedTotalAmount(person)).toBe(40);
    expect(getParticipantCreditPendingAmount(person)).toBe(110);
  });

  it('sin devolución el recaudado físico es el pagado', () => {
    const person = { id: 'p2', paid: 400, paymentHistory: [{ id: 'a', amount: 400 }] };
    expect(getParticipantPhysicalRecaudadoGross(person)).toBe(400);
    expect(getParticipantNetPaidFromHistory(person, identityNet)).toBe(400);
  });

  it('net paid no baja de cero', () => {
    const person = {
      id: 'p3',
      paid: 100,
      paymentHistory: [
        { id: 'a', amount: 100 },
        { id: 'refund-disb-p3', amount: -150, kind: 'refund_disbursement' },
      ],
      refundDisbursedAt: 1,
      refundDisbursedAmount: 150,
    };
    expect(getParticipantNetPaidFromHistory(person, identityNet)).toBe(0);
  });

  it('recomputes service from edited timestamp, not stale paymentHistory.service', () => {
    const sundayMs = new Date(2026, 5, 28, 10, 30, 0, 0).getTime();
    const person = {
      id: 'p-ref',
      status: 'cancelled',
      location: 'Coapa',
      cancelledFromLocation: 'Coapa',
      refundDisbursedAt: sundayMs,
      refundDisbursedAmount: 150,
      refundDisbursedMethod: 'Efectivo',
      paymentHistory: [
        {
          id: 'refund-disb-p-ref',
          kind: REFUND_DISBURSEMENT_PAYMENT_KIND,
          amount: -150,
          method: 'Efectivo',
          recordedAt: new Date(sundayMs).toISOString(),
          service: 'Fuera de servicios dominicales',
        },
      ],
    };
    const row = buildCashCutRefundDisbursementRow(person, identityNet, () => 'Primero');
    expect(row).not.toBeNull();
    expect(row.service).toBe('Primero');
    expect(row._ts).toBe(sundayMs);
  });

  it('parsePaymentHistoryRecordedAtMs reads recordedAt before legacy id', () => {
    const sundayMs = new Date(2026, 5, 28, 10, 30, 0, 0).getTime();
    const row = {
      id: 'refund-disb-p1',
      recordedAt: new Date(sundayMs).toISOString(),
    };
    expect(parsePaymentHistoryRecordedAtMs(row)).toBe(sundayMs);
  });
});

describe('donationHelpers', () => {
  it('no suma donaciones derivadas de saldos', () => {
    expect(donationAddsToRecaudacionBalance({ amount: 100 })).toBe(true);
    expect(donationAddsToRecaudacionBalance({ amount: 100, fromCancelledRefundDonation: true })).toBe(false);
    expect(donationAddsToRecaudacionBalance({ amount: 100, fromArchivedManualCredit: true })).toBe(false);
    expect(donationAddsToRecaudacionBalance({ amount: 100, fromManualCredit: true })).toBe(false);
  });
});
