import { describe, expect, it } from 'vitest';
import {
  BAUTIZOS_ATTENDANCE,
  bautizosPastorAttendance,
  isBautizosPastorAttendance,
  isFreeBautizosAttendance,
  normalizeBautizosAttendanceType,
  bautizosAttendancePaysEventListPrice,
} from '../bautizosParty.js';
import {
  getBautizosTitularListPrice,
  getBautizosPartyListPrice,
  getBautizosCompanionsListPriceSum,
  getBautizosCompanionsInformativeListPriceSum,
  getPersonCost,
} from '../publicRegistrationLogic.js';

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

  it('pastor party total is $0 including companions', () => {
    const person = {
      bautizosAttendanceType: 'pastor',
      bautizosCompanions: [
        { name: 'Ana', wantsBautizosTransport: 'Si' },
        { name: 'Luis', wantsBautizosTransport: 'No' },
      ],
    };
    const event = { eventType: 'Bautizos', bautizosListPriceFood: 100, bautizosListPriceTransport: 50 };
    expect(getBautizosPartyListPrice(person, event)).toBe(0);
  });

  it('Campa pastor has $0 list cost in getPersonCost', () => {
    const person = { attendanceSpecialType: 'pastor', isServer: 'No' };
    const pricing = { global: 500 };
    expect(getPersonCost(person, pricing, { eventType: 'Campa' })).toBe(0);
  });
});

describe('Bautizos party list price', () => {
  const event = {
    eventType: 'Bautizos',
    bautizosListPriceFood: 150,
    bautizosListPriceTransport: 350,
  };

  it('titular bautizado + 2 acompañantes en carro = comida × 3', () => {
    const person = {
      bautizosAttendanceType: 'bautizado',
      llegaEnCarro: true,
      wantsBautizosTransport: 'No',
      bautizosCompanions: [
        { name: 'Eduardo', relationship: 'Hijo', llegaEnCarro: true, wantsBautizosTransport: 'No' },
        { name: 'María', relationship: 'Madre', llegaEnCarro: true, wantsBautizosTransport: 'No' },
      ],
    };
    expect(getBautizosTitularListPrice(person, event)).toBe(150);
    expect(getBautizosCompanionsListPriceSum(person, event)).toBe(300);
    expect(getBautizosCompanionsInformativeListPriceSum(person, event)).toBe(300);
    expect(getBautizosPartyListPrice(person, event)).toBe(450);
    expect(getPersonCost(person, {}, event)).toBe(450);
  });

  it('no cobra filas de acompañante vacías en la suma', () => {
    const person = {
      bautizosAttendanceType: 'bautizado',
      llegaEnCarro: true,
      wantsBautizosTransport: 'No',
      bautizosCompanions: [
        { name: 'Ana', llegaEnCarro: true, wantsBautizosTransport: 'No' },
        { name: '', relationship: '' },
      ],
    };
    expect(getBautizosCompanionsListPriceSum(person, event)).toBe(150);
    expect(getBautizosPartyListPrice(person, event)).toBe(300);
  });

  it('empleado titular: acompañantes en cortesía no suman a la lista', () => {
    const person = {
      bautizosAttendanceType: 'empleado',
      isServer: 'Si',
      llegaEnCarro: true,
      wantsBautizosTransport: 'No',
      bautizosCompanions: [
        { name: 'Ana', relationship: 'Esposa', bautizosAttendanceType: 'cortesia', llegaEnCarro: true, wantsBautizosTransport: 'No' },
        { name: 'Luis', relationship: 'Hijo', bautizosAttendanceType: 'cortesia', llegaEnCarro: true, wantsBautizosTransport: 'Si' },
        { name: 'Pedro', relationship: 'Amigo', llegaEnCarro: true, wantsBautizosTransport: 'No' },
      ],
    };
    expect(getBautizosTitularListPrice(person, event)).toBe(0);
    expect(getBautizosCompanionsListPriceSum(person, event)).toBe(150);
    expect(getBautizosPartyListPrice(person, event)).toBe(150);
  });
});
