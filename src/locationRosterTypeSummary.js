import { SERVICE_OPTIONS } from './appConstants.js';
import {
  BAUTIZOS_ATTENDANCE,
  GLOBAL_REGISTRY_VIRTUAL_KIND,
  normalizeBautizosAttendanceType,
  isBautizosCompanionBaptized,
  buildBautizosCanonicalCompanionPlan,
  buildActiveRegistrantMetaForCompanionDedupe,
  bautizosDashboardCompanionCountsForScope,
  bautizosDashboardTitularCountsForScope,
  participantHasBaptismChip,
} from './bautizosParty.js';
import { getAutoPaymentServiceForPublic } from './publicRegistrationLogic.js';
import {
  computeBautizosDashboardActiveStatsForLocation,
  dashboardActiveStatsToLocationTypeTotals,
} from './bautizosDashboardLocationStats.js';
import {
  bautizosExpandedRowsToTypeTotals,
  getBautizosCancelledExpandedRowsAtLocation,
  getBautizosWaitlistExpandedRowsAtLocation,
} from './rosterCanonicalCounts.js';

/** Filas del resumen por tipo (Bautizos). */
export const LOCATION_ROSTER_TYPE_ROWS = Object.freeze([
  { id: 'bautizado', label: 'Bautizados', short: 'Baut.' },
  { id: 'acompanante', label: 'Acompañantes', short: 'Acomp.' },
  { id: 'asistente', label: 'Asistentes', short: 'Asist.' },
  { id: 'servidor', label: 'Servidores', short: 'Serv.' },
  { id: 'empleado', label: 'Empleados', short: 'Emp.' },
  { id: 'cortesia', label: 'Cortesías', short: 'Cort.' },
]);

function emptyTypeCounts() {
  return Object.fromEntries(LOCATION_ROSTER_TYPE_ROWS.map((r) => [r.id, 0]));
}

function parseRegisteredMs(raw) {
  if (raw == null || raw === '') return 0;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw.getTime();
  const n = Date.parse(String(raw));
  return Number.isFinite(n) ? n : 0;
}

function localDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isSameLocalDay(a, b) {
  if (!a || !b || Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return false;
  return localDateKey(a) === localDateKey(b);
}

function registrationDateForHost(host) {
  const ms = parseRegisteredMs(host?.registeredAt);
  if (ms <= 0) return null;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date;
}

function attendanceTypeToSummaryId(att) {
  if (att === BAUTIZOS_ATTENDANCE.bautizado) return 'bautizado';
  if (att === BAUTIZOS_ATTENDANCE.asistente) return 'asistente';
  if (att === BAUTIZOS_ATTENDANCE.servidor) return 'servidor';
  if (att === BAUTIZOS_ATTENDANCE.empleado) return 'empleado';
  if (att === BAUTIZOS_ATTENDANCE.cortesia) return 'cortesia';
  return null;
}

function isActiveTitularParticipant(p) {
  return String(p?.status || 'active') === 'active';
}

function resolveRegistrationBucket(host, loc, event, globalConfig, { today, regDate } = {}) {
  const date = regDate || registrationDateForHost(host);
  const todayRef = today || new Date();
  if (!date || !isSameLocalDay(date, todayRef)) return null;

  if (todayRef.getDay() === 0) {
    let svc = SERVICE_OPTIONS.includes(host?.paymentService) ? host.paymentService : '';
    if (!svc) {
      svc = getAutoPaymentServiceForPublic(
        date,
        event,
        loc,
        globalConfig?.serviceSlots,
        globalConfig?.cashCutScheduleByLocation
      );
    }
    const idx = SERVICE_OPTIONS.indexOf(svc);
    const isKnown = idx >= 0;
    const label = isKnown
      ? svc
      : String(svc || '').includes('dominical')
        ? 'Dom. fuera de horario'
        : String(svc || 'Servicio');
    return {
      sortKey: `a-svc-${isKnown ? String(idx).padStart(2, '0') : '99'}-${label}`,
      groupKind: 'service',
      label,
      isSunday: true,
    };
  }

  return {
    sortKey: 'b-day-today',
    groupKind: 'day',
    label: 'Hoy',
    isSunday: false,
  };
}

function addTodayBucketUnit(bucketMap, typeId, host, loc, event, globalConfig, today) {
  if (!typeId || !host) return;

  const regDate = registrationDateForHost(host);
  if (!regDate || !isSameLocalDay(regDate, today)) return;

  const meta = resolveRegistrationBucket(host, loc, event, globalConfig, { today, regDate });
  if (!meta) return;
  const key = meta.sortKey;
  if (!bucketMap.has(key)) {
    bucketMap.set(key, { ...meta, counts: emptyTypeCounts() });
  }
  const row = bucketMap.get(key);
  row.counts[typeId] = (row.counts[typeId] || 0) + 1;
}

function finalizeSection(bucketMap, totals, totalInscritos, today) {
  const buckets = [...bucketMap.values()].sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  const hasTodayBreakdown = buckets.some((b) =>
    LOCATION_ROSTER_TYPE_ROWS.some((r) => (b.counts[r.id] || 0) > 0)
  );
  return {
    totals,
    buckets,
    hasAny: totalInscritos > 0,
    hasTodayBreakdown,
    isSundayToday: today.getDay() === 0,
    totalInscritos,
  };
}

function buildTodayBucketsFromExpandedRows(expandedRows, roster, loc, event, globalConfig, today) {
  const rosterById = new Map();
  for (const p of roster || []) {
    const id = String(p?.id || '').trim();
    if (id) rosterById.set(id, p);
  }
  const bucketMap = new Map();
  for (const row of expandedRows || []) {
    if (row.__globalRegistryVirtual) {
      const host = rosterById.get(String(row.__hostRegistrantId || '').trim()) || row;
      let typeId = null;
      if (row.__virtualKind === GLOBAL_REGISTRY_VIRTUAL_KIND.companionBaptized) typeId = 'bautizado';
      else if (row.__virtualKind === GLOBAL_REGISTRY_VIRTUAL_KIND.companion) typeId = 'acompanante';
      if (typeId) addTodayBucketUnit(bucketMap, typeId, host, loc, event, globalConfig, today);
      continue;
    }
    if (participantHasBaptismChip(row, 'Bautizos')) {
      addTodayBucketUnit(bucketMap, 'bautizado', row, loc, event, globalConfig, today);
    }
    const att = normalizeBautizosAttendanceType(row.bautizosAttendanceType);
    const typeId = attendanceTypeToSummaryId(att);
    if (typeId && typeId !== 'bautizado') {
      addTodayBucketUnit(bucketMap, typeId, row, loc, event, globalConfig, today);
    }
  }
  return bucketMap;
}

function buildActiveTypeSection(activeTitularParticipants, { loc, event, globalConfig, dashboardScope, today }) {
  const locKey = String(loc || '').trim();
  const titulars = (activeTitularParticipants || []).filter(
    (p) => isActiveTitularParticipant(p) && bautizosDashboardTitularCountsForScope(p, dashboardScope)
  );

  const dashboardStats = computeBautizosDashboardActiveStatsForLocation(titulars, locKey, dashboardScope);
  const totals = dashboardActiveStatsToLocationTypeTotals(dashboardStats);

  const bucketMap = new Map();
  const meta = buildActiveRegistrantMetaForCompanionDedupe(titulars);
  const plan = buildBautizosCanonicalCompanionPlan(titulars, meta, {
    includeBaptizedCompanions: true,
  });

  for (const person of titulars) {
    if (participantHasBaptismChip(person, 'Bautizos')) {
      addTodayBucketUnit(bucketMap, 'bautizado', person, loc, event, globalConfig, today);
    }
    const att = normalizeBautizosAttendanceType(person.bautizosAttendanceType);
    const typeId = attendanceTypeToSummaryId(att);
    if (typeId && typeId !== 'bautizado') {
      addTodayBucketUnit(bucketMap, typeId, person, loc, event, globalConfig, today);
    }
  }

  for (const info of plan.values()) {
    const host = info.sourceRegistrant;
    if (!host || String(host.location || '').trim() !== locKey) continue;
    const c = info.sourceCompanion || {};
    if (!String(c?.name || '').trim()) continue;
    if (!bautizosDashboardCompanionCountsForScope(c, dashboardScope, host)) continue;
    const typeId = isBautizosCompanionBaptized(c) ? 'bautizado' : 'acompanante';
    addTodayBucketUnit(bucketMap, typeId, host, loc, event, globalConfig, today);
  }

  return finalizeSection(bucketMap, totals, dashboardStats.count, today);
}

function buildExpandedTypeSection(getExpandedRows, allParticipants, event, loc, globalConfig, dashboardScope, today) {
  const rows = getExpandedRows(allParticipants, event, loc, { dashboardScope });
  const totals = bautizosExpandedRowsToTypeTotals(rows);
  const roster = (allParticipants || []).filter(
    (p) => String(p?.eventId || '') === String(event?.id || '')
  );
  const bucketMap = buildTodayBucketsFromExpandedRows(rows, roster, loc, event, globalConfig, today);
  return finalizeSection(bucketMap, totals, rows.length, today);
}

/**
 * Resumen por sede en tres bloques: activos, lista de espera y cancelados.
 * Cada bloque usa la misma lógica de conteo canónico que el dashboard.
 */
export function buildLocationRosterTypeSummaryByStatus({
  activeTitularParticipants,
  allParticipants,
  event,
  loc,
  globalConfig,
  dashboardScope = 'all',
  today = new Date(),
} = {}) {
  const locKey = String(loc || '').trim();
  const common = { loc: locKey, event, globalConfig, dashboardScope, today };

  const sections = [
    {
      id: 'active',
      label: 'Activos',
      titleClass: 'text-indigo-600 dark:text-indigo-400',
      ...buildActiveTypeSection(activeTitularParticipants, common),
    },
    {
      id: 'waitlist',
      label: 'Lista de espera',
      titleClass: 'text-amber-600 dark:text-amber-400',
      ...buildExpandedTypeSection(
        getBautizosWaitlistExpandedRowsAtLocation,
        allParticipants,
        event,
        locKey,
        globalConfig,
        dashboardScope,
        today
      ),
    },
    {
      id: 'cancelled',
      label: 'Cancelados',
      titleClass: 'text-rose-600 dark:text-rose-400',
      ...buildExpandedTypeSection(
        getBautizosCancelledExpandedRowsAtLocation,
        allParticipants,
        event,
        locKey,
        globalConfig,
        dashboardScope,
        today
      ),
    },
  ];

  return {
    sections,
    hasAny: sections.some((s) => s.hasAny),
    isSundayToday: today.getDay() === 0,
  };
}

/** Totales por estado a partir del resumen canónico (`buildLocationRosterTypeSummaryByStatus`). */
export function getLocationRosterSectionCountsFromSummary(summary) {
  const byId = Object.fromEntries(
    (summary?.sections || []).map((s) => [s.id, s.totalInscritos ?? 0])
  );
  return {
    active: byId.active ?? 0,
    waitlist: byId.waitlist ?? 0,
    cancelled: byId.cancelled ?? 0,
  };
}

/**
 * Suma conteos canónicos de varias sedes (misma lógica que los chips del roster por sede).
 */
export function aggregateLocationRosterSectionCountsForLocations({
  locations = [],
  event,
  globalConfig,
  allParticipants = [],
  activeTitularParticipantsByLocation = {},
  waitlistParticipantsByLocation = {},
  cancelledParticipantsByLocation = {},
  dashboardScope = 'all',
} = {}) {
  const evId = String(event?.id || '').trim();
  const roster =
    evId === ''
      ? allParticipants || []
      : (allParticipants || []).filter((p) => String(p?.eventId || '') === evId);
  const isBautizos = String(event?.eventType || '') === 'Bautizos';
  let active = 0;
  let waitlist = 0;
  let cancelled = 0;

  for (const loc of locations) {
    const locKey = String(loc || '').trim();
    if (!locKey) continue;
    if (isBautizos) {
      const summary = buildLocationRosterTypeSummaryByStatus({
        activeTitularParticipants: activeTitularParticipantsByLocation[locKey] || [],
        allParticipants: roster,
        event,
        loc: locKey,
        globalConfig,
        dashboardScope,
      });
      const c = getLocationRosterSectionCountsFromSummary(summary);
      active += c.active;
      waitlist += c.waitlist;
      cancelled += c.cancelled;
    } else {
      active += (activeTitularParticipantsByLocation[locKey] || []).length;
      waitlist += (waitlistParticipantsByLocation[locKey] || []).length;
      cancelled += (cancelledParticipantsByLocation[locKey] || []).length;
    }
  }

  return { active, waitlist, cancelled };
}

/** @deprecated Usar buildLocationRosterTypeSummaryByStatus */
export function buildLocationRosterTypeSummary(activeTitularParticipants, options = {}) {
  const section = buildActiveTypeSection(activeTitularParticipants, options);
  return { ...section, sections: undefined };
}
