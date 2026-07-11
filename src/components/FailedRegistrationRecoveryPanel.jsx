import React, { useMemo } from 'react';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import ActivityLogMobileCard from './ActivityLogMobileCard.jsx';
import { failedRegistrationRecoveryToLogRow } from '../failedRegistrationRecovery.js';

export default function FailedRegistrationRecoveryPanel({
  records = [],
  hasAdminRights = false,
  expandedId = null,
  onToggleExpand,
  onOpenDetail,
}) {
  const rows = useMemo(() => records.map(failedRegistrationRecoveryToLogRow), [records]);

  if (!records.length) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-rose-200/50 dark:border-rose-900/40 overflow-hidden">
      <div className="px-3 py-2 sm:px-4 sm:py-2.5 border-b border-rose-100 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs sm:text-sm font-black text-rose-900 dark:text-rose-100 uppercase tracking-wider flex items-center gap-2">
          <AlertTriangle size={14} className="text-rose-500 shrink-0" />
          {hasAdminRights ? 'Registros fallidos (este dispositivo)' : 'Mis registros fallidos'}
        </h3>
        <span className="text-[10px] font-bold text-rose-700/80 dark:text-rose-300/80 tabular-nums">
          {records.length} pendiente{records.length === 1 ? '' : 's'}
        </span>
      </div>
      <p className="px-3 py-2 text-[10px] text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 leading-snug">
        Intentos de inscripción que no llegaron a Firestore. Solo visibles en este navegador; expande una fila para ver
        el detalle y reintentar.
      </p>

      <div className="md:hidden">
        {rows.map((log) => (
          <ActivityLogMobileCard
            key={log.id}
            log={log}
            hasAdminRights={false}
            isExpanded={expandedId === log.id}
            onToggleExpand={() => onToggleExpand?.(log.id)}
            detailsSlot={
              <button
                type="button"
                onClick={() => onOpenDetail?.(log.__recoveryRecord)}
                className="w-full text-left text-[10px] font-bold text-indigo-600 dark:text-indigo-300 py-1"
              >
                Ver detalle y reintentar →
              </button>
            }
          />
        ))}
      </div>

      <div className="hidden md:block overflow-x-auto max-h-[420px] overflow-y-auto">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 shadow-sm">
            <tr className="text-slate-500 dark:text-slate-400 text-[9px] uppercase tracking-wider font-black border-b border-slate-200 dark:border-slate-700">
              <th className="px-2 py-2">Fecha</th>
              {hasAdminRights ? <th className="px-2 py-2">Usuario</th> : null}
              <th className="px-2 py-2">Evento</th>
              <th className="px-2 py-2">Acción</th>
              <th className="px-2 py-2">Detalles</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
            {rows.map((log) => (
              <tr
                key={log.id}
                onClick={() => onOpenDetail?.(log.__recoveryRecord)}
                className={`cursor-pointer hover:bg-rose-50/40 dark:hover:bg-rose-950/15 transition-colors bg-rose-50/25 dark:bg-rose-950/10 ${expandedId === log.id ? 'ring-1 ring-rose-200 dark:ring-rose-500/40' : ''}`}
              >
                <td className="px-2 py-1.5 font-mono text-[9px] text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                {hasAdminRights ? (
                  <td className="px-2 py-1.5 text-[10px] font-semibold text-slate-700 dark:text-slate-200">{log.username}</td>
                ) : null}
                <td className="px-2 py-1.5 text-[10px] text-indigo-700 dark:text-indigo-300 font-bold">{log.eventName}</td>
                <td className="px-2 py-1.5 text-[9px] font-bold uppercase text-slate-600 dark:text-slate-300">{log.action}</td>
                <td className="px-2 py-1.5 text-[10px] text-slate-600 dark:text-slate-300">
                  <ChevronRight size={10} className="inline text-slate-400 mr-0.5" aria-hidden />
                  {log.details}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
