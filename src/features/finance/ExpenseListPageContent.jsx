import React from 'react';
import { donationAddsToRecaudacionBalance } from '../../donationHelpers.js';
import { isPastorParticipant, sumPastorRealCostForParticipants } from '../../pastorAttendance.js';
import { EXPENSE_LIST_SEARCH_FIELD_ID } from '../../ui/rosterFilterField.js';
import { uiFilter } from '../../ui/uiFormatClasses.js';
import { DollarSign, Edit3, Filter, GraduationCap, Plus, Receipt, Search, Trash2, Wallet } from 'lucide-react';
import { useWorkspaceShell } from '../../screens/eventWorkspace/WorkspaceShellContext.jsx';

export default function ExpenseListPageContent() {
  const {
    ATTENDANCE_SPECIAL,
    MASKED_EXPENSE_CONCEPT_LABEL,
    allParticipants,
    campaRealCostBreakdownForm,
    campaRealCostManualDivisorStr,
    canAccessExpenses,
    canMutateExpenseRecord,
    canSeeExpenseConceptForRow,
    computeManualCostCreditExpenseRows,
    computeScholarshipAutoExpenseRows,
    concept,
    createdAt,
    currentEvent,
    currentUser,
    data,
    donations,
    eventType,
    exp,
    expenseFilters,
    expenseFiltersDropdownOpen,
    expenseForm,
    expenseGross,
    expenseSearch,
    expenses,
    formatMoney,
    getCommissionToggleBtnClasses,
    getCommissionToggleLabel,
    handleAddCampaRealCostBreakdownLine,
    handleAddExpense,
    handleDeleteCampaRealCostBreakdownLine,
    handleDeleteExpense,
    handleSaveCampaRealCostManualDivisor,
    handleToggleExpenseCountInTotals,
    handleToggleExpensePaid,
    handleToggleHideMyExpenseConcepts,
    hasAdminRights,
    hist,
    includeCortesiaInRealCost,
    includeEmpleadoInRealCost,
    isCampa,
    isDerivedAutoExpenseIdForEvent,
    isHideMyExpenseConceptsOn,
    isOpen,
    isSiValue,
    isSuperUser,
    label,
    markCancelledRefundAsDonation,
    mergeEventDonationsForEvent,
    normalizeAttendanceSpecial,
    openRemovePendingRefundConfirm,
    paid,
    paidGross,
    participantCountsAsRealCostX2,
    participantIsActiveInRoster,
    participantIsCancelled,
    recaudado,
    refundPendingAmount,
    setCampaRealCostBreakdownForm,
    setCampaRealCostManualDivisorStr,
    setExpenseEditModal,
    setExpenseFilters,
    setExpenseFiltersDropdownOpen,
    setExpenseForm,
    setExpenseGross,
    setExpensePartialModal,
    setExpenseSearch,
    summary,
    users
  } = useWorkspaceShell();


    const canSeeExpenseOwner = isSuperUser || hasAdminRights;
    const hideMyExpenseConceptsChecked = isHideMyExpenseConceptsOn(
      (users ?? []).find((u) => String(u.id) === String(currentUser?.id)) ?? currentUser
    );
    const eventId = currentEvent?.id;
    const suppressed = new Set(currentEvent?.expenseListSuppressedIds || []);
    const plainExpenses = !eventId
      ? []
      : expenses.filter(
          (e) => e.eventId === eventId && !isDerivedAutoExpenseIdForEvent(e.id, eventId)
        );
    const schComputed = eventId ? computeScholarshipAutoExpenseRows(eventId) : [];
    const manualComputed = eventId ? computeManualCostCreditExpenseRows(eventId) : [];
    const mergeDerivedRows = (computedList) =>
      computedList
        .map((c) => {
          const p = expenses.find((e) => e.id === c.id && String(e.eventId) === String(eventId));
          if (p) return p;
          if (suppressed.has(c.id)) return null;
          return c;
        })
        .filter(Boolean);
    const scholarshipAutoExpenses = mergeDerivedRows(schComputed);
    const manualCostCreditAutoExpenses = mergeDerivedRows(manualComputed);
    const mergedDerivedIds = new Set([
      ...scholarshipAutoExpenses.map((e) => e.id),
      ...manualCostCreditAutoExpenses.map((e) => e.id),
    ]);
    const orphanDerivedExpenses = !eventId
      ? []
      : expenses.filter(
          (e) =>
            e.eventId === eventId &&
            isDerivedAutoExpenseIdForEvent(e.id, eventId) &&
            !mergedDerivedIds.has(e.id)
        );
    const eventExpenses = [
      ...plainExpenses,
      ...scholarshipAutoExpenses,
      ...manualCostCreditAutoExpenses,
      ...orphanDerivedExpenses,
    ];
    const q = expenseSearch.toLowerCase().trim();
    let filtered = q ? eventExpenses.filter(e => (e.name || '').toLowerCase().includes(q)) : eventExpenses;
    const expenseStatusFilterActive = expenseFilters.paid || expenseFilters.pending;
    const expenseCountFilterActive = expenseFilters.counted || expenseFilters.uncounted;
    if (expenseStatusFilterActive) {
      filtered = filtered.filter((e) => (expenseFilters.paid && !!e.paid) || (expenseFilters.pending && !e.paid));
    }
    if (expenseCountFilterActive) {
      filtered = filtered.filter((e) => (expenseFilters.counted && !!(e.countInTotals ?? true)) || (expenseFilters.uncounted && !(e.countInTotals ?? true)));
    }
    const sorted = [...filtered].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
    const anyExpenseFilterActive = expenseStatusFilterActive || expenseCountFilterActive;

    const countedExpenses = eventExpenses.filter((e) => !!(e.countInTotals ?? true));
    const uncountedExpenses = eventExpenses.filter((e) => !(e.countInTotals ?? true));
    const totalCost = countedExpenses.reduce((s, e) => s + (e.totalPrice || 0), 0);
    const totalPaid = countedExpenses.reduce((s, e) => s + (e.paidAmount || 0), 0);
    const totalPending = totalCost - totalPaid;
    const totalUncounted = uncountedExpenses.reduce((s, e) => s + (e.totalPrice || 0), 0);

    const recaudacionGross = summary.globalStats.all.paidGross ?? summary.globalStats.all.paid;
    const recaudacionNet = summary.globalStats.all.paid;
    const eventDonations = mergeEventDonationsForEvent(currentEvent?.id, donations, allParticipants);
    const donationsTotal = eventDonations.filter(donationAddsToRecaudacionBalance).reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
    const recaudacion = (expenseGross ? recaudacionGross : recaudacionNet) + donationsTotal;
    const realCostNum = Number(currentEvent?.realCost) || 0;
    const totalRegs = summary.globalStats.all.count;
    const eventRosterRows = allParticipants.filter((p) => p.eventId === eventId && participantIsActiveInRoster(p));
    const realCostX2Rows = eventRosterRows.filter((p) => participantCountsAsRealCostX2(p, currentEvent));
    const cortesiaRows = eventRosterRows.filter((p) => normalizeAttendanceSpecial(p) === ATTENDANCE_SPECIAL.cortesia);
    const cortesiaNonServerRows = cortesiaRows.filter((p) => !isSiValue(p.isServer));
    const empleadoRows = eventRosterRows.filter((p) => normalizeAttendanceSpecial(p) === ATTENDANCE_SPECIAL.empleado);
    const pastorRows = eventRosterRows.filter((p) => isPastorParticipant(p, currentEvent?.eventType));
    const totalPastorRealCost = sumPastorRealCostForParticipants(eventRosterRows, currentEvent?.eventType);
    const realCostExtraUnits =
      realCostX2Rows.length +
      (includeCortesiaInRealCost ? cortesiaNonServerRows.length : 0) +
      (includeEmpleadoInRealCost ? empleadoRows.length : 0);
    const totalRealCostUnits = totalRegs + realCostExtraUnits;
    const cancelledRefundRows = allParticipants
      .filter((p) => p.eventId === eventId && participantIsCancelled(p))
      .map((p) => {
        const pendingAmount = p.refundAsDonation
          ? 0
          : Math.max(0, Number(p.refundPendingAmount ?? p.paid ?? 0) || 0);
        return { ...p, _refundPendingAmount: pendingAmount };
      });
    const pendingRefundRows = cancelledRefundRows.filter((p) => p._refundPendingAmount > 0);
    const totalPendingRefund = pendingRefundRows.reduce((sum, p) => sum + p._refundPendingAmount, 0);

    const recaudacionTotal = recaudacion;
    const recaudadoMenosListaGastos = recaudacionTotal - totalCost;
    /** Orden clásico (lista de gastos no resta aquí): recaudado − costo unitario×unidades − devoluciones. */
    const balanceNetoSinListaGastos = recaudacionTotal - (realCostNum * totalRealCostUnits) - totalPastorRealCost - totalPendingRefund;
    /** Lista de gastos se resta primero del recaudado total; luego costo unitario, costos de pastores y devoluciones. */
    const balanceFinal =
      recaudadoMenosListaGastos - (realCostNum * totalRealCostUnits) - totalPastorRealCost - totalPendingRefund;

    const campaBreakdownItems = Array.isArray(currentEvent?.campaRealCostBreakdownItems)
      ? currentEvent.campaRealCostBreakdownItems
      : [];
    const campaBreakdownTotal = campaBreakdownItems.reduce((s, row) => {
      const q = parseFloat(row.quantity) || 0;
      const u = parseFloat(row.unitCost) || 0;
      return s + q * u;
    }, 0);
    const manualDivisorParsed = parseFloat(String(campaRealCostManualDivisorStr || '').replace(',', '.'));
    const costoRealCalculadoCampa =
      isCampa && totalRegs > 0 ? campaBreakdownTotal / totalRegs : null;
    const costoRealAjustadoCampa =
      isCampa && Number.isFinite(manualDivisorParsed) && manualDivisorParsed > 0
        ? campaBreakdownTotal / manualDivisorParsed
        : null;

    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-start justify-between gap-4">
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3"><Receipt className="text-emerald-500" size={28} /> Lista de Gastos</h2>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-3 w-full lg:w-auto lg:max-w-xl">
            <label className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-left ${hideMyExpenseConceptsChecked ? 'border-amber-200 bg-amber-50/60 dark:border-amber-700 dark:bg-slate-900' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900'}`}>
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded accent-slate-700 shrink-0"
                checked={hideMyExpenseConceptsChecked}
                disabled={!canAccessExpenses}
                onChange={() => { void handleToggleHideMyExpenseConcepts(); }}
              />
              <span className="min-w-0">
                <span className="text-xs font-black text-slate-800 dark:text-slate-100 block">Ocultar mis conceptos para otros</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-300 font-semibold leading-snug block mt-1">
                  {hideMyExpenseConceptsChecked
                    ? 'Por defecto está activada: los gastos que registraste muestran «Oculto» a otros. Desmarca para que todos vean tus nombres de concepto.'
                    : 'Has desactivado la opción: los conceptos de los gastos que registres serán visibles para quien tenga acceso a esta lista. Vuelve a marcar para ocultarlos a otros.'}
                </span>
              </span>
            </label>
            <button type="button" onClick={() => setExpenseGross(p => !p)} className={`${getCommissionToggleBtnClasses(expenseGross)} shrink-0 self-start`}>
              <Wallet size={15} /> {getCommissionToggleLabel(expenseGross)}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id={EXPENSE_LIST_SEARCH_FIELD_ID}
                type="text"
                placeholder="Buscar gasto por nombre?"
                value={expenseSearch}
                onChange={e => setExpenseSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
            <div className="relative" data-dropdown-root="expense-filters">
              <button
                type="button"
                onClick={() => setExpenseFiltersDropdownOpen((v) => !v)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors"
              >
                <Filter size={14} /> Filtros
              </button>
              {expenseFiltersDropdownOpen && (
                <div className={`absolute right-0 mt-2 z-30 w-72 max-w-[90vw] bg-white border border-slate-200 rounded-xl shadow-xl p-3 space-y-3 ${uiFilter.dropdownScope}`}>
                  <button
                    type="button"
                    onClick={() => setExpenseFilters({ paid: false, pending: false, counted: false, uncounted: false })}
                    className="w-full px-3 py-2 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors"
                  >
                    Limpiar filtros
                  </button>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Estado de pago</p>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 py-1 cursor-pointer">
                      <input type="checkbox" className={uiFilter.circleControl} checked={expenseFilters.paid} onChange={() => setExpenseFilters((prev) => ({ ...prev, paid: !prev.paid }))} />
                      Pagado
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 py-1 cursor-pointer">
                      <input type="checkbox" className={uiFilter.circleControl} checked={expenseFilters.pending} onChange={() => setExpenseFilters((prev) => ({ ...prev, pending: !prev.pending }))} />
                      Pendiente
                    </label>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Contabilización</p>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 py-1 cursor-pointer">
                      <input type="checkbox" className={uiFilter.circleControl} checked={expenseFilters.counted} onChange={() => setExpenseFilters((prev) => ({ ...prev, counted: !prev.counted }))} />
                      Contabilizado
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 py-1 cursor-pointer">
                      <input type="checkbox" className={uiFilter.circleControl} checked={expenseFilters.uncounted} onChange={() => setExpenseFilters((prev) => ({ ...prev, uncounted: !prev.uncounted }))} />
                      No contabilizado
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-500/45 rounded-xl p-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Nombre</label>
              <input type="text" placeholder="Nombre del gasto" value={expenseForm.name} onChange={e => setExpenseForm({ ...expenseForm, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Cantidad</label>
              <input type="number" min="1" placeholder="1" value={expenseForm.quantity} onChange={e => setExpenseForm({ ...expenseForm, quantity: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Precio unitario</label>
              <input type="number" min="0" step="0.01" placeholder="$0.00" value={expenseForm.unitPrice} onChange={e => setExpenseForm({ ...expenseForm, unitPrice: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Total</label>
              <div className="px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-600 text-sm font-bold text-slate-700 dark:text-slate-100">${((parseInt(expenseForm.quantity) || 0) * (parseFloat(expenseForm.unitPrice) || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
            </div>
            <button onClick={handleAddExpense} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"><Plus size={16} /> Agregar</button>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase w-14">Contar</th>
                  <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase w-10">Pagado</th>
                  <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase">Nombre</th>
                  {canSeeExpenseOwner ? (
                    <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase" title="Usuario que registró el gasto">
                      Registró
                    </th>
                  ) : null}
                  <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase text-center">Cantidad</th>
                  <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase text-right">P. Unitario</th>
                  <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase text-right">Total</th>
                  <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase text-right">Pagado</th>
                  <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase text-right">Pendiente</th>
                  <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr><td colSpan={canSeeExpenseOwner ? 10 : 9} className="px-4 py-8 text-center text-sm text-slate-400">No hay gastos registrados{q || anyExpenseFilterActive ? ' con este filtro' : ''}.</td></tr>
                ) : sorted.map(exp => {
                  const pending = (exp.totalPrice || 0) - (exp.paidAmount || 0);
                  const isAutoScholarship = !!exp._autoScholarshipExpense;
                  const isManualCredit = !!exp._manualCostCreditExpense;
                  const rowConceptVisible = canSeeExpenseConceptForRow(exp);
                  const canMutate = canMutateExpenseRecord(exp);
                  const autoDerived = !!(exp._autoScholarshipExpense || exp._manualCostCreditExpense);
                  const expenseActionDisabledTitle = autoDerived
                    ? 'Solo Administrador o SuperUsuario pueden modificar este gasto automático'
                    : 'No disponible: concepto oculto por el usuario que lo registró';
                  const ownerLabel =
                    canSeeExpenseOwner
                      ? isAutoScholarship || isManualCredit
                        ? '—'
                        : (exp.createdBy || '—')
                      : null;
                  return (
                    <tr key={exp.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${exp.paid ? 'bg-emerald-50/50' : ''}`}>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={!!(exp.countInTotals ?? true)}
                          disabled={!canMutate}
                          onChange={() => handleToggleExpenseCountInTotals(exp.id)}
                          className={`w-4 h-4 rounded ${!canMutate ? 'accent-slate-300 cursor-not-allowed opacity-70' : 'accent-indigo-600 cursor-pointer'}`}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={!!exp.paid}
                          disabled={!canMutate}
                          onChange={() => handleToggleExpensePaid(exp.id)}
                          className={`w-4 h-4 rounded ${!canMutate ? 'accent-slate-300 cursor-not-allowed opacity-70' : 'accent-emerald-600 cursor-pointer'}`}
                        />
                      </td>
                      <td className={`px-4 py-3 text-sm font-semibold ${exp.paid ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                        {rowConceptVisible ? (exp.name || '?') : MASKED_EXPENSE_CONCEPT_LABEL}
                        {isAutoScholarship ? (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-100">
                            Automático
                          </span>
                        ) : null}
                      </td>
                      {canSeeExpenseOwner ? (
                        <td className="px-4 py-3 text-xs max-w-[10rem] truncate text-slate-600 font-semibold" title={ownerLabel && ownerLabel !== '—' ? ownerLabel : undefined}>
                          {ownerLabel}
                        </td>
                      ) : null}
                      <td className="px-4 py-3 text-sm text-slate-600 text-center">{exp.quantity}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 text-right">${(exp.unitPrice || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-sm font-bold text-slate-800 text-right">${(exp.totalPrice || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-sm font-bold text-emerald-600 text-right">${(exp.paidAmount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                      <td className={`px-4 py-3 text-sm font-bold text-right ${pending > 0 ? 'text-amber-600' : 'text-slate-400'}`}>${pending.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-center">
                        {isAutoScholarship && !canMutate ? (
                          <span className="text-[10px] font-bold text-slate-400">Auto</span>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              disabled={!canMutate}
                              onClick={() => setExpenseEditModal({ isOpen: true, id: exp.id, name: exp.name, quantity: exp.quantity, unitPrice: exp.unitPrice })}
                              className={`p-1.5 rounded-lg transition-colors ${canMutate ? 'text-slate-400 hover:bg-slate-100 hover:text-slate-600' : 'text-slate-200 cursor-not-allowed'}`}
                              title={canMutate ? 'Editar' : expenseActionDisabledTitle}
                            >
                              <Edit3 size={15} />
                            </button>
                            {!exp.paid && (
                              <button
                                type="button"
                                disabled={!canMutate}
                                onClick={() => setExpensePartialModal({ isOpen: true, expenseId: exp.id, amount: '' })}
                                className={`p-1.5 rounded-lg transition-colors ${canMutate ? 'text-indigo-500 hover:bg-indigo-50' : 'text-slate-200 cursor-not-allowed'}`}
                                title={canMutate ? 'Abono parcial' : expenseActionDisabledTitle}
                              >
                                <DollarSign size={15} />
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={!canMutate}
                              onClick={() => handleDeleteExpense(exp.id)}
                              className={`p-1.5 rounded-lg transition-colors ${canMutate ? 'text-red-400 hover:bg-red-50 hover:text-red-600' : 'text-slate-200 cursor-not-allowed'}`}
                              title={canMutate ? 'Eliminar' : expenseActionDisabledTitle}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-left bg-white rounded-2xl border shadow-sm p-5 transition-colors border-slate-200 hover:border-slate-300">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Total Gastos</p>
            <p className="text-2xl font-black text-slate-800">${totalCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
            <p className="text-[10px] text-slate-400 mt-1">{countedExpenses.length} gasto{countedExpenses.length !== 1 ? 's' : ''} contabilizado{countedExpenses.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="text-left bg-white rounded-2xl border shadow-sm p-5 transition-colors border-emerald-200 hover:border-emerald-300">
            <p className="text-[10px] font-black text-emerald-500 uppercase mb-1">Total Pagado</p>
            <p className="text-2xl font-black text-emerald-600">${totalPaid.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
            <p className="text-[10px] text-emerald-400 mt-1">{countedExpenses.filter(e => !!e.paid).length} pagado{countedExpenses.filter(e => !!e.paid).length !== 1 ? 's' : ''}</p>
          </div>
          <div className="text-left bg-white rounded-2xl border shadow-sm p-5 transition-colors border-amber-200 hover:border-amber-300">
            <p className="text-[10px] font-black text-amber-500 uppercase mb-1">Pendiente por Pagar</p>
            <p className="text-2xl font-black text-amber-600">${totalPending.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
            <p className="text-[10px] text-amber-400 mt-1">{countedExpenses.filter(e => !e.paid).length} pendiente{countedExpenses.filter(e => !e.paid).length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="text-left bg-slate-50 rounded-2xl border border-slate-200 shadow-sm p-5 transition-colors hover:border-slate-300">
            <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Gastos no contabilizados</p>
            <p className="text-2xl font-black text-slate-700">${totalUncounted.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
            <p className="text-[10px] text-slate-500 mt-1">{uncountedExpenses.length} registro{uncountedExpenses.length !== 1 ? 's' : ''} fuera de totales</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-300 dark:border-amber-500/45 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-black text-amber-700 dark:text-amber-300 uppercase">Saldo pendiente de devolución</p>
            <p className="text-lg font-black text-amber-700 dark:text-amber-300">${totalPendingRefund.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Este monto se resta del recaudado en el paso «costo unitario × unidades» del resumen financiero, pero sigue figurando como recaudado histórico.
            Si se marca como donación, se elimina de esta lista y deja de restarse en ese cálculo.
            El SuperUsuario puede eliminar un renglón (solo auditoría oculta).
          </p>
          {pendingRefundRows.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic">No hay saldos pendientes de devolución.</p>
          ) : (
            <div className="space-y-2">
              {pendingRefundRows.map((p) => (
                <div key={`refund-${p.id}`} className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-500/40 rounded-xl px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{p.name || 'Sin nombre'}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Sede: {p.location || '—'} · ID: {p.vnpPersonId || '—'}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <span className="text-sm font-black text-amber-700 dark:text-amber-300">${p._refundPendingAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    <button
                      type="button"
                      onClick={() => markCancelledRefundAsDonation(p.id)}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-black bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/45 hover:bg-emerald-50 dark:hover:bg-emerald-950/25 transition-colors"
                    >
                      Marcar como donación
                    </button>
                    {isSuperUser && (
                      <button
                        type="button"
                        onClick={() => openRemovePendingRefundConfirm(p)}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-black bg-white dark:bg-slate-900 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-500/45 hover:bg-red-50 dark:hover:bg-red-950/25 transition-colors"
                        title="Solo SuperUsuario: quita el saldo de la lista y deja de restarse en el costo unitario × unidades (auditoría oculta)"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border shadow-sm p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
              <p className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase mb-1">Total recaudado ({expenseGross ? 'Bruto' : 'Neto'})</p>
              <p className="text-2xl font-black text-slate-800 dark:text-slate-100">${recaudacionTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">Pagos de inscripción + donaciones que suman al recaudado (según el interruptor bruto/neto).</p>
            </div>
            <div className="rounded-2xl border shadow-sm p-5 bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-700">
              <p className="text-[10px] font-black text-amber-600 dark:text-amber-300 uppercase mb-1">Lista de gastos (contabilizados)</p>
              <p className="text-2xl font-black text-amber-700 dark:text-amber-200">${totalCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
              <p className="text-[10px] text-amber-600 dark:text-amber-300 mt-1">Se resta primero del total recaudado (no del «balance» después del costo unitario).</p>
            </div>
            <div className={`rounded-2xl border shadow-sm p-5 bg-white dark:bg-slate-900 ${recaudadoMenosListaGastos >= 0 ? 'border-emerald-200 dark:border-emerald-700' : 'border-red-200 dark:border-red-700'}`}>
              <p className={`text-[10px] font-black uppercase mb-1 ${recaudadoMenosListaGastos >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-red-600 dark:text-red-300'}`}>Recaudado − lista de gastos</p>
              <p className={`text-2xl font-black ${recaudadoMenosListaGastos >= 0 ? 'text-emerald-700 dark:text-emerald-200' : 'text-red-700 dark:text-red-200'}`}>${recaudadoMenosListaGastos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
              <p className={`text-[10px] mt-1 font-mono leading-snug ${recaudadoMenosListaGastos >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-red-600 dark:text-red-300'}`}>
                {formatMoney(recaudacionTotal)} − {formatMoney(totalCost)}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={`rounded-2xl border shadow-sm p-5 bg-white dark:bg-slate-900 ${balanceNetoSinListaGastos >= 0 ? 'border-indigo-200 dark:border-indigo-700' : 'border-red-200 dark:border-red-700'}`}>
              <p className={`text-[10px] font-black uppercase mb-1 ${balanceNetoSinListaGastos >= 0 ? 'text-indigo-600 dark:text-indigo-300' : 'text-red-600 dark:text-red-300'}`}>Balance inscripción (sin descontar lista de gastos aquí)</p>
              <p className={`text-2xl font-black ${balanceNetoSinListaGastos >= 0 ? 'text-indigo-700 dark:text-indigo-200' : 'text-red-700 dark:text-red-200'}`}>${balanceNetoSinListaGastos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
              <p className={`text-[10px] mt-1 leading-snug ${balanceNetoSinListaGastos >= 0 ? 'text-indigo-600 dark:text-indigo-300' : 'text-red-600 dark:text-red-300'}`}>
                {formatMoney(recaudacionTotal)} − ({formatMoney(realCostNum)} × {totalRealCostUnits}) − {formatMoney(totalPastorRealCost)} pastores − {formatMoney(totalPendingRefund)}
              </p>
              {isCampa ? (
                <p className={`text-[10px] mt-1 ${balanceNetoSinListaGastos >= 0 ? 'text-indigo-500 dark:text-indigo-300' : 'text-red-500 dark:text-red-300'}`}>
                  Unidades costo real: base {totalRegs} + Ambos {realCostX2Rows.length}
                  {includeCortesiaInRealCost ? ` + Cortesías ${cortesiaNonServerRows.length}` : ''}
                  {includeEmpleadoInRealCost ? ` + Empleados ${empleadoRows.length}` : ''}
                </p>
              ) : null}
              {pastorRows.length > 0 ? (
                <p className="text-[9px] mt-1 text-violet-700 dark:text-violet-300">
                  Pastores ({pastorRows.length}): costo real individual {formatMoney(totalPastorRealCost)} — captúralo en la sección Pastores del menú.
                </p>
              ) : null}
            </div>
            <div className={`rounded-2xl border shadow-sm p-5 bg-white dark:bg-slate-900 ${balanceFinal >= 0 ? 'border-emerald-200 dark:border-emerald-700' : 'border-red-200 dark:border-red-700'}`}>
              <p className={`text-[10px] font-black uppercase mb-1 ${balanceFinal >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-red-600 dark:text-red-300'}`}>Saldo final</p>
              <p className={`text-2xl font-black ${balanceFinal >= 0 ? 'text-emerald-700 dark:text-emerald-200' : 'text-red-700 dark:text-red-200'}`}>${balanceFinal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
              <p className={`text-[10px] mt-1 leading-snug ${balanceFinal >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-red-600 dark:text-red-300'}`}>
                (Recaudado − Lista de gastos) − Costo unitario × unidades − Devoluciones pendientes
              </p>
              <p className={`text-[10px] mt-1 font-mono break-words ${balanceFinal >= 0 ? 'text-emerald-500 dark:text-emerald-300' : 'text-red-500 dark:text-red-300'}`}>
                {formatMoney(recaudadoMenosListaGastos)} − ({formatMoney(realCostNum)} × {totalRealCostUnits}) − {formatMoney(totalPendingRefund)}
              </p>
              <p className={`text-[10px] mt-1 ${balanceFinal >= 0 ? 'text-emerald-500 dark:text-emerald-300' : 'text-red-500 dark:text-red-300'}`}>{balanceFinal >= 0 ? 'Saldo positivo' : 'Saldo negativo'}</p>
            </div>
          </div>
        </div>

        {isCampa && (
          <div className="bg-white rounded-2xl border border-violet-200 shadow-sm p-5 md:p-6 space-y-4 dark:bg-slate-900 dark:border-violet-700">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <GraduationCap className="text-violet-600 shrink-0" size={22} /> Costo real del Campa (desglose)
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-snug">
              Lista independiente de la lista de gastos operativos. La suma de conceptos se usa para estimar costo por persona: dividida entre los registros activos (calculado) o entre un divisor que indiques a mano (ajustado).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end bg-violet-50/60 border border-violet-100 rounded-xl p-3 dark:bg-slate-900 dark:border-violet-700">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Concepto</label>
                <input
                  type="text"
                  placeholder="Ej. Transporte, Alimentos"
                  value={campaRealCostBreakdownForm.concept}
                  onChange={(e) => setCampaRealCostBreakdownForm((f) => ({ ...f, concept: e.target.value }))}
                  disabled={!canAccessExpenses}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-violet-500 outline-none disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Cantidad</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="1"
                  value={campaRealCostBreakdownForm.quantity}
                  onChange={(e) => setCampaRealCostBreakdownForm((f) => ({ ...f, quantity: e.target.value }))}
                  disabled={!canAccessExpenses}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-violet-500 outline-none disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Costo unitario</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="$0.00"
                  value={campaRealCostBreakdownForm.unitCost}
                  onChange={(e) => setCampaRealCostBreakdownForm((f) => ({ ...f, unitCost: e.target.value }))}
                  disabled={!canAccessExpenses}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-violet-500 outline-none disabled:opacity-50"
                />
              </div>
              <div className="sm:col-span-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => { void handleAddCampaRealCostBreakdownLine(); }}
                  disabled={!canAccessExpenses}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg text-sm font-bold flex items-center gap-2"
                >
                  <Plus size={16} /> Agregar concepto
                </button>
              </div>
            </div>
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase">Concepto</th>
                    <th className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase text-center">Cantidad</th>
                    <th className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase text-right">Costo unit.</th>
                    <th className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase text-right">Subtotal</th>
                    <th className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase text-center w-24">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {campaBreakdownItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-400 text-sm italic">
                        No hay conceptos en el desglose. Agrega filas arriba.
                      </td>
                    </tr>
                  ) : (
                    campaBreakdownItems.map((row) => {
                      const q = parseFloat(row.quantity) || 0;
                      const u = parseFloat(row.unitCost) || 0;
                      const sub = q * u;
                      return (
                        <tr key={row.id} className="border-b border-slate-100">
                          <td className="px-4 py-2 font-semibold text-slate-800">{row.concept || '—'}</td>
                          <td className="px-4 py-2 text-center tabular-nums">{q.toLocaleString('es-MX')}</td>
                          <td className="px-4 py-2 text-right tabular-nums">${u.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-2 text-right font-bold text-slate-800 tabular-nums">${sub.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-2 text-center">
                            <button
                              type="button"
                              disabled={!canAccessExpenses}
                              onClick={() => { void handleDeleteCampaRealCostBreakdownLine(row.id); }}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-40"
                              title="Eliminar"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end gap-3 flex-wrap border-t border-slate-100 pt-4">
              <div className="min-w-[12rem]">
                <label className="text-[10px] font-black text-violet-800 uppercase">Participantes (divisor manual)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Ej. 120"
                  value={campaRealCostManualDivisorStr}
                  onChange={(e) => setCampaRealCostManualDivisorStr(e.target.value)}
                  onBlur={() => { void handleSaveCampaRealCostManualDivisor(); }}
                  disabled={!canAccessExpenses}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-violet-200 text-sm font-semibold focus:ring-2 focus:ring-violet-400 outline-none disabled:opacity-50"
                />
                <p className="text-[10px] text-slate-500 mt-1">Opcional. Al salir del campo se guarda. Vacío = sin divisor ajustado.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-violet-200 bg-violet-50/80 p-4 space-y-2 dark:bg-slate-900 dark:border-violet-700">
                <p className="text-[10px] font-black text-violet-800 dark:text-violet-200 uppercase">Costo real calculado</p>
                <p className="text-2xl font-black text-violet-900 dark:text-violet-100 tabular-nums">
                  {costoRealCalculadoCampa != null
                    ? `$${costoRealCalculadoCampa.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                    : '—'}
                </p>
                <p className="text-[11px] text-violet-900/90 dark:text-violet-200 font-mono leading-snug break-words">
                  {campaBreakdownTotal > 0 && totalRegs > 0
                    ? `${formatMoney(campaBreakdownTotal)} ÷ ${totalRegs} (registros activos)`
                    : campaBreakdownTotal <= 0
                      ? 'Agrega conceptos arriba.'
                      : 'Sin registros activos para dividir.'}
                </p>
              </div>
              <div className="rounded-xl border border-fuchsia-200 bg-fuchsia-50/80 p-4 space-y-2 dark:bg-slate-900 dark:border-fuchsia-700">
                <p className="text-[10px] font-black text-fuchsia-900 dark:text-fuchsia-200 uppercase">Costo real ajustado</p>
                <p className="text-2xl font-black text-fuchsia-950 dark:text-fuchsia-100 tabular-nums">
                  {costoRealAjustadoCampa != null
                    ? `$${costoRealAjustadoCampa.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                    : '—'}
                </p>
                <p className="text-[11px] text-fuchsia-950/90 dark:text-fuchsia-200 font-mono leading-snug break-words">
                  {campaBreakdownTotal > 0 && Number.isFinite(manualDivisorParsed) && manualDivisorParsed > 0
                    ? `${formatMoney(campaBreakdownTotal)} ÷ ${manualDivisorParsed} (divisor manual)`
                    : 'Indica un divisor manual mayor a 0 arriba.'}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-slate-500">
              Total desglose: <span className="font-bold text-slate-700">{formatMoney(campaBreakdownTotal)}</span>
              {' · '}
              Registros activos usados en «calculado»: <span className="font-bold text-slate-700">{totalRegs}</span>
            </p>
          </div>
        )}
      </div>
    );
}
