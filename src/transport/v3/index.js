export {
  TRANSPORT_MODEL_VERSION_V3,
  makeCarUnitId,
  isCarUnitId,
  isTransportV3Plan,
} from './transportSchema.js';

export {
  normalizeCarUnitDoc,
  normalizeCarUnitPlanEntry,
  blankCarUnitDoc,
  buildCarUnitSummaryEntry,
  carUnitDocNeedsAttention,
  patchCarUnitDoc,
  carAssignFromUnitDocs,
} from './transportCarUnitModel.js';

export {
  fetchCarUnitDoc,
  fetchAllCarUnitDocs,
  saveCarUnitPatch,
  upsertCarUnitDocs,
  deleteCarUnitDoc,
  persistCarUnitSummaries,
  markEventTransportV3,
  applyCrewToCarUnitDoc,
} from './transportCarUnitService.js';

export { migrateEventTransportToV3 } from './transportMigration.js';
