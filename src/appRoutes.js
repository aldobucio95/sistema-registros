/**
 * Rutas URL ↔ estado interno de la app (evento + pestaña / sede).
 * Slugs: nombre de evento normalizado; sección en español (p. ej. dashboard, servidores).
 */
import { sanitizeFirestoreDocId } from './firestoreDocId.js';

/** Pestañas fijas del panel → segmento de URL (después de /eventos/:slug/) */
export const TAB_TO_ROUTE_SEGMENT = {
  Summary: 'dashboard',
  Bautizados: 'bautizados',
  ServersPage: 'servidores',
  Becados: 'becados',
  BautizosCompanions: 'acompanantes',
  Responsivas: 'responsivas',
  RegistroGlobal: 'registro-global',
  TransportPlanning: 'transporte',
  CashCut: 'corte-caja',
  ExpenseList: 'gastos',
};

export const ROUTE_SEGMENT_TO_TAB = Object.fromEntries(
  Object.entries(TAB_TO_ROUTE_SEGMENT).map(([tab, seg]) => [seg, tab])
);

export function slugify(str) {
  if (str == null || str === '') return '';
  return sanitizeFirestoreDocId(str, { lowercase: true, fallback: '', maxChars: 200 });
}

/** Slug estable para la URL del evento (nombre; si no hay, id). */
export function eventUrlSlug(event) {
  if (!event) return '';
  const fromName = slugify(event.name || '');
  if (fromName) return fromName;
  return slugify(String(event.id || '')) || String(event.id || '');
}

export function findEventByUrlSlug(events, slug) {
  if (!slug || !Array.isArray(events)) return null;
  const raw = String(slug).toLowerCase();
  const decoded = (() => {
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  })();
  const byId = events.find((e) => String(e.id).toLowerCase() === decoded || String(e.id).toLowerCase() === raw);
  if (byId) return byId;
  return (
    events.find((e) => eventUrlSlug(e) === decoded) ||
    events.find((e) => eventUrlSlug(e) === raw) ||
    null
  );
}

/** Construye ruta bajo /eventos/:slug/… */
export function buildEventSectionPath(event, activeTab, locations) {
  const slug = eventUrlSlug(event);
  if (!slug) return '/eventos';
  const fixed = Object.keys(TAB_TO_ROUTE_SEGMENT);
  if (fixed.includes(activeTab)) {
    const seg = TAB_TO_ROUTE_SEGMENT[activeTab] || 'dashboard';
    return `/eventos/${encodeURIComponent(slug)}/${seg}`;
  }
  const locSlug = slugify(activeTab);
  if (!locSlug) return `/eventos/${encodeURIComponent(slug)}/dashboard`;
  if (Array.isArray(locations) && !locations.includes(activeTab)) {
    return `/eventos/${encodeURIComponent(slug)}/dashboard`;
  }
  return `/eventos/${encodeURIComponent(slug)}/sede/${encodeURIComponent(locSlug)}`;
}

/**
 * @param {'events'|'users'|'logs'|'archive'} systemView
 * @param {string|null} selectedEventId
 * @param {string} activeTab
 * @param {object|null} currentEvent
 * @param {object[]} events
 * @param {string[]} visibleLocations
 */
export function buildPathFromNavState(systemView, selectedEventId, activeTab, currentEvent, events, visibleLocations) {
  if (systemView === 'users') return '/usuarios';
  if (systemView === 'logs') return '/logs';
  if (systemView === 'archive') return '/archivo';
  if (systemView === 'events' && !selectedEventId) return '/eventos';
  const ev = currentEvent || events.find((e) => String(e.id) === String(selectedEventId));
  if (!ev) return '/eventos';
  return buildEventSectionPath(ev, activeTab, visibleLocations);
}

/**
 * Ruta esperada para un snapshot de navegación (mismo criterio que `goTo` / `buildPathFromNavState`).
 * @param {{ systemView: string, selectedEventId: string|null, activeTab: string }} snap
 * @param {object[]} events
 * @param {(event: object) => string[]} getVisibleLocationsForEvent
 */
