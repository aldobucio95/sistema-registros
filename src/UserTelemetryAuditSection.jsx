import React from 'react';
import { MapPin } from 'lucide-react';
import UserPermissionBadges from './rbac/UserPermissionBadges.jsx';
import UserScopeEventsContent from './rbac/UserScopeEventsContent.jsx';
import { normalizeRole } from './rbac/roles.js';
import {
  userCanSendWhatsAppQuickAction,
  userCanMarkResponsivaLocalQuickAction,
  userCanSendResponsivaDigitalQuickAction,
} from './rbac/permissions.js';
import { formatDurationStaticEs } from './UserClientVersionCell.jsx';
import { formatStoredClientVersionForSuperUser } from './appVersion.js';

/** Rótulos internos: en oscuro gris claro legible sobre slate-900 (no slate-500). */
const fieldLabel = 'text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-300 mb-1';

/** Título de bloque principal con acento de color. */
const sectionHeading = 'text-[9px] font-black uppercase tracking-wider mb-1.5';

/** Tarjetas con borde lateral tenue (minimal + color). */
const blockRole =
  'rounded-lg border border-slate-200/90 bg-gradient-to-br from-white via-white to-indigo-50/50 shadow-sm dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950 dark:border-slate-700 border-l-[3px] border-l-indigo-500 pl-3 sm:pl-4 pr-3 sm:pr-4 py-3 sm:py-4';
const blockSession =
  'rounded-lg border border-slate-200/90 bg-gradient-to-br from-white via-white to-violet-50/45 shadow-sm dark:from-slate-900 dark:via-slate-900 dark:to-violet-950 dark:border-slate-700 border-l-[3px] border-l-violet-500 pl-3 sm:pl-4 pr-3 sm:pr-4 py-3 sm:py-4';
const blockBrowser =
  'rounded-lg border border-slate-200/90 bg-gradient-to-br from-white via-white to-sky-50/40 shadow-sm dark:from-slate-900 dark:via-slate-900 dark:to-sky-950 dark:border-slate-700 border-l-[3px] border-l-sky-500 pl-3 sm:pl-4 pr-3 sm:pr-4 py-3 sm:py-4';

function formatAnyDate(val) {
  if (val == null) return null;
  if (typeof val === 'number' && Number.isFinite(val) && val > 1e11) {
    try {
      return new Date(val).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'medium' });
    } catch {
      return String(val);
    }
  }
  if (typeof val?.toMillis === 'function') {
    try {
      return new Date(val.toMillis()).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'medium' });
    } catch {
      return String(val);
    }
  }
  const s = String(val).trim();
  if (!s) return null;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'medium' });
  return s.length > 80 ? `${s.slice(0, 77)}…` : s;
}

function roleChipClass(role) {
  const r = normalizeRole(role);
  if (r === 'SuperUsuario') return 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-400';
  if (r === 'Administrador') return 'bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-950 dark:text-purple-100 dark:border-purple-400';
  if (r === 'Editor') return 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-500';
  return 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-500';
}

/**
 * Detalle SuperUsuario al expandir fila: rol, sedes/eventos, permisos (estilo listado), sesión y navegador.
 */
