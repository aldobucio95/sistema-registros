import { buildBautizosEventWideFilterCountPools } from './bautizosDashboardLocationStats.js';
import {
  BAUTIZOS_AGE_FILTER_OPTIONS,
  BAUTIZOS_ATTENDANCE_FILTER_OPTIONS,
  BAUTIZOS_TRANSPORT_FILTER_OPTIONS,
  EVENT_ATTENDANCE_FILTER_OPTIONS,
  REGISTRATION_STATUS_FILTER_OPTIONS,
} from './rosterParticipantFilters.js';
import { listFiltersForEventApplication } from './userListFiltersPrefs.js';

const LIQUIDATION_FILTER_OPTIONS = Object.freeze([
  { id: 'all' },
  { id: 'liquidado' },
  { id: 'pendiente' },
  { id: 'saldo-favor' },
]);

const CAMPA_ASSIGNMENT_OPTIONS = Object.freeze(['all', 'Teens', 'Jóvenes', 'Ambos']);

const CAMPA_ROSTER_ROLE_OPTIONS = Object.freeze([
  { id: 'all' },
  { id: 'camperos' },
  { id: 'servidor-teens' },
  { id: 'servidor-jovenes' },
  { id: 'servidor-ambos' },
]);

const CAMPA_SCHOLARSHIP_OPTIONS = Object.freeze([
  { id: 'all' },
  { id: 'becado' },
  { id: 'No' },
  { id: 'partial' },
  { id: 'total' },
]);

const CAMPA_BAPTISM_OPTIONS = Object.freeze([
  { id: 'all' },
  { id: 'teens' },
  { id: 'jovenes' },
  { id: 'no' },
]);

/** Dimensiones del dropdown «Visualización de Datos Generales» (conteos por opción). */
export function getDashboardNestedFilterDimensions(eventType) {
  const dims = [
    { key: 'filterRegistrationStatus', values: REGISTRATION_STATUS_FILTER_OPTIONS.map((o) => o.id) },
    { key: 'filterEventAttendance', values: EVENT_ATTENDANCE_FILTER_OPTIONS.map((o) => o.id) },
    { key: 'filterLiquidation', values: LIQUIDATION_FILTER_OPTIONS.map((o) => o.id) },
  ];
  if (eventType === 'Campa') {
    dims.push(
      { key: 'filterAssignment', values: CAMPA_ASSIGNMENT_OPTIONS },
      { key: 'filterRosterRole', values: CAMPA_ROSTER_ROLE_OPTIONS.map((o) => o.id) },
      { key: 'filterScholarship', values: CAMPA_SCHOLARSHIP_OPTIONS.map((o) => o.id) },
      { key: 'filterBaptism', values: CAMPA_BAPTISM_OPTIONS.map((o) => o.id) }
    );
  }
  if (eventType === 'Bautizos') {
    dims.push(
      { key: 'filterBautizosAttendance', values: BAUTIZOS_ATTENDANCE_FILTER_OPTIONS.map((o) => o.id) },
      { key: 'filterTransport', values: BAUTIZOS_TRANSPORT_FILTER_OPTIONS.map((o) => o.id) },
      { key: 'filterAge', values: BAUTIZOS_AGE_FILTER_OPTIONS.map((o) => o.id) }
    );
  }
  return dims;
}

function countBautizosOptionFromPools(ctx, hypotheticalFilters, pools) {
  const regStatus = String(hypotheticalFilters.filterRegistrationStatus || 'all').trim();
  if (regStatus === 'active') {
    return ctx.filterParticipantRowsFn(pools.activePool, true, hypotheticalFilters, {
      expandBautizosCompanions: false,
    }).length;
  }
  if (regStatus === 'waitlist') {
    return ctx.filterParticipantRowsFn(pools.waitlistPool, true, hypotheticalFilters, {
      expandBautizosCompanions: true,
    }).length;
  }
  if (regStatus === 'cancelled') {
    return ctx.filterParticipantRowsFn(pools.cancelledPool, true, hypotheticalFilters, {
      expandBautizosCompanions: true,
    }).length;
  }
  return ctx.filterParticipantRowsFn(pools.allPool, true, hypotheticalFilters, {
    expandBautizosCompanions: true,
  }).length;
}

function countDashboardNestedFilterOption(ctx, filterKey, optionValue, sharedPools) {
  const hypotheticalFilters = {
    ...listFiltersForEventApplication(ctx.globalRegistryListFilters, ctx.eventType),
    [filterKey]: optionValue,
    searchTerm: '',
    sortBy: 'none',
  };
  if (ctx.eventType === 'Bautizos') {
    return countBautizosOptionFromPools(ctx, hypotheticalFilters, sharedPools);
  }
  return ctx.filterParticipantRowsFn(sharedPools.campaPool, true, hypotheticalFilters, {
    expandBautizosCompanions: false,
  }).length;
}

/**
 * Precalcula todos los conteos del dropdown de filtros del dashboard (pools compartidos por apertura).
 */
export function buildDashboardNestedFilterCountsMap(ctx) {
  const map = new Map();
  const dimensions = getDashboardNestedFilterDimensions(ctx.eventType);
  const sharedPools =
    ctx.eventType === 'Bautizos'
      ? buildBautizosEventWideFilterCountPools(ctx)
      : {
          campaPool: ctx.dashboardLocs.flatMap((l) => [
            ...(ctx.data[l] || []),
            ...(ctx.waitlistData[l] || []),
            ...(ctx.cancelledData[l] || []),
          ]),
        };
  for (const { key, values } of dimensions) {
    for (const value of values) {
      map.set(`${key}\0${value}`, countDashboardNestedFilterOption(ctx, key, value, sharedPools));
    }
  }
  return map;
}
