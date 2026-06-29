/** Si el log debe mostrarse en el panel de Actividad (misma regla que createActivityLogListFilter base). */
export function computeLogVisibleInPanel(logLike) {
  if (!logLike) return false;
  if (String(logLike.action || '').trim() === 'WhatsApp') return false;
  if (logLike.isHidden === true) return false;
  if (logLike.isDebug === true) return false;
  return true;
}

/**
 * Campos estructurados extra para el documento de `app_logs` (segunda fuente de verdad).
 * Omite valores vacíos/undefined porque Firestore no acepta `undefined`.
 */
export function buildLogEntityFields({ entityType, entityId, status, hasSnapshot, isError, errorMessage } = {}) {
  const out = {};
  const et = String(entityType || '').trim();
  if (et) out.entityType = et;
  if (entityId != null && String(entityId).trim()) out.entityId = String(entityId).trim();
  const st = String(status || '').trim();
  if (st) out.status = st;
  if (hasSnapshot === true) out.hasSnapshot = true;
  if (isError === true) out.isError = true;
  const em = String(errorMessage || '').trim();
  if (em) out.errorMessage = em.slice(0, 500);
  return out;
}

/** Añade `visibleInPanel` al payload antes de persistir. */
export function withLogVisibleInPanel(logPayload) {
  const p = { ...(logPayload || {}) };
  p.visibleInPanel = computeLogVisibleInPanel(p);
  return p;
}

/**
 * Reduce `revertInfo.previousData` a referencia ligera para no inflar documentos.
 * Conserva campos necesarios para applyRevert.
 */
export function slimRevertInfoForLog(revertInfo) {
  if (!revertInfo || typeof revertInfo !== 'object') return revertInfo;
  const ri = { ...revertInfo };
  if (ri.previousData && typeof ri.previousData === 'object') {
    const pd = ri.previousData;
    ri.previousDataSummary = {
      id: pd.id != null ? String(pd.id) : '',
      name: pd.name != null ? String(pd.name) : '',
      eventId: pd.eventId != null ? String(pd.eventId) : '',
      location: pd.location != null ? String(pd.location) : '',
    };
    delete ri.previousData;
  }
  return ri;
}
