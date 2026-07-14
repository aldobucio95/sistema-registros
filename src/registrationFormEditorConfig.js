/**
 * Campos del formulario «Nuevo registro» que los administradores pueden ocultar a usuarios con rol Editor.
 * SuperUsuario y Administrador siempre ven el formulario completo.
 */
import { ATTENDANCE_SPECIAL, isSiValue, normalizeAttendanceSpecial } from './publicRegistrationLogic.js';
import { BLOOD_TYPE_UNSPECIFIED } from './registrationFormShared.js';

const SI = 'Si';

const T = {
  campa: 'Campa',
  general: 'General',
};

export const EDITOR_REGISTRATION_FIELD_GROUP_ORDER = [
  'general',
  'salud',
  'asistencia',
  'viaje',
  'pago',
  'extra',
];

export const EDITOR_REGISTRATION_FIELD_GROUP_LABELS = {
  general: 'Datos generales',
  salud: 'Salud',
  asistencia: 'Asistencia (campa)',
  viaje: 'Viaje y transporte',
  pago: 'Pagos',
  extra: 'Extras',
};

/**
 * Metadatos para UI (modal de configuración).
 * `eventTypes`: si existe, el campo solo aplica a esos tipos de evento (el modal del Editor solo los muestra cuando corresponde).
 */
export const EDITOR_REGISTRATION_FIELD_META = [
  { key: 'profileImportSearch', label: 'Buscar perfiles · todos los eventos', group: 'general', eventTypes: [T.campa, T.general] },
  { key: 'alias', label: 'Alias', group: 'general', eventTypes: [T.campa, T.general] },
  { key: 'bloodType', label: 'Tipo de sangre', group: 'salud', eventTypes: [T.campa] },
  { key: 'canSwim', label: '¿Sabe nadar?', group: 'salud', eventTypes: [T.campa] },
  { key: 'allergies', label: 'Alergias', group: 'salud', eventTypes: [T.campa] },
  { key: 'diseases', label: 'Enfermedades', group: 'salud', eventTypes: [T.campa] },
  { key: 'disability', label: 'Discapacidades', group: 'salud', eventTypes: [T.campa] },
  { key: 'scholarship', label: 'Beca (solicitud)', group: 'asistencia', eventTypes: [T.campa] },
  { key: 'serverRole', label: 'Servidor (sí/no; en Campa: Teens / Jóvenes / Ambos)', group: 'asistencia', eventTypes: [T.campa] },
  { key: 'serverProfileExtra', label: 'Datos extra de servidor (pareja, hijos, áreas…)', group: 'asistencia', eventTypes: [T.campa] },
  { key: 'willBeBaptized', label: 'Bautizo en el evento', group: 'asistencia', eventTypes: [T.campa] },
  { key: 'campAssignment', label: 'Asignación campista (Teens / Jóvenes)', group: 'asistencia', eventTypes: [T.campa] },
  { key: 'attendanceSpecial', label: 'Asistencia empleado / cortesía / pastor', group: 'asistencia', eventTypes: [T.campa, T.general] },
  { key: 'pastorAttendance', label: 'Tipo de asistencia: Pastor (Campa / General)', group: 'asistencia', eventTypes: [T.campa, T.general] },
  { key: 'travelFrom', label: 'Sale de / origen', group: 'viaje', eventTypes: [T.campa, T.general] },
  { key: 'travelTo', label: 'Regresa a / destino', group: 'viaje', eventTypes: [T.campa, T.general] },
  { key: 'transportExtras', label: 'Llega/regresa en carro y tipo', group: 'viaje', eventTypes: [T.campa, T.general] },
  { key: 'discountCampaign', label: 'Campaña de descuento', group: 'pago', eventTypes: [T.campa, T.general] },
  { key: 'customFields', label: 'Campos extra del evento (tipo General)', group: 'extra', eventTypes: [T.general] },
];

export function getEditorRegistrationFieldMetaForEventType(eventType) {
  const t = String(eventType || '').trim();
  if (!t) return EDITOR_REGISTRATION_FIELD_META;
  return EDITOR_REGISTRATION_FIELD_META.filter((m) => {
    if (!m.eventTypes || !m.eventTypes.length) return true;
    return m.eventTypes.includes(t);
  });
}

