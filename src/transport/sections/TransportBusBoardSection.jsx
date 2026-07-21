import React, { useMemo } from 'react';
import { Bus, Plus } from 'lucide-react';
import {
  countAssignedToUnit,
  getUnitsForSede,
  passengersForBusGroup,
} from '../../transportPlanningCore.js';
import {
  uiBadgeSoft,
  uiButtons,
  uiEmptyState,
  uiListRow,
  uiShell,
} from '../../ui/uiFormatClasses.js';
import VirtualizedScrollList from '../../components/roster/VirtualizedScrollList.jsx';

/**
 * Tablero de camiones por sede (uiShell / uiListRow).
 */
export default function TransportBusBoardSection({
  busSectionsEffective = [],
  busLines = [],
  plan,
  isCampa = false,
  splitCampaBySubevent = false,
  canEdit = false,
  sortPassengersForDisplay,
  resolveCampaAmbosTransit,
  suggestUnitsForGroup,
  addUnit,
  onOpenBusUnit,
}) {
  const sections = useMemo(() => {
    return (busSectionsEffective || [])
      .map((section) => {
        const passengersBase = passengersForBusGroup(busLines, section);
        const passengers = (typeof sortPassengersForDisplay === 'function'
          ? sortPassengersForDisplay(passengersBase)
          : passengersBase
        )
          .filter((row) => {
            if (!(isCampa && splitCampaBySubevent)) return true;
            if (String(row?.campaSegment || '') !== 'Ambos') return true;
            const t = resolveCampaAmbosTransit?.(row.sourceKey) || {};
            if (section.subevent === 'Teens') return t.teenArrive || t.teenReturn;
            if (section.subevent === 'Jóvenes') return t.jovenArrive || t.jovenReturn;
            return true;
          })
          .map((row) => {
            if (!(isCampa && splitCampaBySubevent)) return { ...row, transportSourceKey: row.sourceKey };
            if (String(row?.campaSegment || '') !== 'Ambos') return { ...row, transportSourceKey: row.sourceKey };
            const sub = String(section?.subevent || '').trim();
            return { ...row, transportSourceKey: `${row.sourceKey}|${sub || 'Ambos'}` };
          });
        const groupKey = section.groupKey;
        const units = getUnitsForSede(plan, groupKey);
        return { section, passengers, groupKey, units };
      })
      .filter(({ passengers, units }) => passengers.length > 0 || units.length > 0);
  }, [
    busSectionsEffective,
    busLines,
    plan,
    isCampa,
    splitCampaBySubevent,
    sortPassengersForDisplay,
    resolveCampaAmbosTransit,
  ]);

  if (sections.length === 0 && busLines.length === 0) {
    return (
      <div className={uiEmptyState.wrap}>
        <Bus size={32} className={uiEmptyState.icon} />
        <p className={uiEmptyState.title}>No hay pasajeros en camión</p>
        <p className={uiEmptyState.help}>Quienes van en transporte del evento aparecerán por sede.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Camiones por sede</h3>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
          Crea unidades y asigna pasajeros desde el panel de cada camión
          {splitCampaBySubevent ? ' · Teens / Jóvenes' : ''}.
        </p>
      </div>

      {sections.map(({ section, passengers, groupKey, units }) => {
        const requiredHint = Math.max(1, Math.ceil(passengers.length / (plan.defaultBusCap || 40)));
        const assignedInSection = passengers.filter(
          (row) => !!plan.busAssign?.[row.transportSourceKey || row.sourceKey]
        ).length;
        const unassignedHere = passengers.filter(
          (row) => !plan.busAssign?.[row.transportSourceKey || row.sourceKey]
        );

        return (
          <section key={`bus-${groupKey}`} className={`${uiShell.card} overflow-hidden`}>
            <div className={`${uiShell.cardHeader} px-4 py-3 flex flex-wrap items-center justify-between gap-2`}>
              <div className="min-w-0">
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Bus size={16} className="text-indigo-600 shrink-0" aria-hidden />
                  <span className="break-words">{section.title}</span>
                </h4>
                <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                  {passengers.length} en camión · {assignedInSection} asignados · sugerido ≥ {requiredHint} (
                  {plan.defaultBusCap} plazas)
                </p>
              </div>
              {canEdit ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={uiButtons.secondary}
                    onClick={() => suggestUnitsForGroup?.(section, passengers.length)}
                  >
                    Generar unidades
                  </button>
                  <button type="button" className={uiButtons.secondary} onClick={() => addUnit?.(section, 'bus')}>
                    <Plus size={14} className="inline" /> Camión
                  </button>
                  <button type="button" className={uiButtons.secondary} onClick={() => addUnit?.(section, 'van')}>
                    <Plus size={14} className="inline" /> Camioneta
                  </button>
                </div>
              ) : null}
            </div>

            <div className="p-3 space-y-3">
              {unassignedHere.length > 0 ? (
                <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                  {unassignedHere.length} sin asignar en esta sede — ábrelos desde una unidad.
                </p>
              ) : null}

              <VirtualizedScrollList
                className="max-h-[min(24rem,50vh)] overflow-y-auto"
                items={units}
                getItemKey={(unit) => unit.id}
                emptyContent={
                  <p className="text-xs text-slate-400 italic px-1 py-2">Sin unidades. Genera o agrega un camión.</p>
                }
                renderItem={(unit) => {
                  const n = countAssignedToUnit(plan, unit.id);
                  const cap = Math.max(1, parseInt(unit.capacity, 10) || 1);
                  const kindLabel = unit.kind === 'van' ? 'Camioneta' : 'Camión';
                  return (
                    <button
                      type="button"
                      className={`${uiListRow.wrap} w-full text-left mb-1.5`}
                      onClick={() => onOpenBusUnit?.(groupKey, unit.id, section)}
                    >
                      <span className={uiListRow.main}>
                        <span className={uiListRow.primary}>{unit.label || kindLabel}</span>
                        <span className={uiListRow.secondary}>
                          {kindLabel} · {n}/{cap} plazas
                        </span>
                      </span>
                      <span className={uiListRow.meta}>
                        <span className={uiBadgeSoft(n >= cap ? 'rose' : n > 0 ? 'indigo' : 'slate')}>
                          {n}/{cap}
                        </span>
                      </span>
                    </button>
                  );
                }}
              />
            </div>
          </section>
        );
      })}
    </div>
  );
}
