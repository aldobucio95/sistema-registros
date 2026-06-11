const LIVE_FINANCIAL_FIELDS = [
  'paymentHistory',
  'paid',
  'paidNet',
  'paymentMethod',
  'paymentService',
  'cardReference',
  'whatsAppFinanceNotifications',
];

const toFiniteNumber = (value, fallback = 0) => {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
};

const asArray = (value) => (Array.isArray(value) ? value : []);

export function buildParticipantUpdatePreservingLiveFinance(
  draftPayload,
  liveData,
  {
    manualPaymentAdjustment = null,
    paidGrossDelta = 0,
    paidNetDelta = 0,
  } = {}
) {
  const payload = { ...(draftPayload || {}) };
  const live = liveData || {};

  LIVE_FINANCIAL_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(live, field)) {
      payload[field] = live[field];
    } else {
      delete payload[field];
    }
  });

  if (manualPaymentAdjustment) {
    const livePaidGross = toFiniteNumber(live.paid, 0);
    const livePaidNet = Number.isFinite(parseFloat(live.paidNet))
      ? parseFloat(live.paidNet)
      : livePaidGross;
    payload.paid = livePaidGross + (Number(paidGrossDelta) || 0);
    payload.paidNet = livePaidNet + (Number(paidNetDelta) || 0);
    payload.paymentHistory = [...asArray(live.paymentHistory), manualPaymentAdjustment];
  }

  return payload;
}

const isValidBackupDoc = (doc) =>
  doc != null &&
  typeof doc === 'object' &&
  doc.id != null &&
  String(doc.id).trim() !== '';

export function validateBackupSnapshot(backupData) {
  if (!backupData || typeof backupData !== 'object') {
    return { ok: false, reason: 'La copia de seguridad no tiene un formato valido.' };
  }
  if (!Array.isArray(backupData.participants) || !Array.isArray(backupData.events)) {
    return { ok: false, reason: 'La copia de seguridad no contiene participantes y eventos.' };
  }
  if (!backupData.participants.every(isValidBackupDoc)) {
    return { ok: false, reason: 'La copia de seguridad contiene participantes sin id valido.' };
  }
  if (!backupData.events.every(isValidBackupDoc)) {
    return { ok: false, reason: 'La copia de seguridad contiene eventos sin id valido.' };
  }
  return {
    ok: true,
    participants: backupData.participants,
    events: backupData.events,
  };
}
