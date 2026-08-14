import { describe, expect, it } from 'vitest';
import {
  collectCashCutAllPayments,
  getParticipantNetPaidFromHistory,
  getParticipantPhysicalRecaudadoGross,
  getRefundDisbursedGrossAmount,
  participantHasRefundDisbursement,
} from '../cashCutRefunds.js';

const identityNet = (gross) => gross;
const EVENT = { id: 'ev1' };
const ABONO_TS = Date.parse('2026-08-02T16:00:00.000Z');
const REFUND_TS = Date.parse('2026-08-09T18:00:00.000Z');

function sumAmounts(rows) {
  return rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
}

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
});

describe('collectCashCutAllPayments', () => {
  it('incluye abonos de cancelados con reembolso pendiente (el efectivo sigue en caja)', () => {
    const cancelled = {
      id: 'c1',
      eventId: 'ev1',
      status: 'cancelled',
      name: 'Baja pendiente',
      location: 'Norte',
      cancelledFromLocation: 'Norte',
      paid: 500,
      paymentHistory: [
        { id: ABONO_TS, amount: 500, method: 'Efectivo', recordedAt: '2026-08-02T16:00:00.000Z' },
      ],
      refundPendingAmount: 500,
    };
    const rows = collectCashCutAllPayments([cancelled], EVENT, identityNet);
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(500);
    expect(rows[0]._personId).toBe('c1');
    expect(sumAmounts(rows)).toBe(500);
  });

  it('tras devolución suma abono y resta egreso una sola vez (neto 0 si se devolvió todo)', () => {
    const cancelled = {
      id: 'c2',
      eventId: 'ev1',
      status: 'cancelled',
      name: 'Baja devuelta',
      location: 'Norte',
      cancelledFromLocation: 'Norte',
      paid: 500,
      paymentHistory: [
        { id: ABONO_TS, amount: 500, method: 'Efectivo', recordedAt: '2026-08-02T16:00:00.000Z' },
        {
          id: 'refund-disb-c2',
          kind: 'refund_disbursement',
          amount: -500,
          netAmount: -500,
          method: 'Efectivo',
          recordedAt: '2026-08-09T18:00:00.000Z',
        },
      ],
      refundPendingAmount: 0,
      refundDisbursedAt: REFUND_TS,
      refundDisbursedAmount: 500,
      refundDisbursedMethod: 'Efectivo',
    };
    const rows = collectCashCutAllPayments([cancelled], EVENT, identityNet);
    const inflows = rows.filter((r) => Number(r.amount) > 0);
    const refunds = rows.filter((r) => r.kind === 'refund_disbursement' || r._isRefundDisbursement);
    expect(inflows).toHaveLength(1);
    expect(inflows[0].amount).toBe(500);
    expect(refunds).toHaveLength(1);
    expect(refunds[0].amount).toBe(-500);
    expect(sumAmounts(rows)).toBe(0);
  });

  it('incluye abonos de lista de espera', () => {
    const wait = {
      id: 'w1',
      eventId: 'ev1',
      status: 'waitlist',
      name: 'Espera',
      location: 'Norte',
      paid: 200,
      paymentHistory: [
        { id: ABONO_TS, amount: 200, method: 'Efectivo', recordedAt: '2026-08-02T16:00:00.000Z' },
      ],
    };
    const rows = collectCashCutAllPayments([wait], EVENT, identityNet);
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(200);
  });

  it('excluye archivados (historial ya no vive en el doc)', () => {
    const archived = {
      id: 'a1',
      eventId: 'ev1',
      status: 'archived',
      name: 'Archivo',
      location: 'Norte',
      paid: 300,
      paymentHistory: [
        { id: ABONO_TS, amount: 300, method: 'Efectivo', recordedAt: '2026-08-02T16:00:00.000Z' },
      ],
    };
    expect(collectCashCutAllPayments([archived], EVENT, identityNet)).toEqual([]);
  });

  it('usa cancelledFromLocation para el alcance de sede', () => {
    const cancelled = {
      id: 'c3',
      eventId: 'ev1',
      status: 'cancelled',
      name: 'Otra sede',
      location: 'Sur',
      cancelledFromLocation: 'Norte',
      paid: 150,
      paymentHistory: [
        { id: ABONO_TS, amount: 150, method: 'Efectivo', recordedAt: '2026-08-02T16:00:00.000Z' },
      ],
      refundPendingAmount: 150,
    };
    const norte = collectCashCutAllPayments([cancelled], EVENT, identityNet, ['Norte']);
    const sur = collectCashCutAllPayments([cancelled], EVENT, identityNet, ['Sur']);
    expect(norte).toHaveLength(1);
    expect(norte[0]._loc).toBe('Norte');
    expect(sur).toHaveLength(0);
  });

  it('no duplica la fila de devolución que vive en paymentHistory', () => {
    const cancelled = {
      id: 'c4',
      eventId: 'ev1',
      status: 'cancelled',
      name: 'Parcial',
      location: 'Norte',
      cancelledFromLocation: 'Norte',
      paid: 400,
      paymentHistory: [
        { id: ABONO_TS, amount: 400, method: 'Efectivo', recordedAt: '2026-08-02T16:00:00.000Z' },
        {
          id: 'refund-disb-c4',
          kind: 'refund_disbursement',
          amount: -100,
          netAmount: -100,
          method: 'Efectivo',
          recordedAt: '2026-08-09T18:00:00.000Z',
        },
      ],
      refundDisbursedAt: REFUND_TS,
      refundDisbursedAmount: 100,
      refundDisbursedMethod: 'Efectivo',
    };
    const rows = collectCashCutAllPayments([cancelled], EVENT, identityNet);
    expect(rows.filter((r) => Number(r.amount) === -100)).toHaveLength(1);
    expect(sumAmounts(rows)).toBe(300);
  });

  it('conserva abonos de activos junto a cancelados', () => {
    const active = {
      id: 'act1',
      eventId: 'ev1',
      status: 'active',
      name: 'Activo',
      location: 'Norte',
      paid: 250,
      paymentHistory: [
        { id: ABONO_TS + 1, amount: 250, method: 'Tarjeta', recordedAt: '2026-08-02T17:00:00.000Z' },
      ],
    };
    const cancelled = {
      id: 'c5',
      eventId: 'ev1',
      status: 'cancelled',
      name: 'Baja',
      location: 'Norte',
      cancelledFromLocation: 'Norte',
      paid: 100,
      paymentHistory: [
        { id: ABONO_TS, amount: 100, method: 'Efectivo', recordedAt: '2026-08-02T16:00:00.000Z' },
      ],
      refundPendingAmount: 100,
    };
    const rows = collectCashCutAllPayments([active, cancelled], EVENT, identityNet);
    expect(sumAmounts(rows)).toBe(350);
    expect(rows.map((r) => r._personId).sort()).toEqual(['act1', 'c5']);
  });
});
