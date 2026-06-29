import {
  buildBautizosFamilyCarInventory,
  buildCarDataWaSubjectContext,
  carCrewRequiresPassengerSelection,
  familyCarInventoryNeedsAttention,
  resolveBautizosCarDataAnchor,
} from './bautizosCarMeta.js';
import { buildCarDataRequestWhatsAppMessage } from './whatsappFinanceMessages.js';

export const CAR_DATA_PENDING_FILTER_OPTIONS = Object.freeze([
  { id: 'all', label: 'Todos' },
  { id: 'pending', label: 'Pendientes de datos de carro' },
]);

export const CAR_DATA_WA_SNOOZE_MS = 24 * 60 * 60 * 1000;

export function getCarDataWhatsAppNotificationMarkKey(n) {
  return n?.id ? String(n.id) : `legacy-${n.createdAt ?? 0}-${n.kind ?? ''}`;
}

export function buildCarDataWhatsAppNotificationId(participantId, eventId) {
  const pid = String(participantId || '').trim();
  const eid = String(eventId || '').trim();
  if (!pid || !eid) return '';
  return `car-data-${eid}-${pid}`;
}

export function isCarDataNotificationSnoozed(n, now = Date.now()) {
  if (!n || String(n?.kind || '') !== 'datos_carro') return false;
  const until = Number(n.carDataWaSnoozedUntil || 0);
  return until > now;
}

export function isCarDataNotificationQueueVisible(n, now = Date.now()) {
  if (!n || n.sent) return false;
  if (String(n?.kind || '') !== 'datos_carro') return true;
  return !isCarDataNotificationSnoozed(n, now);
}

export function applyCarDataWaSnooze(n, now = Date.now()) {
  return {
    ...n,
    sent: false,
    sentAt: null,
    lastCarDataWaSentAt: now,
    carDataWaSnoozedUntil: now + CAR_DATA_WA_SNOOZE_MS,
  };
}

/** Colapsa avisos `datos_carro` sin enviar a uno solo (el más reciente). */
export function dedupeUnsentCarDataNotifications(notifications) {
  const arr = Array.isArray(notifications) ? notifications : [];
  let latestCar = null;
  const rest = [];
  for (const n of arr) {
    if (!n) continue;
    if (n.sent) {
      rest.push(n);
      continue;
    }
    if (String(n?.kind || '') === 'datos_carro') {
      if (!latestCar || Number(n.createdAt || 0) >= Number(latestCar.createdAt || 0)) {
        latestCar = n;
      }
      continue;
    }
    rest.push(n);
  }
  if (!latestCar) return rest;
  return [...rest, latestCar];
}

/** Reemplaza avisos previos de datos de carro del mismo id (o sin enviar) por uno actualizado. */
export function upsertCarDataWhatsAppNotification(existing, notification) {
  const arr = Array.isArray(existing) ? existing : [];
  const nid = String(notification?.id || '').trim();
  const withoutDupes = dedupeUnsentCarDataNotifications(arr).filter((n) => {
    if (!n || String(n?.kind || '') !== 'datos_carro') return true;
    if (nid && String(n?.id || '') === nid) return false;
    return !!n.sent;
  });
  return [...withoutDupes, notification];
}

/** Claves de todos los `datos_carro` sin enviar (para posponer tras fusionar o enviar). */
export function allUnsentCarDataNotificationMarkKeys(notifications) {
  return dedupeUnsentCarDataNotifications(notifications)
    .filter((n) => n && !n.sent && String(n?.kind || '') === 'datos_carro')
    .map((n) => getCarDataWhatsAppNotificationMarkKey(n));
}

