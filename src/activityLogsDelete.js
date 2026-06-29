import {
  deleteDoc,
  getDocsFromServer,
  limit,
  orderBy,
  query,
  startAfter,
  writeBatch,
} from 'firebase/firestore';
import { db, getColRef, getDocRef } from './firebaseRefs.js';
import { LOG_SNAPSHOTS_COLLECTION, LOG_REVERTS_COLLECTION } from './activityLogCore.js';

const FIRESTORE_BATCH_LIMIT = 500;

/**
 * Refs en cascada para un log: el doc principal + su snapshot lateral + su revert.
 * Borrar docs inexistentes en un batch es no-op, así que siempre se incluyen.
 */
function cascadeRefsForLogId(id) {
  const logId = String(id || '').trim();
  if (!logId) return [];
  return [
    getDocRef('app_logs', logId),
    getDocRef(LOG_SNAPSHOTS_COLLECTION, logId),
    getDocRef(LOG_REVERTS_COLLECTION, logId),
  ];
}

/**
 * Borra referencias en lotes de hasta 500 (límite writeBatch).
 * @param {import('firebase/firestore').Firestore} db
 * @param {import('firebase/firestore').DocumentReference[]} refs
 */
export async function commitDeleteRefsInBatches(firestoreDb, refs) {
  const database = firestoreDb || db;
  const validRefs = (refs || []).filter((r) => r && typeof r.path === 'string' && r.path.includes('/'));
  if (!validRefs.length) return 0;
  let deleted = 0;
  for (let i = 0; i < validRefs.length; i += FIRESTORE_BATCH_LIMIT) {
    const batch = writeBatch(database);
    const slice = validRefs.slice(i, i + FIRESTORE_BATCH_LIMIT);
    for (const r of slice) batch.delete(r);
    await batch.commit();
    deleted += slice.length;
  }
  return deleted;
}

/**
 * Pagina por `orderField asc` y borra hasta `maxDelete` documentos que pasen `shouldDelete`.
 * @returns {{ deleted: number, skippedBackup: number }}
 */
export async function deleteOldestLogsByCount({
  db: firestoreDb,
  orderField = 'createdAt',
  maxDelete,
  shouldDelete = () => true,
  pageSize = 300,
}) {
  const col = getColRef('app_logs');
  let deleted = 0;
  let skippedBackup = 0;
  let lastSnap = null;
  const target = Math.max(1, Math.floor(Number(maxDelete) || 0));

  while (deleted < target) {
    const take = Math.min(pageSize, target - deleted + 40);
    const q = lastSnap
      ? query(col, orderBy(orderField, 'asc'), startAfter(lastSnap), limit(take))
      : query(col, orderBy(orderField, 'asc'), limit(take));
    const snap = await getDocsFromServer(q);
    if (snap.empty) break;

    const refsToDelete = [];
    let pickedThisPage = 0;
    for (const docSnap of snap.docs) {
      if (deleted + pickedThisPage >= target) break;
      const data = docSnap.data();
      if (data?.revertInfo?.isBackup) {
        skippedBackup += 1;
        continue;
      }
      if (!shouldDelete(data, docSnap)) continue;
      pickedThisPage += 1;
      // Cascada: borra también snapshot y revert asociados al mismo id.
      refsToDelete.push(docSnap.ref);
      refsToDelete.push(getDocRef(LOG_SNAPSHOTS_COLLECTION, docSnap.id));
      refsToDelete.push(getDocRef(LOG_REVERTS_COLLECTION, docSnap.id));
    }

    if (refsToDelete.length) {
      await commitDeleteRefsInBatches(firestoreDb, refsToDelete);
      deleted += pickedThisPage;
    }

    lastSnap = snap.docs[snap.docs.length - 1];
    if (snap.docs.length < take) break;
  }

  return { deleted, skippedBackup };
}

/** Borra documentos cuyo id está en el conjunto dado, en cascada (log + snapshot + revert). */
export async function deleteLogsByIds(firestoreDb, logIds) {
  const ids = [...new Set((logIds || []).map((id) => String(id).trim()).filter(Boolean))];
  if (!ids.length) return 0;
  const refs = ids.flatMap((id) => cascadeRefsForLogId(id));
  await commitDeleteRefsInBatches(firestoreDb, refs);
  return ids.length;
}

/** Borra un documento (compatibilidad puntual), en cascada con su snapshot y revert. */
export async function deleteLogById(logId) {
  const id = String(logId || '').trim();
  if (!id) return;
  await deleteDoc(getDocRef('app_logs', id));
  await Promise.allSettled([
    deleteDoc(getDocRef(LOG_SNAPSHOTS_COLLECTION, id)),
    deleteDoc(getDocRef(LOG_REVERTS_COLLECTION, id)),
  ]);
}
