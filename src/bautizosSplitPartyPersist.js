/**
 * Atomic persist for Bautizos "grupo partido" (titular + bautizados vinculados).
 *
 * Sequential per-doc `setDoc` can leave the titular written while a satellite fails.
 * Retry is then blocked by VNPM / registration write-gate checks on the host id.
 */

export function validateBautizosSplitPartyWrites(writes) {
  if (!Array.isArray(writes) || writes.length < 2) {
    return 'El grupo partido requiere al menos titular y un bautizado vinculado.';
  }
  const seen = new Set();
  let hostCount = 0;
  for (const w of writes) {
    const docId = String(w?.docId || '').trim();
    if (!docId) return 'Falta el id de documento de un integrante del grupo.';
    if (!w?.data || typeof w.data !== 'object') {
      return 'Falta el payload de un integrante del grupo.';
    }
    if (seen.has(docId)) {
      return 'Dos integrantes del grupo comparten el mismo id de documento.';
    }
    seen.add(docId);
    const hostLink = String(w.data.bautizosSplitPartyHostParticipantId || '').trim();
    if (!hostLink) hostCount += 1;
  }
  if (hostCount !== 1) {
    return 'El grupo partido debe tener exactamente un titular.';
  }
  return null;
}

/**
 * Writes every split-party participant document in a single Firestore batch.
 *
 * @param {object} options
 * @param {Array<{ docId: string, data: object }>} options.writes
 * @param {object} options.db
 * @param {function} options.writeBatch
 * @param {function} options.getDocRef
 * @param {function} [options.sanitizeParticipantConsentForFirestoreWrite]
 * @returns {Promise<{ ok: true, docIds: string[] }>}
 */
export async function commitBautizosSplitPartyParticipantDocs({
  writes,
  db,
  writeBatch,
  getDocRef,
  sanitizeParticipantConsentForFirestoreWrite,
}) {
  const validationError = validateBautizosSplitPartyWrites(writes);
  if (validationError) {
    const err = new Error(validationError);
    err.code = 'split-party-invalid';
    throw err;
  }
  if (typeof writeBatch !== 'function' || !db || typeof getDocRef !== 'function') {
    throw new Error('Dependencias Firestore incompletas para grupo partido.');
  }
  const sanitize =
    typeof sanitizeParticipantConsentForFirestoreWrite === 'function'
      ? sanitizeParticipantConsentForFirestoreWrite
      : (payload) => payload;

  const batch = writeBatch(db);
  const docIds = [];
  for (const w of writes) {
    const docId = String(w.docId).trim();
    docIds.push(docId);
    batch.set(getDocRef('app_participants', docId), sanitize(w.data));
  }
  await batch.commit();
  return { ok: true, docIds };
}
