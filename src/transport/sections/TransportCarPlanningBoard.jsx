import React, { useMemo, useState } from 'react';
import { Car, Plus, Sparkles } from 'lucide-react';
import {
  getCarLinesForUnit,
  getCarUnits,
  getDefaultCarCapacity,
  getUnassignedCarLines,
  normalizeTransportPlanning,
} from '../../transportPlanningCore.js';
import {
  blankCarUnitDoc,
  buildCarUnitSummaryEntry,
  makeCarUnitId,
  normalizeCarUnitPlanEntry,
  saveCarUnitPatch,
} from '../v3/index.js';
import {
  uiBadgeSoft,
  uiButtons,
  uiEmptyState,
  uiForm,
  uiListRow,
  uiShell,
} from '../../ui/uiFormatClasses.js';
import VirtualizedScrollList from '../../components/roster/VirtualizedScrollList.jsx';

/**
 * Tablero de planificación: Sin asignar | Flota de carros.
 */
export default function TransportCarPlanningBoard({
  eventId,
  plan,
  setPlan,
  carLines = [],
  canEdit = false,
  onOpenCarUnit,
  onOpenPersonAssign,
}) {
  const [poolQuery, setPoolQuery] = useState('');
  const defaultCap = getDefaultCarCapacity(plan);
  const units = getCarUnits(plan);
  const unassigned = useMemo(() => getUnassignedCarLines(carLines, plan), [carLines, plan]);

  const filteredUnassigned = useMemo(() => {
    const q = poolQuery.trim().toLowerCase();
    if (!q) return unassigned;
    return unassigned.filter(
      (l) =>
        String(l.name || '')
          .toLowerCase()
          .includes(q) || String(l.location || '').toLowerCase().includes(q)
    );
  }, [unassigned, poolQuery]);

  const addCarUnit = (withDriverSk = '') => {
    if (!canEdit) return;
    const id = makeCarUnitId();
    const n = units.length + 1;
    const entry = normalizeCarUnitPlanEntry(
      { id, label: `Carro ${n}`, capacity: defaultCap },
      n - 1
    );
    const doc = blankCarUnitDoc({
      eventId,
      unitId: id,
      label: entry.label,
      capacity: entry.capacity,
    });
    if (withDriverSk) {
      doc.driverSourceKey = withDriverSk;
    }
    setPlan((prev) => {
      const normalized = normalizeTransportPlanning(prev);
      const carAssign = { ...(normalized.carAssign || {}) };
      if (withDriverSk) carAssign[withDriverSk] = id;
      return {
        ...normalized,
        transportVersion: Math.max(3, Number(normalized.transportVersion) || 0),
        carUnits: [...getCarUnits(normalized), entry],
        carAssign,
        carUnitSummaryById: {
          ...(normalized.carUnitSummaryById || {}),
          [id]: buildCarUnitSummaryEntry(doc),
        },
      };
    });
    void saveCarUnitPatch(eventId, id, doc, {
      driverLabel: '',
    });
    onOpenCarUnit?.(id, withDriverSk || undefined);
  };

  const suggestCarUnits = () => {
    if (!canEdit) return;
    const need = Math.max(unassigned.length, carLines.length);
    if (need === 0 && units.length === 0) {
      addCarUnit();
      return;
    }
    const suggested = Math.max(1, Math.ceil(need / defaultCap));
    const toAdd = Math.max(0, suggested - units.length);
    if (toAdd <= 0) return;
    const docsToPersist = [];
    setPlan((prev) => {
      const normalized = normalizeTransportPlanning(prev);
      const existing = getCarUnits(normalized);
      const added = [];
      const summary = { ...(normalized.carUnitSummaryById || {}) };
      for (let i = 0; i < toAdd; i += 1) {
        const id = makeCarUnitId();
        const entry = normalizeCarUnitPlanEntry(
          { id, label: `Carro ${existing.length + i + 1}`, capacity: defaultCap },
          existing.length + i
        );
        added.push(entry);
        const doc = blankCarUnitDoc({
          eventId,
          unitId: id,
          label: entry.label,
          capacity: entry.capacity,
        });
        summary[id] = buildCarUnitSummaryEntry(doc);
        docsToPersist.push(doc);
      }
      return {
        ...normalized,
        transportVersion: Math.max(3, Number(normalized.transportVersion) || 0),
        carUnits: [...existing, ...added],
        carUnitSummaryById: summary,
      };
    });
    for (const doc of docsToPersist) {
      void saveCarUnitPatch(eventId, doc.id, doc, { driverLabel: '' });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Planificación de carros</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
            {carLines.length} persona{carLines.length !== 1 ? 's' : ''} · {unassigned.length} sin asignar ·{' '}
            {units.length} carro{units.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" className={uiButtons.secondary} onClick={suggestCarUnits}>
              <Sparkles size={14} className="inline mr-1" aria-hidden />
              Generar unidades
            </button>
            <button type="button" className={uiButtons.primary} onClick={() => addCarUnit()}>
              <Plus size={14} className="inline mr-1" aria-hidden />
              Agregar carro
            </button>
          </div>
        ) : null}
      </div>

      {carLines.length === 0 ? (
        <div className={uiEmptyState.wrap}>
          <Car size={32} className={uiEmptyState.icon} />
          <p className={uiEmptyState.title}>Nadie llega en carro</p>
          <p className={uiEmptyState.help}>Cuando haya registros con llegada en carro, aparecerán aquí.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {/* Columna sin asignar */}
          <section className={`${uiShell.card} overflow-hidden`}>
            <div className={`${uiShell.cardHeader} px-4 py-3`}>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-200">
                Sin asignar ({unassigned.length})
              </h4>
            </div>
            <div className="p-3 space-y-2">
              <input
                className={uiForm.input}
                placeholder="Buscar en el pool…"
                value={poolQuery}
                onChange={(e) => setPoolQuery(e.target.value)}
              />
              <VirtualizedScrollList
                className="max-h-[min(28rem,55vh)] overflow-y-auto"
                items={filteredUnassigned}
                getItemKey={(line) => line.sourceKey}
                emptyContent={
                  <p className="text-xs text-slate-400 italic px-1 py-4 text-center">
                    {unassigned.length === 0 ? 'Todos asignados.' : 'Sin coincidencias.'}
                  </p>
                }
                renderItem={(line) => (
                  <button
                    type="button"
                    className={`${uiListRow.wrap} w-full text-left mb-1.5`}
                    onClick={() => {
                      if (typeof onOpenPersonAssign === 'function') {
                        onOpenPersonAssign(line.sourceKey);
                      } else if (canEdit) {
                        addCarUnit(line.sourceKey);
                      }
                    }}
                  >
                    <span className={uiListRow.main}>
                      <span className={uiListRow.primary}>{line.name}</span>
                      <span className={uiListRow.secondary}>
                        {line.location || '—'}
                        {line.kind === 'companion' ? ' · Acomp.' : ''}
                      </span>
                    </span>
                    <span className={uiListRow.meta}>
                      <span className={uiBadgeSoft('amber')}>Asignar</span>
                    </span>
                  </button>
                )}
              />
            </div>
          </section>

          {/* Columna flota */}
          <section className={`${uiShell.card} overflow-hidden`}>
            <div className={`${uiShell.cardHeader} px-4 py-3`}>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-teal-800 dark:text-teal-200">
                Flota ({units.length})
              </h4>
            </div>
            <VirtualizedScrollList
              className="p-3 max-h-[min(32rem,60vh)] overflow-y-auto"
              items={units}
              estimateSize={72}
              getItemKey={(unit) => unit.id}
              emptyContent={
                <div className="p-3">
                  <div className={uiEmptyState.wrap}>
                    <p className={uiEmptyState.title}>Sin carros aún</p>
                    <p className={uiEmptyState.help}>Agrega una unidad o genera según el pool.</p>
                  </div>
                </div>
              }
              renderItem={(unit, index) => {
                const summary = plan.carUnitSummaryById?.[unit.id];
                const members = getCarLinesForUnit(carLines, plan, unit.id);
                const cap = Math.max(1, parseInt(unit.capacity, 10) || defaultCap);
                const pending = summary?.needsAttention === true;
                return (
                  <button
                    type="button"
                    className={`${uiListRow.wrap} w-full text-left mb-2`}
                    onClick={() => onOpenCarUnit?.(unit.id)}
                  >
                    <span className={uiListRow.main}>
                      <span className={uiListRow.primary}>{unit.label || `Carro ${index + 1}`}</span>
                      <span className={uiListRow.secondary}>
                        {members.length}/{cap} plazas
                        {summary?.plates ? ` · ${summary.plates}` : ''}
                        {summary?.brand ? ` · ${summary.brand}` : ''}
                      </span>
                      {members.length > 0 ? (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {members.map((m) => m.name).join(', ')}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Sin personas</span>
                      )}
                    </span>
                    <span className={uiListRow.meta}>
                      {pending ? <span className={uiBadgeSoft('amber')}>Pendiente</span> : null}
                      {summary?.maybeAbsent ? <span className={uiBadgeSoft('slate')}>Ausente?</span> : null}
                    </span>
                  </button>
                );
              }}
            />
          </section>
        </div>
      )}
    </div>
  );
}
