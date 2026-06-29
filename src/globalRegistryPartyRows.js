/**
 * Registro global: lista en cascada titular → acompañantes (una fila por persona).
 */
import {
  BAUTIZOS_ATTENDANCE,
  buildActiveRegistrantMetaForCompanionDedupe,
  bautizosCompanionIsAlsoBautizadoRegistrant,
  getBautizosCompanionsArray,
  isBautizosCompanionBaptized,
} from './bautizosParty.js';
import { normalizeBirthDateToIso } from './birthDateIsoUtils.js';
import { isCompanionWaitlistPending, isCompanionWaitlistVirtualParticipant } from './bautizosCompanionWaitlist.js';

function buildCompanionPartyPerson(host, companion, index) {
  const hostId = String(host?.id || '').trim();
  const cid = String(companion?.id || index).trim();
  const nm = String(companion?.name || '').trim();
  const baptized = isBautizosCompanionBaptized(companion);
  const rel = String(companion?.relationship || companion?.linkedCompanionRelationship || '').trim();
  return {
    id: `gr-companion:${hostId}:${cid}`,
    eventId: host?.eventId,
    name: nm,
    location: String(host?.location || '').trim(),
    status: host?.status || 'active',
    gender: String(companion?.gender || '').trim(),
    age: companion?.age != null ? String(companion.age).trim() : '',
    birthDate: normalizeBirthDateToIso(companion?.birthDate) || '',
    phone: String(companion?.phone || '').trim(),
    vnpPersonId: String(companion?.vnpPersonId || '').trim(),
    relationship: rel,
    baptismShirtSize: companion?.baptismShirtSize || '',
    bautizosAttendanceType: baptized
      ? BAUTIZOS_ATTENDANCE.bautizado
      : String(companion?.bautizosAttendanceType || '').trim(),
    willBeBaptized: companion?.willBeBaptized,
    wantsBautizosTransport: companion?.wantsBautizosTransport,
    registeredAt: companion?.registeredAt || host?.registeredAt,
    __globalRegistryCompanionRow: true,
    __hostRegistrantId: hostId,
    __sourceRegistrantName: String(host?.name || '').trim(),
    __companionRelationship: rel,
  };
}

function companionSubLabel(person, hostPerson) {
  const hostName = String(hostPerson?.name || person?.__sourceRegistrantName || '').trim();
  const rel = String(person?.__companionRelationship || person?.relationship || '').trim();
  if (hostName && rel) return `Acompañante de ${hostName} · ${rel}`;
  if (hostName) return `Acompañante de ${hostName}`;
  return 'Acompañante del titular';
}

/**
 * @param {object[]} titulars — titulares de la sección (ya filtrados)
 * @param {object[]} rosterForPlan — roster del evento para dedupe
 * @param {{ section?: 'active'|'waitlist'|'cancelled' }} [options]
 * @returns {GlobalRegistryPartyRow[]}
 */
export function buildGlobalRegistryPartyRowsFromTitulars(titulars, rosterForPlan, options = {}) {
  const section = options.section || 'active';
  const list = Array.isArray(titulars) ? titulars : [];
  if (list.length === 0) return [];
  const roster = Array.isArray(rosterForPlan) ? rosterForPlan : list;
  const meta = buildActiveRegistrantMetaForCompanionDedupe(roster);
  const skipPendingOnActive = section === 'active';
  const out = [];

  for (const host of list) {
    const hostId = String(host?.id || '').trim();
    if (!hostId) continue;

    out.push({
      key: `titular:${hostId}`,
      person: host,
      isSubRegistration: false,
      disableExpand: false,
    });

    const nested = [];
    const baptizedStandalone = [];
    const comps = getBautizosCompanionsArray(host);

    for (let i = 0; i < comps.length; i++) {
      const c = comps[i] || {};
      if (!String(c?.name || '').trim()) continue;
      if (skipPendingOnActive && isCompanionWaitlistPending(c)) continue;
      if (
        bautizosCompanionIsAlsoBautizadoRegistrant(
          c,
          meta.bautizadoIdSet,
          meta.bautizadoNameSet,
          meta.vnpToBautizadoId
        )
      ) {
        continue;
      }

      const person = buildCompanionPartyPerson(host, c, i);
      if (isBautizosCompanionBaptized(c)) {
        baptizedStandalone.push(person);
      } else {
        nested.push(person);
      }
    }

    for (const person of nested) {
      out.push({
        key: `nested:${person.id}`,
        person,
        hostPerson: host,
        isSubRegistration: true,
        disableExpand: true,
        subRegistrationLabel: companionSubLabel(person, host),
      });
    }
    for (const person of baptizedStandalone) {
      const hostName = String(host?.name || '').trim();
      out.push({
        key: `baptized:${person.id}`,
        person,
        hostPerson: host,
        isSubRegistration: false,
        disableExpand: true,
        subRegistrationLabel: hostName
          ? `Bautizado · antes en el grupo de ${hostName}`
          : 'Bautizado (registro propio)',
      });
    }
  }

  return out;
}

export function buildGlobalRegistryPartyRowFromWaitlistVirtual(virtualPerson) {
  const hostName = String(virtualPerson?._companionWaitlistHostName || '').trim();
  return {
    key: `cw:${String(virtualPerson?.id || '')}`,
    person: virtualPerson,
    isSubRegistration: false,
    disableExpand: true,
    subRegistrationLabel: hostName
      ? `Acompañante en espera · grupo de ${hostName}`
      : 'Acompañante en lista de espera',
  };
}

function titularOnlyPartyRows(titulars) {
  return (titulars || []).map((person) => ({
    key: `titular:${String(person?.id || '')}`,
    person,
    isSubRegistration: false,
    disableExpand: false,
  }));
}

/**
 * Construye las tres secciones del registro global (activos / espera / cancelados).
 */
export function buildGlobalRegistryPartySections({
  isBautizos,
  activeTitulars = [],
  waitlistRows = [],
  cancelledTitulars = [],
  rosterForPlan = [],
}) {
  if (!isBautizos) {
    return {
      active: titularOnlyPartyRows(activeTitulars),
      waitlist: titularOnlyPartyRows(waitlistRows),
      cancelled: titularOnlyPartyRows(cancelledTitulars),
    };
  }

  const active = buildGlobalRegistryPartyRowsFromTitulars(activeTitulars, rosterForPlan, {
    section: 'active',
  });

  const waitlist = [];
  const processedTitulars = new Set();
  for (const row of waitlistRows || []) {
    if (isCompanionWaitlistVirtualParticipant(row)) {
      waitlist.push(buildGlobalRegistryPartyRowFromWaitlistVirtual(row));
      continue;
    }
    const id = String(row?.id || '').trim();
    if (!id || processedTitulars.has(id)) continue;
    processedTitulars.add(id);
    waitlist.push(
      ...buildGlobalRegistryPartyRowsFromTitulars([row], rosterForPlan, { section: 'waitlist' })
    );
  }

  const cancelled = buildGlobalRegistryPartyRowsFromTitulars(cancelledTitulars, rosterForPlan, {
    section: 'cancelled',
  });

  return { active, waitlist, cancelled };
}

/** Extrae personas planas para conteos de toolbar / filtros. */
export function globalRegistryPartyRowsToPersons(partyRows) {
  return (partyRows || []).map((r) => r.person);
}
