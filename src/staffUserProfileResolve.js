import { getDocs, query, where, limit } from 'firebase/firestore';
import { getColRef } from './firebaseRefs.js';
import { usernameToAuthEmail } from './firebaseConfig.js';

function staffProfileFromDoc(d) {
  return { id: d.id, ...d.data() };
}

/**
 * Resuelve el perfil en `app_users` para una sesión Firebase Auth (1–3 lecturas puntuales).
 * @param {import('firebase/auth').User} fbUser
 */
export async function resolveStaffUserProfileFromAuth(fbUser) {
  if (!fbUser?.uid) return null;
  try {
    let qSnap = await getDocs(
      query(getColRef('app_users'), where('authUid', '==', fbUser.uid), limit(1))
    );
    if (!qSnap.empty) return staffProfileFromDoc(qSnap.docs[0]);

    const email = String(fbUser.email || '').trim().toLowerCase();
    if (email) {
      qSnap = await getDocs(
        query(getColRef('app_users'), where('authEmail', '==', email), limit(1))
      );
      if (!qSnap.empty) return staffProfileFromDoc(qSnap.docs[0]);
    }
  } catch (e) {
    console.warn('[staff-profile] resolveStaffUserProfileFromAuth', e);
  }
  return null;
}

export function staffUserIsAdminProfile(profile) {
  const role = String(profile?.role ?? '').trim();
  return role === 'Administrador' || role === 'SuperUsuario';
}

/**
 * Perfiles sin `authUid` que coinciden con el correo (vinculación automática al primer login).
 */
export async function findPendingStaffProfileForAuthEmail(fbUser) {
  const email = String(fbUser?.email || '').trim().toLowerCase();
  if (!email) return null;
  try {
    const qSnap = await getDocs(
      query(getColRef('app_users'), where('authEmail', '==', email), limit(5))
    );
    for (const d of qSnap.docs) {
      if (!d.data().authUid) return staffProfileFromDoc(d);
    }
    const allSnap = await getDocs(query(getColRef('app_users'), limit(100)));
    for (const d of allSnap.docs) {
      const data = d.data();
      if (data.authUid) continue;
      if (usernameToAuthEmail(data.username) === email) return staffProfileFromDoc(d);
    }
  } catch (e) {
    console.warn('[staff-profile] findPendingStaffProfileForAuthEmail', e);
  }
  return null;
}
