import { SERVICE_OPTIONS } from '../../appConstants.js';
import {
  CASH_CUT_NO_SERVICE_LABEL,
  DEFAULT_SERVICE_SLOTS,
  getCashCutScheduleForLocation,
} from '../../cashCutService.js';

/** Servicios de corte de caja por sede (subset ordenado de SERVICE_OPTIONS). */
export const getCashCutServicesForLocation = (
  event,
  locName,
  globalSlots = DEFAULT_SERVICE_SLOTS,
  globalScheduleByLocation = null,
) => {
  const sched = getCashCutScheduleForLocation(event, locName, globalSlots, globalScheduleByLocation);
  return SERVICE_OPTIONS.filter((s) => sched[s]);
};

/** Columnas a mostrar: configuración ∪ servicios que ya aparecen en pagos de esa sede. */
export const getCashCutServiceColumnsForLocation = (
  event,
  locName,
  paymentsForCut,
  globalSlots = DEFAULT_SERVICE_SLOTS,
  globalScheduleByLocation = null,
) => {
  const configured = new Set(getCashCutServicesForLocation(event, locName, globalSlots, globalScheduleByLocation));
  const fromData = new Set();
  for (const p of paymentsForCut || []) {
    if (String(p._loc || '') !== String(locName || '')) continue;
    const s = p.service;
    if (SERVICE_OPTIONS.includes(s)) fromData.add(s);
  }
  const union = new Set([...configured, ...fromData]);
  return SERVICE_OPTIONS.filter((s) => union.has(s));
};

export const aggregateCashCutPaymentsForLocAndService = (payments, loc, svc) => {
  let efectivo = 0;
  let tarjeta = 0;
  let total = 0;
  let totalNet = 0;
  let count = 0;
  for (const p of payments || []) {
    if (loc != null && String(p._loc || '') !== String(loc || '')) continue;
    const ps = p.service || CASH_CUT_NO_SERVICE_LABEL;
    if (ps !== svc) continue;
    const amt = parseFloat(p.amount) || 0;
    const net = parseFloat(p.netAmount ?? p.amount) || 0;
    total += amt;
    totalNet += net;
    count += 1;
    if (p.method === 'Tarjeta') tarjeta += amt;
    else efectivo += amt;
  }
  return { efectivo, tarjeta, total, totalNet, count };
};

/** Total del día (todos los servicios) para una sede en corte de caja. */
export const aggregateCashCutPaymentsForLoc = (payments, loc) => {
  let efectivo = 0;
  let tarjeta = 0;
  let total = 0;
  let totalNet = 0;
  let count = 0;
  for (const p of payments || []) {
    if (loc != null && String(p._loc || '') !== String(loc || '')) continue;
    const amt = parseFloat(p.amount) || 0;
    const net = parseFloat(p.netAmount ?? p.amount) || 0;
    total += amt;
    totalNet += net;
    count += 1;
    if (p.method === 'Tarjeta') tarjeta += amt;
    else efectivo += amt;
  }
  return { efectivo, tarjeta, total, totalNet, count };
};

/** Rubros fuera de Primero/Segundo/Tercero con movimientos en una sede. */
export const getOffScheduleServiceKeysForLocation = (payments, loc) => {
  const keys = new Set();
  for (const p of payments || []) {
    if (String(p._loc || '') !== String(loc || '')) continue;
    const s = p.service || CASH_CUT_NO_SERVICE_LABEL;
    if (!SERVICE_OPTIONS.includes(s)) keys.add(s);
  }
  return [...keys].sort((a, b) => String(a).localeCompare(String(b), 'es'));
};
