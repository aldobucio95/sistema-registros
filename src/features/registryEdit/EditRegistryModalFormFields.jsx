import React from 'react';
import {
  CheckCircle2, ChevronDown, ChevronUp, Church, GraduationCap, Lock, UserPlus, Users,
} from 'lucide-react';
import { getPersonCost, generateVnpPersonId } from '../../publicRegistrationLogic.js';
import {
  participantAgeBracketForResponsiva,
  registrationRequiresResponsivaStatus,
  responsivaStatusValidationLabel,
} from '../../responsivaSignLogic.js';
import ServeAreaMultiSelect from '../../components/ServeAreaMultiSelect.jsx';
import PrivacyConsentBlock from '../../components/PrivacyConsentBlock.jsx';
import GenderSelectButtons from '../../components/GenderSelectButtons.jsx';
import SedeAutocompleteInput from '../../components/SedeAutocompleteInput.jsx';
import AllergyFormFields from '../../components/AllergyFormFields.jsx';
import DiseaseFormFields from '../../components/DiseaseFormFields.jsx';
import DisabilityFormFields from '../../components/DisabilityFormFields.jsx';
import SiNoFieldToggle from '../../components/SiNoFieldToggle.jsx';
import RegistryBirthDateField from '../../RegistryBirthDateField.jsx';
import { collectLocationSuggestionsFromRosterSources } from '../../locationFieldSuggestions.js';
import { locationPrefsKey } from '../../userListFiltersPrefs.js';
import { isPastorParticipant } from '../../pastorAttendance.js';
import {
  BLOOD_TYPE_UNSPECIFIED,
  BLOOD_TYPES_SELECT_OPTIONS,
} from '../../registrationFormShared.js';
import { uiFormChoiceBtn } from '../../ui/uiFormatClasses.js';
import { useWorkspaceShell } from '../../screens/eventWorkspace/WorkspaceShellContext.jsx';
import {
  fieldStack,
  getRequiredFieldClass,
  hasValidFullName,
  isValidPhone,
  calculateAgeFromBirthDate,
  resolveLlegaEnCarro,
  resolveRegresaEnCarro,
  CopyButton,
  getResponsivaCardUiState,
  RosterResponsivaWaButton,
  RosterResponsivaLocalButton,
  GENDERS,
  RESPONSIVA_STATUSES,
  DEFAULT_ALLERGY_OPTIONS,
  DEFAULT_SERVE_AREA_OPTIONS,
  isFreeAttendanceType,
  normalizeAttendanceSpecial,
  buildAttendanceSpecialFormOptions,
  parsePreferredServeArea,
  formatPreferredServeArea,
  findDiscountCampaignById,
  isValidDiscountCampaignRow,
  participantIsCancelled,
  participantIsArchived,
  SI,
  isSiValue,
  formatSiNo,
} from './editRegistryModalFormUtils.jsx';

