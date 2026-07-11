import { describe, expect, it } from 'vitest';
import {
  buildFlattenedActiveRows,
  buildRosterSectionDisplayCounts,
  computeLocationRosterSheetModel,
  buildLocationRosterFinanceByPersonId,
} from '../locationRosterSheetData.js';
import { getLocationRosterSectionCountsFromSummary } from '../locationRosterTypeSummary.js';

const identityFilter = (rows) => rows;

describe('locationRosterSheetData', () => {
  it('buildFlattenedActiveRows incluye subregistros bautizados en Bautizos', () => {
    const titular = {
      id: 't1',
      name: 'Ana',
      bautizosCompanions: [
        { id: 'c1', name: 'Luis', willBeBaptized: 'Si' },
        { id: 'c2', name: '', willBeBaptized: 'Si' },
      ],
    };
    const rows = buildFlattenedActiveRows([titular], { isBautizos: true });
    expect(rows).toHaveLength(2);
    expect(rows[0].kind).toBe('main');
    expect(rows[1].kind).toBe('branch');
    expect(rows[1].branchPerson.name).toBe('Luis');
  });

  it('buildRosterSectionDisplayCounts usa resumen canónico en Bautizos', () => {
    const summary = {
      sections: [
        { id: 'active', totalInscritos: 12 },
        { id: 'waitlist', totalInscritos: 3 },
        { id: 'cancelled', totalInscritos: 1 },
      ],
    };
    const counts = buildRosterSectionDisplayCounts({
      isBautizos: true,
      locationTypeSummary: summary,
      activeParticipantsUnfiltered: [{ id: 'only-titular' }],
      waitlistUnfiltered: [],
      cancelledUnfiltered: [],
    });
    expect(counts).toEqual(getLocationRosterSectionCountsFromSummary(summary));
    expect(counts.active).toBe(12);
  });

  it('computeLocationRosterSheetModel separa conteos estables y filtrados', () => {
    const model = computeLocationRosterSheetModel({
      loc: 'Norte',
      isBautizos: false,
      activeTitulars: [{ id: 'a', name: 'Uno' }, { id: 'b', name: 'Dos' }],
      sortedWaitlist: [{ id: 'w1', name: 'Espera' }],
      sortedCancelled: [],
      applyRosterLikeFilters: (rows, _preserve, search) => {
        const q = String(search || '').trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((p) => String(p.name || '').toLowerCase().includes(q));
      },
      appliedSearch: 'uno',
      sortBy: 'registered-desc',
      filterParticipantRows: identityFilter,
    });
    expect(model.loc).toBe('Norte');
    expect(model.rosterSectionDisplayCounts.active).toBe(2);
    expect(model.rosterSectionFilteredCounts.active).toBe(1);
    expect(model.rosterSearchActive).toBe(true);
    expect(model.visibleParticipants).toHaveLength(1);
  });

  it('buildLocationRosterFinanceByPersonId cachea liquidationTarget', () => {
    const map = buildLocationRosterFinanceByPersonId(
      [{ id: 'p1', paid: 100, paymentHistory: [{ amount: 100 }] }],
      () => 250
    );
    expect(map.get('p1')).toEqual({
      liquidationTarget: 250,
      paid: 100,
      paymentHistoryLen: 1,
    });
  });
});
