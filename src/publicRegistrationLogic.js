import { setDoc, getDoc, getDocs, query, where, limit, updateDoc } from 'firebase/firestore';
import { getDocRef, getColRef } from './firebaseRefs.js';
import { buildLogId, writeSnapshotDoc } from './activityLogCore.js';
import { withLogVisibleInPanel, buildLogEntityFields } from './activityLogsMeta.js';
import { buildFinanceWhatsAppMessage, buildScholarshipPendingWhatsAppMessage } from './whatsappFinanceMessages.js';
import {
  registrationRequiresResponsivaStatus,
  responsivaStatusValidationLabel,
  createResponsivaSignTokenDoc,
  isResponsivaDigitalActiveForParticipant,
  participantAgeBracketForResponsiva,
} from './responsivaSignLogic.js';
import { BLOOD_TYPE_UNSPECIFIED } from './registrationFormShared.js';
import {
  appendBautizosCompanionsValidationIssues,
  appendBautizosTransportChoiceIssues,
  BAUTIZOS_ATTENDANCE,
  bautizosAttendancePaysEventListPrice,
  bautizosWillBeBaptizedFromAttendance,
  getBautizosCompanionsArray,
  getBautizosLineListPrice,
  isBautizosUnder3YearsAtEvent,
  isFreeBautizosAttendance,
  normalizeBautizosAttendanceType,
  syncBautizosAttendanceServerFields,
  normalizeArrivalCarCount,
  normalizeBautizosCompanionsForPersist,
  getBautizosBaptizedCompanionSubmitBlockingError,
  hasBautizosBaptizedCompanionInParty,
  getBautizosSplitPartySlotDescriptors,
  buildParticipantLikeForBautizosSplitSlot,
  buildSplitPartyCompanionsForSlot,
  getBautizosSplitPartySubmitBlockingError,
  buildBautizosSplitPartyVirtualEntry,
  getBautizosSplitPartyDerivedMembers,
  normalizeBaptismShirtSize,
  participantHasBaptismChip,
  isBautizosCompanionBaptized,
  bautizosCompanionIsAlsoBautizadoRegistrant,
  bautizosDashboardTitularCountsForScope,
  bautizosDashboardCompanionCountsForScope,
  normalizeBautizosDashboardScope,
} from './bautizosParty.js';
import {
  buildCarMetaPatchesAfterSave,
  buildMergedFamilyCarInventory,
  familyHasAnyCarTransport,
  getFamilyCarInventoryValidationIssues,
  persistEventCarMetaPatches,
} from './bautizosCarMeta.js';
import { applyParticipantNameFormattingForSave } from './participantNameFormat.js';
import { isCardPaymentAllowedForLocation } from './cardPaymentEligibility.js';
import { appendParticipantActivityEntry } from './participantActivityLog.js';
import { sanitizeFirestoreDocId } from './firestoreDocId.js';
import { assertRegistrationNotPersonOfInterest } from './vnpPersonFlags.js';
import {
  applyRegistrationConsentPolicy,
  mergePrivacyNoticeConfig,
  participantHasSensitiveHealthData,
  shouldBlockSensitiveHealthWithoutConsent,
  buildRegistrationPrivacyActivityMessage,
  sanitizeParticipantConsentForFirestoreWrite,
} from './privacyNotice.js';
import {
  buildCapSimulationRows,
  computeEventCapUsedUnits,
  computeEventCapUsedUnitsBySede,
  computeIncomingRegistrationCapUnits,
} from './eventCapUnits.js';

/** Orden de grupos en el modal QR (admin). */
export const PUBLIC_OPTIONAL_GROUP_ORDER = ['general', 'salud', 'bautizos', 'viaje', 'asistencia', 'pago'];

export const PUBLIC_OPTIONAL_GROUP_LABELS = {
  general: 'Datos generales',
  salud: 'Salud',
  bautizos: 'Bautizos',
  viaje: 'Viaje y transporte',
  asistencia: 'Asistencia (campa)',
  pago: 'Pagos y descuentos',
};

/**
 * Claves opcionales que el administrador puede ocultar en el formulario público.
 * `group` agrupa el modal del QR.
 */
export const PUBLIC_OPTIONAL_KEYS = [
  { key: 'alias', label: 'Alias', group: 'general' },
  { key: 'vnpPersonId', label: 'ID VNPM (si ya tienes uno)', group: 'general' },
  { key: 'customFields', label: 'Campos extra del evento', group: 'general' },
  { key: 'bloodType', label: 'Tipo de sangre', group: 'salud' },
  { key: 'canSwim', label: '¿Sabe nadar?', group: 'salud' },
  { key: 'allergies', label: 'Alergias', group: 'salud' },
  { key: 'diseases', label: 'Enfermedades', group: 'salud' },
  { key: 'disability', label: 'Discapacidades', group: 'salud' },
  { key: 'bautizosCompanions', label: 'Acompañantes / familia', group: 'bautizos' },
  { key: 'bautizosAttendanceType', label: 'Tipo de asistencia (bautizado / asistente / servidor / empleado / cortesía)', group: 'bautizos' },
  { key: 'bautizosFood', label: 'Comida (evento Bautizos)', group: 'bautizos' },
  { key: 'bautizosTransport', label: 'Transporte (evento Bautizos)', group: 'bautizos' },
  { key: 'travelFrom', label: 'Sale de / origen', group: 'viaje' },
  { key: 'travelTo', label: 'Regresa a / destino', group: 'viaje' },
  { key: 'transportExtras', label: 'Llega/regresa en carro y tipo de transporte', group: 'viaje' },
  { key: 'scholarship', label: 'Solicitud de beca', group: 'asistencia' },
  { key: 'serverRole', label: 'Servidor (sí/no y Teens / Jóvenes / Ambos)', group: 'asistencia' },
  {
    key: 'serverProfileExtra',
    label: 'Datos extra de servidor (pareja, hijos, áreas servidas, congresos…)',
    group: 'asistencia',
  },
  { key: 'willBeBaptized', label: 'Bautizo en el evento (campista o servidor Ambos)', group: 'asistencia' },
  { key: 'campAssignment', label: 'Asignación campista (Teens / Jóvenes)', group: 'asistencia' },
  { key: 'attendanceSpecial', label: 'Asistencia empleado / cortesía', group: 'asistencia' },
  {
    key: 'paymentInfo',
    label: 'Información de pago (método, abono, descuentos, referencia de tarjeta…)',
    group: 'pago',
  },
  { key: 'discountCampaign', label: 'Campaña de descuento (si aplica)', group: 'pago' },
  {
    key: 'initialDeposit',
    label: 'Abono inicial (campo de monto; si está desactivado se registra $0)',
    group: 'pago',
  },
];

export const defaultOptionalVisibility = () => ({
  ...Object.fromEntries(PUBLIC_OPTIONAL_KEYS.map(({ key }) => [key, true])),
});

/**
 * Mapea clave `optionalVisibility` del enlace público → clave en `editorRegistrationFields` (panel).
 * `initialDeposit` no tiene equivalente en el editor: solo enlace.
 */
const OPTIONAL_KEY_TO_EDITOR_KEY = {
  vnpPersonId: 'profileImportSearch',
  alias: 'alias',
  customFields: 'customFields',
  bloodType: 'bloodType',
  canSwim: 'canSwim',
  allergies: 'allergies',
  diseases: 'diseases',
  disability: 'disability',
  travelFrom: 'travelFrom',
  travelTo: 'travelTo',
  transportExtras: 'transportExtras',
  scholarship: 'scholarship',
  serverRole: 'serverRole',
  serverProfileExtra: 'serverProfileExtra',
  willBeBaptized: 'willBeBaptized',
  campAssignment: 'campAssignment',
  attendanceSpecial: 'attendanceSpecial',
  discountCampaign: 'discountCampaign',
  bautizosCompanions: 'bautizosCompanions',
  bautizosAttendanceType: 'bautizosAttendanceType',
  bautizosFood: 'bautizosFood',
  bautizosTransport: 'bautizosTransport',
  initialDeposit: null,
  paymentInfo: null,
};

/**
 * Claves opcionales que se pueden ofrecer en el modal del enlace / QR, según tipo (y desayuno).
 * Devuelve entradas de `PUBLIC_OPTIONAL_KEYS` filtradas.
 */
export function publicOptionalKeysForEventType(eventType) {
  const t = String(eventType || 'General');
  const isDesayuno = t.toLowerCase().includes('desayuno');
  return PUBLIC_OPTIONAL_KEYS.filter((row) => {
    const { key, group } = row;
    if (key === 'customFields' && t !== 'General') return false;
    if (['scholarship', 'willBeBaptized', 'campAssignment', 'attendanceSpecial'].includes(key)) {
      if (t !== 'Campa') return false;
    }
    if (['serverRole', 'serverProfileExtra'].includes(key)) {
      if (t !== 'Campa' && t !== 'Bautizos') return false;
    }
    if (group === 'bautizos' || ['bautizosCompanions', 'bautizosAttendanceType', 'bautizosFood', 'bautizosTransport'].includes(key)) {
      if (t !== 'Bautizos') return false;
    }
    if (isDesayuno && (key === 'travelFrom' || key === 'travelTo' || key === 'transportExtras')) {
      return false;
    }
    return true;
  });
}

/**
 * Fusión enlace + editor: el **enlace** decide qué secciones están activas; el **editor** (tipo/evento) limita el máximo
 * (no se puede mostrar en el público lo que el panel deshabilitó).
 * `fromLinkNormalized` = `normalizeOptionalVisibility(linkDoc.optionalVisibility)`.
 */
export function applyEditorVisibilityToPublicOptional(fromLinkNormalized, editorVis) {
  const from = normalizeOptionalVisibility(fromLinkNormalized);
  const e = editorVis && typeof editorVis === 'object' ? editorVis : {};
  const out = { ...from };

  for (const { key } of PUBLIC_OPTIONAL_KEYS) {
    const ed = OPTIONAL_KEY_TO_EDITOR_KEY[key];
    if (key === 'initialDeposit') {
      out.initialDeposit = from.initialDeposit !== false;
      continue;
    }
    if (key === 'paymentInfo') {
      out.paymentInfo = from.paymentInfo !== false;
      continue;
    }
    if (ed == null) continue;
    if (e[ed] === false) {
      out[key] = false;
    } else {
      out[key] = from[key] !== false;
    }
  }

  return normalizeOptionalVisibility(out);
}

/**
 * Compatibilidad con enlaces guardados antes de la granularidad:
 * - `medical: false` ocultaba alergias/enfermedades/discapacidad.
 * - `serverBlock: false` ocultaba servidor y el bloque extra de servidor.
 */
export function normalizeOptionalVisibility(raw) {
  const merged = { ...defaultOptionalVisibility(), ...(raw && typeof raw === 'object' ? raw : {}) };
  if (merged.medical === false) {
    merged.allergies = false;
    merged.diseases = false;
    merged.disability = false;
  }
  if (merged.serverBlock === false) {
    merged.serverRole = false;
    merged.serverProfileExtra = false;
  }
  return merged;
}

/** Mismas claves que `EDITOR_REGISTRATION_FIELD_META` (formulario «Nuevo registro» / Editor). */
const EDITOR_REGISTRATION_FIELD_KEYS = [
  'profileImportSearch',
  'alias',
  'bloodType',
  'canSwim',
  'allergies',
  'diseases',
  'disability',
  'scholarship',
  'serverRole',
  'serverProfileExtra',
  'willBeBaptized',
  'campAssignment',
  'attendanceSpecial',
  'travelFrom',
  'travelTo',
  'bautizosFood',
  'bautizosTransport',
  'bautizosCompanions',
  'bautizosAttendanceType',
  'transportExtras',
  'discountCampaign',
  'customFields',
];

const defaultEditorRegistrationFieldVisibilityCore = () =>
  Object.fromEntries(EDITOR_REGISTRATION_FIELD_KEYS.map((k) => [k, true]));

/**
 * Misma fusión tipo + evento que el panel (Administrador → campos por tipo / por evento).
 * Sirve para `fv(key)` alineado con `getRegistrationFormIssues` en App.jsx.
 */
export function buildEditorRegistrationFieldVisFromSnapshots(globalSnapshot, eventSnapshot) {
  const evType = eventSnapshot?.eventType;
  const byType = globalSnapshot?.editorRegistrationFieldsByType;
  const typeRaw = evType && byType && typeof byType === 'object' ? byType[evType] : null;
  const typeVis = { ...defaultEditorRegistrationFieldVisibilityCore(), ...(typeRaw && typeof typeRaw === 'object' ? typeRaw : {}) };
  const eventObj =
    eventSnapshot?.editorRegistrationFields && typeof eventSnapshot.editorRegistrationFields === 'object'
      ? eventSnapshot.editorRegistrationFields
      : {};
  return { ...typeVis, ...eventObj };
}

const SI = 'Si';
const SI_LABEL = 'Sí';
export const ATTENDANCE_SPECIAL = { ninguno: 'ninguno', empleado: 'empleado', cortesia: 'cortesia' };

export const isSiValue = (v) => {
  const s = String(v ?? '').trim();
  if (s === SI || s === SI_LABEL) return true;
  if (s.toLowerCase() === 'sí') return true;
  if (s.length === 2 && s[0] === 'S' && (s[1] === '?' || s[1] === '\uFFFD')) return true;
  return false;
};

export function normalizeAttendanceSpecial(personLike) {
  const t = personLike?.attendanceSpecialType;
  if (t === ATTENDANCE_SPECIAL.empleado || t === ATTENDANCE_SPECIAL.cortesia) return t;
  return ATTENDANCE_SPECIAL.ninguno;
}

/**
 * Botones Ninguno / Empleado / Cortesía: inactivos con panel oscuro sólido en `html.dark`
 * (evita `bg-white` / `bg-slate-200` que quedan como parches claros).
 */
export function attendanceSpecialChoiceButtonClass(selectedId, optionId) {
  const active = selectedId === optionId;
  const base =
    'w-full box-border inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-all touch-manipulation shrink-0';
  if (!active) {
    return `${base} border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700`;
  }
  if (optionId === ATTENDANCE_SPECIAL.empleado) {
    return `${base} bg-teal-600 text-white border-teal-500`;
  }
  if (optionId === ATTENDANCE_SPECIAL.cortesia) {
    return `${base} bg-fuchsia-600 text-white border-fuchsia-500`;
  }
  return `${base} border-slate-500 bg-slate-600 text-white hover:bg-slate-600 dark:border-slate-500 dark:bg-slate-700 dark:text-white`;
}

const isFreeAttendanceType = (t) => t === ATTENDANCE_SPECIAL.empleado || t === ATTENDANCE_SPECIAL.cortesia;

const digitsOnlyPhone = (phone) => (phone || '').replace(/\D/g, '');

const PARTICIPANT_STATUS_ARCHIVED = 'archived';
const PARTICIPANT_STATUS_CANCELLED = 'cancelled';
const participantIsArchived = (p) => (p?.status || 'active') === PARTICIPANT_STATUS_ARCHIVED;
const participantIsCancelled = (p) => (p?.status || 'active') === PARTICIPANT_STATUS_CANCELLED;
const participantIsRosterRow = (p) => {
  const s = p?.status || 'active';
  return s !== 'waitlist' && s !== PARTICIPANT_STATUS_ARCHIVED;
};
const participantIsActiveInEvent = (p) => !participantIsArchived(p);
const participantBlocksDuplicateRegistration = (p) => participantIsActiveInEvent(p) && !participantIsCancelled(p);

const normalizeIdText = (txt) =>
  String(txt || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u00f1/gi, 'n')
    .replace(/\u00df/gi, 'ss')
    .toUpperCase();

export const canonicalizeVnpPersonId = (raw) => {
  const t = String(raw || '').trim();
  if (!t) return '';
  const m = t.match(/^VNPM-(.*)$/i);
  if (!m) return t;
  const rest = normalizeIdText(m[1]).replace(/[^A-Z0-9]/g, '');
  if (!rest) return '';
  return `VNPM-${rest}`;
};

