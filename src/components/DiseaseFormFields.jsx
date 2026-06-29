import React from 'react';
import { uiMedicalRow } from '../ui/uiFormatClasses.js';
import SiNoMedicalToggle, { isSiMedicalValue } from './SiNoMedicalToggle.jsx';

/** Enfermedades: toggle + campos en una fila, altura h-9. */
export default function DiseaseFormFields({
  hasDisease = 'No',
  diseaseDetails = '',
  diseaseMedication = '',
  onChange,
  disabled = false,
  variant = 'panel',
  detailsClassName = '',
  medicationClassName = '',
}) {
  const active = isSiMedicalValue(hasDisease);
  const isPublic = variant === 'public';
  const base = isPublic ? uiMedicalRow.inputDiseasePublic : uiMedicalRow.inputDisease;

  return (
    <div className={uiMedicalRow.row}>
      <SiNoMedicalToggle
        value={hasDisease}
        onChange={(v) => onChange({ hasDisease: v })}
        disabled={disabled}
        variant="disease"
        size={isPublic ? 'public' : 'panel'}
      />
      {active ? (
        <>
          <input
            type="text"
            placeholder={isPublic ? 'Enfermedad' : '¿Cuál?'}
            disabled={disabled}
            className={`${uiMedicalRow.field} ${base} ${detailsClassName}`}
            value={diseaseDetails}
            onChange={(e) => onChange({ diseaseDetails: e.target.value })}
          />
          <input
            type="text"
            placeholder="Medicamento (opc.)"
            disabled={disabled}
            className={`${uiMedicalRow.field} ${base} ${medicationClassName}`}
            value={diseaseMedication || ''}
            onChange={(e) => onChange({ diseaseMedication: e.target.value })}
          />
        </>
      ) : null}
    </div>
  );
}
