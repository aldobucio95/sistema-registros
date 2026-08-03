import { describe, expect, it } from 'vitest';
import {
  REFUND_TERMINAL_REASONS,
  evaluateMarkCancelledRefundAsDonation,
  evaluateDisburseCancelledRefund,
  planMarkCancelledRefundAsDonation,
  planDisburseCancelledRefund,
  commitMarkCancelledRefundAsDonation,
  commitDisburseCancelledRefund,
  refundTerminalFailureMessage,
} from '../cancelledRefundTerminal.js';

const cancelledBase = {
  id: 'p-cancel-1',
  name: 'Ana López García',
  status: 'cancelled',
  location: 'Coyoacán',
  cancelledFromLocation: 'Coyoacán',
  paid: 500,
  refundPendingAmount: 500,
  paymentHistory: [{ id: 'ab1', amount: 500, method: 'Efectivo' }],
};

describe('evaluateMarkCancelledRefundAsDonation', () => {
  it('allows pending cancelled refund', () => {
    expect(evaluateMarkCancelledRefundAsDonation(cancelledBase)).toEqual({
      ok: true,
      pendingAmount: 500,
    });
  });

  it('blocks when already marked as donation', () => {
    expect(
      evaluateMarkCancelledRefundAsDonation({ ...cancelledBase, refundAsDonation: true })
    ).toEqual({ ok: false, reason: REFUND_TERMINAL_REASONS.ALREADY_DONATION });
  });

  it('blocks when already disbursed', () => {
    expect(
      evaluateMarkCancelledRefundAsDonation({
        ...cancelledBase,
        refundDisbursedAt: 1,
        refundDisbursedAmount: 500,
      })
    ).toEqual({ ok: false, reason: REFUND_TERMINAL_REASONS.ALREADY_DISBURSED });
  });

  it('blocks active participants', () => {
    expect(evaluateMarkCancelledRefundAsDonation({ ...cancelledBase, status: 'active' })).toEqual({
      ok: false,
      reason: REFUND_TERMINAL_REASONS.NOT_CANCELLED,
    });
  });
});

describe('evaluateDisburseCancelledRefund', () => {
  it('blocks donation terminal before disbursement', () => {
    expect(
      evaluateDisburseCancelledRefund({ ...cancelledBase, refundAsDonation: true }, Date.now())
    ).toEqual({ ok: false, reason: REFUND_TERMINAL_REASONS.ALREADY_DONATION });
  });

  it('rejects invalid timestamp', () => {
    expect(evaluateDisburseCancelledRefund(cancelledBase, NaN)).toEqual({
      ok: false,
      reason: REFUND_TERMINAL_REASONS.INVALID_AT,
    });
  });
});

describe('planMarkCancelledRefundAsDonation', () => {
  it('links donation via sourceParticipantId and clears pending', () => {
    const planned = planMarkCancelledRefundAsDonation({
      person: cancelledBase,
      personId: cancelledBase.id,
      pendingAmount: 500,
      markedAt: 1_700_000_000_000,
      eventId: 'ev1',
      createdBy: 'admin',
    });
    expect(planned.participantPatch.refundAsDonation).toBe(true);
    expect(planned.participantPatch.refundPendingAmount).toBe(0);
    expect(planned.donationRow.fromCancelledRefundDonation).toBe(true);
    expect(planned.donationRow.sourceParticipantId).toBe('p-cancel-1');
    expect(planned.donationRow.amount).toBe(500);
    expect(planned.donationId).toContain('don');
  });
});

describe('planDisburseCancelledRefund', () => {
  it('appends refund history from live paymentHistory', () => {
    const planned = planDisburseCancelledRefund({
      person: cancelledBase,
      personId: cancelledBase.id,
      pendingAmount: 500,
      method: 'Efectivo',
      atMs: 1_700_000_000_000,
      registeredBy: 'caja',
      computeNetAmountByMethod: (g) => g,
      service: 'Mañana',
    });
    expect(planned.participantPatch.refundDisbursedAmount).toBe(500);
    expect(planned.participantPatch.paymentHistory).toHaveLength(2);
    expect(planned.participantPatch.paymentHistory[1].amount).toBe(-500);
    expect(planned.participantPatch.paymentHistory[1].kind).toBe('refund_disbursement');
  });
});

