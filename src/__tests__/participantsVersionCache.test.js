import { describe, expect, it } from 'vitest';
import {
  isParticipantSliceHit,
  mergeParticipantRowsById,
} from '../participantsVersionCache.js';

describe('isParticipantSliceHit', () => {
  const localData = { version: 3, data: [{ id: 'p1', name: 'Ana' }] };

  it('acepta caché cuando hay versión remota y coincide', () => {
    expect(isParticipantSliceHit(localData, 3)).toBe(true);
  });

  it('rechaza caché cuando la versión remota avanzó', () => {
    expect(isParticipantSliceHit(localData, 7)).toBe(false);
  });

  it('rechaza caché local aunque participantCacheVersionsCompatible(3,0) sea true', () => {
    expect(isParticipantSliceHit(localData, 0)).toBe(false);
  });

  it('rechaza sin datos locales', () => {
    expect(isParticipantSliceHit({ version: 1, data: [] }, 1)).toBe(false);
    expect(isParticipantSliceHit(null, 1)).toBe(false);
  });
});

describe('mergeParticipantRowsById', () => {
  it('deduplica por id conservando la última fila', () => {
    const merged = mergeParticipantRowsById([
      { id: 'a', name: 'Ana' },
      { id: 'b', name: 'Bea' },
      { id: 'a', name: 'Ana actualizada' },
    ]);
    expect(merged).toHaveLength(2);
    expect(merged.find((p) => p.id === 'a')?.name).toBe('Ana actualizada');
  });
});
