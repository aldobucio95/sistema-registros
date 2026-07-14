import React, { useCallback, useDeferredValue, useEffect, useRef, useState } from 'react';
import { SI_LABEL } from '../../appConstants.js';
import { CAR_DATA_FILTER_OPTIONS } from '../../carDataWhatsApp.js';
import { isCardPaymentAllowedForLocation } from '../../cardPaymentEligibility.js';
import DuplicateGroupsPanel from '../../components/diagnostics/DuplicateGroupsPanel.jsx';
import RosterFilterCheckboxOption from '../../components/RosterFilterCheckboxOption.jsx';
import RosterLocationSearchPanel from '../../components/RosterLocationSearchPanel.jsx';
import RosterSectionScrollWrap from '../../components/RosterSectionScrollWrap.jsx';
import RosterSortDropdown from '../../components/RosterSortDropdown.jsx';
import { buildSedeCapChipViewModel } from '../../cupoVsWaitlistDisplay.js';
import { collectLocationSuggestionsFromRosterSources } from '../../locationFieldSuggestions.js';
import LocationRosterTypeSummary from '../../LocationRosterTypeSummary.jsx';
import { canAddRegistrations } from '../../rbac/permissions.js';
import { ROSTER_SORT_OPTIONS } from '../../rosterSortOptions.js';
import { LocationRosterActivosChip, LocationRosterCancelledChip, LocationRosterWaitlistChip } from '../../screens/locationRoster/LocationRosterSectionChips.jsx';
import { uiButtons, uiDropdown, uiFilter, uiLocationNewRegCta, uiRosterMobile, uiRosterSearch } from '../../ui/uiFormatClasses.js';
import { locationPrefsKey } from '../../userListFiltersPrefs.js';
import { personLikeIsPersonOfInterest } from '../../vnpPersonFlags.js';
import { AlertTriangle, Ban, CheckCircle2, ChevronDown, ChevronUp, CreditCard, Download, Edit3, Filter, GraduationCap, MapPin, MessageSquare, Plus, Power, Scissors, Send, Trash2, UserPlus, Users, Wallet } from 'lucide-react';
import NewRegistrationModal from './NewRegistrationModal.jsx';
import { useWorkspaceShell } from '../../screens/eventWorkspace/WorkspaceShellContext.jsx';
import VirtualizedTableBody from '../../components/roster/VirtualizedTableBody.jsx';
import VirtualizedRosterMobileList from '../../components/roster/VirtualizedRosterMobileList.jsx';
import ExpandedRosterDetailRowLazy from '../../components/roster/ExpandedRosterDetailRowLazy.jsx';

