/**
 * Mapa de aplicabilidad de campos del registro de participante por tipo de evento.
 *
 * Objetivos:
 *  - Filtrar el log de cambios para que solo se reporten campos pertinentes al tipo de evento.
 *  - Evitar persistir información que no aplica al tipo de evento.
 *
 * Convenciones:
 *  - Campos en `COMMON_FIELDS`: siempre se conservan/loguean (datos básicos, contacto, pago, etc.).
 *  - Campos por tipo de evento: solo aplican cuando `eventType` coincide.
 *  - Campos de transporte: aplican a Campa y General (no Desayuno).
 *  - Cualquier campo no listado se considera "neutral" y se conserva si ya existía
 *    en el registro original (no se introduce ruido en logs ni se borra info legítima).
 */

import { eventTypeIsDesayuno } from './transportPlanningEligibility.js';
import { applyParticipantNameFormattingForSave } from './participantNameFormat.js';
import { logScalarsEquivalent } from './activityLogDiff.js';

/** Datos básicos comunes a todo evento. */
const COMMON_FIELDS = new Set([
  // Identidad
  'id', 'name', 'phone', 'allowSharedMainPhone', 'age', 'birthDate', 'gender',
  'alias', 'vnpPersonId', 'profileLinkId',
  // Contacto de emergencia
  'emergencyContact', 'emergencyPhone', 'emergencyRelationship',
  // Salud (común a Campa; ver scope abajo, pero tampoco "rompe" si está en otros)
  'bloodType',
  // Sede / metadatos
  'location', 'eventId', 'status', 'createdAt', 'updatedAt',
  'cancelledAt', 'cancelledFromLocation', 'archivedAt',
  'restoredAt', 'restoredFromArchive',
  'whatsAppFinanceNotifications',
  'whatsAppMessageHistory',
  'registrationComments',
  'customData',
  // Pago (todos los eventos manejan algún tipo de pago)
  'paid', 'paidNet', 'paymentHistory', 'paymentMethod', 'paymentService',
  'cardReference', 'registeredCost', 'registeredCostManual',
  'discountCampaignId', 'discountCampaignConcept',
  'editApplyCampaignId', // efímero del modal
  'refundPendingAmount', 'refundAsDonation', 'refundedAt',
  'manualCreditAmount', 'archivedManualCreditAmount',
  // Responsiva (gobernada por configuración del evento, no por tipo)
  'responsivaStatus', 'responsivaSignedAt', 'responsivaSignedBy',
  'responsivaSignatureUrl', 'responsivaSignatureMeta',
  'responsivaDigitalToken', 'responsivaDigitalRequestedAt',
  // Auditoría / debug interno
  '_isDebug', '_debugSessionId',
  // Pastor (todos los tipos de evento)
  'pastorRealCost', 'pastorStayStart', 'pastorStayEnd',
]);

/** Servidor / perfil de servicio: Campa (áreas, pareja, asignación). */
const SERVER_PARTICIPATION_FIELDS = new Set([
  'isServer',
  'serverAssignment',
  'ambosServeInSegment',
  'isMarried',
  'spouseName',
  'spouseParticipantId',
  'spousePhone',
  'goesWithChildren',
  'childrenCount',
  'servedOtherCampa',
  'servedAreas',
  'preferredServeArea',
  'assignedServeArea',
  'servesInCongress',
  'congressServeArea',
]);

/** Campos exclusivos de Campa. */
const CAMPA_ONLY_FIELDS = new Set([
  // Becas
  'isScholarship', 'scholarshipType', 'scholarshipPartialAmount',
  'scholarshipPendingApproval', 'scholarshipApprovedAt', 'scholarshipApprovedBy',
  // Asignación campista (Teens/Jóvenes)
  'campAssignment',
  // Bautizo en evento Campa (segmento Teens/Jóvenes solo aplica en Campa)
  'baptismSegment',
  // Asistencia especial (Empleado / Cortesía)
  'attendanceSpecialType',
  // Hijo de pastor (cortesía Campa)
  'pastorChild', 'pastorChildWithoutPay', 'pastorChildSpecialDonationFinanceId',
]);

/** Campos de salud y bautismo en Campa. */
const CAMPA_HEALTH_AND_BAPTISM_FIELDS = new Set([
  'canSwim',
  'hasAllergy', 'allergyCategory', 'allergyDetails',
  'hasDisease', 'diseaseDetails', 'diseaseMedication',
  'hasDisability', 'disabilityDetails',
  // Talla playera para bautizados (Campa: si se bautiza)
  'baptismShirtSize',
  'willBeBaptized',
]);

