import { deleteUser, signOut } from 'firebase/auth';

/**
 * Borra la cuenta en Firebase Authentication si la sesión actual es anónima.
 * El registro público programa esto vía publicAnonymousAuthLifecycle (10 min tras éxito, 1 h sin registro).
 * No hace nada si hay sesión de staff u otro proveedor.
 */
export async function deleteCurrentUserIfAnonymous(authInstance) {
  if (!authInstance) return;
  const user = authInstance.currentUser;
  if (!user?.isAnonymous) return;
  try {
    await deleteUser(user);
  } catch (err) {
    console.warn('deleteCurrentUserIfAnonymous: no se pudo borrar cuenta anónima', err);
    try {
      await signOut(authInstance);
    } catch {
      /* */
    }
  }
}
