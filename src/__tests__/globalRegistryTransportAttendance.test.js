import { describe, expect, it } from 'vitest';
import {
  isRegistryPersonEventAttendanceConfirmed,
  participantMatchesEventAttendanceFilter,
  resolveTransportAttendanceSourceKeyForRegistryPerson,
} from '../globalRegistryTransportAttendance.js';
import { patchTransportAttendanceOnPlan } from '../transportPlanningCore.js';

describe('globalRegistryTransportAttendance', () => {
  const roster = [
    { id: 'p1', name: 'Ana', eventId: 'ev1' },
    {
      id: 'h1',
      name: 'Host',
      eventId: 'ev1',
      bautizosCompanions: [{ id: 'c1', name: 'Comp' }],
    },
  ];

  it('resolves titular source key as p:<id>', () => {
    expect(resolveTransportAttendanceSourceKeyForRegistryPerson(roster[0], roster, 'Campa')).toBe('p:p1');
  });

  it('resolves global registry companion row source key', () => {
    const row = {
      id: 'gr-companion:h1:c1',
      __globalRegistryCompanionRow: true,
      __hostRegistrantId: 'h1',
    };
    expect(resolveTransportAttendanceSourceKeyForRegistryPerson(row, roster, 'Bautizos')).toMatch(/^c:h1::/);
  });

  it('detects confirmed attendance from transport plan', () => {
    const plan = patchTransportAttendanceOnPlan(null, 'p:p1', true, 'admin');
    expect(isRegistryPersonEventAttendanceConfirmed(roster[0], plan, roster, 'Campa')).toBe(true);
  });

  it('filters by attended / not-attended', () => {
    const plan = patchTransportAttendanceOnPlan(null, 'p:p1', true, 'admin');
    const ctx = { roster, eventType: 'Campa' };
    expect(participantMatchesEventAttendanceFilter(roster[0], 'all', plan, ctx)).toBe(true);
    expect(participantMatchesEventAttendanceFilter(roster[0], 'attended', plan, ctx)).toBe(true);
    expect(participantMatchesEventAttendanceFilter(roster[0], 'not-attended', plan, ctx)).toBe(false);
    expect(participantMatchesEventAttendanceFilter(roster[1], 'not-attended', plan, ctx)).toBe(true);
  });

  it('syncs segmented Campa Ambos keys when patching attendance', () => {
    const sk = 'p:p1|Teens';
    const plan = patchTransportAttendanceOnPlan(null, sk, true, 'lector');
    expect(plan.transportAttendanceBySource['p:p1|Teens']?.confirmed).toBe(true);
    expect(plan.transportAttendanceBySource['p:p1']?.confirmed).toBe(true);
    const cleared = patchTransportAttendanceOnPlan(plan, sk, false, 'lector');
    expect(cleared.transportAttendanceBySource['p:p1']).toBeUndefined();
    expect(cleared.transportAttendanceBySource['p:p1|Teens']).toBeUndefined();
  });
});
