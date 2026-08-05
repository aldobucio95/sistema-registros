/**
 * Filas virtuales de lista de gastos (beca agregada / saldo a favor).
 *
 * Las filas de beca (`sch-auto-*`) se recalculan en vivo desde el roster.
 * Si se materializan en `app_expenses` (toggle pagado / abono / edición),
 * `mergeDerivedRows` prefería el doc de Firestore y congelaba totales
 * aunque cambiaran las becas — corrupción de totales, Excel y balance.
 */

export function isScholarshipAutoExpenseIdForEvent(id, eventId) {
  if (!eventId || !id) return false;
  return id === `sch-auto-approved-${eventId}` || id === `sch-auto-pending-${eventId}`;
}

export function isManualCreditVirtualExpenseIdForEvent(id, eventId) {
  if (!eventId || !id || typeof id !== 'string') return false;
  return id.startsWith('manual-credit-') && id.endsWith(`-${eventId}`);
}

export function isDerivedAutoExpenseIdForEvent(id, eventId) {
  return (
    isScholarshipAutoExpenseIdForEvent(id, eventId) ||
    isManualCreditVirtualExpenseIdForEvent(id, eventId)
  );
}

/**
 * Mutaciones que escribirían un doc en `app_expenses` con id de beca automática.
 * Eliminar (suppress en el evento) sí está permitido y no pasa por aquí.
 */
export function scholarshipAutoExpenseMutationBlocked(expenseId, eventId) {
  return isScholarshipAutoExpenseIdForEvent(expenseId, eventId);
}

/**
 * Fusiona filas calculadas con overlays de Firestore / suppress.
 * Becas: siempre la fila calculada (ignora snapshots FS stale).
 * Saldo a favor: puede usar overlay FS (pago parcial / marcado pagado).
 */
export function mergeDerivedExpenseRows({
  computedList,
  expensesList,
  eventId,
  suppressedIds,
}) {
  const suppressed = suppressedIds instanceof Set
    ? suppressedIds
    : new Set(Array.isArray(suppressedIds) ? suppressedIds : []);
  const expenses = Array.isArray(expensesList) ? expensesList : [];
  const computed = Array.isArray(computedList) ? computedList : [];

  return computed
    .map((c) => {
      if (!c || c.id == null) return null;
      if (suppressed.has(c.id)) return null;

      if (isScholarshipAutoExpenseIdForEvent(c.id, eventId)) {
        return c;
      }

      const persisted = expenses.find(
        (e) => e.id === c.id && String(e.eventId) === String(eventId)
      );
      if (persisted) {
        // Mantener totales/nombre vivos; solo overlay de pago / conteo.
        return {
          ...c,
          paid: persisted.paid,
          paidAmount: persisted.paidAmount,
          countInTotals: persisted.countInTotals ?? c.countInTotals,
          updatedAt: persisted.updatedAt || c.updatedAt,
          updatedBy: persisted.updatedBy || c.updatedBy,
        };
      }
      return c;
    })
    .filter(Boolean);
}

/**
 * Docs FS con id derivado que ya no corresponden a una fila calculada vigente.
 * No resucitar snapshots de beca (congelarían totales fantasma).
 */
export function orphanDerivedExpenseDocs({
  expensesList,
  eventId,
  mergedDerivedIds,
}) {
  const expenses = Array.isArray(expensesList) ? expensesList : [];
  const merged = mergedDerivedIds instanceof Set
    ? mergedDerivedIds
    : new Set(mergedDerivedIds || []);
  return expenses.filter((e) => {
    if (!e || String(e.eventId) !== String(eventId)) return false;
    if (!isDerivedAutoExpenseIdForEvent(e.id, eventId)) return false;
    if (merged.has(e.id)) return false;
    // Nunca mostrar huérfanos de beca automática.
    if (isScholarshipAutoExpenseIdForEvent(e.id, eventId)) return false;
    return true;
  });
}
