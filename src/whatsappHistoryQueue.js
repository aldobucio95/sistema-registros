/**
 * Historial de WhatsApp y reactivación de cola al eliminar entradas (SuperUsuario).
 */

export function whatsAppHistoryEntryId(token) {
  return String(token?.id || '').trim();
}

/** Quita una entrada del historial por id. */
export function removeWhatsAppHistoryEntry(history, tokenId) {
  const id = String(tokenId || '').trim();
  if (!id) return Array.isArray(history) ? [...history] : [];
  return (Array.isArray(history) ? history : []).filter((t) => whatsAppHistoryEntryId(t) !== id);
}

/**
 * Marca como no enviados los avisos de cola referenciados en un token `finance_queue_merge`.
 * Conserva el payload completo en `whatsAppFinanceNotifications` cuando existe por id.
 */
export function reactivateQueueFromHistoryToken(existingNotifications, historyToken) {
  if (String(historyToken?.kind || '') !== 'finance_queue_merge') {
    return Array.isArray(existingNotifications) ? existingNotifications : [];
  }
  const items = Array.isArray(historyToken?.items) ? historyToken.items : [];
  if (!items.length) return Array.isArray(existingNotifications) ? existingNotifications : [];

  const arr = Array.isArray(existingNotifications) ? existingNotifications.map((n) => ({ ...n })) : [];
  const itemIds = new Set(items.map((i) => String(i?.id || '').trim()).filter(Boolean));

  for (let i = 0; i < arr.length; i += 1) {
    const nid = String(arr[i]?.id || '').trim();
    if (!nid || !itemIds.has(nid) || !arr[i]?.sent) continue;
    const next = { ...arr[i], sent: false, sentAt: null };
    if (String(next?.kind || '') === 'datos_carro') {
      delete next.carDataWaSnoozedUntil;
    }
    arr[i] = next;
  }

  for (const item of items) {
    const nid = String(item?.id || '').trim();
    if (!nid || arr.some((n) => String(n?.id || '').trim() === nid)) continue;
    const revived = { ...item, sent: false, sentAt: null };
    if (String(revived?.kind || '') === 'datos_carro') {
      delete revived.carDataWaSnoozedUntil;
    }
    arr.push(revived);
  }

  return arr;
}

/** Cuenta avisos que quedarían pendientes tras reactivar (para feedback UI). */
export function countReactivatedUnsentNotifications(existingNotifications, historyToken) {
  const next = reactivateQueueFromHistoryToken(existingNotifications, historyToken);
  const before = (Array.isArray(existingNotifications) ? existingNotifications : []).filter((n) => n && !n.sent).length;
  const after = next.filter((n) => n && !n.sent).length;
  return Math.max(0, after - before);
}
