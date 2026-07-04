import {
  buildMergedFamilyCarInventory,
  familyHasAnyCarTransport,
  getFamilyCarInventoryValidationIssues,
} from '../../bautizosCarMeta.js';

/**
 * Validación de transporte en registro — pura, sin Firestore.
 */
export function validateRegistrationTransport({
  hostPerson,
  companions,
  plan,
  draftMetaByVehicleKey,
  useBlankSlotMeta = true,
}) {
  if (!familyHasAnyCarTransport(hostPerson, companions)) {
    return { ok: true, issues: [] };
  }
  const inventory = buildMergedFamilyCarInventory({
    hostPerson,
    companions: companions || [],
    plan,
    hostSourceKey: 'p:draft-host',
    draftMetaByVehicleKey: draftMetaByVehicleKey || {},
    useBlankSlotMeta,
  });
  const issues = getFamilyCarInventoryValidationIssues(inventory, {
    hostPerson,
    companions: companions || [],
  });
  return { ok: issues.length === 0, issues };
}
