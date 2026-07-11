import {
  buildCarMetaPatchesAfterSave,
  buildCarMetaSyncPatchesToLinkedCompanions,
  familyHasAnyCarTransport,
} from '../../bautizosCarMeta.js';
import { applyCarMetaPatchesLocally, persistEventCarMetaPatches } from '../../transportCarMetaStore.js';
import { getDocRef } from '../../firebaseRefs.js';
import { saveRegistrationTransport, upsertCarMetaPatchesToTransportV2 } from './transportService.js';

/**
 * Puente registro ↔ transporte v2.
 * - Actualiza plan local de inmediato (UI).
 * - Persiste v2 en Firestore sin bloquear UI ni updateDoc de evento.
 */
export function scheduleRegistrationTransportSave({
  event,
  personData,
  draftMetaByVehicleKey,
  allParticipants,
  patchEventTransportPlanningDeferred,
  updateDoc,
  useBlankSlotMeta = true,
  onError,
  skipLinkedSync = false,
}) {
  if (event?.eventType !== 'Bautizos') return { scheduled: false };
  if (!familyHasAnyCarTransport(personData, personData?.bautizosCompanions)) {
    return { scheduled: false };
  }

  const hostId = String(personData?.id || '').trim();
  const rosterWithNew = hostId ? [...(allParticipants || []), personData] : allParticipants || [];

  const carPatches = buildCarMetaPatchesAfterSave({
    hostPerson: personData,
    companions: personData.bautizosCompanions,
    plan: event.transportPlanning,
    draftMetaByVehicleKey,
    hostId,
    roster: rosterWithNew,
    useBlankSlotMeta,
  });
  const syncPatches = skipLinkedSync
    ? []
    : buildCarMetaSyncPatchesToLinkedCompanions({
    hostPerson: personData,
    hostId,
    companions: personData.bautizosCompanions,
    plan: event.transportPlanning,
    roster: rosterWithNew,
    appliedPatches: carPatches,
  });
  const allPatches = [...carPatches, ...syncPatches];

  if (allPatches.length && typeof patchEventTransportPlanningDeferred === 'function') {
    patchEventTransportPlanningDeferred(
      applyCarMetaPatchesLocally(event.transportPlanning, allPatches, rosterWithNew)
    );
  }

  void (async () => {
    try {
      await saveRegistrationTransport({
        eventId: event.id,
        hostPerson: personData,
        companions: personData.bautizosCompanions,
        plan: event.transportPlanning,
        draftMetaByVehicleKey,
        hostId,
        roster: rosterWithNew,
        useBlankSlotMeta,
        ensureV2: true,
        updateDoc,
      });
      if (syncPatches.length) {
        await persistEventCarMetaPatches({
          eventId: event.id,
          patches: syncPatches,
          currentPlan: event.transportPlanning,
          roster: rosterWithNew,
          getDocRef,
          updateDoc,
        });
        await upsertCarMetaPatchesToTransportV2(event.id, syncPatches);
      }
    } catch (err) {
      if (typeof onError === 'function') onError(err);
      else console.error('[transport-v2] saveRegistrationTransport', err);
    }
  })();

  return { scheduled: true, patchCount: carPatches.length, syncPatchCount: syncPatches.length };
}

export { validateRegistrationTransport } from './transportValidation.js';
