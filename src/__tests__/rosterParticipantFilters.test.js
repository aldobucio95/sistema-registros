import { describe, expect, it } from 'vitest';
import { BAUTIZOS_ATTENDANCE } from '../bautizosParty.js';
import {
  countRowsMatchingBautizosAttendanceFilter,
  participantMatchesBautizosAttendanceFilter,
  resolveBautizosAttendanceFilterIdsForRow,
} from '../rosterParticipantFilters.js';

describe('participantMatchesBautizosAttendanceFilter combinations', () => {
  it('empleado + participa como servidor aparece en filtros Empleado y Servidor', () => {
    const person = {
      id: 'e1',
      bautizosAttendanceType: BAUTIZOS_ATTENDANCE.empleado,
      isServer: 'Si',
    };
    expect(participantMatchesBautizosAttendanceFilter(person, BAUTIZOS_ATTENDANCE.empleado)).toBe(true);
    expect(participantMatchesBautizosAttendanceFilter(person, BAUTIZOS_ATTENDANCE.servidor)).toBe(true);
    expect(resolveBautizosAttendanceFilterIdsForRow(person).sort()).toEqual(
      [BAUTIZOS_ATTENDANCE.empleado, BAUTIZOS_ATTENDANCE.servidor].sort()
    );
  });

  it('empleado sin rol servidor solo aparece en filtro Empleado', () => {
    const person = {
      id: 'e2',
      bautizosAttendanceType: BAUTIZOS_ATTENDANCE.empleado,
      isServer: 'No',
    };
    expect(participantMatchesBautizosAttendanceFilter(person, BAUTIZOS_ATTENDANCE.empleado)).toBe(true);
    expect(participantMatchesBautizosAttendanceFilter(person, BAUTIZOS_ATTENDANCE.servidor)).toBe(false);
  });

  it('bautizado + participa como servidor aparece en ambos filtros', () => {
    const person = {
      id: 'b1',
      bautizosAttendanceType: BAUTIZOS_ATTENDANCE.bautizado,
      isServer: 'Si',
    };
    expect(participantMatchesBautizosAttendanceFilter(person, BAUTIZOS_ATTENDANCE.bautizado)).toBe(true);
    expect(participantMatchesBautizosAttendanceFilter(person, BAUTIZOS_ATTENDANCE.servidor)).toBe(true);
  });

  it('conteos por filtro no duplican filas: total único es 1 aunque coincida en varios tipos', () => {
    const rows = [
      {
        id: 'e1',
        bautizosAttendanceType: BAUTIZOS_ATTENDANCE.empleado,
        isServer: 'Si',
      },
    ];
    expect(countRowsMatchingBautizosAttendanceFilter(rows, BAUTIZOS_ATTENDANCE.empleado)).toBe(1);
    expect(countRowsMatchingBautizosAttendanceFilter(rows, BAUTIZOS_ATTENDANCE.servidor)).toBe(1);
    expect(rows.length).toBe(1);
  });
});
