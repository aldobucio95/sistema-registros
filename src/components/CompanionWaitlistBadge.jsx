import React from 'react';
import { Clock } from 'lucide-react';

/**
 * Indicador visual: acompañante en lista de espera (cupo lleno, pendiente de promover).
 */
export default function CompanionWaitlistBadge({ hostName = '', className = '', compact = false }) {
  const host = String(hostName || '').trim();
  const title = host
    ? `Acompañante en lista de espera del grupo de ${host} (no cuenta en cupo activo hasta promover)`
    : 'Acompañante en lista de espera (no cuenta en cupo activo hasta promover)';
  return (
    <span
      className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded inline-flex items-center gap-1 border bg-violet-50 text-violet-800 border-violet-200 dark:bg-violet-600 dark:text-white dark:border-violet-700 ${className}`.trim()}
      title={title}
    >
      <Clock size={10} className="shrink-0 opacity-90" aria-hidden />
      {compact ? 'En espera' : 'Lista de espera'}
      {!compact && host ? (
        <span className="font-semibold normal-case text-[9px] opacity-90">· {host}</span>
      ) : null}
    </span>
  );
}
