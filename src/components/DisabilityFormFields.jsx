import React from 'react';
import { uiMedicalRow } from '../ui/uiFormatClasses.js';
import SiNoMedicalToggle, { isSiMedicalValue } from './SiNoMedicalToggle.jsx';

/** Discapacidades: toggle + detalle en una fila, altura h-9. */
export default function DisabilityFormFields({
  hasDisability = 'No',
  disabilityDetails = '',
  onChange,
  disabled = false,
  variant = 'panel',
  detailsClassName = '',
}) {
  const active = isSiMedicalValue(hasDisability);
  const isPublic = variant === 'public';
  const base = isPublic ? uiMedicalRow.inputDisabilityPublic : uiMedicalRow.inputDisability;

  return (
    <div className={uiMedicalRow.row}>
      <SiNoMedicalToggle
        value={hasDisability}
        onChange={(v) => onChange({ hasDisability: v })}
        disabled={disabled}
        variant="disability"
        size={isPublic ? 'public' : 'panel'}
      />
      {active ? (
        <input
          type="text"
          placeholder="Detalles"
          disabled={disabled}
          className={`${uiMedicalRow.field} ${base} ${detailsClassName}`}
          value={disabilityDetails}
          onChange={(e) => onChange({ disabilityDetails: e.target.value })}
        />
      ) : null}
    </div>
  );
}
