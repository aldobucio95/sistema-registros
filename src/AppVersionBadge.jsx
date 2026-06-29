import React from 'react';
import {
  APP_SEMVER,
  getAppInternalVersionLabel,
  getAppPublicVersionLabel,
  getAppVersionFullLabel,
} from './appVersion.js';

function resolveSuperUserAccess({ showInternal, currentUser }) {
  if (showInternal) return true;
  return String(currentUser?.role ?? '').trim() === 'SuperUsuario';
}

/**
 * Versión visible en esquina: pública v.x.x.x; SuperUsuario dentro de la app ve v.x.x.x.Ni.
 * En login y cargas previas al panel siempre se muestra solo la versión pública.
 */
export default function AppVersionBadge({
  variant = 'default',
  className = '',
  showInternal = false,
  currentUser = null,
}) {
  const isLoginVariant = variant === 'login' || variant === 'login-inline';
  const isEmbedded = variant === 'inline' || variant === 'workspace-inline';
  const isLoginInline = variant === 'login-inline';
  const useInternal = resolveSuperUserAccess({ showInternal, currentUser }) && !isLoginVariant;
  const label = useInternal ? getAppInternalVersionLabel() : getAppPublicVersionLabel();
  const colorClass = (() => {
    if (variant === 'login') return 'text-blue-200/95';
    if (isLoginInline) return 'text-slate-400';
    if (useInternal) return 'text-indigo-600 dark:text-indigo-300';
    if (variant === 'workspace' || variant === 'workspace-inline') {
      return 'text-slate-500 dark:text-slate-400';
    }
    return 'text-slate-400 dark:text-slate-500';
  })();
  const wrapperClass = isEmbedded
    ? `pointer-events-none select-none shrink-0 ${className}`.trim()
    : isLoginInline
      ? `pointer-events-none select-none ${className}`.trim()
      : `pointer-events-none select-none fixed top-2 right-2 sm:top-2.5 sm:right-2.5 z-[80] ${className}`.trim();
  return (
    <div
      className={wrapperClass}
      aria-label={`Versión ${useInternal ? label : APP_SEMVER}`}
    >
      <span
        className={`text-[10px] sm:text-[11px] font-bold tabular-nums leading-none ${colorClass}`}
        title={getAppVersionFullLabel({ internal: useInternal })}
      >
        {label}
      </span>
    </div>
  );
}
