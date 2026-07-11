/**
 * Asistencia al evento (día del evento): misma fuente que Transporte (`transportAttendanceBySource`).
 */
import {
  buildBautizosSourceLinkMap,
  getBautizosCompanionsArray,
  getBautizosCompanionCanonicalKey,
} from './bautizosParty.js';
import {
  isTransportAttendanceConfirmed,
  normalizeTransportPlanning,
} from './transportPlanningCore.js';

export function resolveTransportAttendanceSourceKeyForRegistryPerson(
  person,
  roster,
  eventType,
  sourceLinkMapCache = null
) {
  if (!person || typeof person !== 'object') return '';
  const id = String(person.id || '').trim();
  if (!id) return '';

  if (id.startsWith('virt-acompanante:') || id.startsWith('virt-srv:')) {
    const colon = id.indexOf(':');
    return colon >= 0 ? id.slice(colon + 1).trim() : '';
  }

  if (person.__globalRegistryCompanionRow || id.startsWith('gr-companion:')) {
    const hostId = String(person.__hostRegistrantId || '').trim();
    const parts = id.startsWith('gr-companion:') ? id.split(':') : [];
    const companionId = parts.length >= 3 ? parts.slice(2).join(':') : '';
    if (!hostId || !companionId) return '';
    if (String(eventType || '').trim() === 'Bautizos') {
      const host = (roster || []).find((p) => String(p?.id || '') === hostId);
      if (host) {
        const companions = getBautizosCompanionsArray(host);
        const idx = companions.findIndex((c) => String(c?.id || '') === companionId);
        const row = idx >= 0 ? companions[idx] : companions.find((c) => String(c?.id || '') === companionId);
        if (row) {
          const sourceLinkMap = sourceLinkMapCache || buildBautizosSourceLinkMap(roster || []);
          const canon = getBautizosCompanionCanonicalKey(hostId, row, Math.max(0, idx), sourceLinkMap);
          if (canon) return canon;
        }
      }
    }
    return `c:${hostId}::${companionId}`;
  }

  if (id.startsWith('virt-') || id.startsWith('cw:') || id.startsWith('gr-companion:')) return '';

  return `p:${id}`;
}

export function isRegistryPersonEventAttendanceConfirmed(
  person,
  plan,
  roster,
  eventType,
  sourceLinkMapCache = null
) {
  const sk = resolveTransportAttendanceSourceKeyForRegistryPerson(
    person,
    roster,
    eventType,
    sourceLinkMapCache
  );
  if (!sk) return false;
  return isTransportAttendanceConfirmed(normalizeTransportPlanning(plan), sk);
}

export function participantMatchesEventAttendanceFilter(person, filterId, plan, ctx = {}) {
  const id = String(filterId || 'all').trim();
  if (!id || id === 'all') return true;
  const attended = isRegistryPersonEventAttendanceConfirmed(
    person,
    plan,
    ctx.roster,
    ctx.eventType
  );
  if (id === 'attended') return attended;
  if (id === 'not-attended') return !attended;
  return true;
}
