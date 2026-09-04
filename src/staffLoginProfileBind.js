/**
 * Binding of a Firebase Auth session to an `app_users` staff profile.
 *
 * Google sign-in must not resolve a profile by username: a Gmail local-part
 * (`maria@gmail.com` → `maria`) colliding with staff username `maria` would
 * overwrite `authUid`/`authEmail` and steal the panel account.
 */

export const STAFF_LOGIN_MATCH_AUTH_UID = 'authUid';
export const STAFF_LOGIN_MATCH_AUTH_EMAIL = 'authEmail';
export const STAFF_LOGIN_MATCH_USERNAME = 'username';

/**
 * Username / prefix lookup is only for password (or username) login, where the
 * caller already authenticated as that identifier. Google popup must not use it.
 */
export function staffLoginAllowsUsernameProfileFallback({ fromGoogleLogin } = {}) {
  return fromGoogleLogin !== true;
}

/**
 * Whether this Auth UID may be written onto the matched staff profile.
 * @param {{ matchedBy: string, profileAuthUid?: string, currentUid?: string }} args
 * @returns {{ ok: true, bindAuth: boolean } | { ok: false, reason: string }}
 */
export function resolveStaffLoginProfileBind({ matchedBy, profileAuthUid, currentUid }) {
  const existing = String(profileAuthUid || '').trim();
  const current = String(currentUid || '').trim();
  if (!current) return { ok: false, reason: 'no_auth_uid' };

  if (existing === current) {
    return { ok: true, bindAuth: false };
  }

  if (!existing) {
    return { ok: true, bindAuth: true };
  }

  // Same login email, Auth user recreated → refresh uid. Never steal via username.
  if (matchedBy === STAFF_LOGIN_MATCH_AUTH_EMAIL) {
    return { ok: true, bindAuth: true };
  }

  return { ok: false, reason: 'auth_uid_conflict' };
}
