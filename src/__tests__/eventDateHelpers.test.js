import { describe, expect, it } from 'vitest';
import { buildHubEventDateUpdate } from '../eventDateHelpers.js';

describe('buildHubEventDateUpdate', () => {
  it('no escribe si el picker se limpia (evita borrar el rango)', () => {
    const ev = { date: '2026-07-13', dateStart: '2026-07-10', dateEnd: '2026-07-13' };
    expect(buildHubEventDateUpdate(ev, '')).toEqual({ skip: true });
    expect(buildHubEventDateUpdate(ev, '   ')).toEqual({ skip: true });
  });

  it('no escribe si la fecha principal no cambió', () => {
    const ev = { date: '2026-07-13', dateStart: '2026-07-10', dateEnd: '2026-07-13' };
    expect(buildHubEventDateUpdate(ev, '2026-07-13')).toEqual({ skip: true });
  });

  it('al cambiar el fin de un rango conserva dateStart', () => {
    const ev = { date: '2026-07-13', dateStart: '2026-07-10', dateEnd: '2026-07-13' };
    expect(buildHubEventDateUpdate(ev, '2026-07-14')).toEqual({
      payload: { date: '2026-07-14', dateEnd: '2026-07-14' },
    });
  });

  it('rechaza un fin anterior al inicio', () => {
    const ev = { date: '2026-07-13', dateStart: '2026-07-10', dateEnd: '2026-07-13' };
    expect(buildHubEventDateUpdate(ev, '2026-07-09')).toEqual({
      error: 'La fecha de fin no puede ser anterior al inicio del evento.',
    });
  });

  it('en evento de un día actualiza date, dateStart y dateEnd juntos', () => {
    const ev = { date: '2026-09-17', dateStart: '2026-09-17', dateEnd: '2026-09-17' };
    expect(buildHubEventDateUpdate(ev, '2026-09-18')).toEqual({
      payload: { date: '2026-09-18', dateStart: '2026-09-18', dateEnd: '2026-09-18' },
    });
  });

  it('evento legado solo con date se trata como un día', () => {
    const ev = { date: '2026-09-17' };
    expect(buildHubEventDateUpdate(ev, '2026-09-20')).toEqual({
      payload: { date: '2026-09-20', dateStart: '2026-09-20', dateEnd: '2026-09-20' },
    });
  });
});
