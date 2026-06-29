import { describe, expect, it } from 'vitest';
import { computeBautizosRosterStatusCountsForLocation } from '../rosterCanonicalCounts.js';

const event = { id: 'ev1', eventType: 'Bautizos', locations: ['Norte'] };

describe('computeBautizosRosterStatusCountsForLocation', () => {
  it('cuenta titular + acompañante en activos (canónico)', () => {
    const allParticipants = [
      {
        id: 't1',
        eventId: 'ev1',
        status: 'active',
        location: 'Norte',
        name: 'Titular',
        bautizosAttendanceType: 'bautizado',
        bautizosCompanions: [
          { id: 'c1', name: 'Acompañante', relationship: 'Esposa', willBeBaptized: 'No' },
        ],
      },
    ];
    const counts = computeBautizosRosterStatusCountsForLocation(allParticipants, event, 'Norte');
    expect(counts.active).toBe(2);
  });

  it('lista de espera expandida incluye acompañantes', () => {
    const allParticipants = [
      {
        id: 'w1',
        eventId: 'ev1',
        status: 'waitlist',
        location: 'Norte',
        name: 'Becado',
        bautizosCompanions: [
          { id: 'c2', name: 'Hijo', relationship: 'Hijo', willBeBaptized: 'Si' },
        ],
      },
    ];
    const counts = computeBautizosRosterStatusCountsForLocation(allParticipants, event, 'Norte');
    expect(counts.waitlist).toBe(2);
  });

  it('devuelve ceros para evento no Bautizos', () => {
    const counts = computeBautizosRosterStatusCountsForLocation([], { id: 'x', eventType: 'Campa' }, 'Norte');
    expect(counts).toEqual({ active: 0, waitlist: 0, cancelled: 0, all: 0 });
  });
});
