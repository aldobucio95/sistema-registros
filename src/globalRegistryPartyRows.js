/**
 * Registro global: lista en cascada titular → acompañantes (una fila por persona).
 */
import {
  BAUTIZOS_ATTENDANCE,
  buildActiveRegistrantMetaForCompanionDedupe,
  buildBautizosCanonicalCompanionPlan,
  isBautizosCompanionBaptized,
} from './bautizosParty.js';
import { normalizeBirthDateToIso } from './birthDateIsoUtils.js';
import { isCompanionWaitlistVirtualParticipant } from './bautizosCompanionWaitlist.js';

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

function groupCanonicalCompanionsByHost(plan, titularIdSet) {
  const byHost = new Map();
  for (const [canonKey, entry] of plan) {
    const hostId = String(entry?.registrantId || '').trim();
    if (!hostId || !titularIdSet.has(hostId)) continue;
    if (!byHost.has(hostId)) byHost.set(hostId, []);
    byHost.get(hostId).push({ canonKey, entry });
  }
  return byHost;
}

/**
 * @param {object[]} titulars — titulares de la sección (ya filtrados)
 * @param {object[]} rosterForPlan — roster del evento para dedupe
 * @param {{ section?: 'active'|'waitlist'|'cancelled' }} [options]
 * @returns {GlobalRegistryPartyRow[]}
 */
export function buildGlobalRegistryPartyRowsFromTitulars(titulars, rosterForPlan, options = {}) {
  const list = Array.isArray(titulars) ? titulars : [];
  if (list.length === 0) return [];
  const roster = Array.isArray(rosterForPlan) ? rosterForPlan : list;
  const meta = buildActiveRegistrantMetaForCompanionDedupe(roster);
  const titularIdSet = new Set(list.map((p) => String(p?.id || '').trim()).filter(Boolean));
  const plan = buildBautizosCanonicalCompanionPlan(roster, meta, {
    includeBaptizedCompanions: true,
  });
  const companionsByHost = groupCanonicalCompanionsByHost(plan, titularIdSet);
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
    for (const { canonKey, entry } of companionsByHost.get(hostId) || []) {
      const c = entry?.sourceCompanion || {};
      if (!String(c?.name || '').trim()) continue;
      const person = buildCompanionPartyPerson(entry.sourceRegistrant || host, c, 0);
      if (isBautizosCompanionBaptized(c)) {
        baptizedStandalone.push({ person, canonKey });
      } else {
        nested.push({ person, canonKey });
      }
    }

    for (const { person, canonKey } of nested) {
      out.push({
        key: `nested:${canonKey}`,
        person,
        hostPerson: host,
        isSubRegistration: true,
        disableExpand: true,
        subRegistrationLabel: companionSubLabel(person, host),
      });
    }
    for (const { person, canonKey } of baptizedStandalone) {
      const hostName = String(host?.name || '').trim();
      out.push({
        key: `baptized:${canonKey}`,
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

function isPartyGroupAnchorRow(row) {
  const key = String(row?.key || '');
  return key.startsWith('titular:') || key.startsWith('cw:');
}

function parseRegisteredMs(person) {
  const raw = person?.registeredAt ?? person?.waitlistCreatedAt ?? person?.createdAt;
  if (raw == null || raw === '') return 0;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const n = Date.parse(String(raw));
  return Number.isFinite(n) ? n : 0;
}

function ageOfPerson(person) {
  const n = parseInt(String(person?.age ?? '').trim(), 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Ordena bloques titular→acompañantes sin separar el grupo.
 * @param {string} sortKey — mismos valores que `globalRegistryListFilters.sortBy`
 */
export function sortGlobalRegistryPartyRows(partyRows, sortKey = 'registered-desc', { getDebt } = {}) {
  const rows = Array.isArray(partyRows) ? partyRows : [];
  if (rows.length <= 1) return rows;
  const key = String(sortKey || 'registered-desc').trim();

  const blocks = [];
  let block = [];
  for (const row of rows) {
    if (isPartyGroupAnchorRow(row) && block.length > 0) {
      blocks.push(block);
      block = [];
    }
    block.push(row);
  }
  if (block.length > 0) blocks.push(block);

  const titularOf = (block) => block[0]?.person;
  const cmpName = (a, b, dir) =>
    dir *
    String(a?.name || '').localeCompare(String(b?.name || ''), 'es', { sensitivity: 'base' });
  const cmpRegistered = (a, b, dir) => {
    const fa = parseRegisteredMs(a);
    const fb = parseRegisteredMs(b);
    if (fa !== fb) return dir * (fa - fb);
    return String(a?.id ?? '').localeCompare(String(b?.id ?? ''), 'es');
  };

  blocks.sort((blockA, blockB) => {
    const a = titularOf(blockA);
    const b = titularOf(blockB);
    if (key === 'name-asc') return cmpName(a, b, 1);
    if (key === 'name-desc') return cmpName(a, b, -1);
    if (key === 'age-asc') return ageOfPerson(a) - ageOfPerson(b);
    if (key === 'age-desc') return ageOfPerson(b) - ageOfPerson(a);
    if (key === 'debt-asc' && typeof getDebt === 'function') return getDebt(a) - getDebt(b);
    if (key === 'debt-desc' && typeof getDebt === 'function') return getDebt(b) - getDebt(a);
    if (key === 'registered-asc' || key === 'none') return cmpRegistered(a, b, 1);
    return cmpRegistered(a, b, -1);
  });

  return blocks.flat();
}
