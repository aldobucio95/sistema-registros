import { describe, expect, it } from 'vitest';
import { clearCompanionWaitlistFlags } from '../bautizosCompanionWaitlist.js';
import {
  BAUTIZOS_ATTENDANCE,
  bautizosAttendanceCombinationLabel,
  bautizosAttendanceOptionDisabled,
  bautizosCompanionParticipatesAsServer,
  bautizosDashboardCompanionCountsForScope,
  bautizosDashboardTitularCountsForScope,
  bautizosParticipatesAsServer,
  bautizosShowsCompanionServerParticipation,
  buildActiveRegistrantMetaForCompanionDedupe,
  buildBautizosCanonicalCompanionPlan,
  collectBautizosParticipatingServerRows,
  collectBautizosServidoresYEmpleadosRows,
  countBautizosServidoresYEmpleadosPeople,
  countBautizosServersDeduped,
  getBautizosAttendanceTypeLabel,
  isFreeBautizosAttendance,
  syncBautizosAttendanceServerFields,
  bautizosShowsServerProfileFields,
} from '../bautizosParty.js';
import { prepareBautizosRowsForRosterFilter } from '../rosterParticipantFilters.js';

describe('bautizos server participation', () => {
  it('host servidor + companions without flag: only host in servidor scope', () => {
    const host = {
      id: 'h1',
      name: 'Ana Servidor',
      bautizosAttendanceType: BAUTIZOS_ATTENDANCE.servidor,
      isServer: 'Si',
      bautizosCompanions: [
        { id: 'c1', name: 'Hijo Uno', relationship: 'Hijo', isServer: 'No' },
        { id: 'c2', name: 'Hijo Dos', relationship: 'Hijo', isServer: 'No' },
      ],
    };
    expect(bautizosDashboardTitularCountsForScope(host, BAUTIZOS_ATTENDANCE.servidor)).toBe(true);
    expect(bautizosDashboardCompanionCountsForScope(host.bautizosCompanions[0], BAUTIZOS_ATTENDANCE.servidor, host)).toBe(
      false
    );
    expect(bautizosDashboardCompanionCountsForScope(host.bautizosCompanions[1], BAUTIZOS_ATTENDANCE.servidor, host)).toBe(
      false
    );
  });

  it('companion marked servidor enters servidor scope and remains companion', () => {
    const host = {
      id: 'h2',
      name: 'Titular',
      bautizosAttendanceType: BAUTIZOS_ATTENDANCE.bautizado,
      bautizosCompanions: [{ id: 'c1', name: 'Tío Server', relationship: 'Tío', isServer: 'Si', willBeBaptized: 'No' }],
    };
    const comp = host.bautizosCompanions[0];
    expect(bautizosCompanionParticipatesAsServer(comp)).toBe(true);
    expect(bautizosDashboardCompanionCountsForScope(comp, BAUTIZOS_ATTENDANCE.servidor, host)).toBe(true);
    expect(bautizosDashboardCompanionCountsForScope(comp, 'companions', host)).toBe(true);
  });

  it('cortesía + isServer: free attendance and participates as server', () => {
    const person = syncBautizosAttendanceServerFields({
      bautizosAttendanceType: BAUTIZOS_ATTENDANCE.cortesia,
      isServer: 'Si',
    });
    expect(isFreeBautizosAttendance(person)).toBe(true);
    expect(bautizosParticipatesAsServer(person)).toBe(true);
    expect(getBautizosAttendanceTypeLabel(person)).toBe('Cortesía · Servidor');
  });

  it('dedupes titular servidor linked as companion elsewhere', () => {
    const roster = [
      {
        id: 'p1',
        name: 'Mismo Server',
        bautizosAttendanceType: BAUTIZOS_ATTENDANCE.servidor,
        isServer: 'Si',
        bautizosCompanions: [],
      },
      {
        id: 'p2',
        name: 'Otro Titular',
        bautizosAttendanceType: BAUTIZOS_ATTENDANCE.bautizado,
        bautizosCompanions: [
          {
            id: 'c1',
            name: 'Mismo Server',
            relationship: 'Hermano',
            linkedCompanionSourceKey: 'p:p1',
            isServer: 'Si',
          },
        ],
      },
    ];
    const meta = buildActiveRegistrantMetaForCompanionDedupe(roster);
    const plan = buildBautizosCanonicalCompanionPlan(roster, meta, { includeBaptizedCompanions: true });
    expect(countBautizosServersDeduped(roster, plan)).toBe(1);
  });

  it('empleado with isServer No is empleado only, not servidor', () => {
    const person = syncBautizosAttendanceServerFields({
      bautizosAttendanceType: BAUTIZOS_ATTENDANCE.empleado,
      isServer: 'No',
    });
    expect(bautizosParticipatesAsServer(person)).toBe(false);
    expect(bautizosDashboardTitularCountsForScope(person, BAUTIZOS_ATTENDANCE.empleado)).toBe(true);
    expect(bautizosDashboardTitularCountsForScope(person, BAUTIZOS_ATTENDANCE.servidor)).toBe(false);
  });

  it('empleado with isServer Si counts in both empleado and servidor dashboard scopes', () => {
    const person = syncBautizosAttendanceServerFields({
      bautizosAttendanceType: BAUTIZOS_ATTENDANCE.empleado,
      isServer: 'Si',
    });
    expect(bautizosDashboardTitularCountsForScope(person, BAUTIZOS_ATTENDANCE.empleado)).toBe(true);
    expect(bautizosDashboardTitularCountsForScope(person, BAUTIZOS_ATTENDANCE.servidor)).toBe(true);
  });

  it('collectBautizosServidoresYEmpleadosRows includes empleado without servidor flag', () => {
    const roster = [
      {
        id: 'e1',
        name: 'Empleado Sin Servidor',
        bautizosAttendanceType: BAUTIZOS_ATTENDANCE.empleado,
        isServer: 'No',
        preferredServeArea: 'Cocina',
      },
      {
        id: 'b1',
        name: 'Bautizado Server',
        bautizosAttendanceType: BAUTIZOS_ATTENDANCE.bautizado,
        isServer: 'Si',
      },
    ];
    const rows = collectBautizosServidoresYEmpleadosRows(roster);
    expect(rows.map((r) => r.name).sort()).toEqual(['Bautizado Server', 'Empleado Sin Servidor']);
  });

  it('countBautizosServidoresYEmpleadosPeople matches collect rows length and exceeds servidor-only dedupe when empleado sin rol', () => {
    const roster = [
      {
        id: 'e1',
        name: 'Empleado Sin Servidor',
        bautizosAttendanceType: BAUTIZOS_ATTENDANCE.empleado,
        isServer: 'No',
      },
      {
        id: 's1',
        name: 'Servidor',
        bautizosAttendanceType: BAUTIZOS_ATTENDANCE.servidor,
        isServer: 'Si',
      },
    ];
    const rows = collectBautizosServidoresYEmpleadosRows(roster);
    const meta = buildActiveRegistrantMetaForCompanionDedupe(roster);
    const plan = buildBautizosCanonicalCompanionPlan(roster, meta, { includeBaptizedCompanions: true });
    expect(countBautizosServidoresYEmpleadosPeople(roster)).toBe(rows.length);
    expect(countBautizosServidoresYEmpleadosPeople(roster)).toBe(2);
    expect(countBautizosServersDeduped(roster, plan)).toBe(1);
  });

  it('bautizosShowsServerProfileFields for empleado even when isServer is No', () => {
    const person = {
      bautizosAttendanceType: BAUTIZOS_ATTENDANCE.empleado,
      isServer: 'No',
    };
    expect(bautizosShowsServerProfileFields(person)).toBe(true);
  });

  it('collectBautizosParticipatingServerRows excludes non-server companions of servidor titular', () => {
    const roster = [
      {
        id: 'h1',
        name: 'Ana Servidor',
        bautizosAttendanceType: BAUTIZOS_ATTENDANCE.servidor,
        isServer: 'Si',
        bautizosCompanions: [
          { id: 'c1', name: 'Hijo Uno', relationship: 'Hijo', isServer: 'No' },
          { id: 'c2', name: 'Tío Server', relationship: 'Tío', isServer: 'Si' },
        ],
      },
    ];
    const rows = collectBautizosParticipatingServerRows(roster);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.name).sort()).toEqual(['Ana Servidor', 'Tío Server']);
  });

  it('companion expansion would add non-server companions; servidores view must skip expansion', () => {
    const roster = [
      {
        id: 'h1',
        name: 'Ana Servidor',
        status: 'active',
        bautizosAttendanceType: BAUTIZOS_ATTENDANCE.servidor,
        isServer: 'Si',
        bautizosCompanions: [{ id: 'c1', name: 'Hijo Uno', relationship: 'Hijo', isServer: 'No' }],
      },
    ];
    const basePool = collectBautizosParticipatingServerRows(roster);
    expect(basePool).toHaveLength(1);
    const expanded = prepareBautizosRowsForRosterFilter(basePool, { filterRegistrationStatus: 'active' }, {
      roster,
    });
    expect(expanded.some((r) => r.name === 'Hijo Uno')).toBe(true);
    const servidorRows = expanded.filter((p) => bautizosParticipatesAsServer(p));
    expect(servidorRows).toHaveLength(1);
    expect(servidorRows[0].name).toBe('Ana Servidor');
  });

  it('bautizosShowsCompanionServerParticipation is true for companionWaitlistPending', () => {
    expect(
      bautizosShowsCompanionServerParticipation({
        id: 'c1',
        name: 'En espera',
        companionWaitlistPending: true,
      })
    ).toBe(true);
  });

  it('waitlist companion with isServer does not count until promoted', () => {
    const roster = [
      {
        id: 'h1',
        name: 'Titular',
        status: 'active',
        bautizosAttendanceType: BAUTIZOS_ATTENDANCE.bautizado,
        bautizosCompanions: [
          {
            id: 'c1',
            name: 'Server en espera',
            relationship: 'Hermano',
            isServer: 'Si',
            companionWaitlistPending: true,
          },
        ],
      },
    ];
    const meta = buildActiveRegistrantMetaForCompanionDedupe(roster);
    const plan = buildBautizosCanonicalCompanionPlan(roster, meta, { includeBaptizedCompanions: true });
    expect(collectBautizosParticipatingServerRows(roster)).toHaveLength(0);
    expect(countBautizosServersDeduped(roster, plan)).toBe(0);

    const promoted = {
      ...roster[0],
      bautizosCompanions: [clearCompanionWaitlistFlags(roster[0].bautizosCompanions[0])],
    };
    const rosterAfter = [promoted];
    const metaAfter = buildActiveRegistrantMetaForCompanionDedupe(rosterAfter);
    const planAfter = buildBautizosCanonicalCompanionPlan(rosterAfter, metaAfter, {
      includeBaptizedCompanions: true,
    });
    expect(collectBautizosParticipatingServerRows(rosterAfter)).toHaveLength(1);
    expect(collectBautizosParticipatingServerRows(rosterAfter)[0].name).toBe('Server en espera');
    expect(countBautizosServersDeduped(rosterAfter, planAfter)).toBe(1);
  });

  it('getBautizosAttendanceTypeLabel shows servidor for waitlist virtual companion row', () => {
    expect(
      getBautizosAttendanceTypeLabel({
        _isCompanionWaitlistVirtual: true,
        isServer: 'Si',
      })
    ).toBe('Acompañante · Servidor');
  });

  it('blocks pastor attendance when servidor flag is active on non-empleado types', () => {
    const entry = {
      bautizosAttendanceType: BAUTIZOS_ATTENDANCE.bautizado,
      isServer: 'Si',
    };
    expect(bautizosAttendanceOptionDisabled(BAUTIZOS_ATTENDANCE.pastor, entry)).toBe(true);
    expect(bautizosAttendanceCombinationLabel(entry)).toBe('Bautizado · participa como servidor');
  });
});
