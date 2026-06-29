/**
 * Conteos canónicos (titular + acompañantes deduplicados) para badges del roster por sede,
 * sin expandir filas en la visualización del listado.
 */
import {
  bautizosDashboardCompanionCountsForScope,
  bautizosDashboardTitularCountsForScope,
  expandBautizosGlobalRegistryRows,
  expandBautizosWaitlistRegistryRows,
  getBautizosCompanionsArray,
  GLOBAL_REGISTRY_VIRTUAL_KIND,
  normalizeBautizosAttendanceType,
  participantHasBaptismChip,
  BAUTIZOS_ATTENDANCE,
} from './bautizosParty.js';
import { computeBautizosDashboardActiveStatsForLocation } from './bautizosDashboardLocationStats.js';

const PARTICIPANT_STATUS_ARCHIVED = 'archived';

function participantIsArchived(p) {
  return (p?.status || 'active') === PARTICIPANT_STATUS_ARCHIVED;
}

function participantIsCancelled(p) {
  return (p?.status || 'active') === 'cancelled';
}

function participantIsWaitlistRow(p) {
  return (p?.status || 'active') === 'waitlist';
}

function rowAtLocation(row, locNorm) {
  return String(row?.location || '').trim() === locNorm;
}

function participantSedeKey(p) {
  return String(p?.cancelledFromLocation || p?.location || '').trim();
}

function filterExpandedRowsForLocation(expandedRows, roster, locNorm, dashboardScope) {
  const rosterById = new Map();
  for (const p of roster || []) {
    const id = String(p?.id || '').trim();
    if (id) rosterById.set(id, p);
  }
  const out = [];
  for (const row of expandedRows || []) {
    if (!rowAtLocation(row, locNorm)) continue;
    if (row.__globalRegistryVirtual) {
      const host = rosterById.get(String(row.__hostRegistrantId || '').trim());
      if (!host) continue;
      const rowName = String(row?.name || '').trim();
      const comp = getBautizosCompanionsArray(host).find((c) => String(c?.name || '').trim() === rowName);
      if (!comp || !bautizosDashboardCompanionCountsForScope(comp, dashboardScope, host)) continue;
    } else if (!bautizosDashboardTitularCountsForScope(row, dashboardScope)) {
      continue;
    }
    out.push(row);
  }
  return out;
}

function countBautizosExpandedAtLocation(titularRows, roster, locNorm, expandFn, dashboardScope = 'all') {
  const titularsInLoc = (titularRows || []).filter((p) => {
    if (participantIsCancelled(p)) return participantSedeKey(p) === locNorm;
    return rowAtLocation(p, locNorm);
  });
  if (titularsInLoc.length === 0) return 0;
  const expanded = expandFn(titularsInLoc, roster);
  return filterExpandedRowsForLocation(expanded, roster, locNorm, dashboardScope).length;
}

function analyzeBautizosExpandedRowsToTypes(expandedRows) {
  let bautizados = 0;
  let acompanantes = 0;
  let asistentes = 0;
  let servidores = 0;
  let empleados = 0;
  let cortesias = 0;
  for (const p of expandedRows || []) {
    if (p.__globalRegistryVirtual) {
      if (p.__virtualKind === GLOBAL_REGISTRY_VIRTUAL_KIND.companionBaptized) {
        bautizados += 1;
      } else if (p.__virtualKind === GLOBAL_REGISTRY_VIRTUAL_KIND.companion) {
        acompanantes += 1;
      }
      continue;
    }
    if (participantHasBaptismChip(p, 'Bautizos')) bautizados += 1;
    const att = normalizeBautizosAttendanceType(p.bautizosAttendanceType);
    if (att === BAUTIZOS_ATTENDANCE.asistente) asistentes += 1;
    if (att === BAUTIZOS_ATTENDANCE.servidor) servidores += 1;
    if (att === BAUTIZOS_ATTENDANCE.empleado) empleados += 1;
    if (att === BAUTIZOS_ATTENDANCE.cortesia) cortesias += 1;
  }
  return { bautizados, acompanantes, asistentes, servidores, empleados, cortesias };
}

