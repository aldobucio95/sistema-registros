import { describe, expect, it } from 'vitest';
import {
  isScholarshipAutoExpenseIdForEvent,
  isManualCreditVirtualExpenseIdForEvent,
  isDerivedAutoExpenseIdForEvent,
  scholarshipAutoExpenseMutationBlocked,
  mergeDerivedExpenseRows,
  orphanDerivedExpenseDocs,
} from '../expenseDerivedRows.js';

const EVENT = 'ev-1';

describe('expenseDerivedRows id helpers', () => {
  it('detects scholarship and manual-credit virtual ids', () => {
    expect(isScholarshipAutoExpenseIdForEvent(`sch-auto-approved-${EVENT}`, EVENT)).toBe(true);
    expect(isScholarshipAutoExpenseIdForEvent(`sch-auto-pending-${EVENT}`, EVENT)).toBe(true);
    expect(isScholarshipAutoExpenseIdForEvent(`sch-auto-approved-other`, EVENT)).toBe(false);
    expect(isManualCreditVirtualExpenseIdForEvent(`manual-credit-p1-${EVENT}`, EVENT)).toBe(true);
    expect(isManualCreditVirtualExpenseIdForEvent(`manual-credit-p1-other`, EVENT)).toBe(false);
    expect(isDerivedAutoExpenseIdForEvent(`sch-auto-approved-${EVENT}`, EVENT)).toBe(true);
    expect(isDerivedAutoExpenseIdForEvent(`manual-credit-p1-${EVENT}`, EVENT)).toBe(true);
    expect(isDerivedAutoExpenseIdForEvent('real-expense-1', EVENT)).toBe(false);
  });

  it('blocks materializing mutations on scholarship auto rows', () => {
    expect(scholarshipAutoExpenseMutationBlocked(`sch-auto-approved-${EVENT}`, EVENT)).toBe(true);
    expect(scholarshipAutoExpenseMutationBlocked(`sch-auto-pending-${EVENT}`, EVENT)).toBe(true);
    expect(scholarshipAutoExpenseMutationBlocked(`manual-credit-p1-${EVENT}`, EVENT)).toBe(false);
    expect(scholarshipAutoExpenseMutationBlocked('real-expense-1', EVENT)).toBe(false);
  });
});

describe('mergeDerivedExpenseRows', () => {
  it('keeps live scholarship totals even when a stale Firestore snapshot exists', () => {
    const computed = [
      {
        id: `sch-auto-approved-${EVENT}`,
        eventId: EVENT,
        name: 'Costo total de beca (aprobados)',
        totalPrice: 8000,
        paidAmount: 8000,
        paid: true,
        countInTotals: true,
        _autoScholarshipExpense: true,
      },
    ];
    const expensesList = [
      {
        id: `sch-auto-approved-${EVENT}`,
        eventId: EVENT,
        name: 'Costo total de beca (aprobados)',
        totalPrice: 5000,
        paidAmount: 5000,
        paid: true,
        countInTotals: true,
      },
    ];
    const merged = mergeDerivedExpenseRows({
      computedList: computed,
      expensesList,
      eventId: EVENT,
      suppressedIds: [],
    });
    expect(merged).toHaveLength(1);
    expect(merged[0].totalPrice).toBe(8000);
    expect(merged[0].paidAmount).toBe(8000);
    expect(merged[0]._autoScholarshipExpense).toBe(true);
  });

  it('respects suppress for scholarship rows', () => {
    const computed = [
      {
        id: `sch-auto-approved-${EVENT}`,
        eventId: EVENT,
        totalPrice: 100,
        _autoScholarshipExpense: true,
      },
    ];
    const merged = mergeDerivedExpenseRows({
      computedList: computed,
      expensesList: [],
      eventId: EVENT,
      suppressedIds: [`sch-auto-approved-${EVENT}`],
    });
    expect(merged).toHaveLength(0);
  });

  it('overlays payment flags on manual-credit rows without freezing live totals', () => {
    const computed = [
      {
        id: `manual-credit-p1-${EVENT}`,
        eventId: EVENT,
        name: 'Saldo a favor — Ana',
        totalPrice: 1500,
        paidAmount: 0,
        paid: false,
        countInTotals: true,
        _manualCostCreditExpense: true,
      },
    ];
    const expensesList = [
      {
        id: `manual-credit-p1-${EVENT}`,
        eventId: EVENT,
        name: 'Saldo a favor — Ana (viejo)',
        totalPrice: 900,
        paidAmount: 400,
        paid: false,
        countInTotals: false,
        updatedBy: 'admin',
      },
    ];
    const merged = mergeDerivedExpenseRows({
      computedList: computed,
      expensesList,
      eventId: EVENT,
      suppressedIds: [],
    });
    expect(merged).toHaveLength(1);
    expect(merged[0].totalPrice).toBe(1500);
    expect(merged[0].name).toBe('Saldo a favor — Ana');
    expect(merged[0].paidAmount).toBe(400);
    expect(merged[0].countInTotals).toBe(false);
    expect(merged[0]._manualCostCreditExpense).toBe(true);
  });
});

describe('orphanDerivedExpenseDocs', () => {
  it('does not resurrect stale scholarship Firestore snapshots as orphan rows', () => {
    const orphans = orphanDerivedExpenseDocs({
      expensesList: [
        {
          id: `sch-auto-approved-${EVENT}`,
          eventId: EVENT,
          totalPrice: 5000,
        },
        {
          id: `manual-credit-gone-${EVENT}`,
          eventId: EVENT,
          totalPrice: 100,
        },
      ],
      eventId: EVENT,
      mergedDerivedIds: new Set(),
    });
    expect(orphans.map((o) => o.id)).toEqual([`manual-credit-gone-${EVENT}`]);
  });
});
