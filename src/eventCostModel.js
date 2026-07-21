/**
 * Rubros dinámicos, ponderaciones por tipo de asistencia y cobro sugerido.
 */
import {
  ATTENDANCE_ROLE_KEYS,
  COVERAGE_ROLE_KEYS,
  attendanceRolesFromLegacyPerson,
  hasCoverageRole,
  listActiveRoleKeys,
  normalizeAttendanceRoles,
} from './attendanceRoles.js';

export const DEFAULT_ATTENDANCE_WEIGHTS = Object.fromEntries(
  ATTENDANCE_ROLE_KEYS.map((k) => [k, COVERAGE_ROLE_KEYS.includes(k) ? 0 : 1])
);

export function blankCostRubro(partial = {}) {
  return {
    id: String(partial.id || `rubro_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`),
    label: String(partial.label || 'Concepto').trim() || 'Concepto',
    amount: Math.max(0, Number(partial.amount) || 0),
    enabled: partial.enabled !== false,
  };
}

export function normalizeCostRubros(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw.map((r) => blankCostRubro(r)).filter((r) => r.label);
}

export function normalizeAttendanceWeights(raw) {
  const out = { ...DEFAULT_ATTENDANCE_WEIGHTS };
  if (raw && typeof raw === 'object') {
    for (const k of ATTENDANCE_ROLE_KEYS) {
      if (raw[k] != null && Number.isFinite(Number(raw[k]))) {
        out[k] = Math.max(0, Number(raw[k]));
      }
    }
  }
  return out;
}

export function sumEnabledRubros(rubros) {
  return normalizeCostRubros(rubros)
    .filter((r) => r.enabled)
    .reduce((acc, r) => acc + r.amount, 0);
}

/**
 * Peso efectivo: máximo entre roles activos (prioridad de tarifa).
 * Cobertura → 0.
 */
export function effectiveAttendanceWeight(rolesLike, weightsLike) {
  const roles = normalizeAttendanceRoles(rolesLike);
  if (hasCoverageRole(roles)) return 0;
  const weights = normalizeAttendanceWeights(weightsLike);
  const active = listActiveRoleKeys(roles);
  if (active.length === 0) return 1;
  return Math.max(...active.map((k) => weights[k] ?? 1), 0);
}

/**
 * Cobro sugerido = suma rubros × peso efectivo.
 */
export function computeSuggestedRegistrationCost(eventDoc, personLike) {
  const roles = attendanceRolesFromLegacyPerson(personLike);
  if (hasCoverageRole(roles)) return 0;
  const rubros = eventDoc?.costRubros;
  const base = sumEnabledRubros(rubros);
  // Si no hay rubros, usar cost/price legacy del evento si existe
  const legacyCost = Number(eventDoc?.cost ?? eventDoc?.price ?? eventDoc?.registrationCost ?? 0) || 0;
  const amount = base > 0 ? base : legacyCost;
  const weight = effectiveAttendanceWeight(roles, eventDoc?.attendanceWeights);
  return Math.round(amount * weight * 100) / 100;
}

/**
 * Costo efectivo del registro: override manual si está definido, si no el sugerido.
 */
export function resolveRegistrationCost(eventDoc, personLike) {
  const override = personLike?.costOverride;
  if (override != null && override !== '' && Number.isFinite(Number(override))) {
    return Math.max(0, Number(override));
  }
  if (personLike?.manualCost != null && personLike.manualCost !== '' && Number.isFinite(Number(personLike.manualCost))) {
    return Math.max(0, Number(personLike.manualCost));
  }
  return computeSuggestedRegistrationCost(eventDoc, personLike);
}

export function defaultCostRubrosForPreset(eventType) {
  if (eventType === 'Bautizo') {
    return [blankCostRubro({ id: 'rubro_inscripcion', label: 'Inscripción', amount: 0 })];
  }
  if (eventType === 'General') {
    return [blankCostRubro({ id: 'rubro_inscripcion', label: 'Inscripción', amount: 0 })];
  }
  return [
    blankCostRubro({ id: 'rubro_campamento', label: 'Campamento', amount: 0 }),
  ];
}

export function buildNewEventCostFields(eventType) {
  return {
    costRubros: defaultCostRubrosForPreset(eventType),
    attendanceWeights: { ...DEFAULT_ATTENDANCE_WEIGHTS },
  };
}
