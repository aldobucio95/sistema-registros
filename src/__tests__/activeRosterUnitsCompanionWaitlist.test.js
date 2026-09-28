import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { computeDashboardTodosRosterTotal } from '../dashboardTodosRosterTotal.js';

const require = createRequire(import.meta.url);
const { computeDashboardTodosRosterTotal: computeFromCloudFunctions } = require(
  '../../functions/lib/dashboardTodosRosterTotal.cjs'
);

const event = {
  id: 'ev-bz',
  eventType: 'Bautizos',
  locations: ['Norte'],
};

describe('activeRosterUnits Bautizos companion waitlist', () => {
  it('no cuenta acompañantes en lista de espera dentro del total activo', () => {
    const rows = [
      {
        id: 'host',
        eventId: 'ev-bz',
        status: 'active',
        location: 'Norte',
        name: 'Titular Activo',
        bautizosAttendanceType: 'bautizado',
        bautizosCompanions: [
          { id: 'c-active', name: 'Hijo Activo', willBeBaptized: 'No' },
          {
            id: 'c-wait',
            name: 'Hijo En Espera',
            willBeBaptized: 'No',
            companionWaitlistPending: true,
          },
        ],
      },
    ];

    const clientTotal = computeDashboardTodosRosterTotal(rows, event);
    const functionsTotal = computeFromCloudFunctions(rows, event);

    expect(clientTotal).toBe(2);
    expect(functionsTotal).toBe(clientTotal);
  });

  it('no trata a un asistente como bautizado al deduplicar acompañantes', () => {
    const rows = [
      {
        id: 'asist',
        eventId: 'ev-bz',
        status: 'active',
        location: 'Norte',
        name: 'Ana Lopez',
        bautizosAttendanceType: 'asistente',
        bautizosCompanions: [],
      },
      {
        id: 'host2',
        eventId: 'ev-bz',
        status: 'active',
        location: 'Norte',
        name: 'Otro Titular',
        bautizosAttendanceType: 'bautizado',
        bautizosCompanions: [
          { id: 'c-ana', name: 'Ana Lopez', willBeBaptized: 'No' },
        ],
      },
    ];

    const clientTotal = computeDashboardTodosRosterTotal(rows, event);
    const functionsTotal = computeFromCloudFunctions(rows, event);

    expect(clientTotal).toBe(3);
    expect(functionsTotal).toBe(clientTotal);
  });
});
