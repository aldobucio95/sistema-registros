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
} from '../../appRoutes.js';
import {
  useAuthSessionState,
  resolveStaffLoginEmail,
  mapStaffLoginFirebaseError,
} from '../../hooks/auth/useAuthSessionState.js';
import { useShallowStableMemo } from '../../hooks/useShallowStableMemo.js';
import { useAppNavigation } from '../../hooks/navigation/useAppNavigation.js';
import { useCompanionCollisions } from '../../hooks/firestore/useCompanionCollisions.js';
import { useEventWorkspaceData } from '../../hooks/workspace/useEventWorkspaceData.js';
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
} from '../../rbac/permissions.js';
import {
  subscribePersonOfInterestVnpSet,
  setVnpPersonOfInterestFlag,
  fetchVnpPersonFlag,
  personLikeIsPersonOfInterest,
  registrationPersonOfInterestMessage,
  personOfInterestRegistrationBlockedMessage,
  VNP_PERSON_FLAGS_COLLECTION,
} from '../../vnpPersonFlags.js';
import UserPermissionBadges from '../../rbac/UserPermissionBadges.jsx';
import UserAccessScopePanel from '../../rbac/UserAccessScopePanel.jsx';
import AdvancedUserPermissionsPanel from '../../rbac/AdvancedUserPermissionsPanel.jsx';
import { viewerCanSeeTargetPermissionMeta, normalizeRole } from '../../rbac/roles.js';
import SystemViewGuard from '../../rbac/SystemViewGuard.jsx';
import {
  Users, UserPlus, MapPin, PieChart, Plus, Trash2, DollarSign, CheckCircle2, XCircle, AlertTriangle, AlertCircle, Clock,
  LayoutDashboard, PanelLeft, Phone, ShieldAlert, Power, BarChart3, Edit3, TableProperties, Briefcase, Gift,
  Eye, EyeOff, Search, Filter, ArrowUpDown, CreditCard, ChevronDown, ChevronUp, ChevronRight,
  Wallet, GraduationCap, Droplets, Activity, LogOut, UserCog, History, Lock, Shield,
  UserCircle, Receipt, CalendarRange, ListPlus, GripVertical, Settings2, Undo, ArrowLeft, RotateCcw,
  SlidersHorizontal, Bug, Download, Send, Database, Menu, FileSpreadsheet, MessageCircle, MessageSquare, ClipboardList,
  Scissors, Calendar, Church, Archive, Ban, QrCode, Percent, Heart, FileText, FileSignature, Scale, Bus, Car, X, Copy, Link2,
} from 'lucide-react';
import QRCode from 'qrcode';
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
} from '../../publicRegistrationLogic.js';
import { getPublicRegistrationPageUrl, getPublicRegistrationUrlSlug } from '../../publicRegistrationUrls.js';
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
} from '../../responsivaSignLogic.js';
import { upsertResponsivaRegistryEntry, removeResponsivaArtifactsForParticipant } from '../../responsivaRegistry.js';
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
} from '../../registrationFormEditorConfig.js';
import {
  isParticipantFieldApplicableToEventType,
  filterFieldsToTrackByEventType,
  cleanParticipantPayloadForEventType,
} from '../../participantEventFieldScope.js';
import { applyParticipantNameFormattingForSave } from '../../participantNameFormat.js';
import {
  normalizeBaptismShirtSize,
  participantHasBaptismChip,
  normalizePersonNameKey,
} from '../../bautizosParty.js';
import {
  buildRegistrationEditScalarChanges,
  describeRegisteredCostChange,
} from '../../registrationChangeLog.js';
import { truncateActivityLogDetails, WHATSAPP_LOG_DETAILS_MAX } from '../../activityLogDiff.js';
import {
  describeCampaBreakdownLineAdded,
  describeCampaBreakdownLineRemoved,
  describeCampaManualDivisorChange,
  describeStringListConfigChange,
} from '../../eventConfigActivityLog.js';
import {
  applyCompanionLinkToHostCompanions,
  buildCompanionRegistrantCollisionIndex,
  buildNewEntryCompanionCollisionHint,
  describeCollisionCluster,
  describeCollisionReasons,
} from '../../companionRegistrantCollision.js';
import { buildCampaFamilyCollisionIndex, describeCampaSpouseCluster } from '../../campaFamilyCollision.js';
import { nameTokensSubsetMatch } from '../../personNameMatch.js';



import {
  computeWaitlistCountsForEvent,
  participantCountsForCupoWaitlistColumn,
} from '../../waitlistDashboardCounts.js';

import {
  ROSTER_EXTRA_FILTER_DEFAULTS,
  applyEventScopedRosterFilters,
  PERSON_OF_INTEREST_FILTER_OPTIONS,
  REGISTRATION_STATUS_FILTER_OPTIONS,
  participantMatchesPersonOfInterestFilter,
  participantMatchesRegistrationStatusFilter,
} from '../../rosterParticipantFilters.js';
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
} from '../../carDataWhatsApp.js';
import {
  buildBusGroupSections,
  buildTransportPlanningLines,
  normalizeTransportPlanning,
  passengersForBusGroup,
} from '../../transportPlanningCore.js';




import ServeAreaMultiSelect from '../../components/ServeAreaMultiSelect.jsx';

import { persistEventCarMetaPatches } from '../../transportCarMetaStore.js';
import { scheduleRegistrationTransportSave } from '../../transport/v2/registrationTransportBridge.js';
import {
  countPastorParticipants,
  isPastorParticipant,
  sumPastorRealCostForParticipants,
} from '../../pastorAttendance.js';
import {
  getEventEffectiveEndDate,
  getEventEffectiveStartDate,
  getPhaseDateMaxCap,
  formatEventDateRangeLabel,
  formatCampaSegmentDateLines,
  isEventSingleDay,
} from '../../eventDateHelpers.js';
import { eventFirestoreDocIdFromHumanName, buildFirestoreDocId, sanitizeFirestoreDocId } from '../../firestoreDocId.js';

export { eventFirestoreDocIdFromHumanName, buildFirestoreDocId, sanitizeFirestoreDocId };

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
} from '../../whatsappFinanceMessages.js';
import {
  countReactivatedUnsentNotifications,
  reactivateQueueFromHistoryToken,
  removeWhatsAppHistoryEntry,
  whatsAppHistoryEntryId,
} from '../../whatsappHistoryQueue.js';
import PrivacyConsentBlock from '../../components/PrivacyConsentBlock.jsx';
import UserAccountModalShell from '../../components/UserAccountModalShell.jsx';
import NewUserAccountFormFields from '../../components/NewUserAccountFormFields.jsx';
import { defaultNewUserFormState, closedEditingUserState } from '../../userAccountFormDefaults.js';
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
} from '../../privacyNotice.js';
import { buildWhatsAppMeUrl } from '../../whatsappUrl.js';
import { AppProviders } from '../providers/AppProviders.jsx';
import { EventHubProvider } from '../providers/EventHubProvider.jsx';
import { resolvePanelNavConfigItemCopy, panelNavSidebarItemAppliesToEvent } from '../../panelNavUi.js';
import { EVENT_TYPES, SI_LABEL, PAYMENT_METHODS, SERVICE_OPTIONS } from '../../appConstants.js';
import {
  BLOOD_TYPE_UNSPECIFIED,
  BLOOD_TYPES_ABO_RH,
  BLOOD_TYPES_SELECT_OPTIONS,
  classifyBloodTypeForStats,
  BLOOD_TYPE_STATS_OTHER,
} from '../../registrationFormShared.js';
import { donationAddsToRecaudacionBalance } from '../../donationHelpers.js';
import {
  CASH_CUT_NO_SERVICE_LABEL,
  DEFAULT_SERVICE_SLOTS as CASH_CUT_DEFAULT_SERVICE_SLOTS,
  getCashCutScheduleForLocation,
  resolveCashCutServiceForTimestamp,
} from '../../cashCutService.js';
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
} from '../../cashCutRefunds.js';
import { describeDashboardConfigDelta, EXPENSE_ACTIVITY_GENERIC } from '../../dashboardActivityLog.js';
import { appendParticipantActivityEntry, fetchParticipantActivityEntries } from '../../participantActivityLog.js';
import ScreenLoadingFallback from '../../screens/ScreenLoadingFallback.jsx';
import {
  computeWorkspaceSidebarBadges,
  EMPTY_WORKSPACE_SIDEBAR_BADGES,
} from '../../workspaceSidebarBadgesCompute.js';
import { runComputeWorkerJob } from '../../workers/computeWorkerClient.js';
import UserSessionSummaryCell from '../../UserSessionSummaryCell.jsx';
import AppVersionBadge from '../../AppVersionBadge.jsx';
import { formatBirthDateExcelLabel, normalizeBirthDateToIso } from '../../birthDateIsoUtils.js';
import { applyExcelHyperlinkCellStyle, excelWhatsAppPendingCheckboxDisplay } from '../../excelExportSheetStyle.js';
import {
  buildExcelExportFilename,
  downloadExcelBytes,
  applyRosterSheetStyles,
  formatBrowserLocalDateTimeLabel,
} from '../../excelRosterXlsxEnhance.js';
import { buildCashCutExcelSheet } from '../../excelCashCutExport.js';
import { applyCashCutSheetStyles } from '../../excelCashCutSheetStyle.js';
import {
  applyKeyValueSheetStyles,
  applyStandardDataTableStyles,
  applyStructuredReportSheetStyles,
  applyWorksheetColumnWidths,
} from '../../excelWorkbookStyle.js';
import {
  buildExcelWeeklyAbonoColumnDefs,
  buildParticipantExcelFinanceCells,
  buildParticipantWeeklyAbonoCells,
  EXCEL_ROSTER_FINANCE_COL_COUNT,
} from '../../excelExportRosterHelpers.js';
import { buildClientVersionPatch } from '../../appVersion.js';

export { buildClientVersionPatch };

import {
  buildPreRestoreBackupId,
  formatLocalDateId,
  isDailyBackupDue,
  msUntilNextLocalMidnight,
} from '../../appBackupSchedule.js';

export {
  buildPreRestoreBackupId,
  formatLocalDateId,
  isDailyBackupDue,
  msUntilNextLocalMidnight,
};

import {
  getClientDeviceSnapshot,
  getClientRuntimeDisplayInfo,
  getInstallPromptBrowserNameEs,
  getSessionLogClientSuffix,
  isClientPwaRuntime,
  writeStaffSessionLogOnce,
} from '../../clientTelemetry.js';

export {
  getClientDeviceSnapshot,
  getClientRuntimeDisplayInfo,
  getInstallPromptBrowserNameEs,
  getSessionLogClientSuffix,
  isClientPwaRuntime,
  writeStaffSessionLogOnce,
};
import { WorkspaceShellProvider } from '../../screens/eventWorkspace/WorkspaceShellContext.jsx';
import { mergeWorkspaceShellParts } from '../../screens/eventWorkspace/mergeWorkspaceShellParts.js';
import { NewRegModalDraftProvider } from '../../components/registration/NewRegModalDraftProvider.jsx';
import { getTransportSectionEligibleForEventDoc } from '../../transportPlanningEligibility.js';
import { isCardPaymentAllowedForLocation } from '../../cardPaymentEligibility.js';
import { chunkArray } from '../../chunkedFirestore.js';
import { buildUserOfflineSessionPatch } from '../../userSessionFirestorePatch.js';
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
} from '../../ui/uiFormatClasses.js';
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
} from '../../formFieldClasses.js';
import RosterSortDropdown from '../../components/RosterSortDropdown.jsx';
import RosterLocationSearchPanel from '../../components/RosterLocationSearchPanel.jsx';
import RosterParticipantMobileCard from '../../components/RosterParticipantMobileCard.jsx';
import CompanionWaitlistBadge from '../../components/CompanionWaitlistBadge.jsx';

import DoubleRoleCollisionChip from '../../components/roster/DoubleRoleCollisionChip.jsx';
import ParticipantAssistanceBadges from '../../components/roster/ParticipantAssistanceBadges.jsx';
import DuplicateGroupsPanel from '../../components/diagnostics/DuplicateGroupsPanel.jsx';
import RegistryConfirmModal from '../../components/modals/RegistryConfirmModal.jsx';
import CapFullWaitlistConfirmModal from '../../components/modals/CapFullWaitlistConfirmModal.jsx';
import PromoteOverCapConfirmModal from '../../components/modals/PromoteOverCapConfirmModal.jsx';
import ListMobileCard from '../../components/ListMobileCard.jsx';
import ActivityLogMobileCard from '../../components/ActivityLogMobileCard.jsx';
import MobileCompactToolbar, { MobileCompactToolbarPanel } from '../../components/mobile/MobileCompactToolbar.jsx';
import MobileSearchField from '../../components/mobile/MobileSearchField.jsx';
import MobileMenuSection from '../../components/mobile/MobileMenuSection.jsx';
import MobileFilterPanelBody from '../../components/mobile/MobileFilterPanelBody.jsx';
import GenderSelectButtons from '../../components/GenderSelectButtons.jsx';
import SedeAutocompleteInput from '../../components/SedeAutocompleteInput.jsx';
import AllergyFormFields from '../../components/AllergyFormFields.jsx';
import DiseaseFormFields from '../../components/DiseaseFormFields.jsx';
import DisabilityFormFields from '../../components/DisabilityFormFields.jsx';
import SiNoFieldToggle from '../../components/SiNoFieldToggle.jsx';
import PaymentMethodSegmentToggle, { PAYMENT_TARJETA } from '../../components/PaymentMethodSegmentToggle.jsx';
import { collectLocationSuggestionsFromRosterSources } from '../../locationFieldSuggestions.js';
import { locationPrefsKey } from '../../userListFiltersPrefs.js';
import RosterFilterCheckboxOption from '../../components/RosterFilterCheckboxOption.jsx';
import RosterSectionScrollWrap from '../../components/RosterSectionScrollWrap.jsx';
import {
  ACTIVITY_LOG_SEARCH_FIELD_ID,
  EXPENSE_LIST_SEARCH_FIELD_ID,
  USERS_PANEL_SEARCH_FIELD_ID,
  globalRegistrySearchFieldId,
  rosterSearchFieldId,
} from '../../ui/rosterFilterField.js';
import { ROSTER_SORT_OPTIONS, ROSTER_SORT_OPTIONS_GLOBAL } from '../../rosterSortOptions.js';
import { isDesktopRosterViewport } from '../../rosterDesktopViewport.js';

const LoginScreenLazy = lazy(() => import('../../screens/LoginScreen.jsx'));
const EventHubScreenLazy = lazy(() => import('../../screens/EventHubScreen.jsx'));
const EventWorkspaceScreenLazy = lazy(() => import('../../screens/EventWorkspaceScreen.jsx'));
const TransportPlanningPageLazy = lazy(() => import('../../screens/TransportPlanningPage.jsx'));
const BecadosPageLazy = lazy(() => import('../../screens/eventWorkspace/pages/BecadosPage.jsx'));
const BautizadosPageLazy = lazy(() => import('../../screens/eventWorkspace/pages/BautizadosPage.jsx'));

const ResponsivasPageLazy = lazy(() => import('../../screens/eventWorkspace/pages/ResponsivasPage.jsx'));
const PastoresPageLazy = lazy(() => import('../../screens/PastoresPage.jsx'));
const ExcelExportScopeModalLazy = lazy(() => import('../../components/ExcelExportScopeModal.jsx'));

/* global __initial_auth_token */