export function getEditorRegistrationFieldGroupOrderForEventType(eventType) {
  const used = new Set(getEditorRegistrationFieldMetaForEventType(eventType).map((m) => m.group));
  return EDITOR_REGISTRATION_FIELD_GROUP_ORDER.filter((g) => used.has(g));
}

export const defaultEditorRegistrationFieldVisibility = () =>
  Object.fromEntries(EDITOR_REGISTRATION_FIELD_META.map(({ key }) => [key, true]));

export function mergeEditorRegistrationFieldVisibility(raw) {
  return { ...defaultEditorRegistrationFieldVisibility(), ...(raw && typeof raw === 'object' ? raw : {}) };
}

/** Administradores y SuperUsuario siempre; Editores según permiso del tipo de evento. */
export function canShowPastorAttendance({ role, visibility, hasAdminRights = false, eventType = '' }) {
  if (hasAdminRights) return true;
  const r = String(role || '').trim();
  if (r === 'SuperUsuario' || r === 'Administrador') return true;
  if (r !== 'Editor') return false;
  const vis = mergeEditorRegistrationFieldVisibility(visibility);
  void eventType;
  return vis.pastorAttendance !== false;
}

/** @deprecated Usar canShowPastorAttendance */
export function canShowBautizosPastorAttendance(opts) {
  return canShowPastorAttendance(opts);
}

/**
 * Valores iniciales de transporte al crear o limpiar un registro según tipo de evento.
 * Campa / General: por defecto transporte del evento (no «llega en carro»).
 */
export function getDefaultTransportFieldsForEventType(eventType) {
  void eventType;
  return {
    llegaEnCarro: false,
    regresaEnCarro: false,
    transportType: 'Camión',
  };
}

/**
 * Aplica valores neutros para campos ocultos al Editor antes de validar o guardar.
 * `loc` es la sede actual del registro (para viaje por defecto).
 */
export function applyEditorRegistrationDefaults(entry, visibility, eventType, loc = '') {
  const vis = mergeEditorRegistrationFieldVisibility(visibility);
  const out = { ...entry };
  const isCampa = eventType === 'Campa';

  if (!vis.bloodType) out.bloodType = BLOOD_TYPE_UNSPECIFIED;
  if (!vis.canSwim) out.canSwim = 'No';
  if (!vis.allergies) {
    out.hasAllergy = 'No';
    out.allergyCategory = '';
    out.allergyDetails = '';
  }
  if (!vis.diseases) {
    out.hasDisease = 'No';
    out.diseaseDetails = '';
    out.diseaseMedication = '';
  }
  if (!vis.disability) {
    out.hasDisability = 'No';
    out.disabilityDetails = '';
  }
  if (!vis.scholarship) {
    out.isScholarship = 'No';
    out.scholarshipType = 'total';
    out.scholarshipPartialAmount = '';
  }
  if (!vis.serverRole) {
    out.isServer = 'No';
    out.serverAssignment = '';
    out.baptismSegment = '';
    out.ambosServeInSegment = '';
  }
  if (!vis.serverProfileExtra) {
    out.isMarried = 'No';
    out.spouseName = '';
    out.goesWithChildren = 'No';
    out.childrenCount = '';
    out.servedOtherCampa = 'No';
    out.servedAreas = '';
    out.preferredServeArea = '';
    out.servesInCongress = 'No';
    out.congressServeArea = '';
  }
  if (isCampa && !vis.willBeBaptized) {
    out.willBeBaptized = 'No';
    out.baptismSegment = '';
  }
  if (isCampa && !vis.campAssignment) out.campAssignment = '';
  if (!vis.attendanceSpecial) out.attendanceSpecialType = ATTENDANCE_SPECIAL.ninguno;
  if (!vis.pastorAttendance && normalizeAttendanceSpecial(out) === ATTENDANCE_SPECIAL.pastor) {
    out.attendanceSpecialType = ATTENDANCE_SPECIAL.ninguno;
  }
  if (!vis.travelFrom) out.travelFrom = loc || out.travelFrom || '';
  if (!vis.travelTo) out.travelTo = loc || out.travelTo || '';
  if (!vis.transportExtras) {
    out.regresaEnCarro = false;
    out.transportType = 'Camión';
    out.llegaEnCarro = false;
  }
  if (!vis.discountCampaign) out.selectedDiscountCampaignId = '';
  if (!vis.customFields) out.customData = {};
  if (!vis.alias) out.alias = '';

  return out;
}

export { isSiValue, SI };
