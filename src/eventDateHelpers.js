/**
 * Fechas del evento: rango general, rangos por segmento (Campa) y fecha límite de pago.
 * `date` en Firestore se mantiene como fecha “principal” (suele coincidir con el fin del rango).
 */

import { getCampaAttendanceSegmentForTransport } from './transportPlanningCore.js';

/** @param {string} a @param {string} b @returns {number} */
export function compareIsoDates(a, b) {
  const x = String(a || '').trim();
  const y = String(b || '').trim();
  if (!x || !y) return 0;
  return x.localeCompare(y);
}

/**
 * Fin del evento para validaciones (fases de precio, fecha límite).
 * @param {object} ev
 */
export function getEventEffectiveEndDate(ev) {
  const end = String(ev?.dateEnd || '').trim();
  if (end) return end;
  return String(ev?.date || '').trim();
}

/**
 * Inicio del evento (rango general).
 * @param {object} ev
 */
export function getEventEffectiveStartDate(ev) {
  const start = String(ev?.dateStart || '').trim();
  if (start) return start;
  return String(ev?.date || '').trim();
}

/** Evento de un solo día (misma fecha inicio/fin o solo una fecha definida). */
export function isEventSingleDay(evOrDraft) {
  const start = getEventEffectiveStartDate(evOrDraft);
  const end = getEventEffectiveEndDate(evOrDraft);
  if (!start && !end) return false;
  if (!start || !end) return true;
  return start === end;
}

/**
 * Tope para fechas de fases de pago: primero la fecha límite explícita, luego el fin del evento.
 * @param {object} ev
 * @param {object} [pricingFormLike] — puede incluir `paymentDeadlineDate` aún no guardada
 */
export function getPhaseDateMaxCap(ev, pricingFormLike) {
  const fromForm = String(pricingFormLike?.paymentDeadlineDate || '').trim();
  if (fromForm) return fromForm;
  const onEv = String(ev?.paymentDeadlineDate || '').trim();
  if (onEv) return onEv;
  return getEventEffectiveEndDate(ev) || '';
}

/**
 * Primer día ISO (YYYY-MM-DD) para el cierre «Nos vemos el…»: siempre inicio, nunca rango.
 * En Campa con rangos por segmento: Teens → `campaTeensDateStart`, Jóvenes → `campaJovenesDateStart`,
 * Ambos (servidor en ambos segmentos) → inicio global (`dateStart` / `date`).
 * @param {object} ev
 * @param {object} [person] — participante (segmento Campa); opcional fuera de Campa.
 * @returns {string}
 */
export function getNosVemosFirstDayIso(ev, person) {
  if (!ev || typeof ev !== 'object') return '';
  const isCampa = String(ev.eventType || '').trim() === 'Campa';
  if (isCampa && person && typeof person === 'object') {
    const seg = getCampaAttendanceSegmentForTransport(person);
    if (seg === 'Teens') {
      const t = String(ev.campaTeensDateStart || '').trim();
      return t || getEventEffectiveStartDate(ev);
    }
    if (seg === 'Jóvenes') {
      const t = String(ev.campaJovenesDateStart || '').trim();
      return t || getEventEffectiveStartDate(ev);
    }
    return getEventEffectiveStartDate(ev);
  }
  return getEventEffectiveStartDate(ev);
}

/**
 * Etiqueta legible (es-MX) del primer día para WhatsApp «Nos vemos el…».
 * @param {object} ev
 * @param {object} [person]
 * @returns {string} vacío si no hay fecha
 */
export function formatNosVemosDateLabel(ev, person) {
  const iso = getNosVemosFirstDayIso(ev, person);
  if (!iso) return '';
  return formatOne(iso);
}

/**
 * Texto corto para tarjetas (ej. Dashboard).
 * @param {object} ev
 */
export function formatEventDateRangeLabel(ev) {
  const start = getEventEffectiveStartDate(ev);
  const end = getEventEffectiveEndDate(ev);
  if (!start && !end) return 'Sin fecha';
  if (start && end && start !== end) {
    const a = new Date(`${start}T12:00:00`);
    const b = new Date(`${end}T12:00:00`);
    const o = { year: 'numeric', month: 'short', day: 'numeric' };
    return `${a.toLocaleDateString('es-MX', o)} – ${b.toLocaleDateString('es-MX', o)}`;
  }
  const one = start || end;
  return new Date(`${one}T12:00:00`).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Subtítulo opcional Campa: rangos Teens / Jóvenes.
 * @param {object} ev
 */
export function formatCampaSegmentDateLines(ev) {
  const lines = [];
  const ts = String(ev?.campaTeensDateStart || '').trim();
  const te = String(ev?.campaTeensDateEnd || '').trim();
  const js = String(ev?.campaJovenesDateStart || '').trim();
  const je = String(ev?.campaJovenesDateEnd || '').trim();
  if (ts || te) {
    lines.push(
      `Teens: ${ts && te && ts !== te ? `${formatOne(ts)} – ${formatOne(te)}` : formatOne(ts || te)}`
    );
  }
  if (js || je) {
    lines.push(
      `Jóvenes: ${js && je && js !== je ? `${formatOne(js)} – ${formatOne(je)}` : formatOne(js || je)}`
    );
  }
  return lines;
}

function formatOne(ymd) {
  if (!ymd) return '—';
  return new Date(`${ymd}T12:00:00`).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
