import { createRequire } from 'module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { participantWriteAffectsRosterCache } = require('../../functions/cacheVersionBump.cjs');

describe('participantWriteAffectsRosterCache', () => {
  const base = {
    eventId: 'evt_1',
    location: 'Norte',
    name: 'Ana',
    status: 'active',
  };

  it('no invalida caché si solo cambia whatsAppFinanceNotifications', () => {
    const before = { ...base, whatsAppFinanceNotifications: [] };
    const after = {
      ...base,
      whatsAppFinanceNotifications: [{ id: 'n1', kind: 'datos_carro', message: 'hola' }],
    };
    expect(participantWriteAffectsRosterCache(before, after)).toBe(false);
  });

  it('no invalida caché si solo cambia whatsAppMessageHistory', () => {
    const before = { ...base };
    const after = { ...base, whatsAppMessageHistory: [{ id: 'm1', text: 'ok' }] };
    expect(participantWriteAffectsRosterCache(before, after)).toBe(false);
  });

  it('invalida caché si cambia un campo de roster', () => {
    const before = { ...base, name: 'Ana' };
    const after = { ...base, name: 'Ana María' };
    expect(participantWriteAffectsRosterCache(before, after)).toBe(true);
  });

  it('invalida caché en alta o baja de documento', () => {
    expect(participantWriteAffectsRosterCache(null, base)).toBe(true);
    expect(participantWriteAffectsRosterCache(base, null)).toBe(true);
  });
});
