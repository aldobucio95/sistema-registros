import React from 'react';
import { ChevronDown, ChevronUp, Link2 } from 'lucide-react';
import { describeCollisionCluster, describeCollisionReasons } from '../../companionRegistrantCollision.js';

export default function CompanionCollisionGroups({
  clusters,
  context = 'summary',
  expandedGroupKeys,
  onToggleGroup,
  hasAdminRights,
  registryConfirmBusy,
  onOpenRegistryConfirm,
  registryConfirmBautizosEmpty,
}) {
  if (!clusters?.length) return null;
  return (
    <div className="mt-3 space-y-2">
      {clusters.map((cluster, gi) => {
        const groupKey = `${context}-cc-${gi}`;
        const isOpen = expandedGroupKeys.has(groupKey);
        const cs = cluster.companionSide || {};
        const rs = cluster.registrantSide || {};
        const reasonsText = describeCollisionReasons(cluster.reasons);
        return (
          <div key={groupKey} className="bg-white/80 border border-violet-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => onToggleGroup(groupKey)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-violet-50/50 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black text-violet-700 uppercase tracking-wider">
                    {cluster.confidence === 'certain'
                      ? 'Alta confianza'
                      : cluster.confidence === 'probable'
                        ? 'Probable'
                        : 'Posible'}
                  </span>
                  <span className="text-[10px] font-bold text-slate-700">
                    {cs.displayName || '—'} ↔ {rs.name || '—'}
                  </span>
                </div>
                <p className="text-[10px] text-violet-900/90 mt-1 leading-snug">
                  Titular {cs.hostName || '—'} ({cs.location || '?'}) · Activo {rs.name || '—'} ({rs.location || '?'})
                </p>
                {reasonsText ? (
                  <p className="text-[10px] text-violet-800/80 font-semibold mt-0.5">{reasonsText}</p>
                ) : null}
              </div>
              {isOpen ? (
                <ChevronUp size={16} className="text-violet-500 shrink-0" />
              ) : (
                <ChevronDown size={16} className="text-violet-500 shrink-0" />
              )}
            </button>
            {isOpen && hasAdminRights ? (
              <div className="px-3 pb-3 pt-1 border-t border-violet-100 flex flex-wrap gap-2">
                {cluster.suggestedAction === 'link_companion_to_registrant' ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black bg-violet-600 text-white hover:bg-violet-700"
                    onClick={() => {
                      if (registryConfirmBusy) return;
                      onOpenRegistryConfirm({
                        isOpen: true,
                        type: 'companion_link_collision',
                        loc: cs.location || '',
                        personId: cs.hostId || '',
                        personName: cs.displayName || '',
                        donationId: '',
                        donationAmount: 0,
                        refundAmount: 0,
                        paymentIndex: null,
                        paymentRowId: null,
                        fromDuplicateDiagnostic: false,
                        duplicateReasonsLine: describeCollisionCluster(cluster),
                        dupAcceptCluster: null,
                        companionCollisionCluster: cluster,
                        ...registryConfirmBautizosEmpty,
                      });
                    }}
                  >
                    <Link2 size={12} />
                    Vincular acompañante
                  </button>
                ) : null}
                <button
                  type="button"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                  onClick={() => {
                    if (registryConfirmBusy) return;
                    onOpenRegistryConfirm({
                      isOpen: true,
                      type: 'companion_ack_collision',
                      loc: '',
                      personId: rs.participantId || '',
                      personName: rs.name || '',
                      donationId: '',
                      donationAmount: 0,
                      refundAmount: 0,
                      paymentIndex: null,
                      paymentRowId: null,
                      fromDuplicateDiagnostic: false,
                      duplicateReasonsLine: describeCollisionCluster(cluster),
                      dupAcceptCluster: null,
                      companionCollisionCluster: cluster,
                      ...registryConfirmBautizosEmpty,
                    });
                  }}
                >
                  Reconocer aviso
                </button>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