/** Desglose por tipo a partir de filas expandidas (activos, espera o cancelados). */
export function bautizosExpandedRowsToTypeTotals(expandedRows) {
  const a = analyzeBautizosExpandedRowsToTypes(expandedRows);
  return {
    bautizado: a.bautizados,
    acompanante: a.acompanantes,
    asistente: a.asistentes,
    servidor: a.servidores,
    empleado: a.empleados,
    cortesia: a.cortesias,
  };
}

/**
 * Filas expandidas de cancelados en una sede (titulares cancelados + acompañantes canónicos).
 */
export function getBautizosCancelledExpandedRowsAtLocation(
  allParticipants,
  event,
  loc,
  { dashboardScope = 'all' } = {}
) {
  const evId = String(event?.id || '');
  const locNorm = String(loc || '').trim();
  if (!evId || !locNorm) return [];

  const roster = (allParticipants || []).filter(
    (p) => String(p?.eventId || '') === evId && !participantIsArchived(p)
  );
  const cancelledTitulars = roster.filter(
    (p) => participantIsCancelled(p) && participantSedeKey(p) === locNorm
  );
  const expanded = expandBautizosGlobalRegistryRows(cancelledTitulars, roster);
  return filterExpandedRowsForLocation(expanded, roster, locNorm, dashboardScope);
}

export function getBautizosWaitlistExpandedRowsAtLocation(
  allParticipants,
  event,
  loc,
  { dashboardScope = 'all' } = {}
) {
  const evId = String(event?.id || '');
  const locNorm = String(loc || '').trim();
  if (!evId || !locNorm) return [];

  const roster = (allParticipants || []).filter(
    (p) =>
      String(p?.eventId || '') === evId &&
      !participantIsArchived(p) &&
      !participantIsCancelled(p)
  );
  const waitlistTitulars = roster.filter(
    (p) =>
      participantIsWaitlistRow(p) &&
      rowAtLocation(p, locNorm) &&
      bautizosDashboardTitularCountsForScope(p, dashboardScope)
  );
  const expanded = expandBautizosWaitlistRegistryRows(waitlistTitulars, roster);
  return filterExpandedRowsForLocation(expanded, roster, locNorm, dashboardScope);
}

/**
 * Conteo canónico de lista de espera en una sede.
 */
export function countBautizosWaitlistExpandedPeople(allParticipants, event, loc, options = {}) {
  return getBautizosWaitlistExpandedRowsAtLocation(allParticipants, event, loc, options).length;
}

/**
 * Desglose de líneas de lista de espera para sidebar / dashboard.
 */
export function analyzeBautizosWaitlistExpandedAtLocation(allParticipants, event, loc, options = {}) {
  const rows = getBautizosWaitlistExpandedRowsAtLocation(allParticipants, event, loc, options);
  const types = analyzeBautizosExpandedRowsToTypes(rows);
  return { total: rows.length, ...types };
}

/**
 * Conteos canónicos por estado de registro en una sede (Bautizos).
 */
export function computeBautizosRosterStatusCountsForLocation(
  allParticipants,
  event,
  loc,
  { dashboardScope = 'all' } = {}
) {
  const evId = String(event?.id || '');
  const locNorm = String(loc || '').trim();
  if (!evId || !locNorm || String(event?.eventType || '') !== 'Bautizos') {
    return { active: 0, waitlist: 0, cancelled: 0, all: 0 };
  }

  const roster = (allParticipants || []).filter(
    (p) => String(p?.eventId || '') === evId && !participantIsArchived(p)
  );
  const activeTitularsAtLoc = roster.filter(
    (p) =>
      (p?.status || 'active') === 'active' &&
      !participantIsCancelled(p) &&
      rowAtLocation(p, locNorm)
  );
  const cancelledTitulars = roster.filter((p) => participantIsCancelled(p) && participantSedeKey(p) === locNorm);

  const active = computeBautizosDashboardActiveStatsForLocation(
    activeTitularsAtLoc,
    locNorm,
    dashboardScope
  ).count;
  const waitlist = countBautizosWaitlistExpandedPeople(allParticipants, event, locNorm, { dashboardScope });
  const cancelled = countBautizosExpandedAtLocation(
    cancelledTitulars,
    roster,
    locNorm,
    expandBautizosGlobalRegistryRows,
    dashboardScope
  );

  return { active, waitlist, cancelled, all: active + waitlist + cancelled };
}
