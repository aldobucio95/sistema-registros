import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchParticipantsForEvent = vi.hoisted(() => vi.fn());
const submitPublicRegistration = vi.hoisted(() => vi.fn());

vi.mock('../globalSystemAlertsBridge.js', () => ({
  emitGlobalSystemAlert: () => {},
}));

vi.mock('../publicRegistrationLinkFetch.js', () => ({
  fetchPublicRegistrationLinkSnapshot: async () => ({
    exists: () => true,
    data: () => ({
      eventSnapshot: { id: 'ev-1', eventType: 'General' },
      globalSnapshot: {},
    }),
  }),
}));

vi.mock('../publicRegistrationAuth.js', () => ({
  ensurePublicSubmitAuth: async () => {},
}));

vi.mock('../publicLinkDocHelpers.js', () => ({
  buildOptionalVisibilityFromPublicLinkDoc: () => ({}),
}));

vi.mock('../publicAnonymousAuthLifecycle.js', () => ({
  registerPublicRegistrationSuccess: () => {},
}));

vi.mock('../publicRegistrationLogic.js', () => ({
  fetchParticipantsForEvent,
  submitPublicRegistration,
  canonicalizeVnpPersonId: (raw) => String(raw || '').trim(),
}));

import {
  enqueuePublicRegistrationOffline,
  peekPublicOfflineQueueCount,
  processPublicRegistrationOfflineQueue,
} from '../publicRegistrationOfflineQueue.js';

function installMemoryLocalStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(key, String(value));
    },
    removeItem: (key) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  };
}

const ana = {
  linkKey: 'link-1',
  eventId: 'ev-1',
  loc: 'Norte',
  form: { name: 'Ana Lopez Perez', phone: '5511111111', vnpPersonId: 'VNPM-ANA' },
};

const luis = {
  linkKey: 'link-1',
  eventId: 'ev-1',
  loc: 'Norte',
  form: { name: 'Luis Gomez Ruiz', phone: '5522222222', vnpPersonId: 'VNPM-LUIS' },
};

describe('publicRegistrationOfflineQueue', () => {
  beforeEach(() => {
    installMemoryLocalStorage();
    fetchParticipantsForEvent.mockReset();
    submitPublicRegistration.mockReset();
    fetchParticipantsForEvent.mockResolvedValue([]);
    submitPublicRegistration.mockResolvedValue({ ok: true, participantId: 'p1' });
  });

  it('no borra un alta encolada mientras el flush del anterior sigue en curso', async () => {
    enqueuePublicRegistrationOffline(ana);
    submitPublicRegistration.mockImplementation(async ({ rawEntry }) => {
      if (String(rawEntry?.vnpPersonId) === 'VNPM-ANA') {
        enqueuePublicRegistrationOffline(luis);
      }
      return { ok: true, participantId: String(rawEntry?.vnpPersonId) };
    });

    const first = await processPublicRegistrationOfflineQueue({});
    expect(first.processed).toBe(1);
    expect(peekPublicOfflineQueueCount()).toBe(1);
    expect(submitPublicRegistration).toHaveBeenCalledTimes(1);

    const second = await processPublicRegistrationOfflineQueue({});
    expect(second.processed).toBe(1);
    expect(peekPublicOfflineQueueCount()).toBe(0);
    expect(submitPublicRegistration).toHaveBeenCalledTimes(2);
    const sent = submitPublicRegistration.mock.calls.map((c) => c[0].rawEntry.vnpPersonId);
    expect(sent).toEqual(['VNPM-ANA', 'VNPM-LUIS']);
  });

  it('conserva el alta nueva si el envío en curso falla por red', async () => {
    enqueuePublicRegistrationOffline(ana);
    fetchParticipantsForEvent.mockImplementation(async () => {
      enqueuePublicRegistrationOffline(luis);
      const err = new Error('unavailable');
      err.code = 'unavailable';
      throw err;
    });

    const result = await processPublicRegistrationOfflineQueue({});
    expect(result.failedRetriable).toBe(1);
    expect(result.processed).toBe(0);
    expect(peekPublicOfflineQueueCount()).toBe(2);
  });

  it('no envía un formulario ya reemplazado en la cola', async () => {
    enqueuePublicRegistrationOffline(ana);
    let releaseFetch;
    const fetchGate = new Promise((resolve) => {
      releaseFetch = resolve;
    });
    fetchParticipantsForEvent.mockImplementation(() => fetchGate);

    const flushing = processPublicRegistrationOfflineQueue({});
    await vi.waitFor(() => {
      expect(fetchParticipantsForEvent).toHaveBeenCalledTimes(1);
    });
    enqueuePublicRegistrationOffline({
      ...ana,
      form: { ...ana.form, phone: '5599999999' },
    });
    releaseFetch([]);

    const first = await flushing;
    expect(first.processed).toBe(0);
    expect(submitPublicRegistration).not.toHaveBeenCalled();
    expect(peekPublicOfflineQueueCount()).toBe(1);

    fetchParticipantsForEvent.mockResolvedValue([]);
    const second = await processPublicRegistrationOfflineQueue({});
    expect(second.processed).toBe(1);
    expect(submitPublicRegistration).toHaveBeenCalledTimes(1);
    expect(submitPublicRegistration.mock.calls[0][0].rawEntry.phone).toBe('5599999999');
    expect(peekPublicOfflineQueueCount()).toBe(0);
  });
});
