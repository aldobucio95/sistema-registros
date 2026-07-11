import { describe, expect, it, vi } from 'vitest';
import { syncParticipantsBatchAfterWrite } from '../firestoreLiveSync.js';

describe('syncParticipantsBatchAfterWrite', () => {
  it('aplica varios parches en un solo setState y devuelve sedes únicas', () => {
    const prev = [
      { id: 'a', status: 'active', location: 'Sede A' },
      { id: 'b', status: 'active', location: 'Sede A' },
    ];
    let latest = prev;
    const setAllParticipants = vi.fn((updater) => {
      latest = updater(prev);
    });

    const result = syncParticipantsBatchAfterWrite(setAllParticipants, [
      { personId: 'a', patch: { status: 'cancelled' }, eventId: 'ev1', location: 'Sede A' },
      { personId: 'b', patch: { status: 'cancelled' }, eventId: 'ev1', location: 'Sede A' },
    ]);

    expect(setAllParticipants).toHaveBeenCalledTimes(1);
    expect(latest.find((p) => p.id === 'a')?.status).toBe('cancelled');
    expect(latest.find((p) => p.id === 'b')?.status).toBe('cancelled');
    expect(result).toEqual({ eventId: 'ev1', locations: ['Sede A'], nextParticipants: expect.any(Array) });
  });

  it('ignora entradas sin patch', () => {
    const setAllParticipants = vi.fn();
    const result = syncParticipantsBatchAfterWrite(setAllParticipants, [{ personId: 'x' }]);
    expect(setAllParticipants).not.toHaveBeenCalled();
    expect(result).toEqual({ eventId: '', locations: [], nextParticipants: null });
  });
});
