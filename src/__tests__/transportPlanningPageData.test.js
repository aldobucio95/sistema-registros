import { describe, expect, it } from 'vitest';
import {
  buildCampaTransportRowByRowItems,
  buildTransportPassengersForSection,
  buildTransportBusPassengersByGroupKey,
  computeTransportPlanningPageModel,
  transportRosterSignature,
} from '../transportPlanningPageData.js';

describe('transportPlanningPageData', () => {
  it('transportRosterSignature usa ids estables', () => {
    expect(transportRosterSignature([{ id: 'a' }, { id: 'b' }])).toBe('a|b');
  });

  it('buildTransportPassengersForSection expande source key por subevento en Campa Ambos', () => {
    const rows = buildTransportPassengersForSection({
      busLines: [
        { sourceKey: 'p:1', busSede: 'Centro', campaSegment: 'Ambos', name: 'Ana' },
        { sourceKey: 'p:2', busSede: 'Centro', campaSegment: 'Teens', name: 'Beto' },
      ],
      section: { groupKey: 'Centro|Teens', sedeBase: 'Centro', subevent: 'Teens' },
      isCampa: true,
      splitCampaBySubevent: true,
      resolveCampaAmbosTransit: () => ({ teenArrive: true, teenReturn: false, jovenArrive: false, jovenReturn: true }),
    });
    expect(rows).toHaveLength(2);
    expect(rows[0].transportSourceKey).toBe('p:1|Teens');
    expect(rows[1].transportSourceKey).toBe('p:2');
  });

  it('computeTransportPlanningPageModel agrupa pasajeros y respeta unidades huérfanas', () => {
    const model = computeTransportPlanningPageModel({
      locations: ['Centro'],
      busLines: [{ sourceKey: 'p:1', busSede: 'Centro', name: 'Ana', location: 'Centro' }],
      carLines: [{ sourceKey: 'p:1', name: 'Ana', location: 'Centro', carrosLlegada: 1, kind: 'participant' }],
      bautizosCarDisplayGroups: [],
      roster: [{ id: '1', name: 'Ana' }],
      plan: {
        unitsByLocation: {
          Centro: [{ id: 'u1', kind: 'bus', label: 'Bus 1', capacity: 40 }],
          'Norte|Teens': [{ id: 'u2', kind: 'bus', label: 'Bus 2', capacity: 40 }],
        },
        busAssign: {},
        carGroups: [],
        familyCarOverride: {},
      },
      isBautizos: false,
      isCampa: false,
      splitCampaBySubevent: false,
      resolveCampaAmbosTransit: () => ({ teenArrive: false, teenReturn: false, jovenArrive: false, jovenReturn: false }),
    });
    expect(model.busSectionsEffective.map((s) => s.groupKey)).toEqual(expect.arrayContaining(['Centro', 'Norte|Teens']));
    expect(model.busPassengersByGroupKey.Centro).toHaveLength(1);
    expect(model.manualCarGroupViews).toEqual([]);
    expect(model.carLinesEligibleForManualGroupAdd).toHaveLength(1);
  });

  it('buildTransportBusPassengersByGroupKey ordena por roster visible', () => {
    const grouped = buildTransportBusPassengersByGroupKey({
      busSectionsEffective: [{ groupKey: 'Centro', sedeBase: 'Centro', subevent: null }],
      busLines: [
        { sourceKey: 'p:2', busSede: 'Centro', name: 'Beto', location: 'Centro' },
        { sourceKey: 'p:1', busSede: 'Centro', name: 'Ana', location: 'Centro' },
      ],
      roster: [{ id: '1', name: 'Ana' }, { id: '2', name: 'Beto' }],
      resolveCampaAmbosTransit: () => ({}),
    });
    expect(grouped.Centro.map((row) => row.sourceKey)).toEqual(['p:1', 'p:2']);
  });

  it('buildCampaTransportRowByRowItems omite Bautizos y conserva metadatos por línea', () => {
    const keyToGroup = new Map();
    const items = buildCampaTransportRowByRowItems({
      carLines: [{ sourceKey: 'p:1', name: 'Ana', carrosLlegada: 2, kind: 'participant', location: 'Centro' }],
      plan: { carGroups: [], familyCarOverride: {} },
      keyToGroup,
      isBautizos: false,
    });
    expect(items).toHaveLength(1);
    expect(items[0].detailKey).toBe('car:p:1');
    expect(items[0].effectiveCars).toBeGreaterThanOrEqual(1);
    expect(buildCampaTransportRowByRowItems({ carLines: [{ sourceKey: 'x' }], isBautizos: true })).toEqual([]);
  });
});
