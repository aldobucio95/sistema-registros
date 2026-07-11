import { describe, expect, it } from 'vitest';
import { buildGlobalRegistryFilteredPartyPersons } from '../globalRegistryExportRows.js';
import { countBautizosActivePeopleUnits } from '../bautizosParty.js';

const event = { id: 'ev1', eventType: 'Bautizos', locations: ['Sede A'] };

describe('buildGlobalRegistryFilteredPartyPersons', () => {
  it('export activos count matches dashboard units (excludes companionWaitlistPending)', () => {
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
    const allParticipants = [host];
    const persons = buildGlobalRegistryFilteredPartyPersons({
      event,
      allParticipants,
      visibleLocations: ['Sede A'],
      globalLocationFilters: [],
      activeByLocation: { 'Sede A': [host] },
      waitlistByLocation: {},
      cancelledByLocation: {},
      globalRegistryListFilters: { searchTerm: '', sortBy: 'registered-desc' },
      filterParticipantRows: (rows) => rows,
      getSortedWaitlistForLocation: () => [],
      getDebt: () => 0,
      isBautizos: true,
    });
    const activeLike = persons.filter(
      (p) =>
        !p.__companionWaitlistPending &&
        (p.__globalRegistryCompanionRow || (p.status || 'active') === 'active')
    );
    const waitlistCompanion = persons.filter((p) => p.__companionWaitlistPending === true);
    expect(waitlistCompanion).toHaveLength(1);
    expect(countBautizosActivePeopleUnits([host])).toBe(2);
    expect(activeLike).toHaveLength(2);
  });

  it('export labels companion under cancelled host as Cancelado, not Acompañante', () => {
    const host = {
      id: 'h1',
      eventId: 'ev1',
      location: 'Sede A',
      status: 'cancelled',
      name: 'Titular Cancelado',
      cancelledFromLocation: 'Sede A',
      bautizosCompanions: [{ id: 'c1', name: 'Acomp del cancelado' }],
    };
    const persons = buildGlobalRegistryFilteredPartyPersons({
      event,
      allParticipants: [host],
      visibleLocations: ['Sede A'],
      globalLocationFilters: [],
      activeByLocation: { 'Sede A': [] },
      waitlistByLocation: {},
      cancelledByLocation: { 'Sede A': [host] },
      globalRegistryListFilters: { searchTerm: '', sortBy: 'registered-desc' },
      filterParticipantRows: (rows) => rows,
      getSortedWaitlistForLocation: () => [],
      getDebt: () => 0,
      isBautizos: true,
    });
    const companion = persons.find((p) => p.name === 'Acomp del cancelado');
    expect(companion).toBeTruthy();
    expect(companion.status).toBe('cancelled');
  });
});
