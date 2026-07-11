import { describe, expect, it } from 'vitest';
import {
  buildTransportExcelCarGroupSections,
  resolveBautizosDisplayGroupCars,
  sumRegisteredCarsForBautizosGroup,
} from '../transportExcelExport.js';
import { normalizeTransportPlanning } from '../transportPlanningCore.js';

describe('transportExcelExport', () => {
  const line = (overrides = {}) => ({
    sourceKey: 'p:1',
    hostId: '1',
    kind: 'participant',
    name: 'Titular Uno',
    location: 'CDMX',
    carrosLlegada: 2,
    ...overrides,
  });

  it('sumRegisteredCarsForBautizosGroup sums host car counts', () => {
    const grp = {
      hosts: [{ hostCarros: 2 }, { hostCarros: 1 }],
      lines: [],
    };
    expect(sumRegisteredCarsForBautizosGroup(grp)).toBe(3);
  });

  it('resolveBautizosDisplayGroupCars prefers explicit plan group cars', () => {
    const plan = normalizeTransportPlanning({
      carGroups: [{ id: 'cg-1', memberKeys: ['p:1', 'p:2'], cars: 1 }],
    });
    const keyToGroup = new Map([['p:1', plan.carGroups[0]], ['p:2', plan.carGroups[0]]]);
    const grp = {
      lines: [{ sourceKey: 'p:1' }, { sourceKey: 'p:2' }],
      hosts: [{ hostId: '1', hostCarros: 2 }, { hostId: '2', hostCarros: 2 }],
      isFamily: true,
    };
    expect(resolveBautizosDisplayGroupCars(grp, plan, keyToGroup)).toBe(1);
  });

  it('buildTransportExcelCarGroupSections includes summary and vehicle rows for manual groups', () => {
    const carLines = [
      line({ sourceKey: 'p:1', hostId: '1', carrosLlegada: 1 }),
      line({ sourceKey: 'p:2', hostId: '2', name: 'Titular Dos', carrosLlegada: 1 }),
    ];
    const plan = normalizeTransportPlanning({
      carGroups: [{ id: 'cg-abc', memberKeys: ['p:1', 'p:2'], cars: 1 }],
      bautizosGroupTitularByGroupId: { 'cg-abc': '1' },
    });
    const { summaryRows, vehicleRows } = buildTransportExcelCarGroupSections({
      plan,
      carLines,
      roster: [
        { id: '1', name: 'Titular Uno', location: 'CDMX' },
        { id: '2', name: 'Titular Dos', location: 'CDMX' },
      ],
      isBautizos: true,
      lineInExportScope: () => true,
    });
    expect(summaryRows[0][0]).toBe('Resumen por grupo (carro)');
    expect(summaryRows.some((row) => row[0] === 'Grupo manual')).toBe(true);
    expect(summaryRows.some((row) => row[0] === 'Grupo manual' && row[6] === 1)).toBe(true);
    expect(vehicleRows[0][0]).toBe('Detalle de vehículos por grupo');
    expect(vehicleRows.filter((row) => row[2] === '1 de 1').length).toBeGreaterThan(0);
  });
});
