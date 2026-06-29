/**
 * Estilos fijos para hojas de roster en exportación Excel.
 */

import {
  applyStandardDataTableStyles,
  applyWorksheetColumnWidths,
} from './excelWorkbookStyle.js';

export { applyWorksheetColumnWidths };

/**
 * Aplica estilos fijos de colores a una hoja de roster.
 * @param {object} XLSX
 * @param {object} ws
 * @param {{ estatusCol?: number, waPendingCol?: number, estadoFinancieroCol?: number, aoa?: unknown[][] }} config
 */
export function applyRosterSheetStyles(XLSX, ws, { estatusCol = 0, waPendingCol = -1, estadoFinancieroCol = -1, aoa = null } = {}) {
  if (!ws || !ws['!ref'] || !aoa?.length) return;
  applyStandardDataTableStyles(XLSX, ws, aoa, {
    headerRow: 0,
    estatusCol,
    waPendingCol,
    estadoFinancieroCol,
  });
}

function padBrowserLocal2(n) {
  return String(n).padStart(2, '0');
}

/** Partes de fecha/hora en zona local del navegador (mismo reloj que `new Date()` en el cliente). */
export function getBrowserLocalDateParts(date = new Date()) {
  const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    hour: d.getHours(),
    minute: d.getMinutes(),
    second: d.getSeconds(),
  };
}

/** `DD-MM-YYYY` para nombres de archivo (hora local del navegador). */
export function formatBrowserLocalDateForFilename(date = new Date()) {
  const { year, month, day } = getBrowserLocalDateParts(date);
  return `${padBrowserLocal2(day)}-${padBrowserLocal2(month)}-${year}`;
}

/** `HH-MM-SS` en 24 h para nombres de archivo (hora local del navegador). */
export function formatBrowserLocalTimeForFilename(date = new Date()) {
  const { hour, minute, second } = getBrowserLocalDateParts(date);
  return `${padBrowserLocal2(hour)}-${padBrowserLocal2(minute)}-${padBrowserLocal2(second)}`;
}

/** Etiqueta legible `DD/MM/YYYY HH:MM:SS` (24 h, hora local del navegador). */
export function formatBrowserLocalDateTimeLabel(date = new Date()) {
  const { year, month, day, hour, minute, second } = getBrowserLocalDateParts(date);
  return `${padBrowserLocal2(day)}/${padBrowserLocal2(month)}/${year} ${padBrowserLocal2(hour)}:${padBrowserLocal2(minute)}:${padBrowserLocal2(second)}`;
}

/**
 * Nombre de archivo: fecha, hora y sedes si el alcance es parcial.
 */
export function buildExcelExportFilename(eventName, exportLocsOrdered, { allEventLocCount = 0, exportScope = null } = {}) {
  const safeEvent = String(eventName || 'evento')
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 48);
  const now = new Date();
  const fecha = formatBrowserLocalDateForFilename(now);
  const hora = formatBrowserLocalTimeForFilename(now);

  const locs = (exportLocsOrdered || []).map((l) => String(l).trim()).filter(Boolean);
  const scopedCount = exportScope?.locations?.length ?? 0;
  const isPartialSedes =
    scopedCount > 0 && (allEventLocCount <= 0 || scopedCount < allEventLocCount);

  let sedesSuffix = '';
  if (isPartialSedes && locs.length > 0) {
    const slug = locs
      .map((l) => l.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, '_'))
      .join('_')
      .slice(0, 72);
    sedesSuffix = `_Sedes_${slug}`;
  }

  return `Registros_${safeEvent}_${fecha}_${hora}${sedesSuffix}.xlsx`;
}

export function downloadExcelBytes(bytes, filename) {
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
