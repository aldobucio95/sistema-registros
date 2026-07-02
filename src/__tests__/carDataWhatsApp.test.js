import { describe, expect, it } from 'vitest';
import {
  applyCarDataWaSnooze,
  CAR_DATA_WA_SNOOZE_MS,
  countUnsentWhatsAppNotificationsForQueue,
  dedupeUnsentCarDataNotifications,
  filterWhatsAppFinanceNotificationsForQueue,
  isCarDataNotificationSnoozed,
  participantMatchesCarDataCompleteFilter,
  participantMatchesCarDataFilter,
  participantMatchesCarDataPendingFilter,
  personInventoryNeedsCarDataAttention,
  personSubjectToCarDataProvision,
  titularCarDataVisibleInWhatsAppQueue,
} from '../carDataWhatsApp.js';
import { buildCarDataWaSubjectContext } from '../bautizosCarMeta.js';
import { buildCarDataRequestWhatsAppMessage, buildMergedFinanceWhatsAppMessage } from '../whatsappFinanceMessages.js';

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

describe('car data WA snooze', () => {
  const now = 1_700_000_000_000;
  const event = { eventType: 'Bautizos', transportPlanning: {} };

  it('pospone datos_carro 24 h sin marcar sent', () => {
    const n = { id: 'c1', kind: 'datos_carro', sent: false, createdAt: 1 };
    const snoozed = applyCarDataWaSnooze(n, now);
    expect(snoozed.sent).toBe(false);
    expect(snoozed.carDataWaSnoozedUntil).toBe(now + CAR_DATA_WA_SNOOZE_MS);
    expect(isCarDataNotificationSnoozed(snoozed, now)).toBe(true);
    expect(isCarDataNotificationSnoozed(snoozed, now + CAR_DATA_WA_SNOOZE_MS)).toBe(false);
  });

  it('excluye datos_carro pospuesto de la cola y del conteo', () => {
    const person = {
      id: 'p1',
      name: 'Ana',
      llegaEnCarro: true,
      carrosLlegada: 1,
      whatsAppFinanceNotifications: [
        {
          id: 'c1',
          kind: 'datos_carro',
          sent: false,
          createdAt: 1,
          carDataWaSnoozedUntil: now + CAR_DATA_WA_SNOOZE_MS,
        },
      ],
    };
    const out = filterWhatsAppFinanceNotificationsForQueue(
      person,
      person.whatsAppFinanceNotifications,
      event,
      [person],
      now
    );
    expect(out).toHaveLength(0);
    expect(countUnsentWhatsAppNotificationsForQueue(person, event, [person], now)).toBe(0);
    expect(titularCarDataVisibleInWhatsAppQueue(person, event, [person], now)).toBe(false);
  });

  it('vuelve a mostrar en cola tras expirar el pospuesto', () => {
    const person = {
      id: 'p1',
      name: 'Ana',
      llegaEnCarro: true,
      carrosLlegada: 1,
      whatsAppFinanceNotifications: [
        {
          id: 'c1',
          kind: 'datos_carro',
          sent: false,
          createdAt: 1,
          carDataWaSnoozedUntil: now - 1,
        },
      ],
    };
    expect(titularCarDataVisibleInWhatsAppQueue(person, event, [person], now)).toBe(true);
    expect(countUnsentWhatsAppNotificationsForQueue(person, event, [person], now)).toBe(1);
  });
});

describe('buildCarDataWaSubjectContext', () => {
  it('nombra al acompañante cuando solo él va en carro', () => {
    const host = {
      name: 'María',
      llegaEnCarro: false,
      wantsBautizosTransport: 'Si',
    };
    const companions = [{ name: 'Pedro López', relationship: 'Hermano', llegaEnCarro: true }];
    const ctx = buildCarDataWaSubjectContext(host, companions);
    expect(ctx.companionOnly).toBe(true);
    expect(ctx.requestIntro).toContain('Pedro López');
    expect(ctx.requestIntro).toContain('acompañante');
  });
});

