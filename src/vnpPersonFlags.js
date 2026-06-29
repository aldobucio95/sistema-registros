import { doc, getDoc, query, setDoc, where, getDocs } from 'firebase/firestore';
import { getColRef } from './firebaseRefs.js';

export const VNP_PERSON_FLAGS_COLLECTION = 'app_vnp_person_flags';

function normalizeIdText(txt) {
  return String(txt || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u00f1/gi, 'n')
    .replace(/\u00df/gi, 'ss')
    .toUpperCase();
}

/** Misma regla que `canonicalizeVnpPersonId` en publicRegistrationLogic.js */
export function canonicalizeVnpPersonIdForFlags(raw) {
  const t = String(raw || '').trim();
  if (!t) return '';
  const m = t.match(/^VNPM-(.*)$/i);
  if (!m) return t;
  const rest = normalizeIdText(m[1]).replace(/[^A-Z0-9]/g, '');
  if (!rest) return '';
  return `VNPM-${rest}`;
}

/** Quien puede marcar personas de interés (SuperUsuario o admin delegado). */
export const PERSON_OF_INTEREST_REGISTRATION_MESSAGE_STAFF =
  'Esta persona está marcada como persona de interés. Para registrarla o precargar sus datos, contacta a los administradores del sistema.';

/** Registro público (QR) y personal sin permiso de marcar. */
export const PERSON_OF_INTEREST_REGISTRATION_MESSAGE_PUBLIC =
  'Esta persona no se puede registrar. Por favor contacta a los administradores para más información';

/** @deprecated Usar `personOfInterestRegistrationBlockedMessage`. */
export const PERSON_OF_INTEREST_REGISTRATION_MESSAGE = PERSON_OF_INTEREST_REGISTRATION_MESSAGE_STAFF;

export function personOfInterestRegistrationBlockedMessage(canMarkPersonsOfInterest = false) {
  return canMarkPersonsOfInterest
    ? PERSON_OF_INTEREST_REGISTRATION_MESSAGE_STAFF
    : PERSON_OF_INTEREST_REGISTRATION_MESSAGE_PUBLIC;
}

function flagDocId(vnpId) {
  return canonicalizeVnpPersonIdForFlags(vnpId) || String(vnpId || '').trim();
}

export function isVnpPersonOfInterest(vnpId, interestSet) {
  const id = flagDocId(vnpId);
  if (!id) return false;
  if (interestSet instanceof Set) return interestSet.has(id);
  return false;
}

export async function fetchPersonOfInterestVnpSet() {
  const q = query(getColRef(VNP_PERSON_FLAGS_COLLECTION), where('personOfInterest', '==', true));
  const snap = await getDocs(q);
  const set = new Set();
  for (const d of snap.docs) {
    const id = flagDocId(d.id) || flagDocId(d.data()?.vnpPersonId);
    if (id) set.add(id);
  }
  return set;
}

/** Intervalo de sondeo en lugar de listener permanente (menos lecturas en Firestore). */
const PERSON_OF_INTEREST_POLL_MS = 120000;

export function subscribePersonOfInterestVnpSet(onChange, onError) {
  let stopped = false;
  let timer = null;

  const refresh = async () => {
    if (stopped) return;
    try {
      const set = await fetchPersonOfInterestVnpSet();
      if (!stopped) onChange(set);
    } catch (err) {
      if (!stopped && typeof onError === 'function') onError(err);
    }
  };

  void refresh();
  timer = setInterval(() => {
    void refresh();
  }, PERSON_OF_INTEREST_POLL_MS);

  return () => {
    stopped = true;
    if (timer) clearInterval(timer);
  };
}

export async function fetchVnpPersonFlag(vnpId) {
  const id = flagDocId(vnpId);
  if (!id) return null;
  const snap = await getDoc(doc(getColRef(VNP_PERSON_FLAGS_COLLECTION), id));
  if (!snap.exists()) return null;
  return { vnpPersonId: id, ...snap.data() };
}

