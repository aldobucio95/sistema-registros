import { describe, expect, it } from 'vitest';
import { BAUTIZOS_ATTENDANCE, normalizeBautizosAttendanceType } from '../bautizos/bautizosAttendance.js';
import {
  flattenBautizosParticipantsForRead,
  buildBautizadosListBaseRows,
  isLegacyBautizosParticipant,
} from '../bautizos/bautizosLegacyReadAdapter.js';
import { computeBautizosTodosTotal } from '../bautizos/bautizosCounts.js';
import { getBautizosIndividualListPrice } from '../bautizos/bautizosPricing.js';

const event = { eventType: 'Bautizos', bautizosListPriceFood: 100, bautizosListPriceTransport: 50 };

describe('bautizosLegacyReadAdapter', () => {
  it('detecta registro legado con companions', () => {
    expect(isLegacyBautizosParticipant({ bautizosCompanions: [{ name: 'Ana' }] })).toBe(true);
    expect(isLegacyBautizosParticipant({ bautizosAttendanceType: 'bautizado' })).toBe(false);
  });

  it('expande companions legados a filas planas', () => {
    const host = {
      id: 'host1',
      eventId: 'ev1',
      status: 'active',
      name: 'Titular',
      bautizosAttendanceType: BAUTIZOS_ATTENDANCE.asistente,
      bautizosCompanions: [
        { id: 'c1', name: 'Baut Ana', willBeBaptized: 'Si' },
        { id: 'c2', name: 'Acomp Luis', willBeBaptized: 'No' },
      ],
    };
    const flat = flattenBautizosParticipantsForRead([host]);
    expect(flat).toHaveLength(3);
    expect(flat.some((r) => r.id === 'virt-bautizado:host1:c1')).toBe(true);
    expect(flat.some((r) => r.id === 'virt-acompanante:host1:c2')).toBe(true);
  });

  it('dedupes virtual baptized companion rows when host appears twice', () => {
    const host = {
      id: 'id_VNPM-HEPK870225M',
      eventId: 'ev1',
      location: 'Norte',
      status: 'active',
      name: 'Titular',
      bautizosAttendanceType: BAUTIZOS_ATTENDANCE.asistente,
      bautizosCompanions: [{ id: 'bc-1', name: 'Acomp Bautizado', willBeBaptized: 'Si' }],
    };
    const rows = buildBautizadosListBaseRows([host, { ...host }], { eventType: 'Bautizos', eventId: 'ev1' });
    const virt = rows.filter((r) => String(r.id).startsWith('virt-bautizado:'));
    expect(virt).toHaveLength(1);
  });
});

describe('bautizosCounts', () => {
  it('cuenta 1 fila plana por persona', () => {
    const roster = [
      { id: 'a', bautizosAttendanceType: 'bautizado' },
      { id: 'b', bautizosAttendanceType: 'acompanante' },
    ];
    expect(computeBautizosTodosTotal(roster)).toBe(2);
  });
});

describe('bautizosPricing', () => {
  it('precio individual suma comida y transporte por flags', () => {
    const person = {
      bautizosAttendanceType: 'bautizado',
      wantsBautizosFood: 'Si',
      wantsBautizosTransport: 'Si',
      llegaEnCarro: 'No',
    };
    expect(getBautizosIndividualListPrice(person, event)).toBe(150);
  });

  it('normaliza tipo acompanante', () => {
    expect(normalizeBautizosAttendanceType('acompanante')).toBe(BAUTIZOS_ATTENDANCE.acompanante);
  });
});
