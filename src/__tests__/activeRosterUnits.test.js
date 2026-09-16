import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  updateEventActiveRosterTotalFromWrite,
  recomputeEventActiveRosterTotal,
} = require('../../functions/activeRosterUnits.cjs');

function makeDb({ event, participants }) {
  const state = {
    event: { ...(event || {}) },
    participants: [...(participants || [])],
    incrementCalls: [],
  };

  const evRef = {
    async get() {
      return {
        exists: true,
        data: () => ({ ...state.event }),
      };
    },
    async update(patch) {
      Object.assign(state.event, patch);
    },
    async set(patch) {
      if (patch && typeof patch === 'object' && patch.activeRosterUnitsTotal != null) {
        state.incrementCalls.push(patch.activeRosterUnitsTotal);
      }
      Object.assign(state.event, patch);
    },
  };

  const db = {
    collection(name) {
      if (name === 'app_events') {
        return {
          doc() {
            return evRef;
          },
        };
      }
      if (name === 'app_participants') {
        return {
          where(field, _op, value) {
            return {
              async get() {
                const docs = state.participants
                  .filter((p) => String(p[field] || '') === String(value))
                  .map((p) => ({
                    id: p.id,
                    data: () => {
                      const { id: _id, ...rest } = p;
                      return rest;
                    },
                  }));
                return { docs };
              },
            };
          },
        };
      }
      throw new Error(`unexpected collection ${name}`);
    },
    async runTransaction(fn) {
      const tx = {
        async get(ref) {
          return ref.get();
        },
        update(ref, patch) {
          return ref.update(patch);
        },
      };
      await fn(tx);
    },
  };

  return { db, state };
}

describe('updateEventActiveRosterTotalFromWrite', () => {
  it('Bautizos: espera el recálculo y escribe titular + acompañante canónico', async () => {
    const { db, state } = makeDb({
      event: {
        eventType: 'Bautizos',
        locations: ['Norte'],
        activeRosterUnitsTotal: 0,
      },
      participants: [
        {
          id: 't1',
          eventId: 'ev_bz',
          status: 'active',
          location: 'Norte',
          name: 'Titular',
          bautizosAttendanceType: 'bautizado',
          bautizosCompanions: [{ id: 'c1', name: 'Acompañante', willBeBaptized: 'No' }],
        },
      ],
    });

    await updateEventActiveRosterTotalFromWrite(
      db,
      'ev_bz',
      null,
      { eventId: 'ev_bz', status: 'active', location: 'Norte' }
    );

    expect(state.event.activeRosterUnitsTotal).toBe(2);
    expect(state.event.activeRosterUnitsComputedAt).toBeGreaterThan(0);
    expect(state.incrementCalls).toHaveLength(0);
  });

  it('un recálculo más viejo no pisa un total más reciente', async () => {
    const { db, state } = makeDb({
      event: {
        eventType: 'Bautizos',
        locations: ['Norte'],
        activeRosterUnitsTotal: 2,
        activeRosterUnitsComputedAt: 5_000,
      },
      participants: [
        {
          id: 't1',
          eventId: 'ev_bz',
          status: 'active',
          location: 'Norte',
          name: 'Titular',
          bautizosAttendanceType: 'bautizado',
          bautizosCompanions: [],
        },
      ],
    });

    await recomputeEventActiveRosterTotal(db, 'ev_bz', 1_000);

    expect(state.event.activeRosterUnitsTotal).toBe(2);
    expect(state.event.activeRosterUnitsComputedAt).toBe(5_000);
  });

  it('Campa: aplica incremento y no recálculo completo', async () => {
    const { db, state } = makeDb({
      event: {
        eventType: 'Campa',
        locations: ['Norte'],
        activeRosterUnitsTotal: 4,
      },
      participants: [],
    });

    await updateEventActiveRosterTotalFromWrite(
      db,
      'ev_campa',
      null,
      { eventId: 'ev_campa', status: 'active', location: 'Norte', isServer: 'No' }
    );

    expect(state.incrementCalls).toHaveLength(1);
  });
});
