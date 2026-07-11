/** Estilos estáticos puntuales en exportación Excel (el resto va por formato condicional). */

import { clampUrlForExcelHyperlink, isExcelSafeHyperlinkUrl } from './excelHyperlinkUrl.js';

export const EXCEL_FONT_HYPERLINK = { color: { rgb: '0563C1' }, underline: true };

function mergeCellStyle(existing, patch) {
  const prev = existing && typeof existing === 'object' ? existing : {};
  return {
    ...prev,
    ...patch,
    font: { ...(prev.font || {}), ...(patch.font || {}) },
  };
}

/** Hipervínculo WhatsApp (azul subrayado); el color de fila/celda lo aplica formato condicional. */
export function applyExcelHyperlinkCellStyle(ws, addr) {
  if (!ws || !addr || !ws[addr]) return;
  ws[addr].s = mergeCellStyle(ws[addr].s, { font: EXCEL_FONT_HYPERLINK });
}

/** Escribe hipervínculos WhatsApp en celdas ya materializadas desde un AOA. */
export function applyWhatsAppHyperlinksToWorksheet(ws, aoa, linkTargets, encodeCell) {
  if (!ws || !linkTargets?.size || typeof encodeCell !== 'function') return;
  for (const [key, url] of linkTargets) {
    const safeUrl = clampUrlForExcelHyperlink(url);
    if (!isExcelSafeHyperlinkUrl(safeUrl)) continue;
    const [r, c] = key.split(',').map((x) => parseInt(x, 10));
    if (!Number.isFinite(r) || !Number.isFinite(c) || r < 0 || c < 0) continue;
    const row = aoa[r];
    if (!row || c >= row.length) continue;
    const addr = encodeCell({ r, c });
    const label = String(row[c] ?? '').trim() || 'Abrir WhatsApp';
    ws[addr] = {
      t: 's',
      v: label,
      l: { Target: safeUrl, Tooltip: 'Abrir WhatsApp' },
    };
    applyExcelHyperlinkCellStyle(ws, addr);
  }
}

/** Sí hay cola pendiente → ☐; no hay cola → ☑ (editable con validación en Excel). */
export function excelWhatsAppPendingCheckboxDisplay(hasPending) {
  return hasPending ? '\u2610' : '\u2611';
}
