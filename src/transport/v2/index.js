export {
  isTransportV2,
  isTransportV2Plan,
  getFamilyVehicles,
  fetchLegacyCarMetaForTitularV2,
  upsertTransportVehicles,
  saveVehiclePatch,
  saveRegistrationTransport,
  migrateEventTransportToV2,
  markEventTransportV2,
  readEventTransportVersion,
  buildVehicleDocId,
  legacyVehicleKeyFromVehicleDoc,
} from './transportService.js';

export { validateRegistrationTransport } from './transportValidation.js';
export { scheduleRegistrationTransportSave } from './registrationTransportBridge.js';
export { TRANSPORT_MODEL_VERSION } from './transportSchema.js';
