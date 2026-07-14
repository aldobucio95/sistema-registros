import React from 'react';
import { uiModal } from '../../ui/uiFormatClasses.js';

export default function CapFullWaitlistConfirmModal({ modal, onClose }) {
  if (!modal?.isOpen) return null;
  const { capUsed, capTotal, reason, loc: capLoc } = modal;
  const capLabel =
    reason === 'sede'
      ? `El cupo de inscripciones activas de la sede ${capLoc || 'seleccionada'} ya está completo`
      : 'El cupo de inscripciones activas del evento ya está completo';
  return (
    <div className={uiModal.overlayNested} role="dialog" aria-modal="true" aria-labelledby="cap-waitlist-title">
      <button
        type="button"
        className={uiModal.backdrop}
        onClick={() => onClose(false)}
        aria-label="Cerrar"
      />
      <div className={`${uiModal.panelSm} p-6`} onClick={(e) => e.stopPropagation()}>
        <h2 id="cap-waitlist-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Cupo lleno — lista de espera
        </h2>
        <div className="mt-3 space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <p>
            {capLabel}
            {capTotal > 0 ? (
              <>
                {' '}
                (<strong className="tabular-nums text-slate-800 dark:text-slate-100">{capUsed}</strong> de{' '}
                <strong className="tabular-nums text-slate-800 dark:text-slate-100">{capTotal}</strong> personas).
              </>
            ) : (
              '.'
            )}
          </p>
          <p>
            Por eso este registro se guardará en <strong>lista de espera</strong> y no contará como inscrito activo
            hasta que un administrador lo revise y lo promueva a activos si hay lugar disponible.
          </p>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => onClose(false)}
            className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onClose(true)}
            className="flex-1 rounded-xl bg-amber-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-amber-200 transition-colors hover:bg-amber-700 dark:shadow-none"
          >
            Continuar a lista de espera
          </button>
        </div>
      </div>
    </div>
  );
}
