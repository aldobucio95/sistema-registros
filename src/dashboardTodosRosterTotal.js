/**
 * Total «Registros totales» del dashboard en modo Todos (misma noción para hub `activeRosterUnitsTotal`).
 *
 * Cloud Functions usa la copia CommonJS `functions/lib/dashboardTodosRosterTotal.cjs` (misma lógica + helpers
 * canónicos de `bautizosParty.js`); si cambias reglas aquí, actualiza ese archivo en el mismo commit.
 */

import {
  BAUTIZOS_ATTENDANCE,
  normalizeBautizosAttendanceType,
  buildBautizadoMetaForCanonical,
  buildBautizosCanonicalCompanionPlan,
} from './bautizosParty.js';

function isCompanionWaitlistPhantomStoredParticipant(personLike) {
  if (personLike?._isCompanionWaitlistVirtual === true) return true;
  return String(personLike?.id || '').trim().startsWith('cw:');
}

const SI = 'Si';
const SI_LABEL = 'Sí';

function isSiValue(v) {
  const s = String(v ?? '').trim();
  if (s === SI || s === SI_LABEL) return true;
  if (s.toLowerCase() === 'sí') return true;
  if (s.length === 2 && s[0] === 'S' && (s[1] === '?' || s[1] === '\uFFFD')) return true;
  return false;
}

function getAmbosServeInSegmentOrEmpty(personLike) {
  const mix = String(personLike?.ambosServeInSegment || '').trim();
  return mix === 'Teens' || mix === 'Jóvenes' ? mix : '';
}

const PARTICIPANT_STATUS_ARCHIVED = 'archived';

function participantIsCancelled(p) {
  return (p?.status || 'active') === 'cancelled';
}

function participantIsRosterRow(p) {
  const s = p?.status || 'active';
  return s !== 'waitlist' && s !== PARTICIPANT_STATUS_ARCHIVED;
}

function participantIsActiveInRoster(p) {
  return participantIsRosterRow(p) && !participantIsCancelled(p);
}

function participantCountsAsRealCostX2(personLike, eventLike) {
  if (!personLike || eventLike?.eventType !== 'Campa') return false;
  if (!participantIsActiveInRoster(personLike)) return false;
  if (!isSiValue(personLike?.isServer)) return false;
  if (String(personLike?.serverAssignment || '').trim() !== 'Ambos') return false;
  return !getAmbosServeInSegmentOrEmpty(personLike);
}

function participantLocationInEventLocations(personRow, eventLike) {
  const locs = Array.isArray(eventLike?.locations) ? eventLike.locations : [];
  if (locs.length === 0) return false;
  const loc = String(personRow?.location || '').trim();
  return locs.includes(loc);
}

/**
 * Filas de roster activas en sedes del evento (misma base que listas del dashboard / `data[sede]`).
 * @param {object[]} participantRows
 * @param {object} eventRow — doc `app_events` con `locations`, `eventType`, etc.
 */
export function filterDashboardTodosRosterRows(participantRows, eventRow) {
  return (participantRows || []).filter(
    (p) =>
      !isCompanionWaitlistPhantomStoredParticipant(p) &&
      participantIsActiveInRoster(p) &&
      participantLocationInEventLocations(p, eventRow)
  );
}

/** Participantes activos del evento que consumen cupo (misma base que `computeDashboardTodosRosterTotal`). */
export function filterEventCapRosterBase(participantRows, eventRow) {
  const eid = String(eventRow?.id || '').trim();
  const scoped =
    eid === ''
      ? participantRows || []
      : (participantRows || []).filter((p) => String(p?.eventId || '').trim() === eid);
  return filterDashboardTodosRosterRows(scoped, eventRow);
}

function computeBautizosTodosTotal(rosterBase) {
  const activeBautizadoRoster = rosterBase.filter(
    (p) => normalizeBautizosAttendanceType(p?.bautizosAttendanceType) === BAUTIZOS_ATTENDANCE.bautizado
  );
  const meta = buildBautizadoMetaForCanonical(activeBautizadoRoster);
  const plan = buildBautizosCanonicalCompanionPlan(rosterBase, meta, { includeBaptizedCompanions: true });
  return rosterBase.length + plan.size;
}

function computeCampaTodosTotal(rosterBase, eventRow) {
  const o = eventRow?.campaRealCostCountOptions;
  const countAmbosDouble = !o || typeof o !== 'object' || o.countAmbosDoubleInAllCounts !== false;
  let total = 0;
  for (const p of rosterBase) {
    let w = 1;
    if (countAmbosDouble && participantCountsAsRealCostX2(p, eventRow)) w = 2;
    total += w;
  }
  return total;
}

