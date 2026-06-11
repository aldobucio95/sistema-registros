import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildParticipantUpdatePreservingLiveFinance,
  validateBackupSnapshot,
} from './participantFinance.js';

test('participant edit payload preserves live payment fields and appends manual adjustments', () => {
  const live = {
    paid: 150,
    paidNet: 145,
    paymentHistory: [{ id: 'live-payment', amount: 50 }],
    whatsAppFinanceNotifications: [{ id: 'live-wa', sent: false }],
    paymentMethod: 'Tarjeta',
    paymentService: 'Segundo',
    cardReference: 'A1',
  };
  const staleDraft = {
    name: 'Ana',
    paid: 120,
    paidNet: 120,
    paymentHistory: [{ id: 'stale-payment', amount: 20 }],
    whatsAppFinanceNotifications: [],
    paymentMethod: 'Efectivo',
    paymentService: 'Primero',
    cardReference: '',
  };
  const adjustment = { id: 'manual-adjustment', amount: 20 };

  const payload = buildParticipantUpdatePreservingLiveFinance(staleDraft, live, {
    manualPaymentAdjustment: adjustment,
    paidGrossDelta: 20,
    paidNetDelta: 20,
  });

  assert.equal(payload.name, 'Ana');
  assert.equal(payload.paid, 170);
  assert.equal(payload.paidNet, 165);
  assert.deepEqual(payload.paymentHistory, [live.paymentHistory[0], adjustment]);
  assert.deepEqual(payload.whatsAppFinanceNotifications, live.whatsAppFinanceNotifications);
  assert.equal(payload.paymentMethod, 'Tarjeta');
  assert.equal(payload.paymentService, 'Segundo');
  assert.equal(payload.cardReference, 'A1');
});

test('participant edit payload drops stale finance fields when live doc lacks them', () => {
  const payload = buildParticipantUpdatePreservingLiveFinance(
    {
      name: 'Luis',
      paid: 999,
      paymentHistory: [{ id: 'stale' }],
      whatsAppFinanceNotifications: [{ id: 'stale-wa' }],
    },
    { name: 'Luis live' }
  );

  assert.equal(payload.name, 'Luis');
  assert.equal(Object.prototype.hasOwnProperty.call(payload, 'paid'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(payload, 'paymentHistory'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(payload, 'whatsAppFinanceNotifications'), false);
});

test('backup snapshot validation rejects missing arrays and missing ids', () => {
  assert.equal(validateBackupSnapshot(null).ok, false);
  assert.equal(validateBackupSnapshot({ participants: [], events: null }).ok, false);
  assert.equal(validateBackupSnapshot({ participants: [{ name: 'Sin id' }], events: [] }).ok, false);
  assert.equal(validateBackupSnapshot({ participants: [], events: [{ name: 'Evento sin id' }] }).ok, false);
});

test('backup snapshot validation accepts participants and events with ids', () => {
  const result = validateBackupSnapshot({
    participants: [{ id: 'p1', name: 'Ana' }],
    events: [{ id: 'e1', name: 'Evento' }],
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.participants, [{ id: 'p1', name: 'Ana' }]);
  assert.deepEqual(result.events, [{ id: 'e1', name: 'Evento' }]);
});
