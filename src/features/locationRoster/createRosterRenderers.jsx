/** Roster column / expanded-detail / toolbar renderers extracted from AppMain. */
/* __EXTRACTED_ROSTER_RENDERERS__ */

export function createRosterRenderers(getScope) {
  const renderPublicLinkExtChip = (person) => {
    const { ATTENDANCE_SPECIAL, AlertCircle, BAUTIZOS_AGE_FILTER_OPTIONS, BAUTIZOS_ATTENDANCE, BAUTIZOS_ATTENDANCE_FILTER_OPTIONS, BAUTIZOS_TRANSPORT_FILTER_OPTIONS, Bug, BzEvtAttendanceTypeChip, BzEvtCarDataSummaryCard, CAR_DATA_FILTER_OPTIONS, CheckCircle2, ChevronDown, ChevronUp, Church, Clock, CopyButton, CreditCard, Edit3, FileSignature, Filter, Gift, GraduationCap, Heart, History, MapPin, MessageSquare, Percent, Phone, ROSTER_QUICK_ACTIONS_ROW_PRIMARY, Receipt, RosterPersonOfInterestButton, RosterResponsivaLocalButton, RosterResponsivaWaButton, RosterWhatsAppButton, SI } = getScope();
    const { Scissors, ShieldAlert, Trash2, UserCircle, Users, ackKeys, addLog, allParticipants, base, baseCost, bautizosCompanionChipCountByRegistrant, bautizosGlobalRegistryFinanceOpts, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtCompanionsInformativeListPriceSum, bzEvtLapInfantCompanion, bzEvtLegacyCompanionVirtualRow, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, bzEvtRosterIndex, calculateAgeFromBirthDate, canArchiveRegistrationsFlag, canCancelRegistrationsFlag, canEditAbonosAndPaymentHistory, canEditRegistryDates, canMarkPersonsOfInterestFlag, canQuickActionResponsivaDigital, canQuickActionResponsivaLocal, canQuickActionWhatsApp, canSeeMoney, companionCollisionsInEvent, companionDisplayIsWaitlistPending, companions, computeNetAmountByMethod, countHostCompanionWaitlistPending } = getScope();
    const { createEmptyGlobalRegistryListFilters, currentEvent, currentPricing, currentUser, data, db, editRegistryModal, el, ev, eventId, events, fieldStack, filterAge, filterAssignment, filterBaptism, filterBzEvtAttendance, filterCarDataPending, filterFirstTimeId, filterGender, filterLiquidation, filterMaritalStatus, filterMedical, filterPaymentType, filterPendingRefund, filterResponsiva, filterRosterRole, filterScholarship, filterSwim, filterTransport, filterTravelFrom, filterTravelTo, filterWhatsAppPending, formatMoney, formatPayHistoryRowDate, formatSiNo } = getScope();
    const { generateVnpPersonId, getAutoPaymentService, getBaptismAccountingSegment, getBautizosCompanionInformativeListPrice, getBautizosListPriceBreakdown, getBautizosTitularListPrice, getGeneralRegistrationCommentsForDisplay, getLiquidationTarget, getParticipantNetPaidFromHistory, getParticipantOutstandingGross, getResponsivaCardUiState, getResponsivaSignatureImageUrl, getScholarshipCondonedAmount, getWhatsAppMessageHistoryRows, globalConfig, globalLocationFilters, globalLocationsDropdownOpen, globalRegistryFiltersDropdownOpen, globalRegistryListFilters, globalRegistrySearchFieldId, handleTogglePersonOfInterest, hasAdminRights, hasFinancialAccess, isCampa, isCompanionWaitlistVirtualParticipant, isDesayunoEvent, isFreeAttendanceType, isGeneral, isResponsivaEnabled, isSiValue, isSuperUser, key } = getScope();
    const { loc, m, normalizeAttendanceSpecial, num, o, p, participantActivityEntriesById, participantActivityExpandedId, participantActivityLoadingId, participantExpandCache, participantIsCancelled, participantRegisteredViaPublicLink, personLikeIsPersonOfInterest, personOfInterestVnpSet, plan, prev, raw, reasons, registryConfirmBusy, resolveBautizosGlobalRegistryRowFinances, resolveCompanionWaitlistSource, resolveGlobalRegistryFinanceHost, resolveLlegaEnCarro, resolveRegisteredCost, resolveTransportSummary, responsivaLinkBusyId, responsivaLocalBusyId } = getScope();
    const { responsivaPipelineSectionTitle, root, roster, rosterInlineEditExpandedId, sede, selectedEventId, setEvents, setExpandedDupGroups, setExpandedDupPersons, setExpandedRows, setGlobalLocationFilters, setGlobalLocationsDropdownOpen, setGlobalRegistryFiltersDropdownOpen, setGlobalRegistryListFilters, setIsExporting, setParticipantActivityEntriesById, setParticipantActivityExpandedId, setParticipantActivityLoadingId, setParticipantExpandCache, setPaymentModal, setRegistryConfirmModal, setRosterInlineEditExpandedId, shouldUseBautizosLegacyPartyFinances, showToast, sortBy, summary, target, toast, total, uiDropdown, uiFilter } = getScope();
    const { uiRosterSearch, userCanDeleteAbonoNote, userCanDeletePaymentHistoryRow, userCanDeleteRegistrationComment, userCanOpenAbonoNoteEditModal, v, val, visibleLocations } = getScope();
    if (!participantRegisteredViaPublicLink(person)) return null;
    return (
      <span
        key="public-ext"
        className="chip-roster-ext bg-cyan-50 text-cyan-900 text-[8px] font-black px-1.5 py-0.5 rounded uppercase inline-flex items-center justify-center border border-cyan-200 h-5 leading-none dark:bg-cyan-700 dark:text-white dark:border-cyan-600"
        title="Inscripción mediante enlace público"
      >
        EXT
      </span>
    );
  };

  const getBautizosBaptizedCompanionRows = (personLike) => {
    const { ATTENDANCE_SPECIAL, AlertCircle, BAUTIZOS_AGE_FILTER_OPTIONS, BAUTIZOS_ATTENDANCE, BAUTIZOS_ATTENDANCE_FILTER_OPTIONS, BAUTIZOS_TRANSPORT_FILTER_OPTIONS, Bug, BzEvtAttendanceTypeChip, BzEvtCarDataSummaryCard, CAR_DATA_FILTER_OPTIONS, CheckCircle2, ChevronDown, ChevronUp, Church, Clock, CopyButton, CreditCard, Edit3, FileSignature, Filter, Gift, GraduationCap, Heart, History, MapPin, MessageSquare, Percent, Phone, ROSTER_QUICK_ACTIONS_ROW_PRIMARY, Receipt, RosterPersonOfInterestButton, RosterResponsivaLocalButton, RosterResponsivaWaButton, RosterWhatsAppButton, SI } = getScope();
    const { Scissors, ShieldAlert, Trash2, UserCircle, Users, ackKeys, addLog, allParticipants, base, baseCost, bautizosCompanionChipCountByRegistrant, bautizosGlobalRegistryFinanceOpts, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtCompanionsInformativeListPriceSum, bzEvtLapInfantCompanion, bzEvtLegacyCompanionVirtualRow, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, bzEvtRosterIndex, calculateAgeFromBirthDate, canArchiveRegistrationsFlag, canCancelRegistrationsFlag, canEditAbonosAndPaymentHistory, canEditRegistryDates, canMarkPersonsOfInterestFlag, canQuickActionResponsivaDigital, canQuickActionResponsivaLocal, canQuickActionWhatsApp, canSeeMoney, companionCollisionsInEvent, companionDisplayIsWaitlistPending, companions, computeNetAmountByMethod, countHostCompanionWaitlistPending } = getScope();
    const { createEmptyGlobalRegistryListFilters, currentEvent, currentPricing, currentUser, data, db, editRegistryModal, el, ev, eventId, events, fieldStack, filterAge, filterAssignment, filterBaptism, filterBzEvtAttendance, filterCarDataPending, filterFirstTimeId, filterGender, filterLiquidation, filterMaritalStatus, filterMedical, filterPaymentType, filterPendingRefund, filterResponsiva, filterRosterRole, filterScholarship, filterSwim, filterTransport, filterTravelFrom, filterTravelTo, filterWhatsAppPending, formatMoney, formatPayHistoryRowDate, formatSiNo } = getScope();
    const { generateVnpPersonId, getAutoPaymentService, getBaptismAccountingSegment, getBautizosCompanionInformativeListPrice, getBautizosListPriceBreakdown, getBautizosTitularListPrice, getGeneralRegistrationCommentsForDisplay, getLiquidationTarget, getParticipantNetPaidFromHistory, getParticipantOutstandingGross, getResponsivaCardUiState, getResponsivaSignatureImageUrl, getScholarshipCondonedAmount, getWhatsAppMessageHistoryRows, globalConfig, globalLocationFilters, globalLocationsDropdownOpen, globalRegistryFiltersDropdownOpen, globalRegistryListFilters, globalRegistrySearchFieldId, handleTogglePersonOfInterest, hasAdminRights, hasFinancialAccess, isCampa, isCompanionWaitlistVirtualParticipant, isDesayunoEvent, isFreeAttendanceType, isGeneral, isResponsivaEnabled, isSiValue, isSuperUser, key } = getScope();
    const { loc, m, normalizeAttendanceSpecial, num, o, p, participantActivityEntriesById, participantActivityExpandedId, participantActivityLoadingId, participantExpandCache, participantIsCancelled, participantRegisteredViaPublicLink, person, personLikeIsPersonOfInterest, personOfInterestVnpSet, plan, prev, raw, reasons, registryConfirmBusy, resolveBautizosGlobalRegistryRowFinances, resolveCompanionWaitlistSource, resolveGlobalRegistryFinanceHost, resolveLlegaEnCarro, resolveRegisteredCost, resolveTransportSummary, responsivaLinkBusyId, responsivaLocalBusyId } = getScope();
    const { responsivaPipelineSectionTitle, root, roster, rosterInlineEditExpandedId, sede, selectedEventId, setEvents, setExpandedDupGroups, setExpandedDupPersons, setExpandedRows, setGlobalLocationFilters, setGlobalLocationsDropdownOpen, setGlobalRegistryFiltersDropdownOpen, setGlobalRegistryListFilters, setIsExporting, setParticipantActivityEntriesById, setParticipantActivityExpandedId, setParticipantActivityLoadingId, setParticipantExpandCache, setPaymentModal, setRegistryConfirmModal, setRosterInlineEditExpandedId, shouldUseBautizosLegacyPartyFinances, showToast, sortBy, summary, target, toast, total, uiDropdown, uiFilter } = getScope();
    const { uiRosterSearch, userCanDeleteAbonoNote, userCanDeletePaymentHistoryRow, userCanDeleteRegistrationComment, userCanOpenAbonoNoteEditModal, v, val, visibleLocations } = getScope();
    if (!false) return [];
    return bzEvtCompanionsArray(personLike).filter(
      (c) => String(c?.name || '').trim() && bzEvtCompanionBaptized(c)
    );
  };

  const rosterDisplayUnspecified = (raw) => {
    const { ATTENDANCE_SPECIAL, AlertCircle, BAUTIZOS_AGE_FILTER_OPTIONS, BAUTIZOS_ATTENDANCE, BAUTIZOS_ATTENDANCE_FILTER_OPTIONS, BAUTIZOS_TRANSPORT_FILTER_OPTIONS, Bug, BzEvtAttendanceTypeChip, BzEvtCarDataSummaryCard, CAR_DATA_FILTER_OPTIONS, CheckCircle2, ChevronDown, ChevronUp, Church, Clock, CopyButton, CreditCard, Edit3, FileSignature, Filter, Gift, GraduationCap, Heart, History, MapPin, MessageSquare, Percent, Phone, ROSTER_QUICK_ACTIONS_ROW_PRIMARY, Receipt, RosterPersonOfInterestButton, RosterResponsivaLocalButton, RosterResponsivaWaButton, RosterWhatsAppButton, SI } = getScope();
    const { Scissors, ShieldAlert, Trash2, UserCircle, Users, ackKeys, addLog, allParticipants, base, baseCost, bautizosCompanionChipCountByRegistrant, bautizosGlobalRegistryFinanceOpts, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtCompanionsInformativeListPriceSum, bzEvtLapInfantCompanion, bzEvtLegacyCompanionVirtualRow, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, bzEvtRosterIndex, calculateAgeFromBirthDate, canArchiveRegistrationsFlag, canCancelRegistrationsFlag, canEditAbonosAndPaymentHistory, canEditRegistryDates, canMarkPersonsOfInterestFlag, canQuickActionResponsivaDigital, canQuickActionResponsivaLocal, canQuickActionWhatsApp, canSeeMoney, companionCollisionsInEvent, companionDisplayIsWaitlistPending, companions, computeNetAmountByMethod, countHostCompanionWaitlistPending } = getScope();
    const { createEmptyGlobalRegistryListFilters, currentEvent, currentPricing, currentUser, data, db, editRegistryModal, el, ev, eventId, events, fieldStack, filterAge, filterAssignment, filterBaptism, filterBzEvtAttendance, filterCarDataPending, filterFirstTimeId, filterGender, filterLiquidation, filterMaritalStatus, filterMedical, filterPaymentType, filterPendingRefund, filterResponsiva, filterRosterRole, filterScholarship, filterSwim, filterTransport, filterTravelFrom, filterTravelTo, filterWhatsAppPending, formatMoney, formatPayHistoryRowDate, formatSiNo } = getScope();
    const { generateVnpPersonId, getAutoPaymentService, getBaptismAccountingSegment, getBautizosCompanionInformativeListPrice, getBautizosListPriceBreakdown, getBautizosTitularListPrice, getGeneralRegistrationCommentsForDisplay, getLiquidationTarget, getParticipantNetPaidFromHistory, getParticipantOutstandingGross, getResponsivaCardUiState, getResponsivaSignatureImageUrl, getScholarshipCondonedAmount, getWhatsAppMessageHistoryRows, globalConfig, globalLocationFilters, globalLocationsDropdownOpen, globalRegistryFiltersDropdownOpen, globalRegistryListFilters, globalRegistrySearchFieldId, handleTogglePersonOfInterest, hasAdminRights, hasFinancialAccess, isCampa, isCompanionWaitlistVirtualParticipant, isDesayunoEvent, isFreeAttendanceType, isGeneral, isResponsivaEnabled, isSiValue, isSuperUser, key } = getScope();
    const { loc, m, normalizeAttendanceSpecial, num, o, p, participantActivityEntriesById, participantActivityExpandedId, participantActivityLoadingId, participantExpandCache, participantIsCancelled, participantRegisteredViaPublicLink, person, personLikeIsPersonOfInterest, personOfInterestVnpSet, plan, prev, reasons, registryConfirmBusy, resolveBautizosGlobalRegistryRowFinances, resolveCompanionWaitlistSource, resolveGlobalRegistryFinanceHost, resolveLlegaEnCarro, resolveRegisteredCost, resolveTransportSummary, responsivaLinkBusyId, responsivaLocalBusyId } = getScope();
    const { responsivaPipelineSectionTitle, root, roster, rosterInlineEditExpandedId, sede, selectedEventId, setEvents, setExpandedDupGroups, setExpandedDupPersons, setExpandedRows, setGlobalLocationFilters, setGlobalLocationsDropdownOpen, setGlobalRegistryFiltersDropdownOpen, setGlobalRegistryListFilters, setIsExporting, setParticipantActivityEntriesById, setParticipantActivityExpandedId, setParticipantActivityLoadingId, setParticipantExpandCache, setPaymentModal, setRegistryConfirmModal, setRosterInlineEditExpandedId, shouldUseBautizosLegacyPartyFinances, showToast, sortBy, summary, target, toast, total, uiDropdown, uiFilter } = getScope();
    const { uiRosterSearch, userCanDeleteAbonoNote, userCanDeletePaymentHistoryRow, userCanDeleteRegistrationComment, userCanOpenAbonoNoteEditModal, v, val, visibleLocations } = getScope();
    const s = String(raw ?? '').trim();
    return s || 'Sin especificar';
  };

  /** Columna «Participante» compartida: mismas etiquetas que en registro por sede (incl. lista de espera en vista global).
   *  `displayIndex`: posición en la lista visible (1, 2, 3…) según filtros y orden actuales. */
  const renderRegistrationParticipantColumn = (person, opts = {}) => {
    const { ATTENDANCE_SPECIAL, AlertCircle, BAUTIZOS_AGE_FILTER_OPTIONS, BAUTIZOS_ATTENDANCE, BAUTIZOS_ATTENDANCE_FILTER_OPTIONS, BAUTIZOS_TRANSPORT_FILTER_OPTIONS, Bug, BzEvtAttendanceTypeChip, BzEvtCarDataSummaryCard, CAR_DATA_FILTER_OPTIONS, CheckCircle2, ChevronDown, ChevronUp, Church, Clock, CopyButton, CreditCard, Edit3, FileSignature, Filter, Gift, GraduationCap, Heart, History, MapPin, MessageSquare, Percent, Phone, ROSTER_QUICK_ACTIONS_ROW_PRIMARY, Receipt, RosterPersonOfInterestButton, RosterResponsivaLocalButton, RosterResponsivaWaButton, RosterWhatsAppButton, SI } = getScope();
    const { Scissors, ShieldAlert, Trash2, UserCircle, Users, ackKeys, addLog, allParticipants, base, baseCost, bautizosCompanionChipCountByRegistrant, bautizosGlobalRegistryFinanceOpts, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtCompanionsInformativeListPriceSum, bzEvtLapInfantCompanion, bzEvtLegacyCompanionVirtualRow, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, bzEvtRosterIndex, calculateAgeFromBirthDate, canArchiveRegistrationsFlag, canCancelRegistrationsFlag, canEditAbonosAndPaymentHistory, canEditRegistryDates, canMarkPersonsOfInterestFlag, canQuickActionResponsivaDigital, canQuickActionResponsivaLocal, canQuickActionWhatsApp, canSeeMoney, companionCollisionsInEvent, companionDisplayIsWaitlistPending, companions, computeNetAmountByMethod, countHostCompanionWaitlistPending } = getScope();
    const { createEmptyGlobalRegistryListFilters, currentEvent, currentPricing, currentUser, data, db, editRegistryModal, el, ev, eventId, events, fieldStack, filterAge, filterAssignment, filterBaptism, filterBzEvtAttendance, filterCarDataPending, filterFirstTimeId, filterGender, filterLiquidation, filterMaritalStatus, filterMedical, filterPaymentType, filterPendingRefund, filterResponsiva, filterRosterRole, filterScholarship, filterSwim, filterTransport, filterTravelFrom, filterTravelTo, filterWhatsAppPending, formatMoney, formatPayHistoryRowDate, formatSiNo } = getScope();
    const { generateVnpPersonId, getAutoPaymentService, getBaptismAccountingSegment, getBautizosCompanionInformativeListPrice, getBautizosListPriceBreakdown, getBautizosTitularListPrice, getGeneralRegistrationCommentsForDisplay, getLiquidationTarget, getParticipantNetPaidFromHistory, getParticipantOutstandingGross, getResponsivaCardUiState, getResponsivaSignatureImageUrl, getScholarshipCondonedAmount, getWhatsAppMessageHistoryRows, globalConfig, globalLocationFilters, globalLocationsDropdownOpen, globalRegistryFiltersDropdownOpen, globalRegistryListFilters, globalRegistrySearchFieldId, handleTogglePersonOfInterest, hasAdminRights, hasFinancialAccess, isCampa, isCompanionWaitlistVirtualParticipant, isDesayunoEvent, isFreeAttendanceType, isGeneral, isResponsivaEnabled, isSiValue, isSuperUser, key } = getScope();
    const { loc, m, normalizeAttendanceSpecial, num, o, p, participantActivityEntriesById, participantActivityExpandedId, participantActivityLoadingId, participantExpandCache, participantIsCancelled, participantRegisteredViaPublicLink, personLikeIsPersonOfInterest, personOfInterestVnpSet, plan, prev, raw, reasons, registryConfirmBusy, resolveBautizosGlobalRegistryRowFinances, resolveCompanionWaitlistSource, resolveGlobalRegistryFinanceHost, resolveLlegaEnCarro, resolveRegisteredCost, resolveTransportSummary, responsivaLinkBusyId, responsivaLocalBusyId } = getScope();
    const { responsivaPipelineSectionTitle, root, roster, rosterInlineEditExpandedId, sede, selectedEventId, setEvents, setExpandedDupGroups, setExpandedDupPersons, setExpandedRows, setGlobalLocationFilters, setGlobalLocationsDropdownOpen, setGlobalRegistryFiltersDropdownOpen, setGlobalRegistryListFilters, setIsExporting, setParticipantActivityEntriesById, setParticipantActivityExpandedId, setParticipantActivityLoadingId, setParticipantExpandCache, setPaymentModal, setRegistryConfirmModal, setRosterInlineEditExpandedId, shouldUseBautizosLegacyPartyFinances, showToast, sortBy, summary, target, toast, total, uiDropdown, uiFilter } = getScope();
    const { uiRosterSearch, userCanDeleteAbonoNote, userCanDeletePaymentHistoryRow, userCanDeleteRegistrationComment, userCanOpenAbonoNoteEditModal, v, val, visibleLocations } = getScope();
    const displayIndex = typeof opts.displayIndex === 'number' && opts.displayIndex > 0 ? opts.displayIndex : null;
    const isSubRegistration = !!opts.isSubRegistration;
    const isWaitlist = (person?.status || 'active') === 'waitlist';
    const showCompanionChip =
      isCompanionWaitlistVirtualParticipant(person) ||
      isSubRegistration ||
      person?.__globalRegistryCompanionRow === true ||
      person?.__legacyCompanionRow === true ||
      person?.__legacyCompanionBaptized === true;
    const useUnspecified = !!opts.useUnspecifiedPlaceholder;
    const fmt = (v) => (useUnspecified ? rosterDisplayUnspecified(v) : String(v ?? '').trim() || '—');
    const ageFromBirth = (person?.birthDate && String(person.birthDate).trim())
      ? calculateAgeFromBirthDate(person.birthDate)
      : '';
    const ageDisplay =
      ageFromBirth ||
      (person?.age != null && String(person.age).trim() !== '' ? String(person.age).trim() : '');
    const rosterLocForComments = String(opts.rosterLocation ?? person.location ?? '').trim();
    const generalCommentsCollapsed = person.__globalRegistryVirtual
      ? []
      : getGeneralRegistrationCommentsForDisplay(person);
    return (
      <div className={`space-y-1 ${isSubRegistration ? 'ml-5 pl-3 border-l-2 border-sky-300/80 dark:border-sky-600/70' : ''}`}>
        <div className="flex items-center flex-wrap gap-2">
          <p className="font-bold text-slate-800 text-sm flex items-center gap-1.5 flex-wrap">
            {displayIndex != null ? (
              <span
                className="inline-flex items-center justify-center min-w-[1.6rem] h-6 px-1 rounded-md bg-slate-100 border border-slate-200/80 text-[11px] font-black tabular-nums text-slate-600 shrink-0"
                title="Número en esta lista (filtros y orden actuales)"
              >
                {displayIndex}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-0.5">
              <span>{person.name}</span>
              <CopyButton text={person.name} label="nombre" />
            </span>
            {isWaitlist ? (
              <span className="text-[8px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded h-5 leading-none inline-flex items-center justify-center dark:bg-amber-600 dark:text-white dark:border-amber-700">
                Lista de espera
              </span>
            ) : null}
            {showCompanionChip ? (
              <span className="text-[8px] font-black uppercase bg-violet-50 text-violet-800 border border-violet-200 px-1.5 py-0.5 rounded h-5 leading-none inline-flex items-center justify-center gap-0.5 dark:bg-violet-600 dark:text-white dark:border-violet-700">
                <Users size={10} className="shrink-0" aria-hidden />
                Acompañante
              </span>
            ) : null}
            {showCompanionChip && person?.__pastorCourtesyCompanion ? (
              <span className="text-[8px] font-black uppercase bg-fuchsia-50 text-fuchsia-800 border border-fuchsia-200 px-1.5 py-0.5 rounded h-5 leading-none inline-flex items-center justify-center gap-0.5 dark:bg-fuchsia-600 dark:text-white dark:border-fuchsia-700">
                <Gift size={10} className="shrink-0" aria-hidden />
                Cortesía
              </span>
            ) : null}
            {person.alias ? (
              <span className="text-[8px] font-black uppercase bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded h-5 leading-none inline-flex items-center dark:bg-indigo-600 dark:text-white dark:border-indigo-700">
                Alias: {person.alias}
              </span>
            ) : null}
            {person.isFirstVnpId ? (
              <span className="text-[8px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded h-5 leading-none inline-flex items-center justify-center dark:bg-emerald-600 dark:text-white dark:border-emerald-700">
                1
              </span>
            ) : null}
            {participantIsCancelled(person) ? (
              <span className="text-[8px] font-black uppercase bg-slate-100 text-slate-700 border border-slate-300 px-1.5 py-0.5 rounded h-5 leading-none inline-flex items-center">
                Cancelado
              </span>
            ) : null}
            {personLikeIsPersonOfInterest(person, personOfInterestVnpSet, { generateVnpPersonId }) ? (
              <span
                className="text-[8px] font-black uppercase bg-fuchsia-50 text-fuchsia-800 border border-fuchsia-200 px-1.5 py-0.5 rounded h-5 leading-none inline-flex items-center gap-0.5 dark:bg-fuchsia-600 dark:text-white dark:border-fuchsia-700"
                title="Persona de interés (precarga y registro restringidos)"
              >
                <ShieldAlert size={10} className="shrink-0 opacity-90" aria-hidden />
                Interés
              </span>
            ) : null}
            {(Number(person?.refundPendingAmount || 0) || 0) > 0 ? (
              <span className="text-[8px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded h-5 leading-none inline-flex items-center dark:bg-amber-600 dark:text-white dark:border-amber-700">
                {!participantIsCancelled(person) &&
                (person.refundPendingReason === 'manual_cost_credit' ||
                  (person.registeredCostManual === true &&
                    (parseFloat(person.paid || 0) || 0) > (Number(getLiquidationTarget(person)) || 0) + 0.01))
                  ? 'Saldo a favor'
                  : 'Devolución pendiente'}
              </span>
            ) : null}
            {String(person.discountCampaignId || '').trim() || String(person.discountCampaignConcept || '').trim() ? (
              <span
                className="text-[8px] font-black uppercase bg-teal-50 text-teal-800 border border-teal-200 px-1.5 py-0.5 rounded h-5 leading-none inline-flex items-center gap-0.5 max-w-[11rem] min-w-0"
                title={person.discountCampaignConcept || 'Campaña de descuento'}
              >
                <Percent size={10} className="shrink-0 opacity-90" />
                <span className="truncate">{person.discountCampaignConcept || 'Campaña'}</span>
              </span>
            ) : null}
            {(() => {
                const card = getResponsivaCardUiState(person, currentEvent);
                if (!card.applies) return null;
                if (card.delivered) {
                  return (
                    <span
                      className="chip-responsiva-firmada text-[8px] font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded h-5 leading-none inline-flex items-center gap-0.5"
                      title="Responsiva recibida (firma digital, en sitio o estado Entregada)"
                    >
                      <FileSignature size={10} className="shrink-0 opacity-90" aria-hidden />
                      Responsiva firmada
                    </span>
                  );
                }
                return (
                  <span
                    className="chip-responsiva-pendiente text-[8px] font-black uppercase bg-amber-50 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded h-5 leading-none inline-flex items-center gap-0.5"
                    title="Aplica responsiva y aún no está recibida en el sistema"
                  >
                    <AlertCircle size={10} className="shrink-0" aria-hidden />
                    Responsiva pendiente
                  </span>
                );
              })()}
            {person._isDebug && person._debugSessionId === globalConfig?.debugSessionId && (
              <Bug size={14} className="text-orange-500 inline-block ml-auto flex-shrink-0" title="Cambio no permanente" />
            )}
            {renderPublicLinkExtChip(person)}
            <DoubleRoleCollisionChip
              person={person}
              isBautizos={false}
              companionCollisionsInEvent={companionCollisionsInEvent}
            />
          </p>
          <ParticipantAssistanceBadges person={person} isBautizos={false} currentEvent={currentEvent} />
          <BzEvtAttendanceTypeChip person={person} isBautizos={false} isSubRegistration={opts.isSubRegistration} />
          {isSiValue(person.isServer) &&
          !(false && bzEvtNormalizeAttendanceType(person.bautizosAttendanceType) === BAUTIZOS_ATTENDANCE.servidor) ? (
            <span className="chip-roster-servidor bg-amber-100 text-amber-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
              <Users size={10} /> Servidor {person.serverAssignment ? `(${person.serverAssignment})` : ''}
            </span>
          ) : (
            isCampa && (
              <span className="chip-roster-asignacion-campa bg-indigo-100 text-indigo-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
                <Users size={10} /> {person.campAssignment || (parseInt(person.age) < 18 ? 'Teens' : 'Jóvenes')}
              </span>
            )
          )}
          {(isCampa && isSiValue(person.willBeBaptized)) && (() => {
            if (isCampa) {
              const seg = getBaptismAccountingSegment(person);
              return (
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-1 border ${seg ? 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-600 dark:text-white dark:border-sky-700' : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-600 dark:text-white dark:border-amber-700'}`} title={seg ? `Conteo en ${seg}` : 'Servidor Ambos: elige Teens o Jóvenes en editar'}>
                  <Church size={10} /> Bautizo{seg ? `: ${seg}` : ': incompleto'}
                </span>
              );
            }
            return (
              <span
                className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-1 border bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-600 dark:text-white dark:border-sky-700"
                title="Asistencia como bautizado"
              >
                <Church size={10} /> Bautizo
              </span>
            );
          })()}
          {false && !opts.hideBautizosCompanionCountChip && (() => {
            const companionCount = bautizosCompanionChipCountByRegistrant.get(String(person?.id || '')) || 0;
            const waitlistCompanionCount = countHostCompanionWaitlistPending(person);
            if (companionCount <= 0 && waitlistCompanionCount <= 0) return null;
            return (
              <>
                {companionCount > 0 ? (
                  <span
                    className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-1 border bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-600 dark:text-white dark:border-amber-700"
                    title={`Acompañantes únicos visibles para este registro: ${companionCount}`}
                  >
                    <Users size={10} className="shrink-0" />
                    Acompañantes
                    <span className="inline-flex items-center justify-center min-w-[1rem] h-4 px-1 rounded bg-white/80 text-amber-900 border border-amber-300 dark:bg-amber-700 dark:text-white dark:border-amber-500">
                      {companionCount}
                    </span>
                  </span>
                ) : null}
                {waitlistCompanionCount > 0 ? (
                  <span
                    className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-1 border bg-violet-50 text-violet-800 border-violet-200 dark:bg-violet-600 dark:text-white dark:border-violet-700"
                    title={`${waitlistCompanionCount} acompañante(s) en lista de espera en este registro`}
                  >
                    <Clock size={10} className="shrink-0" />
                    En espera
                    <span className="inline-flex items-center justify-center min-w-[1rem] h-4 px-1 rounded bg-white/80 text-violet-900 border border-violet-300 dark:bg-violet-700 dark:text-white dark:border-violet-500">
                      {waitlistCompanionCount}
                    </span>
                  </span>
                ) : null}
              </>
            );
          })()}
          {isCampa && (() => {
            const out = String(person.spouseParticipantId || '').trim();
            const hasSpouseLink = !!out || spouseIncomingIdsForEvent.has(String(person.id));
            if (!hasSpouseLink) return null;
            return (
              <span
                className="bg-rose-50 text-rose-800 text-[8px] font-black px-1.5 py-0.5 rounded uppercase inline-flex items-center gap-1 border border-rose-200"
                title="Pareja vinculada en registros (id o enlace entrante)"
              >
                <Heart size={10} className="shrink-0" />
                Casado
              </span>
            );
          })()}
        </div>
        {isSubRegistration ? (
          <p className="text-[10px] font-semibold text-sky-800 dark:text-sky-200 leading-snug">
            {opts.subRegistrationLabel ||
              (person.__globalRegistryVirtual
                ? 'Subregistro de acompañante marcado para bautizo.'
                : 'Acompañante del titular')}
          </p>
        ) : null}
        {!isSubRegistration && opts.subRegistrationLabel ? (
          <p className="text-[10px] font-semibold text-violet-800 dark:text-violet-200 leading-snug">
            {opts.subRegistrationLabel}
          </p>
        ) : null}
        {isWaitlist && isSiValue(person.isScholarship) && person.scholarshipPendingApproval ? (
          <p className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-100 rounded-lg px-2 py-1 inline-block">
            Solicitud de beca {person.scholarshipType === 'partial' ? 'parcial' : 'total'}
            {person.scholarshipType === 'partial'
              ? ` · monto becado $${Number(person.scholarshipPartialAmount || 0).toLocaleString('es-MX')}`
              : ''}{' '}
            (pendiente al promover)
          </p>
        ) : null}
        {isCompanionWaitlistVirtualParticipant(person) ? (
          <>
            <p className="text-[10px] font-semibold text-violet-800 dark:text-violet-200 leading-snug">
              Acompañante de {String(person._companionWaitlistHostName || 'titular').trim()}
              {String(person.relationship || '').trim() && person.relationship !== 'No disponible'
                ? ` · ${String(person.relationship).trim()}`
                : ''}
            </p>
            <div className="mt-1">
              <CompanionWaitlistBadge hostName={String(person._companionWaitlistHostName || '').trim()} />
            </div>
          </>
        ) : null}
        {false &&
        !isCompanionWaitlistVirtualParticipant(person) &&
        (person.__companionWaitlistPending ||
          (bzEvtLegacyCompanionVirtualRow(person) &&
            companionDisplayIsWaitlistPending(person, allParticipants))) ? (
          <div className="mt-1">
            <CompanionWaitlistBadge
              hostName={
                String(person.__sourceRegistrantName || '').trim() ||
                String(resolveCompanionWaitlistSource(person, allParticipants)?.host?.name || '').trim()
              }
            />
          </div>
        ) : null}
        <div className="text-xs text-slate-500 flex flex-col gap-0.5 mt-1">
          <span className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 min-w-0">
              <Phone size={12} className="text-slate-400 shrink-0" />
              <span className="truncate inline-flex items-center">
                <span>{person.phone || '—'}</span>
                <CopyButton text={person.phone} label="teléfono" />
              </span>
            </span>
            {ageDisplay ? (
              <span className="text-slate-600 font-bold tabular-nums shrink-0">
                · {ageDisplay} años
              </span>
            ) : null}
          </span>
          {person.vnpPersonId && (
            <span className="text-[10px] font-mono text-indigo-600 dark:text-white font-bold tracking-tight inline-flex items-center flex-wrap gap-0.5">
              VNPM ID: {person.vnpPersonId}
              <CopyButton text={person.vnpPersonId} label="ID VNPM" />
            </span>
          )}
          {generalCommentsCollapsed.length > 0 ? (
            <div className="mt-1 pt-1 border-t border-slate-200/90 dark:border-slate-600/80" onClick={(e) => e.stopPropagation()} role="presentation">
              <p className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <MessageSquare size={10} className="shrink-0 opacity-80" aria-hidden />
                Comentarios generales
                <span className="font-mono text-[7px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1 py-0.5 rounded">
                  {generalCommentsCollapsed.length}
                </span>
              </p>
              <ul className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
                {generalCommentsCollapsed.map((c) => {
                  const canDeleteThisComment = userCanDeleteRegistrationComment(c, {
                    currentUser,
                    isSuperUser,
                    hasAdminRights,
                  });
                  return (
                    <li
                      key={String(c.id)}
                      className="text-[10px] text-slate-700 dark:text-slate-200 rounded-md border border-slate-100 dark:border-slate-600 bg-white/90 dark:bg-slate-900/70 px-2 py-1 flex gap-2 items-start justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[7px] text-slate-400 dark:text-slate-500 font-mono mb-0.5">
                          {new Date(Number(c.createdAt) || Date.now()).toLocaleString('es-MX')} · {c.createdBy || '—'}
                        </p>
                        <p className="whitespace-pre-wrap break-words leading-snug font-medium">{c.text || ''}</p>
                      </div>
                      {canDeleteThisComment && rosterLocForComments ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void deleteRegistrationCommentItem(person, rosterLocForComments, c);
                          }}
                          className="shrink-0 p-1 rounded-md text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-transparent hover:border-rose-200 dark:hover:border-rose-500/50 transition-colors"
                          title="Eliminar comentario"
                        >
                          <Trash2 size={12} className="block" />
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  const renderRegistrationFinancesColumn = (person) => {
    const { ATTENDANCE_SPECIAL, AlertCircle, BAUTIZOS_AGE_FILTER_OPTIONS, BAUTIZOS_ATTENDANCE, BAUTIZOS_ATTENDANCE_FILTER_OPTIONS, BAUTIZOS_TRANSPORT_FILTER_OPTIONS, Bug, BzEvtAttendanceTypeChip, BzEvtCarDataSummaryCard, CAR_DATA_FILTER_OPTIONS, CheckCircle2, ChevronDown, ChevronUp, Church, Clock, CopyButton, CreditCard, Edit3, FileSignature, Filter, Gift, GraduationCap, Heart, History, MapPin, MessageSquare, Percent, Phone, ROSTER_QUICK_ACTIONS_ROW_PRIMARY, Receipt, RosterPersonOfInterestButton, RosterResponsivaLocalButton, RosterResponsivaWaButton, RosterWhatsAppButton, SI } = getScope();
    const { Scissors, ShieldAlert, Trash2, UserCircle, Users, ackKeys, addLog, allParticipants, base, baseCost, bautizosCompanionChipCountByRegistrant, bautizosGlobalRegistryFinanceOpts, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtCompanionsInformativeListPriceSum, bzEvtLapInfantCompanion, bzEvtLegacyCompanionVirtualRow, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, bzEvtRosterIndex, calculateAgeFromBirthDate, canArchiveRegistrationsFlag, canCancelRegistrationsFlag, canEditAbonosAndPaymentHistory, canEditRegistryDates, canMarkPersonsOfInterestFlag, canQuickActionResponsivaDigital, canQuickActionResponsivaLocal, canQuickActionWhatsApp, canSeeMoney, companionCollisionsInEvent, companionDisplayIsWaitlistPending, companions, computeNetAmountByMethod, countHostCompanionWaitlistPending } = getScope();
    const { createEmptyGlobalRegistryListFilters, currentEvent, currentPricing, currentUser, data, db, editRegistryModal, el, ev, eventId, events, fieldStack, filterAge, filterAssignment, filterBaptism, filterBzEvtAttendance, filterCarDataPending, filterFirstTimeId, filterGender, filterLiquidation, filterMaritalStatus, filterMedical, filterPaymentType, filterPendingRefund, filterResponsiva, filterRosterRole, filterScholarship, filterSwim, filterTransport, filterTravelFrom, filterTravelTo, filterWhatsAppPending, formatMoney, formatPayHistoryRowDate, formatSiNo } = getScope();
    const { generateVnpPersonId, getAutoPaymentService, getBaptismAccountingSegment, getBautizosCompanionInformativeListPrice, getBautizosListPriceBreakdown, getBautizosTitularListPrice, getGeneralRegistrationCommentsForDisplay, getLiquidationTarget, getParticipantNetPaidFromHistory, getParticipantOutstandingGross, getResponsivaCardUiState, getResponsivaSignatureImageUrl, getScholarshipCondonedAmount, getWhatsAppMessageHistoryRows, globalConfig, globalLocationFilters, globalLocationsDropdownOpen, globalRegistryFiltersDropdownOpen, globalRegistryListFilters, globalRegistrySearchFieldId, handleTogglePersonOfInterest, hasAdminRights, hasFinancialAccess, isCampa, isCompanionWaitlistVirtualParticipant, isDesayunoEvent, isFreeAttendanceType, isGeneral, isResponsivaEnabled, isSiValue, isSuperUser, key } = getScope();
    const { loc, m, normalizeAttendanceSpecial, num, o, p, participantActivityEntriesById, participantActivityExpandedId, participantActivityLoadingId, participantExpandCache, participantIsCancelled, participantRegisteredViaPublicLink, personLikeIsPersonOfInterest, personOfInterestVnpSet, plan, prev, raw, reasons, registryConfirmBusy, resolveBautizosGlobalRegistryRowFinances, resolveCompanionWaitlistSource, resolveGlobalRegistryFinanceHost, resolveLlegaEnCarro, resolveRegisteredCost, resolveTransportSummary, responsivaLinkBusyId, responsivaLocalBusyId } = getScope();
    const { responsivaPipelineSectionTitle, root, roster, rosterInlineEditExpandedId, sede, selectedEventId, setEvents, setExpandedDupGroups, setExpandedDupPersons, setExpandedRows, setGlobalLocationFilters, setGlobalLocationsDropdownOpen, setGlobalRegistryFiltersDropdownOpen, setGlobalRegistryListFilters, setIsExporting, setParticipantActivityEntriesById, setParticipantActivityExpandedId, setParticipantActivityLoadingId, setParticipantExpandCache, setPaymentModal, setRegistryConfirmModal, setRosterInlineEditExpandedId, shouldUseBautizosLegacyPartyFinances, showToast, sortBy, summary, target, toast, total, uiDropdown, uiFilter } = getScope();
    const { uiRosterSearch, userCanDeleteAbonoNote, userCanDeletePaymentHistoryRow, userCanDeleteRegistrationComment, userCanOpenAbonoNoteEditModal, v, val, visibleLocations } = getScope();
    const isBecado = isSiValue(person.isScholarship);
    const isBecaTotal = isBecado && person.scholarshipType !== 'partial';
    let liquidationTarget = getLiquidationTarget(person);
    let paidDisplay = getParticipantNetPaidFromHistory(person, computeNetAmountByMethod);
    if (false && shouldUseBautizosLegacyPartyFinances(person, currentEvent) && bautizosGlobalRegistryFinanceOpts) {
      const host = bzEvtLegacyCompanionVirtualRow(person)
        ? resolveGlobalRegistryFinanceHost(person)
        : null;
      const finance = resolveBautizosGlobalRegistryRowFinances(
        person,
        host,
        currentEvent,
        bautizosGlobalRegistryFinanceOpts
      );
      liquidationTarget = finance.liquidationTarget;
      paidDisplay = finance.paidDisplay;
    }
    const manualSaldoFavor =
      person.registeredCostManual === true && liquidationTarget > 0.005
        ? Math.max(0, paidDisplay - liquidationTarget)
        : 0;
    const balance = participantIsCancelled(person)
      ? 0
      : Math.max(0, liquidationTarget - paidDisplay);
    const restanteColorClass =
      isBecaTotal
        ? 'text-purple-600'
        : balance > 0
          ? 'text-orange-500'
          : liquidationTarget > 0 && balance <= 0
            ? 'text-green-600'
            : 'text-purple-600';
    let restanteValue = null;
    if (liquidationTarget > 0) {
      restanteValue = balance > 0 ? formatMoney(balance) : 'Liquidado';
    } else if (isBecaTotal) {
      restanteValue = (
        <>
          <span className="tabular-nums">{formatMoney(balance)}</span>
          <span className="text-[9px] font-black text-purple-600 normal-case ml-1">(No requerido)</span>
        </>
      );
    } else {
      restanteValue = 'No requerido';
    }
    const splitHostId = false ? String(person.bautizosSplitPartyHostParticipantId || '').trim() : '';
    const splitHost =
      splitHostId && Array.isArray(allParticipants)
        ? allParticipants.find((p) => String(p?.id) === splitHostId)
        : null;
    const splitHostName = String(splitHost?.name || '').trim();
    return (
      <div className="flex flex-col gap-2 w-full min-w-0 max-w-full ml-auto">
        <div className="space-y-0.5">
          <p className="text-xs font-black text-green-600 flex justify-between"><span>Pagado:</span> <span>{formatMoney(paidDisplay)}</span></p>
          <p className={`text-[10px] font-bold flex justify-between gap-1 ${restanteColorClass}`}>
            <span className="shrink-0">Restante:</span>
            <span className="text-right min-w-0">{restanteValue}</span>
          </p>
          {splitHostId ? (
            <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-snug mt-1 pt-1 border-t border-slate-100 dark:border-slate-700">
              La cuota total del grupo se liquida en el registro
              {splitHostName ? (
                <>
                  {' '}
                  <span className="font-bold text-slate-700 dark:text-slate-200">«{splitHostName}»</span>
                </>
              ) : (
                <> (id {splitHostId})</>
              )}
              ; esta ficha es un registro derivado y no tiene cobro propio.
            </p>
          ) : null}
          {manualSaldoFavor > 0.005 ? (
            <p className="text-[9px] font-bold text-sky-700 flex justify-between gap-1 border-t border-sky-100 pt-0.5 mt-0.5">
              <span className="shrink-0">Saldo a favor:</span>
              <span className="text-right">{formatMoney(manualSaldoFavor)}</span>
            </p>
          ) : null}
        </div>
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
          <div
            className="h-full bg-green-50 transition-all"
            style={{
              width: `${liquidationTarget > 0 ? Math.min(((paidDisplay / liquidationTarget) * 100), 100) : 100}%`,
            }}
          />
        </div>
      </div>
    );
  };

  const renderExpandedRosterDetailTableRow = (person, loc, opts = {}) => {
    const { ATTENDANCE_SPECIAL, AlertCircle, BAUTIZOS_AGE_FILTER_OPTIONS, BAUTIZOS_ATTENDANCE, BAUTIZOS_ATTENDANCE_FILTER_OPTIONS, BAUTIZOS_TRANSPORT_FILTER_OPTIONS, Bug, BzEvtAttendanceTypeChip, BzEvtCarDataSummaryCard, CAR_DATA_FILTER_OPTIONS, CheckCircle2, ChevronDown, ChevronUp, Church, Clock, CopyButton, CreditCard, Edit3, FileSignature, Filter, Gift, GraduationCap, Heart, History, MapPin, MessageSquare, Percent, Phone, ROSTER_QUICK_ACTIONS_ROW_PRIMARY, Receipt, RosterPersonOfInterestButton, RosterResponsivaLocalButton, RosterResponsivaWaButton, RosterWhatsAppButton, SI } = getScope();
    const { Scissors, ShieldAlert, Trash2, UserCircle, Users, ackKeys, addLog, allParticipants, base, baseCost, bautizosCompanionChipCountByRegistrant, bautizosGlobalRegistryFinanceOpts, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtCompanionsInformativeListPriceSum, bzEvtLapInfantCompanion, bzEvtLegacyCompanionVirtualRow, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, bzEvtRosterIndex, calculateAgeFromBirthDate, canArchiveRegistrationsFlag, canCancelRegistrationsFlag, canEditAbonosAndPaymentHistory, canEditRegistryDates, canMarkPersonsOfInterestFlag, canQuickActionResponsivaDigital, canQuickActionResponsivaLocal, canQuickActionWhatsApp, canSeeMoney, companionCollisionsInEvent, companionDisplayIsWaitlistPending, companions, computeNetAmountByMethod, countHostCompanionWaitlistPending } = getScope();
    const { createEmptyGlobalRegistryListFilters, currentEvent, currentPricing, currentUser, data, db, editRegistryModal, el, ev, eventId, events, fieldStack, filterAge, filterAssignment, filterBaptism, filterBzEvtAttendance, filterCarDataPending, filterFirstTimeId, filterGender, filterLiquidation, filterMaritalStatus, filterMedical, filterPaymentType, filterPendingRefund, filterResponsiva, filterRosterRole, filterScholarship, filterSwim, filterTransport, filterTravelFrom, filterTravelTo, filterWhatsAppPending, formatMoney, formatPayHistoryRowDate, formatSiNo } = getScope();
    const { generateVnpPersonId, getAutoPaymentService, getBaptismAccountingSegment, getBautizosCompanionInformativeListPrice, getBautizosListPriceBreakdown, getBautizosTitularListPrice, getGeneralRegistrationCommentsForDisplay, getLiquidationTarget, getParticipantNetPaidFromHistory, getParticipantOutstandingGross, getResponsivaCardUiState, getResponsivaSignatureImageUrl, getScholarshipCondonedAmount, getWhatsAppMessageHistoryRows, globalConfig, globalLocationFilters, globalLocationsDropdownOpen, globalRegistryFiltersDropdownOpen, globalRegistryListFilters, globalRegistrySearchFieldId, handleTogglePersonOfInterest, hasAdminRights, hasFinancialAccess, isCampa, isCompanionWaitlistVirtualParticipant, isDesayunoEvent, isFreeAttendanceType, isGeneral, isResponsivaEnabled, isSiValue, isSuperUser, key } = getScope();
    const { m, normalizeAttendanceSpecial, num, o, p, participantActivityEntriesById, participantActivityExpandedId, participantActivityLoadingId, participantExpandCache, participantIsCancelled, participantRegisteredViaPublicLink, personLikeIsPersonOfInterest, personOfInterestVnpSet, plan, prev, raw, reasons, registryConfirmBusy, resolveBautizosGlobalRegistryRowFinances, resolveCompanionWaitlistSource, resolveGlobalRegistryFinanceHost, resolveLlegaEnCarro, resolveRegisteredCost, resolveTransportSummary, responsivaLinkBusyId, responsivaLocalBusyId } = getScope();
    const { responsivaPipelineSectionTitle, root, roster, rosterInlineEditExpandedId, sede, selectedEventId, setEvents, setExpandedDupGroups, setExpandedDupPersons, setExpandedRows, setGlobalLocationFilters, setGlobalLocationsDropdownOpen, setGlobalRegistryFiltersDropdownOpen, setGlobalRegistryListFilters, setIsExporting, setParticipantActivityEntriesById, setParticipantActivityExpandedId, setParticipantActivityLoadingId, setParticipantExpandCache, setPaymentModal, setRegistryConfirmModal, setRosterInlineEditExpandedId, shouldUseBautizosLegacyPartyFinances, showToast, sortBy, summary, target, toast, total, uiDropdown, uiFilter } = getScope();
    const { uiRosterSearch, userCanDeleteAbonoNote, userCanDeletePaymentHistoryRow, userCanDeleteRegistrationComment, userCanOpenAbonoNoteEditModal, v, val, visibleLocations } = getScope();
    const asPanel = opts.asPanel === true;
    const principalDisplayIndex =
      typeof opts.displayIndex === 'number' && opts.displayIndex > 0 ? opts.displayIndex : null;
    const pid = String(person.id);
    const live = allParticipants.find((p) => String(p.id) === pid) || person;
    const cache = participantExpandCache[pid];
    if (cache?.loading && !cache?.serverDoc) {
      if (asPanel) {
        return (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-semibold text-slate-600">Cargando...</p>
          </div>
        );
      }
      return (
        <tr className="bg-indigo-50/30 border-b border-slate-100">
          <td colSpan="3" className="px-4 py-10 text-center">
            <p className="text-sm font-semibold text-slate-600">Cargando...</p>
          </td>
        </tr>
      );
    }
    if (cache?.error && !cache?.serverDoc) {
      if (asPanel) {
        return (
          <div className="px-4 py-10 text-center text-sm text-red-600 font-semibold">{cache.error}</div>
        );
      }
      return (
        <tr className="bg-indigo-50/30 border-b border-slate-100">
          <td colSpan="3" className="px-4 py-10 text-center text-sm text-red-600 font-semibold">
            {cache.error}
          </td>
        </tr>
      );
    }
    const row = { ...(cache?.serverDoc || {}), ...live };
    const payHistoryFull = row.paymentHistory || [];
    const payHistory = payHistoryFull.filter((h) => h && h.kind !== 'comment');
    const showInlineEdit =
      editRegistryModal.isOpen &&
      editRegistryModal.variant === 'inline' &&
      editRegistryModal.data &&
      String(editRegistryModal.data.id) === String(row.id) &&
      editRegistryModal.loc === loc;

    const closeExpandedInline = () => {
    const { ATTENDANCE_SPECIAL, AlertCircle, Bug, CAR_DATA_FILTER_OPTIONS, CheckCircle2, ChevronDown, ChevronUp, Church, Clock, CopyButton, CreditCard, Edit3, FileSignature, Filter, Gift, GraduationCap, Heart, History, MapPin, MessageSquare, Percent, Phone, ROSTER_QUICK_ACTIONS_ROW_PRIMARY, Receipt, RosterPersonOfInterestButton, RosterResponsivaLocalButton, RosterResponsivaWaButton, RosterWhatsAppButton, SI, Scissors, ShieldAlert, Trash2, UserCircle, Users, ackKeys, allParticipants, c, calculateAgeFromBirthDate, companionCollisionsInEvent, createEmptyGlobalRegistryListFilters } = getScope();
    const { currentUser, data, editRegistryModal, fieldStack, filterAge, filterAssignment, filterBaptism, filterBzEvtAttendance, filterCarDataPending, filterFirstTimeId, filterGender, filterLiquidation, filterMaritalStatus, filterMedical, filterPaymentType, filterPendingRefund, filterResponsiva, filterRosterRole, filterScholarship, filterSwim, filterTransport, filterTravelFrom, filterTravelTo, filterWhatsAppPending, formatPayHistoryRowDate, formatSiNo, generateVnpPersonId, getBaptismAccountingSegment, getGeneralRegistrationCommentsForDisplay, getParticipantNetPaidFromHistory, getParticipantOutstandingGross, getResponsivaCardUiState, getResponsivaSignatureImageUrl, getWhatsAppMessageHistoryRows, globalConfig, globalLocationFilters, globalLocationsDropdownOpen, globalRegistryFiltersDropdownOpen, globalRegistryListFilters } = getScope();
    const { globalRegistrySearchFieldId, isFreeAttendanceType, isSiValue, label, memberIds, normalizeAttendanceSpecial, participantActivityEntriesById, participantActivityExpandedId, participantActivityLoadingId, participantExpandCache, participantIsCancelled, participantRegisteredViaPublicLink, paymentIndex, personId, personLikeIsPersonOfInterest, personOfInterestVnpSet, reasons, registryConfirmBusy, resolveLlegaEnCarro, resolveTransportSummary, responsivaLinkBusyId, responsivaLocalBusyId, responsivaPipelineSectionTitle, rosterInlineEditExpandedId, setExpandedDupGroups, setExpandedDupPersons, setExpandedRows, setGlobalLocationFilters, setGlobalLocationsDropdownOpen, setGlobalRegistryFiltersDropdownOpen, setGlobalRegistryListFilters, setParticipantActivityEntriesById, setParticipantActivityExpandedId, setParticipantActivityLoadingId, setParticipantExpandCache, setPaymentModal, setRegistryConfirmModal } = getScope();
    const { setRosterInlineEditExpandedId, sortBy, text, titular, uiDropdown, uiFilter, uiRosterSearch, userCanDeleteAbonoNote, userCanDeletePaymentHistoryRow, userCanDeleteRegistrationComment, userCanOpenAbonoNoteEditModal } = getScope();
      resetEditRegistryModal();
      const rid = String(row.id);
      setExpandedRows((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
      setParticipantExpandCache((pc) => {
        if (!pc[rid]) return pc;
        const n = { ...pc };
        delete n[rid];
        return n;
      });
      scrollRosterRowIntoView(loc, row.id);
    };

    const legacyPartyFinance =
      false && shouldUseBautizosLegacyPartyFinances(row, currentEvent) && bautizosGlobalRegistryFinanceOpts
        ? resolveBautizosGlobalRegistryRowFinances(
            row,
            bzEvtLegacyCompanionVirtualRow(row) ? resolveGlobalRegistryFinanceHost(row) : null,
            currentEvent,
            bautizosGlobalRegistryFinanceOpts
          )
        : null;
    const liqSummary = legacyPartyFinance
      ? legacyPartyFinance.liquidationTarget
      : Number(getLiquidationTarget(row)) || 0;
    const paidSummary = legacyPartyFinance
      ? legacyPartyFinance.paidDisplay
      : getParticipantNetPaidFromHistory(row, computeNetAmountByMethod);
    const pendingSummary = participantIsCancelled(row)
      ? 0
      : Math.max(liqSummary - paidSummary, 0);
    const saldoFavorSummary =
      row.registeredCostManual === true && liqSummary > 0.005 ? Math.max(0, paidSummary - liqSummary) : 0;
    const payBoxSplitHostId = false ? String(row.bautizosSplitPartyHostParticipantId || '').trim() : '';
    const payBoxSplitHost =
      payBoxSplitHostId && Array.isArray(allParticipants)
        ? allParticipants.find((p) => String(p?.id) === payBoxSplitHostId)
        : null;
    const payBoxSplitHostName = String(payBoxSplitHost?.name || '').trim();
    const payCostsDerivedSplit = !!payBoxSplitHostId;
    const payBoxLiqDisplay = payCostsDerivedSplit ? 0 : liqSummary;
    const payBoxPaidDisplay = payCostsDerivedSplit ? 0 : paidSummary;
    const payBoxPendingDisplay = payCostsDerivedSplit ? 0 : pendingSummary;
    const payBoxSaldoFavorDisplay = payCostsDerivedSplit ? 0 : saldoFavorSummary;
    const rosterForCompanionDisplay = bzEvtRosterIndex.activeEventRoster;
    const companionWaitlistVirtual = isCompanionWaitlistVirtualParticipant(row);
    const carDataAnchorPerson = (() => {
    const { ATTENDANCE_SPECIAL, AlertCircle, Bug, CAR_DATA_FILTER_OPTIONS, CheckCircle2, ChevronDown, ChevronUp, Church, Clock, CopyButton, CreditCard, Edit3, FileSignature, Filter, Gift, GraduationCap, Heart, History, MapPin, MessageSquare, Percent, Phone, ROSTER_QUICK_ACTIONS_ROW_PRIMARY, Receipt, RosterPersonOfInterestButton, RosterResponsivaLocalButton, RosterResponsivaWaButton, RosterWhatsAppButton, SI, Scissors, ShieldAlert, Trash2, UserCircle, Users, ackKeys, allParticipants, c, calculateAgeFromBirthDate, companionCollisionsInEvent, createEmptyGlobalRegistryListFilters } = getScope();
    const { currentUser, data, editRegistryModal, fieldStack, filterAge, filterAssignment, filterBaptism, filterBzEvtAttendance, filterCarDataPending, filterFirstTimeId, filterGender, filterLiquidation, filterMaritalStatus, filterMedical, filterPaymentType, filterPendingRefund, filterResponsiva, filterRosterRole, filterScholarship, filterSwim, filterTransport, filterTravelFrom, filterTravelTo, filterWhatsAppPending, formatPayHistoryRowDate, formatSiNo, generateVnpPersonId, getBaptismAccountingSegment, getGeneralRegistrationCommentsForDisplay, getParticipantNetPaidFromHistory, getParticipantOutstandingGross, getResponsivaCardUiState, getResponsivaSignatureImageUrl, getWhatsAppMessageHistoryRows, globalConfig, globalLocationFilters, globalLocationsDropdownOpen, globalRegistryFiltersDropdownOpen, globalRegistryListFilters } = getScope();
    const { globalRegistrySearchFieldId, isFreeAttendanceType, isSiValue, label, memberIds, normalizeAttendanceSpecial, participantActivityEntriesById, participantActivityExpandedId, participantActivityLoadingId, participantExpandCache, participantIsCancelled, participantRegisteredViaPublicLink, paymentIndex, personId, personLikeIsPersonOfInterest, personOfInterestVnpSet, reasons, registryConfirmBusy, resolveLlegaEnCarro, resolveTransportSummary, responsivaLinkBusyId, responsivaLocalBusyId, responsivaPipelineSectionTitle, rosterInlineEditExpandedId, setExpandedDupGroups, setExpandedDupPersons, setExpandedRows, setGlobalLocationFilters, setGlobalLocationsDropdownOpen, setGlobalRegistryFiltersDropdownOpen, setGlobalRegistryListFilters, setParticipantActivityEntriesById, setParticipantActivityExpandedId, setParticipantActivityLoadingId, setParticipantExpandCache, setPaymentModal, setRegistryConfirmModal } = getScope();
    const { setRosterInlineEditExpandedId, sortBy, text, titular, uiDropdown, uiFilter, uiRosterSearch, userCanDeleteAbonoNote, userCanDeletePaymentHistoryRow, userCanDeleteRegistrationComment, userCanOpenAbonoNoteEditModal } = getScope();
      if (!companionWaitlistVirtual) return row;
      const hostId = String(row._companionWaitlistHostId || '').trim();
      if (!hostId) return row;
      const live = allParticipants.find((p) => String(p?.id) === hostId);
      const cached = participantExpandCache[hostId]?.serverDoc;
      if (!live && !cached) return row;
      return { ...(cached || {}), ...(live || {}) };
    })();
    const bautizosCompanionRows = false
      ? (bzEvtRosterIndex.visibleCompanionsByRegistrant.get(
          String(carDataAnchorPerson?.id || row?.id || '')
        ) || [])
      : [];
    const bautizosCompanionBaptizedRows = false
      ? bzEvtCompanionsArray(row).filter((c) => String(c?.name || '').trim() && bzEvtCompanionBaptized(c))
      : [];
    const bautizosPriceBreakdown = false ? getBautizosListPriceBreakdown(currentEvent) : null;
    const showBautizosCompanionIndividualCosts = false && !payCostsDerivedSplit;

    const fmtExpandedMoney = (n) => (canSeeMoney ? formatMoney(Number(n) || 0) : '$***');

    const carDataAnchor = bzEvtResolveCarDataAnchor(
      carDataAnchorPerson,
      rosterForCompanionDisplay,
      currentEvent
    );
    const bautizosCarDataSummaryEl =
      false && carDataAnchor.eligible && carDataAnchor.anchorPerson ? (
        <BzEvtCarDataSummaryCard
          hostPerson={carDataAnchor.anchorPerson}
          companions={carDataAnchor.companionsForCrew}
          plan={currentEvent?.transportPlanning}
          eventId={currentEvent?.id}
          roster={rosterForCompanionDisplay}
          eventLike={currentEvent}
        />
      ) : null;

    const readOnlySummaryGrid = (
      <>
        <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-0.5">
          Resumen por secciones
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-3 md:gap-4 text-[11px] leading-snug items-start">
            <div className="flex flex-col gap-3 min-w-0">
            <div className="p-2.5 rounded-lg shadow-sm border border-indigo-200 bg-indigo-50/50 dark:bg-transparent dark:border-2 dark:border-indigo-500 dark:shadow-none">
              <p className="font-bold text-indigo-900 dark:text-indigo-100 mb-1.5 uppercase tracking-wider text-[9px]">
                Detalles generales
              </p>
              {row.vnpPersonId ? (
                <p className="mb-1.5 text-[10px] font-mono text-indigo-700 dark:text-indigo-100 bg-indigo-50 dark:bg-slate-900 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-500/60 inline-flex flex-wrap items-center gap-1">
                  <span>
                    <strong>ID VNPM:</strong> {row.vnpPersonId}
                  </span>
                  <CopyButton text={row.vnpPersonId} label="ID VNPM" />
                </p>
              ) : (
                <p className="mb-1.5 text-[9px] text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-slate-900 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-500/70">
                  Sin ID VNPM (se asignará al guardar en editar).
                </p>
              )}
              <p className="mb-1.5 text-slate-600 dark:text-slate-200 flex flex-wrap items-center gap-1.5">
                <span>
                  <strong>Fecha de registro:</strong>{' '}
                  {row.registeredAt ? (
                    new Date(row.registeredAt).toLocaleString('es-MX')
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500 font-normal">Sin fecha guardada (registros antiguos)</span>
                  )}
                  <span className="text-slate-500 dark:text-slate-400 font-normal">
                    {' '}
                    · <strong className="text-slate-600 dark:text-slate-300">Registró:</strong>{' '}
                    {row.registeredBy ? (
                      <span className="font-semibold text-slate-700 dark:text-white">{row.registeredBy}</span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500 italic">sin dato</span>
                    )}
                  </span>
                </span>
                {canEditRegistryDates && (
                  <button
                    type="button"
                    onClick={() => openSuperRegistrationDateEdit(row, loc)}
                    className="text-[9px] font-black uppercase text-violet-700 dark:text-violet-200 bg-violet-50 dark:bg-slate-900 border border-violet-200 dark:border-violet-500/70 px-2 py-0.5 rounded-lg hover:bg-violet-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cambiar
                  </button>
                )}
              </p>
              {row.alias ? (
                <p className="mb-0.5 text-slate-600 dark:text-slate-200">
                  <strong>Alias:</strong> {row.alias}
                </p>
              ) : null}
              {row.preloadedFromPreviousEvents ? (
                <p className="mb-0.5 text-slate-600 dark:text-slate-200">
                  <strong>Datos precargados de:</strong>{' '}
                  {(Array.isArray(row.preloadedFromEventNames) && row.preloadedFromEventNames.length
                    ? row.preloadedFromEventNames
                    : ['evento anterior']
                  ).join(', ')}
                </p>
              ) : null}
              {!isDesayunoEvent && (
                <p className="mb-0.5 text-slate-600 dark:text-slate-200">
                  <strong>Transporte:</strong> {resolveTransportSummary(row, currentEvent?.eventType, currentEvent)}
                </p>
              )}
              {normalizeAttendanceSpecial(row) === ATTENDANCE_SPECIAL.empleado ? (
                <p className="mb-0.5 text-slate-600 dark:text-slate-200">
                  <strong>Asistencia especial:</strong> Empleado (sin cobro)
                </p>
              ) : normalizeAttendanceSpecial(row) === ATTENDANCE_SPECIAL.cortesia ? (
                <p className="mb-0.5 text-slate-600 dark:text-slate-200">
                  <strong>Asistencia especial:</strong> Cortesía (sin cobro)
                </p>
              ) : normalizeAttendanceSpecial(row) === ATTENDANCE_SPECIAL.pastor ? (
                <p className="mb-0.5 text-slate-600 dark:text-slate-200">
                  <strong>Asistencia especial:</strong> Pastor (sin cobro en lista)
                </p>
              ) : null}
              <p className="text-slate-600 dark:text-slate-200 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                <span>
                  <strong>Edad:</strong> {row.age || 'N/A'}
                </span>
                {row.birthDate && String(row.birthDate).trim() ? (
                  <span className="inline-flex items-center gap-0.5">
                    <span className="text-slate-500 dark:text-slate-400">·</span>
                    <strong>Fecha nac.:</strong>
                    <span>{formatBirthDateExcelLabel(row.birthDate)}</span>
                    <CopyButton text={formatBirthDateExcelLabel(row.birthDate)} label="fecha de nacimiento" />
                  </span>
                ) : null}
              </p>
              <p className="text-slate-600 dark:text-slate-200">
                <strong>Género:</strong> {row.gender || 'N/A'}
              </p>
              {(() => {
                const card = getResponsivaCardUiState(row, currentEvent);
                if (!card.applies) return null;
                const responsivaSigPreviewUrl =
                  card.deliveredKind === 'digital' ? getResponsivaSignatureImageUrl(row) : null;
                const statusLine = (() => {
    const { ATTENDANCE_SPECIAL, AlertCircle, Bug, CAR_DATA_FILTER_OPTIONS, CheckCircle2, ChevronDown, ChevronUp, Church, Clock, CopyButton, CreditCard, Edit3, FileSignature, Filter, Gift, GraduationCap, Heart, History, MapPin, MessageSquare, Percent, Phone, ROSTER_QUICK_ACTIONS_ROW_PRIMARY, Receipt, RosterPersonOfInterestButton, RosterResponsivaLocalButton, RosterResponsivaWaButton, RosterWhatsAppButton, SI, Scissors, ShieldAlert, Trash2, UserCircle, Users, ackKeys, allParticipants, c, calculateAgeFromBirthDate, companionCollisionsInEvent, createEmptyGlobalRegistryListFilters } = getScope();
    const { currentUser, data, editRegistryModal, fieldStack, filterAge, filterAssignment, filterBaptism, filterBzEvtAttendance, filterCarDataPending, filterFirstTimeId, filterGender, filterLiquidation, filterMaritalStatus, filterMedical, filterPaymentType, filterPendingRefund, filterResponsiva, filterRosterRole, filterScholarship, filterSwim, filterTransport, filterTravelFrom, filterTravelTo, filterWhatsAppPending, formatPayHistoryRowDate, formatSiNo, generateVnpPersonId, getBaptismAccountingSegment, getGeneralRegistrationCommentsForDisplay, getParticipantNetPaidFromHistory, getParticipantOutstandingGross, getResponsivaCardUiState, getResponsivaSignatureImageUrl, getWhatsAppMessageHistoryRows, globalConfig, globalLocationFilters, globalLocationsDropdownOpen, globalRegistryFiltersDropdownOpen, globalRegistryListFilters } = getScope();
    const { globalRegistrySearchFieldId, isFreeAttendanceType, isSiValue, label, memberIds, normalizeAttendanceSpecial, participantActivityEntriesById, participantActivityExpandedId, participantActivityLoadingId, participantExpandCache, participantIsCancelled, participantRegisteredViaPublicLink, paymentIndex, personId, personLikeIsPersonOfInterest, personOfInterestVnpSet, reasons, registryConfirmBusy, resolveLlegaEnCarro, resolveTransportSummary, responsivaLinkBusyId, responsivaLocalBusyId, responsivaPipelineSectionTitle, rosterInlineEditExpandedId, setExpandedDupGroups, setExpandedDupPersons, setExpandedRows, setGlobalLocationFilters, setGlobalLocationsDropdownOpen, setGlobalRegistryFiltersDropdownOpen, setGlobalRegistryListFilters, setParticipantActivityEntriesById, setParticipantActivityExpandedId, setParticipantActivityLoadingId, setParticipantExpandCache, setPaymentModal, setRegistryConfirmModal } = getScope();
    const { setRosterInlineEditExpandedId, sortBy, text, titular, uiDropdown, uiFilter, uiRosterSearch, userCanDeleteAbonoNote, userCanDeletePaymentHistoryRow, userCanDeleteRegistrationComment, userCanOpenAbonoNoteEditModal } = getScope();
                  if (card.delivered) {
                    if (card.deliveredKind === 'local') {
                      return (
                        <span className="font-bold text-emerald-800 dark:text-emerald-100 inline-flex items-center gap-1">
                          <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden />
                          Entregada (firma en sitio)
                        </span>
                      );
                    }
                    if (card.deliveredKind === 'digital') {
                      return (
                        <span className="font-bold text-emerald-800 dark:text-emerald-100 inline-flex items-center gap-1">
                          <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden />
                          Entregada (firma digital)
                        </span>
                      );
                    }
                    return (
                      <span className="font-bold text-emerald-800 dark:text-emerald-100 inline-flex items-center gap-1">
                        <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden />
                        Entregada
                      </span>
                    );
                  }
                  if (card.digitalEnabled) {
                    if (card.digitalPhase === 'pending_sign') {
                      return (
                        <span className="font-semibold text-amber-900 dark:text-amber-100 inline-flex items-center gap-1">
                          <Clock size={14} className="text-amber-600 dark:text-amber-400 shrink-0" aria-hidden />
                          Pendiente de firma
                        </span>
                      );
                    }
                    if (card.digitalPhase === 'needs_link') {
                      return (
                        <span className="font-semibold text-rose-900 dark:text-rose-100 inline-flex items-center gap-1">
                          <AlertCircle size={14} className="text-rose-600 dark:text-rose-400 shrink-0" aria-hidden />
                          Falta enviar enlace
                        </span>
                      );
                    }
                  }
                  return (
                    <span className="font-semibold text-slate-800 dark:text-slate-100 inline-flex items-center gap-1">
                      <AlertCircle size={14} className="text-slate-500 dark:text-slate-400 shrink-0" aria-hidden />
                      Pendiente de registrar responsiva
                    </span>
                  );
                })();
                return (
                  <div className="mt-2 mb-1 rounded-lg border border-emerald-200/80 bg-emerald-50/90 dark:bg-transparent dark:border-2 dark:border-emerald-500 px-2 py-1.5">
                    <p className="text-[9px] font-black text-emerald-900 dark:text-emerald-100 uppercase tracking-wider mb-1">
                      {responsivaPipelineSectionTitle(currentEvent)}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      {responsivaSigPreviewUrl ? (
                        <a
                          href={responsivaSigPreviewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 h-9 w-[4.25rem] rounded-md border border-emerald-300/80 bg-white overflow-hidden flex items-center justify-center shadow-sm"
                          title="Ver firma digital"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <img
                            src={responsivaSigPreviewUrl}
                            alt=""
                            className="max-h-full max-w-full object-contain object-center"
                            loading="lazy"
                          />
                        </a>
                      ) : null}
                      {statusLine}
                      {currentUser?.role !== 'Lector' && !card.delivered ? (
                        <>
                          {canQuickActionResponsivaDigital && card.digitalEnabled ? (
                            <RosterResponsivaWaButton
                              person={row}
                              loc={loc}
                              onSend={sendResponsivaSignLinkWhatsAppForPerson}
                              busyId={responsivaLinkBusyId}
                              eventSnapshot={currentEvent}
                            />
                          ) : null}
                          {canQuickActionResponsivaLocal ? (
                          <RosterResponsivaLocalButton
                            person={row}
                            onLocal={(p) => markResponsivaLocalDelivery(p, loc)}
                            busyId={responsivaLocalBusyId}
                            eventSnapshot={currentEvent}
                          />
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })()}
              {isCampa && (() => {
                const sid = String(row.spouseParticipantId || '').trim();
                const partner = sid ? allParticipants.find((x) => String(x.id) === sid) : null;
                const linkedFromOther = allParticipants.find(
                  (x) => String(x.spouseParticipantId || '').trim() === String(row.id)
                );
                const resolvedName =
                  (partner?.name || linkedFromOther?.name || '').trim() || String(row.spouseName || '').trim();
                const hasMaritalContext = isSiValue(row.isMarried) || sid || linkedFromOther;
                if (!hasMaritalContext) return null;
                return (
                  <p className="mb-0.5 text-slate-600 dark:text-slate-200">
                    <strong>Pareja:</strong>{' '}
                    {resolvedName ? (
                      <span className="font-semibold text-slate-800 dark:text-white">{resolvedName}</span>
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400 italic">Pendiente de asignar</span>
                    )}
                  </p>
                );
              })()}
            </div>
            {bautizosCarDataSummaryEl}
            </div>
            <div className="flex flex-col gap-3 min-w-0">
              <div className="p-2.5 rounded-lg shadow-sm border border-teal-200 bg-teal-50/45 dark:bg-transparent dark:border-2 dark:border-teal-500 dark:shadow-none">
                <p className="font-bold text-teal-900 dark:text-teal-100 mb-1.5 uppercase tracking-wider text-[9px]">
                  Contacto de emergencia
                </p>
                {row.emergencyContact ? (
                  <>
                    <p className="text-slate-700 dark:text-slate-100 font-semibold mb-0.5 text-[11px] inline-flex items-center gap-0.5">
                      <span>{row.emergencyContact}</span>
                      <CopyButton text={row.emergencyContact} label="contacto de emergencia" />
                    </p>
                    {row.emergencyRelationship ? (
                      <p className="text-slate-600 dark:text-slate-200 text-[10px] mb-0.5">
                        <strong>Parentesco:</strong> {row.emergencyRelationship}
                      </p>
                    ) : null}
                    <p className="flex items-center gap-1 text-slate-500 dark:text-slate-300 font-mono text-[10px] inline-flex items-center">
                      <Phone size={9} className="shrink-0" />
                      <span>{row.emergencyPhone}</span>
                      <CopyButton text={row.emergencyPhone} label="teléfono de emergencia" />
                    </p>
                    {row.emergencyContactResponsiva ? (
                      <p className="text-amber-900 dark:text-amber-200 font-semibold text-[10px] mt-0.5">
                        Nombre responsiva (distinto): {row.emergencyContactResponsiva}
                      </p>
                    ) : null}
                    {row.emergencyPhoneResponsiva ? (
                      <p className="text-amber-800 dark:text-amber-200 font-mono text-[10px] mt-0.5">
                        Tel. responsiva (distinto): {row.emergencyPhoneResponsiva}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-slate-400 dark:text-slate-500 italic">No provisto</p>
                )}
              </div>
              <div className="p-2.5 rounded-lg shadow-sm border border-emerald-200 bg-emerald-50/45 dark:bg-transparent dark:border-2 dark:border-emerald-500 dark:shadow-none">
                <p className="font-bold text-emerald-900 dark:text-emerald-100 mb-1.5 uppercase tracking-wider text-[9px]">
                  Historial de WhatsApp
                </p>
                {(() => {
                  const waHistory = getWhatsAppMessageHistoryRows(row);
                  if (!waHistory.length) {
                    return <p className="text-slate-400 dark:text-slate-500 italic">Sin envíos registrados</p>;
                  }
                  const labelByKind = {
                    finance_queue_merge: 'Avisos financieros en cola',
                    finance_generic: 'Aviso financiero general',
                    finance_custom: 'Mensaje personalizado',
                    responsiva_invite: 'Enlace de firma responsiva',
                  };
                  return (
                    <div className={fieldStack}>
                      {waHistory.map((token) => (
                        <details key={token.id || `${token.kind}-${token.createdAt || 0}`} className="text-[10px] text-slate-700 dark:text-slate-200">
                          <summary className="cursor-pointer flex items-center gap-2 flex-wrap">
                            <span>
                              {new Date(Number(token.createdAt) || Date.now()).toLocaleString('es-MX')} ·{' '}
                              {labelByKind[String(token.kind || '')] || 'Mensaje'} ·{' '}
                              {token.sentBy ? `por ${token.sentBy}` : 'usuario sin dato'}
                            </span>
                            {isSuperUser ? (
                              <button
                                type="button"
                                className="text-[9px] font-bold uppercase text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/60 px-1.5 py-0.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  deleteWhatsAppHistoryEntryForSuperUser(row, token);
                                }}
                              >
                                Eliminar
                              </button>
                            ) : null}
                          </summary>
                          <pre className="mt-1 whitespace-pre-wrap break-words text-[10px] font-sans bg-white/80 dark:bg-slate-950/80 border border-emerald-100 dark:border-emerald-600/40 rounded p-1.5">
                            {buildWhatsAppHistoryMessage(token, row)}
                          </pre>
                        </details>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="p-2.5 rounded-lg shadow-sm border border-rose-200 bg-rose-50/45 dark:bg-transparent dark:border-2 dark:border-rose-500 dark:shadow-none">
              <p className="font-bold text-rose-900 dark:text-rose-100 mb-1.5 uppercase tracking-wider text-[9px]">Datos médicos</p>
              <div className={fieldStack}>
                <p className="text-slate-600 dark:text-slate-200">
                  <strong>Tipo de sangre:</strong>{' '}
                  {row.bloodType ? (
                    <span className="font-semibold text-slate-800 dark:text-white">{row.bloodType}</span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500 italic">Sin dato</span>
                  )}
                </p>
                <p className="text-slate-600 dark:text-slate-200">
                  <strong>¿Sabe nadar?:</strong>{' '}
                  <span className="font-semibold text-slate-800 dark:text-white">{formatSiNo(row.canSwim)}</span>
                </p>
                <div className="pt-1.5 mt-1.5 border-t border-slate-100 dark:border-slate-600 space-y-1">
                  <p className="text-slate-600 dark:text-slate-200">
                    <strong>Alergias:</strong>{' '}
                    {isSiValue(row.hasAllergy) ? (
                      <span className="text-orange-600 dark:text-orange-300 font-bold">{row.allergyDetails}</span>
                    ) : (
                      <span>Ninguna</span>
                    )}
                  </p>
                  <p className="text-slate-600 dark:text-slate-200">
                    <strong>Enfermedades:</strong>{' '}
                    {isSiValue(row.hasDisease) ? (
                      <span className="text-red-600 dark:text-red-300 font-bold">{row.diseaseDetails}</span>
                    ) : (
                      <span>Ninguna</span>
                    )}
                  </p>
                  {isSiValue(row.hasDisease) && (
                    <p className="text-slate-600 dark:text-slate-200">
                      <strong>Medicamento:</strong>{' '}
                      {row.diseaseMedication ? (
                        <span className="text-red-600 dark:text-red-300 font-bold">{row.diseaseMedication}</span>
                      ) : (
                        <span>No especificado</span>
                      )}
                    </p>
                  )}
                  <p className="text-slate-600 dark:text-slate-200">
                    <strong>Discapacidades:</strong>{' '}
                    {isSiValue(row.hasDisability) ? (
                      <span className="text-purple-600 dark:text-purple-300 font-bold">{row.disabilityDetails}</span>
                    ) : (
                      <span>Ninguna</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 min-w-0">
              <div className="p-2.5 rounded-lg shadow-sm border border-emerald-200 bg-emerald-50/45 dark:bg-transparent dark:border-2 dark:border-emerald-500 dark:shadow-none">
                <p className="font-bold text-emerald-900 dark:text-emerald-100 mb-1.5 uppercase tracking-wider text-[9px]">Pago y costos</p>
                <p className="text-slate-700 dark:text-slate-200 mb-0.5">
                  <strong>Costo a liquidar:</strong> {fmtExpandedMoney(payBoxLiqDisplay)}
                </p>
                {false && canSeeMoney ? (
                  <div className="mb-2 pb-2 border-b border-emerald-100 dark:border-emerald-500/40 space-y-0.5 text-[10px] text-slate-600 dark:text-slate-300">
                    <p>
                      <strong>Costo base titular (solo bautizado):</strong>{' '}
                      {fmtExpandedMoney(
                        payCostsDerivedSplit ? 0 : getBautizosTitularListPrice(row, currentEvent)
                      )}
                    </p>
                    <p>
                      <strong>Costo base acompañantes ({bzEvtCompanionsArray(row).filter((c) => String(c?.name || '').trim()).length}):</strong>{' '}
                      {fmtExpandedMoney(
                        payCostsDerivedSplit
                          ? 0
                          : bzEvtCompanionsInformativeListPriceSum(row, currentEvent, allParticipants)
                      )}
                    </p>
                    <p className="font-semibold text-emerald-900 dark:text-emerald-100">
                      <strong>Costo base total (lista conjunta):</strong>{' '}
                      {fmtExpandedMoney(
                        payCostsDerivedSplit ? 0 : Number(resolveRegisteredCost(row, currentPricing)) || 0
                      )}
                    </p>
                  </div>
                ) : null}
                {!payCostsDerivedSplit && isSiValue(row.isScholarship) ? (
                  <p className="text-slate-700 dark:text-slate-200 mb-0.5">
                    <strong>Monto becado:</strong>{' '}
                    <span className="font-semibold text-purple-800 dark:text-purple-200">
                      {fmtExpandedMoney(getScholarshipCondonedAmount(row))}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                      {' '}
                      ({row.scholarshipType === 'partial' ? 'beca parcial' : 'beca total'})
                    </span>
                  </p>
                ) : null}
                <p className="text-slate-700 dark:text-slate-200 mb-0.5">
                  <strong>Pagado:</strong> {fmtExpandedMoney(payBoxPaidDisplay)}
                </p>
                <p
                  className={`font-semibold ${
                    payBoxPendingDisplay <= 0.005 ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'
                  }`}
                >
                  <strong>Pendiente:</strong>{' '}
                  {payCostsDerivedSplit
                    ? fmtExpandedMoney(0)
                    : payBoxPendingDisplay <= 0.005
                      ? 'Liquidado'
                      : fmtExpandedMoney(payBoxPendingDisplay)}
                </p>
                {!payCostsDerivedSplit && payBoxSaldoFavorDisplay > 0.005 ? (
                  <p className="text-sky-800 dark:text-sky-200 font-semibold text-[10px] mt-1 pt-1 border-t border-emerald-100 dark:border-emerald-500/40">
                    <strong>Saldo a favor:</strong> {fmtExpandedMoney(payBoxSaldoFavorDisplay)}
                    <span className="block font-normal text-slate-600 dark:text-slate-300 mt-0.5">
                      Costo de campamento fijado manualmente (lista): {fmtExpandedMoney(liqSummary)}
                    </span>
                  </p>
                ) : null}
                {payCostsDerivedSplit ? (
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-snug mt-2 pt-2 border-t border-emerald-100 dark:border-emerald-500/40">
                    La cuota total del grupo se liquida en el registro
                    {payBoxSplitHostName ? (
                      <>
                        {' '}
                        <span className="font-bold text-slate-700 dark:text-slate-200">
                          «{payBoxSplitHostName}»
                        </span>
                      </>
                    ) : (
                      <> (id {payBoxSplitHostId})</>
                    )}
                    ; esta ficha es un registro derivado y no tiene cobro propio.
                  </p>
                ) : null}
              </div>
              {false ? (
                <div className="p-2.5 rounded-lg shadow-sm border border-amber-200 bg-amber-50/45 dark:bg-transparent dark:border-2 dark:border-amber-500 dark:shadow-none">
                  <p className="font-bold text-amber-900 dark:text-amber-100 mb-1.5 uppercase tracking-wider text-[9px]">
                    Acompañantes
                  </p>
                  {bautizosCompanionRows.length === 0 ? (
                    <p className="text-slate-400 dark:text-slate-500 italic">Sin acompañantes con nombre capturado.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {bautizosCompanionRows.map((c, idx) => {
                        const companionName = String(c?.name || c?.linkedCompanionName || '').trim();
                        const companionRelationship = String(c?.relationship || '').trim();
                        const transportLabel = bzEvtLapInfantCompanion(c, currentEvent)
                          ? 'En brazos (≤2 años al día del evento): sin cargo de transporte ni asiento en camión'
                          : resolveLlegaEnCarro(c)
                            ? 'Carro'
                            : isSiValue(c?.wantsBautizosTransport)
                              ? 'Transporte del evento'
                              : 'Sin transporte del evento';
                        const companionPrice = showBautizosCompanionIndividualCosts
                          ? getBautizosCompanionInformativeListPrice(c, currentEvent, allParticipants)
                          : 0;
                        const linkedNoExtraCharge = !!c?.linkedNoExtraCharge || !!String(c?.linkedCompanionSourceKey || '').trim();
                        const waitlistSrc = resolveCompanionWaitlistSource(c, rosterForCompanionDisplay);
                        const companionOnWaitlist = !!waitlistSrc;
                        const waitlistHostName = String(
                          waitlistSrc?.host?.name || row?.name || ''
                        ).trim();
                        return (
                          <div
                            key={c?.id || `comp-${idx}`}
                            className={`rounded-md border bg-white/85 dark:bg-slate-900/70 px-2 py-1.5 ${
                              companionOnWaitlist
                                ? 'border-violet-200 dark:border-violet-500/60 ring-1 ring-violet-100/80 dark:ring-violet-500/30'
                                : 'border-amber-100 dark:border-amber-500/50'
                            }`}
                          >
                            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                              <p className="text-slate-800 dark:text-slate-100 font-semibold text-[11px]">
                                {idx + 1}. {companionName}
                              </p>
                              {companionOnWaitlist ? (
                                <CompanionWaitlistBadge hostName={waitlistHostName} compact />
                              ) : null}
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 text-[10px]">
                              <strong>Parentesco:</strong> {companionRelationship || 'Sin parentesco capturado'}
                            </p>
                            <p className="text-slate-600 dark:text-slate-300 text-[10px]">
                              <strong>Transporte:</strong> {transportLabel}
                            </p>
                            {linkedNoExtraCharge ? (
                              <p className="text-teal-700 dark:text-teal-200 text-[10px] font-semibold">
                                <strong>Vinculado:</strong> sin cobro extra en este registro
                              </p>
                            ) : null}
                            {companionOnWaitlist ? (
                              <p className="text-violet-800 dark:text-violet-200 text-[10px] font-semibold leading-snug">
                                En lista de espera
                                {waitlistHostName ? ` del grupo de ${waitlistHostName}` : ''}
                                ; no cuenta en cupo activo hasta promover.
                              </p>
                            ) : null}
                            {showBautizosCompanionIndividualCosts ? (
                              <p className="text-amber-800 dark:text-amber-200 text-[10px] font-semibold">
                                <strong>Costo de lista:</strong> {fmtExpandedMoney(companionPrice)}
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}
              {false && bautizosCompanionBaptizedRows.length > 0 ? (
                <div className="p-2.5 rounded-lg shadow-sm border border-sky-200 bg-sky-50/45 dark:bg-transparent dark:border-2 dark:border-sky-500 dark:shadow-none">
                  <p className="font-bold text-sky-900 dark:text-sky-100 mb-1.5 uppercase tracking-wider text-[9px]">
                    Rama bautizados desde acompañantes
                  </p>
                  <div className="space-y-1.5">
                            {bautizosCompanionBaptizedRows.map((c, idx) => {
                      const companionName = String(c?.name || '').trim() || '—';
                      const companionRelationship = String(c?.relationship || '').trim();
                              const linkedDisplayNumber =
                                principalDisplayIndex != null
                                  ? `${principalDisplayIndex}.${idx + 1}`
                                  : `${bautizosCompanionRows.length + idx + 1}`;
                      return (
                        <div
                          key={c?.id || `bapt-comp-${idx}`}
                          className="rounded-md border border-sky-100 dark:border-sky-500/50 bg-white/85 dark:bg-slate-900/70 px-2 py-1.5"
                        >
                          <p className="text-slate-800 dark:text-slate-100 font-semibold text-[11px]">
                                    {linkedDisplayNumber}. {companionName}
                          </p>
                          <p className="text-slate-600 dark:text-slate-300 text-[10px]">
                            <strong>Parentesco:</strong> {companionRelationship || 'Sin parentesco capturado'}
                          </p>
                          <p className="text-sky-800 dark:text-sky-200 text-[10px] font-semibold">
                            Se contabiliza como registro activo bautizado.
                          </p>
                          {showBautizosCompanionIndividualCosts ? (
                            <p className="text-sky-900 dark:text-sky-100 text-[10px] font-semibold mt-0.5">
                              <strong>Costo de lista:</strong>{' '}
                              {fmtExpandedMoney(
                                getBautizosCompanionInformativeListPrice(c, currentEvent, allParticipants)
                              )}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
            {isGeneral && row.customData && Object.keys(row.customData).length > 0 && (
              <div className="mt-3 p-2.5 rounded-lg shadow-sm border border-violet-200 bg-violet-50/45 dark:bg-transparent dark:border-2 dark:border-violet-500 dark:shadow-none">
                <p className="font-bold text-violet-900 dark:text-violet-100 mb-1.5 uppercase tracking-wider text-[9px]">Datos extra</p>
                <div className={fieldStack}>
                  {Object.entries(row.customData).map(([key, val], i) => (
                    <p key={i} className="text-slate-600 dark:text-slate-200">
                      <strong>{key}:</strong> {val || <span className="italic text-slate-400 dark:text-slate-500">N/A</span>}
                    </p>
                  ))}
                </div>
              </div>
            )}
      </>
    );

    const detailBody = (
      <div className={`space-y-3${asPanel ? ' px-3 sm:px-5 py-3.5' : ''}`}>
            {currentUser?.role === 'Lector' && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-indigo-200 dark:border-2 dark:border-indigo-500 bg-white dark:bg-transparent p-3 shadow-sm dark:shadow-none">
                <div className="min-w-0">
                  <p className="text-[9px] font-black text-indigo-800 dark:text-indigo-100 uppercase tracking-widest">Detalle del registro</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                    Solo lectura. La edición requiere una cuenta con permiso.
                  </p>
                </div>
              </div>
            )}
            {readOnlySummaryGrid}

          <div className="mt-3 bg-white dark:bg-slate-950 rounded-lg shadow-sm border border-slate-100 dark:border-2 dark:border-emerald-500/45 overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-600 flex items-center justify-between bg-white dark:bg-slate-950">
              <p className="font-bold text-indigo-900 dark:text-emerald-200 uppercase tracking-wider text-[9px] flex items-center gap-1.5">
                <Receipt size={11} className="text-green-500 dark:text-emerald-400 shrink-0" /> Historial de pagos
              </p>
              <span className="text-[9px] font-bold bg-green-50 dark:bg-emerald-950 text-green-600 dark:text-emerald-300 px-1.5 py-0.5 rounded-full border border-green-100 dark:border-emerald-500/60">
                {payHistory.length} {payHistory.length === 1 ? 'movimiento' : 'movimientos'}
              </span>
            </div>
            {payHistory.length === 0 ? (
              <div className="px-3 py-4 text-center">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">Sin movimientos registrados.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-slate-700">
                {payHistory.map((pay, idx) => {
                  const fullIdx = payHistoryFull.findIndex((h) => h && h.id === pay.id);
                  return (
                  <div
                    key={pay.id ?? `pay-${idx}`}
                    className="px-3 py-2 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-900/90 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-500 text-[8px] font-black flex items-center justify-center flex-shrink-0">{idx + 1}</span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-mono text-slate-500">{formatPayHistoryRowDate(pay)}</p>
                        {pay.note ? (
                          <p
                            className="text-[10px] text-slate-700 dark:text-slate-200 font-medium leading-snug truncate max-w-[min(100%,14rem)]"
                            title={pay.note}
                          >
                            {pay.note}
                          </p>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 mt-0.5">
                          <UserCircle size={9} className="text-slate-400 shrink-0" />
                          <p className="text-[9px] text-slate-400 font-semibold shrink-0">{pay.registeredBy}</p>
                          {pay.isManualAdjustment && <span className="text-[9px] bg-amber-50 text-amber-600 border border-amber-100 px-1.5 py-0.5 rounded font-bold uppercase">Ajuste Admin</span>}
                          {(() => {
                            const inferredMethod = pay.method || (row.paymentMethod === 'Tarjeta' ? 'Tarjeta' : 'Efectivo');
                            const inferredService = pay.service || (SERVICE_OPTIONS.includes(row.paymentService) ? row.paymentService : 'Primero');
                            return (
                              <>
                                <span className={`text-[9px] border px-2 py-0.5 rounded font-black uppercase ${inferredMethod === 'Tarjeta' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                  {inferredMethod}
                                </span>
                                <span className="text-[9px] bg-slate-50 text-slate-600 border border-slate-100 px-2 py-0.5 rounded font-bold uppercase">
                                  Serv: {inferredService}
                                </span>
                                {inferredMethod === 'Tarjeta' && pay.reference && (
                                  <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded font-bold uppercase">
                                    Ref: {String(pay.reference).slice(0, 10)}
                                  </span>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-0.5 shrink-0">
                      <p
                        className={`text-xs font-black ${
                          pay.amount < 0 ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-emerald-400'
                        }`}
                      >
                        {pay.amount < 0 ? '-' : '+'}
                        {fmtExpandedMoney(Math.abs(pay.amount))}
                      </p>
                      {fullIdx >= 0 && userCanOpenAbonoNoteEditModal(pay, { currentUser, canEditAbonosAndPaymentHistory }) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openAbonoNoteEditModal(row, loc, fullIdx);
                          }}
                          className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 px-2 py-0.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                          Nota
                        </button>
                      )}
                      {fullIdx >= 0 && pay.note && userCanDeleteAbonoNote(pay, { currentUser, isSuperUser, hasAdminRights }) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void clearAbonoNoteForPaymentRow(row, loc, pay, fullIdx);
                          }}
                          className="text-[9px] font-black uppercase text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-500/50 px-2 py-0.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/50"
                        >
                          Quitar nota
                        </button>
                      )}
                      {canEditRegistryDates && fullIdx >= 0 && (
                        <button
                          type="button"
                          onClick={() => openSuperPaymentDateEdit(row, loc, fullIdx)}
                          className="text-[9px] font-black dark:font-normal uppercase text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-lg hover:bg-violet-100 transition-colors"
                        >
                          Cambiar fecha
                        </button>
                      )}
                      {canEditAbonosAndPaymentHistory && fullIdx >= 0 && (
                        <button
                          type="button"
                          onClick={() => openPaymentMethodEditModal(row, loc, fullIdx)}
                          className="text-[9px] font-black dark:font-normal uppercase text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg hover:bg-indigo-100 transition-colors"
                        >
                          Cambiar tipo
                        </button>
                      )}
                      {fullIdx >= 0 && userCanDeletePaymentHistoryRow(currentUser, pay, { isSuperUser }) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeletePaymentHistoryRowConfirm(row, loc, fullIdx);
                          }}
                          className="shrink-0 p-1 rounded-md text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-transparent hover:border-rose-200 dark:hover:border-rose-500/50 transition-colors"
                          title="Eliminar abono"
                        >
                          <Trash2 size={12} className="block" />
                        </button>
                      )}
                    </div>
                  </div>
                  );
                })}
                <div className="px-3 py-2 bg-green-50 dark:bg-emerald-950/80 border-t border-green-100 dark:border-emerald-600/50 flex items-center justify-between">
                  <span className="text-[9px] font-black text-green-800 dark:text-emerald-200 uppercase tracking-wider">Total acumulado</span>
                  <span className="text-xs font-black text-green-700 dark:text-emerald-300">{fmtExpandedMoney(row.paid || 0)}</span>
                </div>
              </div>
            )}
          </div>
            {currentUser?.role !== 'Lector' && (
              <div className="mt-1 space-y-2">
                <div className="rounded-lg overflow-hidden border border-indigo-700 dark:border-2 dark:border-indigo-500 shadow-sm bg-white dark:bg-slate-950/40">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-left text-[11px] font-bold transition-all shadow-sm active:scale-[0.98] bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600"
                    onClick={() => {
                      const id = String(row.id);
                      if (rosterInlineEditExpandedId === id) {
                        setRosterInlineEditExpandedId(null);
                        return;
                      }
                      setRosterInlineEditExpandedId(id);
                      const alreadyOpen =
                        editRegistryModal.isOpen &&
                        editRegistryModal.variant === 'inline' &&
                        editRegistryModal.data &&
                        String(editRegistryModal.data.id) === id &&
                        editRegistryModal.loc === loc;
                      if (!alreadyOpen) {
                        openEditRegistryModalForPerson(row, loc, 'inline');
                      }
                    }}
                  >
                    <span className="flex items-center gap-1.5">
                      <Edit3 size={14} className="inline shrink-0" />
                      Editar registro
                    </span>
                    {rosterInlineEditExpandedId === String(row.id) ? (
                      <ChevronUp size={18} className="text-white/90 shrink-0" />
                    ) : (
                      <ChevronDown size={18} className="text-white/90 shrink-0" />
                    )}
                  </button>
                  {rosterInlineEditExpandedId === String(row.id) && showInlineEdit && (
                    <div className="border-t border-indigo-100 dark:border-indigo-500/40 bg-white dark:bg-slate-950 p-3">
                      <div className="mb-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 flex flex-wrap items-center gap-2 text-[10px] text-slate-600 dark:text-slate-300">
                        <span>
                          <strong>Fecha de registro:</strong>{' '}
                          {row.registeredAt ? new Date(row.registeredAt).toLocaleString('es-MX') : (
                            <span className="text-slate-400 font-normal">Sin fecha guardada (registros antiguos)</span>
                          )}
                          <span className="text-slate-500 font-normal">
                            {' '}
                            · <strong className="text-slate-600">Registró:</strong>{' '}
                            {row.registeredBy ? (
                              <span className="font-semibold text-slate-700">{row.registeredBy}</span>
                            ) : (
                              <span className="text-slate-400 italic">sin dato</span>
                            )}
                          </span>
                        </span>
                        {canEditRegistryDates && (
                          <button
                            type="button"
                            onClick={() => openSuperRegistrationDateEdit(row, loc)}
                            className="text-[9px] font-black uppercase text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-lg hover:bg-violet-100 transition-colors"
                          >
                            Cambiar
                          </button>
                        )}
                      </div>
                      {row.preloadedFromPreviousEvents ? (
                        <p className="mb-2 text-[10px] text-indigo-700 dark:text-indigo-200 bg-indigo-50 dark:bg-slate-900 border border-indigo-100 dark:border-indigo-500/60 rounded-lg px-2.5 py-1.5">
                          <strong>Datos precargados de:</strong>{' '}
                          {(Array.isArray(row.preloadedFromEventNames) && row.preloadedFromEventNames.length
                            ? row.preloadedFromEventNames
                            : ['evento anterior']
                          ).join(', ')}
                        </p>
                      ) : null}
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-2 leading-snug">
                        Mismos campos que «Editar participante». Guardar o cancelar cierra el panel.
                      </p>
                      <form onSubmit={handleUpdateEntry} className="space-y-3 pr-0.5">
                        <EditRegistryModalFormFields onCancel={closeExpandedInline} compact />
                      </form>
                    </div>
                  )}
                  {rosterInlineEditExpandedId === String(row.id) && !showInlineEdit && (
                    <div className="border-t border-indigo-100 dark:border-indigo-500/40 px-3 py-4 text-center bg-slate-50/80 dark:bg-slate-900">
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Cargando...</p>
                    </div>
                  )}
                </div>
                {hasAdminRights && (
                  <div className="rounded-lg overflow-hidden border border-slate-300 dark:border-2 dark:border-slate-600 shadow-sm bg-white dark:bg-slate-950/40">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-left text-[11px] font-bold transition-all shadow-sm active:scale-[0.98] bg-slate-700 dark:bg-slate-600 text-white hover:bg-slate-800 dark:hover:bg-slate-500"
                      onClick={async () => {
                        const rid = String(row.id);
                        if (participantActivityExpandedId === rid) {
                          setParticipantActivityExpandedId(null);
                          return;
                        }
                        setParticipantActivityExpandedId(rid);
                        setParticipantActivityLoadingId(rid);
                        try {
                          const rows = await fetchParticipantActivityEntries(rid);
                          setParticipantActivityEntriesById((m) => ({ ...m, [rid]: rows }));
                        } catch (e) {
                          console.error(e);
                          setParticipantActivityEntriesById((m) => ({ ...m, [rid]: [] }));
                        } finally {
                          setParticipantActivityLoadingId(null);
                        }
                      }}
                    >
                      <span className="flex items-center gap-1.5 min-w-0">
                        <History size={14} className="inline shrink-0" aria-hidden />
                        Registro de Actividades
                      </span>
                      {participantActivityExpandedId === String(row.id) ? (
                        <ChevronUp size={18} className="text-white/90 shrink-0" />
                      ) : (
                        <ChevronDown size={18} className="text-white/90 shrink-0" />
                      )}
                    </button>
                    {participantActivityExpandedId === String(row.id) && (
                      <div className="max-h-36 overflow-y-auto px-2.5 py-2 space-y-1 border-t border-slate-200/80 dark:border-slate-600/60 bg-slate-50/50 dark:bg-slate-900/50">
                        {participantActivityLoadingId === String(row.id) ? (
                          <p className="text-[9px] text-slate-500 text-center py-2">Cargando…</p>
                        ) : (participantActivityEntriesById[String(row.id)] || []).length === 0 ? (
                          <p className="text-[9px] text-slate-500 text-center py-2 leading-snug">
                            Sin movimientos registrados aún.
                          </p>
                        ) : (
                          (participantActivityEntriesById[String(row.id)] || []).map((ev) => (
                            <div
                              key={ev.id}
                              className="text-[9px] leading-snug border-b border-slate-100 dark:border-slate-700/70 pb-1 last:border-0 last:pb-0"
                            >
                              <p className="text-[8px] text-slate-400 dark:text-slate-500 tabular-nums">
                                {new Date(Number(ev.at) || 0).toLocaleString('es-MX')} ·{' '}
                                <span className="font-semibold text-slate-600 dark:text-slate-300">
                                  {ev.actorUsername || '—'}
                                </span>
                              </p>
                              <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words">
                                {ev.message}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
      </div>
    );

    if (asPanel) return detailBody;

    return (
      <tr className="bg-indigo-50/30 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
        <td colSpan="3" className="px-3 sm:px-5 py-3.5">
          {detailBody}
        </td>
      </tr>
    );
  };

  const renderRosterQuickActionsPanel = (person, loc, { isExpanded, isBecado, liquidationTarget }) => {
    const { ATTENDANCE_SPECIAL, AlertCircle, BAUTIZOS_AGE_FILTER_OPTIONS, BAUTIZOS_ATTENDANCE, BAUTIZOS_ATTENDANCE_FILTER_OPTIONS, BAUTIZOS_TRANSPORT_FILTER_OPTIONS, Bug, BzEvtAttendanceTypeChip, BzEvtCarDataSummaryCard, CAR_DATA_FILTER_OPTIONS, CheckCircle2, ChevronDown, ChevronUp, Church, Clock, CopyButton, CreditCard, Edit3, FileSignature, Filter, Gift, GraduationCap, Heart, History, MapPin, MessageSquare, Percent, Phone, ROSTER_QUICK_ACTIONS_ROW_PRIMARY, Receipt, RosterPersonOfInterestButton, RosterResponsivaLocalButton, RosterResponsivaWaButton, RosterWhatsAppButton, SI } = getScope();
    const { Scissors, ShieldAlert, Trash2, UserCircle, Users, ackKeys, addLog, allParticipants, base, baseCost, bautizosCompanionChipCountByRegistrant, bautizosGlobalRegistryFinanceOpts, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtCompanionsInformativeListPriceSum, bzEvtLapInfantCompanion, bzEvtLegacyCompanionVirtualRow, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, bzEvtRosterIndex, calculateAgeFromBirthDate, canArchiveRegistrationsFlag, canCancelRegistrationsFlag, canEditAbonosAndPaymentHistory, canEditRegistryDates, canMarkPersonsOfInterestFlag, canQuickActionResponsivaDigital, canQuickActionResponsivaLocal, canQuickActionWhatsApp, canSeeMoney, companionCollisionsInEvent, companionDisplayIsWaitlistPending, companions, computeNetAmountByMethod, countHostCompanionWaitlistPending } = getScope();
    const { createEmptyGlobalRegistryListFilters, currentEvent, currentPricing, currentUser, data, db, editRegistryModal, el, ev, eventId, events, fieldStack, filterAge, filterAssignment, filterBaptism, filterBzEvtAttendance, filterCarDataPending, filterFirstTimeId, filterGender, filterLiquidation, filterMaritalStatus, filterMedical, filterPaymentType, filterPendingRefund, filterResponsiva, filterRosterRole, filterScholarship, filterSwim, filterTransport, filterTravelFrom, filterTravelTo, filterWhatsAppPending, formatMoney, formatPayHistoryRowDate, formatSiNo } = getScope();
    const { generateVnpPersonId, getAutoPaymentService, getBaptismAccountingSegment, getBautizosCompanionInformativeListPrice, getBautizosListPriceBreakdown, getBautizosTitularListPrice, getGeneralRegistrationCommentsForDisplay, getLiquidationTarget, getParticipantNetPaidFromHistory, getParticipantOutstandingGross, getResponsivaCardUiState, getResponsivaSignatureImageUrl, getScholarshipCondonedAmount, getWhatsAppMessageHistoryRows, globalConfig, globalLocationFilters, globalLocationsDropdownOpen, globalRegistryFiltersDropdownOpen, globalRegistryListFilters, globalRegistrySearchFieldId, handleTogglePersonOfInterest, hasAdminRights, hasFinancialAccess, isCampa, isCompanionWaitlistVirtualParticipant, isDesayunoEvent, isFreeAttendanceType, isGeneral, isResponsivaEnabled, isSiValue, isSuperUser, key } = getScope();
    const { m, normalizeAttendanceSpecial, num, o, p, participantActivityEntriesById, participantActivityExpandedId, participantActivityLoadingId, participantExpandCache, participantIsCancelled, participantRegisteredViaPublicLink, personLikeIsPersonOfInterest, personOfInterestVnpSet, plan, prev, raw, reasons, registryConfirmBusy, resolveBautizosGlobalRegistryRowFinances, resolveCompanionWaitlistSource, resolveGlobalRegistryFinanceHost, resolveLlegaEnCarro, resolveRegisteredCost, resolveTransportSummary, responsivaLinkBusyId, responsivaLocalBusyId } = getScope();
    const { responsivaPipelineSectionTitle, root, roster, rosterInlineEditExpandedId, sede, selectedEventId, setEvents, setExpandedDupGroups, setExpandedDupPersons, setExpandedRows, setGlobalLocationFilters, setGlobalLocationsDropdownOpen, setGlobalRegistryFiltersDropdownOpen, setGlobalRegistryListFilters, setIsExporting, setParticipantActivityEntriesById, setParticipantActivityExpandedId, setParticipantActivityLoadingId, setParticipantExpandCache, setPaymentModal, setRegistryConfirmModal, setRosterInlineEditExpandedId, shouldUseBautizosLegacyPartyFinances, showToast, sortBy, summary, target, toast, total, uiDropdown, uiFilter } = getScope();
    const { uiRosterSearch, userCanDeleteAbonoNote, userCanDeletePaymentHistoryRow, userCanDeleteRegistrationComment, userCanOpenAbonoNoteEditModal, v, val, visibleLocations } = getScope();
    const qaBtnSimple = (extra) => `${ROSTER_QUICK_ACTION_BTN_BASE} ${ROSTER_QUICK_ACTION_BTN_MOBILE} ${extra}`;
    const isWaitlistRow =
      (person?.status || 'active') === 'waitlist' || isCompanionWaitlistVirtualParticipant(person);
    return (
      <div className="flex flex-col gap-1.5 w-full min-w-0">
        <div className={ROSTER_QUICK_ACTIONS_ROW_PRIMARY}>
          {currentUser?.role !== 'Lector' && !participantIsCancelled(person) && (
            <button
              type="button"
              onClick={(e) => {
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
              }}
              className={qaBtnSimple('border border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700')}
              title="Abonar pago"
              aria-label="Abonar pago"
            >
              <CreditCard {...ROSTER_QUICK_ACTION_ICON_PROPS} />
              <span className="hidden sm:inline">Abonar</span>
            </button>
          )}
          {currentUser?.role !== 'Lector' && !participantIsCancelled(person) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openRegistrationCommentModal(person, loc);
              }}
              className={qaBtnSimple(
                'border border-slate-500 bg-slate-600 text-white hover:bg-slate-700 dark:border-slate-500 dark:bg-slate-700 dark:hover:bg-slate-600'
              )}
              title="Comentario del registro"
              aria-label="Comentario"
            >
              <MessageSquare {...ROSTER_QUICK_ACTION_ICON_PROPS} />
              <span className="hidden sm:inline">Comentario</span>
            </button>
          )}
          {currentUser?.role !== 'Lector' && !participantIsCancelled(person) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openWaitlistRowEdit(person, loc);
              }}
              className={qaBtnSimple('border border-indigo-700 bg-indigo-600 text-white hover:bg-indigo-700')}
              title={isWaitlistRow ? 'Editar registro en lista de espera' : 'Editar registro'}
              aria-label="Editar"
            >
              <Edit3 {...ROSTER_QUICK_ACTION_ICON_PROPS} />
              <span className="hidden sm:inline">Editar</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => toggleRosterRowExpand(person, loc)}
            className={qaBtnSimple(
              `border text-white ${isExpanded ? 'border-violet-800 bg-violet-700 hover:bg-violet-800' : 'border-violet-600 bg-violet-600 hover:bg-violet-700'}`
            )}
            title="Ver o ocultar detalles"
            aria-label="Detalles"
          >
            {isExpanded ? <ChevronUp {...ROSTER_QUICK_ACTION_ICON_PROPS} /> : <ChevronDown {...ROSTER_QUICK_ACTION_ICON_PROPS} />}
            <span className="hidden sm:inline">Detalles</span>
          </button>
        </div>
        {currentUser?.role !== 'Lector' &&
          (canQuickActionResponsivaDigital || canQuickActionResponsivaLocal || canQuickActionWhatsApp) && (
            <div className="flex flex-wrap items-center justify-start gap-1.5">
              {canQuickActionResponsivaDigital ? (
                <RosterResponsivaWaButton
                  person={person}
                  loc={loc}
                  onSend={sendResponsivaSignLinkWhatsAppForPerson}
                  busyId={responsivaLinkBusyId}
                  eventSnapshot={currentEvent}
                />
              ) : null}
              {canQuickActionResponsivaLocal ? (
                <RosterResponsivaLocalButton
                  person={person}
                  onLocal={(p) => markResponsivaLocalDelivery(p, loc)}
                  busyId={responsivaLocalBusyId}
                  eventSnapshot={currentEvent}
                />
              ) : null}
              {canQuickActionWhatsApp ? (
                <RosterWhatsAppButton person={person} loc={loc} onOpen={openWhatsAppModal} eventSnapshot={currentEvent} roster={allParticipants} />
              ) : null}
            </div>
          )}
        {currentUser?.role !== 'Lector' && (
          <div className="flex flex-wrap items-center justify-start gap-1.5">
            {isWaitlistRow ? (
              <button
                type="button"
                onClick={() => promoteFromWaitlistSection(loc, person)}
                className={qaBtnSimple('border border-cyan-700 bg-cyan-600 text-white hover:bg-cyan-700')}
                title="Promover a inscritos"
              >
                <CheckCircle2 {...ROSTER_QUICK_ACTION_ICON_PROPS} />
                <span className="hidden sm:inline">Promover</span>
              </button>
            ) : !participantIsCancelled(person) ? (
              <button
                type="button"
                onClick={() => openMoveToWaitlistConfirm(loc, person.id)}
                className={qaBtnSimple('border border-sky-700 bg-sky-600 text-white hover:bg-sky-700')}
                title="Mover a lista de espera"
              >
                <GraduationCap {...ROSTER_QUICK_ACTION_ICON_PROPS} />
                <span className="hidden sm:inline">A espera</span>
              </button>
            ) : null}
            {canMarkPersonsOfInterestFlag ? (
              <RosterPersonOfInterestButton
                person={person}
                isMarked={personLikeIsPersonOfInterest(person, personOfInterestVnpSet, { generateVnpPersonId })}
                onToggle={handleTogglePersonOfInterest}
              />
            ) : null}
            {!isCompanionWaitlistVirtualParticipant(person) && !participantIsCancelled(person) && canCancelRegistrationsFlag ? (
              <button
                type="button"
                onClick={() => cancelEntry(loc, person.id)}
                className={qaBtnSimple('border border-amber-600 bg-amber-500 text-white hover:bg-amber-600')}
                title="Dar de baja"
              >
                <Scissors {...ROSTER_QUICK_ACTION_ICON_PROPS} />
                <span className="hidden sm:inline">Baja</span>
              </button>
            ) : participantIsCancelled(person) && canCancelRegistrationsFlag ? (
              <button
                type="button"
                onClick={() => reactivateEntry(loc, person.id)}
                className={qaBtnSimple('border border-teal-700 bg-teal-600 text-white hover:bg-teal-700')}
                title="Reactivar registro"
              >
                <CheckCircle2 {...ROSTER_QUICK_ACTION_ICON_PROPS} />
                <span className="hidden sm:inline">Reactivar</span>
              </button>
            ) : null}
            {!isCompanionWaitlistVirtualParticipant(person) && canArchiveRegistrationsFlag ? (
              <button
                type="button"
                onClick={() => removeEntry(loc, person.id)}
                className={qaBtnSimple('border border-rose-700 bg-rose-600 text-white hover:bg-rose-700')}
                title="Archivar registro"
              >
                <Trash2 {...ROSTER_QUICK_ACTION_ICON_PROPS} />
                <span className="hidden sm:inline">Archivar</span>
              </button>
            ) : null}
          </div>
        )}
      </div>
    );
  };

  const renderRosterPersonMobileCard = (person, loc, opts = {}) => {
    const { ATTENDANCE_SPECIAL, AlertCircle, BAUTIZOS_AGE_FILTER_OPTIONS, BAUTIZOS_ATTENDANCE, BAUTIZOS_ATTENDANCE_FILTER_OPTIONS, BAUTIZOS_TRANSPORT_FILTER_OPTIONS, Bug, BzEvtAttendanceTypeChip, BzEvtCarDataSummaryCard, CAR_DATA_FILTER_OPTIONS, CheckCircle2, ChevronDown, ChevronUp, Church, Clock, CopyButton, CreditCard, Edit3, FileSignature, Filter, Gift, GraduationCap, Heart, History, MapPin, MessageSquare, Percent, Phone, ROSTER_QUICK_ACTIONS_ROW_PRIMARY, Receipt, RosterPersonOfInterestButton, RosterResponsivaLocalButton, RosterResponsivaWaButton, RosterWhatsAppButton, SI } = getScope();
    const { Scissors, ShieldAlert, Trash2, UserCircle, Users, ackKeys, addLog, allParticipants, base, baseCost, bautizosCompanionChipCountByRegistrant, bautizosGlobalRegistryFinanceOpts, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtCompanionsInformativeListPriceSum, bzEvtLapInfantCompanion, bzEvtLegacyCompanionVirtualRow, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, bzEvtRosterIndex, calculateAgeFromBirthDate, canArchiveRegistrationsFlag, canCancelRegistrationsFlag, canEditAbonosAndPaymentHistory, canEditRegistryDates, canMarkPersonsOfInterestFlag, canQuickActionResponsivaDigital, canQuickActionResponsivaLocal, canQuickActionWhatsApp, canSeeMoney, companionCollisionsInEvent, companionDisplayIsWaitlistPending, companions, computeNetAmountByMethod, countHostCompanionWaitlistPending } = getScope();
    const { createEmptyGlobalRegistryListFilters, currentEvent, currentPricing, currentUser, data, db, editRegistryModal, el, ev, eventId, events, fieldStack, filterAge, filterAssignment, filterBaptism, filterBzEvtAttendance, filterCarDataPending, filterFirstTimeId, filterGender, filterLiquidation, filterMaritalStatus, filterMedical, filterPaymentType, filterPendingRefund, filterResponsiva, filterRosterRole, filterScholarship, filterSwim, filterTransport, filterTravelFrom, filterTravelTo, filterWhatsAppPending, formatMoney, formatPayHistoryRowDate, formatSiNo } = getScope();
    const { generateVnpPersonId, getAutoPaymentService, getBaptismAccountingSegment, getBautizosCompanionInformativeListPrice, getBautizosListPriceBreakdown, getBautizosTitularListPrice, getGeneralRegistrationCommentsForDisplay, getLiquidationTarget, getParticipantNetPaidFromHistory, getParticipantOutstandingGross, getResponsivaCardUiState, getResponsivaSignatureImageUrl, getScholarshipCondonedAmount, getWhatsAppMessageHistoryRows, globalConfig, globalLocationFilters, globalLocationsDropdownOpen, globalRegistryFiltersDropdownOpen, globalRegistryListFilters, globalRegistrySearchFieldId, handleTogglePersonOfInterest, hasAdminRights, hasFinancialAccess, isCampa, isCompanionWaitlistVirtualParticipant, isDesayunoEvent, isFreeAttendanceType, isGeneral, isResponsivaEnabled, isSiValue, isSuperUser, key } = getScope();
    const { m, normalizeAttendanceSpecial, num, o, p, participantActivityEntriesById, participantActivityExpandedId, participantActivityLoadingId, participantExpandCache, participantIsCancelled, participantRegisteredViaPublicLink, personLikeIsPersonOfInterest, personOfInterestVnpSet, plan, prev, raw, reasons, registryConfirmBusy, resolveBautizosGlobalRegistryRowFinances, resolveCompanionWaitlistSource, resolveGlobalRegistryFinanceHost, resolveLlegaEnCarro, resolveRegisteredCost, resolveTransportSummary, responsivaLinkBusyId, responsivaLocalBusyId } = getScope();
    const { responsivaPipelineSectionTitle, root, roster, rosterInlineEditExpandedId, sede, selectedEventId, setEvents, setExpandedDupGroups, setExpandedDupPersons, setExpandedRows, setGlobalLocationFilters, setGlobalLocationsDropdownOpen, setGlobalRegistryFiltersDropdownOpen, setGlobalRegistryListFilters, setIsExporting, setParticipantActivityEntriesById, setParticipantActivityExpandedId, setParticipantActivityLoadingId, setParticipantExpandCache, setPaymentModal, setRegistryConfirmModal, setRosterInlineEditExpandedId, shouldUseBautizosLegacyPartyFinances, showToast, sortBy, summary, target, toast, total, uiDropdown, uiFilter } = getScope();
    const { uiRosterSearch, userCanDeleteAbonoNote, userCanDeletePaymentHistoryRow, userCanDeleteRegistrationComment, userCanOpenAbonoNoteEditModal, v, val, visibleLocations } = getScope();
    const { isExpanded, showActions = true, showSede = false, sedeLabel, branchMeta = null, financesOverride = null, participantColumnOpts = null, disableExpand = false, } = opts;
    const isBecado = isCampa && isSiValue(person.isScholarship);
    const liquidationTarget = getLiquidationTarget(person);
    return (
      <RosterParticipantMobileCard
        key={opts.key || person.id}
        personId={person.id}
        anchorId={rosterRowAnchorId(loc, person.id)}
        isExpanded={isExpanded}
        onToggleExpand={
          disableExpand ? undefined : () => toggleRosterRowExpand(person, loc)
        }
        participantContent={renderRegistrationParticipantColumn(person, {
          displayIndex,
          rosterLocation: loc,
          isSubRegistration: !!opts.isSubRegistration,
          ...(participantColumnOpts || {}),
        })}
        financesContent={financesOverride ?? renderRegistrationFinancesColumn(person)}
        actionsContent={
          showActions
            ? renderRosterQuickActionsPanel(person, loc, { isExpanded, isBecado, liquidationTarget })
            : null
        }
        expandedContent={
          isExpanded && !disableExpand
            ? renderExpandedRosterDetailTableRow(person, loc, { displayIndex, asPanel: true })
            : null
        }
        showSede={showSede}
        sedeLabel={sedeLabel ?? person.location}
        branchMeta={branchMeta}
      />
    );
  };

  const toggleDupGroup = (key) => {
    const { ATTENDANCE_SPECIAL, AlertCircle, BAUTIZOS_AGE_FILTER_OPTIONS, BAUTIZOS_ATTENDANCE, BAUTIZOS_ATTENDANCE_FILTER_OPTIONS, BAUTIZOS_TRANSPORT_FILTER_OPTIONS, Bug, BzEvtAttendanceTypeChip, BzEvtCarDataSummaryCard, CAR_DATA_FILTER_OPTIONS, CheckCircle2, ChevronDown, ChevronUp, Church, Clock, CopyButton, CreditCard, Edit3, FileSignature, Filter, Gift, GraduationCap, Heart, History, MapPin, MessageSquare, Percent, Phone, ROSTER_QUICK_ACTIONS_ROW_PRIMARY, Receipt, RosterPersonOfInterestButton, RosterResponsivaLocalButton, RosterResponsivaWaButton, RosterWhatsAppButton, SI } = getScope();
    const { Scissors, ShieldAlert, Trash2, UserCircle, Users, ackKeys, addLog, allParticipants, base, baseCost, bautizosCompanionChipCountByRegistrant, bautizosGlobalRegistryFinanceOpts, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtCompanionsInformativeListPriceSum, bzEvtLapInfantCompanion, bzEvtLegacyCompanionVirtualRow, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, bzEvtRosterIndex, calculateAgeFromBirthDate, canArchiveRegistrationsFlag, canCancelRegistrationsFlag, canEditAbonosAndPaymentHistory, canEditRegistryDates, canMarkPersonsOfInterestFlag, canQuickActionResponsivaDigital, canQuickActionResponsivaLocal, canQuickActionWhatsApp, canSeeMoney, companionCollisionsInEvent, companionDisplayIsWaitlistPending, companions, computeNetAmountByMethod, countHostCompanionWaitlistPending } = getScope();
    const { createEmptyGlobalRegistryListFilters, currentEvent, currentPricing, currentUser, data, db, editRegistryModal, el, ev, eventId, events, fieldStack, filterAge, filterAssignment, filterBaptism, filterBzEvtAttendance, filterCarDataPending, filterFirstTimeId, filterGender, filterLiquidation, filterMaritalStatus, filterMedical, filterPaymentType, filterPendingRefund, filterResponsiva, filterRosterRole, filterScholarship, filterSwim, filterTransport, filterTravelFrom, filterTravelTo, filterWhatsAppPending, formatMoney, formatPayHistoryRowDate, formatSiNo } = getScope();
    const { generateVnpPersonId, getAutoPaymentService, getBaptismAccountingSegment, getBautizosCompanionInformativeListPrice, getBautizosListPriceBreakdown, getBautizosTitularListPrice, getGeneralRegistrationCommentsForDisplay, getLiquidationTarget, getParticipantNetPaidFromHistory, getParticipantOutstandingGross, getResponsivaCardUiState, getResponsivaSignatureImageUrl, getScholarshipCondonedAmount, getWhatsAppMessageHistoryRows, globalConfig, globalLocationFilters, globalLocationsDropdownOpen, globalRegistryFiltersDropdownOpen, globalRegistryListFilters, globalRegistrySearchFieldId, handleTogglePersonOfInterest, hasAdminRights, hasFinancialAccess, isCampa, isCompanionWaitlistVirtualParticipant, isDesayunoEvent, isFreeAttendanceType, isGeneral, isResponsivaEnabled, isSiValue, isSuperUser } = getScope();
    const { loc, m, normalizeAttendanceSpecial, num, o, p, participantActivityEntriesById, participantActivityExpandedId, participantActivityLoadingId, participantExpandCache, participantIsCancelled, participantRegisteredViaPublicLink, person, personLikeIsPersonOfInterest, personOfInterestVnpSet, plan, prev, raw, reasons, registryConfirmBusy, resolveBautizosGlobalRegistryRowFinances, resolveCompanionWaitlistSource, resolveGlobalRegistryFinanceHost, resolveLlegaEnCarro, resolveRegisteredCost, resolveTransportSummary, responsivaLinkBusyId, responsivaLocalBusyId } = getScope();
    const { responsivaPipelineSectionTitle, root, roster, rosterInlineEditExpandedId, sede, selectedEventId, setEvents, setExpandedDupGroups, setExpandedDupPersons, setExpandedRows, setGlobalLocationFilters, setGlobalLocationsDropdownOpen, setGlobalRegistryFiltersDropdownOpen, setGlobalRegistryListFilters, setIsExporting, setParticipantActivityEntriesById, setParticipantActivityExpandedId, setParticipantActivityLoadingId, setParticipantExpandCache, setPaymentModal, setRegistryConfirmModal, setRosterInlineEditExpandedId, shouldUseBautizosLegacyPartyFinances, showToast, sortBy, summary, target, toast, total, uiDropdown, uiFilter } = getScope();
    const { uiRosterSearch, userCanDeleteAbonoNote, userCanDeletePaymentHistoryRow, userCanDeleteRegistrationComment, userCanOpenAbonoNoteEditModal, v, val, visibleLocations } = getScope();
    setExpandedDupGroups(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };
  const toggleDupPerson = (key) => {
    const { ATTENDANCE_SPECIAL, AlertCircle, BAUTIZOS_AGE_FILTER_OPTIONS, BAUTIZOS_ATTENDANCE, BAUTIZOS_ATTENDANCE_FILTER_OPTIONS, BAUTIZOS_TRANSPORT_FILTER_OPTIONS, Bug, BzEvtAttendanceTypeChip, BzEvtCarDataSummaryCard, CAR_DATA_FILTER_OPTIONS, CheckCircle2, ChevronDown, ChevronUp, Church, Clock, CopyButton, CreditCard, Edit3, FileSignature, Filter, Gift, GraduationCap, Heart, History, MapPin, MessageSquare, Percent, Phone, ROSTER_QUICK_ACTIONS_ROW_PRIMARY, Receipt, RosterPersonOfInterestButton, RosterResponsivaLocalButton, RosterResponsivaWaButton, RosterWhatsAppButton, SI } = getScope();
    const { Scissors, ShieldAlert, Trash2, UserCircle, Users, ackKeys, addLog, allParticipants, base, baseCost, bautizosCompanionChipCountByRegistrant, bautizosGlobalRegistryFinanceOpts, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtCompanionsInformativeListPriceSum, bzEvtLapInfantCompanion, bzEvtLegacyCompanionVirtualRow, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, bzEvtRosterIndex, calculateAgeFromBirthDate, canArchiveRegistrationsFlag, canCancelRegistrationsFlag, canEditAbonosAndPaymentHistory, canEditRegistryDates, canMarkPersonsOfInterestFlag, canQuickActionResponsivaDigital, canQuickActionResponsivaLocal, canQuickActionWhatsApp, canSeeMoney, companionCollisionsInEvent, companionDisplayIsWaitlistPending, companions, computeNetAmountByMethod, countHostCompanionWaitlistPending } = getScope();
    const { createEmptyGlobalRegistryListFilters, currentEvent, currentPricing, currentUser, data, db, editRegistryModal, el, ev, eventId, events, fieldStack, filterAge, filterAssignment, filterBaptism, filterBzEvtAttendance, filterCarDataPending, filterFirstTimeId, filterGender, filterLiquidation, filterMaritalStatus, filterMedical, filterPaymentType, filterPendingRefund, filterResponsiva, filterRosterRole, filterScholarship, filterSwim, filterTransport, filterTravelFrom, filterTravelTo, filterWhatsAppPending, formatMoney, formatPayHistoryRowDate, formatSiNo } = getScope();
    const { generateVnpPersonId, getAutoPaymentService, getBaptismAccountingSegment, getBautizosCompanionInformativeListPrice, getBautizosListPriceBreakdown, getBautizosTitularListPrice, getGeneralRegistrationCommentsForDisplay, getLiquidationTarget, getParticipantNetPaidFromHistory, getParticipantOutstandingGross, getResponsivaCardUiState, getResponsivaSignatureImageUrl, getScholarshipCondonedAmount, getWhatsAppMessageHistoryRows, globalConfig, globalLocationFilters, globalLocationsDropdownOpen, globalRegistryFiltersDropdownOpen, globalRegistryListFilters, globalRegistrySearchFieldId, handleTogglePersonOfInterest, hasAdminRights, hasFinancialAccess, isCampa, isCompanionWaitlistVirtualParticipant, isDesayunoEvent, isFreeAttendanceType, isGeneral, isResponsivaEnabled, isSiValue, isSuperUser } = getScope();
    const { loc, m, normalizeAttendanceSpecial, num, o, p, participantActivityEntriesById, participantActivityExpandedId, participantActivityLoadingId, participantExpandCache, participantIsCancelled, participantRegisteredViaPublicLink, person, personLikeIsPersonOfInterest, personOfInterestVnpSet, plan, prev, raw, reasons, registryConfirmBusy, resolveBautizosGlobalRegistryRowFinances, resolveCompanionWaitlistSource, resolveGlobalRegistryFinanceHost, resolveLlegaEnCarro, resolveRegisteredCost, resolveTransportSummary, responsivaLinkBusyId, responsivaLocalBusyId } = getScope();
    const { responsivaPipelineSectionTitle, root, roster, rosterInlineEditExpandedId, sede, selectedEventId, setEvents, setExpandedDupGroups, setExpandedDupPersons, setExpandedRows, setGlobalLocationFilters, setGlobalLocationsDropdownOpen, setGlobalRegistryFiltersDropdownOpen, setGlobalRegistryListFilters, setIsExporting, setParticipantActivityEntriesById, setParticipantActivityExpandedId, setParticipantActivityLoadingId, setParticipantExpandCache, setPaymentModal, setRegistryConfirmModal, setRosterInlineEditExpandedId, shouldUseBautizosLegacyPartyFinances, showToast, sortBy, summary, target, toast, total, uiDropdown, uiFilter } = getScope();
    const { uiRosterSearch, userCanDeleteAbonoNote, userCanDeletePaymentHistoryRow, userCanDeleteRegistrationComment, userCanOpenAbonoNoteEditModal, v, val, visibleLocations } = getScope();
    setExpandedDupPersons(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };

  const renderDupPersonDetail = (p, duplicateCluster = null) => {
    const { ATTENDANCE_SPECIAL, AlertCircle, BAUTIZOS_AGE_FILTER_OPTIONS, BAUTIZOS_ATTENDANCE, BAUTIZOS_ATTENDANCE_FILTER_OPTIONS, BAUTIZOS_TRANSPORT_FILTER_OPTIONS, Bug, BzEvtAttendanceTypeChip, BzEvtCarDataSummaryCard, CAR_DATA_FILTER_OPTIONS, CheckCircle2, ChevronDown, ChevronUp, Church, Clock, CopyButton, CreditCard, Edit3, FileSignature, Filter, Gift, GraduationCap, Heart, History, MapPin, MessageSquare, Percent, Phone, ROSTER_QUICK_ACTIONS_ROW_PRIMARY, Receipt, RosterPersonOfInterestButton, RosterResponsivaLocalButton, RosterResponsivaWaButton, RosterWhatsAppButton, SI } = getScope();
    const { Scissors, ShieldAlert, Trash2, UserCircle, Users, ackKeys, addLog, allParticipants, base, baseCost, bautizosCompanionChipCountByRegistrant, bautizosGlobalRegistryFinanceOpts, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtCompanionsInformativeListPriceSum, bzEvtLapInfantCompanion, bzEvtLegacyCompanionVirtualRow, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, bzEvtRosterIndex, calculateAgeFromBirthDate, canArchiveRegistrationsFlag, canCancelRegistrationsFlag, canEditAbonosAndPaymentHistory, canEditRegistryDates, canMarkPersonsOfInterestFlag, canQuickActionResponsivaDigital, canQuickActionResponsivaLocal, canQuickActionWhatsApp, canSeeMoney, companionCollisionsInEvent, companionDisplayIsWaitlistPending, companions, computeNetAmountByMethod, countHostCompanionWaitlistPending } = getScope();
    const { createEmptyGlobalRegistryListFilters, currentEvent, currentPricing, currentUser, data, db, editRegistryModal, el, ev, eventId, events, fieldStack, filterAge, filterAssignment, filterBaptism, filterBzEvtAttendance, filterCarDataPending, filterFirstTimeId, filterGender, filterLiquidation, filterMaritalStatus, filterMedical, filterPaymentType, filterPendingRefund, filterResponsiva, filterRosterRole, filterScholarship, filterSwim, filterTransport, filterTravelFrom, filterTravelTo, filterWhatsAppPending, formatMoney, formatPayHistoryRowDate, formatSiNo } = getScope();
    const { generateVnpPersonId, getAutoPaymentService, getBaptismAccountingSegment, getBautizosCompanionInformativeListPrice, getBautizosListPriceBreakdown, getBautizosTitularListPrice, getGeneralRegistrationCommentsForDisplay, getLiquidationTarget, getParticipantNetPaidFromHistory, getParticipantOutstandingGross, getResponsivaCardUiState, getResponsivaSignatureImageUrl, getScholarshipCondonedAmount, getWhatsAppMessageHistoryRows, globalConfig, globalLocationFilters, globalLocationsDropdownOpen, globalRegistryFiltersDropdownOpen, globalRegistryListFilters, globalRegistrySearchFieldId, handleTogglePersonOfInterest, hasAdminRights, hasFinancialAccess, isCampa, isCompanionWaitlistVirtualParticipant, isDesayunoEvent, isFreeAttendanceType, isGeneral, isResponsivaEnabled, isSiValue, isSuperUser, key } = getScope();
    const { loc, m, normalizeAttendanceSpecial, num, o, participantActivityEntriesById, participantActivityExpandedId, participantActivityLoadingId, participantExpandCache, participantIsCancelled, participantRegisteredViaPublicLink, person, personLikeIsPersonOfInterest, personOfInterestVnpSet, plan, prev, raw, reasons, registryConfirmBusy, resolveBautizosGlobalRegistryRowFinances, resolveCompanionWaitlistSource, resolveGlobalRegistryFinanceHost, resolveLlegaEnCarro, resolveRegisteredCost, resolveTransportSummary, responsivaLinkBusyId, responsivaLocalBusyId } = getScope();
    const { responsivaPipelineSectionTitle, root, roster, rosterInlineEditExpandedId, sede, selectedEventId, setEvents, setExpandedDupGroups, setExpandedDupPersons, setExpandedRows, setGlobalLocationFilters, setGlobalLocationsDropdownOpen, setGlobalRegistryFiltersDropdownOpen, setGlobalRegistryListFilters, setIsExporting, setParticipantActivityEntriesById, setParticipantActivityExpandedId, setParticipantActivityLoadingId, setParticipantExpandCache, setPaymentModal, setRegistryConfirmModal, setRosterInlineEditExpandedId, shouldUseBautizosLegacyPartyFinances, showToast, sortBy, summary, target, toast, total, uiDropdown, uiFilter } = getScope();
    const { uiRosterSearch, userCanDeleteAbonoNote, userCanDeletePaymentHistoryRow, userCanDeleteRegistrationComment, userCanOpenAbonoNoteEditModal, v, val, visibleLocations } = getScope();
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


  const renderGlobalRegistryListToolbar = (baseRowsForCounts, filtersNote, options = {}) => {
    const { ATTENDANCE_SPECIAL, AlertCircle, BAUTIZOS_AGE_FILTER_OPTIONS, BAUTIZOS_ATTENDANCE, BAUTIZOS_ATTENDANCE_FILTER_OPTIONS, BAUTIZOS_TRANSPORT_FILTER_OPTIONS, Bug, BzEvtAttendanceTypeChip, BzEvtCarDataSummaryCard, CAR_DATA_FILTER_OPTIONS, CheckCircle2, ChevronDown, ChevronUp, Church, Clock, CopyButton, CreditCard, Edit3, FileSignature, Filter, Gift, GraduationCap, Heart, History, MapPin, MessageSquare, Percent, Phone, ROSTER_QUICK_ACTIONS_ROW_PRIMARY, Receipt, RosterPersonOfInterestButton, RosterResponsivaLocalButton, RosterResponsivaWaButton, RosterWhatsAppButton, SI } = getScope();
    const { Scissors, ShieldAlert, Trash2, UserCircle, Users, ackKeys, addLog, allParticipants, base, baseCost, bautizosCompanionChipCountByRegistrant, bautizosGlobalRegistryFinanceOpts, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtCompanionsInformativeListPriceSum, bzEvtLapInfantCompanion, bzEvtLegacyCompanionVirtualRow, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, bzEvtRosterIndex, calculateAgeFromBirthDate, canArchiveRegistrationsFlag, canCancelRegistrationsFlag, canEditAbonosAndPaymentHistory, canEditRegistryDates, canMarkPersonsOfInterestFlag, canQuickActionResponsivaDigital, canQuickActionResponsivaLocal, canQuickActionWhatsApp, canSeeMoney, companionCollisionsInEvent, companionDisplayIsWaitlistPending, companions, computeNetAmountByMethod, countHostCompanionWaitlistPending } = getScope();
    const { createEmptyGlobalRegistryListFilters, currentEvent, currentPricing, currentUser, data, db, editRegistryModal, el, ev, eventId, events, fieldStack, filterAge, filterAssignment, filterBaptism, filterBzEvtAttendance, filterCarDataPending, filterFirstTimeId, filterGender, filterLiquidation, filterMaritalStatus, filterMedical, filterPaymentType, filterPendingRefund, filterResponsiva, filterRosterRole, filterScholarship, filterSwim, filterTransport, filterTravelFrom, filterTravelTo, filterWhatsAppPending, formatMoney, formatPayHistoryRowDate, formatSiNo } = getScope();
    const { generateVnpPersonId, getAutoPaymentService, getBaptismAccountingSegment, getBautizosCompanionInformativeListPrice, getBautizosListPriceBreakdown, getBautizosTitularListPrice, getGeneralRegistrationCommentsForDisplay, getLiquidationTarget, getParticipantNetPaidFromHistory, getParticipantOutstandingGross, getResponsivaCardUiState, getResponsivaSignatureImageUrl, getScholarshipCondonedAmount, getWhatsAppMessageHistoryRows, globalConfig, globalLocationFilters, globalLocationsDropdownOpen, globalRegistryFiltersDropdownOpen, globalRegistryListFilters, globalRegistrySearchFieldId, handleTogglePersonOfInterest, hasAdminRights, hasFinancialAccess, isCampa, isCompanionWaitlistVirtualParticipant, isDesayunoEvent, isFreeAttendanceType, isGeneral, isResponsivaEnabled, isSiValue, isSuperUser, key } = getScope();
    const { loc, m, normalizeAttendanceSpecial, num, o, p, participantActivityEntriesById, participantActivityExpandedId, participantActivityLoadingId, participantExpandCache, participantIsCancelled, participantRegisteredViaPublicLink, person, personLikeIsPersonOfInterest, personOfInterestVnpSet, plan, prev, raw, reasons, registryConfirmBusy, resolveBautizosGlobalRegistryRowFinances, resolveCompanionWaitlistSource, resolveGlobalRegistryFinanceHost, resolveLlegaEnCarro, resolveRegisteredCost, resolveTransportSummary, responsivaLinkBusyId, responsivaLocalBusyId } = getScope();
    const { responsivaPipelineSectionTitle, root, roster, rosterInlineEditExpandedId, sede, selectedEventId, setEvents, setExpandedDupGroups, setExpandedDupPersons, setExpandedRows, setGlobalLocationFilters, setGlobalLocationsDropdownOpen, setGlobalRegistryFiltersDropdownOpen, setGlobalRegistryListFilters, setIsExporting, setParticipantActivityEntriesById, setParticipantActivityExpandedId, setParticipantActivityLoadingId, setParticipantExpandCache, setPaymentModal, setRegistryConfirmModal, setRosterInlineEditExpandedId, shouldUseBautizosLegacyPartyFinances, showToast, sortBy, summary, target, toast, total, uiDropdown, uiFilter } = getScope();
    const { uiRosterSearch, userCanDeleteAbonoNote, userCanDeletePaymentHistoryRow, userCanDeleteRegistrationComment, userCanOpenAbonoNoteEditModal, v, val, visibleLocations } = getScope();
    const { extraMobilePanelSections = null, sectionStats = null } = options;
    const emptyF = createEmptyGlobalRegistryListFilters();
    const cfo = (key, value) =>
      filterParticipantRows(baseRowsForCounts, true, { ...emptyF, [key]: value }).length;
    const countLoc = (loc) =>
      baseRowsForCounts.filter((p) => String(p.location || '').trim() === String(loc).trim()).length;
    const cn = (num) => <span className="text-slate-400 font-bold tabular-nums text-[11px]">({num})</span>;
    const grSearchId = globalRegistrySearchFieldId(currentEvent?.id);
    const grSearchActive = !!String(globalRegistryListFilters.searchTerm || '').trim();
    const grMatchCount = filterParticipantRows(baseRowsForCounts, true, globalRegistryListFilters).length;
    const grFilterOption = (filterKey, optionValue, checked, onChange, children, className = uiDropdown.optionRow) => (
      <RosterFilterCheckboxOption
        key={`${filterKey}-${optionValue}`}
        eventId={currentEvent?.id}
        filterKey={filterKey}
        optionValue={optionValue}
        checked={checked}
        onChange={onChange}
        className={className}
      >
        {children}
      </RosterFilterCheckboxOption>
    );
    return (
        <div className="flex flex-col gap-3">
          <div className={uiRosterSearch.toolbarCard}>
            <RosterLocationSearchPanel
              loc="global"
              inputId={grSearchId}
              searchTerm={globalRegistryListFilters.searchTerm}
              rosterSearchActive={grSearchActive}
              onSearchChange={(v) => setGlobalRegistryListFilters((prev) => ({ ...prev, searchTerm: v }))}
              onClear={() => setGlobalRegistryListFilters((prev) => ({ ...prev, searchTerm: '' }))}
              labelText="Buscar en registro global"
              labelBadge="Todas las sedes"
              placeholder="Nombre, teléfono, ID VNPM o comentarios…"
              hintWhenIdle="Encuentra participantes en el registro global consolidado."
              hintWhenActive={`Coincidencias con los filtros actuales: ${grMatchCount}.`}
              statsLine={
                sectionStats ? (
                  <p className={uiRosterSearch.statsTitle}>
                    Coincidencias (con filtros actuales):{' '}
                    <span className={uiRosterSearch.statsHighlight}>{grMatchCount}</span>
                    <span className={uiRosterSearch.statsMuted}>
                      {' '}
                      — {sectionStats.activos} activos · {sectionStats.waitlist} lista de espera · {sectionStats.cancelled}{' '}
                      cancelados
                    </span>
                  </p>
                ) : null
              }
            />
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 w-full">
            <div className="relative flex-1 lg:flex-none" data-dropdown-root="global-registry-filters">
              <button
                type="button"
                onClick={() => setGlobalRegistryFiltersDropdownOpen((v) => !v)}
                className={uiDropdown.trigger}
                aria-label={activeGlobalRegistryFilterCount > 0 ? `Filtros (${activeGlobalRegistryFilterCount} activos)` : 'Filtros'}
              >
                <Filter size={14} className="text-slate-500" />
                Filtros
                {activeGlobalRegistryFilterCount > 0 && (
                  <span
                    className="pointer-events-none absolute -top-1.5 -right-1.5 min-h-[1.125rem] min-w-[1.125rem] px-1 flex items-center justify-center rounded-full bg-indigo-600 text-white text-[9px] font-black leading-none tabular-nums shadow-sm"
                    aria-hidden
                  >
                    {activeGlobalRegistryFilterCount > 99 ? '99+' : activeGlobalRegistryFilterCount}
                  </span>
                )}
              </button>
              {globalRegistryFiltersDropdownOpen && (
                <div className={`${uiDropdown.menu} w-[320px] ${uiFilter.dropdownScope}`}>
                  <button
                    type="button"
                    onClick={() => setGlobalRegistryListFilters(createEmptyGlobalRegistryListFilters())}
                    className={`w-full py-2 ${uiButtons.secondary}`}
                  >
                    Limpiar filtros
                  </button>
                  <p className="text-[10px] text-slate-500 leading-snug border-b border-slate-100 pb-2">
                    {filtersNote}
                  </p>
                  {isCampa && (
                    <>
                      <div><p className={uiDropdown.sectionTitle}>Asignación</p>{['all', 'Teens', 'Jóvenes', 'Ambos'].map((op) => grFilterOption('filterAssignment', op, globalRegistryListFilters.filterAssignment === op, () => setGlobalRegistryListFilters((prev) => ({ ...prev, filterAssignment: prev.filterAssignment === op ? 'all' : op })), <>{op === 'all' ? 'Todas' : op}{' '}{cn(cfo('filterAssignment', op))}</>))}</div>
                      <div>
                        <p className={uiDropdown.sectionTitle}>Servidor</p>
                        {[
                          { id: 'all', label: 'Todos' },
                          { id: 'camperos', label: 'Camperos (no servidores, ni empleados ni cortesías)' },
                          { id: 'servidor-teens', label: 'Servidores en Teens (incl. Ambos allí)' },
                          { id: 'servidor-jovenes', label: 'Servidores en Jóvenes (incl. Ambos allí)' },
                          { id: 'servidor-ambos', label: 'Servidores (Ambos tarifa única)' },
                        ].map((op) =>
                          grFilterOption('filterRosterRole', op.id, globalRegistryListFilters.filterRosterRole === op.id, () => setGlobalRegistryListFilters((prev) => ({ ...prev, filterRosterRole: prev.filterRosterRole === op.id ? 'all' : op.id })), <>{op.label}{' '}{cn(cfo('filterRosterRole', op.id))}</>)
                        )}
                      </div>
                      <div>
                        <p className={uiDropdown.sectionTitle}>Asistencia especial</p>
                        {[
                          { id: 'empleado', label: 'Empleados' },
                          { id: 'cortesia', label: 'Cortesías' },
                        ].map((op) =>
                          grFilterOption('filterRosterRole', op.id, globalRegistryListFilters.filterRosterRole === op.id, () => setGlobalRegistryListFilters((prev) => ({ ...prev, filterRosterRole: prev.filterRosterRole === op.id ? 'all' : op.id })), <>{op.label}{' '}{cn(cfo('filterRosterRole', op.id))}</>)
                        )}
                      </div>
                      <div><p className="text-[10px] font-black text-slate-500 uppercase mb-1">Beca</p>{[{ id: 'all', label: 'Todos' }, { id: 'becado', label: 'Cualquier becado' }, { id: 'No', label: 'No' }, { id: 'partial', label: 'Parcial' }, { id: 'total', label: 'Total' }].map((op) => grFilterOption('filterScholarship', op.id, globalRegistryListFilters.filterScholarship === op.id, () => setGlobalRegistryListFilters((prev) => ({ ...prev, filterScholarship: prev.filterScholarship === op.id ? 'all' : op.id })), <>{op.label}{' '}{cn(cfo('filterScholarship', op.id))}</>, 'flex items-center gap-2 text-xs font-semibold text-slate-700 py-1 cursor-pointer'))}</div>
                      <div><p className="text-[10px] font-black text-slate-500 uppercase mb-1">Bautizo</p>{[
                        { id: 'all', label: 'Todos' },
                        { id: 'teens', label: 'Si se bautiza en Teens' },
                        { id: 'jovenes', label: 'Si se bautiza en Jóvenes' },
                        { id: 'no', label: 'No se bautiza' },
                      ].map((op) =>
                        grFilterOption('filterBaptism', op.id, globalRegistryListFilters.filterBaptism === op.id, () => setGlobalRegistryListFilters((prev) => ({ ...prev, filterBaptism: prev.filterBaptism === op.id ? 'all' : op.id })), <>{op.label}{' '}{cn(cfo('filterBaptism', op.id))}</>, 'flex items-center gap-2 text-xs font-semibold text-slate-700 py-1 cursor-pointer')
                      )}</div>
                      <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Estado civil</p>
                        {[
                          { id: 'all', label: 'Todos' },
                          { id: 'single', label: 'Soltero' },
                          { id: 'married', label: 'Casado' },
                          { id: 'pending-spouse', label: 'Pendiente de asignar pareja' },
                        ].map((op) =>
                          grFilterOption('filterMaritalStatus', op.id, globalRegistryListFilters.filterMaritalStatus === op.id, () => setGlobalRegistryListFilters((prev) => ({ ...prev, filterMaritalStatus: prev.filterMaritalStatus === op.id ? 'all' : op.id })), <>{op.label} {cn(cfo('filterMaritalStatus', op.id))}</>, 'flex items-center gap-2 text-xs font-semibold text-slate-700 py-1 cursor-pointer')
                        )}
                      </div>
                      <div><p className="text-[10px] font-black text-slate-500 uppercase mb-1">Tipo de pago</p>{['all', 'Efectivo', 'Tarjeta'].map((op) => grFilterOption('filterPaymentType', op, globalRegistryListFilters.filterPaymentType === op, () => setGlobalRegistryListFilters((prev) => ({ ...prev, filterPaymentType: prev.filterPaymentType === op ? 'all' : op })), <>{op === 'all' ? 'Todos' : op}{' '}{cn(cfo('filterPaymentType', op))}</>, 'flex items-center gap-2 text-xs font-semibold text-slate-700 py-1 cursor-pointer'))}</div>
                      <div><p className="text-[10px] font-black text-slate-500 uppercase mb-1">Transporte</p>{[{ id: 'all', label: 'Todos' }, { id: 'go-bus', label: 'Llega en camión' }, { id: 'return-bus', label: 'Regresa en camión' }, { id: 'go-car', label: 'Llega en carro' }, { id: 'return-car', label: 'Regresa en carro' }].map((op) => grFilterOption('filterTransport', op.id, globalRegistryListFilters.filterTransport === op.id, () => setGlobalRegistryListFilters((prev) => ({ ...prev, filterTransport: prev.filterTransport === op.id ? 'all' : op.id })), <>{op.label}{' '}{cn(cfo('filterTransport', op.id))}</>, 'flex items-center gap-2 text-xs font-semibold text-slate-700 py-1 cursor-pointer'))}</div>
                    </>
                  )}
                  {false && (
                    <>
                      <div>
                        <p className={uiDropdown.sectionTitle}>Tipo de asistencia</p>
                        {BAUTIZOS_ATTENDANCE_FILTER_OPTIONS.map((op) =>
                          grFilterOption(
                            'filterBzEvtAttendance',
                            op.id,
                            globalRegistryListFilters.filterBzEvtAttendance === op.id,
                            () =>
                              setGlobalRegistryListFilters((prev) => ({
                                ...prev,
                                filterBzEvtAttendance: prev.filterBzEvtAttendance === op.id ? 'all' : op.id,
                              })),
                            <>{op.label}{' '}{cn(cfo('filterBzEvtAttendance', op.id))}</>
                          )
                        )}
                      </div>
                      <div>
                        <p className={uiDropdown.sectionTitle}>Transporte</p>
                        {BAUTIZOS_TRANSPORT_FILTER_OPTIONS.map((op) =>
                          grFilterOption(
                            'filterTransport',
                            op.id,
                            globalRegistryListFilters.filterTransport === op.id,
                            () =>
                              setGlobalRegistryListFilters((prev) => ({
                                ...prev,
                                filterTransport: prev.filterTransport === op.id ? 'all' : op.id,
                              })),
                            <>{op.label}{' '}{cn(cfo('filterTransport', op.id))}</>
                          )
                        )}
                      </div>
                      <div>
                        <p className={uiDropdown.sectionTitle}>Edad</p>
                        {BAUTIZOS_AGE_FILTER_OPTIONS.map((op) =>
                          grFilterOption(
                            'filterAge',
                            op.id,
                            globalRegistryListFilters.filterAge === op.id,
                            () =>
                              setGlobalRegistryListFilters((prev) => ({
                                ...prev,
                                filterAge: prev.filterAge === op.id ? 'all' : op.id,
                              })),
                            <>{op.label}{' '}{cn(cfo('filterAge', op.id))}</>
                          )
                        )}
                      </div>
                      <div>
                        <p className={uiDropdown.sectionTitle}>Datos de carro</p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 mb-1.5 leading-snug">
                          Solo quienes llegan en carro. Transporte del evento no cuenta como pendiente.
                        </p>
                        {CAR_DATA_FILTER_OPTIONS.map((op) =>
                          grFilterOption(
                            'filterCarDataPending',
                            op.id,
                            globalRegistryListFilters.filterCarDataPending === op.id,
                            () =>
                              setGlobalRegistryListFilters((prev) => ({
                                ...prev,
                                filterCarDataPending: prev.filterCarDataPending === op.id ? 'all' : op.id,
                              })),
                            <>{op.label}{' '}{cn(cfo('filterCarDataPending', op.id))}</>
                          )
                        )}
                      </div>
                    </>
                  )}
                  {!isCampa && !false && (
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Servidor y asistencia</p>
                      {[
                        { id: 'all', label: 'Todos' },
                        { id: 'camperos', label: 'Camperos (no empleados ni cortesías)' },
                        { id: 'empleado', label: 'Empleados' },
                        { id: 'cortesia', label: 'Cortesías' },
                      ].map((op) => (
                        <label key={op.id} className="flex items-center gap-2 text-xs font-semibold text-slate-700 py-1 cursor-pointer">
                          <input type="checkbox" className="h-4 w-4 rounded accent-indigo-600" checked={globalRegistryListFilters.filterRosterRole === op.id} onChange={() => setGlobalRegistryListFilters((prev) => ({ ...prev, filterRosterRole: prev.filterRosterRole === op.id ? 'all' : op.id }))} />
                          {op.label}{' '}{cn(cfo('filterRosterRole', op.id))}
                        </label>
                      ))}
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Liquidación</p>
                    <p className="text-[9px] text-slate-400 mb-1.5 leading-snug">«Saldo a favor»: pagado por encima del costo a liquidar.</p>
                    {[
                      { id: 'all', label: 'Todos' },
                      { id: 'liquidado', label: 'Liquidado' },
                      { id: 'pendiente', label: 'Falta por liquidar' },
                      { id: 'saldo-favor', label: 'Saldo a favor' },
                    ].map((op) => (
                      <label key={op.id} className="flex items-center gap-2 text-xs font-semibold text-slate-700 py-1 cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded accent-indigo-600"
                          checked={globalRegistryListFilters.filterLiquidation === op.id}
                          onChange={() => setGlobalRegistryListFilters((prev) => ({ ...prev, filterLiquidation: prev.filterLiquidation === op.id ? 'all' : op.id }))}
                        />
                        {op.label}{' '}{cn(cfo('filterLiquidation', op.id))}
                      </label>
                    ))}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1">WhatsApp</p>
                    {[
                      { id: 'all', label: 'Todos' },
                      { id: 'pending', label: 'Pendiente de enviar' },
                    ].map((op) => (
                      <label key={op.id} className="flex items-center gap-2 text-xs font-semibold text-slate-700 py-1 cursor-pointer">
                        <input type="checkbox" className="h-4 w-4 rounded accent-indigo-600" checked={globalRegistryListFilters.filterWhatsAppPending === op.id} onChange={() => setGlobalRegistryListFilters((prev) => ({ ...prev, filterWhatsAppPending: prev.filterWhatsAppPending === op.id ? 'all' : op.id }))} />
                        {op.label}{' '}{cn(cfo('filterWhatsAppPending', op.id))}
                      </label>
                    ))}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1">ID VNPM</p>
                    {[
                      { id: 'all', label: 'Todos' },
                      { id: 'first', label: 'Primera vez' },
                      { id: 'not-first', label: 'No primera vez' },
                    ].map((op) => (
                      <label key={op.id} className="flex items-center gap-2 text-xs font-semibold text-slate-700 py-1 cursor-pointer">
                        <input type="checkbox" className="h-4 w-4 rounded accent-indigo-600" checked={globalRegistryListFilters.filterFirstTimeId === op.id} onChange={() => setGlobalRegistryListFilters((prev) => ({ ...prev, filterFirstTimeId: prev.filterFirstTimeId === op.id ? 'all' : op.id }))} />
                        {op.label}{' '}{cn(cfo('filterFirstTimeId', op.id))}
                      </label>
                    ))}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Devolución pendiente</p>
                    {[
                      { id: 'all', label: 'Todos' },
                      { id: 'pending', label: 'Con devolución pendiente' },
                      { id: 'none', label: 'Sin devolución pendiente' },
                    ].map((op) => (
                      <label key={op.id} className="flex items-center gap-2 text-xs font-semibold text-slate-700 py-1 cursor-pointer">
                        <input type="checkbox" className="h-4 w-4 rounded accent-indigo-600" checked={globalRegistryListFilters.filterPendingRefund === op.id} onChange={() => setGlobalRegistryListFilters((prev) => ({ ...prev, filterPendingRefund: prev.filterPendingRefund === op.id ? 'all' : op.id }))} />
                        {op.label}{' '}{cn(cfo('filterPendingRefund', op.id))}
                      </label>
                    ))}
                  </div>
                  {isResponsivaEnabled && (
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Responsiva</p>
                      {[
                        { id: 'all', label: 'Todos' },
                        { id: 'pending', label: 'Pendiente' },
                        { id: 'delivered', label: 'Entregada' },
                        { id: 'na', label: 'No aplica' },
                      ].map((op) => (
                        <label key={op.id} className="flex items-center gap-2 text-xs font-semibold text-slate-700 py-1 cursor-pointer">
                          <input type="checkbox" className="h-4 w-4 rounded accent-indigo-600" checked={globalRegistryListFilters.filterResponsiva === op.id} onChange={() => setGlobalRegistryListFilters((prev) => ({ ...prev, filterResponsiva: prev.filterResponsiva === op.id ? 'all' : op.id }))} />
                          {op.label}{' '}{cn(cfo('filterResponsiva', op.id))}
                        </label>
                      ))}
                    </div>
                  )}
                  {isCampa && (
                    <>
                      <div><p className="text-[10px] font-black text-slate-500 uppercase mb-1">Género</p>{['all', ...GENDERS].map((op) => (<label key={op} className="flex items-center gap-2 text-xs font-semibold text-slate-700 py-1 cursor-pointer"><input type="checkbox" className="h-4 w-4 rounded accent-indigo-600" checked={globalRegistryListFilters.filterGender === op} onChange={() => setGlobalRegistryListFilters((prev) => ({ ...prev, filterGender: prev.filterGender === op ? 'all' : op }))} />{op === 'all' ? 'Todos' : op}{' '}{cn(cfo('filterGender', op))}</label>))}</div>
                      <div><p className="text-[10px] font-black text-slate-500 uppercase mb-1">Salud</p>{[{ id: 'all', label: 'Todos' }, { id: 'allergy', label: 'Con alergias' }, { id: 'disease', label: 'Con enfermedades' }, { id: 'disability', label: 'Con discapacidades' }].map((op) => (<label key={op.id} className="flex items-center gap-2 text-xs font-semibold text-slate-700 py-1 cursor-pointer"><input type="checkbox" className="h-4 w-4 rounded accent-indigo-600" checked={globalRegistryListFilters.filterMedical === op.id} onChange={() => setGlobalRegistryListFilters((prev) => ({ ...prev, filterMedical: prev.filterMedical === op.id ? 'all' : op.id }))} />{op.label}{' '}{cn(cfo('filterMedical', op.id))}</label>))}</div>
                      <div><p className="text-[10px] font-black text-slate-500 uppercase mb-1">Nado</p>{['all', SI, 'No'].map((op) => (<label key={op} className="flex items-center gap-2 text-xs font-semibold text-slate-700 py-1 cursor-pointer"><input type="checkbox" className="h-4 w-4 rounded accent-indigo-600" checked={globalRegistryListFilters.filterSwim === op} onChange={() => setGlobalRegistryListFilters((prev) => ({ ...prev, filterSwim: prev.filterSwim === op ? 'all' : op }))} />{op === 'all' ? 'Todos' : op}{' '}{cn(cfo('filterSwim', op))}</label>))}</div>
                      <div><p className="text-[10px] font-black text-slate-500 uppercase mb-1">Sede de salida</p>{['all', ...visibleLocations].map((op) => (<label key={op} className="flex items-center gap-2 text-xs font-semibold text-slate-700 py-1 cursor-pointer"><input type="checkbox" className="h-4 w-4 rounded accent-indigo-600" checked={globalRegistryListFilters.filterTravelFrom === op} onChange={() => setGlobalRegistryListFilters((prev) => ({ ...prev, filterTravelFrom: prev.filterTravelFrom === op ? 'all' : op }))} />{op === 'all' ? 'Todas' : op}{' '}{cn(cfo('filterTravelFrom', op))}</label>))}</div>
                      <div><p className="text-[10px] font-black text-slate-500 uppercase mb-1">Sede de regreso</p>{['all', ...visibleLocations].map((op) => (<label key={op} className="flex items-center gap-2 text-xs font-semibold text-slate-700 py-1 cursor-pointer"><input type="checkbox" className="h-4 w-4 rounded accent-indigo-600" checked={globalRegistryListFilters.filterTravelTo === op} onChange={() => setGlobalRegistryListFilters((prev) => ({ ...prev, filterTravelTo: prev.filterTravelTo === op ? 'all' : op }))} />{op === 'all' ? 'Todas' : op}{' '}{cn(cfo('filterTravelTo', op))}</label>))}</div>
                    </>
                  )}
                </div>
              )}
            </div>
            <RosterSortDropdown
              value={globalRegistryListFilters.sortBy}
              onChange={(id) =>
                setGlobalRegistryListFilters((prev) => ({ ...prev, sortBy: id }))
              }
              options={ROSTER_SORT_OPTIONS_GLOBAL}
              ariaLabel="Ordenar lista"
              variant="global"
            />
            <div className="relative flex-1 lg:flex-none" data-dropdown-root="global-locations-filters">
              <button
                type="button"
                onClick={() => setGlobalLocationsDropdownOpen((v) => !v)}
                className={`${uiDropdown.trigger} font-black`}
              >
                <MapPin size={14} className="text-slate-500 dark:text-slate-400 shrink-0" />
                Filtrar por sede
                {globalLocationFilters.length > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-500/30 dark:text-indigo-200 text-[10px] font-black">
                    {globalLocationFilters.length}
                  </span>
                )}
              </button>
              {globalLocationsDropdownOpen && (
                <div
                  className={`absolute top-full right-0 mt-2 z-30 w-[280px] max-w-[90vw] rounded-xl shadow-xl p-3 space-y-2 border bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-600 ${uiFilter.dropdownScope}`}
                >
                  <button
                    type="button"
                    onClick={() => setGlobalLocationFilters([])}
                    className="w-full py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-black text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    Limpiar filtro de sede
                  </button>
                  {visibleLocations.map((loc) => {
                    const checked = globalLocationFilters.includes(loc);
                    return (
                      <label key={`global-loc-filter-${loc}`} className={uiFilter.optionRow}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setGlobalLocationFilters((prev) => (checked ? prev.filter((v) => v !== loc) : [...prev, loc]));
                          }}
                        />
                        {loc}{' '}{cn(countLoc(loc))}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
    );
  };

  return {
    renderPublicLinkExtChip,
    getBautizosBaptizedCompanionRows,
    rosterDisplayUnspecified,
    renderRegistrationParticipantColumn,
    renderRegistrationFinancesColumn,
    renderExpandedRosterDetailTableRow,
    renderRosterQuickActionsPanel,
    renderRosterPersonMobileCard,
    toggleDupGroup,
    toggleDupPerson,
    renderDupPersonDetail,
    renderGlobalRegistryListToolbar,
  };
}
