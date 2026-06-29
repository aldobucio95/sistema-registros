/**
 * Aviso de privacidad (LFPDPPP — México) y utilidades de datos sensibles.
 */

import { BLOOD_TYPE_UNSPECIFIED } from './registrationFormShared.js';
import { isSiValue } from './publicRegistrationLogic.js';

export const PRIVACY_NOTICE_PUBLIC_PATH = '/aviso-privacidad';
export const PUBLIC_PRIVACY_DOC_COLLECTION = 'app_public_documents';
export const PUBLIC_PRIVACY_DOC_ID = 'privacy_notice';

export const DEFAULT_SENSITIVE_RETENTION_DAYS = 90;

/** Marcadores sustituidos al publicar/mostrar el aviso (campos del editor SuperUsuario). */
export const PRIVACY_NOTICE_PLACEHOLDERS = {
  responsibleName: '{{responsibleName}}',
  responsibleAddress: '{{responsibleAddress}}',
  arcoEmail: '{{arcoEmail}}',
  arcoPhone: '{{arcoPhone}}',
  retentionDays: '{{retentionDays}}',
};

export const DEFAULT_PRIVACY_NOTICE_BODY = `# AVISO DE PRIVACIDAD INTEGRAL – REGISTRO DE EVENTOS Y ACTIVIDADES

## 1. Identidad y Domicilio del Responsable

El Responsable del tratamiento de sus datos personales es {{responsibleName}} (en lo sucesivo, "El Responsable"), con domicilio ubicado en {{responsibleAddress}}. El Responsable se compromete a salvaguardar la privacidad de sus datos personales y a utilizarlos bajo los principios de licitud, consentimiento, información, calidad, finalidad, lealtad, proporcionalidad y responsabilidad, de conformidad con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) en México.

## 2. Datos Personales que serán Recabados

Para llevar a cabo las finalidades descritas en el presente aviso, El Responsable recabará de forma verbal, escrita o electrónica, y registrará de manera manual en su sistema de gestión, las siguientes categorías de datos personales, dependiendo del evento específico al que usted se inscriba:

**Datos de identificación:** Nombre completo, edad, fecha de nacimiento, género.

**Datos de contacto:** Correo electrónico, número de teléfono (móvil y/o fijo).

**Datos de contacto de emergencia:** Nombre completo, relación o parentesco y teléfono de la persona a contactar en caso de cualquier eventualidad durante el evento.

**Datos Personales Sensibles:**
Para eventos que involucren actividades físicas, pernocta o estancias prolongadas al aire libre (como campamentos, excursiones y días de campo), se recabarán datos relacionados con su estado de salud presente y futuro, tales como: alergias, padecimientos crónicos, tipo de sangre, restricciones alimenticias, uso de medicamentos específicos e indicaciones médicas especiales. Estos datos son considerados sensibles bajo la ley mexicana y reciben un tratamiento de máxima seguridad y confidencialidad.

## 3. Finalidades del Tratamiento de los Datos

Los datos personales recabados serán utilizados para las siguientes finalidades de carácter primario y necesario:

- Gestionar su inscripción, registro manual y control de asistencia a los eventos seleccionados (conferencias, talleres, días de campo, campamentos, entre otros).
- Coordinar la logística interna de los eventos, lo cual incluye de manera enunciativa más no limitativa: asignación de espacios, transporte, hospedaje, distribución de alimentos y entrega de materiales didácticos o constancias.
- Establecer canales de comunicación directa para enviar confirmaciones, actualizaciones de itinerarios, modificaciones de horarios o avisos de última hora.
- **Seguridad y Atención Médica:** Contar con la información de salud y contactos de emergencia necesarios para prevenir accidentes, coordinar primeros auxilios o enlazar con servicios médicos especializados y de seguros (en caso de aplicar) ante cualquier eventualidad o urgencia durante el desarrollo de la actividad.

De manera adicional, utilizaremos su información para las siguientes finalidades secundarias que no son necesarias para el evento, pero que nos permiten brindarle una mejor atención:

- Enviar invitaciones, convocatorias y publicidad sobre futuros eventos, conferencias o actividades organizadas por El Responsable.
- **Uso de imagen y voz:** Registro fotográfico y de video durante los eventos con fines informativos, de memoria institucional o de difusión en las plataformas digitales de El Responsable.

Si usted no desea que sus datos personales sean tratados para estas finalidades secundarias, puede manifestar su negativa en cualquier momento enviando un correo electrónico a la dirección señalada en la Sección 6 de este aviso.

## 4. Transferencia de Datos Personales

El Responsable le informa que sus datos personales (incluidos los datos de salud) no serán vendidos, difundidos ni compartidos con terceros ajenos a la organización de las actividades, salvo en los siguientes supuestos que exceptúa la ley o que resultan estrictamente indispensables por cuestiones de fuerza mayor:

- **Servicios Médicos y Hospitalarios:** En caso de emergencia médica durante un evento, los datos de salud y contacto serán transferidos a paramédicos, clínicas u hospitales correspondientes para su correcta atención.
- **Aseguradoras:** Para la contratación y ejecución de pólizas de seguro de accidentes individuales o colectivas adquiridas para las actividades del evento.
- Autoridades competentes cuando sea requerido por mandato legal o judicial.

## 5. Medidas de Seguridad y Retención de Datos

Sus datos personales serán almacenados de forma segura en medios físicos y/o electrónicos protegidos por contraseñas, cifrado y accesos restringidos exclusivamente al personal organizador autorizado.

El periodo de retención de sus datos dependerá de la modalidad de registro autorizada al momento de su captura manual:

**Registro por Evento Único (Sin Perfil):** Si usted se inscribe a un evento de forma aislada y no autoriza la conservación de su historial, sus datos de identificación y contacto se conservarán exclusivamente para el seguimiento logístico del evento. Sus Datos Personales Sensibles (información médica y de salud) serán eliminados de manera definitiva y segura de nuestros sistemas en un plazo no mayor a {{retentionDays}} días naturales posteriores a la conclusión del evento correspondiente.

**Registro con Perfil Permanente:** Si usted consiente expresamente (de forma verbal o por medios electrónicos durante su proceso de inscripción manual) la creación de un perfil digital permanente en nuestro sistema para agilizar futuras inscripciones, sus datos de identificación, contacto y datos sensibles de salud se almacenarán de forma permanente. Esto permitirá al Responsable recuperar su información en próximos eventos (campamentos, días de campo, conferencias), obligándose a validar con usted la vigencia y exactitud de dichos datos médicos antes de cada nueva actividad. Estos datos permanecerán resguardados mientras usted no solicite la baja de su perfil.

## 6. Medios para Ejercer los Derechos ARCO y Revocación del Consentimiento

Usted tiene derecho a conocer qué datos personales tenemos de usted, para qué los utilizamos y las condiciones del uso que les damos (Acceso). Asimismo, es su derecho solicitar la corrección de su información personal en caso de que esté desactualizada, sea inexacta o incompleta (Rectificación); que la eliminemos de nuestros registros o bases de datos cuando considere que la misma no está siendo utilizada conforme a los principios, deberes y obligaciones previstas en la normativa (Cancelación); así como oponerse al uso de sus datos personales para fines específicos (Oposición). Estos se conocen como Derechos ARCO.

Para el ejercicio de cualquiera de los derechos ARCO, o para solicitar la eliminación definitiva de su Perfil Permanente y datos médicos, usted deberá presentar la solicitud respectiva enviando un correo electrónico a: {{arcoEmail}}.

La solicitud deberá contener al menos: nombre completo del titular, identificación oficial vigente adjunta (o del tutor en caso de menores de edad) y la descripción del derecho que busca ejercer. El Responsable responderá a su solicitud en un plazo de las leyes vigentes.

## 7. Modificaciones al Aviso de Privacidad

El presente aviso de privacidad puede sufrir modificaciones, cambios o actualizaciones derivadas de nuevos requerimientos legales o de nuestras propias prácticas de privacidad. Todas las modificaciones estarán disponibles para su consulta a través de los canales de contacto habituales o solicitándolo directamente al Responsable.

## 8. Registro de Consentimiento (Para Control del Administrador)

Al realizar la captura manual de los datos de un asistente en el software, el administrador dejará constancia en el sistema de que el titular (o su tutor legal) fue informado de este aviso y otorgó su consentimiento bajo el siguiente criterio:

- **Aceptación del aviso de privacidad** (obligatorio): requisito para proceder con la inscripción al evento.
- **Perfil permanente y almacenamiento de datos médicos** (opcional): autorización brindada de forma verbal o electrónica al administrador para agilizar futuras inscripciones a campamentos o días de campo.

La fecha y hora de captura quedan registradas automáticamente en el sistema.
`;

