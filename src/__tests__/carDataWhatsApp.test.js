import { describe, expect, it } from 'vitest';
import {
  countUnsentWhatsAppNotificationsForQueue,
  filterWhatsAppFinanceNotificationsForQueue,
} from '../carDataWhatsApp.js';

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
