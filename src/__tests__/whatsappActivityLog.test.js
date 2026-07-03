import { describe, expect, it, vi } from 'vitest';
import { buildWhatsAppSentLogDetails, logWhatsAppSentActivity } from '../whatsappActivityLog.js';

describe('buildWhatsAppSentLogDetails', () => {
  it('incluye destinatario, sede, teléfono, origen y mensaje completo', () => {
    const details = buildWhatsAppSentLogDetails({
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
});

describe('logWhatsAppSentActivity', () => {
  it('llama addLog con acción WhatsApp y entityId', () => {
    const addLog = vi.fn();
    logWhatsAppSentActivity(addLog, {
      recipientName: 'Pedro',
      recipientId: '99',
      loc: 'Norte',
      phone: '521',
      channel: 'Modal WhatsApp',
      message: 'Texto',
      currentEvent: { id: 'ev1', name: 'Bautizos' },
    });
    expect(addLog).toHaveBeenCalledTimes(1);
    expect(addLog.mock.calls[0][0]).toBe('WhatsApp');
    expect(addLog.mock.calls[0][1]).toContain('Texto');
    expect(addLog.mock.calls[0][3]).toEqual({ id: 'ev1', name: 'Bautizos' });
    expect(addLog.mock.calls[0][5]).toMatchObject({ entityType: 'participant', entityId: '99' });
  });
});
