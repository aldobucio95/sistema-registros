/**
 * Registro global: lista titular por fila (sin expansión de acompañantes).
 */

function titularOnlyPartyRows(titulars) {
  return (titulars || []).map((person) => ({
    key: `titular:${String(person?.id || '')}`,
    person,
    isSubRegistration: false,
    disableExpand: false,
  }));
}

/**
 * @param {object[]} titulars — titulares de la sección (ya filtrados)
 * @param {object[]} _rosterForPlan — reservado (compat)
 * @param {{ section?: 'active'|'waitlist'|'cancelled' }} [_options]
 * @returns {GlobalRegistryPartyRow[]}
 */
export function buildGlobalRegistryPartyRowsFromTitulars(titulars, _rosterForPlan, _options = {}) {
  return titularOnlyPartyRows(titulars);
}

export function buildGlobalRegistryPartyRowFromWaitlistVirtual(virtualPerson, _rosterForPlan = []) {
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

/**
 * Construye las tres secciones del registro global (activos / espera / cancelados).
 */
export function buildGlobalRegistryPartySections({
  activeTitulars = [],
  waitlistRows = [],
  cancelledTitulars = [],
} = {}) {
  return {
    active: titularOnlyPartyRows(activeTitulars),
    waitlist: titularOnlyPartyRows(waitlistRows),
    cancelled: titularOnlyPartyRows(cancelledTitulars),
  };
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