/** Titular que recibe la solicitud; split derivado con carro propio conserva su registro. */
export function resolveCarDataWhatsAppTitularPerson(person, roster, eventLike = null) {
  const anchor = resolveBautizosCarDataAnchor(person, roster, eventLike);
  if (anchor.eligible && anchor.waRecipient) {
    const splitHostId = String(person?.bautizosSplitPartyHostParticipantId || '').trim();
    return {
      titular: anchor.waRecipient,
      companionPerson: splitHostId ? person : null,
      isCompanionSplit: !!splitHostId,
    };
  }
  const splitHostId = String(person?.bautizosSplitPartyHostParticipantId || '').trim();
  if (splitHostId) {
    const titular = (roster || []).find((p) => String(p?.id || '').trim() === splitHostId);
    return {
      titular: titular || person,
      companionPerson: person,
      isCompanionSplit: true,
    };
  }
  return { titular: person, companionPerson: null, isCompanionSplit: false };
}

/** IDs de registros split que dependen del titular indicado. */
export function listSplitCompanionParticipantIds(titularId, roster) {
  const hid = String(titularId || '').trim();
  if (!hid) return [];
  return (roster || [])
    .filter((p) => String(p?.bautizosSplitPartyHostParticipantId || '').trim() === hid)
    .map((p) => String(p.id))
    .filter(Boolean);
}

function buildCarDataInventoryForAnchor(anchor, eventSnapshot) {
  return buildBautizosFamilyCarInventory({
    hostPerson: anchor.anchorPerson,
    companions: anchor.inventoryCompanions,
    plan: eventSnapshot.transportPlanning,
    hostSourceKey: `p:${String(anchor.anchorPerson?.id || '').trim()}`,
  });
}

export function personInventoryNeedsCarDataAttention(person, eventSnapshot, roster) {
  if (!person || !eventSnapshot) return false;
  const anchor = resolveBautizosCarDataAnchor(person, roster, eventSnapshot);
  if (!anchor.eligible || !anchor.anchorPerson) return false;
  if (String(anchor.waRecipient?.id || '').trim() !== String(person?.id || '').trim()) return false;
  const inventory = buildCarDataInventoryForAnchor(anchor, eventSnapshot);
  return familyCarInventoryNeedsAttention(inventory, {
    hostPerson: anchor.anchorPerson,
    companions: anchor.companionsForCrew,
  });
}

/** @deprecated alias */
export function titularInventoryNeedsCarDataAttention(titular, eventSnapshot, roster) {
  return personInventoryNeedsCarDataAttention(titular, eventSnapshot, roster);
}

/** Visible en burbuja/cola WA (excluye pospuesto 24 h tras envío). */
export function titularCarDataVisibleInWhatsAppQueue(person, eventSnapshot, roster, now = Date.now()) {
  if (!personInventoryNeedsCarDataAttention(person, eventSnapshot, roster)) return false;
  const notifications = Array.isArray(person?.whatsAppFinanceNotifications)
    ? person.whatsAppFinanceNotifications
    : [];
  const carNotif = dedupeUnsentCarDataNotifications(notifications).find(
    (n) => n && !n.sent && String(n?.kind || '') === 'datos_carro'
  );
  if (!carNotif) return true;
  return isCarDataNotificationQueueVisible(carNotif, now);
}

/**
 * Contexto para enviar solicitud de datos de carro (titular o subregistro bautizado con carro propio).
 * @returns {{ needsAttention: boolean, inventory: object[], message: string, markKeys: string[], pendingNotifications: object[], waRecipient: object|null }}
 */
