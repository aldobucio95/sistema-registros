import React, { useEffect, useState } from 'react';
import {
  APP_VERSION_TRACKING_INTRODUCED_IN,
  formatStoredClientVersionForSuperUser,
  hasRecordedClientAppVersion,
} from './appVersion.js';

function hasAnyLastClientDeviceFields(user) {
  if (!user) return false;
  if (user.lastClientUiProfile) return true;
  if (user.lastClientUserAgent) return true;
  if (user.lastClientUserAgentShort) return true;
  if (user.lastClientInnerWidth != null || user.lastClientInnerHeight != null) return true;
  if (user.lastClientRuntimeKind) return true;
  return false;
}

/** `onlineSince` en documento usuario: número (ms) o Timestamp. */
export function getOnlineSinceMs(user) {
  const v = user?.onlineSince;
  if (v == null) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v.toMillis === 'function') return v.toMillis();
  return null;
}

export function formatActiveDurationEs(fromMs) {
  const ms = Math.max(0, Date.now() - fromMs);
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h} h ${m % 60} min`;
  if (m > 0) return `${m} min`;
  return `${s} s`;
}

/** Duración fija (p. ej. última sesión ya cerrada), mismo estilo que el tiempo activo. */
export function formatDurationStaticEs(totalMs) {
  const ms = Math.max(0, Math.floor(Number(totalMs) || 0));
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h} h ${m % 60} min`;
  if (m > 0) return `${m} min`;
  return `${s} s`;
}

function ActiveSessionDuration({ user }) {
  const fromMs = getOnlineSinceMs(user);
  const [, setTick] = useState(0);
  useEffect(() => {
    if (fromMs == null) return undefined;
    const id = setInterval(() => setTick((n) => n + 1), 15000);
    return () => clearInterval(id);
  }, [fromMs]);
  if (fromMs == null) return null;
  return (
    <p className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 mb-1">
      Tiempo activo: {formatActiveDurationEs(fromMs)}
    </p>
  );
}

function DeviceBlock({ user }) {
  const profile = user.lastClientUiProfile ? String(user.lastClientUiProfile) : '';
  const w = user.lastClientInnerWidth != null ? Number(user.lastClientInnerWidth) : null;
  const h = user.lastClientInnerHeight != null ? Number(user.lastClientInnerHeight) : null;
  const coarse = user.lastClientCoarsePointer === true;
  const ua = user.lastClientUserAgent
    ? String(user.lastClientUserAgent)
    : user.lastClientUserAgentShort
      ? String(user.lastClientUserAgentShort)
      : '';
  const seenDev = user.lastClientDeviceSeenAt ? String(user.lastClientDeviceSeenAt) : '';
  const dim =
    w != null && h != null && Number.isFinite(w) && Number.isFinite(h) ? `${w}×${h}` : null;

  if (!profile && !dim && !ua) {
    return (
      <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 leading-snug" title="Tras el próximo inicio de sesión con la app actual se guardará pantalla y dispositivo.">
        Sin datos de pantalla aún
      </p>
    );
  }

  const seenShort = seenDev.includes('T') ? seenDev.slice(0, 19).replace('T', ' ') : seenDev.slice(0, 16);

  const rtLabel =
    user.lastClientRuntimeLabelEs != null && String(user.lastClientRuntimeLabelEs).trim() !== ''
      ? String(user.lastClientRuntimeLabelEs)
      : user.lastClientRuntimeKind === 'pwa'
        ? 'App instalada'
        : user.lastClientRuntimeKind === 'web'
          ? 'Versión web'
          : '';

  return (
    <div className="mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-700">
      {rtLabel ? (
        <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-200 leading-snug mb-1">
          Uso: <span className="font-mono">{rtLabel}</span>
        </p>
      ) : null}
      <p className="text-[10px] font-bold text-slate-700 dark:text-slate-200 leading-snug">
        {profile ? (
          <>
            Pantalla: <span className="font-mono">{profile}</span>
            {coarse ? (
              <span className="ml-1 text-[9px] font-black text-amber-700 dark:text-amber-300">· táctil</span>
            ) : null}
          </>
        ) : (
          'Pantalla'
        )}
      </p>
      {dim ? (
        <p className="text-[9px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">{dim} px</p>
      ) : null}
      {seenShort ? (
        <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5" title={seenDev}>
          Vista: {seenShort}
        </p>
      ) : null}
      {ua ? (
        <p className="text-[9px] text-slate-600 dark:text-slate-300 mt-1 leading-snug break-words whitespace-pre-wrap" title={ua}>
          {ua}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Solo SuperUsuario: versión de cliente + dispositivo.
 * En línea: tiempo activo + datos en vivo. Desconectado: se conservan en Firestore `lastClient*` del último acceso.
 */
export default function UserClientVersionCell({ user }) {
  const online = !!user?.isOnline;
  const hasVersion = hasRecordedClientAppVersion(user);
  const hasDevice = hasAnyLastClientDeviceFields(user);

  if (!online && !hasVersion && !hasDevice) {
    return (
      <div className="max-w-[14rem]">
        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-snug">
          Desconectado — sin datos de cliente registrados
        </p>
        <p
          className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug"
          title={`Las sesiones anteriores a v${APP_VERSION_TRACKING_INTRODUCED_IN} no guardaban versión; o el usuario no ha vuelto a entrar desde el despliegue.`}
        >
          Tras el próximo inicio de sesión con la app actual se guardará versión y dispositivo.
        </p>
      </div>
    );
  }

  if (!hasVersion) {
    return (
      <div className="max-w-[14rem]">
        {!online ? (
          <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-1">Desconectado · último cliente conocido</p>
        ) : null}
        <ActiveSessionDuration user={user} />
        <p className="text-[10px] font-bold text-amber-800 dark:text-amber-200 leading-snug">
          Sin registro de cliente
        </p>
        <p
          className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug"
          title={`Las sesiones anteriores a v${APP_VERSION_TRACKING_INTRODUCED_IN} no guardaban versión; o el usuario no ha vuelto a entrar desde el despliegue.`}
        >
          Cliente anterior al control de versiones (desde v{APP_VERSION_TRACKING_INTRODUCED_IN}) o sin iniciar sesión con la app actual.
        </p>
        {hasDevice ? <DeviceBlock user={user} /> : null}
      </div>
    );
  }

  const ver = formatStoredClientVersionForSuperUser(user.lastClientAppVersion);
  const bid = user.lastClientAppBuildId ? String(user.lastClientAppBuildId) : '';
  const seen = user.lastClientAppVersionSeenAt ? String(user.lastClientAppVersionSeenAt) : '';
  const seenShort = seen.includes('T') ? seen.slice(0, 19).replace('T', ' ') : seen.slice(0, 16);
  return (
    <div className="max-w-[14rem]">
      {!online ? (
        <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-1">Desconectado · último cliente conocido</p>
      ) : null}
      <ActiveSessionDuration user={user} />
      <p className="text-[11px] font-mono font-black text-slate-800 dark:text-slate-100">{ver}</p>
      {bid ? (
        <p className="text-[9px] text-slate-500 dark:text-slate-400 truncate" title={bid}>
          {bid.length > 18 ? `${bid.slice(0, 16)}…` : bid}
        </p>
      ) : null}
      {seenShort ? (
        <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5" title={seen}>
          {online ? 'Versión vista' : 'Última versión registrada'}: {seenShort}
        </p>
      ) : null}
      <DeviceBlock user={user} />
    </div>
  );
}
