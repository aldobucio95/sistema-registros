import { describe, expect, it } from 'vitest';
import {
  isFullParticipantRevertSnapshot,
  mergeParticipantDocForRevert,
  participantCreateRevertShouldSkipDelete,
  planParticipantRevertWrite,
  selectLaterPaymentHistoryRows,
} from '../participantRevertMerge.js';

const T0 = Date.parse('2026-08-25T11:00:00.000Z');
const T_ABONO = Date.parse('2026-08-25T12:00:00.000Z');
const T_LOG_EDIT = T0;
const T_LOG_ABONO = Date.parse('2026-08-25T12:00:01.000Z');

const laterAbono = {
  id: T_ABONO,
  amount: 300,
  netAmount: 300,
  method: 'Efectivo',
  recordedAt: '2026-08-25T12:00:00.000Z',
};

describe('isFullParticipantRevertSnapshot', () => {
  it('acepta un registro completo', () => {
    expect(
      isFullParticipantRevertSnapshot({
        name: 'Ana',
        eventId: 'ev1',
        location: 'Norte',
        status: 'active',
        paid: 0,
        paymentHistory: [],
      })
    ).toBe(true);
  });

  it('rechaza un parche de un solo campo (talla)', () => {
    expect(isFullParticipantRevertSnapshot({ baptismShirtSize: 'M' })).toBe(false);
  });
});

describe('selectLaterPaymentHistoryRows / merge', () => {
  it('conserva un abono posterior al log de edición', () => {
    const prev = {
      name: 'Ana',
      eventId: 'ev1',
      location: 'Norte',
      status: 'active',
      paid: 0,
      paymentHistory: [],
    };
    const cur = { ...prev, paid: 300, paymentHistory: [laterAbono] };
    const merged = mergeParticipantDocForRevert(prev, cur, T_LOG_EDIT);
    expect(merged.paymentHistory).toHaveLength(1);
    expect(merged.paymentHistory[0].amount).toBe(300);
    expect(merged.paid).toBe(300);
  });

  it('no conserva el abono que el propio log está deshaciendo', () => {
    const prev = {
      name: 'Ana',
      eventId: 'ev1',
      location: 'Norte',
      status: 'active',
      paid: 0,
      paymentHistory: [],
    };
    const cur = { ...prev, paid: 300, paymentHistory: [laterAbono] };
    const merged = mergeParticipantDocForRevert(prev, cur, T_LOG_ABONO);
    expect(merged.paymentHistory).toEqual([]);
    expect(merged.paid).toBe(0);
  });

  it('une un abono previo del snapshot con uno posterior', () => {
    const first = {
      id: T0,
      amount: 500,
      netAmount: 500,
      method: 'Efectivo',
      recordedAt: '2026-08-25T11:00:00.000Z',
    };
    const later = selectLaterPaymentHistoryRows([first], [first, laterAbono], T_LOG_EDIT);
    expect(later).toHaveLength(1);
    expect(later[0].amount).toBe(300);
  });

  it('conserva una devolución posterior y limpia el pendiente', () => {
    const prev = {
      name: 'Ana',
      eventId: 'ev1',
      location: 'Norte',
      status: 'active',
      paid: 500,
      paymentHistory: [{ id: T0, amount: 500, recordedAt: '2026-08-25T11:00:00.000Z' }],
    };
    const refundRow = {
      id: 'refund-disb-p1',
      kind: 'refund_disbursement',
      amount: -500,
      recordedAt: '2026-08-25T13:00:00.000Z',
    };
    const cur = {
      ...prev,
      status: 'cancelled',
      paymentHistory: [...prev.paymentHistory, refundRow],
      refundDisbursedAt: Date.parse('2026-08-25T13:00:00.000Z'),
      refundDisbursedAmount: 500,
      refundPendingAmount: 0,
    };
    const merged = mergeParticipantDocForRevert(prev, cur, T_LOG_EDIT);
    expect(merged.paymentHistory.some((r) => r.kind === 'refund_disbursement')).toBe(true);
    expect(merged.refundDisbursedAmount).toBe(500);
    expect(merged.refundPendingAmount).toBe(0);
    expect(merged.paid).toBe(0);
  });
});

describe('planParticipantRevertWrite', () => {
  it('no borra un alta si hay abonos posteriores', () => {
    const current = {
      name: 'Ana',
      paymentHistory: [laterAbono],
    };
    expect(participantCreateRevertShouldSkipDelete(current, T_LOG_EDIT)).toBe(true);
    expect(
      planParticipantRevertWrite({
        action: 'create',
        previousData: null,
        currentData: current,
        logCreatedAtMs: T_LOG_EDIT,
      })
    ).toEqual({ type: 'skip_delete', reason: 'later_payments' });
  });

  it('sí borra un alta si solo hay el abono inicial anterior al log', () => {
    const current = {
      name: 'Ana',
      paymentHistory: [
        {
          id: T0,
          amount: 200,
          recordedAt: '2026-08-25T11:00:00.000Z',
        },
      ],
    };
    expect(participantCreateRevertShouldSkipDelete(current, T_LOG_ABONO)).toBe(false);
    expect(
      planParticipantRevertWrite({
        action: 'create',
        previousData: null,
        currentData: current,
        logCreatedAtMs: T_LOG_ABONO,
      }).type
    ).toBe('delete');
  });

  it('no mezcla finanzas en un parche parcial', () => {
    const plan = planParticipantRevertWrite({
      action: 'update',
      previousData: { baptismShirtSize: 'M' },
      currentData: { paid: 300, paymentHistory: [laterAbono] },
      logCreatedAtMs: T_LOG_EDIT,
    });
    expect(plan.mergedFinance).toBe(false);
    expect(plan.payload).toEqual({ baptismShirtSize: 'M' });
  });
});
