import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import CarVehicleMetaPanel from './CarVehicleMetaPanel.jsx';
import BautizosCarCrewFields from './BautizosCarCrewFields.jsx';
import { createCarCatalogView } from '../../data/carBrandModelsCatalog.js';
import { normalizeArrivalCarCount, bautizosLlegaEnCarroForTransportPricing } from '../../bautizosParty.js';
import {
  buildBautizosFamilyCarInventory,
  buildBautizosFamilyMemberOptions,
  buildManualGroupMemberOptions,
  buildCarCrewAssignmentPatches,
  buildCarCrewMembersFromMeta,
  carMetaNeedsAttention,
  collectAssignedCrewSourceKeysOnOtherCars,
  familyHasAnyCarTransport,
  filterDriverMemberOptions,
  formatCarMetaDisplayValue,
  formatTransportCarMemberRole,
  manualGroupCrewRequiresPassengers,
  normalizeCarVehicleMeta,
  resolveManualCarGroupContext,
  vehicleKeysAboveCarCount,
} from '../../bautizosCarMeta.js';

const slotBadge = {
  family:
    'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-500/45 text-indigo-700 dark:text-indigo-200',
  additional:
    'bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-500/45 text-violet-700 dark:text-violet-200',
};

const inputSm =
  'w-full min-w-0 max-w-[220px] px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100';

/**
 * Formulario unificado: carros familiares + adicionales con tripulación.
 */
