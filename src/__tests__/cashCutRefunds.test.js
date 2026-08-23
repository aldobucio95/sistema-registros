import { describe, expect, it } from 'vitest';
import {
  collectCashCutRefundDisbursements,
  getParticipantNetPaidFromHistory,
  getParticipantPhysicalRecaudadoGross,
  getRefundDisbursedGrossAmount,
  participantHasRefundDisbursement,
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

  it('incluye devolución de un archivo vivo (tras baja + reembolso)', () => {
    const person = {
      id: 'p-arch',
      eventId: 'ev1',
      status: 'archived',
      archivedSourceKind: 'roster',
      archivedFromLocation: 'Norte',
      refundDisbursedAmount: 250,
      refundDisbursedAt: Date.parse('2026-08-01T12:00:00Z'),
      paymentHistory: [
        { id: 'ab1', amount: 250, method: 'Efectivo' },
        {
          id: 'refund-disb-p-arch',
          amount: -250,
          method: 'Efectivo',
          kind: 'refund_disbursement',
          recordedAt: '2026-08-01T12:00:00.000Z',
        },
      ],
    };
    const rows = collectCashCutRefundDisbursements(
      [person],
      { id: 'ev1' },
      ['Norte'],
      (loc, allowed) => allowed.includes(loc),
      identityNet
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(-250);
    expect(rows[0]._loc).toBe('Norte');
  });

  it('no incluye devolución de archivo por evento borrado', () => {
    const person = {
      id: 'p-del',
      eventId: 'ev1',
      status: 'archived',
      archivedSourceKind: 'event_deleted',
      archivedFromLocation: 'Norte',
      refundDisbursedAmount: 100,
      refundDisbursedAt: Date.now(),
    };
    const rows = collectCashCutRefundDisbursements(
      [person],
      { id: 'ev1' },
      null,
      null,
      identityNet
    );
    expect(rows).toHaveLength(0);
  });
});
