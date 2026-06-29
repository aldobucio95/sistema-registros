import React, { useCallback, useEffect, useRef, useState } from 'react';
import { registerGlobalSystemAlertSink } from './globalSystemAlertsBridge.js';
import { shortFirebaseClientMessage } from './shortSystemMessages.js';
import { auth } from './firebaseRefs.js';
import { processPublicRegistrationOfflineQueue } from './publicRegistrationOfflineQueue.js';

const DEFAULT_MS = 5200;
const OK_MS = 3200;
const SLOW_NET_THROTTLE_MS = 90_000;
const REJECTION_THROTTLE_MS = 12_000;

const shellClass =
  'fixed top-4 right-4 left-4 sm:left-auto z-[500] max-w-md mx-auto sm:mx-0 px-4 py-3 rounded-xl shadow-2xl font-bold text-sm leading-snug border flex items-start gap-2 animate-in fade-in slide-in-from-top-2';

function toneClass(tone) {
  if (tone === 'ok') return `${shellClass} bg-emerald-600 text-white border-emerald-500`;
  if (tone === 'warn') return `${shellClass} bg-amber-600 text-white border-amber-500`;
  return `${shellClass} bg-rose-600 text-white border-rose-500`;
}

/**
 * Avisos globales: red (offline/slow), promesas Firestore sin catch, y `emitGlobalSystemAlert`.
 * Fijo arriba a la derecha para no tapar el toast del panel (abajo derecha).
 */
export default function GlobalSystemAlertsHost() {
  const [banner, setBanner] = useState(null);
  const clearT = useRef(null);
  const wasOffline = useRef(false);
  const lastSlowNet = useRef(0);
  const lastRejectionCode = useRef({ code: '', at: 0 });

  const clearBannerTimer = useCallback(() => {
    if (clearT.current != null) {
      window.clearTimeout(clearT.current);
      clearT.current = null;
    }
  }, []);

  const show = useCallback(
    (payload) => {
      const ms = payload.ms != null && payload.ms > 0 ? payload.ms : DEFAULT_MS;
      const tone = payload.tone || 'danger';
      clearBannerTimer();
      setBanner({ text: payload.text, tone, key: Date.now() });
      if (tone === 'ok') {
        clearT.current = window.setTimeout(() => setBanner(null), Math.min(ms, OK_MS));
      } else {
        clearT.current = window.setTimeout(() => setBanner(null), ms);
      }
    },
    [clearBannerTimer]
  );

  useEffect(() => {
    registerGlobalSystemAlertSink((p) => {
      const ms = p.ms != null && p.ms > 0 ? p.ms : DEFAULT_MS;
      show({ text: p.text, tone: p.tone || 'danger', ms: p.tone === 'ok' ? Math.min(ms, OK_MS) : ms });
    });
    return () => registerGlobalSystemAlertSink(null);
  }, [show]);

  useEffect(() => {
    const onOffline = () => {
      wasOffline.current = true;
      clearBannerTimer();
      setBanner({
        text: 'Sin internet: no se guardará en Firestore hasta reconectar.',
        tone: 'danger',
        key: Date.now(),
        sticky: true,
      });
    };
    const onOnline = () => {
      clearBannerTimer();
      if (wasOffline.current) {
        wasOffline.current = false;
        setBanner({ text: 'Conexión recuperada.', tone: 'ok', key: Date.now() });
        clearT.current = window.setTimeout(() => setBanner(null), OK_MS);
      } else {
        setBanner(null);
      }
      void processPublicRegistrationOfflineQueue(auth).then((r) => {
        if (r.processed > 0) {
          show({ text: `Cola: ${r.processed} registro(s) enviado(s) a Firestore.`, tone: 'ok', ms: 5200 });
        }
      });
    };

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      onOffline();
    }

    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);

    const conn = typeof navigator !== 'undefined' ? navigator.connection : null;
    const onConn = () => {
      if (!conn) return;
      const now = Date.now();
      if (now - lastSlowNet.current < SLOW_NET_THROTTLE_MS) return;
      const et = conn.effectiveType;
      const save = conn.saveData === true;
      if (save || et === 'slow-2g' || et === '2g') {
        lastSlowNet.current = now;
        show({
          text: 'Red muy lenta o «ahorro de datos»: Firestore puede tardar o fallar.',
          tone: 'warn',
          ms: 6500,
        });
      }
    };
    if (conn && typeof conn.addEventListener === 'function') {
      conn.addEventListener('change', onConn);
      queueMicrotask(onConn);
    }

    const onRejection = (ev) => {
      const r = ev.reason;
      const code = r && typeof r === 'object' ? String(r.code || '').trim() : '';
      if (!code) return;
      if (code.startsWith('auth/')) return;
      const tracked = ['permission-denied', 'unavailable', 'deadline-exceeded', 'resource-exhausted', 'failed-precondition', 'aborted', 'cancelled'];
      if (!tracked.includes(code)) return;
      const now = Date.now();
      if (lastRejectionCode.current.code === code && now - lastRejectionCode.current.at < REJECTION_THROTTLE_MS) {
        return;
      }
      lastRejectionCode.current = { code, at: now };
      show({ text: shortFirebaseClientMessage(r), tone: 'danger', ms: 6800 });
    };
    window.addEventListener('unhandledrejection', onRejection);

    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('unhandledrejection', onRejection);
      if (conn && typeof conn.removeEventListener === 'function') conn.removeEventListener('change', onConn);
      clearBannerTimer();
    };
  }, [clearBannerTimer, show]);

  /** Pendientes guardados con la app cerrada o en otra ruta: enviar al cargar si ya hay red. */
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.onLine) return;
    void processPublicRegistrationOfflineQueue(auth).then((r) => {
      if (r.processed > 0) {
        show({ text: `Cola: ${r.processed} registro(s) enviado(s) a Firestore.`, tone: 'ok', ms: 5200 });
      }
    });
  }, [show]);

  useEffect(() => {
    return () => clearBannerTimer();
  }, [clearBannerTimer]);

  if (!banner) return null;

  return (
    <div role="alert" className={toneClass(banner.tone)} key={banner.key}>
      {banner.text}
    </div>
  );
}
