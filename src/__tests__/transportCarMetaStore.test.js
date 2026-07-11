import { describe, expect, it } from 'vitest';
import {
  buildCarMetaSummaryByTitularFromPlan,
  buildTitularCarMetaSummaryEntry,
  docIdToVehicleKey,
  mergeCarMetaCacheIntoPlan,
  mergeCarMetaCacheIntoPlanForRead,
  mergeFetchedCarMetaMaps,
  saveTransportPlanStructure,
  saveTransportAttendancePatch,
  slotsFromTitularCarMetaSummary,
  titularSummaryNeedsAttention,
  transportPlanningForEventDoc,
  transportPlanningFromEventDoc,
  vehicleKeyToDocId,
} from '../transportCarMetaStore.js';
import { normalizeTransportPlanning } from '../transportPlanningCore.js';
import { collectCarColorSuggestions } from '../bautizosCarMeta.js';

describe('transportCarMetaStore encode/decode', () => {
  it('round-trips vehicle keys with pipe and colon', () => {
    const key = 'p:abc123|c2';
    expect(docIdToVehicleKey(vehicleKeyToDocId(key))).toBe(key);
  });
});

describe('mergeFetchedCarMetaMaps', () => {
  it('prefiere v1 con datos cuando v2 trae slots vacíos', () => {
    const key = 'p:h1|c1';
    const merged = mergeFetchedCarMetaMaps(
      { [key]: { brand: 'Toyota', model: 'RAV4', plates: 'H90BEK', ownerSourceKey: 'p:h1' } },
      { [key]: { brand: '', model: '', plates: '', ownerSourceKey: 'p:h1' } }
    );
    expect(merged[key]?.brand).toBe('Toyota');
    expect(merged[key]?.plates).toBe('H90BEK');
  });

  it('prefiere v2 cuando ambos tienen datos', () => {
    const key = 'p:h1|c1';
    const merged = mergeFetchedCarMetaMaps(
      { [key]: { brand: 'Toyota', ownerSourceKey: 'p:h1' } },
      { [key]: { brand: 'Honda', model: 'Civic', ownerSourceKey: 'p:h1' } }
    );
    expect(merged[key]?.brand).toBe('Honda');
    expect(merged[key]?.model).toBe('Civic');
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

  it('plan edits win over stale lazy-loaded cache (manual group car save)', () => {
    const base = transportPlanningFromEventDoc({ transportCarMetaStorageVersion: 1 });
    const planWithEdit = {
      ...base,
      carMetaBySource: {
        'p:h1|c1': {
          ownerSourceKey: 'p:h1',
          brand: 'Toyota',
          driverSourceKey: 'p:h2',
          passengerSourceKeys: ['p:h3'],
        },
      },
    };
    const staleCache = {
      'p:h1|c1': {
        ownerSourceKey: 'p:h1',
        brand: 'Honda',
        driverSourceKey: 'p:h1',
        passengerSourceKeys: [],
      },
    };
    const merged = mergeCarMetaCacheIntoPlan(planWithEdit, staleCache);
    expect(merged.carMetaBySource['p:h1|c1'].brand).toBe('Toyota');
    expect(merged.carMetaBySource['p:h1|c1'].driverSourceKey).toBe('p:h2');
    expect(merged.carMetaBySource['p:h1|c1'].passengerSourceKeys).toEqual(['p:h3']);
  });

  it('collectCarColorSuggestions reads colors from merged lazy-load plan', () => {
    const base = transportPlanningFromEventDoc({ transportCarMetaStorageVersion: 1 });
    const merged = mergeCarMetaCacheIntoPlan(base, {
      'p:h1|c1': { color: 'Rojo', ownerSourceKey: 'p:h1' },
      'p:h2|c1': { color: 'Azul', ownerSourceKey: 'p:h2' },
    });
    expect(collectCarColorSuggestions(merged)).toEqual(['Azul', 'Rojo']);
  });

  it('mergeCarMetaCacheIntoPlanForRead keeps cached vehicle fields when plan only has crew shell', () => {
    const base = transportPlanningFromEventDoc({ transportCarMetaStorageVersion: 1 });
    const planWithCrewShell = {
      ...base,
      carMetaBySource: {
        'p:h1|c1': {
          ownerSourceKey: 'p:h1',
          brand: '',
          model: '',
          color: '',
          plates: '',
          driverSourceKey: 'p:h1',
          passengerSourceKeys: ['p:h2'],
        },
      },
    };
    const cache = {
      'p:h1|c1': {
        ownerSourceKey: 'p:h1',
        brand: 'Toyota',
        model: 'RAV4 Hybrid',
        color: 'Blanco',
        plates: '40J766',
      },
    };
    const merged = mergeCarMetaCacheIntoPlanForRead(planWithCrewShell, cache);
    expect(merged.carMetaBySource['p:h1|c1'].brand).toBe('Toyota');
    expect(merged.carMetaBySource['p:h1|c1'].model).toBe('RAV4 Hybrid');
    expect(merged.carMetaBySource['p:h1|c1'].driverSourceKey).toBe('p:h1');
  });

  it('merging loaded cache before crew patches preserves vehicle fields after autosave', async () => {
    const { buildDefaultManualGroupCrewPatches, mergeCarMetaPatchesIntoPlan } = await import(
      '../bautizosCarMeta.js'
    );
    const vehicleKey = 'p:h1|c1';
    const loadedCache = {
      [vehicleKey]: {
        brand: 'Toyota',
        model: 'Corolla',
        color: 'Plata',
        plates: 'ABC123',
        ownerSourceKey: 'p:h1',
        driverSourceKey: 'p:h1',
        passengerSourceKeys: ['c:h1:0'],
      },
    };
    const planEmpty = transportPlanningFromEventDoc({ transportCarMetaStorageVersion: 1 });
    const withoutLoadedCache = mergeCarMetaCacheIntoPlan(planEmpty, {});
    const orphanCrewPatches = buildDefaultManualGroupCrewPatches(
      withoutLoadedCache,
      'p:h1',
      ['p:h1', 'p:h2'],
      1
    );
    expect(orphanCrewPatches.length).toBe(1);
    const stripped = mergeCarMetaPatchesIntoPlan(withoutLoadedCache, orphanCrewPatches);
    expect(stripped.carMetaBySource[vehicleKey]?.brand).toBe('');

    const withLoadedCache = mergeCarMetaCacheIntoPlan(planEmpty, loadedCache);
    const safeCrewPatches = buildDefaultManualGroupCrewPatches(
      withLoadedCache,
      'p:h1',
      ['p:h1', 'p:h2'],
      1
    );
    expect(safeCrewPatches.length).toBe(0);
    const preserved = mergeCarMetaPatchesIntoPlan(withLoadedCache, safeCrewPatches);
    expect(preserved.carMetaBySource[vehicleKey].brand).toBe('Toyota');
    expect(preserved.carMetaBySource[vehicleKey].plates).toBe('ABC123');
  });
});

describe('transportPlanningStructureSignature', () => {
  it('ignora carMetaBySource al comparar estructura', async () => {
    const { transportPlanningStructureSignature } = await import('../transportPlanningCore.js');
    const base = { carGroups: [{ id: 'g1', memberKeys: ['p:a'], cars: 1 }], carMetaBySource: {} };
    const withMeta = {
      ...base,
      carMetaBySource: { 'p:a|c1': { brand: 'Toyota', color: 'Rojo' } },
    };
    expect(transportPlanningStructureSignature(base, { isBautizos: true, bautizosCarDisplayGroups: [] })).toBe(
      transportPlanningStructureSignature(withMeta, { isBautizos: true, bautizosCarDisplayGroups: [] })
    );
  });
});

describe('buildTransportPlanningGranularFirestorePatch', () => {
  it('solo parchea claves de busAssign que cambiaron al eliminar unidad', async () => {
    const { buildTransportPlanningGranularFirestorePatch, TRANSPORT_PLAN_MAP_KEY_DELETE } =
      await import('../transportPlanningCore.js');
    const remote = {
      unitsByLocation: { sede1: [{ id: 'u1' }, { id: 'u2' }] },
      busAssign: { 'p:a': 'u1', 'p:b': 'u1', 'p:c': 'u2' },
    };
    const local = {
      unitsByLocation: { sede1: [{ id: 'u2' }] },
      busAssign: { 'p:c': 'u2' },
    };
    const entries = buildTransportPlanningGranularFirestorePatch(local, remote);
    const paths = entries.map((e) => e.segments.join('.'));
    expect(paths).toContain('transportPlanning.unitsByLocation.sede1');
    expect(entries.find((e) => e.segments.join('.') === 'transportPlanning.busAssign.p:a')?.value).toBe(
      TRANSPORT_PLAN_MAP_KEY_DELETE
    );
    expect(entries.find((e) => e.segments.join('.') === 'transportPlanning.busAssign.p:b')?.value).toBe(
      TRANSPORT_PLAN_MAP_KEY_DELETE
    );
    expect(entries.some((e) => e.segments.join('.') === 'transportPlanning.busAssign.p:c')).toBe(false);
    expect(entries.length).toBe(3);
  });
});

describe('saveTransportPlanStructure', () => {
  it('preserveCarMetaSummary reuses existing summary without rebuilding from roster', async () => {
    const existingSummary = {
      'p:h1': { needsAttention: false, requiresPassengers: false, cars: [] },
    };
    const plan = normalizeTransportPlanning({
      unitsByLocation: { sede1: 2 },
      bautizosCarMetaSummaryByTitular: existingSummary,
    });
    let writtenArgs;
    const saved = await saveTransportPlanStructure({
      eventId: 'evt_test',
      plan,
      roster: [],
      getDocRef: () => ({}),
      updateDoc: async (_ref, ...args) => {
        writtenArgs = args;
      },
      preserveCarMetaSummary: true,
      remotePlan: { unitsByLocation: {} },
    });
    expect(writtenArgs.length).toBeGreaterThan(0);
    expect(saved.bautizosCarMetaSummaryByTitular).toEqual(existingSummary);
  });
});

describe('saveTransportAttendancePatch', () => {
  it('writes only attendance field paths, not full transportPlanning', async () => {
    const plan = normalizeTransportPlanning({
      unitsByLocation: { sede1: [{ id: 'u1' }] },
      busAssign: { 'p:a': 'bus-1' },
    });
    let updateArgCount = 0;
    const saved = await saveTransportAttendancePatch({
      eventId: 'evt_att',
      plan,
      sourceKey: 'p:p1',
      confirmed: true,
      confirmedBy: 'staff',
      getDocRef: () => ({}),
      updateDoc: async (_ref, ...args) => {
        updateArgCount = args.length;
      },
    });
    expect(updateArgCount).toBe(2);
    expect(saved.transportAttendanceBySource['p:p1']?.confirmed).toBe(true);
    expect(saved.unitsByLocation.sede1).toHaveLength(1);
  });
});
