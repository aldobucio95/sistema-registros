import { describe, expect, it, vi } from 'vitest';
import {
  buildStaffSessionLogId,
  claimStaffSessionLogWrite,
} from '../clientTelemetry.js';

describe('staff session log dedup', () => {
  const user = { id: '42', tabSessionId: 'tab-abc', loginTime: 1_700_000_000_000 };

  it('buildStaffSessionLogId is stable per session', () => {
    const a = buildStaffSessionLogId('logout_manual', user);
    const b = buildStaffSessionLogId('logout_manual', user);
    expect(a).toBe(b);
    expect(a).toBe('sess_logout_manual_42_tab-abc_1700000000000');
  });

  it('claimStaffSessionLogWrite allows only first write per tab', () => {
    const store = new Map();
    vi.stubGlobal('sessionStorage', {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => {
        store.set(key, value);
      },
      removeItem: (key) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
    });
    const logId = buildStaffSessionLogId('logout_manual', user);
    expect(claimStaffSessionLogWrite(logId)).toBe(true);
    expect(claimStaffSessionLogWrite(logId)).toBe(false);
    vi.unstubAllGlobals();
  });
});
