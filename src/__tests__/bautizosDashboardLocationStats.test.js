import { describe, expect, it } from 'vitest';
import {
  countBautizosDashboardPeople,
  buildBautizosDashboardCanonicalCompanionPlan,
  buildActiveRegistrantMetaForCompanionDedupe,
  buildBautizosCompanionListFilterPersonLike,
} from '../bautizosParty.js';
import {
  computeBautizosDashboardLocationPersonStats,
  countBautizosEventWideFilteredPeople,
} from '../bautizosDashboardLocationStats.js';
import { isRosterPersonLiquidadoForListFilter } from '../publicRegistrationLogic.js';
import {
  applyLiquidationListFilters,
  prepareBautizosRowsForRosterFilter,
} from '../rosterParticipantFilters.js';

describe('computeBautizosDashboardLocationPersonStats', () => {
  it('sums per-location counts to event total (titular + canonical companions)', () => {
    const hostA = {
      id: 'hA',
      eventId: 'ev1',
      location: 'Norte',
      status: 'active',
      name: 'Host Norte',
      bautizosAttendanceType: 'Bautizado',
      bautizosCompanions: [{ id: 'c1', name: 'Acomp Norte' }],
    };
    const hostB = {
      id: 'hB',
      eventId: 'ev1',
      location: 'Sur',
      status: 'active',
      name: 'Host Sur',
      bautizosAttendanceType: 'Asistente',
      bautizosCompanions: [{ id: 'c2', name: 'Acomp Sur', willBeBaptized: 'Si' }],
    };
    const roster = [hostA, hostB];
    const plan = buildBautizosDashboardCanonicalCompanionPlan(roster, {
      includeBaptizedCompanions: true,
    });
    const norte = computeBautizosDashboardLocationPersonStats({
      activeTitularRows: [hostA],
      loc: 'Norte',
      dashboardScope: 'all',
      canonicalCompanionPlan: plan,
    });
    const sur = computeBautizosDashboardLocationPersonStats({
      activeTitularRows: [hostB],
      loc: 'Sur',
      dashboardScope: 'all',
      canonicalCompanionPlan: plan,
    });
    expect(norte.count).toBe(2);
    expect(sur.count).toBe(2);
    expect(norte.count + sur.count).toBe(
      countBautizosDashboardPeople(roster, [...plan.values()], 'all')
    );
  });

  it('bautizados counts titular tipo bautizado and baptized companion only once each', () => {
    const host = {
      id: 'h1',
      eventId: 'ev1',
      location: 'Norte',
      status: 'active',
      name: 'Titular',
      bautizosAttendanceType: 'Asistente',
      bautizosCompanions: [
        { id: 'c1', name: 'Se bautiza', willBeBaptized: 'Si' },
        { id: 'c2', name: 'Solo acompaña' },
      ],
    };
    const plan = buildBautizosDashboardCanonicalCompanionPlan([host], {
      includeBaptizedCompanions: true,
    });
    const stats = computeBautizosDashboardLocationPersonStats({
      activeTitularRows: [host],
      loc: 'Norte',
      dashboardScope: 'all',
      canonicalCompanionPlan: plan,
    });
    expect(stats.bautizados).toBe(1);
    expect(stats.companions).toBe(1);
    expect(stats.count).toBe(3);
  });

  it('per-person transport filter excludes car companion when titular uses evento transport', () => {
    const host = {
      id: 'h1',
      eventId: 'ev1',
      location: 'Norte',
      status: 'active',
      name: 'Titular Evento',
      wantsBautizosTransport: 'Si',
      llegaEnCarro: 'No',
      bautizosCompanions: [
        {
          id: 'c1',
          name: 'Acomp Carro',
          wantsBautizosTransport: 'No',
          llegaEnCarro: 'Si',
        },
      ],
    };
    const plan = buildBautizosDashboardCanonicalCompanionPlan([host], {
      includeBaptizedCompanions: true,
    });
    const matchesEvento = (person) => {
      const car = String(person?.llegaEnCarro || '').toLowerCase().startsWith('s');
      return String(person?.wantsBautizosTransport || '').toLowerCase().startsWith('s') && !car;
    };
    const stats = computeBautizosDashboardLocationPersonStats({
      activeTitularRows: [host],
      loc: 'Norte',
      dashboardScope: 'all',
      canonicalCompanionPlan: plan,
      matchesPerson: matchesEvento,
    });
    expect(stats.count).toBe(1);
    expect(stats.bautizosTransport).toBe(1);
    expect(stats.bautizosCarro).toBe(0);
  });

  it('dedupes participating servers across titular and companion', () => {
    const host = {
      id: 'h1',
      location: 'Norte',
      status: 'active',
      name: 'Servidor',
      bautizosAttendanceType: 'Servidor',
      bautizosCompanions: [{ id: 'c1', name: 'También servidor', isServer: 'Si' }],
    };
    const plan = buildBautizosDashboardCanonicalCompanionPlan([host], {
      includeBaptizedCompanions: true,
    });
    const stats = computeBautizosDashboardLocationPersonStats({
      activeTitularRows: [host],
      loc: 'Norte',
      canonicalCompanionPlan: plan,
    });
    expect(stats.servers).toBe(2);
  });

  it('counts courtesy companions in cortesia total', () => {
    const host = {
      id: 'h1',
      eventId: 'ev1',
      location: 'Norte',
      status: 'active',
      name: 'Empleado',
      bautizosAttendanceType: 'Empleado',
      bautizosCompanions: [
        { id: 'c1', name: 'Acomp Cortesia', relationship: 'Esposa', bautizosAttendanceType: 'cortesia' },
        { id: 'c2', name: 'Acomp Normal', relationship: 'Hijo' },
      ],
    };
    const plan = buildBautizosDashboardCanonicalCompanionPlan([host], {
      includeBaptizedCompanions: true,
    });
    const stats = computeBautizosDashboardLocationPersonStats({
      activeTitularRows: [host],
      loc: 'Norte',
      dashboardScope: 'all',
      canonicalCompanionPlan: plan,
    });
    expect(stats.cortesia).toBe(2);
    expect(stats.companions).toBe(2);
  });

  it('counts pastor titular and companions in cortesia total', () => {
    const host = {
      id: 'h1',
      eventId: 'ev1',
      location: 'Norte',
      status: 'active',
      name: 'Pastor',
      bautizosAttendanceType: 'pastor',
      bautizosCompanions: [
        { id: 'c1', name: 'Esposa', relationship: 'Esposa' },
        { id: 'c2', name: 'Hijo', relationship: 'Hijo' },
      ],
    };
    const plan = buildBautizosDashboardCanonicalCompanionPlan([host], {
      includeBaptizedCompanions: true,
    });
    const stats = computeBautizosDashboardLocationPersonStats({
      activeTitularRows: [host],
      loc: 'Norte',
      dashboardScope: 'all',
      canonicalCompanionPlan: plan,
    });
    expect(stats.cortesia).toBe(3);
  });

  it('countBautizosEventWideFilteredPeople matches per-location stats for Activos+Liquidados', () => {
    const event = { id: 'ev1', eventType: 'Bautizos', bautizosListPriceFood: 100, bautizosListPriceTransport: 50 };
    const host = {
      id: 'h1',
      eventId: 'ev1',
      location: 'Norte',
      status: 'active',
      name: 'Titular',
      bautizosAttendanceType: 'Bautizado',
      wantsBautizosTransport: 'Si',
      bautizosCompanions: [
        { id: 'c1', name: 'Acomp 1', wantsBautizosTransport: 'Si' },
        { id: 'c2', name: 'Acomp 2', wantsBautizosTransport: 'Si' },
      ],
      paid: 300,
    };
    const roster = [host];
    const meta = buildActiveRegistrantMetaForCompanionDedupe(roster);
    const financeOpts = {
      companionDedupeMeta: meta,
      roster,
      getLiquidationTargetFn: () => 450,
      getPaidGrossFromHostFn: () => 300,
      getPaidDisplayFn: (p) => Number(p?.paid || 0) || 0,
    };
    const bautizosLiquidationCtx = {
      eventType: 'Bautizos',
      event,
      financeOpts,
      resolveHost: (p) =>
        roster.find((r) => String(r.id) === String(p?.__hostRegistrantId || '')) || host,
    };
    const filters = {
      filterRegistrationStatus: 'active',
      filterLiquidation: 'liquidado',
      searchTerm: '',
      sortBy: 'none',
    };
    const filterParticipantRowsFn = (rows, _preserveOrder, f, opts = {}) => {
      let processed = [...rows];
      if (f.filterRegistrationStatus === 'active') {
        processed = processed.filter(
          (p) => (p?.status || 'active') === 'active' || p.__globalRegistryCompanionRow
        );
      }
      if (opts.expandBautizosCompanions) {
        processed = prepareBautizosRowsForRosterFilter(processed, f, { roster });
        processed = applyLiquidationListFilters(processed, f, {
          getLiquidationTarget: () => 450,
          bautizosLiquidationCtx,
        });
      } else if (f.filterLiquidation === 'liquidado') {
        processed = processed.filter((p) =>
          isRosterPersonLiquidadoForListFilter(p, () => 450, bautizosLiquidationCtx)
        );
      }
      return processed;
    };
    const data = { Norte: [host] };
    const plan = buildBautizosDashboardCanonicalCompanionPlan(roster, { includeBaptizedCompanions: true });
    const tableCount = computeBautizosDashboardLocationPersonStats({
      activeTitularRows: [host],
      loc: 'Norte',
      canonicalCompanionPlan: plan,
      matchesPerson: (person) =>
        filterParticipantRowsFn([person], true, filters, { expandBautizosCompanions: false }).length > 0,
      event,
    }).count;
    const unifiedCount = countBautizosEventWideFilteredPeople({
      dashboardLocs: ['Norte'],
      data,
      waitlistData: {},
      cancelledData: {},
      filters,
      filterParticipantRowsFn,
      canonicalCompanionPlan: plan,
      event,
      allParticipants: roster,
    });
    const expandedLiquidado = filterParticipantRowsFn([host], true, filters, {
      expandBautizosCompanions: true,
    }).length;
    expect(tableCount).toBe(1);
    expect(unifiedCount).toBe(tableCount);
    expect(expandedLiquidado).toBe(tableCount);
    const preFixTitularLiquidation = [host].filter((p) =>
      isRosterPersonLiquidadoForListFilter(p, () => 450, bautizosLiquidationCtx)
    );
    expect(preFixTitularLiquidation).toHaveLength(0);
    const comp1Line = buildBautizosCompanionListFilterPersonLike(host, host.bautizosCompanions[0], 0);
    const comp2Line = buildBautizosCompanionListFilterPersonLike(host, host.bautizosCompanions[1], 1);
    expect(isRosterPersonLiquidadoForListFilter(host, () => 450, bautizosLiquidationCtx)).toBe(false);
    expect(isRosterPersonLiquidadoForListFilter(comp1Line, () => 450, bautizosLiquidationCtx)).toBe(true);
    expect(isRosterPersonLiquidadoForListFilter(comp2Line, () => 450, bautizosLiquidationCtx)).toBe(false);
  });
});
