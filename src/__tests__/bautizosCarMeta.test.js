import { describe, expect, it } from 'vitest';
import {
  buildBautizosCarSlotsForTransport,
  buildCarCrewMembersFromMeta,
  buildCarDataSummaryForRosterPerson,
  buildRosterSourceKeyLabelIndex,
  buildTransportCarContextForHost,
  dedupeCrewSourceKeys,
  familyHasAnyCarTransport,
  buildCarMetaPatchesAfterSave,
  resolveLinkedCompanionCarInheritance,
  resolveBautizosCarDataAnchor,
  titularSourceKeyHasCarMetaCaptured,
  listManualGroupTitularCarMetaSources,
  titularNeedsCarMetaHydration,
  materializeTitularCarMetaOnPlan,
  buildCopyTitularCarMetaPatches,
  buildManualGroupOrphanCarMetaCleanup,
  buildManualGroupCrewAppendPatches,
  createBlankDraftCarVehicleMeta,
  stripDraftHostCarMetaFromPlan,
  buildBautizosFamilyCarInventory,
  buildMergedFamilyCarInventory,
  getFamilyCarInventoryValidationIssues,
} from '../bautizosCarMeta.js';
import { mergeCarMetaCacheIntoPlan } from '../transportCarMetaStore.js';
import { normalizeTransportPlanning } from '../transportPlanningCore.js';
import { bautizosLlegaEnCarroForTransportPricing } from '../bautizosParty.js';

describe('familyHasAnyCarTransport', () => {
  it('no cuenta filas de acompañante vacías con llegaEnCarro por defecto', () => {
    const host = {
      llegaEnCarro: false,
      wantsBautizosTransport: 'Si',
      bautizosCompanions: [
        {
          id: 'empty',
          name: '',
          relationship: '',
          wantsBautizosTransport: 'No',
          llegaEnCarro: true,
        },
      ],
    };
    expect(familyHasAnyCarTransport(host, host.bautizosCompanions)).toBe(false);
  });

  it('sí cuenta acompañante con nombre que va en carro', () => {
    const host = {
      llegaEnCarro: false,
      wantsBautizosTransport: 'Si',
      bautizosCompanions: [
        {
          id: 'c1',
          name: 'Ana López Pérez',
          relationship: 'Esposa',
          wantsBautizosTransport: 'No',
          llegaEnCarro: true,
        },
      ],
    };
    expect(familyHasAnyCarTransport(host, host.bautizosCompanions)).toBe(true);
  });

  it('no excluye acompañante bautizado en carro para formularios de registro', () => {
    const host = {
      id: 'host-1',
      llegaEnCarro: false,
      wantsBautizosTransport: 'Si',
      bautizosCompanions: [
        {
          id: 'c1',
          name: 'Pedro Bautizado',
          relationship: 'Hermano',
          willBeBaptized: 'Si',
          wantsBautizosTransport: 'No',
          llegaEnCarro: true,
        },
      ],
    };
    expect(familyHasAnyCarTransport(host, host.bautizosCompanions)).toBe(true);
  });

  it('titular solo en transporte del evento no requiere datos de carro', () => {
    const host = {
      llegaEnCarro: false,
      wantsBautizosTransport: 'Si',
      bautizosCompanions: [],
    };
    expect(familyHasAnyCarTransport(host, [])).toBe(false);
  });

  it('transporte del evento no se interpreta como carro por transportType legacy', () => {
    const host = {
      llegaEnCarro: false,
      wantsBautizosTransport: 'Si',
      transportType: 'Carro',
    };
    expect(bautizosLlegaEnCarroForTransportPricing(host)).toBe(false);
    expect(familyHasAnyCarTransport(host, [])).toBe(false);
  });

  it('titular en transporte con carrosLlegada por defecto no muestra inventario de carro', () => {
    const host = {
      llegaEnCarro: false,
      wantsBautizosTransport: 'Si',
      transportType: 'Carro',
      carrosLlegada: 1,
      bautizosCompanions: [],
    };
    expect(familyHasAnyCarTransport(host, [], host)).toBe(false);
    const summary = buildCarDataSummaryForRosterPerson({
      person: host,
      companions: [],
      plan: { carMetaBySource: { 'p:mayra|c1': { brand: '', pendingBrand: true } } },
      roster: [host],
      eventLike: host,
      forRosterDisplay: true,
    });
    expect(summary.inventory).toEqual([]);
  });
});

