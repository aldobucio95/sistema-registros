import { useMemo } from 'react';
import { isCompanionWaitlistPhantomStoredParticipant } from '../../bautizosCompanionWaitlist.js';

const STATUS_ARCHIVED = 'archived';
const STATUS_CANCELLED = 'cancelled';

function participantIsRosterRow(p) {
  const s = p?.status || 'active';
  return s !== 'waitlist' && s !== STATUS_ARCHIVED;
}

function participantIsCancelled(p) {
  return (p?.status || 'active') === STATUS_CANCELLED;
}

function participantIsWaitlistRow(p) {
  return (p?.status || 'active') === 'waitlist';
}

function compareParticipantsByRegisteredAtAsc(a, b) {
  const ta = Number(a?.registeredAt) || 0;
  const tb = Number(b?.registeredAt) || 0;
  if (ta !== tb) return ta - tb;
  return String(a?.name || '').localeCompare(String(b?.name || ''), 'es', { sensitivity: 'base' });
}

/**
 * Agrupa participantes activos del roster por sede.
 * @returns {Record<string, object[]>}
 */
export function buildEventRosterDataByLocation(allParticipants, currentEvent, globalLocations) {
  if (!currentEvent) return {};
  const groupedData = globalLocations.reduce((acc, loc) => ({ ...acc, [loc]: [] }), {});
  allParticipants.forEach((p) => {
    if (p.eventId === currentEvent.id && participantIsRosterRow(p) && !participantIsCancelled(p)) {
      if (!groupedData[p.location]) groupedData[p.location] = [];
      groupedData[p.location].push(p);
    }
  });
  for (const loc of Object.keys(groupedData)) {
    groupedData[loc].sort(compareParticipantsByRegisteredAtAsc);
  }
  return groupedData;
}

/**
 * Agrupa participantes en lista de espera por sede.
 * @returns {Record<string, object[]>}
 */
export function buildEventWaitlistDataByLocation(allParticipants, currentEvent, globalLocations) {
  if (!currentEvent) return {};
  const groupedData = globalLocations.reduce((acc, loc) => ({ ...acc, [loc]: [] }), {});
  allParticipants.forEach((p) => {
    if (p.eventId === currentEvent.id && participantIsWaitlistRow(p)) {
      if (isCompanionWaitlistPhantomStoredParticipant(p)) return;
      if (!groupedData[p.location]) groupedData[p.location] = [];
      groupedData[p.location].push(p);
    }
  });
  return groupedData;
}

/**
 * @typedef {Object} EventWorkspaceDataReturn
 * @property {Record<string, object[]>} data - Roster activo agrupado por sede
 * @property {Record<string, object[]>} waitlistData - Lista de espera por sede
 * @property {object|null} summary - Agregados del dashboard (Phase C: still computed in App.jsx)
 * @property {object|null} dashboardSummaryScoped - Resumen acotado a sedes visibles (App.jsx)
 * @property {Array|null} scopedParticipants - Participantes filtrados por sede del usuario (future)
 */

/**
 * Datos derivados del workspace del evento (Phase C).
 * `summary` / `dashboardSummaryScoped` permanecen en App.jsx hasta migración completa.
 *
 * @param {Object} deps
 * @param {Array} deps.allParticipants
 * @param {{ id: string }|null} deps.currentEvent
 * @param {string[]} deps.globalLocations
 * @param {(a: object, b: object) => number} [deps.compareParticipantsByRegisteredAtAsc]
 */
export function useEventWorkspaceData({
  allParticipants,
  currentEvent,
  globalLocations,
  compareParticipantsByRegisteredAtAsc: compareFn,
}) {
  const data = useMemo(() => {
    if (!currentEvent) return {};
    const groupedData = globalLocations.reduce((acc, loc) => ({ ...acc, [loc]: [] }), {});
    allParticipants.forEach((p) => {
      if (p.eventId === currentEvent.id && participantIsRosterRow(p) && !participantIsCancelled(p)) {
        if (!groupedData[p.location]) groupedData[p.location] = [];
        groupedData[p.location].push(p);
      }
    });
    if (compareFn) {
      for (const loc of Object.keys(groupedData)) {
        groupedData[loc].sort(compareFn);
      }
    }
    return groupedData;
  }, [allParticipants, currentEvent, globalLocations, compareFn]);

  const waitlistData = useMemo(
    () => buildEventWaitlistDataByLocation(allParticipants, currentEvent, globalLocations),
    [allParticipants, currentEvent, globalLocations]
  );

  return {
    data,
    waitlistData,
    /** @type {object|null} Computed in App.jsx (`dashboardSummaryScoped.all`). */
    summary: null,
    /** @type {object|null} Computed in App.jsx (`dashboardSummaryScoped`). */
    dashboardSummaryScoped: null,
    /** @type {Array|null} Future: participants scoped to visible locations. */
    scopedParticipants: null,
  };
}
