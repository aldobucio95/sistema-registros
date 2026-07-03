import React, { useMemo, useState } from 'react';

/**
 * Búsqueda con autocompletado (mín. 2 caracteres) para elegir varias personas.
 * Mismo patrón que «Vincular acompañante existente» en formularios Bautizos.
 */
export default function ManualGroupMemberSearchPicker({
  options = [],
  selectedKeys = [],
  onAdd,
  onRemove,
  disabled = false,
  inputClassName = '',
  placeholder = 'Buscar por nombre o sede (mín. 2 caracteres)…',
}) {
  const [query, setQuery] = useState('');

  const selectedSet = useMemo(
    () => new Set((selectedKeys || []).map((k) => String(k).trim()).filter(Boolean)),
    [selectedKeys]
  );

  const selectedItems = useMemo(
    () =>
      (Array.isArray(options) ? options : []).filter((o) =>
        selectedSet.has(String(o.value || '').trim())
      ),
    [options, selectedSet]
  );

  const available = useMemo(
    () =>
      (Array.isArray(options) ? options : []).filter(
        (o) => !selectedSet.has(String(o.value || '').trim())
      ),
    [options, selectedSet]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return available
      .filter(
        (o) =>
          String(o.label || '')
            .toLowerCase()
            .includes(q) || String(o.value || '').toLowerCase().includes(q)
      )
      .slice(0, 25);
  }, [query, available]);

  return (
    <div className="space-y-2">
      {selectedItems.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {selectedItems.map((item) => (
            <li
              key={item.value}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-indigo-100/90 dark:bg-indigo-900/50 text-[10px] font-bold text-indigo-900 dark:text-indigo-100 border border-indigo-200/80 dark:border-indigo-600/40 max-w-full"
            >
              <span className="truncate min-w-0" title={item.label}>
                {item.label}
              </span>
              <button
                type="button"
                disabled={disabled}
                className="text-[9px] font-bold text-rose-600 hover:underline shrink-0"
                onClick={() => onRemove?.(item.value)}
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
          Aún no has agregado personas al grupo.
        </p>
      )}

      <input
        type="search"
        className={inputClassName}
        disabled={disabled || available.length === 0}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={
          available.length === 0
            ? 'No hay más personas disponibles fuera de grupos manuales'
            : placeholder
        }
        autoComplete="off"
      />

      {available.length === 0 ? null : query.trim().length >= 2 ? (
        filtered.length > 0 ? (
          <ul className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-700">
            {filtered.map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  disabled={disabled}
                  className="w-full text-left px-2 py-1.5 text-[10px] text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                  onClick={() => {
                    onAdd?.(opt.value);
                    setQuery('');
                  }}
                >
                  {opt.label}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[10px] text-slate-500">Sin coincidencias.</p>
        )
      ) : (
        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
          Escribe al menos 2 letras para buscar entre quienes llegan en carro y no están en otro grupo manual.
        </p>
      )}
    </div>
  );
}
