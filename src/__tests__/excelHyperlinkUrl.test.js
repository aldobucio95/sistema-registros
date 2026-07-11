import { describe, expect, it } from 'vitest';
import {
  EXCEL_HYPERLINK_MAX_URL_LENGTH,
  clampUrlForExcelHyperlink,
  isExcelSafeHyperlinkUrl,
} from '../excelHyperlinkUrl.js';
import { buildWhatsAppMeUrl } from '../whatsappUrl.js';

describe('excelHyperlinkUrl', () => {
  it('keeps short WhatsApp URLs unchanged', () => {
    const url = buildWhatsAppMeUrl('5215512345678', 'Hola');
    expect(clampUrlForExcelHyperlink(url)).toBe(url);
    expect(isExcelSafeHyperlinkUrl(url)).toBe(true);
  });

  it('truncates very long WhatsApp message URLs to Excel-safe length', () => {
    const longText = 'A'.repeat(8000);
    const url = buildWhatsAppMeUrl('5215512345678', longText);
    expect(url.length).toBeGreaterThan(EXCEL_HYPERLINK_MAX_URL_LENGTH);
    const safe = clampUrlForExcelHyperlink(url);
    expect(safe.length).toBeLessThanOrEqual(EXCEL_HYPERLINK_MAX_URL_LENGTH);
    expect(safe.startsWith('https://api.whatsapp.com/send?phone=5215512345678')).toBe(true);
    expect(isExcelSafeHyperlinkUrl(safe)).toBe(true);
  });

  it('preserves phone when truncating', () => {
    const url = buildWhatsAppMeUrl('5215599887766', 'x'.repeat(5000));
    const safe = clampUrlForExcelHyperlink(url);
    expect(safe).toContain('phone=5215599887766');
  });
});
