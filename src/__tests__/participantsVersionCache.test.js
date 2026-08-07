import { describe, expect, it } from 'vitest';
import { cacheVersionsMatch, normalizeCacheVersion } from '../firestoreVersionCache.js';
import { shouldPersistVersionedParticipantSlice } from '../participantsVersionCache.js';

/**
 * Regresión: un miss de versión + datos de caché local sellados con remoteV
 * dejaba el roster congelado (hit falso) hasta el siguiente bump.
 */
describe('participantsVersionCache version stamp safety', () => {
  it('solo persiste slices cuando la lectura fue del servidor', () => {
    expect(shouldPersistVersionedParticipantSlice(true)).toBe(true);
    expect(shouldPersistVersionedParticipantSlice(false)).toBe(false);
    expect(shouldPersistVersionedParticipantSlice(undefined)).toBe(false);
    expect(shouldPersistVersionedParticipantSlice(null)).toBe(false);
  });

  it('un sellado con remoteV actual hace match y bloquearía refetch (el bug)', () => {
    const remoteV = 42;
    const poisonedLocalVersion = remoteV;
    expect(cacheVersionsMatch(poisonedLocalVersion, remoteV)).toBe(true);
    expect(normalizeCacheVersion(poisonedLocalVersion)).toBe(42);
  });

  it('si no se sella offline, el miss sigue siendo miss (local viejo vs remote nuevo)', () => {
    expect(cacheVersionsMatch(41, 42)).toBe(false);
    expect(cacheVersionsMatch(0, 42)).toBe(false);
  });
});
