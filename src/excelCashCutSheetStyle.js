/**
 * Estilos visuales para la hoja «Corte de caja» en exportación Excel.
 */

import { EXCEL_PALETTE, makeStyle, mergeCellStyle } from './excelWorkbookStyle.js';

export const CASH_CUT_DETAIL_COLS = 10;

function paintRow(ws, XLSX, rowIndex, colCount, style) {
  for (let C = 0; C < colCount; C++) {
    const addr = XLSX.utils.encode_cell({ r: rowIndex, c: C });
    if (!ws[addr]) ws[addr] = { t: 's', v: '' };
    ws[addr].s = mergeCellStyle(ws[addr].s, style);
  }
}

function paintMoneyCols(ws, XLSX, rowIndex, moneyCols, style) {
  for (const C of moneyCols) {
    const addr = XLSX.utils.encode_cell({ r: rowIndex, c: C });
    if (!ws[addr]) continue;
    ws[addr].s = mergeCellStyle(ws[addr].s, style);
  }
}

/**
 * @param {object} XLSX
 * @param {object} ws
 * @param {{ rowRoles?: string[], merges?: object[], detailColCount?: number, moneyCols?: number[] }} meta
 */
export function applyCashCutSheetStyles(XLSX, ws, meta = {}) {
  if (!ws || !ws['!ref'] || !XLSX) return;

  const P = EXCEL_PALETTE;
  const rowRoles = meta.rowRoles || [];
  const detailColCount = meta.detailColCount ?? CASH_CUT_DETAIL_COLS;
  const moneyCols = meta.moneyCols ?? [6, 7, 8];
  const summaryMoneyCols = meta.summaryMoneyCols ?? [1, 2, 3, 4, 5];
  const range = XLSX.utils.decode_range(ws['!ref']);

  if (meta.merges?.length) {
    ws['!merges'] = [...(ws['!merges'] || []), ...meta.merges];
  }

  let movementStripe = 0;

  for (let R = 0; R < rowRoles.length && R <= range.e.r; R++) {
    const role = rowRoles[R];

    switch (role) {
      case 'cover-title':
        paintRow(ws, XLSX, R, detailColCount, makeStyle(P.coverBg, P.coverFont, true, 'left'));
        break;
      case 'cover-subtitle':
        paintRow(ws, XLSX, R, detailColCount, makeStyle(P.coverBg, P.coverSubFont, false, 'left'));
        break;
      case 'cover-meta':
        paintRow(ws, XLSX, R, detailColCount, makeStyle(P.coverMetaBg, P.coverMetaFont, false, 'left'));
        break;
      case 'section-title':
        paintRow(ws, XLSX, R, detailColCount, makeStyle(P.sectionBg, P.sectionFont, true, 'left'));
        break;
      case 'table-header':
        paintRow(ws, XLSX, R, detailColCount, makeStyle(P.tableHeaderBg, P.tableHeaderFont, true, 'center'));
        break;
      case 'sede-banner':
        paintRow(ws, XLSX, R, detailColCount, makeStyle(P.sedeBg, P.sedeFont, true, 'left'));
        break;
      case 'day-banner':
        paintRow(ws, XLSX, R, detailColCount, makeStyle(P.dayBg, P.dayFont, true, 'left'));
        break;
      case 'service-banner':
        paintRow(ws, XLSX, R, detailColCount, makeStyle(P.serviceBg, P.serviceFont, true, 'left'));
        break;
      case 'movement-ingreso': {
        const zebra = movementStripe % 2 === 1 ? P.zebraBg : 'FFFFFF';
        movementStripe += 1;
        paintRow(ws, XLSX, R, detailColCount, makeStyle(zebra, P.ingresoFont, false));
        const tipoAddr = XLSX.utils.encode_cell({ r: R, c: 4 });
        if (ws[tipoAddr]) {
          ws[tipoAddr].s = mergeCellStyle(ws[tipoAddr].s, makeStyle(P.ingresoTipoBg, P.ingresoFont, true, 'center'));
        }
        break;
      }
      case 'movement-egreso':
        movementStripe += 1;
        paintRow(ws, XLSX, R, detailColCount, makeStyle(P.egresoBg, P.egresoFont, false));
        {
          const tipoAddr = XLSX.utils.encode_cell({ r: R, c: 4 });
          if (ws[tipoAddr]) {
            ws[tipoAddr].s = mergeCellStyle(ws[tipoAddr].s, makeStyle(P.egresoTipoBg, P.egresoFont, true, 'center'));
          }
        }
        break;
      case 'movement-donacion':
        movementStripe += 1;
        paintRow(ws, XLSX, R, detailColCount, makeStyle(P.donacionBg, P.donacionFont, false));
        {
          const tipoAddr = XLSX.utils.encode_cell({ r: R, c: 4 });
          if (ws[tipoAddr]) {
            ws[tipoAddr].s = mergeCellStyle(ws[tipoAddr].s, makeStyle(P.donacionTipoBg, P.donacionFont, true, 'center'));
          }
        }
        break;
      case 'subtotal-service':
        paintRow(ws, XLSX, R, detailColCount, makeStyle(P.subtotalServiceBg, P.subtotalServiceFont, true));
        paintMoneyCols(ws, XLSX, R, moneyCols, makeStyle(P.subtotalServiceBg, P.moneyFont, true));
        break;
      case 'subtotal-day':
        paintRow(ws, XLSX, R, detailColCount, makeStyle(P.subtotalDayBg, P.subtotalDayFont, true));
        paintMoneyCols(ws, XLSX, R, moneyCols, makeStyle(P.subtotalDayBg, P.moneyFont, true));
        break;
      case 'subtotal-sede':
        paintRow(ws, XLSX, R, detailColCount, makeStyle(P.subtotalSedeBg, P.subtotalSedeFont, true));
        paintMoneyCols(ws, XLSX, R, moneyCols, makeStyle(P.subtotalSedeBg, P.moneyFont, true));
        break;
      case 'summary-header':
        paintRow(ws, XLSX, R, 6, makeStyle(P.summaryHeaderBg, P.summaryHeaderFont, true, 'center'));
        break;
      case 'summary-data': {
        const stripe = R % 2 === 0 ? 'FFFFFF' : P.zebraBg;
        paintRow(ws, XLSX, R, 6, makeStyle(stripe, P.moneyFont, false));
        paintMoneyCols(ws, XLSX, R, summaryMoneyCols, makeStyle(stripe, P.moneyFont, false));
        break;
      }
      case 'summary-total':
        paintRow(ws, XLSX, R, 6, makeStyle(P.summaryTotalBg, P.summaryTotalFont, true));
        paintMoneyCols(ws, XLSX, R, summaryMoneyCols, makeStyle(P.summaryTotalBg, P.summaryTotalFont, true));
        break;
      case 'grand-total':
        paintRow(ws, XLSX, R, detailColCount, makeStyle(P.grandBg, P.grandFont, true));
        paintMoneyCols(ws, XLSX, R, moneyCols, makeStyle(P.grandBg, P.grandFont, true));
        break;
      case 'summary-type-row':
        paintRow(ws, XLSX, R, detailColCount, makeStyle('EFF6FF', '1E40AF', false));
        paintMoneyCols(ws, XLSX, R, moneyCols, makeStyle('EFF6FF', P.moneyFont, true));
        break;
      default:
        break;
    }
  }

  for (let R = 0; R < rowRoles.length; R++) {
    if (rowRoles[R] !== 'table-header') continue;
    for (let C = 0; C < detailColCount; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[addr]) continue;
      ws[addr].s = mergeCellStyle(ws[addr].s, {
        border: {
          top: { style: 'thin', color: { rgb: 'FFFFFF' } },
          bottom: { style: 'medium', color: { rgb: '1E3A8A' } },
          left: { style: 'thin', color: { rgb: 'FFFFFF' } },
          right: { style: 'thin', color: { rgb: 'FFFFFF' } },
        },
      });
    }
  }
}
