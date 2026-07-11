import { describe, expect, it } from 'vitest';
import { buildParticipantExcelFinanceCells } from '../excelExportRosterHelpers.js';
import { buildActiveRegistrantMetaForCompanionDedupe } from '../bautizosParty.js';

const event = {
  eventType: 'Bautizos',
  bautizosListPriceFood: 100,
  bautizosListPriceTransport: 50,
};

const excelFinanceCtx = {
  currentPricing: {},
  resolveRegisteredCost: () => 0,
  getLiquidationTarget: () => 0,
  isSiValue: (v) => v === 'Si',
  computeNetAmountByMethod: (g) => g,
};

describe('buildParticipantExcelFinanceCells', () => {
  it('marks Bautizos companion as Pendiente when FIFO allocation still owes', () => {
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
    const meta = buildActiveRegistrantMetaForCompanionDedupe(roster);
    const companion = {
      id: 'gr-companion:h1:c2',
      name: 'Acomp 2',
      __globalRegistryCompanionRow: true,
      __hostRegistrantId: 'h1',
    };
    const cellsWithoutCtx = buildParticipantExcelFinanceCells(companion, excelFinanceCtx);
    expect(cellsWithoutCtx[4]).toBe('Liquidado');

    const cells = buildParticipantExcelFinanceCells(companion, {
      ...excelFinanceCtx,
      getLiquidationTarget: () => 450,
      bautizosFinanceCtx: {
        event,
        financeOpts: {
          companionDedupeMeta: meta,
          roster,
          getLiquidationTargetFn: () => 450,
          getPaidGrossFromHostFn: () => 300,
          getPaidDisplayFn: (p) => Number(p?.paid || 0) || 0,
        },
        resolveHost: (p) =>
          roster.find((r) => String(r.id) === String(p?.__hostRegistrantId || '')) || null,
      },
    });

    expect(cells[1]).toBeCloseTo(0, 1);
    expect(cells[3]).toBeCloseTo(150, 1);
    expect(cells[4]).toBe('Pendiente');
  });

  it('marks Bautizos companion as Liquidado when FIFO unit is paid', () => {
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
    const meta = buildActiveRegistrantMetaForCompanionDedupe(roster);
    const companion = {
      id: 'gr-companion:h1:c1',
      __globalRegistryCompanionRow: true,
      __hostRegistrantId: 'h1',
    };
    const cells = buildParticipantExcelFinanceCells(companion, {
      ...excelFinanceCtx,
      getLiquidationTarget: () => 450,
      bautizosFinanceCtx: {
        event,
        financeOpts: {
          companionDedupeMeta: meta,
          roster,
          getLiquidationTargetFn: () => 450,
          getPaidGrossFromHostFn: () => 300,
          getPaidDisplayFn: (p) => Number(p?.paid || 0) || 0,
        },
        resolveHost: (p) =>
          roster.find((r) => String(r.id) === String(p?.__hostRegistrantId || '')) || null,
      },
    });

    expect(cells[3]).toBeCloseTo(0, 1);
    expect(cells[4]).toBe('Liquidado');
  });
});