describe('commitMarkCancelledRefundAsDonation', () => {
  it('writes donation before/with participant update inside one transaction', async () => {
    const order = [];
    const liveSnap = {
      exists: () => true,
      data: () => {
        const { id, ...rest } = cancelledBase;
        return rest;
      },
      id: cancelledBase.id,
    };
    const participantRef = { path: 'app_participants/p-cancel-1' };
    const donationRefs = [];
    const result = await commitMarkCancelledRefundAsDonation({
      runTransaction: async (_db, fn) =>
        fn({
          get: async (ref) => {
            order.push(`get:${ref.path}`);
            return liveSnap;
          },
          set: (ref, data) => {
            order.push(`set:${ref.path}`);
            donationRefs.push(data);
          },
          update: (ref, data) => {
            order.push(`update:${ref.path}:${data.refundAsDonation}`);
          },
        }),
      db: {},
      participantRef,
      donationRefForId: (id) => ({ path: `app_donations/${id}` }),
      livePersonFromSnap: (snap) => ({ id: snap.id, ...snap.data() }),
      eventId: 'ev1',
      createdBy: 'admin',
      markedAt: 1_700_000_000_000,
    });
    expect(result.ok).toBe(true);
    expect(order[0]).toBe('get:app_participants/p-cancel-1');
    expect(order[1].startsWith('set:app_donations/')).toBe(true);
    expect(order[2]).toBe('update:app_participants/p-cancel-1:true');
    expect(donationRefs[0].sourceParticipantId).toBe('p-cancel-1');
  });

  it('aborts when live doc already disbursed (concurrent race)', async () => {
    const liveSnap = {
      exists: () => true,
      id: cancelledBase.id,
      data: () => ({
        ...cancelledBase,
        id: undefined,
        refundDisbursedAt: 99,
        refundDisbursedAmount: 500,
      }),
    };
    const result = await commitMarkCancelledRefundAsDonation({
      runTransaction: async (_db, fn) =>
        fn({
          get: async () => liveSnap,
          set: () => {
            throw new Error('should not set');
          },
          update: () => {
            throw new Error('should not update');
          },
        }),
      db: {},
      participantRef: { path: 'x' },
      donationRefForId: (id) => ({ path: id }),
      livePersonFromSnap: (snap) => ({ id: snap.id, ...snap.data() }),
      eventId: 'ev1',
      createdBy: 'admin',
    });
    expect(result).toEqual({ ok: false, reason: REFUND_TERMINAL_REASONS.ALREADY_DISBURSED });
  });
});

describe('commitDisburseCancelledRefund', () => {
  it('aborts when live doc already marked donation', async () => {
    const liveSnap = {
      exists: () => true,
      id: cancelledBase.id,
      data: () => ({ ...cancelledBase, id: undefined, refundAsDonation: true }),
    };
    const result = await commitDisburseCancelledRefund({
      runTransaction: async (_db, fn) =>
        fn({
          get: async () => liveSnap,
          update: () => {
            throw new Error('should not update');
          },
        }),
      db: {},
      participantRef: { path: 'x' },
      livePersonFromSnap: (snap) => ({ id: snap.id, ...snap.data() }),
      method: 'Efectivo',
      disbursedAtMs: Date.now(),
      registeredBy: 'caja',
      computeNetAmountByMethod: (g) => g,
      getAutoPaymentService: () => 'Mañana',
    });
    expect(result).toEqual({ ok: false, reason: REFUND_TERMINAL_REASONS.ALREADY_DONATION });
    expect(refundTerminalFailureMessage(result.reason)).toMatch(/donación/);
  });

  it('updates from live paymentHistory inside transaction', async () => {
    const liveSnap = {
      exists: () => true,
      id: cancelledBase.id,
      data: () => {
        const { id, ...rest } = cancelledBase;
        return rest;
      },
    };
    const updates = [];
    const result = await commitDisburseCancelledRefund({
      runTransaction: async (_db, fn) =>
        fn({
          get: async () => liveSnap,
          update: (_ref, data) => updates.push(data),
        }),
      db: {},
      participantRef: { path: 'x' },
      livePersonFromSnap: (snap) => ({ id: snap.id, ...snap.data() }),
      method: 'Tarjeta',
      disbursedAtMs: 1_700_000_000_000,
      registeredBy: 'caja',
      computeNetAmountByMethod: (g) => g * 0.96,
      getAutoPaymentService: () => 'Tarde',
    });
    expect(result.ok).toBe(true);
    expect(updates).toHaveLength(1);
    expect(updates[0].refundDisbursedMethod).toBe('Tarjeta');
    expect(updates[0].paymentHistory).toHaveLength(2);
    expect(updates[0].paymentHistory[1].amount).toBe(-500);
  });
});
