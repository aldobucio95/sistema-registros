import { describe, expect, it } from 'vitest';
import {
  isParticipantVersionListenerSuppressed,
  suppressParticipantVersionListeners,
} from '../participantsVersionCache.js';

describe('suppressParticipantVersionListeners', () => {
  it('empieza sin supresión', () => {
    expect(isParticipantVersionListenerSuppressed()).toBe(false);
  });

  it('suprime mientras el contador es > 0', () => {
    const releaseA = suppressParticipantVersionListeners();
    expect(isParticipantVersionListenerSuppressed()).toBe(true);
    const releaseB = suppressParticipantVersionListeners();
    expect(isParticipantVersionListenerSuppressed()).toBe(true);
    releaseB();
    expect(isParticipantVersionListenerSuppressed()).toBe(true);
    releaseA();
    expect(isParticipantVersionListenerSuppressed()).toBe(false);
  });

  it('no deja contador negativo al liberar de más', () => {
    const release = suppressParticipantVersionListeners();
    release();
    release();
    expect(isParticipantVersionListenerSuppressed()).toBe(false);
  });
});
