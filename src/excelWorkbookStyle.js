/**
 * Estilos compartidos y utilidades de layout para exportación Excel (todas las hojas).
 */

export const DEFAULT_MAX_COL_WCH = 84;
export const DEFAULT_MIN_COL_WCH = 9;

export const EXCEL_PALETTE = {
  coverBg: '0F172A',
  coverFont: 'F8FAFC',
  coverSubFont: 'CBD5E1',
  coverMetaBg: 'E2E8F0',
  coverMetaFont: '334155',
  sectionBg: '0050FF',
  sectionFont: 'FFFFFF',
  tableHeaderBg: '1E40AF',
  tableHeaderFont: 'FFFFFF',
  sedeBg: '0E7490',
  sedeFont: 'FFFFFF',
  dayBg: 'DBEAFE',
  dayFont: '1E3A8A',
  serviceBg: 'E0E7FF',
  serviceFont: '3730A3',
  ingresoBg: 'DCFCE7',
  ingresoFont: '166534',
  ingresoTipoBg: 'BBF7D0',
  egresoBg: 'FEE2E2',
  egresoFont: '991B1B',
  egresoTipoBg: 'FECACA',
  donacionBg: 'F3E8FF',
  donacionFont: '6B21A8',
  donacionTipoBg: 'E9D5FF',
  zebraBg: 'F8FAFC',
  subtotalServiceBg: 'FEF9C3',
  subtotalServiceFont: '854D0E',
  subtotalDayBg: 'FDE68A',
  subtotalDayFont: '78350F',
  subtotalSedeBg: 'FCD34D',
  subtotalSedeFont: '451A03',
  summaryHeaderBg: '1D4ED8',
  summaryHeaderFont: 'FFFFFF',
  summaryTotalBg: 'BFDBFE',
  summaryTotalFont: '1E3A8A',
  grandBg: '0050FF',
  grandFont: 'FFFFFF',
  moneyFont: '0F172A',
  inscritoBg: 'C8E6C9',
  inscritoFont: '1B5E20',
  esperaBg: 'FFE0B2',
  esperaFont: 'BF360C',
  canceladoBg: 'FFCDD2',
  canceladoFont: 'B71C1C',
  devolucionBg: 'F3E8FF',
  devolucionFont: '6B21A8',
  siBg: 'DCFCE7',
  siFont: '166534',
  noBg: 'FEE2E2',
  noFont: '991B1B',
  waPendingBg: 'FFF3E0',
  waPendingFont: 'E65100',
  waDoneBg: 'D1FAE5',
  waDoneFont: '047857',
  kvLabelBg: 'F1F5F9',
  kvLabelFont: '334155',
  kvValueBg: 'FFFFFF',
  kvValueFont: '0F172A',
  blockTitleBg: 'E0E7FF',
  blockTitleFont: '312E81',
};

export function makeStyle(bgColor, fontColor, bold = false, align = null, wrap = true) {
  const style = {
    fill: { patternType: 'solid', fgColor: { rgb: bgColor } },
    font: { color: { rgb: fontColor }, bold },
  };
  if (align || wrap) {
    style.alignment = {
      horizontal: align || 'left',
      vertical: 'top',
      wrapText: wrap,
    };
  }
  return style;
}

export function mergeCellStyle(existing, patch) {
  const prev = existing && typeof existing === 'object' ? existing : {};
  return {
    ...prev,
    ...patch,
    font: { ...(prev.font || {}), ...(patch.font || {}) },
    fill: { ...(prev.fill || {}), ...(patch.fill || {}) },
    alignment: { vertical: 'top', wrapText: true, ...(prev.alignment || {}), ...(patch.alignment || {}) },
    border: { ...(prev.border || {}), ...(patch.border || {}) },
  };
}

export function cellDisplayWidth(value) {
  if (value == null || value === '') return 0;
  const s = String(value).replace(/\r/g, '');
  const lines = s.split('\n');
  let max = 0;
  for (const line of lines) {
    let w = 0;
    for (const ch of line) {
      w += ch.charCodeAt(0) > 255 ? 1.15 : 1;
    }
    max = Math.max(max, Math.ceil(w));
  }
  return max;
}

