import { describe, expect, it } from 'vitest';
import {
  buildEventSectionPath,
  routeSegmentToActiveTab,
} from '../appRoutes.js';

describe('appRoutes transport section', () => {
  const event = { id: 'ev-1', name: 'Bautizos 2026' };

  it('mapea TransportPlanning a /transporte', () => {
    expect(buildEventSectionPath(event, 'TransportPlanning', [])).toBe(
      '/eventos/bautizos-2026/transporte'
    );
  });

  it('reconoce /transporte como pestaña TransportPlanning', () => {
    expect(routeSegmentToActiveTab('transporte', null, [], 'Bautizos')).toBe('TransportPlanning');
  });
});
