import React from 'react';
import { getParticipantOutstandingGross } from '../../cashCutRefunds.js';
import RosterSectionScrollWrap from '../../components/RosterSectionScrollWrap.jsx';
import { buildGlobalRegistryPartySections, globalRegistryPartyRowsToPersons, sortGlobalRegistryPartyRows } from '../../globalRegistryPartyRows.js';
import { aggregateLocationRosterSectionCountsForLocations } from '../../locationRosterTypeSummary.js';
import { LocationRosterActivosChip, LocationRosterCancelledChip, LocationRosterWaitlistChip } from '../../screens/locationRoster/LocationRosterSectionChips.jsx';
import { uiRosterMobile } from '../../ui/uiFormatClasses.js';
import { AlertTriangle, Ban, ChevronDown, ChevronUp, GraduationCap, MapPin, TableProperties, Users } from 'lucide-react';
import { useWorkspaceShell } from '../../screens/eventWorkspace/WorkspaceShellContext.jsx';
import VirtualizedTableBody from '../../components/roster/VirtualizedTableBody.jsx';
import VirtualizedRosterMobileList from '../../components/roster/VirtualizedRosterMobileList.jsx';
import ExpandedRosterDetailRowLazy from '../../components/roster/ExpandedRosterDetailRowLazy.jsx';

function resolveParticipantEffectiveLocation(p) {
  return String(p?.cancelledFromLocation || p?.location || '').trim();
}

