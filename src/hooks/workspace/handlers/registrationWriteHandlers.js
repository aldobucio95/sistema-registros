/** Carga bajo demanda: altas / lista de espera / edición de registro. */
import {
  attendanceRolesFromLegacyPerson,
  legacyFieldsFromAttendanceRoles,
} from '../../../attendanceRoles.js';

export async function runAddToWaitlist(getScope, loc, _calledInternally = false, waitlistOptions = null, entrySource) {
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
    if (!_calledInternally && getScope().isRegisteringRef.current) return;
    if (!hasEventAccess(currentEvent?.id) || !hasLocationAccess(loc)) {
      showToast("No tienes permisos para registrar en lista de espera en esta sede/evento.");
      return;
    }
    if (!isLocOpen(loc)) return;
    if (!_calledInternally) getScope().isRegisteringRef.current = true;
    try {
    const editorVis = currentUser?.role === 'Editor' ? editorRegistrationFieldVis : null;
    const sourceEntry = entrySource ?? newEntry;
    let entryPayload = { ...sourceEntry, paid: sourceEntry.paid || 0 };
    if (editorVis) {
      entryPayload = applyEditorRegistrationDefaults(entryPayload, editorVis, currentEvent.eventType, loc);
    }
    const wlIssues = getScope().getRegistrationFormIssues(entryPayload, 0, currentEvent.eventType, editorVis, currentEvent, newRegPrivacyContext);
    if (wlIssues.length) {
      getScope().showRegistrationValidationIssues(wlIssues);
      return;
    }
    entryPayload = applyRegistrationConsentPolicy(entryPayload, {
      privacyNotice: mergedPrivacyNotice,
      privacyAccepted: newRegPrivacyAccepted,
      sensitiveConsent: newRegSensitiveConsent,
      channel: 'manual_staff',
    });
    const poiWlMsg = registrationPersonOfInterestMessage(
      entryPayload,
      personOfInterestVnpSet,
      personOfInterestRegistrationHelpers
    );
    if (poiWlMsg) {
      showToast(poiWlMsg);
      return;
    }

    const phoneDigits = digitsOnlyPhone(entryPayload.phone);
    const finalVnpPersonId = canonicalizeVnpPersonId(entryPayload.vnpPersonId || '') || generateVnpPersonId(entryPayload);
    const docId = await resolveParticipantDocumentIdForWrite(finalVnpPersonId, currentEvent.id);
    let normalizedBautCompForWl = null;

    if (
      phoneDuplicateInEvent(
        entryPayload.name,
        phoneDigits,
        allParticipants,
        currentEvent.id,
        docId,
        entryPayload.age,
        !!entryPayload.allowSharedMainPhone
      )
    ) {
      showToast(
        'Ya hay un inscrito o en lista de espera con este teléfono. Si no lo ves en las listas, puede tener sede incorrecta: revisa el aviso en Resumen o «Sede no reconocida» en Registro Global.'
      );
      return;
    }

    const dupVnp = allParticipants.some(
      (p) =>
        p.eventId === currentEvent.id &&
        participantBlocksDuplicateRegistration(p) &&
        String(p.vnpPersonId || '') === String(finalVnpPersonId)
    );
    if (dupVnp) {
      showToast(
        'El ID VNPM ya está en uso por un inscrito o en lista de espera. Si no aparece en las pestañas, puede tener sede incorrecta: revisa el aviso en Resumen o la sección «Sede no reconocida» en Registro Global.'
      );
      return;
    }

            const gateWl = await loadParticipantRegistrationWriteGate(docId, currentEvent.id);
    if (!gateWl.ok) {
      showToast(gateWl.error);
      return;
    }
    const previousWlData = gateWl.snap?.exists() ? gateWl.snap.data() : null;
    const previousSpouseIdWl = previousWlData ? String(previousWlData.spouseParticipantId || '').trim() : '';
    const prevWlWaNotifications = Array.isArray(previousWlData?.whatsAppFinanceNotifications)
      ? [...previousWlData.whatsAppFinanceNotifications]
      : [];
    const prevWlWaHistory = Array.isArray(previousWlData?.whatsAppMessageHistory)
      ? [...previousWlData.whatsAppMessageHistory]
      : [];
    const prevWlRegistrationComments = Array.isArray(previousWlData?.registrationComments)
      ? [...previousWlData.registrationComments]
      : [];

    const idExistsAnywhere = await vnpPersonIdExistsInFirestore(finalVnpPersonId);
    const waitlistInstant = new Date();
    const waitlistIso = waitlistInstant.toISOString();
    const initialCampAssignment = currentEvent.eventType === 'Campa' && !isSiValue(entryPayload.isServer)
      ? (parseInt(entryPayload.age) < 18 ? 'Teens' : 'Jóvenes')
      : '';

    const baseRegisteredCost = getPersonCost(entryPayload, currentPricing, currentEvent);
    const skipCampaignWl = currentEvent.eventType === 'Campa' && isFreeAttendanceType(entryPayload.attendanceSpecialType);
    const skipCampaignBautizos = false;
    const matchedCampaign = skipCampaignWl || skipCampaignBautizosWl ? null : resolveMatchedCampaignForNewEntry(entryPayload);
    if (entryPayload.selectedDiscountCampaignId && !skipCampaignWl && !skipCampaignBautizosWl && !matchedCampaign) {
      showToast('La campaña elegida no aplica a este perfil o no está bien configurada (concepto y monto).');
      return;
    }
    const { selectedDiscountCampaignId: _wlSelCamp, ...newEntryCoreWl } = entryPayload;
    const personData = {
      ...newEntryCoreWl,
      id: docId,
      status: 'waitlist',
      registeredAt: waitlistIso,
      registeredBy: currentUser?.username || '',
      waitlistCreatedAt: Date.now(),
      vnpPersonId: finalVnpPersonId,
      isFirstVnpId: !idExistsAnywhere,
      location: loc,
      travelFrom: (entryPayload.travelFrom || loc),
      travelTo: (entryPayload.travelTo || loc),
      eventId: currentEvent.id,
      paymentHistory: [],
      paid: 0,
      paidNet: 0,
      paymentMethod: 'Efectivo',
      paymentService: getAutoPaymentService(new Date(), loc),
      cardReference: '',
      whatsAppFinanceNotifications: prevWlWaNotifications,
      whatsAppMessageHistory: prevWlWaHistory,
      registrationComments: (() => {
        const t = newRegGeneralComment.trim();
        if (!t) return prevWlRegistrationComments;
        return [
          ...prevWlRegistrationComments,
          {
            id: `rc_${waitlistInstant.getTime()}_${Math.random().toString(36).slice(2, 8)}`,
            text: t,
            createdAt: waitlistInstant.getTime(),
            createdBy: currentUser?.username || '',
          },
        ];
      })(),
      responsivaStatus: (() => {
        if (!isResponsivaEventSectionVisible(currentEvent)) return '';
        if (!getResponsivaRequirementApplies(entryPayload, currentEvent)) return 'No aplica';
        return String(entryPayload.responsivaStatus || '').trim() === 'Entregada' ? 'Entregada' : 'Pendiente';
      })(),
      campAssignment: initialCampAssignment,
      registeredCost: skipCampaignWl || skipCampaignBautizosWl
        ? baseRegisteredCost
        : (matchedCampaign ? Math.max(0, Number(matchedCampaign.finalAmount) || 0) : baseRegisteredCost),
      registeredCostManual: false,
      discountCampaignId: matchedCampaign?.id || '',
      discountCampaignConcept: matchedCampaign?.concept || '',
      discountCampaignAppliedAt: matchedCampaign ? Date.now() : null,
      refundPendingAmount: 0,
      refundPendingReason: '',
      ...(globalConfig?.isDebugMode ? { _isDebug: true, _debugSessionId: globalConfig.debugSessionId } : {})
    };

    if (currentEvent.eventType === 'Campa' || currentEvent.eventType === 'Bautizo') {
      personData.willBeBaptized = isSiValue(entryPayload.willBeBaptized) ? SI : 'No';
      if (!isSiValue(personData.willBeBaptized) || !isSiValue(entryPayload.isServer) || entryPayload.serverAssignment !== 'Ambos') {
        personData.baptismSegment = '';
      } else {
        personData.baptismSegment = String(entryPayload.baptismSegment || '').trim();
      }
      personData.baptismShirtSize = normalizeBaptismShirtSize(entryPayload.baptismShirtSize);
    }

    // Modelo unificado: persistir attendanceRoles y sincronizar campos legacy
    {
      const roles = entryPayload.attendanceRoles
        ? entryPayload.attendanceRoles
        : attendanceRolesFromLegacyPerson(entryPayload);
      const legacy = legacyFieldsFromAttendanceRoles(roles);
      personData.attendanceRoles = legacy.attendanceRoles;
      personData.isServer = legacy.isServer;
      personData.isScholarship = legacy.isScholarship;
      if (currentEvent.eventType === 'Campa' || currentEvent.eventType === 'Bautizo') {
        personData.willBeBaptized = legacy.willBeBaptized;
      }
      personData.attendanceSpecialType = legacy.attendanceSpecialType;
      if (entryPayload.costOverride != null && entryPayload.costOverride !== '') {
        personData.costOverride = Number(entryPayload.costOverride);
      }
    }

    if (currentEvent.eventType === 'General') {
      // General: conservar roles unificados; no forzar wipe de asistencia
      if (false) {
        personData.isScholarship = 'No';
        personData.isServer = 'No';
        personData.serverAssignment = '';
        personData.attendanceSpecialType = ATTENDANCE_SPECIAL.ninguno;
      }
    }

    if (currentEvent.eventType === 'Campa' && isSiValue(entryPayload.isScholarship)) {
      personData.scholarshipPendingApproval = true;
      personData.scholarshipType = entryPayload.scholarshipType === 'partial' ? 'partial' : 'total';
      personData.scholarshipPartialAmount = entryPayload.scholarshipType === 'partial'
        ? parseFloat(entryPayload.scholarshipPartialAmount || 0)
        : 0;
    } else {
      personData.scholarshipPendingApproval = false;
      personData.scholarshipType = 'none';
      personData.scholarshipPartialAmount = 0;
    }

    const spouseCtxWl =
      (currentEvent.eventType === 'Campa') &&
      isSiValue(personData.isServer) &&
      isSiValue(entryPayload.isMarried);
    if (!isSiValue(entryPayload.isMarried)) {
      personData.spouseName = '';
      personData.spouseParticipantId = '';
      personData.spousePhone = '';
    } else if (spouseCtxWl) {
      personData.spouseName = String(entryPayload.spouseName || '').trim();
      personData.spouseParticipantId = String(entryPayload.spouseParticipantId || '').trim();
      personData.spousePhone = String(entryPayload.spousePhone || '').trim();
    } else {
      personData.spouseParticipantId = '';
      personData.spousePhone = '';
      personData.spouseName = '';
    }

    if (spouseCtxWl && personData.spouseParticipantId) {
      const v = await validateSpouseParticipantChoice({
        eventId: currentEvent.id, spouseParticipantId: personData.spouseParticipantId, });
      if (!v.ok) {
        showToast(v.error || 'No se pudo validar la pareja.');
        return;
      }
    }

        applyParticipantNameFormattingForSave(personData);
    // Respaldo-primero: snapshot completo (incluye acompañantes y datos de carro) ANTES del write.
    const _wlLogId = buildLogId();
    const _wlSnapshot = {
      kind: previousWlData ? 'lista_espera_actualizada' : 'lista_espera_nueva',
      isUpdate: !!previousWlData,
      loc,
      eventId: currentEvent?.id,
      eventName: currentEvent?.name,
      participant: prepareParticipantDocForFirestore(personData),
      bautizosCompanions: personData.bautizosCompanions || [],
      carDraftMeta: newRegDraftCarMeta || null,
    };
    try {
      await Promise.all([
        logSnapshotBackup(_wlLogId, { entityType: 'participant', entityId: docId, snapshot: _wlSnapshot }), setDoc(
          getDocRef('app_participants', docId), prepareParticipantDocForFirestore(personData)
        ), ]);
    } catch (e) {
      logAppError('handleAddToWaitlist.setDoc', e, { docId, name: personData?.name, eventId: currentEvent?.id });
      await addLog(
        'Lista de Espera',
        `FALLÓ guardar en lista de espera a ${personData?.name || ''} en ${loc}. Los datos (incluidos acompañantes y carro) quedaron respaldados en el log.`,
        null,
        null,
        {
          collectionName: 'app_participants', action: previousWlData ? 'update' : 'create', previousData: previousWlData || null, },
        {
          logId: _wlLogId, skipSnapshotWrite: true, hasSnapshot: true, entityType: 'participant', status: LOG_STATUS.ERROR, errorMessage: normalizeErrorMessage(e), isError: true, }
      );
      showToast('No se pudo guardar en lista de espera. Los datos quedaron respaldados en Actividad.');
      throw e;
    }
    setNewRegDraftCarMeta({});
    const becaNote =
      currentEvent.eventType === 'Campa' && isSiValue(entryPayload.isScholarship)
        ? ` Solicitud de beca ${entryPayload.scholarshipType === 'partial' ? 'parcial' : 'total'}${entryPayload.scholarshipType === 'partial' ? ` (monto becado $${parseFloat(entryPayload.scholarshipPartialAmount || 0).toLocaleString('es-MX')})` : ''}, pendiente de aprobación al promover.`
        : '';
    const comentarioInicialEspera = newRegGeneralComment.trim();
    const comentarioInicialEsperaLog = comentarioInicialEspera
      ? ` Comentario inicial: «${comentarioInicialEspera.length > 200 ? `${comentarioInicialEspera.slice(0, 200)}…` : comentarioInicialEspera}».`
      : '';
    const _wlLog = `${previousWlData ? 'Actualizó lista de espera de' : 'Añadió a'} ${entryPayload.name} a la lista de espera en la sede ${loc}.${becaNote}${comentarioInicialEsperaLog}`;

    persistLastSuccessfulRegistrationSnapshot(currentUser?.id, currentEvent?.id, entryPayload, {
      newRegGeneralComment,
      newRegDraftCarMeta,
    });
    resetRegistrationFormAfterSuccess(loc);
    refreshParticipantCache(
      personData,
      previousWlData ? 'Actualizar lista de espera' : 'Nueva lista de espera',
      { eventId: currentEvent.id, location: loc, personId: docId, patch: personData, skipRefetch: true }
    );
    showToast(
      currentEvent.eventType === 'Campa' && isSiValue(entryPayload.isScholarship)
        ? 'Solicitud de beca enviada a lista de espera (aprobación al promover).'
        : waitlistOptions?.redirectedByCap
          ? 'Cupo lleno: registro guardado en lista de espera. Un administrador puede promoverlo a activos cuando haya lugar.'
          : 'Registro enviado a lista de espera.'
    );

    void (async () => {
      try {
                if (spouseCtxWl && personData.spouseParticipantId) {
          const sync = await syncSpouseParticipantLinks({
            eventId: currentEvent.id,
            personId: docId,
            previousSpouseId: previousSpouseIdWl,
            nextSpouseId: personData.spouseParticipantId,
            currentPersonName: String(personData.name || '').trim(),
          });
          if (!sync.ok) {
            showToast(sync.error || 'Registro guardado, pero no se pudo vincular la pareja. Intenta desde edición.');
          }
        }
        if (currentEvent.eventType === 'Campa' && isSiValue(entryPayload.isScholarship)) {
          const now = Date.now();
          const pendingApprovalNotification = {
            id: `wa-bpd-${now}`,
            kind: 'beca_pendiente_aprobacion',
            amount: 0,
            pendingAmount: Math.max(Number(getLiquidationTarget(personData)) || 0, 0),
            isLiquidado: false,
            createdAt: now,
            sent: false,
            sentAt: null,
            message: buildScholarshipPendingWhatsAppMessage({
              person: personData,
              loc,
              reportedAtMs: now,
              eventSnapshot: currentEvent,
            }),
          };
          await updateDoc(getDocRef('app_participants', docId), {
            whatsAppFinanceNotifications: [...prevWlWaNotifications, pendingApprovalNotification],
          });
          refreshParticipantCache(personData, 'Aviso beca en espera', {
            personId: docId,
            skipRefetch: true,
            patch: {
              whatsAppFinanceNotifications: [...prevWlWaNotifications, pendingApprovalNotification],
            },
          });
        }
        addLog(
          'Lista de Espera', _wlLog, null, null, {
            collectionName: 'app_participants',
            docId,
            action: previousWlData ? 'update' : 'create',
            previousData: previousWlData || null,
          }, {
            logId: _wlLogId,
            skipSnapshotWrite: true,
            hasSnapshot: true,
            entityType: 'participant',
            entityId: docId,
            status: LOG_STATUS.OK,
          }
        );
        logParticipantActivity(docId, 'lista_espera', _wlLog);
      } catch (postErr) {
        logAppError('handleAddToWaitlist.postRegister', postErr, { docId, loc, eventId: currentEvent?.id });
      }
    })();
    } finally {
      if (!_calledInternally) getScope().isRegisteringRef.current = false;
    }
}

