/** Normalización y comparación de nombres para detección de duplicados. */

const NAME_PARTICLES = new Set([
  'de',
  'del',
  'la',
  'las',
  'los',
  'y',
  'e',
  'da',
  'do',
  'van',
  'von',
]);

/** NFD + sin diacríticos + ñ→n + minúsculas + espacios colapsados. */
export function normalizePersonNameForMatch(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u00f1/g, 'n')
    .replace(/\u00df/g, 'ss')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Tokens significativos del nombre (sin partículas, min 2 chars). */
export function tokenizePersonName(s) {
  const norm = normalizePersonNameForMatch(s);
  if (!norm) return [];
  return norm
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !NAME_PARTICLES.has(t));
}

/** Todos los tokens del nombre más corto están en el más largo. */
export function nameTokensSubsetMatch(a, b) {
  const ta = tokenizePersonName(a);
  const tb = tokenizePersonName(b);
  if (!ta.length || !tb.length) return false;
  const short = ta.length <= tb.length ? ta : tb;
  const longSet = new Set(ta.length <= tb.length ? tb : ta);
  return short.length >= 2 && short.every((t) => longSet.has(t));
}

/** Jaccard sobre tokens. */
export function nameTokenOverlapScore(a, b) {
  const ta = new Set(tokenizePersonName(a));
  const tb = new Set(tokenizePersonName(b));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) {
    if (tb.has(t)) inter += 1;
  }
  const union = ta.size + tb.size - inter;
  return union > 0 ? inter / union : 0;
}

/** Distancia Levenshtein. */
export function levenshteinDistance(a, b) {
  const s = String(a || '');
  const t = String(b || '');
  if (s === t) return 0;
  if (!s.length) return t.length;
  if (!t.length) return s.length;
  const m = s.length;
  const n = t.length;
  let prev = new Array(n + 1);
  let cur = new Array(n + 1);
  for (let j = 0; j <= n; j += 1) prev[j] = j;
  for (let i = 1; i <= m; i += 1) {
    cur[0] = i;
    for (let j = 1; j <= n; j += 1) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    const swap = prev;
    prev = cur;
    cur = swap;
  }
  return prev[n];
}

/** Ratio 0–1 (1 = idéntico). */
export function nameFuzzyRatio(a, b) {
  const na = normalizePersonNameForMatch(a);
  const nb = normalizePersonNameForMatch(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const maxLen = Math.max(na.length, nb.length);
  if (!maxLen) return 0;
  return 1 - levenshteinDistance(na, nb) / maxLen;
}

/** Tokens en común (para mensajes legibles). */
export function sharedNameTokens(a, b) {
  const ta = new Set(tokenizePersonName(a));
  const tb = tokenizePersonName(b);
  return tb.filter((t) => ta.has(t));
}
