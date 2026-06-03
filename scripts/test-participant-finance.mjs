import assert from 'node:assert/strict';
import {
  buildAbonoTransactionPayload,
  buildParticipantEditTransactionPayload,
} from '../src/participantFinance.js';

const livePerson = {
  id: 'p1',
  name: 'Participante',
  paid: 300,
  paidNet: 290,
  paymentHistory: [
    { id: 'initial', amount: 100, netAmount: 100 },
    { id: 'live-abono', amount: 200, netAmount: 190 },
  ],
  whatsAppFinanceNotifications: [{ id: 'live-wa', sent: false }],
  registeredCost: 500,
  refundPendingAmount: 0,
  refundPendingReason: '',
};

const staleEditPayload = {
  name: 'Participante editado',
  paid: 100,
  paidNet: 100,
  paymentHistory: [{ id: 'initial', amount: 100, netAmount: 100 }],
  whatsAppFinanceNotifications: [],
  registeredCost: 500,
};

const editResult = buildParticipantEditTransactionPayload({
  basePayload: staleEditPayload,
  livePerson,
  adminAdjustedPaid: false,
  manualPaymentAdjustment: null,
  isCancelled: () => false,
  getLiquidationTarget: () => 500,
});

assert.equal(editResult.nextPayload.name, 'Participante editado');
assert.equal(editResult.nextPayload.paid, undefined);
assert.equal(editResult.nextPayload.paidNet, undefined);
assert.equal(editResult.nextPayload.paymentHistory, undefined);
assert.equal(editResult.nextPayload.whatsAppFinanceNotifications, undefined);
assert.deepEqual(editResult.mergedData.paymentHistory, livePerson.paymentHistory);
assert.deepEqual(editResult.mergedData.whatsAppFinanceNotifications, livePerson.whatsAppFinanceNotifications);

const manualAdjustment = { id: 'manual-adjustment', amount: 50, netAmount: 50, isManualAdjustment: true };
const manualEditResult = buildParticipantEditTransactionPayload({
  basePayload: staleEditPayload,
  livePerson,
  adminAdjustedPaid: true,
  manualPaymentAdjustment: manualAdjustment,
  manualPaymentGrossDelta: 50,
  manualPaymentNetDelta: 50,
  isCancelled: () => false,
  getLiquidationTarget: () => 500,
});

assert.equal(manualEditResult.nextPayload.paid, 350);
assert.equal(manualEditResult.nextPayload.paidNet, 340);
assert.deepEqual(manualEditResult.nextPayload.paymentHistory, [
  ...livePerson.paymentHistory,
  manualAdjustment,
]);

const abonoRecord = { id: 'new-abono', amount: 100, netAmount: 96 };
const abonoResult = buildAbonoTransactionPayload({
  person: livePerson,
  addedAmount: 100,
  netAmount: 96,
  newPaymentRecord: abonoRecord,
  paymentLoc: 'Norte',
  abonoCreatedAt: 12345,
  buildFinanceWhatsAppMessage: (_person, loc, amount, pending) => `${loc}:${amount}:${pending}`,
  getLiquidationTarget: () => 500,
});

assert.equal(abonoResult.ok, true);
assert.equal(abonoResult.payload.paid, 400);
assert.equal(abonoResult.payload.paidNet, 386);
assert.deepEqual(abonoResult.payload.paymentHistory, [...livePerson.paymentHistory, abonoRecord]);
assert.equal(abonoResult.payload.whatsAppFinanceNotifications.length, 2);
assert.equal(abonoResult.payload.whatsAppFinanceNotifications[0].id, 'live-wa');
assert.equal(abonoResult.payload.whatsAppFinanceNotifications[1].message, 'Norte:100:100');

const overpayResult = buildAbonoTransactionPayload({
  person: livePerson,
  addedAmount: 250,
  netAmount: 250,
  newPaymentRecord: { id: 'too-much' },
  paymentLoc: 'Norte',
  abonoCreatedAt: 12346,
  buildFinanceWhatsAppMessage: () => '',
  getLiquidationTarget: () => 500,
});

assert.equal(overpayResult.ok, false);
assert.equal(overpayResult.error, 'payment-over-total');
assert.equal(overpayResult.maxAmount, 200);

console.log('participant finance merge tests passed');