/** Campos de salud del titular (top-level). */
export const SENSITIVE_PARTICIPANT_FIELDS = [
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

/** Campos de salud por acompañante Bautizos. */
export const SENSITIVE_COMPANION_FIELDS = [
  'bloodType',
  'hasAllergy',
  'allergyCategory',
  'allergyDetails',
  'hasDisease',
  'diseaseDetails',
  'diseaseMedication',
  'hasDisability',
  'disabilityDetails',
];

export function defaultPrivacyNoticeConfig() {
  const now = new Date().toISOString();
  return {
    version: '2.0',
    updatedAt: now,
    responsibleName: '',
    responsibleAddress: '',
    arcoEmail: '',
    arcoPhone: '',
    bodyMarkdown: DEFAULT_PRIVACY_NOTICE_BODY,
    sensitiveRetentionDays: DEFAULT_SENSITIVE_RETENTION_DAYS,
    retentionDryRun: false,
  };
}

/** Fusiona config almacenada con valores por defecto. */
export function mergePrivacyNoticeConfig(stored) {
  const base = defaultPrivacyNoticeConfig();
  if (!stored || typeof stored !== 'object') return base;
  return {
    ...base,
    ...stored,
    sensitiveRetentionDays:
      Number.isFinite(Number(stored.sensitiveRetentionDays)) && Number(stored.sensitiveRetentionDays) > 0
        ? Math.floor(Number(stored.sensitiveRetentionDays))
        : base.sensitiveRetentionDays,
  };
}

/** Sustituye marcadores {{…}} del cuerpo del aviso con la config publicada. */
export function applyPrivacyNoticePlaceholders(text, privacyNotice) {
  const cfg = mergePrivacyNoticeConfig(privacyNotice);
  const responsibleName = String(cfg.responsibleName || '').trim() || '[Nombre del Responsable]';
  const responsibleAddress = String(cfg.responsibleAddress || '').trim() || '[Domicilio del Responsable]';
  const arcoEmail = String(cfg.arcoEmail || '').trim() || '[Correo ARCO]';
  const arcoPhone = String(cfg.arcoPhone || '').trim();
  const retentionDays = String(cfg.sensitiveRetentionDays || DEFAULT_SENSITIVE_RETENTION_DAYS);

  let out = String(text || DEFAULT_PRIVACY_NOTICE_BODY);
  const replacements = {
    [PRIVACY_NOTICE_PLACEHOLDERS.responsibleName]: responsibleName,
    [PRIVACY_NOTICE_PLACEHOLDERS.responsibleAddress]: responsibleAddress,
    [PRIVACY_NOTICE_PLACEHOLDERS.arcoEmail]: arcoEmail,
    [PRIVACY_NOTICE_PLACEHOLDERS.arcoPhone]: arcoPhone,
    [PRIVACY_NOTICE_PLACEHOLDERS.retentionDays]: retentionDays,
  };
  for (const [token, value] of Object.entries(replacements)) {
    out = out.split(token).join(value);
  }
  return out;
}

export function resolvePrivacyNoticeBody(privacyNotice) {
  const cfg = mergePrivacyNoticeConfig(privacyNotice);
  return applyPrivacyNoticePlaceholders(cfg.bodyMarkdown, cfg);
}

/**
 * Resumen breve (~15 s) para formularios.
 * @param {'manual' | 'public'} [audience] — manual: guion para leer al registrado
 */
export function buildPrivacyNoticeSummary(privacyNotice, audience = 'public') {
  const cfg = mergePrivacyNoticeConfig(privacyNotice);
  const days = cfg.sensitiveRetentionDays || DEFAULT_SENSITIVE_RETENTION_DAYS;
  const responsible = String(cfg.responsibleName || '').trim() || 'El Responsable del evento';
  const arcoParts = [cfg.arcoEmail, cfg.arcoPhone].map((v) => String(v || '').trim()).filter(Boolean);
  const arcoContact = arcoParts.join(' · ');

  if (audience === 'manual') {
    const days = cfg.sensitiveRetentionDays || DEFAULT_SENSITIVE_RETENTION_DAYS;
    const readAloudText =
      'Vida Nueva para El Mundo utilizará sus datos de contacto y de salud para asegurar su registro, logística y asistencia médica en nuestros eventos, protegiéndolos bajo la ley mexicana. ' +
      `Sus datos de salud se borrarán en un plazo de ${days} días, a menos que nos autorice conservarlos en un perfil permanente para futuras inscripciones. ` +
      'Puede ejercer sus derechos de acceso, rectificación, cancelación u oposición enviando un correo electrónico a la organización. ' +
      'Al continuar con su registro manual, ¿acepta los términos de este aviso de privacidad y nos da su consentimiento?';
    return {
      version: cfg.version,
      audience,
      paragraphs: [readAloudText],
      bullets: [readAloudText],
      staffNote:
        'Ambas casillas son opcionales. Sin aviso de privacidad, todos los datos del registro se eliminarán automáticamente tras el evento. Sin autorización de datos médicos, solo los datos de salud se eliminarán en ese plazo; con ambas autorizaciones se conservan de forma indefinida.',
      arcoContact: arcoParts.join(' · '),
      retentionDays: days,
    };
  }

  const bullets = [
    `Responsable: ${responsible}.`,
    'Tratamos contacto, inscripción y operación del evento (logística, avisos y seguridad).',
    `Datos de salud: sin perfil permanente se eliminan ${days} días después del evento; con autorización se conservan para futuras inscripciones.`,
    arcoContact ? `Derechos ARCO: ${arcoContact}.` : 'Derechos ARCO: consulte el aviso integral.',
  ];

  return {
    version: cfg.version,
    audience,
    bullets,
    paragraphs: bullets,
    staffNote: '',
    arcoContact,
    retentionDays: days,
  };
}

export function buildPrivacyNoticePublicUrl(origin) {
  const base = String(origin || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '');
  const pathBase = (import.meta.env?.BASE_URL || '/').replace(/\/$/, '');
  return `${base}${pathBase}${PRIVACY_NOTICE_PUBLIC_PATH}`;
}

/** Documento público espejo (lectura sin auth). */
export function buildPublicPrivacyDocument(privacyNotice) {
  const merged = mergePrivacyNoticeConfig(privacyNotice);
  return {
    ...merged,
    publishedAt: new Date().toISOString(),
  };
}

function companionHasSensitiveData(row) {
  if (!row || typeof row !== 'object') return false;
  if (String(row.bloodType || '').trim() && row.bloodType !== BLOOD_TYPE_UNSPECIFIED) return true;
  if (isSiValue(row.hasAllergy) && (String(row.allergyDetails || '').trim() || String(row.allergyCategory || '').trim())) {
    return true;
  }
  if (isSiValue(row.hasAllergy)) return true;
  if (isSiValue(row.hasDisease) && String(row.diseaseDetails || '').trim()) return true;
  if (isSiValue(row.hasDisease)) return true;
  if (isSiValue(row.hasDisability) && String(row.disabilityDetails || '').trim()) return true;
  if (isSiValue(row.hasDisability)) return true;
  return false;
}

/** ¿El participante tiene algún dato sensible capturado? */
export function participantHasSensitiveHealthData(person) {
  if (!person || typeof person !== 'object') return false;
  if (String(person.bloodType || '').trim() && person.bloodType !== BLOOD_TYPE_UNSPECIFIED) return true;
  if (isSiValue(person.hasAllergy)) return true;
  if (String(person.allergyDetails || '').trim() || String(person.allergyCategory || '').trim()) return true;
  if (isSiValue(person.hasDisease) || String(person.diseaseDetails || '').trim() || String(person.diseaseMedication || '').trim()) {
    return true;
  }
  if (isSiValue(person.hasDisability) || String(person.disabilityDetails || '').trim()) return true;
  if (isSiValue(person.canSwim)) return true;
  const companions = Array.isArray(person.bautizosCompanions) ? person.bautizosCompanions : [];
  if (companions.some(companionHasSensitiveData)) return true;
  if (person.responsivaDigital && typeof person.responsivaDigital === 'object') {
    const rd = person.responsivaDigital;
    if (String(rd.signatureDataUrl || '').trim() || String(rd.signatureUrl || '').trim()) return true;
  }
  return false;
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

/** Limpia datos sensibles sin marcar purga (alta/edición sin consentimiento). */
export function clearedSensitiveParticipantFields(person) {
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
  return patch;
}

/** Patch para purga post-retención (Cloud Function); incluye marca de purga. */
export function stripSensitiveParticipantFields(person) {
  const patch = clearedSensitiveParticipantFields(person);
  patch.sensitiveDataPurgedAt = new Date().toISOString();
  if (String(person?.responsivaStatus || '').trim()) {
    patch.responsivaStatus = 'purgada';
  }
  return patch;
}

/** '' = sin respuesta (opcional); 'Si' | 'No' = elección explícita. */
export function normalizeSensitiveConsentValue(consentRaw) {
  const raw = String(consentRaw ?? '').trim();
  if (isSiValue(raw)) return 'Si';
  if (raw === 'No') return 'No';
  return '';
}

/** Huella comparable de datos médicos sensibles (para ediciones sin re-consentir). */
export function sensitiveHealthDataFingerprint(person) {
  if (!person || typeof person !== 'object') return '';
  const companions = Array.isArray(person.bautizosCompanions) ? person.bautizosCompanions : [];
  return JSON.stringify({
    bloodType: String(person.bloodType ?? '').trim(),
    hasAllergy: String(person.hasAllergy ?? '').trim(),
    allergyCategory: String(person.allergyCategory ?? '').trim(),
    allergyDetails: String(person.allergyDetails ?? '').trim(),
    hasDisease: String(person.hasDisease ?? '').trim(),
    diseaseDetails: String(person.diseaseDetails ?? '').trim(),
    diseaseMedication: String(person.diseaseMedication ?? '').trim(),
    hasDisability: String(person.hasDisability ?? '').trim(),
    disabilityDetails: String(person.disabilityDetails ?? '').trim(),
    canSwim: String(person.canSwim ?? '').trim(),
    bautizosCompanions: companions.map((c) => ({
      bloodType: String(c?.bloodType ?? '').trim(),
      hasAllergy: String(c?.hasAllergy ?? '').trim(),
      allergyCategory: String(c?.allergyCategory ?? '').trim(),
      allergyDetails: String(c?.allergyDetails ?? '').trim(),
      hasDisease: String(c?.hasDisease ?? '').trim(),
      diseaseDetails: String(c?.diseaseDetails ?? '').trim(),
      diseaseMedication: String(c?.diseaseMedication ?? '').trim(),
      hasDisability: String(c?.hasDisability ?? '').trim(),
      disabilityDetails: String(c?.disabilityDetails ?? '').trim(),
    })),
  });
}

export function participantHasSensitiveHealthDataAddedBeyond(baseline, entry) {
  if (!participantHasSensitiveHealthData(entry)) return false;
  if (!baseline || !participantHasSensitiveHealthData(baseline)) return true;
  return sensitiveHealthDataFingerprint(baseline) !== sensitiveHealthDataFingerprint(entry);
}

/**
 * ¿Bloquear guardado por datos médicos sin consentimiento «Sí»?
 * En edición respeta registros previos al aviso de privacidad si no se agregaron datos nuevos.
 */
export function shouldBlockSensitiveHealthWithoutConsent(entry, privacyContext = {}) {
  const priv = privacyContext && typeof privacyContext === 'object' ? privacyContext : {};
  if (priv.allowSensitiveWithoutConsent === true) return false;
  const sensConsent = priv.sensitiveConsent ?? entry?.sensitiveDataConsent ?? '';
  if (isSiValue(sensConsent)) return false;
  if (!participantHasSensitiveHealthData(entry)) return false;
  if (String(sensConsent).trim() === 'No') return true;
  const baseline = priv.originalPerson;
  if (baseline && participantHasSensitiveHealthData(baseline)) {
    return participantHasSensitiveHealthDataAddedBeyond(baseline, entry);
  }
  return true;
}

/** Elimina sensibles del objeto antes de persistir cuando no hay consentimiento. */
export function applySensitiveConsentToParticipantPayload(payload, consentRaw, options = {}) {
  const { preserveLegacySensitive = false } = options;
  const consent = normalizeSensitiveConsentValue(consentRaw);
  const out = { ...payload };
  delete out.sensitiveDataPurgedAt;
  if (consent === 'Si') return { ...out, sensitiveDataConsent: 'Si' };
  if (consent === '' && preserveLegacySensitive) {
    const c = normalizeSensitiveConsentValue(out.sensitiveDataConsent);
    if (c === 'Si' || c === 'No') out.sensitiveDataConsent = c;
    else {
      delete out.sensitiveDataConsent;
      delete out.sensitiveDataConsentAt;
    }
    return out;
  }
  const cleared = clearedSensitiveParticipantFields(out);
  if (consent === 'No') {
    return { ...out, ...cleared, sensitiveDataConsent: 'No' };
  }
  delete out.sensitiveDataConsent;
  delete out.sensitiveDataConsentAt;
  return { ...out, ...cleared };
}

/** Campos de identificación/contacto/inscripción purgados si no hubo aceptación del aviso. */
export const PERSONAL_PARTICIPANT_FIELDS = [
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

/** Anonimiza/borra PII del participante (post-retención sin aviso de privacidad). */
export function stripAllPersonalParticipantFields(person) {
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
  patch.privacyRetentionPurgedAt = new Date().toISOString();
  patch.sensitiveDataPurgedAt = patch.privacyRetentionPurgedAt;
  if (Array.isArray(person?.bautizosCompanions)) {
    patch.bautizosCompanions = person.bautizosCompanions.map((row) => ({
      ...row,
      name: 'Acompañante purgado',
      ...clearedCompanionSensitiveFields(),
    }));
  }
  return patch;
}

/**
 * Política de consentimiento para altas nuevas: conserva datos médicos en Firestore
 * aunque no haya consentimiento «Sí»; la purga programada los elimina tras el evento.
 */
export function applyRegistrationConsentPolicy(payload, opts = {}) {
  const {
    privacyNotice,
    privacyAccepted = false,
    sensitiveConsent,
    channel = 'manual_staff',
    existing = null,
  } = opts;
  const now = new Date().toISOString();
  let out = { ...(payload || {}) };
  delete out.sensitiveDataPurgedAt;
  delete out.privacyRetentionPurgedAt;

  const privacyFields = privacyConsentFieldsForSave({
    privacyNotice,
    privacyAccepted: !!privacyAccepted,
    sensitiveConsent: isSiValue(sensitiveConsent) ? 'Si' : '',
    channel,
    existing,
  });
  out = { ...out, ...privacyFields };

  if (isSiValue(sensitiveConsent)) {
    if (!out.sensitiveDataConsent) {
      out.sensitiveDataConsent = 'Si';
      out.sensitiveDataConsentAt = now;
    }
    return out;
  }

  out.sensitiveDataConsent = 'No';
  out.sensitiveDataConsentAt = now;
  return out;
}

/** ¿Mostrar modal de confirmación antes de guardar un alta nueva? */
export function needsRegistrationConsentConfirmation(privacyAccepted, sensitiveConsent) {
  return !privacyAccepted || !isSiValue(sensitiveConsent);
}

/** Mensaje de actividad al guardar consentimientos en un alta. */
export function buildRegistrationPrivacyActivityMessage(privacyNotice, privacyAccepted, sensitiveConsent) {
  const cfg = mergePrivacyNoticeConfig(privacyNotice);
  const days = cfg.sensitiveRetentionDays || DEFAULT_SENSITIVE_RETENTION_DAYS;
  const aviso = privacyAccepted
    ? `Aviso v${cfg.version} aceptado`
    : `Aviso no aceptado (purga total de datos a ${days} días post-evento)`;
  const med = isSiValue(sensitiveConsent)
    ? 'datos médicos: conservación indefinida'
    : `datos médicos: sin autorización (purga médica a ${days} días post-evento)`;
  return `${aviso}. Perfil permanente / ${med}.`;
}

/** Firestore solo admite `sensitiveDataConsent` en «Si» / «No» o ausente. */
export function sanitizeParticipantConsentForFirestoreWrite(payload) {
  const out = { ...(payload || {}) };
  delete out.sensitiveDataPurgedAt;
  const c = normalizeSensitiveConsentValue(out.sensitiveDataConsent);
  if (c === 'Si' || c === 'No') out.sensitiveDataConsent = c;
  else {
    delete out.sensitiveDataConsent;
  }
  return out;
}

/**
 * En actualizaciones parciales (`updateDoc`/`merge`), un consentimiento inválido ya guardado
 * (p. ej. `''`) hace fallar las reglas aunque el patch solo toque `registeredAt`.
 */
export function participantConsentFirestoreRepairPatch(existingPerson, deleteFieldFn) {
  if (!existingPerson || typeof existingPerson !== 'object' || typeof deleteFieldFn !== 'function') {
    return {};
  }
  const c = normalizeSensitiveConsentValue(existingPerson.sensitiveDataConsent);
  if (c === 'Si' || c === 'No') return {};
  const patch = {};
  if (Object.prototype.hasOwnProperty.call(existingPerson, 'sensitiveDataConsent')) {
    patch.sensitiveDataConsent = deleteFieldFn();
  }
  if (Object.prototype.hasOwnProperty.call(existingPerson, 'sensitiveDataConsentAt')) {
    patch.sensitiveDataConsentAt = deleteFieldFn();
  }
  return patch;
}

/** Patch parcial + limpieza de consentimiento inválido (abonos, comentarios, etc.). */
export function participantPatchForFirestoreWrite(existingPerson, patch, deleteFieldFn) {
  return {
    ...(patch && typeof patch === 'object' ? patch : {}),
    ...participantConsentFirestoreRepairPatch(existingPerson, deleteFieldFn),
  };
}

export function privacyConsentFieldsForSave({
  privacyNotice,
  privacyAccepted,
  sensitiveConsent,
  channel,
  existing,
}) {
  const cfg = mergePrivacyNoticeConfig(privacyNotice);
  const now = new Date().toISOString();
  /** Solo campos de privacidad; nunca el documento completo (evita pisar ediciones en merge). */
  const out = {};
  if (privacyAccepted) {
    out.privacyNoticeVersion = cfg.version;
    out.privacyNoticeAcceptedAt = now;
    out.privacyNoticeChannel = channel || String(existing?.privacyNoticeChannel || '').trim() || '';
  }
  const sens = normalizeSensitiveConsentValue(sensitiveConsent);
  if (!sens) return out;
  if (String(existing?.sensitiveDataConsent || '') !== sens) {
    out.sensitiveDataConsent = sens;
    out.sensitiveDataConsentAt = now;
  } else if (!existing?.sensitiveDataConsentAt) {
    out.sensitiveDataConsent = sens;
    out.sensitiveDataConsentAt = now;
  }
  return out;
}

/** ISO date (YYYY-MM-DD) + days → compare if purge deadline passed. */
export function isEventPastSensitiveRetention(eventEndIso, retentionDays, todayIso) {
  const end = String(eventEndIso || '').trim();
  if (!end) return false;
  const days = Number.isFinite(Number(retentionDays)) ? Number(retentionDays) : DEFAULT_SENSITIVE_RETENTION_DAYS;
  const today = String(todayIso || new Date().toISOString().slice(0, 10)).trim();
  const endDate = new Date(`${end}T12:00:00`);
  if (Number.isNaN(endDate.getTime())) return false;
  endDate.setDate(endDate.getDate() + days);
  const deadline = endDate.toISOString().slice(0, 10);
  return today > deadline;
}

export function getEventEffectiveEndDateFromDoc(ev) {
  const end = String(ev?.dateEnd || '').trim();
  if (end) return end;
  return String(ev?.date || '').trim();
}
