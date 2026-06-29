import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Church, Link2, Trash2, Users } from 'lucide-react';
import {
  BAUTIZOS_ATTENDANCE,
  BAUTIZOS_UNDER_3_POLICY_NOTE,
  bautizosServerToggleLocked,
  bautizosShowsServerParticipation,
  companionRowPhoneLooksValid,
  isBautizosUnder3YearsAtEvent,
  normalizeBautizosAttendanceType,
  syncBautizosAttendanceServerFields,
} from './bautizosParty.js';
import { isSiValue, canonicalizeVnpPersonId, generateVnpPersonId } from './publicRegistrationLogic.js';
import {
  DEFAULT_ALLERGY_OPTIONS,
  BLOOD_TYPE_UNSPECIFIED,
  BLOOD_TYPES_SELECT_OPTIONS,
} from './registrationFormShared.js';
import GenderSelectButtons from './components/GenderSelectButtons.jsx';
import SedeAutocompleteInput from './components/SedeAutocompleteInput.jsx';
import RegistryBirthDateField from './RegistryBirthDateField.jsx';
import PublicBirthDateField from './PublicBirthDateField.jsx';
import AllergyFormFields from './components/AllergyFormFields.jsx';
import DiseaseFormFields from './components/DiseaseFormFields.jsx';
import DisabilityFormFields from './components/DisabilityFormFields.jsx';
import SiNoFieldToggle from './components/SiNoFieldToggle.jsx';
import { formFieldStack } from './formFieldClasses.js';
import { uiBautizosAttendanceBtn, uiFormChoiceBtn } from './ui/uiFormatClasses.js';
import { locationPrefsKey } from './userListFiltersPrefs.js';
import { normalizeBirthDateToIso } from './birthDateIsoUtils.js';

const fieldStack = formFieldStack;

const SI = 'Si';

const attendanceLabels = {
  [BAUTIZOS_ATTENDANCE.bautizado]: 'Bautizado',
  [BAUTIZOS_ATTENDANCE.asistente]: 'Asistente',
  [BAUTIZOS_ATTENDANCE.servidor]: 'Servidor',
  [BAUTIZOS_ATTENDANCE.empleado]: 'Empleado',
  [BAUTIZOS_ATTENDANCE.cortesia]: 'Cortesía',
};

function attendanceBtnClass(selected, id, { variant = 'panel' } = {}) {
  const active = selected === id;
  const isPublic = variant === 'public';
  const base = isPublic ? uiBautizosAttendanceBtn.btnPublic : uiBautizosAttendanceBtn.btn;
  if (!active) return `${base} ${isPublic ? uiBautizosAttendanceBtn.idlePublic : uiBautizosAttendanceBtn.idle}`;
  if (id === BAUTIZOS_ATTENDANCE.bautizado) {
    return `${base} ${isPublic ? uiBautizosAttendanceBtn.activeBautizadoPublic : uiBautizosAttendanceBtn.activeBautizado}`;
  }
  if (id === BAUTIZOS_ATTENDANCE.asistente) return `${base} ${uiBautizosAttendanceBtn.activeAsistente}`;
  if (id === BAUTIZOS_ATTENDANCE.servidor) return `${base} ${uiBautizosAttendanceBtn.activeServidor}`;
  if (id === BAUTIZOS_ATTENDANCE.empleado) return `${base} ${uiBautizosAttendanceBtn.activeEmpleado}`;
  if (id === BAUTIZOS_ATTENDANCE.cortesia) return `${base} ${uiBautizosAttendanceBtn.activeCortesia}`;
  return `${base} border-slate-600 bg-slate-600 text-white dark:bg-slate-600 dark:border-slate-500`;
}

function BautizosCompanionLinkPicker({ value, options, disabled, onSelect, inputClasses, labelClasses }) {
  const [query, setQuery] = useState('');
  const selectedKey = String(value || '').trim();
  const selected = useMemo(
    () => (Array.isArray(options) ? options : []).find((o) => String(o.value || '') === selectedKey),
    [options, selectedKey]
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return (Array.isArray(options) ? options : [])
      .filter(
        (o) =>
          String(o.label || '')
            .toLowerCase()
            .includes(q) || String(o.value || '').toLowerCase().includes(q)
      )
      .slice(0, 25);
  }, [query, options]);

  return (
    <div className="space-y-1.5">
      <label className={labelClasses}>Vincular acompañante existente (sin cobro extra)</label>
      {selected ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-teal-200 bg-teal-50/60 dark:border-teal-600 dark:bg-teal-950/30 px-2 py-1.5">
          <span className="text-[10px] text-teal-900 dark:text-teal-100 font-semibold leading-snug min-w-0 flex-1">
            {selected.label}
          </span>
          <button
            type="button"
            disabled={disabled}
            className="text-[10px] font-bold text-rose-600 hover:underline shrink-0"
            onClick={() => {
              onSelect('');
              setQuery('');
            }}
          >
            Quitar vínculo
          </button>
        </div>
      ) : (
        <>
          <input
            type="search"
            className={inputClasses}
            disabled={disabled}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, parentesco o sede (mín. 2 caracteres)…"
            autoComplete="off"
          />
          {query.trim().length >= 2 ? (
            filtered.length > 0 ? (
              <ul className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.map((opt) => (
                  <li key={opt.value}>
                    <button
                      type="button"
                      disabled={disabled}
                      className="w-full text-left px-2 py-1.5 text-[10px] text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                      onClick={() => {
                        onSelect(opt.value);
                        setQuery('');
                      }}
                    >
                      {opt.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[10px] text-slate-500">Sin coincidencias.</p>
            )
          ) : (
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
              Escribe al menos 2 letras para buscar registros activos o acompañantes ya capturados.
            </p>
          )}
        </>
      )}
    </div>
  );
}

