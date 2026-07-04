import { getDocs, writeBatch } from 'firebase/firestore';
import { db, getDocRef, getTransportCarMetaColRef, getTransportVehiclesColRef, getTransportVehicleDocRef } from '../../firebaseRefs.js';
import { docIdToVehicleKey } from '../../transportCarMetaStore.js';
import { TRANSPORT_MODEL_VERSION } from './transportSchema.js';
import { normalizeTransportVehicleDoc } from './transportVehicleModel.js';
import { v1CarMetaSubdocToV2Vehicle } from './transportLegacyAdapter.js';

/**
 * Copia `transport_car_meta` → `transport_vehicles` y marca evento v2.
 */
export async function migrateEventTransportToV2(eventId, { updateDoc, getDocRef: getDocRefFn = getDocRef } = {}) {
  const eid = String(eventId || '').trim();
  if (!eid || typeof updateDoc !== 'function') {
    return { migrated: false, count: 0, reason: 'missing_params' };
  }

  const v1Snap = await getDocs(getTransportCarMetaColRef(eid));
  if (v1Snap.empty) {
    await updateDoc(getDocRefFn('app_events', eid), {
      'transportPlanning.transportVersion': TRANSPORT_MODEL_VERSION,
    });
    return { migrated: true, count: 0, reason: 'empty_v1_marked_v2' };
  }

  const batch = writeBatch(db);
  let count = 0;
  for (const d of v1Snap.docs) {
    const vehicle = normalizeTransportVehicleDoc(
      v1CarMetaSubdocToV2Vehicle(eid, d.id, d.data()),
      d.id
    );
    if (!vehicle.id) continue;
    batch.set(getTransportVehicleDocRef(eid, vehicle.id), vehicle, { merge: true });
    count += 1;
  }

  await batch.commit();
  await updateDoc(getDocRefFn('app_events', eid), {
    'transportPlanning.transportVersion': TRANSPORT_MODEL_VERSION,
  });

  return { migrated: true, count, reason: 'copied_from_v1' };
}

export function isTransportV2Plan(plan) {
  return Number(plan?.transportVersion) >= TRANSPORT_MODEL_VERSION;
}

/** Lista claves legacy migradas (para diagnóstico). */
export function listLegacyKeysFromV1Snapshot(docs) {
  return (docs || []).map((d) => docIdToVehicleKey(d.id));
}
