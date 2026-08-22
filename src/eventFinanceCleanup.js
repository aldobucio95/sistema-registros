/**
 * Limpieza financiera al eliminar un evento.
 *
 * El id de `app_events` se deriva del nombre (`eventFirestoreDocIdFromHumanName`).
 * Borrar un evento y volver a crearlo con el mismo nombre reutiliza el id; si
 * quedan `app_donations` / `app_expenses` (o residuos de saldo a favor de archivo),
 * el corte y la recaudación del evento nuevo heredan movimientos ajenos.
 */

export const EVENT_SCOPED_FINANCE_COLLECTIONS = ['app_donations', 'app_expenses'];

export function financeDocBelongsToEvent(data, eventId) {
  const eid = String(eventId || '').trim();
  if (!eid || !data || typeof data !== 'object') return false;
  return String(data.eventId || '').trim() === eid;
}

export function selectEventFinanceDocsToDelete(docs, eventId) {
  return (Array.isArray(docs) ? docs : []).filter((row) => {
    if (!row || row.id == null || String(row.id).trim() === '') return false;
    return financeDocBelongsToEvent(row.data ?? row, eventId);
  });
}

/** Al borrar el evento no hay que mintar donaciones que reutilizarían el mismo eventId. */
export function shouldPreserveArchivedManualCreditOnArchive(options = {}) {
  return !options?.skipFinancePreservation;
}

export function participantHasArchivedManualCreditResidue(person) {
  if (!person || typeof person !== 'object') return false;
  return (
    (Number(person.archivedManualCreditAmount) || 0) > 0.005 ||
    (Number(person.archivedManualCreditListRef) || 0) > 0.005
  );
}

export function participantNeedsEventDeleteFinanceStrip(person, eventId) {
  return financeDocBelongsToEvent(person, eventId) && participantHasArchivedManualCreditResidue(person);
}

export function buildEventDeleteArchivedCreditClearPatch(deleteFieldFn) {
  if (typeof deleteFieldFn !== 'function') {
    return {
      archivedManualCreditAmount: null,
      archivedManualCreditListRef: null,
    };
  }
  return {
    archivedManualCreditAmount: deleteFieldFn(),
    archivedManualCreditListRef: deleteFieldFn(),
  };
}

/**
 * @param {{
 *   eventId: string,
 *   listDocsByEventId: (collectionName: string, eventId: string) => Promise<Array<{id: string, data?: object}>>,
 *   deleteDocById: (collectionName: string, docId: string) => Promise<void>,
 *   collections?: string[],
 * }} args
 */
export async function deleteEventScopedFinanceDocs({
  eventId,
  listDocsByEventId,
  deleteDocById,
  collections = EVENT_SCOPED_FINANCE_COLLECTIONS,
} = {}) {
  const eid = String(eventId || '').trim();
  if (!eid) {
    throw new Error('eventId requerido para limpiar finanzas del evento');
  }
  if (typeof listDocsByEventId !== 'function' || typeof deleteDocById !== 'function') {
    throw new Error('listDocsByEventId y deleteDocById son requeridos');
  }

  const deleted = [];
  for (const collectionName of collections) {
    const listed = await listDocsByEventId(collectionName, eid);
    const toDelete = selectEventFinanceDocsToDelete(listed, eid);
    for (const row of toDelete) {
      const docId = String(row.id).trim();
      await deleteDocById(collectionName, docId);
      deleted.push({ collectionName, docId });
    }
  }
  return deleted;
}
