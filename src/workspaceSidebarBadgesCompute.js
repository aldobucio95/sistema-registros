import { participantHasBaptismChip } from './campaBaptism.js';
import { computeWaitlistCountsForEvent } from './waitlistDashboardCounts.js';
import { isPastorParticipant } from './pastorAttendance.js';
import { isSiValue } from './publicRegistrationLogic.js';

const PARTICIPANT_STATUS_ARCHIVED = 'archived';
const PARTICIPANT_STATUS_CANCELLED = 'cancelled';

const participantIsArchived = (p) => (p?.status || 'active') === PARTICIPANT_STATUS_ARCHIVED;
const participantIsCancelled = (p) => (p?.status || 'active') === PARTICIPANT_STATUS_CANCELLED;
const participantIsRosterRow = (p) => {
  const s = p?.status || 'active';
  return s !== 'waitlist' && s !== PARTICIPANT_STATUS_ARCHIVED;
};
const participantIsActiveInRoster = (p) => participantIsRosterRow(p) && !participantIsCancelled(p);
const participantIsActiveInEvent = (p) => !participantIsArchived(p);

export const EMPTY_WORKSPACE_SIDEBAR_BADGES = Object.freeze({
  bautizados: 0,
  servidores: 0,
  acompanantes: 0,
  pastores: 0,
  sedeCounts: {},
  attendanceLines: [],
  waitlistLines: [],
  activeTotalDeduped: 0,
  waitlistTotalDeduped: 0,
  cancelledTotal: 0,
  totalDeduped: 0,
});

/** Contadores barra lateral del workspace (función pura; usable en Web Worker). */
export function computeWorkspaceSidebarBadges({ ev, visibleLocations, allParticipants, data }) {
  const evId = ev?.id;
  const et = String(ev?.eventType || '').trim();
  const scopeLocs =
    Array.isArray(visibleLocations) && visibleLocations.length > 0
      ? visibleLocations.map((x) => String(x).trim()).filter(Boolean)
      : (Array.isArray(ev?.locations) ? ev.locations : []).map((x) => String(x).trim()).filter(Boolean);
  const scopeSet = new Set(scopeLocs);
  if (!evId || !et) return { ...EMPTY_WORKSPACE_SIDEBAR_BADGES };

  const sedeCounts = {};
  for (const loc of ev.locations || []) {
    const lk = String(loc).trim();
    if (!scopeSet.has(lk)) continue;
    const rows = data[lk] || [];
    sedeCounts[lk] = rows.length;
  }

  let bautizados = 0;
  let servidores = 0;
  let acompanantes = 0;
  let becados = 0;
  let pastores = 0;
  let attendanceLines = [];
  let waitlistLines = [];
  let activeTotalDeduped = 0;
  let waitlistTotalDeduped = 0;
  let cancelledTotal = 0;
  let totalDeduped = 0;

  const rosterInScope = (allParticipants || []).filter(
    (p) =>
      String(p?.eventId || '') === String(evId) &&
      participantIsActiveInEvent(p) &&
      participantIsActiveInRoster(p) &&
      !participantIsCancelled(p) &&
      scopeSet.has(String(p.location || '').trim())
  );

  for (const p of rosterInScope) {
    if (isPastorParticipant(p, et)) pastores += 1;
  }

  for (const p of allParticipants || []) {
    if (String(p?.eventId || '') !== String(evId)) continue;
    if (!participantIsActiveInEvent(p) || !participantIsActiveInRoster(p)) continue;
    const loc = String(p.location || '').trim();
    if (!scopeSet.has(loc)) continue;
    if (et === 'Campa' && participantHasBaptismChip(p, et)) {
      bautizados += 1;
    }
    if (et === 'Campa' && isSiValue(p.isServer)) {
      servidores += 1;
    }
  }

  if (et === 'Campa') {
    for (const p of rosterInScope) {
      if (isSiValue(p.isScholarship)) becados += 1;
    }
    totalDeduped = rosterInScope.length;
    activeTotalDeduped = totalDeduped;
    attendanceLines = [
      { label: 'Bautizados', count: bautizados },
      { label: 'Servidores', count: servidores },
      { label: 'Becados', count: becados },
    ];
    const waitlistCounts = computeWaitlistCountsForEvent(allParticipants, ev, scopeLocs);
    waitlistTotalDeduped = waitlistCounts.global.total;
  } else {
    totalDeduped = rosterInScope.length;
    activeTotalDeduped = totalDeduped;
    attendanceLines = [{ label: 'Inscritos', count: totalDeduped }];
    const waitlistCounts = computeWaitlistCountsForEvent(allParticipants, ev, scopeLocs);
    waitlistTotalDeduped = waitlistCounts.global.total;
  }

  cancelledTotal = (allParticipants || []).filter(
    (p) =>
      String(p?.eventId || '') === String(evId) &&
      participantIsCancelled(p) &&
      !participantIsArchived(p) &&
      scopeSet.has(String(p.cancelledFromLocation || p.location || '').trim())
  ).length;

  return {
    bautizados,
    servidores,
    acompanantes,
    pastores,
    sedeCounts,
    attendanceLines,
    waitlistLines,
    activeTotalDeduped,
    waitlistTotalDeduped,
    cancelledTotal,
    totalDeduped,
  };
}
