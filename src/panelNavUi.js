import { eventTypeIsDesayuno } from './transportPlanningEligibility.js';

/**
 * Textos del menú lateral según tipo de evento.
 * @param {{ key: string, label: string, hint?: string }} item Entrada de `PANEL_NAV_CONFIG_ITEMS`.
 * @param {string | null | undefined} eventType `currentEvent.eventType` o el del evento en el formulario de usuario.
 */
/** Si la entrada del menú lateral aplica al tipo de evento (p. ej. Servidores solo en Campa). */
export function panelNavSidebarItemAppliesToEvent(itemKey, eventType) {
  const et = String(eventType || '').trim();
  if (itemKey === 'serversPage') return et === 'Campa';
  if (itemKey === 'bautizados') return et === 'Campa';
  if (itemKey === 'transporte') return !eventTypeIsDesayuno(et);
  return true;
}

export function resolvePanelNavConfigItemCopy(item, eventType) {
  void eventType;
  return { label: item?.label ?? '', hint: item?.hint ?? '' };
}
