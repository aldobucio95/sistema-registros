import { buildLogId } from './activityLogCore.js';

export const WHATSAPP_MESSAGE_SEPARATOR = '--- Mensaje enviado ---';

/** Normaliza saltos de línea del cuerpo del mensaje WA. */
export function normalizeWhatsAppMessageBody(message) {
  return String(message || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

function resolveRecipientLabel({ recipientName, recipientId } = {}) {
  return (
    String(recipientName || '').trim() ||
    (recipientId != null ? String(recipientId).trim() : '') ||
    'participante'
  );
}

/** Vista comprimida del log: solo destinatario y sede. */
export function buildWhatsAppSentLogSummary({ recipientName, recipientId, loc } = {}) {
  const name = resolveRecipientLabel({ recipientName, recipientId });
  const locLabel = String(loc || '').trim();
  const locPart = locLabel ? ` (sede ${locLabel})` : '';
  return `Envió WhatsApp a ${name}${locPart}.`;
}

/**
 * Detalle expandido: metadatos + mensaje completo con saltos de línea.
 */
export function buildWhatsAppSentLogFullDetails({
  recipientName,
  recipientId,
  loc,
  phone,
  channel,
  message,
} = {}) {
  const name = resolveRecipientLabel({ recipientName, recipientId });
  const locLabel = String(loc || '').trim();
  const locPart = locLabel ? ` (sede ${locLabel})` : '';
  const phoneDigits = String(phone || '').trim();
  const phonePart = phoneDigits ? `Teléfono: ${phoneDigits}` : '';
  const channelLabel = String(channel || '').trim();
  const channelPart = channelLabel ? `Origen: ${channelLabel}` : '';
  const body = normalizeWhatsAppMessageBody(message);

  const headerLines = [`Envió WhatsApp a ${name}${locPart}.`];
  if (phonePart) headerLines.push(phonePart);
  if (channelPart) headerLines.push(channelPart);

  return `${headerLines.join('\n')}\n\n${WHATSAPP_MESSAGE_SEPARATOR}\n\n${body || '—'}`;
}

/** @deprecated usar buildWhatsAppSentLogFullDetails */
export function buildWhatsAppSentLogDetails(opts) {
  return buildWhatsAppSentLogFullDetails(opts);
}

/** Texto corto para la fila comprimida (incluye logs legacy con mensaje embebido). */
export function formatActivityLogDetailsForDisplay(log) {
  const details = String(log?.details || '').trim();
  if (String(log?.action || '').trim().toLowerCase() !== 'whatsapp') return details || '—';
  if (!details.includes(WHATSAPP_MESSAGE_SEPARATOR)) return details || '—';
  const summary = details.split(WHATSAPP_MESSAGE_SEPARATOR)[0].trim();
  const firstLine = summary.split('\n').map((line) => line.trim()).find(Boolean);
  return firstLine || details;
}

/** Mensaje completo legible desde snapshot `whatsapp_enviado`. */
export function describeWhatsAppSentSnapshot(snapshot) {
  if (!snapshot || snapshot.kind !== 'whatsapp_enviado') return null;
  if (snapshot.fullDetailsText) return String(snapshot.fullDetailsText);
  if (snapshot.detailsText) return String(snapshot.detailsText);
  return buildWhatsAppSentLogFullDetails({
    recipientName: snapshot.recipientName,
    recipientId: snapshot.recipientId,
    loc: snapshot.loc,
    phone: snapshot.phone,
    channel: snapshot.channel,
    message: snapshot.message,
  });
}

/** Clases para la fila comprimida del panel de actividad. */
export function activityLogDetailsDisplayClass(action) {
  void action;
  return 'whitespace-pre-wrap break-words leading-snug';
}

/** Clases para el contenido expandido (mensaje WA completo, sin scroll artificial). */
export function activityLogExpandedContentClass(action) {
  if (String(action || '').trim().toLowerCase() === 'whatsapp') {
    return 'text-[11px] leading-relaxed whitespace-pre-wrap break-words text-slate-800 dark:text-slate-100';
  }
  return 'text-[11px] leading-snug whitespace-pre-wrap break-words text-slate-800 dark:text-slate-100';
}

export function activityLogExpandedSectionTitle(action) {
  return String(action || '').trim().toLowerCase() === 'whatsapp'
    ? 'Mensaje enviado'
    : 'Resumen de cambios';
}

/** Registra en `app_logs` un envío de WhatsApp (resumen en lista, mensaje completo en snapshot). */
export function logWhatsAppSentActivity(addLogFn, {
  recipientName,
  recipientId,
  loc,
  phone,
  channel,
  message,
  currentEvent,
} = {}) {
  if (typeof addLogFn !== 'function') return;
  const messageNorm = normalizeWhatsAppMessageBody(message);
  const summary = buildWhatsAppSentLogSummary({ recipientName, recipientId, loc });
  const fullDetails = buildWhatsAppSentLogFullDetails({
    recipientName,
    recipientId,
    loc,
    phone,
    channel,
    message: messageNorm,
  });
  const entityId = recipientId != null ? String(recipientId).trim() : '';
  const logId = buildLogId();
  addLogFn('WhatsApp', summary, null, currentEvent || null, null, {
    logId,
    entityType: 'participant',
    ...(entityId ? { entityId } : {}),
    hasSnapshot: true,
    snapshot: {
      kind: 'whatsapp_enviado',
      recipientName: String(recipientName || '').trim(),
      recipientId: entityId,
      loc: String(loc || '').trim(),
      phone: String(phone || '').trim(),
      channel: String(channel || '').trim(),
      message: messageNorm,
      summaryText: summary,
      fullDetailsText: fullDetails,
    },
  });
}