export default function LocationRosterPageContent({ loc }) {
  const {
    DASHBOARD_COMMISSION_VIEW_TITLE,
    GENDERS,
    ROSTER_LIST_TABLE_CLASS,
    ROSTER_QUICK_ACTIONS_ROW_PRIMARY,
    ROSTER_QUICK_ACTION_BTN_BASE,
    ROSTER_QUICK_ACTION_ICON_PROPS,
    ROSTER_TD_ACTIONS,
    ROSTER_TD_FINANCES,
    ROSTER_TH_ACTIONS,
    ROSTER_TH_FINANCES,
    ROSTER_TH_PARTICIPANT,
    RosterListColgroup,
    RosterPersonOfInterestButton,
    RosterResponsivaLocalButton,
    RosterResponsivaWaButton,
    RosterWhatsAppButton,
    SI,
    activeRosterFilterCount,
    allParticipants,
    applyRosterLikeFilters,
    canArchiveRegistrationsFlag,
    canCancelRegistrationsFlag,
    canMarkPersonsOfInterestFlag,
    canQuickActionResponsivaDigital,
    canQuickActionResponsivaLocal,
    canQuickActionWhatsApp,
    cancelEntry,
    cancelledData,
    createEmptyGlobalRegistryListFilters,
    currentEvent,
    currentUser,
    data,
    duplicatesInEvent,
    events,
    expandedDupGroups,
    expandedDupPersons,
    expandedRows,
    exportPendingWhatsAppToExcel,
    filterAge,
    filterAssignment,
    filterBaptism,
    filterCarDataPending,
    filterFirstTimeId,
    filterGender,
    filterLiquidation,
    filterMaritalStatus,
    filterMedical,
    filterParticipantRows,
    filterPaymentType,
    filterPendingRefund,
    filterResponsiva,
    filterRosterRole,
    filterScholarship,
    filterSwim,
    filterTransport,
    filterTravelFrom,
    filterTravelTo,
    filterWhatsAppPending,
    filtersDropdownOpen,
    generateVnpPersonId,
    getActiveCountByLocation,
    getAutoPaymentService,
    getCommissionToggleCompactBtnClasses,
    getDashboardCardCommissionToggleLabel,
    getEventCapUsedUnits,
    getEventTotalCap,
    getLiquidationTarget,
    getLocationCap,
    getPendingWhatsAppRowsForLocation,
    getSortedCancelledForLocation,
    getSortedWaitlistForLocation,
    globalConfig,
    handleTogglePersonOfInterest,
    hasAdminRights,
    hasFinancialAccess,
    isCampa,
    isLocOpen,
    isResponsivaEnabled,
    isRosterRowInteractiveClickTarget,
    isSiValue,
    markResponsivaLocalDelivery,
    openMoveToWaitlistConfirm,
    openNewRegModal,
    openRegistrationCommentModal,
    openRosterInlineEditFromQuickActions,
    openWaitlistRowEdit,
    openWhatsAppModal,
    participantIsCancelled,
    personOfInterestVnpSet,
    promoteFromWaitlistSection,
    reactivateEntry,
    removeEntry,
    renderDupPersonDetail,
    renderRegistrationFinancesColumn,
    renderRegistrationParticipantColumn,
    renderRosterPersonMobileCard,
    responsivaLinkBusyId,
    responsivaLocalBusyId,
    rosterRowAnchorId,
    rosterSectionExpanded,
    runAutoSendPendingWhatsAppForLocation,
    searchTerm: rosterSearchHydrateTerm,
    setRosterLocationSearchRef,
    persistLocationRosterSearchToPrefs,
    sendResponsivaSignLinkWhatsAppForPerson,
    setFilterAge,
    setFilterAssignment,
    setFilterBaptism,
    setFilterCarDataPending,
    setFilterFirstTimeId,
    setFilterGender,
    setFilterLiquidation,
    setFilterMaritalStatus,
    setFilterMedical,
    setFilterPaymentType,
    setFilterPendingRefund,
    setFilterResponsiva,
    setFilterRosterRole,
    setFilterScholarship,
    setFilterSwim,
    setFilterTransport,
    setFilterTravelFrom,
    setFilterTravelTo,
    setFilterWhatsAppPending,
    setFiltersDropdownOpen,
    setPaymentModal,
    setSortBy,
    showGrossWithoutCommission,
    sortBy,
    summary,
    toggleDupGroup,
    toggleDupPerson,
    toggleRegStatus,
    toggleRosterRowExpand,
    toggleRosterSection,
    toggleShowGrossWithoutCommission,
    waitlistCupoCountBySede,
    waitlistData,
    whatsAppAutoSendCancelRef,
    whatsAppAutoSendJob
  } = useWorkspaceShell();

  const [locationSearchApplied, setLocationSearchApplied] = useState(() => rosterSearchHydrateTerm ?? '');
  const deferredLocationSearch = useDeferredValue(locationSearchApplied);
  const prefsPersistTimerRef = useRef(null);

  useEffect(() => {
    setLocationSearchApplied(rosterSearchHydrateTerm ?? '');
  }, [loc, rosterSearchHydrateTerm]);

  const handleLocationSearchChange = useCallback(
    (term) => {
      setLocationSearchApplied(term);
      setRosterLocationSearchRef(term);
      if (prefsPersistTimerRef.current) window.clearTimeout(prefsPersistTimerRef.current);
      prefsPersistTimerRef.current = window.setTimeout(() => {
        prefsPersistTimerRef.current = null;
        persistLocationRosterSearchToPrefs();
      }, 600);
    },
    [setRosterLocationSearchRef, persistLocationRosterSearchToPrefs]
  );

  const handleLocationSearchClear = useCallback(() => {
    if (prefsPersistTimerRef.current) {
      window.clearTimeout(prefsPersistTimerRef.current);
      prefsPersistTimerRef.current = null;
    }
    setLocationSearchApplied('');
    setRosterLocationSearchRef('');
    persistLocationRosterSearchToPrefs();
  }, [setRosterLocationSearchRef, persistLocationRosterSearchToPrefs]);

  useEffect(
    () => () => {
      if (prefsPersistTimerRef.current) window.clearTimeout(prefsPersistTimerRef.current);
    },
    []
  );


    const memoizedLocData = React.useMemo(() => {
      const cardAllowedNewReg = isCardPaymentAllowedForLocation(currentEvent, loc);
      const locFieldSuggestions = collectLocationSuggestionsFromRosterSources({
        eventId: currentEvent?.id,
        location: loc,
        active: data[loc] || [],
        waitlist: waitlistData[loc] || [],
        cancelled: cancelledData[loc] || [],
      });
      const visibleParticipants = applyRosterLikeFilters(data[loc] || [], false, deferredLocationSearch);
      const visibleBautizedCompanionCount = 0;
      const sortPreservesWaitlistBaseDateOrder = sortBy === 'registered-asc' || sortBy === 'none';
      const sortedWaitlistForLoc = getSortedWaitlistForLocation(loc);
      const waitlistFilteredForLoc = applyRosterLikeFilters(
        sortedWaitlistForLoc,
        sortPreservesWaitlistBaseDateOrder,
        deferredLocationSearch
      );
      const cancelledFilteredForLoc = applyRosterLikeFilters(
        getSortedCancelledForLocation(loc),
        sortPreservesWaitlistBaseDateOrder,
        deferredLocationSearch
      );
      const rosterSearchMatchCount =
        visibleParticipants.length + visibleBautizedCompanionCount + waitlistFilteredForLoc.length + cancelledFilteredForLoc.length;
      const rawActiveCountForLoc = getActiveCountByLocation(loc);
      const sedeCapChip = buildSedeCapChipViewModel({
        eventTotalCap: getEventTotalCap(),
        globalUsed: getEventCapUsedUnits(),
        locationCap: getLocationCap(loc),
        activeAtSede: rawActiveCountForLoc,
        waitCount: waitlistCupoCountBySede[loc] ?? 0,
      });
      const sedeCapChipClass =
        sedeCapChip.status.tone === 'full'
          ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-600 dark:text-white dark:border-amber-700'
          : sedeCapChip.status.tone === 'waitlist'
            ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-700/90 dark:text-white dark:border-amber-600'
            : 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-600 dark:text-white dark:border-indigo-700';
      const rosterSearchActive = deferredLocationSearch.trim().length > 0;
      const showRosterActivos = rosterSearchActive ? visibleParticipants.length > 0 : rosterSectionExpanded.activos;
      const showRosterWaitlist = rosterSearchActive ? waitlistFilteredForLoc.length > 0 : rosterSectionExpanded.waitlist;
      const showRosterCancelled = rosterSearchActive ? cancelledFilteredForLoc.length > 0 : rosterSectionExpanded.cancelled;
      const locationTypeSummary = null;
      const rosterSectionDisplayCounts = {
            active: rawActiveCountForLoc,
            waitlist: (waitlistData[loc] || []).length,
            cancelled: (cancelledData[loc] || []).length,
          };
      const rosterLocSlug = String(loc).replace(/[^a-zA-Z0-9_-]/g, '_');
      const flattenedActiveRowsForLoc = visibleParticipants.map((person) => ({ kind: 'main', person }));

      return {
        cardAllowedNewReg,
        locFieldSuggestions,
        visibleParticipants,
        visibleBautizedCompanionCount,
        sortPreservesWaitlistBaseDateOrder,
        sortedWaitlistForLoc,
        waitlistFilteredForLoc,
        cancelledFilteredForLoc,
        rosterSearchMatchCount,
        rawActiveCountForLoc,
        sedeCapChip,
        sedeCapChipClass,
        rosterSearchActive,
        showRosterActivos,
        showRosterWaitlist,
        showRosterCancelled,
        locationTypeSummary,
        rosterSectionDisplayCounts,
        rosterLocSlug,
        flattenedActiveRowsForLoc,
      };
    }, [
      currentEvent,
      loc,
      data,
      waitlistData,
      cancelledData,
      sortBy,
      getSortedWaitlistForLocation,
      getSortedCancelledForLocation,
      applyRosterLikeFilters,
      getActiveCountByLocation,
      getEventTotalCap,
      getEventCapUsedUnits,
      getLocationCap,
      waitlistCupoCountBySede,
      allParticipants,
      globalConfig,
      deferredLocationSearch,
      rosterSectionExpanded,
    ]);

    const {
      cardAllowedNewReg,
      locFieldSuggestions,
      visibleParticipants,
      visibleBautizedCompanionCount,
      sortPreservesWaitlistBaseDateOrder,
      sortedWaitlistForLoc,
      waitlistFilteredForLoc,
      cancelledFilteredForLoc,
      rosterSearchMatchCount,
      rawActiveCountForLoc,
      sedeCapChip,
      sedeCapChipClass,
      rosterSearchActive,
      showRosterActivos,
      showRosterWaitlist,
      showRosterCancelled,
      locationTypeSummary,
      rosterSectionDisplayCounts,
      rosterLocSlug,
      flattenedActiveRowsForLoc,
    } = memoizedLocData;

    const locSugList = (field) => `new-sug-${locationPrefsKey(loc).replace(/%/g, '')}-${field}`;
    const rosterFilterOption = (filterKey, optionValue, checked, onChange, children, className = uiDropdown.optionRow) => (
      <RosterFilterCheckboxOption
        key={`${filterKey}-${optionValue}`}
        loc={loc}
        filterKey={filterKey}
        optionValue={optionValue}
        checked={checked}
        onChange={onChange}
        className={className}
      >
        {children}
      </RosterFilterCheckboxOption>
    );
    const renderActivosEmptyMessage = () => {
      if (filterWhatsAppPending === 'pending') {
        return `No hay inscritos con aviso de WhatsApp pendiente en ${loc}${deferredLocationSearch.trim() ? ' (revisa la búsqueda)' : ''}.`;
      }
      return `No hay registros para mostrar en ${loc}.`;
    };
    return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${isLocOpen(loc) ? 'bg-green-100 text-green-600 dark:bg-emerald-600 dark:text-white' : 'bg-red-100 text-red-600 dark:bg-rose-600 dark:text-white'}`}><MapPin size={24} /></div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Sede {loc}</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <div className={`w-2 h-2 rounded-full ${isLocOpen(loc) ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <p className="text-xs font-bold uppercase text-slate-400">Registro {isLocOpen(loc) ? 'Abierto' : 'Cerrado'}</p>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded border tabular-nums ${sedeCapChipClass}`}
                title={sedeCapChip.title}
              >
                {sedeCapChip.text}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasAdminRights && (
            <button onClick={() => toggleRegStatus(loc)} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all border ${isLocOpen(loc) ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100' : 'bg-green-50 text-green-600 border-green-100 hover:bg-green-100'}`}><Power size={16} />{isLocOpen(loc) ? 'Desactivar Registro' : 'Activar Registro'}</button>
          )}
        </div>
      </div>

      {canAddRegistrations(currentUser) && (
        <section className={uiLocationNewRegCta.wrap} aria-label="Inscribir nuevo participante en esta sede">
          <div className={uiLocationNewRegCta.inner}>
            <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
              <span className={uiLocationNewRegCta.iconBox} aria-hidden>
                <UserPlus size={28} strokeWidth={2.25} />
              </span>
              <div className="min-w-0">
                <p className={uiLocationNewRegCta.kicker}>Inscripción en sede</p>
                <h3 className={uiLocationNewRegCta.title}>Nuevo registro — {loc}</h3>
                <p className={uiLocationNewRegCta.hint}>
                  El formulario de registro ya no va en esta pantalla: pulsa el botón para abrirlo.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={!isLocOpen(loc)}
              onClick={openNewRegModal}
              className={uiLocationNewRegCta.button}
            >
              <span className={uiLocationNewRegCta.buttonIcon} aria-hidden>
                <Plus size={20} strokeWidth={3} />
              </span>
              {isLocOpen(loc) ? 'Abrir formulario' : 'Registro cerrado'}
            </button>
          </div>
          {!isLocOpen(loc) ? (
            <p className={uiLocationNewRegCta.closedNote}>
              Esta sede tiene el registro cerrado. Un administrador puede activarlo con «Activar registro» arriba.
            </p>
          ) : null}
        </section>
      )}

      <NewRegistrationModal loc={loc} />

      <div className={uiLocationNewRegCta.listDivider}>
        <span className={uiLocationNewRegCta.listDividerLabel}>Listado de inscritos — {loc}</span>
        <div className={uiLocationNewRegCta.listDividerLine} aria-hidden />
      </div>

      <div className={uiRosterSearch.toolbarCard}>
        <RosterLocationSearchPanel
          loc={loc}
          searchTerm={locationSearchApplied}
          rosterSearchActive={rosterSearchActive}
          onSearchChange={handleLocationSearchChange}
          onClear={handleLocationSearchClear}
          statsLine={
            <p className={uiRosterSearch.statsTitle}>
              Coincidencias (con filtros actuales):{' '}
              <span className={uiRosterSearch.statsHighlight}>{rosterSearchMatchCount}</span>
              <span className={uiRosterSearch.statsMuted}>
                {' '}
                — {visibleParticipants.length + visibleBautizedCompanionCount} activos · {waitlistFilteredForLoc.length}{' '}
                lista de espera · {cancelledFilteredForLoc.length} cancelados
              </span>
            </p>
          }
        />
      </div>

      {(() => {
        const locDups = duplicatesInEvent.byLocation[loc];
        if (!locDups || locDups.length === 0) return null;
        return (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-2">
            <div className="flex items-start gap-2">
              <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-amber-800">
                  Posibles registros duplicados en esta sede (
                  {locDups.reduce((s, c) => s + (c.displayMembers || c.members || []).length, 0)} registros en{' '}
                  {locDups.length} grupo{locDups.length > 1 ? 's' : ''})
                </p>
                <p className="text-[11px] text-amber-700 mt-1">
                  Expande cada grupo para ver los parámetros en conflicto. Puedes dar de baja, archivar o autorizar el duplicado; cada acción pide confirmación.
                </p>
                <DuplicateGroupsPanel
                  clusters={locDups}
                  context={`loc-${loc}`}
                  expandedDupGroups={expandedDupGroups}
                  expandedDupPersons={expandedDupPersons}
                  onToggleDupGroup={toggleDupGroup}
                  onToggleDupPerson={toggleDupPerson}
                  hasFinancialAccess={hasFinancialAccess}
                  getLiquidationTarget={getLiquidationTarget}
                  renderDupPersonDetail={renderDupPersonDetail}
                />
              </div>
            </div>
          </div>
        );
      })()}

      <div className={uiRosterSearch.listToolsBar}>
            <div className="relative shrink-0" data-dropdown-root="filters">
            <button
              type="button"
              onClick={() => setFiltersDropdownOpen((v) => !v)}
              className={uiDropdown.trigger}
              aria-label={activeRosterFilterCount > 0 ? `Filtros (${activeRosterFilterCount} activos)` : 'Filtros'}
            >
              <Filter size={14} className="text-slate-500" />
              Filtros
              {activeRosterFilterCount > 0 && (
                <span
                  className="pointer-events-none absolute -top-1.5 -right-1.5 min-h-[1.125rem] min-w-[1.125rem] px-1 flex items-center justify-center rounded-full bg-indigo-600 text-white text-[9px] font-black leading-none tabular-nums shadow-sm"
                  aria-hidden
                >
                  {activeRosterFilterCount > 99 ? '99+' : activeRosterFilterCount}
                </span>
              )}
            </button>
              {filtersDropdownOpen && (
              <div className={`${uiRosterSearch.listToolsDropdownMenu} ${uiFilter.dropdownScope}`}>
                <button
                  type="button"
                  onClick={() => {
                    setFilterWhatsAppPending('all');
                    setFilterLiquidation('all');
                    setFilterResponsiva('all');
                    setFilterGender('all');
                    setFilterTransport('all');
                    setFilterPaymentType('all');
                    setFilterTravelFrom('all');
                    setFilterTravelTo('all');
                    setFilterFirstTimeId('all');
                    setFilterPendingRefund('all');
                    setFilterAssignment('all');
                    setFilterScholarship('all');
                    setFilterMedical('all');
                    setFilterSwim('all');
                    setFilterBaptism('all');
                    setFilterMaritalStatus('all');
                    setFilterRosterRole('all');
                    setFilterAge('all');
                  }}
                  className={`w-full py-2 ${uiButtons.secondary}`}
                >
                  Limpiar filtros
                </button>
                {isCampa && (
                  <>
                    <div>
                      <p className={uiDropdown.sectionTitle}>Asignación</p>
                      {['all', 'Teens', 'Jóvenes', 'Ambos'].map((op) =>
                        rosterFilterOption('filterAssignment', op, filterAssignment === op, () => setFilterAssignment(filterAssignment === op ? 'all' : op), op === 'all' ? 'Todas' : op)
                      )}
                    </div>
                    <div>
                      <p className={uiDropdown.sectionTitle}>Servidor</p>
                      {[
                        { id: 'all', label: 'Todos' },
                        { id: 'camperos', label: 'Camperos' },
                        { id: 'servidor-teens', label: 'Servidores en Teens (incl. Ambos allí)' },
                        { id: 'servidor-jovenes', label: 'Servidores en Jóvenes (incl. Ambos allí)' },
                        { id: 'servidor-ambos', label: 'Servidores (Ambos tarifa única)' },
                      ].map((op) =>
                        rosterFilterOption('filterRosterRole', op.id, filterRosterRole === op.id, () => setFilterRosterRole(filterRosterRole === op.id ? 'all' : op.id), op.label)
                      )}
                    </div>
                    <div>
                      <p className={uiDropdown.sectionTitle}>Asistencia especial</p>
                      {[
                        { id: 'empleado', label: 'Empleados' },
                        { id: 'cortesia', label: 'Cortesías' },
                      ].map((op) =>
                        rosterFilterOption('filterRosterRole', op.id, filterRosterRole === op.id, () => setFilterRosterRole(filterRosterRole === op.id ? 'all' : op.id), op.label)
                      )}
                    </div>
                    <div>
                      <p className={uiDropdown.sectionTitle}>Beca</p>
                      {[
                        { id: 'all', label: 'Todos' },
                        { id: 'becado', label: 'Cualquier becado' },
                        { id: 'No', label: 'No' },
                        { id: 'partial', label: 'Parcial' },
                        { id: 'total', label: 'Total' },
                      ].map((op) =>
                        rosterFilterOption('filterScholarship', op.id, filterScholarship === op.id, () => setFilterScholarship(filterScholarship === op.id ? 'all' : op.id), op.label)
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Bautizo</p>
                      {[
                        { id: 'all', label: 'Todos' },
                        { id: 'teens', label: 'Si se bautiza en Teens' },
                        { id: 'jovenes', label: 'Si se bautiza en Jóvenes' },
                        { id: 'no', label: 'No se bautiza' },
                      ].map((op) =>
                        rosterFilterOption('filterBaptism', op.id, filterBaptism === op.id, () => setFilterBaptism(filterBaptism === op.id ? 'all' : op.id), op.label)
                      )}
                    </div>
                    {(() => {
                      const emptyF = createEmptyGlobalRegistryListFilters();
                      const cfoRoster = (key, value) =>
                        filterParticipantRows(data[loc] || [], true, { ...emptyF, [key]: value }).length;
                      const cn = (num) => (
                        <span className="text-slate-400 font-bold tabular-nums text-[11px]">({num})</span>
                      );
                      return (
                        <div>
                          <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Estado civil</p>
                          {[
                            { id: 'all', label: 'Todos' },
                            { id: 'single', label: 'Soltero' },
                            { id: 'married', label: 'Casado' },
                            { id: 'pending-spouse', label: 'Pendiente de asignar pareja' },
                          ].map((op) =>
                            rosterFilterOption('filterMaritalStatus', op.id, filterMaritalStatus === op.id, () => setFilterMaritalStatus(filterMaritalStatus === op.id ? 'all' : op.id), <>{op.label} {cn(cfoRoster('filterMaritalStatus', op.id))}</>)
                          )}
                        </div>
                      );
                    })()}
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Tipo de pago</p>
                      {['all', 'Efectivo', 'Tarjeta'].map((op) =>
                        rosterFilterOption('filterPaymentType', op, filterPaymentType === op, () => setFilterPaymentType(filterPaymentType === op ? 'all' : op), op === 'all' ? 'Todos' : op)
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Transporte</p>
                      {[
                        { id: 'all', label: 'Todos' },
                        { id: 'go-bus', label: 'Llega en camión' },
                        { id: 'return-bus', label: 'Regresa en camión' },
                        { id: 'go-car', label: 'Llega en carro' },
                        { id: 'return-car', label: 'Regresa en carro' },
                      ].map((op) =>
                        rosterFilterOption('filterTransport', op.id, filterTransport === op.id, () => setFilterTransport(filterTransport === op.id ? 'all' : op.id), op.label)
                      )}
                    </div>
                  </>
                )}
                {!isCampa && (
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Servidor y asistencia</p>
                    {[
                      { id: 'all', label: 'Todos' },
                      { id: 'camperos', label: 'Camperos (no empleados ni cortesías)' },
                      { id: 'empleado', label: 'Empleados' },
                      { id: 'cortesia', label: 'Cortesías' },
                    ].map((op) =>
                      rosterFilterOption('filterRosterRole', op.id, filterRosterRole === op.id, () => setFilterRosterRole(filterRosterRole === op.id ? 'all' : op.id), op.label)
                    )}
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Liquidación</p>
                  {[
                    { id: 'all', label: 'Todos' },
                    { id: 'liquidado', label: 'Liquidado' },
                    { id: 'pendiente', label: 'Falta por liquidar' },
                    { id: 'saldo-favor', label: 'Saldo a favor' },
                  ].map((op) =>
                    rosterFilterOption('filterLiquidation', op.id, filterLiquidation === op.id, () => setFilterLiquidation(filterLiquidation === op.id ? 'all' : op.id), op.label)
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-1">WhatsApp</p>
                  {[
                    { id: 'all', label: 'Todos' },
                    { id: 'pending', label: 'Pendiente de enviar' },
                  ].map((op) =>
                    rosterFilterOption('filterWhatsAppPending', op.id, filterWhatsAppPending === op.id, () => setFilterWhatsAppPending(filterWhatsAppPending === op.id ? 'all' : op.id), op.label)
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-1">ID VNPM</p>
                  {[
                    { id: 'all', label: 'Todos' },
                    { id: 'first', label: 'Primera vez' },
                    { id: 'not-first', label: 'No primera vez' },
                  ].map((op) =>
                    rosterFilterOption('filterFirstTimeId', op.id, filterFirstTimeId === op.id, () => setFilterFirstTimeId(filterFirstTimeId === op.id ? 'all' : op.id), op.label)
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Devolución pendiente</p>
                  {[
                    { id: 'all', label: 'Todos' },
                    { id: 'pending', label: 'Con devolución pendiente' },
                    { id: 'none', label: 'Sin devolución pendiente' },
                  ].map((op) =>
                    rosterFilterOption('filterPendingRefund', op.id, filterPendingRefund === op.id, () => setFilterPendingRefund(filterPendingRefund === op.id ? 'all' : op.id), op.label)
                  )}
                </div>
                {isResponsivaEnabled && (
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Responsiva</p>
                    {[
                      { id: 'all', label: 'Todos' },
                      { id: 'pending', label: 'Pendiente' },
                      { id: 'delivered', label: 'Entregada' },
                      { id: 'na', label: 'No aplica' },
                    ].map((op) =>
                      rosterFilterOption('filterResponsiva', op.id, filterResponsiva === op.id, () => setFilterResponsiva(filterResponsiva === op.id ? 'all' : op.id), op.label)
                    )}
                  </div>
                )}
                {isCampa && (
                  <>
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Género</p>
                      {['all', ...GENDERS].map((op) =>
                        rosterFilterOption('filterGender', op, filterGender === op, () => setFilterGender(filterGender === op ? 'all' : op), op === 'all' ? 'Todos' : op === SI ? SI_LABEL : op)
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Salud</p>
                      {[
                        { id: 'all', label: 'Todos' },
                        { id: 'allergy', label: 'Con alergias' },
                        { id: 'disease', label: 'Con enfermedades' },
                        { id: 'disability', label: 'Con discapacidades' },
                      ].map((op) =>
                        rosterFilterOption('filterMedical', op.id, filterMedical === op.id, () => setFilterMedical(filterMedical === op.id ? 'all' : op.id), op.label)
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Nado</p>
                      {['all', SI, 'No'].map((op) =>
                        rosterFilterOption('filterSwim', op, filterSwim === op, () => setFilterSwim(filterSwim === op ? 'all' : op), op === 'all' ? 'Todos' : op)
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Sede de salida</p>
                      {['all', ...(currentEvent?.locations || [])].map((op) =>
                        rosterFilterOption('filterTravelFrom', op, filterTravelFrom === op, () => setFilterTravelFrom(filterTravelFrom === op ? 'all' : op), op === 'all' ? 'Todas' : op)
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Sede de regreso</p>
                      {['all', ...(currentEvent?.locations || [])].map((op) =>
                        rosterFilterOption('filterTravelTo', op, filterTravelTo === op, () => setFilterTravelTo(filterTravelTo === op ? 'all' : op), op === 'all' ? 'Todas' : op)
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
            <RosterSortDropdown
              value={sortBy}
              onChange={(nextSort) => setSortBy(nextSort)}
              options={ROSTER_SORT_OPTIONS}
              ariaLabel="Ordenar lista de registros"
              variant="location"
            />
      </div>

      {locationTypeSummary?.hasAny ? <LocationRosterTypeSummary summary={locationTypeSummary} /> : null}

      <RosterSectionScrollWrap sectionId={`roster-${rosterLocSlug}-activos`} controlsEnabled={showRosterActivos}>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <button
          type="button"
          disabled={rosterSearchActive}
          onClick={() => !rosterSearchActive && toggleRosterSection('activos')}
          className={`w-full flex items-center justify-between gap-3 px-4 py-4 border-b border-slate-100 text-left transition-colors ${rosterSearchActive ? 'bg-slate-50/80 cursor-default' : 'hover:bg-slate-50 cursor-pointer'}`}
        >
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <Users size={18} className="text-indigo-600 shrink-0" />
            <span className="text-sm font-black text-slate-800 uppercase tracking-wider">Activos (inscritos)</span>
            <LocationRosterActivosChip
              isBautizos={false}
              activeCount={rosterSectionDisplayCounts.active}
            />
          </div>
          {showRosterActivos ? <ChevronUp size={20} className="text-slate-400 shrink-0" /> : <ChevronDown size={20} className="text-slate-400 shrink-0" />}
        </button>
        {showRosterActivos && (
        <>
        <div className={uiRosterMobile.list}>
          {visibleParticipants.length === 0 ? (
            <p className="px-3 py-10 text-center text-slate-400 italic font-medium text-sm">{renderActivosEmptyMessage()}</p>
          ) : (
            <VirtualizedRosterMobileList
              items={flattenedActiveRowsForLoc}
              isItemExpanded={(rowItem) => rowItem.kind === 'main' && expandedRows.has(rowItem.person?.id)}
              renderItem={(rowItem, index) => {
              const rowDisplayIndex = index + 1;
              if (rowItem.kind === 'branch') {
                const bp = rowItem.branchPerson;
                const parentName = String(rowItem?.parent?.name || '').trim() || 'Registro origen';
                return renderRosterPersonMobileCard(bp, loc, {
                  key: bp.id,
                  displayIndex: rowDisplayIndex,
                  isExpanded: false,
                  showActions: false,
                  isSubRegistration: true,
                  financesOverride: (
                    <p className="text-[10px] font-semibold text-sky-700 dark:text-sky-300 text-left">
                      Subregistro (bautizo desde acompañante)
                    </p>
                  ),
                  branchMeta: (
                    <>
                      Proviene de: <span className="font-semibold">{parentName}</span>
                      {bp.relationship ? ` · ${bp.relationship}` : ''}
                    </>
                  ),
                });
              }
              const person = rowItem.person;
              const isExpanded = expandedRows.has(person.id);
              return renderRosterPersonMobileCard(person, loc, {
                key: person.id,
                displayIndex: rowDisplayIndex,
                isExpanded,
              });
            }}
            />
          )}
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className={ROSTER_LIST_TABLE_CLASS}>
            <RosterListColgroup />
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-black border-b border-slate-100">
                <th className={ROSTER_TH_PARTICIPANT}>Participante</th>
                <th className={ROSTER_TH_FINANCES}>Finanzas</th>
                <th className={ROSTER_TH_ACTIONS}>Acciones rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visibleParticipants.length === 0 ? (() => {
                  const emptyMsg =
                    filterWhatsAppPending === 'pending'
                      ? `No hay inscritos con aviso de WhatsApp pendiente en ${loc}${deferredLocationSearch.trim() ? ' (revisa la búsqueda)' : ''}.`
                      : `No hay registros para mostrar en ${loc}.`;
                  return <tr><td colSpan="3" className="px-6 py-16 text-center text-slate-400 italic font-medium">{emptyMsg}</td></tr>;
                })() : (
                <VirtualizedTableBody
                  items={flattenedActiveRowsForLoc}
                  colSpan={3}
                  isItemExpanded={(rowItem) => rowItem.kind === 'main' && expandedRows.has(rowItem.person?.id)}
                  renderItem={(rowItem, index) => {
                  const rowDisplayIndex = index + 1;
                  if (rowItem.kind === 'branch') {
                    const bp = rowItem.branchPerson;
                    const parentName = String(rowItem?.parent?.name || '').trim() || 'Registro origen';
                    return (
                      <tr key={bp.id} className="bg-sky-50/40 dark:bg-sky-950/15">
                        <td className="px-4 py-3 align-top">
                          {renderRegistrationParticipantColumn(bp, { displayIndex: rowDisplayIndex, isSubRegistration: true, rosterLocation: loc })}
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 ml-5 pl-3">
                            Proviene de: <span className="font-semibold">{parentName}</span>
                            {bp.relationship ? ` · ${bp.relationship}` : ''}
                          </p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="text-[10px] font-semibold text-sky-700 dark:text-sky-300">Subregistro (bautizo desde acompañante)</p>
                        </td>
                        <td className="px-4 py-3 align-top text-center">
                          <span className="text-[10px] font-bold text-slate-400">—</span>
                        </td>
                      </tr>
                    );
                  }
                  const person = rowItem.person;
                  const isExpanded = expandedRows.has(person.id);
                  const isBecado = isCampa && isSiValue(person.isScholarship);
                  const liquidationTarget = getLiquidationTarget(person);
                  return (
                    <React.Fragment key={person.id}>
                      <tr
                        id={rosterRowAnchorId(loc, person.id)}
                        className={`hover:bg-slate-50/50 transition-colors group cursor-pointer ${isExpanded ? 'bg-slate-50/50' : ''}`}
                        title="Clic en la fila para ver u ocultar detalles"
                        onClick={(e) => {
                          if (isRosterRowInteractiveClickTarget(e.target)) return;
                          toggleRosterRowExpand(person, loc);
                        }}
                      >
                        <td className="px-4 py-4 align-top">
                          {renderRegistrationParticipantColumn(person, { displayIndex: rowDisplayIndex, rosterLocation: loc })}
                        </td>
                        <td className={ROSTER_TD_FINANCES}>
                          {renderRegistrationFinancesColumn(person)}
                        </td>
                        <td className={ROSTER_TD_ACTIONS}>
                          <div
                            className={`flex flex-col gap-1.5 items-center justify-center w-full min-w-0 max-w-full mx-auto transition-opacity duration-200 ${
                              isExpanded ? 'opacity-100' : 'opacity-100 lg:opacity-[0.38] dark:lg:opacity-100 group-hover:opacity-100'
                            }`}
                          >
                            {/* Fila 1 · Información y edición del registro */}
                            <div className={ROSTER_QUICK_ACTIONS_ROW_PRIMARY}>
                              {currentUser?.role !== 'Lector' && !participantIsCancelled(person) && (
                                <button type="button" onClick={(e) => {
                                  e.stopPropagation();
                                  setPaymentModal({
                                  isOpen: true,
                                  loc,
                                  id: person.id,
                                  personName: person.name,
                                  amount: '',
                                  currentPaid: parseFloat(person.paid || 0),
                                  error: '',
                                  isScholarship: isBecado ? SI : 'No',
                                  baseCost: liquidationTarget,
                                  paymentMethod: 'Efectivo',
                                  paymentService: getAutoPaymentService(new Date(), loc),
                                  cardReference: '',
                                  abonoNote: '',
                                });
                                }} className={`${ROSTER_QUICK_ACTION_BTN_BASE} border border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700`} title="Abonar pago"><CreditCard {...ROSTER_QUICK_ACTION_ICON_PROPS} />Abonar</button>
                              )}
                              {currentUser?.role !== 'Lector' && !participantIsCancelled(person) && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openRegistrationCommentModal(person, loc);
                                  }}
                                  className={`${ROSTER_QUICK_ACTION_BTN_BASE} border border-slate-500 bg-slate-600 text-white hover:bg-slate-700 dark:border-slate-500 dark:bg-slate-700 dark:hover:bg-slate-600`}
                                  title="Comentario del registro"
                                >
                                  <MessageSquare {...ROSTER_QUICK_ACTION_ICON_PROPS} />Comentario
                                </button>
                              )}
                              {currentUser?.role !== 'Lector' && !participantIsCancelled(person) && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openRosterInlineEditFromQuickActions(person, loc);
                                  }}
                                  className={`${ROSTER_QUICK_ACTION_BTN_BASE} border border-indigo-700 bg-indigo-600 text-white hover:bg-indigo-700`}
                                  title="Editar registro"
                                >
                                  <Edit3 {...ROSTER_QUICK_ACTION_ICON_PROPS} />Editar
                                </button>
                              )}
                              <button type="button" onClick={() => toggleRosterRowExpand(person, loc)} className={`${ROSTER_QUICK_ACTION_BTN_BASE} border text-white ${isExpanded ? 'border-violet-800 bg-violet-700 hover:bg-violet-800' : 'border-violet-600 bg-violet-600 hover:bg-violet-700'}`} title="Ver o ocultar detalles">
                                {isExpanded ? <ChevronUp {...ROSTER_QUICK_ACTION_ICON_PROPS} /> : <ChevronDown {...ROSTER_QUICK_ACTION_ICON_PROPS} />}Detalles
                              </button>
                            </div>
                            {/* Fila 2 · Comunicación con el participante */}
                            {currentUser?.role !== 'Lector' && (canQuickActionResponsivaDigital || canQuickActionResponsivaLocal || canQuickActionWhatsApp) && (
                              <div className="flex flex-wrap items-center justify-center gap-1.5">
                                {canQuickActionResponsivaDigital && (
                                <RosterResponsivaWaButton
                                  person={person}
                                  loc={loc}
                                  onSend={sendResponsivaSignLinkWhatsAppForPerson}
                                  busyId={responsivaLinkBusyId}
                                  eventSnapshot={currentEvent}
                                />
                                )}
                                {canQuickActionResponsivaLocal && (
                                <RosterResponsivaLocalButton
                                  person={person}
                                  onLocal={(p) => markResponsivaLocalDelivery(p, loc)}
                                  busyId={responsivaLocalBusyId}
                                  eventSnapshot={currentEvent}
                                />
                                )}
                                {canQuickActionWhatsApp && (
                                <RosterWhatsAppButton person={person} loc={loc} onOpen={openWhatsAppModal} eventSnapshot={currentEvent} roster={allParticipants} />
                                )}
                              </div>
                            )}
                            {/* Fila 3 · Estado del registro */}
                            {currentUser?.role !== 'Lector' && (
                              <div className="flex flex-wrap items-center justify-center gap-1.5">
                                {!participantIsCancelled(person) && (
                                  <button
                                    type="button"
                                    onClick={() => openMoveToWaitlistConfirm(loc, person.id)}
                                    className={`${ROSTER_QUICK_ACTION_BTN_BASE} border border-sky-700 bg-sky-600 text-white hover:bg-sky-700`}
                                    title="Mover a lista de espera"
                                  >
                                    <GraduationCap {...ROSTER_QUICK_ACTION_ICON_PROPS} />
                                    A espera
                                  </button>
                                )}
                                {canMarkPersonsOfInterestFlag ? (
                                  <RosterPersonOfInterestButton
                                    person={person}
                                    isMarked={personLikeIsPersonOfInterest(person, personOfInterestVnpSet, { generateVnpPersonId })}
                                    onToggle={handleTogglePersonOfInterest}
                                  />
                                ) : null}
                                {!participantIsCancelled(person) && canCancelRegistrationsFlag ? (
                                  <button type="button" onClick={() => cancelEntry(loc, person.id)} className={`${ROSTER_QUICK_ACTION_BTN_BASE} border border-amber-600 bg-amber-500 text-white hover:bg-amber-600`} title="Dar de baja (queda visible, no cuenta en inscritos/becados/servidores)"><Scissors {...ROSTER_QUICK_ACTION_ICON_PROPS} />Baja</button>
                                ) : participantIsCancelled(person) && canCancelRegistrationsFlag ? (
                                  <button type="button" onClick={() => reactivateEntry(loc, person.id)} className={`${ROSTER_QUICK_ACTION_BTN_BASE} border border-teal-700 bg-teal-600 text-white hover:bg-teal-700`} title="Reactivar registro"><CheckCircle2 {...ROSTER_QUICK_ACTION_ICON_PROPS} />Reactivar</button>
                                ) : null}
                             {canArchiveRegistrationsFlag ? (
                             <button type="button" onClick={() => removeEntry(loc, person.id)} className={`${ROSTER_QUICK_ACTION_BTN_BASE} border border-rose-700 bg-rose-600 text-white hover:bg-rose-700`} title="Archivar registro (deja de contar en el evento; datos e ID VNPM siguen para precargar)"><Trash2 {...ROSTER_QUICK_ACTION_ICON_PROPS} />Archivar</button>
                             ) : null}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && <ExpandedRosterDetailRowLazy person={person} loc={loc} displayIndex={rowDisplayIndex} />}
                    </React.Fragment>
                  );
                }}
                />
              )}
            </tbody>
          </table>
        </div>
        </>
        )}
      </div>
      </RosterSectionScrollWrap>

      <RosterSectionScrollWrap sectionId={`roster-${rosterLocSlug}-waitlist`} controlsEnabled={showRosterWaitlist}>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div
          className={`w-full flex items-center justify-between gap-3 px-4 py-4 border-b border-slate-100 ${rosterSearchActive ? 'bg-slate-50/80' : ''}`}
        >
          <button
            type="button"
            disabled={rosterSearchActive}
            onClick={() => !rosterSearchActive && toggleRosterSection('waitlist')}
            className={`flex flex-1 min-w-0 items-center justify-between gap-3 text-left transition-colors ${rosterSearchActive ? 'cursor-default' : 'hover:opacity-90 cursor-pointer'}`}
          >
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <GraduationCap size={18} className="text-amber-600 shrink-0" />
              <span className="text-sm font-black text-slate-800 uppercase tracking-wider">Lista de espera(Becados)</span>
              <LocationRosterWaitlistChip
                waitlistCount={rosterSectionDisplayCounts.waitlist}
                rosterSearchActive={rosterSearchActive}
                filteredCount={waitlistFilteredForLoc.length}
              />
            </div>
            {showRosterWaitlist ? <ChevronUp size={20} className="text-slate-400 shrink-0" /> : <ChevronDown size={20} className="text-slate-400 shrink-0" />}
          </button>
          {hasAdminRights ? (
            <button
              type="button"
              onClick={toggleShowGrossWithoutCommission}
              className={getCommissionToggleCompactBtnClasses(showGrossWithoutCommission)}
              title={DASHBOARD_COMMISSION_VIEW_TITLE}
              aria-label={DASHBOARD_COMMISSION_VIEW_TITLE}
            >
              <Wallet size={11} className="shrink-0 opacity-90" />
              <span>{getDashboardCardCommissionToggleLabel(showGrossWithoutCommission)}</span>
            </button>
          ) : null}
        </div>
        {showRosterWaitlist && (
        <>
        <div className={uiRosterMobile.list}>
          {sortedWaitlistForLoc.length === 0 ? (
            <p className="px-3 py-10 text-center text-slate-400 italic font-medium text-sm">Sin personas en lista de espera en {loc}.</p>
          ) : waitlistFilteredForLoc.length === 0 ? (
            <p className="px-3 py-10 text-center text-slate-400 italic font-medium text-sm">
              {filterWhatsAppPending === 'pending'
                ? `Nadie en lista de espera con WhatsApp pendiente en ${loc}${deferredLocationSearch.trim() ? ' (revisa la búsqueda)' : ''}.`
                : `Ninguna entrada coincide con la búsqueda o filtros en lista de espera (${loc}).`}
            </p>
          ) : (
            <VirtualizedRosterMobileList
              items={waitlistFilteredForLoc}
              isItemExpanded={(person) => expandedRows.has(person.id)}
              renderItem={(person, index) => {
              const isExpanded = expandedRows.has(person.id);
              const rowDisplayIndex = index + 1;
              return renderRosterPersonMobileCard(person, loc, {
                key: `wait-m-${person.id}`,
                displayIndex: rowDisplayIndex,
                isExpanded,
              });
            }}
            />
          )}
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className={ROSTER_LIST_TABLE_CLASS}>
            <RosterListColgroup />
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-black border-b border-slate-100">
                <th className={ROSTER_TH_PARTICIPANT}>Participante</th>
                <th className={ROSTER_TH_FINANCES}>Finanzas</th>
                <th className={ROSTER_TH_ACTIONS}>Acciones rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedWaitlistForLoc.length === 0 ? (
                <tr><td colSpan="3" className="px-6 py-8 text-center text-slate-400 italic font-medium">Sin personas en lista de espera en {loc}.</td></tr>
              ) : waitlistFilteredForLoc.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="px-6 py-8 text-center text-slate-400 italic font-medium">
                        {filterWhatsAppPending === 'pending'
                          ? `Nadie en lista de espera con WhatsApp pendiente en ${loc}${deferredLocationSearch.trim() ? ' (revisa la búsqueda)' : ''}.`
                          : `Ninguna entrada coincide con la búsqueda o filtros en lista de espera (${loc}).`}
                      </td>
                    </tr>
                  ) : (
                <VirtualizedTableBody
                  items={waitlistFilteredForLoc}
                  colSpan={3}
                  isItemExpanded={(person) => expandedRows.has(person.id)}
                  renderItem={(person, index) => {
                    const isExpanded = expandedRows.has(person.id);
                    const isBecado = isCampa && isSiValue(person.isScholarship);
                    const liquidationTarget = getLiquidationTarget(person);
                    const rowDisplayIndex = index + 1;
                    return (
                    <React.Fragment key={`wait-${person.id}`}>
                      <tr
                        id={rosterRowAnchorId(loc, person.id)}
                        className={`hover:bg-slate-50/50 transition-colors group cursor-pointer ${isExpanded ? 'bg-slate-50/50' : ''}`}
                        title="Clic en la fila para ver u ocultar detalles"
                        onClick={(e) => {
                          if (isRosterRowInteractiveClickTarget(e.target)) return;
                          toggleRosterRowExpand(person, loc);
                        }}
                      >
                        <td className="px-4 py-4 align-top">
                          {renderRegistrationParticipantColumn(person, { displayIndex: rowDisplayIndex, rosterLocation: loc })}
                        </td>
                        <td className={ROSTER_TD_FINANCES}>
                          {renderRegistrationFinancesColumn(person)}
                        </td>
                        <td className={ROSTER_TD_ACTIONS}>
                          <div
                            className={`flex flex-col gap-1.5 items-center justify-center w-full min-w-0 max-w-full mx-auto transition-opacity duration-200 ${
                              isExpanded ? 'opacity-100' : 'opacity-100 lg:opacity-[0.38] dark:lg:opacity-100 group-hover:opacity-100'
                            }`}
                          >
                            {/* Fila 1 · Información y edición del registro */}
                            <div className={ROSTER_QUICK_ACTIONS_ROW_PRIMARY}>
                              {currentUser?.role !== 'Lector' && (
                                <button type="button" onClick={(e) => {
                                  e.stopPropagation();
                                  setPaymentModal({
                                  isOpen: true,
                                  loc,
                                  id: person.id,
                                  personName: person.name,
                                  amount: '',
                                  currentPaid: parseFloat(person.paid || 0),
                                  error: '',
                                  isScholarship: isBecado ? SI : 'No',
                                  baseCost: liquidationTarget,
                                  paymentMethod: 'Efectivo',
                                  paymentService: getAutoPaymentService(new Date(), loc),
                                  cardReference: '',
                                  abonoNote: '',
                                });
                                }} className={`${ROSTER_QUICK_ACTION_BTN_BASE} border border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700`} title="Abonar pago"><CreditCard {...ROSTER_QUICK_ACTION_ICON_PROPS} />Abonar</button>
                              )}
                              {currentUser?.role !== 'Lector' && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openRegistrationCommentModal(person, loc);
                                  }}
                                  className={`${ROSTER_QUICK_ACTION_BTN_BASE} border border-slate-500 bg-slate-600 text-white hover:bg-slate-700 dark:border-slate-500 dark:bg-slate-700 dark:hover:bg-slate-600`}
                                  title="Comentario del registro"
                                >
                                  <MessageSquare {...ROSTER_QUICK_ACTION_ICON_PROPS} />Comentario
                                </button>
                              )}
                              {currentUser?.role !== 'Lector' && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openWaitlistRowEdit(person, loc);
                                  }}
                                  className={`${ROSTER_QUICK_ACTION_BTN_BASE} border border-indigo-700 bg-indigo-600 text-white hover:bg-indigo-700`}
                                  title="Editar registro en lista de espera"
                                >
                                  <Edit3 {...ROSTER_QUICK_ACTION_ICON_PROPS} />Editar
                                </button>
                              )}
                              <button type="button" onClick={() => toggleRosterRowExpand(person, loc)} className={`${ROSTER_QUICK_ACTION_BTN_BASE} border text-white ${isExpanded ? 'border-violet-800 bg-violet-700 hover:bg-violet-800' : 'border-violet-600 bg-violet-600 hover:bg-violet-700'}`} title="Ver o ocultar detalles">
                                {isExpanded ? <ChevronUp {...ROSTER_QUICK_ACTION_ICON_PROPS} /> : <ChevronDown {...ROSTER_QUICK_ACTION_ICON_PROPS} />}Detalles
                              </button>
                            </div>
                            {/* Fila 2 · Comunicación con el participante */}
                            {currentUser?.role !== 'Lector' && (canQuickActionResponsivaDigital || canQuickActionResponsivaLocal || canQuickActionWhatsApp) && (
                              <div className="flex flex-wrap items-center justify-center gap-1.5">
                                {canQuickActionResponsivaDigital && (
                                <RosterResponsivaWaButton
                                  person={person}
                                  loc={loc}
                                  onSend={sendResponsivaSignLinkWhatsAppForPerson}
                                  busyId={responsivaLinkBusyId}
                                  eventSnapshot={currentEvent}
                                />
                                )}
                                {canQuickActionResponsivaLocal && (
                                <RosterResponsivaLocalButton
                                  person={person}
                                  onLocal={(p) => markResponsivaLocalDelivery(p, loc)}
                                  busyId={responsivaLocalBusyId}
                                  eventSnapshot={currentEvent}
                                />
                                )}
                                {canQuickActionWhatsApp && (
                                <RosterWhatsAppButton person={person} loc={loc} onOpen={openWhatsAppModal} eventSnapshot={currentEvent} roster={allParticipants} />
                                )}
                              </div>
                            )}
                            {/* Fila 3 · Estado del registro */}
                            {currentUser?.role !== 'Lector' && (
                              <div className="flex flex-wrap items-center justify-center gap-1.5">
                                <button type="button" onClick={() => promoteFromWaitlistSection(loc, person)} className={`${ROSTER_QUICK_ACTION_BTN_BASE} border border-cyan-700 bg-cyan-600 text-white hover:bg-cyan-700`} title="Promover a inscritos"><CheckCircle2 {...ROSTER_QUICK_ACTION_ICON_PROPS} />Promover</button>
                                {canMarkPersonsOfInterestFlag ? (
                                  <RosterPersonOfInterestButton
                                    person={person}
                                    isMarked={personLikeIsPersonOfInterest(person, personOfInterestVnpSet, { generateVnpPersonId })}
                                    onToggle={handleTogglePersonOfInterest}
                                  />
                                ) : null}
                                {canCancelRegistrationsFlag && true ? (
                                <button type="button" onClick={() => cancelEntry(loc, person.id)} className={`${ROSTER_QUICK_ACTION_BTN_BASE} border border-amber-600 bg-amber-500 text-white hover:bg-amber-600`} title="Dar de baja (queda visible, no cuenta en inscritos/becados/servidores)"><Scissors {...ROSTER_QUICK_ACTION_ICON_PROPS} />Baja</button>
                                ) : null}
                                {canArchiveRegistrationsFlag && true ? (
                                <button type="button" onClick={() => removeEntry(loc, person.id)} className={`${ROSTER_QUICK_ACTION_BTN_BASE} border border-rose-700 bg-rose-600 text-white hover:bg-rose-700`} title="Archivar registro (deja de contar en el evento; datos e ID VNPM siguen para precargar)"><Trash2 {...ROSTER_QUICK_ACTION_ICON_PROPS} />Archivar</button>
                                ) : null}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && <ExpandedRosterDetailRowLazy person={person} loc={loc} displayIndex={rowDisplayIndex} />}
                    </React.Fragment>
                    );
                  }}
                />
              )}
            </tbody>
          </table>
        </div>
        </>
        )}
      </div>
      </RosterSectionScrollWrap>

      <RosterSectionScrollWrap sectionId={`roster-${rosterLocSlug}-cancelled`} controlsEnabled={showRosterCancelled}>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <button
          type="button"
          disabled={rosterSearchActive}
          onClick={() => !rosterSearchActive && toggleRosterSection('cancelled')}
          className={`w-full flex items-center justify-between gap-3 px-4 py-4 border-b border-slate-100 text-left transition-colors ${rosterSearchActive ? 'bg-slate-50/80 cursor-default' : 'hover:bg-slate-50 cursor-pointer'}`}
        >
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <Ban size={18} className="text-rose-600 shrink-0" />
            <span className="text-sm font-black text-slate-800 uppercase tracking-wider">Cancelados / dados de baja</span>
            <LocationRosterCancelledChip
              cancelledCount={rosterSectionDisplayCounts.cancelled}
              rosterSearchActive={rosterSearchActive}
              filteredCount={cancelledFilteredForLoc.length}
            />
          </div>
          {showRosterCancelled ? <ChevronUp size={20} className="text-slate-400 shrink-0" /> : <ChevronDown size={20} className="text-slate-400 shrink-0" />}
        </button>
        {showRosterCancelled && (
        <>
        <div className={uiRosterMobile.list}>
          {(cancelledData[loc] || []).length === 0 ? (
            <p className="px-3 py-10 text-center text-slate-400 italic font-medium text-sm">No hay registros dados de baja en {loc}.</p>
          ) : cancelledFilteredForLoc.length === 0 ? (
            <p className="px-3 py-10 text-center text-slate-400 italic font-medium text-sm">
              {filterWhatsAppPending === 'pending'
                ? `Nadie cancelado con WhatsApp pendiente en ${loc}${deferredLocationSearch.trim() ? ' (revisa la búsqueda)' : ''}.`
                : `Ningún cancelado coincide con la búsqueda o filtros en ${loc}.`}
            </p>
          ) : (
            <VirtualizedRosterMobileList
              items={cancelledFilteredForLoc}
              isItemExpanded={(person) => expandedRows.has(person.id)}
              renderItem={(person, index) => {
              const isExpanded = expandedRows.has(person.id);
              const rowDisplayIndex = index + 1;
              return renderRosterPersonMobileCard(person, loc, {
                key: `cxl-m-${person.id}`,
                displayIndex: rowDisplayIndex,
                isExpanded,
              });
            }}
            />
          )}
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className={ROSTER_LIST_TABLE_CLASS}>
            <RosterListColgroup />
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-black border-b border-slate-100">
                <th className={ROSTER_TH_PARTICIPANT}>Participante</th>
                <th className={ROSTER_TH_FINANCES}>Finanzas</th>
                <th className={ROSTER_TH_ACTIONS}>Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(cancelledData[loc] || []).length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-6 py-8 text-center text-slate-400 italic font-medium">
                    No hay registros dados de baja en {loc}.
                  </td>
                </tr>
              ) : cancelledFilteredForLoc.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-6 py-8 text-center text-slate-400 italic font-medium">
                    {filterWhatsAppPending === 'pending'
                      ? `Nadie cancelado con WhatsApp pendiente en ${loc}${deferredLocationSearch.trim() ? ' (revisa la búsqueda)' : ''}.`
                      : `Ningún cancelado coincide con la búsqueda o filtros en ${loc}.`}
                  </td>
                </tr>
              ) : (
                <VirtualizedTableBody
                  items={cancelledFilteredForLoc}
                  colSpan={3}
                  isItemExpanded={(person) => expandedRows.has(person.id)}
                  renderItem={(person, index) => {
                  const isExpanded = expandedRows.has(person.id);
                  const rowDisplayIndex = index + 1;
                  return (
                    <React.Fragment key={`cxl-${person.id}`}>
                      <tr
                        id={rosterRowAnchorId(loc, person.id)}
                        className={`group hover:bg-rose-50/40 transition-colors cursor-pointer ${isExpanded ? 'bg-rose-50/60' : ''}`}
                        title="Clic en la fila para ver u ocultar detalles"
                        onClick={(e) => {
                          if (isRosterRowInteractiveClickTarget(e.target)) return;
                          toggleRosterRowExpand(person, loc);
                        }}
                      >
                        <td className="px-4 py-3 align-top">{renderRegistrationParticipantColumn(person, { displayIndex: rowDisplayIndex, rosterLocation: loc })}</td>
                        <td className={ROSTER_TD_FINANCES}>{renderRegistrationFinancesColumn(person)}</td>
                        <td className={`${ROSTER_TD_ACTIONS} py-3`}>
                          <div
                            className={`flex flex-col gap-1.5 items-center justify-center w-full min-w-0 max-w-full mx-auto transition-opacity duration-200 ${
                              isExpanded ? 'opacity-100' : 'opacity-100 lg:opacity-[0.38] dark:lg:opacity-100 group-hover:opacity-100'
                            }`}
                          >
                            {/* Fila 1 · Información y edición del registro */}
                            <div className={ROSTER_QUICK_ACTIONS_ROW_PRIMARY}>
                              {currentUser?.role !== 'Lector' && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openRosterInlineEditFromQuickActions(person, loc);
                                  }}
                                className={`${ROSTER_QUICK_ACTION_BTN_BASE} border border-indigo-700 bg-indigo-600 text-white hover:bg-indigo-700`}
                                title="Editar registro (permanece dado de baja hasta reactivar)"
                              >
                                <Edit3 {...ROSTER_QUICK_ACTION_ICON_PROPS} />Editar
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => toggleRosterRowExpand(person, loc)}
                              className={`${ROSTER_QUICK_ACTION_BTN_BASE} border text-white ${isExpanded ? 'border-violet-800 bg-violet-700 hover:bg-violet-800' : 'border-violet-600 bg-violet-600 hover:bg-violet-700'}`}
                              title="Ver o ocultar detalles"
                            >
                              {isExpanded ? <ChevronUp {...ROSTER_QUICK_ACTION_ICON_PROPS} /> : <ChevronDown {...ROSTER_QUICK_ACTION_ICON_PROPS} />}Detalles
                            </button>
                          </div>
                          {/* Fila 2 · Comunicación con el participante */}
                          {currentUser?.role !== 'Lector' && (canQuickActionResponsivaDigital || canQuickActionResponsivaLocal || canQuickActionWhatsApp) && (
                            <div className="flex flex-wrap items-center justify-center gap-1.5">
                              {canQuickActionResponsivaDigital && (
                              <RosterResponsivaWaButton
                                person={person}
                                loc={loc}
                                onSend={sendResponsivaSignLinkWhatsAppForPerson}
                                busyId={responsivaLinkBusyId}
                                eventSnapshot={currentEvent}
                              />
                              )}
                              {canQuickActionResponsivaLocal && (
                              <RosterResponsivaLocalButton
                                person={person}
                                onLocal={(p) => markResponsivaLocalDelivery(p, loc)}
                                busyId={responsivaLocalBusyId}
                                eventSnapshot={currentEvent}
                              />
                              )}
                              {canQuickActionWhatsApp && (
                              <RosterWhatsAppButton person={person} loc={loc} onOpen={openWhatsAppModal} eventSnapshot={currentEvent} roster={allParticipants} />
                              )}
                            </div>
                          )}
                          {/* Fila 3 · Estado del registro */}
                          {currentUser?.role !== 'Lector' && (
                            <div className="flex flex-wrap items-center justify-center gap-1.5">
                              {canMarkPersonsOfInterestFlag ? (
                                <RosterPersonOfInterestButton
                                  person={person}
                                  isMarked={personLikeIsPersonOfInterest(person, personOfInterestVnpSet, { generateVnpPersonId })}
                                  onToggle={handleTogglePersonOfInterest}
                                />
                              ) : null}
                              {canCancelRegistrationsFlag ? (
                              <button
                                type="button"
                                onClick={() => reactivateEntry(loc, person.id)}
                                className={`${ROSTER_QUICK_ACTION_BTN_BASE} border border-teal-700 bg-teal-600 text-white hover:bg-teal-700`}
                                title="Reactivar registro"
                              >
                                <CheckCircle2 {...ROSTER_QUICK_ACTION_ICON_PROPS} />Reactivar
                              </button>
                              ) : null}
                              {canArchiveRegistrationsFlag && (
                                <button
                                  type="button"
                                  onClick={() => removeEntry(loc, person.id)}
                                  className={`${ROSTER_QUICK_ACTION_BTN_BASE} border border-rose-700 bg-rose-600 text-white hover:bg-rose-700`}
                                  title="Archivar"
                                >
                                  <Trash2 {...ROSTER_QUICK_ACTION_ICON_PROPS} />Archivar
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && <ExpandedRosterDetailRowLazy person={person} loc={loc} displayIndex={rowDisplayIndex} />}
                    </React.Fragment>
                  );
                }}
                />
              )}
            </tbody>
          </table>
        </div>
        </>
        )}
      </div>
      </RosterSectionScrollWrap>

      {currentUser?.role !== 'Lector' && canQuickActionWhatsApp ? (
        <div className={`${uiRosterSearch.toolbarCard} mt-4`}>
          <div className={uiRosterSearch.whatsAppToolsRow}>
            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end w-full items-stretch sm:items-start">
              <button
                type="button"
                disabled={
                  whatsAppAutoSendJob.running || getPendingWhatsAppRowsForLocation(loc).length === 0
                }
                onClick={() => void runAutoSendPendingWhatsAppForLocation(loc)}
                title={
                  whatsAppAutoSendJob.running
                    ? 'Envío en curso…'
                    : `Abrir WhatsApp automáticamente (${getPendingWhatsAppRowsForLocation(loc).length} destinatario(s) en esta sede)`
                }
                className="inline-flex flex-col items-center justify-center gap-0.5 max-w-[10.75rem] py-3 px-2.5 rounded-xl border border-[#1DA851] bg-[#25D366] text-white hover:bg-[#20BD5A] active:scale-[0.98] disabled:opacity-45 disabled:pointer-events-none transition-all text-center leading-tight shadow-sm dark:border-[#1DA851] dark:bg-[#25D366] dark:hover:bg-[#20BD5A]"
              >
                <Send size={16} className="text-white shrink-0" />
                <span className="text-[10px] font-bold text-white">Envío automático WhatsApp</span>
                <span className="text-[9px] font-black text-white tabular-nums">
                  ({getPendingWhatsAppRowsForLocation(loc).length})
                </span>
              </button>
              <button
                type="button"
                onClick={() => exportPendingWhatsAppToExcel(loc)}
                title={`${getPendingWhatsAppRowsForLocation(loc).length} pendiente(s) de enviar`}
                className="inline-flex flex-col items-center justify-center gap-0.5 max-w-[10.75rem] py-3 px-2.5 rounded-xl border border-orange-600 bg-orange-500 text-white hover:bg-orange-600 active:scale-[0.98] transition-all text-center leading-tight shadow-sm dark:border-orange-500 dark:bg-orange-600 dark:hover:bg-orange-500"
              >
                <Download size={16} className="text-white shrink-0" />
                <span className="text-[10px] font-bold text-white">
                  Descargar mensajes pendientes de enviar por WhatsApp
                </span>
                <span className="text-[9px] font-black text-white tabular-nums">
                  ({getPendingWhatsAppRowsForLocation(loc).length})
                </span>
              </button>
            </div>
          </div>
          {whatsAppAutoSendJob.running && whatsAppAutoSendJob.locLabel === loc ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/45 dark:text-amber-100 mt-2">
              <p className="font-bold">
                WhatsApp automático sede «{loc}»: {whatsAppAutoSendJob.current}/{whatsAppAutoSendJob.total}
              </p>
              <button
                type="button"
                className="shrink-0 rounded-lg border border-amber-700 bg-white px-2 py-1 font-black text-amber-900 hover:bg-amber-100"
                onClick={() => {
                  whatsAppAutoSendCancelRef.current = true;
                }}
              >
                Cancelar envío
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
