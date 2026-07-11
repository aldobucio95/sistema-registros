import { describe, expect, it } from 'vitest';
import { buildTransportAttendanceMapFirestorePatch, eventsEqualExceptTransportAttendanceMap, normalizeTransportPlanning } from '../transportPlanningCore.js';
import {
  getRegistryAttendancePlanSnapshot,
  initRegistryAttendancePlan,
  patchRegistryAttendancePlan,
} from '../registryAttendanceStore.js';

describe('registryAttendanceStore', () => {
  it('patchRegistryAttendancePlan updates snapshot without external state', () => {
    initRegistryAttendancePlan({});
    patchRegistryAttendancePlan('p:a', true, 'staff');
    expect(getRegistryAttendancePlanSnapshot().transportAttendanceBySource['p:a']?.confirmed).toBe(true);
  });
});

describe('buildTransportAttendanceMapFirestorePatch', () => {
  it('emits only changed attendance keys', () => {
    const remote = normalizeTransportPlanning({
      transportAttendanceBySource: { 'p:a': { confirmed: true, confirmedAt: 't', confirmedBy: 'x' } },
    });
    const local = normalizeTransportPlanning({
      transportAttendanceBySource: {
        'p:a': { confirmed: true, confirmedAt: 't', confirmedBy: 'x' },
        'p:b': { confirmed: true, confirmedAt: 't2', confirmedBy: 'y' },
      },
    });
    const entries = buildTransportAttendanceMapFirestorePatch(local, remote);
    expect(entries).toHaveLength(1);
    expect(entries[0].segments).toEqual(['transportPlanning', 'transportAttendanceBySource', 'p:b']);
  });
});

describe('eventsEqualExceptTransportAttendanceMap', () => {
  it('returns true when only attendance map differs', () => {
    const base = { id: 'e1', name: 'Ev', transportPlanning: { busGroups: [] } };
    const prev = {
      ...base,
      transportPlanning: {
        busGroups: [],
        transportAttendanceBySource: { 'p:a': { confirmed: false } },
      },
    };
    const next = {
      ...base,
      transportPlanning: {
        busGroups: [],
        transportAttendanceBySource: { 'p:a': { confirmed: true, confirmedAt: 't', confirmedBy: 'x' } },
      },
    };
    expect(eventsEqualExceptTransportAttendanceMap(prev, next)).toBe(true);
  });

  it('returns false when other event fields differ', () => {
    const prev = { id: 'e1', name: 'A', transportPlanning: {} };
    const next = { id: 'e1', name: 'B', transportPlanning: {} };
    expect(eventsEqualExceptTransportAttendanceMap(prev, next)).toBe(false);
  });
});
