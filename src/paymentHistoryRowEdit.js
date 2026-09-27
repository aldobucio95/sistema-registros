/**
 * Recalcula un abono del historial al cambiar método, referencia o monto.
 * El modal muestra el valor absoluto. Los ajustes manuales con monto negativo
 * deben conservar el signo; si se reescriben como positivos, `paid` sube el doble.
 */

export function planPaymentHistoryRowEdit({
  row,
  person,
  newMethod,
  newAmountAbs,
  nextReference,
  commissionRate,
}) {
  const rate = Number(commissionRate) || 0;
  const oldAmount = Number(row?.amount) || 0;
  const sign = oldAmount < 0 ? -1 : 1;
  const absAmount = Math.abs(Number(newAmountAbs) || 0);
  const method = newMethod === 'Tarjeta' ? 'Tarjeta' : 'Efectivo';
  const oldMethod = row?.method || (person?.paymentMethod === 'Tarjeta' ? 'Tarjeta' : 'Efectivo');
  const storedNet = parseFloat(row?.netAmount);
  const oldNetSigned = Number.isFinite(storedNet)
    ? storedNet
    : oldMethod === 'Tarjeta'
      ? oldAmount - oldAmount * rate
      : oldAmount;
  const newCommissionAbs = method === 'Tarjeta' ? absAmount * rate : 0;
  const newNetAbs = method === 'Tarjeta' ? absAmount - newCommissionAbs : absAmount;
  const newAmount = sign * absAmount;
  const newNet = sign * newNetAbs;
  const newCommission = sign * newCommissionAbs;
  const originalPaidGross = parseFloat(person?.paid || 0) || 0;
  const parsedPaidNet = parseFloat(person?.paidNet);
  const originalPaidNet = Number.isFinite(parsedPaidNet) ? parsedPaidNet : originalPaidGross;

  return {
    oldMethod,
    oldAmount,
    oldGrossAbs: Math.abs(oldAmount),
    newAmount,
    newNet,
    nextRow: {
      ...(row && typeof row === 'object' ? row : {}),
      amount: newAmount,
      method,
      netAmount: newNet,
      commission: newCommission,
      reference: nextReference,
    },
    nextPaidGross: originalPaidGross + (newAmount - oldAmount),
    nextPaidNet: originalPaidNet + (newNet - oldNetSigned),
  };
}
