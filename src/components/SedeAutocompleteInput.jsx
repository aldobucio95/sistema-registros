import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';

const MAX_SUGGESTIONS = 12;

function normalizeForMatch(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

function digitsOnly(s) {
  return String(s ?? '').replace(/\D/g, '');
}

function filterSuggestions(options, query) {
  const q = normalizeForMatch(query);
  if (!q) return [];
  const qDigits = digitsOnly(query);
  const out = [];
  for (const raw of options) {
    const s = String(raw ?? '').trim();
    if (!s) continue;
    const matchText = normalizeForMatch(s).includes(q);
    const matchPhone = qDigits.length >= 2 && digitsOnly(s).includes(qDigits);
    if (matchText || matchPhone) {
      out.push(s);
      if (out.length >= MAX_SUGGESTIONS) break;
    }
  }
  return out;
}

/**
 * Autocompletado por sede: sugerencias solo mientras se escribe (sin lista completa al enfocar).
 */
export default function SedeAutocompleteInput({
  suggestions = [],
  value,
  onChange,
  className = '',
  disabled = false,
  onBlur,
  onFocus,
  ...rest
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const blurTimerRef = useRef(null);

  const options = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const raw of suggestions || []) {
      const s = String(raw ?? '').trim();
      if (!s || seen.has(s)) continue;
      seen.add(s);
      out.push(s);
    }
    return out;
  }, [suggestions]);

  const filtered = useMemo(
    () => filterSuggestions(options, value),
    [options, value]
  );

  const showList = open && filtered.length > 0;

  const closeSoon = useCallback(() => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    blurTimerRef.current = setTimeout(() => setOpen(false), 140);
  }, []);

  const cancelClose = useCallback(() => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    };
  }, []);

  const pick = (opt) => {
    cancelClose();
    onChange?.({ target: { value: opt } });
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative min-w-0 w-full">
      <input
        {...rest}
        disabled={disabled}
        className={className}
        value={value ?? ''}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={showList}
        onChange={(e) => {
          onChange?.(e);
          setOpen(true);
        }}
        onFocus={(e) => {
          onFocus?.(e);
          if (String(value ?? '').trim()) setOpen(true);
        }}
        onBlur={(e) => {
          onBlur?.(e);
          closeSoon();
        }}
      />
      {showList ? (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-40 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-900"
        >
          {filtered.map((opt) => (
            <li key={opt} role="option" aria-selected={String(value) === opt}>
              <button
                type="button"
                tabIndex={-1}
                className="w-full px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-indigo-50 dark:text-slate-100 dark:hover:bg-indigo-950/50"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(opt);
                }}
              >
                {opt}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
