import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const rules = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8');

function matchBlock(collectionName) {
  const marker = `match /${collectionName}/{docId} {`;
  const start = rules.indexOf(marker);
  expect(start).toBeGreaterThanOrEqual(0);
  let depth = 0;
  for (let i = start; i < rules.length; i++) {
    const ch = rules[i];
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return rules.slice(start, i + 1);
    }
  }
  throw new Error(`No block found for ${collectionName}`);
}

describe('firestore.rules public access hardening', () => {
  it('keeps anonymous users from listing, deleting, or broadly updating participants', () => {
    const block = matchBlock('app_participants');

    expect(block).toContain('allow list: if isStaffAuth();');
    expect(block).toContain('allow delete: if isStaffAuth();');
    expect(block).toContain('isPublicParticipantCreate()');
    expect(block).toContain('isPublicResponsivaParticipantUpdate()');
    expect(block).not.toMatch(/allow\s+(read,\s*)?write:\s*if\s+request\.auth\s*!=\s*null/);
    expect(block).not.toMatch(/allow\s+update:\s*if\s+request\.auth\s*!=\s*null/);
    expect(block).not.toMatch(/allow\s+delete:\s*if\s+request\.auth\s*!=\s*null/);
  });

  it('keeps event and public-link writes staff-only', () => {
    expect(matchBlock('app_events')).toContain('allow write: if isStaffAuth();');
    expect(matchBlock('app_public_registration_links')).toContain('allow write: if isStaffAuth();');
    expect(matchBlock('app_cache_versions')).toContain('allow write: if isStaffAuth();');
  });

  it('does not allow public listing of responsiva tokens', () => {
    const block = matchBlock('app_responsiva_sign_tokens');

    expect(block).toContain('allow get: if true;');
    expect(block).toContain('allow list, delete: if isStaffAuth();');
    expect(block).not.toMatch(/allow\s+read:\s*if\s+true/);
    expect(block).not.toMatch(/allow\s+write:\s*if\s+request\.auth\s*!=\s*null/);
  });
});
