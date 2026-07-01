import { describe, expect, it } from 'vitest';
import {
  buildCashCutRefundDisbursementRow,
  getParticipantNetPaidFromHistory,
  getParticipantPhysicalRecaudadoGross,
  getRefundDisbursedGrossAmount,
  participantHasRefundDisbursement,
  REFUND_DISBURSEMENT_PAYMENT_KIND,
} from '../cashCutRefunds.js';

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
});
