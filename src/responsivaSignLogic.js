import { getDoc, getDocs, limit, query, setDoc, updateDoc, where, deleteField } from 'firebase/firestore';
import { getColRef, getDocRef, getPublicDocRef } from './firebaseRefs.js';
import { buildLogId, writeSnapshotDoc } from './activityLogCore.js';
import { withLogVisibleInPanel, buildLogEntityFields } from './activityLogsMeta.js';
import { uploadResponsivaSignatureImage, upsertResponsivaRegistryEntry } from './responsivaRegistry.js';
import { formatPersonNameString } from './participantNameFormat.js';
import { WA_EMOJI as E } from './whatsappEmojiConstants.js';
import { sanitizeFirestoreDocId } from './firestoreDocId.js';
import { appendPrivacyFooter } from './whatsappFinanceMessages.js';

export const RESPONSIVA_SIGN_TOKEN_COLLECTION = 'app_responsiva_sign_tokens';

/** 30 días */
export const RESPONSIVA_SIGN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Tamaño máximo aproximado del data URL (base64) para caber cómodo en un doc de participante. */
export const MAX_SIGNATURE_DATA_URL_CHARS = 450_000;

/** Mismo criterio que `publicRegistrationLogic` / formulario admin: 10 dígitos MX o prefijo +. */
export function digitsOnlyPhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

/** Igual que en registro principal / público: `XX-XXXX-XXXX` o línea internacional con `+`. */
export function formatPhoneNumber(value) {
  const v = String(value ?? '');
  if (v.startsWith('+')) return v.replace(/[^+0-9\s-]/g, '');
  const digits = v.replace(/\D/g, '').substring(0, 10);
  let formatted = digits.substring(0, 2);
  if (digits.length > 2) formatted += '-' + digits.substring(2, 6);
  if (digits.length > 6) formatted += '-' + digits.substring(6, 10);
  return formatted;
}

export function isValidPhone(phone) {
  const p = String(phone || '');
  return p.startsWith('+') ? p.length > 5 : p.replace(/\D/g, '').length === 10;
}

function trimStr(v) {
  return String(v ?? '').trim();
}

