/**
 * Interpreta un monto de abono con reglas estrictas: sin texto sobrante, sin guiones,
 * un solo separador decimal (punto o coma), sin notación científica.
 *
 * @param {string|number|null|undefined} raw
 * @param {{ allowEmpty?: boolean }} [opts]
 * @returns {{ ok: true, value: number } | { ok: false, reason: string }}
 */
export function parseStrictNonNegativeMoneyInput(raw, opts = {}) {
  const { allowEmpty = false } = opts;

  if (raw === '' || raw == null) {
    if (allowEmpty) return { ok: true, value: 0 };
    return { ok: false, reason: 'Indica un monto (el campo está vacío).' };
  }

  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) {
      return { ok: false, reason: 'El monto no es un número válido (no finito).' };
    }
    if (raw < 0) {
      return { ok: false, reason: 'El monto no puede ser negativo.' };
    }
    return { ok: true, value: raw };
  }

  const trimmed = String(raw).trim();
  if (!trimmed) {
    if (allowEmpty) return { ok: true, value: 0 };
    return { ok: false, reason: 'Indica un monto (el campo está vacío).' };
  }

  if (/\s/.test(trimmed)) {
    return { ok: false, reason: 'No se permiten espacios dentro del monto.' };
  }

  let s = trimmed;
  if (s.startsWith('+')) {
    s = s.slice(1).trim();
    if (!s) {
      return { ok: false, reason: 'Tras el signo «+» debe ir el número completo.' };
    }
    if (/\s/.test(s)) {
      return { ok: false, reason: 'No se permiten espacios después del signo «+».' };
    }
  }

  const hasDot = s.includes('.');
  const hasComma = s.includes(',');
  if (hasDot && hasComma) {
    return {
      ok: false,
      reason: 'No mezcles punto y coma. Usa solo un separador decimal (por ejemplo 345.50 o 345,50).',
    };
  }

  const norm = hasComma ? s.replace(',', '.') : s;

  if (/[eE]/.test(norm)) {
    return {
      ok: false,
      reason: 'No se permiten notaciones científicas (por ejemplo 1e3). Escribe el número completo.',
    };
  }

  if (/-/.test(norm)) {
    return {
      ok: false,
      reason:
        'No uses guiones ni restas en el monto. Si escribiste algo como «0-345», solo se leería el «0»; indica un solo número (por ejemplo 345).',
    };
  }

  if (norm.startsWith('.')) {
    return { ok: false, reason: 'Escribe decimales con cero inicial: usa 0.50 en lugar de .50.' };
  }

  if (norm.endsWith('.') || norm.endsWith(',')) {
    return {
      ok: false,
      reason: 'No dejes el monto terminando en punto o coma sin decimales (por ejemplo 100.00).',
    };
  }

  const dotParts = norm.split('.');
  if (dotParts.length > 2) {
    return { ok: false, reason: 'Solo puede haber un separador decimal en el monto.' };
  }

  if (!/^\d+(\.\d+)?$/.test(norm)) {
    return {
      ok: false,
      reason:
        'El monto debe ser solo dígitos y, si aplica, un punto o una coma como decimal (ej. 500, 500.00 o 500,00). Quita letras u otros símbolos.',
    };
  }

  const n = Number(norm);
  if (!Number.isFinite(n)) {
    return { ok: false, reason: 'El monto no se puede interpretar como número válido.' };
  }
  if (n < 0) {
    return { ok: false, reason: 'El monto no puede ser negativo.' };
  }

  return { ok: true, value: n };
}
