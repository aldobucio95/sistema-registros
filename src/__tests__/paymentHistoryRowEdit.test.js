import { describe, expect, it } from 'vitest';
import { planPaymentHistoryRowEdit } from '../paymentHistoryRowEdit.js';

describe('planPaymentHistoryRowEdit', () => {
  it('conserva el signo de un ajuste manual negativo al cambiar el método', () => {
    const planned = planPaymentHistoryRowEdit({
      row: {
        id: 1,
        amount: -200,
        netAmount: -200,
        method: 'Efectivo',
        commission: 0,
        isManualAdjustment: true,
      },
      person: { paid: 800, paidNet: 800, paymentMethod: 'Efectivo' },
      newMethod: 'Tarjeta',
      newAmountAbs: 200,
      nextReference: 'REF1',
      commissionRate: 0.04,
    });

    expect(planned.newAmount).toBe(-200);
    expect(planned.nextRow.netAmount).toBeCloseTo(-192);
    expect(planned.nextRow.commission).toBeCloseTo(-8);
    expect(planned.nextRow.method).toBe('Tarjeta');
    expect(planned.nextPaidGross).toBeCloseTo(800);
    expect(planned.nextPaidNet).toBeCloseTo(808);
  });

  it('al reducir el valor absoluto de un ajuste negativo, el pagado sube solo esa diferencia', () => {
    const planned = planPaymentHistoryRowEdit({
      row: { id: 2, amount: -200, netAmount: -200, method: 'Efectivo', commission: 0 },
      person: { paid: 800, paidNet: 800, paymentMethod: 'Efectivo' },
      newMethod: 'Efectivo',
      newAmountAbs: 100,
      nextReference: '',
      commissionRate: 0.04,
    });

    expect(planned.newAmount).toBe(-100);
    expect(planned.nextPaidGross).toBeCloseTo(900);
    expect(planned.nextPaidNet).toBeCloseTo(900);
  });

  it('un abono positivo en efectivo pasado a tarjeta no cambia el bruto y descuenta la comisión', () => {
    const planned = planPaymentHistoryRowEdit({
      row: { id: 3, amount: 1000, netAmount: 1000, method: 'Efectivo', commission: 0 },
      person: { paid: 1000, paidNet: 1000, paymentMethod: 'Efectivo' },
      newMethod: 'Tarjeta',
      newAmountAbs: 1000,
      nextReference: '',
      commissionRate: 0.04,
    });

    expect(planned.newAmount).toBe(1000);
    expect(planned.nextRow.netAmount).toBeCloseTo(960);
    expect(planned.nextPaidGross).toBeCloseTo(1000);
    expect(planned.nextPaidNet).toBeCloseTo(960);
  });
});
