/**
 * Plantilla de recordatorio de pago (mantener alineada con buildPaymentReminderWhatsAppMessage en src/whatsappFinanceMessages.js).
 */
const WA_NOTE =
  '¡Por favor revisa que TODA la información sea correcta y no falte nada! Cualquier duda contáctanos por este medio.';

function formatMoneyMx(n) {
  return Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateTimeWithLoc(reportedAtMs, loc) {
  const base = new Date(Number(reportedAtMs) || Date.now()).toLocaleString('es-MX');
  const sede = String(loc || '').trim();
  return sede ? `${base}, sede ${sede}` : base;
}

function isCampaEventType(eventSnapshot) {
  return String(eventSnapshot?.eventType || '') === 'Campa';
}

function buildPaymentReminderWhatsAppMessage({
  person,
  loc,
  pendingDebt,
  paymentDeadlineDate,
  reportedAtMs = Date.now(),
  eventSnapshot,
}) {
  const ev = eventSnapshot || {};
  const eventName = String(ev?.name || '').trim() || 'el evento';
  const personName = String(person?.name || '').trim() || '';
  const vnpId = String(person?.vnpPersonId || '').trim() || 'N/A';
  const repLoc = formatDateTimeWithLoc(reportedAtMs, loc);
  const campa = isCampaEventType(ev);
  const org = campa ? 'Tribu Norte' : 'la oficina de VN Norte';
  const debtTxt = formatMoneyMx(Math.max(0, Number(pendingDebt) || 0));

  const dl = String(paymentDeadlineDate || '').trim();
  const deadlineLabel =
    dl && /^\d{4}-\d{2}-\d{2}$/.test(dl)
      ? new Date(`${dl}T12:00:00`).toLocaleDateString('es-MX', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'la fecha acordada con la oficina';

  const lines = [
    `👋 ¡Hola! ${personName}, te contactamos de ${org} con un recordatorio para liquidar tu lugar en ${eventName}. 💳`,
    '',
    `    📅 Fecha del aviso: ${repLoc}`,
    `    🆔 Tu ID único es: ${vnpId}`,
    `    📊 Monto pendiente por liquidar: $${debtTxt}`,
    `    📆 Fecha límite de pago: ${deadlineLabel}`,
    '',
    'Por favor realiza tu pago a tiempo para conservar tu lugar. Si ya liquidaste, ignora este mensaje o envíanos tu comprobante por este medio.',
    '',
    WA_NOTE,
  ];
  return lines.join('\n');
}

module.exports = { buildPaymentReminderWhatsAppMessage };
