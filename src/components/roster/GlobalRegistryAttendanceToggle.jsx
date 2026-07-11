import React, { useEffect, useState } from 'react';

/** Control de asistencia al evento (sincronizado con Transporte). */
export default function GlobalRegistryAttendanceToggle({
  checked = false,
  disabled = false,
  onChange,
  compact = false,
}) {
  const [localChecked, setLocalChecked] = useState(checked);
  useEffect(() => {
    setLocalChecked(checked);
  }, [checked]);

  return (
    <label
      className={`inline-flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-300 ${compact ? 'text-[9px]' : 'text-[10px]'}`}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="checkbox"
        className="rounded border-slate-300 accent-emerald-600"
        checked={localChecked}
        disabled={disabled}
        onChange={(e) => {
          const next = e.target.checked;
          setLocalChecked(next);
          onChange?.(next);
        }}
      />
      <span className={localChecked ? 'text-emerald-700 dark:text-emerald-400' : ''}>
        {localChecked ? 'Asistió' : compact ? 'Asist.' : 'Confirmar asistencia'}
      </span>
    </label>
  );
}
