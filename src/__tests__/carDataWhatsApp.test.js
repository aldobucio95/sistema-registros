import { describe, expect, it } from 'vitest';
import {
  countUnsentWhatsAppNotificationsForQueue,
  dedupeUnsentCarDataNotifications,
  filterWhatsAppFinanceNotificationsForQueue,
} from '../carDataWhatsApp.js';
import { buildMergedFinanceWhatsAppMessage } from '../whatsappFinanceMessages.js';

const getMarkKey = (n) => (n?.id ? String(n.id) : `legacy-${n.createdAt}-${n.kind}`);

describe('dedupeUnsentCarDataNotifications', () => {
  it('deja solo el aviso datos_carro más reciente sin enviar', () => {
    const list = [
      { id: 'a', kind: 'datos_carro', sent: false, createdAt: 100 },
      { id: 'b', kind: 'datos_carro', sent: false, createdAt: 200 },
      { id: 'c', kind: 'abono', sent: false, createdAt: 50, amount: 10 },
    ];
    const out = dedupeUnsentCarDataNotifications(list);
    expect(out.filter((n) => n.kind === 'datos_carro')).toHaveLength(1);
    expect(out.find((n) => n.kind === 'datos_carro')?.id).toBe('b');
    expect(out.filter((n) => n.kind === 'abono')).toHaveLength(1);
  });
});

describe('buildMergedFinanceWhatsAppMessage datos_carro', () => {
  it('fusiona varios datos_carro en un solo bloque', () => {
    const person = { name: 'Mayra', vnpPersonId: 'VNPM-1' };
    const unsent = [
      { id: '1', kind: 'datos_carro', sent: false, createdAt: 100 },
      { id: '2', kind: 'datos_carro', sent: false, createdAt: 200 },
    ];
    const { text, mergeMarkKeys } = buildMergedFinanceWhatsAppMessage(
      person,
      'Norte',
      unsent,
      { name: 'Bautizos', eventType: 'Bautizos' },
      getMarkKey
    );
    expect((text.match(/¡Hola!/g) || []).length).toBe(1);
    expect(mergeMarkKeys).toContain('2');
  });
});

describe('filterWhatsAppFinanceNotificationsForQueue', () => {
  const event = { eventType: 'Bautizos', transportPlanning: {} };

  it('mantiene avisos que no son datos de carro', () => {
    const person = { id: 'p1', whatsAppFinanceNotifications: [{ kind: 'abono', sent: false, amount: 100 }] };
    const out = filterWhatsAppFinanceNotificationsForQueue(person, person.whatsAppFinanceNotifications, event, []);
    expect(out).toHaveLength(1);
  });

  it('excluye datos_carro si el titular va en transporte del evento', () => {
    const person = {
      id: 'p1',
      llegaEnCarro: false,
      wantsBautizosTransport: 'Si',
      transportType: 'Carro',
      carrosLlegada: 1,
      whatsAppFinanceNotifications: [{ kind: 'datos_carro', sent: false, createdAt: 1 }],
    };
    const out = filterWhatsAppFinanceNotificationsForQueue(person, person.whatsAppFinanceNotifications, event, []);
    expect(out).toHaveLength(0);
    expect(countUnsentWhatsAppNotificationsForQueue(person, event, [])).toBe(0);
  });
});