export default function BautizosCarDataForm({
  hostPerson,
  companions,
  plan,
  hostSourceKey,
  draftCompanionKeys,
  draftMetaByVehicleKey = {},
  canEdit = true,
  showMaybeAbsent = false,
  onSlotMetaChange,
  onHostCarCountChange,
  onDraftMetaPrune,
  carCatalogView,
  colorSuggestions = [],
  labelClasses = 'text-[10px] font-bold text-slate-600 dark:text-slate-300',
  roster = null,
  inheritLinkedCarData = false,
  inheritedCarSummary = null,
  onInheritLinkedCarDataChange,
}) {
  const catalog = carCatalogView || createCarCatalogView();
  const [expandedSlotKeys, setExpandedSlotKeys] = useState(() => new Set());
  const manualCtx = useMemo(
    () => resolveManualCarGroupContext(hostPerson, plan, roster),
    [hostPerson, plan, roster]
  );
  const memberOptions = useMemo(() => {
    if (manualCtx?.isAnchor) {
      return buildManualGroupMemberOptions(plan, manualCtx.group, roster);
    }
    return buildBautizosFamilyMemberOptions({
      hostPerson,
      companions,
      hostSourceKey,
      draftCompanionKeys,
    });
  }, [manualCtx, plan, roster, hostPerson, companions, hostSourceKey, draftCompanionKeys]);

  const carCountOverride = manualCtx?.isAnchor ? manualCtx.effectiveCars : undefined;
  const inventoryOwnerSk = manualCtx?.isAnchor ? manualCtx.anchorSk : hostSourceKey;

  const baseInventory = useMemo(
    () =>
      buildBautizosFamilyCarInventory({
        hostPerson,
        companions,
        plan,
        hostSourceKey: inventoryOwnerSk,
        draftCompanionKeys,
        carCountOverride,
      }),
    [hostPerson, companions, plan, inventoryOwnerSk, draftCompanionKeys, carCountOverride]
  );

  const inventory = useMemo(
    () =>
      baseInventory.map((slot) => {
        const draft = draftMetaByVehicleKey[slot.vehicleKey];
        const meta = normalizeCarVehicleMeta(draft ? { ...slot.meta, ...draft } : slot.meta);
        return { ...slot, meta };
      }),
    [baseInventory, draftMetaByVehicleKey]
  );

  const committedCarCount = normalizeArrivalCarCount(hostPerson?.carrosLlegada);
  const [carCountInput, setCarCountInput] = useState(() => String(committedCarCount));

  useEffect(() => {
    setCarCountInput(String(committedCarCount));
  }, [committedCarCount]);

  if (!inventory.length) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400 italic">
        No hay vehículos declarados. Marque «Llega en carro» en el titular o en un acompañante.
      </p>
    );
  }

  const familySlots = inventory.filter((s) => s.slotKind === 'family');
  const additionalSlots = inventory.filter((s) => s.slotKind === 'additional');

  const hostGoesByCar = bautizosLlegaEnCarroForTransportPricing(hostPerson);
  const showFamilyCarCount = familyHasAnyCarTransport(hostPerson, companions) && !manualCtx?.isAnchor;
  const requirePassengers = manualCtx?.isAnchor
    ? manualGroupCrewRequiresPassengers(manualCtx.memberKeys.length)
    : memberOptions.some((m) => m.kind === 'companion');
  const crewOpts = { requiresPassengers: requirePassengers };

  const toggleSlotExpanded = (vehicleKey) => {
    const vk = String(vehicleKey || '').trim();
    if (!vk) return;
    setExpandedSlotKeys((prev) => {
      const next = new Set(prev);
      if (next.has(vk)) next.delete(vk);
      else next.add(vk);
      return next;
    });
  };

  const commitHostCarCount = (nextCount) => {
    const next = normalizeArrivalCarCount(nextCount);
    const prev = committedCarCount;
    if (next === prev) return next;
    onHostCarCountChange?.(next);
    const pruneKeys = vehicleKeysAboveCarCount(hostSourceKey, prev, next);
    if (pruneKeys.length) onDraftMetaPrune?.(pruneKeys);
    return next;
  };

  const handleHostCarCountInput = (raw) => {
    const v = String(raw ?? '');
    if (v !== '' && !/^\d+$/.test(v)) return;
    setCarCountInput(v);
    if (v === '') return;
    const n = parseInt(v, 10);
    if (!Number.isFinite(n) || n < 1) return;
    commitHostCarCount(n);
  };

  const handleHostCarCountBlur = () => {
    const next = commitHostCarCount(carCountInput === '' ? undefined : carCountInput);
    setCarCountInput(String(next));
  };

  const renderCarCountField = (label, value, onChange, onBlur, id) => (
    <div className="max-w-[220px] space-y-1 mb-3">
      <label className={labelClasses} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        className={inputSm}
        disabled={!canEdit}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
    </div>
  );

  const patchSlot = (vehicleKey, patch) => {
    onSlotMetaChange?.(vehicleKey, patch);
  };

  const applyCrewPatches = (patches) => {
    for (const { vehicleKey: vk, patch } of patches || []) {
      patchSlot(vk, patch);
    }
  };

  const renderSlot = (slot) => {
    const { vehicleKey, carIndex, slotKind, meta } = slot;
    const badgeCls = slotBadge[slotKind] || slotBadge.family;
    const badgeLabel = slotKind === 'family' ? 'Familiar' : 'Adicional';

    const assignedOnOtherCars = collectAssignedCrewSourceKeysOnOtherCars(inventory, vehicleKey);
    const driverMemberOptions = filterDriverMemberOptions(memberOptions, assignedOnOtherCars);
    const driverSk = String(meta?.driverSourceKey || '');
    const passengerMemberOptions = filterDriverMemberOptions(
      memberOptions.filter((m) => String(m.sourceKey) !== driverSk),
      assignedOnOtherCars
    );

    const onFieldChange = (field, value, opts) => {
      if (field === 'brand' && opts?.resetModel) {
        patchSlot(vehicleKey, { brand: value, model: '', pendingBrand: false });
        return;
      }
      const pendingKey = `pending${field.charAt(0).toUpperCase()}${field.slice(1)}`;
      patchSlot(vehicleKey, { [field]: value, [pendingKey]: false });
    };

    const onPendingFieldChange = (field, checked) => {
      const pendingKey = `pending${field.charAt(0).toUpperCase()}${field.slice(1)}`;
      patchSlot(vehicleKey, { [pendingKey]: checked });
    };

    const formOpen = expandedSlotKeys.has(vehicleKey);
    const slotPending = carMetaNeedsAttention(meta, crewOpts);
    const crewMembers = buildCarCrewMembersFromMeta(meta, hostPerson, companions, null, roster);

    const renderFieldSummary = (label, field) => {
      const v = formatCarMetaDisplayValue(meta, field);
      const isPending = v === 'Pendiente';
      return (
        <p className="text-[10px] text-slate-600 dark:text-slate-300">
          <strong>{label}:</strong>{' '}
          {isPending ? (
            <span className="text-amber-700 dark:text-amber-300 font-bold">Pendiente</span>
          ) : (
            <span className="font-semibold text-slate-800 dark:text-slate-100">{v}</span>
          )}
        </p>
      );
    };

    return (
      <div
        key={vehicleKey}
        className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30 p-3 space-y-2"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide border ${badgeCls}`}
          >
            {badgeLabel}
          </span>
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
            Carro {carIndex}
          </span>
          {!formOpen && slotPending ? (
            <span className="text-[9px] font-black uppercase text-amber-700 dark:text-amber-300">Pendiente</span>
          ) : null}
        </div>

        {!formOpen ? (
          <>
            {meta.maybeAbsent ? (
              <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                Tal vez no asista con este vehículo
              </p>
            ) : (
              <div className="space-y-0.5">
                {renderFieldSummary('Marca', 'brand')}
                {renderFieldSummary('Modelo', 'model')}
                {renderFieldSummary('Color', 'color')}
                {renderFieldSummary('Placas', 'plates')}
                <ul className="space-y-0.5 text-[10px] font-semibold text-slate-800 dark:text-slate-100 pt-1 border-t border-slate-200/80 dark:border-slate-600/60">
                  {crewMembers.map((m) => (
                    <li key={`${m.sourceKey}-${m.crewRole}`}>
                      {m.name || '—'}
                      <span className="ml-1 text-[9px] font-bold uppercase text-slate-400">
                        {formatTransportCarMemberRole(m)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : null}

        <button
          type="button"
          className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
          onClick={() => toggleSlotExpanded(vehicleKey)}
          aria-expanded={formOpen}
          disabled={inheritLinkedCarData}
        >
          <ChevronDown size={14} className={`transition-transform ${formOpen ? 'rotate-180' : ''}`} aria-hidden />
          Datos de carro y tripulación
          {!formOpen && slotPending ? (
            <span className="text-amber-700 dark:text-amber-300">· Pendiente</span>
          ) : null}
        </button>

        {formOpen && !inheritLinkedCarData ? (
          <div className="space-y-3 border-t border-slate-200/80 dark:border-slate-600/60 pt-2">
            <CarVehicleMetaPanel
              carIndex={carIndex}
              meta={meta}
              canEdit={canEdit}
              showMaybeAbsent={showMaybeAbsent}
              showPendingToggles={canEdit}
              carCatalogView={catalog}
              colorSuggestions={colorSuggestions}
              onFieldChange={onFieldChange}
              onPendingFieldChange={onPendingFieldChange}
              onMaybeAbsentChange={(checked) => patchSlot(vehicleKey, { maybeAbsent: checked })}
            />

            {!meta.maybeAbsent ? (
              <BautizosCarCrewFields
                meta={meta}
                memberOptions={memberOptions}
                driverMemberOptions={driverMemberOptions}
                passengerMemberOptions={passengerMemberOptions}
                requirePassengers={requirePassengers}
                canEdit={canEdit}
                onDriverChange={(sk) =>
                  applyCrewPatches(
                    buildCarCrewAssignmentPatches({
                      inventory,
                      vehicleKey,
                      patch: {
                        driverSourceKey: sk,
                        pendingDriver: false,
                        passengerSourceKeys: (meta.passengerSourceKeys || []).filter((p) => p !== sk),
                      },
                      exclusivePersonKeys: sk ? [sk] : [],
                      roster,
                    })
                  )
                }
                onPassengersChange={(keys) =>
                  applyCrewPatches(
                    buildCarCrewAssignmentPatches({
                      inventory,
                      vehicleKey,
                      patch: { passengerSourceKeys: keys, pendingPassengers: false },
                      exclusivePersonKeys: keys,
                      roster,
                    })
                  )
                }
                onPendingDriverChange={(checked) =>
                  patchSlot(vehicleKey, {
                    pendingDriver: checked,
                    ...(checked ? { driverSourceKey: '' } : {}),
                  })
                }
                onPendingPassengersChange={(checked) =>
                  patchSlot(vehicleKey, {
                    pendingPassengers: checked,
                    ...(checked ? { passengerSourceKeys: [] } : {}),
                  })
                }
              />
            ) : null}
          </div>
        ) : null}
      </div>
    );
  };

  const showInheritToggle =
    inheritedCarSummary?.eligible &&
    typeof onInheritLinkedCarDataChange === 'function';

  return (
    <div className="space-y-4">
      {showInheritToggle ? (
        <label className="inline-flex items-start gap-2 text-[10px] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 rounded border-indigo-400 accent-indigo-600"
            checked={inheritLinkedCarData !== false}
            disabled={!canEdit}
            onChange={(e) => onInheritLinkedCarDataChange(e.target.checked)}
          />
          <span>
            Heredar datos de carro de{' '}
            <span className="font-bold">{inheritedCarSummary.linkedName || 'registro vinculado'}</span>
          </span>
        </label>
      ) : null}
      {inheritLinkedCarData && inheritedCarSummary?.inventory?.length ? (
        <p className="text-[10px] text-indigo-800 dark:text-indigo-200 leading-relaxed rounded-lg border border-indigo-200 dark:border-indigo-600/50 bg-indigo-50/60 dark:bg-indigo-950/30 px-3 py-2">
          Los datos de vehículo, conductor y pasajeros se tomarán del registro vinculado de{' '}
          <span className="font-bold">{inheritedCarSummary.linkedName}</span>. Desmarque la casilla para capturar
          datos propios.
        </p>
      ) : null}
      {showFamilyCarCount
        ? renderCarCountField(
            'Cantidad de carros (familia)',
            carCountInput,
            handleHostCarCountInput,
            handleHostCarCountBlur,
            'bautizos-host-car-count'
          )
        : null}
      {familySlots.length > 0 && !inheritLinkedCarData ? (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Carro familiar
          </p>
          <div className="space-y-3">{familySlots.map(renderSlot)}</div>
        </div>
      ) : null}
      {additionalSlots.length > 0 && !inheritLinkedCarData ? (
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Carros adicionales
          </p>
          <div className="space-y-3">{additionalSlots.map(renderSlot)}</div>
        </div>
      ) : null}
    </div>
  );
}
