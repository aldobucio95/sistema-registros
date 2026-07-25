/**
 * Guards de jerarquía staff para callables Admin/SuperUsuario.
 * Pure helpers (testeables) — sin Firebase Admin.
 */

function normalizeStaffRole(role) {
  return String(role || '').trim();
}

/**
 * Misma regla que deleteUserAccount: solo un SuperUsuario puede actuar sobre otro SuperUsuario.
 * @returns {{ ok: true } | { ok: false, code: string, message: string }}
 */
function assertCallerCanMutateTargetStaff(callerRole, targetRole, actionLabel = 'modificar') {
  const caller = normalizeStaffRole(callerRole);
  const target = normalizeStaffRole(targetRole);
  if (target === 'SuperUsuario' && caller !== 'SuperUsuario') {
    return {
      ok: false,
      code: 'permission-denied',
      message: `Solo un SuperUsuario puede ${actionLabel} a otro SuperUsuario.`,
    };
  }
  return { ok: true };
}

module.exports = {
  normalizeStaffRole,
  assertCallerCanMutateTargetStaff,
};
