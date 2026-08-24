/**
 * Saldos a favor por baja/cancelación y devoluciones en corte de caja.
 * - Pendiente: no suma ni resta en el corte hasta que se marque donación o devolución.
 * - Donación: no altera totales del corte (el ingreso ya se registró en abonos).
 * - Devolución: egreso negativo en el día/hora registrados, en la sede del registro cancelado.
 */

export const PARTICIPANT_CANCELLED_STATUS = 'cancelled';
export const REFUND_DISBURSEMENT_PAYMENT_KIND = 'refund_disbursement';

export function refundDisbursementPaymentHistoryId(personId, atMs) {
  const base = `refund-disb-${String(personId)}`;
  const ts = Number(atMs);
  if (Number.isFinite(ts) && ts > 0) return `${base}-${ts}`;
  return base;
}

export function isRefundDisbursementHistoryRow(row, personId) {
  if (!row) return false;
  if (row.kind === REFUND_DISBURSEMENT_PAYMENT_KIND) return true;
  const id = String(row.id || '');
  const pid = String(personId ?? '').trim();
  if (!pid) return id === 'refund-disb-' || id.startsWith('refund-disb-');
  const prefix = `refund-disb-${pid}`;
  return id === prefix || id.startsWith(`${prefix}-`);
}

export function listRefundPaymentHistoryRows(person) {
  const pid = person?.id;
  return (person?.paymentHistory || []).filter((h) => isRefundDisbursementHistoryRow(h, pid));
}

