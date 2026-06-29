import React from 'react';
import { XCircle } from 'lucide-react';
import { uiButtons, uiModal } from '../ui/uiFormatClasses.js';

/**
 * Contenedor modal unificado para alta y edición de usuarios (escritorio).
 */
export default function UserAccountModalShell({
  open = false,
  onClose,
  onSubmit,
  formId = 'user-account-form',
  title,
  subtitle = null,
  headerIcon = null,
  submitLabel = 'Guardar',
  cancelLabel = 'Cancelar',
  children,
}) {
  if (!open) return null;

  return (
    <div className={uiModal.overlay} role="dialog" aria-modal="true" aria-labelledby={`${formId}-title`}>
      <button type="button" className={uiModal.backdrop} onClick={onClose} aria-label="Cerrar" />
      <form
        id={formId}
        className={`${uiModal.panelLg} animate-in zoom-in-95 duration-200`}
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={uiModal.header}>
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {headerIcon}
            <div className="min-w-0">
              <h3 id={`${formId}-title`} className={uiModal.title}>
                {title}
              </h3>
              {subtitle ? <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">{subtitle}</p> : null}
            </div>
          </div>
          <button type="button" onClick={onClose} className={uiButtons.closeIcon} aria-label="Cerrar">
            <XCircle size={18} />
          </button>
        </div>
        <div className={`${uiModal.body} space-y-3`}>{children}</div>
        <div className={uiModal.footer}>
          <button type="button" onClick={onClose} className={uiButtons.secondary}>
            {cancelLabel}
          </button>
          <button type="submit" className={uiButtons.primary}>
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