/**
 * Calcula anchos de columna según contenido (evita texto cortado).
 */
export function computeColumnWidthsFromAoa(aoa, options = {}) {
  const minW = options.minWidth ?? DEFAULT_MIN_COL_WCH;
  const maxW = options.maxWidth ?? DEFAULT_MAX_COL_WCH;
  const pad = options.padding ?? 3;
  const maxCol = Math.max(0, ...aoa.map((r) => (Array.isArray(r) ? r.length : 0)));
  const widths = Array.from({ length: maxCol }, () => minW);

  for (let r = 0; r < aoa.length; r++) {
    const row = aoa[r];
    if (!Array.isArray(row)) continue;

    const filled = row
      .map((cell, ci) => ({ cell, ci }))
      .filter(({ cell }) => cell != null && cell !== '');

    if (filled.length === 1) {
      const { cell, ci } = filled[0];
      const w = Math.min(cellDisplayWidth(cell) + pad, maxW);
      widths[ci] = Math.max(widths[ci], w);
      continue;
    }

    for (let c = 0; c < row.length; c++) {
      const w = Math.min(cellDisplayWidth(row[c]) + pad, maxW);
      widths[c] = Math.max(widths[c], w);
    }
  }

  if (options.columnMin) {
    for (const [col, min] of Object.entries(options.columnMin)) {
      const ci = Number(col);
      if (Number.isFinite(ci)) widths[ci] = Math.max(widths[ci], min);
    }
  }
  if (options.columnMax) {
    for (const [col, max] of Object.entries(options.columnMax)) {
      const ci = Number(col);
      if (Number.isFinite(ci)) widths[ci] = Math.min(widths[ci], max);
    }
  }

  return widths.map((wch) => ({ wch }));
}

export function applyWorksheetColumnWidths(ws, aoa, options = {}) {
  if (!ws || !aoa?.length) return;
  ws['!cols'] = computeColumnWidthsFromAoa(aoa, options);
}

function paintRow(ws, XLSX, rowIndex, colCount, style) {
  for (let C = 0; C < colCount; C++) {
    const addr = XLSX.utils.encode_cell({ r: rowIndex, c: C });
    if (!ws[addr]) ws[addr] = { t: 's', v: '' };
    ws[addr].s = mergeCellStyle(ws[addr].s, style);
  }
}

function paintCell(ws, XLSX, rowIndex, colIndex, style) {
  const addr = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
  if (!ws[addr]) return;
  ws[addr].s = mergeCellStyle(ws[addr].s, style);
}

function rowIsEmpty(row) {
  return !row || !row.length || row.every((c) => c == null || c === '');
}

function isSectionTitleCell(val) {
  const a = String(val ?? '').trim();
  if (!a) return false;
  return (
    /^MÉTRICAS|^DATOS FINAN|^DESGLOSE|^Panel comisión|^Camión|^Llegada|^Transporte|^Comisión tarjeta|^DETALLE|^RESUMEN|^—\s/i.test(
      a
    ) || /^SEDE ·|^Servicio ·|^Subtotal|^TOTAL /i.test(a)
  );
}

function isTableHeaderRow(row) {
  if (!Array.isArray(row) || row.length < 2) return false;
  const texts = row.filter((c) => c != null && String(c).trim() !== '');
  if (texts.length < 2) return false;
  const first = String(row[0] ?? '').trim();
  return /^(Sede|Concepto|Fecha|Bloque|Nombre|Tipo|Estatus|Exportación|Semana|Alcance)/i.test(first);
}

