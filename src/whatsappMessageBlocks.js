/**
 * Bloques comunes de mensajes WhatsApp (sin mensajería de grupo Bautizos-evento).
 */
import { WA_EMOJI as E } from './whatsappEmojiConstants.js';
import {
  collectCarMetaMissingFieldLabels,
  formatCarMetaDisplayValue,
  normalizeCarVehicleMeta,
} from './bautizosCarMeta.js';

/** @param {string} loc @param {object} eventSnapshot */
export function resolveWaOrgContactLabel(loc, eventSnapshot) {
  const campa = String(eventSnapshot?.eventType || '') === 'Campa';
  if (campa) return 'Tribu Norte';
  return resolveVnOfficeContactLabel(loc);
}

const VN_OFFICE_SUR_SEDES = new Set(['sur', 'neza', 'coapa']);
const VN_OFFICE_NORTE_SEDES = new Set(['norte', 'izcalli']);

/** Etiqueta de contacto según sede inscrita (mensajes WA de oficina). */
export function resolveVnOfficeContactLabel(loc) {
  const key = String(loc || '')
    .trim()
    .toLocaleLowerCase('es');
  if (VN_OFFICE_SUR_SEDES.has(key)) return 'la Oficina VN Sur';
  if (VN_OFFICE_NORTE_SEDES.has(key)) return 'la Oficina VN Norte';
  return 'la Oficina VN Norte';
}

/**
 * @param {{ personName?: string, officeLabel?: string, purposeLine?: string }} p
 */
export function buildWaMessageHeader({ personName = '', officeLabel = '', purposeLine = '' }) {
  const name = String(personName || '').trim();
  const org = String(officeLabel || '').trim();
  const purpose = String(purposeLine || '').trim();
  const orgPart = org ? `de ${org} ` : '';
  return `${E.wave} ¡Hola! ${name}, te contactamos ${orgPart}${purpose}`.replace(/\s+/g, ' ').trim();
}

export function formatPaymentDeadlineLabel(paymentDeadlineDate) {
  const raw = String(paymentDeadlineDate || '').trim();
  if (!raw) return '';
  const d = new Date(raw.includes('T') ? raw : `${raw}T12:00:00`);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function buildPaymentDeadlineAndRefundBlock(eventSnapshot, hasPendingDebt, paymentDeadlineDate = '') {
  if (!hasPendingDebt) return [];
  const deadline =
    formatPaymentDeadlineLabel(paymentDeadlineDate) ||
    formatPaymentDeadlineLabel(eventSnapshot?.paymentDeadlineDate);
  const lines = [];
  if (deadline) {
    lines.push(`    ${E.tearOffCalendar} Fecha límite de pago: ${deadline}`);
  }
  lines.push(
    '    Debes liquidar tu registro antes de esa fecha. Si no se liquida a tiempo, no se garantiza la devolución del dinero abonado.'
  );
  return lines;
}

/**
 * @param {{ inventory?: object[], requiresPassengers?: boolean }} p
 */
export function buildCarDataStatusLines(p) {
  const slots = Array.isArray(p?.inventory) ? p.inventory : [];
  if (!slots.length) return [];
  const lines = [`${E.automobile} Datos de vehículo registrados:`];
  slots.forEach((slot, idx) => {
    const meta = normalizeCarVehicleMeta(slot);
    const missing = collectCarMetaMissingFieldLabels(meta, {
      requiresPassengers: p?.requiresPassengers !== false,
    });
    const label = slots.length > 1 ? `Vehículo ${idx + 1}` : 'Vehículo';
    if (missing.length) {
      lines.push(`• ${label}: faltan ${missing.join(', ')}`);
    } else {
      lines.push(
        `• ${label}: ${formatCarMetaDisplayValue(meta) || 'completos'}`
      );
    }
  });
  return lines;
}
