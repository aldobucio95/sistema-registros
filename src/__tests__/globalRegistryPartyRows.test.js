import { describe, expect, it } from 'vitest';
import {
  buildGlobalRegistryPartyRowsFromTitulars,
  buildGlobalRegistryPartySections,
  countBautizosGlobalRegistryActivePartyRows,
  countBautizosGlobalRegistryActivePeople,
  countGlobalRegistryCoincidenceTotal,
  filterGlobalRegistryPartyRowsByParticipantFilters,
  globalRegistryPartyRowsToPersons,
  sortGlobalRegistryPartyRows,
  visibleBautizosActiveGlobalRegistryPartyRows,
  globalRegistryCompanionExportIdentityKey,
} from '../globalRegistryPartyRows.js';
import {
  participantMatchesBautizosTransportFilter,
  participantMatchesRegistrationStatusFilter,
} from '../rosterParticipantFilters.js';
import { bautizosLineGoesByCar } from '../bautizosParty.js';

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
          _companionWaitlistHostId: 'h1',
          _companionWaitlistHostName: 'Host Activo',
          name: 'En Espera Virtual',
          status: 'waitlist',
          location: '',
        },
      ],
      cancelledTitulars: [],
      rosterForPlan: [
        {
          id: 'h1',
          eventId: 'ev1',
          location: 'Sede A',
          status: 'active',
          name: 'Host Activo',
        },
      ],
    });
    expect(sections.waitlist).toHaveLength(1);
    expect(sections.waitlist[0].person.name).toBe('En Espera Virtual');
    expect(sections.waitlist[0].person.location).toBe('Sede A');
  });

  it('deduplicates companion listed under multiple titulars via canonical plan', () => {
    const sharedCompanion = { id: 'c1', name: 'Duplicado', relationship: 'Hermano' };
    const hostA = {
      id: 'hA',
      name: 'Host A',
      bautizosCompanions: [sharedCompanion],
    };
    const hostB = {
      id: 'hB',
      name: 'Host B',
      bautizosCompanions: [{ ...sharedCompanion, linkedCompanionSourceKey: 'c:hA::c1' }],
    };
    const rows = buildGlobalRegistryPartyRowsFromTitulars([hostA, hostB], [hostA, hostB]);
    expect(rows.filter((r) => r.key.startsWith('titular:'))).toHaveLength(2);
    expect(rows.filter((r) => r.isSubRegistration)).toHaveLength(1);
    expect(rows).toHaveLength(3);
  });

  it('deduplicates same companion name under two hosts without link (export identity)', () => {
    const ernestina = { id: 'c1', name: 'Ernestina Gonzalez', relationship: 'Hija' };
    const hostA = {
      id: 'hA',
      eventId: 'ev1',
      location: 'Norte',
      status: 'active',
      name: 'Host A',
      bautizosCompanions: [ernestina],
    };
    const hostB = {
      id: 'hB',
      eventId: 'ev1',
      location: 'Norte',
      status: 'active',
      name: 'Host B',
      bautizosCompanions: [{ ...ernestina, id: 'c2' }],
    };
    const rows = buildGlobalRegistryPartyRowsFromTitulars([hostA, hostB], [hostA, hostB]);
    const companionNames = globalRegistryPartyRowsToPersons(rows).filter(
      (p) => p.__globalRegistryCompanionRow
    );
    expect(companionNames).toHaveLength(1);
    expect(companionNames[0].name).toBe('Ernestina Gonzalez');
    expect(globalRegistryCompanionExportIdentityKey(companionNames[0])).toBe('name:norte:ernestina gonzalez');
  });

  it('includes waitlist companions under active titular with pending flag', () => {
    const host = {
      id: 'h1',
      eventId: 'ev1',
      location: 'Sede A',
      status: 'active',
      name: 'Titular',
      bautizosCompanions: [
        { id: 'c1', name: 'Acomp Activo', relationship: 'Hijo' },
        { id: 'c2', name: 'Acomp Espera', relationship: 'Hija', companionWaitlistPending: true },
      ],
    };
    const rows = buildGlobalRegistryPartyRowsFromTitulars([host], [host]);
    const waitRow = rows.find((r) => r.key.startsWith('wl-nested:'));
    expect(waitRow).toBeTruthy();
    expect(waitRow.person.name).toBe('Acomp Espera');
    expect(waitRow.person.__companionWaitlistPending).toBe(true);
    expect(waitRow.companionWaitlistPending).toBe(true);
    expect(rows.filter((r) => r.isSubRegistration)).toHaveLength(2);
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

  it('active count matches dashboard when waitlist roster would steal canonical companions', () => {
    const activeHost = {
      id: 'hActive',
      eventId: 'ev1',
      location: 'Sede A',
      status: 'active',
      name: 'Active Host',
      bautizosAttendanceType: 'Bautizado',
      bautizosCompanions: [{ id: 'c1', name: 'Shared Companion' }],
    };
    const waitlistHost = {
      id: 'hWait',
      eventId: 'ev1',
      location: 'Sede A',
      status: 'waitlist',
      name: 'Waitlist Host',
      bautizosAttendanceType: 'Bautizado',
      bautizosCompanions: [
        { id: 'c2', name: 'Shared Companion', linkedCompanionSourceKey: 'c:hActive::c1' },
      ],
    };
    const fullRoster = [activeHost, waitlistHost];
    const sections = buildGlobalRegistryPartySections({
      isBautizos: true,
      activeTitulars: [activeHost],
      waitlistRows: [waitlistHost],
      cancelledTitulars: [],
      rosterForPlan: fullRoster,
    });
    const dashboardCount = countBautizosGlobalRegistryActivePeople([activeHost], fullRoster);
    expect(dashboardCount).toBe(2);
    expect(countBautizosGlobalRegistryActivePartyRows(sections.active)).toBe(dashboardCount);
  });

  it('active party stats exclude companionWaitlistPending rows (same as dashboard total)', () => {
    const host = {
      id: 'h1',
      eventId: 'ev1',
      location: 'Sede A',
      status: 'active',
      name: 'Titular',
      bautizosAttendanceType: 'Bautizado',
      bautizosCompanions: [
        { id: 'c1', name: 'Acomp Activo' },
        { id: 'c2', name: 'Acomp Espera', companionWaitlistPending: true },
      ],
    };
    const rows = buildGlobalRegistryPartyRowsFromTitulars([host], [host], { section: 'active' });
    expect(rows).toHaveLength(3);
    expect(countBautizosGlobalRegistryActivePartyRows(rows)).toBe(2);
  });

  it('omits companion linked to cancelled titular from active host party rows', () => {
    const cancelledTitular = {
      id: 'canc1',
      eventId: 'ev1',
      location: 'Sede A',
      status: 'cancelled',
      name: 'Persona Cancelada',
      bautizosAttendanceType: 'Bautizado',
      cancelledFromLocation: 'Sede A',
    };
    const host = {
      id: 'h1',
      eventId: 'ev1',
      location: 'Sede A',
      status: 'active',
      name: 'Titular Activo',
      bautizosCompanions: [
        {
          id: 'c1',
          name: 'Persona Cancelada',
          linkedCompanionSourceKey: 'p:canc1',
          linkedRegistrantId: 'canc1',
        },
      ],
    };
    const roster = [host, cancelledTitular];
    const sections = buildGlobalRegistryPartySections({
      isBautizos: true,
      activeTitulars: [host],
      waitlistRows: [],
      cancelledTitulars: [cancelledTitular],
      rosterForPlan: roster,
    });
    const activeNames = sections.active.map((r) => r.person.name);
    expect(activeNames).toEqual(['Titular Activo']);
    expect(sections.cancelled.some((r) => r.person.name === 'Persona Cancelada')).toBe(true);
  });

  it('coincidence total with active filter excludes cancelled companions under active titular', () => {
    const host = {
      id: 'h1',
      eventId: 'ev1',
      location: 'Sede A',
      status: 'active',
      name: 'Titular Activo',
    };
    const activeRows = [
      { key: 'titular:h1', person: host, isSubRegistration: false },
      {
        key: 'nested:cancelled',
        person: {
          id: 'gr-companion:h1:c1',
          name: 'Persona Cancelada',
          status: 'cancelled',
          __globalRegistryCompanionRow: true,
        },
        isSubRegistration: true,
      },
      {
        key: 'nested:active',
        person: {
          id: 'gr-companion:h1:c2',
          name: 'Acomp Activo',
          status: 'active',
          __globalRegistryCompanionRow: true,
        },
        isSubRegistration: true,
      },
    ];
    expect(activeRows).toHaveLength(3);
    expect(visibleBautizosActiveGlobalRegistryPartyRows(activeRows)).toHaveLength(2);
    expect(countGlobalRegistryCoincidenceTotal({
      isBautizos: true,
      activeRows,
      waitlistRows: [],
      cancelledRows: [],
      filterRegistrationStatus: 'active',
    })).toBe(2);
  });

  it('per-person transport filter excludes car companion when titular uses evento transport', () => {
    const host = {
      id: 'h1',
      eventId: 'ev1',
      location: 'Norte',
      status: 'active',
      name: 'Titular Evento',
      wantsBautizosTransport: 'Si',
      llegaEnCarro: 'No',
      travelFrom: 'Norte',
      travelTo: 'Norte',
      bautizosCompanions: [
        {
          id: 'c1',
          name: 'Acomp Carro',
          wantsBautizosTransport: 'No',
          llegaEnCarro: 'Si',
          travelFrom: 'Norte',
          travelTo: 'Norte',
        },
      ],
    };
    const roster = [host];
    const partyRows = buildGlobalRegistryPartyRowsFromTitulars([host], roster);
    const filters = {
      filterRegistrationStatus: 'active',
      filterTransport: 'evento',
      searchTerm: '',
      sortBy: 'none',
    };
    const matchesPerson = (person) => {
      if (!participantMatchesRegistrationStatusFilter(person, filters.filterRegistrationStatus)) return false;
      return participantMatchesBautizosTransportFilter(person, filters.filterTransport, bautizosLineGoesByCar);
    };
    const filtered = filterGlobalRegistryPartyRowsByParticipantFilters(partyRows, matchesPerson);
    const visible = visibleBautizosActiveGlobalRegistryPartyRows(filtered);
    expect(visible).toHaveLength(1);
    expect(visible[0].person.name).toBe('Titular Evento');
    expect(
      countGlobalRegistryCoincidenceTotal({
        isBautizos: true,
        activeRows: visible,
        waitlistRows: [],
        cancelledRows: [],
        filterRegistrationStatus: 'active',
      })
    ).toBe(1);
  });
});
