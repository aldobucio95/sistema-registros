/**
 * Une trozos del shell del workspace en un solo objeto plano (misma forma que antes para `EventWorkspaceScreen`).
 * Agrupa en App.jsx por responsabilidad para mantener legible qué entra en la vista con evento.
 */
export function mergeWorkspaceShellParts(parts) {
  return Object.assign({}, ...parts);
}
