/**
 * Donaciones en `app_donations`:
 * - `fromCancelledRefundDonation`, `fromArchivedManualCredit`, `fromManualCredit`: no suman al recaudado
 *   (el pago ya estaba en totales o el dinero nunca salió / entró de nuevo).
 * - Donaciones manuales normales: sí suman (aporte nuevo).
 */
export function donationAddsToRecaudacionBalance(d) {
  return d && !d.fromCancelledRefundDonation && !d.fromArchivedManualCredit && !d.fromManualCredit;
}
