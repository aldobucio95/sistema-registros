import React from 'react';
import { GraduationCap, CheckCircle2 } from 'lucide-react';
import {
  uiForm, uiShell,
  uiPageHeader, uiPageHeaderIcon,
  uiTable, uiEmptyState, uiBadgeSoft, uiTypography,
  uiKbd, uiControls, uiRosterMobile,
} from '../../../ui/uiFormatClasses.js';
import ListMobileCard from '../../../components/ListMobileCard.jsx';

/**
 * Vista Becados (solo UI + tabla). La lógica de filtros y helpers viene por props explícitas desde App.
 */
export default function BecadosPage({
  currentEvent,
  allParticipants,
  participantIsActiveInEvent,
  participantIsActiveInRoster,
  isSiValue,
  applyGlobalRegistryLikeFilters,
  globalLocationFilters,
  getScholarshipCondonedAmount,
  resolveRegisteredCost,
  currentPricing,
  formatMoney,
  renderParticipantAssistanceBadges,
  renderGlobalRegistryListToolbar,
  scholarshipRealCostDraft,
  setScholarshipRealCostDraft,
  onSaveScholarshipRealCostBase,
  scholarshipRealCostBaseEffective,
  canEditScholarshipRealCost,
}) {
  if (!currentEvent) return null;
  const eventId = currentEvent.id;
  const approvedRaw = [];
  for (const p of allParticipants) {
    if (p.eventId !== eventId || !participantIsActiveInEvent(p) || !isSiValue(p.isScholarship)) continue;
    if (participantIsActiveInRoster(p)) approvedRaw.push(p);
  }
  let approved = applyGlobalRegistryLikeFilters(approvedRaw);
  if (globalLocationFilters.length > 0) {
    approved = approved.filter((p) => globalLocationFilters.includes(p.location));
  }
  const coincidenceTotal = approved.length;
  let totalCondonedApproved = 0;
  for (const p of approved) totalCondonedApproved += getScholarshipCondonedAmount(p);

  const rowSede = (p) => p.location || p.travelFrom || p.travelTo || '?';
  const rowTipo = (p) => {
    if (p.scholarshipType === 'partial') return 'Beca parcial';
    return 'Beca total';
  };

  const renderTable = (rows, emptyMsg) => {
    if (!rows.length) {
      return (
        <div className={uiEmptyState.wrap}>
          <GraduationCap size={28} className={uiEmptyState.icon} />
          <p className={uiEmptyState.title}>Sin becados</p>
          <p className={uiEmptyState.help}>{emptyMsg}</p>
        </div>
      );
    }
    return (
      <>
        <div className={uiRosterMobile.list}>
          {rows.map((p, i) => {
            const list = resolveRegisteredCost(p, currentPricing);
            const cond = getScholarshipCondonedAmount(p);
            return (
              <ListMobileCard
                key={p.id}
                title={
                  <span className="flex items-start gap-2">
                    <span className={`${uiKbd.base} min-w-[1.6rem] h-6 justify-center shrink-0`}>{i + 1}</span>
                    <span>{p.name || '?'}</span>
                  </span>
                }
                metaRows={[
                  { key: 'sede', label: 'Sede', value: rowSede(p) },
                  { key: 'tipo', label: 'Tipo', value: rowTipo(p) },
                  { key: 'lista', label: 'Costo lista', value: formatMoney(list) },
                  { key: 'cond', label: 'Condonado (beca)', value: formatMoney(cond) },
                ]}
              />
            );
          })}
        </div>
        <div className={`${uiTable.wrap} hidden md:block`}>
        <table className={uiTable.table}>
          <thead className={uiTable.thead}>
            <tr>
              <th className={uiTable.th}>Nombre</th>
              <th className={uiTable.th}>Sede</th>
              <th className={uiTable.th}>Tipo</th>
              <th className={uiTable.thRight}>Costo lista</th>
              <th className={uiTable.thRight}>Condonado (beca)</th>
            </tr>
          </thead>
          <tbody className={uiTable.tbody}>
            {rows.map((p, i) => {
              const list = resolveRegisteredCost(p, currentPricing);
              const cond = getScholarshipCondonedAmount(p);
              return (
                <tr key={p.id} className={uiTable.tr}>
                  <td className={`${uiTable.td} align-top`}>
                    <div className="flex items-start gap-2">
                      <span
                        className={`${uiKbd.base} min-w-[1.6rem] h-6 justify-center shrink-0 mt-0.5`}
                        title="Número en esta lista (filtros y orden actuales)"
                      >
                        {i + 1}
                      </span>
                      <p className="font-bold text-slate-800 dark:text-slate-100">{p.name || '?'}</p>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">{renderParticipantAssistanceBadges(p)}</div>
                  </td>
                  <td className={uiTable.td}>{rowSede(p)}</td>
                  <td className={uiTable.td}>
                    <span className={uiBadgeSoft('violet')}>
                      {rowTipo(p)}
                    </span>
                  </td>
                  <td className={uiTable.tdMoney}>{formatMoney(list)}</td>
                  <td className={`${uiTable.tdMoney} text-violet-700 dark:text-violet-300`}>{formatMoney(cond)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </>
    );
  };

  return (
    <div className={`${uiShell.pagePad} ${uiShell.pageStack} max-w-6xl mx-auto`}>
      <div className={`${uiShell.card} p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4`}>
        <div className="flex items-start gap-3 min-w-0">
          <div className={uiPageHeaderIcon('violet')}>
            <GraduationCap size={22} />
          </div>
          <div className="min-w-0">
            <h2 className={uiPageHeader.title}>Becados</h2>
            <p className={`${uiPageHeader.subtitle} mt-1 max-w-2xl`}>
              Solo becados con inscripción activa (no dados de baja ni en lista de espera). En Campa, el condonado se calcula sobre costo real (x2 para servidor Ambos tarifa única), menos lo pagado. Mismos filtros que Registro global.
            </p>
          </div>
        </div>
        <div className="text-left sm:text-right shrink-0">
          <p className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-wider">Coincidencias</p>
          <p className="text-2xl font-black text-violet-700 dark:text-violet-300">{coincidenceTotal}</p>
        </div>
      </div>

      {renderGlobalRegistryListToolbar(
        approvedRaw,
        'Solo afectan a esta vista de Becados (misma barra que Registro global).'
      )}

      <div className={`${uiShell.card} p-5`}>
        {canEditScholarshipRealCost ? (
          <div className="mb-3 flex flex-wrap items-end gap-2">
            <div className="min-w-[12rem]">
              <p className={`${uiForm.labelXs} mb-1`}>Costo real base para becas</p>
              <div className={uiControls.moneyInputWrap}>
                <span className={uiControls.moneyPrefix}>$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={scholarshipRealCostDraft}
                  onChange={(e) => setScholarshipRealCostDraft(e.target.value)}
                  onBlur={() => void onSaveScholarshipRealCostBase()}
                  className={uiControls.moneyInput}
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-300 pb-1">Base efectiva: {formatMoney(scholarshipRealCostBaseEffective)} (se guarda al salir del campo).</p>
          </div>
        ) : null}
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest mb-1">Costo total de beca (inscritos activos)</p>
        <p className={`text-2xl ${uiTypography.money} text-violet-700 dark:text-violet-300`}>{formatMoney(totalCondonedApproved)}</p>
        <p className="text-xs text-slate-500 dark:text-slate-300 mt-2">Suma del monto condonado de la lista filtrada (becados activos en nómina). Este total alimenta la fila automática de becas en Lista de gastos.</p>
      </div>

      <div className={`${uiShell.card} p-6 space-y-4`}>
        <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-600" /> Becados (inscripción activa)
          <span className="text-slate-400 font-bold normal-case text-xs">({approved.length})</span>
        </h3>
        {renderTable(approved, 'No hay becados inscritos activos en este evento.')}
      </div>
    </div>
  );
}