export function BautizosAttendanceTypeField({ value, onChange, disabled, labelClasses, variant = 'panel' }) {
  const cur = normalizeBautizosAttendanceType(value);
  return (
    <div className="space-y-2">
      {labelClasses ? <label className={labelClasses}>Tipo de asistencia</label> : null}
      <div className="flex flex-wrap gap-2">
        {Object.values(BAUTIZOS_ATTENDANCE).map((id) => (
          <button
            key={id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(id)}
            className={attendanceBtnClass(cur, id, { variant })}
          >
            {attendanceLabels[id]}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Toggle «Servidor» para Bautizos (empleado puede desmarcar; tipo servidor siempre Sí). */
export function BautizosServerParticipationFields({
  entry,
  onEntryChange,
  disabled,
  labelClasses,
  formatSiNo,
  choiceBtnClass,
}) {
  if (!bautizosShowsServerParticipation(entry)) return null;
  const locked = bautizosServerToggleLocked(entry);
  const attendance = normalizeBautizosAttendanceType(entry?.bautizosAttendanceType);
  return (
    <div className="space-y-2">
      <label className={labelClasses}>Servidor en el evento</label>
      <button
        type="button"
        disabled={disabled || locked}
        onClick={() => {
          if (locked) return;
          const next = isSiValue(entry?.isServer) ? 'No' : SI;
          onEntryChange(syncBautizosAttendanceServerFields({ ...entry, isServer: next }));
        }}
        className={choiceBtnClass(isSiValue(entry?.isServer))}
      >
        <Users size={14} /> {formatSiNo(entry?.isServer)}
      </button>
      {attendance === BAUTIZOS_ATTENDANCE.empleado ? (
        <p className="text-[10px] text-slate-500 leading-snug">
          Los empleados se registran como servidor por defecto; puede desmarcar si no participa como servidor.
        </p>
      ) : (
        <p className="text-[10px] text-slate-500 leading-snug">Tipo servidor: participa como servidor en el evento.</p>
      )}
    </div>
  );
}

function newCompanionRow(loc) {
  const l = String(loc || '').trim();
  return {
    id: `bc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: '',
    relationship: '',
    willBeBaptized: 'No',
    phone: '',
    vnpPersonId: '',
    gender: '',
    /** Opcional si no se bautiza; con edad menor de 3 años al día del evento aplica exención de comida y transporte. */
    birthDate: '',
    bloodType: BLOOD_TYPE_UNSPECIFIED,
    emergencyContact: '',
    emergencyPhone: '',
    emergencyRelationship: '',
    hasAllergy: 'No',
    allergyCategory: '',
    allergyDetails: '',
    hasDisease: 'No',
    diseaseDetails: '',
    diseaseMedication: '',
    hasDisability: 'No',
    disabilityDetails: '',
    wantsBautizosTransport: 'No',
    llegaEnCarro: true,
    regresaEnCarro: false,
    carrosLlegada: 1,
    travelFrom: l,
    travelTo: l,
  };
}

function baptizedCompanionExtraFieldsClears() {
  return {
    phone: '',
    vnpPersonId: '',
    gender: '',
    birthDate: '',
    bloodType: BLOOD_TYPE_UNSPECIFIED,
    emergencyContact: '',
    emergencyPhone: '',
    emergencyRelationship: '',
    hasAllergy: 'No',
    allergyCategory: '',
    allergyDetails: '',
    hasDisease: 'No',
    diseaseDetails: '',
    diseaseMedication: '',
    hasDisability: 'No',
    disabilityDetails: '',
  };
}

function companionFullNameOkForHighlight(nameRaw) {
  const parts = String(nameRaw || '')
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean);
  return parts.length >= 3;
}

function normalizeArrivalCarCountInput(raw) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

/** @param {object} props
 *  @param {'indigo' | 'teal'} [props.uiAccent] — `teal` resalta bloques de acompañante frente al formulario del inscrito.
 */
export function BautizosCompanionsField({
  registrantAge,
  companions,
  onChange,
  locations,
  loc,
  optionalVisibility,
  inputClasses,
  labelClasses,
  sectionShell,
  sectionClass,
  sectionH,
  sectionTitle,
  /** Asterisco rojo de obligatoriedad en el título (registro público: una sola vez por sección). */
  sectionRequiredMark = false,
  formatSiNo,
  disabled,
  /** Oculta título e intro (p. ej. si el contenedor padre ya los muestra). */
  hideSectionHeader = false,
  /** Clases extra en cada tarjeta de acompañante. */
  companionRowClassName = '',
  uiAccent = 'indigo',
  /** Opciones para vincular acompañante ya capturado en otro registro (sin cobro duplicado). */
  existingCompanionOptions = [],
  /**
   * Visibilidad de bloque «perfil completo» para filas marcadas como bautizadas
   * (tipo de sangre / alergias / enfermedad / discapacidad).
   */
  companionProfileVisibility = null,
  /** Borde/highlight en campos requeridos (misma firma que en App.jsx). */
  getRequiredFieldClass = null,
  /** Formato teléfono (opcional); si no se envía, no reformateamos mientras escriben. */
  formatCompanionPhone = null,
  /** Opciones género (mismo orden que formulario principal). */
  companionGenders = ['Hombre', 'Mujer'],
  /** Opciones tipo de sangre (por defecto las del registro principal). */
  companionBloodTypes = BLOOD_TYPES_SELECT_OPTIONS,
  /** Lista de categorías de alergias (fallback `DEFAULT_ALLERGY_OPTIONS`). */
  allergyCategoryOptions,
  /** Sugerencias de autocompletado de la sede (contacto / teléfonos / parentesco). */
  fieldSuggestions = null,
  /** Panel: mismo modo día/mes/año o calendario que el titular (`currentUser.id`). */
  registryBirthDateUserId = null,
  /** Registro público: siempre desplegables día/mes/año (como el titular en público). */
  birthDateVariant = 'registry',
  /** Documento del evento (fecha de inicio para política de menores de 3 años). */
  eventLike = null,
}) {
  if (optionalVisibility?.bautizosCompanions === false) return null;

  const shellClass = sectionShell ?? sectionClass;
  const list = Array.isArray(companions) ? companions : [];
  const listRef = useRef(list);
  listRef.current = list;
  const showTrans = optionalVisibility?.bautizosTransport !== false;
  const showFrom = optionalVisibility?.travelFrom !== false;
  const showTo = optionalVisibility?.travelTo !== false;
  const hideCarCountInTransport = optionalVisibility?.hideCarCountInTransport === true;
  const isTeal = uiAccent === 'teal';
  const transportOn = isTeal
    ? 'bg-teal-600 text-white border-teal-500'
    : 'bg-indigo-500 text-white border-indigo-400';
  const transportOff = isTeal
    ? 'bg-slate-100 text-slate-500 border-slate-200'
    : 'bg-slate-100 text-slate-500 border-slate-200';
  const chipAccent = isTeal ? 'accent-teal-600' : 'accent-indigo-600';
  const listSp = 'space-y-3';
  const rowPad = isTeal ? 'p-2.5 space-y-2' : 'p-3 space-y-3';
  const nameGridGap = isTeal ? 'gap-2' : 'gap-3';
  const transBlockSp = isTeal ? 'space-y-1' : 'space-y-3';
  const travelGridGap = isTeal ? 'gap-2' : 'gap-3';
  const transportBtnIndigo = uiFormChoiceBtn.public;
  const transportBtnTeal = uiFormChoiceBtn.panel;
  const addBtnSolid = isTeal
    ? 'bg-teal-600 hover:bg-teal-700 text-white border border-teal-600 shadow-sm'
    : 'bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-600 shadow-sm';

  const ageNum = parseInt(registrantAge, 10);
  const isMinor = Number.isFinite(ageNum) && ageNum > 0 && ageNum < 18;
  const isAdult = Number.isFinite(ageNum) && ageNum >= 18;
  const existingByValue = useMemo(
    () => new Map((Array.isArray(existingCompanionOptions) ? existingCompanionOptions : []).map((opt) => [String(opt.value || ''), opt])),
    [existingCompanionOptions]
  );
  const allergyOpts = allergyCategoryOptions?.length ? allergyCategoryOptions : DEFAULT_ALLERGY_OPTIONS;
  const sug = fieldSuggestions || {
    phones: [],
    emergencyContacts: [],
    emergencyPhones: [],
    relationships: [],
  };
  const cmpSugList = (field) => `cmp-sug-${locationPrefsKey(loc).replace(/%/g, '')}-${field}`;
  const outlineReq =
    typeof getRequiredFieldClass === 'function'
      ? getRequiredFieldClass
      : (missing) =>
          missing ? 'border-2 border-red-500 ring-2 ring-red-200 dark:border-red-500 dark:ring-red-900/70' : '';
  const fmtPhone = typeof formatCompanionPhone === 'function' ? formatCompanionPhone : (s) => s;
  const usePublicBirthDate = birthDateVariant === 'public' || !registryBirthDateUserId;

  const renderCompanionBirthDate = (rowIndex, row, { label, required, hintAfter }) => {
    const onIso = (birthDate) => patchRow(rowIndex, { birthDate: normalizeBirthDateToIso(birthDate) || birthDate });
    if (usePublicBirthDate) {
      return (
        <PublicBirthDateField
          label={label}
          labelClasses={labelClasses}
          required={required}
          value={row.birthDate || ''}
          onChange={onIso}
          inputClasses={inputClasses}
          hintAfter={hintAfter}
        />
      );
    }
    return (
      <RegistryBirthDateField
        userId={registryBirthDateUserId}
        hideModeToggle
        label={label}
        labelClasses={labelClasses}
        required={required}
        value={row.birthDate || ''}
        onIsoChange={onIso}
        inputClasses={`${inputClasses} ${outlineReq(required && !(row.birthDate || '').trim())}`}
        footer={hintAfter}
      />
    );
  };

  const showBuddyBlood = companionProfileVisibility?.bloodType !== false;
  const showBuddyAllergies = companionProfileVisibility?.allergies !== false;
  const showBuddyDiseases = companionProfileVisibility?.diseases !== false;
  const showBuddyDisability = companionProfileVisibility?.disability !== false;

  useEffect(() => {
    if (disabled || !isMinor) return;
    if (list.length > 0) return;
    onChange([newCompanionRow(loc)]);
  }, [disabled, isMinor, list.length, loc, onChange]);

  const patchRow = (i, patch) => {
    onChange(listRef.current.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  };

  const toggleTransport = (i, row) => {
    const next = isSiValue(row.wantsBautizosTransport) ? 'No' : SI;
    const baseLoc = String(loc || '').trim();
    patchRow(i, {
      wantsBautizosTransport: next,
      llegaEnCarro: isSiValue(next) ? false : true,
      ...(isSiValue(next)
        ? {
            travelFrom: row.travelFrom || baseLoc,
            travelTo: row.travelTo || baseLoc,
          }
        : {}),
    });
  };

  const setEventTransport = (i, row, checked) => {
    const baseLoc = String(loc || '').trim();
    if (checked) {
      patchRow(i, {
        wantsBautizosTransport: SI,
        llegaEnCarro: false,
        travelFrom: row.travelFrom || baseLoc,
        travelTo: row.travelTo || baseLoc,
      });
      return;
    }
    patchRow(i, {
      wantsBautizosTransport: 'No',
      llegaEnCarro: true,
    });
  };

  const setLlegaEnCarro = (i, row, checked) => {
    const baseLoc = String(loc || '').trim();
    if (checked) {
      patchRow(i, {
        llegaEnCarro: true,
        wantsBautizosTransport: 'No',
      });
      return;
    }
    patchRow(i, {
      llegaEnCarro: false,
      wantsBautizosTransport: SI,
      travelFrom: row.travelFrom || baseLoc,
      travelTo: row.travelTo || baseLoc,
    });
  };

  const applyLinkedCompanionForRow = (i, row, sourceValue) => {
    const sourceKey = String(sourceValue || '').trim();
    if (!sourceKey) {
      patchRow(i, {
        linkedNoExtraCharge: false,
        linkedCompanionSourceKey: '',
        linkedCompanionName: '',
        linkedCompanionRelationship: '',
        linkedRegistrantName: '',
        linkedRegistrantId: '',
        linkedCompanionId: '',
        linkedSourceType: '',
      });
      return;
    }
    const opt = existingByValue.get(sourceKey);
    if (!opt) return;
    const linked = opt.companion || {};
    patchRow(i, {
      name: String(linked.name || '').trim() || String(row?.name || '').trim(),
      relationship: String(linked.relationship || '').trim() || String(row?.relationship || '').trim(),
      linkedNoExtraCharge: true,
      linkedCompanionSourceKey: sourceKey,
      linkedCompanionName: String(linked.name || '').trim(),
      linkedCompanionRelationship: String(linked.relationship || '').trim(),
      linkedRegistrantName: String(opt.registrantName || '').trim(),
      linkedRegistrantId: String(opt.registrantId || '').trim(),
      linkedCompanionId: String(opt.companionId || '').trim(),
      linkedSourceType: String(opt.sourceType || '').trim(),
    });
  };

  return (
    <section className={shellClass}>
      {hideSectionHeader ? null : (
        <>
          {sectionTitle ? (
            <h4 className={sectionH}>
              {sectionTitle}
              {sectionRequiredMark ? (
                <>
                  {' '}
                  <span className="text-rose-600">*</span>
                </>
              ) : null}
            </h4>
          ) : null}
          <p className="text-[10px] text-slate-500 mb-3 leading-snug">
            Por defecto el registrado va solo. Puedes agregar familiares u otros acompañantes; cada uno paga comida y puede elegir
            transporte por separado, salvo menores de 3 años al día del evento (sin cobro de comida ni transporte). Indica la fecha de
            nacimiento cuando aplique.
          </p>
        </>
      )}
      <div className={listSp}>
        {isMinor ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5">
            <p className="text-[11px] text-amber-900 font-semibold leading-snug inline-flex items-start gap-1.5">
              <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-700" />
              El bautizado es menor de edad: debe conservar al menos un acompañante adulto (Padre, Madre, Tutor, Mamá o Papá).
            </p>
          </div>
        ) : null}
        {list.map((row, i) => {
          const baptizedBuddy = isSiValue(row?.willBeBaptized);
          const busHidden =
            showTrans && isSiValue(row.wantsBautizosTransport) && !!row.llegaEnCarro;
          const rowLinkedNoExtraCharge = !!row?.linkedNoExtraCharge || !!String(row?.linkedCompanionSourceKey || '').trim();
          const rowLinkedHint =
            String(row?.linkedCompanionName || '').trim() ||
            String(row?.name || '').trim() ||
            'Acompañante vinculado';
          return (
            <div
              key={row.id || `row-${i}`}
              className={`rounded-xl border bg-white/80 dark:bg-slate-900/40 ${rowPad} ${
                isTeal
                  ? 'border border-teal-200/80 dark:border-teal-600/50 shadow-sm'
                  : 'border border-slate-200'
              } ${companionRowClassName}`.trim()}
            >
              <div className="flex justify-between items-start gap-2">
                <span
                  className={
                    isTeal
                      ? 'text-[10px] font-black text-teal-700 dark:text-teal-300 uppercase tracking-widest'
                      : 'text-[10px] font-black text-slate-400 uppercase tracking-widest'
                  }
                >
                  Acompañante {i + 1}
                </span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => {
                      if (isMinor && list.length <= 1) return;
                      onChange(list.filter((_, j) => j !== i));
                    }}
                    className="p-1.5 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50/90 dark:hover:bg-rose-950/30 transition-colors"
                    title={isMinor && list.length <= 1 ? 'Menor de edad: debe conservar al menos un acompañante' : 'Quitar acompañante'}
                    aria-label={`Quitar acompañante ${i + 1}`}
                    disabled={isMinor && list.length <= 1}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              {rowLinkedNoExtraCharge ? (
                <p className="text-[10px] font-semibold text-teal-800 dark:text-teal-200 bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-700 rounded-lg px-2 py-1 inline-flex items-center gap-1">
                  <Link2 size={11} className="shrink-0" />
                  Vinculado: {rowLinkedHint}
                  <span className="font-black">· sin cobro extra</span>
                </p>
              ) : null}
              <div className={`grid grid-cols-1 sm:grid-cols-2 ${nameGridGap}`}>
                <div className={fieldStack}>
                  <label className={labelClasses}>Nombre completo</label>
                  <input
                    type="text"
                    className={`${inputClasses} ${outlineReq(
                      baptizedBuddy ? !companionFullNameOkForHighlight(row.name) : String(row?.name || '').trim().length < 2
                    )}`}
                    value={row.name || ''}
                    disabled={disabled}
                    required
                    minLength={2}
                    placeholder="Nombre y apellidos"
                    onChange={(e) => patchRow(i, { name: e.target.value })}
                  />
                </div>
                <div className={fieldStack}>
                  <label className={labelClasses}>Parentesco</label>
                  <SedeAutocompleteInput
                    type="text"
                    listId={`${cmpSugList('relationship')}-${i}`}
                    suggestions={sug.relationships}
                    className={`${inputClasses} ${outlineReq(String(row?.relationship || '').trim().length < 2)}`}
                    value={row.relationship || ''}
                    disabled={disabled}
                    required
                    minLength={2}
                    placeholder="Ej. Padre, Madre, Tutor, Cónyuge…"
                    onChange={(e) => patchRow(i, { relationship: e.target.value })}
                  />
                </div>
              </div>
              {!baptizedBuddy ? (
                <div className={`${fieldStack} w-full`}>
                  {renderCompanionBirthDate(i, row, {
                    label: 'Fecha de nacimiento (opcional)',
                    required: false,
                    hintAfter: (
                      <>
                        <p className="text-[10px] text-slate-500 leading-snug">{BAUTIZOS_UNDER_3_POLICY_NOTE}</p>
                        {eventLike && isBautizosUnder3YearsAtEvent(row, eventLike) ? (
                          <p className="text-[10px] font-semibold text-amber-800 dark:text-amber-200 mt-1">
                            Aplica a esta persona: sin cobro de comida ni transporte.
                          </p>
                        ) : null}
                      </>
                    ),
                  })}
                </div>
              ) : null}
              <div className={fieldStack}>
                <label className={labelClasses}>¿Este acompañante se va a bautizar?</label>
                <SiNoFieldToggle
                  variant="baptize"
                  disabled={disabled}
                  value={row?.willBeBaptized || 'No'}
                  onChange={(willBeBaptized) => {
                    if (isSiValue(willBeBaptized)) {
                      patchRow(i, { willBeBaptized, birthDate: row.birthDate || '' });
                    } else {
                      patchRow(i, { willBeBaptized, ...baptizedCompanionExtraFieldsClears() });
                    }
                  }}
                  aria-label="¿Este acompañante se va a bautizar?"
                />
              </div>
              {baptizedBuddy ? (
                <div className="rounded-xl border border-sky-200/90 dark:border-sky-700/70 bg-sky-50/50 dark:bg-sky-950/25 p-2.5 space-y-3">
                  <p className="text-[10px] font-bold text-sky-900 dark:text-sky-100 leading-snug">
                    Esta persona también se bautiza: completa sus datos como un inscrito (contacto, salud…).
                  </p>
                  {companionFullNameOkForHighlight(row?.name) && (row?.birthDate || '').trim() && (row?.gender || '').trim() ? (
                    <p className="text-[10px] font-mono font-semibold text-sky-950 dark:text-sky-100 bg-white/70 dark:bg-sky-900/30 border border-sky-200/80 dark:border-sky-700 px-2 py-1 rounded-lg">
                      ID VNPM: {canonicalizeVnpPersonId(row?.vnpPersonId || '') || generateVnpPersonId(row)}
                    </p>
                  ) : null}
                  <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 ${nameGridGap}`}>
                    <div className={fieldStack}>
                      <label className={labelClasses}>Teléfono personal</label>
                      <SedeAutocompleteInput
                        type="text"
                        listId={`${cmpSugList('phone')}-${i}`}
                        suggestions={sug.phones}
                        className={`${inputClasses} ${outlineReq(!companionRowPhoneLooksValid(row?.phone || ''))}`}
                        value={row.phone || ''}
                        disabled={disabled}
                        onChange={(e) =>
                          patchRow(i, {
                            phone: fmtPhone(e.target.value),
                          })
                        }
                      />
                    </div>
                    <GenderSelectButtons
                      label="Género"
                      labelClasses={labelClasses}
                      required
                      missing={!(row?.gender || '').trim()}
                      disabled={disabled}
                      value={row.gender || ''}
                      onChange={(gender) => patchRow(i, { gender })}
                    />
                    <div className={`${fieldStack} w-full`}>
                      {renderCompanionBirthDate(i, row, {
                        label: 'Fecha de nacimiento *',
                        required: true,
                        hintAfter:
                          eventLike && isBautizosUnder3YearsAtEvent(row, eventLike) ? (
                            <p className="text-[10px] font-semibold text-amber-800 dark:text-amber-200 mt-1">
                              Aplica: {BAUTIZOS_UNDER_3_POLICY_NOTE}
                            </p>
                          ) : (
                            <p className="text-[10px] text-slate-500 leading-snug mt-1">{BAUTIZOS_UNDER_3_POLICY_NOTE}</p>
                          ),
                      })}
                    </div>
                    {showBuddyBlood ? (
                      <div className={fieldStack}>
                        <label className={labelClasses}>Tipo de sangre</label>
                        <select
                          className={`${inputClasses} ${outlineReq(!String(row?.bloodType ?? '').trim())}`}
                          value={row.bloodType || ''}
                          disabled={disabled}
                          onChange={(e) => patchRow(i, { bloodType: e.target.value })}
                        >
                          {(companionBloodTypes || BLOOD_TYPES_SELECT_OPTIONS).map((bt) => (
                            <option key={`cmp-bt-${i}-${bt}`} value={bt}>
                              {bt}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="hidden xl:block" aria-hidden />
                    )}
                  </div>
                  <div className={`grid grid-cols-1 sm:grid-cols-3 ${travelGridGap}`}>
                    <div className={`${fieldStack} sm:col-span-1`}>
                      <label className={labelClasses}>Contacto emergencia</label>
                      <SedeAutocompleteInput
                        type="text"
                        listId={`${cmpSugList('emergencyContact')}-${i}`}
                        suggestions={sug.emergencyContacts}
                        className={`${inputClasses} ${outlineReq(!(row?.emergencyContact || '').trim())}`}
                        value={row.emergencyContact || ''}
                        disabled={disabled}
                        onChange={(e) => patchRow(i, { emergencyContact: e.target.value })}
                      />
                    </div>
              <div className={fieldStack}>
                <label className={labelClasses}>Tel. emergencia</label>
                      <SedeAutocompleteInput
                        type="text"
                        listId={`${cmpSugList('emergencyPhone')}-${i}`}
                        suggestions={sug.emergencyPhones}
                        className={`${inputClasses} ${outlineReq(!companionRowPhoneLooksValid(row?.emergencyPhone || ''))}`}
                        value={row.emergencyPhone || ''}
                        disabled={disabled}
                        onChange={(e) =>
                          patchRow(i, {
                            emergencyPhone: fmtPhone(e.target.value),
                          })
                        }
                      />
                    </div>
              <div className={fieldStack}>
                <label className={labelClasses}>Parentesco emergencia</label>
                      <SedeAutocompleteInput
                        type="text"
                        listId={`${cmpSugList('emergencyRelationship')}-${i}`}
                        suggestions={sug.relationships}
                        className={`${inputClasses} ${outlineReq(!(row?.emergencyRelationship || '').trim())}`}
                        value={row.emergencyRelationship || ''}
                        disabled={disabled}
                        onChange={(e) => patchRow(i, { emergencyRelationship: e.target.value })}
                      />
                    </div>
                  </div>
                  {(showBuddyAllergies || showBuddyDiseases || showBuddyDisability) ? (
                    <div className="space-y-2">
                      <p className={labelClasses}>Información médica del acompañante</p>
                      {showBuddyAllergies ? (
                        <div className={fieldStack}>
                          <span className={labelClasses}>Alergias</span>
                          <AllergyFormFields
                            variant="panel"
                            disabled={disabled}
                            hasAllergy={row.hasAllergy || 'No'}
                            allergyDetails={row.allergyDetails || ''}
                            allergyCategory={row.allergyCategory || ''}
                            allergyOptions={allergyOpts}
                            detailsMissing={
                              !(row?.allergyDetails || '').trim() && !(row?.allergyCategory || '').trim()
                            }
                            detailsClassName={outlineReq(
                              !(row?.allergyDetails || '').trim() && !(row?.allergyCategory || '').trim()
                            )}
                            onChange={(patch) => patchRow(i, patch)}
                          />
                        </div>
                      ) : null}
                      {showBuddyDiseases ? (
                        <div className={fieldStack}>
                          <span className={labelClasses}>Enfermedades</span>
                          <DiseaseFormFields
                            disabled={disabled}
                            hasDisease={row.hasDisease || 'No'}
                            diseaseDetails={row.diseaseDetails || ''}
                            diseaseMedication={row.diseaseMedication || ''}
                            detailsClassName={outlineReq(!(row?.diseaseDetails || '').trim())}
                            onChange={(patch) => patchRow(i, patch)}
                          />
                        </div>
                      ) : null}
                      {showBuddyDisability ? (
                        <div className={fieldStack}>
                          <span className={labelClasses}>Discapacidades</span>
                          <DisabilityFormFields
                            disabled={disabled}
                            hasDisability={row.hasDisability || 'No'}
                            disabilityDetails={row.disabilityDetails || ''}
                            detailsClassName={outlineReq(!(row?.disabilityDetails || '').trim())}
                            onChange={(patch) => patchRow(i, patch)}
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {existingCompanionOptions.length > 0 ? (
                <BautizosCompanionLinkPicker
                  value={String(row?.linkedCompanionSourceKey || '')}
                  options={existingCompanionOptions}
                  disabled={disabled}
                  onSelect={(v) => applyLinkedCompanionForRow(i, row, v)}
                  inputClasses={inputClasses}
                  labelClasses={labelClasses}
                />
              ) : null}
              {showTrans && (
                isTeal ? (
                <div className={transBlockSp}>
                  <label className={labelClasses}>Transporte</label>
                  <div className={transBlockSp}>
                      <div className="flex flex-wrap gap-3">
                        <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className={`h-4 w-4 rounded ${chipAccent}`}
                            disabled={disabled}
                            checked={isSiValue(row.wantsBautizosTransport)}
                            onChange={(e) => setEventTransport(i, row, e.target.checked)}
                          />
                          ¿Desea transporte del evento?
                        </label>
                        <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className={`h-4 w-4 rounded ${chipAccent}`}
                            disabled={disabled}
                            checked={!!row.llegaEnCarro}
                            onChange={(e) => setLlegaEnCarro(i, row, e.target.checked)}
                          />
                          Llega en carro
                        </label>
                      </div>
                      {!!row.llegaEnCarro && !hideCarCountInTransport && (
                        <div className="max-w-[220px] space-y-1">
                          <label className={labelClasses}>Cantidad de carros</label>
                          <input
                            type="number"
                            min={1}
                            step={1}
                            className={inputClasses}
                            disabled={disabled}
                            value={normalizeArrivalCarCountInput(row.carrosLlegada)}
                            onChange={(e) => patchRow(i, { carrosLlegada: normalizeArrivalCarCountInput(e.target.value) })}
                          />
                        </div>
                      )}
                      {isSiValue(row.wantsBautizosTransport) && !busHidden && (showFrom || showTo) && (
                        <div className={`grid grid-cols-1 ${travelGridGap}`}>
                          {showFrom && (
              <div className={fieldStack}>
                <label className={labelClasses}>Sale de sede</label>
                              <select
                                className={inputClasses}
                                disabled={disabled}
                                value={row.travelFrom || loc}
                                onChange={(e) => patchRow(i, { travelFrom: e.target.value })}
                              >
                                {locations.map((s) => (
                                  <option key={`cmp-from-${i}-${s}`} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                          {showTo && (
              <div className={fieldStack}>
                <label className={labelClasses}>Regresa a sede</label>
                              <select
                                className={inputClasses}
                                disabled={disabled}
                                value={row.travelTo || loc}
                                onChange={(e) => patchRow(i, { travelTo: e.target.value })}
                              >
                                {locations.map((s) => (
                                  <option key={`cmp-to-${i}-${s}`} value={s}>
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
                ) : (
                <div className="space-y-3">
              <div className={fieldStack}>
                <label className={labelClasses}>Transporte</label>
                    <div className="flex flex-wrap gap-3">
                      <label className={`${uiFormChoiceBtn.panel} cursor-pointer bg-white text-slate-600 border-slate-200 justify-start`}>
                        <input
                          type="checkbox"
                          className={`h-4 w-4 rounded ${chipAccent}`}
                          disabled={disabled}
                          checked={isSiValue(row.wantsBautizosTransport)}
                          onChange={(e) => setEventTransport(i, row, e.target.checked)}
                        />
                        ¿Desea transporte del evento?
                      </label>
                      <label className={`${uiFormChoiceBtn.panel} cursor-pointer bg-white text-slate-600 border-slate-200 justify-start`}>
                        <input
                          type="checkbox"
                          className={`h-4 w-4 rounded ${chipAccent}`}
                          disabled={disabled}
                          checked={!!row.llegaEnCarro}
                          onChange={(e) => setLlegaEnCarro(i, row, e.target.checked)}
                        />
                        Llega en carro
                      </label>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Debes elegir una opción: transporte del evento o llegada en carro (excluyentes). Si llega en carro, el costo de transporte es $0.
                    </p>
                    {!!row.llegaEnCarro && !hideCarCountInTransport && (
                      <div className="mt-2 max-w-[220px] space-y-1">
                        <label className={labelClasses}>Cantidad de carros</label>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          className={inputClasses}
                          disabled={disabled}
                          value={normalizeArrivalCarCountInput(row.carrosLlegada)}
                          onChange={(e) => patchRow(i, { carrosLlegada: normalizeArrivalCarCountInput(e.target.value) })}
                        />
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    {isSiValue(row.wantsBautizosTransport) && !busHidden && (showFrom || showTo) && (
                      <div className="grid grid-cols-1 gap-3">
                        {showFrom && (
              <div className={fieldStack}>
                <label className={labelClasses}>Sale de sede</label>
                            <select
                              className={inputClasses}
                              disabled={disabled}
                              value={row.travelFrom || loc}
                              onChange={(e) => patchRow(i, { travelFrom: e.target.value })}
                            >
                              {locations.map((s) => (
                                <option key={`cmp-from-${i}-${s}`} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        {showTo && (
              <div className={fieldStack}>
                <label className={labelClasses}>Regresa a sede</label>
                            <select
                              className={inputClasses}
                              disabled={disabled}
                              value={row.travelTo || loc}
                              onChange={(e) => patchRow(i, { travelTo: e.target.value })}
                            >
                              {locations.map((s) => (
                                <option key={`cmp-to-${i}-${s}`} value={s}>
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
                )
              )}
            </div>
          );
        })}
        {!disabled && (
          <button
            type="button"
            onClick={() => onChange([...listRef.current, newCompanionRow(loc)])}
            className={`w-full rounded-xl font-bold touch-manipulation transition-colors ${addBtnSolid} ${
              isTeal
                ? 'px-3 py-2 text-[10px] font-black uppercase tracking-wide'
                : 'px-3 py-2 text-[10px] font-black uppercase tracking-wide'
            }`}
          >
            + Agregar acompañante
          </button>
        )}
      </div>
    </section>
  );
}
