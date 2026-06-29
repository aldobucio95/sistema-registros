import React, { useMemo } from 'react';
import SedeAutocompleteInput from './components/SedeAutocompleteInput.jsx';
import AllergyFormFields from './components/AllergyFormFields.jsx';
import DiseaseFormFields from './components/DiseaseFormFields.jsx';
import DisabilityFormFields from './components/DisabilityFormFields.jsx';
import { collectLocationFieldSuggestions } from './locationFieldSuggestions.js';
import { locationPrefsKey } from './userListFiltersPrefs.js';
import {
  GraduationCap,
  Users,
  Church,
  Briefcase,
  Gift,
  ChevronDown,
  ChevronUp,
  Search,
  Database,
  AlertTriangle,
} from 'lucide-react';
import {
  personLikeIsPersonOfInterest,
  PERSON_OF_INTEREST_REGISTRATION_MESSAGE_PUBLIC,
} from './vnpPersonFlags.js';
import {
  ATTENDANCE_SPECIAL,
  attendanceSpecialChoiceButtonClass,
  generateVnpPersonId,
  isSiValue,
  getPricingFromSnapshotForDate,
  buildAmbosServeInSegmentOptionLabels,
  getBautizosListPriceBreakdown,
} from './publicRegistrationLogic.js';
import {
  DEFAULT_ALLERGY_OPTIONS,
  DEFAULT_SERVE_AREA_OPTIONS,
  SI_LABEL,
  formatPreferredServeArea,
  parsePreferredServeArea,
} from './registrationFormShared.js';
import PublicBirthDateField from './PublicBirthDateField.jsx';
import GenderSelectButtons from './components/GenderSelectButtons.jsx';
import SiNoFieldToggle from './components/SiNoFieldToggle.jsx';
import PrivacyConsentBlock from './components/PrivacyConsentBlock.jsx';
import PaymentMethodSegmentToggle, { PAYMENT_TARJETA } from './components/PaymentMethodSegmentToggle.jsx';
import { registrationRequiresResponsivaStatus, responsivaStatusValidationLabel } from './responsivaSignLogic.js';
import {
  BautizosAttendanceTypeField,
  BautizosCompanionsField,
} from './BautizosEventFormBlocks.jsx';
import { BautizosCarDataSection } from './BautizosCarDataSection.jsx';
import { familyHasAnyCarTransport, collectCarColorSuggestions } from './bautizosCarMeta.js';
import { BAUTIZOS_UNDER_3_POLICY_NOTE, isBautizosUnder3YearsAtEvent, normalizeArrivalCarCount } from './bautizosParty.js';
import {
  BAUTIZOS_ATTENDANCE,
  bautizosWillBeBaptizedFromAttendance,
  bautizosShowsServerParticipation,
  normalizeBautizosAttendanceType,
  syncBautizosAttendanceServerFields,
} from './bautizosParty.js';
import { uiBanner, uiFormChoiceBtn, uiSectionHeading, uiSectionPanel } from './ui/uiFormatClasses.js';
import {
  formFieldStack,
  formFieldPairGrid,
  formFieldPairLabel,
  formFieldPairLabelRow,
  formFieldPairLabelHint,
  formFieldPairControl,
} from './formFieldClasses.js';

const formatSiNo = (v) => (isSiValue(v) ? SI_LABEL : 'No');
const fieldStack = formFieldStack;