export async function setVnpPersonOfInterestFlag(
  vnpId,
  { personOfInterest, markedBy = '', note = '', debugMeta = null } = {}
) {
  const id = flagDocId(vnpId);
  if (!id) throw new Error('ID VNPM inválido');
  const active = !!personOfInterest;
  const payload = {
    vnpPersonId: id,
    personOfInterest: active,
    updatedAt: new Date().toISOString(),
    ...(active
      ? {
          markedBy: String(markedBy || '').trim(),
          ...(String(note || '').trim() ? { note: String(note).trim() } : {}),
        }
      : {
          markedBy: '',
          note: '',
        }),
    ...(debugMeta && typeof debugMeta === 'object' ? debugMeta : {}),
  };
  await setDoc(doc(getColRef(VNP_PERSON_FLAGS_COLLECTION), id), payload, { merge: true });
  return payload;
}

/**
 * @param {object} personLike — participante o fila de perfil
 * @param {Set<string>} interestSet
 * @param {{ generateVnpPersonId?: function }} [opts]
 */
export function personLikeIsPersonOfInterest(personLike, interestSet, opts = {}) {
  if (!personLike || !(interestSet instanceof Set) || interestSet.size === 0) return false;
  const stored = flagDocId(personLike.vnpPersonId);
  if (stored && interestSet.has(stored)) return true;
  const gen = opts.generateVnpPersonId;
  if (typeof gen === 'function') {
    const generated = flagDocId(gen(personLike));
    if (generated && interestSet.has(generated)) return true;
  }
  return false;
}

export function resolveVnpIdsForRegistrationInterestCheck(entry, eventType, helpers = {}) {
  const { generateVnpPersonId, buildParticipantLikeForBautizosSplitSlot, getBautizosSplitPartySlotDescriptors, hasBautizosBaptizedCompanionInParty } =
    helpers;
  const ids = [];
  const pushId = (pl) => {
    const id = flagDocId(pl?.vnpPersonId) || (typeof generateVnpPersonId === 'function' ? flagDocId(generateVnpPersonId(pl)) : '');
    if (id) ids.push(id);
  };
  pushId(entry);
  if (
    eventType === 'Bautizos' &&
    typeof hasBautizosBaptizedCompanionInParty === 'function' &&
    hasBautizosBaptizedCompanionInParty(entry) &&
    typeof getBautizosSplitPartySlotDescriptors === 'function' &&
    typeof buildParticipantLikeForBautizosSplitSlot === 'function'
  ) {
    for (const d of getBautizosSplitPartySlotDescriptors(entry) || []) {
      if (d.slotKey === 'host') continue;
      pushId(buildParticipantLikeForBautizosSplitSlot(entry, '', d));
    }
  }
  return [...new Set(ids)];
}

export function registrationPersonOfInterestMessage(entry, interestSet, helpers = {}) {
  if (!interestSet?.size) return null;
  const blockedMsg = personOfInterestRegistrationBlockedMessage(!!helpers.canMarkPersonsOfInterest);
  if (personLikeIsPersonOfInterest(entry, interestSet, helpers)) return blockedMsg;
  const eventType = helpers.eventType;
  const ids = resolveVnpIdsForRegistrationInterestCheck(entry, eventType, helpers);
  for (const id of ids) {
    if (interestSet.has(id)) return blockedMsg;
  }
  return null;
}

export async function assertRegistrationNotPersonOfInterest(entry, eventType, helpers = {}) {
  const ids = resolveVnpIdsForRegistrationInterestCheck(entry, eventType, helpers);
  const blockedMsg = personOfInterestRegistrationBlockedMessage(!!helpers.canMarkPersonsOfInterest);
  for (const id of ids) {
    const flag = await fetchVnpPersonFlag(id);
    if (flag?.personOfInterest) return blockedMsg;
  }
  return null;
}
