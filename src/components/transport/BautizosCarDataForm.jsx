import React, { useEffect, useMemo, useState } from 'react';
import CarVehicleMetaPanel from './CarVehicleMetaPanel.jsx';
import BautizosCarCrewFields from './BautizosCarCrewFields.jsx';
import { createCarCatalogView } from '../../data/carBrandModelsCatalog.js';
import { normalizeArrivalCarCount, bautizosLlegaEnCarroForTransportPricing } from '../../bautizosParty.js';
import {
  buildBautizosFamilyCarInventory,
  buildBautizosFamilyMemberOptions,
  buildCarCrewAssignmentPatches,
  collectAssignedCrewSourceKeysOnOtherCars,
  familyHasAnyCarTransport,
  filterDriverMemberOptions,
  normalizeCarVehicleMeta,
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
}) {
  const catalog = carCatalogView || createCarCatalogView();
  const memberOptions = useMemo(
    () =>
      buildBautizosFamilyMemberOptions({
        hostPerson,
        companions,
        hostSourceKey,
        draftCompanionKeys,
      }),
    [hostPerson, companions, hostSourceKey, draftCompanionKeys]
  );

  const baseInventory = useMemo(
    () =>
      buildBautizosFamilyCarInventory({
        hostPerson,
        companions,
        plan,
        hostSourceKey,
        draftCompanionKeys,
      }),
    [hostPerson, companions, plan, hostSourceKey, draftCompanionKeys]
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
  const showFamilyCarCount = familyHasAnyCarTransport(hostPerson, companions);
  const requirePassengers = memberOptions.some((m) => m.kind === 'companion');

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

    return (
      <div
        key={vehicleKey}
        className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30 p-3 space-y-3"
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
        </div>

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
    );
  };

  return (
    <div className="space-y-4">
      {showFamilyCarCount
        ? renderCarCountField(
            'Cantidad de carros (familia)',
            carCountInput,
            handleHostCarCountInput,
            handleHostCarCountBlur,
            'bautizos-host-car-count'
          )
        : null}
      {familySlots.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Carro familiar
          </p>
          <div className="space-y-3">{familySlots.map(renderSlot)}</div>
        </div>
      ) : null}
      {additionalSlots.length > 0 ? (
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
