import { buildParticipantPaidFieldsFromHistory } from './cashCutRefunds.js';

/** Terminales de baja/archivo que un `setDoc` de re-registro no debe borrar. */
export const REGISTRATION_FINANCE_TERMINAL_KEYS = [
  'refundDisbursedAt',
  'refundDisbursedAmount',
  'refundDisbursedBy',
  'refundDisbursedMethod',
  'refundDisbursedLocation',
  'refundAsDonation',
  'refundMarkedAsDonationAmount',
  'refundMarkedAsDonationAt',
];

export function paymentHistoryRowId(row) {
  if (!row || row.id == null || row.id === '') return '';
  return String(row.id);
}

function moneyHistoryRows(history) {
  return (Array.isArray(history) ? history : []).filter((h) => h && h.kind !== 'comment');
}

/**
 * Folios viejos a veces tienen `paid` sin filas en `paymentHistory`.
 * Si el re-registro trae un abono nuevo, hay que materializar el saldo previo
 * o el corte perdería el ingreso original.
 */
export function historyWithLegacyPaidFallback(previousData) {
  const hist = Array.isArray(previousData?.paymentHistory) ? previousData.paymentHistory.filter(Boolean) : [];
  if (moneyHistoryRows(hist).length > 0) return hist;
  const paid = Number(previousData?.paid) || 0;
  if (paid <= 0) return hist;
  const method = previousData?.paymentMethod === 'Tarjeta' ? 'Tarjeta' : 'Efectivo';
  const paidNet = Number(previousData?.paidNet);
  return [
    ...hist,
    {
      id: `legacy-paid-${String(previousData?.id || 'prev')}`,
      amount: paid,
      netAmount: Number.isFinite(paidNet) ? paidNet : paid,
      method,
      service: previousData?.paymentService || '',
      recordedAt: previousData?.registeredAt || null,
      registeredBy: previousData?.registeredBy || '?',
      _syntheticLegacyPaid: true,
    },
  ];
}

export function mergePaymentHistoryPreservingPrevious(previousHistory, incomingHistory) {
  const prev = Array.isArray(previousHistory) ? previousHistory.filter(Boolean) : [];
  const incoming = Array.isArray(incomingHistory) ? incomingHistory.filter(Boolean) : [];
  const seen = new Set(prev.map(paymentHistoryRowId).filter(Boolean));
  const appended = incoming.filter((row) => {
    const id = paymentHistoryRowId(row);
    if (!id) return true;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  return [...prev, ...appended];
}

/**
 * Reusar el mismo folio (VNPM/evento) tras baja/archivo hace `setDoc` completo.
 * Conserva historial, `paid`/`paidNet` y terminales de devolución/donación; el
 * pendiente de baja se cierra porque el registro vuelve a activo o espera.
 */
export function applySameEventRegistrationFinanceMerge(previousData, personData, computeNetAmountByMethod) {
  if (!previousData || typeof previousData !== 'object') return personData;
  if (!personData || typeof personData !== 'object') return personData;
  if (String(previousData.eventId || '') !== String(personData.eventId || '')) return personData;

  const paymentHistory = mergePaymentHistoryPreservingPrevious(
    historyWithLegacyPaidFallback(previousData),
    personData.paymentHistory
  );
  const paidFields = buildParticipantPaidFieldsFromHistory(
    { ...personData, paymentHistory, paid: previousData.paid },
    computeNetAmountByMethod
  );
  const next = {
    ...personData,
    paymentHistory,
    paid: paidFields.paid,
    paidNet: paidFields.paidNet,
    refundPendingAmount: 0,
    refundPendingReason: '',
  };
  for (const key of REGISTRATION_FINANCE_TERMINAL_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(previousData, key)) continue;
    const v = previousData[key];
    if (v == null || v === '') continue;
    next[key] = v;
  }
  return next;
}
