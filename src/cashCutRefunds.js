/**
 * Saldos a favor y devoluciones en corte de caja / recaudado.
 * - Pendiente (saldo a favor o baja): no resta del total recaudado hasta devolución o donación.
 * - Donación (total o parcial): no altera el recaudado (el ingreso ya estaba en abonos).
 * - Devolución: egreso negativo en historial de pagos y corte de caja; resta del recaudado físico.
 */

export const PARTICIPANT_CANCELLED_STATUS = 'cancelled';
export const REFUND_DISBURSEMENT_PAYMENT_KIND = 'refund_disbursement';

function parseInstantFieldMs(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw?.toDate === 'function') {
    const d = raw.toDate();
    const t = d.getTime();
    return Number.isNaN(t) ? null : t;
  }
  if (typeof raw === 'object' && typeof raw.seconds === 'number') {
    return raw.seconds * 1000 + Math.floor((raw.nanoseconds || 0) / 1e6);
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [yy, mm, dd] = s.split('-').map((n) => parseInt(n, 10));
      const d = new Date(yy, mm - 1, dd, 12, 0, 0, 0);
      const t = d.getTime();
      return Number.isNaN(t) ? null : t;
    }
    const d = new Date(s);
    const t = d.getTime();
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

/** Id legado (una sola devolución por persona). */
export function refundDisbursementPaymentHistoryId(personId) {
  return `refund-disb-${String(personId)}`;
}

