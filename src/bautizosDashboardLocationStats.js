/**
 * Estadísticas de inscritos activos por sede — misma base que la tabla del dashboard
 * (columna «Inscritos» y desglose Bautizados / Acompañantes / tipos de asistencia).
 */
import {
  BAUTIZOS_ATTENDANCE,
  buildActiveRegistrantMetaForCompanionDedupe,
  buildBautizosCanonicalCompanionPlan,
  bautizosDashboardCompanionCountsForScope,
  bautizosDashboardTitularCountsForScope,
  isBautizosCompanionBaptized,
  normalizeBautizosAttendanceType,
  participantHasBaptismChip,
} from './bautizosParty.js';

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
  const locNorm = String(loc || '').trim();
  const titulars = (activeTitularRows || []).filter(
    (p) =>
      (p?.status || 'active') === 'active' &&
      bautizosDashboardTitularCountsForScope(p, dashboardScope)
  );

  let bautizados = 0;
  let companions = 0;
  let asistentesBautizos = 0;
  let servers = 0;
  let empleadosBautizos = 0;
  let cortesia = 0;

  for (const p of titulars) {
    if (participantHasBaptismChip(p, 'Bautizos')) bautizados += 1;
    const bzAtt = normalizeBautizosAttendanceType(p.bautizosAttendanceType);
    if (bzAtt === BAUTIZOS_ATTENDANCE.servidor) servers += 1;
    if (bzAtt === BAUTIZOS_ATTENDANCE.asistente) asistentesBautizos += 1;
    if (bzAtt === BAUTIZOS_ATTENDANCE.cortesia) cortesia += 1;
    if (bzAtt === BAUTIZOS_ATTENDANCE.empleado) empleadosBautizos += 1;
  }

  const meta = buildActiveRegistrantMetaForCompanionDedupe(titulars);
  const plan = buildBautizosCanonicalCompanionPlan(titulars, meta, {
    includeBaptizedCompanions: true,
  });

  let compN = 0;
  for (const info of plan.values()) {
    if (String(info.sourceRegistrant?.location || '').trim() !== locNorm) continue;
    const host = info.sourceRegistrant;
    const comp = info.sourceCompanion || {};
    if (!bautizosDashboardCompanionCountsForScope(comp, dashboardScope, host)) continue;
    compN += 1;
    if (isBautizosCompanionBaptized(comp)) bautizados += 1;
    else companions += 1;
  }

  const count = titulars.length + compN;

  return {
    count,
    bautizados,
    companions,
    asistentesBautizos,
    servers,
    empleadosBautizos,
    cortesia,
  };
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
