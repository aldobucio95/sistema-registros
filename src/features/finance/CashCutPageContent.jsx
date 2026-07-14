import React from 'react';
import { aggregateCashCutPaymentsForLoc, aggregateCashCutPaymentsForLocAndService, getCashCutServiceColumnsForLocation, getCashCutServicesForLocation, getOffScheduleServiceKeysForLocation } from '../../app/helpers/cashCutAggregates.js';
import { SERVICE_OPTIONS } from '../../appConstants.js';
import { getCashCutScheduleForLocation } from '../../cashCutService.js';
import { donationAddsToRecaudacionBalance } from '../../donationHelpers.js';
import { cashCutSedeCardsGridStyle, uiCashCutSedeService, uiCashCutToneCard } from '../../ui/uiFormatClasses.js';
import { Calendar, CalendarRange, ChevronDown, ChevronUp, DollarSign, Scissors, Settings2, Wallet, XCircle } from 'lucide-react';
import { useWorkspaceShell } from '../../screens/eventWorkspace/WorkspaceShellContext.jsx';

function CashCutPageContent() {
  const {
    DEFAULT_SERVICE_SLOTS,
    NO_SERVICE_LABEL,
    QUICK_ACTION_DARK_INTERACTION,
    allParticipants,
    cashCutGross,
    cashCutLocationInScope,
    cashCutMode,
    cashCutSelected,
    cashCutServiceDetailModal,
    cashCutTotalsView,
    collectCashCutAllPayments,    computeNetAmountByMethod,    currentEvent,    donations,    expandedCut,
    formatCashCutWeekRangeLabel,
    formatMoney,
    getCashCutWeekKey,
    getCommissionToggleBtnClasses,
    getCommissionToggleLabel,
    globalConfig,
    hasAdminRights,    openCashCutScheduleModal,
    resolveCashCutRefundServiceLabel,
    setCashCutGross,
    setCashCutMode,
    setCashCutSelected,
    setCashCutServiceDetailModal,
    setCashCutTotalsView,
    setExpandedCut,
    visibleLocations
  } = useWorkspaceShell();


    const cashCutLocations = (currentEvent?.locations || [])
      .map((l) => String(l).trim())
      .filter(Boolean)
      .filter((l) => visibleLocations.includes(l));
    const allPayments = collectCashCutAllPayments(
      allParticipants,
      currentEvent,
      computeNetAmountByMethod,
      cashCutLocations,
      resolveCashCutRefundServiceLabel
    );

    const eventDonationsForCut = donations.filter(
      (d) =>
        d.eventId === currentEvent?.id &&
        donationAddsToRecaudacionBalance(d) &&
        !d.fromArchivedManualCredit &&
        cashCutLocationInScope(d.location, cashCutLocations)
    );

    const getDateKey = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    };

    const weekMap = {};
    allPayments.forEach(p => {
      const wk = getCashCutWeekKey(p._date);
      if (!wk) return;
      if (!weekMap[wk]) weekMap[wk] = { payments: [], efectivo: 0, tarjeta: 0, total: 0, totalNet: 0, count: 0, donations: 0 };
      weekMap[wk].payments.push(p);
      const amt = parseFloat(p.amount) || 0;
      const net = computeNetAmountByMethod(p.amount, p.method);
      if (p.method === 'Tarjeta') weekMap[wk].tarjeta += amt;
      else weekMap[wk].efectivo += amt;
      weekMap[wk].total += amt;
      weekMap[wk].totalNet += net;
      weekMap[wk].count++;
    });

    eventDonationsForCut.forEach(don => {
      const dt = new Date(don.createdAt);
      const wk = getCashCutWeekKey(dt);
      if (!wk) return;
      if (!weekMap[wk]) weekMap[wk] = { payments: [], efectivo: 0, tarjeta: 0, total: 0, totalNet: 0, count: 0, donations: 0 };
      weekMap[wk].donations += parseFloat(don.amount) || 0;
      weekMap[wk].total += parseFloat(don.amount) || 0;
      weekMap[wk].totalNet += parseFloat(don.amount) || 0;
    });

    const sundayMap = {};
    allPayments.filter(p => p._date.getDay() === 0).forEach(p => {
      const dk = getDateKey(p._date);
      if (!sundayMap[dk]) sundayMap[dk] = { payments: [], byService: {}, efectivo: 0, tarjeta: 0, total: 0, totalNet: 0, count: 0, donations: 0 };
      sundayMap[dk].payments.push(p);
      const amt = parseFloat(p.amount) || 0;
      const net = computeNetAmountByMethod(p.amount, p.method);
      const svc = p.service || 'Sin servicio';
      if (!sundayMap[dk].byService[svc]) sundayMap[dk].byService[svc] = { efectivo: 0, tarjeta: 0, total: 0, totalNet: 0, count: 0 };
      sundayMap[dk].byService[svc].count++;
      sundayMap[dk].byService[svc].total += amt;
      sundayMap[dk].byService[svc].totalNet += net;
      if (p.method === 'Tarjeta') {
        sundayMap[dk].tarjeta += amt;
        sundayMap[dk].byService[svc].tarjeta += amt;
      } else {
        sundayMap[dk].efectivo += amt;
        sundayMap[dk].byService[svc].efectivo += amt;
      }
      sundayMap[dk].total += amt;
      sundayMap[dk].totalNet += net;
      sundayMap[dk].count++;
    });

    eventDonationsForCut.forEach(don => {
      const dt = new Date(don.createdAt);
      if (dt.getDay() !== 0) return;
      const dk = getDateKey(dt);
      if (!sundayMap[dk]) sundayMap[dk] = { payments: [], byService: {}, efectivo: 0, tarjeta: 0, total: 0, totalNet: 0, count: 0, donations: 0 };
      sundayMap[dk].donations += parseFloat(don.amount) || 0;
      sundayMap[dk].total += parseFloat(don.amount) || 0;
      sundayMap[dk].totalNet += parseFloat(don.amount) || 0;
    });

    const dayMap = {};
    allPayments.forEach(p => {
      const dk = getDateKey(p._date);
      if (!dayMap[dk]) dayMap[dk] = { payments: [], efectivo: 0, tarjeta: 0, total: 0, totalNet: 0, count: 0, donations: 0, isSunday: p._date.getDay() === 0, byService: {} };
      dayMap[dk].payments.push(p);
      const amt = parseFloat(p.amount) || 0;
      const net = computeNetAmountByMethod(p.amount, p.method);
      if (p.method === 'Tarjeta') dayMap[dk].tarjeta += amt;
      else dayMap[dk].efectivo += amt;
      dayMap[dk].total += amt;
      dayMap[dk].totalNet += net;
      dayMap[dk].count++;
      if (p._date.getDay() === 0) {
        const svc = p.service || 'Sin servicio';
        if (!dayMap[dk].byService[svc]) dayMap[dk].byService[svc] = { efectivo: 0, tarjeta: 0, total: 0, totalNet: 0, count: 0 };
        dayMap[dk].byService[svc].count++;
        dayMap[dk].byService[svc].total += amt;
        dayMap[dk].byService[svc].totalNet += net;
        if (p.method === 'Tarjeta') dayMap[dk].byService[svc].tarjeta += amt;
        else dayMap[dk].byService[svc].efectivo += amt;
      }
    });
    eventDonationsForCut.forEach(don => {
      const dt = new Date(don.createdAt);
      const dk = getDateKey(dt);
      if (!dayMap[dk]) dayMap[dk] = { payments: [], efectivo: 0, tarjeta: 0, total: 0, totalNet: 0, count: 0, donations: 0, isSunday: dt.getDay() === 0, byService: {} };
      dayMap[dk].donations += parseFloat(don.amount) || 0;
      dayMap[dk].total += parseFloat(don.amount) || 0;
      dayMap[dk].totalNet += parseFloat(don.amount) || 0;
    });

    const getMonthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthMap = {};
    allPayments.forEach(p => {
      const mk = getMonthKey(p._date);
      if (!monthMap[mk]) monthMap[mk] = { payments: [], efectivo: 0, tarjeta: 0, total: 0, totalNet: 0, count: 0, donations: 0 };
      monthMap[mk].payments.push(p);
      const amt = parseFloat(p.amount) || 0;
      const net = computeNetAmountByMethod(p.amount, p.method);
      if (p.method === 'Tarjeta') monthMap[mk].tarjeta += amt;
      else monthMap[mk].efectivo += amt;
      monthMap[mk].total += amt;
      monthMap[mk].totalNet += net;
      monthMap[mk].count++;
    });
    eventDonationsForCut.forEach(don => {
      const dt = new Date(don.createdAt);
      const mk = getMonthKey(dt);
      if (!monthMap[mk]) monthMap[mk] = { payments: [], efectivo: 0, tarjeta: 0, total: 0, totalNet: 0, count: 0, donations: 0 };
      monthMap[mk].donations += parseFloat(don.amount) || 0;
      monthMap[mk].total += parseFloat(don.amount) || 0;
      monthMap[mk].totalNet += parseFloat(don.amount) || 0;
    });

    const weekKeys = Object.keys(weekMap).sort((a, b) => b.localeCompare(a));
    const sundayKeys = Object.keys(sundayMap).sort((a, b) => b.localeCompare(a));
    const dayKeys = Object.keys(dayMap).sort((a, b) => b.localeCompare(a));
    const monthKeys = Object.keys(monthMap).sort((a, b) => b.localeCompare(a));

    const formatDateRange = (mondayStr) => formatCashCutWeekRangeLabel(mondayStr);

    const formatSunday = (dk) => {
      const d = new Date(dk + 'T12:00:00');
      return d.toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    };

    const formatDay = (dk) => {
      const d = new Date(dk + 'T12:00:00');
      return d.toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    };

    const formatMonth = (mk) => {
      const [y, m] = mk.split('-');
      const d = new Date(Number(y), Number(m) - 1, 1);
      return d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    };
    const getCommissionAmount = (gross, net) => {
      const c = (Number(gross) || 0) - (Number(net) || 0);
      return c > 0.0005 ? c : 0;
    };
    const getPaymentCommission = (payment) => {
      if (!payment || payment.method !== 'Tarjeta') return 0;
      const direct = Number(payment.commission || 0);
      if (direct > 0.0005) return direct;
      const gross = Number(payment.amount || 0);
      const net = Number(payment.netAmount ?? computeNetAmountByMethod(payment.amount, payment.method) ?? 0);
      return getCommissionAmount(gross, net);
    };

    const globalSlots = globalConfig?.serviceSlots || DEFAULT_SERVICE_SLOTS;
    const globalSched = globalConfig?.cashCutScheduleByLocation;

    const renderServiceBreakdownByLocation = (cut) => {
      const locations = cashCutLocations.length ? cashCutLocations : [];

      const pickPaymentsForDetail = (locFilter, svc) =>
        (cut.payments || [])
          .filter((p) => {
            if (locFilter != null && String(p._loc || '') !== String(locFilter)) return false;
            const ps = p.service || NO_SERVICE_LABEL;
            return ps === svc;
          })
          .sort((a, b) => (a._ts || 0) - (b._ts || 0));

      const pickPaymentsForLocDay = (locFilter) =>
        (cut.payments || [])
          .filter((p) => locFilter == null || String(p._loc || '') === String(locFilter))
          .sort((a, b) => (a._ts || 0) - (b._ts || 0));

      const openServiceDetailModal = (svc, locFilter, locLabel) => {
        setCashCutServiceDetailModal({
          title: locLabel ? `${svc} · ${locLabel}` : svc,
          payments: pickPaymentsForDetail(locFilter, svc),
          gross: cashCutGross,
        });
      };

      const openLocationDayDetailModal = (locFilter, locLabel) => {
        setCashCutServiceDetailModal({
          title: locLabel ? `Total del día · ${locLabel}` : 'Total del día',
          payments: pickPaymentsForLocDay(locFilter),
          gross: cashCutGross,
        });
      };

      const renderSedeDayTotalCard = (locFilter, locLabel) => {
        const agg = aggregateCashCutPaymentsForLoc(cut.payments, locFilter);
        const empty = agg.count === 0;
        const tarjetaDisplay = cashCutGross ? agg.tarjeta : Math.max(0, agg.totalNet - agg.efectivo);
        const u = uiCashCutSedeService;
        if (empty) {
          return (
            <button
              type="button"
              key="__day_total__"
              onClick={() => openLocationDayDetailModal(locFilter, locLabel)}
              className={u.cardDayTotalEmpty}
            >
              <p className={`${u.title} ${u.titleDayTotal}`}>Total del día</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 italic">Sin movimientos</p>
              <p className={u.foot}>Suma de todos los servicios</p>
              <p className={u.action}>Ver registros</p>
            </button>
          );
        }
        return (
          <button
            type="button"
            key="__day_total__"
            onClick={() => openLocationDayDetailModal(locFilter, locLabel)}
            className={u.cardDayTotal}
          >
            <p className={`${u.title} ${u.titleDayTotal}`}>Total del día</p>
            <p className={u.amountDayTotal}>{formatMoney(cashCutGross ? agg.total : agg.totalNet)}</p>
            {cashCutGross && getCommissionAmount(agg.total, agg.totalNet) > 0 && (
              <p className="text-[10px] font-bold text-rose-500 dark:text-rose-300 mt-0.5">
                Comisión: {formatMoney(getCommissionAmount(agg.total, agg.totalNet))}
              </p>
            )}
            <div className={u.stats}>
              <div className="flex justify-between gap-1">
                <span className="text-slate-500 dark:text-slate-400">Mov.</span>
                <span className="font-bold text-slate-700 dark:text-slate-200 tabular-nums">{agg.count}</span>
              </div>
              <div className="flex justify-between gap-1">
                <span className="text-emerald-600 dark:text-emerald-300">Efectivo</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 tabular-nums">{formatMoney(agg.efectivo)}</span>
              </div>
              <div className="flex justify-between gap-1">
                <span className="text-indigo-600 dark:text-indigo-300">Tarjeta</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 tabular-nums">{formatMoney(tarjetaDisplay)}</span>
              </div>
            </div>
            <p className={u.foot}>Suma de todos los servicios</p>
            <p className={u.action}>Ver registros</p>
          </button>
        );
      };

      const extraSvcKeys = Object.keys(cut.byService || {}).filter((s) => !SERVICE_OPTIONS.includes(s));

      const renderCashCutServiceCard = (svc, svcData, slotsForLoc, locFilter, locLabel, offSchedule = false) => {
        const slot = slotsForLoc?.[svc];
        const timeRange = offSchedule
          ? 'Registros fuera de servicios dominicales'
          : `${slot?.start || '—'} – ${slot?.end || '—'}`;
        const empty = !svcData || svcData.count === 0;
        const u = uiCashCutSedeService;
        const titleTone = offSchedule ? u.titleOffSchedule : empty ? u.titleMuted : u.titleService;
        const cardTone = empty ? u.cardEmpty : offSchedule ? u.cardOffSchedule : u.cardActive;
        if (empty) {
          return (
            <button
              type="button"
              key={svc}
              onClick={() => openServiceDetailModal(svc, locFilter, locLabel)}
              className={`${u.cardShell} ${cardTone}`}
            >
              <p className={`${u.title} ${titleTone}`}>{svc}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 italic">Sin movimientos</p>
              <p className={u.foot}>{timeRange}</p>
              <p className={u.action}>Ver registros</p>
            </button>
          );
        }
        return (
          <button
            type="button"
            key={svc}
            onClick={() => openServiceDetailModal(svc, locFilter, locLabel)}
            className={`${u.cardShell} ${cardTone}`}
          >
            <p className={`${u.title} ${titleTone}`}>{svc}</p>
            <p className={u.amount}>{formatMoney(cashCutGross ? svcData.total : svcData.totalNet)}</p>
            {cashCutGross && getCommissionAmount(svcData.total, svcData.totalNet) > 0 && (
              <p className="text-[10px] font-bold text-rose-500 dark:text-rose-300 mt-0.5">
                Comisión: {formatMoney(getCommissionAmount(svcData.total, svcData.totalNet))}
              </p>
            )}
            <div className={u.stats}>
              <div className="flex justify-between gap-1">
                <span className="text-slate-500 dark:text-slate-400">Mov.</span>
                <span className="font-bold text-slate-700 dark:text-slate-200 tabular-nums">{svcData.count}</span>
              </div>
              <div className="flex justify-between gap-1">
                <span className="text-emerald-600 dark:text-emerald-300">Efectivo</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 tabular-nums">{formatMoney(svcData.efectivo)}</span>
              </div>
              <div className="flex justify-between gap-1">
                <span className="text-indigo-600 dark:text-indigo-300">Tarjeta</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                  {formatMoney(cashCutGross ? svcData.tarjeta : svcData.totalNet - svcData.efectivo)}
                </span>
              </div>
            </div>
            <p className={u.foot}>{timeRange}</p>
            <p className={u.action}>Ver registros</p>
          </button>
        );
      };

      const renderCashCutSedeCardsRow = (colCount, cardNodes) => (
        <div className={uiCashCutSedeService.gridRow} style={cashCutSedeCardsGridStyle(colCount)}>
          {cardNodes}
        </div>
      );

      if (locations.length === 0) {
        const colCount = SERVICE_OPTIONS.length + extraSvcKeys.length + 1;
        return (
          <div className="mt-4">
            {renderCashCutSedeCardsRow(colCount, [
              ...SERVICE_OPTIONS.map((svc) =>
                renderCashCutServiceCard(svc, cut.byService[svc], globalSlots, null, 'Todas las sedes'),
              ),
              ...extraSvcKeys.map((svc) => {
                const agg = aggregateCashCutPaymentsForLocAndService(cut.payments, null, svc);
                return renderCashCutServiceCard(svc, agg.count > 0 ? agg : null, globalSlots, null, 'Todas las sedes', true);
              }),
              renderSedeDayTotalCard(null, 'Todas las sedes'),
            ])}
          </div>
        );
      }
      return (
        <div className="space-y-5 mt-4">
          {locations.map((loc) => {
            const cols = getCashCutServiceColumnsForLocation(currentEvent, loc, cut.payments, globalSlots, globalSched);
            const offScheduleKeys = getOffScheduleServiceKeysForLocation(cut.payments, loc);
            const locSlots = getCashCutScheduleForLocation(currentEvent, loc, globalSlots, globalSched);
            const colCount = cols.length + offScheduleKeys.length + 1;
            return (
              <div key={loc} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/40 p-3 sm:p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300 mb-2 sm:mb-3">Sede {loc}</p>
                {renderCashCutSedeCardsRow(colCount, [
                  ...cols.map((svc) => {
                    const agg = aggregateCashCutPaymentsForLocAndService(cut.payments, loc, svc);
                    return renderCashCutServiceCard(svc, agg.count > 0 ? agg : null, locSlots, loc, `Sede ${loc}`);
                  }),
                  ...offScheduleKeys.map((svc) => {
                    const agg = aggregateCashCutPaymentsForLocAndService(cut.payments, loc, svc);
                    return renderCashCutServiceCard(svc, agg, locSlots, loc, `Sede ${loc}`, true);
                  }),
                  renderSedeDayTotalCard(loc, `Sede ${loc}`),
                ])}
              </div>
            );
          })}
        </div>
      );
    };

    const renderCashCutPaymentsBlock = (payments, { showService = true, dateMode = 'time' } = {}) => {
      const sorted = [...payments].sort((a, b) => a._ts - b._ts);
      const formatWhen = (d) =>
        dateMode === 'datetime'
          ? `${d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })} ${d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`
          : d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
      return (
        <>
          <div className={`${uiCashCutSedeService.paymentsList} md:hidden`}>
            {sorted.map((p, i) => (
              <div key={`${p.id}-m-${i}`} className={uiCashCutSedeService.paymentsListItem}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate min-w-0 flex-1">
                    {p._personName}
                  </p>
                  <p className="text-[11px] font-black text-slate-800 dark:text-slate-100 tabular-nums shrink-0 text-right">
                    {formatMoney(cashCutGross ? p.amount : (p.netAmount ?? p.amount))}
                    {cashCutGross && p.method === 'Tarjeta' && getPaymentCommission(p) > 0 ? (
                      <span className="block text-[9px] font-semibold text-rose-500">
                        Com.: {formatMoney(getPaymentCommission(p))}
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1 mt-0.5">
                  <span className="text-[9px] font-mono text-slate-500">{formatWhen(p._date)}</span>
                  <span className="text-slate-300">·</span>
                  <span className="text-[9px] text-slate-500">{p._loc}</span>
                  {showService ? (
                    <span className="text-[9px] font-bold bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-100">
                      {p.service || NO_SERVICE_LABEL}
                    </span>
                  ) : null}
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                      p.method === 'Tarjeta'
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    }`}
                  >
                    {p.method || 'Efectivo'}
                  </span>
                </div>
                <p className="text-[9px] text-slate-400 mt-0.5">Registró: {p.registeredBy || '?'}</p>
              </div>
            ))}
          </div>
          <div className="hidden md:block mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-black border-b border-slate-100">
                  <th className="px-4 py-2.5">{dateMode === 'datetime' ? 'Fecha / Hora' : 'Hora'}</th>
                  <th className="px-4 py-2.5">Persona</th>
                  <th className="px-4 py-2.5">Sede</th>
                  {showService ? <th className="px-4 py-2.5">Servicio</th> : null}
                  <th className="px-4 py-2.5">Método</th>
                  <th className="px-4 py-2.5 text-right">{cashCutGross ? 'Bruto' : 'Neto'}</th>
                  <th className="px-4 py-2.5">Registró</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sorted.map((p, i) => (
                  <tr key={`${p.id}-${i}`} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-2 text-xs font-mono text-slate-600">{formatWhen(p._date)}</td>
                    <td className="px-4 py-2 text-xs font-bold text-slate-700 truncate max-w-[150px]">{p._personName}</td>
                    <td className="px-4 py-2 text-xs text-slate-500">{p._loc}</td>
                    {showService ? (
                      <td className="px-4 py-2">
                        <span className="text-[10px] font-bold bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-100">
                          {p.service || NO_SERVICE_LABEL}
                        </span>
                      </td>
                    ) : null}
                    <td className="px-4 py-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          p.method === 'Tarjeta'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        }`}
                      >
                        {p.method || 'Efectivo'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-bold text-slate-800">
                      {formatMoney(cashCutGross ? p.amount : (p.netAmount ?? p.amount))}
                      {cashCutGross && p.method === 'Tarjeta' && getPaymentCommission(p) > 0 ? (
                        <span className="block text-[10px] font-semibold text-rose-500">
                          Com.: {formatMoney(getPaymentCommission(p))}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-500">{p.registeredBy || '?'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      );
    };

    const cashCutHorariosLine = (() => {
      const locs = cashCutLocations;
      if (!locs.length) {
        return SERVICE_OPTIONS.map((s) => `${s} ${globalSlots[s]?.start || '—'}–${globalSlots[s]?.end || '—'}`).join(' · ');
      }
      return locs
        .map((loc) => {
          const svcs = getCashCutServicesForLocation(currentEvent, loc, globalSlots, globalSched);
          const slots = getCashCutScheduleForLocation(currentEvent, loc, globalSlots, globalSched);
          const part = svcs.map((s) => `${s} ${slots[s]?.start || '—'}–${slots[s]?.end || '—'}`).join(' · ');
          return `${loc}: ${part}`;
        })
        .join(' | ');
    })();

    return (
      <>
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <Scissors size={24} className="text-green-600" /> Corte de Caja
            </h2>
            <p className="text-sm text-slate-500 mt-1">Resumen de ingresos por periodo · {currentEvent?.name}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setCashCutGross(prev => !prev)}
              className={getCommissionToggleBtnClasses(cashCutGross)}
            >
              <Wallet size={14} /> {getCommissionToggleLabel(cashCutGross)}
            </button>
            {hasAdminRights && (
              <button
                type="button"
                onClick={openCashCutScheduleModal}
                className={`px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-100 rounded-xl font-bold text-xs flex items-center gap-2 dark:border-indigo-700 dark:bg-indigo-600 dark:text-white dark:hover:bg-indigo-700 shadow-sm ${QUICK_ACTION_DARK_INTERACTION}`}
              >
                <Settings2 size={14} /> Horarios por sede
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-1 flex dark:bg-slate-900 dark:border-slate-600">
            {[
              { key: 'daily', label: 'Diario' },
              { key: 'sunday', label: 'Domingos' },
              { key: 'weekly', label: 'Semanal' },
              { key: 'monthly', label: 'Mensual' },
            ].map(m => (
              <button
                key={m.key}
                onClick={() => { setCashCutMode(m.key); setCashCutSelected('all'); setExpandedCut(null); }}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors border border-transparent ${cashCutMode === m.key ? `bg-green-600 text-white shadow-sm dark:border-emerald-700 dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-700 dark:shadow-sm ${QUICK_ACTION_DARK_INTERACTION}` : `text-slate-600 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 ${QUICK_ACTION_DARK_INTERACTION}`}`}
              >
                {m.label}
              </button>
            ))}
          </div>
          {cashCutMode === 'daily' && dayKeys.length > 0 && (
            <select value={cashCutSelected} onChange={e => { setCashCutSelected(e.target.value); setExpandedCut(null); }} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:focus:ring-emerald-500">
              <option value="all">Todos los días</option>
              {dayKeys.map(dk => <option key={dk} value={dk}>{formatDay(dk)}</option>)}
            </select>
          )}
          {cashCutMode === 'sunday' && sundayKeys.length > 0 && (
            <select value={cashCutSelected} onChange={e => { setCashCutSelected(e.target.value); setExpandedCut(null); }} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:focus:ring-emerald-500">
              <option value="all">Todos los domingos</option>
              {sundayKeys.map(dk => <option key={dk} value={dk}>{formatSunday(dk)}</option>)}
            </select>
          )}
          {cashCutMode === 'weekly' && weekKeys.length > 0 && (
            <select value={cashCutSelected} onChange={e => { setCashCutSelected(e.target.value); setExpandedCut(null); }} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:focus:ring-emerald-500">
              <option value="all">Todas las semanas</option>
              {weekKeys.map(wk => <option key={wk} value={wk}>{formatDateRange(wk)}</option>)}
            </select>
          )}
          {cashCutMode === 'monthly' && monthKeys.length > 0 && (
            <select value={cashCutSelected} onChange={e => { setCashCutSelected(e.target.value); setExpandedCut(null); }} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:focus:ring-emerald-500">
              <option value="all">Todos los meses</option>
              {monthKeys.map(mk => <option key={mk} value={mk} className="capitalize">{formatMonth(mk)}</option>)}
            </select>
          )}
          {cashCutMode === 'sunday' && (
            <div className="text-xs text-slate-400 dark:text-slate-300 font-bold max-w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-2">
              <span className="text-slate-500 dark:text-slate-200">Horarios por sede:</span>{' '}
              <span className="break-words dark:text-slate-100">{cashCutHorariosLine}</span>
            </div>
          )}
        </div>

        {cashCutMode === 'sunday' && (
          <div className="space-y-4">
            {sundayKeys.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center">
                <p className="text-slate-400 text-sm italic">No hay pagos registrados en domingo.</p>
              </div>
            ) : sundayKeys.filter(dk => cashCutSelected === 'all' || dk === cashCutSelected).map(dk => {
              const cut = sundayMap[dk];
              const isExpanded = cashCutSelected !== 'all' || expandedCut === `sun-${dk}`;
              return (
                <div key={dk} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedCut(isExpanded ? null : `sun-${dk}`)}
                    className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-green-100 p-2.5 rounded-xl text-green-600"><Calendar size={20} /></div>
                      <div>
                        <p className="font-black text-slate-800 capitalize">{formatSunday(dk)}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{cut.count} movimiento{cut.count !== 1 ? 's' : ''}{cut.donations > 0 ? ` + donaciones $${cut.donations.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-black text-green-600">{formatMoney(cashCutGross ? cut.total : cut.totalNet)}</p>
                        <p className="text-[10px] text-slate-400 font-bold">Efectivo: {formatMoney(cut.efectivo)} · Tarjeta: {formatMoney(cashCutGross ? cut.tarjeta : (cut.totalNet - cut.efectivo - cut.donations))}{cashCutGross && getCommissionAmount(cut.tarjeta, (cut.totalNet - cut.efectivo - cut.donations)) > 0 ? ` · Com.: ${formatMoney(getCommissionAmount(cut.tarjeta, (cut.totalNet - cut.efectivo - cut.donations)))}` : ''}</p>
                      </div>
                      {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-slate-100">
                      {renderServiceBreakdownByLocation(cut)}
                      {renderCashCutPaymentsBlock(cut.payments, { showService: true })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {cashCutMode === 'weekly' && (
          <div className="space-y-4">
            {weekKeys.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center">
                <p className="text-slate-400 text-sm italic">No hay pagos registrados.</p>
              </div>
            ) : weekKeys.filter(wk => cashCutSelected === 'all' || wk === cashCutSelected).map(wk => {
              const cut = weekMap[wk];
              const isExpanded = cashCutSelected !== 'all' || expandedCut === `wk-${wk}`;
              return (
                <div key={wk} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedCut(isExpanded ? null : `wk-${wk}`)}
                    className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-indigo-100 p-2.5 rounded-xl text-indigo-600"><CalendarRange size={20} /></div>
                      <div>
                        <p className="font-black text-slate-800">{formatDateRange(wk)}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{cut.count} movimiento{cut.count !== 1 ? 's' : ''}{cut.donations > 0 ? ` + donaciones $${cut.donations.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-black text-green-600">{formatMoney(cashCutGross ? cut.total : cut.totalNet)}</p>
                        <p className="text-[10px] text-slate-400 font-bold">Efectivo: {formatMoney(cut.efectivo)} · Tarjeta: {formatMoney(cashCutGross ? cut.tarjeta : (cut.totalNet - cut.efectivo - cut.donations))}{cashCutGross && getCommissionAmount(cut.tarjeta, (cut.totalNet - cut.efectivo - cut.donations)) > 0 ? ` · Com.: ${formatMoney(getCommissionAmount(cut.tarjeta, (cut.totalNet - cut.efectivo - cut.donations)))}` : ''}</p>
                      </div>
                      {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-slate-100">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                        <div className={uiCashCutToneCard('slate')}>
                          <p className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-wider">{cashCutGross ? 'Bruto' : 'Neto'}</p>
                          <p className="text-lg font-black text-slate-800 dark:text-slate-100">{formatMoney(cashCutGross ? cut.total : cut.totalNet)}</p>
                          {cashCutGross && getCommissionAmount(cut.total, cut.totalNet) > 0 && (
                            <p className="text-[10px] font-bold text-rose-500 dark:text-rose-300 mt-0.5">Comisión: {formatMoney(getCommissionAmount(cut.total, cut.totalNet))}</p>
                          )}
                        </div>
                        <div className={uiCashCutToneCard('rose')}>
                          <p className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-wider">Comisión tarjeta</p>
                          <p className="text-lg font-black text-red-500 dark:text-rose-300">{getCommissionAmount(cut.total, cut.totalNet) > 0 ? `-${formatMoney(getCommissionAmount(cut.total, cut.totalNet))}` : formatMoney(0)}</p>
                        </div>
                        <div className={uiCashCutToneCard('emerald')}>
                          <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Efectivo</p>
                          <p className="text-lg font-black text-slate-800 dark:text-slate-100">{formatMoney(cut.efectivo)}</p>
                        </div>
                        <div className={uiCashCutToneCard('indigo')}>
                          <p className="text-[10px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">Tarjeta {cashCutGross ? '(Bruto)' : '(Neto)'}</p>
                          <p className="text-lg font-black text-slate-800 dark:text-slate-100">{formatMoney(cashCutGross ? cut.tarjeta : (cut.totalNet - cut.efectivo - cut.donations))}</p>
                          {cashCutGross && getCommissionAmount(cut.tarjeta, (cut.totalNet - cut.efectivo - cut.donations)) > 0 && (
                            <p className="text-[10px] font-bold text-rose-500 dark:text-rose-300 mt-0.5">Comisión: {formatMoney(getCommissionAmount(cut.tarjeta, (cut.totalNet - cut.efectivo - cut.donations)))}</p>
                          )}
                        </div>
                      </div>
                      {cut.donations > 0 && (
                        <div className="mt-3 rounded-xl border border-green-100 bg-green-50/50 p-3 inline-block">
                          <p className="text-[10px] font-black text-green-700 uppercase tracking-wider">Donaciones</p>
                          <p className="text-lg font-black text-slate-800">{formatMoney(cut.donations)}</p>
                        </div>
                      )}
                      {renderCashCutPaymentsBlock(cut.payments, { showService: false, dateMode: 'datetime' })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {cashCutMode === 'daily' && (
          <div className="space-y-4">
            {dayKeys.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center">
                <p className="text-slate-400 text-sm italic">No hay pagos registrados.</p>
              </div>
            ) : dayKeys.filter(dk => cashCutSelected === 'all' || dk === cashCutSelected).map(dk => {
              const cut = dayMap[dk];
              const isExpanded = cashCutSelected !== 'all' || expandedCut === `day-${dk}`;
              return (
                <div key={dk} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <button type="button" onClick={() => setExpandedCut(isExpanded && cashCutSelected === 'all' ? null : `day-${dk}`)} className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`p-2.5 rounded-xl ${cut.isSunday ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-600'}`}><Calendar size={20} /></div>
                      <div>
                        <p className="font-black text-slate-800 capitalize">{formatDay(dk)}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{cut.count} movimiento{cut.count !== 1 ? 's' : ''}{cut.donations > 0 ? ` + donaciones $${cut.donations.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}{cut.isSunday ? ' · Domingo' : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-black text-green-600">{formatMoney(cashCutGross ? cut.total : cut.totalNet)}</p>
                        <p className="text-[10px] text-slate-400 font-bold">Efectivo: {formatMoney(cut.efectivo)} · Tarjeta: {formatMoney(cashCutGross ? cut.tarjeta : (cut.totalNet - cut.efectivo - cut.donations))}{cashCutGross && getCommissionAmount(cut.tarjeta, (cut.totalNet - cut.efectivo - cut.donations)) > 0 ? ` · Com.: ${formatMoney(getCommissionAmount(cut.tarjeta, (cut.totalNet - cut.efectivo - cut.donations)))}` : ''}</p>
                      </div>
                      {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-slate-100">
                      {cut.isSunday && Object.keys(cut.byService).length > 0 && (
                        <div className="mb-4">{renderServiceBreakdownByLocation(cut)}</div>
                      )}
                      {renderCashCutPaymentsBlock(cut.payments, { showService: cut.isSunday })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {cashCutMode === 'monthly' && (
          <div className="space-y-4">
            {monthKeys.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center">
                <p className="text-slate-400 text-sm italic">No hay pagos registrados.</p>
              </div>
            ) : monthKeys.filter(mk => cashCutSelected === 'all' || mk === cashCutSelected).map(mk => {
              const cut = monthMap[mk];
              const isExpanded = cashCutSelected !== 'all' || expandedCut === `mon-${mk}`;
              return (
                <div key={mk} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <button type="button" onClick={() => setExpandedCut(isExpanded && cashCutSelected === 'all' ? null : `mon-${mk}`)} className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="bg-purple-100 p-2.5 rounded-xl text-purple-600"><CalendarRange size={20} /></div>
                      <div>
                        <p className="font-black text-slate-800 capitalize">{formatMonth(mk)}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{cut.count} movimiento{cut.count !== 1 ? 's' : ''}{cut.donations > 0 ? ` + donaciones $${cut.donations.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-black text-green-600">{formatMoney(cashCutGross ? cut.total : cut.totalNet)}</p>
                        <p className="text-[10px] text-slate-400 font-bold">Efectivo: {formatMoney(cut.efectivo)} · Tarjeta: {formatMoney(cashCutGross ? cut.tarjeta : (cut.totalNet - cut.efectivo - cut.donations))}{cashCutGross && getCommissionAmount(cut.tarjeta, (cut.totalNet - cut.efectivo - cut.donations)) > 0 ? ` · Com.: ${formatMoney(getCommissionAmount(cut.tarjeta, (cut.totalNet - cut.efectivo - cut.donations)))}` : ''}</p>
                      </div>
                      {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-slate-100">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                        <div className={uiCashCutToneCard('slate')}>
                          <p className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-wider">{cashCutGross ? 'Bruto' : 'Neto'}</p>
                          <p className="text-lg font-black text-slate-800 dark:text-slate-100">{formatMoney(cashCutGross ? cut.total : cut.totalNet)}</p>
                          {cashCutGross && getCommissionAmount(cut.total, cut.totalNet) > 0 && (
                            <p className="text-[10px] font-bold text-rose-500 dark:text-rose-300 mt-0.5">Comisión: {formatMoney(getCommissionAmount(cut.total, cut.totalNet))}</p>
                          )}
                        </div>
                        <div className={uiCashCutToneCard('rose')}>
                          <p className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-wider">Comisión tarjeta</p>
                          <p className="text-lg font-black text-red-500 dark:text-rose-300">{getCommissionAmount(cut.total, cut.totalNet) > 0 ? `-${formatMoney(getCommissionAmount(cut.total, cut.totalNet))}` : formatMoney(0)}</p>
                        </div>
                        <div className={uiCashCutToneCard('emerald')}>
                          <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Efectivo</p>
                          <p className="text-lg font-black text-slate-800 dark:text-slate-100">{formatMoney(cut.efectivo)}</p>
                        </div>
                        <div className={uiCashCutToneCard('indigo')}>
                          <p className="text-[10px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">Tarjeta {cashCutGross ? '(Bruto)' : '(Neto)'}</p>
                          <p className="text-lg font-black text-slate-800 dark:text-slate-100">{formatMoney(cashCutGross ? cut.tarjeta : (cut.totalNet - cut.efectivo - cut.donations))}</p>
                          {cashCutGross && getCommissionAmount(cut.tarjeta, (cut.totalNet - cut.efectivo - cut.donations)) > 0 && (
                            <p className="text-[10px] font-bold text-rose-500 dark:text-rose-300 mt-0.5">Comisión: {formatMoney(getCommissionAmount(cut.tarjeta, (cut.totalNet - cut.efectivo - cut.donations)))}</p>
                          )}
                        </div>
                      </div>
                      {cut.donations > 0 && (
                        <div className="mt-3 rounded-xl border border-green-100 bg-green-50/50 p-3 inline-block">
                          <p className="text-[10px] font-black text-green-700 uppercase tracking-wider">Donaciones</p>
                          <p className="text-lg font-black text-slate-800">{formatMoney(cut.donations)}</p>
                        </div>
                      )}
                      {renderCashCutPaymentsBlock(cut.payments, { showService: false, dateMode: 'datetime' })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {(() => {
          const efectivoPayments = allPayments.filter(p => p.method !== 'Tarjeta');
          const tarjetaPayments = allPayments.filter(p => p.method === 'Tarjeta');
          const totalBruto = allPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0) + eventDonationsForCut.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
          const totalNeto = allPayments.reduce((s, p) => s + computeNetAmountByMethod(p.amount, p.method), 0) + eventDonationsForCut.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
          const efectivoBruto = efectivoPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
          const tarjetaBruto = tarjetaPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
          const tarjetaNeto = tarjetaPayments.reduce((s, p) => s + computeNetAmountByMethod(p.amount, p.method), 0);
          const totalComision = tarjetaPayments.reduce((s, p) => s + (parseFloat(p.commission) || 0), 0);
          const activeList = cashCutTotalsView === 'all' ? allPayments
            : cashCutTotalsView === 'efectivo' ? efectivoPayments
            : cashCutTotalsView === 'tarjeta' ? tarjetaPayments : null;
          return (
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm dark:border-slate-700">
              <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
                <DollarSign size={16} className="text-green-600 dark:text-emerald-400" /> Totales Acumulados
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  type="button"
                  onClick={() => setCashCutTotalsView(cashCutTotalsView === 'all' ? null : 'all')}
                  className={`rounded-xl border p-4 text-left transition-colors shadow-sm ${QUICK_ACTION_DARK_INTERACTION} ${cashCutTotalsView === 'all' ? 'border-slate-400 bg-slate-100 ring-2 ring-slate-300 dark:border-violet-700 dark:bg-violet-600 dark:ring-violet-400 dark:text-white' : 'border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-violet-600 dark:bg-violet-600 dark:text-white dark:hover:bg-violet-700 dark:hover:border-violet-600'}`}
                >
                  <p className="text-[10px] font-black text-slate-500 dark:text-white uppercase tracking-wider">Total Movimientos</p>
                  <p className="text-2xl font-black text-slate-800 dark:text-white">{allPayments.length}</p>
                  <p className="text-[10px] text-slate-400 dark:text-violet-100 font-bold mt-1">{cashCutGross ? formatMoney(totalBruto) : formatMoney(totalNeto)} ? Click para ver</p>
                </button>
                <div className={`rounded-xl border border-green-200 bg-green-50 p-4 shadow-sm dark:border-emerald-700 dark:bg-emerald-600 ${QUICK_ACTION_DARK_INTERACTION}`}>
                  <p className="text-[10px] font-black text-green-700 dark:text-white uppercase tracking-wider">{cashCutGross ? 'Total Bruto' : 'Total Neto'}</p>
                  <p className="text-2xl font-black text-slate-800 dark:text-white">{cashCutGross ? formatMoney(totalBruto) : formatMoney(totalNeto)}</p>
                  {cashCutGross && totalComision > 0 && (
                    <p className="text-[10px] text-slate-400 dark:text-emerald-100 font-bold mt-1">Comisión tarjeta: {formatMoney(totalComision)}</p>
                  )}
                  {!cashCutGross && totalComision > 0 && (
                    <p className="text-[10px] text-slate-400 dark:text-emerald-100 font-bold mt-1">Comisión tarjeta: -{formatMoney(totalComision)}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setCashCutTotalsView(cashCutTotalsView === 'efectivo' ? null : 'efectivo')}
                  className={`rounded-xl border p-4 text-left transition-colors shadow-sm ${QUICK_ACTION_DARK_INTERACTION} ${cashCutTotalsView === 'efectivo' ? 'border-emerald-400 bg-emerald-100 ring-2 ring-emerald-300 dark:border-emerald-700 dark:bg-emerald-600 dark:ring-emerald-400' : 'border-emerald-200 bg-emerald-50 hover:border-emerald-300 dark:border-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700'}`}
                >
                  <p className="text-[10px] font-black text-emerald-700 dark:text-white uppercase tracking-wider">Total Efectivo</p>
                  <p className="text-2xl font-black text-slate-800 dark:text-white">{formatMoney(efectivoBruto)}</p>
                  <p className="text-[10px] text-slate-400 dark:text-emerald-100 font-bold mt-1">{efectivoPayments.length} movimiento{efectivoPayments.length !== 1 ? 's' : ''}</p>
                </button>
                <button
                  type="button"
                  onClick={() => setCashCutTotalsView(cashCutTotalsView === 'tarjeta' ? null : 'tarjeta')}
                  className={`rounded-xl border p-4 text-left transition-colors shadow-sm ${QUICK_ACTION_DARK_INTERACTION} ${cashCutTotalsView === 'tarjeta' ? 'border-indigo-400 bg-indigo-100 ring-2 ring-indigo-300 dark:border-indigo-700 dark:bg-indigo-600 dark:ring-indigo-400' : 'border-indigo-200 bg-indigo-50 hover:border-indigo-300 dark:border-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700'}`}
                >
                  <p className="text-[10px] font-black text-indigo-700 dark:text-white uppercase tracking-wider">Total Tarjeta {cashCutGross ? '(Bruto)' : '(Neto)'}</p>
                  <p className="text-2xl font-black text-slate-800 dark:text-white">{cashCutGross ? formatMoney(tarjetaBruto) : formatMoney(tarjetaNeto)}</p>
                  {cashCutGross && totalComision > 0 && (
                    <p className="text-[10px] text-slate-400 dark:text-indigo-100 font-bold mt-1">Comisión: {formatMoney(totalComision)}</p>
                  )}
                  <p className="text-[10px] text-slate-400 dark:text-indigo-100 font-bold mt-1">
                    {tarjetaPayments.length} movimiento{tarjetaPayments.length !== 1 ? 's' : ''}
                    {!cashCutGross && totalComision > 0 ? ` ? -${formatMoney(totalComision)} comisión` : ''}
                  </p>
                </button>
              </div>
              {activeList && (
                <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-black border-b border-slate-100">
                        <th className="px-4 py-2.5">Fecha / Hora</th>
                        <th className="px-4 py-2.5">Persona</th>
                        <th className="px-4 py-2.5">Sede</th>
                        <th className="px-4 py-2.5">Método</th>
                        <th className="px-4 py-2.5 text-right">{cashCutGross ? 'Bruto' : 'Neto'}</th>
                        {!cashCutGross && cashCutTotalsView === 'tarjeta' && <th className="px-4 py-2.5 text-right">Comisión</th>}
                        <th className="px-4 py-2.5">Registró</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {activeList.sort((a, b) => a._ts - b._ts).map((p, i) => (
                        <tr key={`tot-${p.id}-${i}`} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-2 text-xs font-mono text-slate-600">{p._date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })} {p._date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="px-4 py-2 text-xs font-bold text-slate-700 truncate max-w-[150px]">{p._personName}</td>
                          <td className="px-4 py-2 text-xs text-slate-500">{p._loc}</td>
                          <td className="px-4 py-2"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${p.method === 'Tarjeta' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>{p.method || 'Efectivo'}</span></td>
                          <td className="px-4 py-2 text-right font-bold text-slate-800">
                            {cashCutGross ? formatMoney(p.amount) : formatMoney(p.netAmount ?? p.amount)}
                            {cashCutGross && p.method === 'Tarjeta' && getPaymentCommission(p) > 0 ? (
                              <span className="block text-[10px] font-semibold text-rose-500">Com.: {formatMoney(getPaymentCommission(p))}</span>
                            ) : null}
                          </td>
                          {!cashCutGross && cashCutTotalsView === 'tarjeta' && <td className="px-4 py-2 text-right text-xs text-red-500 font-bold">{p.commission ? `-${formatMoney(p.commission)}` : '?'}</td>}
                          <td className="px-4 py-2 text-xs text-slate-500">{p.registeredBy || '?'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {cashCutServiceDetailModal && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cash-cut-service-detail-title"
          onClick={() => setCashCutServiceDetailModal(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-600 max-w-3xl w-full max-h-[min(85vh,720px)] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
              <h3 id="cash-cut-service-detail-title" className="text-lg font-black text-slate-800 dark:text-slate-100 pr-2">
                {cashCutServiceDetailModal.title}
              </h3>
              <button
                type="button"
                onClick={() => setCashCutServiceDetailModal(null)}
                className="p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 shrink-0"
                aria-label="Cerrar"
              >
                <XCircle size={22} />
              </button>
            </div>
            <div className="px-0 py-2 flex-1 min-h-0 overflow-y-auto">
              {cashCutServiceDetailModal.payments.length === 0 ? (
                <p className="text-sm text-slate-500 px-5 py-6">No hay movimientos en este periodo para este filtro.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-[1] border-b border-slate-100 dark:border-slate-700">
                      <tr>
                        <th className="text-left px-4 py-2.5">Fecha / hora</th>
                        <th className="text-left px-4 py-2.5">Participante</th>
                        <th className="text-left px-4 py-2.5">Sede</th>
                        <th className="text-left px-4 py-2.5">Método</th>
                        <th className="text-right px-4 py-2.5">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cashCutServiceDetailModal.payments.map((p, i) => (
                        <tr key={`${p.id ?? p._ts}-${i}`} className="border-b border-slate-50 dark:border-slate-800">
                          <td className="px-4 py-2 text-xs text-slate-600 whitespace-nowrap">
                            {p._date
                              ? `${p._date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })} ${p._date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`
                              : '—'}
                          </td>
                          <td className="px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 max-w-[200px] truncate">{p._personName || '—'}</td>
                          <td className="px-4 py-2 text-xs text-slate-500">{p._loc || '—'}</td>
                          <td className="px-4 py-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${p.method === 'Tarjeta' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                              {p.method || 'Efectivo'}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right font-bold text-slate-800 dark:text-slate-100">
                            {cashCutServiceDetailModal.gross ? formatMoney(p.amount) : formatMoney(p.netAmount ?? p.amount)}
                            {cashCutServiceDetailModal.gross && p.method === 'Tarjeta' && getPaymentCommission(p) > 0 ? (
                              <span className="block text-[10px] font-semibold text-rose-500">Com.: {formatMoney(getPaymentCommission(p))}</span>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </>
    );
}

export default React.memo(CashCutPageContent);
