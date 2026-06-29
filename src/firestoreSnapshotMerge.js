/**
 * Utilidades para listeners de Firestore: menos trabajo en el cliente y menos
 * re-renderizados cuando el snapshot no incluye cambios en documentos (p. ej. solo metadatos).
 */

/**
 * @param {import('firebase/firestore').QuerySnapshot} snap
 * @returns {boolean}
 */
export function querySnapshotHasDocChanges(snap) {
  return snap.docChanges().length > 0;
}

/**
 * Aplica solo los `docChanges()` del snapshot sobre el estado previo (Map por id).
 * @template T
 * @param {T[]|null|undefined} prev
 * @param {import('firebase/firestore').QuerySnapshot} snap
 * @param {(d: import('firebase/firestore').QueryDocumentSnapshot) => T} rowFromDoc
 * @returns {T[]|null} Nuevo array, o `null` si no hubo cambios en documentos (mantener estado anterior).
 */
export function mergeRowsByDocChanges(prev, snap, rowFromDoc) {
  const changes = snap.docChanges();
  if (changes.length === 0) return null;
  const m = new Map((prev ?? []).map((r) => [String(r.id), r]));
  for (const ch of changes) {
    const id = String(ch.doc.id);
    if (ch.type === 'removed') m.delete(id);
    else m.set(id, rowFromDoc(ch.doc));
  }
  return [...m.values()];
}
