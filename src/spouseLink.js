import { getDocFromCache, getDocFromServer, updateDoc, writeBatch } from 'firebase/firestore';
import { db, getDocRef } from './firebaseRefs.js';

/** Una lectura de red menos si el participante ya está en caché (p. ej. listener del evento). */
async function getParticipantDocPreferCache(ref) {
  try {
    return await getDocFromCache(ref);
  } catch {
    return getDocFromServer(ref);
  }
}

/** Mismo valor que `SI` en App.jsx / `isSiValue`. */
const SI = 'Si';
const NO = 'No';

function partnerMirrorUpdate(currentPersonId, currentPersonName) {
  const pid = String(currentPersonId || '').trim();
  const name = String(currentPersonName || '').trim();
  return {
    spouseParticipantId: pid,
    isMarried: SI,
    spouseName: name,
    spousePhone: '',
  };
}

function partnerUnlinkUpdate() {
  return {
    spouseParticipantId: '',
    isMarried: NO,
    spouseName: '',
    spousePhone: '',
  };
}

/**
 * Valida que el id elegido pueda vincularse como pareja antes de guardar el registro actual.
 * @param {{ eventId: string, spouseParticipantId: string, excludePersonId?: string|null }} args
 */
export async function validateSpouseParticipantChoice({ eventId, spouseParticipantId, excludePersonId }) {
  const sid = String(spouseParticipantId || '').trim();
  if (!sid) return { ok: true };
  const ref = getDocRef('app_participants', sid);
  const snap = await getParticipantDocPreferCache(ref);
  if (!snap.exists()) {
    return { ok: false, error: 'No se encontró el registro de la pareja seleccionada.' };
  }
  const d = snap.data();
  if (String(d.eventId || '') !== String(eventId || '')) {
    return { ok: false, error: 'La pareja pertenece a otro evento.' };
  }
  const o = String(d.spouseParticipantId || '').trim();
  const ex = excludePersonId != null ? String(excludePersonId).trim() : '';
  if (o && (!ex || o !== ex)) {
    return { ok: false, error: 'Esa persona ya está vinculada a otro registro. Desvincúlalos primero o elige otra pareja.' };
  }
  return { ok: true };
}

/**
 * Tras guardar el documento actual (con su `spouseParticipantId`), actualiza la pareja y desvincula la anterior.
 * En la pareja se escribe también `isMarried`, `spouseName` (nombre de quien vincula) y se limpia `spousePhone`.
 * @param {{ eventId: string, personId: string, previousSpouseId?: string, nextSpouseId?: string, currentPersonName?: string }} args
 */
export async function syncSpouseParticipantLinks({
  eventId,
  personId,
  previousSpouseId,
  nextSpouseId,
  currentPersonName = '',
}) {
  const pid = String(personId || '').trim();
  const prev = String(previousSpouseId || '').trim();
  const next = String(nextSpouseId || '').trim();
  if (!pid) return { ok: false, error: 'Falta el id del registro.' };

  const mirror = partnerMirrorUpdate(pid, currentPersonName);

  if (prev === next) {
    if (next) {
      const nextRef = getDocRef('app_participants', next);
      const nextSnap = await getParticipantDocPreferCache(nextRef);
      if (!nextSnap.exists()) {
        return { ok: false, error: 'No se encontró el registro de la pareja.' };
      }
      const nd = nextSnap.data();
      if (String(nd.eventId || '') !== String(eventId || '')) {
        return { ok: false, error: 'La pareja pertenece a otro evento.' };
      }
      const other = String(nd.spouseParticipantId || '').trim();
      if (other && other !== pid) {
        return { ok: false, error: 'Esa persona ya está vinculada a otro registro.' };
      }
      await updateDoc(nextRef, mirror);
    }
    return { ok: true };
  }

  const batch = writeBatch(db);

  if (prev && prev !== next) {
    const prevRef = getDocRef('app_participants', prev);
    const prevSnap = await getParticipantDocPreferCache(prevRef);
    if (prevSnap.exists()) {
      const pd = prevSnap.data();
      if (String(pd.spouseParticipantId || '').trim() === pid) {
        batch.update(prevRef, partnerUnlinkUpdate());
      }
    }
  }

  if (next) {
    const nextRef = getDocRef('app_participants', next);
    const nextSnap = await getParticipantDocPreferCache(nextRef);
    if (!nextSnap.exists()) {
      return { ok: false, error: 'No se encontró el registro de la pareja.' };
    }
    const nd = nextSnap.data();
    if (String(nd.eventId || '') !== String(eventId || '')) {
      return { ok: false, error: 'La pareja pertenece a otro evento.' };
    }
    const otherLink = String(nd.spouseParticipantId || '').trim();
    if (otherLink && otherLink !== pid) {
      return { ok: false, error: 'Esa persona ya está vinculada a otro registro.' };
    }
    batch.update(nextRef, mirror);
  }

  await batch.commit();
  return { ok: true };
}
