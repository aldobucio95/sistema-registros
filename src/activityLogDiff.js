/** Utilidades para textos de auditoría before→after. */

export const ACTIVITY_LOG_DETAILS_MAX = 1500;

export function formatLogScalar(v) {
  if (v === true) return 'Sí';
  if (v === false) return 'No';
  if (v === undefined || v === null || v === '') return '—';
  return String(v);
}

/** Normaliza un valor escalar para comparar si dos campos son equivalentes en auditoría. */
export function normalizeLogCompareScalar(v) {
  if (v === true) return 'Sí';
  if (v === false) return 'No';
  if (v === undefined || v === null || v === '') return '';
  return String(v).trim().normalize('NFC').replace(/\s+/g, ' ');
}

/** Dos valores escalan como el mismo cambio legible (ignora NFC, espacios, 36 vs "36"). */
export function logScalarsEquivalent(prev, next) {
  const a = normalizeLogCompareScalar(prev);
  const b = normalizeLogCompareScalar(next);
  if (a === b) return true;
  if (a === '' && b === '') return true;
  const na = Number(a);
  const nb = Number(b);
  if (a !== '' && b !== '' && Number.isFinite(na) && Number.isFinite(nb)) return na === nb;
  return formatLogScalar(prev) === formatLogScalar(next);
}

/** `Etiqueta (antes → después)` */
export function formatFieldChange(label, prev, next) {
  return `${label} (${formatLogScalar(prev)} → ${formatLogScalar(next)})`;
}

/**
 * Diff de listas por clave estable; devuelve segmentos agregados/eliminados.
 */
export function describeListDiff(prevList, nextList, label, keyFn = (x) => String(x)) {
  const prev = Array.isArray(prevList) ? prevList : [];
  const next = Array.isArray(nextList) ? nextList : [];
  const prevKeys = prev.map(keyFn);
  const nextKeys = next.map(keyFn);
  const nextSet = new Set(nextKeys);
  const prevSet = new Set(prevKeys);
  const added = next.filter((item, i) => !prevSet.has(nextKeys[i]));
  const removed = prev.filter((item, i) => !nextSet.has(prevKeys[i]));
  if (!added.length && !removed.length) return null;
  const parts = [];
  if (removed.length) parts.push(`quitó ${removed.length}`);
  if (added.length) parts.push(`añadió ${added.length}`);
  return `${label} (${prev.length}→${next.length}, ${parts.join(', ')})`;
}

/** Trunca texto para campo details de Firestore. */
export function truncateActivityLogDetails(text, max = ACTIVITY_LOG_DETAILS_MAX) {
  const s = String(text || '').trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 20).trim()}… (ver snapshot)`;
}

/** Diff legible desde snapshot `abono`. */
export function describeAbonoSnapshot(snapshot) {
  if (!snapshot || snapshot.kind !== 'abono') return null;
  const parts = [];
  if (snapshot.personName) parts.push(`Participante: ${snapshot.personName}`);
  if (snapshot.location) parts.push(`Sede: ${snapshot.location}`);
  if (snapshot.addedAmount != null) parts.push(`Abono: $${snapshot.addedAmount}`);
  if (snapshot.paymentMethod) parts.push(`Método: ${snapshot.paymentMethod}`);
  if (snapshot.paymentService) parts.push(`Servicio: ${snapshot.paymentService}`);
  if (snapshot.paidBefore != null && snapshot.paidAfter != null) {
    parts.push(`Pagado (${snapshot.paidBefore} → ${snapshot.paidAfter})`);
  }
  if (snapshot.isLiquidado) parts.push('[LIQUIDADO]');
  return parts.length ? parts.join(' · ') : null;
}
