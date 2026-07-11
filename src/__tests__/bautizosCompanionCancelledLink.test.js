import { describe, expect, it } from 'vitest';
import {
  buildBautizosDashboardCanonicalCompanionPlan,
  bautizosCompanionRepresentsCancelledRegistrant,
} from '../bautizosParty.js';

describe('bautizosCompanionRepresentsCancelledRegistrant', () => {
  it('detects companion linked to cancelled titular', () => {
    const cancelled = { id: 'x1', status: 'cancelled', name: 'X' };
    const byId = new Map([['x1', cancelled]]);
    const companion = {
      name: 'X',
      linkedCompanionSourceKey: 'p:x1',
      linkedRegistrantId: 'x1',
    };
    expect(bautizosCompanionRepresentsCancelledRegistrant(companion, byId)).toBe(true);
  });

  it('excludes linked-cancelled companion from dashboard canonical plan', () => {
    const cancelled = {
      id: 'x1',
      status: 'cancelled',
      name: 'X',
      location: 'Sede A',
    };
    const host = {
      id: 'h1',
      status: 'active',
      name: 'Host',
      location: 'Sede A',
      bautizosCompanions: [
        {
          id: 'c1',
          name: 'X',
          linkedCompanionSourceKey: 'p:x1',
          linkedRegistrantId: 'x1',
        },
      ],
    };
    const roster = [host, cancelled];
    const plan = buildBautizosDashboardCanonicalCompanionPlan([host], {
      linkLookupRoster: roster,
    });
    expect(plan.size).toBe(0);
  });
});
