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

function stripSensitiveParticipantFields(person) {
  const patch = {};
  for (const key of SENSITIVE_PARTICIPANT_FIELDS) {
    if (key === 'bloodType') patch[key] = BLOOD_TYPE_UNSPECIFIED;
    else if (key.startsWith('has')) patch[key] = 'No';
    else patch[key] = '';
  }
  patch.canSwim = 'No';
  patch.responsivaDigital = null;
  patch.responsivaSignatureUrl = '';
  patch.responsivaSignatureMeta = null;
  patch.emergencyContactResponsiva = '';
  patch.emergencyPhoneResponsiva = '';

  const companions = Array.isArray(person?.bautizosCompanions) ? person.bautizosCompanions : [];
  if (companions.length > 0) {
    patch.bautizosCompanions = companions.map((row) => ({
      ...row,
      ...clearedCompanionSensitiveFields(),
    }));
  }

  patch.sensitiveDataPurgedAt = new Date().toISOString();
  if (String(person?.responsivaStatus || '').trim()) {
    patch.responsivaStatus = 'purgada';
  }
  return patch;
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
  patch.status = 'archived';
  const purgedAt = new Date().toISOString();
  patch.privacyRetentionPurgedAt = purgedAt;
  patch.sensitiveDataPurgedAt = purgedAt;
  const companions = Array.isArray(person?.bautizosCompanions) ? person.bautizosCompanions : [];
  if (companions.length > 0) {
    patch.bautizosCompanions = companions.map((row) => ({
      ...row,
      name: 'Acompañante purgado',
      ...clearedCompanionSensitiveFields(),
    }));
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
};
