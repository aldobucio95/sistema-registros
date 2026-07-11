/**
 * Estadísticas de inscritos activos por sede — misma base que la tabla del dashboard
 * (columna «Inscritos» y desglose Bautizados / Acompañantes / tipos de asistencia).
 */
import {
  BAUTIZOS_ATTENDANCE,
  buildActiveRegistrantMetaForCompanionDedupe,
  buildBautizosCanonicalCompanionPlan,
  buildBautizosDashboardCanonicalCompanionPlan,
  buildBautizosCompanionTransportLineLike,
  buildBautizosCompanionListFilterPersonLike,
  bautizosCompanionParticipatesAsServer,
  bautizosCompanionCountsInCortesiaTotal,
  bautizosTitularCountsInCortesiaTotal,
  bautizosDashboardCompanionCountsForScope,
  bautizosDashboardTitularCountsForScope,
  bautizosLineGoesByCar,
  bautizosParticipatesAsServer,
  bautizosServerPersonDedupeKey,
  isBautizosCompanionBaptized,
  isBautizosLapInfantCompanion,
  normalizeBautizosAttendanceType,
  participantHasBaptismChip,
} from './bautizosParty.js';
import { isSiValue } from './publicRegistrationLogic.js';

const PARTICIPANT_STATUS_ARCHIVED = 'archived';

/** Evalúa si una persona (titular o acompañante canónico) pasa todos los filtros de lista. */
export function buildBautizosEventWideMatchesPerson(filterParticipantRowsFn, filters) {
  return (person) =>
    filterParticipantRowsFn([person], true, filters, { expandBautizosCompanions: false }).length > 0;
}

function resolveCountLocations(dashboardLocs, locationFilter) {
  const base = Array.isArray(dashboardLocs) ? dashboardLocs : [];
  if (!Array.isArray(locationFilter) || locationFilter.length === 0) return base;
  const allowed = new Set(base.map((l) => String(l).trim()));
  return locationFilter.map((l) => String(l).trim()).filter((l) => l && allowed.has(l));
}

function resolveCanonicalPlanForCount({
  canonicalCompanionPlan,
  data,
  locs,
  allParticipants,
  event,
}) {
  if (canonicalCompanionPlan instanceof Map) return canonicalCompanionPlan;
  const rosterBase = locs.flatMap((loc) => data[loc] || []).filter((p) => (p?.status || 'active') === 'active');
  const eventId = String(event?.id || '');
  const linkLookupRoster = (allParticipants || []).filter(
    (p) => String(p?.eventId || '') === eventId && (p?.status || 'active') !== PARTICIPANT_STATUS_ARCHIVED
  );
  return buildBautizosDashboardCanonicalCompanionPlan(rosterBase, {
    includeBaptizedCompanions: true,
    linkLookupRoster,
  });
}

function buildActiveBautizosFilterPool({
  locs,
  data,
  canonicalCompanionPlan,
  dashboardScope,
}) {
  const plan = canonicalCompanionPlan instanceof Map ? canonicalCompanionPlan : null;
  const pool = [];
  for (const loc of locs) {
    const locNorm = String(loc || '').trim();
    const titulars = (data[loc] || []).filter(
      (p) =>
        (p?.status || 'active') === 'active' &&
        bautizosDashboardTitularCountsForScope(p, dashboardScope)
    );
    pool.push(...titulars);

    const locPlan =
      plan ||
      buildBautizosCanonicalCompanionPlan(
        titulars,
        buildActiveRegistrantMetaForCompanionDedupe(titulars),
        { includeBaptizedCompanions: true }
      );

    for (const info of locPlan.values()) {
      const host = info?.sourceRegistrant;
      if (!host || String(host.location || '').trim() !== locNorm) continue;
      const comp = info.sourceCompanion || {};
      if (!bautizosDashboardCompanionCountsForScope(comp, dashboardScope, host)) continue;
      pool.push(buildBautizosCompanionListFilterPersonLike(host, comp, info.canonKey));
    }
  }
  return pool;
}

function countActiveBautizosFilteredPeople({
  locs,
  data,
  filters,
  filterParticipantRowsFn,
  canonicalCompanionPlan,
  dashboardScope,
  activePool = null,
}) {
  const pool =
    activePool ||
    buildActiveBautizosFilterPool({
      locs,
      data,
      canonicalCompanionPlan,
      dashboardScope,
    });
  return filterParticipantRowsFn(pool, true, filters, { expandBautizosCompanions: false }).length;
}

