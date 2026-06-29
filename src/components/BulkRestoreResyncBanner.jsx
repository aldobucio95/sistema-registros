import React from 'react';
import { Database } from 'lucide-react';

/**
 * Aviso cuando el servidor incrementó `dataBulkGeneration` (restauración masiva)
 * y este cliente aún no alineó su caché local de Firestore.
 */
export default function BulkRestoreResyncBanner({ onResync, busy }) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm dark:border-amber-700/80 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3 min-w-0">
          <Database className="shrink-0 mt-0.5 text-amber-700 dark:text-amber-300" size={20} aria-hidden />
          <div className="min-w-0">
            <p className="font-black text-amber-900 dark:text-amber-50">Restauración masiva en el servidor</p>
            <p className="mt-1 text-xs font-semibold leading-snug text-amber-900/90 dark:text-amber-100/90">
              Para no mezclar datos viejos guardados en este dispositivo con la copia restaurada, limpia la caché local
              de Firestore y recarga. Si trabajaste sin internet, revisa con tu equipo antes de continuar.
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onResync()}
          className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white hover:bg-amber-800 disabled:opacity-60 disabled:pointer-events-none dark:bg-amber-600 dark:hover:bg-amber-500"
        >
          {busy ? '…' : 'Alinear caché y recargar'}
        </button>
      </div>
    </div>
  );
}
