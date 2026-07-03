import { describe, expect, it } from 'vitest';
import { buildCampaFamilyCollisionIndex } from '../campaFamilyCollision.js';

describe('buildCampaFamilyCollisionIndex', () => {
  it('detecta pareja con vínculo unidireccional', () => {
    const participants = [
      {
        id: 'a1',
        eventId: 'ev-c',
        status: 'active',
        name: 'Ana López',
        spouseParticipantId: 'a2',
        location: 'Norte',
      },
      {
        id: 'a2',
        eventId: 'ev-c',
        status: 'active',
        name: 'Luis López',
        spouseParticipantId: '',
        location: 'Norte',
      },
    ];
    const idx = buildCampaFamilyCollisionIndex(participants, 'ev-c');
    expect(idx.total).toBeGreaterThan(0);
    expect(idx.clusters[0].kind).toBe('campa_spouse_unlinked');
  });
});
