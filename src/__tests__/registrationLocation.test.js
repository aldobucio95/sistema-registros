import { describe, expect, it } from 'vitest';
import {
  getValidEventLocations,
  remapDraftRegistrationLocation,
  resolveRegistrationLocation,
} from '../registrationLocation.js';

describe('registrationLocation', () => {
  it('resolves requested location when it belongs to the event', () => {
    expect(resolveRegistrationLocation('Sur', 'Norte', ['Norte', 'Sur'])).toBe('Sur');
  });

  it('falls back to current roster location when requested location is invalid', () => {
    expect(resolveRegistrationLocation('Centro', 'Norte', ['Norte', 'Sur'])).toBe('Norte');
  });

  it('normalizes valid event locations', () => {
    expect(getValidEventLocations([' Norte ', '', null, 'Sur'])).toEqual(['Norte', 'Sur']);
  });

  it('remaps transport defaults tied to the previous location', () => {
    const draft = {
      location: 'Norte',
      travelFrom: 'Norte',
      travelTo: '',
      bautizosCompanions: [
        { id: 'c1', travelFrom: 'Norte', travelTo: 'Norte' },
        { id: 'c2', travelFrom: 'Sur', travelTo: '' },
      ],
    };

    expect(remapDraftRegistrationLocation(draft, 'Sur', 'Norte')).toEqual({
      location: 'Sur',
      travelFrom: 'Sur',
      travelTo: 'Sur',
      bautizosCompanions: [
        { id: 'c1', travelFrom: 'Sur', travelTo: 'Sur' },
        { id: 'c2', travelFrom: 'Sur', travelTo: 'Sur' },
      ],
    });
  });

  it('preserves custom transport choices unrelated to the previous location', () => {
    const draft = {
      location: 'Norte',
      travelFrom: 'Poniente',
      travelTo: 'Sur',
      bautizosCompanions: [{ id: 'c1', travelFrom: 'Poniente', travelTo: 'Oriente' }],
    };

    expect(remapDraftRegistrationLocation(draft, 'Centro', 'Norte')).toEqual({
      location: 'Centro',
      travelFrom: 'Poniente',
      travelTo: 'Sur',
      bautizosCompanions: [{ id: 'c1', travelFrom: 'Poniente', travelTo: 'Oriente' }],
    });
  });
});
