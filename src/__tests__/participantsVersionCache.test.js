import { describe, expect, it } from 'vitest';
import { isParticipantSliceHit } from '../participantsVersionCache.js';

describe('isParticipantSliceHit', () => {
  const localData = { version: 3, data: [{ id: 'p1', name: 'Ana' }] };

  it('acepta caché cuando hay versión remota y coincide', () => {
    expect(isParticipantSliceHit(localData, 3)).toBe(true);
  });

  it('rechaza caché cuando la versión remota avanzó', () => {
    expect(isParticipantSliceHit(localData, 7)).toBe(false);
  });

  it('acepta caché local sembrada mientras no hay doc remoto (v=0)', () => {
    expect(isParticipantSliceHit(localData, 0)).toBe(true);
  });

  it('acepta sede vacía cacheada con versión compatible', () => {
    expect(isParticipantSliceHit({ version: 1, data: [] }, 1)).toBe(true);
    expect(isParticipantSliceHit({ version: 2, data: [] }, 0)).toBe(true);
  });

  it('rechaza sin registro local usable', () => {
    expect(isParticipantSliceHit(null, 1)).toBe(false);
    expect(isParticipantSliceHit({ version: 0, data: [] }, 0)).toBe(false);
    expect(isParticipantSliceHit({ version: 1, data: null }, 1)).toBe(false);
  });
});