import {
  app,
  secondaryApp,
  usernameToAuthEmail,
  loginIdentifierToAuthEmail,
  AUTH_EMAIL_DOMAIN,
  buildUsernameCandidates,
  normalizeAuthEmail,
} from '../../firebaseConfig.js';
import { auth, db, storage, getColRef, getDocRef } from "../../firebaseRefs.js";
import { sanitizeJsonForFirestore, patchForLocalParticipantCache, prepareParticipantDocForFirestore, omitUndefinedDeep } from '../../firestorePayloadSanitize.js';
import { withLogVisibleInPanel, slimRevertInfoForLog, buildLogEntityFields } from '../../activityLogsMeta.js';
import { logWhatsAppSentActivity, activityLogDetailsDisplayClass, formatActivityLogDetailsForDisplay } from '../../whatsappActivityLog.js';
import {
  buildLogId,
  writeSnapshotDoc,
  writeLogDoc,
  logSnapshotBackup,
  flushPendingLogQueue,
  normalizeErrorMessage,
  LOG_STATUS,
} from '../../activityLogCore.js';
import { logError as logErrorToActivity, setErrorLogContextProvider } from '../../errorLogger.js';
import ActivityLogSnapshotDetails from '../../components/ActivityLogSnapshotDetails.jsx';
import { deleteOldestLogsByCount, deleteLogsByIds } from '../../activityLogsDelete.js';
import {
  CONFIG_LOG_META_PRESERVE_KEYS,
  debugRevertStorageKey,
  isPartialAppEventRevertData,
  mergeAppEventDocForRevert,
  enrichBackupEventsWithParticipantLocations,
  cloneFirestoreDocDataForRevert,
  persistLogsToSessionCache,
  clearLogsSessionCache,
} from './appLogsStorage.js';
import {
  getAmbosServeInSegmentOrEmpty,
  getValidDiscountCampaignsForPerson,
  findDiscountCampaignById,
  discountCampaignAppliesToLabel,
  discountCampaignHasDateRange,
  isDiscountCampaignVigenteOnDate,
} from './discountCampaignHelpers.js';
import {
  getCashCutServicesForLocation,
  getCashCutServiceColumnsForLocation,
  aggregateCashCutPaymentsForLocAndService,
  aggregateCashCutPaymentsForLoc,
  getOffScheduleServiceKeysForLocation,
} from './cashCutAggregates.js';
import {
  defaultViewPrefs,
  SUMMARY_TABLE_COLUMN_DEFAULTS,
  SUMMARY_TABLE_COLUMN_LABELS,
  getSummaryTableColumnKeysForEventType,
  getSummaryTableColumnDefaultsForEventType,
  SUMMARY_TABLE_MONEY_KEYS,
} from './dashboardSummaryTableConfig.js';
import {
  EMPTY_ENTRY,
  mergeNewRegistrationWithImport,
  stripEntrySnapshotForNewRegistrationDraft,
  lastSuccessfulRegFormStorageKey,
  persistLastSuccessfulRegistrationSnapshot,
  registrationFormDraftStorageKey,
  persistRegistrationFormDraft,
  clearRegistrationFormDraft,
} from './registrationDraftStorage.js';
import { buildLocationRosterTypeSummaryByStatus, getLocationRosterSectionCountsFromSummary, aggregateLocationRosterSectionCountsForLocations } from '../../locationRosterTypeSummary.js';
import {
  buildGlobalRegistryPartySections,
  globalRegistryPartyRowsToPersons,
  sortGlobalRegistryPartyRows,
} from '../../globalRegistryPartyRows.js';
import LocationRosterTypeSummary from '../../LocationRosterTypeSummary.jsx';
import {
  LocationRosterActivosChip,
  LocationRosterCancelledChip,
  LocationRosterWaitlistChip,
} from '../../screens/locationRoster/LocationRosterSectionChips.jsx';
import {
  buildCapSimulationRows,
  computeEventCapUsedUnits,
  computeEventCapUsedUnitsBySede,
  computeIncomingRegistrationCapUnits,
  computePromoteFromWaitlistCapUnits,
} from '../../eventCapUnits.js';
import {
  computeCapRemaining,
  formatCapRemainingDisplay,
  buildSedeCapChipViewModel,
  resolveConfiguredCapLimit,
  resolveCupoLimitMode,
  resolveSedeCapStatus,
} from '../../cupoVsWaitlistDisplay.js';
import { computeDashboardTodosRosterTotal } from '../../dashboardTodosRosterTotal.js';
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
import { validateSpouseParticipantChoice, syncSpouseParticipantLinks } from '../../spouseLink.js';
import RegistryBirthDateField from '../../RegistryBirthDateField.jsx';
import { mergeRowsByDocChanges, querySnapshotHasDocChanges } from '../../firestoreSnapshotMerge.js';
import { reloadAppAfterClearingFirestorePersistence, getAckBulkGeneration } from '../../firestoreCacheReload.js';
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
} from '../../firestoreVersionCache.js';
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
} from '../../participantsVersionCache.js';
import {
  syncParticipantAfterWrite,
  syncDonationAfterWrite,
  syncExpenseAfterWrite,
  syncEventAfterWrite,
} from '../../firestoreLiveSync.js';
import {
  resolveStaffUserProfileFromAuth,
  staffUserIsAdminProfile,
  findPendingStaffProfileForAuthEmail,
} from '../../staffUserProfileResolve.js';
import { emitGlobalSystemAlert } from '../../globalSystemAlertsBridge.js';
import { shortFirebaseClientMessage } from '../../shortSystemMessages.js';
import { parseStrictNonNegativeMoneyInput } from '../../strictMoneyInput.js';
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
} from '../../userListFiltersPrefs.js';

export {
  listFiltersForEventApplication,
  countActiveDropdownListFilters,
};

/* __EXTRACTED_APP_MAIN_MODULE_SCOPE__ */

export const secondaryAuth = getAuth(secondaryApp);

/** Evita errores `permission-denied` en consola mientras se desconectan listeners al cerrar sesión. */
export const staffPanelLogoutState = { inProgress: false };
export const isStaffPanelLogoutInProgress = () => staffPanelLogoutState.inProgress;
export const setStaffPanelLogoutInProgress = (v) => { staffPanelLogoutState.inProgress = !!v; };

export function isLogoutPermissionNoise(err) {
  if (!staffPanelLogoutState.inProgress) return false;
  const code = String(err?.code || '');
  return code === 'permission-denied' || code === 'PERMISSION_DENIED';
}

export function logAndEmitFirestoreListenError(err) {
  if (isLogoutPermissionNoise(err)) return;
  console.error(err);
  emitGlobalSystemAlert(shortFirebaseClientMessage(err), { tone: 'warn', ms: 6800 });
}

export function firestoreListenConsoleError(err) {
  if (isLogoutPermissionNoise(err)) return;
  console.error(err);
}

/** Clave antigua (global); se migra una vez al iniciar sesión a `darkModeStorageKeyForUid`. */
export const DARK_MODE_LEGACY_KEY = 'vnpm-theme-dark';
export const LAST_ROUTE_LEGACY_KEY = 'vnpm-last-route';

export function darkModeStorageKeyForUid(uid) {
  return uid ? `vnpm-theme-dark:${uid}` : '';
}

export function readStoredDarkModeForUid(uid) {
  if (!uid || typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(darkModeStorageKeyForUid(uid)) === '1';
  } catch {
    return false;
  }
}

export function migrateLegacyDarkModeToUid(uid) {
  if (!uid || typeof window === 'undefined') return;
  try {
    const perUserKey = darkModeStorageKeyForUid(uid);
    if (window.localStorage.getItem(DARK_MODE_LEGACY_KEY) === '1' && window.localStorage.getItem(perUserKey) == null) {
      window.localStorage.setItem(perUserKey, '1');
    }
    window.localStorage.removeItem(DARK_MODE_LEGACY_KEY);
  } catch {
    /* ignore */
  }
}

export function lastRouteStorageKeyForUid(uid) {
  return uid ? `vnpm-last-route:${uid}` : '';
}

export function readStoredRouteForUid(uid) {
  if (!uid || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(lastRouteStorageKeyForUid(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const pathname = String(parsed?.pathname || '').trim();
    if (!pathname || pathname === '/login') return null;
    const scrollY = Number(parsed?.scrollY);
    return { pathname, scrollY: Number.isFinite(scrollY) && scrollY > 0 ? scrollY : 0 };
  } catch {
    return null;
  }
}

export function migrateLegacyRouteToUid(uid) {
  if (!uid || typeof window === 'undefined') return;
  try {
    const perUserKey = lastRouteStorageKeyForUid(uid);
    if (window.localStorage.getItem(LAST_ROUTE_LEGACY_KEY) && window.localStorage.getItem(perUserKey) == null) {
      window.localStorage.setItem(perUserKey, window.localStorage.getItem(LAST_ROUTE_LEGACY_KEY));
    }
    window.localStorage.removeItem(LAST_ROUTE_LEGACY_KEY);
  } catch {
    /* ignore */
  }
}

/** Consultas recientes ordenadas por tiempo (documentos sin `createdAt` no aparecen aquí; sí en búsqueda completa). */
export const LOGS_ORDER_FIELD = 'createdAt';
export const LOGS_SERVER_CHUNK = 500;
export const LOGS_STORAGE_MAX_DEFAULT = 10000;
export const LOGS_STORAGE_MAX_MIN = 1000;
export const LOGS_STORAGE_MAX_HARD_MAX = 50000;
/** Prefetch de logs en segundo plano (0 = desactivado; ahorra lecturas si no abres «Actividad»). */
export const LOGS_BACKGROUND_PREFETCH = 0;
/** Evita listeners que solo reflejan cambios de metadatos locales (menos trabajo en cliente). */
export const SNAPSHOT_LISTENER_OPTS = { includeMetadataChanges: false };
export const LOGS_TOTAL_COUNT_STALE_MS = 5 * 60 * 1000;

export function logsUseVisibleInPanelQuery(configLike) {
  return Boolean(configLike?.logsVisibleInPanelBackfillAt);
}

export function buildLogsRecentOrderQuery(cursor, take, useVisibleInPanel) {
  const col = getColRef('app_logs');
  if (useVisibleInPanel) {
    return cursor
      ? query(
          col,
          where('visibleInPanel', '==', true),
          orderBy(LOGS_ORDER_FIELD, 'desc'),
          startAfter(cursor),
          limit(take)
        )
      : query(col, where('visibleInPanel', '==', true), orderBy(LOGS_ORDER_FIELD, 'desc'), limit(take));
  }
  return cursor
    ? query(col, orderBy(LOGS_ORDER_FIELD, 'desc'), startAfter(cursor), limit(take))
    : query(col, orderBy(LOGS_ORDER_FIELD, 'desc'), limit(take));
}

export async function fetchDebugSessionLogs(debugSessionId) {
  const sid = String(debugSessionId || '').trim();
  if (!sid) return [];
  const col = getColRef('app_logs');
  const out = new Map();
  let cursor = null;
  for (let b = 0; b < 40; b++) {
    const q = cursor
      ? query(
          col,
          where('debugSessionId', '==', sid),
          where('isDebug', '==', true),
          orderBy(LOGS_ORDER_FIELD, 'desc'),
          startAfter(cursor),
          limit(LOGS_SERVER_CHUNK)
        )
      : query(
          col,
          where('debugSessionId', '==', sid),
          where('isDebug', '==', true),
          orderBy(LOGS_ORDER_FIELD, 'desc'),
          limit(LOGS_SERVER_CHUNK)
        );
    const snap = await getDocsFromServer(q);
    if (snap.empty) break;
    for (const d of snap.docs) out.set(String(d.id), { id: d.id, ...d.data() });
    cursor = snap.docs[snap.docs.length - 1];
    if (snap.docs.length < LOGS_SERVER_CHUNK) break;
  }
  return mergeLogsDedupById([[...out.values()]]);
}

/** Comprueba si el ID VNPM ya existe en cualquier evento (sin depender de tener toda la colección en memoria). */
export async function vnpPersonIdExistsInFirestore(vnpId) {
  const id = String(vnpId || '').trim();
  if (!id) return false;
  const q = query(getColRef('app_participants'), where('vnpPersonId', '==', id), limit(1));
  const snap = await getDocs(q);
  return !snap.empty;
}

/** Evita expandir/colapsar la fila cuando el clic fue en un control (botón, enlace, formulario). */
export const isRosterRowInteractiveClickTarget = (target) => {
  if (typeof Element === 'undefined' || !(target instanceof Element)) return false;
  return Boolean(
    target.closest('button, a, input, select, textarea, label, [role="button"], [contenteditable="true"]')
  );
};

/** Ids de filas derivadas (beca / saldo a favor) generadas en cliente para la lista de gastos. */
export function isScholarshipAutoExpenseIdForEvent(id, eventId) {
  if (!eventId || !id) return false;
  return id === `sch-auto-approved-${eventId}` || id === `sch-auto-pending-${eventId}`;
}
export function isManualCreditVirtualExpenseIdForEvent(id, eventId) {
  if (!eventId || !id || typeof id !== 'string') return false;
  return id.startsWith('manual-credit-') && id.endsWith(`-${eventId}`);
}
export function isDerivedAutoExpenseIdForEvent(id, eventId) {
  return isScholarshipAutoExpenseIdForEvent(id, eventId) || isManualCreditVirtualExpenseIdForEvent(id, eventId);
}

/** Subcolección de trozos (legado `formatVersion: 2`); ya no se escribe en copias nuevas. */
export const getBackupChunksColRef = (backupId) =>
  collection(db, 'app_backups', backupId, 'chunks');

export const BACKUP_STORAGE_PREFIX = 'app_auto_backups';
/** Copias con más de este número de meses (por fecha del id `YYYY-MM-DD`) se borran de Storage + Firestore. */
export const BACKUP_RETENTION_MONTHS = 3;

/** Evita solapes del efecto de copia (p. ej. React StrictMode o deps que disparan varias veces seguidas). */
export const scheduledBackupAsyncLock = { current: false };

export function clampLogsStorageLimit(raw) {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n)) return LOGS_STORAGE_MAX_DEFAULT;
  return Math.max(LOGS_STORAGE_MAX_MIN, Math.min(LOGS_STORAGE_MAX_HARD_MAX, n));
}

export const FIRESTORE_BATCH_LIMIT = 500;

export const deleteAllDocsInCollection = async (colRef) => {
  const snap = await getDocs(colRef);
  if (snap.empty) return;
  let batch = writeBatch(db);
  let count = 0;
  for (const d of snap.docs) {
    batch.delete(d.ref);
    count += 1;
    if (count >= 500) {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }
  }
  if (count > 0) await batch.commit();
};

/** Borrados en lotes de hasta 500 (límite de `writeBatch`). */
export const commitDeleteRefsInBatches = async (refs) => {
  if (!refs.length) return;
  for (let i = 0; i < refs.length; i += FIRESTORE_BATCH_LIMIT) {
    const batch = writeBatch(db);
    for (const r of refs.slice(i, i + FIRESTORE_BATCH_LIMIT)) {
      batch.delete(r);
    }
    await batch.commit();
  }
};

/** Escrituras `set` en lotes de hasta 500, en orden (sin miles de peticiones en paralelo). */
export const commitSetPayloadsInBatches = async (entries) => {
  if (!entries.length) return;
  for (let i = 0; i < entries.length; i += FIRESTORE_BATCH_LIMIT) {
    const batch = writeBatch(db);
    for (const { ref, data } of entries.slice(i, i + FIRESTORE_BATCH_LIMIT)) {
      batch.set(ref, omitUndefinedDeep(data));
    }
    await batch.commit();
  }
};

/** Copia automática: JSON en Storage (`app_auto_backups/{id}.json`) y manifest en `app_backups/{id}` (`formatVersion: 3`). */
export const writeAppBackupToStorage = async (
  backupId,
  { date, timestamp, participants, events, users },
  { backupKind = 'daily' } = {}
) => {
  await deleteAllDocsInCollection(getBackupChunksColRef(backupId));
  const payload = omitUndefinedDeep({
    date,
    timestamp,
    participants,
    events,
    users,
  });
  const jsonStr = JSON.stringify(payload);
  const path = `${BACKUP_STORAGE_PREFIX}/${backupId}.json`;
  await uploadString(storageRef(storage, path), jsonStr, 'raw', {
    contentType: 'application/json; charset=utf-8',
  });
  await setDoc(
    getDocRef('app_backups', backupId),
    omitUndefinedDeep({
      date,
      timestamp,
      formatVersion: 3,
      storagePath: path,
      storageSizeUtf8: new TextEncoder().encode(jsonStr).length,
      backupKind,
    })
  );
};

/**
 * Copia completa participantes + eventos (+ usuarios enmascarados) desde el servidor.
 * @returns {{ backupId: string, participantCount: number, eventCount: number }}
 */
export const performAppFullBackup = async ({
  backupId,
  date,
  usersForBackup,
  backupKind = 'daily',
  updateLastBackupDate = false,
  pruneRetentionMonths = null,
}) => {
  const [participantsSnap, eventsSnap] = await Promise.all([
    getDocsFromServer(getColRef('app_participants')),
    getDocsFromServer(getColRef('app_events')),
  ]);
  const participantsFull = participantsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (participantsFull.length === 0) {
    throw new Error('BACKUP_EMPTY_PARTICIPANTS');
  }
  const eventsFull = eventsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const usersSanitized = (usersForBackup || []).map((u) => ({
    ...u,
    password: '***',
    plainPasswordBackup: u.plainPasswordBackup ? '***' : undefined,
  }));

  await writeAppBackupToStorage(
    backupId,
    {
      date,
      timestamp: Date.now(),
      participants: participantsFull,
      events: eventsFull,
      users: usersSanitized,
    },
    { backupKind }
  );

  if (updateLastBackupDate) {
    await updateDoc(getDocRef('app_data', 'config'), { lastBackupDate: backupId });
  }
  if (typeof pruneRetentionMonths === 'number') {
    await pruneAppBackupsOlderThanRetention(new Date(), pruneRetentionMonths);
  }

  return {
    backupId,
    participantCount: participantsFull.length,
    eventCount: eventsFull.length,
  };
};

/** Elimina copias con id de fecha anterior al corte (mismo esquema `YYYY-MM-DD`). */
export const pruneAppBackupsOlderThanRetention = async (nowDate, monthsToKeep) => {
  const cutoff = new Date(nowDate.getFullYear(), nowDate.getMonth() - monthsToKeep, nowDate.getDate());
  const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;
  const listSnap = await getDocs(collection(db, 'app_backups'));
  for (const docSnap of listSnap.docs) {
    if (String(docSnap.id) >= cutoffStr) continue;
    const meta = docSnap.data() || {};
    try {
      if (Number(meta.formatVersion) === 3 && meta.storagePath) {
        await deleteObject(storageRef(storage, meta.storagePath)).catch(() => {});
        await deleteDoc(docSnap.ref);
      } else if (Number(meta.formatVersion) === 2) {
        await deleteAllDocsInCollection(getBackupChunksColRef(docSnap.id));
        await deleteDoc(docSnap.ref);
      } else {
        await deleteDoc(docSnap.ref);
      }
    } catch (e) {
      console.warn('Poda de copia antigua omitida:', docSnap.id, e);
    }
  }
};

/** Lee copia: Storage (`formatVersion: 3`), trozos Firestore (`formatVersion: 2`) o doc único legado. */
export const loadAppBackupMerged = async (backupId) => {
  const snap = await getDoc(getDocRef('app_backups', backupId));
  if (!snap.exists()) return null;
  const data = snap.data();
  if (Number(data.formatVersion) === 3 && data.storagePath) {
    const bytes = await getBytes(storageRef(storage, data.storagePath));
    const text = new TextDecoder('utf-8').decode(bytes);
    const parsed = JSON.parse(text);
    return {
      date: parsed.date ?? data.date,
      timestamp: parsed.timestamp ?? data.timestamp,
      participants: Array.isArray(parsed.participants) ? parsed.participants : [],
      events: Array.isArray(parsed.events) ? parsed.events : [],
      users: Array.isArray(parsed.users) ? parsed.users : [],
    };
  }
  if (data.formatVersion !== 2) {
    return data;
  }
  const chunksCol = getBackupChunksColRef(backupId);
  const qsnap = await getDocs(chunksCol);
  const buckets = { participants: [], events: [], users: [] };
  qsnap.forEach((d) => {
    const c = d.data();
    const k = c.kind;
    if (!buckets[k]) return;
    buckets[k].push({ index: c.index ?? 0, items: Array.isArray(c.items) ? c.items : [] });
  });
  const merge = (arr) =>
    arr.sort((a, b) => a.index - b.index).flatMap((x) => x.items);
  return {
    date: data.date,
    timestamp: data.timestamp,
    participants: merge(buckets.participants),
    events: merge(buckets.events),
    users: merge(buckets.users),
  };
};

