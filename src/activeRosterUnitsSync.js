import { computeDashboardTodosRosterTotal } from './dashboardTodosRosterTotal.js';

/** Usuario con visibilidad de todas las sedes del evento (o admin). */
export function hasFullEventRosterScope(event, visibleLocations, hasAdminRights = false) {
  if (hasAdminRights) return true;
  const eventLocs = (event?.locations || []).map((l) => String(l).trim()).filter(Boolean);
  if (eventLocs.length === 0) return true;
  const visibleSet = new Set((visibleLocations || []).map((l) => String(l).trim()).filter(Boolean));
  return eventLocs.every((loc) => visibleSet.has(loc));
}

/**
 * ¿Persistir `activeRosterUnitsTotal` en Firestore? Solo con roster completo del evento y alcance total.
 * @returns {{ shouldSync: boolean, computed: number, stored: number }}
 */
export function planActiveRosterUnitsSync({
  event,
  participants,
  visibleLocations,
  hasAdminRights = false,
}) {
  if (!event?.id) return { shouldSync: false, computed: 0, stored: 0 };
  const evId = String(event.id);
  const rows = (participants || []).filter((p) => String(p?.eventId || '') === evId);
  if (rows.length === 0) return { shouldSync: false, computed: 0, stored: 0 };
  if (!hasFullEventRosterScope(event, visibleLocations, hasAdminRights)) {
    return { shouldSync: false, computed: 0, stored: 0 };
  }

  const computed = computeDashboardTodosRosterTotal(rows, event);
  if (!Number.isFinite(computed)) return { shouldSync: false, computed: 0, stored: 0 };
  const stored = Math.floor(Number(event.activeRosterUnitsTotal) || 0);
  return {
    shouldSync: computed !== stored,
    computed: Math.floor(computed),
    stored,
  };
}