export async function runAddEntry(getScope, loc, entrySource) {
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
    if (getScope().isRegisteringRef.current) return;
    if (!hasEventAccess(currentEvent?.id) || !hasLocationAccess(loc)) {
      showToast("No tienes permisos para registrar en esta sede/evento.");
      return;
    }
    if (!isLocOpen(loc)) return;
    getScope().isRegisteringRef.current = true;
    try {
    const editorVis = currentUser?.role === 'Editor' ? editorRegistrationFieldVis : null;
    const sourceEntry = entrySource ?? newEntry;
    let entryPayload = { ...sourceEntry, paid: sourceEntry.paid || 0 };
    if (editorVis) {
      entryPayload = applyEditorRegistrationDefaults(entryPayload, editorVis, currentEvent.eventType, loc);
    }
    const regIssues = getScope().getRegistrationFormIssues(
      entryPayload,
      currentEvent.minDeposit || 0,
      currentEvent.eventType,
      editorVis,
      currentEvent,
      newRegPrivacyContext
    );
    if (regIssues.length) {
      getScope().showRegistrationValidationIssues(regIssues);
      return;
    }
        entryPayload = applyRegistrationConsentPolicy(entryPayload, {
      privacyNotice: mergedPrivacyNotice,
      privacyAccepted: newRegPrivacyAccepted,
      sensitiveConsent: newRegSensitiveConsent,
      channel: 'manual_staff',
    });
    const poiBlockMsg = registrationPersonOfInterestMessage(
      entryPayload,
      personOfInterestVnpSet,
      personOfInterestRegistrationHelpers
    );
    if (poiBlockMsg) {
      showToast(poiBlockMsg);
      return;
    }
    if (isCampa && isSiValue(entryPayload.isScholarship)) {
      await runAddToWaitlist(getScope, loc, true);
      return;
    }
    const globalCap = getEventTotalCap();
    const vnpCapHelpers = { canonicalizeVnpPersonId, generateVnpPersonId };
    const capSimulationRows = buildCapSimulationRows(entryPayload, currentEvent, loc, vnpCapHelpers);
    const incomingUnits = computeIncomingRegistrationCapUnits(capSimulationRows, allParticipants, currentEvent);
    const nextGlobalFull = globalCap > 0 && getEventCapUsedUnits() + incomingUnits > globalCap;
    const locCap = getLocationCap(loc);
    const nextLocFull =
      globalCap <= 0 && locCap > 0 && getCapUsedUnitsByLocation(loc) + incomingUnits > locCap;
    if (nextGlobalFull || nextLocFull) {
      const isPastorReg =
        false /* Bautizos unsupported in v2 */ &&
        bzEvtNormalizeAttendanceType(entryPayload.bautizosAttendanceType) === BAUTIZOS_ATTENDANCE.pastor;
      const canPastorOverCap = canShowBautizosPastorAttendance({
        role: currentUser?.role,
        visibility: editorRegistrationFieldVis,
        hasAdminRights,
      });
      if (isPastorReg && canPastorOverCap) {
        const capUsed = nextGlobalFull ? getEventCapUsedUnits() : getCapUsedUnitsByLocation(loc);
        const capTotal = nextGlobalFull ? globalCap : locCap;
        const reason = nextGlobalFull ? 'global' : 'sede';
        const confirmed = await requestPromoteOverCapConfirm({
          capUsed,
          capTotal,
          additionalUnits: incomingUnits,
          reason,
          loc,
          personName: String(entryPayload.name || '').trim(),
          isCompanion: false,
        });
        if (!confirmed) return;
      } else {
        let allowBautizosSplitCompanionWaitlist = false;
                if (!allowBautizosSplitCompanionWaitlist) {
          const capUsed = nextGlobalFull ? getEventCapUsedUnits() : getCapUsedUnitsByLocation(loc);
          const capTotal = nextGlobalFull ? globalCap : locCap;
          const reason = nextGlobalFull ? 'global' : 'sede';
          const confirmed = await requestCapFullWaitlistConfirm({ capUsed, capTotal, reason, loc });
          if (!confirmed) return;
          await runAddToWaitlist(getScope, loc, true, { redirectedByCap: true });
          return;
        }
      }
    }

    /** Bautizos: acompañantes marcados como bautizados → un registro activo completo por integrante, con vínculos `p:` cruzados. */
        const phoneDigits = digitsOnlyPhone(entryPayload.phone);
    const vnpId = canonicalizeVnpPersonId(entryPayload.vnpPersonId || '');
    const candidateVnpId = vnpId || generateVnpPersonId(entryPayload);
    const vnpWasUserProvided = Boolean(vnpId);
    const idExistsAnywherePromise = vnpWasUserProvided
      ? vnpPersonIdExistsInFirestore(candidateVnpId)
      : Promise.resolve(false);
    const docGatePromise = resolveParticipantDocIdAndWriteGate(candidateVnpId, currentEvent.id);
    let normalizedBautCompForAdd = null;

    const { docId, gate } = await docGatePromise;

    if (
      phoneDuplicateInEvent(
        entryPayload.name,
        phoneDigits,
        allParticipants,
        currentEvent.id,
        docId,
        entryPayload.age,
        !!entryPayload.allowSharedMainPhone
      )
    ) {
      showToast(
        'Ya hay un inscrito o en lista de espera con este teléfono. Si no lo ves en las listas, puede tener sede incorrecta: revisa el aviso en Resumen o «Sede no reconocida» en Registro Global.'
      );
      return;
    }
    const dupVnp = allParticipants.some(
      (p) =>
        p.eventId === currentEvent.id &&
        participantBlocksDuplicateRegistration(p) &&
        String(p.vnpPersonId || '') === String(candidateVnpId)
    );
    if (dupVnp) {
      showToast(
        'El ID VNPM ya está en uso por un inscrito o en lista de espera. Si no aparece en las pestañas, puede tener sede incorrecta: revisa el aviso en Resumen o la sección «Sede no reconocida» en Registro Global.'
      );
      return;
    }
        const idExistsAnywhere = await idExistsAnywherePromise;
    if (!gate.ok) {
      showToast(gate.error);
      return;
    }
    const previousParticipantData = gate.snap?.exists() ? gate.snap.data() : null;
    const previousSpouseIdForLink = previousParticipantData ? String(previousParticipantData.spouseParticipantId || '').trim() : '';
    const prevWaNotifications = Array.isArray(previousParticipantData?.whatsAppFinanceNotifications)
      ? [...previousParticipantData.whatsAppFinanceNotifications]
      : [];
    const prevWaHistory = Array.isArray(previousParticipantData?.whatsAppMessageHistory)
      ? [...previousParticipantData.whatsAppMessageHistory]
      : [];
    const prevRegistrationComments = Array.isArray(previousParticipantData?.registrationComments)
      ? [...previousParticipantData.registrationComments]
      : [];
    const initialPaidGross = parseFloat(entryPayload.paid) || 0;
    let paymentMethod = entryPayload.paymentMethod === 'Tarjeta' ? 'Tarjeta' : 'Efectivo';
    if (paymentMethod === 'Tarjeta' && !isCardPaymentAllowedForLocation(currentEvent, loc)) {
      paymentMethod = 'Efectivo';
    }
    const paymentService = getAutoPaymentService(new Date(), loc);
    const commissionRate = getCardCommissionRate();
    const commission = paymentMethod === 'Tarjeta' ? (initialPaidGross * commissionRate) : 0;
    const initialPaidNet = paymentMethod === 'Tarjeta' ? (initialPaidGross - commission) : initialPaidGross;

    const regInstant = new Date();
    const regIso = regInstant.toISOString();
    const initialHistory = initialPaidGross > 0 ? [{
      id: Date.now() + 1, date: regInstant.toLocaleString('es-MX'), amount: initialPaidGross, // bruto
      netAmount: initialPaidNet, // neto
      method: paymentMethod, service: paymentService, reference: paymentMethod === 'Tarjeta' ? (entryPayload.cardReference || '').trim() : '', commission, registeredBy: currentUser?.username
    }] : [];

    const baseRegisteredCost = getPersonCost(entryPayload, currentPricing, currentEvent);
    const skipCampaignForAttendance =
      (currentEvent.eventType === 'Campa' || currentEvent.eventType === 'General') &&
      isFreeAttendanceType(normalizeAttendanceSpecial(entryPayload));
    const skipCampaignBautizos = false;
    const matchedCampaign = skipCampaignForAttendance || skipCampaignBautizos ? null : resolveMatchedCampaignForNewEntry(entryPayload);
    if (entryPayload.selectedDiscountCampaignId && !skipCampaignForAttendance && !skipCampaignBautizos && !matchedCampaign) {
      showToast('La campaña elegida no aplica a este perfil o no está bien configurada (concepto y monto).');
      return;
    }
    const registeredCost = isPastorParticipant(entryPayload, currentEvent.eventType)
      ? 0
      : skipCampaignForAttendance || skipCampaignBautizos
        ? baseRegisteredCost
        : matchedCampaign
          ? Math.max(0, Number(matchedCampaign.finalAmount) || 0)
          : baseRegisteredCost;
    const { selectedDiscountCampaignId: _newSelCamp, ...newEntryCore } = entryPayload;

    const initialCampAssignment = currentEvent.eventType === 'Campa' && !isSiValue(entryPayload.isServer) 
      ? (parseInt(entryPayload.age) < 18 ? 'Teens' : 'Jóvenes') 
      : '';

    const finalVnpPersonId = candidateVnpId;

    const personData = { 
      ...newEntryCore, 
      id: docId, 
      status: 'active',
      registeredAt: regIso,
      registeredBy: currentUser?.username || '',
      vnpPersonId: finalVnpPersonId,
      isFirstVnpId: !idExistsAnywhere,
      location: loc, 
      travelFrom: (entryPayload.travelFrom || loc),
      travelTo: (entryPayload.travelTo || loc),
      eventId: currentEvent.id, 
      paymentHistory: initialHistory,
      registeredCost,
      registeredCostManual: false,
      campAssignment: initialCampAssignment,
      paid: initialPaidGross,
      paidNet: initialPaidNet,
      paymentMethod,
      paymentService,
      cardReference: paymentMethod === 'Tarjeta' ? (entryPayload.cardReference || '').trim() : '',
      whatsAppFinanceNotifications: prevWaNotifications,
      whatsAppMessageHistory: prevWaHistory,
      registrationComments: (() => {
        const t = newRegGeneralComment.trim();
        if (!t) return prevRegistrationComments;
        return [
          ...prevRegistrationComments,
          {
            id: `rc_${regInstant.getTime()}_${Math.random().toString(36).slice(2, 8)}`,
            text: t,
            createdAt: regInstant.getTime(),
            createdBy: currentUser?.username || '',
          },
        ];
      })(),
      responsivaStatus: (() => {
        if (!isResponsivaEventSectionVisible(currentEvent)) return '';
        if (!getResponsivaRequirementApplies(entryPayload, currentEvent)) return 'No aplica';
        return String(entryPayload.responsivaStatus || '').trim() === 'Entregada' ? 'Entregada' : 'Pendiente';
      })(),
      scholarshipPendingApproval: false,
      scholarshipType: 'none',
      scholarshipPartialAmount: 0,
      discountCampaignId: matchedCampaign?.id || '',
      discountCampaignConcept: matchedCampaign?.concept || '',
      discountCampaignAppliedAt: matchedCampaign ? Date.now() : null,
      refundPendingAmount: 0,
      refundPendingReason: '',
      ...(globalConfig?.isDebugMode ? { _isDebug: true, _debugSessionId: globalConfig.debugSessionId } : {})
    };

    if (currentEvent.eventType === 'Campa' || currentEvent.eventType === 'Bautizo') {
      personData.willBeBaptized = isSiValue(entryPayload.willBeBaptized) ? SI : 'No';
      if (!isSiValue(personData.willBeBaptized) || !isSiValue(entryPayload.isServer) || entryPayload.serverAssignment !== 'Ambos') {
        personData.baptismSegment = '';
      } else {
        personData.baptismSegment = String(entryPayload.baptismSegment || '').trim();
      }
      if (skipCampaignForAttendance) {
        personData.isScholarship = 'No';
        personData.scholarshipType = 'none';
        personData.scholarshipPartialAmount = 0;
        personData.attendanceSpecialType = entryPayload.attendanceSpecialType;
      }
      personData.baptismShirtSize = normalizeBaptismShirtSize(entryPayload.baptismShirtSize);
    }

    {
      const roles = entryPayload.attendanceRoles
        ? entryPayload.attendanceRoles
        : attendanceRolesFromLegacyPerson(entryPayload);
      const legacy = legacyFieldsFromAttendanceRoles(roles);
      personData.attendanceRoles = legacy.attendanceRoles;
      personData.isServer = legacy.isServer;
      personData.isScholarship = legacy.isScholarship;
      if (currentEvent.eventType === 'Campa' || currentEvent.eventType === 'Bautizo') {
        personData.willBeBaptized = legacy.willBeBaptized;
      }
      personData.attendanceSpecialType = legacy.attendanceSpecialType;
      if (entryPayload.costOverride != null && entryPayload.costOverride !== '') {
        personData.costOverride = Number(entryPayload.costOverride);
      }
    }

    if (false && currentEvent.eventType !== 'Campa') {
      personData.isScholarship = 'No';
      if (true) {
        personData.isServer = 'No';
        personData.serverAssignment = '';
      }
      personData.attendanceSpecialType = ATTENDANCE_SPECIAL.ninguno;
      if (true) {
        personData.canSwim = 'No';
        personData.hasAllergy = 'No';
        personData.hasDisease = 'No';
        personData.hasDisability = 'No';
      }
    }

    const spouseCtxAdd =
      (currentEvent.eventType === 'Campa') &&
      isSiValue(personData.isServer) &&
      isSiValue(entryPayload.isMarried);
    if (!isSiValue(entryPayload.isMarried)) {
      personData.spouseName = '';
      personData.spouseParticipantId = '';
      personData.spousePhone = '';
    } else if (spouseCtxAdd) {
      personData.spouseName = String(entryPayload.spouseName || '').trim();
      personData.spouseParticipantId = String(entryPayload.spouseParticipantId || '').trim();
      personData.spousePhone = String(entryPayload.spousePhone || '').trim();
    } else {
      personData.spouseParticipantId = '';
      personData.spousePhone = '';
      personData.spouseName = '';
    }

    if (spouseCtxAdd && personData.spouseParticipantId) {
      const v = await validateSpouseParticipantChoice({
        eventId: currentEvent.id, spouseParticipantId: personData.spouseParticipantId, });
      if (!v.ok) {
        showToast(v.error || 'No se pudo validar la pareja.');
        return;
      }
    }

        const liqReg = Number(getLiquidationTarget(personData)) || 0;
    const isLiquidadoReg = personData.isScholarship === 'No' && initialPaidGross >= liqReg;
    const pendingAfterRegister = Math.max(liqReg - initialPaidGross, 0);
    const registerCreatedAt = Date.now();
    const registerNotification = {
      id: `wa-reg-${registerCreatedAt}`,
      kind: 'registro',
      amount: initialPaidGross,
      pendingAmount: pendingAfterRegister,
      isLiquidado: isLiquidadoReg,
      liquidationTarget: liqReg,
      createdAt: registerCreatedAt,
      sent: false,
      sentAt: null,
      message: buildFinanceWhatsAppMessage({
        person: personData, amount: initialPaidGross, pendingAmount: pendingAfterRegister, isLiquidado: isLiquidadoReg, kind: 'registro', reportedAtMs: registerCreatedAt, liquidationTarget: liqReg, eventSnapshot: currentEvent, rosterParticipants: allParticipants, avisoUrl: privacyNoticePublicUrl, }),
    };
    personData.whatsAppFinanceNotifications = [...prevWaNotifications, registerNotification];

    applyParticipantNameFormattingForSave(personData);
    // Respaldo-primero: snapshot completo del formulario ANTES del write principal.
    const _regLogId = buildLogId();
    const _regSnapshot = {
      kind: previousParticipantData ? 'registro_actualizado' : 'registro_nuevo',
      isUpdate: !!previousParticipantData,
      loc,
      eventId: currentEvent?.id,
      eventName: currentEvent?.name,
      participant: prepareParticipantDocForFirestore(personData),
      bautizosCompanions: personData.bautizosCompanions || [],
      carDraftMeta: newRegDraftCarMeta || null,
    };
    try {
      await setDoc(
        getDocRef('app_participants', docId),
        prepareParticipantDocForFirestore(personData)
      );
      void logSnapshotBackup(_regLogId, {
        entityType: 'participant', snapshot: _regSnapshot, }).catch((err) => logAppError('handleAddEntry.snapshotBackup', err, { docId }));
      if (personData.llegaEnCarro || personData.regresaEnCarro) {
        try {
          const { syncRegistrationTravelToTransportPlan } = await import('../../../transport/registrationTravelBridge.jsx');
          await syncRegistrationTravelToTransportPlan({
            eventId: currentEvent?.id,
            plan: currentEvent?.transportPlanning,
            setPlan: (next) => {
              if (typeof patchEventTransportPlanningDeferred === 'function') {
                patchEventTransportPlanningDeferred(() => next);
              }
            },
            personSourceKey: `participant:${docId}`,
            personName: personData.name || '',
            llegaEnCarro: !!personData.llegaEnCarro,
          });
        } catch (travelErr) {
          console.warn('[registration] sync travel/car', travelErr);
        }
      }
    } catch (e) {
      logAppError('handleAddPerson.setDoc', e, { docId, name: personData?.name, eventId: currentEvent?.id });
      await addLog(
        'Nuevo Registro',
        `FALLÓ guardar el registro de ${personData?.name || ''} en ${loc}. Los datos quedaron respaldados en el log (snapshot).`,
        null,
        null,
        {
          collectionName: 'app_participants', action: previousParticipantData ? 'update' : 'create', previousData: previousParticipantData || null, },
        {
          logId: _regLogId, skipSnapshotWrite: true, hasSnapshot: true, entityType: 'participant', status: LOG_STATUS.ERROR, errorMessage: normalizeErrorMessage(e), isError: true, }
      );
      showToast('No se pudo guardar el registro. Los datos quedaron respaldados en Actividad.');
      throw e;
    }
    const comentarioInicialNuevoReg = newRegGeneralComment.trim();
    const comentarioInicialLog = comentarioInicialNuevoReg
      ? ` Comentario inicial: «${comentarioInicialNuevoReg.length > 200 ? `${comentarioInicialNuevoReg.slice(0, 200)}…` : comentarioInicialNuevoReg}».`
      : '';
    const _newRegLog = truncateActivityLogDetails(`${previousParticipantData ? 'Actualizó registro de' : 'Inscribió a'} ${entryPayload.name} en la sede ${loc}.${paymentService ? ` (Servicio: ${paymentService})` : ''} (Pago inicial: $${initialPaidGross} ${paymentMethod === 'Tarjeta' ? `(Tarjeta, Neto: $${initialPaidNet})` : '(Efectivo)'} )${isLiquidadoReg ? ' [LIQUIDADO]' : ''}${describeNewRegistrationCompanions(entryPayload.bautizosCompanions)}${comentarioInicialLog}`);

    persistLastSuccessfulRegistrationSnapshot(currentUser?.id, currentEvent?.id, entryPayload, {
      newRegGeneralComment,
      newRegDraftCarMeta,
    });
    scheduleRegistrationTransportSave({
      event: currentEvent,
      personData,
      draftMetaByVehicleKey: newRegDraftCarMeta,
      allParticipants,
      patchEventTransportPlanningDeferred,
      updateDoc,
      useBlankSlotMeta: true,
      onError: (err) => logAppError('handleAddEntry.transportV2', err, { docId, eventId: currentEvent?.id }),
    });
    resetRegistrationFormAfterSuccess(loc);
    startTransition(() => {
      refreshParticipantCache(personData, previousParticipantData ? 'Actualizar registro' : 'Nuevo registro', {
        eventId: currentEvent.id, skipRefetch: true, });
    });
    showToast('Registro añadido exitosamente.');

    void (async () => {
      try {
        logParticipantActivity(
          docId, 'privacidad', buildRegistrationPrivacyActivityMessage(
            mergedPrivacyNotice, newRegPrivacyAccepted, personData.sensitiveDataConsent
          )
        );
        if (spouseCtxAdd && personData.spouseParticipantId) {
          const sync = await syncSpouseParticipantLinks({
            eventId: currentEvent.id,
            personId: docId,
            previousSpouseId: previousSpouseIdForLink,
            nextSpouseId: personData.spouseParticipantId,
            currentPersonName: String(personData.name || '').trim(),
          });
          if (!sync.ok) {
            showToast(sync.error || 'Registro guardado, pero no se pudo vincular la pareja. Intenta desde edición.');
          }
        }
        addLog(
          'Nuevo Registro', _newRegLog, null, null, {
            collectionName: 'app_participants',
            docId,
            action: previousParticipantData ? 'update' : 'create',
            previousData: previousParticipantData || null,
          }, {
            logId: _regLogId,
            skipSnapshotWrite: true,
            hasSnapshot: true,
            entityType: 'participant',
            entityId: docId,
            status: LOG_STATUS.OK,
          }
        );
        logParticipantActivity(docId, 'registro', _newRegLog);
      } catch (postErr) {
        logAppError('handleAddEntry.postRegister', postErr, { docId, loc, eventId: currentEvent?.id });
      }
    })();
    } finally {
      getScope().isRegisteringRef.current = false;
    }
}