/** Id único por movimiento (devoluciones parciales). */
export function refundDisbursementPaymentHistoryIdForAt(personId, atMs) {
  const at = Number(atMs);
  if (Number.isFinite(at) && at > 0) return `refund-disb-${String(personId)}-${at}`;
  return refundDisbursementPaymentHistoryId(personId);
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

export function findAllRefundPaymentHistoryRows(person) {
  const pid = String(person?.id ?? '');
  return (person?.paymentHistory || []).filter(
    (h) =>
      h &&
      (h.kind === REFUND_DISBURSEMENT_PAYMENT_KIND ||
        String(h.id) === refundDisbursementPaymentHistoryId(pid) ||
        String(h.id || '').startsWith(`refund-disb-${pid}`))
  );
}

export function findRefundPaymentHistoryRow(person) {
  const rows = findAllRefundPaymentHistoryRows(person);
  if (!rows.length) return null;
  return rows.reduce((best, row) => {
    const amt = Math.abs(Number(row?.amount) || 0);
    if (!best) return row;
    return amt >= Math.abs(Number(best.amount) || 0) ? row : best;
  }, null);
}

/** Monto bruto ya devuelto (suma de todas las filas de devolución en historial). */
export function getRefundDisbursedGrossAmount(person) {
  if (!person) return 0;
  const fromHist = findAllRefundPaymentHistoryRows(person).reduce(
    (sum, row) => sum + Math.abs(Number(row?.amount) || 0),
    0
  );
  if (fromHist > 0) return fromHist;
  const amt = Number(person.refundDisbursedAmount) || 0;
  if (amt <= 0) return 0;
  if (person.refundDisbursedAt != null && person.refundDisbursedAt !== '') return amt;
  return 0;
}

export function getRefundDisbursedNetAmount(person, computeNetAmountByMethod) {
  const rows = findAllRefundPaymentHistoryRows(person);
  if (rows.length) {
    return rows.reduce((sum, row) => {
      if (Number.isFinite(Number(row.netAmount))) return sum + Math.abs(Number(row.netAmount));
      const gross = Math.abs(Number(row.amount) || 0);
      const method = row.method === 'Tarjeta' ? 'Tarjeta' : 'Efectivo';
      if (typeof computeNetAmountByMethod === 'function') {
        return sum + Math.max(0, Number(computeNetAmountByMethod(gross, method)) || 0);
      }
      return sum + gross;
    }, 0);
  }
  const gross = getRefundDisbursedGrossAmount(person);
  if (gross <= 0) return 0;
  const histRow = findRefundPaymentHistoryRow(person);
  const method =
    histRow?.method === 'Tarjeta' || person.refundDisbursedMethod === 'Tarjeta' ? 'Tarjeta' : 'Efectivo';
  if (typeof computeNetAmountByMethod === 'function') {
    return Math.max(0, Number(computeNetAmountByMethod(gross, method)) || 0);
  }
  return gross;
}

/**
 * Recaudado físico del registro: abonos menos devoluciones ya entregadas.
 * Pendiente de devolución y donación siguen contando (el dinero sigue en caja).
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

/** Monto ya marcado como donación (parcial o total). */
export function getRefundDonatedTotalAmount(person) {
  if (!person) return 0;
  const marked = Number(person.refundMarkedAsDonationAmount) || 0;
  if (marked > 0) return marked;
  if (person.refundAsDonation) {
    return Math.max(0, Number(person.refundPendingAmount ?? person.paid ?? 0) || 0);
  }
  return 0;
}

function creditBaseAmountForCancelled(person) {
  return Math.max(0, Number(person?.refundPendingAmount ?? person?.paid ?? 0) || 0);
}

function creditBaseAmountForActiveManual(person, getLiquidationTargetFn) {
  const stored = Number(person?.refundPendingAmount) || 0;
  if (stored > 0.005) return stored;
  const liq = typeof getLiquidationTargetFn === 'function' ? Number(getLiquidationTargetFn(person)) || 0 : 0;
  const paid = Number(person?.paid ?? 0) || 0;
  return Math.max(0, paid - liq);
}

function creditBaseAmountForArchived(person) {
  return Math.max(0, Number(person?.archivedManualCreditAmount) || 0);
}

/** Saldo base antes de restar devoluciones y donaciones. */
export function getParticipantCreditBaseAmount(person, getLiquidationTargetFn, participantIsArchivedFn) {
  if (!person) return 0;
  if (participantIsCancelledForRefund(person)) return creditBaseAmountForCancelled(person);
  if (typeof participantIsArchivedFn === 'function' && participantIsArchivedFn(person)) {
    return creditBaseAmountForArchived(person);
  }
  return creditBaseAmountForActiveManual(person, getLiquidationTargetFn);
}

/** Saldo pendiente de devolución o donación (no resta recaudado hasta acción). */
export function getParticipantCreditPendingAmount(person, getLiquidationTargetFn, participantIsArchivedFn) {
  const base = getParticipantCreditBaseAmount(person, getLiquidationTargetFn, participantIsArchivedFn);
  if (base <= 0.005) return 0;
  const disbursed = getRefundDisbursedGrossAmount(person);
  const donated = getRefundDonatedTotalAmount(person);
  return Math.max(0, base - disbursed - donated);
}

/** @deprecated Use getParticipantCreditPendingAmount for cancelled rows. */
export function getCancelledRefundPendingAmount(person) {
  if (!person || !participantIsCancelledForRefund(person)) return 0;
  return getParticipantCreditPendingAmount(person);
}

export function getManualCreditPendingAmount(person, getLiquidationTargetFn) {
  if (!person || participantIsCancelledForRefund(person)) return 0;
  return getParticipantCreditPendingAmount(person, getLiquidationTargetFn);
}

export function resolveCancelledRefundSede(person) {
  return String(person?.cancelledFromLocation || person?.location || '').trim();
}

export function resolveCreditRefundSede(person) {
  if (participantIsCancelledForRefund(person)) return resolveCancelledRefundSede(person);
  return String(person?.location || person?.archivedFromLocation || '').trim();
}

/** Fecha/hora canónica de un movimiento en historial (prioriza `recordedAt` editado). */
export function parsePaymentHistoryRecordedAtMs(row) {
  if (!row) return null;
  const fromRec = parseInstantFieldMs(row.recordedAt);
  if (fromRec != null) return fromRec;
  if (typeof row.id === 'number' && Number.isFinite(row.id)) return row.id;
  const idStr = row.id != null ? String(row.id).trim() : '';
  if (/^\d{10,}$/.test(idStr)) return Number(idStr);
  const fromDate = parseInstantFieldMs(row.date);
  if (fromDate != null) return fromDate;
  return null;
}

/** Fecha del egreso de devolución: historial de pagos (si existe) y luego `refundDisbursedAt`. */
export function resolveRefundDisbursementTimestampMs(person, histRow = null) {
  const row = histRow || findRefundPaymentHistoryRow(person);
  const fromHist = parsePaymentHistoryRecordedAtMs(row);
  if (fromHist != null) return fromHist;
  return parseRefundDisbursedAtMs(person);
}

export function participantHasRefundDisbursement(person) {
  if (findAllRefundPaymentHistoryRows(person).some((h) => Math.abs(Number(h?.amount) || 0) > 0)) {
    return true;
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

export function buildCashCutRefundDisbursementRow(
  person,
  computeNetAmountByMethod,
  resolveServiceLabel,
  histRow = null
) {
  const row = histRow || findRefundPaymentHistoryRow(person);
  const histGross = row ? Math.abs(Number(row.amount) || 0) : 0;
  const gross = histGross > 0 ? histGross : Math.max(0, Number(person.refundDisbursedAmount) || 0);
  if (gross <= 0) return null;

  const ts = resolveRefundDisbursementTimestampMs(person, row);
  if (ts == null) return null;

  const method =
    row?.method === 'Tarjeta' || row?.method === 'Efectivo'
      ? row.method
      : person.refundDisbursedMethod === 'Tarjeta'
        ? 'Tarjeta'
        : 'Efectivo';
  const loc = resolveCreditRefundSede(person) || person.refundDisbursedLocation || '';
  const netPositive =
    row && Number.isFinite(Number(row.netAmount))
      ? Math.abs(Number(row.netAmount))
      : computeNetAmountByMethod(gross, method);
  const service =
    typeof resolveServiceLabel === 'function'
      ? resolveServiceLabel(person, ts, loc)
      : String(row?.service || '').trim() || 'Devolución';
  const rowId = row?.id != null ? String(row.id) : `refund-disb-${person.id}`;
  return {
    id: rowId,
    amount: -gross,
    netAmount: -netPositive,
    method,
    service,
    reference: String(row?.reference || '').trim(),
    registeredBy: row?.registeredBy || person.refundDisbursedBy || '?',
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
    const loc = resolveCreditRefundSede(p);
    if (allowedLocations && typeof locationInScopeFn === 'function' && !locationInScopeFn(loc, allowedLocations)) {
      return;
    }
    const histRows = findAllRefundPaymentHistoryRows(p);
    if (histRows.length) {
      histRows.forEach((histRow) => {
        const row = buildCashCutRefundDisbursementRow(p, computeNetAmountByMethod, resolveServiceLabel, histRow);
        if (row) out.push(row);
      });
      return;
    }
    if (!participantIsCancelledForRefund(p)) return;
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

export function collectParticipantsWithPendingCredit(
  allParticipants,
  currentEvent,
  getLiquidationTargetFn,
  participantIsArchivedFn,
  allowedLocations,
  locationInScopeFn
) {
  if (!currentEvent?.id) return [];
  return (allParticipants || [])
    .filter((p) => {
      if (p.eventId !== currentEvent.id) return false;
      const pending = getParticipantCreditPendingAmount(p, getLiquidationTargetFn, participantIsArchivedFn);
      if (pending <= 0.005) return false;
      const loc = resolveCreditRefundSede(p);
      if (allowedLocations && typeof locationInScopeFn === 'function' && !locationInScopeFn(loc, allowedLocations)) {
        return false;
      }
      return true;
    })
    .map((p) => ({
      ...p,
      _refundPendingAmount: getParticipantCreditPendingAmount(p, getLiquidationTargetFn, participantIsArchivedFn),
    }));
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

/** Fila de historial de pagos (abono negativo) para una devolución. */
export function buildRefundDisbursementPaymentHistoryRow({
  personId,
  grossAmount,
  method,
  atMs,
  registeredBy,
  computeNetAmountByMethod,
  service,
  note,
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
    id: refundDisbursementPaymentHistoryIdForAt(personId, at),
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
    note: String(note || '').trim() || 'Devolución de saldo',
  };
}

export function personHasRefundDisbursementPaymentHistoryRow(person) {
  return findAllRefundPaymentHistoryRows(person).length > 0;
}

/** Incluye devoluciones ya registradas aunque el historial aún no tuviera la fila (legado). */
export function enrichPaymentHistoryWithRefundDisbursements(person, computeNetAmountByMethod) {
  const base = (person?.paymentHistory || []).filter((h) => h && h.kind !== 'comment');
  if (!personHasRefundDisbursementPaymentHistoryRow(person)) {
    if (!participantHasRefundDisbursement(person)) return base;
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
  return base;
}
