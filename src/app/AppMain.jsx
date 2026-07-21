import React, { useState, useMemo, useEffect, useLayoutEffect, useCallback, useRef, lazy, Suspense, startTransition, useDeferredValue } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  buildPathFromNavState,
  buildPathFromNavSnapshot,
  parseAppPathname,
  findEventByUrlSlug,
  routeSegmentToActiveTab,
  pathsEqualForRouter,
  isEventSelectionPath,
} from '../appRoutes.js';
import {
  useAuthSessionState,
  resolveStaffLoginEmail,
  mapStaffLoginFirebaseError,
} from '../hooks/auth/useAuthSessionState.js';
import { useShallowStableMemo } from '../hooks/useShallowStableMemo.js';
import { useAppNavigation } from '../hooks/navigation/useAppNavigation.js';
import { useCompanionCollisions } from '../hooks/firestore/useCompanionCollisions.js';
import { useEventWorkspaceData } from '../hooks/workspace/useEventWorkspaceData.js';
import {
  getUserAllowedEventIds as rbacGetUserAllowedEventIds,
  getUserAllowedLocationsLegacy,
  getUserAllowedLocationNamesForEvent,
  filterParticipantsByLocationScope,
  buildLocationScopeSet,
  participantInLocationScope,
  getUserAllowedPanelSectionsForEvent,
  panelMenuAccessEffectivelyChanged,
  mergePanelSectionLayers,
  isPanelNavKeyAllowed,
  userCanAccessExpenseList,
  hasFinancialAccess as rbacHasFinancialAccess,
  canViewSystemLogs,
  canDeleteSystemLogs,
  canAddRegistrations,
  canEditAbonosRegistryAndDeleteHistory,
  userCanDeletePaymentHistoryRow,
  userCanSendWhatsAppQuickAction,
  userCanMarkResponsivaLocalQuickAction,
  userCanSendResponsivaDigitalQuickAction,
  canMarkPersonsOfInterest,
  canCancelRegistrations,
  canArchiveRegistrations,
  canDelegateCancelRegistrations,
  userCanEditTransportPlanning,
  userCanEditTransportOperations,
} from '../rbac/permissions.js';
import {
  subscribePersonOfInterestVnpSet,
  setVnpPersonOfInterestFlag,
  fetchVnpPersonFlag,
  personLikeIsPersonOfInterest,
  registrationPersonOfInterestMessage,
  personOfInterestRegistrationBlockedMessage,
  VNP_PERSON_FLAGS_COLLECTION,
} from '../vnpPersonFlags.js';
import UserPermissionBadges from '../rbac/UserPermissionBadges.jsx';
import UserAccessScopePanel from '../rbac/UserAccessScopePanel.jsx';
import AdvancedUserPermissionsPanel from '../rbac/AdvancedUserPermissionsPanel.jsx';
import { viewerCanSeeTargetPermissionMeta, normalizeRole } from '../rbac/roles.js';
import SystemViewGuard from '../rbac/SystemViewGuard.jsx';
import {
  Users, UserPlus, MapPin, PieChart, Plus, Trash2, DollarSign, CheckCircle2, XCircle, AlertTriangle, AlertCircle, Clock,
  LayoutDashboard, PanelLeft, Phone, ShieldAlert, Power, BarChart3, Edit3, TableProperties, Briefcase, Gift,
  Eye, EyeOff, Search, Filter, ArrowUpDown, CreditCard, ChevronDown, ChevronUp, ChevronRight,
  Wallet, GraduationCap, Droplets, Activity, LogOut, UserCog, History, Lock, Shield,
  UserCircle, Receipt, CalendarRange, ListPlus, GripVertical, Settings2, Undo, ArrowLeft, RotateCcw,
  SlidersHorizontal, Bug, Download, Send, Database, Menu, FileSpreadsheet, MessageCircle, MessageSquare, ClipboardList,
  Scissors, Calendar, Church, Archive, Ban, QrCode, Percent, Heart, FileText, FileSignature, Scale, Bus, Car, X, Copy, Link2,
} from 'lucide-react';
import {
  defaultOptionalVisibility,
  normalizeOptionalVisibility,
  PUBLIC_OPTIONAL_GROUP_LABELS,
  PUBLIC_OPTIONAL_GROUP_ORDER,
  PUBLIC_OPTIONAL_KEYS,
  getPricingFromSnapshot,
  getPricingFromSnapshotForDate,
  getPersonCost,
  accumulateDashboardParticipantDemographics,
  resolveDashboardParticipantAgeYears,
  attendanceSpecialChoiceButtonClass,
  buildAmbosServeInSegmentOptionLabels,
  normalizeServerTierCosts,
  tierHasServerPricesInCamperTier,
  isPhoneShareFamilyAllowed,
  resolveParticipantDocumentIdForWrite,
  resolveParticipantDocIdAndWriteGate,
  loadParticipantRegistrationWriteGate,
  participantRegisteredViaPublicLink,
} from '../publicRegistrationLogic.js';
import { getPublicRegistrationPageUrl, getPublicRegistrationUrlSlug } from '../publicRegistrationUrls.js';
import {
  createResponsivaSignTokenDoc,
  getResponsivaSignPageUrl,
  buildResponsivaInviteWhatsAppText,
  DEFAULT_RESPONSIVA_BODY,
  DEFAULT_RESPONSIVA_BODY_ADULT,
  getResponsivaWhatsAppTargetPhone,
  participantAgeBracketForResponsiva,
  isResponsivaEnabledForEvent,
  isResponsivaDigitalEnabledForEvent,
  isResponsivaDigitalActiveForParticipant,
  isResponsivaEventSectionVisible,
  getResponsivaParticipantRowApplies,
  registrationRequiresResponsivaStatus,
  responsivaStatusValidationLabel,
  isResponsivaGeneralMinorsBranchEnabled,
  isResponsivaGeneralAdultsBranchEnabled,
  isResponsivaDigitalMinorsBranchEnabled,
  isResponsivaDigitalAdultsBranchEnabled,
  deriveResponsivaDigitalAgeScopeFromDigitalFlags,
} from '../responsivaSignLogic.js';
import { upsertResponsivaRegistryEntry, removeResponsivaArtifactsForParticipant } from '../responsivaRegistry.js';
import {
  mergeEditorRegistrationFieldVisibility,
  applyEditorRegistrationDefaults,
  getDefaultTransportFieldsForEventType,
  defaultEditorRegistrationFieldVisibility,
  getEditorRegistrationFieldMetaForEventType,
  getEditorRegistrationFieldGroupOrderForEventType,
  EDITOR_REGISTRATION_FIELD_GROUP_LABELS,
  canShowBautizosPastorAttendance,
  canShowPastorAttendance,
} from '../registrationFormEditorConfig.js';
import {
  isParticipantFieldApplicableToEventType,
  filterFieldsToTrackByEventType,
  cleanParticipantPayloadForEventType,
} from '../participantEventFieldScope.js';
import { applyParticipantNameFormattingForSave } from '../participantNameFormat.js';
import {
  normalizeBaptismShirtSize,
  participantHasBaptismChip,
  normalizePersonNameKey,
  normalizeArrivalCarCount,
} from '../bautizosParty.js';
import {
  buildRegistrationEditScalarChanges,
  describeRegisteredCostChange,
} from '../registrationChangeLog.js';
import { truncateActivityLogDetails, WHATSAPP_LOG_DETAILS_MAX } from '../activityLogDiff.js';
import {
  describeCampaBreakdownLineAdded,
  describeCampaBreakdownLineRemoved,
  describeCampaManualDivisorChange,
  describeStringListConfigChange,
} from '../eventConfigActivityLog.js';
import {
  applyCompanionLinkToHostCompanions,
  buildCompanionRegistrantCollisionIndex,
  buildNewEntryCompanionCollisionHint,
  describeCollisionCluster,
  describeCollisionReasons,
} from '../companionRegistrantCollision.js';
import { buildCampaFamilyCollisionIndex, describeCampaSpouseCluster } from '../campaFamilyCollision.js';
import { nameTokensSubsetMatch } from '../personNameMatch.js';



import {
  computeWaitlistCountsForEvent,
  participantCountsForCupoWaitlistColumn,
} from '../waitlistDashboardCounts.js';

import {
  ROSTER_EXTRA_FILTER_DEFAULTS,
  applyEventScopedRosterFilters,
  PERSON_OF_INTEREST_FILTER_OPTIONS,
  REGISTRATION_STATUS_FILTER_OPTIONS,
  participantMatchesPersonOfInterestFilter,
  participantMatchesRegistrationStatusFilter,
} from '../rosterParticipantFilters.js';
import {
  allUnsentCarDataNotificationMarkKeys,
  applyCarDataWaSnooze,
  buildCarDataPendingWhatsAppContext,
  buildCarDataWhatsAppNotificationId,
  CAR_DATA_FILTER_OPTIONS,
  countUnsentWhatsAppNotificationsForQueue,
  dedupeUnsentCarDataNotifications,
  filterWhatsAppFinanceNotificationsForQueue,
  isCarDataNotificationSnoozed,
  listCarDataPendingTitularTargets,
  listSplitCompanionParticipantIds,
  titularCarDataVisibleInWhatsAppQueue,
  titularHasPendingCarDataWhatsApp,
  upsertCarDataWhatsAppNotification,
} from '../carDataWhatsApp.js';
import {
  buildBusGroupSections,
  buildTransportPlanningLines,
  normalizeTransportPlanning,
  passengersForBusGroup,
} from '../transportPlanningCore.js';




import ServeAreaMultiSelect from '../components/ServeAreaMultiSelect.jsx';

import { persistEventCarMetaPatches } from '../transportCarMetaStore.js';
import { scheduleRegistrationTransportSave } from '../transport/v2/registrationTransportBridge.js';
import {
  countPastorParticipants,
  isPastorParticipant,
  sumPastorRealCostForParticipants,
} from '../pastorAttendance.js';
import {
  getEventEffectiveEndDate,
  getEventEffectiveStartDate,
  getPhaseDateMaxCap,
  formatEventDateRangeLabel,
  formatCampaSegmentDateLines,
  isEventSingleDay,
} from '../eventDateHelpers.js';
import { eventFirestoreDocIdFromHumanName, buildFirestoreDocId, sanitizeFirestoreDocId } from '../firestoreDocId.js';
import {
  buildFinanceWhatsAppMessage,
  buildMergedFinanceWhatsAppMessage,
  buildBajaWhatsAppMessage,
  buildPromoteWaitlistWhatsAppMessage,
  buildScholarshipPendingWhatsAppMessage,
  buildCarDataRequestWhatsAppMessage,
  buildGenericManualWhatsAppMessage,
  WA_FINANCE_REGISTRATION_REVIEW_NOTE,
  appendPrivacyFooter,
} from '../whatsappFinanceMessages.js';
import {
  countReactivatedUnsentNotifications,
  reactivateQueueFromHistoryToken,
  removeWhatsAppHistoryEntry,
  whatsAppHistoryEntryId,
} from '../whatsappHistoryQueue.js';
import PrivacyConsentBlock from '../components/PrivacyConsentBlock.jsx';
import UserAccountModalShell from '../components/UserAccountModalShell.jsx';
import NewUserAccountFormFields from '../components/NewUserAccountFormFields.jsx';
import { defaultNewUserFormState, closedEditingUserState } from '../userAccountFormDefaults.js';
import {
  mergePrivacyNoticeConfig,
  defaultPrivacyNoticeConfig,
  buildPublicPrivacyDocument,
  applySensitiveConsentToParticipantPayload,
  applyRegistrationConsentPolicy,
  privacyConsentFieldsForSave,
  buildRegistrationPrivacyActivityMessage,
  participantHasSensitiveHealthData,
  shouldBlockSensitiveHealthWithoutConsent,
  participantHasSensitiveHealthDataAddedBeyond,
  participantConsentFirestoreRepairPatch,
  participantPatchForFirestoreWrite,
  buildPrivacyNoticePublicUrl,
  PUBLIC_PRIVACY_DOC_COLLECTION,
  PUBLIC_PRIVACY_DOC_ID,
  DEFAULT_PRIVACY_NOTICE_BODY,
} from '../privacyNotice.js';
import { buildWhatsAppMeUrl } from '../whatsappUrl.js';
import { AppProviders } from './providers/AppProviders.jsx';
import { EventHubProvider } from './providers/EventHubProvider.jsx';
import { resolvePanelNavConfigItemCopy, panelNavSidebarItemAppliesToEvent } from '../panelNavUi.js';
import { EVENT_TYPES, SI_LABEL, PAYMENT_METHODS, SERVICE_OPTIONS } from '../appConstants.js';
import {
  BLOOD_TYPE_UNSPECIFIED,
  BLOOD_TYPES_ABO_RH,
  BLOOD_TYPES_SELECT_OPTIONS,
  classifyBloodTypeForStats,
  BLOOD_TYPE_STATS_OTHER,
} from '../registrationFormShared.js';
import { donationAddsToRecaudacionBalance } from '../donationHelpers.js';
import {
  CASH_CUT_NO_SERVICE_LABEL,
  DEFAULT_SERVICE_SLOTS as CASH_CUT_DEFAULT_SERVICE_SLOTS,
  getCashCutScheduleForLocation,
  resolveCashCutServiceForTimestamp,
} from '../cashCutService.js';
import {
  buildRefundDisbursementPaymentHistoryRow,
  buildParticipantPaidFieldsFromHistory,
  collectCashCutRefundDisbursements,
  collectCancelledParticipantsWithPendingRefund,
  enrichPaymentHistoryWithRefundDisbursements,
  getCancelledRefundPendingAmount,
  getParticipantNetPaidFromHistory,
  getParticipantEffectivePaidNet,
  getParticipantOutstandingGross,
  getParticipantPhysicalRecaudadoGross,
  getParticipantPhysicalRecaudadoNet,
  getRefundDisbursedGrossAmount,
  getRefundDisbursedNetAmount,
  parsePaymentHistoryRecordedAtMs,
  participantIsCancelledForRefund,
  personHasRefundDisbursementPaymentHistoryRow,
  resolveRefundDisbursementTimestampMs,
  sumDisbursedRefundsGrossForEvent,
  msToDatetimeLocalValue,
  parseDatetimeLocalToMs,
  parseRefundDisbursedAtMs,
  participantHasRefundDisbursement,
  REFUND_DISBURSEMENT_PAYMENT_KIND,
  refundDisbursementPaymentHistoryId,
  resolveCancelledRefundSede,
} from '../cashCutRefunds.js';
import { describeDashboardConfigDelta, EXPENSE_ACTIVITY_GENERIC } from '../dashboardActivityLog.js';
import { appendParticipantActivityEntry, fetchParticipantActivityEntries } from '../participantActivityLog.js';
import ScreenLoadingFallback from '../screens/ScreenLoadingFallback.jsx';
import {
  computeWorkspaceSidebarBadges,
  EMPTY_WORKSPACE_SIDEBAR_BADGES,
} from '../workspaceSidebarBadgesCompute.js';
import { runComputeWorkerJob } from '../workers/computeWorkerClient.js';
import UserSessionSummaryCell from '../UserSessionSummaryCell.jsx';
import AppVersionBadge from '../AppVersionBadge.jsx';
import { formatBirthDateExcelLabel, normalizeBirthDateToIso } from '../birthDateIsoUtils.js';
import { applyExcelHyperlinkCellStyle, excelWhatsAppPendingCheckboxDisplay } from '../excelExportSheetStyle.js';
import {
  buildExcelExportFilename,
  downloadExcelBytes,
  applyRosterSheetStyles,
  formatBrowserLocalDateTimeLabel,
} from '../excelRosterXlsxEnhance.js';
import { buildCashCutExcelSheet } from '../excelCashCutExport.js';
import { applyCashCutSheetStyles } from '../excelCashCutSheetStyle.js';
import {
  applyKeyValueSheetStyles,
  applyStandardDataTableStyles,
  applyStructuredReportSheetStyles,
  applyWorksheetColumnWidths,
} from '../excelWorkbookStyle.js';
import {
  buildExcelWeeklyAbonoColumnDefs,
  buildParticipantExcelFinanceCells,
  buildParticipantWeeklyAbonoCells,
  EXCEL_ROSTER_FINANCE_COL_COUNT,
} from '../excelExportRosterHelpers.js';
import { buildClientVersionPatch } from '../appVersion.js';
import {
  buildPreRestoreBackupId,
  formatLocalDateId,
  isDailyBackupDue,
  msUntilNextLocalMidnight,
} from '../appBackupSchedule.js';
import {
  getClientDeviceSnapshot,
  getClientRuntimeDisplayInfo,
  getInstallPromptBrowserNameEs,
  getSessionLogClientSuffix,
  isClientPwaRuntime,
  writeStaffSessionLogOnce,
} from '../clientTelemetry.js';
import { WorkspaceShellProvider } from '../screens/eventWorkspace/WorkspaceShellContext.jsx';
import { mergeWorkspaceShellParts } from '../screens/eventWorkspace/mergeWorkspaceShellParts.js';
import { NewRegModalDraftProvider } from '../components/registration/NewRegModalDraftProvider.jsx';
import { getTransportSectionEligibleForEventDoc } from '../transportPlanningEligibility.js';
import { isCardPaymentAllowedForLocation } from '../cardPaymentEligibility.js';
import { chunkArray } from '../chunkedFirestore.js';
import { buildUserOfflineSessionPatch } from '../userSessionFirestorePatch.js';
import {
  uiActivityLogAdmin,
  uiBadgeMini,
  uiBanner,
  uiButtons,
  uiCashCutToneCard,
  uiCashCutSedeService,
  cashCutSedeCardsGridStyle,
  uiDropdown,
  uiFilter,
  uiFormChoiceBtn,
  uiModal,
  uiRosterSearch,
  uiShell,
  uiRosterMobile,
  uiListMobile,
  uiDashboard,
  uiDashboardEditableInputClass,
  uiTextarea,
  uiTonalButton,
  uiTonalSolid,
  uiUserRowActions,
  uiUserAccountForm,
  uiUserEdit,
  uiLocationNewRegCta,
  uiMobileMenu,
  uiControls,
} from '../ui/uiFormatClasses.js';
import {
  formFieldStack,
  formPanelInputClasses,
  formPanelLabelClasses,
  formPhaseInputClasses,
  formPhaseLabelClasses,
  formFieldPairGrid,
  formFieldPairLabel,
  formFieldPairLabelRow,
  formFieldPairLabelHint,
  formFieldPairControl,
  formPaymentSectionBody,
  formPaymentPairGrid,
  formPaymentPairLabel,
  formPaymentPairLabelRow,
  formPaymentHints,
} from '../formFieldClasses.js';
import RosterSortDropdown from '../components/RosterSortDropdown.jsx';
import RosterLocationSearchPanel from '../components/RosterLocationSearchPanel.jsx';
import RosterParticipantMobileCard from '../components/RosterParticipantMobileCard.jsx';
import CompanionWaitlistBadge from '../components/CompanionWaitlistBadge.jsx';

import DoubleRoleCollisionChip from '../components/roster/DoubleRoleCollisionChip.jsx';
import ParticipantAssistanceBadges from '../components/roster/ParticipantAssistanceBadges.jsx';
import DuplicateGroupsPanel from '../components/diagnostics/DuplicateGroupsPanel.jsx';
import RegistryConfirmModal from '../components/modals/RegistryConfirmModal.jsx';
import CapFullWaitlistConfirmModal from '../components/modals/CapFullWaitlistConfirmModal.jsx';
import PromoteOverCapConfirmModal from '../components/modals/PromoteOverCapConfirmModal.jsx';
import ListMobileCard from '../components/ListMobileCard.jsx';
import ActivityLogMobileCard from '../components/ActivityLogMobileCard.jsx';
import MobileCompactToolbar, { MobileCompactToolbarPanel } from '../components/mobile/MobileCompactToolbar.jsx';
import MobileSearchField from '../components/mobile/MobileSearchField.jsx';
import MobileMenuSection from '../components/mobile/MobileMenuSection.jsx';
import MobileFilterPanelBody from '../components/mobile/MobileFilterPanelBody.jsx';
import GenderSelectButtons from '../components/GenderSelectButtons.jsx';
import SedeAutocompleteInput from '../components/SedeAutocompleteInput.jsx';
import AllergyFormFields from '../components/AllergyFormFields.jsx';
import DiseaseFormFields from '../components/DiseaseFormFields.jsx';
import DisabilityFormFields from '../components/DisabilityFormFields.jsx';
import SiNoFieldToggle from '../components/SiNoFieldToggle.jsx';
import PaymentMethodSegmentToggle, { PAYMENT_TARJETA } from '../components/PaymentMethodSegmentToggle.jsx';
import { collectLocationSuggestionsFromRosterSources } from '../locationFieldSuggestions.js';
import { locationPrefsKey } from '../userListFiltersPrefs.js';
import RosterFilterCheckboxOption from '../components/RosterFilterCheckboxOption.jsx';
import RosterSectionScrollWrap from '../components/RosterSectionScrollWrap.jsx';
import {
  ACTIVITY_LOG_SEARCH_FIELD_ID,
  EXPENSE_LIST_SEARCH_FIELD_ID,
  USERS_PANEL_SEARCH_FIELD_ID,
  globalRegistrySearchFieldId,
  rosterSearchFieldId,
} from '../ui/rosterFilterField.js';
import { ROSTER_SORT_OPTIONS, ROSTER_SORT_OPTIONS_GLOBAL } from '../rosterSortOptions.js';
import { isDesktopRosterViewport } from '../rosterDesktopViewport.js';

const LoginScreenLazy = lazy(() => import('../screens/LoginScreen.jsx'));
const EventHubScreenLazy = lazy(() => import('../screens/EventHubScreen.jsx'));
const EventWorkspaceScreenLazy = lazy(() => import('../screens/EventWorkspaceScreen.jsx'));
const TransportPlanningPageLazy = lazy(() => import('../screens/TransportPlanningPage.jsx'));
const BecadosPageLazy = lazy(() => import('../screens/eventWorkspace/pages/BecadosPage.jsx'));
const BautizadosPageLazy = lazy(() => import('../screens/eventWorkspace/pages/BautizadosPage.jsx'));

const ResponsivasPageLazy = lazy(() => import('../screens/eventWorkspace/pages/ResponsivasPage.jsx'));
const PastoresPageLazy = lazy(() => import('../screens/PastoresPage.jsx'));
const ExcelExportScopeModalLazy = lazy(() => import('../components/ExcelExportScopeModal.jsx'));

/* global __initial_auth_token */

import {
  app,
  secondaryApp,
  usernameToAuthEmail,
  loginIdentifierToAuthEmail,
  AUTH_EMAIL_DOMAIN,
  buildUsernameCandidates,
  normalizeAuthEmail,
} from '../firebaseConfig.js';
import { auth, db, storage, getColRef, getDocRef } from "../firebaseRefs.js";
import { sanitizeJsonForFirestore, patchForLocalParticipantCache, prepareParticipantDocForFirestore, omitUndefinedDeep } from '../firestorePayloadSanitize.js';
import { withLogVisibleInPanel, slimRevertInfoForLog, buildLogEntityFields } from '../activityLogsMeta.js';
import { logWhatsAppSentActivity, activityLogDetailsDisplayClass, formatActivityLogDetailsForDisplay } from '../whatsappActivityLog.js';
import {
  buildLogId,
  writeSnapshotDoc,
  writeLogDoc,
  logSnapshotBackup,
  flushPendingLogQueue,
  normalizeErrorMessage,
  LOG_STATUS,
} from '../activityLogCore.js';
import { logError as logErrorToActivity, setErrorLogContextProvider } from '../errorLogger.js';
import ActivityLogSnapshotDetails from '../components/ActivityLogSnapshotDetails.jsx';
import { deleteOldestLogsByCount, deleteLogsByIds } from '../activityLogsDelete.js';
import {
  CONFIG_LOG_META_PRESERVE_KEYS,
  debugRevertStorageKey,
  isPartialAppEventRevertData,
  mergeAppEventDocForRevert,
  enrichBackupEventsWithParticipantLocations,
  cloneFirestoreDocDataForRevert,
  persistLogsToSessionCache,
  clearLogsSessionCache,
} from './helpers/appLogsStorage.js';
import {
  getAmbosServeInSegmentOrEmpty,
  getValidDiscountCampaignsForPerson,
  findDiscountCampaignById,
  discountCampaignAppliesToLabel,
  discountCampaignHasDateRange,
  isDiscountCampaignVigenteOnDate,
} from './helpers/discountCampaignHelpers.js';
import {
  getCashCutServicesForLocation,
  getCashCutServiceColumnsForLocation,
  aggregateCashCutPaymentsForLocAndService,
  aggregateCashCutPaymentsForLoc,
  getOffScheduleServiceKeysForLocation,
} from './helpers/cashCutAggregates.js';
import {
  defaultViewPrefs,
  SUMMARY_TABLE_COLUMN_DEFAULTS,
  SUMMARY_TABLE_COLUMN_LABELS,
  getSummaryTableColumnKeysForEventType,
  getSummaryTableColumnDefaultsForEventType,
  SUMMARY_TABLE_MONEY_KEYS,
} from './helpers/dashboardSummaryTableConfig.js';
import {
  EMPTY_ENTRY,
  mergeNewRegistrationWithImport,
  stripEntrySnapshotForNewRegistrationDraft,
  lastSuccessfulRegFormStorageKey,
  persistLastSuccessfulRegistrationSnapshot,
  registrationFormDraftStorageKey,
  persistRegistrationFormDraft,
  clearRegistrationFormDraft,
} from './helpers/registrationDraftStorage.js';
import { buildLocationRosterTypeSummaryByStatus, getLocationRosterSectionCountsFromSummary, aggregateLocationRosterSectionCountsForLocations } from '../locationRosterTypeSummary.js';
import {
  buildGlobalRegistryPartySections,
  globalRegistryPartyRowsToPersons,
  sortGlobalRegistryPartyRows,
} from '../globalRegistryPartyRows.js';
import LocationRosterTypeSummary from '../LocationRosterTypeSummary.jsx';
import {
  LocationRosterActivosChip,
  LocationRosterCancelledChip,
  LocationRosterWaitlistChip,
} from '../screens/locationRoster/LocationRosterSectionChips.jsx';
import {
  buildCapSimulationRows,
  computeEventCapUsedUnits,
  computeEventCapUsedUnitsBySede,
  computeIncomingRegistrationCapUnits,
  computePromoteFromWaitlistCapUnits,
} from '../eventCapUnits.js';
import {
  computeCapRemaining,
  formatCapRemainingDisplay,
  buildSedeCapChipViewModel,
  resolveConfiguredCapLimit,
  resolveCupoLimitMode,
  resolveSedeCapStatus,
} from '../cupoVsWaitlistDisplay.js';
import { computeDashboardTodosRosterTotal } from '../dashboardTodosRosterTotal.js';
import {
  getAuth,
  signInWithCustomToken,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  linkWithCredential,
  signOut,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, onSnapshot, updateDoc, getDoc, deleteField, query, where, limit, orderBy, startAfter, documentId, getDocs, getDocsFromCache, writeBatch, getDocFromServer, getDocsFromServer, getCountFromServer, arrayUnion, increment } from 'firebase/firestore';
import { ref as storageRef, uploadString, getBytes, deleteObject } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { validateSpouseParticipantChoice, syncSpouseParticipantLinks } from '../spouseLink.js';
import RegistryBirthDateField from '../RegistryBirthDateField.jsx';
import { mergeRowsByDocChanges, querySnapshotHasDocChanges } from '../firestoreSnapshotMerge.js';
import { reloadAppAfterClearingFirestorePersistence, getAckBulkGeneration } from '../firestoreCacheReload.js';
import {
  scopeLogsHead,
  fetchRemoteCacheVersion,
  readVersionCacheRecord,
  writeLocalVersionCache,
  cacheVersionsMatch,
  logCacheDecision,
  scopeParticipantsArchive,
  scopeParticipantsLocation,
  resolveVersionForStore,
  subscribeLogsHeadVersionDebounced,
  syncLocalVersionIndexFromIdb,
} from '../firestoreVersionCache.js';
import {
  loadEventParticipantsWithVersionCache,
  refetchParticipantsForLocation,
  refetchAndMergeParticipantLocations,
  replaceParticipantsForLocation,
  stripCompanionWaitlistPhantomRows,
  subscribeParticipantsLocationVersionsDebounced,
  loadArchivedParticipantsWithVersionCache,
  subscribeArchiveParticipantsVersion,
  suppressParticipantVersionListeners,
} from '../participantsVersionCache.js';
import {
  syncParticipantAfterWrite,
  syncDonationAfterWrite,
  syncExpenseAfterWrite,
  syncEventAfterWrite,
} from '../firestoreLiveSync.js';
import {
  resolveStaffUserProfileFromAuth,
  staffUserIsAdminProfile,
  findPendingStaffProfileForAuthEmail,
} from '../staffUserProfileResolve.js';
import { emitGlobalSystemAlert } from '../globalSystemAlertsBridge.js';
import { shortFirebaseClientMessage } from '../shortSystemMessages.js';
import { parseStrictNonNegativeMoneyInput } from '../strictMoneyInput.js';
import {
  applyLocationRosterFilters,
  captureLocationRosterFiltersFromState,
  createEmptyListFiltersPrefsRoot,
  createEmptyLocationRosterFilters,
  createEmptyPastoresUiPrefs,
  createEmptyTransportUiPrefs,
  isLocationRosterTab,
  migrateLegacyLocalFiltersToPrefs,
  normalizeListFiltersPrefsRoot,
  normalizePastoresUiPrefs,
  normalizeTransportUiPrefs,
  readGlobalRegistryFiltersFromPrefs,
  readLocationFiltersFromPrefs,
  readPastoresUiFromPrefs,
  readTransportUiFromPrefs,
  writeGlobalRegistryFiltersToPrefs,
  writeLocationFiltersToPrefs,
  writePastoresUiToPrefs,
  writeTransportUiToPrefs,
  listFiltersForEventApplication,
  countActiveDropdownListFilters,
} from '../userListFiltersPrefs.js';

/* __EXTRACTED_APP_MAIN_MODULE_SCOPE__ */
import {
  secondaryAuth,
  isLogoutPermissionNoise,
  logAndEmitFirestoreListenError,
  firestoreListenConsoleError,
  DARK_MODE_LEGACY_KEY,
  LAST_ROUTE_LEGACY_KEY,
  darkModeStorageKeyForUid,
  readStoredDarkModeForUid,
  migrateLegacyDarkModeToUid,
  lastRouteStorageKeyForUid,
  readStoredRouteForUid,
  migrateLegacyRouteToUid,
  LOGS_ORDER_FIELD,
  LOGS_SERVER_CHUNK,
  LOGS_STORAGE_MAX_DEFAULT,
  LOGS_STORAGE_MAX_MIN,
  LOGS_STORAGE_MAX_HARD_MAX,
  LOGS_BACKGROUND_PREFETCH,
  SNAPSHOT_LISTENER_OPTS,
  LOGS_TOTAL_COUNT_STALE_MS,
  logsUseVisibleInPanelQuery,
  buildLogsRecentOrderQuery,
  fetchDebugSessionLogs,
  vnpPersonIdExistsInFirestore,
  isRosterRowInteractiveClickTarget,
  isScholarshipAutoExpenseIdForEvent,
  isManualCreditVirtualExpenseIdForEvent,
  isDerivedAutoExpenseIdForEvent,
  getBackupChunksColRef,
  BACKUP_STORAGE_PREFIX,
  BACKUP_RETENTION_MONTHS,
  scheduledBackupAsyncLock,
  clampLogsStorageLimit,
  FIRESTORE_BATCH_LIMIT,
  deleteAllDocsInCollection,
  commitDeleteRefsInBatches,
  commitSetPayloadsInBatches,
  writeAppBackupToStorage,
  performAppFullBackup,
  pruneAppBackupsOlderThanRetention,
  loadAppBackupMerged,
  SESSION_TTL_MS,
  SESSION_HEARTBEAT_MS,
  getTabSessionId,
  sessionDocId,
  countOtherActiveSessions,
  clampAdminMaxConcurrentSessions,
  getMaxConcurrentSessionsForUser,
  BLOOD_TYPE_OTHER_KEY,
  BLOOD_BAR_BG_CLASSES,
  GENDERS,
  eventTypeIsDesayuno,
  RESPONSIVA_STATUSES,
  LOCATION_CHART_GOLDEN_HUE,
  buildLocationChartColorMap,
  getBaptismAccountingSegment,
  getCampaAttendanceSegment,
  campaAttendanceScopeMatches,
  NO_SERVICE_LABEL,
  DEFAULT_SERVE_AREA_OPTIONS,
  DEFAULT_ALLERGY_OPTIONS,
  parsePreferredServeArea,
  formatPreferredServeArea,
  DEFAULT_SERVICE_SLOTS,
  defaultLocations,
  defaultRegStatus,
  ATTENDANCE_SPECIAL,
  isFreeAttendanceType,
  normalizeAttendanceSpecial,
  buildAttendanceSpecialFormOptions,
  getRosterLiquidationRemainder,
  isRosterPersonLiquidadoForFilter,
  isRosterSaldoAFavor,
  SI,
  isSiValue,
  formatSiNo,
  getGeneralRegistrationCommentsForDisplay,
  participantMatchesRosterSearchComments,
  usernamesEqualForCommentAuth,
  userCanDeleteRegistrationComment,
  userCanOpenAbonoNoteEditModal,
  userCanDeleteAbonoNote,
  NEW_EVENT_FORM_DRAFT_PREFIX,
  newEventFormDraftStorageKey,
  clearNewEventFormDraft,
  DEFAULT_PANEL_NAV,
  PANEL_NAV_TAB_KEYS,
  PANEL_NAV_CONFIG_ITEMS,
  EDITOR_LECTOR_PANEL_DEFAULT,
  PANEL_NAV_SIDEBAR_ITEMS,
  resolveEventNamesForUserLog,
  summarizeLocationsForUserLog,
  createEmptyGlobalRegistryListFilters,
  migrateLegacyRosterRoleFilter,
  mergeGlobalRegistryListFilters,
  buildSpouseIncomingIdSetForEvent,
  lsKeyShowGrossCommission,
  lsKeyUserFilters,
  lsKeyListFiltersPrefs,
  LIST_FILTERS_PREFS_PERSIST_MS,
  canPersistPanelUserPrefsToFirestore,
  ROSTER_LIST_TABLE_CLASS,
  ROSTER_COL_FINANCES_W,
  ROSTER_COL_ACTIONS_W,
  ROSTER_TH_PARTICIPANT,
  ROSTER_TH_FINANCES,
  ROSTER_TH_ACTIONS,
  ROSTER_TD_FINANCES,
  ROSTER_TD_ACTIONS,
  RosterListColgroup,
  ROSTER_QUICK_ACTIONS_ROW_PRIMARY,
  ROSTER_QUICK_ACTION_BTN_MOBILE,
  ROSTER_QUICK_ACTION_BTN_BASE,
  ROSTER_QUICK_ACTION_ICON_PROPS,
  lsKeyRosterSections,
  MASKED_EXPENSE_CONCEPT_LABEL,
  isHideMyExpenseConceptsOn,
  formatDisplayDate,
  toDatetimeLocalValue,
  fromDatetimeLocalToIso,
  parseFlexibleInstantMs,
  compareParticipantsRegisteredAtTieBreak,
  compareParticipantsByRegisteredAtAsc,
  compareParticipantsByRegisteredAtDesc,
  formatPayHistoryRowDate,
  getPaymentHistoryTimestamp,
  getPaymentRowInstantMsPreferRecorded,
  inputClasses,
  labelClasses,
  fieldStack,
  inputClassesPhase,
  labelClassesPhase,
  getRequiredFieldClass,
  calculateAgeFromBirthDate,
  getEffectiveParticipantAge,
  resolveLlegaEnCarro,
  resolveRegresaEnCarro,
  CopyButton,
  resolveTransportSummary,
  btnPrimary,
  btnSecondary,
  DASH_TOP_BTN,
  DASH_TOP_BTN_NEUTRAL,
  getCommissionToggleColorClasses,
  QUICK_ACTION_DARK_INTERACTION,
  getCommissionToggleBtnClasses,
  getCommissionToggleCompactBtnClasses,
  getCommissionToggleLabel,
  getDashboardCardCommissionToggleLabel,
  DASHBOARD_COMMISSION_VIEW_HELP,
  DASHBOARD_COMMISSION_VIEW_TITLE,
  DASHBOARD_ICON_DARK_TEXT_CLASS,
  DASHBOARD_ICON_DARK_BG_CLASS,
  StatCard,
  ProgressBar,
  digitsOnlyPhone,
  normalizeIdText,
  canonicalizeVnpPersonId,
  buildDuplicateAckKeyPhone,
  buildDuplicateAckKeyVnp,
  getParticipantDuplicateAckKeys,
  duplicateClusterFullyAcknowledged,
  describeDuplicateParametersForPhoneMembers,
  describeDuplicateParametersForVnpMembers,
  PARTICIPANT_STATUS_ARCHIVED,
  PARTICIPANT_STATUS_CANCELLED,
  participantIsArchived,
  participantIsCancelled,
  participantCountsAsRealCostX2,
  mergeEventDonationsForEvent,
  participantIsRosterRow,
  cashCutLocationInScope,
  collectCashCutAllPayments,
  getMondayLocalFromDate,
  getCashCutWeekKey,
  formatCashCutWeekRangeLabel,
  buildCashCutWeekAndSundayMaps,
  participantIsWaitlistRow,
  resolveLocationToEventSede,
  participantIsActiveInRoster,
  participantIsActiveOrWaitlistForCompanionDisplay,
  participantMatchesBautizosDashboardPartyScope,
  toDashboardConfigLogComparable,
  participantIsActiveInEvent,
  participantBlocksDuplicateRegistration,
  participantEligibleAsSpouseLink,
  buildArchivedProfileSnapshot,
  ARCHIVE_PROFILES_COLLECTION,
  getArchiveProfileDocId,
  mergeArchivedFirestoreDocs,
  buildArchiveIndexIncomingPayload,
  ARCHIVE_INDEX_STRIP_FINANCIAL_KEYS,
  stripFinancialFromArchiveIndexDoc,
  removeArchiveProfileIndexEntryIfMatches,
  generateVnpPersonId,
  hasValidFullName,
  phoneDuplicateInEvent,
  participantRosterListLabel,
  participantMatchesNewEntryDuplicateHint,
  participantIsActiveOrWaitlistForDuplicateHint,
  normalizeFullNameCompareKey,
  normalizeAliasCompareKey,
  DUPLICATE_HINT_REASON_LABELS,
  DUPLICATE_HINT_REASON_ORDER,
  formatDuplicateHintReasons,
  buildNewEntryDuplicateHint,
  normalizeWhatsAppPhone,
  getWhatsAppNotificationMarkKey,
  compactWhatsAppNotificationToken,
  getWhatsAppMessageHistoryRows,
  getLatestUnsentWhatsAppNotification,
  countUnsentWhatsAppNotifications,
  WHATSAPP_BRAND_BTN_CLASS,
  WHATSAPP_BRAND_BADGE_CLASS,
  NEW_REG_TOOLBAR_EMERALD_BTN,
  NEW_REG_TOOLBAR_INDIGO_BTN,
  NEW_REG_DONATION_BTN,
  ROSTER_MOBILE_CHIP_ICON,
  RosterWhatsAppButton,
  getResponsivaRequirementApplies,
  getResponsivaCardUiState,
  getResponsivaSignatureImageUrl,
  getResponsivaDigitalPipelineState,
  responsivaPipelineSectionTitle,
  ROSTER_RESPONSIVA_WA_CLASS,
  RosterResponsivaWaButton,
  ROSTER_RESPONSIVA_LOCAL_CLASS,
  RosterResponsivaLocalButton,
  ROSTER_PERSON_OF_INTEREST_MARK_CLASS,
  ROSTER_PERSON_OF_INTEREST_UNMARK_CLASS,
  RosterPersonOfInterestButton,
  getWeekKeyFromDate,
  _isSundayDate,
  toLocalISODate,
  extractLogMillis,
  mergeLogsDedupById,
  fetchLogsRecentFromServer,
  fetchAllLogsByDocIdPages,
  getLogDateISO,
  createActivityLogPanelVisibilityFilter,
  activityLogHasColumnFilters,
  fetchLogsHeadRecent,
  createActivityLogListFilter,
  trimLogsDescendingToIncludeNthVisible,
  fetchLogsHeadForVisibleLimit,
  fetchLogsInDateRange,
  buildLogDateRangeForToday,
  buildLogDateRangeForThisWeek,
  buildLogDateRangeForThisMonth,
  formatDuration,
  loadSheetJS,
  formatAnonymousAuthAgeMinutes,
  staffPanelLogoutState,
  isStaffPanelLogoutInProgress,
  setStaffPanelLogoutInProgress
} from './helpers/appMainModuleScope.jsx';
import * as appMainModuleScopeNS from './helpers/appMainModuleScope.jsx';
import { useAppMainHandlers } from '../hooks/workspace/useAppMainHandlers.jsx';
const WorkspaceShellContainer = ({
  workspaceShellRaw,
  eventData,
  participantMutations,
  workspaceUI,
}) => {
  const workspaceShell = useShallowStableMemo(workspaceShellRaw);
  return (
    <WorkspaceShellProvider value={workspaceShell}>
      <AppProviders
        eventData={eventData}
        participantMutations={participantMutations}
        workspaceUI={workspaceUI}
      >
        <Suspense fallback={<ScreenLoadingFallback title="Cargando evento…" />}>
          <EventWorkspaceScreenLazy />
        </Suspense>
      </AppProviders>
    </WorkspaceShellProvider>
  );
};

/** v2: no-ops locales para campos legados en docs viejos (evento Bautizos eliminado). */
const bzEvtNormalizeAttendanceType = (v) => String(v || '').trim();
const bzEvtNormalizeCompanionsForForm = (v) => (Array.isArray(v) ? v : []);
const bzEvtSyncAttendanceServerFields = (p) => p;
const bzEvtCompanionsArray = (p) => (Array.isArray(p?.bautizosCompanions) ? p.bautizosCompanions : []);
const bzEvtIsFreeAttendance = () => false;
const bzEvtLegacyHostStoredRow = () => false;
const bzEvtResolveCarDataAnchor = () => ({ eligible: false });
const bzEvtBuildFamilyCarInventory = () => ({ cars: [] });
const bzEvtBuildCanonicalCompanionPlan = () => ({ companions: [], byRegistrant: new Map(), meta: {} });
const familyCarInventoryNeedsAttention = () => false;
const carCrewRequiresPassengerSelection = () => false;
const buildCarDataWaSubjectContext = () => ({});
const isCompanionWaitlistPhantomStoredParticipant = () => false;
const resolveParticipantEffectiveLocation = (p) => String(p?.location || '').trim();
const normalizeBautizosDashboardScope = () => 'all';
const bautizosDashboardTitularCountsForScope = () => true;
const bautizosDashboardIncludeRegistrationFinancials = () => true;
const BAUTIZOS_DASHBOARD_SCOPE_IDS = [];
const BAUTIZOS_ATTENDANCE = Object.freeze({ bautizado: 'bautizado' });
const EMPTY_CAR_COLOR_SUGGESTIONS = Object.freeze([]);

const App = () => {
  const {
    fbUser,
    setFbUser,
    loginForm,
    setLoginForm,
    showLoginPassword,
    setShowLoginPassword,
    loginBusy,
    setLoginBusy,
    googleLoginBusy,
    setGoogleLoginBusy,
    loginError,
    setLoginError,
    loginInProgressRef,
  } = useAuthSessionState();
  const navigate = useNavigate();
  const location = useLocation();

  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersAuthReady, setUsersAuthReady] = useState(false);
  const [firestoreUsersError, setFirestoreUsersError] = useState(null);
  const rosterSectionsPrefsLoadedRef = useRef('');
  const isRegisteringRef = useRef(false);
  /** Cierra el modal superior con Escape (orden: el último superpuesto primero). */
  const modalEscapeCloseRef = useRef(() => false);
  /** Solo SuperUsuario: sesiones activas (heartbeat reciente), actualizado en tiempo real. */
  const [superSessionCount, setSuperSessionCount] = useState(0);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    /** Correo opcional para Firebase Auth; si va vacío se usa usuario@{AUTH_EMAIL_DOMAIN}. */
    loginEmail: '',
    role: 'Editor',
    canViewFinances: false,
    canViewHiddenDonations: false,
    canViewExpenses: false,
    restrictedEventId: '',
    restrictedLocation: '',
    allowedEventIds: [],
    allowedLocations: [],
    allowedLocationsByEvent: {},
    allowedPanelSections: { ...EDITOR_LECTOR_PANEL_DEFAULT },
    allowedPanelSectionsByEvent: {},
    preferredLandingTab: 'Summary',
    hideMyExpenseConcepts: true,
    canEditRegistryDates: false,
    canMarkPersonsOfInterest: false,
    maxConcurrentSessions: '1',
    canSendWhatsAppQuickAction: false,
    canMarkResponsivaLocalQuickAction: true,
    canSendResponsivaDigitalQuickAction: false,
    canCancelRegistrations: false,
  });
  const [newUserModalOpen, setNewUserModalOpen] = useState(false);
  const [globalConfig, setGlobalConfig] = useState(null);
  /** Tras restauración masiva en servidor: el cliente debe alinear caché Firestore (ver `dataBulkGeneration`). */
  const [needsFirestoreResyncAfterBulk, setNeedsFirestoreResyncAfterBulk] = useState(false);
  const [bulkResyncBusy, setBulkResyncBusy] = useState(false);
  const [backfillActiveRosterBusy, setBackfillActiveRosterBusy] = useState(false);

  const [toast, setToast] = useState('');
  const showToast = useCallback((msg) => {
    setToast(msg);
    const ms = typeof msg === 'string' && (msg.includes('\n') || msg.length > 120) ? 9000 : 4000;
    setTimeout(() => setToast(''), ms);
  }, []);

  const handleBackfillEventActiveRosterTotals = useCallback(async () => {
    setBackfillActiveRosterBusy(true);
    try {
      const functions = getFunctions(app, 'us-central1');
      const fn = httpsCallable(functions, 'adminBackfillEventActiveRosterTotals');
      const result = await fn({});
      const data = result?.data;
      if (typeof data?.eventsUpdated === 'number' && typeof data?.total === 'number') {
        showToast(`Contadores de inscripción actualizados: ${data.eventsUpdated} de ${data.total} eventos.`);
      } else {
        showToast('Rellenado de contadores completado.');
      }
    } catch (e) {
      const code = String(e?.code || '');
      const msg =
        code === 'functions/unauthenticated'
          ? 'Inicia sesión de nuevo para ejecutar esta acción.'
          : code === 'functions/permission-denied'
            ? 'Solo SuperUsuario puede rellenar contadores.'
            : e?.message || 'No se pudo rellenar los contadores. Revisa conexión y que la función esté desplegada.';
      showToast(msg);
    } finally {
      setBackfillActiveRosterBusy(false);
    }
  }, [showToast]);

  /** Rol tal como viene de Firestore (trim evita espacios que rompen comparaciones). */
  const userRoleNorm = String(currentUser?.role ?? '').trim();
  const hasAdminRights = userRoleNorm === 'Administrador' || userRoleNorm === 'SuperUsuario';
  const canManageCancelledRefunds = hasAdminRights;
  const isSuperUser = userRoleNorm === 'SuperUsuario';
  const isEditorOrLector = userRoleNorm === 'Editor' || userRoleNorm === 'Lector';

  /** Usuarios visibles en /usuarios según rol del visor (Editor/Lector solo su perfil). */
  const usersVisibleInPanel = useMemo(() => {
    if (!currentUser?.id) return [];
    if (!hasAdminRights) {
      const self = users.find((u) => String(u.id) === String(currentUser.id));
      return self ? [self] : [];
    }
    return users.filter((u) => viewerCanSeeTargetPermissionMeta(currentUser, u));
  }, [users, currentUser, hasAdminRights]);

  const [usersPanelSearch, setUsersPanelSearch] = useState('');
  const [usersMobileMenuOpen, setUsersMobileMenuOpen] = useState(false);
  const usersFilteredInPanel = useMemo(() => {
    const q = usersPanelSearch.trim().toLowerCase();
    if (!q) return usersVisibleInPanel;
    return usersVisibleInPanel.filter((u) => {
      const hay = [u.username, u.role, u.loginEmail, ...(u.allowedLocations || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [usersVisibleInPanel, usersPanelSearch]);

  /** Editar fechas de registro y abonos: SuperUsuario siempre; otros solo si el SuperUsuario lo autoriza en su cuenta. */
  const canEditRegistryDates = isSuperUser || !!currentUser?.canEditRegistryDates;
  const canMarkPersonsOfInterestFlag = canMarkPersonsOfInterest(currentUser);
  const canCancelRegistrationsFlag = canCancelRegistrations(currentUser);
  const canArchiveRegistrationsFlag = canArchiveRegistrations(currentUser);
  const canEditAbonosAndPaymentHistory = canEditAbonosRegistryAndDeleteHistory(currentUser);
  const [personOfInterestVnpSet, setPersonOfInterestVnpSet] = useState(() => new Set());
  /** SuperUsuario entra siempre; Administrador necesita canViewExpenses en su perfil. */
  const canAccessExpenses = userCanAccessExpenseList(currentUser, isSuperUser);
  const canQuickActionWhatsApp = userCanSendWhatsAppQuickAction(currentUser);
  const canQuickActionResponsivaLocal = userCanMarkResponsivaLocalQuickAction(currentUser);
  const canQuickActionResponsivaDigital = userCanSendResponsivaDigitalQuickAction(currentUser);

  const [events, setEvents] = useState([]);
  const [globalLocations, setGlobalLocations] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [systemView, setSystemView] = useState('events'); 
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [deleteEventModal, setDeleteEventModal] = useState({ isOpen: false, id: null, name: '' });
  const [draggedEventId, setDraggedEventId] = useState(null);
  const [newEventData, setNewEventData] = useState({ name: '', type: 'Campa', date: '', baseCost: '' });
  const [renameModal, setRenameModal] = useState({ isOpen: false, id: null, name: '' });
  const [isExporting, setIsExporting] = useState(false);
  const [excelExportModal, setExcelExportModal] = useState({
    isOpen: false,
    locations: [],
    sections: {},
  });
  /** Tema oscuro: por usuario (Firestore + respaldo local), persistente entre navegadores/sesiones. */
  const [darkMode, setDarkMode] = useState(false);
  const toggleDarkMode = useCallback(() => {
    setDarkMode((v) => {
      const next = !v;
      const uid = fbUser?.uid;
      if (uid) {
        try {
          const key = darkModeStorageKeyForUid(uid);
          if (next) window.localStorage.setItem(key, '1');
          else window.localStorage.removeItem(key);
        } catch {
          /* ignore */
        }
      }
      if (currentUser?.id) {
        updateDoc(getDocRef('app_users', String(currentUser.id)), { darkMode: next }).catch(() => {
          /* ignore */
        });
      }
      return next;
    });
  }, [fbUser?.uid, currentUser?.id]);

  useEffect(() => {
    const uid = fbUser?.uid;
    if (!uid) return;
    migrateLegacyDarkModeToUid(uid);
    const key = darkModeStorageKeyForUid(uid);
    const docPref = typeof currentUser?.darkMode === 'boolean' ? currentUser.darkMode : null;
    if (docPref == null) {
      setDarkMode(readStoredDarkModeForUid(uid));
      return;
    }
    setDarkMode(docPref);
    try {
      if (docPref) window.localStorage.setItem(key, '1');
      else window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }, [fbUser?.uid, currentUser?.darkMode]);

  useEffect(() => {
    const forceLightOnLoginPwa = isClientPwaRuntime() && !currentUser;
    document.documentElement.classList.toggle('dark', darkMode && !forceLightOnLoginPwa);
  }, [darkMode, currentUser]);

  // Mobile Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navSnapshotRef = useRef({
    systemView: 'events',
    selectedEventId: null,
    activeTab: 'Summary',
  });
  const navigateRef = useRef(() => {});
  const currentUserRef = useRef(null);
  const eventsRef = useRef([]);
  /** Menú global en la última pasada del sync de permisos (detecta cambios sin tocar el doc del usuario). */
  const panelNavMergedPrevRef = useRef(null);
  /** Evita que el efecto «URL ← estado» pise el Atrás/Adelante del navegador en el mismo ciclo. */
  const historyNavigationInFlightRef = useRef(false);
  const [logoutConfirmOnBackOpen, setLogoutConfirmOnBackOpen] = useState(false);
  /** Evita parpadeos: un solo toast al corregir varias sedes seguidas (integridad / dashboard). */
  const assignLocationToastTimerRef = useRef(null);
  const assignLocationBatchCountRef = useRef(0);
  const resolveVisibleLocsRef = useRef(() => []);

  // Preferences State
  const [viewPrefs, setViewPrefs] = useState(defaultViewPrefs);
  const [showViewSettings, setShowViewSettings] = useState(false);
  const [panelNavModalOpen, setPanelNavModalOpen] = useState(false);
  const [panelNavForm, setPanelNavForm] = useState(() => ({ ...DEFAULT_PANEL_NAV }));
  const [editorRegFieldsModalOpen, setEditorRegFieldsModalOpen] = useState(false);
  const [editorRegFieldsScope, setEditorRegFieldsScope] = useState('event'); // event | type
  const [editorRegFieldsForm, setEditorRegFieldsForm] = useState(() => mergeEditorRegistrationFieldVisibility());
  const [privacyNoticeModalOpen, setPrivacyNoticeModalOpen] = useState(false);
  const [privacyNoticeForm, setPrivacyNoticeForm] = useState(() => defaultPrivacyNoticeConfig());
  const [privacyNoticeSaving, setPrivacyNoticeSaving] = useState(false);
  const [privacyBackfillBusy, setPrivacyBackfillBusy] = useState(false);
  const [newRegPrivacyAccepted, setNewRegPrivacyAccepted] = useState(false);
  const [newRegSensitiveConsent, setNewRegSensitiveConsent] = useState('');
  const [editPrivacyAck, setEditPrivacyAck] = useState(false);

  const newRegPrivacyContext = useMemo(
    () => ({
      privacyAccepted: newRegPrivacyAccepted,
      sensitiveConsent: newRegSensitiveConsent,
      requirePrivacy: false,
      allowSensitiveWithoutConsent: true,
    }),
    [newRegPrivacyAccepted, newRegSensitiveConsent]
  );

  // Debug Toast & Watcher
  const [debugToast, setDebugToast] = useState(null);
  const [showDebugLogs, setShowDebugLogs] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState(new Set());
  /** Log expandido en el panel de Actividad (muestra el snapshot completo). */
  const [expandedLogId, setExpandedLogId] = useState(null);
  const prevDebugRef = useRef();
  const prevSessionBroadcastIdRef = useRef();
  const routeRestoreDoneRef = useRef(false);

  const currentEvent = useMemo(() => events.find(e => e.id === selectedEventId) || null, [events, selectedEventId]);

  const participantLocationsKey = useMemo(() => {
    const locs = currentEvent?.locations?.length ? currentEvent.locations : globalLocations || [];
    return [...new Set(locs.map((l) => String(l || '').trim()).filter(Boolean))].sort().join('|');
  }, [currentEvent?.id, currentEvent?.locations, globalLocations]);

  const mergedPrivacyNotice = useMemo(
    () => mergePrivacyNoticeConfig(globalConfig?.privacyNotice),
    [globalConfig?.privacyNotice]
  );
  const privacyNoticePublicUrl = useMemo(
    () => buildPrivacyNoticePublicUrl(typeof window !== 'undefined' ? window.location.origin : ''),
    []
  );

  useEffect(() => {
    if (!currentUser?.id) {
      setPersonOfInterestVnpSet(new Set());
      return undefined;
    }
    return subscribePersonOfInterestVnpSet(setPersonOfInterestVnpSet, (err) => console.error(err));
  }, [currentUser?.id]);

  const personOfInterestRegistrationHelpers = useMemo(
    () => ({
      generateVnpPersonId,
      eventType: currentEvent?.eventType,
      canMarkPersonsOfInterest: canMarkPersonsOfInterestFlag,
    }),
    [currentEvent?.eventType, canMarkPersonsOfInterestFlag]
  );

  const isCampa = currentEvent?.eventType === 'Campa';
  /** Prefs compartidas del evento: casillas «Conteo x2 costo real» (todos los usuarios; persisten en Firestore). */
  const campaRealCostCountOpts = useMemo(() => {
    const o = currentEvent?.campaRealCostCountOptions;
    if (!o || typeof o !== 'object') {
      return {
        countAmbosDoubleInAllCounts: true,
        includeCortesiaInRealCost: false,
        includeEmpleadoInRealCost: false,
        includePastorInRealCost: false,
      };
    }
    return {
      countAmbosDoubleInAllCounts: o.countAmbosDoubleInAllCounts !== false,
      includeCortesiaInRealCost: o.includeCortesiaInRealCost === true,
      includeEmpleadoInRealCost: o.includeEmpleadoInRealCost === true,
      includePastorInRealCost: o.includePastorInRealCost === true,
    };
  }, [currentEvent?.campaRealCostCountOptions, currentEvent?.id]);
  const { countAmbosDoubleInAllCounts, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost } = campaRealCostCountOpts;
  const isGeneral = currentEvent?.eventType === 'General';
    const isResponsivaEnabled = isResponsivaEnabledForEvent(currentEvent);
  const isDesayunoEvent = eventTypeIsDesayuno(currentEvent?.eventType);
  const sortedEvents = useMemo(
    () =>
      [...events]
        .filter((ev) => String(ev?.eventType || '').trim() !== 'Bautizos') // unsupported in v2
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [events]
  );

  /** Sedes en configuración global + todas las creadas en cualquier evento (p. ej. alta de sede solo en un evento). */
  const allKnownLocationNames = useMemo(() => {
    const set = new Set((globalLocations || []).map((x) => String(x).trim()).filter(Boolean));
    (events || []).forEach((ev) => {
      (ev.locations || []).forEach((loc) => {
        const s = String(loc || '').trim();
        if (s) set.add(s);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [globalLocations, events]);
  const getUserAllowedEventIds = useCallback((user) => rbacGetUserAllowedEventIds(user), []);
  const getUserAllowedLocations = useCallback((user) => getUserAllowedLocationsLegacy(user), []);
  const getFlattenedAllowedLocationsFromEventMap = useCallback((allowedLocationsByEvent, allowedEventIds = []) => {
    if (!allowedLocationsByEvent || typeof allowedLocationsByEvent !== 'object') return [];
    const scopedEventIds = Array.isArray(allowedEventIds) && allowedEventIds.length > 0
      ? allowedEventIds.map((id) => String(id))
      : sortedEvents.map((ev) => String(ev.id));
    const flat = new Set();
    scopedEventIds.forEach((eventId) => {
      const locs = Array.isArray(allowedLocationsByEvent?.[eventId]) ? allowedLocationsByEvent[eventId] : [];
      locs.forEach((loc) => {
        const v = String(loc || '').trim();
        if (v) flat.add(v);
      });
    });
    return Array.from(flat);
  }, [sortedEvents]);
  const getEditableScopedEvents = useCallback((allowedEventIds) => {
    const ids = Array.isArray(allowedEventIds) ? allowedEventIds.filter(Boolean) : [];
    if (ids.length === 0) return sortedEvents;
    const set = new Set(ids.map((id) => String(id)));
    return sortedEvents.filter((ev) => set.has(String(ev.id)));
  }, [sortedEvents]);
  /**
   * Si la ventana inicial es una sede (no Dashboard), asigna solo esa sede en cada evento del alcance
   * (todos los eventos o los marcados). Con Dashboard no modifica sedes (se siguen editando abajo).
   */
  const applyLandingSedeToNewUserState = useCallback(
    (prev) => {
      const pref = String(prev.preferredLandingTab || '').trim();
      if (pref === 'Summary') return prev;
      const scoped = getEditableScopedEvents(prev.allowedEventIds);
      const nextByEvent = {};
      for (const ev of scoped) {
        const locList = ev.locations || [];
        nextByEvent[ev.id] = locList.includes(pref) ? [pref] : [];
      }
      return {
        ...prev,
        allowedLocationsByEvent: nextByEvent,
        allowedLocations: [pref],
      };
    },
    [getEditableScopedEvents]
  );
  const pruneEventScopedAccessMap = useCallback((sourceMap, allowedEventIds) => {
    const source = sourceMap && typeof sourceMap === 'object' ? sourceMap : {};
    const keepAll = !Array.isArray(allowedEventIds) || allowedEventIds.length === 0;
    const allowedSet = new Set((allowedEventIds || []).map((id) => String(id)));
    const next = {};
    Object.entries(source).forEach(([eventId, value]) => {
      if (!keepAll && !allowedSet.has(String(eventId))) return;
      next[String(eventId)] = value;
    });
    return next;
  }, []);
  const visibleEvents = useMemo(() => {
    if (!currentUser) return [];
    if (['Administrador', 'SuperUsuario'].includes(currentUser.role)) return sortedEvents;
    const allowedIds = getUserAllowedEventIds(currentUser);
    if (!allowedIds.length) return sortedEvents;
    return sortedEvents.filter(ev => allowedIds.includes(ev.id));
  }, [sortedEvents, currentUser, getUserAllowedEventIds]);
  const visibleLocations = useMemo(() => {
    if (!currentEvent || !currentUser) return [];
    return getUserAllowedLocationNamesForEvent(currentUser, currentEvent.id, currentEvent.locations || []);
  }, [currentEvent, currentUser]);

  /** Sedes incluidas en dashboard / export resumen (Administrador y SuperUsuario = evento completo). */
  const dashboardLocations = useMemo(() => {
    const locs = currentEvent?.locations || [];
    if (!locs.length || !currentUser) return [];
    if (['Administrador', 'SuperUsuario'].includes(currentUser.role)) return [...locs];
    return locs.filter((l) => visibleLocations.includes(l));
  }, [currentEvent?.locations, currentUser, visibleLocations]);

  const dashboardHasFullLocationAccess = useMemo(
    () => !!currentUser && ['Administrador', 'SuperUsuario'].includes(currentUser.role),
    [currentUser]
  );

  const excelExportAccessibleLocations = useMemo(() => {
    const locs = (currentEvent?.locations || []).map((l) => String(l).trim()).filter(Boolean);
    if (!locs.length || !currentUser) return [];
    if (dashboardHasFullLocationAccess) return locs;
    return locs.filter((l) => visibleLocations.includes(l));
  }, [currentEvent?.locations, currentUser, dashboardHasFullLocationAccess, visibleLocations]);

  const panelNavMerged = useMemo(() => {
    const o = globalConfig?.panelNav && typeof globalConfig.panelNav === 'object' ? globalConfig.panelNav : {};
    return { ...DEFAULT_PANEL_NAV, ...o };
  }, [globalConfig?.panelNav]);

  const resolvePreferredLandingTab = useCallback(
    (user, eventObj = null) => {
      const fromEvent = eventObj?.locations;
      const eventId = eventObj?.id != null && eventObj?.id !== '' ? eventObj.id : null;
      const visibleForEvent =
        user && eventObj
          ? getUserAllowedLocationNamesForEvent(user, eventId, fromEvent || [])
          : [];
      const available =
        visibleForEvent.length > 0
          ? visibleForEvent
          : Array.isArray(fromEvent) && fromEvent.length > 0
            ? fromEvent
            : (allKnownLocationNames.length > 0 ? allKnownLocationNames : globalLocations) || [];
      const preferred = user?.preferredLandingTab || '';
      const merged = getUserAllowedPanelSectionsForEvent(user, eventId, panelNavMerged);
      const dashboardAllowed = merged.dashboard !== false;

      const fallbackTabForNoDashboard = () => {
        const locCandidates =
          visibleForEvent.length > 0
            ? visibleForEvent
            : Array.isArray(fromEvent) && fromEvent.length > 0
              ? fromEvent
              : available;
        for (const loc of locCandidates) {
          if (visibleForEvent.length === 0 || visibleForEvent.includes(loc)) return loc;
        }
        if (visibleForEvent.length > 0) return visibleForEvent[0];
        const allowedLocs = getUserAllowedLocations(user);
        for (const loc of locCandidates) {
          if (allowedLocs.length === 0 || allowedLocs.includes(loc)) return loc;
        }
        if (allowedLocs.length > 0) return allowedLocs[0];
        if (locCandidates.length > 0) return locCandidates[0];
        if (available.length > 0) return available[0];
        return 'Summary';
      };

      if (preferred === 'Summary') {
        return dashboardAllowed ? 'Summary' : fallbackTabForNoDashboard();
      }
      if (['Administrador', 'SuperUsuario'].includes(user?.role)) {
        if (preferred && available.includes(preferred)) return preferred;
        if (available.includes('Norte')) return 'Norte';
        return dashboardAllowed ? 'Summary' : fallbackTabForNoDashboard();
      }
      const allowedLocs = getUserAllowedLocations(user);
      if (!preferred) return dashboardAllowed ? 'Summary' : fallbackTabForNoDashboard();
      if (!available.includes(preferred)) return dashboardAllowed ? 'Summary' : fallbackTabForNoDashboard();
      if (visibleForEvent.length > 0 && !visibleForEvent.includes(preferred)) {
        return dashboardAllowed ? 'Summary' : fallbackTabForNoDashboard();
      }
      if (allowedLocs.length === 0 || allowedLocs.includes(preferred)) return preferred;
      return dashboardAllowed ? 'Summary' : fallbackTabForNoDashboard();
    },
    [globalLocations, allKnownLocationNames, getUserAllowedLocations, panelNavMerged]
  );

  const editorTypeFieldVis = useMemo(() => {
    const evType = currentEvent?.eventType;
    const byType = globalConfig?.editorRegistrationFieldsByType;
    const typeRaw = evType && byType && typeof byType === 'object' ? byType[evType] : null;
    return mergeEditorRegistrationFieldVisibility(typeRaw);
  }, [globalConfig?.editorRegistrationFieldsByType, currentEvent?.eventType]);

  const editorRegistrationFieldVis = useMemo(() => {
    const rawEvent = currentEvent?.editorRegistrationFields;
    const eventObj = rawEvent && typeof rawEvent === 'object' ? rawEvent : {};
    return { ...editorTypeFieldVis, ...eventObj };
  }, [editorTypeFieldVis, currentEvent?.editorRegistrationFields]);

  const transportSectionEligible = useMemo(
    () => getTransportSectionEligibleForEventDoc(currentEvent, globalConfig),
    [currentEvent, globalConfig]
  );

  const isPanelNavSectionAllowed = useCallback(
    (key) =>
      isPanelNavKeyAllowed(currentUser, key, {
        globalPanelNav: panelNavMerged,
        isCampa,
        isBautizos: false,
        isSuperUser,
        eventId: currentEvent?.id ?? null,
        eventDoc: currentEvent,
        transportSectionEligible,
      }),
    [currentUser, panelNavMerged, isCampa, isSuperUser, currentEvent, transportSectionEligible]
  );

  /** Misma regla que `isPanelNavSectionAllowed` pero para un `eventId` concreto (p. ej. navegación desde el hub antes de que exista `currentEvent`). */
  const isPanelNavAllowedForTargetEvent = useCallback(
    (key, targetEventId) => {
      if (!currentUser || targetEventId == null) return false;
      const ev = events.find((e) => String(e.id) === String(targetEventId));
      const te = getTransportSectionEligibleForEventDoc(ev, globalConfig);
      return isPanelNavKeyAllowed(currentUser, key, {
        globalPanelNav: panelNavMerged,
        isCampa: ev?.eventType === 'Campa',
        isBautizos: false,
        isSuperUser,
        eventId: targetEventId,
        eventDoc: ev,
        transportSectionEligible: te,
      });
    },
    [currentUser, panelNavMerged, isSuperUser, events, globalConfig]
  );

  /** Concepto visible si el creador no oculta sus gastos, o el visor es el creador, o SuperUsuario. */
  const canSeeExpenseConceptForRow = useCallback(
    (exp) => {
      if (!exp || exp._autoScholarshipExpense) return true;
      const creatorUsername = exp.createdBy || '';
      const creatorById = exp.createdByUserId != null && exp.createdByUserId !== '' ? String(exp.createdByUserId) : '';
      const creatorUser = users.find(
        (u) => (creatorById && String(u.id) === creatorById) || (creatorUsername && u.username === creatorUsername)
      );
      if (!creatorUser || !isHideMyExpenseConceptsOn(creatorUser)) return true;
      if (isSuperUser) return true;
      if (String(currentUser?.id) === String(creatorUser.id)) return true;
      return false;
    },
    [users, currentUser?.id, isSuperUser]
  );

  /** Editar / eliminar / marcar pago: filas automáticas (beca/saldo) solo Administrador/SuperUsuario con acceso a gastos; resto igual que antes. */
  const canMutateExpenseRecord = useCallback(
    (exp) => {
      if (!exp) return false;
      if (exp._autoScholarshipExpense || exp._manualCostCreditExpense) {
        return hasAdminRights && canAccessExpenses;
      }
      if (isSuperUser) return true;
      if (!canAccessExpenses) return false;
      return canSeeExpenseConceptForRow(exp);
    },
    [canAccessExpenses, hasAdminRights, isSuperUser, canSeeExpenseConceptForRow]
  );

  const currentPricing = useMemo(() => getPricingFromSnapshot(currentEvent), [currentEvent]);
  const getActiveDiscountCampaigns = useCallback((eventLike) => {
    const today = new Date().toISOString().split('T')[0];
    const all = Array.isArray(eventLike?.discountCampaigns) ? eventLike.discountCampaigns : [];
    return all.filter((c) => {
      if (!c || c.enabled === false) return false;
      if (!c.startDate || !c.endDate) return false;
      return isDiscountCampaignVigenteOnDate(c, today);
    });
  }, []);
  const resolveCampaignForPerson = useCallback((personLike, eventLike) => {
    const active = getActiveDiscountCampaigns(eventLike);
    return active.find((c) => campaignMatchesPersonProfile(c, personLike)) || null;
  }, [getActiveDiscountCampaigns]);

  /** Campañas aplicables al perfil (válidas: concepto + monto); en edición se elige manual incluso sin vigencia por fecha. */
  const getManualApplyCampaignOptions = useCallback((eventLike, personLike) => {
    return getValidDiscountCampaignsForPerson(eventLike, personLike);
  }, []);

  const resolveMatchedCampaignForNewEntry = useCallback(
    (entry) => {
      const selectable = getValidDiscountCampaignsForPerson(currentEvent, entry);
      if (entry.selectedDiscountCampaignId) {
        return selectable.find((c) => String(c.id) === String(entry.selectedDiscountCampaignId)) || null;
      }
      return resolveCampaignForPerson(entry, currentEvent);
    },
    [currentEvent, resolveCampaignForPerson]
  );

  const resolveRegisteredCost = useCallback((person, pricing) => {
    if (person?.registeredCostManual === true) {
      const m = parseFloat(person?.registeredCost);
      if (Number.isFinite(m) && m >= 0) return m;
    }
    const parsed = parseFloat(person?.registeredCost);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    return getPersonCost(person, pricing, currentEvent);
  }, [currentEvent]);

  /** Borrador normalizado del formulario de edición (base para abrir y detectar cambios sin guardar). */
  const createEditRegistryDraft = useCallback(
    (person, loc) => {
      const listPrice = resolveRegisteredCost(person, currentPricing);
      const ageNumOpen = parseInt(person.age, 10);
      const campDefaultByAge =
        Number.isFinite(ageNumOpen) && ageNumOpen > 0
          ? ageNumOpen < 18
            ? 'Teens'
            : 'Jóvenes'
          : 'Jóvenes';
      const birthIsoOpen = normalizeBirthDateToIso(person.birthDate) || '';
      const base = {
        ...person,
        birthDate: birthIsoOpen,
        age: birthIsoOpen
          ? calculateAgeFromBirthDate(birthIsoOpen)
          : person.age != null && person.age !== ''
            ? String(person.age)
            : '',
        location: person.location || loc,
        travelFrom: person.travelFrom || person.location || loc,
        travelTo: person.travelTo || person.location || loc,
        registeredCost: listPrice,
        registeredCostManual: person.registeredCostManual === true,
        campAssignment: isSiValue(person.isServer)
          ? person.campAssignment || ''
          : person.campAssignment || campDefaultByAge,
        willBeBaptized: isSiValue(person.willBeBaptized) ? SI : 'No',
        baptismSegment: person.baptismSegment || '',
        ambosServeInSegment: ['Teens', 'Jóvenes'].includes(String(person.ambosServeInSegment || '').trim())
          ? String(person.ambosServeInSegment || '').trim()
          : '',
        scholarshipType: person.scholarshipType === 'partial' ? 'partial' : 'total',
        scholarshipPartialAmount:
          person.scholarshipType === 'partial' && person.scholarshipPartialAmount != null && person.scholarshipPartialAmount !== ''
            ? String(person.scholarshipPartialAmount)
            : '',
        attendanceSpecialType: normalizeAttendanceSpecial(person),
        editApplyCampaignId: person.discountCampaignId ? String(person.discountCampaignId) : '__none__',
        bautizosAttendanceType: bzEvtNormalizeAttendanceType(person.bautizosAttendanceType),
        bautizosCompanions: bzEvtNormalizeCompanionsForForm(person.bautizosCompanions),
        baptismShirtSize: normalizeBaptismShirtSize(person.baptismShirtSize),
      };
      if (false /* Bautizos unsupported in v2 */) {
        return bzEvtSyncAttendanceServerFields(base);
      }
      return base;
    },
    [currentPricing, resolveRegisteredCost, currentEvent?.eventType]
  );

  /** Monto que debe liquidar la persona (0 = beca total cubierta). Beca parcial: lista menos monto becado (scholarshipPartialAmount). */
  const getLiquidationTarget = useCallback((person) => {
    if (isFreeAttendanceType(normalizeAttendanceSpecial(person))) return 0;
    if (false /* Bautizos unsupported in v2 */ && bzEvtIsFreeAttendance(person)) return 0;
    const listPrice = resolveRegisteredCost(person, currentPricing);
    let toLiquidate = listPrice;
    if (!isSiValue(person?.isScholarship)) {
      if (false /* Bautizos unsupported in v2 */ && bzEvtLegacyHostStoredRow(person)) {
        return getBautizosPartyLiquidationSplit(person, currentEvent, null, toLiquidate).titularOwed;
      }
      return toLiquidate;
    }
    if (person?.scholarshipType === 'partial') {
      const montoBecado = parseFloat(person.scholarshipPartialAmount || 0);
      if (!Number.isFinite(montoBecado) || montoBecado <= 0) {
        if (false /* Bautizos unsupported in v2 */ && bzEvtLegacyHostStoredRow(person)) {
          return getBautizosPartyLiquidationSplit(person, currentEvent, null, toLiquidate).titularOwed;
        }
        return toLiquidate;
      }
      toLiquidate = Math.max(0, Math.min(listPrice - montoBecado, listPrice));
      if (false /* Bautizos unsupported in v2 */ && bzEvtLegacyHostStoredRow(person)) {
        return getBautizosPartyLiquidationSplit(person, currentEvent, null, toLiquidate).titularOwed;
      }
      return toLiquidate;
    }
    return 0;
  }, [resolveRegisteredCost, currentPricing, currentEvent]);

  /** Beca parcial (Campa): abono inicial cualquier monto ≥ 0 hasta el saldo pendiente por liquidar (no exige apartado mínimo ni pago completo). */
  const isValidPartialScholarshipInitialPaid = useCallback((entry, _minDep) => {
    const paidParsed = parseStrictNonNegativeMoneyInput(entry.paid, { allowEmpty: true });
    const paid = paidParsed.ok ? paidParsed.value : NaN;
    if (!paidParsed.ok || paid < 0) return false;
    const liq = getLiquidationTarget(entry);
    return paid <= liq + 0.02;
  }, [getLiquidationTarget]);

  /** Monto cubierto por beca respecto al costo de lista (para beca parcial = scholarshipPartialAmount si es coherente). */
  const getScholarshipCondonedAmount = useCallback(
    (person) => {
      if (!isSiValue(person?.isScholarship)) return 0;
      if (currentEvent?.eventType === 'Campa') {
        const baseRealCost = Number(currentEvent?.scholarshipRealCostBase ?? currentEvent?.realCost ?? 0) || 0;
        const x2 = participantCountsAsRealCostX2(person, currentEvent) ? 2 : 1;
        const paidGross = parseFloat(person?.paid || 0) || 0;
        return Math.max(0, (baseRealCost * x2) - paidGross);
      }
      const listPrice = resolveRegisteredCost(person, currentPricing);
      const toPay = getLiquidationTarget(person);
      return Math.max(0, listPrice - toPay);
    },
    [resolveRegisteredCost, currentPricing, getLiquidationTarget, currentEvent]
  );

  const [logs, setLogs] = useState([]);
  const logsRef = useRef([]);
  logsRef.current = logs;
  /** Entradas de actividad con `revertInfo` durante la sesión de depuración actual (no depende de abrir la vista de logs). */
  const debugSessionRevertLogsRef = useRef([]);
  /** Hasta que llegue el snapshot con `isDebugMode`, conserva el id de sesión al activar depuración. */
  const pendingDebugSessionRef = useRef(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsLoadingMore, setLogsLoadingMore] = useState(false);
  const [logsSearchScanning, setLogsSearchScanning] = useState(false);
  const [logsFullSearchMode, setLogsFullSearchMode] = useState(false);
  /** SuperUsuario confirmó búsqueda de texto en toda la colección (full-scan). */
  const [logsGlobalSearchConfirmed, setLogsGlobalSearchConfirmed] = useState(false);
  const [logsVisibleBackfillBusy, setLogsVisibleBackfillBusy] = useState(false);
  const [logsCountReconcileBusy, setLogsCountReconcileBusy] = useState(false);
  const [logsHasMoreOlder, setLogsHasMoreOlder] = useState(true);
  const [logRecentBaseLimit, setLogRecentBaseLimit] = useState(20);
  const logsOldestCursorRef = useRef(null);
  const participantsVersionUnsubRef = useRef(null);
  const participantsVersionAckRef = useRef(null);
  /** Último roster en memoria por evento (misma sesión): pinta al reentrar mientras se valida IndexedDB. */
  const eventParticipantsWarmRef = useRef({ eventId: '', rows: null });
  const logsVersionUnsubRef = useRef(null);
  const staffSnapshotUnsubsRef = useRef([]);

  const teardownStaffFirestoreListeners = useCallback(() => {
    if (participantsVersionUnsubRef.current) {
      participantsVersionUnsubRef.current();
      participantsVersionUnsubRef.current = null;
    }
    participantsVersionAckRef.current = null;
    if (logsVersionUnsubRef.current) {
      logsVersionUnsubRef.current();
      logsVersionUnsubRef.current = null;
    }
    for (const unsub of staffSnapshotUnsubsRef.current) {
      try {
        unsub();
      } catch {
        /* ignore */
      }
    }
    staffSnapshotUnsubsRef.current = [];
  }, []);

  const finalizeStaffPanelSignOut = useCallback(async () => {
    teardownStaffFirestoreListeners();
    await signOut(auth).catch(() => {});
  }, [teardownStaffFirestoreListeners]);

  const resetStaffPanelAfterSignOut = useCallback(() => {
    setNavHistory([]);
    setForwardNavStack([]);
    setCurrentUser(null);
    setSelectedEventId(null);
    setActiveTab('Summary');
    setSystemView('events');
    setShowViewSettings(false);
    navigate('/login');
  }, [navigate]);
  const prevLogBaseRef = useRef(20);
  /** Evita el early-return que impedía cargar los N últimos al entrar si `logs` ya tenía pocos ítems (p. ej. solo `addLog`). */
  const wasOnActivityLogsPageRef = useRef(false);
  const logsSearchRequestIdRef = useRef(0);
  const [logFilterContext, setLogFilterContext] = useState('all');
  /** Filtro estricto por nombre de usuario tal como aparece en la columna «Usuario». */
  const [logFilterUsername, setLogFilterUsername] = useState('');
  /** Filtro estricto por columna «Acción» (`log.action`). Vacío = todas. */
  const [logFilterAction, setLogFilterAction] = useState('');
  /** Cantidad a borrar (más antiguos por fecha); SuperUsuario, modal de confirmación. */
  const [logOldestBulkDeleteCountInput, setLogOldestBulkDeleteCountInput] = useState('100');
  const [logStorageMaxEntries, setLogStorageMaxEntries] = useState(LOGS_STORAGE_MAX_DEFAULT);
  const [logStorageMaxSaving, setLogStorageMaxSaving] = useState(false);
  const [logBulkDeleteBusy, setLogBulkDeleteBusy] = useState(false);
  const logBulkDeleteInFlightRef = useRef(false);
  /** Conteo total de documentos en `app_logs` (vía getCountFromServer, lectura barata). */
  const [logsTotalCount, setLogsTotalCount] = useState(null);
  const [logsTotalCountLoading, setLogsTotalCountLoading] = useState(false);
  /** Si Firestore niega `RunAggregationQuery`, evitamos reintentos ruidosos del contador. */
  const [logsTotalCountPermissionDenied, setLogsTotalCountPermissionDenied] = useState(false);
  /**
   * Si es distinto de `null`, `logs` viene de una consulta por rango (Hoy / Esta semana / Este mes)
   * y la lista ignora el límite N. Contiene `{ kind, label }`.
   */
  const [logsRangeActive, setLogsRangeActive] = useState(null);
  const [logsRangeLoading, setLogsRangeLoading] = useState(false);
  const [logsMonthConfirmOpen, setLogsMonthConfirmOpen] = useState(false);
  const [logSearchTerm, setLogSearchTerm] = useState('');
  const [logsMobileMenuOpen, setLogsMobileMenuOpen] = useState(false);
  const [logDateMode, setLogDateMode] = useState('none');
  const [logDateFrom, setLogDateFrom] = useState('');
  const [logDateTo, setLogDateTo] = useState('');
  const [logSpecificWeek, setLogSpecificWeek] = useState('');
  const [logSpecificDay, setLogSpecificDay] = useState('');
  const [logSpecificMonth, setLogSpecificMonth] = useState('');
  const [allParticipants, setAllParticipants] = useState([]);
  const carDataWaBackfillDoneRef = useRef(new Set());

  useEffect(() => {
    if (!false || !currentEvent?.id || !allParticipants?.length) return;
    const eid = String(currentEvent.id);
    if (carDataWaBackfillDoneRef.current.has(eid)) return;
    carDataWaBackfillDoneRef.current.add(eid);

    const deferMs = 4000;
    const timer = setTimeout(() => {
      const releaseSuppress = suppressParticipantVersionListeners();
      const touchedLocs = new Set();

      const run = async () => {
        try {
          for (const p of allParticipants) {
            if (String(p?.eventId || '') !== eid) continue;
            if (!participantIsActiveInRoster(p)) continue;
            const anchor = bzEvtResolveCarDataAnchor(p, allParticipants, currentEvent);
            if (!anchor.eligible || !anchor.waRecipient || !anchor.anchorPerson) continue;
            if (String(anchor.waRecipient.id || '').trim() !== String(p.id || '').trim()) continue;
            const inventory = bzEvtBuildFamilyCarInventory({
              hostPerson: anchor.anchorPerson,
              companions: anchor.inventoryCompanions,
              plan: currentEvent.transportPlanning,
              hostSourceKey: `p:${String(anchor.anchorPerson.id || '').trim()}`,
            });
            if (
              !familyCarInventoryNeedsAttention(inventory, {
                hostPerson: anchor.anchorPerson,
                companions: anchor.companionsForCrew,
              })
            ) {
              continue;
            }
            const existing = Array.isArray(p.whatsAppFinanceNotifications)
              ? p.whatsAppFinanceNotifications
              : [];
            const existingCar = dedupeUnsentCarDataNotifications(existing).find(
              (n) => n && !n.sent && String(n?.kind || '') === 'datos_carro'
            );
            if (existingCar && isCarDataNotificationSnoozed(existingCar)) continue;
            const createdAt = Date.now();
            const loc = String(p.location || '').trim();
            const pid = String(p.id || '').trim();
            const carDataSubjectContext = buildCarDataWaSubjectContext(
              anchor.anchorPerson,
              anchor.inventoryCompanions
            );
            const message = buildCarDataRequestWhatsAppMessage({
              person: p,
              loc,
              eventSnapshot: currentEvent,
              carSlots: inventory,
              reportedAtMs: createdAt,
              requiresPassengers: carCrewRequiresPassengerSelection(
                anchor.anchorPerson,
                anchor.companionsForCrew
              ),
              carDataSubjectContext,
            });
            const notification = {
              id: buildCarDataWhatsAppNotificationId(pid, eid),
              kind: 'datos_carro',
              carSlots: inventory,
              carDataSubjectContext,
              message,
              createdAt: existingCar?.createdAt ?? createdAt,
              sent: false,
              sentAt: null,
            };
            const nextNotifications = upsertCarDataWhatsAppNotification(existing, notification);
            const unchanged =
              existingCar &&
              String(existingCar.message || '') === message &&
              JSON.stringify(existingCar.carSlots || null) === JSON.stringify(inventory || null) &&
              !isCarDataNotificationSnoozed(existingCar, createdAt);
            if (unchanged) continue;
            try {
              await updateDoc(getDocRef('app_participants', pid), {
                whatsAppFinanceNotifications: nextNotifications,
              });
              if (loc) touchedLocs.add(loc);
            } catch (err) {
              console.warn('car data WA backfill', err);
            }
          }
        } finally {
          await Promise.all(
            [...touchedLocs].map((loc) =>
              syncLocalVersionIndexFromIdb(scopeParticipantsLocation(eid, loc))
            )
          );
          releaseSuppress();
        }
      };
      void run();
    }, deferMs);

    return () => clearTimeout(timer);
  }, [currentEvent?.id, currentEvent?.transportPlanning, allParticipants]);
  const refetchParticipantLocationsAfterWrite = useCallback((eventId, locations) => {
    return refetchAndMergeParticipantLocations(eventId, locations, setAllParticipants, {
      acknowledgeLocationVersion: (loc, remoteV) =>
        participantsVersionAckRef.current?.(loc, remoteV),
    });
  }, []);

  /** Tras escribir en Firestore: parche optimista + refetch de sede(s) para alinear caché y roster. */
  const refreshParticipantCache = useCallback(
    (person, action, opts = {}) => {
      syncParticipantAfterWrite(setAllParticipants, person, action, opts);
      if (opts.skipRefetch === true) return;
      const eid = String(opts.eventId || person?.eventId || currentEvent?.id || '').trim();
      const prevLoc = String(opts.previousLocation || '').trim();
      const curLoc = String(opts.location || opts.patch?.location || person?.location || prevLoc).trim();
      const locs = [...new Set([prevLoc, curLoc].filter(Boolean))];
      if (eid && locs.length) {
        void refetchParticipantLocationsAfterWrite(eid, locs).catch((err) => {
          console.error('[cache-version] refetch tras escritura', action, err);
        });
      }
    },
    [currentEvent?.id, refetchParticipantLocationsAfterWrite]
  );

  const handleSavePastorFields = useCallback(
    async (personId, fields) => {
      if (!hasAdminRights) {
        showToast('Solo administradores pueden editar datos de pastores.');
        return;
      }
      const pid = String(personId || '').trim();
      if (!pid || !currentEvent?.id) return;
      const person = allParticipants.find((p) => String(p.id) === pid);
      if (!person) {
        showToast('No se encontró el registro del pastor.');
        return;
      }
      setSavingPastorId(pid);
      try {
        const patch = {
          pastorRealCost: Number.isFinite(fields?.pastorRealCost) ? fields.pastorRealCost : 0,
          pastorStayStart: String(fields?.pastorStayStart || '').trim(),
          pastorStayEnd: String(fields?.pastorStayEnd || '').trim(),
        };
        const stayUpdates = Array.isArray(fields?.companionStayDates) ? fields.companionStayDates : [];
        if (stayUpdates.length > 0 && Array.isArray(person.bautizosCompanions)) {
          const byId = new Map(
            stayUpdates
              .map((row) => [String(row?.id || '').trim(), row])
              .filter(([cid]) => cid)
          );
          patch.bautizosCompanions = person.bautizosCompanions.map((c) => {
            const cid = String(c?.id || '').trim();
            const upd = byId.get(cid);
            if (!upd) return c;
            return {
              ...c,
              pastorStayStart: String(upd.pastorStayStart || '').trim(),
              pastorStayEnd: String(upd.pastorStayEnd || '').trim(),
            };
          });
        }
        await updateDoc(getDocRef('app_participants', pid), patch);
        refreshParticipantCache(person, 'Pastores — costo y fechas', { personId: pid, patch });
        showToast('Datos del pastor guardados.');
      } catch (err) {
        console.error(err);
        showToast('No se pudieron guardar los datos del pastor.');
      } finally {
        setSavingPastorId('');
      }
    },
    [allParticipants, currentEvent?.id, hasAdminRights, refreshParticipantCache, showToast]
  );
  /** Participantes de otros eventos (lotes `in`) para importar perfil sin suscribirse a toda la colección. */
  const [importProfileParticipants, setImportProfileParticipants] = useState([]);
  const archivedParticipantsForView = useMemo(
    () => allParticipants.filter(participantIsArchived),
    [allParticipants]
  );
  /** Participantes del evento actual limitados a las sedes permitidas del usuario. */
  const scopedEventParticipants = useMemo(() => {
    if (!currentEvent?.id) return [];
    const inEvent = allParticipants.filter((p) => String(p.eventId) === String(currentEvent.id));
    return filterParticipantsByLocationScope(inEvent, visibleLocations);
  }, [allParticipants, currentEvent?.id, visibleLocations]);
  /**
   * Hub de eventos: unidades de inscripción activa por evento (misma base que cupo global en dashboard).
   * Bautizos: titular + acompañantes con nombre. Campa: ×2 si «Ambos» y opción de conteo del evento. Resto: 1 por registro.
   */
  /** Hub: `activeRosterUnitsTotal` (Cloud Function) = mismo total que «Registros totales» del dashboard en modo Todos (`src/dashboardTodosRosterTotal.js`). */
  const activeRosterUnitsByEventId = useMemo(() => {
    const map = Object.create(null);
    for (const ev of events) {
      const id = String(ev?.id ?? '');
      if (!id) continue;
      const n = Number(ev?.activeRosterUnitsTotal);
      map[id] = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
    }
    return map;
  }, [events]);
  /**
	 * Merges archived participants by vnpPersonId (primary) or phone (fallback)
	 * so the archive view shows one row per unique person, not one row per registration.
	 *
	 * Grouping priority:
	 *   1. canonicalizeVnpPersonId(vnpPersonId) — if valid (non-empty after canonicalization)
	 *   2. digitsOnlyPhone(phone) — if ≥ 10 digits
	 *   3. participant.id (no merge, treated as unique)
	 *
	 * Within each group, the record with the most recent archivedAt provides primary field values.
	 * Older records fill in any fields that are missing/empty in the newer record.
	 * All source eventIds and event names are aggregated.
	 */
	const mergedArchivedParticipantsForView = useMemo(() => {
	  if (!archivedParticipantsForView || archivedParticipantsForView.length === 0) {
		return [];
	  }

	  // --- 1. Group participants by merge key ---
	  const groups = new Map(); // mergeKey -> [participant, ...]

	  for (const participant of archivedParticipantsForView) {
		let mergeKey = null;

		// Priority 1: vnpPersonId
		const canonicalVnp = canonicalizeVnpPersonId(participant.vnpPersonId);
		if (canonicalVnp) {
		  mergeKey = `vnp:${canonicalVnp}`;
		}

		// Priority 2: phone (≥ 10 digits)
		if (!mergeKey) {
		  const digits = digitsOnlyPhone(participant.phone);
		  if (digits && digits.length >= 10) {
			mergeKey = `phone:${digits}`;
		  }
		}

		// Priority 3: no merge — use unique participant ID
		if (!mergeKey) {
		  mergeKey = `id:${participant.id}`;
		}

		if (!groups.has(mergeKey)) {
		  groups.set(mergeKey, []);
		}
		groups.get(mergeKey).push(participant);
	  }

	  // --- 2. Merge each group into a single representative record ---
	  const merged = [];

	  for (const [, groupParticipants] of groups) {
		if (groupParticipants.length === 1) {
		  // Single record — no merge needed, just augment with event info
		  const p = groupParticipants[0];
		  merged.push({
			...p,
			_mergedFromCount: 1,
			_sourceEventIds: [p.eventId].filter(Boolean),
			_sourceEventNames: [resolveEventName(p.eventId)].filter(Boolean),
			_sourceParticipantIds: [p.id],
		  });
		  continue;
		}

		// Sort by archivedAt descending (most recent first)
		const sorted = [...groupParticipants].sort((a, b) => {
		  const tsA = a.archivedAt?.toMillis?.() ?? a.archivedAt?.seconds * 1000 ?? 0;
		  const tsB = b.archivedAt?.toMillis?.() ?? b.archivedAt?.seconds * 1000 ?? 0;
		  return tsB - tsA; // descending — newest first
		});

		// Start with the newest record as the base
		const base = { ...sorted[0] };

		// Collect all event IDs and names
		const sourceEventIds = [];
		const sourceParticipantIds = [];
		const seenEventIds = new Set();

		for (const p of sorted) {
		  if (p.eventId && !seenEventIds.has(p.eventId)) {
			seenEventIds.add(p.eventId);
			sourceEventIds.push(p.eventId);
		  }
		  sourceParticipantIds.push(p.id);
		}

		// Fill in missing/empty fields from older records
		// Define the personal data fields to consider for gap-filling
		const fieldsToMerge = [
		  'firstName', 'lastName', 'email', 'phone',
		  'vnpPersonId', 'dharmName', 'spiritualName',
		  'city', 'state', 'country', 'address', 'zipCode',
		  'dateOfBirth', 'gender', 'nationality',
		  'emergencyContactName', 'emergencyContactPhone',
		  'dietaryRestrictions', 'allergies', 'medicalConditions',
		  'notes', 'additionalInfo',
		  // Add any other personal data fields your app uses
		];

		for (let i = 1; i < sorted.length; i++) {
		  const olderRecord = sorted[i];
		  for (const field of fieldsToMerge) {
			const currentVal = base[field];
			const olderVal = olderRecord[field];

			// Fill if base field is missing, empty string, null, or undefined
			if (
			  (currentVal === undefined || currentVal === null || currentVal === '') &&
			  olderVal !== undefined && olderVal !== null && olderVal !== ''
			) {
			  base[field] = olderVal;
			}
		  }

		  // Also consider archivedAt — keep the most recent one (already the base)
		  // But preserve the earliest archivedAt as well for reference
		  if (!base._earliestArchivedAt) {
			base._earliestArchivedAt = olderRecord.archivedAt;
		  } else {
			const existingEarliest = base._earliestArchivedAt?.toMillis?.() ??
			  base._earliestArchivedAt?.seconds * 1000 ?? 0;
			const candidate = olderRecord.archivedAt?.toMillis?.() ??
			  olderRecord.archivedAt?.seconds * 1000 ?? 0;
			if (candidate < existingEarliest) {
			  base._earliestArchivedAt = olderRecord.archivedAt;
			}
		  }
		}

		// Attach merge metadata
		base._mergedFromCount = groupParticipants.length;
		base._sourceEventIds = sourceEventIds;
		base._sourceEventNames = sourceEventIds.map(resolveEventName).filter(Boolean);
		base._sourceParticipantIds = sourceParticipantIds;

		merged.push(base);
	  }

	  return merged;
  }, [archivedParticipantsForView, events]);

/**
 * Helper to resolve an eventId to a display name.
 * Uses the `events` array/map already available in the component.
 */
function resolveEventName(eventId) {
  if (!eventId) return '';
  // Adjust this based on your events data structure:
  // If events is an array:
  const event = events?.find?.(e => e.id === eventId);
  return event?.name || event?.title || eventId;
  // If events is a Map or object, adapt accordingly
}
  const [archiveViewSearch, setArchiveViewSearch] = useState('');
  /** Vista archivo: nombre A–Z o fecha de archivo (más reciente primero). */
  const [archiveViewSort, setArchiveViewSort] = useState('name');
  const archivedParticipantsArchiveViewList = useMemo(() => {
    let list = mergedArchivedParticipantsForView;
    const q = archiveViewSearch.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const evName = events.find((e) => e.id === p.eventId)?.name || '';
        const blob = [
          p.name,
          p.alias,
          p.phone,
          p.vnpPersonId,
          p.email,
          typeof p.notes === 'string' ? p.notes : '',
          evName,
          p.eventId,
          p.archivedFromLocation,
          String(p.id),
        ]
          .join(' ')
          .toLowerCase();
        return blob.includes(q);
      });
    }
    const out = [...list];
    if (archiveViewSort === 'name') {
      out.sort((a, b) =>
        String(a.name || '').localeCompare(String(b.name || ''), 'es', { sensitivity: 'base' })
      );
    } else {
      out.sort((a, b) => (Number(b.archivedAt) || 0) - (Number(a.archivedAt) || 0));
    }
    return out;
  }, [mergedArchivedParticipantsForView, archiveViewSearch, archiveViewSort, events]);
  const [activeTab, setActiveTab] = useState("Summary");
  /** Contenido principal: un tick detrás del menú lateral para mejorar INP al cambiar sede / sección. */
  const deferredActiveTab = useDeferredValue(activeTab);
  const navContentPending = deferredActiveTab !== activeTab;
  useLayoutEffect(() => {
    navSnapshotRef.current = { systemView, selectedEventId, activeTab };
  });
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);
  const [showMoney, setShowMoney] = useState(true);
  const [showLocChartValues, setShowLocChartValues] = useState(false);
  const [showIncChartValues, setShowIncChartValues] = useState(false);
  const [showIncomeCashCardByLocation, setShowIncomeCashCardByLocation] = useState(false);
  const [showGrossWithoutCommission, setShowGrossWithoutCommission] = useState(false);
  const [syncFirestoreBusy, setSyncFirestoreBusy] = useState(false);
  const syncFirestoreInFlightRef = useRef(false);
  const [isAddLocModalOpen, setIsAddLocModalOpen] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [locError, setLocError] = useState('');
  /** Borrador de fechas del evento (sidebar / guardar en `app_events`). */
  const [eventDateDraft, setEventDateDraft] = useState({
    dateStart: '',
    dateEnd: '',
    campaTeensStart: '',
    campaTeensEnd: '',
    campaJovenesStart: '',
    campaJovenesEnd: '',
  });
  const [tempDeposit, setTempDeposit] = useState("");
  const [dashPaymentDeadlineDate, setDashPaymentDeadlineDate] = useState('');

  const [tempRealCost, setTempRealCost] = useState("");
  /** Porcentaje 0–100 para comisión de tarjeta (config global); se sincroniza con `globalConfig.cardCommissionRate`. */
  const [cardCommissionPctDraft, setCardCommissionPctDraft] = useState('4');
  const [tempLocationCaps, setTempLocationCaps] = useState({});
  /** 0 = sin tope global; suma de inscritos activos en todas las sedes. */
  const [tempEventTotalCap, setTempEventTotalCap] = useState(0);
  const [newCustomField, setNewCustomField] = useState("");

  const [newEntry, setNewEntry] = useState(EMPTY_ENTRY);
  /** Metadatos de carros en borrador de registro (transporte Campa/General). */
  const [newRegDraftCarMeta, setNewRegDraftCarMeta] = useState({});
  const [editRegDraftCarMeta, setEditRegDraftCarMeta] = useState({});
  const [savingPastorId, setSavingPastorId] = useState('');
  /** v2: sin evento Bautizos; TransportPlanningPage calcula colores localmente. */
  const bautizosCarColorSuggestions = EMPTY_CAR_COLOR_SUGGESTIONS;
  /** Modal intersticial datos de carro (legacy Bautizos; cerrado en v2). */
  const [bzEvtCarDataPrompt, setBzEvtCarDataPrompt] = useState({
    isOpen: false,
    hostPerson: null,
    companions: [],
    hostSourceKey: '',
    onResolve: null,
  });

  const patchEventTransportPlanning = useCallback(
    (nextPlan) => {
      const eid = String(currentEvent?.id || '').trim();
      if (!eid) return;
      setEvents((prev) =>
        prev.map((e) => (String(e.id) === eid ? { ...e, transportPlanning: nextPlan } : e))
      );
    },
    [currentEvent?.id]
  );

  const patchEventTransportPlanningDeferred = useCallback(
    (nextPlan) => {
      startTransition(() => {
        patchEventTransportPlanning(nextPlan);
      });
    },
    [patchEventTransportPlanning]
  );

  const persistBautizosCarMetaPatches = useCallback(
    async (patches, opts = {}) => {
      if (!patches?.length || !currentEvent?.id) return null;
      const nextPlan = await persistEventCarMetaPatches({
        eventId: currentEvent.id,
        patches,
        currentPlan: normalizeTransportPlanning(currentEvent.transportPlanning),
        getDocRef,
        updateDoc,
        roster: opts.rosterOverride || allParticipants || [],
        deferEventDocUpdate: opts.deferEventDocUpdate === true,
      });
      if (opts.deferEventDocUpdate !== true) {
        patchEventTransportPlanningDeferred(nextPlan);
      }
      return nextPlan;
    },
    [currentEvent?.id, currentEvent?.transportPlanning, patchEventTransportPlanningDeferred, getDocRef, updateDoc, allParticipants]
  );

  const bzEvtPromptCarDataIfNeeded = useCallback(() => Promise.resolve(true), []);
  /** Modal de inscripción en pestaña de sede (registro por sedes). */
  const [newRegModalOpen, setNewRegModalOpen] = useState(false);
  const [newRegDraftResetToken, setNewRegDraftResetToken] = useState(0);
  const newRegModalDraftLiveRef = useRef(null);
  const newRegModalProfileSearchLiveRef = useRef('');

  const openNewRegModal = useCallback(() => {
    setNewRegDraftResetToken((t) => t + 1);
    setNewRegModalOpen(true);
  }, []);

  useEffect(() => {
    if (newRegModalOpen) {
      setNewRegPrivacyAccepted(false);
      setNewRegSensitiveConsent('');
    }
  }, [newRegModalOpen]);
  const newEntryWithEditorDefaults = useMemo(() => {
    if (currentUser?.role !== 'Editor' || !currentEvent) return newEntry;
    const locForDefaults = visibleLocations.includes(activeTab) ? activeTab : (visibleLocations[0] || '');
    return applyEditorRegistrationDefaults(newEntry, editorRegistrationFieldVis, currentEvent.eventType, locForDefaults);
  }, [currentUser?.role, newEntry, editorRegistrationFieldVis, currentEvent, activeTab, visibleLocations]);

  useEffect(() => {
    if (true /* Bautizos unsupported in v2 */) return;
    const vis = mergeEditorRegistrationFieldVisibility(
      currentUser?.role === 'Editor' ? editorRegistrationFieldVis : {}
    );
    if (vis.bautizosCompanions === false) return;
    const ageNum = parseInt(newEntry.age, 10);
    if (!Number.isFinite(ageNum) || ageNum >= 18) return;
    const locForRow = String(
      (visibleLocations.includes(activeTab) ? activeTab : visibleLocations[0]) ||
        newEntry.location ||
        currentEvent?.locations?.[0] ||
        ''
    ).trim();
    setNewEntry((prev) => {
      const arr = bzEvtCompanionsArray(prev);
      if (arr.length > 0) return prev;
      return {
        ...prev,
        bautizosCompanions: [
          {
            id: `bc-${Date.now()}`,
            name: '',
            relationship: '',
            birthDate: '',
            wantsBautizosTransport: 'No',
            llegaEnCarro: true,
            regresaEnCarro: false,
            carrosLlegada: 1,
            travelFrom: locForRow,
            travelTo: locForRow,
          },
        ],
      };
    });
  }, [
    currentEvent?.eventType,
    currentEvent?.locations,
    newEntry.age,
    newEntry.location,
    activeTab,
    visibleLocations,
    currentUser?.role,
    editorRegistrationFieldVis,
  ]);

  const [editRegistryModal, setEditRegistryModal] = useState({ isOpen: false, loc: '', data: null, variant: 'modal' });
  const editRegistryModalRef = useRef(editRegistryModal);
  editRegistryModalRef.current = editRegistryModal;
  const resetEditRegistryModalRef = useRef(() => {});
  const [responsivaLinkBusyId, setResponsivaLinkBusyId] = useState(null);
  const [responsivaLocalBusyId, setResponsivaLocalBusyId] = useState(null);
  const [eventResponsivaTextMinorsDraft, setEventResponsivaTextMinorsDraft] = useState('');
  const [eventResponsivaTextAdultsDraft, setEventResponsivaTextAdultsDraft] = useState('');
  const [eventResponsivaTextSaving, setEventResponsivaTextSaving] = useState(false);
  const [eventResponsivaEnabledDraft, setEventResponsivaEnabledDraft] = useState(true);
  const [eventResponsivaDigitalEnabledDraft, setEventResponsivaDigitalEnabledDraft] = useState(true);
  const [eventResponsivaGeneralMinorsDraft, setEventResponsivaGeneralMinorsDraft] = useState(true);
  const [eventResponsivaGeneralAdultsDraft, setEventResponsivaGeneralAdultsDraft] = useState(false);
  const [eventResponsivaDigitalMinorsDraft, setEventResponsivaDigitalMinorsDraft] = useState(true);
  const [eventResponsivaDigitalAdultsDraft, setEventResponsivaDigitalAdultsDraft] = useState(false);
  /** En detalle expandido por fila: panel «Editar registro» abierto (id participante) o null si está contraído. */
  const [rosterInlineEditExpandedId, setRosterInlineEditExpandedId] = useState(null);
  /** Escritorio: fila expandida solo con el panel de edición (acción rápida Editar), sin detalle completo. */
  const [rosterExpandEditOnlyIds, setRosterExpandEditOnlyIds] = useState(() => new Set());
  /** JSON del borrador al abrir edición en línea (toggle Editar sin cambios). */
  const editRegistryInlineBaselineRef = useRef(null);
  /** Scroll pendiente al panel de edición cuando el detalle aún carga. */
  const pendingInlineEditScrollRef = useRef(null);
  /** Administradores: panel «Registro de Actividades» en detalle expandido (id participante). */
  const [participantActivityExpandedId, setParticipantActivityExpandedId] = useState(null);
  const [participantActivityEntriesById, setParticipantActivityEntriesById] = useState({});
  const [participantActivityLoadingId, setParticipantActivityLoadingId] = useState(null);
  const [pricingModal, setPricingModal] = useState({ isOpen: false });
  const [pricingForm, setPricingForm] = useState({
    camperPricingMode: 'fixed',
    serverPricingMode: 'fixed',
    globalCost: 0,
    serverCostTeens: 0,
    serverCostJovenes: 0,
    serverCostAmbos: 0,
    /** Último día para completar pagos según reglas del evento (opcional). */
    paymentDeadlineDate: '',
    phases: [],
    /** Fases de precio servidor (`dynamicServerPrices` o calendario acoplado legado). */
    serverPhases: [],
    campaigns: [],
  });
  const [customFieldsModal, setCustomFieldsModal] = useState({ isOpen: false });
  /** Búsqueda aplicada a filtros de lista por sede (el input local debouncea en RosterLocationSearchPanel). */
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  /** Búsqueda para importar datos desde otro evento del mismo tipo */
  const [newRegProfileSearch, setNewRegProfileSearch] = useState('');
  /** SuperUsuario: filas expandidas en aviso de duplicado al nuevo registro (ids de participante). */
  const [newRegDupExpandedIds, setNewRegDupExpandedIds] = useState([]);
  const [sortBy, setSortBy] = useState('registered-desc');
  const [filterSwim, setFilterSwim] = useState("all");
  const [filterMedical, setFilterMedical] = useState("all");
  const [filterScholarship, setFilterScholarship] = useState("all");
  const [filterResponsiva, setFilterResponsiva] = useState("all");
  /** all | marked | not-marked — personas marcadas globalmente como de interés (VNPM). */
  const [filterPersonOfInterest, setFilterPersonOfInterest] = useState('all');
  const [filterGender, setFilterGender] = useState("all");
  const [filterTransport, setFilterTransport] = useState("all");
  const [filterPaymentType, setFilterPaymentType] = useState("all");
  const [filterTravelFrom, setFilterTravelFrom] = useState("all");
  const [filterTravelTo, setFilterTravelTo] = useState("all");
  /** Unifica servidor (Teens/Jóvenes/Ambos/camperos) + empleado/cortesía (+ legacy `servidor`). */
  const [filterRosterRole, setFilterRosterRole] = useState('all');
  const [filterFirstTimeId, setFilterFirstTimeId] = useState("all");
  const [filterPendingRefund, setFilterPendingRefund] = useState("all");
  /** all | pending — solo filas con avisos WhatsApp financieros sin enviar */
  const [filterWhatsAppPending, setFilterWhatsAppPending] = useState("all");
  /** all | liquidado | pendiente — liquidación (incl. beca total y asistencia sin cobro). */
  const [filterLiquidation, setFilterLiquidation] = useState("all");
  const [filterAssignment, setFilterAssignment] = useState("all");
  const [filterBaptism, setFilterBaptism] = useState('all'); // all | teens | jovenes | no
  /** all | single | married | pending-spouse — campamentos; pareja vinculada (id o enlace entrante). */
  const [filterMaritalStatus, setFilterMaritalStatus] = useState('all');
  const [filterRegistrationStatus, setFilterRegistrationStatus] = useState('all');

  const [filterAge, setFilterAge] = useState('all');
  /** all | pending — datos de vehículo/tripulación pendientes (Bautizos). */
  const [filterCarDataPending, setFilterCarDataPending] = useState('all');
  const [filtersDropdownOpen, setFiltersDropdownOpen] = useState(false);
  /** Filtros solo del resumen del dashboard (Visualización de Datos Generales); independientes del registro por sede / registro global. */
  const [summaryFiltersDropdownOpen, setSummaryFiltersDropdownOpen] = useState(false);
  const summaryFiltersBtnRef = useRef(null);
  const [summaryFiltersMenuPos, setSummaryFiltersMenuPos] = useState(null);
  const updateSummaryFiltersMenuPos = useCallback(() => {
    const el = summaryFiltersBtnRef.current;
    if (!el) {
      setSummaryFiltersMenuPos(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setSummaryFiltersMenuPos({
      top: r.bottom + 8,
      right: Math.max(12, window.innerWidth - r.right),
      width: Math.min(380, window.innerWidth - 24),
    });
  }, []);
  useLayoutEffect(() => {
    if (!summaryFiltersDropdownOpen) {
      setSummaryFiltersMenuPos(null);
      return undefined;
    }
    updateSummaryFiltersMenuPos();
    window.addEventListener('resize', updateSummaryFiltersMenuPos);
    window.addEventListener('scroll', updateSummaryFiltersMenuPos, true);
    return () => {
      window.removeEventListener('resize', updateSummaryFiltersMenuPos);
      window.removeEventListener('scroll', updateSummaryFiltersMenuPos, true);
    };
  }, [summaryFiltersDropdownOpen, updateSummaryFiltersMenuPos]);
  const [summaryFilterScholarship, setSummaryFilterScholarship] = useState('all');
  const [summaryFilterServer, setSummaryFilterServer] = useState('all');
  const [summaryFilterAssignment, setSummaryFilterAssignment] = useState('all');
  const [summaryFilterBaptism, setSummaryFilterBaptism] = useState('all');
  /** Por tarjeta/sección del dashboard: all | teens | jovenes */
  const [summaryCampaScopes, setSummaryCampaScopes] = useState({});
  const [summaryTableColumns, setSummaryTableColumns] = useState(() => ({ ...SUMMARY_TABLE_COLUMN_DEFAULTS }));

  /** Al cambiar de evento/tipo, asegurar claves de columnas del resumen acordes al tipo (p. ej. Bautizos vs Campa). */
  useEffect(() => {
    const eventType = currentEvent?.eventType;
    if (!eventType) return;
    const keys = getSummaryTableColumnKeysForEventType(eventType);
    const defaults = getSummaryTableColumnDefaultsForEventType(eventType);
    setSummaryTableColumns((prev) => {
      const next = { ...prev };
      for (const k of keys) {
        if (next[k] === undefined) next[k] = defaults[k] !== false;
      }
      return next;
    });
  }, [currentEvent?.id, currentEvent?.eventType]);
  const [globalRegistryListFilters, setGlobalRegistryListFilters] = useState(() => createEmptyGlobalRegistryListFilters());
  /** Búsqueda de registro de pareja (todas las sedes), formulario nuevo registro / edición */
  const [spouseLinkSearchNew, setSpouseLinkSearchNew] = useState('');
  const [spouseLinkSearchEdit, setSpouseLinkSearchEdit] = useState('');
  const [globalRegistryFiltersDropdownOpen, setGlobalRegistryFiltersDropdownOpen] = useState(false);
  const [globalRegistryMobileMenuOpen, setGlobalRegistryMobileMenuOpen] = useState(false);
  const [globalLocationsDropdownOpen, setGlobalLocationsDropdownOpen] = useState(false);
  const [globalLocationFilters, setGlobalLocationFilters] = useState([]);
  const [transportUiPrefs, setTransportUiPrefs] = useState(() => createEmptyTransportUiPrefs());
  const [pastoresUiPrefs, setPastoresUiPrefs] = useState(() => createEmptyPastoresUiPrefs());
  const [rosterToolsMobileMenuOpen, setRosterToolsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!currentEvent?.id || !visibleLocations.length) return;
    const allowed = new Set(visibleLocations.map((l) => String(l).trim()));
    setGlobalLocationFilters((prev) => {
      const next = prev.filter((loc) => allowed.has(String(loc).trim()));
      return next.length === prev.length ? prev : next;
    });
  }, [currentEvent?.id, visibleLocations]);

  const [filterPaymentMethod, setFilterPaymentMethod] = useState({ efectivo: true, tarjeta: true });
  /** Listas colapsables en registro por sede: activos, lista de espera (becados), cancelados */
  const [rosterSectionExpanded, setRosterSectionExpanded] = useState({
    activos: true,
    waitlist: true,
    cancelled: true,
  });
  const listFiltersPrefsRef = useRef(createEmptyListFiltersPrefsRoot());
  const rosterFiltersContextRef = useRef({ eventId: null, loc: null });
  /** Búsqueda de roster por sede sin `setState` en AppMain (evita re-render masivo al escribir). */
  const rosterLocationSearchRef = useRef('');
  const listFiltersPrefsHydratedUidRef = useRef('');
  const listFiltersFirestorePersistTimerRef = useRef(null);
  const listFiltersFirestorePersistDisabledRef = useRef(false);
  const legacyLocalFiltersMigratedRef = useRef(false);
  const [paymentModal, setPaymentModal] = useState({
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
    paymentService: '',
    cardReference: '',
    abonoNote: '',
  });
  const [newRegGeneralComment, setNewRegGeneralComment] = useState('');
  const newRegGeneralCommentRef = useRef(null);

  useEffect(() => {
    if (newRegGeneralCommentRef.current) {
      newRegGeneralCommentRef.current.style.height = 'auto';
      newRegGeneralCommentRef.current.style.height = `${newRegGeneralCommentRef.current.scrollHeight}px`;
    }
  }, [newRegGeneralComment]);

  const [registrationCommentModal, setRegistrationCommentModal] = useState({
    isOpen: false,
    personId: null,
    personName: '',
    loc: '',
    draft: '',
  });
  const [abonoNoteEditModal, setAbonoNoteEditModal] = useState({
    isOpen: false,
    personId: null,
    loc: '',
    paymentIndex: null,
    draft: '',
  });
  const [paymentMethodEditModal, setPaymentMethodEditModal] = useState({
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
  const [sendToWaitlist, setSendToWaitlist] = useState(false);

  const persistNewRegDraftOnly = useCallback(
    (draftEntry, profileSearchQuery) => {
      if (!currentUser?.id || !currentEvent?.id) return;
      persistRegistrationFormDraft(currentUser.id, currentEvent.id, {
        entry: draftEntry,
        newRegProfileSearch: profileSearchQuery ?? '',
        spouseLinkSearchNew,
        sendToWaitlist,
      });
    },
    [currentUser?.id, currentEvent?.id, spouseLinkSearchNew, sendToWaitlist]
  );

  const flushNewRegDraftToParent = useCallback((draftEntry, profileSearchQuery) => {
    if (draftEntry && typeof draftEntry === 'object') setNewEntry(draftEntry);
    if (typeof profileSearchQuery === 'string') setNewRegProfileSearch(profileSearchQuery);
  }, []);

  const buildNewRegCompanionCollisionHintForDraft = useCallback(
    (name, birthDate) =>
      buildNewEntryCompanionCollisionHint(name, birthDate, allParticipants, currentEvent?.id, {
        canonicalizeVnpPersonId,
      }),
    [allParticipants, currentEvent?.id]
  );

  const [openPreferredServeLoc, setOpenPreferredServeLoc] = useState(null);
  const [editPreferredServeDropdownOpen, setEditPreferredServeDropdownOpen] = useState(false);
  const [openServedAreasLoc, setOpenServedAreasLoc] = useState(null);
  const [editServedAreasDropdownOpen, setEditServedAreasDropdownOpen] = useState(false);
  const [whatsAppModal, setWhatsAppModal] = useState({
    isOpen: false,
    personId: null,
    personName: '',
    eventName: '',
    loc: '',
    phone: '',
    message: '',
    error: '',
    pendingMergeMarkKeys: null,
    whatsAppQueuedMessageSnapshot: null
  });
  const whatsAppAutoSendCancelRef = useRef(false);
  const waBulkPopoutRef = useRef(null);
  const [whatsAppAutoSendJob, setWhatsAppAutoSendJob] = useState({
    running: false,
    current: 0,
    total: 0,
    locLabel: '',
  });
  const [expandedRows, setExpandedRows] = useState(new Set());
  /** Detalle de fila del roster: se rellena con getDoc al expandir y se fusiona con el listener en vivo. */
  const [participantExpandCache, setParticipantExpandCache] = useState({});
  const [expandedDupGroups, setExpandedDupGroups] = useState(new Set());
  const [expandedDupPersons, setExpandedDupPersons] = useState(new Set());
  const [summaryRosterModal, setSummaryRosterModal] = useState({ isOpen: false, type: 'regular' });
  /** Tarjeta del dashboard cuyo detalle está expandido (compacto por defecto). */
  const [summaryDashExpandKey, setSummaryDashExpandKey] = useState(null);
  const toggleSummaryDashCard = useCallback((key) => {
    setSummaryDashExpandKey((prev) => (prev === key ? null : key));
  }, []);
  /** Modal lista de participantes al hacer clic en una celda de «Visualización de Datos Generales». */
  const [summaryCellDetailModal, setSummaryCellDetailModal] = useState({
    isOpen: false,
    scope: 'location',
    locationLabel: '',
    metric: 'count',
  });
  const dashboardConfigLogInitRef = useRef(false);
  const dashboardConfigLogPrevRef = useRef('');
  const dashboardConfigLogEventIdRef = useRef(null);
  /** Solo UI: mostrar/ocultar la contraseña de respaldo que solo ve el SuperUsuario al editar a otro usuario. */
  const [editingUserPlainPwdVisible, setEditingUserPlainPwdVisible] = useState(false);
  /** Fila expandida en la tabla de usuarios: resumen eventos/sedes (lectura Firebase al expandir). */
  const [userAccessScopeOpenId, setUserAccessScopeOpenId] = useState(null);
  const [editingUser, setEditingUser] = useState({
    isOpen: false,
    id: null,
    username: '',
    /** Correo de acceso en Firebase (puede diferir del nombre de usuario). */
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
    canMarkPersonsOfInterest: false,
    maxConcurrentSessions: '1',
    canSendWhatsAppQuickAction: false,
    canMarkResponsivaLocalQuickAction: true,
    canSendResponsivaDigitalQuickAction: false,
    canCancelRegistrations: false,
  });
  useEffect(() => {
    if (editingUser.isOpen) setEditingUserPlainPwdVisible(false);
  }, [editingUser.isOpen, editingUser.id]);
  const [restoreModal, setRestoreModal] = useState({ isOpen: false, log: null, type: 'single' });
  const [deleteUserConfirmModal, setDeleteUserConfirmModal] = useState({ isOpen: false, id: null, username: '' });
  const [revokeSessionsConfirmModal, setRevokeSessionsConfirmModal] = useState({
    isOpen: false,
    id: null,
    username: '',
  });
  const [anonymousAuthPanel, setAnonymousAuthPanel] = useState({
    loading: false,
    busy: false,
    purgeAllBusy: false,
    deletingUid: null,
    users: [],
    lastPurgeResult: null,
  });
  /** Confirmación in-app: archivar / baja / eliminar donación (sustituye window.confirm). */
  const REGISTRY_CONFIRM_BAUTIZOS_EMPTY = {};
  const [registryConfirmModal, setRegistryConfirmModal] = useState({
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
  const [registryConfirmBusy, setRegistryConfirmBusy] = useState(false);
  const [cashCutScheduleModal, setCashCutScheduleModal] = useState({ isOpen: false });
  /** Lista de movimientos al abrir una tarjeta de abonos por servicio (corte de caja). */
  const [cashCutServiceDetailModal, setCashCutServiceDetailModal] = useState(null);
  /** SuperUsuario: editar fecha/hora de devolución ya registrada (corte de caja). */
  const [refundDateEditModal, setRefundDateEditModal] = useState({
    isOpen: false,
    personId: '',
    personName: '',
    datetimeLocal: '',
    busy: false,
  });
  /** Por sede: { Primero: { start, end }, ... } */
  const [cashCutScheduleForm, setCashCutScheduleForm] = useState({});
  const [serveAreaOptionsModal, setServeAreaOptionsModal] = useState({ isOpen: false });
  const [serveAreaOptionsForm, setServeAreaOptionsForm] = useState([...DEFAULT_SERVE_AREA_OPTIONS]);
  const [allergyOptionsModal, setAllergyOptionsModal] = useState({ isOpen: false });
  const [allergyOptionsForm, setAllergyOptionsForm] = useState([...DEFAULT_ALLERGY_OPTIONS]);
  const [donations, setDonations] = useState([]);
  const [donationModal, setDonationModal] = useState({ isOpen: false, amount: '', donorName: '', location: '' });
  const [donationsListOpen, setDonationsListOpen] = useState(false);
  const [publicQrModalOpen, setPublicQrModalOpen] = useState(false);
  const [responsivaDigitalTextModalOpen, setResponsivaDigitalTextModalOpen] = useState(false);
  const [publicQrOptional, setPublicQrOptional] = useState(() => defaultOptionalVisibility());
  const [publicQrDataUrl, setPublicQrDataUrl] = useState('');
  const [publicQrUrl, setPublicQrUrl] = useState('');
  const [publicQrBusy, setPublicQrBusy] = useState(false);
  const [cupoSedeOpen, setCupoSedeOpen] = useState(false);
  const [cashCutMode, setCashCutMode] = useState('sunday');
  const [expandedCut, setExpandedCut] = useState(null);
  const [cashCutSelected, setCashCutSelected] = useState('all');
  const [cashCutTotalsView, setCashCutTotalsView] = useState(null);
  const [cashCutGross, setCashCutGross] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [expenseForm, setExpenseForm] = useState({ name: '', quantity: 1, unitPrice: '' });
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expensePartialModal, setExpensePartialModal] = useState({ isOpen: false, expenseId: null, amount: '' });
  const [expenseEditModal, setExpenseEditModal] = useState({ isOpen: false, id: null, name: '', quantity: 1, unitPrice: '' });
  const [superDateEditModal, setSuperDateEditModal] = useState({
    isOpen: false,
    mode: '',
    personId: null,
    loc: '',
    paymentIndex: null,
    paymentId: null,
    datetimeLocal: '',
  });
  const [expenseFiltersDropdownOpen, setExpenseFiltersDropdownOpen] = useState(false);
  const [expenseMobileMenuOpen, setExpenseMobileMenuOpen] = useState(false);
  const [expenseFilters, setExpenseFilters] = useState({
    paid: false,
    pending: false,
    counted: false,
    uncounted: false,
  });
  const [expenseGross, setExpenseGross] = useState(true);
  const [campaRealCostBreakdownForm, setCampaRealCostBreakdownForm] = useState({ concept: '', quantity: '1', unitCost: '' });
  const [campaRealCostManualDivisorStr, setCampaRealCostManualDivisorStr] = useState('');
  const [scholarshipRealCostDraft, setScholarshipRealCostDraft] = useState('');

  useEffect(() => {
    if (!currentEvent?.id) return;
    const v = currentEvent.campaRealCostManualDivisor;
    setCampaRealCostManualDivisorStr(v != null && v !== '' ? String(v) : '');
  }, [currentEvent?.id, currentEvent?.campaRealCostManualDivisor]);

  useEffect(() => {
    if (!currentEvent?.id) return;
    const v = currentEvent.scholarshipRealCostBase;
    if (v != null && v !== '') {
      setScholarshipRealCostDraft(String(v));
      return;
    }
    setScholarshipRealCostDraft(String(Number(currentEvent.realCost || 0)));
  }, [currentEvent?.id, currentEvent?.scholarshipRealCostBase, currentEvent?.realCost]);

  // Security Access Definitions
  const hasFinancialAccess = rbacHasFinancialAccess(currentUser);
  const canSeeMoney = showMoney && hasFinancialAccess;
  const _canViewHiddenDonations = currentUser
    ? (['Administrador', 'SuperUsuario'].includes(currentUser.role) ? true : !!currentUser.canViewHiddenDonations)
    : false;
  const formatMoney = useCallback(
    (amount) => (
      canSeeMoney
        ? `$${Number(amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : '$***'
    ),
    [canSeeMoney]
  );

  const ambosServeOptionLabelsEdit = useMemo(
    () => buildAmbosServeInSegmentOptionLabels(editRegistryModal.data || {}, currentPricing, formatMoney),
    [editRegistryModal.data, currentPricing, formatMoney]
  );
  const ambosServeOptionLabelsNew = useMemo(
    () => buildAmbosServeInSegmentOptionLabels(newEntry, currentPricing, formatMoney),
    [newEntry, currentPricing, formatMoney]
  );

  const computeScholarshipAutoExpenseRows = useCallback(
    (eventId) => {
      if (!eventId) return [];
      let approvedCondoned = 0;
      let pendingCondoned = 0;
      for (const p of allParticipants) {
        if (p.eventId !== eventId || !participantIsActiveInEvent(p) || !isSiValue(p.isScholarship)) continue;
        const condoned = getScholarshipCondonedAmount(p);
        if (participantIsActiveInRoster(p)) approvedCondoned += condoned;
        else if (participantIsWaitlistRow(p)) pendingCondoned += condoned;
      }
      return [
        {
          id: `sch-auto-approved-${eventId}`,
          eventId,
          name: 'Costo total de beca (aprobados)',
          quantity: 1,
          unitPrice: approvedCondoned,
          totalPrice: approvedCondoned,
          paidAmount: approvedCondoned,
          paid: true,
          countInTotals: true,
          createdAt: '9999-12-31T00:00:00.000Z',
          _autoScholarshipExpense: true,
        },
        {
          id: `sch-auto-pending-${eventId}`,
          eventId,
          name: 'Costo total de beca solicitada pendiente',
          quantity: 1,
          unitPrice: pendingCondoned,
          totalPrice: pendingCondoned,
          paidAmount: 0,
          paid: false,
          countInTotals: false,
          createdAt: '9999-12-31T00:00:00.001Z',
          _autoScholarshipExpense: true,
        },
      ];
    },
    [allParticipants, getScholarshipCondonedAmount]
  );

  const computeManualCostCreditExpenseRows = useCallback(
    (eventId) => {
      if (!eventId || currentEvent?.id !== eventId || currentEvent?.eventType !== 'Campa') return [];
      const rows = [];
      for (const p of allParticipants) {
        if (p.eventId !== eventId) continue;
        if (participantIsArchived(p)) {
          const snapAmt = Number(p.archivedManualCreditAmount) || 0;
          if (snapAmt <= 0.005) continue;
          const listRef = Number(p.archivedManualCreditListRef) || 0;
          rows.push({
            id: `manual-credit-${p.id}-${eventId}`,
            eventId,
            name: `Saldo a favor — ${p.name || 'Participante'} (costo lista ${formatMoney(listRef)})`,
            quantity: 1,
            unitPrice: snapAmt,
            totalPrice: snapAmt,
            paidAmount: 0,
            paid: false,
            countInTotals: true,
            createdAt: '9999-12-31T00:00:00.002Z',
            _manualCostCreditExpense: true,
          });
          continue;
        }
        if (!participantIsActiveInEvent(p) || participantIsCancelled(p)) continue;
        if (p.registeredCostManual !== true) continue;
        const liq = Number(getLiquidationTarget(p)) || 0;
        const paidG = parseFloat(p.paid || 0) || 0;
        const excess = Math.max(0, paidG - liq);
        if (excess <= 0.005) continue;
        const listRef = Number(resolveRegisteredCost(p, currentPricing)) || liq;
        rows.push({
          id: `manual-credit-${p.id}-${eventId}`,
          eventId,
          name: `Saldo a favor — ${p.name || 'Participante'} (costo lista ${formatMoney(listRef)})`,
          quantity: 1,
          unitPrice: excess,
          totalPrice: excess,
          paidAmount: 0,
          paid: false,
          countInTotals: true,
          createdAt: '9999-12-31T00:00:00.002Z',
          _manualCostCreditExpense: true,
        });
      }
      return rows;
    },
    [allParticipants, currentEvent?.id, currentEvent?.eventType, currentPricing, getLiquidationTarget, resolveRegisteredCost, formatMoney]
  );

  const getExpenseForActions = useCallback(
    (expenseId) => {
      const evId = currentEvent?.id;
      if (!expenseId || !evId) return null;
      const fromFs = expenses.find((e) => e.id === expenseId && String(e.eventId) === String(evId));
      if (fromFs) return fromFs;
      if (!isDerivedAutoExpenseIdForEvent(expenseId, evId)) return null;
      const sch = computeScholarshipAutoExpenseRows(evId);
      const mc = computeManualCostCreditExpenseRows(evId);
      return [...sch, ...mc].find((r) => r.id === expenseId) || null;
    },
    [currentEvent?.id, expenses, computeScholarshipAutoExpenseRows, computeManualCostCreditExpenseRows]
  );

  const getCardCommissionRate = useCallback(() => {
    const draftNum = parseFloat(String(cardCommissionPctDraft).replace(',', '.'));
    if (Number.isFinite(draftNum) && draftNum >= 0 && draftNum <= 100) {
      return draftNum / 100;
    }
    const raw = globalConfig?.cardCommissionRate ?? 0.04; // 4% por defecto
    const num = Number(raw) || 0;
    // Permite guardar 4 o 0.04 (porcentaje o fracción decimal)
    return num > 1 ? num / 100 : num;
  }, [cardCommissionPctDraft, globalConfig?.cardCommissionRate]);

  const computeNetAmountByMethod = useCallback(
    (grossAmount, method) => {
      const gross = Number(grossAmount || 0) || 0;
      const normalizedMethod = method === 'Tarjeta' ? 'Tarjeta' : 'Efectivo';
      if (normalizedMethod !== 'Tarjeta') return gross;
      const commissionRate = getCardCommissionRate();
      return gross - gross * commissionRate;
    },
    [getCardCommissionRate]
  );

  /** Recalcula paid / paidNet a partir del historial (filas financieras, no comentarios). */
  const sumTotalsFromPaymentHistory = useCallback(
    (person, history) => {
      const commissionRate = getCardCommissionRate();
      let gross = 0;
      let net = 0;
      for (const h of history || []) {
        if (!h || h.kind === 'comment' || h.kind === REFUND_DISBURSEMENT_PAYMENT_KIND) continue;
        const amt = Number(h.amount) || 0;
        gross += amt;
        const method = h.method || (person.paymentMethod === 'Tarjeta' ? 'Tarjeta' : 'Efectivo');
        const rowNet = computeNetAmountByMethod(amt, method);
        net += rowNet;
      }
      return { paid: gross, paidNet: net };
    },
    [computeNetAmountByMethod]
  );

  const parseHHMM = (hhmm) => {
    if (!hhmm || typeof hhmm !== 'string') return null;
    const [hh, mm] = hhmm.split(':').map(n => parseInt(n, 10));
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
    return hh * 60 + mm;
  };

  const resolveRegistrationLocationForAutoService = useCallback(() => {
    if (!currentEvent?.locations?.length) return null;
    if (visibleLocations.includes(activeTab)) return activeTab;
    return currentEvent.locations[0];
  }, [currentEvent, activeTab, visibleLocations]);

  const getAutoPaymentService = useCallback(
    (now = new Date(), locationName) => {
      const loc = locationName ?? resolveRegistrationLocationForAutoService();
      return resolveCashCutServiceForTimestamp(now, loc, {
        event: currentEvent,
        globalSlots: globalConfig?.serviceSlots || CASH_CUT_DEFAULT_SERVICE_SLOTS,
        globalScheduleByLocation: globalConfig?.cashCutScheduleByLocation,
      });
    },
    [currentEvent, globalConfig?.serviceSlots, globalConfig?.cashCutScheduleByLocation, resolveRegistrationLocationForAutoService]
  );

  const resolveCashCutRefundServiceLabel = useCallback(
    (person, ts, loc) => {
      const sede = String(loc || resolveCancelledRefundSede(person) || '').trim();
      return getAutoPaymentService(new Date(ts), sede || undefined);
    },
    [getAutoPaymentService]
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (modalEscapeCloseRef.current && modalEscapeCloseRef.current()) {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  useEffect(() => {
    const onFind = (e) => {
      if (!((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F'))) return;
      let targetId = null;
      if (systemView === 'logs' && selectedEventId == null) {
        targetId = ACTIVITY_LOG_SEARCH_FIELD_ID;
      } else if (systemView === 'users') {
        targetId = USERS_PANEL_SEARCH_FIELD_ID;
      } else if (systemView === 'events' && selectedEventId) {
        if (activeTab === 'RegistroGlobal') {
          targetId = globalRegistrySearchFieldId(selectedEventId);
        } else if (isLocationRosterTab(activeTab)) {
          targetId = rosterSearchFieldId(activeTab);
        } else if (activeTab === 'ExpenseList') {
          targetId = EXPENSE_LIST_SEARCH_FIELD_ID;
        }
      }
      if (!targetId) return;
      const el = document.getElementById(targetId);
      if (!el || typeof el.focus !== 'function') return;
      e.preventDefault();
      el.focus();
      if (typeof el.select === 'function') el.select();
    };
    window.addEventListener('keydown', onFind, true);
    return () => window.removeEventListener('keydown', onFind, true);
  }, [systemView, selectedEventId, activeTab]);

  const pastProfilesForImport = useMemo(() => {
    if (!currentEvent) return [];
    const fromCurrentArchived = allParticipants.filter(
      (p) => participantIsArchived(p) && p.eventId === currentEvent.id
    );
    const fromCurrentRoster = allParticipants.filter(
      (p) => participantBlocksDuplicateRegistration(p) && p.eventId === currentEvent.id
    );
    const pool = [...importProfileParticipants, ...fromCurrentArchived, ...fromCurrentRoster];
    pool.sort((a, b) => {
      const aArch = participantIsArchived(a) ? 1 : 0;
      const bArch = participantIsArchived(b) ? 1 : 0;
      if (aArch !== bArch) return aArch - bArch;
      const aHere = a.eventId === currentEvent.id ? 0 : 1;
      const bHere = b.eventId === currentEvent.id ? 0 : 1;
      return aHere - bHere;
    });
    return pool;
  }, [currentEvent, importProfileParticipants, allParticipants]);

  const buildProfileImportMatchesForModal = useCallback(
    (query) => {
      if (!currentEvent) return [];
      const q = String(query || '').trim().toLowerCase();
      const qDigits = digitsOnlyPhone(query);
      if (q.length < 2 && qDigits.length < 4) return [];

      const activeInCurrentEvent = allParticipants.filter(
        (p) => p.eventId === currentEvent.id && participantIsActiveInEvent(p)
      );

      const seen = new Set();
      const candidates = [];
      for (const p of pastProfilesForImport) {
        const d = digitsOnlyPhone(p.phone);
        if (
          d.length >= 10 &&
          activeInCurrentEvent.some(
            (evp) => digitsOnlyPhone(evp.phone) === d && !isPhoneShareFamilyAllowed(p.name, p.age, evp.name, evp.age)
          )
        ) {
          continue;
        }

        const nameMatch = q.length >= 2 && (p.name || '').toLowerCase().includes(q);
        const aliasMatch = q.length >= 2 && String(p.alias || '').toLowerCase().includes(q);
        const phoneMatch = qDigits.length >= 4 && d.includes(qDigits);
        const idMatch = q.length >= 2 && (p.vnpPersonId || '').toLowerCase().includes(q);
        if (!nameMatch && !aliasMatch && !phoneMatch && !idMatch) continue;

        const dedupeKey = (p.vnpPersonId && String(p.vnpPersonId)) || d || `${p.id}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        candidates.push(p);
        if (candidates.length >= 15) break;
      }
      return candidates;
    },
    [currentEvent, pastProfilesForImport, allParticipants]
  );

  const applyImportedProfile = useCallback(
    (src, loc) => {
      const poiMsg = registrationPersonOfInterestMessage(src, personOfInterestVnpSet, personOfInterestRegistrationHelpers);
      if (poiMsg) {
        showToast(poiMsg);
        return;
      }
      const customFromSrc =
        src.customData && typeof src.customData === 'object' ? { ...src.customData } : {};
      /**
       * Contacto, médicos, familia (cónyuge/hijos) y datos de contexto desde el perfil origen.
       * Aplica a cualquier tipo de evento; el formulario muestra u oculta secciones según el tipo.
       */
      const base = {
        ...EMPTY_ENTRY,
        name: src.name || '',
        phone: src.phone || '',
        birthDate: src.birthDate || '',
        age: src.birthDate ? calculateAgeFromBirthDate(src.birthDate) : (src.age != null && src.age !== '' ? String(src.age) : ''),
        gender: src.gender || '',
        responsivaStatus: src.responsivaStatus || '',
        vnpPersonId: canonicalizeVnpPersonId(src.vnpPersonId || '') || src.vnpPersonId || '',
        paymentMethod: 'Efectivo',
        paymentService: getAutoPaymentService(new Date()),
        cardReference: '',
        paid: '',
        paidNet: '',
        paymentHistory: [],
        isScholarship: 'No',
        scholarshipType: 'total',
        scholarshipPartialAmount: '',
        customData: customFromSrc,
        travelFrom: loc,
        travelTo: loc,
        alias: src.alias || '',
        bloodType: src.bloodType || BLOOD_TYPE_UNSPECIFIED,
        emergencyContact: src.emergencyContact || '',
        emergencyPhone: src.emergencyPhone || '',
        emergencyRelationship: src.emergencyRelationship || '',
        canSwim: src.canSwim || 'No',
        attendanceSpecialType: normalizeAttendanceSpecial(src),
        hasAllergy: src.hasAllergy || 'No',
        allergyCategory: src.allergyCategory || '',
        allergyDetails: src.allergyDetails || '',
        hasDisease: src.hasDisease || 'No',
        diseaseDetails: src.diseaseDetails || '',
        diseaseMedication: src.diseaseMedication || '',
        hasDisability: src.hasDisability || 'No',
        disabilityDetails: src.disabilityDetails || '',
        transportType: src.transportType || 'Camión',
        llegaEnCarro: resolveLlegaEnCarro(src),
        regresaEnCarro: resolveRegresaEnCarro(src),
        carrosLlegada: normalizeArrivalCarCount(src.carrosLlegada),
        isMarried: src.isMarried || 'No',
        spouseName: src.spouseName || '',
        spouseParticipantId: '',
        spousePhone: src.spousePhone || '',
        goesWithChildren: src.goesWithChildren || 'No',
        childrenCount: src.childrenCount ?? '',
        isServer: src.isServer || 'No',
        serverAssignment: src.serverAssignment || '',
        campAssignment: src.campAssignment || '',
        servedOtherCampa: src.servedOtherCampa || 'No',
        servedAreas: src.servedAreas || '',
        preferredServeArea: src.preferredServeArea || '',
        servesInCongress: src.servesInCongress || 'No',
        congressServeArea: src.congressServeArea || '',
        willBeBaptized: isSiValue(src.willBeBaptized) ? SI : 'No',
        baptismSegment: src.baptismSegment || '',
        ambosServeInSegment: ['Teens', 'Jóvenes'].includes(String(src.ambosServeInSegment || '').trim())
          ? String(src.ambosServeInSegment || '').trim()
          : '',
        wantsBautizosFood: src.wantsBautizosFood || 'No',
        wantsBautizosTransport: src.wantsBautizosTransport || 'No',
        bautizosAttendanceType: bzEvtNormalizeAttendanceType(src.bautizosAttendanceType),
        bautizosCompanions: Array.isArray(src.bautizosCompanions) ? src.bautizosCompanions : [],
        baptismShirtSize: normalizeBaptismShirtSize(src.baptismShirtSize),
        preloadedFromPreviousEvents: true,
        preloadedFromEventIds: Array.isArray(src._sourceEventIds) && src._sourceEventIds.length
          ? src._sourceEventIds.filter(Boolean)
          : (src.eventId ? [src.eventId] : []),
        preloadedFromEventNames: (() => {
          const names = Array.isArray(src._sourceEventNames) && src._sourceEventNames.length
            ? src._sourceEventNames
            : (src.eventId ? [resolveEventName(src.eventId)] : []);
          return names.filter((n) => String(n || '').trim());
        })(),
      };
      setNewEntry((prev) => mergeNewRegistrationWithImport(base, prev));
      setNewRegProfileSearch('');
      if (newRegModalOpen) setNewRegDraftResetToken((t) => t + 1);
      showToast('Datos importados: se fusionaron con el formulario (lo que ya habías editado tiene prioridad). Revisa abono y campos.');
    },
    [getAutoPaymentService, showToast, currentEvent?.eventType, personOfInterestVnpSet, personOfInterestRegistrationHelpers, newRegModalOpen]
  );

  const handleClearRegistrationForm = useCallback(() => {
    setNewEntry({
      ...EMPTY_ENTRY,
      ...getDefaultTransportFieldsForEventType(currentEvent?.eventType),
      
      paymentMethod: 'Efectivo',
      paymentService: getAutoPaymentService(new Date()),
      cardReference: ''
    });
    setNewRegProfileSearch('');
    setSpouseLinkSearchNew('');
    setSendToWaitlist(false);
    setNewRegGeneralComment('');
    setNewRegDraftCarMeta({});
    if (currentUser?.id && currentEvent?.id) clearRegistrationFormDraft(currentUser.id, currentEvent.id);
    if (newRegModalOpen) setNewRegDraftResetToken((t) => t + 1);
    showToast('Formulario limpiado.');
  }, [getAutoPaymentService, showToast, currentEvent?.eventType, currentUser?.id, currentEvent?.id, newRegModalOpen]);

  const resetRegistrationFormAfterSuccess = useCallback(
    (loc) => {
      if (currentUser?.id && currentEvent?.id) clearRegistrationFormDraft(currentUser.id, currentEvent.id);
      setNewRegModalOpen(false);
      setNewEntry({
        ...EMPTY_ENTRY,
        ...getDefaultTransportFieldsForEventType(currentEvent?.eventType),
        
        paymentMethod: 'Efectivo',
        paymentService: getAutoPaymentService(new Date(), loc),
        cardReference: '',
      });
      setNewRegProfileSearch('');
      setNewRegDraftCarMeta({});
      setNewRegGeneralComment('');
      setSpouseLinkSearchNew('');
      setSendToWaitlist(false);
    },
    [currentUser?.id, currentEvent?.eventType, currentEvent?.id, getAutoPaymentService]
  );

  const handleLoadLastSuccessfulRegistrationForm = useCallback(() => {
    if (!currentUser?.id || !currentEvent?.id) {
      showToast('No hay usuario o evento activo para cargar el respaldo.');
      return;
    }
    try {
      const raw = window.localStorage.getItem(lastSuccessfulRegFormStorageKey(currentUser.id, currentEvent.id));
      if (!raw) {
        showToast('No hay un formulario previo guardado en este dispositivo para este evento.');
        return;
      }
      const parsed = JSON.parse(raw);
      const entry = parsed?.entry;
      if (!entry || typeof entry !== 'object') {
        showToast('El respaldo del formulario no es válido.');
        return;
      }
      const merged = stripEntrySnapshotForNewRegistrationDraft(entry);
      setNewEntry((prev) => mergeNewRegistrationWithImport(merged, prev));
      setNewRegProfileSearch('');
      setNewRegGeneralComment(
        typeof parsed.newRegGeneralComment === 'string' ? parsed.newRegGeneralComment : ''
      );
      setNewRegDraftCarMeta(
        parsed.newRegDraftCarMeta &&
          typeof parsed.newRegDraftCarMeta === 'object' &&
          !Array.isArray(parsed.newRegDraftCarMeta)
          ? parsed.newRegDraftCarMeta
          : {}
      );
      showToast('Último formulario enviado cargado. Revisa teléfono, datos y abono antes de guardar.');
    } catch {
      showToast('No se pudo leer el último formulario.');
    }
  }, [currentUser?.id, currentEvent?.id, showToast]);

  const hasEventAccess = useCallback((eventId) => {
    if (!currentUser) return false;
    if (['Administrador', 'SuperUsuario'].includes(currentUser.role)) return true;
    const allowedIds = getUserAllowedEventIds(currentUser);
    if (!allowedIds.length) return true;
    return allowedIds.includes(eventId);
  }, [currentUser, getUserAllowedEventIds]);

  const hasLocationAccess = useCallback(
    (loc, eventIdForNavigation) => {
      if (!currentUser) return false;
      /** Admin/super antes que `currentEvent`: al entrar a un evento desde el hub `currentEvent` aún puede ser null. */
      if (['Administrador', 'SuperUsuario'].includes(currentUser.role)) return true;
      const ev =
        eventIdForNavigation != null && eventIdForNavigation !== ''
          ? events.find((e) => String(e.id) === String(eventIdForNavigation))
          : currentEvent;
      if (!ev) return false;
      const allowedLocs = getUserAllowedLocationNamesForEvent(currentUser, ev.id, ev.locations || []);
      if (!allowedLocs.length) return false;
      return allowedLocs.includes(loc);
    },
    [currentUser, currentEvent, events]
  );

  /** Sedes visibles para un evento concreto (p. ej. al sincronizar la URL antes de que actualice currentEvent). */
  const resolveVisibleLocationsForEvent = useCallback(
    (event) => {
      if (!event || !currentUser) return [];
      return getUserAllowedLocationNamesForEvent(currentUser, event.id, event.locations || []);
    },
    [currentUser]
  );
  useEffect(() => {
    resolveVisibleLocsRef.current = resolveVisibleLocationsForEvent;
  }, [resolveVisibleLocationsForEvent]);

  const {
    navHistory,
    setNavHistory,
    forwardNavStack,
    setForwardNavStack,
    forwardNavStackRef,
    navHistoryRef,
    programmaticNavTargetRef,
    eventHubBackGuardTokenRef,
    goTo,
    goBack,
    goForward,
    applyNavSnapshot,
    applyNavSnapshotRef,
    rearmEventHubBackGuard,
    rearmEventHubBackGuardRef,
    isEventSelectionHubSnapshot,
  } = useAppNavigation({
    navigate,
    systemView,
    setSystemView,
    selectedEventId,
    setSelectedEventId,
    activeTab,
    setActiveTab,
    currentUserRef,
    events,
    hasEventAccess,
    hasLocationAccess,
    isPanelNavAllowedForTargetEvent,
    hasAdminRights,
    showToast,
    setIsMobileMenuOpen,
    setShowViewSettings,
    resolveVisibleLocationsForEvent,
    navSnapshotRef,
  });

  const isEventSelectionHub =
    !!currentUser &&
    systemView === 'events' &&
    !selectedEventId &&
    isEventSelectionPath(location.pathname);

  useEffect(() => {
    if (!isEventSelectionHub) return;
    rearmEventHubBackGuard();
  }, [isEventSelectionHub, rearmEventHubBackGuard]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const reconcilePopstate = () => {
      historyNavigationInFlightRef.current = true;
      const pathname = window.location.pathname;
      const childSnap = { ...navSnapshotRef.current };

      if (
        currentUserRef.current &&
        isEventSelectionHubSnapshot(childSnap) &&
        isEventSelectionPath(pathname)
      ) {
        rearmEventHubBackGuardRef.current();
        setLogoutConfirmOnBackOpen(true);
        return;
      }

      const stack = forwardNavStackRef.current;
      const top = stack.length ? stack[stack.length - 1] : null;
      if (top) {
        try {
          const childPath = buildPathFromNavSnapshot(top.child, eventsRef.current, (ev) =>
            resolveVisibleLocsRef.current(ev)
          );
          if (pathsEqualForRouter(pathname, childPath)) {
            setForwardNavStack((f) => f.slice(0, -1));
            setNavHistory((h) => [...h, top.parent]);
            applyNavSnapshotRef.current(top.child);
            return;
          }
        } catch {
          /* tratar como retroceso */
        }
      }

      const prev = navHistoryRef.current;
      if (!prev.length) {
        try {
          const parsed = parseAppPathname(pathname);
          if (parsed?.kind === 'event' && eventsRef.current?.length) {
            const ev = findEventByUrlSlug(eventsRef.current, parsed.eventSlug);
            if (ev) {
              const locs = resolveVisibleLocsRef.current(ev);
              const tabFromUrl = routeSegmentToActiveTab(
                parsed.routeSegment,
                parsed.locationSlug,
                locs,
                ev.eventType
              );
              programmaticNavTargetRef.current = pathname;
              setSystemView('events');
              setSelectedEventId(ev.id);
              setActiveTab(tabFromUrl);
              setShowViewSettings(false);
              setIsMobileMenuOpen(false);
              return;
            }
          }
          if (parsed?.kind === 'eventos') {
            programmaticNavTargetRef.current = pathname;
            setSystemView('events');
            setSelectedEventId(null);
            setActiveTab('Summary');
            setShowViewSettings(false);
            setIsMobileMenuOpen(false);
            return;
          }
          if (parsed?.kind === 'usuarios') {
            programmaticNavTargetRef.current = pathname;
            setSystemView('users');
            setSelectedEventId(null);
            setActiveTab('Summary');
            setShowViewSettings(false);
            setIsMobileMenuOpen(false);
            return;
          }
          if (parsed?.kind === 'logs') {
            programmaticNavTargetRef.current = pathname;
            setSystemView('logs');
            setSelectedEventId(null);
            setActiveTab('Summary');
            setShowViewSettings(false);
            setIsMobileMenuOpen(false);
            return;
          }
          if (parsed?.kind === 'archivo') {
            programmaticNavTargetRef.current = pathname;
            setSystemView('archive');
            setSelectedEventId(null);
            setActiveTab('Summary');
            setShowViewSettings(false);
            setIsMobileMenuOpen(false);
            return;
          }
          const restorePath = buildPathFromNavSnapshot(childSnap, eventsRef.current, (ev) =>
            resolveVisibleLocsRef.current(ev)
          );
          if (!pathsEqualForRouter(pathname, restorePath)) {
            navigateRef.current(restorePath, { replace: true });
          }
        } catch {
          /* permanecer en la vista actual */
        }
        return;
      }

      const parentSnap = prev[prev.length - 1];
      setForwardNavStack((f) => [...f, { parent: parentSnap, child: childSnap }]);
      setNavHistory((h) => h.slice(0, -1));
      applyNavSnapshotRef.current(parentSnap);
    };

    const finishHistoryNavigation = () => {
      queueMicrotask(() => {
        historyNavigationInFlightRef.current = false;
      });
    };

    const runReconcilePopstate = () => {
      try {
        reconcilePopstate();
      } finally {
        finishHistoryNavigation();
      }
    };

    const wNav = window.navigation;
    if (wNav && typeof wNav.addEventListener === 'function') {
      const onNav = (e) => {
        if (e.navigationType !== 'traverse') return;
        if (e.destination && e.destination.sameDocument === false) return;
        const d = Number(e.delta);
        if (d === -1 || d === 1) {
          requestAnimationFrame(runReconcilePopstate);
        }
      };
      wNav.addEventListener('navigate', onNav);
      const onPop = () => {
        runReconcilePopstate();
      };
      window.addEventListener('popstate', onPop);
      return () => {
        wNav.removeEventListener('navigate', onNav);
        window.removeEventListener('popstate', onPop);
      };
    }

    const onPop = () => {
      runReconcilePopstate();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [isEventSelectionHubSnapshot]);

  useEffect(() => {
    if (currentUser && location.pathname === '/login') {
      navigate('/eventos', { replace: true });
    }
  }, [currentUser, location.pathname, navigate]);

  useEffect(() => {
    if (currentUser && location.pathname === '/') {
      navigate('/eventos', { replace: true });
    }
  }, [currentUser, location.pathname, navigate]);

  useEffect(() => {
    if (!currentUser?.id || !fbUser?.uid || typeof window === 'undefined') return;
    migrateLegacyRouteToUid(fbUser.uid);
    if (routeRestoreDoneRef.current) return;
    routeRestoreDoneRef.current = true;
    const atLanding = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/eventos';
    if (!atLanding) return;
    const saved = readStoredRouteForUid(fbUser.uid);
    if (!saved?.pathname || saved.pathname === location.pathname) return;
    navigate(saved.pathname, { replace: true });
    if (saved.scrollY > 0) {
      setTimeout(() => {
        try { window.scrollTo({ top: saved.scrollY, behavior: 'auto' }); } catch { /* ignore */ }
      }, 30);
    }
  }, [currentUser?.id, fbUser?.uid, location.pathname, navigate]);

  useEffect(() => {
    if (!currentUser?.id || !fbUser?.uid || typeof window === 'undefined') return;
    if (location.pathname === '/login') return;
    try {
      window.localStorage.setItem(
        lastRouteStorageKeyForUid(fbUser.uid),
        JSON.stringify({ pathname: location.pathname, scrollY: Math.max(0, Math.round(window.scrollY || 0)), ts: Date.now() })
      );
    } catch {
      /* ignore */
    }
  }, [currentUser?.id, fbUser?.uid, location.pathname]);

  useEffect(() => {
    const m = location.pathname.match(/^\/eventos\/([^/]+)$/);
    if (m && currentUser) {
      navigate(`/eventos/${m[1]}/dashboard`, { replace: true });
    }
  }, [location.pathname, currentUser, navigate]);

  useEffect(() => {
    if (!currentUser || !events?.length) return;
    const pathname = location.pathname;
    const pendingPath = programmaticNavTargetRef.current;
    if (pendingPath && pathsEqualForRouter(pathname, pendingPath)) {
      programmaticNavTargetRef.current = null;
      return;
    }
    const parsed = parseAppPathname(pathname);
    if (!parsed || parsed.kind === 'login') return;

    if (parsed.kind === 'eventos') {
      setSystemView((prev) => (prev === 'events' ? prev : 'events'));
      setSelectedEventId((prev) => (prev == null ? prev : null));
      setActiveTab((prev) => (prev === 'Summary' ? prev : 'Summary'));
      return;
    }
    if (parsed.kind === 'usuarios') {
      setSystemView((prev) => (prev === 'users' ? prev : 'users'));
      setSelectedEventId((prev) => (prev == null ? prev : null));
      setActiveTab((prev) => (prev === 'Summary' ? prev : 'Summary'));
      return;
    }
    if (parsed.kind === 'logs') {
      if (currentUser && !canViewSystemLogs(currentUser)) {
        navigate('/eventos', { replace: true });
        return;
      }
      setSystemView((prev) => (prev === 'logs' ? prev : 'logs'));
      setSelectedEventId((prev) => (prev == null ? prev : null));
      setActiveTab((prev) => (prev === 'Summary' ? prev : 'Summary'));
      return;
    }
    if (parsed.kind === 'archivo') {
      setSystemView((prev) => (prev === 'archive' ? prev : 'archive'));
      setSelectedEventId((prev) => (prev == null ? prev : null));
      setActiveTab((prev) => (prev === 'Summary' ? prev : 'Summary'));
      return;
    }
    if (parsed.kind === 'event') {
      const ev = findEventByUrlSlug(events, parsed.eventSlug);
      if (!ev || !hasEventAccess(ev.id)) {
        navigate('/eventos', { replace: true });
        return;
      }
      const locs = resolveVisibleLocationsForEvent(ev);
      const nextTab = routeSegmentToActiveTab(parsed.routeSegment, parsed.locationSlug, locs, ev.eventType);
      setSystemView((prev) => (prev === 'events' ? prev : 'events'));
      setSelectedEventId((prev) => (String(prev) === String(ev.id) ? prev : ev.id));
      setActiveTab((prev) => (prev === nextTab ? prev : nextTab));
    }
  }, [currentUser, events, location.pathname, hasEventAccess, resolveVisibleLocationsForEvent, navigate, canViewSystemLogs]);

  /**
   * Mantiene la URL sincronizada con la pantalla activa real.
   * Esto cubre cambios de pestaña/sede que actualizan estado pero no pasaron por `goTo`,
   * para que al recargar (F5) se restaure exactamente la misma pantalla.
   *
   * Importante: si el usuario usó «Atrás» del navegador, `location.pathname` puede ser ya
   * `/eventos` u otra vista mientras el estado aún no se ha reconciliado en el mismo ciclo.
   * Forzar `navigate(expectedPath)` aquí anularía el retroceso; solo corregimos URL cuando
   * la ruta actual sigue siendo la del mismo evento seleccionado.
   */
  useEffect(() => {
    if (!currentUser) return;
    if (historyNavigationInFlightRef.current) return;
    if (programmaticNavTargetRef.current) return;
    if (systemView !== 'events' || !selectedEventId) return;
    const parsed = parseAppPathname(location.pathname);
    if (!parsed || parsed.kind !== 'event') return;
    const ev = currentEvent || events.find((e) => String(e.id) === String(selectedEventId));
    if (!ev) return;
    const evFromUrl = findEventByUrlSlug(events, parsed.eventSlug);
    if (!evFromUrl || String(evFromUrl.id) !== String(selectedEventId)) return;
    const locs = resolveVisibleLocationsForEvent(ev);
    const tabFromUrl = routeSegmentToActiveTab(
      parsed.routeSegment,
      parsed.locationSlug,
      locs,
      ev.eventType
    );
    // La URL manda si la pestaña aún no coincide (p. ej. Atrás del navegador antes de reconciliar estado).
    if (tabFromUrl !== activeTab) return;
    const expectedPath = buildPathFromNavState('events', selectedEventId, activeTab, ev, events, locs);
    if (expectedPath && !pathsEqualForRouter(location.pathname, expectedPath)) {
      navigate(expectedPath, { replace: true });
    }
  }, [
    currentUser,
    systemView,
    selectedEventId,
    activeTab,
    currentEvent,
    events,
    resolveVisibleLocationsForEvent,
    location.pathname,
    navigate,
  ]);

  const syncRosterLocationSearchTerm = useCallback((term) => {
    const v = String(term ?? '');
    rosterLocationSearchRef.current = v;
    setDebouncedSearchTerm(v);
  }, []);

  const setRosterLocationSearchRef = useCallback((term) => {
    rosterLocationSearchRef.current = String(term ?? '');
  }, []);

  const rosterLocationFilterSetters = useMemo(
    () => ({
      setDebouncedSearchTerm: syncRosterLocationSearchTerm,
      setSortBy,
      setFilterSwim,
      setFilterMedical,
      setFilterScholarship,
      setFilterResponsiva,
      setFilterPersonOfInterest,
      setFilterGender,
      setFilterTransport,
      setFilterPaymentType,
      setFilterTravelFrom,
      setFilterTravelTo,
      setFilterRosterRole,
      setFilterFirstTimeId,
      setFilterPendingRefund,
      setFilterWhatsAppPending,
      setFilterLiquidation,
      setFilterAssignment,
      setFilterBaptism,
      setFilterMaritalStatus,
      setFilterRegistrationStatus,
      setFilterPaymentMethod,

      setFilterAge,
      setFilterCarDataPending,
    }),
    [syncRosterLocationSearchTerm]
  );

  const getRosterFilterStateSnapshot = useCallback(
    () =>
      captureLocationRosterFiltersFromState({
        searchTerm: rosterLocationSearchRef.current,
        sortBy,
        filterSwim,
        filterMedical,
        filterScholarship,
        filterResponsiva,
        filterPersonOfInterest,
        filterGender,
        filterTransport,
        filterPaymentType,
        filterTravelFrom,
        filterTravelTo,
        filterRosterRole,
        filterFirstTimeId,
        filterPendingRefund,
        filterWhatsAppPending,
        filterLiquidation,
        filterAssignment,
        filterBaptism,
        filterMaritalStatus,
        filterRegistrationStatus,
        filterPaymentMethod,

        filterAge,
        filterCarDataPending,
      }),
    [
      sortBy,
      filterSwim,
      filterMedical,
      filterScholarship,
      filterResponsiva,
      filterPersonOfInterest,
      filterGender,
      filterTransport,
      filterPaymentType,
      filterTravelFrom,
      filterTravelTo,
      filterRosterRole,
      filterFirstTimeId,
      filterPendingRefund,
      filterWhatsAppPending,
      filterLiquidation,
      filterAssignment,
      filterBaptism,
      filterMaritalStatus,
      filterRegistrationStatus,
      filterPaymentMethod,

      filterAge,
      filterCarDataPending,
    ]
  );

  const persistListFiltersPrefsToFirestore = useCallback(async () => {
    if (!currentUser?.id || !fbUser?.uid || listFiltersFirestorePersistDisabledRef.current) return;
    if (!canPersistPanelUserPrefsToFirestore()) return;
    const ownDocId = String(currentUser.id);
    const live = users.find((u) => String(u.id) === ownDocId);
    if (live?.authUid && String(live.authUid) !== String(fbUser.uid)) return;
    const payload = sanitizeJsonForFirestore(listFiltersPrefsRef.current);
    if (!payload || typeof payload !== 'object') return;
    try {
      await updateDoc(getDocRef('app_users', ownDocId), {
        listFiltersPrefs: payload,
      });
    } catch (err) {
      if (err?.code === 'permission-denied') {
        listFiltersFirestorePersistDisabledRef.current = true;
      }
      console.warn('[listFiltersPrefs] No se pudo guardar en Firestore; se mantiene caché local.', err);
    }
  }, [currentUser?.id, fbUser?.uid, users]);

  const scheduleListFiltersPrefsPersist = useCallback(() => {
    if (!currentUser?.id) return;
    if (listFiltersFirestorePersistTimerRef.current) {
      window.clearTimeout(listFiltersFirestorePersistTimerRef.current);
    }
    listFiltersFirestorePersistTimerRef.current = window.setTimeout(() => {
      try {
        localStorage.setItem(
          lsKeyListFiltersPrefs(String(currentUser.id)),
          JSON.stringify(listFiltersPrefsRef.current)
        );
      } catch {
        /* ignore */
      }
      void persistListFiltersPrefsToFirestore();
    }, LIST_FILTERS_PREFS_PERSIST_MS);
  }, [currentUser?.id, persistListFiltersPrefsToFirestore]);

  const persistLocationRosterSearchToPrefs = useCallback(() => {
    const ctx = rosterFiltersContextRef.current;
    if (!ctx.eventId || !ctx.loc) return;
    listFiltersPrefsRef.current = writeLocationFiltersToPrefs(
      listFiltersPrefsRef.current,
      ctx.eventId,
      ctx.loc,
      getRosterFilterStateSnapshot()
    );
    scheduleListFiltersPrefsPersist();
  }, [getRosterFilterStateSnapshot, scheduleListFiltersPrefsPersist]);

  const flushRosterFiltersToPrefs = useCallback(
    (eventId, loc) => {
      if (!eventId || !loc) return;
      listFiltersPrefsRef.current = writeLocationFiltersToPrefs(
        listFiltersPrefsRef.current,
        eventId,
        loc,
        getRosterFilterStateSnapshot()
      );
      scheduleListFiltersPrefsPersist();
    },
    [getRosterFilterStateSnapshot, scheduleListFiltersPrefsPersist]
  );

  const loadRosterFiltersForLocation = useCallback(
    (eventId, loc, { legacyParsed = null } = {}) => {
      if (!eventId || !loc) return;
      let root = listFiltersPrefsRef.current;
      if (legacyParsed && !legacyLocalFiltersMigratedRef.current) {
        root = migrateLegacyLocalFiltersToPrefs(root, eventId, loc, legacyParsed);
        listFiltersPrefsRef.current = root;
        legacyLocalFiltersMigratedRef.current = true;
      }
      const snap = readLocationFiltersFromPrefs(root, eventId, loc);
      const merged = snap || createEmptyLocationRosterFilters();
      const current = getRosterFilterStateSnapshot();
      try {
        if (JSON.stringify(merged) === JSON.stringify(current)) return;
      } catch {
        /* aplicar si no se puede comparar */
      }
      applyLocationRosterFilters(merged, rosterLocationFilterSetters);
    },
    [rosterLocationFilterSetters, getRosterFilterStateSnapshot]
  );

  const loadGlobalRegistryFiltersFromPrefs = useCallback(
    (eventId) => {
      if (!eventId) return;
      const gr = readGlobalRegistryFiltersFromPrefs(listFiltersPrefsRef.current, eventId, mergeGlobalRegistryListFilters);
      if (gr) setGlobalRegistryListFilters(gr);
      const glf = listFiltersPrefsRef.current?.events?.[String(eventId)]?.globalLocationFilters;
      if (Array.isArray(glf)) setGlobalLocationFilters(glf);
    },
    []
  );

  const flushRosterFiltersToPrefsRef = useRef(flushRosterFiltersToPrefs);
  flushRosterFiltersToPrefsRef.current = flushRosterFiltersToPrefs;
  const loadRosterFiltersForLocationRef = useRef(loadRosterFiltersForLocation);
  loadRosterFiltersForLocationRef.current = loadRosterFiltersForLocation;
  const loadGlobalRegistryFiltersFromPrefsRef = useRef(loadGlobalRegistryFiltersFromPrefs);
  loadGlobalRegistryFiltersFromPrefsRef.current = loadGlobalRegistryFiltersFromPrefs;

  useEffect(() => {
    if (!currentUser?.id) return;
    const uid = String(currentUser.id);
    if (listFiltersPrefsHydratedUidRef.current === uid) return;
    let root = createEmptyListFiltersPrefsRoot();
    const fromUser = currentUser.listFiltersPrefs;
    if (fromUser && typeof fromUser === 'object') {
      root = normalizeListFiltersPrefsRoot(fromUser);
    } else {
      try {
        const raw = localStorage.getItem(lsKeyListFiltersPrefs(uid));
        if (raw) root = normalizeListFiltersPrefsRoot(JSON.parse(raw));
      } catch {
        /* ignore */
      }
    }
    listFiltersPrefsRef.current = root;
    listFiltersPrefsHydratedUidRef.current = uid;
    listFiltersFirestorePersistDisabledRef.current = false;
    legacyLocalFiltersMigratedRef.current = false;
    setTransportUiPrefs(readTransportUiFromPrefs(root));
  }, [currentUser?.id, currentUser?.listFiltersPrefs]);

  /** Si el perfil en `users` trae prefs tras el primer render, fusionar una sola vez (otro dispositivo / sesión nueva). */
  const listFiltersPrefsRemoteMergedUidRef = useRef('');
  useEffect(() => {
    if (!currentUser?.id || !currentUser.listFiltersPrefs) return;
    const uid = String(currentUser.id);
    if (listFiltersPrefsHydratedUidRef.current !== uid) return;
    if (listFiltersPrefsRemoteMergedUidRef.current === uid) return;
    const remote = normalizeListFiltersPrefsRoot(currentUser.listFiltersPrefs);
    listFiltersPrefsRef.current = remote;
    listFiltersPrefsRemoteMergedUidRef.current = uid;
    setTransportUiPrefs(readTransportUiFromPrefs(remote));
    if (currentEvent?.id) {
      setPastoresUiPrefs(readPastoresUiFromPrefs(remote, currentEvent.id));
    }
    if (!remote.events || Object.keys(remote.events).length === 0) return;
    if (!currentEvent?.id) return;
    const eventId = String(currentEvent.id);
    if (deferredActiveTab === 'RegistroGlobal') loadGlobalRegistryFiltersFromPrefsRef.current(eventId);
    else if (isLocationRosterTab(deferredActiveTab)) {
      loadRosterFiltersForLocationRef.current(eventId, deferredActiveTab);
    }
  }, [currentUser?.id, currentUser?.listFiltersPrefs, currentEvent?.id, deferredActiveTab]);

  useEffect(() => {
    if (!listFiltersPrefsHydratedUidRef.current || !currentEvent?.id) return;
    const eventId = String(currentEvent.id);
    const prev = rosterFiltersContextRef.current;

    const leavingLocationTab =
      prev.eventId &&
      prev.loc &&
      (prev.eventId !== eventId || prev.loc !== deferredActiveTab || !isLocationRosterTab(deferredActiveTab));
    if (leavingLocationTab) {
      flushRosterFiltersToPrefsRef.current(prev.eventId, prev.loc);
    }

    if (deferredActiveTab === 'RegistroGlobal') {
      rosterFiltersContextRef.current = { eventId, loc: null };
      loadGlobalRegistryFiltersFromPrefsRef.current(eventId);
      return;
    }

    if (!isLocationRosterTab(deferredActiveTab)) {
      rosterFiltersContextRef.current = { eventId, loc: null };
      return;
    }

    let legacyParsed = null;
    if (!legacyLocalFiltersMigratedRef.current && currentUser?.id) {
      try {
        const raw = localStorage.getItem(lsKeyUserFilters(String(currentUser.id)));
        if (raw) legacyParsed = JSON.parse(raw);
      } catch {
        /* ignore */
      }
    }
    loadRosterFiltersForLocationRef.current(eventId, deferredActiveTab, { legacyParsed });
    rosterFiltersContextRef.current = { eventId, loc: deferredActiveTab };
  }, [deferredActiveTab, currentEvent?.id, currentUser?.id]);

  useEffect(() => {
    if (!isLocationRosterTab(activeTab)) {
      setNewRegModalOpen((open) => (open ? false : open));
    }
  }, [activeTab]);

  useEffect(() => {
    if (!listFiltersPrefsHydratedUidRef.current) return;
    const ctx = rosterFiltersContextRef.current;
    if (!ctx.eventId || !ctx.loc) return;
    listFiltersPrefsRef.current = writeLocationFiltersToPrefs(
      listFiltersPrefsRef.current,
      ctx.eventId,
      ctx.loc,
      getRosterFilterStateSnapshot()
    );
    scheduleListFiltersPrefsPersist();
  }, [
    sortBy,
    filterSwim,
    filterMedical,
    filterScholarship,
        filterResponsiva,
        filterPersonOfInterest,
        filterGender,
        filterTransport,
    filterPaymentType,
    filterTravelFrom,
    filterTravelTo,
    filterRosterRole,
    filterFirstTimeId,
    filterPendingRefund,
    filterWhatsAppPending,
    filterLiquidation,
    filterAssignment,
    filterBaptism,
    filterMaritalStatus,
    filterPaymentMethod,

    filterAge,
    scheduleListFiltersPrefsPersist,
    getRosterFilterStateSnapshot,
  ]);

  useEffect(() => {
    if (!listFiltersPrefsHydratedUidRef.current || !currentEvent?.id) return;
    listFiltersPrefsRef.current = writeGlobalRegistryFiltersToPrefs(
      listFiltersPrefsRef.current,
      currentEvent.id,
      globalRegistryListFilters,
      globalLocationFilters
    );
    scheduleListFiltersPrefsPersist();
  }, [globalRegistryListFilters, globalLocationFilters, currentEvent?.id, scheduleListFiltersPrefsPersist]);

  const onTransportUiPrefsChange = useCallback(
    (updater) => {
      setTransportUiPrefs((prev) => {
        const draft = typeof updater === 'function' ? updater(prev) : updater;
        const next = normalizeTransportUiPrefs(draft);
        if (listFiltersPrefsHydratedUidRef.current) {
          listFiltersPrefsRef.current = writeTransportUiToPrefs(listFiltersPrefsRef.current, next);
          scheduleListFiltersPrefsPersist();
        }
        return next;
      });
    },
    [scheduleListFiltersPrefsPersist]
  );

  const onPastoresUiPrefsChange = useCallback(
    (updater) => {
      setPastoresUiPrefs((prev) => {
        const draft = typeof updater === 'function' ? updater(prev) : updater;
        const next = normalizePastoresUiPrefs(draft);
        if (listFiltersPrefsHydratedUidRef.current && currentEvent?.id) {
          listFiltersPrefsRef.current = writePastoresUiToPrefs(
            listFiltersPrefsRef.current,
            currentEvent.id,
            next
          );
          scheduleListFiltersPrefsPersist();
        }
        return next;
      });
    },
    [currentEvent?.id, scheduleListFiltersPrefsPersist]
  );

  useEffect(() => {
    if (!listFiltersPrefsHydratedUidRef.current || !currentEvent?.id) {
      setPastoresUiPrefs(createEmptyPastoresUiPrefs());
      return;
    }
    setPastoresUiPrefs(readPastoresUiFromPrefs(listFiltersPrefsRef.current, currentEvent.id));
  }, [currentEvent?.id]);

  // Load User Preferences
  useEffect(() => {
    if (currentUser?.id) {
      const savedPrefs = localStorage.getItem(`vina_prefs_${currentUser.id}`);
      if (savedPrefs) {
        setViewPrefs({ ...defaultViewPrefs, ...JSON.parse(savedPrefs) });
      } else {
        setViewPrefs(defaultViewPrefs);
      }
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id) return;
    try {
      const raw = localStorage.getItem(lsKeyShowGrossCommission(currentUser.id));
      if (raw == null) return;
      const v = JSON.parse(raw);
      if (typeof v === 'boolean') setShowGrossWithoutCommission(v);
    } catch {
      /* ignore */
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (globalConfig == null) return;
    const raw = globalConfig.cardCommissionRate;
    let num = raw === undefined || raw === null ? 0.04 : Number(raw);
    if (!Number.isFinite(num)) num = 0.04;
    const frac = num > 1 ? num / 100 : num;
    const pct = Math.round(frac * 10000) / 100;
    setCardCommissionPctDraft(String(pct));
  }, [globalConfig?.cardCommissionRate]);

  useEffect(() => {
    if (globalConfig == null) return;
    setLogStorageMaxEntries(
      clampLogsStorageLimit(globalConfig.logStorageMaxEntries ?? LOGS_STORAGE_MAX_DEFAULT)
    );
  }, [globalConfig?.logStorageMaxEntries]);

  useLayoutEffect(() => {
    if (!currentUser?.id) return;
    const uid = String(currentUser.id);
    try {
      const raw = localStorage.getItem(lsKeyUserFilters(uid));
      if (raw) {
        const p = JSON.parse(raw);
        if (p && typeof p === 'object') {
          if (typeof p.summaryFilterScholarship === 'string') setSummaryFilterScholarship(p.summaryFilterScholarship);
          if (typeof p.summaryFilterServer === 'string') setSummaryFilterServer(p.summaryFilterServer);
          if (typeof p.summaryFilterAssignment === 'string') setSummaryFilterAssignment(p.summaryFilterAssignment);
          if (typeof p.summaryFilterBaptism === 'string') setSummaryFilterBaptism(p.summaryFilterBaptism);
          if (p.summaryCampaScopes && typeof p.summaryCampaScopes === 'object' && !Array.isArray(p.summaryCampaScopes)) {
            setSummaryCampaScopes((prev) => ({ ...prev, ...p.summaryCampaScopes }));
          } else if (typeof p.summaryCampaScope === 'string') {
            setSummaryCampaScopes((prev) => ({ ...prev, tableDetails: p.summaryCampaScope }));
          }
          if (typeof p.logFilterContext === 'string') setLogFilterContext(p.logFilterContext);
          if (typeof p.logFilterUsername === 'string') setLogFilterUsername(p.logFilterUsername);
          if (typeof p.logFilterAction === 'string') setLogFilterAction(p.logFilterAction);
          if (typeof p.logOldestBulkDeleteCountInput === 'string') setLogOldestBulkDeleteCountInput(p.logOldestBulkDeleteCountInput);
          if (typeof p.logSearchTerm === 'string') setLogSearchTerm(p.logSearchTerm);
          if (typeof p.logDateMode === 'string') setLogDateMode(p.logDateMode);
          if (typeof p.logDateFrom === 'string') setLogDateFrom(p.logDateFrom);
          if (typeof p.logDateTo === 'string') setLogDateTo(p.logDateTo);
          if (typeof p.logSpecificWeek === 'string') setLogSpecificWeek(p.logSpecificWeek);
          if (typeof p.logSpecificDay === 'string') setLogSpecificDay(p.logSpecificDay);
          if (typeof p.logSpecificMonth === 'string') setLogSpecificMonth(p.logSpecificMonth);
          const ef = p.expenseFilters;
          if (ef && typeof ef === 'object' && typeof ef.paid === 'boolean' && typeof ef.pending === 'boolean' && typeof ef.counted === 'boolean' && typeof ef.uncounted === 'boolean') {
            setExpenseFilters({ paid: ef.paid, pending: ef.pending, counted: ef.counted, uncounted: ef.uncounted });
          }
          if (typeof p.cashCutMode === 'string') setCashCutMode(p.cashCutMode);
          if (typeof p.cashCutSelected === 'string') setCashCutSelected(p.cashCutSelected);
          if (typeof p.cashCutGross === 'boolean') setCashCutGross(p.cashCutGross);
          if (typeof p.expenseSearch === 'string') setExpenseSearch(p.expenseSearch);
          if (typeof p.expenseGross === 'boolean') setExpenseGross(p.expenseGross);
          if (typeof p.summaryDashExpandKey === 'string') setSummaryDashExpandKey(p.summaryDashExpandKey || null);
          else if (p.summaryDashExpandKey === null) setSummaryDashExpandKey(null);
          if (typeof p.expandedCut === 'string') setExpandedCut(p.expandedCut || null);
          else if (p.expandedCut === null) setExpandedCut(null);
        }
      }
    } catch {
      /* ignore */
    }
  }, [currentUser?.id]);

  useLayoutEffect(() => {
    rosterSectionsPrefsLoadedRef.current = '';
    if (!currentUser?.id) return;
    const uid = String(currentUser.id);
    try {
      const raw = localStorage.getItem(lsKeyRosterSections(uid));
      if (raw) {
        const p = JSON.parse(raw);
        if (p && typeof p.activos === 'boolean' && typeof p.waitlist === 'boolean' && typeof p.cancelled === 'boolean') {
          setRosterSectionExpanded({ activos: p.activos, waitlist: p.waitlist, cancelled: p.cancelled });
          rosterSectionsPrefsLoadedRef.current = uid;
        }
      }
    } catch {
      /* ignore */
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id) return;
    try {
      localStorage.setItem(
        lsKeyUserFilters(String(currentUser.id)),
        JSON.stringify({
          v: 2,
          summaryFilterScholarship,
          summaryFilterServer,
          summaryFilterAssignment,
          summaryFilterBaptism,
          summaryCampaScopes,
          logFilterContext,
          logFilterUsername,
          logFilterAction,
          logOldestBulkDeleteCountInput,
          logSearchTerm,
          logDateMode,
          logDateFrom,
          logDateTo,
          logSpecificWeek,
          logSpecificDay,
          logSpecificMonth,
          expenseFilters,
          cashCutMode,
          cashCutSelected,
          cashCutGross,
          expenseSearch,
          expenseGross,
          summaryDashExpandKey,
          expandedCut,
        })
      );
    } catch {
      /* ignore */
    }
  }, [
    currentUser?.id,
    summaryFilterScholarship,
    summaryFilterServer,
    summaryFilterAssignment,
    summaryFilterBaptism,
    summaryCampaScopes,
    logFilterContext,
    logFilterUsername,
    logFilterAction,
    logOldestBulkDeleteCountInput,
    logSearchTerm,
    logDateMode,
    logDateFrom,
    logDateTo,
    logSpecificWeek,
    logSpecificDay,
    logSpecificMonth,
    expenseFilters,
    cashCutMode,
    cashCutSelected,
    cashCutGross,
    expenseSearch,
    expenseGross,
    summaryDashExpandKey,
    expandedCut,
  ]);

  const toggleShowGrossWithoutCommission = useCallback(() => {
    setShowGrossWithoutCommission((prev) => {
      const next = !prev;
      if (currentUser?.id) {
        try {
          localStorage.setItem(lsKeyShowGrossCommission(currentUser.id), JSON.stringify(next));
        } catch {
          /* ignore */
        }
      }
      return next;
    });
  }, [currentUser?.id]);

  /** Preferencias de gráficas circulares del resumen (#/% y $/%) persistidas en Firestore por usuario. */
  useEffect(() => {
    if (!currentUser?.id) return;
    const live = users.find((u) => String(u.id) === String(currentUser.id));
    if (!live) return;
    if (typeof live.summaryPieLocShowNumbers === 'boolean') setShowLocChartValues(live.summaryPieLocShowNumbers);
    if (typeof live.summaryPieIncShowMoney === 'boolean') setShowIncChartValues(live.summaryPieIncShowMoney);
  }, [currentUser?.id, users]);

  const toggleSummaryPieLocChart = useCallback(() => {
    setShowLocChartValues((prev) => {
      const next = !prev;
      if (currentUser?.id) {
        updateDoc(getDocRef('app_users', String(currentUser.id)), { summaryPieLocShowNumbers: next }).catch((e) => {
          console.error(e);
          showToast('No se pudo guardar la preferencia de la gráfica.');
        });
      }
      return next;
    });
  }, [currentUser?.id, showToast]);

  const toggleSummaryPieIncChart = useCallback(() => {
    setShowIncChartValues((prev) => {
      const next = !prev;
      if (currentUser?.id) {
        updateDoc(getDocRef('app_users', String(currentUser.id)), { summaryPieIncShowMoney: next }).catch((e) => {
          console.error(e);
          showToast('No se pudo guardar la preferencia de la gráfica.');
        });
      }
      return next;
    });
  }, [currentUser?.id, showToast]);

  const togglePref = (key) => {
    setViewPrefs(prev => {
      const next = { ...prev, [key]: !prev[key] };
      if (currentUser?.id) {
        localStorage.setItem(`vina_prefs_${currentUser.id}`, JSON.stringify(next));
      }
      return next;
    });
  };

  const dashboardConfigSnapshot = useMemo(
    () => ({
      viewPrefs,
      summaryFilterScholarship,
      summaryFilterServer,
      summaryFilterAssignment,
      summaryFilterBaptism,
      summaryCampaScopes,
      summaryTableColumns,
      showLocChartValues,
      showIncChartValues,
    }),
    [
      viewPrefs,
      summaryFilterScholarship,
      summaryFilterServer,
      summaryFilterAssignment,
      summaryFilterBaptism,
      summaryCampaScopes,
      summaryTableColumns,
      showLocChartValues,
      showIncChartValues,
    ]
  );

  // Watcher for Debug Mode Global Toast
  useEffect(() => {
    if (!globalConfig) return;

    const current = globalConfig.isDebugMode;
    const prev = prevDebugRef.current;

    if (prev !== undefined && current !== prev) {
      if (current) {
        setDebugToast({
          msg: "El modo de depuración se activó. Las modificaciones con el insecto no son permanentes y se eliminarán.",
          type: "active"
        });
      } else {
        setDebugToast({
          msg: "El modo de depuración terminó.",
          type: "inactive"
        });
      }
      
      const timer = setTimeout(() => setDebugToast(null), 10000);
      return () => clearTimeout(timer);
    }
    prevDebugRef.current = current;
  }, [globalConfig, globalConfig?.isDebugMode]);

  /** Aviso global cuando alguien inicia o cierra sesión (misma vía que depuración: `app_data/config`). */
  useEffect(() => {
    if (!globalConfig || !fbUser || !currentUser) return;
    const b = globalConfig.sessionActivityBroadcast;
    if (!b || typeof b !== 'object' || !b.id) return;
    if (prevSessionBroadcastIdRef.current === undefined) {
      prevSessionBroadcastIdRef.current = b.id;
      return;
    }
    if (prevSessionBroadcastIdRef.current === b.id) return;
    prevSessionBroadcastIdRef.current = b.id;

    const actor = String(b.actorTabSessionId || '');
    const mine = currentUser.tabSessionId ? String(currentUser.tabSessionId) : '';
    if (actor && mine && actor === mine) return;

    const who = String(b.username || 'Usuario').trim() || 'Usuario';
    const kind = b.kind === 'logout' ? 'logout' : 'login';
    if (kind === 'login') {
      setDebugToast({ msg: `${who} inició sesión en el panel.`, type: 'session-login' });
    } else {
      setDebugToast({ msg: `${who} cerró sesión.`, type: 'session-logout' });
    }
  }, [globalConfig, globalConfig?.sessionActivityBroadcast, fbUser, currentUser]);

  /** Avisos de login/cierre de sesión: ocultar a los 10 s sin depender de re-suscripciones a `globalConfig` (evita que el cleanup cancele el timer y el banner quede fijo). */
  useEffect(() => {
    if (!debugToast) return undefined;
    const t = debugToast.type;
    if (t !== 'session-login' && t !== 'session-logout') return undefined;
    const timer = setTimeout(() => setDebugToast(null), 10_000);
    return () => clearTimeout(timer);
  }, [debugToast]);

  /** Si recargas con depuración activa, recupera la lista de revertidos desde sessionStorage. */
  useEffect(() => {
    if (!globalConfig?.isDebugMode || !globalConfig?.debugSessionId) return;
    if (debugSessionRevertLogsRef.current.length > 0) return;
    try {
      const raw = sessionStorage.getItem(debugRevertStorageKey(globalConfig.debugSessionId));
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        debugSessionRevertLogsRef.current = parsed;
      }
    } catch {
      /* ignore */
    }
  }, [globalConfig?.isDebugMode, globalConfig?.debugSessionId]);

  /** Snapshot ya reflejó la sesión: limpiar id pendiente. */
  useEffect(() => {
    if (!globalConfig?.debugSessionId) return;
    if (pendingDebugSessionRef.current === globalConfig.debugSessionId) {
      pendingDebugSessionRef.current = null;
    }
  }, [globalConfig?.debugSessionId]);

  const applyRevert = async (revertInfo, logId = null) => {
    if (!revertInfo) return;
    let ri = revertInfo;
    if (!ri.previousData && logId && (ri.action === 'update' || ri.action === 'delete')) {
      try {
        const snap = await getDoc(getDocRef('app_log_reverts', String(logId)));
        if (snap.exists() && snap.data()?.previousData) {
          ri = { ...ri, previousData: snap.data().previousData };
        }
      } catch (e) {
        console.warn('No se pudo cargar snapshot de revert:', e);
      }
    }
    const { collectionName, docId, action, previousData } = ri;
    try {
      if (action === 'create') {
        await deleteDoc(getDocRef(collectionName, docId));
      } else if (action === 'update' || action === 'delete') {
        if (previousData) {
          if (collectionName === 'app_events') {
            const snap = await getDoc(getDocRef(collectionName, docId));
            const current = snap.exists() ? snap.data() : {};
            if (isPartialAppEventRevertData(previousData)) {
              const { id: _dropId, ...patch } = previousData;
              await updateDoc(getDocRef(collectionName, docId), omitUndefinedDeep(patch));
            } else {
              const payload = mergeAppEventDocForRevert(previousData, current, docId);
              await setDoc(getDocRef(collectionName, docId), payload);
            }
          } else if (collectionName === 'app_data' && docId === 'config') {
            const snap = await getDoc(getDocRef(collectionName, docId));
            const current = snap.exists() ? snap.data() : {};
            const preserved = {};
            for (const key of CONFIG_LOG_META_PRESERVE_KEYS) {
              if (current[key] !== undefined) preserved[key] = current[key];
            }
            await setDoc(
              getDocRef(collectionName, docId),
              omitUndefinedDeep({ ...previousData, ...preserved }),
              { merge: true }
            );
          } else {
            await setDoc(getDocRef(collectionName, docId), previousData);
          }
        }
      }
    } catch (err) {
      console.error("Error al revertir:", err);
    }
  };

  // Toggle Debug Mode (Global via Firestore)
  const toggleDebugMode = async () => {
    if (!globalConfig?.isDebugMode) {
      const newSessionId = Date.now();
      pendingDebugSessionRef.current = newSessionId;
      debugSessionRevertLogsRef.current = [];
      try {
        sessionStorage.setItem(debugRevertStorageKey(newSessionId), '[]');
      } catch {
        /* ignore */
      }
      await updateDoc(getDocRef('app_data', 'config'), { isDebugMode: true, debugSessionId: newSessionId });
      
      const createdAt = Date.now();
      const newLogId = `${createdAt}${Math.random().toString(36).slice(2, 10)}`;
      await setDoc(
        getDocRef('app_logs', String(newLogId)),
        withLogVisibleInPanel({
          id: newLogId,
          createdAt,
          eventId: 'Global',
          eventName: 'Sistema',
          timestamp: new Date().toLocaleString('es-MX'),
          username: currentUser.username,
          action: 'Modo Depuración',
          details: `El SuperUsuario "${currentUser.username}" activó el modo de depuración. Los cambios realizados durante esta sesión serán revertidos al salir.`,
          revertInfo: null,
          isDebug: false,
          debugSessionId: newSessionId,
        })
      );
    } else {
      const currentSession = globalConfig.debugSessionId;
      pendingDebugSessionRef.current = null;
      const collectRevertable = (list) =>
        (Array.isArray(list) ? list : [])
          .filter((l) => l && l.debugSessionId === currentSession && l.revertInfo)
          .sort((a, b) => extractLogMillis(b) - extractLogMillis(a));

      let sourceList = debugSessionRevertLogsRef.current;
      if (!sourceList || sourceList.length === 0) {
        try {
          const raw = sessionStorage.getItem(debugRevertStorageKey(currentSession));
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) sourceList = parsed;
          }
        } catch {
          sourceList = [];
        }
      }
      if (!sourceList) sourceList = [];

      let logsToRevert = collectRevertable(sourceList);

      /** Solo si no hay caché: query acotada por sesión de depuración. */
      if (logsToRevert.length === 0 && currentSession) {
        try {
          const logList = await fetchDebugSessionLogs(currentSession);
          logsToRevert = collectRevertable(logList);
        } catch (e) {
          console.error(e);
          logsToRevert = collectRevertable(logsRef.current);
        }
      }

      for (const l of logsToRevert) {
        await applyRevert(l.revertInfo, l.id);
      }

      debugSessionRevertLogsRef.current = [];
      try {
        sessionStorage.removeItem(debugRevertStorageKey(currentSession));
      } catch {
        /* ignore */
      }
      
      await updateDoc(getDocRef('app_data', 'config'), { isDebugMode: false, debugSessionId: null });
      
      const createdAtExit = Date.now();
      const newLogIdExit = `${createdAtExit}${Math.random().toString(36).slice(2, 10)}`;
      await setDoc(
        getDocRef('app_logs', String(newLogIdExit)),
        withLogVisibleInPanel({
          id: newLogIdExit,
          createdAt: createdAtExit,
          eventId: 'Global',
          eventName: 'Sistema',
          timestamp: new Date().toLocaleString('es-MX'),
          username: currentUser.username,
          action: 'Sistema',
          details: `Salió de depuración. Se revirtieron ${logsToRevert.length} acciones temporales.`,
          revertInfo: null,
        })
      );
    }
  };

  useEffect(() => {
    if (currentEvent) {
      const single = currentEvent.date || '';
      setEventDateDraft({
        dateStart: currentEvent.dateStart || single,
        dateEnd: currentEvent.dateEnd || single,
        campaTeensStart: currentEvent.campaTeensDateStart || '',
        campaTeensEnd: currentEvent.campaTeensDateEnd || '',
        campaJovenesStart: currentEvent.campaJovenesDateStart || '',
        campaJovenesEnd: currentEvent.campaJovenesDateEnd || '',
      });
      setTempDeposit(currentEvent.minDeposit || 0);
      setDashPaymentDeadlineDate(
        currentEvent.paymentDeadlineDate != null && currentEvent.paymentDeadlineDate !== ''
          ? String(currentEvent.paymentDeadlineDate)
          : ''
      );
      setTempRealCost(currentEvent.realCost || 0);
      setTempLocationCaps(currentEvent.locationCaps || {});
      setTempEventTotalCap(Math.max(0, Number(currentEvent.eventTotalCap ?? 0)));
    }
  }, [currentEvent, getAutoPaymentService]);

  /** Nuevo registro / lista de espera: al cambiar de evento o usuario, plantilla + borrador en localStorage (por usuario y evento). */
  useEffect(() => {
    if (!currentEvent?.id) return;
    const defaults = {
      ...EMPTY_ENTRY,
      ...getDefaultTransportFieldsForEventType(currentEvent.eventType),
      
      paymentMethod: 'Efectivo',
      paymentService: getAutoPaymentService(new Date()),
      cardReference: '',
    };
    let nextEntry = defaults;
    let profSearch = '';
    let spouseNew = '';
    let waitlist = false;
    if (currentUser?.id) {
      try {
        const raw = window.localStorage.getItem(registrationFormDraftStorageKey(currentUser.id, currentEvent.id));
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.entry && typeof parsed.entry === 'object') {
            nextEntry = mergeNewRegistrationWithImport(defaults, parsed.entry);
          }
          if (typeof parsed.newRegProfileSearch === 'string') profSearch = parsed.newRegProfileSearch;
          if (typeof parsed.spouseLinkSearchNew === 'string') spouseNew = parsed.spouseLinkSearchNew;
          if (typeof parsed.sendToWaitlist === 'boolean') waitlist = parsed.sendToWaitlist;
        }
      } catch {
        /* borrador inválido */
      }
    }
    setNewEntry(nextEntry);
    setNewRegProfileSearch(profSearch);
    setSpouseLinkSearchNew(spouseNew);
    setSendToWaitlist(waitlist);
    setNewRegGeneralComment('');
    setNewRegDraftCarMeta({});
    // Sin `getAutoPaymentService` en deps: evita reinicializar el borrador al mutar slots/config global.
  }, [currentEvent?.id, currentEvent?.eventType, currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id || !currentEvent?.id) return;
    const t = window.setTimeout(() => {
      persistRegistrationFormDraft(currentUser.id, currentEvent.id, {
        entry: newEntry,
        newRegProfileSearch,
        spouseLinkSearchNew,
        sendToWaitlist,
      });
    }, 450);
    return () => window.clearTimeout(t);
  }, [
    newEntry,
    newRegProfileSearch,
    spouseLinkSearchNew,
    sendToWaitlist,
    currentUser?.id,
    currentEvent?.id,
  ]);

  const prevSelectedEventIdForNewEventDraftRef = useRef(undefined);
  useEffect(() => {
    if (!currentUser?.id) return;
    const prev = prevSelectedEventIdForNewEventDraftRef.current;
    if (selectedEventId === prev) return;
    prevSelectedEventIdForNewEventDraftRef.current = selectedEventId;
    if (selectedEventId != null) return;
    try {
      const raw = window.localStorage.getItem(newEventFormDraftStorageKey(currentUser.id));
      if (!raw) return;
      const p = JSON.parse(raw);
      if (!p || typeof p !== 'object') return;
      const typeRaw = EVENT_TYPES.includes(p.type) ? p.type : 'Campa';
      const type = typeRaw;
      setNewEventData({
        name: typeof p.name === 'string' ? p.name : '',
        type,
        date: typeof p.date === 'string' ? p.date : '',
        baseCost: p.baseCost != null && p.baseCost !== '' ? String(p.baseCost) : '',
      });
    } catch {
      /* */
    }
  }, [currentUser?.id, selectedEventId]);

  useEffect(() => {
    if (!currentUser?.id || selectedEventId != null) return;
    const t = window.setTimeout(() => {
      try {
        window.localStorage.setItem(newEventFormDraftStorageKey(currentUser.id), JSON.stringify(newEventData));
      } catch {
        /* */
      }
    }, 450);
    return () => window.clearTimeout(t);
  }, [newEventData, currentUser?.id, selectedEventId]);

  /** Al abrir el modal «Nuevo evento», recuperar borrador si la tecla Escape u otro cierre dejó el estado en blanco. */
  useEffect(() => {
    if (!isAddEventModalOpen || !currentUser?.id) return;
    try {
      const raw = window.localStorage.getItem(newEventFormDraftStorageKey(currentUser.id));
      if (!raw) return;
      const p = JSON.parse(raw);
      if (!p || typeof p !== 'object') return;
      const hasAny =
        (typeof p.name === 'string' && p.name.trim()) ||
        (typeof p.date === 'string' && p.date.trim()) ||
        (p.baseCost != null && String(p.baseCost).trim());
      if (!hasAny) return;
      const typeRaw = EVENT_TYPES.includes(p.type) ? p.type : 'Campa';
      const type = typeRaw;
      setNewEventData({
        name: typeof p.name === 'string' ? p.name : '',
        type,
        date: typeof p.date === 'string' ? p.date : '',
        baseCost: p.baseCost != null && p.baseCost !== '' ? String(p.baseCost) : '',
      });
    } catch {
      /* */
    }
  }, [isAddEventModalOpen, currentUser?.id]);

  useEffect(() => {
    if (!cupoSedeOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setCupoSedeOpen(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [cupoSedeOpen]);

  useEffect(() => {
    if (!publicQrModalOpen || !currentEvent?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(getDocRef('app_public_registration_links', currentEvent.id));
        if (cancelled) return;
        if (snap.exists()) {
          const d = snap.data();
          const slug = getPublicRegistrationUrlSlug(currentEvent);
          if (slug && d?.urlSlug !== slug && !cancelled) {
            try {
              await setDoc(getDocRef('app_public_registration_links', currentEvent.id), { urlSlug: slug }, { merge: true });
            } catch (backfillErr) {
              console.warn(backfillErr);
            }
          }
          if (d.optionalVisibility && typeof d.optionalVisibility === 'object') {
            setPublicQrOptional(normalizeOptionalVisibility(d.optionalVisibility));
          } else {
            setPublicQrOptional(normalizeOptionalVisibility());
          }
        } else {
          setPublicQrOptional(normalizeOptionalVisibility());
        }
        const url = getPublicRegistrationPageUrl(currentEvent);
        setPublicQrUrl(url);
        const { default: QRCode } = await import('qrcode');
        const dataUrl = await QRCode.toDataURL(url, { width: 280, margin: 2 });
        if (!cancelled) setPublicQrDataUrl(dataUrl);
      } catch (e) {
        console.error(e);
        if (!cancelled) setPublicQrDataUrl('');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [publicQrModalOpen, currentEvent?.id, currentEvent?.name]);

  useEffect(() => {
    const legacy = String(currentEvent?.responsivaDigitalText || '');
    setEventResponsivaTextMinorsDraft(String(currentEvent?.responsivaDigitalTextMinors ?? legacy));
    setEventResponsivaTextAdultsDraft(String(currentEvent?.responsivaDigitalTextAdults ?? legacy));
    setEventResponsivaEnabledDraft(isResponsivaEnabledForEvent(currentEvent));
    setEventResponsivaDigitalEnabledDraft(currentEvent?.responsivaDigitalEnabled !== false);
    setEventResponsivaGeneralMinorsDraft(isResponsivaGeneralMinorsBranchEnabled(currentEvent));
    setEventResponsivaGeneralAdultsDraft(isResponsivaGeneralAdultsBranchEnabled(currentEvent));
    setEventResponsivaDigitalMinorsDraft(isResponsivaDigitalMinorsBranchEnabled(currentEvent));
    setEventResponsivaDigitalAdultsDraft(isResponsivaDigitalAdultsBranchEnabled(currentEvent));
  }, [currentEvent?.id]);

  useEffect(() => {
    setExpandedRows(new Set());
    setSendToWaitlist(false);
  }, [activeTab]);

  useEffect(() => {
    const handleGlobalPointerDown = (ev) => {
      const target = ev.target;
      if (!(target instanceof Element)) return;

      if (!target.closest('[data-dropdown-root="filters"]')) setFiltersDropdownOpen(false);
      if (!target.closest('[data-dropdown-root="global-registry-filters"]')) setGlobalRegistryFiltersDropdownOpen(false);
      if (!target.closest('[data-dropdown-root="summary-dashboard-filters"]')) setSummaryFiltersDropdownOpen(false);
      if (!target.closest('[data-dropdown-root="new-served-areas"]')) setOpenServedAreasLoc(null);
      if (!target.closest('[data-dropdown-root="new-preferred-areas"]')) setOpenPreferredServeLoc(null);
      if (!target.closest('[data-dropdown-root="edit-served-areas"]')) setEditServedAreasDropdownOpen(false);
      if (!target.closest('[data-dropdown-root="edit-preferred-areas"]')) setEditPreferredServeDropdownOpen(false);
      if (!target.closest('[data-dropdown-root="expense-filters"]')) setExpenseFiltersDropdownOpen(false);
      if (!target.closest('[data-dropdown-root="global-locations-filters"]')) setGlobalLocationsDropdownOpen(false);
      if (!target.closest('[data-dropdown-root="view-settings"]')) setShowViewSettings(false);
    };

    document.addEventListener('pointerdown', handleGlobalPointerDown);
    return () => document.removeEventListener('pointerdown', handleGlobalPointerDown);
  }, []);

  useEffect(() => {
    const handleWheelOnNumberInput = (ev) => {
      const target = ev.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.type !== 'number') return;
      if (document.activeElement !== target) return;
      ev.preventDefault();
    };

    document.addEventListener('wheel', handleWheelOnNumberInput, { passive: false });
    return () => document.removeEventListener('wheel', handleWheelOnNumberInput);
  }, []);

  useEffect(() => {
    if (systemView !== 'users') {
      setNewUser({
        username: '',
        password: '',
        loginEmail: '',
        role: 'Editor',
        canViewFinances: false,
        canViewHiddenDonations: false,
        canViewExpenses: false,
        restrictedEventId: '',
        restrictedLocation: '',
        allowedEventIds: [],
        allowedLocations: [],
        allowedLocationsByEvent: {},
        allowedPanelSections: { ...EDITOR_LECTOR_PANEL_DEFAULT },
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
    }
  }, [systemView]);

  useEffect(() => {
    if (!currentUser) return;
    if (selectedEventId && !hasEventAccess(selectedEventId)) {
      setSelectedEventId(null);
      setActiveTab("Summary");
      setSystemView('events');
      return;
    }
    const eventNavTabsWithoutLocation = [
      'Summary',
      'Bautizados',
      'ServersPage',
      'ExpenseList',
      'CashCut',
      'Becados',
      'Responsivas',
      'RegistroGlobal',
      'TransportPlanning',
      'PastoresPage',
    ];
    if (!selectedEventId || !currentEvent) return;
    if (activeTab === 'Bautizados' && currentEvent?.eventType !== 'Campa') {
      if (activeTab !== 'Summary') setActiveTab('Summary');
      return;
    }
    if (['BautizosCompanions', 'BautizosAsistentes', 'BautizosCortesias'].includes(activeTab)) {
      setActiveTab('Summary'); // legacy Bautizos event tabs unsupported in v2
      return;
    }
    if (activeTab === 'Responsivas' && !hasAdminRights) {
      if (activeTab !== 'Summary') setActiveTab('Summary');
      return;
    }
    if (activeTab === 'Responsivas' && !isResponsivaEventSectionVisible(currentEvent)) {
      if (activeTab !== 'Summary') setActiveTab('Summary');
      return;
    }
    if (activeTab === 'PastoresPage' && !hasAdminRights) {
      if (activeTab !== 'Summary') setActiveTab('Summary');
      return;
    }
    if (eventNavTabsWithoutLocation.includes(activeTab)) {
      const pk = PANEL_NAV_TAB_KEYS[activeTab];
      if (pk && !isPanelNavSectionAllowed(pk)) {
        const nextTab = isPanelNavSectionAllowed('dashboard')
          ? 'Summary'
          : resolvePreferredLandingTab(currentUser, currentEvent);
        if (nextTab !== activeTab) setActiveTab(nextTab);
      }
      return;
    }
    if (!isPanelNavSectionAllowed('locations')) {
      if (activeTab !== 'Summary') setActiveTab('Summary');
      return;
    }
    // Sede = nombre en activeTab: debe existir en el evento actual y ser visible para el usuario (onSnapshot actualiza currentEvent).
    if (!visibleLocations.includes(activeTab)) {
      const eventNavTabsWithoutLocationSet = new Set(eventNavTabsWithoutLocation);
      let nextTab = resolvePreferredLandingTab(currentUser, currentEvent);
      if (!eventNavTabsWithoutLocationSet.has(nextTab) && !visibleLocations.includes(nextTab)) {
        nextTab =
          visibleLocations[0] ||
          (isPanelNavSectionAllowed('dashboard') ? 'Summary' : 'Summary');
      }
      if (nextTab !== activeTab) setActiveTab(nextTab);
    }
  }, [currentUser, selectedEventId, activeTab, currentEvent, visibleLocations, hasEventAccess, isPanelNavSectionAllowed, resolvePreferredLandingTab, hasAdminRights]);

  useEffect(() => {
    if (!fbUser) {
      setFirestoreUsersError(null);
      setUsersAuthReady(false);
    }
  }, [fbUser]);

  useEffect(() => {
    if (!fbUser) return;
    let cancelled = false;
    let unsubUsers = () => {};
    let listenAllUsers = true;

    const attachUsersListener = (useFullCollection, ownUserId) => {
      unsubUsers();
      if (useFullCollection) {
        unsubUsers = onSnapshot(
          getColRef('app_users'),
          SNAPSHOT_LISTENER_OPTS,
          (snap) => {
            if (cancelled) return;
            setFirestoreUsersError(null);
            setUsersAuthReady(true);
            if (!snap.empty) {
              setUsers((prev) => {
                const merged = mergeRowsByDocChanges(prev, snap, (d) => ({ id: d.id, ...d.data() }));
                if (merged === null) return prev;
                return merged;
              });
            } else {
              setUsers([]);
            }
          },
          (err) => {
            if (cancelled || isLogoutPermissionNoise(err)) return;
            console.error(err);
            emitGlobalSystemAlert(shortFirebaseClientMessage(err), { ms: 7200 });
            const code = err?.code || '';
            setFirestoreUsersError(
              code === 'permission-denied'
                ? 'Firestore rechazó la lectura (permiso denegado). Despliega las reglas: firebase deploy (o al menos firestore:rules) y espera un minuto.'
                : 'No se pudo cargar la lista de usuarios. Revisa conexión, que Firestore está activo y que el proyecto sea registros-vnpm.'
            );
            setUsers([]);
            setUsersAuthReady(true);
          }
        );
      } else if (ownUserId) {
        unsubUsers = onSnapshot(
          getDocRef('app_users', ownUserId),
          SNAPSHOT_LISTENER_OPTS,
          (docSnap) => {
            if (cancelled) return;
            setFirestoreUsersError(null);
            setUsersAuthReady(true);
            if (docSnap.exists()) {
              const row = { id: docSnap.id, ...docSnap.data() };
              setUsers([row]);
            } else {
              setUsers([]);
            }
          },
          (err) => {
            if (cancelled || isLogoutPermissionNoise(err)) return;
            console.error(err);
            setFirestoreUsersError('No se pudo cargar tu perfil de usuario.');
            setUsers([]);
            setUsersAuthReady(true);
          }
        );
      } else {
        setUsers([]);
        setUsersAuthReady(true);
      }
      staffSnapshotUnsubsRef.current.push(unsubUsers);
    };

    (async () => {
      try {
        const snap = await getDocsFromCache(getColRef('app_users'));
        if (!cancelled && !snap.empty) {
          setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
          setFirestoreUsersError(null);
          setUsersAuthReady(true);
        }
      } catch {
        /* sin caché */
      }

      const profile = await resolveStaffUserProfileFromAuth(fbUser);
      if (cancelled) return;
      const adminFromSession = currentUser && staffUserIsAdminProfile(currentUser);
      listenAllUsers = staffUserIsAdminProfile(profile) || adminFromSession || !profile;
      if (profile && !listenAllUsers) {
        setUsers((prev) => {
          const has = prev.some((u) => String(u.id) === String(profile.id));
          return has ? prev : [profile];
        });
      }
      attachUsersListener(listenAllUsers, profile ? String(profile.id) : null);
    })();

    return () => {
      cancelled = true;
      unsubUsers();
      staffSnapshotUnsubsRef.current = staffSnapshotUnsubsRef.current.filter((u) => u !== unsubUsers);
    };
  }, [fbUser, currentUser?.role]);

  /** Hidrata eventos desde caché local (si existe) para menos espera antes del primer snapshot de red. */
  useEffect(() => {
    if (!fbUser) return;
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocsFromCache(getColRef('app_events'));
        if (cancelled || snap.empty) return;
        setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch {
        /* sin caché */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fbUser]);

  useEffect(() => {
    if (!fbUser) return;
    let lastConfigSerialized = null;
    const unsubConfig = onSnapshot(getDocRef('app_data', 'config'), SNAPSHOT_LISTENER_OPTS, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const serialized = JSON.stringify(data);
        if (serialized === lastConfigSerialized) return;
        lastConfigSerialized = serialized;
        setGlobalLocations(data.locations || defaultLocations);
        setGlobalConfig(data);
      } else {
        lastConfigSerialized = null;
        setDoc(getDocRef('app_data', 'config'), {
          locations: defaultLocations,
          isDebugMode: false,
          debugSessionId: null,
          cardCommissionRate: 0.04,
          dataBulkGeneration: 0,
          serviceSlots: DEFAULT_SERVICE_SLOTS,
          cashCutScheduleByLocation: {},
          serveAreaOptions: DEFAULT_SERVE_AREA_OPTIONS,
          allergyOptions: DEFAULT_ALLERGY_OPTIONS,
          panelNav: { ...DEFAULT_PANEL_NAV },
          editorRegistrationFieldsByType: Object.fromEntries(
            EVENT_TYPES.map((evType) => [evType, defaultEditorRegistrationFieldVisibility()])
          ),
          privacyNotice: defaultPrivacyNoticeConfig(),
          logStorageMaxEntries: LOGS_STORAGE_MAX_DEFAULT,
        });
        setGlobalLocations(defaultLocations);
      }
    }, logAndEmitFirestoreListenError);
    staffSnapshotUnsubsRef.current.push(unsubConfig);

    const unsubEvents = onSnapshot(getColRef('app_events'), SNAPSHOT_LISTENER_OPTS, (snap) => {
      if (snap.empty) {
        const ev1 = {
          id: 'evt_campa', name: "Campa 2026: Lazos Inquebrantables",
          pricingType: 'fixed', globalCost: 3400, serverCost: 4000, dynamicPrices: [], dynamicServerPrices: [],
          minDeposit: 500, eventType: 'Campa', date: '2026-07-20', realCost: 0,
          locations: defaultLocations, regStatus: defaultRegStatus, order: 0,
          activeRosterUnitsTotal: 0,
        };
        const ev2 = {
          id: 'evt_alducin', name: "Desayuno Conferencia Dr. Armando Alducin Marzo 2026",
          pricingType: 'fixed', globalCost: 350, serverCost: 0, dynamicPrices: [], dynamicServerPrices: [],
          minDeposit: 150, eventType: 'Desayuno Conferencia', date: '2026-03-14', realCost: 0,
          locations: defaultLocations, regStatus: defaultRegStatus, order: 1,
          activeRosterUnitsTotal: 0,
        };
        setDoc(getDocRef('app_events', ev1.id), ev1);
        setDoc(getDocRef('app_events', ev2.id), ev2);
      } else {
        setEvents((prev) => {
          const merged = mergeRowsByDocChanges(prev, snap, (d) => ({ id: d.id, ...d.data() }));
          if (merged === null) return prev;
          return merged;
        });
      }
    }, logAndEmitFirestoreListenError);
    staffSnapshotUnsubsRef.current.push(unsubEvents);

    return () => {
      unsubConfig();
      unsubEvents();
      staffSnapshotUnsubsRef.current = staffSnapshotUnsubsRef.current.filter(
        (u) => u !== unsubConfig && u !== unsubEvents
      );
    };
  }, [fbUser]);

  useEffect(() => {
    if (globalConfig == null || !fbUser) {
      setNeedsFirestoreResyncAfterBulk(false);
      return;
    }
    const gen = typeof globalConfig.dataBulkGeneration === 'number' ? globalConfig.dataBulkGeneration : 0;
    setNeedsFirestoreResyncAfterBulk(gen > getAckBulkGeneration());
  }, [fbUser, globalConfig?.dataBulkGeneration]);

  const bulkResyncAlertedRef = useRef(false);
  useEffect(() => {
    if (!needsFirestoreResyncAfterBulk) {
      bulkResyncAlertedRef.current = false;
      return;
    }
    if (bulkResyncAlertedRef.current) return;
    bulkResyncAlertedRef.current = true;
    emitGlobalSystemAlert('Caché de Firestore desfasada: pulsa «Alinear caché y recargar».', { tone: 'warn', ms: 11000 });
  }, [needsFirestoreResyncAfterBulk]);

  useEffect(() => {
    return () => {
      if (assignLocationToastTimerRef.current != null) {
        window.clearTimeout(assignLocationToastTimerRef.current);
        assignLocationToastTimerRef.current = null;
      }
    };
  }, []);

  const handleReloadAfterBulkRestore = useCallback(async () => {
    setBulkResyncBusy(true);
    try {
      const gen = typeof globalConfig?.dataBulkGeneration === 'number' ? globalConfig.dataBulkGeneration : 0;
      await reloadAppAfterClearingFirestorePersistence(gen);
    } catch (e) {
      console.error(e);
      showToast('No se pudo limpiar la caché local. Intenta de nuevo o cierra todas las pestañas del panel.');
      setBulkResyncBusy(false);
    }
  }, [globalConfig?.dataBulkGeneration, showToast]);

  /** Tras volver a la app (p. ej. rotar el celular), actualizar solo datos de pantalla en el perfil. */
  useEffect(() => {
    if (!fbUser || !currentUser?.id) return;
    let t;
    const onVis = () => {
      if (document.visibilityState !== 'visible') return;
      clearTimeout(t);
      t = setTimeout(() => {
        updateDoc(getDocRef('app_users', String(currentUser.id)), getClientDeviceSnapshot()).catch(() => {});
      }, 1500);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearTimeout(t);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [fbUser, currentUser?.id]);

  /**
   * Participantes: versión por sede en `app_cache_versions` + datos en localStorage.
   * Si la versión coincide, no se relee `app_participants` (solo el doc de versión por sede).
   */
  useEffect(() => {
    if (!fbUser || !currentUser) return;
    let cancelled = false;

    const cleanupListeners = () => {
      if (participantsVersionUnsubRef.current) {
        participantsVersionUnsubRef.current();
        participantsVersionUnsubRef.current = null;
      }
      participantsVersionAckRef.current = null;
    };

    const run = async () => {
      cleanupListeners();
      if (selectedEventId != null && selectedEventId !== '') {
        const eid = String(selectedEventId);
        const locations = [
          ...(currentEvent?.locations?.length ? currentEvent.locations : globalLocations || []),
        ];
        const warm = eventParticipantsWarmRef.current;
        if (warm.eventId === eid && Array.isArray(warm.rows)) {
          setAllParticipants(warm.rows);
        }
        try {
          const rows = await loadEventParticipantsWithVersionCache(eid, locations);
          if (!cancelled) {
            setAllParticipants(rows);
            eventParticipantsWarmRef.current = { eventId: eid, rows };
          }
        } catch (e) {
          console.error('[cache-version] carga participantes evento', e);
          if (!cancelled) setAllParticipants([]);
        }
        if (!cancelled) {
          const participantsVersionSub = subscribeParticipantsLocationVersionsDebounced(
            eid,
            locations,
            async (eventId, staleItems) => {
              const results = await Promise.all(
                staleItems.map(({ loc, remoteV }) =>
                  refetchParticipantsForLocation(eventId, loc, { remoteV })
                )
              );
              if (cancelled) {
                return staleItems.map(({ loc }, i) => ({
                  loc,
                  versionWritten: results[i]?.versionWritten ?? 0,
                }));
              }
              setAllParticipants((prev) => {
                let next = prev;
                staleItems.forEach(({ loc }, i) => {
                  next = replaceParticipantsForLocation(next, eventId, loc, results[i]?.slice || []);
                });
                return next;
              });
              return staleItems.map(({ loc }, i) => ({
                loc,
                versionWritten: results[i]?.versionWritten ?? 0,
              }));
            }
          );
          participantsVersionUnsubRef.current = participantsVersionSub.unsub;
          participantsVersionAckRef.current = participantsVersionSub.acknowledgeLocationVersion;
        }
      } else if (systemView === 'archive') {
        try {
          const rows = await loadArchivedParticipantsWithVersionCache();
          if (!cancelled) setAllParticipants(rows);
        } catch (e) {
          console.error('[cache-version] carga archivo', e);
          if (!cancelled) setAllParticipants([]);
        }
        if (!cancelled) {
          participantsVersionUnsubRef.current = subscribeArchiveParticipantsVersion(async () => {
            try {
              const rows = await loadArchivedParticipantsWithVersionCache();
              setAllParticipants(rows);
            } catch (err) {
              console.error('[cache-version] refetch archivo', err);
            }
          });
        }
      } else if (!cancelled) {
        setAllParticipants([]);
      }
    };

    void run();
    return () => {
      cancelled = true;
      cleanupListeners();
    };
  }, [fbUser, currentUser?.id, selectedEventId, systemView, currentEvent?.id, participantLocationsKey]);

  /** Tras cargar roster completo del evento abierto, alinea el contador del hub con el dashboard (sin tocar el hub con datos parciales). */
  useEffect(() => {
    if (!currentEvent?.id || selectedEventId == null || selectedEventId === '') return;
    const evId = String(currentEvent.id);
    const rows = (allParticipants || []).filter((p) => String(p?.eventId || '') === evId);
    if (rows.length === 0) return;
    const computed = computeDashboardTodosRosterTotal(rows, currentEvent);
    if (!Number.isFinite(computed)) return;
    const stored = Math.floor(Number(currentEvent.activeRosterUnitsTotal) || 0);
    if (computed === stored) return;
    setEvents((prev) =>
      prev.map((ev) =>
        String(ev.id) === evId ? { ...ev, activeRosterUnitsTotal: computed } : ev
      )
    );
  }, [allParticipants, currentEvent, selectedEventId]);

  useEffect(() => {
    if (!fbUser || !currentUser) return;
    if (selectedEventId == null || selectedEventId === '') {
      setDonations([]);
      return;
    }
    const q = query(getColRef('app_donations'), where('eventId', '==', String(selectedEventId)));
    const unsub = onSnapshot(
      q,
      SNAPSHOT_LISTENER_OPTS,
      (snap) => {
        setDonations((prev) => {
          const merged = mergeRowsByDocChanges(prev, snap, (d) => ({ id: d.id, ...d.data() }));
          if (merged === null) return prev;
          return merged;
        });
      },
      firestoreListenConsoleError
    );
    staffSnapshotUnsubsRef.current.push(unsub);
    return () => {
      unsub();
      staffSnapshotUnsubsRef.current = staffSnapshotUnsubsRef.current.filter((u) => u !== unsub);
    };
  }, [fbUser, currentUser, selectedEventId]);

  useEffect(() => {
    if (!fbUser || !currentUser) return;
    if (selectedEventId == null || selectedEventId === '') {
      setExpenses([]);
      return;
    }
    const q = query(getColRef('app_expenses'), where('eventId', '==', String(selectedEventId)));
    const unsub = onSnapshot(
      q,
      SNAPSHOT_LISTENER_OPTS,
      (snap) => {
        setExpenses((prev) => {
          const merged = mergeRowsByDocChanges(prev, snap, (d) => ({ id: d.id, ...d.data() }));
          if (merged === null) return prev;
          return merged;
        });
      },
      firestoreListenConsoleError
    );
    staffSnapshotUnsubsRef.current.push(unsub);
    return () => {
      unsub();
      staffSnapshotUnsubsRef.current = staffSnapshotUnsubsRef.current.filter((u) => u !== unsub);
    };
  }, [fbUser, currentUser, selectedEventId]);

  const activityLogPassesListFilters = useMemo(
    () =>
      createActivityLogListFilter({
        hasAdminRights,
        showDebugLogs,
        logFilterContext,
        logFilterUsername,
        logFilterAction,
        logSearchTerm,
        logDateMode,
        logDateFrom,
        logDateTo,
        logSpecificWeek,
        logSpecificDay,
        logSpecificMonth,
      }),
    [
      hasAdminRights,
      showDebugLogs,
      logFilterContext,
      logFilterUsername,
      logFilterAction,
      logSearchTerm,
      logDateMode,
      logDateFrom,
      logDateTo,
      logSpecificWeek,
      logSpecificDay,
      logSpecificMonth,
    ]
  );

  const loadLogsHeadFromServer = useCallback(async (count) => {
    const target = Math.max(1, Math.floor(Number(count) || 20));
    const scope = scopeLogsHead();
    const remoteV = await fetchRemoteCacheVersion(scope);
    const local = await readVersionCacheRecord(scope);
    const cachedLimit = Number(local?.meta?.limit) || 0;
    const cachedRows = local?.data?.rows;
    const useVisible = logsUseVisibleInPanelQuery(globalConfig);
    const cacheRowsOk =
      Array.isArray(cachedRows) &&
      cachedRows.length > 0 &&
      cachedRows.length <= target &&
      cachedLimit === target;
    if (
      cacheRowsOk &&
      cacheVersionsMatch(local.version, remoteV) &&
      Boolean(local?.meta?.useVisibleInPanel) === useVisible
    ) {
      logCacheDecision(scope, {
        event: 'hit',
        version: remoteV,
        rows: cachedRows.length,
        source: 'indexedDB',
        limit: cachedLimit,
      });
      setLogs(cachedRows);
      logsOldestCursorRef.current = local?.data?.oldestDocSnap || null;
      setLogsHasMoreOlder(Boolean(local?.data?.hasMoreOlder));
      persistLogsToSessionCache(cachedRows);
      return;
    }
    logCacheDecision(scope, {
      event: local ? 'miss' : 'miss-no-local',
      remoteVersion: remoteV,
      localVersion: local?.version ?? 0,
      requestedLimit: target,
    });
    const { rows, oldestDocSnap, hasMoreOlder } = await fetchLogsHeadRecent(target, useVisible);
    setLogs(rows);
    logsOldestCursorRef.current = oldestDocSnap;
    setLogsHasMoreOlder(hasMoreOlder);
    persistLogsToSessionCache(rows);
    const vStore = await resolveVersionForStore(scope, remoteV);
    await writeLocalVersionCache(
      scope,
      vStore,
      { rows, hasMoreOlder, oldestDocSnap: oldestDocSnap ? String(oldestDocSnap.id) : null },
      { limit: target, kind: 'logs_head_raw', useVisibleInPanel: useVisible }
    );
    logCacheDecision(scope, { event: 'store', version: vStore, rows: rows.length, source: 'firestore' });
  }, [globalConfig?.logsVisibleInPanelBackfillAt]);

  /** Conteo total en `app_logs`: agregación Firestore; el contador en config puede desincronizarse. */
  const refreshLogsTotalCount = useCallback(
    async (forceServer = false) => {
      if (!fbUser || !currentUser || !canViewSystemLogs(currentUser)) return;
      if (logsTotalCountPermissionDenied) return;
      const cfgN = Number(globalConfig?.logsTotalCount);
      const cfgAt = Number(globalConfig?.logsTotalCountUpdatedAt) || 0;
      const cacheFresh = Date.now() - cfgAt < LOGS_TOTAL_COUNT_STALE_MS;
      const loadedHint = logsRef.current.length;
      const cacheLooksSuspicious =
        Number.isFinite(cfgN) && cfgN >= 0 && loadedHint > 0 && cfgN < loadedHint;
      if (
        !forceServer &&
        !cacheLooksSuspicious &&
        Number.isFinite(cfgN) &&
        cfgN >= 0 &&
        cacheFresh
      ) {
        setLogsTotalCount(cfgN);
        setLogsTotalCountPermissionDenied(false);
        return;
      }
      setLogsTotalCountLoading(true);
      try {
        const snap = await getCountFromServer(getColRef('app_logs'));
        const n = Number(snap?.data?.().count || 0);
        setLogsTotalCount(Number.isFinite(n) ? n : null);
        setLogsTotalCountPermissionDenied(false);
        if (Number.isFinite(n) && n >= 0 && (!Number.isFinite(cfgN) || n !== cfgN)) {
          try {
            await updateDoc(getDocRef('app_data', 'config'), {
              logsTotalCount: n,
              logsTotalCountUpdatedAt: Date.now(),
            });
          } catch (syncErr) {
            console.warn('No se pudo sincronizar logsTotalCount en config:', syncErr);
          }
        }
      } catch (e) {
        if (String(e?.code || '') === 'permission-denied') {
          setLogsTotalCountPermissionDenied(true);
          setLogsTotalCount(null);
          return;
        }
        console.error('No se pudo obtener el conteo total de logs:', e);
      } finally {
        setLogsTotalCountLoading(false);
      }
    },
    [fbUser, currentUser, logsTotalCountPermissionDenied, globalConfig?.logsTotalCount, globalConfig?.logsTotalCountUpdatedAt]
  );

  /** Tras borrar en Firestore, alinea la lista con el servidor (últimos N o búsqueda completa) y limpia selección. */
  const refreshActivityLogsFromServer = useCallback(async () => {
    if (!fbUser || !currentUser || !canViewSystemLogs(currentUser)) return;
    if (systemView !== 'logs' || selectedEventId != null) return;
    try {
      const qSearch = String(logSearchTerm || '').trim();
      if (logsFullSearchMode && qSearch) {
        setLogsSearchScanning(true);
        try {
          const all = await fetchAllLogsByDocIdPages();
          setLogs(all);
          setLogsFullSearchMode(true);
          logsOldestCursorRef.current = null;
          setLogsHasMoreOlder(false);
          persistLogsToSessionCache(all);
        } finally {
          setLogsSearchScanning(false);
        }
      } else if (logsRangeActive) {
        const info =
          logsRangeActive.kind === 'today'
            ? buildLogDateRangeForToday()
            : logsRangeActive.kind === 'week'
              ? buildLogDateRangeForThisWeek()
              : logsRangeActive.kind === 'month'
                ? buildLogDateRangeForThisMonth()
                : null;
        if (info) {
          const rows = await fetchLogsInDateRange(info.startMs, info.endMs);
          setLogs(rows);
          persistLogsToSessionCache(rows);
        } else {
          await loadLogsHeadFromServer(logRecentBaseLimit);
        }
      } else {
        await loadLogsHeadFromServer(logRecentBaseLimit);
        setLogsFullSearchMode(false);
      }
    } catch (e) {
      console.error(e);
      showToast('No se pudo actualizar la lista de actividad.');
    }
    setSelectedLogs(new Set());
    void refreshLogsTotalCount();
  }, [
    fbUser,
    currentUser,
    systemView,
    selectedEventId,
    logsFullSearchMode,
    logSearchTerm,
    logRecentBaseLimit,
    loadLogsHeadFromServer,
    logsRangeActive,
    refreshLogsTotalCount,
    showToast,
  ]);

  /** Carga todos los logs dentro de un rango de fechas (consulta con `where` en Firestore). */
  const loadLogsInDateRange = useCallback(async (startMs, endMs, meta) => {
    if (!fbUser || !currentUser || !canViewSystemLogs(currentUser)) return;
    setLogsRangeLoading(true);
    try {
      const rows = await fetchLogsInDateRange(startMs, endMs);
      setLogs(rows);
      logsOldestCursorRef.current = null;
      setLogsHasMoreOlder(false);
      setLogsFullSearchMode(false);
      persistLogsToSessionCache(rows);
      setLogsRangeActive({ kind: meta?.kind || 'range', label: meta?.label || 'rango' });
    } catch (e) {
      console.error(e);
      showToast('No se pudieron cargar los registros del rango seleccionado.');
    } finally {
      setLogsRangeLoading(false);
    }
  }, [fbUser, currentUser, showToast]);

  /** Sale del modo "rango" y recarga los últimos N. */
  const exitLogsRangeMode = useCallback(async () => {
    setLogsRangeActive(null);
    try {
      await loadLogsHeadFromServer(logRecentBaseLimit);
      setLogsFullSearchMode(false);
    } catch (e) {
      console.error(e);
    }
  }, [loadLogsHeadFromServer, logRecentBaseLimit]);

  const appendOlderLogPage = useCallback(async () => {
    if (!fbUser || !currentUser || !canViewSystemLogs(currentUser)) return;
    if (logsFullSearchMode || String(logSearchTerm || '').trim()) return;
    if (logsRangeActive) return;
    if (!logsOldestCursorRef.current) return;
    setLogsLoadingMore(true);
    try {
      const useVisible = logsUseVisibleInPanelQuery(globalConfig);
      const q = buildLogsRecentOrderQuery(logsOldestCursorRef.current, LOGS_SERVER_CHUNK, useVisible);
      const snap = await getDocsFromServer(q);
      if (snap.empty) {
        setLogsHasMoreOlder(false);
        return;
      }
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      logsOldestCursorRef.current = snap.docs[snap.docs.length - 1];
      if (snap.docs.length < LOGS_SERVER_CHUNK) setLogsHasMoreOlder(false);
      setLogs((prev) => mergeLogsDedupById([prev, rows]));
    } catch (e) {
      console.error(e);
      showToast('No se pudieron cargar registros más antiguos.');
    } finally {
      setLogsLoadingMore(false);
    }
  }, [fbUser, currentUser, logsFullSearchMode, logSearchTerm, logsRangeActive, showToast, globalConfig?.logsVisibleInPanelBackfillAt]);

  useEffect(() => {
    if (!fbUser || !currentUser) {
      setLogs([]);
      clearLogsSessionCache();
      setLogsLoading(false);
      setLogsLoadingMore(false);
      setLogsSearchScanning(false);
      setLogsFullSearchMode(false);
      setLogsGlobalSearchConfirmed(false);
      setLogsHasMoreOlder(true);
      logsOldestCursorRef.current = null;
      prevLogBaseRef.current = 20;
      wasOnActivityLogsPageRef.current = false;
      setLogsTotalCount(null);
      setLogsTotalCountLoading(false);
      setLogsTotalCountPermissionDenied(false);
      setLogsRangeActive(null);
      setLogsRangeLoading(false);
      setLogsMonthConfirmOpen(false);
      return;
    }
  }, [fbUser, currentUser]);

  /** Al salir de la vista de actividad, la próxima vez que entres debe dispararse la carga de los últimos N. */
  useEffect(() => {
    if (systemView !== 'logs' || selectedEventId != null) {
      wasOnActivityLogsPageRef.current = false;
    }
  }, [systemView, selectedEventId]);

  /** Prefetch: últimos N logs en segundo plano (no en la pantalla de logs del hub). */
  useEffect(() => {
    if (!fbUser || !currentUser || !canViewSystemLogs(currentUser)) return;
    if (systemView === 'logs' && (selectedEventId == null || selectedEventId === '')) return;
    let cancelled = false;
    (async () => {
      try {
        const { rows, oldestDocSnap, hasMoreOlder } = await fetchLogsRecentFromServer(LOGS_BACKGROUND_PREFETCH, null);
        if (cancelled) return;
        setLogs((prev) => (prev.length === 0 ? rows : prev));
        if (rows.length) {
          logsOldestCursorRef.current = oldestDocSnap;
          setLogsHasMoreOlder(hasMoreOlder);
          persistLogsToSessionCache(rows);
        }
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fbUser, currentUser?.id, systemView, selectedEventId]);

  useEffect(() => {
    const cfgN = Number(globalConfig?.logsTotalCount);
    if (Number.isFinite(cfgN) && cfgN >= 0) setLogsTotalCount(cfgN);
  }, [globalConfig?.logsTotalCount, globalConfig?.logsTotalCountUpdatedAt]);

  /** Al entrar a la vista de logs, cuenta real en Firestore (el contador en config puede estar desfasado). */
  useEffect(() => {
    if (!fbUser || !currentUser || !canViewSystemLogs(currentUser)) return;
    if (systemView !== 'logs' || selectedEventId != null) return;
    void refreshLogsTotalCount(true);
  }, [fbUser, currentUser, systemView, selectedEventId, refreshLogsTotalCount]);

  /** Vista logs: carga por ventana reciente (sin búsqueda de texto). */
  useEffect(() => {
    if (!fbUser || !currentUser || !canViewSystemLogs(currentUser)) return;
    if (systemView !== 'logs' || selectedEventId != null) return;
    if (String(logSearchTerm || '').trim()) return;
    if (logsRangeActive) return;

    const enteredActivityPage = !wasOnActivityLogsPageRef.current;
    wasOnActivityLogsPageRef.current = true;

    if (!enteredActivityPage) {
      const baseChanged = prevLogBaseRef.current !== logRecentBaseLimit;
      prevLogBaseRef.current = logRecentBaseLimit;
      if (!baseChanged && logsRef.current.length > 0 && !logsFullSearchMode) {
        return;
      }
    } else {
      prevLogBaseRef.current = logRecentBaseLimit;
    }

    let cancelled = false;
    (async () => {
      setLogsLoading(true);
      try {
        await loadLogsHeadFromServer(logRecentBaseLimit);
        if (!cancelled) setLogsFullSearchMode(false);
      } catch (e) {
        console.error(e);
        if (!cancelled) showToast('No se pudieron cargar los registros de actividad.');
      } finally {
        if (!cancelled) setLogsLoading(false);
      }
    })();
    if (logsVersionUnsubRef.current) {
      logsVersionUnsubRef.current();
      logsVersionUnsubRef.current = null;
    }
    logsVersionUnsubRef.current = subscribeLogsHeadVersionDebounced(() => {
      if (cancelled || String(logSearchTerm || '').trim() || logsRangeActive) return;
      void loadLogsHeadFromServer(logRecentBaseLimit);
    }, 1200);

    return () => {
      cancelled = true;
      if (logsVersionUnsubRef.current) {
        logsVersionUnsubRef.current();
        logsVersionUnsubRef.current = null;
      }
    };
  }, [
    fbUser,
    currentUser,
    systemView,
    selectedEventId,
    logRecentBaseLimit,
    logSearchTerm,
    logsFullSearchMode,
    loadLogsHeadFromServer,
    showToast,
    logsRangeActive,
  ]);

  /** Búsqueda de texto: en rango cargado (barato) o full-scan solo si SuperUsuario confirmó. */
  useEffect(() => {
    if (!fbUser || !currentUser || !canViewSystemLogs(currentUser)) return;
    if (systemView !== 'logs' || selectedEventId != null) return;
    const q = String(logSearchTerm || '').trim();
    if (!q) {
      setLogsGlobalSearchConfirmed(false);
      return;
    }
    const reqId = ++logsSearchRequestIdRef.current;
    let cancelled = false;
    const t = setTimeout(async () => {
      if (logsRangeActive && logs.length > 0) {
        setLogsFullSearchMode(false);
        return;
      }
      if (!logsGlobalSearchConfirmed) {
        setLogsFullSearchMode(false);
        return;
      }
      if (!isSuperUser) {
        setLogsFullSearchMode(false);
        return;
      }
      setLogsSearchScanning(true);
      try {
        const all = await fetchAllLogsByDocIdPages();
        if (cancelled || reqId !== logsSearchRequestIdRef.current) return;
        setLogs(all);
        setLogsFullSearchMode(true);
        logsOldestCursorRef.current = null;
        setLogsHasMoreOlder(false);
        persistLogsToSessionCache(all);
      } catch (e) {
        console.error(e);
        if (!cancelled && reqId === logsSearchRequestIdRef.current) showToast('Error al buscar en toda la base de actividad.');
      } finally {
        if (!cancelled && reqId === logsSearchRequestIdRef.current) setLogsSearchScanning(false);
      }
    }, 420);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [
    logSearchTerm,
    systemView,
    selectedEventId,
    fbUser,
    currentUser,
    showToast,
    logsRangeActive,
    logs.length,
    logsGlobalSearchConfirmed,
    isSuperUser,
  ]);

  /** Perfiles de otros eventos para «importar perfil» (consultas por lotes, sin listener global). Debounced para evitar lecturas al cambiar de evento en rápida sucesión. */
  useEffect(() => {
    if (!fbUser || !currentEvent) {
      setImportProfileParticipants([]);
      return;
    }
    const otherIds = events.filter((e) => e.id !== currentEvent.id).map((e) => e.id);
    if (otherIds.length === 0) {
      setImportProfileParticipants([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      (async () => {
        try {
          const all = [];
          for (const ids of chunkArray(otherIds, 10)) {
            if (ids.length === 0) continue;
            const q = query(getColRef('app_participants'), where('eventId', 'in', ids));
            const snap = await getDocs(q);
            all.push(...snap.docs.map((d) => ({ id: d.id, ...d.data() })));
          }
          if (!cancelled) setImportProfileParticipants(all);
        } catch (e) {
          console.error(e);
          if (!cancelled) setImportProfileParticipants([]);
        }
      })();
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [fbUser, currentEvent?.id, events]);

  /** Fuerza lectura desde el servidor (evita datos viejos en caché) y rellena el estado como los listeners en tiempo real.
   *  Participantes / donaciones / gastos: solo el alcance actual (mismo criterio que los listeners), no colecciones completas. */
  const syncFirestoreFromServer = useCallback(async () => {
    if (!fbUser || syncFirestoreInFlightRef.current) return;
    syncFirestoreInFlightRef.current = true;
    setSyncFirestoreBusy(true);
    const emptySnap = { empty: true, docs: [] };
    try {
      const eid = selectedEventId != null && selectedEventId !== '' ? String(selectedEventId) : null;
      let partQ;
      let donQ;
      let expQ;
      if (eid) {
        partQ = getDocsFromServer(query(getColRef('app_participants'), where('eventId', '==', eid)));
        donQ = getDocsFromServer(query(getColRef('app_donations'), where('eventId', '==', eid)));
        expQ = getDocsFromServer(query(getColRef('app_expenses'), where('eventId', '==', eid)));
      } else if (systemView === 'archive') {
        partQ = getDocsFromServer(
          query(getColRef('app_participants'), where('status', '==', PARTICIPANT_STATUS_ARCHIVED))
        );
        donQ = Promise.resolve(emptySnap);
        expQ = Promise.resolve(emptySnap);
      } else {
        partQ = Promise.resolve(emptySnap);
        donQ = Promise.resolve(emptySnap);
        expQ = Promise.resolve(emptySnap);
      }
      const [configSnap, eventsSnap, usersSnap, participantsSnap, donationsSnap, expensesSnap] = await Promise.all([
        getDocFromServer(getDocRef('app_data', 'config')),
        getDocsFromServer(getColRef('app_events')),
        getDocsFromServer(getColRef('app_users')),
        partQ,
        donQ,
        expQ,
      ]);
      if (configSnap.exists()) {
        const d = configSnap.data();
        setGlobalLocations(d.locations || defaultLocations);
        setGlobalConfig(d);
      }
      setEvents(eventsSnap.empty ? [] : eventsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setFirestoreUsersError(null);
      setUsers(usersSnap.empty ? [] : usersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      if (currentUser && canViewSystemLogs(currentUser)) {
        try {
          if (logsFullSearchMode && String(logSearchTerm || '').trim()) {
            const logsList = await fetchAllLogsByDocIdPages();
            setLogs(logsList);
            persistLogsToSessionCache(logsList);
          } else {
            const target = logRecentBaseLimit;
            const useVisible = logsUseVisibleInPanelQuery(globalConfig);
            const { rows, oldestDocSnap, hasMoreOlder } = await fetchLogsHeadRecent(target, useVisible);
            setLogs(rows);
            logsOldestCursorRef.current = oldestDocSnap;
            setLogsHasMoreOlder(hasMoreOlder);
            persistLogsToSessionCache(rows);
          }
        } catch (logErr) {
          console.error(logErr);
        }
      }
      const participantsRows = participantsSnap.empty
        ? []
        : stripCompanionWaitlistPhantomRows(
            participantsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
          );
      setAllParticipants(participantsRows);
      if (eid) {
        const locations = [
          ...(currentEvent?.locations?.length ? currentEvent.locations : globalLocations || []),
        ];
        const locKeys = [...new Set(locations.map((l) => String(l || '').trim()).filter(Boolean))];
        await Promise.all(
          locKeys.map(async (loc) => {
            const scope = scopeParticipantsLocation(eid, loc);
            const remoteV = await fetchRemoteCacheVersion(scope);
            const vStore = await resolveVersionForStore(scope, remoteV);
            const slice = participantsRows.filter((p) => String(p.location || '').trim() === loc);
            await writeLocalVersionCache(scope, vStore, slice, { eventId: eid, location: loc });
            logCacheDecision(scope, {
              event: 'sync-store',
              version: vStore,
              rows: slice.length,
              sede: loc,
            });
          })
        );
      } else if (systemView === 'archive' && participantsRows.length >= 0) {
        const scope = scopeParticipantsArchive();
        const remoteV = await fetchRemoteCacheVersion(scope);
        const vStore = await resolveVersionForStore(scope, remoteV);
        await writeLocalVersionCache(scope, vStore, participantsRows, { kind: 'archive' });
        logCacheDecision(scope, { event: 'sync-store', version: vStore, rows: participantsRows.length });
      }
      setDonations(donationsSnap.empty ? [] : donationsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setExpenses(expensesSnap.empty ? [] : expensesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      showToast('Datos sincronizados con Firebase (lectura desde servidor).');
    } catch (e) {
      console.error(e);
      showToast('No se pudo sincronizar. Revisa conexión o permisos.');
    } finally {
      syncFirestoreInFlightRef.current = false;
      setSyncFirestoreBusy(false);
    }
  }, [
    fbUser,
    showToast,
    currentUser,
    logsFullSearchMode,
    logSearchTerm,
    logRecentBaseLimit,
    selectedEventId,
    systemView,
    activityLogPassesListFilters,
    currentEvent?.locations,
    globalLocations,
  ]);

  const { data, waitlistData } = useEventWorkspaceData({
    allParticipants,
    currentEvent,
    globalLocations,
    compareParticipantsByRegisteredAtAsc,
  });

  /** Contadores barra lateral del workspace (Web Worker en eventos grandes). */
  const [workspaceSidebarBadges, setWorkspaceSidebarBadges] = useState(EMPTY_WORKSPACE_SIDEBAR_BADGES);
  const sidebarBadgesReqRef = useRef(0);

  useEffect(() => {
    if (!currentEvent?.id) {
      setWorkspaceSidebarBadges(EMPTY_WORKSPACE_SIDEBAR_BADGES);
      return undefined;
    }
    const reqId = ++sidebarBadgesReqRef.current;
    const payload = { ev: currentEvent, visibleLocations, allParticipants, data };
    runComputeWorkerJob('sidebarBadges', payload, { participantCount: allParticipants?.length ?? 0 })
      .then((result) => {
        if (sidebarBadgesReqRef.current === reqId) setWorkspaceSidebarBadges(result);
      })
      .catch(() => {
        if (sidebarBadgesReqRef.current === reqId) {
          setWorkspaceSidebarBadges(computeWorkspaceSidebarBadges(payload));
        }
      });
    return undefined;
  }, [currentEvent, visibleLocations, allParticipants, data]);


  const EMPTY_BZ_ROSTER_INDEX = useMemo(
    () => ({
      meta: {},
      activeEventRoster: [],
      companionChipCountByRegistrant: new Map(),
      visibleCompanionsByRegistrant: new Map(),
    }),
    []
  );

  const resolveGlobalRegistryFinanceHost = useCallback(
    (person) => {
      const hostId = String(person?.__hostRegistrantId || '').trim();
      if (!hostId) return null;
      return (allParticipants || []).find((p) => String(p?.id) === hostId) || null;
    },
    [allParticipants]
  );

  const bautizosGlobalRegistryFinanceOpts = null;

  /** Conteo por sede para la tabla «Cupo vs Espera»: misma lógica que columna Lista de espera del dashboard. */
  const waitlistCupoCountBySede = useMemo(() => {
    if (!currentEvent?.id) return {};
    const locList = currentEvent.locations || [];
    if (locList.length === 0) return {};
    const { bySede } = computeWaitlistCountsForEvent(allParticipants, currentEvent, locList);
    return Object.fromEntries(locList.map((l) => [l, bySede[l]?.total ?? 0]));
  }, [allParticipants, currentEvent]);

  /** Unidades de cupo activas por sede (deduplicación canónica en Bautizos; ×2 Ambos en Campa). */
  const eventCapUsedUnitsBySede = useMemo(() => {
    if (!currentEvent?.id) return {};
    return computeEventCapUsedUnitsBySede(allParticipants, currentEvent);
  }, [allParticipants, currentEvent]);

  const cancelledData = useMemo(() => {
    if (!currentEvent) return {};
    const groupedData = globalLocations.reduce((acc, loc) => ({ ...acc, [loc]: [] }), {});
    allParticipants.forEach((p) => {
      if (p.eventId === currentEvent.id && participantIsCancelled(p) && !participantIsArchived(p)) {
        const sede = String(p.cancelledFromLocation || p.location || '').trim();
        if (!sede) return;
        if (!groupedData[sede]) groupedData[sede] = [];
        groupedData[sede].push(p);
      }
    });
    return groupedData;
  }, [allParticipants, currentEvent, globalLocations]);

  const duplicatesInEvent = useMemo(() => {
    if (!currentEvent) return { byLocation: {}, groups: [], duplicateClusters: [], total: 0 };
    const byPhone = new Map();
    /** Misma base que el anti-duplicado por teléfono: inscritos y lista de espera (no baja ni archivado). */
    const pool = allParticipants.filter(
      (p) => p.eventId === currentEvent.id && participantBlocksDuplicateRegistration(p)
    );
    pool.forEach((p) => {
      const phone = digitsOnlyPhone(p.phone);
      if (!phone || phone.length < 10) return;
      if (!byPhone.has(phone)) byPhone.set(phone, []);
      byPhone.get(phone).push(p);
    });

    const phoneMemberGroups = [];
    for (const [, arr] of byPhone) {
      if (arr.length < 2) continue;
      const nonFamily = [];
      for (let i = 0; i < arr.length; i++) {
        let isFamily = false;
        for (let j = 0; j < arr.length; j++) {
          if (i === j) continue;
          if (
            isPhoneShareFamilyAllowed(
              arr[i].name,
              getEffectiveParticipantAge(arr[i]),
              arr[j].name,
              getEffectiveParticipantAge(arr[j])
            )
          ) {
            isFamily = true;
            break;
          }
        }
        if (!isFamily) nonFamily.push(arr[i]);
      }
      if (nonFamily.length >= 2) {
        phoneMemberGroups.push(nonFamily);
      } else if (nonFamily.length === 1) {
        const familyMembers = arr.filter((p) => p.id !== nonFamily[0].id);
        const hasFamilyMatch = familyMembers.some((fm) =>
          isPhoneShareFamilyAllowed(
            nonFamily[0].name,
            getEffectiveParticipantAge(nonFamily[0]),
            fm.name,
            getEffectiveParticipantAge(fm)
          )
        );
        if (!hasFamilyMatch) phoneMemberGroups.push([nonFamily[0], ...familyMembers]);
      }
    }

    const duplicateClusters = [];
    for (const members of phoneMemberGroups) {
      const digits = digitsOnlyPhone(members[0]?.phone);
      const ackKey = buildDuplicateAckKeyPhone(digits);
      const ackKeys = ackKey ? [ackKey] : [];
      const reasons = describeDuplicateParametersForPhoneMembers(members);
      if (duplicateClusterFullyAcknowledged(members, ackKeys)) continue;
      duplicateClusters.push({ kind: 'phone', members, reasons, ackKeys });
    }

    const byVnp = new Map();
    for (const p of pool) {
      const v = canonicalizeVnpPersonId(p?.vnpPersonId || '');
      if (!v) continue;
      if (!byVnp.has(v)) byVnp.set(v, []);
      byVnp.get(v).push(p);
    }
    for (const [vnpCanon, arr] of byVnp) {
      if (arr.length < 2) continue;
      const idSet = new Set(arr.map((x) => String(x.id)));
      const subsetOfPhoneCluster = duplicateClusters.some((c) => {
        if (c.kind !== 'phone') return false;
        const gs = new Set(c.members.map((x) => String(x.id)));
        return [...idSet].every((id) => gs.has(id));
      });
      if (subsetOfPhoneCluster) continue;
      const ackKeys = [buildDuplicateAckKeyVnp(vnpCanon)].filter(Boolean);
      if (duplicateClusterFullyAcknowledged(arr, ackKeys)) continue;
      duplicateClusters.push({
        kind: 'vnp',
        members: arr,
        reasons: describeDuplicateParametersForVnpMembers(vnpCanon, arr),
        ackKeys,
      });
    }

    const groups = duplicateClusters.map((c) => c.members);

    let total = 0;
    const byLoc = {};
    duplicateClusters.forEach((cluster) => {
      const { members } = cluster;
      total += members.length - 1;
      const locs = [...new Set(members.map((p) => p.location || '?'))];
      locs.forEach((loc) => {
        if (!byLoc[loc]) byLoc[loc] = [];
        const locGroup = members.filter((p) => (p.location || '?') === loc);
        const displayMembers = locGroup.length > 1 ? locGroup : members;
        byLoc[loc].push({ ...cluster, displayMembers });
      });
    });
    return { byLocation: byLoc, groups, duplicateClusters, total };
  }, [allParticipants, currentEvent]);

  const campaFamilyCollisionsInEvent = useMemo(() => {
    if (!currentEvent || currentEvent.eventType !== 'Campa') {
      return { clusters: [], byParticipantId: new Map(), total: 0 };
    }
    return buildCampaFamilyCollisionIndex(allParticipants, currentEvent.id);
  }, [allParticipants, currentEvent]);

  /**
   * Registros cuya sede no coincide con ninguna entrada de `currentEvent.locations` (o viene vacía).
   * Quedan en `data[claveExtraña]` y no se listan en pestañas ni entran en totales del resumen que iteran solo sedes del evento.
   */
  const participantsLocationIntegrity = useMemo(() => {
    if (!currentEvent) return { invalid: [] };
    const eventLocs = new Set((currentEvent.locations || []).map((x) => String(x).trim()).filter(Boolean));
    const roster = (allParticipants || []).filter((p) => String(p?.eventId || '') === String(currentEvent.id || ''));
    const invalid = [];
    for (const p of roster) {
      if (participantIsArchived(p)) continue;
      if (isCompanionWaitlistPhantomStoredParticipant(p)) continue;
      const st = p?.status || 'active';
      if (st !== 'active' && st !== 'waitlist' && st !== PARTICIPANT_STATUS_CANCELLED) continue;
      const locRaw = resolveParticipantEffectiveLocation(p, roster);
      if (!locRaw || !eventLocs.has(locRaw)) {
        invalid.push(p);
      }
    }
    invalid.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' }));
    return { invalid };
  }, [allParticipants, currentEvent]);

  const getSortedWaitlistForLocation = useCallback((loc) => {
    return [...(waitlistData[loc] || [])].sort((a, b) => {
      const ma = parseFlexibleInstantMs(a?.registeredAt);
      const mb = parseFlexibleInstantMs(b?.registeredAt);
      const fa = ma != null && Number.isFinite(ma) ? ma : Number(a.waitlistCreatedAt || 0);
      const fb = mb != null && Number.isFinite(mb) ? mb : Number(b.waitlistCreatedAt || 0);
      if (fa !== fb) return fa - fb;
      return String(a?.id ?? '').localeCompare(String(b?.id ?? ''), 'es');
    });
  }, [waitlistData]);

  const getSortedCancelledForLocation = useCallback((loc) => {
    return [...(cancelledData[loc] || [])].sort(compareParticipantsByRegisteredAtAsc);
  }, [cancelledData]);

  const toggleRosterSection = useCallback((key) => {
    setRosterSectionExpanded((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (currentUser?.id) {
        try {
          localStorage.setItem(lsKeyRosterSections(String(currentUser.id)), JSON.stringify(next));
        } catch {
          /* ignore */
        }
      }
      return next;
    });
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id) return;
    const uid = String(currentUser.id);
    if (rosterSectionsPrefsLoadedRef.current === uid) return;
    if (!visibleLocations.includes(activeTab)) return;
    const tabLoc = activeTab;
    const na = (data[tabLoc] || []).length;
    const nw =
      false /* Bautizos unsupported in v2 */
        ? countBautizosWaitlistExpandedPeople(allParticipants, currentEvent, tabLoc)
        : (waitlistData[tabLoc] || []).length;
    const nc = (cancelledData[tabLoc] || []).length;
    const next = { activos: na <= 10, waitlist: nw <= 10, cancelled: nc <= 10 };
    setRosterSectionExpanded(next);
    try {
      localStorage.setItem(lsKeyRosterSections(uid), JSON.stringify(next));
    } catch {
      /* ignore */
    }
    rosterSectionsPrefsLoadedRef.current = uid;
  }, [currentUser?.id, activeTab, visibleLocations, data, waitlistData, cancelledData, currentEvent, allParticipants]);

  const isLocOpen = useCallback((loc) => {
    return currentEvent ? currentEvent.regStatus?.[loc] !== false : false;
  }, [currentEvent]);

  const getLocationCap = useCallback((loc) => {
    if (!currentEvent) return 0;
    return Number(currentEvent.locationCaps?.[loc] || 0);
  }, [currentEvent]);

  const getEventTotalCap = useCallback(() => {
    if (!currentEvent) return 0;
    return Math.max(0, Number(currentEvent.eventTotalCap ?? 0));
  }, [currentEvent]);

  const getActiveCountByLocation = useCallback((loc) => {
    if (false /* Bautizos unsupported in v2 */) {
      return eventCapUsedUnitsBySede[loc] ?? 0;
    }
    return (data[loc] || []).length;
  }, [data, currentEvent?.eventType, eventCapUsedUnitsBySede]);

  /** Unidades de cupo activas en la sede (misma base que el modal «Cupo vs Espera» y el cupo global). */
  const getCapUsedUnitsByLocation = useCallback(
    (loc) => eventCapUsedUnitsBySede[loc] ?? 0,
    [eventCapUsedUnitsBySede]
  );

  const getEventCapUsedUnits = useCallback(() => {
    if (!currentEvent?.id) return 0;
    return computeEventCapUsedUnits(allParticipants, currentEvent);
  }, [allParticipants, currentEvent]);

  const capWaitlistConfirmRef = useRef(null);
  const [capWaitlistConfirmModal, setCapWaitlistConfirmModal] = useState({
    isOpen: false,
    capUsed: 0,
    capTotal: 0,
    reason: 'global',
    loc: '',
  });

  const requestCapFullWaitlistConfirm = useCallback(
    ({ capUsed, capTotal, reason, loc }) =>
      new Promise((resolve) => {
        capWaitlistConfirmRef.current = resolve;
        setCapWaitlistConfirmModal({
          isOpen: true,
          capUsed: Math.max(0, Number(capUsed) || 0),
          capTotal: Math.max(0, Number(capTotal) || 0),
          reason: reason === 'sede' ? 'sede' : 'global',
          loc: String(loc || '').trim(),
        });
      }),
    []
  );

  const closeCapFullWaitlistConfirm = useCallback((confirmed) => {
    setCapWaitlistConfirmModal({
      isOpen: false,
      capUsed: 0,
      capTotal: 0,
      reason: 'global',
      loc: '',
    });
    const resolve = capWaitlistConfirmRef.current;
    capWaitlistConfirmRef.current = null;
    resolve?.(!!confirmed);
  }, []);

  const promoteOverCapConfirmRef = useRef(null);
  const [promoteOverCapConfirmModal, setPromoteOverCapConfirmModal] = useState({
    isOpen: false,
    capUsed: 0,
    capTotal: 0,
    additionalUnits: 0,
    reason: 'global',
    loc: '',
    personName: '',
    isCompanion: false,
  });

  const requestPromoteOverCapConfirm = useCallback(
    ({ capUsed, capTotal, additionalUnits, reason, loc, personName, isCompanion }) =>
      new Promise((resolve) => {
        promoteOverCapConfirmRef.current = resolve;
        setPromoteOverCapConfirmModal({
          isOpen: true,
          capUsed: Math.max(0, Number(capUsed) || 0),
          capTotal: Math.max(0, Number(capTotal) || 0),
          additionalUnits: Math.max(0, Number(additionalUnits) || 0),
          reason: reason === 'sede' ? 'sede' : 'global',
          loc: String(loc || '').trim(),
          personName: String(personName || '').trim(),
          isCompanion: !!isCompanion,
        });
      }),
    []
  );

  const closePromoteOverCapConfirm = useCallback((confirmed) => {
    setPromoteOverCapConfirmModal({
      isOpen: false,
      capUsed: 0,
      capTotal: 0,
      additionalUnits: 0,
      reason: 'global',
      loc: '',
      personName: '',
      isCompanion: false,
    });
    const resolve = promoteOverCapConfirmRef.current;
    promoteOverCapConfirmRef.current = null;
    resolve?.(!!confirmed);
  }, []);

  const ensurePromoteCapAllowed = useCallback(
    async ({ loc, additionalUnits, personName, isCompanion }) => {
      const units = Math.max(0, Number(additionalUnits) || 0);
      const gCap = getEventTotalCap();
      if (gCap > 0) {
        const used = getEventCapUsedUnits();
        if (used + units > gCap) {
          if (!hasAdminRights) {
            showToast('No se puede promover: el cupo total del evento está lleno.');
            return { allowed: false, overCap: false };
          }
          const confirmed = await requestPromoteOverCapConfirm({
            capUsed: used,
            capTotal: gCap,
            additionalUnits: units,
            reason: 'global',
            loc,
            personName,
            isCompanion,
          });
          return { allowed: !!confirmed, overCap: !!confirmed };
        }
        return { allowed: true, overCap: false };
      }
      const locCap = getLocationCap(loc);
      if (locCap > 0 && getCapUsedUnitsByLocation(loc) + units > locCap) {
        if (!hasAdminRights) {
          showToast('No se puede promover: el cupo de la sede está lleno.');
          return { allowed: false, overCap: false };
        }
        const confirmed = await requestPromoteOverCapConfirm({
          capUsed: getCapUsedUnitsByLocation(loc),
          capTotal: locCap,
          additionalUnits: units,
          reason: 'sede',
          loc,
          personName,
          isCompanion,
        });
        return { allowed: !!confirmed, overCap: !!confirmed };
      }
      return { allowed: true, overCap: false };
    },
    [
      getEventTotalCap,
      getEventCapUsedUnits,
      getLocationCap,
      getCapUsedUnitsByLocation,
      hasAdminRights,
      requestPromoteOverCapConfirm,
      showToast,
    ]
  );

  const isEventGlobalActiveCapReached = useCallback(() => {
    const cap = getEventTotalCap();
    if (cap <= 0) return false;
    return getEventCapUsedUnits() >= cap;
  }, [getEventTotalCap, getEventCapUsedUnits]);

  const isLocationSedeCapFull = useCallback(
    (loc) => {
      if (getEventTotalCap() > 0) return false;
      const cap = getLocationCap(loc);
      if (!cap || cap <= 0) return false;
      return getCapUsedUnitsByLocation(loc) >= cap;
    },
    [getEventTotalCap, getLocationCap, getCapUsedUnitsByLocation]
  );

  const isLocationFull = useCallback(
    (loc) => isEventGlobalActiveCapReached() || isLocationSedeCapFull(loc),
    [isEventGlobalActiveCapReached, isLocationSedeCapFull]
  );

  const addLog = useCallback(async (action, details, overrideUsername = null, targetEvent = null, revertInfo = null, logOptions = null) => {
    const username = overrideUsername || currentUser?.username;
    if (!username) return null;

    const safeDetails = logOptions?.preserveFullDetails
      ? truncateActivityLogDetails(details, logOptions?.detailsMax ?? WHATSAPP_LOG_DETAILS_MAX)
      : truncateActivityLogDetails(details);

    const ev = targetEvent || currentEvent;
    const createdAt = Date.now();
    const newLogId = String(logOptions?.logId || `${createdAt}${Math.random().toString(36).slice(2, 10)}`);
    const debugActive = globalConfig?.isDebugMode || pendingDebugSessionRef.current;
    const slimRevert = revertInfo && !debugActive;
    const ri = slimRevert ? slimRevertInfoForLog(revertInfo) : revertInfo;

    // Snapshot lateral (segunda fuente de verdad). Si ya se escribió antes (backup-first), se omite.
    let hasSnapshot = logOptions?.hasSnapshot === true;
    const hasSnapshotPayload = logOptions?.snapshot !== undefined || logOptions?.snapshotJson != null;
    if (!logOptions?.skipSnapshotWrite && hasSnapshotPayload) {
      const snapRes = await writeSnapshotDoc(newLogId, {
        entityType: logOptions?.entityType,
        entityId: logOptions?.entityId,
        snapshot: logOptions?.snapshot,
        snapshotJson: logOptions?.snapshotJson,
        createdAt,
      });
      hasSnapshot = hasSnapshot || snapRes.ok;
    }

    const newLog = withLogVisibleInPanel({
      id: newLogId,
      createdAt,
      eventId: ev?.id || 'Global',
      eventName: ev?.name || 'Sistema',
      timestamp: new Date().toLocaleString('es-MX'),
      username,
      action,
      details: safeDetails,
      ...(logOptions?.preserveFullDetails
        ? { preserveFullDetails: true, detailsMax: logOptions?.detailsMax ?? WHATSAPP_LOG_DETAILS_MAX }
        : {}),
      revertInfo: ri,
      ...buildLogEntityFields({
        entityType: logOptions?.entityType,
        entityId: logOptions?.entityId,
        status: logOptions?.status,
        hasSnapshot,
        isError: logOptions?.isError,
        errorMessage: logOptions?.errorMessage,
      }),
      ...(globalConfig?.isDebugMode ? { isDebug: true, debugSessionId: globalConfig.debugSessionId } : {}),
      ...(logOptions?.isHidden ? { isHidden: true } : {}),
    });
    // Escritura resiliente: si falla (permisos/offline) se encola para reintento.
    await writeLogDoc(newLog);
    if (
      slimRevert &&
      revertInfo?.previousData &&
      typeof revertInfo.previousData === 'object' &&
      !ri?.previousData
    ) {
      try {
        await setDoc(getDocRef('app_log_reverts', String(newLogId)), {
          previousData: revertInfo.previousData,
          createdAt,
          collectionName: revertInfo.collectionName || '',
          docId: revertInfo.docId != null ? String(revertInfo.docId) : '',
          action: revertInfo.action || '',
        });
      } catch (e) {
        console.error('app_log_reverts', e);
      }
    }
    setLogs((prev) => mergeLogsDedupById([[newLog], prev]));

    const debugSid = globalConfig?.debugSessionId ?? pendingDebugSessionRef.current;
    if (revertInfo && debugSid && (globalConfig?.isDebugMode || pendingDebugSessionRef.current)) {
      const forCache = {
        ...newLog,
        isDebug: true,
        debugSessionId: debugSid,
      };
      debugSessionRevertLogsRef.current = [...debugSessionRevertLogsRef.current, forCache];
      try {
        sessionStorage.setItem(debugRevertStorageKey(debugSid), JSON.stringify(debugSessionRevertLogsRef.current));
      } catch {
        /* quota o datos no serializables: sigue valiendo la ref en memoria */
      }
    }
    return newLogId;
  }, [currentUser, currentEvent, globalConfig]);

  /**
   * Respaldo-primero: escribe el snapshot completo del payload ANTES del write principal,
   * ejecuta el write y luego registra el log con estado ok/error reusando el mismo logId.
   * Si el write principal falla, el snapshot ya quedó como respaldo recuperable.
   */
  const logBackedWrite = useCallback(async ({
    action,
    details,
    entityType,
    entityId,
    snapshot,
    revertInfo = null,
    targetEvent = null,
    isHidden = false,
    write,
  }) => {
    const logId = buildLogId();
    const snapRes = await logSnapshotBackup(logId, { entityType, entityId, snapshot });
    let result;
    let writeError = null;
    try {
      result = typeof write === 'function' ? await write() : undefined;
    } catch (e) {
      writeError = e;
    }
    await addLog(action, details, null, targetEvent, revertInfo, {
      logId,
      skipSnapshotWrite: true,
      hasSnapshot: snapRes.ok,
      entityType,
      entityId,
      status: writeError ? LOG_STATUS.ERROR : LOG_STATUS.OK,
      errorMessage: writeError ? normalizeErrorMessage(writeError) : '',
      isHidden,
    });
    if (writeError) throw writeError;
    return result;
  }, [addLog]);

  /** Registra un error en `app_logs` adjuntando usuario/evento actuales. */
  const logAppError = useCallback((scope, error, context = {}) => {
    void logErrorToActivity(scope, error, context, {
      username: currentUser?.username,
      eventId: currentEvent?.id,
      eventName: currentEvent?.name,
    });
  }, [currentUser?.username, currentEvent?.id, currentEvent?.name]);

  // Proveedor de contexto para el logger de errores standalone (window.onerror, etc.).
  useEffect(() => {
    setErrorLogContextProvider(() => ({
      username: currentUser?.username || 'Sistema',
      eventId: currentEvent?.id || 'Global',
      eventName: currentEvent?.name || 'Sistema',
    }));
  }, [currentUser?.username, currentEvent?.id, currentEvent?.name]);

  // Reintenta logs/snapshots que no se pudieron escribir antes (permisos/offline).
  useEffect(() => {
    void flushPendingLogQueue();
  }, []);

  const handleTogglePersonOfInterest = useCallback(
    async (profileRow, mark) => {
      if (!canMarkPersonsOfInterestFlag) {
        showToast('No tienes permiso para marcar personas de interés.');
        return;
      }
      const vnp = canonicalizeVnpPersonId(profileRow?.vnpPersonId || '') || generateVnpPersonId(profileRow || {});
      if (!vnp) {
        showToast('No se pudo determinar el ID VNPM de esta persona.');
        return;
      }
      const displayName = String(profileRow?.name || vnp).trim();
      const logEvent = currentEvent?.id
        ? currentEvent
        : { id: 'Global', name: 'Sistema' };
      const debugMeta =
        globalConfig?.isDebugMode && globalConfig?.debugSessionId
          ? { _isDebug: true, _debugSessionId: globalConfig.debugSessionId }
          : null;
      try {
        const previousData = await fetchVnpPersonFlag(vnp);
        const hadDoc = previousData != null;
        await setVnpPersonOfInterestFlag(vnp, {
          personOfInterest: !!mark,
          markedBy: String(currentUser?.username || currentUser?.id || '').trim(),
          debugMeta,
        });
        const logDetails = `${mark ? 'Marcó' : 'Desmarcó'} persona de interés: ${displayName} (${vnp}).`;
        const revertInfo = {
          collectionName: VNP_PERSON_FLAGS_COLLECTION,
          docId: vnp,
          action: !hadDoc && mark ? 'create' : 'update',
          previousData: hadDoc ? { ...previousData } : null,
        };
        await addLog('Personas de interés', logDetails, null, logEvent, revertInfo);
        showToast(mark ? 'Persona marcada como de interés.' : 'Se quitó la marca de persona de interés.');
      } catch (err) {
        console.error(err);
        showToast('No se pudo guardar la marca. Revisa conexión o permisos.');
      }
    },
    [
      canMarkPersonsOfInterestFlag,
      currentUser?.username,
      currentUser?.id,
      showToast,
      addLog,
      currentEvent,
      globalConfig?.isDebugMode,
      globalConfig?.debugSessionId,
    ]
  );

  /** Historial por registro (subcolección Firestore; 1 escritura por evento, sin lecturas hasta abrir el panel). */
  const logParticipantActivity = useCallback(
    (participantId, kind, message) => {
      if (!participantId || !message) return;
      void appendParticipantActivityEntry({
        participantId: String(participantId),
        eventId: currentEvent?.id ?? '',
        actorUsername: currentUser?.username ?? '',
        actorUserId: currentUser?.id != null ? String(currentUser.id) : '',
        kind: String(kind || 'other'),
        message: String(message),
      }).catch((e) => console.error('participant activity', e));
    },
    [currentEvent?.id, currentUser?.id, currentUser?.username]
  );

  const { companionCollisionsInEvent, performLinkCompanionCollision, performAckCompanionCollision } =
    useCompanionCollisions({
      allParticipants,
      currentEvent,
      canonicalizeVnpPersonId,
      hasAdminRights,
      currentUserRole: currentUser?.role,
      hasLocationAccess,
      addLog,
      logParticipantActivity,
      showToast,
    });

  const companionCollisionsActionable = useMemo(
    () =>
      (companionCollisionsInEvent.clusters || []).filter(
        (c) => c.confidence === 'certain' || c.confidence === 'probable'
      ),
    [companionCollisionsInEvent.clusters]
  );

  /** Auditoría PWA: instalación desde el navegador o primer acceso como app (evento «Cliente», no «Sistema»). */
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const uid = currentUser?.id;
    const username = currentUser?.username;
    if (!uid || !username) return undefined;

    const storageKey = `vnpm_pwa_install_log:${uid}`;
    const clientEvent = { id: 'Global', name: 'Cliente' };

    const logInstallOnce = async (details) => {
      try {
        if (localStorage.getItem(storageKey)) return;
        localStorage.setItem(storageKey, String(Date.now()));
      } catch {
        return;
      }
      await addLog('Cliente / PWA', details, username, clientEvent);
    };

    const onAppInstalled = () => {
      const nav = getInstallPromptBrowserNameEs();
      void logInstallOnce(
        `Instaló la PWA con el diálogo «Instalar aplicación» de ${nav} (evento nativo del navegador).`
      );
    };
    window.addEventListener('appinstalled', onAppInstalled);

    const { runtimeKind, displayModeRaw } = getClientRuntimeDisplayInfo();
    if (runtimeKind === 'pwa') {
      if (displayModeRaw === 'ios-standalone') {
        void logInstallOnce(
          'Accedió por primera vez desde la app en la pantalla de inicio (flujo «Añadir a inicio» en Safari, iOS / iPadOS).'
        );
      } else {
        const nav = getInstallPromptBrowserNameEs();
        void logInstallOnce(
          `Accedió por primera vez desde la app instalada en modo independiente (típico de «Instalar aplicación» en ${nav}).`
        );
      }
    }

    return () => window.removeEventListener('appinstalled', onAppInstalled);
  }, [currentUser?.id, currentUser?.username, addLog]);

  useEffect(() => {
    const canTrack =
      !!currentUser?.id &&
      systemView === 'events' &&
      !!selectedEventId &&
      !!currentEvent &&
      isPanelNavSectionAllowed('dashboard');
    if (!canTrack) {
      dashboardConfigLogInitRef.current = false;
      dashboardConfigLogPrevRef.current = '';
      dashboardConfigLogEventIdRef.current = null;
      return;
    }
    const eventId = currentEvent.id;
    if (dashboardConfigLogEventIdRef.current !== eventId) {
      dashboardConfigLogEventIdRef.current = eventId;
      dashboardConfigLogInitRef.current = false;
      dashboardConfigLogPrevRef.current = '';
    }
    const comparableSnapshot = toDashboardConfigLogComparable(dashboardConfigSnapshot);
    const serialized = JSON.stringify(comparableSnapshot);
    if (!dashboardConfigLogInitRef.current) {
      dashboardConfigLogInitRef.current = true;
      dashboardConfigLogPrevRef.current = serialized;
      return;
    }
    if (dashboardConfigLogPrevRef.current === serialized) return;
    const prevStr = dashboardConfigLogPrevRef.current;
    let prevSnap = null;
    try {
      prevSnap = JSON.parse(prevStr);
    } catch {
      prevSnap = null;
    }
    const delta = describeDashboardConfigDelta(prevSnap, comparableSnapshot);
    dashboardConfigLogPrevRef.current = serialized;
    addLog(
      'Configuración',
      `Dashboard (${currentEvent.name}): ${delta}`,
      null,
      currentEvent
    );
  }, [
    currentUser?.id,
    systemView,
    selectedEventId,
    currentEvent,
    dashboardConfigSnapshot,
    addLog,
    isPanelNavSectionAllowed,
  ]);

  const handleAssignParticipantLocation = useCallback(
    async (person, newLoc) => {
      if (!person?.id || !currentEvent?.id) return;
      const locs = currentEvent.locations || [];
      if (!locs.includes(newLoc)) {
        showToast('Elige una sede válida del evento.');
        return;
      }
      if (!hasEventAccess(currentEvent.id)) {
        showToast('No tienes permisos para este evento.');
        return;
      }
      if (!hasAdminRights && !hasLocationAccess(newLoc)) {
        showToast('No tienes permiso para asignar registros a esa sede.');
        return;
      }
      const oldLoc = String(person.location ?? '').trim();
      const patch = { location: newLoc };
      if (String(person.travelFrom ?? '').trim() === oldLoc) patch.travelFrom = newLoc;
      if (String(person.travelTo ?? '').trim() === oldLoc) patch.travelTo = newLoc;
      try {
        await updateDoc(getDocRef('app_participants', String(person.id)), {
          ...patch,
          ...(globalConfig?.isDebugMode ? { _isDebug: true, _debugSessionId: globalConfig.debugSessionId } : {}),
        });
        refreshParticipantCache(
          { ...person, eventId: currentEvent.id, location: newLoc },
          'Corregir sede de registro',
          { personId: person.id, patch, previousLocation: oldLoc }
        );
        const _locLog = `Corrigió sede de ${person.name}: «${oldLoc || '(vacío)'}» → «${newLoc}».`;
        queueMicrotask(() => {
          addLog(
            'Integridad de registros',
            _locLog,
            null,
            null,
            { collectionName: 'app_participants', docId: String(person.id), action: 'update', previousData: person }
          );
          logParticipantActivity(String(person.id), 'sede', _locLog);
        });
        assignLocationBatchCountRef.current += 1;
        if (assignLocationToastTimerRef.current) window.clearTimeout(assignLocationToastTimerRef.current);
        assignLocationToastTimerRef.current = window.setTimeout(() => {
          assignLocationToastTimerRef.current = null;
          const n = assignLocationBatchCountRef.current;
          assignLocationBatchCountRef.current = 0;
          if (n <= 1) {
            showToast('Sede actualizada. El registro ya debería verse en la sede correcta y en los totales.');
          } else {
            showToast(`Sede actualizada en ${n} registros. Deberían verse ya en las pestañas y totales.`);
          }
        }, 420);
      } catch (e) {
        console.error(e);
        showToast('No se pudo guardar. Revisa conexión o permisos.');
      }
    },
    [currentEvent, hasEventAccess, hasAdminRights, hasLocationAccess, globalConfig, showToast, addLog, logParticipantActivity, refreshParticipantCache]
  );

  const handleAssignServerServeArea = useCallback(
    async (person, rawValue) => {
      if (!person?.id || !currentEvent?.id) return;
      if (!hasAdminRights) return;
      if (!hasEventAccess(currentEvent.id)) {
        showToast('No tienes permisos para este evento.');
        return;
      }
      const personLoc = String(person.location || '').trim();
      if (!hasLocationAccess(personLoc, currentEvent.id)) {
        showToast('No tienes acceso a la sede de este registro.');
        return;
      }
      const next = String(rawValue ?? '').trim();
      const prev = String(person.assignedServeArea ?? '').trim();
      if (next === prev) return;
      try {
        await updateDoc(getDocRef('app_participants', String(person.id)), {
          assignedServeArea: next,
          ...(globalConfig?.isDebugMode ? { _isDebug: true, _debugSessionId: globalConfig.debugSessionId } : {}),
        });
        refreshParticipantCache(person, 'Área de servicio', {
          personId: person.id,
          patch: { assignedServeArea: next },
        });
        const _srvAreaLog = `Asignó área de servicio de ${person.name}: «${prev || '(sin asignar)'}» → «${next || '(sin asignar)'}».`;
        addLog(
          'Servidores',
          _srvAreaLog,
          null,
          null,
          { collectionName: 'app_participants', docId: String(person.id), action: 'update', previousData: person }
        );
        logParticipantActivity(String(person.id), 'servidor', _srvAreaLog);
        showToast(next ? 'Área de servicio actualizada.' : 'Área de servicio quitada.');
      } catch (e) {
        console.error(e);
        showToast('No se pudo guardar. Revisa conexión o permisos.');
      }
    },
    [currentEvent?.id, hasAdminRights, hasEventAccess, hasLocationAccess, globalConfig, showToast, addLog, logParticipantActivity, refreshParticipantCache]
  );

  useEffect(() => {
    if (!fbUser?.uid || !fbUser.email) return;
    let cancelled = false;
    (async () => {
      const pending = await findPendingStaffProfileForAuthEmail(fbUser);
      if (cancelled || !pending) return;
      updateDoc(getDocRef('app_users', String(pending.id)), {
        authUid: fbUser.uid,
        authEmail: fbUser.email,
      }).catch(console.error);
    })();
    return () => {
      cancelled = true;
    };
  }, [fbUser]);

  useEffect(() => {
    if (!fbUser || currentUser || loginInProgressRef.current) return;
    if (!usersAuthReady) return;
    const profile =
      users.find((u) => String(u.authUid) === String(fbUser.uid)) ||
      users.find(
        (u) => String(u.authEmail || '').toLowerCase() === String(fbUser.email || '').toLowerCase()
      ) ||
      users.find((u) => usernameToAuthEmail(u.username) === fbUser.email);
    if (!profile) return;
    let cancelled = false;
    (async () => {
      const tabSessionId = getTabSessionId();
      if (profile.role !== 'SuperUsuario') {
        const max = getMaxConcurrentSessionsForUser(profile);
        const others = await countOtherActiveSessions(profile.id, tabSessionId);
        if (cancelled) return;
        if (others >= max) {
          await signOut(auth);
          setLoginError(
            max <= 1
              ? 'Ya hay una sesión activa con este usuario en otra pestaña o dispositivo. Cierra esa sesión, usa «Salir» allí, o espera unos segundos e intenta de nuevo.'
              : `Este usuario ya alcanzó el máximo de sesiones simultáneas (${max}). Cierra una sesión en otro dispositivo o pestaña, o espera unos segundos e intenta de nuevo.`
          );
          return;
        }
      }
      await setDoc(getDocRef('app_sessions', sessionDocId(profile.id, tabSessionId)), {
        userId: String(profile.id),
        sessionId: tabSessionId,
        username: profile.username,
        lastHeartbeat: Date.now(),
        createdAt: Date.now(),
      });
      const loginTime = Date.now();
      const adminDefaultPref =
        (profile.username || '').toLowerCase() === 'admin' && profile.role === 'Administrador'
          ? 'Norte'
          : profile.preferredLandingTab || 'Summary';
      setCurrentUser({
        ...profile,
        tabSessionId,
        loginTime,
        allowedEventIds: getUserAllowedEventIds(profile),
        allowedLocations: getUserAllowedLocations(profile),
        preferredLandingTab: adminDefaultPref,
      });
      addLog(
        'Inicio de Sesión',
        `El usuario ${profile.username} recuperó sesión.${getSessionLogClientSuffix()}`,
        profile.username,
        { id: 'Global', name: 'Sistema' }
      );
      await updateDoc(getDocRef('app_users', String(profile.id)), {
        isOnline: true,
        onlineSince: Date.now(),
        ...buildClientVersionPatch(),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [fbUser, currentUser, users, usersAuthReady, addLog, getUserAllowedEventIds, getUserAllowedLocations]);

  useEffect(() => {
    if (!fbUser || !usersAuthReady || loginInProgressRef.current || currentUser) return;
    if (firestoreUsersError) {
      signOut(auth).catch(() => {});
      setLoginError(firestoreUsersError);
      return;
    }
    const profile =
      users.find((u) => String(u.authUid) === String(fbUser.uid)) ||
      users.find(
        (u) => String(u.authEmail || '').toLowerCase() === String(fbUser.email || '').toLowerCase()
      ) ||
      users.find((u) => usernameToAuthEmail(u.username) === fbUser.email);
    if (profile) return;
    signOut(auth).catch(() => {});
    setLoginError('Tu cuenta no tiene perfil en la aplicación. Contacta al administrador.');
  }, [fbUser, usersAuthReady, users, currentUser, firestoreUsersError]);

  const handleSavePanelNavConfig = useCallback(async () => {
    if (!isSuperUser) return;
    try {
      const nextNav = { ...DEFAULT_PANEL_NAV, ...panelNavForm };
      const deltas = [];
      for (const item of PANEL_NAV_CONFIG_ITEMS) {
        const wasOn = panelNavMerged[item.key] !== false;
        const nowOn = nextNav[item.key] !== false;
        if (wasOn !== nowOn) deltas.push(`${item.label}: ${nowOn ? 'visible' : 'oculto'}`);
      }
      await updateDoc(getDocRef('app_data', 'config'), {
        panelNav: nextNav
      });
      if (deltas.length > 0) {
        addLog('Gestión de Usuarios', `Permisos de menú (Editor/Lector): ${deltas.join('; ')}.`);
      }
      setPanelNavModalOpen(false);
      showToast('Menú lateral (Editor/Lector) actualizado.');
    } catch (e) {
      console.error(e);
      showToast('No se pudo guardar la configuración del menú.');
    }
  }, [isSuperUser, panelNavForm, panelNavMerged, addLog, showToast]);

  const handleSavePrivacyNoticeConfig = useCallback(async () => {
    if (!isSuperUser) return;
    setPrivacyNoticeSaving(true);
    try {
      const next = mergePrivacyNoticeConfig({
        ...privacyNoticeForm,
        updatedAt: new Date().toISOString(),
      });
      await updateDoc(getDocRef('app_data', 'config'), { privacyNotice: next });
      await setDoc(
        getDocRef(PUBLIC_PRIVACY_DOC_COLLECTION, PUBLIC_PRIVACY_DOC_ID),
        buildPublicPrivacyDocument(next)
      );
      setPrivacyNoticeModalOpen(false);
      addLog('Configuración', `Actualizó aviso de privacidad integral (v${next.version}).`);
      showToast('Aviso de privacidad guardado y publicado.');
    } catch (e) {
      console.error(e);
      const code = String(e?.code || '');
      showToast(
        code === 'permission-denied'
          ? 'Permiso denegado en Firestore. Despliega las reglas en la base «registros-vnpm» (colección app_public_documents): npx firebase-tools@latest deploy --only firestore:rules'
          : e?.message || 'No se pudo guardar el aviso de privacidad.'
      );
    } finally {
      setPrivacyNoticeSaving(false);
    }
  }, [isSuperUser, privacyNoticeForm, addLog, showToast]);

  const handleLogsVisibleInPanelBackfill = useCallback(async () => {
    if (!isSuperUser) return;
    if (
      !window.confirm(
        '¿Ejecutar backfill de visibleInPanel en logs existentes? Puede tardar varios minutos y consume lecturas/escrituras.'
      )
    ) {
      return;
    }
    setLogsVisibleBackfillBusy(true);
    try {
      const functions = getFunctions(app, 'us-central1');
      const fn = httpsCallable(functions, 'adminBackfillLogVisibleInPanel');
      const res = await fn({ maxDocs: 10000 });
      const d = res?.data || {};
      showToast(`Backfill visibleInPanel: ${d.updated ?? 0} documento(s) actualizado(s).`);
      await addLog('Actividad', `Backfill visibleInPanel: ${d.updated ?? 0} docs.`);
    } catch (e) {
      console.error(e);
      showToast(e?.message || 'No se pudo ejecutar el backfill de visibleInPanel.');
    } finally {
      setLogsVisibleBackfillBusy(false);
    }
  }, [isSuperUser, addLog, showToast]);

  const handleLogsTotalCountReconcile = useCallback(async () => {
    if (!isSuperUser) return;
    setLogsCountReconcileBusy(true);
    try {
      const functions = getFunctions(app, 'us-central1');
      const fn = httpsCallable(functions, 'adminReconcileLogsTotalCount');
      const res = await fn({});
      const n = Number(res?.data?.logsTotalCount);
      if (Number.isFinite(n)) setLogsTotalCount(n);
      showToast(`Conteo reconciliado: ${Number.isFinite(n) ? n.toLocaleString('es-MX') : '—'} registros.`);
    } catch (e) {
      console.error(e);
      showToast(e?.message || 'No se pudo reconciliar el conteo de logs.');
    } finally {
      setLogsCountReconcileBusy(false);
    }
  }, [isSuperUser, showToast]);

  const handleSaveLogStorageMaxEntries = useCallback(
    async (rawValue) => {
      if (!canDeleteSystemLogs(currentUser, fbUser) || globalConfig == null) {
        showToast('No tienes permiso para cambiar el límite global de actividad en Firestore.');
        return;
      }
      const n = clampLogsStorageLimit(rawValue);
      const prev = clampLogsStorageLimit(globalConfig.logStorageMaxEntries ?? LOGS_STORAGE_MAX_DEFAULT);
      setLogStorageMaxEntries(n);
      if (n === prev) {
        showToast(`El límite en Firestore ya es ${prev.toLocaleString('es-MX')} registros.`);
        return;
      }
      setLogStorageMaxSaving(true);
      try {
        await updateDoc(getDocRef('app_data', 'config'), {
          logStorageMaxEntries: n,
          logStorageMaxEntriesUpdatedAt: Date.now(),
        });
        await addLog(
          'Configuración',
          `Actualizó el límite global de registros de actividad: ${prev.toLocaleString('es-MX')} → ${n.toLocaleString('es-MX')}.`,
          null,
          { id: 'Global', name: 'Sistema' },
          { collectionName: 'app_data', docId: 'config', action: 'update', previousData: globalConfig }
        );
        try {
          const functions = getFunctions(app, 'us-central1');
          const fn = httpsCallable(functions, 'adminTrimActivityLogsNow');
          const res = await fn({});
          const deleted = Number(res?.data?.deleted) || 0;
          if (deleted > 0) {
            showToast(
              `Límite guardado. Se eliminaron ${deleted.toLocaleString('es-MX')} registro(s) antiguos por exceder ${n.toLocaleString('es-MX')}.`
            );
          } else {
            showToast(`Límite global guardado: máximo ${n.toLocaleString('es-MX')} registros en Firestore.`);
          }
        } catch (trimErr) {
          console.warn('Recorte inmediato no disponible; aplicará el job programado.', trimErr);
          showToast(
            `Límite guardado (${n.toLocaleString('es-MX')}). Despliega adminTrimActivityLogsNow o espera el recorte programado (cada 6 h).`
          );
        }
        await refreshLogsTotalCount(true);
        if (systemView === 'logs' && selectedEventId == null) {
          await refreshActivityLogsFromServer();
        }
      } catch (e) {
        console.error(e);
        setLogStorageMaxEntries(prev);
        showToast('No se pudo guardar el límite global de actividad.');
      } finally {
        setLogStorageMaxSaving(false);
      }
    },
    [
      currentUser,
      fbUser,
      globalConfig,
      addLog,
      showToast,
      refreshLogsTotalCount,
      refreshActivityLogsFromServer,
      systemView,
      selectedEventId,
    ]
  );

  const handlePrivacyConsentBackfill = useCallback(async () => {
    if (!isSuperUser) return;
    if (!window.confirm('¿Ejecutar backfill de consentimiento y purga en eventos vencidos? Esta acción no se puede deshacer.')) {
      return;
    }
    setPrivacyBackfillBusy(true);
    try {
      const functions = getFunctions(app, 'us-central1');
      const fn = httpsCallable(functions, 'adminBackfillPrivacyConsent');
      const res = await fn({});
      const d = res?.data || {};
      showToast(`Backfill completado: ${d.defaulted ?? 0} por defecto «No», ${d.purged ?? 0} purgados.`);
      addLog('Privacidad', `Backfill consentimiento: ${d.defaulted ?? 0} default No, ${d.purged ?? 0} purgados.`);
    } catch (e) {
      console.error(e);
      const code = String(e?.code || '');
      showToast(
        code === 'functions/permission-denied'
          ? 'Solo el SuperUsuario puede ejecutar el backfill de privacidad.'
          : e?.message || 'No se pudo ejecutar el backfill de privacidad.'
      );
    } finally {
      setPrivacyBackfillBusy(false);
    }
  }, [isSuperUser, addLog, showToast]);

  const handleSaveEditorRegFieldsConfig = useCallback(async () => {
    if (!hasAdminRights || !currentEvent) return;
    try {
      const next = mergeEditorRegistrationFieldVisibility(editorRegFieldsForm);
      if (editorRegFieldsScope === 'type') {
        const curr = globalConfig?.editorRegistrationFieldsByType && typeof globalConfig.editorRegistrationFieldsByType === 'object'
          ? globalConfig.editorRegistrationFieldsByType
          : {};
        await updateDoc(getDocRef('app_data', 'config'), {
          editorRegistrationFieldsByType: {
            ...curr,
            [currentEvent.eventType]: next,
          },
        });
        addLog('Configuración', `Actualizó campos del formulario para Editores en todos los eventos de tipo ${currentEvent.eventType}.`);
      } else {
        await updateDoc(getDocRef('app_events', currentEvent.id), {
          editorRegistrationFields: next,
          ...(globalConfig?.isDebugMode ? { _isDebug: true, _debugSessionId: globalConfig.debugSessionId } : {}),
        });
        addLog('Configuración', `Actualizó campos del formulario para Editores en el evento ${currentEvent.name}.`);
      }
      setEditorRegFieldsModalOpen(false);
      showToast('Formulario de nuevo registro (Editor) actualizado.');
    } catch (e) {
      console.error(e);
      showToast('No se pudo guardar la configuración del formulario.');
    }
  }, [hasAdminRights, currentEvent, editorRegFieldsForm, editorRegFieldsScope, globalConfig?.editorRegistrationFieldsByType, globalConfig?.isDebugMode, globalConfig?.debugSessionId, addLog, showToast]);

  const handleToggleHideMyExpenseConcepts = useCallback(async () => {
    if (!canAccessExpenses || !currentUser?.id) return;
    const live = users.find((u) => String(u.id) === String(currentUser.id));
    const next = !isHideMyExpenseConceptsOn(live);
    try {
      await updateDoc(getDocRef('app_users', String(currentUser.id)), { hideMyExpenseConcepts: next });
      addLog(
        'Gestión de Usuarios',
        `Permisos: ${live?.username || currentUser.username} ${next ? 'activó ocultar' : 'desactivó ocultar'} sus conceptos de gasto frente a otros usuarios.`
      );
      showToast(
        next
          ? 'Los gastos que registres se mostrarán como «Oculto» a otros (tú y SuperUsuario verán el concepto).'
          : 'Tus conceptos de gasto vuelven a ser visibles para quien tenga acceso a la lista.'
      );
    } catch (e) {
      console.error(e);
      showToast('No se pudo guardar la preferencia.');
    }
  }, [canAccessExpenses, currentUser?.id, users, addLog, showToast]);


  const summaryByCampaDashboardScope = useMemo(() => {
    /** `exportLocs === null` → recorrer todas las sedes del evento; array (puede ser []) → solo esas sedes (p. ej. export Excel con alcance del usuario). */
    const runAggregates = (scope, exportLocs = null, bautizosDashScopeOpt = 'all') => {
      const isCampaEv = currentEvent?.eventType === 'Campa';
      const bzEvtDash = false; // Bautizos event type unsupported in v2
      const bzScope = bzEvtDash ? normalizeBautizosDashboardScope(bautizosDashScopeOpt) : 'all';
      const locsToWalk = exportLocs != null ? exportLocs : (currentEvent?.locations || []);
      /**
       * Plan canónico de acompañantes para el alcance de sedes del agregado:
       * cada persona acompañante (deduplicada por cadena de vínculos y por nombre dentro del
       * subconjunto) se asigna a un único «host registrante». Usado para que ningún acompañante
       * cuente más de una vez al sumar asistentes Bautizos.
       */
      const canonByOwner = new Map();
      if (bzEvtDash) {
        const allActive = locsToWalk.flatMap((loc) =>
          (data[loc] || []).filter((p) => !participantIsCancelled(p))
        );
        const activeBautizadoRoster = allActive.filter(
          (p) => bzEvtNormalizeAttendanceType(p.bautizosAttendanceType) === BAUTIZOS_ATTENDANCE.bautizado
        );
        const bautizadoMeta = buildBautizadoMetaForCanonical(activeBautizadoRoster);
        const plan = bzEvtBuildCanonicalCompanionPlan(allActive, bautizadoMeta, { includeBaptizedCompanions: true });
        for (const info of plan.values()) {
          const rid = String(info.registrantId);
          if (!canonByOwner.has(rid)) canonByOwner.set(rid, []);
          canonByOwner.get(rid).push(info);
        }
      }
      const bautizosDedupeMeta =
        bzEvtDash
          ? buildActiveRegistrantMetaForCompanionDedupe(
              locsToWalk.flatMap((loc) => (data[loc] || []).filter((p) => !participantIsCancelled(p)))
            )
          : null;
    let totalMen = 0, totalWomen = 0, totalGenderUnspecified = 0;
    let totalSwimmers = 0, totalNonSwimmers = 0;
    let totalAllergies = 0, totalDiseases = 0, totalDisabilities = 0, totalServers = 0;
    let totalMinors = 0, totalAdults = 0, totalServersBoth = 0;
    /** Reparto por edad real (menores vs adultos); distinto del segmento Teens/Jóvenes donde un servidor mayor puede estar asignado a Teens. */
    let campaAgeUnder18 = 0, campaAge18Plus = 0;
    let asistenciaTeens = 0;
    let asistenciaJovenes = 0;
    let asistenciaAmbos = 0;
    let baptismsTeens = 0, baptismsJovenes = 0;
    let totalPaidOff = 0, totalWithDebt = 0;
    let totalAttendanceEmpleado = 0;
    let totalAttendanceCortesia = 0;
    let scholarshipTotalCount = 0;
    let scholarshipPartialCount = 0;
    let serverTeensExclusive = 0;
    let serverJovenesExclusive = 0;
    let serverAmbosCount = 0;

    // Sección 1: ingresos netos por Método y por Servicio (para gráficas)
    let paymentMethodTotals = {
      efectivo: { net: 0, gross: 0, countPayments: 0 },
      tarjeta: { net: 0, gross: 0, countPayments: 0 }
    };
    let paymentServiceTotals = {
      Primero: { efectivo: { net: 0, gross: 0, countPayments: 0 }, tarjeta: { net: 0, gross: 0, countPayments: 0 } },
      Segundo: { efectivo: { net: 0, gross: 0, countPayments: 0 }, tarjeta: { net: 0, gross: 0, countPayments: 0 } },
      Tercero: { efectivo: { net: 0, gross: 0, countPayments: 0 }, tarjeta: { net: 0, gross: 0, countPayments: 0 } }
    };
    
    let ageBrackets = { kids: 0, teens: 0, youngAdults: 0, adults: 0, seniors: 0, unspecified: 0 };
    const dashboardDemographicsAcc = {
      totalMen,
      totalWomen,
      totalGenderUnspecified,
      ageBrackets,
    };
    const bumpDashboardDemographics = (personLike, weight = 1) => {
      accumulateDashboardParticipantDemographics(dashboardDemographicsAcc, personLike, weight);
      totalMen = dashboardDemographicsAcc.totalMen;
      totalWomen = dashboardDemographicsAcc.totalWomen;
      totalGenderUnspecified = dashboardDemographicsAcc.totalGenderUnspecified;
      ageBrackets = dashboardDemographicsAcc.ageBrackets;
    };
    const bumpBautizosCanonicalCompanionsDemographics = (hostPerson, weight = 1) => {
      if (!bzEvtDash || !hostPerson?.id) return;
      const ownedCanons = canonByOwner.get(String(hostPerson.id)) || [];
      for (const info of ownedCanons) {
        if (
          !bautizosDashboardCompanionCountsForScope(
            info.sourceCompanion,
            bzScope,
            info.sourceRegistrant
          )
        ) {
          continue;
        }
        bumpDashboardDemographics(info.sourceCompanion, weight);
      }
    };

    let bloodTypeStats = {};
    bloodTypeStats[BLOOD_TYPE_UNSPECIFIED] = 0;
    BLOOD_TYPES_ABO_RH.forEach((bt) => {
      bloodTypeStats[bt] = 0;
    });
    bloodTypeStats[BLOOD_TYPE_OTHER_KEY] = 0;
    
    let customFieldsStats = {};
    if (currentEvent?.customFields) currentEvent.customFields.forEach(f => customFieldsStats[f] = {});

    let globalStats = {
      all: { count: 0, scholarship: 0, servers: 0, paid: 0, paidGross: 0, pending: 0, expected: 0 },
      regular: { count: 0, paid: 0, paidGross: 0, pending: 0, expected: 0 },
      scholarship: { count: 0, paid: 0, paidGross: 0, pending: 0, expected: 0 }
    };
    let locationStats = {};
    const travelStats = {};
    locsToWalk.forEach((from) => {
      travelStats[from] = {};
      locsToWalk.forEach((to) => {
        travelStats[from][to] = 0;
      });
    });

    if (currentEvent) {
      locsToWalk.forEach((loc) => {
        let stats = {
          all: { count: 0, scholarship: 0, servers: 0, paid: 0, paidGross: 0, pending: 0, expected: 0 },
          regular: { count: 0, paid: 0, paidGross: 0, pending: 0, expected: 0 },
          scholarship: { count: 0, paid: 0, paidGross: 0, pending: 0, expected: 0 }
        };
        [...(data[loc] || []), ...(cancelledData[loc] || [])].forEach((person) => {
          const allScopeDoubleWeight =
            isCampaEv &&
            scope === 'all' &&
            countAmbosDoubleInAllCounts &&
            participantCountsAsRealCostX2(person, currentEvent)
              ? 2
              : 1;
          if (!campaAttendanceScopeMatches(isCampaEv, person, scope)) return;
          const bzPartyMatch = !bzEvtDash || bautizosDashboardTitularCountsForScope(person, bzScope);
          const bzFinMatch = !bzEvtDash || bautizosDashboardIncludeRegistrationFinancials(person, bzScope);
          if (bzPartyMatch) {
          bumpDashboardDemographics(person, allScopeDoubleWeight);
          if (bzEvtDash && !participantIsCancelled(person)) {
            bumpBautizosCanonicalCompanionsDemographics(person, allScopeDoubleWeight);
          }
          if (isSiValue(person.canSwim)) totalSwimmers += allScopeDoubleWeight; else totalNonSwimmers += allScopeDoubleWeight;
          if (isSiValue(person.hasAllergy)) totalAllergies += allScopeDoubleWeight;
          if (isSiValue(person.hasDisease)) totalDiseases += allScopeDoubleWeight;
          if (isSiValue(person.hasDisability)) totalDisabilities += allScopeDoubleWeight;
          if (!participantIsCancelled(person)) {
            if (bzEvtDash) {
              if (bautizosParticipatesAsServer(person)) {
                totalServers += allScopeDoubleWeight;
                stats.all.servers += allScopeDoubleWeight;
              }
            } else if (isSiValue(person.isServer)) {
              totalServers += allScopeDoubleWeight;
              stats.all.servers += allScopeDoubleWeight;
            }
          }
          
          const bloodClass = classifyBloodTypeForStats(person.bloodType);
          if (bloodClass) {
            bloodTypeStats[bloodClass] = (bloodTypeStats[bloodClass] || 0) + allScopeDoubleWeight;
          }

          const ageNum = resolveDashboardParticipantAgeYears(person) || 0;

          if (currentEvent.eventType === 'Campa' && !participantIsCancelled(person)) {
            if (ageNum > 0) {
              if (ageNum < 18) campaAgeUnder18++;
              else campaAge18Plus++;
            }
            if (isSiValue(person.isServer)) {
              const sa = String(person.serverAssignment || '').trim();
              if (sa === 'Teens') {
                totalMinors += allScopeDoubleWeight;
                serverTeensExclusive += allScopeDoubleWeight;
              } else if (sa === 'Jóvenes') {
                totalAdults += allScopeDoubleWeight;
                serverJovenesExclusive += allScopeDoubleWeight;
              } else if (sa === 'Ambos') {
                const mix = getAmbosServeInSegmentOrEmpty(person);
                if (mix === 'Teens') {
                  totalMinors += allScopeDoubleWeight;
                  serverTeensExclusive += allScopeDoubleWeight;
                } else if (mix === 'Jóvenes') {
                  totalAdults += allScopeDoubleWeight;
                  serverJovenesExclusive += allScopeDoubleWeight;
                } else {
                  totalMinors += allScopeDoubleWeight;
                  totalAdults += allScopeDoubleWeight;
                  totalServersBoth += allScopeDoubleWeight;
                  serverAmbosCount += allScopeDoubleWeight;
                }
              }
            } else {
              const assignment = person.campAssignment || (ageNum < 18 ? 'Teens' : 'Jóvenes');
              if (assignment === 'Teens') totalMinors += allScopeDoubleWeight;
              else totalAdults += allScopeDoubleWeight;
            }
            const bSeg = getBaptismAccountingSegment(person);
            if (bSeg === 'Teens') baptismsTeens += allScopeDoubleWeight;
            else if (bSeg === 'Jóvenes') baptismsJovenes += allScopeDoubleWeight;
            {
              const att = normalizeAttendanceSpecial(person);
              if (att === ATTENDANCE_SPECIAL.empleado) totalAttendanceEmpleado += allScopeDoubleWeight;
              else if (att === ATTENDANCE_SPECIAL.cortesia) totalAttendanceCortesia += allScopeDoubleWeight;
            }
            const segAsist = getCampaAttendanceSegment(person);
            if (segAsist === 'Teens') asistenciaTeens += allScopeDoubleWeight;
            else if (segAsist === 'Jóvenes') asistenciaJovenes += allScopeDoubleWeight;
            else if (segAsist === 'Ambos') asistenciaAmbos += allScopeDoubleWeight;
          }

          if (currentEvent.eventType === 'General' && currentEvent.customFields) {
            currentEvent.customFields.forEach(field => {
              const val = person.customData?.[field]?.trim() || 'Sin especificar';
              customFieldsStats[field][val] = (customFieldsStats[field][val] || 0) + 1;
            });
          }
          }

          const paidGross = getParticipantNetPaidFromHistory(person, computeNetAmountByMethod);
          const paymentHistoryRows = (person.paymentHistory || []).filter(
            (h) => h && h.kind !== 'comment' && h.kind !== REFUND_DISBURSEMENT_PAYMENT_KIND
          );
          const paidNetRaw =
            paymentHistoryRows.length > 0
              ? paymentHistoryRows.reduce((sum, h) => {
                  const amt = Number(h.amount || 0) || 0;
                  const method = h.method || (person.paymentMethod === 'Tarjeta' ? 'Tarjeta' : 'Efectivo');
                  return sum + computeNetAmountByMethod(amt, method);
                }, 0)
              : computeNetAmountByMethod(paidGross, person.paymentMethod);
          const paidNet = paidNetRaw;
          const isBecado = isSiValue(person.isScholarship);
          const isCancelled = participantIsCancelled(person);
          const baseCost = resolveRegisteredCost(person, currentPricing);
          const liqTarget = getLiquidationTarget(person);
          const bzAlloc = bzEvtDash
            ? allocateBautizosDashboardPayments(
                person,
                currentEvent,
                bautizosDedupeMeta,
                liqTarget,
                person.paymentHistory,
                paidGross,
                person.paymentMethod,
                computeNetAmountByMethod
              )
            : null;
          let addExpected = liqTarget;
          let addPendingGross = Math.max(0, liqTarget - paidGross);
          if (bzAlloc && bautizosDashboardScopeUsesSplitPayments(bzScope)) {
            if (bzScope === 'companions') {
              addExpected = bzAlloc.companionOwed;
              addPendingGross = Math.max(0, bzAlloc.companionOwed - bzAlloc.paidGrossCompanion);
            } else if (bzScope === 'baptized') {
              addExpected = bzAlloc.titularOwed;
              addPendingGross = Math.max(0, bzAlloc.titularOwed - bzAlloc.paidGrossTitular);
            }
          }

          if (!isCancelled) {
            const applyBautizosPaymentStatusToTotals = (ownedCanons) => {
              const units = buildBautizosDashboardLiquidationUnits(
                person,
                currentEvent,
                bautizosDedupeMeta,
                liqTarget,
                { bzScope, canonicalCompanionInfos: ownedCanons }
              );
              const { paidOff, withDebt } = countBautizosFifoLiquidationUnits(units, paidGross);
              totalPaidOff += paidOff * allScopeDoubleWeight;
              totalWithDebt += withDebt * allScopeDoubleWeight;
            };

            if (bzPartyMatch) {
              if (bzEvtDash) {
                const ownedCanons = (canonByOwner.get(String(person.id)) || []).filter((info) =>
                  bautizosDashboardCompanionCountsForScope(
                    info.sourceCompanion,
                    bzScope,
                    info.sourceRegistrant
                  )
                );
                applyBautizosPaymentStatusToTotals(ownedCanons);
              } else {
                if (paidGross >= liqTarget) totalPaidOff += allScopeDoubleWeight;
                else totalWithDebt += allScopeDoubleWeight;
              }

              stats.all.count += allScopeDoubleWeight;
              if (isBecado && currentEvent.eventType === 'Campa') {
                stats.all.scholarship += allScopeDoubleWeight;
                stats.scholarship.count += allScopeDoubleWeight;
                stats.scholarship.pending += Math.max(0, liqTarget - paidGross);
                stats.scholarship.expected += liqTarget;
                if (String(person.scholarshipType || '').toLowerCase() === 'partial') scholarshipPartialCount += allScopeDoubleWeight;
                else scholarshipTotalCount += allScopeDoubleWeight;
              } else {
                stats.regular.count += allScopeDoubleWeight;
                stats.regular.pending += addPendingGross;
                stats.regular.expected += addExpected;
              }
            } else if (!(isBecado && currentEvent.eventType === 'Campa') && bzFinMatch) {
              stats.regular.pending += addPendingGross;
              stats.regular.expected += addExpected;
            }
            if (bzPartyMatch && false /* Bautizos unsupported in v2 */) {
              /**
               * Cada acompañante se cuenta una sola vez (plan canónico), respetando
               * Todos / Bautizados / Acompañantes en el conteo del dashboard.
               */
              const ownedCanons = canonByOwner.get(String(person.id)) || [];
              const compN = ownedCanons.filter((info) =>
                bautizosDashboardCompanionCountsForScope(
                  info.sourceCompanion,
                  bzScope,
                  info.sourceRegistrant
                )
              ).length;
              if (compN > 0) {
                stats.all.count += compN;
                if (isBecado && currentEvent.eventType === 'Campa') {
                  stats.scholarship.count += compN;
                } else {
                  stats.regular.count += compN;
                }
              }
            }
            if (!bzPartyMatch && false /* Bautizos unsupported in v2 */ && bzScope === 'companions') {
              const ownedCanons = canonByOwner.get(String(person.id)) || [];
              const compN = ownedCanons.filter((info) =>
                bautizosDashboardCompanionCountsForScope(
                  info.sourceCompanion,
                  'companions',
                  info.sourceRegistrant
                )
              ).length;
              if (compN > 0) {
                stats.all.count += compN;
                stats.regular.count += compN;
                applyBautizosPaymentStatusToTotals(
                  ownedCanons.filter((info) =>
                    bautizosDashboardCompanionCountsForScope(
                      info.sourceCompanion,
                      'companions',
                      info.sourceRegistrant
                    )
                  )
                );
                bumpBautizosCanonicalCompanionsDemographics(person, 1);
              }
            }
          }

          // Recaudado físico en caja: abonos netos de devoluciones ya entregadas.
          let finNet = paidNet;
          let finGross = paidGross;
          if (bzAlloc && bautizosDashboardScopeUsesSplitPayments(bzScope)) {
            if (bzScope === 'companions') {
              finNet = bzAlloc.paidNetCompanion;
              finGross = bzAlloc.paidGrossCompanion;
            } else if (bzScope === 'baptized') {
              finNet = bzAlloc.paidNetTitular;
              finGross = bzAlloc.paidGrossTitular;
            }
          } else {
            const enriched = enrichPaymentHistoryWithRefundDisbursements(person, computeNetAmountByMethod);
            if (enriched.length > 0) {
              finGross = Math.max(
                0,
                enriched.reduce((sum, h) => sum + (Number(h.amount) || 0), 0)
              );
              finNet = Math.max(
                0,
                enriched.reduce((sum, h) => {
                  const method = h.method === 'Tarjeta' ? 'Tarjeta' : 'Efectivo';
                  const amt = Number(h.amount) || 0;
                  if (Number.isFinite(Number(h.netAmount))) return sum + Number(h.netAmount);
                  return sum + computeNetAmountByMethod(amt, method);
                }, 0)
              );
            } else {
              finGross = getParticipantPhysicalRecaudadoGross(person, paidGross);
              finNet = getParticipantPhysicalRecaudadoNet(person, paidNet, computeNetAmountByMethod);
            }
          }
          if (bzFinMatch) {
          stats.all.paid += finNet;
          stats.all.paidGross += finGross;
          if (isBecado && currentEvent.eventType === 'Campa') {
            stats.scholarship.paid += finNet;
            stats.scholarship.paidGross += finGross;
          } else {
            stats.regular.paid += finNet;
            stats.regular.paidGross += finGross;
          }

          // Totales de pagos por método/servicio (para gráficas)
          const addPaymentLineToTotals = (method, service, gross, net) => {
            if (method === 'Tarjeta') {
              paymentMethodTotals.tarjeta.net += net;
              paymentMethodTotals.tarjeta.gross += gross;
              paymentMethodTotals.tarjeta.countPayments += 1;
              if (service && paymentServiceTotals[service]) {
                paymentServiceTotals[service].tarjeta.net += net;
                paymentServiceTotals[service].tarjeta.gross += gross;
                paymentServiceTotals[service].tarjeta.countPayments += 1;
              }
            } else {
              paymentMethodTotals.efectivo.net += net;
              paymentMethodTotals.efectivo.gross += gross;
              paymentMethodTotals.efectivo.countPayments += 1;
              if (service && paymentServiceTotals[service]) {
                paymentServiceTotals[service].efectivo.net += net;
                paymentServiceTotals[service].efectivo.gross += gross;
                paymentServiceTotals[service].efectivo.countPayments += 1;
              }
            }
          };
          if (bzAlloc && bautizosDashboardScopeUsesSplitPayments(bzScope)) {
            for (const r of bzAlloc.historyRows) {
              const method = r.method || (person.paymentMethod === 'Tarjeta' ? 'Tarjeta' : 'Efectivo');
              const serviceRaw = r.service;
              const service = SERVICE_OPTIONS.includes(serviceRaw)
                ? serviceRaw
                : SERVICE_OPTIONS.includes(person.paymentService)
                  ? person.paymentService
                  : '';
              const gross = bzScope === 'companions' ? r.payCG : r.payTG;
              const net = bzScope === 'companions' ? r.netC : r.netT;
              addPaymentLineToTotals(method, service, gross, net);
            }
          } else {
            const history = person.paymentHistory || [];
            for (const h of history) {
              if (h.kind === 'comment' || h.kind === REFUND_DISBURSEMENT_PAYMENT_KIND) continue; // Comentarios y devoluciones no alteran recaudado
              const method = h.method || (person.paymentMethod === 'Tarjeta' ? 'Tarjeta' : 'Efectivo');
              const service = SERVICE_OPTIONS.includes(h.service)
                ? h.service
                : SERVICE_OPTIONS.includes(person.paymentService)
                  ? person.paymentService
                  : '';
              const rawGross = Number(h.amount || 0) || 0;
              addPaymentLineToTotals(
                method,
                service,
                rawGross,
                computeNetAmountByMethod(rawGross, method)
              );
            }
          }
          }

          if (bzPartyMatch) {
            const fromLoc = person.travelFrom || person.location || loc;
            const toLoc = person.travelTo || person.location || loc;
            if (!travelStats[fromLoc]) travelStats[fromLoc] = {};
            travelStats[fromLoc][toLoc] = (travelStats[fromLoc][toLoc] || 0) + 1;
          }
        });

        stats.all.pending = stats.regular.pending;
        stats.all.expected = stats.regular.expected + stats.scholarship.expected;

        globalStats.all.count += stats.all.count;
        globalStats.all.scholarship += stats.all.scholarship;
        globalStats.all.servers += stats.all.servers;
        globalStats.all.paid += stats.all.paid;
        globalStats.all.paidGross += stats.all.paidGross;
        globalStats.all.pending += stats.all.pending;
        globalStats.all.expected += stats.all.expected;
        globalStats.regular.count += stats.regular.count;
        globalStats.regular.paid += stats.regular.paid;
        globalStats.regular.paidGross += stats.regular.paidGross;
        globalStats.regular.pending += stats.regular.pending;
        globalStats.regular.expected += stats.regular.expected;
        globalStats.scholarship.count += stats.scholarship.count;
        globalStats.scholarship.paid += stats.scholarship.paid;
        globalStats.scholarship.paidGross += stats.scholarship.paidGross;
        globalStats.scholarship.pending += stats.scholarship.pending;
        globalStats.scholarship.expected += stats.scholarship.expected;
        
        locationStats[loc] = stats;
      });
    }

    const serverTeensInclusive = serverTeensExclusive + serverAmbosCount;
    const serverJovenesInclusive = serverJovenesExclusive + serverAmbosCount;

    return {
      totalMen, totalWomen, totalGenderUnspecified, totalSwimmers, totalNonSwimmers,
      totalAllergies, totalDiseases, totalDisabilities, totalServers,
      totalMinors, totalAdults, campaAgeUnder18, campaAge18Plus, totalServersBoth, totalPaidOff, totalWithDebt,
      baptismsTeens, baptismsJovenes,
      totalAttendanceEmpleado, totalAttendanceCortesia,
      scholarshipTotalCount, scholarshipPartialCount,
      serverTeensExclusive, serverJovenesExclusive, serverAmbosCount,
      serverTeensInclusive, serverJovenesInclusive,
      asistenciaTeens, asistenciaJovenes, asistenciaAmbos,
      ageBrackets, bloodTypeStats, customFieldsStats, locationStats, globalStats,
      paymentMethodTotals, paymentServiceTotals, travelStats
    };
    };
    const all = runAggregates('all', null, 'all');
    if (false /* Bautizos unsupported in v2 */) {
      const bautizosByScope = {};
      for (const scopeId of BAUTIZOS_DASHBOARD_SCOPE_IDS) {
        bautizosByScope[scopeId] = scopeId === 'all' ? all : runAggregates('all', null, scopeId);
      }
      return { all, teens: all, jovenes: all, bautizosByScope, runAggregates };
    }
    if (currentEvent?.eventType !== 'Campa') {
      return { all, teens: all, jovenes: all, runAggregates };
    }
    return {
      all,
      teens: runAggregates('teens', null, 'all'),
      jovenes: runAggregates('jovenes', null, 'all'),
      runAggregates,
    };
  }, [data, cancelledData, currentEvent, currentPricing, resolveRegisteredCost, getLiquidationTarget, computeNetAmountByMethod, countAmbosDoubleInAllCounts, summaryCampaScopes]);

  /** Agregados del dashboard limitados a las sedes visibles del usuario (igual criterio que tarjetas de conteo). */
  const dashboardSummaryScoped = useMemo(() => {
    const base = summaryByCampaDashboardScope;
    if (!base?.runAggregates) return base;
    const exportLocs = dashboardHasFullLocationAccess ? null : dashboardLocations;
    const { runAggregates } = base;
    const all = runAggregates('all', exportLocs, 'all');
    const et = currentEvent?.eventType;
    if (false /* Bautizos unsupported in v2 */) {
      const bautizosByScope = {};
      for (const scopeId of BAUTIZOS_DASHBOARD_SCOPE_IDS) {
        bautizosByScope[scopeId] = scopeId === 'all' ? all : runAggregates('all', exportLocs, scopeId);
      }
      return { ...base, all, teens: all, jovenes: all, bautizosByScope, runAggregates };
    }
    if (et === 'Campa') {
      return {
        ...base,
        all,
        teens: runAggregates('teens', exportLocs, 'all'),
        jovenes: runAggregates('jovenes', exportLocs, 'all'),
        runAggregates,
      };
    }
    return { ...base, all, teens: all, jovenes: all, runAggregates };
  }, [
    summaryByCampaDashboardScope,
    dashboardHasFullLocationAccess,
    dashboardLocations,
    currentEvent?.eventType,
  ]);

  /** Métricas del dashboard acotadas a las sedes que el usuario puede ver (Administrador/SuperUsuario = evento completo). */
  const summaryForExcelExport = useMemo(() => {
    const { runAggregates, all } = summaryByCampaDashboardScope;
    if (typeof runAggregates !== 'function') return all;
    if (dashboardHasFullLocationAccess) return all;
    return runAggregates('all', dashboardLocations);
  }, [summaryByCampaDashboardScope, dashboardHasFullLocationAccess, dashboardLocations]);

  const summary = dashboardSummaryScoped.all;

  const getDashboardSummaryForCampaScope = useCallback(
    (sectionKey) => {
      if (false) {
        const bz = resolveBautizosDashboardGlobalScope(summaryCampaScopes);
        if (bz === 'all') return dashboardSummaryScoped.all;
        return dashboardSummaryScoped.bautizosByScope?.[bz] || dashboardSummaryScoped.all;
      }
      const campaSeg = summaryCampaScopes[sectionKey] || 'all';
      if (!isCampa || campaSeg === 'all') return dashboardSummaryScoped.all;
      if (campaSeg === 'teens') return dashboardSummaryScoped.teens;
      if (campaSeg === 'jovenes') return dashboardSummaryScoped.jovenes;
      return dashboardSummaryScoped.all;
    },
    [isCampa, summaryCampaScopes, dashboardSummaryScoped]
  );

  /** Botones Todos / Teens / Jóvenes por tarjeta o sección del dashboard (Campa). */
  const buildExcelExportSectionAvailability = useCallback(() => {
    const et = currentEvent?.eventType;
    const campa = et === 'Campa';
    const bautizos = false /* Bautizos unsupported in v2 */;
    return {
      comisionTarjeta: !!hasFinancialAccess,
      dashboard: isPanelNavSectionAllowed('dashboard'),
      bautizados: isPanelNavSectionAllowed('bautizados') && (campa || bautizos),
      locations: isPanelNavSectionAllowed('locations'),
      registroGlobal: isPanelNavSectionAllowed('registroGlobal'),
      asistentes: bautizos && isPanelNavSectionAllowed('bautizados'),
      becados: isPanelNavSectionAllowed('becados'),
      serversPage: isPanelNavSectionAllowed('serversPage') && (campa || bautizos),
      expenseList: isPanelNavSectionAllowed('expenseList') && canAccessExpenses,
      cashCut: isPanelNavSectionAllowed('cashCut'),
      responsivas:
        isPanelNavSectionAllowed('responsivas') &&
        hasAdminRights &&
        isResponsivaEventSectionVisible(currentEvent),
      transporte: isPanelNavSectionAllowed('transporte'),
    };
  }, [
    currentEvent,
    hasFinancialAccess,
    isPanelNavSectionAllowed,
    canAccessExpenses,
    hasAdminRights,
  ]);

  // EXPORT TO EXCEL FEATURE
  const bautizosCompanionChipCountByRegistrant = EMPTY_BZ_ROSTER_INDEX.companionChipCountByRegistrant;

  /* __WIRED_SCOPE_BAGS__ */
  const __appMainLiveScope = {
    ATTENDANCE_SPECIAL, AlertCircle, BACKUP_RETENTION_MONTHS, Bug, CAR_DATA_FILTER_OPTIONS, CheckCircle2, ChevronDown, ChevronUp, Church, Clock, CopyButton, CreditCard, DEFAULT_PANEL_NAV, EDITOR_LECTOR_PANEL_DEFAULT,
    EXCEL_ROSTER_FINANCE_COL_COUNT, Edit3, EmailAuthProvider, FileSignature, Filter, Gift, GoogleAuthProvider, GraduationCap, Heart, History,
    LOGS_ORDER_FIELD, LOGS_SERVER_CHUNK, LOGS_STORAGE_MAX_DEFAULT, LOGS_STORAGE_MAX_HARD_MAX, LOGS_STORAGE_MAX_MIN, LOG_STATUS, LogOut, MASKED_EXPENSE_CONCEPT_LABEL, MapPin, MessageSquare,
    PANEL_NAV_CONFIG_ITEMS, PANEL_NAV_SIDEBAR_ITEMS, PARTICIPANT_STATUS_ARCHIVED, PARTICIPANT_STATUS_CANCELLED, Percent, Phone, ROSTER_QUICK_ACTIONS_ROW_PRIMARY, Receipt, RosterPersonOfInterestButton, RosterResponsivaLocalButton,
    RosterResponsivaWaButton, RosterWhatsAppButton, SESSION_TTL_MS, SI, Scissors, ShieldAlert, Suspense, Trash2, UserCircle, Users,
    activeRosterUnitsByEventId, activityLogPassesListFilters, addLog, allKnownLocationNames, allParticipants, anonymousAuthPanel, app, appendOlderLogPage, applyKeyValueSheetStyles,
    applyLandingSedeToNewUserState, applyRevert, applyRosterSheetStyles, applyStandardDataTableStyles, applyStructuredReportSheetStyles, applyWorksheetColumnWidths, archiveViewSearch, archiveViewSort, archivedParticipantsArchiveViewList, archivedParticipantsForView,
    backfillActiveRosterBusy, bautizosCompanionChipCountByRegistrant, bautizosGlobalRegistryFinanceOpts, btnPrimary, btnSecondary, buildBusGroupSections, buildCarDataRequestWhatsAppMessage, buildCashCutWeekAndSundayMaps,
    buildExcelExportFilename, buildExcelExportSectionAvailability, buildExcelWeeklyAbonoColumnDefs, buildLogDateRangeForThisMonth, buildLogDateRangeForThisWeek, buildLogDateRangeForToday, buildMergedFinanceWhatsAppMessage, buildParticipantWeeklyAbonoCells, buildPreRestoreBackupId, buildTransportPlanningLines,
    buildUsernameCandidates, bulkResyncBusy, calculateAgeFromBirthDate, canArchiveRegistrationsFlag, canCancelRegistrations, canCancelRegistrationsFlag, canDelegateCancelRegistrations, canDeleteSystemLogs,
    canEditAbonosAndPaymentHistory, canEditRegistryDates, canMarkPersonsOfInterest, canMarkPersonsOfInterestFlag, canQuickActionResponsivaDigital, canQuickActionResponsivaLocal, canQuickActionWhatsApp, canSeeExpenseConceptForRow, canSeeMoney, cardCommissionPctDraft, clampAdminMaxConcurrentSessions, clampLogsStorageLimit, collectCashCutAllPayments, commitDeleteRefsInBatches, commitSetPayloadsInBatches, companionCollisionsInEvent, compareParticipantsByRegisteredAtAsc,
    computeManualCostCreditExpenseRows, computeNetAmountByMethod, computeScholarshipAutoExpenseRows, countAmbosDoubleInAllCounts, countOtherActiveSessions, createEmptyGlobalRegistryListFilters, currentEvent, currentPricing, currentUser,
    darkMode, dashboardHasFullLocationAccess, data, db, debugToast, deleteDoc, deleteEventModal, deleteField, deleteUserConfirmModal, donations,
    downloadExcelBytes, draggedEventId, editRegistryModal, editingUser, editingUserPlainPwdVisible, enrichBackupEventsWithParticipantLocations, eventDateDraft, events, excelExportAccessibleLocations, exitLogsRangeMode,
    expandedLogId, expenses, extractLogMillis, fieldStack, filterAge, filterAssignment, filterBaptism, filterCarDataPending,
    filterFirstTimeId, filterGender, filterLiquidation, filterMaritalStatus, filterMedical, filterPaymentType, filterPendingRefund, filterResponsiva, filterRosterRole, filterScholarship,
    filterSwim, filterTransport, filterTravelFrom, filterTravelTo, filterWhatsAppPending, finalizeStaffPanelSignOut, formatAnonymousAuthAgeMinutes, formatBrowserLocalDateTimeLabel, formatCashCutWeekRangeLabel, formatDisplayDate,
    formatDuration, formatEventDateRangeLabel, formatLocalDateId, formatMoney, formatPayHistoryRowDate, formatSiNo, generateVnpPersonId, getAutoPaymentService, getBaptismAccountingSegment, getCardCommissionRate, getColRef, getDoc, getDocFromServer, getDocs, getDocsFromServer, getEditableScopedEvents, getFlattenedAllowedLocationsFromEventMap,
    getGeneralRegistrationCommentsForDisplay, getLiquidationTarget, getRosterFilterStateSnapshot, getLogDateISO, getMaxConcurrentSessionsForUser, getParticipantNetPaidFromHistory, getParticipantOutstandingGross, getPersonCost, getPricingFromSnapshot, getResponsivaCardUiState, getResponsivaSignatureImageUrl,
    getScholarshipCondonedAmount, getTabSessionId, getUserAllowedEventIds, getUserAllowedLocations, getWeekKeyFromDate, getWhatsAppMessageHistoryRows, getWhatsAppNotificationMarkKey, globalConfig, globalLocationFilters, globalLocationsDropdownOpen,
    globalRegistryFiltersDropdownOpen, globalRegistryListFilters, globalRegistrySearchFieldId, handleBackfillEventActiveRosterTotals, handleLogsTotalCountReconcile, handleLogsVisibleInPanelBackfill, handleReloadAfterBulkRestore, handleSaveLogStorageMaxEntries, handleTogglePersonOfInterest, hasAdminRights,
    hasFinancialAccess, hasValidFullName, includeCortesiaInRealCost, includeEmpleadoInRealCost, includePastorInRealCost, inputClasses, isAddEventModalOpen, isCampa, isDailyBackupDue,
    isDerivedAutoExpenseIdForEvent, isDesayunoEvent, isEditorOrLector, isFreeAttendanceType, isGeneral, isResponsivaEnabled, isResponsivaEnabledForEvent, isSiValue, isStaffPanelLogoutInProgress, isSuperUser,
    isRegisteringRef, isValidPartialScholarshipInitialPaid, labelClasses, limit, linkWithCredential, loadAppBackupMerged, loadLogsInDateRange, loadSheetJS, location, logBulkDeleteBusy, logBulkDeleteInFlightRef,
    logDateFrom, logDateMode, logDateTo, logFilterAction, logFilterContext, logFilterUsername, logOldestBulkDeleteCountInput, logRecentBaseLimit, logSearchTerm, logSpecificDay,
    logSpecificMonth, logSpecificWeek, logStorageMaxEntries, logStorageMaxSaving, logoutBusy, logoutConfirmOnBackOpen, logs, logsCountReconcileBusy, logsFullSearchMode, logsGlobalSearchConfirmed,
    logsHasMoreOlder, logsLoading, logsLoadingMore, logsMobileMenuOpen, logsMonthConfirmOpen, logsRangeActive, logsRangeLoading, logsSearchScanning, logsTotalCount, logsTotalCountLoading,
    logsVisibleBackfillBusy, mapStaffLoginFirebaseError, mergeEditorRegistrationFieldVisibility, mergeEventDonationsForEvent, mergePrivacyNoticeConfig, mergedPrivacyNotice, needsFirestoreResyncAfterBulk, newEntryWithEditorDefaults, newEventData, newUser,
    newUserModalOpen, normalizeAttendanceSpecial, normalizeAuthEmail, normalizeBaptismShirtSize, normalizeWhatsAppPhone, panelNavMerged, parseFlexibleInstantMs, participantActivityEntriesById, participantActivityExpandedId, participantActivityLoadingId,
    participantExpandCache, participantHasBaptismChip, participantIsActiveInEvent, participantIsActiveInRoster, participantIsCancelled, participantIsRosterRow, participantIsWaitlistRow, participantRegisteredViaPublicLink, passengersForBusGroup, performAppFullBackup,
    personLikeIsPersonOfInterest, personOfInterestVnpSet, privacyNoticePublicUrl, pruneEventScopedAccessMap, query, reauthenticateWithCredential, refreshActivityLogsFromServer, refreshLogsTotalCount, registrationRequiresResponsivaStatus, registryConfirmBusy,
    renameModal, resetStaffPanelAfterSignOut, resolveCashCutRefundServiceLabel, resolveGlobalRegistryFinanceHost, resolveLlegaEnCarro, resolvePreferredLandingTab, resolveRegisteredCost, resolveRegresaEnCarro,
    resolveStaffLoginEmail, resolveTransportSummary, responsivaLinkBusyId, responsivaLocalBusyId, responsivaPipelineSectionTitle, responsivaStatusValidationLabel, restoreModal, revokeSessionsConfirmModal, rosterInlineEditExpandedId, scheduledBackupAsyncLock,
    secondaryAuth, selectedEventId, selectedLogs, sendPasswordResetEmail, sessionDocId, setAnonymousAuthPanel, setArchiveViewSearch, setArchiveViewSort, setCurrentUser, setDeleteEventModal,
    setDeleteUserConfirmModal, setDoc, setDraggedEventId, setEditingUser, setEditingUserPlainPwdVisible, setEvents, setExcelExportModal, setExpandedDupGroups, setExpandedDupPersons, setExpandedLogId,
    setExpandedRows, setGlobalLocationFilters, setGlobalLocationsDropdownOpen, setGlobalRegistryFiltersDropdownOpen, setGlobalRegistryListFilters, setIsAddEventModalOpen, setIsExporting, setLogBulkDeleteBusy, setLogDateFrom, setLogDateMode,
    setLogDateTo, setLogFilterAction, setLogFilterContext, setLogFilterUsername, setLogOldestBulkDeleteCountInput, setLogRecentBaseLimit, setLogSearchTerm, setLogSpecificDay, setLogSpecificMonth, setLogSpecificWeek,
    setLogStorageMaxEntries, setLogoutBusy, setLogoutConfirmOnBackOpen, setLogsFullSearchMode, setLogsGlobalSearchConfirmed, setLogsMobileMenuOpen, setLogsMonthConfirmOpen, setNewEventData, setNewUser, setNewUserModalOpen,
    setPanelNavForm, setPanelNavModalOpen, setParticipantActivityEntriesById, setParticipantActivityExpandedId, setParticipantActivityLoadingId, setParticipantExpandCache, setPaymentModal, setPrivacyNoticeForm, setPrivacyNoticeModalOpen, setRegistryConfirmModal,
    setRenameModal, setRestoreModal, setRevokeSessionsConfirmModal, setRosterInlineEditExpandedId, setSelectedLogs, setShowDebugLogs, setStaffPanelLogoutInProgress, setUserAccessScopeOpenId, setUsersMobileMenuOpen, setUsersPanelSearch,
    shouldBlockSensitiveHealthWithoutConsent, showDebugLogs, showToast, signInWithEmailAndPassword, signInWithPopup, signOut, sortBy, sortedEvents, summary,
    summaryForExcelExport, superSessionCount, syncEventAfterWrite, systemView, toLocalISODate, toast, toggleDarkMode, toggleDebugMode, uiDropdown, uiFilter,
    uiModal, uiRosterSearch, updateDoc, updatePassword, useCallback, useEffect, useRef, userAccessScopeOpenId, userCanDeleteAbonoNote, userCanDeletePaymentHistoryRow,
    userCanDeleteRegistrationComment, userCanMarkResponsivaLocalQuickAction, userCanOpenAbonoNoteEditModal, userCanSendResponsivaDigitalQuickAction, userCanSendWhatsAppQuickAction, usernameToAuthEmail, users, usersAuthReady, usersFilteredInPanel, usersMobileMenuOpen,
    usersPanelSearch, usersVisibleInPanel, visibleEvents, visibleLocations, where, writeStaffSessionLogOnce,
    buildGenericManualWhatsAppMessage, cancelledData, fbUser, filterPaymentMethod, filterPersonOfInterest, getDocRef, hasEventAccess, hasLocationAccess, logParticipantActivity, rearmEventHubBackGuard, refreshParticipantCache, removeResponsivaArtifactsForParticipant, spouseLinkSearchEdit, spouseLinkSearchNew, summaryCampaScopes, summaryFilterAssignment, summaryFilterBaptism, summaryFilterScholarship, summaryFilterServer, uiButtons, waitlistData,
    loginForm, setLoginForm, loginBusy, setLoginBusy, googleLoginBusy, setGoogleLoginBusy, loginError, setLoginError, showLoginPassword, setShowLoginPassword, loginInProgressRef, auth, buildClientVersionPatch,
    navHistory, forwardNavStack, goBack, goForward, goTo,
    editRegistryInlineBaselineRef, editRegistryModalRef, eventsRef, modalEscapeCloseRef, newRegModalDraftLiveRef, newRegModalProfileSearchLiveRef, pendingInlineEditScrollRef, resetEditRegistryModalRef, waBulkPopoutRef, whatsAppAutoSendCancelRef,
    setEditPreferredServeDropdownOpen, setEditRegDraftCarMeta, setEditRegistryModal, setEditServedAreasDropdownOpen, setRosterExpandEditOnlyIds, setSpouseLinkSearchEdit,
    excelExportModal, isExporting, abonoNoteEditModal, paymentMethodEditModal, superDateEditModal, expensePartialModal, expenseEditModal, donationModal, customFieldsModal, whatsAppModal, paymentModal, registryConfirmModal, allergyOptionsModal, serveAreaOptionsModal, cashCutScheduleModal, pricingModal, summaryRosterModal, summaryCellDetailModal,
    editorRegFieldsModalOpen, editorRegFieldsForm, editorRegFieldsScope, editorRegistrationFieldVis, editorTypeFieldVis, panelNavModalOpen, privacyNoticeModalOpen, registrationCommentModal,
    uiShell, ClipboardList, ExcelExportScopeModalLazy, EDITOR_REGISTRATION_FIELD_GROUP_LABELS, XCircle, createEditRegistryDraft, getEditorRegistrationFieldGroupOrderForEventType, getEditorRegistrationFieldMetaForEventType, expandedRows,
    isAddLocModalOpen, setIsAddLocModalOpen, setNewLocationName, donationsListOpen, setDonationsListOpen, publicQrModalOpen, setPublicQrModalOpen, responsivaDigitalTextModalOpen, setResponsivaDigitalTextModalOpen, newRegModalOpen, setNewRegModalOpen,
    privacyNoticeSaving, privacyBackfillBusy, privacyNoticeForm, setPrivacyNoticeForm, cashCutServiceDetailModal, setCashCutServiceDetailModal, newEntry, DEFAULT_PANEL_NAV, flushNewRegDraftToParent,
    setWhatsAppModal, setPaymentModal, setAbonoNoteEditModal, setDonationModal, setCustomFieldsModal, setExpensePartialModal, setExpenseEditModal, setAllergyOptionsModal, setServeAreaOptionsModal, setCashCutScheduleModal, setPricingModal, setSummaryRosterModal, setSummaryCellDetailModal, setExpandedRows, setEditingUser, setSuperDateEditModal, setRegistrationCommentModal, setPaymentMethodEditModal,
    capWaitlistConfirmModal, promoteOverCapConfirmModal, closeCapFullWaitlistConfirm, closePromoteOverCapConfirm,
    setSuperSessionCount, staffSnapshotUnsubsRef,
    panelNavMergedPrevRef,
    rosterLocationSearchRef,
  };
  /* __EXTRACTED_APP_MAIN_HANDLERS__ */
  const appMainHandlersScopeRef = useRef({});
  Object.assign(appMainHandlersScopeRef.current, __appMainLiveScope);
  const {
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
    logoutConfirmOnBackModalEl,
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
    gateScreenEl,
  } = useAppMainHandlers(() => ({
    ...appMainModuleScopeNS,
    countActiveDropdownListFilters,
    countUnsentWhatsAppNotificationsForQueue,
    listFiltersForEventApplication,
    ...appMainHandlersScopeRef.current,
  }));

  const renderBecadosPage = () => (
    <Suspense fallback={<ScreenLoadingFallback title="Cargando becados…" />}>
      <BecadosPageLazy
      currentEvent={currentEvent}
      allParticipants={scopedEventParticipants}
      participantIsActiveInEvent={participantIsActiveInEvent}
      participantIsActiveInRoster={participantIsActiveInRoster}
      isSiValue={isSiValue}
      applyGlobalRegistryLikeFilters={applyGlobalRegistryLikeFilters}
      globalLocationFilters={globalLocationFilters}
      getScholarshipCondonedAmount={getScholarshipCondonedAmount}
      resolveRegisteredCost={resolveRegisteredCost}
      currentPricing={currentPricing}
      formatMoney={formatMoney}
      isBautizos={false}
      renderGlobalRegistryListToolbar={renderGlobalRegistryListToolbar}
      scholarshipRealCostDraft={scholarshipRealCostDraft}
      setScholarshipRealCostDraft={setScholarshipRealCostDraft}
      onSaveScholarshipRealCostBase={handleSaveScholarshipRealCostBase}
      scholarshipRealCostBaseEffective={Number(currentEvent?.scholarshipRealCostBase ?? currentEvent?.realCost ?? 0) || 0}
      canEditScholarshipRealCost={hasAdminRights && currentEvent?.eventType === 'Campa'}
    />
    </Suspense>
  );

  const renderBzEvtCompanionsPage = () => null; // Bautizos unsupported in v2

  const renderBzEvtAsistentesPage = () => null; // Bautizos unsupported in v2

  const renderBzEvtCortesiasPage = () => null; // Bautizos unsupported in v2

  const renderResponsivasPage = () => (
    <Suspense fallback={<ScreenLoadingFallback title="Cargando responsivas…" />}>
      <ResponsivasPageLazy
      currentEvent={currentEvent}
      allParticipants={scopedEventParticipants}
      getResponsivaCardUiState={getResponsivaCardUiState}
      applyGlobalRegistryLikeFilters={applyGlobalRegistryLikeFilters}
      globalLocationFilters={globalLocationFilters}
      renderGlobalRegistryListToolbar={renderGlobalRegistryListToolbar}
      isSuperUser={isSuperUser}
      onDeleteResponsiva={handleDeleteResponsivaManually}
      isBautizos={false}
    />
    </Suspense>
  );

  const renderPastoresPage = () => (
    <Suspense fallback={<ScreenLoadingFallback title="Cargando pastores…" />}>
      <PastoresPageLazy
      event={currentEvent}
      participants={scopedEventParticipants}
      roster={scopedEventParticipants}
      visibleLocations={visibleLocations}
      formatMoney={formatMoney}
      onSavePastorFields={handleSavePastorFields}
      savingPastorId={savingPastorId}
      pastoresUiPrefs={pastoresUiPrefs}
      onPastoresUiPrefsChange={onPastoresUiPrefsChange}
    />
    </Suspense>
  );

  const renderTransportPlanningPage = () => (
    <RosterSectionScrollWrap sectionId="transport-planning">
      <Suspense fallback={<ScreenLoadingFallback title="Cargando transporte…" />}>
        <TransportPlanningPageLazy
          currentEvent={currentEvent}
          allParticipants={scopedEventParticipants}
          visibleLocations={visibleLocations}
          applyGlobalRegistryLikeFilters={applyGlobalRegistryLikeFilters}
          globalLocationFilters={globalLocationFilters}
          renderGlobalRegistryListToolbar={renderGlobalRegistryListToolbar}
          canEdit={userCanEditTransportPlanning(currentUser)}
          canEditTransportOps={userCanEditTransportOperations(currentUser)}
          transportOpsUserLabel={currentUser?.username || currentUser?.displayName || ''}
          showToast={showToast}
          getDocRef={getDocRef}
          updateDoc={updateDoc}
          addLog={addLog}
          isCampa={currentEvent?.eventType === 'Campa'}
          countAmbosDoubleInAllCounts={countAmbosDoubleInAllCounts}
          customCarCatalog={globalConfig?.customCarCatalog}
          transportUiPrefs={transportUiPrefs}
          onTransportUiPrefsChange={onTransportUiPrefsChange}
          onTransportPlanSaved={patchEventTransportPlanning}
          canSendCarDataWhatsApp={userCanSendWhatsAppQuickAction(currentUser)}
          titularHasPendingCarData={(titular) =>
            titularCarDataVisibleInWhatsAppQueue(titular, currentEvent, allParticipants)
          }
          onSendCarDataWhatsApp={openCarDataWhatsAppForTitular}
          onBulkSendCarDataWhatsApp={() => runBulkCarDataWhatsAppForRoster(scopedEventParticipants)}
          resolveParticipantById={(id) =>
            (scopedEventParticipants || []).find((p) => String(p?.id) === String(id)) || null
          }
        />
      </Suspense>
    </RosterSectionScrollWrap>
  );


  /* __EXTRACTED_ROSTER_RENDERERS__ */
  const rosterRenderScopeRef = useRef({});
  const [rosterRenderers, setRosterRenderers] = useState(null);
  useEffect(() => {
    let cancelled = false;
    import('../features/locationRoster/createRosterRenderers.jsx').then((m) => {
      if (cancelled) return;
      setRosterRenderers(m.createRosterRenderers(() => rosterRenderScopeRef.current));
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const {
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
    renderGlobalRegistryListToolbar
  } = rosterRenderers || {
    renderPublicLinkExtChip: () => null,
    getBautizosBaptizedCompanionRows: () => [],
    rosterDisplayUnspecified: '',
    renderRegistrationParticipantColumn: () => null,
    renderRegistrationFinancesColumn: () => null,
    renderExpandedRosterDetailTableRow: () => null,
    renderRosterQuickActionsPanel: () => null,
    renderRosterPersonMobileCard: () => null,
    toggleDupGroup: () => {},
    toggleDupPerson: () => {},
    renderDupPersonDetail: () => null,
    renderGlobalRegistryListToolbar: () => null,
  };

  const renderBautizadosPage = () => (
    <Suspense fallback={<ScreenLoadingFallback title="Cargando bautizados…" />}>
      <BautizadosPageLazy
      currentEvent={currentEvent}
      allParticipants={scopedEventParticipants}
      visibleLocations={visibleLocations}
      participantIsActiveInEvent={participantIsActiveInEvent}
      participantIsActiveInRoster={participantIsActiveInRoster}
      getBaptismAccountingSegment={getBaptismAccountingSegment}
      applyGlobalRegistryLikeFilters={applyBautizadosPageFilters}
      globalLocationFilters={globalLocationFilters}
      renderGlobalRegistryListToolbar={renderGlobalRegistryListToolbar}
      calculateAgeFromBirthDate={calculateAgeFromBirthDate}
      canEditShirtSizes={currentUser?.role !== 'Lector'}
      onSaveBaptismShirtSize={handleSaveBaptismShirtSize}
      isBautizos={false}
    />
    </Suspense>
  );

  /* __WIRED_SCOPE_BAGS__ (seed before useAppMainHandlers) */
  Object.assign(rosterRenderScopeRef.current, __appMainLiveScope);
  Object.assign(rosterRenderScopeRef.current, {
    handleExportExcel, openExcelExportPicker, handleCleanLogs, handleCleanRecentLogs, handleDeleteOldestLogsByCount, confirmRestore, updateEventConfig, patchCampaRealCostCountOptions, handleSaveEventDates, handleSaveCardCommissionRate,
    removeCurrentUserSession, broadcastSessionActivity, sessionRevokedAtToMs, revokeAllSessionsForOtherUser, remoteSessionRevokeHandledRef, finalizeStaffLoginAfterAuth, handleLogin, handleGoogleLogin, handleLogout, dismissLogoutConfirmOnBack,
    confirmLogoutFromBack, logoutConfirmOnBackModalEl, runDailyScheduledBackupIfDue, handleCreateEvent, handleRenameEvent, openEditEventModal, handleDragOver, handleDrop, openPricingModal, handleSavePricing, openCashCutScheduleModal,
    toggleCashCutServiceForLoc, setCashCutSlotTimeForLoc, handleSaveCashCutScheduleByLocation, handleSaveServeAreaOptions, handleSaveAllergyOptions, handleAddDonation, handleUpdateDonationSuper, handleDeleteDonation, handleAddExpense, handleAddCampaRealCostBreakdownLine,
    handleDeleteCampaRealCostBreakdownLine, handleSaveCampaRealCostManualDivisor, handleSaveScholarshipRealCostBase, handleRepairBautizosSplitCompanionLinks, handleSaveBaptismShirtSize, handleDeleteExpense, handleToggleExpensePaid, handleToggleExpenseCountInTotals, handleExpensePartialPayment, handleEditExpense,
    handleAddUser, handleUpdateUser, handleDeleteUser, refreshAnonymousAuthUsers, deleteOneAnonymousAuthUser, purgeAllAnonymousAuthUsers, isValidPhone, getRegistrationFormIssues, formatRegistrationValidationIssuesMessage, showRegistrationValidationIssues,
    missingInitialPaid, handleNameInput, formatPhoneNumber, buildWhatsAppMessage, buildArchiveWhatsAppMessage, appendWhatsAppMessageHistoryToken, buildWhatsAppHistoryMessage, deleteWhatsAppHistoryEntryForSuperUser, upsertMergedArchiveProfile, archiveParticipantToFirestore,
    confirmDeleteEvent, getLastPaymentMethodForFilter, spouseLinkPickResultsNew, spouseLinkPickResultsEdit, spouseIncomingIdsForEvent, filterParticipantRows, buildRosterLikeFilterPayload, applyRosterLikeFilters, applyGlobalRegistryLikeFilters, applyBautizadosPageFilters,
    activeRosterFilterCount, activeGlobalRegistryFilterCount, activeSummaryDashboardFilterCount, applySummaryLikeFilters, getPendingWhatsAppRowsForLocation, exportPendingWhatsAppToExcel, sleepWhatsAppAutoSend, runAutoSendPendingWhatsAppForLocation, finalizeWhatsAppQuickSend, finalizeCarDataWhatsAppSend,
    openCarDataWhatsAppForTitular, runBulkCarDataWhatsAppForRoster, openWhatsAppModal, sendWhatsAppMessage, sendResponsivaSignLinkWhatsAppForPerson, markResponsivaLocalDelivery, handleSaveEventResponsivaDigitalText, getProcessedParticipantsForLocation, handleAddLocation, handleDeleteLocation,
    handleAddCustomField, handleRemoveCustomField, handleAddEntry, handleAddToWaitlist, resetEditRegistryModal, navEditDismissAnchorRef, handleUpdateEntry, executeBautizosPartyCancelArchivePlan, performArchiveRosterEntry, performArchiveWaitlistEntry,
    performArchiveDuplicateHintEntry, performAcceptDuplicateCluster, openEditRegistryModalForPerson, performCancelEntry, handleDeleteResponsivaManually, performDeletePaymentHistoryRow, openDeletePaymentHistoryRowConfirm, closeRegistryConfirmModal, openPermanentDeleteArchivedParticipantConfirm, performPermanentDeleteArchivedParticipant,
    handleRegistryConfirmSubmit, removeEntry, cancelEntry, openDeleteDonationConfirm, reactivateEntry, markCancelledRefundAsDonation, performRefundDisbursement, updateRefundDisbursementDateTime, openRefundDisbursementConfirm, openRefundDateEditModal,
    closeRefundDateEditModal, submitRefundDateEditModal, removePendingRefundBySuperUser, openRemovePendingRefundConfirm, openMoveToWaitlistConfirm, performMoveActiveEntryToWaitlist, promoteWaitlistEntry, promoteCompanionWaitlistEntry, promoteFromWaitlistSection, openWaitlistRowEdit,
    toggleRegStatus, rosterRowAnchorId, rosterInlineEditPanelId, findWorkspaceScrollRoot, scrollRosterInlineEditPanelIntoView, scrollRosterRowIntoView, expandRosterRowEditOnly, toggleRosterRowExpand, openRosterInlineEditFromQuickActions, submitAbono,
    openRegistrationCommentModal, submitRegistrationCommentModal, openAbonoNoteEditModal, saveAbonoNoteFromModal, deleteRegistrationCommentItem, clearAbonoNoteForPaymentRow, closePaymentMethodEditModal, openPaymentMethodEditModal, handleSavePaymentMethodEdit, closeSuperDateEditModal,
    openSuperRegistrationDateEdit, openSuperPaymentDateEdit, ensureRefundDisbursementPaymentHistoryIndex, openPaymentHistoryEditForPay, handleSuperSaveDateEdit, openUserEditorFromListUser, editorRegFieldsModalEl, excelExportModalEl, panelNavModalEl, privacyNoticeModalEl,
    registryConfirmModalEl, capFullWaitlistConfirmModalEl, promoteOverCapConfirmModalEl
  });

  const workspaceShellRaw = mergeWorkspaceShellParts([
    {
      goTo,
      goBack,
      goForward,
      navHistory,
      forwardNavStack,
      activeTab,
      deferredActiveTab,
      navContentPending,
      systemView,
      selectedEventId,
      darkMode,
      toggleDarkMode,
      needsFirestoreResyncAfterBulk,
      bulkResyncBusy,
      onReloadAfterBulkRestore: handleReloadAfterBulkRestore,
    },
    {
      currentUser,
      currentEvent,
      summary,
      data,
      visibleLocations,
      eventDateDraft,
      setEventDateDraft,
      handleSaveEventDates,
      globalConfig,
      toast,
      fbUser,
      superSessionCount,
      isSuperUser,
      debugToast,
      hasAdminRights,
      hasFinancialAccess,
      canAccessExpenses,
      canEditRegistryDates,
      isCampa,
      isBautizos: false,
      getDashboardSummaryForCampaScope,
      companionCollisionsInEvent,
      workspaceSidebarBadges,
      isPanelNavSectionAllowed,
      isLocOpen,
      isMobileMenuOpen,
      setIsMobileMenuOpen,
      isExporting,
      syncFirestoreBusy,
      syncFirestoreFromServer,
      locError,
      isAddLocModalOpen,
      setIsAddLocModalOpen,
      newLocationName,
      setNewLocationName,
      showMoney,
      setShowMoney,
      newCustomField,
      setNewCustomField,
    },
    {
      MASKED_EXPENSE_CONCEPT_LABEL,
      addLog,
      allParticipants,
      allergyOptionsForm,
      allergyOptionsModal,
      cashCutScheduleModal,
      cashCutScheduleForm,
      customFieldsModal,
      donationModal,
      donations,
      donationsListOpen,
      editRegistryModal,
      setEditRegistryModal,
      waitlistData,
      cancelledData,
      editorRegistrationFieldVis,
      editPrivacyAck,
      setEditPrivacyAck,
      mergedPrivacyNotice,
      isGeneral,
      isDesayunoEvent,
      currentPricing,
      editRegDraftCarMeta,
      setEditRegDraftCarMeta,
      bautizosCarColorSuggestions,
      spouseLinkSearchEdit,
      setSpouseLinkSearchEdit,
      spouseLinkPickResultsEdit,
      editServedAreasDropdownOpen,
      setEditServedAreasDropdownOpen,
      editPreferredServeDropdownOpen,
      setEditPreferredServeDropdownOpen,
      ambosServeOptionLabelsEdit,
      handleNameInput,
      canQuickActionResponsivaDigital,
      canQuickActionResponsivaLocal,
      sendResponsivaSignLinkWhatsAppForPerson,
      markResponsivaLocalDelivery,
      responsivaLinkBusyId,
      responsivaLocalBusyId,
      isResponsivaEnabled,
      resolveRegisteredCost,
      getManualApplyCampaignOptions,
      editorRegFieldsModalEl,
      expenseEditModal,
      expensePartialModal,
      expenses,
      mergeEventDonationsForEvent,
      omitUndefinedDeep,
      paymentMethodEditModal,
      paymentModal,
      bzEvtCarDataPrompt,
      registrationCommentModal,
      abonoNoteEditModal,
      pricingForm,
      pricingModal,
      publicQrBusy,
      publicQrDataUrl,
      publicQrModalOpen,
      publicQrOptional,
      publicQrUrl,
      superDateEditModal,
      whatsAppModal,
      panelNavModalEl,
      privacyNoticeModalEl,
      excelExportModalEl,
      serveAreaOptionsForm,
      serveAreaOptionsModal,
    },
    {
      btnPrimary,
      btnSecondary,
      inputClasses,
      inputClassesPhase,
      labelClasses,
      labelClassesPhase,
      formatMoney,
      formatPhoneNumber,
      getAutoPaymentService,
      getDocRef,
      updateDoc,
      setDoc,
      canSeeExpenseConceptForRow,
      openDeleteDonationConfirm,
      sendWhatsAppMessage,
      showToast,
      submitAbono,
      toggleCashCutServiceForLoc,
      toggleDebugMode,
      setCashCutSlotTimeForLoc,
      setPublicQrOptional,
      closePaymentMethodEditModal,
      closeSuperDateEditModal,
      setAllergyOptionsForm,
      setAllergyOptionsModal,
      setCashCutScheduleModal,
      setCustomFieldsModal,
      setDonationModal,
      setDonationsListOpen,
      setExpenseEditModal,
      setExpensePartialModal,
      setPaymentMethodEditModal,
      setPaymentModal,
      setBzEvtCarDataPrompt,
      setRegistrationCommentModal,
      setAbonoNoteEditModal,
      submitRegistrationCommentModal,
      saveAbonoNoteFromModal,
      openRegistrationCommentModal,
      openAbonoNoteEditModal,
      setPricingForm,
      setPricingModal,
      setPublicQrBusy,
      setPublicQrDataUrl,
      setPublicQrModalOpen,
      setPublicQrUrl,
      renameModal,
      setRenameModal,
      handleRenameEvent,
      openEditEventModal,
      setServeAreaOptionsForm,
      setServeAreaOptionsModal,
      setSuperDateEditModal,
      setWhatsAppModal,
      handleAddCustomField,
      handleAddDonation,
      handleUpdateDonationSuper,
      handleAddLocation,
      handleDeleteLocation,
      handleEditExpense,
      handleExpensePartialPayment,
      handleExportExcel,
      openExcelExportPicker,
      handleLogout,
      logoutBusy,
      handleRemoveCustomField,
      handleSaveAllergyOptions,
      handleSaveCashCutScheduleByLocation,
      handleSavePaymentMethodEdit,
      handleSaveEventDates,
      handleSavePricing,
      handleSaveServeAreaOptions,
      handleSuperSaveDateEdit,
      handleUpdateEntry,
      renderBecadosPage,
      renderBautizadosPage,
      renderBzEvtCompanionsPage,
      renderBzEvtAsistentesPage,
      renderBzEvtCortesiasPage,
      renderResponsivasPage,
      renderPastoresPage,
      renderTransportPlanningPage,
      registryConfirmModalEl,
      promoteOverCapConfirmModalEl,
      ATTENDANCE_SPECIAL,
      CopyButton,
      DASHBOARD_COMMISSION_VIEW_TITLE,
      DEFAULT_ALLERGY_OPTIONS,
      DEFAULT_SERVE_AREA_OPTIONS,
      GENDERS,
      NEW_REG_DONATION_BTN,
      NEW_REG_TOOLBAR_INDIGO_BTN,
      REGISTRY_CONFIRM_BAUTIZOS_EMPTY,
      RESPONSIVA_STATUSES,
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
      ambosServeOptionLabelsNew,
      applyImportedProfile,
      applyRosterLikeFilters,
      buildRosterLikeFilterPayload,
      bautizosCarColorSuggestions,
      buildAttendanceSpecialFormOptions,
      buildNewEntryDuplicateHint,
      buildNewRegCompanionCollisionHintForDraft,
      buildProfileImportMatchesForModal,
      calculateAgeFromBirthDate,
      canArchiveRegistrationsFlag,
      canCancelRegistrationsFlag,
      canMarkPersonsOfInterestFlag,
      canQuickActionResponsivaDigital,
      canQuickActionResponsivaLocal,
      canQuickActionWhatsApp,
      cancelEntry,
      cancelledData,
      capFullWaitlistConfirmModalEl,
      companionCollisionsActionable,
      createEmptyGlobalRegistryListFilters,
      currentEvent,
      currentPricing,
      currentUser,
      data,
      debouncedSearchTerm,
      duplicatesInEvent,
      editorRegistrationFieldVis,
      events,
      expandedDupGroups,
      expandedDupPersons,
      expandedRows,
      exportPendingWhatsAppToExcel,
      fieldStack,
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
      flushNewRegDraftToParent,
      formatPhoneNumber,
      formatPreferredServeArea,
      formatRegistrationValidationIssuesMessage,
      formatSiNo,
      generateVnpPersonId,
      getActiveCountByLocation,
      getActiveDiscountCampaigns,
      getAutoPaymentService,
      getBautizosBaptizedCompanionRows,
      getCommissionToggleCompactBtnClasses,
      getDashboardCardCommissionToggleLabel,
      getEventCapUsedUnits,
      getEventTotalCap,
      getLiquidationTarget,
      getLocationCap,
      getPendingWhatsAppRowsForLocation,
      getProcessedParticipantsForLocation,
      getRegistrationFormIssues,
      getRequiredFieldClass,
      getSortedCancelledForLocation,
      getSortedWaitlistForLocation,
      globalConfig,
      handleAddEntry,
      handleAddToWaitlist,
      handleClearRegistrationForm,
      handleLoadLastSuccessfulRegistrationForm,
      handleNameInput,
      handleTogglePersonOfInterest,
      hasAdminRights,
      hasFinancialAccess,
      hasValidFullName,
      inputClasses,
      isBautizos: false,
      isCampa,
      isDesayunoEvent,
      isGeneral,
      isLocOpen,
      isLocationFull,
      isResponsivaEnabled,
      isRosterRowInteractiveClickTarget,
      isSiValue,
      isSuperUser,
      isValidPhone,
      labelClasses,
      markResponsivaLocalDelivery,
      mergedPrivacyNotice,
      newEntry,
      newRegDraftCarMeta,
      newRegDraftResetToken,
      newRegDupExpandedIds,
      newRegGeneralComment,
      newRegGeneralCommentRef,
      newRegModalDraftLiveRef,
      newRegModalOpen,
      newRegModalProfileSearchLiveRef,
      newRegPrivacyAccepted,
      newRegPrivacyContext,
      newRegProfileSearch,
      newRegSensitiveConsent,
      normalizeFullNameCompareKey,
      openMoveToWaitlistConfirm,
      openNewRegModal,
      openPreferredServeLoc,
      openRegistrationCommentModal,
      openRosterInlineEditFromQuickActions,
      openServedAreasLoc,
      openWaitlistRowEdit,
      openWhatsAppModal,
      parsePreferredServeArea,
      participantIsArchived,
      participantIsCancelled,
      participantRosterListLabel,
      pastProfilesForImport,
      persistNewRegDraftOnly,
      personOfInterestVnpSet,
      promoteFromWaitlistSection,
      reactivateEntry,
      registryConfirmBusy,
      removeEntry,
      renderDupPersonDetail,
      renderExpandedRosterDetailTableRow,
      renderRegistrationFinancesColumn,
      renderRegistrationParticipantColumn,
      renderRosterPersonMobileCard,
      resolveMatchedCampaignForNewEntry,
      responsivaLinkBusyId,
      responsivaLocalBusyId,
      rosterRowAnchorId,
      rosterSectionExpanded,
      runAutoSendPendingWhatsAppForLocation,
      searchTerm: debouncedSearchTerm,
      sendResponsivaSignLinkWhatsAppForPerson,
      sendToWaitlist,
      setAllergyOptionsForm,
      setAllergyOptionsModal,
      setCustomFieldsModal,
      setDebouncedSearchTerm: syncRosterLocationSearchTerm,
      setRosterLocationSearchRef,
      persistLocationRosterSearchToPrefs,
      setDonationModal,
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
      setNewRegDraftCarMeta,
      setNewRegDupExpandedIds,
      setNewRegGeneralComment,
      setNewRegModalOpen,
      setNewRegPrivacyAccepted,
      setNewRegSensitiveConsent,
      setOpenPreferredServeLoc,
      setOpenServedAreasLoc,
      setPaymentModal,
      setRegistryConfirmModal,
      setSendToWaitlist,
      setServeAreaOptionsForm,
      setServeAreaOptionsModal,
      setSortBy,
      setSpouseLinkSearchNew,
      showGrossWithoutCommission,
      sortBy,
      spouseLinkPickResultsNew,
      spouseLinkSearchNew,
      summary,
      toggleDupGroup,
      toggleDupPerson,
      toggleRegStatus,
      toggleRosterRowExpand,
      toggleRosterSection,
      toggleShowGrossWithoutCommission,
      waitlistCupoCountBySede,
      whatsAppAutoSendCancelRef,
      whatsAppAutoSendJob,
      resetEditRegistryModal,
    },

    {
      BLOOD_BAR_BG_CLASSES,
      PARTICIPANT_STATUS_ARCHIVED,
      bautizosGlobalRegistryFinanceOpts,
      resolveGlobalRegistryFinanceHost,
      rosterDisplayUnspecified,
      DEFAULT_SERVICE_SLOTS,
      NO_SERVICE_LABEL,
      cashCutGross,
      cashCutLocationInScope,
      cashCutMode,
      cashCutSelected,
      cashCutServiceDetailModal,
      cashCutTotalsView,
      collectCashCutAllPayments,
      expandedCut,
      formatCashCutWeekRangeLabel,
      getCashCutWeekKey,
      getCommissionToggleBtnClasses,
      getCommissionToggleLabel,
      openCashCutScheduleModal,
      resolveCashCutRefundServiceLabel,
      setCashCutGross,
      setCashCutMode,
      setCashCutSelected,
      setCashCutServiceDetailModal,
      setCashCutTotalsView,
      setExpandedCut,
      QUICK_ACTION_DARK_INTERACTION,
      globalLocationFilters,
      globalRegistryListFilters,
      handleAssignServerServeArea,
      participantIsActiveInEvent,
      renderGlobalRegistryListToolbar,
      renderPublicLinkExtChip,
      resolveRegresaEnCarro,
      scopedEventParticipants,
      canonicalizeVnpPersonId,
      includeCortesiaInRealCost,
      includeEmpleadoInRealCost,
      countAmbosDoubleInAllCounts,
      BLOOD_TYPE_OTHER_KEY,
      DASHBOARD_COMMISSION_VIEW_HELP,
      DASH_TOP_BTN,
      DASH_TOP_BTN_NEUTRAL,
      PARTICIPANT_STATUS_CANCELLED,
      ProgressBar,
      StatCard,
      activeSummaryDashboardFilterCount,
      applySummaryLikeFilters,
      buildLocationChartColorMap,
      campaAttendanceScopeMatches,
      campaFamilyCollisionsInEvent,
      canSeeMoney,
      cardCommissionPctDraft,
      computeNetAmountByMethod,
      cupoSedeOpen,

      dashPaymentDeadlineDate,
      dashboardHasFullLocationAccess,
      dashboardLocations,
      digitsOnlyPhone,
      eventCapUsedUnitsBySede,
      eventResponsivaDigitalAdultsDraft,
      eventResponsivaDigitalEnabledDraft,
      eventResponsivaDigitalMinorsDraft,
      eventResponsivaEnabledDraft,
      eventResponsivaGeneralAdultsDraft,
      eventResponsivaGeneralMinorsDraft,
      eventResponsivaTextAdultsDraft,
      eventResponsivaTextMinorsDraft,
      eventResponsivaTextSaving,
      filterPaymentMethod,
      getScholarshipCondonedAmount,
      handleAssignParticipantLocation,
      handleSaveCardCommissionRate,
      handleSaveEventResponsivaDigitalText,
      isFreeAttendanceType,
      normalizeAttendanceSpecial,
      openPricingModal,
      openEditEventModal,
      participantCountsAsRealCostX2,
      participantIsActiveInRoster,
      participantIsWaitlistRow,
      participantMatchesBautizosDashboardPartyScope,
      participantsLocationIntegrity,
      patchCampaRealCostCountOptions,
      resolveLlegaEnCarro,
      resolveTransportSummary,
      responsivaDigitalTextModalOpen,
      setCardCommissionPctDraft,
      setCupoSedeOpen,

      setDashPaymentDeadlineDate,
      setEditorRegFieldsForm,
      setEditorRegFieldsModalOpen,
      setEditorRegFieldsScope,
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
      setTempDeposit,
      setTempEventTotalCap,
      setTempLocationCaps,
      setTempRealCost,
      setViewPrefs,
      showIncChartValues,
      showIncomeCashCardByLocation,
      showLocChartValues,
      showViewSettings,
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

      tempDeposit,
      tempEventTotalCap,
      tempLocationCaps,
      tempRealCost,
      togglePref,
      toggleSummaryDashCard,
      toggleSummaryPieIncChart,
      toggleSummaryPieLocChart,
      updateEventConfig,
      viewPrefs,
    },

    {
      users,
      isHideMyExpenseConceptsOn,
      expenseForm,
      setExpenseForm,
      expenseSearch,
      setExpenseSearch,
      expenseGross,
      setExpenseGross,
      expenseFilters,
      setExpenseFilters,
      expenseFiltersDropdownOpen,
      setExpenseFiltersDropdownOpen,
      campaRealCostBreakdownForm,
      setCampaRealCostBreakdownForm,
      campaRealCostManualDivisorStr,
      setCampaRealCostManualDivisorStr,
      canMutateExpenseRecord,
      computeScholarshipAutoExpenseRows,
      computeManualCostCreditExpenseRows,
      isDerivedAutoExpenseIdForEvent,
      handleAddExpense,
      handleDeleteExpense,
      handleToggleExpensePaid,
      handleToggleExpenseCountInTotals,
      handleToggleHideMyExpenseConcepts,
      handleAddCampaRealCostBreakdownLine,
      handleDeleteCampaRealCostBreakdownLine,
      handleSaveCampaRealCostManualDivisor,
      markCancelledRefundAsDonation,
      openRemovePendingRefundConfirm,
    },
  ]);

  const eventData = {
    currentUser,
    currentEvent,
    summary,
    data,
    allParticipants,
    visibleLocations,
    eventDateDraft,
    setEventDateDraft,
    handleSaveEventDates,
    globalConfig,
    fbUser,
    superSessionCount,
    isSuperUser,
    debugToast,
    hasAdminRights,
    hasFinancialAccess,
    canAccessExpenses,
    canEditRegistryDates,
    isCampa,
    isBautizos: false,
    workspaceSidebarBadges,
    isPanelNavSectionAllowed,
    isLocOpen,
    locError,
    isAddLocModalOpen,
    setIsAddLocModalOpen,
    newLocationName,
    setNewLocationName,
    showMoney,
    setShowMoney,
    newCustomField,
    setNewCustomField,
    isExporting,
    syncFirestoreBusy,
    syncFirestoreFromServer,
  };

  const participantMutations = {
    handleUpdateEntry,
    handleAddEntry,
    handleAddToWaitlist,
    resetEditRegistryModal,
    submitAbono,
    submitRegistrationCommentModal,
    saveAbonoNoteFromModal,
    openRegistrationCommentModal,
    openAbonoNoteEditModal,
    handleAddLocation,
    handleDeleteLocation,
    handleAddCustomField,
    handleRemoveCustomField,
  };

  const workspaceUI = {
    toast,
    showToast,
    editRegistryModal,
    paymentModal,
    registrationCommentModal,
    abonoNoteEditModal,
    donationModal,
    expenseEditModal,
    expensePartialModal,
    paymentMethodEditModal,
    pricingModal,
    customFieldsModal,
    allergyOptionsModal,
    serveAreaOptionsModal,
    cashCutScheduleModal,
    superDateEditModal,
    whatsAppModal,
    publicQrModalOpen,
    donationsListOpen,
    editorRegFieldsModalEl,
    panelNavModalEl,
    privacyNoticeModalEl,
    excelExportModalEl,
    setPaymentModal,
    setRegistrationCommentModal,
    setAbonoNoteEditModal,
    setDonationModal,
    setExpenseEditModal,
    setExpensePartialModal,
    setPaymentMethodEditModal,
    setPricingModal,
    setCustomFieldsModal,
    setAllergyOptionsModal,
    setServeAreaOptionsModal,
    setCashCutScheduleModal,
    setSuperDateEditModal,
    setWhatsAppModal,
    setPublicQrModalOpen,
    setDonationsListOpen,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    darkMode,
    toggleDarkMode,
    needsFirestoreResyncAfterBulk,
    bulkResyncBusy,
    onReloadAfterBulkRestore: handleReloadAfterBulkRestore,
  };

  return (
    <SystemViewGuard currentUser={currentUser} pathname={location.pathname}>
      <>
        {gateScreenEl ?? (
          !currentEvent ? (
            <ScreenLoadingFallback title="Cargando evento…" />
          ) : (
            <>
              <WorkspaceShellContainer
                workspaceShellRaw={workspaceShellRaw}
                eventData={eventData}
                participantMutations={participantMutations}
                workspaceUI={workspaceUI}
              />
              <AppVersionBadge
                variant="workspace"
                className="top-2.5 right-3 sm:top-3 sm:right-3"
                showInternal={isSuperUser}
                currentUser={currentUser}
              />
            </>
          )
        )}
        {logoutConfirmOnBackModalEl}
      </>
    </SystemViewGuard>
  );
};

export default App;




