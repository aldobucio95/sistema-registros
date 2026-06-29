import { normalizeRole, isAdminOrSuper } from './roles.js';
import { getTransportSectionEligibleForEventDoc, eventTypeIsDesayuno } from '../transportPlanningEligibility.js';

export const PANEL_NAV_KEYS = [
  'dashboard',
  'bautizados',
  'serversPage',
  'becados',
  'cashCut',
  'expenseList',
  'responsivas',
  'registroGlobal',
  'transporte',
  'locations',
];

/** Eventos permitidos: lista explícita o legado `restrictedEventId`. */
export function getUserAllowedEventIds(user) {
  const explicit = Array.isArray(user?.allowedEventIds) ? user.allowedEventIds.filter(Boolean) : [];
  if (explicit.length > 0) return explicit;
  return user?.restrictedEventId ? [user.restrictedEventId] : [];
}

/** Sedes globales legado (sin mapa por evento). */
export function getUserAllowedLocationsLegacy(user) {
  const explicit = Array.isArray(user?.allowedLocations) ? user.allowedLocations.filter(Boolean) : [];
  if (explicit.length > 0) return explicit;
  return user?.restrictedLocation ? [user.restrictedLocation] : [];
}

/**
 * Sedes permitidas para un evento concreto.
 * Admin/Super: todas las del evento. Resto: `allowedLocationsByEvent[eventId]` o legado `allowedLocations`.
 */
export function getUserAllowedLocationNamesForEvent(user, eventId, eventLocationNames = []) {
  if (!user || !eventId) return [];
  const locs = (Array.isArray(eventLocationNames) ? eventLocationNames : []).map((x) => String(x).trim()).filter(Boolean);
  if (isAdminOrSuper(user.role)) return locs;

  const byEv = user?.allowedLocationsByEvent && typeof user.allowedLocationsByEvent === 'object' ? user.allowedLocationsByEvent[String(eventId)] : null;
  if (Array.isArray(byEv) && byEv.length > 0) {
    const set = new Set(byEv.map((x) => String(x).trim()).filter(Boolean));
    return locs.filter((l) => set.has(l));
  }

  const legacy = getUserAllowedLocationsLegacy(user);
  if (legacy.length > 0) return locs.filter((l) => legacy.includes(l));
  return locs;
}

/**
 * Conjunto de sedes visibles para el usuario en el evento actual.
 * `null` = sin restricción explícita (p. ej. todas las sedes del evento ya vienen en `visibleLocations`).
 */
export function buildLocationScopeSet(visibleLocations) {
  const arr = (Array.isArray(visibleLocations) ? visibleLocations : [])
    .map((x) => String(x).trim())
    .filter(Boolean);
  return arr.length > 0 ? new Set(arr) : null;
}

export function participantInLocationScope(personLike, scopeSet) {
  if (!scopeSet) return true;
  const loc = String(personLike?.location || '').trim();
  return !!loc && scopeSet.has(loc);
}

export function filterParticipantsByLocationScope(participants, visibleLocations) {
  const scopeSet = buildLocationScopeSet(visibleLocations);
  if (!scopeSet) return participants || [];
  return (participants || []).filter((p) => participantInLocationScope(p, scopeSet));
}

/** Panel lateral por rol (antes de overrides del usuario y del menú global). */
export function defaultPanelSectionsByRole(role) {
  const r = normalizeRole(role);
  if (r === 'SuperUsuario') {
    return Object.fromEntries(PANEL_NAV_KEYS.map((k) => [k, true]));
  }
  if (r === 'Administrador') {
    return {
      dashboard: true,
      bautizados: true,
      serversPage: true,
      becados: true,
      cashCut: true,
      expenseList: false,
      responsivas: true,
      registroGlobal: true,
      transporte: true,
      locations: true,
    };
  }
  // Editor / Lector: por defecto solo sedes en menú; el dashboard y el resto se habilitan por evento / menú global.
  return {
    dashboard: false,
    bautizados: false,
    serversPage: false,
    becados: false,
    cashCut: false,
    expenseList: false,
    responsivas: false,
    registroGlobal: false,
    transporte: false,
    locations: true,
  };
}

/**
 * Secciones efectivas del menú lateral del evento.
 * El menú global (`globalPanelNav`) solo limita a Editor y Lector.
 */
