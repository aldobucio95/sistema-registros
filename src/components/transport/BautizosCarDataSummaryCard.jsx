import React, { useEffect, useMemo, useState } from 'react';
import { Car, Loader2 } from 'lucide-react';
import {
  buildCarDataSummaryForRosterPerson,
  carCrewRequiresPassengerSelection,
  manualGroupCrewRequiresPassengers,
  carMetaNeedsAttention,
  familyCarInventoryNeedsAttention,
  formatCarMetaDisplayValue,
  normalizeCarVehicleMeta,
  resolveBautizosCarDataAnchor,
  resolveMemberLabel,
} from '../../bautizosCarMeta.js';
import {
  fetchCarMetaForTitular,
  mergeCarMetaCacheIntoPlan,
  TRANSPORT_CAR_META_STORAGE_VERSION,
} from '../../transportCarMetaStore.js';
import { normalizeTransportPlanning } from '../../transportPlanningCore.js';

function renderFieldValue(raw) {
  const v = String(raw || '').trim();
  if (!v || v === 'Pendiente') {
    return <span className="text-amber-700 dark:text-amber-300 font-bold">Pendiente</span>;
  }
  return <span className="font-semibold text-slate-800 dark:text-white">{v}</span>;
}

function formatCrewDriver(meta, hostPerson, companions, labelIndex) {
  const m = normalizeCarVehicleMeta(meta);
  if (m.pendingDriver) return 'Pendiente';
  const label = resolveMemberLabel(m.driverSourceKey, hostPerson, companions, labelIndex);
  return label || 'Pendiente';
}

function formatCrewPassengers(meta, hostPerson, companions, labelIndex, requirePassengers) {
  if (!requirePassengers) return '';
  const m = normalizeCarVehicleMeta(meta);
  if (m.pendingPassengers) return 'Pendiente';
  const names = (m.passengerSourceKeys || [])
    .map((sk) => resolveMemberLabel(sk, hostPerson, companions, labelIndex))
    .filter(Boolean);
  return names.length ? names.join(', ') : 'Pendiente';
}

function planNeedsCarMetaSubcollectionFetch(plan) {
  const normalized = normalizeTransportPlanning(plan);
  if (Number(normalized.transportCarMetaStorageVersion) >= TRANSPORT_CAR_META_STORAGE_VERSION) {
    return true;
  }
  return !Object.keys(normalized.carMetaBySource || {}).length;
}

/**
 * Tarjeta de solo lectura con datos de vehículos (resumen expandido del roster Bautizos).
 */
