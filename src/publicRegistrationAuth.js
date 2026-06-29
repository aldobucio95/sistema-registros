import { signInAnonymously, setPersistence, browserLocalPersistence, signOut } from 'firebase/auth';

/**
 * El envío público necesita sesión Firebase (reglas de participantes / escritura).
 */
export async function ensurePublicSubmitAuth(authInstance) {
  try {
    await setPersistence(authInstance, browserLocalPersistence);
  } catch {
    /* ventana privada u otros */
  }

  const refreshOrClear = async () => {
    const u = authInstance.currentUser;
    if (!u) return;
    try {
      await u.getIdToken(true);
    } catch {
      await signOut(authInstance);
    }
  };

  await refreshOrClear();

  if (!authInstance.currentUser) {
    let lastErr;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await signInAnonymously(authInstance);
        lastErr = undefined;
        break;
      } catch (e) {
        lastErr = e;
        if (attempt < 2) await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
      }
    }
    if (!authInstance.currentUser && lastErr) throw lastErr;
  }

  if (typeof authInstance.authStateReady === 'function') {
    await authInstance.authStateReady();
  }
  if (authInstance.currentUser) {
    await authInstance.currentUser.getIdToken();
  }
}
