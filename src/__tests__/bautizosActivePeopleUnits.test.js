import { describe, expect, it } from 'vitest';
import {
  buildBautizosDashboardCanonicalCompanionPlan,
  countBautizosActivePeopleUnits,
  countBautizosDashboardPeople,
} from '../bautizosParty.js';

describe('countBautizosActivePeopleUnits', () => {
  it('matches countBautizosDashboardPeople for titulares + canónicos', () => {
    const host = {
      id: 'h1',
      status: 'active',
      name: 'Titular',
      bautizosAttendanceType: 'Bautizado',
      bautizosCompanions: [{ id: 'c1', name: 'Acomp' }],
    };
    const plan = buildBautizosDashboardCanonicalCompanionPlan([host]);
    const viaDashboard = countBautizosDashboardPeople([host], [...plan.values()], 'all');
    expect(countBautizosActivePeopleUnits([host])).toBe(viaDashboard);
    expect(countBautizosActivePeopleUnits([host])).toBe(2);
  });

  it('excludes companionWaitlistPending from units', () => {
    const host = {
      id: 'h1',
      status: 'active',
      name: 'Titular',
      bautizosAttendanceType: 'Bautizado',
      bautizosCompanions: [
        { id: 'c1', name: 'Acomp Activo' },
        { id: 'c2', name: 'Acomp WL', companionWaitlistPending: true },
      ],
    };
    expect(countBautizosActivePeopleUnits([host])).toBe(2);
  });
});
