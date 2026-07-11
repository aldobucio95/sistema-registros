import { describe, expect, it, vi } from 'vitest';
import { normalizeTransportPlanning } from '../transportPlanningCore.js';
import {
  buildTransportExportPlan,
  computeCarVehicleRegistrationStats,
  countCarVehicleRegistrationStatsFromBlocks,
  resolveCarVehicleMetaForExport,
} from '../transportCarMetaExport.js';

describe('transportCarMetaExport', () => {
  it('resolveCarVehicleMetaForExport uses fallback titular when primary is empty', () => {
    const plan = normalizeTransportPlanning({
      carMetaBySource: {
        'p:lee|c1': {
          brand: 'Volkswagen',
          model: 'Jetta',
          color: 'Gris',
          plates: 'LGL433B',
          ownerSourceKey: 'p:lee',
        },
      },
    });
    const meta = resolveCarVehicleMetaForExport(plan, 'p:ricardo', 1, ['p:lee']);
    expect(meta.brand).toBe('Volkswagen');
    expect(meta.plates).toBe('LGL433B');
  });

  it('buildTransportExportPlan merges fetched cache into readable plan', () => {
    const base = normalizeTransportPlanning({});
    const merged = buildTransportExportPlan(base, {
      'p:a|c1': { brand: 'Nissan', model: 'March', ownerSourceKey: 'p:a' },
    });
    const meta = resolveCarVehicleMetaForExport(merged, 'p:a', 1);
    expect(meta.brand).toBe('Nissan');
  });

  it('countCarVehicleRegistrationStatsFromBlocks counts registered vs incomplete cars', () => {
    const plan = normalizeTransportPlanning({
      carMetaBySource: {
        'p:a|c1': { brand: 'Toyota', ownerSourceKey: 'p:a' },
        'p:a|c2': { ownerSourceKey: 'p:a' },
        'p:b|c1': { plates: 'ABC123', ownerSourceKey: 'p:b' },
      },
    });
    const getCarMeta = (titularSk, carIndex) => resolveCarVehicleMetaForExport(plan, titularSk, carIndex);
    const stats = countCarVehicleRegistrationStatsFromBlocks(
      [
        { titularSk: 'p:a', planCars: 2 },
        { titularSk: 'p:b', planCars: 1 },
      ],
      getCarMeta
    );
    expect(stats).toEqual({ registered: 2, incomplete: 1, total: 3 });
  });

  it('computeCarVehicleRegistrationStats walks car group blocks', () => {
    const plan = normalizeTransportPlanning({
      carGroups: [],
      carMetaBySource: {
        'p:host|c1': { color: 'Rojo', ownerSourceKey: 'p:host' },
      },
    });
    const carLines = [
      {
        sourceKey: 'p:host',
        kind: 'participant',
        name: 'Host',
        location: 'CDMX',
        carrosLlegada: 1,
        hostId: 'host',
      },
    ];
    const stats = computeCarVehicleRegistrationStats({
      plan,
      carLines,
      roster: [{ id: 'host', name: 'Host', location: 'CDMX' }],
      isBautizos: true,
    });
    expect(stats.registered).toBe(1);
    expect(stats.incomplete).toBe(0);
    expect(stats.total).toBe(1);
  });
});
