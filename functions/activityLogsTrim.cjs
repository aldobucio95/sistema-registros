/**
 * Recorte de `app_logs` en servidor (Admin SDK, batches).
 */
const FIRESTORE_BATCH_LIMIT = 500;

function computeLogVisibleInPanel(data) {
  if (!data) return false;
  if (String(data.action || '').trim() === 'WhatsApp') return false;
  if (data.isHidden === true) return false;
  if (data.isDebug === true) return false;
  return true;
}

/**
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {number} limitTarget
 * @param {string} [orderField='createdAt']
 */
async function trimActivityLogsToLimit(db, limitTarget, orderField = 'createdAt') {
  const col = db.collection('app_logs');
  const countSnap = await col.count().get();
  let toDelete = Number(countSnap.data().count || 0) - limitTarget;
  let deleted = 0;

  while (toDelete > 0) {
    const take = Math.min(300, toDelete);
    const snap = await col.orderBy(orderField, 'asc').limit(take).get();
    if (snap.empty) break;

    const refs = [];
    let deletedNow = 0;
    for (const docSnap of snap.docs) {
      if (docSnap.data()?.revertInfo?.isBackup) continue;
      deletedNow += 1;
      // Cascada: borra también el snapshot lateral y el revert asociados (mismo id).
      refs.push(docSnap.ref);
      refs.push(db.collection('app_log_snapshots').doc(docSnap.id));
      refs.push(db.collection('app_log_reverts').doc(docSnap.id));
    }
    for (let i = 0; i < refs.length; i += FIRESTORE_BATCH_LIMIT) {
      const batch = db.batch();
      for (const ref of refs.slice(i, i + FIRESTORE_BATCH_LIMIT)) {
        batch.delete(ref);
      }
      await batch.commit();
    }
    deleted += deletedNow;
    toDelete -= deletedNow;
    if (deletedNow === 0) break;
  }
  return { deleted };
}

/**
 * Backfill `visibleInPanel` en documentos existentes (paginado).
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {number} [maxDocs=5000]
 */
async function backfillLogVisibleInPanel(db, maxDocs = 5000) {
  const col = db.collection('app_logs');
  let updated = 0;
  let lastDoc = null;
  const cap = Math.min(50000, Math.max(1, Math.floor(Number(maxDocs) || 5000)));

  while (updated < cap) {
    let q = col.orderBy('createdAt', 'desc').limit(500);
    if (lastDoc) q = col.orderBy('createdAt', 'desc').startAfter(lastDoc).limit(500);
    const snap = await q.get();
    if (snap.empty) break;

    const batch = db.batch();
    let batchOps = 0;
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      const next = computeLogVisibleInPanel(data);
      if (data.visibleInPanel === next) continue;
      batch.update(docSnap.ref, { visibleInPanel: next });
      batchOps += 1;
      updated += 1;
      if (updated >= cap) break;
    }
    if (batchOps > 0) await batch.commit();
    lastDoc = snap.docs[snap.docs.length - 1];
    if (snap.size < 500) break;
  }
  return { updated };
}

module.exports = {
  trimActivityLogsToLimit,
  backfillLogVisibleInPanel,
  computeLogVisibleInPanel,
};
