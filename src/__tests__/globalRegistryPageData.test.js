import { describe, expect, it } from 'vitest';
import { computeGlobalRegistryPageModel } from '../globalRegistryPageData.js';
import { initRegistryAttendancePlan } from '../registryAttendanceStore.js';

describe('computeGlobalRegistryPageModel', () => {
  it('builds party rows and attendance meta map', () => {
    initRegistryAttendancePlan({});
    const event = {
      id: 'evt1',
      eventType: 'Bautizos',
      locations: ['Sede A'],
    };
    const host = {
      id: 'h1',
      eventId: 'evt1',
      name: 'Titular',
      location: 'Sede A',
      status: 'active',
      bautizosCompanions: [],
    };
    const model = computeGlobalRegistryPageModel({
      currentEvent: event,
      allParticipants: [host],
      visibleLocations: ['Sede A'],
      globalLocationFilters: [],
      globalRegistryListFilters: { sortBy: 'registered-desc', filterRegistrationStatus: 'all' },
      data: { 'Sede A': [host] },
      cancelledData: { 'Sede A': [] },
      getSortedWaitlistForLocation: () => [],
      filterParticipantRows: (rows) => rows,
      resolveParticipantEffectiveLocation: (p) => p.location,
      isBautizos: true,
      getDebt: () => 0,
    });
    expect(model?.activeRowsVisible?.length).toBe(1);
    expect(model?.globalRegistryActiveCount).toBe(1);
  });
});
