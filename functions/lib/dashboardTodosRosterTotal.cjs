'use strict';

/**
 * Bundle lógico para Cloud Functions (CommonJS).
 * Mantener alineado con `src/dashboardTodosRosterTotal.js`.
 */

const SI = 'Si';
const SI_LABEL = 'Sí';

function isCompanionWaitlistPhantomStoredParticipant(personLike) {
  if (personLike?._isCompanionWaitlistVirtual === true) return true;
  return String(personLike?.id || '').trim().startsWith('cw:');
}

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

function filterDashboardTodosRosterRows(participantRows, eventRow) {
  return (participantRows || []).filter(
    (p) =>
      !isCompanionWaitlistPhantomStoredParticipant(p) &&
      participantIsActiveInRoster(p) &&
      participantLocationInEventLocations(p, eventRow)
  );
}

function filterEventCapRosterBase(participantRows, eventRow) {
  const eid = String(eventRow?.id || '').trim();
  const scoped =
    eid === ''
      ? participantRows || []
      : (participantRows || []).filter((p) => String(p?.eventId || '').trim() === eid);
  return filterDashboardTodosRosterRows(scoped, eventRow);
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

function computeDashboardTodosRosterTotal(participantRows, eventRow) {
  if (!eventRow || typeof eventRow !== 'object') return 0;
  const eid = String(eventRow.id || '').trim();
  const scoped =
    eid === ''
      ? participantRows || []
      : (participantRows || []).filter((p) => String(p?.eventId || '').trim() === eid);
  const rosterBase = filterDashboardTodosRosterRows(scoped, eventRow);
  const evType = String(eventRow.eventType || '');

  if (evType === 'Campa') {
    return computeCampaTodosTotal(rosterBase, eventRow);
  }
  return rosterBase.length;
}

function computeRowTodosUnitContribution(personRow, eventRow) {
  if (!personRow || !eventRow || typeof eventRow !== 'object') return 0;
  const evType = String(eventRow.eventType || '');
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

function computeEventCapUsedUnitsBySede(participantRows, eventRow) {
  if (!eventRow || typeof eventRow !== 'object') return {};
  const locList = Array.isArray(eventRow.locations) ? eventRow.locations : [];
  const byLoc = Object.fromEntries(locList.map((l) => [l, 0]));
  if (locList.length === 0) return byLoc;

  const rosterBase = filterEventCapRosterBase(participantRows, eventRow);
  const evType = String(eventRow.eventType || '');

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

module.exports = {
  computeDashboardTodosRosterTotal,
  filterDashboardTodosRosterRows,
  filterEventCapRosterBase,
  computeRowTodosUnitContribution,
  computeEventCapUsedUnitsBySede,
};