function inferReportRowRoles(aoa) {
  const roles = [];
  for (let r = 0; r < aoa.length; r++) {
    const row = aoa[r];
    if (rowIsEmpty(row)) {
      roles.push('spacer');
      continue;
    }
    const a = String(row[0] ?? '').trim();

    if (r === 0 && (row.length >= 2 || /Dashboard|Transporte|Comisión|Exportación|CORTE/i.test(a))) {
      roles.push('cover-title');
      continue;
    }
    if (r === 1 && roles[0] === 'cover-title' && row.length >= 1) {
      roles.push(/Generado|Alcance|Fecha|Instrucciones/i.test(a) ? 'cover-meta' : 'cover-subtitle');
      continue;
    }
    if (/^Instrucciones:/i.test(a)) {
      roles.push('cover-meta');
      continue;
    }
    if (isSectionTitleCell(a)) {
      roles.push('section-title');
      continue;
    }
    if (isTableHeaderRow(row)) {
      roles.push('table-header');
      continue;
    }
    if (row.length >= 2 && a && row[1] != null && row[1] !== '' && row.slice(2).every((c) => c == null || c === '')) {
      roles.push('kv-row');
      continue;
    }
    if (row.length === 1 || (a && row.slice(1).every((c) => c == null || c === ''))) {
      roles.push('block-title');
      continue;
    }
    roles.push('data');
  }
  return roles;
}

/**
 * Hoja clave-valor (Metadatos).
 */
export function applyKeyValueSheetStyles(XLSX, ws, aoa) {
  if (!ws || !ws['!ref']) return;
  const range = XLSX.utils.decode_range(ws['!ref']);
  const colCount = range.e.c - range.s.c + 1;

  for (let R = 0; R < aoa.length && R <= range.e.r; R++) {
    const row = aoa[R];
    if (rowIsEmpty(row)) continue;
    if (R === 0) {
      paintRow(ws, XLSX, R, colCount, makeStyle(EXCEL_PALETTE.coverBg, EXCEL_PALETTE.coverFont, true));
      continue;
    }
    paintCell(ws, XLSX, R, 0, makeStyle(EXCEL_PALETTE.kvLabelBg, EXCEL_PALETTE.kvLabelFont, true));
    for (let C = 1; C < colCount; C++) {
      paintCell(ws, XLSX, R, C, makeStyle(EXCEL_PALETTE.kvValueBg, EXCEL_PALETTE.kvValueFont, false));
    }
  }
}

/**
 * Tabla simple: fila 0 = encabezado, resto = datos con zebra.
 */
export function applyStandardDataTableStyles(XLSX, ws, aoa, options = {}) {
  if (!ws || !ws['!ref'] || !aoa?.length) return;
  const headerRow = options.headerRow ?? 0;
  const range = XLSX.utils.decode_range(ws['!ref']);
  const colCount = range.e.c - range.s.c + 1;
  const estatusCol = options.estatusCol ?? -1;
  const waPendingCol = options.waPendingCol ?? -1;
  const estadoFinCol = options.estadoFinancieroCol ?? -1;

  if (options.coverTitle && headerRow > 0) {
    for (let R = 0; R < headerRow; R++) {
      if (rowIsEmpty(aoa[R])) continue;
      paintRow(ws, XLSX, R, colCount, makeStyle(EXCEL_PALETTE.coverBg, EXCEL_PALETTE.coverFont, R === 0));
    }
  }

  paintRow(
    ws,
    XLSX,
    headerRow,
    colCount,
    makeStyle(EXCEL_PALETTE.tableHeaderBg, EXCEL_PALETTE.tableHeaderFont, true, 'center')
  );

  let stripe = 0;
  for (let R = headerRow + 1; R <= range.e.r; R++) {
    const row = aoa[R];
    if (rowIsEmpty(row)) {
      paintRow(ws, XLSX, R, colCount, makeStyle('FFFFFF', EXCEL_PALETTE.moneyFont, false));
      continue;
    }

    const bg = stripe % 2 === 0 ? 'FFFFFF' : EXCEL_PALETTE.zebraBg;
    stripe += 1;
    paintRow(ws, XLSX, R, colCount, makeStyle(bg, EXCEL_PALETTE.moneyFont, false));

    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[addr];
      if (!cell || cell.v == null) continue;
      const val = String(cell.v).trim();

      if (C === estatusCol) {
        if (/\(activo\)|Acompa|Becado \(activo\)/i.test(val)) {
          cell.s = mergeCellStyle(cell.s, makeStyle(EXCEL_PALETTE.inscritoBg, EXCEL_PALETTE.inscritoFont));
        } else if (/espera/i.test(val)) {
          cell.s = mergeCellStyle(cell.s, makeStyle(EXCEL_PALETTE.esperaBg, EXCEL_PALETTE.esperaFont));
        } else if (/Cancelado/i.test(val)) {
          cell.s = mergeCellStyle(cell.s, makeStyle(EXCEL_PALETTE.canceladoBg, EXCEL_PALETTE.canceladoFont));
        }
      }
      if (C === waPendingCol) {
        if (val === '\u2610') {
          cell.s = mergeCellStyle(cell.s, makeStyle(EXCEL_PALETTE.waPendingBg, EXCEL_PALETTE.waPendingFont));
        } else if (val === '\u2611') {
          cell.s = mergeCellStyle(cell.s, makeStyle(EXCEL_PALETTE.waDoneBg, EXCEL_PALETTE.waDoneFont));
        }
      }
      if (C === estadoFinCol && /Devolución/i.test(val)) {
        cell.s = mergeCellStyle(cell.s, makeStyle(EXCEL_PALETTE.devolucionBg, EXCEL_PALETTE.devolucionFont, true));
      }
      if (val === 'Sí' || val === 'Si') {
        cell.s = mergeCellStyle(cell.s, makeStyle(EXCEL_PALETTE.siBg, EXCEL_PALETTE.siFont));
      } else if (val === 'No') {
        cell.s = mergeCellStyle(cell.s, makeStyle(EXCEL_PALETTE.noBg, EXCEL_PALETTE.noFont));
      }
    }
  }
}

