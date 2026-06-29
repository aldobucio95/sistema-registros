/**
 * Saldos a favor por baja/cancelación y devoluciones en corte de caja.
 * - Pendiente: no suma ni resta en el corte hasta que se marque donación o devolución.
 * - Donación: no altera totales del corte (el ingreso ya se registró en abonos).
 * - Devolución: egreso negativo en el día/hora registrados, en la sede del registro cancelado.
 */

export const PARTICIPANT_CANCELLED_STATUS = 'cancelled';
export const REFUND_DISBURSEMENT_PAYMENT_KIND = 'refund_disbursement';

export function refundDisbursementPaymentHistoryId(personId) {
  return `refund-disb-${String(personId)}`;
}

export function participantIsCancelledForRefund(p) {
  return (p?.status || 'active') === PARTICIPANT_CANCELLED_STATUS;
}

export function parseRefundDisbursedAtMs(person) {
  const v = person?.refundDisbursedAt;
  if (v == null || v === '') return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const d = new Date(v);
  const t = d.getTime();
  return Number.isNaN(t) ? null : t;
}

/** Monto bruto ya devuelto en efectivo/tarjeta (no pendiente ni donación). */
export function getRefundDisbursedGrossAmount(person) {
  if (!person) return 0;
  const histRow = findRefundPaymentHistoryRow(person);
  const fromHist = histRow ? Math.abs(Number(histRow.amount) || 0) : 0;
  if (fromHist > 0) return fromHist;
  const amt = Number(person.refundDisbursedAmount) || 0;
  if (amt <= 0) return 0;
  if (person.refundDisbursedAt != null && person.refundDisbursedAt !== '') return amt;
  return 0;
}

export function getRefundDisbursedNetAmount(person, computeNetAmountByMethod) {
  const histRow = findRefundPaymentHistoryRow(person);
  if (histRow && Number.isFinite(Number(histRow.netAmount))) {
    return Math.abs(Number(histRow.netAmount));
  }
  const gross = getRefundDisbursedGrossAmount(person);
  if (gross <= 0) return 0;
  const method =
    histRow?.method === 'Tarjeta' || person.refundDisbursedMethod === 'Tarjeta' ? 'Tarjeta' : 'Efectivo';
  if (typeof computeNetAmountByMethod === 'function') {
    return Math.max(0, Number(computeNetAmountByMethod(gross, method)) || 0);
  }
  return gross;
}

/**
 * Recaudado físico del registro: abonos menos devoluciones ya entregadas.
 * Pendiente de devolución y donación por baja siguen contando (el dinero sigue en caja).
 */
export function getParticipantPhysicalRecaudadoGross(person, paidGrossFallback) {
  const paid = Number(paidGrossFallback ?? person?.paid ?? 0) || 0;
  return Math.max(0, paid - getRefundDisbursedGrossAmount(person));
}

export function getParticipantPhysicalRecaudadoNet(person, paidNetFallback, computeNetAmountByMethod) {
  const paidNet = Number(paidNetFallback ?? person?.paidNet ?? person?.paid ?? 0) || 0;
  return Math.max(0, paidNet - getRefundDisbursedNetAmount(person, computeNetAmountByMethod));
}

export function sumDisbursedRefundsGrossForEvent(allParticipants, eventId) {
  if (!eventId) return 0;
  return (allParticipants || [])
    .filter((p) => p.eventId === eventId)
    .reduce((sum, p) => sum + getRefundDisbursedGrossAmount(p), 0);
}

/** Saldo pendiente de acción (donación o devolución) para un registro cancelado. */
export function getCancelledRefundPendingAmount(person) {
  if (!person || !participantIsCancelledForRefund(person)) return 0;
  if (person.refundAsDonation || participantHasRefundDisbursement(person)) return 0;
  return Math.max(0, Number(person.refundPendingAmount ?? person.paid ?? 0) || 0);
}

export function resolveCancelledRefundSede(person) {
  return String(person?.cancelledFromLocation || person?.location || '').trim();
}

export function findRefundPaymentHistoryRow(person) {
  const pid = refundDisbursementPaymentHistoryId(person?.id);
  return (person?.paymentHistory || []).find(
    (h) => h && (h.kind === REFUND_DISBURSEMENT_PAYMENT_KIND || String(h.id) === pid)
  );
}

/** Fecha/hora canónica de un movimiento en historial (prioriza `recordedAt` editado). */
export function parsePaymentHistoryRecordedAtMs(row) {
  if (!row) return null;
  const v = row.recordedAt;
  if (v != null && v !== '') {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    const d = new Date(v);
    const t = d.getTime();
    if (!Number.isNaN(t)) return t;
  }
  if (typeof row.id === 'number' && Number.isFinite(row.id)) return row.id;
  const idStr = row.id != null ? String(row.id).trim() : '';
  if (/^\d{10,}$/.test(idStr)) return Number(idStr);
  return null;
}

