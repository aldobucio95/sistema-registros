import React, { useCallback } from 'react';
import { CalendarDays, List } from 'lucide-react';
import BirthDateDropdownGroup from './BirthDateDropdownGroup.jsx';
import {
  writeRegistryBirthDateMode,
  REGISTRY_BIRTHDATE_MODE_NATIVE,
  REGISTRY_BIRTHDATE_MODE_DROPDOWN,
  useRegistryBirthDateMode,
} from './registryBirthDatePreference.js';

/**
 * Fecha de nacimiento en el registro del panel: calendario nativo o día/mes/año.
 * La preferencia se guarda por `userId` (documento app_users) en localStorage.
 */
export default function RegistryBirthDateField({
  userId,
  value,
  onIsoChange,
  inputClasses,
  labelClasses,
  label = 'Fecha de nacimiento *',
  required = true,
  footer = null,
  /** Si true, no muestra el conmutador (p. ej. acompañantes: usan el modo del titular). */
  hideModeToggle = false,
}) {
  const mode = useRegistryBirthDateMode(userId);

  const toggleMode = useCallback(() => {
    const next = mode === REGISTRY_BIRTHDATE_MODE_DROPDOWN ? REGISTRY_BIRTHDATE_MODE_NATIVE : REGISTRY_BIRTHDATE_MODE_DROPDOWN;
    writeRegistryBirthDateMode(userId, next);
  }, [mode, userId]);

  const toggleButton = (
    <button
      type="button"
      onClick={toggleMode}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-500 transition-colors touch-manipulation"
      title={
        mode === REGISTRY_BIRTHDATE_MODE_NATIVE
          ? 'Cambiar a listas de día, mes y año'
          : 'Cambiar a selector de calendario'
      }
    >
      {mode === REGISTRY_BIRTHDATE_MODE_NATIVE ? (
        <>
          <List size={14} className="text-indigo-500" />
          Día / mes / año
        </>
      ) : (
        <>
          <CalendarDays size={14} className="text-indigo-500" />
          Calendario
        </>
      )}
    </button>
  );

  return (
    <div className="space-y-1">
      <label className={labelClasses}>{label}</label>

      {mode === REGISTRY_BIRTHDATE_MODE_NATIVE ? (
        <input
          type="date"
          required={required}
          className={inputClasses}
          value={value || ''}
          onChange={(e) => onIsoChange(e.target.value)}
        />
      ) : (
        <BirthDateDropdownGroup value={value} onChange={onIsoChange} required={required} inputClasses={inputClasses} />
      )}

      {footer || !hideModeToggle ? (
        <div
          className={`mt-1.5 flex w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 ${
            footer ? 'justify-between' : 'justify-end'
          }`}
        >
          {footer ? <div className="min-w-0 flex-1 text-left leading-tight [&>p]:m-0">{footer}</div> : null}
          {!hideModeToggle ? <div className="shrink-0 self-center">{toggleButton}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
