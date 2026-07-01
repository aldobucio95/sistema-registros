import { describe, expect, it } from 'vitest';
import {
  buildCompanionWaitlistVirtualParticipant,
  collectCompanionWaitlistVirtualRows,
  companionWaitlistVirtualId,
  parseCompanionWaitlistVirtualId,
  resolveCompanionWaitlistVirtualLocation,
  isCompanionWaitlistPhantomStoredParticipant,
  resolveParticipantEffectiveLocation,
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
    expect(row.location).toBe('Sede A');
    expect(participantHasBaptismChip(row, 'Bautizos')).toBe(false);
  });

  it('resolveCompanionWaitlistVirtualLocation falls back to host roster sede', () => {
    const host = {
      id: 'host1',
      eventId: 'ev1',
      location: 'Norte',
      status: 'active',
      name: 'Titular',
    };
    const virtual = {
      id: 'cw:host1::c1',
      _isCompanionWaitlistVirtual: true,
      _companionWaitlistHostId: 'host1',
      location: '',
    };
    expect(resolveCompanionWaitlistVirtualLocation(virtual, [host])).toBe('Norte');
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

  it('collects virtual waitlist rows for active host even when titular waitlist is empty', () => {
    const event = { id: 'ev1', eventType: 'Bautizos' };
    const host = {
      id: 'host1',
      eventId: 'ev1',
      location: 'Norte',
      status: 'active',
      name: 'Titular',
      bautizosCompanions: [
        { id: 'c1', name: 'Acomp 1', companionWaitlistPending: true },
        { id: 'c2', name: 'Acomp 2', companionWaitlistPending: true },
      ],
    };
    const rows = collectCompanionWaitlistVirtualRows([host], event, 'Norte');
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r._isCompanionWaitlistVirtual)).toBe(true);
  });

  it('detects phantom stored cw documents', () => {
    expect(isCompanionWaitlistPhantomStoredParticipant({ id: 'cw:h1::c1', status: 'waitlist' })).toBe(true);
    expect(isCompanionWaitlistPhantomStoredParticipant({ id: 'real1', status: 'active' })).toBe(false);
  });

  it('resolveParticipantEffectiveLocation inherits host sede for phantom rows', () => {
    const host = { id: 'h1', location: 'Coapa', status: 'active' };
    const phantom = { id: 'cw:h1::c1', _companionWaitlistHostId: 'h1', location: '', status: 'waitlist' };
    expect(resolveParticipantEffectiveLocation(phantom, [host])).toBe('Coapa');
  });
});
