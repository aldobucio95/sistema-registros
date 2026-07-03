import { describe, expect, it } from 'vitest';
import {
  cleanParticipantPayloadForEventType,
  isParticipantFieldApplicableToEventType,
} from '../participantEventFieldScope.js';

describe('participantEventFieldScope Bautizos servidor fields', () => {
  it('keeps server profile fields on Bautizos edit payload', () => {
    expect(isParticipantFieldApplicableToEventType('isServer', 'Bautizos')).toBe(true);
    expect(isParticipantFieldApplicableToEventType('preferredServeArea', 'Bautizos')).toBe(true);
    expect(isParticipantFieldApplicableToEventType('assignedServeArea', 'Bautizos')).toBe(true);

    const payload = {
      name: 'Ana Empleada',
      bautizosAttendanceType: 'empleado',
      isServer: 'Si',
      preferredServeArea: 'Cocina',
      servedAreas: 'Limpieza',
      isMarried: 'No',
    };
    const cleaned = cleanParticipantPayloadForEventType(payload, {}, 'Bautizos');
    expect(cleaned.isServer).toBe('Si');
    expect(cleaned.preferredServeArea).toBe('Cocina');
    expect(cleaned.servedAreas).toBe('Limpieza');
  });
});
