import { describe, expect, it } from 'vitest';
import { isPartialRevertPreviousData, planRevertUpdateWrite } from '../revertApply.js';

describe('isPartialRevertPreviousData', () => {
  it('treats baptism shirt patch as partial participant snapshot', () => {
    expect(isPartialRevertPreviousData({ baptismShirtSize: 'M' }, 'app_participants')).toBe(true);
  });

  it('treats full participant snapshot as complete', () => {
    expect(
      isPartialRevertPreviousData(
        {
          id: 'id_VNPMABC',
          eventId: 'evt1',
          name: 'Ana',
          paid: 100,
          paymentHistory: [{ amount: 100 }],
        },
        'app_participants'
      )
    ).toBe(false);
  });

  it('treats transportPlanning-only patch as partial event snapshot', () => {
    expect(
      isPartialRevertPreviousData({ transportPlanning: { unitsByLocation: {} } }, 'app_events')
    ).toBe(true);
  });

  it('treats full event snapshot as complete', () => {
    expect(
      isPartialRevertPreviousData(
        { id: 'evt1', name: 'Campa 2026', eventType: 'Campa', locations: ['HQ'] },
        'app_events'
      )
    ).toBe(false);
  });

  it('treats customCarCatalog-only patch as partial config snapshot', () => {
    expect(
      isPartialRevertPreviousData({ customCarCatalog: { brands: {} } }, 'app_data')
    ).toBe(true);
  });
});

describe('planRevertUpdateWrite', () => {
  it('merges partial participant patches instead of replacing the doc', () => {
    const plan = planRevertUpdateWrite(
      { baptismShirtSize: 'G' },
      'app_participants',
      { id: 'p1', eventId: 'e1', name: 'Ana', paid: 200 },
      'p1'
    );
    expect(plan).toEqual({ mode: 'merge', payload: { baptismShirtSize: 'G' } });
  });

  it('merges partial event transport patches', () => {
    const plan = planRevertUpdateWrite(
      { transportPlanning: { busAssign: { a: 1 } } },
      'app_events',
      { id: 'e1', name: 'Evento', eventType: 'Bautizos', locations: ['HQ'] },
      'e1',
      () => {
        throw new Error('full-event merger must not run for partial patches');
      }
    );
    expect(plan.mode).toBe('merge');
    expect(plan.payload).toEqual({ transportPlanning: { busAssign: { a: 1 } } });
  });

  it('uses event merger for full event snapshots', () => {
    const prev = { id: 'e1', name: 'Old', eventType: 'Campa', locations: ['A'] };
    const cur = { id: 'e1', name: 'New', eventType: 'Campa', locations: ['A', 'B'] };
    const plan = planRevertUpdateWrite(prev, 'app_events', cur, 'e1', (p, c, id) => ({
      ...p,
      locations: [...new Set([...(p.locations || []), ...(c.locations || [])])],
      id,
    }));
    expect(plan.mode).toBe('replace');
    expect(plan.payload.locations).toEqual(['A', 'B']);
    expect(plan.payload.name).toBe('Old');
  });

  it('replaces full participant snapshots', () => {
    const prev = { id: 'p1', eventId: 'e1', name: 'Ana', paid: 50 };
    const plan = planRevertUpdateWrite(prev, 'app_participants', { ...prev, paid: 100 }, 'p1');
    expect(plan).toEqual({ mode: 'replace', payload: prev });
  });
});