/** Ventana para considerar una sesión «activa» (debe ser > intervalo de heartbeat). */
export const SESSION_TTL_MS = 90000;
/**
 * Heartbeat para mantener viva la sesión en Firestore. Menos frecuencia = menos escrituras;
 * debe seguir siendo claramente menor que SESSION_TTL_MS para no caducar la sesión.
 */
export const SESSION_HEARTBEAT_MS = 45000;

/** ID único por pestaña (sessionStorage); al cerrar la pestaña desaparece, pero el doc en Firestore se borra en pagehide. */
export const getTabSessionId = () => {
  try {
    let id = sessionStorage.getItem('vnpm_tab_session_id');
    if (!id) {
      id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `s_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      sessionStorage.setItem('vnpm_tab_session_id', id);
    }
    return id;
  } catch {
    return `fallback_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
};

export const sessionDocId = (userId, tabSessionId) => `${String(userId)}_${tabSessionId}`;

export const countOtherActiveSessions = async (userId, myTabSessionId) => {
  const q = query(getColRef('app_sessions'), where('userId', '==', String(userId)));
  const snap = await getDocs(q);
  const now = Date.now();
  let n = 0;
  snap.forEach((d) => {
    const data = d.data();
    if (data.sessionId === myTabSessionId) return;
    if ((data.lastHeartbeat || 0) > now - SESSION_TTL_MS) n += 1;
  });
  return n;
};

/** Límite por cuenta en `app_users` (1–20); solo aplica a rol Administrador. */
export const clampAdminMaxConcurrentSessions = (raw) => {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(20, Math.floor(n)));
};

/** SuperUsuario: sin tope. Administrador: `maxConcurrentSessions` en el perfil. Editor/Lector: una sesión. */
export const getMaxConcurrentSessionsForUser = (user) => {
  if (!user) return 1;
  if (user.role === 'SuperUsuario') return Infinity;
  if (user.role === 'Administrador') return clampAdminMaxConcurrentSessions(user.maxConcurrentSessions ?? 1);
  return 1;
};

export const BLOOD_TYPE_OTHER_KEY = BLOOD_TYPE_STATS_OTHER;
export const BLOOD_BAR_BG_CLASSES = [
  'bg-red-600',
  'bg-rose-600',
  'bg-orange-600',
  'bg-amber-600',
  'bg-pink-600',
  'bg-fuchsia-600',
  'bg-red-700',
  'bg-orange-700',
];
export const GENDERS = ["Hombre", "Mujer"];
/** Desayuno Conferencia u otros tipos cuyo nombre incluya «desayuno»: no se solicita transporte en formularios. */
export const eventTypeIsDesayuno = (eventType) => String(eventType || '').toLowerCase().includes('desayuno');
export const RESPONSIVA_STATUSES = ["Pendiente", "Entregada"];
/** Separación en el matiz para muchas sedes sin repetir el mismo par de tonos seguidos. */
export const LOCATION_CHART_GOLDEN_HUE = 137.508;

/**
 * Un color HSL distinto por cada sede del evento (orden estable por nombre).
 * Escala a cualquier cantidad de sedes; nuevas sedes reciben huecos nuevos en el círculo.
 */
export const buildLocationChartColorMap = (locations) => {
  const list = [...(locations || [])].filter((x) => x != null && String(x).trim() !== '');
  const sorted = [...list].sort((a, b) => String(a).localeCompare(String(b), 'es'));
  const map = new Map();
  const n = sorted.length;
  sorted.forEach((loc, i) => {
    const h = n <= 1 ? 210 : (i * LOCATION_CHART_GOLDEN_HUE) % 360;
    map.set(loc, `hsl(${h.toFixed(1)} 68% 50%)`);
  });
  return map;
};

/** Segmento Teens / Jóvenes donde contabilizar el bautizo (evento). Servidor: sigue serverAssignment (un adulto puede servir en Teens). Campista: edad o campAssignment. Null si no aplica o falta dato (ej. Ambos sin elegir). */
export const getBaptismAccountingSegment = (personLike) => {
  if (!isSiValue(personLike?.willBeBaptized)) return null;
  const isServer = isSiValue(personLike?.isServer);
  if (isServer) {
    const sa = String(personLike?.serverAssignment || '').trim();
    if (sa === 'Ambos') {
      const bs = String(personLike?.baptismSegment || '').trim();
      return bs === 'Teens' || bs === 'Jóvenes' ? bs : null;
    }
    if (sa === 'Teens' || sa === 'Jóvenes') return sa;
    return null;
  }
  const camp = String(personLike?.campAssignment || '').trim();
  if (camp === 'Teens' || camp === 'Jóvenes') return camp;
  const ageNum = parseInt(personLike?.age, 10) || 0;
  return ageNum < 18 ? 'Teens' : 'Jóvenes';
};

/**
 * Segmento del campamento para el dashboard (Teens / Jóvenes / Ambos): incluye campistas, servidores, becados, cortesías, empleados, etc.
 * Servidor: `serverAssignment`; si falta, campAssignment o edad. Campista: `campAssignment` o edad.
 */
export const getCampaAttendanceSegment = (person) => {
  const ageNum = parseInt(person?.age, 10) || 0;
  if (isSiValue(person?.isServer)) {
    const sa = String(person?.serverAssignment || '').trim();
    if (sa === 'Ambos') {
      const mix = getAmbosServeInSegmentOrEmpty(person);
      if (mix === 'Teens' || mix === 'Jóvenes') return mix;
      return 'Ambos';
    }
    if (sa === 'Teens' || sa === 'Jóvenes') return sa;
    const camp = String(person?.campAssignment || '').trim();
    if (camp === 'Teens' || camp === 'Jóvenes') return camp;
    return ageNum < 18 ? 'Teens' : 'Jóvenes';
  }
  const assignment = String(person?.campAssignment || '').trim();
  if (assignment === 'Teens' || assignment === 'Jóvenes') return assignment;
  return ageNum < 18 ? 'Teens' : 'Jóvenes';
};

/**
 * Filtro Teens/Jóvenes del dashboard (Todos / Solo Teens / Solo Jóvenes).
 * Asignación «Ambos» tarifa única cuenta en ambos; Ambos con sirve en Teens/Jóvenes solo en ese segmento.
 */
export const campaAttendanceScopeMatches = (isCampaEvent, person, scope) => {
  if (!isCampaEvent || scope === 'all' || scope == null || scope === '') return true;
  const seg = getCampaAttendanceSegment(person);
  if (scope === 'teens') return seg === 'Teens' || seg === 'Ambos';
  if (scope === 'jovenes') return seg === 'Jóvenes' || seg === 'Ambos';
  return true;
};

export const NO_SERVICE_LABEL = CASH_CUT_NO_SERVICE_LABEL;

export const DEFAULT_SERVE_AREA_OPTIONS = ['Jueces', 'Capitanes', 'Staff', 'Seguridad', 'Otro'];
export const DEFAULT_ALLERGY_OPTIONS = ['Alimentos', 'Medicamentos', 'Ambientales', 'Insectos', 'Otra'];

export const parsePreferredServeArea = (str, knownOpts = DEFAULT_SERVE_AREA_OPTIONS) => {
  const selected = new Set();
  let otroText = '';
  if (!str || typeof str !== 'string') return { selected, otroText };
  const parts = str.split(',').map(p => p.trim()).filter(Boolean);
  for (const p of parts) {
    if (p === 'Otro') selected.add('Otro');
    else if (p.startsWith('Otro: ')) { selected.add('Otro'); otroText = p.slice(6).trim(); }
    else if (knownOpts.includes(p)) selected.add(p);
    else { selected.add('Otro'); otroText = p; } // legacy free text → Otro
  }
  return { selected, otroText };
};

export const formatPreferredServeArea = (selected, otroText) => {
  const arr = [...selected].filter(x => x !== 'Otro');
  if (selected.has('Otro')) arr.push(otroText ? `Otro: ${otroText}` : 'Otro');
  return arr.join(', ');
};
// Horarios por defecto (24h). «Segundo» de 11 a 13; «Tercero» de 13 a 17.
export const DEFAULT_SERVICE_SLOTS = {
  Primero: { start: '07:00', end: '11:00' },
  Segundo: { start: '11:00', end: '13:00' },
  Tercero: { start: '13:00', end: '17:00' },
};

export const defaultLocations = ["Norte", "Sur", "Izcalli", "Coapa", "Acapulco", "Toluca"];
export const defaultRegStatus = defaultLocations.reduce((acc, loc) => ({ ...acc, [loc]: true }), {});

/** Campa: asistencia sin cobro (sí cuentan en registro). Mutuamente excluyente con beca. */
export const ATTENDANCE_SPECIAL = { ninguno: 'ninguno', empleado: 'empleado', cortesia: 'cortesia', pastor: 'pastor' };
export const isFreeAttendanceType = (t) =>
  t === ATTENDANCE_SPECIAL.empleado || t === ATTENDANCE_SPECIAL.cortesia || t === ATTENDANCE_SPECIAL.pastor;
export const normalizeAttendanceSpecial = (personLike) => {
  const t = personLike?.attendanceSpecialType;
  if (t === ATTENDANCE_SPECIAL.empleado || t === ATTENDANCE_SPECIAL.cortesia || t === ATTENDANCE_SPECIAL.pastor) {
    return t;
  }
  return ATTENDANCE_SPECIAL.ninguno;
};

export const buildAttendanceSpecialFormOptions = (showPastor) => {
  const options = [
    { id: ATTENDANCE_SPECIAL.ninguno, label: 'Ninguno', Icon: null },
    { id: ATTENDANCE_SPECIAL.empleado, label: 'Empleado', Icon: Briefcase },
    { id: ATTENDANCE_SPECIAL.cortesia, label: 'Cortesía', Icon: Gift },
  ];
  if (showPastor) options.push({ id: ATTENDANCE_SPECIAL.pastor, label: 'Pastor', Icon: Church });
  return options;
};

/** Restante por liquidar para filtros de lista (0 ⇒ liquidado: sin costo, beca total, cortesía/empleado o pagado al día). */
export const getRosterLiquidationRemainder = (person, getLiquidationTargetFn) => {
  const target = Number(getLiquidationTargetFn(person)) || 0;
  const paid = parseFloat(person?.paid || 0) || 0;
  return Math.max(0, target - paid);
};

export const isRosterPersonLiquidadoForFilter = (person, getLiquidationTargetFn) =>
  getRosterLiquidationRemainder(person, getLiquidationTargetFn) < 0.005;

/** Pagó más que el objetivo de liquidación (saldo a favor). */
export const isRosterSaldoAFavor = (person, getLiquidationTargetFn) => {
  const target = Number(getLiquidationTargetFn(person)) || 0;
  const paid = parseFloat(person?.paid || 0) || 0;
  return paid > target + 0.005;
};

/** Valor interno canúnico (sin tilde) para guardar y comparar con isSiValue(). */
export const SI = 'Si';

/** Compara beca/servidor/bautizo/etc.; acepta "Si", "Sí" y datos legacy. */
export const isSiValue = (v) => {
  const s = String(v ?? '').trim();
  if (s === SI || s === SI_LABEL) return true;
  if (s.toLowerCase() === 's\u00ed') return true;
  if (s.length === 2 && s[0] === 'S' && (s[1] === '?' || s[1] === '\uFFFD')) return true;
  return false;
};

/** Texto de UI para un campo Si/No (muestra SI_LABEL o "No"). */
export const formatSiNo = (v) => (isSiValue(v) ? SI_LABEL : 'No');

/** Comentarios generales del registro: `registrationComments` y filas legacy `paymentHistory` con `kind: 'comment'`. */
export function getGeneralRegistrationCommentsForDisplay(person) {
  const fromField = Array.isArray(person?.registrationComments)
    ? person.registrationComments.map((c) => ({ ...c, _source: 'field' }))
    : [];
  const legacy = [];
  (person?.paymentHistory || []).forEach((h, fullIdx) => {
    if (!h || h.kind !== 'comment') return;
    legacy.push({
      id: h.id != null ? h.id : `leg_idx_${fullIdx}`,
      text: h.commentText || h.comment || '',
      createdAt: h.recordedAt ? new Date(h.recordedAt).getTime() : Date.now(),
      createdBy: h.registeredBy,
      _source: 'legacy',
      _fullPaymentHistoryIndex: fullIdx,
    });
  });
  return [...fromField, ...legacy].sort((a, b) => (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0));
}

/** Texto buscable: comentarios generales del registro y notas en abonos del historial. */
export function participantMatchesRosterSearchComments(person, searchLower) {
  if (!searchLower) return false;
  for (const c of getGeneralRegistrationCommentsForDisplay(person)) {
    if (String(c?.text || '').toLowerCase().includes(searchLower)) return true;
  }
  for (const h of person?.paymentHistory || []) {
    if (!h || h.kind === 'comment') continue;
    if (String(h.note || '').toLowerCase().includes(searchLower)) return true;
  }
  return false;
}

export function usernamesEqualForCommentAuth(a, b) {
  const sa = String(a ?? '').trim();
  const sb = String(b ?? '').trim();
  return sa !== '' && sb !== '' && sa === sb;
}

/** SuperUsuario, Administrador o quien escribió el comentario/nota. */
export function userCanDeleteRegistrationComment(c, { currentUser, isSuperUser, hasAdminRights }) {
  if (currentUser?.role === 'Lector') return false;
  if (isSuperUser || hasAdminRights) return true;
  return usernamesEqualForCommentAuth(c?.createdBy, currentUser?.username);
}

export function userCanOpenAbonoNoteEditModal(pay, { currentUser, canEditAbonosAndPaymentHistory }) {
  if (currentUser?.role === 'Lector' || !pay || pay.kind === 'comment') return false;
  if (canEditAbonosAndPaymentHistory) return true;
  return usernamesEqualForCommentAuth(pay?.registeredBy, currentUser?.username);
}

export function userCanDeleteAbonoNote(pay, { currentUser, isSuperUser, hasAdminRights }) {
  if (currentUser?.role === 'Lector' || !pay || !String(pay.note || '').trim()) return false;
  if (isSuperUser || hasAdminRights) return true;
  return usernamesEqualForCommentAuth(pay?.registeredBy, currentUser?.username);
}

export const NEW_EVENT_FORM_DRAFT_PREFIX = 'vnpm_new_event_form_draft';
export const newEventFormDraftStorageKey = (userId) => `${NEW_EVENT_FORM_DRAFT_PREFIX}:${String(userId || '')}`;

export function clearNewEventFormDraft(userId) {
  if (typeof window === 'undefined' || !userId) return;
  try {
    window.localStorage.removeItem(newEventFormDraftStorageKey(userId));
  } catch {
    /* */
  }
}

/** Menú lateral del evento: SuperUsuario define qué ven Editor y Lector. Administrador y SuperUsuario no se limitan. */
export const DEFAULT_PANEL_NAV = {
  dashboard: true,
  roleServidor: true,
  roleEmpleado: true,
  roleBautizado: true,
  roleBecado: true,
  roleCampero: true,
  roleCortesia: true,
  rolePastor: true,
  roleAsistente: true,
  bautizados: true,
  serversPage: true,
  becados: true,
  cashCut: true,
  expenseList: true,
  responsivas: true,
  registroGlobal: true,
  transporte: true,
  locations: true
};

export const PANEL_NAV_TAB_KEYS = {
  Summary: 'dashboard',
  RoleServidor: 'roleServidor',
  RoleEmpleado: 'roleEmpleado',
  RoleBautizado: 'roleBautizado',
  RoleBecado: 'roleBecado',
  RoleCampero: 'roleCampero',
  RoleCortesia: 'roleCortesia',
  RolePastor: 'rolePastor',
  RoleAsistente: 'roleAsistente',
  Bautizados: 'roleBautizado',
  ServersPage: 'roleServidor',
  ExpenseList: 'expenseList',
  CashCut: 'cashCut',
  Becados: 'roleBecado',
  Responsivas: 'responsivas',
  RegistroGlobal: 'registroGlobal',
  PastoresPage: 'rolePastor',
  TransportPlanning: 'transporte',
};

export const PANEL_NAV_CONFIG_ITEMS = [
  { key: 'dashboard', group: 'Resumen', label: 'Dashboard', hint: 'Resumen del evento; desactivado por defecto en Editor/Lector hasta que se permita aquí o por evento.' },
  { key: 'roleServidor', group: 'Tipos de asistencia', label: 'Servidor', hint: 'Vista filtrada del padrón por tipo Servidor.' },
  { key: 'roleEmpleado', group: 'Tipos de asistencia', label: 'Empleado', hint: 'Vista filtrada por Empleado.' },
  { key: 'roleBautizado', group: 'Tipos de asistencia', label: 'Bautizado', hint: 'Vista filtrada por Bautizado.' },
  { key: 'roleBecado', group: 'Tipos de asistencia', label: 'Becado', hint: 'Vista filtrada por Becado.' },
  { key: 'roleCampero', group: 'Tipos de asistencia', label: 'Campero', hint: 'Vista filtrada por Campero.' },
  { key: 'roleCortesia', group: 'Tipos de asistencia', label: 'Cortesía', hint: 'Vista filtrada por Cortesía.' },
  { key: 'rolePastor', group: 'Tipos de asistencia', label: 'Pastor', hint: 'Vista filtrada por Pastor.' },
  { key: 'roleAsistente', group: 'Tipos de asistencia', label: 'Asistente', hint: 'Vista filtrada por Asistente.' },
  { key: 'registroGlobal', group: 'Registros', label: 'Registro global', hint: 'Tabla consolidada del evento.' },
  { key: 'locations', group: 'Registros', label: 'Sedes en el menú', hint: 'Accesos directos a cada sede en el lateral.' },
  { key: 'responsivas', group: 'Operación', label: 'Responsivas', hint: 'Visible cuando la responsiva esté habilitada para el evento.' },
  {
    key: 'transporte',
    group: 'Operación',
    label: 'Transporte',
    hint: 'Camiones/camionetas por sede y conteo de carros; solo si el evento tiene campos de transporte activos. Editor/Lector: desactivado por defecto.',
  },
  { key: 'cashCut', group: 'Finanzas', label: 'Corte de caja', hint: 'Igual: respeta rol de administrador.' },
  { key: 'expenseList', group: 'Finanzas', label: 'Lista de gastos', hint: 'Además debe tener permiso de gastos en su usuario.' },
];

/** Editor/Lector recién creados: sedes en menú; dashboard y el resto se habilitan explícitamente por evento o menú global. */
export const EDITOR_LECTOR_PANEL_DEFAULT = {
  dashboard: false,
  roleServidor: false,
  roleEmpleado: false,
  roleBautizado: false,
  roleBecado: false,
  roleCampero: false,
  roleCortesia: false,
  rolePastor: false,
  roleAsistente: false,
  bautizados: false,
  serversPage: false,
  becados: false,
  cashCut: false,
  responsivas: false,
  expenseList: false,
  registroGlobal: false,
  transporte: false,
  locations: true,
};

/** Entradas del menú lateral editables por evento (lista de gastos va en permisos avanzados, solo SuperUsuario). */
export const PANEL_NAV_SIDEBAR_ITEMS = PANEL_NAV_CONFIG_ITEMS.filter((i) => i.key !== 'expenseList');

export const resolveEventNamesForUserLog = (eventIds, eventsList) => {
  if (!Array.isArray(eventIds) || eventIds.length === 0) return 'todos los eventos';
  const names = eventIds.map((id) => {
    const ev = (eventsList || []).find((e) => String(e.id) === String(id));
    return ev?.name || String(id);
  });
  return names.join(', ');
};

export const summarizeLocationsForUserLog = (locs) => {
  if (!Array.isArray(locs) || locs.length === 0) return 'todas las sedes';
  return locs.join(', ');
};

/** Misma forma que los filtros de lista por sede; instancia aparte para Registro Global. */
export const createEmptyGlobalRegistryListFilters = () => ({
  searchTerm: '',
  sortBy: 'registered-desc',
  filterWhatsAppPending: 'all',
  filterLiquidation: 'all',
  filterFirstTimeId: 'all',
  filterPendingRefund: 'all',
  filterResponsiva: 'all',
  filterGender: 'all',
  filterTransport: 'all',
  filterPaymentType: 'all',
  filterTravelFrom: 'all',
  filterTravelTo: 'all',
  /** Unifica servidor (Teens/Jóvenes/Ambos/camperos) + empleado/cortesía. Ver `migrateLegacyRosterRoleFilter`. */
  filterRosterRole: 'all',
  filterAssignment: 'all',
  filterSwim: 'all',
  filterBaptism: 'all',
  /** all | single | married | pending-spouse — solo aplica en campamentos (Estado civil). */
  filterMaritalStatus: 'all',
  filterScholarship: 'all',
  filterMedical: 'all',
  filterRegistrationStatus: 'all',
  ...ROSTER_EXTRA_FILTER_DEFAULTS,
});

/** Migra filterServer + filterAttendanceSpecial guardados antes del filtro unificado. */
export const migrateLegacyRosterRoleFilter = (saved) => {
  if (!saved || typeof saved !== 'object') return 'all';
  if (typeof saved.filterRosterRole === 'string' && saved.filterRosterRole !== 'all') return saved.filterRosterRole;
  const att = saved.filterAttendanceSpecial;
  const srv = saved.filterServer;
  if (att === 'empleado') return 'empleado';
  if (att === 'cortesia') return 'cortesia';
  if (att === 'ninguno' && srv === 'No') return 'camperos';
  if (srv === 'Teens') return 'servidor-teens';
  if (srv === 'Jóvenes') return 'servidor-jovenes';
  if (srv === 'Ambos') return 'servidor-ambos';
  if (srv === 'Si' || srv === 'S\u00ed') return 'servidor';
  return 'all';
};

export const mergeGlobalRegistryListFilters = (saved) => {
  const empty = createEmptyGlobalRegistryListFilters();
  if (!saved || typeof saved !== 'object') return empty;
  const out = { ...empty };
  for (const key of Object.keys(empty)) {
    if (typeof saved[key] === 'string') out[key] = saved[key];
  }
  if (out.sortBy === 'none') out.sortBy = 'registered-asc';
  out.filterRosterRole = migrateLegacyRosterRoleFilter(saved);
  return out;
};

/** Ids de participantes que reciben vínculo de pareja desde otro registro (misma lógica que filtro «Casado»). */
export function buildSpouseIncomingIdSetForEvent(participants, eventId) {
  const incoming = new Set();
  const eid = String(eventId || '');
  for (const x of participants || []) {
    if (String(x.eventId || '') !== eid) continue;
    const sid = String(x.spouseParticipantId || '').trim();
    if (sid) incoming.add(sid);
  }
  return incoming;
}

export const lsKeyShowGrossCommission = (userId) => `vina_show_gross_commission_${userId}`;
/** Filtros de listas (registro, resumen, logs, gastos, etc.) por usuario; sobreviven cierre de sesión y cambio de evento/sede/pestaña. */
export const lsKeyUserFilters = (userId) => `vina_user_filters_${userId}`;
/** Filtros de lista por sede + registro global (Firestore + caché local; únicos por sede y por evento). */
export const lsKeyListFiltersPrefs = (userId) => `vina_list_filters_prefs_${userId}`;
export const LIST_FILTERS_PREFS_PERSIST_MS = 700;

/** Sesión del panel (no anónima del QR/responsiva) lista para escribir prefs en Firestore. */
export const canPersistPanelUserPrefsToFirestore = () => {
  const user = auth.currentUser;
  return !!(user && !user.isAnonymous);
};

/** Tablas Activos / Espera / Cancelados en registro por sede (solo ≥md). */
export const ROSTER_LIST_TABLE_CLASS = 'w-full text-left table-fixed md:min-w-[54rem]';
export const ROSTER_COL_FINANCES_W = '10.5rem';
/** Una fila con Abonar + Comentario + Editar + Detalles (sin salto de línea). */
export const ROSTER_COL_ACTIONS_W = '27rem';
export const ROSTER_TH_PARTICIPANT = 'px-4 py-3 align-top min-w-0';
export const ROSTER_TH_FINANCES = 'px-2 py-3 pr-3 align-top text-center overflow-hidden box-border';
export const ROSTER_TH_ACTIONS = 'px-3 pl-3 py-3 text-center align-top overflow-hidden box-border';
export const ROSTER_TD_FINANCES = 'px-2 py-3 pr-3 align-top text-right overflow-hidden box-border';
export const ROSTER_TD_ACTIONS = 'px-3 py-4 pl-3 align-top text-center overflow-hidden box-border min-w-0';

export function RosterListColgroup() {
  return (
    <colgroup>
      <col />
      <col style={{ width: ROSTER_COL_FINANCES_W }} />
      <col style={{ width: ROSTER_COL_ACTIONS_W }} />
    </colgroup>
  );
}
/** Fila 1: Abonar, Comentario, Editar, Detalles en una sola línea (columna ancha). */
export const ROSTER_QUICK_ACTIONS_ROW_PRIMARY =
  'flex flex-wrap items-center justify-center gap-1.5 w-full min-w-0 max-w-full';
export const ROSTER_QUICK_ACTION_BTN_MOBILE =
  `${uiRosterMobile.actionsIconBtn}`;
/** Acciones rápidas por fila (Abonar, WhatsApp, Baja, etc.): misma altura y texto 11px. */
export const ROSTER_QUICK_ACTION_BTN_BASE =
  'inline-flex shrink-0 items-center justify-center whitespace-nowrap px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all shadow-sm active:scale-[0.98]';
export const ROSTER_QUICK_ACTION_ICON_PROPS = { size: 14, className: 'inline mr-1 shrink-0' };
/** Colapsar/expandir listas Activos · Becados (espera) · Cancelados en registro por sede (por usuario). */
export const lsKeyRosterSections = (userId) => `vina_roster_sections_${userId}`;

/** Texto mostrado en lugar del nombre del gasto cuando el creador oculta el concepto a otros. */
export const MASKED_EXPENSE_CONCEPT_LABEL = 'Oculto';

/** Por defecto los conceptos propios están ocultos a otros; solo `hideMyExpenseConcepts === false` desactiva explícitamente. */
export const isHideMyExpenseConceptsOn = (userLike) => userLike?.hideMyExpenseConcepts !== false;

// Helper: Formatear fecha a DD-MMM-YYYY
export const formatDisplayDate = (dateString) => {
  if (!dateString) return 'Sin fecha';
  try {
    const d = new Date(dateString + 'T00:00:00');
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/\./g, '');
  } catch {
    return dateString;
  }
};

