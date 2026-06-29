/**
 * URL absoluta del formulario público (misma app, respeta Vite `base` / subcarpeta).
 * El segmento de ruta usa el mismo slug que la URL del evento en el panel (/eventos/:slug/…).
 * En Firestore el documento sigue siendo `app_public_registration_links/{eventId}`; el campo `urlSlug` enlaza slug ↔ documento.
 */
import { eventUrlSlug } from './appRoutes.js';

/** Slug en la ruta `registro-publico/…` y valor guardado en `urlSlug` del documento del enlace. */
export function getPublicRegistrationUrlSlug(event) {
  if (!event || typeof event !== 'object') return '';
  return eventUrlSlug(event);
}

export function getPublicRegistrationPageUrl(event) {
  const seg = getPublicRegistrationUrlSlug(event);
  if (!seg) return '';
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const pathSeg = `registro-publico/${encodeURIComponent(seg)}`;
  const pathname = base ? `${base}/${pathSeg}`.replace(/\/{2,}/g, '/') : `/${pathSeg}`;
  return new URL(pathname, window.location.origin).href;
}
