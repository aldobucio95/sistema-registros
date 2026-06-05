const LIVE_PARTICIPANT_FINANCE_FIELDS = [
  'paid',
  'paidNet',
  'paymentHistory',
  'whatsAppFinanceNotifications',
  'paymentMethod',
  'paymentService',
  'cardReference',
];

const asFiniteNumber = (value, fallback = 0) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const stripLiveParticipantFinanceFields = (source) => {
  const out = { ...(source || {}) };
  for (const key of LIVE_PARTICIPANT_FINANCE_FIELDS) {
    delete out[key];
  }
  return out;
};

export const buildManualPaidAdjustmentUpdate = ({
  livePerson,
  grossDelta,
  netDelta,
  adjustmentRecord,
}) => {
  if (!grossDelta) return {};
  const livePaidGross = asFiniteNumber(livePerson?.paid, 0);
  const livePaidNet = asFiniteNumber(livePerson?.paidNet, livePaidGross);
  const liveHistory = Array.isArray(livePerson?.paymentHistory) ? livePerson.paymentHistory : [];

  return {
    paid: livePaidGross + grossDelta,
    paidNet: livePaidNet + netDelta,
    paymentHistory: [...liveHistory, adjustmentRecord],
  };
};

export const buildAbonoUpdate = ({
  livePerson,
  addedAmount,
  netAmount,
  paymentRecord,
  notification,
}) => {
  const livePaidGross = asFiniteNumber(livePerson?.paid, 0);
  const livePaidNet = asFiniteNumber(livePerson?.paidNet, livePaidGross);
  const liveHistory = Array.isArray(livePerson?.paymentHistory) ? livePerson.paymentHistory : [];
  const liveNotifications = Array.isArray(livePerson?.whatsAppFinanceNotifications)
    ? livePerson.whatsAppFinanceNotifications
    : [];

  return {
    paid: livePaidGross + addedAmount,
    paidNet: livePaidNet + netAmount,
    paymentHistory: [...liveHistory, paymentRecord],
    whatsAppFinanceNotifications: [...liveNotifications, notification],
  };
};

export const buildPaymentHistoryAppendUpdate = ({ livePerson, historyItem }) => {
  const liveHistory = Array.isArray(livePerson?.paymentHistory) ? livePerson.paymentHistory : [];
  return {
    paymentHistory: [...liveHistory, historyItem],
  };
};

export const validateBackupRestorePayload = (backupData) => {
  if (!backupData || typeof backupData !== 'object') {
    throw new Error('backup-payload-missing');
  }

  const participants = backupData.participants;
  const events = backupData.events;
  if (!Array.isArray(participants) || !Array.isArray(events)) {
    throw new Error('backup-payload-invalid-collections');
  }

  const validateRows = (rows, label) => {
    const ids = new Set();
    for (const row of rows) {
      const id = row?.id;
      if (id == null || String(id).trim() === '') {
        throw new Error(`backup-payload-invalid-${label}-id`);
      }
      const key = String(id);
      if (ids.has(key)) {
        throw new Error(`backup-payload-duplicate-${label}-id`);
      }
      ids.add(key);
    }
    return ids;
  };

  return {
    participants,
    events,
    participantIds: validateRows(participants, 'participant'),
    eventIds: validateRows(events, 'event'),
  };
};