export function getUserAllowedPanelSectionsForEvent(user, eventId, globalPanelNav = {}) {
  const r = normalizeRole(user?.role);
  const base = defaultPanelSectionsByRole(r);
  const globalUser =
    user?.allowedPanelSections && typeof user.allowedPanelSections === 'object' ? user.allowedPanelSections : {};
  const byEventRaw =
    eventId != null && user?.allowedPanelSectionsByEvent && typeof user.allowedPanelSectionsByEvent === 'object'
      ? user.allowedPanelSectionsByEvent[String(eventId)]
      : null;
  const byEvent = byEventRaw && typeof byEventRaw === 'object' ? byEventRaw : {};
  const merged = mergePanelSectionLayers(base, globalUser, byEvent);
  if (r === 'Editor' || r === 'Lector') {
    const g = globalPanelNav && typeof globalPanelNav === 'object' ? globalPanelNav : {};
    const out = { ...merged };
    for (const k of PANEL_NAV_KEYS) {
      // Menú global desactivado: aplica salvo concesión explícita por evento en el usuario.
      if (g[k] === false && byEvent[k] !== true) out[k] = false;
    }
    return out;
  }
  return merged;
}

export function mergePanelSectionsForUser(user, globalPanelNav = {}) {
  return getUserAllowedPanelSectionsForEvent(user, null, globalPanelNav);
}

function serializeEffectivePanelSections(sections) {
  const o = sections && typeof sections === 'object' ? sections : {};
  return PANEL_NAV_KEYS.map((k) => (o[k] === false ? '0' : '1')).join('');
}

/**
 * Huella del menú lateral visible (rol + overrides de usuario + menú global + por evento).
 * SuperUsuario: huella fija — los overrides en Firestore no cambian lo que ve en el menú.
 */
export function effectivePanelAccessFingerprint(user, globalPanelNav = {}) {
  if (normalizeRole(user?.role) === 'SuperUsuario') return 'super';
  const parts = [
    serializeEffectivePanelSections(getUserAllowedPanelSectionsForEvent(user, null, globalPanelNav)),
  ];
  const byEv = user?.allowedPanelSectionsByEvent;
  if (byEv && typeof byEv === 'object') {
    for (const eventId of Object.keys(byEv).sort()) {
      parts.push(
        `${eventId}:${serializeEffectivePanelSections(
          getUserAllowedPanelSectionsForEvent(user, eventId, globalPanelNav)
        )}`
      );
    }
  }
  return parts.join('|');
}

/**
 * True solo si cambia el menú lateral que el usuario puede ver (no el JSON crudo en Firestore).
 * @param {object} [prevGlobalPanelNav] Menú global anterior (p. ej. si solo cambió `app_data/config.panelNav`).
 */
export function panelMenuAccessEffectivelyChanged(
  prevUser,
  nextUser,
  globalPanelNav = {},
  prevGlobalPanelNav = globalPanelNav
) {
  if (!prevUser || !nextUser) return false;
  if (normalizeRole(prevUser.role) === 'SuperUsuario' || normalizeRole(nextUser.role) === 'SuperUsuario') {
    return false;
  }
  return (
    effectivePanelAccessFingerprint(prevUser, prevGlobalPanelNav) !==
    effectivePanelAccessFingerprint(nextUser, globalPanelNav)
  );
}

/**
 * Para formularios (alta/edición de usuario): combina capas de permisos del menú lateral.
 * Las claves ausentes en capas posteriores conservan valores de capas anteriores (p. ej. `bautizados` por defecto en Editor).
 */
export function mergePanelSectionLayers(...layers) {
  const out = {};
  for (const layer of layers) {
    if (layer && typeof layer === 'object') Object.assign(out, layer);
  }
  return out;
}

/**
 * Lista de gastos: además de la sección en el menú, hace falta `canViewExpenses` (solo SuperUsuario asigna a no‑Super).
 * Administrador: `canViewExpenses === false` desactiva explícitamente; `undefined` conserva compatibilidad con datos antiguos.
 */
export function userCanAccessExpenseList(user, sessionIsSuperUser) {
  if (!user) return false;
  if (sessionIsSuperUser) return true;
  const r = normalizeRole(user.role);
  if (r === 'Administrador') {
    if (user.canViewExpenses === false) return false;
    if (user.canViewExpenses === true) return true;
    return true;
  }
  return !!user.canViewExpenses;
}

export function isPanelNavKeyAllowed(user, key, ctx) {
  const { globalPanelNav = {}, isCampa = false, isSuperUser: sessionIsSuperUser = false, eventId = null } = ctx || {};
  if (!user) return false;
  if (key === 'transporte' && ctx?.transportSectionEligible === false) return false;
  if (normalizeRole(user.role) === 'SuperUsuario') return true;

  /** Lista de gastos: solo `canViewExpenses` (+ tope global Editor/Lector); no se configura en «menú lateral» por usuario. */
  if (key === 'expenseList') {
    if (!userCanAccessExpenseList(user, sessionIsSuperUser)) return false;
    const r = normalizeRole(user.role);
    if (r === 'Editor' || r === 'Lector') {
      const g = globalPanelNav && typeof globalPanelNav === 'object' ? globalPanelNav : {};
      if (g.expenseList === false) return false;
    }
    return true;
  }

  const merged = getUserAllowedPanelSectionsForEvent(user, eventId, globalPanelNav);
  if (merged[key] === false) return false;

  if (key === 'responsivas' && !isCampa) return false;
  const isBautizos = ctx?.isBautizos === true;
  if (key === 'serversPage' && !isCampa && !isBautizos) return false;
  if (key === 'bautizados' && !isCampa && !isBautizos) return false;

  return true;
}

