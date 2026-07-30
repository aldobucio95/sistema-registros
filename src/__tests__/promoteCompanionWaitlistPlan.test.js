import { describe, expect, it } from 'vitest';
import {
  COMPANION_WAITLIST_PENDING,
  planPromoteCompanionWaitlistEntry,
} from '../bautizosCompanionWaitlist.js';

describe('planPromoteCompanionWaitlistEntry', () => {
  const host = {
    id: 'host1',
    eventId: 'ev1',
    status: 'active',
    name: 'Titular',
    bautizosCompanions: [
      {
        id: 'c-wait',
        name: 'En espera',
        [COMPANION_WAITLIST_PENDING]: true,
        companionWaitlistCreatedAt: 100,
        companionWaitlistPromoteListPrice: 500,
      },
      { id: 'c-active', name: 'Activo ya', willBeBaptized: 'No' },
      {
        id: 'c-other-wait',
        name: 'Otra espera',
        [COMPANION_WAITLIST_PENDING]: true,
        companionWaitlistCreatedAt: 200,
      },
    ],
  };

  it('promueve solo el acompañante pedido y conserva el resto del arreglo vivo', () => {
    const plan = planPromoteCompanionWaitlistEntry(host, 'c-wait', 'ev1');
    expect(plan.ok).toBe(true);
    expect(plan.companion.id).toBe('c-wait');
    expect(plan.nextCompanions).toHaveLength(3);
    expect(plan.nextCompanions[0]).toMatchObject({ id: 'c-wait', name: 'En espera' });
    expect(plan.nextCompanions[0][COMPANION_WAITLIST_PENDING]).toBeUndefined();
    expect(plan.nextCompanions[0].companionWaitlistCreatedAt).toBeUndefined();
    expect(plan.nextCompanions[0].companionWaitlistPromoteListPrice).toBeUndefined();
    expect(plan.nextCompanions[1]).toEqual(host.bautizosCompanions[1]);
    expect(plan.nextCompanions[2]).toEqual(host.bautizosCompanions[2]);
  });

  it('no clobbería un acompañante agregado en un host fresco (escenario LWW)', () => {
    const freshHost = {
      ...host,
      bautizosCompanions: [
        ...host.bautizosCompanions,
        { id: 'c-new', name: 'Agregado por otra sesión' },
      ],
    };
    const staleWouldHaveDropped = host.bautizosCompanions.map((c) =>
      c.id === 'c-wait'
        ? { id: 'c-wait', name: 'En espera' }
        : c
    );
    expect(staleWouldHaveDropped.some((c) => c.id === 'c-new')).toBe(false);

    const plan = planPromoteCompanionWaitlistEntry(freshHost, 'c-wait', 'ev1');
    expect(plan.ok).toBe(true);
    expect(plan.nextCompanions.map((c) => c.id)).toEqual([
      'c-wait',
      'c-active',
      'c-other-wait',
      'c-new',
    ]);
  });

  it('rechaza host de otro evento o no activo', () => {
    expect(planPromoteCompanionWaitlistEntry({ ...host, eventId: 'ev2' }, 'c-wait', 'ev1')).toEqual({
      ok: false,
      error: 'HOST_WRONG_EVENT',
    });
    expect(planPromoteCompanionWaitlistEntry({ ...host, status: 'waitlist' }, 'c-wait', 'ev1')).toEqual({
      ok: false,
      error: 'HOST_NOT_ACTIVE',
    });
  });

  it('rechaza acompañante ausente o ya promovido', () => {
    expect(planPromoteCompanionWaitlistEntry(host, 'nope', 'ev1')).toEqual({
      ok: false,
      error: 'COMPANION_MISSING',
    });
    expect(planPromoteCompanionWaitlistEntry(host, 'c-active', 'ev1')).toEqual({
      ok: false,
      error: 'COMPANION_NOT_PENDING',
    });
  });
});
