/**
 * Conteos canónicos por sede.
 * La superficie de evento Bautizos (expansión titular+acompañantes) fue retirada;
 * las APIs se conservan como no-ops para no romper importadores (waitlist dashboard, etc.).
 */

export function bautizosExpandedRowsToTypeTotals(_expandedRows) {
  return {
    bautizado: 0,
    acompanante: 0,
    asistente: 0,
    servidor: 0,
    empleado: 0,
    cortesia: 0,
  };
}

export function getBautizosCancelledExpandedRowsAtLocation() {
  return [];
}

export function getBautizosWaitlistExpandedRowsAtLocation() {
  return [];
}

export function countBautizosWaitlistExpandedPeople() {
  return 0;
}

export function analyzeBautizosWaitlistExpandedAtLocation() {
  return {
    total: 0,
    bautizados: 0,
    acompanantes: 0,
    asistentes: 0,
    servidores: 0,
    empleados: 0,
    cortesias: 0,
  };
}

export function computeBautizosRosterStatusCountsForLocation() {
  return { active: 0, waitlist: 0, cancelled: 0, all: 0 };
}
