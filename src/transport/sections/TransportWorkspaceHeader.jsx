import React, { useState } from 'react';
import { Bus, FileDown, MessageCircle, Settings2, X } from 'lucide-react';
import {
  uiButtons,
  uiForm,
  uiModal,
  uiPageHeader,
  uiPageHeaderIcon,
  uiShell,
  uiStat,
  uiStatTile,
} from '../../ui/uiFormatClasses.js';
import { clampInt } from '../transportConstants.js';
import { normalizeTransportPlanning } from '../../transportPlanningCore.js';

/**
 * Cabecera de la pestaña Transporte (uiPageHeader + uiStat).
 */
export default function TransportWorkspaceHeader({
  sedeScopeHint = '',
  evRosterFilteredLength = 0,
  busLinesLength = 0,
  carLinesLength = 0,
  totalUnitsAll = 0,
  carsTotal = 0,
  pendingCarDataCount = 0,
  saving = false,
  canEdit = false,
  canSendCarDataWhatsApp = false,
  onExportPdf,
  onBulkSendCarDataWhatsApp,
  plan,
  setPlan,
  isCampa = false,
}) {
  const [capsOpen, setCapsOpen] = useState(false);

  const setCap = (field, value) => {
    const n = clampInt(value, 1, 200);
    setPlan((prev) => {
      const next = normalizeTransportPlanning(prev);
      if (field === 'defaultCarCap') {
        return { ...next, defaultCarCap: n, bautizosCarCapacity: n };
      }
      return { ...next, [field]: n };
    });
  };

  return (
    <>
      <div className={`${uiShell.card} space-y-4 p-4 sm:p-5`}>
        <div className={uiPageHeader.wrap}>
          <div className={uiPageHeaderIcon('indigo')}>
            <Bus size={20} className="text-indigo-600 dark:text-indigo-300" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className={uiPageHeader.title}>Transporte</h2>
            <p className={`${uiPageHeader.subtitle} mt-0.5`}>
              Planifica camiones y carros. Usa los filtros de abajo como en Registro global.
            </p>
            {sedeScopeHint ? (
              <p className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 mt-1">{sedeScopeHint}</p>
            ) : null}
            {isCampa ? (
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug max-w-2xl">
                Campamento: con conteo Ambos x2 activo, los camiones se planifican por Teens y Jóvenes.
              </p>
            ) : null}
          </div>
          <div className={uiPageHeader.actions}>
            {saving ? (
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 px-2">Guardando…</span>
            ) : null}
            {canEdit ? (
              <button type="button" className={uiButtons.secondary} onClick={() => setCapsOpen(true)}>
                <Settings2 size={14} className="inline mr-1" aria-hidden />
                Plazas
              </button>
            ) : null}
            <button type="button" className={uiButtons.secondary} onClick={() => onExportPdf?.()}>
              <FileDown size={14} className="inline mr-1" aria-hidden />
              PDF
            </button>
            {canSendCarDataWhatsApp && pendingCarDataCount > 0 ? (
              <button
                type="button"
                className={`${uiButtons.whatsapp} bg-[#25D366] hover:bg-[#20BD5A] border border-[#1DA851]`}
                onClick={() => onBulkSendCarDataWhatsApp?.()}
                title="Solicitar datos de carro pendientes"
              >
                <MessageCircle size={14} aria-hidden />
                Datos carro ({pendingCarDataCount})
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <div className={uiStatTile('slate')}>
            <span className={uiStat.label}>Registros</span>
            <span className={uiStat.valueSm}>{evRosterFilteredLength}</span>
          </div>
          <div className={uiStatTile('indigo')}>
            <span className={uiStat.label}>En camión</span>
            <span className={uiStat.valueSm}>{busLinesLength}</span>
            <span className={uiStat.help}>{totalUnitsAll} unidad{totalUnitsAll !== 1 ? 'es' : ''}</span>
          </div>
          <div className={uiStatTile('teal')}>
            <span className={uiStat.label}>En carro</span>
            <span className={uiStat.valueSm}>{carLinesLength}</span>
            <span className={uiStat.help}>{carsTotal} carro{carsTotal !== 1 ? 's' : ''}</span>
          </div>
          <div className={uiStatTile('amber')}>
            <span className={uiStat.label}>Pendientes</span>
            <span className={uiStat.valueSm}>{pendingCarDataCount}</span>
            <span className={uiStat.help}>Datos de carro</span>
          </div>
          <div className={`${uiStatTile('violet')} col-span-2 sm:col-span-1`}>
            <span className={uiStat.label}>Plazas ref.</span>
            <span className={uiStat.valueSm}>
              {plan?.defaultBusCap || 40}/{plan?.defaultCarCap || plan?.bautizosCarCapacity || 5}
            </span>
            <span className={uiStat.help}>Camión / carro</span>
          </div>
        </div>
      </div>

      {capsOpen ? (
        <div className={uiModal.overlay} role="dialog" aria-modal="true" aria-labelledby="transport-caps-title">
          <button type="button" className={uiModal.backdrop} aria-label="Cerrar" onClick={() => setCapsOpen(false)} />
          <div className={uiModal.panelSm}>
            <div className={uiModal.header}>
              <h3 id="transport-caps-title" className={uiModal.title}>
                Plazas sugeridas
              </h3>
              <button type="button" className={uiButtons.closeIcon} onClick={() => setCapsOpen(false)} aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>
            <div className={`${uiModal.body} space-y-3`}>
              <label className="block space-y-1">
                <span className={uiForm.labelXs}>Camión</span>
                <input
                  type="number"
                  min={1}
                  className={uiForm.input}
                  value={plan?.defaultBusCap || 40}
                  disabled={!canEdit}
                  onChange={(e) => setCap('defaultBusCap', e.target.value)}
                />
              </label>
              <label className="block space-y-1">
                <span className={uiForm.labelXs}>Camioneta</span>
                <input
                  type="number"
                  min={1}
                  className={uiForm.input}
                  value={plan?.defaultVanCap || 15}
                  disabled={!canEdit}
                  onChange={(e) => setCap('defaultVanCap', e.target.value)}
                />
              </label>
              <label className="block space-y-1">
                <span className={uiForm.labelXs}>Carro</span>
                <input
                  type="number"
                  min={1}
                  className={uiForm.input}
                  value={plan?.defaultCarCap || plan?.bautizosCarCapacity || 5}
                  disabled={!canEdit}
                  onChange={(e) => setCap('defaultCarCap', e.target.value)}
                />
              </label>
            </div>
            <div className={uiModal.footer}>
              <button type="button" className={uiButtons.primary} onClick={() => setCapsOpen(false)}>
                Listo
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
