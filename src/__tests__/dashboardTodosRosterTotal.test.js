import { describe, expect, it } from 'vitest';
import {
  computeDashboardTodosRosterTotal,
  computeEventCapUsedUnitsBySede,
} from '../dashboardTodosRosterTotal.js';

const event = { id: 'ev1', eventType: 'Bautizos', locations: ['Norte', 'Sur'] };

describe('computeDashboardTodosRosterTotal (Bautizos)', () => {
  it('does not count companions with companionWaitlistPending in active total', () => {
    const participants = [
      {
        id: 't1',
        eventId: 'ev1',
        status: 'active',
        location: 'Norte',
        name: 'Titular',
        bautizosAttendanceType: 'bautizado',
        bautizosCompanions: [
          { id: 'c1', name: 'Acomp 1', companionWaitlistPending: true },
          { id: 'c2', name: 'Acomp 2', companionWaitlistPending: true },
        ],
      },
    ];
    expect(computeDashboardTodosRosterTotal(participants, event)).toBe(1);
  });

  it('counts active companions without companionWaitlistPending', () => {
    const participants = [
      {
        id: 't1',
        eventId: 'ev1',
        status: 'active',
        location: 'Norte',
        name: 'Titular',
        bautizosAttendanceType: 'bautizado',
        bautizosCompanions: [
          { id: 'c1', name: 'Acomp activo' },
          { id: 'c2', name: 'Acomp pending', companionWaitlistPending: true },
        ],
      },
    ];
    expect(computeDashboardTodosRosterTotal(participants, event)).toBe(2);
  });
});

describe('computeEventCapUsedUnitsBySede (Bautizos)', () => {
  it('excludes companionWaitlistPending from sede cap used', () => {
    const participants = [
      {
        id: 't1',
        eventId: 'ev1',
        status: 'active',
        location: 'Norte',
        name: 'Titular',
        bautizosAttendanceType: 'bautizado',
        bautizosCompanions: [
          { id: 'c1', name: 'Acomp pending', companionWaitlistPending: true },
        ],
      },
    ];
    const bySede = computeEventCapUsedUnitsBySede(participants, event);
    expect(bySede.Norte).toBe(1);
    expect(bySede.Sur).toBe(0);
  });
});
