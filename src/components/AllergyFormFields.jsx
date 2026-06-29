import React from 'react';
import { uiMedicalRow } from '../ui/uiFormatClasses.js';
import SiNoMedicalToggle, { isSiMedicalValue } from './SiNoMedicalToggle.jsx';

/**
 * Alergias: toggle No/Sí (estilo «Sabe nadar») y campos en la misma fila.
 */
export default function AllergyFormFields({
  hasAllergy = 'No',
  allergyDetails = '',
  allergyCategory = '',
  onChange,
  disabled = false,
  variant = 'panel',
  allergyOptions = [],
  detailsClassName = '',
  categoryClassName = '',
  toggleClassName = '',
  detailsMissing = false,
  categoryLabel = 'Categoría (opcional)',
}) {
  const active = isSiMedicalValue(hasAllergy);
  const isPublic = variant === 'public';

  const inputCls = `${uiMedicalRow.field} ${isPublic ? uiMedicalRow.inputAllergyPublic : uiMedicalRow.inputAllergy} ${detailsClassName} ${categoryClassName}`;
  const selectCls = `${uiMedicalRow.field} ${isPublic ? uiMedicalRow.selectAllergyPublic : uiMedicalRow.selectAllergy}`;

  const setHas = (next) => {
    onChange({
      hasAllergy: next,
      allergyCategory: isSiMedicalValue(next) ? allergyCategory : '',
      allergyDetails: isSiMedicalValue(next) ? allergyDetails : '',
    });
  };

  return (
    <div className={uiMedicalRow.row}>
      <SiNoMedicalToggle
        value={hasAllergy}
        onChange={setHas}
        disabled={disabled}
        variant="allergy"
        size={isPublic ? 'public' : 'panel'}
        className={toggleClassName}
      />
      {active ? (
        <>
          <input
            type="text"
            placeholder="Detalles"
            disabled={disabled}
            className={`${inputCls}`}
            value={allergyDetails}
            onChange={(e) => onChange({ allergyDetails: e.target.value })}
            aria-invalid={detailsMissing || undefined}
          />
          <select
            disabled={disabled}
            className={selectCls}
            value={allergyCategory || ''}
            onChange={(e) => onChange({ allergyCategory: e.target.value })}
          >
            <option value="">{categoryLabel}</option>
            {allergyOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </>
      ) : null}
    </div>
  );
}
