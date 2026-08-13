/**
 * Guardas para no aceptar registro público contra un evento ya eliminado.
 * El QR vive en `app_public_registration_links` con un `eventSnapshot` copiado;
 * si el doc `app_events/{id}` desaparece, ese snapshot no debe seguir creando
 * participantes huérfanos.
 */

/** Snapshot live leído con éxito. */
export const PUBLIC_REG_LIVE_EVENT_OK = 'ok';
/** Lectura ok y el documento no existe (evento borrado). */
export const PUBLIC_REG_LIVE_EVENT_MISSING = 'missing';
/** Fallo de red/permiso: no bloquear; el submit reintentará. */
export const PUBLIC_REG_LIVE_EVENT_UNKNOWN = 'unknown';

/**
 * Interpreta un DocumentSnapshot de `app_events` (o un stub de test).
 * `exists` puede ser método (SDK modular) o boolean.
 *
 * @param {object|null|undefined} liveSnap
 * @returns {'ok'|'missing'|'unknown'}
 */
export function publicRegistrationLiveEventDecision(liveSnap) {
  if (liveSnap == null || typeof liveSnap !== 'object') return PUBLIC_REG_LIVE_EVENT_UNKNOWN;
  let exists = false;
  if (typeof liveSnap.exists === 'function') {
    try {
      exists = !!liveSnap.exists();
    } catch {
      return PUBLIC_REG_LIVE_EVENT_UNKNOWN;
    }
  } else if (liveSnap.exists === true) {
    exists = true;
  } else if (liveSnap.exists === false) {
    exists = false;
  } else {
    return PUBLIC_REG_LIVE_EVENT_UNKNOWN;
  }
  return exists ? PUBLIC_REG_LIVE_EVENT_OK : PUBLIC_REG_LIVE_EVENT_MISSING;
}

export function buildPublicRegistrationMissingEventError() {
  return {
    ok: false,
    error: [
      'Motivo: este evento ya no existe o fue eliminado.',
      'El formulario de registro público quedó desactivado. Contacta a la organización si necesitas inscribirte.',
    ].join('\n'),
  };
}

export const PUBLIC_REGISTRATION_MISSING_EVENT_LOAD_MESSAGE =
  'Este evento ya no está disponible. El enlace de registro quedó desactivado.';
