import { describe, expect, it } from 'vitest';
import {
  CASH_CUT_NO_SERVICE_LABEL,
  DEFAULT_SERVICE_SLOTS,
  resolveCashCutServiceForTimestamp,
} from '../cashCutService.js';

const event = { id: 'ev1', eventType: 'Bautizos' };
const schedule = {
  'SEDE NORTE': {
    Primero: { start: '07:00', end: '10:50' },
    Segundo: { start: '10:50', end: '13:00' },
    Tercero: { start: '13:00', end: '17:00' },
  },
};

describe('cashCutService', () => {
  it('assigns Sunday payments to the matching service slot', () => {
    const ctx = { event, globalScheduleByLocation: schedule };
    const sundayPrimero = new Date(2026, 5, 28, 9, 15, 0, 0).getTime();
    const sundaySegundo = new Date(2026, 5, 28, 11, 30, 0, 0).getTime();
    const sundayTerceroClose = new Date(2026, 5, 28, 17, 0, 0, 0).getTime();
    expect(resolveCashCutServiceForTimestamp(sundayPrimero, 'SEDE NORTE', ctx)).toBe('Primero');
    expect(resolveCashCutServiceForTimestamp(sundaySegundo, 'SEDE NORTE', ctx)).toBe('Segundo');
    expect(resolveCashCutServiceForTimestamp(sundayTerceroClose, 'SEDE NORTE', ctx)).toBe('Tercero');
  });

  it('returns off-schedule label outside configured hours or weekdays', () => {
    const ctx = { event, globalScheduleByLocation: schedule };
    const saturday = new Date(2026, 5, 27, 10, 0, 0, 0).getTime();
    const lateNight = new Date(2026, 5, 28, 18, 0, 0, 0).getTime();
    expect(resolveCashCutServiceForTimestamp(saturday, 'SEDE NORTE', ctx)).toBe(CASH_CUT_NO_SERVICE_LABEL);
    expect(resolveCashCutServiceForTimestamp(lateNight, 'SEDE NORTE', ctx)).toBe(CASH_CUT_NO_SERVICE_LABEL);
  });

  it('uses default slots when sede has no custom schedule', () => {
    const ctx = { event, globalSlots: DEFAULT_SERVICE_SLOTS };
    const sunday = new Date(2026, 5, 28, 12, 30, 0, 0).getTime();
    expect(resolveCashCutServiceForTimestamp(sunday, 'Coapa', ctx)).toBe('Segundo');
  });
});
