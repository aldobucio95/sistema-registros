import React from 'react';
import { SI_LABEL } from '../../appConstants.js';
import { buildLocationScopeSet, participantInLocationScope } from '../../rbac/permissions.js';
import { Settings2, Users } from 'lucide-react';
import { useWorkspaceShell } from '../../screens/eventWorkspace/WorkspaceShellContext.jsx';
import DoubleRoleCollisionChip from '../../components/roster/DoubleRoleCollisionChip.jsx';
import ParticipantAssistanceBadges from '../../components/roster/ParticipantAssistanceBadges.jsx';

function ServerProfilesPageContent() {
  const {
    DEFAULT_SERVE_AREA_OPTIONS,
    QUICK_ACTION_DARK_INTERACTION,
    allParticipants,
    currentEvent,
    filterParticipantRows,
    formatSiNo,
    globalConfig,
    globalLocationFilters,
    globalRegistryListFilters,
    handleAssignServerServeArea,
    hasAdminRights,
    isSiValue,
    participantIsActiveInEvent,
    participantIsActiveInRoster,
    renderGlobalRegistryListToolbar,
    renderPublicLinkExtChip,
    resolveLlegaEnCarro,
    resolveRegresaEnCarro,
    scopedEventParticipants,
    setServeAreaOptionsForm,
    setServeAreaOptionsModal,
    visibleLocations,
    companionCollisionsInEvent,
  } = useWorkspaceShell();

  const activeRoster = scopedEventParticipants.filter(
    (p) => participantIsActiveInEvent(p) && participantIsActiveInRoster(p)
  );
  const basePool = activeRoster.filter((p) => isSiValue(p.isServer));
  let rows = filterParticipantRows(basePool, false, globalRegistryListFilters, {});
  const locationScopeSet = buildLocationScopeSet(visibleLocations);
  if (locationScopeSet) {
    rows = rows.filter((p) => participantInLocationScope(p, locationScopeSet));
  }
  if (globalLocationFilters.length > 0) {
    rows = rows.filter((p) => globalLocationFilters.includes(p.location));
  }
  const coincidenceTotal = rows.length;
  const sedeScopeHint =
    visibleLocations.length === 1
      ? `Mostrando solo la sede ${visibleLocations[0]}.`
      : visibleLocations.length > 0 && visibleLocations.length < (currentEvent?.locations || []).length
        ? `Sedes visibles para tu usuario: ${visibleLocations.join(', ')}.`
        : null;

  const serveAreaPickList = (
    globalConfig?.serveAreaOptions?.length ? globalConfig.serveAreaOptions : DEFAULT_SERVE_AREA_OPTIONS
  ).filter((x) => String(x || '').trim() !== '');

  const chartColors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#64748b', '#f43f5e', '#84cc16'];
  const buildPieGradient = (segments) => {
    const total = segments.reduce((s, x) => s + x.value, 0);
    if (total <= 0) return '#e2e8f0';
    let cur = 0;
    const parts = [];
    segments.forEach((seg, i) => {
      if (!seg.value) return;
      const per = (seg.value / total) * 100;
      const color = seg.color || chartColors[i % chartColors.length];
      parts.push(`${color} ${cur}% ${cur + per}%`);
      cur += per;
    });
    return parts.length ? `conic-gradient(${parts.join(', ')})` : '#e2e8f0';
  };

  const areaDistMap = new Map();
  let congSi = 0;
  let congNo = 0;
  let assignedCount = 0;
  let pendingAssign = 0;
  for (const p of rows) {
    const a = String(p.assignedServeArea || '').trim();
    if (a) {
      assignedCount += 1;
      areaDistMap.set(a, (areaDistMap.get(a) || 0) + 1);
    } else {
      pendingAssign += 1;
      areaDistMap.set('Sin asignar', (areaDistMap.get('Sin asignar') || 0) + 1);
    }
    if (isSiValue(p.servesInCongress)) congSi += 1;
    else congNo += 1;
  }
  const areaPieSegments = [...areaDistMap.entries()]
    .filter(([, v]) => v > 0)
    .map(([label, value], i) => ({ label, value, color: chartColors[i % chartColors.length] }));
  const congPieSegments = [
    { label: 'Sirve en congre', value: congSi, color: '#6366f1' },
    { label: 'No', value: congNo, color: '#cbd5e1' },
  ].filter((s) => s.value > 0);
  const pendingPieSegments = [
    { label: 'Área asignada', value: assignedCount, color: '#10b981' },
    { label: 'Pendiente de asignar', value: pendingAssign, color: '#f97316' },
  ].filter((s) => s.value > 0);

  return (
    <div className="p-6 space-y-5">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
            <Users className="text-amber-500" size={18} />
            Servidores - Página adicional
          </h3>
          <p className="text-xs text-slate-500">
            Solo servidores con inscripción activa (no dados de baja ni en lista de espera). Mismos filtros que
            Registro global.
          </p>
          {sedeScopeHint ? (
            <p className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 mt-1">{sedeScopeHint}</p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          {hasAdminRights ? (
            <button
              type="button"
              onClick={() => {
                setServeAreaOptionsForm(
                  globalConfig?.serveAreaOptions?.length
                    ? [...globalConfig.serveAreaOptions]
                    : [...DEFAULT_SERVE_AREA_OPTIONS]
                );
                setServeAreaOptionsModal({ isOpen: true });
              }}
              className="text-[10px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              <Settings2 size={12} /> Editar áreas para servir
            </button>
          ) : null}
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Coincidencias</p>
            <p className="text-2xl font-black text-amber-600">{coincidenceTotal}</p>
          </div>
        </div>
      </div>

      {coincidenceTotal > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Por área asignada</p>
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-28 h-28 rounded-full border-4 border-white shadow-inner shrink-0"
                style={{ background: buildPieGradient(areaPieSegments) }}
              />
              <ul className="w-full space-y-1 text-[10px] text-slate-600">
                {areaPieSegments.map((s) => (
                  <li key={s.label} className="flex justify-between gap-2">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="truncate">{s.label}</span>
                    </span>
                    <span className="font-black text-slate-800 tabular-nums">{s.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Servidores y congre</p>
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-28 h-28 rounded-full border-4 border-white shadow-inner shrink-0"
                style={{ background: buildPieGradient(congPieSegments) }}
              />
              <ul className="w-full space-y-1 text-[10px] text-slate-600">
                {congPieSegments.map((s) => (
                  <li key={s.label} className="flex justify-between gap-2">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="truncate">{s.label}</span>
                    </span>
                    <span className="font-black text-slate-800 tabular-nums">{s.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Asignación de área</p>
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-28 h-28 rounded-full border-4 border-white shadow-inner shrink-0"
                style={{ background: buildPieGradient(pendingPieSegments) }}
              />
              <ul className="w-full space-y-1 text-[10px] text-slate-600">
                {pendingPieSegments.map((s) => (
                  <li key={s.label} className="flex justify-between gap-2">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="truncate">{s.label}</span>
                    </span>
                    <span className="font-black text-slate-800 tabular-nums">{s.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {renderGlobalRegistryListToolbar(
        basePool,
        'Solo afectan a esta vista de Servidores (misma barra que Registro global).'
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider font-black">
              <th className="px-3 py-3">Servidor</th>
              <th className="px-3 py-3">Asignación</th>
              <th className="px-3 py-3">Área deseada</th>
              <th className="px-3 py-3">Sirvió en otro campa</th>
              <th className="px-3 py-3">Áreas previas</th>
              <th className="px-3 py-3">Sirve en congre</th>
              <th className="px-3 py-3">Casado / Pareja</th>
              <th className="px-3 py-3">Hijos</th>
              <th className="px-3 py-3">Sale de</th>
              <th className="px-3 py-3">Regresa a</th>
              <th className="px-3 py-3 min-w-[9rem]">Área para servir</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-slate-400 italic" colSpan={11}>
                  Sin servidores con esos filtros.
                </td>
              </tr>
            ) : (
              rows.map((p) => {
                const saleLoc = p.travelFrom || p.location || '?';
                const regresaLoc = p.travelTo || p.location || '?';
                const saleTxt = resolveLlegaEnCarro(p) ? `${saleLoc} (auto)` : saleLoc;
                const regresaTxt = resolveRegresaEnCarro(p) ? `${regresaLoc} (auto)` : regresaLoc;
                const congTxt = isSiValue(p.servesInCongress)
                  ? `${SI_LABEL}${
                      p.congressServeArea && String(p.congressServeArea).trim()
                        ? ` (${String(p.congressServeArea).trim()})`
                        : ''
                    }`
                  : 'No';
                return (
                  <tr key={`srv-${p.id}`} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2 align-top">
                      <p className="font-bold text-slate-700">{p.name}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {renderPublicLinkExtChip(p)}
                        <DoubleRoleCollisionChip
                          person={p}
                          isBautizos={false}
                          companionCollisionsInEvent={companionCollisionsInEvent}
                        />
                        <ParticipantAssistanceBadges person={p} isBautizos={false} currentEvent={currentEvent} />
                      </div>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{p.serverAssignment || '?'}</td>
                    <td className="px-3 py-2 text-slate-600">{p.preferredServeArea || '?'}</td>
                    <td className="px-3 py-2 text-slate-600">{p.servedOtherCampa || 'No'}</td>
                    <td className="px-3 py-2 text-slate-600">{p.servedAreas || '?'}</td>
                    <td className="px-3 py-2 text-slate-600">{congTxt}</td>
                    <td className="px-3 py-2 text-slate-600 align-top">
                      {!isSiValue(p.isMarried) ? (
                        'No'
                      ) : (
                        <div>
                          <span>
                            {SI_LABEL}
                            {p.spouseName ? ` (${p.spouseName})` : ''}
                          </span>
                          {(() => {
                            const sid = String(p.spouseParticipantId || '').trim();
                            const partner = sid ? allParticipants.find((x) => String(x.id) === sid) : null;
                            const linkedFromOther =
                              !sid &&
                              allParticipants.find((x) => String(x.spouseParticipantId || '').trim() === String(p.id));
                            if ((sid && partner) || linkedFromOther) {
                              const show = partner || linkedFromOther;
                              return (
                                <span className="block text-[10px] text-emerald-700 font-semibold mt-0.5">
                                  Vinculado: {show?.name || '?'}
                                  {!sid && linkedFromOther ? ' (enlace desde pareja)' : ''}
                                </span>
                              );
                            }
                            if (sid && !partner) {
                              return (
                                <span className="block text-[10px] text-amber-700 mt-0.5">Ref. pareja: {sid}</span>
                              );
                            }
                            return (
                              <span className="block text-[10px] text-slate-500 mt-0.5">
                                Pendiente de asignar pareja
                                {p.spousePhone && String(p.spousePhone).trim()
                                  ? ` · Tel. ${String(p.spousePhone).trim()}`
                                  : ''}
                              </span>
                            );
                          })()}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {isSiValue(p.goesWithChildren)
                        ? `${SI_LABEL}${p.childrenCount && String(p.childrenCount).trim() ? ` (${p.childrenCount})` : ''}`
                        : 'No'}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{saleTxt}</td>
                    <td className="px-3 py-2 text-slate-600">{regresaTxt}</td>
                    <td className="px-3 py-2 align-top" onClick={(e) => e.stopPropagation()}>
                      {!hasAdminRights ? (
                        <span className="text-slate-400">{String(p.assignedServeArea || '').trim() || '—'}</span>
                      ) : (
                        <select
                          className={`w-full max-w-[11rem] text-[10px] font-bold border border-amber-200 rounded-lg px-2 py-1.5 bg-white text-slate-800 dark:bg-slate-800 dark:border-indigo-700 dark:text-slate-100 dark:shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500/80 dark:focus:ring-2 dark:focus:ring-indigo-500 ${QUICK_ACTION_DARK_INTERACTION}`}
                          value={String(p.assignedServeArea || '').trim()}
                          onChange={(e) => void handleAssignServerServeArea(p, e.target.value)}
                        >
                          <option value="">Sin asignar</option>
                          {(function pickOpts() {
                            const cur = String(p.assignedServeArea || '').trim();
                            const base = [...serveAreaPickList];
                            if (cur && !base.includes(cur)) base.unshift(cur);
                            return base;
                          })().map((opt) => (
                            <option key={`srv-area-${p.id}-${opt}`} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default React.memo(ServerProfilesPageContent);
