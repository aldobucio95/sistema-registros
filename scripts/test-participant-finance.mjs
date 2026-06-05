import assert from 'node:assert/strict';
import {
  buildAbonoUpdate,
  buildManualPaidAdjustmentUpdate,
  buildPaymentHistoryAppendUpdate,
  stripLiveParticipantFinanceFields,
  validateBackupRestorePayload,
} from '../src/participantFinance.js';

const staleEditPayload = {
  name: 'Edited Name',
  paid: 100,
  paidNet: 100,
  paymentHistory: [{ id: 'old-payment' }],
  whatsAppFinanceNotifications: [{ id: 'old-wa' }],
  paymentMethod: 'Efectivo',
  location: 'Norte',
};

assert.deepEqual(stripLiveParticipantFinanceFields(staleEditPayload), {
  name: 'Edited Name',
  location: 'Norte',
});

const livePersonAfterConcurrentAbono = {
  paid: 150,
  paidNet: 145,
  paymentHistory: [{ id: 'initial' }, { id: 'concurrent-abono' }],
};

assert.deepEqual(
  buildManualPaidAdjustmentUpdate({
    livePerson: livePersonAfterConcurrentAbono,
    grossDelta: 20,
    netDelta: 20,
    adjustmentRecord: { id: 'manual-adjustment', amount: 20 },
  }),
  {
    paid: 170,
    paidNet: 165,
    paymentHistory: [
      { id: 'initial' },
      { id: 'concurrent-abono' },
      { id: 'manual-adjustment', amount: 20 },
    ],
  }
);

assert.deepEqual(
  buildAbonoUpdate({
    livePerson: {
      paid: 100,
      paidNet: 95,
      paymentHistory: [{ id: 'initial' }, { id: 'already-written' }],
      whatsAppFinanceNotifications: [{ id: 'sent-wa', sent: true }],
    },
    addedAmount: 50,
    netAmount: 47.5,
    paymentRecord: { id: 'new-abono', amount: 50 },
    notification: { id: 'new-wa', sent: false },
  }),
  {
    paid: 150,
    paidNet: 142.5,
    paymentHistory: [
      { id: 'initial' },
      { id: 'already-written' },
      { id: 'new-abono', amount: 50 },
    ],
    whatsAppFinanceNotifications: [
      { id: 'sent-wa', sent: true },
      { id: 'new-wa', sent: false },
    ],
  }
);

assert.deepEqual(
  buildPaymentHistoryAppendUpdate({
    livePerson: {
      paymentHistory: [{ id: 'initial' }, { id: 'concurrent-abono' }],
    },
    historyItem: { id: 'comment', kind: 'comment' },
  }),
  {
    paymentHistory: [
      { id: 'initial' },
      { id: 'concurrent-abono' },
      { id: 'comment', kind: 'comment' },
    ],
  }
);

assert.throws(
  () => validateBackupRestorePayload({ participants: [{ id: 'p1' }] }),
  /backup-payload-invalid-collections/
);

assert.throws(
  () => validateBackupRestorePayload({ participants: [{ id: 'p1' }, { id: 'p1' }], events: [] }),
  /backup-payload-duplicate-participant-id/
);

const validBackup = validateBackupRestorePayload({
  participants: [{ id: 'p1' }],
  events: [{ id: 'e1' }],
});
assert.deepEqual(validBackup.participants, [{ id: 'p1' }]);
assert.ok(validBackup.participantIds.has('p1'));
assert.ok(validBackup.eventIds.has('e1'));

console.log('participant finance and backup restore helpers passed');
