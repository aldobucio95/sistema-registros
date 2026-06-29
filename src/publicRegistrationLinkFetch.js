import { getDoc, getDocs, query, where, limit } from 'firebase/firestore';
import { getDocRef, getColRef } from './firebaseRefs.js';
import { slugify } from './appRoutes.js';

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
