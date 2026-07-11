import React, { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X } from 'lucide-react';
import BautizosCarDataForm from './BautizosCarDataForm.jsx';
import { uiButtons, uiModal } from '../../ui/uiFormatClasses.js';
import {
  buildBautizosFamilyCarInventory,
  carCrewRequiresPassengerSelection,
  familyCarInventoryNeedsAttention,
  manualGroupCrewRequiresPassengers,
  getFamilyCarInventoryValidationIssues,
  inventoryToCarMetaPatches,
  markAllEmptyAsPending,
  normalizeCarVehicleMeta,
} from '../../bautizosCarMeta.js';

/**
 * Modal para capturar o completar datos de vehículos y tripulación antes de guardar.
 */
export default function BautizosCarDataPromptModal({
  isOpen,
  isSubmitting = false,
  hostPerson,
  companions,
  companionsForCrew,
  plan,
  hostSourceKey,
  manualGroupMemberCount = 0,
  draftCompanionKeys,
  initialDraftMetaByVehicleKey = {},
  colorSuggestions = [],
  canEdit = true,
  onCancel,
  onConfirm,
}) {
  const [draftMetaByVehicleKey, setDraftMetaByVehicleKey] = useState(initialDraftMetaByVehicleKey);
  const [validationIssues, setValidationIssues] = useState([]);

  const handleSlotMetaChange = useCallback((vehicleKey, patch) => {
    setDraftMetaByVehicleKey((prev) => {
      const cur = normalizeCarVehicleMeta(prev[vehicleKey] || {});
      return { ...prev, [vehicleKey]: normalizeCarVehicleMeta({ ...cur, ...patch }) };
    });
  }, []);

  const mergedInventory = useMemo(() => {
    const base = buildBautizosFamilyCarInventory({
      hostPerson,
      companions,
      plan,
      hostSourceKey,
      draftCompanionKeys,
    });
    return base.map((slot) => ({
      ...slot,
      meta: normalizeCarVehicleMeta({
        ...slot.meta,
        ...(draftMetaByVehicleKey[slot.vehicleKey] || {}),
      }),
    }));
  }, [hostPerson, companions, plan, hostSourceKey, draftCompanionKeys, draftMetaByVehicleKey]);

  const crewContext = useMemo(() => {
    const crewCompanions = companionsForCrew ?? companions;
    const requiresPassengers =
      manualGroupMemberCount > 1
        ? manualGroupCrewRequiresPassengers(manualGroupMemberCount)
        : carCrewRequiresPassengerSelection(hostPerson, crewCompanions);
    return { hostPerson, companions: crewCompanions, requiresPassengers };
  }, [hostPerson, companions, companionsForCrew, manualGroupMemberCount]);

  const needsAttention = familyCarInventoryNeedsAttention(mergedInventory, crewContext);

  if (!isOpen) return null;

  const handleSave = () => {
    if (isSubmitting) return;
    if (!needsAttention) {
      onConfirm?.([]);
      return;
    }
    const issues = getFamilyCarInventoryValidationIssues(mergedInventory, crewContext);
    if (issues.length) {
      setValidationIssues(issues);
      return;
    }
    setValidationIssues([]);
    onConfirm?.(inventoryToCarMetaPatches(mergedInventory));
  };

  const handleMarkPending = () => {
    if (isSubmitting) return;
    setValidationIssues([]);
    const nextDraft = { ...draftMetaByVehicleKey };
    const crewOpts = {
      requiresPassengers: crewContext.requiresPassengers,
    };
    for (const slot of mergedInventory) {
      if (slot.meta?.maybeAbsent) continue;
      const merged = normalizeCarVehicleMeta({
        ...slot.meta,
        ...(nextDraft[slot.vehicleKey] || {}),
      });
      nextDraft[slot.vehicleKey] = markAllEmptyAsPending(merged, crewOpts);
    }
    setDraftMetaByVehicleKey(nextDraft);
    const pendingInventory = mergedInventory.map((slot) => ({
      ...slot,
      meta: markAllEmptyAsPending(
        normalizeCarVehicleMeta({ ...slot.meta, ...(nextDraft[slot.vehicleKey] || {}) }),
        crewOpts
      ),
    }));
    onConfirm?.(inventoryToCarMetaPatches(pendingInventory));
  };

  const modal = (
    <div className={uiModal.overlayNested} role="dialog" aria-modal="true" aria-labelledby="bautizos-car-data-title">
      <button type="button" className={uiModal.backdrop} onClick={onCancel} aria-label="Cerrar" />
      <div
        className={`${uiModal.panelMd} p-0`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
          <div>
            <h2 id="bautizos-car-data-title" className="text-sm font-black text-slate-800 dark:text-slate-100">
              Datos de vehículos y tripulación
            </h2>
            {needsAttention ? (
              <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 mt-0.5">
                Hay información de carro o tripulación incompleta.
              </p>
            ) : null}
          </div>
          <button type="button" className={uiButtons.closeIcon} onClick={onCancel} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {validationIssues.length > 0 ? (
            <div className="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50/80 dark:bg-rose-950/30 p-3">
              <p className="text-[10px] font-black uppercase text-rose-700 dark:text-rose-300 mb-1">
                Complete cada rubro o márquelo como pendiente
              </p>
              <ul className="text-xs text-rose-800 dark:text-rose-200 space-y-0.5 list-disc pl-4">
                {validationIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <BautizosCarDataForm
            hostPerson={hostPerson}
            companions={companions}
            plan={plan}
            hostSourceKey={hostSourceKey}
            draftCompanionKeys={draftCompanionKeys}
            draftMetaByVehicleKey={draftMetaByVehicleKey}
            canEdit={canEdit}
            showMaybeAbsent={false}
            colorSuggestions={colorSuggestions}
            onSlotMetaChange={(vehicleKey, patch) => {
              setValidationIssues([]);
              handleSlotMetaChange(vehicleKey, patch);
            }}
          />
        </div>

        <div className="sticky bottom-0 flex flex-wrap gap-2 justify-end px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
          {isSubmitting ? (
            <p className="mr-auto inline-flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <Loader2 size={14} className="animate-spin shrink-0" aria-hidden />
              Guardando abono…
            </p>
          ) : null}
          <button type="button" className={uiButtons.secondary} onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </button>
          <button type="button" className={uiButtons.secondary} onClick={handleMarkPending} disabled={isSubmitting}>
            Marcar pendiente y continuar
          </button>
          <button type="button" className={uiButtons.primary} onClick={handleSave} disabled={isSubmitting}>
            Guardar y continuar
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal;
}
