import { describe, expect, it } from 'vitest';
import { BAUTIZOS_ATTENDANCE } from '../bautizosParty.js';
import {
  applyEditorRegistrationDefaults,
  canShowBautizosPastorAttendance,
} from '../registrationFormEditorConfig.js';

describe('Bautizos Pastor editor permission', () => {
  it('allows admin and denies editor without pastor field', () => {
    expect(
      canShowBautizosPastorAttendance({ role: 'Administrador', visibility: {}, hasAdminRights: true })
    ).toBe(true);
    expect(
      canShowBautizosPastorAttendance({
        role: 'Editor',
        visibility: { bautizosPastorAttendance: false },
        hasAdminRights: false,
      })
    ).toBe(false);
    expect(
      canShowBautizosPastorAttendance({
        role: 'Editor',
        visibility: { bautizosPastorAttendance: true },
        hasAdminRights: false,
      })
    ).toBe(true);
  });

  it('strips pastor attendance when editor lacks pastor permission', () => {
    const out = applyEditorRegistrationDefaults(
      { bautizosAttendanceType: BAUTIZOS_ATTENDANCE.pastor },
      { bautizosPastorAttendance: false, bautizosAttendanceType: true },
      'Bautizos',
      'Sede A'
    );
    expect(out.bautizosAttendanceType).toBe(BAUTIZOS_ATTENDANCE.bautizado);
  });
});
