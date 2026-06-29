import React, { useEffect, useState } from 'react';
import { getDoc } from 'firebase/firestore';
import { getDocRef } from '../firebaseRefs.js';
import { LOG_SNAPSHOTS_COLLECTION } from '../activityLogCore.js';

/** Pretty-print de un valor (objeto/array → JSON indentado; primitivo → texto). */
function prettyValue(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

/**
 * Detalle expandible de un log: carga de forma diferida el snapshot completo
 * (`app_log_snapshots/{logId}`) y lo muestra como texto plano legible.
 * Es la "segunda fuente de verdad": todo lo que se intentó guardar queda aquí.
 */
export default function ActivityLogSnapshotDetails({ log }) {
  const logId = String(log?.id || '');
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    // Solo se actualiza el estado tras resolverse la promesa (nunca de forma síncrona
    // dentro del efecto) para evitar renders en cascada.
    (async () => {
      if (!logId) {
        if (alive) setState({ loading: false, error: 'Sin id de log.', data: null });
        return;
      }
      try {
        const snap = await getDoc(getDocRef(LOG_SNAPSHOTS_COLLECTION, logId));
        if (!alive) return;
        if (!snap.exists()) {
          setState({ loading: false, error: 'no-snapshot', data: null });
          return;
        }
        setState({ loading: false, error: '', data: snap.data() });
      } catch (e) {
        if (!alive) return;
        setState({ loading: false, error: String(e?.message || e), data: null });
      }
    })();
    return () => {
      alive = false;
    };
  }, [logId]);

  let parsed = null;
  let rawJson = '';
  if (state.data?.snapshotJson) {
    rawJson = String(state.data.snapshotJson);
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      parsed = null;
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawJson || JSON.stringify(parsed ?? {}, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* sin permiso de portapapeles */
    }
  };

  const entries = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? Object.entries(parsed) : null;

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50 p-3 text-[11px] text-slate-700 dark:text-slate-200">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="font-black uppercase tracking-wide text-[9px] text-slate-500 dark:text-slate-400">
          Detalle completo (segunda fuente de verdad)
        </span>
        {rawJson ? (
          <button
            type="button"
            onClick={handleCopy}
            className="text-[9px] font-bold px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            {copied ? 'Copiado' : 'Copiar JSON'}
          </button>
        ) : null}
      </div>

      {/* Resumen siempre visible: usuario, evento, acción, estado, error. */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mb-2">
        <div><span className="text-slate-400">Usuario:</span> <b>{log?.username || '—'}</b></div>
        <div><span className="text-slate-400">Contexto:</span> <b>{log?.eventName || '—'}</b></div>
        <div><span className="text-slate-400">Acción:</span> <b>{log?.action || '—'}</b></div>
        <div><span className="text-slate-400">Fecha:</span> <b>{log?.timestamp || '—'}</b></div>
        {log?.entityType ? <div><span className="text-slate-400">Entidad:</span> <b>{log.entityType}{log.entityId ? ` · ${log.entityId}` : ''}</b></div> : null}
        {log?.status ? <div><span className="text-slate-400">Estado:</span> <b className={log.status === 'error' ? 'text-rose-600 dark:text-rose-300' : 'text-emerald-600 dark:text-emerald-300'}>{log.status}</b></div> : null}
      </div>
      {log?.errorMessage ? (
        <p className="mb-2 text-rose-700 dark:text-rose-300 font-semibold break-words">Error: {log.errorMessage}</p>
      ) : null}

      {state.loading ? (
        <p className="italic text-slate-400">Cargando snapshot…</p>
      ) : state.error === 'no-snapshot' ? (
        <p className="italic text-slate-400">Este registro no tiene snapshot guardado (acción sin payload o log antiguo).</p>
      ) : state.error ? (
        <p className="italic text-rose-500">No se pudo cargar el snapshot: {state.error}</p>
      ) : entries ? (
        <div className="space-y-1.5">
          {entries.map(([k, v]) => (
            <div key={k} className="border-t border-slate-200/70 dark:border-slate-700/60 pt-1.5 first:border-t-0 first:pt-0">
              <p className="font-bold text-slate-600 dark:text-slate-300">{k}</p>
              <pre className="whitespace-pre-wrap break-words text-[10px] text-slate-700 dark:text-slate-200 font-mono leading-snug max-h-72 overflow-auto">
                {prettyValue(v)}
              </pre>
            </div>
          ))}
        </div>
      ) : parsed != null ? (
        <pre className="whitespace-pre-wrap break-words text-[10px] font-mono leading-snug max-h-72 overflow-auto">
          {prettyValue(parsed)}
        </pre>
      ) : (
        <pre className="whitespace-pre-wrap break-words text-[10px] font-mono leading-snug max-h-72 overflow-auto">
          {rawJson || '—'}
        </pre>
      )}
    </div>
  );
}