describe('resolveBautizosCarDataAnchor', () => {
  const event = { eventType: 'Bautizos', transportPlanning: {} };

  it('titular con acompañante no bautizado en carro sigue siendo responsable', () => {
    const host = {
      id: 'host-1',
      name: 'María',
      llegaEnCarro: false,
      wantsBautizosTransport: 'Si',
      bautizosCompanions: [
        {
          id: 'c1',
          name: 'Ana',
          relationship: 'Esposa',
          llegaEnCarro: true,
          wantsBautizosTransport: 'No',
        },
      ],
    };
    const anchor = resolveBautizosCarDataAnchor(host, [host], event);
    expect(anchor.eligible).toBe(true);
    expect(anchor.waRecipient?.id).toBe('host-1');
  });

  it('subregistro bautizado en carro con titular en transporte es responsable propio', () => {
    const host = {
      id: 'host-1',
      name: 'María',
      llegaEnCarro: false,
      wantsBautizosTransport: 'Si',
      carrosLlegada: 1,
      bautizosCompanions: [],
    };
    const derived = {
      id: 'split-1',
      name: 'Pedro',
      bautizosSplitPartyHostParticipantId: 'host-1',
      llegaEnCarro: true,
      carrosLlegada: 1,
      wantsBautizosTransport: 'No',
    };
    const roster = [host, derived];
    expect(resolveBautizosCarDataAnchor(host, roster, event).eligible).toBe(false);
    const splitAnchor = resolveBautizosCarDataAnchor(derived, roster, event);
    expect(splitAnchor.eligible).toBe(true);
    expect(splitAnchor.waRecipient?.id).toBe('split-1');
  });
});

describe('buildTransportCarContextForHost', () => {
  const robertoId = 'host-roberto';
  const febeId = 'host-febe';
  const normaCompanionId = 'comp-norma';

  const plan = {
    carMetaBySource: {
      [`p:${robertoId}|c1`]: {
        brand: 'Chevrolet',
        model: 'Aveo',
        color: 'Blanco',
        plates: 'X50BKA',
        driverSourceKey: `p:${robertoId}`,
        passengerSourceKeys: [`p:${febeId}`, `c:${robertoId}::${normaCompanionId}`],
      },
    },
  };

  const roster = [
    {
      id: robertoId,
      name: 'Roberto Rosas Vargas',
      llegaEnCarro: true,
      carrosLlegada: 1,
      wantsBautizosTransport: 'Si',
      bautizosCompanions: [
        {
          id: normaCompanionId,
          name: 'Norma Rosas Cruz',
          relationship: 'Hija',
          llegaEnCarro: true,
          wantsBautizosTransport: 'No',
        },
      ],
    },
    {
      id: febeId,
      name: 'Febe Cruz Treviño',
      llegaEnCarro: false,
      carrosLlegada: 1,
      wantsBautizosTransport: 'Si',
      bautizosCompanions: [],
    },
  ];

  it('hereda el titular del carro cuando el participante es pasajero', () => {
    const ctx = buildTransportCarContextForHost({ hostId: febeId, plan, roster });
    expect(ctx.hostSourceKey).toBe(`p:${robertoId}`);
    expect(ctx.inheritedFromTitular).toBe(true);
    expect(ctx.titularName).toBe('Roberto Rosas Vargas');
  });

  it('expone conductor y pasajeros del carMeta en las plazas de transporte', () => {
    const ctx = buildTransportCarContextForHost({ hostId: febeId, plan, roster });
    const slots = buildBautizosCarSlotsForTransport({
      plan,
      hostSourceKey: ctx.hostSourceKey,
      effectiveCars: 1,
      hostPerson: ctx.hostPerson,
      companions: ctx.companions,
      labelIndex: ctx.labelIndex,
      fallbackLines: [{ sourceKey: `p:${febeId}`, name: 'Febe Cruz Treviño', kind: 'participant' }],
      roster,
    });
    expect(slots).toHaveLength(1);
    const names = slots[0].members.map((m) => m.name);
    expect(names).toEqual(
      expect.arrayContaining(['Roberto Rosas Vargas', 'Febe Cruz Treviño', 'Norma Rosas Cruz'])
    );
    expect(slots[0].members.find((m) => m.crewRole === 'driver')?.name).toBe('Roberto Rosas Vargas');
  });
});

