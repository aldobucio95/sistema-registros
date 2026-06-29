import React, { useEffect, useId, useRef, useState } from 'react';
import { ArrowUpDown, Check, ChevronDown } from 'lucide-react';
import { uiSortToolbar } from '../ui/uiFormatClasses.js';

/** Selector de orden (mismo lenguaje visual que filtros desplegables; sin `<select>` nativo). */
export default function RosterSortDropdown({
  value,
  onChange,
  options,
  ariaLabel,
  variant = 'location',
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const listId = useId();
  const isGlobal = variant === 'global';
  const selected = options.find((o) => o.id === value) || options[0];

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('click', onDocClick, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDocClick, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (id, e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setOpen(false);
    if (id === value) return;
    if (typeof onChange === 'function') onChange(id);
  };

  return (
    <div
      ref={rootRef}
      className={`${isGlobal ? uiSortToolbar.wrapGlobal : uiSortToolbar.wrap} w-full sm:w-auto`}
      data-dropdown-root="roster-sort"
    >
      <button
        type="button"
        className={`${isGlobal ? uiSortToolbar.triggerGlobal : uiSortToolbar.trigger} w-full sm:w-auto`}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        <ArrowUpDown size={isGlobal ? 13 : 14} className={`${uiSortToolbar.icon} shrink-0`} aria-hidden />
        <span className={isGlobal ? uiSortToolbar.triggerLabelGlobal : uiSortToolbar.triggerLabel}>
          {selected?.label || 'Orden'}
        </span>
        <ChevronDown
          size={14}
          className={`${uiSortToolbar.chevron} shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {open ? (
        <div id={listId} role="listbox" aria-label={ariaLabel} className={uiSortToolbar.menu}>
          <p className={uiSortToolbar.menuTitle}>Ordenar por</p>
          <div className={uiSortToolbar.menuList}>
            {options.map((opt) => {
              const active = opt.id === value;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={active ? uiSortToolbar.menuItemActive : uiSortToolbar.menuItem}
                  onMouseDown={(e) => pick(opt.id, e)}
                >
                  <span className="min-w-0 flex-1 text-left leading-snug whitespace-normal">{opt.label}</span>
                  {active ? <Check size={14} className="shrink-0 text-indigo-600 dark:text-indigo-300" aria-hidden /> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
