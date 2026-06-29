/**
 * Acompañantes en lista de espera ligados a un titular activo (Bautizos).
 * Permanecen en `bautizosCompanions` del host pero no consumen cupo ni precio hasta promoverse.
 */
import {
  getBautizosCompanionsArray,
  getBautizosLineListPrice,
  isBautizosCompanionBaptized,
} from './bautizosParty.js';
import { getBautizosListPriceBreakdown, getBautizosTitularListPrice } from './publicRegistrationLogic.js';
import { filterEventCapRosterBase } from './dashboardTodosRosterTotal.js';
import { computeEventCapUnitsDelta } from './eventCapUnits.js';

export const COMPANION_WAITLIST_PENDING = 'companionWaitlistPending';
export const COMPANION_WAITLIST_CREATED_AT = 'companionWaitlistCreatedAt';
export const COMPANION_WAITLIST_PROMOTE_PRICE = 'companionWaitlistPromoteListPrice';

export function isCompanionWaitlistPending(companionLike) {
  return companionLike?.[COMPANION_WAITLIST_PENDING] === true;
}

export function companionWaitlistVirtualId(hostId, companionId) {
  return `cw:${String(hostId || '').trim()}::${String(companionId || '').trim()}`;
}

export function parseCompanionWaitlistVirtualId(id) {
  const s = String(id || '').trim();
  if (!s.startsWith('cw:')) return null;
  const rest = s.slice(3);
  const sep = rest.indexOf('::');
  if (sep < 0) return null;
  return {
    hostId: rest.slice(0, sep),
    companionId: rest.slice(sep + 2),
  };
}

export function isCompanionWaitlistVirtualParticipant(personLike) {
  return personLike?._isCompanionWaitlistVirtual === true;
}

/** Acompañantes que sí cuentan para cupo y precio de lista. */
export function getBautizosCompanionsActiveOnly(personLike) {
  return getBautizosCompanionsArray(personLike).filter((c) => !isCompanionWaitlistPending(c));
}

function patchHostInRoster(participantRows, hostId, nextCompanions) {
  const hid = String(hostId || '').trim();
  return (participantRows || []).map((p) =>
    String(p?.id || '') === hid ? { ...p, bautizosCompanions: nextCompanions } : p
  );
}

/** Precio de lista que pagaría el acompañante al promoverse a activo. */
export function computeCompanionPromoteListPrice(companionRow, eventLike) {
  if (!companionRow || !eventLike) return 0;
  const { food, transport } = getBautizosListPriceBreakdown(eventLike);
  return getBautizosLineListPrice(companionRow, food, transport, eventLike);
}

/**
 * Unidades de cupo adicionales si el acompañante deja de estar en espera (activo en el host).
 */
export function computeAdditionalCompanionCapUnits(hostPerson, companionRow, participantRows, eventRow) {
  const hostId = String(hostPerson?.id || '').trim();
  if (!hostId || !companionRow) return 0;
  const base = filterEventCapRosterBase(participantRows, eventRow);
  const host = base.find((p) => String(p?.id || '') === hostId) || hostPerson;
  const cid = String(companionRow?.id || '').trim();

  const activeOnly = getBautizosCompanionsArray(host).filter((c) => !isCompanionWaitlistPending(c));
  const without = activeOnly.filter((c) => String(c?.id || '') !== cid);
  const withActive = [
    ...without,
    { ...companionRow, [COMPANION_WAITLIST_PENDING]: false },
  ];

  const before = base.map((p) =>
    String(p?.id || '') === hostId ? { ...host, bautizosCompanions: without } : p
  );
  const after = base.map((p) =>
    String(p?.id || '') === hostId ? { ...host, bautizosCompanions: withActive } : p
  );
  return computeEventCapUnitsDelta(before, after, eventRow);
}

function capWouldExceed({ delta, globalCap, globalUsed, locCap, locUsed }) {
  if (delta <= 0) return false;
  if (globalCap > 0) return globalUsed + delta > globalCap;
  if (locCap > 0) return locUsed + delta > locCap;
  return false;
}

/**
 * Marca acompañantes nuevos (o reactivados) en espera si el cupo no alcanza.
 * Devuelve el array persistible de acompañantes.
 */
export function applyCompanionWaitlistCapOnEdit({
  originalCompanions,
  nextCompanions,
  hostPerson,
  participants,
  event,
  loc,
  getGlobalCap,
  getGlobalCapUsed,
  getLocCap,
  getLocCapUsed,
}) {
  const originalById = new Map(
    (originalCompanions || []).map((c) => [String(c?.id || ''), c])
  );
  const out = (nextCompanions || []).map((c) => ({ ...c }));
  let rosterSim = Array.isArray(participants) ? [...participants] : [];

  for (let i = 0; i < out.length; i++) {
    const c = out[i];
    const cid = String(c?.id || '').trim();
    const prev = originalById.get(cid);
    const isNew = !prev;
    const wasPending = prev && isCompanionWaitlistPending(prev);
    const userClearedPending = prev && isCompanionWaitlistPending(prev) && !isCompanionWaitlistPending(c);

    if (!isNew && !wasPending && !userClearedPending) {
      if (isCompanionWaitlistPending(c)) {
        out[i] = {
          ...c,
          [COMPANION_WAITLIST_PROMOTE_PRICE]:
            Number(c[COMPANION_WAITLIST_PROMOTE_PRICE]) ||
            computeCompanionPromoteListPrice(c, event),
        };
      }
      continue;
    }

    const trial = { ...c, [COMPANION_WAITLIST_PENDING]: false };
    delete trial[COMPANION_WAITLIST_PROMOTE_PRICE];
    delete trial[COMPANION_WAITLIST_CREATED_AT];

    const delta = computeAdditionalCompanionCapUnits(
      hostPerson,
      trial,
      rosterSim,
      event
    );
    const exceeds = capWouldExceed({
      delta,
      globalCap: getGlobalCap(),
      globalUsed: getGlobalCapUsed(),
      locCap: getLocCap(loc),
      locUsed: getLocCapUsed(loc),
    });

    if (exceeds) {
      out[i] = {
        ...c,
        [COMPANION_WAITLIST_PENDING]: true,
        [COMPANION_WAITLIST_CREATED_AT]: c[COMPANION_WAITLIST_CREATED_AT] || Date.now(),
        [COMPANION_WAITLIST_PROMOTE_PRICE]: computeCompanionPromoteListPrice(c, event),
      };
    } else {
      out[i] = { ...trial };
      rosterSim = patchHostInRoster(rosterSim, hostPerson.id, out);
    }
  }
  return out;
}

