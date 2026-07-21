/**
 * v2: ya no hay filas virtuales de acompañante en espera (eran del evento tipo Bautizos).
 * Solo se conserva detección/limpieza de docs fantasma `cw:…` por si quedan en Firestore.
 */
export function isCompanionWaitlistPhantomStoredParticipant(personLike) {
  if (personLike?._isCompanionWaitlistVirtual === true) return true;
  return String(personLike?.id || '').trim().startsWith('cw:');
}

export function stripCompanionWaitlistPhantomRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.filter((p) => !isCompanionWaitlistPhantomStoredParticipant(p));
}
