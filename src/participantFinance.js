export const LIVE_PARTICIPANT_FINANCIAL_KEYS = [
  'paid',
  'paidNet',
  'paymentHistory',
  'whatsAppFinanceNotifications',
  'paymentMethod',
  'paymentService',
  'cardReference',
];

export const stripLiveParticipantFinancialFields = (payload) => {
  const next = { ...(payload || {}) };
  for (const key of LIVE_PARTICIPANT_FINANCIAL_KEYS) delete next[key];
  return next;
};

const parseMoney = (value, fallback = 0) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const buildParticipantEditTransactionPayload = ({
  basePayload,
  livePerson,
  adminAdjustedPaid,
  manualPaymentAdjustment,
  manualPaymentGrossDelta = 0,
  manualPaymentNetDelta = 0,
  isCancelled,
  getLiquidationTarget,
}) => {
  const nextPayload = stripLiveParticipantFinancialFields(basePayload);
  const livePaidGross = parseMoney(livePerson?.paid, 0);
  const livePaidNet = parseMoney(livePerson?.paidNet, livePaidGross);

  if (adminAdjustedPaid && manualPaymentAdjustment) {
    nextPayload.paid = livePaidGross + manualPaymentGrossDelta;
    nextPayload.paidNet = livePaidNet + manualPaymentNetDelta;
    nextPayload.paymentHistory = [
      ...(Array.isArray(livePerson?.paymentHistory) ? livePerson.paymentHistory : []),
      manualPaymentAdjustment,
    ];
  }

  const mergedData = { ...(livePerson || {}), ...nextPayload };
  if (!isCancelled(mergedData)) {
    const refundDiff = Math.max(
      0,
      parseMoney(mergedData.paid, 0) - (Number(getLiquidationTarget(mergedData)) || 0),
    );
    nextPayload.refundPendingAmount = refundDiff;
    nextPayload.refundPendingReason = refundDiff > 0 ? 'campaign_discount' : '';
  }

  return {
    nextPayload,
    mergedData: { ...(livePerson || {}), ...nextPayload },
  };
};

export const buildAbonoTransactionPayload = ({
  person,
  addedAmount,
  netAmount,
  newPaymentRecord,
  paymentLoc,
  abonoCreatedAt,
  buildFinanceWhatsAppMessage,
  getLiquidationTarget,
  fallbackBaseCost = 0,
  debugExtras = {},
}) => {
  const paidGrossNow = parseMoney(person?.paid, 0);
  const paidNetNow = parseMoney(person?.paidNet, paidGrossNow);
  const baseCost = Number(getLiquidationTarget(person)) || Number(fallbackBaseCost) || 0;

  if (paidGrossNow + addedAmount > baseCost) {
    return {
      ok: false,
      error: 'payment-over-total',
      maxAmount: Math.max(0, baseCost - paidGrossNow),
    };
  }

  const newPaidGross = paidGrossNow + addedAmount;
  const newPaidNet = paidNetNow + netAmount;
  const isLiquidado = newPaidGross >= baseCost;
  const pendingAfterAbono = Math.max(baseCost - newPaidGross, 0);
  const abonoNotification = {
    id: `wa-abn-${abonoCreatedAt}`,
    kind: 'abono',
    amount: addedAmount,
    pendingAmount: pendingAfterAbono,
    isLiquidado,
    createdAt: abonoCreatedAt,
    sent: false,
    sentAt: null,
    message: buildFinanceWhatsAppMessage(
      person,
      paymentLoc,
      addedAmount,
      pendingAfterAbono,
      isLiquidado,
      'abono',
      abonoCreatedAt,
    ),
  };

  return {
    ok: true,
    payload: {
      paid: newPaidGross,
      paidNet: newPaidNet,
      paymentHistory: [
        ...(Array.isArray(person?.paymentHistory) ? person.paymentHistory : []),
        newPaymentRecord,
      ],
      whatsAppFinanceNotifications: [
        ...(Array.isArray(person?.whatsAppFinanceNotifications) ? person.whatsAppFinanceNotifications : []),
        abonoNotification,
      ],
      ...debugExtras,
    },
    previousPaidGross: paidGrossNow,
    newPaidGross,
    isLiquidado,
  };
};
