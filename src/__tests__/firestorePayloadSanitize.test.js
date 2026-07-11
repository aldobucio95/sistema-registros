import { describe, expect, it } from 'vitest';
import { normalizeBautizosCompanionsForPersist } from '../bautizosParty.js';
import {
  omitUndefinedDeep,
  prepareParticipantDocForFirestore,
  buildParticipantFirestoreWriteDoc,
} from '../firestorePayloadSanitize.js';

function assertNoUndefinedDeep(value, path = 'root') {
  if (value === undefined) {
    throw new Error(`undefined at ${path}`);
  }
  if (value == null || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((item, i) => assertNoUndefinedDeep(item, `${path}[${i}]`));
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    assertNoUndefinedDeep(nested, `${path}.${key}`);
  }
}

describe('prepareParticipantDocForFirestore', () => {
  it('strips undefined nested fields', () => {
    const out = prepareParticipantDocForFirestore({
      name: 'Test',
      nested: { keep: 'yes', drop: undefined },
      list: [{ ok: 1 }, { bad: undefined }],
    });
    expect(out).toEqual({
      name: 'Test',
      nested: { keep: 'yes' },
      list: [{ ok: 1 }, {}],
    });
    assertNoUndefinedDeep(out);
  });

  it('normalizes accented consent and strips purge markers', () => {
    const out = prepareParticipantDocForFirestore({
      name: 'Test',
      sensitiveDataConsent: 'Sí',
      sensitiveDataPurgedAt: '2026-01-01',
      privacyRetentionPurgedAt: '2026-01-02',
    });
    expect(out.sensitiveDataConsent).toBe('Si');
    expect(out.sensitiveDataPurgedAt).toBeUndefined();
    expect(out.privacyRetentionPurgedAt).toBeUndefined();
  });

  it('removes invalid consent values for Firestore rules', () => {
    const out = prepareParticipantDocForFirestore({
      name: 'Test',
      sensitiveDataConsent: '',
      sensitiveDataConsentAt: '',
    });
    expect(out.sensitiveDataConsent).toBeUndefined();
    expect(out.sensitiveDataConsentAt).toBeUndefined();
  });
});

describe('buildParticipantFirestoreWriteDoc', () => {
  it('clears health fields when consent is No', () => {
    const out = buildParticipantFirestoreWriteDoc(
      {
        name: 'Test',
        bloodType: 'O+',
        hasAllergy: 'Si',
        allergyDetails: 'Nuez',
        sensitiveDataConsent: 'Sí',
      },
      { sensitiveConsent: 'No' }
    );
    expect(out.sensitiveDataConsent).toBe('No');
    expect(out.bloodType).toBe('Sin especificar');
    expect(out.allergyDetails).toBe('');
  });
});

describe('normalizeBautizosCompanionsForPersist', () => {
  it('does not leave undefined server fields on companions', () => {
    const comps = normalizeBautizosCompanionsForPersist(
      {
        bautizosCompanions: [{ name: 'Tío Server', relationship: 'Tío', isServer: 'Si' }],
      },
      'Norte'
    );
    expect(comps).toHaveLength(1);
    assertNoUndefinedDeep(comps[0]);
    expect(comps[0].isServer).toBe('Si');
    expect(comps[0].assignedServeArea).toBe('');
    expect(comps[0].preferredServeArea).toBe('');
  });
});

describe('omitUndefinedDeep', () => {
  it('preserves null and zero', () => {
    expect(omitUndefinedDeep({ a: null, b: 0, c: undefined })).toEqual({ a: null, b: 0 });
  });
});
