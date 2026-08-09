import { describe, expect, it } from 'vitest';
import { shouldSyncSpouseLinks, spouseUnlinkFields } from '../spouseLink.js';

describe('shouldSyncSpouseLinks', () => {
  it('is true when only previous spouse exists (desvínculo / baja / quitar matrimonio)', () => {
    expect(shouldSyncSpouseLinks('VNPM-A', '')).toBe(true);
    expect(shouldSyncSpouseLinks('VNPM-A', null)).toBe(true);
    expect(shouldSyncSpouseLinks('  VNPM-A  ', '   ')).toBe(true);
  });

  it('is true when only next spouse exists (nuevo vínculo)', () => {
    expect(shouldSyncSpouseLinks('', 'VNPM-B')).toBe(true);
    expect(shouldSyncSpouseLinks(null, 'VNPM-B')).toBe(true);
  });

  it('is true when spouse changes', () => {
    expect(shouldSyncSpouseLinks('VNPM-A', 'VNPM-B')).toBe(true);
  });

  it('is false when both empty (no spouse work)', () => {
    expect(shouldSyncSpouseLinks('', '')).toBe(false);
    expect(shouldSyncSpouseLinks(null, undefined)).toBe(false);
    expect(shouldSyncSpouseLinks('  ', '')).toBe(false);
  });
});

describe('spouseUnlinkFields', () => {
  it('clears bidirectional spouse fields on the exiting participant', () => {
    expect(spouseUnlinkFields()).toEqual({
      spouseParticipantId: '',
      isMarried: 'No',
      spouseName: '',
      spousePhone: '',
    });
  });
});