const UNAVAILABLE = 'No disponible';

function fieldOrUnavailable(value) {
  const t = String(value ?? '').trim();
  return t || UNAVAILABLE;
}

/** Fila virtual para la sección «Lista de espera» (datos del acompañante + enlace al titular). */
export function buildCompanionWaitlistVirtualParticipant(host, companion, eventLike, rosterParticipants) {
  const hostId = String(host?.id || '').trim();
  const companionId = String(companion?.id || '').trim();
  const promotePrice =
    Number(companion?.[COMPANION_WAITLIST_PROMOTE_PRICE]) ||
    computeCompanionPromoteListPrice(companion, eventLike);

  return {
    id: companionWaitlistVirtualId(hostId, companionId),
    _isCompanionWaitlistVirtual: true,
    _companionWaitlistHostId: hostId,
    _companionWaitlistHostName: String(host?.name || '').trim() || UNAVAILABLE,
    _companionWaitlistCompanionId: companionId,
    status: 'waitlist',
    eventId: host?.eventId || eventLike?.id || '',
    location: host?.location || '',
    name: fieldOrUnavailable(companion?.name),
    relationship: fieldOrUnavailable(companion?.relationship),
    alias: '',
    phone: fieldOrUnavailable(companion?.phone),
    birthDate: fieldOrUnavailable(companion?.birthDate),
    age: companion?.birthDate
      ? ''
      : fieldOrUnavailable(companion?.age),
    gender: fieldOrUnavailable(companion?.gender),
    vnpPersonId: fieldOrUnavailable(companion?.vnpPersonId),
    bloodType: fieldOrUnavailable(companion?.bloodType),
    emergencyContact: fieldOrUnavailable(companion?.emergencyContact),
    emergencyPhone: fieldOrUnavailable(companion?.emergencyPhone),
    emergencyRelationship: fieldOrUnavailable(companion?.emergencyRelationship),
    registeredCost: promotePrice,
    paid: 0,
    paidNet: 0,
    isScholarship: 'No',
    waitlistCreatedAt: companion?.[COMPANION_WAITLIST_CREATED_AT] || null,
    registeredAt: companion?.[COMPANION_WAITLIST_CREATED_AT] || host?.registeredAt || null,
    willBeBaptized: companion?.willBeBaptized || 'No',
    wantsBautizosTransport: companion?.wantsBautizosTransport || 'No',
    bautizosCompanions: [],
    paymentHistory: [],
    whatsAppFinanceNotifications: [],
    __globalRegistryVirtual: false,
  };
}

/** Recolecta filas virtuales de acompañantes en espera para una sede. */
export function collectCompanionWaitlistVirtualRows(allParticipants, eventLike, loc) {
  if (!eventLike || String(eventLike.eventType || '') !== 'Bautizos') return [];
  const locKey = String(loc || '').trim();
  const eid = String(eventLike.id || '').trim();
  const out = [];

  for (const p of allParticipants || []) {
    if (String(p?.eventId || '') !== eid) continue;
    if ((p?.status || 'active') !== 'active') continue;
    if (String(p?.location || '').trim() !== locKey) continue;
    for (const c of getBautizosCompanionsArray(p)) {
      if (!isCompanionWaitlistPending(c)) continue;
      out.push(buildCompanionWaitlistVirtualParticipant(p, c, eventLike, allParticipants));
    }
  }
  return out;
}

/** Quita la marca de espera de un acompañante (promover). */
export function clearCompanionWaitlistFlags(companionRow) {
  const next = { ...(companionRow || {}) };
  delete next[COMPANION_WAITLIST_PENDING];
  delete next[COMPANION_WAITLIST_CREATED_AT];
  delete next[COMPANION_WAITLIST_PROMOTE_PRICE];
  return next;
}

/** Suma de precio de lista solo de acompañantes activos (no en espera). */
export function getBautizosCompanionsActiveListPriceSum(personLike, eventLike) {
  const { food, transport } = getBautizosListPriceBreakdown(eventLike);
  let sum = 0;
  for (const c of getBautizosCompanionsActiveOnly(personLike)) {
    sum += getBautizosLineListPrice(c, food, transport, eventLike);
  }
  return sum;
}

/** Precio de party (titular + acompañantes activos). */
export function getBautizosPartyActiveListPrice(personLike, eventLike) {
  if (!eventLike || eventLike.eventType !== 'Bautizos') return 0;
  return (
    getBautizosTitularListPrice(personLike, eventLike) +
    getBautizosCompanionsActiveListPriceSum(personLike, eventLike)
  );
}
