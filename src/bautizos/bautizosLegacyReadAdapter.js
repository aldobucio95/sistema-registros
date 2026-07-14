import { normalizeBirthDateToIso } from '../birthDateIsoUtils.js';
import { BAUTIZOS_ATTENDANCE } from './bautizosAttendance.js';
import { isSiValue } from './bautizosSiUtils.js';

function normalizePersonNameKey(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function getBautizosCompanionsArray(personLike) {
  const raw = personLike?.bautizosCompanions;
  if (!Array.isArray(raw)) return [];
  return raw.filter((c) => c && typeof c === 'object');
}

function companionRowIsEffectivelyEmpty(c) {
  if (!c || typeof c !== 'object') return true;
  if (isSiValue(c?.willBeBaptized)) return false;
  if (String(c?.linkedCompanionSourceKey || '').trim()) return false;
  if (String(c?.linkedCompanionName || '').trim()) return false;
  if (String(c?.linkedRegistrantId || '').trim()) return false;
  const nm = String(c?.name || '').trim();
  const rel = String(c?.relationship || '').trim();
  return nm.length < 2 && rel.length < 2;
}

function isBautizosCompanionBaptized(companionLike) {
  return isSiValue(companionLike?.willBeBaptized);
}

function buildRegistrantMetaForDedupe(roster) {
  const bautizadoIdSet = new Set();
  const bautizadoNameSet = new Set();
  const vnpToBautizadoId = new Map();
  for (const p of roster || []) {
    const id = String(p?.id || '').trim();
    if (!id) continue;
    bautizadoIdSet.add(id);
    bautizadoNameSet.add(normalizePersonNameKey(p?.name));
    const v = String(p?.vnpPersonId || '').trim();
    if (v) vnpToBautizadoId.set(v, id);
  }
  return { bautizadoIdSet, bautizadoNameSet, vnpToBautizadoId };
}

function companionIsAlsoRegistrant(c, meta) {
  const lid = String(c?.linkedRegistrantId || '').trim();
  if (lid && meta.bautizadoIdSet.has(lid)) return true;
  const vnp = String(c?.vnpPersonId || '').trim();
  if (vnp && meta.vnpToBautizadoId.has(vnp)) return true;
  const nk = normalizePersonNameKey(c?.name);
  if (nk && meta.bautizadoNameSet.has(nk)) return true;
  return false;
}

export function isLegacyBautizosParticipant(doc) {
  return getBautizosCompanionsArray(doc).some((c) => !companionRowIsEffectivelyEmpty(c));
}

function buildVirtualBaptizedCompanionRow(host, companion, index, meta) {
  const nm = String(companion?.name || '').trim();
  if (!nm || companion?.companionWaitlistPending === true) return null;
  if (companionIsAlsoRegistrant(companion, meta)) return null;
  const hostId = String(host?.id || '').trim();
  const cid = String(companion?.id || index).trim();
  return {
    ...companion,
    id: `virt-bautizado:${hostId}:${cid}`,
    eventId: host.eventId,
    name: nm,
    location: String(host?.location || '').trim(),
    status: host?.status || 'active',
    birthDate: normalizeBirthDateToIso(companion?.birthDate) || '',
    bautizosAttendanceType: BAUTIZOS_ATTENDANCE.bautizado,
    __legacyCompanionBaptized: true,
    __hostRegistrantId: hostId,
    __sourceRegistrantName: String(host?.name || '').trim(),
    __sourceDocumentId: hostId,
  };
}

function buildVirtualAcompananteRow(host, companion, index, meta) {
  const nm = String(companion?.name || '').trim();
  if (!nm || companion?.companionWaitlistPending === true) return null;
  if (isBautizosCompanionBaptized(companion)) return null;
  if (companionIsAlsoRegistrant(companion, meta)) return null;
  const hostId = String(host?.id || '').trim();
  const cid = String(companion?.id || index).trim();
  return {
    ...companion,
    id: `virt-acompanante:${hostId}:${cid}`,
    eventId: host.eventId,
    name: nm,
    location: String(host?.location || '').trim(),
    status: host?.status || 'active',
    birthDate: normalizeBirthDateToIso(companion?.birthDate) || '',
    bautizosAttendanceType: BAUTIZOS_ATTENDANCE.acompanante,
    __legacyCompanionRow: true,
    __hostRegistrantId: hostId,
    __sourceRegistrantName: String(host?.name || '').trim(),
    __sourceDocumentId: hostId,
  };
}

/**
 * Expande documentos legados con `bautizosCompanions[]` a filas planas de lectura.
 * Documentos nuevos (sin companions) pasan tal cual.
 */
export function flattenBautizosParticipantsForRead(roster) {
  const list = Array.isArray(roster) ? roster : [];
  const meta = buildRegistrantMetaForDedupe(list);
  const out = [];
  const seenIds = new Set();

  const pushRow = (row) => {
    const id = String(row?.id || '').trim();
    if (!id || seenIds.has(id)) return;
    seenIds.add(id);
    out.push(row);
  };

  for (const doc of list) {
    if (String(doc?.id || '').trim().startsWith('cw:')) continue;
    if (doc?._isCompanionWaitlistVirtual === true) continue;

    if (!isLegacyBautizosParticipant(doc)) {
      pushRow(doc);
      continue;
    }

    pushRow(doc);

    const companions = getBautizosCompanionsArray(doc);
    for (let i = 0; i < companions.length; i++) {
      const c = companions[i] || {};
      if (companionRowIsEffectivelyEmpty(c)) continue;
      if (isBautizosCompanionBaptized(c)) {
        const baptized = buildVirtualBaptizedCompanionRow(doc, c, i, meta);
        if (baptized) pushRow(baptized);
      } else {
        const acomp = buildVirtualAcompananteRow(doc, c, i, meta);
        if (acomp) pushRow(acomp);
      }
    }
  }

  return out;
}

/** Filas planas activas para conteos (excluye cancelados en filas virtuales ligadas al host). */
export function flattenBautizosActiveParticipantsForRead(roster, { includeHostWithCompanions = true } = {}) {
  const flat = flattenBautizosParticipantsForRead(roster);
  if (includeHostWithCompanions) return flat;
  return flat.filter((p) => !isLegacyBautizosParticipant(p) || !p.__legacyCompanionRow && !p.__legacyCompanionBaptized);
}

export function buildBautizadosListBaseRows(rosterInScope, { eventType, eventId } = {}) {
  const et = String(eventType || '').trim();
  if (et !== 'Bautizos') {
    return (rosterInScope || []).filter((p) => {
      if (et === 'Campa') return isSiValue(p?.willBeBaptized);
      return false;
    });
  }
  const flat = flattenBautizosParticipantsForRead(rosterInScope);
  const evId = String(eventId || '').trim();
  return flat
    .filter((p) => {
      const t = String(p?.bautizosAttendanceType || '').trim();
      return t === BAUTIZOS_ATTENDANCE.bautizado || p?.__legacyCompanionBaptized === true;
    })
    .map((p) => ({
      ...p,
      eventId: p.eventId ?? evId,
    }));
}

export function expandBautizosGlobalRegistryRows(titularRows, rosterForPlan) {
  const roster = Array.isArray(rosterForPlan) ? rosterForPlan : titularRows;
  const titularIds = new Set(
    (Array.isArray(titularRows) ? titularRows : []).map((p) => String(p?.id || '').trim()).filter(Boolean)
  );
  return flattenBautizosParticipantsForRead(roster).filter((p) => {
    const id = String(p?.id || '').trim();
    if (titularIds.has(id)) return true;
    const hostId = String(p?.__hostRegistrantId || p?.__sourceDocumentId || '').trim();
    return hostId && titularIds.has(hostId);
  });
}

export function shouldPersistBautizosCompanionsOnSave(originalPerson) {
  return isLegacyBautizosParticipant(originalPerson);
}

export function expandBautizosGlobalRegistryActivosDisplayRows(titularRows, rosterForPlan) {
  return expandBautizosGlobalRegistryRows(titularRows, rosterForPlan);
}
