import {
  BAUTIZOS_ATTENDANCE,
  isBautizosPastorAttendance,
  normalizeBautizosAttendanceType,
} from './bautizosParty.js';
import { ATTENDANCE_SPECIAL, normalizeAttendanceSpecial } from './publicRegistrationLogic.js';
import { compareIsoDates, getEventEffectiveEndDate, getEventEffectiveStartDate } from './eventDateHelpers.js';

/** Pastor en cualquier tipo de evento (Bautizos: tipo de asistencia; resto: asistencia especial). */
export function isPastorParticipant(personLike, eventType) {
  const et = String(eventType || '').trim();
  if (et === 'Bautizos') {
    return normalizeBautizosAttendanceType(personLike?.bautizosAttendanceType) === BAUTIZOS_ATTENDANCE.pastor;
  }
  return normalizeAttendanceSpecial(personLike) === ATTENDANCE_SPECIAL.pastor;
}

export function getPastorRealCostAmount(personLike) {
  const n = parseFloat(personLike?.pastorRealCost);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

export function normalizePastorStayDate(raw) {
  const s = String(raw ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
  return s;
}

export function eventHasMultipleCalendarDays(eventLike) {
  const start = getEventEffectiveStartDate(eventLike);
  const end = getEventEffectiveEndDate(eventLike);
  if (!start || !end) return false;
  return compareIsoDates(start, end) < 0;
}

/** El evento tiene fechas de inicio y fin configuradas (permite capturar llegada/salida). */
export function eventSupportsPastorStayDates(eventLike) {
  const start = getEventEffectiveStartDate(eventLike);
  const end = getEventEffectiveEndDate(eventLike);
  return !!start && !!end;
}

export function sumPastorRealCostForParticipants(participants, eventType) {
  return (participants || [])
    .filter((p) => isPastorParticipant(p, eventType))
    .reduce((sum, p) => sum + getPastorRealCostAmount(p), 0);
}

export function countPastorParticipants(participants, eventType) {
  return (participants || []).filter((p) => isPastorParticipant(p, eventType)).length;
}
