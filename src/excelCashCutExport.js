/**
 * Construcción de la hoja «Corte de caja» para exportación Excel.
 * Devuelve filas + metadatos de estilo (roles, merges).
 */

import { CASH_CUT_DETAIL_COLS } from './excelCashCutSheetStyle.js';

const DETAIL_HEADERS = [
  'Fecha / hora',
  'Sede',
  'Participante',
  'Servicio',
  'Tipo',
  'Método',
  'Monto bruto',
  'Comisión',
  'Monto neto',
  'Referencia',
];

const SUMMARY_HEADERS = [
  'Concepto',
  'Total bruto',
  'Total neto',
  'Efectivo bruto',
  'Tarjeta bruto',
  'Donaciones',
];

function pushRow(ctx, role, cells) {
  const row = [...cells];
  while (row.length < CASH_CUT_DETAIL_COLS) row.push('');
  ctx.rows.push(row.slice(0, CASH_CUT_DETAIL_COLS));
  ctx.rowRoles.push(role);
  return ctx.rows.length - 1;
}

function pushBanner(ctx, role, label) {
  const rowIndex = pushRow(ctx, role, [label]);
  ctx.merges.push({
    s: { r: rowIndex, c: 0 },
    e: { r: rowIndex, c: CASH_CUT_DETAIL_COLS - 1 },
  });
}

function pushSpacer(ctx) {
  pushRow(ctx, 'spacer', []);
}

function sumBucket(rows) {
  return rows.reduce(
    (acc, r) => {
      acc.bruto += r.bruto;
      acc.neto += r.neto;
      if (r.method === 'Tarjeta') acc.tar += r.bruto;
      else if (r.method === 'Donación') acc.don += r.bruto;
      else acc.ef += r.bruto;
      return acc;
    },
    { bruto: 0, neto: 0, ef: 0, tar: 0, don: 0 }
  );
}

function subtotalCells(label, bucket) {
  const commission = Math.max(0, bucket.bruto - bucket.neto);
  return [label, '', '', '', '', '', bucket.bruto, commission, bucket.neto, ''];
}

function movementCells(m) {
  const commission = Math.max(0, m.bruto - m.neto);
  return [
    m.dateLabel,
    m.loc,
    m.personName,
    m.service,
    m.tipo,
    m.method,
    m.bruto,
    commission,
    m.neto,
    m.reference,
  ];
}

function movementRole(m) {
  if (m.tipo === 'Egreso / Devolución') return 'movement-egreso';
  if (m.tipo === 'Donación') return 'movement-donacion';
  return 'movement-ingreso';
}

function normalizePaymentMovement(p) {
  const bruto = parseFloat(p.amount) || 0;
  const neto = parseFloat(p.netAmount ?? p.amount) || 0;
  const isRefund = bruto < 0 || p._isRefundDisbursement || p.kind === 'refund_disbursement';
  return {
    ts: p._ts || 0,
    dateKey: p._date
      ? `${p._date.getFullYear()}-${String(p._date.getMonth() + 1).padStart(2, '0')}-${String(p._date.getDate()).padStart(2, '0')}`
      : '',
    dateLabel: p._date ? p._date.toLocaleString('es-MX') : '',
    loc: String(p._loc || '').trim() || '?',
    personName: p._personName || '',
    service: p.service || '—',
    tipo: isRefund ? 'Egreso / Devolución' : 'Ingreso',
    method: p.method || '',
    bruto,
    neto,
    reference: String(p.reference || '').trim(),
  };
}

function normalizeDonationMovement(d, parseInstant) {
  const amount = parseFloat(d.amount) || 0;
  const ts = typeof parseInstant === 'function' ? parseInstant(d.createdAt) ?? 0 : 0;
  const dt = d.createdAt ? new Date(d.createdAt) : new Date(ts || 0);
  const donationType = d.fromCancelledRefundDonation
    ? 'Donación por baja/cancelación'
    : d.fromArchivedManualCredit
      ? 'Donación por archivo'
      : 'Donación';
  return {
    ts,
    dateKey: Number.isNaN(dt.getTime())
      ? ''
      : `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`,
    dateLabel: d.createdAt ? new Date(d.createdAt).toLocaleString('es-MX') : '',
    loc: String(d.location || '').trim() || '?',
    personName: d.donorName || '',
    service: donationType,
    tipo: 'Donación',
    method: 'Donación',
    bruto: amount,
    neto: amount,
    reference: d.sourceParticipantId ? `part:${d.sourceParticipantId}` : '',
  };
}

function formatDateGroupLabel(dateKey) {
  if (!dateKey) return 'Sin fecha';
  const d = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateKey;
  const base = d.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  return d.getDay() === 0 ? `${base} · Domingo` : base;
}

