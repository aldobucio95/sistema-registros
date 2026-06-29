/**
 * Reglas de pago con tarjeta en `app_events`:
 * - `cardPaymentEnabled === false` desactiva tarjeta en todo el evento.
 * - Con el evento global activo, `cardPaymentByLocation[nombreSede] === false` desactiva solo esa sede.
 * @param {object|null|undefined} eventLike
 * @param {string} locName
 * @returns {boolean}
 */
export function isCardPaymentAllowedForLocation(eventLike, locName) {
  if (!eventLike || typeof eventLike !== 'object') return true;
  if (eventLike.cardPaymentEnabled === false) return false;
  const loc = String(locName || '').trim();
  if (!loc) return true;
  const per = eventLike.cardPaymentByLocation;
  if (per && typeof per === 'object' && per[loc] === false) return false;
  return true;
}
