import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  FAILED_REGISTRATION_RECOVERY_KEY,
  buildFailedRegistrationRecoveryRecord,
  buildFailedRegistrationRecoverySummary,
  listFailedRegistrationRecoveries,
  persistFailedRegistrationRecovery,
  removeFailedRegistrationRecovery,
  failedRegistrationRecoveryToLogRow,
} from '../failedRegistrationRecovery.js';

describe('failedRegistrationRecovery', () => {
  beforeEach(() => {
    const mockStorage = {
      store: {},
      getItem(k) {
        return this.store[k] ?? null;
      },
      setItem(k, v) {
        this.store[k] = String(v);
      },
      removeItem(k) {
        delete this.store[k];
      },
    };
    vi.stubGlobal('localStorage', mockStorage);
    if (typeof window !== 'undefined') window.localStorage = mockStorage;
    localStorage.removeItem(FAILED_REGISTRATION_RECOVERY_KEY);
  });

  it('persists and lists by owner user', () => {
    persistFailedRegistrationRecovery({
      ownerUserId: 'u1',
      ownerUsername: 'Aldo',
      eventId: 'ev1',
      eventName: 'Bautizos Julio',
      loc: 'Sur',
      entryPayload: { name: 'Juan Pérez', paid: 500, phone: '5512345678' },
      errorCode: 'permission-denied',
      errorMessage: 'Missing permission',
    });
    const mine = listFailedRegistrationRecoveries({ viewerUserId: 'u1' });
    expect(mine).toHaveLength(1);
    expect(mine[0].summaryName).toBe('Juan Pérez');
    expect(listFailedRegistrationRecoveries({ viewerUserId: 'u2' })).toHaveLength(0);
  });

  it('updates duplicate fingerprint instead of stacking', () => {
    persistFailedRegistrationRecovery({
      ownerUserId: 'u1',
      eventId: 'ev1',
      loc: 'Sur',
      entryPayload: { name: 'Ana', paid: 100 },
      errorMessage: 'first',
    });
    persistFailedRegistrationRecovery({
      ownerUserId: 'u1',
      eventId: 'ev1',
      loc: 'Sur',
      entryPayload: { name: 'Ana', paid: 200 },
      errorMessage: 'second',
    });
    const items = listFailedRegistrationRecoveries({ viewerUserId: 'u1' });
    expect(items).toHaveLength(1);
    expect(items[0].entryPayload.paid).toBe(200);
    expect(items[0].errorMessage).toBe('second');
  });

  it('builds human summary and log row', () => {
    const rec = buildFailedRegistrationRecoveryRecord({
      ownerUserId: 'u1',
      ownerUsername: 'Aldo',
      eventId: 'ev1',
      eventName: 'Bautizos',
      eventType: 'Bautizos',
      loc: 'Sur',
      entryPayload: { name: 'Carlos', paid: 500, bautizosCompanions: [{ name: 'Tío' }] },
      errorMessage: 'permission-denied',
    });
    const summary = buildFailedRegistrationRecoverySummary(rec);
    expect(summary).toContain('Carlos');
    expect(summary).toContain('Sede: Sur');
    const row = failedRegistrationRecoveryToLogRow(rec);
    expect(row.isError).toBe(true);
    expect(row.details).toContain('Carlos');
  });

  it('removes by id', () => {
    const rec = persistFailedRegistrationRecovery({
      ownerUserId: 'u1',
      entryPayload: { name: 'X' },
      eventId: 'e',
      loc: 'Norte',
    });
    removeFailedRegistrationRecovery(rec.id);
    expect(listFailedRegistrationRecoveries({ viewerUserId: 'u1' })).toHaveLength(0);
  });
});