/**
 * Claves del menú lateral presentes en al menos un evento al que el usuario tiene acceso.
 * Usar en resúmenes (p. ej. etiquetas de usuario): `mergePanelSectionsForUser` con `eventId: null`
 * no aplica `allowedPanelSectionsByEvent` y puede mostrar secciones que en la práctica están desactivadas.
 */
export function getPanelNavKeysEnabledInAnyEvent(user, events, globalPanelNav = {}, editorConfig = null) {
  if (!user) return new Set();
  const list = Array.isArray(events) ? events : [];
  const ids = getUserAllowedEventIds(user);
  const inScope = ids.length === 0 ? list : list.filter((e) => ids.some((id) => String(id) === String(e.id)));
  const keys = new Set();
  for (const ev of inScope) {
    const eventType = String(ev?.eventType || ev?.type || '').trim();
    const isCampa = eventType === 'Campa';
    const isBautizos = eventType === 'Bautizos';
    const transportSectionEligible =
      editorConfig && typeof editorConfig === 'object'
        ? getTransportSectionEligibleForEventDoc(ev, editorConfig)
        : !eventTypeIsDesayuno(eventType);
    for (const k of PANEL_NAV_KEYS) {
      if (k === 'expenseList') continue;
      if (
        isPanelNavKeyAllowed(user, k, {
          globalPanelNav,
          eventId: ev.id,
          isCampa,
          isBautizos,
          isSuperUser: false,
          transportSectionEligible,
        })
      ) {
        keys.add(k);
      }
    }
  }
  return keys;
}

export function hasFinancialAccess(user) {
  if (!user) return false;
  const r = normalizeRole(user.role);
  if (r === 'Administrador' || r === 'SuperUsuario') return true;
  return !!user.canViewFinances;
}

export function canViewSystemLogs(user) {
  return isAdminOrSuper(user?.role);
}

/** Borrar / recortar logs en Firestore (no sesión anónima del QR). */
export function canDeleteSystemLogs(user, firebaseUser) {
  if (!canViewSystemLogs(user)) return false;
  if (!firebaseUser?.uid) return false;
  if (firebaseUser.isAnonymous === true) return false;
  return true;
}

export function canAddRegistrations(user) {
  if (!user) return false;
  const r = normalizeRole(user.role);
  if (r === 'Lector') return false;
  if (r === 'Editor') return true;
  return isAdminOrSuper(r);
}

/**
 * Edición completa del plan de transporte (unidades, carros, metadatos, etc.).
 * Lector: nunca; el resto con acceso a la sección puede editar.
 */
export function userCanEditTransportPlanning(user) {
  if (!user) return false;
  const r = normalizeRole(user.role);
  if (r === 'Lector') return false;
  return r === 'SuperUsuario' || r === 'Administrador' || r === 'Editor';
}

/**
 * Operaciones de transporte en día de evento: asignar camión y confirmar asistencia.
 * Lector: sí si tiene la sección Transporte (opt-out con `canEditTransportOperations === false`).
 */
export function userCanEditTransportOperations(user) {
  if (!user) return false;
  const r = normalizeRole(user.role);
  if (r === 'SuperUsuario' || r === 'Administrador' || r === 'Editor') return true;
  if (r === 'Lector') {
    if (user.canEditTransportOperations === false) return false;
    return true;
  }
  return false;
}

/** Administrador o SuperUsuario pueden delegar «dar de baja» a un Editor. */
export function canDelegateCancelRegistrations(viewer) {
  return isAdminOrSuper(viewer?.role);
}

/**
 * Dar de baja / reactivar registros en el roster (no archivar).
 * SuperUsuario y Administrador: siempre. Editor: solo si se delega en su perfil.
 */
export function canCancelRegistrations(user) {
  if (!user) return false;
  const r = normalizeRole(user.role);
  if (r === 'SuperUsuario' || r === 'Administrador') return true;
  if (r === 'Editor') return !!user.canCancelRegistrations;
  return false;
}

/** Archivar registros (mover al archivo global): solo personal administrativo. */
export function canArchiveRegistrations(user) {
  return isAdminOrSuper(user?.role);
}

