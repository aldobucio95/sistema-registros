import { getBautizosCompanionsArray } from './bautizosParty.js';

const EMPTY = Object.freeze({
  phones: [],
  emergencyContacts: [],
  emergencyPhones: [],
  relationships: [],
});

function pushUnique(set, raw) {
  const s = String(raw ?? '').trim();
  if (s) set.add(s);
}

/**
 * Valores distintos ya registrados en una sede (participantes + acompañantes Bautizos).
 * @param {object[]} pool
 * @param {string} eventId
 * @param {string} location
 */
export function collectLocationFieldSuggestions(pool, eventId, location) {
  const loc = String(location || '').trim();
  const eid = String(eventId || '').trim();
  if (!loc || !eid) return { ...EMPTY };

  const phones = new Set();
  const emergencyContacts = new Set();
  const emergencyPhones = new Set();
  const relationships = new Set();

  const ingest = (row) => {
    if (!row || typeof row !== 'object') return;
    if (String(row.eventId || '') !== eid) return;
    if (String(row.location || '').trim() !== loc) return;
    pushUnique(phones, row.phone);
    pushUnique(emergencyContacts, row.emergencyContact);
    pushUnique(emergencyPhones, row.emergencyPhone);
    pushUnique(relationships, row.emergencyRelationship);
  };

  for (const p of pool || []) {
    ingest(p);
    for (const c of getBautizosCompanionsArray(p)) {
      pushUnique(phones, c?.phone);
      pushUnique(emergencyContacts, c?.emergencyContact);
      pushUnique(emergencyPhones, c?.emergencyPhone);
      pushUnique(relationships, c?.emergencyRelationship);
      pushUnique(relationships, c?.relationship);
      pushUnique(relationships, c?.linkedCompanionRelationship);
    }
  }

  const sortCi = (a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' });
  return {
    phones: [...phones].sort(sortCi),
    emergencyContacts: [...emergencyContacts].sort(sortCi),
    emergencyPhones: [...emergencyPhones].sort(sortCi),
    relationships: [...relationships].sort(sortCi),
  };
}

/** Une activos, lista de espera y cancelados de una sede. */
export function collectLocationSuggestionsFromRosterSources({
  eventId,
  location,
  active = [],
  waitlist = [],
  cancelled = [],
}) {
  return collectLocationFieldSuggestions(
    [...(active || []), ...(waitlist || []), ...(cancelled || [])],
    eventId,
    location
  );
}
