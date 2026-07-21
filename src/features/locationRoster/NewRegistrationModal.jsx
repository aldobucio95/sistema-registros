import React from 'react';
import { campaignMatchesPersonProfile, discountCampaignAppliesToLabel, discountCampaignHasDateRange, getValidDiscountCampaignsForPerson } from '../../app/helpers/discountCampaignHelpers.js';
import { SI_LABEL } from '../../appConstants.js';
import { CAR_DATA_FILTER_OPTIONS } from '../../carDataWhatsApp.js';
import { isCardPaymentAllowedForLocation } from '../../cardPaymentEligibility.js';
import { describeCollisionCluster } from '../../companionRegistrantCollision.js';
import AllergyFormFields from '../../components/AllergyFormFields.jsx';
import DuplicateGroupsPanel from '../../components/diagnostics/DuplicateGroupsPanel.jsx';
import DisabilityFormFields from '../../components/DisabilityFormFields.jsx';
import DiseaseFormFields from '../../components/DiseaseFormFields.jsx';
import GenderSelectButtons from '../../components/GenderSelectButtons.jsx';
import PaymentMethodSegmentToggle, { PAYMENT_TARJETA } from '../../components/PaymentMethodSegmentToggle.jsx';
import PrivacyConsentBlock from '../../components/PrivacyConsentBlock.jsx';
import { NewRegModalDraftProvider } from '../../components/registration/NewRegModalDraftProvider.jsx';
import RosterFilterCheckboxOption from '../../components/RosterFilterCheckboxOption.jsx';
import RosterLocationSearchPanel from '../../components/RosterLocationSearchPanel.jsx';
import RosterSectionScrollWrap from '../../components/RosterSectionScrollWrap.jsx';
import RosterSortDropdown from '../../components/RosterSortDropdown.jsx';
import SedeAutocompleteInput from '../../components/SedeAutocompleteInput.jsx';
import ServeAreaMultiSelect from '../../components/ServeAreaMultiSelect.jsx';
import SiNoFieldToggle from '../../components/SiNoFieldToggle.jsx';
import { buildSedeCapChipViewModel } from '../../cupoVsWaitlistDisplay.js';
import { formFieldPairControl, formFieldPairLabelHint, formPaymentHints, formPaymentPairGrid, formPaymentPairLabel, formPaymentPairLabelRow, formPaymentSectionBody } from '../../formFieldClasses.js';
import { collectLocationSuggestionsFromRosterSources } from '../../locationFieldSuggestions.js';
import { buildLocationRosterTypeSummaryByStatus, getLocationRosterSectionCountsFromSummary } from '../../locationRosterTypeSummary.js';
import LocationRosterTypeSummary from '../../LocationRosterTypeSummary.jsx';
import { nameTokensSubsetMatch } from '../../personNameMatch.js';
import { attendanceSpecialChoiceButtonClass, getPersonCost } from '../../publicRegistrationLogic.js';
import AttendanceRolesPicker from '../../components/attendance/AttendanceRolesPicker.jsx';
import {
  attendanceRolesFromLegacyPerson,
  legacyFieldsFromAttendanceRoles,
} from '../../attendanceRoles.js';
import { canAddRegistrations } from '../../rbac/permissions.js';
import { applyEditorRegistrationDefaults, canShowPastorAttendance } from '../../registrationFormEditorConfig.js';
import { BLOOD_TYPES_SELECT_OPTIONS } from '../../registrationFormShared.js';
import RegistryBirthDateField from '../../RegistryBirthDateField.jsx';
import { registrationRequiresResponsivaStatus, responsivaStatusValidationLabel } from '../../responsivaSignLogic.js';
import { ROSTER_SORT_OPTIONS } from '../../rosterSortOptions.js';
import { LocationRosterActivosChip, LocationRosterCancelledChip, LocationRosterWaitlistChip } from '../../screens/locationRoster/LocationRosterSectionChips.jsx';
import { parseStrictNonNegativeMoneyInput } from '../../strictMoneyInput.js';
import { uiBanner, uiButtons, uiDropdown, uiFilter, uiFormChoiceBtn, uiLocationNewRegCta, uiModal, uiRosterMobile, uiRosterSearch } from '../../ui/uiFormatClasses.js';
import { locationPrefsKey } from '../../userListFiltersPrefs.js';
import { personLikeIsPersonOfInterest, personOfInterestRegistrationBlockedMessage } from '../../vnpPersonFlags.js';
import { AlertTriangle, Ban, CheckCircle2, ChevronDown, ChevronUp, Church, CreditCard, Database, Download, Edit3, Filter, GraduationCap, History, Link2, ListPlus, MapPin, MessageSquare, Plus, Power, Receipt, RotateCcw, Scissors, Search, Send, Settings2, Trash2, UserPlus, Users, Wallet, X } from 'lucide-react';
import { useWorkspaceShell } from '../../screens/eventWorkspace/WorkspaceShellContext.jsx';

