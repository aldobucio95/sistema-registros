import {
  deleteDoc,
  getCountFromServer,
  getDocsFromServer,
  limit,
  orderBy,
  query,
} from 'firebase/firestore';
import { getColRef, getDocRef } from './firebaseRefs.js';
import { LOG_SNAPSHOTS_COLLECTION, LOG_REVERTS_COLLECTION } from './activityLogCore.js';

/**
 * Elimina los registros más antiguos de `app_logs` hasta quedar `limitTarget` documentos.
 * Requiere permiso `delete` en Firestore (usuarios del panel, no sesión anónima QR).
 */
export async function trimActivityLogsToStorageLimit(limitTarget, orderField = 'createdAt') {
  const col = getColRef('app_logs');
  const countSnap = await getCountFromServer(col);
  let toDelete = Number(countSnap?.data?.().count || 0) - limitTarget;
  let deleted = 0;
  while (toDelete > 0) {
    const take = Math.min(300, toDelete);
    const qOld = query(col, orderBy(orderField, 'asc'), limit(take));
    const oldSnap = await getDocsFromServer(qOld);
    if (oldSnap.empty) break;
    let deletedNow = 0;
    for (const ds of oldSnap.docs) {
      await deleteDoc(ds.ref);
      // Cascada: borra snapshot y revert asociados (no-op si no existen).
      await Promise.allSettled([
        deleteDoc(getDocRef(LOG_SNAPSHOTS_COLLECTION, ds.id)),
        deleteDoc(getDocRef(LOG_REVERTS_COLLECTION, ds.id)),
      ]);
      deletedNow += 1;
    }
    deleted += deletedNow;
    toDelete -= deletedNow;
    if (deletedNow === 0) break;
  }
  return { deleted };
}

export function isLogsTrimPermissionError(err) {
  const code = String(err?.code || '');
  return code === 'permission-denied' || code === 'PERMISSION_DENIED';
}
