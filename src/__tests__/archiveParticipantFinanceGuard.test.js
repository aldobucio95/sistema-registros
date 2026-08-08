import { describe, expect, it } from 'vitest';
import {
  findArchiveBlockedByPendingRefund,
  getArchiveBlockedByPendingRefundMessage,
} from '../archiveParticipantFinanceGuard.js';
import { collectCashCutRefundDisbursements } from '../cashCutRefunds.js';

describe('archiveParticipantFinanceGuard', () => {
  it('bloquea archivar cancelado con saldo pendiente', () => {
    const person = {
      id: 'c1',
      status: 'cancelled',
      paid: 800,
      refundPendingAmount: 800,
      refundAsDonation: false,
    };
    const msg = getArchiveBlockedByPendingRefundMessage(person);
    expect(msg).toMatch(/pendiente de devolución/);
    expect(msg).toMatch(/800/);
  });

  it('permite archivar cancelado ya donado o sin saldo', () => {
    expect(
      getArchiveBlockedByPendingRefundMessage({
        id: 'c2',
        status: 'cancelled',
        refundPendingAmount: 0,
        paid: 0,
      })
    ).toBeNull();
    expect(
      getArchiveBlockedByPendingRefundMessage({
        id: 'c3',
        status: 'cancelled',
        refundPendingAmount: 500,
        refundAsDonation: true,
      })
    ).toBeNull();
    expect(
      getArchiveBlockedByPendingRefundMessage({
        id: 'a1',
        status: 'active',
        paid: 500,
      })
    ).toBeNull();
  });

  it('findArchiveBlockedByPendingRefund agrega varios', () => {
    const { blocked, message } = findArchiveBlockedByPendingRefund([
      { id: 'ok', status: 'active', paid: 10 },
      { id: 'bad', status: 'cancelled', refundPendingAmount: 120, paid: 120 },
      { id: 'bad2', status: 'cancelled', refundPendingAmount: 50, paid: 50 },
    ]);
    expect(blocked.map((p) => p.id)).toEqual(['bad', 'bad2']);
    expect(message).toMatch(/2 registro/);
  });
});

describe('collectCashCutRefundDisbursements archived', () => {
  const identityNet = (g) => g;
  const alwaysInScope = () => true;

  it('conserva egreso de devolución tras archivar (campos refundDisbursed*)', () => {
    const at = Date.UTC(2026, 5, 1, 15, 0, 0);
    const rows = collectCashCutRefundDisbursements(
      [
        {
          id: 'arch1',
          eventId: 'ev1',
          status: 'archived',
          name: 'Ana',
          location: 'Norte',
          cancelledFromLocation: 'Norte',
          paymentHistory: [],
          refundDisbursedAt: at,
          refundDisbursedAmount: 350,
          refundDisbursedMethod: 'Efectivo',
          refundDisbursedBy: 'admin',
        },
      ],
      { id: 'ev1' },
      null,
      alwaysInScope,
      identityNet,
      () => 'Devolución'
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(-350);
    expect(rows[0]._loc).toBe('Norte');
  });

  it('no inventa egreso para archivados sin devolución', () => {
    const rows = collectCashCutRefundDisbursements(
      [{ id: 'arch2', eventId: 'ev1', status: 'archived', paymentHistory: [] }],
      { id: 'ev1' },
      null,
      alwaysInScope,
      identityNet
    );
    expect(rows).toHaveLength(0);
  });
});