function GlobalRegistryPageContent() {
  const {
    PARTICIPANT_STATUS_ARCHIVED,
    PARTICIPANT_STATUS_CANCELLED,
    ROSTER_TH_FINANCES,
    ROSTER_TH_PARTICIPANT,    allParticipants,
    cancelledData,
    computeNetAmountByMethod,
    currentEvent,
    currentUser,
    data,    expandedRows,
    filterParticipantRows,    getLiquidationTarget,
    getSortedWaitlistForLocation,
    globalConfig,
    globalLocationFilters,
    globalRegistryListFilters,
    handleAssignParticipantLocation,
    isRosterRowInteractiveClickTarget,
    renderGlobalRegistryListToolbar,
    renderRegistrationFinancesColumn,
    renderRegistrationParticipantColumn,
    renderRosterPersonMobileCard,
    resolveGlobalRegistryFinanceHost,
    rosterDisplayUnspecified,
    rosterRowAnchorId,    rosterSectionExpanded,    toggleRosterRowExpand,
    toggleRosterSection,
    visibleLocations,
    waitlistData
  } = useWorkspaceShell();


    const memoizedData = React.useMemo(() => {
      const eventLocs = new Set((currentEvent?.locations || []).map((x) => String(x).trim()).filter(Boolean));
      const rosterForEvent = (allParticipants || []).filter(
        (p) => String(p?.eventId || '') === String(currentEvent?.id || '')
      );
      const isValidEventLocation = (p) => {
        const r = resolveParticipantEffectiveLocation(p);
        return r && eventLocs.has(r);
      };
      const sourceRows = rosterForEvent.filter((p) => {
        const status = p?.status || 'active';
        if (status === PARTICIPANT_STATUS_ARCHIVED) return false;
        if (!(status === 'active' || status === 'waitlist' || status === PARTICIPANT_STATUS_CANCELLED)) return false;
        const locRaw = resolveParticipantEffectiveLocation(p);
        const validLoc = locRaw && eventLocs.has(locRaw);
        if (validLoc && !visibleLocations.includes(locRaw)) return false;
        return true;
      });
      const invalidSource = sourceRows.filter((p) => !isValidEventLocation(p));
      const validSource = sourceRows.filter((p) => isValidEventLocation(p));
      const locsInScope = (() => {
        const base =
          globalLocationFilters.length > 0
            ? globalLocationFilters.filter((loc) => visibleLocations.includes(loc))
            : [...visibleLocations];
        return base.map((l) => String(l).trim()).filter(Boolean);
      })();
      const globalSectionDisplayCounts = aggregateLocationRosterSectionCountsForLocations({
        locations: locsInScope,
        event: currentEvent,
        globalConfig,
        allParticipants,
        activeTitularParticipantsByLocation: data,
        waitlistParticipantsByLocation: waitlistData,
        cancelledParticipantsByLocation: cancelledData,
      });
      const activosTitularsInScope = locsInScope.flatMap((loc) => data[loc] || []);
      const grSortKey = String(globalRegistryListFilters.sortBy || 'registered-desc').trim();
      const grSortDebt = (p) =>
        getParticipantOutstandingGross(p, getLiquidationTarget, computeNetAmountByMethod);
      const filterGlobalRegistrySectionRows = (rows, preserveOrder = false) =>
        filterParticipantRows(rows, preserveOrder, globalRegistryListFilters, {});
      const activosTitularsFiltered = filterGlobalRegistrySectionRows(activosTitularsInScope, false);
      const waitlistSortedFiltered = (() => {
        const sorted = locsInScope.flatMap((loc) => getSortedWaitlistForLocation(loc));
        const filteredIdSet = new Set(
          filterGlobalRegistrySectionRows(sorted, true).map((p) => String(p?.id || ''))
        );
        return sorted.filter((p) => filteredIdSet.has(String(p?.id || '')));
      })();
      const cancelledTitularsFiltered = filterGlobalRegistrySectionRows(
        locsInScope.flatMap((loc) => cancelledData[loc] || []),
        false
      );
      const applyGlobalRegistryPartySort = (partyRows) =>
        sortGlobalRegistryPartyRows(partyRows, grSortKey, { getDebt: grSortDebt });
      const partySections = buildGlobalRegistryPartySections({
        activeTitulars: activosTitularsFiltered,
        waitlistRows: waitlistSortedFiltered,
        cancelledTitulars: cancelledTitularsFiltered,
        rosterForPlan: validSource,
      });
      const activeRows = applyGlobalRegistryPartySort(partySections.active);
      const waitlistRows = applyGlobalRegistryPartySort(partySections.waitlist);
      const cancelledRows = applyGlobalRegistryPartySort(partySections.cancelled);
      const validSourceParty = buildGlobalRegistryPartySections({
        activeTitulars: activosTitularsInScope,
        waitlistRows: locsInScope.flatMap((loc) => getSortedWaitlistForLocation(loc)),
        cancelledTitulars: locsInScope.flatMap((loc) => cancelledData[loc] || []),
        rosterForPlan: validSource,
      });
      const validSourceExpanded = [
        ...globalRegistryPartyRowsToPersons(validSourceParty.active),
        ...globalRegistryPartyRowsToPersons(validSourceParty.waitlist),
        ...globalRegistryPartyRowsToPersons(validSourceParty.cancelled),
      ];
      const invalidFiltered = filterGlobalRegistrySectionRows(invalidSource);
      const coincidenceTotal =
        invalidFiltered.length + activeRows.length + waitlistRows.length + cancelledRows.length;
      const grSearchActive = !!String(globalRegistryListFilters.searchTerm || '').trim();
      const showGrActivos = grSearchActive ? activeRows.length > 0 : rosterSectionExpanded.activos;
      const showGrWaitlist = grSearchActive ? waitlistRows.length > 0 : rosterSectionExpanded.waitlist;
      const showGrCancelled = grSearchActive ? cancelledRows.length > 0 : rosterSectionExpanded.cancelled;
      const globalRegistryColumnOpts = {
        useUnspecifiedPlaceholder: true,
      };
      const globalRegistryRowLoc = (person) => {
        const effective = resolveParticipantEffectiveLocation(person);
        if (effective) return effective;
        return (
          person.location ||
          (Array.isArray(currentEvent?.locations) && currentEvent.locations.length > 0
            ? currentEvent.locations[0]
            : '')
        );
      };

      return {
        invalidFiltered,
        activeRows,
        waitlistRows,
        cancelledRows,
        coincidenceTotal,
        showGrActivos,
        showGrWaitlist,
        showGrCancelled,
        globalRegistryColumnOpts,
        globalRegistryRowLoc,
        globalSectionDisplayCounts,
        validSourceExpanded,
        grSearchActive,
      };
    }, [
      currentEvent,
      allParticipants,
      visibleLocations,
      globalLocationFilters,
      globalConfig,
      data,
      waitlistData,
      cancelledData,
      globalRegistryListFilters,
      rosterSectionExpanded,
      resolveGlobalRegistryFinanceHost,
    ]);

    const {
      invalidFiltered,
      activeRows,
      waitlistRows,
      cancelledRows,
      coincidenceTotal,
      showGrActivos,
      showGrWaitlist,
      showGrCancelled,
      globalRegistryColumnOpts,
      globalRegistryRowLoc,
      globalSectionDisplayCounts,
      validSourceExpanded,
      grSearchActive,
    } = memoizedData;

    const fallbackLoc =
      (Array.isArray(currentEvent?.locations) && currentEvent.locations.length > 0 ? currentEvent.locations[0] : '') || '';

    const renderGlobalRegistryRowsBlock = (sectionPartyRows, { emptyMessage, emptyFilteredMessage, sectionKey }) => (
      <>
        <div className={uiRosterMobile.list}>
          {sectionPartyRows.length === 0 ? (
            <p className="px-3 py-14 text-center text-slate-400 italic font-medium text-sm">{emptyMessage}</p>
          ) : (
            <VirtualizedRosterMobileList
              items={sectionPartyRows}
              isItemExpanded={(partyRow) => {
                const person = partyRow.person;
                return !partyRow.disableExpand && expandedRows.has(person.id);
              }}
              renderItem={(partyRow, partyRowIndex) => {
              const person = partyRow.person;
              const isExpanded =
                !partyRow.disableExpand && expandedRows.has(person.id);
              const rowLoc = globalRegistryRowLoc(person);
              const rowDisplayIndex = partyRowIndex + 1;
              return renderRosterPersonMobileCard(person, rowLoc, {
                key: `global-${sectionKey}-m-${partyRow.key}`,
                displayIndex: rowDisplayIndex,
                isExpanded,
                showActions: false,
                showSede: true,
                sedeLabel: rosterDisplayUnspecified(rowLoc),
                isSubRegistration: partyRow.isSubRegistration,
                disableExpand: partyRow.disableExpand,
                participantColumnOpts: {
                  ...globalRegistryColumnOpts,
                  subRegistrationLabel: partyRow.subRegistrationLabel,
                },
                branchMeta: partyRow.subRegistrationLabel && !partyRow.isSubRegistration ? partyRow.subRegistrationLabel : undefined,
              });
            }}
            />
          )}
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-black border-b border-slate-100">
                <th className={ROSTER_TH_PARTICIPANT}>Participante</th>
                <th className="px-4 py-4">Sede</th>
                <th className={`${ROSTER_TH_FINANCES} px-4`}>Finanzas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sectionPartyRows.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-6 py-14 text-center text-slate-400 italic font-medium">
                    {emptyFilteredMessage || emptyMessage}
                  </td>
                </tr>
              ) : (
                <VirtualizedTableBody
                  items={sectionPartyRows}
                  colSpan={3}
                  isItemExpanded={(partyRow) => {
                    const person = partyRow.person;
                    return !partyRow.disableExpand && expandedRows.has(person.id);
                  }}
                  renderItem={(partyRow, partyRowIndex) => {
                  const person = partyRow.person;
                  const isExpanded =
                    !partyRow.disableExpand && expandedRows.has(person.id);
                  const rowLoc = globalRegistryRowLoc(person);
                  const rowDisplayIndex = partyRowIndex + 1;
                  const columnOpts = {
                    displayIndex: rowDisplayIndex,
                    rosterLocation: rowLoc,
                    isSubRegistration: partyRow.isSubRegistration,
                    subRegistrationLabel: partyRow.subRegistrationLabel,
                    ...globalRegistryColumnOpts,
                  };
                  return (
                    <React.Fragment key={`global-${sectionKey}-${partyRow.key}`}>
                      <tr
                        id={rosterRowAnchorId(rowLoc, person.id)}
                        className={`hover:bg-slate-50/60 transition-colors ${partyRow.disableExpand ? '' : 'cursor-pointer'} ${isExpanded ? 'bg-slate-50/90' : ''}`}
                        title={partyRow.disableExpand ? undefined : 'Clic en la fila para ver u ocultar detalles'}
                        onClick={
                          partyRow.disableExpand
                            ? undefined
                            : (e) => {
                                if (isRosterRowInteractiveClickTarget(e.target)) return;
                                toggleRosterRowExpand(person, rowLoc);
                              }
                        }
                      >
                        <td className="px-4 py-3 align-top">
                          {renderRegistrationParticipantColumn(person, columnOpts)}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span className="inline-flex items-center gap-1 text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-1">
                            <MapPin size={12} />
                            {rosterDisplayUnspecified(rowLoc)}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top">
                          {renderRegistrationFinancesColumn(person)}
                        </td>
                      </tr>
                      {isExpanded ? (
                        <ExpandedRosterDetailRowLazy person={person} loc={rowLoc} displayIndex={rowDisplayIndex} colSpan={3} />
                      ) : null}
                    </React.Fragment>
                  );
                }}
                />
              )}
            </tbody>
          </table>
        </div>
      </>
    );

    return (
      <div className="p-6 space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <TableProperties size={20} className="text-indigo-600" />
              Registro Global
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Vista consolidada. Los mismos filtros de búsqueda, lista y sede que en Becados y Página Servidores. Los registros cuya sede no coincide con las sedes del evento aparecen abajo destacados: no se listan en las pestañas por sede hasta corregir el campo «sede».
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Coincidencias</p>
            <p className="text-2xl font-black text-indigo-700">{coincidenceTotal}</p>
            {invalidFiltered.length > 0 ? (
              <p className="text-[9px] font-bold text-amber-700 mt-1 max-w-[220px] ml-auto leading-snug">
                Incluye {invalidFiltered.length} con sede no reconocida
              </p>
            ) : null}
          </div>
        </div>

        {renderGlobalRegistryListToolbar(validSourceExpanded, 'Solo afectan a esta vista de Registro Global.', {
          sectionStats: {
            activos: activeRows.length,
            waitlist: waitlistRows.length,
            cancelled: cancelledRows.length,
          },
        })}
        {invalidFiltered.length > 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 space-y-2">
            <p className="text-xs font-black text-amber-950 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600 shrink-0" aria-hidden />
              Sede no reconocida ({invalidFiltered.length}) — no aparecen en las pestañas por sede
            </p>
            <div className="overflow-x-auto rounded-xl border border-amber-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-amber-100/80 text-[10px] uppercase tracking-wider font-black text-amber-950 border-b border-amber-200">
                    <th className="px-3 py-2">Participante</th>
                    <th className="px-3 py-2">Sede en base de datos</th>
                    <th className="px-3 py-2">Finanzas</th>
                    <th className="px-3 py-2 text-right">Asignar sede</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100">
                  {invalidFiltered.length === 0 ? null : (
                    <VirtualizedTableBody
                      items={invalidFiltered}
                      colSpan={4}
                      isItemExpanded={(person) => expandedRows.has(person.id)}
                      renderItem={(person, index) => {
                    const isExpanded = expandedRows.has(person.id);
                    const rowLoc = globalRegistryRowLoc(person) || fallbackLoc;
                    const rowDisplayIndex = index + 1;
                    return (
                      <React.Fragment key={`global-badloc-${person.id}`}>
                        <tr
                          id={rosterRowAnchorId(rowLoc, person.id)}
                          className="hover:bg-amber-50/80 cursor-pointer"
                          title="Clic en la fila para ver u ocultar detalles"
                          onClick={(e) => {
                            if (isRosterRowInteractiveClickTarget(e.target)) return;
                            toggleRosterRowExpand(person, rowLoc);
                          }}
                        >
                          <td className="px-3 py-2 align-top">{renderRegistrationParticipantColumn(person, { displayIndex: rowDisplayIndex, rosterLocation: rowLoc })}</td>
                          <td className="px-3 py-2 align-top">
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-900 bg-amber-100 border border-amber-200 rounded-lg px-2 py-1">
                              <MapPin size={12} />
                              {rosterDisplayUnspecified(rowLoc)}
                            </span>
                          </td>
                          <td className="px-3 py-2 align-top">{renderRegistrationFinancesColumn(person)}</td>
                          <td className="px-3 py-2 align-top text-right" onClick={(e) => e.stopPropagation()}>
                            {currentUser?.role !== 'Lector' ? (
                              <select
                                className="text-[10px] font-bold border border-amber-200 rounded-lg px-2 py-1 bg-white max-w-[150px]"
                                defaultValue=""
                                onChange={(e) => {
                                  const v = e.target.value;
                                  e.target.value = '';
                                  if (v) void handleAssignParticipantLocation(person, v);
                                }}
                              >
                                <option value="">Elegir…</option>
                                {(currentEvent?.locations || []).map((loc) => (
                                  <option key={`gfix-${person.id}-${loc}`} value={loc}>
                                    {loc}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-slate-400 font-semibold">—</span>
                            )}
                          </td>
                        </tr>
                        {isExpanded && <ExpandedRosterDetailRowLazy person={person} loc={rowLoc} displayIndex={rowDisplayIndex} colSpan={4} />}
                      </React.Fragment>
                    );
                  }}
                  />
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <RosterSectionScrollWrap sectionId="global-activos" controlsEnabled={showGrActivos}>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <button
            type="button"
            disabled={grSearchActive}
            onClick={() => !grSearchActive && toggleRosterSection('activos')}
            className={`w-full flex items-center justify-between gap-3 px-4 py-4 border-b border-slate-100 text-left transition-colors ${grSearchActive ? 'bg-slate-50/80 cursor-default' : 'hover:bg-slate-50 cursor-pointer'}`}
          >
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <Users size={18} className="text-indigo-600 shrink-0" />
              <span className="text-sm font-black text-slate-800 uppercase tracking-wider">Activos (inscritos)</span>
              <LocationRosterActivosChip
                isBautizos={false}
                activeCount={globalSectionDisplayCounts.active}
              />
              {grSearchActive && activeRows.length > 0 ? (
                <span className="chip-roster-count-filter-hit text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg">
                  {activeRows.length} coincidencia{activeRows.length === 1 ? '' : 's'}
                </span>
              ) : null}
            </div>
            {showGrActivos ? <ChevronUp size={20} className="text-slate-400 shrink-0" /> : <ChevronDown size={20} className="text-slate-400 shrink-0" />}
          </button>
          {showGrActivos &&
            renderGlobalRegistryRowsBlock(activeRows, {
              sectionKey: 'activos',
              emptyMessage:
                globalRegistryListFilters.filterWhatsAppPending === 'pending'
                  ? 'No hay inscritos activos con aviso de WhatsApp pendiente (revisa la búsqueda o filtros).'
                  : 'No hay registros activos para mostrar con los filtros actuales.',
            })}
        </div>
        </RosterSectionScrollWrap>

        <RosterSectionScrollWrap sectionId="global-waitlist" controlsEnabled={showGrWaitlist}>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <button
            type="button"
            disabled={grSearchActive}
            onClick={() => !grSearchActive && toggleRosterSection('waitlist')}
            className={`w-full flex items-center justify-between gap-3 px-4 py-4 border-b border-slate-100 text-left transition-colors ${grSearchActive ? 'bg-slate-50/80 cursor-default' : 'hover:bg-slate-50 cursor-pointer'}`}
          >
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <GraduationCap size={18} className="text-amber-600 shrink-0" />
              <span className="text-sm font-black text-slate-800 uppercase tracking-wider">Lista de espera(Becados)</span>
              <LocationRosterWaitlistChip
                waitlistCount={globalSectionDisplayCounts.waitlist}
                rosterSearchActive={grSearchActive}
                filteredCount={waitlistRows.length}
              />
            </div>
            {showGrWaitlist ? <ChevronUp size={20} className="text-slate-400 shrink-0" /> : <ChevronDown size={20} className="text-slate-400 shrink-0" />}
          </button>
          {showGrWaitlist &&
            renderGlobalRegistryRowsBlock(waitlistRows, {
              sectionKey: 'waitlist',
              emptyMessage: 'Sin personas en lista de espera en las sedes visibles.',
              emptyFilteredMessage:
                globalRegistryListFilters.filterWhatsAppPending === 'pending'
                  ? 'Nadie en lista de espera con WhatsApp pendiente (revisa la búsqueda o filtros).'
                  : 'Ninguna entrada en lista de espera coincide con la búsqueda o filtros actuales.',
            })}
        </div>
        </RosterSectionScrollWrap>

        <RosterSectionScrollWrap sectionId="global-cancelled" controlsEnabled={showGrCancelled}>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <button
            type="button"
            disabled={grSearchActive}
            onClick={() => !grSearchActive && toggleRosterSection('cancelled')}
            className={`w-full flex items-center justify-between gap-3 px-4 py-4 border-b border-slate-100 text-left transition-colors ${grSearchActive ? 'bg-slate-50/80 cursor-default' : 'hover:bg-slate-50 cursor-pointer'}`}
          >
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <Ban size={18} className="text-rose-600 shrink-0" />
              <span className="text-sm font-black text-slate-800 uppercase tracking-wider">Cancelados / dados de baja</span>
              <LocationRosterCancelledChip
                cancelledCount={globalSectionDisplayCounts.cancelled}
                rosterSearchActive={grSearchActive}
                filteredCount={cancelledRows.length}
              />
            </div>
            {showGrCancelled ? <ChevronUp size={20} className="text-slate-400 shrink-0" /> : <ChevronDown size={20} className="text-slate-400 shrink-0" />}
          </button>
          {showGrCancelled &&
            renderGlobalRegistryRowsBlock(cancelledRows, {
              sectionKey: 'cancelled',
              emptyMessage: 'No hay registros dados de baja en las sedes visibles.',
              emptyFilteredMessage:
                globalRegistryListFilters.filterWhatsAppPending === 'pending'
                  ? 'Nadie cancelado con WhatsApp pendiente (revisa la búsqueda o filtros).'
                  : 'Ningún cancelado coincide con la búsqueda o filtros actuales.',
            })}
        </div>
        </RosterSectionScrollWrap>
      </div>
    );
}

export default React.memo(GlobalRegistryPageContent);
