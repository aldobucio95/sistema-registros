/**
 * Helpers de bautismo en Campa (talla de playera y chip «se bautiza»).
 * Extraídos de la superficie Bautizos-evento eliminada en v2.
 */

const SI = 'Si';
const SI_LABEL = 'Sí';

function isSiValue(v) {
  const s = String(v ?? '').trim();
  if (s === SI || s === SI_LABEL) return true;
  if (s.toLowerCase() === 'sí') return true;
  if (s.length === 2 && s[0] === 'S' && (s[1] === '?' || s[1] === '\uFFFD')) return true;
  return false;
}

export const BAPTISM_SHIRT_SIZES = Object.freeze(['CH', 'M', 'G', 'XL', 'XXL']);

export function normalizeBaptismShirtSize(raw) {
  const s = String(raw ?? '')
    .trim()
    .toUpperCase();
  if (!s) return '';
  if (BAPTISM_SHIRT_SIZES.includes(s)) return s;
  return '';
}

/**
 * Quién cuenta como «con chip de bautizo» en listados y roster.
 * Campa: `willBeBaptized`.
 */
export function participantHasBaptismChip(personLike, eventType) {
  const et = String(eventType || '').trim();
  if (personLike?._isCompanionWaitlistVirtual === true) return false;
  if (personLike?.__globalRegistryCompanionRow === true) return false;
  if (et === 'Campa') return isSiValue(personLike?.willBeBaptized);
  return false;
}
