import { describe, expect, it } from 'vitest';
import {
  STAFF_LOGIN_MATCH_AUTH_EMAIL,
  STAFF_LOGIN_MATCH_AUTH_UID,
  STAFF_LOGIN_MATCH_USERNAME,
  resolveStaffLoginProfileBind,
  staffLoginAllowsUsernameProfileFallback,
} from '../staffLoginProfileBind.js';

describe('staffLoginAllowsUsernameProfileFallback', () => {
  it('permite búsqueda por usuario en login con contraseña', () => {
    expect(staffLoginAllowsUsernameProfileFallback({ fromGoogleLogin: false })).toBe(true);
    expect(staffLoginAllowsUsernameProfileFallback({})).toBe(true);
  });

  it('bloquea búsqueda por usuario tras Continuar con Google', () => {
    expect(staffLoginAllowsUsernameProfileFallback({ fromGoogleLogin: true })).toBe(false);
  });
});

describe('resolveStaffLoginProfileBind', () => {
  it('no reescribe si el perfil ya tiene el mismo authUid', () => {
    expect(
      resolveStaffLoginProfileBind({
        matchedBy: STAFF_LOGIN_MATCH_USERNAME,
        profileAuthUid: 'uid-staff',
        currentUid: 'uid-staff',
      })
    ).toEqual({ ok: true, bindAuth: false });
  });

  it('vincula primera vez cuando el perfil no tiene authUid', () => {
    expect(
      resolveStaffLoginProfileBind({
        matchedBy: STAFF_LOGIN_MATCH_USERNAME,
        profileAuthUid: '',
        currentUid: 'uid-new',
      })
    ).toEqual({ ok: true, bindAuth: true });
  });

  it('rechaza sobrescribir un authUid distinto hallado solo por username (Google local-part)', () => {
    expect(
      resolveStaffLoginProfileBind({
        matchedBy: STAFF_LOGIN_MATCH_USERNAME,
        profileAuthUid: 'uid-staff',
        currentUid: 'uid-attacker-google',
      })
    ).toEqual({ ok: false, reason: 'auth_uid_conflict' });
  });

  it('permite refrescar authUid si el correo de acceso coincide (cuenta Auth recreada)', () => {
    expect(
      resolveStaffLoginProfileBind({
        matchedBy: STAFF_LOGIN_MATCH_AUTH_EMAIL,
        profileAuthUid: 'uid-old',
        currentUid: 'uid-recreated',
      })
    ).toEqual({ ok: true, bindAuth: true });
  });

  it('no trata coincidencia por authUid como reescritura', () => {
    expect(
      resolveStaffLoginProfileBind({
        matchedBy: STAFF_LOGIN_MATCH_AUTH_UID,
        profileAuthUid: 'uid-staff',
        currentUid: 'uid-staff',
      })
    ).toEqual({ ok: true, bindAuth: false });
  });

  it('falla sin UID de sesión', () => {
    expect(
      resolveStaffLoginProfileBind({
        matchedBy: STAFF_LOGIN_MATCH_AUTH_EMAIL,
        profileAuthUid: '',
        currentUid: '',
      })
    ).toEqual({ ok: false, reason: 'no_auth_uid' });
  });
});
