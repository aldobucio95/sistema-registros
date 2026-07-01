'use strict';

/**
 * Bundle lógico para Cloud Functions (CommonJS).
 * Mantener alineado con `src/dashboardTodosRosterTotal.js` y helpers canónicos en `src/bautizosParty.js`.
 */

const SI = 'Si';
const SI_LABEL = 'Sí';

function isSiValue(v) {
  const s = String(v ?? '').trim();
  if (s === SI || s === SI_LABEL) return true;
  if (s.toLowerCase() === 'sí') return true;
  if (s.length === 2 && s[0] === 'S' && (s[1] === '?' || s[1] === '\uFFFD')) return true;
  return false;
}

const BAUTIZOS_ATTENDANCE = {
  bautizado: 'bautizado',
  servidor: 'servidor',
  empleado: 'empleado',
  cortesia: 'cortesia',
};

function normalizeBautizosAttendanceType(raw) {
  const s = String(raw || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (s === 'servidor') return BAUTIZOS_ATTENDANCE.servidor;
  if (s === 'empleado') return BAUTIZOS_ATTENDANCE.empleado;
  if (s === 'cortesia') return BAUTIZOS_ATTENDANCE.cortesia;
  return BAUTIZOS_ATTENDANCE.bautizado;
}

function getBautizosCompanionsArray(personLike) {
  const raw = personLike?.bautizosCompanions;
  if (!Array.isArray(raw)) return [];
  return raw.filter((c) => c && typeof c === 'object');
}

function isBautizosCompanionBaptized(companionLike) {
  return isSiValue(companionLike?.willBeBaptized);
}

function normalizePersonNameKey(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function parseLinkSourceKey(sk) {
  const s = String(sk || '').trim();
  if (!s) return null;
  if (s.startsWith('p:')) {
    const participantId = s.slice(2).trim();
    return participantId ? { kind: 'participant', participantId } : null;
  }
  if (s.startsWith('c:')) {
    const rest = s.slice(2);
    const idx = rest.indexOf('::');
    if (idx === -1) return null;
    const hostId = rest.slice(0, idx).trim();
    const companionId = rest.slice(idx + 2).trim();
    return hostId && companionId ? { kind: 'companion', hostId, companionId } : null;
  }
  return null;
}

function buildBautizosSourceLinkMap(roster) {
  const m = new Map();
  for (const p of roster || []) {
    const pid = String(p?.id || '').trim();
    if (!pid) continue;
    for (const c of getBautizosCompanionsArray(p)) {
      const cid = String(c?.id || '').trim();
      if (!cid) continue;
      const sk = String(c?.linkedCompanionSourceKey || '').trim();
      if (!sk) continue;
      m.set(`c:${pid}::${cid}`, sk);
    }
  }
  return m;
}

function resolveBautizosUltimateSourceKey(startSk, sourceLinkMap) {
  const visited = new Set();
  let current = String(startSk || '').trim();
  while (current && current.startsWith('c:') && !visited.has(current)) {
    visited.add(current);
    const next = sourceLinkMap?.get?.(current);
    if (!next || next === current) return current;
    current = String(next).trim();
  }
  return current;
}

function getBautizosCompanionCanonicalKey(registrantId, companionRow, index, sourceLinkMap) {
  const sk = String(companionRow?.linkedCompanionSourceKey || '').trim();
  if (sk.startsWith('p:')) return sk;
  if (sk.startsWith('c:')) return resolveBautizosUltimateSourceKey(sk, sourceLinkMap);
  const cid = String(companionRow?.id || '').trim();
  if (cid) return `c:${String(registrantId)}::${cid}`;
  return `anon:${String(registrantId)}:${index}`;
}

function bautizosCompanionIsAlsoBautizadoRegistrant(c, bautizadoIdSet, bautizadoNameSet, vnpToBautizadoId) {
  const sk = String(c?.linkedCompanionSourceKey || '').trim();
  if (sk.startsWith('p:')) {
    const id = String(sk.slice(2)).trim();
    if (id && bautizadoIdSet?.has?.(id)) return true;
  }
  const v = String(c?.vnpPersonId || c?.linkedVnpId || '').trim();
  if (v && vnpToBautizadoId?.has?.(v)) return true;
  const n1 = normalizePersonNameKey(c?.name);
  const n2 = normalizePersonNameKey(c?.linkedCompanionName);
  if (n1 && bautizadoNameSet?.has?.(n1)) return true;
  if (n2 && bautizadoNameSet?.has?.(n2)) return true;
  return false;
}

function buildBautizosCanonicalCompanionPlan(roster, bautizadoMeta, options) {
  const includeBaptizedCompanions = options?.includeBaptizedCompanions === true;
  const waitlistOnly = options?.waitlistOnly === true;
  const list = Array.isArray(roster) ? roster : [];
  const idMap = new Map();
  for (const p of list) {
    const pid = String(p?.id || '').trim();
    if (pid) idMap.set(pid, p);
  }
  const ownIndex = new Map();
  for (const p of list) {
    const comps = getBautizosCompanionsArray(p);
    for (let i = 0; i < comps.length; i++) {
      const c = comps[i] || {};
      const cid = String(c?.id || '').trim();
      if (!cid) continue;
      const ownKey = `c:${String(p.id)}::${cid}`;
      if (!ownIndex.has(ownKey)) ownIndex.set(ownKey, { row: c, registrant: p });
    }
  }
  const sourceLinkMap = buildBautizosSourceLinkMap(list);
  const meta = bautizadoMeta || { bautizadoIdSet: new Set(), bautizadoNameSet: new Set(), vnpToBautizadoId: new Map() };
  const plan = new Map();
  for (const p of list) {
    const comps = getBautizosCompanionsArray(p);
    for (let i = 0; i < comps.length; i++) {
      const c = comps[i] || {};
      const nm = String(c?.name || '').trim();
      if (!nm) continue;
      if (waitlistOnly) {
        if (c?.companionWaitlistPending !== true) continue;
      } else if (c?.companionWaitlistPending === true) continue;
      if (!includeBaptizedCompanions && isBautizosCompanionBaptized(c)) continue;
      if (bautizosCompanionIsAlsoBautizadoRegistrant(c, meta.bautizadoIdSet, meta.bautizadoNameSet, meta.vnpToBautizadoId)) continue;
      const canon = getBautizosCompanionCanonicalKey(p.id, c, i, sourceLinkMap);
      if (!canon) continue;
      if (canon.startsWith('p:')) continue;
      if (plan.has(canon)) continue;
      let hostRegistrant = p;
      let hostRow = c;
      const parsed = parseLinkSourceKey(canon);
      if (parsed?.kind === 'companion' && parsed.hostId && idMap.has(parsed.hostId)) {
        const idx = ownIndex.get(canon);
        if (idx) {
          hostRegistrant = idx.registrant;
          hostRow = idx.row;
        }
      }
      plan.set(canon, {
        canonKey: canon,
        registrantId: String(hostRegistrant.id),
        sourceCompanion: hostRow,
        sourceRegistrant: hostRegistrant,
      });
    }
  }
  return plan;
}

function buildBautizadoMetaForCanonical(activeBautizadoRoster) {
  const bautizadoIdSet = new Set();
  const bautizadoNameSet = new Set();
  const vnpToBautizadoId = new Map();
  for (const p of activeBautizadoRoster || []) {
    const id = String(p?.id || '').trim();
    if (!id) continue;
    bautizadoIdSet.add(id);
    bautizadoNameSet.add(normalizePersonNameKey(p?.name));
    const v = String(p?.vnpPersonId || '').trim();
    if (v) vnpToBautizadoId.set(v, id);
  }
  return { bautizadoIdSet, bautizadoNameSet, vnpToBautizadoId };
}

/* --- Totales dashboard modo Todos (src/dashboardTodosRosterTotal.js) --- */

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

function getAmbosServeInSegmentOrEmpty(personLike) {
  const mix = String(personLike?.ambosServeInSegment || '').trim();
  return mix === 'Teens' || mix === 'Jóvenes' ? mix : '';
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
    (p) => participantIsActiveInRoster(p) && participantLocationInEventLocations(p, eventRow)
  );
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

function computeDashboardTodosRosterTotal(participantRows, eventRow) {
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

/** @returns {number|null} null = requiere recálculo completo (Bautizos) */
function computeRowTodosUnitContribution(personRow, eventRow) {
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

module.exports = {
  computeDashboardTodosRosterTotal,
  filterDashboardTodosRosterRows,
  computeRowTodosUnitContribution,
};
