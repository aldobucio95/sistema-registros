import { describe, expect, it } from 'vitest';
import {
  buildBautizosRosterIndex,
  createEmptyBautizosRosterIndex,
  getCompanionWaitlistVirtualFromIndex,
} from '../bautizosRosterIndex.js';
import { COMPANION_WAITLIST_PENDING } from '../bautizosCompanionWaitlist.js';

describe('bautizosRosterIndex', () => {
  it('returns empty index for non-Bautizos events', () => {
    const idx = buildBautizosRosterIndex([], { id: 'e1', eventType: 'Campa' });
    expect(idx.companionChipCountByRegistrant.size).toBe(0);
    expect(idx.eventId).toBe('');
  });

  it('indexes companion chip counts and waitlist virtual rows by location', () => {
    const event = { id: 'ev1', eventType: 'Bautizos', locations: ['Coapa'] };
    const host = {
      id: 'h1',
      eventId: 'ev1',
      status: 'active',
      location: 'Coapa',
      name: 'Titular',
      bautizosCompanions: [
        { id: 'c1', name: 'Ana', relationship: 'Hermana' },
        {
          id: 'c2',
          name: 'Luis',
          relationship: 'Primo',
          [COMPANION_WAITLIST_PENDING]: true,
        },
      ],
    };
    const idx = buildBautizosRosterIndex([host], event);
    expect(idx.companionChipCountByRegistrant.get('h1')).toBe(2);
    const virtual = getCompanionWaitlistVirtualFromIndex(idx, 'Coapa');
    expect(virtual).toHaveLength(1);
    expect(virtual[0].name).toBe('Luis');
  });

  it('createEmptyBautizosRosterIndex is stable', () => {
    const a = createEmptyBautizosRosterIndex();
    const b = createEmptyBautizosRosterIndex();
    expect(a.companionChipCountByRegistrant).toBe(b.companionChipCountByRegistrant);
  });
});
