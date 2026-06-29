import React from 'react';
import SiNoFieldToggle, { isSiFieldValue, SI_FIELD_VALUE } from './SiNoFieldToggle.jsx';

/**
 * Toggle médico No ↔ Sí (mismo estilo que «Sabe nadar»), para filas con campos de detalle.
 * @param {'default'|'allergy'|'disease'|'disability'} [variant]
 */
export default function SiNoMedicalToggle({
  value = 'No',
  onChange,
  disabled = false,
  variant = 'default',
  className = '',
  size = 'panel',
}) {
  return (
    <SiNoFieldToggle
      value={value}
      onChange={onChange}
      disabled={disabled}
      variant={variant}
      layout="inline"
      size={size}
      className={className}
    />
  );
}

export { isSiFieldValue as isSiMedicalValue, SI_FIELD_VALUE as SI_MEDICAL_VALUE };
