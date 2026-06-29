/**
 * Elimina `undefined` y normaliza valores no soportados antes de escribir en Firestore.
 */
export function sanitizeJsonForFirestore(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeJsonForFirestore(item)).filter((item) => item !== undefined);
  }
  if (typeof value === 'object') {
    const out = {};
    for (const [key, nested] of Object.entries(value)) {
      if (nested === undefined) continue;
      const sanitized = sanitizeJsonForFirestore(nested);
      if (sanitized !== undefined) out[key] = sanitized;
    }
    return out;
  }
  return null;
}

/** Detecta sentinelas de Firestore (`deleteField`, etc.) en parches de merge. */
export function isFirestoreDeleteFieldValue(value) {
  return (
    value != null &&
    typeof value === 'object' &&
    typeof value._methodName === 'string' &&
    value._methodName.toLowerCase().includes('delete')
  );
}

/** Parche seguro para estado local tras `setDoc`/`updateDoc` (sin FieldValue ni undefined). */
export function patchForLocalParticipantCache(patch) {
  if (!patch || typeof patch !== 'object') return {};
  const out = {};
  for (const [key, val] of Object.entries(patch)) {
    if (val === undefined || isFirestoreDeleteFieldValue(val)) continue;
    out[key] = val;
  }
  return out;
}
