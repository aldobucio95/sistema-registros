import { describe, expect, it } from 'vitest';
import {
  buildCarMetaSummaryByTitularFromPlan,
  buildTitularCarMetaSummaryEntry,
  docIdToVehicleKey,
  mergeCarMetaCacheIntoPlan,
  slotsFromTitularCarMetaSummary,
  titularSummaryNeedsAttention,
  transportPlanningForEventDoc,
  transportPlanningFromEventDoc,
  vehicleKeyToDocId,
} from '../transportCarMetaStore.js';
import { normalizeTransportPlanning } from '../transportPlanningCore.js';

describe('transportCarMetaStore encode/decode', () => {
  it('round-trips vehicle keys with pipe and colon', () => {
    const key = 'p:abc123|c2';
    expect(docIdToVehicleKey(vehicleKeyToDocId(key))).toBe(key);
  });
});

describe('transportPlanningForEventDoc', () => {
  it('strips inline carMetaBySource and sets storage version', () => {
    const plan = normalizeTransportPlanning({
      carMetaBySource: { 'p:h1|c1': { brand: 'Toyota', ownerSourceKey: 'p:h1' } },
      bautizosCarCapacity: 5,
    });
    const eventDoc = transportPlanningForEventDoc(plan);
    expect(eventDoc.carMetaBySource).toEqual({});
    expect(eventDoc.transportCarMetaStorageVersion).toBe(1);
    expect(eventDoc.bautizosCarCapacity).toBe(5);
  });

  it('transportPlanningFromEventDoc clears inline when migrated', () => {
    const raw = {
      transportCarMetaStorageVersion: 1,
      carMetaBySource: { 'p:h1|c1': { brand: 'X' } },
      bautizosCarMetaSummaryByTitular: { 'p:h1': { needsAttention: false, cars: [] } },
    };
    const mem = transportPlanningFromEventDoc(raw);
    expect(mem.carMetaBySource).toEqual({});
    expect(mem.bautizosCarMetaSummaryByTitular['p:h1']).toBeDefined();
  });
});

describe('buildCarMetaSummaryByTitularFromPlan', () => {
  it('builds needsAttention from incomplete vehicle meta', () => {
    const plan = normalizeTransportPlanning({
      carMetaBySource: {
        'p:h1|c1': {
          ownerSourceKey: 'p:h1',
          brand: '',
          brandPending: true,
          driverSourceKey: 'p:h1',
        },
      },
    });
    const roster = [{ id: 'h1', name: 'Ana' }];
    const summary = buildCarMetaSummaryByTitularFromPlan(plan, roster);
    expect(summary['p:h1'].needsAttention).toBe(true);
    expect(summary['p:h1'].cars).toHaveLength(1);
    expect(summary['p:h1'].cars[0].carIndex).toBe(1);
  });

  it('slotsFromTitularCarMetaSummary maps crew preview', () => {
    const entry = buildTitularCarMetaSummaryEntry(
      'p:h1',
      {
        'p:h1|c1': {
          ownerSourceKey: 'p:h1',
          brand: 'Nissan',
          model: 'March',
          color: 'Blanco',
          plates: '030BNN',
          driverSourceKey: 'p:h1',
        },
      },
      [{ id: 'h1', name: 'Ana' }],
      { requiresPassengers: false }
    );
    const slots = slotsFromTitularCarMetaSummary(entry);
    expect(slots).toHaveLength(1);
    expect(slots[0].members.some((m) => m.crewRole === 'driver')).toBe(true);
    expect(entry.needsAttention).toBe(false);
    expect(titularSummaryNeedsAttention(entry, { requiresPassengers: false })).toBe(false);
  });

  it('solo titular sin pasajeros no queda pendiente en resumen', () => {
    const plan = normalizeTransportPlanning({
      carMetaBySource: {
        'p:h1|c1': {
          ownerSourceKey: 'p:h1',
          brand: 'Nissan',
          model: 'March',
          color: 'Blanco',
          plates: '030BNN',
          driverSourceKey: 'p:h1',
          passengerSourceKeys: [],
        },
      },
    });
    const roster = [{ id: 'h1', name: 'Itzel', llegaEnCarro: true, wantsBautizosTransport: 'No' }];
    const summary = buildCarMetaSummaryByTitularFromPlan(plan, roster);
    expect(summary['p:h1'].needsAttention).toBe(false);
    expect(summary['p:h1'].requiresPassengers).toBe(false);
  });

  it('legacy summary con pasajeros no requeridos no marca pendiente colapsado', () => {
    const legacy = {
      needsAttention: true,
      cars: [
        {
          carIndex: 1,
          vehiclePending: true,
          crewPreview: [{ name: 'Itzel', crewRole: 'driver' }],
        },
      ],
    };
    expect(titularSummaryNeedsAttention(legacy, { requiresPassengers: false })).toBe(false);
  });
});

describe('mergeCarMetaCacheIntoPlan', () => {
  it('merges lazy-loaded cache into plan for editing', () => {
    const base = transportPlanningFromEventDoc({ transportCarMetaStorageVersion: 1 });
    const merged = mergeCarMetaCacheIntoPlan(base, {
      'p:h1|c1': { brand: 'Honda', ownerSourceKey: 'p:h1' },
    });
    expect(merged.carMetaBySource['p:h1|c1'].brand).toBe('Honda');
  });
});