export async function runUpdateEntry(getScope, e) {
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
    e.preventDefault();
    const wasInlineEdit = editRegistryModal.variant === 'inline';
    const inlineEditPersonId = editRegistryModal.data?.id;
    const { data: editedPerson } = editRegistryModal;
    if (!hasEventAccess(currentEvent?.id) || !hasLocationAccess(loc)) {
      showToast("No tienes permisos para editar en esta sede/evento.");
      return;
    }
    const editPrivacyAccepted = !!(editedPerson.privacyNoticeAcceptedAt || '').trim() || editPrivacyAck;
    let companionWaitlistNewCount = 0;

    const originalPerson =
      (data[loc] || []).find((p) => String(p.id) === String(editedPerson.id)) ||
      (waitlistData[loc] || []).find((p) => String(p.id) === String(editedPerson.id)) ||
      (cancelledData[loc] || []).find((p) => String(p.id) === String(editedPerson.id));
    if (!originalPerson) {
      showToast('No se encontró el registro a actualizar.');
      return;
    }

    const editIssues = getScope().getRegistrationFormIssues(editedPerson, 0, currentEvent.eventType, null, currentEvent, {
      privacyAccepted: editPrivacyAccepted, sensitiveConsent: editedPerson.sensitiveDataConsent ?? '', requirePrivacy: !(editedPerson.privacyNoticeAcceptedAt || '').trim(), originalPerson, });
    if (editIssues.length) {
      getScope().showRegistrationValidationIssues(editIssues);
      return;
    }

        const editDigits = digitsOnlyPhone(editedPerson.phone);
    if (
      phoneDuplicateInEvent(
        editedPerson.name,
        editDigits,
        allParticipants,
        currentEvent.id,
        editedPerson.id,
        editedPerson.age,
        !!editedPerson.allowSharedMainPhone
      )
    ) {
      showToast('Otro registro en este evento ya usa este teléfono.');
      return;
    }

    const bautizosPartyChanged =
      false /* Bautizos unsupported in v2 */ &&
      (JSON.stringify(bzEvtCompanionsArray(originalPerson)) !== JSON.stringify(bzEvtCompanionsArray(editedPerson)) ||
        String(originalPerson.bautizosAttendanceType || '') !== String(editedPerson.bautizosAttendanceType || '') ||
        String(originalPerson.wantsBautizosTransport || '') !== String(editedPerson.wantsBautizosTransport || '') ||
        originalPerson.llegaEnCarro !== editedPerson.llegaEnCarro ||
        originalPerson.regresaEnCarro !== editedPerson.regresaEnCarro ||
        String(originalPerson.travelFrom || '') !== String(editedPerson.travelFrom || '') ||
        String(originalPerson.travelTo || '') !== String(editedPerson.travelTo || ''));
    const scholarshipToggled =
      String(originalPerson.isScholarship ?? '') !== String(editedPerson.isScholarship ?? '');
    const scholarshipTypeChangedRaw =
      String(originalPerson.scholarshipType ?? '') !== String(editedPerson.scholarshipType ?? '');
    const scholarshipPartialChangedRaw =
      Number(originalPerson.scholarshipPartialAmount ?? 0) !== Number(editedPerson.scholarshipPartialAmount ?? 0);
    const scholarshipDetailsMeaningful =
      isSiValue(originalPerson.isScholarship) || isSiValue(editedPerson.isScholarship);
    const scholarshipFieldsTouched =
      scholarshipToggled ||
      (scholarshipDetailsMeaningful && (scholarshipTypeChangedRaw || scholarshipPartialChangedRaw));

    const changes = buildRegistrationEditScalarChanges({
      originalPerson, editedPerson, eventType: currentEvent?.eventType, scholarshipDetailsMeaningful, hasAdminRights, resolveSpouseName: (id) => {
        const p = allParticipants.find((x) => String(x?.id || '') === String(id));
        return p?.name ? String(p.name).trim() : '';
      }, includeManualRegisteredCost: !!editedPerson.registeredCostManual, });

    const originalPaid = parseFloat(originalPerson.paid || 0);
    const newPaid = parseFloat(editedPerson.paid || 0);
    let updatedHistory = editedPerson.paymentHistory || [];
    let finalRegisteredCost = resolveRegisteredCost(editedPerson, currentPricing);

    if (hasAdminRights && newPaid !== originalPaid) {
      const adjustmentMethod = originalPerson.paymentMethod === 'Tarjeta' ? 'Tarjeta' : 'Efectivo';
      const adjustmentService = SERVICE_OPTIONS.includes(originalPerson.paymentService) ? originalPerson.paymentService : NO_SERVICE_LABEL;
      const commissionRate = getCardCommissionRate();
      const grossDelta = newPaid - originalPaid;
      const commission = adjustmentMethod === 'Tarjeta' ? grossDelta * commissionRate : 0;
      const netDelta = adjustmentMethod === 'Tarjeta' ? (grossDelta - commission) : grossDelta;

      const adjInstant = new Date();
      updatedHistory = [...updatedHistory, {
        id: Date.now(),
        date: adjInstant.toLocaleString('es-MX'),
        recordedAt: adjInstant.toISOString(),
        amount: grossDelta,           // bruto
        netAmount: netDelta,         // neto
        method: adjustmentMethod,
        service: adjustmentService,
        reference: '',
        commission,
        registeredBy: currentUser?.username,
        isManualAdjustment: true
      }];
    }

    if (
      !editedPerson.registeredCostManual &&
      (originalPerson.isServer !== editedPerson.isServer ||
        originalPerson.serverAssignment !== editedPerson.serverAssignment ||
        String(originalPerson.ambosServeInSegment || '') !== String(editedPerson.ambosServeInSegment || '') ||
        bautizosPartyChanged)
    ) {
      finalRegisteredCost = getPersonCost(editedPerson, currentPricing, currentEvent);
      const prevListCost = Number(originalPerson.registeredCost ?? 0);
      if (Number(finalRegisteredCost) !== prevListCost) {
        const costReason = bautizosPartyChanged
          ? 'por cambio de acompañantes o transporte'
          : originalPerson.isServer !== editedPerson.isServer ||
              originalPerson.serverAssignment !== editedPerson.serverAssignment ||
              String(originalPerson.ambosServeInSegment || '') !== String(editedPerson.ambosServeInSegment || '')
            ? 'por perfil servidor'
            : '';
        const costLine = describeRegisteredCostChange(prevListCost, finalRegisteredCost, costReason);
        if (costLine) changes.push(costLine);
      }
    }

    const finalLocation = hasAdminRights ? (editedPerson.location || loc) : loc;
    let payload = {
      ...editedPerson, location: finalLocation, eventId: currentEvent.id, paymentHistory: updatedHistory, registeredCost: finalRegisteredCost
    };

    // Mantener consistencia de paidNet cuando admin modifica el total pagado
    if (hasAdminRights && newPaid !== originalPaid) {
      const originalPaidNet = Number.isFinite(parseFloat(originalPerson.paidNet || 0)) ? parseFloat(originalPerson.paidNet || 0) : originalPaid;
      const adjustmentMethod = originalPerson.paymentMethod === 'Tarjeta' ? 'Tarjeta' : 'Efectivo';
      const commissionRate = getCardCommissionRate();
      const grossDelta = newPaid - originalPaid;
      const commission = adjustmentMethod === 'Tarjeta' ? grossDelta * commissionRate : 0;
      const netDelta = adjustmentMethod === 'Tarjeta' ? (grossDelta - commission) : grossDelta;
      payload.paidNet = originalPaidNet + netDelta;
    }

    if (globalConfig?.isDebugMode) {
      payload._isDebug = true;
      payload._debugSessionId = globalConfig.debugSessionId;
    }

    if (
      scholarshipFieldsTouched &&
      currentEvent.eventType === 'Campa' &&
      isSiValue(editedPerson.isScholarship) &&
      editedPerson.scholarshipType === 'partial'
    ) {
      const montoBecado = parseFloat(editedPerson.scholarshipPartialAmount || 0);
      const partialScholarshipListCap = getPersonCost(editedPerson, currentPricing, currentEvent);
      // Requerimiento: el monto becado puede ser 0. Tope = costo lista por perfil (servidor Ambos = costo servidor).
      if (!Number.isFinite(montoBecado) || montoBecado < 0 || montoBecado >= partialScholarshipListCap) {
        showToast('Beca parcial: el monto becado debe ser mayor o igual que 0 y menor que el costo de lista según asignación de servidor o campista.');
        return;
      }
    }

    const keepOriginalFieldValue = (key) => {
    const { ATTENDANCE_SPECIAL, BACKUP_RETENTION_MONTHS, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT, EXCEL_ROSTER_FINANCE_COL_COUNT, EmailAuthProvider, EventHubScreenLazy, GoogleAuthProvider, LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, LoginScreenLazy, MASKED_EXPENSE_CONCEPT_LABEL, PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, SESSION_TTL_MS, Suspense, action, all, allParticipants, anonymousAuthPanel, app, applyKeyValueSheetStyles, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, backfillActiveRosterBusy, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage } = getScope();
    const { buildCashCutWeekAndSundayMaps, buildExcelExportFilename, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines, buildUsernameCandidates, bulkResyncBusy, busLines, calculateAgeFromBirthDate, canCancelRegistrations, canDelegateCancelRegistrations, canDeleteSystemLogs, canMarkPersonsOfInterest, carLines, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, collectionName, commitDeleteRefsInBatches, commitSetPayloadsInBatches, compareParticipantsByRegisteredAtAsc, confirmPassword, countAmbosDoubleInAllCounts, countOtherActiveSessions, currentPasswordInput, currentUser, cutMeta, cutRows, darkMode, db, debugToast, deleteDoc, deleteEventModal, deleteField } = getScope();
    const { deleteUserConfirmModal, donations, downloadExcelBytes, draggedEventId, editingUser, editingUserPlainPwdVisible, emailError, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, expandedLogId, expenses, extractLogMillis, fieldStack, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate, formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatSiNo, getBaptismAccountingSegment, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getLogDateISO, getMaxConcurrentSessionsForUser, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getTabSessionId, getWeekKeyFromDate, getWhatsAppNotificationMarkKey, globalConfig, hasValidFullName } = getScope();
    const { includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isDailyBackupDue, isDerivedAutoExpenseIdForEvent, isFreeAttendanceType, isResponsivaEnabledForEvent, isSiValue, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadSheetJS, log, logBulkDeleteBusy, logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay, logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed, logsHasMoreOlder, logsLoading, logsLoadingMore } = getScope();
    const { logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading, logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, needsFirestoreResyncAfterBulk, newEventData, newPassword, newUser, newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, parseFlexibleInstantMs, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, passengersForBusGroup, password, passwordHash, performAppFullBackup, query, reauthenticateWithCredential, registrationRequiresResponsivaStatus, renameModal, resolveLlegaEnCarro, resolveRegresaEnCarro } = getScope();
    const { resolveStaffLoginEmail, resolveTransportSummary, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal, setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedLogId, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode, setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek } = getScope();
    const { setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen, setPanelNavForm, setPanelNavModalOpen, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setSelectedLogs, setShowDebugLogs, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch, shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, signInWithEmailAndPassword, signInWithPopup, signOut, sundayKeys, sundayMap, superSessionCount, syncEventAfterWrite, systemView, titular, toLocalISODate, toast, uiModal, updateDoc, updatePassword, useCallback } = getScope();
    const { useEffect, useRef, userAccessScopeOpenId, userCanMarkResponsivaLocalQuickAction, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersMobileMenuOpen, usersPanelSearch, weekKeys, weekMap, where, writeStaffSessionLogOnce } = getScope();
      if (Object.prototype.hasOwnProperty.call(originalPerson, key)) {
        payload[key] = originalPerson[key];
      } else {
        delete payload[key];
      }
    };

    if (scholarshipFieldsTouched) {
      if (isSiValue(editedPerson.isScholarship)) {
        payload.scholarshipType = editedPerson.scholarshipType === 'partial' ? 'partial' : 'total';
        payload.scholarshipPartialAmount = editedPerson.scholarshipType === 'partial'
          ? parseFloat(editedPerson.scholarshipPartialAmount || 0)
          : 0;
      } else {
        payload.scholarshipType = 'none';
        payload.scholarshipPartialAmount = 0;
        payload.scholarshipPendingApproval = false;
      }
    } else {
      // Si el usuario no tocó beca, no forzar defaults ni normalizaciones.
      keepOriginalFieldValue('isScholarship');
      keepOriginalFieldValue('scholarshipType');
      keepOriginalFieldValue('scholarshipPartialAmount');
      keepOriginalFieldValue('scholarshipPendingApproval');
    }
    if (isResponsivaEventSectionVisible(currentEvent)) {
      if (!getResponsivaRequirementApplies(editedPerson, currentEvent)) {
        payload.responsivaStatus = 'No aplica';
      } else {
        payload.responsivaStatus = getResponsivaCardUiState(editedPerson, currentEvent).delivered ? 'Entregada' : 'Pendiente';
      }
    } else {
      payload.responsivaStatus = '';
    }
    const origCampId = String(originalPerson.discountCampaignId || '');
    const rawCampChoice = editedPerson.editApplyCampaignId;
    const campaignEditChoice = rawCampChoice === '__clear__' ? '__none__' : String(rawCampChoice || '');
    if (hasAdminRights && Array.isArray(currentEvent?.discountCampaigns) && currentEvent.discountCampaigns.length > 0) {
      if (campaignEditChoice === '__none__' || campaignEditChoice === '') {
        if (origCampId) {
          payload.registeredCost = getPersonCost(editedPerson, currentPricing, currentEvent);
          payload.discountCampaignId = '';
          payload.discountCampaignConcept = '';
          payload.discountCampaignAppliedAt = null;
          changes.push(`Campaña quitada; costo de lista del evento: $${payload.registeredCost}`);
        }
      } else if (campaignEditChoice && campaignEditChoice !== '__none__') {
        if (campaignEditChoice === origCampId) {
          // Misma campaña que ya tenía el registro: no recalcular costo desde la campaña (respeta el costo fijado en el formulario).
        } else {
          const c = findDiscountCampaignById(currentEvent, campaignEditChoice);
          if (!c || c.enabled === false) {
            showToast('Campaña no válida o desactivada.');
            return;
          }
          if (!campaignMatchesPersonProfile(c, editedPerson)) {
            showToast('Esa campaña no aplica al perfil servidor/campista de este registro.');
            return;
          }
          payload.registeredCost = Math.max(0, Number(c.finalAmount) || 0);
          payload.discountCampaignId = c.id || '';
          payload.discountCampaignConcept = c.concept || '';
          payload.discountCampaignAppliedAt = Date.now();
          changes.push(`Campaña: ${c.concept} · liquidar $${payload.registeredCost}`);
        }
      }
    }
    delete payload.editApplyCampaignId;
    delete payload.applyActiveCampaignNow;
    delete payload.selectedDiscountCampaignId;

    if (currentEvent.eventType === 'Campa') {
      const att = normalizeAttendanceSpecial(editedPerson);
      payload.attendanceSpecialType = att;
      if (isFreeAttendanceType(att)) {
        payload.registeredCost = getPersonCost(editedPerson, currentPricing, currentEvent);
        payload.discountCampaignId = '';
        payload.discountCampaignConcept = '';
        payload.discountCampaignAppliedAt = null;
        payload.isScholarship = 'No';
        payload.scholarshipType = 'none';
        payload.scholarshipPartialAmount = 0;
        payload.scholarshipPendingApproval = false;
      }
      payload.isPastorChild = deleteField();
      payload.pastorChildWithoutPay = deleteField();
      payload.pastorChildSpecialDonationFinanceId = deleteField();
      payload.willBeBaptized = isSiValue(editedPerson.willBeBaptized) ? SI : 'No';
      if (!isSiValue(payload.willBeBaptized) || !isSiValue(editedPerson.isServer) || editedPerson.serverAssignment !== 'Ambos') {
        payload.baptismSegment = '';
      } else {
        const bs = String(editedPerson.baptismSegment || '').trim();
        if (bs !== 'Teens' && bs !== 'Jóvenes') {
          showToast('Si marca bautizo y el servidor es Ambos, elija si el conteo va en Teens o Jóvenes.');
          return;
        }
        payload.baptismSegment = bs;
      }
      payload.baptismShirtSize = normalizeBaptismShirtSize(editedPerson.baptismShirtSize);
    } else if (true) {
      payload.attendanceSpecialType = ATTENDANCE_SPECIAL.ninguno;
      payload.willBeBaptized = 'No';
      payload.baptismSegment = '';
    }

        {
      const serverChanged =
        originalPerson.isServer !== editedPerson.isServer ||
        originalPerson.serverAssignment !== editedPerson.serverAssignment ||
        String(originalPerson.ambosServeInSegment || '') !== String(editedPerson.ambosServeInSegment || '');
      const freeAtt =
        isPastorParticipant(editedPerson, currentEvent.eventType) ||
        isFreeAttendanceType(normalizeAttendanceSpecial(editedPerson)) ||
        (false /* Bautizos unsupported in v2 */ && bzEvtIsFreeAttendance(editedPerson));
      const campCleared =
        hasAdminRights &&
        Array.isArray(currentEvent?.discountCampaigns) &&
        currentEvent.discountCampaigns.length > 0 &&
        (campaignEditChoice === '__none__' || campaignEditChoice === '') &&
        !!origCampId;
      const newCampaignChosen =
        hasAdminRights &&
        Array.isArray(currentEvent?.discountCampaigns) &&
        currentEvent.discountCampaigns.length > 0 &&
        campaignEditChoice &&
        campaignEditChoice !== '__none__' &&
        campaignEditChoice !== origCampId;
      let rm = editedPerson.registeredCostManual === true;
      if (serverChanged || freeAtt || campCleared || newCampaignChosen || bautizosPartyChanged) rm = false;
      payload.registeredCostManual = rm;
      if (isPastorParticipant(editedPerson, currentEvent.eventType)) {
        payload.registeredCost = 0;
        payload.registeredCostManual = false;
      }
    }

    const mergedForRefund = { ...editedPerson, ...payload };
    const refundDiff = Math.max(0, (parseFloat(mergedForRefund.paid || 0) || 0) - (Number(getLiquidationTarget(mergedForRefund)) || 0));
    payload.refundPendingAmount = refundDiff;
    payload.refundPendingReason =
      refundDiff > 0 ? (payload.registeredCostManual === true ? 'manual_cost_credit' : 'campaign_discount') : '';

    const sumAbonosFromHistory = (hist) =>
      (hist || []).reduce((s, h) => {
        if (!h || h.kind === 'comment' || h.kind === REFUND_DISBURSEMENT_PAYMENT_KIND) return s;
        return s + (Number(h.amount) || 0);
      }, 0);
    const mergedForCampCostCheck = { ...editedPerson, ...payload };
    const liqCamp = Number(getLiquidationTarget(mergedForCampCostCheck)) || 0;
    const paidField = parseFloat(mergedForCampCostCheck.paid || 0) || 0;
    const sumHistGross = sumAbonosFromHistory(payload.paymentHistory);
    const abonosTotal = Math.max(paidField, sumHistGross);
    if (
      currentEvent.eventType === 'Campa' &&
      !participantIsCancelled(originalPerson) &&
      !isFreeAttendanceType(normalizeAttendanceSpecial(mergedForCampCostCheck)) &&
      liqCamp > 0.005 &&
      abonosTotal > liqCamp + 0.01 &&
      payload.registeredCostManual !== true
    ) {
      showToast(
        `El costo a liquidar ($${liqCamp.toLocaleString('es-MX', { minimumFractionDigits: 2 })}) no puede ser menor que la suma de abonos ($${abonosTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}). Ajusta el costo o la campaña, o corrige el historial de pagos.`
      );
      return;
    }

    if ((originalPerson.status || 'active') === 'waitlist') {
      payload.status = 'waitlist';
      if (originalPerson.waitlistCreatedAt != null) payload.waitlistCreatedAt = originalPerson.waitlistCreatedAt;
      if (isSiValue(payload.isScholarship)) payload.scholarshipPendingApproval = true;
    } else if (participantIsCancelled(originalPerson)) {
      payload.status = PARTICIPANT_STATUS_CANCELLED;
      if (originalPerson.cancelledAt != null) payload.cancelledAt = originalPerson.cancelledAt;
      payload.cancelledFromLocation = originalPerson.cancelledFromLocation || loc;
      payload.refundPendingAmount = originalPerson.refundPendingAmount ?? 0;
      payload.refundAsDonation = originalPerson.refundAsDonation ?? false;
    }

    const spouseCtxEdit =
      (currentEvent.eventType === 'Campa') &&
      isSiValue(payload.isServer) &&
      isSiValue(editedPerson.isMarried);
    if (!isSiValue(editedPerson.isMarried)) {
      payload.spouseName = '';
      payload.spouseParticipantId = '';
      payload.spousePhone = '';
    } else if (spouseCtxEdit) {
      payload.spouseName = String(editedPerson.spouseName || '').trim();
      payload.spouseParticipantId = String(editedPerson.spouseParticipantId || '').trim();
      payload.spousePhone = String(editedPerson.spousePhone || '').trim();
    } else {
      payload.spouseParticipantId = '';
      payload.spousePhone = '';
      payload.spouseName = '';
    }

    if (spouseCtxEdit && payload.spouseParticipantId) {
      const v = await validateSpouseParticipantChoice({
        eventId: currentEvent.id,
        spouseParticipantId: payload.spouseParticipantId,
        excludePersonId: editedPerson.id,
      });
      if (!v.ok) {
        showToast(v.error || 'No se pudo validar la pareja.');
        return;
      }
    }

    const mergedForVnpId = { ...originalPerson, ...editedPerson, ...payload };
    if (
      hasValidFullName(mergedForVnpId.name || '') &&
      (mergedForVnpId.birthDate || '').trim() &&
      String(mergedForVnpId.gender || '').trim()
    ) {
      const genVnp = canonicalizeVnpPersonId(generateVnpPersonId(mergedForVnpId));
      if (genVnp) payload.vnpPersonId = genVnp;
    } else if (!payload.vnpPersonId) {
      const gen = canonicalizeVnpPersonId(generateVnpPersonId(mergedForVnpId));
      if (gen) payload.vnpPersonId = gen;
    } else {
      const c = canonicalizeVnpPersonId(payload.vnpPersonId);
      if (c) payload.vnpPersonId = c;
    }

    const birthIso = normalizeBirthDateToIso(editedPerson.birthDate ?? payload.birthDate);
    payload.birthDate = birthIso;
    payload.age = birthIso ? calculateAgeFromBirthDate(birthIso) : String(editedPerson.age || '').trim();

    const prevVnpForSync = canonicalizeVnpPersonId(originalPerson.vnpPersonId || '');
    const nextVnpCanonical = canonicalizeVnpPersonId(payload.vnpPersonId || '');
    const birthDateChanged =
      normalizeBirthDateToIso(originalPerson.birthDate) !== normalizeBirthDateToIso(payload.birthDate);
    const vnpIdChanged = Boolean(prevVnpForSync && nextVnpCanonical && prevVnpForSync !== nextVnpCanonical);

    let otherParticipantRefsToPatch = [];
    if (prevVnpForSync && (birthDateChanged || vnpIdChanged)) {
      try {
        const q = query(getColRef('app_participants'), where('vnpPersonId', '==', prevVnpForSync));
        const snap = await getDocs(q);
        snap.forEach((d) => {
          if (d.id !== String(editedPerson.id)) otherParticipantRefsToPatch.push(d.ref);
        });
      } catch (err) {
        console.error(err);
        showToast('No se pudieron buscar otros registros con el mismo ID VNPM para sincronizar.');
        return;
      }
    }

    /**
     * Limpieza final: quita del payload campos que no aplican al tipo de evento.
     * Si el original ya tenía valores legítimos (registro migrado entre eventos), los
     * conservamos para no perder información histórica; pero impedimos que defaults
     * espurios del modal de edición (ej. campAssignment 'Jóvenes' por edad en un
     * registro de Bautizos) se persistan.
     */
    const sanitizedPayload = cleanParticipantPayloadForEventType(
      payload,
      originalPerson,
      currentEvent?.eventType
    );
    const prevSensConsent = String(originalPerson.sensitiveDataConsent || '');
    const nextSensConsent = String(editedPerson.sensitiveDataConsent ?? '').trim();
    const privacyFieldsEdit = privacyConsentFieldsForSave({
      privacyNotice: mergedPrivacyNotice,
      privacyAccepted: editPrivacyAccepted,
      sensitiveConsent: nextSensConsent,
      channel: editedPerson.privacyNoticeChannel || originalPerson.privacyNoticeChannel || 'manual_staff',
      existing: originalPerson,
    });
    const preserveLegacySensitive =
      !nextSensConsent &&
      participantHasSensitiveHealthData(originalPerson) &&
      !participantHasSensitiveHealthDataAddedBeyond(originalPerson, editedPerson);
    let payloadWithPrivacy = applySensitiveConsentToParticipantPayload(
      { ...sanitizedPayload, ...privacyFieldsEdit },
      nextSensConsent,
      { preserveLegacySensitive }
    );
    if (!nextSensConsent && !preserveLegacySensitive) {
      payloadWithPrivacy.sensitiveDataConsent = deleteField();
      payloadWithPrivacy.sensitiveDataConsentAt = deleteField();
    }
    payloadWithPrivacy = prepareParticipantDocForFirestore(payloadWithPrivacy);
    Object.assign(payloadWithPrivacy, participantConsentFirestoreRepairPatch(originalPerson, deleteField));
    payloadWithPrivacy = prepareParticipantDocForFirestore(payloadWithPrivacy);
    // Respaldo-primero: snapshot del payload de edición ANTES del write principal.
    const _editLogId = buildLogId();
    await logSnapshotBackup(_editLogId, {
      entityType: 'participant',
      entityId: String(editedPerson.id),
      snapshot: {
        kind: 'registro_editado',
        eventId: currentEvent?.id,
        eventName: currentEvent?.name,
        eventType: currentEvent?.eventType,
        location: payloadWithPrivacy.location || editedPerson.location,
        payload: payloadWithPrivacy,
        bautizosCompanions: payload.bautizosCompanions || editedPerson.bautizosCompanions || [],
        carDraftMeta: editRegDraftCarMeta || null,
        previousData: originalPerson,
      },
    });
    try {
      await setDoc(getDocRef('app_participants', String(editedPerson.id)), payloadWithPrivacy, { merge: true });
    } catch (err) {
      const code = String(err?.code || '');
      console.error(err);
      logAppError('handleEditRegistry.setDoc', err, { docId: String(editedPerson.id), name: originalPerson?.name });
      await addLog(
        'Actualización de Registro',
        `FALLÓ actualizar el registro de ${originalPerson?.name || ''}. Los datos quedaron respaldados en el log (snapshot).`,
        null,
        null,
        { collectionName: 'app_participants', docId: String(editedPerson.id), action: 'update', previousData: originalPerson },
        {
          logId: _editLogId,
          skipSnapshotWrite: true,
          hasSnapshot: true,
          entityType: 'participant',
          entityId: String(editedPerson.id),
          status: LOG_STATUS.ERROR,
          errorMessage: normalizeErrorMessage(err),
          isError: true,
        }
      );
      showToast(
        code === 'permission-denied'
          ? 'Firestore rechazó la actualización (permisos o reglas). Datos respaldados en Actividad. Si persiste, publica firestore.rules en la BD registros-vnpm.'
          : err?.message || 'No se pudo guardar el registro. Datos respaldados en Actividad.'
      );
      return;
    }

        const newLocation = payloadWithPrivacy.location || editedPerson.location;
    const localPatch = patchForLocalParticipantCache(payloadWithPrivacy);
    localPatch.birthDate = birthIso;
    localPatch.age = payload.age;
        refreshParticipantCache(
      { ...editedPerson, eventId: currentEvent?.id, location: newLocation },
      'Edición de registro',
      {
        personId: editedPerson.id,
        patch: localPatch,
        previousLocation: loc,
      }
    );

        if (prevSensConsent !== nextSensConsent) {
      logParticipantActivity(
        String(editedPerson.id),
        'privacidad',
        `Perfil permanente / datos médicos: ${prevSensConsent || '—'} → ${nextSensConsent}.`
      );
    }

    if (otherParticipantRefsToPatch.length) {
      const patch = omitUndefinedDeep({
        birthDate: payload.birthDate,
        age: payload.age,
        ...(nextVnpCanonical ? { vnpPersonId: nextVnpCanonical } : {}),
      });
      try {
        let batch = writeBatch(db);
        let n = 0;
        for (const ref of otherParticipantRefsToPatch) {
          batch.update(ref, patch);
          n++;
          if (n >= 450) {
            await batch.commit();
            batch = writeBatch(db);
            n = 0;
          }
        }
        if (n) await batch.commit();
        const vnpSyncLocs = new Set();
        if (loc) vnpSyncLocs.add(String(loc).trim());
        for (const ref of otherParticipantRefsToPatch) {
          try {
            const snap = await getDoc(ref);
            if (snap.exists() && snap.data()?.location) {
              vnpSyncLocs.add(String(snap.data().location).trim());
            }
          } catch {
            /* omitir sede si no se puede leer */
          }
        }
      } catch (err) {
        console.error(err);
        showToast('Registro guardado, pero no se pudieron actualizar otros eventos con el mismo ID VNPM.');
      }
    }

    const prevSpouse = String(originalPerson.spouseParticipantId || '').trim();
    const nextSpouse = spouseCtxEdit ? String(payload.spouseParticipantId || '').trim() : '';
    if (prevSpouse || nextSpouse) {
      const sync = await syncSpouseParticipantLinks({
        eventId: currentEvent.id,
        personId: String(editedPerson.id),
        previousSpouseId: prevSpouse,
        nextSpouseId: nextSpouse,
        currentPersonName: String(sanitizedPayload.name ?? payload.name ?? editedPerson.name ?? '').trim(),
      });
      if (!sync.ok) {
        showToast(sync.error || 'No se pudo actualizar el vínculo con la pareja.');
      }
    }

    if (changes.length > 0) {
      const mergedForLiq = { ...editedPerson, ...payload };
      const isLiquidado = parseFloat(mergedForLiq.paid) >= getLiquidationTarget(mergedForLiq);
      const _updLog = truncateActivityLogDetails(`Modificó datos de ${originalPerson.name} en ${loc}.${isLiquidado ? ' [LIQUIDADO]' : ''} Cambios: ${changes.join(', ')}`);
      addLog('Actualización de Registro', _updLog, null, null, { collectionName: 'app_participants', docId: String(editedPerson.id), action: 'update', previousData: originalPerson }, {
        logId: _editLogId,
        skipSnapshotWrite: true,
        hasSnapshot: true,
        entityType: 'participant',
        entityId: String(editedPerson.id),
        status: LOG_STATUS.OK,
      });
      logParticipantActivity(String(editedPerson.id), 'actualizacion', _updLog);
    }
    getScope().resetEditRegistryModal();
    if (wasInlineEdit && inlineEditPersonId != null) {
      setExpandedRows((prev) => {
        const next = new Set(prev);
        next.delete(inlineEditPersonId);
        return next;
      });
      scrollRosterRowIntoView(loc, inlineEditPersonId);
    }
    showToast(
      companionWaitlistNewCount > 0
        ? `Registro actualizado. ${companionWaitlistNewCount} acompañante(s) quedaron en lista de espera (cupo lleno).`
        : 'Registro actualizado.'
    );
}