/** Valor para input datetime-local (zona local del navegador). */
export const toDatetimeLocalValue = (isoOrMs) => {
  let d;
  if (typeof isoOrMs === 'number') d = new Date(isoOrMs);
  else if (typeof isoOrMs === 'string' && isoOrMs) d = new Date(isoOrMs);
  else return '';
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const fromDatetimeLocalToIso = (localStr) => {
  if (!localStr || typeof localStr !== 'string') return null;
  const d = new Date(localStr);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

/** ISO string, Date, Firestore Timestamp (toDate / { seconds, nanoseconds }). */
export const parseFlexibleInstantMs = (raw) => {
  if (raw == null || raw === '') return null;
  if (typeof raw?.toDate === 'function') {
    const d = raw.toDate();
    const t = d.getTime();
    return Number.isNaN(t) ? null : t;
  }
  if (typeof raw === 'object' && typeof raw.seconds === 'number') {
    return raw.seconds * 1000 + Math.floor((raw.nanoseconds || 0) / 1e6);
  }
  if (typeof raw === 'string') {
    const s = raw.trim();
    // Solo fecha: usar mediodía local para que el día civil coincida con la sede (evita UTC medianoche … día anterior).
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [yy, mm, dd] = s.split('-').map((n) => parseInt(n, 10));
      const d = new Date(yy, mm - 1, dd, 12, 0, 0, 0);
      const t = d.getTime();
      return Number.isNaN(t) ? null : t;
    }
    const mx = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(.+))?$/i);
    if (mx) {
      const dd = parseInt(mx[1], 10);
      const mm = parseInt(mx[2], 10);
      const yy = parseInt(mx[3], 10);
      let hours = 12;
      let minutes = 0;
      let seconds = 0;
      const timePart = String(mx[4] || '').trim().toLowerCase();
      if (timePart) {
        const tm = timePart.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?)?/i);
        if (tm) {
          hours = parseInt(tm[1], 10);
          minutes = parseInt(tm[2], 10);
          seconds = tm[3] ? parseInt(tm[3], 10) : 0;
          const ampm = String(tm[4] || '').replace(/\s/g, '');
          if (ampm.startsWith('p') && hours < 12) hours += 12;
          if (ampm.startsWith('a') && hours === 12) hours = 0;
        }
      }
      const dMx = new Date(yy, mm - 1, dd, hours, minutes, seconds, 0);
      const tMx = dMx.getTime();
      if (!Number.isNaN(tMx)) return tMx;
    }
  }
  const d = raw instanceof Date ? raw : new Date(raw);
  const t = d.getTime();
  return Number.isNaN(t) ? null : t;
};

/** Orden por fecha de registro: más antiguos arriba (`registeredAt`); sin fecha al final. */
export const compareParticipantsRegisteredAtTieBreak = (a, b) => {
  const aVirt = !!a?.__globalRegistryVirtual;
  const bVirt = !!b?.__globalRegistryVirtual;
  if (aVirt !== bVirt) return aVirt ? 1 : -1;
  return String(a?.id ?? '').localeCompare(String(b?.id ?? ''), 'es');
};

export const compareParticipantsByRegisteredAtAsc = (a, b) => {
  const ma = parseFlexibleInstantMs(a?.registeredAt);
  const mb = parseFlexibleInstantMs(b?.registeredAt);
  const fa = ma != null && Number.isFinite(ma) ? ma : Number.MAX_SAFE_INTEGER;
  const fb = mb != null && Number.isFinite(mb) ? mb : Number.MAX_SAFE_INTEGER;
  if (fa !== fb) return fa - fb;
  return compareParticipantsRegisteredAtTieBreak(a, b);
};

export const compareParticipantsByRegisteredAtDesc = (a, b) => {
  const ma = parseFlexibleInstantMs(a?.registeredAt);
  const mb = parseFlexibleInstantMs(b?.registeredAt);
  const fa = ma != null && Number.isFinite(ma) ? ma : Number.MAX_SAFE_INTEGER;
  const fb = mb != null && Number.isFinite(mb) ? mb : Number.MAX_SAFE_INTEGER;
  if (fa !== fb) return fb - fa;
  return compareParticipantsRegisteredAtTieBreak(a, b);
};

export const formatPayHistoryRowDate = (pay) => {
  const ms = parseFlexibleInstantMs(pay?.recordedAt);
  if (ms != null) return new Date(ms).toLocaleString('es-MX');
  return pay?.date || '?';
};

/** fallbackMs: p. ej. registeredAt del participante si recordedAt no parsea (evita usar Date.now() en cortes). */
export const getPaymentHistoryTimestamp = (h, fallbackMs = null) => {
  const fromRecorded = parsePaymentHistoryRecordedAtMs(h);
  if (fromRecorded != null) return fromRecorded;
  if (h?.recordedAt != null) {
    const t = parseFlexibleInstantMs(h.recordedAt);
    if (t != null) return t;
  }
  if (h?.date != null) {
    const t = parseFlexibleInstantMs(h.date);
    if (t != null) return t;
  }
  if (fallbackMs != null && Number.isFinite(fallbackMs)) return fallbackMs;
  return null;
};

export const getPaymentRowInstantMsPreferRecorded = (row) => {
  if (!row || row.kind === 'comment') return null;
  const fromRec = parseFlexibleInstantMs(row.recordedAt);
  if (fromRec != null) return fromRec;
  if (typeof row.id === 'number' && Number.isFinite(row.id)) return row.id;
  const idStr = row.id != null ? String(row.id).trim() : '';
  if (/^\d{10,}$/.test(idStr)) return Number(idStr);
  return null;
};

// UI Reusable Classes (altura unificada con Becado / Servidor / Bautizo)
export const inputClasses = formPanelInputClasses;
export const labelClasses = formPanelLabelClasses;
export const fieldStack = formFieldStack;
/** Fila compacta en modal de precios (fases campista / servidor). */
export const inputClassesPhase = formPhaseInputClasses;
export const labelClassesPhase = formPhaseLabelClasses;
/** Borde rojo marcado (prioridad sobre `inputClasses`) para campos obligatorios incompletos. */
export const getRequiredFieldClass = (missing) =>
  missing
    ? '!border-2 !border-red-600 bg-red-50 dark:!bg-red-950 ring-2 ring-red-200 dark:ring-red-800 focus:!border-red-600 focus:!ring-2 focus:!ring-red-400 dark:focus:!ring-red-600 text-slate-900 dark:text-red-50 placeholder:text-red-500/70 dark:placeholder:text-red-300'
    : '';
export const calculateAgeFromBirthDate = (birthDate) => {
  const iso = normalizeBirthDateToIso(birthDate);
  if (!iso) return '';
  const b = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(b.getTime())) return '';
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const monthDiff = now.getMonth() - b.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < b.getDate())) age -= 1;
  if (!Number.isFinite(age) || age < 0 || age > 120) return '';
  return String(age);
};

/** Edad para reglas de familia / duplicados: campo `age` o calculada desde `birthDate`. */
export const getEffectiveParticipantAge = (p) => {
  if (!p) return '';
  const direct = parseInt(p.age, 10);
  if (Number.isFinite(direct) && direct >= 0) return String(direct);
  return calculateAgeFromBirthDate(p.birthDate || '') || '';
};
export const resolveLlegaEnCarro = (personLike) => {
  if (typeof personLike?.llegaEnCarro === 'boolean') return personLike.llegaEnCarro;
  if (isSiValue(personLike?.llegaEnCarro)) return true;
  if (personLike?.llegaEnCarro === 'No') return false;
  return (personLike?.transportType || 'Camión') === 'Carro';
};
export const resolveRegresaEnCarro = (personLike) => {
  if (typeof personLike?.regresaEnCarro === 'boolean') return personLike.regresaEnCarro;
  if (isSiValue(personLike?.regresaEnCarro)) return true;
  if (personLike?.regresaEnCarro === 'No') return false;
  return (personLike?.transportType || 'Camión') === 'Carro';
};
export const CopyButton = ({ text, label }) => {
  if (!text || String(text).trim() === '' || String(text).trim() === '—') return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        navigator.clipboard.writeText(String(text).trim())
          .then(() => emitGlobalSystemAlert(`¡${label} copiado!`, { tone: 'success', ms: 2000 }))
          .catch(() => emitGlobalSystemAlert('Error al copiar', { tone: 'warn', ms: 2000 }));
      }}
      className="ml-1.5 p-0.5 inline-flex items-center justify-center rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all active:scale-90 cursor-pointer"
      title={`Copiar ${label}`}
    >
      <Copy size={12} className="shrink-0" />
    </button>
  );
};
export const resolveTransportSummary = (personLike, eventType, _bautizosEventLike = null) => {
  const llegaCarro = resolveLlegaEnCarro(personLike);
  const regresaCarro = resolveRegresaEnCarro(personLike);
  
  const loc = String(personLike?.location || '').trim();
  const fromLoc = String(personLike?.travelFrom || '').trim();
  const toLoc = String(personLike?.travelTo || '').trim();

  let llegaLabel = llegaCarro ? 'Llega carro' : 'Llega camión';
  if (!llegaCarro && fromLoc && loc && fromLoc.toLowerCase() !== loc.toLowerCase()) {
    llegaLabel = `Llega camión (${fromLoc})`;
  }

  let regresaLabel = regresaCarro ? 'Regresa carro' : 'Regresa camión';
  if (!regresaCarro && toLoc && loc && toLoc.toLowerCase() !== loc.toLowerCase()) {
    regresaLabel = `Regresa camión (${toLoc})`;
  }

  return `${llegaLabel} / ${regresaLabel}`;
};
export const btnPrimary = "py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 flex justify-center items-center gap-2 text-sm";
export const btnSecondary = "py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all text-sm flex justify-center items-center gap-2";
/** Botones superiores del dashboard (QR, cupo, comisiones, vista): misma altura y estilo base. */
export const DASH_TOP_BTN =
  'inline-flex items-center justify-center gap-2 h-11 min-w-0 px-3 sm:px-4 rounded-xl text-xs font-black border transition-colors shadow-sm';