function normalizeContactNameForCompare(s) {
  return trimStr(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export const DEFAULT_RESPONSIVA_BODY = `Por medio del presente documento, el tutor o representante legal declara conocer y aceptar las condiciones de participación del menor en el evento, en los términos que la organización establezca.

La firma realizada en este formulario documenta el consentimiento para fines del registro del evento.`;

/** Texto por defecto cuando el participante es mayor de edad y firma por sí mismo (o quien corresponda). */
export const DEFAULT_RESPONSIVA_BODY_ADULT = `Por medio del presente documento, el participante declara conocer y aceptar las condiciones de participación en el evento, en los términos que la organización establezca.

La firma realizada en este formulario documenta el consentimiento para fines del registro del evento.`;

/**
 * Texto legal mostrado en la página de firma según edad del participante.
 * `responsivaDigitalText` actúa como respaldo si los campos específicos van vacíos.
 * @param {object} [eventLike]
 * @param {boolean} participantIsMinor
 */
export function resolveResponsivaBodyText(eventLike, participantIsMinor) {
  const legacy = String(eventLike?.responsivaDigitalText || '').trim();
  const minorsCustom = String(eventLike?.responsivaDigitalTextMinors || '').trim();
  const adultsCustom = String(eventLike?.responsivaDigitalTextAdults || '').trim();
  if (participantIsMinor) {
    return minorsCustom || legacy || DEFAULT_RESPONSIVA_BODY;
  }
  return adultsCustom || legacy || DEFAULT_RESPONSIVA_BODY_ADULT;
}

/** Alcance de edad para responsiva en el evento (`app_events.responsivaDigitalAgeScope`). */
export const RESPONSIVA_AGE_SCOPE_MINORS = 'minors';
export const RESPONSIVA_AGE_SCOPE_ADULTS = 'adults';
export const RESPONSIVA_AGE_SCOPE_BOTH = 'both';

/**
 * @param {object} [eventLike]
 * @returns {typeof RESPONSIVA_AGE_SCOPE_MINORS | typeof RESPONSIVA_AGE_SCOPE_ADULTS | typeof RESPONSIVA_AGE_SCOPE_BOTH}
 */
export function getResponsivaAgeScopeFromEvent(eventLike) {
  const s = String(eventLike?.responsivaDigitalAgeScope || 'minors')
    .trim()
    .toLowerCase();
  if (s === 'adults' || s === 'mayores' || s === 'adultos') return RESPONSIVA_AGE_SCOPE_ADULTS;
  if (s === 'both' || s === 'ambos') return RESPONSIVA_AGE_SCOPE_BOTH;
  return RESPONSIVA_AGE_SCOPE_MINORS;
}

/**
 * Valor legado `responsivaDigitalAgeScope` derivado de los flags por edad de firma digital
 * (para lectores que aún solo consultan el campo único).
 */
export function deriveResponsivaDigitalAgeScopeFromDigitalFlags(digitalMinorsEnabled, digitalAdultsEnabled) {
  if (digitalMinorsEnabled && digitalAdultsEnabled) return RESPONSIVA_AGE_SCOPE_BOTH;
  if (digitalMinorsEnabled) return RESPONSIVA_AGE_SCOPE_MINORS;
  if (digitalAdultsEnabled) return RESPONSIVA_AGE_SCOPE_ADULTS;
  return RESPONSIVA_AGE_SCOPE_MINORS;
}

/** Firma digital por enlace: si es `false`, no se envían enlaces ni aplica la página de firma. */
export function isResponsivaDigitalEnabledForEvent(eventLike) {
  return eventLike?.responsivaDigitalEnabled !== false;
}

/**
 * Responsiva «general» (estado / papel / obligatorio en registro) para menores.
 * Si no existen flags nuevos, se usa `responsivaDigitalAgeScope` como antes.
 */
export function isResponsivaGeneralMinorsBranchEnabled(eventLike) {
  const v = eventLike?.responsivaGeneralMinorsEnabled;
  if (v === true) return true;
  if (v === false) return false;
  const s = getResponsivaAgeScopeFromEvent(eventLike);
  return s === RESPONSIVA_AGE_SCOPE_MINORS || s === RESPONSIVA_AGE_SCOPE_BOTH;
}

/** Responsiva general para mayores de edad. */
export function isResponsivaGeneralAdultsBranchEnabled(eventLike) {
  const v = eventLike?.responsivaGeneralAdultsEnabled;
  if (v === true) return true;
  if (v === false) return false;
  const s = getResponsivaAgeScopeFromEvent(eventLike);
  return s === RESPONSIVA_AGE_SCOPE_ADULTS || s === RESPONSIVA_AGE_SCOPE_BOTH;
}

/** Firma digital por enlace para menores (independiente de la general). */
export function isResponsivaDigitalMinorsBranchEnabled(eventLike) {
  const v = eventLike?.responsivaDigitalMinorsEnabled;
  if (v === true) return true;
  if (v === false) return false;
  const s = getResponsivaAgeScopeFromEvent(eventLike);
  return s === RESPONSIVA_AGE_SCOPE_MINORS || s === RESPONSIVA_AGE_SCOPE_BOTH;
}

/** Firma digital por enlace para mayores. */
export function isResponsivaDigitalAdultsBranchEnabled(eventLike) {
  const v = eventLike?.responsivaDigitalAdultsEnabled;
  if (v === true) return true;
  if (v === false) return false;
  const s = getResponsivaAgeScopeFromEvent(eventLike);
  return s === RESPONSIVA_AGE_SCOPE_ADULTS || s === RESPONSIVA_AGE_SCOPE_BOTH;
}

/**
 * Firma digital activa en el evento y aplica al participante según su edad.
 */
export function isResponsivaDigitalActiveForParticipant(entryOrPerson, eventLike) {
  if (!eventLike || !isResponsivaEnabledForEvent(eventLike)) return false;
  if (!isResponsivaDigitalEnabledForEvent(eventLike)) return false;
  const ageNum = parseInt(entryOrPerson?.age, 10);
  const bracket = participantAgeBracketForResponsiva(ageNum);
  if (!bracket) return false;
  if (bracket === 'minor') return isResponsivaDigitalMinorsBranchEnabled(eventLike);
  return isResponsivaDigitalAdultsBranchEnabled(eventLike);
}

/**
 * Si conviene mostrar la sección/pestaña de responsivas (hay al menos un flujo activo por edad).
 */
export function isResponsivaEventSectionVisible(eventLike) {
  if (!isResponsivaEnabledForEvent(eventLike)) return false;
  return (
    isResponsivaGeneralMinorsBranchEnabled(eventLike) ||
    isResponsivaGeneralAdultsBranchEnabled(eventLike) ||
    (isResponsivaDigitalEnabledForEvent(eventLike) &&
      (isResponsivaDigitalMinorsBranchEnabled(eventLike) || isResponsivaDigitalAdultsBranchEnabled(eventLike)))
  );
}

/**
 * Si a este participante le aplica al menos un flujo de responsiva (general y/o digital) en UI de listas.
 */
export function getResponsivaParticipantRowApplies(person, eventLike) {
  if (!eventLike || !isResponsivaEnabledForEvent(eventLike)) return false;
  const ageNum = parseInt(person?.age, 10);
  const bracket = participantAgeBracketForResponsiva(ageNum);
  if (!bracket) return false;
  const gen =
    bracket === 'minor'
      ? isResponsivaGeneralMinorsBranchEnabled(eventLike)
      : isResponsivaGeneralAdultsBranchEnabled(eventLike);
  const dig = isResponsivaDigitalActiveForParticipant(person, eventLike);
  return gen || dig;
}

/** Toggle global por evento: al desactivarse, se oculta toda la capa de responsivas. */
export function isResponsivaEnabledForEvent(eventLike) {
  return eventLike?.responsivaEnabled !== false;
}

/**
 * @param {number} ageNum
 * @returns {'minor' | 'adult' | null}
 */
export function participantAgeBracketForResponsiva(ageNum) {
  if (!Number.isFinite(ageNum) || ageNum <= 0) return null;
  if (ageNum < 18) return 'minor';
  return 'adult';
}

/**
 * @param {number} ageNum
 * @param {string} scope
 */
export function participantMatchesResponsivaAgeScope(ageNum, scope) {
  const bracket = participantAgeBracketForResponsiva(ageNum);
  if (!bracket) return false;
  if (scope === RESPONSIVA_AGE_SCOPE_BOTH) return true;
  if (scope === RESPONSIVA_AGE_SCOPE_MINORS) return bracket === 'minor';
  if (scope === RESPONSIVA_AGE_SCOPE_ADULTS) return bracket === 'adult';
  return false;
}

/**
 * Si el participante debe tener `responsivaStatus` en Campa según el alcance del evento.
 * @param {object} entry
 * @param {object} [eventLike]
 */
export function registrationRequiresResponsivaStatus(entry, eventLike) {
  if (!eventLike || !isResponsivaEnabledForEvent(eventLike)) return false;
  const ageNum = parseInt(entry?.age, 10);
  const bracket = participantAgeBracketForResponsiva(ageNum);
  if (!bracket) return false;
  if (bracket === 'minor') return isResponsivaGeneralMinorsBranchEnabled(eventLike);
  return isResponsivaGeneralAdultsBranchEnabled(eventLike);
}

/**
 * Etiqueta para mensajes de validación (campo responsiva obligatorio).
 * @param {object} [eventLike]
 */
export function responsivaStatusValidationLabel(eventLike) {
  const gm = isResponsivaGeneralMinorsBranchEnabled(eventLike);
  const ga = isResponsivaGeneralAdultsBranchEnabled(eventLike);
  if (gm && ga) return 'Responsiva';
  if (gm && !ga) return 'Responsiva (menor de edad)';
  if (!gm && ga) return 'Responsiva (mayor de edad)';
  return 'Responsiva';
}

/**
 * Segmento legible del enlace (sin el secreto). Sin guiones bajos: el id del doc es `urlLabel_secret`.
 */
export function sanitizeForDocId(s) {
  return sanitizeFirestoreDocId(s, { maxChars: 100, fallback: 'registro' });
}

function slugifyNameForUrl(name) {
  return sanitizeForDocId(String(name || 'registro').trim()).slice(0, 48) || 'registro';
}

/**
 * Etiqueta de URL: ID VNPM si existe; si no, nombre + sufijo del id de participante.
 * @param {object} person
 */
export function buildResponsivaUrlLabel(person) {
  const vnp = String(person?.vnpPersonId || '').trim();
  if (vnp.length >= 6) {
    const compact = vnp.replace(/\s/g, '').replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-');
    const out = sanitizeForDocId(compact).slice(0, 80);
    if (out) return out;
  }
  const slug = slugifyNameForUrl(person?.name);
  const idPart = String(person?.id || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
  const combined = idPart ? `${slug}-${idPart}` : slug;
  return sanitizeForDocId(combined).slice(0, 80) || 'menor';
}

function newResponsivaSecret() {
  const bytes = new Uint8Array(9);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  const b64 = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  return b64.slice(0, 12);
}

/**
 * URL absoluta de la página de firma (respeta Vite `base`).
 * - Formato nuevo: `{ urlLabel, secret }` → `/responsiva-firma/:urlLabel/:secret`
 * - Legado: string → `/responsiva-firma/:token`
 * @param {string | { urlLabel: string, secret: string }} tokenOrParts
 */
export function getResponsivaSignPageUrl(tokenOrParts) {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://localhost';

  if (tokenOrParts && typeof tokenOrParts === 'object' && !Array.isArray(tokenOrParts)) {
    const urlLabel = String(tokenOrParts.urlLabel || '').trim();
    const secret = String(tokenOrParts.secret || '').trim();
    if (!urlLabel || !secret) return '';
    const a = encodeURIComponent(urlLabel);
    const b = encodeURIComponent(secret);
    const pathSeg = `responsiva-firma/${a}/${b}`;
    const pathname = base ? `${base}/${pathSeg}`.replace(/\/{2,}/g, '/') : `/${pathSeg}`;
    return new URL(pathname, origin).href;
  }

  const t = encodeURIComponent(String(tokenOrParts || '').trim());
  if (!t) return '';
  const pathSeg = `responsiva-firma/${t}`;
  const pathname = base ? `${base}/${pathSeg}`.replace(/\/{2,}/g, '/') : `/${pathSeg}`;
  return new URL(pathname, origin).href;
}

/**
 * @param {{ routeToken?: string, routeUrlLabel?: string, routeSecret?: string }} p
 * @returns {string}
 */
export function resolveResponsivaDocIdFromRoute({ routeToken, routeUrlLabel, routeSecret }) {
  if (routeUrlLabel != null && routeSecret != null && String(routeSecret).trim().length > 0) {
    let ul = String(routeUrlLabel).trim();
    let sec = String(routeSecret).trim();
    try {
      ul = decodeURIComponent(ul);
    } catch {
      /* */
    }
    try {
      sec = decodeURIComponent(sec);
    } catch {
      /* */
    }
    return `${ul}_${sec}`;
  }
  let t = String(routeToken || '').trim();
  try {
    t = decodeURIComponent(t);
  } catch {
    /* */
  }
  return t;
}

/**
 * @param {{ minorName?: string, eventName?: string, signUrl?: string, participantIsMinor?: boolean, remindMandatorySignature?: boolean }} p
 */
export function buildResponsivaInviteWhatsAppText({
  minorName,
  eventName,
  signUrl,
  participantIsMinor,
  remindMandatorySignature = false,
  avisoUrl = '',
}) {
  const fallback = participantIsMinor === false ? 'el participante' : 'el menor';
  const n = String(minorName || fallback).trim();
  const ev = String(eventName || 'el evento').trim();
  const url = String(signUrl || '').trim();
  const base = `${E.wave} Hola. Para firmar digitalmente la responsiva de ${n} (${ev}), abre este enlace:\n${E.link} ${url}\n\n${E.writingHand} Después de firmar, pulsa «Continuar» y luego «Enviar responsiva» para que quede registrada.`;
  const withMandatory = !remindMandatorySignature
    ? base
    : `${base}\n\n${E.warning} Importante: la firma de la responsiva es obligatoria para la asistencia al evento.`;
  return appendPrivacyFooter(withMandatory, avisoUrl);
}

/**
 * Dígitos internacionales para `https://wa.me/...` (al abrir, usar `buildWhatsAppMeUrl` en `whatsappUrl.js`).
 * @param {string} phone
 */
export function normalizeWhatsAppPhoneForLink(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 10) return null;
  if (digits.length === 10) return `52${digits}`;
  if (digits.startsWith('52') && digits.length === 12) return digits;
  return digits;
}

/**
 * Destino del enlace de responsiva por WhatsApp: menores → teléfono de emergencia (tutor); mayores → teléfono principal del registro.
 * Si falta el preferido, se usa el otro número como respaldo.
 * @param {object} person
 * @returns {string|null}
 */
export function getResponsivaWhatsAppTargetPhone(person) {
  const ageNum = parseInt(person?.age, 10);
  const bracket = participantAgeBracketForResponsiva(ageNum);
  const main = normalizeWhatsAppPhoneForLink(person?.phone);
  /** Si firmó con número distinto al del registro, queda en `emergencyPhoneResponsiva`. */
  const emergency =
    normalizeWhatsAppPhoneForLink(person?.emergencyPhoneResponsiva) ||
    normalizeWhatsAppPhoneForLink(person?.emergencyPhone);

  if (bracket === 'minor') {
    if (emergency) return emergency;
    return main || null;
  }
  if (bracket === 'adult') {
    if (main) return main;
    return emergency || null;
  }
  if (main) return main;
  return emergency || null;
}

/**
 * Crea el documento de token (lectura por quien tenga el enlace).
 * @param {{ participantId: string, eventId: string, person?: object }} p
 * @returns {Promise<{ docId: string, token: string, signUrl: string, urlLabel: string, secret: string, expiresAt: number }>}
 */
export async function createResponsivaSignTokenDoc({ participantId, eventId, person }) {
  const participantIdStr = String(participantId || '').trim();
  const eventIdStr = String(eventId || '').trim();
  if (!participantIdStr || !eventIdStr) {
    throw new Error('createResponsivaSignTokenDoc: participantId y eventId son obligatorios.');
  }

  const existingSnap = await getDocs(
    query(
      getColRef(RESPONSIVA_SIGN_TOKEN_COLLECTION),
      where('participantId', '==', participantIdStr),
      where('eventId', '==', eventIdStr),
      limit(1)
    )
  );
  if (!existingSnap.empty) {
    const existingDoc = existingSnap.docs[0];
    const existing = existingDoc.data() || {};
    const urlLabel = String(existing.urlLabel || '').trim();
    const secret = String(existing.secret || '').trim();
    return {
      docId: existingDoc.id,
      token: existingDoc.id,
      urlLabel,
      secret,
      signUrl: urlLabel && secret ? getResponsivaSignPageUrl({ urlLabel, secret }) : getResponsivaSignPageUrl(existingDoc.id),
      expiresAt: existing.expiresAt ?? null,
    };
  }

  let urlLabel = buildResponsivaUrlLabel(person || {});
  if (!urlLabel) urlLabel = 'registro';
  const secret = newResponsivaSecret();
  const docId = `${urlLabel}_${secret}`;
  const now = Date.now();
  const row = {
    participantId: participantIdStr,
    eventId: eventIdStr,
    urlLabel,
    secret,
    createdAt: now,
    expiresAt: now + RESPONSIVA_SIGN_TTL_MS,
    usedAt: null,
  };
  await setDoc(getDocRef(RESPONSIVA_SIGN_TOKEN_COLLECTION, docId), row);
  return {
    docId,
    token: docId,
    urlLabel,
    secret,
    signUrl: getResponsivaSignPageUrl({ urlLabel, secret }),
    expiresAt: row.expiresAt,
  };
}

async function readTokenDoc(token) {
  const t = String(token || '').trim();
  if (!t) return { ok: false, error: 'Enlace inválido.' };
  const snap = await getDoc(getPublicDocRef(RESPONSIVA_SIGN_TOKEN_COLLECTION, t));
  if (!snap.exists()) return { ok: false, error: 'Enlace no encontrado.' };
  return { ok: true, token: t, data: snap.data() };
}

/**
 * Carga participante y evento para la UI de firma.
 * @param {string} token id del documento de token (legado o `urlLabel_secret`)
 */
export async function loadResponsivaSignSession(token) {
  const tr = await readTokenDoc(token);
  if (!tr.ok) return tr;
  const td = tr.data;
  if (td.usedAt) return { ok: false, error: 'Esta responsiva ya fue enviada con este enlace.' };
  if (Date.now() > (td.expiresAt || 0)) {
    return { ok: false, error: 'Este enlace expiró. Solicita uno nuevo al equipo del evento.' };
  }

  const pSnap = await getDoc(getPublicDocRef('app_participants', td.participantId));
  if (!pSnap.exists()) return { ok: false, error: 'Registro no encontrado.' };
  const participant = { id: pSnap.id, ...pSnap.data() };
  if (String(participant.eventId) !== String(td.eventId)) {
    return { ok: false, error: 'Datos inconsistentes.' };
  }

  const eSnap = await getDoc(getPublicDocRef('app_events', td.eventId));
  const eventSnapshot = eSnap.exists()
    ? { id: eSnap.id, ...eSnap.data() }
    : { id: td.eventId, name: 'Evento' };

  if (!isResponsivaEnabledForEvent(eventSnapshot)) {
    return {
      ok: false,
      error: 'La responsiva está desactivada para este evento.',
    };
  }

  if (!isResponsivaDigitalEnabledForEvent(eventSnapshot)) {
    return {
      ok: false,
      error: 'La firma digital de responsiva está desactivada para este evento. Pide al equipo que la active en el Dashboard o entrega la responsiva por otro medio.',
    };
  }

  if (!isResponsivaDigitalActiveForParticipant(participant, eventSnapshot)) {
    const dm = isResponsivaDigitalMinorsBranchEnabled(eventSnapshot);
    const da = isResponsivaDigitalAdultsBranchEnabled(eventSnapshot);
    const scopeLabel =
      dm && !da
        ? 'menores de edad'
        : !dm && da
          ? 'mayores de edad'
          : dm && da
            ? 'el rango de edad configurado para firma digital en este evento'
            : 'el rango de edad configurado para este evento';
    return {
      ok: false,
      error: `Este enlace no corresponde a la edad del participante según la configuración del evento (solo ${scopeLabel}).`,
    };
  }

  const ageNum = parseInt(participant.age, 10);
  const bracket = participantAgeBracketForResponsiva(ageNum);
  const participantIsMinor = bracket === 'minor';

  const bodyText = resolveResponsivaBodyText(eventSnapshot, participantIsMinor);

  return {
    ok: true,
    token: tr.token,
    tokenDoc: td,
    participant,
    eventSnapshot,
    bodyText,
    participantIsMinor,
  };
}

async function appendResponsivaSignedActivityLog({ eventSnapshot, participant, token }) {
  try {
    const createdAt = Date.now();
    const newLogId = buildLogId(createdAt);
    const ev = eventSnapshot || {};
    const snapRes = await writeSnapshotDoc(newLogId, {
      entityType: 'responsiva',
      entityId: String(participant?.id || ''),
      createdAt,
      usePublic: true,
      snapshot: {
        kind: 'responsiva_firmada',
        eventId: ev.id || '',
        eventName: ev.name || '',
        participantId: String(participant?.id || ''),
        participantName: String(participant?.name || ''),
        tokenTail: String(token).slice(-8),
        responsivaStatus: participant?.responsivaStatus || '',
      },
    });
    await setDoc(getPublicDocRef('app_logs', String(newLogId)), withLogVisibleInPanel({
      id: newLogId,
      createdAt,
      eventId: ev.id || 'Global',
      eventName: ev.name || 'Evento',
      timestamp: new Date().toLocaleString('es-MX'),
      username: 'Responsiva digital',
      action: 'Responsiva digital',
      details: `Responsiva firmada y recibida para ${String(participant?.name || '').trim() || 'menor'} (token …${String(token).slice(-8)}).`,
      revertInfo: {
        collectionName: 'app_participants',
        docId: String(participant.id),
        action: 'update',
        previousData: null,
      },
      ...buildLogEntityFields({
        entityType: 'responsiva',
        entityId: String(participant?.id || ''),
        status: 'ok',
        hasSnapshot: snapRes.ok,
      }),
    }));
  } catch (e) {
    console.error('appendResponsivaSignedActivityLog', e);
  }
}

/**
 * Guarda firma, marca responsiva entregada y cierra el token.
 * @param {{ token: string, signerName: string, signerRelationship: string, signatureDataUrl: string, emergencyContactName: string, emergencyPhone: string }} p
 */
export async function submitResponsivaDigitalSignature({
  token,
  signerName,
  signerRelationship,
  signatureDataUrl,
  emergencyContactName,
  emergencyPhone,
}) {
  const tr = await readTokenDoc(token);
  if (!tr.ok) return tr;
  const td = tr.data;
  if (td.usedAt) return { ok: false, error: 'Esta responsiva ya fue enviada.' };
  if (Date.now() > (td.expiresAt || 0)) {
    return { ok: false, error: 'Este enlace expiró.' };
  }

  const pSnap = await getDoc(getPublicDocRef('app_participants', td.participantId));
  if (!pSnap.exists()) return { ok: false, error: 'Registro no encontrado.' };
  const participant = { id: pSnap.id, ...pSnap.data() };
  if (String(participant.eventId) !== String(td.eventId)) return { ok: false, error: 'Datos inconsistentes.' };

  const eSnap = await getDoc(getPublicDocRef('app_events', td.eventId));
  const eventSnapshot = eSnap.exists() ? { id: eSnap.id, ...eSnap.data() } : { id: td.eventId, name: 'Evento' };

  if (!isResponsivaEnabledForEvent(eventSnapshot)) {
    return { ok: false, error: 'La responsiva está desactivada para este evento.' };
  }

  if (!isResponsivaDigitalEnabledForEvent(eventSnapshot)) {
    return { ok: false, error: 'La firma digital está desactivada para este evento.' };
  }

  if (!isResponsivaDigitalActiveForParticipant(participant, eventSnapshot)) {
    return { ok: false, error: 'La edad del participante no coincide con la configuración de firma digital del evento.' };
  }

  const ageNum = parseInt(participant.age, 10);
  const bracket = participantAgeBracketForResponsiva(ageNum);
  const participantIsMinor = bracket === 'minor';

  const nameTrimmed = String(signerName || '').trim();
  if (nameTrimmed.length < 3) {
    return {
      ok: false,
      error: participantIsMinor
        ? 'Escribe el nombre completo de quien firma (tutor o representante legal).'
        : 'Escribe el nombre completo de quien firma.',
    };
  }
  const name = formatPersonNameString(nameTrimmed);

  const relRaw = String(signerRelationship || '').trim();
  /** Menor: parentesco obligatorio. Mayor: no se guarda parentesco (solo nombre del firmante). */
  let signerRelationshipStored = '';
  if (participantIsMinor) {
    if (relRaw.length < 2) {
      return {
        ok: false,
        error: 'Indica el parentesco con el menor (obligatorio). Ej.: madre, padre, tutor legal.',
      };
    }
    signerRelationshipStored = relRaw;
  }

  const declaredContactTrimmed = trimStr(emergencyContactName);
  if (declaredContactTrimmed.length < 2) {
    return {
      ok: false,
      error: 'Nombre del contacto de emergencia obligatorio (al menos 2 caracteres).',
    };
  }
  const declaredContactName = formatPersonNameString(declaredContactTrimmed);

  const emergencyFormatted = formatPhoneNumber(String(emergencyPhone ?? ''));
  if (!isValidPhone(emergencyFormatted)) {
    return {
      ok: false,
      error: 'Teléfono del contacto de emergencia obligatorio: 10 dígitos (formato XX-XXXX-XXXX como en el registro).',
    };
  }

  const regContactName = trimStr(participant.emergencyContact);
  const regNameOk = regContactName.length >= 2;
  const contactNameDiffersFromRegistration =
    regNameOk &&
    normalizeContactNameForCompare(declaredContactTrimmed) !== normalizeContactNameForCompare(regContactName);

  const regDigits = digitsOnlyPhone(participant.emergencyPhone || '');
  const typedDigits = digitsOnlyPhone(emergencyFormatted);
  const regHas10 = regDigits.length === 10;
  const emergencyPhoneDiffersFromRegistration = regHas10 && typedDigits.length === 10 && regDigits !== typedDigits;

  const sig = String(signatureDataUrl || '').trim();
  if (!sig.startsWith('data:image/')) {
    return { ok: false, error: 'Falta la firma en el recuadro.' };
  }
  if (sig.length > MAX_SIGNATURE_DATA_URL_CHARS) {
    return { ok: false, error: 'La firma es demasiado grande. Borra y vuelve a firmar con trazo más simple.' };
  }

  const now = Date.now();
  const prevRd =
    participant.responsivaDigital && typeof participant.responsivaDigital === 'object'
      ? participant.responsivaDigital
      : {};

  let signatureStoragePath = null;
  let signatureStorageUrl = null;
  try {
    const up = await uploadResponsivaSignatureImage({
      eventId: td.eventId,
      participantId: participant.id,
      dataUrl: sig,
      usePublic: true,
    });
    if (up) {
      signatureStoragePath = up.path;
      signatureStorageUrl = up.url;
    }
  } catch (e) {
    console.warn('uploadResponsivaSignatureImage', e);
  }

  const responsivaDigital = {
    ...prevRd,
    method: 'digital',
    signedAt: now,
    submittedAt: now,
    signerName: name,
    signerRelationship: signerRelationshipStored,
    emergencyContactConfirmed: declaredContactName,
    emergencyContactRegisteredSnapshot: regContactName || null,
    emergencyContactDiffersFromRegistration: contactNameDiffersFromRegistration,
    emergencyPhoneConfirmed: emergencyFormatted,
    emergencyPhoneRegisteredSnapshot: String(participant.emergencyPhone || '').trim() || null,
    emergencyPhoneDiffersFromRegistration: emergencyPhoneDiffersFromRegistration,
    signatureDataUrl: sig,
    signTokenSuffix: String(token).slice(-12),
    ...(signatureStoragePath ? { signatureStoragePath } : {}),
    ...(signatureStorageUrl ? { signatureStorageUrl } : {}),
  };

  const participantPatch = {
    responsivaStatus: 'Entregada',
    responsivaDigital,
  };
  if (contactNameDiffersFromRegistration) {
    participantPatch.emergencyContactResponsiva = declaredContactName;
  } else {
    participantPatch.emergencyContact = declaredContactName;
    participantPatch.emergencyContactResponsiva = deleteField();
  }
  if (emergencyPhoneDiffersFromRegistration) {
    participantPatch.emergencyPhoneResponsiva = emergencyFormatted;
  } else {
    participantPatch.emergencyPhone = emergencyFormatted;
    participantPatch.emergencyPhoneResponsiva = deleteField();
  }

  await updateDoc(getPublicDocRef('app_participants', participant.id), participantPatch);

  await updateDoc(getPublicDocRef(RESPONSIVA_SIGN_TOKEN_COLLECTION, tr.token), { usedAt: now });

  try {
    await upsertResponsivaRegistryEntry({
      eventId: td.eventId,
      participantId: String(participant.id),
      participantName: participant.name,
      location: participant.location,
      kind: 'digital',
      submittedAt: now,
      recordedAt: null,
      signerName: name,
      signerRelationship: signerRelationshipStored || null,
      signatureStoragePath,
      signatureStorageUrl,
      hasSignatureImage: true,
      usePublic: true,
    });
  } catch (e) {
    console.warn('upsertResponsivaRegistryEntry', e);
  }

  await appendResponsivaSignedActivityLog({ eventSnapshot, participant, token: tr.token });

  const mergedForLink = {
    ...participant,
    emergencyContact: contactNameDiffersFromRegistration ? participant.emergencyContact : declaredContactName,
    emergencyPhone: emergencyPhoneDiffersFromRegistration ? participant.emergencyPhone : emergencyFormatted,
  };
  if (contactNameDiffersFromRegistration) {
    mergedForLink.emergencyContactResponsiva = declaredContactName;
  } else {
    delete mergedForLink.emergencyContactResponsiva;
  }
  if (emergencyPhoneDiffersFromRegistration) {
    mergedForLink.emergencyPhoneResponsiva = emergencyFormatted;
  } else {
    delete mergedForLink.emergencyPhoneResponsiva;
  }

  return {
    ok: true,
    participantName: participant.name,
    eventName: eventSnapshot.name,
    phone: getResponsivaWhatsAppTargetPhone(mergedForLink),
    participantIsMinor: participantAgeBracketForResponsiva(ageNum) === 'minor',
  };
}
