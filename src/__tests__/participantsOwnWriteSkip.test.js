import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  markParticipantLocationOwnWrite,
  shouldSkipParticipantLocationOwnWriteRefetch,
} from '../participantsVersionCache.js';

describe('own-write refetch skip', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('omite refetch mientras dura la ventana de escritura propia', () => {
    markParticipantLocationOwnWrite('ev1', 'Norte', 5000);
    expect(shouldSkipParticipantLocationOwnWriteRefetch('ev1', 'Norte')).toBe(true);
    expect(shouldSkipParticipantLocationOwnWriteRefetch('ev1', 'Sur')).toBe(false);
  });

  it('deja de omitir tras expirar la ventana', () => {
    vi.useFakeTimers();
    markParticipantLocationOwnWrite('ev1', 'Norte', 1000);
    vi.advanceTimersByTime(1500);
    expect(shouldSkipParticipantLocationOwnWriteRefetch('ev1', 'Norte')).toBe(false);
  });
});
