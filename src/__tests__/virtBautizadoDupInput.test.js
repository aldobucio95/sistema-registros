import { describe, expect, it } from 'vitest';
import { expandBautizosGlobalRegistryRows } from '../bautizosParty.js';

describe('virt-bautizado input dedupe', () => {
  const host = {
    id: 'id_VNPM-GASA951008M',
    eventId: 'ev1',
    location: 'Sede A',
    status: 'active',
    name: 'Titular',
    bautizosAttendanceType: 'Asistente',
    bautizosCompanions: [
      { id: 'bc-1777228939428-1kphknf', name: 'Acomp Bautizado', willBeBaptized: 'Si' },
    ],
  };
  const virtId = 'virt-bautizado:id_VNPM-GASA951008M:bc-1777228939428-1kphknf';
  const virt = {
    id: virtId,
    name: 'Acomp Bautizado',
    __globalRegistryVirtual: true,
    __virtualKind: 'companionBaptized',
  };

  it('dedupes duplicate virt-bautizado rows already in titular input', () => {
    const rows = expandBautizosGlobalRegistryRows([virt, virt], [host]);
    expect(rows.filter((r) => r.id === virtId)).toHaveLength(1);
  });

  it('dedupes host + pre-expanded virt without duplicating', () => {
    const rows = expandBautizosGlobalRegistryRows([host, virt], [host]);
    expect(rows.filter((r) => r.id === virtId)).toHaveLength(1);
    expect(rows.filter((r) => r.id === host.id)).toHaveLength(1);
  });
});
