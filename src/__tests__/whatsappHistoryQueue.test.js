import { describe, expect, it } from 'vitest';
import { buildBautizosManualCarGroupSummaryLines } from '../whatsappBautizosStatusBlocks.js';
import {
  countReactivatedUnsentNotifications,
  reactivateQueueFromHistoryToken,
  removeWhatsAppHistoryEntry,
} from '../whatsappHistoryQueue.js';

describe('buildBautizosManualCarGroupSummaryLines', () => {
  it('lista integrantes y conductor del grupo manual', () => {
    const roster = [
      {
        id: 'host-a',
        name: 'Ana López',
        eventType: 'Bautizos',
        llegaEnCarro: true,
        carrosLlegada: 1,
      },
      {
        id: 'host-b',
        name: 'Luis Pérez',
        eventType: 'Bautizos',
        llegaEnCarro: true,
        carrosLlegada: 1,
      },
    ];
    const event = {
      eventType: 'Bautizos',
      transportPlanning: {
        carGroups: [
          {
            id: 'cg-1',
            kind: 'manual',
            memberKeys: ['p:host-a', 'p:host-b'],
            titularSourceKey: 'p:host-a',
            cars: 1,
          },
        ],
        carMetaBySource: {
          'p:host-a|c1': {
            brand: 'Toyota',
            model: 'Corolla',
            color: 'Blanco',
            plates: 'ABC123',
            driverSourceKey: 'p:host-a',
            passengerSourceKeys: ['p:host-b'],
            ownerSourceKey: 'p:host-a',
          },
        },
      },
    };
    const lines = buildBautizosManualCarGroupSummaryLines(roster[1], event, roster);
    const text = lines.join('\n');
    expect(text).toMatch(/Grupo manual de transporte/i);
    expect(text).toContain('Ana López');
    expect(text).toContain('Luis Pérez');
    expect(text).toMatch(/conductor Ana López/i);
    expect(text).toMatch(/pasajeros: Luis Pérez/i);
  });
});

describe('whatsappHistoryQueue', () => {
  it('reactiva avisos marcados como enviados al borrar historial merge', () => {
    const notifications = [
      { id: 'wa-1', kind: 'registro', sent: true, sentAt: 1000, amount: 0, pendingAmount: 500 },
      { id: 'wa-2', kind: 'abono', sent: true, sentAt: 1000, amount: 100, pendingAmount: 400 },
    ];
    const token = {
      kind: 'finance_queue_merge',
      items: [
        { id: 'wa-1', kind: 'registro' },
        { id: 'wa-2', kind: 'abono' },
      ],
    };
    const next = reactivateQueueFromHistoryToken(notifications, token);
    expect(next.filter((n) => !n.sent)).toHaveLength(2);
    expect(countReactivatedUnsentNotifications(notifications, token)).toBe(2);
  });

  it('elimina entrada del historial por id', () => {
    const hist = [
      { id: 'h1', kind: 'finance_custom', createdAt: 1 },
      { id: 'h2', kind: 'finance_queue_merge', createdAt: 2 },
    ];
    expect(removeWhatsAppHistoryEntry(hist, 'h1')).toHaveLength(1);
    expect(removeWhatsAppHistoryEntry(hist, 'h2')[0].id).toBe('h1');
  });
});
