import React from 'react';

export default function DoubleRoleCollisionChip({ person, isBautizos, companionCollisionsInEvent }) {
  if (!isBautizos || !person?.id) return null;
  const clusters = companionCollisionsInEvent.byRegistrantId?.get?.(String(person.id)) || [];
  const actionable = clusters.filter((c) => c.confidence === 'certain' || c.confidence === 'probable');
  if (!actionable.length) return null;
  const hosts = actionable
    .map((c) => `${c.companionSide?.hostName || '—'} (${c.companionSide?.location || '?'})`)
    .slice(0, 3)
    .join('; ');
  return (
    <span
      key="double-role"
      className="chip-roster-double-role bg-violet-50 text-violet-900 text-[8px] font-black px-1.5 py-0.5 rounded uppercase inline-flex items-center justify-center border border-violet-200 h-5 leading-none"
      title={`También figura como acompañante: ${hosts}${actionable.length > 3 ? '…' : ''}`}
    >
      Doble rol
    </span>
  );
}
