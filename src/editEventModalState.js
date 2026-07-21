/**
 * Estado del modal «Editar evento» (antes solo renombrar).
 */
import {
  normalizeAttendanceWeights,
  normalizeCostRubros,
} from './eventCostModel.js';
import { resolveEventAttendanceConfig } from './eventTypePresets.js';

export const CLOSED_EDIT_EVENT_MODAL = Object.freeze({
  isOpen: false,
  id: null,
  name: '',
});

export function buildEditEventModalState(eventDoc) {
  if (!eventDoc?.id) return { ...CLOSED_EDIT_EVENT_MODAL };
  const cfg = resolveEventAttendanceConfig(eventDoc);
  return {
    isOpen: true,
    id: eventDoc.id,
    name: String(eventDoc.name || ''),
    eventType: cfg.eventType,
    enabledAttendanceTypes: { ...cfg.enabledAttendanceTypes },
    baseAttendanceType: cfg.baseAttendanceType,
    responsivaEnabled: cfg.responsivaEnabled,
    publicRegistrationEnabled: cfg.publicRegistrationEnabled,
    transportEnabled: cfg.transportEnabled,
    costRubros: normalizeCostRubros(eventDoc?.costRubros),
    attendanceWeights: normalizeAttendanceWeights(eventDoc?.attendanceWeights),
  };
}

/**
 * Payload Firestore para guardar nombre + attendance config.
 * @returns {{ ok: true, payload: object } | { ok: false, error: string }}
 */
export function buildEditEventFirestorePayload(modal) {
  const name = String(modal?.name || '').trim();
  if (!name) return { ok: false, error: 'El nombre del evento es obligatorio.' };
  if (!modal?.id) return { ok: false, error: 'Evento no válido.' };

  const cfg = resolveEventAttendanceConfig({
    eventType: modal.eventType,
    enabledAttendanceTypes: modal.enabledAttendanceTypes,
    baseAttendanceType: modal.baseAttendanceType,
    responsivaEnabled: modal.responsivaEnabled,
    publicRegistrationEnabled: modal.publicRegistrationEnabled,
    transportEnabled: modal.transportEnabled,
  });

  if (!cfg.enabledRoleKeys.length) {
    return { ok: false, error: 'Habilita al menos un tipo de asistencia.' };
  }

  let baseAttendanceType = cfg.baseAttendanceType;
  if (!cfg.enabledAttendanceTypes[baseAttendanceType]) {
    baseAttendanceType = cfg.enabledRoleKeys[0];
  }

  return {
    ok: true,
    payload: {
      name,
      enabledAttendanceTypes: { ...cfg.enabledAttendanceTypes },
      baseAttendanceType,
      responsivaEnabled: !!cfg.responsivaEnabled,
      publicRegistrationEnabled: !!cfg.publicRegistrationEnabled,
      transportEnabled: !!cfg.transportEnabled,
      costRubros: normalizeCostRubros(modal.costRubros),
      attendanceWeights: normalizeAttendanceWeights(modal.attendanceWeights),
    },
  };
}
