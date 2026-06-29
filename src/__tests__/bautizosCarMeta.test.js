import { describe, expect, it } from 'vitest';
import { familyHasAnyCarTransport } from '../bautizosCarMeta.js';

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
