import React from 'react';
import { Accessibility, Church, Droplets, Flower2, Stethoscope } from 'lucide-react';
import { SI_LABEL } from '../appConstants.js';
import { uiFormChoiceBtn, uiSiNoFieldToggle } from '../ui/uiFormatClasses.js';

const SI = 'Si';

const VARIANT_META = {
  swim: { Icon: Droplets, activeKey: 'activeSwim', activePublicKey: 'activeSwimPublic', label: '¿Sabe nadar?' },
  allergy: { Icon: Flower2, activeKey: 'activeAllergy', activePublicKey: 'activeAllergyPublic', label: 'Alergias' },
  disease: { Icon: Stethoscope, activeKey: 'activeDisease', activePublicKey: 'activeDiseasePublic', label: 'Enfermedades' },
  disability: {
    Icon: Accessibility,
    activeKey: 'activeDisability',
    activePublicKey: 'activeDisabilityPublic',
    label: 'Discapacidades',
  },
  baptize: { Icon: Church, activeKey: 'activeBaptize', activePublicKey: 'activeBaptizePublic', label: 'Bautizo' },
  default: { Icon: null, activeKey: 'activeDefault', activePublicKey: 'activeDefault', label: 'Selección' },
};

function isSiValue(v) {
  const s = String(v ?? '').trim();
  return s === 'Si' || s === SI_LABEL || s.toLowerCase() === 'sí' || s.toLowerCase() === 'si';
}

/**
 * Un botón que alterna No ↔ Sí (estilo «Sabe nadar»), con icono por tipo.
 * @param {'swim'|'allergy'|'disease'|'disability'|'baptize'|'default'} [variant]
 * @param {'block'|'inline'} [layout] — block: ancho completo; inline: fila médica
 * @param {'panel'|'public'} [size]
 */
function normalizeSiNoToggleValue(value) {
  const s = String(value ?? '').trim();
  if (isSiValue(s)) return SI;
  if (s === 'No') return 'No';
  return '';
}

export default function SiNoFieldToggle({
  value = 'No',
  onChange,
  disabled = false,
  optional = false,
  variant = 'default',
  layout = 'block',
  size = 'panel',
  className = '',
  'aria-label': ariaLabel,
}) {
  const normalized = normalizeSiNoToggleValue(value);
  const isUnset = optional && normalized === '';
  const isSi = normalized === SI;
  const meta = VARIANT_META[variant] || VARIANT_META.default;
  const isPublic = size === 'public';
  const activeCls = isSi
    ? uiSiNoFieldToggle[isPublic ? meta.activePublicKey : meta.activeKey] || uiSiNoFieldToggle.activeDefault
    : isPublic
      ? uiSiNoFieldToggle.idlePublic
      : uiFormChoiceBtn.idlePanel;

  const Icon = meta.Icon;
  const iconCls = isSi ? uiSiNoFieldToggle.iconActive : uiSiNoFieldToggle.iconIdle;

  const layoutCls =
    layout === 'inline'
      ? uiFormChoiceBtn.inline
      : isPublic
        ? uiFormChoiceBtn.public
        : uiFormChoiceBtn.panel;

  const cls = [layoutCls, activeCls, disabled ? uiSiNoFieldToggle.disabled : '', className]
    .filter(Boolean)
    .join(' ');

  const handleClick = () => {
    if (!optional) {
      onChange(isSi ? 'No' : SI);
      return;
    }
    if (isUnset) onChange(SI);
    else if (isSi) onChange('No');
    else onChange('');
  };

  const label = isUnset ? '—' : isSi ? SI_LABEL : 'No';

  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={isUnset ? undefined : isSi}
      aria-label={ariaLabel || meta.label}
      onClick={handleClick}
      className={cls}
      title={isUnset ? 'Opcional: elige Sí o No' : undefined}
    >
      {Icon ? <Icon size={14} className={`shrink-0 ${iconCls}`} aria-hidden /> : null}
      {label}
    </button>
  );
}

export { isSiValue as isSiFieldValue, SI as SI_FIELD_VALUE };