/** Variante claro/oscuro para botones secundarios del dashboard (evita «blanco fantasma» en dark). */
export const DASH_TOP_BTN_NEUTRAL =
  'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-700';
export const getCommissionToggleColorClasses = (isGrossView) =>
  isGrossView
    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 dark:border-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 dark:text-white'
    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 dark:border-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 dark:text-white';
/** Mismo acabado que acciones rápidas en modo oscuro (sombra + escala al pulsar). */
export const QUICK_ACTION_DARK_INTERACTION = 'dark:shadow-sm dark:transition-all dark:active:scale-[0.98]';
export const getCommissionToggleBtnClasses = (isGrossView) =>
  `flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-colors shadow-sm ${QUICK_ACTION_DARK_INTERACTION} ${getCommissionToggleColorClasses(isGrossView)}`;
/** Bruto/neto en tarjetas y cabeceras angostas: no compite con el título. */
export const getCommissionToggleCompactBtnClasses = (isGrossView) =>
  `inline-flex items-center justify-center gap-0.5 shrink-0 px-1.5 py-0.5 rounded-md border text-[9px] font-black leading-tight transition-colors whitespace-nowrap shadow-sm ${QUICK_ACTION_DARK_INTERACTION} ${getCommissionToggleColorClasses(isGrossView)}`;
export const getCommissionToggleLabel = (isGrossView) => (isGrossView ? 'Ver Neto' : 'Ver Bruto');
/** Vista tarjeta en dashboard y lista de espera: neto por defecto; activar = montos brutos con comisión descontable visible. */
export const getDashboardCardCommissionToggleLabel = (showGrossCardAmounts) =>
  showGrossCardAmounts ? 'Viendo sin comisión' : 'Viendo con comisión';
export const DASHBOARD_COMMISSION_VIEW_HELP =
  'Por defecto los pagos con tarjeta se muestran sin comisión. Activa «Viendo con comisión» para ver el monto bruto facturado en tarjeta.';
export const DASHBOARD_COMMISSION_VIEW_TITLE =
  'Por defecto: montos netos (después de la comisión de tarjeta). Activa para ver montos brutos.';

export const DASHBOARD_ICON_DARK_TEXT_CLASS = {
  'text-blue-600': 'dark:text-blue-200',
  'text-purple-600': 'dark:text-purple-200',
  'text-amber-700': 'dark:text-amber-200',
  'text-violet-700': 'dark:text-violet-200',
  'text-pink-600': 'dark:text-pink-200',
  'text-sky-600': 'dark:text-sky-200',
  'text-green-600': 'dark:text-green-200',
  'text-orange-600': 'dark:text-orange-200',
  'text-emerald-600': 'dark:text-emerald-200',
  'text-indigo-600': 'dark:text-indigo-200',
};

export const DASHBOARD_ICON_DARK_BG_CLASS = {
  'bg-blue-100': 'dark:bg-blue-900/80 dark:ring-1 dark:ring-inset dark:ring-blue-500/70',
  'bg-purple-100': 'dark:bg-purple-900/80 dark:ring-1 dark:ring-inset dark:ring-purple-500/70',
  'bg-amber-100': 'dark:bg-amber-900/80 dark:ring-1 dark:ring-inset dark:ring-amber-500/70',
  'bg-violet-100': 'dark:bg-violet-900/80 dark:ring-1 dark:ring-inset dark:ring-violet-500/70',
  'bg-pink-100': 'dark:bg-pink-900/80 dark:ring-1 dark:ring-inset dark:ring-pink-500/70',
  'bg-sky-100': 'dark:bg-sky-900/80 dark:ring-1 dark:ring-inset dark:ring-sky-500/70',
  'bg-green-100': 'dark:bg-green-900/80 dark:ring-1 dark:ring-inset dark:ring-green-500/70',
  'bg-orange-100': 'dark:bg-orange-900/80 dark:ring-1 dark:ring-inset dark:ring-orange-500/70',
  'bg-emerald-100': 'dark:bg-emerald-900/80 dark:ring-1 dark:ring-inset dark:ring-emerald-500/70',
  'bg-indigo-100': 'dark:bg-indigo-900/80 dark:ring-1 dark:ring-inset dark:ring-indigo-500/70',
};

