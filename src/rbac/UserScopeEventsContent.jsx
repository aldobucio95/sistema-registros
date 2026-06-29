import React from 'react';
import { PanelRight } from 'lucide-react';
import { normalizeRole } from './roles.js';
import { getUserAllowedEventIds } from './permissions.js';
import { adminScopeIsGloballyUnrestricted, buildScopeRows, mergedMenuSummaryLine } from './userAccessScope.js';

/**
 * Texto y tarjetas de alcance por evento/sede/menú (mismo contenido que el panel expandido de usuario).
 */
export default function UserScopeEventsContent({ user, events = [], globalPanelNav = {}, editorConfig = null }) {
  const isSuper = user && normalizeRole(user.role) === 'SuperUsuario';
  const scopeRows = buildScopeRows(user, events, globalPanelNav, editorConfig);
  const eventIds = getUserAllowedEventIds(user);
  const allEvents = Array.isArray(events) ? events : [];
  const compactAdmin = adminScopeIsGloballyUnrestricted(user);

  const hasAccessToAllLoadedEvents = eventIds.length === 0 && allEvents.length > 0;

  const scopeBody = isSuper ? (
    <div className="space-y-2 text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
      <p>
        <span className="font-bold dark:font-normal text-indigo-800 dark:text-indigo-300">Sedes y eventos: </span>
        <span className="text-indigo-950/90 dark:text-indigo-100">Acceso total al sistema (sin restricción por evento o sede).</span>
      </p>
    </div>
  ) : compactAdmin ? (
    <div className="space-y-2 text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
      <p>
        <span className="font-bold dark:font-normal text-teal-800 dark:text-teal-300">Sedes: </span>
        <span className="text-slate-700 dark:text-slate-200">Todas en cada evento.</span>
      </p>
      <p>
        <span className="font-bold dark:font-normal text-violet-800 dark:text-violet-300">Menú lateral (resumen): </span>
        <span className="text-slate-700 dark:text-slate-200">{mergedMenuSummaryLine(user, globalPanelNav)}</span>
      </p>
    </div>
  ) : scopeRows.length === 0 ? (
    <p className="text-[11px] text-amber-900 dark:text-amber-100">No hay eventos cargados en la app para desglosar sedes y menú.</p>
  ) : (
    <div className="rounded-lg border border-indigo-100/90 bg-gradient-to-b from-white to-indigo-50/35 shadow-sm dark:border-indigo-800 dark:from-slate-900 dark:to-slate-900">
      <div className="px-2 py-2 flex items-center gap-2 border-b border-indigo-100/80 dark:border-indigo-700 bg-indigo-50/40 dark:bg-indigo-600">
        <PanelRight size={14} className="text-indigo-600 dark:text-white shrink-0" aria-hidden />
        <span className="text-[11px] font-bold dark:font-normal text-indigo-900 dark:text-white">Por evento ({scopeRows.length})</span>
      </div>
      <div
        className={
          scopeRows.length > 3
            ? 'px-2 pb-3 pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'
            : 'px-2 pb-3 pt-2 space-y-3'
        }
      >
        {scopeRows.map((row) => (
          <div key={row.id} className="pl-2 border-l-[3px] border-indigo-400 dark:border-indigo-500 space-y-1 min-w-0">
            <p className="text-[11px] font-black dark:font-normal text-indigo-950 dark:text-indigo-100">{row.name}</p>
            <p className="text-[10px] text-teal-900/85 dark:text-teal-100 leading-snug break-words">
              <span className="font-bold dark:font-normal text-teal-800 dark:text-teal-300">Sedes: </span>
              {row.locLabel}
            </p>
            <p className="text-[10px] text-violet-900/85 dark:text-violet-100 leading-snug break-words">
              <span className="font-bold dark:font-normal text-violet-800 dark:text-violet-300">Menú: </span>
              {row.sectionLabel}
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-2">
      {hasAccessToAllLoadedEvents && !compactAdmin && !isSuper ? (
        <p className="text-[11px] text-indigo-800/90 bg-indigo-50/90 border border-indigo-100 rounded-md px-2 py-1.5 leading-snug dark:border-indigo-700 dark:bg-indigo-600 dark:text-white">
          <span className="font-bold dark:font-normal text-indigo-900 dark:text-white">Acceso a todos los eventos</span>{' '}
          (lista de eventos sin restricción explícita; el detalle por evento aparece abajo).
        </p>
      ) : null}
      <div>{scopeBody}</div>
    </div>
  );
}
