import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import {
  stripAllPersonalParticipantFields,
  stripSensitiveParticipantFields,
} from '../privacyNotice.js';

const require = createRequire(import.meta.url);
const core = require('../../functions/privacyNoticeCore.cjs');

describe('privacy retention archive doc id', () => {
  it('usa id_ + VNPM (misma regla que App.jsx), no el VNPM crudo', () => {
    const person = { vnpPersonId: 'VNPM-RABH960213H', phone: '5512345678', id: 'abc' };
    expect(core.getArchiveProfileDocId(person)).toBe('id_VNPM-RABH960213H');
    expect(core.getArchiveProfileDocId(person)).not.toBe('VNPM-RABH960213H');
  });

  it('cae a teléfono o pid cuando no hay VNPM válido', () => {
    expect(core.getArchiveProfileDocId({ phone: '52 55 1234 5678', id: 'x' })).toBe('ph_5512345678');
    expect(core.getArchiveProfileDocId({ id: 'part-1' })).toBe('pid_part-1');
  });
});

describe('privacy retention purge decision', () => {
  it('ya no salta cancelados: purga médica sin consentimiento sensible', () => {
    const decision = core.resolveRetentionPurgeAction({
      status: 'cancelled',
      privacyNoticeAcceptedAt: '2025-01-01T00:00:00.000Z',
      sensitiveDataConsent: 'No',
      paid: 0,
      refundPendingAmount: 0,
    });
    expect(decision.action).toBe('sensitive');
  });

  it('sin aviso hace purga total aunque solo exista marca sensitiveDataPurgedAt', () => {
    const decision = core.resolveRetentionPurgeAction({
      status: 'active',
      sensitiveDataPurgedAt: '2025-06-01T00:00:00.000Z',
    });
    expect(decision.action).toBe('full');
  });

  it('cancelado con reembolso pendiente: solo médica, no anonimiza identidad', () => {
    const decision = core.resolveRetentionPurgeAction({
      status: 'cancelled',
      refundPendingAmount: 500,
      paid: 500,
    });
    expect(decision.action).toBe('sensitive');
  });

  it('con consentimiento Si no purga', () => {
    const decision = core.resolveRetentionPurgeAction({
      privacyNoticeAcceptedAt: '2025-01-01T00:00:00.000Z',
      sensitiveDataConsent: 'Si',
    });
    expect(decision.action).toBe('skip');
  });
});

describe('privacy strip nested archivedProfileSnapshot', () => {
  const base = {
    name: 'Ana López',
    phone: '5511112222',
    bloodType: 'O+',
    hasAllergy: 'Si',
    allergyDetails: 'Penicilina',
    notes: 'nota privada',
    customData: { foo: 'bar' },
    archivedProfileSnapshot: {
      name: 'Ana López',
      phone: '5511112222',
      bloodType: 'O+',
      hasAllergy: 'Si',
      allergyDetails: 'Penicilina',
      emergencyContact: 'Pedro',
      emergencyPhone: '5599998888',
    },
    bautizosCompanions: [{ name: 'Luis', phone: '5588887777', bloodType: 'A+', hasAllergy: 'Si' }],
  };

  it('purga sensible limpia snapshot anidado (cliente)', () => {
    const patch = stripSensitiveParticipantFields(base);
    expect(patch.bloodType).not.toBe('O+');
    expect(patch.allergyDetails).toBe('');
    expect(patch.archivedProfileSnapshot.bloodType).not.toBe('O+');
    expect(patch.archivedProfileSnapshot.allergyDetails).toBe('');
    expect(patch.archivedProfileSnapshot.name).toBe('Ana López');
  });

  it('purga total limpia snapshot, notes y teléfono de acompañante (cliente)', () => {
    const patch = stripAllPersonalParticipantFields(base);
    expect(patch.name).toBe('Registro purgado (privacidad)');
    expect(patch.notes).toBe('');
    expect(patch.customData).toEqual({});
    expect(patch.archivedProfileSnapshot.name).toBe('Registro purgado (privacidad)');
    expect(patch.archivedProfileSnapshot.phone).toBe('');
    expect(patch.archivedProfileSnapshot.emergencyContact).toBe('');
    expect(patch.bautizosCompanions[0].name).toBe('Acompañante purgado');
    expect(patch.bautizosCompanions[0].phone).toBe('');
  });

  it('purga total limpia snapshot anidado (functions core)', () => {
    const patch = core.stripAllPersonalParticipantFields(base);
    expect(patch.archivedProfileSnapshot.name).toBe('Registro purgado (privacidad)');
    expect(patch.archivedProfileSnapshot.allergyDetails).toBe('');
    expect(patch.archivedProfileSnapshot.emergencyPhone).toBe('');
    expect(patch.notes).toBe('');
  });
});
