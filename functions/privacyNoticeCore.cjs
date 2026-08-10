/**
 * Utilidades de privacidad (CommonJS para Cloud Functions).
 * Mantener alineado con src/privacyNotice.js
 */

const BLOOD_TYPE_UNSPECIFIED = 'No especificado / Desconocido';

const SENSITIVE_PARTICIPANT_FIELDS = [
  'bloodType',
  'canSwim',
  'hasAllergy',
  'allergyCategory',
  'allergyDetails',
  'hasDisease',
  'diseaseDetails',
  'diseaseMedication',
  'hasDisability',
  'disabilityDetails',
];

const PERSONAL_PARTICIPANT_FIELDS = [
  'name',
  'phone',
  'email',
  'birthDate',
  'age',
  'gender',
  'address',
  'city',
  'state',
  'zipCode',
  'emergencyContact',
  'emergencyPhone',
  'emergencyRelationship',
  'vnpPersonId',
  'comments',
  'cardReference',
  'spouseParticipantId',
  'spouseName',
  'customFields',
];

function isSiValue(v) {
  return String(v || '').trim().toLowerCase() === 'si' || String(v || '').trim().toLowerCase() === 'sí';
}

function truncateUtf8Bytes(str, maxBytes) {
  const enc = new TextEncoder();
  if (enc.encode(str).length <= maxBytes) return str;
  let end = str.length;
  while (end > 0) {
    const slice = str.slice(0, end);
    if (enc.encode(slice).length <= maxBytes) return slice;
    end -= 1;
  }
  return '';
}

/** Misma regla que src/firestoreDocId.js (IDs de archivo / participantes). */
function sanitizeFirestoreDocId(input, options = {}) {
  const {
    maxBytes = 1500,
    maxChars,
    fallback = 'doc',
  } = options;

  let s = String(input ?? '').trim();
  if (!s) return fallback;

  s = s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u00f1/gi, 'n')
    .replace(/\u00df/gi, 'ss')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!s) return fallback;
  if (maxChars && maxChars > 0) s = s.slice(0, maxChars);
  s = truncateUtf8Bytes(s, maxBytes);
  return s || fallback;
}

function normalizeIdText(txt) {
  return String(txt || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u00f1/gi, 'n')
    .replace(/\u00df/gi, 'ss')
    .toUpperCase();
}

/** Misma regla que canonicalizeVnpPersonId en App / publicRegistrationLogic. */
function canonicalizeVnpPersonId(raw) {
  const t = String(raw || '').trim();
  if (!t) return '';
  const m = t.match(/^VNPM-(.*)$/i);
  if (!m) return t;
  const rest = normalizeIdText(m[1]).replace(/[^A-Z0-9]/g, '');
  if (!rest) return '';
  return `VNPM-${rest}`;
}

/**
 * Misma regla que getArchiveProfileDocId en App.jsx.
 * Para lookups de purga: sin fallback aleatorio (null si no hay clave estable).
 */
function getArchiveProfileDocId(person) {
  const vnp = canonicalizeVnpPersonId(person?.vnpPersonId || '');
  if (vnp.length >= 4) {
    const safe = sanitizeFirestoreDocId(vnp, { maxChars: 120, fallback: '' });
    if (safe) return `id_${safe}`;
  }
  const d = String(person?.phone || '').replace(/\D/g, '');
  if (d.length >= 10) return `ph_${d.slice(-10)}`;
  const pid = sanitizeFirestoreDocId(person?.id, { maxChars: 120, fallback: '' });
  return pid ? `pid_${pid}` : null;
}

function hasPrivacyNoticeAcceptance(person) {
  return !!String(person?.privacyNoticeAcceptedAt || '').trim();
}

/**
 * Cancelado con saldo pendiente de donación/devolución: no anonimizar identidad aún
 * (corte de caja / UI de cancelados dependen de status + nombre).
 */
function hasUnresolvedCancelledRefund(person) {
  if (String(person?.status || '') !== 'cancelled') return false;
  if (person?.refundAsDonation) return false;
  if (Number(person?.refundDisbursedAmount) > 0 || person?.refundDisbursedAt) return false;
  const hist = Array.isArray(person?.paymentHistory) ? person.paymentHistory : [];
  if (hist.some((h) => h && h.kind === 'refund_disbursement' && Math.abs(Number(h.amount) || 0) > 0)) {
    return false;
  }
  const pending = Number(person?.refundPendingAmount ?? person?.paid ?? 0) || 0;
  return pending > 0;
}

/**
 * Decide la acción de purga post-retención para un participante.
 * @returns {{ action: 'skip'|'sensitive'|'full', reason: string }}
 */
function resolveRetentionPurgeAction(person) {
  if (person?.privacyRetentionPurgedAt) {
    return { action: 'skip', reason: 'already_full' };
  }
  const hasAviso = hasPrivacyNoticeAcceptance(person);
  if (!hasAviso) {
    if (hasUnresolvedCancelledRefund(person)) {
      if (person?.sensitiveDataPurgedAt) {
        return { action: 'skip', reason: 'refund_pending_sensitive_done' };
      }
      return { action: 'sensitive', reason: 'no_aviso_refund_pending' };
    }
    return { action: 'full', reason: 'no_aviso' };
  }
  if (isSiValue(person?.sensitiveDataConsent)) {
    return { action: 'skip', reason: 'consent_si' };
  }
  if (person?.sensitiveDataPurgedAt) {
    return { action: 'skip', reason: 'already_sensitive' };
  }
  return { action: 'sensitive', reason: 'no_sensitive_consent' };
}