export default function UserTelemetryAuditSection({ user, viewer, events = [], globalPanelNav = {}, globalConfig = null }) {
  const uaFull = user?.lastClientUserAgent ? String(user.lastClientUserAgent) : user?.lastClientUserAgentShort ? String(user.lastClientUserAgentShort) : '';

  const w = user?.lastClientInnerWidth != null ? Number(user.lastClientInnerWidth) : null;
  const h = user?.lastClientInnerHeight != null ? Number(user.lastClientInnerHeight) : null;
  const dims = w != null && h != null && Number.isFinite(w) && Number.isFinite(h) ? `${w} × ${h} px (viewport)` : null;

  const lastAccess = formatAnyDate(user?.lastAccessAt || user?.lastClientAppVersionSeenAt);
  const sessionEnd = formatAnyDate(user?.lastSessionEndedAt);
  const durMs = user?.lastSessionDurationMs;
  const hasDur = typeof durMs === 'number' && Number.isFinite(durMs) && durMs > 0;

  const extraFlags = [];
  if (user?.canViewFinances) extraFlags.push('Ver finanzas');
  if (user?.canViewHiddenDonations) extraFlags.push('Donaciones ocultas');
  if (user?.canViewExpenses) extraFlags.push('Lista de gastos (permiso)');
  if (user?.canEditRegistryDates) extraFlags.push('Editar fechas de registro / abonos');
  if (user?.canMarkPersonsOfInterest) extraFlags.push('Marcar personas de interés');
  if (userCanSendWhatsAppQuickAction(user)) extraFlags.push('WhatsApp (acciones rápidas)');
  if (userCanMarkResponsivaLocalQuickAction(user)) extraFlags.push('Responsiva física en sitio');
  if (userCanSendResponsivaDigitalQuickAction(user)) extraFlags.push('Responsiva digital / enlace');

  const role = normalizeRole(user?.role);

  return (
    <div className="space-y-4">
      <div>
        <p className={`${sectionHeading} text-indigo-600 dark:text-indigo-300`}>Rol y permisos</p>
        <div className={`${blockRole} space-y-4`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase ${roleChipClass(user?.role)}`}>{user?.role || '—'}</span>
            {user?.authEmail ? (
              <span className="text-xs font-bold text-indigo-900/90 dark:text-indigo-200 truncate max-w-full" title={user.authEmail}>
                {user.authEmail}
              </span>
            ) : null}
          </div>

          {viewer ? (
            <div>
              <p className={`${fieldLabel} text-indigo-600/85 dark:text-indigo-400`}>Permisos / etiquetas</p>
              <UserPermissionBadges viewer={viewer} targetUser={user} globalPanelNav={globalPanelNav} events={events} globalConfig={globalConfig} />
            </div>
          ) : null}

          <div className="pt-1 border-t border-indigo-100/80 dark:border-indigo-900">
            <div className="flex items-start gap-2">
              <MapPin size={14} className="text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" aria-hidden />
              <div className="min-w-0 flex-1 space-y-2">
                <p className={`${fieldLabel} text-indigo-600/90 dark:text-indigo-400`}>Sedes y eventos</p>
                <UserScopeEventsContent user={user} events={events} globalPanelNav={globalPanelNav} editorConfig={globalConfig} />
              </div>
            </div>
          </div>

          {(user?.preferredLandingTab || (user?.maxConcurrentSessions != null && String(user.maxConcurrentSessions).trim() !== '')) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-indigo-100/80 dark:border-indigo-900">
              {user?.preferredLandingTab ? (
                <div>
                  <p className={fieldLabel}>Pestaña preferida al entrar</p>
                  <p className="text-xs font-bold text-indigo-950 dark:text-indigo-100">{String(user.preferredLandingTab)}</p>
                </div>
              ) : null}
              {user?.maxConcurrentSessions != null && String(user.maxConcurrentSessions).trim() !== '' ? (
                <div>
                  <p className={fieldLabel}>Sesiones concurrentes máx.</p>
                  <p className="text-xs font-bold text-teal-800 dark:text-teal-200 tabular-nums">{String(user.maxConcurrentSessions)}</p>
                </div>
              ) : null}
            </div>
          ) : null}

          {role !== 'SuperUsuario' && extraFlags.length > 0 ? (
            <div className="pt-1 border-t border-indigo-100/80 dark:border-indigo-900">
              <p className={`${fieldLabel} text-emerald-700 dark:text-emerald-300`}>Permisos adicionales</p>
              <div className="flex flex-wrap gap-1.5">
                {extraFlags.map((t) => (
                  <span
                    key={t}
                    className="text-[9px] font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-50/90 dark:bg-emerald-950 px-1.5 py-0.5 rounded-md border border-emerald-100/90 dark:border-emerald-800"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div>
        <p className={`${sectionHeading} text-violet-600 dark:text-violet-300`}>Sesión reciente</p>
        <div className={`${blockSession} grid grid-cols-1 sm:grid-cols-2 gap-3`}>
          <div>
            <p className={fieldLabel}>Último acceso (registrado)</p>
            <p className="text-xs font-bold text-violet-950 dark:text-violet-100 tabular-nums">{lastAccess || '—'}</p>
          </div>
          <div>
            <p className={fieldLabel}>Fin de última sesión</p>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 tabular-nums">{sessionEnd || '—'}</p>
          </div>
          <div className="sm:col-span-2">
            <p className={fieldLabel}>Tiempo activo en la última sesión cerrada</p>
            <p className="text-xs font-black text-violet-700 dark:text-violet-300 tabular-nums">{hasDur ? formatDurationStaticEs(durMs) : '—'}</p>
          </div>
        </div>
      </div>

      <div>
        <p className={`${sectionHeading} text-sky-600 dark:text-sky-300`}>Navegador y dispositivo (último acceso conocido)</p>
        <div className={`${blockBrowser} space-y-3`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className={`${fieldLabel} text-sky-700/80 dark:text-sky-400`}>Perfil de pantalla</p>
              <p className="text-xs font-bold text-sky-950 dark:text-sky-100">
                {user?.lastClientUiProfile ? String(user.lastClientUiProfile) : '—'}
                {user?.lastClientCoarsePointer === true ? (
                  <span className="ml-1 text-[10px] font-black text-amber-600 dark:text-amber-400">· táctil</span>
                ) : null}
              </p>
            </div>
            <div>
              <p className={`${fieldLabel} text-cyan-700/80 dark:text-cyan-400`}>Ventana (inner)</p>
              <p className="text-xs font-mono font-bold text-cyan-950 dark:text-cyan-100">{dims || '—'}</p>
            </div>
            <div className="sm:col-span-2 rounded-lg border border-emerald-200/70 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/40 px-3 py-2.5">
              <p className={`${fieldLabel} text-emerald-700/85 dark:text-emerald-400`}>Versión web vs app instalada</p>
              <p className="text-xs font-bold text-emerald-950 dark:text-emerald-100">
                {user?.lastClientRuntimeLabelEs
                  ? String(user.lastClientRuntimeLabelEs)
                  : user?.lastClientRuntimeKind === 'pwa'
                    ? 'App instalada'
                    : user?.lastClientRuntimeKind === 'web'
                      ? 'Versión web (navegador)'
                      : '—'}
              </p>
              {user?.lastClientDisplayModeRaw && String(user.lastClientDisplayModeRaw) !== 'browser' ? (
                <p className="text-[10px] font-mono text-emerald-800/75 dark:text-emerald-300/85 mt-1">
                  {String(user.lastClientDisplayModeRaw)}
                </p>
              ) : null}
            </div>
            <div className="sm:col-span-2">
              <p className={fieldLabel}>Datos de cliente guardados el</p>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 tabular-nums">{formatAnyDate(user?.lastClientDeviceSeenAt) || '—'}</p>
            </div>
            {user?.lastClientAppVersion != null ? (
              <div className="sm:col-span-2 rounded-lg border border-sky-200/80 dark:border-sky-800 bg-sky-50/60 dark:bg-sky-950 px-3 py-2.5">
                <p className={`${fieldLabel} text-sky-700 dark:text-sky-400`}>App</p>
                <p className="text-xs font-mono font-black text-sky-950 dark:text-sky-100">
                  {formatStoredClientVersionForSuperUser(user.lastClientAppVersion)}
                </p>
                {user?.lastClientAppBuildId ? (
                  <p className="text-[10px] font-semibold text-sky-800/80 dark:text-sky-300 break-all mt-1">{String(user.lastClientAppBuildId)}</p>
                ) : null}
                {user?.lastClientAppVersionSeenAt ? (
                  <p className="text-[10px] text-sky-700/70 dark:text-sky-400 mt-1">Versión vista: {formatAnyDate(user.lastClientAppVersionSeenAt)}</p>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="pt-2 border-t border-sky-100/90 dark:border-sky-900">
            <p className={`${fieldLabel} text-sky-700/85 dark:text-sky-400`}>User-Agent (cadena completa guardada)</p>
            {uaFull ? (
              <pre className="w-full p-3 bg-sky-50/70 dark:bg-sky-950 border border-sky-200/70 dark:border-sky-800 rounded-xl text-[11px] leading-relaxed text-sky-950 dark:text-sky-100 whitespace-pre-wrap break-words font-mono max-h-[min(50vh,24rem)] overflow-y-auto">
                {uaFull}
              </pre>
            ) : (
              <p className="text-xs text-slate-600 dark:text-slate-300">Aún no hay cadena de navegador guardada para este usuario.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
