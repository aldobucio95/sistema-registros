import { describe, expect, it } from 'vitest';
import {
  countPastorParticipants,
  eventHasMultipleCalendarDays,
  eventSupportsPastorStayDates,
  getPastorRealCostAmount,
  isPastorParticipant,
  normalizePastorStayDate,
  sumPastorRealCostForParticipants,
} from '../pastorAttendance.js';

describe('pastorAttendance', () => {
  it('detects pastor in Bautizos and Campa/General', () => {
    expect(isPastorParticipant({ bautizosAttendanceType: 'pastor' }, 'Bautizos')).toBe(true);
    expect(isPastorParticipant({ attendanceSpecialType: 'pastor' }, 'Campa')).toBe(true);
    expect(isPastorParticipant({ attendanceSpecialType: 'pastor' }, 'General')).toBe(true);
    expect(isPastorParticipant({ attendanceSpecialType: 'empleado' }, 'Campa')).toBe(false);
  });

  it('sums individual pastor real costs', () => {
    const rows = [
      { bautizosAttendanceType: 'pastor', pastorRealCost: 100 },
      { attendanceSpecialType: 'pastor', pastorRealCost: '250' },
      { attendanceSpecialType: 'cortesia', pastorRealCost: 999 },
    ];
    expect(countPastorParticipants(rows, 'Campa')).toBe(1);
    expect(sumPastorRealCostForParticipants(rows, 'Bautizos')).toBe(100);
    expect(getPastorRealCostAmount({ pastorRealCost: -5 })).toBe(0);
  });

  it('normalizes stay dates and multi-day events', () => {
    expect(normalizePastorStayDate('2026-06-01')).toBe('2026-06-01');
    expect(normalizePastorStayDate('bad')).toBe('');
    expect(
      eventHasMultipleCalendarDays({
        dateStart: '2026-06-01',
        dateEnd: '2026-06-03',
      })
    ).toBe(true);
    expect(
      eventHasMultipleCalendarDays({
        dateStart: '2026-06-01',
        dateEnd: '2026-06-01',
      })
    ).toBe(false);
  });

  it('eventSupportsPastorStayDates when start and end are configured', () => {
    expect(
      eventSupportsPastorStayDates({
        dateStart: '2026-06-01',
        dateEnd: '2026-06-01',
      })
    ).toBe(true);
    expect(eventSupportsPastorStayDates({ date: '2026-06-01' })).toBe(true);
    expect(eventSupportsPastorStayDates({})).toBe(false);
  });
});