function clearedCompanionSensitiveFields() {
  return {
    bloodType: BLOOD_TYPE_UNSPECIFIED,
    hasAllergy: 'No',
    allergyCategory: '',
    allergyDetails: '',
    hasDisease: 'No',
    diseaseDetails: '',
    diseaseMedication: '',
    hasDisability: 'No',
    disabilityDetails: '',
  };
}

function clearSensitiveFieldsOnObject(target) {
  const out = { ...(target && typeof target === 'object' ? target : {}) };
  for (const key of SENSITIVE_PARTICIPANT_FIELDS) {
    if (key === 'bloodType') out[key] = BLOOD_TYPE_UNSPECIFIED;
    else if (key.startsWith('has')) out[key] = 'No';
    else out[key] = '';
  }
  out.canSwim = 'No';
  out.responsivaDigital = null;
  out.responsivaSignatureUrl = '';
  out.responsivaSignatureMeta = null;
  out.emergencyContactResponsiva = '';
  out.emergencyPhoneResponsiva = '';
  return out;
}

function clearPersonalFieldsOnObject(target) {
  const out = clearSensitiveFieldsOnObject(target);
  for (const key of PERSONAL_PARTICIPANT_FIELDS) {
    if (key === 'customFields') out[key] = {};
    else if (key === 'age') out[key] = '';
    else out[key] = '';
  }
  out.name = 'Registro purgado (privacidad)';
  out.phone = '';
  out.alias = '';
  out.notes = '';
  out.customData = {};
  return out;
}

function stripSensitiveParticipantFields(person) {
  const patch = clearSensitiveFieldsOnObject(person);
  // clearSensitiveFieldsOnObject copies all keys; keep patch to cleared keys only for Firestore update
  const update = {};
  for (const key of SENSITIVE_PARTICIPANT_FIELDS) {
    update[key] = patch[key];
  }
  update.canSwim = 'No';
  update.responsivaDigital = null;
  update.responsivaSignatureUrl = '';
  update.responsivaSignatureMeta = null;
  update.emergencyContactResponsiva = '';
  update.emergencyPhoneResponsiva = '';

  const companions = Array.isArray(person?.bautizosCompanions) ? person.bautizosCompanions : [];
  if (companions.length > 0) {
    update.bautizosCompanions = companions.map((row) => ({
      ...row,
      ...clearedCompanionSensitiveFields(),
    }));
  }

  if (person?.archivedProfileSnapshot && typeof person.archivedProfileSnapshot === 'object') {
    update.archivedProfileSnapshot = clearSensitiveFieldsOnObject(person.archivedProfileSnapshot);
  }

  update.sensitiveDataPurgedAt = new Date().toISOString();
  if (String(person?.responsivaStatus || '').trim()) {
    update.responsivaStatus = 'purgada';
  }
  return update;
}

function stripAllPersonalParticipantFields(person) {
  const sensitivePatch = stripSensitiveParticipantFields(person);
  delete sensitivePatch.sensitiveDataPurgedAt;
  const patch = { ...sensitivePatch };
  for (const key of PERSONAL_PARTICIPANT_FIELDS) {
    if (key === 'customFields') patch[key] = {};
    else if (key === 'age') patch[key] = '';
    else patch[key] = '';
  }
  patch.name = 'Registro purgado (privacidad)';
  patch.phone = '';
  patch.alias = '';
  patch.notes = '';
  patch.customData = {};
  patch.status = 'archived';
  const purgedAt = new Date().toISOString();
  patch.privacyRetentionPurgedAt = purgedAt;
  patch.sensitiveDataPurgedAt = purgedAt;
  const companions = Array.isArray(person?.bautizosCompanions) ? person.bautizosCompanions : [];
  if (companions.length > 0) {
    patch.bautizosCompanions = companions.map((row) => ({
      ...row,
      name: 'Acompañante purgado',
      phone: '',
      ...clearedCompanionSensitiveFields(),
    }));
  }
  if (person?.archivedProfileSnapshot && typeof person.archivedProfileSnapshot === 'object') {
    patch.archivedProfileSnapshot = clearPersonalFieldsOnObject(person.archivedProfileSnapshot);
  }
  return patch;
}

function getEventEffectiveEndDateFromDoc(ev) {
  const end = String(ev?.dateEnd || '').trim();
  if (end) return end;
  return String(ev?.date || '').trim();
}

function isEventPastSensitiveRetention(eventEndIso, retentionDays, todayIso) {
  const end = String(eventEndIso || '').trim();
  if (!end) return false;
  const days = Number.isFinite(Number(retentionDays)) ? Number(retentionDays) : 90;
  const today = String(todayIso || new Date().toISOString().slice(0, 10)).trim();
  const endDate = new Date(`${end}T12:00:00`);
  if (Number.isNaN(endDate.getTime())) return false;
  endDate.setDate(endDate.getDate() + days);
  const deadline = endDate.toISOString().slice(0, 10);
  return today > deadline;
}

module.exports = {
  SENSITIVE_PARTICIPANT_FIELDS,
  PERSONAL_PARTICIPANT_FIELDS,
  stripSensitiveParticipantFields,
  stripAllPersonalParticipantFields,
  getEventEffectiveEndDateFromDoc,
  isEventPastSensitiveRetention,
  isSiValue,
  sanitizeFirestoreDocId,
  canonicalizeVnpPersonId,
  getArchiveProfileDocId,
  hasPrivacyNoticeAcceptance,
  hasUnresolvedCancelledRefund,
  resolveRetentionPurgeAction,
};
