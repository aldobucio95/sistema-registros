import {
  bautizosAttendancePaysEventListPrice,
  isFreeBautizosAttendance,
} from './bautizosAttendance.js';
import { isSiValue, resolveLlegaEnCarroPricing } from './bautizosSiUtils.js';
import { isLegacyBautizosParticipant } from './bautizosLegacyReadAdapter.js';

export const DEFAULT_BAUTIZOS_LIST_PRICE_FOOD = 150;
export const DEFAULT_BAUTIZOS_LIST_PRICE_TRANSPORT = 350;

export function getBautizosListPriceBreakdown(eventLike) {
  const food = Number(eventLike?.bautizosListPriceFood ?? DEFAULT_BAUTIZOS_LIST_PRICE_FOOD) || 0;
  const transport = Number(eventLike?.bautizosListPriceTransport ?? DEFAULT_BAUTIZOS_LIST_PRICE_TRANSPORT) || 0;
  return { food, transport, both: food + transport };
}

function isBautizosUnder3YearsAtEvent(personLike, eventLike) {
  const policy = String(eventLike?.bautizosLapInfantPolicy || '').trim();
  if (policy !== 'free') return false;
  const maxAge = Number(eventLike?.bautizosLapInfantMaxAge);
  if (!Number.isFinite(maxAge) || maxAge < 0) return false;
  const birth = String(personLike?.birthDate || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birth)) return false;
  const ref = String(eventLike?.dateStart || eventLike?.date || '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ref)) return false;
  const [by, bm, bd] = birth.split('-').map(Number);
  const [ry, rm, rd] = ref.split('-').map(Number);
  let age = ry - by;
  if (rm < bm || (rm === bm && rd < bd)) age -= 1;
  return age < maxAge;
}

/** Precio de lista por persona (modelo nuevo). */
export function getBautizosIndividualListPrice(personLike, eventLike = null) {
  if (!eventLike || eventLike.eventType !== 'Bautizos') return 0;
  if (!bautizosAttendancePaysEventListPrice(personLike)) return 0;
  if (isBautizosUnder3YearsAtEvent(personLike, eventLike)) return 0;
  const { food, transport } = getBautizosListPriceBreakdown(eventLike);
  let total = 0;
  if (isSiValue(personLike?.wantsBautizosFood)) total += food;
  const arrivesByCar = resolveLlegaEnCarroPricing(personLike);
  const transportWanted = isSiValue(personLike?.wantsBautizosTransport);
  if (transportWanted && !arrivesByCar) total += transport;
  return total;
}

/**
 * Precio efectivo para liquidación/UI (modelo plano: una persona = una cuota).
 * Registros legados con companions[]: solo la parte titular (comida/transporte propios).
 * El total del grupo se reparte vía FIFO en `resolveBautizosGlobalRegistryRowFinances`.
 */
export function getBautizosEffectiveListPrice(personLike, eventLike = null) {
  if (!personLike) return 0;
  if (isFreeBautizosAttendance(personLike)) return 0;
  const manual = Number(personLike?.registeredCostManual);
  if (Number.isFinite(manual) && manual >= 0 && personLike?.registeredCostManual != null) {
    if (!isLegacyBautizosParticipant(personLike)) return manual;
    return getBautizosIndividualListPrice(personLike, eventLike);
  }
  if (isLegacyBautizosParticipant(personLike)) {
    return getBautizosIndividualListPrice(personLike, eventLike);
  }
  return getBautizosIndividualListPrice(personLike, eventLike);
}
