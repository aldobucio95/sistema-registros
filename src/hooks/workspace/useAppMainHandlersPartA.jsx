import { useCallback, useMemo, useEffect, useLayoutEffect, useRef } from 'react';
import { onSnapshot, query, where, increment } from 'firebase/firestore';
import * as appMainModuleScope from '../../app/helpers/appMainModuleScope.jsx';
import { countUnsentWhatsAppNotificationsForQueue } from '../../carDataWhatsApp.js';
import { isDailyBackupDue, msUntilNextLocalMidnight } from '../../appBackupSchedule.js';
import { querySnapshotHasDocChanges } from '../../firestoreSnapshotMerge.js';
import { getColRef } from '../../firebaseRefs.js';
import {
  countActiveDropdownListFilters,
  listFiltersForEventApplication,
} from '../../userListFiltersPrefs.js';
import {
  panelMenuAccessEffectivelyChanged,
} from '../../rbac/permissions.js';
import { normalizeRole } from '../../rbac/roles.js';
import { parseStrictNonNegativeMoneyInput } from '../../strictMoneyInput.js';
import { isResponsivaEventSectionVisible } from '../../responsivaSignLogic.js';
import {
  applyEventScopedRosterFilters,
  participantMatchesPersonOfInterestFilter,
  participantMatchesRegistrationStatusFilter,
} from '../../rosterParticipantFilters.js';
import {
  getCancelledRefundPendingAmount,
  getParticipantOutstandingGross,
} from '../../cashCutRefunds.js';
import { getAmbosServeInSegmentOrEmpty } from '../../app/helpers/discountCampaignHelpers.js';
import { EVENT_TYPES } from '../../appConstants.js';
import { buildNewEventAttendanceFields } from '../../eventTypePresets.js';
import {
  CLOSED_EDIT_EVENT_MODAL,
  buildEditEventModalState,
  buildEditEventFirestorePayload,
} from '../../editEventModalState.js';
import { buildNewEventCostFields } from '../../eventCostModel.js';
import {
  getSessionLogClientSuffix,
  writeStaffSessionLogOnce,
} from '../../clientTelemetry.js';
import { buildClientVersionPatch } from '../../appVersion.js';
import { buildUserOfflineSessionPatch } from '../../userSessionFirestorePatch.js';
import {
  buildFirestoreDocId,
  eventFirestoreDocIdFromHumanName,
} from '../../firestoreDocId.js';
import { omitUndefinedDeep } from '../../firestorePayloadSanitize.js';
import { getFunctions, httpsCallable } from 'firebase/functions';

/** v2: Bautizos no soportado; identidad para no romper filtros residuales. */
const applyTitularOnlyBautizosRosterFilters = (rows) => rows;
const prepareBautizosRowsForRosterFilter = (rows) => rows;

/** Helpers de módulo (estables; no dependen del ref de getScope del primer render). */
const {
  ARCHIVE_PROFILES_COLLECTION,
  buildArchiveIndexIncomingPayload,
  buildArchivedProfileSnapshot,
  buildSpouseIncomingIdSetForEvent,
  campaAttendanceScopeMatches,
  clearNewEventFormDraft,
  compactWhatsAppNotificationToken,
  compareParticipantsByRegisteredAtDesc,
  defaultLocations,
  defaultRegStatus,
  digitsOnlyPhone,
  firestoreListenConsoleError,
  generateVnpPersonId,
  getArchiveProfileDocId,
  getEffectiveParticipantAge,
  getWhatsAppMessageHistoryRows,
  isHideMyExpenseConceptsOn,
  isRosterPersonLiquidadoForFilter,
  isRosterSaldoAFavor,
  mergeArchivedFirestoreDocs,
  participantEligibleAsSpouseLink,
  participantIsArchived,
  participantMatchesRosterSearchComments,
  resolveEventNamesForUserLog,
  SESSION_HEARTBEAT_MS,
  SESSION_TTL_MS,
  sessionDocId,
  isStaffPanelLogoutInProgress,
  setStaffPanelLogoutInProgress,
  SNAPSHOT_LISTENER_OPTS,
  stripFinancialFromArchiveIndexDoc,
  summarizeLocationsForUserLog,
} = appMainModuleScope;

