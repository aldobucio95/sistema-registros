import { docIdToVehicleKey, vehicleKeyToDocId } from '../../transportCarMetaStore.js';
import { buildCarMetaPatchesAfterSave } from '../../bautizosCarMeta.js';
import {
  buildVehicleDocId,
  legacyVehicleKeyFromVehicleDoc,
  vehicleDocIdFromLegacyKey,
} from './transportSchema.js';
import {
  legacyPatchToVehicleDoc,
  normalizeTransportVehicleDoc,
  transportVehicleToLegacyMeta,
  vehicleDocNeedsPersist,
} from './transportVehicleModel.js';

/** Parches v1 → documentos v2 para persistencia. */
export function v1PatchesToV2VehicleDocs(eventId, patches, ownerParticipantId) {
  const eid = String(eventId || '').trim();
  const owner = String(ownerParticipantId || '').trim();
  return (patches || [])
    .map((item) => {
      const legacyKey = String(item?.vehicleKey || '').trim();
      const patch = item?.patch;
      if (!legacyKey || !patch) return null;
      const vehicleDocId = legacyKey.includes('|c')
        ? vehicleDocIdFromLegacyKey(legacyKey)
        : buildVehicleDocId(owner, 1);
      const { carIndex } = normalizeTransportVehicleDoc({ id: vehicleDocId });
      return legacyPatchToVehicleDoc({
        eventId: eid,
        ownerParticipantId: owner || vehicleDocId.split('__c')[0],
        carIndex,
        patch,
        vehicleDocId,
      });
    })
    .filter(Boolean);
}

/** Mapa legacy `vehicleKey → meta` desde docs v2 (para UI v1). */
export function v2VehicleDocsToLegacyMetaMap(vehicles) {
  const out = {};
  for (const raw of vehicles || []) {
    const v = normalizeTransportVehicleDoc(raw);
    const legacyKey = legacyVehicleKeyFromVehicleDoc(v.ownerParticipantId, v.carIndex);
    out[legacyKey] = transportVehicleToLegacyMeta(v);
  }
  return out;
}

/** Construye parches v1 desde registro (reutiliza lógica existente) y convierte a v2. */
export function buildRegistrationV2Vehicles({
  eventId,
  hostPerson,
  companions,
  plan,
  draftMetaByVehicleKey,
  hostId,
  roster,
  useBlankSlotMeta = true,
}) {
  const patches = buildCarMetaPatchesAfterSave({
    hostPerson,
    companions,
    plan,
    draftMetaByVehicleKey,
    hostId,
    roster,
    useBlankSlotMeta,
  });
  const docs = v1PatchesToV2VehicleDocs(eventId, patches, hostId);
  return docs.filter((d) => vehicleDocNeedsPersist(d));
}

/** Migra entrada de subcolección v1 `transport_car_meta` a doc v2. */
export function v1CarMetaSubdocToV2Vehicle(eventId, vehicleDocId, rawMeta) {
  const legacyKey = docIdToVehicleKey(vehicleDocId);
  const ownerParticipantId = legacyKey.startsWith('p:')
    ? legacyKey.slice(2).split('|c')[0]
    : legacyKey.split('|c')[0];
  const carPart = legacyKey.includes('|c') ? legacyKey.split('|c')[1] : '1';
  return legacyPatchToVehicleDoc({
    eventId,
    ownerParticipantId,
    carIndex: parseInt(carPart, 10) || 1,
    patch: rawMeta,
    vehicleDocId: vehicleDocIdFromLegacyKey(legacyKey) || buildVehicleDocId(ownerParticipantId, carPart),
  });
}

export { vehicleKeyToDocId, vehicleDocIdFromLegacyKey };