describe('buildCarDataRequestWhatsAppMessage', () => {
  it('incluye titular y acompañantes en Bautizos', () => {
    const text = buildCarDataRequestWhatsAppMessage({
      person: {
        name: 'María',
        vnpPersonId: 'VNPM-1',
        bautizosCompanions: [{ name: 'Pedro', relationship: 'Hermano', llegaEnCarro: true }],
        llegaEnCarro: false,
        wantsBautizosTransport: 'Si',
      },
      loc: 'Norte',
      eventSnapshot: { name: 'Bautizos 2026', eventType: 'Bautizos' },
    });
    expect(text).toContain('Titular');
    expect(text).toContain('María');
    expect(text).toContain('Pedro');
    expect(text).toContain('Pedro');
    expect(text).toMatch(/acompañante/i);
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

describe('bautized companion car data ownership', () => {
  const event = { eventType: 'Bautizos', transportPlanning: { carMetaBySource: {} } };

  it('titular no queda pendiente si solo el acompañante bautizado va en carro', () => {
    const host = {
      id: 'host-1',
      name: 'María',
      phone: '5511111111',
      llegaEnCarro: false,
      wantsBautizosTransport: 'Si',
      carrosLlegada: 1,
      bautizosCompanions: [
        {
          id: 'c1',
          name: 'Pedro',
          willBeBaptized: 'Si',
          llegaEnCarro: true,
          wantsBautizosTransport: 'No',
        },
      ],
    };
    const derived = {
      id: 'split-1',
      name: 'Pedro',
      phone: '5522222222',
      bautizosSplitPartyHostParticipantId: 'host-1',
      llegaEnCarro: true,
      carrosLlegada: 1,
      wantsBautizosTransport: 'No',
    };
    const roster = [host, derived];
    expect(personInventoryNeedsCarDataAttention(host, event, roster)).toBe(false);
    expect(personInventoryNeedsCarDataAttention(derived, event, roster)).toBe(true);
    expect(titularCarDataVisibleInWhatsAppQueue(derived, event, roster)).toBe(true);
    expect(countUnsentWhatsAppNotificationsForQueue(host, event, roster)).toBe(0);
    expect(countUnsentWhatsAppNotificationsForQueue(derived, event, roster)).toBe(1);
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

describe('car data nested filters', () => {
  const event = { eventType: 'Bautizos', transportPlanning: { carMetaBySource: {} } };

  it('transporte del evento no aplica a pendiente ni a completo', () => {
    const person = {
      id: 'bus-1',
      name: 'Ana',
      llegaEnCarro: false,
      wantsBautizosTransport: 'Si',
      carrosLlegada: 1,
    };
    const roster = [person];
    expect(personSubjectToCarDataProvision(person, event, roster)).toBe(false);
    expect(participantMatchesCarDataPendingFilter(person, event, roster)).toBe(false);
    expect(participantMatchesCarDataCompleteFilter(person, event, roster)).toBe(false);
    expect(participantMatchesCarDataFilter(person, 'pending', event, roster)).toBe(false);
    expect(participantMatchesCarDataFilter(person, 'complete', event, roster)).toBe(false);
  });

  it('llega en carro pendiente entra solo en filtro pending', () => {
    const person = {
      id: 'car-1',
      name: 'Luis',
      llegaEnCarro: true,
      wantsBautizosTransport: 'No',
      carrosLlegada: 1,
    };
    const roster = [person];
    expect(personSubjectToCarDataProvision(person, event, roster)).toBe(true);
    expect(participantMatchesCarDataPendingFilter(person, event, roster)).toBe(true);
    expect(participantMatchesCarDataCompleteFilter(person, event, roster)).toBe(false);
    expect(participantMatchesCarDataFilter(person, 'pending', event, roster)).toBe(true);
    expect(participantMatchesCarDataFilter(person, 'complete', event, roster)).toBe(false);
  });

  it('llega en carro con metadatos completos entra solo en filtro complete', () => {
    const person = {
      id: 'car-2',
      name: 'Rosa',
      llegaEnCarro: true,
      wantsBautizosTransport: 'No',
      carrosLlegada: 1,
    };
    const eventComplete = {
      eventType: 'Bautizos',
      transportPlanning: {
        carMetaBySource: {
          'p:car-2|c1': {
            brand: 'Toyota',
            model: 'Corolla',
            color: 'Blanco',
            plates: 'ABC123',
            driverSourceKey: 'p:car-2',
            passengerSourceKeys: [],
          },
        },
      },
    };
    const roster = [person];
    expect(participantMatchesCarDataPendingFilter(person, eventComplete, roster)).toBe(false);
    expect(participantMatchesCarDataCompleteFilter(person, eventComplete, roster)).toBe(true);
    expect(participantMatchesCarDataFilter(person, 'complete', eventComplete, roster)).toBe(true);
    expect(participantMatchesCarDataFilter(person, 'pending', eventComplete, roster)).toBe(false);
  });
});
