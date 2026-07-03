import React, { useCallback, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Car, Loader2 } from 'lucide-react';
import BautizosCarDataForm from './components/transport/BautizosCarDataForm.jsx';
import {
  buildBautizosFamilyCarInventory,
  carCrewRequiresPassengerSelection,
  familyCarInventoryNeedsAttention,
  familyHasAnyCarTransport,
  manualGroupCrewRequiresPassengers,
  resolveLinkedCompanionCarInheritance,
  resolveManualCarGroupContext,
} from './bautizosCarMeta.js';
import {
  fetchCarMetaForTitular,
  mergeCarMetaCacheIntoPlan,
  titularSummaryNeedsAttention,
} from './transportCarMetaStore.js';

/**
 * Sección colapsable «Datos de carros» en registro Bautizos (titular + acompañantes).
 * Meta de vehículo: lectura bajo demanda desde subcolección al expandir.
 */
export function BautizosCarDataSection({
  hostPerson,
  companions,
  plan,
  hostSourceKey = 'p:draft-host',
  eventId = null,
  draftMetaByVehicleKey = {},
  onDraftMetaChange,
  canEdit = true,
  eventLike = null,
  sectionClass = 'rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/50 p-3',
  sectionTitle = 'Datos de carros',
  colorSuggestions = [],
  onHostCarCountChange,
  onCompanionCarCountChange,
  onDraftMetaPrune,
  labelClasses = 'text-[10px] font-bold text-slate-600 dark:text-slate-300',
  roster = null,
  inheritLinkedCarData,
  onInheritLinkedCarDataChange,
}) {
  const [open, setOpen] = useState(false);
  const [loadedMetaByKey, setLoadedMetaByKey] = useState({});
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [metaFetched, setMetaFetched] = useState(false);

  const planForInventory = useMemo(
    () => mergeCarMetaCacheIntoPlan(plan, loadedMetaByKey),
    [plan, loadedMetaByKey]
  );

  const loadCarMetaIfNeeded = useCallback(async () => {
    const eid = String(eventId || '').trim();
    const owner = String(hostSourceKey || '').trim();
    if (!eid || !owner || metaFetched) return;
    setLoadingMeta(true);
    try {
      const fetched = await fetchCarMetaForTitular(eid, owner);
      if (Object.keys(fetched).length) {
        setLoadedMetaByKey((prev) => ({ ...prev, ...fetched }));
      }
      setMetaFetched(true);
    } finally {
      setLoadingMeta(false);
    }
  }, [eventId, hostSourceKey, metaFetched]);

  const handleToggleOpen = () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen) void loadCarMetaIfNeeded();
  };

  if (!familyHasAnyCarTransport(hostPerson, companions, eventLike)) return null;

  const manualCtx = resolveManualCarGroupContext(hostPerson, planForInventory, roster);
  if (manualCtx && !manualCtx.isAnchor) {
    const anchorName = String(manualCtx.anchorPerson?.name || '').trim() || 'el titular del grupo';
    return (
      <section className={sectionClass}>
        <h4 className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-[0.15em] inline-flex items-center gap-1.5 mb-2">
          <Car size={12} className="opacity-80" aria-hidden />
          {sectionTitle}
        </h4>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
          Este registro pertenece a un grupo manual de transporte. Los datos de vehículo, conductor y pasajeros se
          administran desde <span className="font-bold text-slate-700 dark:text-slate-200">{anchorName}</span> y se
          sincronizan con la sección Transporte.
        </p>
      </section>
    );
  }

  const requirePassengers = manualCtx?.isAnchor
    ? manualGroupCrewRequiresPassengers(manualCtx.memberKeys.length)
    : carCrewRequiresPassengerSelection(hostPerson, companions);

  const handleSlotMetaChange = (vehicleKey, patch) => {
    onDraftMetaChange?.(vehicleKey, patch);
  };

  const linkedInherit = useMemo(
    () =>
      resolveLinkedCompanionCarInheritance(hostPerson, roster, planForInventory, {
        inheritFlag: inheritLinkedCarData,
      }),
    [hostPerson, roster, planForInventory, inheritLinkedCarData]
  );

  const inventoryForAttention = useMemo(() => {
    if (linkedInherit.active) return linkedInherit.inventory || [];
    return buildBautizosFamilyCarInventory({
      hostPerson,
      companions,
      plan: planForInventory,
      hostSourceKey,
      draftMetaByVehicleKey,
    }).map((slot) => {
      const draft = draftMetaByVehicleKey[slot.vehicleKey];
      return {
        ...slot,
        meta: draft ? { ...slot.meta, ...draft } : slot.meta,
      };
    });
  }, [linkedInherit, hostPerson, companions, planForInventory, hostSourceKey, draftMetaByVehicleKey]);

  const summaryEntry = plan?.bautizosCarMetaSummaryByTitular?.[String(hostSourceKey || '').trim()];
  const sectionNeedsAttention =
    !linkedInherit.active &&
    (summaryEntry
      ? titularSummaryNeedsAttention(summaryEntry, { requiresPassengers: requirePassengers })
      : familyCarInventoryNeedsAttention(inventoryForAttention, {
          hostPerson,
          companions,
          requiresPassengers: requirePassengers,
        }));

  return (
    <section className={sectionClass}>
      <button
        type="button"
        className="w-full flex items-center justify-between gap-2 text-left mb-3 pb-1.5 border-b border-slate-200 dark:border-slate-600"
        onClick={handleToggleOpen}
      >
        <h4 className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-[0.15em] inline-flex items-center gap-1.5 flex-wrap">
          <Car size={12} className="opacity-80" aria-hidden />
          {sectionTitle}
          <span className="text-rose-600 normal-case font-bold">*</span>
          {!open && sectionNeedsAttention ? (
            <span className="text-[9px] font-black uppercase text-amber-700 dark:text-amber-300 normal-case tracking-normal">
              · Pendiente
            </span>
          ) : null}
        </h4>
        {open ? <ChevronUp size={14} className="text-slate-400 shrink-0" /> : <ChevronDown size={14} className="text-slate-400 shrink-0" />}
      </button>
      {open ? (
        <>
          {loadingMeta ? (
            <p className="inline-flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-3">
              <Loader2 size={14} className="animate-spin shrink-0" aria-hidden />
              Cargando datos de carro…
            </p>
          ) : null}
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
            {manualCtx?.isAnchor
              ? 'Grupo manual: todos los integrantes comparten los mismos datos de carro, conductor y pasajeros.'
              : null}{' '}
            {requirePassengers || (manualCtx?.isAnchor && manualCtx.memberKeys.length > 1)
              ? 'Cada rubro del vehículo, el conductor y los pasajeros son obligatorios. Si aún no tiene el dato, márquelo como pendiente; deberá completarse después.'
              : 'Cada rubro del vehículo y el conductor son obligatorios. Si aún no tiene el dato, márquelo como pendiente; deberá completarse después.'}
          </p>
          {!loadingMeta ? (
            <BautizosCarDataForm
              hostPerson={hostPerson}
              companions={companions}
              plan={planForInventory}
              hostSourceKey={hostSourceKey}
              draftMetaByVehicleKey={draftMetaByVehicleKey}
              canEdit={canEdit}
              showMaybeAbsent={false}
              colorSuggestions={colorSuggestions}
              labelClasses={labelClasses}
              roster={roster}
              inheritLinkedCarData={inheritLinkedCarData}
              inheritedCarSummary={linkedInherit}
              onInheritLinkedCarDataChange={onInheritLinkedCarDataChange}
              onHostCarCountChange={onHostCarCountChange}
              onCompanionCarCountChange={onCompanionCarCountChange}
              onDraftMetaPrune={onDraftMetaPrune}
              onSlotMetaChange={handleSlotMetaChange}
            />
          ) : null}
        </>
      ) : null}
    </section>
  );
}
