import { describe, expect, it } from 'vitest';
import {
  assignPersonToCarUnit,
  getUnassignedCarLines,
  normalizeTransportPlanning,
  totalCarsCount,
} from '../transportPlanningCore.js';
import {
  buildCarUnitSummaryEntry,
  carAssignFromUnitDocs,
  carUnitDocNeedsAttention,
  makeCarUnitId,
  normalizeCarUnitDoc,
  normalizeCarUnitPlanEntry,
} from '../transport/v3/index.js';

describe('transport v3 car units', () => {
  it('normalizes plan carUnits and carAssign', () => {
    const plan = normalizeTransportPlanning({
      transportVersion: 3,
      carUnits: [{ id: 'cu-1', label: 'Rojo', capacity: 4 }],
      carAssign: { 'p:a': 'cu-1' },
      carUnitSummaryById: { 'cu-1': { needsAttention: true } },
    });
    expect(plan.carUnits).toHaveLength(1);
    expect(plan.carUnits[0].capacity).toBe(4);
    expect(plan.carAssign['p:a']).toBe('cu-1');
    expect(plan.transportVersion).toBe(3);
  });

  it('makeCarUnitId has cu- prefix', () => {
    expect(makeCarUnitId().startsWith('cu-')).toBe(true);
  });

  it('carAssignFromUnitDocs maps driver and passengers', () => {
    const assign = carAssignFromUnitDocs([
      {
        id: 'cu-1',
        driverSourceKey: 'p:d',
        passengerSourceKeys: ['p:p1', 'p:p2'],
      },
    ]);
    expect(assign['p:d']).toBe('cu-1');
    expect(assign['p:p1']).toBe('cu-1');
    expect(assign['p:p2']).toBe('cu-1');
  });

  it('getUnassignedCarLines and assignPersonToCarUnit', () => {
    const carLines = [
      { sourceKey: 'p:1', name: 'A' },
      { sourceKey: 'p:2', name: 'B' },
    ];
    let plan = normalizeTransportPlanning({ transportVersion: 3, carUnits: [], carAssign: {} });
    expect(getUnassignedCarLines(carLines, plan)).toHaveLength(2);
    plan = assignPersonToCarUnit(plan, 'p:1', 'cu-x');
    expect(getUnassignedCarLines(carLines, plan)).toHaveLength(1);
    expect(plan.carAssign['p:1']).toBe('cu-x');
  });

  it('totalCarsCount uses carUnits in v3', () => {
    const plan = normalizeTransportPlanning({
      transportVersion: 3,
      carUnits: [
        normalizeCarUnitPlanEntry({ id: 'cu-1', label: 'A', capacity: 5 }),
        normalizeCarUnitPlanEntry({ id: 'cu-2', label: 'B', capacity: 5 }),
      ],
      carUnitSummaryById: {
        'cu-1': { maybeAbsent: false },
        'cu-2': { maybeAbsent: true },
      },
    });
    expect(totalCarsCount([], plan, false)).toBe(1);
  });

  it('carUnitDocNeedsAttention and summary', () => {
    const doc = normalizeCarUnitDoc({
      id: 'cu-1',
      brand: '',
      model: '',
      color: '',
      plates: '',
      driverSourceKey: '',
      passengerSourceKeys: [],
    });
    expect(carUnitDocNeedsAttention(doc)).toBe(true);
    const summary = buildCarUnitSummaryEntry(doc);
    expect(summary.needsAttention).toBe(true);
  });
});
