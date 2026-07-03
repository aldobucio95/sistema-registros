import { describe, expect, it } from 'vitest';
import {
  expandBautizosGlobalRegistryRows,
  expandBautizosGlobalRegistryActivosDisplayRows,
} from '../bautizosParty.js';
import {
  expandBautizosWaitlistRegistryRows,
  expandBautizosWaitlistRegistryDisplayRows,
} from '../bautizosWaitlistRegistryExpand.js';
import { prepareBautizosRowsForRosterFilter } from '../rosterParticipantFilters.js';

const ev = { id: 'ev1', eventType: 'Bautizos', locations: ['Sede A'] };

describe('global registry display rows', () => {
  it('activos display omits canonical companion virtual rows', () => {
    const host = {
      id: 'h1',
      eventId: 'ev1',
      location: 'Sede A',
      status: 'active',
      name: 'Titular',
      bautizosCompanions: [{ id: 'c1', name: 'Acomp No Bautizado' }],
    };
    const roster = [host];
    const full = expandBautizosGlobalRegistryRows([host], roster);
    const display = expandBautizosGlobalRegistryActivosDisplayRows([host], roster);
    expect(full.length).toBeGreaterThan(display.length);
    expect(display).toHaveLength(1);
    expect(display[0].id).toBe('h1');
  });

  it('waitlist display keeps titulars and companion-waitlist virtual rows only', () => {
    const waitHost = {
      id: 'w1',
      eventId: 'ev1',
      location: 'Sede A',
      status: 'waitlist',
      name: 'En espera',
      bautizosCompanions: [{ id: 'cw1', name: 'Acomp del waitlist' }],
    };
    const activeHost = {
      id: 'a1',
      eventId: 'ev1',
      location: 'Sede A',
      status: 'active',
      name: 'Activo',
      bautizosCompanions: [
        { id: 'cp1', name: 'Acomp pending', companionWaitlistPending: true },
      ],
    };
    const roster = [waitHost, activeHost];
    const canonical = expandBautizosWaitlistRegistryRows([waitHost], roster, ev);
    const display = expandBautizosWaitlistRegistryDisplayRows([waitHost], roster, ev, ['Sede A']);
    expect(canonical.length).toBeGreaterThan(display.length);
    expect(display.some((r) => r.id === 'w1')).toBe(true);
    expect(display.some((r) => String(r.id).startsWith('cw:'))).toBe(true);
    expect(display.filter((r) => r.__globalRegistryVirtual).length).toBe(0);
    const virtual = display.find((r) => String(r.id).startsWith('cw:'));
    expect(virtual?.location).toBe('Sede A');
  });

  it('waitlist expansion Part B injects companion-waitlist rows even when titular waitlist input is empty', () => {
    const activeHost = {
      id: 'a1',
      eventId: 'ev1',
      location: 'Norte',
      status: 'active',
      name: 'Titular activo',
      bautizosCompanions: [
        { id: 'cp1', name: 'Acomp en espera', companionWaitlistPending: true },
      ],
    };
    const roster = [activeHost];
    const expanded = expandBautizosWaitlistRegistryRows([], roster, ev);
    expect(expanded).toHaveLength(1);
    expect(String(expanded[0].id)).toMatch(/^cw:/);
    expect(expanded[0].location).toBe('Norte');

    const filteredAll = prepareBautizosRowsForRosterFilter([], { filterRegistrationStatus: 'all' }, {
      roster,
    });
    expect(filteredAll.some((r) => String(r.id).startsWith('cw:'))).toBe(true);
  });
});