/** Fecha del egreso de devolución: historial de pagos (si existe) y luego `refundDisbursedAt`. */
export function resolveRefundDisbursementTimestampMs(person) {
  const histRow = findRefundPaymentHistoryRow(person);
  const fromHist = parsePaymentHistoryRecordedAtMs(histRow);
  if (fromHist != null) return fromHist;
  return parseRefundDisbursedAtMs(person);
}

export function participantHasRefundDisbursement(person) {
  const histRow = findRefundPaymentHistoryRow(person);
  if (histRow && Math.abs(Number(histRow.amount) || 0) > 0) {
    return resolveRefundDisbursementTimestampMs(person) != null;
  }
  const amt = Number(person?.refundDisbursedAmount) || 0;
  if (amt <= 0) return false;
  return parseRefundDisbursedAtMs(person) != null;
}

/** Total pagado bruto aplicable al saldo según historial (abonos − devoluciones). */
export function getParticipantNetPaidFromHistory(person, computeNetAmountByMethod) {
  const rows = enrichPaymentHistoryWithRefundDisbursements(person, computeNetAmountByMethod);
  if (!rows.length) return Math.max(0, Number(person?.paid ?? 0) || 0);
  return Math.max(
    0,
    rows.reduce((sum, h) => sum + (Number(h.amount) || 0), 0)
  );
}

/** Total pagado neto (comisiones) según historial. */
export function getParticipantEffectivePaidNet(person, computeNetAmountByMethod) {
  const rows = enrichPaymentHistoryWithRefundDisbursements(person, computeNetAmountByMethod);
  if (!rows.length) {
    const gross = Math.max(0, Number(person?.paid ?? 0) || 0);
    if (typeof computeNetAmountByMethod === 'function') {
      return Math.max(0, Number(computeNetAmountByMethod(gross, person?.paymentMethod)) || 0);
    }
    return gross;
  }
  return Math.max(
    0,
    rows.reduce((sum, h) => {
      const method = h.method === 'Tarjeta' ? 'Tarjeta' : 'Efectivo';
      const amt = Number(h.amount) || 0;
      if (Number.isFinite(Number(h.netAmount))) return sum + Number(h.netAmount);
      if (typeof computeNetAmountByMethod === 'function') {
        return sum + computeNetAmountByMethod(amt, method);
      }
      return sum + amt;
    }, 0)
  );
}

/** Adeudo bruto pendiente (activo / lista de espera). Cancelados: 0. */
export function getParticipantOutstandingGross(person, getLiquidationTargetFn, computeNetAmountByMethod) {
  if (participantIsCancelledForRefund(person)) return 0;
  const liq =
    typeof getLiquidationTargetFn === 'function' ? Number(getLiquidationTargetFn(person)) || 0 : 0;
  const paid = getParticipantNetPaidFromHistory(person, computeNetAmountByMethod);
  return Math.max(0, liq - paid);
}

/** Sincroniza `paid` / `paidNet` con el historial (p. ej. tras reactivación). */
export function buildParticipantPaidFieldsFromHistory(person, computeNetAmountByMethod) {
  return {
    paid: getParticipantNetPaidFromHistory(person, computeNetAmountByMethod),
    paidNet: getParticipantEffectivePaidNet(person, computeNetAmountByMethod),
  };
}

export function buildCashCutRefundDisbursementRow(person, computeNetAmountByMethod, resolveServiceLabel) {
  const histRow = findRefundPaymentHistoryRow(person);
  const histGross = histRow ? Math.abs(Number(histRow.amount) || 0) : 0;
  const gross = histGross > 0 ? histGross : Math.max(0, Number(person.refundDisbursedAmount) || 0);
  if (gross <= 0) return null;

  const ts = resolveRefundDisbursementTimestampMs(person);
  if (ts == null) return null;

  const method =
    histRow?.method === 'Tarjeta' || histRow?.method === 'Efectivo'
      ? histRow.method
      : person.refundDisbursedMethod === 'Tarjeta'
        ? 'Tarjeta'
        : 'Efectivo';
  const loc = resolveCancelledRefundSede(person) || person.refundDisbursedLocation || '';
  const netPositive =
    histRow && Number.isFinite(Number(histRow.netAmount))
      ? Math.abs(Number(histRow.netAmount))
      : computeNetAmountByMethod(gross, method);
  const service =
    (typeof resolveServiceLabel === 'function' ? resolveServiceLabel(person, ts, loc) : null) ||
    histRow?.service ||
    'Devolución';
  return {
    id: `refund-disb-${person.id}`,
    amount: -gross,
    netAmount: -netPositive,
    method,
    service,
    reference: String(histRow?.reference || '').trim(),
    registeredBy: histRow?.registeredBy || person.refundDisbursedBy || '?',
    _ts: ts,
    _date: new Date(ts),
    _personName: person.name || '',
    _personId: person.id,
    _loc: String(loc || '').trim(),
    _isRefundDisbursement: true,
    kind: 'refund_disbursement',
  };
}

