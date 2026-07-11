import { describe, expect, it, vi } from 'vitest';
import {
  EXPENSE_QUANTITY_MODE_MANUAL,
  EXPENSE_QUANTITY_MODE_REGISTRY,
  applyResolvedExpenseAmounts,
  buildExpenseRegistryParticipantPool,
  countExpenseRegistryQuantityMatches,
  createEmptyExpenseRegistryQuantityFilters,
  resolveExpenseRowAmounts,
} from '../expenseRegistryQuantity.js';

describe('expenseRegistryQuantity', () => {
  const event = { id: 'ev1', locations: ['Norte', 'Sur'] };
  const allParticipants = [
    { id: 'a1', eventId: 'ev1', status: 'active', location: 'Norte', name: 'Ana' },
    { id: 'a2', eventId: 'ev1', status: 'active', location: 'Norte', name: 'Luis', isScholarship: 'Sí' },
    { id: 'w1', eventId: 'ev1', status: 'waitlist', location: 'Sur', name: 'Eva' },
    { id: 'c1', eventId: 'ev1', status: 'cancelled', location: 'Norte', name: 'Off' },
  ];

  it('buildExpenseRegistryParticipantPool respects sede scope', () => {
    const norteOnly = buildExpenseRegistryParticipantPool({
      event,
      allParticipants,
      visibleLocations: ['Norte', 'Sur'],
      registryQuantityLocations: ['Norte'],
    });
    expect(norteOnly.map((p) => p.id).sort()).toEqual(['a1', 'a2', 'c1']);
  });

  it('resolveExpenseRowAmounts uses dynamic count for registry mode', () => {
    const filterParticipantRows = vi.fn((rows) =>
      rows.filter((p) => p.status === 'active' && p.location === 'Norte')
    );
    const resolved = resolveExpenseRowAmounts(
      {
        quantityMode: EXPENSE_QUANTITY_MODE_REGISTRY,
        unitPrice: 10,
        registryQuantityFilters: { ...createEmptyExpenseRegistryQuantityFilters(), filterRegistrationStatus: 'active' },
        registryQuantityLocations: ['Norte'],
      },
      {
        event,
        allParticipants,
        visibleLocations: ['Norte', 'Sur'],
        filterParticipantRows,
      }
    );
    expect(resolved.quantity).toBe(2);
    expect(resolved.totalPrice).toBe(20);
    expect(resolved.isDynamic).toBe(true);
  });

  it('applyResolvedExpenseAmounts caps paid when total shrinks', () => {
    const out = applyResolvedExpenseAmounts(
      {
        quantityMode: EXPENSE_QUANTITY_MODE_MANUAL,
        quantity: 2,
        unitPrice: 50,
        paidAmount: 100,
        paid: true,
      },
      {}
    );
    expect(out.totalPrice).toBe(100);
    expect(out.paidAmount).toBe(100);
    expect(out.paid).toBe(true);
  });

  it('countExpenseRegistryQuantityMatches delegates to filterParticipantRows for non-Bautizos', () => {
    const filterParticipantRows = vi.fn(() => [{ id: 'x' }]);
    const pool = [{ id: 'a1' }];
    expect(
      countExpenseRegistryQuantityMatches(pool, createEmptyExpenseRegistryQuantityFilters(), filterParticipantRows)
    ).toBe(1);
    expect(filterParticipantRows).toHaveBeenCalledWith(pool, true, expect.any(Object), {
      expandBautizosCompanions: true,
    });
  });

  it('countExpenseRegistryQuantityMatches uses canonical Bautizos count for active+liquidado', () => {
    const host = {
      id: 'h1',
      eventId: 'ev1',
      location: 'Norte',
      status: 'active',
      name: 'Titular',
      bautizosAttendanceType: 'Bautizado',
      bautizosCompanions: [{ id: 'c1', name: 'Acomp 1' }],
      paid: 300,
    };
    const filters = {
      ...createEmptyExpenseRegistryQuantityFilters(),
      filterRegistrationStatus: 'active',
      filterLiquidation: 'liquidado',
    };
    const filterParticipantRows = vi.fn((rows, _preserve, f, opts = {}) => {
      if (opts.expandBautizosCompanions) return rows;
      if (f.filterLiquidation === 'liquidado') return rows.filter((p) => p.id === 'h1' || p.__globalRegistryCompanionRow);
      return rows;
    });
    const count = countExpenseRegistryQuantityMatches([], filters, filterParticipantRows, {
      eventType: 'Bautizos',
      event,
      allParticipants: [host],
      dashboardLocs: ['Norte', 'Sur'],
      data: { Norte: [host] },
      waitlistData: {},
      cancelledData: {},
      registryQuantityLocations: ['Norte'],
    });
    expect(count).toBeGreaterThan(0);
    expect(filterParticipantRows).toHaveBeenCalled();
  });
});
