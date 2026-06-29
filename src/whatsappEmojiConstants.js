/**
 * Emojis para plantillas WhatsApp solo con escapes Unicode (fuente ASCII-safe).
 * Evita caracteres de reemplazo () al abrir wa.me si el .js no quedó guardado en UTF-8.
 */
export const WA_EMOJI = Object.freeze({
  wave: '\u{1F44B}',
  whiteCheck: '\u{2705}',
  calendar: '\u{1F4C5}',
  idBadge: '\u{1F194}',
  dollarBanknote: '\u{1F4B5}',
  barChart: '\u{1F4CA}',
  partyPopper: '\u{1F389}',
  sparkles: '\u{2728}',
  /** Check mark Unicode (no emoji); mismo uso que «Liquidado ✓». */
  checkMark: '\u2713',
  hourglassDone: '\u{23F3}',
  graduationCap: '\u{1F393}',
  megaphone: '\u{1F4E3}',
  speechBalloon: '\u{1F4AC}',
  warning: '\u{26A0}\u{FE0F}',
  card: '\u{1F4B3}',
  tearOffCalendar: '\u{1F4C6}',
  link: '\u{1F517}',
  writingHand: '\u{270D}\u{FE0F}',
});
