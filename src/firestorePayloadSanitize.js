/**
 * Elimina `undefined` y normaliza valores no soportados antes de escribir en Firestore.
 */
import {
  applySensitiveConsentToParticipantPayload,
  normalizeSensitiveConsentValue,
  sanitizeParticipantConsentForFirestoreWrite,
} from './privacyNotice.js';

const isPlainObject = (v) =>
  v !== null && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;

/** Firestore rechaza `undefined`; preserva FieldValue, Timestamp, etc. */
export function omitUndefinedDeep(input) {
  if (input === undefined) return undefined;
  if (input === null || typeof input !== 'object') return input;
  if (Array.isArray(input)) {
    return input.map(omitUndefinedDeep).filter((x) => x !== undefined);
  }
  if (!isPlainObject(input)) return input;
  const out = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) continue;
    const next = omitUndefinedDeep(v);
    if (next !== undefined) out[k] = next;
  }
  return out;
}

export function sanitizeJsonForFirestore(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeJsonForFirestore(item)).filter((item) => item !== undefined);
  }
  if (typeof value === 'object') {
    const out = {};
    for (const [key, nested] of Object.entries(value)) {
      if (nested === undefined) continue;
      const sanitized = sanitizeJsonForFirestore(nested);
      if (sanitized !== undefined) out[key] = sanitized;
    }
    return out;
  }
  return null;
}

/** Detecta sentinelas de Firestore (`deleteField`, etc.) en parches de merge. */
export function isFirestoreDeleteFieldValue(value) {
  return (
    value != null &&
    typeof value === 'object' &&
    typeof value._methodName === 'string' &&
    value._methodName.toLowerCase().includes('delete')
  );
}

/** Documento completo de `app_participants` listo para `setDoc` / `batch.set`. */
export function prepareParticipantDocForFirestore(payload) {
  return omitUndefinedDeep(sanitizeParticipantConsentForFirestoreWrite(payload));
}

/**
 * Documento de participante listo para escribir: aplica política de consentimiento médico
 * y normaliza campos que las reglas de Firestore rechazan (`sensitiveDataConsent`, purgas).
 */
export function buildParticipantFirestoreWriteDoc(personData, { sensitiveConsent } = {}) {
  const consent = normalizeSensitiveConsentValue(sensitiveConsent);
  const consentForPersist = consent === 'Si' ? 'Si' : 'No';
  return prepareParticipantDocForFirestore(
    applySensitiveConsentToParticipantPayload(personData, consentForPersist)
  );
}

/** Parche seguro para estado local tras `setDoc`/`updateDoc` (sin FieldValue ni undefined). */
export function patchForLocalParticipantCache(patch) {
  if (!patch || typeof patch !== 'object') return {};
  const out = {};
  for (const [key, val] of Object.entries(patch)) {
    if (val === undefined || isFirestoreDeleteFieldValue(val)) continue;
    out[key] = val;
  }
  return out;
}