describe('buildManualGroupCrewAppendPatches', () => {
  it('añade nuevos pasajeros a tripulación existente del ancla', () => {
    const plan = normalizeTransportPlanning({
      carMetaBySource: {
        'p:anchor|c1': {
          driverSourceKey: 'p:anchor',
          passengerSourceKeys: ['c:a1'],
          pendingDriver: false,
          pendingPassengers: false,
        },
      },
    });
    const patches = buildManualGroupCrewAppendPatches(
      plan,
      'p:anchor',
      ['p:anchor', 'c:a1', 'p:new1', 'c:new2'],
      1
    );
    expect(patches).toHaveLength(1);
    expect(patches[0].vehicleKey).toBe('p:anchor|c1');
    expect(patches[0].patch.passengerSourceKeys).toEqual(['c:a1', 'p:new1', 'c:new2']);
  });
});

describe('manual car groups', () => {
  it('non-anchor titular inherits car summary from manual group anchor', () => {
    const hostA = {
      id: 'a1',
      name: 'Ana',
      llegaEnCarro: true,
      carrosLlegada: 1,
      wantsBautizosTransport: 'No',
      bautizosCompanions: [],
    };
    const hostB = {
      id: 'b1',
      name: 'Bruno',
      llegaEnCarro: true,
      carrosLlegada: 1,
      wantsBautizosTransport: 'No',
      bautizosCompanions: [],
    };
    const plan = {
      carGroups: [{ id: 'cg-1', memberKeys: ['p:a1', 'p:b1'], cars: 1 }],
      bautizosGroupTitularByGroupId: { 'cg-1': 'a1' },
      carMetaBySource: {
        'p:a1|c1': {
          brand: 'Toyota',
          model: 'Corolla',
          color: 'Rojo',
          plates: 'ABC123',
          driverSourceKey: 'p:a1',
          passengerSourceKeys: ['p:b1'],
        },
      },
    };
    const roster = [hostA, hostB];
    const summary = buildCarDataSummaryForRosterPerson({
      person: hostB,
      plan,
      roster,
    });
    expect(summary.inheritedFromTitular).toBe(true);
    expect(summary.inventory.length).toBe(1);
    expect(summary.inventory[0].meta.brand).toBe('Toyota');
    expect(summary.manualGroupMemberCount).toBe(2);
  });

  it('resolveBautizosCarDataAnchor lets non-anchor manual member view anchor car data', () => {
    const hostA = { id: 'a1', name: 'Ana', llegaEnCarro: true, carrosLlegada: 1, bautizosCompanions: [] };
    const hostB = { id: 'b1', name: 'Bruno', llegaEnCarro: true, carrosLlegada: 1, bautizosCompanions: [] };
    const event = {
      eventType: 'Bautizos',
      transportPlanning: {
        carGroups: [{ id: 'cg-1', memberKeys: ['p:a1', 'p:b1'], cars: 1 }],
        bautizosGroupTitularByGroupId: { 'cg-1': 'a1' },
      },
    };
    const roster = [hostA, hostB];
    const member = resolveBautizosCarDataAnchor(hostB, roster, event);
    expect(member.eligible).toBe(true);
    expect(member.manualGroupInherited).toBe(true);
    expect(member.anchorPerson?.id).toBe('a1');
    expect(resolveBautizosCarDataAnchor(hostA, roster, event).eligible).toBe(true);
    expect(resolveBautizosCarDataAnchor(hostA, roster, event).manualGroupMemberCount).toBe(2);
  });
});

