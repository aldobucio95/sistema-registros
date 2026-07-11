import React from 'react';
import { TransportLazySection, btnSecondary } from '../transportPlanningUi.jsx';
import TransportRowByRowVirtualBody from './TransportRowByRowVirtualBody.jsx';

/** Vista colapsable «Detalle fila a fila» con tabla de carros. */
export default function TransportRowByRowSection({
  isOpen,
  onOpenChange,
  carLinesLength,
  canEdit,
  isCampa,
  isBautizos,
  mergingManualGroup,
  carPickSize,
  onMergeSelected,
  carTableColSpan,
  children,
  virtualItems = null,
  expandedCarDetailKeys = null,
  renderVirtualBlock = null,
  footerNote,
}) {
  const useVirtualBody =
    Array.isArray(virtualItems) &&
    virtualItems.length > 0 &&
    typeof renderVirtualBlock === 'function';
  return (
    <>
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <TransportLazySection
          open={isOpen === true}
          onOpenChange={onOpenChange}
          debugSection="rowByRow"
          shellClassName=""
          headerClassName="w-full cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          header={<span>Detalle fila a fila ({carLinesLength}) — expandir</span>}
        >
          <p className="px-4 pt-2 text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
            Marca y modelo: lista de referencia ~2025–2026. Con 2 o más carros por familia, capture datos de cada vehículo
            y marque «Quizá no vaya» en los que podrían no asistir (siempre debe quedar al menos uno confirmado).
          </p>
          {canEdit && (isCampa || isBautizos) ? (
            <div className="px-4 pt-3">
              <button
                type="button"
                className={btnSecondary}
                onClick={() => onMergeSelected?.()}
                disabled={carPickSize < 2 || mergingManualGroup}
              >
                {mergingManualGroup ? 'Cargando…' : 'Unir selección en un carro'}
              </button>
            </div>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-[10px] uppercase font-black text-slate-500 border-b border-slate-100 dark:border-slate-700">
                  {canEdit ? <th className="px-3 py-2 w-10" /> : null}
                  <th className="px-3 py-2">Persona</th>
                  <th className="px-3 py-2">Sede</th>
                  <th className="px-3 py-2">Carros (registro)</th>
                  <th className="px-3 py-2">Grupo / carros efectivos</th>
                  <th className="px-3 py-2">Marca</th>
                  <th className="px-3 py-2">Modelo</th>
                  <th className="px-3 py-2">Color</th>
                  <th className="px-3 py-2">Placas</th>
                  <th className="px-3 py-2">Asistió (día evento)</th>
                  {isBautizos ? <th className="px-3 py-2">Carros familia (manual)</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {useVirtualBody ? (
                  <TransportRowByRowVirtualBody
                    items={virtualItems}
                    expandedCarDetailKeys={expandedCarDetailKeys || new Set()}
                    renderBlock={renderVirtualBlock}
                  />
                ) : (
                  children
                )}
              </tbody>
            </table>
          </div>
        </TransportLazySection>
      </div>
      {footerNote ? (
        <p className="text-[10px] text-slate-500 dark:text-slate-400 px-1">{footerNote}</p>
      ) : null}
    </>
  );
}
