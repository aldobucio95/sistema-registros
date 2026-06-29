/** Locale para mayúsculas/minúsculas en nombres (México). */
const NAME_LOCALE = 'es-MX';

/**
 * Formatea un nombre propio: cada secuencia de letras con inicial mayúscula y el resto minúsculas.
 * Conserva espacios, guiones y puntuación entre palabras (p. ej. "MARÍA-JOSÉ" → "María-José").
 * No debe lanzar: en entornos raros (WebView, `toLocaleLowerCase`) se devuelve el texto recortado.
 */
export function formatPersonNameString(raw) {
  if (raw == null) return '';
  const s = String(raw).trim();
  if (!s) return '';
  try {
    const nfc = s.normalize('NFC');
    return nfc.replace(/\p{L}+/gu, (word) => {
      if (!word) return word;
      const first = word.charAt(0);
      const rest = word.slice(1);
      return first.toLocaleUpperCase(NAME_LOCALE) + rest.toLocaleLowerCase(NAME_LOCALE);
    });
  } catch {
    return s;
  }
}

const TOP_LEVEL_NAME_KEYS = [
  'name',
  'spouseName',
  'emergencyContact',
  'emergencyContactResponsiva',
  'alias',
];

const COMPANION_NAME_KEYS = ['name', 'linkedCompanionName', 'linkedRegistrantName'];

/**
 * Normaliza in-place campos de nombre antes de persistir en Firestore.
 * Incluye filas de `bautizosCompanions` si existen.
 */
export function applyParticipantNameFormattingForSave(personLike) {
  if (!personLike || typeof personLike !== 'object') return;
  try {
    for (const key of TOP_LEVEL_NAME_KEYS) {
      if (personLike[key] != null && typeof personLike[key] === 'string' && String(personLike[key]).trim()) {
        personLike[key] = formatPersonNameString(personLike[key]);
      }
    }
    const companions = personLike.bautizosCompanions;
    if (!Array.isArray(companions)) return;
    for (const row of companions) {
      if (!row || typeof row !== 'object') continue;
      for (const ck of COMPANION_NAME_KEYS) {
        if (row[ck] != null && typeof row[ck] === 'string' && String(row[ck]).trim()) {
          row[ck] = formatPersonNameString(row[ck]);
        }
      }
    }
  } catch {
    /* no bloquear persistencia por formato de nombre */
  }
}
