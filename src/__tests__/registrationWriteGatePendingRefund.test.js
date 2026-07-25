import { describe, expect, it } from 'vitest';
import { existingRegistrationBlocksDueToPendingRefund } from '../registrationWriteGateGuards.js';

describe('existingRegistrationBlocksDueToPendingRefund', () => {
  const eventId = 'evt-1';

  it('blocks same-event cancelled docs with pending refund (setDoc would wipe accounting)', () => {
    expect(
      existingRegistrationBlocksDueToPendingRefund(
        {
          eventId,
          status: 'cancelled',
          refundPendingAmount: 350,
          paymentHistory: [{ amount: 350 }],
        },
        eventId
      )
    ).toBe(true);
  });

  it('allows overwrite when there is no pending refund', () => {
    expect(
      existingRegistrationBlocksDueToPendingRefund(
        {
          eventId,
          status: 'cancelled',
          refundPendingAmount: 0,
          paymentHistory: [{ amount: 350 }, { kind: 'refund', amount: -350 }],
        },
        eventId
      )
    ).toBe(false);
  });

  it('ignores pending refunds belonging to a different event', () => {
    expect(
      existingRegistrationBlocksDueToPendingRefund(
        {
          eventId: 'other-event',
          status: 'cancelled',
          refundPendingAmount: 100,
        },
        eventId
      )
    ).toBe(false);
  });
});
