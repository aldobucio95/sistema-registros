import { familyHasAnyCarTransport } from '../../bautizosCarMeta.js';
import { applyCarMetaPatchesLocally } from '../../transportCarMetaStore.js';
import { buildCarMetaPatchesAfterSave } from '../../bautizosCarMeta.js';
import { saveRegistrationTransport } from './transportService.js';

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

  if (carPatches.length && typeof patchEventTransportPlanningDeferred === 'function') {
    patchEventTransportPlanningDeferred(
      applyCarMetaPatchesLocally(event.transportPlanning, carPatches, rosterWithNew)
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
    } catch (err) {
      if (typeof onError === 'function') onError(err);
      else console.error('[transport-v2] saveRegistrationTransport', err);
    }
  })();

  return { scheduled: true, patchCount: carPatches.length };
}

export { validateRegistrationTransport } from './transportValidation.js';
