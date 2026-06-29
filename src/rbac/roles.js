/** Jerarquía de roles (1 = menor). */
export const ROLE_RANK = {
  Lector: 1,
  Editor: 2,
  Administrador: 3,
  SuperUsuario: 4,
};

export function normalizeRole(role) {
  const r = String(role || '').trim();
  if (r === 'SuperUsuario' || r === 'Administrador' || r === 'Editor' || r === 'Lector') return r;
  return 'Lector';
}

export function roleRank(role) {
  return ROLE_RANK[normalizeRole(role)] ?? 0;
}

/** El visor puede ver etiquetas / detalle de permisos del usuario objetivo (mismo nivel o superior). */
export function viewerCanSeeTargetPermissionMeta(viewer, targetUser) {
  if (!viewer || !targetUser) return false;
  if (normalizeRole(viewer.role) === 'SuperUsuario') return true;
  return roleRank(viewer.role) >= roleRank(targetUser.role);
}

export function isAdminOrSuper(role) {
  const r = normalizeRole(role);
  return r === 'Administrador' || r === 'SuperUsuario';
}
