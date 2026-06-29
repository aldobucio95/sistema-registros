import { describe, expect, it } from 'vitest';
import {
  buildGlobalRegistryPartyRowsFromTitulars,
  buildGlobalRegistryPartySections,
  globalRegistryPartyRowsToPersons,
  sortGlobalRegistryPartyRows,
} from '../globalRegistryPartyRows.js';

describe('globalRegistryPartyRows', () => {
  it('lists titular plus nested companions without duplicates', () => {
    const host = {
      id: 'h1',
      eventId: 'ev1',
      location: 'Sede A',
      status: 'active',
      name: 'Titular',
      bautizosCompanions: [
        { id: 'c1', name: 'Acomp 1', relationship: 'Hijo' },
        { id: 'c2', name: 'Acomp 2', relationship: 'Hija' },
        { id: 'c3', name: 'Acomp 3' },
      ],
    };
    const rows = buildGlobalRegistryPartyRowsFromTitulars([host], [host]);
    expect(rows).toHaveLength(4);
    expect(rows[0].person.id).toBe('h1');
    expect(rows[0].isSubRegistration).toBe(false);
    expect(rows[1].isSubRegistration).toBe(true);
    expect(rows[1].person.name).toBe('Acomp 1');
    expect(globalRegistryPartyRowsToPersons(rows)).toHaveLength(4);
  });

  it('omits baptized companion nested when they are also a titular registrant', () => {
    const baptizedTitular = {
      id: 'bt1',
      eventId: 'ev1',
      location: 'Sede A',
      status: 'active',
      name: 'Job Murguía',
      bautizosAttendanceType: 'Bautizado',
    };
    const host = {
      id: 'h1',
      eventId: 'ev1',
      location: 'Sede A',
      status: 'active',
      name: 'Bolívar',
      bautizosCompanions: [
        {
          id: 'c1',
          name: 'Job Murguía',
          linkedCompanionSourceKey: 'p:bt1',
          willBeBaptized: 'Si',
        },
        { id: 'c2', name: 'Otro Acomp' },
      ],
    };
    const roster = [host, baptizedTitular];
    const rows = buildGlobalRegistryPartyRowsFromTitulars([host], roster);
    const names = globalRegistryPartyRowsToPersons(rows).map((p) => p.name);
    expect(names).toEqual(['Bolívar', 'Otro Acomp']);
    expect(names).not.toContain('Job Murguía');
  });

  it('shows baptized companion as standalone row, not nested under titular', () => {
    const host = {
      id: 'h1',
      eventId: 'ev1',
      location: 'Sede A',
      status: 'active',
      name: 'Titular',
      bautizosCompanions: [
        { id: 'c1', name: 'Bautizado Sin Registro', willBeBaptized: 'Si' },
        { id: 'c2', name: 'Acomp Normal' },
      ],
    };
    const rows = buildGlobalRegistryPartyRowsFromTitulars([host], [host]);
    expect(rows).toHaveLength(3);
    expect(rows[1].person.name).toBe('Acomp Normal');
    expect(rows[1].isSubRegistration).toBe(true);
    expect(rows[2].person.name).toBe('Bautizado Sin Registro');
    expect(rows[2].isSubRegistration).toBe(false);
  });

  it('buildGlobalRegistryPartySections keeps waitlist virtual rows separate', () => {
    const sections = buildGlobalRegistryPartySections({
      isBautizos: true,
      activeTitulars: [],
      waitlistRows: [
        {
          id: 'cw:h1::c1',
          _isCompanionWaitlistVirtual: true,
          _companionWaitlistHostName: 'Host Activo',
          name: 'En Espera Virtual',
          status: 'waitlist',
          location: 'Sede A',
        },
      ],
      cancelledTitulars: [],
      rosterForPlan: [],
    });
    expect(sections.waitlist).toHaveLength(1);
    expect(sections.waitlist[0].person.name).toBe('En Espera Virtual');
  });

  it('sortGlobalRegistryPartyRows keeps companion blocks under titular when sorting by name', () => {
    const hostA = {
      id: 'hA',
      name: 'Zeta',
      registeredAt: '2024-01-02',
      bautizosCompanions: [{ id: 'cA', name: 'Hijo Zeta' }],
    };
    const hostB = {
      id: 'hB',
      name: 'Alpha',
      registeredAt: '2024-01-01',
      bautizosCompanions: [{ id: 'cB', name: 'Hijo Alpha' }],
    };
    const rows = buildGlobalRegistryPartyRowsFromTitulars([hostA, hostB], [hostA, hostB]);
    const sorted = sortGlobalRegistryPartyRows(rows, 'name-asc');
    const names = sorted.map((r) => r.person.name);
    expect(names).toEqual(['Alpha', 'Hijo Alpha', 'Zeta', 'Hijo Zeta']);
  });
});
