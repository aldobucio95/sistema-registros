import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('firebase/auth', () => ({
  setPersistence: vi.fn(async () => {}),
  browserLocalPersistence: {},
  signInAnonymously: vi.fn(async () => {}),
  signOut: vi.fn(async () => {}),
}));

import { setPersistence, signInAnonymously, signOut } from 'firebase/auth';
import { ensurePublicSubmitAuth } from '../publicRegistrationAuth.js';

describe('ensurePublicSubmitAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no cierra sesión de staff si falla getIdToken', async () => {
    const staff = {
      isAnonymous: false,
      getIdToken: vi.fn(async () => {
        throw new Error('token refresh failed');
      }),
    };
    const authInstance = {
      currentUser: staff,
      authStateReady: async () => {},
    };
    await ensurePublicSubmitAuth(authInstance);
    expect(signOut).not.toHaveBeenCalled();
    expect(signInAnonymously).not.toHaveBeenCalled();
    expect(staff.getIdToken).toHaveBeenCalled();
  });

  it('puede cerrar sesión anónima rota y volver a firmar anónimo', async () => {
    const anon = {
      isAnonymous: true,
      getIdToken: vi.fn(async () => {
        throw new Error('token refresh failed');
      }),
    };
    let current = anon;
    const authInstance = {
      get currentUser() {
        return current;
      },
      authStateReady: async () => {},
    };
    signOut.mockImplementation(async () => {
      current = null;
    });
    signInAnonymously.mockImplementation(async () => {
      current = {
        isAnonymous: true,
        getIdToken: vi.fn(async () => 'tok'),
      };
    });
    await ensurePublicSubmitAuth(authInstance);
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
    expect(setPersistence).toHaveBeenCalled();
  });
});
