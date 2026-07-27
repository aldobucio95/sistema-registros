import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../globalSystemAlertsBridge.js', () => ({
  emitGlobalSystemAlert: vi.fn(),
}));

vi.mock('../publicRegistrationLinkFetch.js', () => ({
  fetchPublicRegistrationLinkSnapshot: vi.fn(),
}));

vi.mock('../publicRegistrationAuth.js', () => ({
  ensurePublicSubmitAuth: vi.fn(async () => undefined),
}));

vi.mock('../publicLinkDocHelpers.js', () => ({
  buildOptionalVisibilityFromPublicLinkDoc: vi.fn(() => ({})),
}));

vi.mock('../publicRegistrationLogic.js', () => ({
  submitPublicRegistration: vi.fn(),
  fetchParticipantsForEvent: vi.fn(async () => []),
  canonicalizeVnpPersonId: (v) => String(v || '').trim().toUpperCase(),
}));

vi.mock('../publicAnonymousAuthLifecycle.js', () => ({
  registerPublicRegistrationSuccess: vi.fn(),
}));

import { emitGlobalSystemAlert } from '../globalSystemAlertsBridge.js';
import { fetchPublicRegistrationLinkSnapshot } from '../publicRegistrationLinkFetch.js';
import { submitPublicRegistration } from '../publicRegistrationLogic.js';
import {
  enqueuePublicRegistrationOffline,
  isRetriablePublicRegistrationBusinessRejection,
  peekPublicOfflineQueueCount,
  processPublicRegistrationOfflineQueue,
} from '../publicRegistrationOfflineQueue.js';

const STORAGE_KEY = 'vnpm_pub_offline_queue_v1';

function memoryLocalStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => {
      store.set(String(k), String(v));
    },
    removeItem: (k) => {
      store.delete(k);
    },
    clear: () => store.clear(),
  };
}

describe('isRetriablePublicRegistrationBusinessRejection', () => {
  it('detecta sede con inscripciones cerradas (mensaje canónico)', () => {
    const err = [
      'Motivo: la organización cerró las inscripciones para la sede que elegiste.',
      '• Sede: Norte',
    ].join('\n');
    expect(isRetriablePublicRegistrationBusinessRejection(err)).toBe(true);
  });

  it('no reintenta duplicados ni validación de datos', () => {
    expect(
      isRetriablePublicRegistrationBusinessRejection(
        'Motivo: ya hay un inscrito con este teléfono en el evento.'
      )
    ).toBe(false);
    expect(
      isRetriablePublicRegistrationBusinessRejection(
        'Motivo: la validación del servidor encontró problemas con los datos enviados.'
      )
    ).toBe(false);
  });
});

describe('processPublicRegistrationOfflineQueue — rechazo temporal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.localStorage = memoryLocalStorage();
    Object.defineProperty(globalThis.navigator, 'onLine', {
      configurable: true,
      get: () => true,
    });
  });

  it('conserva el pendiente si la sede está cerrada (no borra la cola)', async () => {
    enqueuePublicRegistrationOffline({
      linkKey: 'link-1',
      eventId: 'ev-1',
      loc: 'Norte',
      form: { name: 'Ana Lopez Perez', phone: '5512345678', vnpPersonId: 'VNPM-TEST001' },
    });
    expect(peekPublicOfflineQueueCount()).toBe(1);

    fetchPublicRegistrationLinkSnapshot.mockResolvedValue({
      exists: () => true,
      data: () => ({
        eventSnapshot: { id: 'ev-1', name: 'Bautizos', eventType: 'Bautizos', locations: ['Norte'] },
        globalSnapshot: {},
      }),
    });
    submitPublicRegistration.mockResolvedValue({
      ok: false,
      error: [
        'Motivo: la organización cerró las inscripciones para la sede que elegiste.',
        '• Sede: Norte',
        '',
        'Intenta otra sede si el evento la tiene habilitada, o contacta directamente a la organización.',
      ].join('\n'),
    });

    const result = await processPublicRegistrationOfflineQueue({});
    expect(result.businessRejected).toBe(1);
    expect(result.failedRetriable).toBe(1);
    expect(result.dropped).toBe(0);
    expect(result.processed).toBe(0);
    expect(peekPublicOfflineQueueCount()).toBe(1);

    const bag = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(bag.items).toHaveLength(1);
    expect(bag.items[0].attempts).toBe(1);
    expect(emitGlobalSystemAlert).toHaveBeenCalled();
  });

  it('descarta rechazo definitivo (duplicado) y vacía ese ítem', async () => {
    enqueuePublicRegistrationOffline({
      linkKey: 'link-1',
      eventId: 'ev-1',
      loc: 'Norte',
      form: { name: 'Ana Lopez Perez', phone: '5512345678', vnpPersonId: 'VNPM-TEST002' },
    });

    fetchPublicRegistrationLinkSnapshot.mockResolvedValue({
      exists: () => true,
      data: () => ({
        eventSnapshot: { id: 'ev-1', name: 'Bautizos', eventType: 'Bautizos', locations: ['Norte'] },
        globalSnapshot: {},
      }),
    });
    submitPublicRegistration.mockResolvedValue({
      ok: false,
      error: 'Motivo: ya hay un inscrito con este teléfono en el evento.',
    });

    const result = await processPublicRegistrationOfflineQueue({});
    expect(result.businessRejected).toBe(1);
    expect(result.failedRetriable).toBe(0);
    expect(peekPublicOfflineQueueCount()).toBe(0);
  });

  it('tras éxito parcial persiste solo los pendientes restantes', async () => {
    enqueuePublicRegistrationOffline({
      linkKey: 'link-1',
      eventId: 'ev-1',
      loc: 'Norte',
      form: { name: 'Ana Lopez Perez', phone: '5511111111', vnpPersonId: 'VNPM-OK1' },
    });
    enqueuePublicRegistrationOffline({
      linkKey: 'link-1',
      eventId: 'ev-1',
      loc: 'Norte',
      form: { name: 'Luis Gomez Ruiz', phone: '5522222222', vnpPersonId: 'VNPM-OK2' },
    });
    expect(peekPublicOfflineQueueCount()).toBe(2);

    fetchPublicRegistrationLinkSnapshot.mockResolvedValue({
      exists: () => true,
      data: () => ({
        eventSnapshot: { id: 'ev-1', name: 'Bautizos', eventType: 'Bautizos', locations: ['Norte'] },
        globalSnapshot: {},
      }),
    });
    submitPublicRegistration
      .mockResolvedValueOnce({ ok: true, participantId: 'id_VNPM-OK1' })
      .mockResolvedValueOnce({
        ok: false,
        error: 'Motivo: la organización cerró las inscripciones para la sede que elegiste.',
      });

    const result = await processPublicRegistrationOfflineQueue({});
    expect(result.processed).toBe(1);
    expect(result.businessRejected).toBe(1);
    expect(peekPublicOfflineQueueCount()).toBe(1);
    const bag = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(bag.items[0].form.vnpPersonId).toBe('VNPM-OK2');
  });
});
