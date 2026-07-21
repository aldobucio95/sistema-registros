/** Constantes de debounce / helpers sin estilos ad-hoc (UI_FORMAT_GUIDE). */
export const CAR_META_SAVE_DEBOUNCE_MS = 700;
export const PLAN_STRUCTURE_SAVE_DEBOUNCE_MS = 800;

export function clampInt(n, min, max) {
  const x = parseInt(n, 10);
  if (!Number.isFinite(x)) return min;
  return Math.min(max, Math.max(min, x));
}
