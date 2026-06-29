import React from 'react';
import { Database, History, Undo, UserCircle, ChevronRight } from 'lucide-react';
import { uiBadgeMini, uiTonalButton } from '../ui/uiFormatClasses.js';

function ctxBadgeClass(log) {
  if (log.isDebug) {
    return 'inline-flex max-w-full text-[9px] font-bold px-1 py-0.5 rounded border bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-100 border-orange-200 dark:border-orange-500/45 break-words leading-tight';
  }
  if (log.isHidden) {
    return 'inline-flex max-w-full text-[9px] font-bold px-1 py-0.5 rounded border bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-100 border-purple-200 dark:border-purple-500/45 break-words leading-tight';
  }
  return 'inline-flex max-w-full text-[9px] font-bold px-1 py-0.5 rounded border bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-100 border-indigo-200 dark:border-indigo-500/45 break-words leading-tight';
}

function actionBadgeClass(log) {
  if (log.isDebug) {
    return 'inline-flex text-[9px] font-bold px-1 py-0.5 rounded uppercase tracking-wide bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-100 leading-tight break-words';
  }
  if (log.isHidden) {
    return 'inline-flex text-[9px] font-bold px-1 py-0.5 rounded uppercase tracking-wide bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-100 leading-tight break-words';
  }
  return 'inline-flex text-[9px] font-bold px-1 py-0.5 rounded uppercase tracking-wide bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 leading-tight break-words';
}

function accentBorder(log) {
  if (log.isDebug) return 'border-l-orange-500 dark:border-l-orange-400';
  if (log.isHidden) return 'border-l-purple-500 dark:border-l-purple-400';
  return 'border-l-indigo-500 dark:border-l-indigo-400';
}

function rowBg(log) {
  if (log.isDebug) return 'bg-orange-50/55 dark:bg-orange-950/20';
  if (log.isHidden) return 'bg-purple-50/55 dark:bg-purple-950/20';
  return 'bg-white/70 dark:bg-slate-900/40';
}

/**
 * Fila densa de actividad para móvil: fecha, usuario, contexto, acción, detalles y acciones admin.
 */
export default function ActivityLogMobileCard({
  log,
  hasAdminRights = false,
  isSuperUser = false,
  isSelected = false,
  isExpanded = false,
  onToggleExpand,
  detailsSlot = null,
  onToggleSelect,
  onRestoreBackup,
  onRestoreSingle,
  onRollback,
}) {
  const userIconClass = log.isDebug
    ? 'text-orange-500 shrink-0'
    : log.isHidden
      ? 'text-purple-500 shrink-0'
      : 'text-indigo-500 shrink-0';

  const showAdminActions = hasAdminRights;

  return (
    <article
      onClick={onToggleExpand}
      className={`px-2 py-1.5 border-b border-slate-200/80 dark:border-slate-700/70 border-l-[3px] ${accentBorder(log)} ${rowBg(log)} ${onToggleExpand ? 'cursor-pointer' : ''} ${log.isError ? 'bg-rose-50/55 dark:bg-rose-950/20' : ''}`}
    >
      <div className="flex items-start justify-between gap-1.5 min-w-0">
        <time className="font-mono text-[9px] tabular-nums text-slate-500 dark:text-slate-400 shrink-0 leading-tight">
          {log.timestamp || '—'}
        </time>
        <span className="text-[9px] font-bold text-slate-700 dark:text-slate-200 inline-flex items-center gap-0.5 min-w-0 justify-end">
          <UserCircle size={10} className={userIconClass} aria-hidden />
          <span className="truncate">{log.username || '—'}</span>
        </span>
      </div>

      <div className="mt-0.5 flex flex-wrap items-center gap-1 min-w-0">
        <span className={ctxBadgeClass(log)}>{log.eventName || '—'}</span>
        <span className={actionBadgeClass(log)}>{log.action || '—'}</span>
        {log.isDebug ? <span className={uiBadgeMini('amber', 'soft')}>Dbg</span> : null}
        {log.isHidden ? <span className={uiBadgeMini('violet', 'soft')}>Oculto</span> : null}
        {log.status === 'error' || log.isError ? <span className={uiBadgeMini('rose', 'soft')}>Error</span> : null}
        {log.status === 'pending' ? <span className={uiBadgeMini('amber', 'soft')}>Pend.</span> : null}
      </div>

      <p className="mt-0.5 text-[10px] leading-snug text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-words">
        {onToggleExpand ? (
          <ChevronRight
            size={10}
            className={`inline align-middle mr-0.5 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            aria-hidden
          />
        ) : null}
        <span className="text-[8px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-500 mr-1">
          Det.
        </span>
        {log.details || '—'}
      </p>

      {isExpanded && detailsSlot ? (
        <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
          {detailsSlot}
        </div>
      ) : null}

      {showAdminActions ? (
        <div className="mt-1 pt-1 border-t border-slate-200/70 dark:border-slate-700/60 flex flex-wrap items-center justify-end gap-1">
          {log.revertInfo?.isBackup ? (
            <button
              type="button"
              onClick={onRestoreBackup}
              className={`${uiTonalButton('indigo')} !px-1.5 !py-0.5 !text-[8px] min-h-0`}
              title="Restaurar copia de seguridad"
            >
              <Database size={10} className="shrink-0" />
              Restaurar
            </button>
          ) : log.revertInfo ? (
            <>
              <button
                type="button"
                onClick={onRestoreSingle}
                className={`${uiTonalButton('slate')} !px-1.5 !py-0.5 !text-[8px] min-h-0`}
                title="Restaurar este cambio"
              >
                <Undo size={10} className="shrink-0" />
                Restaurar
              </button>
              {isSuperUser ? (
                <button
                  type="button"
                  onClick={onRollback}
                  className={`${uiTonalButton('rose')} !px-1.5 !py-0.5 !text-[8px] min-h-0`}
                  title="Revertir hasta aquí"
                >
                  <History size={10} className="shrink-0" />
                  Revertir
                </button>
              ) : null}
            </>
          ) : (
            <span className="text-[8px] text-slate-400 dark:text-slate-500 italic font-medium">N/D</span>
          )}
          {isSuperUser && !log.revertInfo?.isBackup ? (
            <label
              className="inline-flex items-center gap-1 text-[8px] font-bold text-slate-600 dark:text-slate-300"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={onToggleSelect}
                className="accent-indigo-600 w-3 h-3 rounded cursor-pointer"
              />
              Seleccionar
            </label>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
