import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  DEFAULT_SERVE_AREA_OPTIONS,
  formatPreferredServeArea,
  parsePreferredServeArea,
} from '../registrationFormShared.js';

/**
 * Selector multi-área con backdrop `fixed` para que funcione dentro de modales con overflow.
 */
export default function ServeAreaMultiSelect({
  value,
  onChange,
  inputClasses = '',
  opts = DEFAULT_SERVE_AREA_OPTIONS,
  disabled = false,
  placeholder = 'Seleccionar...',
}) {
  const [open, setOpen] = useState(false);
  const { selected, otroText } = parsePreferredServeArea(value || '', opts);

  const toggle = (opt) => {
    const next = new Set(selected);
    if (next.has(opt)) next.delete(opt);
    else next.add(opt);
    const txt = opt === 'Otro' ? (next.has('Otro') ? otroText : '') : otroText;
    onChange(formatPreferredServeArea(next, txt));
  };

  const label =
    selected.size > 0
      ? [...selected].map((s) => (s === 'Otro' && otroText ? `Otro: ${otroText}` : s)).join(', ')
      : placeholder;

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`w-full ${inputClasses} text-left flex items-center justify-between`}
      >
        <span className="truncate text-sm">{label}</span>
        {open ? <ChevronUp size={16} className="shrink-0" /> : <ChevronDown size={16} className="shrink-0" />}
      </button>
      {open && !disabled ? (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute top-full left-0 right-0 mt-1 z-[70] rounded-lg border border-slate-200 bg-white p-2 shadow-lg max-h-56 overflow-auto dark:border-slate-600 dark:bg-slate-800">
            {opts.map((opt) => (
              <div key={opt}>
                <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/60">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-indigo-600 rounded"
                    checked={selected.has(opt)}
                    onChange={() => toggle(opt)}
                  />
                  {opt}
                </label>
                {opt === 'Otro' && selected.has('Otro') ? (
                  <input
                    type="text"
                    placeholder="¿Cuál?"
                    className="ml-6 mt-1 w-[calc(100%-1.5rem)] rounded border border-slate-200 p-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                    value={otroText}
                    onChange={(e) => onChange(formatPreferredServeArea(selected, e.target.value))}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : null}
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
