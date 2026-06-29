import React from 'react';
import { Mars, Venus } from 'lucide-react';
import { uiGenderSelect } from '../ui/uiFormatClasses.js';
import { formFieldStack } from '../formFieldClasses.js';

export const GENDER_HOMBRE = 'Hombre';
export const GENDER_MUJER = 'Mujer';
export const GENDER_OPTIONS = [GENDER_HOMBRE, GENDER_MUJER];

/**
 * Selector de género con dos botones (Hombre / Mujer). Ninguno seleccionado por defecto.
 * @param {string} value — '' | 'Hombre' | 'Mujer'
 * @param {(next: string) => void} onChange
 * @param {boolean} [required]
 * @param {boolean} [missing] — resalta borde rojo (campo obligatorio vacío)
 * @param {boolean} [disabled]
 * @param {string} [label]
 * @param {string} [labelClasses]
 * @param {string} [className] — contenedor externo
 */
export default function GenderSelectButtons({
  value = '',
  onChange,
  required = false,
  missing = false,
  disabled = false,
  label = null,
  labelClasses = '',
  className = '',
  size = 'panel',
}) {
  const current = String(value || '').trim();
  const isHombre = current === GENDER_HOMBRE;
  const isMujer = current === GENDER_MUJER;
  const showMissing = missing || (required && !current);

  const pick = (next) => {
    if (disabled) return;
    onChange(next);
  };

  const btnDisabled = disabled ? uiGenderSelect.btnDisabled : '';
  const isPublic = size === 'public';
  const btnBase = `${isPublic ? uiGenderSelect.btnBasePublic : uiGenderSelect.btnBase}`;

  return (
    <div className={`${formFieldStack} ${className}`.trim()}>
      {label ? (
        <label className={labelClasses}>
          {label}
          {required ? ' *' : null}
        </label>
      ) : null}
      <div
        className={`${uiGenderSelect.groupWrap} ${showMissing ? uiGenderSelect.groupMissing : ''}`}
        role="group"
        aria-label={typeof label === 'string' ? label.replace(/\s*\*$/, '') : 'Género'}
        aria-required={required || undefined}
      >
        <div className={uiGenderSelect.group}>
          <button
            type="button"
            disabled={disabled}
            aria-pressed={isHombre}
            onClick={() => pick(GENDER_HOMBRE)}
            className={`${btnBase} ${isHombre ? uiGenderSelect.btnHombreActive : uiGenderSelect.btnHombreIdle} ${btnDisabled}`}
          >
            <Mars size={14} className="shrink-0" aria-hidden />
            Hombre
          </button>
          <button
            type="button"
            disabled={disabled}
            aria-pressed={isMujer}
            onClick={() => pick(GENDER_MUJER)}
            className={`${btnBase} ${isMujer ? uiGenderSelect.btnMujerActive : uiGenderSelect.btnMujerIdle} ${btnDisabled}`}
          >
            <Venus size={14} className="shrink-0" aria-hidden />
            Mujer
          </button>
        </div>
        {required ? (
          <input
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only absolute h-px w-px opacity-0 pointer-events-none"
            value={current}
            required
            readOnly
            onChange={() => {}}
          />
        ) : null}
      </div>
    </div>
  );
}