/** Ventana en la que un Editor puede eliminar un abono tras registrarlo. */
export const EDITOR_ABONO_DELETE_WINDOW_MS = 10 * 60 * 1000;

function paymentHistoryRowRecordedAtMs(pay) {
  if (!pay || pay.kind === 'comment') return null;
  const raw = pay.recordedAt;
  if (raw != null) {
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    const t = Date.parse(String(raw));
    if (Number.isFinite(t)) return t;
  }
  const id = pay.id;
  if (typeof id === 'number' && Number.isFinite(id) && id > 1e12) return id;
  const idStr = id != null ? String(id).trim() : '';
  if (/^\d{10,}$/.test(idStr)) return Number(idStr);
  return null;
}

/**
 * Eliminar una fila de abono del historial (no comentarios).
 * SuperUsuario y Administrador: siempre. Editor: solo dentro de {@link EDITOR_ABONO_DELETE_WINDOW_MS} desde `recordedAt`.
 */
export function userCanDeletePaymentHistoryRow(user, pay, opts = {}) {
  const { isSuperUser } = opts;
  if (!user || !pay || pay.kind === 'comment') return false;
  if (pay.kind === 'refund_disbursement') return false;
  const r = normalizeRole(user.role);
  if (r === 'Lector') return false;
  if (isSuperUser || r === 'SuperUsuario' || r === 'Administrador') return true;
  if (r === 'Editor') {
    const ms = paymentHistoryRowRecordedAtMs(pay);
    if (ms == null) return false;
    return Date.now() - ms <= EDITOR_ABONO_DELETE_WINDOW_MS;
  }
  return false;
}

/**
 * Cambiar tipo/monto de abono y fechas sensibles del historial:
 * SuperUsuario o Administrador con `canEditRegistryDates` (delegado por SuperUsuario).
 */
/**
 * Marcar o quitar la marca «persona de interés» en perfiles VNPM (bloquea precarga y nuevo registro).
 * SuperUsuario siempre; Administrador solo si el SuperUsuario lo delega.
 */
export function canMarkPersonsOfInterest(user) {
  if (!user) return false;
  const r = normalizeRole(user.role);
  if (r === 'SuperUsuario') return true;
  if (r === 'Administrador') return !!user.canMarkPersonsOfInterest;
  return false;
}

export function canEditAbonosRegistryAndDeleteHistory(user) {
  if (!user) return false;
  if (normalizeRole(user.role) === 'SuperUsuario') return true;
  if (normalizeRole(user.role) === 'Administrador') return !!user.canEditRegistryDates;
  return false;
}

/**
 * Botones «Enviar WhatsApp» en acciones rápidas del registro.
 * Administrador: por defecto sí (`undefined` cuenta como permitido); Editor/Lector: solo si el SuperUsuario lo activa.
 */
export function userCanSendWhatsAppQuickAction(user) {
  if (!user) return false;
  const r = normalizeRole(user.role);
  if (r === 'SuperUsuario') return true;
  if (r === 'Administrador') return user.canSendWhatsAppQuickAction !== false;
  return !!user.canSendWhatsAppQuickAction;
}

/**
 * Marcar entrega de responsiva física en sitio (acciones rápidas).
 * Editor/Lector: por defecto sí; el legado `canSendResponsivaQuickAction === false` sigue denegando ambos.
 */
export function userCanMarkResponsivaLocalQuickAction(user) {
  if (!user) return false;
  const r = normalizeRole(user.role);
  if (r === 'SuperUsuario') return true;
  if (r === 'Administrador') return user.canMarkResponsivaLocalQuickAction !== false;
  if (r === 'Editor' || r === 'Lector') {
    if (user.canMarkResponsivaLocalQuickAction === false) return false;
    if (user.canMarkResponsivaLocalQuickAction === true) return true;
    if (user.canSendResponsivaQuickAction === false) return false;
    return true;
  }
  return !!user.canMarkResponsivaLocalQuickAction;
}

/**
 * Enviar enlace de responsiva digital (p. ej. WhatsApp) desde acciones rápidas.
 * Editor/Lector: por defecto no; el legado `canSendResponsivaQuickAction === true` concedía ambos.
 */
export function userCanSendResponsivaDigitalQuickAction(user) {
  if (!user) return false;
  const r = normalizeRole(user.role);
  if (r === 'SuperUsuario') return true;
  if (r === 'Administrador') return user.canSendResponsivaDigitalQuickAction !== false;
  if (r === 'Editor' || r === 'Lector') {
    if (user.canSendResponsivaDigitalQuickAction === true) return true;
    if (user.canSendResponsivaDigitalQuickAction === false) return false;
    if (user.canSendResponsivaQuickAction === true) return true;
    return false;
  }
  return !!user.canSendResponsivaDigitalQuickAction;
}
