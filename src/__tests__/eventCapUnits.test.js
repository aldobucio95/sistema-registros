import { describe, expect, it } from 'vitest';
import {
  computePromoteFromWaitlistCapUnits,
  wouldIncomingUnitsExceedCap,
} from '../eventCapUnits.js';

describe('wouldIncomingUnitsExceedCap', () => {
  it('sede: bloquea promover un partido de 3 con 2 lugares libres', () => {
    expect(
      wouldIncomingUnitsExceedCap({
        globalCap: 0,
        globalUsed: 0,
        locCap: 20,
        locUsed: 18,
        incomingUnits: 3,
      })
    ).toBe(true);
  });

  it('sede: permite promover 1 unidad si queda 1 lugar', () => {
    expect(
      wouldIncomingUnitsExceedCap({
        globalCap: 0,
        globalUsed: 0,
        locCap: 20,
        locUsed: 19,
        incomingUnits: 1,
      })
    ).toBe(false);
  });

  it('sede: is-already-full no basta — 9/10 con Ambos ×2 debe bloquear', () => {
    expect(
      wouldIncomingUnitsExceedCap({
        globalCap: 0,
        globalUsed: 0,
        locCap: 10,
        locUsed: 9,
        incomingUnits: 2,
      })
    ).toBe(true);
  });

  it('cupo global tiene prioridad sobre sede', () => {
    expect(
      wouldIncomingUnitsExceedCap({
        globalCap: 50,
        globalUsed: 49,
        locCap: 100,
        locUsed: 10,
        incomingUnits: 2,
      })
    ).toBe(true);
  });

  it('sin cupos configurados no bloquea', () => {
    expect(
      wouldIncomingUnitsExceedCap({
        globalCap: 0,
        globalUsed: 99,
        locCap: 0,
        locUsed: 99,
        incomingUnits: 5,
      })
    ).toBe(false);
  });
});

describe('computePromoteFromWaitlistCapUnits', () => {
  it('Campa servidor Ambos cuenta ×2 al promover', () => {
    const eventRow = {
      id: 'evt_campa',
      eventType: 'Campa',
      locations: ['Norte'],
    };
    const waitlistPerson = {
      id: 'wl-ambos',
      eventId: 'evt_campa',
      status: 'waitlist',
      location: 'Norte',
      isServer: 'Si',
      serverAssignment: 'Ambos',
    };
    const roster = [
      {
        id: 'a1',
        eventId: 'evt_campa',
        status: 'active',
        location: 'Norte',
        isServer: 'No',
      },
    ];
    expect(computePromoteFromWaitlistCapUnits(waitlistPerson, roster, eventRow, 'Norte')).toBe(2);
  });

  it('Bautizos titular con acompañante consume 2 unidades al promover', () => {
    const eventRow = {
      id: 'evt_baut',
      eventType: 'Bautizos',
      locations: ['Norte'],
    };
    const waitlistPerson = {
      id: 'wl-host',
      eventId: 'evt_baut',
      status: 'waitlist',
      location: 'Norte',
      bautizosAttendanceType: 'bautizado',
      bautizosCompanions: [
        { id: 'c1', name: 'Acompañante', relationship: 'Esposa', willBeBaptized: 'No' },
      ],
    };
    const roster = [
      {
        id: 'a1',
        eventId: 'evt_baut',
        status: 'active',
        location: 'Norte',
        bautizosAttendanceType: 'bautizado',
        bautizosCompanions: [],
      },
    ];
    expect(computePromoteFromWaitlistCapUnits(waitlistPerson, roster, eventRow, 'Norte')).toBe(2);
  });
});
