/**
 * Detalle de actividad para envíos de WhatsApp (panel de logs).
 */
export function buildWhatsAppSentLogDetails({
  recipientName,
  recipientId,
  loc,
  phone,
  channel,
  message,
} = {}) {
  const name =
    String(recipientName || '').trim() ||
    (recipientId != null ? String(recipientId).trim() : '') ||
    'participante';
  const locLabel = String(loc || '').trim();
  const locPart = locLabel ? ` (sede ${locLabel})` : '';
  const phoneDigits = String(phone || '').trim();
  const phonePart = phoneDigits ? `\nTeléfono: ${phoneDigits}` : '';
  const channelLabel = String(channel || '').trim();
  const channelPart = channelLabel ? `\nOrigen: ${channelLabel}` : '';
  const body = String(message || '').trim();
  return (
    `Envió WhatsApp a ${name}${locPart}.${phonePart}${channelPart}\n\n` +
    `--- Mensaje enviado ---\n${body || '—'}`
  );
}

/** Registra en `app_logs` un envío de WhatsApp con el mensaje completo. */
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
  const details = buildWhatsAppSentLogDetails({
    recipientName,
    recipientId,
    loc,
    phone,
    channel,
    message,
  });
  const entityId = recipientId != null ? String(recipientId).trim() : '';
  addLogFn('WhatsApp', details, null, currentEvent || null, null, {
    entityType: 'participant',
    ...(entityId ? { entityId } : {}),
  });
}
