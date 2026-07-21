/**
 * Ítems de menú lateral para tipos de asistencia (orden del plan).
 */
import {
  ATTENDANCE_ROLE_LABELS,
  ATTENDANCE_ROLE_MENU_ORDER,
  ATTENDANCE_ROLE_PANEL_KEY,
  ATTENDANCE_ROLE_TAB,
} from './attendanceRoles.js';

export const ATTENDANCE_ROLE_SIDEBAR_ITEMS = ATTENDANCE_ROLE_MENU_ORDER.map((roleKey) => ({
  roleKey,
  panelKey: ATTENDANCE_ROLE_PANEL_KEY[roleKey],
  tab: ATTENDANCE_ROLE_TAB[roleKey],
  label: ATTENDANCE_ROLE_LABELS[roleKey],
}));
