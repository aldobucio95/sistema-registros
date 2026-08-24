import { describe, expect, it } from 'vitest';
import {
  collectCashCutRefundDisbursements,
  currentCancelCycleHasDisbursement,
  getCancelledRefundPendingAmount,
  getParticipantNetPaidFromHistory,
  getParticipantPhysicalRecaudadoGross,
  getRefundDisbursedGrossAmount,
  participantHasRefundDisbursement,
  refundDisbursementPaymentHistoryId,
} from '../cashCutRefunds.js';

const identityNet = (gross) => gross;

describe('cashCutRefunds', () => {
  it('detecta devolución registrada en historial', () => {
    const person = {
      id: 'p1',
      paid: 500,
      paymentHistory: [
        { id: 'ab1', amount: 500, method: 'Efectivo' },
        { id: 'refund-disb-p1', amount: -200, method: 'Efectivo', kind: 'refund_disbursement', recordedAt: '2026-01-02T00:00:00.000Z' },
      ],
      refundDisbursedAt: Date.parse('2026-01-02T00:00:00.000Z'),
      refundDisbursedAmount: 200,
    };
    expect(participantHasRefundDisbursement(person)).toBe(true);
    expect(getRefundDisbursedGrossAmount(person)).toBe(200);
    expect(getParticipantNetPaidFromHistory(person, identityNet)).toBe(300);
    expect(getParticipantPhysicalRecaudadoGross(person)).toBe(300);
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
        { id: 'refund-disb-p3', amount: -150, kind: 'refund_disbursement', recordedAt: '2026-01-02T00:00:00.000Z' },
      ],
      refundDisbursedAt: 1,
      refundDisbursedAmount: 150,
    };
    expect(getParticipantNetPaidFromHistory(person, identityNet)).toBe(0);
    expect(getParticipantPhysicalRecaudadoGross(person)).toBe(0);
  });

  it('ids de devolución son únicos por timestamp y siguen el legado', () => {
    expect(refundDisbursementPaymentHistoryId('p1')).toBe('refund-disb-p1');
    expect(refundDisbursementPaymentHistoryId('p1', 123)).toBe('refund-disb-p1-123');
  });

  it('baja original con devolución no deja saldo pendiente', () => {
    const t1 = 1_700_000_000_000;
    const t2 = t1 + 60_000;
    const person = {
      id: 'p-orig',
      status: 'cancelled',
      cancelledAt: t1,
      paid: 500,
      refundPendingAmount: 0,
      refundDisbursedAt: t2,
      refundDisbursedAmount: 500,
      paymentHistory: [
        { id: 'ab1', amount: 500, recordedAt: new Date(t1).toISOString() },
        {
          id: `refund-disb-p-orig-${t2}`,
          kind: 'refund_disbursement',
          amount: -500,
          recordedAt: new Date(t2).toISOString(),
        },
      ],
    };
    expect(currentCancelCycleHasDisbursement(person)).toBe(true);
    expect(getCancelledRefundPendingAmount(person)).toBe(0);
  });

  it('tras reactivar, una nueva baja no queda bloqueada por la devolución anterior', () => {
    const t1 = 1_700_000_000_000;
    const t2 = t1 + 60_000;
    const t4 = t1 + 86_400_000;
    const person = {
      id: 'p-re',
      status: 'cancelled',
      cancelledAt: t4,
      paid: 300,
      refundPendingAmount: 300,
      refundDisbursedAt: t2,
      refundDisbursedAmount: 500,
      paymentHistory: [
        { id: 'ab1', amount: 500, recordedAt: new Date(t1).toISOString() },
        {
          id: `refund-disb-p-re-${t2}`,
          kind: 'refund_disbursement',
          amount: -500,
          recordedAt: new Date(t2).toISOString(),
        },
        { id: 'ab2', amount: 300, recordedAt: new Date(t4 - 1000).toISOString() },
      ],
    };
    expect(participantHasRefundDisbursement(person)).toBe(true);
    expect(currentCancelCycleHasDisbursement(person)).toBe(false);
    expect(getCancelledRefundPendingAmount(person)).toBe(300);
    expect(getParticipantPhysicalRecaudadoGross(person)).toBe(300);
    expect(getRefundDisbursedGrossAmount(person)).toBe(500);
  });

  it('corte de caja emite una fila por cada devolución del mismo folio', () => {
    const t2 = 1_700_000_060_000;
    const t5 = 1_700_086_460_000;
    const rows = collectCashCutRefundDisbursements(
      [
        {
          id: 'p-re',
          eventId: 'ev1',
          status: 'cancelled',
          cancelledAt: 1_700_086_400_000,
          location: 'Norte',
          name: 'Ana',
          paymentHistory: [
            {
              id: `refund-disb-p-re-${t2}`,
              kind: 'refund_disbursement',
              amount: -500,
              netAmount: -500,
              recordedAt: new Date(t2).toISOString(),
              method: 'Efectivo',
            },
            {
              id: `refund-disb-p-re-${t5}`,
              kind: 'refund_disbursement',
              amount: -300,
              netAmount: -300,
              recordedAt: new Date(t5).toISOString(),
              method: 'Efectivo',
            },
          ],
        },
      ],
      { id: 'ev1' },
      null,
      () => true,
      identityNet,
      null
    );
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => Math.abs(r.amount)).sort((a, b) => a - b)).toEqual([300, 500]);
  });
});
