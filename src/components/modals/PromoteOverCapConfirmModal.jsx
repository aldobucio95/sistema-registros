import React from 'react';
import { uiModal } from '../../ui/uiFormatClasses.js';

export default function PromoteOverCapConfirmModal({ modal, onClose }) {
  if (!modal?.isOpen) return null;
  const { capUsed, capTotal, additionalUnits, reason, loc: capLoc, personName, isCompanion } = modal;
  const capLabel =
    reason === 'sede'
      ? `El cupo de inscripciones activas de la sede ${capLoc || 'seleccionada'} ya está completo`
      : 'El cupo de inscripciones activas del evento ya está completo';
  const whoLabel = isCompanion
    ? `el acompañante ${personName || 'en lista de espera'}`
    : personName || 'esta persona';
  const projected = capUsed + additionalUnits;
  return (
    <div className={uiModal.overlayTop} role="dialog" aria-modal="true" aria-labelledby="promote-overcap-title">
      <button
        type="button"
        className={uiModal.backdrop}
        onClick={() => onClose(false)}
        aria-label="Cerrar"
      />
      <div className={`${uiModal.panelSm} p-6`} onClick={(e) => e.stopPropagation()}>
        <h2 id="promote-overcap-title" className="text-lg font-bold text-rose-700 dark:text-rose-300">
          Confirmar sobrecupo
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
            Al promover a <strong className="text-slate-800 dark:text-slate-100">{whoLabel}</strong> se superará el
            cupo configurado
            {additionalUnits > 0 ? (
              <>
                {' '}
                (quedarían{' '}
                <strong className="tabular-nums text-slate-800 dark:text-slate-100">{projected}</strong> de{' '}
                <strong className="tabular-nums text-slate-800 dark:text-slate-100">{capTotal}</strong>).
              </>
            ) : (
              '.'
            )}
          </p>
          <p className="text-rose-700 dark:text-rose-300 font-semibold">
            Solo administradores pueden autorizar sobrecupo. ¿Deseas continuar con la promoción?
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
            className="flex-1 rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-rose-200 transition-colors hover:bg-rose-700 dark:shadow-none"
          >
            Sí, promover con sobrecupo
          </button>
        </div>
      </div>
    </div>
  );
}
