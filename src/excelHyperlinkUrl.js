import { buildWhatsAppMeUrl } from './whatsappUrl.js';

/** Límite práctico de Excel para hipervínculos externos (documentación MS ~2079). */
export const EXCEL_HYPERLINK_MAX_URL_LENGTH = 2048;

function isWhatsAppSendUrl(url) {
  return (
    String(url || '').startsWith('https://api.whatsapp.com/send') ||
    String(url || '').startsWith('http://api.whatsapp.com/send')
  );
}

function isWaMeUrl(url) {
  const raw = String(url || '');
  return raw.startsWith('https://wa.me/') || raw.startsWith('http://wa.me/');
}

function clampWhatsAppSendUrl(raw, maxLen) {
  try {
    const u = new URL(raw);
    const phone = u.searchParams.get('phone') || '';
    const text = u.searchParams.get('text') || '';
    if (!text) return buildWhatsAppMeUrl(phone, '').slice(0, maxLen);
    let lo = 0;
    let hi = text.length;
    let best = buildWhatsAppMeUrl(phone, '');
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const candidate = buildWhatsAppMeUrl(phone, text.slice(0, mid));
      if (candidate.length <= maxLen) {
        best = candidate;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return best;
  } catch {
    return String(raw).slice(0, maxLen);
  }
}

function clampWaMeUrl(raw, maxLen) {
  try {
    const u = new URL(raw);
    const phone = String(u.pathname || '').replace(/^\//, '').trim();
    const text = u.searchParams.get('text') || '';
    if (!text) return raw.slice(0, maxLen);
    let lo = 0;
    let hi = text.length;
    let best = phone ? `https://wa.me/${phone}` : 'https://wa.me/';
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const candidate =
        mid > 0
          ? `https://wa.me/${phone}?text=${encodeURIComponent(text.slice(0, mid))}`
          : `https://wa.me/${phone}`;
      if (candidate.length <= maxLen) {
        best = candidate;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return best;
  } catch {
    return String(raw).slice(0, maxLen);
  }
}

/**
 * Acorta URLs de WhatsApp para que Excel no marque el hipervínculo como corrupto.
 * Conserva el teléfono y recorta solo el texto del mensaje si hace falta.
 */
export function clampUrlForExcelHyperlink(url, maxLen = EXCEL_HYPERLINK_MAX_URL_LENGTH) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (raw.length <= maxLen) return raw;
  if (isWhatsAppSendUrl(raw)) return clampWhatsAppSendUrl(raw, maxLen);
  if (isWaMeUrl(raw)) return clampWaMeUrl(raw, maxLen);
  return raw.slice(0, maxLen);
}

export function isExcelSafeHyperlinkUrl(url, maxLen = EXCEL_HYPERLINK_MAX_URL_LENGTH) {
  const safe = clampUrlForExcelHyperlink(url, maxLen);
  if (!safe) return false;
  if (safe.length > maxLen) return false;
  if (!/^https?:\/\//i.test(safe)) return false;
  return true;
}
