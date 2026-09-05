/** Calendario de negocio (fases de precio, campañas, liquidación). */
export const BUSINESS_TIME_ZONE = 'America/Mexico_City';

/**
 * YYYY-MM-DD en America/Mexico_City.
 * No usar `toISOString().split('T')[0]`: después de las 18:00 en México esa fecha UTC ya es el día siguiente.
 * @param {number|Date} [input]
 */
export function toMexicoCityISODate(input = Date.now()) {
  const ms = input instanceof Date ? input.getTime() : Number(input);
  const d = new Date(Number.isFinite(ms) && ms > 0 ? ms : Date.now());
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const pick = (type) => parts.find((p) => p.type === type)?.value || '';
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}
