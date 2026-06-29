import React from 'react';
import {
  APP_SEMVER,
  getAppInternalVersionLabel,
  getAppPublicVersionLabel,
  getAppVersionFullLabel,
} from './appVersion.js';

/**
 * Versión visible en esquina: pública v.x.x.x; SuperUsuario dentro de la app ve v.x.x.x.Ni.
 * En login y cargas previas al panel siempre se muestra solo la versión pública.
 */
export default function AppVersionBadge({ variant = 'default', className = '', showInternal = false }) {
  const isLoginVariant = variant === 'login' || variant === 'login-inline';
  const isInline = variant === 'login-inline';
  const useInternal = showInternal && !isLoginVariant;
  const label = useInternal ? getAppInternalVersionLabel() : getAppPublicVersionLabel();
  const colorClass =
    variant === 'login'
      ? 'text-blue-200/95'
      : variant === 'login-inline'
        ? 'text-slate-400'
        : variant === 'workspace'
          ? 'text-slate-500 dark:text-slate-400'
          : 'text-slate-400 dark:text-slate-500';
  const wrapperClass = isInline
    ? `pointer-events-none select-none ${className}`
    : `pointer-events-none select-none fixed top-2 right-2 sm:top-2.5 sm:right-2.5 z-[35] ${className}`;
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
