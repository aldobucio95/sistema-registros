import { describe, expect, it } from 'vitest';
import {
  applySameEventRegistrationFinanceMerge,
  historyWithLegacyPaidFallback,
  mergePaymentHistoryPreservingPrevious,
} from '../registrationFinanceMerge.js';

const identityNet = (gross) => Number(gross) || 0;

describe('registrationFinanceMerge', () => {
  it('no altera el payload si no hay documento previo', () => {
    const personData = { eventId: 'ev1', paymentHistory: [{ id: 'n1', amount: 200 }], paid: 200, paidNet: 200 };
    expect(applySameEventRegistrationFinanceMerge(null, personData, identityNet)).toBe(personData);
  });

  it('no mezcla finanzas de otro evento', () => {
    const previous = { eventId: 'ev-old', paymentHistory: [{ id: 'old', amount: 500 }], paid: 500 };
    const personData = { eventId: 'ev1', paymentHistory: [{ id: 'n1', amount: 200 }], paid: 200, paidNet: 200 };
    expect(applySameEventRegistrationFinanceMerge(previous, personData, identityNet)).toBe(personData);
  });

  it('conserva abonos previos y suma el abono del re-registro', () => {
    const previous = {
      eventId: 'ev1',
      status: 'cancelled',
      paid: 500,
      paymentHistory: [{ id: 'ab1', amount: 500, netAmount: 500, method: 'Efectivo' }],
      refundPendingAmount: 0,
      refundAsDonation: true,
      refundMarkedAsDonationAmount: 500,
      refundMarkedAsDonationAt: 99,
    };
    const personData = {
      eventId: 'ev1',
      status: 'active',
      paymentHistory: [{ id: 'ab2', amount: 200, netAmount: 200, method: 'Efectivo' }],
      paid: 200,
      paidNet: 200,
      refundPendingAmount: 0,
      refundPendingReason: '',
    };
    const merged = applySameEventRegistrationFinanceMerge(previous, personData, identityNet);
    expect(merged.paymentHistory.map((h) => h.id)).toEqual(['ab1', 'ab2']);
    expect(merged.paid).toBe(700);
    expect(merged.paidNet).toBe(700);
    expect(merged.refundAsDonation).toBe(true);
    expect(merged.refundMarkedAsDonationAmount).toBe(500);
    expect(merged.refundPendingAmount).toBe(0);
  });

  it('conserva devolución ya entregada (historial negativo + terminales)', () => {
    const previous = {
      id: 'p1',
      eventId: 'ev1',
      status: 'cancelled',
      paid: 500,
      paymentHistory: [
        { id: 'ab1', amount: 500, netAmount: 500, method: 'Efectivo' },
        { id: 'refund-disb-p1', amount: -500, netAmount: -500, kind: 'refund_disbursement', method: 'Efectivo' },
      ],
      refundDisbursedAt: 123,
      refundDisbursedAmount: 500,
      refundDisbursedMethod: 'Efectivo',
      refundDisbursedBy: 'caja',
      refundDisbursedLocation: 'Norte',
    };
    const personData = {
      eventId: 'ev1',
      status: 'active',
      paymentHistory: [{ id: 'ab2', amount: 150, netAmount: 150, method: 'Efectivo' }],
      paid: 150,
      paidNet: 150,
    };
    const merged = applySameEventRegistrationFinanceMerge(previous, personData, identityNet);
    expect(merged.paymentHistory).toHaveLength(3);
    expect(merged.paid).toBe(150);
    expect(merged.refundDisbursedAt).toBe(123);
    expect(merged.refundDisbursedAmount).toBe(500);
    expect(merged.refundDisbursedMethod).toBe('Efectivo');
    expect(merged.refundDisbursedLocation).toBe('Norte');
  });

  it('lista de espera que manda paid 0 no borra el historial de la baja', () => {
    const previous = {
      eventId: 'ev1',
      status: 'cancelled',
      paid: 400,
      paymentHistory: [{ id: 'ab1', amount: 400, netAmount: 400, method: 'Efectivo' }],
    };
    const personData = {
      eventId: 'ev1',
      status: 'waitlist',
      paymentHistory: [],
      paid: 0,
      paidNet: 0,
    };
    const merged = applySameEventRegistrationFinanceMerge(previous, personData, identityNet);
    expect(merged.paymentHistory).toEqual(previous.paymentHistory);
    expect(merged.paid).toBe(400);
  });

  it('materializa paid legado sin historial antes de concatenar un abono nuevo', () => {
    const previous = {
      id: 'p-legacy',
      eventId: 'ev1',
      paid: 300,
      paidNet: 300,
      paymentMethod: 'Efectivo',
      paymentHistory: [],
    };
    const legacy = historyWithLegacyPaidFallback(previous);
    expect(legacy).toHaveLength(1);
    expect(legacy[0].amount).toBe(300);
    const personData = {
      eventId: 'ev1',
      paymentHistory: [{ id: 'ab-new', amount: 100, netAmount: 100 }],
      paid: 100,
      paidNet: 100,
    };
    const merged = applySameEventRegistrationFinanceMerge(previous, personData, identityNet);
    expect(merged.paymentHistory.map((h) => h.amount)).toEqual([300, 100]);
    expect(merged.paid).toBe(400);
  });

  it('no duplica filas con el mismo id', () => {
    const prev = [{ id: 'ab1', amount: 50 }];
    const incoming = [{ id: 'ab1', amount: 50 }, { id: 'ab2', amount: 10 }];
    expect(mergePaymentHistoryPreservingPrevious(prev, incoming).map((h) => h.id)).toEqual(['ab1', 'ab2']);
  });
});