// Mini Components for UI optimization — dashboard: detalle colapsable al hacer clic en la tarjeta
export const StatCard = ({
  icon: IconComponent,
  iconColor,
  bgIcon,
  title,
  value,
  detail,
  footer,
  expandKey,
  expandedKey,
  onExpandToggle,
  className,
  campaScopeSlot,
  valueAlign = 'auto',
}) => {
  const hasExpandable = Boolean(expandKey && (detail != null || footer != null));
  const isOpen = expandKey != null && expandedKey === expandKey;
  const darkIconTextClass = DASHBOARD_ICON_DARK_TEXT_CLASS[iconColor] || 'dark:text-slate-100';
  const darkIconBgClass = DASHBOARD_ICON_DARK_BG_CLASS[bgIcon] || 'dark:bg-slate-800';
  const isSimpleScalar = typeof value === 'number' || typeof value === 'string';
  const isSimpleValue =
    valueAlign === 'simple' || (valueAlign !== 'rich' && isSimpleScalar);
  const headerInner = (
    <>
      <div className="flex items-start justify-between gap-1.5 md:gap-2 mb-1 md:mb-2">
        <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
          <div className={`p-1.5 md:p-2 rounded-md md:rounded-lg shrink-0 ${bgIcon} ${iconColor} ${darkIconBgClass} ${darkIconTextClass}`}>
            <IconComponent className="w-3.5 h-3.5 md:w-[18px] md:h-[18px]" />
          </div>
          <span className={uiDashboard.statTitle}>{title}</span>
        </div>
        {hasExpandable ? (
          <ChevronDown className={`w-4 h-4 md:w-[18px] md:h-[18px] text-slate-400 dark:text-slate-500 shrink-0 transition-transform mt-0.5 ${isOpen ? 'rotate-180' : ''}`} aria-hidden />
        ) : null}
      </div>
      <div
        className={`min-w-0 text-slate-800 dark:text-slate-100 ${
          isSimpleScalar && isSimpleValue ? uiDashboard.statValueSimpleAlign : ''
        }`}
      >
        {isSimpleScalar ? (
          <p className={uiDashboard.statValue}>{value}</p>
        ) : isSimpleValue ? (
          <div className="w-full flex justify-end md:justify-start">{value}</div>
        ) : (
          value
        )}
      </div>
    </>
  );
  const headerPad = campaScopeSlot ? 'px-3 pb-3 pt-1 md:px-5 md:pb-5 md:pt-2' : 'p-3 md:p-5';
  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-xl md:rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 dark:shadow-none h-full flex flex-col ${className || ''}`}
    >
      {campaScopeSlot ? (
        <div className="px-3 pt-2 pb-0 md:px-5 md:pt-5 flex justify-end">{campaScopeSlot}</div>
      ) : null}
      {hasExpandable ? (
        <button
          type="button"
          className={`w-full text-left rounded-xl md:rounded-2xl transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:focus-visible:ring-indigo-500 ${headerPad}`}
          onClick={() => onExpandToggle?.(expandKey)}
          aria-expanded={isOpen}
        >
          {headerInner}
        </button>
      ) : (
        <div className={headerPad}>{headerInner}</div>
      )}
      {hasExpandable && isOpen && (detail != null || footer != null) ? (
        <div className="px-3 pb-3 md:px-5 md:pb-4 border-t border-slate-100 dark:border-slate-700">
          {detail != null ? (
            <div className={`${uiDashboard.statDetail} pt-2 md:pt-3 space-y-1`}>{detail}</div>
          ) : null}
          {footer != null ? (
            <div
              className={`${detail != null ? 'mt-2 md:mt-3' : 'pt-2 md:pt-3'} [&_button]:py-1.5 [&_button]:md:py-2 [&_button]:text-[10px] [&_button]:md:text-[11px] [&_button]:rounded-lg [&_button]:md:rounded-xl`}
            >
              {footer}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export const ProgressBar = ({ label, value, max, colorClass, bgClass, trackClassName, barHeightClass, compact }) => (
  <div>
    <div className={`flex justify-between font-bold ${compact ? 'text-[10px] mb-0.5' : 'text-xs mb-1.5'}`}>
      <span className="text-slate-600 dark:text-slate-400 uppercase tracking-wider">{label}</span>
      <span className={`${colorClass} font-black`}>{value}</span>
    </div>
    <div
      className={`w-full rounded-full overflow-hidden ${trackClassName ?? 'bg-slate-100 dark:bg-slate-800'} ${barHeightClass ?? (compact ? 'h-2' : 'h-2.5')}`}
    >
      <div className={`${bgClass} h-full transition-all duration-1000 ease-out`} style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }} />
    </div>
  </div>
);

/** Solo dígitos para comparar teléfonos (anti-duplicados / búsqueda). */
export const digitsOnlyPhone = (phone) => (phone || '').replace(/\D/g, '');

/** ID estable para la misma persona entre eventos (importar perfil / archivo). Debe declararse antes del índice `app_archived_profiles`. */
export const normalizeIdText = (txt) =>
  String(txt || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u00f1/gi, 'n')
    .replace(/\u00df/gi, 'ss')
    .toUpperCase();

/** Normaliza un ID VNPM guardado o pegado (quita acentos en el cuerpo y deja VNPM- + A-Z0-9). */
export const canonicalizeVnpPersonId = (raw) => {
  const t = String(raw || '').trim();
  if (!t) return '';
  const m = t.match(/^VNPM-(.*)$/i);
  if (!m) return t;
  const rest = normalizeIdText(m[1]).replace(/[^A-Z0-9]/g, '');
  if (!rest) return '';
  return `VNPM-${rest}`;
};

/** Claves en `duplicateAlertAcknowledgedKeys` para ocultar avisos tras «Aceptar duplicado». */
export function buildDuplicateAckKeyPhone(phoneDigits) {
  const d = String(phoneDigits || '').replace(/\D/g, '');
  return d.length >= 10 ? `dup:phone:${d}` : '';
}
export function buildDuplicateAckKeyVnp(vnpCanon) {
  const v = String(vnpCanon || '').trim();
  return v ? `dup:vnp:${v}` : '';
}
export function getParticipantDuplicateAckKeys(p) {
  return Array.isArray(p?.duplicateAlertAcknowledgedKeys) ? p.duplicateAlertAcknowledgedKeys : [];
}
export function duplicateClusterFullyAcknowledged(members, ackKeys) {
  const keys = (ackKeys || []).filter(Boolean);
  if (!keys.length) return false;
  return members.every((p) => keys.every((k) => getParticipantDuplicateAckKeys(p).includes(k)));
}
/** Parámetros duplicados detectados (teléfono y, si aplica, mismo ID VNPM en varios registros del grupo). */
export function describeDuplicateParametersForPhoneMembers(members) {
  const reasons = [];
  const rawPhone = String(members[0]?.phone || '').trim();
  const digits = digitsOnlyPhone(members[0]?.phone);
  if (digits && digits.length >= 10) {
    reasons.push(`Teléfono (mismo número: ${rawPhone || digits})`);
  } else {
    reasons.push('Teléfono');
  }
  const byV = new Map();
  for (const p of members) {
    const v = canonicalizeVnpPersonId(p?.vnpPersonId || '');
    if (!v) continue;
    if (!byV.has(v)) byV.set(v, []);
    byV.get(v).push(p);
  }
  for (const [v, arr] of byV) {
    if (arr.length >= 2) {
      const names = arr.map((x) => String(x.name || '').trim() || '(sin nombre)').join(', ');
      reasons.push(`ID VNPM (${v}) repetido en ${arr.length} registros: ${names}`);
    }
  }
  return reasons;
}
export function describeDuplicateParametersForVnpMembers(vnpCanon, members) {
  const v = String(vnpCanon || '').trim();
  const names = members.map((x) => String(x.name || '').trim() || '(sin nombre)').join(', ');
  return [`ID VNPM (${v}) duplicado en ${members.length} registros con teléfonos distintos: ${names}`];
}

/** Eliminación lógica: el documento sigue en Firestore para precargar en otros eventos. */
export const PARTICIPANT_STATUS_ARCHIVED = 'archived';
export const PARTICIPANT_STATUS_CANCELLED = 'cancelled';
export const participantIsArchived = (p) => (p?.status || 'active') === PARTICIPANT_STATUS_ARCHIVED;
export const participantIsCancelled = (p) => (p?.status || 'active') === PARTICIPANT_STATUS_CANCELLED;
/** Unidad extra de costo real (×2): servidor «Ambos» con tarifa única (no precio mixto por segmento). */
export const participantCountsAsRealCostX2 = (personLike, eventLike) => {
  if (!personLike || eventLike?.eventType !== 'Campa') return false;
  if (!participantIsActiveInRoster(personLike)) return false;
  if (!isSiValue(personLike?.isServer)) return false;
  if (String(personLike?.serverAssignment || '').trim() !== 'Ambos') return false;
  return !getAmbosServeInSegmentOrEmpty(personLike);
};

/**
 * Donaciones en Firebase más filas sintéticas (legado) cuando falta `app_donations`:
 * - Archivo Campa: `archivedManualCreditAmount`
 * - Baja: `refundAsDonation` (+ `refundMarkedAsDonationAmount` o, en legado, `paid`)
 */
export function mergeEventDonationsForEvent(eventId, donationsList, allParticipants) {
  if (!eventId) return [];
  const raw = donationsList.filter((d) => d.eventId === eventId);
  const seenArchived = new Set(
    raw
      .filter((d) => d.fromArchivedManualCredit && d.sourceParticipantId)
      .map((d) => String(d.sourceParticipantId))
  );
  const extra = [];
  for (const p of allParticipants) {
    if (!participantIsArchived(p) || p.eventId !== eventId) continue;
    const amt = Number(p.archivedManualCreditAmount) || 0;
    if (amt <= 0) continue;
    const sid = String(p.id);
    if (seenArchived.has(sid)) continue;
    seenArchived.add(sid);
    extra.push({
      id: `virtual-archmc-${sid}`,
      eventId,
      amount: amt,
      donorName: p.name || 'Participante (archivo)',
      location: String(p.archivedFromLocation || p.location || '').trim() || '?',
      fromArchivedManualCredit: true,
      sourceParticipantId: sid,
      createdAt: p.archivedAt ? new Date(Number(p.archivedAt)).toISOString() : new Date().toISOString(),
      createdBy: 'Sistema (legado)',
      _syntheticArchivedCredit: true,
    });
  }
  return [...raw, ...extra];
}
/** Inscrito activo en sede (no espera ni archivado). */
export const participantIsRosterRow = (p) => {
  const s = p?.status || 'active';
  return s !== 'waitlist' && s !== PARTICIPANT_STATUS_ARCHIVED;
};

export function cashCutLocationInScope(loc, allowedLocations) {
  const locSet =
    Array.isArray(allowedLocations) && allowedLocations.length > 0
      ? new Set(allowedLocations.map((l) => String(l).trim()).filter(Boolean))
      : null;
  if (!locSet) return true;
  const L = String(loc || '').trim();
  if (!L || L === '?') return locSet.size > 0;
  return locSet.has(L);
}

/** Pagos normalizados para corte de caja (misma base que la vista «Corte de caja»). */
export function collectCashCutAllPayments(
  allParticipants,
  currentEvent,
  computeNetAmountByMethod,
  allowedLocations = null,
  resolveServiceLabel = null
) {
  if (!currentEvent?.id) return [];
  const personFallbackMs = (person) =>
    parseFlexibleInstantMs(person?.registeredAt) ??
    (typeof person?.id === 'number' && Number.isFinite(person.id) ? person.id : null) ??
    (() => {
      const s = person?.id != null ? String(person.id).trim() : '';
      return /^\d{10,}$/.test(s) ? Number(s) : null;
    })();

  const rosterForCashCut = allParticipants.filter(
    (p) =>
      p.eventId === currentEvent.id &&
      participantIsActiveInRoster(p) &&
      cashCutLocationInScope(p.location, allowedLocations)
  );

  const allPayments = [];
  rosterForCashCut.forEach((person) => {
    const loc = person.location || '';
    const fb = personFallbackMs(person);
    const historyRows = (person.paymentHistory || []).filter((h) => h && h.kind !== 'comment');
    const paidGross = parseFloat(person.paid) || 0;

    historyRows.forEach((h) => {
      if (h.kind === REFUND_DISBURSEMENT_PAYMENT_KIND && participantIsCancelledForRefund(person)) return;
      const ts = getPaymentHistoryTimestamp(h, fb);
      if (ts == null || Number.isNaN(ts)) return;
      const method = h.method || (person.paymentMethod === 'Tarjeta' ? 'Tarjeta' : 'Efectivo');
      const locForService =
        h.kind === REFUND_DISBURSEMENT_PAYMENT_KIND
          ? resolveCancelledRefundSede(person) || loc
          : loc;
      const service =
        typeof resolveServiceLabel === 'function'
          ? resolveServiceLabel(person, ts, locForService)
          : SERVICE_OPTIONS.includes(h.service)
            ? h.service
            : NO_SERVICE_LABEL;
      allPayments.push({
        ...h,
        netAmount: computeNetAmountByMethod(h.amount, method),
        method,
        service,
        _ts: ts,
        _date: new Date(ts),
        _personName: person.name || '',
        _personId: person.id,
        _loc: loc,
      });
    });

    if (paidGross > 0 && historyRows.length === 0 && fb != null && Number.isFinite(fb)) {
      const paymentMethod = person.paymentMethod === 'Tarjeta' ? 'Tarjeta' : 'Efectivo';
      const paidNet = computeNetAmountByMethod(paidGross, paymentMethod);
      const svc = SERVICE_OPTIONS.includes(person.paymentService) ? person.paymentService : NO_SERVICE_LABEL;
      allPayments.push({
        id: `legacy-paid-${person.id}`,
        date: new Date(fb).toLocaleString('es-MX'),
        recordedAt: new Date(fb).toISOString(),
        amount: paidGross,
        netAmount: paidNet,
        method: paymentMethod,
        service: svc,
        reference: (person.cardReference || '').trim(),
        registeredBy: person.registeredBy || '?',
        _ts: fb,
        _date: new Date(fb),
        _personName: person.name || '',
        _personId: person.id,
        _loc: loc,
        _syntheticLegacyPaid: true,
      });
    }
  });
  allPayments.push(
    ...collectCashCutRefundDisbursements(
      allParticipants,
      currentEvent,
      allowedLocations,
      cashCutLocationInScope,
      computeNetAmountByMethod,
      resolveServiceLabel
    )
  );
  return allPayments;
}

/** Lunes local (00:00) de la semana calendario lun–dom que contiene `input`. */
export function getMondayLocalFromDate(input) {
  const d = input instanceof Date ? new Date(input.getTime()) : new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffToMonday, 0, 0, 0, 0);
}

/** Clave `YYYY-MM-DD` del lunes local para agrupar corte de caja (evita desfase UTC de toISOString). */
export function getCashCutWeekKey(input) {
  const monday = getMondayLocalFromDate(input);
  if (!monday) return '';
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, '0');
  const dd = String(monday.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** Etiqueta «26 may · 1 jun, 2025» a partir de la clave de lunes. */
export function formatCashCutWeekRangeLabel(mondayIso) {
  const m = String(mondayIso || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(m)) return m;
  const [y, mo, dd] = m.split('-').map(Number);
  const mon = new Date(y, mo - 1, dd, 12, 0, 0, 0);
  const sun = new Date(y, mo - 1, dd + 6, 12, 0, 0, 0);
  const f = (d) => d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  return `${f(mon)} · ${f(sun)}, ${sun.getFullYear()}`;
}

/** Totales por semana y por domingo (incluye donaciones del listado recibido). */
export function buildCashCutWeekAndSundayMaps(allPayments, eventDonationsForCut, computeNetAmountByMethod) {
  const getDateKey = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  const weekMap = {};
  allPayments.forEach((p) => {
    const wk = getCashCutWeekKey(p._date);
    if (!wk) return;
    if (!weekMap[wk]) weekMap[wk] = { efectivo: 0, tarjeta: 0, total: 0, totalNet: 0, donations: 0 };
    const amt = parseFloat(p.amount) || 0;
    const net = computeNetAmountByMethod(p.amount, p.method);
    if (p.method === 'Tarjeta') weekMap[wk].tarjeta += amt;
    else weekMap[wk].efectivo += amt;
    weekMap[wk].total += amt;
    weekMap[wk].totalNet += net;
  });
  eventDonationsForCut.forEach((don) => {
    const dt = new Date(don.createdAt);
    const wk = getCashCutWeekKey(dt);
    if (!wk) return;
    if (!weekMap[wk]) weekMap[wk] = { efectivo: 0, tarjeta: 0, total: 0, totalNet: 0, donations: 0 };
    const a = parseFloat(don.amount) || 0;
    weekMap[wk].donations += a;
    weekMap[wk].total += a;
    weekMap[wk].totalNet += a;
  });

  const sundayMap = {};
  allPayments
    .filter((p) => p._date.getDay() === 0)
    .forEach((p) => {
      const dk = getDateKey(p._date);
      if (!sundayMap[dk]) sundayMap[dk] = { efectivo: 0, tarjeta: 0, total: 0, totalNet: 0, donations: 0 };
      const amt = parseFloat(p.amount) || 0;
      const net = computeNetAmountByMethod(p.amount, p.method);
      if (p.method === 'Tarjeta') sundayMap[dk].tarjeta += amt;
      else sundayMap[dk].efectivo += amt;
      sundayMap[dk].total += amt;
      sundayMap[dk].totalNet += net;
    });
  eventDonationsForCut.forEach((don) => {
    const dt = new Date(don.createdAt);
    if (dt.getDay() !== 0) return;
    const dk = getDateKey(dt);
    if (!sundayMap[dk]) sundayMap[dk] = { efectivo: 0, tarjeta: 0, total: 0, totalNet: 0, donations: 0 };
    const a = parseFloat(don.amount) || 0;
    sundayMap[dk].donations += a;
    sundayMap[dk].total += a;
    sundayMap[dk].totalNet += a;
  });

  return {
    weekKeys: Object.keys(weekMap).sort((a, b) => b.localeCompare(a)),
    sundayKeys: Object.keys(sundayMap).sort((a, b) => b.localeCompare(a)),
    weekMap,
    sundayMap,
  };
}

export const participantIsWaitlistRow = (p) => (p?.status || 'active') === 'waitlist';

/** Alinea el nombre de sede del participante con una entrada de `event.locations` (trim / mayúsculas). */
export function resolveLocationToEventSede(rawLoc, eventLocations) {
  if (!Array.isArray(eventLocations) || eventLocations.length === 0) return null;
  const s = String(rawLoc ?? '').trim();
  if (!s) return null;
  for (const l of eventLocations) {
    if (String(l).trim() === s) return l;
  }
  const low = s.toLowerCase();
  for (const l of eventLocations) {
    if (String(l).trim().toLowerCase() === low) return l;
  }
  return null;
}

/** Inscrito en sede y activo: no cancelado, no lista de espera, no archivado. */
export const participantIsActiveInRoster = (p) => participantIsRosterRow(p) && !participantIsCancelled(p);
/** Activo o en lista de espera: resolver y mostrar acompañantes en fichas de resumen. */
export const participantIsActiveOrWaitlistForCompanionDisplay = (p) =>
  !participantIsCancelled(p) &&
  !participantIsArchived(p) &&
  (participantIsActiveInRoster(p) || participantIsWaitlistRow(p));
/** Titular en listados del dashboard (roster activo + alcance unificado). */
export const participantMatchesBautizosDashboardPartyScope = (person, scope) => {
  if (!participantMatchesBautizosDashboardScope(person, scope)) return false;
  if (normalizeBautizosDashboardScope(scope) === 'all') return true;
  if (participantIsCancelled(person) || participantIsWaitlistRow(person) || !participantIsRosterRow(person)) return false;
  return true;
};

/** Dashboard: todas las preferencias de visualización/filtro son personales del usuario (no auditables). */
export const toDashboardConfigLogComparable = (snapshot) => {
  if (!snapshot || typeof snapshot !== 'object') return snapshot;
  return {};
};

/** Cuenta para cupo / duplicados en el mismo evento (excluye archivados). */
export const participantIsActiveInEvent = (p) => !participantIsArchived(p);

/** Inscrito activo o en espera (no baja ni archivado): quien sí debe bloquear otro registro con el mismo teléfono o ID VNPM. */
export const participantBlocksDuplicateRegistration = (p) => participantIsActiveInEvent(p) && !participantIsCancelled(p);

/** Mismo evento; libre o ya vinculada al registro que se edita (`excludePersonId`). */
export const participantEligibleAsSpouseLink = (p, eventId, excludePersonId) => {
  if (!p || String(p.eventId || '') !== String(eventId || '') || !participantIsActiveInEvent(p) || participantIsCancelled(p)) return false;
  if (excludePersonId != null && String(p.id) === String(excludePersonId)) return false;
  const sid = String(p.spouseParticipantId || '').trim();
  if (!sid) return true;
  if (excludePersonId != null && sid === String(excludePersonId)) return true;
  return false;
};

export const buildArchivedProfileSnapshot = (person) => {
  const isServerRaw = String(person?.isServer || 'No');
  const isServerYes = ['s\u00ed', 's?', 'si', 'yes', 'true'].includes(isServerRaw.toLowerCase());
  const serverAssignmentRaw = String(person?.serverAssignment || '').trim();
  const campAssignmentRaw = String(person?.campAssignment || '').trim();
  const serverAssignmentResolved = isServerYes
    ? (serverAssignmentRaw || campAssignmentRaw)
    : '';

  return {
    name: person?.name || '',
    phone: person?.phone || '',
    age: person?.age ?? '',
    birthDate: person?.birthDate || '',
    gender: person?.gender || '',
    alias: person?.alias || '',
    emergencyContact: person?.emergencyContact || '',
    emergencyPhone: person?.emergencyPhone || '',
    emergencyRelationship: person?.emergencyRelationship || '',
    bloodType: person?.bloodType || '',
    canSwim: person?.canSwim || 'No',
    hasAllergy: person?.hasAllergy || 'No',
    allergyCategory: person?.allergyCategory || '',
    allergyDetails: person?.allergyDetails || '',
    hasDisease: person?.hasDisease || 'No',
    diseaseDetails: person?.diseaseDetails || '',
    diseaseMedication: person?.diseaseMedication || '',
    hasDisability: person?.hasDisability || 'No',
    disabilityDetails: person?.disabilityDetails || '',
    isServer: isServerRaw,
    serverAssignment: serverAssignmentResolved,
    campAssignment: campAssignmentRaw,
    // Campo explícíto para consultas históricas sin ambigüedad.
    serverAssignmentResolved,
    isMarried: person?.isMarried || 'No',
    spouseName: person?.spouseName || '',
    goesWithChildren: person?.goesWithChildren || 'No',
    childrenCount: person?.childrenCount ?? '',
    servedOtherCampa: person?.servedOtherCampa || 'No',
    servedAreas: person?.servedAreas || '',
    preferredServeArea: person?.preferredServeArea || '',
    // Campo de compatibilidad semántica para consultas externas.
    hasChildren: person?.goesWithChildren || 'No',
    willBeBaptized: person?.willBeBaptized || 'No',
    baptismSegment: person?.baptismSegment || '',
  };
};

/**
 * Índice global en Firebase (`app_archived_profiles`).
 * Con **VNPM** (`vnpPersonId` canonicalizado): un documento por persona; varios archivados con el mismo VNPM
 * fusionan en un solo doc; la información más actual es la del **último** registro enviado al archivo (`archivedAt` mayor).
 * Sin VNPM válido: respaldo por teléfono o por id de participante.
 *
 * En `app_participants`, el mismo VNPM puede participar en **varios eventos** a la vez: id canónico `id_VNPM…`
 * para el primer evento; altas adicionales en otro evento usan `id_VNPM…__e_<eventId>` (ver `resolveParticipantDocumentIdForWrite`).
 */
export const ARCHIVE_PROFILES_COLLECTION = 'app_archived_profiles';

export const getArchiveProfileDocId = (person) => {
  const vnp = canonicalizeVnpPersonId(person?.vnpPersonId || '');
  if (vnp.length >= 4) {
    const safe = sanitizeFirestoreDocId(vnp, { maxChars: 120, fallback: '' });
    if (safe) return `id_${safe}`;
  }
  const d = digitsOnlyPhone(person?.phone);
  if (d.length >= 10) return `ph_${d.slice(-10)}`;
  const pid = sanitizeFirestoreDocId(person?.id, { maxChars: 120, fallback: '' });
  return pid ? `pid_${pid}` : `pid_t-${Date.now()}`;
};

export function mergeArchivedFirestoreDocs(existing, incoming, existingTs, incomingTs) {
  const incomingNewer = incomingTs >= existingTs;
  const out = { ...existing };
  for (const k of Object.keys(incoming)) {
    if (k === '_mergeMeta') continue;
    const iv = incoming[k];
    if (iv === undefined) continue;
    const hasKey = Object.prototype.hasOwnProperty.call(out, k);
    const ev = out[k];
    if (!hasKey || ev === undefined) {
      out[k] = iv;
      continue;
    }
    if (iv !== null && typeof iv === 'object' && !Array.isArray(iv) && ev !== null && typeof ev === 'object' && !Array.isArray(ev)) {
      out[k] = mergeArchivedFirestoreDocs(ev, iv, existingTs, incomingTs);
      continue;
    }
    if (incomingNewer) out[k] = iv;
  }
  const ex = Number(existingTs) || 0;
  const inn = Number(incomingTs) || 0;
  out.archivedAt = Math.max(ex, inn, Number(out.archivedAt) || 0);
  const prevKinds = Array.isArray(existing._mergeMeta?.sourceKinds) ? [...existing._mergeMeta.sourceKinds] : [];
  const ik = incoming.sourceKind;
  if (ik && !prevKinds.includes(ik)) prevKinds.push(ik);
  out._mergeMeta = {
    lastMergedAt: Date.now(),
    sourceKinds: prevKinds,
  };
  return out;
}

export function buildArchiveIndexIncomingPayload(person, archivedAt, loc, sourceKind, eventName) {
  const vnpStored = canonicalizeVnpPersonId(person?.vnpPersonId || '') || String(person?.vnpPersonId || '').trim();
  return {
    vnpPersonId: vnpStored,
    participantFirebaseId: String(person?.id || ''),
    eventId: person?.eventId || '',
    eventName: eventName || '',
    archivedAt,
    archivedFromLocation: loc || '',
    sourceKind,
    archivedProfileSnapshot: buildArchivedProfileSnapshot(person),
    customData: person?.customData && typeof person.customData === 'object' ? { ...person.customData } : {},
    travelFrom: person?.travelFrom || '',
    travelTo: person?.travelTo || '',
    llegaEnCarro: person?.llegaEnCarro,
    regresaEnCarro: person?.regresaEnCarro,
    transportType: person?.transportType || '',
    isScholarship: person?.isScholarship || '',
    scholarshipType: person?.scholarshipType || '',
    attendanceSpecialType: person?.attendanceSpecialType || '',
    responsivaStatus: person?.responsivaStatus || '',
    statusBeforeArchive: person?.status || 'active',
    willBeBaptized: person?.willBeBaptized,
    baptismSegment: person?.baptismSegment,
    waitlistCreatedAt: person?.waitlistCreatedAt,
    email: person?.email || '',
    notes: person?.notes || '',
  };
}

export const ARCHIVE_INDEX_STRIP_FINANCIAL_KEYS = [
  'paid',
  'paidNet',
  'registeredCost',
  'discountCampaignId',
  'discountCampaignConcept',
  'discountCampaignAppliedAt',
  'refundPendingAmount',
  'refundPendingReason',
  'refundAsDonation',
  'scholarshipPartialAmount',
  'whatsAppFinanceNotifications',
  'paymentHistory',
  'paymentMethod',
  'paymentService',
  'cardReference',
];

export function stripFinancialFromArchiveIndexDoc(doc) {
  if (!doc || typeof doc !== 'object') return doc;
  const o = { ...doc };
  for (const k of ARCHIVE_INDEX_STRIP_FINANCIAL_KEYS) delete o[k];
  return o;
}

/**
 * Tras borrar un participante archivado: quita su entrada en app_archived_profiles si el índice
 * apunta exactamente a ese registro (participantFirebaseId + eventId), o si la clave del doc es
 * pid_<id> (caso sin VNPM ni teléfono válido). Si el índice fusionó otro archivado más reciente
 * (mismo VNPM/teléfono), no borra el documento.
 */
export async function removeArchiveProfileIndexEntryIfMatches(person) {
  if (!person) return { removed: false, reason: 'no_person' };
  const docId = getArchiveProfileDocId(person);
  const ref = getDocRef(ARCHIVE_PROFILES_COLLECTION, docId);
  let snap;
  try {
    snap = await getDoc(ref);
  } catch (e) {
    console.error(e);
    return { removed: false, reason: 'read_error' };
  }
  if (!snap.exists()) return { removed: false, reason: 'no_doc' };
  const data = snap.data() || {};
  const pidSanitized = sanitizeFirestoreDocId(person.id, { fallback: '' });
  const pidOnlyKey = `pid_${pidSanitized}`;
  const pointsToThisRegistration =
    String(data.participantFirebaseId || '') === String(person.id) &&
    String(data.eventId || '') === String(person.eventId || '');
  const indexKeyedOnlyByThisParticipantDoc = docId === pidOnlyKey && pidSanitized !== '';
  if (!pointsToThisRegistration && !indexKeyedOnlyByThisParticipantDoc) {
    return { removed: false, reason: 'index_points_elsewhere' };
  }
  try {
    await deleteDoc(ref);
    return { removed: true, reason: pointsToThisRegistration ? 'matched_registration' : 'pid_key' };
  } catch (e) {
    console.error(e);
    return { removed: false, reason: 'delete_error' };
  }
}

export const generateVnpPersonId = (personLike = {}) => {
  const omit = new Set(['DE', 'DEL', 'LA', 'LAS', 'LOS', 'Y', 'MC', 'MAC']);
  const parts = normalizeIdText(personLike?.name)
    .replace(/[^A-Z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((p) => !omit.has(p));

  const firstName = parts[0] || '';
  const firstSurname = parts.length >= 3 ? parts[parts.length - 2] : (parts[1] || '');
  const secondSurname = parts.length >= 2 ? parts[parts.length - 1] : '';

  const firstSurname2 = `${firstSurname.slice(0, 2)}`.padEnd(2, 'X');
  const secondSurname1 = (secondSurname[0] || 'X');
  const firstName1 = (firstName[0] || 'X');

  const birthDateRaw = String(personLike?.birthDate || '');
  const digits = birthDateRaw.replace(/\D/g, '');
  const yymmdd = digits.length === 8 ? `${digits.slice(2, 4)}${digits.slice(4, 6)}${digits.slice(6, 8)}` : '000000';
  const genderRaw = normalizeIdText(personLike?.gender || '');
  const genderSuffix = genderRaw.startsWith('H') ? 'H' : (genderRaw.startsWith('M') ? 'M' : 'X');

  const suffix = `${firstSurname2}${secondSurname1}${firstName1}${yymmdd}${genderSuffix}`.replace(/[^A-Z0-9]/g, '');
  return `VNPM-${suffix}`;
};

export const hasValidFullName = (fullName) => {
  const parts = String(fullName || '')
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean);
  return parts.length >= 3;
};

/**
 * Mismo teléfono en el evento = duplicado salvo excepción familiar (mismos apellidos o adulto+menor con un apellido en común).
 */
export const phoneDuplicateInEvent = (
  fullName,
  phoneDigits,
  participants,
  eventId,
  excludeParticipantId,
  candidateAge,
  allowSharedMainPhone = false
) => {
  if (allowSharedMainPhone) return false;
  if (!phoneDigits || String(phoneDigits).length < 10) return false;
  return participants.some((p) => {
    if (p.eventId !== eventId || !participantBlocksDuplicateRegistration(p)) return false;
    if (excludeParticipantId != null && String(p.id) === String(excludeParticipantId)) return false;
    if (digitsOnlyPhone(p.phone) !== phoneDigits) return false;
    if (isPhoneShareFamilyAllowed(fullName, candidateAge, p.name, p.age)) return false;
    return true;
  });
};

/** Etiqueta de lista en registro por sede (Activos · Lista de espera · Cancelados). */
export const participantRosterListLabel = (p) => {
  if (participantIsWaitlistRow(p)) return 'Lista de espera';
  if (participantIsCancelled(p)) return 'Cancelados';
  return 'Activos';
};

/** Activo, lista de espera o cancelado en el evento (excluye archivados). Aviso al nuevo registro. */
export const participantMatchesNewEntryDuplicateHint = (p) => {
  if (participantIsArchived(p)) return false;
  const s = p?.status || 'active';
  return s === 'active' || s === 'waitlist' || s === PARTICIPANT_STATUS_CANCELLED;
};

/** Solo activo o lista de espera (p. ej. archivar desde aviso de duplicado). */
export const participantIsActiveOrWaitlistForDuplicateHint = (p) => {
  if (participantIsArchived(p) || participantIsCancelled(p)) return false;
  const s = p?.status || 'active';
  return s === 'active' || s === 'waitlist';
};

export const normalizeFullNameCompareKey = (fullName) =>
  normalizeIdText(fullName || '')
    .replace(/\s+/g, ' ')
    .trim();

export const normalizeAliasCompareKey = (alias) =>
  normalizeIdText(String(alias || '').trim())
    .replace(/\s+/g, ' ')
    .trim();

export const DUPLICATE_HINT_REASON_LABELS = { name: 'nombre completo', phone: 'teléfono', alias: 'alias' };
export const DUPLICATE_HINT_REASON_ORDER = ['name', 'phone', 'alias'];

export const formatDuplicateHintReasons = (reasons) =>
  DUPLICATE_HINT_REASON_ORDER.filter((k) => reasons.has(k)).map((k) => DUPLICATE_HINT_REASON_LABELS[k]).join(' y ');

/**
 * Aviso al rellenar nuevo registro: coincide nombre completo, teléfono y/o alias con alguien ya en el evento.
 * Requiere nombre completo (3+ partes), teléfono (≥10 dígitos) o alias (≥2 caracteres) para evaluar.
 */
export const buildNewEntryDuplicateHint = (name, phone, alias, age, participants, eventId, allowSharedMainPhone = false) => {
  if (!eventId || !Array.isArray(participants)) return null;
  const phoneDigits = digitsOnlyPhone(phone);
  const hasPhone = String(phoneDigits).length >= 10;
  const nameOk = hasValidFullName(name || '');
  const aliasTrim = String(alias || '').trim();
  const hasAlias = aliasTrim.length >= 2;
  if (!hasPhone && !nameOk && !hasAlias) return null;

  const nameKey = nameOk ? normalizeFullNameCompareKey(name) : '';
  const aliasKey = hasAlias ? normalizeAliasCompareKey(aliasTrim) : '';
  const seen = new Map();

  for (const p of participants) {
    if (p.eventId !== eventId || !participantMatchesNewEntryDuplicateHint(p)) continue;
    const reasons = new Set();
    if (nameKey) {
      const pk = normalizeFullNameCompareKey(p.name);
      if (pk && pk === nameKey) reasons.add('name');
    }
    if (hasPhone && digitsOnlyPhone(p.phone) === phoneDigits) {
      if (!allowSharedMainPhone && !isPhoneShareFamilyAllowed(name, age, p.name, p.age)) reasons.add('phone');
    }
    if (aliasKey) {
      const ak = normalizeAliasCompareKey(p.alias);
      if (ak && ak === aliasKey) reasons.add('alias');
    }
    if (reasons.size === 0) continue;
    const id = String(p.id);
    if (!seen.has(id)) seen.set(id, { p, reasons: new Set(reasons) });
    else {
      const cur = seen.get(id);
      for (const r of reasons) cur.reasons.add(r);
    }
  }

  if (seen.size === 0) return null;

  const matchEntries = Array.from(seen.values())
    .map(({ p, reasons }) => ({
      id: String(p.id),
      p,
      reasons,
      reasonsLabel: formatDuplicateHintReasons(reasons),
    }))
    .sort((a, b) =>
      (a.p.name || '').localeCompare(b.p.name || '', 'es', { sensitivity: 'base' })
    );

  const lines = matchEntries.map(({ p, reasons }) => {
    const loc = (p.location || '').trim() || 'Sede';
    const lista = participantRosterListLabel(p);
    const por = formatDuplicateHintReasons(reasons);
    return `${p.name || '(sin nombre)'} · ${loc} · ${lista} · coincidencia por ${por}`;
  });
  const maxShow = 4;
  const shown = lines.slice(0, maxShow);
  const more = lines.length > maxShow ? ` (+${lines.length - maxShow} más)` : '';
  return {
    summary: `Hay ${seen.size} registro${seen.size === 1 ? '' : 's'} en este evento que coincide${seen.size === 1 ? '' : 'n'} con lo que escribiste (Activos, Lista de espera o Cancelados).`,
    lines: shown,
    moreSuffix: more,
    matches: matchEntries,
  };
};

/** Convierte teléfono local/internacional al formato que requiere wa.me */
export const normalizeWhatsAppPhone = (phone) => {
  const digits = digitsOnlyPhone(phone);
  if (digits.length < 10) return null;
  if (digits.length === 10) return `52${digits}`; // MX por defecto para números locales
  if (digits.startsWith('52') && digits.length === 12) return digits;
  return digits;
};

export const getWhatsAppNotificationMarkKey = (n) =>
  n?.id ? String(n.id) : `legacy-${n.createdAt ?? 0}-${n.kind ?? ''}`;

export const compactWhatsAppNotificationToken = (n) => {
  const base = {
    id: n?.id ? String(n.id) : undefined,
    kind: String(n?.kind || ''),
    createdAt: Number(n?.createdAt || 0) || Date.now(),
    amount: Number(n?.amount || 0) || 0,
    pendingAmount: Number(n?.pendingAmount || 0) || 0,
    isLiquidado: !!n?.isLiquidado,
    liquidationTarget: Number(n?.liquidationTarget || 0) || 0,
  };
  if (n?.waFinanceSnapshot && typeof n.waFinanceSnapshot === 'object') {
    base.waFinanceSnapshot = {
      target: Number(n.waFinanceSnapshot.target || 0) || 0,
      paid: Number(n.waFinanceSnapshot.paid || 0) || 0,
      isScholarship: !!n.waFinanceSnapshot.isScholarship,
      scholarshipType: String(n.waFinanceSnapshot.scholarshipType || 'none'),
      scholarshipPartialAmount: Number(n.waFinanceSnapshot.scholarshipPartialAmount || 0) || 0,
    };
  }
  if (String(n?.kind || '') === 'recordatorio_pago') {
    base.reminderWeekKey = n.reminderWeekKey != null ? String(n.reminderWeekKey) : undefined;
    base.paymentDeadlineDate = n.paymentDeadlineDate != null ? String(n.paymentDeadlineDate) : undefined;
    base.pendingDebt = Number(n.pendingDebt) || 0;
  }
  if (String(n?.kind || '') === 'promocion_acompanante' && Array.isArray(n.promotedCompanionIds)) {
    base.promotedCompanionIds = n.promotedCompanionIds.map((id) => String(id || '').trim()).filter(Boolean);
    if (n.paymentDeadlineDate != null) base.paymentDeadlineDate = String(n.paymentDeadlineDate);
  }
  return base;
};

export const getWhatsAppMessageHistoryRows = (person) => {
  const rows = Array.isArray(person?.whatsAppMessageHistory) ? person.whatsAppMessageHistory : [];
  return [...rows].sort((a, b) => Number(a?.createdAt || 0) - Number(b?.createdAt || 0));
};

/** Último movimiento financiero pendiente de avisar (más reciente por createdAt). */
export const getLatestUnsentWhatsAppNotification = (person) => {
  const notifications = Array.isArray(person?.whatsAppFinanceNotifications) ? person.whatsAppFinanceNotifications : [];
  const pending = notifications.filter((n) => n && !n.sent);
  if (!pending.length) return null;
  return [...pending].sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))[0];
};

/** Cantidad de avisos financieros en cola (sin enviar) para el botón WhatsApp por registro. */
export const countUnsentWhatsAppNotifications = (person) => {
  const notifications = Array.isArray(person?.whatsAppFinanceNotifications) ? person.whatsAppFinanceNotifications : [];
  return notifications.filter((n) => n && !n.sent).length;
};

/** Verde de marca WhatsApp (#25D366 — Meta / WhatsApp Brand Resource Center). */
export const WHATSAPP_BRAND_BTN_CLASS =
  `relative ${ROSTER_QUICK_ACTION_BTN_BASE} border border-[#1DA851] bg-[#25D366] text-white hover:bg-[#20BD5A]`;
export const WHATSAPP_BRAND_BADGE_CLASS =
  'absolute -top-1.5 -right-1 min-w-[1.125rem] h-[1.125rem] px-0.5 rounded-full bg-white text-[#075E54] border border-[#1DA851] text-[9px] font-black leading-none flex items-center justify-center shadow-sm tabular-nums';

/** Botones de barra en «Nuevo registro»: mismos sólidos 600/700 que acciones rápidas (legibles en oscuro). */
export const NEW_REG_TOOLBAR_EMERALD_BTN =
  'flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border shadow-sm transition-colors border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700';
export const NEW_REG_TOOLBAR_INDIGO_BTN =
  'flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border shadow-sm transition-colors border-indigo-700 bg-indigo-600 text-white hover:bg-indigo-700';
export const NEW_REG_DONATION_BTN =
  'box-border h-8 min-h-8 max-h-8 px-3 py-0 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border shadow-sm transition-colors border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700';

export const ROSTER_MOBILE_CHIP_ICON = 12;

export function RosterWhatsAppButton({ person, loc, onOpen, variant = 'inline', eventSnapshot, roster }) {
  const n =
    eventSnapshot && roster
      ? countUnsentWhatsAppNotificationsForQueue(person, eventSnapshot, roster)
      : countUnsentWhatsAppNotifications(person);
  const title =
    n > 0 ? `Enviar WhatsApp (${n} pendiente${n === 1 ? '' : 's'} en cola)` : 'Enviar WhatsApp';
  if (variant === 'chip') {
    return (
      <button
        type="button"
        onClick={() => onOpen(person, loc)}
        className={`relative ${uiRosterMobile.actionsChip} border border-[#1DA851] bg-[#25D366] text-white hover:bg-[#20BD5A]`}
        title={title}
      >
        <MessageCircle size={ROSTER_MOBILE_CHIP_ICON} aria-hidden className="shrink-0" />
        <span>WhatsApp</span>
        {n > 0 ? (
          <span
            className="ml-0.5 min-w-[0.875rem] h-3.5 px-0.5 rounded-full bg-white text-[#075E54] border border-[#1DA851] text-[7px] font-black leading-none inline-flex items-center justify-center tabular-nums"
            aria-label={`${n} WhatsApp${n === 1 ? '' : 's'} pendiente${n === 1 ? '' : 's'}`}
          >
            {n > 99 ? '99+' : n}
          </span>
        ) : null}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onOpen(person, loc)}
      className={WHATSAPP_BRAND_BTN_CLASS}
      title={title}
    >
      <MessageCircle {...ROSTER_QUICK_ACTION_ICON_PROPS} />
      WhatsApp
      {n > 0 ? (
        <span
          className={WHATSAPP_BRAND_BADGE_CLASS}
          aria-label={`${n} WhatsApp${n === 1 ? '' : 's'} pendiente${n === 1 ? '' : 's'}`}
        >
          {n > 99 ? '99+' : n}
        </span>
      ) : null}
    </button>
  );
}

/** Alias: fila de responsiva si aplica general y/o digital para la edad del participante. */
export const getResponsivaRequirementApplies = getResponsivaParticipantRowApplies;

/** Resumen para UI: entregada, tipo, fase digital. */
export function getResponsivaCardUiState(person, eventLike) {
  if (!getResponsivaRequirementApplies(person, eventLike)) {
    return { applies: false };
  }
  const rd = person?.responsivaDigital && typeof person.responsivaDigital === 'object' ? person.responsivaDigital : {};
  const hasDigitalSig = !!(rd.submittedAt || rd.signatureDataUrl);
  const isLocal = rd.method === 'local' && !!(rd.recordedAt || rd.signedLocallyAt);
  const statusOk = String(person?.responsivaStatus || '').trim() === 'Entregada';
  const delivered = statusOk || hasDigitalSig || isLocal;
  let deliveredKind = null;
  if (delivered) {
    if (isLocal) deliveredKind = 'local';
    else if (hasDigitalSig) deliveredKind = 'digital';
    else deliveredKind = 'manual';
  }
  const digitalEnabled =
    isResponsivaDigitalEnabledForEvent(eventLike) && isResponsivaDigitalActiveForParticipant(person, eventLike);
  let digitalPhase = null;
  if (digitalEnabled) {
    if (delivered) {
      digitalPhase = 'delivered';
    } else if (rd.lastSignLinkSentAt) {
      digitalPhase = 'pending_sign';
    } else {
      digitalPhase = 'needs_link';
    }
  }
  return {
    applies: true,
    delivered,
    deliveredKind,
    hasDigitalSig,
    isLocal,
    digitalEnabled,
    digitalPhase,
  };
}

/** URL de imagen de firma (Storage o data URL) para vista previa en resumen / listas. */
export function getResponsivaSignatureImageUrl(person) {
  const rd = person?.responsivaDigital && typeof person.responsivaDigital === 'object' ? person.responsivaDigital : {};
  return rd.signatureStorageUrl || rd.signatureDataUrl || null;
}

/** Responsiva digital por WhatsApp — needs_link / pending_sign / delivered (según evento y edad). */
export function getResponsivaDigitalPipelineState(person, eventLike) {
  if (!eventLike || !isResponsivaEnabledForEvent(eventLike)) return { applies: false };
  if (!isResponsivaDigitalActiveForParticipant(person, eventLike)) return { applies: false };
  const rd = person?.responsivaDigital && typeof person.responsivaDigital === 'object' ? person.responsivaDigital : {};
  const hasDigitalSig = !!(rd.submittedAt || rd.signatureDataUrl);
  const isLocal = rd.method === 'local' && !!(rd.recordedAt || rd.signedLocallyAt);
  const statusOk = String(person?.responsivaStatus || '').trim() === 'Entregada';
  const delivered = statusOk || hasDigitalSig || isLocal;
  if (delivered) return { applies: true, phase: 'delivered' };
  if (rd.lastSignLinkSentAt) return { applies: true, phase: 'pending_sign' };
  return { applies: true, phase: 'needs_link' };
}

export function responsivaPipelineSectionTitle(eventLike) {
  const gm = isResponsivaGeneralMinorsBranchEnabled(eventLike);
  const ga = isResponsivaGeneralAdultsBranchEnabled(eventLike);
  if (gm && ga) return 'Responsiva';
  if (gm && !ga) return 'Responsiva (menor de edad)';
  if (!gm && ga) return 'Responsiva (mayor de edad)';
  return 'Responsiva';
}

/** Responsiva (enlace WA): azul sky, distinto del resto de acciones rápidas (emerald/indigo/violet…). */
export const ROSTER_RESPONSIVA_WA_CLASS =
  'border border-sky-700 bg-sky-600 text-white hover:bg-sky-700 shadow-sm transition-colors disabled:opacity-55 disabled:cursor-not-allowed disabled:hover:bg-sky-600';

export function RosterResponsivaWaButton({ person, loc, onSend, busyId, variant = 'compact', eventSnapshot }) {
  const st = getResponsivaDigitalPipelineState(person, eventSnapshot);
  if (!st.applies) return null;
  const busy = busyId != null && String(busyId) === String(person.id);
  const Icon = st.phase === 'delivered' ? CheckCircle2 : st.phase === 'pending_sign' ? Clock : AlertCircle;
  const adultSigner = participantAgeBracketForResponsiva(parseInt(person?.age, 10)) === 'adult';
  const title =
    st.phase === 'delivered'
      ? 'Responsiva entregada (firmada o marcada manualmente)'
      : st.phase === 'pending_sign'
        ? adultSigner
          ? 'Enlace enviado por WhatsApp: pendiente de firma'
          : 'Enlace enviado por WhatsApp: pendiente de firma del tutor'
        : adultSigner
          ? 'Enviar enlace de firma por WhatsApp'
          : 'Enviar enlace de firma por WhatsApp al tutor';
  const sizeCls =
    variant === 'modal'
      ? 'min-h-[36px] px-3 py-2 text-[11px] gap-1.5 rounded-lg font-bold'
      : variant === 'chip'
        ? uiRosterMobile.actionsChip
        : ROSTER_QUICK_ACTION_BTN_BASE;
  const label =
    busy
      ? 'Enviando'
      : st.phase === 'delivered'
        ? 'Entregada'
        : st.phase === 'pending_sign'
          ? 'Pendiente'
          : 'Enlace';
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSend(person, loc);
      }}
      disabled={busy || st.phase === 'delivered'}
      className={`relative ${sizeCls} ${ROSTER_RESPONSIVA_WA_CLASS}`}
      title={title}
    >
      <Icon
        size={variant === 'modal' ? 15 : variant === 'chip' ? ROSTER_MOBILE_CHIP_ICON : 14}
        className={
          variant === 'modal' || variant === 'chip'
            ? 'shrink-0'
            : ROSTER_QUICK_ACTION_ICON_PROPS.className
        }
        aria-hidden
      />
      <span
        className={
          variant === 'compact'
            ? st.phase === 'delivered'
              ? 'sr-only'
              : 'hidden sm:inline'
            : undefined
        }
      >
        {variant === 'chip' ? label : busy ? '…' : st.phase === 'delivered' ? 'Entregada' : 'Responsiva'}
      </span>
    </button>
  );
}

