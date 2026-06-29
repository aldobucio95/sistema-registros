/** Estilos estáticos puntuales en exportación Excel (el resto va por formato condicional). */

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

/** Sí hay cola pendiente → ☐; no hay cola → ☑ (editable con validación en Excel). */
export function excelWhatsAppPendingCheckboxDisplay(hasPending) {
  return hasPending ? '\u2610' : '\u2611';
}
