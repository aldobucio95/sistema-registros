import React from 'react';
import { globalRegistryFilterFieldId, rosterFilterFieldId } from '../ui/rosterFilterField.js';

/** Fila de filtro (checkbox exclusivo) con id, name y label asociados. */
export default function RosterFilterCheckboxOption({
  loc,
  eventId,
  filterKey,
  optionValue,
  checked,
  onChange,
  children,
  className = 'flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 py-1 cursor-pointer',
}) {
  const isGlobal = eventId != null && eventId !== '';
  const id = isGlobal
    ? globalRegistryFilterFieldId(eventId, filterKey, optionValue)
    : rosterFilterFieldId(loc, filterKey, optionValue);
  const namePrefix = isGlobal ? 'globalRegistryFilter' : 'rosterFilter';
  return (
    <label htmlFor={id} className={className}>
      <input
        id={id}
        name={`${namePrefix}_${filterKey}`}
        type="checkbox"
        className="h-4 w-4 rounded accent-indigo-600"
        checked={checked}
        onChange={onChange}
      />
      {children}
    </label>
  );
}
