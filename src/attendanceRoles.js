/**
 * Modelo unificado de tipos de asistencia (multi-flag).
 * Greenfield: sin dependencia del enum excluyente attendanceSpecialType.
 */

export const ATTENDANCE_ROLE_KEYS = [
  'servidor',
  'empleado',
  'bautizado',
  'becado',
  'campero',
  'cortesia',
  'pastor',
  'asistente',
];

/** Orden de menú / columnas dashboard (plan). */
export const ATTENDANCE_ROLE_MENU_ORDER = [
  'servidor',
  'empleado',
  'bautizado',
  'becado',
  'campero',
  'cortesia',
  'pastor',
  'asistente',
];

export const ATTENDANCE_ROLE_LABELS = {
  servidor: 'Servidor',
  empleado: 'Empleado',
  bautizado: 'Bautizado',
  becado: 'Becado',
  campero: 'Campero',
  cortesia: 'Cortesía',
  pastor: 'Pastor',
  asistente: 'Asistente',
};

/** Clave de panelNav / ruta por rol. */
export const ATTENDANCE_ROLE_PANEL_KEY = {
  servidor: 'roleServidor',
  empleado: 'roleEmpleado',
  bautizado: 'roleBautizado',
  becado: 'roleBecado',
  campero: 'roleCampero',
  cortesia: 'roleCortesia',
  pastor: 'rolePastor',
  asistente: 'roleAsistente',
};

export const ATTENDANCE_ROLE_TAB = {
  servidor: 'RoleServidor',
  empleado: 'RoleEmpleado',
  bautizado: 'RoleBautizado',
  becado: 'RoleBecado',
  campero: 'RoleCampero',
  cortesia: 'RoleCortesia',
  pastor: 'RolePastor',
  asistente: 'RoleAsistente',
};

export const ATTENDANCE_ROLE_ROUTE_SEGMENT = {
  servidor: 'servidor',
  empleado: 'empleado',
  bautizado: 'bautizado',
  becado: 'becado',
  campero: 'campero',
  cortesia: 'cortesia',
  pastor: 'pastor',
  asistente: 'asistente',
};

/** Tipos que el evento cubre (costo 0 para la persona). */
export const COVERAGE_ROLE_KEYS = ['empleado', 'cortesia', 'pastor'];

export function blankAttendanceRoles() {
  return Object.fromEntries(ATTENDANCE_ROLE_KEYS.map((k) => [k, false]));
}

export function normalizeAttendanceRoles(raw) {
  const out = blankAttendanceRoles();
  if (!raw || typeof raw !== 'object') return out;
  for (const k of ATTENDANCE_ROLE_KEYS) {
    out[k] = raw[k] === true;
  }
  return out;
}

/**
 * Deriva attendanceRoles desde campos legacy del participante
 * (isServer, isScholarship, attendanceSpecialType, willBeBaptized).
 */
export function attendanceRolesFromLegacyPerson(personLike) {
  const roles = blankAttendanceRoles();
  if (!personLike || typeof personLike !== 'object') return roles;

  if (personLike.attendanceRoles && typeof personLike.attendanceRoles === 'object') {
    return normalizeAttendanceRoles(personLike.attendanceRoles);
  }

  const isSi = (v) => {
    const s = String(v ?? '').trim();
    return s === 'Si' || s === 'Sí' || s.toLowerCase() === 'sí';
  };

  if (isSi(personLike.isServer)) roles.servidor = true;
  if (isSi(personLike.isScholarship)) roles.becado = true;
  if (isSi(personLike.willBeBaptized)) roles.bautizado = true;

  const special = String(personLike.attendanceSpecialType || '').trim();
  if (special === 'empleado') roles.empleado = true;
  else if (special === 'cortesia') roles.cortesia = true;
  else if (special === 'pastor') roles.pastor = true;

  const hasAny =
    roles.servidor ||
    roles.empleado ||
    roles.bautizado ||
    roles.becado ||
    roles.cortesia ||
    roles.pastor ||
    roles.asistente;

  if (!hasAny) {
    roles.campero = true;
  } else if (!roles.servidor && !roles.empleado && !roles.bautizado && !roles.becado && !roles.cortesia && !roles.pastor && !roles.asistente) {
    roles.campero = true;
  }

  return roles;
}

export function personHasAttendanceRole(personLike, roleKey) {
  const roles = attendanceRolesFromLegacyPerson(personLike);
  return roles[roleKey] === true;
}

export function countActiveAttendanceRoles(rolesLike) {
  const roles = normalizeAttendanceRoles(rolesLike);
  return ATTENDANCE_ROLE_KEYS.filter((k) => roles[k]).length;
}

export function isMultiRolePerson(personLike) {
  return countActiveAttendanceRoles(attendanceRolesFromLegacyPerson(personLike)) >= 2;
}

export function hasCoverageRole(rolesLike) {
  const roles = normalizeAttendanceRoles(rolesLike);
  return COVERAGE_ROLE_KEYS.some((k) => roles[k]);
}

export function listActiveRoleKeys(rolesLike) {
  const roles = normalizeAttendanceRoles(rolesLike);
  return ATTENDANCE_ROLE_MENU_ORDER.filter((k) => roles[k]);
}

