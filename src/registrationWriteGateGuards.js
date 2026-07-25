/**
 * Guards puros del write-gate de inscripción (panel + QR público).
 * Evita que un `setDoc` de reutilización de folio borre contabilidad pendiente.
 */

/**
 * @param {object|null|undefined} existing
 * @param {string} eventId
 * @returns {boolean}
 */
export function existingRegistrationBlocksDueToPendingRefund(existing, eventId) {
  if (!existing || typeof existing !== 'object') return false;
  if (String(existing?.eventId || '') !== String(eventId || '')) return false;
  return (Number(existing?.refundPendingAmount) || 0) > 0;
}