/** Primera mitad de handlers (chunk app-handlers-a). */
export function useAppMainHandlersPartA(getScope) {
  /* __SCOPE_DEPS_AUTO__ */
  const {
    LogOut,
    addLog,
    allParticipants = [],
    buildGenericManualWhatsAppMessage,
    buildMergedFinanceWhatsAppMessage,
    cancelledData = {},
    cardCommissionPctDraft,
    currentEvent,
    currentPricing,
    currentUser,
    data = {},
    editRegistryModal = null,
    eventDateDraft,
    events = [],
    fbUser,
    finalizeStaffPanelSignOut,
    formatMoney,
    getCardCommissionRate,
    getDocRef,
    getLiquidationTarget,
    getRosterFilterStateSnapshot,
    getUserAllowedEventIds,
    getUserAllowedLocations,
    globalConfig,
    globalRegistryListFilters,
    hasAdminRights,
    hasEventAccess,
    hasLocationAccess,
    isCampa,
    isSuperUser,
    logParticipantActivity,
    logoutConfirmOnBackOpen = false,
    panelNavMerged,
    personOfInterestVnpSet,
    privacyNoticePublicUrl,
    rearmEventHubBackGuard,
    refreshParticipantCache,
    removeResponsivaArtifactsForParticipant,
    resetStaffPanelAfterSignOut,
    resolveRegisteredCost,
    showToast,
    sortBy = 'registered-desc',
    setSuperSessionCount = () => {},
    setCurrentUser = () => {},
    staffSnapshotUnsubsRef = { current: [] },
    panelNavMergedPrevRef = { current: null },
    rosterLocationSearchRef = { current: '' },
    spouseLinkSearchEdit = '',
    spouseLinkSearchNew = '',
    summaryCampaScopes = {},
    summaryFilterAssignment = 'all',
    summaryFilterBaptism = 'all',
    summaryFilterScholarship = 'all',
    summaryFilterServer = 'all',
    systemView,
    uiButtons,
    uiModal,
    updateDoc,
    users = [],
    waitlistData = {},
    waBulkPopoutRef,
    whatsAppAutoSendCancelRef,
    filterAge = 'all',
    filterAssignment = 'all',
    filterBaptism = 'all',
    filterBzEvtAttendance = 'all',
    filterCarDataPending = 'all',
    filterFirstTimeId = 'all',
    filterGender = 'all',
    filterLiquidation = 'all',
    filterMaritalStatus = 'all',
    filterMedical = 'all',
    filterPaymentType = 'all',
    filterPendingRefund = 'all',
    filterPersonOfInterest = 'all',
    filterRegistrationStatus = 'all',
    filterResponsiva = 'all',
    filterRosterRole = 'all',
    filterScholarship = 'all',
    filterSwim = 'all',
    filterTransport = 'all',
    filterTravelFrom = 'all',
    filterTravelTo = 'all',
    filterWhatsAppPending = 'all',
  } = getScope();
  /* __SCOPE_DEPS_AUTO_END__ */



  const handleExportExcel = async (exportScope = null) => {
    const mod = await import('./handlers/runExportExcel.js');
    return mod.runExportExcel(getScope, exportScope);
  };

  const openExcelExportPicker = useCallback(() => {
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
      const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!currentEvent) return;
    const sections = buildExcelExportSectionAvailability();
    setExcelExportModal({
      isOpen: true,
      locations: [...excelExportAccessibleLocations],
      sections: { ...sections },
    });
  }, []);

  const handleCleanLogs = async () => {
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
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!hasAdminRights) return;
    if (!canDeleteSystemLogs(currentUser, fbUser)) {
      showToast('No tienes permiso para eliminar entradas del historial (requiere cuenta del panel con reglas Firestore desplegadas).');
      return;
    }
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const logsToDelete = logs.filter(
      (log) => now - extractLogMillis(log) > thirtyDaysMs && !log.revertInfo?.isBackup
    );
    const skippedBackup = logs.filter(
      (log) => now - extractLogMillis(log) > thirtyDaysMs && log.revertInfo?.isBackup
    ).length;
    if (logsToDelete.length > 0) {
      await deleteLogsByIds(db, logsToDelete.map((log) => log.id));
      await addLog('Limpieza de Logs', `Se eliminaron ${logsToDelete.length} registros antiguos (> 30 días).`, null, { id: 'Global', name: 'Sistema' });
      showToast(
        skippedBackup > 0
          ? `Se eliminaron ${logsToDelete.length} registros antiguos. ${skippedBackup} log(s) de copia automática no se eliminan (restauración disponible).`
          : `Se eliminaron ${logsToDelete.length} registros antiguos.`
      );
      await refreshActivityLogsFromServer();
    } else {
      showToast(
        skippedBackup > 0
          ? 'No hay otros registros antiguos; los de copia automática se conservan para poder restaurar.'
          : 'No hay registros con más de 30 días de antigüedad.'
      );
    }
  };

  const handleCleanRecentLogs = async () => {
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
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!isSuperUser) return;
    if (!canDeleteSystemLogs(currentUser, fbUser)) {
      showToast('No tienes permiso para eliminar entradas del historial (requiere cuenta del panel con reglas Firestore desplegadas).');
      return;
    }
    if (globalConfig?.isDebugMode) {
      showToast('En modo depuración no se pueden borrar logs con menos de 30 días.');
      return;
    }
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const logsToDelete = logs.filter((log) => now - extractLogMillis(log) <= thirtyDaysMs && !log.revertInfo?.isBackup);
    const skippedBackup = logs.filter((log) => now - extractLogMillis(log) <= thirtyDaysMs && log.revertInfo?.isBackup).length;
    if (logsToDelete.length > 0) {
      await deleteLogsByIds(db, logsToDelete.map((log) => log.id));
      await addLog('Limpieza de Logs', `El SuperUsuario eliminó ${logsToDelete.length} registros recientes (< 30 días).`, null, { id: 'Global', name: 'Sistema' });
      showToast(
        skippedBackup > 0
          ? `Se eliminaron ${logsToDelete.length} registros recientes. ${skippedBackup} log(s) de copia automática no se eliminan.`
          : `Se eliminaron ${logsToDelete.length} registros recientes.`
      );
      await refreshActivityLogsFromServer();
    } else {
      showToast(
        skippedBackup > 0
          ? 'No hay otros registros recientes; los de copia automática se conservan para poder restaurar.'
          : 'No hay registros recientes para eliminar.'
      );
    }
  };

  /** SuperUsuario: elimina los N documentos más antiguos en `app_logs` (por `createdAt` asc), sin tocar copias automáticas. */
  const handleDeleteOldestLogsByCount = async (rawCount) => {
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
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!isSuperUser) return;
    if (globalConfig?.isDebugMode) {
      showToast('En modo depuración no se puede borrar por cantidad.');
      return;
    }
    try {
      const target = Math.min(5000, Math.max(1, Math.floor(Number(rawCount) || 0)));
      const { skippedBackup } = await deleteOldestLogsByCount({
        orderField: LOGS_ORDER_FIELD, });
      if (deleted > 0) {
        await addLog(
          'Limpieza de Logs', `El SuperUsuario eliminó ${deleted} registro(s) de actividad (los más antiguos por fecha; solicitados: ${target}).${skippedBackup ? ` Omitidos ${skippedBackup} log(s) de copia automática.` : ''}`, null, { id: 'Global', name: 'Sistema' }
        );
        showToast(
          skippedBackup > 0
            ? `Se eliminaron ${deleted} registro(s) antiguos. ${skippedBackup} referencia(s) de copia automática no se eliminan.`
            : `Se eliminaron ${deleted} registro(s) antiguos.`
        );
      } else {
        showToast(
          skippedBackup > 0
            ? 'No se eliminó ningún registro; los candidatos eran solo referencias de copia automática.'
            : 'No hay más registros antiguos que coincidan con el criterio.'
        );
      }
    } finally {
      await refreshActivityLogsFromServer();
    }
  };

  const confirmRestore = async () => {
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
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    const { log, type } = restoreModal;
    const formatRevertedLogDateTime = (entry) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
      const ms = extractLogMillis(entry);
      if (Number.isFinite(ms) && ms > 0) {
        return new Date(ms).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'medium' });
      }
      const rawTs = String(entry?.timestamp || '').trim();
      return rawTs || 'fecha/hora no disponible';
    };

    const needsPreRestoreBackup = type === 'single' || type === 'rollback' || type === 'backup';
    if (needsPreRestoreBackup) {
      if (!fbUser || fbUser.isAnonymous) {
        showToast('Inicia sesión con cuenta del panel para restaurar (se requiere copia previa en Storage).');
        setRestoreModal({ isOpen: false, log: null, type: 'single' });
        return;
      }
      try {
        const now = new Date();
        const preId = buildPreRestoreBackupId(now);
        await performAppFullBackup({
          backupId: preId,
          date: formatLocalDateId(now),
          usersForBackup: users,
          backupKind: 'pre-restore',
        });
        await addLog(
          'Sistema',
          `Copia de seguridad automática previa a restauración (${preId}).`,
          'Sistema',
          { id: 'Global', name: 'Sistema' },
          { isBackup: true, backupId: preId, backupKind: 'pre-restore' }
        );
      } catch (e) {
        console.error('Copia previa a restaurar falló', e);
        const code = e?.code || '';
        if (code === 'storage/unauthorized') {
          showToast('No se pudo crear la copia previa (permisos en Storage). Restauración cancelada.');
        } else if (e?.message === 'BACKUP_EMPTY_PARTICIPANTS') {
          showToast('No hay participantes en el servidor; no se creó copia previa. Restauración cancelada.');
        } else {
          showToast('Error al crear copia previa a restaurar. Restauración cancelada.');
        }
        setRestoreModal({ isOpen: false, log: null, type: 'single' });
        return;
      }
    }

    if (type === 'single') {
      await applyRevert(log.revertInfo, log.id);
      const revertedAt = formatRevertedLogDateTime(log);
      addLog(
        'Restauración',
        `Se deshizo el cambio específico: "${log.action}" del usuario ${log.username}. Movimiento revertido del ${revertedAt}.`,
        null,
        { id: 'Global', name: 'Sistema' }
      );
      showToast("Cambio revertido exitosamente.");
    } else if (type === 'rollback') {
      const anchorMs = extractLogMillis(log);
      let logList = logs;
      if (logList.length === 0) {
        const snap = await getDocsFromServer(getColRef('app_logs'));
        logList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      const logsToRevert = logList
        .filter((l) => extractLogMillis(l) >= anchorMs && l.revertInfo && !l.isDebug)
        .sort((a, b) => extractLogMillis(b) - extractLogMillis(a));
      for (const l of logsToRevert) {
        await applyRevert(l.revertInfo, l.id);
      }
      const revertedAt = formatRevertedLogDateTime(log);
      addLog(
        'Restauración Masiva',
        `El SuperUsuario revirtió todos los cambios hasta el evento: "${log.action}" (movimiento del ${revertedAt}).`,
        null,
        { id: 'Global', name: 'Sistema' }
      );
      showToast(`Se han revertido ${logsToRevert.length} cambios exitosamente.`);
    } else if (type === 'cleanOld') {
      await handleCleanLogs();
    } else if (type === 'cleanRecent') {
      await handleCleanRecentLogs();
    } else if (type === 'cleanByCount') {
      const count = Math.min(5000, Math.max(1, Math.floor(Number(restoreModal.deleteCount) || 0)));
      if (logBulkDeleteInFlightRef.current) {
        showToast('Ya hay una limpieza por cantidad en curso.');
      } else {
        logBulkDeleteInFlightRef.current = true;
        setLogBulkDeleteBusy(true);
        showToast(`Eliminando los ${count} registros más antiguos en segundo plano…`);
        void (async () => {
          try {
            await handleDeleteOldestLogsByCount(count);
          } catch (e) {
            console.error(e);
            showToast('Error durante la limpieza de logs.');
          } finally {
            logBulkDeleteInFlightRef.current = false;
            setLogBulkDeleteBusy(false);
          }
        })();
      }
    } else if (type === 'backup') {
      try {
        const backupData = await loadAppBackupMerged(log.revertInfo.backupId);
        if (!backupData || !Array.isArray(backupData.participants) || !Array.isArray(backupData.events)) {
          showToast("Error: No se encontró la información de la copia de seguridad.");
          setRestoreModal({ isOpen: false, log: null, type: 'single' });
          return;
        }

        // Vaciar colecciones desde servidor (no solo el estado en memoria) y rellenar desde la copia en lotes de 500.
        const [participantsSnap, eventsSnap] = await Promise.all([
          getDocsFromServer(getColRef('app_participants')),
          getDocsFromServer(getColRef('app_events')),
        ]);
        await commitDeleteRefsInBatches(participantsSnap.docs.map((d) => d.ref));
        await commitDeleteRefsInBatches(eventsSnap.docs.map((d) => d.ref));

        await commitSetPayloadsInBatches(
          backupData.participants.map((p) => ({
            ref: getDocRef('app_participants', String(p.id)),
            data: p,
          }))
        );
        const eventsForRestore = enrichBackupEventsWithParticipantLocations(
          backupData.events,
          backupData.participants
        );
        await commitSetPayloadsInBatches(
          eventsForRestore.map((e) => ({
            ref: getDocRef('app_events', String(e.id)),
            data: e,
          }))
        );

        await updateDoc(getDocRef('app_data', 'config'), { dataBulkGeneration: increment(1) });

        addLog('Restauración de Sistema', `El SuperUsuario restauró el sistema desde la copia de seguridad del ${backupData.date}.`, null, { id: 'Global', name: 'Sistema' });
        showToast("Sistema restaurado con éxito desde copia de seguridad.");
      } catch (err) {
        console.error(err);
        showToast("Error crítico al restaurar la copia de seguridad.");
      }
    }
    setRestoreModal({ isOpen: false, log: null, type: 'single' });
  };

  const updateEventConfig = useCallback(async (updates) => {
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
      const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!currentEvent) return;
    if (Array.isArray(updates.locations)) {
      const nextSet = new Set(
        updates.locations.map((x) => String(x).trim()).filter(Boolean)
      );
      const removed = (currentEvent.locations || [])
        .map((x) => String(x).trim())
        .filter(Boolean)
        .filter((loc) => !nextSet.has(loc));
      for (const loc of removed) {
        const hasParticipants = allParticipants.some(
          (p) =>
            p.eventId === currentEvent.id &&
            String(p.location || '').trim() === loc &&
            participantIsActiveInEvent(p) &&
            !participantIsCancelled(p) &&
            ((p?.status || 'active') === 'active' ||
              (p?.status || 'active') === 'waitlist' ||
              (p?.status || 'active') === PARTICIPANT_STATUS_CANCELLED)
        );
        if (hasParticipants) {
          showToast(
            `No se puede quitar la sede «${loc}»: hay registros activos, en espera o cancelados. Elimina o reubica esos registros primero.`
          );
          return;
        }
      }
    }
    const payload = { ...updates };
    if (globalConfig?.isDebugMode) {
      payload._isDebug = true;
      payload._debugSessionId = globalConfig.debugSessionId;
    }
    await updateDoc(getDocRef('app_events', currentEvent.id), payload);
    syncEventAfterWrite(setEvents, currentEvent.id, payload);
  }, [currentEvent, globalConfig, allParticipants, showToast]);

  const patchCampaRealCostCountOptions = useCallback(
    async (patch) => {
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
      const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
      if (!currentEvent?.id || currentEvent?.eventType !== 'Campa') return;
      const o = currentEvent.campaRealCostCountOptions;
      const base =
        !o || typeof o !== 'object'
          ? {
              countAmbosDoubleInAllCounts: true,
              includeCortesiaInRealCost: false,
              includeEmpleadoInRealCost: false,
              includePastorInRealCost: false,
            }
          : {
              countAmbosDoubleInAllCounts: o.countAmbosDoubleInAllCounts !== false,
              includeCortesiaInRealCost: o.includeCortesiaInRealCost === true,
              includeEmpleadoInRealCost: o.includeEmpleadoInRealCost === true,
              includePastorInRealCost: o.includePastorInRealCost === true,
            };
      try {
        await updateEventConfig({ campaRealCostCountOptions: { ...base, ...patch } });
      } catch (e) {
        console.error(e);
        showToast('No se pudo guardar el ajuste de conteo (costo real). Revisa permisos o conexión.');
      }
    },
    [currentEvent, updateEventConfig, showToast]
  );

  const handleSaveEventDates = useCallback(async () => {
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
      const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!currentEvent?.id || !hasAdminRights) return;
    const d = eventDateDraft;
    if (d.dateStart && d.dateEnd && compareIsoDates(d.dateStart, d.dateEnd) > 0) {
      showToast('La fecha «Desde» no puede ser posterior a «Hasta».');
      return;
    }
    if (d.campaTeensStart && d.campaTeensEnd && compareIsoDates(d.campaTeensStart, d.campaTeensEnd) > 0) {
      showToast('Rango Teens: la fecha inicial no puede ser posterior a la final.');
      return;
    }
    if (d.campaJovenesStart && d.campaJovenesEnd && compareIsoDates(d.campaJovenesStart, d.campaJovenesEnd) > 0) {
      showToast('Rango Jóvenes: la fecha inicial no puede ser posterior a la final.');
      return;
    }
    const primary = (d.dateEnd || d.dateStart || '').trim();
    const payload = {
      dateStart: (d.dateStart || '').trim(),
      dateEnd: (d.dateEnd || '').trim(),
      date: primary || currentEvent.date || '',
      ...(isCampa
        ? {
            campaTeensDateStart: (d.campaTeensStart || '').trim(),
            campaTeensDateEnd: (d.campaTeensEnd || '').trim(),
            campaJovenesDateStart: (d.campaJovenesStart || '').trim(),
            campaJovenesDateEnd: (d.campaJovenesEnd || '').trim(),
          }
        : {}),
    };
    if (globalConfig?.isDebugMode) {
      payload._isDebug = true;
      payload._debugSessionId = globalConfig.debugSessionId;
    }
    try {
      await updateDoc(getDocRef('app_events', currentEvent.id), payload);
      addLog(
        'Evento',
        `Actualizó fechas del evento (rango general y ${isCampa ? 'segmentos Teens/Jóvenes' : 'alcance'}).`,
        null,
        { id: 'Global', name: 'Sistema' },
        { collectionName: 'app_events', docId: currentEvent.id, action: 'update', previousData: currentEvent }
      );
      showToast('Fechas del evento guardadas.');
    } catch (e) {
      console.error(e);
      showToast('No se pudieron guardar las fechas.');
    }
  }, [currentEvent, eventDateDraft, hasAdminRights, isCampa, globalConfig?.isDebugMode, globalConfig?.debugSessionId, addLog, showToast]);

  const handleSaveCardCommissionRate = useCallback(async () => {
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
      const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!hasAdminRights || globalConfig == null) return;
    const n = parseFloat(String(cardCommissionPctDraft).replace(',', '.'));
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      showToast('Indica un porcentaje entre 0 y 100.');
      return;
    }
    const fraction = n / 100;
    const prevRate = getCardCommissionRate();
    if (Math.abs(fraction - prevRate) < 1e-8) return;
    const payload = { cardCommissionRate: fraction };
    if (globalConfig?.isDebugMode) {
      payload._isDebug = true;
      payload._debugSessionId = globalConfig.debugSessionId;
    }
    try {
      await updateDoc(getDocRef('app_data', 'config'), payload);
      addLog(
        'Configuración',
        `Actualizó la comisión de tarjeta de ${(prevRate * 100).toFixed(2)}% a ${n.toFixed(2)}%.`,
        currentUser?.username || null,
        { id: 'Global', name: 'Sistema' },
        { collectionName: 'app_data', docId: 'config', action: 'update', previousData: globalConfig }
      );
      showToast('Comisión de tarjeta guardada.');
    } catch (e) {
      console.error(e);
      showToast('No se pudo guardar la comisión.');
    }
  }, [
    hasAdminRights,
    globalConfig,
    cardCommissionPctDraft,
    getCardCommissionRate,
    currentUser?.username,
    addLog,
    showToast,
  ]);

  const removeCurrentUserSession = useCallback(async (user) => {
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
      const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!user?.id || !user.tabSessionId) return;
    const uid = String(user.id);
    await deleteDoc(getDocRef('app_sessions', sessionDocId(uid, user.tabSessionId))).catch(() => {});
    let anyActive = false;
    try {
      const q = query(getColRef('app_sessions'), where('userId', '==', uid));
      const snap = await getDocs(q);
      const now = Date.now();
      snap.forEach((d) => {
        if ((d.data().lastHeartbeat || 0) > now - SESSION_TTL_MS) anyActive = true;
      });
    } catch {
      /* sin auth o sin permiso: igual marcar offline best-effort */
    }
    if (!anyActive) {
      const uref = getDocRef('app_users', uid);
      try {
        const prevSnap = await getDoc(uref);
        const prevData = prevSnap.exists() ? prevSnap.data() : {};
        await updateDoc(uref, buildUserOfflineSessionPatch(prevData, Date.now()));
      } catch {
        await updateDoc(uref, { isOnline: false, onlineSince: deleteField() }).catch(() => {});
      }
    }
  }, []);

  const broadcastSessionActivity = useCallback(
    async (kind, username, actorTabSessionId) => {
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
      const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
      try {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
        const patch = {
          sessionActivityBroadcast: {
            id,
            kind: kind === 'logout' ? 'logout' : 'login',
            username: String(username || '').trim() || 'Usuario',
            actorTabSessionId: String(actorTabSessionId || ''),
          },
        };
        if (globalConfig?.isDebugMode) {
          patch._isDebug = true;
          patch._debugSessionId = globalConfig.debugSessionId;
        }
        await updateDoc(getDocRef('app_data', 'config'), patch);
      } catch (e) {
        console.warn('[vnpm] sessionActivityBroadcast', e);
      }
    },
    [globalConfig?.isDebugMode, globalConfig?.debugSessionId]
  );

  /** Marca de tiempo en ms (Timestamp de Firestore o número). */
  const sessionRevokedAtToMs = useCallback((v) => {
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
      const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (v == null) return null;
    if (typeof v.toMillis === 'function') return v.toMillis();
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }, []);

  const revokeAllSessionsForOtherUser = useCallback(
    async (targetUser) => {
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
      const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
      if (!isSuperUser || !targetUser?.id) return;
      if (String(targetUser.id) === String(currentUser?.id)) {
        showToast('No puedes cerrar tus propias sesiones desde aquí. Usa «Salir» en cada dispositivo.');
        return;
      }
      const uid = String(targetUser.id);
      const uname = targetUser.username || uid;
      try {
        const q = query(getColRef('app_sessions'), where('userId', '==', uid));
        const snap = await getDocs(q);
        await Promise.all(snap.docs.map((d) => deleteDoc(getDocRef('app_sessions', d.id)).catch(() => {})));
        const now = Date.now();
        const uref = getDocRef('app_users', uid);
        let prevData = {};
        try {
          const prevSnap = await getDoc(uref);
          if (prevSnap.exists()) prevData = prevSnap.data();
        } catch {
          /* */
        }
        const patch = {
          ...buildUserOfflineSessionPatch(prevData, now),
          sessionRevokedAt: now,
        };
        if (globalConfig?.isDebugMode) {
          patch._isDebug = true;
          patch._debugSessionId = globalConfig.debugSessionId;
        }
        await updateDoc(uref, patch);
        addLog(
          'Gestión de Usuarios',
          `SuperUsuario cerró las sesiones activas de ${uname}.`,
          currentUser?.username || null,
          { id: 'Global', name: 'Sistema' }
        );
        showToast(`Sesiones de «${uname}» cerradas. Deberá iniciar sesión de nuevo.`);
      } catch (e) {
        console.error(e);
        showToast('No se pudieron cerrar las sesiones.');
      }
    },
    [isSuperUser, currentUser?.id, currentUser?.username, addLog, showToast, globalConfig?.isDebugMode, globalConfig?.debugSessionId]
  );

  const remoteSessionRevokeHandledRef = useRef(false);
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
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    remoteSessionRevokeHandledRef.current = false;
  }, [currentUser?.loginTime, currentUser?.id]);

  /** Si un SuperUsuario revocó sesiones, el usuario afectado debe salir (campo `sessionRevokedAt` > momento de inicio de sesión). */
  useEffect(() => {
    if (!fbUser || !currentUser?.id || currentUser.loginTime == null) return;
    const live = users.find((u) => String(u.id) === String(currentUser.id));
    const revMs = sessionRevokedAtToMs(live?.sessionRevokedAt);
    if (revMs == null || revMs <= Number(currentUser.loginTime)) return;
    if (remoteSessionRevokeHandledRef.current) return;
    remoteSessionRevokeHandledRef.current = true;
    let cancelled = false;
    (async () => {
      setStaffPanelLogoutInProgress(true);
      showToast('Tu sesión fue cerrada por un administrador.');
      try {
        await removeCurrentUserSession(currentUser);
      } catch (e) {
        console.warn(e);
      }
      await finalizeStaffPanelSignOut();
      if (cancelled) return;
      resetStaffPanelAfterSignOut();
    })().finally(() => {
      setTimeout(() => {
        setStaffPanelLogoutInProgress(false);
      }, 2500);
    });
    return () => {
      cancelled = true;
    };
  }, [users, fbUser, currentUser, finalizeStaffPanelSignOut, resetStaffPanelAfterSignOut, removeCurrentUserSession]);

  const finalizeStaffLoginAfterAuth = async (trimUser, loginEmailFallback) => {
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
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    const {
      auth,
      loginInProgressRef,
      setGoogleLoginBusy,
      setLoginBusy,
      setLoginError,
      setLoginForm,
      setShowLoginPassword,
    } = getScope();
    const resolvedEmail = (auth.currentUser?.email || loginEmailFallback || '').trim();
    const tabSessionId = getTabSessionId();
    try {
      let docSnap = null;
      let qSnap = await getDocs(query(getColRef('app_users'), where('authUid', '==', auth.currentUser.uid)));
      if (!qSnap.empty) docSnap = qSnap.docs[0];
      if (!docSnap) {
        qSnap = await getDocs(query(getColRef('app_users'), where('authEmail', '==', resolvedEmail)));
        if (!qSnap.empty) docSnap = qSnap.docs[0];
      }
      if (!docSnap) {
        const nameHint = trimUser.includes('@') ? trimUser.split('@')[0] : trimUser;
        const variants = buildUsernameCandidates(nameHint);
        if (variants.length) {
          qSnap = await getDocs(query(getColRef('app_users'), where('username', 'in', variants)));
          if (!qSnap.empty) docSnap = qSnap.docs[0];
        }
      }
      if (!docSnap) {
        const nameHint = trimUser.includes('@') ? trimUser.split('@')[0] : trimUser;
        const lower = nameHint.toLowerCase();
        const prefixSnap = await getDocs(
          query(
            getColRef('app_users'),
            where('username', '>=', lower),
            where('username', '<=', `${lower}\uf8ff`),
            limit(5)
          )
        );
        docSnap =
          prefixSnap.docs.find((d) => String(d.data()?.username || '').trim().toLowerCase() === lower) || null;
      }
      if (!docSnap) {
        const isGoogle =
          auth.currentUser?.providerData?.some((p) => p.providerId === 'google.com');
        if (isGoogle) {
          try {
            const functions = getFunctions(app, 'us-central1');
            const removeUnauthorizedGoogleAuthUser = httpsCallable(
              functions,
              'removeUnauthorizedGoogleAuthUser'
            );
            await removeUnauthorizedGoogleAuthUser();
          } catch (e) {
            console.warn(e);
          }
        }
        await signOut(auth);
        setLoginError('Tu cuenta no tiene perfil en la aplicación. Contacta al administrador.');
        loginInProgressRef.current = false;
        setLoginBusy(false);
        setGoogleLoginBusy(false);
        return;
      }
      let user = { id: docSnap.id, ...docSnap.data() };
      let didLinkAuthProfile = false;
      const uidMismatch =
        !user.authUid || String(user.authUid) !== String(auth.currentUser?.uid || '');
      if (uidMismatch) {
        await updateDoc(getDocRef('app_users', docSnap.id), {
          authUid: auth.currentUser.uid,
          authEmail: resolvedEmail,
          password: deleteField(),
        });
        user = { ...user, authUid: auth.currentUser.uid, authEmail: resolvedEmail };
        delete user.password;
        didLinkAuthProfile = true;
      }
      if (user.role !== 'SuperUsuario') {
        const max = getMaxConcurrentSessionsForUser(user);
        const others = await countOtherActiveSessions(user.id, tabSessionId);
        if (others >= max) {
          await signOut(auth);
          setLoginError(
            max <= 1
              ? 'Ya hay una sesión activa con este usuario en otra pestaña o dispositivo. Cierra esa sesión, usa «Salir» allí, o espera unos segundos e intenta de nuevo.'
              : `Este usuario ya alcanzó el máximo de sesiones simultáneas (${max}). Cierra una sesión en otro dispositivo o pestaña, o espera unos segundos e intenta de nuevo.`
          );
          loginInProgressRef.current = false;
          setLoginBusy(false);
          setGoogleLoginBusy(false);
          return;
        }
      }
      await setDoc(getDocRef('app_sessions', sessionDocId(user.id, tabSessionId)), {
        userId: String(user.id),
        sessionId: tabSessionId,
        username: user.username,
        lastHeartbeat: Date.now(),
        createdAt: Date.now(),
      });
      const loginTime = Date.now();
      const adminDefaultPref = (user.username || '').toLowerCase() === 'admin' && user.role === 'Administrador' ? 'Norte' : (user.preferredLandingTab || 'Summary');
      await updateDoc(getDocRef('app_users', String(user.id)), {
        isOnline: true,
        onlineSince: Date.now(),
        ...buildClientVersionPatch(),
      });
      /* Solo tras writes remotos OK: evita UI «logueada» con auth ya cerrada. */
      setCurrentUser({
        ...user,
        tabSessionId,
        loginTime,
        allowedEventIds: getUserAllowedEventIds(user),
        allowedLocations: getUserAllowedLocations(user),
        preferredLandingTab: adminDefaultPref
      });
      setLoginForm({ username: '', password: '' });
      setShowLoginPassword(false);
      if (didLinkAuthProfile) {
        addLog(
          'Gestión de Usuarios',
          `Acceso: vinculó por primera vez la cuenta de Firebase al perfil «${user.username}».`,
          user.username,
          { id: 'Global', name: 'Sistema' }
        );
      }
      addLog(
        'Inicio de Sesión',
        `El usuario ${user.username} inició sesión.${getSessionLogClientSuffix()}`,
        user.username,
        { id: 'Global', name: 'Sistema' }
      );
      queueMicrotask(() => {
        void broadcastSessionActivity('login', user.username, tabSessionId);
      });
    } catch (err) {
      console.error(err);
      setStaffPanelLogoutInProgress(true);
      try {
        await signOut(auth).catch(() => {});
      } finally {
        setStaffPanelLogoutInProgress(false);
      }
      resetStaffPanelAfterSignOut();
      setLoginError('No se pudo iniciar sesión. Revisa la conexión e intenta de nuevo.');
    } finally {
      loginInProgressRef.current = false;
      setLoginBusy(false);
      setGoogleLoginBusy(false);
    }
  };

  const handleLogin = async (e) => {
    const {
      auth,
      loginForm,
      loginInProgressRef,
      mapStaffLoginFirebaseError,
      resolveStaffLoginEmail,
      setLoginBusy,
      setLoginError,
      setShowLoginPassword,
      signInWithEmailAndPassword,
    } = getScope();
    e.preventDefault();
    setLoginError('');
    setShowLoginPassword(false);
    loginInProgressRef.current = true;
    setLoginBusy(true);
    const trimUser = loginForm.username.trim();
    const { email, error: emailError } = await resolveStaffLoginEmail(trimUser);
    if (emailError) {
      loginInProgressRef.current = false;
      setLoginBusy(false);
      setLoginError(emailError);
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, loginForm.password);
    } catch (err) {
      console.error(err);
      loginInProgressRef.current = false;
      setLoginBusy(false);
      setLoginError(mapStaffLoginFirebaseError(err, email));
      return;
    }
    await finalizeStaffLoginAfterAuth(trimUser, email);
  };

  const handleGoogleLogin = async () => {
    const {
      GoogleAuthProvider,
      auth,
      linkWithCredential,
      loginForm,
      loginInProgressRef,
      normalizeAuthEmail,
      setGoogleLoginBusy,
      setLoginError,
      setShowLoginPassword,
      signInWithEmailAndPassword,
      signInWithPopup,
    } = getScope();
    setLoginError('');
    setShowLoginPassword(false);
    loginInProgressRef.current = true;
    setGoogleLoginBusy(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
      const c = err?.code;
      if (c === 'auth/popup-closed-by-user') {
        loginInProgressRef.current = false;
        setGoogleLoginBusy(false);
        setLoginError('');
        return;
      }
      if (c === 'auth/account-exists-with-different-credential') {
        const pending = GoogleAuthProvider.credentialFromError(err);
        const emailRaw = err?.customData?.email;
        const email = emailRaw ? normalizeAuthEmail(String(emailRaw)) : '';
        if (pending && email) {
          const pwd = loginForm.password.trim();
          if (!pwd) {
            loginInProgressRef.current = false;
            setGoogleLoginBusy(false);
            setLoginError(
              'Tu cuenta ya tiene contraseña en el sistema. Escribe la contraseña que te asignó el administrador y vuelve a pulsar «Continuar con Google» para vincular tu Gmail; después podrás entrar con cualquiera de los dos métodos. También puedes usar «Iniciar sesión» con el mismo correo y contraseña.'
            );
            return;
          }
          try {
            await signInWithEmailAndPassword(auth, email, pwd);
            await linkWithCredential(auth.currentUser, pending);
          } catch (e2) {
            console.error(e2);
            loginInProgressRef.current = false;
            setGoogleLoginBusy(false);
            setLoginError(
              'No se pudo vincular Google. Revisa la contraseña del sistema o intenta solo con «Iniciar sesión» (correo y contraseña).'
            );
            return;
          }
          const trimUser = email.includes('@') ? email.split('@')[0] : email;
          await finalizeStaffLoginAfterAuth(trimUser, email);
          return;
        }
      }
      loginInProgressRef.current = false;
      setGoogleLoginBusy(false);
      if (c === 'auth/account-exists-with-different-credential') {
        setLoginError(
          'Esta cuenta ya está registrada con correo y contraseña. Usa «Iniciar sesión» con tu Gmail y contraseña, o contacta al administrador.'
        );
      } else {
        setLoginError('No se pudo iniciar sesión con Google. Revisa la conexión e intenta de nuevo.');
      }
      return;
    }
    const gmail = (auth.currentUser?.email || '').trim();
    const trimUser = gmail.includes('@') ? gmail.split('@')[0] : gmail;
    await finalizeStaffLoginAfterAuth(trimUser, gmail);
  };

  const handleLogout = useCallback(async () => {
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
      const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (isStaffPanelLogoutInProgress()) return;
    setStaffPanelLogoutInProgress(true);
    setLogoutBusy(true);
    try {
      const userSnapshot = currentUser;
      if (userSnapshot) {
        const activeTime = Date.now() - (userSnapshot.loginTime || Date.now());
        const formattedTime = formatDuration(activeTime);
        await writeStaffSessionLogOnce(addLog, {
          kind: 'logout_manual',
          action: 'Cierre de Sesión',
          details: `El usuario ${userSnapshot.username} cerró sesión manualmente. (Tiempo activo: ${formattedTime})${getSessionLogClientSuffix()}`,
          user: userSnapshot,
        }).catch((e) => console.warn('[vnpm] logout log', e));
        await broadcastSessionActivity('logout', userSnapshot.username, userSnapshot.tabSessionId).catch(() => {});
        await removeCurrentUserSession(userSnapshot).catch((e) => console.warn('[vnpm] logout session', e));
      }
    } catch (e) {
      console.error('Error al cerrar sesión:', e);
    } finally {
      /* Siempre salir localmente aunque falle la limpieza remota (p. ej. auth ya nulo). */
      await finalizeStaffPanelSignOut().catch(() => {});
      resetStaffPanelAfterSignOut();
      setTimeout(() => {
        setStaffPanelLogoutInProgress(false);
        setLogoutBusy(false);
      }, 2500);
    }
  }, [
    currentUser,
    addLog,
    broadcastSessionActivity,
    removeCurrentUserSession,
    finalizeStaffPanelSignOut,
    resetStaffPanelAfterSignOut,
  ]);

  const dismissLogoutConfirmOnBack = useCallback(() => {
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
      const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    setLogoutConfirmOnBackOpen(false);
    rearmEventHubBackGuard();
  }, [rearmEventHubBackGuard]);

  const confirmLogoutFromBack = useCallback(() => {
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
      const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    setLogoutConfirmOnBackOpen(false);
    void handleLogout();
  }, [handleLogout]);

  const logoutConfirmOnBackModalEl =
    logoutConfirmOnBackOpen && currentUser && uiModal ? (
      <div className={uiModal.overlay} role="presentation">
        <button
          type="button"
          className={uiModal.backdrop}
          onClick={dismissLogoutConfirmOnBack}
          aria-label="Cerrar confirmación"
        />
        <div
          className={`${uiModal.panel} max-w-sm p-7 animate-in zoom-in-95 duration-200 text-center`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-back-confirm-title"
        >
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300">
            {LogOut ? <LogOut size={32} aria-hidden /> : null}
          </div>
          <h3 id="logout-back-confirm-title" className="text-lg font-black text-slate-800 dark:text-slate-100 mb-2">
            ¿Cerrar sesión?
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-300 mb-5 leading-relaxed">
            Al salir de la selección de eventos con «Atrás» se cierra tu sesión en este dispositivo. ¿Deseas continuar?
          </p>
          <div className="flex gap-3">
            <button type="button" onClick={dismissLogoutConfirmOnBack} className={`flex-1 py-3 px-4 text-sm ${uiButtons?.secondary || ''}`}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmLogoutFromBack}
              className="flex-1 py-3 px-4 text-white font-bold rounded-xl transition-colors text-sm shadow-lg bg-rose-600 hover:bg-rose-700 shadow-rose-200"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    ) : null;

  // Copia automática: cada día a las 12:00 a.m. (hora local) si hay sesión admin; también al abrir si faltó la de hoy.
  const runDailyScheduledBackupIfDue = useCallback(async () => {
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
      const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!globalConfig || !hasAdminRights || !fbUser) return;
    if (fbUser.isAnonymous) return;

    const now = new Date();
    const today = formatLocalDateId(now);
    if (!isDailyBackupDue(globalConfig.lastBackupDate, now)) return;
    if (appMainModuleScope.scheduledBackupAsyncLock.current) return;
    appMainModuleScope.scheduledBackupAsyncLock.current = true;

    try {
      const cfgSnap = await getDocFromServer(getDocRef('app_data', 'config'));
      if (cfgSnap.exists() && cfgSnap.data()?.lastBackupDate === today) return;

      await performAppFullBackup({
        backupId: today,
        date: today,
        usersForBackup: users,
        backupKind: 'daily',
        updateLastBackupDate: true,
        pruneRetentionMonths: BACKUP_RETENTION_MONTHS,
      });

      addLog(
        'Sistema',
        `Copia de seguridad automática (${today}, 12:00 a.m. hora local) guardada en Storage.`,
        'Sistema',
        { id: 'Global', name: 'Sistema' },
        { isBackup: true, backupId: today, backupKind: 'daily' }
      );
    } catch (e) {
      const code = e?.code || '';
      if (code === 'storage/unauthorized') {
        console.warn(
          'Backup automático sin permisos en Storage. Verifica sesión no anónima y despliegue de `storage.rules` (ruta app_auto_backups/*).',
          e
        );
      } else {
        console.error('Backup automático falló', e);
      }
    } finally {
      appMainModuleScope.scheduledBackupAsyncLock.current = false;
    }
  }, [globalConfig, users, hasAdminRights, addLog, fbUser]);

  useEffect(() => {
    let cancelled = false;
    let midnightTimeoutId;

    const run = () => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
      if (cancelled) return;
      void runDailyScheduledBackupIfDue();
    };

    run();

    const scheduleMidnight = () => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
      midnightTimeoutId = setTimeout(() => {
        run();
        scheduleMidnight();
      }, msUntilNextLocalMidnight());
    };
    scheduleMidnight();

    return () => {
      cancelled = true;
      if (midnightTimeoutId) clearTimeout(midnightTimeoutId);
    };
  }, [runDailyScheduledBackupIfDue]);

  // Activity Watcher and Session Logout Logic
  useEffect(() => {
    if (!currentUser) return;

    let timeoutId;
    let throttleTimeoutId;
    let midnightTimeoutId;
    let isClosing = false;

    const handleBrowserClose = () => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
      if (isStaffPanelLogoutInProgress()) return;
      if (currentUser?.id && !isClosing) {
        isClosing = true;
        setStaffPanelLogoutInProgress(true);
        const activeTime = Date.now() - (currentUser.loginTime || Date.now());
        const formattedTime = formatDuration(activeTime);
        const u = currentUser;
        void writeStaffSessionLogOnce(addLog, {
          kind: 'logout_pagehide',
          action: 'Cierre de Sesión Automático',
          details: `Sesión finalizada por cierre de pestaña, ventana o navegador. (Tiempo activo: ${formattedTime})${getSessionLogClientSuffix()}`,
          user: u,
        });
        removeCurrentUserSession(u).catch(() => {});
      }
    };

    const performLogout = async () => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
      if (isStaffPanelLogoutInProgress()) return;
      setStaffPanelLogoutInProgress(true);
      try {
        const userSnapshot = currentUser;
        const activeTime = Date.now() - (userSnapshot.loginTime || Date.now());
        const formattedTime = formatDuration(activeTime);
        await writeStaffSessionLogOnce(addLog, {
          kind: 'logout_inactivity',
          action: 'Cierre de Sesión Automático',
          details: `Sesión finalizada por inactividad. (Tiempo activo: ${formattedTime})${getSessionLogClientSuffix()}`,
          user: userSnapshot,
        }).catch((e) => console.warn('[vnpm] logout inactivity log', e));
        await broadcastSessionActivity('logout', userSnapshot.username, userSnapshot.tabSessionId).catch(() => {});
        await removeCurrentUserSession(userSnapshot).catch((e) => console.warn('[vnpm] logout inactivity session', e));
        await finalizeStaffPanelSignOut().catch(() => {});
        resetStaffPanelAfterSignOut();
        showToast("Tu sesión ha expirado por inactividad de 10 minutos.");
      } finally {
        setTimeout(() => {
          setStaffPanelLogoutInProgress(false);
        }, 2500);
      }
    };

    const msUntilNextLocalMidnight = () => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
      const now = new Date();
      const next = new Date(now);
      next.setHours(24, 0, 0, 0);
      return Math.max(500, next.getTime() - now.getTime());
    };

    const scheduleMidnightSessionCut = () => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
      clearTimeout(midnightTimeoutId);
      midnightTimeoutId = setTimeout(async () => {
        const activeTime = Date.now() - (currentUser.loginTime || Date.now());
        if (activeTime >= 60 * 60 * 1000) {
          if (isStaffPanelLogoutInProgress()) return;
          setStaffPanelLogoutInProgress(true);
          const formattedTime = formatDuration(activeTime);
          const userSnapshot = currentUser;
          try {
            await writeStaffSessionLogOnce(addLog, {
              kind: 'logout_midnight',
              action: 'Cierre de Sesión Automático',
              details: `Sesión finalizada por corte diario de las 12:00 AM (más de 1 hora activa). (Tiempo activo: ${formattedTime})${getSessionLogClientSuffix()}`,
              user: userSnapshot,
            }).catch((e) => console.warn('[vnpm] logout midnight log', e));
            await broadcastSessionActivity('logout', userSnapshot.username, userSnapshot.tabSessionId).catch(() => {});
            await removeCurrentUserSession(userSnapshot).catch((e) => console.warn('[vnpm] logout midnight session', e));
            await finalizeStaffPanelSignOut().catch(() => {});
            resetStaffPanelAfterSignOut();
            showToast('Tu sesión se cerró automáticamente por corte diario de las 12:00 AM.');
          } finally {
            setTimeout(() => {
              setStaffPanelLogoutInProgress(false);
            }, 2500);
          }
          return;
        }
        scheduleMidnightSessionCut();
      }, msUntilNextLocalMidnight());
    };

    const resetTimer = () => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
      clearTimeout(timeoutId);
      timeoutId = setTimeout(performLogout, 10 * 60 * 1000); 
    };

    const handleActivity = () => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
      if (throttleTimeoutId) return;
      throttleTimeoutId = setTimeout(() => {
        throttleTimeoutId = null;
        resetTimer();
      }, 1000);
    };

    const activityEvents = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    resetTimer();
    scheduleMidnightSessionCut();
    activityEvents.forEach(e => window.addEventListener(e, handleActivity));

    /** Cierre de pestaña o salida real de la página; `persisted` evita borrar al volver desde caché atrás. */
    const handlePageHide = (ev) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
      if (ev && ev.persisted) return;
      handleBrowserClose();
    };
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(throttleTimeoutId);
      clearTimeout(midnightTimeoutId);
      activityEvents.forEach(e => window.removeEventListener(e, handleActivity));
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [currentUser, addLog, showToast, removeCurrentUserSession, broadcastSessionActivity, finalizeStaffPanelSignOut, resetStaffPanelAfterSignOut]);

  /** Mantiene viva la sesión en Firestore (necesario para liberar el bloqueo de una sola sesión al cerrar la pestaña). */
  useEffect(() => {
    if (!currentUser?.id || !currentUser.tabSessionId) return;
    const docId = sessionDocId(currentUser.id, currentUser.tabSessionId);
    const tick = () => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
      updateDoc(getDocRef('app_sessions', docId), { lastHeartbeat: Date.now() }).catch(() => {});
    };
    tick();
    const iv = setInterval(tick, SESSION_HEARTBEAT_MS);
    return () => clearInterval(iv);
  }, [currentUser?.id, currentUser?.tabSessionId]);

  /** SuperUsuario: número de sesiones con heartbeat reciente (tiempo real). */
  useEffect(() => {
    if (!isSuperUser || !currentUser?.id) {
      setSuperSessionCount(0);
      return;
    }
    const uid = String(currentUser.id);
    const q = query(getColRef('app_sessions'), where('userId', '==', uid));
    const unsub = onSnapshot(
      q,
      SNAPSHOT_LISTENER_OPTS,
      (snap) => {
        if (!querySnapshotHasDocChanges(snap)) return;
        const now = Date.now();
        let n = 0;
        snap.forEach((d) => {
          if ((d.data().lastHeartbeat || 0) > now - SESSION_TTL_MS) n += 1;
        });
        setSuperSessionCount(n);
      },
      firestoreListenConsoleError
    );
    staffSnapshotUnsubsRef.current.push(unsub);
    return () => {
      unsub();
      staffSnapshotUnsubsRef.current = staffSnapshotUnsubsRef.current.filter((u) => u !== unsub);
    };
  }, [isSuperUser, currentUser?.id]);

  // Real-time Session Permission Sync
  useEffect(() => {
    if (currentUser && users.length > 0) {
      const liveUser = users.find(u => String(u.id) === String(currentUser.id));
      if (liveUser) {
        const roleChanged = liveUser.role !== currentUser.role;
        const effectiveCanViewFinances = (u) =>
          u.role === 'Administrador' || u.role === 'SuperUsuario' ? true : !!u.canViewFinances;
        const financesChanged = effectiveCanViewFinances(liveUser) !== effectiveCanViewFinances(currentUser);
        const expensesChanged = (!!liveUser.canViewExpenses) !== (!!currentUser.canViewExpenses);
        const prevEventAccess = getUserAllowedEventIds(currentUser).slice().sort().join('|');
        const nextEventAccess = getUserAllowedEventIds(liveUser).slice().sort().join('|');
        const prevLocAccess = getUserAllowedLocations(currentUser).slice().sort().join('|');
        const nextLocAccess = getUserAllowedLocations(liveUser).slice().sort().join('|');
        const preferenceChanged = (liveUser.preferredLandingTab || 'Summary') !== (currentUser.preferredLandingTab || 'Summary');
        const hideExpenseConceptsChanged = isHideMyExpenseConceptsOn(liveUser) !== isHideMyExpenseConceptsOn(currentUser);
        const registryDatesChanged = !!liveUser.canEditRegistryDates !== !!currentUser.canEditRegistryDates;
        const markPersonInterestChanged =
          !!liveUser.canMarkPersonsOfInterest !== !!currentUser.canMarkPersonsOfInterest;
        const cancelRegistrationsChanged =
          !!liveUser.canCancelRegistrations !== !!currentUser.canCancelRegistrations;
        const eventRestrictionChanged = prevEventAccess !== nextEventAccess;
        const locationRestrictionChanged = prevLocAccess !== nextLocAccess;
        const prevPanelNav =
          panelNavMergedPrevRef.current != null ? panelNavMergedPrevRef.current : panelNavMerged;
        const panelMenuAccessChanged = panelMenuAccessEffectivelyChanged(
          currentUser,
          liveUser,
          panelNavMerged,
          prevPanelNav
        );

        if (
          roleChanged ||
          financesChanged ||
          expensesChanged ||
          eventRestrictionChanged ||
          locationRestrictionChanged ||
          panelMenuAccessChanged ||
          preferenceChanged ||
          hideExpenseConceptsChanged ||
          registryDatesChanged ||
          markPersonInterestChanged ||
          cancelRegistrationsChanged
        ) {
          setCurrentUser(prev => ({
            ...prev,
            role: liveUser.role,
            canViewFinances: effectiveCanViewFinances(liveUser),
            canViewExpenses: liveUser.canViewExpenses,
            restrictedEventId: liveUser.restrictedEventId || '',
            restrictedLocation: liveUser.restrictedLocation || '',
            allowedEventIds: getUserAllowedEventIds(liveUser),
            allowedLocations: getUserAllowedLocations(liveUser),
            allowedLocationsByEvent: liveUser.allowedLocationsByEvent && typeof liveUser.allowedLocationsByEvent === 'object' ? liveUser.allowedLocationsByEvent : {},
            allowedPanelSections:
              liveUser.allowedPanelSections && typeof liveUser.allowedPanelSections === 'object'
                ? liveUser.allowedPanelSections
                : {},
            allowedPanelSectionsByEvent: liveUser.allowedPanelSectionsByEvent && typeof liveUser.allowedPanelSectionsByEvent === 'object' ? liveUser.allowedPanelSectionsByEvent : {},
            preferredLandingTab: liveUser.preferredLandingTab || 'Summary',
            hideMyExpenseConcepts: isHideMyExpenseConceptsOn(liveUser),
            canEditRegistryDates: !!liveUser.canEditRegistryDates,
            canMarkPersonsOfInterest: !!liveUser.canMarkPersonsOfInterest,
            canCancelRegistrations: !!liveUser.canCancelRegistrations,
          }));
          if (financesChanged && liveUser.role === 'Lector') {
            showToast(`Atención: Tus permisos han cambiado. Ahora ${effectiveCanViewFinances(liveUser) ? 'PUEDES' : 'NO PUEDES'} ver información financiera.`);
          } else if (roleChanged) {
            showToast(`Atención: Tu rol ha sido actualizado a ${liveUser.role}.`);
          } else if (panelMenuAccessChanged) {
            showToast('Tu acceso al menú lateral del evento se actualizó.');
          } else if (
            (eventRestrictionChanged || locationRestrictionChanged) &&
            normalizeRole(liveUser.role) !== 'SuperUsuario'
          ) {
            showToast('Tus restricciones de evento/sede se actualizaron.');
          } else if (preferenceChanged) {
            showToast('Tu preferencia de ventana inicial fue actualizada.');
          } else if (registryDatesChanged) {
            showToast(`Permiso de editar fechas de registros/abonos: ${liveUser.canEditRegistryDates ? 'activado' : 'desactivado'}.`);
          } else if (markPersonInterestChanged) {
            showToast(
              `Permiso para marcar personas de interés: ${liveUser.canMarkPersonsOfInterest ? 'activado' : 'desactivado'}.`
            );
          } else if (cancelRegistrationsChanged) {
            showToast(
              `Permiso para dar de baja registros: ${liveUser.canCancelRegistrations ? 'activado' : 'desactivado'}.`
            );
          }
        }
        panelNavMergedPrevRef.current = panelNavMerged;
      }
    }
  }, [
    users,
    currentUser,
    currentUser?.id,
    currentUser?.role,
    currentUser?.canViewFinances,
    currentUser?.canViewExpenses,
    currentUser?.restrictedEventId,
    currentUser?.restrictedLocation,
    currentUser?.allowedEventIds,
    currentUser?.allowedLocations,
    currentUser?.preferredLandingTab,
    currentUser?.hideMyExpenseConcepts,
    currentUser?.canEditRegistryDates,
    currentUser?.canMarkPersonsOfInterest,
    currentUser?.canCancelRegistrations,
    panelNavMerged,
    showToast,
    getUserAllowedEventIds,
    getUserAllowedLocations,
  ]);

  const handleCreateEvent = async () => {
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
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    const nameTrim = newEventData.name.trim();
    if (!nameTrim) return;
    const docIdResult = eventFirestoreDocIdFromHumanName(nameTrim);
    if (!docIdResult.ok) {
      showToast(docIdResult.error);
      return;
    }
    const eventDocId = docIdResult.id;
    if (events.some((e) => String(e.id) === eventDocId)) {
      showToast('Ya existe un evento con ese nombre.');
      return;
    }
    try {
      const existing = await getDoc(getDocRef('app_events', eventDocId));
      if (existing.exists()) {
        showToast('Ya existe un evento con ese nombre en Firebase.');
        return;
      }
    } catch (e) {
      console.error(e);
      showToast('No se pudo verificar si el nombre del evento ya existe.');
      return;
    }
    const eventType = EVENT_TYPES.includes(newEventData.type) ? newEventData.type : 'Campa';
    const attendanceFields = buildNewEventAttendanceFields(eventType);
    const costFields = buildNewEventCostFields(eventType);
    const baseCostNum = Number(newEventData.baseCost) || 0;
    const newEvt = {
      id: eventDocId,
      name: nameTrim,
      eventType,
      date: newEventData.date,
      dateStart: newEventData.date || '',
      dateEnd: newEventData.date || '',
      paymentDeadlineDate: '',
      campaTeensDateStart: '',
      campaTeensDateEnd: '',
      campaJovenesDateStart: '',
      campaJovenesDateEnd: '',
      pricingType: 'fixed', 
      globalCost: baseCostNum, 
      serverCost: 0, 
      realCost: 0,
      dynamicPrices: [],
      dynamicServerPrices: [],
      discountCampaigns: [],
      minDeposit: 0, locations: defaultLocations, regStatus: defaultRegStatus,
      cardPaymentEnabled: true,
      cardPaymentByLocation: {},
      eventTotalCap: 0,
      locationCaps: defaultLocations.reduce((acc, loc) => ({ ...acc, [loc]: 0 }), {}),
      customFields: [], order: events.length,
      campaRealCostBreakdownItems: [],
      activeRosterUnitsTotal: 0,
      ...attendanceFields,
      ...costFields,
      costRubros:
        Array.isArray(costFields.costRubros) && costFields.costRubros.length > 0
          ? costFields.costRubros.map((r, i) =>
              i === 0 ? { ...r, amount: baseCostNum || r.amount } : r
            )
          : costFields.costRubros,
      ...(globalConfig?.isDebugMode ? { _isDebug: true, _debugSessionId: globalConfig.debugSessionId } : {})
    };
    try {
      await setDoc(getDocRef('app_events', newEvt.id), newEvt);
    } catch (e) {
      console.error(e);
      const code = e?.code || '';
      const msg =
        code === 'permission-denied'
          ? 'Permiso denegado en Firestore. Despliega las reglas en la base de datos «registros-vnpm» (ver firebase.json): npx firebase-tools@latest deploy --only firestore:rules'
          : 'No se pudo crear el evento. Revisa conexión y permisos en Firestore.';
      showToast(msg);
      return;
    }
    setIsAddEventModalOpen(false);
    setNewEventData({ name: '', type: 'Campa', date: '', baseCost: '' });
    if (currentUser?.id) clearNewEventFormDraft(currentUser.id);
    showToast('Evento creado.');
    try {
      await addLog('Gestión de Eventos', `Creó un nuevo evento (${newEvt.eventType}): ${newEvt.name} con base de $${newEvt.globalCost}`, null, newEvt, { collectionName: 'app_events', docId: newEvt.id, action: 'create', previousData: null });
    } catch (logErr) {
      console.error(logErr);
    }
  };

  const openEditEventModal = (ev) => {
    const { setRenameModal } = getScope();
    if (!ev?.id) return;
    setRenameModal(buildEditEventModalState(ev));
  };

  const handleRenameEvent = async () => {
    const {
      addLog,
      events,
      getDocRef,
      globalConfig,
      renameModal,
      setEvents,
      setRenameModal,
      showToast,
      syncEventAfterWrite,
      updateDoc,
    } = getScope();
    const built = buildEditEventFirestorePayload(renameModal);
    if (!built.ok) {
      showToast(built.error);
      return;
    }
    const ev = events.find((e) => e.id === renameModal.id);
    if (!ev) {
      showToast('No se encontró el evento.');
      setRenameModal({ ...CLOSED_EDIT_EVENT_MODAL });
      return;
    }
    const payload = { ...built.payload };
    if (globalConfig?.isDebugMode) {
      payload._isDebug = true;
      payload._debugSessionId = globalConfig.debugSessionId;
    }
    try {
      await updateDoc(getDocRef('app_events', ev.id), payload);
      syncEventAfterWrite(setEvents, ev.id, payload);
      const nameChanged = ev.name !== payload.name;
      await addLog(
        'Gestión de Eventos',
        nameChanged
          ? `Actualizó evento «${ev.name}» → «${payload.name}» (nombre y configuración de asistencias)`
          : `Actualizó configuración de asistencias del evento «${payload.name}»`,
        null,
        ev,
        { collectionName: 'app_events', docId: ev.id, action: 'update', previousData: ev }
      );
      showToast('Evento actualizado.');
      setRenameModal({ ...CLOSED_EDIT_EVENT_MODAL });
    } catch (e) {
      console.error(e);
      showToast('No se pudo guardar el evento. Revisa conexión y permisos.');
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };

  const handleDrop = (e, targetId) => {
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
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    e.preventDefault();
    if (draggedEventId === targetId || !draggedEventId) return;
    const draggedIdx = sortedEvents.findIndex(ev => ev.id === draggedEventId);
    const targetIdx = sortedEvents.findIndex(ev => ev.id === targetId);
    if (draggedIdx === -1 || targetIdx === -1) return;
    
    const newEventsOrder = [...sortedEvents];
    const [draggedItem] = newEventsOrder.splice(draggedIdx, 1);
    newEventsOrder.splice(targetIdx, 0, draggedItem);
    
    newEventsOrder.forEach((ev, index) => {
      if ((ev.order ?? -1) !== index) {
        const payload = { order: index };
        if (globalConfig?.isDebugMode) { payload._isDebug = true; payload._debugSessionId = globalConfig.debugSessionId; }
        updateDoc(getDocRef('app_events', ev.id), payload);
      }
    });
    setDraggedEventId(null);
  };

  const openPricingModal = () => {
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
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!currentEvent) return;
    const g = Number(currentEvent.globalCost) || 0;
    const legacySrv = Number(currentEvent.serverCost) || 0;
    const ambos =
      currentEvent.serverCostAmbos != null && currentEvent.serverCostAmbos !== ''
        ? Number(currentEvent.serverCostAmbos)
        : legacySrv;
    const teens =
      currentEvent.serverCostTeens != null && currentEvent.serverCostTeens !== ''
        ? Number(currentEvent.serverCostTeens)
        : g;
    const jovenes =
      currentEvent.serverCostJovenes != null && currentEvent.serverCostJovenes !== ''
        ? Number(currentEvent.serverCostJovenes)
        : g;
    const phases = (currentEvent.dynamicPrices || []).map((p) => ({
      id: p.id,
      dateUntil: p.dateUntil || '',
      globalCost: p.globalCost ?? 0,
    }));
    let serverPhases = (currentEvent.dynamicServerPrices || []).map((p) => ({
      id: p.id,
      dateUntil: p.dateUntil || '',
      serverCostTeens: p.serverCostTeens ?? '',
      serverCostJovenes: p.serverCostJovenes ?? '',
      serverCostAmbos: p.serverCostAmbos ?? p.serverCost ?? '',
    }));
    if (serverPhases.length === 0 && (currentEvent.dynamicPrices || []).some(tierHasServerPricesInCamperTier)) {
      serverPhases = (currentEvent.dynamicPrices || []).map((p) => ({
        id: p.id,
        dateUntil: p.dateUntil || '',
        serverCostTeens: p.serverCostTeens ?? '',
        serverCostJovenes: p.serverCostJovenes ?? '',
        serverCostAmbos: p.serverCostAmbos ?? p.serverCost ?? '',
      }));
    }
    const pt = currentEvent.pricingType || 'fixed';
    const hasIndepServerDyn = (currentEvent.dynamicServerPrices || []).length > 0;
    const serverHasPhaseRows = isCampa && serverPhases.length > 0;
    setPricingForm({
      camperPricingMode: pt === 'dynamic' ? 'dynamic' : 'fixed',
      serverPricingMode: isCampa && (hasIndepServerDyn || serverHasPhaseRows) ? 'dynamic' : 'fixed',
      globalCost: currentEvent.globalCost || 0,
      serverCostTeens: teens,
      serverCostJovenes: jovenes,
      serverCostAmbos: ambos,
      paymentDeadlineDate: currentEvent.paymentDeadlineDate || '',
      phases,
      serverPhases,
      campaigns: currentEvent.discountCampaigns || [],
    });
    setPricingModal({ isOpen: true });
  };

  const handleSavePricing = async () => {
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
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!currentEvent) return;
    const camperDyn = pricingForm.camperPricingMode === 'dynamic';
    const serverDyn = isCampa && pricingForm.serverPricingMode === 'dynamic';
    const eventEnd = getEventEffectiveEndDate(currentEvent);
    const payDeadlineForm = (pricingForm.paymentDeadlineDate || '').trim();
    const payDeadline = hasAdminRights ? payDeadlineForm : (String(currentEvent.paymentDeadlineDate || '').trim());
    if (payDeadline && eventEnd && compareIsoDates(payDeadline, eventEnd) > 0) {
      showToast('La fecha límite de pago no puede ser posterior al fin del evento (rango general).');
      return;
    }
    const phaseCap = getPhaseDateMaxCap(currentEvent, pricingForm) || eventEnd || '';
    if (camperDyn) {
      if (pricingForm.phases.length === 0) { showToast("Debes añadir al menos una fase de precio (campista)."); return; }
      for (const phase of pricingForm.phases) {
        if (!phase.dateUntil) { showToast("Todas las fases campista deben tener una fecha límite."); return; }
        if (phaseCap && compareIsoDates(phase.dateUntil, phaseCap) > 0) {
          showToast('Las fechas de fase campista no pueden superar la fecha límite de pago ni el fin del evento.');
          return;
        }
      }
      const dates = pricingForm.phases.map(p => p.dateUntil);
      if (dates.length !== new Set(dates).size) { showToast("No puede haber dos fases campista con la misma fecha límite."); return; }
    }
    if (serverDyn) {
      if (pricingForm.serverPhases.length === 0) {
        showToast('Modo servidor «por fechas»: añade al menos una fase de servidor o elige precio fijo.');
        return;
      }
      for (const phase of pricingForm.serverPhases) {
        if (!phase.dateUntil) { showToast('Cada fase de servidor debe tener fecha límite.'); return; }
        if (phaseCap && compareIsoDates(phase.dateUntil, phaseCap) > 0) {
          showToast('Las fechas de fase de servidor no pueden superar la fecha límite de pago ni el fin del evento.');
          return;
        }
      }
      const sdates = pricingForm.serverPhases.map((p) => p.dateUntil);
      if (sdates.length !== new Set(sdates).size) { showToast('No puede haber dos fases de servidor con la misma fecha límite.'); return; }
    }
    const sortedPhases = camperDyn ? [...pricingForm.phases].sort((a, b) => a.dateUntil.localeCompare(b.dateUntil)) : [];
    const sortedServerPhases =
      serverDyn
        ? [...pricingForm.serverPhases].sort((a, b) => a.dateUntil.localeCompare(b.dateUntil))
        : [];
    const ambosNum = Number(pricingForm.serverCostAmbos) || 0;
    const teensNum = Number(pricingForm.serverCostTeens) || 0;
    const jovNum = Number(pricingForm.serverCostJovenes) || 0;
    await updateEventConfig({
      pricingType: camperDyn ? 'dynamic' : 'fixed',
      globalCost: Number(pricingForm.globalCost) || 0,
      serverCost: ambosNum,
      serverCostAmbos: ambosNum,
      serverCostTeens: teensNum,
      serverCostJovenes: jovNum,
      paymentDeadlineDate: payDeadline,
      dynamicPrices: camperDyn
        ? sortedPhases.map((p) => ({
            id: p.id,
            dateUntil: p.dateUntil,
            globalCost: Number(p.globalCost) || 0,
          }))
        : [],
      dynamicServerPrices: serverDyn
        ? sortedServerPhases.map((p) => {
            const a = Number(p.serverCostAmbos) || 0;
            const t = Number(p.serverCostTeens) || 0;
            const j = Number(p.serverCostJovenes) || 0;
            return {
              id: p.id,
              dateUntil: p.dateUntil,
              serverCost: a,
              serverCostAmbos: a,
              serverCostTeens: t,
              serverCostJovenes: j,
            };
          })
        : [],
      discountCampaigns: (pricingForm.campaigns || []).map((c) => ({
        id: c.id,
        concept: String(c.concept || '').trim(),
        appliesTo: c.appliesTo || 'all',
        finalAmount: Number(c.finalAmount) || 0,
        startDate: c.startDate || '',
        endDate: c.endDate || '',
        enabled: c.enabled !== false
      })).filter((c) => c.concept && c.finalAmount > 0)
    });
    setPricingModal({ isOpen: false });
    if (hasAdminRights) {
      const prevDl = (currentEvent.paymentDeadlineDate || '').trim();
      if (prevDl !== payDeadline) {
        addLog(
          'Configuración',
          `Fecha límite de pago (recordatorios WhatsApp): ${prevDl || 'sin definir'} → ${payDeadline || 'sin definir'}.`,
          null,
          { id: 'Global', name: 'Sistema' },
          { collectionName: 'app_events', docId: currentEvent.id, action: 'update', previousData: currentEvent }
        );
      }
    }
    addLog('Configuración', `Actualizó precios: campista ${pricingForm.camperPricingMode}, servidor ${isCampa ? pricingForm.serverPricingMode : 'n/a'}.`, null, null, { collectionName: 'app_events', docId: currentEvent.id, action: 'update', previousData: currentEvent });
    showToast('Precios actualizados correctamente.');
  };

  const openCashCutScheduleModal = () => {
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
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    const scheduleLocs = (currentEvent?.locations || []).filter((l) => visibleLocations.includes(l));
    if (!scheduleLocs.length) {
      showToast('Este evento no tiene sedes configuradas.');
      return;
    }
    const gs = globalConfig?.serviceSlots || DEFAULT_SERVICE_SLOTS;
    const form = {};
    for (const loc of scheduleLocs) {
      form[loc] = {
        ...getCashCutScheduleForLocation(currentEvent, loc, gs, globalConfig?.cashCutScheduleByLocation),
      };
    }
    setCashCutScheduleForm(form);
    setCashCutScheduleModal({ isOpen: true });
  };

  const toggleCashCutServiceForLoc = (loc, svc) => {
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
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    const gs = globalConfig?.serviceSlots || DEFAULT_SERVICE_SLOTS;
    setCashCutScheduleForm((prev) => {
      const cur = { ...(prev[loc] || {}) };
      if (cur[svc]) {
        if (Object.keys(cur).length <= 1) return prev;
        delete cur[svc];
      } else {
        cur[svc] = {
          start: gs[svc]?.start || DEFAULT_SERVICE_SLOTS[svc].start,
          end: gs[svc]?.end || DEFAULT_SERVICE_SLOTS[svc].end,
        };
      }
      return { ...prev, [loc]: cur };
    });
  };

  const setCashCutSlotTimeForLoc = (loc, svc, field, value) => {
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
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    setCashCutScheduleForm((prev) => {
      const cur = { ...(prev[loc] || {}) };
      if (!cur[svc]) return prev;
      cur[svc] = { ...cur[svc], [field]: value };
      return { ...prev, [loc]: cur };
    });
  };

  const handleSaveCashCutScheduleByLocation = async () => {
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
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!currentEvent || !hasAdminRights) return;
    const gs = globalConfig?.serviceSlots || DEFAULT_SERVICE_SLOTS;
    const payload = {};
    const locsToSave = Object.keys(cashCutScheduleForm || {});
    for (const loc of locsToSave) {
      const sched = cashCutScheduleForm[loc];
      if (!sched || Object.keys(sched).length === 0) {
        showToast(`La sede «${loc}» debe tener al menos un horario de servicio activo.`);
        return;
      }
      const cleaned = {};
      for (const s of SERVICE_OPTIONS) {
        if (!sched[s]) continue;
        const start = String(sched[s]?.start || gs[s]?.start || DEFAULT_SERVICE_SLOTS[s].start);
        const end = String(sched[s]?.end || gs[s]?.end || DEFAULT_SERVICE_SLOTS[s].end);
        if (!start || !end) {
          showToast(`Completa inicio y fin para «${s}» en la sede «${loc}».`);
          return;
        }
        cleaned[s] = { start, end };
      }
      if (Object.keys(cleaned).length === 0) {
        showToast(`La sede «${loc}» debe tener al menos un horario de servicio activo.`);
        return;
      }
      payload[loc] = cleaned;
    }
    const prevGlobal =
      globalConfig?.cashCutScheduleByLocation && typeof globalConfig.cashCutScheduleByLocation === 'object'
        ? { ...globalConfig.cashCutScheduleByLocation }
        : {};
    for (const loc of locsToSave) {
      if (payload[loc]) prevGlobal[loc] = payload[loc];
    }
    const configPatch = { cashCutScheduleByLocation: prevGlobal };
    if (globalConfig?.isDebugMode) {
      configPatch._isDebug = true;
      configPatch._debugSessionId = globalConfig.debugSessionId;
    }
    await updateDoc(getDocRef('app_data', 'config'), configPatch);
    addLog(
      'Configuración',
      'Actualizó servicios y horarios de corte de caja por sede (todos los eventos).',
      currentUser?.username || null,
      { id: 'Global', name: 'Sistema' },
      { collectionName: 'app_data', docId: 'config', action: 'update', previousData: globalConfig }
    );
    setCashCutScheduleModal({ isOpen: false });
    showToast('Horarios por sede guardados (aplican a todos los eventos).');
  };

  const handleSaveServeAreaOptions = async () => {
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
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!hasAdminRights) return;
    const opts = serveAreaOptionsForm.filter(Boolean).map(s => s.trim());
    if (opts.length === 0) { showToast('Debe haber al menos una opción.'); return; }
    if (!opts.includes('Otro')) { showToast('Debe incluir la opción "Otro".'); return; }
    await updateDoc(getDocRef('app_data', 'config'), { serveAreaOptions: opts });
    const serveDetail =
      describeStringListConfigChange(globalConfig?.serveAreaOptions, opts, 'Opciones de área para servir') ||
      'Opciones de área para servir (sin cambios detectados en lista).';
    addLog('Configuración', serveDetail, null, { id: 'Global', name: 'Sistema' });
    setServeAreaOptionsModal({ isOpen: false });
    showToast('Opciones de área actualizadas.');
  };

  const handleSaveAllergyOptions = async () => {
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
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!hasAdminRights) return;
    const opts = allergyOptionsForm.filter(Boolean).map((s) => s.trim()).filter(Boolean);
    if (opts.length === 0) { showToast('Debe haber al menos una categoría de alergia.'); return; }
    await updateDoc(getDocRef('app_data', 'config'), { allergyOptions: opts });
    const allergyDetail =
      describeStringListConfigChange(globalConfig?.allergyOptions, opts, 'Categorías de alergias') ||
      'Categorías de alergias (sin cambios detectados en lista).';
    addLog('Configuración', allergyDetail, null, { id: 'Global', name: 'Sistema' });
    setAllergyOptionsModal({ isOpen: false });
    showToast('Categorías de alergias actualizadas.');
  };

  const handleAddDonation = async () => {
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
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!hasAdminRights || !currentEvent) return;
    const amount = parseFloat(donationModal.amount);
    if (!Number.isFinite(amount) || amount <= 0) { showToast('Ingresa una cantidad válida.'); return; }
    const locs = Array.isArray(currentEvent.locations) ? currentEvent.locations : [];
    const locTrim = String(donationModal.location || '').trim();
    if (locs.length > 0) {
      const allowed = new Set(locs.map((l) => String(l).trim()));
      if (!locTrim || !allowed.has(locTrim)) {
        showToast('Selecciona la sede desde la que se registra la donación.');
        return;
      }
    }
    const donationId = buildFirestoreDocId(['don', Date.now()], { fallback: `don-${Date.now()}` });
    const payload = {
      eventId: currentEvent.id,
      amount,
      donorName: (donationModal.donorName || '').trim(),
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.username || 'Desconocido',
      ...(locTrim ? { location: locTrim } : {}),
    };
    await setDoc(getDocRef('app_donations', donationId), payload);
    syncDonationAfterWrite(setDonations, donationId, { id: donationId, ...payload });
    addLog(
      'Donación',
      `Nueva donación de $${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${payload.donorName ? ` (Donador: ${payload.donorName})` : ''}${locTrim ? ` · sede ${locTrim}` : ''}`,
      null,
      null,
      { collectionName: 'app_donations', docId: donationId, action: 'create', previousData: null },
      { entityType: 'donation', entityId: donationId, status: LOG_STATUS.OK, snapshot: { kind: 'donacion_nueva', donation: { id: donationId, ...payload } } }
    );
    setDonationModal({ isOpen: false, amount: '', donorName: '', location: '' });
    showToast('Donación registrada correctamente.');
  };

  const handleUpdateDonationSuper = async ({ id, amount: amountStr, location }) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, all, allKnownLocationNames, allParticipants } = getScope();
    const { anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, b, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, darkMode, dashboardHasFullLocationAccess, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, entry, evType, event, eventDateDraft } = getScope();
    const { eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostSourceKey, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, labelClasses, legacy, limit, linkWithCredential, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, local, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, mergedPrivacyNotice } = getScope();
    const { na, needsFirestoreResyncAfterBulk, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, pathname, performAppFullBackup } = getScope();
    const { privacyNoticePublicUrl, pruneEventScopedAccessMap, query, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView } = getScope();
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!isSuperUser || !hasAdminRights || !currentEvent?.id) return false;
    const donationId = String(id || '').trim();
    if (!donationId) return false;
    const donation = donations.find((d) => String(d.id) === donationId);
    if (!donation || donation.eventId !== currentEvent.id) {
      showToast('No se encontró la donación.');
      return false;
    }
    if (
      donation.fromCancelledRefundDonation ||
      donation.fromArchivedManualCredit ||
      donation._syntheticArchivedCredit ||
      donation._syntheticCancelledRefund
    ) {
      showToast('Este tipo de donación no se puede corregir desde aquí.');
      return false;
    }
    const amount = parseFloat(String(amountStr).replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast('Ingresa una cantidad válida.');
      return false;
    }
    const locs = Array.isArray(currentEvent.locations) ? currentEvent.locations : [];
    const locTrim = String(location || '').trim();
    if (locs.length > 0) {
      const allowed = new Set(locs.map((l) => String(l).trim()));
      if (!locTrim || !allowed.has(locTrim)) {
        showToast('Selecciona una sede válida.');
        return false;
      }
    }
    const prevAmount = parseFloat(donation.amount) || 0;
    const prevLoc = String(donation.location || '').trim();
    const updates = {
      amount,
      ...(locTrim ? { location: locTrim } : { location: deleteField() }),
    };
    try {
      await updateDoc(getDocRef('app_donations', donationId), updates);
      syncDonationAfterWrite(setDonations, donationId, { ...donation, ...updates, id: donationId });
    } catch (e) {
      console.error(e);
      showToast('No se pudo guardar la donación.');
      return false;
    }
    addLog(
      'Donación',
      `SuperUsuario: corrigió donación · antes $${prevAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}${prevLoc ? ` · sede ${prevLoc}` : ''} → $${amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}${locTrim ? ` · sede ${locTrim}` : ''} (id ${donationId})`,
      null,
      null,
      { collectionName: 'app_donations', docId: donationId, action: 'update', previousData: donation }
    );
    showToast('Donación actualizada.');
    return true;
  };

  const handleDeleteDonation = async (donationId) => {
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
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!hasAdminRights) return;
    const donation = donations.find(d => d.id === donationId);
    if (!donation) return;
    const amt = parseFloat(donation.amount) || 0;
    const isRefundBaja = !!donation.fromCancelledRefundDonation;
    const isArchivedManualCredit = !!donation.fromArchivedManualCredit;
    await deleteDoc(getDocRef('app_donations', donationId));
    syncDonationAfterWrite(setDonations, donationId, null, { remove: true });
    await addLog(
      'Donación',
      isRefundBaja
        ? `Eliminó donación por saldo de baja de $${amt.toLocaleString('es-MX', { minimumFractionDigits: 2 })}${donation.donorName ? ` (${donation.donorName})` : ''}${donation.location ? ` · sede ${donation.location}` : ''}${donation.sourceParticipantId ? ` · participante ${donation.sourceParticipantId}` : ''}.`
        : isArchivedManualCredit
          ? `Eliminó donación por saldo a favor de archivo de $${amt.toLocaleString('es-MX', { minimumFractionDigits: 2 })}${donation.donorName ? ` (${donation.donorName})` : ''}${donation.location ? ` · sede ${donation.location}` : ''}${donation.sourceParticipantId ? ` · participante ${donation.sourceParticipantId}` : ''}.`
          : `Eliminó donación de $${amt.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${donation.donorName ? ` (Donador: ${donation.donorName})` : ''}`,
      null,
      null,
      { collectionName: 'app_donations', docId: donationId, action: 'delete', previousData: donation },
      { entityType: 'donation', entityId: donationId, status: LOG_STATUS.OK, snapshot: { kind: 'donacion_eliminada', donation } }
    );
    showToast('Donación eliminada.');
  };

  const handleAddExpense = async () => {
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
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!canAccessExpenses) return;
    const name = expenseForm.name.trim();
    const qty = parseInt(expenseForm.quantity) || 0;
    const price = parseFloat(expenseForm.unitPrice) || 0;
    if (!name || qty <= 0 || price <= 0) { showToast('Completa nombre, cantidad y precio.'); return; }
    const expId = buildFirestoreDocId(['exp', Date.now()], { fallback: `exp-${Date.now()}` });
    const expenseRow = {
      id: expId,
      eventId: currentEvent?.id || '',
      name,
      quantity: qty,
      unitPrice: price,
      totalPrice: qty * price,
      paid: false,
      paidAmount: 0,
      countInTotals: true,
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.username || 'Desconocido',
      createdByUserId: currentUser?.id != null ? String(currentUser.id) : '',
    };
    await setDoc(getDocRef('app_expenses', expId), expenseRow);
    syncExpenseAfterWrite(setExpenses, expId, expenseRow);
    const total = qty * price;
    const fmt = (n) => Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    addLog(
      'Gastos',
      isHideMyExpenseConceptsOn(currentUser)
        ? EXPENSE_ACTIVITY_GENERIC
        : `Agregó gasto «${name}» (${qty} × $${fmt(price)} = $${fmt(total)}). id: ${expId}.`,
      null,
      null,
      { collectionName: 'app_expenses', docId: expId, action: 'create', previousData: null },
      { entityType: 'expense', entityId: expId, status: LOG_STATUS.OK, snapshot: { kind: 'gasto_nuevo', expense: expenseRow } }
    );
    setExpenseForm({ name: '', quantity: 1, unitPrice: '' });
    showToast('Gasto agregado.');
  };

  const handleAddCampaRealCostBreakdownLine = async () => {
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
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!canAccessExpenses || !currentEvent?.id) return;
    if (String(currentEvent?.eventType || '').trim() !== 'Campa') return;
    const concept = campaRealCostBreakdownForm.concept.trim();
    const qty = parseFloat(String(campaRealCostBreakdownForm.quantity).replace(',', '.')) || 0;
    const unit = parseFloat(String(campaRealCostBreakdownForm.unitCost).replace(',', '.')) || 0;
    if (!concept || qty <= 0 || unit < 0) {
      showToast('Indica concepto, cantidad (>0) y costo unitario (≥0).');
      return;
    }
    const prev = Array.isArray(currentEvent.campaRealCostBreakdownItems)
      ? [...currentEvent.campaRealCostBreakdownItems]
      : [];
    const id = buildFirestoreDocId(['crc', Date.now(), Math.random().toString(36).slice(2, 9)], {
      fallback: `crc-${Date.now()}`,
    });
    prev.push({ id, concept, quantity: qty, unitCost: unit });
    try {
      await updateEventConfig({ campaRealCostBreakdownItems: prev });
      addLog(
        'Configuración',
        describeCampaBreakdownLineAdded(concept, qty, unit, prev.length),
        null,
        currentEvent,
        { collectionName: 'app_events', docId: currentEvent.id, action: 'update', previousData: currentEvent }
      );
      setCampaRealCostBreakdownForm({ concept: '', quantity: '1', unitCost: '' });
      showToast('Concepto agregado al costo real.');
    } catch (e) {
      console.error(e);
      showToast('No se pudo guardar.');
    }
  };

  const handleDeleteCampaRealCostBreakdownLine = async (lineId) => {
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
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!canAccessExpenses || !currentEvent?.id) return;
    const removed = (Array.isArray(currentEvent.campaRealCostBreakdownItems)
      ? currentEvent.campaRealCostBreakdownItems
      : []
    ).find((x) => String(x.id) === String(lineId));
    const prev = Array.isArray(currentEvent.campaRealCostBreakdownItems)
      ? currentEvent.campaRealCostBreakdownItems.filter((x) => String(x.id) !== String(lineId))
      : [];
    try {
      await updateEventConfig({ campaRealCostBreakdownItems: prev });
      addLog(
        'Configuración',
        describeCampaBreakdownLineRemoved(removed?.concept || lineId, prev.length),
        null,
        currentEvent,
        { collectionName: 'app_events', docId: currentEvent.id, action: 'update', previousData: currentEvent }
      );
      showToast('Concepto eliminado.');
    } catch (e) {
      console.error(e);
      showToast('No se pudo eliminar.');
    }
  };

  const handleSaveCampaRealCostManualDivisor = async () => {
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
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!canAccessExpenses || !currentEvent?.id) return;
    const raw = String(campaRealCostManualDivisorStr || '').trim();
    const prevDiv = currentEvent?.campaRealCostManualDivisor;
    try {
      if (raw === '') {
        await updateEventConfig({ campaRealCostManualDivisor: deleteField() });
        addLog(
          'Configuración',
          describeCampaManualDivisorChange(prevDiv, ''),
          null,
          currentEvent,
          { collectionName: 'app_events', docId: currentEvent.id, action: 'update', previousData: currentEvent }
        );
      } else {
        const n = parseFloat(raw.replace(',', '.'));
        if (!Number.isFinite(n) || n <= 0) {
          showToast('Indica un número mayor que cero o deja vacío.');
          return;
        }
        await updateEventConfig({ campaRealCostManualDivisor: n });
        addLog(
          'Configuración',
          describeCampaManualDivisorChange(prevDiv, n),
          null,
          currentEvent,
          { collectionName: 'app_events', docId: currentEvent.id, action: 'update', previousData: currentEvent }
        );
      }
      showToast('Divisor guardado.');
    } catch (e) {
      console.error(e);
      showToast('No se pudo guardar el divisor.');
    }
  };

  const handleSaveScholarshipRealCostBase = async () => {
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
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!hasAdminRights || !currentEvent?.id || currentEvent?.eventType !== 'Campa') return;
    const raw = String(scholarshipRealCostDraft || '').trim();
    try {
      if (raw === '') {
        await updateEventConfig({ scholarshipRealCostBase: deleteField() });
        showToast('Costo real base de becas reiniciado al costo real del dashboard.');
        return;
      }
      const n = parseFloat(raw.replace(',', '.'));
      if (!Number.isFinite(n) || n < 0) {
        showToast('Indica un número válido mayor o igual a cero.');
        return;
      }
      await updateEventConfig({ scholarshipRealCostBase: n });
      showToast('Costo real base de becas guardado.');
    } catch (e) {
      console.error(e);
      showToast('No se pudo guardar el costo real base de becas.');
    }
  };

  const handleRepairBautizosSplitCompanionLinks = useCallback(
    async () => false,
    []
  );
  const handleSaveBaptismShirtSize = useCallback(
    async (personId, rawSize) => {
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
      const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
      if (!currentUser || !currentEvent?.id) return;
      if (currentUser.role === 'Lector') {
        showToast('No tienes permiso para editar tallas.');
        return;
      }
      if (!hasEventAccess(currentEvent.id)) {
        showToast('No tienes acceso a este evento.');
        return;
      }
      const id = String(personId);
      const p = allParticipants.find((x) => String(x.id) === id);
      if (!p || String(p.eventId) !== String(currentEvent.id)) return;
      if (!participantHasBaptismChip(p, currentEvent.eventType)) {
        showToast('Solo aplica a inscritos con bautizo marcado.');
        return;
      }
      const loc = String(p.location || '').trim() || (currentEvent.locations || [])[0] || '';
      if (!hasLocationAccess(loc, currentEvent.id)) {
        showToast('No tienes acceso a la sede de este registro.');
        return;
      }
      const norm = normalizeBaptismShirtSize(rawSize);
      try {
        await updateDoc(getDocRef('app_participants', id), { baptismShirtSize: norm });
        refreshParticipantCache(p, 'Talla playera bautizo', {
          personId: id,
          patch: { baptismShirtSize: norm },
        });
        const _shirtLog = `Talla playera ${norm || '—'} — ${(p.name || '').trim() || id}.`;
        addLog(
          'Bautizados',
          _shirtLog,
          null,
          null,
          {
            collectionName: 'app_participants',
            docId: id,
            action: 'update',
            previousData: { baptismShirtSize: p.baptismShirtSize },
          }
        );
        logParticipantActivity(id, 'datos', _shirtLog);
      } catch (e) {
        console.error(e);
        showToast('No se pudo guardar la talla.');
      }
    },
    [
      addLog,
      logParticipantActivity,
      allParticipants,
      currentEvent,
      currentUser,
      getDocRef,
      hasEventAccess,
      hasLocationAccess,
      showToast,
      updateDoc,
    ]
  );

  const handleDeleteExpense = async (expenseId) => {
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
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!canAccessExpenses) return;
    const exp = getExpenseForActions(expenseId);
    if (!exp || !canMutateExpenseRecord(exp)) return;
    try {
      const inFs = expenses.some((e) => e.id === expenseId);
      if (inFs) {
        await deleteDoc(getDocRef('app_expenses', expenseId));
        syncExpenseAfterWrite(setExpenses, expenseId, null, { remove: true });
      } else if (currentEvent?.id && isDerivedAutoExpenseIdForEvent(expenseId, currentEvent.id)) {
        await updateDoc(getDocRef('app_events', currentEvent.id), {
          expenseListSuppressedIds: arrayUnion(expenseId),
          ...(globalConfig?.isDebugMode ? { _isDebug: true, _debugSessionId: globalConfig.debugSessionId } : {}),
        });
      } else {
        return;
      }
      const fmt = (n) => Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const en = String(exp.name || '').trim() || '—';
      const tot = parseFloat(exp.totalPrice) || 0;
      addLog(
        'Gastos',
        isHideMyExpenseConceptsOn(currentUser)
          ? EXPENSE_ACTIVITY_GENERIC
          : `Eliminó gasto «${en}» (id ${expenseId}, total $${fmt(tot)}).`,
        null,
        null,
        { collectionName: 'app_expenses', docId: expenseId, action: 'delete', previousData: exp },
        { entityType: 'expense', entityId: expenseId, status: LOG_STATUS.OK, snapshot: { kind: 'gasto_eliminado', expense: exp } }
      );
      showToast('Gasto eliminado.');
    } catch (e) {
      console.error(e);
      showToast('No se pudo eliminar el gasto.');
    }
  };

  const handleToggleExpensePaid = async (expenseId) => {
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
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!canAccessExpenses) return;
    const exp = getExpenseForActions(expenseId);
    if (!exp || !canMutateExpenseRecord(exp)) return;
    const newPaid = !exp.paid;
    const patch = {
      paid: newPaid,
      paidAmount: newPaid ? exp.totalPrice : 0,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.username || 'Desconocido',
    };
    try {
      if (expenses.some((e) => e.id === expenseId)) {
        await updateDoc(getDocRef('app_expenses', expenseId), patch);
      } else {
        await setDoc(getDocRef('app_expenses', expenseId), omitUndefinedDeep({ ...exp, ...patch }));
      }
      syncExpenseAfterWrite(setExpenses, expenseId, { ...exp, ...patch, id: expenseId });
      const en = String(exp.name || '').trim() || '—';
      addLog(
        'Gastos',
        isHideMyExpenseConceptsOn(currentUser)
          ? EXPENSE_ACTIVITY_GENERIC
          : `«${en}» (id ${expenseId}): pago ${exp.paid ? 'Sí' : 'No'} → ${newPaid ? 'Sí' : 'No'} (monto $${Number(exp.totalPrice || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}).`
      );
    } catch (e) {
      console.error(e);
      showToast('No se pudo actualizar el gasto.');
    }
  };

  const handleToggleExpenseCountInTotals = async (expenseId) => {
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
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!canAccessExpenses) return;
    const exp = getExpenseForActions(expenseId);
    if (!exp || !canMutateExpenseRecord(exp)) return;
    const newCountInTotals = !(exp.countInTotals ?? true);
    const patch = {
      countInTotals: newCountInTotals,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.username || 'Desconocido',
    };
    try {
      if (expenses.some((e) => e.id === expenseId)) {
        await updateDoc(getDocRef('app_expenses', expenseId), patch);
      } else {
        await setDoc(getDocRef('app_expenses', expenseId), omitUndefinedDeep({ ...exp, ...patch }));
      }
      syncExpenseAfterWrite(setExpenses, expenseId, { ...exp, ...patch, id: expenseId });
      const en = String(exp.name || '').trim() || '—';
      const wasOn = exp.countInTotals !== false;
      addLog(
        'Gastos',
        isHideMyExpenseConceptsOn(currentUser)
          ? EXPENSE_ACTIVITY_GENERIC
          : `«${en}» (id ${expenseId}): contar en totales ${wasOn ? 'sí' : 'no'} → ${newCountInTotals ? 'sí' : 'no'}.`
      );
    } catch (e) {
      console.error(e);
      showToast('No se pudo actualizar el gasto.');
    }
  };

  const handleExpensePartialPayment = async () => {
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
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!canAccessExpenses || !expensePartialModal.expenseId) return;
    const amount = parseFloat(expensePartialModal.amount) || 0;
    if (amount <= 0) { showToast('Ingresa una cantidad válida.'); return; }
    const exp = getExpenseForActions(expensePartialModal.expenseId);
    if (!exp || !canMutateExpenseRecord(exp)) return;
    const newPaidAmount = Math.min((exp.paidAmount || 0) + amount, exp.totalPrice);
    const patch = {
      paidAmount: newPaidAmount,
      paid: newPaidAmount >= exp.totalPrice,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.username || 'Desconocido',
    };
    try {
      const eid = expensePartialModal.expenseId;
      if (expenses.some((e) => e.id === eid)) {
        await updateDoc(getDocRef('app_expenses', eid), patch);
      } else {
        await setDoc(getDocRef('app_expenses', eid), omitUndefinedDeep({ ...exp, ...patch }));
      }
      syncExpenseAfterWrite(setExpenses, eid, { ...exp, ...patch, id: eid });
      const fmt = (n) => Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const prevAmt = exp.paidAmount || 0;
      const en = String(exp.name || '').trim() || '—';
      const total = exp.totalPrice || 0;
      addLog(
        'Gastos',
        isHideMyExpenseConceptsOn(currentUser)
          ? EXPENSE_ACTIVITY_GENERIC
          : `Abono de $${fmt(amount)} a «${en}» (id ${eid}). Pagado: $${fmt(prevAmt)} → $${fmt(newPaidAmount)} de $${fmt(total)}.`,
        null,
        null,
        { collectionName: 'app_expenses', docId: eid, action: 'update', previousData: exp },
        { entityType: 'expense', entityId: eid, status: LOG_STATUS.OK, snapshot: { kind: 'gasto_abono', amount, expense: { ...exp, ...patch, id: eid }, previousExpense: exp } }
      );
      setExpensePartialModal({ isOpen: false, expenseId: null, amount: '' });
      showToast('Abono registrado.');
    } catch (e) {
      console.error(e);
      showToast('No se pudo registrar el abono.');
    }
  };

  const handleEditExpense = async () => {
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
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!canAccessExpenses || !expenseEditModal.id) return;
    const name = expenseEditModal.name.trim();
    const qty = parseInt(expenseEditModal.quantity) || 0;
    const price = parseFloat(expenseEditModal.unitPrice) || 0;
    if (!name || qty <= 0 || price <= 0) { showToast('Completa nombre, cantidad y precio.'); return; }
    const exp = getExpenseForActions(expenseEditModal.id);
    if (!exp || !canMutateExpenseRecord(exp)) return;
    const newTotal = qty * price;
    const newPaidAmount = Math.min(exp.paidAmount || 0, newTotal);
    const patch = {
      name,
      quantity: qty,
      unitPrice: price,
      totalPrice: newTotal,
      paidAmount: newPaidAmount,
      paid: newPaidAmount >= newTotal,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.username || 'Desconocido',
    };
    try {
      const eid = expenseEditModal.id;
      if (expenses.some((e) => e.id === eid)) {
        await updateDoc(getDocRef('app_expenses', eid), patch);
      } else {
        await setDoc(getDocRef('app_expenses', eid), omitUndefinedDeep({ ...exp, ...patch }));
      }
      syncExpenseAfterWrite(setExpenses, eid, { ...exp, ...patch, id: eid });
      const fmt = (n) => Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const oName = String(exp.name || '').trim();
      const oQty = parseInt(exp.quantity, 10) || 0;
      const oPrice = parseFloat(exp.unitPrice) || 0;
      const oTotal = parseFloat(exp.totalPrice) || 0;
      const parts = [];
      if (oName !== name) parts.push(`nombre «${oName || '—'}» → «${name}»`);
      if (oQty !== qty) parts.push(`cant. ${oQty} → ${qty}`);
      if (Math.abs(oPrice - price) > 0.0001) parts.push(`precio unit. $${fmt(oPrice)} → $${fmt(price)}`);
      if (Math.abs(oTotal - newTotal) > 0.005) parts.push(`total $${fmt(oTotal)} → $${fmt(newTotal)}`);
      addLog(
        'Gastos',
        isHideMyExpenseConceptsOn(currentUser)
          ? EXPENSE_ACTIVITY_GENERIC
          : `Editó id ${eid}: ${parts.length ? parts.join('; ') : 'guardado'}.`,
        null,
        null,
        { collectionName: 'app_expenses', docId: eid, action: 'update', previousData: exp },
        { entityType: 'expense', entityId: eid, status: LOG_STATUS.OK, snapshot: { kind: 'gasto_editado', expense: { ...exp, ...patch, id: eid }, previousExpense: exp } }
      );
      setExpenseEditModal({ isOpen: false, id: null, name: '', quantity: 1, unitPrice: '' });
      showToast('Gasto actualizado.');
    } catch (e) {
      console.error(e);
      showToast('No se pudo actualizar el gasto.');
    }
  };

  const handleAddUser = async (e) => {
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
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    e.preventDefault();
    if (!hasAdminRights) { showToast("Permisos insuficientes."); return; }
    if (!newUser.username.trim() || !newUser.password.trim()) return;
    if (users.some(u => u.username === newUser.username)) { showToast("El usuario ya existe."); return; }
    
    if (newUser.role === 'SuperUsuario' && users.some(u => u.role === 'SuperUsuario')) {
      showToast("Solo puede haber un SuperUsuario en el sistema.");
      return;
    }

    const newId = String(Date.now());
    const editorCanEditAccessFlags = isSuperUser;
    const latestEventId = sortedEvents.length ? sortedEvents[sortedEvents.length - 1].id : '';
    const latestEventObj = latestEventId ? sortedEvents.find((ev) => String(ev.id) === String(latestEventId)) : null;
    const latestLocation = latestEventObj?.locations?.length
      ? latestEventObj.locations[latestEventObj.locations.length - 1]
      : (allKnownLocationNames.length ? allKnownLocationNames[allKnownLocationNames.length - 1] : '');
    let allowedEventIds = newUser.role === 'SuperUsuario'
      ? []
      : (editorCanEditAccessFlags ? (newUser.allowedEventIds || []) : []);
    let allowedLocationsByEvent = newUser.role === 'SuperUsuario'
      ? {}
      : (editorCanEditAccessFlags ? (newUser.allowedLocationsByEvent || {}) : {});
    let allowedPanelSectionsByEvent = newUser.role === 'SuperUsuario'
      ? {}
      : (editorCanEditAccessFlags ? (newUser.allowedPanelSectionsByEvent || {}) : {});
    let allowedPanelSections = newUser.role === 'SuperUsuario'
      ? { ...DEFAULT_PANEL_NAV }
      : (editorCanEditAccessFlags ? { ...DEFAULT_PANEL_NAV, ...(newUser.allowedPanelSections || {}) } : { ...DEFAULT_PANEL_NAV });
    if (newUser.role === 'Administrador') {
      allowedEventIds = [];
      allowedLocationsByEvent = {};
      allowedPanelSectionsByEvent = {};
      allowedPanelSections = { ...DEFAULT_PANEL_NAV, expenseList: false };
    } else if (newUser.role === 'Editor' || newUser.role === 'Lector') {
      /** Solo Administrador (sin SuperUsuario) usa un evento/sede por defecto; el SuperUsuario ya definió accesos arriba. */
      if (!editorCanEditAccessFlags) {
        allowedEventIds = latestEventId ? [latestEventId] : [];
        allowedLocationsByEvent = latestEventId && latestLocation ? { [latestEventId]: [latestLocation] } : {};
        allowedPanelSectionsByEvent = latestEventId ? { [latestEventId]: { ...EDITOR_LECTOR_PANEL_DEFAULT } } : {};
        allowedPanelSections = { ...EDITOR_LECTOR_PANEL_DEFAULT };
      }
    }
    allowedLocationsByEvent = pruneEventScopedAccessMap(allowedLocationsByEvent, allowedEventIds);
    allowedPanelSectionsByEvent = pruneEventScopedAccessMap(allowedPanelSectionsByEvent, allowedEventIds);
    const allowedLocations = getFlattenedAllowedLocationsFromEventMap(allowedLocationsByEvent, allowedEventIds);
    const preferredLandingTab = resolvePreferredLandingTab({
      role: newUser.role,
      preferredLandingTab: editorCanEditAccessFlags
        ? (newUser.preferredLandingTab || (newUser.role === 'Administrador' ? 'Norte' : 'Summary'))
        : (newUser.role === 'Administrador' ? 'Norte' : 'Summary'),
      allowedLocations,
      restrictedLocation: allowedLocations[0] || ''
    }, { locations: allKnownLocationNames });
    /** Login usa Firebase Authentication (correo/contraseña), no credenciales solo en Firestore. */
    const loginEmailRaw = String(newUser.loginEmail || '').trim();
    let authEmail;
    if (loginEmailRaw) {
      authEmail = normalizeAuthEmail(loginEmailRaw);
      if (!authEmail.includes('@')) {
        showToast('El correo de acceso debe incluir @.');
        return;
      }
    } else {
      authEmail = usernameToAuthEmail(newUser.username.trim());
    }
    const existingAuth = users.some(
      (u) =>
        normalizeAuthEmail(u.authEmail || usernameToAuthEmail(u.username)) === authEmail
    );
    if (existingAuth) {
      showToast('Ese correo de acceso ya está asignado a otro usuario.');
      return;
    }
    let cred;
    try {
      cred = await createUserWithEmailAndPassword(secondaryAuth, authEmail, newUser.password.trim());
    } catch (err) {
      console.error(err);
      showToast(
        err?.code === 'auth/email-already-in-use'
          ? 'Ese nombre de usuario ya tiene cuenta de acceso.'
          : 'No se pudo crear la cuenta de acceso.'
      );
      return;
    }

    const { password: _omitPwd, maxConcurrentSessions: _mcs, loginEmail: _omitLogin, ...newUserFields } = newUser;
    const userToSave = {
      ...newUserFields, authUid: cred.user.uid, /** Copia de la contraseña para que el SuperUsuario pueda consultarla (Firebase no expone contraseñas). Solo usar en entornos de confianza. */
      plainPasswordBackup: newUser.password.trim(), canViewFinances:
        newUser.role === 'SuperUsuario' || newUser.role === 'Administrador'
          ? true
          : editorCanEditAccessFlags
            ? !!newUser.canViewFinances
            : false, canViewHiddenDonations: newUser.role === 'SuperUsuario' ? true : (editorCanEditAccessFlags ? !!newUser.canViewHiddenDonations : false), canViewExpenses: editorCanEditAccessFlags ? !!newUser.canViewExpenses : false, restrictedEventId: allowedEventIds[0] || '', restrictedLocation: allowedLocations[0] || '', hideMyExpenseConcepts: editorCanEditAccessFlags ? (newUser.hideMyExpenseConcepts !== false) : true, canEditRegistryDates: editorCanEditAccessFlags ? !!newUser.canEditRegistryDates : false, canMarkPersonsOfInterest:
        newUser.role === 'Administrador' && editorCanEditAccessFlags ? !!newUser.canMarkPersonsOfInterest : false, canSendWhatsAppQuickAction: (() => {
        if (newUser.role === 'SuperUsuario') return true;
        if (newUser.role === 'Administrador') {
          return editorCanEditAccessFlags ? newUser.canSendWhatsAppQuickAction !== false : true;
        }
        return editorCanEditAccessFlags ? !!newUser.canSendWhatsAppQuickAction : false;
      })(), canMarkResponsivaLocalQuickAction: (() => {
        if (newUser.role === 'SuperUsuario') return true;
        if (newUser.role === 'Administrador') {
          return editorCanEditAccessFlags ? newUser.canMarkResponsivaLocalQuickAction !== false : true;
        }
        return editorCanEditAccessFlags ? newUser.canMarkResponsivaLocalQuickAction !== false : true;
      })(), canSendResponsivaDigitalQuickAction: (() => {
        if (newUser.role === 'SuperUsuario') return true;
        if (newUser.role === 'Administrador') {
          return editorCanEditAccessFlags ? newUser.canSendResponsivaDigitalQuickAction !== false : true;
        }
        return editorCanEditAccessFlags ? !!newUser.canSendResponsivaDigitalQuickAction : false;
      })(), canCancelRegistrations:
        newUser.role === 'Editor' && canDelegateCancelRegistrations(currentUser)
          ? !!newUser.canCancelRegistrations
          : false, ...(newUser.role === 'Administrador'
        ? {
            maxConcurrentSessions: editorCanEditAccessFlags
              ? clampAdminMaxConcurrentSessions(newUser.maxConcurrentSessions)
              : 1
          }
        : {})
    };

    try {
      await setDoc(getDocRef('app_users', newId), userToSave);
    } catch (err) {
      console.error(err);
      try {
        await deleteUser(cred.user);
      } catch (delErr) {
        console.error(delErr);
      }
      await signOut(secondaryAuth).catch(() => {});
      showToast('No se pudo guardar el perfil en la base de datos. La cuenta de acceso se ha revertido.');
      return;
    }
    let inviteNote = '';
    const authDomain = String(AUTH_EMAIL_DOMAIN || '').toLowerCase();
    const authEmailDomain = String(authEmail.split('@')[1] || '').toLowerCase();
    const shouldSendNativeInvite = Boolean(authEmail) && authEmailDomain !== authDomain;
    if (shouldSendNativeInvite) {
      try {
        const appUrl =
          (typeof window !== 'undefined' ? window.location.origin : '') || 'https://registros-vnpm.web.app';
        await sendPasswordResetEmail(secondaryAuth, authEmail, {
          url: `${appUrl.replace(/\/$/, '')}/login`,
          handleCodeInApp: false,
        });
        inviteNote = ' Se envió correo de acceso (plantilla Firebase para definir contraseña).';
      } catch (inviteErr) {
        console.error(inviteErr);
        inviteNote = ' No se pudo enviar el correo de acceso automático.';
      }
    } else {
      inviteNote = ` Invitación por correo omitida para cuentas internas (@${AUTH_EMAIL_DOMAIN}).`;
    }

    await signOut(secondaryAuth).catch(() => {});

    const accessSummary =
      userToSave.role === 'SuperUsuario'
        ? 'Acceso total (SuperUsuario).'
        : [
            `Eventos: ${resolveEventNamesForUserLog(userToSave.allowedEventIds, events)}`, `Sedes: ${summarizeLocationsForUserLog(userToSave.allowedLocations)}`, [
              userToSave.canViewFinances && 'finanzas',
              userToSave.canViewHiddenDonations && 'donaciones ocultas',
              userToSave.canViewExpenses && 'lista de gastos',
              userToSave.canEditRegistryDates && 'editar fechas de registro/abonos',
              userToSave.canMarkPersonsOfInterest && 'marcar personas de interés',
              userToSave.canSendWhatsAppQuickAction && 'WhatsApp (acciones rápidas)',
              userToSave.canMarkResponsivaLocalQuickAction && 'responsiva local (acciones rápidas)',
              userToSave.canSendResponsivaDigitalQuickAction && 'responsiva digital (acciones rápidas)',
              userToSave.canCancelRegistrations && 'dar de baja registros',
            ]
              .filter(Boolean)
              .join(', ') || 'sin permisos financieros extra', userToSave.role === 'Administrador'
              ? `sesiones simultáneas: ${userToSave.maxConcurrentSessions ?? 1}`
              : null, ]
            .filter(Boolean)
            .join('. ') + '.';
    const _userSnap = (() => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
      const { password, passwordHash, newPassword, confirmPassword, currentPasswordInput, ...rest } = userToSave || {};
      return rest;
    })();
    addLog('Gestión de Usuarios', `Añadió al nuevo usuario: ${newUser.username} (${newUser.role}). ${accessSummary}`, null, { id: 'Global', name: 'Sistema' }, null, {
      entityType: 'user',
      entityId: String(userToSave?.id || newUser.username),
      status: LOG_STATUS.OK,
      snapshot: { kind: 'usuario_nuevo', user: _userSnap },
    });
    setNewUser(defaultNewUserFormState());
    setNewUserModalOpen(false);
    showToast(`Usuario añadido exitosamente.${inviteNote}`);
  };

  const handleUpdateUser = async (e) => {
    const mod = await import('./handlers/runUpdateUser.js');
    return mod.runUpdateUser(getScope, e);
  };

  const handleDeleteUser = async (id, username) => {
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
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    const closeModal = () => setDeleteUserConfirmModal({ isOpen: false, id: null, username: '' });
    if (!hasAdminRights) {
      showToast('Permisos insuficientes.');
      closeModal();
      return;
    }
    if (currentUser.id === id) {
      showToast('No puedes eliminar tu propia cuenta.');
      closeModal();
      return;
    }

    const userToDelete = users.find((u) => String(u.id) === String(id));
    if (userToDelete?.role === 'SuperUsuario' && currentUser.role !== 'SuperUsuario') {
      showToast('Solo otro SuperUsuario puede eliminar a un SuperUsuario.');
      closeModal();
      return;
    }

    try {
      const functions = getFunctions(app, 'us-central1');
      const deleteUserAccountFn = httpsCallable(functions, 'deleteUserAccount');
      await deleteUserAccountFn({ userId: String(id) });
      addLog('Gestión de Usuarios', `Eliminó al usuario: ${username}`, null, { id: 'Global', name: 'Sistema' }, null, {
        entityType: 'user',
        entityId: String(username || ''),
        status: LOG_STATUS.OK,
        snapshot: { kind: 'usuario_eliminado', username },
      });
      showToast('Usuario eliminado.');
    } catch (e) {
      console.error(e);
      const code = String(e?.code || '');
      const msg = String(e?.message || '').toLowerCase();
      if (code.includes('permission-denied')) {
        showToast('No tienes permisos para eliminar este usuario.');
      } else if (code.includes('failed-precondition') || msg.includes('propia cuenta')) {
        showToast('No puedes eliminar tu propia cuenta.');
      } else if (code.includes('not-found')) {
        showToast('Ese usuario ya no existe o fue eliminado.');
      } else {
        showToast('No se pudo eliminar el usuario en Firebase. Revisa conexión o permisos.');
      }
    } finally {
      closeModal();
    }
  };

  const refreshAnonymousAuthUsers = useCallback(async () => {
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
      const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!isSuperUser) return;
    setAnonymousAuthPanel((p) => ({ ...p, loading: true }));
    try {
      const functions = getFunctions(app, 'us-central1');
      const fn = httpsCallable(functions, 'adminListAnonymousAuthUsers');
      const res = await fn({});
      const data = res?.data || {};
      setAnonymousAuthPanel((p) => ({
        ...p,
        loading: false,
        users: Array.isArray(data.users) ? data.users : [],
      }));
    } catch (e) {
      const code = String(e?.code || '');
      const msg =
        code === 'functions/unauthenticated'
          ? 'Inicia sesión de nuevo.'
          : code === 'functions/permission-denied'
            ? 'Solo el SuperUsuario puede ver cuentas anónimas.'
            : e?.message || 'No se pudo cargar la lista. ¿Están desplegadas las funciones?';
      showToast(msg);
      setAnonymousAuthPanel((p) => ({ ...p, loading: false, users: [] }));
    }
  }, [isSuperUser, showToast]);

  useEffect(() => {
    if (!isSuperUser || systemView !== 'users') return;
    void refreshAnonymousAuthUsers();
  }, [isSuperUser, systemView, refreshAnonymousAuthUsers]);

  const deleteOneAnonymousAuthUser = useCallback(
    async (uid) => {
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
      const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
      if (!isSuperUser || !uid) return;
      if (!window.confirm(`¿Eliminar la cuenta anónima ${uid}?`)) return;
      setAnonymousAuthPanel((p) => ({ ...p, busy: true, deletingUid: uid }));
      try {
        const functions = getFunctions(app, 'us-central1');
        const fn = httpsCallable(functions, 'adminDeleteAnonymousAuthUser');
        await fn({ uid });
        showToast('Cuenta anónima eliminada.');
        await refreshAnonymousAuthUsers();
      } catch (e) {
        const code = String(e?.code || '');
        showToast(
          code === 'functions/permission-denied'
            ? 'Solo el SuperUsuario puede eliminar cuentas anónimas.'
            : e?.message || 'No se pudo eliminar la cuenta.'
        );
      } finally {
        setAnonymousAuthPanel((p) => ({ ...p, busy: false, deletingUid: null }));
      }
    },
    [isSuperUser, showToast, refreshAnonymousAuthUsers]
  );

  const purgeAllAnonymousAuthUsers = useCallback(async () => {
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
      const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!isSuperUser) return;
    if (
      !window.confirm(
        '¿Eliminar todas las cuentas anónimas huérfanas en Firebase Authentication?\n\nNo se borrarán cuentas vinculadas a usuarios del panel (authUid en app_users).'
      )
    ) {
      return;
    }
    setAnonymousAuthPanel((p) => ({ ...p, purgeAllBusy: true }));
    try {
      const functions = getFunctions(app, 'us-central1');
      const fn = httpsCallable(functions, 'adminPurgeAnonymousAuthUsers');
      const res = await fn({ maxAgeMinutes: 0 });
      const data = res?.data || {};
      setAnonymousAuthPanel((p) => ({ ...p, lastPurgeResult: data }));
      const deleted = Number(data.deleted) || 0;
      showToast(
        deleted > 0
          ? `Limpieza completada: ${deleted} cuenta(s) anónima(s) eliminada(s).`
          : 'No había cuentas anónimas huérfanas que eliminar.'
      );
      await refreshAnonymousAuthUsers();
    } catch (e) {
      const code = String(e?.code || '');
      showToast(
        code === 'functions/permission-denied'
          ? 'Solo el SuperUsuario puede limpiar cuentas anónimas.'
          : e?.message || 'No se pudo ejecutar la limpieza.'
      );
    } finally {
      setAnonymousAuthPanel((p) => ({ ...p, purgeAllBusy: false }));
    }
  }, [isSuperUser, showToast, refreshAnonymousAuthUsers]);

  const isValidPhone = (phone) => phone.startsWith('+') ? phone.length > 5 : phone.replace(/\D/g, '').length === 10;

  /** Lista de etiquetas en español para campos pendientes o inválidos (alta, lista de espera, edición). */
  const getRegistrationFormIssues = (entry, minDep, evType, editorFieldVis = null, eventLike = null, privacyContext = null) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, BAUTIZOS_ATTENDANCE, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, active, activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, all, allKnownLocationNames, allParticipants } = getScope();
    const { anonymousAuthPanel, app, appendBautizosTransportChoiceIssues, appendOlderLogPage, applyKeyValueSheetStyles, applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView, b, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildActiveRegistrantMetaForCompanionDedupe, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCarDataWaSubjectContext, buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells } = getScope();
    const { buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, byLoc, bzEvtAppendCompanionsValidationIssues, bzEvtAttendanceTypeLabel, bzEvtBuildCanonicalCompanionPlan, bzEvtBuildFamilyCarInventory, bzEvtCompanionBaptized, bzEvtCompanionsArray, bzEvtNormalizeAttendanceType, bzEvtResolveCarDataAnchor, calculateAgeFromBirthDate, campa, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canEditRegistryDates, canMarkPersonsOfInterest, canSeeExpenseConceptForRow, carCrewRequiresPassengerSelection, carDataSubjectContext, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectBautizosParticipatingServerRows, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companions, compareParticipantsByRegisteredAtAsc } = getScope();
    const { computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createdAt, currentEvent, currentPricing, currentUser, darkMode, dashboardHasFullLocationAccess, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, ef, el, enrichBackupEventsWithParticipantLocations, event, eventDateDraft } = getScope();
    const { eventLocs, events, excelExportAccessibleLocations, exitLogsRangeMode, expandedLogId, expenses, extractLogMillis, familyCarInventoryNeedsAttention, fieldStack, finalizeStaffPanelSignOut, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap, getLiquidationTarget, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot } = getScope();
    const { getResponsivaCardUiState, getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, gross, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, hasAdminRights, hasFinancialAccess, hasValidFullName, hay, hostSourceKey, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isCampa, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral } = getScope();
    const { isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser, isValidPartialScholarshipInitialPaid, labelClasses, legacy, limit, linkWithCredential, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, local, location, locations, logBulkDeleteBusy, logBulkDeleteInFlightRef, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay } = getScope();
    const { logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, mergedPrivacyNotice } = getScope();
    const { na, needsFirestoreResyncAfterBulk, newEntryWithEditorDefaults, newEventData, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, panelNavMerged, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, pathname, performAppFullBackup } = getScope();
    const { privacyNoticePublicUrl, pruneEventScopedAccessMap, query, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, renameModal, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro, resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, roster, secondaryAuth, sede } = getScope();
    const { selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek, setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen } = getScope();
    const { setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, single, sortedEvents, summary, summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView } = getScope();
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    const vis = editorFieldVis && typeof editorFieldVis === 'object' ? mergeEditorRegistrationFieldVisibility(editorFieldVis) : null;
    const fv = (key) => !vis || vis[key] !== false;
    const priv = privacyContext && typeof privacyContext === 'object' ? privacyContext : {};
    const privacyAccepted = priv.privacyAccepted ?? false;
    const sensConsent = priv.sensitiveConsent ?? entry?.sensitiveDataConsent ?? '';
    const sensAllowed = isSiValue(sensConsent);
    const fvSens = (key) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
      const med = ['bloodType', 'allergies', 'diseases', 'disability', 'canSwim'];
      if (med.includes(key) && !sensAllowed) return false;
      return fv(key);
    };
    const issues = [];
    if (!hasValidFullName(entry.name || '')) issues.push('Nombre completo (nombre y dos apellidos)');
    if (!isValidPhone(entry.phone || '')) issues.push('Teléfono personal (10 dígitos válidos)');
    if (entry.gender === '' || entry.gender == null) issues.push('Género');
    if (!(entry.birthDate || '').trim()) issues.push('Fecha de nacimiento');

    if ((evType === 'Campa' ) && fvSens('bloodType') && !String(entry.bloodType ?? '').trim()) {
      issues.push('Tipo de sangre');
    }

    if (evType === 'Campa') {
      const ageNum = parseInt(entry.age, 10);
      const needsResp = eventLike
        ? registrationRequiresResponsivaStatus(entry, eventLike)
        : Number.isFinite(ageNum) && ageNum > 0 && ageNum < 18;
      if (needsResp && !(entry.responsivaStatus || '').trim()) {
        issues.push(eventLike ? responsivaStatusValidationLabel(eventLike) : 'Responsiva (menor de edad)');
      }
      if (!String(entry.emergencyContact || '').trim()) issues.push('Nombre del contacto de emergencia');
      if (!isValidPhone(entry.emergencyPhone || '')) issues.push('Teléfono de emergencia (10 dígitos)');
      if (!(entry.emergencyRelationship || '').trim()) issues.push('Parentesco del contacto de emergencia');

      if (fvSens('allergies') && entry.hasAllergy !== 'No' && String(entry.allergyDetails || '').trim() === '' && String(entry.allergyCategory || '').trim() === '') {
        issues.push('Alergias: categoría o detalle');
      }
      if (fvSens('diseases') && entry.hasDisease !== 'No' && String(entry.diseaseDetails || '').trim() === '') {
        issues.push('Detalle de enfermedad');
      }
      if (fvSens('disability') && entry.hasDisability !== 'No' && String(entry.disabilityDetails || '').trim() === '') {
        issues.push('Detalle de discapacidad');
      }
      if (fv('serverRole') && isSiValue(entry.isServer) && !String(entry.serverAssignment || '').trim()) {
        issues.push('Asignación de servidor (Teens / Jóvenes / Ambos)');
      }
      if (fv('willBeBaptized') && isSiValue(entry.willBeBaptized) && isSiValue(entry.isServer) && entry.serverAssignment === 'Ambos') {
        const bs = String(entry.baptismSegment || '').trim();
        if (bs !== 'Teens' && bs !== 'Jóvenes') issues.push('Bautizo: segmento Teens o Jóvenes (servidor Ambos)');
      }
      if (fv('scholarship') && isSiValue(entry.isScholarship)) {
        if (entry.scholarshipType === 'partial') {
          const listPrice = getPersonCost(entry, currentPricing, eventLike);
          const montoBecado = parseFloat(entry.scholarshipPartialAmount);
          if (!Number.isFinite(montoBecado) || montoBecado < 0) issues.push('Monto becado (número válido ≥ 0)');
          if (Number.isFinite(montoBecado) && montoBecado >= listPrice) issues.push('Monto becado debe ser menor que el costo de lista');
          const paidPartialFmt = parseStrictNonNegativeMoneyInput(entry.paid, { allowEmpty: true });
          if (!paidPartialFmt.ok) {
            issues.push(`El monto no es válido: ${paidPartialFmt.reason}`);
          } else if (!isValidPartialScholarshipInitialPaid({ ...entry, paid: paidPartialFmt.value }, minDep)) {
            const pend = getLiquidationTarget(entry);
            issues.push(
              `Abono inicial (beca parcial): no puede superar el saldo pendiente por liquidar (${pend.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}).`
            );
          }
        }
        return issues;
      }
      if (fv('attendanceSpecial') && isFreeAttendanceType(normalizeAttendanceSpecial(entry))) return issues;
    }

        if (evType === 'General') {
      if (!String(entry.emergencyContact || '').trim()) issues.push('Nombre del contacto de emergencia');
      if (!isValidPhone(entry.emergencyPhone || '')) issues.push('Teléfono de emergencia (10 dígitos)');
      if (!(entry.emergencyRelationship || '').trim()) issues.push('Parentesco del contacto de emergencia');
    }

    const paidFmt = parseStrictNonNegativeMoneyInput(entry.paid, { allowEmpty: true });
    if (!paidFmt.ok) {
      issues.push(`El monto no es válido: ${paidFmt.reason}`);
    }
    if (priv.requirePrivacy) {
      if (!privacyAccepted) issues.push('Aceptación del aviso de privacidad');
    }
    if (shouldBlockSensitiveHealthWithoutConsent(entry, priv)) {
      issues.push('Hay datos de salud capturados pero no autorizó su almacenamiento');
    }
    const paid = paidFmt.ok ? paidFmt.value : 0;
    const min = Number(minDep) || 0;
    const bautizosNoCharge =
      false /* Bautizos unsupported in v2 */ && getPersonCost(entry, currentPricing, eventLike || currentEvent) === 0;
    if (paidFmt.ok && !bautizosNoCharge && paid < min) issues.push(`Abono inicial (mínimo $${min.toLocaleString('es-MX')})`);
    return issues;
  };

  const formatRegistrationValidationIssuesMessage = (issues) => {
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
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!issues?.length) return '';
    return `Revisa lo siguiente:\n• ${issues.join('\n• ')}`;
  };

  const showRegistrationValidationIssues = (issues) => {
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
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    if (!issues.length) return;
    showToast(formatRegistrationValidationIssuesMessage(issues));
  };

  const missingInitialPaid = !!currentEvent && (() => {
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
    const { toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiModal, updateDoc, updatePassword, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, username, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen, usersPanelSearch, usersVisibleInPanel, val, visibleEvents, waitlist, where, writeStaffSessionLogOnce } = getScope();
    const paidFmt = parseStrictNonNegativeMoneyInput(newEntryWithEditorDefaults.paid, { allowEmpty: true });
    if (!paidFmt.ok) return true;
    const paid = paidFmt.value;
    const minDep = currentEvent.minDeposit || 0;
    if (currentEvent.eventType === 'Campa' && isSiValue(newEntryWithEditorDefaults.isScholarship)) {
      if (newEntryWithEditorDefaults.scholarshipType === 'partial')
        return !isValidPartialScholarshipInitialPaid({ ...newEntryWithEditorDefaults, paid: paidFmt.value }, minDep);
      return false;
    }
    if (currentEvent.eventType === 'Campa' && isFreeAttendanceType(newEntryWithEditorDefaults.attendanceSpecialType)) return false;
    return paid < minDep;
  })();
  /** Nombre/contacto: \p{L}/\p{M} (incluye e\u00f1e), m\u00e1s \u00f1/\u00d1 expl\u00edcitos, n\u00fameros, espacios, ap\u00f3strofo/guion, \u00bf \u00a1. */
  const handleNameInput = (val) => {
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
    if (val === '') return true;
    return /^[\p{L}\p{M}\u00f1\u00d10-9\s'\u2019\-.\u00bf\u00a1,]+$/u.test(val);
  };

  const formatPhoneNumber = (value) => {
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
    if (value.startsWith('+')) return value.replace(/[^+0-9\s-]/g, '');
    const digits = value.replace(/\D/g, '').substring(0, 10);
    let formatted = digits.substring(0, 2);
    if (digits.length > 2) formatted += '-' + digits.substring(2, 6);
    if (digits.length > 6) formatted += '-' + digits.substring(6, 10);
    return formatted;
  };

  const buildWhatsAppMessage = useCallback(
    (person, loc, liquidationTarget) =>
      buildGenericManualWhatsAppMessage({
        person,
        loc,
        liquidationTarget,
        eventSnapshot: currentEvent,
        reportedAtMs: Date.now(),
        sentByLabel: currentUser?.username || '',
        rosterParticipants: allParticipants,
      }),
    [currentEvent, currentUser?.username, allParticipants]
  );

  const buildArchiveWhatsAppMessage = useCallback((person, reportedAtMs = Date.now()) => {
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
    const reportedAtText = new Date(Number(reportedAtMs) || Date.now()).toLocaleString('es-MX');
    const personName = person?.name || '';
    const eventName = currentEvent?.name || 'el evento';
    const vnpId = person?.vnpPersonId || 'N/A';

    return appendPrivacyFooter(
      [
        `Hola ${personName}, tu registro en el evento ${eventName} ha sido cancelado.`,
        `Fecha y hora de la cancelación: ${reportedAtText}.`,
        `Tu ID único es: ${vnpId}.`,
        'Si esto fue un error, por favor contáctanos para resolverlo.',
        'Gracias.'
      ].join('\n'),
      privacyNoticePublicUrl
    );
  }, [currentEvent?.name, privacyNoticePublicUrl]);

  const appendWhatsAppMessageHistoryToken = useCallback(
    async (personId, token) => {
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
      if (!personId || !token) return;
      try {
        await updateDoc(getDocRef('app_participants', String(personId)), {
          whatsAppMessageHistory: arrayUnion(token),
        });
        const person = allParticipants.find((p) => String(p.id) === String(personId));
        if (person) {
          refreshParticipantCache(person, 'Historial WhatsApp', {
            personId,
            skipRefetch: true,
            patch: {
              whatsAppMessageHistory: [
                ...(Array.isArray(person.whatsAppMessageHistory) ? person.whatsAppMessageHistory : []),
                token,
              ],
            },
          });
        }
      } catch (err) {
        console.error(err);
      }
    },
    [allParticipants, currentEvent?.id, refreshParticipantCache]
  );

  const buildWhatsAppHistoryMessage = useCallback(
    (token, rowLike) => {
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
      if (!token || !rowLike) return '';
      const kind = String(token.kind || '');
      if (kind === 'finance_queue_merge') {
        const items = Array.isArray(token.items)
          ? token.items.map((n) => ({ ...n, sent: false }))
          : [];
        const { text } = buildMergedFinanceWhatsAppMessage(
          rowLike,
          token.loc || rowLike.location || '',
          items,
          currentEvent,
          getWhatsAppNotificationMarkKey,
          getLiquidationTarget,
          allParticipants
        );
        return text;
      }
      if (kind === 'finance_generic') {
        return buildGenericManualWhatsAppMessage({
          person: { ...rowLike, paid: Number(token.paidSnapshot || 0) || 0 }, loc: token.loc || rowLike.location || '', liquidationTarget: Number(token.liquidationTargetSnapshot || 0) || 0, eventSnapshot: currentEvent, reportedAtMs: Number(token.createdAt) || Date.now(), sentByLabel: token.sentBy || '', });
      }
      if (kind === 'responsiva_invite') {
        return buildResponsivaInviteWhatsAppText({
          minorName: rowLike.name, eventName: String(token.eventName || currentEvent?.name || 'Evento'), signUrl: getResponsivaSignPageUrl(String(token.signToken || '')), participantIsMinor: token.participantIsMinor !== false, remindMandatorySignature: token.remindMandatorySignature === true, avisoUrl: privacyNoticePublicUrl, });
      }
      return 'Mensaje personalizado enviado manualmente desde el modal de WhatsApp.';
    },
    [buildGenericManualWhatsAppMessage, currentEvent, getLiquidationTarget]
  );

  const deleteWhatsAppHistoryEntryForSuperUser = useCallback(
    async (person, token) => {
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
      if (!isSuperUser || !person?.id || !token) return;
      const tokenId = whatsAppHistoryEntryId(token);
      if (!tokenId) return;
      const personName = String(person?.name || '').trim() || 'participante';
      const reactivated = countReactivatedUnsentNotifications(
        person.whatsAppFinanceNotifications,
        token
      );
      const confirmMsg =
        reactivated > 0
          ? `¿Eliminar este registro del historial de WhatsApp de ${personName}? Se reactivarán ${reactivated} aviso(s) en la cola pendiente.`
          : `¿Eliminar este registro del historial de WhatsApp de ${personName}?`;
      if (!window.confirm(confirmMsg)) return;

      const prevHist = getWhatsAppMessageHistoryRows(person);
      const nextHist = removeWhatsAppHistoryEntry(prevHist, tokenId);
      const nextNotifications = reactivateQueueFromHistoryToken(
        person.whatsAppFinanceNotifications,
        token
      );
      const payload = {
        whatsAppMessageHistory: nextHist,
        whatsAppFinanceNotifications: nextNotifications,
      };
      try {
        await updateDoc(getDocRef('app_participants', String(person.id)), payload);
        refreshParticipantCache(person, 'Eliminar historial WhatsApp', {
          personId: person.id,
          skipRefetch: true,
          patch: payload,
        });
        addLog(
          'WhatsApp',
          `SuperUsuario eliminó entrada del historial WA de ${personName}${reactivated ? ` y reactivó ${reactivated} aviso(s) en cola` : ''}.`,
          null,
          null,
          { collectionName: 'app_participants', docId: String(person.id), action: 'update', previousData: person }
        );
        showToast(
          reactivated > 0
            ? `Historial eliminado. ${reactivated} aviso(s) pendiente(s) reactivado(s) en la cola.`
            : 'Entrada del historial de WhatsApp eliminada.'
        );
      } catch (err) {
        console.error(err);
        showToast('No se pudo eliminar la entrada del historial de WhatsApp.');
      }
    },
    [isSuperUser, refreshParticipantCache, addLog, showToast]
  );

  const upsertMergedArchiveProfile = useCallback(async (person, archivedAt, loc, sourceKind, eventNameOverride) => {
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
    const eventName = eventNameOverride != null && String(eventNameOverride).trim() !== '' ? eventNameOverride : (currentEvent?.name || '');
    const docId = getArchiveProfileDocId(person);
    const ref = getDocRef(ARCHIVE_PROFILES_COLLECTION, docId);
    const incoming = buildArchiveIndexIncomingPayload(person, archivedAt, loc, sourceKind, eventName);
    const incomingTs = Number(archivedAt) || Date.now();
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(
        ref,
        omitUndefinedDeep(
          stripFinancialFromArchiveIndexDoc({
            ...incoming,
            _mergeMeta: {
              lastMergedAt: Date.now(),
              sourceKinds: incoming.sourceKind ? [incoming.sourceKind] : [],
              lastArchiveParticipantId: incoming.participantFirebaseId,
              lastArchiveSourceKind: incoming.sourceKind,
            },
          })
        )
      );
      return;
    }
    const existing = snap.data();
    const existingTs = Number(existing.archivedAt) || 0;
    let merged;
    if (incomingTs >= existingTs) {
      const prevKinds = Array.isArray(existing._mergeMeta?.sourceKinds) ? [...existing._mergeMeta.sourceKinds] : [];
      const ik = incoming.sourceKind;
      if (ik && !prevKinds.includes(ik)) prevKinds.push(ik);
      merged = {
        ...existing,
        ...incoming,
        archivedProfileSnapshot: incoming.archivedProfileSnapshot,
        customData:
          incoming.customData && typeof incoming.customData === 'object' ? { ...incoming.customData } : {},
        archivedAt: Math.max(existingTs, incomingTs),
        vnpPersonId: incoming.vnpPersonId || existing.vnpPersonId,
        _mergeMeta: {
          lastMergedAt: Date.now(),
          sourceKinds: prevKinds,
          lastArchiveParticipantId: incoming.participantFirebaseId,
          lastArchiveSourceKind: incoming.sourceKind,
        },
      };
    } else {
      merged = mergeArchivedFirestoreDocs(existing, incoming, existingTs, incomingTs);
    }
    await setDoc(ref, omitUndefinedDeep(stripFinancialFromArchiveIndexDoc(merged)));
  }, [currentEvent?.name]);

  const archiveParticipantToFirestore = useCallback(
    async (person, loc, { sourceKind, eventDisplayName }) => {
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
      if (participantIsArchived(person)) return;
      const bajaAt = Date.now();
      await removeResponsivaArtifactsForParticipant({
        eventId: person.eventId,
        participantId: person.id,
        responsivaDigital: person.responsivaDigital,
      });
      /** Campa + costo manual: conservar excedente pagado para la fila virtual «Saldo a favor» en lista de gastos. */
      const evForPerson = events.find((e) => String(e.id) === String(person?.eventId));
      let preservedManualCredit = null;
      if (evForPerson?.eventType === 'Campa' && person?.registeredCostManual === true) {
        const liq = Number(getLiquidationTarget(person)) || 0;
        const paidG = parseFloat(person.paid || 0) || 0;
        const excess = Math.max(0, paidG - liq);
        if (excess > 0.005) {
          const listRef = Number(resolveRegisteredCost(person, currentPricing)) || liq;
          preservedManualCredit = { archivedManualCreditAmount: excess, archivedManualCreditListRef: listRef };
        }
      }
      const archivePayload = {
        status: PARTICIPANT_STATUS_ARCHIVED,
        archivedAt: bajaAt,
        archivedFromLocation: loc,
        archivedProfileSnapshot: buildArchivedProfileSnapshot(person),
        paymentHistory: [],
        whatsAppFinanceNotifications: [],
        scholarshipPendingApproval: false,
        paid: deleteField(),
        paidNet: deleteField(),
        registeredCost: deleteField(),
        registeredCostManual: deleteField(),
        discountCampaignId: deleteField(),
        discountCampaignConcept: deleteField(),
        discountCampaignAppliedAt: deleteField(),
        refundPendingAmount: deleteField(),
        refundPendingReason: deleteField(),
        refundAsDonation: deleteField(),
        scholarshipPartialAmount: deleteField(),
        paymentMethod: deleteField(),
        paymentService: deleteField(),
        cardReference: deleteField(),
        isPastorChild: deleteField(),
        pastorChildWithoutPay: deleteField(),
        pastorChildSpecialDonationFinanceId: deleteField(),
        ...(preservedManualCredit
          ? preservedManualCredit
          : {
              archivedManualCreditAmount: deleteField(),
              archivedManualCreditListRef: deleteField(),
            }),
        responsivaStatus: deleteField(),
        responsivaDigital: deleteField(),
        emergencyPhoneResponsiva: deleteField(),
        emergencyContactResponsiva: deleteField(),
        ...(globalConfig?.isDebugMode ? { _isDebug: true, _debugSessionId: globalConfig.debugSessionId } : {}),
      };
      await updateDoc(getDocRef('app_participants', String(person.id)), archivePayload);
      refreshParticipantCache(person, 'Archivar participante', {
        personId: person.id,
        patch: {
          status: PARTICIPANT_STATUS_ARCHIVED,
          archivedAt: bajaAt,
          archivedFromLocation: loc,
          archivedProfileSnapshot: buildArchivedProfileSnapshot(person),
          paymentHistory: [],
          whatsAppFinanceNotifications: [],
          scholarshipPendingApproval: false,
        },
      });
      if (preservedManualCredit) {
        const donationId = buildFirestoreDocId(['don', 'archmc', person.id, bajaAt], {
          fallback: `don-archmc-${bajaAt}`,
        });
        await setDoc(
          getDocRef('app_donations', donationId),
          omitUndefinedDeep({
            eventId: person.eventId,
            amount: preservedManualCredit.archivedManualCreditAmount,
            donorName: (person.name || '').trim() || 'Participante (archivo)',
            location: String(loc || '').trim() || '?',
            fromArchivedManualCredit: true,
            sourceParticipantId: String(person.id),
            createdAt: new Date(bajaAt).toISOString(),
            createdBy: currentUser?.username || 'Desconocido',
          })
        );
        await addLog(
          'Donación',
          `Saldo a favor al archivar (Campa / costo manual): ${formatMoney(preservedManualCredit.archivedManualCreditAmount)} — ${person.name || person.id} (sede ${String(loc || '').trim() || '?'}). Doc app_donations/${donationId}.`,
          null,
          null,
          { collectionName: 'app_donations', docId: donationId, action: 'create', previousData: null }
        );
      }
      const personForIndex = { ...person, responsivaStatus: '', responsivaDigital: null };
      await upsertMergedArchiveProfile(personForIndex, bajaAt, loc, sourceKind, eventDisplayName);
    },
    [
      addLog,
      currentPricing,
      currentUser?.username,
      events,
      formatMoney,
      getLiquidationTarget,
      globalConfig?.debugSessionId,
      globalConfig?.isDebugMode,
      resolveRegisteredCost,
      upsertMergedArchiveProfile,
      removeResponsivaArtifactsForParticipant,
      refreshParticipantCache,
    ]
  );

  const confirmDeleteEvent = async () => {
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
    if (!deleteEventModal.id) return;
    const evToDelete = events.find((e) => e.id === deleteEventModal.id);
    const id = deleteEventModal.id;
    const eventName = evToDelete?.name || deleteEventModal.name || '';
    const partSnap = await getDocs(query(getColRef('app_participants'), where('eventId', '==', String(id))));
    const toArchive = partSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((p) => !participantIsArchived(p));
    try {
      for (let i = 0; i < toArchive.length; i += 1) {
        const person = toArchive[i];
        const loc = person.location || person.cancelledFromLocation || person.archivedFromLocation || '?';
        const fromWaitlist = (person.status || 'active') === 'waitlist';
        await archiveParticipantToFirestore(person, loc, {
          fromWaitlist,
          sourceKind: fromWaitlist ? 'waitlist' : 'event_deleted',
          eventDisplayName: eventName,
        });
      }
      await deleteDoc(getDocRef('app_events', id));
      addLog(
        'Gestión de Eventos',
        `Eliminó el evento: ${deleteEventModal.name}. Se archivaron ${toArchive.length} registro(s) antes de borrarlo.`,
        null,
        evToDelete || { name: deleteEventModal.name },
        { collectionName: 'app_events', docId: id, action: 'delete', previousData: evToDelete }
      );
      setDeleteEventModal({ isOpen: false, id: null, name: '' });
      showToast(`Evento eliminado. ${toArchive.length} registro(s) archivados.`);
    } catch (err) {
      console.error(err);
      showToast('No se pudo eliminar el evento (error al archivar o borrar). Revisa la consola.');
    }
  };

  const getLastPaymentMethodForFilter = useCallback((person) => {
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
    const history = Array.isArray(person?.paymentHistory) ? person.paymentHistory : [];
    for (let i = history.length - 1; i >= 0; i -= 1) {
      const method = history[i]?.method;
      if (method === 'Tarjeta' || method === 'Efectivo') return method;
    }
    return person?.paymentMethod === 'Tarjeta' ? 'Tarjeta' : 'Efectivo';
  }, []);

  const spouseLinkPickResultsNew = useMemo(() => {
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
    const q = String(getScope().spouseLinkSearchNew ?? spouseLinkSearchNew ?? '').trim();
    const ql = q.toLowerCase();
    const qDigits = digitsOnlyPhone(q);
    if (q.length < 2 && qDigits.length < 4) return [];
    const spouseCandidates = Array.isArray(allParticipants) ? allParticipants : [];
    return spouseCandidates
      .filter((p) => {
        if (!participantEligibleAsSpouseLink(p, currentEvent?.id, null)) return false;
        const matchName = q.length >= 2 && (p.name || '').toLowerCase().includes(ql);
        const matchPhone = qDigits.length >= 4 && digitsOnlyPhone(p.phone).includes(qDigits);
        const matchVnp = q.length >= 2 && String(p.vnpPersonId || '').toLowerCase().includes(ql);
        return matchName || matchPhone || matchVnp;
      })
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'es'))
      .slice(0, 12);
  }, [spouseLinkSearchNew, allParticipants, currentEvent?.id]);

  const spouseLinkPickResultsEdit = useMemo(() => {
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
    const modal = getScope().editRegistryModal ?? editRegistryModal;
    const ex = modal?.data?.id;
    const q = String(getScope().spouseLinkSearchEdit ?? spouseLinkSearchEdit ?? '').trim();
    const ql = q.toLowerCase();
    const qDigits = digitsOnlyPhone(q);
    if (q.length < 2 && qDigits.length < 4) return [];
    const spouseCandidates = Array.isArray(allParticipants) ? allParticipants : [];
    return spouseCandidates
      .filter((p) => {
        if (!participantEligibleAsSpouseLink(p, currentEvent?.id, ex)) return false;
        const matchName = q.length >= 2 && (p.name || '').toLowerCase().includes(ql);
        const matchPhone = qDigits.length >= 4 && digitsOnlyPhone(p.phone).includes(qDigits);
        const matchVnp = q.length >= 2 && String(p.vnpPersonId || '').toLowerCase().includes(ql);
        return matchName || matchPhone || matchVnp;
      })
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'es'))
      .slice(0, 12);
  }, [spouseLinkSearchEdit, allParticipants, currentEvent?.id, editRegistryModal?.data?.id]);

  const spouseIncomingIdsForEvent = useMemo(
    () => buildSpouseIncomingIdSetForEvent(Array.isArray(allParticipants) ? allParticipants : [], currentEvent?.id),
    [allParticipants, currentEvent?.id]
  );

  const filterParticipantRows = useCallback((rows, preserveOrder, rawF, filterOptions = {}) => {
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
    const expandBzEvtCompanions = filterOptions.expandBzEvtCompanions === true;
    const f = listFiltersForEventApplication(rawF, currentEvent?.eventType);
    let processedData = [...(rows || [])];
    if (f.searchTerm) {
      const st = f.searchTerm.trim().toLowerCase();
      const stDigits = digitsOnlyPhone(f.searchTerm);
      processedData = processedData.filter((p) => {
        const mainMatch =
          (p.name || '').toLowerCase().includes(st) ||
          (p.vnpPersonId && String(p.vnpPersonId).toLowerCase().includes(st)) ||
          (stDigits.length >= 3 && digitsOnlyPhone(p.phone).includes(stDigits)) ||
          participantMatchesRosterSearchComments(p, st);
        if (mainMatch) return true;
        if (true) return false;
        return bzEvtCompanionsArray(p).some((c) => {
          if (!String(c?.name || '').trim()) return false;
          if ((c.name || '').toLowerCase().includes(st)) return true;
          if (st.length >= 2 && String(c.vnpPersonId || '').toLowerCase().includes(st)) return true;
          if (stDigits.length >= 3 && digitsOnlyPhone(c.phone || '').includes(stDigits)) return true;
          return false;
        });
      });
    }
    if (f.filterWhatsAppPending === 'pending') {
      processedData = processedData.filter(
        (p) => countUnsentWhatsAppNotificationsForQueue(p, currentEvent, allParticipants) > 0
      );
    }
    if (f.filterLiquidation === 'liquidado') {
      processedData = processedData.filter((p) => isRosterPersonLiquidadoForFilter(p, getLiquidationTarget));
    } else if (f.filterLiquidation === 'pendiente') {
      processedData = processedData.filter((p) => !isRosterPersonLiquidadoForFilter(p, getLiquidationTarget));
    } else if (f.filterLiquidation === 'saldo-favor') {
      processedData = processedData.filter((p) => isRosterSaldoAFavor(p, getLiquidationTarget));
    }
    if (f.filterFirstTimeId !== 'all') {
      processedData = processedData.filter((p) => {
        const isFirst = !!p.isFirstVnpId;
        if (f.filterFirstTimeId === 'first') return isFirst;
        if (f.filterFirstTimeId === 'not-first') return !isFirst;
        return true;
      });
    }
    if (f.filterRegistrationStatus && f.filterRegistrationStatus !== 'all') {
      processedData = processedData.filter((p) =>
        participantMatchesRegistrationStatusFilter(p, f.filterRegistrationStatus)
      );
    }
    if (f.filterPendingRefund !== 'all') {
      processedData = processedData.filter((p) => {
        const hasPendingRefund = participantIsCancelled(p)
          ? getCancelledRefundPendingAmount(p) > 0
          : (Number(p?.refundPendingAmount || 0) || 0) > 0;
        if (f.filterPendingRefund === 'pending') return hasPendingRefund;
        if (f.filterPendingRefund === 'none') return !hasPendingRefund;
        return true;
      });
    }
    if (isResponsivaEventSectionVisible(currentEvent) && f.filterResponsiva !== 'all') {
      processedData = processedData.filter((p) => {
        const card = getResponsivaCardUiState(p, currentEvent);
        if (f.filterResponsiva === 'pending') return card.applies && !card.delivered;
        if (f.filterResponsiva === 'delivered') return card.applies && card.delivered;
        if (f.filterResponsiva === 'na') return !card.applies;
        return true;
      });
    }
    if (f.filterPersonOfInterest !== 'all') {
      processedData = processedData.filter((p) =>
        participantMatchesPersonOfInterestFilter(p, f.filterPersonOfInterest, personOfInterestVnpSet, {
          generateVnpPersonId,
        })
      );
    }
    if (f.filterGender !== 'all') processedData = processedData.filter((p) => (p.gender || '') === f.filterGender);
    if (f.filterTransport !== 'all') {
      const eventType = currentEvent?.eventType;
      processedData = processedData.filter((p) => {
                const llegaCarro = resolveLlegaEnCarro(p);
        const regresaCarro = resolveRegresaEnCarro(p);
        if (f.filterTransport === 'go-bus') return !llegaCarro;
        if (f.filterTransport === 'return-bus') return !regresaCarro;
        if (f.filterTransport === 'go-car') return llegaCarro;
        if (f.filterTransport === 'return-car') return regresaCarro;
        return true;
      });
    }
    if (f.filterPaymentType !== 'all') processedData = processedData.filter((p) => getLastPaymentMethodForFilter(p) === f.filterPaymentType);
    if (f.filterTravelFrom !== 'all') processedData = processedData.filter((p) => (p.travelFrom || p.location || '') === f.filterTravelFrom);
    if (f.filterTravelTo !== 'all') processedData = processedData.filter((p) => (p.travelTo || p.location || '') === f.filterTravelTo);
    if (isCampa) {
      const rr = f.filterRosterRole || 'all';
      if (rr !== 'all') {
        if (rr === 'empleado') {
          processedData = processedData.filter((p) => normalizeAttendanceSpecial(p) === ATTENDANCE_SPECIAL.empleado);
        } else if (rr === 'cortesia') {
          processedData = processedData.filter((p) => normalizeAttendanceSpecial(p) === ATTENDANCE_SPECIAL.cortesia);
        } else if (rr === 'camperos') {
          processedData = processedData.filter((p) => {
            if (normalizeAttendanceSpecial(p) !== ATTENDANCE_SPECIAL.ninguno) return false;
            return !isSiValue(p.isServer);
          });
        } else if (rr === 'servidor-teens') {
          processedData = processedData.filter(
            (p) =>
              isSiValue(p.isServer) &&
              (p.serverAssignment === 'Teens' ||
                (p.serverAssignment === 'Ambos' && getAmbosServeInSegmentOrEmpty(p) === 'Teens'))
          );
        } else if (rr === 'servidor-jovenes') {
          processedData = processedData.filter(
            (p) =>
              isSiValue(p.isServer) &&
              (p.serverAssignment === 'Jóvenes' ||
                (p.serverAssignment === 'Ambos' && getAmbosServeInSegmentOrEmpty(p) === 'Jóvenes'))
          );
        } else if (rr === 'servidor-ambos') {
          processedData = processedData.filter(
            (p) =>
              isSiValue(p.isServer) &&
              p.serverAssignment === 'Ambos' &&
              !getAmbosServeInSegmentOrEmpty(p)
          );
        } else if (rr === 'servidor') {
          processedData = processedData.filter((p) => isSiValue(p.isServer));
        }
      }
      if (f.filterAssignment !== 'all') {
        processedData = processedData.filter((p) => {
          const assign = isSiValue(p.isServer) ? p.serverAssignment : p.campAssignment;
          return assign === f.filterAssignment;
        });
      }
      if (f.filterSwim !== 'all') processedData = processedData.filter((p) => p.canSwim === f.filterSwim);
      if (f.filterBaptism !== 'all') {
        processedData = processedData.filter((p) => {
          const seg = getBaptismAccountingSegment(p);
          if (f.filterBaptism === 'teens') return seg === 'Teens';
          if (f.filterBaptism === 'jovenes') return seg === 'Jóvenes';
          if (f.filterBaptism === 'no') return !isSiValue(p.willBeBaptized);
          return true;
        });
      }
      if (f.filterMaritalStatus && f.filterMaritalStatus !== 'all') {
        const incoming = buildSpouseIncomingIdSetForEvent(allParticipants, currentEvent?.id);
        processedData = processedData.filter((p) => {
          const out = String(p.spouseParticipantId || '').trim();
          const hasLink = !!out || incoming.has(String(p.id));
          const markedMarried = isSiValue(p.isMarried);
          if (f.filterMaritalStatus === 'single') return !hasLink && !markedMarried;
          if (f.filterMaritalStatus === 'married') return hasLink;
          if (f.filterMaritalStatus === 'pending-spouse') return markedMarried && !hasLink;
          return true;
        });
      }
      if (f.filterScholarship === 'partial') processedData = processedData.filter((p) => isSiValue(p.isScholarship) && p.scholarshipType === 'partial');
      else if (f.filterScholarship === 'total') processedData = processedData.filter((p) => isSiValue(p.isScholarship) && p.scholarshipType !== 'partial');
      else if (f.filterScholarship === 'becado') processedData = processedData.filter((p) => isSiValue(p.isScholarship));
      else if (f.filterScholarship === 'No') processedData = processedData.filter((p) => !isSiValue(p.isScholarship));
      if (f.filterMedical === 'allergy') processedData = processedData.filter((p) => isSiValue(p.hasAllergy));
      else if (f.filterMedical === 'disease') processedData = processedData.filter((p) => isSiValue(p.hasDisease));
      else if (f.filterMedical === 'disability') processedData = processedData.filter((p) => isSiValue(p.hasDisability));
    }
    const eventTypeScoped = currentEvent?.eventType;
    if (eventTypeScoped === 'Bautizos') {
      processedData = applyTitularOnlyBautizosRosterFilters(processedData, f);
      if (expandBzEvtCompanions) {
        processedData = prepareBautizosRowsForRosterFilter(processedData, f, {
          roster: allParticipants,
        });
      }
    }
    processedData = applyEventScopedRosterFilters(processedData, f, {
      isCampa: eventTypeScoped === 'Campa',
      isBautizos: false,
      isGeneral: eventTypeScoped === 'General',
      customFields: currentEvent?.customFields,
      resolveLlegaEnCarro,
      eventSnapshot: currentEvent,
      roster: allParticipants,
    });
    if (!preserveOrder) {
      const sortKey = typeof f.sortBy === 'string' ? f.sortBy : 'registered-desc';
      const getDebt = (p) =>
        getParticipantOutstandingGross(p, getLiquidationTarget, computeNetAmountByMethod);
      const ageOf = (p) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
        const n = parseInt(getEffectiveParticipantAge(p), 10);
        return Number.isFinite(n) ? n : 0;
      };
      if (sortKey === 'name-asc') {
        processedData.sort((a, b) =>
          String(a?.name || '').localeCompare(String(b?.name || ''), 'es', { sensitivity: 'base' })
        );
      } else if (sortKey === 'name-desc') {
        processedData.sort((a, b) =>
          String(b?.name || '').localeCompare(String(a?.name || ''), 'es', { sensitivity: 'base' })
        );
      } else if (sortKey === 'age-asc') processedData.sort((a, b) => ageOf(a) - ageOf(b));
      else if (sortKey === 'age-desc') processedData.sort((a, b) => ageOf(b) - ageOf(a));
      else if (sortKey === 'debt-asc') processedData.sort((a, b) => getDebt(a) - getDebt(b));
      else if (sortKey === 'debt-desc') processedData.sort((a, b) => getDebt(b) - getDebt(a));
      else if (sortKey === 'registered-asc' || sortKey === 'none') processedData.sort(compareParticipantsByRegisteredAtAsc);
      else processedData.sort(compareParticipantsByRegisteredAtDesc);
    }
    return processedData;
  }, [isCampa, getLiquidationTarget, getLastPaymentMethodForFilter, allParticipants, currentEvent, personOfInterestVnpSet]);

  const buildRosterLikeFilterPayload = useCallback(
    (searchTermOverride) => ({
      searchTerm: searchTermOverride ?? rosterLocationSearchRef.current,
      sortBy,
      filterWhatsAppPending,
      filterLiquidation,
      filterFirstTimeId,
      filterPendingRefund,
      filterResponsiva,
      filterPersonOfInterest,
      filterGender,
      filterTransport,
      filterPaymentType,
      filterTravelFrom,
      filterTravelTo,
      filterRosterRole,
      filterAssignment,
      filterSwim,
      filterBaptism,
      filterMaritalStatus,
      filterRegistrationStatus,
      filterScholarship,
      filterMedical,
      filterBzEvtAttendance,
      filterAge,
      filterCarDataPending,
    }),
    [
      sortBy,
      filterWhatsAppPending,
      filterLiquidation,
      filterFirstTimeId,
      filterPendingRefund,
      filterResponsiva,
      filterPersonOfInterest,
      filterGender,
      filterTransport,
      filterPaymentType,
      filterTravelFrom,
      filterTravelTo,
      filterRosterRole,
      filterAssignment,
      filterSwim,
      filterBaptism,
      filterMaritalStatus,
      filterRegistrationStatus,
      filterScholarship,
      filterMedical,
      filterBzEvtAttendance,
      filterAge,
      filterCarDataPending,
    ]
  );

  const applyRosterLikeFilters = useCallback(
    (rows, preserveOrder = false, searchTermOverride) =>
      filterParticipantRows(
        rows,
        preserveOrder,
        buildRosterLikeFilterPayload(searchTermOverride),
        { expandBzEvtCompanions: false }
      ),
    [filterParticipantRows, buildRosterLikeFilterPayload]
  );

  const applyGlobalRegistryLikeFilters = useCallback(
    (rows, preserveOrder = false) =>
      filterParticipantRows(rows, preserveOrder, globalRegistryListFilters, {
        expandBzEvtCompanions: true,
      }),
    [filterParticipantRows, globalRegistryListFilters]
  );

  /** Bautizados: `baseRows` ya incluye acompañantes bautizados virtuales; no volver a expandir. */
  const applyBautizadosPageFilters = useCallback(
    (rows, preserveOrder = false) =>
      filterParticipantRows(rows, preserveOrder, globalRegistryListFilters, {
        expandBzEvtCompanions: false,
      }),
    [filterParticipantRows, globalRegistryListFilters]
  );

  const activeRosterFilterCount = useMemo(
    () =>
      typeof getRosterFilterStateSnapshot === 'function'
        ? countActiveDropdownListFilters(getRosterFilterStateSnapshot(), currentEvent?.eventType)
        : 0,
    [getRosterFilterStateSnapshot, currentEvent?.eventType]
  );

  const activeGlobalRegistryFilterCount = useMemo(
    () => countActiveDropdownListFilters(globalRegistryListFilters, currentEvent?.eventType),
    [globalRegistryListFilters, currentEvent?.eventType]
  );

  const activeSummaryDashboardFilterCount = useMemo(
    () =>
      (summaryFilterScholarship !== 'all' ? 1 : 0) +
      (summaryFilterServer !== 'all' ? 1 : 0) +
      (summaryFilterAssignment !== 'all' ? 1 : 0) +
      (summaryFilterBaptism !== 'all' ? 1 : 0) +
      (isCampa && summaryCampaScopes.tableDetails && summaryCampaScopes.tableDetails !== 'all' ? 1 : 0),
    [summaryFilterScholarship, summaryFilterServer, summaryFilterAssignment, summaryFilterBaptism, isCampa, summaryCampaScopes]
  );

  /** Base del resumen del dashboard (solo cruces Beca / Servidor / Asignación / Bautizo). Independiente de búsqueda y filtros de lista de registro por sede. */
  const applySummaryLikeFilters = useCallback((rows, campaScopeOpt, opts = null) => {
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
    const campaSeg = campaScopeOpt ?? 'all';
    const skipBautizosParty = opts && opts.skipBautizosParty === true;
    let processedData = [...(rows || [])];
    processedData = processedData.filter((p) => campaAttendanceScopeMatches(isCampa, p, campaSeg));
    if (isCampa) {
      if (summaryFilterAssignment !== 'all') {
        processedData = processedData.filter((p) => {
          const assign = isSiValue(p.isServer) ? p.serverAssignment : p.campAssignment;
          return assign === summaryFilterAssignment;
        });
      }
      if (summaryFilterBaptism !== 'all') {
        processedData = processedData.filter((p) => {
          const seg = getBaptismAccountingSegment(p);
          if (summaryFilterBaptism === 'teens') return seg === 'Teens';
          if (summaryFilterBaptism === 'jovenes') return seg === 'Jóvenes';
          if (summaryFilterBaptism === 'no') return !isSiValue(p.willBeBaptized);
          return true;
        });
      }
      if (summaryFilterScholarship === 'partial') processedData = processedData.filter((p) => isSiValue(p.isScholarship) && p.scholarshipType === 'partial');
      else if (summaryFilterScholarship === 'total') processedData = processedData.filter((p) => isSiValue(p.isScholarship) && p.scholarshipType !== 'partial');
      else if (summaryFilterScholarship === 'becado') processedData = processedData.filter((p) => isSiValue(p.isScholarship));
      else if (summaryFilterScholarship === 'No') processedData = processedData.filter((p) => !isSiValue(p.isScholarship));
      if (isSiValue(summaryFilterServer)) processedData = processedData.filter((p) => isSiValue(p.isServer));
      else if (summaryFilterServer === 'No') processedData = processedData.filter((p) => !isSiValue(p.isServer));
      else if (summaryFilterServer === 'Teens') {
        processedData = processedData.filter(
          (p) =>
            isSiValue(p.isServer) &&
            (p.serverAssignment === 'Teens' ||
              (p.serverAssignment === 'Ambos' && getAmbosServeInSegmentOrEmpty(p) === 'Teens'))
        );
      } else if (summaryFilterServer === 'Jóvenes') {
        processedData = processedData.filter(
          (p) =>
            isSiValue(p.isServer) &&
            (p.serverAssignment === 'Jóvenes' ||
              (p.serverAssignment === 'Ambos' && getAmbosServeInSegmentOrEmpty(p) === 'Jóvenes'))
        );
      } else if (summaryFilterServer === 'Ambos') {
        processedData = processedData.filter(
          (p) =>
            isSiValue(p.isServer) &&
            p.serverAssignment === 'Ambos' &&
            !getAmbosServeInSegmentOrEmpty(p)
        );
      }
    }
        return processedData;
  }, [
    isCampa,
    currentEvent?.eventType,
    currentEvent?.locations,
    data,
    summaryCampaScopes,
    summaryFilterScholarship,
    summaryFilterServer,
    summaryFilterAssignment,
    summaryFilterBaptism,
  ]);

  /** Cada fila = un movimiento pendiente de avisar por WhatsApp (registro, abono, promoción, baja, etc.). */
  const getPendingWhatsAppRowsForLocation = useCallback((loc) => {
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
    const rows = [];
    const sourceRows = [...(data[loc] || []), ...(waitlistData[loc] || []), ...(cancelledData[loc] || [])];
    const filteredPeople = applyRosterLikeFilters(sourceRows, true);
    for (const person of filteredPeople) {
      const waPhone = normalizeWhatsAppPhone(person.phone);
      if (!waPhone) continue;
      const notifications = Array.isArray(person.whatsAppFinanceNotifications) ? person.whatsAppFinanceNotifications : [];
      for (const n of notifications) {
        if (n?.sent) continue;
        if (
          String(n?.kind || '') === 'datos_carro' &&
          !filterWhatsAppFinanceNotificationsForQueue(person, [n], currentEvent, allParticipants).length
        ) {
          continue;
        }
        rows.push({ person, waPhone, notification: n, markKey: getWhatsAppNotificationMarkKey(n) });
      }
    }
    rows.sort((a, b) => Number(a.notification.createdAt || 0) - Number(b.notification.createdAt || 0));
    return rows;
  }, [data, waitlistData, cancelledData, applyRosterLikeFilters, currentEvent, allParticipants]);

  const exportPendingWhatsAppToExcel = useCallback(async (loc) => {
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
      showToast('No tienes permiso para descargar mensajes de WhatsApp (revisa tu rol y el permiso «WhatsApp» en acciones rápidas).');
      return;
    }
    if (!hasEventAccess(currentEvent?.id) || !hasLocationAccess(loc)) {
      showToast("No tienes permisos para exportar en esta sede/evento.");
      return;
    }
    const targets = getPendingWhatsAppRowsForLocation(loc);
    if (!targets.length) {
      showToast('No hay movimientos pendientes de exportar en esta sede.');
      return;
    }
    const XLSX = await loadSheetJS();
    const fecha = new Date().toLocaleDateString('es-MX').replace(/\//g, '-');
    const locSafe = loc.replace(/\s+/g, '_');
    const header = [['Nombre', 'Teléfono', 'Mensaje', 'Monto Abono', 'Saldo Pendiente', 'Estado', 'Tipo']];
    const cols = [{ wch: 25 }, { wch: 15 }, { wch: 60 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 10 }];
    const aoa = [...header];
    const grouped = new Map();
    for (const item of targets) {
      const pid = String(item.person.id);
      if (!grouped.has(pid)) {
        grouped.set(pid, { person: item.person, waPhone: item.waPhone, items: [] });
      }
      grouped.get(pid).items.push(item);
    }
    for (const { items } of grouped.values()) {
      const unsent = items.map((i) => i.notification).filter((n) => n && !n.sent);
      const { text } = buildMergedFinanceWhatsAppMessage(
        person, person.location || loc, currentEvent, getWhatsAppNotificationMarkKey, getLiquidationTarget, allParticipants
      );
      const totalAbono = unsent.reduce((s, n) => s + (Number(n.amount) || 0), 0);
      const lastSaldo = unsent.length ? Number(unsent[unsent.length - 1].pendingAmount) || 0 : '';
      const anyLiq = unsent.some((n) => n.isLiquidado);
      const kinds = [...new Set(unsent.map((n) => String(n.kind || '')))].join(', ');
      aoa.push([
        person?.name || '',
        waPhone || '',
        (text || '').replace(/\n/g, ' '),
        totalAbono,
        lastSaldo,
        anyLiq ? 'Liquidado (último mov.)' : 'Pendiente',
        kinds,
      ]);
    }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = cols;

    const waAccountingFmt = '_("$"* #,##0.00_);_("$"* (#,##0.00);_("$"* "-"??_);_(@_)';
    const montoCol = 3;
    const saldoCol = 4;
    for (let R = 1; R < aoa.length; R++) {
      [montoCol, saldoCol].forEach(ci => {
        const addr = XLSX.utils.encode_cell({ r: R, c: ci });
        if (ws[addr] && ws[addr].t === 'n') ws[addr].z = waAccountingFmt;
      });
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Pendientes');
    XLSX.writeFile(wb, `WhatsApp_Pendientes_${locSafe}_${fecha}.xlsx`);

    const byPerson = new Map();
    for (const item of targets) {
      const pid = String(item.person.id);
      if (!byPerson.has(pid)) {
        byPerson.set(pid, { person: item.person, markKeys: new Set() });
      }
      byPerson.get(pid).markKeys.add(item.markKey);
    }
    const now = Date.now();
    let failed = 0;
    const destinatarios = grouped.size;
    for (const { person, markKeys } of byPerson.values()) {
      const notifications = [...(person.whatsAppFinanceNotifications || [])];
      const updated = notifications.map((n) =>
        markKeys.has(getWhatsAppNotificationMarkKey(n)) ? { ...n, sent: true, sentAt: now } : n
      );
      try {
        await updateDoc(getDocRef('app_participants', String(person.id)), { whatsAppFinanceNotifications: updated });
        refreshParticipantCache(person, 'WhatsApp exportado (pendientes)', {
          personId: person.id,
          skipRefetch: true,
          patch: { whatsAppFinanceNotifications: updated },
        });
      } catch {
        failed += 1;
      }
    }

    if (failed > 0) {
      showToast(`Archivo generado; no se pudo marcar como enviado en ${failed} registro(s). Revisa conexión o permisos.`);
    } else {
      showToast(
        `Exportados ${destinatarios} destinatario(s) (${targets.length} movimiento(s) en cola). Quedaron marcados como enviados hasta el próximo abono o registro.`
      );
    }
  }, [
    currentEvent,
    currentEvent?.id,
    currentUser,
    getLiquidationTarget,
    hasEventAccess,
    hasLocationAccess,
    getPendingWhatsAppRowsForLocation,
    refreshParticipantCache,
    showToast,
  ]);

  const sleepWhatsAppAutoSend = useCallback(async (ms) => {
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
    const step = 400;
    let left = Math.max(0, ms);
    while (left > 0) {
      if (whatsAppAutoSendCancelRef.current) return false;
      const chunk = Math.min(step, left);
      await new Promise((r) => setTimeout(r, chunk));
      left -= chunk;
    }
    return !whatsAppAutoSendCancelRef.current;
  }, []);

  const runAutoSendPendingWhatsAppForLocation = useCallback(
    async (loc) => {
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
        showToast('No tienes permiso para el envío automático de WhatsApp (revisa tu rol y el permiso «WhatsApp» en acciones rápidas).');
        return;
      }
      if (!hasEventAccess(currentEvent?.id) || !hasLocationAccess(loc)) {
        showToast('No tienes permisos para enviar en esta sede/evento.');
        return;
      }
      const targets = getPendingWhatsAppRowsForLocation(loc);
      if (!targets.length) {
        showToast('No hay mensajes pendientes de WhatsApp en esta sede.');
        return;
      }
      const grouped = new Map();
      for (const item of targets) {
        const pid = String(item.person.id);
        if (!grouped.has(pid)) {
          grouped.set(pid, { person: item.person, waPhone: item.waPhone, items: [] });
        }
        grouped.get(pid).items.push(item);
      }
      const groups = [...grouped.values()];
      const total = groups.length;
      const confirmed = window.confirm(
        `Se abrirá WhatsApp para ${total} destinatario(s) en la sede «${loc}», con pausas anti-spam:\n\n` +
          '• 10 segundos entre cada mensaje\n' +
          '• 2 minutos cada 10 mensajes\n' +
          '• 1 hora cada 100 mensajes\n\n' +
          'Se reutilizará una ventana emergente (permite pop-ups si el navegador lo pide). Tras abrir cada enlace, los avisos se marcan como enviados en el servidor (igual que desde el modal).\n\n' +
          'Mantén esta pestaña abierta. ¿Continuar?'
      );
      if (!confirmed) return;

      whatsAppAutoSendCancelRef.current = false;
      waBulkPopoutRef.current = null;
      setWhatsAppAutoSendJob({ running: true, current: 0, total, locLabel: loc });
      showToast(`Envío automático iniciado: ${total} destinatario(s).`);

      let failures = 0;
      for (let i = 0; i < groups.length; i++) {
        if (whatsAppAutoSendCancelRef.current) {
          showToast(`Envío automático detenido (${i} de ${total} ya procesados).`);
          break;
        }
        if (i > 0) {
          let delayMs = 10_000;
          if (i % 100 === 0) delayMs = 60 * 60 * 1000;
          else if (i % 10 === 0) delayMs = 2 * 60 * 1000;
          const proceed = await sleepWhatsAppAutoSend(delayMs);
          if (!proceed || whatsAppAutoSendCancelRef.current) {
            showToast('Envío automático detenido.');
            break;
          }
        }

        const { items } = groups[i];
        const unsent = items.map((x) => x.notification).filter((n) => n && !n.sent);
        const { text, mergeMarkKeys } = buildMergedFinanceWhatsAppMessage(
          person,
          person.location || loc,
          unsent,
          currentEvent,
          getWhatsAppNotificationMarkKey,
          getLiquidationTarget,
          allParticipants
        );
        const body = (text || '').trim();
        if (!body || !mergeMarkKeys?.length) {
          failures += 1;
          setWhatsAppAutoSendJob({ running: true, current: i + 1, total, locLabel: loc });
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
          if (!w) {
            showToast('Ventana bloqueada por el navegador. Permite pop-ups y vuelve a intentar.');
            failures += 1;
            setWhatsAppAutoSendJob({ running: true, current: i + 1, total, locLabel: loc });
            continue;
          }
        } catch {
          failures += 1;
          setWhatsAppAutoSendJob({ running: true, current: i + 1, total, locLabel: loc });
          continue;
        }

        try {
          const snap = await getDoc(getDocRef('app_participants', String(person.id)));
          if (!snap.exists()) throw new Error('missing');
          const personSnapData = snap.data();
          const arr = Array.isArray(personSnapData?.whatsAppFinanceNotifications)
            ? personSnapData.whatsAppFinanceNotifications
            : [];
          const now = Date.now();
          const keySet = new Set(mergeMarkKeys.map(String));
          const next = arr.map((n) =>
            keySet.has(getWhatsAppNotificationMarkKey(n)) ? { ...n, sent: true, sentAt: now } : n
          );
          const histToken = {
            id: `wa_hist_${now}_${Math.random().toString(36).slice(2, 8)}`,
            kind: 'finance_queue_merge',
            createdAt: now,
            sentBy: currentUser?.username || '',
            loc: loc || '',
            items: arr
              .filter((n) => keySet.has(getWhatsAppNotificationMarkKey(n)))
              .map((n) => compactWhatsAppNotificationToken(n)),
          };
          const waPatch = { whatsAppFinanceNotifications: next };
          if (histToken.items.length > 0) {
            waPatch.whatsAppMessageHistory = arrayUnion(histToken);
          }
          await updateDoc(getDocRef('app_participants', String(person.id)), waPatch);
          const localWaPatch = { whatsAppFinanceNotifications: next };
          if (histToken.items.length > 0) {
            localWaPatch.whatsAppMessageHistory = [
              ...(Array.isArray(person.whatsAppMessageHistory) ? person.whatsAppMessageHistory : []),
              histToken,
            ];
          }
          refreshParticipantCache(person, 'WhatsApp envío automático', {
            personId: person.id,
            skipRefetch: true,
            patch: localWaPatch,
          });
          logWhatsAppSentActivity(addLog, {
            recipientName: person?.name || personSnapData?.name || '',
            recipientId: person.id,
            loc: person.location || loc,
            phone: waPhone,
            channel: 'Envío automático',
            message: body,
            currentEvent,
          });
        } catch {
          failures += 1;
          showToast(`No se pudo marcar como enviado: ${person?.name || person.id} (${i + 1}/${total}).`);
        }
        setWhatsAppAutoSendJob({ running: true, current: i + 1, locLabel: loc });
      }

      setWhatsAppAutoSendJob((j) => ({ ...j, running: false }));
      if (!whatsAppAutoSendCancelRef.current) {
        showToast(
          failures
            ? `Envío automático finalizado con ${failures} error(es).`
            : `Envío automático finalizado: ${total} destinatario(s).`
        );
      }
      whatsAppAutoSendCancelRef.current = false;
    },
    [
      addLog,
      appendWhatsAppMessageHistoryToken,
      buildMergedFinanceWhatsAppMessage,
      currentEvent,
      currentUser,
      getLiquidationTarget,
      getPendingWhatsAppRowsForLocation,
      hasEventAccess,
      hasLocationAccess,
      refreshParticipantCache,
      showToast,
      sleepWhatsAppAutoSend,
    ]
  );

  const finalizeWhatsAppQuickSend = useCallback(
    async ({
      personId,
      loc: waLoc,
      text: sentBody,
      pendingMergeMarkKeys,
      whatsAppQueuedMessageSnapshot,
      logChannel = 'Acción rápida',
    }) => {
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
      const text = String(sentBody || '').trim();
      if (!personId || !text) return;
      const hasPendingQueue = Array.isArray(pendingMergeMarkKeys) && pendingMergeMarkKeys.length > 0;
      const messageUnchangedFromQueue =
        hasPendingQueue &&
        whatsAppQueuedMessageSnapshot != null &&
        text === String(whatsAppQueuedMessageSnapshot).trim();
      const personInMemory = allParticipants.find((p) => String(p.id) === String(personId)) || null;
      let personSnapData = null;
      try {
        const snap = await getDoc(getDocRef('app_participants', String(personId)));
        if (snap.exists()) personSnapData = snap.data();
      } catch {
        personSnapData = null;
      }
      const emitWaActivityLog = () => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
        logWhatsAppSentActivity(addLog, {
          recipientName: personInMemory?.name || personSnapData?.name || '',
          recipientId: personId,
          loc: waLoc || personInMemory?.location || personSnapData?.location || '',
          phone: normalizeWhatsAppPhone(personInMemory?.phone || personSnapData?.phone),
          channel: logChannel,
          message: text,
          currentEvent,
        });
      };
      const applyWhatsAppParticipantPatch = (patch) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
        const bumpPerson = personInMemory || {
          id: personId,
          eventId: personSnapData?.eventId,
          location: waLoc || personSnapData?.location,
        };
        refreshParticipantCache(bumpPerson, 'WhatsApp enviado', { personId, skipRefetch: true, patch });
      };
      if (hasPendingQueue) {
        try {
          const arr = Array.isArray(personSnapData?.whatsAppFinanceNotifications)
            ? personSnapData.whatsAppFinanceNotifications
            : Array.isArray(personInMemory?.whatsAppFinanceNotifications)
              ? personInMemory.whatsAppFinanceNotifications
              : [];
          const now = Date.now();
          const keySet = new Set(pendingMergeMarkKeys.map(String));
          const mergingCarData = arr.some(
            (n) => !n?.sent && String(n?.kind || '') === 'datos_carro' && keySet.has(getWhatsAppNotificationMarkKey(n))
          );
          const carDataKeys = mergingCarData ? new Set(allUnsentCarDataNotificationMarkKeys(arr)) : keySet;
          const nextNotifications = arr.map((n) => {
            if (!carDataKeys.has(getWhatsAppNotificationMarkKey(n))) return n;
            if (String(n?.kind || '') === 'datos_carro') return applyCarDataWaSnooze(n, now);
            return { ...n, sent: true, sentAt: now };
          });
          const sentItems = arr
            .filter((n) => carDataKeys.has(getWhatsAppNotificationMarkKey(n)))
            .map((n) => compactWhatsAppNotificationToken(n));
          const histToken = {
            id: `wa_hist_${now}_${Math.random().toString(36).slice(2, 8)}`,
            kind: messageUnchangedFromQueue ? 'finance_queue_merge' : 'finance_custom',
            createdAt: now,
            sentBy: currentUser?.username || '',
            loc: waLoc || '',
            ...(messageUnchangedFromQueue && sentItems.length > 0 ? { items: sentItems } : {}),
            ...(!messageUnchangedFromQueue
              ? {
                  liquidationTargetSnapshot: personSnapData
                    ? Number(getLiquidationTarget(personSnapData)) || 0
                    : 0,
                  paidSnapshot: personSnapData ? parseFloat(personSnapData.paid || 0) || 0 : 0,
                }
              : {}),
          };
          await updateDoc(getDocRef('app_participants', String(personId)), {
            whatsAppFinanceNotifications: nextNotifications,
            whatsAppMessageHistory: arrayUnion(histToken),
          });
          applyWhatsAppParticipantPatch({
            whatsAppFinanceNotifications: nextNotifications,
            whatsAppMessageHistory: [
              ...(Array.isArray(personInMemory?.whatsAppMessageHistory)
                ? personInMemory.whatsAppMessageHistory
                : []),
              histToken,
            ],
          });
        } catch {
          showToast('WhatsApp abierto; no se pudo marcar el aviso como enviado en el servidor.');
        }
        emitWaActivityLog();
        return;
      }
      const now = Date.now();
      const liqTarget = personSnapData ? Number(getLiquidationTarget(personSnapData)) || 0 : 0;
      const paid = personSnapData ? parseFloat(personSnapData.paid || 0) || 0 : 0;
      const genericText = personSnapData
        ? buildWhatsAppMessage(personSnapData, waLoc || personSnapData.location || '', liqTarget)
        : '';
      const histToken = {
        id: `wa_hist_${now}_${Math.random().toString(36).slice(2, 8)}`,
        kind: genericText && genericText.trim() === text ? 'finance_generic' : 'finance_custom',
        createdAt: now,
        sentBy: currentUser?.username || '',
        loc: waLoc || '',
        liquidationTargetSnapshot: liqTarget,
        paidSnapshot: paid,
      };
      try {
        await updateDoc(getDocRef('app_participants', String(personId)), {
          whatsAppMessageHistory: arrayUnion(histToken),
        });
        applyWhatsAppParticipantPatch({
          whatsAppMessageHistory: [
            ...(Array.isArray(personInMemory?.whatsAppMessageHistory)
              ? personInMemory.whatsAppMessageHistory
              : []),
            histToken,
          ],
        });
      } catch {
        showToast('WhatsApp abierto; no se pudo registrar el envío en el historial.');
      }
      emitWaActivityLog();
    },
    [addLog, allParticipants, buildWhatsAppMessage, currentEvent, currentUser?.username, getLiquidationTarget, refreshParticipantCache, showToast]
  );

  const finalizeCarDataWhatsAppSend = useCallback(
    async ({
      titularId,
      loc: waLoc,
      text: sentBody,
      markKeys = [],
      titularName = '',
      phone: waPhoneOverride = '',
      logChannel = 'Datos de carro',
    }) => {
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
      const text = String(sentBody || '').trim();
      const tid = String(titularId || '').trim();
      if (!tid || !text) return;

      const titularInMemory = allParticipants.find((p) => String(p.id) === tid) || null;
      let titularSnapData = null;
      try {
        const snap = await getDoc(getDocRef('app_participants', tid));
        if (snap.exists()) titularSnapData = snap.data();
      } catch {
        titularSnapData = null;
      }

      const applyTitularPatch = (patch) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
        const bumpPerson = titularInMemory || {
          id: tid,
          eventId: titularSnapData?.eventId,
          location: waLoc || titularSnapData?.location,
        };
        refreshParticipantCache(bumpPerson, 'WhatsApp datos de carro', { personId: tid, skipRefetch: true, patch });
      };

      const now = Date.now();
      const keySet = new Set((markKeys || []).map(String));
      const arr = Array.isArray(titularSnapData?.whatsAppFinanceNotifications)
        ? titularSnapData.whatsAppFinanceNotifications
        : Array.isArray(titularInMemory?.whatsAppFinanceNotifications)
          ? titularInMemory.whatsAppFinanceNotifications
          : [];

      const carDataKeys =
        keySet.size > 0
          ? new Set([...keySet, ...allUnsentCarDataNotificationMarkKeys(arr)])
          : keySet;

      const nextNotifications =
        carDataKeys.size > 0
          ? arr.map((n) => {
              const mk = getWhatsAppNotificationMarkKey(n);
              if (!carDataKeys.has(mk)) return n;
              if (String(n?.kind || '') === 'datos_carro') return applyCarDataWaSnooze(n, now);
              return { ...n, sent: true, sentAt: now };
            })
          : arr;

      const sentCarItems = arr
        .filter((n) => carDataKeys.has(getWhatsAppNotificationMarkKey(n)))
        .map((n) => compactWhatsAppNotificationToken(n));

      const titularHistToken = {
        id: `wa_hist_${now}_${Math.random().toString(36).slice(2, 8)}`,
        kind: keySet.size > 0 && sentCarItems.length > 0 ? 'datos_carro' : 'datos_carro_custom',
        createdAt: now,
        sentBy: currentUser?.username || '',
        loc: waLoc || '',
        ...(sentCarItems.length > 0 ? { items: sentCarItems } : {}),
      };

      const titularPatch = {
        whatsAppFinanceNotifications: nextNotifications,
        whatsAppMessageHistory: arrayUnion(titularHistToken),
      };

      try {
        await updateDoc(getDocRef('app_participants', tid), titularPatch);
        applyTitularPatch({
          whatsAppFinanceNotifications: nextNotifications,
          whatsAppMessageHistory: [
            ...(Array.isArray(titularInMemory?.whatsAppMessageHistory)
              ? titularInMemory.whatsAppMessageHistory
              : []),
            titularHistToken,
          ],
        });
      } catch {
        showToast('WhatsApp abierto; no se pudo registrar el aviso de datos de carro en el titular.');
        logWhatsAppSentActivity(addLog, {
          recipientName: titularName || titularInMemory?.name || titularSnapData?.name || '',
          recipientId: tid,
          loc: waLoc || titularInMemory?.location || titularSnapData?.location || '',
          phone:
            waPhoneOverride ||
            normalizeWhatsAppPhone(titularInMemory?.phone || titularSnapData?.phone),
          channel: logChannel,
          message: text,
          currentEvent,
        });
        return;
      }

      const companionIds = listSplitCompanionParticipantIds(tid, allParticipants);
      const titularLabel = String(titularName || titularInMemory?.name || titularSnapData?.name || '').trim();
      for (const cid of companionIds) {
        const companionToken = {
          id: `wa_hist_${now}_${Math.random().toString(36).slice(2, 8)}_${cid.slice(-4)}`,
          kind: 'datos_carro_via_titular',
          createdAt: now,
          sentBy: currentUser?.username || '',
          loc: waLoc || '',
          titularParticipantId: tid,
          titularName: titularLabel || 'Titular',
        };
        try {
          await updateDoc(getDocRef('app_participants', String(cid)), {
            whatsAppMessageHistory: arrayUnion(companionToken),
          });
          const companionInMemory = allParticipants.find((p) => String(p.id) === String(cid));
          if (companionInMemory) {
            refreshParticipantCache(companionInMemory, 'WhatsApp datos de carro (vía titular)', {
              personId: cid,
              skipRefetch: true,
              patch: {
                whatsAppMessageHistory: [
                  ...(Array.isArray(companionInMemory.whatsAppMessageHistory)
                    ? companionInMemory.whatsAppMessageHistory
                    : []),
                  companionToken,
                ],
              },
            });
          }
        } catch {
          /* omitir fallo en acompañante split */
        }
      }

      logWhatsAppSentActivity(addLog, {
        recipientName: titularName || titularInMemory?.name || titularSnapData?.name || '',
        recipientId: tid,
        loc: waLoc || titularInMemory?.location || titularSnapData?.location || '',
        phone:
          waPhoneOverride ||
          normalizeWhatsAppPhone(titularInMemory?.phone || titularSnapData?.phone),
        channel: logChannel,
        message: text,
        currentEvent,
      });
    },
    [addLog, allParticipants, currentEvent, currentUser?.username, refreshParticipantCache, showToast]
  );

  const openCarDataWhatsAppForTitular = useCallback(
    async (titular, loc) => {
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
        showToast('No tienes permiso para enviar WhatsApp desde transporte.');
        return;
      }
      if (!titular?.id) return;
      const waLoc = String(loc || titular.location || '').trim();
      if (!hasEventAccess(currentEvent?.id) || (waLoc && !hasLocationAccess(waLoc))) {
        showToast('No tienes permisos para enviar en esta sede/evento.');
        return;
      }

      const ctx = buildCarDataPendingWhatsAppContext({
        titular,
        eventSnapshot: currentEvent,
        roster: allParticipants,
      });
      if (!titularCarDataVisibleInWhatsAppQueue(titular, currentEvent, allParticipants)) {
        showToast('Este titular no tiene datos de carro pendientes en cola.');
        return;
      }
      if (!ctx.message) {
        showToast('Este titular no tiene datos de carro pendientes.');
        return;
      }

      const waRecipient = ctx.waRecipient || titular;
      const waPhone = normalizeWhatsAppPhone(waRecipient.phone);
      if (!waPhone) {
        showToast('Teléfono inválido para WhatsApp.');
        return;
      }

      window.open(buildWhatsAppMeUrl(waPhone, ctx.message), '_blank', 'noopener,noreferrer');
      await finalizeCarDataWhatsAppSend({
        titularId: waRecipient.id,
        loc: waLoc,
        text: ctx.message,
        markKeys: ctx.markKeys,
        titularName: waRecipient.name,
        phone: waPhone,
        logChannel: 'Acción rápida (datos de carro)',
      });
      showToast('WhatsApp abierto con solicitud de datos de carro.');
    },
    [
      allParticipants,
      currentEvent,
      currentUser,
      finalizeCarDataWhatsAppSend,
      hasEventAccess,
      hasLocationAccess,
      showToast,
    ]
  );

  return {
    handleExportExcel,
    openExcelExportPicker,
    handleCleanLogs,
    handleCleanRecentLogs,
    handleDeleteOldestLogsByCount,
    confirmRestore,
    updateEventConfig,
    patchCampaRealCostCountOptions,
    handleSaveEventDates,
    handleSaveCardCommissionRate,
    removeCurrentUserSession,
    broadcastSessionActivity,
    sessionRevokedAtToMs,
    revokeAllSessionsForOtherUser,
    remoteSessionRevokeHandledRef,
    finalizeStaffLoginAfterAuth,
    handleLogin,
    handleGoogleLogin,
    handleLogout,
    dismissLogoutConfirmOnBack,
    confirmLogoutFromBack,
    runDailyScheduledBackupIfDue,
    handleCreateEvent,
    handleRenameEvent,
    openEditEventModal,
    handleDragOver,
    handleDrop,
    openPricingModal,
    handleSavePricing,
    openCashCutScheduleModal,
    toggleCashCutServiceForLoc,
    setCashCutSlotTimeForLoc,
    handleSaveCashCutScheduleByLocation,
    handleSaveServeAreaOptions,
    handleSaveAllergyOptions,
    handleAddDonation,
    handleUpdateDonationSuper,
    handleDeleteDonation,
    handleAddExpense,
    handleAddCampaRealCostBreakdownLine,
    handleDeleteCampaRealCostBreakdownLine,
    handleSaveCampaRealCostManualDivisor,
    handleSaveScholarshipRealCostBase,
    handleRepairBautizosSplitCompanionLinks,
    handleSaveBaptismShirtSize,
    handleDeleteExpense,
    handleToggleExpensePaid,
    handleToggleExpenseCountInTotals,
    handleExpensePartialPayment,
    handleEditExpense,
    handleAddUser,
    handleUpdateUser,
    handleDeleteUser,
    refreshAnonymousAuthUsers,
    deleteOneAnonymousAuthUser,
    purgeAllAnonymousAuthUsers,
    isValidPhone,
    getRegistrationFormIssues,
    formatRegistrationValidationIssuesMessage,
    showRegistrationValidationIssues,
    missingInitialPaid,
    handleNameInput,
    formatPhoneNumber,
    buildWhatsAppMessage,
    buildArchiveWhatsAppMessage,
    appendWhatsAppMessageHistoryToken,
    buildWhatsAppHistoryMessage,
    deleteWhatsAppHistoryEntryForSuperUser,
    upsertMergedArchiveProfile,
    archiveParticipantToFirestore,
    confirmDeleteEvent,
    getLastPaymentMethodForFilter,
    spouseLinkPickResultsNew,
    spouseLinkPickResultsEdit,
    spouseIncomingIdsForEvent,
    filterParticipantRows,
    buildRosterLikeFilterPayload,
    applyRosterLikeFilters,
    applyGlobalRegistryLikeFilters,
    applyBautizadosPageFilters,
    activeRosterFilterCount,
    activeGlobalRegistryFilterCount,
    activeSummaryDashboardFilterCount,
    applySummaryLikeFilters,
    getPendingWhatsAppRowsForLocation,
    exportPendingWhatsAppToExcel,
    sleepWhatsAppAutoSend,
    runAutoSendPendingWhatsAppForLocation,
    finalizeWhatsAppQuickSend,
    finalizeCarDataWhatsAppSend,
    openCarDataWhatsAppForTitular,
  };
}
