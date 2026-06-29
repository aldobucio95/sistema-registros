import React from 'react';
import { uiModal } from '../ui/uiFormatClasses.js';
import { isSiValue } from '../publicRegistrationLogic.js';

/**
 * Confirmación antes de guardar un alta sin aceptación completa del aviso y/o datos médicos.
 */
export default function PrivacyConsentConfirmModal({
  open,
  privacyAccepted = false,
  sensitiveConsentAccepted = false,
  retentionDays = 90,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  const days = Math.max(1, parseInt(retentionDays, 10) || 90);
  const missingPrivacy = !privacyAccepted;
  const missingMedical = !isSiValue(sensitiveConsentAccepted);

  return (
    <div className={uiModal.overlayNested} role="dialog" aria-modal="true" aria-labelledby="privacy-consent-confirm-title">
      <button type="button" className={uiModal.backdrop} onClick={onCancel} aria-label="Cerrar" />
      <div className={`${uiModal.panelSm} p-6`} onClick={(e) => e.stopPropagation()}>
        <h2 id="privacy-consent-confirm-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Confirmar registro sin consentimiento completo
        </h2>
        <div className="mt-3 space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {missingPrivacy ? (
            <p>
              <strong className="text-amber-800 dark:text-amber-300">No se marcó la aceptación del aviso de privacidad.</strong>{' '}
              El registro se guardará para la operación del evento, pero{' '}
              <strong>todos los datos personales</strong> de esta inscripción se eliminarán de la base de datos{' '}
              <strong>{days} días naturales después de finalizado el evento</strong>.
            </p>
          ) : null}
          {missingMedical ? (
            <p>
              <strong className="text-amber-800 dark:text-amber-300">
                No se autorizó el almacenamiento permanente de datos médicos.
              </strong>{' '}
              Los datos de salud capturados se conservarán durante el evento, pero se eliminarán automáticamente{' '}
              <strong>{days} días naturales después de finalizado el evento</strong>
              {missingPrivacy ? ' (junto con el resto del registro, por no aceptar el aviso)' : ''}.
            </p>
          ) : null}
          {!missingPrivacy && !missingMedical ? (
            <p>Confirme que desea continuar con el registro.</p>
          ) : (
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Si marca las casillas correspondientes antes de registrar, los datos autorizados se conservarán de forma
              indefinida.
            </p>
          )}
        </div>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-amber-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-amber-200 transition-colors hover:bg-amber-700 dark:shadow-none"
          >
            Entiendo, registrar
          </button>
        </div>
      </div>
    </div>
  );
}
