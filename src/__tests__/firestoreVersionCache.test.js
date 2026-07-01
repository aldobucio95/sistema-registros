import { describe, expect, it } from 'vitest';
import {
  cacheVersionsMatch,
  participantCacheVersionsCompatible,
} from '../firestoreVersionCache.js';

describe('participantCacheVersionsCompatible', () => {
  it('coincide cuando local y remoto son iguales', () => {
    expect(cacheVersionsMatch(5, 5)).toBe(true);
    expect(participantCacheVersionsCompatible(5, 5)).toBe(true);
  });

  it('acepta caché local sembrada (v≥1) sin doc remoto (v=0)', () => {
    expect(cacheVersionsMatch(1, 0)).toBe(false);
    expect(participantCacheVersionsCompatible(1, 0)).toBe(true);
    expect(participantCacheVersionsCompatible(42, 0)).toBe(true);
  });

  it('rechaza cuando remoto avanzó y local quedó atrás', () => {
    expect(participantCacheVersionsCompatible(3, 7)).toBe(false);
  });

  it('rechaza sin caché local (v=0)', () => {
    expect(participantCacheVersionsCompatible(0, 0)).toBe(false);
    expect(participantCacheVersionsCompatible(0, 5)).toBe(false);
  });
});
