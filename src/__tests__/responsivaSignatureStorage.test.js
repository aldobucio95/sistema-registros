import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { buildResponsivaSignatureStoragePath } from '../responsivaRegistry.js';

const ROOT = join(process.cwd());

describe('responsiva signature Storage path + rules', () => {
  it('panel uploads keep a stable per-participant path', () => {
    expect(
      buildResponsivaSignatureStoragePath({
        eventId: 'Campa 2026',
        participantId: 'id_VNPM-RABH960213H',
        usePublic: false,
      })
    ).toBe('responsiva_signatures/Campa-2026/id_VNPM-RABH960213H.jpg');
  });

  it('public uploads use a unique non-colliding object name', () => {
    const a = buildResponsivaSignatureStoragePath({
      eventId: 'Campa 2026',
      participantId: 'id_VNPM-RABH960213H',
      usePublic: true,
      uniqueToken: 'tokA_111',
    });
    const b = buildResponsivaSignatureStoragePath({
      eventId: 'Campa 2026',
      participantId: 'id_VNPM-RABH960213H',
      usePublic: true,
      uniqueToken: 'tokB_222',
    });
    expect(a).toBe('responsiva_signatures/Campa-2026/id_VNPM-RABH960213H__toka_111.jpg');
    expect(b).toBe('responsiva_signatures/Campa-2026/id_VNPM-RABH960213H__tokb_222.jpg');
    expect(a).not.toBe(b);
    expect(a).not.toBe('responsiva_signatures/Campa-2026/id_VNPM-RABH960213H.jpg');
  });

  it('storage.rules deny anonymous update/overwrite of responsiva signatures', () => {
    const rules = readFileSync(join(ROOT, 'storage.rules'), 'utf8');
    expect(rules).toMatch(/function isStaffAuth\(\)/);
    expect(rules).toMatch(/match \/responsiva_signatures\/\{eventId\}\/\{fileName\}/);
    expect(rules).toMatch(/allow create:\s*if request\.auth != null;/);
    expect(rules).toMatch(/allow update:\s*if isStaffAuth\(\);/);
    expect(rules).toMatch(/allow delete:\s*if isStaffAuth\(\);/);
    // Regression: never again grant anonymous (any auth) update on signature objects.
    expect(rules).not.toMatch(/allow create,\s*update:\s*if request\.auth != null;/);
  });
});