function sumSummaryRows(keys, map) {
  const tot = { total: 0, totalNet: 0, efectivo: 0, tarjeta: 0, donations: 0 };
  keys.forEach((k) => {
    const s = map[k];
    if (!s) return;
    tot.total += s.total;
    tot.totalNet += s.totalNet;
    tot.efectivo += s.efectivo;
    tot.tarjeta += s.tarjeta;
    tot.donations += s.donations;
  });
  return tot;
}

function pushSummaryBlock(ctx, title, dataRows, totalRow) {
  pushSpacer(ctx);
  pushBanner(ctx, 'section-title', title);
  const headerIdx = pushRow(ctx, 'summary-header', SUMMARY_HEADERS);
  ctx.financeHeaderRows.push(headerIdx);
  for (const row of dataRows) {
    pushRow(ctx, 'summary-data', row);
  }
  if (totalRow) pushRow(ctx, 'summary-total', totalRow);
}

function buildDetailSection(ctx, paymentsScoped, eventDonationsForCut, parseInstant) {
  pushBanner(ctx, 'section-title', 'DETALLE DE MOVIMIENTOS');
  const headerIdx = pushRow(ctx, 'table-header', DETAIL_HEADERS);
  ctx.financeHeaderRows.push(headerIdx);

  const movements = [
    ...(paymentsScoped || []).map(normalizePaymentMovement),
    ...(eventDonationsForCut || []).map((d) => normalizeDonationMovement(d, parseInstant)),
  ].sort((a, b) => (a.ts || 0) - (b.ts || 0));

  const byLoc = new Map();
  for (const m of movements) {
    const loc = m.loc || '?';
    if (!byLoc.has(loc)) byLoc.set(loc, []);
    byLoc.get(loc).push(m);
  }

  const grand = { bruto: 0, neto: 0, ef: 0, tar: 0, don: 0 };
  const tipoTotals = {
    Ingreso: { bruto: 0, neto: 0, ef: 0, tar: 0, don: 0 },
    'Egreso / Devolución': { bruto: 0, neto: 0, ef: 0, tar: 0, don: 0 },
    Donación: { bruto: 0, neto: 0, ef: 0, tar: 0, don: 0 },
  };

  const locKeys = [...byLoc.keys()].sort((a, b) => String(a).localeCompare(String(b), 'es'));
  for (const loc of locKeys) {
    pushSpacer(ctx);
    pushBanner(ctx, 'sede-banner', `SEDE · ${loc}`);

    const locMovements = byLoc.get(loc) || [];
    const byDate = new Map();
    for (const m of locMovements) {
      const dk = m.dateKey || 'sin-fecha';
      if (!byDate.has(dk)) byDate.set(dk, []);
      byDate.get(dk).push(m);
    }

    const dateKeys = [...byDate.keys()].sort((a, b) => {
      if (a === 'sin-fecha') return 1;
      if (b === 'sin-fecha') return -1;
      return a.localeCompare(b);
    });

    const locBucket = { bruto: 0, neto: 0, ef: 0, tar: 0, don: 0 };

    for (const dk of dateKeys) {
      const dayMovements = byDate.get(dk) || [];
      const dayLabel = formatDateGroupLabel(dk === 'sin-fecha' ? '' : dk);
      pushBanner(ctx, 'day-banner', dayLabel);

      const byService = new Map();
      for (const m of dayMovements) {
        const svc = m.service || '—';
        if (!byService.has(svc)) byService.set(svc, []);
        byService.get(svc).push(m);
      }

      const dayBucket = { bruto: 0, neto: 0, ef: 0, tar: 0, don: 0 };
      const serviceKeys = [...byService.keys()].sort((a, b) => String(a).localeCompare(String(b), 'es'));

      for (const svc of serviceKeys) {
        const svcMovements = byService.get(svc) || [];
        pushBanner(ctx, 'service-banner', `Servicio · ${svc}`);

        for (const m of svcMovements) {
          pushRow(ctx, movementRole(m), movementCells(m));
          const tipoKey = tipoTotals[m.tipo] ? m.tipo : 'Ingreso';
          const slice = { bruto: m.bruto, neto: m.neto, method: m.method };
          const b = sumBucket([slice]);
          dayBucket.bruto += b.bruto;
          dayBucket.neto += b.neto;
          dayBucket.ef += b.ef;
          dayBucket.tar += b.tar;
          dayBucket.don += b.don;
          locBucket.bruto += b.bruto;
          locBucket.neto += b.neto;
          locBucket.ef += b.ef;
          locBucket.tar += b.tar;
          locBucket.don += b.don;
          grand.bruto += b.bruto;
          grand.neto += b.neto;
          grand.ef += b.ef;
          grand.tar += b.tar;
          grand.don += b.don;
          tipoTotals[tipoKey].bruto += b.bruto;
          tipoTotals[tipoKey].neto += b.neto;
          tipoTotals[tipoKey].ef += b.ef;
          tipoTotals[tipoKey].tar += b.tar;
          tipoTotals[tipoKey].don += b.don;
        }

        const svcBucket = sumBucket(svcMovements.map((m) => ({ bruto: m.bruto, neto: m.neto, method: m.method })));
        pushRow(ctx, 'subtotal-service', subtotalCells(`↳ Subtotal · ${svc}`, svcBucket));
      }

      pushRow(ctx, 'subtotal-day', subtotalCells(`Subtotal del día · ${dayLabel}`, dayBucket));
    }

    pushRow(ctx, 'subtotal-sede', subtotalCells(`Subtotal sede · ${loc}`, locBucket));
  }

  pushSpacer(ctx);
  pushBanner(ctx, 'section-title', 'RESUMEN POR TIPO DE MOVIMIENTO');
  const tipoHeaderIdx = pushRow(ctx, 'table-header', ['Tipo', '', '', '', '', '', 'Monto bruto', 'Comisión', 'Monto neto', '']);
  ctx.financeHeaderRows.push(tipoHeaderIdx);
  for (const [tipo, bucket] of Object.entries(tipoTotals)) {
    pushRow(ctx, 'summary-type-row', subtotalCells(tipo, bucket));
  }
  pushRow(ctx, 'grand-total', subtotalCells('TOTAL GENERAL', grand));

  return { grand, tipoTotals };
}

