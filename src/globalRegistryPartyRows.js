/**
 * Registro global: lista en cascada titular → acompañantes (una fila por persona).
 */
import {
  BAUTIZOS_ATTENDANCE,
  BAUTIZOS_SERVER_ASSIGNMENT_LABEL,
  bautizosCompanionParticipatesAsServer,
  buildActiveRegistrantMetaForCompanionDedupe,
  buildBautizosCanonicalCompanionPlan,
  buildBautizosDashboardCanonicalCompanionPlan,
  buildBautizosCompanionTransportLineLike,
  countBautizosActivePeopleUnits,
  countBautizosDashboardPeople,
  filterBautizosActiveTitularRoster,
  getBautizosCompanionsArray,
  isBautizosCompanionBaptized,
  isBautizosPastorAttendance,
  normalizePersonNameKey,
  resolveBautizosCompanionLinkedRegistrantId,
} from './bautizosParty.js';
import { normalizeBirthDateToIso } from './birthDateIsoUtils.js';
import {
  isCompanionWaitlistPending,
  isCompanionWaitlistVirtualParticipant,
  resolveCompanionWaitlistVirtualLocation,
} from './bautizosCompanionWaitlist.js';

function rosterById(roster) {
  const m = new Map();
  for (const p of roster || []) {
    const id = String(p?.id || '').trim();
    if (id) m.set(id, p);
  }
  return m;
}

function resolveCompanionPartyPersonStatus(host, companion, roster) {
  const byId = rosterById(roster);
  const pid = resolveBautizosCompanionLinkedRegistrantId(companion);
  if (pid && byId.has(pid)) {
    return String(byId.get(pid)?.status || 'active');
  }
  return host?.status || 'active';
}

function buildCompanionPartyPerson(host, companion, index, rosterForPlan = [], options = {}) {
  const hostId = String(host?.id || '').trim();
  const canonKey = String(options?.canonKey || '').trim();
  const cid = String(companion?.id || '').trim() || String(index);
  const rowIdSuffix = canonKey
    ? canonKey.replace(/[^a-z0-9:_-]/gi, '_').slice(0, 96)
    : cid;
  const nm = String(companion?.name || '').trim();
  const baptized = isBautizosCompanionBaptized(companion);
  const rel = String(companion?.relationship || companion?.linkedCompanionRelationship || '').trim();
  const transportLine = buildBautizosCompanionTransportLineLike(host, companion);
  return {
    id: `gr-companion:${hostId}:${rowIdSuffix}`,
    eventId: host?.eventId,
    name: nm,
    location: String(host?.location || '').trim(),
    status: resolveCompanionPartyPersonStatus(host, companion, rosterForPlan),
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
    wantsBautizosTransport: transportLine.wantsBautizosTransport,
    llegaEnCarro: transportLine.llegaEnCarro,
    regresaEnCarro: transportLine.regresaEnCarro,
    carrosLlegada: transportLine.carrosLlegada,
    travelFrom: transportLine.travelFrom,
    travelTo: transportLine.travelTo,
    transportType: transportLine.transportType,
    isServer: bautizosCompanionParticipatesAsServer(companion) ? 'Si' : 'No',
    serverAssignment: bautizosCompanionParticipatesAsServer(companion)
      ? String(companion?.serverAssignment || '').trim() || BAUTIZOS_SERVER_ASSIGNMENT_LABEL
      : '',
    assignedServeArea: String(companion?.assignedServeArea || '').trim(),
    preferredServeArea: String(companion?.preferredServeArea || '').trim(),
    servesInCongress: companion?.servesInCongress || 'No',
    congressServeArea: companion?.congressServeArea || '',
    registeredAt: companion?.registeredAt || host?.registeredAt,
    __globalRegistryCompanionRow: true,
    __hostRegistrantId: hostId,
    __sourceRegistrantName: String(host?.name || '').trim(),
    __companionRelationship: rel,
    __globalRegistryCanonKey: canonKey || undefined,
    __sourceCompanionId: String(companion?.id || '').trim() || undefined,
    ...(isBautizosPastorAttendance(host) ? { __pastorCourtesyCompanion: true } : {}),
    ...(isCompanionWaitlistPending(companion) ? { __companionWaitlistPending: true } : {}),
  };
}

function companionSubLabel(person, hostPerson) {
  const hostName = String(hostPerson?.name || person?.__sourceRegistrantName || '').trim();
  const rel = String(person?.__companionRelationship || person?.relationship || '').trim();
  if (hostName && rel) return `Acompañante de ${hostName} · ${rel}`;
  if (hostName) return `Acompañante de ${hostName}`;
  return 'Acompañante del titular';
}