export default function NewRegistrationModal({ loc }) {
  const {
    ATTENDANCE_SPECIAL,
    CopyButton,
    DEFAULT_ALLERGY_OPTIONS,
    DEFAULT_SERVE_AREA_OPTIONS,
    GENDERS,
    NEW_REG_DONATION_BTN,
    NEW_REG_TOOLBAR_INDIGO_BTN,
    RESPONSIVA_STATUSES,
    SI,
    allParticipants,
    ambosServeOptionLabelsNew,
    applyImportedProfile,
    buildAttendanceSpecialFormOptions,
    buildNewEntryDuplicateHint,
    buildProfileImportMatchesForModal,
    calculateAgeFromBirthDate,
    canMarkPersonsOfInterestFlag,
    cancelledData,
    capFullWaitlistConfirmModalEl,
    companionCollisionsActionable,
    currentEvent,
    currentPricing,
    currentUser,
    data,
    editorRegistrationFieldVis,
    events,
    fieldStack,
    flushNewRegDraftToParent,
    formatPhoneNumber,
    formatPreferredServeArea,
    formatRegistrationValidationIssuesMessage,
    formatSiNo,
    generateVnpPersonId,
    getActiveDiscountCampaigns,
    getLiquidationTarget,
    getRegistrationFormIssues,
    getRequiredFieldClass,
    globalConfig,
    handleAddEntry,
    handleAddToWaitlist,
    handleClearRegistrationForm,
    handleLoadLastSuccessfulRegistrationForm,
    handleNameInput,
    hasAdminRights,
    hasValidFullName,
    inputClasses,
    isCampa,
    isDesayunoEvent,
    isGeneral,
    isLocOpen,
    isLocationFull,
    isSiValue,
    isSuperUser,
    isValidPhone,
    labelClasses,
    mergedPrivacyNotice,
    missingInitialPaid,
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
    openPreferredServeLoc,
    openServedAreasLoc,
    parsePreferredServeArea,
    participantIsArchived,
    participantIsCancelled,
    participantRosterListLabel,
    pastProfilesForImport,
    persistNewRegDraftOnly,
    personOfInterestVnpSet,
    registryConfirmBusy,
    resolveMatchedCampaignForNewEntry,
    roster,
    sendToWaitlist,
    setAllergyOptionsForm,
    setAllergyOptionsModal,
    setCustomFieldsModal,
    setDonationModal,
    setNewRegDraftCarMeta,
    setNewRegDupExpandedIds,
    setNewRegGeneralComment,
    setNewRegModalOpen,
    setNewRegPrivacyAccepted,
    setNewRegSensitiveConsent,
    setOpenPreferredServeLoc,
    setOpenServedAreasLoc,
    setRegistryConfirmModal,
    setSendToWaitlist,
    setServeAreaOptionsForm,
    setServeAreaOptionsModal,
    setSpouseLinkSearchNew,
    showToast,
    spouseLinkPickResultsNew,
    spouseLinkSearchNew,
    summary,
    waitlistData,
  } = useWorkspaceShell();

    const restrictEditorForm = currentUser?.role === 'Editor';
    const blockAdminInputs = currentUser?.role === 'Administrador';
    const fv = (key) => !restrictEditorForm || editorRegistrationFieldVis[key] !== false;
    const fieldBlocked = (key) => blockAdminInputs && editorRegistrationFieldVis[key] === false;

  const locFieldSuggestions = React.useMemo(
    () =>
      collectLocationSuggestionsFromRosterSources({
        eventId: currentEvent?.id,
        location: loc,
        active: data[loc] || [],
        waitlist: waitlistData[loc] || [],
        cancelled: cancelledData[loc] || [],
      }),
    [currentEvent?.id, loc, data, waitlistData, cancelledData]
  );
  const locSugList = (field) => `new-sug-${locationPrefsKey(loc).replace(/%/g, '')}-${field}`;
  const cardAllowedNewReg = isCardPaymentAllowedForLocation(currentEvent, loc);

  if (!newRegModalOpen || !canAddRegistrations(currentUser)) return null;

  return (
        <NewRegModalDraftProvider
          seedEntry={newEntry}
          seedProfileSearch={newRegProfileSearch}
          resetToken={newRegDraftResetToken}
          persistDraft={persistNewRegDraftOnly}
          draftLiveRef={newRegModalDraftLiveRef}
          profileSearchLiveRef={newRegModalProfileSearchLiveRef}
          buildProfileImportMatches={buildProfileImportMatchesForModal}
          buildCompanionCollisionHint={undefined}
        >
          {({
            draft,
            setDraft,
            draftRef,
            profileSearch,
            setProfileSearch,
            profileImportMatches,
            companionCollisionHint: newRegCompanionCollisionHint,
          }) => {
            const closeNewRegModal = () => {
              flushNewRegDraftToParent(draftRef.current, profileSearch);
              setNewRegModalOpen(false);
            };
            const entryForCampaignPreview = restrictEditorForm
              ? applyEditorRegistrationDefaults(draft, editorRegistrationFieldVis, currentEvent.eventType, loc)
              : draft;
            const newRegCampaignsActive = getActiveDiscountCampaigns(currentEvent).filter((c) =>
              campaignMatchesPersonProfile(c, entryForCampaignPreview)
            );
            const newRegSelectableCampaigns = getValidDiscountCampaignsForPerson(currentEvent, entryForCampaignPreview);
            const newRegBaseList = getPersonCost(entryForCampaignPreview, currentPricing, currentEvent);
            const newRegCampPreview =  resolveMatchedCampaignForNewEntry(entryForCampaignPreview);
            const newRegLiqPreview = newRegCampPreview
              ? Math.max(0, Number(newRegCampPreview.finalAmount) || 0)
              : newRegBaseList;
            const editorVisForNewReg = restrictEditorForm ? editorRegistrationFieldVis : null;
            let newRegEntryForValidation = { ...draft, paid: draft.paid || 0 };
            if (editorVisForNewReg) {
              newRegEntryForValidation = applyEditorRegistrationDefaults(
                newRegEntryForValidation,
                editorVisForNewReg,
                currentEvent.eventType,
                loc
              );
            }
            const minDepForNewRegButton =
              sendToWaitlist && !(isCampa && isSiValue(draft.isScholarship)) ? 0 : currentEvent.minDeposit || 0;
            const newRegFormIssues = getRegistrationFormIssues(
              newRegEntryForValidation,
              minDepForNewRegButton,
              currentEvent.eventType,
              editorVisForNewReg,
              currentEvent,
              newRegPrivacyContext
            );
            const isPastorNewReg = false;
            const pastorOverCapAllowed = canShowPastorAttendance({
              role: currentUser?.role,
              visibility: editorRegistrationFieldVis,
              hasAdminRights,
              eventType: currentEvent?.eventType,
            });
            const canShowPastorAttendanceType = pastorOverCapAllowed;
            const showPastorAttendanceNewReg = pastorOverCapAllowed;
            const attendanceSpecialGridClassNewReg = showPastorAttendanceNewReg
              ? 'grid grid-cols-2 sm:grid-cols-4 gap-2'
              : 'grid grid-cols-3 gap-2';
            const newRegSubmitBlocked = newRegFormIssues.length > 0;
            const canSubmitNewRegistration = isLocOpen(loc) && !newRegSubmitBlocked;
            const newRegSubmitBlockedTooltip =
              isLocOpen(loc) && newRegSubmitBlocked
                ? formatRegistrationValidationIssuesMessage(newRegFormIssues)
                : undefined;
            const newRegDuplicateHint = buildNewEntryDuplicateHint(
              draft.name,
              draft.phone,
              draft.alias,
              draft.age,
              allParticipants,
              currentEvent?.id,
              !!draft.allowSharedMainPhone
            );
            const newRegLinkableCompanionCluster =
              false && draft.name?.trim()
                ? (() => {
                    const norm = normalizeFullNameCompareKey(draft.name);
                    if (!norm) return null;
                    return (
                      companionCollisionsActionable.find((cl) => {
                        const rn = normalizeFullNameCompareKey(cl.registrantSide?.name);
                        return rn && (rn === norm || nameTokensSubsetMatch(draft.name, cl.registrantSide?.name));
                      }) || null
                    );
                  })()
                : null;
            let newRegSectionSeq = 0;
            const newRegSectionLabel = (title) => {
              newRegSectionSeq += 1;
              return `${newRegSectionSeq}. ${title}`;
            };
            return (
        <>
        <div className={uiModal.overlay} role="dialog" aria-modal="true" aria-labelledby="new-reg-modal-title">
          <button
            type="button"
            className={uiModal.backdrop}
            onClick={closeNewRegModal}
            aria-label="Cerrar formulario"
          />
          <div
            className={`${uiModal.panelXl} ${!isLocOpen(loc) ? 'opacity-60 pointer-events-none' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={uiModal.header}>
              <div className="min-w-0">
                <h3 id="new-reg-modal-title" className={uiModal.title}>
                  Nuevo registro — {loc}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-semibold">
                  {currentEvent?.name || 'Evento'} · {currentEvent?.eventType}
                  {currentUser?.role === 'Editor' ? ' · formulario Editor' : ''}
                  {!isLocOpen(loc) ? ' · sede con registro cerrado' : ''}
                </p>
              </div>
              <button
                type="button"
                className={uiButtons.closeIcon}
                onClick={closeNewRegModal}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>
            <div className={uiModal.body}>
              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-5 pb-2 mb-5">
              <button
                type="button"
                onClick={handleClearRegistrationForm}
                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700 transition-colors"
                title="Vacía todos los campos del formulario y la búsqueda de perfil"
              >
                <RotateCcw size={14} /> Limpiar formulario
              </button>
              <button
                type="button"
                onClick={handleLoadLastSuccessfulRegistrationForm}
                className={NEW_REG_TOOLBAR_INDIGO_BTN}
                title="Recupera en el borrador el último envío exitoso guardado en este equipo (activo, lista de espera o beca pendiente)"
              >
                <History size={14} /> Cargar último formulario
              </button>
              {isGeneral && hasAdminRights && (
                <button
                  type="button"
                  onClick={() => setCustomFieldsModal({ isOpen: true })}
                  className={NEW_REG_TOOLBAR_INDIGO_BTN}
                >
                  <ListPlus size={14} /> Configurar Campos Extra
                </button>
              )}
              </div>

          {newRegDuplicateHint ? (
            <div className="mb-4 flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50/95 p-3 text-amber-950 shadow-sm">
              <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={18} aria-hidden />
              <div className="min-w-0 text-[11px] leading-snug flex-1">
                <p className="font-black text-amber-900">{newRegDuplicateHint.summary}</p>
                {isSuperUser && Array.isArray(newRegDuplicateHint.matches) && newRegDuplicateHint.matches.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {newRegDuplicateHint.matches.map((row) => {
                      const { p, id, reasonsLabel } = row;
                      const expanded = newRegDupExpandedIds.includes(id);
                      const lista = participantRosterListLabel(p);
                      return (
                        <div
                          key={`newreg-dup-${id}`}
                          className="rounded-lg border border-amber-200/80 bg-white/90 overflow-hidden"
                        >
                          <div className="flex flex-wrap items-center gap-2 px-2 py-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setNewRegDupExpandedIds((prev) =>
                                  prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                                )
                              }
                              className="flex items-center gap-1 text-[10px] font-black text-amber-900 uppercase tracking-wide shrink-0"
                            >
                              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              {p.name || '(sin nombre)'}
                            </button>
                            <span className="text-[10px] font-semibold text-amber-800/90">
                              · {(p.location || '').trim() || 'Sin sede'} · {lista}
                            </span>
                            {!participantIsCancelled(p) ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (registryConfirmBusy) return;
                                setRegistryConfirmModal({
                                  isOpen: true,
                                  type: 'archive_duplicate_hint',
                                  loc: '',
                                  personId: id,
                                  personName: p.name || 'este registro',
                                  donationId: '',
                                  donationAmount: 0,
                                  refundAmount: 0,
                                  paymentIndex: null,
                                  paymentRowId: null,
                                  fromDuplicateDiagnostic: false,
                                  duplicateReasonsLine: '',
                                  dupAcceptCluster: null,
                                });
                              }}
                              className="ml-auto shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black bg-rose-600 text-white hover:bg-rose-700 border border-rose-700"
                            >
                              <Trash2 size={12} />
                              Archivar
                            </button>
                            ) : null}
                          </div>
                          {expanded ? (
                            <div className="px-2 pb-2 pt-0 border-t border-amber-100/80 text-[10px] text-slate-700 space-y-1">
                              <p>
                                <span className="font-bold text-slate-600">Coincidencia:</span> {reasonsLabel}
                              </p>
                              <p>
                                <span className="font-bold text-slate-600">Teléfono:</span> {p.phone || '—'}
                              </p>
                              <p>
                                <span className="font-bold text-slate-600">Alias:</span> {p.alias || '—'}
                              </p>
                              <p>
                                <span className="font-bold text-slate-600">ID VNPM:</span>{' '}
                                <span className="font-mono">{p.vnpPersonId || '—'}</span>
                              </p>
                              <p>
                                <span className="font-bold text-slate-600">Edad / género:</span> {p.age ?? '—'} ·{' '}
                                {p.gender || '—'}
                              </p>
                              <p className="text-slate-500 font-semibold">
                                Archivar elimina el registro del evento (datos conservados para precargar). Solo SuperUsuario.
                              </p>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <>
                    <ul className="mt-1.5 list-inside list-disc space-y-0.5 font-semibold text-amber-900/95">
                      {newRegDuplicateHint.lines.map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                    {newRegDuplicateHint.moreSuffix ? (
                      <p className="mt-1 font-bold text-amber-800">{newRegDuplicateHint.moreSuffix}</p>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          ) : null}

          {newRegCompanionCollisionHint ? (
            <div className="mb-4 flex gap-2.5 rounded-xl border border-violet-200 bg-violet-50/95 p-3 text-violet-950 shadow-sm">
              <Users className="mt-0.5 shrink-0 text-violet-600" size={18} aria-hidden />
              <div className="min-w-0 text-[11px] leading-snug flex-1">
                <p className="font-black text-violet-900">{newRegCompanionCollisionHint.summary}</p>
                <ul className="mt-1.5 list-inside list-disc space-y-0.5 font-semibold text-violet-900/95">
                  {newRegCompanionCollisionHint.lines.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
                {newRegLinkableCompanionCluster && hasAdminRights ? (
                  <button
                    type="button"
                    className="mt-2 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black bg-violet-600 text-white hover:bg-violet-700"
                    onClick={() => {
                      if (registryConfirmBusy) return;
                      setRegistryConfirmModal({
                        isOpen: true,
                        type: 'companion_link_collision',
                        loc: newRegLinkableCompanionCluster.companionSide?.location || '',
                        personId: newRegLinkableCompanionCluster.companionSide?.hostId || '',
                        personName: newRegLinkableCompanionCluster.companionSide?.displayName || '',
                        donationId: '',
                        donationAmount: 0,
                        refundAmount: 0,
                        paymentIndex: null,
                        paymentRowId: null,
                        fromDuplicateDiagnostic: false,
                        duplicateReasonsLine: describeCollisionCluster(newRegLinkableCompanionCluster),
                        dupAcceptCluster: null,
                        companionCollisionCluster: newRegLinkableCompanionCluster,
                        
                      });
                    }}
                  >
                    <Link2 size={12} />
                    Vincular acompañante existente (no crear registro duplicado)
                  </button>
                ) : (
                  <p className="mt-2 text-[10px] font-semibold text-violet-800">
                    Si esta persona ya tiene registro activo, usa el panel de diagnóstico para vincularla desde el titular.
                  </p>
                )}
              </div>
            </div>
          ) : null}

          {fv('profileImportSearch') && (
          <fieldset disabled={fieldBlocked('profileImportSearch')} className={`mb-5 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 ${fieldBlocked('profileImportSearch') ? 'opacity-70' : ''}`}>
            <div className="space-y-0.5">
              <p className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                <Database size={13} className="text-indigo-500 shrink-0" />
                Buscar perfiles · todos los eventos
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                Precarga datos para simplificar el registro;{' '}
                <span className="font-semibold text-slate-600 dark:text-slate-300">revisa siempre</span> la información antes de guardar.
                {' '}Busca por nombre, alias, ID VNPM o teléfono.
              </p>
            </div>
            {pastProfilesForImport.length === 0 && (
              <p className="text-[11px] text-amber-800 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100">
                No hay perfiles disponibles para importar (otros eventos, archivo o listas de este evento).
              </p>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Nombre, alias, ID VNPM o teléfono"
                value={profileSearch}
                onChange={(e) => setProfileSearch(e.target.value)}
              />
            </div>
            {draft.vnpPersonId ? (
              <p className="text-[11px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg inline-flex flex-wrap items-center gap-1">
                <span>
                  ID VNPM vinculado: <strong>{draft.vnpPersonId}</strong> (nuevo registro reutilizará este ID)
                </span>
                <CopyButton text={draft.vnpPersonId} label="ID VNPM" />
              </p>
            ) : null}
            {profileImportMatches.length > 0 && (
              <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white max-h-52 overflow-y-auto shadow-sm">
                {profileImportMatches.map((p) => {
                  const evName = events.find((e) => e.id === p.eventId)?.name || 'Evento';
                  const isArchived = participantIsArchived(p);
                  const archivedHere = isArchived && p.eventId === currentEvent?.id;
                  const isPersonOfInterest = personLikeIsPersonOfInterest(p, personOfInterestVnpSet, {
                    generateVnpPersonId,
                  });
                  return (
                    <li key={`${p.eventId}-${p.id}`} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-xs">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-800 truncate">{p.name}</p>
                        <p className="text-slate-500">{p.phone} · {evName}{isArchived ? ' · Archivado' : ''}</p>
                        {isPersonOfInterest ? (
                          <p className="text-[10px] font-bold text-rose-700 mt-0.5">
                            {personOfInterestRegistrationBlockedMessage(canMarkPersonsOfInterestFlag)}
                          </p>
                        ) : null}
                        {!isArchived && p.eventId === currentEvent?.id ? (
                          <p className="text-[10px] font-bold text-indigo-700 mt-0.5">
                            {participantRosterListLabel(p)} en este evento
                          </p>
                        ) : null}
                        {archivedHere ? (
                          <p className="text-[10px] font-bold text-amber-700 mt-0.5">Archivado en este evento</p>
                        ) : isArchived ? (
                          <p className="text-[10px] font-bold text-slate-500 mt-0.5">Registro eliminado (datos conservados)</p>
                        ) : null}
                        {p.vnpPersonId ? <p className="text-[10px] font-mono text-indigo-600 mt-0.5">{p.vnpPersonId}</p> : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          disabled={isPersonOfInterest}
                          title={
                            isPersonOfInterest
                              ? personOfInterestRegistrationBlockedMessage(canMarkPersonsOfInterestFlag)
                              : undefined
                          }
                          onClick={() => applyImportedProfile(p, loc)}
                          className={`py-2 px-3 rounded-lg font-bold border transition-colors ${
                            isPersonOfInterest
                              ? 'text-slate-400 bg-slate-50 border-slate-100 cursor-not-allowed'
                              : 'text-indigo-700 bg-indigo-50 border-indigo-100 hover:bg-indigo-100'
                          }`}
                        >
                          Usar datos
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </fieldset>
          )}

          <div className="space-y-4">
            <section className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800 p-3">
              <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.15em] mb-3 pb-1.5 border-b border-slate-200">{newRegSectionLabel('Datos generales')}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className={fieldStack}>
                  <label className={labelClasses}>Nombre completo</label>
                  <input placeholder="Ej. Juan Pérez López" className={`${inputClasses} ${getRequiredFieldClass(!hasValidFullName(draft.name || ''))}`} value={draft.name} onChange={e => handleNameInput(e.target.value) && setDraft({ ...draft, name: e.target.value })} />
                  <p className="text-[10px] text-slate-500 px-1">Debe incluir 1 nombre y 2 apellidos.</p>
                  <p className="text-[10px] font-mono text-indigo-600 px-1">
                    ID VNPM: {hasValidFullName(draft.name || '') && (draft.birthDate || '').trim() && String(draft.gender || '').trim() ? generateVnpPersonId(draft) : 'completa nombre, fecha de nacimiento y género'}
                  </p>
                </div>
                <div className={fieldStack}>
                  <label className={labelClasses}>Teléfono personal *</label>
                  <SedeAutocompleteInput
                    type="text"
                    placeholder="55-1234-5678"
                    listId={locSugList('phone')}
                    suggestions={locFieldSuggestions.phones}
                    className={`${inputClasses} ${getRequiredFieldClass(!isValidPhone(draft.phone || ''))}`}
                    value={draft.phone}
                    onChange={(e) => setDraft({ ...draft, phone: formatPhoneNumber(e.target.value) })}
                  />
                  <label className="flex items-start gap-2 cursor-pointer px-1 pt-0.5">
                    <input
                      type="checkbox"
                      className="mt-0.5 size-3.5 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      checked={!!draft.allowSharedMainPhone}
                      onChange={(e) => setDraft({ ...draft, allowSharedMainPhone: e.target.checked })}
                    />
                    <span className="text-[10px] text-slate-600 leading-snug">
                      Es el mismo teléfono que otro inscrito (p. ej. menor con el contacto del adulto principal)
                    </span>
                  </label>
                </div>
                <div className={fieldStack}>
                  <RegistryBirthDateField
                    userId={currentUser?.id}
                    value={draft.birthDate || ''}
                    onIsoChange={(birthDate) =>
                      setDraft({ ...draft, birthDate, age: calculateAgeFromBirthDate(birthDate) })
                    }
                    inputClasses={`${inputClasses} ${getRequiredFieldClass(!(draft.birthDate || '').trim())}`}
                    labelClasses={labelClasses}
                    footer={
                      <p className="text-[10px] text-slate-500 font-semibold px-1">Edad calculada: {draft.age || '-'}</p>
                    }
                  />
                </div>
                {(() => {
                  if (!registrationRequiresResponsivaStatus(draft, currentEvent)) return null;
                  return (
                    <div className={fieldStack}>
                      <label className={labelClasses}>{responsivaStatusValidationLabel(currentEvent)}</label>
                      <select
                        className={`${inputClasses} ${getRequiredFieldClass(!(draft.responsivaStatus || '').trim())}`}
                        value={draft.responsivaStatus || ''}
                        onChange={e => setDraft({ ...draft, responsivaStatus: e.target.value })}
                      >
                        <option value="">Seleccionar</option>
                        {RESPONSIVA_STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
                      </select>
                    </div>
                  );
                })()}
                <GenderSelectButtons
                  label="Género"
                  labelClasses={labelClasses}
                  required
                  missing={!String(draft.gender || '').trim()}
                  value={draft.gender || ''}
                  onChange={(gender) => setDraft({ ...draft, gender })}
                />
                {fv('alias') && (
                <fieldset disabled={fieldBlocked('alias')} className={`space-y-1 md:col-span-2 lg:col-span-2 ${fieldBlocked('alias') ? 'opacity-70' : ''}`}>
                  <label className={labelClasses}>Alias (opcional)</label>
                  <input placeholder="Ej. Juanito" className={inputClasses} value={draft.alias} onChange={e => setDraft({ ...draft, alias: e.target.value })} />
                </fieldset>
                )}
              </div>
              {isGeneral && currentEvent.customFields && currentEvent.customFields.length > 0 && fv('customFields') && (
                <fieldset disabled={fieldBlocked('customFields')} className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-3 pt-3 border-t border-slate-200 ${fieldBlocked('customFields') ? 'opacity-70' : ''}`}>
                  {currentEvent.customFields.map((field, idx) => (
                    <div className={fieldStack} key={idx}>
                      <label className="text-[10px] font-black text-slate-400 uppercase px-1 truncate block tracking-widest" title={field}>{field}</label>
                      <input className={inputClasses} value={draft.customData?.[field] || ''} onChange={e => setDraft({ ...draft, customData: { ...(draft.customData || {}), [field]: e.target.value } })} />
                    </div>
                  ))}
                </fieldset>
              )}
            </section>

            {(isCampa || isGeneral) && (
              <section className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800 p-3">
                <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.15em] mb-3 pb-1.5 border-b border-slate-200">{newRegSectionLabel('Contacto de emergencia')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className={fieldStack}>
                    <label className={labelClasses}>Nombre del contacto</label>
                    <SedeAutocompleteInput
                      type="text"
                      placeholder="Nombre contacto"
                      listId={locSugList('emergencyContact')}
                      suggestions={locFieldSuggestions.emergencyContacts}
                      className={`${inputClasses} ${getRequiredFieldClass((isCampa || isGeneral) && !(draft.emergencyContact || '').trim())}`}
                      value={draft.emergencyContact}
                      onChange={(e) => handleNameInput(e.target.value) && setDraft({ ...draft, emergencyContact: e.target.value })}
                    />
                  </div>
                  <div className={fieldStack}>
                    <label className={labelClasses}>Teléfono de emergencia</label>
                    <SedeAutocompleteInput
                      type="text"
                      placeholder="55-1234-5678"
                      listId={locSugList('emergencyPhone')}
                      suggestions={locFieldSuggestions.emergencyPhones}
                      className={`${inputClasses} ${getRequiredFieldClass((isCampa || isGeneral) && !isValidPhone(draft.emergencyPhone || ''))}`}
                      value={draft.emergencyPhone}
                      onChange={(e) => setDraft({ ...draft, emergencyPhone: formatPhoneNumber(e.target.value) })}
                    />
                  </div>
                  <div className={fieldStack}>
                    <label className={labelClasses}>Parentesco</label>
                    <SedeAutocompleteInput
                      type="text"
                      placeholder="Ej. Madre, padre, tutor"
                      listId={locSugList('emergencyRelationship')}
                      suggestions={locFieldSuggestions.relationships}
                      className={`${inputClasses} ${getRequiredFieldClass((isCampa || isGeneral) && !(draft.emergencyRelationship || '').trim())}`}
                      value={draft.emergencyRelationship || ''}
                      onChange={(e) => setDraft({ ...draft, emergencyRelationship: e.target.value })}
                    />
                  </div>
                </div>
              </section>
            )}

            {(isCampa) && (!restrictEditorForm || fv('bloodType') || fv('canSwim') || fv('allergies') || fv('diseases') || fv('disability')) && (
              <section className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800 p-3">
                <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.15em] mb-3 pb-1.5 border-b border-slate-200">{newRegSectionLabel('Datos médicos')}</h4>
                <div className="flex flex-col gap-2">
                  {(fv('bloodType') || fv('canSwim')) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {fv('bloodType') && (
                    <fieldset disabled={fieldBlocked('bloodType')} className={`${fieldStack} ${fieldBlocked('bloodType') ? 'opacity-70' : ''}`}>
                      <label className={labelClasses}>Tipo de sangre</label>
                      <select className={inputClasses} value={draft.bloodType} onChange={e => setDraft({ ...draft, bloodType: e.target.value })}>
                        {BLOOD_TYPES_SELECT_OPTIONS.map((bt) => (
                              <option key={bt} value={bt}>
                                {bt}
                              </option>
                            ))}
                      </select>
                    </fieldset>
                    )}
                    {fv('canSwim') && (
                    <fieldset disabled={fieldBlocked('canSwim')} className={`${fieldStack} ${fieldBlocked('canSwim') ? 'opacity-70' : ''}`}>
                      <label className={labelClasses}>¿Sabe nadar?</label>
                      <SiNoFieldToggle
                        variant="swim"
                        value={draft.canSwim}
                        onChange={(canSwim) => setDraft({ ...draft, canSwim })}
                      />
                    </fieldset>
                    )}
                  </div>
                  )}
                  {fv('allergies') && (
                  <fieldset disabled={fieldBlocked('allergies')} className={`space-y-1 ${fieldBlocked('allergies') ? 'opacity-70' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <label className={labelClasses}>Alergias</label>
                      {hasAdminRights && (
                        <button
                          type="button"
                          onClick={() => {
                            setAllergyOptionsForm(globalConfig?.allergyOptions?.length ? [...globalConfig.allergyOptions] : [...DEFAULT_ALLERGY_OPTIONS]);
                            setAllergyOptionsModal({ isOpen: true });
                          }}
                          className="text-[10px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                        >
                          <Settings2 size={12} /> Categorías
                        </button>
                      )}
                    </div>
                    <AllergyFormFields
                      variant="panel"
                      hasAllergy={draft.hasAllergy}
                      allergyDetails={draft.allergyDetails}
                      allergyCategory={draft.allergyCategory}
                      allergyOptions={globalConfig?.allergyOptions?.length ? globalConfig.allergyOptions : DEFAULT_ALLERGY_OPTIONS}
                      detailsMissing={!(draft.allergyDetails || '').trim() && !(draft.allergyCategory || '').trim()}
                      detailsClassName={getRequiredFieldClass(!(draft.allergyDetails || '').trim() && !(draft.allergyCategory || '').trim())}
                      onChange={(patch) => setDraft({ ...draft, ...patch })}
                    />
                  </fieldset>
                  )}
                  {fv('diseases') && (
                  <fieldset disabled={fieldBlocked('diseases')} className={`space-y-1 ${fieldBlocked('diseases') ? 'opacity-70' : ''}`}>
                    <label className={labelClasses}>Enfermedades</label>
                    <DiseaseFormFields
                      hasDisease={draft.hasDisease}
                      diseaseDetails={draft.diseaseDetails}
                      diseaseMedication={draft.diseaseMedication}
                      detailsClassName={getRequiredFieldClass(!(draft.diseaseDetails || '').trim())}
                      onChange={(patch) => setDraft({ ...draft, ...patch })}
                    />
                  </fieldset>
                  )}
                  {fv('disability') && (
                  <fieldset disabled={fieldBlocked('disability')} className={`space-y-1 ${fieldBlocked('disability') ? 'opacity-70' : ''}`}>
                    <label className={labelClasses}>Discapacidades</label>
                    <DisabilityFormFields
                      hasDisability={draft.hasDisability}
                      disabilityDetails={draft.disabilityDetails}
                      detailsClassName={getRequiredFieldClass(!(draft.disabilityDetails || '').trim())}
                      onChange={(patch) => setDraft({ ...draft, ...patch })}
                    />
                  </fieldset>
                  )}
                </div>
              </section>
            )}

            
            {isCampa && (!restrictEditorForm || fv('scholarship') || fv('serverRole') || fv('willBeBaptized') || fv('attendanceSpecial')) && (
              <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-600 dark:bg-slate-800">
                <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-1.5 dark:border-slate-600">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-600 dark:text-slate-300">{newRegSectionLabel('Tipo de asistencia')}</h4>
                  {hasAdminRights && (
                    <button type="button" onClick={() => { setServeAreaOptionsForm(globalConfig?.serveAreaOptions?.length ? [...globalConfig.serveAreaOptions] : [...DEFAULT_SERVE_AREA_OPTIONS]); setServeAreaOptionsModal({ isOpen: true }); }} className="text-[10px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1">
                      <Settings2 size={12} /> áreas para servir
                    </button>
                  )}
                </div>
                  <AttendanceRolesPicker
                    eventDoc={currentEvent}
                    roles={draft.attendanceRoles || attendanceRolesFromLegacyPerson(draft)}
                    onChange={(nextRoles, err) => {
                      if (err) showToast?.(err);
                      const legacy = legacyFieldsFromAttendanceRoles(nextRoles);
                      setDraft({ ...draft, ...legacy });
                    }}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  {fv('scholarship') && (
                  <fieldset disabled={fieldBlocked('scholarship')} className={`space-y-2 min-w-0 ${fieldBlocked('scholarship') ? 'opacity-70' : ''}`}>
                    <div className={fieldStack}>
                      <label className={labelClasses}>Becado</label>
                      <button
                        type="button"
                        onClick={() => {
                          const next = isSiValue(draft.isScholarship) ? 'No' : SI;
                          setDraft({
                            ...draft,
                            isScholarship: next,
                            scholarshipType: 'total',
                            scholarshipPartialAmount: '',
                            attendanceSpecialType: isSiValue(next) ? ATTENDANCE_SPECIAL.ninguno : draft.attendanceSpecialType,
                          });
                          if (isSiValue(next)) setSendToWaitlist(false);
                        }}
                        className={`${uiFormChoiceBtn.panel} ${
                          isSiValue(draft.isScholarship)
                            ? 'bg-purple-500 text-white border-purple-400'
                            : uiFormChoiceBtn.idlePanel
                        }`}
                      >
                        <GraduationCap size={14} className={isSiValue(draft.isScholarship) ? 'text-white' : uiFormChoiceBtn.iconIdle} /> {formatSiNo(draft.isScholarship)}
                      </button>
                    </div>
                    {isSiValue(draft.isScholarship) && (
                      <>
                        <div className={fieldStack}>
                          <label className={labelClasses}>Tipo de beca</label>
                          <select
                            className={inputClasses}
                            value={draft.scholarshipType === 'partial' ? 'partial' : 'total'}
                            onChange={(e) => {
                              const v = e.target.value;
                              setDraft({
                                ...draft,
                                scholarshipType: v === 'partial' ? 'partial' : 'total',
                                scholarshipPartialAmount: v === 'total' ? '' : draft.scholarshipPartialAmount,
                              });
                            }}
                          >
                            <option value="total">Beca total</option>
                            <option value="partial">Beca parcial</option>
                          </select>
                        </div>
                        {draft.scholarshipType === 'partial' && (
                          <div className={fieldStack}>
                            <label className={labelClasses}>Monto becado</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              className={`${inputClasses} ${getRequiredFieldClass(isSiValue(draft.isScholarship) && draft.scholarshipType === 'partial' && (!Number.isFinite(parseFloat(draft.scholarshipPartialAmount)) || parseFloat(draft.scholarshipPartialAmount) < 0 || parseFloat(draft.scholarshipPartialAmount) >= getPersonCost(draft, currentPricing, currentEvent)))}`}
                              value={draft.scholarshipPartialAmount}
                              onChange={(e) => setDraft({ ...draft, scholarshipPartialAmount: e.target.value })}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </fieldset>
                  )}

                  {fv('serverRole') && (
                  <fieldset disabled={fieldBlocked('serverRole')} className={`space-y-2 min-w-0 ${fieldBlocked('serverRole') ? 'opacity-70' : ''}`}>
                    <div className={fieldStack}>
                      <label className={labelClasses}>Servidor</label>
                      <button type="button" onClick={() => setDraft({
                        ...draft,
                        isServer: isSiValue(draft.isServer) ? 'No' : SI,
                        serverAssignment: '',
                        ambosServeInSegment: '',
                        baptismSegment: '',
                        isMarried: 'No',
                        spouseName: '',
                        spouseParticipantId: '',
                        spousePhone: '',
                        goesWithChildren: 'No',
                        childrenCount: '',
                        servedOtherCampa: 'No',
                        servedAreas: '',
                        preferredServeArea: '',
                        servesInCongress: 'No',
                        congressServeArea: '',
                      })} className={`${uiFormChoiceBtn.panel} ${
                        isSiValue(draft.isServer)
                          ? 'bg-amber-500 text-white border-amber-400'
                          : uiFormChoiceBtn.idlePanel
                      }`}><Users size={14} className={isSiValue(draft.isServer) ? 'text-white' : uiFormChoiceBtn.iconIdle} /> {formatSiNo(draft.isServer)}</button>
                    </div>
                    {isSiValue(draft.isServer) && (
                      <div className={fieldStack}>
                        <label className={labelClasses}>Asignación</label>
                        <select className={`${inputClasses} ${getRequiredFieldClass(isSiValue(draft.isServer) && !String(draft.serverAssignment || '').trim())}`} value={draft.serverAssignment} onChange={e => {
                          const v = e.target.value;
                          const prevAssign = String(draft.serverAssignment || '').trim();
                          setDraft({
                            ...draft,
                            serverAssignment: v,
                            baptismSegment: v === 'Ambos' ? draft.baptismSegment : '',
                            ambosServeInSegment:
                              v === 'Ambos' ? (prevAssign === 'Ambos' ? draft.ambosServeInSegment : '') : '',
                          });
                        }}>
                          <option value="Teens">Teens</option>
                          <option value="Jóvenes">Jóvenes</option>
                          <option value="Ambos">Ambos</option>
                        </select>
                        <p className="text-[9px] text-slate-500 leading-snug">
                          Puedes asignar un servidor a <strong>Teens</strong> aunque sea mayor de edad (p. ej. liderazgo en ese segmento).
                        </p>
                        {draft.serverAssignment === 'Ambos' && (
                          <div className="space-y-1 mt-2">
                            <label className={labelClasses}>¿En qué segmento sirves?</label>
                            <select
                              className={inputClasses}
                              value={draft.ambosServeInSegment || ''}
                              onChange={(e) => setDraft({ ...draft, ambosServeInSegment: e.target.value })}
                            >
                              <option value="">{ambosServeOptionLabelsNew.uniqueNew}</option>
                              <option value="Teens">{ambosServeOptionLabelsNew.teensNew}</option>
                              <option value="Jóvenes">{ambosServeOptionLabelsNew.jovenesNew}</option>
                            </select>
                            <p className="text-[9px] text-slate-500 leading-snug">
                              Tarifa única de servidor Ambos. Si eliges un solo segmento, el precio a cobrar es el de servidor en ese segmento + costo campista en el otro segmento.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </fieldset>
                  )}

                  {fv('willBeBaptized') && (
                  <fieldset disabled={fieldBlocked('willBeBaptized')} className={`space-y-2 min-w-0 ${fieldBlocked('willBeBaptized') ? 'opacity-70' : ''}`}>
                    <div className={fieldStack}>
                      <label className={labelClasses}>Bautizo</label>
                      <button
                        type="button"
                        onClick={() => {
                          const next = isSiValue(draft.willBeBaptized) ? 'No' : SI;
                          setDraft({
                            ...draft,
                            willBeBaptized: next,
                            baptismSegment: next === 'No' ? '' : draft.baptismSegment,
                          });
                        }}
                        className={`${uiFormChoiceBtn.panel} ${
                          isSiValue(draft.willBeBaptized)
                            ? 'bg-sky-600 text-white border-sky-500'
                            : uiFormChoiceBtn.idlePanel
                        }`}
                      >
                        <Church size={14} className={isSiValue(draft.willBeBaptized) ? 'text-white' : uiFormChoiceBtn.iconIdle} /> {formatSiNo(draft.willBeBaptized)}
                      </button>
                    </div>
                    {isSiValue(draft.willBeBaptized) && !isSiValue(draft.isServer) && (
                      <p className="text-[9px] text-slate-500 leading-snug">
                        Conteo en <strong>{parseInt(draft.age, 10) < 18 ? 'Teens' : 'Jóvenes'}</strong> según edad al guardar (campista).
                      </p>
                    )}
                    {isSiValue(draft.willBeBaptized) && isSiValue(draft.isServer) && draft.serverAssignment === 'Ambos' && (
                      <div className={fieldStack}>
                        <label className={labelClasses}>¿Dónde se bautiza?</label>
                        <select
                          className={`w-full px-3 py-2 bg-slate-50 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold text-slate-700 ${getRequiredFieldClass(!String(draft.baptismSegment || '').trim())}`}
                          value={draft.baptismSegment || ''}
                          onChange={(e) => setDraft({ ...draft, baptismSegment: e.target.value })}
                        >
                          <option value="">Seleccionar</option>
                          <option value="Teens">Teens</option>
                          <option value="Jóvenes">Jóvenes</option>
                        </select>
                      </div>
                    )}
                  </fieldset>
                  )}

                  {!isSiValue(draft.isScholarship) && fv('attendanceSpecial') && (
                    <fieldset disabled={fieldBlocked('attendanceSpecial')} className={`sm:col-span-3 space-y-2 ${fieldBlocked('attendanceSpecial') ? 'opacity-70' : ''}`}>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Asistencia sin cobro (cuenta en registro)</p>
                      <div className={attendanceSpecialGridClassNewReg}>
                        {buildAttendanceSpecialFormOptions(showPastorAttendanceNewReg).map(({ id, label, Icon }) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() =>
                              setDraft({
                                ...draft,
                                attendanceSpecialType: id,
                                isScholarship: 'No',
                                scholarshipType: 'total',
                                scholarshipPartialAmount: '',
                                selectedDiscountCampaignId: '',
                              })
                            }
                            className={attendanceSpecialChoiceButtonClass(draft.attendanceSpecialType, id)}
                          >
                            {Icon ? <Icon size={14} /> : null}
                            {label}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                  )}
                </div>
              </section>
            )}

            {isGeneral && !restrictEditorForm && (fv('attendanceSpecial') || fv('pastorAttendance')) && (
              <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-600 dark:bg-slate-800">
                <h4 className="mb-3 text-[10px] font-black uppercase tracking-[0.15em] text-slate-600 dark:text-slate-300 border-b border-slate-200 pb-1.5 dark:border-slate-600">
                  {newRegSectionLabel('Asistencia sin cobro')}
                </h4>
                <fieldset disabled={fieldBlocked('attendanceSpecial')} className={fieldBlocked('attendanceSpecial') ? 'opacity-70' : ''}>
                  <div className={attendanceSpecialGridClassNewReg}>
                    {buildAttendanceSpecialFormOptions(showPastorAttendanceNewReg).map(({ id, label, Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            attendanceSpecialType: id,
                            isScholarship: 'No',
                            scholarshipType: 'total',
                            scholarshipPartialAmount: '',
                            selectedDiscountCampaignId: '',
                          })
                        }
                        className={attendanceSpecialChoiceButtonClass(draft.attendanceSpecialType, id)}
                      >
                        {Icon ? <Icon size={14} /> : null}
                        {label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </section>
            )}

            {isCampa &&
              isSiValue(draft.isServer) &&
              fv('serverProfileExtra') && (
              <section className="rounded-xl border border-amber-100 bg-amber-50/50 p-3 dark:border-amber-500/35 dark:bg-amber-950/30">
                <fieldset
                  disabled={fieldBlocked('serverProfileExtra')}
                  className={fieldBlocked('serverProfileExtra') ? 'opacity-70' : ''}
                >
                  <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-amber-900 dark:text-amber-200">
                    {newRegSectionLabel('Información adicional de servidor (opcional)')}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className={fieldStack}>
                      <label className={labelClasses}>¿Es casado y va con su esposo(a)?</label>
                      <select className={inputClasses} value={draft.isMarried || 'No'} onChange={e => setDraft({ ...draft, isMarried: e.target.value, spouseName: isSiValue(e.target.value) ? draft.spouseName : '', spouseParticipantId: isSiValue(e.target.value) ? draft.spouseParticipantId : '', spousePhone: isSiValue(e.target.value) ? draft.spousePhone : '' })}>
                        <option value="No">No</option><option value={SI}>{SI_LABEL}</option>
                      </select>
                    </div>
                    {isSiValue(draft.isMarried) && (
                      <div className="space-y-1 sm:col-span-2 relative">
                        <label className={labelClasses}>Buscar pareja en registros (todas las sedes)</label>
                        <input
                          className={inputClasses}
                          placeholder="Nombre, teléfono o ID VNPM…"
                          value={spouseLinkSearchNew}
                          onChange={(e) => setSpouseLinkSearchNew(e.target.value)}
                          autoComplete="off"
                        />
                        {spouseLinkPickResultsNew.length > 0 && (
                          <ul className="absolute z-30 left-0 right-0 top-full mt-1 max-h-48 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg text-xs dark:border-slate-600 dark:bg-slate-800">
                            {spouseLinkPickResultsNew.map((p) => (
                              <li key={p.id}>
                                <button
                                  type="button"
                                  className="w-full text-left px-3 py-2 hover:bg-amber-50 font-medium text-slate-800 dark:hover:bg-amber-900/40 dark:text-slate-100"
                                  onClick={() => {
                                    setDraft({
                                      ...draft,
                                      spouseParticipantId: String(p.id),
                                      spouseName: p.name || '',
                                    });
                                    setSpouseLinkSearchNew('');
                                  }}
                                >
                                  <span className="font-bold">{p.name}</span>
                                  <span className="text-slate-500 dark:text-slate-400">
                                    {' '}
                                    · {p.location || '?'} · {p.phone || '—'}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                        <p className="text-[9px] text-slate-500 leading-snug">
                          Al menos 2 letras o 4 dígitos de teléfono. Al elegir un registro se vincula la pareja en ambos sentidos. Puedes omitir y completar después.
                        </p>
                      </div>
                    )}
                    {isSiValue(draft.isMarried) && (
                      <div className="space-y-1 sm:col-span-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label className={labelClasses}>Nombre de pareja</label>
                          {draft.spouseParticipantId ? (
                            <button
                              type="button"
                              className="text-[10px] font-bold text-amber-700 hover:underline dark:text-amber-300"
                              onClick={() => setDraft({ ...draft, spouseParticipantId: '' })}
                            >
                              Quitar vínculo
                            </button>
                          ) : null}
                        </div>
                        <input
                          className={inputClasses}
                          placeholder="Nombre o el del registro elegido arriba"
                          value={draft.spouseName || ''}
                          onChange={(e) => setDraft({ ...draft, spouseName: e.target.value })}
                        />
                        {!draft.spouseParticipantId ? (
                          <p className="text-[9px] text-amber-800/90 font-semibold dark:text-amber-200/90">Pendiente de asignar pareja (sin vínculo a registro)</p>
                        ) : (
                          <p className="text-[9px] text-emerald-700 font-semibold dark:text-emerald-400">Vinculado a registro en el sistema</p>
                        )}
                      </div>
                    )}
                    {isSiValue(draft.isMarried) && (
                      <div className={fieldStack}>
                        <label className={labelClasses}>Teléfono de la pareja (si aún no inscribe)</label>
                        <input
                          className={inputClasses}
                          inputMode="tel"
                          autoComplete="off"
                          placeholder="Opcional"
                          value={draft.spousePhone || ''}
                          onChange={(e) => setDraft({ ...draft, spousePhone: e.target.value })}
                        />
                      </div>
                    )}
                    <div className={fieldStack}>
                      <label className={labelClasses}>¿Va con hijos?</label>
                      <select className={inputClasses} value={draft.goesWithChildren || 'No'} onChange={e => setDraft({ ...draft, goesWithChildren: e.target.value, childrenCount: isSiValue(e.target.value) ? draft.childrenCount : '' })}>
                        <option value="No">No</option><option value={SI}>{SI_LABEL}</option>
                      </select>
                    </div>
                    {isSiValue(draft.goesWithChildren) && (
                      <div className={fieldStack}>
                        <label className={labelClasses}>¿Cuántos?</label>
                        <input type="number" min="1" className={inputClasses} placeholder="Número" value={draft.childrenCount || ''} onChange={e => setDraft({ ...draft, childrenCount: e.target.value })} />
                      </div>
                    )}
                    <div className={fieldStack}>
                      <label className={labelClasses}>¿Han servido en otro campa?</label>
                      <select className={inputClasses} value={draft.servedOtherCampa || 'No'} onChange={e => setDraft({ ...draft, servedOtherCampa: e.target.value, servedAreas: isSiValue(e.target.value) ? draft.servedAreas : '' })}>
                        <option value="No">No</option><option value={SI}>{SI_LABEL}</option>
                      </select>
                    </div>
                    {isSiValue(draft.servedOtherCampa) && (
                      <div className={fieldStack}>
                        <label className={labelClasses}>¿En qué áreas?</label>
                        {(() => {
                          const opts = (globalConfig?.serveAreaOptions?.length ? globalConfig.serveAreaOptions : DEFAULT_SERVE_AREA_OPTIONS);
                          const { selected, otroText } = parsePreferredServeArea(draft.servedAreas, opts);
                          const isOpen = openServedAreasLoc === loc;
                          const toggle = (opt) => {
                            const next = new Set(selected);
                            if (next.has(opt)) next.delete(opt); else next.add(opt);
                            const txt = opt === 'Otro' ? (next.has('Otro') ? otroText : '') : otroText;
                            setDraft({ ...draft, servedAreas: formatPreferredServeArea(next, txt) });
                          };
                          return (
                            <div className="relative" data-dropdown-root="new-served-areas">
                              <button type="button" onClick={() => setOpenServedAreasLoc(isOpen ? null : loc)} className={`w-full ${inputClasses} text-left flex items-center justify-between`}>
                                <span>{selected.size ? [...selected].map(s => s === 'Otro' && otroText ? `Otro: ${otroText}` : s).join(', ') : 'Seleccionar...'}</span>
                                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                              {isOpen && (
                                <>
                                  <div className="absolute inset-0 -inset-y-20 z-10" onClick={() => setOpenServedAreasLoc(null)} aria-hidden />
                                  <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-lg p-2 max-h-56 overflow-auto dark:border-slate-600 dark:bg-slate-800">
                                    {opts.map(opt => (
                                      <div key={opt}>
                                        <label className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-slate-50 cursor-pointer text-sm font-medium text-slate-700 dark:hover:bg-slate-700 dark:text-slate-100">
                                          <input type="checkbox" className="h-4 w-4 accent-indigo-600 rounded" checked={selected.has(opt)} onChange={() => toggle(opt)} />
                                          {opt}
                                        </label>
                                        {opt === 'Otro' && selected.has('Otro') && (
                                          <input type="text" placeholder="¿Cuál?" className="ml-6 mt-1 w-[calc(100%-1.5rem)] p-2 border border-slate-200 rounded text-sm dark:border-slate-600 dark:bg-slate-900" value={otroText} onChange={e => setDraft({ ...draft, servedAreas: formatPreferredServeArea(selected, e.target.value) })} onClick={e => e.stopPropagation()} />
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                    <div className="space-y-1 sm:col-span-2">
                      <label className={labelClasses}>¿En qué área les gustaría servir?</label>
                      {(() => {
                        const opts = (globalConfig?.serveAreaOptions?.length ? globalConfig.serveAreaOptions : DEFAULT_SERVE_AREA_OPTIONS);
                        const { selected, otroText } = parsePreferredServeArea(draft.preferredServeArea, opts);
                        const isOpen = openPreferredServeLoc === loc;
                        const toggle = (opt) => {
                          const next = new Set(selected);
                          if (next.has(opt)) next.delete(opt);
                          else next.add(opt);
                          if (opt === 'Otro' && !next.has('Otro')) setDraft({ ...draft, preferredServeArea: formatPreferredServeArea(next, '') });
                          else setDraft({ ...draft, preferredServeArea: formatPreferredServeArea(next, opt === 'Otro' ? otroText : '') });
                        };
                        return (
                          <div className="relative" data-dropdown-root="new-preferred-areas">
                            <button type="button" onClick={() => setOpenPreferredServeLoc(isOpen ? null : loc)} className={`w-full ${inputClasses} text-left flex items-center justify-between`}>
                              <span>{selected.size ? [...selected].map(s => s === 'Otro' && otroText ? `Otro: ${otroText}` : s).join(', ') : 'Seleccionar...'}</span>
                              {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                            {isOpen && (
                              <>
                                <div className="absolute inset-0 -inset-y-20 z-10" onClick={() => setOpenPreferredServeLoc(null)} aria-hidden />
                                <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-lg p-2 max-h-56 overflow-auto dark:border-slate-600 dark:bg-slate-800">
                                  {opts.map(opt => (
                                    <div key={opt}>
                                      <label className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-slate-50 cursor-pointer text-sm font-medium text-slate-700 dark:hover:bg-slate-700 dark:text-slate-100">
                                        <input type="checkbox" className="h-4 w-4 accent-indigo-600 rounded" checked={selected.has(opt)} onChange={() => toggle(opt)} />
                                        {opt}
                                      </label>
                                      {opt === 'Otro' && selected.has('Otro') && (
                                        <input type="text" placeholder="¿Cuál?" className="ml-6 mt-1 w-[calc(100%-1.5rem)] p-2 border border-slate-200 rounded text-sm dark:border-slate-600 dark:bg-slate-900" value={otroText} onChange={e => setDraft({ ...draft, preferredServeArea: formatPreferredServeArea(selected, e.target.value) })} onClick={e => e.stopPropagation()} />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    <div className={fieldStack}>
                      <label className={labelClasses}>¿Sirve en su congre local?</label>
                      <select className={inputClasses} value={draft.servesInCongress || 'No'} onChange={e => setDraft({ ...draft, servesInCongress: e.target.value, congressServeArea: isSiValue(e.target.value) ? draft.congressServeArea : '' })}>
                        <option value="No">No</option><option value={SI}>{SI_LABEL}</option>
                      </select>
                    </div>
                    {isSiValue(draft.servesInCongress) && (
                      <div className={fieldStack}>
                        <label className={labelClasses}>¿En qué área?</label>
                        <input className={inputClasses} value={draft.congressServeArea || ''} onChange={e => setDraft({ ...draft, congressServeArea: e.target.value })} />
                      </div>
                    )}
                  </div>
                </fieldset>
              </section>
            )}

            {!isDesayunoEvent && (!restrictEditorForm || fv('travelFrom') || fv('travelTo') || fv('transportExtras')) && (
              <section className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800 p-3">
                <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.15em] mb-3 pb-1.5 border-b border-slate-200">{newRegSectionLabel('Transporte')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {fv('travelFrom') && (
                  <fieldset disabled={fieldBlocked('travelFrom')} className={`space-y-1 ${fieldBlocked('travelFrom') ? 'opacity-70' : ''}`}>
                    <label className={labelClasses}>Sale de sede</label>
                    <select className={inputClasses} value={draft.travelFrom || loc} onChange={e => setDraft({ ...draft, travelFrom: e.target.value })}>
                      {(currentEvent?.locations || []).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </fieldset>
                  )}
                  {fv('travelTo') && (
                  <fieldset disabled={fieldBlocked('travelTo')} className={`space-y-1 ${fieldBlocked('travelTo') ? 'opacity-70' : ''}`}>
                    <label className={labelClasses}>Regresa a sede</label>
                    <select className={inputClasses} value={draft.travelTo || loc} onChange={e => setDraft({ ...draft, travelTo: e.target.value })}>
                      {(currentEvent?.locations || []).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </fieldset>
                  )}
                  {fv('transportExtras') && (
                  <fieldset disabled={fieldBlocked('transportExtras')} className={`space-y-1 md:col-span-2 ${fieldBlocked('transportExtras') ? 'opacity-70' : ''}`}>
                    <label className={labelClasses}>Transporte</label>
                    <div className="flex flex-wrap gap-3">
                      <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg px-2.5 py-2 cursor-pointer hover:bg-slate-50 transition-colors">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-indigo-600 rounded"
                          checked={!!draft.llegaEnCarro}
                          onChange={(e) => setDraft({ ...draft, llegaEnCarro: e.target.checked })}
                        />
                        Llega en carro
                      </label>
                      <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg px-2.5 py-2 cursor-pointer hover:bg-slate-50 transition-colors">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-indigo-600 rounded"
                          checked={!!draft.regresaEnCarro}
                          onChange={(e) => setDraft({ ...draft, regresaEnCarro: e.target.checked })}
                        />
                        Regresa en carro
                      </label>
                    </div>
                    {(draft.llegaEnCarro || draft.regresaEnCarro) ? (
                      <p className="text-[10px] text-slate-500 font-semibold sm:col-span-2">
                        Carro propio: al guardar se sincroniza con la flota de Transporte (misma lógica de conductor/pasajeros).
                      </p>
                    ) : null}
                    <p className="text-[10px] text-slate-500">Si no marcas ninguno: llega en camión y regresa en camión.</p>
                  </fieldset>
                  )}
                </div>
              </section>
            )}

            {/* Información de pago (5 en desayuno; 6 si hay transporte) */}
            <section className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800 p-2">
              <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.15em] mb-1.5 pb-1 border-b border-slate-200 dark:border-slate-600">{newRegSectionLabel('Información de pago')}</h4>
              <div className={formPaymentSectionBody}>
                {!cardAllowedNewReg ? (
                  <p className={`${uiBanner('warning')} gap-1.5 items-center py-1.5`} role="status">
                    <AlertTriangle size={14} className="shrink-0" aria-hidden />
                    <span className="text-[10px] leading-snug">Tarjeta deshabilitada en esta sede. Solo efectivo.</span>
                  </p>
                ) : null}
                <div className={formPaymentPairGrid}>
                  <label className={formPaymentPairLabel}>
                    <span>Método de pago</span>
                  </label>
                  <label className={formPaymentPairLabelRow}>
                    <span>Abono inicial ($)</span>
                    {isCampa && isSiValue(draft.isScholarship) && draft.scholarshipType === 'partial' ? (
                      <span
                        className={formFieldPairLabelHint}
                        title="Cualquier abono entre $0 y el saldo pendiente por liquidar (lista menos monto becado). No requiere apartado mínimo."
                      >
                        Parcial: hasta{' '}
                        {Number(getLiquidationTarget({ ...draft, isScholarship: SI, scholarshipType: 'partial' }) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    ) : !(isCampa && isSiValue(draft.isScholarship)) ? (
                      <span className={formFieldPairLabelHint}>Mín. ${currentEvent.minDeposit}</span>
                    ) : null}
                  </label>
                  <PaymentMethodSegmentToggle
                    value={draft.paymentMethod}
                    cardEnabled={cardAllowedNewReg}
                    onChange={(method) =>
                      setDraft({
                        ...draft,
                        paymentMethod: method,
                        cardReference: method === PAYMENT_TARJETA ? draft.cardReference : '',
                      })
                    }
                  />
                  <div className={`${formFieldPairControl} relative`}>
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs leading-none">$</span>
                    <input
                      type="number"
                      className={`${inputClasses} !pl-7 font-bold text-green-600 dark:text-green-400 focus:ring-green-500 dark:focus:ring-green-500 ${getRequiredFieldClass(missingInitialPaid)}`}
                      value={draft.paid}
                      placeholder="0.00"
                      onChange={e => {
                        let val = e.target.value;
                        if (val === '') { setDraft({ ...draft, paid: '' }); return; }
                        let numVal = parseFloat(val);
                        if (numVal < 0) numVal = 0;
                        const bc = getPersonCost(draft, currentPricing, currentEvent);
                        let maxCap = bc;
                        if (isCampa && isSiValue(draft.isScholarship) && draft.scholarshipType === 'partial') {
                          const liq = getLiquidationTarget({ ...draft, isScholarship: SI, scholarshipType: 'partial' });
                          maxCap = Math.min(bc, Math.max(0, liq));
                        }
                        if (numVal > maxCap) numVal = maxCap;
                        setDraft({ ...draft, paid: numVal });
                      }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-0">
                  <div className="hidden md:block" aria-hidden />
                  <div className={formPaymentHints}>
                    {(() => {
                      const inv = parseStrictNonNegativeMoneyInput(draft.paid, { allowEmpty: true });
                      if (inv.ok || draft.paid === '') return null;
                      return (
                        <p className="text-[10px] text-red-600 font-semibold px-1 leading-snug">{inv.reason}</p>
                      );
                    })()}
                    <p className="text-[10px] text-red-500 font-bold leading-snug px-1">
                      Costo del registro:{' '}
                      $
                      {(Number.isFinite(newRegBaseList) ? newRegBaseList : 0).toLocaleString('es-MX', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      {newRegCampPreview != null &&
                      Number.isFinite(newRegLiqPreview) &&
                      Math.abs(newRegLiqPreview - (Number.isFinite(newRegBaseList) ? newRegBaseList : 0)) > 0.005 ? (
                        <span className="block mt-0.5 font-semibold text-red-500/95">
                          A liquidar (campaña): $
                          {newRegLiqPreview.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      ) : null}
                    </p>
                    {(() => {
                      if (isCampa && isSiValue(draft.isScholarship)) return null;
                      const w = parseStrictNonNegativeMoneyInput(draft.paid, { allowEmpty: true });
                      if (draft.paid === '' || !w.ok || w.value >= currentEvent.minDeposit) return null;
                      return (
                        <p className="text-[10px] text-red-500 font-bold px-1">
                          Falta ${currentEvent.minDeposit - w.value} para el apartado
                        </p>
                      );
                    })()}
                  </div>
                </div>
                {draft.paymentMethod === PAYMENT_TARJETA && (
                  <div className={fieldStack}>
                    <label className={labelClasses}>Folio / referencia (opcional)</label>
                    <input
                      className={inputClasses}
                      value={draft.cardReference}
                      placeholder="Ej. folio / transacción"
                      onChange={(e) => setDraft({ ...draft, cardReference: e.target.value })}
                    />
                  </div>
                )}
              </div>
              {(currentEvent?.discountCampaigns || []).length > 0 && fv('discountCampaign') && (
                <fieldset disabled={fieldBlocked('discountCampaign')} className={fieldBlocked('discountCampaign') ? 'opacity-70' : ''}>
                <details className="group/camp mt-2 rounded-lg border border-slate-200/80 bg-slate-50/40">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-2.5 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-600 hover:bg-slate-100/40 rounded-lg [&::-webkit-details-marker]:hidden">
                    <span>Campañas de descuento</span>
                    <ChevronDown size={14} className="shrink-0 text-slate-400 transition-transform duration-200 group-open/camp:rotate-180" />
                  </summary>
                  <div className="border-t border-slate-200/60 px-2.5 pb-2.5 pt-2 space-y-2 text-[10px] text-slate-600">
                    {newRegCampaignsActive.length > 0 ? (
                      <ul className="space-y-0.5 list-disc list-inside text-slate-600">
                        {newRegCampaignsActive.map((c) => (
                          <li key={`newreg-camp-${c.id}`}>
                            <span className="font-semibold text-slate-700">{c.concept || 'Sin nombre'}</span>
                            {' ? '}
                            {c.startDate} ? {c.endDate}
                            {' ? '}
                            ${Math.max(0, Number(c.finalAmount) || 0).toLocaleString('es-MX')}
                            {' ? '}
                            {discountCampaignAppliesToLabel(c)}
                          </li>
                        ))}
                      </ul>
                    ) : newRegSelectableCampaigns.length > 0 ? (
                      <p className="text-slate-500 leading-snug">
                        Ninguna vigente hoy para este perfil; puedes elegir una en el selector.
                      </p>
                    ) : (
                      <p className="text-slate-500 leading-snug">
                        Sin campañas aplicables. Lista: <span className="font-semibold text-slate-700">${newRegBaseList.toLocaleString('es-MX')}</span>.
                      </p>
                    )}
                    {newRegSelectableCampaigns.length > 0 ? (
                      <div className={fieldStack}>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide px-0.5">Aplicar campaña</label>
                        <select
                          className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-slate-300"
                          value={draft.selectedDiscountCampaignId || ''}
                          onChange={(e) => setDraft({ ...draft, selectedDiscountCampaignId: e.target.value })}
                        >
                          <option value="">Automático (fechas vigentes hoy)</option>
                          {newRegSelectableCampaigns.map((c) => {
                            const activeToday = newRegCampaignsActive.some((a) => String(a.id) === String(c.id));
                            const noDates = !discountCampaignHasDateRange(c);
                            const suffix = noDates
                              ? ' ? manual'
                              : activeToday
                                ? ' ? vigente'
                                : ' ? fuera de vigencia';
                            return (
                              <option key={`newreg-opt-${c.id}`} value={String(c.id)}>
                                {c.concept || 'Campaña'} ? ${Math.max(0, Number(c.finalAmount) || 0).toLocaleString('es-MX')}
                                {suffix}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    ) : null}
                    <p className="text-[10px] text-slate-500 border-t border-slate-200/50 pt-2">
                      A liquidar: <span className="font-semibold text-slate-700">${newRegLiqPreview.toLocaleString('es-MX')}</span>
                      {newRegCampPreview ? (
                        <> «{newRegCampPreview.concept || '—'}» (lista base sin campaña: ${newRegBaseList.toLocaleString('es-MX')}).</>
                      ) : (
                        <> Lista del evento para este perfil.</>
                      )}
                    </p>
                  </div>
                </details>
                </fieldset>
              )}
              <div className="mt-4 space-y-3">
                <PrivacyConsentBlock
                  variant="manual"
                  privacyNotice={mergedPrivacyNotice}
                  privacyAccepted={newRegPrivacyAccepted}
                  onPrivacyAcceptedChange={setNewRegPrivacyAccepted}
                  sensitiveDataConsent={newRegSensitiveConsent}
                  onSensitiveDataConsentChange={setNewRegSensitiveConsent}
                  disabled={false}
                  compact
                />
                <div>
                  {hasAdminRights && (
                    <button
                      type="button"
                      onClick={() => setDonationModal({ isOpen: true, amount: '', donorName: '', location: loc })}
                      className={NEW_REG_DONATION_BTN}
                    >
                      <Receipt size={14} /> Donación
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-4">
                  <div className={`order-1 w-full min-w-0 flex-1 ${fieldStack}`}>
                    <label className={labelClasses}>Comentario del registro (opcional)</label>
                    <textarea
                      ref={newRegGeneralCommentRef}
                      className={`${inputClasses} min-h-[2.5rem] py-2 resize-none overflow-hidden leading-snug`}
                      rows={1}
                      placeholder="Nota interna; se guarda en el historial de comentarios de este registro"
                      value={newRegGeneralComment}
                      onChange={(e) => setNewRegGeneralComment(e.target.value)}
                    />
                  </div>
                  <div className="order-2 flex w-full min-w-0 items-end justify-end gap-3 lg:max-w-xs lg:shrink-0">
                    <label className={`inline-flex items-center gap-2 text-sm whitespace-nowrap ${isCampa && isSiValue(draft.isScholarship) ? 'text-slate-400 cursor-not-allowed' : 'text-slate-600 dark:text-slate-300'}`}>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                        checked={sendToWaitlist}
                        onChange={(e) => setSendToWaitlist(e.target.checked)}
                        disabled={!isLocOpen(loc) || (isCampa && isSiValue(draft.isScholarship))}
                      />
                      Lista de espera
                      {isCampa && isSiValue(draft.isScholarship) ? (
                        <span className="text-[10px] font-bold text-purple-600 normal-case">(la beca ya va a espera)</span>
                      ) : null}
                    </label>
                    <span
                      className={`inline-flex rounded-xl max-w-full ${newRegSubmitBlockedTooltip ? 'cursor-not-allowed' : ''}`}
                      title={newRegSubmitBlockedTooltip}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          sendToWaitlist
                            ? handleAddToWaitlist(loc, false, null, draft)
                            : handleAddEntry(loc, draft)
                        }
                        disabled={!canSubmitNewRegistration}
                        className={`sm:w-auto px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border shadow-lg active:scale-95 ${
                          canSubmitNewRegistration
                            ? 'border-indigo-700 bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100'
                            : `border-slate-500 bg-slate-600 text-slate-200 cursor-not-allowed shadow-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400${newRegSubmitBlockedTooltip ? ' pointer-events-none' : ''}`
                        }`}
                      >
                        <Plus size={20} />{' '}
                        {isCampa && isSiValue(draft.isScholarship)
                          ? 'Enviar solicitud de beca'
                          : sendToWaitlist || (isLocationFull(loc) && !(isPastorNewReg && pastorOverCapAllowed))
                            ? 'Registrar (a espera)'
                            : 'Registrar'}
                      </button>
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </div>
            </div>
          </div>
        </div>
        {capFullWaitlistConfirmModalEl}
        </>
            );
          }}
        </NewRegModalDraftProvider>
  );
}
