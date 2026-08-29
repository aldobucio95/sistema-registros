import { describe, expect, it } from 'vitest';
import {
  cleanParticipantPayloadForEventType,
  isParticipantFieldApplicableToEventType,
} from '../participantEventFieldScope.js';

describe('participantEventFieldScope — spouse fields on Bautizos', () => {
  it('treats spouse link fields as applicable to Bautizos (not Campa-only)', () => {
    for (const key of ['isMarried', 'spouseName', 'spouseParticipantId', 'spousePhone']) {
      expect(isParticipantFieldApplicableToEventType(key, 'Bautizos')).toBe(true);
      expect(isParticipantFieldApplicableToEventType(key, 'Campa')).toBe(true);
      expect(isParticipantFieldApplicableToEventType(key, 'Desayuno Conferencia')).toBe(false);
    }
  });

  it('keeps a new spouse link on Bautizos edit instead of restoring empty originals', () => {
    const original = {
      id: 'host-1',
      name: 'Ana Lopez Perez',
      isMarried: 'No',
      spouseParticipantId: '',
      spouseName: '',
      spousePhone: '',
      paid: 150,
      paymentHistory: [{ id: 1, amount: 150 }],
    };
    const payload = {
      ...original,
      isMarried: 'Si',
      spouseParticipantId: 'partner-2',
      spouseName: 'Luis Gomez Diaz',
      spousePhone: '',
    };
    const cleaned = cleanParticipantPayloadForEventType(payload, original, 'Bautizos');
    expect(cleaned.isMarried).toBe('Si');
    expect(cleaned.spouseParticipantId).toBe('partner-2');
    expect(cleaned.spouseName).toBe('Luis Gomez Diaz');
    expect(cleaned.paymentHistory).toEqual([{ id: 1, amount: 150 }]);
  });

  it('keeps a spouse change on Bautizos edit (does not restore the previous partner id)', () => {
    const original = {
      id: 'host-1',
      isMarried: 'Si',
      spouseParticipantId: 'old-partner',
      spouseName: 'Nombre Anterior',
    };
    const payload = {
      ...original,
      spouseParticipantId: 'new-partner',
      spouseName: 'Nombre Nuevo',
    };
    const cleaned = cleanParticipantPayloadForEventType(payload, original, 'Bautizos');
    expect(cleaned.spouseParticipantId).toBe('new-partner');
    expect(cleaned.spouseName).toBe('Nombre Nuevo');
  });
});
