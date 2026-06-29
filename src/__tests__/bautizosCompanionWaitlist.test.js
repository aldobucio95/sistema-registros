import { describe, expect, it } from 'vitest';
import {
  buildCompanionWaitlistVirtualParticipant,
  companionWaitlistVirtualId,
  parseCompanionWaitlistVirtualId,
} from '../bautizosCompanionWaitlist.js';
import { participantHasBaptismChip } from '../bautizosParty.js';

describe('bautizosCompanionWaitlist', () => {
  it('builds virtual waitlist row without titular baptism chip', () => {
    const host = {
      id: 'host1',
      eventId: 'ev1',
      location: 'Sede A',
      status: 'active',
      name: 'Titular Activo',
      registeredAt: '2024-01-01T00:00:00.000Z',
    };
    const companion = {
      id: 'c1',
      name: 'Karla Avalos Pérez',
      relationship: 'Hija',
      willBeBaptized: 'Si',
      companionWaitlistPending: true,
      companionWaitlistCreatedAt: Date.now(),
    };
    const row = buildCompanionWaitlistVirtualParticipant(host, companion, { id: 'ev1', eventType: 'Bautizos' }, [
      host,
    ]);
    expect(row._isCompanionWaitlistVirtual).toBe(true);
    expect(row.id).toBe(companionWaitlistVirtualId('host1', 'c1'));
    expect(participantHasBaptismChip(row, 'Bautizos')).toBe(false);
  });

  it('omits baptism chip for global registry nested companion rows', () => {
    const companionPerson = {
      name: 'Acompañante',
      bautizosAttendanceType: 'Bautizado',
      __globalRegistryCompanionRow: true,
    };
    expect(participantHasBaptismChip(companionPerson, 'Bautizos')).toBe(false);
  });

  it('parses companion waitlist virtual ids', () => {
    expect(parseCompanionWaitlistVirtualId('cw:host1::c1')).toEqual({
      hostId: 'host1',
      companionId: 'c1',
    });
  });
});
