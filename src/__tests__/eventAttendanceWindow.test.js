import { describe, expect, it } from 'vitest';
import {
  eventAttendanceMarkingWindowHint,
  isEventAttendanceMarkingWindowOpen,
} from '../eventDateHelpers.js';

describe('event attendance marking window', () => {
  const event = { dateStart: '2026-07-10', dateEnd: '2026-07-12' };

  it('is open on start, middle and end day', () => {
    expect(isEventAttendanceMarkingWindowOpen(event, '2026-07-09')).toBe(false);
    expect(isEventAttendanceMarkingWindowOpen(event, '2026-07-10')).toBe(true);
    expect(isEventAttendanceMarkingWindowOpen(event, '2026-07-11')).toBe(true);
    expect(isEventAttendanceMarkingWindowOpen(event, '2026-07-12')).toBe(true);
    expect(isEventAttendanceMarkingWindowOpen(event, '2026-07-13')).toBe(false);
  });

  it('single-day event uses same start/end', () => {
    const oneDay = { date: '2026-07-10' };
    expect(isEventAttendanceMarkingWindowOpen(oneDay, '2026-07-09')).toBe(false);
    expect(isEventAttendanceMarkingWindowOpen(oneDay, '2026-07-10')).toBe(true);
    expect(isEventAttendanceMarkingWindowOpen(oneDay, '2026-07-11')).toBe(false);
  });

  it('returns false when dates are missing', () => {
    expect(isEventAttendanceMarkingWindowOpen({}, '2026-07-10')).toBe(false);
  });

  it('hint mentions event range', () => {
    expect(eventAttendanceMarkingWindowHint(event)).toMatch(/durante el evento/i);
  });
});
