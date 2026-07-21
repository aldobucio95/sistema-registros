/** Carga bajo demanda: export Excel (antes en useAppMainHandlers). */
import {
  ATTENDANCE_ROLE_LABELS,
  attendanceRolesFromLegacyPerson,
  formatAttendanceRolesExcelLabel,
  personHasAttendanceRole,
} from '../../../attendanceRoles.js';
import { resolveEventAttendanceConfig } from '../../../eventTypePresets.js';

export async function runExportExcel(getScope, exportScope = null) {
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
    setIsExporting(true);
    showToast("Generando archivo Excel...");

    try {
      const XLSX = await loadSheetJS();
      const wb = XLSX.utils.book_new();
      const EXCEL_SHEET_ORDER = {
        dashboard: 10,
        registroGlobal: 20,
        location: 30,
        bautizados: 100,
        acompanantes: 110,
        becados: 110,
        asistentes: 120,
        servers: 130,
        responsivas: 135,
        transporte: 150,
        cashCut: 160,
        comision: 170,
        gastos: 180,
        metadatos: 900,
        fallback: 950,
      };
      const excelSheetQueue = [];
      const enqueueExcelSheet = (order, name, ws) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
        if (!ws) return;
        excelSheetQueue.push({ order, name: String(name).substring(0, 31), ws });
      };
      const flushExcelSheetQueue = () => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
        excelSheetQueue.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'es'));
        for (const { ws } of excelSheetQueue) {
          XLSX.utils.book_append_sheet(wb, name);
        }
      };
      const isCampa = currentEvent.eventType === 'Campa';
      const isGeneral = currentEvent.eventType === 'General';
      const attendanceCfg = resolveEventAttendanceConfig(currentEvent);
      const excelEnabledRoleKeys = attendanceCfg.enabledRoleKeys;
            const exportSummary = summaryForExcelExport;
      const fullAccess = currentUser && ['Administrador', 'SuperUsuario'].includes(currentUser.role);
      const canExportSensitiveHealthCols = fullAccess;
      const includeSensitiveHealthForPerson = (p) =>
        canExportSensitiveHealthCols && String(p?.sensitiveDataConsent || '') === 'Si';
      const privacyMeta = mergePrivacyNoticeConfig(globalConfig?.privacyNotice);
      const allEventLocs = (currentEvent.locations || []).map((l) => String(l).trim()).filter(Boolean);
      const exportLocsAccessible = dashboardHasFullLocationAccess
        ? [...allEventLocs]
        : [...excelExportAccessibleLocations];
      let exportLocsForLocations = [...exportLocsAccessible];
      if (exportScope?.locations?.length) {
        const pick = new Set(exportScope.locations.map((l) => String(l).trim()).filter(Boolean));
        exportLocsForLocations = exportLocsForLocations.filter((loc) => pick.has(String(loc).trim()));
      }
      /** Registro global: todas las sedes con acceso del usuario (sin filtrar por selección del modal). */
      const exportLocsGlobal = [...exportLocsAccessible];
      /** Sedes para hojas por sede y secciones operativas según selección inicial. */
      const exportLocsOrdered = exportLocsForLocations;
      const exportLocSetGlobal = new Set(exportLocsGlobal.map((l) => String(l).trim()));
      const exportLocSet = new Set(exportLocsOrdered.map((l) => String(l).trim()));
      const locInGlobalExportScope = (loc) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
        const L = String(loc || '').trim();
        if (!L || L === '?') return exportLocsGlobal.length > 0;
        return exportLocSetGlobal.has(L);
      };
      const locInExportScope = (loc) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
        const L = String(loc || '').trim();
        if (!L || L === '?') return exportLocsOrdered.length > 0;
        return exportLocSet.has(L);
      };
      const baseNav = buildExcelExportSectionAvailability();
      const nav =
        exportScope?.sections && typeof exportScope.sections === 'object'
          ? {
              comisionTarjeta: !!exportScope.sections.comisionTarjeta && baseNav.comisionTarjeta,
              dashboard: !!exportScope.sections.dashboard && baseNav.dashboard,
              bautizados: !!exportScope.sections.bautizados && baseNav.bautizados,
              locations: !!exportScope.sections.locations && baseNav.locations,
              registroGlobal: !!exportScope.sections.registroGlobal && baseNav.registroGlobal,
              asistentes: !!exportScope.sections.asistentes && baseNav.asistentes,
              becados: !!exportScope.sections.becados && baseNav.becados,
              serversPage: !!exportScope.sections.serversPage && baseNav.serversPage,
              expenseList: !!exportScope.sections.expenseList && baseNav.expenseList,
              cashCut: !!exportScope.sections.cashCut && baseNav.cashCut,
              responsivas: !!exportScope.sections.responsivas && baseNav.responsivas,
              transporte: !!exportScope.sections.transporte && baseNav.transporte,
            }
          : baseNav;

      const exportParticipantLocKey = (p) => String(p?.location ?? '').trim();
      const listParticipantsForExportLoc = (loc, filterFn) =>
        (allParticipants || [])
          .filter((p) => {
            if (String(p.eventId) !== String(currentEvent.id)) return false;
            if (exportParticipantLocKey(p) !== String(loc).trim()) return false;
            return filterFn(p);
          })
          .sort(compareParticipantsByRegisteredAtAsc);

      const accountingFmt = '_("$"* #,##0.00_);_("$"* (#,##0.00);_("$"* "-"??_);_(@_)';
      const applyAccountingFormat = (ws, cells) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
        cells.forEach((addr) => {
          if (ws[addr] && ws[addr].t === 'n') ws[addr].z = accountingFmt;
        });
      };

      const EXCEL_MAX_COL_WCH = 84;
      const rosterExcelColumnWidthOptions = (headers) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
        const idx = (name) => (headers || []).findIndex((h) => String(h || '').trim() === name);
        const columnMin = {};
        const nombre = idx('Nombre');
        if (nombre >= 0) columnMin[nombre] = 22;
        const msg = idx('Mensaje en cola');
        if (msg >= 0) columnMin[msg] = 42;
        const wa = idx('WhatsApp');
        if (wa >= 0) columnMin[wa] = 14;
        const participante = idx('Participante');
        if (participante >= 0) columnMin[participante] = 26;
        return { columnMin, maxWidth: EXCEL_MAX_COL_WCH, padding: 3 };
      };

      const finHeaderRe =
        /costo|pagado|adeudo|monto|recaudado|donaci|balance|esperado|pendiente|liquid|precio|condon|tarjeta|efectivo|bruto|neto|comisi|saldo|abono|unitario|total|pagad/i;
      const applyFinanceFormatByHeaderRow = (ws, aoa, headerRowIndex) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
        if (!ws || !aoa?.length || !ws['!ref']) return;
        const header = aoa[headerRowIndex] || [];
        const finCols = new Set();
        header.forEach((h, i) => {
          if (h != null && finHeaderRe.test(String(h))) finCols.add(i);
        });
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = headerRowIndex + 1; R <= range.e.r; R++) {
          finCols.forEach((C) => {
            const addr = XLSX.utils.encode_cell({ r: R, c: C });
            const cell = ws[addr];
            if (cell && cell.t === 'n') cell.z = accountingFmt;
          });
        }
        for (let R = 0; R <= range.e.r; R++) {
          const aAddr = XLSX.utils.encode_cell({ r: R, c: 0 });
          const bAddr = XLSX.utils.encode_cell({ r: R, c: 1 });
          const aCell = ws[aAddr];
          const bCell = ws[bAddr];
          if (
            aCell &&
            bCell &&
            bCell.t === 'n' &&
            /costo|recaudado|donaci|adeudo|balance|esperado|pendiente|monto|precio/i.test(String(aCell.v || ''))
          ) {
            bCell.z = accountingFmt;
          }
        }
      };

      const appendSheetFromAoa = (name, aoa, opts = {}) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        applyWorksheetColumnWidths(ws, aoa, opts.columnWidthOptions ?? { maxWidth: EXCEL_MAX_COL_WCH });
        if (opts.autofilter) {
          const lastR = aoa.length - 1;
          const lastC = Math.max(0, ...aoa.map((r) => (Array.isArray(r) ? r.length - 1 : 0)));
          if (lastR >= 0 && lastC >= 0) {
            ws['!autofilter'] = {
              ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastR, c: lastC } }),
            };
          }
        }
        if (opts.financeHeaderRow != null) applyFinanceFormatByHeaderRow(ws, aoa, opts.financeHeaderRow);
        if (opts.sheetStyle === 'report') {
          applyStructuredReportSheetStyles(XLSX, ws, aoa, opts.styleOptions);
        } else if (opts.sheetStyle !== 'none') {
          applyStandardDataTableStyles(XLSX, ws, aoa, {
            headerRow: opts.headerRow ?? opts.financeHeaderRow ?? 0,
            estatusCol: opts.estatusCol ?? -1,
            waPendingCol: opts.waPendingCol ?? -1,
            estadoFinancieroCol: opts.estadoFinancieroCol ?? -1,
          });
        }
        enqueueExcelSheet(opts.sheetOrder ?? EXCEL_SHEET_ORDER.fallback, name, ws);
      };

      const metadatosRows = [
        ['Exportación Registros VNPM'],
        ['Evento', currentEvent.name || ''],
        ['Aviso privacidad (versión)', privacyMeta.version || '1.0'],
        ['Exportado por', currentUser?.username || ''],
        ['Fecha exportación', formatBrowserLocalDateTimeLabel(new Date())],
        [
          'Columnas de salud',
          canExportSensitiveHealthCols
            ? 'Solo filas con consentimiento expreso (Sí)'
            : 'Omitidas (rol sin permiso administrativo)',
        ],
        [
          'Alcance Registro global',
          exportLocsGlobal.length > 0 ? exportLocsGlobal.join(', ') : '—',
        ],
        [
          'Alcance sedes en hojas por sede',
          exportLocsOrdered.length > 0 ? exportLocsOrdered.join(', ') : '—',
        ],
      ];
      const wsMetadatos = XLSX.utils.aoa_to_sheet(metadatosRows);
      applyWorksheetColumnWidths(wsMetadatos, metadatosRows, {
        columnMin: { 0: 34, 1: 28 },
        maxWidth: EXCEL_MAX_COL_WCH,
      });
      applyKeyValueSheetStyles(XLSX, wsMetadatos, metadatosRows);
      enqueueExcelSheet(EXCEL_SHEET_ORDER.metadatos, 'Metadatos', wsMetadatos);

      const donationInExportScope = (d) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
        const loc = String(d.location || '').trim();
        if (!loc || loc === '?') return exportLocsOrdered.length > 0;
        return locInExportScope(loc);
      };

      const mergedDonationsExport = mergeEventDonationsForEvent(currentEvent.id, donations, allParticipants).filter(
        donationInExportScope
      );
      const exportDonationsTotalAll = mergedDonationsExport.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
      const exportDonationsAdditive = mergedDonationsExport
        .filter(donationAddsToRecaudacionBalance)
        .reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

      const formatRegisteredAtExcel = (raw) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
        const ms = parseFlexibleInstantMs(raw);
        if (ms == null) return '';
        try {
          return new Date(ms).toLocaleString('es-MX');
        } catch {
          return '';
        }
      };

      /** Primera pestaña: panel para simular % de comisión y alternar vista Neto/Bruto en Excel (solo datos financieros). */
      if (nav.comisionTarjeta) {
        const pmEx = exportSummary.paymentMethodTotals || {
          efectivo: { gross: 0, net: 0 },
          tarjeta: { gross: 0, net: 0 },
        };
        const efG = Number(pmEx.efectivo?.gross) || 0;
        const tg = Number(pmEx.tarjeta?.gross) || 0;
        const tn = Number(pmEx.tarjeta?.net) || 0;
        const commEx = Math.max(0, tg - tn);
        const pctComm = getCardCommissionRate() * 100;
        const paidNetRegs = Number(exportSummary.globalStats?.all?.paid) || 0;
        const paidGrossRegs = Number(exportSummary.globalStats?.all?.paidGross) || 0;
        const comRows = [];
        comRows.push(['Comisión tarjeta y vista Neto/Bruto', '']);
        comRows.push([
          'Instrucciones: edite B3 (% comisión). Las filas «RECALC» usan fórmulas. En B19 escriba Neto o Bruto para comparar totales.',
          '',
        ]);
        comRows.push(['% Comisión tarjeta (editable, ej. 4 = 4%)', pctComm]);
        comRows.push(['Efectivo acumulado (export)', efG]);
        comRows.push(['Tarjeta bruto (export)', tg]);
        comRows.push(['Tarjeta neto (export)', tn]);
        comRows.push(['Comisión tarjeta cantidad (export)', commEx]);
        comRows.push([]);
        comRows.push(['Recaudado registros NETO (export)', paidNetRegs]);
        comRows.push(['Recaudado registros BRUTO (export)', paidGrossRegs]);
        comRows.push(['Donaciones al balance (export, alcance usuario)', exportDonationsAdditive]);
        comRows.push(['Total recaudación NETO registros + donaciones (export)', paidNetRegs + exportDonationsAdditive]);
        comRows.push([]);
        comRows.push(['— Recalculado con % de B3 —', '']);
        comRows.push(['Tarjeta neto RECALC', '']);
        comRows.push(['Recaudado NETO recalc (efectivo + tarjeta neta recalc)', '']);
        comRows.push(['Recaudado BRUTO (efectivo + tarjeta bruto)', '']);
        comRows.push([]);
        comRows.push(['Vista: escriba Neto o Bruto', 'Neto']);
        comRows.push(['Recaudado registros según vista (sin sumar donaciones)', '']);

        const wsCom = XLSX.utils.aoa_to_sheet(comRows);
        wsCom['B15'] = { f: 'B5*(1-B3/100)' };
        wsCom['B16'] = { f: 'B4+B15' };
        wsCom['B17'] = { f: 'B4+B5' };
        wsCom['B20'] = { f: 'IF(TRIM(LOWER(B19))="bruto",B17,B16)' };
        applyWorksheetColumnWidths(wsCom, comRows, {
          columnMin: { 0: 48, 1: 20 },
          maxWidth: EXCEL_MAX_COL_WCH,
        });
        const finCellsCom = [];
        const refCom = wsCom['!ref'];
        if (refCom) {
          const rngCom = XLSX.utils.decode_range(refCom);
          for (let R = 2; R <= rngCom.e.r; R++) {
            const addr = XLSX.utils.encode_cell({ r: R, c: 1 });
            const c = wsCom[addr];
            if (c && (c.t === 'n' || c.f)) finCellsCom.push(addr);
          }
        }
        applyAccountingFormat(wsCom, finCellsCom);
        applyStructuredReportSheetStyles(XLSX, wsCom, comRows);
        enqueueExcelSheet(EXCEL_SHEET_ORDER.comision, 'Comision_tarjeta', wsCom);
      }

      // --- SHEET: Dashboard (solo si el menú lo permite) ---
      if (nav.dashboard) {
        const wsGeneralData = [];
        wsGeneralData.push(['Dashboard DEL EVENTO:', currentEvent.name]);
        wsGeneralData.push(['Fecha(s):', formatEventDateRangeLabel(currentEvent)]);
        wsGeneralData.push([]);
        if (hasFinancialAccess) {
          wsGeneralData.push([
            'Panel comisión: use la pestaña «Comision_tarjeta» para simular el % y ver totales Neto vs Bruto.',
            '',
          ]);
        }
        wsGeneralData.push(['MÉTRICAS PRINCIPALES (alcance de tu usuario)']);
        wsGeneralData.push(['Total Registrados', exportSummary.globalStats.all.count]);
        {
          const roleTotals = Object.fromEntries(excelEnabledRoleKeys.map((k) => [k, 0]));
          for (const p of allParticipants || []) {
            if (String(p.eventId) !== String(currentEvent.id)) continue;
            if (!participantIsActiveInEvent(p) || !participantIsActiveInRoster(p)) continue;
            if (!locInExportScope(exportParticipantLocKey(p))) continue;
            const roles = attendanceRolesFromLegacyPerson(p);
            for (const k of excelEnabledRoleKeys) {
              if (roles[k]) roleTotals[k] += 1;
            }
          }
          for (const k of excelEnabledRoleKeys) {
            wsGeneralData.push([`Total ${ATTENDANCE_ROLE_LABELS[k]}`, roleTotals[k] || 0]);
          }
        }
        wsGeneralData.push([]);

        if (hasFinancialAccess) {
          wsGeneralData.push(['DATOS FINANCIEROS GLOBALES (alcance de tu usuario)']);
          wsGeneralData.push(['Costo Base (Regular)', Number(currentPricing.global) || 0]);
          if (isCampa) {
            wsGeneralData.push(['Costo servidor Teens', Number(currentPricing.serverTeens) || 0]);
            wsGeneralData.push(['Costo servidor Jóvenes', Number(currentPricing.serverJovenes) || 0]);
            wsGeneralData.push(['Costo servidor Ambos', Number(currentPricing.serverAmbos ?? currentPricing.server) || 0]);
          }
          wsGeneralData.push(['Recaudado (Registros)', exportSummary.globalStats.all.paid]);
          wsGeneralData.push(['Donaciones (registradas, alcance sede)', exportDonationsTotalAll]);
          wsGeneralData.push(['Donaciones que suman al recaudado total (sin duplicar saldos de baja)', exportDonationsAdditive]);
          wsGeneralData.push(['Recaudado Total', exportSummary.globalStats.all.paid + exportDonationsAdditive]);
          wsGeneralData.push(['Adeudo Total Pendiente', exportSummary.globalStats.all.pending]);
          wsGeneralData.push(['Total Esperado Final', exportSummary.globalStats.all.expected]);
          wsGeneralData.push([
            'Balance Neto',
            exportSummary.globalStats.all.paid +
              exportDonationsAdditive -
              (Number(currentEvent.realCost || 0) * exportSummary.globalStats.all.count),
          ]);
          const pmDash = exportSummary.paymentMethodTotals || {};
          wsGeneralData.push([]);
          wsGeneralData.push(['Desglose por método de pago (mismo alcance que tu usuario)']);
          wsGeneralData.push(['Efectivo bruto', Number(pmDash.efectivo?.gross) || 0]);
          wsGeneralData.push(['Efectivo neto', Number(pmDash.efectivo?.net) || 0]);
          wsGeneralData.push(['Tarjeta bruto', Number(pmDash.tarjeta?.gross) || 0]);
          wsGeneralData.push(['Tarjeta neto', Number(pmDash.tarjeta?.net) || 0]);
          wsGeneralData.push([
            'Comisión tarjeta (bruto − neto, según % configurado)',
            Math.max(0, (Number(pmDash.tarjeta?.gross) || 0) - (Number(pmDash.tarjeta?.net) || 0)),
          ]);
          wsGeneralData.push([]);
        }

        wsGeneralData.push(['DESGLOSE POR SEDE (alcance de tu usuario)']);
        const tableHeaders = ['Sede', 'Inscritos'];
        for (const k of excelEnabledRoleKeys) tableHeaders.push(ATTENDANCE_ROLE_LABELS[k]);
        if (hasFinancialAccess) tableHeaders.push('Recaudado', 'Pendiente', 'Esperado Final');
        wsGeneralData.push(tableHeaders);

        exportLocsOrdered.forEach((loc) => {
          const s = exportSummary.locationStats[loc];
          if (!s) return;
          const row = [loc, s.all.count];
          const locRoleCounts = Object.fromEntries(excelEnabledRoleKeys.map((k) => [k, 0]));
          for (const p of allParticipants || []) {
            if (String(p.eventId) !== String(currentEvent.id)) continue;
            if (exportParticipantLocKey(p) !== String(loc).trim()) continue;
            if (!participantIsActiveInEvent(p) || !participantIsActiveInRoster(p)) continue;
            const roles = attendanceRolesFromLegacyPerson(p);
            for (const k of excelEnabledRoleKeys) {
              if (roles[k]) locRoleCounts[k] += 1;
            }
          }
          for (const k of excelEnabledRoleKeys) row.push(locRoleCounts[k] || 0);
          if (hasFinancialAccess) row.push(s.all.paid, s.all.pending, s.all.expected);
          wsGeneralData.push(row);
        });
        wsGeneralData.push([]);

        wsGeneralData.push(['MÉTRICAS: GÉNERO']);
        wsGeneralData.push(['Hombres', exportSummary.totalMen]);
        wsGeneralData.push(['Mujeres', exportSummary.totalWomen]);
        wsGeneralData.push(['Sin especificar', exportSummary.totalGenderUnspecified || 0]);
        wsGeneralData.push([]);

        wsGeneralData.push(['MÉTRICAS: RANGOS DE EDAD']);
        wsGeneralData.push(['Niños (< 13)', exportSummary.ageBrackets.kids]);
        wsGeneralData.push(['Adolescentes (13-17)', exportSummary.ageBrackets.teens]);
        wsGeneralData.push(['Jóvenes (18-25)', exportSummary.ageBrackets.youngAdults]);
        wsGeneralData.push(['Adultos (26-40)', exportSummary.ageBrackets.adults]);
        wsGeneralData.push(['Mayores (41+)', exportSummary.ageBrackets.seniors]);
        wsGeneralData.push(['Sin especificar', exportSummary.ageBrackets.unspecified || 0]);
        wsGeneralData.push([]);

        if (isCampa) {
          wsGeneralData.push(['MÉTRICAS: ASIGNACIÓN / SERVIDORES']);
          wsGeneralData.push(['Campistas / Servidores Asignados a Teens', exportSummary.totalMinors]);
          wsGeneralData.push(['Campistas / Servidores Asignados a Jóvenes', exportSummary.totalAdults]);
          wsGeneralData.push(['Servidores que apoyan en Ambos', exportSummary.totalServersBoth]);
          wsGeneralData.push([]);
          wsGeneralData.push(['MÉTRICAS: BAUTIZOS (conteo por segmento del evento)']);
          wsGeneralData.push(['Total bautizos (Teens + Jóvenes)', exportSummary.baptismsTeens + exportSummary.baptismsJovenes]);
          wsGeneralData.push(['Bautizos contados en Teens', exportSummary.baptismsTeens]);
          wsGeneralData.push(['Bautizos contados en Jóvenes', exportSummary.baptismsJovenes]);
          wsGeneralData.push([]);

          wsGeneralData.push(['MÉTRICAS: SALUD']);
          wsGeneralData.push(['Con Alergias', exportSummary.totalAllergies]);
          wsGeneralData.push(['Con Enfermedades', exportSummary.totalDiseases]);
          wsGeneralData.push(['Con Discapacidades', exportSummary.totalDisabilities]);
          wsGeneralData.push([]);

          wsGeneralData.push(['MÉTRICAS: NADO']);
          wsGeneralData.push(['Saben Nadar', exportSummary.totalSwimmers]);
          wsGeneralData.push(['No Saben Nadar', exportSummary.totalNonSwimmers]);
          wsGeneralData.push([]);
        }

        if (isGeneral && currentEvent.customFields && currentEvent.customFields.length > 0) {
          wsGeneralData.push(['MÉTRICAS: CAMPOS PERSONALIZADOS']);
          currentEvent.customFields.forEach((field) => {
            wsGeneralData.push([`Respuesta a: ${field}`, 'Cantidad']);
            const entries = Object.entries(exportSummary.customFieldsStats[field] || {}).sort((a, b) => b[1] - a[1]);
            entries.forEach(([val, count]) => wsGeneralData.push([val, count]));
            wsGeneralData.push([]);
          });
        }

        const wsGeneral = XLSX.utils.aoa_to_sheet(wsGeneralData);
        applyWorksheetColumnWidths(wsGeneral, wsGeneralData, {
          columnMin: { 0: 44, 1: 18 },
          maxWidth: EXCEL_MAX_COL_WCH,
        });
        if (hasFinancialAccess) {
          const financialCellsGeneral = [];
          const range = XLSX.utils.decode_range(wsGeneral['!ref']);
          for (let R = range.s.r; R <= range.e.r; R++) {
            for (let C = range.s.c; C <= range.e.c; C++) {
              const addr = XLSX.utils.encode_cell({ r: R, c: C });
              if (wsGeneral[addr] && wsGeneral[addr].t === 'n') {
                const labelAddr = XLSX.utils.encode_cell({ r: R, c: 0 });
                const label = wsGeneral[labelAddr]?.v || '';
                const isFinancialLabel = /costo|recaudado|donacion|adeudo|balance|esperado|pendiente/i.test(label);
                if (isFinancialLabel && C > 0) financialCellsGeneral.push(addr);
              }
            }
          }
          const desgIdx = wsGeneralData.findIndex((r) => r[0] === 'DESGLOSE POR SEDE (alcance de tu usuario)');
          if (desgIdx >= 0) {
            const headerRow = desgIdx + 1;
            const headers = wsGeneralData[headerRow] || [];
            const finColIndices = [];
            headers.forEach((h, ci) => {
              if (/recaudado|pendiente|esperado/i.test(h)) finColIndices.push(ci);
            });
            for (let R = headerRow + 1; R < wsGeneralData.length; R++) {
              if (!wsGeneralData[R] || wsGeneralData[R].length === 0) break;
              finColIndices.forEach((ci) => {
                const addr = XLSX.utils.encode_cell({ r: R, c: ci });
                if (wsGeneral[addr] && wsGeneral[addr].t === 'n') financialCellsGeneral.push(addr);
              });
            }
          }
          applyAccountingFormat(wsGeneral, financialCellsGeneral);
        }
        applyStructuredReportSheetStyles(XLSX, wsGeneral, wsGeneralData);
        enqueueExcelSheet(EXCEL_SHEET_ORDER.dashboard, 'Dashboard', wsGeneral);
      }

      // --- Hojas de roster (orden en cola: global → sedes → secciones temáticas) ---
      // Activos, lista de espera y cancelados en bloques separados (mismas fuentes que el registro por sede).
      const companionRelationshipExcel = (c) =>
        String(c?.relationship || c?.linkedCompanionRelationship || c?.linkedCompanionNameRelation || '').trim();

      const excelWeeklyColumnDefs = hasFinancialAccess
        ? buildExcelWeeklyAbonoColumnDefs(
            allParticipants.filter((p) => p.eventId === currentEvent.id),
            currentEvent,
            parseFlexibleInstantMs
          )
        : [];

      const exportResponsivaCol = isResponsivaEnabledForEvent(currentEvent);

      const participantExcelWaInfo = (p) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
        const loc = String(p?.location || '').trim();
        const waPhone = normalizeWhatsAppPhone(p?.phone);
        const unsent = (
          Array.isArray(p?.whatsAppFinanceNotifications) ? p.whatsAppFinanceNotifications : []
        ).filter((n) => n && !n.sent);
        const liq = getLiquidationTarget(p);
        const defaultMsg = (buildWhatsAppMessage(p, loc, liq) || '').trim();
        const { text } = buildMergedFinanceWhatsAppMessage(
          p,
          loc,
          unsent,
          currentEvent,
          getWhatsAppNotificationMarkKey,
          getLiquidationTarget,
          allParticipants
        );
        const body = (text || '').trim();
        const messageForLink = body || defaultMsg;
        const url = waPhone && messageForLink ? buildWhatsAppMeUrl(waPhone, messageForLink) : '';
        const hasPending = unsent.length > 0;
        const queueDetail = body || defaultMsg;
        return {
          url, linkText: waPhone ? 'Abrir WhatsApp' : '', queueCheckbox: excelWhatsAppPendingCheckboxDisplay(hasPending), queueDetail, };
      };

      const participantExcelCarDataWaInfo = (hostPerson) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
        const empty = { pendingLabel: '', url: '', linkText: '', message: '' };
        if (!false || !hostPerson) return empty;
        const anchor = bzEvtResolveCarDataAnchor(hostPerson, allParticipants, currentEvent);
        if (!anchor.eligible || !anchor.waRecipient || !anchor.anchorPerson) {
          return { ...empty, pendingLabel: 'No aplica' };
        }
        const inventory = bzEvtBuildFamilyCarInventory({
          hostPerson: anchor.anchorPerson,
          companions: anchor.inventoryCompanions,
          plan: currentEvent.transportPlanning,
          hostSourceKey: `p:${String(anchor.anchorPerson.id || '').trim()}`,
        });
        const needsAttention = familyCarInventoryNeedsAttention(inventory, {
          hostPerson: anchor.anchorPerson,
          companions: anchor.companionsForCrew,
        });
        if (!needsAttention) {
          return { ...empty, pendingLabel: 'No' };
        }
        const waRecipient = anchor.waRecipient;
        const loc = String(waRecipient.location || '').trim();
        const waPhone = normalizeWhatsAppPhone(waRecipient?.phone);
        const message = (
          buildCarDataRequestWhatsAppMessage({
            person: waRecipient,
            loc,
            eventSnapshot: currentEvent,
            carSlots: inventory,
            reportedAtMs: Date.now(),
            requiresPassengers: carCrewRequiresPassengerSelection(
              anchor.anchorPerson,
              anchor.companionsForCrew
            ),
            carDataSubjectContext: buildCarDataWaSubjectContext(
              anchor.anchorPerson,
              anchor.inventoryCompanions
            ),
          }) || ''
        ).trim();
        const url = waPhone && message ? buildWhatsAppMeUrl(waPhone, message) : '';
        return {
          pendingLabel: 'Sí',
          url,
          linkText: waPhone ? 'Abrir WhatsApp' : '',
          message,
        };
      };

      const participantExcelResponsivaCell = (p) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
        const card = getResponsivaCardUiState(p, currentEvent);
        if (!card.applies) return 'No aplica';
        return card.delivered ? 'Sí' : 'No';
      };

      const participantExcelAttendanceTypeLabel = (p) => {
        return formatAttendanceRolesExcelLabel(p);
      };

      const participantExcelTransportTypeLabel = (p) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
        if (!false || isDesayunoEvent) return '';
        const lineLike = p?.__bautizosCompanionExport
          ? {
              wantsBautizosTransport: p.wantsBautizosTransport,
              llegaEnCarro: p.llegaEnCarro,
              regresaEnCarro: p.regresaEnCarro,
              travelFrom: p.travelFrom,
              travelTo: p.travelTo,
              location: p.location,
              birthDate: p.birthDate,
              age: p.age,
              transportType: p.transportType,
            }
          : p;
        return resolveTransportSummary(lineLike, 'Bautizos', currentEvent);
      };

      const buildParticipantRowCore = (p) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
        if (false && p?.__bautizosCompanionExport) {
          const row = [p.name || ''];
          if (exportResponsivaCol) row.push('No aplica');
          row.push(p.phone || '', p.age ?? '', formatBirthDateExcelLabel(p.birthDate));
          row.push(
            p.gender ?? '',
            String(p.__relationship || '').trim(),
            String(p.__hostName || '').trim(),
            participantExcelTransportTypeLabel(p),
            participantExcelAttendanceTypeLabel(p)
          );
          if (hasFinancialAccess) {
            const finPad = EXCEL_ROSTER_FINANCE_COL_COUNT + excelWeeklyColumnDefs.length;
            row.push(...Array(finPad).fill(''));
          }
          return row;
        }

        const row = [p.name || ''];
        if (exportResponsivaCol) row.push(participantExcelResponsivaCell(p));
        row.push(p.phone || '', p.age ?? '', formatBirthDateExcelLabel(p.birthDate));

        if (isCampa) {
          row.push(p.gender ?? '', participantExcelAttendanceTypeLabel(p));
          if (canExportSensitiveHealthCols) {
            if (includeSensitiveHealthForPerson(p)) {
              row.push(
                p.bloodType || '',
                p.canSwim || '',
                p.hasAllergy || 'No',
                isSiValue(p.hasAllergy) ? p.allergyDetails : '',
                isSiValue(p.hasAllergy) ? (p.allergyCategory || '') : '',
                p.hasDisease || 'No',
                isSiValue(p.hasDisease) ? p.diseaseDetails : '',
                isSiValue(p.hasDisease) ? (p.diseaseMedication || '') : '',
                p.hasDisability || 'No',
                isSiValue(p.hasDisability) ? p.disabilityDetails : ''
              );
            } else {
              row.push('', '', 'No', '', '', 'No', '', '', 'No', '');
            }
          }
          row.push(
            p.emergencyContact || '',
            p.emergencyPhone || '',
            p.emergencyRelationship || '',
            personHasAttendanceRole(p, 'becado') ? 'Sí' : 'No',
            personHasAttendanceRole(p, 'servidor') ? 'Sí' : 'No',
            personHasAttendanceRole(p, 'servidor')
              ? p.serverAssignment || ''
              : p.campAssignment || '',
            personHasAttendanceRole(p, 'bautizado') ? 'Sí' : (p.willBeBaptized || 'No'),
            (() => {
              const seg = getBaptismAccountingSegment(p);
              if (seg) return seg;
              if (isSiValue(p.willBeBaptized) || personHasAttendanceRole(p, 'bautizado')) return '';
              return '';
            })()
          );
        } else if (isGeneral) {
          row.push(
            p.gender ?? '',
            participantExcelAttendanceTypeLabel(p),
            p.emergencyContact || '',
            p.emergencyPhone || '',
            p.emergencyRelationship || ''
          );
          if (currentEvent.customFields) {
            currentEvent.customFields.forEach((f) => row.push(p.customData?.[f] ?? ''));
          }
        } else {
          row.push(p.gender ?? '');
          /** Titular en Bautizos: columnas de acompañante no aplican (vacías para alinear con encabezados). */
          if (false) {
            row.push('', '', participantExcelTransportTypeLabel(p), participantExcelAttendanceTypeLabel(p));
          } else {
            row.push(participantExcelAttendanceTypeLabel(p));
          }
        }

        if (hasFinancialAccess) {
          row.push(
            ...buildParticipantExcelFinanceCells(p, {
              currentPricing,
              resolveRegisteredCost,
              getLiquidationTarget,
              isSiValue,
              computeNetAmountByMethod,
            })
          );
        }

        return row;
      };

      const buildParticipantExcelRow = (p, estatusLabel) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
        const wa = participantExcelWaInfo(p);
        const weeklyCells = hasFinancialAccess
          ? buildParticipantWeeklyAbonoCells(p, excelWeeklyColumnDefs, parseFlexibleInstantMs)
          : [];
        const lead = [estatusLabel, String(p?.location || '').trim(), wa.queueCheckbox, wa.linkText];
        return [...lead, ...buildParticipantRowCore(p), ...weeklyCells, wa.queueDetail];
      };

      const applyWhatsAppHyperlinksToWorksheet = (ws, aoa, linkTargets) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
        if (!ws || !linkTargets?.size) return;
        for (const [key, url] of linkTargets) {
          if (!url) continue;
          const [r, c] = key.split(',').map((x) => parseInt(x, 10));
          if (!Number.isFinite(r) || !Number.isFinite(c)) continue;
          const addr = XLSX.utils.encode_cell({ r, c });
          const row = aoa[r];
          if (!row || row.length === 0) continue;
          const label = String(row[c] ?? '').trim() || 'Abrir WhatsApp';
          ws[addr] = {
            t: 's',
            v: label,
            l: { Target: url, Tooltip: 'Abrir WhatsApp (mensaje en cola o mensaje por defecto)' },
          };
          applyExcelHyperlinkCellStyle(ws, addr);
        }
      };

      const buildLocHeaders = () => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
        const h = ['Estatus', 'Sede', '¿Whatsapp pendiente?', 'WhatsApp', 'Nombre'];
        if (exportResponsivaCol) h.push('Responsiva entregada');
        h.push('Teléfono', 'Edad', 'Fecha nacimiento');
        if (isCampa) {
          h.push('Género', 'Tipo de asistencia');
          if (canExportSensitiveHealthCols) {
            h.push(
              'Tipo Sangre',
              'Nado',
              'Alergias',
              'Detalle Alergias',
              'Tipo Alergias',
              'Enfermedades',
              'Detalle Enfermedades',
              'Medicamento Requerido',
              'Discapacidades',
              'Detalle Discapacidades'
            );
          }
          h.push(
            'Contacto Emergencia',
            'Tel Emergencia',
            'Parentesco emergencia',
            'Becado',
            'Servidor',
            'Asignación',
            'Bautizo',
            'Bautizo conteo en'
          );
        } else if (isGeneral) {
          h.push('Género', 'Tipo de asistencia', 'Contacto Emergencia', 'Tel Emergencia', 'Parentesco emergencia');
          if (currentEvent.customFields) h.push(...currentEvent.customFields);
        } else {
          h.push('Género');
          if (false) {
            h.push('Parentesco', 'Inscrito (titular)', 'Tipo de transporte', 'Tipo de asistencia');
          } else {
            h.push('Tipo de asistencia');
          }
        }
        if (hasFinancialAccess) {
          h.push(
            'Costo Base Total',
            'Pagado',
            'Devolución',
            'Adeudo Pendiente',
            'Estado Financiero',
            'Pagado bruto (hist.)',
            'Pagado neto (hist.)',
            'Efectivo bruto (hist.)',
            'Tarjeta bruto (hist.)',
            'Comisión tarjeta (hist.)'
          );
          excelWeeklyColumnDefs.forEach((w) => h.push(w.label));
        }
        h.push('Mensaje en cola');
        return h;
      };

      const locHeadersTemplate = buildLocHeaders();
      const whatsAppExcelColIndex = locHeadersTemplate.indexOf('WhatsApp');
      const waPendingExcelColIndex = locHeadersTemplate.indexOf('¿Whatsapp pendiente?');
      const estadoFinExcelColIndex = locHeadersTemplate.indexOf('Estado Financiero');
      const normalizeParticipantExcelRow = (cells) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
        const out = cells.map((v) => (v == null || v === undefined ? '' : v));
        while (out.length < locHeadersTemplate.length) out.push('');
        return out.slice(0, locHeadersTemplate.length);
      };

      const rosterForBautizosCanonExport = false
        ? allParticipants.filter(
            (p) =>
              p.eventId === currentEvent.id &&
              participantIsActiveInEvent(p) &&
              participantIsActiveInRoster(p) &&
              !participantIsCancelled(p)
          )
        : [];
      const bautizosCanonPlanExport = false
        ? bzEvtBuildCanonicalCompanionPlan(
            rosterForBautizosCanonExport,
            buildActiveRegistrantMetaForCompanionDedupe(rosterForBautizosCanonExport),
            { includeBaptizedCompanions: true }
          )
        : null;

      if (nav.bautizados) {
        const eventId = currentEvent.id;
        const et = currentEvent.eventType;
        const ageTxt = (p) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
          const fromBirth = p?.birthDate && String(p.birthDate).trim() ? calculateAgeFromBirthDate(p.birthDate) : '';
          if (fromBirth) return `${fromBirth} años`;
          if (p?.age != null && String(p.age).trim() !== '') return `${String(p.age).trim()} años`;
          return '';
        };
        const bzHead = ['Sede', 'Nombre', 'Fecha nacimiento', 'Edad', 'Género', 'Talla playera'];
        if (isCampa) bzHead.push('Segmento conteo bautizo');
        bzHead.push('Teléfono', 'Correo', 'ID VNPM', 'Fecha registro');
                bzHead.push('Notas');
        const bzRows = [bzHead];
        const pushBzIfVisible = (p, notes) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
          const loc = String(p.location || '').trim();
          if (!loc || !locInExportScope(loc)) return;
          const seg =
            isCampa && typeof getBaptismAccountingSegment === 'function' ? getBaptismAccountingSegment(p) : '';
          const row = [
            loc,
            p.name || '',
            formatBirthDateExcelLabel(p.birthDate),
            ageTxt(p),
            String(p.gender || '').trim(),
            normalizeBaptismShirtSize(p.baptismShirtSize) || '',
          ];
          if (isCampa) {
            row.push(seg === 'Teens' || seg === 'Jóvenes' ? seg : '');
          }
          row.push(
            String(p.phone || '').trim(),
            String(p.email || '').trim(),
            String(p.vnpPersonId || '').trim(),
            formatRegisteredAtExcel(p?.registeredAt)
          );
                    row.push(notes || '');
          bzRows.push(row);
        };
        for (const p of allParticipants) {
          if (p.eventId !== eventId || !participantIsActiveInEvent(p)) continue;
          if (!participantIsActiveInRoster(p)) continue;
          if (!participantHasBaptismChip(p, et)) continue;
          pushBzIfVisible(p, '');
        }
                appendSheetFromAoa('Bautizados', bzRows, { autofilter: true, sheetOrder: EXCEL_SHEET_ORDER.bautizados });
      }

      if (nav.asistentes) {
        const asHead = [
          'Sede',
          'Nombre',
          'Fecha nacimiento',
          'Teléfono',
          'Correo',
          'Género',
          'Transporte evento',
          'Sale de',
          'Regresa a',
          'ID VNPM',
          'Fecha registro',
        ];
        const asRows = [asHead];
        for (const p of allParticipants) {
          if (p.eventId !== currentEvent.id) continue;
          if (!participantIsActiveInEvent(p) || !participantIsActiveInRoster(p)) continue;
          if (bzEvtNormalizeAttendanceType(p.bautizosAttendanceType) !== BAUTIZOS_ATTENDANCE.asistente) continue;
          const loc = String(p.location || '').trim();
          if (!locInExportScope(loc)) continue;
          const saleLoc = p.travelFrom || p.location || '?';
          const regresaLoc = p.travelTo || p.location || '?';
          const saleTxt = resolveLlegaEnCarro(p) ? `${saleLoc} (auto)` : saleLoc;
          const regresaTxt = resolveRegresaEnCarro(p) ? `${regresaLoc} (auto)` : regresaLoc;
          asRows.push([
            loc,
            p.name || '',
            formatBirthDateExcelLabel(p.birthDate),
            String(p.phone || '').trim(),
            String(p.email || '').trim(),
            String(p.gender || '').trim(),
            isSiValue(p.wantsBautizosTransport) ? 'Sí' : 'No',
            saleTxt,
            regresaTxt,
            String(p.vnpPersonId || '').trim(),
            formatRegisteredAtExcel(p?.registeredAt),
          ]);
        }
        appendSheetFromAoa('Asistentes', asRows, { autofilter: true, sheetOrder: EXCEL_SHEET_ORDER.asistentes });
      }

      if (nav.serversPage) {
        const srvHead = false
          ? [
              'Nombre',
              'Fecha nacimiento',
              'Teléfono',
              'Correo',
              'Sede',
              'Tipo asistencia',
              'Participa como servidor',
              'Área deseada',
              'Sirvió otro campa',
              'Áreas previas',
              'Sirve en congre',
              'Casado / Pareja',
              'Hijos',
              'Sale de',
              'Regresa a',
              'Área para servir',
            ]
          : [
              'Nombre',
              'Fecha nacimiento',
              'Teléfono',
              'Correo',
              'Sede',
              'Asignación',
              'Área deseada',
              'Sirvió otro campa',
              'Áreas previas',
              'Sirve en congre',
              'Casado / Pareja',
              'Hijos',
              'Sale de',
              'Regresa a',
              'Área para servir',
            ];
        const srvData = [srvHead];
        const basePool = false
          ? collectBautizosParticipatingServerRows(
              allParticipants.filter(
                (p) =>
                  p.eventId === currentEvent.id &&
                  participantIsActiveInEvent(p) &&
                  participantIsActiveInRoster(p)
              )
            )
          : allParticipants.filter(
              (p) =>
                p.eventId === currentEvent.id &&
                participantIsActiveInEvent(p) &&
                participantIsActiveInRoster(p) &&
                isSiValue(p.isServer)
            );
        for (const p of basePool) {
          const loc = p.location || '';
          if (!locInExportScope(String(loc).trim())) continue;
          const saleLoc = p.travelFrom || p.location || '?';
          const regresaLoc = p.travelTo || p.location || '?';
          const saleTxt = resolveLlegaEnCarro(p) ? `${saleLoc} (auto)` : saleLoc;
          const regresaTxt = resolveRegresaEnCarro(p) ? `${regresaLoc} (auto)` : regresaLoc;
          const congTxt = isSiValue(p.servesInCongress)
            ? `${SI_LABEL}${p.congressServeArea && String(p.congressServeArea).trim() ? ` (${String(p.congressServeArea).trim()})` : ''}`
            : 'No';
          const assignmentCol = false
            ? [bzEvtAttendanceTypeLabel(p), formatSiNo(p.isServer)]
            : [p.serverAssignment || '?'];
          srvData.push([
            p.name || '',
            formatBirthDateExcelLabel(p.birthDate),
            String(p.phone || '').trim(),
            String(p.email || '').trim(),
            loc,
            ...assignmentCol,
            p.preferredServeArea || '?',
            p.servedOtherCampa || 'No',
            p.servedAreas || '?',
            congTxt,
            [p.spouseName, p.spousePhone].filter(Boolean).join(' · ') || '—',
            isSiValue(p.goesWithChildren)
              ? `${p.childrenCount != null && p.childrenCount !== '' ? p.childrenCount : '?'} hijo(s)`
              : '—',
            saleTxt,
            regresaTxt,
            String(p.assignedServeArea || '').trim() || '—',
          ]);
        }
        appendSheetFromAoa(false ? 'Servidores_y_Empleados' : 'Servidores', srvData, {
          autofilter: true,
          financeHeaderRow: null,
          sheetOrder: EXCEL_SHEET_ORDER.servers,
        });
      }

      if (nav.becados && !false) {
        const eventId = currentEvent.id;
        const approvedRaw = [];
        for (const p of allParticipants) {
          if (p.eventId !== eventId || !participantIsActiveInEvent(p) || !isSiValue(p.isScholarship)) continue;
          if (participantIsActiveInRoster(p)) approvedRaw.push(p);
        }
        const becRows = [
          [
            'Nombre',
            'Fecha nacimiento',
            'Teléfono',
            'Sede',
            'Tipo beca',
            'Costo lista',
            'Condonado (beca)',
            'ID VNPM',
            'Fecha registro',
            'Método pago',
            'Pagado',
          ],
        ];
        for (const p of approvedRaw) {
          const loc = p.location || p.travelFrom || p.travelTo || '?';
          if (locInExportScope(String(loc).trim())) {
            const tipo = p.scholarshipType === 'partial' ? 'Beca parcial' : 'Beca total';
            becRows.push([
              p.name || '',
              formatBirthDateExcelLabel(p.birthDate),
              String(p.phone || '').trim(),
              loc,
              tipo,
              resolveRegisteredCost(p, currentPricing),
              getScholarshipCondonedAmount(p),
              String(p.vnpPersonId || '').trim(),
              formatRegisteredAtExcel(p?.registeredAt),
              hasFinancialAccess ? String(p.paymentMethod || '').trim() : '',
              hasFinancialAccess ? parseFloat(p.paid || 0) || 0 : '',
            ]);
          }
        }
        appendSheetFromAoa('Becados', becRows, { autofilter: true, financeHeaderRow: 0, sheetOrder: EXCEL_SHEET_ORDER.becados });
      }

      if (nav.becados && false && bautizosCanonPlanExport) {
        const acHead = ['Sede', 'Nombre', 'Fecha nacimiento', 'Parentesco', 'Inscrito titular', 'Teléfono', 'Edad', 'Género'];
        const acRows = [acHead];
        for (const info of bautizosCanonPlanExport.values()) {
          const c = info.sourceCompanion;
          const host = info.sourceRegistrant;
          if (!c || !host) continue;
          const loc = String(host.location || '').trim();
          if (!loc || !locInExportScope(loc)) continue;
          acRows.push([
            loc,
            String(c.name || '').trim() || '—',
            formatBirthDateExcelLabel(c.birthDate),
            companionRelationshipExcel(c),
            String(host.name || '').trim() || '—',
            String(c.phone || '').trim() || '',
            c.age != null && String(c.age).trim() !== '' ? String(c.age).trim() : '',
            String(c.gender || '').trim() || '',
          ]);
        }
        appendSheetFromAoa('Acompañantes', acRows, { autofilter: true, sheetOrder: EXCEL_SHEET_ORDER.acompanantes });
      }

      if (nav.responsivas) {
        const rdHead = [
          'Nombre',
          'Fecha nacimiento',
          'Sede',
          'Tipo entrega',
          'Fase digital',
          'Firmante (si consta)',
          'Marca de tiempo (firma/registro)',
        ];
        const rdRows = [rdHead];
        for (const p of allParticipants) {
          if (p.eventId !== currentEvent.id) continue;
          const card = getResponsivaCardUiState(p, currentEvent);
          if (!card.applies || !card.delivered) continue;
          const loc = String(p.location || '').trim();
          if (!locInExportScope(loc)) continue;
          const tipo =
            card.deliveredKind === 'digital'
              ? 'Firma digital'
              : card.deliveredKind === 'local'
                ? 'Firma en sitio'
                : 'Manual / estado';
          const rd = p?.responsivaDigital && typeof p.responsivaDigital === 'object' ? p.responsivaDigital : {};
          const tsRaw = rd.submittedAt ?? rd.signedAt ?? rd.recordedAt ?? rd.signedLocallyAt ?? '';
          rdRows.push([
            p.name || '',
            formatBirthDateExcelLabel(p.birthDate),
            loc || '?',
            tipo,
            card.digitalPhase || '—',
            String(rd.signerName || '').trim() || '—',
            tsRaw !== '' && tsRaw != null ? Number(tsRaw) : '',
          ]);
        }
        appendSheetFromAoa('Responsivas', rdRows, { autofilter: true, sheetOrder: EXCEL_SHEET_ORDER.responsivas });
      }

      if (nav.transporte) {
        const eventLocsList = currentEvent.locations || [];
        const rosterTransport = (allParticipants || []).filter((p) => String(p.eventId) === String(currentEvent.id));
        const { busLines, carLines } = buildTransportPlanningLines(
          rosterTransport,
          currentEvent.eventType,
          eventLocsList,
          currentEvent
        );
        const splitCampaBySubevent = isCampa && countAmbosDoubleInAllCounts !== false;
        const busSections = buildBusGroupSections(busLines, eventLocsList, isCampa, splitCampaBySubevent);
        const lineInExportScope = (line) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
          const loc = String(line?.location || '').trim();
          if (!loc || loc === '—') return exportLocsOrdered.length > 0;
          return locInExportScope(loc);
        };
        const trRows = [];
        trRows.push(['Transporte (planificación)', currentEvent.name]);
        trRows.push([
          'Alcance',
          fullAccess ? 'Evento completo' : `Sedes: ${exportLocsOrdered.join(', ') || '—'}`,
        ]);
        trRows.push([]);
        trRows.push(['Camión / transporte del evento']);
        trRows.push(['Bloque', 'Nombre', 'Tipo', 'Sede inscrito', 'Origen (camión)']);
        for (const sec of busSections) {
          const pass = passengersForBusGroup(busLines, sec);
          const scoped = pass.filter(lineInExportScope);
          if (scoped.length === 0) continue;
          trRows.push([String(sec.title || '').trim() || '—']);
          for (const line of scoped) {
            trRows.push([
              String(sec.title || '').trim() || '—',
              String(line.name || '').trim() || '—',
              line.kind === 'companion' ? 'Acompañante' : 'Inscrito',
              String(line.location || '').trim() || '—',
              String(line.busSede || '').trim() || '—',
            ]);
          }
          trRows.push([]);
        }
        trRows.push(['Llegada en carro / familiar']);
        const transportCarWaColIndex = false ? 5 : -1;
        const transportCarWaLinkTargets = new Map();
        const hostByIdForTransport = new Map();
        for (const p of rosterTransport) {
          const hid = String(p?.id || '').trim();
          if (hid) hostByIdForTransport.set(hid, p);
        }
        if (false) {
          trRows.push([
            'Sede inscrito',
            '¿Datos carro pendiente?',
            'Nombre',
            'Tipo',
            'Carros llegada',
            'WhatsApp',
            'Mensaje datos carro',
          ]);
        } else {
          trRows.push(['Sede inscrito', 'Nombre', 'Tipo', 'Carros llegada']);
        }
        for (const line of carLines || []) {
          if (!lineInExportScope(line)) continue;
          const hostId =
            String(line.hostId || '').trim() ||
            (line.kind === 'participant' ? String(line.sourceKey || '').replace(/^p:/, '') : '');
          const hostPerson = hostId ? hostByIdForTransport.get(hostId) : null;
          if (false) {
            const carWa = hostPerson
              ? participantExcelCarDataWaInfo(hostPerson)
              : { pendingLabel: '', url: '', linkText: '', message: '' };
            const isTitular = line.kind === 'participant';
            const rowIndex = trRows.length;
            trRows.push([
              String(line.location || '').trim() || '—',
              carWa.pendingLabel || '',
              String(line.name || '').trim() || '—',
              line.kind === 'companion' ? 'Acompañante' : 'Inscrito',
              line.carrosLlegada != null && line.carrosLlegada !== '' ? String(line.carrosLlegada) : '',
              isTitular ? carWa.linkText : '',
              isTitular ? carWa.message : '',
            ]);
            if (isTitular && carWa.url && transportCarWaColIndex >= 0) {
              transportCarWaLinkTargets.set(`${rowIndex},${transportCarWaColIndex}`, carWa.url);
            }
          } else {
            trRows.push([
              String(line.location || '').trim() || '—',
              String(line.name || '').trim() || '—',
              line.kind === 'companion' ? 'Acompañante' : 'Inscrito',
              line.carrosLlegada != null && line.carrosLlegada !== '' ? String(line.carrosLlegada) : '',
            ]);
          }
        }
        const wsTransport = XLSX.utils.aoa_to_sheet(trRows);
        if (transportCarWaLinkTargets.size) {
          applyWhatsAppHyperlinksToWorksheet(wsTransport, trRows, transportCarWaLinkTargets);
        }
        applyWorksheetColumnWidths(wsTransport, trRows, {
          columnMin: { 0: 20, 1: 16, 4: 14, 6: 44 },
          maxWidth: EXCEL_MAX_COL_WCH,
        });
        applyStructuredReportSheetStyles(XLSX, wsTransport, trRows);
        enqueueExcelSheet(EXCEL_SHEET_ORDER.transporte, 'Transporte', wsTransport);
      }

      if (nav.cashCut) {
        const allPaymentsRaw = collectCashCutAllPayments(
          allParticipants,
          currentEvent,
          computeNetAmountByMethod,
          exportLocsOrdered,
          resolveCashCutRefundServiceLabel
        );
        const paymentsScoped = allPaymentsRaw.filter((p) => locInExportScope(String(p._loc || '').trim()));
        const eventDonationsForCut = donations
          .filter(
            (d) =>
              d.eventId === currentEvent.id &&
              donationAddsToRecaudacionBalance(d) &&
              !d.fromArchivedManualCredit
          )
          .filter(donationInExportScope);

        const { weekKeys, sundayKeys, weekMap, sundayMap } = buildCashCutWeekAndSundayMaps(
          paymentsScoped,
          eventDonationsForCut,
          computeNetAmountByMethod
        );

        const byLoc = new Map();
        const bumpLoc = (locKey, bruto, net, method) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
          const loc = String(locKey || '').trim() || '?';
          if (!byLoc.has(loc)) byLoc.set(loc, { bruto: 0, neto: 0, ef: 0, tar: 0, don: 0 });
          const o = byLoc.get(loc);
          o.bruto += bruto;
          o.neto += net;
          if (method === 'Tarjeta') o.tar += bruto;
          else o.ef += bruto;
        };
        paymentsScoped.forEach((p) => {
          const amt = parseFloat(p.amount) || 0;
          const net = parseFloat(p.netAmount ?? p.amount) || 0;
          bumpLoc(p._loc, amt, net, p.method);
        });
        eventDonationsForCut.forEach((d) => {
          const loc = String(d.location || '').trim() || '?';
          const amt = parseFloat(d.amount) || 0;
          if (!byLoc.has(loc)) byLoc.set(loc, { bruto: 0, neto: 0, ef: 0, tar: 0, don: 0 });
          const o = byLoc.get(loc);
          o.don += amt;
          o.bruto += amt;
          o.neto += amt;
        });

        const scopeLabel = fullAccess
          ? 'Alcance: evento completo (administrador)'
          : `Alcance: sedes permitidas — ${exportLocsOrdered.join(', ') || '—'}`;

        const { rows: cutRows, meta: cutMeta } = buildCashCutExcelSheet({
          eventName: currentEvent.name, generatedAtLabel: formatBrowserLocalDateTimeLabel(new Date()), parseInstant: parseFlexibleInstantMs, sundayKeys, sundayMap, weekKeys, weekMap, byLoc, formatWeekLabel: formatCashCutWeekRangeLabel, });

        const wsCut = XLSX.utils.aoa_to_sheet(cutRows);
        applyWorksheetColumnWidths(wsCut, cutRows, {
          columnMin: { 0: 22, 1: 14, 2: 28, 3: 22, 4: 18, 5: 12, 6: 14, 7: 12, 8: 14, 9: 20 }, });
        cutMeta.financeHeaderRows.forEach((idx) => {
          if (idx >= 0) applyFinanceFormatByHeaderRow(wsCut, cutRows, idx);
        });
        applyCashCutSheetStyles(XLSX, wsCut, cutMeta);
        enqueueExcelSheet(EXCEL_SHEET_ORDER.cashCut, 'Corte_caja', wsCut);
      }

      if (nav.expenseList) {
        const eventId = currentEvent.id;
        const suppressed = new Set(currentEvent?.expenseListSuppressedIds || []);
        const plainExpenses = expenses.filter(
          (e) => e.eventId === eventId && !isDerivedAutoExpenseIdForEvent(e.id, eventId)
        );
        const schComputed = computeScholarshipAutoExpenseRows(eventId);
        const manualComputed = computeManualCostCreditExpenseRows(eventId);
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
          ...scholarshipAutoExpenses.map((e) => e.id), ...manualCostCreditAutoExpenses.map((e) => e.id), ]);
        const orphanDerivedExpenses = expenses.filter(
          (e) =>
            e.eventId === eventId &&
            isDerivedAutoExpenseIdForEvent(e.id, eventId) &&
            !mergedDerivedIds.has(e.id)
        );
        const eventExpenses = [
          ...plainExpenses, ...scholarshipAutoExpenses, ...manualCostCreditAutoExpenses, ...orphanDerivedExpenses, ].filter((e) => canSeeExpenseConceptForRow(e));
        const expRows = [
          [
            'Concepto',
            'Cantidad',
            'Precio unitario',
            'Total',
            'Pagado',
            'Pendiente',
            'Pagado (sí/no)',
            'En totales (sí/no)',
          ], ];
        for (const exp of eventExpenses) {
          const pending = (exp.totalPrice || 0) - (exp.paidAmount || 0);
          expRows.push([
            canSeeExpenseConceptForRow(exp) ? exp.name || '?' : MASKED_EXPENSE_CONCEPT_LABEL,
            exp.quantity ?? '',
            exp.unitPrice ?? 0,
            exp.totalPrice ?? 0,
            exp.paidAmount ?? 0,
            pending,
            exp.paid ? 'Sí' : 'No',
            (exp.countInTotals ?? true) ? 'Sí' : 'No',
          ]);
        }
        appendSheetFromAoa('Lista_de_gastos', expRows, {
          autofilter: true, financeHeaderRow: 0, sheetOrder: EXCEL_SHEET_ORDER.gastos, });
      }

      if (nav.registroGlobal) {
        const eventLocs = new Set((currentEvent.locations || []).map((x) => String(x).trim()).filter(Boolean));
        const globalExportPool = allParticipants.filter((p) => {
          if (p.eventId !== currentEvent.id) return false;
          const status = p?.status || 'active';
          if (status === PARTICIPANT_STATUS_ARCHIVED) return false;
          if (!(status === 'active' || status === 'waitlist' || status === PARTICIPANT_STATUS_CANCELLED)) return false;
          const locRaw = String(p.location ?? '').trim();
          const validLoc = locRaw && eventLocs.has(locRaw);
          if (validLoc && !locInGlobalExportScope(locRaw)) return false;
          return true;
        });
        const gData = [[...locHeadersTemplate]];
        const globalWaLinkTargets = new Map();
        const catFor = (p) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
          if (participantIsCancelled(p)) return 'Cancelado';
          if (participantIsWaitlistRow(p)) return 'Lista de espera';
          if (false && participantIsActiveInRoster(p) && isSiValue(p.isScholarship)) return 'Becado (activo)';
          return 'Inscrito (activo)';
        };
        const sortGroupFor = (p) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
          if (participantIsCancelled(p)) return 4;
          if (participantIsWaitlistRow(p)) return 3;
          if (false && p?.__bautizosCompanionExport) return 2;
          if (false && participantIsActiveInRoster(p) && !participantIsWaitlistRow(p) && isSiValue(p.isScholarship)) {
            return 1;
          }
          return 0;
        };
        const entries = [];
        for (const p of globalExportPool) {
          entries.push({ p, g: sortGroupFor(p) });
        }
        if (false && bautizosCanonPlanExport) {
          for (const info of bautizosCanonPlanExport.values()) {
            const host = info.sourceRegistrant;
            if (!host) continue;
            const locRaw = String(host.location ?? '').trim();
            if (!eventLocs.has(locRaw)) continue;
            if (!locInGlobalExportScope(locRaw)) continue;
            const c = info.sourceCompanion;
            if (!c) continue;
            const syn = {
              __bautizosCompanionExport: true,
              location: host.location,
              name: String(c.name || '').trim(),
              birthDate: c.birthDate || '',
              phone: c.phone || '',
              age: c.age != null && String(c.age).trim() !== '' ? String(c.age).trim() : '',
              gender: c.gender || '',
              __relationship: companionRelationshipExcel(c),
              __hostName: String(host.name || '').trim(),
              registeredAt: host.registeredAt,
              id: String(info.canonKey || `c:${host.id}`),
              wantsBautizosTransport: c.wantsBautizosTransport,
              llegaEnCarro: c.llegaEnCarro,
              regresaEnCarro: c.regresaEnCarro,
              travelFrom: c.travelFrom || host.travelFrom,
              travelTo: c.travelTo || host.travelTo,
              transportType: c.transportType || host.transportType,
            };
            entries.push({ p: syn, g: 2 });
          }
        }
        entries.sort((a, b) => {
          if (a.g !== b.g) return a.g - b.g;
          return compareParticipantsByRegisteredAtAsc(a.p, b.p);
        });
        for (const { p } of entries) {
          const estado =
            p?.__bautizosCompanionExport
              ? 'Acompañante'
              : catFor(p);
          const rowIndex = gData.length;
          const wa = participantExcelWaInfo(p);
          if (wa.url && whatsAppExcelColIndex >= 0) {
            globalWaLinkTargets.set(`${rowIndex},${whatsAppExcelColIndex}`, wa.url);
          }
          gData.push(normalizeParticipantExcelRow(buildParticipantExcelRow(p, estado)));
        }
        const wsGlobal = XLSX.utils.aoa_to_sheet(gData);
        applyWhatsAppHyperlinksToWorksheet(wsGlobal, gData, globalWaLinkTargets);
        applyWorksheetColumnWidths(wsGlobal, gData, rosterExcelColumnWidthOptions(locHeadersTemplate));
        applyFinanceFormatByHeaderRow(wsGlobal, gData, 0);
        const gLastRow = gData.length - 1;
        const gLastCol = locHeadersTemplate.length - 1;
        if (gLastRow >= 0 && gLastCol >= 0) {
          wsGlobal['!autofilter'] = {
            ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: gLastRow, c: gLastCol } }),
          };
        }
        const globalSheetName = 'Registro_global'.substring(0, 31);
        applyRosterSheetStyles(XLSX, wsGlobal, {
          estatusCol: 0, aoa: gData, });
        enqueueExcelSheet(EXCEL_SHEET_ORDER.registroGlobal, globalSheetName, wsGlobal);
      }

      if (nav.locations) {
        exportLocsOrdered.forEach((loc) => {
          const activeParticipants = listParticipantsForExportLoc(
            loc, (p) => participantIsRosterRow(p) && !participantIsCancelled(p)
          );
          const waitlistParticipants = listParticipantsForExportLoc(loc, participantIsWaitlistRow);
          const cancelledParticipants = listParticipantsForExportLoc(loc, participantIsCancelled);

          const locHeaders = [...locHeadersTemplate];
          const locData = [locHeaders];
          const locWaLinkTargets = new Map();
          let pendingSectionGap = false;

          const pushSection = (categoryLabel, participants) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
            if (participants.length === 0) return;
            if (pendingSectionGap) locData.push([]);
            pendingSectionGap = true;
            participants.forEach((p) => {
              const rowIndex = locData.length;
              const wa = participantExcelWaInfo(p);
              if (wa.url && whatsAppExcelColIndex >= 0) {
                locWaLinkTargets.set(`${rowIndex},${whatsAppExcelColIndex}`, wa.url);
              }
              locData.push(normalizeParticipantExcelRow(buildParticipantExcelRow(p, categoryLabel)));
            });
          };

          if (false && bautizosCanonPlanExport) {
            const hostsHere = new Set(
              (activeParticipants || []).map((p) => String(p.id || '').trim()).filter(Boolean)
            );
            const companionRows = [];
            for (const info of bautizosCanonPlanExport.values()) {
              const host = info.sourceRegistrant;
              const hid = String(host?.id || '').trim();
              if (!hid || !hostsHere.has(hid)) continue;
              const c = info.sourceCompanion;
              if (!c) continue;
              companionRows.push({
                __bautizosCompanionExport: true,
                name: String(c.name || '').trim(),
                birthDate: c.birthDate || '',
                phone: c.phone || '',
                age: c.age != null && String(c.age).trim() !== '' ? String(c.age).trim() : '',
                gender: c.gender || '',
                __relationship: companionRelationshipExcel(c),
                __hostName: String(host.name || '').trim(),
                location: host.location,
                wantsBautizosTransport: c.wantsBautizosTransport,
                llegaEnCarro: c.llegaEnCarro,
                regresaEnCarro: c.regresaEnCarro,
                travelFrom: c.travelFrom || host.travelFrom,
                travelTo: c.travelTo || host.travelTo,
                transportType: c.transportType || host.transportType,
              });
            }
            const actNoBeca = activeParticipants.filter((p) => !isSiValue(p.isScholarship));
            const actBeca = activeParticipants.filter((p) => isSiValue(p.isScholarship));
            pushSection('Inscrito (activo)', actNoBeca);
            pushSection('Becado (activo)', actBeca);
            pushSection('Acompañante', companionRows);
          } else {
            pushSection('Inscrito (activo)', activeParticipants);
          }
          pushSection('Lista de espera', waitlistParticipants);
          pushSection('Cancelado', cancelledParticipants);

          const sheetName = `Sede ${loc}`.substring(0, 31);
          const wsLoc = XLSX.utils.aoa_to_sheet(locData);
          applyWhatsAppHyperlinksToWorksheet(wsLoc, locData, locWaLinkTargets);
          applyWorksheetColumnWidths(wsLoc, locData, rosterExcelColumnWidthOptions(locHeaders));
          applyFinanceFormatByHeaderRow(wsLoc, locData, 0);

          if (hasFinancialAccess) {
            const finHeaders = [
              'Costo Base Total',
              'Pagado',
              'Devolución',
              'Adeudo Pendiente',
              ...excelWeeklyColumnDefs.map((w) => w.label),
            ];
            const finColIndices = [];
            locHeaders.forEach((h, ci) => {
              if (finHeaders.includes(h)) finColIndices.push(ci);
            });
            const financialCellsLoc = [];
            for (let R = 0; R < locData.length; R++) {
              const row = locData[R];
              if (!row || row.length === 0) continue;
              if (R === 0 || row.length !== locHeaders.length) continue;
              finColIndices.forEach((ci) => {
                const addr = XLSX.utils.encode_cell({ r: R, c: ci });
                if (wsLoc[addr] && wsLoc[addr].t === 'n') financialCellsLoc.push(addr);
              });
            }
            applyAccountingFormat(wsLoc, financialCellsLoc);
          }

          const locLastRow = locData.length - 1;
          const locLastCol = locHeaders.length - 1;
          if (locLastRow >= 0 && locLastCol >= 0) {
            wsLoc['!autofilter'] = {
              ref: XLSX.utils.encode_range({
                s: { r: 0, c: 0 },
                e: { r: locLastRow, c: locLastCol },
              }),
            };
          }

          applyRosterSheetStyles(XLSX, wsLoc, {
            estatusCol: 0,
            waPendingCol: waPendingExcelColIndex,
            estadoFinancieroCol: estadoFinExcelColIndex,
            aoa: locData,
          });
          const locSheetOrder = EXCEL_SHEET_ORDER.location + exportLocsOrdered.indexOf(loc);
          enqueueExcelSheet(locSheetOrder, sheetName, wsLoc);
        });
      }

      if (!excelSheetQueue.length) {
        appendSheetFromAoa('Export', [['No hay secciones del menú lateral habilitadas para exportar con tu usuario.']], {
          sheetOrder: EXCEL_SHEET_ORDER.fallback,
        });
      }

      flushExcelSheetQueue();

      const excelFilename = buildExcelExportFilename(currentEvent.name, exportLocsOrdered, {
        allEventLocCount: allEventLocs.length,
        exportScope,
      });
      const outXlsx = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      downloadExcelBytes(outXlsx, excelFilename);
      
      // Registrar log de la exportación
      const scopeNote = exportScope?.locations?.length
        ? ` Sedes: ${exportLocsOrdered.join(', ')}.`
        : '';
      await addLog(
        'Exportación de Datos',
        `Descargó Excel del evento (secciones del menú y sedes según permisos del usuario).${scopeNote}`
      );
      
      showToast("Archivo Excel generado con éxito.");

    } catch (err) {
      console.error(err);
      showToast("Hubo un error al generar el archivo de exportación.");
    } finally {
      setIsExporting(false);
    }
}
