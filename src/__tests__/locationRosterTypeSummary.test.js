import { describe, expect, it } from 'vitest';
import {
  getLocationRosterSectionCountsFromSummary,
  aggregateLocationRosterSectionCountsForLocations,
} from '../locationRosterTypeSummary.js';

describe('getLocationRosterSectionCountsFromSummary', () => {
  it('extrae totales por sección del resumen canónico', () => {
    const summary = {
      sections: [
        { id: 'active', totalInscritos: 12 },
        { id: 'waitlist', totalInscritos: 3 },
        { id: 'cancelled', totalInscritos: 2 },
      ],
    };
    expect(getLocationRosterSectionCountsFromSummary(summary)).toEqual({
      active: 12,
      waitlist: 3,
      cancelled: 2,
    });
  });

  it('devuelve ceros si faltan secciones', () => {
    expect(getLocationRosterSectionCountsFromSummary({ sections: [] })).toEqual({
      active: 0,
      waitlist: 0,
      cancelled: 0,
    });
  });

  it('incluye acompañantes en totalInscritos (no solo titulares)', () => {
    const summary = {
      sections: [{ id: 'active', totalInscritos: 5 }],
    };
    expect(getLocationRosterSectionCountsFromSummary(summary).active).toBe(5);
  });
});

describe('aggregateLocationRosterSectionCountsForLocations', () => {
  it('suma conteos canónicos de varias sedes', () => {
    const event = { id: 'ev1', eventType: 'General', locations: ['A', 'B'] };
    const counts = aggregateLocationRosterSectionCountsForLocations({
      locations: ['A', 'B'],
      event,
      allParticipants: [],
      activeTitularParticipantsByLocation: { A: [{ id: '1' }, { id: '2' }], B: [{ id: '3' }] },
      waitlistParticipantsByLocation: { A: [{ id: 'w1' }], B: [] },
      cancelledParticipantsByLocation: { A: [], B: [{ id: 'c1' }] },
    });
    expect(counts).toEqual({ active: 3, waitlist: 1, cancelled: 1 });
  });
});
