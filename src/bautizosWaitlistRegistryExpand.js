/**
 * Expansión de filas de lista de espera (titulares + acompañantes pending en titulares activos).
 */
import { expandBautizosGlobalRegistryRows, getBautizosCompanionsArray } from './bautizosParty.js';
import {
  buildCompanionWaitlistVirtualParticipant,
  isCompanionWaitlistPending,
} from './bautizosCompanionWaitlist.js';

function inferEventLikeFromRoster(roster, eventLike) {
  if (eventLike && eventLike.id) return eventLike;
  const first = (roster || []).find((p) => p?.eventId);
  return { id: first?.eventId, eventType: 'Bautizos' };
}

/**
 * Registro global / conteos con estado «Lista de espera»:
 * - Titulares en espera + acompañantes canónicos (Parte A)
 * - Acompañantes con `companionWaitlistPending` en titulares activos (Parte B)
 */
export function expandBautizosWaitlistRegistryRows(titularWaitlistRows, rosterForPlan, eventLike = null) {
  const titulars = Array.isArray(titularWaitlistRows) ? titularWaitlistRows : [];
  const roster = Array.isArray(rosterForPlan) ? rosterForPlan : titulars;
  const ev = inferEventLikeFromRoster(roster, eventLike);
  const seenIds = new Set();
  const out = [];

  const partA = expandBautizosGlobalRegistryRows(titulars, roster);
  for (const row of partA) {
    const id = String(row?.id || '').trim();
    if (!id || seenIds.has(id)) continue;
    seenIds.add(id);
    if (row.__globalRegistryVirtual) {
      out.push({ ...row, status: 'waitlist' });
    } else {
      out.push(row);
    }
  }

  for (const host of roster) {
    const st = host?.status || 'active';
    if (st !== 'active') continue;
    for (const c of getBautizosCompanionsArray(host)) {
      if (!isCompanionWaitlistPending(c)) continue;
      const row = buildCompanionWaitlistVirtualParticipant(host, c, ev, roster);
      const id = String(row?.id || '').trim();
      if (!id || seenIds.has(id)) continue;
      seenIds.add(id);
      out.push(row);
    }
  }

  return out;
}

/**
 * Lista de espera en registro global / sede (vista lista):
 * titulares en espera + acompañantes `companionWaitlistPending` en titulares activos.
 * Los acompañantes del titular en espera se muestran al expandir la fila, no como filas canónicas extra.
 */
export function expandBautizosWaitlistRegistryDisplayRows(
  titularWaitlistRows,
  rosterForPlan,
  eventLike = null,
  visibleLocations = null
) {
  const titulars = Array.isArray(titularWaitlistRows) ? titularWaitlistRows : [];
  const roster = Array.isArray(rosterForPlan) ? rosterForPlan : titulars;
  const ev = inferEventLikeFromRoster(roster, eventLike);
  const locSet =
    Array.isArray(visibleLocations) && visibleLocations.length > 0
      ? new Set(visibleLocations.map((l) => String(l).trim()).filter(Boolean))
      : null;
  const seenIds = new Set();
  const out = [];

  for (const row of titulars) {
    const id = String(row?.id || '').trim();
    if (!id || seenIds.has(id)) continue;
    seenIds.add(id);
    out.push(row);
  }

  for (const host of roster) {
    if ((host?.status || 'active') !== 'active') continue;
    const hostLoc = String(host?.location || '').trim();
    if (locSet && !locSet.has(hostLoc)) continue;
    for (const c of getBautizosCompanionsArray(host)) {
      if (!isCompanionWaitlistPending(c)) continue;
      const row = buildCompanionWaitlistVirtualParticipant(host, c, ev, roster);
      const id = String(row?.id || '').trim();
      if (!id || seenIds.has(id)) continue;
      seenIds.add(id);
      out.push(row);
    }
  }

  return out;
}
