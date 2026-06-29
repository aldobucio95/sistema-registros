import React, { useState } from 'react';
import PrivacyNoticeModal from './PrivacyNoticeModal.jsx';
import PrivacyNoticeSummaryPanel from './PrivacyNoticeSummaryPanel.jsx';
import { buildPrivacyNoticePublicUrl } from '../privacyNotice.js';
import SiNoFieldToggle from './SiNoFieldToggle.jsx';

const SI = 'Si';

const checkboxLabelCls =
  'flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-400 leading-snug cursor-pointer';
const checkboxInputCls = 'mt-0.5 h-3.5 w-3.5 accent-indigo-600 rounded shrink-0';

/**
 * @param {'manual' | 'public'} variant
 */
export default function PrivacyConsentBlock({
  variant = 'manual',
  privacyNotice,
  privacyAccepted,
  onPrivacyAcceptedChange,
  sensitiveDataConsent,
  onSensitiveDataConsentChange,
  disabled = false,
  compact = false,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const publicUrl = buildPrivacyNoticePublicUrl(typeof window !== 'undefined' ? window.location.origin : '');
  const isManual = variant === 'manual';
  const permanentProfileChecked = sensitiveDataConsent === SI;

  return (
    <>
      <section
        className="pt-3 border-t border-slate-200/60 dark:border-slate-600/40 space-y-2"
        aria-label="Privacidad y consentimiento"
      >
        {isManual ? (
          <PrivacyNoticeSummaryPanel
            privacyNotice={privacyNotice}
            audience="manual"
            showReadAloudLabel
            className="rounded-lg border border-slate-200/70 dark:border-slate-600/50 bg-slate-50/50 dark:bg-slate-800/25 p-2.5"
          />
        ) : null}

        <label className={checkboxLabelCls}>
          <input
            type="checkbox"
            className={checkboxInputCls}
            disabled={disabled}
            checked={!!privacyAccepted}
            onChange={(e) => onPrivacyAcceptedChange?.(e.target.checked)}
          />
          <span className="min-w-0">
            {isManual
              ? 'El registrado acepta el aviso de privacidad'
              : 'Acepto el aviso de privacidad'}
            {isManual ? (
              <span className="text-slate-400 dark:text-slate-500"> (opcional)</span>
            ) : (
              <span className="text-slate-400 dark:text-slate-500"> (opcional)</span>
            )}
            {!isManual ? (
              <>
                <span className="text-slate-400 dark:text-slate-500"> · </span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setModalOpen(true)}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium disabled:opacity-50"
                >
                  Leer aviso
                </button>
              </>
            ) : null}
          </span>
        </label>

        {isManual ? (
          <label className={checkboxLabelCls}>
            <input
              type="checkbox"
              className={checkboxInputCls}
              disabled={disabled}
              checked={permanentProfileChecked}
              onChange={(e) => onSensitiveDataConsentChange?.(e.target.checked ? SI : 'No')}
            />
            <span className="min-w-0">
              Autoriza perfil permanente y conservación de datos médicos
              <span className="text-slate-400 dark:text-slate-500"> (opcional)</span>
              <span className="text-slate-400 dark:text-slate-500"> · </span>
              <button
                type="button"
                disabled={disabled}
                onClick={(e) => {
                  e.preventDefault();
                  setModalOpen(true);
                }}
                className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium disabled:opacity-50"
              >
                Aviso completo
              </button>
            </span>
          </label>
        ) : (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pl-5">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Datos de salud: ¿conservar?
              <span className="text-slate-400 dark:text-slate-500"> (opcional)</span>
            </span>
            <SiNoFieldToggle
              disabled={disabled}
              optional
              value={
                sensitiveDataConsent === SI
                  ? SI
                  : String(sensitiveDataConsent ?? '').trim() === 'No'
                    ? 'No'
                    : ''
              }
              onChange={(v) => onSensitiveDataConsentChange?.(v)}
              layout="inline"
              size="public"
              aria-label="Consentimiento datos sensibles de salud"
            />
          </div>
        )}
      </section>
      <PrivacyNoticeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        privacyNotice={privacyNotice}
        publicUrl={publicUrl}
        mode={isManual ? 'full' : 'summary'}
        audience={variant}
      />
    </>
  );
}
