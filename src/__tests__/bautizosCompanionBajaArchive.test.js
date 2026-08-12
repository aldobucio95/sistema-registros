import { describe, expect, it } from 'vitest';
import {
  planBautizosPartyCancelArchive,
  scrubSurvivorCompanionsArray,
  splitProportionalAmounts,
} from '../bautizosCompanionBajaArchive.js';

const event = {
  id: 'ev-baut',
  eventType: 'Bautizos',
  bautizosListPriceFood: 300,
  bautizosListPriceTransport: 200,
};

function makeHost() {
  return {
    id: 'host-1',
    name: 'Titular',
    status: 'active',
    location: 'Norte',
    eventId: event.id,
    paid: 500,
    paidNet: 500,
    registeredCost: 500,
    paymentHistory: [{ id: 1, amount: 500, netAmount: 500 }],
    paymentMethod: 'Efectivo',
    bautizosAttendanceType: 'bautizado',
    willBeBaptized: 'Si',
    wantsBautizosFood: 'Si',
    wantsBautizosTransport: 'Si',
    bautizosCompanions: [
      {
        id: 'comp-s',
        name: 'Acompanante Simple',
        relationship: 'Esposa',
        willBeBaptized: 'No',
        wantsBautizosTransport: 'No',
      },
      {
        id: 'link-d',
        name: 'Derivado',
        relationship: 'Hijo',
        willBeBaptized: 'Si',
        linkedRegistrantId: 'derived-1',
        linkedCompanionSourceKey: 'p:derived-1',
        linkedNoExtraCharge: true,
      },
    ],
  };
}

function makeDerived() {
  return {
    id: 'derived-1',
    name: 'Derivado',
    status: 'active',
    location: 'Norte',
    eventId: event.id,
    paid: 0,
    paidNet: 0,
    registeredCost: 300,
    paymentHistory: [],
    bautizosAttendanceType: 'bautizado',
    willBeBaptized: 'Si',
    bautizosSplitPartyHostParticipantId: 'host-1',
    bautizosCompanions: [],
  };
}

describe('splitProportionalAmounts', () => {
  it('reparte enteros en centavos', () => {
    expect(splitProportionalAmounts(100, [1, 1, 1])).toEqual([33.34, 33.33, 33.33]);
  });
});

describe('planBautizosPartyCancelArchive — baja de derivado con ancla viva', () => {
  it('no promociona acompanantes embebidos ni sobrescribe paid del titular', () => {
    const host = makeHost();
    const derived = makeDerived();
    const roster = [host, derived];

    const plan = planBautizosPartyCancelArchive({
      host: derived,
      roster,
      event,
      selectedTargetKeys: [],
      action: 'cancel_entry',
    });

    expect(plan.cancelDocIds).toEqual(['derived-1']);
    expect(plan.promotions).toEqual([]);

    const hostPatch = plan.survivorPatches.find((sp) => sp.docId === 'host-1');
    expect(hostPatch).toBeTruthy();
    expect(hostPatch.patch.paid).toBeUndefined();
    expect(hostPatch.patch.paidNet).toBeUndefined();
    expect(hostPatch.patch.bautizosSplitPartyHostParticipantId).toBeUndefined();

    const companionIds = (hostPatch.patch.bautizosCompanions || []).map((c) => c.id);
    expect(companionIds).toContain('comp-s');
    expect(companionIds).not.toContain('link-d');

    const hostPreview = plan.paymentPreview.find((p) => p.key === 'p:host-1');
    expect(hostPreview?.paidShare).toBe(500);
    expect(hostPreview?.willPromote).toBe(false);
  });

  it('al cancelar el titular promociona acompanantes y reparte su paid', () => {
    const host = makeHost();
    const derived = makeDerived();
    const roster = [host, derived];

    const plan = planBautizosPartyCancelArchive({
      host,
      roster,
      event,
      selectedTargetKeys: [],
      action: 'cancel_entry',
    });

    expect(plan.cancelDocIds).toContain('host-1');
    expect(plan.promotions.length).toBe(1);
    expect(plan.promotions[0].payload.name).toBe('Acompanante Simple');
    expect(plan.promotions[0].paid).toBe(500);

    const derivedPatch = plan.survivorPatches.find((sp) => sp.docId === 'derived-1');
    expect(derivedPatch?.patch.bautizosSplitPartyHostParticipantId).toBe(null);
    expect(derivedPatch?.patch.paid).toBeUndefined();
  });
});

describe('scrubSurvivorCompanionsArray', () => {
  it('quita stubs de docs cancelados y filas c: seleccionadas', () => {
    const comps = [
      { id: 'keep', name: 'A' },
      { id: 'drop-selected', name: 'B' },
      { id: 'link', name: 'C', linkedRegistrantId: 'x1', linkedCompanionSourceKey: 'p:x1' },
    ];
    const next = scrubSurvivorCompanionsArray(comps, {
      cancelDocIds: ['x1'],
      selectedTargetKeys: ['c:drop-selected'],
    });
    expect(next.map((c) => c.id)).toEqual(['keep']);
  });
});
