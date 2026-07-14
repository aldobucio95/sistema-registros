import React, { useCallback } from 'react';
import { SUMMARY_TABLE_COLUMN_LABELS, SUMMARY_TABLE_MONEY_KEYS, defaultViewPrefs, getSummaryTableColumnDefaultsForEventType, getSummaryTableColumnKeysForEventType } from '../../app/helpers/dashboardSummaryTableConfig.js';
import { discountCampaignHasDateRange, isDiscountCampaignVigenteOnDate } from '../../app/helpers/discountCampaignHelpers.js';
import { summarizeBautizosFlatRoster } from '../../bautizos/bautizosCounts.js';
import { buildBautizosLocationTableStats } from '../../bautizos/bautizosDashboardFlatStats.js';
import { flatRowMatchesBautizosDashboardScope } from '../../bautizos/bautizosAttendance.js';
import { BAUTIZOS_ATTENDANCE, BAUTIZOS_DASHBOARD_SCOPE_OPTIONS, bautizosDashboardCompanionCountsForScope, bautizosDashboardFilterCanonicalCompanions, bautizosDashboardFilterTitularRows, bautizosDashboardIncludeRegistrationFinancials, bautizosDashboardScopeUsesSplitPayments, bautizosDashboardTitularCountsForScope, bautizosLineGoesByCar, bautizosParticipatesAsServer, buildActiveRegistrantMetaForCompanionDedupe, buildBautizadoMetaForCanonical, buildBautizosCanonicalCompanionPlan, collectBautizosParticipatingServerRows, countBautizosDashboardPeople, getBautizosCompanionsArray, getBautizosDashboardScopeChartHint, getBautizosDashboardScopeLabel, isBautizosCompanionBaptized, isBautizosLapInfantCompanion, normalizeArrivalCarCount, normalizeBautizosAttendanceType, normalizeBautizosDashboardScope, participantHasBaptismChip, resolveBautizosDashboardGlobalScope } from '../../bautizosParty.js';
import { describeCampaSpouseCluster } from '../../campaFamilyCollision.js';
import { enrichPaymentHistoryWithRefundDisbursements, getCancelledRefundPendingAmount, getParticipantEffectivePaidNet, getParticipantNetPaidFromHistory, getParticipantOutstandingGross, getParticipantPhysicalRecaudadoGross, getParticipantPhysicalRecaudadoNet } from '../../cashCutRefunds.js';
import { describeCollisionCluster, describeCollisionReasons } from '../../companionRegistrantCollision.js';
import { computeCapRemaining, formatCapRemainingDisplay, resolveConfiguredCapLimit, resolveCupoLimitMode, resolveSedeCapStatus } from '../../cupoVsWaitlistDisplay.js';
import { donationAddsToRecaudacionBalance } from '../../donationHelpers.js';
import { compareIsoDates, formatCampaSegmentDateLines, formatEventDateRangeLabel, getEventEffectiveEndDate, isEventSingleDay } from '../../eventDateHelpers.js';
import { isPastorParticipant, sumPastorRealCostForParticipants } from '../../pastorAttendance.js';
import { DEFAULT_BAUTIZOS_LIST_PRICE_FOOD, DEFAULT_BAUTIZOS_LIST_PRICE_TRANSPORT, allocateBautizosDashboardPayments, getBautizosListPriceBreakdown, normalizeServerTierCosts, tierHasServerPricesInCamperTier } from '../../publicRegistrationLogic.js';
import { mergeEditorRegistrationFieldVisibility } from '../../registrationFormEditorConfig.js';
import { BLOOD_TYPES_ABO_RH, BLOOD_TYPE_UNSPECIFIED } from '../../registrationFormShared.js';
import { DEFAULT_RESPONSIVA_BODY, DEFAULT_RESPONSIVA_BODY_ADULT, isResponsivaDigitalAdultsBranchEnabled, isResponsivaDigitalMinorsBranchEnabled, isResponsivaEnabledForEvent, isResponsivaGeneralAdultsBranchEnabled, isResponsivaGeneralMinorsBranchEnabled } from '../../responsivaSignLogic.js';
import { uiBanner, uiButtons, uiDashboard, uiDropdown, uiFilter, uiMobileMenu, uiModal, uiTextarea } from '../../ui/uiFormatClasses.js';
import { computeWaitlistCountsForEvent } from '../../waitlistDashboardCounts.js';
import { Activity, AlertTriangle, Briefcase, Bus, Calendar, CalendarRange, CheckCircle2, ChevronDown, ChevronUp, Church, ClipboardList, CreditCard, DollarSign, Droplets, FileText, Filter, Gift, GraduationCap, Link2, ListPlus, MapPin, PieChart, QrCode, Receipt, Scale, Scissors, Settings2, ShieldAlert, SlidersHorizontal, TableProperties, Trash2, UserCircle, UserPlus, Users, Wallet, X, XCircle } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useWorkspaceShell } from '../../screens/eventWorkspace/WorkspaceShellContext.jsx';

