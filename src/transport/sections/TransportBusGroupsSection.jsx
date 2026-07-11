import React from 'react';
import { Bus, Plus, Trash2 } from 'lucide-react';
import { countAssignedToUnit, getUnitsForSede, passengersForBusGroup } from '../../transportPlanningCore.js';
import { TransportLazySection, btnSecondary, inputSm, clampInt } from '../transportPlanningUi.jsx';
import VirtualizedList from '../../components/VirtualizedList.jsx';

export default function TransportBusGroupsSection({
  busSectionsEffective,
  busLines,
  busPassengersByGroupKey = null,
  plan,
  isCampa,
  splitCampaBySubevent,
  canEdit,
  canEditTransportOps,
  openBusPassengerGroups,
  toggleBusPassengerGroup,
  sortPassengersForDisplay,
  resolveCampaAmbosTransit,
  setCampaAmbosTransit,
  suggestUnitsForGroup,
  addUnit,
  removeUnit,
  updateUnit,
  assignBus,
  renderTransportAttendanceCheckbox,
}) {
  const passengerRowHeight = isCampa && splitCampaBySubevent ? 76 : 54;
  return (
    <div className="space-y-4">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 px-1">
        En transporte del evento (por sede de salida{splitCampaBySubevent ? ' · Teens / Jóvenes' : ''})
      </h3>
      {busSectionsEffective.length === 0 && busLines.length === 0 ? (
        <p className="text-sm text-slate-500 italic">No hay pasajeros en camión.</p>
      ) : null}

      {busSectionsEffective.map((section) => {
        const groupKey = section.groupKey;
        const passengers =
          busPassengersByGroupKey?.[groupKey] ??
          sortPassengersForDisplay(
            passengersForBusGroup(busLines, section)
              .filter((row) => {
                if (!(isCampa && splitCampaBySubevent)) return true;
                if (String(row?.campaSegment || '') !== 'Ambos') return true;
                const t = resolveCampaAmbosTransit(row.sourceKey);
                if (section.subevent === 'Teens') return t.teenArrive || t.teenReturn;
                if (section.subevent === 'Jóvenes') return t.jovenArrive || t.jovenReturn;
                return true;
              })
              .map((row) => {
                if (!(isCampa && splitCampaBySubevent)) return { ...row, transportSourceKey: row.sourceKey };
                if (String(row?.campaSegment || '') !== 'Ambos') return { ...row, transportSourceKey: row.sourceKey };
                const sub = String(section?.subevent || '').trim();
                return { ...row, transportSourceKey: `${row.sourceKey}|${sub || 'Ambos'}` };
              })
          );
        const units = getUnitsForSede(plan, groupKey);
        if (passengers.length === 0 && units.length === 0) return null;
        const requiredHint = Math.max(1, Math.ceil(passengers.length / plan.defaultBusCap));
        const assignedInSection = passengers.filter((row) => !!plan.busAssign[row.transportSourceKey || row.sourceKey]).length;
        return (
          <div
            key={`bus-${groupKey}`}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm"
          >
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
              <div className="font-black text-slate-800 dark:text-slate-100 flex flex-wrap items-center gap-2 min-w-0">
                <Bus size={18} className="text-indigo-500 shrink-0" />
                <span className="break-words">{section.title}</span>
                <span className="text-[10px] font-bold text-slate-500">
                  {passengers.length} en camión · {assignedInSection} asignados · sugerido ≥ {requiredHint} camión(es){' '}
                  ({plan.defaultBusCap} plazas)
                </span>
              </div>
              {canEdit ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={btnSecondary}
                    onClick={() => suggestUnitsForGroup(section, passengers.length)}
                  >
                    Generar unidades ({plan.defaultBusCap} plazas)
                  </button>
                  <button type="button" className={btnSecondary} onClick={() => addUnit(section, 'bus')}>
                    <Plus size={14} /> Camión
                  </button>
                  <button type="button" className={btnSecondary} onClick={() => addUnit(section, 'van')}>
                    <Plus size={14} /> Camioneta
                  </button>
                </div>
              ) : null}
            </div>

            {units.length > 0 ? (
              <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2 border-b border-slate-100 dark:border-slate-800">
                {units.map((u) => {
                  const occ = countAssignedToUnit(plan, u.id);
                  const cap = Math.max(1, parseInt(u.capacity, 10) || 1);
                  return (
                    <div
                      key={u.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-600 p-3 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black uppercase text-slate-500">
                          {u.kind === 'van' ? 'Camioneta' : 'Camión'}
                        </span>
                        {canEdit ? (
                          <button
                            type="button"
                            className="text-red-600 hover:text-red-700 p-1"
                            title="Quitar unidad"
                            onClick={() => removeUnit(groupKey, u.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : null}
                      </div>
                      <p className="text-sm font-black text-indigo-700 dark:text-indigo-300 tabular-nums">
                        Asignados: {occ} <span className="text-slate-500 font-bold text-xs">/ {cap} plazas</span>
                      </p>
                      <input
                        type="text"
                        className={inputSm}
                        disabled={!canEdit}
                        value={u.label || ''}
                        onChange={(e) => updateUnit(groupKey, u.id, { label: e.target.value })}
                      />
                      <label className="text-[10px] font-bold text-slate-500 flex items-center gap-2">
                        Plazas
                        <input
                          type="number"
                          min={1}
                          className={`${inputSm} w-20`}
                          disabled={!canEdit}
                          value={cap}
                          onChange={(e) =>
                            updateUnit(groupKey, u.id, { capacity: clampInt(e.target.value, 1, 200) })
                          }
                        />
                        <span className="tabular-nums text-slate-700 dark:text-slate-200">
                          {occ}/{cap}
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="px-4 py-3 text-xs text-amber-700 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-950/40">
                Sin unidades definidas. Usa «Generar» o añade camión/camioneta.
              </p>
            )}

            <TransportLazySection
              open={openBusPassengerGroups.has(groupKey)}
              onOpenChange={() => toggleBusPassengerGroup(groupKey)}
              debugSection={`busPassengers:${groupKey}`}
              shellClassName="border-t border-slate-100 dark:border-slate-800"
              headerClassName="w-full cursor-pointer px-4 py-3 flex items-center justify-between gap-2 text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60"
              header={<span>Lista de asistentes ({passengers.length}) — expandir para asignar</span>}
            >
              <div className="overflow-x-auto px-0 pb-3 bg-slate-50/50 dark:bg-slate-900/40">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 text-[10px] uppercase font-black text-slate-500 border-b border-slate-100 dark:border-slate-700">
                      <th className="px-3 py-2">Persona</th>
                      <th className="px-3 py-2">Sede registro</th>
                      {isCampa && splitCampaBySubevent ? <th className="px-3 py-2">Segmento</th> : null}
                      {isCampa && splitCampaBySubevent ? <th className="px-3 py-2">Ajuste x2</th> : null}
                      <th className="px-3 py-2">Asignación</th>
                      <th className="px-3 py-2">Asistió (día evento)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr>
                      <td
                        colSpan={isCampa && splitCampaBySubevent ? 6 : 4}
                        className="p-0 align-top"
                      >
                        <VirtualizedList
                          items={passengers}
                          itemHeight={passengerRowHeight}
                          overscan={10}
                          useParentScroll
                          renderItem={(row) => {
                            const assignKey = row.transportSourceKey || row.sourceKey;
                            const cur =
                              plan.busAssign[assignKey] ||
                              (String(row?.campaSegment || '') === 'Ambos' ? plan.busAssign[row.sourceKey] || '' : '');
                            return (
                              <table className="w-full text-left text-xs">
                                <tbody>
                                  <tr key={`${groupKey}-${assignKey}`}>
                                    <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-100">{row.name}</td>
                                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{row.location || '—'}</td>
                                    {isCampa && splitCampaBySubevent ? (
                                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                                        <div className="flex flex-col gap-1">
                                          <span>{String(row.campaSegment || '—')}</span>
                                          {String(row?.campaSegment || '') === 'Ambos' ? (
                                            <span className="text-[10px] text-slate-400">Default: llega Teens / regresa Jóvenes</span>
                                          ) : null}
                                        </div>
                                      </td>
                                    ) : null}
                                    {isCampa && splitCampaBySubevent ? (
                                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                                        {String(row?.campaSegment || '') === 'Ambos' ? (
                                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
                                            <label className="inline-flex items-center gap-1">
                                              <input
                                                type="checkbox"
                                                className="rounded border-slate-300"
                                                checked={resolveCampaAmbosTransit(row.sourceKey).teenReturn}
                                                onChange={(e) => setCampaAmbosTransit(row.sourceKey, { teenReturn: e.target.checked })}
                                                disabled={!canEdit}
                                              />
                                              Regresa Teens
                                            </label>
                                            <label className="inline-flex items-center gap-1">
                                              <input
                                                type="checkbox"
                                                className="rounded border-slate-300"
                                                checked={resolveCampaAmbosTransit(row.sourceKey).jovenArrive}
                                                onChange={(e) => setCampaAmbosTransit(row.sourceKey, { jovenArrive: e.target.checked })}
                                                disabled={!canEdit}
                                              />
                                              Llega Jóvenes
                                            </label>
                                          </div>
                                        ) : (
                                          <span className="text-slate-400">—</span>
                                        )}
                                      </td>
                                    ) : null}
                                    <td className="px-3 py-2">
                                      <select
                                        className={inputSm}
                                        disabled={!canEditTransportOps}
                                        value={cur}
                                        onChange={(e) => assignBus(assignKey, e.target.value)}
                                      >
                                        <option value="">Sin asignar</option>
                                        {units.map((u) => (
                                          <option key={u.id} value={u.id}>
                                            {u.label} ({u.kind === 'van' ? 'Camioneta' : 'Camión'})
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                    <td className="px-3 py-2">{renderTransportAttendanceCheckbox(assignKey)}</td>
                                  </tr>
                                </tbody>
                              </table>
                            );
                          }}
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </TransportLazySection>
          </div>
        );
      })}
    </div>
  );
}
