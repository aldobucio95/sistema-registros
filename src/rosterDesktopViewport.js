/** Mismo breakpoint que `md:` en Tailwind: lista de escritorio y edición modal a pantalla completa. */
export const ROSTER_DESKTOP_MEDIA = '(min-width: 768px)';

export function isDesktopRosterViewport() {
  return typeof window !== 'undefined' && window.matchMedia(ROSTER_DESKTOP_MEDIA).matches;
}
