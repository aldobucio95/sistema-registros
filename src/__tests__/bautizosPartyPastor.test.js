import { describe, expect, it } from 'vitest';
import {
  BAUTIZOS_ATTENDANCE,
  bautizosPastorAttendance,
  isBautizosPastorAttendance,
  isFreeBautizosAttendance,
  normalizeBautizosAttendanceType,
  bautizosAttendancePaysEventListPrice,
} from '../bautizosParty.js';
import { getBautizosTitularListPrice } from '../publicRegistrationLogic.js';

describe('Bautizos Pastor attendance', () => {
  it('exports pastor attendance id', () => {
    expect(bautizosPastorAttendance).toBe('pastor');
    expect(BAUTIZOS_ATTENDANCE.pastor).toBe('pastor');
  });

  it('normalizes pastor aliases', () => {
    expect(normalizeBautizosAttendanceType('pastor')).toBe(BAUTIZOS_ATTENDANCE.pastor);
    expect(normalizeBautizosAttendanceType('Pastor')).toBe(BAUTIZOS_ATTENDANCE.pastor);
  });

  it('detects pastor attendance on person', () => {
    expect(isBautizosPastorAttendance({ bautizosAttendanceType: 'pastor' })).toBe(true);
    expect(isBautizosPastorAttendance({ bautizosAttendanceType: 'bautizado' })).toBe(false);
  });

  it('pastor has $0 titular list price and is free attendance', () => {
    const person = { bautizosAttendanceType: 'pastor', wantsBautizosTransport: 'Si' };
    const event = { eventType: 'Bautizos', bautizosListPriceFood: 100, bautizosListPriceTransport: 50 };
    expect(isFreeBautizosAttendance(person)).toBe(true);
    expect(bautizosAttendancePaysEventListPrice(person)).toBe(false);
    expect(getBautizosTitularListPrice(person, event)).toBe(0);
  });
});
