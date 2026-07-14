import { describe, expect, it } from 'vitest';
import { BAUTIZOS_ATTENDANCE, buildBautizadosListBaseRows } from '../bautizosParty.js';

describe('buildBautizadosListBaseRows', () => {
  it('dedupes virtual baptized companion rows when the host appears twice in roster', () => {
    const host = {
      id: 'id_VNPM-HEPK870225M',
      eventId: 'ev1',
      location: 'Norte',
      status: 'active',
      name: 'Titular',
      bautizosAttendanceType: BAUTIZOS_ATTENDANCE.asistente,
      bautizosCompanions: [
        {
          id: 'bc-1780253519079-da46lt6',
          name: 'Acomp Bautizado',
          willBeBaptized: 'Si',
        },
      ],
    };
    const roster = [host, { ...host }];
    const rows = buildBautizadosListBaseRows(roster, { eventType: 'Bautizos', eventId: 'ev1' });
    const virt = rows.filter((r) => String(r.id).startsWith('virt-bautizado:'));
    expect(virt).toHaveLength(1);
    expect(virt[0].id).toBe('virt-bautizado:id_VNPM-HEPK870225M:bc-1780253519079-da46lt6');
  });

  it('omits virtual row when companion already has own bautizado registration', () => {
    const registrant = {
      id: 'id_VNPM-BAUT01',
      eventId: 'ev1',
      location: 'Norte',
      status: 'active',
      name: 'Ya Registrado',
      bautizosAttendanceType: BAUTIZOS_ATTENDANCE.bautizado,
    };
    const host = {
      id: 'id_VNPM-HOST01',
      eventId: 'ev1',
      location: 'Norte',
      status: 'active',
      name: 'Titular',
      bautizosAttendanceType: BAUTIZOS_ATTENDANCE.asistente,
      bautizosCompanions: [
        {
          id: 'bc-1',
          name: 'Ya Registrado',
          willBeBaptized: 'Si',
          vnpPersonId: 'id_VNPM-BAUT01',
        },
      ],
    };
    const rows = buildBautizadosListBaseRows([host, registrant], {
      eventType: 'Bautizos',
      eventId: 'ev1',
    });
    expect(rows.some((r) => r.id === 'id_VNPM-BAUT01')).toBe(true);
    expect(rows.some((r) => String(r.id).startsWith('virt-bautizado:'))).toBe(false);
  });
});
