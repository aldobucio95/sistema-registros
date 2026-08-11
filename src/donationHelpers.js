/**
 * Donaciones en `app_donations`:
 * - `fromCancelledRefundDonation`: no suman otra vez al recaudado (el pago ya estaba en totales).
 * - `fromArchivedManualCredit` y donaciones manuales: sí suman (el archivo quitó el pago del recaudado o es aporte nuevo).
 */
export function donationAddsToRecaudacionBalance(d) {
  return d && !d.fromCancelledRefundDonation;
}

/**
 * Donaciones ligadas a un terminal financiero del participante (baja→donación o archivo→saldo a favor).
 * Borrar solo el doc en `app_donations` deja al participante con flags (`refundAsDonation`,
 * `archivedManualCreditAmount`) que bloquean re-marcar / reabrir el saldo, sin fila en el libro.
 */
export function donationIsLinkedParticipantTerminal(d) {
  if (!d || typeof d !== 'object') return false;
  if (d._syntheticArchivedCredit || d._syntheticCancelledRefund) return true;
  return !!(d.fromCancelledRefundDonation || d.fromArchivedManualCredit);
}

/** Mensaje al intentar eliminar una donación terminal ligada (UI + handler). */
export function linkedDonationDeleteBlockedMessage(d) {
  if (!d || typeof d !== 'object') {
    return 'Esta donación está ligada a un registro y no se puede eliminar desde aquí.';
  }
  if (d._syntheticArchivedCredit || d.fromArchivedManualCredit) {
    return 'Esta donación es el saldo a favor del archivo. No se puede borrar aquí; el monto sigue ligado al registro archivado. Reactiva/ajusta el archivo si debes corregirlo.';
  }
  if (d._syntheticCancelledRefund || d.fromCancelledRefundDonation) {
    return 'Esta donación es el saldo de baja marcado como donación. No se puede borrar aquí; el participante sigue con refundAsDonation. Usa reactivar o gestiona el saldo desde el registro dado de baja.';
  }
  return 'Esta donación está ligada a un registro y no se puede eliminar desde aquí.';
}