export default function BautizosCarDataSummaryCard({
  hostPerson,
  companions,
  plan,
  roster,
  eventLike = null,
  eventId = null,
  className = '',
}) {
  const resolvedEventId = String(eventId || eventLike?.id || '').trim();

  const anchorContext = useMemo(
    () => resolveBautizosCarDataAnchor(hostPerson, roster, eventLike),
    [hostPerson, roster, eventLike]
  );

  const titularSkForFetch = useMemo(() => {
    const summary = buildCarDataSummaryForRosterPerson({
      person: anchorContext.anchorPerson || hostPerson,
      companions: anchorContext.companionsForCrew?.length
        ? anchorContext.companionsForCrew
        : companions,
      plan,
      roster,
      eventLike,
      forRosterDisplay: true,
    });
    return String(summary.hostSourceKey || '').trim();
  }, [anchorContext, hostPerson, companions, plan, roster, eventLike]);

  const [planWithMeta, setPlanWithMeta] = useState(plan);
  const [loadingMeta, setLoadingMeta] = useState(false);

  useEffect(() => {
    setPlanWithMeta(plan);
  }, [plan]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!resolvedEventId || !titularSkForFetch || !planNeedsCarMetaSubcollectionFetch(plan)) {
        setLoadingMeta(false);
        return;
      }
      setLoadingMeta(true);
      try {
        const fetched = await fetchCarMetaForTitular(resolvedEventId, titularSkForFetch);
        if (!cancelled) {
          setPlanWithMeta(
            Object.keys(fetched).length ? mergeCarMetaCacheIntoPlan(plan, fetched) : plan
          );
        }
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [resolvedEventId, titularSkForFetch, plan]);

  const summary = useMemo(
    () =>
      buildCarDataSummaryForRosterPerson({
        person: anchorContext.anchorPerson || hostPerson,
        companions: anchorContext.companionsForCrew?.length
          ? anchorContext.companionsForCrew
          : companions,
        plan: planWithMeta,
        roster,
        eventLike,
        forRosterDisplay: true,
      }),
    [anchorContext, hostPerson, companions, planWithMeta, roster, eventLike]
  );

  const {
    hostPerson: displayHost,
    companions: displayCompanions,
    inventory,
    inheritedFromTitular,
    titularName,
    carCount,
    labelIndex,
    manualGroupMemberCount,
  } = summary;

  if (!inventory.length && !loadingMeta) return null;

  const needsAttention = familyCarInventoryNeedsAttention(inventory, {
    hostPerson: displayHost,
    companions: displayCompanions,
    requiresPassengers:
      manualGroupMemberCount > 1
        ? true
        : carCrewRequiresPassengerSelection(displayHost, displayCompanions),
  });
  const requirePassengers =
    manualGroupMemberCount > 1
      ? manualGroupCrewRequiresPassengers(manualGroupMemberCount)
      : carCrewRequiresPassengerSelection(displayHost, displayCompanions);
  const crewOpts = { requiresPassengers: requirePassengers };

  return (
    <div
      className={`p-2.5 rounded-lg shadow-sm border border-blue-200 bg-blue-50/45 dark:bg-transparent dark:border-2 dark:border-blue-500 dark:shadow-none ${className}`.trim()}
    >
      <p className="font-bold text-blue-900 dark:text-blue-100 mb-1.5 uppercase tracking-wider text-[9px] inline-flex items-center gap-1">
        <Car size={11} className="opacity-80 shrink-0" aria-hidden />
        Datos de carros
      </p>
      {loadingMeta ? (
        <p className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-2">
          <Loader2 size={12} className="animate-spin shrink-0" aria-hidden />
          Cargando datos de carro…
        </p>
      ) : null}
      {inheritedFromTitular || anchorContext.manualGroupInherited ? (
        <p className="text-[9px] text-blue-800 dark:text-blue-200 mb-2 leading-snug">
          Datos heredados del titular{titularName ? `: ${titularName}` : ''}
        </p>
      ) : null}
      {!loadingMeta ? (
        <>
          <p className="text-slate-600 dark:text-slate-200 text-[10px] mb-2">
            <strong>Cantidad de carros:</strong>{' '}
            <span className="font-semibold text-slate-800 dark:text-white">{carCount}</span>
            {needsAttention ? (
              <span className="ml-1.5 text-amber-800 dark:text-amber-200 font-bold">· Datos incompletos</span>
            ) : null}
          </p>
          <div className="space-y-2">
            {inventory.map((slot) => {
              const { meta, carIndex, slotKind } = slot;
              const slotTitle =
                slotKind === 'family' ? `Carro familiar ${carIndex}` : `Carro adicional ${carIndex}`;
              const m = normalizeCarVehicleMeta(meta);

              if (m.maybeAbsent) {
                return (
                  <div
                    key={slot.vehicleKey}
                    className="rounded-md border border-blue-100 dark:border-blue-500/50 bg-white/85 dark:bg-slate-900/70 px-2 py-1.5"
                  >
                    <p className="text-[10px] font-bold text-blue-900 dark:text-blue-100 mb-0.5">{slotTitle}</p>
                    <p className="text-slate-500 dark:text-slate-400 italic text-[10px]">
                      Tal vez no asista con este vehículo
                    </p>
                  </div>
                );
              }

              return (
                <div
                  key={slot.vehicleKey}
                  className="rounded-md border border-blue-100 dark:border-blue-500/50 bg-white/85 dark:bg-slate-900/70 px-2 py-1.5 space-y-0.5"
                >
                  <p className="text-[10px] font-bold text-blue-900 dark:text-blue-100 mb-1">{slotTitle}</p>
                  <p className="text-slate-600 dark:text-slate-300 text-[10px]">
                    <strong>Marca:</strong> {renderFieldValue(formatCarMetaDisplayValue(m, 'brand'))}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300 text-[10px]">
                    <strong>Modelo:</strong> {renderFieldValue(formatCarMetaDisplayValue(m, 'model'))}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300 text-[10px]">
                    <strong>Color:</strong> {renderFieldValue(formatCarMetaDisplayValue(m, 'color'))}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300 text-[10px]">
                    <strong>Placas:</strong> {renderFieldValue(formatCarMetaDisplayValue(m, 'plates'))}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300 text-[10px] pt-0.5 border-t border-blue-50 dark:border-blue-500/30">
                    <strong>Conductor:</strong>{' '}
                    {renderFieldValue(formatCrewDriver(m, displayHost, displayCompanions, labelIndex))}
                  </p>
                  {requirePassengers ? (
                    <p className="text-slate-600 dark:text-slate-300 text-[10px]">
                      <strong>Pasajeros:</strong>{' '}
                      {renderFieldValue(
                        formatCrewPassengers(m, displayHost, displayCompanions, labelIndex, true)
                      )}
                    </p>
                  ) : null}
                  {carMetaNeedsAttention(m, crewOpts) ? (
                    <p className="text-[9px] text-amber-800 dark:text-amber-200 font-bold pt-0.5">
                      Pendiente completar datos o tripulación
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
