/**
 * Índice memoizable del roster Bautizos: un pase sobre allParticipants para chips,
 * acompañantes visibles y filas virtuales de espera por sede.
 */
import {
  buildActiveRegistrantMetaForCompanionDedupe,
  buildBautizosCanonicalCompanionPlan,
  getBautizosCompanionsArray,
  getBautizosCompanionsVisibleForRegistrant,
} from './bautizosParty.js';
import {
  buildCompanionWaitlistVirtualParticipant,
  isCompanionWaitlistPending,
} from './bautizosCompanionWaitlist.js';

const EMPTY_MAP = new Map();

function isActiveOrWaitlistForCompanionDisplay(p) {
  const status = p?.status || 'active';
  if (status === 'cancelled' || status === 'archived') return false;
  return status === 'active' || status === 'waitlist';
}

function isActiveTitularInEvent(p, eventId) {
  if (String(p?.eventId || '') !== eventId) return false;
  return (p?.status || 'active') === 'active';
}

export function createEmptyBautizosRosterIndex() {
  return {
    eventId: '',
    activeEventRoster: [],
    companionChipCountByRegistrant: EMPTY_MAP,
    visibleCompanionsByRegistrant: EMPTY_MAP,
    companionWaitlistVirtualByLocation: EMPTY_MAP,
    canonicalPlanActive: EMPTY_MAP,
    canonicalPlanAll: EMPTY_MAP,
    meta: null,
  };
}

/**
 * @param {object[]} allParticipants
 * @param {{ id?: string, eventType?: string }} eventLike
 */
export function buildBautizosRosterIndex(allParticipants, eventLike) {
  if (!eventLike || String(eventLike.eventType || '') !== 'Bautizos' || !eventLike.id) {
    return createEmptyBautizosRosterIndex();
  }

  const eid = String(eventLike.id);
  const participants = Array.isArray(allParticipants) ? allParticipants : [];

  const activeEventRoster = participants.filter(
    (p) => String(p?.eventId || '') === eid && isActiveOrWaitlistForCompanionDisplay(p)
  );

  const visibleCompanionsByRegistrant = new Map();
  const companionChipCountByRegistrant = new Map();
  for (const p of activeEventRoster) {
    const pid = String(p?.id || '').trim();
    if (!pid) continue;
    const visible = getBautizosCompanionsVisibleForRegistrant(pid, activeEventRoster);
    visibleCompanionsByRegistrant.set(pid, visible);
    if (visible.length > 0) companionChipCountByRegistrant.set(pid, visible.length);
  }

  const companionWaitlistVirtualByLocation = new Map();
  for (const p of participants) {
    if (!isActiveTitularInEvent(p, eid)) continue;
    const locKey = String(p.location || '').trim();
    if (!locKey) continue;
    for (const c of getBautizosCompanionsArray(p)) {
      if (!isCompanionWaitlistPending(c)) continue;
      const row = buildCompanionWaitlistVirtualParticipant(p, c, eventLike, participants);
      if (!companionWaitlistVirtualByLocation.has(locKey)) {
        companionWaitlistVirtualByLocation.set(locKey, []);
      }
      companionWaitlistVirtualByLocation.get(locKey).push(row);
    }
  }

  const rosterForPlan = participants.filter(
    (p) =>
      String(p?.eventId || '') === eid &&
      (p?.status || 'active') === 'active'
  );
  const meta = buildActiveRegistrantMetaForCompanionDedupe(rosterForPlan);
  const canonicalPlanActive = buildBautizosCanonicalCompanionPlan(rosterForPlan, meta, {
    includeBaptizedCompanions: false,
  });
  const canonicalPlanAll = buildBautizosCanonicalCompanionPlan(rosterForPlan, meta, {
    includeBaptizedCompanions: true,
  });

  return {
    eventId: eid,
    activeEventRoster,
    companionChipCountByRegistrant,
    visibleCompanionsByRegistrant,
    companionWaitlistVirtualByLocation,
    canonicalPlanActive,
    canonicalPlanAll,
    meta,
  };
}

/** Filas virtuales de espera para una sede desde el índice precalculado. */
export function getCompanionWaitlistVirtualFromIndex(index, loc) {
  if (!index?.companionWaitlistVirtualByLocation) return [];
  const locKey = String(loc || '').trim();
  return index.companionWaitlistVirtualByLocation.get(locKey) || [];
}
