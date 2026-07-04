import { describe, expect, it, vi } from 'vitest';
import {
  buildWhatsAppSentLogFullDetails,
  buildWhatsAppSentLogSummary,
  describeWhatsAppSentSnapshot,
  formatActivityLogDetailsForDisplay,
  logWhatsAppSentActivity,
  normalizeWhatsAppMessageBody,
} from '../whatsappActivityLog.js';

describe('buildWhatsAppSentLogSummary', () => {
  it('solo incluye destinatario y sede', () => {
    expect(
      buildWhatsAppSentLogSummary({
        recipientName: 'Ana López',
        loc: 'Sur',
      })
    ).toBe('Envió WhatsApp a Ana López (sede Sur).');
  });
});

describe('buildWhatsAppSentLogFullDetails', () => {
  it('incluye metadatos y mensaje completo con saltos de línea', () => {
    const details = buildWhatsAppSentLogFullDetails({
      recipientName: 'Ana López',
      recipientId: 'p1',
      loc: 'Sur',
      phone: '5215512345678',
      channel: 'Acción rápida',
      message: 'Hola\nSegunda línea',
    });
    expect(details).toContain('Envió WhatsApp a Ana López (sede Sur).');
    expect(details).toContain('Teléfono: 5215512345678');
    expect(details).toContain('Origen: Acción rápida');
    expect(details).toContain('--- Mensaje enviado ---');
    expect(details).toContain('Hola\nSegunda línea');
  });

  it('normaliza CRLF a LF', () => {
    const body = normalizeWhatsAppMessageBody('Línea 1\r\nLínea 2');
    expect(body).toBe('Línea 1\nLínea 2');
  });
});

describe('formatActivityLogDetailsForDisplay', () => {
  it('muestra resumen corto en vista comprimida', () => {
    const text = formatActivityLogDetailsForDisplay({
      action: 'WhatsApp',
      details: 'Envió WhatsApp a Pedro (sede Norte).',
    });
    expect(text).toBe('Envió WhatsApp a Pedro (sede Norte).');
  });

  it('recorta logs legacy con mensaje embebido', () => {
    const text = formatActivityLogDetailsForDisplay({
      action: 'WhatsApp',
      details: 'Envió WhatsApp a Pedro (sede Norte).\nTeléfono: 521\n\n--- Mensaje enviado ---\n\nHola',
    });
    expect(text).toBe('Envió WhatsApp a Pedro (sede Norte).');
  });
});

describe('describeWhatsAppSentSnapshot', () => {
  it('reconstruye mensaje completo desde snapshot', () => {
    const text = describeWhatsAppSentSnapshot({
      kind: 'whatsapp_enviado',
      recipientName: 'Pedro',
      loc: 'Coapa',
      phone: '521',
      channel: 'Acción rápida',
      message: 'Bloque A\nBloque B',
    });
    expect(text).toContain('Pedro');
    expect(text).toContain('Bloque A\nBloque B');
    expect(text).toContain('--- Mensaje enviado ---');
  });
});

describe('logWhatsAppSentActivity', () => {
  it('guarda resumen en details y mensaje completo en snapshot', () => {
    const addLog = vi.fn();
    const longBody = 'Línea\n'.repeat(400);
    logWhatsAppSentActivity(addLog, {
      recipientName: 'Pedro',
      recipientId: '99',
      loc: 'Norte',
      phone: '521',
      channel: 'Modal WhatsApp',
      message: longBody,
      currentEvent: { id: 'ev1', name: 'Bautizos' },
    });
    expect(addLog).toHaveBeenCalledTimes(1);
    expect(addLog.mock.calls[0][0]).toBe('WhatsApp');
    expect(addLog.mock.calls[0][1]).toBe('Envió WhatsApp a Pedro (sede Norte).');
    expect(addLog.mock.calls[0][1].length).toBeLessThan(100);
    expect(addLog.mock.calls[0][5].snapshot.fullDetailsText).toContain('Línea');
    expect(addLog.mock.calls[0][5].snapshot.message).toBe(longBody.trim());
    expect(addLog.mock.calls[0][5]).toMatchObject({
      entityType: 'participant',
      entityId: '99',
      hasSnapshot: true,
    });
    expect(addLog.mock.calls[0][5].preserveFullDetails).toBeUndefined();
  });
});
