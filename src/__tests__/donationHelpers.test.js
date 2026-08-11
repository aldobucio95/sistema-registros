import { describe, expect, it } from 'vitest';
import {
  donationAddsToRecaudacionBalance,
  donationIsLinkedParticipantTerminal,
  linkedDonationDeleteBlockedMessage,
} from '../donationHelpers.js';

describe('donationAddsToRecaudacionBalance', () => {
  it('excludes cancelled-refund donations from recaudacion add', () => {
    expect(donationAddsToRecaudacionBalance({ fromCancelledRefundDonation: true, amount: 100 })).toBe(false);
  });

  it('includes manual and archived-credit donations', () => {
    expect(donationAddsToRecaudacionBalance({ amount: 50 })).toBe(true);
    expect(donationAddsToRecaudacionBalance({ fromArchivedManualCredit: true, amount: 80 })).toBe(true);
  });
});

describe('donationIsLinkedParticipantTerminal', () => {
  it('protects real cancelled-refund and archived-credit docs', () => {
    expect(donationIsLinkedParticipantTerminal({ fromCancelledRefundDonation: true })).toBe(true);
    expect(donationIsLinkedParticipantTerminal({ fromArchivedManualCredit: true })).toBe(true);
  });

  it('protects synthetic legacy rows', () => {
    expect(donationIsLinkedParticipantTerminal({ _syntheticCancelledRefund: true })).toBe(true);
    expect(donationIsLinkedParticipantTerminal({ _syntheticArchivedCredit: true })).toBe(true);
  });

  it('allows ordinary manual donations', () => {
    expect(donationIsLinkedParticipantTerminal({ amount: 20, donorName: 'X' })).toBe(false);
    expect(donationIsLinkedParticipantTerminal(null)).toBe(false);
  });
});

describe('linkedDonationDeleteBlockedMessage', () => {
  it('mentions baja vs archivo', () => {
    expect(linkedDonationDeleteBlockedMessage({ fromCancelledRefundDonation: true })).toMatch(/baja/i);
    expect(linkedDonationDeleteBlockedMessage({ fromArchivedManualCredit: true })).toMatch(/archivo/i);
  });
});
