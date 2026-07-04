import React from 'react';
import { ChevronDown } from 'lucide-react';

export const CAR_META_SAVE_DEBOUNCE_MS = 700;
export const PLAN_STRUCTURE_SAVE_DEBOUNCE_MS = 800;

export const btnPrimary =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-500/30 transition-colors disabled:opacity-50 disabled:pointer-events-none';

export const btnSecondary =
  'inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 dark:border-slate-600 transition-colors disabled:opacity-50';

export const btnWhatsAppCarData =
  'inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide border border-[#1DA851] bg-[#25D366] text-white hover:bg-[#20BD5A] transition-colors disabled:opacity-50 disabled:pointer-events-none';

export const inputSm =
  'w-full min-w-0 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100';

export function clampInt(n, min, max) {
  const x = parseInt(n, 10);
  if (!Number.isFinite(x)) return min;
  return Math.min(max, Math.max(min, x));
}

/** Solo monta hijos cuando está abierto (evita render pesado con secciones colapsadas). */
export function TransportLazySection({ open, onOpenChange, header, children, shellClassName = '', headerClassName = '' }) {
  return (
    <div className={shellClassName}>
      <button
        type="button"
        className={headerClassName}
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
      >
        {header}
        <ChevronDown
          size={18}
          className={`shrink-0 transition-transform ${open ? 'rotate-180 text-slate-400' : 'text-slate-400'}`}
          aria-hidden
        />
      </button>
      {open ? children : null}
    </div>
  );
}