/**
 * Etiqueta para Excel / reportes: roles activos unidos por coma
 * (con detalle de beca parcial o asignación de servidor cuando aplica).
 */
export function formatAttendanceRolesExcelLabel(personLike) {
  const roles = attendanceRolesFromLegacyPerson(personLike);
  const parts = [];
  for (const key of ATTENDANCE_ROLE_MENU_ORDER) {
    if (!roles[key]) continue;
    if (key === 'becado') {
      parts.push(personLike?.scholarshipType === 'partial' ? 'Becado (parcial)' : 'Becado');
      continue;
    }
    if (key === 'servidor') {
      const sa = String(personLike?.serverAssignment || '').trim();
      parts.push(sa ? `Servidor (${sa})` : 'Servidor');
      continue;
    }
    if (key === 'campero') {
      const ca = String(personLike?.campAssignment || '').trim();
      parts.push(ca && !roles.servidor ? `Campero (${ca})` : 'Campero');
      continue;
    }
    parts.push(ATTENDANCE_ROLE_LABELS[key] || key);
  }
  return parts.join(', ');
}

/**
 * Aplica un toggle de rol respetando restricciones del plan.
 * @returns {{ roles: object, error?: string }}
 */
export function toggleAttendanceRole(currentRoles, roleKey, enabled) {
  if (!ATTENDANCE_ROLE_KEYS.includes(roleKey)) {
    return { roles: normalizeAttendanceRoles(currentRoles), error: 'Tipo de asistencia desconocido.' };
  }
  let roles = normalizeAttendanceRoles(currentRoles);
  roles = { ...roles, [roleKey]: !!enabled };

  if (enabled) {
    if (roleKey === 'asistente') {
      roles = blankAttendanceRoles();
      roles.asistente = true;
    } else if (roleKey === 'becado') {
      for (const k of COVERAGE_ROLE_KEYS) roles[k] = false;
      roles.asistente = false;
    } else if (COVERAGE_ROLE_KEYS.includes(roleKey)) {
      roles.becado = false;
      for (const k of COVERAGE_ROLE_KEYS) {
        if (k !== roleKey) roles[k] = false;
      }
      roles.asistente = false;
    } else {
      roles.asistente = false;
    }

    if (roleKey === 'campero') {
      roles.asistente = false;
    }
    if (roleKey === 'bautizado') {
      roles.asistente = false;
    }
  }

  const validation = validateAttendanceRoles(roles);
  if (validation.error) {
    return { roles: normalizeAttendanceRoles(currentRoles), error: validation.error };
  }
  return { roles };
}

/**
 * Valida el conjunto de roles (tras toggle o al guardar).
 */
export function validateAttendanceRoles(rolesLike, { requireAtLeastOne = true } = {}) {
  const roles = normalizeAttendanceRoles(rolesLike);
  const active = listActiveRoleKeys(roles);

  if (requireAtLeastOne && active.length === 0) {
    return { ok: false, error: 'Selecciona al menos un tipo de asistencia.' };
  }

  if (roles.asistente && active.length > 1) {
    return { ok: false, error: 'Asistente no puede combinarse con otros tipos.' };
  }

  if (roles.campero && roles.asistente) {
    return { ok: false, error: 'Campero y Asistente no pueden ir juntos.' };
  }

  if (roles.bautizado && roles.asistente) {
    return { ok: false, error: 'Bautizado y Asistente no pueden ir juntos.' };
  }

  if (roles.becado && COVERAGE_ROLE_KEYS.some((k) => roles[k])) {
    return { ok: false, error: 'Becado no puede combinarse con Empleado, Cortesía o Pastor.' };
  }

  const coverageCount = COVERAGE_ROLE_KEYS.filter((k) => roles[k]).length;
  if (coverageCount > 1) {
    return { ok: false, error: 'Solo puede haber un tipo de cobertura (Empleado, Cortesía o Pastor).' };
  }

  return { ok: true, roles };
}

/**
 * Sincroniza campos legacy a partir de attendanceRoles (para código que aún lee isServer, etc.).
 */
export function legacyFieldsFromAttendanceRoles(rolesLike) {
  const roles = normalizeAttendanceRoles(rolesLike);
  let attendanceSpecialType = 'ninguno';
  if (roles.empleado) attendanceSpecialType = 'empleado';
  else if (roles.cortesia) attendanceSpecialType = 'cortesia';
  else if (roles.pastor) attendanceSpecialType = 'pastor';

  return {
    attendanceRoles: roles,
    isServer: roles.servidor ? 'Si' : 'No',
    isScholarship: roles.becado ? 'Si' : 'No',
    willBeBaptized: roles.bautizado ? 'Si' : 'No',
    attendanceSpecialType,
  };
}

export function filterParticipantsByAttendanceRole(participants, roleKey) {
  if (!roleKey || roleKey === 'all') return participants || [];
  return (participants || []).filter((p) => personHasAttendanceRole(p, roleKey));
}

/** Panel keys de roles en orden de menú. */
export function attendanceRolePanelKeysInOrder() {
  return ATTENDANCE_ROLE_MENU_ORDER.map((k) => ATTENDANCE_ROLE_PANEL_KEY[k]);
}
