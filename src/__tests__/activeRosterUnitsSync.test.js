import { describe, expect, it } from 'vitest';
import { hasFullEventRosterScope, planActiveRosterUnitsSync } from '../activeRosterUnitsSync.js';

const event = { id: 'ev1', eventType: 'Bautizos', locations: ['Norte', 'Sur'], activeRosterUnitsTotal: 1 };

describe('hasFullEventRosterScope', () => {
  it('admins always have full scope', () => {
    expect(hasFullEventRosterScope(event, ['Norte'], true)).toBe(true);
  });

  it('requires every event location in visible set', () => {
    expect(hasFullEventRosterScope(event, ['Norte', 'Sur'], false)).toBe(true);
    expect(hasFullEventRosterScope(event, ['Norte'], false)).toBe(false);
  });
});

describe('planActiveRosterUnitsSync', () => {
  it('syncs when stored total differs from computed roster units', () => {
    const participants = [
      {
        id: 't1',
        eventId: 'ev1',
        status: 'active',
        location: 'Norte',
        name: 'Titular',
        bautizosAttendanceType: 'bautizado',
        bautizosCompanions: [{ id: 'c1', name: 'Acomp' }],
      },
    ];
    const plan = planActiveRosterUnitsSync({
      event,
      participants,
      visibleLocations: ['Norte', 'Sur'],
      hasAdminRights: false,
    });
    expect(plan.shouldSync).toBe(true);
    expect(plan.computed).toBe(2);
    expect(plan.stored).toBe(1);
  });

  it('skips sync when user lacks full event scope', () => {
    const participants = [
      {
        id: 't1',
        eventId: 'ev1',
        status: 'active',
        location: 'Norte',
        name: 'Titular',
        bautizosAttendanceType: 'bautizado',
      },
    ];
    const plan = planActiveRosterUnitsSync({
      event,
      participants,
      visibleLocations: ['Norte'],
      hasAdminRights: false,
    });
    expect(plan.shouldSync).toBe(false);
  });
});
