import { describe, expect, it } from 'vitest';
import {
  buildDashboardNestedFilterCountsMap,
  getDashboardNestedFilterDimensions,
} from '../dashboardNestedFilterCounts.js';

describe('dashboardNestedFilterCounts', () => {
  it('getDashboardNestedFilterDimensions includes Bautizos-only filters', () => {
    const dims = getDashboardNestedFilterDimensions('Bautizos');
    const keys = dims.map((d) => d.key);
    expect(keys).toContain('filterBautizosAttendance');
    expect(keys).toContain('filterTransport');
    expect(keys).not.toContain('filterAssignment');
  });

  it('buildDashboardNestedFilterCountsMap returns counts for each option', () => {
    const pool = [
      { id: 'a', eventId: 'e1', status: 'active', location: 'Norte', name: 'Ana' },
      { id: 'b', eventId: 'e1', status: 'waitlist', location: 'Norte', name: 'Bob' },
    ];
    const filterParticipantRowsFn = (rows, _preserve, filters) => {
      if (filters.filterRegistrationStatus === 'active') {
        return rows.filter((p) => p.status === 'active');
      }
      if (filters.filterRegistrationStatus === 'waitlist') {
        return rows.filter((p) => p.status === 'waitlist');
      }
      return rows;
    };
    const map = buildDashboardNestedFilterCountsMap({
      eventType: 'Campa',
      event: { id: 'e1', eventType: 'Campa' },
      dashboardLocs: ['Norte'],
      data: { Norte: [pool[0]] },
      waitlistData: { Norte: [pool[1]] },
      cancelledData: {},
      globalRegistryListFilters: { filterRegistrationStatus: 'all' },
      filterParticipantRowsFn,
      canonicalCompanionPlan: new Map(),
      dashboardScope: 'all',
      allParticipants: pool,
    });
    expect(map.get('filterRegistrationStatus\0active')).toBe(1);
    expect(map.get('filterRegistrationStatus\0waitlist')).toBe(1);
    expect(map.get('filterRegistrationStatus\0all')).toBe(2);
  });
});
