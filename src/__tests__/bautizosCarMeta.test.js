import { describe, expect, it } from 'vitest';
import {
  buildBautizosCarSlotsForTransport,
  buildCarDataSummaryForRosterPerson,
  buildTransportCarContextForHost,
  familyHasAnyCarTransport,
  resolveBautizosCarDataAnchor,
} from '../bautizosCarMeta.js';
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
