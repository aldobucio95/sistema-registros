import {
  applyCarMetaPassengerInheritance,
  buildBautizosFamilyCarInventory,
  buildCarDataSummaryForRosterPerson,
  buildCarDataWaSubjectContext,
  buildCarMetaCrewOptsForTitular,
  buildMergedFamilyCarInventory,
  carCrewRequiresPassengerSelection,
  familyCarInventoryNeedsAttention,
  familyHasAnyCarTransport,
  getFamilyCarInventoryValidationIssues,
  isCarVehicleFullyCaptured,
  manualGroupCrewRequiresPassengers,
  mergeCarMetaPatchesIntoPlan,
  resolveBautizosCarDataAnchor,
  resolveLinkedCompanionCarInheritance,
  vehicleMetaFieldsAndDriverComplete,
} from './bautizosCarMeta.js';
import { getBautizosCompanionsArray } from './bautizosParty.js';
import { normalizeTransportPlanning } from './transportPlanningCore.js';
import {
  fetchCarMetaForTitular,
  mergeCarMetaCacheIntoPlan,
  titularSummaryNeedsAttention,
  TRANSPORT_CAR_META_STORAGE_VERSION,
} from './transportCarMetaStore.js';
import { buildCarDataRequestWhatsAppMessage } from './whatsappFinanceMessages.js';

function planNeedsCarMetaSubcollectionFetch(plan) {
  const normalized = normalizeTransportPlanning(plan);
  if (Number(normalized.transportCarMetaStorageVersion) >= TRANSPORT_CAR_META_STORAGE_VERSION) {
    return true;
  }
  return !Object.keys(normalized.carMetaBySource || {}).length;
}

/** Misma regla que la tarjeta de datos de carro en roster (meta cargada en memoria). */
export function personCarDataNeedsAttentionFromPlan(eventSnapshot, anchor, roster, planWithMeta) {
  if (!anchor?.eligible || !anchor.anchorPerson) return false;

  const displayCompanions = anchor.companionsForCrew?.length
    ? anchor.companionsForCrew
    : anchor.inventoryCompanions;

  const summary = buildCarDataSummaryForRosterPerson({
    person: anchor.anchorPerson,
    companions: displayCompanions,
    plan: planWithMeta,
    roster,
    eventLike: eventSnapshot,
    forRosterDisplay: true,
  });

  const manualGroupMemberCount = summary.manualGroupMemberCount || anchor.manualGroupMemberCount || 0;
  const requiresPassengers =
    manualGroupMemberCount > 1
      ? manualGroupCrewRequiresPassengers(manualGroupMemberCount)
      : carCrewRequiresPassengerSelection(summary.hostPerson, summary.companions);

  return familyCarInventoryNeedsAttention(summary.inventory, {
    hostPerson: summary.hostPerson,
    companions: summary.companions,
    requiresPassengers,
  });
}

export async function personInventoryNeedsCarDataAttentionAsync(person, eventSnapshot, roster) {
  if (!person || !eventSnapshot) return false;
  const anchor = resolveBautizosCarDataAnchor(person, roster, eventSnapshot);
  if (!anchor.eligible || !anchor.anchorPerson) return false;
  if (String(anchor.waRecipient?.id || '').trim() !== String(person?.id || '').trim()) return false;

  let planWithMeta = eventSnapshot.transportPlanning;
  const anchorSk = `p:${String(anchor.anchorPerson?.id || '').trim()}`;

  if (planNeedsCarMetaSubcollectionFetch(planWithMeta)) {
    const eid = String(eventSnapshot?.id || '').trim();
    if (eid) {
      try {
        const fetched = await fetchCarMetaForTitular(eid, anchorSk);
        if (Object.keys(fetched).length) {
          planWithMeta = mergeCarMetaCacheIntoPlan(planWithMeta, fetched);
        }
      } catch {
        /* usar plan/resumen en memoria */
      }
    }
  }

  return personCarDataNeedsAttentionFromPlan(eventSnapshot, anchor, roster, planWithMeta);
}