function buildExpandedBautizosFilterPool({
  locs,
  data,
  waitlistData,
  cancelledData,
  regStatus,
}) {
  if (regStatus === 'waitlist') {
    return locs.flatMap((loc) => waitlistData[loc] || []);
  }
  if (regStatus === 'cancelled') {
    return locs.flatMap((loc) => cancelledData[loc] || []);
  }
  return locs.flatMap((loc) => [
    ...(data[loc] || []),
    ...(waitlistData[loc] || []),
    ...(cancelledData[loc] || []),
  ]);
}

function countExpandedBautizosFilteredPeople({
  locs,
  data,
  waitlistData,
  cancelledData,
  filters,
  filterParticipantRowsFn,
  regStatus,
  pool = null,
}) {
  const resolvedPool =
    pool ||
    buildExpandedBautizosFilterPool({
      locs,
      data,
      waitlistData,
      cancelledData,
      regStatus,
    });
  return filterParticipantRowsFn(resolvedPool, true, filters, { expandBautizosCompanions: true }).length;
}

/** Pools reutilizables para conteos múltiples del dropdown de filtros del dashboard. */
export function buildBautizosEventWideFilterCountPools({
  dashboardLocs = [],
  data = {},
  waitlistData = {},
  cancelledData = {},
  canonicalCompanionPlan = null,
  event = null,
  dashboardScope = 'all',
  allParticipants = null,
} = {}) {
  const locs = resolveCountLocations(dashboardLocs, null);
  const plan = resolveCanonicalPlanForCount({
    canonicalCompanionPlan,
    data,
    locs,
    allParticipants,
    event,
  });
  return {
    locs,
    plan,
    activePool: buildActiveBautizosFilterPool({
      locs,
      data,
      canonicalCompanionPlan: plan,
      dashboardScope,
    }),
    waitlistPool: buildExpandedBautizosFilterPool({
      locs,
      data,
      waitlistData,
      cancelledData,
      regStatus: 'waitlist',
    }),
    cancelledPool: buildExpandedBautizosFilterPool({
      locs,
      data,
      waitlistData,
      cancelledData,
      regStatus: 'cancelled',
    }),
    allPool: buildExpandedBautizosFilterPool({
      locs,
      data,
      waitlistData,
      cancelledData,
      regStatus: 'all',
    }),
  };
}

/**
 * Conteo canónico event-wide de personas Bautizos que coinciden con filtros de lista.
 * Activos: titulares + acompañantes canónicos con evaluación FIFO por persona (misma regla que tabla Global).
 */
export function countBautizosEventWideFilteredPeople({
  dashboardLocs = [],
  data = {},
  waitlistData = {},
  cancelledData = {},
  filters = {},
  filterParticipantRowsFn,
  canonicalCompanionPlan = null,
  event = null,
  dashboardScope = 'all',
  locationFilter = null,
  allParticipants = null,
  activePool = null,
  expandedPool = null,
} = {}) {
  if (typeof filterParticipantRowsFn !== 'function') return 0;
  const locs = resolveCountLocations(dashboardLocs, locationFilter);
  if (locs.length === 0) return 0;

  const regStatus = String(filters?.filterRegistrationStatus || 'all').trim();
  if (regStatus === 'active') {
    const plan = resolveCanonicalPlanForCount({
      canonicalCompanionPlan,
      data,
      locs,
      allParticipants,
      event,
    });
    return countActiveBautizosFilteredPeople({
      locs,
      data,
      filters,
      filterParticipantRowsFn,
      canonicalCompanionPlan: plan,
      dashboardScope,
      activePool,
    });
  }

  return countExpandedBautizosFilteredPeople({
    locs,
    data,
    waitlistData,
    cancelledData,
    filters,
    filterParticipantRowsFn,
    regStatus,
    pool: expandedPool,
  });
}

/**
 * Conteos por persona en una sede (titular + acompañante canónico deduplicado).
 * Misma regla que tarjetas del dashboard, secciones y exportación Excel.
 *
 * @param {object} params
 * @param {object[]} params.activeTitularRows — titulares activos de la sede (`data[loc]`)
 * @param {string} params.loc
 * @param {string} [params.dashboardScope='all']
 * @param {Map} [params.canonicalCompanionPlan] — plan event-wide; si falta, se arma local
 * @param {(person: object) => boolean} [params.matchesPerson] — filtro por persona (lista compartida)
 * @param {object} [params.event]
 */