describe('dedupeCrewSourceKeys', () => {
  const andresId = 'host-andres';
  const pamelaId = 'host-pamela';
  const pamelaCompId = 'comp-pamela';

  const roster = [
    {
      id: andresId,
      name: 'Andres De La Cruz',
      bautizosCompanions: [
        {
          id: pamelaCompId,
          name: 'Pamela Palacios',
          linkedCompanionSourceKey: `p:${pamelaId}`,
        },
      ],
    },
    { id: pamelaId, name: 'Pamela Palacios', bautizosCompanions: [] },
  ];

  it('colapsa pasajero duplicado p:<id> y c:<host>::<companionId> vinculado', () => {
    const keys = [`p:${pamelaId}`, `c:${andresId}::${pamelaCompId}`];
    expect(dedupeCrewSourceKeys(keys, roster)).toEqual([`p:${pamelaId}`]);
    const labelIndex = buildRosterSourceKeyLabelIndex(roster);
    const members = buildCarCrewMembersFromMeta(
      {
        driverSourceKey: `p:${andresId}`,
        passengerSourceKeys: keys,
      },
      roster[0],
      roster[0].bautizosCompanions,
      labelIndex,
      roster
    );
    const passengers = members.filter((m) => m.crewRole === 'passenger');
    expect(passengers).toHaveLength(1);
    expect(passengers[0].name).toBe('Pamela Palacios');
  });

  it('no elimina pasajeros distintos en el carro de Roberto', () => {
    const robertoId = 'host-roberto';
    const febeId = 'host-febe';
    const normaCompanionId = 'comp-norma';
    const robertoRoster = [
      {
        id: robertoId,
        name: 'Roberto Rosas Vargas',
        bautizosCompanions: [
          { id: normaCompanionId, name: 'Norma Rosas Cruz', relationship: 'Hija' },
        ],
      },
      { id: febeId, name: 'Febe Cruz Treviño', bautizosCompanions: [] },
    ];
    const labelIndex = buildRosterSourceKeyLabelIndex(robertoRoster);
    const members = buildCarCrewMembersFromMeta(
      {
        driverSourceKey: `p:${robertoId}`,
        passengerSourceKeys: [`p:${febeId}`, `c:${robertoId}::${normaCompanionId}`],
      },
      robertoRoster[0],
      robertoRoster[0].bautizosCompanions,
      labelIndex,
      robertoRoster
    );
    expect(members.filter((m) => m.crewRole === 'passenger')).toHaveLength(2);
    expect(members.map((m) => m.name)).toEqual(
      expect.arrayContaining(['Roberto Rosas Vargas', 'Febe Cruz Treviño', 'Norma Rosas Cruz'])
    );
  });
});

describe('resolveLinkedCompanionCarInheritance', () => {
  const pamelaId = 'host-pamela';
  const andresId = 'host-andres';

  const plan = {
    carMetaBySource: {
      [`p:${pamelaId}|c1`]: {
        brand: 'Toyota',
        model: 'RAV4',
        color: 'Rojo',
        plates: 'ABC-123',
        driverSourceKey: `p:${pamelaId}`,
        passengerSourceKeys: [],
      },
    },
  };

  const roster = [
    {
      id: andresId,
      name: 'Andres De La Cruz',
      status: 'active',
      llegaEnCarro: true,
      carrosLlegada: 1,
      bautizosCompanions: [
        {
          id: 'comp-pam',
          name: 'Pamela Palacios',
          linkedCompanionSourceKey: `p:${pamelaId}`,
        },
      ],
    },
    {
      id: pamelaId,
      name: 'Pamela Palacios',
      status: 'active',
      llegaEnCarro: true,
      carrosLlegada: 1,
      bautizosCompanions: [],
    },
  ];

  it('hereda por defecto cuando hay registro vinculado con datos de carro', () => {
    const inherit = resolveLinkedCompanionCarInheritance(roster[0], roster, plan);
    expect(inherit.eligible).toBe(true);
    expect(inherit.active).toBe(true);
    expect(inherit.linkedName).toBe('Pamela Palacios');
    expect(inherit.inventory.length).toBeGreaterThan(0);
  });

  it('respeta bautizosInheritLinkedCompanionCarData: false', () => {
    const host = { ...roster[0], bautizosInheritLinkedCompanionCarData: false };
    const inherit = resolveLinkedCompanionCarInheritance(host, roster, plan);
    expect(inherit.eligible).toBe(true);
    expect(inherit.active).toBe(false);
  });

  it('buildCarMetaPatchesAfterSave copia metadatos del vinculado cuando hereda', () => {
    const patches = buildCarMetaPatchesAfterSave({
      hostPerson: roster[0],
      companions: roster[0].bautizosCompanions,
      plan,
      draftMetaByVehicleKey: {},
      hostId: andresId,
      roster,
    });
    expect(patches.some((p) => p.vehicleKey === `p:${andresId}|c1`)).toBe(true);
    const patch = patches.find((p) => p.vehicleKey === `p:${andresId}|c1`)?.patch;
    expect(patch?.brand).toBe('Toyota');
    expect(patch?.driverSourceKey).toBe(`p:${pamelaId}`);
  });
});