export const ROSTER_RESPONSIVA_LOCAL_CLASS =
  'border border-slate-400 bg-slate-100 text-slate-800 hover:bg-slate-200 shadow-sm transition-colors disabled:opacity-55 disabled:cursor-not-allowed';

/** Registrar responsiva firmada en sitio (papel), sin enlace digital. */
export function RosterResponsivaLocalButton({ person, onLocal, busyId, variant = 'compact', eventSnapshot }) {
  const card = getResponsivaCardUiState(person, eventSnapshot);
  if (!card.applies || card.delivered) return null;
  const busy = busyId != null && String(busyId) === String(person.id);
  const sizeCls =
    variant === 'modal'
      ? 'min-h-[36px] px-3 py-2 text-[11px] gap-1.5 rounded-lg font-bold'
      : variant === 'chip'
        ? uiRosterMobile.actionsChip
        : ROSTER_QUICK_ACTION_BTN_BASE;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onLocal(person);
      }}
      disabled={busy}
      className={`relative ${sizeCls} ${ROSTER_RESPONSIVA_LOCAL_CLASS}`}
      title="Registrar responsiva firmada en sitio (papel)"
    >
      <FileSignature
        size={variant === 'modal' ? 15 : variant === 'chip' ? ROSTER_MOBILE_CHIP_ICON : 14}
        className={
          variant === 'modal' || variant === 'chip'
            ? 'shrink-0'
            : ROSTER_QUICK_ACTION_ICON_PROPS.className
        }
        aria-hidden
      />
      <span className={variant === 'compact' ? 'hidden sm:inline' : ''}>
        {busy ? '…' : variant === 'chip' ? 'En sitio' : 'Local'}
      </span>
    </button>
  );
}