/**
 * Misma regla que `getArchiveProfileDocId` en App.jsx: id estable por VNPM (`id_` + VNPM canonicalizado seguro).
 * Si no hay VNPM válido, devuelve null y el llamador usa un id temporal (p. ej. timestamp).
 */
export function participantDocumentIdFromVnpPersonId(vnpRaw) {
  const vnp = canonicalizeVnpPersonId(vnpRaw || '');
  if (vnp.length >= 4) {
    const safe = sanitizeFirestoreDocId(vnp, { maxChars: 120, fallback: '' });
    return safe ? `id_${safe}` : null;
  }
  return null;
}

const EVENT_ID_DOC_SUFFIX_MAX = 100;

function sanitizeEventIdForParticipantDocSuffix(eventId) {
  return sanitizeFirestoreDocId(eventId, { maxChars: EVENT_ID_DOC_SUFFIX_MAX, fallback: 'unknown' });
}

/**
 * Mismo `vnpPersonId` puede inscribirse en varios eventos: un documento por combinación (VNPM + evento).
 * - Primer uso del VNPM: id estable `id_VNPM…` (misma regla que `participantDocumentIdFromVnpPersonId`).
 * - Si ese doc ya existe **con otro** `eventId`, el alta en el nuevo evento usa `id_VNPM…__e_<eventId>`.
 * Así no se sobrescribe la participación en el evento anterior.
 */
export async function resolveParticipantDocumentIdForWrite(vnpRaw, eventId) {
  const base = participantDocumentIdFromVnpPersonId(vnpRaw);
  if (!base) return String(Date.now());
  const ev = String(eventId || '').trim();
  if (!ev) return base;
  try {
    const snap = await getDoc(getDocRef('app_participants', base));
    if (!snap.exists()) return base;
    const ex = snap.data();
    if (String(ex?.eventId || '') === ev) return base;
    return `${base}__e_${sanitizeEventIdForParticipantDocSuffix(ev)}`;
  } catch {
    return `${base}__e_${sanitizeEventIdForParticipantDocSuffix(ev)}`;
  }
}

function firestoreExistingBlocksSameEventRegistration(existing, eventId) {
  if (String(existing?.eventId || '') !== String(eventId || '')) return false;
  if (participantIsArchived(existing) || participantIsCancelled(existing)) return false;
  const st = existing?.status || 'active';
  return st === 'active' || st === 'waitlist';
}

/**
 * Antes de crear/sobrescribir un participante: bloquea solo si ya existe doc con el mismo id,
 * mismo evento y estado activo o lista de espera (no cancelado/archivado).
 */
export async function loadParticipantRegistrationWriteGate(participantDocId, eventId) {
  const ref = getDocRef('app_participants', participantDocId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { ok: true, snap: null };
  const ex = snap.data();
  if (firestoreExistingBlocksSameEventRegistration(ex, eventId)) {
    return {
      ok: false,
      error: buildPublicRegistrationWriteGateBlockedMessage(ex, participantDocId),
      snap,
    };
  }
  return { ok: true, snap };
}

export const generateVnpPersonId = (personLike = {}) => {
  const omit = new Set(['DE', 'DEL', 'LA', 'LAS', 'LOS', 'Y', 'MC', 'MAC']);
  const parts = normalizeIdText(personLike?.name)
    .replace(/[^A-Z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((p) => !omit.has(p));

  const firstName = parts[0] || '';
  const firstSurname = parts.length >= 3 ? parts[parts.length - 2] : parts[1] || '';
  const secondSurname = parts.length >= 2 ? parts[parts.length - 1] : '';

  const firstSurname2 = `${firstSurname.slice(0, 2)}`.padEnd(2, 'X');
  const secondSurname1 = secondSurname[0] || 'X';
  const firstName1 = firstName[0] || 'X';

  const birthDateRaw = String(personLike?.birthDate || '');
  const digits = birthDateRaw.replace(/\D/g, '');
  const yymmdd = digits.length === 8 ? `${digits.slice(2, 4)}${digits.slice(4, 6)}${digits.slice(6, 8)}` : '000000';
  const genderRaw = normalizeIdText(personLike?.gender || '');
  const genderSuffix = genderRaw.startsWith('H') ? 'H' : genderRaw.startsWith('M') ? 'M' : 'X';

  const suffix = `${firstSurname2}${secondSurname1}${firstName1}${yymmdd}${genderSuffix}`.replace(/[^A-Z0-9]/g, '');
  return `VNPM-${suffix}`;
};

const hasValidFullName = (fullName) => {
  const parts = String(fullName || '')
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean);
  return parts.length >= 3;
};

const NAME_PARTICLES_FOR_FAMILY = new Set(['DE', 'DEL', 'LA', 'LAS', 'LOS', 'Y', 'MC', 'MAC']);
const getNamePartsForFamilyCompare = (fullName) =>
  normalizeIdText(fullName || '')
    .replace(/[^A-Z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !NAME_PARTICLES_FOR_FAMILY.has(w));

const getFamilySurnamePairKey = (fullName) => {
  const parts = getNamePartsForFamilyCompare(fullName);
  if (parts.length < 2) return null;
  if (parts.length >= 3) return `${parts[parts.length - 2]}|${parts[parts.length - 1]}`;
  return `*|${parts[parts.length - 1]}`;
};

const isSameFamilyBySurnames = (nameA, nameB) => {
  const ka = getFamilySurnamePairKey(nameA);
  const kb = getFamilySurnamePairKey(nameB);
  if (ka == null || kb == null) return false;
  return ka === kb;
};

const isMinorAge = (ageStr) => {
  const n = parseInt(ageStr, 10);
  return Number.isFinite(n) && n > 0 && n < 18;
};

const isAdultAge = (ageStr) => {
  const n = parseInt(ageStr, 10);
  return Number.isFinite(n) && n >= 18;
};

/** Etiqueta de autor para registros del enlace público: adulto=participante, menor=contacto de emergencia. */
const resolvePublicRegisteredBy = (entryLike) => {
  const personName = String(entryLike?.name || '').trim();
  const emergencyName = String(entryLike?.emergencyContact || '').trim();
  const baseName = isMinorAge(entryLike?.age) ? (emergencyName || personName) : (personName || emergencyName);
  return baseName ? `${baseName} (enlace público)` : 'Registro público (enlace público)';
};

/** `true` si el participante se inscribió por el formulario / enlace público. */
export function participantRegisteredViaPublicLink(person) {
  const rb = String(person?.registeredBy ?? '').trim();
  if (!rb) return false;
  const low = rb.toLowerCase();
  return low.includes('enlace público') || low.includes('enlace publico');
}

/** Al menos un apellido en común (tokens de apellido según el mismo criterio que la excepción de hermanos). */
const shareAtLeastOneSurnameToken = (nameA, nameB) => {
  const partsA = getNamePartsForFamilyCompare(nameA);
  const partsB = getNamePartsForFamilyCompare(nameB);
  if (partsA.length < 2 || partsB.length < 2) return false;
  const surnamesA =
    partsA.length >= 3 ? [partsA[partsA.length - 2], partsA[partsA.length - 1]] : [partsA[partsA.length - 1]];
  const surnamesB =
    partsB.length >= 3 ? [partsB[partsB.length - 2], partsB[partsB.length - 1]] : [partsB[partsB.length - 1]];
  const setA = new Set(surnamesA);
  return surnamesB.some((t) => setA.has(t));
};

/** Un menor y un adulto con al menos un apellido coincidente (p. ej. padre/madre e hijo con mismo teléfono). */
const isAdultMinorFamilyPhoneShare = (nameA, ageA, nameB, ageB) => {
  const aM = isMinorAge(ageA);
  const aA = isAdultAge(ageA);
  const bM = isMinorAge(ageB);
  const bA = isAdultAge(ageB);
  if (!((aM && bA) || (aA && bM))) return false;
  return shareAtLeastOneSurnameToken(nameA, nameB);
};

/**
 * Mismo teléfono permitido entre registros: mismos dos apellidos (hermanos/padres con mismo par)
 * o adulto + menor con al menos un apellido en común (familia).
 */
export function isPhoneShareFamilyAllowed(nameA, ageA, nameB, ageB) {
  if (isSameFamilyBySurnames(nameA, nameB)) return true;
  return isAdultMinorFamilyPhoneShare(nameA, ageA, nameB, ageB);
}

function statusLabelForParticipantPublic(p) {
  if (participantIsArchived(p)) return 'Archivado';
  if (participantIsWaitlistRow(p)) return 'Lista de espera';
  if (participantIsCancelled(p)) return 'Cancelados';
  return 'Activos';
}

function participantIsWaitlistRow(p) {
  return (p?.status || 'active') === 'waitlist';
}

/** Resumen legible del registro que bloquea duplicados (teléfono / VNPM). */
function formatPublicDuplicateBlockerSummary(p) {
  const name = String(p?.name || '').trim() || '(sin nombre en el sistema)';
  const loc = String(p?.location || '').trim();
  const status = statusLabelForParticipantPublic(p);
  const refId = String(p?.id || '').trim();
  const lines = [`• Nombre: ${name}`, `• Estado: ${status}`];
  if (loc) lines.splice(1, 0, `• Sede: ${loc}`);
  if (refId) lines.push(`• Id. interno del registro: ${refId}`);
  return lines.join('\n');
}

function buildPublicPhoneDuplicateBlockedMessage(blocker, { allowSharedMainPhone }) {
  const summary = formatPublicDuplicateBlockerSummary(blocker);
  const parts = [
    'Motivo: el mismo número de teléfono ya está en uso en este evento.',
    'No puede haber dos inscripciones activas o en lista de espera con el mismo teléfono, salvo las excepciones familiares que marca el formulario.',
    '',
    'Registro que coincide con ese teléfono:',
    summary,
  ];
  if (!allowSharedMainPhone) {
    parts.push(
      '',
      'Si varios familiares comparten el mismo número (p. ej. menor con el celular del tutor), activa la opción «Es el mismo teléfono que otro inscrito…» y vuelve a enviar.'
    );
  }
  parts.push('', 'Si no reconoces ese registro o crees que es un error, contacta a la organización.');
  return parts.join('\n');
}

function buildPublicVnpDuplicateBlockedMessage(blocker) {
  const vnp = String(blocker?.vnpPersonId || '').trim();
  const parts = [
    'Motivo: el ID VNPM que ingresaste ya está asociado a una inscripción en este mismo evento.',
    '',
    'Registro existente con ese VNPM:',
    formatPublicDuplicateBlockerSummary(blocker),
  ];
  if (vnp) parts.push(`• VNPM: ${vnp}`);
  parts.push(
    '',
    'Si ya enviaste el formulario antes, no repitas el envío. Si es la primera vez que intentas y ves este mensaje, contacta a la organización.'
  );
  return parts.join('\n');
}

function buildPublicRegistrationWriteGateBlockedMessage(existing, participantDocId) {
  const name = String(existing?.name || '').trim();
  const vnp = String(existing?.vnpPersonId || '').trim();
  const hasSummaryData =
    name || String(existing?.location || '').trim() || String(existing?.id || '').trim();
  const lines = [
    'Motivo: el folio del registro (derivado de tu VNPM o datos) ya existe en el servidor para este evento con una inscripción activa o en lista de espera.',
    '',
    ...(hasSummaryData
      ? ['Datos del registro ya guardado:', formatPublicDuplicateBlockerSummary(existing)]
      : [`No hay datos legibles del registro previo. Id. de documento en conflicto: ${participantDocId}`]),
  ];
  if (vnp) lines.push('', `VNPM en ese folio: ${vnp}`);
  lines.push(
    '',
    'Si completaste el registro anteriormente, no vuelvas a enviar. Si aparece por error, contacta a la organización.'
  );
  return lines.join('\n');
}

function findPhoneDuplicateBlocker(
  fullName,
  phoneDigits,
  participants,
  eventId,
  excludeParticipantId,
  candidateAge,
  allowSharedMainPhone = false
) {
  if (allowSharedMainPhone) return null;
  if (!phoneDigits || String(phoneDigits).length < 10) return null;
  for (const p of participants) {
    if (p.eventId !== eventId || !participantBlocksDuplicateRegistration(p)) continue;
    if (excludeParticipantId != null && String(p.id) === String(excludeParticipantId)) continue;
    if (digitsOnlyPhone(p.phone) !== phoneDigits) continue;
    if (isPhoneShareFamilyAllowed(fullName, candidateAge, p.name, p.age)) continue;
    return p;
  }
  return null;
}

const phoneDuplicateInEvent = (
  fullName,
  phoneDigits,
  participants,
  eventId,
  excludeParticipantId,
  candidateAge,
  allowSharedMainPhone = false
) =>
  !!findPhoneDuplicateBlocker(
    fullName,
    phoneDigits,
    participants,
    eventId,
    excludeParticipantId,
    candidateAge,
    allowSharedMainPhone
  );

const resolveResponsivaStatus = (personLike, eventLike = null) => {
  const needsResponsiva = registrationRequiresResponsivaStatus(personLike, eventLike || {});
  if (!needsResponsiva) return 'No aplica';
  return personLike?.responsivaStatus === 'Entregada' ? 'Entregada' : 'Pendiente';
};

export const calculateAgeFromBirthDate = (birthDate) => {
  if (!birthDate || typeof birthDate !== 'string') return '';
  const b = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(b.getTime())) return '';
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const monthDiff = now.getMonth() - b.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < b.getDate())) age -= 1;
  if (!Number.isFinite(age) || age < 0 || age > 120) return '';
  return String(age);
};