function DashboardSummaryPageContent() {
  const {
    ATTENDANCE_SPECIAL,
    BLOOD_BAR_BG_CLASSES,
    canonicalizeVnpPersonId,
    includeCortesiaInRealCost,
    includeEmpleadoInRealCost,
    countAmbosDoubleInAllCounts,
    BLOOD_TYPE_OTHER_KEY,
    DASHBOARD_COMMISSION_VIEW_HELP,
    DASHBOARD_COMMISSION_VIEW_TITLE,
    DASH_TOP_BTN,
    DASH_TOP_BTN_NEUTRAL,
    PARTICIPANT_STATUS_CANCELLED,
    ProgressBar,
    REGISTRY_CONFIRM_BAUTIZOS_EMPTY,
    StatCard,
    activeSummaryDashboardFilterCount,
    addLog,
        allParticipants,
        applySummaryLikeFilters,
        buildLocationChartColorMap,
        campaAttendanceScopeMatches,
    campaFamilyCollisionsInEvent,
    canArchiveRegistrationsFlag,
    canCancelRegistrationsFlag,
    canSeeMoney,
    cancelEntry,
    cancelledData,
    cardCommissionPctDraft,
        companionCollisionsActionable,
        computeNetAmountByMethod,
            cupoSedeOpen,
    currentEvent,
    currentPricing,
    currentUser,
    dashBautizosScopeBarMobileOpen,
    dashPaymentDeadlineDate,
    dashboardHasFullLocationAccess,
    dashboardLocations,
    data,
        digitsOnlyPhone,        donations,
        duplicatesInEvent,
    editorRegistrationFieldVis,
    eventCapUsedUnitsBySede,
    eventDateDraft,
        eventResponsivaDigitalAdultsDraft,
    eventResponsivaDigitalEnabledDraft,
    eventResponsivaDigitalMinorsDraft,
    eventResponsivaEnabledDraft,
    eventResponsivaGeneralAdultsDraft,
    eventResponsivaGeneralMinorsDraft,
    eventResponsivaTextAdultsDraft,
    eventResponsivaTextMinorsDraft,
    eventResponsivaTextSaving,
        events,
    expandedDupGroups,
    expandedDupPersons,
    fieldStack,
    filterPaymentMethod,
    formatMoney,
    getCommissionToggleCompactBtnClasses,
    getDashboardCardCommissionToggleLabel,
    getDashboardSummaryForCampaScope,
    getEventCapUsedUnits,
    getLiquidationTarget,
    getScholarshipCondonedAmount,
    handleAssignParticipantLocation,
    handleSaveCardCommissionRate,
    handleSaveEventDates,
    handleSaveEventResponsivaDigitalText,
    hasAdminRights,
    hasFinancialAccess,
            isBautizos,
    isCampa,
    isDesayunoEvent,
    isFreeAttendanceType,
    isGeneral,
    isMobileMenuOpen,
    isSiValue,    mergeEventDonationsForEvent,
            normalizeAttendanceSpecial,
    openPricingModal,    participantCountsAsRealCostX2,
    participantIsActiveInRoster,
    participantIsCancelled,
    participantIsWaitlistRow,
    participantMatchesBautizosDashboardPartyScope,
    participantsLocationIntegrity,
    patchCampaRealCostCountOptions,
                    registryConfirmBusy,
    removeEntry,
    renderRegistrationParticipantColumn,
    resolveLlegaEnCarro,
    resolveRegisteredCost,
    resolveTransportSummary,
    responsivaDigitalTextModalOpen,
            setCardCommissionPctDraft,
    setCupoSedeOpen,
    setDashBautizosScopeBarMobileOpen,
    setDashPaymentDeadlineDate,
    setDonationsListOpen,
    setEditorRegFieldsForm,
    setEditorRegFieldsModalOpen,
    setEditorRegFieldsScope,
    setEventDateDraft,
    setEventResponsivaDigitalAdultsDraft,
    setEventResponsivaDigitalEnabledDraft,
    setEventResponsivaDigitalMinorsDraft,
    setEventResponsivaEnabledDraft,
    setEventResponsivaGeneralAdultsDraft,
    setEventResponsivaGeneralMinorsDraft,
    setEventResponsivaTextAdultsDraft,
    setEventResponsivaTextMinorsDraft,
    setExpandedDupGroups,
    setExpandedDupPersons,
    setPublicQrModalOpen,
    setRegistryConfirmModal,
    setResponsivaDigitalTextModalOpen,
    setShowIncomeCashCardByLocation,
    setShowViewSettings,
    setSummaryCampaScopes,
    setSummaryCellDetailModal,
    setSummaryFilterAssignment,
    setSummaryFilterBaptism,
    setSummaryFilterScholarship,
    setSummaryFilterServer,
    setSummaryFiltersDropdownOpen,
    setSummaryRosterModal,
    setSummaryTableColumns,
    setTempBautizosListPriceFood,
    setTempBautizosListPriceTransport,
    setTempDeposit,
    setTempEventTotalCap,
    setTempLocationCaps,
    setTempRealCost,
    setViewPrefs,
    SI,
    showGrossWithoutCommission,
    showIncChartValues,
    showIncomeCashCardByLocation,
    showLocChartValues,
    showToast,
    showViewSettings,
        summary,
    summaryCampaScopes,
    summaryCellDetailModal,
    summaryDashExpandKey,
    summaryFilterAssignment,
    summaryFilterBaptism,
    summaryFilterScholarship,
    summaryFilterServer,
    summaryFiltersBtnRef,
    summaryFiltersDropdownOpen,
    summaryFiltersMenuPos,
    summaryRosterModal,
    summaryTableColumns,
        tempBautizosListPriceFood,
    tempBautizosListPriceTransport,
    tempDeposit,
    tempEventTotalCap,
    tempLocationCaps,
    tempRealCost,
    togglePref,
    toggleShowGrossWithoutCommission,
    toggleSummaryDashCard,
    toggleSummaryPieIncChart,
    toggleSummaryPieLocChart,
        updateEventConfig,
    viewPrefs,    waitlistCupoCountBySede,
    waitlistData,
    x2
  } = useWorkspaceShell();

  const [expandedCompanionCollisionGroups, setExpandedCompanionCollisionGroups] = React.useState(new Set());

const renderCampaScopeSegmentToggle = useCallback(
    (sectionKey) => {
      if (!isCampa) return null;
      const val = summaryCampaScopes[sectionKey] || 'all';
      return (
        <div
          className="flex items-center gap-0.5 rounded-md md:rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 p-0.5"
          onClick={(e) => e.stopPropagation()}
          role="group"
          aria-label="Filtrar por segmento del campamento"
        >
          {[
            { id: 'all', label: 'Todos' },
            { id: 'teens', label: 'Teens' },
            { id: 'jovenes', label: 'Jóvenes' },
          ].map((opt) => (
            <button
              key={`${sectionKey}-campa-scope-${opt.id}`}
              type="button"
              onClick={() => setSummaryCampaScopes((prev) => ({ ...prev, [sectionKey]: opt.id }))}
              className={`px-1 py-0.5 md:px-1.5 rounded md:rounded-md text-[8px] md:text-[9px] font-black transition-colors ${
                val === opt.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      );
    },
    [isCampa, summaryCampaScopes]
  );

  /** Bautizos: botonera global fija (Todos, Bautizados, Acompañantes, tipos de asistencia). */
  const renderBautizosDashboardFixedScopeBar = useCallback(() => {
    if (!isBautizos || isMobileMenuOpen) return null;
    const val = resolveBautizosDashboardGlobalScope(summaryCampaScopes);
    const scopeLabel = getBautizosDashboardScopeLabel(val);
    const bar = (
      <div className={uiDashboard.statScopeBar} aria-label="Filtro global del dashboard">
        <div
          className={`${uiDashboard.statScopeBarPanel} ${
            dashBautizosScopeBarMobileOpen ? uiDashboard.statScopeBarPanelMobileOpen : uiDashboard.statScopeBarPanelMobileClosed
          }`}
        >
          <button
            type="button"
            className={`md:hidden ${uiMobileMenu.optionsBtnBase} ${
              dashBautizosScopeBarMobileOpen ? uiMobileMenu.optionsBtnActive : uiMobileMenu.optionsBtnIdle
            } !min-h-[28px] !px-1.5 !py-1 max-w-[10.5rem]`}
            onClick={() => setDashBautizosScopeBarMobileOpen((open) => !open)}
            aria-expanded={dashBautizosScopeBarMobileOpen}
            aria-controls="dash-bautizos-scope-bar-body"
          >
            <span className="min-w-0 flex flex-col gap-0 leading-tight text-left normal-case">
              <span className={uiMobileMenu.primaryLabel}>Alcance</span>
              <span className="text-[9px] font-black text-teal-800 dark:text-teal-200 truncate">{scopeLabel}</span>
            </span>
            {dashBautizosScopeBarMobileOpen ? (
              <ChevronDown className="w-3.5 h-3.5 shrink-0 text-teal-700 dark:text-teal-300" aria-hidden />
            ) : (
              <ChevronUp className="w-3.5 h-3.5 shrink-0 text-teal-700 dark:text-teal-300" aria-hidden />
            )}
          </button>
          <div
            id="dash-bautizos-scope-bar-body"
            className={`${dashBautizosScopeBarMobileOpen ? uiDashboard.statScopeBarBodyOpen : uiDashboard.statScopeBarBody} md:mt-0 ${
              dashBautizosScopeBarMobileOpen ? 'mt-1 pt-1 border-t border-slate-200 dark:border-slate-600' : ''
            }`}
          >
            <p className={`${uiDashboard.statScopeBarHeading} hidden md:block`}>Alcance del dashboard</p>
            <div
              className="flex flex-wrap items-center justify-end gap-0.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 p-0.5"
              onClick={(e) => e.stopPropagation()}
              role="group"
            >
              {BAUTIZOS_DASHBOARD_SCOPE_OPTIONS.map((opt) => (
                <button
                  key={`dashBautizosScope-${opt.id}`}
                  type="button"
                  onClick={() => setSummaryCampaScopes((prev) => ({ ...prev, dashBautizosScope: opt.id }))}
                  className={`px-1.5 py-0.5 rounded-md text-[8px] sm:text-[9px] font-black transition-colors ${
                    val === opt.id
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  } ${uiMobileMenu.btnCompact}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className={uiDashboard.statScopeBarHint}>{getBautizosDashboardScopeChartHint(val, 'generic')}</p>
          </div>
        </div>
      </div>
    );
    return typeof document !== 'undefined' ? createPortal(bar, document.body) : bar;
  }, [isBautizos, isMobileMenuOpen, summaryCampaScopes, dashBautizosScopeBarMobileOpen]);

  /** En Bautizos el alcance es global (barra fija); en Campa: Teens/Jóvenes por tarjeta. */
  const renderSummaryDashScopeSlot = useCallback(
    (sectionKey) => (isBautizos ? null : renderCampaScopeSegmentToggle(sectionKey)),
    [isBautizos, renderCampaScopeSegmentToggle]
  );

  const toggleDupGroup = (key) => {
    setExpandedDupGroups(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };
  const toggleDupPerson = (key) => {
    setExpandedDupPersons(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };

  const renderDupPersonDetail = (p, duplicateCluster = null) => {
    const liq = getLiquidationTarget(p);
    const paidGross = getParticipantNetPaidFromHistory(p, computeNetAmountByMethod);
    const debt = getParticipantOutstandingGross(p, getLiquidationTarget, computeNetAmountByMethod);
    const payHistory = p.paymentHistory || [];
    const isBecado = isSiValue(p.isScholarship);
    const dupLine =
      duplicateCluster && Array.isArray(duplicateCluster.reasons) && duplicateCluster.reasons.length
        ? duplicateCluster.reasons.join('; ')
        : '';
    const dupOpts = duplicateCluster
      ? {
          fromDuplicate: true,
          duplicateReasonsLine: dupLine || 'Coincidencia en el mismo grupo de aviso de duplicados.',
        }
      : undefined;
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-3 text-[11px] text-slate-700">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Datos generales</p>
            <p><strong>Nombre:</strong> {p.name}</p>
            <p><strong>Teléfono:</strong> {p.phone || 'Sin teléfono'}</p>
            {p.alias ? <p><strong>Alias:</strong> {p.alias}</p> : null}
            <p><strong>Edad:</strong> {p.age || 'N/A'}</p>
            <p><strong>Género:</strong> {p.gender || 'N/A'}</p>
            {isCampa && (() => {
              const sid = String(p.spouseParticipantId || '').trim();
              const partner = sid ? allParticipants.find((x) => String(x.id) === sid) : null;
              const linkedFromOther = allParticipants.find(
                (x) => String(x.spouseParticipantId || '').trim() === String(p.id)
              );
              const resolvedName =
                (partner?.name || linkedFromOther?.name || '').trim() || String(p.spouseName || '').trim();
              const hasMaritalContext = isSiValue(p.isMarried) || sid || linkedFromOther;
              if (!hasMaritalContext) return null;
              return (
                <p>
                  <strong>Pareja:</strong>{' '}
                  {resolvedName ? resolvedName : <span className="text-slate-500 italic">Pendiente de asignar</span>}
                </p>
              );
            })()}
            <p><strong>Sede:</strong> {p.location}</p>
            {p.vnpPersonId ? <p className="font-mono text-indigo-700"><strong>ID VNPM:</strong> {p.vnpPersonId}</p> : null}
            <p className="text-slate-400"><strong>Doc ID:</strong> {p.id}</p>
            <p>
              <strong>Registrado:</strong> {p.registeredAt ? new Date(p.registeredAt).toLocaleString('es-MX') : 'Sin fecha'}
              <span className="text-slate-500">
                {' '}
                · <strong className="text-slate-700">Registró:</strong>{' '}
                {p.registeredBy ? (
                  <span className="font-semibold text-slate-800">{p.registeredBy}</span>
                ) : (
                  <span className="text-slate-400 italic">sin dato</span>
                )}
              </span>
            </p>
          </div>
          {hasFinancialAccess && (
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Finanzas</p>
              <p><strong>Costo base:</strong> ${resolveRegisteredCost(p, currentPricing)}</p>
              <p><strong>Meta a liquidar:</strong> ${liq}</p>
              <p><strong>Pagado:</strong> <span className={paidGross >= liq ? 'text-emerald-600 font-bold' : 'text-slate-700'}>${paidGross}</span></p>
              <p><strong>Adeudo:</strong> <span className={debt > 0 ? 'text-red-600 font-bold' : 'text-emerald-600 font-bold'}>${debt}</span></p>
              {isBecado && (
                <p>
                  <strong>Monto becado:</strong> {formatMoney(getScholarshipCondonedAmount(p))}
                  <span className="text-slate-500 font-normal">
                    {' '}
                    ({p.scholarshipType === 'partial' ? 'beca parcial' : 'beca total'})
                  </span>
                </p>
              )}
              {isFreeAttendanceType(normalizeAttendanceSpecial(p)) && <p><strong>Asistencia:</strong> {normalizeAttendanceSpecial(p)} (sin cobro)</p>}
            </div>
          )}
          {isCampa && (
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Evento</p>
              <p><strong>Servidor:</strong> {isSiValue(p.isServer) ? `Sí (${p.serverAssignment || '?'})` : 'No'}</p>
              <p><strong>Asignación:</strong> {isSiValue(p.isServer) ? p.serverAssignment : (p.campAssignment || 'N/A')}</p>
              <p><strong>Nado:</strong> {p.canSwim || 'N/A'}</p>
              <p><strong>Bautizo:</strong> {p.willBeBaptized || 'No'}</p>
              {isSiValue(p.hasAllergy) && <p><strong>Alergias:</strong> <span className="text-orange-600">{p.allergyDetails}</span></p>}
              {isSiValue(p.hasDisease) && <p><strong>Enfermedades:</strong> <span className="text-red-600">{p.diseaseDetails}</span></p>}
            </div>
          )}
        </div>
        {hasFinancialAccess && payHistory.length > 0 && (
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Historial de pagos ({payHistory.length})</p>
            <div className="max-h-32 overflow-y-auto border border-slate-100 rounded-lg">
              <table className="w-full text-[10px]">
                <thead><tr className="bg-slate-50 text-slate-500 uppercase tracking-wider"><th className="px-2 py-1 text-left">Fecha</th><th className="px-2 py-1 text-right">Monto</th><th className="px-2 py-1 text-left">Método</th><th className="px-2 py-1 text-left">Nota</th></tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {payHistory.filter(h => h.kind !== 'comment').map((h, i) => (
                    <tr key={i}>
                      <td className="px-2 py-1">{h.date || '?'}</td>
                      <td className="px-2 py-1 text-right font-bold">${Number(h.amount || 0)}</td>
                      <td className="px-2 py-1">{h.method || '?'}</td>
                      <td className="px-2 py-1 text-slate-400 truncate max-w-[120px]">{h.note || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {(canCancelRegistrationsFlag || canArchiveRegistrationsFlag) && (
          <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
            {canCancelRegistrationsFlag && (
            <button
              type="button"
              onClick={() => cancelEntry(p.location, p.id, dupOpts)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-amber-500 bg-amber-500 text-white hover:bg-amber-600 transition-all active:scale-[0.97] flex items-center gap-1"
            >
              <Scissors size={12} /> Dar de baja
            </button>
            )}
            {canArchiveRegistrationsFlag && (
            <button
              type="button"
              onClick={() => removeEntry(p.location, p.id, dupOpts)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-rose-600 bg-rose-600 text-white hover:bg-rose-700 transition-all active:scale-[0.97] flex items-center gap-1"
            >
              <Trash2 size={12} /> Archivar
            </button>
            )}
            {duplicateCluster && Array.isArray(duplicateCluster.members) && duplicateCluster.members.length >= 2 ? (
              <button
                type="button"
                onClick={() => {
                  if (registryConfirmBusy) return;
                  setRegistryConfirmModal({
                    isOpen: true,
                    type: 'dup_accept_cluster',
                    loc: '',
                    personId: '',
                    personName: '',
                    donationId: '',
                    donationAmount: 0,
                    refundAmount: 0,
                    paymentIndex: null,
                    paymentRowId: null,
                    fromDuplicateDiagnostic: false,
                    duplicateReasonsLine: '',
                    dupAcceptCluster: {
                      memberIds: duplicateCluster.members.map((m) => m.id),
                      ackKeys: duplicateCluster.ackKeys || [],
                      reasons: duplicateCluster.reasons || [],
                    },
                  });
                }}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 transition-all active:scale-[0.97] flex items-center gap-1"
              >
                <CheckCircle2 size={12} /> Aceptar duplicado
              </button>
            ) : null}
          </div>
        )}
      </div>
    );
  };

  const toggleCompanionCollisionGroup = (key) => {
    setExpandedCompanionCollisionGroups((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  };

  const renderCompanionCollisionGroups = (clusters, context = 'summary') => {
    if (!clusters?.length) return null;
    return (
      <div className="mt-3 space-y-2">
        {clusters.map((cluster, gi) => {
          const groupKey = `${context}-cc-${gi}`;
          const isOpen = expandedCompanionCollisionGroups.has(groupKey);
          const cs = cluster.companionSide || {};
          const rs = cluster.registrantSide || {};
          const reasonsText = describeCollisionReasons(cluster.reasons);
          return (
            <div key={groupKey} className="bg-white/80 border border-violet-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleCompanionCollisionGroup(groupKey)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-violet-50/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black text-violet-700 uppercase tracking-wider">
                      {cluster.confidence === 'certain' ? 'Alta confianza' : cluster.confidence === 'probable' ? 'Probable' : 'Posible'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-700">
                      {cs.displayName || '—'} ↔ {rs.name || '—'}
                    </span>
                  </div>
                  <p className="text-[10px] text-violet-900/90 mt-1 leading-snug">
                    Titular {cs.hostName || '—'} ({cs.location || '?'}) · Activo {rs.name || '—'} ({rs.location || '?'})
                  </p>
                  {reasonsText ? (
                    <p className="text-[10px] text-violet-800/80 font-semibold mt-0.5">{reasonsText}</p>
                  ) : null}
                </div>
                {isOpen ? <ChevronUp size={16} className="text-violet-500 shrink-0" /> : <ChevronDown size={16} className="text-violet-500 shrink-0" />}
              </button>
              {isOpen && hasAdminRights ? (
                <div className="px-3 pb-3 pt-1 border-t border-violet-100 flex flex-wrap gap-2">
                  {cluster.suggestedAction === 'link_companion_to_registrant' ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black bg-violet-600 text-white hover:bg-violet-700"
                      onClick={() => {
                        if (registryConfirmBusy) return;
                        setRegistryConfirmModal({
                          isOpen: true,
                          type: 'companion_link_collision',
                          loc: cs.location || '',
                          personId: cs.hostId || '',
                          personName: cs.displayName || '',
                          donationId: '',
                          donationAmount: 0,
                          refundAmount: 0,
                          paymentIndex: null,
                          paymentRowId: null,
                          fromDuplicateDiagnostic: false,
                          duplicateReasonsLine: describeCollisionCluster(cluster),
                          dupAcceptCluster: null,
                          companionCollisionCluster: cluster,
                          ...REGISTRY_CONFIRM_BAUTIZOS_EMPTY,
                        });
                      }}
                    >
                      <Link2 size={12} />
                      Vincular acompañante
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                    onClick={() => {
                      if (registryConfirmBusy) return;
                      setRegistryConfirmModal({
                        isOpen: true,
                        type: 'companion_ack_collision',
                        loc: '',
                        personId: rs.participantId || '',
                        personName: rs.name || '',
                        donationId: '',
                        donationAmount: 0,
                        refundAmount: 0,
                        paymentIndex: null,
                        paymentRowId: null,
                        fromDuplicateDiagnostic: false,
                        duplicateReasonsLine: describeCollisionCluster(cluster),
                        dupAcceptCluster: null,
                        companionCollisionCluster: cluster,
                        ...REGISTRY_CONFIRM_BAUTIZOS_EMPTY,
                      });
                    }}
                  >
                    Reconocer aviso
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  };

  const renderDuplicateGroups = (clusters, context) => {
    if (!clusters || clusters.length === 0) return null;
    return (
      <div className="mt-3 space-y-2">
        {clusters.map((cluster, gi) => {
          const membersAll = Array.isArray(cluster?.members) ? cluster.members : [];
          const display =
            Array.isArray(cluster.displayMembers) && cluster.displayMembers.length ? cluster.displayMembers : membersAll;
          const groupKey = `${context}-${gi}`;
          const isGroupOpen = expandedDupGroups.has(groupKey);
          const locs = [...new Set(display.map((p) => p.location))];
          const reasons = cluster.reasons || [];
          const reasonsText = reasons.length ? reasons.join(' · ') : '';
          const kind = cluster.kind || 'phone';
          const headerPhone = kind === 'phone' ? digitsOnlyPhone(membersAll[0]?.phone || display[0]?.phone || '') : '';
          const headerVnp =
            kind === 'vnp' ? canonicalizeVnpPersonId(membersAll[0]?.vnpPersonId || display[0]?.vnpPersonId || '') : '';
          return (
            <div key={gi} className="bg-white/70 border border-amber-100 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleDupGroup(groupKey)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-amber-50/50 transition-colors"
              >
                <div className="flex flex-col gap-1 min-w-0 w-full">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider shrink-0">
                      Grupo {gi + 1}
                    </span>
                    {kind === 'phone' && (
                      <span className="text-[10px] text-slate-500">
                        Tel:{' '}
                        <span className="font-mono font-bold">
                          {headerPhone ? headerPhone : membersAll[0]?.phone || 'Sin tel'}
                        </span>
                      </span>
                    )}
                    {kind === 'vnp' && headerVnp && (
                      <span className="text-[10px] text-slate-500">
                        ID VNPM: <span className="font-mono font-bold">{headerVnp}</span>
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">·</span>
                    <span className="text-[10px] text-slate-500">
                      {display.length} registro{display.length === 1 ? '' : 's'} en vista
                      {membersAll.length !== display.length ? ` (${membersAll.length} en el grupo completo)` : ''} ·{' '}
                      {locs.length > 1 ? `Sedes: ${locs.join(', ')}` : `Sede: ${locs[0] || '?'}`}
                    </span>
                    {display.map((p) => (
                      <span key={p.id} className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold">
                        {p.name}
                      </span>
                    ))}
                  </div>
                  {reasonsText ? (
                    <p className="text-[10px] text-amber-900/90 font-semibold leading-snug pl-0.5">
                      Parámetros en conflicto: {reasonsText}
                    </p>
                  ) : null}
                </div>
                {isGroupOpen ? <ChevronUp size={16} className="text-amber-500 shrink-0" /> : <ChevronDown size={16} className="text-amber-500 shrink-0" />}
              </button>
              {isGroupOpen && (
                <div className="px-3 pb-3 space-y-2 border-t border-amber-100 pt-2">
                  {display.map((p) => {
                    const personKey = `${groupKey}-${p.id}`;
                    const isPersonOpen = expandedDupPersons.has(personKey);
                    const liq = getLiquidationTarget(p);
                    const paidGross = parseFloat(p.paid || 0);
                    return (
                      <div key={p.id} className="border border-slate-200 rounded-lg overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleDupPerson(personKey)}
                          className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex flex-wrap items-center gap-2 text-[11px] min-w-0">
                            <span className="font-bold text-slate-800">{p.name}</span>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-500">{p.location}</span>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-500 font-mono text-[10px]">ID: {p.id}</span>
                            {hasFinancialAccess && (
                              <>
                                <span className="text-slate-400">·</span>
                                <span className={paidGross >= liq ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                                  Pagado: ${paidGross} / ${liq}
                                </span>
                              </>
                            )}
                            <span className="text-slate-400">·</span>
                            <span className="text-[10px] text-slate-400">
                              {p.registeredAt ? new Date(p.registeredAt).toLocaleString('es-MX') : 'Sin fecha'}
                              {p.registeredBy ? (
                                <>
                                  {' '}
                                  <span className="text-slate-500">· Por: {p.registeredBy}</span>
                                </>
                              ) : null}
                            </span>
                          </div>
                          {isPersonOpen ? <ChevronUp size={14} className="text-slate-400 shrink-0" /> : <ChevronDown size={14} className="text-slate-400 shrink-0" />}
                        </button>
                        {isPersonOpen && (
                          <div className="px-3 pb-3 pt-1">
                            {renderDupPersonDetail(p, cluster)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  
    const sRegs = getDashboardSummaryForCampaScope('dashRegs');
    const totalRegs = sRegs.globalStats.all.count;
    const sSch = getDashboardSummaryForCampaScope('dashScholarship');
    const totalScholarship = sSch.globalStats.all.scholarship;
    const becaTotal = sSch.scholarshipTotalCount ?? 0;
    const becaParcial = sSch.scholarshipPartialCount ?? 0;
    const _percentScholarship = totalRegs > 0 ? (totalScholarship / totalRegs) * 100 : 0;
    const sSrv = getDashboardSummaryForCampaScope('dashServers');
    const srvExT = sSrv.serverTeensExclusive ?? 0;
    const srvExJ = sSrv.serverJovenesExclusive ?? 0;
    const srvAmb = sSrv.serverAmbosCount ?? 0;
    const srvInT = sSrv.serverTeensInclusive ?? 0;
    const srvInJ = sSrv.serverJovenesInclusive ?? 0;
    const totalSrv = sSrv.totalServers ?? 0;
    const sCortesiaCard = getDashboardSummaryForCampaScope('dashCortesia');
    const sEmpleadoCard = getDashboardSummaryForCampaScope('dashEmpleado');
    const sChartPaymentStatus = getDashboardSummaryForCampaScope('chartPaymentStatus');
    const sChartGender = getDashboardSummaryForCampaScope('chartGender');
    const sChartAgeBrackets = getDashboardSummaryForCampaScope('chartAgeBrackets');
    const sChartBloodType = getDashboardSummaryForCampaScope('chartBloodType');
    const sChartSwimming = getDashboardSummaryForCampaScope('chartSwimming');
    const sChartMedical = getDashboardSummaryForCampaScope('chartMedical');
    const sChartServers = getDashboardSummaryForCampaScope('chartServers');
    const sChartAges = getDashboardSummaryForCampaScope('chartAges');
    const sChartBaptism = getDashboardSummaryForCampaScope('chartBaptism');
    const sChartAttendanceSpecial = getDashboardSummaryForCampaScope('chartAttendanceSpecial');
    const sSectionTravelDepart = getDashboardSummaryForCampaScope('sectionTravelDepart');
    const sSectionTravelReturn = getDashboardSummaryForCampaScope('sectionTravelReturn');
    const sChartCustom = getDashboardSummaryForCampaScope('chartCustom');
    const realCostNum = Number(currentEvent?.realCost) || 0;
    const eventDonationsAll = mergeEventDonationsForEvent(currentEvent?.id, donations, allParticipants);
    const dashboardLocs = dashboardLocations.length ? dashboardLocations : (currentEvent?.locations || []);
    const donationInDashboardLoc = (d) => {
      const loc = String(d?.location || '').trim();
      if (!loc) return dashboardHasFullLocationAccess;
      return dashboardLocs.some((dl) => String(dl).trim() === loc);
    };
    const eventDonations = eventDonationsAll.filter(donationInDashboardLoc);
    const donationsTotalForBalance = eventDonations.filter(donationAddsToRecaudacionBalance).reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
    const donationsTotalAll = eventDonations.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

    // Listados al hacer click en "Registrados" / "Becados"
    const rosterLocations = dashboardLocs;
    const rosterRegulars = rosterLocations.flatMap((loc) => (data[loc] || []).filter((p) => !isSiValue(p.isScholarship)));
    const rosterScholarship = rosterLocations.flatMap((loc) => (data[loc] || []).filter((p) => isSiValue(p.isScholarship)));
    const rosterServersList = rosterLocations.flatMap((loc) => (data[loc] || []).filter((p) => isSiValue(p.isServer)));
    const eventRosterRows = allParticipants.filter((p) => p.eventId === currentEvent?.id && participantIsActiveInRoster(p));
    const bautizosPartyRosterBase = eventRosterRows.filter((p) => rosterLocations.includes(String(p.location || '').trim()));
    const bautizosDashScope = resolveBautizosDashboardGlobalScope(summaryCampaScopes);
    const bautizosDashboardCompanionDedupeMeta = isBautizos
      ? buildActiveRegistrantMetaForCompanionDedupe(
          bautizosPartyRosterBase.filter((p) => !participantIsCancelled(p))
        )
      : undefined;
    const bautizosFlatSummary = !isBautizos ? null : summarizeBautizosFlatRoster(bautizosPartyRosterBase);
    const bautizosFlatRows = bautizosFlatSummary?.flatRows ?? [];
    const bautizosCompanionBaptizedCount = bautizosFlatSummary?.bautizados ?? 0;
    const totalRegsBautizosCard = !isBautizos
      ? totalRegs
      : countBautizosDashboardPeople(bautizosPartyRosterBase, null, bautizosDashScope);
    /** Inscritos activos según Todos / Bautizados / Acompañantes (misma regla que listados del modal). */
    const bautizosDashPartyRowsFiltered = !isBautizos
      ? []
      : bautizosPartyRosterBase.filter((p) =>
          participantMatchesBautizosDashboardPartyScope(p, bautizosDashScope)
        );
    const bautizosDashRowsForCardScope = () =>
      !isBautizos
        ? []
        : bautizosPartyRosterBase.filter((p) =>
            participantMatchesBautizosDashboardPartyScope(p, bautizosDashScope)
          );
    const bautizosDashServidorListForDash = !isBautizos
      ? []
      : collectBautizosParticipatingServerRows(bautizosFlatRows).filter((row) =>
          flatRowMatchesBautizosDashboardScope(row, bautizosDashScope)
        );
    const bautizosDashCortesiaListForDash = !isBautizos
      ? []
      : bautizosFlatRows.filter(
          (p) =>
            flatRowMatchesBautizosDashboardScope(p, bautizosDashScope) &&
            normalizeBautizosAttendanceType(p.bautizosAttendanceType) === BAUTIZOS_ATTENDANCE.cortesia
        );
    const bautizosDashEmpleadoListForDash = !isBautizos
      ? []
      : bautizosFlatRows.filter(
          (p) =>
            flatRowMatchesBautizosDashboardScope(p, bautizosDashScope) &&
            normalizeBautizosAttendanceType(p.bautizosAttendanceType) === BAUTIZOS_ATTENDANCE.empleado
        );
    const bautizosTransportModalBuild = !isBautizos
      ? { transportPeople: 0, transportModalRows: [] }
      : (() => {
          const scope = bautizosDashScope;
          const transportModalRows = [];
          for (const p of bautizosFlatRows) {
            if (!flatRowMatchesBautizosDashboardScope(p, scope)) continue;
            if (!isSiValue(p.wantsBautizosTransport) || isBautizosLapInfantCompanion(p, currentEvent)) continue;
            const isCompanion = p.__legacyCompanionRow || p.__legacyCompanionBaptized;
            transportModalRows.push({
              id: `bzt-${p.id}`,
              displayName: String(p.name || '').trim() || '—',
              lineKind: isCompanion ? 'Acompañante' : 'Inscrito',
              registradoName: isCompanion ? String(p.__sourceRegistrantName || '').trim() : '',
              location: String(p.location || '').trim() || '—',
              transportSummary: resolveTransportSummary(p, 'Bautizos', currentEvent),
            });
          }
          transportModalRows.sort((a, b) => {
            const la = String(a.location || '').localeCompare(String(b.location || ''));
            if (la !== 0) return la;
            const ka = `${a.lineKind}-${a.displayName}`;
            const kb = `${b.lineKind}-${b.displayName}`;
            return ka.localeCompare(kb);
          });
          return { transportPeople: transportModalRows.length, transportModalRows };
        })();
    const bautizosDashTransportCount = bautizosTransportModalBuild.transportPeople;
    const bautizosTransportModalRows = bautizosTransportModalBuild.transportModalRows;
    const bautizosCarsModalBuild = !isBautizos
      ? { peopleArrivingByCar: 0, totalCars: 0, carModalRows: [] }
      : (() => {
          const scope = bautizosDashScope;
          const carModalRows = [];
          let totalCars = 0;
          for (const p of bautizosFlatRows) {
            if (!flatRowMatchesBautizosDashboardScope(p, scope)) continue;
            if (!bautizosLineGoesByCar(p)) continue;
            const explicitCar = resolveLlegaEnCarro(p);
            const cars = explicitCar ? normalizeArrivalCarCount(p?.carrosLlegada) : 0;
            totalCars += cars;
            const isCompanion = p.__legacyCompanionRow || p.__legacyCompanionBaptized;
            carModalRows.push({
              id: `bzc-${p.id}`,
              displayName: String(p.name || '').trim() || '—',
              lineKind: isCompanion ? 'Acompañante' : 'Inscrito',
              registradoName: isCompanion ? String(p.__sourceRegistrantName || '').trim() : '',
              location: String(p.location || '').trim() || '—',
              cars,
              transportSummary: resolveTransportSummary(p, 'Bautizos', currentEvent),
            });
          }
          carModalRows.sort((a, b) => {
            const la = String(a.location || '').localeCompare(String(b.location || ''));
            if (la !== 0) return la;
            return `${a.lineKind}-${a.displayName}`.localeCompare(`${b.lineKind}-${b.displayName}`);
          });
          return {
            peopleArrivingByCar: carModalRows.length,
            totalCars,
            carModalRows,
          };
        })();
    const bautizosDashCarsPeopleCount = bautizosCarsModalBuild.peopleArrivingByCar;
    const bautizosDashCarsTotal = bautizosCarsModalBuild.totalCars;
    const bautizosCarModalRows = bautizosCarsModalBuild.carModalRows;
    const rosterRealCostX2List = eventRosterRows.filter(
      (p) =>
        participantCountsAsRealCostX2(p, currentEvent) &&
        campaAttendanceScopeMatches(isCampa, p, summaryCampaScopes.dashRealCostX2 || 'all')
    );
    const rosterCortesiaList = eventRosterRows.filter((p) => normalizeAttendanceSpecial(p) === ATTENDANCE_SPECIAL.cortesia);
    const rosterCortesiaNonServerList = rosterCortesiaList.filter((p) => !isSiValue(p.isServer));
    const rosterEmpleadoList = eventRosterRows.filter((p) => normalizeAttendanceSpecial(p) === ATTENDANCE_SPECIAL.empleado);
    const rosterPastorList = eventRosterRows.filter((p) => isPastorParticipant(p, currentEvent?.eventType));
    const totalPastorRealCostDashboard = sumPastorRealCostForParticipants(eventRosterRows, currentEvent?.eventType);
    const realCostExtraUnitsForCurrentEvent =
      rosterRealCostX2List.length +
      (includeCortesiaInRealCost ? rosterCortesiaNonServerList.length : 0) +
      (includeEmpleadoInRealCost ? rosterEmpleadoList.length : 0);
    const sRealCostCard = getDashboardSummaryForCampaScope('dashRealCostX2');
    const totalRegsForRealCostCard = sRealCostCard.globalStats.all.count;
    const totalRealCostUnitsForCurrentEvent = totalRegsForRealCostCard + realCostExtraUnitsForCurrentEvent;

    const attendanceEmpleadoList = rosterRegulars.filter((p) => normalizeAttendanceSpecial(p) === ATTENDANCE_SPECIAL.empleado);
    const attendanceCortesiaList = rosterRegulars.filter((p) => normalizeAttendanceSpecial(p) === ATTENDANCE_SPECIAL.cortesia);
    const freeAttendanceNeedsTransport = [...attendanceEmpleadoList, ...attendanceCortesiaList].filter((p) => !resolveLlegaEnCarro(p));
    const rosterListForModal =
      summaryRosterModal.type === 'scholarship'
        ? rosterScholarship
        : summaryRosterModal.type === 'servers'
          ? rosterServersList
          : summaryRosterModal.type === 'realCostX2'
            ? rosterRealCostX2List
          : summaryRosterModal.type === 'cortesia'
            ? attendanceCortesiaList
          : summaryRosterModal.type === 'empleado'
            ? attendanceEmpleadoList
          : summaryRosterModal.type === 'bautizos_servidor'
            ? bautizosDashServidorListForDash
            : summaryRosterModal.type === 'bautizos_cortesia'
              ? bautizosDashCortesiaListForDash
              : summaryRosterModal.type === 'bautizos_empleado'
                ? bautizosDashEmpleadoListForDash
          : summaryRosterModal.type === 'bautizos_transport' ||
              summaryRosterModal.type === 'bautizos_llega_carro' ||
              summaryRosterModal.type === 'bautizosCompanions'
            ? []
            : rosterRegulars;
    const summaryModalScopeKey =
      summaryRosterModal.type === 'scholarship'
        ? 'dashScholarship'
        : summaryRosterModal.type === 'servers'
          ? 'dashServers'
          : summaryRosterModal.type === 'realCostX2'
            ? 'dashRealCostX2'
            : summaryRosterModal.type === 'cortesia'
              ? 'dashCortesia'
              : summaryRosterModal.type === 'empleado'
                ? 'dashEmpleado'
                : summaryRosterModal.type === 'bautizos_transport'
                  ? 'dashBautizosTransport'
                  : summaryRosterModal.type === 'bautizos_llega_carro'
                    ? 'dashBautizosCars'
                    : summaryRosterModal.type === 'bautizos_servidor'
                      ? 'dashBautizosServidores'
                      : summaryRosterModal.type === 'bautizos_cortesia'
                        ? 'dashBautizosCortesia'
                        : summaryRosterModal.type === 'bautizos_empleado'
                          ? 'dashBautizosEmpleado'
                          : 'dashRegs';
    const rosterModalBzScope = isBautizos ? bautizosDashScope : 'all';
    const rosterModalCampaScope = isBautizos ? 'all' : summaryCampaScopes[summaryModalScopeKey] || 'all';
    let rosterListForModalForCampa = rosterListForModal;
    if (summaryRosterModal.type === 'regular' && isBautizos) {
      rosterListForModalForCampa = rosterListForModal.filter((p) =>
        participantMatchesBautizosDashboardPartyScope(p, rosterModalBzScope)
      );
    }
    const rosterListForModalFiltered = rosterListForModalForCampa.filter((p) =>
      campaAttendanceScopeMatches(isCampa, p, rosterModalCampaScope)
    );
    const bautizosCompanionModalRows =
      isBautizos && summaryRosterModal.type === 'bautizosCompanions'
        ? bautizosFlatRows
            .filter((p) => flatRowMatchesBautizosDashboardScope(p, bautizosDashScope))
            .filter(
              (p) =>
                normalizeBautizosAttendanceType(p.bautizosAttendanceType) === BAUTIZOS_ATTENDANCE.acompanante ||
                p.__legacyCompanionRow === true
            )
            .map((p) => ({
              id: p.id,
              companionName: String(p.name || '').trim(),
              relationship: String(p.relationship || '').trim(),
              registradoName: String(p.__sourceRegistrantName || '').trim(),
              location: String(p.location || '').trim(),
            }))
            .sort((a, b) => {
              const la = String(a.location || '');
              const lb = String(b.location || '');
              if (la !== lb) return la.localeCompare(lb);
              const na = String(a.registradoName || '').localeCompare(String(b.registradoName || ''));
              if (na !== 0) return na;
              return String(a.companionName || '').localeCompare(String(b.companionName || ''));
            })
        : [];
    const summaryModalColSpan =
      summaryRosterModal.type === 'scholarship'
        ? 2
        : summaryRosterModal.type === 'realCostX2'
          ? 3
        : summaryRosterModal.type === 'cortesia' ||
            summaryRosterModal.type === 'empleado' ||
            summaryRosterModal.type === 'bautizos_servidor' ||
            summaryRosterModal.type === 'bautizos_cortesia' ||
            summaryRosterModal.type === 'bautizos_empleado'
          ? isDesayunoEvent
            ? 2
            : 3
          : summaryRosterModal.type === 'bautizos_transport' || summaryRosterModal.type === 'bautizos_llega_carro'
            ? 5
          : summaryRosterModal.type === 'servers'
            ? isDesayunoEvent
              ? 3
              : 4
            : summaryRosterModal.type === 'bautizosCompanions'
              ? 4
            : isDesayunoEvent
              ? 3
              : 4;

    // Sección 1: filtros y gráficas por Método/Servicio (Neto o Bruto)
    const sIncomeChart = getDashboardSummaryForCampaScope('chartIncome');
    const efectivoNetTotal = sIncomeChart.paymentMethodTotals?.efectivo?.net ?? 0;
    const tarjetaNetTotal = sIncomeChart.paymentMethodTotals?.tarjeta?.net ?? 0;
    const efectivoGrossTotal = sIncomeChart.paymentMethodTotals?.efectivo?.gross ?? 0;
    const tarjetaGrossTotal = sIncomeChart.paymentMethodTotals?.tarjeta?.gross ?? 0;
    const efectivoModeTotal = showGrossWithoutCommission ? efectivoGrossTotal : efectivoNetTotal;
    const tarjetaModeTotal = showGrossWithoutCommission ? tarjetaGrossTotal : tarjetaNetTotal;
    const dashboardCommissionTotal = Math.max(0, tarjetaGrossTotal - tarjetaNetTotal);
    const efectivoNetSelected = filterPaymentMethod.efectivo ? efectivoModeTotal : 0;
    const tarjetaNetSelected = filterPaymentMethod.tarjeta ? tarjetaModeTotal : 0;
    const methodNetSelectedTotal = efectivoNetSelected + tarjetaNetSelected;

    const _getMethodPieGradient = () => {
      if (methodNetSelectedTotal <= 0) return '#f1f5f9';
      let cur = 0;
      const segs = [];
      if (filterPaymentMethod.efectivo && efectivoModeTotal > 0) {
        const per = (efectivoNetSelected / methodNetSelectedTotal) * 100;
        const start = cur;
        const end = cur + per;
        segs.push(`${'#10b981'} ${start}% ${end}%`);
        cur = end;
      }
      if (filterPaymentMethod.tarjeta && tarjetaModeTotal > 0) {
        const per = (tarjetaNetSelected / methodNetSelectedTotal) * 100;
        const start = cur;
        const end = cur + per;
        segs.push(`${'#4f46e5'} ${start}% ${end}%`);
        cur = end;
      }
      return `conic-gradient(${segs.join(', ')})`;
    };

    const getPersonRecaudadoByPaymentMethod = (p) => {
      let efectivoGross = 0;
      let tarjetaGross = 0;
      let efectivoNet = 0;
      let tarjetaNet = 0;
      let hasEfectivoPayment = false;
      let hasTarjetaPayment = false;
      const history = p.paymentHistory || [];
      for (const h of history) {
        if (!h || h.kind === 'comment') continue;
        const method = h.method || (p.paymentMethod === 'Tarjeta' ? 'Tarjeta' : 'Efectivo');
        const gross = Number(h.amount || 0) || 0;
        const net = computeNetAmountByMethod(gross, method);
        if (method === 'Tarjeta') {
          hasTarjetaPayment = true;
          tarjetaGross += gross;
          tarjetaNet += net;
        } else {
          hasEfectivoPayment = true;
          efectivoGross += gross;
          efectivoNet += net;
        }
      }
      if (efectivoGross + tarjetaGross <= 0) {
        const pg = parseFloat(p.paid || 0) || 0;
        const pn = computeNetAmountByMethod(pg, p.paymentMethod);
        if (pg > 0) {
          const method = p.paymentMethod === 'Tarjeta' ? 'Tarjeta' : 'Efectivo';
          if (method === 'Tarjeta') {
            hasTarjetaPayment = true;
            tarjetaGross = pg;
            tarjetaNet = pn;
          } else {
            hasEfectivoPayment = true;
            efectivoGross = pg;
            efectivoNet = pn;
          }
        }
      }
      return { efectivoGross, tarjetaGross, efectivoNet, tarjetaNet, hasEfectivoPayment, hasTarjetaPayment };
    };

    const buildTableByLocation = (campaScope) => {
      const bzScope = currentEvent?.eventType === 'Bautizos' ? bautizosDashScope : 'all';
      const allSummaryRowsFlat = dashboardLocs.flatMap((l) =>
        applySummaryLikeFilters(data[l] || [], campaScope, { skipBautizosParty: true })
      );
      const tableBzDedupeMeta =
        currentEvent?.eventType === 'Bautizos'
          ? buildActiveRegistrantMetaForCompanionDedupe(allSummaryRowsFlat.filter((p) => !participantIsCancelled(p)))
          : null;
      const filterSummaryStatusRows = (rows) => {
        let sectionRows = applySummaryLikeFilters(rows || [], campaScope, { skipBautizosParty: true });
        if (currentEvent?.eventType === 'Bautizos') {
          sectionRows = sectionRows.filter((p) => bautizosDashboardTitularCountsForScope(p, bzScope));
        }
        if (isCampa) {
          sectionRows = sectionRows.filter((p) => campaAttendanceScopeMatches(isCampa, p, campaScope));
        }
        return sectionRows;
      };
      const summarySectionWeight = (p) =>
        currentEvent?.eventType === 'Campa' &&
        campaScope === 'all' &&
        countAmbosDoubleInAllCounts &&
        participantCountsAsRealCostX2(p, currentEvent)
          ? 2
          : 1;
      const waitlistCountsForTable = computeWaitlistCountsForEvent(
        allParticipants,
        currentEvent,
        dashboardLocs,
        {
          dashboardScope: bzScope,
          sectionWeight: summarySectionWeight,
        }
      );
      return dashboardLocs.map((loc) => {
      const filtered = applySummaryLikeFilters(data[loc] || [], campaScope, { skipBautizosParty: true });
      const filteredBzParty =
        currentEvent?.eventType === 'Bautizos'
          ? applySummaryLikeFilters(data[loc] || [], campaScope)
          : filtered;
      const stats = filtered.reduce((acc, p) => {
        const allScopeDoubleWeight =
          currentEvent?.eventType === 'Campa' &&
          campaScope === 'all' &&
          countAmbosDoubleInAllCounts &&
          participantCountsAsRealCostX2(p, currentEvent)
            ? 2
            : 1;
        const bzPartyMatch =
          currentEvent?.eventType !== 'Bautizos' || bautizosDashboardTitularCountsForScope(p, bzScope);
        const bzFinMatch =
          currentEvent?.eventType !== 'Bautizos' ||
          bautizosDashboardIncludeRegistrationFinancials(p, bzScope);
        const liq = getLiquidationTarget(p);
        const paidGross = getParticipantNetPaidFromHistory(p, computeNetAmountByMethod);
        const paidNet = getParticipantEffectivePaidNet(p, computeNetAmountByMethod);
        const recaudado = showGrossWithoutCommission ? paidGross : paidNet;
        const bzAlloc =
          currentEvent?.eventType === 'Bautizos'
            ? allocateBautizosDashboardPayments(
                p,
                currentEvent,
                tableBzDedupeMeta,
                liq,
                p.paymentHistory,
                paidGross,
                p.paymentMethod,
                computeNetAmountByMethod
              )
            : null;
        let recaudadoAdd = recaudado;
        let pendingAdd = Math.max(0, liq - paidGross);
        let expectedAdd = liq;
        if (bzAlloc && bautizosDashboardScopeUsesSplitPayments(bzScope)) {
          if (bzScope === 'companions') {
            recaudadoAdd = showGrossWithoutCommission ? bzAlloc.paidGrossCompanion : bzAlloc.paidNetCompanion;
            pendingAdd = Math.max(0, bzAlloc.companionOwed - bzAlloc.paidGrossCompanion);
            expectedAdd = bzAlloc.companionOwed;
          } else if (bzScope === 'baptized') {
            recaudadoAdd = showGrossWithoutCommission ? bzAlloc.paidGrossTitular : bzAlloc.paidNetTitular;
            pendingAdd = Math.max(0, bzAlloc.titularOwed - bzAlloc.paidGrossTitular);
            expectedAdd = bzAlloc.titularOwed;
          }
        } else {
          const enriched = enrichPaymentHistoryWithRefundDisbursements(p, computeNetAmountByMethod);
          if (enriched.length > 0) {
            const physicalGross = Math.max(
              0,
              enriched.reduce((sum, h) => sum + (Number(h.amount) || 0), 0)
            );
            const physicalNet = Math.max(
              0,
              enriched.reduce((sum, h) => {
                const method = h.method === 'Tarjeta' ? 'Tarjeta' : 'Efectivo';
                const amt = Number(h.amount) || 0;
                if (Number.isFinite(Number(h.netAmount))) return sum + Number(h.netAmount);
                return sum + computeNetAmountByMethod(amt, method);
              }, 0)
            );
            recaudadoAdd = showGrossWithoutCommission ? physicalGross : physicalNet;
          } else {
            recaudadoAdd = showGrossWithoutCommission
              ? getParticipantPhysicalRecaudadoGross(p, paidGross)
              : getParticipantPhysicalRecaudadoNet(p, paidNet, computeNetAmountByMethod);
          }
        }
        if (bzPartyMatch) {
            acc.count += allScopeDoubleWeight;
            if (isSiValue(p.isScholarship)) acc.scholarship += allScopeDoubleWeight;
            if (currentEvent?.eventType === 'Bautizos') {
              if (bautizosParticipatesAsServer(p)) acc.servers += allScopeDoubleWeight;
              const bzAtt = normalizeBautizosAttendanceType(p.bautizosAttendanceType);
              if (bzAtt === BAUTIZOS_ATTENDANCE.asistente) acc.asistentesBautizos += allScopeDoubleWeight;
              if (bzAtt === BAUTIZOS_ATTENDANCE.cortesia) acc.cortesia += allScopeDoubleWeight;
              if (bzAtt === BAUTIZOS_ATTENDANCE.pastor) acc.pastores += allScopeDoubleWeight;
            } else if (isSiValue(p.isServer)) {
              acc.servers += allScopeDoubleWeight;
            } else {
              acc.serveNo += allScopeDoubleWeight;
            }
            if (currentEvent?.eventType === 'Campa') {
              if (isSiValue(p.isServer)) {
                const sa = String(p.serverAssignment || '').trim();
                if (sa === 'Teens' || sa === 'Ambos') acc.teens += allScopeDoubleWeight;
                if (sa === 'Jóvenes' || sa === 'Ambos') acc.jovenes += allScopeDoubleWeight;
              } else {
                const ageNum = parseInt(p.age, 10);
                const assignment = String(p.campAssignment || (ageNum < 18 ? 'Teens' : 'Jóvenes')).trim();
                if (assignment === 'Teens') acc.teens += allScopeDoubleWeight;
                if (assignment === 'Jóvenes') acc.jovenes += allScopeDoubleWeight;
              }
            }
            if (currentEvent?.eventType !== 'Bautizos' && normalizeAttendanceSpecial(p) === ATTENDANCE_SPECIAL.cortesia) {
              acc.cortesia += allScopeDoubleWeight;
            }
            if (currentEvent?.eventType !== 'Bautizos' && normalizeAttendanceSpecial(p) === ATTENDANCE_SPECIAL.pastor) {
              acc.pastores += allScopeDoubleWeight;
            }
            if (currentEvent?.eventType === 'Campa' && isSiValue(p.willBeBaptized)) acc.bautizos += allScopeDoubleWeight;
          }
        if (bzFinMatch) {
          acc.paid += recaudadoAdd;
          if (bzAlloc && bautizosDashboardScopeUsesSplitPayments(bzScope)) {
            let efectivoGross = 0;
            let efectivoNet = 0;
            let tarjetaGross = 0;
            let tarjetaNet = 0;
            for (const r of bzAlloc.historyRows) {
              const method = r.method || (p.paymentMethod === 'Tarjeta' ? 'Tarjeta' : 'Efectivo');
              const g = bzScope === 'companions' ? r.payCG : r.payTG;
              const n = bzScope === 'companions' ? r.netC : r.netT;
              if (method === 'Tarjeta') {
                tarjetaGross += g;
                tarjetaNet += n;
              } else {
                efectivoGross += g;
                efectivoNet += n;
              }
            }
            acc.paidEfectivo += showGrossWithoutCommission ? efectivoGross : efectivoNet;
            acc.paidTarjeta += showGrossWithoutCommission ? tarjetaGross : tarjetaNet;
            acc.paidTarjetaGross += tarjetaGross;
            acc.paidTarjetaNet += tarjetaNet;
          } else {
            const pm = getPersonRecaudadoByPaymentMethod(p);
            acc.paidEfectivo += showGrossWithoutCommission ? pm.efectivoGross : pm.efectivoNet;
            acc.paidTarjeta += showGrossWithoutCommission ? pm.tarjetaGross : pm.tarjetaNet;
            acc.paidTarjetaGross += pm.tarjetaGross;
            acc.paidTarjetaNet += pm.tarjetaNet;
          }
          acc.pending += pendingAdd;
          acc.expected += expectedAdd;
        }
        return acc;
      }, {
        count: 0,
        activeRegistrants: 0,
        bautizados: 0,
        companions: 0,
        companionsTotal: 0,
        bautizosTransport: 0,
        bautizosCarro: 0,
        asistentesBautizos: 0,
        empleadosBautizos: 0,
        pastores: 0,
        scholarship: 0,
        servers: 0,
        serveNo: 0,
        bautizos: 0,
        teens: 0,
        jovenes: 0,
        waitlist: 0,
        cancelled: 0,
        refund: 0,
        paid: 0,
        paidEfectivo: 0,
        paidTarjeta: 0,
        paidTarjetaGross: 0,
        paidTarjetaNet: 0,
        pending: 0,
        expected: 0,
        cortesia: 0,
        pastores: 0,
      });
      if (currentEvent?.eventType === 'Bautizos') {
        const flatStats = buildBautizosLocationTableStats(filtered, loc, bzScope, { participantIsCancelled });
        Object.assign(stats, flatStats);
      }
      stats.waitlist = waitlistCountsForTable.bySede[loc]?.total ?? 0;
      const cancelledRows = filterSummaryStatusRows(cancelledData[loc]);
      stats.cancelled = cancelledRows.reduce((n, p) => n + summarySectionWeight(p), 0);
      stats.refund = cancelledRows.reduce(
        (n, p) => (getCancelledRefundPendingAmount(p) > 0 ? n + summarySectionWeight(p) : n),
        0
      );
      const refundDonationForSede = eventDonations
        .filter(
          (d) =>
            d.fromCancelledRefundDonation &&
            String(d.location || '').trim() === String(loc).trim()
        )
        .reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
      if (refundDonationForSede > 0) {
        stats.paid += refundDonationForSede;
      }
      stats.donations = eventDonations
        .filter(
          (d) =>
            donationAddsToRecaudacionBalance(d) &&
            String(d.location || '').trim() === String(loc).trim()
        )
        .reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
      return { loc, stats };
    });
    };

    const tableCache = React.useMemo(() => {
      return {
        all: buildTableByLocation('all'),
        teens: isCampa ? buildTableByLocation('teens') : null,
        jovenes: isCampa ? buildTableByLocation('jovenes') : null,
      };
    }, [
      data,
      cancelledData,
      allParticipants,
      currentEvent,
      currentPricing,
      bautizosDashScope,
      dashboardLocs,
      isCampa,
      isBautizos,
      countAmbosDoubleInAllCounts,
      showGrossWithoutCommission,
      includeCortesiaInRealCost,
      includeEmpleadoInRealCost,
      donations,
      dashboardLocations,
      dashboardHasFullLocationAccess,
    ]);

    const getCachedTable = (scope) => {
      if (scope === 'teens') return tableCache.teens || tableCache.all;
      if (scope === 'jovenes') return tableCache.jovenes || tableCache.all;
      return tableCache.all;
    };

    const tableByLocation = getCachedTable(summaryCampaScopes.tableDetails || 'all');
    const tableByLocationLocChart = getCachedTable(summaryCampaScopes.chartLocations || 'all');
    const tableByLocationBautizosCompSplit = getCachedTable('all');
    const tableByLocationBautizosTransportCar = getCachedTable('all');
    const tableByLocationIncomeChart = getCachedTable(summaryCampaScopes.chartIncome || 'all');
    const tableByLocationRecaudado = getCachedTable(summaryCampaScopes.dashRecaudado || 'all');
    const tableByLocationPendiente = getCachedTable(summaryCampaScopes.dashPendiente || 'all');
    const tableByLocationBalance = getCachedTable(summaryCampaScopes.dashBalance || 'all');


    const locationChartColorMap = buildLocationChartColorMap(dashboardLocs);
    const makeLocPieHelpers = (tbl) => {
      const filteredTotalRegsForPie = tbl.reduce((s, x) => s + x.stats.count, 0);
      const totalPaidForLocationPie = tbl.reduce((s, x) => s + x.stats.paid, 0);
      const totalEfectivoForLocationPie = tbl.reduce((s, x) => s + x.stats.paidEfectivo, 0);
      const totalTarjetaForLocationPie = tbl.reduce((s, x) => s + x.stats.paidTarjeta, 0);
      const buildLocPieGradient = (getVal, total) => {
        if (total <= 0) return '#f1f5f9';
        let curPerc = 0;
        return `conic-gradient(${dashboardLocs
          .map((loc) => {
            const row = tbl.find((t) => t.loc === loc);
            const val = getVal(row);
            const per = (val / total) * 100;
            if (per === 0) return '';
            const color = locationChartColorMap.get(loc) ?? '#94a3b8';
            const stop = `${color} ${curPerc}% ${curPerc + per}%`;
            curPerc += per;
            return stop;
          })
          .filter(Boolean)
          .join(', ')})`;
      };
      const getPieChartGradient = (dataKey) => {
        if (dataKey === 'count') {
          return buildLocPieGradient((row) => row?.stats.count ?? 0, filteredTotalRegsForPie);
        }
        if (dataKey === 'paid') {
          return buildLocPieGradient((row) => row?.stats.paid ?? 0, totalPaidForLocationPie);
        }
        if (dataKey === 'paidEfectivo') {
          return buildLocPieGradient((row) => row?.stats.paidEfectivo ?? 0, totalEfectivoForLocationPie);
        }
        if (dataKey === 'paidTarjeta') {
          return buildLocPieGradient((row) => row?.stats.paidTarjeta ?? 0, totalTarjetaForLocationPie);
        }
        return '#f1f5f9';
      };
      return {
        filteredTotalRegsForPie,
        totalPaidForLocationPie,
        totalEfectivoForLocationPie,
        totalTarjetaForLocationPie,
        getPieChartGradient,
      };
    };
    const locPie = makeLocPieHelpers(tableByLocationLocChart);
    const incPie = makeLocPieHelpers(tableByLocationIncomeChart);

    const reduceGlobalTableStats = (tbl) =>
      tbl.reduce((acc, { stats }) => {
        acc.count += stats.count;
        acc.activeRegistrants += stats.activeRegistrants || 0;
        acc.companions += stats.companions || 0;
        acc.companionsTotal += stats.companionsTotal || 0;
        acc.bautizosTransport += stats.bautizosTransport || 0;
        acc.bautizosCarro += stats.bautizosCarro || 0;
        acc.asistentesBautizos += stats.asistentesBautizos || 0;
        acc.empleadosBautizos += stats.empleadosBautizos || 0;
        acc.scholarship += stats.scholarship;
        acc.servers += stats.servers;
        acc.serveNo += stats.serveNo;
        acc.bautizos += stats.bautizos;
        acc.teens += stats.teens;
        acc.jovenes += stats.jovenes;
        acc.waitlist += stats.waitlist || 0;
        acc.cancelled += stats.cancelled;
        acc.refund += stats.refund;
        acc.paid += stats.paid;
        acc.donations += stats.donations;
        acc.paidEfectivo += stats.paidEfectivo;
        acc.paidTarjeta += stats.paidTarjeta;
        acc.paidTarjetaGross += stats.paidTarjetaGross || 0;
        acc.paidTarjetaNet += stats.paidTarjetaNet || 0;
        acc.pending += stats.pending;
        acc.expected += stats.expected;
        acc.cortesia += stats.cortesia;
        acc.bautizados += stats.bautizados || 0;
        return acc;
      }, {
        count: 0,
        activeRegistrants: 0,
        bautizados: 0,
        companions: 0,
        companionsTotal: 0,
        bautizosTransport: 0,
        bautizosCarro: 0,
        asistentesBautizos: 0,
        empleadosBautizos: 0,
        pastores: 0,
        scholarship: 0,
        servers: 0,
        serveNo: 0,
        bautizos: 0,
        teens: 0,
        jovenes: 0,
        waitlist: 0,
        cancelled: 0,
        refund: 0,
        paid: 0,
        donations: 0,
        paidEfectivo: 0,
        paidTarjeta: 0,
        paidTarjetaGross: 0,
        paidTarjetaNet: 0,
        pending: 0,
        expected: 0,
        cortesia: 0,
      });

    const globalTableStats = reduceGlobalTableStats(tableByLocation);
    const globalTableStatsRecaudado = reduceGlobalTableStats(tableByLocationRecaudado);
    const globalTableStatsPendiente = reduceGlobalTableStats(tableByLocationPendiente);
    const globalTableStatsBalance = reduceGlobalTableStats(tableByLocationBalance);
    const bautizosScopedFinances = isBautizos && normalizeBautizosDashboardScope(bautizosDashScope) !== 'all';
    const donationsInRecaudadoCard = bautizosScopedFinances ? 0 : donationsTotalForBalance;
    const paidDisplayedTotal = globalTableStatsRecaudado.paid + donationsInRecaudadoCard;
    const pendienteDisplayed = globalTableStatsPendiente.pending;
    /** Totales globales con el mismo alcance que cada torta Bautizos (filtros propios por tarjeta). */
    const globalLocChartTableStats = reduceGlobalTableStats(tableByLocationLocChart);
    const globalBzCompSplitStats = reduceGlobalTableStats(tableByLocationBautizosCompSplit);
    const globalBzTransportCarStats = reduceGlobalTableStats(tableByLocationBautizosTransportCar);
    const bautizosLocChartAr = globalBzCompSplitStats.activeRegistrants || 0;
    const bautizosLocChartCo = globalBzCompSplitStats.companionsTotal || 0;
    const bautizosLocChartCompTotal = bautizosLocChartAr + bautizosLocChartCo;
    const bautizosCompSplitPieStyle =
      bautizosLocChartCompTotal <= 0
        ? { background: '#f1f5f9' }
        : {
            background: `conic-gradient(#6366f1 0% ${(bautizosLocChartAr / bautizosLocChartCompTotal) * 100}%, #14b8a6 ${(bautizosLocChartAr / bautizosLocChartCompTotal) * 100}% 100%)`,
          };
    const bautizosTr = globalBzTransportCarStats.bautizosTransport || 0;
    const bautizosCr = globalBzTransportCarStats.bautizosCarro || 0;
    const bautizosTrCarTotal = bautizosTr + bautizosCr;
    const bautizosTransportCarPieStyle =
      bautizosTrCarTotal <= 0
        ? { background: '#f1f5f9' }
        : {
            background: `conic-gradient(#4f46e5 0% ${(bautizosTr / bautizosTrCarTotal) * 100}%, #f59e0b ${(bautizosTr / bautizosTrCarTotal) * 100}% 100%)`,
          };

    /** Misma base que tabla + gráficas por sede: filtros activos y bruto/neto según el botón de comisión. */
    const paidFromRegistrationsFiltered = globalTableStats.paid;
    /** Balance neto: alcance propio de la tarjeta (dashBalance). En Bautizos usa la misma tabla filtrada por Todos/Bautizados/Acompañantes. */
    const sBalCard = getDashboardSummaryForCampaScope('dashBalance');
    const recaudadoAllForBalanceNeto = isBautizos
      ? globalTableStatsBalance.paid
      : showGrossWithoutCommission
        ? (sBalCard.globalStats.all.paidGross ?? sBalCard.globalStats.all.paid)
        : sBalCard.globalStats.all.paid;
    const balScope = isBautizos ? 'all' : summaryCampaScopes.dashBalance || 'all';
    const balBzScope = bautizosDashScope;
    const rosterRealCostX2ListForBalance = eventRosterRows.filter(
      (p) =>
        participantCountsAsRealCostX2(p, currentEvent) &&
        campaAttendanceScopeMatches(isCampa, p, balScope) &&
        (!isBautizos || participantMatchesBautizosDashboardPartyScope(p, balBzScope))
    );
    const totalRegsForBalanceCard = isBautizos ? globalTableStatsBalance.count : sBalCard.globalStats.all.count;
    const realCostExtraUnitsForBalance =
      rosterRealCostX2ListForBalance.length +
      (includeCortesiaInRealCost
        ? rosterCortesiaNonServerList.filter(
            (p) =>
              campaAttendanceScopeMatches(isCampa, p, balScope) &&
              (!isBautizos || participantMatchesBautizosDashboardPartyScope(p, balBzScope))
          ).length
        : 0) +
      (includeEmpleadoInRealCost
        ? rosterEmpleadoList.filter(
            (p) =>
              campaAttendanceScopeMatches(isCampa, p, balScope) &&
              (!isBautizos || participantMatchesBautizosDashboardPartyScope(p, balBzScope))
          ).length
        : 0);
    const totalPastorRealCostForBalance = sumPastorRealCostForParticipants(
      rosterPastorList.filter(
        (p) =>
          campaAttendanceScopeMatches(isCampa, p, balScope) &&
          (!isBautizos || participantMatchesBautizosDashboardPartyScope(p, balBzScope))
      ),
      currentEvent?.eventType
    );
    const totalRealCostUnitsForBalance = totalRegsForBalanceCard + realCostExtraUnitsForBalance;
    const balanceNeto =
      recaudadoAllForBalanceNeto + donationsInRecaudadoCard - realCostNum * totalRealCostUnitsForBalance - totalPastorRealCostForBalance;
    const summaryColumnKeysForEvent = getSummaryTableColumnKeysForEventType(currentEvent?.eventType);
    const isSummaryColHiddenForBautizos = (key) =>
      isBautizos && ['scholarship', 'serveNo', 'bautizos', 'teens', 'jovenes'].includes(key);
    const isSummaryColBautizosOnly = (key) =>
      ['bautizados', 'companions', 'asistentesBautizos', 'bautizosTransport', 'bautizosCarro', 'empleadosBautizos'].includes(key);
    const showSummaryTableColumn = (key) => {
      if (summaryTableColumns[key] === false) return false;
      if (isSummaryColHiddenForBautizos(key)) return false;
      if (isSummaryColBautizosOnly(key) && !isBautizos) return false;
      if (key === 'bautizos' && !isCampa) return false;
      return true;
    };
    const summaryColumnHeaderLabel = (key) => SUMMARY_TABLE_COLUMN_LABELS[key] || key;
    const getSummaryStatValue = (statsObj, colKey) => {
      if (colKey === 'serveYes') return statsObj.servers;
      if (colKey === 'serveNo') return statsObj.serveNo;
      return statsObj[colKey];
    };
    const summaryVisibleColCount = 1 + summaryColumnKeysForEvent.filter((k) => showSummaryTableColumn(k)).length;
    /** Tabla auto + min-widths + nowrap: evita columnas encimadas con muchas columnas (table-fixed forzaba anchos incompatibles con min-w). */
    const sumStickyLocBase =
      'sticky left-0 z-[2] border-r border-slate-200/90 dark:border-slate-600 shadow-[4px_0_8px_-4px_rgba(15,23,42,0.12)] dark:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.35)]';
    const sumHeadLoc = `${sumStickyLocBase} z-[3] px-3 py-3 text-left align-middle bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider font-black border-b border-slate-100 dark:border-slate-700 whitespace-nowrap min-w-[7rem] max-w-[14rem]`;
    const sumHeadNum = 'px-3 py-3 text-center align-middle bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider font-black border-b border-slate-100 dark:border-slate-700 leading-tight whitespace-nowrap min-w-[2.85rem]';
    const sumHeadMoney = 'px-3 py-3 text-right align-middle bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider font-black border-b border-slate-100 dark:border-slate-700 leading-tight whitespace-nowrap min-w-[5rem]';
    const sumCellLoc = `${sumStickyLocBase} px-3 py-2.5 text-left align-middle min-w-[7rem] max-w-[14rem] font-bold text-slate-700 dark:text-slate-200 truncate bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/90`;
    const sumCellNum = 'px-3 py-2.5 text-center align-middle tabular-nums whitespace-nowrap min-w-[2.85rem]';
    const sumCellMoney = 'px-3 py-2.5 text-right align-middle tabular-nums whitespace-nowrap min-w-[5rem]';
    const sumFootLoc = `${sumStickyLocBase} px-3 py-3 text-left align-middle min-w-[7rem] max-w-[14rem] font-black text-indigo-900 dark:text-indigo-100 uppercase bg-indigo-50 dark:bg-slate-800`;
    const sumFootNum =
      'px-3 py-3 text-center align-middle tabular-nums whitespace-nowrap min-w-[2.85rem] font-black bg-indigo-50 dark:bg-slate-800';
    const sumFootMoney =
      'px-3 py-3 text-right align-middle tabular-nums whitespace-nowrap min-w-[5rem] font-black bg-indigo-50 dark:bg-slate-800';
    const sumCellClick =
      'cursor-pointer hover:bg-indigo-50/80 dark:hover:bg-slate-700/90 focus-visible:outline focus-visible:ring-2 focus-visible:ring-indigo-400 dark:focus-visible:ring-indigo-500 rounded-md transition-colors';

    const summaryColBodyClass = (key) => {
      const num = `${sumCellNum} ${sumCellClick}`;
      switch (key) {
        case 'scholarship': return `${num} text-purple-700 font-bold`;
        case 'serveYes': return `${num} text-amber-700 font-bold`;
        case 'serveNo': return `${num} text-slate-600 font-bold`;
        case 'bautizos': return `${num} text-sky-700 font-bold`;
        case 'teens': return `${num} text-indigo-700 font-bold`;
        case 'jovenes': return `${num} text-blue-700 font-bold`;
        case 'companions': return `${num} text-teal-700 font-bold`;
        case 'asistentesBautizos': return `${num} text-amber-700 font-bold`;
        case 'bautizados': return `${num} text-violet-700 dark:text-violet-300 font-bold`;
        case 'bautizosTransport': return `${num} text-indigo-700 font-bold`;
        case 'bautizosCarro': return `${num} text-cyan-700 font-bold`;
        case 'empleadosBautizos': return `${num} text-teal-700 font-bold`;
        case 'cancelled': return `${num} text-slate-700 font-bold`;
        case 'waitlist': return `${num} text-amber-700 font-bold`;
        case 'refund': return `${num} text-amber-700 font-bold`;
        case 'cortesia': return `${num} text-fuchsia-700 font-bold`;
        case 'count': return `${num} font-medium text-slate-700`;
        default: return `${num} font-medium text-slate-700`;
      }
    };
    const summaryColFootClass = (key) => {
      const num = `${sumFootNum} ${sumCellClick}`;
      switch (key) {
        case 'scholarship': return `${num} text-purple-700 dark:text-purple-300`;
        case 'serveYes': return `${num} text-amber-700 dark:text-amber-300`;
        case 'serveNo': return `${num} text-slate-700 dark:text-slate-200`;
        case 'bautizos': return `${num} text-sky-700 dark:text-sky-300`;
        case 'teens': return `${num} text-indigo-700 dark:text-indigo-300`;
        case 'jovenes': return `${num} text-blue-700 dark:text-blue-300`;
        case 'companions': return `${num} text-teal-700 dark:text-teal-300`;
        case 'asistentesBautizos': return `${num} text-amber-700 dark:text-amber-300`;
        case 'bautizados': return `${num} text-violet-700 dark:text-violet-300`;
        case 'bautizosTransport': return `${num} text-indigo-700 dark:text-indigo-300`;
        case 'bautizosCarro': return `${num} text-cyan-700 dark:text-cyan-300`;
        case 'empleadosBautizos': return `${num} text-teal-700 dark:text-teal-300`;
        case 'cancelled': return `${num} text-slate-700 dark:text-slate-200`;
        case 'waitlist': return `${num} text-amber-700 dark:text-amber-300`;
        case 'refund': return `${num} text-amber-700 dark:text-amber-300`;
        case 'cortesia': return `${num} text-fuchsia-700 dark:text-fuchsia-300`;
        case 'count': return `${num} text-indigo-900 dark:text-indigo-100`;
        default: return `${num} text-indigo-900 dark:text-indigo-100`;
      }
    };
    const summaryMoneyBodyClass = (key) => {
      const base = `${sumCellMoney} ${sumCellClick}`;
      switch (key) {
        case 'paid': return `${base} font-bold text-green-600`;
        case 'donations': return `${base} font-bold text-emerald-700`;
        case 'paidEfectivo': return `${base} font-bold text-emerald-700`;
        case 'paidTarjeta': return `${base} font-bold text-indigo-700`;
        case 'pending': return `${base} font-bold text-orange-500`;
        default: return `${base} font-black text-slate-800`;
      }
    };
    const summaryMoneyFootClass = (key) => {
      const base = `${sumFootMoney} ${sumCellClick}`;
      switch (key) {
        case 'paid': return `${base} text-green-700 dark:text-green-400`;
        case 'donations': return `${base} text-emerald-700 dark:text-emerald-400`;
        case 'paidEfectivo': return `${base} text-emerald-800 dark:text-emerald-400`;
        case 'paidTarjeta': return `${base} text-indigo-800 dark:text-indigo-300`;
        case 'pending': return `${base} text-orange-600 dark:text-orange-400`;
        default: return `${base} text-indigo-900 dark:text-indigo-100`;
      }
    };

    const participantMatchesSummaryMetric = (p, metric) => {
      const evCampa = currentEvent?.eventType === 'Campa';
      const liq = getLiquidationTarget(p);
      const paidGross = getParticipantNetPaidFromHistory(p, computeNetAmountByMethod);
      const isCancelled = participantIsCancelled(p);
      switch (metric) {
        case 'count':
          return !isCancelled;
        case 'scholarship':
          return !isCancelled && isSiValue(p.isScholarship);
        case 'serveYes':
          return !isCancelled && (
            currentEvent?.eventType === 'Bautizos'
              ? bautizosParticipatesAsServer(p)
              : isSiValue(p.isServer)
          );
        case 'serveNo':
          return !isCancelled && (
            currentEvent?.eventType === 'Bautizos'
              ? !bautizosParticipatesAsServer(p)
              : !isSiValue(p.isServer)
          );
        case 'bautizos':
          return evCampa && !isCancelled && isSiValue(p.willBeBaptized);
        case 'teens': {
          if (!evCampa || isCancelled) return false;
          if (isSiValue(p.isServer)) {
            const sa = String(p.serverAssignment || '').trim();
            return sa === 'Teens' || sa === 'Ambos';
          }
          const ageNum = parseInt(p.age, 10);
          const assignment = String(p.campAssignment || (ageNum < 18 ? 'Teens' : 'Jóvenes')).trim();
          return assignment === 'Teens';
        }
        case 'jovenes': {
          if (!evCampa || isCancelled) return false;
          if (isSiValue(p.isServer)) {
            const sa = String(p.serverAssignment || '').trim();
            return sa === 'Jóvenes' || sa === 'Ambos';
          }
          const ageNum = parseInt(p.age, 10);
          const assignment = String(p.campAssignment || (ageNum < 18 ? 'Teens' : 'Jóvenes')).trim();
          return assignment === 'Jóvenes';
        }
        case 'cancelled':
          return isCancelled;
        case 'waitlist':
          return participantIsWaitlistRow(p);
        case 'refund':
          return getCancelledRefundPendingAmount(p) > 0;
        case 'paid':
          return true;
        case 'paidEfectivo': {
          const pm = getPersonRecaudadoByPaymentMethod(p);
          return pm.hasEfectivoPayment;
        }
        case 'paidTarjeta': {
          const pm = getPersonRecaudadoByPaymentMethod(p);
          return pm.hasTarjetaPayment;
        }
        case 'pending':
          return getParticipantOutstandingGross(p, getLiquidationTarget, computeNetAmountByMethod) > 0;
        case 'cortesia':
          return (
            !isCancelled &&
            (currentEvent?.eventType === 'Bautizos'
              ? normalizeBautizosAttendanceType(p.bautizosAttendanceType) === BAUTIZOS_ATTENDANCE.cortesia
              : normalizeAttendanceSpecial(p) === ATTENDANCE_SPECIAL.cortesia)
          );
        case 'expected':
          return true;
        case 'empleadosBautizos':
          return (
            !isCancelled &&
            currentEvent?.eventType === 'Bautizos' &&
            normalizeBautizosAttendanceType(p.bautizosAttendanceType) === BAUTIZOS_ATTENDANCE.empleado
          );
        case 'pastores':
          return !isCancelled && isPastorParticipant(p, currentEvent?.eventType);
        case 'asistentesBautizos':
          return (
            !isCancelled &&
            currentEvent?.eventType === 'Bautizos' &&
            normalizeBautizosAttendanceType(p.bautizosAttendanceType) === BAUTIZOS_ATTENDANCE.asistente
          );
        case 'bautizados':
          return !isCancelled && currentEvent?.eventType === 'Bautizos' && participantHasBaptismChip(p, 'Bautizos');
        case 'companions':
        case 'bautizosTransport':
        case 'bautizosCarro':
          return false;
        default:
          return false;
      }
    };

    const getParticipantsForSummaryCell = (scope, locationLabel, metric) => {
      const tableScope = summaryCampaScopes.tableDetails || 'all';
      const locs = scope === 'global' ? dashboardLocs : [locationLabel];
      const locSet = new Set(locs.map((l) => String(l).trim()));

      const buildBautizosCanonicalForTable = () => {
        const allRows = dashboardLocs.flatMap((l) => applySummaryLikeFilters(data[l] || [], tableScope));
        return buildBautizosCanonicalCompanionPlan(
          allRows,
          buildActiveRegistrantMetaForCompanionDedupe(allRows.filter((p) => !participantIsCancelled(p))),
          { includeBaptizedCompanions: true }
        );
      };

      const buildBautizosWaitlistCanonicalForTable = () => {
        const activeRows = dashboardLocs.flatMap((l) =>
          applySummaryLikeFilters(data[l] || [], tableScope, { skipBautizosParty: true })
        );
        const waitlistTitulars = dashboardLocs.flatMap((l) =>
          applySummaryLikeFilters(waitlistData[l] || [], tableScope, { skipBautizosParty: true })
        );
        const rosterById = new Map();
        for (const p of activeRows) {
          const id = String(p?.id || '').trim();
          if (id) rosterById.set(id, p);
        }
        for (const p of waitlistTitulars) {
          const id = String(p?.id || '').trim();
          if (id) rosterById.set(id, p);
        }
        const roster = [...rosterById.values()];
        return buildBautizosCanonicalCompanionPlan(
          roster,
          buildActiveRegistrantMetaForCompanionDedupe(roster.filter((p) => !participantIsCancelled(p))),
          { includeBaptizedCompanions: true, waitlistOnly: true }
        );
      };

      if (isBautizos && metric === 'companions') {
        const plan = buildBautizosCanonicalForTable();
        const out = [];
        for (const info of plan.values()) {
          if (participantIsCancelled(info.sourceRegistrant)) continue;
          const sloc = String(info.sourceRegistrant.location || '').trim();
          if (!locSet.has(sloc)) continue;
          const c = info.sourceCompanion || {};
          if (isBautizosCompanionBaptized(c)) continue;
          out.push({
            id: `sum-comp-${String(info.canonKey).replace(/[^a-z0-9:]/gi, '_')}`,
            __summaryCompanionRow: true,
            displayName: String(c.name || '').trim(),
            hostName: String(info.sourceRegistrant.name || '').trim(),
            location: sloc,
          });
        }
        out.sort((a, b) => a.displayName.localeCompare(b.displayName, 'es'));
        return out;
      }

      if (isBautizos && metric === 'count') {
        const parts = [];
        const seen = new Set();
        for (const loc of locs) {
          const filtered = applySummaryLikeFilters(data[loc] || [], tableScope);
          for (const p of filtered) {
            if (!participantMatchesSummaryMetric(p, 'count')) continue;
            const id = String(p.id);
            if (seen.has(id)) continue;
            seen.add(id);
            parts.push(p);
          }
        }
        const compRows = (() => {
          const plan = buildBautizosCanonicalForTable();
          const cOut = [];
          for (const info of plan.values()) {
            if (participantIsCancelled(info.sourceRegistrant)) continue;
            const sloc = String(info.sourceRegistrant.location || '').trim();
            if (!locSet.has(sloc)) continue;
            const c = info.sourceCompanion || {};
            cOut.push({
              id: `sum-comp-${String(info.canonKey).replace(/[^a-z0-9:]/gi, '_')}-c`,
              __summaryCompanionRow: true,
              displayName: String(c.name || '').trim(),
              hostName: String(info.sourceRegistrant.name || '').trim(),
              location: sloc,
            });
          }
          return cOut;
        })();
        const all = [...parts, ...compRows];
        all.sort((a, b) => {
          const na = a.__summaryCompanionRow ? a.displayName : a.name || '';
          const nb = b.__summaryCompanionRow ? b.displayName : b.name || '';
          return na.localeCompare(nb, 'es');
        });
        return all;
      }

      if (isBautizos && metric === 'waitlist') {
        const parts = [];
        const seen = new Set();
        for (const loc of locs) {
          const filtered = applySummaryLikeFilters(waitlistData[loc] || [], tableScope, { skipBautizosParty: true });
          for (const p of filtered) {
            if (!bautizosDashboardTitularCountsForScope(p, bautizosDashScope)) continue;
            if (!participantMatchesSummaryMetric(p, 'waitlist')) continue;
            const id = String(p.id);
            if (seen.has(id)) continue;
            seen.add(id);
            parts.push(p);
          }
        }
        const plan = buildBautizosWaitlistCanonicalForTable();
        const compRows = [];
        for (const info of plan.values()) {
          if (participantIsCancelled(info.sourceRegistrant)) continue;
          const sloc = String(info.sourceRegistrant.location || '').trim();
          if (!locSet.has(sloc)) continue;
          const c = info.sourceCompanion || {};
          if (!String(c?.name || '').trim()) continue;
          if (!bautizosDashboardCompanionCountsForScope(c, bautizosDashScope, info.sourceRegistrant)) continue;
          compRows.push({
            id: `sum-wl-comp-${String(info.canonKey).replace(/[^a-z0-9:]/gi, '_')}`,
            __summaryCompanionRow: true,
            displayName: String(c.name || '').trim(),
            hostName: String(info.sourceRegistrant.name || '').trim(),
            location: sloc,
          });
        }
        const all = [...parts, ...compRows];
        all.sort((a, b) => {
          const na = a.__summaryCompanionRow ? a.displayName : a.name || '';
          const nb = b.__summaryCompanionRow ? b.displayName : b.name || '';
          return na.localeCompare(nb, 'es');
        });
        return all;
      }

      if (isBautizos && metric === 'bautizados') {
        const parts = [];
        const seen = new Set();
        for (const loc of locs) {
          const filtered = applySummaryLikeFilters(data[loc] || [], tableScope);
          for (const p of filtered) {
            if (!participantMatchesSummaryMetric(p, 'bautizados')) continue;
            const id = String(p.id);
            if (seen.has(id)) continue;
            seen.add(id);
            parts.push(p);
          }
        }
        const plan = buildBautizosCanonicalForTable();
        const compRows = [];
        for (const info of plan.values()) {
          if (participantIsCancelled(info.sourceRegistrant)) continue;
          const sloc = String(info.sourceRegistrant.location || '').trim();
          if (!locSet.has(sloc)) continue;
          const c = info.sourceCompanion || {};
          if (!String(c?.name || '').trim() || !isBautizosCompanionBaptized(c)) continue;
          compRows.push({
            id: `sum-bz-${String(info.canonKey).replace(/[^a-z0-9:]/gi, '_')}-bd`,
            __summaryCompanionRow: true,
            displayName: String(c.name || '').trim(),
            hostName: String(info.sourceRegistrant.name || '').trim(),
            location: sloc,
          });
        }
        const all = [...parts, ...compRows];
        all.sort((a, b) => {
          const na = a.__summaryCompanionRow ? a.displayName : a.name || '';
          const nb = b.__summaryCompanionRow ? b.displayName : b.name || '';
          return na.localeCompare(nb, 'es');
        });
        return all;
      }

      if (isBautizos && metric === 'bautizosTransport') {
        const out = [];
        const seen = new Set();
        const pushRow = (row) => {
          if (seen.has(row.id)) return;
          seen.add(row.id);
          out.push(row);
        };
        for (const loc of locs) {
          const filtered = applySummaryLikeFilters(data[loc] || [], tableScope);
          for (const p of filtered) {
            if (participantIsCancelled(p)) continue;
            if (!isSiValue(p.wantsBautizosTransport)) continue;
            pushRow({
              id: `bzt-sum-${p.id}-reg`,
              __summaryTransportRow: true,
              displayName: String(p.name || '').trim() || '—',
              lineKind: 'Inscrito',
              registradoName: '',
              location: String(p.location || '').trim() || '—',
              transportSummary: resolveTransportSummary(p, 'Bautizos', currentEvent),
            });
          }
          for (const p of filtered) {
            if (participantIsCancelled(p)) continue;
            const comps = getBautizosCompanionsArray(p);
            for (let i = 0; i < comps.length; i += 1) {
              const row = comps[i] || {};
              if (!String(row?.name || '').trim() || !isBautizosCompanionBaptized(row)) continue;
              if (!isSiValue(row.wantsBautizosTransport) || isBautizosLapInfantCompanion(row, currentEvent)) continue;
              const vline = { ...row, travelFrom: row.travelFrom || p.travelFrom, travelTo: row.travelTo || p.travelTo, location: p.location };
              pushRow({
                id: `bzt-sum-${p.id}-vb-${i}`,
                __summaryTransportRow: true,
                displayName: String(row.name || '').trim(),
                lineKind: 'Bautizado (acompañante)',
                registradoName: String(p.name || '').trim(),
                location: String(p.location || '').trim() || '—',
                transportSummary: resolveTransportSummary(vline, 'Bautizos', currentEvent),
              });
            }
          }
        }
        const plan = buildBautizosCanonicalForTable();
        for (const info of plan.values()) {
          if (participantIsCancelled(info.sourceRegistrant)) continue;
          const sloc = String(info.sourceRegistrant.location || '').trim();
          if (!locSet.has(sloc)) continue;
          const c = info.sourceCompanion || {};
          const companionName = String(c?.name || '').trim();
          if (!companionName || !isSiValue(c?.wantsBautizosTransport) || isBautizosLapInfantCompanion(c, currentEvent)) continue;
          const host = info.sourceRegistrant || {};
          const lineLike = {
            wantsBautizosTransport: c.wantsBautizosTransport,
            llegaEnCarro: c.llegaEnCarro,
            regresaEnCarro: c.regresaEnCarro,
            travelFrom: c.travelFrom,
            travelTo: c.travelTo,
            location: host.location,
          };
          pushRow({
            id: `bzt-sum-${String(info.canonKey).replace(/[^a-z0-9]/gi, '_')}`,
            __summaryTransportRow: true,
            displayName: companionName,
            lineKind: 'Acompañante',
            registradoName: String(host.name || '').trim(),
            location: sloc || '—',
            transportSummary: resolveTransportSummary(lineLike, 'Bautizos', currentEvent),
          });
        }
        out.sort((a, b) => {
          const la = String(a.location || '').localeCompare(String(b.location || ''));
          if (la !== 0) return la;
          return String(a.displayName || '').localeCompare(String(b.displayName || ''), 'es');
        });
        return out;
      }

      if (isBautizos && metric === 'bautizosCarro') {
        const out = [];
        const seen = new Set();
        const pushCar = (cid, displayName, lineKind, registradoName, location, lineLike) => {
          if (!bautizosLineGoesByCar(lineLike)) return;
          if (seen.has(cid)) return;
          seen.add(cid);
          out.push({
            id: cid,
            __summaryCarRow: true,
            displayName,
            lineKind,
            registradoName,
            location: String(location || '').trim() || '—',
            cars: resolveLlegaEnCarro(lineLike) ? normalizeArrivalCarCount(lineLike?.carrosLlegada) : 0,
            transportSummary: resolveTransportSummary(lineLike, 'Bautizos', currentEvent),
          });
        };
        for (const loc of locs) {
          const filtered = applySummaryLikeFilters(data[loc] || [], tableScope);
          for (const p of filtered) {
            if (participantIsCancelled(p)) continue;
            pushCar(`bzc-sum-${p.id}-reg`, String(p.name || '').trim() || '—', 'Inscrito', '', p.location, p);
            const comps = getBautizosCompanionsArray(p);
            for (let i = 0; i < comps.length; i += 1) {
              const row = comps[i] || {};
              if (!String(row?.name || '').trim() || !isBautizosCompanionBaptized(row)) continue;
              const vline = {
                ...row,
                travelFrom: row.travelFrom || p.travelFrom,
                travelTo: row.travelTo || p.travelTo,
                location: p.location,
                transportType: row.transportType || p.transportType,
              };
              pushCar(
                `bzc-sum-${p.id}-vb-${i}`,
                String(row.name || '').trim(),
                'Bautizado (acompañante)',
                String(p.name || '').trim(),
                p.location,
                vline
              );
            }
          }
        }
        const plan = buildBautizosCanonicalForTable();
        for (const info of plan.values()) {
          if (participantIsCancelled(info.sourceRegistrant)) continue;
          const sloc = String(info.sourceRegistrant.location || '').trim();
          if (!locSet.has(sloc)) continue;
          const c = info.sourceCompanion || {};
          const companionName = String(c?.name || '').trim();
          if (!companionName) continue;
          const host = info.sourceRegistrant || {};
          pushCar(
            `bzc-sum-${String(info.canonKey).replace(/[^a-z0-9]/gi, '_')}`,
            companionName,
            'Acompañante',
            String(host.name || '').trim(),
            host.location,
            c
          );
        }
        out.sort((a, b) => {
          const la = String(a.location || '').localeCompare(String(b.location || ''));
          if (la !== 0) return la;
          return String(a.displayName || '').localeCompare(String(b.displayName || ''), 'es');
        });
        return out;
      }

      if (metric === 'cancelled' || metric === 'refund') {
        const cxlOut = [];
        const cxlSeen = new Set();
        for (const loc of locs) {
          let rows = applySummaryLikeFilters(cancelledData[loc] || [], tableScope, { skipBautizosParty: true });
          if (isBautizos) {
            rows = rows.filter((p) => bautizosDashboardTitularCountsForScope(p, bautizosDashScope));
          }
          for (const p of rows) {
            if (!participantMatchesSummaryMetric(p, metric)) continue;
            const id = String(p.id);
            if (cxlSeen.has(id)) continue;
            cxlSeen.add(id);
            cxlOut.push(p);
          }
        }
        cxlOut.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es'));
        return cxlOut;
      }

      const out = [];
      const seenIds = new Set();
      const summaryRowsForMetric = (locLabel) => {
        if (metric === 'waitlist') return waitlistData[locLabel] || [];
        return data[locLabel] || [];
      };
      for (const loc of locs) {
        const filtered = applySummaryLikeFilters(
          summaryRowsForMetric(loc),
          tableScope,
          metric === 'waitlist' ? { skipBautizosParty: true } : null
        );
        for (const p of filtered) {
          if (!participantMatchesSummaryMetric(p, metric)) continue;
          const id = String(p.id);
          if (seenIds.has(id)) continue;
          seenIds.add(id);
          out.push(p);
        }
      }
      out.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es'));
      return out;
    };

    const summaryMetricLabels = {
      count: 'Inscritos',
      bautizados: 'Bautizados',
      companions: 'Acompañantes',
      asistentesBautizos: 'Asistentes',
      bautizosTransport: 'Transporte del evento',
      bautizosCarro: 'Llevan carro',
      empleadosBautizos: 'Empleados',
      scholarship: 'Becados',
      serveYes: 'Servidores',
      serveNo: 'Camperos',
      bautizos: 'Bautizos',
      teens: 'Teens',
      jovenes: 'Jóvenes',
      cancelled: 'Cancelados',
      waitlist: 'Lista de espera',
      refund: 'Con devolución pendiente',
      donations: 'Donaciones',
      paid: 'Recaudado',
      paidEfectivo: 'Recaudado (efectivo)',
      paidTarjeta: 'Recaudado (tarjeta)',
      pending: 'Saldo pendiente',
      cortesia: 'Cortesías',
      expected: 'Total esperado (meta a liquidar)',
    };

    const summaryCellModalRows =
      summaryCellDetailModal.isOpen && summaryCellDetailModal.metric !== 'donations'
        ? getParticipantsForSummaryCell(summaryCellDetailModal.scope, summaryCellDetailModal.locationLabel, summaryCellDetailModal.metric)
        : [];
    const summaryCellModalDonations =
      summaryCellDetailModal.isOpen && summaryCellDetailModal.metric === 'donations'
        ? (() => {
            const evId = currentEvent?.id;
            if (!evId) return [];
            let list = mergeEventDonationsForEvent(evId, donations, allParticipants).filter(donationInDashboardLoc);
            if (summaryCellDetailModal.scope === 'location') {
              list = list.filter(
                (d) => String(d.location || '').trim() === String(summaryCellDetailModal.locationLabel || '').trim()
              );
            }
            list.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
            return list;
          })()
        : [];

    const openSummaryCellModal = (scope, locationLabel, metric) => {
      setSummaryCellDetailModal({ isOpen: true, scope, locationLabel, metric });
    };

    const sortedDynamicPhases = [...(currentEvent?.dynamicPrices || [])].sort((a, b) =>
      String(a.dateUntil || '').localeCompare(String(b.dateUntil || ''))
    );
    const sortedDynamicServerPhases = [...(currentEvent?.dynamicServerPrices || [])].sort((a, b) =>
      String(a.dateUntil || '').localeCompare(String(b.dateUntil || ''))
    );
    const hasIndependentServerPhases = sortedDynamicServerPhases.length > 0;
    const hasLegacyCoupledPhases =
      !hasIndependentServerPhases &&
      currentEvent?.pricingType === 'dynamic' &&
      sortedDynamicPhases.some(tierHasServerPricesInCamperTier);
    const discountCampaignsList = Array.isArray(currentEvent?.discountCampaigns) ? currentEvent.discountCampaigns : [];
    const todayIsoPricing = new Date().toISOString().split('T')[0];
    const fmtPriceDash = (n) => (canSeeMoney ? formatMoney(Number(n) || 0) : '$***');
    const bautizosDashBreakdown = isBautizos ? getBautizosListPriceBreakdown(currentEvent) : null;
    /** Dashboard · tarjeta precios: solo Campa usa «Lista campista». */
    const dashListPriceLabel = isCampa ? 'Lista campista' : 'Precio de lista';
    const renderDashPriceRows = (tier) => {
      const t = normalizeServerTierCosts(tier.globalCost, tier);
      return (
        <div className="space-y-1.5">
          <div className="grid grid-cols-[1fr_auto] gap-x-2 text-[11px]">
            <span className="text-slate-600">{dashListPriceLabel}</span>
            <span className="font-black text-slate-900 tabular-nums text-right">{fmtPriceDash(t.global)}</span>
          </div>
          {isCampa ? (
            <>
              <div className="grid grid-cols-[1fr_auto] gap-x-2 text-[11px]">
                <span className="text-slate-600">Servidor · Teens</span>
                <span className="font-black text-slate-900 tabular-nums text-right">{fmtPriceDash(t.serverTeens)}</span>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-x-2 text-[11px]">
                <span className="text-slate-600">Servidor · Jóvenes</span>
                <span className="font-black text-slate-900 tabular-nums text-right">{fmtPriceDash(t.serverJovenes)}</span>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-x-2 text-[11px]">
                <span className="text-slate-600">Servidor · Ambos</span>
                <span className="font-black text-slate-900 tabular-nums text-right">{fmtPriceDash(t.serverAmbos ?? t.server)}</span>
              </div>
            </>
          ) : null}
        </div>
      );
    };
    const renderDashServerOnlyRows = (tier) => {
      const t = normalizeServerTierCosts(0, tier);
      return (
        <div className="space-y-1.5">
          <div className="grid grid-cols-[1fr_auto] gap-x-2 text-[11px]">
            <span className="text-slate-600">Servidor · Teens</span>
            <span className="font-black text-slate-900 tabular-nums text-right">{fmtPriceDash(t.serverTeens)}</span>
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-x-2 text-[11px]">
            <span className="text-slate-600">Servidor · Jóvenes</span>
            <span className="font-black text-slate-900 tabular-nums text-right">{fmtPriceDash(t.serverJovenes)}</span>
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-x-2 text-[11px]">
            <span className="text-slate-600">Servidor · Ambos</span>
            <span className="font-black text-slate-900 tabular-nums text-right">{fmtPriceDash(t.serverAmbos ?? t.server)}</span>
          </div>
        </div>
      );
    };

    return (
      <>
      <div className={`p-6 space-y-8 ${isBautizos ? 'pb-32' : ''}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 shrink-0">Dashboard</h1>
            {!dashboardHasFullLocationAccess && dashboardLocs.length > 0 && dashboardLocs.length < (currentEvent?.locations || []).length ? (
              <p className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 mt-1 leading-snug">
                Sedes incluidas en este resumen: {dashboardLocs.join(', ')}.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 shrink-0 w-full sm:w-auto sm:max-w-[min(100%,42rem)]">
            {hasAdminRights && (
              <>
                <button
                  type="button"
                  onClick={() => setPublicQrModalOpen(true)}
                  className={`${DASH_TOP_BTN} ${DASH_TOP_BTN_NEUTRAL} sm:min-w-[9.25rem]`}
                  title="Registro público (QR)"
                >
                  <QrCode size={16} className="shrink-0 text-indigo-600" />
                  <span>QR</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const legacy = String(currentEvent?.responsivaDigitalText || '');
                    setEventResponsivaTextMinorsDraft(String(currentEvent?.responsivaDigitalTextMinors ?? legacy));
                    setEventResponsivaTextAdultsDraft(String(currentEvent?.responsivaDigitalTextAdults ?? legacy));
                    setEventResponsivaEnabledDraft(isResponsivaEnabledForEvent(currentEvent));
                    setEventResponsivaDigitalEnabledDraft(currentEvent?.responsivaDigitalEnabled !== false);
                    setEventResponsivaGeneralMinorsDraft(isResponsivaGeneralMinorsBranchEnabled(currentEvent));
                    setEventResponsivaGeneralAdultsDraft(isResponsivaGeneralAdultsBranchEnabled(currentEvent));
                    setEventResponsivaDigitalMinorsDraft(isResponsivaDigitalMinorsBranchEnabled(currentEvent));
                    setEventResponsivaDigitalAdultsDraft(isResponsivaDigitalAdultsBranchEnabled(currentEvent));
                    setResponsivaDigitalTextModalOpen(true);
                  }}
                  className={`${DASH_TOP_BTN} ${DASH_TOP_BTN_NEUTRAL} sm:min-w-[9.25rem]`}
                  title="Responsiva: activación, alcance por edad (general y digital) y textos de firma"
                >
                  <FileText size={16} className="shrink-0 text-violet-600" />
                  <span>Responsiva</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCupoSedeOpen((prev) => !prev)}
                  className={`${DASH_TOP_BTN} sm:min-w-[9.25rem] ${
                    cupoSedeOpen
                      ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                      : DASH_TOP_BTN_NEUTRAL
                  }`}
                  title="Cupo por sede"
                  aria-pressed={cupoSedeOpen}
                >
                  <Users size={16} className="shrink-0 text-indigo-600" />
                  <span>Ver cupo</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditorRegFieldsScope('event');
                    setEditorRegFieldsForm(mergeEditorRegistrationFieldVisibility(editorRegistrationFieldVis));
                    setEditorRegFieldsModalOpen(true);
                  }}
                  className={`${DASH_TOP_BTN} sm:min-w-[9.25rem] bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-600 dark:hover:bg-emerald-700 dark:text-white dark:border-emerald-700`}
                  title="Campos visibles para Editor (en este evento o por tipo)"
                >
                  <ClipboardList size={16} className="shrink-0 text-emerald-600 dark:text-emerald-100" />
                  <span>Campos Editor</span>
                </button>
              </>
            )}
            <div className="relative shrink-0" data-dropdown-root="view-settings">
              <button
                type="button"
                onClick={() => setShowViewSettings(!showViewSettings)}
                className={`${DASH_TOP_BTN} sm:min-w-[9.25rem] ${showViewSettings ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : DASH_TOP_BTN_NEUTRAL}`}
                title="Configurar tarjetas y gráficas visibles en el resumen"
              >
                <SlidersHorizontal size={16} className="shrink-0" />
                <span>Vista</span>
              </button>

              {showViewSettings && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-4 z-[70] animate-in slide-in-from-top-2">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 dark:border-slate-700 pb-2">Configurar Resumen</h4>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => {
                        const next = Object.keys(defaultViewPrefs).reduce((acc, k) => ({ ...acc, [k]: true }), {});
                        setViewPrefs(next);
                        if (currentUser?.id) localStorage.setItem(`vina_prefs_${currentUser.id}`, JSON.stringify(next));
                      }}
                      className="py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-wider"
                    >
                      Activar todas
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = Object.keys(defaultViewPrefs).reduce((acc, k) => ({ ...acc, [k]: false }), {});
                        setViewPrefs(next);
                        if (currentUser?.id) localStorage.setItem(`vina_prefs_${currentUser.id}`, JSON.stringify(next));
                      }}
                      className="py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black uppercase tracking-wider"
                    >
                      Desactivar
                    </button>
                  </div>

                  <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                    {[
                      { key: 'statsConfig', label: 'Tarjetas Principales' },
                      { key: 'chartLocations', label: 'Gráfica: Sedes' },
                      { key: 'chartBautizosCompanionSplit', label: 'Gráfica: Activos vs acompañantes', show: isBautizos },
                      { key: 'chartBautizosTransportCar', label: 'Gráfica: Transporte vs carro', show: isBautizos },
                      { key: 'chartIncome', label: 'Gráfica: Ingresos' },
                      { key: 'chartPaymentStatus', label: 'Gráfica: Estado de Pagos' },
                      { key: 'chartGender', label: 'Gráfica: Género' },
                      { key: 'chartAgeBrackets', label: 'Gráfica: Rangos de Edad' },
                      { key: 'chartBloodType', label: 'Gráfica: Tipo de Sangre', show: isCampa },
                      { key: 'chartScholarship', label: 'Gráfica: Becas', show: isCampa },
                      { key: 'chartSwimming', label: 'Gráfica: Nado', show: isCampa },
                      { key: 'chartMedical', label: 'Gráfica: Salud', show: isCampa },
                      { key: 'chartServers', label: 'Gráfica: Servidores', show: isCampa },
                      { key: 'chartAges', label: 'Gráfica: Asistencia', show: isCampa },
                      { key: 'chartBaptism', label: 'Gráfica: Bautizos', show: isCampa },
                      { key: 'chartAttendanceSpecial', label: 'Gráfica: Empleado / Cortesía', show: isCampa },
                      { key: 'chartCustom', label: 'Gráfica: Campos Extra', show: isGeneral && currentEvent?.customFields?.length > 0 },
                      { key: 'tableDetails', label: 'Tabla de Desglose General' },
                    ]
                      .filter((item) => item.show !== false)
                      .map((item) => (
                        <label key={item.key} className="flex items-center justify-between cursor-pointer p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{item.label}</span>
                          <div className="relative flex items-center">
                            <input type="checkbox" className="sr-only peer" checked={viewPrefs[item.key] !== false} onChange={() => togglePref(item.key)} />
                            <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-500"></div>
                          </div>
                        </label>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {participantsLocationIntegrity.invalid.length > 0 && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50/95 p-4 md:p-5 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="flex items-start gap-2 min-w-0">
                <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={22} aria-hidden />
                <div className="min-w-0">
                  <p className="text-sm font-black text-amber-950">Registros con sede no reconocida en este evento</p>
                  <p className="text-[11px] text-amber-900/90 mt-1 leading-snug">
                    Hay {participantsLocationIntegrity.invalid.length} registro{participantsLocationIntegrity.invalid.length === 1 ? '' : 's'} cuyo campo «sede» está vacío o no coincide con ninguna sede configurada del evento. Esos documentos{' '}
                    <strong className="font-black">no aparecen en las pestañas por sede</strong> y <strong className="font-black">no se suman en «Inscritos totales» del resumen</strong>, pero siguen en la base de datos (p. ej. tras renombrar sedes o un error al guardar). Asigna la sede correcta aquí o desde Registro Global.
                  </p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-amber-200/80 bg-white/80">
              <table className="w-full text-left text-[10px] md:text-xs">
                <thead>
                  <tr className="bg-amber-100/80 text-amber-950 uppercase tracking-wider font-black border-b border-amber-200">
                    <th className="px-3 py-2">Nombre</th>
                    <th className="px-3 py-2">Sede guardada</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2 text-right">Corregir sede</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100">
                  {participantsLocationIntegrity.invalid.slice(0, 40).map((p) => {
                    const st = p?.status || 'active';
                    const stLabel = st === 'waitlist' ? 'Lista de espera' : st === PARTICIPANT_STATUS_CANCELLED ? 'Baja' : 'Activo';
                    return (
                      <tr key={`integ-${p.id}`} className="hover:bg-amber-50/80">
                        <td className="px-3 py-2 font-bold text-slate-800">{p.name || '(sin nombre)'}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{String(p.location ?? '').trim() || '— vacío —'}</td>
                        <td className="px-3 py-2 text-slate-600">{stLabel}</td>
                        <td className="px-3 py-2 text-right">
                          {currentUser?.role !== 'Lector' ? (
                            <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                              <select
                                className="max-w-[160px] text-[10px] font-bold border border-amber-200 rounded-lg px-2 py-1 bg-white text-slate-800 outline-none focus:ring-2 focus:ring-amber-400"
                                defaultValue=""
                                onChange={(e) => {
                                  const v = e.target.value;
                                  e.target.value = '';
                                  if (v) void handleAssignParticipantLocation(p, v);
                                }}
                              >
                                <option value="">Elegir sede…</option>
                                {(currentEvent?.locations || []).map((loc) => (
                                  <option key={`fixloc-${p.id}-${loc}`} value={loc}>
                                    {loc}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-semibold">Solo lectura</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {participantsLocationIntegrity.invalid.length > 40 ? (
              <p className="text-[10px] font-bold text-amber-900/80">Mostrando 40 de {participantsLocationIntegrity.invalid.length}. Corrige y vuelve a cargar la lista, o usa Registro Global con búsqueda.</p>
            ) : null}
          </div>
        )}

        {hasAdminRights && currentEvent && responsivaDigitalTextModalOpen && (
          <div
            className={uiModal.overlay}
            onClick={() => setResponsivaDigitalTextModalOpen(false)}
            role="presentation"
          >
            <button
              type="button"
              className={uiModal.backdrop}
              onClick={() => setResponsivaDigitalTextModalOpen(false)}
              aria-label="Cerrar modal de responsiva"
            />
            <div
              className={uiModal.panel}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-labelledby="responsiva-digital-modal-title"
            >
              <div className="shrink-0 flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-slate-100 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-800/50">
                <div className="flex items-start gap-2 min-w-0">
                  <FileText className="text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" size={22} aria-hidden />
                  <div>
                    <h2 id="responsiva-digital-modal-title" className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                      Responsiva del evento
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-300 mt-1 leading-relaxed">
                      Activa la responsiva del evento, la firma digital por enlace y el alcance por edad de forma independiente:
                      responsiva general (estado en registro y papel) y firma digital (WhatsApp y página de firma) pueden activarse por separado para menores y para mayores. Edita el texto legal para cada edad; si un campo va vacío, se usa el texto único antiguo (si existe) o el predeterminado del sistema.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setResponsivaDigitalTextModalOpen(false)}
                  className={uiButtons.closeIcon}
                  aria-label="Cerrar"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="px-4 sm:px-5 pb-4 sm:pb-5 overflow-y-auto flex-1 min-h-0 space-y-4">
                <div className="rounded-xl border border-indigo-200 dark:border-indigo-500/40 bg-indigo-50/70 dark:bg-slate-900/40 p-4 space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 shrink-0 rounded border-violet-300 dark:border-violet-500 text-violet-600 focus:ring-violet-500"
                      checked={eventResponsivaEnabledDraft}
                      onChange={(e) => setEventResponsivaEnabledDraft(e.target.checked)}
                    />
                    <span className="text-xs font-black text-slate-700 dark:text-slate-100 uppercase tracking-wide leading-snug">
                      Responsiva habilitada en este evento
                    </span>
                  </label>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Si está desactivada, se ocultan pestañas, campos, filtros y acciones de responsiva en registros, resúmenes y edición.
                  </p>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 shrink-0 rounded border-violet-300 dark:border-violet-500 text-violet-600 focus:ring-violet-500"
                      checked={eventResponsivaDigitalEnabledDraft}
                      onChange={(e) => setEventResponsivaDigitalEnabledDraft(e.target.checked)}
                    />
                    <span className="text-xs font-black text-slate-700 dark:text-slate-100 uppercase tracking-wide leading-snug">Firma digital por enlace activa</span>
                  </label>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Si está desactivada, no se mostrarán botones de enlace en el registro; el texto se puede guardar para cuando
                    vuelvas a activarla.
                  </p>
                  <div className="rounded-lg border border-slate-200/80 dark:border-slate-600 bg-white/60 dark:bg-slate-950/30 p-3 space-y-2">
                    <p className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      Responsiva general (registro y papel)
                    </p>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-violet-300 dark:border-violet-500 text-violet-600 focus:ring-violet-500"
                        checked={eventResponsivaGeneralMinorsDraft}
                        onChange={(e) => setEventResponsivaGeneralMinorsDraft(e.target.checked)}
                      />
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-snug">
                        Menores de edad (menos de 18 años)
                      </span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-violet-300 dark:border-violet-500 text-violet-600 focus:ring-violet-500"
                        checked={eventResponsivaGeneralAdultsDraft}
                        onChange={(e) => setEventResponsivaGeneralAdultsDraft(e.target.checked)}
                      />
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-snug">
                        Mayores de edad (18 años o más)
                      </span>
                    </label>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed pt-0.5">
                      Define para quién es obligatorio el campo «Responsiva» en el registro y cuándo aplica entrega en papel o estado Pendiente/Entregada sin enlace.
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200/80 dark:border-slate-600 bg-white/60 dark:bg-slate-950/30 p-3 space-y-2">
                    <p className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      Firma digital por enlace (WhatsApp / página)
                    </p>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-violet-300 dark:border-violet-500 text-violet-600 focus:ring-violet-500"
                        checked={eventResponsivaDigitalMinorsDraft}
                        onChange={(e) => setEventResponsivaDigitalMinorsDraft(e.target.checked)}
                      />
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-snug">
                        Menores de edad (menos de 18 años)
                      </span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-violet-300 dark:border-violet-500 text-violet-600 focus:ring-violet-500"
                        checked={eventResponsivaDigitalAdultsDraft}
                        onChange={(e) => setEventResponsivaDigitalAdultsDraft(e.target.checked)}
                      />
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-snug">
                        Mayores de edad (18 años o más)
                      </span>
                    </label>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed pt-0.5">
                      Independiente de la responsiva general: puedes exigir solo firma digital para un grupo y solo papel para el otro, según lo marques arriba.
                    </p>
                  </div>
                </div>
                <div className="space-y-2 mt-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider" htmlFor="event-responsiva-minors">
                      Texto para participantes menores de edad
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEventResponsivaTextMinorsDraft(DEFAULT_RESPONSIVA_BODY)}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide bg-amber-50 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-500/45 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-500/30 transition-colors"
                      >
                        Predeterminado (menor)
                      </button>
                      <button
                        type="button"
                        onClick={() => setEventResponsivaTextMinorsDraft('')}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        Vaciar
                      </button>
                    </div>
                  </div>
                  <textarea
                    id="event-responsiva-minors"
                    value={eventResponsivaTextMinorsDraft}
                    onChange={(e) => setEventResponsivaTextMinorsDraft(e.target.value)}
                    rows={8}
                    className={uiTextarea.soft}
                    placeholder="Visible cuando el participante tiene menos de 18 años. Vacío = texto antiguo del evento o predeterminado de menores."
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {eventResponsivaTextMinorsDraft.length.toLocaleString('es-MX')} caracteres
                    {eventResponsivaTextMinorsDraft.trim() === '' ? ' · se usará respaldo o predeterminado de menores' : ''}
                  </p>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider" htmlFor="event-responsiva-adults">
                      Texto para participantes mayores de edad
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEventResponsivaTextAdultsDraft(DEFAULT_RESPONSIVA_BODY_ADULT)}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/45 text-indigo-900 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-500/30 transition-colors"
                      >
                        Predeterminado (mayor)
                      </button>
                      <button
                        type="button"
                        onClick={() => setEventResponsivaTextAdultsDraft('')}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        Vaciar
                      </button>
                    </div>
                  </div>
                  <textarea
                    id="event-responsiva-adults"
                    value={eventResponsivaTextAdultsDraft}
                    onChange={(e) => setEventResponsivaTextAdultsDraft(e.target.value)}
                    rows={8}
                    className={uiTextarea.soft}
                    placeholder="Visible cuando el participante tiene 18 años o más. Vacío = texto antiguo del evento o predeterminado de mayores."
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {eventResponsivaTextAdultsDraft.length.toLocaleString('es-MX')} caracteres
                    {eventResponsivaTextAdultsDraft.trim() === '' ? ' · se usará respaldo o predeterminado de mayores' : ''}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-300">
                    {(eventResponsivaTextMinorsDraft.length + eventResponsivaTextAdultsDraft.length).toLocaleString('es-MX')}{' '}
                    caracteres en total (máx. 80 000)
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await handleSaveEventResponsivaDigitalText();
                      if (ok) setResponsivaDigitalTextModalOpen(false);
                    }}
                    disabled={eventResponsivaTextSaving}
                    className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-black uppercase tracking-wide shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {eventResponsivaTextSaving ? 'Guardando…' : 'Guardar en el evento'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {summaryRosterModal.isOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col min-h-0">
              <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    {summaryRosterModal.type === 'scholarship' ? (
                      <GraduationCap size={20} className="text-purple-600" />
                    ) : summaryRosterModal.type === 'servers' ? (
                      <Users size={20} className="text-amber-600" />
                    ) : summaryRosterModal.type === 'realCostX2' ? (
                      <Scale size={20} className="text-violet-600" />
                    ) : summaryRosterModal.type === 'cortesia' ? (
                      <Gift size={20} className="text-pink-600" />
                    ) : summaryRosterModal.type === 'empleado' ? (
                      <Briefcase size={20} className="text-sky-600" />
                    ) : summaryRosterModal.type === 'bautizos_transport' ? (
                      <Bus size={20} className="text-indigo-600" />
                    ) : summaryRosterModal.type === 'bautizos_llega_carro' ? (
                      <MapPin size={20} className="text-cyan-600" />
                    ) : summaryRosterModal.type === 'bautizos_servidor' ? (
                      <Users size={20} className="text-amber-600" />
                    ) : summaryRosterModal.type === 'bautizos_cortesia' ? (
                      <Gift size={20} className="text-pink-600" />
                    ) : summaryRosterModal.type === 'bautizos_empleado' ? (
                      <Briefcase size={20} className="text-sky-600" />
                    ) : summaryRosterModal.type === 'bautizosCompanions' ? (
                      <UserPlus size={20} className="text-teal-600" />
                    ) : (
                      <Users size={20} className="text-blue-600" />
                    )}
                    {summaryRosterModal.type === 'scholarship'
                      ? 'Becados'
                      : summaryRosterModal.type === 'servers'
                        ? 'Servidores'
                        : summaryRosterModal.type === 'realCostX2'
                          ? 'Conteo x2 costo real'
                        : summaryRosterModal.type === 'cortesia'
                          ? 'Cortesías'
                          : summaryRosterModal.type === 'empleado'
                            ? 'Empleados'
                            : summaryRosterModal.type === 'bautizos_transport'
                              ? 'Transporte solicitado'
                              : summaryRosterModal.type === 'bautizos_llega_carro'
                                ? 'Lleva carro'
                              : summaryRosterModal.type === 'bautizos_servidor'
                                ? 'Servidores (bautizos)'
                                : summaryRosterModal.type === 'bautizos_cortesia'
                                  ? 'Cortesías (bautizos)'
                                  : summaryRosterModal.type === 'bautizos_empleado'
                                    ? 'Empleados (bautizos)'
                            : summaryRosterModal.type === 'bautizosCompanions'
                              ? 'Acompañantes'
                            : 'Registrados (Regulares)'}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Total:{' '}
                    <strong>
                      {summaryRosterModal.type === 'bautizosCompanions'
                        ? bautizosCompanionModalRows.length
                        : summaryRosterModal.type === 'bautizos_transport'
                          ? bautizosTransportModalRows.length
                          : summaryRosterModal.type === 'bautizos_llega_carro'
                            ? bautizosCarModalRows.length
                          : rosterListForModalFiltered.length}
                    </strong>
                    {summaryRosterModal.type === 'bautizos_llega_carro' ? ` · Carros registrados: ${bautizosDashCarsTotal}` : ''}
                    {summaryRosterModal.type === 'regular' && (attendanceEmpleadoList.length > 0 || attendanceCortesiaList.length > 0)
                      ? ` · Empleado: ${attendanceEmpleadoList.length} · Cortesía: ${attendanceCortesiaList.length}`
                      : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSummaryRosterModal({ isOpen: false, type: summaryRosterModal.type })}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
                  title="Cerrar"
                >
                  <XCircle size={22} />
                </button>
              </div>

              {summaryRosterModal.type === 'regular' && (
                <div className="p-6 border-b border-slate-100 bg-teal-50/20 shrink-0">
                  <div className={`grid grid-cols-1 gap-3 ${isDesayunoEvent ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
                    <div className="rounded-xl border border-teal-100 bg-white p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-teal-800">Empleado (sin cobro)</p>
                      <p className="text-2xl font-black text-slate-800">{attendanceEmpleadoList.length}</p>
                    </div>
                    <div className="rounded-xl border border-fuchsia-100 bg-white p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-fuchsia-800">Cortesía (sin cobro)</p>
                      <p className="text-2xl font-black text-slate-800">{attendanceCortesiaList.length}</p>
                    </div>
                    {!isDesayunoEvent && (
                      <div className="rounded-xl border border-slate-100 bg-white p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-700">Necesitan transporte (camión)</p>
                        <p className="text-2xl font-black text-slate-800">{freeAttendanceNeedsTransport.length}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex-1 min-h-0 overflow-y-auto p-6">
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  {summaryRosterModal.type === 'bautizos_transport' ? (
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-black border-b border-slate-100">
                          <th className="px-4 py-3">Nombre</th>
                          <th className="px-4 py-3">Tipo</th>
                          <th className="px-4 py-3">Inscrito</th>
                          <th className="px-4 py-3">Sede</th>
                          <th className="px-4 py-3">Detalle</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {bautizosTransportModalRows.length ? (
                          bautizosTransportModalRows.map((r, i) => (
                            <tr key={r.id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3 align-top text-slate-700">
                                <span className="inline-flex items-center justify-center min-w-[1.6rem] h-6 px-1 rounded-md bg-slate-100 border border-slate-200/80 text-[11px] font-black tabular-nums text-slate-600 shrink-0 mr-2 align-middle">
                                  {i + 1}
                                </span>
                                <span className="font-bold text-slate-800 align-middle">{r.displayName}</span>
                              </td>
                              <td className="px-4 py-3 text-slate-600">{r.lineKind}</td>
                              <td className="px-4 py-3 text-slate-600">{r.registradoName || '—'}</td>
                              <td className="px-4 py-3 text-slate-600">{r.location || '—'}</td>
                              <td className="px-4 py-3 text-slate-600 text-[11px] leading-snug">{r.transportSummary}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-xs italic">
                              Nadie solicitó transporte con el alcance actual.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  ) : summaryRosterModal.type === 'bautizos_llega_carro' ? (
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-black border-b border-slate-100">
                          <th className="px-4 py-3">Nombre</th>
                          <th className="px-4 py-3">Tipo</th>
                          <th className="px-4 py-3">Inscrito</th>
                          <th className="px-4 py-3">Sede</th>
                          <th className="px-4 py-3">Carros</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {bautizosCarModalRows.length ? (
                          bautizosCarModalRows.map((r, i) => (
                            <tr key={r.id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3 align-top text-slate-700">
                                <span className="inline-flex items-center justify-center min-w-[1.6rem] h-6 px-1 rounded-md bg-slate-100 border border-slate-200/80 text-[11px] font-black tabular-nums text-slate-600 shrink-0 mr-2 align-middle">
                                  {i + 1}
                                </span>
                                <span className="font-bold text-slate-800 align-middle">{r.displayName}</span>
                              </td>
                              <td className="px-4 py-3 text-slate-600">{r.lineKind}</td>
                              <td className="px-4 py-3 text-slate-600">{r.registradoName || '—'}</td>
                              <td className="px-4 py-3 text-slate-600">{r.location || '—'}</td>
                              <td className="px-4 py-3 text-slate-700 font-black">{r.cars}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-xs italic">
                              Nadie llega en carro con el alcance actual.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  ) : summaryRosterModal.type === 'bautizosCompanions' ? (
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-black border-b border-slate-100">
                          <th className="px-4 py-3">Nombre acompañante</th>
                          <th className="px-4 py-3">Acompaña a</th>
                          <th className="px-4 py-3">Parentesco</th>
                          <th className="px-4 py-3">Sede</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {bautizosCompanionModalRows.length ? (
                          bautizosCompanionModalRows.map((r, i) => (
                            <tr key={r.id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3 align-top text-slate-700">
                                <span className="inline-flex items-center justify-center min-w-[1.6rem] h-6 px-1 rounded-md bg-slate-100 border border-slate-200/80 text-[11px] font-black tabular-nums text-slate-600 shrink-0 mr-2 align-middle">
                                  {i + 1}
                                </span>
                                <span className="font-bold text-slate-800 align-middle">{r.companionName}</span>
                              </td>
                              <td className="px-4 py-3 text-slate-700 font-semibold">{r.registradoName || '—'}</td>
                              <td className="px-4 py-3 text-slate-600">{r.relationship || '—'}</td>
                              <td className="px-4 py-3 text-slate-600">{r.location || '—'}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-xs italic">
                              No hay acompañantes registrados.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-black border-b border-slate-100">
                          <th className="px-4 py-3">Nombre</th>
                          <th className="px-4 py-3">Sede</th>
                          {summaryRosterModal.type === 'regular' && <th className="px-4 py-3">Asistencia especial</th>}
                          {summaryRosterModal.type === 'regular' && !isDesayunoEvent && <th className="px-4 py-3">Transporte</th>}
                          {summaryRosterModal.type === 'servers' && <th className="px-4 py-3">Asignación</th>}
                          {summaryRosterModal.type === 'servers' && !isDesayunoEvent && <th className="px-4 py-3">Transporte</th>}
                          {summaryRosterModal.type === 'realCostX2' && <th className="px-4 py-3">Asignación</th>}
                          {summaryRosterModal.type === 'cortesia' && !isDesayunoEvent && <th className="px-4 py-3">Transporte</th>}
                          {summaryRosterModal.type === 'empleado' && !isDesayunoEvent && <th className="px-4 py-3">Transporte</th>}
                          {(summaryRosterModal.type === 'bautizos_servidor' ||
                            summaryRosterModal.type === 'bautizos_cortesia' ||
                            summaryRosterModal.type === 'bautizos_empleado') &&
                            !isDesayunoEvent && <th className="px-4 py-3">Transporte</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {rosterListForModalFiltered.length ? (
                          rosterListForModalFiltered
                            .slice()
                            .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                            .map((p, i) => (
                              <tr key={p.id} className="hover:bg-slate-50/50">
                                <td className="px-4 py-3 align-top text-slate-700">
                                  {renderRegistrationParticipantColumn(p, { displayIndex: i + 1, rosterLocation: p.location })}
                                </td>
                                <td className="px-4 py-3 text-slate-600">{p.location}</td>
                                {summaryRosterModal.type === 'regular' && (
                                  <>
                                    <td className="px-4 py-3 text-slate-600">
                                      {p.attendanceSpecialType === 'empleado' ? 'Empleado' : p.attendanceSpecialType === 'cortesia' ? 'Cortesía' : '?'}
                                    </td>
                                    {!isDesayunoEvent && <td className="px-4 py-3 text-slate-600">{resolveTransportSummary(p, currentEvent?.eventType, currentEvent)}</td>}
                                  </>
                                )}
                                {summaryRosterModal.type === 'servers' && (
                                  <>
                                    <td className="px-4 py-3 text-slate-600">{String(p.serverAssignment || '').trim() || '—'}</td>
                                    {!isDesayunoEvent && <td className="px-4 py-3 text-slate-600">{resolveTransportSummary(p, currentEvent?.eventType, currentEvent)}</td>}
                                  </>
                                )}
                                {summaryRosterModal.type === 'realCostX2' && (
                                  <td className="px-4 py-3 text-slate-600">{String(p.serverAssignment || '').trim() || '—'}</td>
                                )}
                                {summaryRosterModal.type === 'cortesia' && !isDesayunoEvent && (
                                  <td className="px-4 py-3 text-slate-600">{resolveTransportSummary(p, currentEvent?.eventType, currentEvent)}</td>
                                )}
                                {summaryRosterModal.type === 'empleado' && !isDesayunoEvent && (
                                  <td className="px-4 py-3 text-slate-600">{resolveTransportSummary(p, currentEvent?.eventType, currentEvent)}</td>
                                )}
                                {(summaryRosterModal.type === 'bautizos_servidor' ||
                                  summaryRosterModal.type === 'bautizos_cortesia' ||
                                  summaryRosterModal.type === 'bautizos_empleado') &&
                                  !isDesayunoEvent && (
                                    <td className="px-4 py-3 text-slate-600">{resolveTransportSummary(p, currentEvent?.eventType, currentEvent)}</td>
                                  )}
                              </tr>
                            ))
                        ) : (
                          <tr>
                            <td colSpan={summaryModalColSpan} className="px-4 py-8 text-center text-slate-400 text-xs italic">
                              No hay registros para mostrar.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {viewPrefs.statsConfig && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            <StatCard
              icon={Users}
              iconColor="text-blue-600"
              bgIcon="bg-blue-100"
              title="Registros totales"
              value={isBautizos ? totalRegsBautizosCard : totalRegs}
              campaScopeSlot={
                renderSummaryDashScopeSlot('dashRegs')
              }
              expandKey="dashRegs"
              expandedKey={summaryDashExpandKey}
              onExpandToggle={toggleSummaryDashCard}
              detail={
                isBautizos ? (
                  <p className="text-slate-500 font-bold text-[11px] leading-snug">
                    {getBautizosDashboardScopeChartHint(bautizosDashScope, 'counts')}
                  </p>
                ) : (
                  <p className="text-slate-500 font-bold">Inscripciones activas (sin cancelados), todas las sedes.</p>
                )
              }
              footer={
                <button
                  type="button"
                  className="w-full py-2 rounded-xl text-[11px] font-black uppercase tracking-wide bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSummaryRosterModal({
                      isOpen: true,
                      type: isBautizos && bautizosDashScope === 'companions' ? 'bautizosCompanions' : 'regular',
                    });
                  }}
                >
                  Ver listado
                </button>
              }
            />
            {isBautizos && (
              <>
                <StatCard
                  icon={Bus}
                  iconColor="text-indigo-600"
                  bgIcon="bg-indigo-100"
                  title="Transporte solicitado"
                  campaScopeSlot={renderSummaryDashScopeSlot('dashBautizosTransport')}
                  value={bautizosDashTransportCount}
                  expandKey="dashBautizosTransport"
                  expandedKey={summaryDashExpandKey}
                  onExpandToggle={toggleSummaryDashCard}
                  detail={
                    <p className="text-slate-500 font-bold text-[11px] leading-snug">
                      {getBautizosDashboardScopeChartHint(bautizosDashScope, 'transportCard')}
                    </p>
                  }
                  footer={
                    <button
                      type="button"
                      className="w-full py-2 rounded-xl text-[11px] font-black uppercase tracking-wide bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSummaryRosterModal({ isOpen: true, type: 'bautizos_transport' });
                      }}
                    >
                      Ver listado
                    </button>
                  }
                />
                <StatCard
                  icon={MapPin}
                  iconColor="text-cyan-600"
                  bgIcon="bg-cyan-100"
                  title="Lleva carro"
                  campaScopeSlot={renderSummaryDashScopeSlot('dashBautizosCars')}
                  value={bautizosDashCarsPeopleCount}
                  expandKey="dashBautizosCars"
                  expandedKey={summaryDashExpandKey}
                  onExpandToggle={toggleSummaryDashCard}
                  detail={
                    <p className="text-slate-500 font-bold text-[11px] leading-snug">
                      {getBautizosDashboardScopeChartHint(bautizosDashScope, 'carsCard')} Carros
                      registrados explícitamente:{' '}
                      <span className="text-slate-800">{bautizosDashCarsTotal}</span>.
                    </p>
                  }
                  footer={
                    <button
                      type="button"
                      className="w-full py-2 rounded-xl text-[11px] font-black uppercase tracking-wide bg-cyan-50 text-cyan-800 border border-cyan-200 hover:bg-cyan-100 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSummaryRosterModal({ isOpen: true, type: 'bautizos_llega_carro' });
                      }}
                    >
                      Ver listado
                    </button>
                  }
                />
                <StatCard
                  icon={Users}
                  iconColor="text-amber-700"
                  bgIcon="bg-amber-100"
                  title="Servidores (bautizos)"
                  campaScopeSlot={renderSummaryDashScopeSlot('dashBautizosServidores')}
                  value={bautizosDashServidorListForDash.length}
                  expandKey="dashBautizosServidores"
                  expandedKey={summaryDashExpandKey}
                  onExpandToggle={toggleSummaryDashCard}
                  detail={
                    <p className="text-slate-500 font-bold text-[11px] leading-snug">
                      {getBautizosDashboardScopeChartHint(bautizosDashScope, 'servidorCard')}
                    </p>
                  }
                  footer={
                    <button
                      type="button"
                      className="w-full py-2 rounded-xl text-[11px] font-black uppercase tracking-wide bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSummaryRosterModal({ isOpen: true, type: 'bautizos_servidor' });
                      }}
                    >
                      Ver listado
                    </button>
                  }
                />
                <StatCard
                  icon={Gift}
                  iconColor="text-pink-600"
                  bgIcon="bg-pink-100"
                  title="Cortesías (bautizos)"
                  campaScopeSlot={renderSummaryDashScopeSlot('dashBautizosCortesia')}
                  value={bautizosDashCortesiaListForDash.length}
                  expandKey="dashBautizosCortesia"
                  expandedKey={summaryDashExpandKey}
                  onExpandToggle={toggleSummaryDashCard}
                  detail={
                    <p className="text-slate-500 font-bold text-[11px] leading-snug">
                      {getBautizosDashboardScopeChartHint(bautizosDashScope, 'cortesiaCard')}
                    </p>
                  }
                  footer={
                    <button
                      type="button"
                      className="w-full py-2 rounded-xl text-[11px] font-black uppercase tracking-wide bg-pink-50 text-pink-800 border border-pink-200 hover:bg-pink-100 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSummaryRosterModal({ isOpen: true, type: 'bautizos_cortesia' });
                      }}
                    >
                      Ver listado
                    </button>
                  }
                />
                <StatCard
                  icon={Briefcase}
                  iconColor="text-sky-600"
                  bgIcon="bg-sky-100"
                  title="Empleados (bautizos)"
                  campaScopeSlot={renderSummaryDashScopeSlot('dashBautizosEmpleado')}
                  value={bautizosDashEmpleadoListForDash.length}
                  expandKey="dashBautizosEmpleado"
                  expandedKey={summaryDashExpandKey}
                  onExpandToggle={toggleSummaryDashCard}
                  detail={
                    <p className="text-slate-500 font-bold text-[11px] leading-snug">
                      {getBautizosDashboardScopeChartHint(bautizosDashScope, 'empleadoCard')}
                    </p>
                  }
                  footer={
                    <button
                      type="button"
                      className="w-full py-2 rounded-xl text-[11px] font-black uppercase tracking-wide bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSummaryRosterModal({ isOpen: true, type: 'bautizos_empleado' });
                      }}
                    >
                      Ver listado
                    </button>
                  }
                />
              </>
            )}
            {isCampa && (
              <StatCard
                icon={GraduationCap}
                iconColor="text-purple-600"
                bgIcon="bg-purple-100"
                title="Becados totales"
                value={totalScholarship}
                campaScopeSlot={renderSummaryDashScopeSlot('dashScholarship')}
                expandKey="dashScholarship"
                expandedKey={summaryDashExpandKey}
                onExpandToggle={toggleSummaryDashCard}
                detail={(
                  <>
                    <p>Beca total: <span className="text-slate-700 font-black">{becaTotal}</span></p>
                    <p>Beca parcial: <span className="text-slate-700 font-black">{becaParcial}</span></p>
                  </>
                )}
                footer={
                  <button
                    type="button"
                    className="w-full py-2 rounded-xl text-[11px] font-black uppercase tracking-wide bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSummaryRosterModal({ isOpen: true, type: 'scholarship' });
                    }}
                  >
                    Ver listado
                  </button>
                }
              />
            )}
            {isCampa && (
              <StatCard
                icon={Users}
                iconColor="text-amber-700"
                bgIcon="bg-amber-100"
                title="Servidores totales"
                value={totalSrv}
                campaScopeSlot={renderSummaryDashScopeSlot('dashServers')}
                expandKey="dashServers"
                expandedKey={summaryDashExpandKey}
                onExpandToggle={toggleSummaryDashCard}
                detail={(
                  <div className="space-y-1.5 text-[10px] text-slate-600 font-semibold">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Teens</p>
                    <p>
                      Conteo en Teens (asignación Teens o Ambos sirviendo en Teens):{' '}
                      <span className="text-slate-800 font-black">{srvExT}</span>
                    </p>
                    <p>
                      Teens más tarifa única Ambos (cuentan en ambos segmentos):{' '}
                      <span className="text-slate-800 font-black">{srvInT}</span>
                    </p>
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 pt-1">Jóvenes</p>
                    <p>
                      Conteo en Jóvenes (asignación Jóvenes o Ambos sirviendo en Jóvenes):{' '}
                      <span className="text-slate-800 font-black">{srvExJ}</span>
                    </p>
                    <p>
                      Jóvenes más tarifa única Ambos (cuentan en ambos segmentos):{' '}
                      <span className="text-slate-800 font-black">{srvInJ}</span>
                    </p>
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 pt-1">Ambos</p>
                    <p>
                      Tarifa única Ambos (sin precio mixto; sirven en ambos segmentos):{' '}
                      <span className="text-slate-800 font-black">{srvAmb}</span>
                    </p>
                  </div>
                )}
                footer={
                  <button
                    type="button"
                    className="w-full py-2 rounded-xl text-[11px] font-black uppercase tracking-wide bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSummaryRosterModal({ isOpen: true, type: 'servers' });
                    }}
                  >
                    Ver listado
                  </button>
                }
              />
            )}
            {isCampa && (
              <StatCard
                icon={Scale}
                iconColor="text-violet-700"
                bgIcon="bg-violet-100"
                title="Conteo x2 costo real"
                value={rosterRealCostX2List.length}
                campaScopeSlot={renderSummaryDashScopeSlot('dashRealCostX2')}
                expandKey="dashRealCostX2"
                expandedKey={summaryDashExpandKey}
                onExpandToggle={toggleSummaryDashCard}
                detail={(
                  <div className="space-y-1.5 text-[10px] text-slate-600 font-semibold">
                    <p>Registros totales: <span className="text-slate-800 font-black">{totalRegsForRealCostCard}</span></p>
                    <p>Extra por "Ambos": <span className="text-slate-800 font-black">+{rosterRealCostX2List.length}</span></p>
                    <label className="flex items-center gap-2 text-[10px] font-semibold text-slate-600" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded accent-violet-600"
                        checked={countAmbosDoubleInAllCounts}
                        onChange={(e) => void patchCampaRealCostCountOptions({ countAmbosDoubleInAllCounts: e.target.checked })}
                      />
                      Contar servidor Ambos x2 en métricas con alcance "Todos"
                    </label>
                    <label className="flex items-center gap-2 text-[10px] font-semibold text-slate-600" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded accent-violet-600"
                        checked={includeCortesiaInRealCost}
                        onChange={(e) => void patchCampaRealCostCountOptions({ includeCortesiaInRealCost: e.target.checked })}
                      />
                      Sumar cortesías no servidor (+{rosterCortesiaNonServerList.length})
                    </label>
                    <label className="flex items-center gap-2 text-[10px] font-semibold text-slate-600" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded accent-violet-600"
                        checked={includeEmpleadoInRealCost}
                        onChange={(e) => void patchCampaRealCostCountOptions({ includeEmpleadoInRealCost: e.target.checked })}
                      />
                      Sumar empleados (+{rosterEmpleadoList.length})
                    </label>
                    <p>Unidades reales para costo: <span className="text-violet-800 font-black">{totalRealCostUnitsForCurrentEvent}</span></p>
                    <p className="text-[9px] text-slate-500">Servidor en cortesía ya va en base; esta casilla solo agrega cortesías no servidor.</p>
                  </div>
                )}
                footer={
                  <button
                    type="button"
                    className="w-full py-2 rounded-xl text-[11px] font-black uppercase tracking-wide bg-violet-50 text-violet-800 border border-violet-200 hover:bg-violet-100 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSummaryRosterModal({ isOpen: true, type: 'realCostX2' });
                    }}
                  >
                    Ver listado completo
                  </button>
                }
              />
            )}
            {isCampa && (
              <StatCard
                icon={Gift}
                iconColor="text-pink-600"
                bgIcon="bg-pink-100"
                title="Cortesías totales"
                value={sCortesiaCard.totalAttendanceCortesia}
                campaScopeSlot={renderSummaryDashScopeSlot('dashCortesia')}
                expandKey="dashCortesia"
                expandedKey={summaryDashExpandKey}
                onExpandToggle={toggleSummaryDashCard}
                detail={<p className="text-slate-500 font-bold">Asistencia sin cobro (cortesía).</p>}
                footer={
                  <button
                    type="button"
                    className="w-full py-2 rounded-xl text-[11px] font-black uppercase tracking-wide bg-pink-50 text-pink-800 border border-pink-200 hover:bg-pink-100 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSummaryRosterModal({ isOpen: true, type: 'cortesia' });
                    }}
                  >
                    Ver listado
                  </button>
                }
              />
            )}
            {isCampa && (
              <StatCard
                icon={Briefcase}
                iconColor="text-sky-600"
                bgIcon="bg-sky-100"
                title="Empleados totales"
                value={sEmpleadoCard.totalAttendanceEmpleado}
                campaScopeSlot={renderSummaryDashScopeSlot('dashEmpleado')}
                expandKey="dashEmpleado"
                expandedKey={summaryDashExpandKey}
                onExpandToggle={toggleSummaryDashCard}
                detail={<p className="text-slate-500 font-bold">Asistencia empleado (sin cobro).</p>}
                footer={
                  <button
                    type="button"
                    className="w-full py-2 rounded-xl text-[11px] font-black uppercase tracking-wide bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSummaryRosterModal({ isOpen: true, type: 'empleado' });
                    }}
                  >
                    Ver listado
                  </button>
                }
              />
            )}
            <StatCard
              icon={DollarSign}
              iconColor="text-green-600"
              bgIcon="bg-green-100"
              title="Recaudado"
              value={(
                <div className="flex items-center justify-between gap-2">
                  <p className="text-2xl font-black text-slate-800">{formatMoney(paidDisplayedTotal)}</p>
                  {showGrossWithoutCommission && dashboardCommissionTotal > 0 ? (
                    <span className="shrink-0 text-[10px] font-bold text-rose-500">
                      Com.: {formatMoney(dashboardCommissionTotal)}
                    </span>
                  ) : null}
                </div>
              )}
              campaScopeSlot={renderSummaryDashScopeSlot('dashRecaudado')}
            />
            <StatCard
              icon={ShieldAlert}
              iconColor="text-orange-600"
              bgIcon="bg-orange-100"
              title="Pendiente"
              value={formatMoney(pendienteDisplayed)}
              campaScopeSlot={renderSummaryDashScopeSlot('dashPendiente')}
            />

            {hasAdminRights && (
              <StatCard
                icon={Receipt}
                iconColor="text-emerald-600"
                bgIcon="bg-emerald-100"
                title="Donaciones"
                value={formatMoney(donationsTotalAll)}
                campaScopeSlot={renderSummaryDashScopeSlot('dashDonations')}
                expandKey="dashDonations"
                expandedKey={summaryDashExpandKey}
                onExpandToggle={toggleSummaryDashCard}
                detail={
                  <p className="text-slate-500 font-bold">
                    {eventDonations.length} registro{eventDonations.length !== 1 ? 's' : ''} (incl. saldos de baja){' '}
                    · Suma al recaudado declarado: {formatMoney(donationsTotalForBalance)}
                  </p>
                }
                footer={
                  <button
                    type="button"
                    className="w-full py-2 rounded-xl text-[11px] font-black uppercase tracking-wide bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDonationsListOpen(true);
                    }}
                  >
                    Ver donaciones
                  </button>
                }
              />
            )}

            {hasAdminRights ? (
              <StatCard
                icon={CalendarRange}
                iconColor="text-blue-600"
                bgIcon="bg-blue-100"
                title="Fechas del evento"
                campaScopeSlot={isBautizos ? renderSummaryDashScopeSlot('dashEventDates') : null}
                value={(
                  <div className="space-y-2">
                    <p className="text-lg md:text-xl font-black text-slate-800 capitalize leading-tight">
                      {formatEventDateRangeLabel(currentEvent)}
                    </p>
                    {isCampa && formatCampaSegmentDateLines(currentEvent).length > 0 ? (
                      <ul className="text-[11px] font-semibold text-slate-600 space-y-0.5 list-disc list-inside">
                        {formatCampaSegmentDateLines(currentEvent).map((line, idx) => (
                          <li key={`campa-seg-${idx}`}>{line}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                )}
                expandKey="dashEventDates"
                expandedKey={summaryDashExpandKey}
                onExpandToggle={toggleSummaryDashCard}
                detail={(
                  <div className="w-full max-w-none space-y-3 text-[11px] text-slate-800 font-normal">
                    <p className="text-[10px] text-slate-500 leading-snug">
                      {isEventSingleDay(eventDateDraft)
                        ? 'Evento de un solo día: indica la fecha única. En campamento puedes acotar fechas por segmento Teens y Jóvenes cuando apliquen.'
                        : 'Rango general del evento; en campamento puedes acotar fechas por segmento Teens y Jóvenes cuando apliquen.'}
                    </p>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-3 space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        {isEventSingleDay(eventDateDraft) ? 'Fecha del evento' : 'Rango general'}
                      </p>
                      {isEventSingleDay(eventDateDraft) ? (
                        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-x-3 gap-y-2 items-center">
                          <span className="text-xs font-bold text-slate-600">Fecha</span>
                          <input
                            type="date"
                            value={eventDateDraft.dateStart || eventDateDraft.dateEnd || ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              setEventDateDraft((prev) => ({ ...prev, dateStart: v, dateEnd: v }));
                            }}
                            className="w-full max-w-xs rounded-lg border border-slate-200 bg-white text-slate-800 text-sm font-semibold px-3 py-2 [color-scheme:light]"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-x-3 gap-y-2 items-center">
                          <span className="text-xs font-bold text-slate-600">Desde</span>
                          <input
                            type="date"
                            value={eventDateDraft.dateStart}
                            onChange={(e) => setEventDateDraft((prev) => ({ ...prev, dateStart: e.target.value }))}
                            className="w-full max-w-xs rounded-lg border border-slate-200 bg-white text-slate-800 text-sm font-semibold px-3 py-2 [color-scheme:light]"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="text-xs font-bold text-slate-600">Hasta</span>
                          <input
                            type="date"
                            value={eventDateDraft.dateEnd}
                            onChange={(e) => setEventDateDraft((prev) => ({ ...prev, dateEnd: e.target.value }))}
                            className="w-full max-w-xs rounded-lg border border-slate-200 bg-white text-slate-800 text-sm font-semibold px-3 py-2 [color-scheme:light]"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      )}
                    </div>
                    {isCampa ? (
                      <div className="rounded-xl border border-amber-200/80 dark:border-amber-500/45 bg-amber-50/50 dark:bg-amber-950/20 p-3 space-y-2">
                        <p className="text-[10px] font-black text-amber-800 dark:text-amber-200 uppercase tracking-wider">Campa: segmentos (opcional)</p>
                        <div className="grid grid-cols-1 sm:grid-cols-[6rem_1fr] gap-x-3 gap-y-2 items-center">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Teens</span>
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="date"
                              value={eventDateDraft.campaTeensStart}
                              onChange={(e) => setEventDateDraft((prev) => ({ ...prev, campaTeensStart: e.target.value }))}
                              className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-semibold px-2 py-1.5 min-w-[9rem] [color-scheme:light]"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className="text-slate-400 dark:text-slate-500">—</span>
                            <input
                              type="date"
                              value={eventDateDraft.campaTeensEnd}
                              onChange={(e) => setEventDateDraft((prev) => ({ ...prev, campaTeensEnd: e.target.value }))}
                              className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-semibold px-2 py-1.5 min-w-[9rem] [color-scheme:light]"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Jóvenes</span>
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="date"
                              value={eventDateDraft.campaJovenesStart}
                              onChange={(e) => setEventDateDraft((prev) => ({ ...prev, campaJovenesStart: e.target.value }))}
                              className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-semibold px-2 py-1.5 min-w-[9rem] [color-scheme:light]"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className="text-slate-400 dark:text-slate-500">—</span>
                            <input
                              type="date"
                              value={eventDateDraft.campaJovenesEnd}
                              onChange={(e) => setEventDateDraft((prev) => ({ ...prev, campaJovenesEnd: e.target.value }))}
                              className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-semibold px-2 py-1.5 min-w-[9rem] [color-scheme:light]"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
                footer={(
                  <button
                    type="button"
                    className="w-full py-2 rounded-xl text-[11px] font-black uppercase tracking-wide bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleSaveEventDates();
                    }}
                  >
                    Guardar fechas
                  </button>
                )}
              />
            ) : (
              <StatCard
                icon={CalendarRange}
                iconColor="text-blue-600"
                bgIcon="bg-blue-100"
                title="Fechas del evento"
                campaScopeSlot={isBautizos ? renderSummaryDashScopeSlot('dashEventDates') : null}
                value={(
                  <div className="space-y-2">
                    <p className="text-lg md:text-xl font-black text-slate-800 capitalize leading-tight">
                      {formatEventDateRangeLabel(currentEvent)}
                    </p>
                    {isCampa && formatCampaSegmentDateLines(currentEvent).length > 0 ? (
                      <ul className="text-[11px] font-semibold text-slate-600 space-y-0.5 list-disc list-inside">
                        {formatCampaSegmentDateLines(currentEvent).map((line, idx) => (
                          <li key={`campa-seg-ro-${idx}`}>{line}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                )}
              />
            )}

            <div className="relative">
              {hasAdminRights && !isBautizos && (
                <button
                  type="button"
                  className="absolute top-3 right-3 z-10 p-1.5 bg-white/95 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors shadow-sm border border-slate-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    openPricingModal();
                  }}
                  title="Configurar precios y campañas"
                >
                  <Settings2 size={14} />
                </button>
              )}
              <StatCard
                icon={DollarSign}
                iconColor="text-indigo-600"
                bgIcon="bg-indigo-100"
                title="Precios de lista"
                campaScopeSlot={isBautizos ? renderSummaryDashScopeSlot('dashPricing') : null}
                value={(
                  <div className="space-y-2">
                    {isBautizos && bautizosDashBreakdown ? (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Según comida / transporte</p>
                        <ul className="text-[11px] font-semibold text-slate-700 space-y-0.5 leading-snug">
                          <li className="flex justify-between gap-2">
                            <span>Solo comida</span>
                            <span className="tabular-nums font-black text-slate-900">{fmtPriceDash(bautizosDashBreakdown.food)}</span>
                          </li>
                          <li className="flex justify-between gap-2">
                            <span>Solo transporte</span>
                            <span className="tabular-nums font-black text-slate-900">{fmtPriceDash(bautizosDashBreakdown.transport)}</span>
                          </li>
                          <li className="flex justify-between gap-2 pt-0.5 border-t border-slate-100">
                            <span>Comida + transporte</span>
                            <span className="tabular-nums font-black text-indigo-700">{fmtPriceDash(bautizosDashBreakdown.both)}</span>
                          </li>
                        </ul>
                      </div>
                    ) : (
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{dashListPriceLabel}</p>
                      <p className="text-2xl font-black tabular-nums leading-tight">{fmtPriceDash(currentPricing.global)}</p>
                    </div>
                    )}
                    {isCampa ? (
                      <div className="pt-1 border-t border-slate-100">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Servidor (por asignación)</p>
                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] font-bold text-slate-700 leading-snug">
                          <span>
                            Teens <span className="text-slate-900 tabular-nums">{fmtPriceDash(currentPricing.serverTeens)}</span>
                          </span>
                          <span className="text-slate-300">·</span>
                          <span>
                            Jóvenes <span className="text-slate-900 tabular-nums">{fmtPriceDash(currentPricing.serverJovenes)}</span>
                          </span>
                          <span className="text-slate-300">·</span>
                          <span>
                            Ambos <span className="text-slate-900 tabular-nums">{fmtPriceDash(currentPricing.serverAmbos ?? currentPricing.server)}</span>
                          </span>
                        </div>
                      </div>
                    ) : null}
                    {currentEvent?.pricingType === 'dynamic' && !isBautizos ? (
                      <p className="text-[10px] text-indigo-600 font-bold uppercase pt-0.5">Vigente según fecha de registro</p>
                    ) : null}
                  </div>
                )}
                expandKey="dashPricing"
                expandedKey={summaryDashExpandKey}
                onExpandToggle={toggleSummaryDashCard}
                detail={isBautizos ? null : (
                  <div className="space-y-3 w-full max-w-none text-[11px] text-slate-700">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-3 space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Modalidad</p>
                      <p className="font-bold text-slate-800">
                        {currentEvent?.pricingType === 'dynamic' ? 'Por fechas (fases)' : 'Precio fijo'}
                      </p>
                    </div>

                    {currentEvent?.pricingType === 'dynamic' && sortedDynamicPhases.length > 0 ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-3 space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                          {hasLegacyCoupledPhases
                            ? 'Fases (mismo calendario — datos antiguos)'
                            : isCampa
                              ? 'Fases — lista campista'
                              : 'Fases — precio de lista'}
                        </p>
                        {sortedDynamicPhases.map((ph, idx) => (
                          <div key={ph.id || `phase-${idx}`} className="rounded-lg border border-white/80 bg-white/80 p-2.5 space-y-2">
                            <p className="text-[10px] font-black text-indigo-700 uppercase">
                              Hasta{' '}
                              {ph.dateUntil
                                ? new Date(`${ph.dateUntil}T12:00:00`).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })
                                : '—'}
                            </p>
                            {hasLegacyCoupledPhases ? (
                              renderDashPriceRows(ph)
                            ) : (
                              <div className="grid grid-cols-[1fr_auto] gap-x-2 text-[11px]">
                                <span className="text-slate-600">{dashListPriceLabel}</span>
                                <span className="font-black text-slate-900 tabular-nums text-right">{fmtPriceDash(ph.globalCost)}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {isCampa && hasIndependentServerPhases ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-3 space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Fases — servidor (independientes)</p>
                        {sortedDynamicServerPhases.map((ph, idx) => (
                          <div key={ph.id || `sph-${idx}`} className="rounded-lg border border-white/80 bg-white/80 p-2.5 space-y-2">
                            <p className="text-[10px] font-black text-amber-800 uppercase">
                              Hasta{' '}
                              {ph.dateUntil
                                ? new Date(`${ph.dateUntil}T12:00:00`).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })
                                : '—'}
                            </p>
                            {renderDashServerOnlyRows(ph)}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-3 space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        {currentEvent?.pricingType === 'dynamic' ? 'Precios finales / fijos de referencia' : 'Precios de lista'}
                      </p>
                      {renderDashPriceRows(currentEvent)}
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-3 space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Campañas de descuento</p>
                      {discountCampaignsList.length === 0 ? (
                        <p className="text-slate-500 italic">Sin campañas definidas.</p>
                      ) : (
                        <div className="space-y-2">
                          {discountCampaignsList.map((c, idx) => {
                            const applies =
                              c.appliesTo === 'general' ? 'General' : c.appliesTo === 'server_ambos' ? 'Servidor Ambos' : 'Todos';
                            const vigente = discountCampaignHasDateRange(c) && isDiscountCampaignVigenteOnDate(c, todayIsoPricing);
                            const noDates = !discountCampaignHasDateRange(c);
                            return (
                              <div
                                key={c.id || `camp-${idx}`}
                                className={`rounded-lg border border-white/80 bg-white/80 p-2.5 space-y-1.5 ${
                                  c.enabled === false
                                    ? 'opacity-50 dark:opacity-100 ring-1 ring-inset ring-slate-300 dark:ring-slate-600'
                                    : ''
                                }`}
                              >
                                <p className="font-bold text-slate-800">{c.concept || '(sin concepto)'}</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
                                  <div>
                                    <span className="text-slate-500">Aplica a: </span>
                                    <span className="font-semibold text-slate-800">{applies}</span>
                                  </div>
                                  <div className="sm:text-right">
                                    <span className="text-slate-500">A liquidar: </span>
                                    <span className="font-black text-slate-900 tabular-nums">{fmtPriceDash(c.finalAmount)}</span>
                                  </div>
                                </div>
                                <p className="text-[10px] text-slate-600 leading-snug">
                                  <span className="font-bold text-slate-500">Vigencia: </span>
                                  {c.startDate && c.endDate ? `${c.startDate} → ${c.endDate}` : 'Sin rango (solo al elegir en alta o al editar)'}
                                  {noDates ? (
                                    <span className="ml-1 font-bold text-amber-800">· Manual</span>
                                  ) : vigente ? (
                                    <span className="ml-1 font-bold text-emerald-700">· Vigente hoy</span>
                                  ) : (
                                    <span className="ml-1 font-bold text-slate-500">· Fuera de vigencia</span>
                                  )}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                footer={
                  hasAdminRights && !isBautizos ? (
                    <button
                      type="button"
                      className="w-full py-2 rounded-xl text-[11px] font-black uppercase tracking-wide bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        openPricingModal();
                      }}
                    >
                      Configurar precios y campañas
                    </button>
                  ) : null
                }
              />
            </div>

            {isBautizos && (
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <div className="mb-3 flex items-center gap-2 min-w-0">
                  <div className="bg-amber-100 p-2 rounded-lg text-amber-700 shrink-0">
                    <Church size={18} />
                  </div>
                  <span className="text-xs font-bold text-slate-500 leading-tight">Precios comida y transporte</span>
                </div>
                <p className="text-[10px] text-slate-500 mb-3 leading-snug">
                  Estos montos definen el precio de lista según si la persona elige comida, transporte o ambos (se suman).
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className={fieldStack}>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Comida</label>
                    {canSeeMoney ? (
                      <div className="flex items-center text-xl font-black text-slate-800">
                        <span className="mr-1">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={tempBautizosListPriceFood}
                          disabled={!hasAdminRights}
                          onChange={(e) => setTempBautizosListPriceFood(e.target.value)}
                          onBlur={async (e) => {
                            const newVal = parseFloat(e.target.value);
                            const safe = Number.isFinite(newVal) && newVal >= 0 ? newVal : DEFAULT_BAUTIZOS_LIST_PRICE_FOOD;
                            const prev = Number(currentEvent.bautizosListPriceFood ?? DEFAULT_BAUTIZOS_LIST_PRICE_FOOD) || 0;
                            if (Math.abs(safe - prev) > 0.005) {
                              await updateEventConfig({ bautizosListPriceFood: safe });
                              addLog(
                                'Configuración',
                                `Precio lista Bautizos (comida): $${prev} -> $${safe}`,
                                null,
                                { id: 'Global', name: 'Sistema' },
                                { collectionName: 'app_events', docId: currentEvent.id, action: 'update', previousData: currentEvent }
                              );
                            }
                            setTempBautizosListPriceFood(String(safe));
                          }}
                          className={`bg-transparent border-b-2 outline-none w-full max-w-[8rem] transition-colors ${
                            !hasAdminRights ? 'border-transparent cursor-not-allowed' : 'border-transparent hover:border-slate-200 focus:border-indigo-500'
                          }`}
                        />
                      </div>
                    ) : (
                      <span className="text-xl font-black">$***</span>
                    )}
                  </div>
                  <div className={fieldStack}>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Transporte</label>
                    {canSeeMoney ? (
                      <div className="flex items-center text-xl font-black text-slate-800">
                        <span className="mr-1">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={tempBautizosListPriceTransport}
                          disabled={!hasAdminRights}
                          onChange={(e) => setTempBautizosListPriceTransport(e.target.value)}
                          onBlur={async (e) => {
                            const newVal = parseFloat(e.target.value);
                            const safe = Number.isFinite(newVal) && newVal >= 0 ? newVal : DEFAULT_BAUTIZOS_LIST_PRICE_TRANSPORT;
                            const prev = Number(currentEvent.bautizosListPriceTransport ?? DEFAULT_BAUTIZOS_LIST_PRICE_TRANSPORT) || 0;
                            if (Math.abs(safe - prev) > 0.005) {
                              await updateEventConfig({ bautizosListPriceTransport: safe });
                              addLog(
                                'Configuración',
                                `Precio lista Bautizos (transporte): $${prev} -> $${safe}`,
                                null,
                                { id: 'Global', name: 'Sistema' },
                                { collectionName: 'app_events', docId: currentEvent.id, action: 'update', previousData: currentEvent }
                              );
                            }
                            setTempBautizosListPriceTransport(String(safe));
                          }}
                          className={`bg-transparent border-b-2 outline-none w-full max-w-[8rem] transition-colors ${
                            !hasAdminRights ? 'border-transparent cursor-not-allowed' : 'border-transparent hover:border-slate-200 focus:border-indigo-500'
                          }`}
                        />
                      </div>
                    ) : (
                      <span className="text-xl font-black">$***</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="mb-3 flex items-center gap-2 min-w-0">
                <div className="bg-teal-100 p-2 rounded-lg text-teal-600 dark:bg-teal-950/60 dark:text-teal-300 dark:ring-1 dark:ring-inset dark:ring-teal-800/70 shrink-0">
                  <Wallet size={18} />
                </div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-300 leading-tight">Apartado Mín.</span>
              </div>
              <div className="flex items-center text-2xl font-black text-slate-800">
                {canSeeMoney ? (
                  <><span className="mr-1">$</span>
                    <input type="number" value={tempDeposit} disabled={!hasAdminRights} onChange={e => setTempDeposit(e.target.value)}
                      onBlur={async (e) => {
                        const newVal = parseFloat(e.target.value) || 0;
                        if (newVal !== currentEvent.minDeposit) {
                          await updateEventConfig({ minDeposit: newVal });
                          addLog('Configuración', `Apartado mín: $${currentEvent.minDeposit} -> $${newVal}`, null, { id: 'Global', name: 'Sistema' }, { collectionName: 'app_events', docId: currentEvent.id, action: 'update', previousData: currentEvent });
                        }
                      }}
                      className={`bg-transparent border-b-2 outline-none w-20 transition-colors ${!hasAdminRights ? 'border-transparent cursor-not-allowed' : 'border-transparent hover:border-slate-200 focus:border-indigo-500'}`} /></>
                ) : <span>$***</span>}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="mb-3 flex items-center gap-2 min-w-0">
                <div className="bg-amber-100 dark:bg-amber-950/50 p-2 rounded-lg text-amber-700 dark:text-amber-300 shrink-0">
                  <Calendar size={18} />
                </div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-300 leading-tight">
                  Fecha límite de pago
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-2 leading-snug">
                Aparece en recordatorios por WhatsApp con el saldo pendiente. La cola automática semanal solo aplica si hay fecha y hay saldo por liquidar.
              </p>
              <input
                type="date"
                value={dashPaymentDeadlineDate}
                disabled={!hasAdminRights}
                max={getEventEffectiveEndDate(currentEvent) || undefined}
                onChange={(e) => setDashPaymentDeadlineDate(e.target.value)}
                onBlur={async (e) => {
                  if (!hasAdminRights) return;
                  const next = (e.target.value || '').trim();
                  const prev = String(currentEvent.paymentDeadlineDate || '').trim();
                  const evEnd = getEventEffectiveEndDate(currentEvent);
                  if (next && evEnd && compareIsoDates(next, evEnd) > 0) {
                    showToast('La fecha límite no puede ser posterior al fin del evento.');
                    setDashPaymentDeadlineDate(prev);
                    return;
                  }
                  if (next === prev) return;
                  await updateEventConfig({ paymentDeadlineDate: next });
                  addLog(
                    'Configuración',
                    `Fecha límite de pago (recordatorios WhatsApp): ${prev || 'sin definir'} → ${next || 'sin definir'}.`,
                    null,
                    { id: 'Global', name: 'Sistema' },
                    { collectionName: 'app_events', docId: currentEvent.id, action: 'update', previousData: currentEvent }
                  );
                }}
                className={`w-full text-sm font-bold text-slate-800 dark:text-slate-100 rounded-lg border px-2 py-2 ${
                  hasAdminRights
                    ? 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950'
                    : 'border-transparent bg-slate-50 dark:bg-slate-800 cursor-not-allowed opacity-80'
                }`}
              />
              {!dashPaymentDeadlineDate ? (
                <p className="text-[10px] text-amber-800 dark:text-amber-200 font-semibold mt-2 leading-snug">
                  Sin definir: no se generan recordatorios automáticos de pago.
                </p>
              ) : null}
            </div>

            {hasAdminRights ? (
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="mb-3 flex items-center gap-2 min-w-0">
                  <div className="bg-violet-100 dark:bg-violet-950/50 p-2 rounded-lg text-violet-600 dark:text-violet-300 dark:ring-1 dark:ring-inset dark:ring-violet-800/70 shrink-0">
                    <CreditCard size={18} aria-hidden />
                  </div>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-300 leading-tight">Pago con tarjeta</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-3 leading-snug">
                  Control global del evento (registros, enlaces públicos y abonos). Para desactivar solo en una sede, usa «Cupo vs sedes» en este mismo panel.
                </p>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800"
                    checked={currentEvent.cardPaymentEnabled !== false}
                    onChange={async (e) => {
                      const next = e.target.checked;
                      const prev = currentEvent.cardPaymentEnabled !== false;
                      if (next === prev) return;
                      try {
                        await updateEventConfig({ cardPaymentEnabled: next });
                        addLog(
                          'Configuración',
                          `Pago con tarjeta (evento completo): ${prev ? 'habilitado' : 'deshabilitado'} → ${next ? 'habilitado' : 'deshabilitado'}.`,
                          null,
                          { id: 'Global', name: 'Sistema' },
                          { collectionName: 'app_events', docId: currentEvent.id, action: 'update', previousData: currentEvent }
                        );
                        showToast(next ? 'Pago con tarjeta habilitado en el evento.' : 'Pago con tarjeta deshabilitado en todo el evento.');
                      } catch (err) {
                        console.error(err);
                        showToast('No se pudo guardar el cambio.');
                      }
                    }}
                  />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-snug">
                    Permitir pago con tarjeta en las sedes (salvo excepciones por sede)
                  </span>
                </label>
                {currentEvent.cardPaymentEnabled === false ? (
                  <div className={`${uiBanner('warning')} mt-3 gap-2 items-start`} role="status">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" aria-hidden />
                    <span>El pago con tarjeta está deshabilitado; solo se acepta efectivo.</span>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="mb-3 flex items-center gap-2 min-w-0">
                <div className="bg-red-100 p-2 rounded-lg text-red-600 dark:bg-red-950/60 dark:text-red-300 dark:ring-1 dark:ring-inset dark:ring-red-800/70 shrink-0">
                  <DollarSign size={18} />
                </div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-300 leading-tight">Costo Real</span>
              </div>
              <div className="flex items-center text-2xl font-black text-slate-800">
                {canSeeMoney ? (
                  <><span className="mr-1">$</span>
                    <input type="number" value={tempRealCost} disabled={!hasAdminRights} onChange={e => setTempRealCost(e.target.value)}
                      onBlur={async (e) => {
                        const newVal = parseFloat(e.target.value) || 0;
                        if (newVal !== (currentEvent.realCost || 0)) {
                          await updateEventConfig({ realCost: newVal });
                          addLog('Configuración', `Costo Real: $${currentEvent.realCost || 0} -> $${newVal}`, null, { id: 'Global', name: 'Sistema' }, { collectionName: 'app_events', docId: currentEvent.id, action: 'update', previousData: currentEvent });
                        }
                      }}
                      className={`bg-transparent border-b-2 outline-none w-24 transition-colors ${!hasAdminRights ? 'border-transparent cursor-not-allowed' : 'border-transparent hover:border-slate-200 focus:border-indigo-500'}`} /></>
                ) : <span>$***</span>}
              </div>
              {hasAdminRights && <p className="text-[10px] text-slate-400 font-bold mt-1">Costo real por persona</p>}
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <div className={`shrink-0 rounded-lg p-1.5 ${balanceNeto >= 0 ? 'bg-green-100 text-green-600 dark:bg-green-950/60 dark:text-green-300 dark:ring-1 dark:ring-inset dark:ring-green-800/70' : 'bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-300 dark:ring-1 dark:ring-inset dark:ring-red-800/70'}`}>
                    <Activity size={16} />
                  </div>
                  <span className="min-w-0 text-xs font-bold leading-snug text-slate-500 dark:text-slate-300">
                    Balance neto
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {!isBautizos ? renderSummaryDashScopeSlot('dashBalance') : null}
                  {hasAdminRights && (
                    <button
                      type="button"
                      onClick={toggleShowGrossWithoutCommission}
                      className={`${getCommissionToggleCompactBtnClasses(showGrossWithoutCommission)} self-end sm:self-auto`}
                      title={DASHBOARD_COMMISSION_VIEW_TITLE}
                      aria-label={DASHBOARD_COMMISSION_VIEW_TITLE}
                    >
                      <Wallet size={11} className="shrink-0 opacity-90" />
                      <span>{getDashboardCardCommissionToggleLabel(showGrossWithoutCommission)}</span>
                    </button>
                  )}
                </div>
              </div>
              <p className={`text-2xl font-black ${balanceNeto >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {formatMoney(balanceNeto)}
              </p>
              {hasAdminRights ? (
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <div className="flex flex-col gap-0.5 min-w-[7rem]">
                    <label htmlFor="dash-card-commission-pct" className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                      Comisión tarjeta (%)
                    </label>
                    <input
                      id="dash-card-commission-pct"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={cardCommissionPctDraft}
                      onChange={(e) => setCardCommissionPctDraft(e.target.value)}
                      onBlur={() => void handleSaveCardCommissionRate()}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-sm font-bold px-2 py-1.5 tabular-nums [color-scheme:light]"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 font-semibold pb-1 leading-snug max-w-[14rem]">
                    Aplica a pagos con tarjeta. Guarda al salir del campo.
                  </p>
                </div>
              ) : null}
              <p className="text-[10px] text-slate-500 font-bold mt-2 leading-snug">{DASHBOARD_COMMISSION_VIEW_HELP}</p>
            </div>
          </div>
        )}

        {duplicatesInEvent.total > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={22} className="text-amber-600 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-amber-800">
                  Diagnóstico: {duplicatesInEvent.total} posible{duplicatesInEvent.total === 1 ? '' : 's'} registro{duplicatesInEvent.total === 1 ? '' : 's'} duplicado{duplicatesInEvent.total === 1 ? '' : 's'}
                </p>
                <p className="text-[11px] text-amber-700 mt-1 leading-relaxed">
                  Se encontraron grupos de participantes activos o en lista de espera que comparten criterios de duplicado (por ejemplo mismo teléfono fuera de excepciones familiares, o el mismo ID VNPM en más de un registro).
                  Expande cada grupo para ver qué parámetros chocan; puedes dar de baja, archivar o autorizar el duplicado con confirmación.
                </p>
                {renderDuplicateGroups(duplicatesInEvent.duplicateClusters, 'summary')}
              </div>
            </div>
          </div>
        )}

        {companionCollisionsActionable.length > 0 && isBautizos && (
          <div className="bg-violet-50 border border-violet-200 rounded-2xl px-5 py-4 mt-4">
            <div className="flex items-start gap-3">
              <Users size={22} className="text-violet-600 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-violet-900">
                  Posibles dobles: acompañante + registro activo ({companionCollisionsActionable.length})
                </p>
                <p className="text-[11px] text-violet-800 mt-1 leading-relaxed">
                  Una persona figura como acompañante en el registro de un titular y también tiene (o parece tener) ficha activa propia.
                  Puedes vincular la fila de acompañante al registro activo para evitar doble conteo y cobro.
                </p>
                {renderCompanionCollisionGroups(companionCollisionsActionable, 'dashboard')}
              </div>
            </div>
          </div>
        )}

        {campaFamilyCollisionsInEvent.total > 0 && isCampa && (
          <div className="bg-sky-50 border border-sky-200 rounded-2xl px-5 py-4 mt-4">
            <div className="flex items-start gap-3">
              <Users size={22} className="text-sky-600 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-sky-900">
                  Parejas Campa sin vínculo ({campaFamilyCollisionsInEvent.total})
                </p>
                <ul className="mt-2 space-y-1 text-[11px] text-sky-900 font-semibold">
                  {campaFamilyCollisionsInEvent.clusters
                    .filter((c) => c.confidence !== 'possible')
                    .slice(0, 8)
                    .map((c, i) => (
                      <li key={i}>{describeCampaSpouseCluster(c)}</li>
                    ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {hasAdminRights && cupoSedeOpen && (
          <div className={uiModal.overlay} role="dialog" aria-modal="true" aria-labelledby="cupo-modal-title">
            <button type="button" className={uiModal.backdrop} onClick={() => setCupoSedeOpen(false)} aria-label="Cerrar cupo" />
            <div className={uiModal.panel}>
              <div className="shrink-0 p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 id="cupo-modal-title" className="text-sm font-black text-slate-700 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                    <Users size={16} className="text-indigo-600 dark:text-indigo-400" /> Cupo por sede
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-300 mt-1 leading-relaxed">
                    Usa 0 para cupo ilimitado. El cupo global se comparte entre todas las sedes y se consume conforme entran registros.
                  </p>
                </div>
                <button type="button" onClick={() => setCupoSedeOpen(false)} className={uiButtons.closeIcon} aria-label="Cerrar">
                  <X size={20} />
                </button>
              </div>
            <div className="px-5 pb-5 overflow-y-auto min-h-0 flex-1">
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 dark:bg-slate-900/40 dark:border-indigo-500/50 p-4 mb-4">
              <p className="text-xs font-black text-indigo-900 dark:text-indigo-100 uppercase tracking-wider mb-1">
                Cupo total del evento
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
                Tope global compartido por todas las sedes. Ejemplo: si el máximo global es 500 y llevas 6 unidades inscritas en total, el remanente es 494 y ese mismo valor aplica para todas las sedes. El consumo global incluye acompañantes con nombre en Bautizos y valores ×2 cuando aplican en Campa.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Máximo</label>
                <input
                  type="number"
                  min="0"
                  value={tempEventTotalCap}
                  onChange={(e) => setTempEventTotalCap(Math.max(0, parseInt(e.target.value || '0', 10) || 0))}
                  onBlur={async () => {
                    if (!currentEvent?.id) return;
                    const prev = Math.max(0, Number(currentEvent.eventTotalCap ?? 0));
                    const next = Math.max(0, Number(tempEventTotalCap ?? 0));
                    if (prev === next) return;
                    await updateEventConfig({ eventTotalCap: next });
                    addLog(
                      'Configuración',
                      `Cupo total del evento: ${prev > 0 ? prev : 'Ilimitado'} -> ${next > 0 ? next : 'Ilimitado'}` +
                        (next === 0 ? ' (cupo global ilimitado)' : ''),
                      null,
                      { id: 'Global', name: 'Sistema' },
                      { collectionName: 'app_events', docId: currentEvent.id, action: 'update', previousData: currentEvent }
                    );
                  }}
                  className="w-28 px-2 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 tabular-nums"
                />
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Unidades usadas globales:{' '}
                  <strong className="text-slate-800 dark:text-slate-100 tabular-nums">{getEventCapUsedUnits()}</strong>
                  {' / '}
                  <span className="tabular-nums">
                    {tempEventTotalCap > 0 ? tempEventTotalCap : 'Ilimitado'}
                  </span>
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
              {(dashboardLocs).map((loc) => {
                const globalCardOffMu = currentEvent.cardPaymentEnabled === false;
                const globalUsed = getEventCapUsedUnits();
                const sharedRemaining = tempEventTotalCap > 0 ? Math.max(0, tempEventTotalCap - globalUsed) : null;
                const currentCap = sharedRemaining != null
                  ? sharedRemaining
                  : Number(tempLocationCaps?.[loc] ?? currentEvent?.locationCaps?.[loc] ?? 0);
                const activeCount = (data[loc] || []).length;
                return (
                  <div key={`cap-${loc}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-black text-slate-700 mb-2">{loc}</p>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">{sharedRemaining != null ? 'Remanente global' : 'Cupo'}</label>
                      <input
                        type="number"
                        min="0"
                        value={currentCap}
                        disabled={sharedRemaining != null}
                        onChange={(e) => setTempLocationCaps(prev => ({ ...prev, [loc]: Math.max(0, parseInt(e.target.value || '0', 10) || 0) }))}
                        onBlur={async () => {
                          if (sharedRemaining != null) return;
                          const prevCap = Number(currentEvent?.locationCaps?.[loc] || 0);
                          const nextCap = Number(tempLocationCaps?.[loc] ?? 0);
                          if (prevCap === nextCap) return;
                          const updatedCaps = { ...(currentEvent?.locationCaps || {}), [loc]: nextCap };
                          await updateEventConfig({ locationCaps: updatedCaps });
                          addLog('Configuración', `Cupo en ${loc}: ${prevCap || 'Ilimitado'} -> ${nextCap || 'Ilimitado'}`, null, { id: 'Global', name: 'Sistema' }, { collectionName: 'app_events', docId: currentEvent.id, action: 'update', previousData: currentEvent });
                        }}
                        className="w-24 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2">
                      {sharedRemaining != null ? (
                        <>Consumo global: <strong>{globalUsed}</strong> / {tempEventTotalCap}</>
                      ) : (
                        <>Activos: <strong>{activeCount}</strong> / {currentCap > 0 ? currentCap : 'Ilimitado'}</>
                      )}
                    </p>
                    {hasAdminRights ? (
                      <div className="mt-3 pt-2 border-t border-slate-200/90 dark:border-slate-600/80">
                        <label
                          className={`flex items-start gap-2 text-[11px] font-semibold text-slate-700 dark:text-slate-200 ${
                            globalCardOffMu ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800"
                            disabled={globalCardOffMu}
                            checked={!globalCardOffMu && currentEvent.cardPaymentByLocation?.[loc] !== false}
                            onChange={async (e) => {
                              const allow = e.target.checked;
                              const map = { ...(currentEvent.cardPaymentByLocation || {}) };
                              if (allow) delete map[loc];
                              else map[loc] = false;
                              try {
                                await updateEventConfig({ cardPaymentByLocation: map });
                                addLog(
                                  'Configuración',
                                  `Pago con tarjeta en sede «${loc}»: ${allow ? 'habilitado' : 'deshabilitado'}.`,
                                  null,
                                  { id: 'Global', name: 'Sistema' },
                                  { collectionName: 'app_events', docId: currentEvent.id, action: 'update', previousData: currentEvent }
                                );
                                showToast(allow ? `Pago con tarjeta habilitado en ${loc}.` : `Pago con tarjeta deshabilitado en ${loc}.`);
                              } catch (err) {
                                console.error(err);
                                showToast('No se pudo guardar el cambio.');
                              }
                            }}
                          />
                          <span>Permitir pago con tarjeta en esta sede</span>
                        </label>
                        {!globalCardOffMu && currentEvent.cardPaymentByLocation?.[loc] === false ? (
                          <p className="text-[10px] font-bold text-amber-800 dark:text-amber-200/90 mt-1.5 pl-6 leading-snug">
                            El pago con tarjeta está deshabilitado en esta sede.
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="mt-5 border-t border-slate-100 pt-4">
              <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-1">Cupo vs Espera por Sede</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                <strong>Límite</strong> es el tope configurado (global compartido o por sede). <strong>Remanente</strong> son las unidades que aún caben antes de mandar nuevos registros a lista de espera. En <strong>Activos</strong> se cuentan las unidades que consumen cupo en cada sede (acompañantes con deduplicación canónica en Bautizos y ×2 en Campa cuando aplica).
              </p>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-black border-b border-slate-100">
                      <th className="px-4 py-2.5">Sede</th>
                      <th className="px-4 py-2.5 text-center">Activos</th>
                      <th className="px-4 py-2.5 text-center">Límite</th>
                      <th className="px-4 py-2.5 text-center">Remanente</th>
                      <th className="px-4 py-2.5 text-center">Espera</th>
                      <th className="px-4 py-2.5 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(() => {
                      const gCap = Math.max(0, Number(tempEventTotalCap ?? 0));
                      const globalUsed = getEventCapUsedUnits();
                      const capStatusToneClass = {
                        full: 'bg-rose-100 text-rose-800 border-rose-200',
                        available: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                        waitlist: 'bg-amber-100 text-amber-800 border-amber-200',
                      };
                      return dashboardLocs.map((loc) => {
                        const activeCapUnits = eventCapUsedUnitsBySede[loc] ?? 0;
                        const locationCap = Number(tempLocationCaps?.[loc] ?? currentEvent?.locationCaps?.[loc] ?? 0);
                        const configuredLimit = resolveConfiguredCapLimit({
                          eventTotalCap: gCap,
                          locationCap,
                        });
                        const remaining = computeCapRemaining({
                          eventTotalCap: gCap,
                          globalUsed,
                          locationCap,
                          activeAtSede: activeCapUnits,
                        });
                        const waitCount = waitlistCupoCountBySede[loc] ?? 0;
                        const status = resolveSedeCapStatus({
                          eventTotalCap: gCap,
                          globalUsed,
                          locationCap,
                          activeAtSede: activeCapUnits,
                          waitCount,
                        });
                        const remainingDisplay = formatCapRemainingDisplay(remaining);
                        const remainingClass =
                          remaining === 0 && configuredLimit.scope !== 'unlimited'
                            ? 'text-rose-700 font-black'
                            : 'text-slate-700 font-semibold';
                        return (
                          <tr key={`cap-wait-${loc}`} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-4 py-2.5 font-bold text-slate-700">{loc}</td>
                            <td className="px-4 py-2.5 text-center font-semibold text-slate-700 tabular-nums">{activeCapUnits}</td>
                            <td className="px-4 py-2.5 text-center">
                              <span className="font-semibold text-slate-700 tabular-nums">{configuredLimit.label}</span>
                              {configuredLimit.detail ? (
                                <span className="block text-[9px] font-bold text-indigo-600 uppercase tracking-wide mt-0.5">
                                  {configuredLimit.detail}
                                </span>
                              ) : configuredLimit.scope === 'sede' ? (
                                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">
                                  Por sede
                                </span>
                              ) : null}
                            </td>
                            <td className={`px-4 py-2.5 text-center tabular-nums ${remainingClass}`}>{remainingDisplay}</td>
                            <td className={`px-4 py-2.5 text-center font-black tabular-nums ${waitCount > 0 ? 'text-amber-600' : 'text-slate-500'}`}>
                              {waitCount}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${capStatusToneClass[status.tone]}`}>
                                {status.label}
                              </span>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
              {resolveCupoLimitMode(tempEventTotalCap) === 'global' ? (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Consumo global actual: <strong className="tabular-nums text-slate-700 dark:text-slate-200">{getEventCapUsedUnits()}</strong>
                  {' / '}
                  <strong className="tabular-nums text-slate-700 dark:text-slate-200">{tempEventTotalCap}</strong>
                  {' '}
                  unidades. El remanente es el mismo para todas las sedes porque el cupo es compartido.
                </p>
              ) : null}
            </div>
            </div>
          </div>
          </div>
        )}


        {viewPrefs.tableDetails && (
          <>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mt-8 overflow-visible">
            <div className="relative z-20 overflow-visible p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg text-slate-600 dark:text-slate-300">
                  <TableProperties size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Visualización de Datos Generales</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Resumen por sede. Las columnas cuentan dentro de la{' '}
                    <span className="font-bold text-slate-600 dark:text-slate-300">base</span> que elijas abajo (p. ej. con «Cualquier becado» activo, Servidores y Teens muestran solo becados que sirven o en Teens).
                  </p>
                </div>
              </div>
              <div className="relative flex flex-wrap items-center gap-2" data-dropdown-root="summary-dashboard-filters">
                {renderSummaryDashScopeSlot('tableDetails')}
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Filtros:</span>
                <button
                  ref={summaryFiltersBtnRef}
                  type="button"
                  onClick={() => setSummaryFiltersDropdownOpen((v) => !v)}
                  className={`${uiDropdown.trigger}`}
                  aria-expanded={summaryFiltersDropdownOpen}
                  aria-haspopup="true"
                  aria-label={
                    activeSummaryDashboardFilterCount > 0
                      ? `Ver filtros y columnas (${activeSummaryDashboardFilterCount} filtros de base activos)`
                      : 'Ver filtros y columnas'
                  }
                >
                  <Filter size={14} className="text-slate-500 dark:text-slate-400" />
                  Ver filtros y columnas
                  {activeSummaryDashboardFilterCount > 0 && (
                    <span
                      className="pointer-events-none absolute -top-1.5 -right-1.5 min-h-[1.125rem] min-w-[1.125rem] px-1 flex items-center justify-center rounded-full bg-indigo-600 text-white text-[9px] font-black leading-none tabular-nums shadow-sm"
                      aria-hidden
                    >
                      {activeSummaryDashboardFilterCount > 99 ? '99+' : activeSummaryDashboardFilterCount}
                    </span>
                  )}
                </button>
                {summaryFiltersDropdownOpen && summaryFiltersMenuPos && typeof document !== 'undefined' && createPortal(
                  <div
                    data-dropdown-root="summary-dashboard-filters"
                    role="dialog"
                    aria-label="Filtros y columnas del resumen"
                    className={`fixed z-[200] max-h-[min(28rem,calc(100vh-8rem))] overflow-y-auto overscroll-y-contain rounded-xl shadow-xl p-3 space-y-3 border bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-600 ${uiFilter.dropdownScope}`}
                    style={{
                      top: summaryFiltersMenuPos.top,
                      right: summaryFiltersMenuPos.right,
                      width: summaryFiltersMenuPos.width,
                    }}
                  >
                    <button
                      type="button"
                      className="w-full px-3 py-2 rounded-lg text-[10px] font-black bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      onClick={() => {
                        setSummaryFilterScholarship('all');
                        setSummaryFilterServer('all');
                        setSummaryFilterAssignment('all');
                        setSummaryFilterBaptism('all');
                        setSummaryCampaScopes({});
                      }}
                    >
                      Limpiar filtros
                    </button>
                    <div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug mb-2">
                        Solo se muestran en la tabla quienes cumplan{' '}
                        <span className="font-bold text-slate-700 dark:text-slate-200">todas</span> las condiciones que marques. Así puedes ver, por ejemplo, becados que se bautizan o servidores en Teens.
                      </p>
                      <div className="space-y-2">
                        {isBautizos ? (
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                            En Bautizos el resumen por sede usa el{' '}
                            <span className="font-bold text-slate-700 dark:text-slate-200">alcance global</span> del dashboard (barra inferior). Los filtros de beca, Teens y Jóvenes no aplican.
                          </p>
                        ) : (
                        <div>
                          <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1">Beca</p>
                          {[
                            { id: 'all', label: 'Todos' },
                            { id: 'becado', label: 'Cualquier becado' },
                            { id: 'partial', label: 'Beca parcial' },
                            { id: 'total', label: 'Beca total' },
                            { id: 'No', label: 'No becado' },
                          ].map((op) => (
                            <label key={op.id} className={uiFilter.optionRow}>
                              <input
                                type="checkbox"
                                checked={summaryFilterScholarship === op.id}
                                onChange={() => setSummaryFilterScholarship(summaryFilterScholarship === op.id ? 'all' : op.id)}
                              />
                              {op.label}
                            </label>
                          ))}
                        </div>
                        )}
                        {isCampa && (
                          <>
                            <div>
                              <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1">Servidor / Campero</p>
                              {[
                                { id: 'all', label: 'Todos' },
                                { id: SI, label: 'Solo servidores' },
                                { id: 'No', label: 'Solo camperos' },
                                { id: 'Teens', label: 'Servidor en Teens (incl. Ambos sirviendo en Teens)' },
                                { id: 'Jóvenes', label: 'Servidor en Jóvenes (incl. Ambos sirviendo en Jóvenes)' },
                                { id: 'Ambos', label: 'Servidor tarifa única Ambos' },
                              ].map((op) => (
                                <label key={String(op.id)} className={uiFilter.optionRow}>
                                  <input
                                    type="checkbox"
                                    checked={summaryFilterServer === op.id}
                                    onChange={() => setSummaryFilterServer(summaryFilterServer === op.id ? 'all' : op.id)}
                                  />
                                  {op.label}
                                </label>
                              ))}
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1">Asignación campamento</p>
                              {['all', 'Teens', 'Jóvenes', 'Ambos'].map((op) => (
                                <label key={op} className={uiFilter.optionRow}>
                                  <input
                                    type="checkbox"
                                    checked={summaryFilterAssignment === op}
                                    onChange={() => setSummaryFilterAssignment(summaryFilterAssignment === op ? 'all' : op)}
                                  />
                                  {op === 'all' ? 'Todas' : op}
                                </label>
                              ))}
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1">Bautizo (conteo)</p>
                              {[
                                { id: 'all', label: 'Todos' },
                                { id: 'teens', label: 'Se bautiza en Teens' },
                                { id: 'jovenes', label: 'Se bautiza en Jóvenes' },
                                { id: 'no', label: 'No se bautiza' },
                              ].map((op) => (
                                <label key={op.id} className={uiFilter.optionRow}>
                                  <input
                                    type="checkbox"
                                    checked={summaryFilterBaptism === op.id}
                                    onChange={() => setSummaryFilterBaptism(summaryFilterBaptism === op.id ? 'all' : op.id)}
                                  />
                                  {op.label}
                                </label>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="border-t border-slate-100 dark:border-slate-700 pt-2">
                      <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase">Columnas visibles</p>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
                        {getSummaryTableColumnKeysForEventType(currentEvent?.eventType).map((colKey) => (
                          <label key={`sum-col-${colKey}`} className={`${uiFilter.optionRow} py-1`}>
                            <input
                              type="checkbox"
                              checked={summaryTableColumns[colKey] !== false}
                              onChange={(e) => setSummaryTableColumns((prev) => ({ ...prev, [colKey]: e.target.checked }))}
                            />
                            {SUMMARY_TABLE_COLUMN_LABELS[colKey] || colKey}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                      <button
                        type="button"
                        className="w-full px-3 py-2 rounded-lg text-xs font-black bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                        onClick={() => {
                          setSummaryTableColumns({
                            ...getSummaryTableColumnDefaultsForEventType(currentEvent?.eventType),
                          });
                          setSummaryFiltersDropdownOpen(false);
                        }}
                      >
                        Restaurar columnas por defecto
                      </button>
                    </div>
                  </div>,
                  document.body
                )}
              </div>
            </div>
            <div className="relative z-0 overflow-x-auto max-w-full rounded-b-2xl">
              <table className="w-max min-w-full border-separate border-spacing-0 text-[11px] md:text-xs">
                <thead>
                  <tr>
                    <th className={sumHeadLoc}>Sede</th>
                    {summaryColumnKeysForEvent.filter(showSummaryTableColumn).map((colKey) => (
                      <th key={`sum-h-${colKey}`} className={SUMMARY_TABLE_MONEY_KEYS.has(colKey) ? sumHeadMoney : sumHeadNum}>
                        {summaryColumnHeaderLabel(colKey)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {tableByLocation.every(({ stats }) => stats.count === 0 && stats.waitlist === 0 && stats.cancelled === 0) ? (
                    <tr>
                      <td colSpan={summaryVisibleColCount} className="px-3 py-8 text-center text-slate-400 italic font-medium">No hay registros con los filtros actuales.</td>
                    </tr>
                  ) : tableByLocation.map(({ loc, stats }) => (
                    <tr key={`sum-${loc}`} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className={sumCellLoc} title={loc}>{loc}</td>
                      {summaryColumnKeysForEvent.filter(showSummaryTableColumn).map((colKey) => {
                        const val = getSummaryStatValue(stats, colKey);
                        const open = () => openSummaryCellModal('location', loc, colKey);
                        const onKey = (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            open();
                          }
                        };
                        if (SUMMARY_TABLE_MONEY_KEYS.has(colKey)) {
                          const moneyVal = colKey === 'donations' ? (stats.donations ?? 0) : val;
                          return (
                            <td
                              key={`${loc}-${colKey}`}
                              role="button"
                              tabIndex={0}
                              title={colKey === 'donations' ? 'Ver listado de donaciones' : 'Ver listado'}
                              onClick={open}
                              onKeyDown={onKey}
                              className={summaryMoneyBodyClass(colKey)}
                            >
                              {formatMoney(moneyVal)}
                              {colKey === 'paid' &&
                              showGrossWithoutCommission &&
                              Math.max(0, (stats.paidTarjetaGross || 0) - (stats.paidTarjetaNet || 0)) > 0 ? (
                                <span className="block text-[9px] font-semibold text-rose-500">
                                  Com.: {formatMoney(Math.max(0, (stats.paidTarjetaGross || 0) - (stats.paidTarjetaNet || 0)))}
                                </span>
                              ) : null}
                              {colKey === 'paidTarjeta' &&
                              showGrossWithoutCommission &&
                              Math.max(0, (stats.paidTarjetaGross || 0) - (stats.paidTarjetaNet || 0)) > 0 ? (
                                <span className="block text-[9px] font-semibold text-rose-500">
                                  Com.: {formatMoney(Math.max(0, (stats.paidTarjetaGross || 0) - (stats.paidTarjetaNet || 0)))}
                                </span>
                              ) : null}
                            </td>
                          );
                        }
                        return (
                          <td
                            key={`${loc}-${colKey}`}
                            role="button"
                            tabIndex={0}
                            title="Ver listado"
                            onClick={open}
                            onKeyDown={onKey}
                            className={summaryColBodyClass(colKey)}
                          >
                            {val}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="group bg-indigo-50 dark:bg-slate-800 border-t-2 border-indigo-100 dark:border-slate-600">
                    <td className={`${sumFootLoc} ${sumCellClick}`}>Global</td>
                    {summaryColumnKeysForEvent.filter(showSummaryTableColumn).map((colKey) => {
                      const val = getSummaryStatValue(globalTableStats, colKey);
                      const open = () => openSummaryCellModal('global', '', colKey);
                      const onKey = (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          open();
                        }
                      };
                      if (SUMMARY_TABLE_MONEY_KEYS.has(colKey)) {
                        const moneyVal = colKey === 'donations' ? (globalTableStats.donations ?? 0) : val;
                        return (
                          <td
                            key={`sum-foot-${colKey}`}
                            role="button"
                            tabIndex={0}
                            title={colKey === 'donations' ? 'Ver todas las donaciones del evento' : 'Ver listado'}
                            onClick={open}
                            onKeyDown={onKey}
                            className={summaryMoneyFootClass(colKey)}
                          >
                            {formatMoney(moneyVal)}
                            {colKey === 'paid' &&
                            showGrossWithoutCommission &&
                            Math.max(0, (globalTableStats.paidTarjetaGross || 0) - (globalTableStats.paidTarjetaNet || 0)) > 0 ? (
                              <span className="block text-[9px] font-semibold text-rose-500">
                                Com.: {formatMoney(Math.max(0, (globalTableStats.paidTarjetaGross || 0) - (globalTableStats.paidTarjetaNet || 0)))}
                              </span>
                            ) : null}
                            {colKey === 'paidTarjeta' &&
                            showGrossWithoutCommission &&
                            Math.max(0, (globalTableStats.paidTarjetaGross || 0) - (globalTableStats.paidTarjetaNet || 0)) > 0 ? (
                              <span className="block text-[9px] font-semibold text-rose-500">
                                Com.: {formatMoney(Math.max(0, (globalTableStats.paidTarjetaGross || 0) - (globalTableStats.paidTarjetaNet || 0)))}
                              </span>
                            ) : null}
                          </td>
                        );
                      }
                      return (
                        <td
                          key={`sum-foot-${colKey}`}
                          role="button"
                          tabIndex={0}
                          title="Ver listado"
                          onClick={open}
                          onKeyDown={onKey}
                          className={summaryColFootClass(colKey)}
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          {summaryCellDetailModal.isOpen && (
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
              onClick={() => setSummaryCellDetailModal((prev) => ({ ...prev, isOpen: false }))}
              role="presentation"
            >
              <div
                className="bg-white rounded-3xl w-full max-w-3xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden border border-slate-100"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="summary-cell-modal-title"
              >
                <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3 shrink-0">
                  <div className="min-w-0">
                    <h3 id="summary-cell-modal-title" className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <TableProperties size={20} className="text-indigo-500 shrink-0" />
                      {summaryMetricLabels[summaryCellDetailModal.metric] || summaryCellDetailModal.metric}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {summaryCellDetailModal.scope === 'global' ? 'Todas las sedes' : `Sede: ${summaryCellDetailModal.locationLabel}`}
                      {' · '}
                      Mismos filtros que la tabla del resumen.
                    </p>
                    <p className="text-[11px] font-bold text-indigo-700 mt-1">
                      {summaryCellDetailModal.metric === 'donations'
                        ? `${summaryCellModalDonations.length} donación${summaryCellModalDonations.length !== 1 ? 'es' : ''}`
                        : `${summaryCellModalRows.length} ${
                            isBautizos &&
                            (summaryCellDetailModal.metric === 'count' ||
                              summaryCellDetailModal.metric === 'bautizados' ||
                              summaryCellDetailModal.metric === 'waitlist')
                              ? `persona${summaryCellModalRows.length !== 1 ? 's' : ''}`
                              : `registro${summaryCellModalRows.length !== 1 ? 's' : ''}`
                          }`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSummaryCellDetailModal((prev) => ({ ...prev, isOpen: false }))}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors shrink-0"
                    title="Cerrar"
                  >
                    <XCircle size={22} />
                  </button>
                </div>
                <div className="overflow-y-auto flex-1 min-h-0 p-4 space-y-3">
                  {summaryCellDetailModal.metric === 'donations' ? (
                    summaryCellModalDonations.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-10 italic">No hay donaciones en este alcance.</p>
                    ) : (
                      summaryCellModalDonations.map((don) => (
                        <div
                          key={don.id}
                          className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                              <p className="text-lg font-black text-emerald-800 tabular-nums">{formatMoney(don.amount)}</p>
                              {don.fromCancelledRefundDonation ? (
                                <span className="text-[9px] font-black dark:font-normal uppercase bg-emerald-100 text-emerald-900 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                                  Donación por baja/cancelación{don._syntheticCancelledRefund ? ' · legado' : ''}
                                </span>
                              ) : null}
                              {don.fromArchivedManualCredit ? (
                                <span className="text-[9px] font-black dark:font-normal uppercase bg-emerald-100 text-emerald-900 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                                  Saldo a favor · archivo{don._syntheticArchivedCredit ? ' · legado' : ''}
                                </span>
                              ) : null}
                            </div>
                            <p className="text-sm font-bold text-slate-800 truncate">
                              {don.donorName ? don.donorName : <span className="italic text-slate-500">Sin nombre</span>}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-1">
                              {don.createdBy} · {don.createdAt ? new Date(don.createdAt).toLocaleString('es-MX') : '—'}
                              {don.location ? ` · Sede: ${don.location}` : ''}
                            </p>
                          </div>
                          {hasAdminRights && (
                            <p className="text-[10px] font-mono text-slate-400 shrink-0">ID: {don.id}</p>
                          )}
                        </div>
                      ))
                    )
                  ) : summaryCellModalRows.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-10 italic">Nadie coincide con esta celda y los filtros actuales.</p>
                  ) : (
                    summaryCellModalRows.map((p, idx) => {
                      if (p.__summaryCompanionRow) {
                        return (
                          <div
                            key={p.id}
                            className="rounded-2xl border border-teal-100 bg-teal-50/30 p-4"
                          >
                            <div className="flex items-start gap-2">
                              <span className="inline-flex items-center justify-center min-w-[1.6rem] h-6 px-1 rounded-md bg-teal-100 border border-teal-200/80 text-[11px] font-black text-teal-800">
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-800">{p.displayName}</p>
                                <p className="text-xs text-slate-500 mt-1">
                                  Acompañante · Inscrito: {p.hostName} · {p.location}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      if (p.__summaryTransportRow) {
                        return (
                          <div
                            key={p.id}
                            className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4 text-sm"
                          >
                            <span className="inline-flex items-center justify-center min-w-[1.6rem] h-6 px-1 rounded-md bg-indigo-100 text-[11px] font-black text-indigo-800 mr-2 align-middle">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-slate-800 align-middle">{p.displayName}</span>
                            <span className="text-slate-600 ml-2 text-xs font-semibold">({p.lineKind})</span>
                            <p className="text-[11px] text-slate-500 mt-2 pl-7">
                              {p.registradoName ? `Inscrito: ${p.registradoName} · ` : ''}Sede: {p.location}
                            </p>
                            <p className="text-[11px] text-slate-600 mt-1 pl-7 leading-snug">{p.transportSummary}</p>
                          </div>
                        );
                      }
                      if (p.__summaryCarRow) {
                        return (
                          <div
                            key={p.id}
                            className="rounded-2xl border border-cyan-100 bg-cyan-50/30 p-4 text-sm"
                          >
                            <span className="inline-flex items-center justify-center min-w-[1.6rem] h-6 px-1 rounded-md bg-cyan-100 text-[11px] font-black text-cyan-900 mr-2 align-middle">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-slate-800 align-middle">{p.displayName}</span>
                            <span className="text-slate-600 ml-2 text-xs font-semibold">({p.lineKind})</span>
                            <p className="text-[11px] text-slate-500 mt-2 pl-7">
                              {p.registradoName ? `Inscrito: ${p.registradoName} · ` : ''}Sede: {p.location}
                            </p>
                            {p.cars > 0 ? (
                              <p className="text-[11px] font-bold text-cyan-800 mt-1 pl-7">Carros (llegada): {p.cars}</p>
                            ) : null}
                          </div>
                        );
                      }
                      const liq = getLiquidationTarget(p);
                      const paidGross = getParticipantNetPaidFromHistory(p, computeNetAmountByMethod);
                      const pend = Math.max(0, liq - paidGross);
                      const listCost = resolveRegisteredCost(p, currentPricing);
                      const becaCond = isSiValue(p.isScholarship) ? getScholarshipCondonedAmount(p) : 0;
                      return (
                        <div
                          key={p.id}
                          className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4 flex flex-col sm:flex-row gap-4 sm:items-start"
                        >
                          <div className="min-w-0 flex-1">{renderRegistrationParticipantColumn(p, { displayIndex: idx + 1, rosterLocation: p.location })}</div>
                          {hasFinancialAccess ? (
                            <div className="shrink-0 w-full sm:w-[220px] rounded-xl border border-slate-200 bg-white p-3 text-[11px] space-y-1.5">
                              <p className="text-[9px] font-black dark:font-normal uppercase text-slate-400 tracking-wider">Finanzas</p>
                              <p className="flex justify-between gap-2"><span className="text-slate-500">Costo lista</span><span className="font-bold tabular-nums text-slate-800">{formatMoney(listCost)}</span></p>
                              <p className="flex justify-between gap-2"><span className="text-slate-500">Meta a liquidar</span><span className="font-bold tabular-nums text-slate-800">{formatMoney(liq)}</span></p>
                              <p className="flex justify-between gap-2"><span className="text-slate-500">Pagado</span><span className="font-bold tabular-nums text-green-700">{formatMoney(paidGross)}</span></p>
                              <p className="flex justify-between gap-2"><span className="text-slate-500">Saldo pendiente</span><span className={`font-bold tabular-nums ${pend > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>{pend > 0 ? formatMoney(pend) : '—'}</span></p>
                              {isSiValue(p.isScholarship) && (
                                <p className="flex justify-between gap-2 pt-1 border-t border-slate-100"><span className="text-purple-600 font-bold">Condonado (beca)</span><span className="font-bold tabular-nums text-purple-700">{formatMoney(becaCond)}</span></p>
                              )}
                              {p.scholarshipType === 'partial' && isSiValue(p.isScholarship) && (
                                <p className="text-[10px] text-slate-500">Monto becado declarado: {formatMoney(Number(p.scholarshipPartialAmount || 0))}</p>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 sm:w-[180px]">Sin permiso para ver montos.</p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
          </>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
          
          {viewPrefs.chartLocations && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-2">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><MapPin className="text-indigo-500" size={20} /> Registrados por Sede</h3>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {renderSummaryDashScopeSlot('chartLocations')}
                  <button type="button" onClick={() => toggleSummaryPieLocChart()} className="px-2 py-1 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded-md text-[10px] font-bold transition-colors border border-slate-200">
                    {showLocChartValues ? 'Ver %' : 'Ver #'}
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-6">
                {isBautizos
                  ? getBautizosDashboardScopeChartHint(bautizosDashScope, 'locations')
                  : 'Proporción de inscritos activos (alcance Teens/Jóvenes propio de esta tarjeta).'}
              </p>
              <div className="flex flex-col items-center justify-center gap-6">
                <div className="w-40 h-40 rounded-full shadow-inner border-4 border-white transition-all duration-1000" style={{ background: locPie.getPieChartGradient('count') }} />
                <div className="w-full grid grid-cols-2 gap-2">
                  {(dashboardLocs).map((loc) => {
                    const locCount = tableByLocationLocChart.find((t) => t.loc === loc)?.stats.count ?? 0;
                    const percent = locPie.filteredTotalRegsForPie > 0 ? ((locCount / locPie.filteredTotalRegsForPie) * 100).toFixed(1) : 0;
                    return (
                      <div key={loc} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: locationChartColorMap.get(loc) ?? '#94a3b8' }} /><span className="font-semibold text-slate-600 truncate max-w-[60px]" title={loc}>{loc}</span></div>
                        <span className="font-bold text-slate-800">{showLocChartValues ? locCount : `${percent}%`}</span>
                      </div>
                    ); 
                  })}
                </div>
              </div>
            </div>
          )}
          
          {viewPrefs.chartIncome && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-2 gap-3">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 min-w-0"><PieChart className="text-green-500 shrink-0" size={20} /> Ingresos por Sede</h3>
                <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                  {renderSummaryDashScopeSlot('chartIncome')}
                  <button type="button" onClick={() => toggleSummaryPieIncChart()} className="px-2 py-1 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded-md text-[10px] font-bold transition-colors border border-slate-200">
                    {showIncChartValues ? 'Ver %' : 'Ver $'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowIncomeCashCardByLocation((v) => !v)}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors border ${
                      showIncomeCashCardByLocation
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                    }`}
                    aria-expanded={showIncomeCashCardByLocation}
                  >
                    {showIncomeCashCardByLocation ? 'Ocultar efectivo / tarjeta' : 'Efectivo / tarjeta'}
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                {isBautizos
                  ? getBautizosDashboardScopeChartHint(bautizosDashScope, 'income')
                  : 'Recaudación total por sede (alcance Teens/Jóvenes propio de esta tarjeta).'}
                {!showIncomeCashCardByLocation && (
                  <> Pulsa «Efectivo / tarjeta» para ver el reparto por método de pago por sede.</>
                )}
              </p>
              <div className="flex flex-col items-center justify-center gap-6">
                <div className="w-40 h-40 rounded-full shadow-inner border-4 border-white transition-all duration-1000" style={{ background: incPie.getPieChartGradient('paid') }} />
                <div className="w-full grid grid-cols-2 gap-2">
                  {(dashboardLocs).map((loc) => {
                    const locPaid = tableByLocationIncomeChart.find((t) => t.loc === loc)?.stats.paid ?? 0;
                    const percent = incPie.totalPaidForLocationPie > 0 ? ((locPaid / incPie.totalPaidForLocationPie) * 100).toFixed(1) : 0;
                    return (
                      <div key={loc} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: locationChartColorMap.get(loc) ?? '#94a3b8' }} /><span className="font-semibold text-slate-600 truncate max-w-[60px]" title={loc}>{loc}</span></div>
                        <span className="font-bold text-slate-800">{showIncChartValues ? formatMoney(locPaid) : `${percent}%`}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {showIncomeCashCardByLocation && (
              <div className="mt-8 pt-6 border-t border-slate-100 space-y-4">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Efectivo y tarjeta por sede</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-xs font-bold text-emerald-800 w-full text-center">Efectivo por sede</p>
                    <div className="w-32 h-32 rounded-full shadow-inner border-4 border-white transition-all duration-1000" style={{ background: incPie.getPieChartGradient('paidEfectivo') }} />
                    <div className="w-full grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto pr-1">
                      {(dashboardLocs).map((loc) => {
                        const v = tableByLocationIncomeChart.find((t) => t.loc === loc)?.stats.paidEfectivo ?? 0;
                        const pct = incPie.totalEfectivoForLocationPie > 0 ? ((v / incPie.totalEfectivoForLocationPie) * 100).toFixed(1) : 0;
                        return (
                          <div key={`ef-${loc}`} className="flex items-center justify-between text-[11px] gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: locationChartColorMap.get(loc) ?? '#94a3b8' }} />
                              <span className="font-semibold text-slate-600 truncate" title={loc}>{loc}</span>
                            </div>
                            <span className="font-bold text-emerald-800 tabular-nums shrink-0">{showIncChartValues ? formatMoney(v) : `${pct}%`}</span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-slate-600 w-full text-center border-t border-emerald-100 pt-2">
                      Total efectivo: <span className="font-black text-emerald-800">{formatMoney(incPie.totalEfectivoForLocationPie)}</span>
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-xs font-bold text-indigo-800 w-full text-center">Tarjeta por sede</p>
                    <div className="w-32 h-32 rounded-full shadow-inner border-4 border-white transition-all duration-1000" style={{ background: incPie.getPieChartGradient('paidTarjeta') }} />
                    <div className="w-full grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto pr-1">
                      {(dashboardLocs).map((loc) => {
                        const v = tableByLocationIncomeChart.find((t) => t.loc === loc)?.stats.paidTarjeta ?? 0;
                        const pct = incPie.totalTarjetaForLocationPie > 0 ? ((v / incPie.totalTarjetaForLocationPie) * 100).toFixed(1) : 0;
                        return (
                          <div key={`tj-${loc}`} className="flex items-center justify-between text-[11px] gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: locationChartColorMap.get(loc) ?? '#94a3b8' }} />
                              <span className="font-semibold text-slate-600 truncate" title={loc}>{loc}</span>
                            </div>
                            <span className="font-bold text-indigo-800 tabular-nums shrink-0">{showIncChartValues ? formatMoney(v) : `${pct}%`}</span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-slate-600 w-full text-center border-t border-indigo-100 pt-2">
                      Total tarjeta: <span className="font-black text-indigo-800">{formatMoney(incPie.totalTarjetaForLocationPie)}</span>
                    </p>
                    {showGrossWithoutCommission && dashboardCommissionTotal > 0 ? (
                      <p className="text-[10px] font-bold text-rose-500 w-full text-center">Comisión: {formatMoney(dashboardCommissionTotal)}</p>
                    ) : null}
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 text-center pt-1">
                  Efectivo + tarjeta (Todas las sedes):{' '}
                  <span className="font-black text-slate-800">{formatMoney(incPie.totalEfectivoForLocationPie + incPie.totalTarjetaForLocationPie)}</span>
                </p>
                {showGrossWithoutCommission && dashboardCommissionTotal > 0 ? (
                  <p className="text-[10px] font-bold text-rose-500 text-center">Comisión total tarjeta: {formatMoney(dashboardCommissionTotal)}</p>
                ) : null}
              </div>
              )}
            </div>
          )}
        </div>

        {isBautizos && (viewPrefs.chartBautizosCompanionSplit !== false || viewPrefs.chartBautizosTransportCar !== false) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
            {viewPrefs.chartBautizosCompanionSplit !== false && (
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-2">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <UserPlus className="text-teal-500" size={20} /> Registros activos vs acompañantes
                  </h3>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {renderSummaryDashScopeSlot('chartBautizosCompanionSplit')}
                    <button
                      type="button"
                      onClick={() => toggleSummaryPieLocChart()}
                      className="px-2 py-1 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded-md text-[10px] font-bold transition-colors border border-slate-200"
                    >
                      {showLocChartValues ? 'Ver %' : 'Ver #'}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mb-6">
                  {getBautizosDashboardScopeChartHint(bautizosDashScope, 'companionSplit')}
                </p>
                <div className="flex flex-col items-center justify-center gap-6">
                  <div
                    className="w-40 h-40 rounded-full shadow-inner border-4 border-white transition-all duration-1000"
                    style={bautizosCompSplitPieStyle}
                  />
                  <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                        <span className="font-semibold text-slate-600 truncate">Registros activos</span>
                      </div>
                      <span className="font-bold text-slate-800 tabular-nums shrink-0">
                        {showLocChartValues
                          ? bautizosLocChartAr
                          : bautizosLocChartCompTotal > 0
                            ? `${((bautizosLocChartAr / bautizosLocChartCompTotal) * 100).toFixed(1)}%`
                            : '0%'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full bg-teal-500 shrink-0" />
                        <span className="font-semibold text-slate-600 truncate">Acompañantes</span>
                      </div>
                      <span className="font-bold text-slate-800 tabular-nums shrink-0">
                        {showLocChartValues
                          ? bautizosLocChartCo
                          : bautizosLocChartCompTotal > 0
                            ? `${((bautizosLocChartCo / bautizosLocChartCompTotal) * 100).toFixed(1)}%`
                            : '0%'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {viewPrefs.chartBautizosTransportCar !== false && (
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-2">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Bus className="text-indigo-500" size={20} /> Transporte evento vs en carro
                  </h3>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {renderSummaryDashScopeSlot('chartBautizosTransportCar')}
                    <button
                      type="button"
                      onClick={() => toggleSummaryPieLocChart()}
                      className="px-2 py-1 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded-md text-[10px] font-bold transition-colors border border-slate-200"
                    >
                      {showLocChartValues ? 'Ver %' : 'Ver #'}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mb-6">
                  {getBautizosDashboardScopeChartHint(bautizosDashScope, 'transportCar')}
                </p>
                <div className="flex flex-col items-center justify-center gap-6">
                  <div
                    className="w-40 h-40 rounded-full shadow-inner border-4 border-white transition-all duration-1000"
                    style={bautizosTransportCarPieStyle}
                  />
                  <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0" />
                        <span className="font-semibold text-slate-600 truncate">Transporte evento</span>
                      </div>
                      <span className="font-bold text-slate-800 tabular-nums shrink-0">
                        {showLocChartValues
                          ? bautizosTr
                          : bautizosTrCarTotal > 0
                            ? `${((bautizosTr / bautizosTrCarTotal) * 100).toFixed(1)}%`
                            : '0%'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                        <span className="font-semibold text-slate-600 truncate">En carro</span>
                      </div>
                      <span className="font-bold text-slate-800 tabular-nums shrink-0">
                        {showLocChartValues
                          ? bautizosCr
                          : bautizosTrCarTotal > 0
                            ? `${((bautizosCr / bautizosTrCarTotal) * 100).toFixed(1)}%`
                            : '0%'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
          {viewPrefs.chartPaymentStatus && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-2">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Receipt className="text-emerald-500" size={20} /> Estado de Pagos</h3>
                {renderSummaryDashScopeSlot('chartPaymentStatus')}
              </div>
              <p className="text-xs text-slate-400 mb-6">
                {isBautizos
                  ? getBautizosDashboardScopeChartHint(bautizosDashScope, 'payment')
                  : 'Liquidados vs con saldo pendiente (cada barra vs total de inscritos activos)'}
              </p>
              <div className="space-y-5 w-full mt-2">
                <ProgressBar label="Liquidados" value={sChartPaymentStatus.totalPaidOff} max={Math.max(sChartPaymentStatus.globalStats.all.count, 1)} colorClass="text-emerald-600" bgClass="bg-emerald-500" />
                <ProgressBar label="Con Saldo Pendiente" value={sChartPaymentStatus.totalWithDebt} max={Math.max(sChartPaymentStatus.globalStats.all.count, 1)} colorClass="text-orange-600" bgClass="bg-orange-500" />
              </div>
            </div>
          )}
          
          {viewPrefs.chartGender && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-2">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Users className="text-indigo-500" size={20} /> Inscritos por Género</h3>
                {renderSummaryDashScopeSlot('chartGender')}
              </div>
              <p className="text-xs text-slate-400 mb-6">
                {isBautizos
                  ? getBautizosDashboardScopeChartHint(bautizosDashScope, 'gender')
                  : 'Comparativa respecto al total de inscritos (barra más larga = más personas)'}
              </p>
              <div className="flex-1 flex flex-col justify-center gap-6 mt-4 pb-2 w-full">
                <ProgressBar label="Hombres" value={sChartGender.totalMen} max={Math.max(sChartGender.globalStats.all.count, 1)} colorClass="text-blue-600" bgClass="bg-blue-500" />
                <ProgressBar label="Mujeres" value={sChartGender.totalWomen} max={Math.max(sChartGender.globalStats.all.count, 1)} colorClass="text-pink-600" bgClass="bg-pink-500" />
                <ProgressBar label="Sin especificar" value={sChartGender.totalGenderUnspecified || 0} max={Math.max(sChartGender.globalStats.all.count, 1)} colorClass="text-slate-600" bgClass="bg-slate-400" />
              </div>
            </div>
          )}

          {viewPrefs.chartAgeBrackets && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-2">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><UserCircle className="text-cyan-500" size={20} /> Rangos de Edad</h3>
                {renderSummaryDashScopeSlot('chartAgeBrackets')}
              </div>
              <p className="text-xs text-slate-400 mb-6">
                {isBautizos
                  ? getBautizosDashboardScopeChartHint(bautizosDashScope, 'age')
                  : 'Personas por rango (barra más larga = más inscritos en ese rango; denominador = total de inscritos)'}
              </p>
              <div className="flex-1 flex flex-col justify-center gap-4 w-full mt-2 pb-2">
                <ProgressBar label="Niños (< 13)" value={sChartAgeBrackets.ageBrackets.kids} max={Math.max(sChartAgeBrackets.globalStats.all.count, 1)} colorClass="text-cyan-600" bgClass="bg-cyan-500" />
                <ProgressBar label="Adolescentes (13 - 17)" value={sChartAgeBrackets.ageBrackets.teens} max={Math.max(sChartAgeBrackets.globalStats.all.count, 1)} colorClass="text-blue-600" bgClass="bg-blue-500" />
                <ProgressBar label="Jóvenes (18 - 25)" value={sChartAgeBrackets.ageBrackets.youngAdults} max={Math.max(sChartAgeBrackets.globalStats.all.count, 1)} colorClass="text-indigo-600" bgClass="bg-indigo-500" />
                <ProgressBar label="Adultos (26 - 40)" value={sChartAgeBrackets.ageBrackets.adults} max={Math.max(sChartAgeBrackets.globalStats.all.count, 1)} colorClass="text-purple-600" bgClass="bg-purple-500" />
                <ProgressBar label="Mayores (41+)" value={sChartAgeBrackets.ageBrackets.seniors} max={Math.max(sChartAgeBrackets.globalStats.all.count, 1)} colorClass="text-pink-600" bgClass="bg-pink-500" />
                <ProgressBar label="Sin especificar" value={sChartAgeBrackets.ageBrackets.unspecified || 0} max={Math.max(sChartAgeBrackets.globalStats.all.count, 1)} colorClass="text-slate-600" bgClass="bg-slate-400" />
              </div>
            </div>
          )}

          {isCampa && (
            <>
              {viewPrefs.chartBloodType && (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-2">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Droplets className="text-red-500" size={20} /> Tipos de Sangre</h3>
                    {renderSummaryDashScopeSlot('chartBloodType')}
                  </div>
                  <p className="text-xs text-slate-400 mb-6">
                    ABO/Rh estándar, «{BLOOD_TYPE_UNSPECIFIED}» o valor no estándar; la barra más larga = más inscritos en esa categoría (respecto al total).
                  </p>
                  <div className="flex-1 flex flex-col justify-center gap-3 mt-4 pb-2 w-full max-h-96 overflow-y-auto pr-2">
                    {BLOOD_TYPES_ABO_RH.map((bt, idx) => (
                      <ProgressBar
                        key={bt}
                        label={bt}
                        value={sChartBloodType.bloodTypeStats[bt] ?? 0}
                        max={Math.max(sChartBloodType.globalStats.all.count, 1)}
                        colorClass="text-red-800"
                        bgClass={BLOOD_BAR_BG_CLASSES[idx % BLOOD_BAR_BG_CLASSES.length]}
                      />
                    ))}
                    {(sChartBloodType.bloodTypeStats[BLOOD_TYPE_UNSPECIFIED] || 0) > 0 && (
                      <ProgressBar
                        label={BLOOD_TYPE_UNSPECIFIED}
                        value={sChartBloodType.bloodTypeStats[BLOOD_TYPE_UNSPECIFIED]}
                        max={Math.max(sChartBloodType.globalStats.all.count, 1)}
                        colorClass="text-slate-600"
                        bgClass="bg-slate-400"
                      />
                    )}
                    {(sChartBloodType.bloodTypeStats[BLOOD_TYPE_OTHER_KEY] || 0) > 0 && (
                      <ProgressBar
                        label="Otro / no estándar"
                        value={sChartBloodType.bloodTypeStats[BLOOD_TYPE_OTHER_KEY]}
                        max={Math.max(sChartBloodType.globalStats.all.count, 1)}
                        colorClass="text-amber-800"
                        bgClass="bg-amber-500"
                      />
                    )}
                    {sChartBloodType.globalStats.all.count > 0 &&
                      BLOOD_TYPES_ABO_RH.every((bt) => (sChartBloodType.bloodTypeStats[bt] ?? 0) === 0) &&
                      (sChartBloodType.bloodTypeStats[BLOOD_TYPE_OTHER_KEY] || 0) === 0 &&
                      (sChartBloodType.bloodTypeStats[BLOOD_TYPE_UNSPECIFIED] || 0) === 0 && (
                        <p className="text-xs text-amber-700 font-semibold">Ningún inscrito tiene tipo de sangre registrado aún.</p>
                    )}
                  </div>
                </div>
              )}
              
              {viewPrefs.chartSwimming && (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-2">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Droplets className="text-blue-500" size={20} /> Habilidades Acuáticas</h3>
                    {renderSummaryDashScopeSlot('chartSwimming')}
                  </div>
                  <p className="text-xs text-slate-400 mb-6">Respecto al total de inscritos</p>
                  <div className="space-y-5 w-full mt-2">
                    <ProgressBar label="Saben Nadar" value={sChartSwimming.totalSwimmers} max={Math.max(sChartSwimming.globalStats.all.count, 1)} colorClass="text-blue-600" bgClass="bg-blue-500" />
                    <ProgressBar label="No Saben Nadar" value={sChartSwimming.totalNonSwimmers} max={Math.max(sChartSwimming.globalStats.all.count, 1)} colorClass="text-slate-500" bgClass="bg-slate-400" />
                  </div>
                </div>
              )}
              
              {viewPrefs.chartMedical && (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-2">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Activity className="text-red-500" size={20} /> Condiciones de Salud</h3>
                    {renderSummaryDashScopeSlot('chartMedical')}
                  </div>
                  <p className="text-xs text-slate-400 mb-6">Incidencia respecto al total de inscritos</p>
                  <div className="space-y-5 w-full mt-2">
                    <ProgressBar label="Con Alergias" value={sChartMedical.totalAllergies} max={Math.max(sChartMedical.globalStats.all.count, 1)} colorClass="text-orange-600" bgClass="bg-orange-500" />
                    <ProgressBar label="Con Enfermedades" value={sChartMedical.totalDiseases} max={Math.max(sChartMedical.globalStats.all.count, 1)} colorClass="text-red-600" bgClass="bg-red-500" />
                    <ProgressBar label="Con Discapacidades" value={sChartMedical.totalDisabilities} max={Math.max(sChartMedical.globalStats.all.count, 1)} colorClass="text-purple-600" bgClass="bg-purple-500" />
                  </div>
                </div>
              )}
              
              {viewPrefs.chartServers && (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-2">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Users className="text-amber-500" size={20} /> Servidores</h3>
                    {renderSummaryDashScopeSlot('chartServers')}
                  </div>
                  <p className="text-xs text-slate-500 mb-4 leading-snug">
                    Dos bloques: la primera barra mide <strong className="text-slate-700">cuántos inscritos son servidor</strong> frente a todos los inscritos. Las siguientes reparten el <strong className="text-slate-700">mismo total de servidores</strong> por asignación (escala distinta).
                  </p>
                  <div className="space-y-5 w-full mt-1">
                    <div className="rounded-xl border-2 border-amber-200/90 bg-gradient-to-br from-amber-50/90 to-amber-100/40 p-4 space-y-2 shadow-sm">
                      <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest">Participación global</p>
                      <p className="text-[11px] text-amber-900/85 leading-snug">Denominador: total de inscritos activos ({sChartServers.globalStats.all.count}). La longitud = % del campamento que son servidores.</p>
                      <ProgressBar
                        label="Total"
                        value={sChartServers.totalServers}
                        max={Math.max(sChartServers.globalStats.all.count, 1)}
                        colorClass="text-amber-800"
                        bgClass="bg-amber-600"
                        trackClassName="bg-slate-100 ring-1 ring-slate-300 dark:bg-slate-800 dark:ring-slate-600"
                        barHeightClass="h-3"
                      />
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-4 space-y-3">
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Reparto entre servidores</p>
                      <p className="text-[11px] text-slate-600 leading-snug">
                        Denominador: <strong>{Math.max(sChartServers.totalServers, 1)}</strong> (total servidores). Las tres barras suman ese total: Teens (incl. Ambos sirviendo en Teens), Jóvenes (incl. Ambos en Jóvenes), o tarifa única Ambos.
                      </p>
                      <ProgressBar
                        label="Teens"
                        value={sChartServers.serverTeensExclusive}
                        max={Math.max(sChartServers.totalServers, 1)}
                        colorClass="text-indigo-700"
                        bgClass="bg-indigo-500"
                        trackClassName="bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-600"
                      />
                      <ProgressBar
                        label="Jóvenes"
                        value={sChartServers.serverJovenesExclusive}
                        max={Math.max(sChartServers.totalServers, 1)}
                        colorClass="text-blue-700"
                        bgClass="bg-blue-500"
                        trackClassName="bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-600"
                      />
                      <ProgressBar
                        label="Ambos"
                        value={sChartServers.totalServersBoth}
                        max={Math.max(sChartServers.totalServers, 1)}
                        colorClass="text-amber-800"
                        bgClass="bg-amber-500"
                        trackClassName="bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              {viewPrefs.chartAges && (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-2">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Users className="text-indigo-500" size={20} /> Asistencia</h3>
                    {renderSummaryDashScopeSlot('chartAges')}
                  </div>
                  <p className="text-xs text-slate-500 mb-4 leading-snug">
                    Inscritos <strong className="text-slate-700">activos</strong> (no cancelados) por segmento del evento:{' '}
                    <strong>Teens</strong>, <strong>Jóvenes</strong> o <strong>Ambos</strong> (solo tarifa única servidor Ambos; quien asiste a ambos pero sirve en un solo segmento va a Teens o Jóvenes). Incluye campistas, servidores, becados, cortesías, empleados, etc.
                  </p>
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
                    <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Por segmento del campamento</p>
                    <p className="text-[11px] text-indigo-900/85 leading-snug">
                      Denominador de cada barra: <strong>{sChartAges.globalStats.all.count}</strong> inscritos activos. Suma Teens + Jóvenes + Ambos ={' '}
                      <strong>{sChartAges.asistenciaTeens + sChartAges.asistenciaJovenes + sChartAges.asistenciaAmbos}</strong> (misma base que el total del campamento).
                    </p>
                    <ProgressBar
                      label="Teens"
                      value={sChartAges.asistenciaTeens}
                      max={Math.max(sChartAges.globalStats.all.count, 1)}
                      colorClass="text-indigo-800"
                      bgClass="bg-indigo-600"
                      trackClassName="bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-600"
                      barHeightClass="h-3"
                    />
                    <ProgressBar
                      label="Jóvenes"
                      value={sChartAges.asistenciaJovenes}
                      max={Math.max(sChartAges.globalStats.all.count, 1)}
                      colorClass="text-blue-800"
                      bgClass="bg-blue-600"
                      trackClassName="bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-600"
                      barHeightClass="h-3"
                    />
                    <ProgressBar
                      label="Ambos"
                      value={sChartAges.asistenciaAmbos}
                      max={Math.max(sChartAges.globalStats.all.count, 1)}
                      colorClass="text-amber-900"
                      bgClass="bg-amber-500"
                      trackClassName="bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-600"
                      barHeightClass="h-3"
                    />
                  </div>
                </div>
              )}

              {viewPrefs.chartBaptism && (() => {
                const baptTotal = sChartBaptism.baptismsTeens + sChartBaptism.baptismsJovenes;
                const baptDenom = Math.max(baptTotal, 1);
                return (
                  <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-2">
                      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Church className="text-sky-600" size={20} /> Bautizos</h3>
                      {renderSummaryDashScopeSlot('chartBaptism')}
                    </div>
                    <p className="text-xs text-slate-500 mb-4 leading-snug">
                      La primera barra es <strong className="text-slate-700">cuántos inscritos van a bautismo</strong> respecto a todo el campamento. Las dos siguientes reparten esos casos <strong className="text-slate-700">solo entre quienes se bautizan</strong> (segmento Teens vs Jóvenes; servidor Ambos define el segmento).
                    </p>
                    <div className="space-y-5 w-full mt-1">
                      <div className="rounded-xl border-2 border-sky-200/90 bg-gradient-to-br from-sky-50/90 to-sky-100/35 p-4 space-y-2 shadow-sm">
                        <p className="text-[10px] font-black text-sky-900 uppercase tracking-widest">Participación global</p>
                        <p className="text-[11px] text-sky-900/85 leading-snug">
                          Denominador: inscritos activos ({sChartBaptism.globalStats.all.count}). La longitud = % del campamento con bautizo marcado.
                        </p>
                        <ProgressBar
                          label="Total con bautizo"
                          value={baptTotal}
                          max={Math.max(sChartBaptism.globalStats.all.count, 1)}
                          colorClass="text-sky-900"
                          bgClass="bg-sky-600"
                          trackClassName="bg-slate-100 ring-1 ring-slate-300 dark:bg-slate-800 dark:ring-slate-600"
                          barHeightClass="h-3"
                        />
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-4 space-y-3">
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Solo entre quienes se bautizan</p>
                        <p className="text-[11px] text-slate-600 leading-snug">
                          Denominador: <strong>{baptDenom}</strong> (total con bautizo). Compara cuántos cuentan en Teens vs Jóvenes.
                        </p>
                        <ProgressBar
                          label="En Teens"
                          value={sChartBaptism.baptismsTeens}
                          max={baptDenom}
                          colorClass="text-indigo-700"
                          bgClass="bg-indigo-500"
                          trackClassName="bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-600"
                        />
                        <ProgressBar
                          label="En Jóvenes"
                          value={sChartBaptism.baptismsJovenes}
                          max={baptDenom}
                          colorClass="text-blue-700"
                          bgClass="bg-blue-500"
                          trackClassName="bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-600"
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {viewPrefs.chartAttendanceSpecial && (() => {
                const attEmp = sChartAttendanceSpecial.totalAttendanceEmpleado;
                const attCor = sChartAttendanceSpecial.totalAttendanceCortesia;
                const attSum = attEmp + attCor;
                const attMax = Math.max(attSum, 1);
                return (
                  <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-2">
                      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Briefcase className="text-teal-600" size={20} /> Empleado y cortesía</h3>
                      {renderSummaryDashScopeSlot('chartAttendanceSpecial')}
                    </div>
                    <p className="text-xs text-slate-400 mb-6">
                      Solo asistencia especial sin cobro. Las barras comparan entre sí (la más alta = más inscritos en esa categoría).
                    </p>
                    <div className="space-y-5 w-full mt-2">
                      <ProgressBar label="Empleado" value={attEmp} max={attMax} colorClass="text-teal-700" bgClass="bg-teal-500" />
                      <ProgressBar label="Cortesía" value={attCor} max={attMax} colorClass="text-fuchsia-700" bgClass="bg-fuchsia-500" />
                    </div>
                  </div>
                );
              })()}
            </>
          )}

          {isGeneral && currentEvent.customFields && viewPrefs.chartCustom && currentEvent.customFields.map((field, idx) => {
            const sChartCustomCard = getDashboardSummaryForCampaScope(`chartCustom_${idx}`);
            const stats = sChartCustomCard.customFieldsStats[field] || {};
            const entries = Object.entries(stats).sort((a, b) => b[1] - a[1]);
            return (
              <div key={idx} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-2">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><ListPlus className="text-indigo-500" size={20} /> {field}</h3>
                  {renderSummaryDashScopeSlot(`chartCustom_${idx}`)}
                </div>
                <p className="text-xs text-slate-400 mb-6">Distribución de respuestas</p>
                <div className="space-y-4 w-full mt-2 max-h-48 overflow-y-auto pr-2">
                  {entries.map(([val, count], i) => (
                    <ProgressBar key={i} label={val} value={count} max={Math.max(sChartCustomCard.globalStats.all.count, 1)} colorClass="text-indigo-600" bgClass="bg-indigo-500" />
                  ))}
                  {entries.length === 0 && <p className="text-xs text-slate-400 italic">No hay datos registrados aún.</p>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mt-8">
          <div className="p-6 border-b border-slate-100 flex flex-col gap-2">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Salida y Regreso por Sede</h3>
              <p className="text-xs text-slate-400">Distribución en valores absolutos (sin porcentajes).</p>
            </div>
          </div>
          {(() => {
            const locations = dashboardLocs;
            const travelLocColors = buildLocationChartColorMap(locations);
            const departures = locations.map((loc) => ({
              loc,
              value: locations.reduce((sum, to) => sum + (sSectionTravelDepart.travelStats?.[loc]?.[to] || 0), 0),
            }));
            const returns = locations.map((loc) => ({
              loc,
              value: locations.reduce((sum, from) => sum + (sSectionTravelReturn.travelStats?.[from]?.[loc] || 0), 0),
            }));
            const depTotal = departures.reduce((s, x) => s + x.value, 0);
            const retTotal = returns.reduce((s, x) => s + x.value, 0);
            const buildPie = (rows, total) => {
              if (total <= 0) return '#f1f5f9';
              let cur = 0;
              const segs = rows.map((row) => {
                if (!row.value) return '';
                const per = (row.value / total) * 100;
                const color = travelLocColors.get(row.loc) ?? '#94a3b8';
                const seg = `${color} ${cur}% ${cur + per}%`;
                cur += per;
                return seg;
              }).filter(Boolean);
              return `conic-gradient(${segs.join(', ')})`;
            };
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                <div className="rounded-2xl border border-slate-100 p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-1">
                    <h4 className="text-sm font-black text-slate-700">Asistentes que salen de cada sede</h4>
                    {renderSummaryDashScopeSlot('sectionTravelDepart')}
                  </div>
                  <p className="text-[11px] text-slate-400 mb-4">Total: {depTotal}</p>
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-36 h-36 rounded-full shadow-inner border-4 border-white" style={{ background: buildPie(departures, depTotal) }} />
                    <div className="w-full grid grid-cols-2 gap-2">
                      {departures.map((row) => (
                        <div key={`dep-${row.loc}`} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: travelLocColors.get(row.loc) ?? '#94a3b8' }} />
                            <span className="font-semibold text-slate-600 truncate max-w-[80px]" title={row.loc}>{row.loc}</span>
                          </div>
                          <span className="font-black text-slate-800">{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-100 p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-1">
                    <h4 className="text-sm font-black text-slate-700">Asistentes que regresan a cada sede</h4>
                    {renderSummaryDashScopeSlot('sectionTravelReturn')}
                  </div>
                  <p className="text-[11px] text-slate-400 mb-4">Total: {retTotal}</p>
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-36 h-36 rounded-full shadow-inner border-4 border-white" style={{ background: buildPie(returns, retTotal) }} />
                    <div className="w-full grid grid-cols-2 gap-2">
                      {returns.map((row) => (
                        <div key={`ret-${row.loc}`} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: travelLocColors.get(row.loc) ?? '#94a3b8' }} />
                            <span className="font-semibold text-slate-600 truncate max-w-[80px]" title={row.loc}>{row.loc}</span>
                          </div>
                          <span className="font-black text-slate-800">{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

      </div>
      {renderBautizosDashboardFixedScopeBar()}
      </>
    );
}

export default React.memo(DashboardSummaryPageContent);
