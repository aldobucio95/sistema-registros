import { lazy, useCallback, useMemo, useEffect, useLayoutEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { PanelLeft, Shield } from 'lucide-react';
import * as appMainModuleScope from '../../app/helpers/appMainModuleScope.jsx';
import AppVersionBadge from '../../AppVersionBadge.jsx';
import RegistryConfirmModal from '../../components/modals/RegistryConfirmModal.jsx';
import CapFullWaitlistConfirmModal from '../../components/modals/CapFullWaitlistConfirmModal.jsx';
import PromoteOverCapConfirmModal from '../../components/modals/PromoteOverCapConfirmModal.jsx';
import { EventHubProvider } from '../../app/providers/EventHubProvider.jsx';
import SystemViewGuard from '../../rbac/SystemViewGuard.jsx';
import ScreenLoadingFallback from '../../screens/ScreenLoadingFallback.jsx';
import { parseStrictNonNegativeMoneyInput } from '../../strictMoneyInput.js';

const LoginScreenLazy = lazy(() => import('../../screens/LoginScreen.jsx'));
const EventHubScreenLazy = lazy(() => import('../../screens/EventHubScreen.jsx'));

/** Helpers de módulo (estables; no dependen del ref de getScope del primer render). */
const {
  fromDatetimeLocalToIso,
  getPaymentRowInstantMsPreferRecorded,
  getResponsivaRequirementApplies,
  getWhatsAppMessageHistoryRows,
  participantIsActiveOrWaitlistForDuplicateHint,
  participantIsArchived,
  removeArchiveProfileIndexEntryIfMatches,
  toDatetimeLocalValue,
  userCanDeleteAbonoNote,
  userCanDeleteRegistrationComment,
  userCanOpenAbonoNoteEditModal,
} = appMainModuleScope;

/** Segunda mitad de handlers (chunk app-handlers-b). */
export function useAppMainHandlersPartB(getScope) {
  /* __SCOPE_DEPS_AUTO__ */
  const {
    ClipboardList,
    EDITOR_REGISTRATION_FIELD_GROUP_LABELS,
    ExcelExportScopeModalLazy,
    Suspense,
    XCircle,
    abonoNoteEditModal = { isOpen: false },
    activeTab,
    addLog,
    allParticipants = [],
    applyRosterLikeFilters,
    archiveParticipantToFirestore,
    btnPrimary,
    btnSecondary,
    buildExcelExportSectionAvailability,
    buildMergedFinanceWhatsAppMessage,
    buildWhatsAppMessage,
    canEditAbonosAndPaymentHistory,
    computeNetAmountByMethod,
    createEditRegistryDraft,
    currentEvent,
    currentUser,
    data,
    editRegistryModal = { isOpen: false, loc: '', data: null, variant: 'modal' },
    editorRegFieldsForm = {},
    editorRegFieldsModalOpen = false,
    editorRegFieldsScope = 'event',
    editorRegistrationFieldVis = {},
    editorTypeFieldVis = {},
    eventResponsivaDigitalAdultsDraft,
    eventResponsivaDigitalEnabledDraft,
    eventResponsivaDigitalMinorsDraft,
    eventResponsivaEnabledDraft,
    eventResponsivaGeneralAdultsDraft,
    eventResponsivaGeneralMinorsDraft,
    eventResponsivaTextAdultsDraft,
    eventResponsivaTextMinorsDraft,
    excelExportAccessibleLocations,
    excelExportModal = { isOpen: false, locations: [], sections: {} },
    expandedRows,
    finalizeCarDataWhatsAppSend,
    finalizeWhatsAppQuickSend,
    getAutoPaymentService,
    getEditorRegistrationFieldGroupOrderForEventType,
    getEditorRegistrationFieldMetaForEventType,
    getLiquidationTarget,
    globalConfig,
    hasAdminRights,
    hasEventAccess,
    hasLocationAccess,
    isExporting = false,
    isSuperUser,
    logParticipantActivity,
    mergeEditorRegistrationFieldVisibility,
    panelNavModalOpen = false,
    participantExpandCache,
    setParticipantExpandCache,
    setParticipantActivityExpandedId,
    getDocRef,
    getDoc,
    paymentMethodEditModal = { isOpen: false },
    paymentModal = { isOpen: false },
    privacyNoticeModalOpen = false,
    refreshParticipantCache,
    registrationCommentModal = { isOpen: false },
    registrationRequiresResponsivaStatus,
    registryConfirmBusy = false,
    registryConfirmModal = { isOpen: false },
    resetEditRegistryModalRef,
    editRegistryInlineBaselineRef,
    editRegistryModalRef,
    modalEscapeCloseRef,
    pendingInlineEditScrollRef,
    waBulkPopoutRef,
    whatsAppAutoSendCancelRef,
    rosterExpandEditOnlyIds,
    rosterInlineEditExpandedId,
    selectedEventId,
    setEditPreferredServeDropdownOpen,
    setEditRegDraftCarMeta,
    setEditRegistryModal,
    setEditServedAreasDropdownOpen,
    setEditorRegFieldsForm,
    setEditorRegFieldsModalOpen,
    setEditorRegFieldsScope,
    setExcelExportModal,
    setRegistryConfirmModal,
    setRosterExpandEditOnlyIds,
    setRosterInlineEditExpandedId,
    setSpouseLinkSearchEdit,
    setPanelNavModalOpen,
    setPrivacyNoticeModalOpen,
    setWhatsAppModal,
    setPaymentModal,
    setAbonoNoteEditModal,
    setDonationModal,
    setCustomFieldsModal,
    setExpensePartialModal,
    setExpenseEditModal,
    setAllergyOptionsModal,
    setServeAreaOptionsModal,
    setCashCutScheduleModal,
    setPricingModal,
    setSummaryRosterModal,
    setSummaryCellDetailModal,
    setExpandedRows,
    setEditingUser,
    setRegistrationCommentModal,
    setPaymentMethodEditModal,
    setIsAddLocModalOpen,
    setNewLocationName,
    setDonationsListOpen,
    setPublicQrModalOpen,
    setResponsivaDigitalTextModalOpen,
    setNewRegModalOpen,
    setCashCutServiceDetailModal,
    setRestoreModal,
    setRenameModal,
    setDeleteUserConfirmModal,
    setRevokeSessionsConfirmModal,
    setDeleteEventModal,
    closeCapFullWaitlistConfirm,
    closePromoteOverCapConfirm,
    showToast,
    sleepWhatsAppAutoSend,
    systemView,
    uiButtons,
    uiModal,
    uiShell,
    whatsAppModal = { isOpen: false },
    capWaitlistConfirmModal = { isOpen: false },
    promoteOverCapConfirmModal = { isOpen: false },
  } = getScope();
  /* __SCOPE_DEPS_AUTO_END__ */



  const runBulkCarDataWhatsAppForRoster = useCallback(
    async (rosterRows) => {
      const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, all, allKnownLocationNames, allParticipants } = getScope();
      const { anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, b, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
      const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
      const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, darkMode, dashboardHasFullLocationAccess, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, evType, event, eventDateDraft } = getScope();
      const { eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
      const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostSourceKey, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
      const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, labelClasses, legacy, limit, linkWithCredential, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
      const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, mergedPrivacyNotice } = getScope();
      const { na, needsFirestoreResyncAfterBulk, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, pathname, performAppFullBackup } = getScope();
      const { privacyNoticePublicUrl, pruneEventScopedAccessMap, query, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, secondaryAuth, sede } = getScope();
      const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
      const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView } = getScope();
      const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
      if (currentUser?.role === 'Lector' || !userCanSendWhatsAppQuickAction(currentUser)) {
        showToast('No tienes permiso para el envío de WhatsApp de datos de carro.');
        return;
      }
      if (!hasEventAccess(currentEvent?.id)) {
        showToast('No tienes permisos para enviar en este evento.');
        return;
      }
      const targets = listCarDataPendingTitularTargets(rosterRows, currentEvent).filter((t) => {
        const loc = String(t.titular?.location || '').trim();
        return !loc || hasLocationAccess(loc);
      });
      if (!targets.length) {
        showToast('No hay titulares con datos de carro pendientes en esta vista.');
        return;
      }
      const confirmed = window.confirm(
        `Se abrirá WhatsApp para ${targets.length} titular(es) con solicitud de datos de carro, con pausas anti-spam:\n\n` +
          '• 10 segundos entre cada mensaje\n' +
          '• 2 minutos cada 10 mensajes\n\n' +
          '¿Continuar?'
      );
      if (!confirmed) return;

      whatsAppAutoSendCancelRef.current = false;
      waBulkPopoutRef.current = null;
      setWhatsAppAutoSendJob({
        running: true,
        current: 0,
        total: targets.length,
        locLabel: 'Datos de carro',
      });

      let failures = 0;
      for (let i = 0; i < targets.length; i++) {
        if (whatsAppAutoSendCancelRef.current) break;
        if (i > 0) {
          const delayMs = i % 10 === 0 ? 2 * 60 * 1000 : 10_000;
          const proceed = await getScope().sleepWhatsAppAutoSend(delayMs);
          if (!proceed || whatsAppAutoSendCancelRef.current) break;
        }
        const { titular, markKeys } = targets[i];
        const waPhone = normalizeWhatsAppPhone(titular?.phone);
        const body = String(message || '').trim();
        if (!waPhone || !body) {
          failures += 1;
          setWhatsAppAutoSendJob({ running: true, current: i + 1, total: targets.length, locLabel: 'Datos de carro' });
          continue;
        }
        const url = buildWhatsAppMeUrl(waPhone, body);
        try {
          let w = waBulkPopoutRef.current;
          if (w && !w.closed) {
            try {
              w.location.href = url;
            } catch {
              w = window.open(url, 'vnpmWaBulkWhatsApp');
              waBulkPopoutRef.current = w;
            }
          } else {
            w = window.open(url, 'vnpmWaBulkWhatsApp');
            waBulkPopoutRef.current = w;
          }
          if (!w) throw new Error('popup blocked');
        } catch {
          failures += 1;
          showToast('Ventana bloqueada por el navegador. Permite pop-ups y vuelve a intentar.');
          setWhatsAppAutoSendJob({ running: true, current: i + 1, total: targets.length, locLabel: 'Datos de carro' });
          continue;
        }
        try {
          await getScope().finalizeCarDataWhatsAppSend({
            titularId: titular.id,
            loc: titular.location || '',
            text: body,
            markKeys,
            titularName: titular.name,
            phone: waPhone,
            logChannel: 'Envío masivo datos de carro',
          });
        } catch {
          failures += 1;
        }
        setWhatsAppAutoSendJob({ running: true, current: i + 1, total: targets.length, locLabel: 'Datos de carro' });
      }

      setWhatsAppAutoSendJob((j) => ({ ...j, running: false }));
      if (!whatsAppAutoSendCancelRef.current) {
        showToast(
          failures
            ? `Envío de datos de carro finalizado con ${failures} error(es).`
            : `Envío de datos de carro finalizado: ${targets.length} titular(es).`
        );
      }
      whatsAppAutoSendCancelRef.current = false;
    },
    [
      currentEvent,
      currentUser,
      finalizeCarDataWhatsAppSend,
      hasEventAccess,
      hasLocationAccess,
      showToast,
      sleepWhatsAppAutoSend,
    ]
  );

  const openWhatsAppModal = useCallback(
    async (person, loc) => {
      const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
      const { anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, b, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
      const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
      const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, darkMode, dashboardHasFullLocationAccess, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, evType, event, eventDateDraft } = getScope();
      const { eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
      const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostSourceKey, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
      const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, labelClasses, legacy, limit, linkWithCredential, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
      const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, mergedPrivacyNotice } = getScope();
      const { na, needsFirestoreResyncAfterBulk, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, pathname, performAppFullBackup } = getScope();
      const { privacyNoticePublicUrl, pruneEventScopedAccessMap, query, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, secondaryAuth, sede } = getScope();
      const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
      const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView } = getScope();
      const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
      if (currentUser?.role === 'Lector' || !userCanSendWhatsAppQuickAction(currentUser)) {
        showToast('No tienes permiso para enviar WhatsApp desde el registro.');
        return;
      }
      const waPhone = normalizeWhatsAppPhone(person?.phone);
      if (!waPhone) {
        showToast('Teléfono inválido para WhatsApp.');
        return;
      }
      const liq = getLiquidationTarget(person);
      const notifications = Array.isArray(person.whatsAppFinanceNotifications) ? person.whatsAppFinanceNotifications : [];
      const pendingList = filterWhatsAppFinanceNotificationsForQueue(
        person,
        notifications.filter((n) => n && !n.sent),
        currentEvent,
        allParticipants
      );
      let message = '';
      let pendingMergeMarkKeys = null;
      let whatsAppQueuedMessageSnapshot = null;
      if (pendingList.length > 0) {
        const { mergeMarkKeys } = buildMergedFinanceWhatsAppMessage(
          person,
          loc,
          pendingList,
          currentEvent,
          getWhatsAppNotificationMarkKey,
          getLiquidationTarget,
          allParticipants
        );
        message = text;
        pendingMergeMarkKeys = mergeMarkKeys;
        whatsAppQueuedMessageSnapshot = text;
      } else {
        message = getScope().buildWhatsAppMessage(person, loc, liq);
      }
      const trimmed = (message || '').trim();
      if (!trimmed) {
        showToast('No hay mensaje para enviar.');
        return;
      }
      window.open(buildWhatsAppMeUrl(waPhone, trimmed), '_blank', 'noopener,noreferrer');
      await getScope().finalizeWhatsAppQuickSend({
        personId: person.id,
        loc: loc || '',
        text: trimmed,
        pendingMergeMarkKeys,
        whatsAppQueuedMessageSnapshot,
        logChannel: 'Acción rápida',
      });
      showToast('WhatsApp abierto en nueva pestaña.');
    },
    [
      allParticipants,
      buildWhatsAppMessage,
      buildMergedFinanceWhatsAppMessage,
      currentEvent,
      currentUser,
      finalizeWhatsAppQuickSend,
      getLiquidationTarget,
      showToast,
    ]
  );

  const sendWhatsAppMessage = useCallback(async () => {
      const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
      const { anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, b, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
      const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
      const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, darkMode, dashboardHasFullLocationAccess, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, evType, event, eventDateDraft } = getScope();
      const { eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
      const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostSourceKey, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
      const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, labelClasses, legacy, limit, linkWithCredential, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
      const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, mergedPrivacyNotice } = getScope();
      const { na, needsFirestoreResyncAfterBulk, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, pathname, performAppFullBackup } = getScope();
      const { privacyNoticePublicUrl, pruneEventScopedAccessMap, query, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, secondaryAuth, sede } = getScope();
      const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
      const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView } = getScope();
      const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    const waPhone = normalizeWhatsAppPhone(whatsAppModal.phone);
    if (!waPhone) {
      setWhatsAppModal((prev) => ({ ...prev, error: 'Teléfono inválido para WhatsApp.' }));
      return;
    }
    const text = (whatsAppModal.message || '').trim();
    if (!text) {
      setWhatsAppModal((prev) => ({ ...prev, error: 'Escribe un mensaje antes de enviar.' }));
      return;
    }
    window.open(buildWhatsAppMeUrl(waPhone, text), '_blank', 'noopener,noreferrer');
    const { personId, message: sentBody, loc: waLoc } =
      whatsAppModal;
    await getScope().finalizeWhatsAppQuickSend({
      personId, text: sentBody, logChannel: 'Modal WhatsApp', });
    setWhatsAppModal({
      isOpen: false, personId: null, personName: '', eventName: '', loc: '', phone: '', message: '', error: '', pendingMergeMarkKeys: null, whatsAppQueuedMessageSnapshot: null, });
    showToast('WhatsApp abierto en nueva pestaña.');
  }, [finalizeWhatsAppQuickSend, showToast, whatsAppModal]);

  const sendResponsivaSignLinkWhatsAppForPerson = useCallback(async (person, loc) => {
      const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, all, allKnownLocationNames, allParticipants } = getScope();
      const { anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, b, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
      const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
      const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, darkMode, dashboardHasFullLocationAccess, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, evType, event, eventDateDraft } = getScope();
      const { eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
      const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostSourceKey, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
      const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, labelClasses, legacy, limit, linkWithCredential, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
      const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, mergedPrivacyNotice } = getScope();
      const { na, needsFirestoreResyncAfterBulk, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, pathname, performAppFullBackup } = getScope();
      const { privacyNoticePublicUrl, pruneEventScopedAccessMap, query, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, secondaryAuth, sede } = getScope();
      const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
      const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView } = getScope();
      const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!person?.id || !currentEvent?.id) return;
    if (!hasEventAccess(currentEvent.id) || !hasLocationAccess(loc)) {
      showToast('No tienes permisos para enviar este enlace.');
      return;
    }
    if (!isResponsivaEnabledForEvent(currentEvent)) {
      showToast('La responsiva está desactivada para este evento.');
      return;
    }
    if (!isResponsivaDigitalEnabledForEvent(currentEvent)) {
      showToast('La firma digital de responsiva está desactivada. Actívala en Dashboard → Responsiva.');
      return;
    }
    if (!isResponsivaDigitalActiveForParticipant(person, currentEvent)) {
      showToast(
        'Este participante no corresponde a la configuración de firma digital por edad (revisa menores/mayores en Dashboard → Responsiva).'
      );
      return;
    }
    const ageNum = parseInt(person.age, 10);
    const participantIsMinor = participantAgeBracketForResponsiva(ageNum) === 'minor';
    const waPhone = getResponsivaWhatsAppTargetPhone(person);
    if (!waPhone) {
      showToast(
        participantIsMinor
          ? 'No hay número válido para WhatsApp. Completa el teléfono de emergencia (tutor o responsable) o el teléfono del registro.'
          : 'No hay número válido para WhatsApp. Completa el teléfono principal del registro (o el de emergencia si no hay).'
      );
      return;
    }
    const priorResponsivaInvites = getWhatsAppMessageHistoryRows(person).filter(
      (t) => String(t?.kind || '') === 'responsiva_invite'
    ).length;
    const remindMandatorySignature =
      priorResponsivaInvites >= 1 && registrationRequiresResponsivaStatus(person, currentEvent);
    setResponsivaLinkBusyId(String(person.id));
    try {
      const pRef = getDocRef('app_participants', String(person.id));
      const pSnap = await getDoc(pRef);
      if (!pSnap.exists()) {
        showToast('Registro no encontrado.');
        return;
      }
      const previousData = cloneFirestoreDocDataForRevert(pSnap.data());
      const snapData = pSnap.data();
      const { signUrl } = await createResponsivaSignTokenDoc({
        participantId: person.id, eventId: currentEvent.id, });
      const url = signUrl || getResponsivaSignPageUrl(docId);
      const msg = buildResponsivaInviteWhatsAppText({
        minorName: person.name, eventName: currentEvent.name, avisoUrl: privacyNoticePublicUrl, });
      const nextRd = {
        ...(typeof snapData.responsivaDigital === 'object' && snapData.responsivaDigital ? snapData.responsivaDigital : {}), lastSignLinkSentAt: Date.now(), };
      const histToken = {
        id: `wa_hist_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, kind: 'responsiva_invite', createdAt: Date.now(), sentBy: currentUser?.username || '', loc: loc || '', eventName: currentEvent?.name || '', };
      await updateDoc(pRef, {
        responsivaDigital: nextRd, whatsAppMessageHistory: arrayUnion(histToken), ...(globalConfig?.isDebugMode ? { _isDebug: true, _debugSessionId: globalConfig.debugSessionId } : {}), });
      refreshParticipantCache(person, 'Enlace responsiva WhatsApp', {
        personId: person.id, patch: {
          responsivaDigital: nextRd,
          whatsAppMessageHistory: [
            ...(Array.isArray(person.whatsAppMessageHistory) ? person.whatsAppMessageHistory : []),
            histToken,
          ],
        }, });
      setEditRegistryModal((prev) => {
        if (!prev.data || String(prev.data.id) !== String(person.id)) return prev;
        const prevHist = Array.isArray(prev.data.whatsAppMessageHistory) ? [...prev.data.whatsAppMessageHistory] : [];
        return {
          ...prev,
          data: {
            ...prev.data,
            responsivaDigital: nextRd,
            whatsAppMessageHistory: [...prevHist, histToken],
          },
        };
      });
      window.open(buildWhatsAppMeUrl(waPhone, msg), '_blank', 'noopener,noreferrer');
      logWhatsAppSentActivity(addLog, {
        recipientName: person.name || 'menor', recipientId: person.id, channel: 'Responsiva digital', currentEvent, });
      const _respWaLog = `Envió enlace de firma digital de responsiva para ${person.name || 'menor'} (sede ${loc}).`;
      addLog(
        'Responsiva',
        _respWaLog,
        null,
        null,
        { collectionName: 'app_participants', docId: String(person.id), action: 'update', previousData }
      );
      logParticipantActivity(String(person.id), 'responsiva', _respWaLog);
      showToast('WhatsApp abierto con el enlace de firma.');
    } catch (e) {
      console.error(e);
      showToast('No se pudo generar el enlace. Intenta de nuevo.');
    } finally {
      setResponsivaLinkBusyId(null);
    }
  }, [
    currentEvent,
    currentUser?.username,
    hasEventAccess,
    hasLocationAccess,
    showToast,
    addLog,
    logParticipantActivity,
    globalConfig?.isDebugMode,
    globalConfig?.debugSessionId,
    registrationRequiresResponsivaStatus,
    refreshParticipantCache,
  ]);

  const markResponsivaLocalDelivery = useCallback(
    async (person, loc) => {
      const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
      const { anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, b, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
      const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
      const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, darkMode, dashboardHasFullLocationAccess, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, evType, event, eventDateDraft } = getScope();
      const { eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
      const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostSourceKey, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
      const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, labelClasses, legacy, limit, linkWithCredential, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
      const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, mergedPrivacyNotice } = getScope();
      const { na, needsFirestoreResyncAfterBulk, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, pathname, performAppFullBackup } = getScope();
      const { privacyNoticePublicUrl, pruneEventScopedAccessMap, query, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, secondaryAuth, sede } = getScope();
      const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
      const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView } = getScope();
      const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
      if (!person?.id || !currentEvent?.id) return;
      if (!hasEventAccess(currentEvent.id) || !hasLocationAccess(loc)) {
        showToast('No tienes permisos para actualizar este registro.');
        return;
      }
      if (!isResponsivaEnabledForEvent(currentEvent)) {
        showToast('La responsiva está desactivada para este evento.');
        return;
      }
      if (!getResponsivaRequirementApplies(person, currentEvent)) {
        showToast('Este participante no corresponde a la configuración de responsiva por edad (revisa menores/mayores en Dashboard → Responsiva).');
        return;
      }
      const ok = window.confirm(
        '¿Registrar responsiva firmada en sitio (papel entregado)?\n\nEl registro quedará como Entregada y se anotará firma local (sin imagen digital).'
      );
      if (!ok) return;
      setResponsivaLocalBusyId(String(person.id));
      try {
        const pRef = getDocRef('app_participants', String(person.id));
        const pSnap = await getDoc(pRef);
        if (!pSnap.exists()) {
          showToast('Registro no encontrado.');
          return;
        }
        const previousData = cloneFirestoreDocDataForRevert(pSnap.data());
        const snapData = pSnap.data();
        const prevRd =
          snapData.responsivaDigital && typeof snapData.responsivaDigital === 'object' ? snapData.responsivaDigital : {};
        const now = Date.now();
        const responsivaDigital = {
          ...prevRd,
          method: 'local',
          recordedAt: now,
        };
        await updateDoc(pRef, {
          responsivaStatus: 'Entregada',
          responsivaDigital,
          ...(globalConfig?.isDebugMode ? { _isDebug: true, _debugSessionId: globalConfig.debugSessionId } : {}),
        });
        refreshParticipantCache(person, 'Responsiva firmada en sitio', {
          personId: person.id,
          patch: { responsivaStatus: 'Entregada', responsivaDigital },
        });
        setEditRegistryModal((prev) => {
          if (!prev.data || String(prev.data.id) !== String(person.id)) return prev;
          return {
            ...prev,
            data: {
              ...prev.data,
              responsivaStatus: 'Entregada',
              responsivaDigital,
            },
          };
        });
        const _respLocLog = `Registró responsiva firmada en sitio para ${person.name || 'participante'} (sede ${loc}).`;
        addLog(
          'Responsiva',
          _respLocLog,
          null,
          null,
          { collectionName: 'app_participants', docId: String(person.id), action: 'update', previousData }
        );
        logParticipantActivity(String(person.id), 'responsiva', _respLocLog);
        try {
          await upsertResponsivaRegistryEntry({
            eventId: currentEvent.id,
            participantId: String(person.id),
            participantName: person.name,
            location: person.location || loc,
            kind: 'local',
            submittedAt: null,
            recordedAt: now,
            signerName: null,
            signerRelationship: null,
            signatureStoragePath: null,
            signatureStorageUrl: null,
            hasSignatureImage: false,
          });
        } catch (regErr) {
          console.warn('upsertResponsivaRegistryEntry', regErr);
        }
        showToast('Responsiva local registrada como Entregada.');
      } catch (e) {
        console.error(e);
        showToast('No se pudo guardar. Intenta de nuevo.');
      } finally {
        setResponsivaLocalBusyId(null);
      }
    },
    [currentEvent, hasEventAccess, hasLocationAccess, showToast, addLog, logParticipantActivity, globalConfig?.isDebugMode, globalConfig?.debugSessionId, refreshParticipantCache]
  );

  const handleSaveEventResponsivaDigitalText = useCallback(async () => {
      const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, all, allKnownLocationNames, allParticipants } = getScope();
      const { anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, b, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
      const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
      const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, darkMode, dashboardHasFullLocationAccess, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, evType, event, eventDateDraft } = getScope();
      const { eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
      const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostSourceKey, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
      const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, labelClasses, legacy, limit, linkWithCredential, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
      const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, mergedPrivacyNotice } = getScope();
      const { na, needsFirestoreResyncAfterBulk, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, pathname, performAppFullBackup } = getScope();
      const { privacyNoticePublicUrl, pruneEventScopedAccessMap, query, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, secondaryAuth, sede } = getScope();
      const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
      const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView } = getScope();
      const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!hasAdminRights || !currentEvent?.id) return false;
    const minors = eventResponsivaTextMinorsDraft;
    const adults = eventResponsivaTextAdultsDraft;
    if (minors.length + adults.length > 80000) {
      showToast('La suma de ambos textos no puede superar 80 000 caracteres.');
      return false;
    }
    setEventResponsivaTextSaving(true);
    try {
      const derivedDigitalScope = deriveResponsivaDigitalAgeScopeFromDigitalFlags(
        eventResponsivaDigitalMinorsDraft,
        eventResponsivaDigitalAdultsDraft
      );
      await updateDoc(getDocRef('app_events', currentEvent.id), {
        responsivaDigitalTextMinors: minors.trim(),
        responsivaDigitalTextAdults: adults.trim(),
        responsivaEnabled: eventResponsivaEnabledDraft,
        responsivaDigitalEnabled: eventResponsivaDigitalEnabledDraft,
        responsivaGeneralMinorsEnabled: eventResponsivaGeneralMinorsDraft,
        responsivaGeneralAdultsEnabled: eventResponsivaGeneralAdultsDraft,
        responsivaDigitalMinorsEnabled: eventResponsivaDigitalMinorsDraft,
        responsivaDigitalAdultsEnabled: eventResponsivaDigitalAdultsDraft,
        responsivaDigitalAgeScope: derivedDigitalScope,
        ...(globalConfig?.isDebugMode ? { _isDebug: true, _debugSessionId: globalConfig.debugSessionId } : {}),
      });
      const scopeLabel =
        derivedDigitalScope === 'both'
          ? 'digital: menores y mayores'
          : derivedDigitalScope === 'adults'
            ? 'digital: solo mayores'
            : 'digital: solo menores';
      addLog(
        'Configuración',
        `Actualizó la responsiva del evento ${currentEvent.name} (global: ${eventResponsivaEnabledDraft ? 'sí' : 'no'}, firma digital: ${eventResponsivaDigitalEnabledDraft ? 'sí' : 'no'}, ${scopeLabel}; general menores: ${eventResponsivaGeneralMinorsDraft ? 'sí' : 'no'}, general mayores: ${eventResponsivaGeneralAdultsDraft ? 'sí' : 'no'}).`
      );
      showToast('Texto de responsiva guardado.');
      return true;
    } catch (e) {
      console.error(e);
      showToast('No se pudo guardar el texto.');
      return false;
    } finally {
      setEventResponsivaTextSaving(false);
    }
  }, [
    hasAdminRights,
    currentEvent,
    eventResponsivaTextMinorsDraft,
    eventResponsivaTextAdultsDraft,
    eventResponsivaEnabledDraft,
    eventResponsivaDigitalEnabledDraft,
    eventResponsivaGeneralMinorsDraft,
    eventResponsivaGeneralAdultsDraft,
    eventResponsivaDigitalMinorsDraft,
    eventResponsivaDigitalAdultsDraft,
    globalConfig?.isDebugMode,
    globalConfig?.debugSessionId,
    addLog,
    showToast,
  ]);

  const getProcessedParticipantsForLocation = useCallback((loc) => {
      const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, all, allKnownLocationNames, allParticipants } = getScope();
      const { anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, b, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
      const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
      const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, darkMode, dashboardHasFullLocationAccess, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, evType, event, eventDateDraft } = getScope();
      const { eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
      const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostSourceKey, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
      const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, labelClasses, legacy, limit, linkWithCredential, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
      const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, mergedPrivacyNotice } = getScope();
      const { na, needsFirestoreResyncAfterBulk, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, pathname, performAppFullBackup } = getScope();
      const { privacyNoticePublicUrl, pruneEventScopedAccessMap, query, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, secondaryAuth, sede } = getScope();
      const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
      const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView } = getScope();
      const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    return getScope().applyRosterLikeFilters(data[loc] || []);
  }, [data, applyRosterLikeFilters]);

  const handleAddLocation = async () => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, all, allKnownLocationNames, allParticipants } = getScope();
    const { anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, b, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, darkMode, dashboardHasFullLocationAccess, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, evType, event, eventDateDraft } = getScope();
    const { eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostSourceKey, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, labelClasses, legacy, limit, linkWithCredential, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, mergedPrivacyNotice } = getScope();
    const { na, needsFirestoreResyncAfterBulk, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, pathname, performAppFullBackup } = getScope();
    const { privacyNoticePublicUrl, pruneEventScopedAccessMap, query, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView } = getScope();
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    const loc = newLocationName.trim();
    if (!loc || !currentEvent || currentEvent.locations.includes(loc)) return;
    const newLocations = [...currentEvent.locations, loc];
    const newRegStatus = { ...currentEvent.regStatus, [loc]: true };
    const newLocationCaps = { ...(currentEvent.locationCaps || {}), [loc]: 0 };
    const evId = currentEvent.id;
    const evName = currentEvent.name;
    try {
      await getScope().updateEventConfig({ locations: newLocations, regStatus: newRegStatus, locationCaps: newLocationCaps });
    } catch (e) {
      console.error(e);
      showToast('No se pudo guardar la sede. Revisa conexión o permisos.');
      return;
    }
    addLog('Gestión de Sedes', `Añadió la nueva sede: ${loc} al evento ${evName}`, null, null, { collectionName: 'app_events', docId: evId, action: 'update', previousData: currentEvent });
    setNewLocationName('');
    setIsAddLocModalOpen(false);
    /** Espera al snapshot de `app_events` antes de cambiar de pestaña (evita rutas/permisos con lista de sedes vieja y parpadeos). */
    const waitThenGo = (attempts = 0) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
      const ev = eventsRef.current.find((e) => String(e.id) === String(evId));
      if (ev?.locations?.includes(loc)) {
        goTo(systemView, selectedEventId, loc);
        showToast('Sede añadida.');
        return;
      }
      if (attempts > 150) {
        goTo(systemView, selectedEventId, 'Summary');
        showToast('Sede añadida. Abre la sede desde el menú lateral si la vista no cambió.');
        return;
      }
      requestAnimationFrame(() => waitThenGo(attempts + 1));
    };
    requestAnimationFrame(() => waitThenGo(0));
  };

  const handleDeleteLocation = async (loc) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, all, allKnownLocationNames, allParticipants } = getScope();
    const { anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, b, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, darkMode, dashboardHasFullLocationAccess, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, evType, event, eventDateDraft } = getScope();
    const { eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostSourceKey, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, labelClasses, legacy, limit, linkWithCredential, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, mergedPrivacyNotice } = getScope();
    const { na, needsFirestoreResyncAfterBulk, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, pathname, performAppFullBackup } = getScope();
    const { privacyNoticePublicUrl, pruneEventScopedAccessMap, query, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView } = getScope();
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!currentEvent) return;
    const hasParticipants = allParticipants.some(
      (p) => p.eventId === currentEvent.id && p.location === loc && participantIsActiveInEvent(p)
    );
    if (hasParticipants) { setLocError(loc); setTimeout(() => setLocError(''), 3000); return; }
    const newLocations = currentEvent.locations.filter(l => l !== loc);
    const newRegStatus = { ...currentEvent.regStatus };
    const newLocationCaps = { ...(currentEvent.locationCaps || {}) };
    const newCardByLoc = { ...(currentEvent.cardPaymentByLocation || {}) };
    delete newRegStatus[loc];
    delete newLocationCaps[loc];
    delete newCardByLoc[loc];
    const evId = currentEvent.id;
    const evName = currentEvent.name;
    try {
      await getScope().updateEventConfig({
        locations: newLocations,
        regStatus: newRegStatus,
        locationCaps: newLocationCaps,
        cardPaymentByLocation: newCardByLoc,
      });
    } catch (e) {
      console.error(e);
      showToast('No se pudo eliminar la sede. Revisa conexión o permisos.');
      return;
    }
    addLog('Gestión de Sedes', `Eliminó la sede vacía: ${loc} del evento ${evName}`, null, null, { collectionName: 'app_events', docId: evId, action: 'update', previousData: currentEvent });
    const waitThenSummary = (attempts = 0) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
      const ev = eventsRef.current.find((e) => String(e.id) === String(evId));
      const gone = !ev?.locations?.includes(loc);
      if (gone || attempts > 150) {
        goTo(systemView, selectedEventId, 'Summary');
        showToast('Sede eliminada.');
        return;
      }
      requestAnimationFrame(() => waitThenSummary(attempts + 1));
    };
    requestAnimationFrame(() => waitThenSummary(0));
  };


  const handleAddCustomField = async () => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, all, allKnownLocationNames, allParticipants } = getScope();
    const { anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, b, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, darkMode, dashboardHasFullLocationAccess, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, evType, event, eventDateDraft } = getScope();
    const { eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostSourceKey, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, labelClasses, legacy, limit, linkWithCredential, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, mergedPrivacyNotice } = getScope();
    const { na, needsFirestoreResyncAfterBulk, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, pathname, performAppFullBackup } = getScope();
    const { privacyNoticePublicUrl, pruneEventScopedAccessMap, query, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView } = getScope();
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!newCustomField.trim() || !currentEvent) return;
    const currentFields = currentEvent.customFields || [];
    if (currentFields.includes(newCustomField.trim())) return;
    const updated = [...currentFields, newCustomField.trim()];
    await getScope().updateEventConfig({ customFields: updated });
    addLog('Campos Extra', `Añadió el campo "${newCustomField.trim()}" al evento.`, null, null, { collectionName: 'app_events', docId: currentEvent.id, action: 'update', previousData: currentEvent });
    setNewCustomField('');
  };

  const handleRemoveCustomField = async (field) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, all, allKnownLocationNames, allParticipants } = getScope();
    const { anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, b, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, darkMode, dashboardHasFullLocationAccess, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, evType, event, eventDateDraft } = getScope();
    const { eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostSourceKey, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, labelClasses, legacy, limit, linkWithCredential, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, mergedPrivacyNotice } = getScope();
    const { na, needsFirestoreResyncAfterBulk, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, pathname, performAppFullBackup } = getScope();
    const { privacyNoticePublicUrl, pruneEventScopedAccessMap, query, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView } = getScope();
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!currentEvent) return;
    const updated = (currentEvent.customFields || []).filter(f => f !== field);
    await getScope().updateEventConfig({ customFields: updated });
    addLog('Campos Extra', `Eliminó el campo "${field}" del evento.`, null, null, { collectionName: 'app_events', docId: currentEvent.id, action: 'update', previousData: currentEvent });
  };

  const handleAddEntry = async (loc, entrySource) => {
    const mod = await import('./handlers/registrationWriteHandlers.js');
    return mod.runAddEntry(getScope, loc, entrySource);
  };

  const handleAddToWaitlist = async (loc, _calledInternally = false, waitlistOptions = null, entrySource) => {
    const mod = await import('./handlers/registrationWriteHandlers.js');
    return mod.runAddToWaitlist(getScope, loc, _calledInternally, waitlistOptions, entrySource);
  };

  const resetEditRegistryModal = () => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
    const { anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, b, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, darkMode, dashboardHasFullLocationAccess, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, evType, event, eventDateDraft } = getScope();
    const { eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostSourceKey, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, labelClasses, legacy, limit, linkWithCredential, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, mergedPrivacyNotice } = getScope();
    const { na, needsFirestoreResyncAfterBulk, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, pathname, performAppFullBackup } = getScope();
    const { privacyNoticePublicUrl, pruneEventScopedAccessMap, query, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView } = getScope();
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    setEditRegistryModal({ isOpen: false, loc: '', data: null, variant: 'modal' });
    setEditRegDraftCarMeta({});
    setEditPreferredServeDropdownOpen(false);
    setEditServedAreasDropdownOpen(false);
    setRosterInlineEditExpandedId((prevId) => {
      if (prevId != null) {
        const pid = String(prevId);
        setRosterExpandEditOnlyIds((prev) => {
          if (!prev.has(pid)) return prev;
          const next = new Set(prev);
          next.delete(pid);
          return next;
        });
      }
      return null;
    });
    setSpouseLinkSearchEdit('');
    editRegistryInlineBaselineRef.current = null;
    pendingInlineEditScrollRef.current = null;
  };
  if (resetEditRegistryModalRef) {
    resetEditRegistryModalRef.current = resetEditRegistryModal;
  }

  const navEditDismissAnchorRef = useRef({ systemView, selectedEventId, activeTab });
  useEffect(() => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, all, allKnownLocationNames, allParticipants } = getScope();
    const { anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, b, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, darkMode, dashboardHasFullLocationAccess, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, evType, event, eventDateDraft } = getScope();
    const { eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostSourceKey, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, labelClasses, legacy, limit, linkWithCredential, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, mergedPrivacyNotice } = getScope();
    const { na, needsFirestoreResyncAfterBulk, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, pathname, performAppFullBackup } = getScope();
    const { privacyNoticePublicUrl, pruneEventScopedAccessMap, query, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView } = getScope();
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    const prev = navEditDismissAnchorRef.current;
    const nextNav = { systemView, selectedEventId, activeTab };
    const navChanged =
      prev.systemView !== nextNav.systemView ||
      String(prev.selectedEventId ?? '') !== String(nextNav.selectedEventId ?? '') ||
      prev.activeTab !== nextNav.activeTab;
    navEditDismissAnchorRef.current = nextNav;
    if (!navChanged) return;

    const m = editRegistryModalRef.current;
    if (!m?.isOpen) return;

    if (m.variant === 'inline' && m.data?.id != null) {
      const pid = m.data.id;
      resetEditRegistryModalRef.current();
      setExpandedRows((prevRows) => {
        const nextRows = new Set(prevRows);
        nextRows.delete(pid);
        return nextRows;
      });
    } else {
      resetEditRegistryModalRef.current();
    }
  }, [systemView, selectedEventId, activeTab]);

  const handleUpdateEntry = async (e) => {
    const mod = await import('./handlers/registrationWriteHandlers.js');
    return mod.runUpdateEntry(getScope, e);
  };


  const executeBautizosPartyCancelArchivePlan = async (_plan) => {
    return;
  };
  const performArchiveRosterEntry = async (loc, id, bautizosOpts = null) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, all, allKnownLocationNames, allParticipants } = getScope();
    const { anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, b, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, darkMode, dashboardHasFullLocationAccess, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, evType, event, eventDateDraft } = getScope();
    const { eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostSourceKey, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, labelClasses, legacy, limit, linkWithCredential, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, mergedPrivacyNotice } = getScope();
    const { na, needsFirestoreResyncAfterBulk, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, pathname, performAppFullBackup } = getScope();
    const { privacyNoticePublicUrl, pruneEventScopedAccessMap, query, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView } = getScope();
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    const person =
      (data[loc] || []).find((p) => String(p.id) === String(id)) ||
      (cancelledData[loc] || []).find((p) => String(p.id) === String(id));
    if (!person) return;

    if (bautizosOpts?.plan) {
      await executeBautizosPartyCancelArchivePlan({ ...bautizosOpts.plan, action: 'archive_roster', loc });
      showToast('Registro archivado. Puedes precargar estos datos desde la búsqueda de perfiles.');
      return;
    }

    await getScope().archiveParticipantToFirestore(person, loc, {
      fromWaitlist: false,
      sourceKind: 'roster',
      eventDisplayName: currentEvent?.name ?? null,
    });
    const _archLog = `Archivó el registro de ${person.name} en la sede ${loc}. El ID VNPM y los datos personales permanecen en Firebase para precargar en otros eventos.`;
    addLog(
      'Eliminación de Registro',
      _archLog,
      null,
      null,
      { collectionName: 'app_participants', docId: String(id), action: 'update', previousData: person }
    );
    logParticipantActivity(String(id), 'archivo', _archLog);
    showToast('Registro archivado. Puedes precargar estos datos desde la búsqueda de perfiles.');
  };

  const performArchiveWaitlistEntry = async (loc, id) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, all, allKnownLocationNames, allParticipants } = getScope();
    const { anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, b, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, darkMode, dashboardHasFullLocationAccess, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, evType, event, eventDateDraft } = getScope();
    const { eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostSourceKey, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, labelClasses, legacy, limit, linkWithCredential, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, mergedPrivacyNotice } = getScope();
    const { na, needsFirestoreResyncAfterBulk, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, pathname, performAppFullBackup } = getScope();
    const { privacyNoticePublicUrl, pruneEventScopedAccessMap, query, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView } = getScope();
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    const person = (waitlistData[loc] || []).find((p) => String(p.id) === String(id));
    if (!person) return;
    await getScope().archiveParticipantToFirestore(person, loc, {
      fromWaitlist: true,
      sourceKind: 'waitlist',
      eventDisplayName: currentEvent?.name ?? null,
    });
    const _archWlLog = `Archivó a ${person.name} (lista de espera, sede ${loc}). Los datos personales siguen disponibles para precargar en otros eventos.`;
    addLog(
      'Lista de Espera',
      _archWlLog,
      null,
      null,
      { collectionName: 'app_participants', docId: String(id), action: 'update', previousData: person }
    );
    logParticipantActivity(String(id), 'archivo', _archWlLog);
    showToast('Entrada archivada. Puedes precargar estos datos desde la búsqueda de perfiles.');
  };

  const performArchiveDuplicateHintEntry = useCallback(
    async (personId) => {
      const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, all, allKnownLocationNames, allParticipants } = getScope();
      const { anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, b, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
      const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
      const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, darkMode, dashboardHasFullLocationAccess, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, evType, event, eventDateDraft } = getScope();
      const { eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
      const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostSourceKey, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
      const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, labelClasses, legacy, limit, linkWithCredential, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
      const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, mergedPrivacyNotice } = getScope();
      const { na, needsFirestoreResyncAfterBulk, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, pathname, performAppFullBackup } = getScope();
      const { privacyNoticePublicUrl, pruneEventScopedAccessMap, query, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, secondaryAuth, sede } = getScope();
      const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
      const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView } = getScope();
      const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
      const person = allParticipants.find(
        (p) => String(p.id) === String(personId) && p.eventId === currentEvent?.id
      );
      if (!person || participantIsArchived(person)) return;
      if (!participantIsActiveOrWaitlistForDuplicateHint(person)) return;
      const loc = String(person.location || '').trim() || '?';
      const fromWaitlist = participantIsWaitlistRow(person);
      await getScope().archiveParticipantToFirestore(person, loc, {
        fromWaitlist,
        sourceKind: fromWaitlist ? 'waitlist' : 'roster',
        eventDisplayName: currentEvent?.name ?? null,
      });
      const _archDupLog = `Archivó desde aviso de duplicado (SuperUsuario): ${person.name} (sede ${loc}).`;
      addLog(
        fromWaitlist ? 'Lista de Espera' : 'Eliminación de Registro',
        _archDupLog,
        null,
        null,
        { collectionName: 'app_participants', docId: String(personId), action: 'update', previousData: person }
      );
      logParticipantActivity(String(personId), 'archivo', _archDupLog);
      showToast('Registro archivado. Puedes precargar estos datos desde la búsqueda de perfiles.');
    },
    [allParticipants, currentEvent, archiveParticipantToFirestore, addLog, logParticipantActivity, showToast]
  );

  const performAcceptDuplicateCluster = useCallback(
    async (payload) => {
      const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, all, allKnownLocationNames, allParticipants } = getScope();
      const { anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, b, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
      const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
      const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, darkMode, dashboardHasFullLocationAccess, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, evType, event, eventDateDraft } = getScope();
      const { eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
      const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostSourceKey, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
      const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, labelClasses, legacy, limit, linkWithCredential, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
      const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, mergedPrivacyNotice } = getScope();
      const { na, needsFirestoreResyncAfterBulk, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, pathname, performAppFullBackup } = getScope();
      const { privacyNoticePublicUrl, pruneEventScopedAccessMap, query, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, secondaryAuth, sede } = getScope();
      const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
      const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView } = getScope();
      const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
      const { memberIds, ackKeys, reasons } = payload || {};
      if (!Array.isArray(memberIds) || memberIds.length < 2) {
        showToast('Grupo de duplicado no válido.');
        return;
      }
      if (!hasAdminRights || currentUser?.role === 'Lector') {
        showToast('Solo administradores pueden autorizar duplicados.');
        return;
      }
      if (!hasEventAccess(currentEvent?.id)) {
        showToast('No tienes permisos para este evento.');
        return;
      }
      const keys = (ackKeys || []).filter(Boolean);
      const reasonLine = Array.isArray(reasons) && reasons.length ? reasons.join('; ') : 'duplicado';
      const when = new Date().toLocaleString('es-MX');
      const byUser = currentUser?.username || 'usuario';
      for (const pid of memberIds) {
        const fresh = allParticipants.find(
          (p) => String(p.id) === String(pid) && p.eventId === currentEvent?.id
        );
        if (!fresh || participantIsArchived(fresh)) continue;
        const loc = String(fresh.location || '').trim();
        if (loc && !hasLocationAccess(loc)) {
          showToast('No tienes permiso en una de las sedes de los registros del grupo.');
          return;
        }
      }
      const batch = writeBatch(db);
      let pendingUpdates = 0;
      for (const pid of memberIds) {
        const fresh = allParticipants.find(
          (p) => String(p.id) === String(pid) && p.eventId === currentEvent?.id
        );
        if (!fresh || participantIsArchived(fresh)) continue;
        const others = memberIds.filter((id) => String(id) !== String(pid));
        const otherBits = others
          .map((oid) => {
            const o = allParticipants.find(
              (p) => String(p.id) === String(oid) && p.eventId === currentEvent?.id
            );
            return `${o?.name || '(sin nombre)'} (doc ${oid})`;
          })
          .join('; ');
        const text = `Duplicado autorizado por ${byUser} el ${when}. Otro(s) registro(s) en el mismo aviso: ${otherBits}. Criterios detectados: ${reasonLine}.`;
        const prev = Array.isArray(fresh.registrationComments) ? [...fresh.registrationComments] : [];
        const item = {
          id: `rc_dup_${Date.now()}_${pid}_${Math.random().toString(36).slice(2, 10)}`,
          text,
          createdAt: Date.now(),
          createdBy: byUser,
        };
        const ref = getDocRef('app_participants', String(pid));
        const patch = {
          registrationComments: [...prev, item],
        };
        if (keys.length) patch.duplicateAlertAcknowledgedKeys = arrayUnion(...keys);
        batch.update(ref, patch);
        pendingUpdates += 1;
        const _log = `Autorizó duplicado y añadió comentario en ${fresh.name} (sede ${fresh.location || '?'}): ${reasonLine}`;
        addLog('Comentarios', null, null, {
          collectionName: 'app_participants',
          docId: String(pid),
          action: 'update',
          previousData: fresh,
        });
        logParticipantActivity(String(pid), 'comentario', _log);
      }
      if (pendingUpdates === 0) {
        showToast('No quedaron registros activos en el grupo para autorizar.');
        return;
      }
      await batch.commit();
      const bumpLocs = new Set();
      for (const pid of memberIds) {
        const fresh = allParticipants.find(
          (p) => String(p.id) === String(pid) && p.eventId === currentEvent?.id
        );
        if (fresh?.location) bumpLocs.add(String(fresh.location).trim());
      }
      showToast('Duplicado autorizado: se añadieron comentarios y el aviso dejará de mostrarse para este grupo.');
    },
    [
      addLog,
      logParticipantActivity,
      allParticipants,
      currentEvent?.id,
      currentUser?.role,
      currentUser?.username,
      hasAdminRights,
      hasEventAccess,
      hasLocationAccess,
      showToast,
    ]
  );

  const openEditRegistryModalForPerson = useCallback(
    (person, loc, variant = 'modal') => {
      const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, all, allKnownLocationNames, allParticipants } = getScope();
      const { anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, b, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
      const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
      const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, darkMode, dashboardHasFullLocationAccess, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, evType, event, eventDateDraft } = getScope();
      const { eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
      const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostSourceKey, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
      const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, labelClasses, legacy, limit, linkWithCredential, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
      const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, mergedPrivacyNotice } = getScope();
      const { na, needsFirestoreResyncAfterBulk, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, pathname, performAppFullBackup } = getScope();
      const { privacyNoticePublicUrl, pruneEventScopedAccessMap, query, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, secondaryAuth, sede } = getScope();
      const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
      const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView } = getScope();
      const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
      if (currentUser?.role === 'Lector') return;
      const effectiveVariant = isDesktopRosterViewport() ? 'modal' : variant;
      setSpouseLinkSearchEdit('');
      setEditPrivacyAck(false);
      if (effectiveVariant === 'modal') {
        setRosterInlineEditExpandedId(null);
        editRegistryInlineBaselineRef.current = null;
        pendingInlineEditScrollRef.current = null;
      }
      const draft = createEditRegistryDraft(person, loc);
      setEditRegDraftCarMeta({});
      setEditRegistryModal({
        isOpen: true,
        variant: effectiveVariant,
        loc,
        data: draft,
      });
    },
    [currentUser?.role, createEditRegistryDraft]
  );

  const performCancelEntry = async (loc, id, bautizosOpts = null) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, all, allKnownLocationNames, allParticipants } = getScope();
    const { anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, b, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, darkMode, dashboardHasFullLocationAccess, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, evType, event, eventDateDraft } = getScope();
    const { eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostSourceKey, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, labelClasses, legacy, limit, linkWithCredential, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, mergedPrivacyNotice } = getScope();
    const { na, needsFirestoreResyncAfterBulk, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, pathname, performAppFullBackup } = getScope();
    const { privacyNoticePublicUrl, pruneEventScopedAccessMap, query, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView } = getScope();
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    const person =
      (data[loc] || []).find((p) => String(p.id) === String(id)) ||
      (waitlistData[loc] || []).find((p) => String(p.id) === String(id));
    if (!person || participantIsCancelled(person)) return;

    if (bautizosOpts?.plan) {
      await executeBautizosPartyCancelArchivePlan({ ...bautizosOpts.plan, action: 'cancel_entry', loc });
      showToast('Registro dado de baja. Ya no cuenta en inscritos/becados/servidores.');
      return;
    }

    const cancelledAt = Date.now();
    const refundPendingAmount = Math.max(0, parseFloat(person.paid || 0) || 0);
    const participantRef = getDocRef('app_participants', String(id));
    const serverSnap = await getDoc(participantRef);
    const serverWa = serverSnap.exists()
      ? serverSnap.data()?.whatsAppFinanceNotifications
      : undefined;
    const existingNotifications = Array.isArray(serverWa)
      ? [...serverWa]
      : Array.isArray(person.whatsAppFinanceNotifications)
        ? [...person.whatsAppFinanceNotifications]
        : [];
    const bajaNotification = {
      id: `wa-bja-cancel-${cancelledAt}`,
      kind: 'baja',
      amount: 0,
      pendingAmount: 0,
      isLiquidado: false,
      createdAt: cancelledAt,
      sent: false,
      sentAt: null,
      message: buildBajaWhatsAppMessage({
        person,
        loc,
        reportedAtMs: cancelledAt,
        eventSnapshot: currentEvent,
      }),
    };
    /** Siempre se agrega un aviso nuevo: antes se sobrescribía el último pendiente y se perdían registro/abono para el merge. */
    existingNotifications.push(bajaNotification);
    const payload = {
      status: PARTICIPANT_STATUS_CANCELLED,
      cancelledAt,
      cancelledFromLocation: loc,
      refundPendingAmount,
      refundAsDonation: false,
      whatsAppFinanceNotifications: existingNotifications,
      ...(globalConfig?.isDebugMode ? { _isDebug: true, _debugSessionId: globalConfig.debugSessionId } : {}),
    };
    await updateDoc(participantRef, payload);
    refreshParticipantCache(person, 'Baja de registro', { personId: id, patch: payload });
    const _bajaLog = `Dio de baja a ${person.name} en ${loc}.${refundPendingAmount > 0 ? ` Pendiente de devolución: $${refundPendingAmount}.` : ''}`;
    addLog(
      'Baja de Registro',
      _bajaLog,
      null,
      null,
      { collectionName: 'app_participants', docId: String(id), action: 'update', previousData: person }
    );
    logParticipantActivity(String(id), 'baja', _bajaLog);
    showToast('Registro dado de baja. Ya no cuenta en inscritos/becados/servidores.');
  };

  const handleDeleteResponsivaManually = useCallback(
    async (person) => {
      const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, all, allKnownLocationNames, allParticipants } = getScope();
      const { anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, b, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
      const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
      const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, darkMode, dashboardHasFullLocationAccess, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, evType, event, eventDateDraft } = getScope();
      const { eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
      const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostSourceKey, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
      const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, labelClasses, legacy, limit, linkWithCredential, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
      const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, mergedPrivacyNotice } = getScope();
      const { na, needsFirestoreResyncAfterBulk, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, pathname, performAppFullBackup } = getScope();
      const { privacyNoticePublicUrl, pruneEventScopedAccessMap, query, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, secondaryAuth, sede } = getScope();
      const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
      const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView } = getScope();
      const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
      if (!isSuperUser || !person) return;
      const id = String(person.id);
      const previousData = { ...person };
      try {
        await removeResponsivaArtifactsForParticipant({
          eventId: person.eventId,
          participantId: id,
          responsivaDigital: person.responsivaDigital,
        });
        await updateDoc(getDocRef('app_participants', id), {
          responsivaStatus: deleteField(),
          responsivaDigital: deleteField(),
          emergencyPhoneResponsiva: deleteField(),
          emergencyContactResponsiva: deleteField(),
          ...(globalConfig?.isDebugMode ? { _isDebug: true, _debugSessionId: globalConfig.debugSessionId } : {}),
        });
        const _delRespLog = `Eliminó la responsiva del registro de ${person.name || id} (SuperUsuario, sede ${person.location || '—'}).`;
        addLog(
          'Responsiva',
          _delRespLog,
          null,
          null,
          { collectionName: 'app_participants', docId: id, action: 'update', previousData }
        );
        logParticipantActivity(id, 'responsiva', _delRespLog);
        showToast('Responsiva eliminada.');
      } catch (e) {
        console.error(e);
        showToast('No se pudo eliminar la responsiva.');
      }
    },
    [isSuperUser, addLog, logParticipantActivity, showToast, globalConfig?.isDebugMode, globalConfig?.debugSessionId]
  );

  const performDeletePaymentHistoryRow = async (m) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, all, allKnownLocationNames, allParticipants } = getScope();
    const { anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, b, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, darkMode, dashboardHasFullLocationAccess, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, evType, event, eventDateDraft } = getScope();
    const { eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostSourceKey, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, labelClasses, legacy, limit, linkWithCredential, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, mergedPrivacyNotice } = getScope();
    const { na, needsFirestoreResyncAfterBulk, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, pathname, performAppFullBackup } = getScope();
    const { privacyNoticePublicUrl, pruneEventScopedAccessMap, query, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView } = getScope();
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!hasEventAccess(currentEvent?.id) || !hasLocationAccess(m.loc)) {
      showToast('No tienes permisos para esta sede o evento.');
      return;
    }
    const person = allParticipants.find((p) => String(p.id) === String(m.personId));
    if (!person) {
      showToast('Participante no encontrado.');
      return;
    }
    if (participantIsCancelled(person)) {
      showToast('No puedes modificar pagos de un registro dado de baja.');
      return;
    }
    const hist = [...(person.paymentHistory || [])];
    if (m.paymentIndex == null || m.paymentIndex < 0 || m.paymentIndex >= hist.length) {
      showToast('Movimiento no encontrado.');
      return;
    }
    const row = hist[m.paymentIndex];
    if (!row || row.kind === 'comment') {
      showToast('Este movimiento no se puede eliminar así.');
      return;
    }
    if (row.kind === REFUND_DISBURSEMENT_PAYMENT_KIND) {
      showToast('No puedes eliminar una devolución registrada desde el historial.');
      return;
    }
    if (!userCanDeletePaymentHistoryRow(currentUser, row, { isSuperUser })) {
      if (normalizeRole(currentUser?.role) === 'Editor') {
        showToast('Solo puedes eliminar abonos durante los 10 minutos posteriores al registro.');
      } else {
        showToast('No tienes permiso para eliminar este abono.');
      }
      return;
    }
    if (m.paymentRowId != null && String(row.id) !== String(m.paymentRowId)) {
      showToast('El historial cambió; vuelve a intentar.');
      return;
    }
    hist.splice(m.paymentIndex, 1);
    const { paidNet } = sumTotalsFromPaymentHistory(person, hist);
    const nextPerson = { ...person, paidNet };
    const liq = Number(getLiquidationTarget(nextPerson)) || 0;
    const refundDiff = Math.max(0, (parseFloat(paid) || 0) - liq);
    const payload = {
      paymentHistory: hist, paidNet, refundPendingReason:
        refundDiff > 0 ? (person.registeredCostManual === true ? 'manual_cost_credit' : 'campaign_discount') : '', ...(globalConfig?.isDebugMode ? { _isDebug: true, _debugSessionId: globalConfig.debugSessionId } : {}), };
    await updateDoc(
      getDocRef('app_participants', String(person.id)),
      participantPatchForFirestoreWrite(person, payload, deleteField)
    );
    refreshParticipantCache(person, 'Eliminar abono', { personId: person.id, patch: payload });
    const amt = Math.abs(Number(row.amount) || 0);
    const _delAbonoLog = `Eliminó un abono del historial ($${amt.toLocaleString('es-MX', { minimumFractionDigits: 2 })}) para ${person.name} en ${m.loc || person.location || '?'}. Total pagado: $${paid.toLocaleString('es-MX', { minimumFractionDigits: 2 })}.`;
    addLog(
      'Finanzas',
      _delAbonoLog,
      null,
      null,
      { collectionName: 'app_participants', docId: String(person.id), action: 'update', previousData: person },
      { entityType: 'payment', entityId: String(person.id), status: LOG_STATUS.OK, snapshot: { kind: 'abono_eliminado', personId: String(person.id), personName: person.name, deletedRow: row, paymentHistory: hist, paidAfter: paid } }
    );
    logParticipantActivity(String(person.id), 'finanzas', _delAbonoLog);
    showToast('Abono eliminado del historial.');
  };

  const openDeletePaymentHistoryRowConfirm = (person, personLoc, paymentIndex) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, all, allKnownLocationNames, allParticipants } = getScope();
    const { anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, b, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, darkMode, dashboardHasFullLocationAccess, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, evType, event, eventDateDraft } = getScope();
    const { eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostSourceKey, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, labelClasses, legacy, limit, linkWithCredential, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, mergedPrivacyNotice } = getScope();
    const { na, needsFirestoreResyncAfterBulk, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, pathname, performAppFullBackup } = getScope();
    const { privacyNoticePublicUrl, pruneEventScopedAccessMap, query, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView } = getScope();
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (registryConfirmBusy) return;
    if (!hasEventAccess(currentEvent?.id) || !hasLocationAccess(personLoc)) {
      showToast('No tienes permisos para esta sede o evento.');
      return;
    }
    const hist = Array.isArray(person?.paymentHistory) ? person.paymentHistory : [];
    const row = hist[paymentIndex];
    if (!row || row.kind === 'comment') return;
    if (!userCanDeletePaymentHistoryRow(currentUser, row, { isSuperUser })) {
      if (normalizeRole(currentUser?.role) === 'Editor') {
        showToast('Solo puedes eliminar abonos durante los 10 minutos posteriores al registro.');
      } else {
        showToast('No tienes permiso para eliminar este abono.');
      }
      return;
    }
    setRegistryConfirmModal({
      isOpen: true,
      type: 'delete_payment_history_row',
      loc: personLoc || person.location || '',
      personId: String(person.id),
      personName: person.name || 'este registro',
      donationId: '',
      donationAmount: Math.abs(Number(row.amount) || 0),
      refundAmount: 0,
      paymentIndex,
      paymentRowId: row.id != null ? row.id : null,
      fromDuplicateDiagnostic: false,
      duplicateReasonsLine: '',
      dupAcceptCluster: null,
    });
  };

  const closeRegistryConfirmModal = () => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, all, allKnownLocationNames, allParticipants } = getScope();
    const { anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, b, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, darkMode, dashboardHasFullLocationAccess, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, evType, event, eventDateDraft } = getScope();
    const { eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostSourceKey, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, labelClasses, legacy, limit, linkWithCredential, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, mergedPrivacyNotice } = getScope();
    const { na, needsFirestoreResyncAfterBulk, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, pathname, performAppFullBackup } = getScope();
    const { privacyNoticePublicUrl, pruneEventScopedAccessMap, query, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView } = getScope();
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    setRegistryConfirmModal({
      isOpen: false,
      type: null,
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
      dupAcceptCluster: null,
      ...REGISTRY_CONFIRM_BAUTIZOS_EMPTY,
    });
  };

  const openPermanentDeleteArchivedParticipantConfirm = (person) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, all, allKnownLocationNames, allParticipants } = getScope();
    const { anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, b, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, darkMode, dashboardHasFullLocationAccess, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, evType, event, eventDateDraft } = getScope();
    const { eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostSourceKey, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, labelClasses, legacy, limit, linkWithCredential, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, mergedPrivacyNotice } = getScope();
    const { na, needsFirestoreResyncAfterBulk, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, pathname, performAppFullBackup } = getScope();
    const { privacyNoticePublicUrl, pruneEventScopedAccessMap, query, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView } = getScope();
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!isSuperUser || registryConfirmBusy) return;
    if (!person || !participantIsArchived(person)) return;
    setRegistryConfirmModal({
      isOpen: true,
      type: 'delete_archived_record',
      loc: '',
      personId: String(person.id),
      personName: person.name || 'este registro',
      donationId: '',
      donationAmount: 0,
      refundAmount: 0,
      paymentIndex: null,
      paymentRowId: null,
      fromDuplicateDiagnostic: false,
      duplicateReasonsLine: '',
      dupAcceptCluster: null,
    });
  };

  const performPermanentDeleteArchivedParticipant = async (personId) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, all, allKnownLocationNames, allParticipants } = getScope();
    const { anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, b, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, darkMode, dashboardHasFullLocationAccess, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, evType, event, eventDateDraft } = getScope();
    const { eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostSourceKey, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, labelClasses, legacy, limit, linkWithCredential, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, mergedPrivacyNotice } = getScope();
    const { na, needsFirestoreResyncAfterBulk, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, pathname, performAppFullBackup } = getScope();
    const { privacyNoticePublicUrl, pruneEventScopedAccessMap, query, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView } = getScope();
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
  	  try {
  		// 1. Find the merged record from the merged list to get all source IDs
  		const mergedRecord = mergedArchivedParticipantsForView.find(
  		  (p) => String(p.id) === String(personId)
  		);

  		// 2. Determine all participant IDs to delete
  		let participantIdsToDelete = [];

  		if (mergedRecord && mergedRecord._sourceParticipantIds && mergedRecord._sourceParticipantIds.length > 0) {
  		  // Use the merged record's source IDs (covers all duplicates)
  		  participantIdsToDelete = [...mergedRecord._sourceParticipantIds];
  		} else {
  		  // Fallback: just the single personId (non-merged or lookup failed)
  		  participantIdsToDelete = [personId];
  		}

  		console.log(`[PermanentDelete] Deleting ${participantIdsToDelete.length} underlying docs for merged record ${personId}:`, participantIdsToDelete);

  		// 3. Delete all underlying app_participants documents and their linked donations
  		for (const pid of participantIdsToDelete) {
  		  // Find the actual participant in allParticipants (raw, unmerged)
  		  const rawParticipant = allParticipants.find((p) => String(p.id) === String(pid));

  		  if (rawParticipant) {
  			await removeResponsivaArtifactsForParticipant({
  			  eventId: rawParticipant.eventId,
  			  participantId: pid,
  			  responsivaDigital: rawParticipant.responsivaDigital,
  			});
  			// Delete linked donations for this participant
  			const donationsRef = collection(db, 'app_donations');
  			const donationsQuery = query(donationsRef, where('participantId', '==', pid));
  			const donationsSnap = await getDocs(donationsQuery);

  			if (!donationsSnap.empty) {
  			  console.log(`[PermanentDelete] Deleting ${donationsSnap.size} donations linked to participant ${pid}`);
  			  for (const donDoc of donationsSnap.docs) {
  				await deleteDoc(doc(db, 'app_donations', donDoc.id));
  			  }
  			}

  			// Delete the app_participants document
  			await deleteDoc(doc(db, 'app_participants', pid));
  			console.log(`[PermanentDelete] Deleted app_participants/${pid}`);
  		  } else {
  			// Participant not found in local state — try deleting from Firestore directly
  			console.warn(`[PermanentDelete] Participant ${pid} not found in allParticipants, attempting direct Firestore delete`);
  			try {
  			  const pSnap = await getDoc(doc(db, 'app_participants', pid));
  			  if (pSnap.exists()) {
  				const pd = pSnap.data();
  				await removeResponsivaArtifactsForParticipant({
  				  eventId: pd.eventId,
  				  participantId: pid,
  				  responsivaDigital: pd.responsivaDigital,
  				});
  			  }
  			  await deleteDoc(doc(db, 'app_participants', pid));
  			} catch (directDeleteErr) {
  			  console.warn(`[PermanentDelete] Direct delete of ${pid} failed:`, directDeleteErr);
  			}
  		  }
  		}

  		// 4. Remove the archive profile index entry (use the merged record's primary identifiers)
  		const vnpId = mergedRecord?.vnpPersonId || null;
  		const phone = mergedRecord?.phone || null;

  		if (vnpId || phone) {
  		  await removeArchiveProfileIndexEntryIfMatches(vnpId, phone);
  		  console.log(`[PermanentDelete] Removed archive index entry for vnpPersonId=${vnpId}, phone=${phone}`);
  		}

  		const deletedIdSet = new Set(participantIdsToDelete.map((pid) => String(pid)));
  		setAllParticipants((prev) => prev.filter((p) => !deletedIdSet.has(String(p.id))));
  		const deleteBumpByEvent = new Map();
  		for (const pid of participantIdsToDelete) {
  		  const raw =
  		    allParticipants.find((p) => String(p.id) === String(pid)) ||
  		    (mergedRecord?._sourceParticipantIds?.includes(pid) ? mergedRecord : null);
  		  const evId = String(raw?.eventId || mergedRecord?.eventId || '').trim();
  		  const rawLoc = String(raw?.location || mergedRecord?.location || '').trim();
  		  if (evId && rawLoc) {
  		    if (!deleteBumpByEvent.has(evId)) deleteBumpByEvent.set(evId, new Set());
  		    deleteBumpByEvent.get(evId).add(rawLoc);
  		  }
  		}

  		// 5. Close modal and show success
  		setRegistryConfirmModal(null);
  		showToast('Registro eliminado permanentemente');

  	  } catch (err) {
  		console.error('[PermanentDelete] Error:', err);
  		showToast('Error al eliminar: ' + err.message);
  	  }
  	};

  const handleRegistryConfirmSubmit = async () => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
    const { anchor, anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, att, b, backfillActiveRosterBusy, base, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, cancelled, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, code, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, d, darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, deleted, docId, donations, downloadExcelBytes, draft, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, et, evType, event, eventDateDraft } = getScope();
    const { eventId, eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, fn, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, functions, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostId, hostSourceKey, id, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, info, inputClasses, inventory, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, key, kind, labelClasses, legacy, limit, linkWithCredential, liq, listPrice, live, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, loc, locRaw, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logList, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, loginTime, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsToRevert, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, max, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, merged, mergedPrivacyNotice, message, method, montoBecado, ms } = getScope();
    const { msg, n, na, nav, needsFirestoreResyncAfterBulk, net, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, o, others, out, p, paid, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, patch, pathname, payload, pending, performAppFullBackup, person, phone } = getScope();
    const { plan, prevSnap, previousData, privacyNoticePublicUrl, pruneEventScopedAccessMap, q, query, r, raw, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, res, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, row, rows, s, sa, scoped, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, snap, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView, t } = getScope();
    const { tabSessionId, target, toLocalISODate, toast, today, toggleDarkMode, toggleDebugMode, total, uiModal, uid, updateDoc, updatePassword, url, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, v, val, vis, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    const m = registryConfirmModal;
    if (!m.isOpen || !m.type) return;
    if (registryConfirmBusy) return;
    setRegistryConfirmBusy(true);
    // Cerrar de inmediato para evitar dobles confirmaciones por clicks rápidos.
    closeRegistryConfirmModal();
    try {
      const bautizosOpts =
        (m.type === 'cancel_entry' || m.type === 'archive_roster') &&
        Array.isArray(m.bautizosPartyTargets) &&
        m.bautizosPartyTargets.length > 0
          ? {
              selectedTargetKeys: m.bautizosSelectedTargetKeys || [],
              plan: planBautizosPartyCancelArchive({
                host:
                  allParticipants.find(
                    (p) => String(p.id) === String(m.personId) && p.eventId === currentEvent?.id
                  ) || null,
                roster: allParticipants.filter((p) => p.eventId === currentEvent?.id),
                event: currentEvent,
                selectedTargetKeys: m.bautizosSelectedTargetKeys || [],
                action: m.type,
              }),
            }
          : null;
      if (m.type === 'archive_roster') await performArchiveRosterEntry(m.loc, m.personId, bautizosOpts);
      else if (m.type === 'archive_waitlist') await performArchiveWaitlistEntry(m.loc, m.personId);
      else if (m.type === 'archive_duplicate_hint') await performArchiveDuplicateHintEntry(m.personId);
      else if (m.type === 'dup_accept_cluster' && m.dupAcceptCluster) await performAcceptDuplicateCluster(m.dupAcceptCluster);
      else if (m.type === 'companion_link_collision' && m.companionCollisionCluster)
        await performLinkCompanionCollision(m.companionCollisionCluster);
      else if (m.type === 'companion_ack_collision' && m.companionCollisionCluster)
        await performAckCompanionCollision(m.companionCollisionCluster);
      else if (m.type === 'cancel_entry') await performCancelEntry(m.loc, m.personId, bautizosOpts);
      else if (m.type === 'delete_donation' && m.donationId) await getScope().handleDeleteDonation(m.donationId);
      else if (m.type === 'remove_pending_refund' && m.personId) await removePendingRefundBySuperUser(m.personId);
      else if (m.type === 'register_refund_disbursement' && m.personId)
        await performRefundDisbursement(m.personId, m.refundMethod || 'Efectivo', Date.now());
      else if (m.type === 'delete_payment_history_row' && m.personId != null && m.paymentIndex != null)
        await performDeletePaymentHistoryRow(m);
      else if (m.type === 'delete_archived_record' && m.personId) await performPermanentDeleteArchivedParticipant(m.personId);
      else if (m.type === 'move_to_waitlist' && m.personId) await performMoveActiveEntryToWaitlist(m.loc, m.personId);
    } catch (e) {
      console.error(e);
      showToast('No se pudo completar la acción. Revisa conexión o permisos.');
    } finally {
      setRegistryConfirmBusy(false);
    }
  };

  const removeEntry = (loc, id, dupOpts = null) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
    const { anchor, anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, att, b, backfillActiveRosterBusy, base, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, cancelled, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, code, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, d, darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, deleted, docId, donations, downloadExcelBytes, draft, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, et, evType, event, eventDateDraft } = getScope();
    const { eventId, eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, fn, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, functions, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostId, hostSourceKey, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, info, inputClasses, inventory, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, key, kind, labelClasses, legacy, limit, linkWithCredential, liq, listPrice, live, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, locRaw, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logList, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, loginTime, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsToRevert, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, m, mapStaffLoginFirebaseError, max, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, merged, mergedPrivacyNotice, message, method, montoBecado, ms } = getScope();
    const { msg, n, na, nav, needsFirestoreResyncAfterBulk, net, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, o, others, out, p, paid, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, patch, pathname, payload, pending, performAppFullBackup, phone } = getScope();
    const { plan, prevSnap, previousData, privacyNoticePublicUrl, pruneEventScopedAccessMap, q, query, r, raw, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, res, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, row, rows, s, sa, scoped, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, snap, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView, t } = getScope();
    const { tabSessionId, target, toLocalISODate, toast, today, toggleDarkMode, toggleDebugMode, total, uiModal, uid, updateDoc, updatePassword, url, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, v, val, vis, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!canArchiveRegistrationsFlag) {
      showToast('Solo administradores pueden archivar registros.');
      return;
    }
    if (registryConfirmBusy) return;
    const dupLine = dupOpts?.duplicateReasonsLine || '';
    const fromDup = !!(dupOpts && dupOpts.fromDuplicate);
    const waitPerson = (waitlistData[loc] || []).find((p) => String(p.id) === String(id));
    if (waitPerson) {
      setRegistryConfirmModal({
        isOpen: true,
        type: 'archive_waitlist',
        loc,
        personId: String(id),
        personName: waitPerson.name || 'este registro',
        donationId: '',
        donationAmount: 0,
        refundAmount: 0,
        paymentIndex: null,
        paymentRowId: null,
        fromDuplicateDiagnostic: fromDup,
        duplicateReasonsLine: dupLine,
        dupAcceptCluster: null,
      });
      return;
    }
    const person =
      (data[loc] || []).find((p) => String(p.id) === String(id)) ||
      (cancelledData[loc] || []).find((p) => String(p.id) === String(id));
    if (!person) return;
    const roster = allParticipants.filter((p) => p.eventId === currentEvent?.id);
    const bautizosTargets =
      false /* Bautizos unsupported in v2 */ && bautizosPartyCancelModalApplies(person, roster, currentEvent)
        ? listBautizosPartyCancelTargets(person, roster, currentEvent)
        : [];
    const bautizosPlan =
      bautizosTargets.length > 0
        ? planBautizosPartyCancelArchive({
            host: person,
            roster,
            event: currentEvent,
            selectedTargetKeys: [],
            action: 'archive_roster',
          })
        : null;
    setRegistryConfirmModal({
      isOpen: true,
      type: 'archive_roster',
      loc,
      personId: String(id),
      personName: person.name || 'este registro',
      donationId: '',
      donationAmount: 0,
      refundAmount: 0,
      paymentIndex: null,
      paymentRowId: null,
      fromDuplicateDiagnostic: fromDup,
      duplicateReasonsLine: dupLine,
      dupAcceptCluster: null,
      ...REGISTRY_CONFIRM_BAUTIZOS_EMPTY,
      bautizosPartyTargets: bautizosTargets,
      bautizosSelectedTargetKeys: [],
      bautizosPaymentPreview: bautizosPlan?.paymentPreview || [],
      bautizosAction: bautizosTargets.length > 0 ? 'archive_roster' : null,
    });
  };

  const cancelEntry = (loc, id, dupOpts = null) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
    const { anchor, anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, att, b, backfillActiveRosterBusy, base, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, cancelled, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, code, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, d, darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, deleted, docId, donations, downloadExcelBytes, draft, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, et, evType, event, eventDateDraft } = getScope();
    const { eventId, eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, fn, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, functions, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostId, hostSourceKey, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, info, inputClasses, inventory, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, key, kind, labelClasses, legacy, limit, linkWithCredential, liq, listPrice, live, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, locRaw, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logList, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, loginTime, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsToRevert, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, m, mapStaffLoginFirebaseError, max, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, merged, mergedPrivacyNotice, message, method, montoBecado, ms } = getScope();
    const { msg, n, na, nav, needsFirestoreResyncAfterBulk, net, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, o, others, out, p, paid, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, patch, pathname, payload, pending, performAppFullBackup, phone } = getScope();
    const { plan, prevSnap, previousData, privacyNoticePublicUrl, pruneEventScopedAccessMap, q, query, r, raw, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, res, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, row, rows, s, sa, scoped, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, snap, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView, t } = getScope();
    const { tabSessionId, target, toLocalISODate, toast, today, toggleDarkMode, toggleDebugMode, total, uiModal, uid, updateDoc, updatePassword, url, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, v, val, vis, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!canCancelRegistrationsFlag) {
      showToast('No tienes permiso para dar de baja registros.');
      return;
    }
    if (registryConfirmBusy) return;
    const person =
      (data[loc] || []).find((p) => String(p.id) === String(id)) ||
      (waitlistData[loc] || []).find((p) => String(p.id) === String(id));
    if (!person || participantIsCancelled(person)) return;
    const dupLine = dupOpts?.duplicateReasonsLine || '';
    const fromDup = !!(dupOpts && dupOpts.fromDuplicate);
    const roster = allParticipants.filter((p) => p.eventId === currentEvent?.id);
    const bautizosTargets =
      false /* Bautizos unsupported in v2 */ && bautizosPartyCancelModalApplies(person, roster, currentEvent)
        ? listBautizosPartyCancelTargets(person, roster, currentEvent)
        : [];
    const bautizosPlan =
      bautizosTargets.length > 0
        ? planBautizosPartyCancelArchive({
            host: person,
            roster,
            event: currentEvent,
            selectedTargetKeys: [],
            action: 'cancel_entry',
          })
        : null;
    setRegistryConfirmModal({
      isOpen: true,
      type: 'cancel_entry',
      loc,
      personId: String(id),
      personName: person.name || 'este registro',
      donationId: '',
      donationAmount: 0,
      refundAmount: 0,
      paymentIndex: null,
      paymentRowId: null,
      fromDuplicateDiagnostic: fromDup,
      duplicateReasonsLine: dupLine,
      dupAcceptCluster: null,
      ...REGISTRY_CONFIRM_BAUTIZOS_EMPTY,
      bautizosPartyTargets: bautizosTargets,
      bautizosSelectedTargetKeys: [],
      bautizosPaymentPreview: bautizosPlan?.paymentPreview || [],
      bautizosAction: bautizosTargets.length > 0 ? 'cancel_entry' : null,
    });
  };

  const openDeleteDonationConfirm = (don) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
    const { anchor, anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, att, b, backfillActiveRosterBusy, base, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, cancelled, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, code, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, d, darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, deleted, docId, donations, downloadExcelBytes, draft, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, et, evType, event, eventDateDraft } = getScope();
    const { eventId, eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, fn, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, functions, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostId, hostSourceKey, id, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, info, inputClasses, inventory, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, key, kind, labelClasses, legacy, limit, linkWithCredential, liq, listPrice, live, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, loc, locRaw, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logList, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, loginTime, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsToRevert, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, m, mapStaffLoginFirebaseError, max, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, merged, mergedPrivacyNotice, message, method, montoBecado, ms } = getScope();
    const { msg, n, na, nav, needsFirestoreResyncAfterBulk, net, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, o, others, out, p, paid, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, patch, pathname, payload, pending, performAppFullBackup, person, phone } = getScope();
    const { plan, prevSnap, previousData, privacyNoticePublicUrl, pruneEventScopedAccessMap, q, query, r, raw, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, res, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, row, rows, s, sa, scoped, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, snap, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView, t } = getScope();
    const { tabSessionId, target, toLocalISODate, toast, today, toggleDarkMode, toggleDebugMode, total, uiModal, uid, updateDoc, updatePassword, url, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, v, val, vis, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (don._syntheticArchivedCredit) {
      showToast(
        'Esta donación es solo de seguimiento (saldo de archivo sin documento aparte). No se puede borrar aquí; el monto sigue ligado al registro archivado.'
      );
      return;
    }
    if (don._syntheticCancelledRefund) {
      showToast(
        'Esta donación es solo de seguimiento (saldo de baja sin documento aparte). No se puede borrar aquí; el monto sigue ligado al registro dado de baja.'
      );
      return;
    }
    setRegistryConfirmModal({
      isOpen: true,
      type: 'delete_donation',
      loc: '',
      personId: '',
      personName: '',
      donationId: String(don.id),
      donationAmount: parseFloat(don.amount) || 0,
      refundAmount: 0,
      paymentIndex: null,
      paymentRowId: null,
      fromDuplicateDiagnostic: false,
      duplicateReasonsLine: '',
      dupAcceptCluster: null,
    });
  };

  const reactivateEntry = async (loc, id) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
    const { anchor, anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, att, b, backfillActiveRosterBusy, base, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, cancelled, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, code, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, deleted, docId, donations, downloadExcelBytes, draft, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, et, evType, event, eventDateDraft } = getScope();
    const { eventId, eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, fn, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, functions, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostId, hostSourceKey, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, info, inputClasses, inventory, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, key, kind, labelClasses, legacy, limit, linkWithCredential, liq, listPrice, live, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, locRaw, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logList, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, loginTime, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsToRevert, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, m, mapStaffLoginFirebaseError, max, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, merged, mergedPrivacyNotice, message, method, montoBecado, ms } = getScope();
    const { msg, n, na, nav, needsFirestoreResyncAfterBulk, net, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, o, others, out, p, paid, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, patch, pathname, pending, performAppFullBackup, phone } = getScope();
    const { plan, prevSnap, previousData, privacyNoticePublicUrl, pruneEventScopedAccessMap, q, query, r, raw, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, res, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, row, rows, s, sa, scoped, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, snap, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView, t } = getScope();
    const { tabSessionId, target, toLocalISODate, toast, today, toggleDarkMode, toggleDebugMode, total, uiModal, uid, updateDoc, updatePassword, url, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, v, val, vis, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!canCancelRegistrationsFlag) {
      showToast('No tienes permiso para reactivar registros dados de baja.');
      return;
    }
    const person =
      (cancelledData[loc] || []).find((p) => String(p.id) === String(id)) ||
      (data[loc] || []).find((p) => String(p.id) === String(id));
    if (!person || !participantIsCancelled(person)) return;
    const linkedRefundDonations = donations.filter(
      (d) =>
        d.eventId === person.eventId &&
        String(d.sourceParticipantId) === String(id) &&
        d.fromCancelledRefundDonation &&
        !d._syntheticCancelledRefund
    );
    for (const d of linkedRefundDonations) {
      try {
        await deleteDoc(getDocRef('app_donations', d.id));
      } catch (e) {
        console.error(e);
      }
    }
    const paidFields = buildParticipantPaidFieldsFromHistory(person, computeNetAmountByMethod);
    const hadRefund = participantHasRefundDisbursement(person);
    const payload = {
      status: 'active',
      paid: paidFields.paid,
      paidNet: paidFields.paidNet,
      refundPendingAmount: 0,
      refundAsDonation: false,
      refundMarkedAsDonationAmount: deleteField(),
      refundMarkedAsDonationAt: deleteField(),
      reactivatedAt: Date.now(),
      ...(globalConfig?.isDebugMode ? { _isDebug: true, _debugSessionId: globalConfig.debugSessionId } : {}),
    };
    await updateDoc(getDocRef('app_participants', String(id)), payload);
    refreshParticipantCache(person, 'Reactivación', { personId: id, patch: payload });
    const refundNote = hadRefund
      ? ` Devolución histórica conservada (${formatMoney(getRefundDisbursedGrossAmount(person))}); saldo pendiente reiniciado al costo del evento.`
      : '';
    const _reactLog = `Reactivó a ${person.name} en ${loc}. Vuelve a contar en inscritos/becados/servidores.${refundNote}`;
    addLog(
      'Reactivación de Registro',
      _reactLog,
      null,
      null,
      { collectionName: 'app_participants', docId: String(id), action: 'update', previousData: person }
    );
    logParticipantActivity(String(id), 'reactivacion', _reactLog);
    showToast('Registro reactivado.');
  };

  const markCancelledRefundAsDonation = async (personId) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
    const { anchor, anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, att, b, backfillActiveRosterBusy, base, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, cancelled, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, code, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, d, darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, deleted, docId, donations, downloadExcelBytes, draft, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, et, evType, event, eventDateDraft } = getScope();
    const { eventId, eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, fn, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, functions, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostId, hostSourceKey, id, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, info, inputClasses, inventory, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, key, kind, labelClasses, legacy, limit, linkWithCredential, liq, listPrice, live, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, loc, locRaw, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logList, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, loginTime, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsToRevert, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, m, mapStaffLoginFirebaseError, max, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, merged, mergedPrivacyNotice, message, method, montoBecado, ms } = getScope();
    const { msg, n, na, nav, needsFirestoreResyncAfterBulk, net, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, o, others, out, p, paid, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, patch, pathname, payload, pending, performAppFullBackup, phone } = getScope();
    const { plan, prevSnap, previousData, privacyNoticePublicUrl, pruneEventScopedAccessMap, q, query, r, raw, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, res, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, row, rows, s, sa, scoped, secondaryAuth } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, snap, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView, t } = getScope();
    const { tabSessionId, target, toLocalISODate, toast, today, toggleDarkMode, toggleDebugMode, total, uiModal, uid, updateDoc, updatePassword, url, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, v, val, vis, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!canManageCancelledRefunds) return;
    const person = allParticipants.find((p) => String(p.id) === String(personId));
    if (!person || !participantIsCancelled(person)) return;
    if (person.refundAsDonation) {
      showToast('Este saldo ya estaba marcado como donación.');
      return;
    }
    if (participantHasRefundDisbursement(person)) {
      showToast('Este saldo ya fue devuelto; no se puede marcar como donación.');
      return;
    }
    const pendingAmount = getCancelledRefundPendingAmount(person);
    if (pendingAmount <= 0) {
      showToast('No hay saldo pendiente de devolución para marcar como donación.');
      return;
    }
    const sede = String(person.cancelledFromLocation || person.location || '').trim() || '?';
    const markedAt = Date.now();
    const refundDonationPatch = {
      refundAsDonation: true,
      refundMarkedAsDonationAt: markedAt,
      refundMarkedAsDonationAmount: pendingAmount,
      refundPendingAmount: 0,
      ...(globalConfig?.isDebugMode ? { _isDebug: true, _debugSessionId: globalConfig.debugSessionId } : {}),
    };
    await updateDoc(getDocRef('app_participants', String(personId)), refundDonationPatch);
    refreshParticipantCache(person, 'Saldo de baja como donación', {
      personId,
      patch: refundDonationPatch,
    });
    const donationId = buildFirestoreDocId(['don', 'refund', personId, markedAt], {
      fallback: `don-refund-${markedAt}`,
    });
    const donationRow = {
      id: donationId,
      eventId: currentEvent?.id,
      amount: pendingAmount,
      donorName: (person.name || '').trim() || 'Participante (baja)',
      location: sede,
      fromCancelledRefundDonation: true,
      sourceParticipantId: String(personId),
      createdAt: new Date(markedAt).toISOString(),
      createdBy: currentUser?.username || 'Desconocido',
    };
    await setDoc(getDocRef('app_donations', donationId), donationRow);
    syncDonationAfterWrite(setDonations, donationId, donationRow);
    const _donBajaLog = `Donación por saldo de baja: ${formatMoney(pendingAmount)} — ${person.name || 'Participante'} (sede ${sede}). Doc app_donations/${donationId}.`;
    await addLog(
      'Donación',
      _donBajaLog,
      null,
      null,
      { collectionName: 'app_participants', docId: String(personId), action: 'update', previousData: person }
    );
    logParticipantActivity(String(personId), 'finanzas', _donBajaLog);
    showToast('Saldo marcado como donación. Aparece en la lista de donaciones y en el balance por sede.');
  };

  const performRefundDisbursement = async (personId, method = 'Efectivo', disbursedAtMs = Date.now()) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
    const { anchor, anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, att, b, backfillActiveRosterBusy, base, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, cancelled, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, code, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, d, darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, deleted, docId, donations, downloadExcelBytes, draft, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, et, evType, event, eventDateDraft } = getScope();
    const { eventId, eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, fn, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, functions, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostId, hostSourceKey, id, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, info, inputClasses, inventory, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, key, kind, labelClasses, legacy, limit, linkWithCredential, liq, listPrice, live, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, loc, locRaw, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logList, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, loginTime, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsToRevert, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, m, mapStaffLoginFirebaseError, max, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, merged, mergedPrivacyNotice, message, montoBecado, ms } = getScope();
    const { msg, n, na, nav, needsFirestoreResyncAfterBulk, net, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, o, others, out, p, paid, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, patch, pathname, pending, performAppFullBackup, phone } = getScope();
    const { plan, prevSnap, previousData, privacyNoticePublicUrl, pruneEventScopedAccessMap, q, query, r, raw, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, res, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, row, rows, s, sa, scoped, secondaryAuth } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, snap, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView, t } = getScope();
    const { tabSessionId, target, toLocalISODate, toast, today, toggleDarkMode, toggleDebugMode, total, uiModal, uid, updateDoc, updatePassword, url, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, v, val, vis, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!canManageCancelledRefunds) return;
    const person = allParticipants.find((p) => String(p.id) === String(personId));
    if (!person || !participantIsCancelled(person)) return;
    if (person.refundAsDonation) {
      showToast('Este saldo ya fue marcado como donación.');
      return;
    }
    if (participantHasRefundDisbursement(person)) {
      showToast('Este saldo ya fue devuelto.');
      return;
    }
    const pendingAmount = getCancelledRefundPendingAmount(person);
    if (pendingAmount <= 0) {
      showToast('No hay saldo pendiente de devolución.');
      return;
    }
    const sede = resolveCancelledRefundSede(person) || '?';
    if (!hasLocationAccess(sede)) {
      showToast('No tienes permiso para registrar devoluciones en esta sede.');
      return;
    }
    const atMs = Number(disbursedAtMs);
    if (!Number.isFinite(atMs) || atMs <= 0) {
      showToast('Fecha u hora de devolución no válida.');
      return;
    }
    const refundMethod = method === 'Tarjeta' ? 'Tarjeta' : 'Efectivo';
    const refundHistoryRow = buildRefundDisbursementPaymentHistoryRow({
      personId,
      grossAmount: pendingAmount,
      method: refundMethod,
      atMs,
      registeredBy: currentUser?.username || 'Desconocido',
      computeNetAmountByMethod,
      service: getAutoPaymentService(new Date(atMs), sede !== '?' ? sede : undefined),
    });
    const payload = {
      refundPendingAmount: 0,
      refundDisbursedAt: atMs,
      refundDisbursedAmount: pendingAmount,
      refundDisbursedBy: currentUser?.username || 'Desconocido',
      refundDisbursedMethod: refundMethod,
      refundDisbursedLocation: sede,
      ...(refundHistoryRow
        ? { paymentHistory: [...(person.paymentHistory || []), refundHistoryRow] }
        : {}),
      ...(globalConfig?.isDebugMode ? { _isDebug: true, _debugSessionId: globalConfig.debugSessionId } : {}),
    };
    await updateDoc(getDocRef('app_participants', String(personId)), payload);
    refreshParticipantCache(person, 'Devolución de saldo por baja', { personId, patch: payload });
    const whenLabel = new Date(atMs).toLocaleString('es-MX');
    const _refLog = `Devolución de saldo por baja: ${formatMoney(pendingAmount)} — ${person.name || 'Participante'} (sede ${sede}, ${refundMethod}). Fecha corte: ${whenLabel}.`;
    addLog(
      'Corte de caja',
      _refLog,
      null,
      null,
      { collectionName: 'app_participants', docId: String(personId), action: 'update', previousData: person }
    );
    logParticipantActivity(String(personId), 'finanzas', _refLog);
    showToast('Devolución registrada. Aparece como egreso en el corte de caja y en el historial de pagos.');
  };

  const updateRefundDisbursementDateTime = async (personId, newAtMs) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
    const { anchor, anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, att, b, backfillActiveRosterBusy, base, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, cancelled, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, code, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, deleted, docId, donations, downloadExcelBytes, draft, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, et, evType, event, eventDateDraft } = getScope();
    const { eventId, eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, fn, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, functions, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostId, hostSourceKey, id, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, info, inputClasses, inventory, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, key, kind, labelClasses, legacy, limit, linkWithCredential, liq, listPrice, live, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, loc, locRaw, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logList, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, loginTime, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsToRevert, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, m, mapStaffLoginFirebaseError, max, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, merged, mergedPrivacyNotice, message, method, montoBecado, ms } = getScope();
    const { msg, n, na, nav, needsFirestoreResyncAfterBulk, net, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, o, others, out, p, paid, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, patch, pathname, pending, performAppFullBackup, phone } = getScope();
    const { plan, prevSnap, previousData, privacyNoticePublicUrl, pruneEventScopedAccessMap, q, query, r, raw, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, res, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, row, rows, s, sa, scoped, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, snap, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView, t } = getScope();
    const { tabSessionId, target, toLocalISODate, toast, today, toggleDarkMode, toggleDebugMode, total, uiModal, uid, updateDoc, updatePassword, url, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, v, val, vis, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!isSuperUser) return;
    const person = allParticipants.find((p) => String(p.id) === String(personId));
    if (!person || !participantHasRefundDisbursement(person)) {
      showToast('No hay devolución registrada para modificar.');
      return;
    }
    const atMs = Number(newAtMs);
    if (!Number.isFinite(atMs) || atMs <= 0) {
      showToast('Fecha u hora no válida.');
      return;
    }
    const prevAt = person.refundDisbursedAt;
    const hist = [...(person.paymentHistory || [])];
    const refundRowId = refundDisbursementPaymentHistoryId(personId);
    const refundHistIdx = hist.findIndex(
      (h) =>
        h &&
        (h.kind === REFUND_DISBURSEMENT_PAYMENT_KIND || String(h.id) === refundRowId)
    );
    const d = new Date(atMs);
    const refundSede = resolveCancelledRefundSede(person) || person.refundDisbursedLocation || person.location || '';
    const refundService = getAutoPaymentService(d, refundSede || undefined);
    if (refundHistIdx >= 0) {
      hist[refundHistIdx] = {
        ...hist[refundHistIdx],
        date: d.toLocaleString('es-MX'),
        recordedAt: d.toISOString(),
        service: refundService,
      };
    } else {
      const refundHistoryRow = buildRefundDisbursementPaymentHistoryRow({
        personId,
        grossAmount: person.refundDisbursedAmount,
        method: person.refundDisbursedMethod,
        atMs,
        registeredBy: person.refundDisbursedBy,
        computeNetAmountByMethod,
        service: refundService,
      });
      if (refundHistoryRow) hist.push(refundHistoryRow);
    }
    const payload = {
      refundDisbursedAt: atMs,
      paymentHistory: hist,
      ...(globalConfig?.isDebugMode ? { _isDebug: true, _debugSessionId: globalConfig.debugSessionId } : {}),
    };
    await updateDoc(getDocRef('app_participants', String(personId)), payload);
    refreshParticipantCache(person, 'Fecha devolución (SuperUsuario)', { personId, patch: payload });
    const _editLog = `SuperUsuario cambió fecha/hora de devolución de ${person.name || personId}: ${prevAt != null ? new Date(prevAt).toLocaleString('es-MX') : '—'} → ${new Date(atMs).toLocaleString('es-MX')}.`;
    addLog(
      'Corte de caja',
      _editLog,
      null,
      null,
      { collectionName: 'app_participants', docId: String(personId), action: 'update', previousData: person }
    );
    logParticipantActivity(String(personId), 'finanzas', _editLog);
    showToast('Fecha de devolución actualizada. El movimiento se reubicó en el corte de caja.');
  };

  const openRefundDisbursementConfirm = (p, refundMethod = 'Efectivo') => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
    const { anchor, anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, att, b, backfillActiveRosterBusy, base, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, cancelled, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, code, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, d, darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, deleted, docId, donations, downloadExcelBytes, draft, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, et, evType, event, eventDateDraft } = getScope();
    const { eventId, eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, fn, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, functions, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostId, hostSourceKey, id, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, info, inputClasses, inventory, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, key, kind, labelClasses, legacy, limit, linkWithCredential, liq, listPrice, live, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, loc, locRaw, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logList, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, loginTime, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsToRevert, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, m, mapStaffLoginFirebaseError, max, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, merged, mergedPrivacyNotice, message, method, montoBecado, ms } = getScope();
    const { msg, n, na, nav, needsFirestoreResyncAfterBulk, net, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, o, others, out, paid, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, patch, pathname, payload, pending, performAppFullBackup, phone } = getScope();
    const { plan, prevSnap, previousData, privacyNoticePublicUrl, pruneEventScopedAccessMap, q, query, r, raw, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, res, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, row, rows, s, sa, scoped, secondaryAuth } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, snap, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView, t } = getScope();
    const { tabSessionId, target, toLocalISODate, toast, today, toggleDarkMode, toggleDebugMode, total, uiModal, uid, updateDoc, updatePassword, url, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, v, val, vis, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!canManageCancelledRefunds || registryConfirmBusy) return;
    const person = allParticipants.find((x) => String(x.id) === String(p.id));
    if (!person || !participantIsCancelled(person)) return;
    const pendingAmount = getCancelledRefundPendingAmount(person);
    if (pendingAmount <= 0) return;
    const sede = resolveCancelledRefundSede(person);
    if (!hasLocationAccess(sede)) {
      showToast('No tienes permiso para registrar devoluciones en esta sede.');
      return;
    }
    setRegistryConfirmModal({
      isOpen: true,
      type: 'register_refund_disbursement',
      loc: sede,
      personId: String(p.id),
      personName: person.name || 'este registro',
      donationId: '',
      donationAmount: 0,
      refundAmount: pendingAmount,
      refundMethod: refundMethod === 'Tarjeta' ? 'Tarjeta' : 'Efectivo',
      paymentIndex: null,
      paymentRowId: null,
      fromDuplicateDiagnostic: false,
      duplicateReasonsLine: '',
      dupAcceptCluster: null,
      ...REGISTRY_CONFIRM_BAUTIZOS_EMPTY,
    });
  };

  const openRefundDateEditModal = (person) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
    const { anchor, anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, att, b, backfillActiveRosterBusy, base, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, cancelled, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, code, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, d, darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, deleted, docId, donations, downloadExcelBytes, draft, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, et, evType, event, eventDateDraft } = getScope();
    const { eventId, eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, fn, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, functions, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostId, hostSourceKey, id, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, info, inputClasses, inventory, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, key, kind, labelClasses, legacy, limit, linkWithCredential, liq, listPrice, live, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, loc, locRaw, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logList, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, loginTime, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsToRevert, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, m, mapStaffLoginFirebaseError, max, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, merged, mergedPrivacyNotice, message, method, montoBecado, ms } = getScope();
    const { msg, n, na, nav, needsFirestoreResyncAfterBulk, net, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, o, others, out, p, paid, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, patch, pathname, payload, pending, performAppFullBackup, phone } = getScope();
    const { plan, prevSnap, previousData, privacyNoticePublicUrl, pruneEventScopedAccessMap, q, query, r, raw, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, res, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, row, rows, s, sa, scoped, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, snap, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView, t } = getScope();
    const { tabSessionId, target, toLocalISODate, toast, today, toggleDarkMode, toggleDebugMode, total, uiModal, uid, updateDoc, updatePassword, url, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, v, val, vis, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!isSuperUser || !person || !participantHasRefundDisbursement(person)) return;
    const ts = parseRefundDisbursedAtMs(person) ?? Date.now();
    setRefundDateEditModal({
      isOpen: true,
      personId: String(person.id),
      personName: person.name || 'Participante',
      datetimeLocal: msToDatetimeLocalValue(ts),
      busy: false,
    });
  };

  const closeRefundDateEditModal = () => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
    const { anchor, anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, att, b, backfillActiveRosterBusy, base, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, cancelled, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, code, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, d, darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, deleted, docId, donations, downloadExcelBytes, draft, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, et, evType, event, eventDateDraft } = getScope();
    const { eventId, eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, fn, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, functions, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostId, hostSourceKey, id, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, info, inputClasses, inventory, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, key, kind, labelClasses, legacy, limit, linkWithCredential, liq, listPrice, live, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, loc, locRaw, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logList, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, loginTime, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsToRevert, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, m, mapStaffLoginFirebaseError, max, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, merged, mergedPrivacyNotice, message, method, montoBecado, ms } = getScope();
    const { msg, n, na, nav, needsFirestoreResyncAfterBulk, net, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, o, others, out, p, paid, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, patch, pathname, payload, pending, performAppFullBackup, person, phone } = getScope();
    const { plan, prevSnap, previousData, privacyNoticePublicUrl, pruneEventScopedAccessMap, q, query, r, raw, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, res, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, row, rows, s, sa, scoped, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, snap, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView, t } = getScope();
    const { tabSessionId, target, toLocalISODate, toast, today, toggleDarkMode, toggleDebugMode, total, uiModal, uid, updateDoc, updatePassword, url, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, v, val, vis, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (refundDateEditModal.busy) return;
    setRefundDateEditModal({ isOpen: false, personId: '', personName: '', datetimeLocal: '', busy: false });
  };

  const submitRefundDateEditModal = async () => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
    const { anchor, anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, att, b, backfillActiveRosterBusy, base, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, cancelled, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, code, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, d, darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, deleted, docId, donations, downloadExcelBytes, draft, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, et, evType, event, eventDateDraft } = getScope();
    const { eventId, eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, fn, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, functions, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostId, hostSourceKey, id, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, info, inputClasses, inventory, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, key, kind, labelClasses, legacy, limit, linkWithCredential, liq, listPrice, live, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, loc, locRaw, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logList, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, loginTime, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsToRevert, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, m, mapStaffLoginFirebaseError, max, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, merged, mergedPrivacyNotice, message, method, montoBecado } = getScope();
    const { msg, n, na, nav, needsFirestoreResyncAfterBulk, net, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, o, others, out, p, paid, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, patch, pathname, payload, pending, performAppFullBackup, person, phone } = getScope();
    const { plan, prevSnap, previousData, privacyNoticePublicUrl, pruneEventScopedAccessMap, q, query, r, raw, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, res, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, row, rows, s, sa, scoped, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, snap, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView, t } = getScope();
    const { tabSessionId, target, toLocalISODate, toast, today, toggleDarkMode, toggleDebugMode, total, uiModal, uid, updateDoc, updatePassword, url, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, v, val, vis, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!refundDateEditModal.isOpen || refundDateEditModal.busy) return;
    const ms = parseDatetimeLocalToMs(refundDateEditModal.datetimeLocal);
    if (ms == null) {
      showToast('Indica una fecha y hora válidas.');
      return;
    }
    setRefundDateEditModal((prev) => ({ ...prev, busy: true }));
    try {
      await updateRefundDisbursementDateTime(refundDateEditModal.personId, ms);
      closeRefundDateEditModal();
    } catch (e) {
      console.error(e);
      showToast('No se pudo actualizar la fecha de devolución.');
      setRefundDateEditModal((prev) => ({ ...prev, busy: false }));
    }
  };

  const removePendingRefundBySuperUser = async (personId) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
    const { anchor, anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, att, b, backfillActiveRosterBusy, base, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, cancelled, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, code, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, d, darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, deleted, docId, donations, downloadExcelBytes, draft, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, et, evType, event, eventDateDraft } = getScope();
    const { eventId, eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, fn, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, functions, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostId, hostSourceKey, id, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, info, inputClasses, inventory, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, key, kind, labelClasses, legacy, limit, linkWithCredential, liq, listPrice, live, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, loc, locRaw, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logList, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, loginTime, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsToRevert, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, m, mapStaffLoginFirebaseError, max, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, merged, mergedPrivacyNotice, message, method, montoBecado, ms } = getScope();
    const { msg, n, na, nav, needsFirestoreResyncAfterBulk, net, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, o, others, out, p, paid, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, patch, pathname, pending, performAppFullBackup, phone } = getScope();
    const { plan, prevSnap, previousData, privacyNoticePublicUrl, pruneEventScopedAccessMap, q, query, r, raw, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, res, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, row, rows, s, sa, scoped, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, snap, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView, t } = getScope();
    const { tabSessionId, target, toLocalISODate, toast, today, toggleDarkMode, toggleDebugMode, total, uiModal, uid, updateDoc, updatePassword, url, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, v, val, vis, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!isSuperUser || !canAccessExpenses) return;
    const person = allParticipants.find((p) => String(p.id) === String(personId));
    if (!person || !participantIsCancelled(person)) return;
    const pendingAmount = person.refundAsDonation
      ? 0
      : Math.max(0, Number(person.refundPendingAmount ?? person.paid ?? 0) || 0);
    if (pendingAmount <= 0) {
      showToast('Ese saldo ya no está pendiente o fue actualizado.');
      return;
    }
    const payload = {
      refundPendingAmount: 0,
      refundAsDonation: false,
      ...(globalConfig?.isDebugMode ? { _isDebug: true, _debugSessionId: globalConfig.debugSessionId } : {}),
    };
    await updateDoc(getDocRef('app_participants', String(personId)), payload);
    refreshParticipantCache(person, 'Quitar saldo pendiente de devolución', { personId, patch: payload });
    const _remRefLog = `SuperUsuario eliminó saldo pendiente de devolución (lista de gastos). Monto quitado: $${pendingAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}. Participante doc: ${personId}. Evento: ${currentEvent?.name || currentEvent?.id || '?'}.`;
    addLog(
      'Gastos',
      _remRefLog,
      null,
      null,
      { collectionName: 'app_participants', docId: String(personId), action: 'update', previousData: person },
      { isHidden: true }
    );
    logParticipantActivity(String(personId), 'finanzas', _remRefLog);
    showToast('Saldo eliminado de la lista. El balance neto se actualizó.');
  };

  const openRemovePendingRefundConfirm = (p) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
    const { anchor, anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, att, b, backfillActiveRosterBusy, base, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, cancelled, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, code, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, d, darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, deleted, docId, donations, downloadExcelBytes, draft, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, et, evType, event, eventDateDraft } = getScope();
    const { eventId, eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, fn, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, functions, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostId, hostSourceKey, id, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, info, inputClasses, inventory, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, key, kind, labelClasses, legacy, limit, linkWithCredential, liq, listPrice, live, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, loc, locRaw, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logList, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, loginTime, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsToRevert, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, m, mapStaffLoginFirebaseError, max, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, merged, mergedPrivacyNotice, message, method, montoBecado, ms } = getScope();
    const { msg, n, na, nav, needsFirestoreResyncAfterBulk, net, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, o, others, out, paid, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, patch, pathname, payload, pending, performAppFullBackup, phone } = getScope();
    const { plan, prevSnap, previousData, privacyNoticePublicUrl, pruneEventScopedAccessMap, q, query, r, raw, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, res, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, row, rows, s, sa, scoped, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, snap, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView, t } = getScope();
    const { tabSessionId, target, toLocalISODate, toast, today, toggleDarkMode, toggleDebugMode, total, uiModal, uid, updateDoc, updatePassword, url, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, v, val, vis, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!isSuperUser || !canAccessExpenses || registryConfirmBusy) return;
    const person = allParticipants.find((x) => String(x.id) === String(p.id));
    if (!person || !participantIsCancelled(person)) return;
    const pendingAmount = person.refundAsDonation
      ? 0
      : Math.max(0, Number(person.refundPendingAmount ?? person.paid ?? 0) || 0);
    if (pendingAmount <= 0) return;
    setRegistryConfirmModal({
      isOpen: true,
      type: 'remove_pending_refund',
      loc: '',
      personId: String(p.id),
      personName: person.name || 'este registro',
      donationId: '',
      donationAmount: 0,
      refundAmount: pendingAmount,
      paymentIndex: null,
      paymentRowId: null,
      fromDuplicateDiagnostic: false,
      duplicateReasonsLine: '',
      dupAcceptCluster: null,
    });
  };

  const openMoveToWaitlistConfirm = (loc, id) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
    const { anchor, anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, att, b, backfillActiveRosterBusy, base, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, cancelled, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, code, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, d, darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, deleted, docId, donations, downloadExcelBytes, draft, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, et, evType, event, eventDateDraft } = getScope();
    const { eventId, eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, fn, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, functions, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostId, hostSourceKey, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, info, inputClasses, inventory, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, key, kind, labelClasses, legacy, limit, linkWithCredential, liq, listPrice, live, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, locRaw, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logList, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, loginTime, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsToRevert, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, m, mapStaffLoginFirebaseError, max, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, merged, mergedPrivacyNotice, message, method, montoBecado, ms } = getScope();
    const { msg, n, na, nav, needsFirestoreResyncAfterBulk, net, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, o, others, out, p, paid, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, patch, pathname, payload, pending, performAppFullBackup, phone } = getScope();
    const { plan, prevSnap, previousData, privacyNoticePublicUrl, pruneEventScopedAccessMap, q, query, r, raw, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, res, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, row, rows, s, sa, scoped, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, snap, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView, t } = getScope();
    const { tabSessionId, target, toLocalISODate, toast, today, toggleDarkMode, toggleDebugMode, total, uiModal, uid, updateDoc, updatePassword, url, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, v, val, vis, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!hasEventAccess(currentEvent?.id) || !hasLocationAccess(loc)) {
      showToast("No tienes permisos para mover este registro.");
      return;
    }
    if (registryConfirmBusy) return;
    const person = (data[loc] || []).find((p) => String(p.id) === String(id));
    if (!person || participantIsCancelled(person) || participantIsWaitlistRow(person)) return;
    setRegistryConfirmModal({
      isOpen: true,
      type: 'move_to_waitlist',
      loc,
      personId: String(id),
      personName: person.name || 'este registro',
      donationId: '',
      donationAmount: 0,
      refundAmount: 0,
      paymentIndex: null,
      paymentRowId: null,
      fromDuplicateDiagnostic: false,
      duplicateReasonsLine: '',
      dupAcceptCluster: null,
    });
  };

  const performMoveActiveEntryToWaitlist = async (loc, id) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
    const { anchor, anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, att, b, backfillActiveRosterBusy, base, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, cancelled, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, code, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, d, darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, deleted, docId, donations, downloadExcelBytes, draft, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, et, evType, event, eventDateDraft } = getScope();
    const { eventId, eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, fn, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, functions, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostId, hostSourceKey, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, info, inputClasses, inventory, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, key, kind, labelClasses, legacy, limit, linkWithCredential, liq, listPrice, live, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, locRaw, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logList, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, loginTime, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsToRevert, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, m, mapStaffLoginFirebaseError, max, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, merged, mergedPrivacyNotice, message, method, montoBecado, ms } = getScope();
    const { msg, n, na, nav, needsFirestoreResyncAfterBulk, net, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, o, others, out, p, paid, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, patch, pathname, pending, performAppFullBackup, phone } = getScope();
    const { plan, prevSnap, previousData, privacyNoticePublicUrl, pruneEventScopedAccessMap, q, query, r, raw, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, res, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, row, rows, s, sa, scoped, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, snap, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView, t } = getScope();
    const { tabSessionId, target, toLocalISODate, toast, today, toggleDarkMode, toggleDebugMode, total, uiModal, uid, updateDoc, updatePassword, url, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, v, val, vis, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!hasEventAccess(currentEvent?.id) || !hasLocationAccess(loc)) {
      showToast("No tienes permisos para mover a lista de espera en esta sede/evento.");
      return;
    }
    const person = (data[loc] || []).find((p) => String(p.id) === String(id));
    if (!person || participantIsCancelled(person) || participantIsWaitlistRow(person)) return;
    const movedAt = Date.now();
    const payload = {
      status: 'waitlist',
      waitlistCreatedAt: movedAt,
    };
    if (globalConfig?.isDebugMode) {
      payload._isDebug = true;
      payload._debugSessionId = globalConfig.debugSessionId;
    }
    await updateDoc(
      getDocRef('app_participants', String(id)),
      participantPatchForFirestoreWrite(person, payload, deleteField)
    );
    refreshParticipantCache(person, 'Mover a lista de espera', { personId: id, patch: payload });
    const _toWaitLog = `Movió a ${person.name} de inscritos a lista de espera en la sede ${loc}.`;
    addLog(
      'Lista de Espera',
      _toWaitLog,
      null,
      null,
      { collectionName: 'app_participants', docId: String(id), action: 'update', previousData: person }
    );
    logParticipantActivity(String(id), 'lista_espera', _toWaitLog);
    showToast('Registro movido a lista de espera.');
  };

  const promoteWaitlistEntry = async (loc, id) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
    const { anchor, anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, att, b, backfillActiveRosterBusy, base, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, cancelled, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, code, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, d, darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, deleted, docId, donations, downloadExcelBytes, draft, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, et, evType, event, eventDateDraft } = getScope();
    const { eventId, eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, fn, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, functions, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostId, hostSourceKey, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, info, inputClasses, inventory, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, key, kind, labelClasses, legacy, limit, linkWithCredential, liq, listPrice, live, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, locRaw, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logList, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, loginTime, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsToRevert, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, m, mapStaffLoginFirebaseError, max, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, merged, mergedPrivacyNotice, message, method, montoBecado, ms } = getScope();
    const { msg, n, na, nav, needsFirestoreResyncAfterBulk, net, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, o, others, out, p, paid, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, patch, pathname, pending, performAppFullBackup, phone } = getScope();
    const { plan, prevSnap, previousData, privacyNoticePublicUrl, pruneEventScopedAccessMap, q, query, r, raw, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, res, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, row, rows, s, sa, scoped, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, snap, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView, t } = getScope();
    const { tabSessionId, target, toLocalISODate, toast, today, toggleDarkMode, toggleDebugMode, total, uiModal, uid, updateDoc, updatePassword, url, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, v, val, vis, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!hasEventAccess(currentEvent?.id) || !hasLocationAccess(loc)) {
      showToast("No tienes permisos para promover en esta sede/evento.");
      return;
    }
    if (!isLocOpen(loc)) {
      showToast("La sede está cerrada. Abre registro para promover.");
      return;
    }
    const person = (waitlistData[loc] || []).find(p => String(p.id) === String(id));
    if (!person) {
      showToast('No se encontró el registro en lista de espera.');
      return;
    }
    const promoteUnits = computePromoteFromWaitlistCapUnits(person, allParticipants, currentEvent, loc);
    const capCheck = await ensurePromoteCapAllowed({
      loc,
      additionalUnits: promoteUnits,
      personName: person.name,
      isCompanion: false,
    });
    if (!capCheck.allowed) return;
    const promoteAt = Date.now();
    const liqPromote = getLiquidationTarget(person);
    const paidPromote = parseFloat(person.paid || 0);
    const pendingAfterPromote = Math.max((Number(liqPromote) || 0) - paidPromote, 0);
    const isLiquidadoPromote = paidPromote >= liqPromote;
    const waFinanceSnapshot = {
      target: Number(liqPromote) || 0,
      paid: paidPromote,
      isScholarship: isSiValue(person.isScholarship),
      scholarshipType: person.scholarshipType || 'none',
      scholarshipPartialAmount: Number(person.scholarshipPartialAmount || 0) || 0,
    };
    const paymentDeadline = String(currentEvent?.paymentDeadlineDate || '').trim();
    const promoteNotification = {
      id: `wa-prm-${promoteAt}`,
      kind: isSiValue(person.isScholarship) ? 'beca_aprobada' : 'promocion_espera',
      amount: 0,
      pendingAmount: pendingAfterPromote,
      isLiquidado: isLiquidadoPromote,
      createdAt: promoteAt,
      sent: false,
      sentAt: null,
      paymentDeadlineDate: paymentDeadline,
      waFinanceSnapshot,
      message: buildPromoteWaitlistWhatsAppMessage({
        person,
        loc,
        reportedAtMs: promoteAt,
        eventSnapshot: currentEvent,
        financeSnapshot: waFinanceSnapshot,
        rosterParticipants: allParticipants,
        paymentDeadlineDate: paymentDeadline,
      }),
    };
    const participantRef = getDocRef('app_participants', String(id));
    const serverSnap = await getDoc(participantRef);
    const serverWa = serverSnap.exists()
      ? serverSnap.data()?.whatsAppFinanceNotifications
      : undefined;
    const mergedWa = Array.isArray(serverWa)
      ? [...serverWa, promoteNotification]
      : [...(person.whatsAppFinanceNotifications || []), promoteNotification];
    const payload = {
      status: 'active',
      scholarshipPendingApproval: false,
      registeredAt: person.registeredAt || new Date(promoteAt).toISOString(),
      whatsAppFinanceNotifications: mergedWa,
    };
    if (globalConfig?.isDebugMode) {
      payload._isDebug = true;
      payload._debugSessionId = globalConfig.debugSessionId;
    }
    await updateDoc(
      participantRef,
      participantPatchForFirestoreWrite(person, payload, deleteField)
    );
    refreshParticipantCache(person, 'Promover de lista de espera', { personId: id, patch: payload });

    const promBeca =
      isSiValue(person.isScholarship)
        ? ` Becado ${person.scholarshipType === 'partial' ? 'parcial' : 'total'}${person.scholarshipType === 'partial' ? ` (monto becado $${Number(person.scholarshipPartialAmount || 0).toLocaleString('es-MX')}, a liquidar $${Number(liqPromote || 0).toLocaleString('es-MX')}, abono $${paidPromote.toLocaleString('es-MX')})` : ''}.`
        : '';
    const _promLog = `Promovió a ${person.name} de lista de espera a inscritos en la sede ${loc}.${promBeca}${capCheck.overCap ? ' (sobrecupo autorizado por administrador).' : ''}`;
    addLog(
      'Lista de Espera',
      _promLog,
      null,
      null,
      { collectionName: 'app_participants', docId: String(id), action: 'update', previousData: person }
    );
    logParticipantActivity(String(id), 'promocion', _promLog);
    showToast(
      isSiValue(person.isScholarship) && person.scholarshipType === 'partial'
        ? `Inscrito (beca parcial). A liquidar: $${Number(liqPromote || 0).toLocaleString('es-MX')}. Abono: $${paidPromote.toLocaleString('es-MX')}.`
        : 'Registro promovido a inscritos.'
    );
  };

  const promoteCompanionWaitlistEntry = async (_loc, _virtualId) => {
    const { showToast } = getScope();
    showToast('La promoción de acompañantes en lista de espera de Bautizos ya no aplica en esta versión.');
  };
  const promoteFromWaitlistSection = (loc, person) => {
    return promoteWaitlistEntry(loc, person.id);
  };

  const openWaitlistRowEdit = (person, loc) => {
    openRosterInlineEditFromQuickActions(person, loc);
  };

  const toggleRegStatus = async (loc) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
    const { anchor, anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, att, b, backfillActiveRosterBusy, base, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, cancelled, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, code, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, d, darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, deleted, docId, donations, downloadExcelBytes, draft, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, et, evType, event, eventDateDraft } = getScope();
    const { eventId, eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, fn, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, functions, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostId, hostSourceKey, id, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, info, inputClasses, inventory, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, key, kind, labelClasses, legacy, limit, linkWithCredential, liq, listPrice, live, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, locRaw, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logList, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, loginTime, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsToRevert, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, m, mapStaffLoginFirebaseError, max, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, merged, mergedPrivacyNotice, message, method, montoBecado, ms } = getScope();
    const { msg, n, na, nav, needsFirestoreResyncAfterBulk, net, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, o, others, out, p, paid, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, patch, pathname, payload, pending, performAppFullBackup, person, phone } = getScope();
    const { plan, prevSnap, previousData, privacyNoticePublicUrl, pruneEventScopedAccessMap, q, query, r, raw, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, res, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, row, rows, s, sa, scoped, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, snap, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView, t } = getScope();
    const { tabSessionId, target, toLocalISODate, toast, today, toggleDarkMode, toggleDebugMode, total, uiModal, uid, updateDoc, updatePassword, url, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, v, val, vis, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!hasAdminRights) {
      showToast("Permisos insuficientes. Solo administradores pueden cambiar el estado.");
      return;
    }
    const newStatus = !isLocOpen(loc);
    await getScope().updateEventConfig({ regStatus: { ...currentEvent.regStatus, [loc]: newStatus } });
    addLog('Cambio de Estado', `${newStatus ? 'Abrió' : 'Cerró'} las inscripciones en la sede ${loc}.`, null, null, { collectionName: 'app_events', docId: currentEvent.id, action: 'update', previousData: currentEvent });
  };

  const rosterRowAnchorId = (loc, personId) =>
    `roster-row-${String(personId).replace(/[^a-zA-Z0-9_-]/g, '_')}-${String(loc ?? '').replace(/[^a-zA-Z0-9_-]/g, '_')}`;

  const rosterInlineEditPanelId = (personId) =>
    `roster-inline-edit-${String(personId).replace(/[^a-zA-Z0-9_-]/g, '_')}`;

  const findWorkspaceScrollRoot = () => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
    const { anchor, anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, att, b, backfillActiveRosterBusy, base, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, cancelled, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, code, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, d, darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, deleted, docId, donations, downloadExcelBytes, draft, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, et, evType, event, eventDateDraft } = getScope();
    const { eventId, eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, fn, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, functions, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostId, hostSourceKey, id, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, info, inputClasses, inventory, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, key, kind, labelClasses, legacy, limit, linkWithCredential, liq, listPrice, live, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, loc, locRaw, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logList, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, loginTime, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsToRevert, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, m, mapStaffLoginFirebaseError, max, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, merged, mergedPrivacyNotice, message, method, montoBecado, ms } = getScope();
    const { msg, n, na, nav, needsFirestoreResyncAfterBulk, net, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, o, others, out, p, paid, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, patch, pathname, payload, pending, performAppFullBackup, person, phone } = getScope();
    const { plan, prevSnap, previousData, privacyNoticePublicUrl, pruneEventScopedAccessMap, q, query, r, raw, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, res, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, row, rows, s, sa, scoped, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, snap, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView, t } = getScope();
    const { tabSessionId, target, toLocalISODate, toast, today, toggleDarkMode, toggleDebugMode, total, uiModal, uid, updateDoc, updatePassword, url, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, v, val, vis, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (typeof document === 'undefined') return null;
    return document.querySelector('[data-vnpm-workspace-scroll]');
  };

  const scrollRosterInlineEditPanelIntoView = useCallback((personId, { behavior = 'smooth' } = {}) => {
      const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
      const { anchor, anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, att, b, backfillActiveRosterBusy, base, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
      const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, cancelled, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, code, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
      const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, d, darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, deleted, docId, donations, downloadExcelBytes, draft, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, et, evType, event, eventDateDraft } = getScope();
      const { eventId, eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, fn, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, functions, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
      const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostId, hostSourceKey, id, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, info, inputClasses, inventory, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
      const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, key, kind, labelClasses, legacy, limit, linkWithCredential, liq, listPrice, live, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, loc, locRaw, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logList, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
      const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, loginTime, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsToRevert, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, m, mapStaffLoginFirebaseError, max, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, merged, mergedPrivacyNotice, message, method, montoBecado, ms } = getScope();
      const { msg, n, na, nav, needsFirestoreResyncAfterBulk, net, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, o, others, out, p, paid, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, patch, pathname, payload, pending, performAppFullBackup, person, phone } = getScope();
      const { plan, prevSnap, previousData, privacyNoticePublicUrl, pruneEventScopedAccessMap, q, query, r, raw, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, res, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, row, rows, s, sa, scoped, secondaryAuth, sede } = getScope();
      const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
      const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, snap, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView, t } = getScope();
      const { tabSessionId, toLocalISODate, toast, today, toggleDarkMode, toggleDebugMode, total, uiModal, uid, updateDoc, updatePassword, url, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, v, val, vis, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    const pid = String(personId);
    const offset =
      typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches ? 72 : 88;

    const scrollPanel = () => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, docId, donations, downloadExcelBytes, draft, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, person, previousData, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, rows, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, text, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
      const panel = document.getElementById(rosterInlineEditPanelId(pid));
      if (!panel) return false;
      const panelRect = panel.getBoundingClientRect();
      const scrollRoot = findWorkspaceScrollRoot();
      if (scrollRoot) {
        const rootRect = scrollRoot.getBoundingClientRect();
        const target = scrollRoot.scrollTop + (panelRect.top - rootRect.top) - offset;
        scrollRoot.scrollTo({ top: Math.max(0, target), behavior });
        return true;
      }
      window.scrollTo({
        top: Math.max(0, window.scrollY + panelRect.top - offset),
        behavior,
      });
      return true;
    };

    queueMicrotask(() => {
      requestAnimationFrame(() => {
        if (!scrollPanel()) {
          requestAnimationFrame(() => {
            if (!scrollPanel()) setTimeout(scrollPanel, 120);
          });
        }
      });
    });
  }, []);

  const scrollRosterRowIntoView = (loc, personId) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
    const { anchor, anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, att, b, backfillActiveRosterBusy, base, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, cancelled, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, code, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, d, darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, deleted, docId, donations, downloadExcelBytes, draft, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, et, evType, event, eventDateDraft } = getScope();
    const { eventId, eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, fn, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, functions, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostId, hostSourceKey, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, info, inputClasses, inventory, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, key, kind, labelClasses, legacy, limit, linkWithCredential, liq, listPrice, live, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, locRaw, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logList, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, loginTime, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsToRevert, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, m, mapStaffLoginFirebaseError, max, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, merged, mergedPrivacyNotice, message, method, montoBecado, ms } = getScope();
    const { msg, n, na, nav, needsFirestoreResyncAfterBulk, net, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, o, others, out, p, paid, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, patch, pathname, payload, pending, performAppFullBackup, person, phone } = getScope();
    const { plan, prevSnap, previousData, privacyNoticePublicUrl, pruneEventScopedAccessMap, q, query, r, raw, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, res, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, row, rows, s, sa, scoped, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, snap, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView, t } = getScope();
    const { tabSessionId, target, toLocalISODate, toast, today, toggleDarkMode, toggleDebugMode, total, uiModal, uid, updateDoc, updatePassword, url, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, v, val, vis, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    const id = rosterRowAnchorId(loc, personId);
    queueMicrotask(() => {
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
    });
  };


  /** Escritorio + acción rápida Editar: expande la fila sin cargar el detalle completo del servidor. */
  const expandRosterRowEditOnly = (person) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
    const { anchor, anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, att, b, backfillActiveRosterBusy, base, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, cancelled, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, code, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, d, darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, deleted, docId, donations, downloadExcelBytes, draft, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, et, evType, event, eventDateDraft } = getScope();
    const { eventId, eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, fn, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, functions, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostId, hostSourceKey, id, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, info, inputClasses, inventory, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, key, kind, labelClasses, legacy, limit, linkWithCredential, liq, listPrice, live, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, loc, locRaw, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logList, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, loginTime, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsToRevert, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, m, mapStaffLoginFirebaseError, max, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, merged, mergedPrivacyNotice, message, method, montoBecado, ms } = getScope();
    const { msg, n, na, nav, needsFirestoreResyncAfterBulk, net, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, o, others, out, p, paid, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, patch, pathname, payload, pending, performAppFullBackup, phone } = getScope();
    const { plan, prevSnap, previousData, privacyNoticePublicUrl, pruneEventScopedAccessMap, q, query, r, raw, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, res, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, row, rows, s, sa, scoped, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, snap, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView, t } = getScope();
    const { tabSessionId, target, toLocalISODate, toast, today, toggleDarkMode, toggleDebugMode, total, uiModal, uid, updateDoc, updatePassword, url, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, v, val, vis, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    const pid = String(person.id);
    setRosterExpandEditOnlyIds((prev) => {
      const next = new Set(prev);
      next.add(pid);
      return next;
    });
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.add(person.id);
      return next;
    });
  };

  const toggleRosterRowExpand = (person, loc) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
    const { anchor, anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, att, b, backfillActiveRosterBusy, base, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, cancelled, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, code, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, d, darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, deleted, docId, donations, downloadExcelBytes, draft, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, et, evType, event, eventDateDraft } = getScope();
    const { eventId, eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, fn, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, functions, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostId, hostSourceKey, id, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, info, inputClasses, inventory, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, key, kind, labelClasses, legacy, limit, linkWithCredential, liq, listPrice, live, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, locRaw, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logList, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, loginTime, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsToRevert, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, m, mapStaffLoginFirebaseError, max, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, merged, mergedPrivacyNotice, message, method, montoBecado, ms } = getScope();
    const { msg, na, nav, needsFirestoreResyncAfterBulk, net, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, o, others, out, p, paid, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, patch, pathname, payload, pending, performAppFullBackup, phone } = getScope();
    const { plan, prevSnap, previousData, privacyNoticePublicUrl, pruneEventScopedAccessMap, q, query, r, raw, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, res, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, row, rows, s, sa, scoped, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView, t } = getScope();
    const { tabSessionId, target, toLocalISODate, toast, today, toggleDarkMode, toggleDebugMode, total, uiModal, uid, updateDoc, updatePassword, url, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, v, val, vis, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    const wasExpanded = expandedRows.has(person.id);
    const pid = String(person.id);
    setRosterExpandEditOnlyIds((prev) => {
      if (!prev.has(pid)) return prev;
      const next = new Set(prev);
      next.delete(pid);
      return next;
    });
    setExpandedRows((prev) => {
      const next = new Set(prev);
      const collapsing = next.has(person.id);
      if (collapsing) {
        next.delete(person.id);
        setRosterInlineEditExpandedId(null);
        setParticipantActivityExpandedId((aid) => (aid === pid ? null : aid));
        editRegistryInlineBaselineRef.current = null;
        pendingInlineEditScrollRef.current = null;
        setEditRegistryModal((em) => {
          if (em.variant === 'inline' && em.data && String(em.data.id) === String(person.id) && em.loc === loc) {
            return { isOpen: false, loc: '', data: null, variant: 'modal' };
          }
          return em;
        });
        setEditPreferredServeDropdownOpen(false);
        setEditServedAreasDropdownOpen(false);
      } else {
        next.add(person.id);
      }
      return next;
    });
    if (wasExpanded) {
      setParticipantExpandCache((pc) => {
        if (!pc[pid]) return pc;
        const n = { ...pc };
        delete n[pid];
        return n;
      });
      scrollRosterRowIntoView(loc, person.id);
    } else {
      setParticipantExpandCache((pc) => ({
        ...pc,
        [pid]: { loading: true, error: null, serverDoc: null },
      }));
      void (async () => {
        try {
          const snap = await getDoc(getDocRef('app_participants', pid));
          if (!snap.exists()) {
            setParticipantExpandCache((pc) => ({
              ...pc,
              [pid]: { loading: false, error: 'Registro no encontrado en el servidor.', serverDoc: null },
            }));
            return;
          }
          const serverDoc = { id: snap.id, ...snap.data() };
          setParticipantExpandCache((pc) => ({
            ...pc,
            [pid]: { loading: false, error: null, serverDoc },
          }));
        } catch (e) {
          console.error(e);
          setParticipantExpandCache((pc) => ({
            ...pc,
            [pid]: { loading: false, error: 'No se pudo cargar el detalle del registro.', serverDoc: null },
          }));
        }
      })();
      scrollRosterRowIntoView(loc, person.id);
    }
  };

  /** Desde acciones rápidas: escritorio = panel completo bajo el header; móvil = edición en línea en el detalle. */
  const openRosterInlineEditFromQuickActions = useCallback(
    (person, loc) => {
      const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
      const { anchor, anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, att, b, backfillActiveRosterBusy, base, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
      const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, cancelled, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, code, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
      const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, d, darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, deleted, docId, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, et, evType, event, eventDateDraft } = getScope();
      const { eventId, eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, fn, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, functions, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
      const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostId, hostSourceKey, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, info, inputClasses, inventory, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
      const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, key, kind, labelClasses, legacy, limit, linkWithCredential, liq, listPrice, live, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, locRaw, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logList, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
      const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, loginTime, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsToRevert, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, m, mapStaffLoginFirebaseError, max, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, merged, mergedPrivacyNotice, message, method, montoBecado, ms } = getScope();
      const { msg, n, na, nav, needsFirestoreResyncAfterBulk, net, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, o, others, out, p, paid, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, patch, pathname, payload, pending, performAppFullBackup, phone } = getScope();
      const { plan, prevSnap, previousData, privacyNoticePublicUrl, pruneEventScopedAccessMap, q, query, r, raw, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, res, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, row, rows, s, sa, scoped, secondaryAuth, sede } = getScope();
      const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
      const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, snap, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView, t } = getScope();
      const { tabSessionId, target, toLocalISODate, toast, today, toggleDarkMode, toggleDebugMode, total, uiModal, uid, updateDoc, updatePassword, url, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, v, val, vis, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
      if (currentUser?.role === 'Lector') return;
      const id = String(person.id);

      if (isDesktopRosterViewport()) {
        const modalAlreadyOpen =
          editRegistryModal.isOpen &&
          editRegistryModal.variant === 'modal' &&
          editRegistryModal.data &&
          String(editRegistryModal.data.id) === id &&
          editRegistryModal.loc === loc;
        if (modalAlreadyOpen) {
          resetEditRegistryModal();
          return;
        }
        openEditRegistryModalForPerson(person, loc, 'modal');
        return;
      }

      const inlineEditAlreadyOpen =
        expandedRows.has(person.id) &&
        rosterInlineEditExpandedId === id &&
        editRegistryModal.isOpen &&
        editRegistryModal.variant === 'inline' &&
        editRegistryModal.data &&
        String(editRegistryModal.data.id) === id &&
        editRegistryModal.loc === loc;

      if (inlineEditAlreadyOpen) {
        const baseline = editRegistryInlineBaselineRef.current;
        const current = editRegistryModal.data ? JSON.stringify(editRegistryModal.data) : '';
        const hasUnsavedChanges = !baseline || baseline !== current;
        if (!hasUnsavedChanges) {
          editRegistryInlineBaselineRef.current = null;
          pendingInlineEditScrollRef.current = null;
          if (expandedRows.has(person.id)) {
            toggleRosterRowExpand(person, loc);
          } else {
            resetEditRegistryModal();
          }
          return;
        }
        pendingInlineEditScrollRef.current = { loc, personId: id };
        scrollRosterInlineEditPanelIntoView(id);
        return;
      }

      if (!expandedRows.has(person.id)) {
        toggleRosterRowExpand(person, loc);
      }
      const draft = createEditRegistryDraft(person, loc);
      editRegistryInlineBaselineRef.current = JSON.stringify(draft);
      setSpouseLinkSearchEdit('');
      setEditPrivacyAck(false);
      setRosterInlineEditExpandedId(id);
      setEditRegistryModal({ isOpen: true, variant: 'inline', loc, data: draft });
      pendingInlineEditScrollRef.current = { loc, personId: id };
    },
    [
      currentUser?.role,
      expandedRows,
      rosterInlineEditExpandedId,
      editRegistryModal,
      createEditRegistryDraft,
      scrollRosterInlineEditPanelIntoView,
      toggleRosterRowExpand,
      openEditRegistryModalForPerson,
      resetEditRegistryModal,
    ]
  );

  useLayoutEffect(() => {
    const pending = pendingInlineEditScrollRef.current;
    if (!pending) return;
    if (String(rosterInlineEditExpandedId) !== String(pending.personId)) return;
    if (!editRegistryModal.isOpen || editRegistryModal.variant !== 'inline') return;

    let raf1 = 0;
    let raf2 = 0;
    let timer = 0;
    const run = () => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, docId, donations, downloadExcelBytes, draft, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, person, previousData, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, rows, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, text, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
      if (!pendingInlineEditScrollRef.current) return;
      const panel = document.getElementById(rosterInlineEditPanelId(pending.personId));
      if (!panel) return;
      scrollRosterInlineEditPanelIntoView(pending.personId);
      pendingInlineEditScrollRef.current = null;
    };
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        run();
        timer = window.setTimeout(run, 120);
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(timer);
    };
  }, [
    rosterInlineEditExpandedId,
    editRegistryModal.isOpen,
    editRegistryModal.variant,
    editRegistryModal.data?.id,
    participantExpandCache,
    expandedRows,
    rosterExpandEditOnlyIds,
    scrollRosterInlineEditPanelIntoView,
  ]);

  const submitAbono = async () => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
    const { anchor, anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, att, b, backfillActiveRosterBusy, base, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, cancelled, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, d, darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, deleted, docId, donations, downloadExcelBytes, draft, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, et, evType, event, eventDateDraft } = getScope();
    const { eventId, eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, fn, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, functions, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostId, hostSourceKey, id, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, info, inputClasses, inventory, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, key, kind, labelClasses, legacy, limit, linkWithCredential, liq, listPrice, live, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, loc, locRaw, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logList, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, loginTime, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsToRevert, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, m, mapStaffLoginFirebaseError, max, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, merged, mergedPrivacyNotice, message, method, montoBecado, ms } = getScope();
    const { msg, n, na, nav, needsFirestoreResyncAfterBulk, net, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, o, others, out, p, paid, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, patch, pathname, pending, performAppFullBackup, phone } = getScope();
    const { plan, prevSnap, previousData, privacyNoticePublicUrl, pruneEventScopedAccessMap, q, query, r, raw, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, res, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, row, rows, s, sa, scoped, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, snap, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView, t } = getScope();
    const { tabSessionId, target, toLocalISODate, toast, today, toggleDarkMode, toggleDebugMode, total, uiModal, uid, updateDoc, updatePassword, url, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, v, val, vis, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!hasEventAccess(currentEvent?.id) || !hasLocationAccess(paymentModal.loc)) {
      showToast("No tienes permisos para registrar abonos en esta sede/evento.");
      return;
    }
    const abonoRaw = paymentModal.amount;
    if (abonoRaw === '' || abonoRaw == null || (typeof abonoRaw === 'string' && abonoRaw.trim() === '')) {
      setPaymentModal((prev) => ({ ...prev, error: 'Indica un monto (el campo está vacío).' }));
      return;
    }
    const abonoParsed = parseStrictNonNegativeMoneyInput(abonoRaw, { allowEmpty: false });
    if (!abonoParsed.ok) {
      setPaymentModal((prev) => ({ ...prev, error: abonoParsed.reason }));
      return;
    }
    const addedAmount = abonoParsed.value;
    const baseCost = paymentModal.baseCost;
    const personPreview = allParticipants.find((p) => String(p.id) === String(paymentModal.id));
    const allowOverAbono = personPreview?.registeredCostManual === true;
    if (!allowOverAbono && paymentModal.currentPaid + addedAmount > baseCost) {
      setPaymentModal(prev => ({ ...prev, error: `El abono supera el costo total. Máximo a abonar: $${baseCost - paymentModal.currentPaid}` }));
      return;
    }
    let paymentMethod = paymentModal.paymentMethod === 'Tarjeta' ? 'Tarjeta' : 'Efectivo';
    if (paymentMethod === 'Tarjeta' && !isCardPaymentAllowedForLocation(currentEvent, paymentModal.loc)) {
      paymentMethod = 'Efectivo';
    }
    const paymentService = getAutoPaymentService(new Date(), paymentModal.loc);
    const commissionRate = getCardCommissionRate();
    const commission = paymentMethod === 'Tarjeta' ? (addedAmount * commissionRate) : 0;
    const netAmount = paymentMethod === 'Tarjeta' ? (addedAmount - commission) : addedAmount;

    const abonoInstant = new Date();
    const abonoNoteTrim = (paymentModal.abonoNote || '').trim();
    const newPaymentRecord = {
      id: Date.now(),
      date: abonoInstant.toLocaleString('es-MX'),
      recordedAt: abonoInstant.toISOString(),
      amount: addedAmount, // bruto
      netAmount,
      method: paymentMethod,
      service: paymentService,
      reference: paymentMethod === 'Tarjeta' ? (paymentModal.cardReference || '').trim() : '',
      commission,
      registeredBy: currentUser?.username,
      ...(abonoNoteTrim ? { note: abonoNoteTrim } : {}),
    };
    const person = allParticipants.find((p) => String(p.id) === String(paymentModal.id));
    if (!person) {
      setPaymentModal(prev => ({ ...prev, error: 'Registro no encontrado.' }));
      return;
    }
    if (participantIsCancelled(person)) {
      setPaymentModal({ isOpen: false, loc: '', id: null, personName: '', amount: '', currentPaid: 0, error: '', isScholarship: 'No', baseCost: 0, paymentMethod: 'Efectivo', paymentService: getAutoPaymentService(new Date()), cardReference: '', abonoNote: '' });
      showToast('No puedes abonar a un registro dado de baja.');
      return;
    }
    const carPromptResult = await bzEvtPromptCarDataIfNeeded(person);
    if (carPromptResult === false) {
      showToast('Abono cancelado: completa los datos de carro o inténtalo de nuevo.');
      return;
    }
    if (Array.isArray(carPromptResult) && carPromptResult.length) {
      await persistBautizosCarMetaPatches(carPromptResult);
    }
    const paidGrossNow = parseFloat(person.paid || 0);
    const paidNetNow = Number.isFinite(parseFloat(person.paidNet || 0)) ? parseFloat(person.paidNet || 0) : paidGrossNow;
    const newPaidGross = paidGrossNow + addedAmount;
    const newPaidNet = paidNetNow + netAmount;
    const isLiquidado = newPaidGross >= baseCost;

    const mergedAfterAbono = { ...person, paid: newPaidGross, paidNet: newPaidNet, paymentHistory: [...(person.paymentHistory || []), newPaymentRecord] };
    const liqAfterAbono = Number(getLiquidationTarget(mergedAfterAbono)) || 0;
    const refundDiffAbono = Math.max(0, newPaidGross - liqAfterAbono);
    const payload = {
      paid: newPaidGross,
      paidNet: newPaidNet,
      paymentHistory: [...(person.paymentHistory || []), newPaymentRecord],
      refundPendingAmount: refundDiffAbono,
      refundPendingReason:
        refundDiffAbono > 0 ? (person.registeredCostManual === true ? 'manual_cost_credit' : 'campaign_discount') : ''
    };
    const pendingAfterAbono = Math.max((Number(baseCost) || 0) - newPaidGross, 0);
    const abonoCreatedAt = Date.now();
    const abonoNotification = {
      id: `wa-abn-${abonoCreatedAt}`,
      kind: 'abono',
      amount: addedAmount,
      pendingAmount: pendingAfterAbono,
      isLiquidado,
      liquidationTarget: liqAfterAbono,
      createdAt: abonoCreatedAt,
      sent: false,
      sentAt: null,
      message: buildFinanceWhatsAppMessage({
        person,
        loc: paymentModal.loc,
        amount: addedAmount,
        pendingAmount: pendingAfterAbono,
        isLiquidado,
        kind: 'abono',
        reportedAtMs: abonoCreatedAt,
        liquidationTarget: liqAfterAbono,
        eventSnapshot: currentEvent,
        rosterParticipants: allParticipants,
        avisoUrl: privacyNoticePublicUrl,
      }),
    };
    payload.whatsAppFinanceNotifications = [...(person.whatsAppFinanceNotifications || []), abonoNotification];
    if (globalConfig?.isDebugMode) {
      payload._isDebug = true;
      payload._debugSessionId = globalConfig.debugSessionId;
    }

    // Respaldo-primero: snapshot del abono y del historial de pagos ANTES del write.
    const _abonoLogId = buildLogId();
    await logSnapshotBackup(_abonoLogId, {
      entityType: 'payment',
      entityId: String(person.id),
      snapshot: {
        kind: 'abono',
        eventId: currentEvent?.id,
        eventName: currentEvent?.name,
        personId: String(person.id),
        personName: paymentModal.personName,
        location: paymentModal.loc,
        addedAmount,
        paymentMethod,
        paymentService,
        newPaymentRecord,
        paymentHistory: payload.paymentHistory || person.paymentHistory || [],
        paidBefore: paymentModal.currentPaid,
        paidAfter: newPaidGross,
        isLiquidado,
      },
    });
    try {
      await updateDoc(
        getDocRef('app_participants', String(person.id)),
        participantPatchForFirestoreWrite(person, payload, deleteField)
      );
    } catch (err) {
      const code = String(err?.code || '');
      console.error(err);
      logAppError('registerAbono.updateDoc', err, { personId: String(person.id), name: paymentModal.personName });
      await addLog(
        'Abono Financiero',
        `FALLÓ registrar abono de $${addedAmount} para ${paymentModal.personName} en ${paymentModal.loc}. Datos respaldados en el log.`,
        null,
        null,
        { collectionName: 'app_participants', docId: String(person.id), action: 'update', previousData: person },
        {
          logId: _abonoLogId,
          skipSnapshotWrite: true,
          hasSnapshot: true,
          entityType: 'payment',
          entityId: String(person.id),
          status: LOG_STATUS.ERROR,
          errorMessage: normalizeErrorMessage(err),
          isError: true,
        }
      );
      showToast(
        code === 'permission-denied'
          ? 'Firestore rechazó el abono (permisos o reglas). Datos respaldados en Actividad. Cierra sesión, vuelve a entrar y recarga con Ctrl+Shift+R. Si persiste, avisa al administrador.'
          : err?.message || 'No se pudo registrar el abono. Datos respaldados en Actividad.'
      );
      return;
    }
    refreshParticipantCache(person, 'Abono financiero', { personId: person.id, patch: payload });
    const abonoNoteLog = abonoNoteTrim ? ` Nota: «${abonoNoteTrim.length > 200 ? `${abonoNoteTrim.slice(0, 200)}…` : abonoNoteTrim}».` : '';
    const _abonoLog = `Registró un abono de $${addedAmount} (${paymentMethod}${newPaymentRecord.reference ? `, Ref: ${newPaymentRecord.reference}` : ''}) para ${paymentModal.personName} en la sede ${paymentModal.loc}${paymentService ? ` (Servicio: ${paymentService})` : ''}. (Pagado: $${paymentModal.currentPaid} -> $${newPaidGross})${isLiquidado ? ' [LIQUIDADO]' : ''}${abonoNoteLog}`;
    addLog(
      'Abono Financiero',
      _abonoLog,
      null,
      null,
      { collectionName: 'app_participants', docId: String(person.id), action: 'update', previousData: person },
      {
        logId: _abonoLogId,
        skipSnapshotWrite: true,
        hasSnapshot: true,
        entityType: 'payment',
        entityId: String(person.id),
        status: LOG_STATUS.OK,
      }
    );
    logParticipantActivity(String(person.id), 'abono', _abonoLog);
    setPaymentModal({
      isOpen: false,
      loc: '',
      id: null,
      personName: '',
      amount: '',
      currentPaid: 0,
      error: '',
      isScholarship: 'No',
      baseCost: 0,
      paymentMethod: 'Efectivo',
      paymentService: getAutoPaymentService(new Date()),
      cardReference: '',
      abonoNote: '',
    });
    showToast("Abono procesado correctamente.");
  };

  const openRegistrationCommentModal = useCallback((person, loc) => {
      const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
      const { anchor, anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, att, b, backfillActiveRosterBusy, base, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
      const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, cancelled, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, code, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
      const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, d, darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, deleted, docId, donations, downloadExcelBytes, draft, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, et, evType, event, eventDateDraft } = getScope();
      const { eventId, eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, fn, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, functions, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
      const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostId, hostSourceKey, id, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, info, inputClasses, inventory, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
      const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, key, kind, labelClasses, legacy, limit, linkWithCredential, liq, listPrice, live, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, locRaw, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logList, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
      const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, loginTime, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsToRevert, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, m, mapStaffLoginFirebaseError, max, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, merged, mergedPrivacyNotice, message, method, montoBecado, ms } = getScope();
      const { msg, n, na, nav, needsFirestoreResyncAfterBulk, net, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, o, others, out, p, paid, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, patch, pathname, payload, pending, performAppFullBackup, phone } = getScope();
      const { plan, prevSnap, previousData, privacyNoticePublicUrl, pruneEventScopedAccessMap, q, query, r, raw, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, res, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, row, rows, s, sa, scoped, secondaryAuth, sede } = getScope();
      const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
      const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, snap, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView, t } = getScope();
      const { tabSessionId, target, toLocalISODate, toast, today, toggleDarkMode, toggleDebugMode, total, uiModal, uid, updateDoc, updatePassword, url, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, v, val, vis, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (currentUser?.role === 'Lector') return;
    if (!hasEventAccess(currentEvent?.id) || !hasLocationAccess(loc)) {
      showToast("No tienes permisos para comentar en esta sede/evento.");
      return;
    }
    if (participantIsCancelled(person) || participantIsArchived(person)) {
      showToast('No se pueden agregar comentarios a este registro.');
      return;
    }
    setRegistrationCommentModal({
      isOpen: true,
      personId: person.id,
      personName: person.name || '',
      loc,
      draft: '',
    });
  }, [currentEvent?.id, currentUser?.role, hasEventAccess, hasLocationAccess, showToast]);

  const submitRegistrationCommentModal = useCallback(async () => {
      const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
      const { anchor, anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, att, b, backfillActiveRosterBusy, base, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
      const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, cancelled, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, code, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
      const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, d, darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, deleted, docId, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, et, evType, event, eventDateDraft } = getScope();
      const { eventId, eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, fn, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, functions, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
      const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostId, hostSourceKey, id, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, info, inputClasses, inventory, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
      const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, key, kind, labelClasses, legacy, limit, linkWithCredential, liq, listPrice, live, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, locRaw, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logList, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
      const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, loginTime, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsToRevert, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, m, mapStaffLoginFirebaseError, max, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, merged, mergedPrivacyNotice, message, method, montoBecado, ms } = getScope();
      const { msg, n, na, nav, needsFirestoreResyncAfterBulk, net, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, o, others, out, p, paid, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, patch, pathname, payload, pending, performAppFullBackup, phone } = getScope();
      const { plan, prevSnap, previousData, privacyNoticePublicUrl, pruneEventScopedAccessMap, q, query, r, raw, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, res, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, row, rows, s, sa, scoped, secondaryAuth, sede } = getScope();
      const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
      const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, snap, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView, t } = getScope();
      const { tabSessionId, target, toLocalISODate, toast, today, toggleDarkMode, toggleDebugMode, total, uiModal, uid, updateDoc, updatePassword, url, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, v, val, vis, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    const { personId, loc, draft } = registrationCommentModal;
    const text = String(draft || '').trim();
    if (!text) {
      showToast("Escribe un comentario antes de guardar.");
      return;
    }
    if (!hasEventAccess(currentEvent?.id) || !hasLocationAccess(loc)) {
      showToast("No tienes permisos para comentar en esta sede/evento.");
      return;
    }
    const person = allParticipants.find((p) => String(p.id) === String(personId));
    if (!person) {
      showToast('Registro no encontrado.');
      return;
    }
    const prev = Array.isArray(person.registrationComments) ? [...person.registrationComments] : [];
    const item = {
      id: `rc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      text,
      createdAt: Date.now(),
      createdBy: currentUser?.username || '',
    };
    const nextComments = [...prev, item];
    await updateDoc(
      getDocRef('app_participants', String(personId)),
      participantPatchForFirestoreWrite(person, { registrationComments: nextComments }, deleteField)
    );
    refreshParticipantCache(
      { ...person, location: loc },
      'Comentario general',
      { personId, patch: { registrationComments: nextComments } }
    );
    const textLog = text.length > 500 ? `${text.slice(0, 500)}…` : text;
    const _comLog = `Añadió comentario general al registro de ${person.name} (sede ${loc}): «${textLog}»`;
    addLog(
      'Comentarios',
      _comLog,
      null,
      null,
      { collectionName: 'app_participants', docId: String(personId), action: 'update', previousData: person }
    );
    logParticipantActivity(String(personId), 'comentario', _comLog);
    setRegistrationCommentModal({ isOpen: false, personId: null, personName: '', loc: '', draft: '' });
    showToast("Comentario guardado.");
  }, [addLog, logParticipantActivity, allParticipants, currentEvent?.id, currentUser?.username, hasEventAccess, hasLocationAccess, registrationCommentModal, refreshParticipantCache, showToast]);

  const openAbonoNoteEditModal = useCallback(
    (person, loc, paymentIndex) => {
      const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
      const { anchor, anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, att, b, backfillActiveRosterBusy, base, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
      const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, cancelled, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, code, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
      const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, d, darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, deleted, docId, donations, downloadExcelBytes, draft, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, et, evType, event, eventDateDraft } = getScope();
      const { eventId, eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, fn, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, functions, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
      const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostId, hostSourceKey, id, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, info, inputClasses, inventory, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
      const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, key, kind, labelClasses, legacy, limit, linkWithCredential, liq, listPrice, live, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, locRaw, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logList, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
      const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, loginTime, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsToRevert, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, m, mapStaffLoginFirebaseError, max, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, merged, mergedPrivacyNotice, message, method, montoBecado, ms } = getScope();
      const { msg, n, na, nav, needsFirestoreResyncAfterBulk, net, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, o, others, out, p, paid, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, patch, pathname, payload, pending, performAppFullBackup, phone } = getScope();
      const { plan, prevSnap, previousData, privacyNoticePublicUrl, pruneEventScopedAccessMap, q, query, r, raw, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, res, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, rows, s, sa, scoped, secondaryAuth, sede } = getScope();
      const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
      const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, snap, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView, t } = getScope();
      const { tabSessionId, target, toLocalISODate, toast, today, toggleDarkMode, toggleDebugMode, total, uiModal, uid, updateDoc, updatePassword, url, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, v, val, vis, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
      if (currentUser?.role === 'Lector') return;
      if (!hasEventAccess(currentEvent?.id) || !hasLocationAccess(loc)) return;
      if (participantIsCancelled(person)) {
        showToast('No aplica a registros cancelados.');
        return;
      }
      const hist = person.paymentHistory || [];
      const row = hist[paymentIndex];
      if (!row || row.kind === 'comment') return;
      if (
        !userCanOpenAbonoNoteEditModal(row, { currentUser, canEditAbonosAndPaymentHistory })
      ) {
        showToast('No tienes permiso para editar la nota de este abono.');
        return;
      }
      setAbonoNoteEditModal({
        isOpen: true,
        personId: person.id,
        loc,
        paymentIndex,
        draft: String(row.note || '').trim(),
      });
    },
    [canEditAbonosAndPaymentHistory, currentEvent?.id, currentUser, hasEventAccess, hasLocationAccess, showToast]
  );

  const saveAbonoNoteFromModal = useCallback(async () => {
      const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
      const { anchor, anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, att, b, backfillActiveRosterBusy, base, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
      const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, cancelled, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, code, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
      const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, d, darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, deleted, docId, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, et, evType, event, eventDateDraft } = getScope();
      const { eventId, eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, fn, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, functions, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
      const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostId, hostSourceKey, id, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, info, inputClasses, inventory, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
      const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, key, kind, labelClasses, legacy, limit, linkWithCredential, liq, listPrice, live, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, locRaw, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logList, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
      const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, loginTime, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsToRevert, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, m, mapStaffLoginFirebaseError, max, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, merged, mergedPrivacyNotice, message, method, montoBecado, ms } = getScope();
      const { msg, n, na, nav, needsFirestoreResyncAfterBulk, net, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, o, others, out, p, paid, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, patch, pathname, payload, pending, performAppFullBackup, phone } = getScope();
      const { plan, prevSnap, previousData, privacyNoticePublicUrl, pruneEventScopedAccessMap, q, query, r, raw, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, res, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, rows, s, sa, scoped, secondaryAuth, sede } = getScope();
      const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
      const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, snap, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView } = getScope();
      const { tabSessionId, target, toLocalISODate, toast, today, toggleDarkMode, toggleDebugMode, total, uiModal, uid, updateDoc, updatePassword, url, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, v, val, vis, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (currentUser?.role === 'Lector' || !abonoNoteEditModal.isOpen) return;
    const { personId, loc, paymentIndex, draft } = abonoNoteEditModal;
    const person = allParticipants.find((p) => String(p.id) === String(personId));
    if (!person) {
      showToast('Registro no encontrado.');
      setAbonoNoteEditModal({ isOpen: false, personId: null, loc: '', paymentIndex: null, draft: '' });
      return;
    }
    if (!hasEventAccess(currentEvent?.id) || !hasLocationAccess(loc)) {
      showToast("No tienes permisos.");
      return;
    }
    const hist = [...(person.paymentHistory || [])];
    if (paymentIndex == null || paymentIndex < 0 || paymentIndex >= hist.length) {
      showToast('Movimiento no encontrado.');
      return;
    }
    const row = hist[paymentIndex];
    if (!row || row.kind === 'comment') {
      setAbonoNoteEditModal({ isOpen: false, personId: null, loc: '', paymentIndex: null, draft: '' });
      return;
    }
    if (!userCanOpenAbonoNoteEditModal(row, { currentUser, canEditAbonosAndPaymentHistory })) {
      showToast('No tienes permiso para editar la nota de este abono.');
      return;
    }
    const prevNote = String(row.note || '').trim();
    const t = String(draft || '').trim();
    if (t === prevNote) {
      setAbonoNoteEditModal({ isOpen: false, personId: null, loc: '', paymentIndex: null, draft: '' });
      showToast('Sin cambios en la nota.');
      return;
    }
    const nextRow = { ...row };
    if (t) nextRow.note = t;
    else delete nextRow.note;
    hist[paymentIndex] = nextRow;
    await updateDoc(getDocRef('app_participants', String(personId)), { paymentHistory: hist });
    refreshParticipantCache(person, 'Nota de abono', { personId, patch: { paymentHistory: hist } });
    const tail = (s) => (s.length > 200 ? `${s.slice(0, 200)}…` : s);
    let logDetails;
    if (!prevNote && t) {
      logDetails = `Añadió nota a abono de ${person.name} (sede ${loc}, mov. ${paymentIndex + 1}): «${tail(t)}».`;
    } else if (prevNote && !t) {
      logDetails = `Eliminó nota de abono de ${person.name} (sede ${loc}, mov. ${paymentIndex + 1}): «${tail(prevNote)}».`;
    } else {
      logDetails = `Cambió nota de abono de ${person.name} (sede ${loc}, mov. ${paymentIndex + 1}): de «${tail(prevNote)}» a «${tail(t)}».`;
    }
    addLog(
      'Comentarios',
      logDetails,
      null,
      null,
      { collectionName: 'app_participants', docId: String(personId), action: 'update', previousData: person }
    );
    logParticipantActivity(String(personId), 'abono_nota', logDetails);
    setAbonoNoteEditModal({ isOpen: false, personId: null, loc: '', paymentIndex: null, draft: '' });
    showToast('Nota del abono guardada.');
  }, [
    abonoNoteEditModal,
    addLog,
    logParticipantActivity,
    allParticipants,
    canEditAbonosAndPaymentHistory,
    currentEvent?.id,
    currentUser,
    hasEventAccess,
    hasLocationAccess,
    showToast,
  ]);

  const deleteRegistrationCommentItem = useCallback(
    async (person, loc, c) => {
      const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
      const { anchor, anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, att, b, backfillActiveRosterBusy, base, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
      const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, cancelled, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, code, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
      const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, d, darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, deleted, docId, donations, downloadExcelBytes, draft, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, et, evType, event, eventDateDraft } = getScope();
      const { eventId, eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, fn, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, functions, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
      const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostId, hostSourceKey, id, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, info, inputClasses, inventory, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
      const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, key, kind, labelClasses, legacy, limit, linkWithCredential, liq, listPrice, live, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, locRaw, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logList, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
      const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, loginTime, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsToRevert, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, m, mapStaffLoginFirebaseError, max, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, merged, mergedPrivacyNotice, message, method, montoBecado, ms } = getScope();
      const { msg, n, na, nav, needsFirestoreResyncAfterBulk, net, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, o, others, out, p, paid, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, pathname, payload, pending, performAppFullBackup, phone } = getScope();
      const { plan, prevSnap, previousData, privacyNoticePublicUrl, pruneEventScopedAccessMap, q, query, r, raw, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, res, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, row, rows, s, sa, scoped, secondaryAuth, sede } = getScope();
      const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
      const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, snap, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView, t } = getScope();
      const { tabSessionId, target, toLocalISODate, toast, today, toggleDarkMode, toggleDebugMode, total, uiModal, uid, updateDoc, updatePassword, url, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, v, val, vis, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
      if (currentUser?.role === 'Lector') return;
      if (!hasEventAccess(currentEvent?.id) || !hasLocationAccess(loc)) {
        showToast("No tienes permisos.");
        return;
      }
      if (!userCanDeleteRegistrationComment(c, { currentUser, isSuperUser, hasAdminRights })) {
        showToast('No tienes permiso para eliminar este comentario.');
        return;
      }
      const fresh = allParticipants.find((p) => String(p.id) === String(person.id));
      if (!fresh) {
        showToast('Registro no encontrado.');
        return;
      }
      const textFull = c.text || '';
      const preview = textFull.length > 200 ? `${textFull.slice(0, 200)}…` : textFull;
      if (!window.confirm('¿Eliminar este comentario del registro?')) return;

      let patch = null;
      if (c._source === 'field') {
        const next = (Array.isArray(fresh.registrationComments) ? fresh.registrationComments : []).filter(
          (x) => String(x.id) !== String(c.id)
        );
        patch = { registrationComments: next };
        await updateDoc(getDocRef('app_participants', String(fresh.id)), patch);
      } else if (c._source === 'legacy' && c._fullPaymentHistoryIndex != null) {
        const hist = [...(fresh.paymentHistory || [])];
        const idx = c._fullPaymentHistoryIndex;
        if (idx < 0 || idx >= hist.length || hist[idx]?.kind !== 'comment') {
          showToast('Este comentario ya no está en el historial (actualiza la vista).');
          return;
        }
        hist.splice(idx, 1);
        patch = { paymentHistory: hist };
        await updateDoc(getDocRef('app_participants', String(fresh.id)), patch);
      } else {
        return;
      }
      if (patch) {
        refreshParticipantCache(fresh, 'Eliminar comentario general', {
          personId: fresh.id,
          patch,
        });
      }
      const _delComLog = `Eliminó comentario general del registro de ${fresh.name} (sede ${loc}): «${preview}»`;
      addLog(
        'Comentarios',
        _delComLog,
        null,
        null,
        { collectionName: 'app_participants', docId: String(fresh.id), action: 'update', previousData: fresh }
      );
      logParticipantActivity(String(fresh.id), 'comentario', _delComLog);
      showToast('Comentario eliminado.');
    },
    [addLog, logParticipantActivity, allParticipants, currentEvent?.id, currentUser, hasAdminRights, hasEventAccess, hasLocationAccess, isSuperUser, refreshParticipantCache, showToast]
  );

  const clearAbonoNoteForPaymentRow = useCallback(
    async (person, loc, pay, fullIdx) => {
      const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
      const { anchor, anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, att, b, backfillActiveRosterBusy, base, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
      const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, cancelled, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, code, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
      const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, d, darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, deleted, docId, donations, downloadExcelBytes, draft, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, et, evType, event, eventDateDraft } = getScope();
      const { eventId, eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, fn, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, functions, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
      const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostId, hostSourceKey, id, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, info, inputClasses, inventory, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
      const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, key, kind, labelClasses, legacy, limit, linkWithCredential, liq, listPrice, live, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, locRaw, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logList, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
      const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, loginTime, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsToRevert, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, m, mapStaffLoginFirebaseError, max, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, merged, mergedPrivacyNotice, message, method, montoBecado, ms } = getScope();
      const { msg, n, na, nav, needsFirestoreResyncAfterBulk, net, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, o, others, out, p, paid, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, patch, pathname, payload, pending, performAppFullBackup, phone } = getScope();
      const { plan, prevSnap, previousData, privacyNoticePublicUrl, pruneEventScopedAccessMap, q, query, r, raw, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, res, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, rows, s, sa, scoped, secondaryAuth, sede } = getScope();
      const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
      const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, snap, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView, t } = getScope();
      const { tabSessionId, target, toLocalISODate, toast, today, toggleDarkMode, toggleDebugMode, total, uiModal, uid, updateDoc, updatePassword, url, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, v, val, vis, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
      if (currentUser?.role === 'Lector') return;
      if (!hasEventAccess(currentEvent?.id) || !hasLocationAccess(loc)) {
        showToast("No tienes permisos.");
        return;
      }
      if (!userCanDeleteAbonoNote(pay, { currentUser, isSuperUser, hasAdminRights })) {
        showToast('No tienes permiso para quitar esta nota.');
        return;
      }
      if (participantIsCancelled(person)) {
        showToast('No aplica a registros cancelados.');
        return;
      }
      const fresh = allParticipants.find((p) => String(p.id) === String(person.id));
      if (!fresh) {
        showToast('Registro no encontrado.');
        return;
      }
      const hist = [...(fresh.paymentHistory || [])];
      if (fullIdx < 0 || fullIdx >= hist.length) {
        showToast('Movimiento no encontrado.');
        return;
      }
      const row = hist[fullIdx];
      if (!row || row.kind === 'comment') return;
      const prevNote = String(row.note || '').trim();
      if (!prevNote) {
        showToast('Esta nota ya fue quitada.');
        return;
      }
      if (!window.confirm('¿Quitar la nota de este abono?')) return;
      const nextRow = { ...row };
      delete nextRow.note;
      hist[fullIdx] = nextRow;
      await updateDoc(getDocRef('app_participants', String(fresh.id)), { paymentHistory: hist });
      refreshParticipantCache(fresh, 'Eliminar nota de abono', {
        personId: fresh.id,
        patch: { paymentHistory: hist },
      });
      const tail = (s) => (s.length > 200 ? `${s.slice(0, 200)}…` : s);
      const _clrNoteLog = `Eliminó nota de abono de ${fresh.name} (sede ${loc}, mov. ${fullIdx + 1}): «${tail(prevNote)}»`;
      addLog(
        'Comentarios',
        _clrNoteLog,
        null,
        null,
        { collectionName: 'app_participants', docId: String(fresh.id), action: 'update', previousData: fresh }
      );
      logParticipantActivity(String(fresh.id), 'abono_nota', _clrNoteLog);
      showToast('Nota eliminada.');
    },
    [addLog, logParticipantActivity, allParticipants, currentEvent?.id, currentUser, hasAdminRights, hasEventAccess, hasLocationAccess, isSuperUser, showToast]
  );

  const closePaymentMethodEditModal = () =>
    setPaymentMethodEditModal({
      isOpen: false,
      loc: '',
      personId: null,
      personName: '',
      paymentIndex: null,
      paymentId: null,
      amount: 0,
      amountInput: '',
      oldMethod: 'Efectivo',
      paymentMethod: 'Efectivo',
      cardReference: '',
      isRefundDisbursement: false,
    });

  const openPaymentMethodEditModal = (person, personLoc, paymentIndex) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
    const { anchor, anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, att, b, backfillActiveRosterBusy, base, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, cancelled, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, code, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, d, darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, deleted, docId, donations, downloadExcelBytes, draft, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, et, evType, event, eventDateDraft } = getScope();
    const { eventId, eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, fn, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, functions, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostId, hostSourceKey, id, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, info, inputClasses, inventory, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, key, kind, labelClasses, legacy, limit, linkWithCredential, liq, listPrice, live, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, loc, locRaw, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logList, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, loginTime, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsToRevert, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, m, mapStaffLoginFirebaseError, max, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, merged, mergedPrivacyNotice, message, method, montoBecado, ms } = getScope();
    const { msg, n, na, nav, needsFirestoreResyncAfterBulk, net, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, o, others, out, p, paid, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, patch, pathname, payload, pending, performAppFullBackup, phone } = getScope();
    const { plan, prevSnap, previousData, privacyNoticePublicUrl, pruneEventScopedAccessMap, q, query, r, raw, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, res, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, rows, s, sa, scoped, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, snap, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView, t } = getScope();
    const { tabSessionId, target, toLocalISODate, toast, today, toggleDarkMode, toggleDebugMode, total, uiModal, uid, updateDoc, updatePassword, url, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, v, val, vis, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!canEditAbonosAndPaymentHistory) return;
    const hist = Array.isArray(person?.paymentHistory) ? person.paymentHistory : [];
    const row = hist[paymentIndex];
    if (!row || row.kind === 'comment') return;
    if (participantIsCancelled(person) && row.kind !== REFUND_DISBURSEMENT_PAYMENT_KIND) return;
    const inferredMethod = row.method || (person.paymentMethod === 'Tarjeta' ? 'Tarjeta' : 'Efectivo');
    const displayAmount = Math.abs(Number(row.amount) || 0);
    setPaymentMethodEditModal({
      isOpen: true,
      loc: personLoc || person.location || '',
      personId: person.id,
      personName: person.name || 'participante',
      paymentIndex,
      paymentId: row.id ?? null,
      amount: Number(row.amount) || 0,
      amountInput: String(displayAmount),
      oldMethod: inferredMethod,
      paymentMethod: inferredMethod,
      cardReference: String(row.reference || ''),
      isRefundDisbursement: row.kind === REFUND_DISBURSEMENT_PAYMENT_KIND,
    });
  };

  const handleSavePaymentMethodEdit = async () => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
    const { anchor, anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, att, b, backfillActiveRosterBusy, base, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, cancelled, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, code, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, d, darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, deleted, docId, donations, downloadExcelBytes, draft, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, et, evType, event, eventDateDraft } = getScope();
    const { eventId, eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, fn, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, functions, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostId, hostSourceKey, id, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, info, inputClasses, inventory, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, key, kind, labelClasses, legacy, limit, linkWithCredential, liq, listPrice, live, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, loc, locRaw, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logList, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, loginTime, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsToRevert, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, m, mapStaffLoginFirebaseError, max, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, merged, mergedPrivacyNotice, message, method, montoBecado, ms } = getScope();
    const { msg, n, na, nav, needsFirestoreResyncAfterBulk, net, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, o, others, out, p, paid, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, patch, pathname, pending, performAppFullBackup, phone } = getScope();
    const { plan, prevSnap, previousData, privacyNoticePublicUrl, pruneEventScopedAccessMap, q, query, r, raw, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, res, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, rows, s, sa, scoped, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, snap, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView, t } = getScope();
    const { tabSessionId, target, toLocalISODate, toast, today, toggleDarkMode, toggleDebugMode, total, uiModal, uid, updateDoc, updatePassword, url, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, v, val, vis, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!canEditAbonosAndPaymentHistory || !paymentMethodEditModal.isOpen) return;
    const person = allParticipants.find((p) => String(p.id) === String(paymentMethodEditModal.personId));
    if (!person) {
      showToast('Participante no encontrado.');
      closePaymentMethodEditModal();
      return;
    }
    const idx = paymentMethodEditModal.paymentIndex;
    const hist = [...(person.paymentHistory || [])];
    if (idx == null || idx < 0 || idx >= hist.length) {
      showToast('Movimiento no encontrado.');
      closePaymentMethodEditModal();
      return;
    }
    const row = hist[idx];
    if (!row || row.kind === 'comment') {
      showToast('Ese movimiento no admite cambio de método.');
      closePaymentMethodEditModal();
      return;
    }
    if (paymentMethodEditModal.paymentId != null && String(row.id) !== String(paymentMethodEditModal.paymentId)) {
      showToast('El historial cambió; vuelve a abrir el editor.');
      closePaymentMethodEditModal();
      return;
    }

    const newMethod = paymentMethodEditModal.paymentMethod === 'Tarjeta' ? 'Tarjeta' : 'Efectivo';
    if (
      newMethod === 'Tarjeta' &&
      !isCardPaymentAllowedForLocation(currentEvent, person.location || paymentMethodEditModal.loc)
    ) {
      showToast('El pago con tarjeta está deshabilitado para esta sede o evento.');
      return;
    }
    const oldAmount = Number(row.amount) || 0;
    const isRefundRow = row.kind === REFUND_DISBURSEMENT_PAYMENT_KIND || paymentMethodEditModal.isRefundDisbursement;
    const canEditAmount = isSuperUser;
    const parsedAmount = parseFloat(String(paymentMethodEditModal.amountInput ?? '').replace(',', '.'));
    const newAmountAbs = canEditAmount ? Math.abs(parsedAmount) : Math.abs(oldAmount);
    if (!Number.isFinite(newAmountAbs)) {
      showToast('Monto inválido. Escribe un número válido.');
      return;
    }
    if (!isRefundRow && newAmountAbs < 0) {
      showToast('El monto no puede ser negativo.');
      return;
    }
    if (isRefundRow && newAmountAbs <= 0) {
      showToast('El monto de la devolución debe ser mayor a cero.');
      return;
    }
    const commissionRate = getCardCommissionRate();
    const oldMethod = row.method || (person.paymentMethod === 'Tarjeta' ? 'Tarjeta' : 'Efectivo');
    const oldGrossAbs = Math.abs(oldAmount);
    const oldNetAbs =
      Number.isFinite(parseFloat(row.netAmount))
        ? Math.abs(parseFloat(row.netAmount))
        : (oldMethod === 'Tarjeta' ? (oldGrossAbs - (oldGrossAbs * commissionRate)) : oldGrossAbs);
    const newCommission = newMethod === 'Tarjeta' ? (newAmountAbs * commissionRate) : 0;
    const newNetAbs = newMethod === 'Tarjeta' ? (newAmountAbs - newCommission) : newAmountAbs;
    const nextReference = newMethod === 'Tarjeta' ? String(paymentMethodEditModal.cardReference || '').trim() : '';

    if (
      newMethod === oldMethod &&
      String(nextReference || '') === String(row.reference || '') &&
      Math.abs(newAmountAbs - oldGrossAbs) < 0.000001
    ) {
      showToast('No hubo cambios en el abono.');
      closePaymentMethodEditModal();
      return;
    }

    if (isRefundRow) {
      const refundAtMs =
        parsePaymentHistoryRecordedAtMs(row) ?? parseRefundDisbursedAtMs(person) ?? Date.now();
      const refundService = getAutoPaymentService(
        new Date(refundAtMs),
        paymentMethodEditModal.loc || person.location || undefined
      );
      hist[idx] = {
        ...row,
        amount: -newAmountAbs,
        method: newMethod,
        netAmount: -newNetAbs,
        commission: newCommission,
        reference: nextReference,
        service: refundService,
        kind: REFUND_DISBURSEMENT_PAYMENT_KIND,
      };
      const payload = {
        paymentHistory: hist,
        refundDisbursedAmount: newAmountAbs,
        refundDisbursedMethod: newMethod,
        refundDisbursedAt: refundAtMs,
        ...(globalConfig?.isDebugMode ? { _isDebug: true, _debugSessionId: globalConfig.debugSessionId } : {}),
      };
      await updateDoc(
        getDocRef('app_participants', String(person.id)),
        participantPatchForFirestoreWrite(person, payload, deleteField)
      );
      refreshParticipantCache(person, 'Editar devolución', { personId: person.id, patch: payload });
      const _refEditLog = `Actualizó devolución en historial para ${person.name} (${paymentMethodEditModal.loc || person.location || '?'}): ${oldMethod} -> ${newMethod}${Math.abs(newAmountAbs - oldGrossAbs) > 0.000001 ? `, monto ${formatMoney(oldGrossAbs)} -> ${formatMoney(newAmountAbs)}` : ''}.`;
      addLog(
        'Corte de caja',
        _refEditLog,
        null,
        null,
        { collectionName: 'app_participants', docId: String(person.id), action: 'update', previousData: person }
      );
      logParticipantActivity(String(person.id), 'finanzas', _refEditLog);
      closePaymentMethodEditModal();
      showToast('Devolución actualizada.');
      return;
    }

    const newAmount = newAmountAbs;
    const newNet = newNetAbs;

    hist[idx] = {
      ...row,
      amount: newAmount,
      method: newMethod,
      netAmount: newNet,
      commission: newCommission,
      reference: nextReference,
    };

    const originalPaidGross = parseFloat(person.paid || 0) || 0;
    const originalPaidNet = Number.isFinite(parseFloat(person.paidNet || 0)) ? parseFloat(person.paidNet || 0) : originalPaidGross;
    const nextPaidGross = originalPaidGross + (newAmount - oldAmount);
    const nextPaidNet = originalPaidNet + (newNet - oldNet);
    const payload = {
      paymentHistory: hist,
      paid: nextPaidGross,
      paidNet: nextPaidNet,
      ...(globalConfig?.isDebugMode ? { _isDebug: true, _debugSessionId: globalConfig.debugSessionId } : {}),
    };

    await updateDoc(
      getDocRef('app_participants', String(person.id)),
      participantPatchForFirestoreWrite(person, payload, deleteField)
    );
    refreshParticipantCache(person, 'Editar abono', { personId: person.id, patch: payload });
    const _pmEditLog = `Actualizó abono en historial para ${person.name} (${paymentMethodEditModal.loc || person.location || '?'}): ${oldMethod} -> ${newMethod}${Math.abs(newAmount - oldAmount) > 0.000001 ? `, monto ${formatMoney(oldAmount)} -> ${formatMoney(newAmount)}` : ''}${nextReference ? ` (Ref: ${nextReference})` : ''}.`;
    addLog(
      'Finanzas',
      _pmEditLog,
      null,
      null,
      { collectionName: 'app_participants', docId: String(person.id), action: 'update', previousData: person },
      { entityType: 'payment', entityId: String(person.id), status: LOG_STATUS.OK, snapshot: { kind: 'abono_editado', personId: String(person.id), personName: person.name, paymentHistory: hist, paidAfter: nextPaidGross, paidNetAfter: nextPaidNet } }
    );
    logParticipantActivity(String(person.id), 'finanzas', _pmEditLog);
    closePaymentMethodEditModal();
    showToast('Tipo de abono actualizado.');
  };

  const closeSuperDateEditModal = () =>
    setSuperDateEditModal({
      isOpen: false,
      mode: '',
      personId: null,
      loc: '',
      paymentIndex: null,
      paymentId: null,
      datetimeLocal: '',
    });

  const openSuperRegistrationDateEdit = (person, personLoc) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
    const { anchor, anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, att, b, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, cancelled, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, code, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, d, darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, deleted, docId, donations, downloadExcelBytes, draft, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, et, evType, event, eventDateDraft } = getScope();
    const { eventId, eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, fn, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, functions, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostId, hostSourceKey, id, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, info, inputClasses, inventory, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, key, kind, labelClasses, legacy, limit, linkWithCredential, liq, listPrice, live, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, loc, locRaw, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logList, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, loginTime, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsToRevert, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, m, mapStaffLoginFirebaseError, max, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, merged, mergedPrivacyNotice, message, method, montoBecado, ms } = getScope();
    const { msg, n, na, nav, needsFirestoreResyncAfterBulk, net, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, o, others, out, p, paid, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, patch, pathname, payload, pending, performAppFullBackup, phone } = getScope();
    const { plan, prevSnap, previousData, privacyNoticePublicUrl, pruneEventScopedAccessMap, q, query, r, raw, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, res, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, row, rows, s, sa, scoped, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, snap, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView, t } = getScope();
    const { tabSessionId, target, toLocalISODate, toast, today, toggleDarkMode, toggleDebugMode, total, uiModal, uid, updateDoc, updatePassword, url, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, v, val, vis, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!canEditRegistryDates) return;
    const hist = person.paymentHistory || [];
    let base = person.registeredAt;
    if (!base) {
      const firstPay = hist.find((h) => h && h.kind !== 'comment');
      if (firstPay?.recordedAt) base = firstPay.recordedAt;
      else if (firstPay && typeof firstPay.id === 'number') base = firstPay.id;
    }
    if (base == null || base === '') base = Date.now();
    const eventFallback = currentEvent?.dateStart || currentEvent?.date || '';
    const dtLocal =
      toDatetimeLocalValue(base) ||
      (eventFallback ? toDatetimeLocalValue(`${String(eventFallback).trim()}T12:00:00`) : '');
    setSuperDateEditModal({
      isOpen: true,
      mode: 'registration',
      personId: person.id,
      loc: personLoc,
      paymentIndex: null,
      paymentId: null,
      datetimeLocal: dtLocal || toDatetimeLocalValue(Date.now()),
    });
  };

  const openSuperPaymentDateEdit = (person, personLoc, paymentIndex) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
    const { anchor, anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, att, b, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, cancelled, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, code, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, d, darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, deleted, docId, donations, downloadExcelBytes, draft, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, et, evType, event, eventDateDraft } = getScope();
    const { eventId, eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, fn, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, functions, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostId, hostSourceKey, id, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, info, inputClasses, inventory, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, key, kind, labelClasses, legacy, limit, linkWithCredential, liq, listPrice, live, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, loc, locRaw, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logList, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, loginTime, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsToRevert, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, m, mapStaffLoginFirebaseError, max, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, merged, mergedPrivacyNotice, message, method, montoBecado, ms } = getScope();
    const { msg, n, na, nav, needsFirestoreResyncAfterBulk, net, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, o, others, out, p, paid, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, patch, pathname, payload, pending, performAppFullBackup, phone } = getScope();
    const { plan, prevSnap, previousData, privacyNoticePublicUrl, pruneEventScopedAccessMap, q, query, r, raw, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, res, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, row, rows, s, sa, scoped, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, snap, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView, t } = getScope();
    const { tabSessionId, target, toLocalISODate, toast, today, toggleDarkMode, toggleDebugMode, total, uiModal, uid, updateDoc, updatePassword, url, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, v, val, vis, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!canEditRegistryDates) return;
    const hist = person.paymentHistory || [];
    const pay = hist[paymentIndex];
    if (!pay || pay.kind === 'comment') return;
    if (participantIsCancelled(person) && pay.kind !== REFUND_DISBURSEMENT_PAYMENT_KIND) return;
    let base = pay.recordedAt;
    if (!base && typeof pay.id === 'number') base = pay.id;
    if (base == null || base === '') base = Date.now();
    setSuperDateEditModal({
      isOpen: true,
      mode: 'payment',
      personId: person.id,
      loc: personLoc,
      paymentIndex,
      paymentId: pay.id ?? null,
      datetimeLocal: toDatetimeLocalValue(base),
    });
  };

  const ensureRefundDisbursementPaymentHistoryIndex = useCallback(
    async (person) => {
      const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
      const { anchor, anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, att, b, backfillActiveRosterBusy, base, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
      const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, cancelled, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, code, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
      const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, d, darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, deleted, docId, donations, downloadExcelBytes, draft, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, et, evType, event, eventDateDraft } = getScope();
      const { eventId, eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, fn, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, functions, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
      const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostId, hostSourceKey, id, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, info, inputClasses, inventory, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
      const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, key, kind, labelClasses, legacy, limit, linkWithCredential, liq, listPrice, live, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, loc, locRaw, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logList, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
      const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, loginTime, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsToRevert, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, m, mapStaffLoginFirebaseError, max, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, merged, mergedPrivacyNotice, message, method, montoBecado, ms } = getScope();
      const { msg, n, na, nav, needsFirestoreResyncAfterBulk, net, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, o, others, out, p, paid, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, patch, pathname, pending, performAppFullBackup, phone } = getScope();
      const { plan, prevSnap, previousData, privacyNoticePublicUrl, pruneEventScopedAccessMap, q, query, r, raw, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, res, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, rows, s, sa, scoped, secondaryAuth, sede } = getScope();
      const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
      const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, snap, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView, t } = getScope();
      const { tabSessionId, target, toLocalISODate, toast, today, toggleDarkMode, toggleDebugMode, total, uiModal, uid, updateDoc, updatePassword, url, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, v, val, vis, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
      if (!person || !participantHasRefundDisbursement(person)) return -1;
      const hist = [...(person.paymentHistory || [])];
      const rowId = refundDisbursementPaymentHistoryId(person.id);
      let idx = hist.findIndex(
        (h) => h && (h.kind === REFUND_DISBURSEMENT_PAYMENT_KIND || String(h.id) === rowId)
      );
      if (idx >= 0) return idx;
      const row = buildRefundDisbursementPaymentHistoryRow({
        personId: person.id,
        grossAmount: person.refundDisbursedAmount,
        method: person.refundDisbursedMethod,
        atMs: parseRefundDisbursedAtMs(person),
        registeredBy: person.refundDisbursedBy,
        computeNetAmountByMethod,
        service: getAutoPaymentService(
          new Date(parseRefundDisbursedAtMs(person) || Date.now()),
          resolveCancelledRefundSede(person) || person.location || undefined
        ),
      });
      if (!row) return -1;
      hist.push(row);
      const payload = {
        paymentHistory: hist,
        ...(globalConfig?.isDebugMode ? { _isDebug: true, _debugSessionId: globalConfig.debugSessionId } : {}),
      };
      await updateDoc(getDocRef('app_participants', String(person.id)), payload);
      refreshParticipantCache(person, 'Historial devolución', { personId: person.id, patch: payload });
      return hist.length - 1;
    },
    [computeNetAmountByMethod, getAutoPaymentService, globalConfig?.debugSessionId, globalConfig?.isDebugMode, refreshParticipantCache]
  );

  const openPaymentHistoryEditForPay = useCallback(
    async (person, loc, pay, mode) => {
      const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
      const { anchor, anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, att, b, backfillActiveRosterBusy, base, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
      const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, cancelled, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, code, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
      const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, d, darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, deleted, docId, donations, downloadExcelBytes, draft, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, et, evType, event, eventDateDraft } = getScope();
      const { eventId, eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, fn, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, functions, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
      const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostId, hostSourceKey, id, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, info, inputClasses, inventory, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
      const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, key, kind, labelClasses, legacy, limit, linkWithCredential, liq, listPrice, live, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, locRaw, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logList, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
      const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, loginTime, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsToRevert, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, m, mapStaffLoginFirebaseError, max, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, merged, mergedPrivacyNotice, message, method, montoBecado, ms } = getScope();
      const { msg, n, na, nav, needsFirestoreResyncAfterBulk, net, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, o, others, out, p, paid, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, patch, pathname, payload, pending, performAppFullBackup, phone } = getScope();
      const { plan, prevSnap, previousData, privacyNoticePublicUrl, pruneEventScopedAccessMap, q, query, r, raw, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, res, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, row, rows, s, sa, scoped, secondaryAuth, sede } = getScope();
      const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
      const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, snap, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView, t } = getScope();
      const { tabSessionId, target, toLocalISODate, toast, today, toggleDarkMode, toggleDebugMode, total, uiModal, uid, updateDoc, updatePassword, url, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, v, val, vis, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
      let personRef = person;
      let idx = (personRef.paymentHistory || []).findIndex((h) => h && pay?.id != null && String(h.id) === String(pay.id));
      if (idx < 0 && pay?.kind === REFUND_DISBURSEMENT_PAYMENT_KIND) {
        idx = await ensureRefundDisbursementPaymentHistoryIndex(personRef);
        if (idx >= 0) {
          personRef = allParticipants.find((p) => String(p.id) === String(person.id)) || personRef;
        }
      }
      if (idx < 0) {
        showToast('No se encontró el movimiento en el historial.');
        return;
      }
      if (mode === 'date') openSuperPaymentDateEdit(personRef, loc, idx);
      else openPaymentMethodEditModal(personRef, loc, idx);
    },
    [allParticipants, ensureRefundDisbursementPaymentHistoryIndex, showToast]
  );

  const handleSuperSaveDateEdit = async () => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
    const { anchor, anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, att, b, backfillActiveRosterBusy, base, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, cancelled, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, deleted, docId, donations, downloadExcelBytes, draft, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, et, evType, event, eventDateDraft } = getScope();
    const { eventId, eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, fn, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, functions, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostId, hostSourceKey, id, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, info, inputClasses, inventory, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, key, kind, labelClasses, legacy, limit, linkWithCredential, liq, listPrice, live, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, loc, locRaw, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logList, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, loginTime, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsToRevert, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, m, mapStaffLoginFirebaseError, max, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, merged, mergedPrivacyNotice, message, method, montoBecado, ms } = getScope();
    const { msg, n, na, nav, needsFirestoreResyncAfterBulk, net, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, o, others, out, p, paid, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, patch, pathname, pending, performAppFullBackup, phone } = getScope();
    const { plan, prevSnap, previousData, privacyNoticePublicUrl, pruneEventScopedAccessMap, q, query, r, raw, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, res, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, rows, s, sa, scoped, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, snap, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView, t } = getScope();
    const { tabSessionId, target, toLocalISODate, toast, today, toggleDarkMode, toggleDebugMode, total, uiModal, uid, updateDoc, updatePassword, url, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, v, val, vis, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!canEditRegistryDates || !superDateEditModal.isOpen) return;
    const iso = fromDatetimeLocalToIso(superDateEditModal.datetimeLocal);
    if (!iso) {
      showToast('Indica una fecha y hora válidas.');
      return;
    }
    const personId = superDateEditModal.personId;
    const person = allParticipants.find((p) => String(p.id) === String(personId));
    if (!person) {
      showToast('Participante no encontrado.');
      return;
    }
    const debugExtras = globalConfig?.isDebugMode
      ? { _isDebug: true, _debugSessionId: globalConfig.debugSessionId }
      : {};
    const locLabel = superDateEditModal.loc || person.location || '';
    const dateEditActor = isSuperUser ? 'SuperUsuario' : (currentUser?.username || 'Usuario');
    try {
      if (superDateEditModal.mode === 'registration') {
        const oldRegIso = person.registeredAt;
        const oldRegMs = parseFlexibleInstantMs(oldRegIso);
        const hist = [...(person.paymentHistory || [])];
        const dNew = new Date(iso);
        const dateStrNew = dNew.toLocaleString('es-MX');
        const serviceForNewInstant = getAutoPaymentService(dNew, locLabel || undefined);
        const firstPayIdx = hist.findIndex((r) => r && r.kind !== 'comment');
        let historyChanged = false;
        for (let i = 0; i < hist.length; i += 1) {
          const row = hist[i];
          if (!row || row.kind === 'comment') continue;
          let tiedToRegistration = false;
          if (oldRegIso && row.recordedAt) {
            if (String(row.recordedAt).trim() === String(oldRegIso).trim()) {
              tiedToRegistration = true;
            } else {
              const rowMsFromRec = parseFlexibleInstantMs(row.recordedAt);
              if (oldRegMs != null && rowMsFromRec != null && rowMsFromRec === oldRegMs) {
                tiedToRegistration = true;
              }
            }
          }
          if (!tiedToRegistration && firstPayIdx === i && oldRegMs != null) {
            const rowMs = getPaymentRowInstantMsPreferRecorded(row);
            if (rowMs != null && Math.abs(rowMs - oldRegMs) <= 5000) {
              tiedToRegistration = true;
            }
          }
          if (tiedToRegistration) {
            hist[i] = { ...row, recordedAt: iso, date: dateStrNew, service: serviceForNewInstant };
            historyChanged = true;
          }
        }

        // Requerimiento: al editar manualmente la fecha, el costo a pagar debe reflejar la fecha nueva,
        // considerando tanto el precio dinámico como la vigencia de campañas de descuento.
        const newAnchorMs = dNew.getTime();
        const isoDate = new Date(newAnchorMs).toISOString().split('T')[0];
        const pricingForNewDate = getPricingFromSnapshotForDate(currentEvent, newAnchorMs);
        const baseNew = getPersonCost(person, pricingForNewDate, currentEvent);

        const selectedCampaignId = String(person.discountCampaignId || '').trim();
        const selectedCampaignConcept = String(person.discountCampaignConcept || '').trim();
        const campaignById = selectedCampaignId ? findDiscountCampaignById(currentEvent, selectedCampaignId) : null;
        const campaignByConcept = !campaignById && selectedCampaignConcept && Array.isArray(currentEvent?.discountCampaigns)
          ? currentEvent.discountCampaigns.find(c =>
            String(c?.concept || '').trim() === selectedCampaignConcept &&
            campaignMatchesPersonProfile(c, person)
          ) || null
          : null;
        const selectedCampaign = campaignById || campaignByConcept;

        const hasDiscountSelection = selectedCampaignId !== '' || selectedCampaignConcept !== '';
        const campaignAppliesOnNewDate =
          selectedCampaign &&
          campaignMatchesPersonProfile(selectedCampaign, person) &&
          (!discountCampaignHasDateRange(selectedCampaign) || isDiscountCampaignVigenteOnDate(selectedCampaign, isoDate));

        let nextRegisteredCost = baseNew;
        if (hasDiscountSelection) {
          // Si la campaña no aplica por vigencia/fechas, se revierte al costo base del evento para esa fecha.
          nextRegisteredCost = campaignAppliesOnNewDate
            ? Math.max(0, Number(selectedCampaign?.finalAmount) || 0)
            : baseNew;
        }

        const regPayload = {
          registeredAt: iso,
          paymentService: serviceForNewInstant,
          ...(person.registeredCostManual === true ? {} : { registeredCost: nextRegisteredCost }),
          ...participantConsentFirestoreRepairPatch(person, deleteField),
          ...debugExtras
        };
        if (historyChanged) regPayload.paymentHistory = hist;
        await updateDoc(getDocRef('app_participants', String(personId)), regPayload);
        refreshParticipantCache(person, 'Editar fecha de registro', { personId, patch: regPayload });
        const _dtRegLog = `${dateEditActor} ajustó la fecha de registro de ${person.name || 'participante'} (sede ${locLabel})${historyChanged ? ' y la marca de tiempo del pago inicial vinculado' : ''}.`;
        addLog(
          'Sistema',
          _dtRegLog,
          null,
          null,
          { collectionName: 'app_participants', docId: String(personId), action: 'update', previousData: person },
          { isHidden: true }
        );
        logParticipantActivity(String(personId), 'fecha', _dtRegLog);
      } else if (superDateEditModal.mode === 'payment') {
        const idx = superDateEditModal.paymentIndex;
        const hist = [...(person.paymentHistory || [])];
        if (idx == null || idx < 0 || idx >= hist.length) {
          showToast('Movimiento no encontrado.');
          return;
        }
        const row = hist[idx];
        if (superDateEditModal.paymentId != null && String(row.id) !== String(superDateEditModal.paymentId)) {
          showToast('El historial cambió; vuelve a abrir el editor.');
          return;
        }
        if (row.kind === 'comment') {
          showToast('Este movimiento no admite cambio de fecha aquí.');
          return;
        }
        const d = new Date(iso);
        if (row.kind === REFUND_DISBURSEMENT_PAYMENT_KIND) {
          const atMs = d.getTime();
          const refundService = getAutoPaymentService(d, locLabel || undefined);
          hist[idx] = {
            ...row,
            recordedAt: iso,
            date: d.toLocaleString('es-MX'),
            service: refundService,
          };
          const payload = {
            paymentHistory: hist,
            refundDisbursedAt: atMs,
            ...participantConsentFirestoreRepairPatch(person, deleteField),
            ...debugExtras,
          };
          await updateDoc(getDocRef('app_participants', String(personId)), payload);
          refreshParticipantCache(person, 'Editar fecha de devolución', { personId, patch: payload });
          const _dtRefLog = `${dateEditActor} ajustó la fecha de la devolución en el historial de ${person.name || 'participante'} (sede ${locLabel}).`;
          addLog(
            'Corte de caja',
            _dtRefLog,
            null,
            null,
            { collectionName: 'app_participants', docId: String(personId), action: 'update', previousData: person }
          );
          logParticipantActivity(String(personId), 'finanzas', _dtRefLog);
          closeSuperDateEditModal();
          showToast('Fecha de devolución actualizada.');
          return;
        }
        const serviceForPayment = getAutoPaymentService(d, superDateEditModal.loc || person.location || undefined);
        hist[idx] = { ...row, recordedAt: iso, date: d.toLocaleString('es-MX'), service: serviceForPayment };

        // Si el pago editado estaba "anclado" al registro (o no existía registeredAt y es el primer pago),
        // entonces el costo final (precio dinámico) debe recalcularse usando esta nueva fecha.
        const firstPayIdx = hist.findIndex((r) => r && r.kind !== 'comment');
        const oldRegIso = person.registeredAt;
        const oldRegMs = parseFlexibleInstantMs(oldRegIso);
        const rowOldMs = parseFlexibleInstantMs(row.recordedAt) ?? (typeof row.id === 'number' && Number.isFinite(row.id) ? row.id : null);

        const isTiedToRegistration =
          (oldRegIso && row.recordedAt && String(row.recordedAt).trim() === String(oldRegIso).trim()) ||
          (oldRegMs != null && rowOldMs != null && Math.abs(oldRegMs - rowOldMs) <= 5000) ||
          (!oldRegIso && idx === firstPayIdx);

        let nextRegisteredCost = null;
        if (isTiedToRegistration && person.registeredCostManual !== true) {
          // Requerimiento: al editar manualmente la fecha del pago anclado al registro,
          // el costo a pagar debe reflejar la fecha nueva, incluyendo vigencia de campañas.
          const anchorNewMs = d.getTime();
          const isoDate = new Date(anchorNewMs).toISOString().split('T')[0];
          const pricingForNewDate = getPricingFromSnapshotForDate(currentEvent, anchorNewMs);
          const baseNew = getPersonCost(person, pricingForNewDate, currentEvent);

          const selectedCampaignId = String(person.discountCampaignId || '').trim();
          const selectedCampaignConcept = String(person.discountCampaignConcept || '').trim();
          const campaignById = selectedCampaignId ? findDiscountCampaignById(currentEvent, selectedCampaignId) : null;
          const campaignByConcept = !campaignById && selectedCampaignConcept && Array.isArray(currentEvent?.discountCampaigns)
            ? currentEvent.discountCampaigns.find(c =>
              String(c?.concept || '').trim() === selectedCampaignConcept &&
              campaignMatchesPersonProfile(c, person)
            ) || null
            : null;
          const selectedCampaign = campaignById || campaignByConcept;

          const hasDiscountSelection = selectedCampaignId !== '' || selectedCampaignConcept !== '';
          const campaignAppliesOnNewDate =
            selectedCampaign &&
            campaignMatchesPersonProfile(selectedCampaign, person) &&
            (!discountCampaignHasDateRange(selectedCampaign) || isDiscountCampaignVigenteOnDate(selectedCampaign, isoDate));

          nextRegisteredCost = baseNew;
          if (hasDiscountSelection) {
            nextRegisteredCost = campaignAppliesOnNewDate
              ? Math.max(0, Number(selectedCampaign?.finalAmount) || 0)
              : baseNew;
          }
        }

        const payload = {
          paymentHistory: hist,
          ...(isTiedToRegistration ? { registeredAt: iso } : {}),
          ...(nextRegisteredCost != null ? { registeredCost: nextRegisteredCost } : {}),
          ...participantConsentFirestoreRepairPatch(person, deleteField),
          ...debugExtras,
        };
        await updateDoc(getDocRef('app_participants', String(personId)), payload);
        refreshParticipantCache(person, 'Editar fecha de abono', { personId, patch: payload });
        const _dtPayLog = `${dateEditActor} ajustó la fecha de un movimiento en el historial de pagos de ${person.name || 'participante'} (sede ${locLabel}).`;
        addLog(
          'Sistema',
          _dtPayLog,
          null,
          null,
          { collectionName: 'app_participants', docId: String(personId), action: 'update', previousData: person },
          { isHidden: true }
        );
        logParticipantActivity(String(personId), 'fecha', _dtPayLog);
      } else {
        return;
      }
      closeSuperDateEditModal();
      showToast('Fecha actualizada.');
    } catch (err) {
      const code = String(err?.code || '');
      console.error(err);
      showToast(
        code === 'permission-denied'
          ? 'Firestore rechazó guardar la fecha (permisos o reglas). Recarga la app; si persiste, publica firestore.rules en la BD registros-vnpm.'
          : err?.message || 'No se pudo guardar la fecha.'
      );
    }
  };

  const openUserEditorFromListUser = (u) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
    const { anchor, anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, att, b, backfillActiveRosterBusy, base, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, cancelled, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, code, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, d, darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, deleted, docId, donations, downloadExcelBytes, draft, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, et, evType, event, eventDateDraft } = getScope();
    const { eventId, eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, fn, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, functions, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostId, hostSourceKey, id, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, info, inputClasses, inventory, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, key, kind, labelClasses, legacy, limit, linkWithCredential, liq, listPrice, live, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, loc, locRaw, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logList, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, loginTime, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsToRevert, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, m, mapStaffLoginFirebaseError, max, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, merged, mergedPrivacyNotice, message, method, montoBecado, ms } = getScope();
    const { msg, n, na, nav, needsFirestoreResyncAfterBulk, net, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, o, others, out, p, paid, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, patch, pathname, payload, pending, performAppFullBackup, person, phone } = getScope();
    const { plan, prevSnap, previousData, privacyNoticePublicUrl, pruneEventScopedAccessMap, q, query, r, raw, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, res, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, row, rows, s, sa, scoped, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, snap, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView, t } = getScope();
    const { tabSessionId, target, toLocalISODate, toast, today, toggleDarkMode, toggleDebugMode, total, uiModal, uid, updateDoc, updatePassword, url, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, v, val, vis, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    setEditingUser({
      isOpen: true,
      id: u.id,
      username: u.username,
      authEmail: u.authEmail || usernameToAuthEmail(u.username),
      role: u.role,
      currentPasswordInput: '',
      newPassword: '',
      confirmPassword: '',
      adminNewPassword: '',
      adminConfirmPassword: '',
      adminTargetCurrentPassword: '',
      canViewFinances: u.canViewFinances || false,
      restrictedEventId: u.restrictedEventId || '',
      restrictedLocation: u.restrictedLocation || '',
      allowedEventIds: getUserAllowedEventIds(u),
      allowedLocations: getUserAllowedLocations(u),
      allowedLocationsByEvent: u.allowedLocationsByEvent && typeof u.allowedLocationsByEvent === 'object' ? u.allowedLocationsByEvent : {},
      allowedPanelSections: { ...DEFAULT_PANEL_NAV, ...(u.allowedPanelSections || {}) },
      allowedPanelSectionsByEvent: u.allowedPanelSectionsByEvent && typeof u.allowedPanelSectionsByEvent === 'object' ? u.allowedPanelSectionsByEvent : {},
      preferredLandingTab: u.preferredLandingTab || 'Summary',
      hideMyExpenseConcepts: u.hideMyExpenseConcepts !== false,
      canViewHiddenDonations: u.canViewHiddenDonations || false,
      canViewExpenses: u.canViewExpenses || false,
      canEditRegistryDates: u.role === 'SuperUsuario' ? true : !!u.canEditRegistryDates,
      canMarkPersonsOfInterest: u.role === 'Administrador' ? !!u.canMarkPersonsOfInterest : false,
      maxConcurrentSessions: String(clampAdminMaxConcurrentSessions(u.maxConcurrentSessions ?? 1)),
      canSendWhatsAppQuickAction: u.canSendWhatsAppQuickAction !== false,
      canMarkResponsivaLocalQuickAction: u.canMarkResponsivaLocalQuickAction !== false,
      canSendResponsivaDigitalQuickAction: u.canSendResponsivaDigitalQuickAction !== false,
      canCancelRegistrations: u.role === 'Editor' ? !!u.canCancelRegistrations : false,
    });
  };

  const editorRegFieldsModalEl = currentUser && hasAdminRights && editorRegFieldsModalOpen && (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={() => setEditorRegFieldsModalOpen(false)}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto border border-slate-100" onClick={(e) => e.stopPropagation()}>
        <form
          onSubmit={(e) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
    const { anchor, anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, att, b, backfillActiveRosterBusy, base, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, cancelled, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, code, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, d, darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, deleted, docId, donations, downloadExcelBytes, draft, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, et, evType, event, eventDateDraft } = getScope();
    const { eventId, eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, fn, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, functions, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostId, hostSourceKey, id, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, info, inputClasses, inventory, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, key, kind, labelClasses, legacy, limit, linkWithCredential, liq, listPrice, live, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, loc, locRaw, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logList, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, loginTime, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsToRevert, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, m, mapStaffLoginFirebaseError, max, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, merged, mergedPrivacyNotice, message, method, montoBecado, ms } = getScope();
    const { msg, n, na, nav, needsFirestoreResyncAfterBulk, net, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, o, others, out, p, paid, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, patch, pathname, payload, pending, performAppFullBackup, person, phone } = getScope();
    const { plan, prevSnap, previousData, privacyNoticePublicUrl, pruneEventScopedAccessMap, q, query, r, raw, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, res, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, row, rows, s, sa, scoped, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, snap, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView, t } = getScope();
    const { tabSessionId, target, toLocalISODate, toast, today, toggleDarkMode, toggleDebugMode, total, uiModal, uid, updateDoc, updatePassword, url, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, v, val, vis, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
            e.preventDefault();
            handleSaveEditorRegFieldsConfig();
          }}
        >
          <div className="p-6 border-b border-slate-100 flex justify-between items-start gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <ClipboardList className="text-teal-600 shrink-0" size={22} /> Formulario «Nuevo registro» (Editor)
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Desmarca un campo para <span className="font-bold text-slate-700">ocultarlo</span> a usuarios con rol <span className="font-bold text-slate-700">Editor</span>.
                Los <span className="font-bold text-slate-700">Administradores</span> sí lo ven, pero el campo queda bloqueado (solo lectura) cuando está desactivado para Editor.
              </p>
            </div>
            <button type="button" onClick={() => setEditorRegFieldsModalOpen(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full shrink-0"><XCircle size={20} /></button>
          </div>
          <div className="px-6 pt-4">
            <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  setEditorRegFieldsScope('event');
                  setEditorRegFieldsForm(mergeEditorRegistrationFieldVisibility(editorRegistrationFieldVis));
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black ${editorRegFieldsScope === 'event' ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-500'}`}
              >
                Este evento
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditorRegFieldsScope('type');
                  setEditorRegFieldsForm(mergeEditorRegistrationFieldVisibility(editorTypeFieldVis));
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black ${editorRegFieldsScope === 'type' ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-500'}`}
              >
                Tipo: {currentEvent?.eventType || 'Evento'}
              </button>
            </div>
          </div>
          <div className={`${uiShell.pagePad} space-y-5`}>
            {getEditorRegistrationFieldGroupOrderForEventType(currentEvent?.eventType).map((group) => (
              <div key={group}>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  {EDITOR_REGISTRATION_FIELD_GROUP_LABELS[group] || group}
                </p>
                <div className="space-y-2">
                  {getEditorRegistrationFieldMetaForEventType(currentEvent?.eventType)
                    .filter((m) => m.group === group)
                    .map((item) => (
                    <label key={item.key} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50/80 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 accent-teal-600 rounded shrink-0"
                        checked={editorRegFieldsForm[item.key] !== false}
                        onChange={(e) => setEditorRegFieldsForm((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                      />
                      <span className="text-sm font-bold text-slate-800">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="p-6 border-t border-slate-100 flex gap-3">
            <button type="button" onClick={() => setEditorRegFieldsModalOpen(false)} className={`${btnSecondary} flex-1`}>Cancelar</button>
            <button type="submit" className={`${btnPrimary} flex-1`}>Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );

  const excelExportModalEl = excelExportModal?.isOpen && (
    <Suspense fallback={null}>
    <ExcelExportScopeModalLazy
      isOpen
      eventName={currentEvent?.name || ''}
      eventType={currentEvent?.eventType || ''}
      allLocations={excelExportAccessibleLocations}
      selectedLocations={excelExportModal.locations}
      onSelectedLocationsChange={(locations) => setExcelExportModal((prev) => ({ ...prev, locations }))}
      sectionAvailability={buildExcelExportSectionAvailability()}
      selectedSections={excelExportModal.sections}
      onSelectedSectionsChange={(sections) => setExcelExportModal((prev) => ({ ...prev, sections }))}
      isExporting={isExporting}
      onCancel={() => {
        if (isExporting) return;
        setExcelExportModal({ isOpen: false, locations: [], sections: {} });
      }}
      onConfirm={(scope) => {
        setExcelExportModal((prev) => ({ ...prev, isOpen: false }));
        void getScope().handleExportExcel(scope);
      }}
      onValidationError={(msg) => showToast(msg)}
      btnPrimary={btnPrimary}
      btnSecondary={btnSecondary}
    />
    </Suspense>
  );

  const panelNavModalEl = currentUser && isSuperUser && panelNavModalOpen && (
    <div className={uiModal.overlay} role="dialog" aria-modal="true">
      <button type="button" className={uiModal.backdrop} onClick={() => setPanelNavModalOpen(false)} aria-label="Cerrar menú lateral" />
      <div className={`${uiModal.panelSm} animate-in zoom-in-95 duration-200`} onClick={(e) => e.stopPropagation()}>
        <form
          onSubmit={(e) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
    const { anchor, anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, att, b, backfillActiveRosterBusy, base, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, cancelled, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, code, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, d, darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, deleted, docId, donations, downloadExcelBytes, draft, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, et, evType, event, eventDateDraft } = getScope();
    const { eventId, eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, fn, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, functions, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostId, hostSourceKey, id, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, info, inputClasses, inventory, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, key, kind, labelClasses, legacy, limit, linkWithCredential, liq, listPrice, live, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, loc, locRaw, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logList, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, loginTime, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsToRevert, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, m, mapStaffLoginFirebaseError, max, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, merged, mergedPrivacyNotice, message, method, montoBecado, ms } = getScope();
    const { msg, n, na, nav, needsFirestoreResyncAfterBulk, net, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, o, others, out, p, paid, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, patch, pathname, payload, pending, performAppFullBackup, person, phone } = getScope();
    const { plan, prevSnap, previousData, privacyNoticePublicUrl, pruneEventScopedAccessMap, q, query, r, raw, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, res, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, row, rows, s, sa, scoped, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, snap, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView, t } = getScope();
    const { tabSessionId, target, toLocalISODate, toast, today, toggleDarkMode, toggleDebugMode, total, uiModal, uid, updateDoc, updatePassword, url, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, v, val, vis, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
            e.preventDefault();
            handleSavePanelNavConfig();
          }}
          className="flex flex-col max-h-[inherit] min-h-0"
        >
          <div className={uiModal.header}>
            <div className="min-w-0">
              <h3 className={`${uiModal.title} flex items-center gap-2 normal-case`}>
                <PanelLeft className="text-violet-600 shrink-0" size={18} /> Menú lateral del evento
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                Activa o desactiva entradas del panel para usuarios con rol <span className="font-bold text-slate-700 dark:text-slate-300">Editor</span> o <span className="font-bold text-slate-700 dark:text-slate-300">Lector</span>.
                Los <span className="font-bold text-slate-700 dark:text-slate-300">Administradores</span> y el <span className="font-bold text-slate-700 dark:text-slate-300">SuperUsuario</span> siempre ven el menú completo (incluido el dashboard).
              </p>
            </div>
            <button type="button" onClick={() => setPanelNavModalOpen(false)} className={`${uiButtons.closeIcon} shrink-0`} aria-label="Cerrar"><XCircle size={18} /></button>
          </div>
          <div className={`${uiModal.body} max-md:px-3 space-y-3`}>
            {(() => {
              const items = PANEL_NAV_CONFIG_ITEMS.filter((item) =>
                panelNavSidebarItemAppliesToEvent(item.key, currentEvent?.eventType)
              );
              const groups = [];
              for (const item of items) {
                const g = item.group || 'Otros';
                let bucket = groups.find((x) => x.title === g);
                if (!bucket) {
                  bucket = { title: g, items: [] };
                  groups.push(bucket);
                }
                bucket.items.push(item);
              }
              return groups.map((group) => (
                <div key={group.title} className="space-y-1.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-0.5">
                    {group.title}
                  </p>
                  {group.items.map((item) => {
                    const { label, hint } = resolvePanelNavConfigItemCopy(item, currentEvent?.eventType);
                    return (
                      <label
                        key={item.key}
                        className="flex items-start gap-2.5 px-2.5 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 w-3.5 h-3.5 accent-violet-600 rounded shrink-0"
                          checked={panelNavForm[item.key] !== false}
                          onChange={(e) =>
                            setPanelNavForm((prev) => ({ ...prev, [item.key]: e.target.checked }))
                          }
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{label}</span>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{hint}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              ));
            })()}
          </div>
          <div className={`${uiModal.footer} pt-3`}>
            <button type="button" onClick={() => setPanelNavModalOpen(false)} className={`${btnSecondary} flex-1 py-2 rounded-lg text-xs`}>Cancelar</button>
            <button type="submit" className={`${btnPrimary} flex-1 py-2 rounded-lg text-xs`}>Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );


  const privacyNoticeModalEl = currentUser && isSuperUser && privacyNoticeModalOpen && (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={() => !privacyNoticeSaving && setPrivacyNoticeModalOpen(false)}>
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto border border-slate-100 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
        <form
          onSubmit={(e) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, adminDefaultPref, ageNum, all, allKnownLocationNames, allParticipants, amt } = getScope();
    const { anchor, anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, att, b, backfillActiveRosterBusy, base, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, cancelled, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, code, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, d, darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, deleted, docId, donations, downloadExcelBytes, draft, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, et, evType, event, eventDateDraft } = getScope();
    const { eventId, eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, fn, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, functions, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostId, hostSourceKey, id, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, info, inputClasses, inventory, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, key, kind, labelClasses, legacy, limit, linkWithCredential, liq, listPrice, live, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, loc, locRaw, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logList, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, loginTime, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsToRevert, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, m, mapStaffLoginFirebaseError, max, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, merged, mergedPrivacyNotice, message, method, montoBecado, ms } = getScope();
    const { msg, n, na, nav, needsFirestoreResyncAfterBulk, net, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, o, others, out, p, paid, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, patch, pathname, payload, pending, performAppFullBackup, person, phone } = getScope();
    const { plan, prevSnap, previousData, privacyNoticePublicUrl, pruneEventScopedAccessMap, q, query, r, raw, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, res, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, row, rows, s, sa, scoped, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, snap, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView, t } = getScope();
    const { tabSessionId, target, toLocalISODate, toast, today, toggleDarkMode, toggleDebugMode, total, uiModal, uid, updateDoc, updatePassword, url, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, v, val, vis, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
            e.preventDefault();
            void handleSavePrivacyNoticeConfig();
          }}
        >
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Shield className="text-indigo-600 shrink-0" size={22} /> Aviso de privacidad (LFPDPPP)
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Edite el texto legal y publique en la página pública <span className="font-mono">/aviso-privacidad</span>.
              </p>
            </div>
            <button type="button" onClick={() => setPrivacyNoticeModalOpen(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full shrink-0"><XCircle size={20} /></button>
          </div>
          <div className="p-6 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-xs font-bold text-slate-600">
                Versión
                <input className={`${inputClasses} mt-1`} value={privacyNoticeForm.version || ''} onChange={(e) => setPrivacyNoticeForm((p) => ({ ...p, version: e.target.value }))} />
              </label>
              <label className="text-xs font-bold text-slate-600">
                Retención sensibles (días)
                <input type="number" min={1} className={`${inputClasses} mt-1`} value={privacyNoticeForm.sensitiveRetentionDays ?? 90} onChange={(e) => setPrivacyNoticeForm((p) => ({ ...p, sensitiveRetentionDays: parseInt(e.target.value, 10) || 90 }))} />
              </label>
            </div>
            <label className="text-xs font-bold text-slate-600 block">
              Responsable
              <input className={`${inputClasses} mt-1`} value={privacyNoticeForm.responsibleName || ''} onChange={(e) => setPrivacyNoticeForm((p) => ({ ...p, responsibleName: e.target.value }))} />
            </label>
            <label className="text-xs font-bold text-slate-600 block">
              Domicilio
              <input className={`${inputClasses} mt-1`} value={privacyNoticeForm.responsibleAddress || ''} onChange={(e) => setPrivacyNoticeForm((p) => ({ ...p, responsibleAddress: e.target.value }))} />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-xs font-bold text-slate-600">
                Correo ARCO
                <input type="email" className={`${inputClasses} mt-1`} value={privacyNoticeForm.arcoEmail || ''} onChange={(e) => setPrivacyNoticeForm((p) => ({ ...p, arcoEmail: e.target.value }))} />
              </label>
              <label className="text-xs font-bold text-slate-600">
                Teléfono ARCO
                <input className={`${inputClasses} mt-1`} value={privacyNoticeForm.arcoPhone || ''} onChange={(e) => setPrivacyNoticeForm((p) => ({ ...p, arcoPhone: e.target.value }))} />
              </label>
            </div>
            <label className="text-xs font-bold text-slate-600 block">
              Cuerpo (Markdown)
              <textarea className={`${inputClasses} mt-1 min-h-[220px] font-mono text-xs`} value={privacyNoticeForm.bodyMarkdown || ''} onChange={(e) => setPrivacyNoticeForm((p) => ({ ...p, bodyMarkdown: e.target.value }))} />
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
              <input type="checkbox" checked={!!privacyNoticeForm.retentionDryRun} onChange={(e) => setPrivacyNoticeForm((p) => ({ ...p, retentionDryRun: e.target.checked }))} />
              Modo dry-run (purga programada no escribe; solo registra en logs)
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" className={`${btnSecondary} text-xs`} onClick={() => setPrivacyNoticeForm(defaultPrivacyNoticeConfig())}>
                Restaurar plantilla LFPDPPP
              </button>
              <a href={privacyNoticePublicUrl} target="_blank" rel="noopener noreferrer" className={`${btnSecondary} text-xs no-underline inline-flex items-center`}>
                Vista previa pública
              </a>
              <button type="button" disabled={privacyBackfillBusy} className={`${btnSecondary} text-xs`} onClick={() => void handlePrivacyConsentBackfill()}>
                {privacyBackfillBusy ? 'Backfill…' : 'Backfill consentimiento (migración)'}
              </button>
            </div>
          </div>
          <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3">
            <button type="button" disabled={privacyNoticeSaving} onClick={() => setPrivacyNoticeModalOpen(false)} className={`${btnSecondary} flex-1`}>Cancelar</button>
            <button type="submit" disabled={privacyNoticeSaving} className={`${btnPrimary} flex-1`}>{privacyNoticeSaving ? 'Guardando…' : 'Guardar y publicar'}</button>
          </div>
        </form>
      </div>
    </div>
  );

  modalEscapeCloseRef.current = () => {
    if (editorRegFieldsModalOpen && currentUser && hasAdminRights) {
      setEditorRegFieldsModalOpen(false);
      return true;
    }
    if (excelExportModal?.isOpen) {
      if (!isExporting) setExcelExportModal({ isOpen: false, locations: [], sections: {} });
      return true;
    }
    if (panelNavModalOpen && currentUser && isSuperUser) {
      setPanelNavModalOpen(false);
      return true;
    }
    if (privacyNoticeModalOpen && currentUser && isSuperUser) {
      if (!privacyNoticeSaving) setPrivacyNoticeModalOpen(false);
      return true;
    }
    if (isAddLocModalOpen) {
      setIsAddLocModalOpen(false);
      setNewLocationName('');
      return true;
    }
    if (expensePartialModal?.isOpen) {
      setExpensePartialModal({ isOpen: false, expenseId: null, amount: '' });
      return true;
    }
    if (expenseEditModal?.isOpen) {
      setExpenseEditModal({ isOpen: false, id: null, name: '', quantity: 1, unitPrice: '' });
      return true;
    }
    if (superDateEditModal?.isOpen) {
      closeSuperDateEditModal();
      return true;
    }
    if (donationsListOpen) {
      setDonationsListOpen(false);
      return true;
    }
    if (publicQrModalOpen) {
      setPublicQrModalOpen(false);
      return true;
    }
    if (responsivaDigitalTextModalOpen) {
      setResponsivaDigitalTextModalOpen(false);
      return true;
    }
    if (newRegModalOpen) {
      flushNewRegDraftToParent(
        newRegModalDraftLiveRef.current || newEntry,
        newRegModalProfileSearchLiveRef.current ?? ''
      );
      setNewRegModalOpen(false);
      return true;
    }
    if (donationModal?.isOpen) {
      setDonationModal({ isOpen: false, amount: '', donorName: '', location: '' });
      return true;
    }
    if (customFieldsModal?.isOpen) {
      setCustomFieldsModal({ isOpen: false });
      return true;
    }
    if (whatsAppModal?.isOpen) {
      setWhatsAppModal({
        isOpen: false,
        personId: null,
        personName: '',
        eventName: '',
        loc: '',
        phone: '',
        message: '',
        error: '',
        pendingMergeMarkKeys: null,
        whatsAppQueuedMessageSnapshot: null,
      });
      return true;
    }
    if (paymentMethodEditModal?.isOpen) {
      closePaymentMethodEditModal();
      return true;
    }
    if (abonoNoteEditModal?.isOpen) {
      setAbonoNoteEditModal({ isOpen: false, personId: null, loc: '', paymentIndex: null, draft: '' });
      return true;
    }
    if (registrationCommentModal?.isOpen) {
      setRegistrationCommentModal({ isOpen: false, personId: null, personName: '', loc: '', draft: '' });
      return true;
    }
    if (paymentModal?.isOpen) {
      setPaymentModal({
        isOpen: false,
        loc: '',
        id: null,
        personName: '',
        amount: '',
        currentPaid: 0,
        error: '',
        isScholarship: 'No',
        baseCost: 0,
        paymentMethod: 'Efectivo',
        paymentService: getAutoPaymentService(new Date()),
        cardReference: '',
        abonoNote: '',
      });
      return true;
    }
    if (registryConfirmModal?.isOpen && registryConfirmModal.type && !registryConfirmBusy) {
      closeRegistryConfirmModal();
      return true;
    }
    if (allergyOptionsModal?.isOpen) {
      setAllergyOptionsModal({ isOpen: false });
      return true;
    }
    if (serveAreaOptionsModal?.isOpen) {
      setServeAreaOptionsModal({ isOpen: false });
      return true;
    }
    if (cashCutScheduleModal?.isOpen) {
      setCashCutScheduleModal({ isOpen: false });
      return true;
    }
    if (cashCutServiceDetailModal) {
      setCashCutServiceDetailModal(null);
      return true;
    }
    if (pricingModal?.isOpen) {
      setPricingModal({ isOpen: false });
      return true;
    }
    if (editRegistryModal?.isOpen) {
      if (editRegistryModal.variant === 'inline' && editRegistryModal.data?.id != null) {
        const pid = editRegistryModal.data.id;
        const inlineLoc = editRegistryModal.loc;
        resetEditRegistryModal();
        setExpandedRows((prev) => {
          const next = new Set(prev);
          next.delete(pid);
          return next;
        });
        scrollRosterRowIntoView(inlineLoc, pid);
      } else {
        resetEditRegistryModal();
      }
      return true;
    }
    if (summaryRosterModal?.isOpen) {
      setSummaryRosterModal({ isOpen: false, type: summaryRosterModal.type });
      return true;
    }
    if (summaryCellDetailModal?.isOpen) {
      setSummaryCellDetailModal((prev) => ({ ...prev, isOpen: false }));
      return true;
    }
    if (restoreModal?.isOpen) {
      setRestoreModal({ isOpen: false, log: null, type: 'single' });
      return true;
    }
    if (renameModal?.isOpen) {
      setRenameModal({ isOpen: false, id: null, name: '' });
      return true;
    }
    if (deleteUserConfirmModal?.isOpen) {
      setDeleteUserConfirmModal({ isOpen: false, id: null, username: '' });
      return true;
    }
    if (revokeSessionsConfirmModal?.isOpen) {
      setRevokeSessionsConfirmModal({ isOpen: false, id: null, username: '' });
      return true;
    }
    if (editingUser?.isOpen) {
      setEditingUser({
        isOpen: false,
        id: null,
        username: '',
        authEmail: '',
        currentPasswordInput: '',
        newPassword: '',
        confirmPassword: '',
        adminNewPassword: '',
        adminConfirmPassword: '',
        adminTargetCurrentPassword: '',
        role: 'Editor',
        canViewFinances: false,
        canViewHiddenDonations: false,
        canViewExpenses: false,
        restrictedEventId: '',
        restrictedLocation: '',
        allowedEventIds: [],
        allowedLocations: [],
        allowedLocationsByEvent: {},
        allowedPanelSections: { ...DEFAULT_PANEL_NAV },
        allowedPanelSectionsByEvent: {},
        preferredLandingTab: 'Summary',
        hideMyExpenseConcepts: true,
        canEditRegistryDates: false,
        maxConcurrentSessions: '1',
        canSendWhatsAppQuickAction: false,
        canMarkResponsivaLocalQuickAction: true,
        canSendResponsivaDigitalQuickAction: false,
      });
      return true;
    }
    if (isAddEventModalOpen) {
      setIsAddEventModalOpen(false);
      setNewEventData({ name: '', type: 'Campa', date: '', baseCost: '' });
      return true;
    }
    if (deleteEventModal?.isOpen) {
      setDeleteEventModal({ isOpen: false, id: null, name: '' });
      return true;
    }
    return false;
  };

  /** Modal de confirmación (archivar, baja, eliminar del archivo, etc.). Debe renderizarse también en la vista sin evento seleccionado (`!selectedEventId`). */
  const registryConfirmModalEl = (
    <RegistryConfirmModal
      registryConfirmModal={registryConfirmModal}
      registryConfirmBusy={registryConfirmBusy}
      allParticipants={allParticipants}
      currentEvent={currentEvent}
      onClose={closeRegistryConfirmModal}
      onSubmit={handleRegistryConfirmSubmit}
      onUpdateModal={setRegistryConfirmModal}
    />
  );

  const capFullWaitlistConfirmModalEl = (
    <CapFullWaitlistConfirmModal modal={capWaitlistConfirmModal} onClose={closeCapFullWaitlistConfirm} />
  );

  const promoteOverCapConfirmModalEl = (
    <PromoteOverCapConfirmModal modal={promoteOverCapConfirmModal} onClose={closePromoteOverCapConfirm} />
  );

  const {
    DEFAULT_PANEL_NAV,
    EDITOR_LECTOR_PANEL_DEFAULT,
    LOGS_SERVER_CHUNK,
    LOGS_STORAGE_MAX_DEFAULT,
    LOGS_STORAGE_MAX_HARD_MAX,
    LOGS_STORAGE_MAX_MIN,
    PANEL_NAV_CONFIG_ITEMS,
    PANEL_NAV_SIDEBAR_ITEMS,
    activeRosterUnitsByEventId,
    activityLogPassesListFilters,
    allKnownLocationNames,
    anonymousAuthPanel,
    appendOlderLogPage,
    applyLandingSedeToNewUserState,
    archiveViewSearch,
    archiveViewSort,
    archivedParticipantsArchiveViewList,
    archivedParticipantsForView,
    backfillActiveRosterBusy,
    buildLogDateRangeForThisMonth,
    buildLogDateRangeForThisWeek,
    buildLogDateRangeForToday,
    bulkResyncBusy,
    clampLogsStorageLimit,
    confirmDeleteEvent,
    confirmRestore,
    darkMode,
    debugToast,
    deleteEventModal,
    deleteOneAnonymousAuthUser,
    deleteUserConfirmModal,
    draggedEventId,
    editingUser,
    editingUserPlainPwdVisible,
    events,
    exitLogsRangeMode,
    expandedLogId,
    extractLogMillis,
    fbUser,
    fieldStack,
    formatAnonymousAuthAgeMinutes,
    formatDisplayDate,
    forwardNavStack,
    getEditableScopedEvents,
    getLogDateISO,
    getPricingFromSnapshot,
    getWeekKeyFromDate,
    goBack,
    goForward,
    goTo,
    googleLoginBusy,
    handleAddUser,
    handleBackfillEventActiveRosterTotals,
    handleCreateEvent,
    handleDeleteUser,
    handleDragOver,
    handleDrop,
    handleGoogleLogin,
    handleLogin,
    handleLogout,
    handleLogsTotalCountReconcile,
    handleLogsVisibleInPanelBackfill,
    handleReloadAfterBulkRestore,
    handleRenameEvent,
    openEditEventModal,
    handleSaveLogStorageMaxEntries,
    handleUpdateUser,
    inputClasses,
    isAddEventModalOpen,
    isEditorOrLector,
    labelClasses,
    loadLogsInDateRange,
    location,
    logBulkDeleteBusy,
    logBulkDeleteInFlightRef,
    logDateFrom,
    logDateMode,
    logDateTo,
    logFilterAction,
    logFilterContext,
    logFilterUsername,
    logOldestBulkDeleteCountInput,
    logRecentBaseLimit,
    logSearchTerm,
    logSpecificDay,
    logSpecificMonth,
    logSpecificWeek,
    logStorageMaxEntries,
    logStorageMaxSaving,
    loginBusy,
    loginError,
    loginForm,
    logoutBusy,
    logs,
    logsCountReconcileBusy,
    logsFullSearchMode,
    logsGlobalSearchConfirmed,
    logsHasMoreOlder,
    logsLoading,
    logsLoadingMore,
    logsMobileMenuOpen,
    logsMonthConfirmOpen,
    logsRangeActive,
    logsRangeLoading,
    logsSearchScanning,
    logsTotalCount,
    logsTotalCountLoading,
    logsVisibleBackfillBusy,
    mergedPrivacyNotice,
    navHistory,
    needsFirestoreResyncAfterBulk,
    newEventData,
    newUser,
    newUserModalOpen,
    panelNavMerged,
    privacyNoticePublicUrl,
    pruneEventScopedAccessMap,
    purgeAllAnonymousAuthUsers,
    refreshActivityLogsFromServer,
    refreshAnonymousAuthUsers,
    refreshLogsTotalCount,
    renameModal,
    resolvePreferredLandingTab,
    restoreModal,
    revokeAllSessionsForOtherUser,
    revokeSessionsConfirmModal,
    selectedLogs,
    setArchiveViewSearch,
    setArchiveViewSort,
    setDraggedEventId,
    setEditingUserPlainPwdVisible,
    setExpandedLogId,
    setIsAddEventModalOpen,
    setLogDateFrom,
    setLogDateMode,
    setLogDateTo,
    setLogFilterAction,
    setLogFilterContext,
    setLogFilterUsername,
    setLogOldestBulkDeleteCountInput,
    setLogRecentBaseLimit,
    setLogSearchTerm,
    setLogSpecificDay,
    setLogSpecificMonth,
    setLogSpecificWeek,
    setLogStorageMaxEntries,
    setLoginForm,
    setLogsFullSearchMode,
    setLogsGlobalSearchConfirmed,
    setLogsMobileMenuOpen,
    setLogsMonthConfirmOpen,
    setNewEventData,
    setNewUser,
    setNewUserModalOpen,
    setPanelNavForm,
    setPrivacyNoticeForm,
    setSelectedLogs,
    setShowDebugLogs,
    setShowLoginPassword,
    setUserAccessScopeOpenId,
    setUsersMobileMenuOpen,
    setUsersPanelSearch,
    showDebugLogs,
    showLoginPassword,
    sortedEvents,
    superSessionCount,
    toLocalISODate,
    toast,
    toggleDarkMode,
    toggleDebugMode,
    updateDoc,
    userAccessScopeOpenId,
    users,
    usersAuthReady,
    usersFilteredInPanel,
    usersMobileMenuOpen,
    usersPanelSearch,
    usersVisibleInPanel,
    visibleEvents,
  } = getScope();

  let gateScreenEl = null;

  // --- SCREEN 1: LOGIN ---
  if (!currentUser) {
    if (location.pathname !== '/login') {
      gateScreenEl = <Navigate to="/login" replace />;
    } else if (fbUser && !usersAuthReady) {
      gateScreenEl = (
        <div className="min-h-screen bg-blue-950 flex items-center justify-center p-4 relative">
          <p className="text-white font-semibold">Cargando...</p>
          <AppVersionBadge variant="login" />
        </div>
      );
    } else {
      gateScreenEl = (
        <Suspense fallback={<ScreenLoadingFallback title="Cargando inicio de sesión…" />}>
          <LoginScreenLazy
            debugToast={debugToast}
            loginForm={loginForm}
            setLoginForm={setLoginForm}
            handleLogin={handleLogin}
            handleGoogleLogin={handleGoogleLogin}
            loginBusy={loginBusy}
            googleLoginBusy={googleLoginBusy}
            loginError={loginError}
            showLoginPassword={showLoginPassword}
            setShowLoginPassword={setShowLoginPassword}
          />
        </Suspense>
      );
    }
  } else if (!selectedEventId) {
    // --- SCREEN 2: EVENT SELECTOR ---

    const eventHubValue = {
      debugToast,
      navHistory,
      forwardNavStack,
      goBack,
      goForward,
      systemView,
      currentUser,
      fbUser,
      superSessionCount,
      isSuperUser,
      globalConfig,
      toggleDebugMode,
      goTo,
      hasAdminRights,
      handleLogout,
      logoutBusy,
      archivedParticipantsForView,
      archivedParticipantsArchiveViewList,
      archiveViewSearch,
      setArchiveViewSearch,
      archiveViewSort,
      setArchiveViewSort,
      events,
      openPermanentDeleteArchivedParticipantConfirm,
      visibleEvents,
      activeRosterUnitsByEventId,
      getPricingFromSnapshot,
      draggedEventId,
      setDraggedEventId,
      handleDragOver,
      handleDrop,
      resolvePreferredLandingTab,
      formatDisplayDate,
      addLog,
      updateDoc,
      getDocRef,
      setRenameModal,
      setDeleteEventModal,
      deleteEventModal,
      confirmDeleteEvent,
      renameModal,
      handleRenameEvent,
      openEditEventModal,
      newEventData,
      setNewEventData,
      isAddEventModalOpen,
      setIsAddEventModalOpen,
      handleCreateEvent,
      handleBackfillEventActiveRosterTotals,
      backfillActiveRosterBusy,
      btnPrimary,
      btnSecondary,
      inputClasses,
      labelClasses,
      restoreModal,
      setRestoreModal,
      confirmRestore,
      registryConfirmModalEl,
      promoteOverCapConfirmModalEl,
      editorRegFieldsModalEl,
      panelNavModalEl,
      privacyNoticeModalEl,
      editingUser,
      setEditingUser,
      handleUpdateUser,
      users,
      sortedEvents,
      allKnownLocationNames,
      PANEL_NAV_CONFIG_ITEMS,
      PANEL_NAV_SIDEBAR_ITEMS,
      DEFAULT_PANEL_NAV,
      EDITOR_LECTOR_PANEL_DEFAULT,
      editingUserPlainPwdVisible,
      setEditingUserPlainPwdVisible,
      showToast,
      toast,
      darkMode,
      toggleDarkMode,
      needsFirestoreResyncAfterBulk,
      bulkResyncBusy,
      LOGS_SERVER_CHUNK,
      LOGS_STORAGE_MAX_DEFAULT,
      LOGS_STORAGE_MAX_HARD_MAX,
      LOGS_STORAGE_MAX_MIN,
      activityLogPassesListFilters,
      anonymousAuthPanel,
      appendOlderLogPage,
      applyLandingSedeToNewUserState,
      buildLogDateRangeForThisMonth,
      buildLogDateRangeForThisWeek,
      buildLogDateRangeForToday,
      clampLogsStorageLimit,
      deleteOneAnonymousAuthUser,
      deleteUserConfirmModal,
      exitLogsRangeMode,
      expandedLogId,
      extractLogMillis,
      fieldStack,
      formatAnonymousAuthAgeMinutes,
      getEditableScopedEvents,
      getLogDateISO,
      getWeekKeyFromDate,
      handleAddUser,
      handleDeleteUser,
      handleLogsTotalCountReconcile,
      handleLogsVisibleInPanelBackfill,
      handleSaveLogStorageMaxEntries,
      isEditorOrLector,
      loadLogsInDateRange,
      logBulkDeleteBusy,
      logBulkDeleteInFlightRef,
      logDateFrom,
      logDateMode,
      logDateTo,
      logFilterAction,
      logFilterContext,
      logFilterUsername,
      logOldestBulkDeleteCountInput,
      logRecentBaseLimit,
      logSearchTerm,
      logSpecificDay,
      logSpecificMonth,
      logSpecificWeek,
      logStorageMaxEntries,
      logStorageMaxSaving,
      logs,
      logsCountReconcileBusy,
      logsFullSearchMode,
      logsGlobalSearchConfirmed,
      logsHasMoreOlder,
      logsLoading,
      logsLoadingMore,
      logsMobileMenuOpen,
      logsMonthConfirmOpen,
      logsRangeActive,
      logsRangeLoading,
      logsSearchScanning,
      logsTotalCount,
      logsTotalCountLoading,
      logsVisibleBackfillBusy,
      mergedPrivacyNotice,
      newUser,
      newUserModalOpen,
      openUserEditorFromListUser,
      panelNavMerged,
      pruneEventScopedAccessMap,
      purgeAllAnonymousAuthUsers,
      refreshActivityLogsFromServer,
      refreshAnonymousAuthUsers,
      refreshLogsTotalCount,
      revokeAllSessionsForOtherUser,
      revokeSessionsConfirmModal,
      selectedLogs,
      setDeleteUserConfirmModal,
      setExpandedLogId,
      setLogDateFrom,
      setLogDateMode,
      setLogDateTo,
      setLogFilterAction,
      setLogFilterContext,
      setLogFilterUsername,
      setLogOldestBulkDeleteCountInput,
      setLogRecentBaseLimit,
      setLogSearchTerm,
      setLogSpecificDay,
      setLogSpecificMonth,
      setLogSpecificWeek,
      setLogStorageMaxEntries,
      setLogsFullSearchMode,
      setLogsGlobalSearchConfirmed,
      setLogsMobileMenuOpen,
      setLogsMonthConfirmOpen,
      setNewUser,
      setNewUserModalOpen,
      setPanelNavForm,
      setPanelNavModalOpen,
      setPrivacyNoticeForm,
      setPrivacyNoticeModalOpen,
      setRevokeSessionsConfirmModal,
      setSelectedLogs,
      setShowDebugLogs,
      setUserAccessScopeOpenId,
      setUsersMobileMenuOpen,
      setUsersPanelSearch,
      showDebugLogs,
      toLocalISODate,
      userAccessScopeOpenId,
      usersFilteredInPanel,
      usersMobileMenuOpen,
      usersPanelSearch,
      usersVisibleInPanel,
      onReloadAfterBulkRestore: handleReloadAfterBulkRestore,
    };
    gateScreenEl = (
      <SystemViewGuard currentUser={currentUser} pathname={location.pathname}>
        <>
          <EventHubProvider value={eventHubValue}>
            <Suspense fallback={<ScreenLoadingFallback title="Cargando panel…" />}>
              <EventHubScreenLazy />
            </Suspense>
          </EventHubProvider>
          <AppVersionBadge showInternal={isSuperUser} currentUser={currentUser} />
          <p className="text-center text-[10px] text-slate-400 pb-2">
            <a href={privacyNoticePublicUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600 hover:underline">
              Aviso de privacidad integral
            </a>
          </p>
        </>
      </SystemViewGuard>
    );
  }

  // --- SCREEN 3: MAIN APP ---

  return {
    gateScreenEl,
    runBulkCarDataWhatsAppForRoster,
    openWhatsAppModal,
    sendWhatsAppMessage,
    sendResponsivaSignLinkWhatsAppForPerson,
    markResponsivaLocalDelivery,
    handleSaveEventResponsivaDigitalText,
    getProcessedParticipantsForLocation,
    handleAddLocation,
    handleDeleteLocation,
    handleAddCustomField,
    handleRemoveCustomField,
    handleAddEntry,
    handleAddToWaitlist,
    resetEditRegistryModal,
    navEditDismissAnchorRef,
    handleUpdateEntry,
    executeBautizosPartyCancelArchivePlan,
    performArchiveRosterEntry,
    performArchiveWaitlistEntry,
    performArchiveDuplicateHintEntry,
    performAcceptDuplicateCluster,
    openEditRegistryModalForPerson,
    performCancelEntry,
    handleDeleteResponsivaManually,
    performDeletePaymentHistoryRow,
    openDeletePaymentHistoryRowConfirm,
    closeRegistryConfirmModal,
    openPermanentDeleteArchivedParticipantConfirm,
    performPermanentDeleteArchivedParticipant,
    handleRegistryConfirmSubmit,
    removeEntry,
    cancelEntry,
    openDeleteDonationConfirm,
    reactivateEntry,
    markCancelledRefundAsDonation,
    performRefundDisbursement,
    updateRefundDisbursementDateTime,
    openRefundDisbursementConfirm,
    openRefundDateEditModal,
    closeRefundDateEditModal,
    submitRefundDateEditModal,
    removePendingRefundBySuperUser,
    openRemovePendingRefundConfirm,
    openMoveToWaitlistConfirm,
    performMoveActiveEntryToWaitlist,
    promoteWaitlistEntry,
    promoteCompanionWaitlistEntry,
    promoteFromWaitlistSection,
    openWaitlistRowEdit,
    toggleRegStatus,
    rosterRowAnchorId,
    rosterInlineEditPanelId,
    findWorkspaceScrollRoot,
    scrollRosterInlineEditPanelIntoView,
    scrollRosterRowIntoView,
    expandRosterRowEditOnly,
    toggleRosterRowExpand,
    openRosterInlineEditFromQuickActions,
    submitAbono,
    openRegistrationCommentModal,
    submitRegistrationCommentModal,
    openAbonoNoteEditModal,
    saveAbonoNoteFromModal,
    deleteRegistrationCommentItem,
    clearAbonoNoteForPaymentRow,
    closePaymentMethodEditModal,
    openPaymentMethodEditModal,
    handleSavePaymentMethodEdit,
    closeSuperDateEditModal,
    openSuperRegistrationDateEdit,
    openSuperPaymentDateEdit,
    ensureRefundDisbursementPaymentHistoryIndex,
    openPaymentHistoryEditForPay,
    handleSuperSaveDateEdit,
    openUserEditorFromListUser,
    editorRegFieldsModalEl,
    excelExportModalEl,
    panelNavModalEl,
    privacyNoticeModalEl,
    registryConfirmModalEl,
    capFullWaitlistConfirmModalEl,
    promoteOverCapConfirmModalEl,
  };
}
