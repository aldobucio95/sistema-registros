import { locationPrefsKey } from '../userListFiltersPrefs.js';

/** Id HTML válido y estable para inputs de filtros de lista por sede. */
export function rosterFilterFieldId(loc, filterKey, optionValue) {
  const l = locationPrefsKey(loc).replace(/%/g, '');
  const g = String(filterKey).replace(/[^a-zA-Z0-9_-]/g, '_');
  const v = String(optionValue).replace(/[^a-zA-Z0-9_-]/g, '_');
  return `rf-${l}-${g}-${v}`;
}

export function rosterSearchFieldId(loc) {
  return `roster-search-${locationPrefsKey(loc).replace(/%/g, '')}`;
}

export function globalRegistrySearchFieldId(eventId) {
  const e = String(eventId || 'event').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `global-registry-search-${e}`;
}

export const ACTIVITY_LOG_SEARCH_FIELD_ID = 'vnpm-activity-log-search';
export const EXPENSE_LIST_SEARCH_FIELD_ID = 'vnpm-expense-list-search';
export const USERS_PANEL_SEARCH_FIELD_ID = 'vnpm-users-panel-search';

export function globalRegistryFilterFieldId(eventId, filterKey, optionValue) {
  const e = String(eventId || 'event').replace(/[^a-zA-Z0-9_-]/g, '_');
  const g = String(filterKey).replace(/[^a-zA-Z0-9_-]/g, '_');
  const v = String(optionValue).replace(/[^a-zA-Z0-9_-]/g, '_');
  return `grf-${e}-${g}-${v}`;
}
