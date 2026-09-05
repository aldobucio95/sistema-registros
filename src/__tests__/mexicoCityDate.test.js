import { afterEach, describe, expect, it, vi } from 'vitest';
import { toMexicoCityISODate } from '../mexicoCityDate.js';
import { getActiveDiscountCampaigns, getPricingFromSnapshotForDate } from '../publicRegistrationLogic.js';

describe('toMexicoCityISODate', () => {
  it('sigue en el calendario de México después de las 18:00 (UTC ya es el día siguiente)', () => {
    // 5 sep 2026 19:00 CDMX = 6 sep 2026 01:00 UTC
    const eveningCdt = Date.parse('2026-09-05T19:00:00-06:00');
    expect(new Date(eveningCdt).toISOString().split('T')[0]).toBe('2026-09-06');
    expect(toMexicoCityISODate(eveningCdt)).toBe('2026-09-05');
  });

  it('cambia de día a la medianoche de México, no a las 18:00', () => {
    const justBeforeMidnight = Date.parse('2026-09-05T23:59:00-06:00');
    const justAfterMidnight = Date.parse('2026-09-06T00:01:00-06:00');
    expect(toMexicoCityISODate(justBeforeMidnight)).toBe('2026-09-05');
    expect(toMexicoCityISODate(justAfterMidnight)).toBe('2026-09-06');
  });
});

describe('getPricingFromSnapshotForDate', () => {
  const event = {
    eventType: 'Campa',
    pricingType: 'dynamic',
    globalCost: 3400,
    dynamicPrices: [{ dateUntil: '2026-09-05', globalCost: 2000 }],
  };

  it('mantiene la fase vigente a las 19:00 de México en el último día', () => {
    const evening = Date.parse('2026-09-05T19:00:00-06:00');
    expect(getPricingFromSnapshotForDate(event, evening).global).toBe(2000);
  });

  it('pasa a precio final después de medianoche en México', () => {
    const nextMorning = Date.parse('2026-09-06T00:30:00-06:00');
    expect(getPricingFromSnapshotForDate(event, nextMorning).global).toBe(3400);
  });
});

describe('getActiveDiscountCampaigns', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const event = {
    discountCampaigns: [
      {
        id: 'c1',
        enabled: true,
        startDate: '2026-09-01',
        endDate: '2026-09-05',
        concept: 'Preventa',
        finalAmount: 1500,
      },
    ],
  };

  it('sigue vigente a las 19:00 de México en el último día', () => {
    vi.useFakeTimers();
    vi.setSystemTime(Date.parse('2026-09-05T19:00:00-06:00'));
    expect(getActiveDiscountCampaigns(event)).toHaveLength(1);
  });

  it('caduca después de medianoche en México', () => {
    vi.useFakeTimers();
    vi.setSystemTime(Date.parse('2026-09-06T00:30:00-06:00'));
    expect(getActiveDiscountCampaigns(event)).toHaveLength(0);
  });
});