/** Plan de transporte con meta lazy-loaded y borrador del formulario aplicado. */
export async function resolveBautizosRegistrationCarPlan({
  eventSnapshot,
  hostSourceKey,
  draftMetaByVehicleKey = {},
  planOverride,
}) {
  let plan = planOverride ?? eventSnapshot?.transportPlanning;
  const eid = String(eventSnapshot?.id || '').trim();
  const owner = String(hostSourceKey || '').trim();
  if (eid && owner && planNeedsCarMetaSubcollectionFetch(plan)) {
    try {
      const fetched = await fetchCarMetaForTitular(eid, owner);
      if (Object.keys(fetched).length) {
        plan = mergeCarMetaCacheIntoPlan(plan, fetched);
      }
    } catch {
      /* usar plan en memoria */
    }
  }
  const draft =
    draftMetaByVehicleKey && typeof draftMetaByVehicleKey === 'object' ? draftMetaByVehicleKey : {};
  const draftPatches = Object.entries(draft)
    .filter(([vehicleKey]) => String(vehicleKey || '').trim())
    .map(([vehicleKey, patch]) => ({ vehicleKey, patch }));
  if (draftPatches.length) {
    plan = mergeCarMetaPatchesIntoPlan(plan, draftPatches);
  }
  return applyCarMetaPassengerInheritance(normalizeTransportPlanning(plan));
}

function buildRegistrationCarCrewContext(anchor, hostPerson) {
  const manualGroupMemberCount = anchor.manualGroupMemberCount || 0;
  const companionsForCrew = anchor.companionsForCrew;
  const requiresPassengers =
    manualGroupMemberCount > 1
      ? manualGroupCrewRequiresPassengers(manualGroupMemberCount)
      : carCrewRequiresPassengerSelection(hostPerson, companionsForCrew);
  return { hostPerson, companions: companionsForCrew, requiresPassengers };
}

/**
 * Validación de datos de carro al guardar registro (edición / alta).
 * Carga meta persistida del titular; si el vehículo ya está capturado, no exige reingresar al agregar acompañantes.
 */
export async function getBautizosRegistrationCarValidationIssues({
  person,
  eventSnapshot,
  roster,
  draftMetaByVehicleKey = {},
  inheritLinkedCarData,
}) {
  const companions = getBautizosCompanionsArray(person);
  if (!familyHasAnyCarTransport(person, companions, eventSnapshot)) return [];

  const linkedCarInherit = resolveLinkedCompanionCarInheritance(
    person,
    roster,
    eventSnapshot?.transportPlanning,
    { inheritFlag: inheritLinkedCarData ?? person?.bautizosInheritLinkedCompanionCarData }
  );
  if (linkedCarInherit.active) return [];

  const anchor = resolveBautizosCarDataAnchor(person, roster, eventSnapshot);
  if (!anchor.eligible || !anchor.anchorPerson) return [];

  const hostSourceKey = `p:${String(person?.id || anchor.anchorPerson?.id || '').trim()}`;
  if (!hostSourceKey || hostSourceKey === 'p:') return [];

  const planWithMeta = await resolveBautizosRegistrationCarPlan({
    eventSnapshot,
    hostSourceKey,
    draftMetaByVehicleKey,
  });

  const crewContext = buildRegistrationCarCrewContext(anchor, person);
  const inventoryCompanions = anchor.inventoryCompanions?.length ? anchor.inventoryCompanions : companions;
  const inventory = buildMergedFamilyCarInventory({
    hostPerson: person,
    companions: inventoryCompanions,
    plan: planWithMeta,
    hostSourceKey,
    draftMetaByVehicleKey: {},
  });

  const crewOpts = { requiresPassengers: crewContext.requiresPassengers };
  const inventorySatisfiedForSave =
    inventory.length > 0 &&
    inventory.every(
      (slot) => slot.meta?.maybeAbsent || isCarVehicleFullyCaptured(slot.meta, crewOpts)
    );
  if (inventorySatisfiedForSave) {
    return [];
  }

  const hasDraftEdits = Object.keys(draftMetaByVehicleKey || {}).length > 0;
  if (!hasDraftEdits) {
    const anchorForCheck = { ...anchor, anchorPerson: person };
    if (!personCarDataNeedsAttentionFromPlan(eventSnapshot, anchorForCheck, roster, planWithMeta)) {
      return [];
    }
    const vehicleDataSufficient =
      inventory.length > 0 &&
      inventory.every(
        (slot) => slot.meta?.maybeAbsent || vehicleMetaFieldsAndDriverComplete(slot.meta)
      );
    if (vehicleDataSufficient) {
      return [];
    }
  }

  return getFamilyCarInventoryValidationIssues(inventory, crewContext);
}

