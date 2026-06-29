/**
 * Reglas unificadas para IDs de documento en Firestore:
 * - Acentos → vocal sin tilde (NFD + quitar marcas; ñ → n).
 * - Espacios → guiones.
 * - Otros caracteres no válidos → guiones (se conservan `_` y `-` si ya existían).
 */
export const FIRESTORE_DOC_ID_MAX_BYTES = 1500;

export function truncateUtf8Bytes(str, maxBytes) {
  const enc = new TextEncoder();
  if (enc.encode(str).length <= maxBytes) return str;
  let end = str.length;
  while (end > 0) {
    const slice = str.slice(0, end);
    if (enc.encode(slice).length <= maxBytes) return slice;
    end -= 1;
  }
  return '';
}

/**
 * @param {string} input
 * @param {{ maxBytes?: number, maxChars?: number, fallback?: string, lowercase?: boolean }} [options]
 */
export function sanitizeFirestoreDocId(input, options = {}) {
  const {
    maxBytes = FIRESTORE_DOC_ID_MAX_BYTES,
    maxChars,
    fallback = 'doc',
    lowercase = false,
  } = options;

  let s = String(input ?? '').trim();
  if (!s) return fallback;

  s = s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u00f1/gi, 'n')
    .replace(/\u00df/gi, 'ss')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (lowercase) s = s.toLowerCase();

  if (!s) return fallback;
  if (maxChars && maxChars > 0) s = s.slice(0, maxChars);
  s = truncateUtf8Bytes(s, maxBytes);
  return s || fallback;
}

/** Une segmentos con guion y aplica las mismas reglas. */
export function buildFirestoreDocId(segments, options = {}) {
  const parts = (Array.isArray(segments) ? segments : [segments])
    .map((x) => String(x ?? '').trim())
    .filter(Boolean);
  if (parts.length === 0) return options.fallback ?? 'doc';
  return sanitizeFirestoreDocId(parts.join('-'), options);
}

/**
 * ID de `app_events` a partir del nombre del evento.
 * @returns {{ ok: true, id: string } | { ok: false, error: string }}
 */
export function eventFirestoreDocIdFromHumanName(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) {
    return { ok: false, error: 'Escribe un nombre para el evento.' };
  }
  const id = sanitizeFirestoreDocId(trimmed, { fallback: '' });
  if (!id) {
    return { ok: false, error: 'El nombre del evento no es válido.' };
  }
  return { ok: true, id };
}