/** Clave estable para deduplicar la misma persona en exportación (VNP > nombre+sede > canon). */
export function globalRegistryCompanionExportIdentityKey(person, canonKey = '') {
  const vnp = String(person?.vnpPersonId || '').trim();
  if (vnp) return `vnp:${vnp}`;
  const name = normalizePersonNameKey(person?.name);
  const loc = String(person?.location || '').trim().toLowerCase();
  if (name && loc) return `name:${loc}:${name}`;
  const ck = String(canonKey || person?.__globalRegistryCanonKey || '').trim();
  if (ck) return `canon:${ck}`;
  return `id:${String(person?.id || '').trim()}`;
}

function shouldSkipDuplicateCompanionExport(person, canonKey, seenIdentityKeys) {
  if (!person?.__globalRegistryCompanionRow) return false;
  const key = globalRegistryCompanionExportIdentityKey(person, canonKey);
  if (seenIdentityKeys.has(key)) return true;
  seenIdentityKeys.add(key);
  return false;
}

function resolveCompanionIndexInHost(host, companion) {
  const comps = getBautizosCompanionsArray(host);
  const targetId = String(companion?.id || '').trim();
  if (targetId) {
    const byId = comps.findIndex((c) => String(c?.id || '').trim() === targetId);
    if (byId >= 0) return byId;
  }
  const targetName = normalizePersonNameKey(companion?.name);
  if (targetName) {
    const byName = comps.findIndex((c) => normalizePersonNameKey(c?.name) === targetName);
    if (byName >= 0) return byName;
  }
  return 0;
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

/** Titulares activos (misma base que tarjeta «Registros totales» del dashboard). */
export function filterBautizosRosterForDashboardCanonicalPlan(roster) {
  return filterBautizosActiveTitularRoster(roster);
}

function buildDashboardAlignedCanonicalCompanionPlan(roster) {
  const activeOnly = filterBautizosRosterForDashboardCanonicalPlan(roster);
  return buildBautizosDashboardCanonicalCompanionPlan(activeOnly, {
    includeBaptizedCompanions: true,
    linkLookupRoster: roster,
  });
}

function buildSectionCanonicalCompanionPlan(roster, section) {
  if (section === 'active') {
    return buildDashboardAlignedCanonicalCompanionPlan(roster);
  }
  const nonCancelled = (roster || []).filter((p) => (p?.status || 'active') !== 'cancelled');
  const meta = buildActiveRegistrantMetaForCompanionDedupe(nonCancelled);
  return buildBautizosCanonicalCompanionPlan(roster, meta, { includeBaptizedCompanions: true });
}

/**
 * Conteo de activos alineado al dashboard: filas de party sin acompañantes `companionWaitlistPending`
 * (esos no entran en «Registros totales» ni en cupo activo).
 */
export function countBautizosGlobalRegistryActivePartyRows(partyRows) {
  return (partyRows || []).filter((r) => {
    if (r?.companionWaitlistPending) return false;
    const st = String(r?.person?.status || 'active');
    return st !== 'cancelled' && st !== 'archived';
  }).length;
}

/** Total activos del registro global = misma noción que `countBautizosDashboardPeople` (alcance Todos). */
export function countBautizosGlobalRegistryActivePeople(activeTitulars, rosterForPlan) {
  const titulars = Array.isArray(activeTitulars) ? activeTitulars : [];
  const roster = Array.isArray(rosterForPlan) ? rosterForPlan : titulars;
  const activeRoster = filterBautizosRosterForDashboardCanonicalPlan(roster);
  const plan = buildDashboardAlignedCanonicalCompanionPlan(roster);
  return countBautizosDashboardPeople(activeRoster, [...plan.values()], 'all');
}

/** Misma noción que cupo activo / tarjeta «Registros totales» a partir del roster activo del alcance. */
export function countBautizosActivePeopleUnitsFromRoster(activeRosterBase) {
  return countBautizosActivePeopleUnits(activeRosterBase, { includeBaptizedCompanions: true });
}

/** Separa filas activas exportables de acompañantes en espera o cancelados bajo titular activo. */
export function partitionGlobalRegistryActivePartyRowsForExport(partyRows) {
  const rows = Array.isArray(partyRows) ? partyRows : [];
  const activeCountable = [];
  const companionWaitlistUnderActive = [];
  const companionCancelledUnderActive = [];
  for (const row of rows) {
    const st = String(row?.person?.status || 'active');
    if (row?.companionWaitlistPending) {
      companionWaitlistUnderActive.push(row);
    } else if (st === 'cancelled' || st === 'archived') {
      companionCancelledUnderActive.push(row);
    } else {
      activeCountable.push(row);
    }
  }
  return { activeCountable, companionWaitlistUnderActive, companionCancelledUnderActive };
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
  const section = options.section || 'active';
  const titularIdSet = new Set(list.map((p) => String(p?.id || '').trim()).filter(Boolean));
  const plan = buildSectionCanonicalCompanionPlan(roster, section);
  const companionsByHost = groupCanonicalCompanionsByHost(plan, titularIdSet);
  const out = [];
  const seenCompanionExportKeys = new Set();

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
      const canonicalHost = entry?.sourceRegistrant || host;
      const compIndex = resolveCompanionIndexInHost(canonicalHost, c);
      const person = buildCompanionPartyPerson(canonicalHost, c, compIndex, roster, { canonKey });
      if (shouldSkipDuplicateCompanionExport(person, canonKey, seenCompanionExportKeys)) continue;
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

    for (const c of getBautizosCompanionsArray(host)) {
      if (!isCompanionWaitlistPending(c) || !String(c?.name || '').trim()) continue;
      const compIndex = resolveCompanionIndexInHost(host, c);
      const person = buildCompanionPartyPerson(host, c, compIndex, roster);
      if (shouldSkipDuplicateCompanionExport(person, `wl:${hostId}:${String(c?.id || compIndex)}`, seenCompanionExportKeys)) {
        continue;
      }
      out.push({
        key: `wl-nested:${hostId}:${String(c?.id || compIndex)}`,
        person,
        hostPerson: host,
        isSubRegistration: true,
        disableExpand: true,
        subRegistrationLabel: companionSubLabel(person, host),
        companionWaitlistPending: true,
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

export function buildGlobalRegistryPartyRowFromWaitlistVirtual(virtualPerson, rosterForPlan = []) {
  const hostName = String(virtualPerson?._companionWaitlistHostName || '').trim();
  const location = resolveCompanionWaitlistVirtualLocation(virtualPerson, rosterForPlan);
  const person =
    location && String(virtualPerson?.location || '').trim() !== location
      ? { ...virtualPerson, location }
      : virtualPerson;
  return {
    key: `cw:${String(virtualPerson?.id || '')}`,
    person,
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
      waitlist.push(buildGlobalRegistryPartyRowFromWaitlistVirtual(row, rosterForPlan));
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

/** Filas activas visibles (excluye acompañantes cancelados/archivados o en espera bajo titular activo). */
export function visibleBautizosActiveGlobalRegistryPartyRows(partyRows) {
  return partitionGlobalRegistryActivePartyRowsForExport(partyRows).activeCountable;
}

/** Filtra filas de party evaluando cada persona (titular o acompañante) con los filtros de lista. */
export function filterGlobalRegistryPartyRowsByParticipantFilters(partyRows, matchesPerson) {
  return (partyRows || []).filter((row) => {
    const person = row?.person;
    if (!person || typeof matchesPerson !== 'function') return false;
    return matchesPerson(person);
  });
}

/**
 * Total de coincidencias del registro global respetando el filtro de estado de registro.
 * En «activos», no cuenta acompañantes cuyo vínculo apunta a un titular cancelado.
 */
export function countGlobalRegistryCoincidenceTotal({
  isBautizos,
  activeRows = [],
  waitlistRows = [],
  cancelledRows = [],
  invalidCount = 0,
  filterRegistrationStatus = 'all',
}) {
  const reg = String(filterRegistrationStatus || 'all').trim();
  let total = Number(invalidCount) || 0;
  if (reg === 'active') {
    total += isBautizos
      ? countBautizosGlobalRegistryActivePartyRows(activeRows)
      : activeRows.length;
    return total;
  }
  if (reg === 'waitlist') return total + waitlistRows.length;
  if (reg === 'cancelled') return total + cancelledRows.length;
  const activeN = isBautizos
    ? countBautizosGlobalRegistryActivePartyRows(activeRows)
    : activeRows.length;
  if (!isBautizos) return total + activeN + waitlistRows.length + cancelledRows.length;
  const part = partitionGlobalRegistryActivePartyRowsForExport(activeRows);
  return (
    total +
    part.activeCountable.length +
    waitlistRows.length +
    cancelledRows.length +
    part.companionCancelledUnderActive.length +
    part.companionWaitlistUnderActive.length
  );
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
