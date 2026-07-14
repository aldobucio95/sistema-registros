/**
 * Resumen por tipo en roster por sede.
 * APIs canónicas de resumen por sede: conteos por titular (Campa/General).
 */

/** Filas del resumen por tipo (compat UI). */
export const LOCATION_ROSTER_TYPE_ROWS = Object.freeze([
  { id: 'bautizado', label: 'Bautizados', short: 'Baut.' },
  { id: 'acompanante', label: 'Acompañantes', short: 'Acomp.' },
  { id: 'asistente', label: 'Asistentes', short: 'Asist.' },
  { id: 'servidor', label: 'Servidores', short: 'Serv.' },
  { id: 'empleado', label: 'Empleados', short: 'Emp.' },
  { id: 'pastor', label: 'Pastores', short: 'Past.' },
  { id: 'cortesia', label: 'Cortesías', short: 'Cort.' },
]);

function emptyTypeCounts() {
  return Object.fromEntries(LOCATION_ROSTER_TYPE_ROWS.map((r) => [r.id, 0]));
}

function emptySection(id, label, titleClass) {
  return {
    id,
    label,
    titleClass,
    totals: emptyTypeCounts(),
    buckets: [],
    hasAny: false,
    hasTodayBreakdown: false,
    isSundayToday: new Date().getDay() === 0,
    totalInscritos: 0,
  };
}

/**
 * Resumen por sede en tres bloques: activos, lista de espera y cancelados.
 * Sin expansión de acompañantes.
 */
export function buildLocationRosterTypeSummaryByStatus({
  activeTitularParticipants,
  waitlistParticipants,
  cancelledParticipants,
  today = new Date(),
} = {}) {
  const activeCount = (activeTitularParticipants || []).length;
  const waitlistCount = (waitlistParticipants || []).length;
  const cancelledCount = (cancelledParticipants || []).length;
  const isSundayToday = today.getDay() === 0;

  const sections = [
    {
      ...emptySection('active', 'Activos', 'text-indigo-600 dark:text-indigo-400'),
      totalInscritos: activeCount,
      hasAny: activeCount > 0,
      isSundayToday,
    },
    {
      ...emptySection('waitlist', 'Lista de espera', 'text-amber-600 dark:text-amber-400'),
      totalInscritos: waitlistCount,
      hasAny: waitlistCount > 0,
      isSundayToday,
    },
    {
      ...emptySection('cancelled', 'Cancelados', 'text-rose-600 dark:text-rose-400'),
      totalInscritos: cancelledCount,
      hasAny: cancelledCount > 0,
      isSundayToday,
    },
  ];

  return {
    sections,
    hasAny: sections.some((s) => s.hasAny),
    isSundayToday,
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
 * Suma conteos de varias sedes (titulares por mapa de ubicación).
 */
export function aggregateLocationRosterSectionCountsForLocations({
  locations = [],
  activeTitularParticipantsByLocation = {},
  waitlistParticipantsByLocation = {},
  cancelledParticipantsByLocation = {},
} = {}) {
  let active = 0;
  let waitlist = 0;
  let cancelled = 0;

  for (const loc of locations) {
    const locKey = String(loc || '').trim();
    if (!locKey) continue;
    active += (activeTitularParticipantsByLocation[locKey] || []).length;
    waitlist += (waitlistParticipantsByLocation[locKey] || []).length;
    cancelled += (cancelledParticipantsByLocation[locKey] || []).length;
  }

  return { active, waitlist, cancelled };
}

/** @deprecated Usar buildLocationRosterTypeSummaryByStatus */
export function buildLocationRosterTypeSummary(activeTitularParticipants, options = {}) {
  const summary = buildLocationRosterTypeSummaryByStatus({
    activeTitularParticipants,
    ...options,
  });
  const active = summary.sections.find((s) => s.id === 'active') || emptySection('active', 'Activos', '');
  return { ...active, sections: undefined };
}
