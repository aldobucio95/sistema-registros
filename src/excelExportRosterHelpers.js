/**
 * Helpers para exportación Excel de roster: columnas semanales de abonos y finanzas con devolución.
 */

import { getEventEffectiveEndDate } from './eventDateHelpers.js';
import {
  getRefundDisbursedGrossAmount,
  getParticipantNetPaidFromHistory,
  participantHasRefundDisbursement,
  participantIsCancelledForRefund,
  parsePaymentHistoryRecordedAtMs,
  REFUND_DISBURSEMENT_PAYMENT_KIND,
} from './cashCutRefunds.js';

/** Lunes local (00:00) de la semana calendario lun–dom que contiene `input`. */
export function getMondayLocalFromDate(input) {
  const d = input instanceof Date ? new Date(input.getTime()) : new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffToMonday, 0, 0, 0, 0);
}

/** Clave `YYYY-MM-DD` del lunes local. */
export function getExcelWeekKey(input) {
  const monday = getMondayLocalFromDate(input);
  if (!monday) return '';
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, '0');
  const dd = String(monday.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** Etiqueta corta para encabezado de columna semanal. */
export function formatExcelWeekColumnLabel(mondayIso) {
  const m = String(mondayIso || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(m)) return m;
  const [y, mo, dd] = m.split('-').map(Number);
  const mon = new Date(y, mo - 1, dd, 12, 0, 0, 0);
  const sun = new Date(y, mo - 1, dd + 6, 12, 0, 0, 0);
  const f = (d) => d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  return `Abono ${f(mon)}–${f(sun)}`;
}

function addDaysToIso(iso, days) {
  const m = String(iso || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(m)) return m;
  const [y, mo, dd] = m.split('-').map(Number);
  const d = new Date(y, mo - 1, dd + days, 12, 0, 0, 0);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dds = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dds}`;
}

function isoToLocalMs(iso) {
  const m = String(iso || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(m)) return null;
  const [y, mo, dd] = m.split('-').map(Number);
  const t = new Date(y, mo - 1, dd, 12, 0, 0, 0).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * Semanas lun–dom desde el primer `registeredAt` del pool hasta el fin del evento.
 */
export function buildExcelWeeklyAbonoColumnDefs(participants, event, parseInstant) {
  let firstMs = null;
  for (const p of participants || []) {
    const t = typeof parseInstant === 'function' ? parseInstant(p?.registeredAt) : null;
    if (t != null && (firstMs == null || t < firstMs)) firstMs = t;
  }
  const endIso = getEventEffectiveEndDate(event) || '';
  const endMs = isoToLocalMs(endIso) ?? Date.now();
  const startMs = firstMs ?? endMs;

  let cur = getExcelWeekKey(new Date(startMs));
  const endMonday = getExcelWeekKey(new Date(endMs));
  if (!cur || !endMonday) return [];

  const out = [];
  const seen = new Set();
  while (cur && cur <= endMonday) {
    if (!seen.has(cur)) {
      seen.add(cur);
      out.push({ key: cur, label: formatExcelWeekColumnLabel(cur) });
    }
    const next = addDaysToIso(cur, 7);
    if (next === cur) break;
    cur = next;
  }
  return out;
}

function paymentInWeek(ms, weekMondayIso) {
  if (ms == null || !weekMondayIso) return false;
  const weekStart = isoToLocalMs(weekMondayIso);
  if (weekStart == null) return false;
  const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000;
  return ms >= weekStart && ms < weekEnd;
}

/** Suma abonos positivos del participante en la semana indicada (clave de lunes). */
export function sumParticipantWeeklyAbono(person, weekMondayIso, parseInstant) {
  if (!person || !weekMondayIso) return '';
  const history = person.paymentHistory || [];
  let sum = 0;
  for (const h of history) {
    if (!h || h.kind === 'comment' || h.kind === REFUND_DISBURSEMENT_PAYMENT_KIND) continue;
    const amt = Number(h.amount) || 0;
    if (amt <= 0) continue;
    const ms =
      parsePaymentHistoryRecordedAtMs(h) ??
      (typeof parseInstant === 'function' ? parseInstant(h.recordedAt ?? h.id) : null);
    if (!paymentInWeek(ms, weekMondayIso)) continue;
    sum += amt;
  }
  return sum > 0 ? sum : '';
}

/** Desglose del saldo vigente (no incluye abonos ya neutralizados por devolución). */
export function buildParticipantPaidBreakdownExcel(p, computeNetAmountByMethod) {
  const effectiveGross = getParticipantNetPaidFromHistory(p, computeNetAmountByMethod);
  if (effectiveGross <= 0) {
    return ['', '', '', '', ''];
  }

  let efectivoGross = 0;
  let tarjetaGross = 0;
  let efectivoNet = 0;
  let tarjetaNet = 0;
  const history = p.paymentHistory || [];
  for (const h of history) {
    if (!h || h.kind === 'comment' || h.kind === REFUND_DISBURSEMENT_PAYMENT_KIND) continue;
    const method = h.method || (p.paymentMethod === 'Tarjeta' ? 'Tarjeta' : 'Efectivo');
    const gross = Number(h.amount || 0) || 0;
    if (gross <= 0) continue;
    const net = computeNetAmountByMethod(gross, method);
    if (method === 'Tarjeta') {
      tarjetaGross += gross;
      tarjetaNet += net;
    } else {
      efectivoGross += gross;
      efectivoNet += net;
    }
  }

  const grossTotal = efectivoGross + tarjetaGross;
  if (grossTotal <= 0) {
    return ['', '', '', '', ''];
  }

  const scale = effectiveGross / grossTotal;
  efectivoGross *= scale;
  tarjetaGross *= scale;
  efectivoNet *= scale;
  tarjetaNet *= scale;
  const commissionTarjeta = Math.max(0, tarjetaGross - tarjetaNet);

  return [
    effectiveGross,
    efectivoNet + tarjetaNet,
    efectivoGross > 0 ? efectivoGross : '',
    tarjetaGross > 0 ? tarjetaGross : '',
    commissionTarjeta > 0 ? commissionTarjeta : '',
  ];
}

function resolveExcelFinancialEstado(p, { isBecado, liq, debt }) {
  if (isBecado && liq <= 0) return 'Becado (total)';
  if (isBecado && p.scholarshipType === 'partial') {
    return debt <= 0 ? 'Beca parcial (liquidado)' : 'Beca parcial (pendiente)';
  }
  return debt <= 0 ? 'Liquidado' : 'Pendiente';
}

/**
 * Celdas financieras para una fila de roster Excel.
 * Cancelado con devolución: Pagado 0, estado «Devolución».
 * Activo reactivado con devolución histórica: estatus activo, columna Devolución, adeudo al total.
 */
export function buildParticipantExcelFinanceCells(p, {
  currentPricing,
  resolveRegisteredCost,
  getLiquidationTarget,
  isSiValue,
  computeNetAmountByMethod,
}) {
  const baseCost = resolveRegisteredCost(p, currentPricing);
  const isBecado = isSiValue(p.isScholarship);
  const isCancelled = participantIsCancelledForRefund(p);
  const hadRefund = participantHasRefundDisbursement(p);
  const devolucion = hadRefund ? getRefundDisbursedGrossAmount(p) : '';
  const effectivePaid = getParticipantNetPaidFromHistory(p, computeNetAmountByMethod);
  const liq = getLiquidationTarget(p);

  if (isCancelled && hadRefund) {
    return [baseCost, 0, devolucion, 0, 'Devolución', '', '', '', '', ''];
  }

  const debt = isCancelled ? 0 : Math.max(0, liq - effectivePaid);
  const estado = isCancelled
    ? hadRefund
      ? 'Devolución'
      : resolveExcelFinancialEstado(p, { isBecado, liq, debt: 0 })
    : resolveExcelFinancialEstado(p, { isBecado, liq, debt });

  return [
    baseCost,
    effectivePaid,
    devolucion,
    debt,
    estado,
    ...buildParticipantPaidBreakdownExcel(p, computeNetAmountByMethod),
  ];
}

export function buildParticipantWeeklyAbonoCells(person, weeklyColumnDefs, parseInstant) {
  if (!weeklyColumnDefs?.length) return [];
  return weeklyColumnDefs.map((w) => sumParticipantWeeklyAbono(person, w.key, parseInstant));
}

export const EXCEL_ROSTER_FINANCE_COL_COUNT = 10;
