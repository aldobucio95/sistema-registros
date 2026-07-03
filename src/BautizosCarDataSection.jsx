import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Car } from 'lucide-react';
import BautizosCarDataForm from './components/transport/BautizosCarDataForm.jsx';
import { carCrewRequiresPassengerSelection, familyHasAnyCarTransport, manualGroupCrewRequiresPassengers, resolveManualCarGroupContext } from './bautizosCarMeta.js';

/**
 * Sección colapsable «Datos de carros» en registro Bautizos (titular + acompañantes).
 */
export function BautizosCarDataSection({
  hostPerson,
  companions,
  plan,
  hostSourceKey = 'p:draft-host',
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
}) {
  const [open, setOpen] = useState(true);
  if (!familyHasAnyCarTransport(hostPerson, companions, eventLike)) return null;

  const manualCtx = resolveManualCarGroupContext(hostPerson, plan, roster);
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

  return (
    <section className={sectionClass}>
      <button
        type="button"
        className="w-full flex items-center justify-between gap-2 text-left mb-3 pb-1.5 border-b border-slate-200 dark:border-slate-600"
        onClick={() => setOpen((v) => !v)}
      >
        <h4 className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-[0.15em] inline-flex items-center gap-1.5">
          <Car size={12} className="opacity-80" aria-hidden />
          {sectionTitle}
          <span className="text-rose-600 normal-case font-bold">*</span>
        </h4>
        {open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
      </button>
      {open ? (
        <>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
            {manualCtx?.isAnchor
              ? 'Grupo manual: todos los integrantes comparten los mismos datos de carro, conductor y pasajeros.'
              : null}{' '}
            {requirePassengers || (manualCtx?.isAnchor && manualCtx.memberKeys.length > 1)
              ? 'Cada rubro del vehículo, el conductor y los pasajeros son obligatorios. Si aún no tiene el dato, márquelo como pendiente; deberá completarse después.'
              : 'Cada rubro del vehículo y el conductor son obligatorios. Si aún no tiene el dato, márquelo como pendiente; deberá completarse después.'}
          </p>
          <BautizosCarDataForm
            hostPerson={hostPerson}
            companions={companions}
            plan={plan}
            hostSourceKey={hostSourceKey}
            draftMetaByVehicleKey={draftMetaByVehicleKey}
            canEdit={canEdit}
            showMaybeAbsent={false}
            colorSuggestions={colorSuggestions}
            labelClasses={labelClasses}
            roster={roster}
            onHostCarCountChange={onHostCarCountChange}
            onCompanionCarCountChange={onCompanionCarCountChange}
            onDraftMetaPrune={onDraftMetaPrune}
            onSlotMetaChange={handleSlotMetaChange}
          />
        </>
      ) : null}
    </section>
  );
}