import {
  applyTransportPlanningAutoNormalization,
  sanitizeBautizosGroupTitularByGroupId,
} from '../transportPlanningCore.js';

describe('sanitizeBautizosGroupTitularByGroupId', () => {
  it('preserves manual group titular on auto-normalization', () => {
    const plan = {
      carGroups: [{ id: 'cg-1', memberKeys: ['p:a', 'p:b'], cars: 1 }],
      bautizosGroupTitularByGroupId: { 'cg-1': 'b' },
    };
    const cleaned = sanitizeBautizosGroupTitularByGroupId(plan, []);
    expect(cleaned['cg-1']).toBe('b');

    const normalized = applyTransportPlanningAutoNormalization(plan, {
      isBautizos: true,
      bautizosCarDisplayGroups: [],
    });
    expect(normalized.bautizosGroupTitularByGroupId['cg-1']).toBe('b');
  });
});

describe('manual group car meta inheritance detection', () => {
  const roster = [{ id: 'a1', name: 'Ana' }, { id: 'b1', name: 'Beto' }];

  it('detecta datos de carro solo en resumen (subcolección lazy)', () => {
    const plan = {
      carMetaBySource: {},
      bautizosCarMetaSummaryByTitular: {
        'p:a1': {
          cars: [{ carIndex: 1, maybeAbsent: false, vehicleFieldsComplete: true, hasPassengers: false }],
        },
      },
    };
    expect(titularSourceKeyHasCarMetaCaptured(plan, 'p:a1')).toBe(true);
    expect(titularSourceKeyHasCarMetaCaptured(plan, 'p:b1')).toBe(false);
  });

  it('listManualGroupTitularCarMetaSources solo incluye titulares con datos', () => {
    const plan = {
      carMetaBySource: {},
      bautizosCarMetaSummaryByTitular: {
        'p:a1': {
          cars: [{ carIndex: 1, maybeAbsent: false, vehiclePending: true, vehicleFieldsComplete: false }],
        },
      },
    };
    const sources = listManualGroupTitularCarMetaSources(plan, ['p:a1', 'p:b1'], roster);
    expect(sources).toHaveLength(1);
    expect(sources[0].titularSk).toBe('p:a1');
    expect(sources[0].preview).toMatch(/carro/i);
  });

  it('titularNeedsCarMetaHydration cuando solo hay resumen sin inline', () => {
    const plan = {
      carMetaBySource: {},
      bautizosCarMetaSummaryByTitular: {
        'p:a1': {
          cars: [{ carIndex: 1, vehicleFieldsComplete: true, maybeAbsent: false }],
        },
      },
    };
    expect(titularNeedsCarMetaHydration(plan, 'p:a1')).toBe(true);
  });

  it('materializeTitularCarMetaOnPlan escribe meta desde cache simulado', () => {
    const cache = {
      'p:a1|c1': {
        ownerSourceKey: 'p:a1',
        brand: 'Toyota',
        model: 'Corolla',
        color: 'Rojo',
        plates: 'ABC-1',
        driverSourceKey: 'p:a1',
        passengerSourceKeys: [],
      },
    };
    const plan = mergeCarMetaCacheIntoPlan({ carMetaBySource: {} }, cache);
    const { plan: materialized } = materializeTitularCarMetaOnPlan(plan, 'p:a1', 1);
    expect(materialized.carMetaBySource['p:a1|c1']?.brand).toBe('Toyota');
  });

  it('buildCopyTitularCarMetaPatches copia desde plan con cache mergeado', () => {
    const cache = {
      'p:a1|c1': {
        ownerSourceKey: 'p:a1',
        brand: 'Nissan',
        model: 'March',
        color: 'Azul',
        plates: 'XYZ-9',
        driverSourceKey: 'p:a1',
        passengerSourceKeys: [],
      },
    };
    const plan = mergeCarMetaCacheIntoPlan({ carMetaBySource: {} }, cache);
    const patches = buildCopyTitularCarMetaPatches(plan, 'p:a1', 'p:b1', 1);
    expect(patches).toHaveLength(1);
    expect(patches[0].vehicleKey).toBe('p:b1|c1');
    expect(patches[0].patch.brand).toBe('Nissan');
  });

  it('buildManualGroupOrphanCarMetaCleanup marca quizá no vaya en slots del titular huérfano', () => {
    const plan = mergeCarMetaCacheIntoPlan(
      { carMetaBySource: {} },
      {
        'p:b1|c1': {
          ownerSourceKey: 'p:b1',
          brand: 'Honda',
          model: 'Civic',
          driverSourceKey: 'p:b1',
          passengerSourceKeys: [],
        },
      }
    );
    const { patches } = buildManualGroupOrphanCarMetaCleanup(plan, ['p:b1'], 'maybeAbsent');
    expect(patches.some((p) => p.vehicleKey === 'p:b1|c1' && p.patch.maybeAbsent === true)).toBe(true);
  });
});