export function buildCarDataPendingWhatsAppContext({ titular, eventSnapshot, roster }) {
  const empty = {
    needsAttention: false,
    inventory: [],
    message: '',
    markKeys: [],
    pendingNotifications: [],
    waRecipient: null,
  };
  if (!titular || !eventSnapshot) return empty;

  const anchor = resolveBautizosCarDataAnchor(titular, roster, eventSnapshot);
  if (!anchor.eligible || !anchor.waRecipient || !anchor.anchorPerson) return empty;

  const inventory = buildCarDataInventoryForAnchor(anchor, eventSnapshot);
  const needsAttention = familyCarInventoryNeedsAttention(inventory, {
    hostPerson: anchor.anchorPerson,
    companions: anchor.companionsForCrew,
  });
  if (!needsAttention) return empty;

  const waRecipient = anchor.waRecipient;
  const loc = String(waRecipient.location || titular.location || '').trim();
  const carDataSubjectContext = buildCarDataWaSubjectContext(
    anchor.anchorPerson,
    anchor.inventoryCompanions
  );
  const message = (
    buildCarDataRequestWhatsAppMessage({
      person: waRecipient,
      loc,
      eventSnapshot,
      carSlots: inventory,
      reportedAtMs: Date.now(),
      requiresPassengers: carCrewRequiresPassengerSelection(
        anchor.anchorPerson,
        anchor.companionsForCrew
      ),
      carDataSubjectContext,
    }) || ''
  ).trim();

  const notifications = Array.isArray(waRecipient.whatsAppFinanceNotifications)
    ? waRecipient.whatsAppFinanceNotifications
    : [];
  const pendingNotifications = dedupeUnsentCarDataNotifications(notifications).filter(
    (n) => n && !n.sent && String(n?.kind || '') === 'datos_carro'
  );
  const markKeys = pendingNotifications.map((n) => getCarDataWhatsAppNotificationMarkKey(n));

  return {
    needsAttention: true,
    inventory,
    message,
    markKeys,
    pendingNotifications,
    carDataSubjectContext,
    waRecipient,
  };
}

/** Filtro: fila con datos de carro visibles en cola WA (titular o subregistro bautizado elegible). */
export function participantMatchesCarDataPendingFilter(person, eventSnapshot, roster, now = Date.now()) {
  if (!person || !eventSnapshot) return false;
  if (String(eventSnapshot.eventType || '') !== 'Bautizos') return false;
  return titularCarDataVisibleInWhatsAppQueue(person, eventSnapshot, roster, now);
}

/**
 * Registros con datos de carro visibles en cola WA (titular raíz o acompañante bautizado con carro propio).
 * @param {object[]} roster
 */
export function listCarDataPendingTitularTargets(roster, eventSnapshot, now = Date.now()) {
  const seen = new Set();
  const out = [];
  for (const p of roster || []) {
    const pid = String(p?.id || '').trim();
    if (!pid || seen.has(pid)) continue;
    if (!titularCarDataVisibleInWhatsAppQueue(p, eventSnapshot, roster, now)) continue;
    const ctx = buildCarDataPendingWhatsAppContext({ titular: p, eventSnapshot, roster });
    if (!ctx.needsAttention) continue;
    seen.add(pid);
    out.push({ titular: ctx.waRecipient || p, ...ctx });
  }
  return out;
}

export function titularHasPendingCarDataWhatsApp(person, eventSnapshot, roster) {
  return personInventoryNeedsCarDataAttention(person, eventSnapshot, roster);
}

/** Excluye avisos `datos_carro` obsoletos o pospuestos 24 h. */
export function filterWhatsAppFinanceNotificationsForQueue(
  person,
  notifications,
  eventSnapshot,
  roster,
  now = Date.now()
) {
  const list = Array.isArray(notifications) ? notifications : [];
  const filtered = list.filter((n) => {
    if (!n || n.sent) return false;
    if (String(n?.kind || '') !== 'datos_carro') return true;
    if (!eventSnapshot || String(eventSnapshot.eventType || '') !== 'Bautizos') return false;
    if (isCarDataNotificationSnoozed(n, now)) return false;
    return personInventoryNeedsCarDataAttention(person, eventSnapshot, roster);
  });
  return dedupeUnsentCarDataNotifications(filtered);
}

export function countUnsentWhatsAppNotificationsForQueue(person, eventSnapshot, roster, now = Date.now()) {
  const notifications = Array.isArray(person?.whatsAppFinanceNotifications)
    ? person.whatsAppFinanceNotifications
    : [];
  const filtered = filterWhatsAppFinanceNotificationsForQueue(person, notifications, eventSnapshot, roster, now);
  const hasCarInFiltered = filtered.some((n) => String(n?.kind || '') === 'datos_carro');
  const syntheticCar =
    !hasCarInFiltered && titularCarDataVisibleInWhatsAppQueue(person, eventSnapshot, roster, now) ? 1 : 0;
  return filtered.length + syntheticCar;
}
