import { describe, expect, it } from 'vitest';
import {
  BAUTIZOS_ATTENDANCE,
  bautizosCompanionParticipatesAsServer,
  bautizosDashboardCompanionCountsForScope,
  bautizosDashboardTitularCountsForScope,
  bautizosParticipatesAsServer,
  buildActiveRegistrantMetaForCompanionDedupe,
  buildBautizosCanonicalCompanionPlan,
  countBautizosServersDeduped,
  getBautizosAttendanceTypeLabel,
  isFreeBautizosAttendance,
  syncBautizosAttendanceServerFields,
} from '../bautizosParty.js';

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
});
