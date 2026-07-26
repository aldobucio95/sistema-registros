import { beforeEach, describe, expect, it, vi } from 'vitest';

const getDocMock = vi.fn();
const getDocRefMock = vi.fn((collection, id) => ({ path: `${collection}/${id}`, id }));

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getDoc: (...args) => getDocMock(...args),
    getDocs: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
  };
});

vi.mock('../firebaseRefs.js', () => ({
  getDocRef: (...args) => getDocRefMock(...args),
  getColRef: vi.fn(),
  db: {},
}));

vi.mock('../activityLogCore.js', () => ({
  buildLogId: () => 'log-1',
  writeSnapshotDoc: vi.fn(async () => ({})),
}));

vi.mock('../whatsappFinanceMessages.js', () => ({
  buildFinanceWhatsAppMessage: () => '',
  buildScholarshipPendingWhatsAppMessage: () => '',
}));

vi.mock('../responsivaSignLogic.js', () => ({
  registrationRequiresResponsivaStatus: () => false,
  responsivaStatusValidationLabel: () => '',
  createResponsivaSignTokenDoc: vi.fn(),
  isResponsivaDigitalActiveForParticipant: () => false,
  participantAgeBracketForResponsiva: () => 'adult',
}));

import {
  generateVnpPersonId,
  resolveParticipantDocumentIdForPromotionWrite,
} from '../publicRegistrationLogic.js';

function snapExists(data) {
  return {
    exists: () => true,
    data: () => data,
    id: data.id,
  };
}

function snapMissing() {
  return { exists: () => false, data: () => null };
}

describe('generateVnpPersonId collisions', () => {
  it('collides for same initials + DOB + gender (Garcia Morales / Garcia Martinez)', () => {
    const a = generateVnpPersonId({
      name: 'Maria Garcia Morales',
      birthDate: '1990-01-15',
      gender: 'Mujer',
    });
    const b = generateVnpPersonId({
      name: 'Marta Garcia Martinez',
      birthDate: '1990-01-15',
      gender: 'Mujer',
    });
    expect(a).toBe(b);
    expect(a).toBe('VNPM-GAMM900115M');
  });

  it('collides for multiple Sin especificar promotion defaults', () => {
    const a = generateVnpPersonId({
      name: 'Sin especificar',
      birthDate: 'Sin especificar',
      gender: '',
    });
    const b = generateVnpPersonId({
      name: 'Sin especificar',
      birthDate: 'Sin especificar',
      gender: '',
    });
    expect(a).toBe(b);
    expect(a).toBe('VNPM-ESES000000X');
  });
});

describe('resolveParticipantDocumentIdForPromotionWrite', () => {
  beforeEach(() => {
    getDocMock.mockReset();
    getDocRefMock.mockClear();
  });

  it('uses canonical id when free', async () => {
    getDocMock.mockResolvedValue(snapMissing());
    const reserved = new Set();
    const r = await resolveParticipantDocumentIdForPromotionWrite(
      'VNPM-GAMM900115M',
      'evento-1',
      reserved
    );
    expect(r).toEqual({ ok: true, docId: 'id_VNPM-GAMM900115M' });
    expect(reserved.has('id_VNPM-GAMM900115M')).toBe(true);
  });

  it('aborts when same-event active participant already owns the folio', async () => {
    getDocMock.mockImplementation(async (ref) => {
      if (String(ref.id) === 'id_VNPM-GAMM900115M') {
        return snapExists({
          id: 'id_VNPM-GAMM900115M',
          eventId: 'evento-1',
          status: 'active',
          name: 'Maria Garcia Morales',
        });
      }
      return snapMissing();
    });
    const r = await resolveParticipantDocumentIdForPromotionWrite(
      'VNPM-GAMM900115M',
      'evento-1',
      new Set()
    );
    expect(r.ok).toBe(false);
    expect(String(r.error || '')).toMatch(/ya existe|lista de espera|folio/i);
  });

  it('allocates sibling id when folio is reserved by the cancel plan (host)', async () => {
    getDocMock.mockImplementation(async (ref) => {
      if (String(ref.id) === 'id_VNPM-GAMM900115M') {
        return snapExists({
          id: 'id_VNPM-GAMM900115M',
          eventId: 'evento-1',
          status: 'active',
          name: 'Host',
        });
      }
      return snapMissing();
    });
    const reserved = new Set(['id_VNPM-GAMM900115M']);
    const r = await resolveParticipantDocumentIdForPromotionWrite(
      'VNPM-GAMM900115M',
      'evento-1',
      reserved
    );
    expect(r.ok).toBe(true);
    expect(r.docId).toBe('id_VNPM-GAMM900115M__promo_1');
    expect(reserved.has('id_VNPM-GAMM900115M__promo_1')).toBe(true);
  });

  it('does not overwrite cancelled docs; uses sibling instead', async () => {
    getDocMock.mockImplementation(async (ref) => {
      if (String(ref.id) === 'id_VNPM-ESES000000X') {
        return snapExists({
          id: 'id_VNPM-ESES000000X',
          eventId: 'evento-1',
          status: 'cancelled',
          refundPendingAmount: 500,
          name: 'Prev',
        });
      }
      return snapMissing();
    });
    const r = await resolveParticipantDocumentIdForPromotionWrite(
      'VNPM-ESES000000X',
      'evento-1',
      new Set()
    );
    expect(r.ok).toBe(true);
    expect(r.docId).toBe('id_VNPM-ESES000000X__promo_1');
  });

  it('keeps two incomplete promotions on distinct ids within the same batch', async () => {
    getDocMock.mockResolvedValue(snapMissing());
    const reserved = new Set();
    const a = await resolveParticipantDocumentIdForPromotionWrite(
      'VNPM-ESES000000X',
      'evento-1',
      reserved
    );
    const b = await resolveParticipantDocumentIdForPromotionWrite(
      'VNPM-ESES000000X',
      'evento-1',
      reserved
    );
    expect(a.ok && b.ok).toBe(true);
    expect(a.docId).toBe('id_VNPM-ESES000000X');
    expect(b.docId).toBe('id_VNPM-ESES000000X__promo_1');
    expect(a.docId).not.toBe(b.docId);
  });
});
