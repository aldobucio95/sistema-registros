/**
 * Donaciones en `app_donations`:
 * - `fromCancelledRefundDonation`: no suman otra vez al recaudado (el pago ya estaba en totales).
 * - `fromArchivedManualCredit` y donaciones manuales: sí suman (el archivo quitó el pago del recaudado o es aporte nuevo).
 */
export function donationAddsToRecaudacionBalance(d) {
  return d && !d.fromCancelledRefundDonation;
}
