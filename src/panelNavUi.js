import { eventTypeIsDesayuno } from './transportPlanningEligibility.js';

/**
 * Textos del menú lateral según tipo de evento (p. ej. la clave `becados` abre Becados en Campa y Acompañantes en Bautizos).
 * @param {{ key: string, label: string, hint?: string }} item Entrada de `PANEL_NAV_CONFIG_ITEMS`.
 * @param {string | null | undefined} eventType `currentEvent.eventType` o el del evento en el formulario de usuario.
 */
/** Si la entrada del menú lateral aplica al tipo de evento (p. ej. Servidores solo en Campa). */
export function panelNavSidebarItemAppliesToEvent(itemKey, eventType) {
  const et = String(eventType || '').trim();
  if (itemKey === 'serversPage') return et === 'Campa' || et === 'Bautizos';
  if (itemKey === 'bautizados') return et === 'Campa' || et === 'Bautizos';
  if (itemKey === 'transporte') return !eventTypeIsDesayuno(et);
  return true;
}

export function resolvePanelNavConfigItemCopy(item, eventType) {
  const et = String(eventType ?? '').trim();
  if (item?.key === 'becados' && et === 'Bautizos') {
    return {
      label: 'Acompañantes',
      hint:
        'Permite ver la lista de acompañantes (nombre, a quién acompañan, parentesco y sede). En campamentos, esta misma clave controla la vista Becados.',
    };
  }
  if (item?.key === 'serversPage' && et === 'Bautizos') {
    return {
      label: 'Servidores y empleados',
      hint:
        'Listado de inscritos tipo servidor o empleado (áreas de servicio, pareja, hijos, transporte). En campamentos, la misma clave abre la página de servidores Campa.',
    };
  }
  return { label: item?.label ?? '', hint: item?.hint ?? '' };
}
