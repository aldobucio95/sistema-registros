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
  if (!familyHasAnyCarTransport(titular, companions)) return empty;

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
  const pendingNotifications = notifications.filter(
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
  return list.filter((n) => {
    if (!n || n.sent) return false;
    if (String(n?.kind || '') !== 'datos_carro') return true;
    if (!eventSnapshot || String(eventSnapshot.eventType || '') !== 'Bautizos') return false;
    const { titular } = resolveCarDataWhatsAppTitularPerson(person, roster);
    return titularHasPendingCarDataWhatsApp(titular, eventSnapshot, roster);
  });
}

export function countUnsentWhatsAppNotificationsForQueue(person, eventSnapshot, roster) {
  const notifications = Array.isArray(person?.whatsAppFinanceNotifications)
    ? person.whatsAppFinanceNotifications
    : [];
  return filterWhatsAppFinanceNotificationsForQueue(person, notifications, eventSnapshot, roster).length;
}
