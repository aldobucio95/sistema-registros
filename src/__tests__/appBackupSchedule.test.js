import { describe, expect, it } from 'vitest';
import {
  buildPreRestoreBackupId,
  formatLocalDateId,
  isDailyBackupDue,
  isDailyBackupId,
  msUntilNextLocalMidnight,
} from '../appBackupSchedule.js';

describe('appBackupSchedule', () => {
  it('formatLocalDateId usa calendario local', () => {
    const d = new Date(2026, 6, 3, 15, 30, 0);
    expect(formatLocalDateId(d)).toBe('2026-07-03');
  });

  it('isDailyBackupId distingue copia diaria de pre-restore', () => {
    expect(isDailyBackupId('2026-07-03')).toBe(true);
    expect(isDailyBackupId('2026-07-03_pre-restore_173')).toBe(false);
  });

  it('buildPreRestoreBackupId es único por timestamp', () => {
    const t = new Date(2026, 6, 3, 2, 59, 0);
    expect(buildPreRestoreBackupId(t)).toBe('2026-07-03_pre-restore_' + t.getTime());
  });

  it('isDailyBackupDue cuando lastBackupDate no es hoy', () => {
    const now = new Date(2026, 6, 3, 12, 0, 0);
    expect(isDailyBackupDue('2026-07-02', now)).toBe(true);
    expect(isDailyBackupDue('2026-07-03', now)).toBe(false);
  });

  it('msUntilNextLocalMidnight apunta al día siguiente a las 00:00', () => {
    const from = new Date(2026, 6, 3, 23, 0, 0);
    const ms = msUntilNextLocalMidnight(from);
    const target = new Date(from.getTime() + ms);
    expect(target.getFullYear()).toBe(2026);
    expect(target.getMonth()).toBe(6);
    expect(target.getDate()).toBe(4);
    expect(target.getHours()).toBe(0);
    expect(target.getMinutes()).toBe(0);
  });
});
