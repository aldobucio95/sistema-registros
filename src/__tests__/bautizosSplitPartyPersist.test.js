import { describe, expect, it, vi } from 'vitest';
import {
  commitBautizosSplitPartyParticipantDocs,
  validateBautizosSplitPartyWrites,
} from '../bautizosSplitPartyPersist.js';

describe('validateBautizosSplitPartyWrites', () => {
  it('rejects fewer than two writes', () => {
    expect(validateBautizosSplitPartyWrites([])).toMatch(/al menos titular/);
    expect(
      validateBautizosSplitPartyWrites([{ docId: 'h1', data: { name: 'A' } }])
    ).toMatch(/al menos titular/);
  });

  it('rejects missing host or duplicate doc ids', () => {
    expect(
      validateBautizosSplitPartyWrites([
        { docId: 'a', data: { bautizosSplitPartyHostParticipantId: 'x' } },
        { docId: 'b', data: { bautizosSplitPartyHostParticipantId: 'x' } },
      ])
    ).toMatch(/exactamente un titular/);
    expect(
      validateBautizosSplitPartyWrites([
        { docId: 'same', data: { name: 'Host' } },
        { docId: 'same', data: { bautizosSplitPartyHostParticipantId: 'same' } },
      ])
    ).toMatch(/mismo id/);
  });

  it('accepts host + satellite payloads', () => {
    expect(
      validateBautizosSplitPartyWrites([
        { docId: 'host', data: { name: 'Titular' } },
        {
          docId: 'sat',
          data: { name: 'Bautizado', bautizosSplitPartyHostParticipantId: 'host' },
        },
      ])
    ).toBeNull();
  });
});

describe('commitBautizosSplitPartyParticipantDocs', () => {
  it('commits all participant docs in one batch (no partial set)', async () => {
    const sets = [];
    const commit = vi.fn(async () => {});
    const batch = {
      set: (ref, data) => {
        sets.push({ ref, data });
      },
      commit,
    };
    const writeBatch = vi.fn(() => batch);
    const getDocRef = vi.fn((col, id) => ({ col, id }));
    const sanitize = vi.fn((payload) => ({ ...payload, sanitized: true }));

    const result = await commitBautizosSplitPartyParticipantDocs({
      writes: [
        { docId: 'host', data: { name: 'Titular', paid: 100 } },
        {
          docId: 'sat-1',
          data: { name: 'Hijo', bautizosSplitPartyHostParticipantId: 'host' },
        },
      ],
      db: { name: 'db' },
      writeBatch,
      getDocRef,
      sanitizeParticipantConsentForFirestoreWrite: sanitize,
    });

    expect(writeBatch).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledTimes(1);
    expect(sets).toHaveLength(2);
    expect(sets[0].ref).toEqual({ col: 'app_participants', id: 'host' });
    expect(sets[1].ref).toEqual({ col: 'app_participants', id: 'sat-1' });
    expect(sets.every((s) => s.data.sanitized === true)).toBe(true);
    expect(result).toEqual({ ok: true, docIds: ['host', 'sat-1'] });
  });

  it('does not call commit when validation fails', async () => {
    const commit = vi.fn(async () => {});
    const writeBatch = vi.fn(() => ({ set: vi.fn(), commit }));
    await expect(
      commitBautizosSplitPartyParticipantDocs({
        writes: [{ docId: 'only-host', data: { name: 'Solo' } }],
        db: {},
        writeBatch,
        getDocRef: () => ({}),
      })
    ).rejects.toMatchObject({ code: 'split-party-invalid' });
    expect(writeBatch).not.toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
  });
});
