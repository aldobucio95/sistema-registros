import {
  BAUTIZOS_ATTENDANCE,
  flatRowMatchesBautizosDashboardScope,
  participantIsAcompanante,
  participantIsBautizado,
  participantIsBautizosServidorOrEmpleadoAttendance,
  resolveBautizosFlatAttendanceType,
} from './bautizosAttendance.js';
import { flattenBautizosParticipantsForRead } from './bautizosLegacyReadAdapter.js';

function isCompanionWaitlistPhantomStoredParticipant(personLike) {
  if (personLike?._isCompanionWaitlistVirtual === true) return true;
  return String(personLike?.id || '').trim().startsWith('cw:');
}

/** Total de personas planas para cupo / «Registros totales». */
export function computeBautizosTodosTotal(rosterBase) {
  const flat = flattenBautizosParticipantsForRead(rosterBase || []);
  return flat.filter((p) => !isCompanionWaitlistPhantomStoredParticipant(p)).length;
}

export function countBautizosByAttendanceType(flatRows) {
  const counts = {
    bautizado: 0,
    acompanante: 0,
    asistente: 0,
    servidor: 0,
    empleado: 0,
    cortesia: 0,
    pastor: 0,
  };
  for (const p of flatRows || []) {
    const t = resolveBautizosFlatAttendanceType(p);
    if (Object.prototype.hasOwnProperty.call(counts, t)) counts[t] += 1;
  }
  return counts;
}

export function countBautizosDashboardPeople(flatRows, scope) {
  return (flatRows || []).filter((p) => flatRowMatchesBautizosDashboardScope(p, scope)).length;
}

export function countBautizosServidoresYEmpleadosPeople(flatRows) {
  let n = 0;
  for (const p of flatRows || []) {
    if (participantIsBautizosServidorOrEmpleadoAttendance(p)) n += 1;
  }
  return n;
}

export function summarizeBautizosFlatRoster(rosterBase) {
  const flat = flattenBautizosParticipantsForRead(rosterBase || []);
  const byType = countBautizosByAttendanceType(flat);
  return {
    flatRows: flat,
    total: flat.length,
    bautizados: byType.bautizado,
    companions: byType.acompanante,
    asistentes: byType.asistente,
    servidores: byType.servidor,
    empleados: byType.empleado,
    cortesias: byType.cortesia,
    pastores: byType.pastor,
    servidoresYEmpleados: countBautizosServidoresYEmpleadosPeople(flat),
  };
}

export function filterFlatRowsByAttendanceTypes(flatRows, types) {
  const set = new Set((types || []).map((t) => String(t).trim()).filter(Boolean));
  if (set.size === 0) return flatRows || [];
  return (flatRows || []).filter((p) => set.has(resolveBautizosFlatAttendanceType(p)));
}

export function filterFlatBautizados(flatRows) {
  return (flatRows || []).filter((p) => participantIsBautizado(p));
}

export function filterFlatAcompanantes(flatRows) {
  return (flatRows || []).filter((p) => participantIsAcompanante(p));
}

export { BAUTIZOS_ATTENDANCE };