/**
 * Dashboard, transporte, comisión y reportes mixtos.
 */
export function applyStructuredReportSheetStyles(XLSX, ws, aoa, options = {}) {
  if (!ws || !ws['!ref'] || !aoa?.length) return;
  const roles = options.rowRoles ?? inferReportRowRoles(aoa);
  const range = XLSX.utils.decode_range(ws['!ref']);
  const colCount = range.e.c - range.s.c + 1;
  let dataStripe = 0;

  for (let R = 0; R < roles.length && R <= range.e.r; R++) {
    const role = roles[R];
    switch (role) {
      case 'cover-title':
        paintRow(ws, XLSX, R, colCount, makeStyle(EXCEL_PALETTE.coverBg, EXCEL_PALETTE.coverFont, true));
        break;
      case 'cover-subtitle':
        paintRow(ws, XLSX, R, colCount, makeStyle(EXCEL_PALETTE.coverBg, EXCEL_PALETTE.coverSubFont, false));
        break;
      case 'cover-meta':
        paintRow(ws, XLSX, R, colCount, makeStyle(EXCEL_PALETTE.coverMetaBg, EXCEL_PALETTE.coverMetaFont, false));
        break;
      case 'section-title':
        paintRow(ws, XLSX, R, colCount, makeStyle(EXCEL_PALETTE.sectionBg, EXCEL_PALETTE.sectionFont, true));
        break;
      case 'table-header':
        paintRow(
          ws,
          XLSX,
          R,
          colCount,
          makeStyle(EXCEL_PALETTE.tableHeaderBg, EXCEL_PALETTE.tableHeaderFont, true, 'center')
        );
        break;
      case 'block-title':
        paintRow(ws, XLSX, R, colCount, makeStyle(EXCEL_PALETTE.blockTitleBg, EXCEL_PALETTE.blockTitleFont, true));
        break;
      case 'kv-row': {
        paintCell(ws, XLSX, R, 0, makeStyle(EXCEL_PALETTE.kvLabelBg, EXCEL_PALETTE.kvLabelFont, true));
        for (let C = 1; C < colCount; C++) {
          paintCell(ws, XLSX, R, C, makeStyle(EXCEL_PALETTE.kvValueBg, EXCEL_PALETTE.kvValueFont, false));
        }
        break;
      }
      case 'data': {
        const bg = dataStripe % 2 === 0 ? 'FFFFFF' : EXCEL_PALETTE.zebraBg;
        dataStripe += 1;
        paintRow(ws, XLSX, R, colCount, makeStyle(bg, EXCEL_PALETTE.moneyFont, false));
        break;
      }
      default:
        break;
    }
  }
}

export function findHeaderColumnIndex(headers, name) {
  if (!Array.isArray(headers)) return -1;
  return headers.findIndex((h) => String(h || '').trim() === name);
}
