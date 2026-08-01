/**
 * Helpers for activity-log revert writes.
 *
 * Some call sites store a field-level patch in `previousData` (e.g. only
 * `{ baptismShirtSize }` or `{ transportPlanning }`). Applying that with
 * `setDoc` without merge replaces the whole Firestore document and destroys
 * identity, payments, event config, etc.
 */

/**
 * @param {unknown} previousData
 * @param {string} collectionName
 * @returns {boolean} true when previousData looks like a field patch, not a full doc
 */
export function isPartialRevertPreviousData(previousData, collectionName) {
  if (!previousData || typeof previousData !== 'object' || Array.isArray(previousData)) {
    return true;
  }
  const col = String(collectionName || '');
  const keys = Object.keys(previousData);

  if (col === 'app_participants') {
    // Full participant snapshots always carry eventId when written by the app.
    const eventId = previousData.eventId;
    return eventId == null || String(eventId).trim() === '';
  }

  if (col === 'app_events') {
    // Full event snapshots include name and/or eventType.
    const name = previousData.name;
    const eventType = previousData.eventType;
    const hasName = name != null && String(name).trim() !== '';
    const hasType = eventType != null && String(eventType).trim() !== '';
    return !hasName && !hasType;
  }

  if (col === 'app_data') {
    // Config docs are large; field patches are tiny (e.g. customCarCatalog only).
    return keys.length > 0 && keys.length <= 3 && !('dataBulkGeneration' in previousData) && !('isDebugMode' in previousData);
  }

  if (col === 'app_expenses' || col === 'app_donations') {
    return previousData.id == null && previousData.amount == null && previousData.paidAmount == null;
  }

  // Generic: tiny objects without an id are treated as patches.
  return keys.length > 0 && keys.length <= 3 && previousData.id == null;
}

/**
 * Decide how an update revert should be written.
 * @returns {{ mode: 'replace', payload: object } | { mode: 'merge', payload: object }}
 */
export function planRevertUpdateWrite(previousData, collectionName, currentData, docId, mergeAppEventDocForRevert) {
  const prev = previousData && typeof previousData === 'object' ? previousData : {};
  const partial = isPartialRevertPreviousData(prev, collectionName);

  if (partial) {
    return { mode: 'merge', payload: prev };
  }

  if (collectionName === 'app_events' && typeof mergeAppEventDocForRevert === 'function') {
    return {
      mode: 'replace',
      payload: mergeAppEventDocForRevert(prev, currentData && typeof currentData === 'object' ? currentData : {}, docId),
    };
  }

  return { mode: 'replace', payload: prev };
}