export default function EditRegistryModalFormFields({ onCancel, compact: compactProp }) {
  const compact = compactProp === true;
  const shell = useWorkspaceShell();
  const {
    editRegistryModal,
    setEditRegistryModal,
    currentUser,
    editorRegistrationFieldVis,
    hasAdminRights,
    currentEvent,
    data,
    waitlistData,
    cancelledData,
    globalConfig,
    allParticipants,
    isCampa,
    isGeneral,
    isDesayunoEvent,
    inputClasses,
    labelClasses,
    formatPhoneNumber,
    currentPricing,
    editPrivacyAck,
    setEditPrivacyAck,
    mergedPrivacyNotice,
    editRegDraftCarMeta,
    setEditRegDraftCarMeta,
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
  } = shell;

    if (!editRegistryModal.data) return null;
    const editLoc = String(editRegistryModal.data.location || editRegistryModal.loc || '').trim();
    const restrictEditorForm = currentUser?.role === 'Editor';
    const blockAdminInputs = currentUser?.role === 'Administrador';
    const fv = (key) => !restrictEditorForm || editorRegistrationFieldVis[key] !== false;
    const fieldBlocked = (key) => blockAdminInputs && editorRegistrationFieldVis[key] === false;
    const showPastorAttendanceOption = canShowPastorAttendance({
      role: currentUser?.role,
      visibility: editorRegistrationFieldVis,
      hasAdminRights,
      eventType: currentEvent?.eventType,
    });
    const attendanceSpecialGridClass = showPastorAttendanceOption
      ? 'grid grid-cols-2 sm:grid-cols-4 gap-2'
      : 'grid grid-cols-3 gap-2';
    const editFieldSuggestions = collectLocationSuggestionsFromRosterSources({
      eventId: currentEvent?.id,
      location: editLoc,
      active: data[editLoc] || [],
      waitlist: waitlistData[editLoc] || [],
      cancelled: cancelledData[editLoc] || [],
    });
    const editSugList = (field) => `edit-sug-${locationPrefsKey(editLoc).replace(/%/g, '')}-${field}`;
    const sectionTitle = (text, tone = 'indigo') => {
      const toneClass =
        tone === 'red'
          ? 'border-red-200 bg-red-50 text-red-700 dark:border-2 dark:border-red-500 dark:bg-transparent dark:text-red-100'
          : tone === 'amber'
            ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-2 dark:border-amber-500 dark:bg-transparent dark:text-amber-100'
            : tone === 'emerald'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-2 dark:border-emerald-500 dark:bg-transparent dark:text-emerald-100'
              : tone === 'teal'
                ? 'border-teal-200 bg-teal-50 text-teal-800 dark:border-2 dark:border-teal-500 dark:bg-transparent dark:text-teal-100'
                : tone === 'violet'
                  ? 'border-violet-200 bg-violet-50 text-violet-800 dark:border-2 dark:border-violet-500 dark:bg-transparent dark:text-violet-100'
                  : tone === 'sky'
                    ? 'border-sky-200 bg-sky-50 text-sky-800 dark:border-2 dark:border-sky-500 dark:bg-transparent dark:text-sky-100'
                    : tone === 'rose'
                      ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-2 dark:border-rose-500 dark:bg-transparent dark:text-rose-100'
                      : 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-2 dark:border-indigo-500 dark:bg-transparent dark:text-indigo-100';
      return (
        <div className={`col-span-full rounded-lg border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] shadow-sm dark:shadow-none ${toneClass}`}>
          {text}
        </div>
      );
    };
    const formBody = (
      <>
                  {sectionTitle('Detalles generales')}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <div className={fieldStack}>
                        <label className={labelClasses}>Nombre Completo</label>
                        <input
                          type="text"
                          required
                          className={`${inputClasses} ${getRequiredFieldClass(!hasValidFullName(editRegistryModal.data.name || ''))}`}
                          value={editRegistryModal.data.name}
                          onChange={(e) =>
                            handleNameInput(e.target.value) &&
                            setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, name: e.target.value } })
                          }
                        />
                      </div>
                      <div className="mt-1.5 space-y-1">
                        <label className={labelClasses}>Alias (opcional)</label>
                        <input
                          type="text"
                          className={inputClasses}
                          value={editRegistryModal.data.alias || ''}
                          onChange={(e) => setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, alias: e.target.value } })}
                        />
                      </div>
                      <div className="mt-2.5 space-y-1.5 text-[10px] px-1">
                        <p className="text-slate-500">Debe incluir 1 nombre y 2 apellidos.</p>
                        <p className="font-mono text-indigo-600">
                          ID VNPM:{' '}
                          {hasValidFullName(editRegistryModal.data.name || '') && (editRegistryModal.data.birthDate || '').trim() && String(editRegistryModal.data.gender || '').trim()
                            ? generateVnpPersonId(editRegistryModal.data)
                            : 'completa nombre, fecha de nacimiento y género'}
                        </p>
                      </div>
                    </div>
                    <div className={fieldStack}>
                      <label className={labelClasses}>Teléfono</label>
                      <SedeAutocompleteInput
                        type="text"
                        required
                        listId={editSugList('phone')}
                        suggestions={editFieldSuggestions.phones}
                        className={`${inputClasses} ${getRequiredFieldClass(!isValidPhone(editRegistryModal.data.phone || ''))}`}
                        value={editRegistryModal.data.phone}
                        onChange={(e) =>
                          setEditRegistryModal({
                            ...editRegistryModal,
                            data: { ...editRegistryModal.data, phone: formatPhoneNumber(e.target.value) },
                          })
                        }
                      />
                      <label className={`flex items-start gap-2 cursor-pointer ${compact ? 'px-0' : 'px-1'} pt-0.5`}>
                        <input
                          type="checkbox"
                          className="mt-0.5 size-3.5 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          checked={!!editRegistryModal.data.allowSharedMainPhone}
                          onChange={(e) =>
                            setEditRegistryModal({
                              ...editRegistryModal,
                              data: { ...editRegistryModal.data, allowSharedMainPhone: e.target.checked },
                            })
                          }
                        />
                        <span className={`${compact ? 'text-[10px]' : 'text-xs'} text-slate-600 leading-snug`}>
                          Es el mismo teléfono que otro inscrito (p. ej. menor con el contacto del adulto principal)
                        </span>
                      </label>
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className={labelClasses}>ID VNPM (único, lectura)</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          readOnly
                          className={`${inputClasses} bg-slate-100 text-slate-600 cursor-default font-mono text-xs flex-1 min-w-0`}
                          value={editRegistryModal.data.vnpPersonId || '? Se generará al guardar si aún no existe ?'}
                        />
                        <CopyButton text={editRegistryModal.data.vnpPersonId} label="ID VNPM" />
                      </div>
                    </div>
                    <div className={fieldStack}>
                      <RegistryBirthDateField
                        userId={currentUser?.id}
                        value={editRegistryModal.data.birthDate || ''}
                        onIsoChange={(birthDate) =>
                          setEditRegistryModal({
                            ...editRegistryModal,
                            data: {
                              ...editRegistryModal.data,
                              birthDate,
                              age: calculateAgeFromBirthDate(birthDate),
                            },
                          })
                        }
                        inputClasses={`${inputClasses} ${getRequiredFieldClass(!(editRegistryModal.data.birthDate || '').trim())}`}
                        labelClasses={labelClasses}
                        footer={
                          <p className="text-[10px] text-slate-500 font-semibold px-1">
                            Edad calculada: {editRegistryModal.data.age || '-'}
                          </p>
                        }
                      />
                    </div>
                    {(() => {
                      const ageNum = parseInt(editRegistryModal.data.age, 10);
                      if (!registrationRequiresResponsivaStatus(editRegistryModal.data, currentEvent)) return null;
                      const respLabel = responsivaStatusValidationLabel(currentEvent);
                      const adultSigner = participantAgeBracketForResponsiva(ageNum) === 'adult';
                      return (
                        <div className="space-y-1 md:col-span-2">
                          <label className={labelClasses}>{respLabel}</label>
                          <select
                            className={`${inputClasses} ${getRequiredFieldClass(!(editRegistryModal.data.responsivaStatus || '').trim())}`}
                            value={editRegistryModal.data.responsivaStatus || ''}
                            onChange={e => setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, responsivaStatus: e.target.value } })}
                          >
                            <option value="">Seleccionar</option>
                            {RESPONSIVA_STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
                          </select>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {canQuickActionResponsivaDigital && (
                            <RosterResponsivaWaButton
                              person={editRegistryModal.data}
                              loc={editRegistryModal.loc}
                              onSend={sendResponsivaSignLinkWhatsAppForPerson}
                              busyId={responsivaLinkBusyId}
                              variant="modal"
                              eventSnapshot={currentEvent}
                            />
                            )}
                            {canQuickActionResponsivaLocal && (
                            <RosterResponsivaLocalButton
                              person={editRegistryModal.data}
                              onLocal={(p) => markResponsivaLocalDelivery(p, editRegistryModal.loc)}
                              busyId={responsivaLocalBusyId}
                              variant="modal"
                              eventSnapshot={currentEvent}
                            />
                            )}
                            {(() => {
                              const card = getResponsivaCardUiState(editRegistryModal.data, currentEvent);
                              if (!card.applies) return null;
                              let hint = '';
                              if (card.delivered) {
                                if (card.deliveredKind === 'local') hint = 'Firma en sitio registrada.';
                                else if (card.deliveredKind === 'digital') hint = 'Firma o registro completo.';
                                else hint = 'Marcado como Entregada.';
                              } else if (card.digitalEnabled) {
                                if (card.digitalPhase === 'pending_sign') {
                                  hint = adultSigner
                                    ? 'Enlace enviado: esperando firma.'
                                    : 'Enlace enviado: esperando firma del tutor.';
                                } else {
                                  hint = 'Aún no se ha enviado el enlace por WhatsApp.';
                                }
                              } else {
                                hint = 'Pendiente: podés marcar entrega en sitio o el estado manual arriba.';
                              }
                              return (
                                <span className="text-[10px] font-semibold text-slate-600">{hint}</span>
                              );
                            })()}
                          </div>
                          <p className="text-[10px] text-slate-500 px-1 mt-1">
                            Puedes enviar el enlace por WhatsApp (firma digital) o registrar la responsiva firmada en sitio (papel). Con WhatsApp, si es menor de edad se usa el teléfono de emergencia; si es mayor, el teléfono principal del registro (con respaldo del otro si falta). Al firmar en línea se guarda la imagen y el estado Entregada.
                          </p>
                          {editRegistryModal.data.responsivaDigital?.method === 'local' &&
                          (editRegistryModal.data.responsivaDigital?.recordedAt ||
                            editRegistryModal.data.responsivaDigital?.signedLocallyAt) ? (
                            <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50/90 p-3">
                              <p className="text-[10px] font-black text-slate-800 uppercase tracking-wide mb-1">
                                Firma en sitio registrada
                              </p>
                              <p className="text-[11px] text-slate-600">
                                Registrado:{' '}
                                {new Date(
                                  editRegistryModal.data.responsivaDigital.recordedAt ||
                                    editRegistryModal.data.responsivaDigital.signedLocallyAt
                                ).toLocaleString('es-MX')}
                              </p>
                            </div>
                          ) : null}
                          {editRegistryModal.data.responsivaDigital?.signatureDataUrl ? (
                            <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                              <p className="text-[10px] font-black text-emerald-900 uppercase tracking-wide mb-2">Firma digital en archivo</p>
                              <img
                                src={editRegistryModal.data.responsivaDigital.signatureDataUrl}
                                alt="Firma responsiva"
                                className="max-h-36 w-auto mx-auto rounded-lg border border-white shadow-sm bg-white"
                              />
                              {editRegistryModal.data.responsivaDigital?.signerName ? (
                                <p className="text-[11px] text-slate-700 mt-2">
                                  Firmó: <span className="font-bold">{editRegistryModal.data.responsivaDigital.signerName}</span>
                                  {editRegistryModal.data.responsivaDigital?.signerRelationship ? (
                                    <>
                                      <br />
                                      <span className="font-semibold">Parentesco: </span>
                                      {editRegistryModal.data.responsivaDigital.signerRelationship}
                                    </>
                                  ) : null}
                                </p>
                              ) : null}
                              {editRegistryModal.data.responsivaDigital?.submittedAt ? (
                                <p className="text-[10px] text-slate-500 mt-1">
                                  Recibida:{' '}
                                  {new Date(editRegistryModal.data.responsivaDigital.submittedAt).toLocaleString('es-MX')}
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })()}
                    <GenderSelectButtons
                      label="Género"
                      labelClasses={labelClasses}
                      required
                      missing={!String(editRegistryModal.data.gender || '').trim()}
                      value={editRegistryModal.data.gender || ''}
                      onChange={(gender) =>
                        setEditRegistryModal({
                          ...editRegistryModal,
                          data: { ...editRegistryModal.data, gender },
                        })
                      }
                    />
                    <div className={fieldStack}>
                      <label className={labelClasses}>Sede de registro</label>
                      {hasAdminRights ? (
                        <select className={inputClasses} value={editRegistryModal.data.location || editRegistryModal.loc} onChange={e => setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, location: e.target.value } })}>
                          {(currentEvent?.locations || []).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      ) : (
                        <input className={inputClasses} value={editRegistryModal.data.location || editRegistryModal.loc} disabled />
                      )}
                    </div>
                    {!isDesayunoEvent && (
                      <>
                        <div className={fieldStack}>
                          <label className={labelClasses}>Sale de sede</label>
                          <select className={inputClasses} value={editRegistryModal.data.travelFrom || (editRegistryModal.data.location || editRegistryModal.loc)} onChange={e => setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, travelFrom: e.target.value } })}>
                            {(currentEvent?.locations || []).map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div className={fieldStack}>
                          <label className={labelClasses}>Regresa a sede</label>
                          <select className={inputClasses} value={editRegistryModal.data.travelTo || (editRegistryModal.data.location || editRegistryModal.loc)} onChange={e => setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, travelTo: e.target.value } })}>
                            {(currentEvent?.locations || []).map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div className={fieldStack}>
                          <label className={labelClasses}>Transporte</label>
                          <div className="flex flex-wrap gap-3">
                            <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 cursor-pointer hover:bg-slate-100 transition-colors">
                              <input
                                type="checkbox"
                                className="h-4 w-4 accent-indigo-600 rounded"
                                checked={resolveLlegaEnCarro(editRegistryModal.data)}
                                onChange={(e) => setEditRegistryModal({
                                  ...editRegistryModal,
                                  data: { ...editRegistryModal.data, llegaEnCarro: e.target.checked }
                                })}
                              />
                              Llega en carro
                            </label>
                            <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 cursor-pointer hover:bg-slate-100 transition-colors">
                              <input
                                type="checkbox"
                                className="h-4 w-4 accent-indigo-600 rounded"
                                checked={resolveRegresaEnCarro(editRegistryModal.data)}
                                onChange={(e) => setEditRegistryModal({
                                  ...editRegistryModal,
                                  data: { ...editRegistryModal.data, regresaEnCarro: e.target.checked }
                                })}
                              />
                              Regresa en carro
                            </label>
                          </div>
                        </div>
                      </>
                    )}
                    {sectionTitle('Contacto de emergencia', 'teal')}
                    <>
                        <div className={fieldStack}><label className={labelClasses}>Contacto Emergencia</label><SedeAutocompleteInput type="text" required={isCampa || isGeneral} listId={editSugList('emergencyContact')} suggestions={editFieldSuggestions.emergencyContacts} className={`${inputClasses} ${getRequiredFieldClass((isCampa || isGeneral) && !(editRegistryModal.data.emergencyContact || '').trim())}`} value={editRegistryModal.data.emergencyContact} onChange={e => handleNameInput(e.target.value) && setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, emergencyContact: e.target.value } })} /></div>
                        <div className={fieldStack}><label className={labelClasses}>Tel. Emergencia</label><SedeAutocompleteInput type="text" required={isCampa || isGeneral} listId={editSugList('emergencyPhone')} suggestions={editFieldSuggestions.emergencyPhones} className={`${inputClasses} ${getRequiredFieldClass((isCampa || isGeneral) && !isValidPhone(editRegistryModal.data.emergencyPhone || ''))}`} value={editRegistryModal.data.emergencyPhone} onChange={e => setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, emergencyPhone: formatPhoneNumber(e.target.value) } })} /></div>
                        <div className={fieldStack}><label className={labelClasses}>Parentesco</label><SedeAutocompleteInput type="text" required={isCampa || isGeneral} placeholder="Ej. Madre, tutor" listId={editSugList('emergencyRelationship')} suggestions={editFieldSuggestions.relationships} className={`${inputClasses} ${getRequiredFieldClass((isCampa || isGeneral) && !(editRegistryModal.data.emergencyRelationship || '').trim())}`} value={editRegistryModal.data.emergencyRelationship || ''} onChange={e => setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, emergencyRelationship: e.target.value } })} /></div>
                        {isResponsivaEnabled && (editRegistryModal.data.emergencyContactResponsiva || editRegistryModal.data.emergencyPhoneResponsiva) ? (
                          <div className="rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-2 text-[11px] text-amber-950 space-y-1.5">
                            <p className="font-black uppercase tracking-wide">Indicado al firmar responsiva (si difiere del registro inicial)</p>
                            {editRegistryModal.data.emergencyContactResponsiva ? (
                              <p>
                                <span className="font-bold text-amber-900">Nombre: </span>
                                {editRegistryModal.data.emergencyContactResponsiva}
                              </p>
                            ) : null}
                            {editRegistryModal.data.emergencyPhoneResponsiva ? (
                              <p className="font-mono font-bold">
                                <span className="font-sans font-bold text-amber-900">Tel.: </span>
                                {editRegistryModal.data.emergencyPhoneResponsiva}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                    </>
                    {isGeneral && currentEvent.customFields?.length > 0 && sectionTitle('Campos personalizados', 'violet')}
                    {isGeneral && currentEvent.customFields && currentEvent.customFields.map((field, idx) => (
                      <div className={fieldStack} key={idx}>
                        <label className={`${labelClasses} truncate`} title={field}>{field}</label>
                        <input className={inputClasses} value={editRegistryModal.data.customData?.[field] || ''} onChange={e => setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, customData: { ...(editRegistryModal.data.customData || {}), [field]: e.target.value } } })} />
                      </div>
                    ))}
                  </div>
    
                  {sectionTitle('Datos médicos', 'rose')}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-rose-50/35 dark:bg-transparent rounded-2xl border border-rose-100 dark:border-2 dark:border-rose-500 shadow-sm dark:shadow-none">
                      <h4 className="col-span-full text-[10px] font-black text-rose-700/80 dark:text-rose-100 uppercase tracking-[0.2em] pb-2 border-b border-rose-100 dark:border-rose-500/60">Condiciones médicas</h4>
                      <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-rose-100/90 dark:border-rose-500/40">
                        <div className={fieldStack}>
                          <label className={labelClasses}>Tipo de sangre</label>
                          <select className={inputClasses} value={editRegistryModal.data.bloodType || BLOOD_TYPE_UNSPECIFIED} onChange={e => setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, bloodType: e.target.value } })}>
                            {BLOOD_TYPES_SELECT_OPTIONS.map((bt) => (
                              <option key={bt} value={bt}>
                                {bt}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className={fieldStack}>
                          <label className={labelClasses}>¿Sabe nadar?</label>
                          <SiNoFieldToggle
                            variant="swim"
                            value={editRegistryModal.data.canSwim}
                            onChange={(canSwim) =>
                              setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, canSwim } })
                            }
                          />
                        </div>
                      </div>
                      <div className={fieldStack}>
                        <label className={labelClasses}>Alergias</label>
                        <AllergyFormFields
                          hasAllergy={editRegistryModal.data.hasAllergy}
                          allergyDetails={editRegistryModal.data.allergyDetails}
                          allergyCategory={editRegistryModal.data.allergyCategory}
                          allergyOptions={globalConfig?.allergyOptions?.length ? globalConfig.allergyOptions : DEFAULT_ALLERGY_OPTIONS}
                          detailsMissing={!(editRegistryModal.data.allergyDetails || '').trim() && !(editRegistryModal.data.allergyCategory || '').trim()}
                          detailsClassName={getRequiredFieldClass(!(editRegistryModal.data.allergyDetails || '').trim() && !(editRegistryModal.data.allergyCategory || '').trim())}
                          onChange={(patch) => setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, ...patch } })}
                        />
                      </div>
                      <div className={fieldStack}>
                        <label className={labelClasses}>Enfermedades</label>
                        <DiseaseFormFields
                          hasDisease={editRegistryModal.data.hasDisease}
                          diseaseDetails={editRegistryModal.data.diseaseDetails}
                          diseaseMedication={editRegistryModal.data.diseaseMedication}
                          detailsClassName={getRequiredFieldClass(!(editRegistryModal.data.diseaseDetails || '').trim())}
                          onChange={(patch) =>
                            setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, ...patch } })
                          }
                        />
                      </div>
                      <div className={fieldStack}>
                        <label className={labelClasses}>Discapacidades</label>
                        <DisabilityFormFields
                          hasDisability={editRegistryModal.data.hasDisability}
                          disabilityDetails={editRegistryModal.data.disabilityDetails}
                          detailsClassName={getRequiredFieldClass(!(editRegistryModal.data.disabilityDetails || '').trim())}
                          onChange={(patch) =>
                            setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, ...patch } })
                          }
                        />
                      </div>
                    </div>

                      
                  {compact && isCampa && sectionTitle('Asistencia y configuracion campa', 'amber')}
                  {isCampa && (
                    <div className="grid grid-cols-1 gap-6 p-6 rounded-2xl border border-amber-100 bg-amber-50/40 shadow-sm dark:border-amber-500/35 dark:bg-amber-950/25 dark:shadow-black/20">
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] border-b pb-2 text-amber-900/80 border-amber-200/80 dark:text-amber-200 dark:border-amber-600/50">
                          Configuración Especial
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const next = isSiValue(editRegistryModal.data.isScholarship) ? 'No' : SI;
                              setEditRegistryModal({
                                ...editRegistryModal,
                                data: {
                                  ...editRegistryModal.data,
                                  isScholarship: next,
                                  scholarshipType: isSiValue(next) ? 'total' : 'none',
                                  scholarshipPartialAmount: isSiValue(next) ? '' : '',
                                  attendanceSpecialType: isSiValue(next) ? ATTENDANCE_SPECIAL.ninguno : editRegistryModal.data.attendanceSpecialType,
                                }
                              });
                            }}
                            className={`${uiFormChoiceBtn.panel} flex-1 min-w-[100px] ${
                              isSiValue(editRegistryModal.data.isScholarship)
                                ? 'bg-purple-500 text-white border-purple-400'
                                : uiFormChoiceBtn.idlePanelAlt
                            }`}
                          >
                            <GraduationCap size={14} className={isSiValue(editRegistryModal.data.isScholarship) ? 'text-white' : uiFormChoiceBtn.iconIdle} /> Becado: {formatSiNo(editRegistryModal.data.isScholarship)}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const wasServer = isSiValue(editRegistryModal.data.isServer);
                              const nextIsServer = wasServer ? 'No' : SI;
                              const ageT = parseInt(editRegistryModal.data.age, 10);
                              const campIfCampista =
                                Number.isFinite(ageT) && ageT > 0 ? (ageT < 18 ? 'Teens' : 'Jóvenes') : 'Jóvenes';
                              const hadCamp = String(editRegistryModal.data.campAssignment || '').trim();
                              setEditRegistryModal({
                                ...editRegistryModal,
                                data: {
                                  ...editRegistryModal.data,
                                  isServer: nextIsServer,
                                  serverAssignment: '',
                                  ambosServeInSegment: '',
                                  baptismSegment: '',
                                  isMarried: 'No',
                                  spouseName: '',
                                  goesWithChildren: 'No',
                                  childrenCount: '',
                                  servedOtherCampa: 'No',
                                  servedAreas: '',
                                  preferredServeArea: '',
                                  servesInCongress: 'No',
                                  congressServeArea: '',
                                  ...(wasServer && !hadCamp ? { campAssignment: campIfCampista } : {}),
                                },
                              });
                            }}
                            className={`${uiFormChoiceBtn.panel} flex-1 min-w-[100px] ${
                              isSiValue(editRegistryModal.data.isServer)
                                ? 'bg-amber-500 text-white border-amber-400'
                                : uiFormChoiceBtn.idlePanelAlt
                            }`}
                          >
                            <Users size={14} className={isSiValue(editRegistryModal.data.isServer) ? 'text-white' : uiFormChoiceBtn.iconIdle} /> Servidor: {formatSiNo(editRegistryModal.data.isServer)}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const next = isSiValue(editRegistryModal.data.willBeBaptized) ? 'No' : SI;
                              setEditRegistryModal({
                                ...editRegistryModal,
                                data: {
                                  ...editRegistryModal.data,
                                  willBeBaptized: next,
                                  baptismSegment: next === 'No' ? '' : editRegistryModal.data.baptismSegment,
                                },
                              });
                            }}
                            className={`${uiFormChoiceBtn.panel} flex-1 min-w-[100px] ${
                              isSiValue(editRegistryModal.data.willBeBaptized)
                                ? 'bg-sky-600 text-white border-sky-500'
                                : uiFormChoiceBtn.idlePanelAlt
                            }`}
                          >
                            <Church size={14} className={isSiValue(editRegistryModal.data.willBeBaptized) ? 'text-white' : uiFormChoiceBtn.iconIdle} /> Bautizo: {formatSiNo(editRegistryModal.data.willBeBaptized)}
                          </button>
                        </div>
    
                        {isSiValue(editRegistryModal.data.isScholarship) && (
                          <div className="space-y-2 max-w-xs mt-3">
                            <div className={fieldStack}>
                              <label className={labelClasses}>Tipo de beca</label>
                              <select
                                className={inputClasses}
                                value={editRegistryModal.data.scholarshipType === 'partial' ? 'partial' : 'total'}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setEditRegistryModal({
                                    ...editRegistryModal,
                                    data: {
                                      ...editRegistryModal.data,
                                      scholarshipType: v === 'partial' ? 'partial' : 'total',
                                      scholarshipPartialAmount: v === 'total' ? '' : editRegistryModal.data.scholarshipPartialAmount,
                                    },
                                  });
                                }}
                              >
                                <option value="total">Beca total</option>
                                <option value="partial">Beca parcial</option>
                              </select>
                            </div>
                            {editRegistryModal.data.scholarshipType === 'partial' && (
                              <div className={fieldStack}>
                                <label className={labelClasses}>Monto becado</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                  className={`${inputClasses} ${getRequiredFieldClass(isSiValue(editRegistryModal.data.isScholarship) && editRegistryModal.data.scholarshipType === 'partial' && (!Number.isFinite(parseFloat(editRegistryModal.data.scholarshipPartialAmount)) || parseFloat(editRegistryModal.data.scholarshipPartialAmount) < 0 || parseFloat(editRegistryModal.data.scholarshipPartialAmount) >= getPersonCost(editRegistryModal.data, currentPricing, currentEvent)))}`}
                                  value={editRegistryModal.data.scholarshipPartialAmount ?? ''}
                                  onChange={(e) => setEditRegistryModal({
                                    ...editRegistryModal,
                                    data: { ...editRegistryModal.data, scholarshipPartialAmount: e.target.value },
                                  })}
                                />
                              </div>
                            )}
                          </div>
                        )}
    
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                          <div className="space-y-2 min-w-0">
                            {isSiValue(editRegistryModal.data.isServer) && (
                              <div className={fieldStack}>
                                <label className={labelClasses}>Asignación</label>
                                <select className={inputClasses} value={editRegistryModal.data.serverAssignment || ''} onChange={e => {
                                  const v = e.target.value;
                                  const prevAssign = String(editRegistryModal.data.serverAssignment || '').trim();
                                  setEditRegistryModal({
                                    ...editRegistryModal,
                                    data: {
                                      ...editRegistryModal.data,
                                      serverAssignment: v,
                                      baptismSegment: v === 'Ambos' ? editRegistryModal.data.baptismSegment : '',
                                      ambosServeInSegment:
                                        v === 'Ambos'
                                          ? prevAssign === 'Ambos'
                                            ? editRegistryModal.data.ambosServeInSegment
                                            : ''
                                          : '',
                                    },
                                  });
                                }}>
                                  <option value="Teens">Teens</option>
                                  <option value="Jóvenes">Jóvenes</option>
                                  <option value="Ambos">Ambos</option>
                                </select>
                                <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-snug">
                                  Un servidor puede estar en <strong>Teens</strong> aunque sea mayor de edad.
                                </p>
                                {editRegistryModal.data.serverAssignment === 'Ambos' && (
                                  <div className="space-y-1 mt-2">
                                    <label className={labelClasses}>¿En qué segmento sirves?</label>
                                    <select
                                      className={inputClasses}
                                      value={editRegistryModal.data.ambosServeInSegment || ''}
                                      onChange={(e) =>
                                        setEditRegistryModal({
                                          ...editRegistryModal,
                                          data: { ...editRegistryModal.data, ambosServeInSegment: e.target.value },
                                        })
                                      }
                                    >
                                      <option value="">{ambosServeOptionLabelsEdit.uniqueEdit}</option>
                                      <option value="Teens">{ambosServeOptionLabelsEdit.teensEdit}</option>
                                      <option value="Jóvenes">{ambosServeOptionLabelsEdit.jovenesEdit}</option>
                                    </select>
                                    <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-snug">
                                      Precio lista = costo servidor en ese segmento + lista campista (según calendario o fijo).
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="space-y-2 min-w-0">
                            {isSiValue(editRegistryModal.data.willBeBaptized) && !isSiValue(editRegistryModal.data.isServer) && (
                              <p className="text-[10px] text-slate-600 dark:text-slate-300">
                                Conteo del bautizo en <strong>{editRegistryModal.data.campAssignment || (Number.isFinite(parseInt(editRegistryModal.data.age, 10)) && parseInt(editRegistryModal.data.age, 10) < 18 ? 'Teens' : 'Jóvenes')}</strong> (campista, según asignación o edad).
                              </p>
                            )}
                            {isSiValue(editRegistryModal.data.willBeBaptized) && isSiValue(editRegistryModal.data.isServer) && editRegistryModal.data.serverAssignment === 'Ambos' && (
                              <div className={fieldStack}>
                                <label className={labelClasses}>¿Dónde se bautiza?</label>
                                <select
                                  className={`${inputClasses} ${getRequiredFieldClass(!String(editRegistryModal.data.baptismSegment || '').trim())}`}
                                  value={editRegistryModal.data.baptismSegment || ''}
                                  onChange={(e) => setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, baptismSegment: e.target.value } })}
                                >
                                  <option value="">Seleccionar</option>
                                  <option value="Teens">Teens</option>
                                  <option value="Jóvenes">Jóvenes</option>
                                </select>
                              </div>
                            )}
                          </div>
                        </div>
    
                        {!isSiValue(editRegistryModal.data.isScholarship) && (
                          <div className="p-4 rounded-xl mt-3 border border-teal-200 bg-teal-50/50 dark:border-slate-600 dark:bg-slate-800">
                            <p className="text-[10px] font-black text-teal-800 dark:text-teal-100 uppercase tracking-widest mb-2">
                              Asistencia sin cobro (empleado / cortesía{showPastorAttendanceOption ? ' / pastor' : ''})
                            </p>
                            <div className={attendanceSpecialGridClass}>
                              {buildAttendanceSpecialFormOptions(showPastorAttendanceOption).map(({ id, label, Icon }) => (
                                <button
                                  key={id}
                                  type="button"
                                  onClick={() =>
                                    setEditRegistryModal({
                                      ...editRegistryModal,
                                      data: {
                                        ...editRegistryModal.data,
                                        attendanceSpecialType: id,
                                        isScholarship: 'No',
                                        scholarshipType: 'total',
                                        scholarshipPartialAmount: '',
                                        editApplyCampaignId: isFreeAttendanceType(id) ? '__none__' : editRegistryModal.data.editApplyCampaignId,
                                      },
                                    })
                                  }
                                  className={attendanceSpecialChoiceButtonClass(normalizeAttendanceSpecial(editRegistryModal.data), id)}
                                >
                                  {Icon ? <Icon size={14} /> : null}
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
    
                        {isSiValue(editRegistryModal.data.isServer) &&
                        isCampa ? (
                          <div className="space-y-3 mt-3">
                            <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/60 dark:border-amber-500/35 dark:bg-amber-950/30">
                              <p className="text-[10px] font-black uppercase tracking-widest mb-3 text-amber-900 dark:text-amber-200">
                                Información adicional de servidor (opcional)
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className={fieldStack}>
                                  <label className={labelClasses}>¿Es casado y va con su esposo(a)?</label>
                                  <select className={inputClasses} value={editRegistryModal.data.isMarried || 'No'} onChange={e => setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, isMarried: e.target.value, spouseName: isSiValue(e.target.value) ? (editRegistryModal.data.spouseName || '') : '', spouseParticipantId: isSiValue(e.target.value) ? (editRegistryModal.data.spouseParticipantId || '') : '', spousePhone: isSiValue(e.target.value) ? (editRegistryModal.data.spousePhone || '') : '' } })}>
                                    <option value="No">No</option><option value={SI}>{SI_LABEL}</option>
                                  </select>
                                </div>
                                {isSiValue(editRegistryModal.data.isMarried) && (
                                  <div className="space-y-1 sm:col-span-2 relative">
                                    <label className={labelClasses}>Buscar pareja en registros (todas las sedes)</label>
                                    <input
                                      className={inputClasses}
                                      placeholder="Nombre, teléfono o ID VNPM…"
                                      value={spouseLinkSearchEdit}
                                      onChange={(e) => setSpouseLinkSearchEdit(e.target.value)}
                                      autoComplete="off"
                                    />
                                    {spouseLinkPickResultsEdit.length > 0 && (
                                      <ul className="absolute z-30 left-0 right-0 top-full mt-1 max-h-48 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg text-xs dark:border-slate-600 dark:bg-slate-800">
                                        {spouseLinkPickResultsEdit.map((p) => (
                                          <li key={p.id}>
                                            <button
                                              type="button"
                                              className="w-full text-left px-3 py-2 hover:bg-amber-50 font-medium text-slate-800 dark:hover:bg-amber-900/40 dark:text-slate-100"
                                              onClick={() => {
                                                setEditRegistryModal({
                                                  ...editRegistryModal,
                                                  data: {
                                                    ...editRegistryModal.data,
                                                    spouseParticipantId: String(p.id),
                                                    spouseName: p.name || '',
                                                  },
                                                });
                                                setSpouseLinkSearchEdit('');
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
                                    <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-snug">
                                      Al menos 2 letras o 4 dígitos. Al elegir se vincula la pareja en ambos sentidos.
                                    </p>
                                  </div>
                                )}
                                {isSiValue(editRegistryModal.data.isMarried) && (
                                  <div className="space-y-1 sm:col-span-2">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <label className={labelClasses}>Nombre de pareja</label>
                                      {editRegistryModal.data.spouseParticipantId ? (
                                        <button
                                          type="button"
                                          className="text-[10px] font-bold text-amber-800 hover:underline dark:text-amber-300"
                                          onClick={() =>
                                            setEditRegistryModal({
                                              ...editRegistryModal,
                                              data: { ...editRegistryModal.data, spouseParticipantId: '' },
                                            })
                                          }
                                        >
                                          Quitar vínculo
                                        </button>
                                      ) : null}
                                    </div>
                                    <input
                                      className={inputClasses}
                                      placeholder="Nombre o el del registro elegido arriba"
                                      value={editRegistryModal.data.spouseName || ''}
                                      onChange={(e) =>
                                        setEditRegistryModal({
                                          ...editRegistryModal,
                                          data: { ...editRegistryModal.data, spouseName: e.target.value },
                                        })
                                      }
                                    />
                                    {!editRegistryModal.data.spouseParticipantId ? (
                                      <p className="text-[9px] font-semibold text-amber-800/90 dark:text-amber-200/90">
                                        Pendiente de asignar pareja (sin vínculo a registro)
                                      </p>
                                    ) : (
                                      <p className="text-[9px] font-semibold text-emerald-800 dark:text-emerald-300">
                                        Vinculado a registro en el sistema
                                      </p>
                                    )}
                                  </div>
                                )}
                                {isSiValue(editRegistryModal.data.isMarried) && (
                                  <div className={fieldStack}>
                                    <label className={labelClasses}>Teléfono de la pareja (si aún no inscribe)</label>
                                    <input
                                      className={inputClasses}
                                      inputMode="tel"
                                      autoComplete="off"
                                      placeholder="Opcional"
                                      value={editRegistryModal.data.spousePhone || ''}
                                      onChange={(e) =>
                                        setEditRegistryModal({
                                          ...editRegistryModal,
                                          data: { ...editRegistryModal.data, spousePhone: e.target.value },
                                        })
                                      }
                                    />
                                  </div>
                                )}
                                <div className={fieldStack}>
                                  <label className={labelClasses}>¿Va con hijos?</label>
                                  <select className={inputClasses} value={editRegistryModal.data.goesWithChildren || 'No'} onChange={e => setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, goesWithChildren: e.target.value, childrenCount: isSiValue(e.target.value) ? (editRegistryModal.data.childrenCount ?? '') : '' } })}>
                                    <option value="No">No</option><option value={SI}>{SI_LABEL}</option>
                                  </select>
                                </div>
                                {isSiValue(editRegistryModal.data.goesWithChildren) && (
                                  <div className={fieldStack}>
                                    <label className={labelClasses}>¿Cuántos?</label>
                                    <input type="number" min="1" className={inputClasses} placeholder="Número" value={editRegistryModal.data.childrenCount || ''} onChange={e => setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, childrenCount: e.target.value } })} />
                                  </div>
                                )}
                                <div className={fieldStack}>
                                  <label className={labelClasses}>¿Han servido en otro campa?</label>
                                  <select className={inputClasses} value={editRegistryModal.data.servedOtherCampa || 'No'} onChange={e => setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, servedOtherCampa: e.target.value, servedAreas: isSiValue(e.target.value) ? (editRegistryModal.data.servedAreas || '') : '' } })}>
                                    <option value="No">No</option><option value={SI}>{SI_LABEL}</option>
                                  </select>
                                </div>
                                {isSiValue(editRegistryModal.data.servedOtherCampa) && (
                                  <div className={fieldStack}>
                                    <label className={labelClasses}>¿En qué áreas?</label>
                                    {(() => {
                                      const opts = (globalConfig?.serveAreaOptions?.length ? globalConfig.serveAreaOptions : DEFAULT_SERVE_AREA_OPTIONS);
                                      const { selected, otroText } = parsePreferredServeArea(editRegistryModal.data.servedAreas || '', opts);
                                      const toggle = (opt) => {
                                        const next = new Set(selected);
                                        if (next.has(opt)) next.delete(opt); else next.add(opt);
                                        const txt = opt === 'Otro' ? (next.has('Otro') ? otroText : '') : otroText;
                                        setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, servedAreas: formatPreferredServeArea(next, txt) } });
                                      };
                                      return (
                                        <div className="relative" data-dropdown-root="edit-served-areas">
                                          <button type="button" onClick={() => setEditServedAreasDropdownOpen(!editServedAreasDropdownOpen)} className={`w-full ${inputClasses} text-left flex items-center justify-between`}>
                                            <span>{selected.size ? [...selected].map(s => s === 'Otro' && otroText ? `Otro: ${otroText}` : s).join(', ') : 'Seleccionar...'}</span>
                                            {editServedAreasDropdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                          </button>
                                          {editServedAreasDropdownOpen && (
                                            <>
                                              <div className="absolute inset-0 -inset-y-20 z-10" onClick={() => setEditServedAreasDropdownOpen(false)} aria-hidden />
                                              <div className="absolute top-full left-0 right-0 mt-1 z-20 rounded-lg border border-slate-200 bg-white p-2 shadow-lg max-h-56 overflow-auto dark:border-slate-600 dark:bg-slate-800">
                                                {opts.map(opt => (
                                                  <div key={opt}>
                                                    <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/60">
                                                      <input type="checkbox" className="h-4 w-4 accent-indigo-600 rounded" checked={selected.has(opt)} onChange={() => toggle(opt)} />
                                                      {opt}
                                                    </label>
                                                    {opt === 'Otro' && selected.has('Otro') && (
                                                      <input type="text" placeholder="¿Cuál?" className="ml-6 mt-1 w-[calc(100%-1.5rem)] p-2 border border-slate-200 rounded text-sm" value={otroText} onChange={e => setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, servedAreas: formatPreferredServeArea(selected, e.target.value) } })} onClick={e => e.stopPropagation()} />
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
                                    const { selected, otroText } = parsePreferredServeArea(editRegistryModal.data.preferredServeArea || '', opts);
                                    const toggle = (opt) => {
                                      const next = new Set(selected);
                                      if (next.has(opt)) next.delete(opt);
                                      else next.add(opt);
                                      const txt = opt === 'Otro' ? (next.has('Otro') ? otroText : '') : otroText;
                                      setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, preferredServeArea: formatPreferredServeArea(next, txt) } });
                                    };
                                    return (
                                      <div className="relative" data-dropdown-root="edit-preferred-areas">
                                        <button type="button" onClick={() => setEditPreferredServeDropdownOpen(!editPreferredServeDropdownOpen)} className={`w-full ${inputClasses} text-left flex items-center justify-between`}>
                                          <span>{selected.size ? [...selected].map(s => s === 'Otro' && otroText ? `Otro: ${otroText}` : s).join(', ') : 'Seleccionar...'}</span>
                                          {editPreferredServeDropdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                        {editPreferredServeDropdownOpen && (
                                          <>
                                            <div className="absolute inset-0 -inset-y-20 z-10" onClick={() => setEditPreferredServeDropdownOpen(false)} aria-hidden />
                                            <div className="absolute top-full left-0 right-0 mt-1 z-20 rounded-lg border border-slate-200 bg-white p-2 shadow-lg max-h-56 overflow-auto dark:border-slate-600 dark:bg-slate-800">
                                              {opts.map(opt => (
                                                <div key={opt}>
                                                  <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/60">
                                                    <input type="checkbox" className="h-4 w-4 accent-indigo-600 rounded" checked={selected.has(opt)} onChange={() => toggle(opt)} />
                                                    {opt}
                                                  </label>
                                                  {opt === 'Otro' && selected.has('Otro') && (
                                                    <input type="text" placeholder="¿Cuál?" className="ml-6 mt-1 w-[calc(100%-1.5rem)] p-2 border border-slate-200 rounded text-sm" value={otroText} onChange={e => setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, preferredServeArea: formatPreferredServeArea(selected, e.target.value) } })} onClick={e => e.stopPropagation()} />
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
                                  <select className={inputClasses} value={editRegistryModal.data.servesInCongress || 'No'} onChange={e => setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, servesInCongress: e.target.value, congressServeArea: isSiValue(e.target.value) ? (editRegistryModal.data.congressServeArea || '') : '' } })}>
                                    <option value="No">No</option><option value={SI}>{SI_LABEL}</option>
                                  </select>
                                </div>
                                {isSiValue(editRegistryModal.data.servesInCongress) && (
                                  <div className={fieldStack}>
                                    <label className={labelClasses}>¿En qué área?</label>
                                    <input className={inputClasses} value={editRegistryModal.data.congressServeArea || ''} onChange={e => setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, congressServeArea: e.target.value } })} />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1 mt-3">
                            <label className={labelClasses}>Asignación de Campista</label>
                            <select
                              className={inputClasses}
                              value={editRegistryModal.data.campAssignment || 'Teens'}
                              onChange={e => setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, campAssignment: e.target.value } })}
                            >
                              <option value="Teens">Teens (campistas menores de 18)</option>
                              <option value="Jóvenes">Jóvenes (campistas 18+)</option>
                            </select>
                            <p className="text-[9px] text-slate-500 leading-snug">
                              Los <strong>servidores</strong> eligen Teens / Jóvenes / Ambos en «Asignación»; un adulto puede estar asignado a Teens.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {isGeneral && !isSiValue(editRegistryModal.data.isScholarship) && (
                    <div className="p-4 rounded-xl mt-3 border border-teal-200 bg-teal-50/50 dark:border-slate-600 dark:bg-slate-800">
                      <p className="text-[10px] font-black text-teal-800 dark:text-teal-100 uppercase tracking-widest mb-2">
                        Asistencia sin cobro (empleado / cortesía{showPastorAttendanceOption ? ' / pastor' : ''})
                      </p>
                      <div className={attendanceSpecialGridClass}>
                        {buildAttendanceSpecialFormOptions(showPastorAttendanceOption).map(({ id, label, Icon }) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() =>
                              setEditRegistryModal({
                                ...editRegistryModal,
                                data: {
                                  ...editRegistryModal.data,
                                  attendanceSpecialType: id,
                                  isScholarship: 'No',
                                  scholarshipType: 'total',
                                  scholarshipPartialAmount: '',
                                  editApplyCampaignId: isFreeAttendanceType(id) ? '__none__' : editRegistryModal.data.editApplyCampaignId,
                                },
                              })
                            }
                            className={attendanceSpecialChoiceButtonClass(normalizeAttendanceSpecial(editRegistryModal.data), id)}
                          >
                            {Icon ? <Icon size={14} /> : null}
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
    
                  {sectionTitle('Pago y costos', 'emerald')}
                  <div className="p-6 bg-emerald-50/35 dark:bg-transparent rounded-2xl border border-emerald-100 dark:border-2 dark:border-emerald-500 shadow-sm dark:shadow-none">
                    <h4 className="text-[10px] font-black text-emerald-800/90 dark:text-emerald-100 uppercase tracking-[0.2em] border-b border-emerald-200/80 dark:border-emerald-500/60 pb-2 mb-4 flex items-center justify-between">
                      <span>Costo fijado (total a cobrar)</span>
                      {!hasAdminRights && <span className="flex items-center gap-1 text-amber-500 normal-case tracking-normal text-[9px]"><Lock size={10} /> Solo Administrador</span>}
                    </h4>
                    {hasAdminRights && (currentEvent?.discountCampaigns || []).length > 0 && editRegistryModal.data && (() => {
                      const ed = editRegistryModal.data;
                      const manualOpts = getManualApplyCampaignOptions(currentEvent, ed);
                      const currentId = String(ed.discountCampaignId || '');
                      let opts = [...manualOpts];
                      if (currentId && !opts.some((c) => String(c.id) === currentId)) {
                        const fc = findDiscountCampaignById(currentEvent, currentId);
                        if (fc && isValidDiscountCampaignRow(fc)) opts = [fc, ...opts];
                        else if (String(ed.discountCampaignConcept || '').trim()) {
                          opts = [{ id: currentId, concept: ed.discountCampaignConcept, finalAmount: Number(ed.registeredCost) || 0, enabled: true }, ...opts];
                        }
                      }
                      if (opts.length === 0 && !currentId) return null;
                      return (
                        <div className="mb-3 max-w-md">
                          <label className={labelClasses}>Campaña de descuento</label>
                          <select
                            className={inputClasses}
                            value={ed.editApplyCampaignId || (currentId || '__none__')}
                            onChange={(e) => {
                              const v = e.target.value;
                              const next = { ...ed, editApplyCampaignId: v, registeredCostManual: false };
                              if (v && v !== '__none__') {
                                const c = findDiscountCampaignById(currentEvent, v);
                                if (c) next.registeredCost = String(Math.max(0, Number(c.finalAmount) || 0));
                              } else {
                                next.registeredCost = String(getPersonCost(ed, currentPricing, currentEvent));
                              }
                              setEditRegistryModal({ ...editRegistryModal, data: next });
                            }}
                          >
                            <option value="__none__">Sin campaña</option>
                            {opts.map((c) => (
                              <option key={String(c.id)} value={String(c.id)}>
                                {String(c.concept || 'Campaña').trim() || 'Campaña'}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })()}
                    {hasAdminRights && !isPastorParticipant(editRegistryModal.data, currentEvent?.eventType) ? (
                      <div className="max-w-xs flex items-stretch rounded-xl border border-slate-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-green-500">
                        <span className="px-2 py-1.5 bg-slate-50 border-r border-slate-200 text-slate-500 font-black text-[11px] flex items-center justify-center">$</span>
                        <input type="number" className="w-full px-2.5 py-1.5 bg-white outline-none text-slate-800 font-bold text-[11px]"
                          value={editRegistryModal.data.registeredCost !== undefined ? editRegistryModal.data.registeredCost : resolveRegisteredCost(editRegistryModal.data, currentPricing)}
                          onChange={e => setEditRegistryModal({ ...editRegistryModal, data: { ...editRegistryModal.data, registeredCost: e.target.value, registeredCostManual: true } })}
                        />
                      </div>
                    ) : (
                      <div className="max-w-xs flex items-stretch rounded-xl border border-slate-200 bg-slate-100 overflow-hidden">
                        <span className="px-2 py-1.5 bg-slate-100 border-r border-slate-200 text-slate-400 font-black text-[11px] flex items-center justify-center">$</span>
                        <div className="w-full px-2.5 py-1.5 text-slate-500 font-bold text-[11px] cursor-not-allowed select-none flex items-center justify-between">
                          <span>{parseFloat(editRegistryModal.data.registeredCost || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <Lock size={14} className="text-slate-300" />
                        </div>
                      </div>
                    )}
                    {isPastorParticipant(editRegistryModal.data, currentEvent?.eventType) ? (
                      <p className="text-[9px] text-slate-500 mt-1.5 max-w-md leading-snug">
                        Pastor: sin cobro en registro. El costo real se define en la sección Pastores.
                      </p>
                    ) : null}
                    {hasAdminRights && editRegistryModal.data.registeredCostManual && !isPastorParticipant(editRegistryModal.data, currentEvent?.eventType) ? (
                      <p className="text-[9px] text-slate-500 mt-1.5 max-w-md leading-snug">
                        Precio fijado manualmente.
                      </p>
                    ) : null}
                  </div>

                  <PrivacyConsentBlock
                    variant="manual"
                    privacyNotice={mergedPrivacyNotice}
                    privacyAccepted={!!(editRegistryModal.data.privacyNoticeAcceptedAt || '').trim() || editPrivacyAck}
                    onPrivacyAcceptedChange={(v) => {
                      if (!(editRegistryModal.data.privacyNoticeAcceptedAt || '').trim()) setEditPrivacyAck(v);
                    }}
                    sensitiveDataConsent={editRegistryModal.data.sensitiveDataConsent ?? ''}
                    onSensitiveDataConsentChange={(v) =>
                      setEditRegistryModal({
                        ...editRegistryModal,
                        data: { ...editRegistryModal.data, sensitiveDataConsent: v },
                      })
                    }
                    compact={compact}
                  />
                  {(editRegistryModal.data.privacyNoticeAcceptedAt || editRegistryModal.data.sensitiveDataConsentAt) ? (
                    <p className="text-[10px] text-slate-500">
                      {editRegistryModal.data.privacyNoticeAcceptedAt
                        ? `Aviso aceptado: ${String(editRegistryModal.data.privacyNoticeAcceptedAt).slice(0, 10)} (v${editRegistryModal.data.privacyNoticeVersion || '—'}). `
                        : ''}
                      Perfil permanente: <strong>{editRegistryModal.data.sensitiveDataConsent || 'sin respuesta'}</strong>
                      {editRegistryModal.data.sensitiveDataPurgedAt
                        ? ` · Purga: ${String(editRegistryModal.data.sensitiveDataPurgedAt).slice(0, 10)}`
                        : ''}
                    </p>
                  ) : null}
    
                  <div className={`flex gap-4 pt-4 border-t border-slate-100 ${compact ? '!gap-2 !pt-2' : ''}`}>
                    <button type="button" onClick={onCancel} className={`flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all uppercase ${compact ? 'py-2.5 text-[11px] rounded-xl' : 'py-4 text-sm'}`}>Cancelar</button>
                    <button type="submit" className={`flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-xl shadow-indigo-200 flex justify-center items-center gap-2 uppercase ${compact ? 'py-2.5 text-[11px] rounded-xl [&_svg]:!h-4 [&_svg]:!w-4' : 'py-4 text-sm'}`}><CheckCircle2 size={compact ? 16 : 20} /> Guardar Cambios</button>
                  </div>
      </>
    );
    if (compact) {
      return (
        <div
          className="text-[10px] leading-tight [&_input]:!py-1.5 [&_input]:!px-2 [&_input]:!text-[11px] [&_select]:!py-1.5 [&_select]:!px-2 [&_select]:!text-[11px] [&_textarea]:!py-1.5 [&_textarea]:!text-[11px] [&_.grid]:!gap-2 [&_.flex]:!gap-1.5 [&_.gap-4]:!gap-1.5 [&_.gap-3]:!gap-1.5 [&_.p-6]:!p-2.5 [&_.p-4]:!p-2 [&_.py-3]:!py-1.5 [&_.py-4]:!py-2 [&_.rounded-2xl]:!rounded-lg [&_.space-y-4]:!space-y-1.5 [&_.space-y-3]:!space-y-1.5 [&_.space-y-2]:!space-y-1 [&_label]:!mb-0.5 [&_.mb-4]:!mb-2 [&_.mb-3]:!mb-1 [&_.mt-3]:!mt-1 [&_.pb-2]:!pb-0.5 [&_.text-sm]:!text-[11px] [&_button]:!py-1.5 [&_button]:!text-[10px] [&_button]:!rounded-lg [&_.max-w-xs]:max-w-[12rem] [&_ul]:space-y-0 [&_.flex-wrap]:!gap-1.5"
        >
          {formBody}
        </div>
      );
    }
    return formBody;
}
