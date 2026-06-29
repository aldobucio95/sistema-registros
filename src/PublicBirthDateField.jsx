import React from 'react';
import BirthDateDropdownGroup from './BirthDateDropdownGroup.jsx';

/**
 * Fecha como tres desplegables en orden: día, mes, año (formulario público).
 */
export default function PublicBirthDateField({
  value,
  onChange,
  required = false,
  inputClasses,
  labelClasses,
  label,
  hintAfter,
}) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <label className={labelClasses}>{label}</label>

      <BirthDateDropdownGroup value={value} onChange={onChange} required={required} inputClasses={inputClasses} />

      {hintAfter}
    </div>
  );
}