export const CAR_DATA_FILTER_OPTIONS = Object.freeze([
  { id: 'all', label: 'Todos' },
  { id: 'pending', label: 'Faltan datos de carro' },
  { id: 'complete', label: 'Datos de carro completos' },
]);

/** @deprecated usar CAR_DATA_FILTER_OPTIONS */
export const CAR_DATA_PENDING_FILTER_OPTIONS = CAR_DATA_FILTER_OPTIONS;

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

  const plan = eventSnapshot.transportPlanning;
  if (!planNeedsCarMetaSubcollectionFetch(plan)) {
    return personCarDataNeedsAttentionFromPlan(eventSnapshot, anchor, roster, plan);
  }

  const anchorSk = `p:${String(anchor.anchorPerson?.id || '').trim()}`;
  const summary = plan?.bautizosCarMetaSummaryByTitular?.[anchorSk];
  if (summary) {
    const crewOpts = buildCarMetaCrewOptsForTitular(anchorSk, plan, roster);
    return titularSummaryNeedsAttention(summary, crewOpts);
  }
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
      rosterParticipants: roster,
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

/**
 * Persona que debe capturar datos de carro (llega en carro o tiene acompañante en carro).
 * Quienes van solo en transporte del evento no aplican.
 */
export function personSubjectToCarDataProvision(person, eventSnapshot, roster) {
  if (!person || !eventSnapshot) return false;
  if (String(eventSnapshot.eventType || '') !== 'Bautizos') return false;
  const anchor = resolveBautizosCarDataAnchor(person, roster, eventSnapshot);
  if (!anchor.eligible || !anchor.anchorPerson || !anchor.waRecipient) return false;
  return String(anchor.waRecipient?.id || '').trim() === String(person?.id || '').trim();
}

/** Filtro: fila con datos de carro visibles en cola WA (titular o subregistro bautizado elegible). */
export function participantMatchesCarDataPendingFilter(person, eventSnapshot, roster, now = Date.now()) {
  if (!person || !eventSnapshot) return false;
  if (String(eventSnapshot.eventType || '') !== 'Bautizos') return false;
  if (!personSubjectToCarDataProvision(person, eventSnapshot, roster)) return false;
  return titularCarDataVisibleInWhatsAppQueue(person, eventSnapshot, roster, now);
}

/** Filtro: debe capturar datos de carro y el inventario ya está completo (sin rubros faltantes). */
export function participantMatchesCarDataCompleteFilter(person, eventSnapshot, roster) {
  if (!person || !eventSnapshot) return false;
  if (String(eventSnapshot.eventType || '') !== 'Bautizos') return false;
  if (!personSubjectToCarDataProvision(person, eventSnapshot, roster)) return false;
  return !personInventoryNeedsCarDataAttention(person, eventSnapshot, roster);
}

/** Filtros anidados: all | pending | complete */
export function participantMatchesCarDataFilter(person, filterId, eventSnapshot, roster, now = Date.now()) {
  const id = String(filterId || 'all').trim();
  if (!id || id === 'all') return true;
  if (id === 'pending') return participantMatchesCarDataPendingFilter(person, eventSnapshot, roster, now);
  if (id === 'complete') return participantMatchesCarDataCompleteFilter(person, eventSnapshot, roster);
  return true;
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
