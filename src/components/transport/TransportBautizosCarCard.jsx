import React from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import {
  carMetaNeedsAttention,
  formatTransportCarMemberRole,
} from '../../bautizosCarMeta.js';
import { titularSummaryNeedsAttention } from '../../transportCarMetaStore.js';

/**
 * Tarjeta de transporte Bautizos con colapso en dos niveles:
 * - Nivel 0: solo encabezado + leyenda pendiente (desde resumen liviano)
 * - Nivel 1: controles + lista conductor/pasajeros por carro + cuadro de formulario colapsado
 * - Nivel 2: formulario completo de vehículo y tripulación
 */
export default function TransportBautizosCarCard({
  cardKey,
  cardExpanded = false,
  onToggleCard,
  expandedCarFormKeys,
  onToggleCarForm,
  header,
  toolbar = null,
  bulkActions = null,
  expandedPrefix = null,
  slots = [],
  titularSk,
  effectiveCars,
  seatsPerCar = 5,
  titularSummary = null,
  isLoadingMeta = false,
  getSlotMeta,
  crewOpts = {},
  renderCarForm,
  className = 'rounded-xl border border-slate-200 dark:border-slate-700 p-3',
}) {
  const key = String(cardKey || '').trim();
  const formKeys = expandedCarFormKeys instanceof Set ? expandedCarFormKeys : new Set();
  const anyPending = !cardExpanded
    ? titularSummary
      ? titularSummaryNeedsAttention(titularSummary, crewOpts)
      : slots.some((slot) => {
          const meta = getSlotMeta?.(slot.carIndex);
          return meta && carMetaNeedsAttention(meta, crewOpts);
        })
    : false;

  const carFormStorageKey = (carIndex) => `${String(titularSk || '').trim()}|c${carIndex}`;

  return (
    <div className={className}>
      <button
        type="button"
        className="w-full flex items-start justify-between gap-2 text-left"
        onClick={() => onToggleCard?.(key)}
        aria-expanded={cardExpanded}
      >
        <div className="min-w-0 flex-1">{header}</div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {!cardExpanded && anyPending ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide border border-amber-400/80 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-600/60">
              Pendiente
            </span>
          ) : null}
          <ChevronDown
            size={16}
            className={`text-slate-400 transition-transform ${cardExpanded ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </div>
      </button>

      {cardExpanded ? (
        <div className="mt-3 space-y-3 border-t border-slate-200/80 dark:border-slate-600/80 pt-3">
          {isLoadingMeta ? (
            <p className="inline-flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400">
              <Loader2 size={14} className="animate-spin shrink-0" aria-hidden />
              Cargando datos de carro…
            </p>
          ) : null}
          {toolbar ? <div className="flex flex-wrap items-center justify-end gap-2">{toolbar}</div> : null}
          {expandedPrefix}
          {bulkActions}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {slots.map((slot) => {
              const meta = getSlotMeta?.(slot.carIndex);
              const slotPending = meta && carMetaNeedsAttention(meta, crewOpts);
              const formKey = carFormStorageKey(slot.carIndex);
              const formOpen = formKeys.has(formKey);
              return (
                <div
                  key={`${key}-slot-${slot.carIndex}`}
                  className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-800/50 p-3 flex flex-col gap-2"
                >
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Carro {slot.carIndex}{' '}
                    <span className="font-bold normal-case text-slate-400">
                      (hasta {seatsPerCar} plazas)
                    </span>
                  </p>
                  <ul className="space-y-1 text-xs font-semibold text-slate-800 dark:text-slate-100">
                    {(slot.members || []).map((m) => (
                      <li key={`${m.sourceKey}-${m.crewRole}`} className="flex items-center gap-2">
                        <span className="truncate">{m.name || '—'}</span>
                        <span className="text-[10px] font-bold text-slate-400 shrink-0">
                          {formatTransportCarMemberRole(m)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors text-left"
                    onClick={() => onToggleCarForm?.(formKey)}
                    aria-expanded={formOpen}
                    disabled={isLoadingMeta}
                  >
                    <ChevronDown
                      size={14}
                      className={`shrink-0 transition-transform ${formOpen ? 'rotate-180' : ''}`}
                      aria-hidden
                    />
                    <span>
                      Datos de carro y tripulación
                      {!formOpen && slotPending ? (
                        <span className="ml-1 text-amber-700 dark:text-amber-300 font-bold">· Pendiente</span>
                      ) : null}
                    </span>
                  </button>
                  {formOpen && !isLoadingMeta ? (
                    <div className="border-t border-slate-200/80 dark:border-slate-600/80 pt-2">
                      {renderCarForm?.(slot.carIndex, effectiveCars)}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