export function buildPathFromNavSnapshot(snap, events, getVisibleLocationsForEvent) {
  if (!snap || typeof snap !== 'object') return '/eventos';
  const evList = Array.isArray(events) ? events : [];
  const targetEvent =
    snap.selectedEventId != null && snap.selectedEventId !== ''
      ? evList.find((e) => String(e.id) === String(snap.selectedEventId))
      : null;
  const locs =
    targetEvent && typeof getVisibleLocationsForEvent === 'function'
      ? getVisibleLocationsForEvent(targetEvent)
      : [];
  return buildPathFromNavState(
    snap.systemView,
    snap.selectedEventId,
    snap.activeTab,
    targetEvent,
    evList,
    locs
  );
}

/**
 * Compara rutas de React Router (basename relativo) evitando reemplazos por diferencias de codificación o barra final.
 * Útil al sincronizar URL con estado tras F5 o cambios de pestaña.
 */
export function pathsEqualForRouter(a, b) {
  const na = a == null ? '' : String(a);
  const nb = b == null ? '' : String(b);
  const trim = (p) => p.replace(/\/$/, '') || '/';
  const u = (p) => {
    try {
      return trim(decodeURIComponent(p));
    } catch {
      return trim(p);
    }
  };
  if (u(na) === u(nb)) return true;
  return false;
}

/** Pantalla «Selecciona un Evento» (`/eventos` sin evento en la URL). */
export function isEventSelectionPath(pathname) {
  return pathsEqualForRouter(pathname, '/eventos');
}

/**
 * Interpreta pathname (sin query) para sincronizar estado.
 * @returns {{
 *   kind: 'login'|'eventos'|'usuarios'|'logs'|'archivo'|'event',
 *   eventSlug?: string,
 *   routeSegment?: string,
 *   locationSlug?: string
 * } | null}
 */
export function parseAppPathname(pathname) {
  const path = pathname === '' ? '/' : pathname;
  if (path === '/login') return { kind: 'login' };
  if (path === '/eventos' || path === '/eventos/') return { kind: 'eventos' };
  if (path === '/usuarios' || path === '/usuarios/') return { kind: 'usuarios' };
  if (path === '/logs' || path === '/logs/') return { kind: 'logs' };
  if (path === '/archivo' || path === '/archivo/') return { kind: 'archivo' };

  const parts = path.split('/').filter(Boolean);
  if (parts[0] !== 'eventos') return null;
  if (parts.length < 2) return { kind: 'eventos' };

  const eventSlug = parts[1];
  if (parts.length === 2) {
    return { kind: 'event', eventSlug, routeSegment: 'dashboard' };
  }
  if (parts[2] === 'sede' && parts[3]) {
    return { kind: 'event', eventSlug, routeSegment: 'sede', locationSlug: parts[3] };
  }
  return { kind: 'event', eventSlug, routeSegment: parts[2] || 'dashboard' };
}

/**
 * Convierte parse de evento + locations del evento a activeTab (string).
 * @param {string} [eventType] Tipo de evento (p. ej. `Bautizos`) para mapear rutas compartidas.
 */
export function routeSegmentToActiveTab(routeSegment, locationSlug, locations, eventType = null) {
  if (routeSegment === 'sede' && locationSlug && Array.isArray(locations)) {
    const want = slugify(decodeURIComponent(String(locationSlug)));
    const match = locations.find((loc) => slugify(loc) === want);
    return match || locations[0] || 'Summary';
  }
  const et = String(eventType || '').trim();
  if (routeSegment === 'acompanantes') {
    return et === 'Bautizos' ? 'BautizosCompanions' : 'Summary';
  }
  if (routeSegment === 'becados' && et === 'Bautizos') {
    return 'BautizosCompanions';
  }
  const tab = ROUTE_SEGMENT_TO_TAB[routeSegment];
  return tab || 'Summary';
}
