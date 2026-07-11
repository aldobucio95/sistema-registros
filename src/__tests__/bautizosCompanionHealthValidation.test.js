import { describe, expect, it } from 'vitest';
import {
  appendBautizosCompanionsValidationIssues,
  normalizeBautizosCompanionsForForm,
  normalizeBautizosCompanionHealthFieldsForForm,
} from '../bautizosParty.js';
import { BLOOD_TYPE_UNSPECIFIED } from '../registrationFormShared.js';

describe('bautizos companion health validation', () => {
  const fv = (key) => key !== 'bautizosTransport';

  it('does not flag missing medical flags when UI shows No but state was undefined', () => {
    const issues = [];
    appendBautizosCompanionsValidationIssues(
      {
        age: 30,
        bautizosCompanions: normalizeBautizosCompanionsForForm([
          {
            name: 'Maria Ana Lopez',
            relationship: 'Hermana',
            willBeBaptized: 'Si',
            phone: '5544770307',
            gender: 'Mujer',
            birthDate: '1991-07-12',
            emergencyContact: 'Candido Ramos',
            emergencyPhone: '5540853029',
            emergencyRelationship: 'Padre',
          },
        ]),
      },
      issues,
      fv
    );
    expect(issues).toEqual([]);
  });

  it('normalizes baptized companion health defaults for form', () => {
    const out = normalizeBautizosCompanionHealthFieldsForForm({
      willBeBaptized: 'Si',
      hasAllergy: undefined,
      bloodType: '',
    });
    expect(out.hasAllergy).toBe('No');
    expect(out.hasDisease).toBe('No');
    expect(out.hasDisability).toBe('No');
    expect(out.bloodType).toBe(BLOOD_TYPE_UNSPECIFIED);
  });

  it('still requires allergy details when marked Si', () => {
    const issues = [];
    appendBautizosCompanionsValidationIssues(
      {
        age: 30,
        bautizosCompanions: [
          {
            name: 'Maria Ana Lopez',
            relationship: 'Hermana',
            willBeBaptized: 'Si',
            phone: '5544770307',
            gender: 'Mujer',
            birthDate: '1991-07-12',
            bloodType: BLOOD_TYPE_UNSPECIFIED,
            emergencyContact: 'Candido Ramos',
            emergencyPhone: '5540853029',
            emergencyRelationship: 'Padre',
            hasAllergy: 'Si',
            hasDisease: 'No',
            hasDisability: 'No',
          },
        ],
      },
      issues,
      fv
    );
    expect(issues.some((x) => x.includes('alergias'))).toBe(true);
  });
});
