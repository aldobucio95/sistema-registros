import { isSiValue } from './bautizosSiUtils.js';

export const BAUTIZOS_ATTENDANCE = Object.freeze({
  bautizado: 'bautizado',
  acompanante: 'acompanante',
  asistente: 'asistente',
  servidor: 'servidor',
  empleado: 'empleado',
  cortesia: 'cortesia',
  pastor: 'pastor',
});

export const bautizosPastorAttendance = BAUTIZOS_ATTENDANCE.pastor;

export const BAPTISM_SHIRT_SIZES = Object.freeze(['CH', 'M', 'G', 'XL', 'XXL']);

export const BAUTIZOS_DASHBOARD_SCOPE_OPTIONS = Object.freeze([
  { id: 'all', label: 'Todos' },
  { id: 'baptized', label: 'Bautizados' },
  { id: 'companions', label: 'Acompañantes' },
  { id: BAUTIZOS_ATTENDANCE.asistente, label: 'Asistentes' },
  { id: BAUTIZOS_ATTENDANCE.servidor, label: 'Servidores' },
  { id: BAUTIZOS_ATTENDANCE.empleado, label: 'Empleados' },
  { id: BAUTIZOS_ATTENDANCE.cortesia, label: 'Cortesías' },
  { id: BAUTIZOS_ATTENDANCE.pastor, label: 'Pastores' },
]);

export const BAUTIZOS_DASHBOARD_SCOPE_IDS = BAUTIZOS_DASHBOARD_SCOPE_OPTIONS.map((o) => o.id);

export function normalizeBaptismShirtSize(raw) {
  const s = String(raw ?? '')
    .trim()
    .toUpperCase();
  if (!s) return '';
  if (BAPTISM_SHIRT_SIZES.includes(s)) return s;
  return '';
}

