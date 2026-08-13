import { describe, expect, it } from 'vitest';
import {
  PUBLIC_REG_LIVE_EVENT_MISSING,
  PUBLIC_REG_LIVE_EVENT_OK,
  PUBLIC_REG_LIVE_EVENT_UNKNOWN,
  buildPublicRegistrationMissingEventError,
  publicRegistrationLiveEventDecision,
} from '../publicRegistrationEventGuard.js';

describe('publicRegistrationLiveEventDecision', () => {
  it('permite registro cuando el evento live existe (exists como método)', () => {
    expect(publicRegistrationLiveEventDecision({ exists: () => true, data: () => ({ name: 'Campa' }) })).toBe(
      PUBLIC_REG_LIVE_EVENT_OK
    );
  });

  it('bloquea cuando el documento live no existe', () => {
    expect(publicRegistrationLiveEventDecision({ exists: () => false })).toBe(PUBLIC_REG_LIVE_EVENT_MISSING);
  });

  it('acepta exists boolean (stubs de test)', () => {
    expect(publicRegistrationLiveEventDecision({ exists: true })).toBe(PUBLIC_REG_LIVE_EVENT_OK);
    expect(publicRegistrationLiveEventDecision({ exists: false })).toBe(PUBLIC_REG_LIVE_EVENT_MISSING);
  });

  it('no bloquea si la lectura falló (snap nulo)', () => {
    expect(publicRegistrationLiveEventDecision(null)).toBe(PUBLIC_REG_LIVE_EVENT_UNKNOWN);
    expect(publicRegistrationLiveEventDecision(undefined)).toBe(PUBLIC_REG_LIVE_EVENT_UNKNOWN);
  });

  it('no bloquea si exists no es interpretable', () => {
    expect(publicRegistrationLiveEventDecision({})).toBe(PUBLIC_REG_LIVE_EVENT_UNKNOWN);
  });
});

describe('buildPublicRegistrationMissingEventError', () => {
  it('devuelve error de submit sin ok', () => {
    const err = buildPublicRegistrationMissingEventError();
    expect(err.ok).toBe(false);
    expect(err.error).toMatch(/ya no existe o fue eliminado/i);
  });
});
