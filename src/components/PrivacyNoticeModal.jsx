import React from 'react';
import { X } from 'lucide-react';
import { uiModal } from '../ui/uiFormatClasses.js';
import PrivacyNoticeSummaryPanel from './PrivacyNoticeSummaryPanel.jsx';
import {
  buildPrivacyNoticeSummary,
  mergePrivacyNoticeConfig,
  resolvePrivacyNoticeBody,
} from '../privacyNotice.js';

function renderBody(text) {
  return String(text || '')
    .split('\n')
    .map((line, i) => (
      <p key={i} className={`text-sm text-slate-700 dark:text-slate-300 leading-relaxed ${line.trim() ? 'mb-1' : 'mb-2'}`}>
        {line.replace(/\*\*/g, '')}
      </p>
    ));
}

/**
 * @param {'summary' | 'full'} [mode] — summary: resumen breve; full: aviso integral
 * @param {'manual' | 'public'} [audience]
 */
export default function PrivacyNoticeModal({
  open,
  onClose,
  privacyNotice,
  publicUrl,
  mode = 'full',
  audience = 'public',
}) {
  if (!open) return null;

  const cfg = mergePrivacyNoticeConfig(privacyNotice);
  const isSummary = mode === 'summary';
  const summary = isSummary ? buildPrivacyNoticeSummary(privacyNotice, audience) : null;
  const panelClass = isSummary ? uiModal.panelSm : uiModal.panelLg;
  const resolvedBody = resolvePrivacyNoticeBody(privacyNotice);

  return (
    <div className={uiModal.overlayNested} role="dialog" aria-modal="true" aria-labelledby="privacy-notice-modal-title">
      <button type="button" className={uiModal.backdrop} onClick={onClose} aria-label="Cerrar aviso" />
      <div className={`${panelClass} relative flex flex-col max-h-[92vh]`} onClick={(e) => e.stopPropagation()}>
        <div className={`${uiModal.header} shrink-0 py-3 px-4`}>
          <div className="min-w-0">
            <h2 id="privacy-notice-modal-title" className="text-xs font-bold text-slate-800 dark:text-slate-100">
              {isSummary ? 'Resumen del aviso de privacidad' : 'Aviso de privacidad integral'}
            </h2>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Versión {cfg.version}
              {isSummary ? ' · lectura ~15 s' : ''}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0" aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>

        {isSummary ? (
          <div className={`${uiModal.body} py-3 space-y-2`}>
            <PrivacyNoticeSummaryPanel privacyNotice={privacyNotice} audience={audience} />
            <p className="text-[10px] text-slate-400 dark:text-slate-500 pt-1">
              Este resumen no sustituye el aviso integral.
            </p>
          </div>
        ) : (
          <div className={`${uiModal.body} space-y-1`}>{renderBody(resolvedBody)}</div>
        )}

        <div className={`${uiModal.footer} shrink-0 flex-wrap gap-2 py-3 px-4`}>
          {publicUrl ? (
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-semibold text-indigo-600 hover:underline mr-auto"
            >
              {isSummary ? 'Ver aviso completo' : 'Abrir en página pública'}
            </a>
          ) : null}
          <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-bold">
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
