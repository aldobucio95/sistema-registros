import React, { useEffect, useState } from 'react';
import { formatStoredClientVersionForSuperUser, hasRecordedClientAppVersion } from './appVersion.js';
import { getOnlineSinceMs, formatActiveDurationEs, formatDurationStaticEs } from './UserClientVersionCell.jsx';

function formatLastAccessEs(user) {
  const raw = user?.lastAccessAt || user?.lastClientAppVersionSeenAt;
  if (raw) {
    const d = new Date(String(raw));
    if (!Number.isNaN(d.getTime())) return d.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
    return String(raw).slice(0, 19).replace('T', ' ');
  }
  const end = user?.lastSessionEndedAt;
  if (end != null) {
    const n = typeof end === 'number' && Number.isFinite(end) ? end : typeof end?.toMillis === 'function' ? end.toMillis() : null;
    if (n != null) return new Date(n).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
  }
  return null;
}

const label = 'text-[8px] font-black uppercase tracking-wider';

/**
 * Resumen SuperUsuario en lista: estado/sesión, último acceso, duración última sesión, versión, pantalla (solo texto a color).
 */
export default function UserSessionSummaryCell({ user }) {
  const online = !!user?.isOnline;
  const fromMs = getOnlineSinceMs(user);
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!online || fromMs == null) return undefined;
    const id = setInterval(() => setTick((n) => n + 1), 15000);
    return () => clearInterval(id);
  }, [online, fromMs]);

  const lastAccess = formatLastAccessEs(user);
  const durMs = user?.lastSessionDurationMs;
  const hasDur = typeof durMs === 'number' && Number.isFinite(durMs) && durMs > 0;
  const durLabel = hasDur ? formatDurationStaticEs(durMs) : null;

  const hasVersion = hasRecordedClientAppVersion(user);
  const ver = hasVersion ? formatStoredClientVersionForSuperUser(user.lastClientAppVersion) : null;

  const profile = user?.lastClientUiProfile ? String(user.lastClientUiProfile) : '';
  const coarse = user?.lastClientCoarsePointer === true;
  const screenBase = profile === 'móvil' ? 'Móvil' : profile === 'escritorio' ? 'Escritorio' : profile ? profile : null;

  return (
    <div className="max-w-[19rem] space-y-1.5 text-[10px] leading-snug">
      <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
        <span
          className={`font-black ${
            online ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          {online ? 'En línea' : 'Desconectado'}
        </span>
        {online && fromMs != null ? (
          <>
            <span className="text-slate-300 dark:text-slate-500" aria-hidden>
              ·
            </span>
            <span className="font-bold text-teal-700 dark:text-teal-200">Activo {formatActiveDurationEs(fromMs)}</span>
          </>
        ) : null}
      </p>

      {lastAccess ? (
        <p>
          <span className={`${label} text-indigo-600 dark:text-indigo-300`}>{online ? 'Último acceso registrado' : 'Último acceso'}</span>
          <br />
          <span className="font-bold text-slate-900 dark:text-slate-50 tabular-nums">{lastAccess}</span>
        </p>
      ) : !online ? (
        <p className="text-[9px] font-semibold text-slate-600 dark:text-slate-300 italic">Sin fecha de último acceso</p>
      ) : null}

      {durLabel ? (
        <p>
          <span className={`${label} text-violet-600 dark:text-violet-300`}>Última sesión activa</span>
          <br />
          <span className="font-black text-violet-900 dark:text-violet-100 tabular-nums">{durLabel}</span>
        </p>
      ) : null}

      <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 pt-0.5">
        {ver ? (
          <span className="font-mono font-black text-indigo-800 dark:text-indigo-200" title="Versión de la app en el último contacto">
            {ver}
          </span>
        ) : (
          <span className="font-bold text-amber-800 dark:text-amber-200">Sin versión</span>
        )}
        <span className="text-slate-300 dark:text-slate-500" aria-hidden>
          ·
        </span>
        {screenBase ? (
          <span className="font-bold text-cyan-800 dark:text-cyan-200">
            {screenBase}
            {coarse ? <span className="font-black text-amber-800 dark:text-amber-200"> · táctil</span> : null}
          </span>
        ) : (
          <span className="font-semibold text-slate-600 dark:text-slate-300">Pantalla —</span>
        )}
        {user?.lastClientRuntimeKind === 'pwa' || user?.lastClientRuntimeKind === 'web' ? (
          <>
            <span className="text-slate-300 dark:text-slate-500" aria-hidden>
              ·
            </span>
            <span
              className={`font-black ${
                user.lastClientRuntimeKind === 'pwa'
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
              title={user?.lastClientRuntimeLabelEs ? String(user.lastClientRuntimeLabelEs) : undefined}
            >
              {user.lastClientRuntimeKind === 'pwa' ? 'App' : 'Web'}
            </span>
          </>
        ) : null}
      </p>
    </div>
  );
}
