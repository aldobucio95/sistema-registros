import { describe, it, expect } from 'vitest';
import {
  buildPreferredLandingTabOptionGroups,
  isLandingLocationTab,
  normalizeLandingTabForEventType,
  resolvePreferredLandingTab,
} from '../preferredLandingTab.js';

const baseEvents = [
  { id: 'ev-campa', eventType: 'Campa', locations: ['Norte', 'Sur'] },
  { id: 'ev-baut', eventType: 'Bautizos', locations: ['Centro', 'Oriente'] },
];

describe('isLandingLocationTab', () => {
  it('distingue sedes de secciones del menú', () => {
    expect(isLandingLocationTab('Norte')).toBe(true);
    expect(isLandingLocationTab('ExpenseList')).toBe(false);
    expect(isLandingLocationTab('Summary')).toBe(false);
    expect(isLandingLocationTab('PastoresPage')).toBe(false);
  });
});

describe('normalizeLandingTabForEventType', () => {
  it('convierte Becados a Acompañantes en Bautizos', () => {
    expect(normalizeLandingTabForEventType('Becados', 'Bautizos')).toBe('BautizosCompanions');
    expect(normalizeLandingTabForEventType('BautizosCompanions', 'Campa')).toBe('Becados');
  });
});

describe('buildPreferredLandingTabOptionGroups', () => {
  it('incluye secciones del menú habilitadas y sedes del usuario', () => {
    const user = {
      role: 'Editor',
      allowedEventIds: ['ev-campa'],
      allowedLocationsByEvent: { 'ev-campa': ['Norte'] },
      allowedPanelSections: { dashboard: false, locations: true, registroGlobal: true },
      allowedPanelSectionsByEvent: { 'ev-campa': { registroGlobal: true } },
    };
    const { sectionOptions, locationOptions } = buildPreferredLandingTabOptionGroups({
      user,
      events: baseEvents,
      globalPanelNav: {},
    });
    expect(sectionOptions.some((o) => o.value === 'RegistroGlobal')).toBe(true);
    expect(locationOptions.map((o) => o.value)).toContain('Norte');
    expect(sectionOptions.some((o) => o.value === 'Summary')).toBe(false);
  });

  it('incluye Pastores para administradores', () => {
    const user = { role: 'Administrador', allowedEventIds: [] };
    const { sectionOptions } = buildPreferredLandingTabOptionGroups({
      user,
      events: baseEvents,
      globalPanelNav: {},
      hasAdminRights: true,
    });
    expect(sectionOptions.some((o) => o.value === 'PastoresPage')).toBe(true);
  });
});

describe('resolvePreferredLandingTab', () => {
  const ctx = { globalPanelNav: {}, allKnownLocationNames: ['Norte', 'Sur'], globalLocations: [] };

  it('respeta preferencia de sección del menú cuando está permitida', () => {
    const user = {
      role: 'Administrador',
      preferredLandingTab: 'RegistroGlobal',
    };
    const event = { id: 'ev-campa', eventType: 'Campa', locations: ['Norte'] };
    expect(resolvePreferredLandingTab(user, event, ctx)).toBe('RegistroGlobal');
  });

  it('normaliza Becados a Acompañantes en evento Bautizos', () => {
    const user = {
      role: 'Administrador',
      preferredLandingTab: 'Becados',
    };
    const event = { id: 'ev-baut', eventType: 'Bautizos', locations: ['Centro'] };
    expect(resolvePreferredLandingTab(user, event, ctx)).toBe('BautizosCompanions');
  });

  it('resuelve sede cuando la preferencia es un nombre de sede', () => {
    const user = {
      role: 'Editor',
      preferredLandingTab: 'Norte',
      allowedLocations: ['Norte'],
    };
    const event = { id: 'ev-campa', eventType: 'Campa', locations: ['Norte', 'Sur'] };
    expect(resolvePreferredLandingTab(user, event, ctx)).toBe('Norte');
  });

  it('cae a sede visible si dashboard no está permitido', () => {
    const user = {
      role: 'Editor',
      preferredLandingTab: 'Summary',
      allowedLocations: ['Norte'],
      allowedPanelSections: { dashboard: false, locations: true },
    };
    const event = { id: 'ev-campa', eventType: 'Campa', locations: ['Norte'] };
    expect(resolvePreferredLandingTab(user, event, ctx)).toBe('Norte');
  });
});
