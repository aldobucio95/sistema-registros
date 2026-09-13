/**
 * Abono inicial del formulario de alta (panel o QR).
 * Lista de espera debe persistir el mismo apartado: cupo lleno y beca
 * redirigen a espera después de capturar el pago.
 */

export function buildInitialRegistrationPaymentFields({
  paid,
  paymentMethod,
  cardReference = '',
  paymentService = '',
  commissionRate = 0,
  registeredBy = '',
  at = new Date(),
  cardAllowed = true,
} = {}) {
  const initialPaidGross = parseFloat(paid) || 0;
  let method = paymentMethod === 'Tarjeta' ? 'Tarjeta' : 'Efectivo';
  if (method === 'Tarjeta' && !cardAllowed) method = 'Efectivo';
  const rate = Number(commissionRate) || 0;
  const commission = method === 'Tarjeta' && initialPaidGross > 0 ? initialPaidGross * rate : 0;
  const initialPaidNet = method === 'Tarjeta' ? initialPaidGross - commission : initialPaidGross;
  const when = at instanceof Date && !Number.isNaN(at.getTime()) ? at : new Date();
  const iso = when.toISOString();
  const reference = method === 'Tarjeta' ? String(cardReference || '').trim() : '';
  const service = String(paymentService || '').trim();
  const paymentHistory =
    initialPaidGross > 0
      ? [
          {
            id: when.getTime() + 1,
            date: when.toLocaleString('es-MX'),
            recordedAt: iso,
            amount: initialPaidGross,
            netAmount: initialPaidNet,
            method,
            service,
            reference,
            commission,
            registeredBy: String(registeredBy || '').trim(),
          },
        ]
      : [];
  return {
    paid: initialPaidGross,
    paidNet: initialPaidNet,
    paymentMethod: method,
    paymentService: service,
    cardReference: reference,
    paymentHistory,
    initialPaidGross,
    initialPaidNet,
    commission,
  };
}
