/** Textos del menú lateral según tipo de evento. */
import { eventTypeIsDesayuno } from './transportPlanningEligibility.js';
import { ATTENDANCE_ROLE_PANEL_KEY } from './attendanceRoles.js';
import { isAttendanceTypeEnabled } from './eventTypePresets.js';

/**
 * Si la entrada del menú lateral aplica al tipo de evento.
 * Roles: se filtran por enabledAttendanceTypes del evento cuando hay doc;
 * sin doc, se muestran todas las claves de rol (el create/edit las acota).
 */
export function panelNavSidebarItemAppliesToEvent(itemKey, eventType, eventDoc = null) {
  if (eventTypeIsDesayuno(eventType) && itemKey === 'transporte') return false;
  const roleEntry = Object.entries(ATTENDANCE_ROLE_PANEL_KEY).find(([, pk]) => pk === itemKey);
  if (roleEntry) {
    if (eventDoc) return isAttendanceTypeEnabled(eventDoc, roleEntry[0]);
    return true;
  }
  // Alias legado
  if (itemKey === 'serversPage' || itemKey === 'bautizados' || itemKey === 'becados') return false;
  return true;
}

export function resolvePanelNavConfigItemCopy(item, eventType) {
  void eventType;
  return { label: item?.label ?? '', hint: item?.hint ?? '' };
}
