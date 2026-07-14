import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { canonicalizeVnpPersonId } from '../../publicRegistrationLogic.js';

function digitsOnlyPhone(phone) {
  return (phone || '').replace(/\D/g, '');
}

export default function DuplicateGroupsPanel({
  clusters,
  context,
  expandedDupGroups,
  expandedDupPersons,
  onToggleDupGroup,
  onToggleDupPerson,
  hasFinancialAccess,
  getLiquidationTarget,
  renderDupPersonDetail,
}) {
  if (!clusters || clusters.length === 0) return null;
  return (
    <div className="mt-3 space-y-2">
      {clusters.map((cluster, gi) => {
        const membersAll = Array.isArray(cluster?.members) ? cluster.members : [];
        const display =
          Array.isArray(cluster.displayMembers) && cluster.displayMembers.length ? cluster.displayMembers : membersAll;
        const groupKey = `${context}-${gi}`;
        const isGroupOpen = expandedDupGroups.has(groupKey);
        const locs = [...new Set(display.map((p) => p.location))];
        const reasons = cluster.reasons || [];
        const reasonsText = reasons.length ? reasons.join(' · ') : '';
        const kind = cluster.kind || 'phone';
        const headerPhone = kind === 'phone' ? digitsOnlyPhone(membersAll[0]?.phone || display[0]?.phone || '') : '';
        const headerVnp =
          kind === 'vnp' ? canonicalizeVnpPersonId(membersAll[0]?.vnpPersonId || display[0]?.vnpPersonId || '') : '';
        return (
          <div key={gi} className="bg-white/70 border border-amber-100 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => onToggleDupGroup(groupKey)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-amber-50/50 transition-colors"
            >
              <div className="flex flex-col gap-1 min-w-0 w-full">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider shrink-0">
                    Grupo {gi + 1}
                  </span>
                  {kind === 'phone' && (
                    <span className="text-[10px] text-slate-500">
                      Tel:{' '}
                      <span className="font-mono font-bold">
                        {headerPhone ? headerPhone : membersAll[0]?.phone || 'Sin tel'}
                      </span>
                    </span>
                  )}
                  {kind === 'vnp' && headerVnp && (
                    <span className="text-[10px] text-slate-500">
                      ID VNPM: <span className="font-mono font-bold">{headerVnp}</span>
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400">·</span>
                  <span className="text-[10px] text-slate-500">
                    {display.length} registro{display.length === 1 ? '' : 's'} en vista
                    {membersAll.length !== display.length ? ` (${membersAll.length} en el grupo completo)` : ''} ·{' '}
                    {locs.length > 1 ? `Sedes: ${locs.join(', ')}` : `Sede: ${locs[0] || '?'}`}
                  </span>
                  {display.map((p) => (
                    <span
                      key={p.id}
                      className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold"
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
                {reasonsText ? (
                  <p className="text-[10px] text-amber-900/90 font-semibold leading-snug pl-0.5">
                    Parámetros en conflicto: {reasonsText}
                  </p>
                ) : null}
              </div>
              {isGroupOpen ? (
                <ChevronUp size={16} className="text-amber-500 shrink-0" />
              ) : (
                <ChevronDown size={16} className="text-amber-500 shrink-0" />
              )}
            </button>
            {isGroupOpen && (
              <div className="px-3 pb-3 space-y-2 border-t border-amber-100 pt-2">
                {display.map((p) => {
                  const personKey = `${groupKey}-${p.id}`;
                  const isPersonOpen = expandedDupPersons.has(personKey);
                  const liq = getLiquidationTarget(p);
                  const paidGross = parseFloat(p.paid || 0);
                  return (
                    <div key={p.id} className="border border-slate-200 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => onToggleDupPerson(personKey)}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex flex-wrap items-center gap-2 text-[11px] min-w-0">
                          <span className="font-bold text-slate-800">{p.name}</span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-500">{p.location}</span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-500 font-mono text-[10px]">ID: {p.id}</span>
                          {hasFinancialAccess && (
                            <>
                              <span className="text-slate-400">·</span>
                              <span
                                className={
                                  paidGross >= liq ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'
                                }
                              >
                                Pagado: ${paidGross} / ${liq}
                              </span>
                            </>
                          )}
                          <span className="text-slate-400">·</span>
                          <span className="text-[10px] text-slate-400">
                            {p.registeredAt ? new Date(p.registeredAt).toLocaleString('es-MX') : 'Sin fecha'}
                            {p.registeredBy ? (
                              <>
                                {' '}
                                <span className="text-slate-500">· Por: {p.registeredBy}</span>
                              </>
                            ) : null}
                          </span>
                        </div>
                        {isPersonOpen ? (
                          <ChevronUp size={14} className="text-slate-400 shrink-0" />
                        ) : (
                          <ChevronDown size={14} className="text-slate-400 shrink-0" />
                        )}
                      </button>
                      {isPersonOpen && (
                        <div className="px-3 pb-3 pt-1">{renderDupPersonDetail(p, cluster)}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
