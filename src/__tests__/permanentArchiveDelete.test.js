import { describe, expect, it } from 'vitest';
import {
  DONATION_SOURCE_PARTICIPANT_FIELD,
  linkedDonationsQueryForParticipant,
  resolvePersonForArchiveIndexCleanup,
} from '../permanentArchiveDelete.js';

describe('permanentArchiveDelete helpers', () => {
  it('queries donations by sourceParticipantId (archive credit / refund-as-donation field)', () => {
    expect(DONATION_SOURCE_PARTICIPANT_FIELD).toBe('sourceParticipantId');
    expect(linkedDonationsQueryForParticipant('abc-1')).toEqual({
      field: 'sourceParticipantId',
      value: 'abc-1',
    });
    expect(linkedDonationsQueryForParticipant('')).toBeNull();
  });

  it('builds a person-shaped object for archive index cleanup (never bare VNPM/phone)', () => {
    const raw = {
      id: 'p1',
      vnpPersonId: 'VNPM-ABCDEF120101H',
      phone: '5512345678',
      eventId: 'ev1',
    };
    expect(resolvePersonForArchiveIndexCleanup({ rawParticipant: raw, pid: 'p1' })).toMatchObject({
      id: 'p1',
      vnpPersonId: 'VNPM-ABCDEF120101H',
      eventId: 'ev1',
    });

    const fromFs = resolvePersonForArchiveIndexCleanup({
      rawParticipant: null,
      firestoreData: { vnpPersonId: 'VNPM-ABCDEF120101H', eventId: 'ev2', name: 'Ana' },
      pid: 'p2',
    });
    expect(fromFs).toMatchObject({ id: 'p2', eventId: 'ev2', name: 'Ana' });

    expect(
      resolvePersonForArchiveIndexCleanup({
        rawParticipant: null,
        firestoreData: null,
        pid: 'missing',
      })
    ).toBeNull();
  });
});
