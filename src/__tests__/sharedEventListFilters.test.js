import { describe, expect, it } from 'vitest';
import {
  createEmptyLocationRosterFilters,
  pickSharedEventListDropdownFilters,
  sharedEventListDropdownFiltersEqual,
} from '../userListFiltersPrefs.js';

describe('shared event list dropdown filters', () => {
  it('omits search, sort and payment method from shared pick', () => {
    const snap = {
      ...createEmptyLocationRosterFilters(),
      searchTerm: 'ana',
      sortBy: 'name-asc',
      filterRegistrationStatus: 'active',
      filterEventAttendance: 'attended',
      filterPaymentMethod: { efectivo: false, tarjeta: true },
    };
    const shared = pickSharedEventListDropdownFilters(snap);
    expect(shared.searchTerm).toBeUndefined();
    expect(shared.sortBy).toBeUndefined();
    expect(shared.filterPaymentMethod).toBeUndefined();
    expect(shared.filterRegistrationStatus).toBe('active');
    expect(shared.filterEventAttendance).toBe('attended');
  });

  it('compares shared snapshots ignoring search', () => {
    const a = { ...createEmptyLocationRosterFilters(), searchTerm: 'x', filterScholarship: 'becado' };
    const b = { ...createEmptyLocationRosterFilters(), searchTerm: 'y', filterScholarship: 'becado' };
    expect(sharedEventListDropdownFiltersEqual(a, b)).toBe(true);
  });
});
