import React from 'react';
import { Bus, FileDown, MessageCircle } from 'lucide-react';
import { uiPageHeader } from '../../ui/uiFormatClasses.js';
import { btnSecondary, btnWhatsAppCarData, inputSm, clampInt } from '../transportPlanningUi.jsx';

export default function TransportPlanHeaderCard({
  sedeScopeHint,
  evRosterFilteredLength,
  busLinesLength,
  carLinesLength,
  totalUnitsAll,
  carsTotal,
  onExportPdf,
  isBautizos,
  canSendCarDataWhatsApp,
  pendingCarDataTitularCount,
  onBulkSendCarDataWhatsApp,
  saving,
  canEdit,
  plan,
  setDefaultCaps,
  setPlan,
  isCampa,
  normalizeTransportPlanning,
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Bus className="text-indigo-600 shrink-0" size={22} />
            Transporte
            {isBautizos ? (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-vnpm-teal">v2</span>
            ) : null}
          </h2>
          <p className={`${uiPageHeader.subtitle} mt-1 leading-snug max-w-2xl max-md:hidden text-[11px]`}>
            Camiones y camionetas por sede de salida, asignación de pasajeros y conteo de carros. Mismos filtros de
            búsqueda y sede que Registro global y Acompañantes.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug max-w-2xl md:hidden">
            Camiones, camionetas y carros por sede. Usa la barra de búsqueda y filtros debajo.
          </p>
          {sedeScopeHint ? (
            <p className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 mt-1">{sedeScopeHint}</p>
          ) : null}
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
            Registros en plan:{' '}
            <span className="font-black text-slate-800 dark:text-slate-100 tabular-nums">{evRosterFilteredLength}</span>
            <span className="text-slate-400"> · </span>
            En camión:{' '}
            <span className="font-black text-slate-800 dark:text-slate-100 tabular-nums">{busLinesLength}</span>
            <span className="text-slate-400"> · </span>
            En carro:{' '}
            <span className="font-black text-slate-800 dark:text-slate-100 tabular-nums">{carLinesLength}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-wider">
              Coincidencias
            </p>
            <p className="text-2xl font-black text-indigo-700 dark:text-indigo-400 tabular-nums">
              {evRosterFilteredLength}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">
              Unidades totales: <span className="text-indigo-600 dark:text-indigo-400">{totalUnitsAll}</span>
              {' · '}
              Carros estimados: <span className="text-indigo-600 dark:text-indigo-400">{carsTotal}</span>
            </div>
            <button type="button" className={btnSecondary} onClick={() => onExportPdf?.()}>
              <FileDown size={14} />
              Exportar PDF
            </button>
            {isBautizos && canSendCarDataWhatsApp && pendingCarDataTitularCount > 0 ? (
              <button
                type="button"
                className={btnWhatsAppCarData}
                onClick={() => onBulkSendCarDataWhatsApp?.()}
                title="Enviar solicitud de datos de carro a todos los titulares pendientes visibles"
              >
                <MessageCircle size={14} aria-hidden />
                WhatsApp datos carro ({pendingCarDataTitularCount})
              </button>
            ) : null}
            {saving ? (
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 px-2 py-1">
                Guardando…
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs">
        <label className="flex items-center gap-2 font-bold text-slate-600 dark:text-slate-300">
          Plazas camión (sugerencia)
          <input
            type="number"
            min={1}
            className={`${inputSm} w-20`}
            disabled={!canEdit}
            value={plan.defaultBusCap}
            onChange={(e) => setDefaultCaps('defaultBusCap', e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 font-bold text-slate-600 dark:text-slate-300">
          Plazas camioneta (sugerencia)
          <input
            type="number"
            min={1}
            className={`${inputSm} w-20`}
            disabled={!canEdit}
            value={plan.defaultVanCap}
            onChange={(e) => setDefaultCaps('defaultVanCap', e.target.value)}
          />
        </label>
        {isBautizos ? (
          <label className="flex items-center gap-2 font-bold text-slate-600 dark:text-slate-300">
            Plazas / carro (familias Bautizos)
            <input
              type="number"
              min={1}
              className={`${inputSm} w-20`}
              disabled={!canEdit}
              value={plan.bautizosCarCapacity}
              onChange={(e) => {
                const n = clampInt(e.target.value, 1, 30);
                setPlan((prev) => ({ ...normalizeTransportPlanning(prev), bautizosCarCapacity: n }));
              }}
            />
          </label>
        ) : null}
      </div>
      {isCampa ? (
        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-3 leading-snug border-t border-slate-100 dark:border-slate-700 pt-3">
          Campamento: con «Contar servidor Ambos x2…» activo en el dashboard, los camiones se planifican por bloques{' '}
          <span className="font-bold">Teens</span> y <span className="font-bold">Jóvenes</span>. En «Ambos», por defecto
          se considera llega en Teens y regresa en Jóvenes (transporte del evento), y puedes ajustar manualmente
          «Regresa Teens / Llega Jóvenes». Si desactivas esa casilla, un solo bloque por sede de salida.
        </p>
      ) : null}
    </div>
  );
}
