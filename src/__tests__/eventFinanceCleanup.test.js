import { describe, expect, it } from 'vitest';
import {
  EVENT_SCOPED_FINANCE_COLLECTIONS,
  buildEventDeleteArchivedCreditClearPatch,
  deleteEventScopedFinanceDocs,
  financeDocBelongsToEvent,
  participantNeedsEventDeleteFinanceStrip,
  selectEventFinanceDocsToDelete,
  shouldPreserveArchivedManualCreditOnArchive,
} from '../eventFinanceCleanup.js';
import { eventFirestoreDocIdFromHumanName } from '../firestoreDocId.js';

describe('eventFinanceCleanup', () => {
  it('el id del evento se reutiliza al recrear el mismo nombre', () => {
    const a = eventFirestoreDocIdFromHumanName('Campa Verano 2026');
    const b = eventFirestoreDocIdFromHumanName('Campa Verano 2026');
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(a.id).toBe(b.id);
  });

  it('filtra donaciones y gastos del evento y ignora otros eventId', () => {
    const docs = [
      { id: 'don-1', data: { eventId: 'campa-verano-2026', amount: 500 } },
      { id: 'don-other', data: { eventId: 'otro-evento', amount: 80 } },
      { id: 'exp-1', data: { eventId: 'campa-verano-2026', amount: 120 } },
      { id: 'bad', data: { amount: 1 } },
      { id: '', data: { eventId: 'campa-verano-2026' } },
    ];
    const selected = selectEventFinanceDocsToDelete(docs, 'campa-verano-2026');
    expect(selected.map((d) => d.id)).toEqual(['don-1', 'exp-1']);
  });

  it('financeDocBelongsToEvent no acepta eventId vacío', () => {
    expect(financeDocBelongsToEvent({ eventId: '' }, '')).toBe(false);
    expect(financeDocBelongsToEvent({ eventId: 'ev1' }, 'ev1')).toBe(true);
  });

  it('no preserva saldo a favor de archivo cuando el evento se elimina', () => {
    expect(shouldPreserveArchivedManualCreditOnArchive({})).toBe(true);
    expect(shouldPreserveArchivedManualCreditOnArchive({ skipFinancePreservation: true })).toBe(false);
  });

  it('detecta residuos de saldo a favor que revivirían donaciones sintéticas', () => {
    expect(
      participantNeedsEventDeleteFinanceStrip(
        { eventId: 'campa-verano-2026', archivedManualCreditAmount: 250 },
        'campa-verano-2026'
      )
    ).toBe(true);
    expect(
      participantNeedsEventDeleteFinanceStrip(
        { eventId: 'campa-verano-2026', archivedManualCreditAmount: 0 },
        'campa-verano-2026'
      )
    ).toBe(false);
    expect(
      participantNeedsEventDeleteFinanceStrip(
        { eventId: 'otro', archivedManualCreditAmount: 250 },
        'campa-verano-2026'
      )
    ).toBe(false);
  });

  it('borra donaciones y gastos del evento y deja los de otros eventos', async () => {
    const store = {
      app_donations: [
        { id: 'd1', data: { eventId: 'campa-verano-2026', amount: 500, fromCancelledRefundDonation: false } },
        { id: 'd2', data: { eventId: 'otro', amount: 40 } },
      ],
      app_expenses: [
        { id: 'e1', data: { eventId: 'campa-verano-2026', amount: 90 } },
        { id: 'e2', data: { eventId: 'otro', amount: 15 } },
      ],
    };

    const deleted = await deleteEventScopedFinanceDocs({
      eventId: 'campa-verano-2026',
      collections: EVENT_SCOPED_FINANCE_COLLECTIONS,
      listDocsByEventId: async (collectionName) => store[collectionName],
      deleteDocById: async (collectionName, docId) => {
        store[collectionName] = store[collectionName].filter((d) => d.id !== docId);
      },
    });

    expect(deleted).toEqual([
      { collectionName: 'app_donations', docId: 'd1' },
      { collectionName: 'app_expenses', docId: 'e1' },
    ]);
    expect(store.app_donations.map((d) => d.id)).toEqual(['d2']);
    expect(store.app_expenses.map((d) => d.id)).toEqual(['e2']);
  });

  it('exige eventId y no borra nada si la consulta viene vacía', async () => {
    await expect(
      deleteEventScopedFinanceDocs({
        eventId: '',
        listDocsByEventId: async () => [],
        deleteDocById: async () => {},
      })
    ).rejects.toThrow(/eventId requerido/);

    const deleted = await deleteEventScopedFinanceDocs({
      eventId: 'campa-verano-2026',
      listDocsByEventId: async () => [],
      deleteDocById: async () => {
        throw new Error('no debería borrar');
      },
    });
    expect(deleted).toEqual([]);
  });

  it('arma el patch que quita residuos de saldo a favor', () => {
    const patch = buildEventDeleteArchivedCreditClearPatch(() => ({ _delete: true }));
    expect(patch.archivedManualCreditAmount).toEqual({ _delete: true });
    expect(patch.archivedManualCreditListRef).toEqual({ _delete: true });
  });
});