/**
 * Construye la hoja completa de corte de caja.
 */
export function buildCashCutExcelSheet({
  eventName,
  scopeLabel,
  generatedAtLabel,
  paymentsScoped,
  eventDonationsForCut,
  parseInstant,
  sundayKeys,
  sundayMap,
  weekKeys,
  weekMap,
  byLoc,
  formatWeekLabel,
}) {
  const ctx = {
    rows: [],
    rowRoles: [],
    merges: [],
    financeHeaderRows: [],
  };

  pushRow(ctx, 'cover-title', [`CORTE DE CAJA — ${eventName || 'Evento'}`]);
  pushRow(ctx, 'cover-subtitle', [scopeLabel || '']);
  pushRow(ctx, 'cover-meta', [`Generado: ${generatedAtLabel || ''}`]);
  pushSpacer(ctx);

  buildDetailSection(ctx, paymentsScoped, eventDonationsForCut, parseInstant);

  const sundayData = sundayKeys.map((dk) => {
    const s = sundayMap[dk];
    const d = new Date(`${dk}T12:00:00`);
    return [
      d.toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }),
      s.total,
      s.totalNet,
      s.efectivo,
      s.tarjeta,
      s.donations,
    ];
  });
  const sunGrand = sumSummaryRows(sundayKeys, sundayMap);
  pushSummaryBlock(ctx, 'RESUMEN POR DOMINGO', sundayData, [
    'TOTAL DOMINGOS',
    sunGrand.total,
    sunGrand.totalNet,
    sunGrand.efectivo,
    sunGrand.tarjeta,
    sunGrand.donations,
  ]);

  const weekData = weekKeys.map((wk) => {
    const s = weekMap[wk];
    return [formatWeekLabel(wk), s.total, s.totalNet, s.efectivo, s.tarjeta, s.donations];
  });
  const weekGrand = sumSummaryRows(weekKeys, weekMap);
  pushSummaryBlock(ctx, 'RESUMEN POR SEMANA (lun – dom)', weekData, [
    'TOTAL SEMANAS',
    weekGrand.total,
    weekGrand.totalNet,
    weekGrand.efectivo,
    weekGrand.tarjeta,
    weekGrand.donations,
  ]);

  const locData = [...byLoc.entries()]
    .sort((a, b) => String(a[0]).localeCompare(String(b[0]), 'es'))
    .map(([loc, o]) => [loc, o.bruto, o.neto, o.ef, o.tar, o.don]);
  const locGrand = [...byLoc.values()].reduce(
    (acc, o) => {
      acc.bruto += o.bruto;
      acc.neto += o.neto;
      acc.ef += o.ef;
      acc.tar += o.tar;
      acc.don += o.don;
      return acc;
    },
    { bruto: 0, neto: 0, ef: 0, tar: 0, don: 0 }
  );
  pushSummaryBlock(ctx, 'RESUMEN POR SEDE', locData, [
    'TOTAL SEDES',
    locGrand.bruto,
    locGrand.neto,
    locGrand.ef,
    locGrand.tar,
    locGrand.don,
  ]);

  return {
    rows: ctx.rows,
    meta: {
      rows: ctx.rows,
      rowRoles: ctx.rowRoles,
      merges: ctx.merges,
      financeHeaderRows: ctx.financeHeaderRows,
      detailColCount: CASH_CUT_DETAIL_COLS,
      moneyCols: [6, 7, 8],
      summaryMoneyCols: [1, 2, 3, 4, 5],
    },
  };
}
