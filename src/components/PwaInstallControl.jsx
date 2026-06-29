import React, { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePwaInstall } from '../pwa/usePwaInstall.js';
import { uiBadgeSoft } from '../ui/uiFormatClasses.js';

/**
 * Botón instalar PWA + modal de ayuda en iOS (Compartir → Añadir a inicio).
 */
export default function PwaInstallControl({ showToast, className = '', hideLabel = false }) {
  const { isInstalled, isIos, canUseNativeInstallPrompt, promptInstall } = usePwaInstall();
  const [iosHelpOpen, setIosHelpOpen] = useState(false);

  if (isInstalled) {
    return (
      <span
        className={uiBadgeSoft('emerald')}
        title="La app está instalada o abierta en modo independiente"
      >
        App instalada
      </span>
    );
  }

  const onClick = async () => {
    if (isIos) {
      setIosHelpOpen(true);
      return;
    }
    if (canUseNativeInstallPrompt) {
      const { outcome } = await promptInstall();
      if (outcome === 'accepted' && showToast) showToast('Aplicación instalada. Puedes abrirla desde el icono en tu escritorio o menú de aplicaciones.');
      else if (outcome === 'dismissed' && showToast) showToast('Instalación cancelada.');
      return;
    }
    if (showToast) {
      showToast(
        'Tu navegador no ofrece instalación automática. Usa el menú del navegador (⋮ o …) y busca «Instalar aplicación» o «Añadir a la pantalla de inicio».'
      );
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void onClick()}
        className={
          className
            || 'inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 border border-indigo-700 shadow-sm transition-colors dark:border-indigo-500 dark:shadow-indigo-950/40'
        }
        title="Instalar como aplicación (PWA)"
      >
        <Download size={14} className="shrink-0" aria-hidden />
        {!hideLabel ? (
          <>
            <span className="hidden sm:inline">Instalar app</span>
            <span className="sm:hidden">Instalar</span>
          </>
        ) : null}
      </button>

      {iosHelpOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-ios-title"
          onClick={() => setIosHelpOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl p-5 text-slate-800 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start gap-2 mb-3">
              <h2 id="pwa-ios-title" className="text-base font-black">
                Añadir a la pantalla de inicio (iPhone / iPad)
              </h2>
              <button
                type="button"
                className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => setIosHelpOpen(false)}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>
            <ol className="text-sm space-y-3 list-decimal pl-4 font-medium text-slate-700 dark:text-slate-300">
              <li>
                Toca el botón <Share className="inline align-text-bottom text-indigo-600 mx-0.5" size={16} aria-hidden />{' '}
                <strong>Compartir</strong> en la barra de Safari (centro abajo en iPhone).
              </li>
              <li>
                Desplázate y elige <strong>Añadir a inicio</strong> o <strong>Añadir a pantalla de inicio</strong>.
              </li>
              <li>
                Confirma el nombre y pulsa <strong>Añadir</strong>. El icono aparecerá como una app.
              </li>
            </ol>
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              En iOS la instalación solo está disponible desde Safari, no desde Chrome ni otros navegadores incrustados.
            </p>
            <button
              type="button"
              className="mt-4 w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700"
              onClick={() => setIosHelpOpen(false)}
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