describe('draft host car meta helpers', () => {
  it('createBlankDraftCarVehicleMeta marca rubros como pendientes', () => {
    const meta = createBlankDraftCarVehicleMeta('p:draft-host');
    expect(meta.brand).toBe('');
    expect(meta.pendingBrand).toBe(true);
    expect(meta.pendingDriver).toBe(true);
    expect(meta.pendingPassengers).toBe(true);
  });

  it('stripDraftHostCarMetaFromPlan elimina claves de borrador', () => {
    const plan = {
      carMetaBySource: {
        'p:draft-host|c1': { brand: 'Chevrolet', model: 'Spark', color: 'Azul', plates: '123' },
        'p:real-id|c1': { brand: 'Ford', model: 'Focus', color: 'Rojo', plates: '456' },
      },
    };
    const stripped = stripDraftHostCarMetaFromPlan(plan);
    expect(stripped.carMetaBySource['p:draft-host|c1']).toBeUndefined();
    expect(stripped.carMetaBySource['p:real-id|c1']?.brand).toBe('Ford');

    const withBlank = buildBautizosFamilyCarInventory({
      hostPerson: { name: 'Nuevo', llegaEnCarro: true, carrosLlegada: 1 },
      companions: [],
      plan,
      hostSourceKey: 'p:draft-host',
      useBlankSlotMeta: true,
    });
    expect(withBlank[0].meta.brand).toBe('');
    expect(withBlank[0].meta.pendingBrand).toBe(true);
    expect(withBlank[0].meta.plates).toBe('');
  });

  it('buildMergedFamilyCarInventory con useBlankSlotMeta valida pendientes por defecto en nuevo registro', () => {
    const host = {
      name: 'Familia Test',
      llegaEnCarro: true,
      wantsBautizosTransport: 'Si',
      carrosLlegada: 1,
      bautizosCompanions: [{ name: 'Esposa', relationship: 'Esposa', llegaEnCarro: true }],
    };
    const withoutBlank = buildMergedFamilyCarInventory({
      hostPerson: host,
      companions: host.bautizosCompanions,
      plan: {},
      hostSourceKey: 'p:draft-host',
      draftMetaByVehicleKey: {},
      useBlankSlotMeta: false,
    });
    expect(getFamilyCarInventoryValidationIssues(withoutBlank, { hostPerson: host, companions: host.bautizosCompanions }).length).toBeGreaterThan(0);

    const withBlank = buildMergedFamilyCarInventory({
      hostPerson: host,
      companions: host.bautizosCompanions,
      plan: {},
      hostSourceKey: 'p:draft-host',
      draftMetaByVehicleKey: {},
      useBlankSlotMeta: true,
    });
    expect(
      getFamilyCarInventoryValidationIssues(withBlank, { hostPerson: host, companions: host.bautizosCompanions })
    ).toEqual([]);
  });
});
