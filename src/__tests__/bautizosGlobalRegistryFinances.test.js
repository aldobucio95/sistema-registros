import { describe, expect, it } from 'vitest';
import {
  getBautizosFifoUnitBalances,
  getBautizosGlobalRegistryRowOutstandingGross,
  resolveBautizosGlobalRegistryRowFinances,
  isRosterPersonLiquidadoForListFilter,
} from '../publicRegistrationLogic.js';
import { buildActiveRegistrantMetaForCompanionDedupe } from '../bautizosParty.js';

const event = {
  eventType: 'Bautizos',
  bautizosListPriceFood: 100,
  bautizosListPriceTransport: 50,
};

function financeOpts(host, roster) {
  const meta = buildActiveRegistrantMetaForCompanionDedupe(roster);
  return {
    companionDedupeMeta: meta,
    roster,
    getLiquidationTargetFn: () => 450,
    getPaidGrossFromHostFn: () => 300,
    getPaidDisplayFn: (p) => Number(p?.paid || 0) || 0,
  };
}

describe('bautizosGlobalRegistryFinances', () => {
  it('getBautizosFifoUnitBalances allocates payments in order', () => {
    const units = [
      { kind: 'titular', owed: 150 },
      { kind: 'companion', owed: 150, companionKey: 'c1' },
      { kind: 'companion', owed: 150, companionKey: 'c2' },
    ];
    const balances = getBautizosFifoUnitBalances(units, 300);
    expect(balances[0]).toMatchObject({ paidAllocated: 150, balance: 0, isLiquidated: true });
    expect(balances[1]).toMatchObject({ paidAllocated: 150, balance: 0, isLiquidated: true });
    expect(balances[2]).toMatchObject({ paidAllocated: 0, balance: 150, isLiquidated: false });
  });

  it('companion row reflects host FIFO allocation when titular paid partially', () => {
    const host = {
      id: 'h1',
      eventId: 'ev1',
      name: 'Titular',
      bautizosAttendanceType: 'Se bautizará',
      willBeBaptized: 'Si',
      wantsBautizosTransport: 'Si',
      bautizosCompanions: [
        { id: 'c1', name: 'Acomp 1', wantsBautizosTransport: 'Si' },
        { id: 'c2', name: 'Acomp 2', wantsBautizosTransport: 'Si' },
      ],
      paid: 300,
    };
    const roster = [host];
    const opts = financeOpts(host, roster);
    const comp1 = {
      id: 'gr-companion:h1:c1',
      name: 'Acomp 1',
      __globalRegistryCompanionRow: true,
      __hostRegistrantId: 'h1',
    };
    const comp2 = {
      id: 'gr-companion:h1:c2',
      name: 'Acomp 2',
      __globalRegistryCompanionRow: true,
      __hostRegistrantId: 'h1',
    };

    const f1 = resolveBautizosGlobalRegistryRowFinances(comp1, host, event, opts);
    expect(f1.liquidationTarget).toBeCloseTo(150, 1);
    expect(f1.paidDisplay).toBeCloseTo(150, 1);
    expect(f1.balance).toBeCloseTo(0, 1);
    expect(f1.isLiquidated).toBe(true);

    const f2 = resolveBautizosGlobalRegistryRowFinances(comp2, host, event, opts);
    expect(f2.balance).toBeCloseTo(150, 1);
    expect(f2.isLiquidated).toBe(false);
    expect(getBautizosGlobalRegistryRowOutstandingGross(comp2, host, event, opts)).toBeCloseTo(150, 1);
  });

  it('pastor courtesy companion shows zero balance', () => {
    const host = {
      id: 'h1',
      bautizosAttendanceType: 'Pastor',
      bautizosCompanions: [{ id: 'c1', name: 'Hijo' }],
    };
    const companion = {
      id: 'gr-companion:h1:c1',
      name: 'Hijo',
      __globalRegistryCompanionRow: true,
      __hostRegistrantId: 'h1',
      __pastorCourtesyCompanion: true,
    };
    const finance = resolveBautizosGlobalRegistryRowFinances(companion, host, event, {
      roster: [host],
      getLiquidationTargetFn: () => 0,
      getPaidGrossFromHostFn: () => 0,
    });
    expect(finance.balance).toBe(0);
    expect(finance.isLiquidated).toBe(true);
  });

  it('isRosterPersonLiquidadoForListFilter uses FIFO for companion rows', () => {
    const host = {
      id: 'h1',
      eventId: 'ev1',
      name: 'Titular',
      bautizosAttendanceType: 'Se bautizará',
      willBeBaptized: 'Si',
      wantsBautizosTransport: 'Si',
      bautizosCompanions: [
        { id: 'c1', name: 'Acomp 1', wantsBautizosTransport: 'Si' },
        { id: 'c2', name: 'Acomp 2', wantsBautizosTransport: 'Si' },
      ],
      paid: 300,
    };
    const roster = [host];
    const opts = financeOpts(host, roster);
    const ctx = {
      eventType: 'Bautizos',
      event,
      financeOpts: opts,
      resolveHost: (p) =>
        roster.find((r) => String(r.id) === String(p?.__hostRegistrantId || '')) || null,
    };
    const comp2 = {
      id: 'gr-companion:h1:c2',
      name: 'Acomp 2',
      __globalRegistryCompanionRow: true,
      __hostRegistrantId: 'h1',
    };
    const naiveTarget = () => 0;
    expect(isRosterPersonLiquidadoForListFilter(comp2, naiveTarget)).toBe(true);
    expect(isRosterPersonLiquidadoForListFilter(comp2, naiveTarget, ctx)).toBe(false);
  });

  it('buildBautizosCompanionListFilterPersonLike enables FIFO in liquidado filter', async () => {
    const { buildBautizosCompanionListFilterPersonLike } = await import('../bautizosParty.js');
    const host = {
      id: 'h1',
      eventId: 'ev1',
      name: 'Titular',
      bautizosAttendanceType: 'Bautizado',
      wantsBautizosTransport: 'Si',
      bautizosCompanions: [
        { id: 'c1', name: 'Acomp 1', wantsBautizosTransport: 'Si' },
        { id: 'c2', name: 'Acomp 2', wantsBautizosTransport: 'Si' },
      ],
      paid: 300,
    };
    const roster = [host];
    const opts = financeOpts(host, roster);
    const ctx = {
      eventType: 'Bautizos',
      event,
      financeOpts: opts,
      resolveHost: (p) =>
        roster.find((r) => String(r.id) === String(p?.__hostRegistrantId || '')) || null,
    };
    const comp1Line = buildBautizosCompanionListFilterPersonLike(host, host.bautizosCompanions[0], 0);
    const comp2Line = buildBautizosCompanionListFilterPersonLike(host, host.bautizosCompanions[1], 1);
    expect(comp1Line.__globalRegistryCompanionRow).toBe(true);
    expect(isRosterPersonLiquidadoForListFilter(comp1Line, () => 0, ctx)).toBe(true);
    expect(isRosterPersonLiquidadoForListFilter(comp2Line, () => 0, ctx)).toBe(false);
  });

  it('companion row is liquidado when host is fully paid but FIFO unit index was missing', () => {
    const host = {
      id: 'h1',
      eventId: 'ev1',
      name: 'Alejandra Abril Ruiz Islas',
      location: 'Sur',
      bautizosAttendanceType: 'Bautizado',
      bautizosCompanions: [{ id: 'c1', name: 'Gregoria Islas Hernandez', wantsBautizosTransport: 'Si' }],
      paid: 450,
    };
    const roster = [host];
    const opts = {
      ...financeOpts(host, roster),
      getPaidGrossFromHostFn: () => 450,
      getPaidDisplayFn: () => 450,
    };
    const ctx = {
      eventType: 'Bautizos',
      event,
      financeOpts: opts,
      resolveHost: () => host,
    };
    const compRow = {
      id: 'gr-companion:h1:broken_suffix_no_match',
      name: 'Gregoria Islas Hernandez',
      __globalRegistryCompanionRow: true,
      __hostRegistrantId: 'h1',
    };
    const finance = resolveBautizosGlobalRegistryRowFinances(compRow, host, event, opts);
    expect(finance.isLiquidated).toBe(true);
    expect(finance.balance).toBeLessThan(0.005);
    expect(isRosterPersonLiquidadoForListFilter(compRow, () => 450, ctx)).toBe(true);
  });
});