/** Edad en años para gráficas del dashboard (campo `age` o `birthDate`). */
export function resolveDashboardParticipantAgeYears(personLike) {
  const bd = String(personLike?.birthDate || '').trim();
  const fromBirth = bd ? calculateAgeFromBirthDate(bd) : '';
  const parsed = parseInt(String(fromBirth || personLike?.age || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/** `man` | `woman` | `unspecified` */
export function classifyDashboardParticipantGender(personLike) {
  const g = String(personLike?.gender || '').trim();
  if (g === 'Hombre') return 'man';
  if (g === 'Mujer') return 'woman';
  return 'unspecified';
}

/** Rango de edad del dashboard; `unspecified` si no hay edad válida. */
export function classifyDashboardParticipantAgeBracket(personLike) {
  const ageNum = resolveDashboardParticipantAgeYears(personLike);
  if (ageNum == null) return 'unspecified';
  if (ageNum < 13) return 'kids';
  if (ageNum <= 17) return 'teens';
  if (ageNum <= 25) return 'youngAdults';
  if (ageNum <= 40) return 'adults';
  return 'seniors';
}

/** Suma género y rango de edad al acumulador del dashboard (`weight` ≥ 1 por persona). */
export function accumulateDashboardParticipantDemographics(acc, personLike, weight = 1) {
  const w = Number(weight);
  if (!Number.isFinite(w) || w <= 0) return acc;
  const gender = classifyDashboardParticipantGender(personLike);
  if (gender === 'man') acc.totalMen += w;
  else if (gender === 'woman') acc.totalWomen += w;
  else acc.totalGenderUnspecified = (acc.totalGenderUnspecified || 0) + w;

  const bracket = classifyDashboardParticipantAgeBracket(personLike);
  if (!acc.ageBrackets) acc.ageBrackets = {};
  acc.ageBrackets[bracket] = (acc.ageBrackets[bracket] || 0) + w;
  return acc;
}

const campaignMatchesPersonProfile = (c, personLike) => {
  const isAnyServerAmbos = isSiValue(personLike?.isServer) && personLike?.serverAssignment === 'Ambos';
  const mix = String(personLike?.ambosServeInSegment || '').trim();
  const isServerAmbosTarifaUnica =
    isAnyServerAmbos && mix !== 'Teens' && mix !== 'Jóvenes';
  const appliesTo = c?.appliesTo || 'all';
  if (appliesTo === 'server_ambos') return isServerAmbosTarifaUnica;
  if (appliesTo === 'general') return !isAnyServerAmbos;
  return true;
};

const isDiscountCampaignVigenteOnDate = (c, dayIso) => {
  if (!c?.startDate || !c?.endDate || !dayIso) return false;
  return c.startDate <= dayIso && dayIso <= c.endDate;
};

const isValidDiscountCampaignRow = (c) =>
  !!(c && c.enabled !== false && String(c.concept || '').trim() && (Number(c.finalAmount) || 0) > 0);

export const getValidDiscountCampaignsForPerson = (eventLike, personLike) => {
  const all = Array.isArray(eventLike?.discountCampaigns) ? eventLike.discountCampaigns : [];
  return all.filter((c) => isValidDiscountCampaignRow(c) && campaignMatchesPersonProfile(c, personLike));
};

/**
 * Precio efectivo por sede/asignación. `server` y `serverAmbos` son el costo servidor «Ambos» (compat. con código viejo).
 * Si no existen `serverCostTeens` / `serverCostJovenes` en Firestore, se usa el costo base (camper) como antes.
 */
export const normalizeServerTierCosts = (globalCost, tierOrEvent) => {
  const g = Number(globalCost) || 0;
  const legacySrv = Number(tierOrEvent?.serverCost) || 0;
  const ambosRaw = tierOrEvent?.serverCostAmbos;
  const ambos = ambosRaw != null && ambosRaw !== '' ? Number(ambosRaw) : legacySrv;
  const teensRaw = tierOrEvent?.serverCostTeens;
  const teens = teensRaw != null && teensRaw !== '' ? Number(teensRaw) : g;
  const jovRaw = tierOrEvent?.serverCostJovenes;
  const jovenes = jovRaw != null && jovRaw !== '' ? Number(jovRaw) : g;
  const ambosN = Number.isFinite(ambos) ? ambos : 0;
  return {
    global: g,
    server: ambosN,
    serverAmbos: ambosN,
    serverTeens: Number.isFinite(teens) ? teens : g,
    serverJovenes: Number.isFinite(jovenes) ? jovenes : g,
  };
};

/** ¿La fase de lista campista trae datos de precio servidor? (datos viejos acoplados a las mismas fechas). */
export const tierHasServerPricesInCamperTier = (tier) => {
  if (!tier) return false;
  if (tier.serverCostTeens != null && tier.serverCostTeens !== '') return true;
  if (tier.serverCostJovenes != null && tier.serverCostJovenes !== '') return true;
  if (tier.serverCostAmbos != null && tier.serverCostAmbos !== '') return true;
  if (tier.serverCost != null && tier.serverCost !== '' && Number(tier.serverCost) > 0) return true;
  return false;
};

const serverTiersFromNormalized = (n) => ({
  server: n.server,
  serverAmbos: n.serverAmbos,
  serverTeens: n.serverTeens,
  serverJovenes: n.serverJovenes,
});

/**
 * Lista campista vigente por fecha (`dynamicPrices`: cada fase tiene `dateUntil` = vigente hasta ese día inclusive).
 * Mientras la fecha cae en alguna fase (primera con `isoDate <= dateUntil`), aplica el `globalCost` de esa fase.
 * Cuando ya pasaron todas las fases (`isoDate` posterior a todas las `dateUntil`), aplica el precio final guardado en el evento (`globalCost` del formulario «Precios finales / fijos de referencia»), no el último renglón de fases.
 */
const resolveCamperGlobalForIso = (event, isoDate) => {
  const g0 = Number(event?.globalCost) || 0;
  if (event?.pricingType !== 'dynamic' || !Array.isArray(event?.dynamicPrices) || event.dynamicPrices.length === 0) {
    return g0;
  }
  const sorted = [...event.dynamicPrices].sort((a, b) => String(a.dateUntil).localeCompare(String(b.dateUntil)));
  for (const tier of sorted) {
    if (isoDate <= tier.dateUntil) {
      return Number(tier.globalCost) || 0;
    }
  }
  return g0;
};

/**
 * Precios servidor: por defecto fijos (`serverCost*` en el evento).
 * Si existen `dynamicServerPrices`, las fases son independientes de las del campista.
 * Compatibilidad: si no hay `dynamicServerPrices` pero las fases de `dynamicPrices` traían precios servidor, se usa ese calendario (mismas fechas que campista).
 */
const resolveServerPricingForIso = (event, isoDate) => {
  const fixed = normalizeServerTierCosts(Number(event?.globalCost) || 0, event);
  const fixedSrv = serverTiersFromNormalized(fixed);

  if (Array.isArray(event?.dynamicServerPrices) && event.dynamicServerPrices.length > 0) {
    const sorted = [...event.dynamicServerPrices].sort((a, b) => String(a.dateUntil).localeCompare(String(b.dateUntil)));
    for (const tier of sorted) {
      if (isoDate <= tier.dateUntil) {
        return serverTiersFromNormalized(normalizeServerTierCosts(0, tier));
      }
    }
    return fixedSrv;
  }

  if (event?.pricingType === 'dynamic' && Array.isArray(event?.dynamicPrices) && event.dynamicPrices.length > 0) {
    const sorted = [...event.dynamicPrices].sort((a, b) => String(a.dateUntil).localeCompare(String(b.dateUntil)));
    const legacy = sorted.some(tierHasServerPricesInCamperTier);
    if (legacy) {
      for (const tier of sorted) {
        if (isoDate <= tier.dateUntil) {
          return serverTiersFromNormalized(normalizeServerTierCosts(0, tier));
        }
      }
      return fixedSrv;
    }
  }

  return fixedSrv;
};

export const getPricingFromSnapshot = (event) => getPricingFromSnapshotForDate(event, Date.now());

/**
 * Precio vigente según la fecha de registro (p. ej. `registeredAt`): lista campista y servidor se resuelven por separado.
 * Con precios por fases, si la fecha sigue dentro del alcance de una fase (`<= dateUntil`), aplica esa fase; si ya pasaron todas, aplica los precios finales del evento (`globalCost` / `serverCost*`).
 */
export const getPricingFromSnapshotForDate = (event, dateMs) => {
  if (!event) return { global: 0, server: 0, serverAmbos: 0, serverTeens: 0, serverJovenes: 0 };
  const tMs = Number(dateMs) || Date.now();
  const isoDate = new Date(tMs).toISOString().split('T')[0];
  const global = resolveCamperGlobalForIso(event, isoDate);
  const srv = resolveServerPricingForIso(event, isoDate);
  return { global, ...srv };
};

const getActiveDiscountCampaigns = (eventLike) => {
  const today = new Date().toISOString().split('T')[0];
  const all = Array.isArray(eventLike?.discountCampaigns) ? eventLike.discountCampaigns : [];
  return all.filter((c) => {
    if (!c || c.enabled === false) return false;
    if (!c.startDate || !c.endDate) return false;
    return isDiscountCampaignVigenteOnDate(c, today);
  });
};

const resolveCampaignForPerson = (personLike, eventLike) => {
  const active = getActiveDiscountCampaigns(eventLike);
  return active.find((c) => campaignMatchesPersonProfile(c, personLike)) || null;
};

const resolveMatchedCampaignForNewEntry = (entry, eventLike) => {
  const selectable = getValidDiscountCampaignsForPerson(eventLike, entry);
  if (entry.selectedDiscountCampaignId) {
    return selectable.find((c) => String(c.id) === String(entry.selectedDiscountCampaignId)) || null;
  }
  return resolveCampaignForPerson(entry, eventLike);
};

/** Valores por defecto si el evento no define `bautizosListPriceFood` / `bautizosListPriceTransport`. */
export const DEFAULT_BAUTIZOS_LIST_PRICE_FOOD = 150;
export const DEFAULT_BAUTIZOS_LIST_PRICE_TRANSPORT = 350;

/** @deprecated Usar DEFAULT_BAUTIZOS_LIST_PRICE_* o precios en el evento. */
export const BAUTIZOS_PRICE_FOOD = DEFAULT_BAUTIZOS_LIST_PRICE_FOOD;
/** @deprecated Usar DEFAULT_BAUTIZOS_LIST_PRICE_* o precios en el evento. */
export const BAUTIZOS_PRICE_TRANSPORT = DEFAULT_BAUTIZOS_LIST_PRICE_TRANSPORT;
/** @deprecated Suma de los valores por defecto; con evento configurado usar comida + transporte. */
export const BAUTIZOS_PRICE_FOOD_AND_TRANSPORT =
  DEFAULT_BAUTIZOS_LIST_PRICE_FOOD + DEFAULT_BAUTIZOS_LIST_PRICE_TRANSPORT;

export function getBautizosListPriceBreakdown(eventLike) {
  const food = Number(eventLike?.bautizosListPriceFood ?? DEFAULT_BAUTIZOS_LIST_PRICE_FOOD) || 0;
  const transport = Number(eventLike?.bautizosListPriceTransport ?? DEFAULT_BAUTIZOS_LIST_PRICE_TRANSPORT) || 0;
  return { food, transport, both: food + transport };
}

/** Misma semántica que `resolveLlegaEnCarro` en App.jsx (checkbox o legado `transportType`). */
const resolveLlegaEnCarroPricing = (personLike) => {
  if (typeof personLike?.llegaEnCarro === 'boolean') return personLike.llegaEnCarro;
  if (isSiValue(personLike?.llegaEnCarro)) return true;
  if (personLike?.llegaEnCarro === 'No') return false;
  return (personLike?.transportType || 'Camión') === 'Carro';
};

const resolveRegresaEnCarroPricing = (personLike) => {
  if (typeof personLike?.regresaEnCarro === 'boolean') return personLike.regresaEnCarro;
  if (isSiValue(personLike?.regresaEnCarro)) return true;
  if (personLike?.regresaEnCarro === 'No') return false;
  return (personLike?.transportType || 'Camión') === 'Carro';
};

/**
 * Evento Bautizos: la comida va siempre en lista; el transporte se cobra solo si pide transporte
 * y no indica llegar y regresar en carro (en ese caso el costo de transporte es 0).
 */
export function getBautizosListPrice(personLike, eventLike = null) {
  if (isBautizosUnder3YearsAtEvent(personLike, eventLike)) return 0;
  const { food, transport } = getBautizosListPriceBreakdown(eventLike);
  const arrivesByCar = resolveLlegaEnCarroPricing(personLike);
  const transportWanted = isSiValue(personLike?.wantsBautizosTransport);
  const chargeTransport = transportWanted && !arrivesByCar;
  if (chargeTransport) return food + transport;
  return food;
}

/**
 * Lista del titular en Bautizos: bautizado y servidor pagan lista activa; empleado y cortesía $0.
 * Los acompañantes van aparte.
 */
export function getBautizosTitularListPrice(personLike, eventLike = null) {
  if (!eventLike || eventLike.eventType !== 'Bautizos') return 0;
  if (!bautizosAttendancePaysEventListPrice(personLike)) return 0;
  return getBautizosListPrice(personLike, eventLike);
}

/** Suma del precio de lista de todas las filas de acompañante (cada una comida ± transporte propios). */
export function getBautizosCompanionsListPriceSum(personLike, eventLike = null) {
  const { food, transport } = getBautizosListPriceBreakdown(eventLike);
  let sum = 0;
  for (const c of getBautizosCompanionsArray(personLike)) {
    if (c?.companionWaitlistPending === true) continue;
    sum += getBautizosLineListPrice(c, food, transport, eventLike);
  }
  return sum;
}

/**
 * Suma de lista de acompañantes solo para desglose informativo en fichas: incluye el costo «de referencia»
 * de filas vinculadas a otro documento del mismo grupo (`linkedNoExtraCharge`). Si se pasa `rosterParticipants`,
 * para esas filas se usa el precio titular del documento enlazado (`linkedRegistrantId`), que refleja transporte
 * y reglas reales; si no hay coincidencia, se usa la fila persistida con `ignoreLinkedCharge`.
 * @param {object|null|undefined} personLike
 * @param {object|null|undefined} eventLike
 * @param {object[]|null|undefined} [rosterParticipants] — p. ej. `allParticipants` del roster para resolver vínculos
 */
/**
 * Costo de lista de una fila de acompañante para desglose en UI (ficha expandida, WhatsApp, etc.).
 * Si está vinculada a otro documento del grupo, usa el precio titular del registro enlazado.
 */
export function getBautizosCompanionInformativeListPrice(companionRow, eventLike = null, rosterParticipants = null) {
  if (!eventLike || eventLike.eventType !== 'Bautizos') return 0;
  const { food, transport } = getBautizosListPriceBreakdown(eventLike);
  const lid = String(companionRow?.linkedRegistrantId || '').trim();
  const roster = Array.isArray(rosterParticipants) ? rosterParticipants : null;
  if (lid && roster) {
    const linkedP = roster.find((p) => p && String(p.id) === lid);
    if (linkedP) return getBautizosTitularListPrice(linkedP, eventLike);
  }
  return getBautizosLineListPrice(companionRow, food, transport, eventLike, { ignoreLinkedCharge: true });
}

export function getBautizosCompanionsInformativeListPriceSum(personLike, eventLike = null, rosterParticipants = null) {
  let sum = 0;
  for (const c of getBautizosCompanionsArray(personLike)) {
    sum += getBautizosCompanionInformativeListPrice(c, eventLike, rosterParticipants);
  }
  return sum;
}

/** Lista total del registro (titular bautizado + acompañantes): valor conjunto para liquidación y columnas de lista. */
export function getBautizosPartyListPrice(personLike, eventLike = null) {
  return getBautizosTitularListPrice(personLike, eventLike) + getBautizosCompanionsListPriceSum(personLike, eventLike);
}

/**
 * Precio de lista del host en un grupo partido (titular + acompañantes simples + titulares derivados bautizados).
 * Usa el formulario virtual del grupo, no los stubs `p:` a $0 del documento host persistido.
 */
export function getBautizosSplitPartyHostListPrice(hostPerson, roster, eventLike, editedOverlay = null) {
  const derived = getBautizosSplitPartyDerivedMembers(hostPerson, roster);
  if (!derived.length) return getBautizosPartyListPrice(hostPerson, eventLike);
  const overlay = editedOverlay && typeof editedOverlay === 'object' ? editedOverlay : {};
  const virtual = buildBautizosSplitPartyVirtualEntry(hostPerson, derived, overlay);
  return getBautizosPartyListPrice(virtual, eventLike);
}

/** Subtotal de lista de filas «acompañantes» del dashboard (nombre, no bautizado en subregistro, no duplicado titular). */
export function getBautizosDashboardCompanionListSubtotal(personLike, eventLike, companionDedupeMeta = null) {
  if (!eventLike || eventLike.eventType !== 'Bautizos') return 0;
  const { food, transport } = getBautizosListPriceBreakdown(eventLike);
  let sum = 0;
  for (const c of getBautizosCompanionsArray(personLike)) {
    const nm = String(c?.name || '').trim();
    if (!nm) continue;
    const line = getBautizosLineListPrice(c, food, transport, eventLike);
    if (isBautizosCompanionBaptized(c)) continue;
    if (
      companionDedupeMeta &&
      bautizosCompanionIsAlsoBautizadoRegistrant(
        c,
        companionDedupeMeta.bautizadoIdSet,
        companionDedupeMeta.bautizadoNameSet,
        companionDedupeMeta.vnpToBautizadoId
      )
    ) {
      continue;
    }
    sum += line;
  }
  return sum;
}

/**
 * Reparte el monto a liquidar entre inscrito (línea titular bautizado) y acompañantes (lista dashboard),
 * proporcional a sus subtotales de lista. Si no hay peso de lista, todo va al titular.
 */
export function getBautizosPartyLiquidationSplit(personLike, eventLike, companionDedupeMeta, liquidationTarget) {
  const L = Math.max(0, Number(liquidationTarget) || 0);
  if (!eventLike || eventLike.eventType !== 'Bautizos') {
    return { titularOwed: L, companionOwed: 0 };
  }
  const wT = getBautizosTitularListPrice(personLike, eventLike);
  const wC = getBautizosDashboardCompanionListSubtotal(personLike, eventLike, companionDedupeMeta);
  const den = wT + wC;
  if (!Number.isFinite(den) || den <= 0.005) {
    return { titularOwed: L, companionOwed: 0 };
  }
  const titularOwed = L * (wT / den);
  const companionOwed = L - titularOwed;
  return { titularOwed, companionOwed };
}

/**
 * Unidades de liquidación (titular + cada acompañante canónico) para el dashboard Bautizos.
 * Cada unidad tiene un `owed` proporcional al monto a liquidar del registro.
 */
export function buildBautizosDashboardLiquidationUnits(
  personLike,
  eventLike,
  companionDedupeMeta,
  liquidationTarget,
  opts = {}
) {
  const bzScope = normalizeBautizosDashboardScope(opts.bzScope ?? 'all');
  const canonicalCompanionInfos = Array.isArray(opts.canonicalCompanionInfos)
    ? opts.canonicalCompanionInfos
    : null;
  const L = Math.max(0, Number(liquidationTarget) || 0);
  if (!eventLike || eventLike.eventType !== 'Bautizos') {
    return L > 0.005 ? [{ kind: 'titular', owed: L }] : [];
  }
  const { food, transport } = getBautizosListPriceBreakdown(eventLike);
  const weighted = [];

  if (bautizosDashboardTitularCountsForScope(personLike, bzScope)) {
    const wT = getBautizosTitularListPrice(personLike, eventLike);
    weighted.push({ kind: 'titular', weight: Math.max(0, wT) });
  }

  const pushCompanionUnit = (companionLike, hostLike) => {
    if (!bautizosDashboardCompanionCountsForScope(companionLike, bzScope, hostLike)) return;
    const nm = String(companionLike?.name || '').trim();
    if (!nm) return;
    const w = getBautizosLineListPrice(companionLike, food, transport, eventLike);
    weighted.push({ kind: 'companion', weight: Math.max(0, w) });
  };

  if (canonicalCompanionInfos) {
    for (const info of canonicalCompanionInfos) {
      pushCompanionUnit(info?.sourceCompanion, info?.sourceRegistrant || personLike);
    }
  } else {
    for (const c of getBautizosCompanionsArray(personLike)) {
      const nm = String(c?.name || '').trim();
      if (!nm) continue;
      if (isBautizosCompanionBaptized(c) && bzScope !== 'baptized' && bzScope !== 'all') continue;
      if (
        companionDedupeMeta &&
        bautizosCompanionIsAlsoBautizadoRegistrant(
          c,
          companionDedupeMeta.bautizadoIdSet,
          companionDedupeMeta.bautizadoNameSet,
          companionDedupeMeta.vnpToBautizadoId
        )
      ) {
        continue;
      }
      pushCompanionUnit(c, personLike);
    }
  }

  const den = weighted.reduce((s, u) => s + u.weight, 0);
  if (den <= 0.005) {
    if (L <= 0.005) return weighted.map((u) => ({ kind: u.kind, owed: 0 }));
    if (weighted.length === 0 && bautizosDashboardTitularCountsForScope(personLike, bzScope)) {
      return [{ kind: 'titular', owed: L }];
    }
    return weighted.map((u) => ({ kind: u.kind, owed: 0 }));
  }
  return weighted.map((u) => ({ kind: u.kind, owed: (L * u.weight) / den }));
}

/** Aplica abonos en orden FIFO: cada unidad se liquida por completo antes de pasar a la siguiente. */
export function countBautizosFifoLiquidationUnits(units, paidGross) {
  let remaining = Math.max(0, Number(paidGross) || 0);
  let paidOff = 0;
  let withDebt = 0;
  for (const u of units || []) {
    const owed = Math.max(0, Number(u?.owed) || 0);
    if (owed <= 0.005) {
      paidOff += 1;
      continue;
    }
    const applied = Math.min(remaining, owed);
    remaining -= applied;
    if (owed - applied <= 0.005) paidOff += 1;
    else withDebt += 1;
  }
  return { paidOff, withDebt };
}

/**
 * Aplica pagos en orden (historial): primero cubren la parte del inscrito, luego la de acompañantes.
 * El excedente tras cubrir ambas partes se contabiliza como acompañante.
 * `computeNet(gross, method)` debe coincidir con la lógica del panel (comisiones).
 */
export function allocateBautizosDashboardPayments(
  personLike,
  eventLike,
  companionDedupeMeta,
  liquidationTarget,
  paymentHistory,
  legacyPaidGross,
  defaultPaymentMethod,
  computeNet
) {
  const liq = Math.max(0, Number(liquidationTarget) || 0);
  const { titularOwed, companionOwed } = getBautizosPartyLiquidationSplit(
    personLike,
    eventLike,
    companionDedupeMeta,
    liq
  );
  let owedT = titularOwed;
  let owedC = companionOwed;
  const hist = Array.isArray(paymentHistory) ? paymentHistory.filter((h) => h && h.kind !== 'comment') : [];
  const defM = defaultPaymentMethod === 'Tarjeta' ? 'Tarjeta' : 'Efectivo';
  const lines =
    hist.length > 0
      ? hist.map((h) => ({
          gross: Number(h.amount || 0) || 0,
          method: h.method || defM,
          service: h.service,
        }))
      : Number(legacyPaidGross) > 0
        ? [{ gross: Number(legacyPaidGross) || 0, method: defM, service: null }]
        : [];

  let paidGrossTitular = 0;
  let paidGrossCompanion = 0;
  let paidNetTitular = 0;
  let paidNetCompanion = 0;
  const historyRows = [];

  for (const line of lines) {
    const g = line.gross;
    if (g <= 1e-12) continue;
    const method = line.method || defM;
    const net = typeof computeNet === 'function' ? computeNet(g, method) : g;
    let payTG = Math.min(g, owedT);
    owedT -= payTG;
    const rem = g - payTG;
    let payCG = Math.min(rem, owedC);
    owedC -= payCG;
    const surplus = rem - payCG;
    payCG += surplus;

    const netT = g > 1e-12 ? (net * payTG) / g : 0;
    const netC = net - netT;

    paidGrossTitular += payTG;
    paidGrossCompanion += payCG;
    paidNetTitular += netT;
    paidNetCompanion += netC;
    historyRows.push({
      gross: g,
      method,
      service: line.service,
      payTG,
      payCG,
      netT,
      netC,
      net,
    });
  }

  return {
    titularOwed,
    companionOwed,
    paidGrossTitular,
    paidGrossCompanion,
    paidNetTitular,
    paidNetCompanion,
    historyRows,
  };
}

export { isFreeBautizosAttendance, minorHasRequiredGuardianCompanion, getBautizosCompanionsArray } from './bautizosParty.js';

/**
 * Costo de lista según perfil. Precios `pricing` ya vienen de `getPricingFromSnapshotForDate` (fijo o por fechas).
 * Servidor «Ambos» con `ambosServeInSegment` Teens/Jóvenes: participa en ambos segmentos pero solo sirve en uno;
 * en el otro va como campista → costo servidor de ese segmento + costo campista (`global`).
 * Sin `ambosServeInSegment` (histórico): tarifa única `serverAmbos`.
 * `eventLike`: si `eventType === 'Bautizos'`, la lista es **titular solo si va a bautizarse** (`participantHasBaptismChip`)
 * más **suma de precios por fila de acompañante** (comida ± transporte cada uno); cortesía/empleado no pagan línea titular pero sí pueden tener cobro por acompañantes.
 */
export const getPersonCost = (person, pricing, eventLike = null) => {
  if (eventLike?.eventType === 'Bautizos') {
    return getBautizosPartyListPrice(person, eventLike);
  }
  if (!pricing) return 0;
  const g = Number(pricing.global) || 0;
  if (!isSiValue(person?.isServer)) return g;
  const a = String(person.serverAssignment || '').trim();
  if (a === 'Ambos') {
    const mix = String(person.ambosServeInSegment || '').trim();
    if (mix === 'Teens') {
      const st = Number.isFinite(Number(pricing.serverTeens)) ? Number(pricing.serverTeens) : g;
      return st + g;
    }
    if (mix === 'Jóvenes') {
      const sj = Number.isFinite(Number(pricing.serverJovenes)) ? Number(pricing.serverJovenes) : g;
      return sj + g;
    }
    return Number(pricing.serverAmbos ?? pricing.server) || 0;
  }
  if (a === 'Teens') return Number.isFinite(Number(pricing.serverTeens)) ? Number(pricing.serverTeens) : g;
  if (a === 'Jóvenes') return Number.isFinite(Number(pricing.serverJovenes)) ? Number(pricing.serverJovenes) : g;
  return g;
};

const defaultAmbosOptionFormatMoney = (n) =>
  `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Etiquetas de opciones para servidor «Ambos»: tarifa única vs precio mixto, con costos del `pricing` vigente.
 * `formatMoney` opcional (p. ej. ocultar montos si el usuario no ve finanzas).
 */
export function buildAmbosServeInSegmentOptionLabels(personLike, pricing, formatMoney = defaultAmbosOptionFormatMoney) {
  const fm = typeof formatMoney === 'function' ? formatMoney : defaultAmbosOptionFormatMoney;
  if (!pricing) {
    return {
      uniqueEdit: 'Sin precio mixto (tarifa única servidor Ambos)',
      uniqueNew: 'Tarifa única servidor Ambos',
      teensEdit: 'Teens (en Jóvenes participo como campista)',
      jovenesEdit: 'Jóvenes (en Teens participo como campista)',
      teensNew: 'Solo Teens - en Jóvenes participa como campista',
      jovenesNew: 'Solo Jóvenes - en Teens participa como campista',
    };
  }
  const base = { ...(personLike || {}), isServer: 'Sí', serverAssignment: 'Ambos' };
  const g = Number(pricing.global) || 0;
  const st = Number.isFinite(Number(pricing.serverTeens)) ? Number(pricing.serverTeens) : g;
  const sj = Number.isFinite(Number(pricing.serverJovenes)) ? Number(pricing.serverJovenes) : g;
  const u = getPersonCost({ ...base, ambosServeInSegment: '' }, pricing);
  const tt = getPersonCost({ ...base, ambosServeInSegment: 'Teens' }, pricing);
  const tj = getPersonCost({ ...base, ambosServeInSegment: 'Jóvenes' }, pricing);
  return {
    uniqueEdit: `Sin precio mixto (tarifa única servidor Ambos) (${fm(u)})`,
    uniqueNew: `Tarifa única servidor Ambos (${fm(u)})`,
    teensEdit: `Teens (en Jóvenes participo como campista) (${fm(st)} + ${fm(g)} = ${fm(tt)})`,
    jovenesEdit: `Jóvenes (en Teens participo como campista) (${fm(sj)} + ${fm(g)} = ${fm(tj)})`,
    teensNew: `Solo Teens - en Jóvenes participa como campista (${fm(st)} + ${fm(g)} = ${fm(tt)})`,
    jovenesNew: `Solo Jóvenes - en Teens participa como campista (${fm(sj)} + ${fm(g)} = ${fm(tj)})`,
  };
}

const resolveRegisteredCost = (person, pricing, eventLike = null) => {
  if (person?.registeredCostManual === true) {
    const m = parseFloat(person?.registeredCost);
    if (Number.isFinite(m) && m >= 0) return m;
  }
  const parsed = parseFloat(person?.registeredCost);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return getPersonCost(person, pricing, eventLike);
};

const getLiquidationTarget = (person, currentPricing, eventLike = null) => {
  if (isFreeAttendanceType(normalizeAttendanceSpecial(person))) return 0;
  const listPrice = resolveRegisteredCost(person, currentPricing, eventLike);
  if (!isSiValue(person?.isScholarship)) return listPrice;
  if (person?.scholarshipType === 'partial') {
    const montoBecado = parseFloat(person.scholarshipPartialAmount || 0);
    if (!Number.isFinite(montoBecado) || montoBecado <= 0) return listPrice;
    const toLiquidate = listPrice - montoBecado;
    return Math.max(0, Math.min(toLiquidate, listPrice));
  }
  return 0;
};

/**
 * Monto a liquidar (misma fórmula que `getLiquidationTarget` en App.jsx). Útil para recordatorios y jobs.
 * @param {object} person
 * @param {object|null} eventLike
 */
export function computeParticipantLiquidationTarget(person, eventLike) {
  let regMs = Date.now();
  if (person?.registeredAt != null && String(person.registeredAt).trim()) {
    const t = new Date(person.registeredAt).getTime();
    if (Number.isFinite(t)) regMs = t;
  }
  const pricing = getPricingFromSnapshotForDate(eventLike, regMs);
  return getLiquidationTarget(person, pricing, eventLike);
}

const isValidPhone = (phone) => (phone.startsWith('+') ? phone.length > 5 : phone.replace(/\D/g, '').length === 10);

/** Misma obligatoriedad que «Nuevo registro» en App.jsx para el bloque de emergencia. */
export const emergencyContactRequiredForEventType = (evType) =>
  evType === 'Campa' || evType === 'Bautizos' || evType === 'General';

const appendEmergencyContactIssues = (merged, issues) => {
  if (!String(merged.emergencyContact || '').trim()) issues.push('Nombre del contacto de emergencia');
  if (!isValidPhone(merged.emergencyPhone || '')) issues.push('Teléfono de emergencia (10 dígitos)');
  if (!(merged.emergencyRelationship || '').trim()) issues.push('Parentesco del contacto de emergencia');
};

const isValidPartialScholarshipInitialPaid = (entry, minDep, currentPricing, eventLike = null) => {
  const paid = parseFloat(entry.paid) || 0;
  if (paid < 0) return false;
  const liq = getLiquidationTarget(entry, currentPricing, eventLike);
  return paid <= liq + 0.02;
};

/**
 * Aplica valores por defecto cuando una sección opcional está desactivada en el enlace.
 */
export const applyOptionalVisibilityDefaults = (entry, optionalVisibility, eventLike) => {
  const vis = normalizeOptionalVisibility(optionalVisibility);
  const out = { ...entry };
  if (!vis.alias) out.alias = '';
  if (!vis.vnpPersonId) out.vnpPersonId = '';
  if (!vis.bloodType) out.bloodType = BLOOD_TYPE_UNSPECIFIED;
  if (!vis.travelFrom) out.travelFrom = out.location || '';
  if (!vis.travelTo) out.travelTo = out.location || '';
  if (!vis.transportExtras) {
    out.llegaEnCarro = false;
    out.regresaEnCarro = false;
    out.transportType = 'Camión';
  }
  if (!vis.paymentInfo) {
    out.paid = '0';
    out.paymentMethod = 'Efectivo';
    out.cardReference = '';
    out.selectedDiscountCampaignId = '';
  } else {
    if (!vis.discountCampaign) out.selectedDiscountCampaignId = '';
    if (vis.initialDeposit === false) out.paid = '0';
  }
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
  if (!vis.campAssignment) out.campAssignment = '';
  if (!vis.willBeBaptized && eventLike?.eventType === 'Campa' && !isSiValue(out.isServer)) {
    out.willBeBaptized = 'No';
    out.baptismSegment = '';
  }
  if (!vis.scholarship) {
    out.isScholarship = 'No';
    out.scholarshipType = 'total';
    out.scholarshipPartialAmount = '';
  }
  if (!vis.attendanceSpecial) out.attendanceSpecialType = ATTENDANCE_SPECIAL.ninguno;
  if (!vis.customFields) out.customData = {};
  if (eventLike?.eventType === 'Bautizos') {
    out.wantsBautizosFood = SI;
    out.carrosLlegada = normalizeArrivalCarCount(out.carrosLlegada);
    if (out.wantsBautizosTransport == null || String(out.wantsBautizosTransport).trim() === '') out.wantsBautizosTransport = 'No';
    if (vis.bautizosTransport === false) {
      out.wantsBautizosTransport = 'No';
      out.llegaEnCarro = false;
      out.regresaEnCarro = false;
      out.travelFrom = out.location || '';
      out.travelTo = out.location || '';
    }
    if (!vis.bautizosCompanions) out.bautizosCompanions = [];
    if (!vis.bautizosAttendanceType) out.bautizosAttendanceType = 'bautizado';
  }
  return out;
};

export const getPublicRegistrationFormIssues = (
  entry,
  minDep,
  evType,
  currentPricing,
  optionalVisibility,
  eventSnapshot = null,
  editorFieldVis = null,
  privacyContext = null
) => {
  const vis = normalizeOptionalVisibility(optionalVisibility);
  const eventLike = eventSnapshot || { eventType: evType };
  const merged = applyOptionalVisibilityDefaults(entry, vis, eventLike);
  void editorFieldVis;
  /** Sección visible en el enlace = obligatoria; coherente con `optionalVisibility` del doc. de enlace. */
  const v = (key) => vis[key] !== false;
  const priv = privacyContext && typeof privacyContext === 'object' ? privacyContext : {};
  const privacyAccepted = priv.privacyAccepted ?? entry.privacyAccepted ?? false;
  const sensConsent = priv.sensitiveConsent ?? entry.sensitiveDataConsent ?? '';
  const sensAllowed = isSiValue(sensConsent);
  const fvSens = (key) => {
    const med = ['bloodType', 'allergies', 'diseases', 'disability', 'canSwim'];
    if (med.includes(key) && !sensAllowed) return false;
    return v(key);
  };

  const issues = [];
  if (!hasValidFullName(merged.name || '')) issues.push('Nombre completo (nombre y dos apellidos)');
  if (!isValidPhone(merged.phone || '')) issues.push('Teléfono personal (10 dígitos válidos)');
  if (merged.gender === '' || merged.gender == null) issues.push('Género');
  if (!(merged.birthDate || '').trim()) issues.push('Fecha de nacimiento');
  if (!(merged.location || '').trim()) issues.push('Sede');

  if ((evType === 'Campa' || evType === 'Bautizos') && fvSens('bloodType') && !String(merged.bloodType ?? '').trim()) {
    issues.push('Tipo de sangre');
  }

  if (v('alias') && !String(merged.alias || '').trim()) {
    issues.push('Alias');
  }
  if (v('customFields') && evType === 'General' && eventSnapshot) {
    const cf = Array.isArray(eventSnapshot.customFields) ? eventSnapshot.customFields : [];
    for (const fn of cf) {
      if (fn && !String(merged.customData?.[fn] || '').trim()) {
        issues.push(`Campo extra: ${fn}`);
      }
    }
  }

  if (evType === 'Campa') {
    const ageNum = parseInt(merged.age, 10);
    const needsResp = eventSnapshot
      ? registrationRequiresResponsivaStatus(merged, eventSnapshot)
      : Number.isFinite(ageNum) && ageNum > 0 && ageNum < 18;
    if (needsResp && !(merged.responsivaStatus || '').trim()) {
      issues.push(eventSnapshot ? responsivaStatusValidationLabel(eventSnapshot) : 'Responsiva (menor de edad)');
    }
    appendEmergencyContactIssues(merged, issues);

    if (fvSens('allergies') && merged.hasAllergy !== 'No' && String(merged.allergyDetails || '').trim() === '' && String(merged.allergyCategory || '').trim() === '') {
      issues.push('Alergias: categoría o detalle');
    }
    if (fvSens('diseases') && merged.hasDisease !== 'No' && String(merged.diseaseDetails || '').trim() === '') {
      issues.push('Detalle de enfermedad');
    }
    if (fvSens('disability') && merged.hasDisability !== 'No' && String(merged.disabilityDetails || '').trim() === '') {
      issues.push('Detalle de discapacidad');
    }
    if (v('serverRole') && isSiValue(merged.isServer) && !String(merged.serverAssignment || '').trim()) {
      issues.push('Asignación de servidor (Teens / Jóvenes / Ambos)');
    }
    if (v('willBeBaptized') && isSiValue(merged.willBeBaptized) && isSiValue(merged.isServer) && merged.serverAssignment === 'Ambos') {
      const bs = String(merged.baptismSegment || '').trim();
      if (bs !== 'Teens' && bs !== 'Jóvenes') issues.push('Bautizo: segmento Teens o Jóvenes (servidor Ambos)');
    }
    if (v('scholarship') && isSiValue(merged.isScholarship)) {
      if (merged.scholarshipType === 'partial') {
        const listPrice = getPersonCost(merged, currentPricing, eventSnapshot);
        const montoBecado = parseFloat(merged.scholarshipPartialAmount);
        if (!Number.isFinite(montoBecado) || montoBecado < 0) issues.push('Monto becado (número válido ≥ 0)');
        if (Number.isFinite(montoBecado) && montoBecado >= listPrice) issues.push('Monto becado debe ser menor que el costo de lista');
        if (v('paymentInfo') && !isValidPartialScholarshipInitialPaid(merged, minDep, currentPricing, eventSnapshot)) {
          const pend = getLiquidationTarget(merged, currentPricing, eventSnapshot);
          issues.push(
            `Abono inicial (beca parcial): no puede superar el saldo pendiente por liquidar (${pend.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}).`
          );
        }
      }
      return issues;
    }
    if (v('attendanceSpecial') && isFreeAttendanceType(normalizeAttendanceSpecial(merged))) return issues;
  }

  if (evType === 'Bautizos') {
    appendEmergencyContactIssues(merged, issues);
    if (fvSens('allergies') && merged.hasAllergy !== 'No' && String(merged.allergyDetails || '').trim() === '' && String(merged.allergyCategory || '').trim() === '') {
      issues.push('Alergias: categoría o detalle');
    }
    if (fvSens('diseases') && merged.hasDisease !== 'No' && String(merged.diseaseDetails || '').trim() === '') {
      issues.push('Detalle de enfermedad');
    }
    if (fvSens('disability') && merged.hasDisability !== 'No' && String(merged.disabilityDetails || '').trim() === '') {
      issues.push('Detalle de discapacidad');
    }
    if (v('bautizosTransport')) {
      appendBautizosTransportChoiceIssues(merged, issues, '', v, eventLike);
      if (isSiValue(merged.wantsBautizosTransport) && !resolveLlegaEnCarroPricing(merged)) {
        if (v('travelFrom') && !(merged.travelFrom || '').trim()) issues.push('Sede de salida (transporte)');
        if (v('travelTo') && !(merged.travelTo || '').trim()) issues.push('Sede de regreso (transporte)');
      }
    }
    appendBautizosCompanionsValidationIssues(merged, issues, fvSens, eventLike);
  }

  if (evType === 'General') {
    appendEmergencyContactIssues(merged, issues);
  }

  if (priv.requirePrivacy) {
    if (!privacyAccepted) issues.push('Aceptación del aviso de privacidad');
  }
  if (shouldBlockSensitiveHealthWithoutConsent(merged, priv)) {
    issues.push('Hay datos de salud capturados pero no autorizó su almacenamiento');
  }

  const paid = parseFloat(merged.paid) || 0;
  const min = Number(minDep) || 0;
  const bautizosNoCharge = evType === 'Bautizos' && getPersonCost(merged, currentPricing, eventLike) === 0;
  if (v('paymentInfo') && vis.initialDeposit !== false && !bautizosNoCharge && paid < min) {
    issues.push(`Abono inicial (mínimo $${min.toLocaleString('es-MX')})`);
  }
  if (
    v('paymentInfo') &&
    String(merged.paymentMethod || '') === 'Tarjeta' &&
    !isCardPaymentAllowedForLocation(eventLike, merged.location)
  ) {
    issues.push('Pago con tarjeta no disponible en esta sede; elige Efectivo.');
  }
  return issues;
};

const SERVICE_OPTIONS = ['Primero', 'Segundo', 'Tercero'];
const NO_SERVICE_LABEL = 'Fuera de servicios dominicales';

const getCashCutScheduleForLocation = (event, locName, globalSlots, globalScheduleByLocation = null) => {
  const scheduleFromRaw = (raw) => {
    if (!raw || typeof raw !== 'object') return null;
    const out = {};
    for (const s of SERVICE_OPTIONS) {
      const slot = raw[s];
      if (slot && typeof slot.start === 'string' && typeof slot.end === 'string' && slot.start && slot.end) {
        out[s] = { start: slot.start, end: slot.end };
      }
    }
    return Object.keys(out).length > 0 ? out : null;
  };

  const fromGlobal = scheduleFromRaw(globalScheduleByLocation?.[locName]);
  if (fromGlobal) return fromGlobal;

  const fromEvent = scheduleFromRaw(event?.cashCutScheduleByLocation?.[locName]);
  if (fromEvent) return fromEvent;

  const legacy = event?.cashCutServicesByLocation?.[locName];
  const list = Array.isArray(legacy) && legacy.length ? SERVICE_OPTIONS.filter((s) => legacy.includes(s)) : [...SERVICE_OPTIONS];
  const out = {};
  for (const s of list) {
    out[s] = {
      start: globalSlots?.[s]?.start || '07:00',
      end: globalSlots?.[s]?.end || '17:00',
    };
  }
  return out;
};

const parseHHMM = (hhmm) => {
  if (!hhmm || typeof hhmm !== 'string') return null;
  const [hh, mm] = hhmm.split(':').map((n) => parseInt(n, 10));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return hh * 60 + mm;
};

export const getAutoPaymentServiceForPublic = (now, eventSnapshot, locName, serviceSlots, cashCutScheduleByLocation = null) => {
  if (now.getDay() !== 0) return NO_SERVICE_LABEL;
  const gs = serviceSlots || {};
  const slotsMap = getCashCutScheduleForLocation(eventSnapshot, locName, gs, cashCutScheduleByLocation);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  for (const service of SERVICE_OPTIONS) {
    const slot = slotsMap[service];
    const start = parseHHMM(slot?.start);
    const end = parseHHMM(slot?.end);
    if (start == null || end == null) continue;
    if (nowMin >= start && nowMin < end) return service;
  }
  return NO_SERVICE_LABEL;
};

const getCardCommissionRate = (globalSnapshot) => {
  const raw = globalSnapshot?.cardCommissionRate ?? 0.04;
  const num = Number(raw) || 0;
  return num > 1 ? num / 100 : num;
};

/**
 * ¿El alta activa excedería cupo global o de sede? Misma base que `handleAddEntry` en App.jsx
 * (unidades de cupo + simulación del registro entrante; con cupo global activo no aplica tope por sede).
 */
function shouldRedirectPublicRegistrationToWaitlist(entry, loc, eventForCaps, participants) {
  const vnpCapHelpers = { canonicalizeVnpPersonId, generateVnpPersonId };
  const capSimulationRows = buildCapSimulationRows(entry, eventForCaps, loc, vnpCapHelpers);
  const incomingUnits = computeIncomingRegistrationCapUnits(capSimulationRows, participants, eventForCaps);
  const globalCap = Math.max(0, Number(eventForCaps?.eventTotalCap || 0));
  if (globalCap > 0) {
    const used = computeEventCapUsedUnits(participants, eventForCaps);
    return used + incomingUnits > globalCap;
  }
  const locCap = Number(eventForCaps?.locationCaps?.[loc] || 0);
  if (locCap > 0) {
    const usedLoc = computeEventCapUsedUnitsBySede(participants, eventForCaps)[loc] ?? 0;
    return usedLoc + incomingUnits > locCap;
  }
  return false;
}

export async function fetchParticipantsForEvent(eventId) {
  const q = query(getColRef('app_participants'), where('eventId', '==', eventId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Misma forma que `addLog` en App.jsx. Fallos no bloquean el alta. */
async function appendPublicRegistrationActivityLog({
  eventSnapshot,
  loc,
  personName,
  participantId,
  waitlist,
  initialPaidGross,
  paymentMethod,
  paymentService,
  isLiquidado,
  scholarshipPending,
  participantData = null,
}) {
  try {
    const createdAt = Date.now();
    const newLogId = buildLogId(createdAt);
    const name = String(personName || '').trim() || 'Sin nombre';
    const ev = eventSnapshot || {};
    let details;
    if (waitlist) {
      details = `Lista de espera: ${name} en sede ${loc}.`;
      if (scholarshipPending) details += ' Solicitud de beca pendiente de aprobación.';
    } else {
      const paid = Number(initialPaidGross) || 0;
      const pm = paymentMethod === 'Tarjeta' ? 'Tarjeta' : 'Efectivo';
      details = `Inscribió a ${name} en la sede ${loc} (formulario público).`;
      if (paymentService) details += ` Servicio: ${paymentService}.`;
      details += ` Pago inicial: $${paid} (${pm})${isLiquidado ? ' [LIQUIDADO]' : ''}.`;
    }
    // Snapshot completo del registro público (segunda fuente de verdad).
    let hasSnapshot = false;
    if (participantData) {
      const snapRes = await writeSnapshotDoc(newLogId, {
        entityType: 'participant',
        entityId: String(participantId),
        createdAt,
        snapshot: {
          kind: waitlist ? 'registro_publico_lista_espera' : 'registro_publico',
          eventId: ev.id || '',
          eventName: ev.name || '',
          loc,
          participant: participantData,
          bautizosCompanions: participantData.bautizosCompanions || [],
        },
      });
      hasSnapshot = snapRes.ok;
    }
    await setDoc(getDocRef('app_logs', String(newLogId)), withLogVisibleInPanel({
      id: newLogId,
      createdAt,
      eventId: ev.id || 'Global',
      eventName: ev.name || 'Evento',
      timestamp: new Date().toLocaleString('es-MX'),
      username: 'Registro público',
      action: 'Registro Público',
      details,
      revertInfo: {
        collectionName: 'app_participants',
        docId: String(participantId),
        action: 'create',
        previousData: null,
      },
      ...buildLogEntityFields({
        entityType: 'participant',
        entityId: String(participantId),
        status: 'ok',
        hasSnapshot,
      }),
    }));
    await appendParticipantActivityEntry({
      participantId: String(participantId),
      eventId: ev.id || '',
      actorUsername: 'Registro público',
      actorUserId: '',
      kind: waitlist ? 'lista_espera' : 'registro_publico',
      message: details,
    });
  } catch (e) {
    console.error('appendPublicRegistrationActivityLog', e);
  }
}

/**
 * Bautizos público: varios registros completos (uno por bautizado del grupo) con vínculos cruzados `p:`.
 * @param {'active' | 'waitlist'} mode
 */
async function submitPublicBautizosSplitRegistration({
  entry,
  loc,
  eventSnapshot,
  globalSnapshot,
  participants,
  currentPricing,
  mode,
}) {
  const splitDesc = getBautizosSplitPartySlotDescriptors(entry);
  if (!splitDesc?.length) {
    return {
      ok: false,
      error: [
        'Motivo: no se pudo definir el grupo de registros (titular + personas marcadas para bautizarse como acompañantes).',
        'Comprueba que cada acompañante que va a bautizarse tenga nombre y datos completos, o recarga el formulario.',
        'Si el problema continúa, contacta a la organización.',
      ].join('\n'),
    };
  }
  const vnpH = { canonicalizeVnpPersonId, generateVnpPersonId };
  const docIdBySlot = {};
  for (const d of splitDesc) {
    let pl0 = buildParticipantLikeForBautizosSplitSlot(entry, loc, d);
    if (d.slotKey !== 'host') pl0.age = calculateAgeFromBirthDate(pl0.birthDate || '') || '';
    const vnp0 = canonicalizeVnpPersonId(pl0.vnpPersonId || '') || generateVnpPersonId(pl0);
    docIdBySlot[d.slotKey] = await resolveParticipantDocumentIdForWrite(vnp0, eventSnapshot.id);
  }
  const splitErr = getBautizosSplitPartySubmitBlockingError({
    personLike: entry,
    loc,
    participants,
    eventId: eventSnapshot.id,
    docIdBySlotKey: docIdBySlot,
    canonicalizeVnpPersonId,
    generateVnpPersonId,
    participantBlocksDuplicateRegistration,
    phoneDuplicateInEvent,
    isPhoneShareFamilyAllowed,
    digitsOnlyPhone,
    calculateAgeFromBirthDate,
  });
  if (splitErr) {
    return {
      ok: false,
      error: [
        'Motivo: validación del grupo (varios registros por acompañantes bautizados).',
        '',
        splitErr,
      ].join('\n'),
    };
  }

  for (const d of splitDesc) {
    const g = await loadParticipantRegistrationWriteGate(docIdBySlot[d.slotKey], eventSnapshot.id);
    if (!g.ok) return { ok: false, error: g.error };
  }

  const publicRegisteredBy = resolvePublicRegisteredBy(entry);
  const serviceSlots = globalSnapshot?.serviceSlots;
  const paymentServiceBase = getAutoPaymentServiceForPublic(
    new Date(),
    eventSnapshot,
    loc,
    serviceSlots,
    globalSnapshot?.cashCutScheduleByLocation,
  );
  const regInstant = new Date();
  const regIso = regInstant.toISOString();
  const hostDocId = docIdBySlot.host;
  const baseRegisteredCost = getPersonCost(entry, currentPricing, eventSnapshot);
  const { selectedDiscountCampaignId: _sc, ...entryCore } = entry;

  const initialPaidGross = mode === 'active' ? parseFloat(entry.paid) || 0 : 0;
  let paymentMethod = mode === 'active' && entry.paymentMethod === 'Tarjeta' ? 'Tarjeta' : 'Efectivo';
  if (paymentMethod === 'Tarjeta' && !isCardPaymentAllowedForLocation(eventSnapshot, loc)) {
    paymentMethod = 'Efectivo';
  }
  const commissionRate = getCardCommissionRate(globalSnapshot);
  const commission = paymentMethod === 'Tarjeta' ? initialPaidGross * commissionRate : 0;
  const initialPaidNet = paymentMethod === 'Tarjeta' ? initialPaidGross - commission : initialPaidGross;
  const initialHistory =
    mode === 'active' && initialPaidGross > 0
      ? [
          {
            id: Date.now() + 1,
            date: regInstant.toLocaleString('es-MX'),
            recordedAt: regIso,
            amount: initialPaidGross,
            netAmount: initialPaidNet,
            method: paymentMethod,
            service: paymentServiceBase,
            reference: paymentMethod === 'Tarjeta' ? String(entry.cardReference || '').trim() : '',
            commission,
            registeredBy: publicRegisteredBy,
          },
        ]
      : [];

  let hostPersonDataForWa = null;

  for (let i = 0; i < splitDesc.length; i++) {
    const d = splitDesc[i];
    const isHost = d.slotKey === 'host';
    let pl = buildParticipantLikeForBautizosSplitSlot(entry, loc, d);
    if (!isHost) pl.age = calculateAgeFromBirthDate(pl.birthDate || '') || '';
    const candVnp = canonicalizeVnpPersonId(pl.vnpPersonId || '') || generateVnpPersonId(pl);
    const docIdW = docIdBySlot[d.slotKey];
    const idExistsW = participants.some((p) => String(p.vnpPersonId || '') === String(candVnp));
    const comps = buildSplitPartyCompanionsForSlot({
      personLike: entry,
      loc,
      targetSlotKey: d.slotKey,
      docIdBySlotKey: docIdBySlot,
      vnpCompanionHelpers: vnpH,
    });

    if (isHost) {
      const personDataH = {
        ...entryCore,
        id: docIdW,
        status: mode,
        registeredAt: regIso,
        registeredBy: publicRegisteredBy,
        vnpPersonId: candVnp,
        isFirstVnpId: !idExistsW,
        location: loc,
        travelFrom: entry.travelFrom || loc,
        travelTo: entry.travelTo || loc,
        eventId: eventSnapshot.id,
        paymentHistory: mode === 'active' ? initialHistory : [],
        registeredCost: baseRegisteredCost,
        registeredCostManual: false,
        campAssignment: '',
        paid: mode === 'active' ? initialPaidGross : 0,
        paidNet: mode === 'active' ? initialPaidNet : 0,
        paymentMethod,
        paymentService: paymentServiceBase,
        cardReference: mode === 'active' && paymentMethod === 'Tarjeta' ? String(entry.cardReference || '').trim() : '',
        whatsAppFinanceNotifications: [],
        responsivaStatus: resolveResponsivaStatus(entry, eventSnapshot),
        scholarshipPendingApproval: false,
        scholarshipType: 'none',
        scholarshipPartialAmount: 0,
        discountCampaignId: '',
        discountCampaignConcept: '',
        discountCampaignAppliedAt: null,
        refundPendingAmount: 0,
        refundPendingReason: '',
      };
      if (mode === 'waitlist') {
        personDataH.waitlistCreatedAt = Date.now();
      }
      personDataH.isScholarship = 'No';
      personDataH.isServer = 'No';
      personDataH.serverAssignment = '';
      personDataH.ambosServeInSegment = '';
      personDataH.attendanceSpecialType = ATTENDANCE_SPECIAL.ninguno;
      personDataH.carrosLlegada = normalizeArrivalCarCount(personDataH.carrosLlegada);
      if (resolveLlegaEnCarroPricing(personDataH)) personDataH.wantsBautizosTransport = 'No';
      personDataH.bautizosAttendanceType = normalizeBautizosAttendanceType(personDataH.bautizosAttendanceType);
      personDataH.bautizosCompanions = comps;
      const btH = normalizeBautizosAttendanceType(personDataH.bautizosAttendanceType);
      personDataH.willBeBaptized = bautizosWillBeBaptizedFromAttendance(btH);
      personDataH.baptismSegment = '';
      personDataH.baptismShirtSize = normalizeBaptismShirtSize(entry.baptismShirtSize);
      applyParticipantNameFormattingForSave(personDataH);
      if (mode === 'active') {
        const liqPub = Number(getLiquidationTarget(personDataH, currentPricing, eventSnapshot)) || 0;
        const isLiquidado = personDataH.isScholarship === 'No' && initialPaidGross >= liqPub;
        const registerCreatedAt = Date.now() + i;
        const pendingAfterReg = Math.max(liqPub - initialPaidGross, 0);
        personDataH.whatsAppFinanceNotifications = [
          {
            id: `wa-reg-${registerCreatedAt}`,
            kind: 'registro',
            amount: initialPaidGross,
            pendingAmount: pendingAfterReg,
            isLiquidado,
            liquidationTarget: liqPub,
            createdAt: registerCreatedAt,
            sent: false,
            sentAt: null,
            message: buildFinanceWhatsAppMessage({
              person: personDataH,
              loc,
              amount: initialPaidGross,
              pendingAmount: pendingAfterReg,
              isLiquidado,
              kind: 'registro',
              reportedAtMs: registerCreatedAt,
              liquidationTarget: liqPub,
              eventSnapshot,
              rosterParticipants: participants,
            }),
          },
        ];
      }
      await setDoc(
        getDocRef('app_participants', docIdW),
        sanitizeParticipantConsentForFirestoreWrite(personDataH)
      );
      hostPersonDataForWa = personDataH;

      await appendPublicRegistrationActivityLog({
        eventSnapshot,
        loc,
        personName: personDataH.name,
        participantId: docIdW,
        waitlist: mode === 'waitlist',
        initialPaidGross: mode === 'active' ? initialPaidGross : 0,
        paymentMethod,
        paymentService: paymentServiceBase,
        isLiquidado:
          mode === 'active'
            ? personDataH.isScholarship === 'No' &&
              initialPaidGross >= (Number(getLiquidationTarget(personDataH, currentPricing, eventSnapshot)) || 0)
            : false,
        scholarshipPending: false,
        participantData: { id: docIdW, ...personDataH },
      });
    } else {
      const { selectedDiscountCampaignId: _sat, ...coreSat } = pl;
      const personDataS = {
        ...coreSat,
        id: docIdW,
        status: mode,
        registeredAt: regIso,
        registeredBy: publicRegisteredBy,
        vnpPersonId: candVnp,
        isFirstVnpId: !idExistsW,
        location: loc,
        travelFrom: pl.travelFrom || loc,
        travelTo: pl.travelTo || loc,
        eventId: eventSnapshot.id,
        paymentHistory: [],
        paid: 0,
        paidNet: 0,
        paymentMethod: 'Efectivo',
        paymentService: getAutoPaymentServiceForPublic(
          new Date(),
          eventSnapshot,
          loc,
          serviceSlots,
          globalSnapshot?.cashCutScheduleByLocation,
        ),
        cardReference: '',
        whatsAppFinanceNotifications: [],
        responsivaStatus: resolveResponsivaStatus(pl, eventSnapshot),
        scholarshipPendingApproval: false,
        scholarshipType: 'none',
        scholarshipPartialAmount: 0,
        discountCampaignId: '',
        discountCampaignConcept: '',
        discountCampaignAppliedAt: null,
        refundPendingAmount: 0,
        refundPendingReason: '',
        registeredCostManual: true,
        registeredCost: 0,
        bautizosSplitPartyHostParticipantId: hostDocId,
        campAssignment: '',
      };
      if (mode === 'waitlist') {
        personDataS.waitlistCreatedAt = Date.now();
      }
      personDataS.isScholarship = 'No';
      personDataS.isServer = 'No';
      personDataS.serverAssignment = '';
      personDataS.ambosServeInSegment = '';
      personDataS.attendanceSpecialType = ATTENDANCE_SPECIAL.ninguno;
      personDataS.carrosLlegada = normalizeArrivalCarCount(personDataS.carrosLlegada);
      if (resolveLlegaEnCarroPricing(personDataS)) personDataS.wantsBautizosTransport = 'No';
      personDataS.bautizosAttendanceType = BAUTIZOS_ATTENDANCE.bautizado;
      personDataS.bautizosCompanions = comps;
      personDataS.willBeBaptized = SI;
      personDataS.baptismSegment = '';
      personDataS.baptismShirtSize = normalizeBaptismShirtSize(entry.baptismShirtSize);
      applyParticipantNameFormattingForSave(personDataS);
      await setDoc(
        getDocRef('app_participants', docIdW),
        sanitizeParticipantConsentForFirestoreWrite(personDataS)
      );
    }
  }

  if (familyHasAnyCarTransport(entry, entry.bautizosCompanions)) {
    const hostCompsForCar = buildSplitPartyCompanionsForSlot({
      personLike: entry,
      loc,
      targetSlotKey: 'host',
      docIdBySlotKey: docIdBySlot,
      vnpCompanionHelpers: vnpH,
    });
    const carPatches = buildCarMetaPatchesAfterSave({
      hostPerson: { ...entry, id: hostDocId },
      companions: hostCompsForCar,
      plan: eventSnapshot.transportPlanning,
      draftMetaByVehicleKey: entry.draftCarMetaByVehicleKey || {},
      hostId: hostDocId,
    });
    if (carPatches.length) {
      await persistEventCarMetaPatches({
        eventId: eventSnapshot.id,
        patches: carPatches,
        currentPlan: eventSnapshot.transportPlanning,
        getDocRef,
        updateDoc,
      });
    }
  }

  let responsivaSignUrl = '';
  if (mode === 'active' && hostPersonDataForWa) {
    try {
      const ageBracket = participantAgeBracketForResponsiva(parseInt(hostPersonDataForWa?.age, 10));
      const canSignNow =
        ageBracket === 'adult' &&
        hostPersonDataForWa.responsivaStatus !== 'Entregada' &&
        isResponsivaDigitalActiveForParticipant(hostPersonDataForWa, eventSnapshot);
      if (canSignNow) {
        const token = await createResponsivaSignTokenDoc({
          participantId: hostDocId,
          eventId: eventSnapshot.id,
          person: hostPersonDataForWa,
        });
        responsivaSignUrl = token?.signUrl || '';
      }
    } catch (e) {
      console.warn('public responsiva sign token (split)', e);
    }
  }

  return {
    ok: true,
    participantId: hostDocId,
    responsivaSignUrl,
    waitlist: mode === 'waitlist',
  };
}

/**
 * Registro público (misma forma que handleAddEntry / handleAddToWaitlist en App.jsx).
 */
export async function submitPublicRegistration({
  rawEntry,
  loc,
  eventSnapshot,
  globalSnapshot,
  optionalVisibility,
  participants,
}) {
  const evType = eventSnapshot?.eventType || 'General';
  const minDep = eventSnapshot?.minDeposit || 0;
  const currentPricing = getPricingFromSnapshot(eventSnapshot);

  const entryRaw = applyOptionalVisibilityDefaults({ ...rawEntry, location: loc }, optionalVisibility, eventSnapshot);
  const editorFieldVis = buildEditorRegistrationFieldVisFromSnapshots(globalSnapshot, eventSnapshot);
  const privacyContext = {
    privacyAccepted: !!rawEntry.privacyAccepted,
    sensitiveConsent: rawEntry.sensitiveDataConsent,
    requirePrivacy: false,
    allowSensitiveWithoutConsent: true,
  };
  const issues = getPublicRegistrationFormIssues(
    entryRaw,
    minDep,
    evType,
    currentPricing,
    optionalVisibility,
    eventSnapshot,
    editorFieldVis,
    privacyContext
  );
  if (issues.length) {
    return {
      ok: false,
      error: [
        'Motivo: la validación del servidor encontró problemas con los datos enviados (por ejemplo requisitos del evento o incoherencias).',
        '',
        issues.map((t, i) => `${i + 1}. ${t}`).join('\n'),
      ].join('\n'),
    };
  }

  const privacyNotice = mergePrivacyNoticeConfig(globalSnapshot?.privacyNotice);
  let entry = applyRegistrationConsentPolicy(entryRaw, {
    privacyNotice,
    privacyAccepted: !!rawEntry.privacyAccepted,
    sensitiveConsent: rawEntry.sensitiveDataConsent,
    channel: 'public_self',
  });
  delete entry.privacyAccepted;

  const personOfInterestBlock = await assertRegistrationNotPersonOfInterest(entry, evType, {
    generateVnpPersonId,
    buildParticipantLikeForBautizosSplitSlot,
    getBautizosSplitPartySlotDescriptors,
    hasBautizosBaptizedCompanionInParty,
    canMarkPersonsOfInterest: false,
  });
  if (personOfInterestBlock) {
    return { ok: false, error: personOfInterestBlock };
  }

  const regStatus = eventSnapshot?.regStatus || {};
  if (regStatus[loc] === false) {
    return {
      ok: false,
      error: [
        'Motivo: la organización cerró las inscripciones para la sede que elegiste.',
        `• Sede: ${loc || '(sin nombre)'}`,
        '',
        'Intenta otra sede si el evento la tiene habilitada, o contacta directamente a la organización.',
      ].join('\n'),
    };
  }

  let eventForCaps = eventSnapshot;
  try {
    const evSnap = await getDoc(getDocRef('app_events', String(eventSnapshot.id)));
    if (evSnap.exists()) {
      eventForCaps = { ...eventSnapshot, ...evSnap.data() };
    }
  } catch {
    /* usar solo snapshot del enlace */
  }

  const isCampa = evType === 'Campa';
  if (isCampa && isSiValue(entry.isScholarship)) {
    return submitWaitlist({
      rawEntry: entry,
      loc,
      eventSnapshot: eventForCaps,
      globalSnapshot,
      optionalVisibility,
      participants,
    });
  }

  if (shouldRedirectPublicRegistrationToWaitlist(entry, loc, eventForCaps, participants)) {
    return submitWaitlist({
      rawEntry: entry,
      loc,
      eventSnapshot: eventForCaps,
      globalSnapshot,
      optionalVisibility,
      participants,
    });
  }

  if (evType === 'Bautizos' && hasBautizosBaptizedCompanionInParty(entry)) {
    return submitPublicBautizosSplitRegistration({
      entry,
      loc,
      eventSnapshot,
      globalSnapshot,
      participants,
      currentPricing,
      mode: 'active',
    });
  }

  const phoneDigits = digitsOnlyPhone(entry.phone);
  const vnpId = canonicalizeVnpPersonId(entry.vnpPersonId || '');
  const candidateVnpId = vnpId || generateVnpPersonId(entry);
  const docId = await resolveParticipantDocumentIdForWrite(candidateVnpId, eventSnapshot.id);

  const phoneBlocker = findPhoneDuplicateBlocker(
    entry.name,
    phoneDigits,
    participants,
    eventSnapshot.id,
    docId,
    entry.age,
    !!entry.allowSharedMainPhone
  );
  if (phoneBlocker) {
    return {
      ok: false,
      error: buildPublicPhoneDuplicateBlockedMessage(phoneBlocker, { allowSharedMainPhone: !!entry.allowSharedMainPhone }),
    };
  }

  const idExistsAnywhere = participants.some((p) => String(p.vnpPersonId || '') === String(candidateVnpId));
  const vnpBlocker = participants.find(
    (p) =>
      p.eventId === eventSnapshot.id &&
      participantBlocksDuplicateRegistration(p) &&
      String(p.vnpPersonId || '') === String(candidateVnpId)
  );
  if (vnpBlocker) {
    return {
      ok: false,
      error: buildPublicVnpDuplicateBlockedMessage(vnpBlocker),
    };
  }

  const vnpCompanionHelpersPub = { canonicalizeVnpPersonId, generateVnpPersonId };
  let normalizedBautizosCompanionsPub = null;
  if (evType === 'Bautizos') {
    normalizedBautizosCompanionsPub = normalizeBautizosCompanionsForPersist(entry, loc, vnpCompanionHelpersPub);
    const compErrPub = getBautizosBaptizedCompanionSubmitBlockingError({
      hostEntry: entry,
      hostDocId: docId,
      normalizedCompanions: normalizedBautizosCompanionsPub,
      participants,
      eventId: eventSnapshot.id,
      excludeParticipantId: undefined,
      canonicalizeVnpPersonId,
      generateVnpPersonId,
      participantBlocksDuplicateRegistration,
      phoneDuplicateInEvent,
      isPhoneShareFamilyAllowed,
      digitsOnlyPhone,
      calculateAgeFromBirthDate,
    });
    if (compErrPub) {
      return {
        ok: false,
        error: [
          'Motivo: no se cumplen las reglas de teléfono o duplicados para un acompañante marcado como bautizado.',
          '',
          compErrPub,
        ].join('\n'),
      };
    }
  }

  const gate = await loadParticipantRegistrationWriteGate(docId, eventSnapshot.id);
  if (!gate.ok) {
    return { ok: false, error: gate.error };
  }
  const initialPaidGross = parseFloat(entry.paid) || 0;
  let paymentMethod = entry.paymentMethod === 'Tarjeta' ? 'Tarjeta' : 'Efectivo';
  if (paymentMethod === 'Tarjeta' && !isCardPaymentAllowedForLocation(eventSnapshot, loc)) {
    paymentMethod = 'Efectivo';
  }
  const serviceSlots = globalSnapshot?.serviceSlots;
  const paymentService = getAutoPaymentServiceForPublic(
    new Date(),
    eventSnapshot,
    loc,
    serviceSlots,
    globalSnapshot?.cashCutScheduleByLocation,
  );
  const commissionRate = getCardCommissionRate(globalSnapshot);
  const commission = paymentMethod === 'Tarjeta' ? initialPaidGross * commissionRate : 0;
  const initialPaidNet = paymentMethod === 'Tarjeta' ? initialPaidGross - commission : initialPaidGross;

  const regInstant = new Date();
  const regIso = regInstant.toISOString();
  const publicRegisteredBy = resolvePublicRegisteredBy(entry);
  const initialHistory =
    initialPaidGross > 0
      ? [
          {
            id: Date.now() + 1,
            date: regInstant.toLocaleString('es-MX'),
            recordedAt: regIso,
            amount: initialPaidGross,
            netAmount: initialPaidNet,
            method: paymentMethod,
            service: paymentService,
            reference: paymentMethod === 'Tarjeta' ? String(entry.cardReference || '').trim() : '',
            commission,
            registeredBy: publicRegisteredBy,
          },
        ]
      : [];

  const baseRegisteredCost = getPersonCost(entry, currentPricing, eventSnapshot);
  const skipCampaignForAttendance = isCampa && isFreeAttendanceType(entry.attendanceSpecialType);
  const skipCampaignNonCampaPricing = evType === 'Bautizos';
  const matchedCampaign = skipCampaignForAttendance || skipCampaignNonCampaPricing ? null : resolveMatchedCampaignForNewEntry(entry, eventSnapshot);
  if (entry.selectedDiscountCampaignId && !skipCampaignForAttendance && !skipCampaignNonCampaPricing && !matchedCampaign) {
    return {
      ok: false,
      error: [
        'Motivo: la campaña de descuento seleccionada no aplica a tu perfil o a los datos que capturaste.',
        'Revisa la selección en el formulario, elige «automática» si existe, o quita la campaña.',
      ].join('\n'),
    };
  }
  const registeredCost = skipCampaignForAttendance || skipCampaignNonCampaPricing
    ? baseRegisteredCost
    : matchedCampaign
      ? Math.max(0, Number(matchedCampaign.finalAmount) || 0)
      : baseRegisteredCost;
  const { selectedDiscountCampaignId: _sel, ...entryCore } = entry;

  const initialCampAssignment =
    isCampa && !isSiValue(entry.isServer) ? (parseInt(entry.age, 10) < 18 ? 'Teens' : 'Jóvenes') : '';

  const finalVnpPersonId = candidateVnpId;

  const personData = {
    ...entryCore,
    id: docId,
    status: 'active',
    registeredAt: regIso,
    registeredBy: publicRegisteredBy,
    vnpPersonId: finalVnpPersonId,
    isFirstVnpId: !idExistsAnywhere,
    location: loc,
    travelFrom: entry.travelFrom || loc,
    travelTo: entry.travelTo || loc,
    eventId: eventSnapshot.id,
    paymentHistory: initialHistory,
    registeredCost,
    registeredCostManual: false,
    campAssignment: initialCampAssignment,
    paid: initialPaidGross,
    paidNet: initialPaidNet,
    paymentMethod,
    paymentService,
    cardReference: paymentMethod === 'Tarjeta' ? String(entry.cardReference || '').trim() : '',
    whatsAppFinanceNotifications: [],
    responsivaStatus: resolveResponsivaStatus(entry, eventSnapshot),
    scholarshipPendingApproval: false,
    scholarshipType: 'none',
    scholarshipPartialAmount: 0,
    discountCampaignId: matchedCampaign?.id || '',
    discountCampaignConcept: matchedCampaign?.concept || '',
    discountCampaignAppliedAt: matchedCampaign ? Date.now() : null,
    refundPendingAmount: 0,
    refundPendingReason: '',
  };

  if (evType === 'Bautizos') {
    personData.carrosLlegada = normalizeArrivalCarCount(personData.carrosLlegada);
    if (resolveLlegaEnCarroPricing(personData)) personData.wantsBautizosTransport = 'No';
    personData.bautizosAttendanceType = normalizeBautizosAttendanceType(personData.bautizosAttendanceType);
    personData.bautizosCompanions =
      normalizedBautizosCompanionsPub || normalizeBautizosCompanionsForPersist(personData, loc, vnpCompanionHelpersPub);
    const bType = normalizeBautizosAttendanceType(personData.bautizosAttendanceType);
    personData.willBeBaptized = bautizosWillBeBaptizedFromAttendance(bType);
    personData.baptismSegment = '';
    Object.assign(
      personData,
      syncBautizosAttendanceServerFields({
        ...personData,
        isServer: entry.isServer ?? personData.isServer,
      })
    );
  }

  if (isCampa) {
    personData.willBeBaptized = isSiValue(entry.willBeBaptized) ? SI : 'No';
    if (!isSiValue(personData.willBeBaptized) || !isSiValue(entry.isServer) || entry.serverAssignment !== 'Ambos') {
      personData.baptismSegment = '';
    } else {
      personData.baptismSegment = String(entry.baptismSegment || '').trim();
    }
    if (skipCampaignForAttendance) {
      personData.isScholarship = 'No';
      personData.scholarshipType = 'none';
      personData.scholarshipPartialAmount = 0;
      personData.attendanceSpecialType = entry.attendanceSpecialType;
    }
  } else if (evType !== 'Bautizos') {
    personData.willBeBaptized = 'No';
    personData.baptismSegment = '';
  }

  if (!isCampa) {
    personData.isScholarship = 'No';
    if (evType !== 'Bautizos') {
      personData.isServer = 'No';
      personData.serverAssignment = '';
      personData.ambosServeInSegment = '';
    }
    personData.attendanceSpecialType = ATTENDANCE_SPECIAL.ninguno;
    if (evType !== 'Bautizos') {
      personData.canSwim = 'No';
      personData.hasAllergy = 'No';
      personData.hasDisease = 'No';
      personData.hasDisability = 'No';
    }
  }

  if (evType === 'Bautizos' && familyHasAnyCarTransport(personData, personData.bautizosCompanions)) {
    const carIssues = getFamilyCarInventoryValidationIssues(
      buildMergedFamilyCarInventory({
        hostPerson: personData,
        companions: personData.bautizosCompanions,
        plan: eventSnapshot.transportPlanning,
        hostSourceKey: 'p:draft-host',
        draftMetaByVehicleKey: entry.draftCarMetaByVehicleKey || rawEntry.draftCarMetaByVehicleKey || {},
      }),
      { hostPerson: personData, companions: personData.bautizosCompanions }
    );
    if (carIssues.length) {
      return {
        ok: false,
        error: [
          'Motivo: cada rubro del vehículo y la tripulación son obligatorios. Si aún no tiene el dato, márquelo como pendiente.',
          '',
          carIssues.map((t, i) => `${i + 1}. ${t}`).join('\n'),
        ].join('\n'),
      };
    }
  }

  applyParticipantNameFormattingForSave(personData);
  const liqPub = Number(getLiquidationTarget(personData, currentPricing, eventSnapshot)) || 0;
  const isLiquidado = personData.isScholarship === 'No' && initialPaidGross >= liqPub;
  const registerCreatedAt = Date.now();
  const pendingAfterReg = Math.max(liqPub - initialPaidGross, 0);
  const registerNotification = {
    id: `wa-reg-${registerCreatedAt}`,
    kind: 'registro',
    amount: initialPaidGross,
    pendingAmount: pendingAfterReg,
    isLiquidado,
    liquidationTarget: liqPub,
    createdAt: registerCreatedAt,
    sent: false,
    sentAt: null,
    message: buildFinanceWhatsAppMessage({
      person: personData,
      loc,
      amount: initialPaidGross,
      pendingAmount: pendingAfterReg,
      isLiquidado,
      kind: 'registro',
      reportedAtMs: registerCreatedAt,
      liquidationTarget: liqPub,
      eventSnapshot,
      rosterParticipants: participants,
    }),
  };
  const prevWaPub = Array.isArray(personData.whatsAppFinanceNotifications)
    ? [...personData.whatsAppFinanceNotifications]
    : [];
  personData.whatsAppFinanceNotifications = [...prevWaPub, registerNotification];
  await setDoc(
    getDocRef('app_participants', docId),
    sanitizeParticipantConsentForFirestoreWrite(personData)
  );
  if (evType === 'Bautizos' && familyHasAnyCarTransport(personData, personData.bautizosCompanions)) {
    const carPatches = buildCarMetaPatchesAfterSave({
      hostPerson: personData,
      companions: personData.bautizosCompanions,
      plan: eventSnapshot.transportPlanning,
      draftMetaByVehicleKey: entry.draftCarMetaByVehicleKey || rawEntry.draftCarMetaByVehicleKey || {},
      hostId: docId,
    });
    if (carPatches.length) {
      await persistEventCarMetaPatches({
        eventId: eventSnapshot.id,
        patches: carPatches,
        currentPlan: eventSnapshot.transportPlanning,
        getDocRef,
        updateDoc,
      });
    }
  }
  await appendParticipantActivityEntry({
    participantId: docId,
    eventId: eventSnapshot.id,
    actorUsername: publicRegisteredBy,
    kind: 'privacidad',
    message: buildRegistrationPrivacyActivityMessage(
      privacyNotice,
      !!personData.privacyNoticeAcceptedAt,
      personData.sensitiveDataConsent
    ),
  });

  await appendPublicRegistrationActivityLog({
    eventSnapshot,
    loc,
    personName: personData.name,
    participantId: docId,
    waitlist: false,
    initialPaidGross,
    paymentMethod,
    paymentService,
    isLiquidado,
    scholarshipPending: false,
    participantData: { id: docId, ...personData },
  });

  let responsivaSignUrl = '';
  try {
    const ageBracket = participantAgeBracketForResponsiva(parseInt(personData?.age, 10));
    const canSignNow =
      ageBracket === 'adult' &&
      personData.responsivaStatus !== 'Entregada' &&
      isResponsivaDigitalActiveForParticipant(personData, eventSnapshot);
    if (canSignNow) {
      const token = await createResponsivaSignTokenDoc({
        participantId: docId,
        eventId: eventSnapshot.id,
        person: personData,
      });
      responsivaSignUrl = token?.signUrl || '';
    }
  } catch (e) {
    console.warn('public responsiva sign token', e);
  }

  return { ok: true, participantId: docId, responsivaSignUrl };
}

async function submitWaitlist({
  rawEntry,
  loc,
  eventSnapshot,
  globalSnapshot,
  optionalVisibility,
  participants,
}) {
  const evType = eventSnapshot?.eventType || 'General';
  const minDep = 0;
  const currentPricing = getPricingFromSnapshot(eventSnapshot);
  const entry = applyOptionalVisibilityDefaults({ ...rawEntry, location: loc }, optionalVisibility, eventSnapshot);
  const editorFieldVis = buildEditorRegistrationFieldVisFromSnapshots(globalSnapshot, eventSnapshot);
  const privacyContext = {
    privacyAccepted: !!(rawEntry.privacyNoticeAcceptedAt || rawEntry.privacyAccepted),
    sensitiveConsent: rawEntry.sensitiveDataConsent,
    requirePrivacy: false,
    allowSensitiveWithoutConsent: true,
  };
  const issues = getPublicRegistrationFormIssues(
    { ...entry, paid: entry.paid || 0 },
    minDep,
    evType,
    currentPricing,
    optionalVisibility,
    eventSnapshot,
    editorFieldVis,
    privacyContext
  );
  if (issues.length) {
    return {
      ok: false,
      error: [
        'Motivo: la validación del servidor encontró problemas con los datos enviados (lista de espera).',
        '',
        issues.map((t, i) => `${i + 1}. ${t}`).join('\n'),
      ].join('\n'),
    };
  }

  if (evType === 'Bautizos' && hasBautizosBaptizedCompanionInParty(entry)) {
    return submitPublicBautizosSplitRegistration({
      entry,
      loc,
      eventSnapshot,
      globalSnapshot,
      participants,
      currentPricing,
      mode: 'waitlist',
    });
  }

  const phoneDigits = digitsOnlyPhone(entry.phone);
  const finalVnpPersonId = canonicalizeVnpPersonId(entry.vnpPersonId || '') || generateVnpPersonId(entry);
  const docId = await resolveParticipantDocumentIdForWrite(finalVnpPersonId, eventSnapshot.id);

  const phoneBlockerWl = findPhoneDuplicateBlocker(
    entry.name,
    phoneDigits,
    participants,
    eventSnapshot.id,
    docId,
    entry.age,
    !!entry.allowSharedMainPhone
  );
  if (phoneBlockerWl) {
    return {
      ok: false,
      error: buildPublicPhoneDuplicateBlockedMessage(phoneBlockerWl, { allowSharedMainPhone: !!entry.allowSharedMainPhone }),
    };
  }

  const idExistsAnywhere = participants.some((p) => String(p.vnpPersonId || '') === String(finalVnpPersonId));
  const vnpBlockerWl = participants.find(
    (p) =>
      p.eventId === eventSnapshot.id &&
      participantBlocksDuplicateRegistration(p) &&
      String(p.vnpPersonId || '') === String(finalVnpPersonId)
  );
  if (vnpBlockerWl) {
    return {
      ok: false,
      error: buildPublicVnpDuplicateBlockedMessage(vnpBlockerWl),
    };
  }

  const vnpCompanionHelpersWl = { canonicalizeVnpPersonId, generateVnpPersonId };
  let normalizedBautizosCompanionsWl = null;
  if (evType === 'Bautizos') {
    normalizedBautizosCompanionsWl = normalizeBautizosCompanionsForPersist(entry, loc, vnpCompanionHelpersWl);
    const compErrWl = getBautizosBaptizedCompanionSubmitBlockingError({
      hostEntry: entry,
      hostDocId: docId,
      normalizedCompanions: normalizedBautizosCompanionsWl,
      participants,
      eventId: eventSnapshot.id,
      excludeParticipantId: undefined,
      canonicalizeVnpPersonId,
      generateVnpPersonId,
      participantBlocksDuplicateRegistration,
      phoneDuplicateInEvent,
      isPhoneShareFamilyAllowed,
      digitsOnlyPhone,
      calculateAgeFromBirthDate,
    });
    if (compErrWl) {
      return {
        ok: false,
        error: [
          'Motivo: no se cumplen las reglas de teléfono o duplicados para un acompañante marcado como bautizado (lista de espera).',
          '',
          compErrWl,
        ].join('\n'),
      };
    }
  }

  const gateWl = await loadParticipantRegistrationWriteGate(docId, eventSnapshot.id);
  if (!gateWl.ok) {
    return { ok: false, error: gateWl.error };
  }
  const previousWlPub = gateWl.snap?.exists() ? gateWl.snap.data() : null;
  const prevWlWaPubWaitlist = Array.isArray(previousWlPub?.whatsAppFinanceNotifications)
    ? [...previousWlPub.whatsAppFinanceNotifications]
    : [];

  const initialCampAssignment =
    evType === 'Campa' && !isSiValue(entry.isServer) ? (parseInt(entry.age, 10) < 18 ? 'Teens' : 'Jóvenes') : '';

  const baseRegisteredCost = getPersonCost(entry, currentPricing, eventSnapshot);
  const skipCampaignWl = evType === 'Campa' && isFreeAttendanceType(entry.attendanceSpecialType);
  const skipCampaignBautizosWl = evType === 'Bautizos';
  const matchedCampaign = skipCampaignWl || skipCampaignBautizosWl ? null : resolveMatchedCampaignForNewEntry(entry, eventSnapshot);
  if (entry.selectedDiscountCampaignId && !skipCampaignWl && !skipCampaignBautizosWl && !matchedCampaign) {
    return {
      ok: false,
      error: [
        'Motivo: la campaña de descuento seleccionada no aplica a tu perfil para lista de espera.',
        'Revisa la selección o deja la campaña que propone el sistema.',
      ].join('\n'),
    };
  }
  const { selectedDiscountCampaignId: _w, ...entryCore } = entry;
  const serviceSlots = globalSnapshot?.serviceSlots;

  const personData = {
    ...entryCore,
    id: docId,
    status: 'waitlist',
    registeredBy: resolvePublicRegisteredBy(entry),
    waitlistCreatedAt: Date.now(),
    vnpPersonId: finalVnpPersonId,
    isFirstVnpId: !idExistsAnywhere,
    location: loc,
    travelFrom: entry.travelFrom || loc,
    travelTo: entry.travelTo || loc,
    eventId: eventSnapshot.id,
    paymentHistory: [],
    paid: 0,
    paidNet: 0,
    paymentMethod: 'Efectivo',
    paymentService: getAutoPaymentServiceForPublic(
      new Date(),
      eventSnapshot,
      loc,
      serviceSlots,
      globalSnapshot?.cashCutScheduleByLocation,
    ),
    cardReference: '',
    whatsAppFinanceNotifications: prevWlWaPubWaitlist,
    responsivaStatus: resolveResponsivaStatus(entry, eventSnapshot),
    campAssignment: initialCampAssignment,
    registeredCost: skipCampaignWl || skipCampaignBautizosWl
      ? baseRegisteredCost
      : matchedCampaign
        ? Math.max(0, Number(matchedCampaign.finalAmount) || 0)
        : baseRegisteredCost,
    registeredCostManual: false,
    discountCampaignId: matchedCampaign?.id || '',
    discountCampaignConcept: matchedCampaign?.concept || '',
    discountCampaignAppliedAt: matchedCampaign ? Date.now() : null,
    refundPendingAmount: 0,
    refundPendingReason: '',
  };

  if (evType === 'Campa') {
    personData.willBeBaptized = isSiValue(entry.willBeBaptized) ? SI : 'No';
    if (!isSiValue(personData.willBeBaptized) || !isSiValue(entry.isServer) || entry.serverAssignment !== 'Ambos') {
      personData.baptismSegment = '';
    } else {
      personData.baptismSegment = String(entry.baptismSegment || '').trim();
    }
  } else if (evType !== 'Bautizos') {
    personData.willBeBaptized = 'No';
    personData.baptismSegment = '';
  }

  if (evType !== 'Campa') {
    personData.isScholarship = 'No';
    if (evType !== 'Bautizos') {
      personData.isServer = 'No';
      personData.serverAssignment = '';
      personData.ambosServeInSegment = '';
    }
    personData.attendanceSpecialType = ATTENDANCE_SPECIAL.ninguno;
    if (evType !== 'Bautizos') {
      personData.canSwim = 'No';
      personData.hasAllergy = 'No';
      personData.hasDisease = 'No';
      personData.hasDisability = 'No';
    }
  }

  if (evType === 'Campa' && isSiValue(entry.isScholarship)) {
    personData.scholarshipPendingApproval = true;
    personData.scholarshipType = entry.scholarshipType === 'partial' ? 'partial' : 'total';
    personData.scholarshipPartialAmount =
      entry.scholarshipType === 'partial' ? parseFloat(entry.scholarshipPartialAmount || 0) : 0;
  } else {
    personData.scholarshipPendingApproval = false;
    personData.scholarshipType = 'none';
    personData.scholarshipPartialAmount = 0;
  }

  if (evType === 'Bautizos') {
    personData.carrosLlegada = normalizeArrivalCarCount(personData.carrosLlegada);
    if (resolveLlegaEnCarroPricing(personData)) personData.wantsBautizosTransport = 'No';
    personData.bautizosAttendanceType = normalizeBautizosAttendanceType(personData.bautizosAttendanceType);
    personData.bautizosCompanions =
      normalizedBautizosCompanionsWl || normalizeBautizosCompanionsForPersist(personData, loc, vnpCompanionHelpersWl);
    const bTypeWl = normalizeBautizosAttendanceType(personData.bautizosAttendanceType);
    personData.willBeBaptized = bautizosWillBeBaptizedFromAttendance(bTypeWl);
    personData.baptismSegment = '';
    Object.assign(
      personData,
      syncBautizosAttendanceServerFields({
        ...personData,
        isServer: entry.isServer ?? personData.isServer,
      })
    );
  }

  applyParticipantNameFormattingForSave(personData);
  if (evType === 'Campa' && isSiValue(entry.isScholarship)) {
    const now = Date.now();
    personData.whatsAppFinanceNotifications = [
      ...prevWlWaPubWaitlist,
      {
        id: `wa-bpd-${now}`,
        kind: 'beca_pendiente_aprobacion',
        amount: 0,
        pendingAmount: Math.max(Number(getLiquidationTarget(personData, currentPricing, eventSnapshot)) || 0, 0),
        isLiquidado: false,
        createdAt: now,
        sent: false,
        sentAt: null,
        message: buildScholarshipPendingWhatsAppMessage({
          person: personData,
          loc,
          reportedAtMs: now,
          eventSnapshot,
        }),
      },
    ];
  }
  await setDoc(
    getDocRef('app_participants', docId),
    sanitizeParticipantConsentForFirestoreWrite(personData)
  );
  if (evType === 'Bautizos' && familyHasAnyCarTransport(personData, personData.bautizosCompanions)) {
    const carPatches = buildCarMetaPatchesAfterSave({
      hostPerson: personData,
      companions: personData.bautizosCompanions,
      plan: eventSnapshot.transportPlanning,
      draftMetaByVehicleKey: entry.draftCarMetaByVehicleKey || rawEntry.draftCarMetaByVehicleKey || {},
      hostId: docId,
    });
    if (carPatches.length) {
      await persistEventCarMetaPatches({
        eventId: eventSnapshot.id,
        patches: carPatches,
        currentPlan: eventSnapshot.transportPlanning,
        getDocRef,
        updateDoc,
      });
    }
  }
  await appendPublicRegistrationActivityLog({
    eventSnapshot,
    loc,
    personName: personData.name,
    participantId: docId,
    waitlist: true,
    initialPaidGross: 0,
    paymentMethod: 'Efectivo',
    paymentService: '',
    isLiquidado: false,
    scholarshipPending: !!personData.scholarshipPendingApproval,
    participantData: { id: docId, ...personData },
  });

  return { ok: true, participantId: docId, waitlist: true };
}

/** Busca participantes con ese ID VNPM (cualquier evento; activos o archivados). Requiere `request.auth != null` en reglas. */
export async function fetchParticipantsByVnpPersonId(rawVnpId) {
  const id = canonicalizeVnpPersonId(rawVnpId);
  if (!id || id.length < 6) return [];
  const q = query(getColRef('app_participants'), where('vnpPersonId', '==', id), limit(25));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Misma lógica que el buscador de «Nuevo registro» en App: no sugerir si el teléfono ya está en uso
 * en el evento actual por otra familia.
 */
export function filterPublicVnpLookupRows(rows, currentEventId, allParticipantsInCurrentEvent) {
  if (!currentEventId || !Array.isArray(rows)) return [];
  const activeInCurrentEvent = (allParticipantsInCurrentEvent || []).filter(
    (p) => p.eventId === currentEventId && participantBlocksDuplicateRegistration(p)
  );
  const out = [];
  const seen = new Set();
  for (const p of rows) {
    const d = digitsOnlyPhone(p.phone);
    if (
      d.length >= 10 &&
      activeInCurrentEvent.some(
        (evp) => digitsOnlyPhone(evp.phone) === d && !isPhoneShareFamilyAllowed(p.name, p.age, evp.name, evp.age)
      )
    ) {
      continue;
    }
    const dedupeKey = (p.vnpPersonId && String(p.vnpPersonId)) || d || `${p.id}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    out.push(p);
    if (out.length >= 15) break;
  }
  return out;
}

const resolveLlegaEnCarroImport = (personLike) => {
  if (typeof personLike?.llegaEnCarro === 'boolean') return personLike.llegaEnCarro;
  if (isSiValue(personLike?.llegaEnCarro)) return true;
  if (personLike?.llegaEnCarro === 'No') return false;
  return (personLike?.transportType || 'Camión') === 'Carro';
};

const resolveRegresaEnCarroImport = (personLike) => {
  if (typeof personLike?.regresaEnCarro === 'boolean') return personLike.regresaEnCarro;
  if (isSiValue(personLike?.regresaEnCarro)) return true;
  if (personLike?.regresaEnCarro === 'No') return false;
  return (personLike?.transportType || 'Camión') === 'Carro';
};

/** Campos para fusionar en el formulario público (misma idea que importar perfil en App). */
export function buildPublicProfileImportPayload(src, { eventType, defaultLocation }) {
  const isCampaEv = eventType === 'Campa';
  const loc = defaultLocation || '';
  const base = {
    name: src.name || '',
    phone: src.phone || '',
    birthDate: src.birthDate || '',
    age: src.birthDate ? calculateAgeFromBirthDate(src.birthDate) : (src.age != null && src.age !== '' ? String(src.age) : ''),
    gender: src.gender || '',
    responsivaStatus: src.responsivaStatus || '',
    vnpPersonId: canonicalizeVnpPersonId(src.vnpPersonId || '') || src.vnpPersonId || '',
    alias: src.alias || '',
    bloodType: src.bloodType || BLOOD_TYPE_UNSPECIFIED,
    emergencyContact: src.emergencyContact || '',
    emergencyPhone: src.emergencyPhone || '',
    emergencyRelationship: src.emergencyRelationship || '',
    canSwim: src.canSwim || 'No',
    paid: '',
    attendanceSpecialType: normalizeAttendanceSpecial(src),
    hasAllergy: src.hasAllergy || 'No',
    allergyCategory: src.allergyCategory || '',
    allergyDetails: src.allergyDetails || '',
    hasDisease: src.hasDisease || 'No',
    diseaseDetails: src.diseaseDetails || '',
    diseaseMedication: src.diseaseMedication || '',
    hasDisability: src.hasDisability || 'No',
    disabilityDetails: src.disabilityDetails || '',
    isScholarship: 'No',
    scholarshipType: 'total',
    scholarshipPartialAmount: '',
    isServer: 'No',
    serverAssignment: '',
    ambosServeInSegment: '',
    campAssignment: '',
    willBeBaptized: 'No',
    baptismSegment: '',
    customData: {},
    travelFrom: loc,
    travelTo: loc,
    wantsBautizosFood: src.wantsBautizosFood || 'No',
    wantsBautizosTransport: src.wantsBautizosTransport || 'No',
    llegaEnCarro: resolveLlegaEnCarroImport(src),
    regresaEnCarro: resolveRegresaEnCarroImport(src),
    carrosLlegada: normalizeArrivalCarCount(src.carrosLlegada),
    transportType: src.transportType || 'Camión',
    paymentMethod: 'Efectivo',
    cardReference: '',
    selectedDiscountCampaignId: '',
    allowSharedMainPhone: false,
    isMarried: src.isMarried || 'No',
    spouseName: src.spouseName || '',
    goesWithChildren: src.goesWithChildren || 'No',
    childrenCount: src.childrenCount ?? '',
    servedOtherCampa: src.servedOtherCampa || 'No',
    servedAreas: src.servedAreas || '',
    preferredServeArea: src.preferredServeArea || '',
    servesInCongress: src.servesInCongress || 'No',
    congressServeArea: src.congressServeArea || '',
  };
  if (isCampaEv) {
    base.willBeBaptized = isSiValue(src.willBeBaptized) ? SI : 'No';
    base.baptismSegment = src.baptismSegment || '';
    const mix = String(src.ambosServeInSegment || '').trim();
    base.ambosServeInSegment = mix === 'Teens' || mix === 'Jóvenes' ? mix : '';
  }
  if (eventType === 'Bautizos') {
    base.wantsBautizosFood = SI;
    base.bautizosAttendanceType = normalizeBautizosAttendanceType(src.bautizosAttendanceType);
    base.bautizosCompanions = normalizeBautizosCompanionsForPersist(
      { ...src, location: loc },
      loc,
      { canonicalizeVnpPersonId, generateVnpPersonId }
    );
  }
  return base;
}
