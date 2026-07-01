import { describe, expect, it } from 'vitest';
import {
  getBautizosFifoUnitBalances,
  getBautizosGlobalRegistryRowOutstandingGross,
  resolveBautizosGlobalRegistryRowFinances,
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
});
