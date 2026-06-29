import {
  buildBautizosFamilyCarInventory,
  carCrewRequiresPassengerSelection,
  familyCarInventoryNeedsAttention,
  familyHasAnyCarTransport,
} from './bautizosCarMeta.js';
import { getBautizosCompanionsArray } from './bautizosParty.js';
import { buildCarDataRequestWhatsAppMessage } from './whatsappFinanceMessages.js';

export const CAR_DATA_PENDING_FILTER_OPTIONS = Object.freeze([
  { id: 'all', label: 'Todos' },
  { id: 'pending', label: 'Pendientes de datos de carro' },
]);

export function getCarDataWhatsAppNotificationMarkKey(n) {
  return n?.id ? String(n.id) : `legacy-${n.createdAt ?? 0}-${n.kind ?? ''}`;
}

export function buildCarDataWhatsAppNotificationId(participantId, eventId) {
  const pid = String(participantId || '').trim();
  const eid = String(eventId || '').trim();
  if (!pid || !eid) return '';
  return `car-data-${eid}-${pid}`;
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

/** Claves de todos los `datos_carro` sin enviar (para marcar como enviados tras fusionar). */
export function allUnsentCarDataNotificationMarkKeys(notifications) {
  return dedupeUnsentCarDataNotifications(notifications)
    .filter((n) => n && !n.sent && String(n?.kind || '') === 'datos_carro')
    .map((n) => getCarDataWhatsAppNotificationMarkKey(n));
}

/** Titular que recibe la solicitud; si `person` es acompañante split, devuelve al host. */
export function resolveCarDataWhatsAppTitularPerson(person, roster) {
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

/**
 * Contexto para enviar solicitud de datos de carro al titular.
 * @returns {{ needsAttention: boolean, inventory: object[], message: string, markKeys: string[], pendingNotifications: object[] }}
 */
export function buildCarDataPendingWhatsAppContext({ titular, eventSnapshot, roster }) {
  const empty = {
    needsAttention: false,
    inventory: [],
    message: '',
    markKeys: [],
    pendingNotifications: [],
  };
  if (!titular || !eventSnapshot) return empty;

  const companions = getBautizosCompanionsArray(titular);
  if (!familyHasAnyCarTransport(titular, companions, eventSnapshot)) return empty;

  const inventory = buildBautizosFamilyCarInventory({
    hostPerson: titular,
    companions,
    plan: eventSnapshot.transportPlanning,
    hostSourceKey: `p:${String(titular.id || '').trim()}`,
  });

  const needsAttention = familyCarInventoryNeedsAttention(inventory, {
    hostPerson: titular,
    companions,
  });
  if (!needsAttention) return empty;

  const loc = String(titular.location || '').trim();
  const message = (
    buildCarDataRequestWhatsAppMessage({
      person: titular,
      loc,
      eventSnapshot,
      carSlots: inventory,
      reportedAtMs: Date.now(),
      requiresPassengers: carCrewRequiresPassengerSelection(titular, companions),
    }) || ''
  ).trim();

  const notifications = Array.isArray(titular.whatsAppFinanceNotifications)
    ? titular.whatsAppFinanceNotifications
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
  };
}

/** Filtro anidado: titular (o su familia vía split) con datos de carro pendientes. */
export function participantMatchesCarDataPendingFilter(person, eventSnapshot, roster) {
  if (!person || !eventSnapshot) return false;
  if (String(eventSnapshot.eventType || '') !== 'Bautizos') return false;
  const { titular } = resolveCarDataWhatsAppTitularPerson(person, roster);
  const ctx = buildCarDataPendingWhatsAppContext({ titular, eventSnapshot, roster });
  return ctx.needsAttention;
}

/**
 * Titulares únicos con datos de carro pendientes (excluye filas split de acompañante).
 * @param {object[]} roster
 */
export function listCarDataPendingTitularTargets(roster, eventSnapshot) {
  const seen = new Set();
  const out = [];
  for (const p of roster || []) {
    if (String(p?.bautizosSplitPartyHostParticipantId || '').trim()) continue;
    const tid = String(p?.id || '').trim();
    if (!tid || seen.has(tid)) continue;
    const ctx = buildCarDataPendingWhatsAppContext({ titular: p, eventSnapshot, roster });
    if (!ctx.needsAttention) continue;
    seen.add(tid);
    out.push({ titular: p, ...ctx });
  }
  return out;
}

export function titularHasPendingCarDataWhatsApp(titular, eventSnapshot, roster) {
  const ctx = buildCarDataPendingWhatsAppContext({ titular, eventSnapshot, roster });
  return ctx.needsAttention;
}

/** Excluye avisos `datos_carro` obsoletos (p. ej. titular pasó a transporte del evento). */
export function filterWhatsAppFinanceNotificationsForQueue(person, notifications, eventSnapshot, roster) {
  const list = Array.isArray(notifications) ? notifications : [];
  const filtered = list.filter((n) => {
    if (!n || n.sent) return false;
    if (String(n?.kind || '') !== 'datos_carro') return true;
    if (!eventSnapshot || String(eventSnapshot.eventType || '') !== 'Bautizos') return false;
    const { titular } = resolveCarDataWhatsAppTitularPerson(person, roster);
    return titularHasPendingCarDataWhatsApp(titular, eventSnapshot, roster);
  });
  return dedupeUnsentCarDataNotifications(filtered);
}

export function countUnsentWhatsAppNotificationsForQueue(person, eventSnapshot, roster) {
  const notifications = Array.isArray(person?.whatsAppFinanceNotifications)
    ? person.whatsAppFinanceNotifications
    : [];
  return filterWhatsAppFinanceNotificationsForQueue(person, notifications, eventSnapshot, roster).length;
}