export function computeBautizosDashboardLocationPersonStats({
  activeTitularRows,
  loc,
  dashboardScope = 'all',
  canonicalCompanionPlan = null,
  matchesPerson = null,
  event = null,
} = {}) {
  const matches = typeof matchesPerson === 'function' ? matchesPerson : () => true;
  const locNorm = String(loc || '').trim();
  const titulars = (activeTitularRows || []).filter(
    (p) =>
      (p?.status || 'active') === 'active' &&
      bautizosDashboardTitularCountsForScope(p, dashboardScope)
  );

  let count = 0;
  let activeRegistrants = 0;
  let bautizados = 0;
  let companions = 0;
  let asistentesBautizos = 0;
  let servers = 0;
  let empleadosBautizos = 0;
  let pastores = 0;
  let cortesia = 0;
  let bautizosTransport = 0;
  let bautizosCarro = 0;
  const serverKeys = new Set();

  const tryCountServer = (personLike, canonKey) => {
    const isTitularServer = bautizosParticipatesAsServer(personLike);
    const isCompanionServer = bautizosCompanionParticipatesAsServer(personLike);
    if (!isTitularServer && !isCompanionServer) return;
    const k = bautizosServerPersonDedupeKey(personLike, canonKey ? { canonKey } : {});
    if (k && serverKeys.has(k)) return;
    if (k) serverKeys.add(k);
    servers += 1;
  };

  for (const p of titulars) {
    if (!matches(p)) continue;
    count += 1;
    activeRegistrants += 1;
    if (participantHasBaptismChip(p, 'Bautizos')) bautizados += 1;
    const bzAtt = normalizeBautizosAttendanceType(p.bautizosAttendanceType);
    if (bzAtt === BAUTIZOS_ATTENDANCE.asistente) asistentesBautizos += 1;
    if (bautizosTitularCountsInCortesiaTotal(p)) cortesia += 1;
    if (bzAtt === BAUTIZOS_ATTENDANCE.empleado) empleadosBautizos += 1;
    if (bzAtt === BAUTIZOS_ATTENDANCE.pastor) pastores += 1;
    if (isSiValue(p.wantsBautizosTransport) && !isBautizosLapInfantCompanion(p, event)) {
      bautizosTransport += 1;
    }
    if (bautizosLineGoesByCar(p)) bautizosCarro += 1;
    tryCountServer(p);
  }

  const plan =
    canonicalCompanionPlan instanceof Map
      ? canonicalCompanionPlan
      : buildBautizosCanonicalCompanionPlan(
          titulars,
          buildActiveRegistrantMetaForCompanionDedupe(titulars),
          { includeBaptizedCompanions: true }
        );

  for (const info of plan.values()) {
    const host = info?.sourceRegistrant;
    if (!host || String(host.location || '').trim() !== locNorm) continue;
    const comp = info.sourceCompanion || {};
    if (!bautizosDashboardCompanionCountsForScope(comp, dashboardScope, host)) continue;
    const lineLike = buildBautizosCompanionListFilterPersonLike(host, comp, info.canonKey);
    if (!matches(lineLike)) continue;
    count += 1;
    if (isBautizosCompanionBaptized(comp)) bautizados += 1;
    else companions += 1;
    if (bautizosCompanionCountsInCortesiaTotal(comp, host)) {
      cortesia += 1;
    }
    if (isSiValue(lineLike.wantsBautizosTransport) && !isBautizosLapInfantCompanion(lineLike, event)) {
      bautizosTransport += 1;
    }
    if (bautizosLineGoesByCar(lineLike)) bautizosCarro += 1;
    if (bautizosCompanionParticipatesAsServer(comp)) tryCountServer(comp, info.canonKey);
  }

  return {
    count,
    activeRegistrants,
    bautizados,
    companions,
    companionsTotal: companions,
    asistentesBautizos,
    servers,
    empleadosBautizos,
    pastores,
    cortesia,
    bautizosTransport,
    bautizosCarro,
  };
}

/**
 * @param {object[]} activeTitularRows — titulares activos de la sede (`data[loc]`)
 * @param {string} loc
 * @param {string} [dashboardScope='all']
 */
export function computeBautizosDashboardActiveStatsForLocation(
  activeTitularRows,
  loc,
  dashboardScope = 'all'
) {
  return computeBautizosDashboardLocationPersonStats({
    activeTitularRows,
    loc,
    dashboardScope,
  });
}

/** Mapea stats del dashboard al objeto `totals` de `buildLocationRosterTypeSummary`. */
export function dashboardActiveStatsToLocationTypeTotals(stats) {
  return {
    bautizado: stats?.bautizados ?? 0,
    acompanante: stats?.companions ?? 0,
    asistente: stats?.asistentesBautizos ?? 0,
    servidor: stats?.servers ?? 0,
    empleado: stats?.empleadosBautizos ?? 0,
    cortesia: stats?.cortesia ?? 0,
  };
}