/** Misma estructura de secciones que «Nuevo Registro» en App.jsx (renderLocationSheet). */
export default function PublicRegistrationFormSections({
  inputClasses,
  labelClasses,
  btnPrimary,
  form,
  setField,
  setForm,
  eventSnapshot,
  optionalVisibility,
  isCampa,
  isGeneral,
  isBautizos,
  isDesayunoEvent,
  customFields,
  selectableCampaigns,
  showTravelFrom,
  showTravelTo,
  onPhoneChange,
  onBirthChange,
  vnpLookupMatches = [],
  vnpLookupLoading = false,
  personOfInterestVnpSet = null,
  onApplyVnpProfile,
  allergyOptionsList,
  serveAreaOptionsList,
  servedAreasMenuOpen,
  setServedAreasMenuOpen,
  preferredServeMenuOpen,
  setPreferredServeMenuOpen,
  submitting,
  GENDERS,
  BLOOD_TYPES,
  RESPONSIVA_STATUSES,
  PAYMENT_METHODS,
  /** Si solo hay «Efectivo», no mostrar Tarjeta (evento/sede). */
  paymentMethodOptions = PAYMENT_METHODS,
  SI,
  /** Teléfono acompañantes bautizados (misma función que el principal). */
  formatCompanionPhone = (v) => String(v ?? ''),
  /** Clases para borde rojo en requisitos de perfil de acompañante bautizado. */
  companionRequiredFieldClass = null,
  /** Participantes del evento (para autocompletar por sede). */
  rosterParticipants = [],
  privacyNotice = null,
  privacyAccepted = false,
  onPrivacyAcceptedChange,
  sensitiveDataConsent = '',
  onSensitiveDataConsentChange,
}) {
  const locations = eventSnapshot?.locations || [];
  const loc = form.location || locations[0] || '';
  const sensAllowed = isSiValue(sensitiveDataConsent);
  const locFieldSuggestions = useMemo(
    () => collectLocationFieldSuggestions(rosterParticipants, eventSnapshot?.id, loc),
    [rosterParticipants, eventSnapshot?.id, loc]
  );
  const pubSugList = (field) => `pub-sug-${locationPrefsKey(loc).replace(/%/g, '')}-${field}`;

  const ambosListPricing = useMemo(
    () => (eventSnapshot && isCampa ? getPricingFromSnapshotForDate(eventSnapshot, Date.now()) : null),
    [eventSnapshot, isCampa]
  );
  const ambosServeOptionLabels = useMemo(
    () => buildAmbosServeInSegmentOptionLabels({}, ambosListPricing),
    [ambosListPricing]
  );
  const bautizosPriceHelp = useMemo(
    () => (isBautizos && eventSnapshot ? getBautizosListPriceBreakdown(eventSnapshot) : null),
    [eventSnapshot, isBautizos]
  );
  const fmtBautizosMx = (n) =>
    `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  const sectionShell = uiSectionPanel('slate');
  const sectionH = uiSectionHeading('slate');

  const emergencyRequired = isCampa || isBautizos || isGeneral;

  const showResponsivaField =
    isCampa && registrationRequiresResponsivaStatus(form, eventSnapshot || {});

  /**
   * Sección 4 (Campa): no mostrar título vacío si en el enlace se desactivaron beca, servidor, bautizo,
   * asistencia empleado/cortesía, asignación campista y (extra servidor sin columna servidor) a la vez.
   */
  const vis = optionalVisibility;
  const showCampaTipoAsistenciaSection =
    isCampa &&
    (vis.scholarship !== false ||
      vis.serverRole !== false ||
      vis.willBeBaptized !== false ||
      vis.attendanceSpecial !== false ||
      vis.campAssignment !== false ||
      (vis.serverProfileExtra !== false && vis.serverRole !== false));

  /** Numeración 1…N según el orden real de secciones renderizadas (VNPM sin número). */
  let pubSectionSeq = 0;
  const pubSectionLabel = (title) => {
    pubSectionSeq += 1;
    return `${pubSectionSeq}. ${title}`;
  };

  return (
    <>
      <p className="text-sm text-slate-800 font-bold mb-4 leading-relaxed">
        Lee el formulario con atención. El asterisco <span className="text-rose-600">*</span> en rojo en el título de cada sección
        indica que los datos de esa sección son obligatorios, salvo el bloque de <strong>ID VNPM</strong> (si se muestra, es
        opcional). Las secciones activas en el enlace del evento deben quedar completas.
      </p>

      {optionalVisibility.vnpPersonId !== false && (
        <section className={sectionShell}>
          <h4 className={sectionH}>
            <span className="inline-flex items-center gap-2">
              <Database size={14} className="text-indigo-500 shrink-0" /> ID VNPM{' '}
              <span className="text-slate-400 font-normal normal-case text-[10px]">(opcional)</span>
            </span>
          </h4>
          <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
            Si ya tienes ID VNPM, escríbelo completo (Ej. VNPM-RABH960213H). Buscamos en eventos activos y en archivo; si hay coincidencias puedes
            precargar los datos que pide este formulario (lo que ya escribiste no se sobrescribe).
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            <input
              type="text"
              className={`${inputClasses} pl-10 font-mono`}
              value={form.vnpPersonId}
              onChange={(e) => setField('vnpPersonId', e.target.value)}
              placeholder="VNPM-..."
              autoCapitalize="characters"
            />
          </div>
          {vnpLookupLoading ? (
            <p className="text-[11px] text-slate-500 font-semibold mt-2">Buscando en la base de datos…</p>
          ) : null}
          {vnpLookupMatches.length > 0 ? (
            <ul className="mt-3 divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white max-h-52 overflow-y-auto shadow-sm">
              {vnpLookupMatches.map((p) => {
                const evLabel =
                  p.eventId === eventSnapshot?.id
                    ? (eventSnapshot?.name || 'Este evento')
                    : `Otro evento · ${String(p.eventId).slice(0, 12)}…`;
                const archived = (p?.status || 'active') === 'archived';
                const isPersonOfInterest = personLikeIsPersonOfInterest(p, personOfInterestVnpSet, {
                  generateVnpPersonId,
                });
                return (
                  <li key={`${p.eventId}-${p.id}`} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800 truncate">{p.name || '—'}</p>
                      <p className="text-slate-500">
                        {p.phone || '—'} · {evLabel}
                        {archived ? ' · Archivado' : ''}
                      </p>
                      {isPersonOfInterest ? (
                        <p className="text-[10px] font-bold text-rose-700 mt-0.5">
                          {PERSON_OF_INTEREST_REGISTRATION_MESSAGE_PUBLIC}
                        </p>
                      ) : null}
                      {p.vnpPersonId ? <p className="text-[10px] font-mono text-indigo-600 mt-0.5">{p.vnpPersonId}</p> : null}
                    </div>
                    <button
                      type="button"
                      disabled={isPersonOfInterest}
                      title={isPersonOfInterest ? PERSON_OF_INTEREST_REGISTRATION_MESSAGE_PUBLIC : undefined}
                      onClick={() => onApplyVnpProfile?.(p)}
                      className={`shrink-0 py-2 px-3 rounded-lg font-bold border transition-colors min-h-[44px] touch-manipulation ${
                        isPersonOfInterest
                          ? 'text-slate-400 bg-slate-50 border-slate-100 cursor-not-allowed'
                          : 'text-indigo-700 bg-indigo-50 border-indigo-100 hover:bg-indigo-100 dark:bg-indigo-600 dark:text-white dark:border-indigo-700 dark:hover:bg-indigo-700'
                      }`}
                    >
                      Usar datos
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>
      )}

      <section className={sectionShell}>
        <h4 className={sectionH}>
          {pubSectionLabel('Datos generales')} <span className="text-rose-600">*</span>
        </h4>
        <div className="grid grid-cols-1 gap-3">
          <div className={fieldStack}>
            <label className={labelClasses}>Sede de registro</label>
            <select
              required
              value={form.location}
              onChange={(e) => setField('location', e.target.value)}
              className={inputClasses}
            >
              <option value="">— Elige sede —</option>
              {locations.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className={fieldStack}>
            <label className={labelClasses}>Nombre completo</label>
            <input
              type="text"
              required
              name="name"
              autoComplete="name"
              placeholder="Ej. Juan Pérez López"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              className={inputClasses}
            />
            <p className="text-[10px] text-slate-500 px-1">Debe incluir 1 nombre y 2 apellidos.</p>
            <p className="text-[10px] font-mono text-indigo-600 px-1">
              ID VNPM:{' '}
              {form.name?.trim() && (form.birthDate || '').trim() && String(form.gender || '').trim()
                ? generateVnpPersonId(form)
                : 'completa nombre, fecha de nacimiento y género'}
            </p>
          </div>
          <div className={fieldStack}>
            <label className={labelClasses}>Teléfono personal</label>
            <SedeAutocompleteInput
              type="tel"
              required
              name="phone"
              inputMode="tel"
              listId={pubSugList('phone')}
              suggestions={locFieldSuggestions.phones}
              placeholder="55-1234-5678"
              value={form.phone}
              onChange={(e) => onPhoneChange(e.target.value)}
              className={inputClasses}
            />
            <label className="flex items-start gap-2.5 cursor-pointer px-1 pt-1">
              <input
                type="checkbox"
                className="mt-1 size-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                checked={!!form.allowSharedMainPhone}
                onChange={(e) => setField('allowSharedMainPhone', e.target.checked)}
              />
              <span className="text-xs text-slate-600 leading-snug">
                Es el mismo teléfono que otro inscrito (p. ej. menor con el contacto del adulto principal)
              </span>
            </label>
          </div>
          <GenderSelectButtons
            label="Género"
            labelClasses={labelClasses}
            size="public"
            required
            missing={!String(form.gender || '').trim()}
            value={form.gender || ''}
            onChange={(gender) => setField('gender', gender)}
          />
          <PublicBirthDateField
            label="Fecha de nacimiento"
            labelClasses={labelClasses}
            required
            value={form.birthDate}
            onChange={onBirthChange}
            inputClasses={inputClasses}
            hintAfter={
              <>
                <p className="text-[10px] text-slate-500 font-semibold px-1">Edad calculada: {form.age || '—'}</p>
                {isBautizos && isBautizosUnder3YearsAtEvent(form, eventSnapshot) ? (
                  <p className="text-[10px] font-semibold text-amber-800 px-1 mt-1 leading-snug">{BAUTIZOS_UNDER_3_POLICY_NOTE}</p>
                ) : null}
              </>
            }
          />
          {isCampa && showResponsivaField ? (
            <div className={fieldStack}>
              <label className={labelClasses}>{responsivaStatusValidationLabel(eventSnapshot)}</label>
              <select
                required
                value={form.responsivaStatus}
                onChange={(e) => setField('responsivaStatus', e.target.value)}
                className={inputClasses}
              >
                <option value="">Seleccionar</option>
                {RESPONSIVA_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {optionalVisibility.alias !== false && (
            <div className={fieldStack}>
              <label className={labelClasses}>Alias</label>
              <input type="text" placeholder="Ej. Juanito" value={form.alias} onChange={(e) => setField('alias', e.target.value)} className={inputClasses} />
            </div>
          )}
          {isGeneral && optionalVisibility.customFields !== false && customFields.length > 0 && (
            <div className="grid grid-cols-1 gap-3 pt-3 mt-1 border-t border-slate-200">
              {customFields.map((field) => (
                <div className={fieldStack} key={field}>
                  <label className={`${labelClasses} truncate`} title={field}>
                    {field}
                  </label>
                  <input
                    className={inputClasses}
                    value={form.customData?.[field] ?? ''}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        customData: { ...prev.customData, [field]: e.target.value },
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {(isCampa || isGeneral || isBautizos) && (
        <section className={sectionShell}>
          <h4 className={sectionH}>
            {pubSectionLabel('Contacto de emergencia')} <span className="text-rose-600">*</span>
          </h4>
          <div className="grid grid-cols-1 gap-3">
            <div className={fieldStack}>
              <label className={labelClasses}>Nombre del contacto</label>
              <SedeAutocompleteInput
                type="text"
                placeholder="Nombre contacto"
                required={emergencyRequired}
                listId={pubSugList('emergencyContact')}
                suggestions={locFieldSuggestions.emergencyContacts}
                value={form.emergencyContact}
                onChange={(e) => setField('emergencyContact', e.target.value)}
                className={inputClasses}
              />
            </div>
            <div className={fieldStack}>
              <label className={labelClasses}>Teléfono de emergencia</label>
              <SedeAutocompleteInput
                type="tel"
                inputMode="tel"
                placeholder="55-1234-5678"
                required={emergencyRequired}
                listId={pubSugList('emergencyPhone')}
                suggestions={locFieldSuggestions.emergencyPhones}
                value={form.emergencyPhone}
                onChange={(e) => setField('emergencyPhone', formatPhoneInline(e.target.value))}
                className={inputClasses}
              />
            </div>
            <div className={fieldStack}>
              <label className={labelClasses}>Parentesco</label>
              <SedeAutocompleteInput
                type="text"
                placeholder="Ej. Madre, padre, tutor"
                required={emergencyRequired}
                listId={pubSugList('emergencyRelationship')}
                suggestions={locFieldSuggestions.relationships}
                value={form.emergencyRelationship}
                onChange={(e) => setField('emergencyRelationship', e.target.value)}
                className={inputClasses}
              />
            </div>
          </div>
        </section>
      )}

      {(isCampa || isBautizos) &&
        sensAllowed &&
        (optionalVisibility.bloodType !== false ||
          optionalVisibility.canSwim !== false ||
          optionalVisibility.allergies !== false ||
          optionalVisibility.diseases !== false ||
          optionalVisibility.disability !== false) && (
        <section className={sectionShell}>
          <h4 className={sectionH}>
            {pubSectionLabel('Datos médicos')} <span className="text-rose-600">*</span>
          </h4>
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {optionalVisibility.bloodType !== false && (
                <div className={fieldStack}>
                  <label className={labelClasses}>Tipo de sangre</label>
                  <select className={inputClasses} value={form.bloodType} onChange={(e) => setField('bloodType', e.target.value)}>
                    {BLOOD_TYPES.map((bt) => (
                      <option key={bt} value={bt}>
                        {bt}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {optionalVisibility.canSwim !== false && (
                <div className={fieldStack}>
                  <label className={labelClasses}>¿Sabe nadar?</label>
                  <SiNoFieldToggle
                    variant="swim"
                    size="public"
                    value={form.canSwim}
                    onChange={(canSwim) => setField('canSwim', canSwim)}
                  />
                </div>
              )}
            </div>
            {optionalVisibility.allergies !== false && (
              <div className={fieldStack}>
                  <label className={labelClasses}>Alergias</label>
                  <AllergyFormFields
                    variant="public"
                    hasAllergy={form.hasAllergy}
                    allergyDetails={form.allergyDetails}
                    allergyCategory={form.allergyCategory}
                    allergyOptions={allergyOptionsList.length ? allergyOptionsList : DEFAULT_ALLERGY_OPTIONS}
                    onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
                  />
                </div>
            )}
            {optionalVisibility.diseases !== false && (
                <div className={fieldStack}>
                  <label className={labelClasses}>Enfermedades</label>
                  <DiseaseFormFields
                    variant="public"
                    hasDisease={form.hasDisease}
                    diseaseDetails={form.diseaseDetails}
                    diseaseMedication={form.diseaseMedication}
                    onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
                  />
                </div>
            )}
            {optionalVisibility.disability !== false && (
                <div className={fieldStack}>
                  <label className={labelClasses}>Discapacidades</label>
                  <DisabilityFormFields
                    variant="public"
                    hasDisability={form.hasDisability}
                    disabilityDetails={form.disabilityDetails}
                    onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
                  />
                </div>
            )}
          </div>
        </section>
        )}

      {isBautizos && (
        <>
          {optionalVisibility.bautizosAttendanceType !== false && (
            <section className={sectionShell}>
              <h4 className={sectionH}>
                {pubSectionLabel('Tipo de asistencia')} <span className="text-rose-600">*</span>
              </h4>
              <BautizosAttendanceTypeField
                value={form.bautizosAttendanceType}
                onChange={(v) => {
                  const t = normalizeBautizosAttendanceType(v);
                  setForm((prev) =>
                    syncBautizosAttendanceServerFields({
                      ...prev,
                      bautizosAttendanceType: v,
                      willBeBaptized: bautizosWillBeBaptizedFromAttendance(t),
                    })
                  );
                }}
                disabled={submitting}
                labelClasses={labelClasses}
                variant="public"
              />
              {optionalVisibility.serverProfileExtra !== false &&
                isSiValue(form.isServer) &&
                bautizosShowsServerParticipation(form) && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-900 dark:text-amber-200 mb-1">
                    {pubSectionLabel('Información adicional de servidor')} <span className="font-normal normal-case text-slate-500">(opcional)</span>
                  </p>
                  <p className="text-[10px] text-slate-500 mb-3 leading-snug">
                    El tipo servidor o empleado se elige arriba; aquí solo datos de pareja, hijos y áreas de servicio.
                  </p>
                  <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-lg dark:bg-amber-950 dark:border-amber-700">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className={fieldStack}>
                        <label className={labelClasses}>¿Es casado y va con su esposo(a)?</label>
                        <select
                          className={inputClasses}
                          value={form.isMarried || 'No'}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              isMarried: e.target.value,
                              spouseName: isSiValue(e.target.value) ? prev.spouseName : '',
                            }))
                          }
                        >
                          <option value="No">No</option>
                          <option value={SI}>{SI_LABEL}</option>
                        </select>
                      </div>
                      {isSiValue(form.isMarried) && (
                        <div className={fieldStack}>
                          <label className={labelClasses}>Nombre de pareja</label>
                          <input className={inputClasses} value={form.spouseName || ''} onChange={(e) => setField('spouseName', e.target.value)} />
                        </div>
                      )}
                      <div className={fieldStack}>
                        <label className={labelClasses}>¿Va con hijos?</label>
                        <select
                          className={inputClasses}
                          value={form.goesWithChildren || 'No'}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              goesWithChildren: e.target.value,
                              childrenCount: isSiValue(e.target.value) ? prev.childrenCount : '',
                            }))
                          }
                        >
                          <option value="No">No</option>
                          <option value={SI}>{SI_LABEL}</option>
                        </select>
                      </div>
                      {isSiValue(form.goesWithChildren) && (
                        <div className={fieldStack}>
                          <label className={labelClasses}>¿Cuántos?</label>
                          <input
                            type="number"
                            min="1"
                            className={inputClasses}
                            placeholder="Número"
                            value={form.childrenCount || ''}
                            onChange={(e) => setField('childrenCount', e.target.value)}
                          />
                        </div>
                      )}
                      <div className={fieldStack}>
                        <label className={labelClasses}>¿Sirven en sus congresos?</label>
                        <select
                          className={inputClasses}
                          value={form.servesInCongress || 'No'}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              servesInCongress: e.target.value,
                              congressServeArea: isSiValue(e.target.value) ? prev.congressServeArea : '',
                            }))
                          }
                        >
                          <option value="No">No</option>
                          <option value={SI}>{SI_LABEL}</option>
                        </select>
                      </div>
                      {isSiValue(form.servesInCongress) && (
                        <div className={fieldStack}>
                          <label className={labelClasses}>¿En qué área?</label>
                          <input className={inputClasses} value={form.congressServeArea || ''} onChange={(e) => setField('congressServeArea', e.target.value)} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}
          {optionalVisibility.bautizosFood !== false && (
          <section className={sectionShell}>
            <h4 className={sectionH}>
              {pubSectionLabel('Comida')} <span className="text-rose-600">*</span>
            </h4>
            {bautizosPriceHelp ? (
              <p className="text-[10px] text-slate-500 mb-3">
                Comida {fmtBautizosMx(bautizosPriceHelp.food)} (incluida) · transporte del evento {fmtBautizosMx(bautizosPriceHelp.transport)} · comida +
                transporte {fmtBautizosMx(bautizosPriceHelp.both)}. Si marcas llegar y regresar en carro, el transporte no se cobra.{' '}
                {BAUTIZOS_UNDER_3_POLICY_NOTE}
              </p>
            ) : null}
            <div className={fieldStack}>
              <label className={labelClasses}>Comida incluida</label>
              <button
                type="button"
                disabled
                className={`${uiFormChoiceBtn.public} bg-amber-500 text-white border-amber-400 opacity-95 cursor-default`}
              >
                {SI_LABEL}
              </button>
              <p className="text-[10px] text-slate-500 px-1">Forma parte del costo del evento; no se puede desactivar.</p>
            </div>
          </section>
          )}
          {optionalVisibility.bautizosTransport !== false && (
          <section className={sectionShell}>
            <h4 className={sectionH}>
              {pubSectionLabel('Transporte')} <span className="text-rose-600">*</span>
            </h4>
            <p className="text-[10px] text-slate-500 mb-3">
              Debes elegir transporte del evento o llegada en carro (opciones excluyentes). Si llegas en tu carro, el costo de transporte es $0.
            </p>
            <div className="space-y-3">
              <div className={fieldStack}>
                <label className={labelClasses}>¿Desea transporte?</label>
                <button
                  type="button"
                  onClick={() => {
                    const next = isSiValue(form.wantsBautizosTransport) ? 'No' : SI;
                    setForm((prev) => ({
                      ...prev,
                      wantsBautizosTransport: next,
                      llegaEnCarro: isSiValue(next) ? false : true,
                      ...(isSiValue(next)
                        ? { travelFrom: prev.travelFrom || loc, travelTo: prev.travelTo || loc }
                        : {}),
                    }));
                  }}
                  className={`${uiFormChoiceBtn.public} ${
                      isSiValue(form.wantsBautizosTransport) ? 'bg-indigo-500 text-white border-indigo-400' : uiFormChoiceBtn.idlePublic
                    }`}
                >
                  {formatSiNo(form.wantsBautizosTransport)}
                </button>
              </div>
              <div className="space-y-3">
                  <div className={fieldStack}>
                    <label className={labelClasses}>Llegada</label>
                    <div className="flex flex-wrap gap-3">
                      <label className={`${uiFormChoiceBtn.public} cursor-pointer bg-white text-slate-600 border-slate-200 justify-start`}>
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-indigo-600 rounded"
                          checked={!!form.llegaEnCarro}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setForm((prev) => ({
                              ...prev,
                              llegaEnCarro: checked,
                              wantsBautizosTransport: checked ? 'No' : SI,
                              ...(checked
                                ? {}
                                : {
                                    travelFrom: prev.travelFrom || loc,
                                    travelTo: prev.travelTo || loc,
                                  }),
                            }));
                          }}
                        />
                        Llega en carro
                      </label>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Si llega en carro, el costo de transporte es $0. Esta opción no se puede combinar con transporte organizado.
                    </p>
                  </div>
                  {!form.llegaEnCarro && isSiValue(form.wantsBautizosTransport) && (showTravelFrom || showTravelTo) && (
                    <div className="grid grid-cols-1 gap-3">
                      {showTravelFrom && (
                        <div className={fieldStack}>
                          <label className={labelClasses}>Sale de sede</label>
                          <select
                            className={inputClasses}
                            value={form.travelFrom || loc}
                            onChange={(e) => setField('travelFrom', e.target.value)}
                          >
                            {locations.map((s) => (
                              <option key={`pub-bz-${s}`} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      {showTravelTo && (
                        <div className={fieldStack}>
                          <label className={labelClasses}>Regresa a sede</label>
                          <select
                            className={inputClasses}
                            value={form.travelTo || loc}
                            onChange={(e) => setField('travelTo', e.target.value)}
                          >
                            {locations.map((s) => (
                              <option key={`pub-bz2-${s}`} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>
            </div>
          </section>
          )}
          {optionalVisibility.bautizosCompanions !== false && (
            <BautizosCompanionsField
              registrantAge={form.age}
              eventLike={eventSnapshot}
              companions={form.bautizosCompanions || []}
              fieldSuggestions={locFieldSuggestions}
              birthDateVariant="public"
              onChange={(next) => setForm((prev) => ({ ...prev, bautizosCompanions: next }))}
              locations={locations}
              loc={loc}
              optionalVisibility={{ ...optionalVisibility, hideCarCountInTransport: true }}
              inputClasses={inputClasses}
              labelClasses={labelClasses}
              sectionClass={sectionShell}
              sectionH={sectionH}
              sectionTitle={`${pubSectionLabel('Acompañantes / familia')}`}
              sectionRequiredMark
              companionProfileVisibility={{
                bloodType: optionalVisibility.bloodType !== false,
                allergies: optionalVisibility.allergies !== false,
                diseases: optionalVisibility.diseases !== false,
                disability: optionalVisibility.disability !== false,
              }}
              getRequiredFieldClass={companionRequiredFieldClass || undefined}
              formatCompanionPhone={formatCompanionPhone}
              allergyCategoryOptions={allergyOptionsList}
              companionGenders={GENDERS}
              companionBloodTypes={BLOOD_TYPES}
              formatSiNo={formatSiNo}
              disabled={submitting}
            />
          )}
          {familyHasAnyCarTransport(form, form.bautizosCompanions || []) ? (
            <BautizosCarDataSection
              hostPerson={form}
              companions={form.bautizosCompanions || []}
              plan={eventSnapshot?.transportPlanning}
              hostSourceKey="p:draft-host"
              draftMetaByVehicleKey={form.draftCarMetaByVehicleKey || {}}
              onDraftMetaChange={(vehicleKey, patch) =>
                setForm((prev) => ({
                  ...prev,
                  draftCarMetaByVehicleKey: {
                    ...(prev.draftCarMetaByVehicleKey || {}),
                    [vehicleKey]: { ...(prev.draftCarMetaByVehicleKey?.[vehicleKey] || {}), ...patch },
                  },
                }))
              }
              canEdit={!submitting}
              sectionTitle={pubSectionLabel('Datos de carros')}
              colorSuggestions={collectCarColorSuggestions(eventSnapshot?.transportPlanning)}
              labelClasses={labelClasses}
              onHostCarCountChange={(count) => setField('carrosLlegada', normalizeArrivalCarCount(count))}
              onCompanionCarCountChange={(companionIndex, count) => {
                setForm((prev) => {
                  const comps = [...(prev.bautizosCompanions || [])];
                  if (comps[companionIndex]) {
                    comps[companionIndex] = {
                      ...comps[companionIndex],
                      carrosLlegada: normalizeArrivalCarCount(count),
                    };
                  }
                  return { ...prev, bautizosCompanions: comps };
                });
              }}
              onDraftMetaPrune={(keys) => {
                setForm((prev) => {
                  const draft = { ...(prev.draftCarMetaByVehicleKey || {}) };
                  for (const k of keys) delete draft[k];
                  return { ...prev, draftCarMetaByVehicleKey: draft };
                });
              }}
            />
          ) : null}
        </>
      )}

      {showCampaTipoAsistenciaSection && (
        <section className={sectionShell}>
          <h4 className={sectionH}>
            {pubSectionLabel('Tipo de asistencia')} <span className="text-rose-600">*</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {optionalVisibility.scholarship !== false && (
              <div className="space-y-2 min-w-0">
                <div className={fieldStack}>
                  <label className={labelClasses}>Becado</label>
                  <button
                    type="button"
                    onClick={() => {
                      const next = isSiValue(form.isScholarship) ? 'No' : SI;
                      setForm((prev) => ({
                        ...prev,
                        isScholarship: next,
                        scholarshipType: 'total',
                        scholarshipPartialAmount: '',
                        attendanceSpecialType: isSiValue(next) ? ATTENDANCE_SPECIAL.ninguno : prev.attendanceSpecialType,
                      }));
                    }}
                    className={`${uiFormChoiceBtn.public} ${
                      isSiValue(form.isScholarship) ? 'bg-purple-500 text-white border-purple-400' : uiFormChoiceBtn.idlePublic
                    }`}
                  >
                    <GraduationCap size={14} /> {formatSiNo(form.isScholarship)}
                  </button>
                </div>
                {isSiValue(form.isScholarship) && (
                  <>
                    <div className={fieldStack}>
                      <label className={labelClasses}>Tipo de beca</label>
                      <select
                        className={inputClasses}
                        value={form.scholarshipType === 'partial' ? 'partial' : 'total'}
                        onChange={(e) => {
                          const v = e.target.value;
                          setForm((prev) => ({
                            ...prev,
                            scholarshipType: v === 'partial' ? 'partial' : 'total',
                            scholarshipPartialAmount: v === 'total' ? '' : prev.scholarshipPartialAmount,
                          }));
                        }}
                      >
                        <option value="total">Beca total</option>
                        <option value="partial">Beca parcial</option>
                      </select>
                    </div>
                    {form.scholarshipType === 'partial' && (
                      <div className={fieldStack}>
                        <label className={labelClasses}>Monto becado</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className={inputClasses}
                          value={form.scholarshipPartialAmount}
                          onChange={(e) => setField('scholarshipPartialAmount', e.target.value)}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {optionalVisibility.serverRole !== false && (
              <div className="space-y-2 min-w-0">
                <div className={fieldStack}>
                  <label className={labelClasses}>Servidor</label>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        isServer: isSiValue(prev.isServer) ? 'No' : SI,
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
                      }))
                    }
                    className={`${uiFormChoiceBtn.public} ${
                      isSiValue(form.isServer) ? 'bg-amber-500 text-white border-amber-400' : uiFormChoiceBtn.idlePublic
                    }`}
                  >
                    <Users size={14} /> {formatSiNo(form.isServer)}
                  </button>
                </div>
                {isSiValue(form.isServer) && (
                  <div className={fieldStack}>
                    <label className={labelClasses}>Asignación</label>
                    <select
                      required={isSiValue(form.isServer)}
                      className={inputClasses}
                      value={form.serverAssignment}
                      onChange={(e) => {
                        const v = e.target.value;
                        setForm((prev) => {
                          const prevAssign = String(prev.serverAssignment || '').trim();
                          return {
                            ...prev,
                            serverAssignment: v,
                            baptismSegment: v === 'Ambos' ? prev.baptismSegment : '',
                            ambosServeInSegment:
                              v === 'Ambos' ? (prevAssign === 'Ambos' ? prev.ambosServeInSegment : '') : '',
                          };
                        });
                      }}
                    >
                      <option value="">Seleccionar</option>
                      <option value="Teens">Teens</option>
                      <option value="Jóvenes">Jóvenes</option>
                      <option value="Ambos">Ambos</option>
                    </select>
                    <p className="text-[9px] text-slate-500 leading-snug">
                      Puedes asignar un servidor a <strong>Teens</strong> aunque sea mayor de edad (p. ej. liderazgo en ese segmento).
                    </p>
                    {form.serverAssignment === 'Ambos' && (
                      <div className="space-y-1 mt-2">
                        <label className={labelClasses}>¿En qué segmento sirves?</label>
                        <select
                          className={inputClasses}
                          value={form.ambosServeInSegment || ''}
                          onChange={(e) => setField('ambosServeInSegment', e.target.value)}
                        >
                          <option value="">{ambosServeOptionLabels.uniqueEdit}</option>
                          <option value="Teens">{ambosServeOptionLabels.teensEdit}</option>
                          <option value="Jóvenes">{ambosServeOptionLabels.jovenesEdit}</option>
                        </select>
                        <p className="text-[9px] text-slate-500 leading-snug">
                          Tarifa única de servidor Ambos. Si eliges un solo segmento, el precio a cobrar es el de servidor en ese segmento + costo campista en el otro segmento.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {optionalVisibility.willBeBaptized !== false && (
              <div className="space-y-2 min-w-0">
                <div className={fieldStack}>
                  <label className={labelClasses}>Bautizo</label>
                  <button
                    type="button"
                    onClick={() => {
                      const next = isSiValue(form.willBeBaptized) ? 'No' : SI;
                      setForm((prev) => ({
                        ...prev,
                        willBeBaptized: next,
                        baptismSegment: next === 'No' ? '' : prev.baptismSegment,
                      }));
                    }}
                    className={`${uiFormChoiceBtn.public} ${
                      isSiValue(form.willBeBaptized) ? 'bg-sky-600 text-white border-sky-500' : uiFormChoiceBtn.idlePublic
                    }`}
                  >
                    <Church size={14} /> {formatSiNo(form.willBeBaptized)}
                  </button>
                </div>
                {isSiValue(form.willBeBaptized) && !isSiValue(form.isServer) && (
                  <p className="text-[9px] text-slate-500 leading-snug">
                    Conteo en <strong>{parseInt(form.age, 10) < 18 ? 'Teens' : 'Jóvenes'}</strong> según edad al guardar (campista).
                  </p>
                )}
                {isSiValue(form.willBeBaptized) && isSiValue(form.isServer) && form.serverAssignment === 'Ambos' && (
                  <div className={fieldStack}>
                    <label className={labelClasses}>¿Dónde se bautiza?</label>
                    <select
                      required
                      className={inputClasses}
                      value={form.baptismSegment}
                      onChange={(e) => setField('baptismSegment', e.target.value)}
                    >
                      <option value="">Seleccionar</option>
                      <option value="Teens">Teens</option>
                      <option value="Jóvenes">Jóvenes</option>
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {!isSiValue(form.isScholarship) && optionalVisibility.attendanceSpecial !== false && (
            <div className="sm:col-span-3 space-y-2 mt-3">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Asistencia sin cobro (cuenta en registro)
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: ATTENDANCE_SPECIAL.ninguno, label: 'Ninguno', Icon: null },
                  { id: ATTENDANCE_SPECIAL.empleado, label: 'Empleado', Icon: Briefcase },
                  { id: ATTENDANCE_SPECIAL.cortesia, label: 'Cortesía', Icon: Gift },
                ].map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        attendanceSpecialType: id,
                        isScholarship: 'No',
                        scholarshipType: 'total',
                        scholarshipPartialAmount: '',
                        selectedDiscountCampaignId: '',
                      }))
                    }
                    className={attendanceSpecialChoiceButtonClass(form.attendanceSpecialType, id)}
                  >
                    {Icon ? <Icon size={14} /> : null}
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-slate-500 leading-snug">Costo a liquidar: $0. No aplica con beca; las campañas de descuento se omiten.</p>
            </div>
          )}

          {optionalVisibility.serverProfileExtra !== false && isSiValue(form.isServer) && !isBautizos && (
            <div className="mt-3 p-3 bg-amber-50/50 border border-amber-100 rounded-lg dark:bg-amber-950 dark:border-amber-700">
              <p className="text-[10px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-widest mb-2">
                Información adicional de servidor
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className={fieldStack}>
                  <label className={labelClasses}>¿Es casado y va con su esposo(a)?</label>
                  <select
                    className={inputClasses}
                    value={form.isMarried || 'No'}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        isMarried: e.target.value,
                        spouseName: isSiValue(e.target.value) ? prev.spouseName : '',
                      }))
                    }
                  >
                    <option value="No">No</option>
                    <option value={SI}>{SI_LABEL}</option>
                  </select>
                </div>
                {isSiValue(form.isMarried) && (
                  <div className={fieldStack}>
                    <label className={labelClasses}>Nombre de pareja</label>
                    <input className={inputClasses} value={form.spouseName || ''} onChange={(e) => setField('spouseName', e.target.value)} />
                  </div>
                )}
                <div className={fieldStack}>
                  <label className={labelClasses}>¿Va con hijos?</label>
                  <select
                    className={inputClasses}
                    value={form.goesWithChildren || 'No'}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        goesWithChildren: e.target.value,
                        childrenCount: isSiValue(e.target.value) ? prev.childrenCount : '',
                      }))
                    }
                  >
                    <option value="No">No</option>
                    <option value={SI}>{SI_LABEL}</option>
                  </select>
                </div>
                {isSiValue(form.goesWithChildren) && (
                  <div className={fieldStack}>
                    <label className={labelClasses}>¿Cuántos?</label>
                    <input
                      type="number"
                      min="1"
                      className={inputClasses}
                      placeholder="Número"
                      value={form.childrenCount || ''}
                      onChange={(e) => setField('childrenCount', e.target.value)}
                    />
                  </div>
                )}
                <div className={fieldStack}>
                  <label className={labelClasses}>¿Han servido en otro campa?</label>
                  <select
                    className={inputClasses}
                    value={form.servedOtherCampa || 'No'}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        servedOtherCampa: e.target.value,
                        servedAreas: isSiValue(e.target.value) ? prev.servedAreas : '',
                      }))
                    }
                  >
                    <option value="No">No</option>
                    <option value={SI}>{SI_LABEL}</option>
                  </select>
                </div>
                {isSiValue(form.servedOtherCampa) && (
                  <div className="space-y-1 sm:col-span-2">
                    <label className={labelClasses}>¿En qué áreas?</label>
                    <ServeAreaMultiSelect
                      inputClasses={inputClasses}
                      value={form.servedAreas}
                      onChange={(next) => setField('servedAreas', next)}
                      opts={serveAreaOptionsList.length ? serveAreaOptionsList : DEFAULT_SERVE_AREA_OPTIONS}
                      open={servedAreasMenuOpen}
                      setOpen={setServedAreasMenuOpen}
                    />
                  </div>
                )}
                <div className="space-y-1 sm:col-span-2">
                  <label className={labelClasses}>¿En qué área les gustaría servir?</label>
                  <ServeAreaMultiSelect
                    inputClasses={inputClasses}
                    value={form.preferredServeArea}
                    onChange={(next) => setField('preferredServeArea', next)}
                    opts={serveAreaOptionsList.length ? serveAreaOptionsList : DEFAULT_SERVE_AREA_OPTIONS}
                    open={preferredServeMenuOpen}
                    setOpen={setPreferredServeMenuOpen}
                  />
                </div>
                <div className={fieldStack}>
                  <label className={labelClasses}>¿Sirven en sus congresos?</label>
                  <select
                    className={inputClasses}
                    value={form.servesInCongress || 'No'}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        servesInCongress: e.target.value,
                        congressServeArea: isSiValue(e.target.value) ? prev.congressServeArea : '',
                      }))
                    }
                  >
                    <option value="No">No</option>
                    <option value={SI}>{SI_LABEL}</option>
                  </select>
                </div>
                {isSiValue(form.servesInCongress) && (
                  <div className={fieldStack}>
                    <label className={labelClasses}>¿En qué área?</label>
                    <input className={inputClasses} value={form.congressServeArea || ''} onChange={(e) => setField('congressServeArea', e.target.value)} />
                  </div>
                )}
              </div>
            </div>
          )}

          {!isSiValue(form.isServer) && optionalVisibility.campAssignment !== false && (
            <div className="space-y-1 mt-3">
              <label className={labelClasses}>Asignación de campista</label>
              <select
                className={inputClasses}
                value={form.campAssignment || 'Teens'}
                onChange={(e) => setField('campAssignment', e.target.value)}
              >
                <option value="Teens">Teens (campistas menores de 18)</option>
                <option value="Jóvenes">Jóvenes (campistas 18+)</option>
              </select>
              <p className="text-[9px] text-slate-500 leading-snug">
                Los <strong>servidores</strong> eligen Teens / Jóvenes / Ambos en «Asignación»; un adulto puede estar asignado a Teens.
              </p>
            </div>
          )}
        </section>
      )}

      {!isDesayunoEvent && !isBautizos && optionalVisibility.transportExtras !== false && (
        <section className={sectionShell}>
          <h4 className={sectionH}>
            {pubSectionLabel('Transporte')} <span className="text-rose-600">*</span>
          </h4>
          <div className="grid grid-cols-1 gap-3">
            {showTravelFrom && (
              <div className={fieldStack}>
                <label className={labelClasses}>Sale de sede</label>
                <select className={inputClasses} value={form.travelFrom || loc} onChange={(e) => setField('travelFrom', e.target.value)}>
                  {locations.map((s) => (
                    <option key={`from-${s}`} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {showTravelTo && (
              <div className={fieldStack}>
                <label className={labelClasses}>Regresa a sede</label>
                <select className={inputClasses} value={form.travelTo || loc} onChange={(e) => setField('travelTo', e.target.value)}>
                  {locations.map((s) => (
                    <option key={`to-${s}`} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className={fieldStack}>
              <label className={labelClasses}>Llega / regresa (checkboxes)</label>
              <div className="flex flex-wrap gap-3">
                <label className={`${uiFormChoiceBtn.public} cursor-pointer bg-white text-slate-600 border-slate-200 justify-start`}>
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-indigo-600 rounded"
                    checked={!!form.llegaEnCarro}
                    onChange={(e) => setField('llegaEnCarro', e.target.checked)}
                  />
                  Llega en carro
                </label>
                <label className={`${uiFormChoiceBtn.public} cursor-pointer bg-white text-slate-600 border-slate-200 justify-start`}>
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-indigo-600 rounded"
                    checked={!!form.regresaEnCarro}
                    onChange={(e) => setField('regresaEnCarro', e.target.checked)}
                  />
                  Regresa en carro
                </label>
              </div>
              <p className="text-[10px] text-slate-500">Si no marcas ninguno: llega en camión y regresa en camión.</p>
            </div>
          </div>
        </section>
      )}

      {optionalVisibility.paymentInfo !== false && (
      <section className={sectionShell}>
        <h4 className={sectionH}>
          {pubSectionLabel('Información de pago')} <span className="text-rose-600">*</span>
        </h4>
        <div className={formPaymentSectionBody}>
          {optionalVisibility.discountCampaign !== false && !isBautizos && selectableCampaigns.length > 0 && (
            <div className={fieldStack}>
              <label className={labelClasses}>
                Campaña de descuento <span className="text-slate-400 font-normal">(puedes dejar «Automática»)</span>
              </label>
              <select
                value={form.selectedDiscountCampaignId}
                onChange={(e) => setField('selectedDiscountCampaignId', e.target.value)}
                className={inputClasses}
              >
                <option value="">Automática (primera vigente que aplique)</option>
                {selectableCampaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.concept} — ${Number(c.finalAmount || 0).toLocaleString('es-MX')}
                  </option>
                ))}
              </select>
            </div>
          )}
          {isSiValue(form.isScholarship) && isCampa ? null : (
            <>
              {paymentMethodOptions.length < PAYMENT_METHODS.length ? (
                <p className={`${uiBanner('warning')} gap-1.5 items-center py-1.5`} role="status">
                  <AlertTriangle size={14} className="shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                  <span className="text-[10px] leading-snug">Tarjeta deshabilitada. Solo efectivo.</span>
                </p>
              ) : null}
              {optionalVisibility.initialDeposit === false ? (
                <div className={fieldStack}>
                  <label className={labelClasses}>Método de pago</label>
                  <PaymentMethodSegmentToggle
                    value={form.paymentMethod}
                    cardEnabled={paymentMethodOptions.length >= PAYMENT_METHODS.length}
                    onChange={(method) => {
                      setField('paymentMethod', method);
                      if (method !== PAYMENT_TARJETA) setField('cardReference', '');
                    }}
                  />
                </div>
              ) : (
                <div className={formPaymentPairGrid}>
                  <label className={formPaymentPairLabel}>
                    <span>Método de pago</span>
                  </label>
                  <label className={formPaymentPairLabelRow}>
                    <span>Abono inicial ($)</span>
                    <span className={formFieldPairLabelHint}>
                      Mín. ${Number(eventSnapshot?.minDeposit || 0).toLocaleString('es-MX')}
                    </span>
                  </label>
                  <PaymentMethodSegmentToggle
                    value={form.paymentMethod}
                    cardEnabled={paymentMethodOptions.length >= PAYMENT_METHODS.length}
                    onChange={(method) => {
                      setForm((prev) => ({
                        ...prev,
                        paymentMethod: method,
                        cardReference: method === PAYMENT_TARJETA ? prev.cardReference : '',
                      }));
                    }}
                  />
                  <div className={`${formFieldPairControl} relative`}>
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs leading-none">$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      required
                      enterKeyHint="done"
                      className={`${inputClasses} !pl-7 font-bold text-green-700`}
                      value={form.paid}
                      onChange={(e) => setField('paid', e.target.value)}
                    />
                  </div>
                </div>
              )}
              {optionalVisibility.initialDeposit === false ? (
                <p className="text-[10px] text-slate-500 font-semibold px-1">Abono inicial: se registrará $0 (configuración del enlace).</p>
              ) : null}
              {form.paymentMethod === PAYMENT_TARJETA && (
                <div className={fieldStack}>
                  <label className={labelClasses}>Referencia / últimos dígitos</label>
                  <input type="text" value={form.cardReference} onChange={(e) => setField('cardReference', e.target.value)} className={inputClasses} />
                </div>
              )}
            </>
          )}
        </div>
      </section>
      )}

      <PrivacyConsentBlock
        variant="public"
        privacyNotice={privacyNotice}
        privacyAccepted={privacyAccepted}
        onPrivacyAcceptedChange={onPrivacyAcceptedChange}
        sensitiveDataConsent={sensitiveDataConsent}
        onSensitiveDataConsentChange={onSensitiveDataConsentChange}
        disabled={submitting}
        compact
      />

      <button type="submit" className={btnPrimary} disabled={submitting}>
        {submitting ? 'Enviando…' : 'Enviar registro'}
      </button>
    </>
  );
}

function formatPhoneInline(value) {
  if (value.startsWith('+')) return value.replace(/[^+0-9\s-]/g, '');
  const digits = value.replace(/\D/g, '').substring(0, 10);
  let formatted = digits.substring(0, 2);
  if (digits.length > 2) formatted += '-' + digits.substring(2, 6);
  if (digits.length > 6) formatted += '-' + digits.substring(6, 10);
  return formatted;
}

function ServeAreaMultiSelect({ inputClasses, value, onChange, opts, open, setOpen }) {
  const { selected, otroText } = parsePreferredServeArea(value || '', opts);
  const toggle = (opt) => {
    const next = new Set(selected);
    if (next.has(opt)) next.delete(opt);
    else next.add(opt);
    const txt = opt === 'Otro' ? (next.has('Otro') ? otroText : '') : otroText;
    onChange(formatPreferredServeArea(next, txt));
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full ${inputClasses} text-left flex items-center justify-between`}
      >
        <span className="truncate text-sm">
          {selected.size ? [...selected].map((s) => (s === 'Otro' && otroText ? `Otro: ${otroText}` : s)).join(', ') : 'Seleccionar...'}
        </span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-lg p-2 max-h-56 overflow-auto">
            {opts.map((opt) => (
              <div key={opt}>
                <label className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-slate-50 cursor-pointer text-sm font-medium text-slate-700">
                  <input type="checkbox" className="h-4 w-4 accent-indigo-600 rounded" checked={selected.has(opt)} onChange={() => toggle(opt)} />
                  {opt}
                </label>
                {opt === 'Otro' && selected.has('Otro') && (
                  <input
                    type="text"
                    placeholder="¿Cuál?"
                    className="ml-6 mt-1 w-[calc(100%-1.5rem)] p-2 border border-slate-200 rounded text-sm"
                    value={otroText}
                    onChange={(e) => onChange(formatPreferredServeArea(selected, e.target.value))}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