/**
 * @param {object[]} participantRows — participantes del evento (`eventId` coherente; puede incluir otras sedes si se filtra antes)
 * @param {object} eventRow — documento del evento; debe incluir `id` si `participantRows` son de varios eventos
 */
export function computeDashboardTodosRosterTotal(participantRows, eventRow) {
  if (!eventRow || typeof eventRow !== 'object') return 0;
  const eid = String(eventRow.id || '').trim();
  const scoped =
    eid === ''
      ? participantRows || []
      : (participantRows || []).filter((p) => String(p?.eventId || '').trim() === eid);
  const rosterBase = filterDashboardTodosRosterRows(scoped, eventRow);
  const evType = String(eventRow.eventType || '');

  if (evType === 'Bautizos') {
    return computeBautizosTodosTotal(rosterBase);
  }
  if (evType === 'Campa') {
    return computeCampaTodosTotal(rosterBase, eventRow);
  }
  return rosterBase.length;
}

/**
 * Contribución de una sola fila al total «Registros totales» / `activeRosterUnitsTotal`.
 * @returns {number} unidades (0 si no cuenta en roster activo)
 * @returns {null} si el tipo de evento requiere recálculo completo (Bautizos)
 */
export function computeRowTodosUnitContribution(personRow, eventRow) {
  if (!personRow || !eventRow || typeof eventRow !== 'object') return 0;
  const evType = String(eventRow.eventType || '');
  if (evType === 'Bautizos') return null;
  if (!participantIsActiveInRoster(personRow)) return 0;
  if (!participantLocationInEventLocations(personRow, eventRow)) return 0;
  if (evType === 'Campa') {
    const o = eventRow?.campaRealCostCountOptions;
    const countAmbosDouble = !o || typeof o !== 'object' || o.countAmbosDoubleInAllCounts !== false;
    let w = 1;
    if (countAmbosDouble && participantCountsAsRealCostX2(personRow, eventRow)) w = 2;
    return w;
  }
  return 1;
}

/**
 * Unidades de cupo activas por sede (misma base que `computeDashboardTodosRosterTotal`, desglosada por `location`).
 * Bautizos: filas activas en la sede + acompañantes canónicos atribuidos al host de esa sede.
 */
export function computeEventCapUsedUnitsBySede(participantRows, eventRow) {
  if (!eventRow || typeof eventRow !== 'object') return {};
  const locList = Array.isArray(eventRow.locations) ? eventRow.locations : [];
  const byLoc = Object.fromEntries(locList.map((l) => [l, 0]));
  if (locList.length === 0) return byLoc;

  const rosterBase = filterEventCapRosterBase(participantRows, eventRow);
  const evType = String(eventRow.eventType || '');

  if (evType === 'Bautizos') {
    for (const p of rosterBase) {
      const loc = String(p?.location || '').trim();
      if (Object.prototype.hasOwnProperty.call(byLoc, loc)) byLoc[loc] += 1;
    }
    const activeBautizadoRoster = rosterBase.filter(
      (p) => normalizeBautizosAttendanceType(p?.bautizosAttendanceType) === BAUTIZOS_ATTENDANCE.bautizado
    );
    const meta = buildBautizadoMetaForCanonical(activeBautizadoRoster);
    const plan = buildBautizosCanonicalCompanionPlan(rosterBase, meta, { includeBaptizedCompanions: true });
    for (const info of plan.values()) {
      const loc = String(info?.sourceRegistrant?.location || '').trim();
      if (Object.prototype.hasOwnProperty.call(byLoc, loc)) byLoc[loc] += 1;
    }
    return byLoc;
  }

  if (evType === 'Campa') {
    const o = eventRow?.campaRealCostCountOptions;
    const countAmbosDouble = !o || typeof o !== 'object' || o.countAmbosDoubleInAllCounts !== false;
    for (const p of rosterBase) {
      const loc = String(p?.location || '').trim();
      if (!Object.prototype.hasOwnProperty.call(byLoc, loc)) continue;
      let w = 1;
      if (countAmbosDouble && participantCountsAsRealCostX2(p, eventRow)) w = 2;
      byLoc[loc] += w;
    }
    return byLoc;
  }

  for (const p of rosterBase) {
    const loc = String(p?.location || '').trim();
    if (Object.prototype.hasOwnProperty.call(byLoc, loc)) byLoc[loc] += 1;
  }
  return byLoc;
}
