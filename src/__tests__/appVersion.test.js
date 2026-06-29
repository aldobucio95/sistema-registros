import { describe, expect, it, vi } from 'vitest';

describe('getAppInternalVersionLabel', () => {
  it('usa el 4.º dígito de APP_VERSION cuando falta buildSeq en el bundle', async () => {
    vi.resetModules();
    vi.stubGlobal('import', {
      meta: {
        env: {
          VITE_APP_VERSION: '1.0.8',
          VITE_APP_BUILD_SEQ: '0',
          VITE_APP_DISPLAY_VERSION: '1.0.8.152',
          VITE_APP_BUILD_ID: 'test-build',
        },
      },
    });
    const { getAppInternalVersionLabel } = await import('../appVersion.js');
    expect(getAppInternalVersionLabel()).toBe('v.1.0.8.152i');
    vi.unstubAllGlobals();
  });
});
