import { describeListDiff, formatFieldChange, truncateActivityLogDetails } from './activityLogDiff.js';

/** Diff legible de listas de strings (categorías, opciones de área, etc.). */
export function describeStringListConfigChange(prevList, nextList, label) {
  const prev = (Array.isArray(prevList) ? prevList : []).map((s) => String(s).trim()).filter(Boolean);
  const next = (Array.isArray(nextList) ? nextList : []).map((s) => String(s).trim()).filter(Boolean);
  const prevSet = new Set(prev.map((s) => s.toLowerCase()));
  const nextSet = new Set(next.map((s) => s.toLowerCase()));
  const added = next.filter((s) => !prevSet.has(s.toLowerCase()));
  const removed = prev.filter((s) => !nextSet.has(s.toLowerCase()));
  if (!added.length && !removed.length && prev.length === next.length) return null;
  const parts = [];
  if (removed.length) {
    const sample = removed.slice(0, 3).join(', ');
    parts.push(`quitó ${removed.length}${sample ? `: ${sample}` : ''}${removed.length > 3 ? '…' : ''}`);
  }
  if (added.length) {
    const sample = added.slice(0, 3).join(', ');
    parts.push(`añadió ${added.length}${sample ? `: ${sample}` : ''}${added.length > 3 ? '…' : ''}`);
  }
  if (!parts.length) {
    const diff = describeListDiff(prev, next, label, (x) => String(x).trim().toLowerCase());
    if (diff) return diff;
    return `${label} (${prev.length}→${next.length})`;
  }
  return truncateActivityLogDetails(`${label} (${prev.length}→${next.length}, ${parts.join('; ')})`);
}

export function describeCampaBreakdownLineAdded(concept, qty, unitCost, totalLines) {
  const subtotal = (Number(qty) || 0) * (Number(unitCost) || 0);
  return truncateActivityLogDetails(
    `Costo real Campa: añadió «${String(concept || '').trim()}» (${qty} × $${unitCost} = $${subtotal.toFixed(2)}) · ${totalLines} concepto${totalLines !== 1 ? 's' : ''} en desglose.`
  );
}

export function describeCampaBreakdownLineRemoved(concept, totalLines) {
  return truncateActivityLogDetails(
    `Costo real Campa: eliminó «${String(concept || '').trim()}» · ${totalLines} concepto${totalLines !== 1 ? 's' : ''} restante${totalLines !== 1 ? 's' : ''}.`
  );
}

export function describeCampaManualDivisorChange(prevVal, nextVal) {
  const prev = prevVal == null || prevVal === '' ? 'automático' : String(prevVal);
  const next = nextVal == null || nextVal === '' ? 'automático' : String(nextVal);
  return formatFieldChange('Divisor manual costo real Campa', prev, next);
}
