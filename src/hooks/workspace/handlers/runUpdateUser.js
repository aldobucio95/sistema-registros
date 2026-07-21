/** Carga bajo demanda: actualizar usuario. */
export async function runUpdateUser(getScope, e) {
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
    e.preventDefault();
    const isSelfEdit = String(currentUser?.id) === String(editingUser.id);
    const isEditorLectorSelf =
      isSelfEdit && ['Editor', 'Lector'].includes(String(currentUser?.role || '').trim());
    if (!hasAdminRights && !isEditorLectorSelf) {
      showToast('Permisos insuficientes para actualizar usuarios.');
      return;
    }
    if (!editingUser.username.trim()) {
      showToast('El nombre de usuario no puede estar vacío.');
      return;
    }
    
    if (
      !isEditorLectorSelf &&
      editingUser.role === 'SuperUsuario' &&
      users.some((u) => u.role === 'SuperUsuario' && String(u.id) !== String(editingUser.id))
    ) {
      showToast("Solo puede haber un SuperUsuario en el sistema.");
      return;
    }

    const originalUser = users.find(u => String(u.id) === String(editingUser.id));
    if (!originalUser) {
      showToast('No se encontró el usuario a actualizar. Recarga la lista e inténtalo de nuevo.');
      return;
    }
    const isTargetSuperUser = originalUser?.role === 'SuperUsuario';
    const targetUsername = editingUser.username.trim();
    const existingUser = users.find(u => u.username === targetUsername && String(u.id) !== String(editingUser.id));
    if (existingUser) { showToast("El usuario ya existe."); return; }
    
    let passwordChanged = false;
    let superDidPasswordReset = false;
    let didAuthEmailViaCallable = false;

    if (isSuperUser && !isSelfEdit && (editingUser.adminNewPassword || editingUser.adminConfirmPassword)) {
      if (editingUser.adminNewPassword !== editingUser.adminConfirmPassword) {
        showToast('Las contraseñas nuevas no coinciden.');
        return;
      }
      if (!editingUser.adminNewPassword.trim()) {
        showToast('Escribe la nueva contraseña o deja ambos campos vacíos.');
        return;
      }
      const authEmailForFirebase =
        String(originalUser.authEmail || '').trim() || usernameToAuthEmail(originalUser.username);
      const backupTrim = originalUser.plainPasswordBackup ? String(originalUser.plainPasswordBackup).trim() : '';
      const adminCurrentTrim = editingUser.adminTargetCurrentPassword ? String(editingUser.adminTargetCurrentPassword).trim() : '';
      const signInCandidates = [...new Set([backupTrim, adminCurrentTrim].filter(Boolean))];
      if (signInCandidates.length === 0) {
        showToast(
          'Para actualizar la contraseña en Firebase indica la contraseña actual del usuario en el campo correspondiente, o sincroniza el respaldo en el sistema.'
        );
        return;
      }
      let signedUser = null;
      let lastErr = null;
      for (const pwdTry of signInCandidates) {
        try {
          signedUser = (await signInWithEmailAndPassword(secondaryAuth, authEmailForFirebase, pwdTry)).user;
          break;
        } catch (err) {
          lastErr = err;
          await signOut(secondaryAuth).catch(() => {});
        }
      }
      if (!signedUser) {
        console.error(lastErr);
        showToast(
          'No se pudo verificar la cuenta en Firebase. Revisa el respaldo guardado o la contraseña actual indicada.'
        );
        return;
      }
      try {
        await updatePassword(signedUser, editingUser.adminNewPassword.trim());
        superDidPasswordReset = true;
      } catch (err) {
        console.error(err);
        await signOut(secondaryAuth).catch(() => {});
        showToast('No se pudo guardar la nueva contraseña en Firebase (requisitos mínimos o sesión).');
        return;
      }
      await signOut(secondaryAuth).catch(() => {});
    }

    if (isSelfEdit && (editingUser.currentPasswordInput || editingUser.newPassword)) {
      if (!auth.currentUser?.email) {
        showToast('Sesión de acceso inválida.');
        return;
      }
      try {
        const cred = EmailAuthProvider.credential(auth.currentUser.email, editingUser.currentPasswordInput);
        await reauthenticateWithCredential(auth.currentUser, cred);
      } catch {
        showToast('La contraseña actual es incorrecta.');
        return;
      }
      if (editingUser.newPassword !== editingUser.confirmPassword) {
        showToast("Las nuevas contraseñas no coinciden.");
        return;
      }
      if (!editingUser.newPassword.trim()) {
        showToast("La nueva contraseña no puede estar vacía.");
        return;
      }
      await updatePassword(auth.currentUser, editingUser.newPassword.trim());
      passwordChanged = true;
    }

    if (hasAdminRights && !isEditorLectorSelf) {
      const nextAe = normalizeAuthEmail(editingUser.authEmail || '');
      const origAe = normalizeAuthEmail(originalUser.authEmail || usernameToAuthEmail(originalUser.username));
      if (nextAe && nextAe !== origAe) {
        if (!nextAe.includes('@')) {
          showToast('El correo de acceso debe incluir @.');
          return;
        }
        try {
          const functions = getFunctions(app, 'us-central1');
          const updateUserAuthEmailFn = httpsCallable(functions, 'updateUserAuthEmail');
          await updateUserAuthEmailFn({ userId: String(editingUser.id), newEmail: nextAe });
          didAuthEmailViaCallable = true;
        } catch (err) {
          console.error(err);
          const code = String(err?.code || '');
          if (code.includes('already-exists')) {
            showToast('Ese correo ya está en uso.');
          } else {
            showToast('No se pudo actualizar el correo de acceso.');
          }
          return;
        }
      }
    }

    const editorCanEditAccessFlags = isSuperUser;
    const originalHideMyExpenseConcepts = originalUser?.hideMyExpenseConcepts !== false;

    const nextRole = isTargetSuperUser ? 'SuperUsuario' : isEditorLectorSelf ? originalUser.role : editingUser.role;
    const newCanViewFinances =
      isTargetSuperUser || nextRole === 'Administrador'
        ? true
        : editorCanEditAccessFlags
          ? !!editingUser.canViewFinances
          : !!originalUser.canViewFinances;
    const newCanViewHiddenDonations = isTargetSuperUser
      ? true
      : (editorCanEditAccessFlags ? !!editingUser.canViewHiddenDonations : !!originalUser.canViewHiddenDonations);
    const newCanViewExpenses = editorCanEditAccessFlags ? !!editingUser.canViewExpenses : !!originalUser.canViewExpenses;
    const newAllowedEventIds = isTargetSuperUser
      ? []
      : (editorCanEditAccessFlags ? (editingUser.allowedEventIds || []) : getUserAllowedEventIds(originalUser));
    const newAllowedLocationsByEvent = isTargetSuperUser
      ? {}
      : (editorCanEditAccessFlags ? (editingUser.allowedLocationsByEvent || {}) : (originalUser.allowedLocationsByEvent || {}));
    const newAllowedPanelSectionsByEvent = isTargetSuperUser
      ? {}
      : (editorCanEditAccessFlags ? (editingUser.allowedPanelSectionsByEvent || {}) : (originalUser.allowedPanelSectionsByEvent || {}));
    const newAllowedPanelSections = isTargetSuperUser
      ? { ...DEFAULT_PANEL_NAV }
      : (editorCanEditAccessFlags ? { ...DEFAULT_PANEL_NAV, ...(editingUser.allowedPanelSections || {}) } : { ...DEFAULT_PANEL_NAV, ...(originalUser.allowedPanelSections || {}) });
    const prunedAllowedLocationsByEvent = pruneEventScopedAccessMap(newAllowedLocationsByEvent, newAllowedEventIds);
    const prunedAllowedPanelSectionsByEvent = pruneEventScopedAccessMap(newAllowedPanelSectionsByEvent, newAllowedEventIds);
    const newAllowedLocations = isTargetSuperUser
      ? []
      : getFlattenedAllowedLocationsFromEventMap(prunedAllowedLocationsByEvent, newAllowedEventIds);

    const newPreferredLandingTab = resolvePreferredLandingTab({
      role: nextRole,
      preferredLandingTab:
        (editorCanEditAccessFlags
          ? editingUser.preferredLandingTab
          : isEditorLectorSelf
            ? editingUser.preferredLandingTab
            : originalUser.preferredLandingTab) || 'Summary',
      allowedLocations: newAllowedLocations,
      restrictedLocation: newAllowedLocations[0] || ''
    }, { locations: allKnownLocationNames });

    const newHideMyExpenseConcepts = editorCanEditAccessFlags
      ? editingUser.hideMyExpenseConcepts !== false
      : isEditorLectorSelf
        ? editingUser.hideMyExpenseConcepts !== false
        : originalHideMyExpenseConcepts;
    const newCanEditRegistryDates = isTargetSuperUser
      ? true
      : (editorCanEditAccessFlags ? !!editingUser.canEditRegistryDates : !!originalUser.canEditRegistryDates);
    const newCanMarkPersonsOfInterest =
      nextRole === 'Administrador'
        ? editorCanEditAccessFlags
          ? !!editingUser.canMarkPersonsOfInterest
          : !!originalUser.canMarkPersonsOfInterest
        : false;
    const newCanSendWhatsAppQuickAction = (() => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
      if (isTargetSuperUser) return true;
      if (editorCanEditAccessFlags) {
        if (nextRole === 'Administrador') return editingUser.canSendWhatsAppQuickAction !== false;
        return !!editingUser.canSendWhatsAppQuickAction;
      }
      if (nextRole === 'Administrador') return originalUser.canSendWhatsAppQuickAction !== false;
      return !!originalUser.canSendWhatsAppQuickAction;
    })();
    const newCanMarkResponsivaLocalQuickAction = (() => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
      if (isTargetSuperUser) return true;
      if (editorCanEditAccessFlags) {
        if (nextRole === 'Administrador') return editingUser.canMarkResponsivaLocalQuickAction !== false;
        return editingUser.canMarkResponsivaLocalQuickAction !== false;
      }
      if (nextRole === 'Administrador') return originalUser.canMarkResponsivaLocalQuickAction !== false;
      if (originalUser.canMarkResponsivaLocalQuickAction === false) return false;
      if (originalUser.canMarkResponsivaLocalQuickAction === true) return true;
      return originalUser.canSendResponsivaQuickAction !== false;
    })();
    const newCanSendResponsivaDigitalQuickAction = (() => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
      if (isTargetSuperUser) return true;
      if (editorCanEditAccessFlags) {
        if (nextRole === 'Administrador') return editingUser.canSendResponsivaDigitalQuickAction !== false;
        return !!editingUser.canSendResponsivaDigitalQuickAction;
      }
      if (nextRole === 'Administrador') return originalUser.canSendResponsivaDigitalQuickAction !== false;
      if (originalUser.canSendResponsivaDigitalQuickAction === true) return true;
      if (originalUser.canSendResponsivaDigitalQuickAction === false) return false;
      return originalUser.canSendResponsivaQuickAction === true;
    })();
    const newCanCancelRegistrations =
      nextRole !== 'Editor'
        ? false
        : canDelegateCancelRegistrations(currentUser)
          ? !!editingUser.canCancelRegistrations
          : !!originalUser.canCancelRegistrations;
    const newRestrictedEventId = newAllowedEventIds[0] || '';
    const newRestrictedLocation = newAllowedLocations[0] || '';

    const prevMcs = clampAdminMaxConcurrentSessions(originalUser.maxConcurrentSessions ?? 1);
    const newMaxConcurrentSessions =
      nextRole === 'Administrador'
        ? editorCanEditAccessFlags
          ? clampAdminMaxConcurrentSessions(editingUser.maxConcurrentSessions)
          : prevMcs
        : null;

    const changes = [];
    if (originalUser.username !== targetUsername) changes.push(`Usuario (${originalUser.username} -> ${targetUsername})`);
    if (originalUser.role !== nextRole) changes.push(`Rol (${originalUser.role} -> ${nextRole})`);
    if (passwordChanged) changes.push(`Contraseña actualizada`);
    if (superDidPasswordReset) changes.push(`Contraseña actualizada por SuperUsuario`);
    if (originalUser.canViewFinances !== newCanViewFinances) changes.push(`Ver Finanzas (${originalUser.canViewFinances ? SI_LABEL : 'No'} -> ${newCanViewFinances ? SI_LABEL : 'No'})`);
    if (originalUser.canViewHiddenDonations !== newCanViewHiddenDonations) changes.push(`Ver donaciones ocultas (${originalUser.canViewHiddenDonations ? SI_LABEL : 'No'} -> ${newCanViewHiddenDonations ? SI_LABEL : 'No'})`);
    if ((!!originalUser.canViewExpenses) !== newCanViewExpenses) changes.push(`Ver Gastos (${originalUser.canViewExpenses ? SI_LABEL : 'No'} -> ${newCanViewExpenses ? SI_LABEL : 'No'})`);
    if (originalHideMyExpenseConcepts !== newHideMyExpenseConcepts) changes.push(`Ocultar mis conceptos de gastos (${originalHideMyExpenseConcepts ? SI_LABEL : 'No'} -> ${newHideMyExpenseConcepts ? SI_LABEL : 'No'})`);
    if (!!originalUser.canEditRegistryDates !== newCanEditRegistryDates) changes.push(`Editar fechas registro/abonos (${originalUser.canEditRegistryDates ? SI_LABEL : 'No'} -> ${newCanEditRegistryDates ? SI_LABEL : 'No'})`);
    if (!!originalUser.canMarkPersonsOfInterest !== newCanMarkPersonsOfInterest) {
      changes.push(
        `Marcar personas de interés (${originalUser.canMarkPersonsOfInterest ? SI_LABEL : 'No'} -> ${newCanMarkPersonsOfInterest ? SI_LABEL : 'No'})`
      );
    }
    if (!!originalUser.canCancelRegistrations !== newCanCancelRegistrations) {
      changes.push(
        `Dar de baja registros (${originalUser.canCancelRegistrations ? SI_LABEL : 'No'} -> ${newCanCancelRegistrations ? SI_LABEL : 'No'})`
      );
    }
    const nextUserQuickPreview = {
      ...originalUser,
      role: nextRole,
      canSendWhatsAppQuickAction: newCanSendWhatsAppQuickAction,
      canMarkResponsivaLocalQuickAction: newCanMarkResponsivaLocalQuickAction,
      canSendResponsivaDigitalQuickAction: newCanSendResponsivaDigitalQuickAction,
    };
    if (userCanSendWhatsAppQuickAction(originalUser) !== userCanSendWhatsAppQuickAction(nextUserQuickPreview)) {
      changes.push(
        `WhatsApp acciones rápidas (${userCanSendWhatsAppQuickAction(originalUser) ? SI_LABEL : 'No'} -> ${userCanSendWhatsAppQuickAction(nextUserQuickPreview) ? SI_LABEL : 'No'})`
      );
    }
    if (userCanMarkResponsivaLocalQuickAction(originalUser) !== userCanMarkResponsivaLocalQuickAction(nextUserQuickPreview)) {
      changes.push(
        `Responsiva local (${userCanMarkResponsivaLocalQuickAction(originalUser) ? SI_LABEL : 'No'} -> ${userCanMarkResponsivaLocalQuickAction(nextUserQuickPreview) ? SI_LABEL : 'No'})`
      );
    }
    if (userCanSendResponsivaDigitalQuickAction(originalUser) !== userCanSendResponsivaDigitalQuickAction(nextUserQuickPreview)) {
      changes.push(
        `Responsiva digital (${userCanSendResponsivaDigitalQuickAction(originalUser) ? SI_LABEL : 'No'} -> ${userCanSendResponsivaDigitalQuickAction(nextUserQuickPreview) ? SI_LABEL : 'No'})`
      );
    }
    const prevAllowedEvents = getUserAllowedEventIds(originalUser);
    const prevAllowedLocations = getUserAllowedLocations(originalUser);
    if (prevAllowedEvents.slice().sort().join('|') !== newAllowedEventIds.slice().sort().join('|')) {
      changes.push(
        `Eventos (${resolveEventNamesForUserLog(prevAllowedEvents, events)} → ${resolveEventNamesForUserLog(newAllowedEventIds, events)})`
      );
    }
    if (prevAllowedLocations.slice().sort().join('|') !== newAllowedLocations.slice().sort().join('|')) {
      changes.push(
        `Sedes (${summarizeLocationsForUserLog(prevAllowedLocations)} → ${summarizeLocationsForUserLog(newAllowedLocations)})`
      );
    }
    if ((originalUser.preferredLandingTab || 'Summary') !== newPreferredLandingTab) changes.push(`Ventana inicial (${originalUser.preferredLandingTab || 'Summary'} -> ${newPreferredLandingTab})`);
    if (nextRole === 'Administrador' && prevMcs !== newMaxConcurrentSessions) {
      changes.push(`Sesiones simultáneas (${prevMcs} -> ${newMaxConcurrentSessions})`);
    }
    if (didAuthEmailViaCallable) {
      changes.push(
        `Correo de acceso (${normalizeAuthEmail(originalUser.authEmail || usernameToAuthEmail(originalUser.username))} -> ${normalizeAuthEmail(editingUser.authEmail || '')})`
      );
    }

    const userProfilePatch = {
      username: targetUsername,
      password: deleteField(),
      role: nextRole,
      canViewFinances: newCanViewFinances,
      canViewHiddenDonations: newCanViewHiddenDonations,
      canViewExpenses: newCanViewExpenses,
      allowedEventIds: newAllowedEventIds,
      allowedLocations: newAllowedLocations,
      allowedLocationsByEvent: prunedAllowedLocationsByEvent,
      allowedPanelSectionsByEvent: prunedAllowedPanelSectionsByEvent,
      allowedPanelSections: newAllowedPanelSections,
      preferredLandingTab: newPreferredLandingTab,
      restrictedEventId: newRestrictedEventId,
      restrictedLocation: newRestrictedLocation,
      hideMyExpenseConcepts: newHideMyExpenseConcepts,
      canEditRegistryDates: newCanEditRegistryDates,
      canMarkPersonsOfInterest: newCanMarkPersonsOfInterest,
      canSendWhatsAppQuickAction: newCanSendWhatsAppQuickAction,
      canMarkResponsivaLocalQuickAction: newCanMarkResponsivaLocalQuickAction,
      canSendResponsivaDigitalQuickAction: newCanSendResponsivaDigitalQuickAction,
      canCancelRegistrations: newCanCancelRegistrations,
      ...(nextRole === 'Administrador'
        ? { maxConcurrentSessions: newMaxConcurrentSessions, canCancelRegistrations: deleteField() }
        : { maxConcurrentSessions: deleteField(), canMarkPersonsOfInterest: false }),
      ...(passwordChanged && isSelfEdit ? { plainPasswordBackup: editingUser.newPassword.trim() } : {}),
      ...(superDidPasswordReset ? { plainPasswordBackup: editingUser.adminNewPassword.trim() } : {}),
    };
    try {
      await updateDoc(getDocRef('app_users', String(editingUser.id)), userProfilePatch);
    } catch (err) {
      console.error(err);
      showToast('No se pudo guardar los cambios en la base de datos. Revisa conexión o permisos.');
      return;
    }

    if (currentUser.id === editingUser.id) {
      const merged = {
        ...currentUser,
        username: targetUsername,
        role: nextRole,
        canViewFinances: newCanViewFinances,
        canViewHiddenDonations: newCanViewHiddenDonations,
        canViewExpenses: newCanViewExpenses,
        allowedEventIds: newAllowedEventIds,
        allowedLocations: newAllowedLocations,
        allowedLocationsByEvent: prunedAllowedLocationsByEvent,
        allowedPanelSectionsByEvent: prunedAllowedPanelSectionsByEvent,
        allowedPanelSections: newAllowedPanelSections,
        preferredLandingTab: newPreferredLandingTab,
        restrictedEventId: newRestrictedEventId,
        restrictedLocation: newRestrictedLocation,
        hideMyExpenseConcepts: newHideMyExpenseConcepts,
        canEditRegistryDates: newCanEditRegistryDates,
        canMarkPersonsOfInterest: newCanMarkPersonsOfInterest,
        canSendWhatsAppQuickAction: newCanSendWhatsAppQuickAction,
        canMarkResponsivaLocalQuickAction: newCanMarkResponsivaLocalQuickAction,
        canSendResponsivaDigitalQuickAction: newCanSendResponsivaDigitalQuickAction,
        canCancelRegistrations: newCanCancelRegistrations,
      };
      if (nextRole === 'Administrador') {
        merged.maxConcurrentSessions = newMaxConcurrentSessions;
        merged.canCancelRegistrations = false;
      } else {
        merged.canMarkPersonsOfInterest = false;
        delete merged.maxConcurrentSessions;
      }
      if (passwordChanged) merged.plainPasswordBackup = editingUser.newPassword.trim();
      if (didAuthEmailViaCallable) merged.authEmail = normalizeAuthEmail(editingUser.authEmail || '');
      setCurrentUser(merged);
    }

    if (changes.length > 0) addLog('Gestión de Usuarios', `Editó al usuario ${originalUser.username}. Cambios: ${changes.join(', ')}`, null, { id: 'Global', name: 'Sistema' }, null, {
      entityType: 'user',
      entityId: String(originalUser?.id || originalUser?.username || ''),
      status: LOG_STATUS.OK,
      snapshot: { kind: 'usuario_editado', changes, username: originalUser?.username },
    });

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
      canCancelRegistrations: false,
    });
    showToast("Usuario actualizado.");
}