/** Campos de transporte: aplican a Campa/General (NO a Desayuno). */
const TRANSPORT_FIELDS = new Set([
  'llegaEnCarro', 'regresaEnCarro', 'transportType',
  'travelFrom', 'travelTo',
]);

/**
 * Determina si un campo aplica al tipo de evento dado.
 * Devuelve `true` para campos comunes y campos del tipo correspondiente.
 * Para campos no listados (ruido potencial), devuelve `false` salvo que sean comunes.
 */
export function isParticipantFieldApplicableToEventType(key, eventType) {
  if (!key) return false;
  if (COMMON_FIELDS.has(key)) return true;

  const et = String(eventType || '').trim();
  const isDesayuno = eventTypeIsDesayuno(et);
  const isCampa = et === 'Campa';
  const isGeneral = et === 'General';

  // Transporte: Campa y General (no Desayuno).
  if (TRANSPORT_FIELDS.has(key)) return !isDesayuno && (isCampa || isGeneral);

  if (CAMPA_HEALTH_AND_BAPTISM_FIELDS.has(key)) return isCampa;

  if (SERVER_PARTICIPATION_FIELDS.has(key)) return isCampa;

  if (isCampa && CAMPA_ONLY_FIELDS.has(key)) return true;

  return false;
}

/** Versión para arreglos `[{ key, label }]`: filtra solo los campos que aplican. */
export function filterFieldsToTrackByEventType(fieldsToTrack, eventType) {
  if (!Array.isArray(fieldsToTrack)) return [];
  return fieldsToTrack.filter((f) => f && isParticipantFieldApplicableToEventType(f.key, eventType));
}

/**
 * Limpia `payload` para no persistir datos que no aplican al tipo de evento, sin perder
 * información que ya existía en `originalPerson` (no destructivo: no usa deleteField).
 *
 * Reglas:
 *   - Si el campo aplica al evento: se conserva el valor del payload.
 *   - Si el campo NO aplica y el original lo tenía: se restaura el valor original (no se modifica).
 *   - Si el campo NO aplica y el original no lo tenía (era undefined): se elimina del payload.
 */
export function cleanParticipantPayloadForEventType(payload, originalPerson, eventType) {
  if (!payload || typeof payload !== 'object') return payload;
  const out = { ...payload };
  const original = originalPerson && typeof originalPerson === 'object' ? originalPerson : {};

  Object.keys(out).forEach((key) => {
    if (isParticipantFieldApplicableToEventType(key, eventType)) return;
    // Campo no aplica al tipo de evento. Si en el original existía un valor real,
    // no lo modificamos (lo dejamos tal cual estaba). Si no existía, lo eliminamos
    // del payload para no contaminar el documento.
    const hadOriginal = Object.prototype.hasOwnProperty.call(original, key) && original[key] !== undefined;
    if (hadOriginal) {
      out[key] = original[key];
    } else {
      delete out[key];
    }
  });

  applyParticipantNameFormattingForSave(out);
  return out;
}

/**
 * Compara `original` y `edited` y construye un arreglo de cambios legibles solo
 * para los campos que aplican al evento. Cada elemento se construye con `formatChange(field, prevVal, nextVal)`.
 *
 * Convenciones:
 *   - Si `prevVal` es undefined/null y `nextVal` es '' o 'No' (es decir, ruido por defaults
 *     del formulario), no se considera cambio.
 *   - Si los valores normalizados son equivalentes (NFC, espacios, números), no se considera cambio.
 */
export function buildParticipantChangeLogEntries(original, edited, fieldsToTrack, eventType, formatChange, options = {}) {
  if (!original || !edited || !Array.isArray(fieldsToTrack)) return [];
  const { shouldSkipField = null } = options;
  const filtered = filterFieldsToTrackByEventType(fieldsToTrack, eventType);
  const out = [];
  filtered.forEach((f) => {
    if (typeof shouldSkipField === 'function' && shouldSkipField(f, original, edited)) return;
    const prev = original[f.key];
    const next = edited[f.key];
    const prevIsEmpty = prev === undefined || prev === null || prev === '';
    const nextIsEmpty = next === undefined || next === null || next === '';
    if (prevIsEmpty && nextIsEmpty) return;
    // Trata "undefined" y 'No' como equivalentes solo si el original no estaba definido,
    // para evitar reportar ruido por defaults del modal de edición.
    if (prev === undefined && (next === '' || next === 'No' || next === false)) return;
    if (logScalarsEquivalent(prev, next)) return;
    const entry = typeof formatChange === 'function' ? formatChange(f, prev, next) : `${f.label} (${prev} -> ${next})`;
    if (entry) out.push(entry);
  });
  return out;
}
