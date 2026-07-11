import { describe, expect, it } from 'vitest';
import { computeWorkspaceSidebarBadges } from '../workspaceSidebarBadgesCompute.js';
import { computeDashboardTodosRosterTotal } from '../dashboardTodosRosterTotal.js';

describe('computeWorkspaceSidebarBadges (Bautizos)', () => {
  const event = { id: 'ev1', eventType: 'Bautizos', locations: ['Norte', 'Sur'] };

  it('activeTotalDeduped matches computeDashboardTodosRosterTotal for full scope', () => {
    const allParticipants = [
      {
        id: 't1',
        eventId: 'ev1',
        status: 'active',
        location: 'Norte',
        name: 'Titular',
        bautizosAttendanceType: 'bautizado',
        bautizosCompanions: [{ id: 'c1', name: 'Acomp' }],
      },
      {
        id: 't2',
        eventId: 'ev1',
        status: 'active',
        location: 'Sur',
        name: 'Titular Sur',
        bautizosAttendanceType: 'asistente',
      },
    ];
    const data = {
      Norte: [allParticipants[0]],
      Sur: [allParticipants[1]],
    };
    const badges = computeWorkspaceSidebarBadges({
      ev: event,
      visibleLocations: ['Norte', 'Sur'],
      allParticipants,
      data,
    });
    const expected = computeDashboardTodosRosterTotal(allParticipants, event, {
      linkLookupParticipants: allParticipants,
    });
    expect(badges.activeTotalDeduped).toBe(expected);
    expect(badges.activeTotalDeduped).toBe(3);
  });

  it('counts courtesy companions inside total cortesias', () => {
    const allParticipants = [
      {
        id: 't1',
        eventId: 'ev1',
        status: 'active',
        location: 'Norte',
        name: 'Empleado Norte',
        bautizosAttendanceType: 'empleado',
        bautizosCompanions: [
          { id: 'c1', name: 'Acomp Cortesia', relationship: 'Esposa', bautizosAttendanceType: 'cortesia' },
          { id: 'c2', name: 'Acomp Normal', relationship: 'Hijo' },
        ],
      },
    ];
    const badges = computeWorkspaceSidebarBadges({
      ev: event,
      visibleLocations: ['Norte'],
      allParticipants,
      data: { Norte: [allParticipants[0]], Sur: [] },
    });
    expect(badges.attendanceLines.find((line) => line.label === 'Cortesías')?.count).toBe(2);
  });

  it('counts pastor titular and companions in total cortesias', () => {
    const allParticipants = [
      {
        id: 't1',
        eventId: 'ev1',
        status: 'active',
        location: 'Norte',
        name: 'Pastor Norte',
        bautizosAttendanceType: 'pastor',
        bautizosCompanions: [
          { id: 'c1', name: 'Esposa Pastor', relationship: 'Esposa' },
          { id: 'c2', name: 'Hijo Pastor', relationship: 'Hijo' },
        ],
      },
    ];
    const badges = computeWorkspaceSidebarBadges({
      ev: event,
      visibleLocations: ['Norte'],
      allParticipants,
      data: { Norte: [allParticipants[0]], Sur: [] },
    });
    expect(badges.attendanceLines.find((line) => line.label === 'Cortesías')?.count).toBe(3);
  });
});
