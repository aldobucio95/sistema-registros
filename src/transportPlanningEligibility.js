import { mergeEditorRegistrationFieldVisibility } from './registrationFormEditorConfig.js';

export function eventTypeIsDesayuno(eventType) {
  return String(eventType || '')
    .toLowerCase()
    .includes('desayuno');
}

/**
 * ¿El evento puede mostrar la sección «Transporte» en el panel?
 * Alineado con formularios: desayuno nunca; Bautizos según bloque de transporte / sedes; resto según viaje.
 */
export function isTransportPlanningEligible(eventType, editorFieldVisMerged) {
  if (eventTypeIsDesayuno(eventType)) return false;
  const et = String(eventType || '').trim();
  /** Campa: la sección Transporte del panel aplica siempre (planificación de unidades / sedes). */
  if (et === 'Campa') return true;
  const v = editorFieldVisMerged && typeof editorFieldVisMerged === 'object'
    ? editorFieldVisMerged
    : mergeEditorRegistrationFieldVisibility();
  if (et === 'Bautizos') {
    return v.bautizosTransport !== false || v.travelFrom !== false || v.travelTo !== false;
  }
  return v.transportExtras !== false || v.travelFrom !== false || v.travelTo !== false;
}

export function getTransportSectionEligibleForEventDoc(ev, globalConfig) {
  if (!ev) return false;
  const eventType = String(ev.eventType || ev.type || '').trim();
  const typeRaw =
    globalConfig?.editorRegistrationFieldsByType &&
    typeof globalConfig.editorRegistrationFieldsByType === 'object'
      ? globalConfig.editorRegistrationFieldsByType[eventType]
      : null;
  const typeVis = mergeEditorRegistrationFieldVisibility(typeRaw);
  const eventObj =
    ev.editorRegistrationFields && typeof ev.editorRegistrationFields === 'object'
      ? ev.editorRegistrationFields
      : {};
  return isTransportPlanningEligible(eventType, { ...typeVis, ...eventObj });
}
