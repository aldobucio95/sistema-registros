import { describe, expect, it } from 'vitest';
import { getLocationRosterSectionCountsFromSummary } from '../locationRosterTypeSummary.js';

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