export function parseParticipantCancelledAtMs(person) {
  const v = person?.cancelledAt;
  if (v == null || v === '') return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const d = new Date(v);
  const t = d.getTime();
  return Number.isNaN(t) ? null : t;
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

function refundFlagAmountIfUncoveredByHistory(person, histRows) {
  const amt = Number(person?.refundDisbursedAmount) || 0;
  const flagAt = parseRefundDisbursedAtMs(person);
  if (amt <= 0 || flagAt == null) return 0;
  const covered = (histRows || []).some((h) => {
    const ts = parsePaymentHistoryRecordedAtMs(h);
    return ts != null && Math.abs(ts - flagAt) < 2000;
  });
  return covered ? 0 : amt;
}

/** Monto bruto ya devuelto en efectivo/tarjeta (todas las devoluciones del folio). */
export function getRefundDisbursedGrossAmount(person) {
  if (!person) return 0;
  const histRows = listRefundPaymentHistoryRows(person);
  const fromHist = histRows.reduce((sum, h) => sum + Math.abs(Number(h.amount) || 0), 0);
  return fromHist + refundFlagAmountIfUncoveredByHistory(person, histRows);
}

export function getRefundDisbursedNetAmount(person, computeNetAmountByMethod) {
  const histRows = listRefundPaymentHistoryRows(person);
  if (histRows.length) {
    const fromHist = histRows.reduce((sum, h) => {
      if (Number.isFinite(Number(h.netAmount))) return sum + Math.abs(Number(h.netAmount));
      const gross = Math.abs(Number(h.amount) || 0);
      const method = h.method === 'Tarjeta' || person.refundDisbursedMethod === 'Tarjeta' ? 'Tarjeta' : 'Efectivo';
      if (typeof computeNetAmountByMethod === 'function') {
        return sum + Math.max(0, Number(computeNetAmountByMethod(gross, method)) || 0);
      }
      return sum + gross;
    }, 0);
    const uncovered = refundFlagAmountIfUncoveredByHistory(person, histRows);
    if (uncovered > 0 && typeof computeNetAmountByMethod === 'function') {
      const method = person.refundDisbursedMethod === 'Tarjeta' ? 'Tarjeta' : 'Efectivo';
      return fromHist + Math.max(0, Number(computeNetAmountByMethod(uncovered, method)) || 0);
    }
    return fromHist + uncovered;
  }
  const gross = getRefundDisbursedGrossAmount(person);
  if (gross <= 0) return 0;
  const method = person.refundDisbursedMethod === 'Tarjeta' ? 'Tarjeta' : 'Efectivo';
  if (typeof computeNetAmountByMethod === 'function') {
    return Math.max(0, Number(computeNetAmountByMethod(gross, method)) || 0);
  }
  return gross;
}

/**
 * Recaudado físico del registro: abonos menos devoluciones ya entregadas.
 * Pendiente de devolución y donación por baja siguen contando (el dinero sigue en caja).
 * Si el historial ya trae filas de devolución, el neto del historial es la fuente de verdad
 * (p. ej. tras reactivar, `paid` ya viene neto y no hay que restar de nuevo).
 */
export function getParticipantPhysicalRecaudadoGross(person, paidGrossFallback) {
  const hist = (person?.paymentHistory || []).filter((h) => h && h.kind !== 'comment');
  if (hist.some((h) => isRefundDisbursementHistoryRow(h, person?.id))) {
    return Math.max(0, hist.reduce((sum, h) => sum + (Number(h.amount) || 0), 0));
  }
  const paid = Number(paidGrossFallback ?? person?.paid ?? 0) || 0;
  return Math.max(0, paid - getRefundDisbursedGrossAmount(person));
}

export function getParticipantPhysicalRecaudadoNet(person, paidNetFallback, computeNetAmountByMethod) {
  const hist = (person?.paymentHistory || []).filter((h) => h && h.kind !== 'comment');
  if (hist.some((h) => isRefundDisbursementHistoryRow(h, person?.id))) {
    return Math.max(
      0,
      hist.reduce((sum, h) => {
        if (Number.isFinite(Number(h.netAmount))) return sum + Number(h.netAmount);
        const method = h.method === 'Tarjeta' ? 'Tarjeta' : 'Efectivo';
        const amt = Number(h.amount) || 0;
        if (typeof computeNetAmountByMethod === 'function') {
          return sum + (Number(computeNetAmountByMethod(amt, method)) || 0);
        }
        return sum + amt;
      }, 0)
    );
  }
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
  if (person.refundAsDonation || currentCancelCycleHasDisbursement(person)) return 0;
  return Math.max(0, Number(person.refundPendingAmount ?? person.paid ?? 0) || 0);
}

export function resolveCancelledRefundSede(person) {
  return String(person?.cancelledFromLocation || person?.location || '').trim();
}

export function findRefundPaymentHistoryRow(person) {
  const rows = listRefundPaymentHistoryRows(person);
  if (!rows.length) return null;
  const cycleStart = parseParticipantCancelledAtMs(person);
  const withTs = rows.map((h) => ({ h, ts: parsePaymentHistoryRecordedAtMs(h) }));
  const inCycle = cycleStart == null ? withTs : withTs.filter((x) => x.ts == null || x.ts >= cycleStart);
  const pool = inCycle.length ? inCycle : withTs;
  pool.sort((a, b) => (b.ts || 0) - (a.ts || 0));
  return pool[0].h;
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

/**
 * ¿La baja actual ya tiene devolución? Un ciclo nuevo (reactivar y volver a dar de baja)
 * no queda bloqueado por una devolución anterior a `cancelledAt`.
 */
export function currentCancelCycleHasDisbursement(person) {
  if (!person) return false;
  const cycleStart = parseParticipantCancelledAtMs(person);
  const rows = listRefundPaymentHistoryRows(person);
  const rowInCycle = rows.some((h) => {
    if (Math.abs(Number(h.amount) || 0) <= 0) return false;
    const ts = parsePaymentHistoryRecordedAtMs(h);
    if (cycleStart == null) return ts != null || parseRefundDisbursedAtMs(person) != null;
    if (ts == null) return false;
    return ts >= cycleStart;
  });
  if (rowInCycle) return true;
  const flagAt = parseRefundDisbursedAtMs(person);
  const flagAmt = Number(person.refundDisbursedAmount) || 0;
  if (flagAmt <= 0 || flagAt == null) return false;
  if (cycleStart == null) return true;
  return flagAt >= cycleStart;
}

/** Fecha del egreso de devolución: historial de pagos (si existe) y luego `refundDisbursedAt`. */
export function resolveRefundDisbursementTimestampMs(person) {
  const histRow = findRefundPaymentHistoryRow(person);
  const fromHist = parsePaymentHistoryRecordedAtMs(histRow);
  if (fromHist != null) return fromHist;
  return parseRefundDisbursedAtMs(person);
}

export function participantHasRefundDisbursement(person) {
  const rows = listRefundPaymentHistoryRows(person);
  if (rows.some((h) => Math.abs(Number(h.amount) || 0) > 0 && parsePaymentHistoryRecordedAtMs(h) != null)) {
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

function buildCashCutMovementFromRefundHist(person, histRow, computeNetAmountByMethod, resolveServiceLabel) {
  const gross = Math.abs(Number(histRow?.amount) || 0);
  if (gross <= 0) return null;
  const ts = parsePaymentHistoryRecordedAtMs(histRow) ?? parseRefundDisbursedAtMs(person);
  if (ts == null) return null;
  const method =
    histRow?.method === 'Tarjeta' || histRow?.method === 'Efectivo'
      ? histRow.method
      : person.refundDisbursedMethod === 'Tarjeta'
        ? 'Tarjeta'
        : 'Efectivo';
  const loc = resolveCancelledRefundSede(person) || person.refundDisbursedLocation || '';
  const netPositive = Number.isFinite(Number(histRow.netAmount))
    ? Math.abs(Number(histRow.netAmount))
    : computeNetAmountByMethod(gross, method);
  const service =
    (typeof resolveServiceLabel === 'function' ? resolveServiceLabel(person, ts, loc) : null) ||
    histRow?.service ||
    'Devolución';
  return {
    id: String(histRow.id || `refund-disb-${person.id}-${ts}`),
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

export function buildCashCutRefundDisbursementRow(person, computeNetAmountByMethod, resolveServiceLabel) {
  const histRows = listRefundPaymentHistoryRows(person);
  if (histRows.length === 1) {
    return buildCashCutMovementFromRefundHist(person, histRows[0], computeNetAmountByMethod, resolveServiceLabel);
  }
  if (histRows.length > 1) {
    const gross = histRows.reduce((sum, h) => sum + Math.abs(Number(h.amount) || 0), 0);
    const ts = resolveRefundDisbursementTimestampMs(person);
    if (gross <= 0 || ts == null) return null;
    const netPositive = histRows.reduce((sum, h) => {
      if (Number.isFinite(Number(h.netAmount))) return sum + Math.abs(Number(h.netAmount));
      const g = Math.abs(Number(h.amount) || 0);
      const method = h.method === 'Tarjeta' ? 'Tarjeta' : 'Efectivo';
      return sum + (Number(computeNetAmountByMethod(g, method)) || 0);
    }, 0);
    const loc = resolveCancelledRefundSede(person) || person.refundDisbursedLocation || '';
    const service =
      (typeof resolveServiceLabel === 'function' ? resolveServiceLabel(person, ts, loc) : null) || 'Devolución';
    return {
      id: `refund-disb-${person.id}`,
      amount: -gross,
      netAmount: -netPositive,
      method: 'Efectivo',
      service,
      reference: '',
      registeredBy: person.refundDisbursedBy || '?',
      _ts: ts,
      _date: new Date(ts),
      _personName: person.name || '',
      _personId: person.id,
      _loc: String(loc || '').trim(),
      _isRefundDisbursement: true,
      kind: 'refund_disbursement',
    };
  }
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
    const histRows = listRefundPaymentHistoryRows(p);
    if (histRows.length) {
      histRows.forEach((histRow) => {
        const row = buildCashCutMovementFromRefundHist(p, histRow, computeNetAmountByMethod, resolveServiceLabel);
        if (row) out.push(row);
      });
      const uncovered = refundFlagAmountIfUncoveredByHistory(p, histRows);
      if (uncovered > 0) {
        const flagRow = buildCashCutRefundDisbursementRow(
          { ...p, paymentHistory: [] },
          computeNetAmountByMethod,
          resolveServiceLabel
        );
        if (flagRow) out.push(flagRow);
      }
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
    id: refundDisbursementPaymentHistoryId(personId, at),
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
  return listRefundPaymentHistoryRows(person).length > 0;
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
