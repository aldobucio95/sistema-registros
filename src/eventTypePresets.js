/**
 * Presets de tipo de evento y configuración de asistencias habilitadas.
 */
import {
  ATTENDANCE_ROLE_KEYS,
  ATTENDANCE_ROLE_MENU_ORDER,
  blankAttendanceRoles,
} from './attendanceRoles.js';

export const EVENT_TYPE_PRESETS = ['Campa', 'General', 'Bautizo'];

const ALL_OFF = () => Object.fromEntries(ATTENDANCE_ROLE_KEYS.map((k) => [k, false]));

/** Defaults por preset: enabledAttendanceTypes como mapa role→bool + base. */
export const EVENT_TYPE_PRESET_CONFIG = {
  Campa: {
    baseAttendanceType: 'campero',
    enabledAttendanceTypes: {
      ...ALL_OFF(),
      campero: true,
      servidor: true,
      empleado: true,
      becado: true,
      cortesia: true,
      pastor: true,
      bautizado: false,
      asistente: false,
    },
    responsivaEnabled: true,
    publicRegistrationEnabled: true,
    transportEnabled: true,
  },
  General: {
    baseAttendanceType: 'campero',
    enabledAttendanceTypes: {
      ...ALL_OFF(),
      campero: true,
      empleado: true,
      cortesia: true,
      pastor: true,
      asistente: true,
      servidor: false,
      becado: false,
      bautizado: false,
    },
    responsivaEnabled: false,
    publicRegistrationEnabled: true,
    transportEnabled: true,
  },
  Bautizo: {
    baseAttendanceType: 'bautizado',
    enabledAttendanceTypes: {
      ...ALL_OFF(),
      bautizado: true,
      asistente: true,
      servidor: true,
      empleado: true,
      cortesia: true,
      pastor: true,
      campero: false,
      becado: false,
    },
    responsivaEnabled: false,
    publicRegistrationEnabled: true,
    transportEnabled: true,
  },
};

export function normalizeEventType(raw) {
  const t = String(raw || '').trim();
  if (EVENT_TYPE_PRESETS.includes(t)) return t;
  if (t === 'Bautizos') return 'Bautizo';
  return 'Campa';
}

export function getPresetConfig(eventType) {
  const t = normalizeEventType(eventType);
  return EVENT_TYPE_PRESET_CONFIG[t] || EVENT_TYPE_PRESET_CONFIG.Campa;
}

export function normalizeEnabledAttendanceTypes(raw, eventType) {
  const preset = getPresetConfig(eventType).enabledAttendanceTypes;
  const out = { ...preset };
  if (raw && typeof raw === 'object') {
    for (const k of ATTENDANCE_ROLE_KEYS) {
      if (typeof raw[k] === 'boolean') out[k] = raw[k];
    }
  }
  return out;
}

/**
 * Resuelve config efectiva del evento (preset + overrides en el doc).
 */
export function resolveEventAttendanceConfig(eventDoc) {
  const eventType = normalizeEventType(eventDoc?.eventType);
  const preset = getPresetConfig(eventType);
  const enabledAttendanceTypes = normalizeEnabledAttendanceTypes(
    eventDoc?.enabledAttendanceTypes,
    eventType
  );
  const baseAttendanceType =
    ATTENDANCE_ROLE_KEYS.includes(eventDoc?.baseAttendanceType)
      ? eventDoc.baseAttendanceType
      : preset.baseAttendanceType;

  return {
    eventType,
    baseAttendanceType,
    enabledAttendanceTypes,
    enabledRoleKeys: ATTENDANCE_ROLE_MENU_ORDER.filter((k) => enabledAttendanceTypes[k]),
    responsivaEnabled:
      eventDoc?.responsivaEnabled === false ? false : (eventDoc?.responsivaEnabled ?? preset.responsivaEnabled),
    publicRegistrationEnabled:
      eventDoc?.publicRegistrationEnabled === false
        ? false
        : (eventDoc?.publicRegistrationEnabled ?? preset.publicRegistrationEnabled),
    transportEnabled:
      eventDoc?.transportEnabled === false ? false : (eventDoc?.transportEnabled ?? preset.transportEnabled),
  };
}

export function isAttendanceTypeEnabled(eventDoc, roleKey) {
  const cfg = resolveEventAttendanceConfig(eventDoc);
  return cfg.enabledAttendanceTypes[roleKey] === true;
}

export function defaultRolesForNewRegistration(eventDoc) {
  const cfg = resolveEventAttendanceConfig(eventDoc);
  const roles = blankAttendanceRoles();
  const base = cfg.baseAttendanceType;
  if (cfg.enabledAttendanceTypes[base]) {
    roles[base] = true;
  } else {
    const first = cfg.enabledRoleKeys[0];
    if (first) roles[first] = true;
  }
  return roles;
}

/**
 * Campos al crear un evento nuevo desde el hub.
 */
export function buildNewEventAttendanceFields(eventType) {
  const preset = getPresetConfig(eventType);
  return {
    eventType: normalizeEventType(eventType),
    baseAttendanceType: preset.baseAttendanceType,
    enabledAttendanceTypes: { ...preset.enabledAttendanceTypes },
    responsivaEnabled: preset.responsivaEnabled,
    publicRegistrationEnabled: preset.publicRegistrationEnabled,
    transportEnabled: preset.transportEnabled,
  };
}

export function isCampaEventType(eventTypeOrDoc) {
  const t =
    typeof eventTypeOrDoc === 'object'
      ? normalizeEventType(eventTypeOrDoc?.eventType)
      : normalizeEventType(eventTypeOrDoc);
  return t === 'Campa';
}

export function isBautizoEventType(eventTypeOrDoc) {
  const t =
    typeof eventTypeOrDoc === 'object'
      ? normalizeEventType(eventTypeOrDoc?.eventType)
      : normalizeEventType(eventTypeOrDoc);
  return t === 'Bautizo';
}

export function isGeneralEventType(eventTypeOrDoc) {
  const t =
    typeof eventTypeOrDoc === 'object'
      ? normalizeEventType(eventTypeOrDoc?.eventType)
      : normalizeEventType(eventTypeOrDoc);
  return t === 'General';
}
