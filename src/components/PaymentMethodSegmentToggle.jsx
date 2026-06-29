import React, { useEffect } from 'react';
import { Banknote, CreditCard } from 'lucide-react';
import { uiPaymentMethodSegment } from '../ui/uiFormatClasses.js';

export const PAYMENT_EFECTIVO = 'Efectivo';
export const PAYMENT_TARJETA = 'Tarjeta';

function normalizeMethod(v) {
  return String(v ?? '').trim() === PAYMENT_TARJETA ? PAYMENT_TARJETA : PAYMENT_EFECTIVO;
}

/**
 * Selector segmentado Efectivo | Tarjeta con iconos y colores por método.
 */
export default function PaymentMethodSegmentToggle({
  value = PAYMENT_EFECTIVO,
  onChange,
  disabled = false,
  cardEnabled = true,
  className = '',
}) {
  const method = normalizeMethod(value);
  const isEfectivo = method === PAYMENT_EFECTIVO;
  const isTarjeta = method === PAYMENT_TARJETA;

  useEffect(() => {
    if (!cardEnabled && isTarjeta && onChange) onChange(PAYMENT_EFECTIVO);
  }, [cardEnabled, isTarjeta, onChange]);

  const pick = (next) => {
    if (disabled) return;
    if (next === PAYMENT_TARJETA && !cardEnabled) return;
    onChange(next);
  };

  const btnOff = disabled ? uiPaymentMethodSegment.btnDisabled : '';

  return (
    <div
      className={`${uiPaymentMethodSegment.group} ${className}`.trim()}
      role="group"
      aria-label="Método de pago"
    >
      <button
        type="button"
        disabled={disabled}
        aria-pressed={isEfectivo}
        onClick={() => pick(PAYMENT_EFECTIVO)}
        className={`${uiPaymentMethodSegment.btn} ${isEfectivo ? uiPaymentMethodSegment.btnEfectivoActive : uiPaymentMethodSegment.btnEfectivoIdle} ${btnOff}`}
      >
        <Banknote size={12} className={`shrink-0 ${isEfectivo ? uiPaymentMethodSegment.iconActive : uiPaymentMethodSegment.iconIdle}`} aria-hidden />
        Efectivo
      </button>
      <button
        type="button"
        disabled={disabled || !cardEnabled}
        aria-pressed={isTarjeta}
        title={cardEnabled ? undefined : 'Tarjeta no disponible en esta sede o evento'}
        onClick={() => pick(PAYMENT_TARJETA)}
        className={`${uiPaymentMethodSegment.btn} ${isTarjeta ? uiPaymentMethodSegment.btnTarjetaActive : uiPaymentMethodSegment.btnTarjetaIdle} ${btnOff} ${!cardEnabled ? uiPaymentMethodSegment.btnDisabled : ''}`}
      >
        <CreditCard size={12} className={`shrink-0 ${isTarjeta ? uiPaymentMethodSegment.iconActive : uiPaymentMethodSegment.iconIdle}`} aria-hidden />
        Tarjeta
      </button>
    </div>
  );
}

export { normalizeMethod as normalizePaymentMethod };
