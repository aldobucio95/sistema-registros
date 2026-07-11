import React, { useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw, Trash2, XCircle } from 'lucide-react';
import { uiButtons, uiModal } from '../ui/uiFormatClasses.js';
import {
  buildFailedRegistrationRecoverySummary,
  failedRegistrationRecoveryJson,
} from '../failedRegistrationRecovery.js';

export default function FailedRegistrationRecoveryDetailModal({
  open = false,
  record = null,
  retryInFlight = false,
  onClose,
  onRetry,
  onDismiss,
}) {
  const [jsonExpanded, setJsonExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const humanText = useMemo(
    () => (record ? buildFailedRegistrationRecoverySummary(record) : ''),
    [record]
  );
  const rawJson = useMemo(() => (record ? failedRegistrationRecoveryJson(record) : ''), [record]);

  if (!open || !record) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* sin permiso */
    }
  };

  return (
    <div className={uiModal.overlay} role="dialog" aria-modal="true">
      <button type="button" className={uiModal.backdrop} onClick={onClose} aria-label="Cerrar" />
      <div
        className={`${uiModal.panelLg} animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={uiModal.header}>
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <span className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 shrink-0">
              <AlertTriangle size={20} />
            </span>
            <div className="min-w-0">
              <h3 className={uiModal.title}>Registro no guardado</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                Respaldo local en este dispositivo. Puedes reintentar el guardado o descartar el intento.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className={uiButtons.closeIcon} aria-label="Cerrar">
            <XCircle size={18} />
          </button>
        </div>

        <div className={`${uiModal.body} space-y-3 overflow-y-auto`}>
          <div className="rounded-lg border border-rose-200/80 dark:border-rose-800/50 bg-rose-50/50 dark:bg-rose-950/20 p-3">
            <p className="text-[9px] font-black uppercase tracking-wide text-rose-700 dark:text-rose-300 mb-1.5">
              Resumen para recargar
            </p>
            <pre className="whitespace-pre-wrap break-words text-[11px] text-slate-700 dark:text-slate-200 leading-snug font-sans">
              {humanText}
            </pre>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50 p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[9px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                JSON técnico (snapshot completo)
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[9px] font-bold px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                {copied ? 'Copiado' : 'Copiar JSON'}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setJsonExpanded((v) => !v)}
              className="text-[9px] font-bold px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 mb-1.5"
            >
              {jsonExpanded ? 'Ocultar JSON' : 'Ver JSON'}
            </button>
            {jsonExpanded ? (
              <pre className="whitespace-pre-wrap break-words text-[10px] font-mono leading-snug max-h-64 overflow-auto text-slate-700 dark:text-slate-200">
                {rawJson}
              </pre>
            ) : null}
          </div>
        </div>

        <div className={`${uiModal.footer} flex-wrap gap-2`}>
          <button type="button" onClick={onClose} className={uiButtons.secondary} disabled={retryInFlight}>
            Cerrar
          </button>
          <button
            type="button"
            onClick={() => onDismiss?.(record)}
            className={`${uiButtons.secondary} text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800`}
            disabled={retryInFlight}
          >
            <Trash2 size={14} className="inline mr-1" />
            Descartar
          </button>
          <button
            type="button"
            onClick={() => onRetry?.(record)}
            className={uiButtons.primary}
            disabled={retryInFlight}
          >
            <RefreshCw size={14} className={`inline mr-1 ${retryInFlight ? 'animate-spin' : ''}`} />
            {retryInFlight ? 'Reintentando…' : 'Reintentar guardado'}
          </button>
        </div>
      </div>
    </div>
  );
}
