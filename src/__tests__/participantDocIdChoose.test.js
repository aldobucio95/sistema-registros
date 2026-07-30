import { describe, expect, it } from 'vitest';
import { chooseParticipantDocumentIdForWrite } from '../publicRegistrationLogic.js';

describe('chooseParticipantDocumentIdForWrite', () => {
  const base = 'id_VNPM-GAMM900115M';

  it('usa sufijo de evento cuando el doc canónico aún no existe (anti TOCTOU cruzado)', () => {
    const abril = chooseParticipantDocumentIdForWrite({
      base,
      eventId: 'bautizos-abril',
      baseSnapExists: false,
      baseEventId: undefined,
    });
    const mayo = chooseParticipantDocumentIdForWrite({
      base,
      eventId: 'retiro-mayo',
      baseSnapExists: false,
      baseEventId: undefined,
    });
    expect(abril).toBe(`${base}__e_bautizos-abril`);
    expect(mayo).toBe(`${base}__e_retiro-mayo`);
    expect(abril).not.toBe(mayo);
  });

  it('reutiliza el id canónico si ya pertenece al mismo evento', () => {
    expect(
      chooseParticipantDocumentIdForWrite({
        base,
        eventId: 'bautizos-abril',
        baseSnapExists: true,
        baseEventId: 'bautizos-abril',
      })
    ).toBe(base);
  });

  it('usa sufijo si el canónico pertenece a otro evento', () => {
    expect(
      chooseParticipantDocumentIdForWrite({
        base,
        eventId: 'retiro-mayo',
        baseSnapExists: true,
        baseEventId: 'bautizos-abril',
      })
    ).toBe(`${base}__e_retiro-mayo`);
  });

  it('sin eventId conserva el id canónico', () => {
    expect(
      chooseParticipantDocumentIdForWrite({
        base,
        eventId: '',
        baseSnapExists: false,
        baseEventId: undefined,
      })
    ).toBe(base);
  });
});
