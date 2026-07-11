import { describe, expect, it } from 'vitest';
import { computeBautizosCompanionsPageModel } from '../bautizosCompanionsPageData.js';

describe('bautizosCompanionsPageData', () => {
  it('agrega acompañantes repetidos por persona canónica', () => {
    const roster = [
      {
        id: 'p1',
        name: 'Ana',
        location: 'Centro',
        bautizosAttendanceType: 'acompanante',
        bautizosCompanions: [{ id: 'c1', name: 'Luis', relationship: 'Hijo' }],
      },
      {
        id: 'p2',
        name: 'Beto',
        location: 'Centro',
        bautizosAttendanceType: 'acompanante',
        bautizosCompanions: [{ id: 'c2', name: 'Luis', relationship: 'Nieto' }],
      },
    ];
    const model = computeBautizosCompanionsPageModel({ roster });
    expect(model.listRows).toHaveLength(2);
    expect(model.soloListRows).toHaveLength(2);
    expect(model.registradosConAcompananteVisible).toBe(2);
  });

  it('excluye acompañantes que ya son bautizados activos del listado visible', () => {
    const roster = [
      {
        id: 'p1',
        name: 'Ana',
        location: 'Centro',
        bautizosAttendanceType: 'acompanante',
        bautizosCompanions: [{ id: 'c1', name: 'Luis', relationship: 'Hijo' }],
      },
      {
        id: 'p2',
        name: 'Luis',
        location: 'Centro',
        bautizosAttendanceType: 'bautizado',
        bautizosCompanions: [],
      },
    ];
    const model = computeBautizosCompanionsPageModel({ roster });
    expect(model.listRows).toHaveLength(0);
    expect(model.companionMatchCount).toBe(0);
  });

  it('detecta árbol familiar cuando hay 3 o más personas conectadas', () => {
    const roster = [
      {
        id: 'p1',
        name: 'Ana',
        location: 'Centro',
        bautizosAttendanceType: 'acompanante',
        bautizosCompanions: [
          { id: 'c1', name: 'Luis', relationship: 'Hijo' },
          { id: 'c2', name: 'Marta', relationship: 'Hija' },
        ],
      },
      {
        id: 'p2',
        name: 'Carlos',
        location: 'Centro',
        bautizosAttendanceType: 'acompanante',
        bautizosCompanions: [{ id: 'c3', name: 'Luis', relationship: 'Nieto' }],
      },
    ];
    const model = computeBautizosCompanionsPageModel({ roster });
    expect(model.familyTrees.length).toBeGreaterThanOrEqual(1);
    expect(model.soloListRows.length).toBeLessThan(model.listRows.length);
  });
});