export const ROSTER_PERSON_OF_INTEREST_MARK_CLASS =
  'border-fuchsia-700 bg-fuchsia-600 text-white hover:bg-fuchsia-700 dark:border-fuchsia-600 dark:bg-fuchsia-700 dark:hover:bg-fuchsia-600';
export const ROSTER_PERSON_OF_INTEREST_UNMARK_CLASS =
  'border-slate-500 bg-slate-600 text-white hover:bg-slate-700 dark:border-slate-500 dark:bg-slate-700 dark:hover:bg-slate-600';

/** Marcar / quitar persona de interés (misma fila que Baja, Archivar, Promover). */
export function RosterPersonOfInterestButton({ person, isMarked, onToggle, variant = 'inline' }) {
  if (!onToggle) return null;
  const title = isMarked
    ? 'Quitar marca de persona de interés (permite precarga y registro)'
    : 'Marcar como persona de interés (bloquea precarga y nuevo registro con ese ID VNPM)';
  if (variant === 'chip') {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle(person, !isMarked);
        }}
        className={`${uiRosterMobile.actionsChip} border ${
          isMarked ? ROSTER_PERSON_OF_INTEREST_UNMARK_CLASS : ROSTER_PERSON_OF_INTEREST_MARK_CLASS
        }`}
        title={title}
      >
        <ShieldAlert size={ROSTER_MOBILE_CHIP_ICON} aria-hidden className="shrink-0" />
        <span>{isMarked ? 'Quitar' : 'Interés'}</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle(person, !isMarked);
      }}
      className={`${ROSTER_QUICK_ACTION_BTN_BASE} border ${
        isMarked ? ROSTER_PERSON_OF_INTEREST_UNMARK_CLASS : ROSTER_PERSON_OF_INTEREST_MARK_CLASS
      }`}
      title={title}
    >
      <ShieldAlert {...ROSTER_QUICK_ACTION_ICON_PROPS} />
      {isMarked ? 'Quitar interés' : 'De interés'}
    </button>
  );
}

export const getWeekKeyFromDate = (dateStr) => {
  const d = dateStr ? new Date(`${dateStr}T12:00:00`) : new Date();
  if (Number.isNaN(d.getTime())) return 'Semana inválida';
  const monday = getMondayLocalFromDate(d);
  if (!monday) return 'Semana inválida';
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 0, 0, 0, 0);
  return `${toLocalISODate(monday)}|${toLocalISODate(sunday)}`;
};

export const _isSundayDate = (dateStr) => {
  const d = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date();
  if (Number.isNaN(d.getTime())) return false;
  return d.getDay() === 0;
};

export const toLocalISODate = (dateObj) => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/** Para ordenar, limpiar logs y filtros por fecha (soporta id numérico legacy o id string con prefijo temporal). */
export const extractLogMillis = (log) => {
  if (!log) return 0;
  if (Number.isFinite(log.createdAt)) return log.createdAt;
  const id = log.id;
  if (typeof id === 'number' && Number.isFinite(id) && id > 0) return id;
  if (typeof id === 'string') {
    const m = id.match(/^(\d{10,})/);
    if (m) {
      const n = Number(m[1]);
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
};

export function mergeLogsDedupById(parts) {
  const m = new Map();
  for (const arr of parts) {
    if (!Array.isArray(arr)) continue;
    for (const log of arr) {
      if (!log || log.id == null) continue;
      m.set(String(log.id), log);
    }
  }
  return [...m.values()].sort((a, b) => extractLogMillis(b) - extractLogMillis(a));
}

export async function fetchLogsRecentFromServer(targetTotal, startAfterDoc = null, useVisibleInPanel = false) {
  const acc = [];
  let cursor = startAfterDoc;
  let exhausted = false;
  while (acc.length < targetTotal && !exhausted) {
    const take = Math.min(LOGS_SERVER_CHUNK, targetTotal - acc.length);
    const q = buildLogsRecentOrderQuery(cursor, take, useVisibleInPanel);
    const snap = await getDocsFromServer(q);
    if (snap.empty) {
      exhausted = true;
      break;
    }
    acc.push(...snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    cursor = snap.docs[snap.docs.length - 1];
    if (snap.docs.length < take) exhausted = true;
  }
  return { rows: acc, oldestDocSnap: cursor, hasMoreOlder: !exhausted };
}

export async function fetchAllLogsByDocIdPages() {
  const all = [];
  let lastSnap = null;
  while (true) {
    const q = lastSnap
      ? query(getColRef('app_logs'), orderBy(documentId()), startAfter(lastSnap), limit(LOGS_SERVER_CHUNK))
      : query(getColRef('app_logs'), orderBy(documentId()), limit(LOGS_SERVER_CHUNK));
    const snap = await getDocsFromServer(q);
    if (snap.empty) break;
    all.push(...snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    lastSnap = snap.docs[snap.docs.length - 1];
    if (snap.docs.length < LOGS_SERVER_CHUNK) break;
  }
  return mergeLogsDedupById([all]);
}

export const getLogDateISO = (log) => {
  const ms = extractLogMillis(log);
  if (ms > 0) return toLocalISODate(new Date(ms));
  const ts = String(log?.timestamp || '');
  const m = ts.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return '';
  const dd = String(m[1]).padStart(2, '0');
  const mm = String(m[2]).padStart(2, '0');
  const yyyy = m[3];
  return `${yyyy}-${mm}-${dd}`;
};

/** Visibilidad base del panel (debug / oculto), sin filtros de columna. */
export function createActivityLogPanelVisibilityFilter(ctx) {
  const { hasAdminRights, showDebugLogs } = ctx;
  return (log) => {
    if (!log) return false;
    if (log.isDebug || log.isHidden) {
      if (!hasAdminRights || !showDebugLogs) return false;
    }
    return true;
  };
}

export function activityLogHasColumnFilters(ctx) {
  return (
    ctx.logFilterContext !== 'all'
    || !!String(ctx.logFilterUsername || '').trim()
    || !!String(ctx.logFilterAction || '').trim()
    || !!String(ctx.logSearchTerm || '').trim()
    || ctx.logDateMode !== 'none'
  );
}

/** Carga los últimos `count` documentos recientes (tope estricto, sin paginar miles por filtros). */
export async function fetchLogsHeadRecent(count, useVisibleInPanel = false) {
  const target = Math.max(1, Math.floor(Number(count) || 20));
  return fetchLogsRecentFromServer(target, null, useVisibleInPanel);
}

/** Misma lógica que la tabla de actividad (filtros + visibilidad debug/oculto). */
export function createActivityLogListFilter(ctx) {
  const {
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
  } = ctx;
  return (log) => {
    if (!log) return false;
    if (log.isDebug || log.isHidden) {
      if (!hasAdminRights || !showDebugLogs) return false;
    }
    const matchContext = logFilterContext === 'all' || log.eventName === logFilterContext;
    const u = String(logFilterUsername || '').trim();
    const matchUser = !u || String(log.username || '').trim() === u;
    const act = String(logFilterAction || '').trim();
    const matchAction = !act || String(log.action || '').trim() === act;
    const q = String(logSearchTerm || '').trim().toLowerCase();
    const matchSearch =
      !q ||
      String(log.username || '').toLowerCase().includes(q) ||
      String(log.action || '').toLowerCase().includes(q) ||
      String(log.details || '').toLowerCase().includes(q) ||
      String(log.eventName || '').toLowerCase().includes(q);
    const logDate = getLogDateISO(log);
    let matchDate = true;
    if (logDateMode === 'range') {
      if (!logDate) matchDate = false;
      if (logDateFrom && logDate < logDateFrom) matchDate = false;
      if (logDateTo && logDate > logDateTo) matchDate = false;
    } else if (logDateMode === 'week' && logSpecificWeek) {
      matchDate = !!logDate && getWeekKeyFromDate(logDate) === logSpecificWeek;
    } else if (logDateMode === 'day' && logSpecificDay) {
      matchDate = logDate === logSpecificDay;
    } else if (logDateMode === 'month' && logSpecificMonth) {
      matchDate = !!logDate && logDate.startsWith(logSpecificMonth);
    }
    return matchContext && matchUser && matchAction && matchSearch && matchDate;
  };
}

/** `sortedDesc` = más reciente primero; devuelve prefijo mínimo que ya incluye `visibleTarget` filas visibles (y los ocultos intermedios). */
export function trimLogsDescendingToIncludeNthVisible(sortedDesc, passesFilter, visibleTarget) {
  if (!Array.isArray(sortedDesc) || sortedDesc.length === 0) return sortedDesc;
  if (!visibleTarget || visibleTarget <= 0) return sortedDesc;
  let visibleCount = 0;
  for (let i = 0; i < sortedDesc.length; i++) {
    if (passesFilter(sortedDesc[i])) {
      visibleCount += 1;
      if (visibleCount >= visibleTarget) return sortedDesc.slice(0, i + 1);
    }
  }
  return sortedDesc;
}

/**
 * Legacy: pagina hasta N filas visibles (solo sync manual / sin `visibleInPanel`).
 * Nunca devuelve más de `maxRows` documentos en memoria.
 */
export async function fetchLogsHeadForVisibleLimit(visibleTarget, passesFilter, options = {}) {
  const { useVisibleInPanel = false, maxRows } = options;
  const cap = Math.max(
    visibleTarget,
    Math.min(maxRows ?? visibleTarget * 4, LOGS_SERVER_CHUNK * 3)
  );
  const docSnaps = [];
  const objById = new Map();
  let cursor = null;
  let lastBatchFull = false;

  for (let b = 0; b < 12; b++) {
    if (objById.size >= cap) break;
    const take = Math.min(LOGS_SERVER_CHUNK, cap - objById.size, Math.max(visibleTarget, 50));
    if (take <= 0) break;
    const q = useVisibleInPanel
      ? buildLogsRecentOrderQuery(cursor, take, true)
      : cursor
        ? query(getColRef('app_logs'), orderBy(LOGS_ORDER_FIELD, 'desc'), startAfter(cursor), limit(take))
        : query(getColRef('app_logs'), orderBy(LOGS_ORDER_FIELD, 'desc'), limit(take));
    const snap = await getDocsFromServer(q);
    if (snap.empty) {
      lastBatchFull = false;
      break;
    }
    docSnaps.push(...snap.docs);
    for (const d of snap.docs) {
      objById.set(String(d.id), { id: d.id, ...d.data() });
    }
    cursor = snap.docs[snap.docs.length - 1];
    lastBatchFull = snap.docs.length === take;
    const sorted = mergeLogsDedupById([[...objById.values()]]);
    const visibleCount = sorted.filter(passesFilter).length;
    if (visibleCount >= visibleTarget || !lastBatchFull) break;
  }

  const sortedAll = mergeLogsDedupById([[...objById.values()]]);
  let rows = trimLogsDescendingToIncludeNthVisible(sortedAll, passesFilter, visibleTarget);
  if (rows.length > cap) rows = rows.slice(0, cap);
  let oldestDocSnap = null;
  if (rows.length > 0) {
    const lastId = String(rows[rows.length - 1].id);
    for (let i = docSnaps.length - 1; i >= 0; i--) {
      if (String(docSnaps[i].id) === lastId) {
        oldestDocSnap = docSnaps[i];
        break;
      }
    }
  }
  return { rows, oldestDocSnap, hasMoreOlder: lastBatchFull };
}

/**
 * Trae *todos* los logs cuyo `createdAt` cae en [startMs, endMs). Usa un índice
 * por `createdAt` con `where` en el servidor (solo lee los documentos del rango,
 * sin leer colección completa). Pagina de `LOGS_SERVER_CHUNK` para no saturar.
 */
export async function fetchLogsInDateRange(startMs, endMs) {
  const col = getColRef('app_logs');
  const out = new Map();
  let cursor = null;
  const safetyMaxBatches = 200;
  for (let b = 0; b < safetyMaxBatches; b++) {
    const clauses = [
      where(LOGS_ORDER_FIELD, '>=', startMs),
      where(LOGS_ORDER_FIELD, '<', endMs),
      orderBy(LOGS_ORDER_FIELD, 'desc'),
      limit(LOGS_SERVER_CHUNK),
    ];
    const q = cursor
      ? query(col, ...clauses.slice(0, 3), startAfter(cursor), limit(LOGS_SERVER_CHUNK))
      : query(col, ...clauses);
    const snap = await getDocsFromServer(q);
    if (snap.empty) break;
    for (const d of snap.docs) out.set(String(d.id), { id: d.id, ...d.data() });
    cursor = snap.docs[snap.docs.length - 1];
    if (snap.docs.length < LOGS_SERVER_CHUNK) break;
  }
  return mergeLogsDedupById([[...out.values()]]);
}

/** Devuelve {startMs, endMs, label} para "hoy" en hora local del cliente. */
export function buildLogDateRangeForToday() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { startMs: start.getTime(), endMs: end.getTime(), label: 'hoy' };
}

/** Devuelve {startMs, endMs, label, isoMonday, isoSunday} para la semana actual (lunes a domingo). */
export function buildLogDateRangeForThisWeek() {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0);
  const end = new Date(monday);
  end.setDate(end.getDate() + 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    startMs: monday.getTime(),
    endMs: end.getTime(),
    label: 'esta semana',
    isoMonday: toLocalISODate(monday),
    isoSunday: toLocalISODate(sunday),
  };
}

/** Devuelve {startMs, endMs, label, isoMonth} para el mes actual. */
export function buildLogDateRangeForThisMonth() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  return {
    startMs: start.getTime(),
    endMs: end.getTime(),
    label: 'este mes',
    isoMonth: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
  };
}

export const formatDuration = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

// Carga asíncrona de SheetJS para exportar a Excel
export const loadSheetJS = () => {
  return new Promise((resolve, reject) => {
    if (window.XLSX) return resolve(window.XLSX);
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js';
    script.onload = () => resolve(window.XLSX);
    script.onerror = () => reject(new Error('No se pudo cargar la librería de exportación a Excel.'));
    document.body.appendChild(script);
  });
};

export function formatAnonymousAuthAgeMinutes(minutes) {
  if (minutes == null || !Number.isFinite(minutes)) return '—';
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (hours < 48) return rem > 0 ? `${hours} h ${rem} min` : `${hours} h`;
  const days = Math.floor(hours / 24);
  const h = hours % 24;
  return h > 0 ? `${days} d ${h} h` : `${days} d`;
}
