import {
  BAUTIZOS_ATTENDANCE,
  bautizosParticipatesAsServer,
  flatRowMatchesBautizosDashboardScope,
  resolveBautizosFlatAttendanceType,
} from './bautizosAttendance.js';
import { flattenBautizosParticipantsForRead } from './bautizosLegacyReadAdapter.js';
import { isSiValue, resolveLlegaEnCarroPricing } from './bautizosSiUtils.js';

/**
 * Conteos por sede para tabla del dashboard (filas planas).
 */
export function buildBautizosLocationTableStats(titularRows, loc, scope, { participantIsCancelled } = {}) {
  const locNorm = String(loc || '').trim();
  const flat = flattenBautizosParticipantsForRead(titularRows || []).filter((p) => {
    if (String(p.location || '').trim() !== locNorm) return false;
    if (typeof participantIsCancelled === 'function' && participantIsCancelled(p)) return false;
    return flatRowMatchesBautizosDashboardScope(p, scope);
  });

  const stats = {
    count: flat.length,
    activeRegistrants: flat.length,
    bautizados: 0,
    companions: 0,
    companionsTotal: 0,
    asistentesBautizos: 0,
    empleadosBautizos: 0,
    pastores: 0,
    cortesia: 0,
    servers: 0,
    bautizosTransport: 0,
    bautizosCarro: 0,
  };

  for (const p of flat) {
    const att = resolveBautizosFlatAttendanceType(p);
    if (att === BAUTIZOS_ATTENDANCE.bautizado) stats.bautizados += 1;
    if (att === BAUTIZOS_ATTENDANCE.acompanante) {
      stats.companions += 1;
      stats.companionsTotal += 1;
    }
    if (att === BAUTIZOS_ATTENDANCE.asistente) stats.asistentesBautizos += 1;
    if (att === BAUTIZOS_ATTENDANCE.empleado) stats.empleadosBautizos += 1;
    if (att === BAUTIZOS_ATTENDANCE.pastor) stats.pastores += 1;
    if (att === BAUTIZOS_ATTENDANCE.cortesia) stats.cortesia += 1;
    if (bautizosParticipatesAsServer(p)) stats.servers += 1;
    if (isSiValue(p.wantsBautizosTransport) && !resolveLlegaEnCarroPricing(p)) stats.bautizosTransport += 1;
    if (resolveLlegaEnCarroPricing(p)) stats.bautizosCarro += 1;
  }

  return stats;
}

export function flattenBautizosDashboardRoster(titularRows) {
  return flattenBautizosParticipantsForRead(titularRows || []);
}
