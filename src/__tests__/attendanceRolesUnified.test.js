import { describe, expect, it } from 'vitest';
import {
  blankAttendanceRoles,
  toggleAttendanceRole,
  validateAttendanceRoles,
  legacyFieldsFromAttendanceRoles,
  attendanceRolesFromLegacyPerson,
  hasCoverageRole,
  formatAttendanceRolesExcelLabel,
} from '../attendanceRoles.js';
import { buildNewEventAttendanceFields, normalizeEventType } from '../eventTypePresets.js';
import {
  computeSuggestedRegistrationCost,
  effectiveAttendanceWeight,
  resolveRegistrationCost,
} from '../eventCostModel.js';
import {
  buildEditEventModalState,
  buildEditEventFirestorePayload,
} from '../editEventModalState.js';

describe('attendanceRoles', () => {
  it('bloquea becado + empleado', () => {
    let roles = blankAttendanceRoles();
    roles = toggleAttendanceRole(roles, 'campero', true).roles;
    roles = toggleAttendanceRole(roles, 'becado', true).roles;
    const next = toggleAttendanceRole(roles, 'empleado', true);
    expect(next.roles.empleado).toBe(true);
    expect(next.roles.becado).toBe(false);
  });

  it('asistente limpia otros roles', () => {
    let roles = blankAttendanceRoles();
    roles = toggleAttendanceRole(roles, 'servidor', true).roles;
    roles = toggleAttendanceRole(roles, 'campero', true).roles;
    const next = toggleAttendanceRole(roles, 'asistente', true);
    expect(next.roles.asistente).toBe(true);
    expect(next.roles.servidor).toBe(false);
    expect(next.roles.campero).toBe(false);
  });

  it('permite servidor + campero', () => {
    let roles = blankAttendanceRoles();
    roles = toggleAttendanceRole(roles, 'campero', true).roles;
    const next = toggleAttendanceRole(roles, 'servidor', true);
    expect(validateAttendanceRoles(next.roles).ok).toBe(true);
    expect(next.roles.servidor && next.roles.campero).toBe(true);
  });

  it('sincroniza legacy fields', () => {
    const legacy = legacyFieldsFromAttendanceRoles({
      ...blankAttendanceRoles(),
      servidor: true,
      empleado: true,
    });
    expect(legacy.isServer).toBe('Si');
    expect(legacy.attendanceSpecialType).toBe('empleado');
  });

  it('deriva roles desde legacy', () => {
    const roles = attendanceRolesFromLegacyPerson({
      isServer: 'Si',
      attendanceSpecialType: 'cortesia',
    });
    expect(roles.servidor).toBe(true);
    expect(roles.cortesia).toBe(true);
    expect(hasCoverageRole(roles)).toBe(true);
  });
});

describe('eventTypePresets', () => {
  it('incluye Bautizo', () => {
    expect(normalizeEventType('Bautizo')).toBe('Bautizo');
    const fields = buildNewEventAttendanceFields('Bautizo');
    expect(fields.baseAttendanceType).toBe('bautizado');
    expect(fields.enabledAttendanceTypes.bautizado).toBe(true);
    expect(fields.enabledAttendanceTypes.campero).toBe(false);
  });
});

describe('eventCostModel', () => {
  it('cobertura → costo sugerido 0', () => {
    const eventDoc = {
      costRubros: [{ id: 'a', label: 'Inscripción', amount: 500, enabled: true }],
      attendanceWeights: { campero: 1, empleado: 0 },
    };
    const cost = computeSuggestedRegistrationCost(eventDoc, {
      attendanceRoles: { ...blankAttendanceRoles(), empleado: true },
    });
    expect(cost).toBe(0);
  });

  it('usa override manual', () => {
    const eventDoc = {
      costRubros: [{ id: 'a', label: 'Inscripción', amount: 500, enabled: true }],
    };
    const cost = resolveRegistrationCost(eventDoc, {
      attendanceRoles: { ...blankAttendanceRoles(), campero: true },
      costOverride: 120,
    });
    expect(cost).toBe(120);
  });

  it('ponderación máxima con multi-rol', () => {
    const w = effectiveAttendanceWeight(
      { ...blankAttendanceRoles(), servidor: true, campero: true },
      { servidor: 0.5, campero: 1 }
    );
    expect(w).toBe(1);
  });

  it('etiqueta Excel une roles activos', () => {
    const label = formatAttendanceRolesExcelLabel({
      attendanceRoles: { ...blankAttendanceRoles(), servidor: true, campero: true },
      serverAssignment: 'Teens',
    });
    expect(label).toContain('Servidor (Teens)');
    expect(label).toContain('Campero');
  });

  it('modal de edición arma payload de attendance config', () => {
    const state = buildEditEventModalState({
      id: 'evt1',
      name: 'Campa 2027',
      eventType: 'Campa',
      enabledAttendanceTypes: {
        campero: true,
        servidor: true,
        empleado: false,
        becado: true,
        cortesia: false,
        pastor: false,
        bautizado: false,
        asistente: false,
      },
      baseAttendanceType: 'campero',
      responsivaEnabled: true,
      publicRegistrationEnabled: true,
      transportEnabled: false,
      costRubros: [{ id: 'r1', label: 'Inscripción', amount: 200, enabled: true }],
    });
    expect(state.isOpen).toBe(true);
    expect(state.transportEnabled).toBe(false);
    const built = buildEditEventFirestorePayload({ ...state, name: 'Campa 2027 Renombrada' });
    expect(built.ok).toBe(true);
    expect(built.payload.name).toBe('Campa 2027 Renombrada');
    expect(built.payload.enabledAttendanceTypes.servidor).toBe(true);
    expect(built.payload.transportEnabled).toBe(false);
    expect(built.payload.costRubros[0].amount).toBe(200);
  });
});
