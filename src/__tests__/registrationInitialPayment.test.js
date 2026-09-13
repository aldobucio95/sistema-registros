import { describe, expect, it } from 'vitest';
import { buildInitialRegistrationPaymentFields } from '../registrationInitialPayment.js';

describe('buildInitialRegistrationPaymentFields', () => {
  it('deja historial vacío cuando no hay apartado', () => {
    const fields = buildInitialRegistrationPaymentFields({
      paid: '',
      paymentMethod: 'Efectivo',
      paymentService: '1er servicio',
      at: new Date('2026-09-13T15:00:00.000Z'),
    });
    expect(fields.paid).toBe(0);
    expect(fields.paidNet).toBe(0);
    expect(fields.paymentHistory).toEqual([]);
    expect(fields.paymentMethod).toBe('Efectivo');
  });

  it('persiste el apartado en efectivo para lista de espera', () => {
    const at = new Date('2026-09-13T15:00:00.000Z');
    const fields = buildInitialRegistrationPaymentFields({
      paid: '500',
      paymentMethod: 'Efectivo',
      paymentService: '1er servicio',
      registeredBy: 'admin',
      at,
    });
    expect(fields.paid).toBe(500);
    expect(fields.paidNet).toBe(500);
    expect(fields.paymentHistory).toHaveLength(1);
    expect(fields.paymentHistory[0]).toMatchObject({
      amount: 500,
      netAmount: 500,
      method: 'Efectivo',
      service: '1er servicio',
      registeredBy: 'admin',
      commission: 0,
      reference: '',
    });
    expect(fields.paymentHistory[0].recordedAt).toBe(at.toISOString());
  });

  it('aplica comisión de tarjeta y cae a efectivo si la sede no admite tarjeta', () => {
    const card = buildInitialRegistrationPaymentFields({
      paid: 1000,
      paymentMethod: 'Tarjeta',
      cardReference: 'REF-9',
      paymentService: '2do servicio',
      commissionRate: 0.04,
      registeredBy: 'caja',
      at: new Date('2026-09-13T16:00:00.000Z'),
      cardAllowed: true,
    });
    expect(card.paymentMethod).toBe('Tarjeta');
    expect(card.paid).toBe(1000);
    expect(card.paidNet).toBe(960);
    expect(card.commission).toBe(40);
    expect(card.cardReference).toBe('REF-9');

    const cash = buildInitialRegistrationPaymentFields({
      paid: 1000,
      paymentMethod: 'Tarjeta',
      cardReference: 'REF-9',
      commissionRate: 0.04,
      cardAllowed: false,
      at: new Date('2026-09-13T16:00:00.000Z'),
    });
    expect(cash.paymentMethod).toBe('Efectivo');
    expect(cash.paidNet).toBe(1000);
    expect(cash.cardReference).toBe('');
    expect(cash.commission).toBe(0);
  });
});
