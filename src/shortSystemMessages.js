/**
 * Textos breves para avisos de sistema (red / Firestore / auth común en cliente).
 * Evitar mensajes genéricos tipo «intenta más tarde» sin causa.
 */

/** @param {unknown} err */
export function shortFirebaseClientMessage(err) {
  const code = err && typeof err === 'object' ? String(err.code || '').trim() : '';
  const msg = String(err?.message || '').toLowerCase();

  if (code === 'permission-denied') return 'Firestore bloqueó la acción (reglas o sesión).';
  if (code === 'unavailable') return 'Firestore no respondió (red inestable o servicio en pausa).';
  if (code === 'deadline-exceeded') return 'Firestore: tiempo agotado (red lenta o saturación).';
  if (code === 'resource-exhausted') return 'Firestore: límite o cuota alcanzada.';
  if (code === 'failed-precondition') return 'Firestore: datos locales desfasados; sincroniza o recarga.';
  if (code === 'aborted') return 'Operación cortada (red perdida o pestaña cerrada).';
  if (code === 'cancelled') return 'Petición cancelada.';
  if (code === 'network-request-failed') return 'Red: no se alcanzó Firebase.';
  if (code === 'auth/network-request-failed') return 'Auth: sin red hacia Firebase.';
  if (code === 'auth/too-many-requests') return 'Demasiados intentos; espera 1 minuto.';
  if (code === 'auth/internal-error') return 'Auth de Firebase falló (reintenta).';

  if (/failed to fetch|networkerror|load failed|offline|timed out/i.test(msg)) return 'Falló la red al hablar con el servidor.';

  return code ? `Firebase: ${code}` : 'Fallo de red o servidor.';
}

/** Errores típicos al cargar enlace público / lectura inicial. */
export function shortPublicLinkLoadMessage(err) {
  const code = err && typeof err === 'object' ? String(err.code || '').trim() : '';
  if (code === 'permission-denied') return 'Enlace: Firestore denegó la lectura (reglas).';
  if (code === 'unavailable') return 'Enlace: Firestore no disponible (red o mantenimiento).';
  if (code === 'deadline-exceeded') return 'Enlace: respuesta tardó demasiado (red lenta).';
  if (code === 'failed-precondition') return 'Enlace: índice o BD mal configurada en consola.';
  return shortFirebaseClientMessage(err);
}