export function collectCashCutRefundDisbursements(
  allParticipants,
  currentEvent,
  allowedLocations,
  locationInScopeFn,
  computeNetAmountByMethod,
  resolveServiceLabel
) {
  if (!currentEvent?.id || typeof computeNetAmountByMethod !== 'function') return [];
  const out = [];
  (allParticipants || []).forEach((p) => {
    if (p.eventId !== currentEvent.id) return;
    if (!participantIsCancelledForRefund(p)) return;
    const loc = resolveCancelledRefundSede(p);
    if (allowedLocations && typeof locationInScopeFn === 'function' && !locationInScopeFn(loc, allowedLocations)) {
      return;
    }
    const row = buildCashCutRefundDisbursementRow(p, computeNetAmountByMethod, resolveServiceLabel);
    if (row) out.push(row);
  });
  return out;
}

export function collectCancelledParticipantsWithPendingRefund(
  allParticipants,
  currentEvent,
  allowedLocations,
  locationInScopeFn
) {
  if (!currentEvent?.id) return [];
  return (allParticipants || [])
    .filter((p) => {
      if (p.eventId !== currentEvent.id || !participantIsCancelledForRefund(p)) return false;
      const pending = getCancelledRefundPendingAmount(p);
      if (pending <= 0) return false;
      const loc = resolveCancelledRefundSede(p);
      if (allowedLocations && typeof locationInScopeFn === 'function' && !locationInScopeFn(loc, allowedLocations)) {
        return false;
      }
      return true;
    })
    .map((p) => ({ ...p, _refundPendingAmount: getCancelledRefundPendingAmount(p) }));
}

export function msToDatetimeLocalValue(ms) {
  if (ms == null || !Number.isFinite(ms)) return '';
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function parseDatetimeLocalToMs(value) {
  const s = String(value || '').trim();
  if (!s) return null;
  const d = new Date(s);
  const t = d.getTime();
  return Number.isNaN(t) ? null : t;
}

/** Fila de historial de pagos (abono negativo) para una devolución por baja. */
export function buildRefundDisbursementPaymentHistoryRow({
  personId,
  grossAmount,
  method,
  atMs,
  registeredBy,
  computeNetAmountByMethod,
  service,
}) {
  const gross = Math.abs(Number(grossAmount) || 0);
  if (gross <= 0) return null;
  const at = Number(atMs);
  if (!Number.isFinite(at) || at <= 0) return null;
  const refundMethod = method === 'Tarjeta' ? 'Tarjeta' : 'Efectivo';
  const netPositive =
    typeof computeNetAmountByMethod === 'function'
      ? computeNetAmountByMethod(gross, refundMethod)
      : gross;
  const d = new Date(at);
  return {
    id: refundDisbursementPaymentHistoryId(personId),
    kind: REFUND_DISBURSEMENT_PAYMENT_KIND,
    date: d.toLocaleString('es-MX'),
    recordedAt: d.toISOString(),
    amount: -gross,
    netAmount: -netPositive,
    method: refundMethod,
    service: String(service || '').trim() || 'Devolución',
    reference: '',
    commission: refundMethod === 'Tarjeta' ? Math.max(0, gross - netPositive) : 0,
    registeredBy: String(registeredBy || '?').trim() || '?',
    note: 'Devolución por baja de registro',
  };
}

export function personHasRefundDisbursementPaymentHistoryRow(person) {
  const pid = refundDisbursementPaymentHistoryId(person?.id);
  return (person?.paymentHistory || []).some(
    (h) => h && (h.kind === REFUND_DISBURSEMENT_PAYMENT_KIND || String(h.id) === pid)
  );
}

/** Incluye devoluciones ya registradas aunque el historial aún no tuviera la fila (legado). */
export function enrichPaymentHistoryWithRefundDisbursements(person, computeNetAmountByMethod) {
  const base = (person?.paymentHistory || []).filter((h) => h && h.kind !== 'comment');
  if (!participantHasRefundDisbursement(person)) return base;
  if (personHasRefundDisbursementPaymentHistoryRow(person)) return base;
  const row = buildRefundDisbursementPaymentHistoryRow({
    personId: person.id,
    grossAmount: person.refundDisbursedAmount,
    method: person.refundDisbursedMethod,
    atMs: parseRefundDisbursedAtMs(person),
    registeredBy: person.refundDisbursedBy,
    computeNetAmountByMethod,
  });
  if (!row) return base;
  return [...base, row];
}