export function normalizeBautizosAttendanceType(raw) {
  const s = String(raw || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (s === 'acompanante' || s === 'acompanantes') return BAUTIZOS_ATTENDANCE.acompanante;
  if (s === 'asistente') return BAUTIZOS_ATTENDANCE.asistente;
  if (s === 'servidor') return BAUTIZOS_ATTENDANCE.servidor;
  if (s === 'empleado') return BAUTIZOS_ATTENDANCE.empleado;
  if (s === 'cortesia') return BAUTIZOS_ATTENDANCE.cortesia;
  if (s === 'pastor') return BAUTIZOS_ATTENDANCE.pastor;
  return BAUTIZOS_ATTENDANCE.bautizado;
}

/** Tipo efectivo en fila plana (docs nuevos o virtuales legados). */
export function resolveBautizosFlatAttendanceType(personLike) {
  if (personLike?.__legacyCompanionBaptized === true) {
    return BAUTIZOS_ATTENDANCE.bautizado;
  }
  if (personLike?.__legacyCompanionRow === true) {
    return BAUTIZOS_ATTENDANCE.acompanante;
  }
  return normalizeBautizosAttendanceType(personLike?.bautizosAttendanceType);
}

export function isFreeBautizosAttendance(personLike) {
  const t = resolveBautizosFlatAttendanceType(personLike);
  return (
    t === BAUTIZOS_ATTENDANCE.empleado ||
    t === BAUTIZOS_ATTENDANCE.cortesia ||
    t === BAUTIZOS_ATTENDANCE.pastor
  );
}

export function isBautizosPastorAttendance(personLike) {
  return resolveBautizosFlatAttendanceType(personLike) === BAUTIZOS_ATTENDANCE.pastor;
}

export function bautizosAttendancePaysEventListPrice(personLike) {
  if (isFreeBautizosAttendance(personLike)) return false;
  const t = resolveBautizosFlatAttendanceType(personLike);
  return (
    t === BAUTIZOS_ATTENDANCE.bautizado ||
    t === BAUTIZOS_ATTENDANCE.acompanante ||
    t === BAUTIZOS_ATTENDANCE.asistente ||
    t === BAUTIZOS_ATTENDANCE.servidor
  );
}

export function bautizosWillBeBaptizedFromAttendance(rawType) {
  return normalizeBautizosAttendanceType(rawType) === BAUTIZOS_ATTENDANCE.bautizado;
}

export function participantHasBaptismChip(personLike, eventType) {
  const et = String(eventType || '').trim();
  if (personLike?._isCompanionWaitlistVirtual === true) return false;
  if (et === 'Campa') return isSiValue(personLike?.willBeBaptized);
  if (et === 'Bautizos') {
    return resolveBautizosFlatAttendanceType(personLike) === BAUTIZOS_ATTENDANCE.bautizado;
  }
  return false;
}

export function participantIsBautizado(personLike) {
  return resolveBautizosFlatAttendanceType(personLike) === BAUTIZOS_ATTENDANCE.bautizado;
}

export function participantIsAcompanante(personLike) {
  return resolveBautizosFlatAttendanceType(personLike) === BAUTIZOS_ATTENDANCE.acompanante;
}

export function participantIsBautizosServidorOrEmpleadoAttendance(personLike) {
  const t = resolveBautizosFlatAttendanceType(personLike);
  return t === BAUTIZOS_ATTENDANCE.servidor || t === BAUTIZOS_ATTENDANCE.empleado;
}

export function bautizosParticipatesAsServer(personLike) {
  const t = resolveBautizosFlatAttendanceType(personLike);
  if (t === BAUTIZOS_ATTENDANCE.servidor) return true;
  return isSiValue(personLike?.isServer);
}

export function getBautizosAttendanceTypeLabel(personLike) {
  const t = resolveBautizosFlatAttendanceType(personLike);
  if (t === BAUTIZOS_ATTENDANCE.acompanante) return 'Acompañante';
  if (t === BAUTIZOS_ATTENDANCE.asistente) return 'Asistente';
  if (t === BAUTIZOS_ATTENDANCE.servidor) return 'Servidor';
  if (t === BAUTIZOS_ATTENDANCE.empleado) return 'Empleado';
  if (t === BAUTIZOS_ATTENDANCE.cortesia) return 'Cortesía';
  if (t === BAUTIZOS_ATTENDANCE.pastor) return 'Pastor';
  return 'Bautizado';
}

export function resolveBautizosAttendanceChipKind(personLike) {
  return resolveBautizosFlatAttendanceType(personLike);
}

export function normalizeBautizosDashboardScope(raw) {
  const s = String(raw || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!s || s === 'all') return 'all';
  if (s === 'baptized' || s === 'bautizado' || s === 'bautizados') return 'baptized';
  if (s === 'companions' || s === 'acompanantes' || s === 'acompanante') return 'companions';
  if (s === 'asistente') return BAUTIZOS_ATTENDANCE.asistente;
  if (s === 'servidor') return BAUTIZOS_ATTENDANCE.servidor;
  if (s === 'empleado') return BAUTIZOS_ATTENDANCE.empleado;
  if (s === 'cortesia') return BAUTIZOS_ATTENDANCE.cortesia;
  if (s === 'pastor') return BAUTIZOS_ATTENDANCE.pastor;
  return 'all';
}

export function resolveBautizosDashboardGlobalScope(scopes) {
  if (!scopes || typeof scopes !== 'object') return 'all';
  if (scopes.dashBautizosScope != null && String(scopes.dashBautizosScope).trim() !== '') {
    return normalizeBautizosDashboardScope(scopes.dashBautizosScope);
  }
  if (scopes.dashBautizosParty != null && String(scopes.dashBautizosParty).trim() !== '') {
    return normalizeBautizosDashboardScope(scopes.dashBautizosParty);
  }
  return 'all';
}

export function getBautizosDashboardScopeLabel(scope) {
  const sc = normalizeBautizosDashboardScope(scope);
  const hit = BAUTIZOS_DASHBOARD_SCOPE_OPTIONS.find((o) => o.id === sc);
  return hit ? hit.label : 'Todos';
}

export function flatRowMatchesBautizosDashboardScope(personLike, scope) {
  const sc = normalizeBautizosDashboardScope(scope);
  if (sc === 'all') return true;
  if (sc === 'baptized') return participantIsBautizado(personLike);
  if (sc === 'companions') return participantIsAcompanante(personLike);
  if (sc === BAUTIZOS_ATTENDANCE.servidor) return bautizosParticipatesAsServer(personLike);
  return resolveBautizosFlatAttendanceType(personLike) === sc;
}

export function collectBautizosServidoresYEmpleadosRows(flatRows) {
  const out = [];
  const seen = new Set();
  for (const p of flatRows || []) {
    if (!participantIsBautizosServidorOrEmpleadoAttendance(p)) continue;
    const id = String(p?.id || '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(p);
  }
  return out;
}
