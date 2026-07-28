import { describe, expect, it, vi } from 'vitest';
import { persistEventCarMetaPatches } from '../bautizosCarMeta.js';

function makeLivePlan() {
  return {
    defaultBusCap: 40,
    unitsByLocation: {
      Centro: [{ id: 'bus-1', label: 'Camión 1', capacity: 40 }],
    },
    busAssign: { 'p:host-1': 'bus-1' },
    carGroups: [{ id: 'g1', memberKeys: ['p:host-1'], cars: 1 }],
    familyCarOverride: {},
    bautizosGroupTitularByGroupId: {},
    carMetaBySource: {
      'p:other|c1': {
        brand: 'Toyota',
        model: 'Corolla',
        color: 'Blanco',
        plates: 'ABC-123',
      },
    },
    campaAmbosTransitBySource: {},
    transportAttendanceBySource: { 'p:host-1': { confirmed: true, confirmedAt: '1', confirmedBy: 'admin' } },
  };
}

describe('persistEventCarMetaPatches', () => {
  it('no pisa el plan vivo cuando currentPlan viene vacío (snapshot QR público)', async () => {
    const livePlan = makeLivePlan();
    const written = [];
    const getDocRef = (col, id) => ({ col, id });
    const getDoc = vi.fn(async () => ({
      exists: () => true,
      data: () => ({ transportPlanning: livePlan }),
    }));
    const updateDoc = vi.fn(async (_ref, payload) => {
      written.push(payload);
    });

    const next = await persistEventCarMetaPatches({
      eventId: 'evt-1',
      patches: [
        {
          vehicleKey: 'p:new-host|c1',
          patch: { brand: 'Nissan', model: 'Versa', color: 'Rojo', plates: 'XYZ-9' },
        },
      ],
      // Igual que eventSnapshot del QR: sin transportPlanning
      currentPlan: undefined,
      getDocRef,
      updateDoc,
      getDoc,
    });

    expect(getDoc).toHaveBeenCalledTimes(1);
    expect(updateDoc).toHaveBeenCalledTimes(1);
    const saved = written[0].transportPlanning;
    expect(saved.unitsByLocation.Centro[0].id).toBe('bus-1');
    expect(saved.busAssign['p:host-1']).toBe('bus-1');
    expect(saved.carGroups).toHaveLength(1);
    expect(saved.transportAttendanceBySource['p:host-1'].confirmed).toBe(true);
    expect(saved.carMetaBySource['p:other|c1'].plates).toBe('ABC-123');
    expect(saved.carMetaBySource['p:new-host|c1'].brand).toBe('Nissan');
    expect(next.carMetaBySource['p:new-host|c1'].brand).toBe('Nissan');
  });

  it('sin getDoc y sin currentPlan no escribe (evita plan vacío destructivo)', async () => {
    const updateDoc = vi.fn();
    const next = await persistEventCarMetaPatches({
      eventId: 'evt-1',
      patches: [{ vehicleKey: 'p:x|c1', patch: { brand: 'X' } }],
      currentPlan: undefined,
      getDocRef: (col, id) => ({ col, id }),
      updateDoc,
    });
    expect(updateDoc).not.toHaveBeenCalled();
    expect(next.unitsByLocation).toEqual({});
    expect(next.busAssign).toEqual({});
  });

  it('si getDoc falla y currentPlan es null, no escribe', async () => {
    const updateDoc = vi.fn();
    const next = await persistEventCarMetaPatches({
      eventId: 'evt-1',
      patches: [{ vehicleKey: 'p:x|c1', patch: { brand: 'X' } }],
      currentPlan: null,
      getDocRef: (col, id) => ({ col, id }),
      updateDoc,
      getDoc: vi.fn(async () => {
        throw new Error('offline');
      }),
    });
    expect(updateDoc).not.toHaveBeenCalled();
    expect(next.busAssign).toEqual({});
  });

  it('mezcla sobre currentPlan cuando getDoc no está disponible pero sí hay plan', async () => {
    const written = [];
    const currentPlan = makeLivePlan();
    await persistEventCarMetaPatches({
      eventId: 'evt-1',
      patches: [{ vehicleKey: 'p:staff|c1', patch: { brand: 'Honda', plates: 'STAFF-1' } }],
      currentPlan,
      getDocRef: (col, id) => ({ col, id }),
      updateDoc: async (_ref, payload) => {
        written.push(payload);
      },
    });
    expect(written).toHaveLength(1);
    expect(written[0].transportPlanning.unitsByLocation.Centro[0].id).toBe('bus-1');
    expect(written[0].transportPlanning.carMetaBySource['p:staff|c1'].plates).toBe('STAFF-1');
  });
});
