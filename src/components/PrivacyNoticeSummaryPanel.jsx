import React from 'react';
import { buildPrivacyNoticeSummary } from '../privacyNotice.js';

/**
 * Resumen para formularios. En registro manual incluye guion «Léale al registrado».
 * @param {'manual' | 'public'} audience
 */
export default function PrivacyNoticeSummaryPanel({
  privacyNotice,
  audience = 'public',
  showReadAloudLabel = false,
  className = '',
}) {
  const summary = buildPrivacyNoticeSummary(privacyNotice, audience);
  const lines = audience === 'manual' ? summary.paragraphs : summary.bullets;
  const ListTag = audience === 'manual' ? 'div' : 'ul';
  const ItemTag = audience === 'manual' ? 'p' : 'li';

  return (
    <div className={className}>
      {showReadAloudLabel ? (
        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
          Léale al registrado
        </p>
      ) : null}
      <ListTag
        className={
          audience === 'manual'
            ? 'space-y-1.5 text-[11px] text-slate-700 dark:text-slate-300 leading-snug'
            : 'space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300 leading-snug list-disc pl-4 marker:text-indigo-400'
        }
      >
        {lines.map((line, i) => (
          <ItemTag key={i}>{line}</ItemTag>
        ))}
      </ListTag>
      {audience === 'manual' && summary.staffNote ? (
        <p className="mt-1.5 text-[10px] text-slate-400 dark:text-slate-500 italic">{summary.staffNote}</p>
      ) : null}
    </div>
  );
}
