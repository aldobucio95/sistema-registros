import { getDoc, getDocs, query, where, limit } from 'firebase/firestore';
import { getDocRef, getColRef } from './firebaseRefs.js';
import { slugify } from './appRoutes.js';
import {
  PUBLIC_REG_LIVE_EVENT_MISSING,
  PUBLIC_REG_LIVE_EVENT_UNKNOWN,
  publicRegistrationLiveEventDecision,
} from './publicRegistrationEventGuard.js';

/** Lectura del documento de enlace público (id directo o `urlSlug`). */
export async function fetchPublicRegistrationLinkSnapshot(linkKey) {
  const ref = getDocRef('app_public_registration_links', linkKey);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap;
  const sk = slugify(linkKey) || String(linkKey).trim().toLowerCase();
  if (!sk) return snap;
  const q = query(getColRef('app_public_registration_links'), where('urlSlug', '==', sk), limit(1));
  const qs = await getDocs(q);
  if (qs.empty) return snap;
  return qs.docs[0];
}

/**
 * Comprueba si `app_events/{eventId}` sigue existiendo (auth anónima o staff).
 * `unknown` si la lectura falla: no bloquear el formulario; el submit reintenta.
 */
export async function fetchLiveEventDecisionForPublicRegistration(eventId) {
  const id = String(eventId || '').trim();
  if (!id) return PUBLIC_REG_LIVE_EVENT_MISSING;
  try {
    const snap = await getDoc(getDocRef('app_events', id));
    return publicRegistrationLiveEventDecision(snap);
  } catch {
    return PUBLIC_REG_LIVE_EVENT_UNKNOWN;
  }
}
