import { describe, expect, it } from 'vitest';
import {
  buildBautizosCarSlotsForTransport,
  buildTransportCarContextForHost,
  familyHasAnyCarTransport,
} from '../bautizosCarMeta.js';

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

  it('titular solo en transporte del evento no requiere datos de carro', () => {
    const host = {
      llegaEnCarro: false,
      wantsBautizosTransport: 'Si',
      bautizosCompanions: [],
    };
    expect(familyHasAnyCarTransport(host, [])).toBe(false);
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
