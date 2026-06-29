import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { auth } from './firebaseRefs.js';
import {
  ATTENDANCE_SPECIAL,
  PUBLIC_OPTIONAL_KEYS,
  calculateAgeFromBirthDate,
  getPricingFromSnapshot,
  getPublicRegistrationFormIssues,
  buildEditorRegistrationFieldVisFromSnapshots,
  applyOptionalVisibilityDefaults,
  submitPublicRegistration,
  fetchParticipantsForEvent,
  getValidDiscountCampaignsForPerson,
  canonicalizeVnpPersonId,
  fetchParticipantsByVnpPersonId,
  filterPublicVnpLookupRows,
  buildPublicProfileImportPayload,
  isSiValue,
  getBautizosCompanionsArray,
  generateVnpPersonId,
} from './publicRegistrationLogic.js';
import {
  subscribePersonOfInterestVnpSet,
  personLikeIsPersonOfInterest,
  registrationPersonOfInterestMessage,
} from './vnpPersonFlags.js';
import { getDefaultTransportFieldsForEventType } from './registrationFormEditorConfig.js';
import {
  hasBautizosBaptizedCompanionInParty,
  getBautizosSplitPartySlotDescriptors,
  buildParticipantLikeForBautizosSplitSlot,
} from './bautizosParty.js';
import { fetchPublicRegistrationLinkSnapshot } from './publicRegistrationLinkFetch.js';
import { ensurePublicSubmitAuth } from './publicRegistrationAuth.js';
import { buildOptionalVisibilityFromPublicLinkDoc } from './publicLinkDocHelpers.js';
import {
  enqueuePublicRegistrationOffline,
  isLikelyRetriableNetworkFailure,
  processPublicRegistrationOfflineQueue,
} from './publicRegistrationOfflineQueue.js';
import PublicRegistrationFormSections from './PublicRegistrationFormSections.jsx';
import { formatEventDateRangeLabel } from './eventDateHelpers.js';
import { DEFAULT_ALLERGY_OPTIONS, DEFAULT_SERVE_AREA_OPTIONS } from './registrationFormShared.js';
import {
  expirePublicBrowseSessionNow,
  isPublicBrowseSessionExpired,
  registerPublicRegistrationSuccess,
  startPublicBrowseSessionWatch,
} from './publicAnonymousAuthLifecycle.js';
import { isCardPaymentAllowedForLocation } from './cardPaymentEligibility.js';
import { uiButtons } from './ui/uiFormatClasses.js';
import { formPublicInputClasses, formPublicLabelClasses } from './formFieldClasses.js';
import { BLOOD_TYPE_UNSPECIFIED, BLOOD_TYPES_SELECT_OPTIONS } from './registrationFormShared.js';
import { emitGlobalSystemAlert } from './globalSystemAlertsBridge.js';
import { shortPublicLinkLoadMessage, shortFirebaseClientMessage } from './shortSystemMessages.js';
import {
  mergePrivacyNoticeConfig,
  buildPrivacyNoticePublicUrl,
  needsRegistrationConsentConfirmation,
} from './privacyNotice.js';
import PrivacyConsentConfirmModal from './components/PrivacyConsentConfirmModal.jsx';

const inputClasses = formPublicInputClasses;
const labelClasses = formPublicLabelClasses;
const btnPrimary =
  `${uiButtons.primary} w-full min-h-[48px] py-3 px-4 text-base transition-all flex justify-center items-center gap-2 touch-manipulation`;
/** Contenedor con márgenes seguros en móviles con notch / barra de inicio. */
const publicShellClass =
  'min-h-[100dvh] box-border bg-slate-100 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]';

const GENDERS = ['Hombre', 'Mujer'];
const BLOOD_TYPES = BLOOD_TYPES_SELECT_OPTIONS;
const RESPONSIVA_STATUSES = ['Pendiente', 'Entregada'];
const PAYMENT_METHODS = ['Efectivo', 'Tarjeta'];
const SI = 'Si';

const eventTypeIsDesayuno = (eventType) => String(eventType || '').toLowerCase().includes('desayuno');

/** Borrador local: recupera datos si el navegador recarga (p. ej. actualización PWA / nuevo deploy). */
const PUBLIC_REG_DRAFT_PREFIX = 'vnpm_pub_draft_v1:';
const PUBLIC_REG_DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function publicRegDraftStorageKey(linkKey, eventId) {
  return `${PUBLIC_REG_DRAFT_PREFIX}${String(linkKey || '').trim()}:${String(eventId || '').trim()}`;
}

function formHasDraftableContent(f) {
  if (!f || typeof f !== 'object') return false;
  if (String(f.name || '').trim().length > 1) return true;
  if (String(f.phone || '').replace(/\D/g, '').length >= 5) return true;
  if (String(f.birthDate || '').trim()) return true;
  if (String(f.vnpPersonId || '').trim().length >= 4) return true;
  const comps = getBautizosCompanionsArray(f);
  if (comps.some((c) => String(c?.name || '').trim().length > 1)) return true;
  return false;
}

function clearPublicRegDraft(linkKey, eventId) {
  if (!linkKey || !eventId) return;
  try {
    sessionStorage.removeItem(publicRegDraftStorageKey(linkKey, eventId));
  } catch {
    /* cuota / modo privado */
  }
}

const emptyForm = () => ({
  name: '',
  phone: '',
  age: '',
  birthDate: '',
  bloodType: BLOOD_TYPE_UNSPECIFIED,
  gender: '',
  responsivaStatus: '',
  alias: '',
  emergencyContact: '',
  emergencyPhone: '',
  emergencyRelationship: '',
  canSwim: 'No',
  paid: '',
  attendanceSpecialType: ATTENDANCE_SPECIAL.ninguno,
  hasAllergy: 'No',
  allergyCategory: '',
  allergyDetails: '',
  hasDisease: 'No',
  diseaseDetails: '',
  diseaseMedication: '',
  hasDisability: 'No',
  disabilityDetails: '',
  isScholarship: 'No',
  scholarshipType: 'total',
  scholarshipPartialAmount: '',
  isServer: 'No',
  serverAssignment: '',
  ambosServeInSegment: '',
  campAssignment: '',
  customData: {},
  willBeBaptized: 'No',
  baptismSegment: '',
  llegaEnCarro: false,
  regresaEnCarro: false,
  carrosLlegada: 1,
  transportType: 'Camión',
  travelFrom: '',
  travelTo: '',
  vnpPersonId: '',
  paymentMethod: 'Efectivo',
  cardReference: '',
  selectedDiscountCampaignId: '',
  allowSharedMainPhone: false,
  location: '',
  isMarried: 'No',
  spouseName: '',
  goesWithChildren: 'No',
  childrenCount: '',
  servedOtherCampa: 'No',
  servedAreas: '',
  preferredServeArea: '',
  servesInCongress: 'No',
  congressServeArea: '',
  wantsBautizosFood: SI,
  wantsBautizosTransport: 'No',
  bautizosAttendanceType: 'bautizado',
  bautizosCompanions: [],
  privacyAccepted: false,
  sensitiveDataConsent: '',
});

const formatPhoneNumber = (value) => {
  if (value.startsWith('+')) return value.replace(/[^+0-9\s-]/g, '');
  const digits = value.replace(/\D/g, '').substring(0, 10);
  let formatted = digits.substring(0, 2);
  if (digits.length > 2) formatted += '-' + digits.substring(2, 6);
  if (digits.length > 6) formatted += '-' + digits.substring(6, 10);
  return formatted;
};

/** Mismo criterio visual que bloques obligatorios del registro público. */
const companionRequiredFieldHighlight = (missing) =>
  missing
    ? '!border-2 !border-red-600 bg-red-50 dark:bg-red-950/35 ring-2 ring-red-200 dark:ring-red-900 rounded-xl'
    : '';

function normalizePublicLinkId(raw) {
  if (raw == null || raw === '') return '';
  const s = String(raw).trim();
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export default function PublicRegistrationPage({ linkId }) {
  const resolvedLinkId = useMemo(() => normalizePublicLinkId(linkId), [linkId]);
  const [phase, setPhase] = useState('loading');
  const [loadError, setLoadError] = useState('');
  const [linkDoc, setLinkDoc] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successId, setSuccessId] = useState(null);
  const [successResponsivaSignUrl, setSuccessResponsivaSignUrl] = useState('');
  const [servedAreasMenuOpen, setServedAreasMenuOpen] = useState(false);
  const [preferredServeMenuOpen, setPreferredServeMenuOpen] = useState(false);
  const [currentEventParticipants, setCurrentEventParticipants] = useState([]);
  const [vnpLookupMatches, setVnpLookupMatches] = useState([]);
  const [vnpLookupLoading, setVnpLookupLoading] = useState(false);
  const [personOfInterestVnpSet, setPersonOfInterestVnpSet] = useState(() => new Set());
  const submitErrorRef = useRef(null);
  const vnpLookupTimerRef = useRef(null);
  const privacyConsentConfirmRef = useRef(null);
  const [privacyConsentConfirmModal, setPrivacyConsentConfirmModal] = useState({ isOpen: false });
  /** Evita repetir el arranque del formulario (defaults + borrador) al mismo enlace/evento. */
  const publicFormBootstrappedRef = useRef(false);

  const handleBrowseSessionExpired = useCallback(async () => {
    setSubmitting(false);
    setSubmitError('');
    setPhase('sessionExpired');
  }, []);

  useEffect(() => {
    publicFormBootstrappedRef.current = false;
  }, [resolvedLinkId]);

  /** 1 h sin registro exitoso: borrar anónimo y cerrar formulario. */
  useEffect(() => {
    if (phase !== 'ready' || !resolvedLinkId) return undefined;
    if (isPublicBrowseSessionExpired(resolvedLinkId)) {
      void expirePublicBrowseSessionNow(auth, resolvedLinkId, handleBrowseSessionExpired);
      return undefined;
    }
    return startPublicBrowseSessionWatch(auth, resolvedLinkId, handleBrowseSessionExpired);
  }, [phase, resolvedLinkId, handleBrowseSessionExpired]);

  useEffect(() => {
    if (!submitError) return;
    submitErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [submitError]);

  const formatValidationIssues = (issues) => {
    if (!issues.length) return '';
    if (issues.length === 1) {
      return `Motivo: el formulario no puede enviarse hasta corregir lo siguiente.\n\n${issues[0]}`;
    }
    return `Motivo: el formulario no puede enviarse hasta corregir varios puntos.\n\n${issues.map((t, i) => `${i + 1}. ${t}`).join('\n')}`;
  };

  const optionalVisibility = useMemo(() => buildOptionalVisibilityFromPublicLinkDoc(linkDoc), [linkDoc]);

  const eventSnapshot = linkDoc?.eventSnapshot;
  const globalSnapshot = linkDoc?.globalSnapshot || {};

  const paymentMethodOptionsPublic = useMemo(() => {
    const loc = String(form.location || eventSnapshot?.locations?.[0] || '').trim();
    if (!eventSnapshot || !loc) return PAYMENT_METHODS;
    return isCardPaymentAllowedForLocation(eventSnapshot, loc) ? PAYMENT_METHODS : ['Efectivo'];
  }, [eventSnapshot, form.location]);

  useEffect(() => {
    if (form.paymentMethod !== 'Tarjeta') return;
    const loc = String(form.location || eventSnapshot?.locations?.[0] || '').trim();
    if (eventSnapshot && loc && !isCardPaymentAllowedForLocation(eventSnapshot, loc)) {
      setForm((prev) => (prev.paymentMethod === 'Tarjeta' ? { ...prev, paymentMethod: 'Efectivo', cardReference: '' } : prev));
    }
  }, [eventSnapshot, form.location, form.paymentMethod]);

  const editorFieldVis = useMemo(
    () => buildEditorRegistrationFieldVisFromSnapshots(globalSnapshot, eventSnapshot),
    [globalSnapshot, eventSnapshot]
  );
  const privacyNotice = useMemo(
    () => mergePrivacyNoticeConfig(globalSnapshot?.privacyNotice),
    [globalSnapshot?.privacyNotice]
  );
  const publicRegPrivacyContext = useMemo(
    () => ({
      privacyAccepted: !!form.privacyAccepted,
      sensitiveConsent: form.sensitiveDataConsent,
      requirePrivacy: false,
      allowSensitiveWithoutConsent: true,
    }),
    [form.privacyAccepted, form.sensitiveDataConsent]
  );

  const requestPrivacyConsentConfirm = useCallback(
    () =>
      new Promise((resolve) => {
        privacyConsentConfirmRef.current = resolve;
        setPrivacyConsentConfirmModal({ isOpen: true });
      }),
    []
  );

  const closePrivacyConsentConfirm = useCallback((confirmed) => {
    setPrivacyConsentConfirmModal({ isOpen: false });
    const resolve = privacyConsentConfirmRef.current;
    privacyConsentConfirmRef.current = null;
    resolve?.(!!confirmed);
  }, []);
  const privacyPublicUrl = useMemo(
    () => buildPrivacyNoticePublicUrl(typeof window !== 'undefined' ? window.location.origin : ''),
    []
  );
  const isCampa = eventSnapshot?.eventType === 'Campa';
  const isGeneral = eventSnapshot?.eventType === 'General';
  const isBautizos = eventSnapshot?.eventType === 'Bautizos';
  const isDesayunoEvent = eventTypeIsDesayuno(eventSnapshot?.eventType);
  const pricing = useMemo(() => getPricingFromSnapshot(eventSnapshot), [eventSnapshot]);
  const showTravelBase = eventSnapshot && !eventTypeIsDesayuno(eventSnapshot.eventType);
  const bautizosBusSedesHidden =
    isBautizos &&
    isSiValue(form.wantsBautizosTransport) &&
    !!form.llegaEnCarro;
  const showTravelFrom =
    showTravelBase &&
    optionalVisibility.travelFrom !== false &&
    (!isBautizos || (isSiValue(form.wantsBautizosTransport) && !bautizosBusSedesHidden));
  const showTravelTo =
    showTravelBase &&
    optionalVisibility.travelTo !== false &&
    (!isBautizos || (isSiValue(form.wantsBautizosTransport) && !bautizosBusSedesHidden));

  const allergyOptionsList = useMemo(() => {
    const a = globalSnapshot?.allergyOptions;
    return Array.isArray(a) && a.length > 0 ? a : DEFAULT_ALLERGY_OPTIONS;
  }, [globalSnapshot?.allergyOptions]);

  const serveAreaOptionsList = useMemo(() => {
    const a = globalSnapshot?.serveAreaOptions;
    return Array.isArray(a) && a.length > 0 ? a : DEFAULT_SERVE_AREA_OPTIONS;
  }, [globalSnapshot?.serveAreaOptions]);

  /** Menor en Bautizos: sugerir una fila de acompañante vacía si aún no hay ninguna (Padre/Madre/Tutor). */
  useEffect(() => {
    if (phase !== 'ready' || !isBautizos || optionalVisibility.bautizosCompanions === false) return;
    const ageNum = parseInt(form.age, 10);
    if (!Number.isFinite(ageNum) || ageNum >= 18) return;
    const loc = String(form.location || eventSnapshot?.locations?.[0] || '').trim();
    setForm((prev) => {
      const arr = getBautizosCompanionsArray(prev);
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
            travelFrom: loc,
            travelTo: loc,
          },
        ],
      };
    });
  }, [phase, isBautizos, optionalVisibility.bautizosCompanions, form.age, form.location, eventSnapshot?.locations]);

  /**
   * Una sola vez al quedar listo el enlace: base vacía + defaults de transporte, o borrador en sessionStorage
   * si hubo recarga (no volver a pisar lo que el usuario ya escribió cuando cambian dependencias de efecto).
   */
  useEffect(() => {
    if (phase !== 'ready' || !eventSnapshot?.id || !eventSnapshot?.eventType) return;
    if (publicFormBootstrappedRef.current) return;
    publicFormBootstrappedRef.current = true;

    const transport = getDefaultTransportFieldsForEventType(eventSnapshot.eventType);
    const base = { ...emptyForm(), ...transport };

    let parsed = null;
    try {
      const raw = sessionStorage.getItem(publicRegDraftStorageKey(resolvedLinkId, eventSnapshot.id));
      if (raw) parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
    const stale =
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.savedAt !== 'number' ||
      Date.now() - parsed.savedAt > PUBLIC_REG_DRAFT_MAX_AGE_MS;
    const draftForm = !stale && parsed?.form && typeof parsed.form === 'object' && !Array.isArray(parsed.form) ? parsed.form : null;

    if (draftForm && formHasDraftableContent(draftForm)) {
      setForm({
        ...base,
        ...draftForm,
        customData:
          typeof draftForm.customData === 'object' && draftForm.customData
            ? { ...base.customData, ...draftForm.customData }
            : base.customData,
        bautizosCompanions: Array.isArray(draftForm.bautizosCompanions)
          ? draftForm.bautizosCompanions
          : base.bautizosCompanions,
      });
    } else {
      setForm(base);
    }
  }, [phase, resolvedLinkId, eventSnapshot?.id, eventSnapshot?.eventType]);

  /** Guarda borrador con debounce para sobrevivir recargas (deploy, SW, gesto del sistema). */
  useEffect(() => {
    if (phase !== 'ready' || !eventSnapshot?.id || !resolvedLinkId) return;
    if (!publicFormBootstrappedRef.current) return;
    if (!formHasDraftableContent(form)) return;
    const key = publicRegDraftStorageKey(resolvedLinkId, eventSnapshot.id);
    const t = window.setTimeout(() => {
      try {
        sessionStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), form }));
      } catch {
        /* ignore */
      }
    }, 500);
    return () => window.clearTimeout(t);
  }, [form, phase, resolvedLinkId, eventSnapshot?.id]);

  const mergePublicFormImport = useCallback((imported, prev) => {
    const def = emptyForm();
    const next = { ...prev };
    for (const key of Object.keys(imported)) {
      if (key === 'customData') {
        const merged = { ...(imported.customData || {}) };
        for (const ck of Object.keys(prev.customData || {})) {
          if (prev.customData[ck]) merged[ck] = prev.customData[ck];
        }
        next.customData = merged;
        continue;
      }
      const pv = prev[key];
      const defv = def[key];
      const emptyish = pv === '' || pv == null || (defv !== undefined && pv === defv);
      if (emptyish && imported[key] !== undefined && imported[key] !== '') {
        next[key] = imported[key];
      }
    }
    if (next.birthDate) {
      next.age = calculateAgeFromBirthDate(next.birthDate);
    }
    return next;
  }, []);

  const onApplyVnpProfile = useCallback(
    (src) => {
      if (!eventSnapshot) return;
      const poiMsg = registrationPersonOfInterestMessage(src, personOfInterestVnpSet, personOfInterestRegistrationHelpers);
      if (poiMsg) {
        setSubmitError(poiMsg);
        emitGlobalSystemAlert(poiMsg, { tone: 'warn', ms: 7000 });
        return;
      }
      const loc = String(form.location || eventSnapshot.locations?.[0] || '').trim();
      const payload = buildPublicProfileImportPayload(src, {
        eventType: eventSnapshot.eventType,
        defaultLocation: loc,
      });
      setForm((prev) => {
        const m = mergePublicFormImport(payload, prev);
        return {
          ...m,
          phone: formatPhoneNumber(m.phone || ''),
          emergencyPhone: formatPhoneNumber(m.emergencyPhone || ''),
        };
      });
    },
    [eventSnapshot, form.location, mergePublicFormImport, personOfInterestVnpSet, personOfInterestRegistrationHelpers]
  );

  useEffect(() => {
    if (phase !== 'ready') {
      setPersonOfInterestVnpSet(new Set());
      return undefined;
    }
    return subscribePersonOfInterestVnpSet(setPersonOfInterestVnpSet, (err) => console.error(err));
  }, [phase]);

  const personOfInterestRegistrationHelpers = useMemo(
    () => ({
      generateVnpPersonId,
      buildParticipantLikeForBautizosSplitSlot,
      getBautizosSplitPartySlotDescriptors,
      hasBautizosBaptizedCompanionInParty,
      eventType: eventSnapshot?.eventType,
      canMarkPersonsOfInterest: false,
    }),
    [eventSnapshot?.eventType]
  );

  useEffect(() => {
    if (phase !== 'ready' || !eventSnapshot?.id) return;
    let cancelled = false;
    (async () => {
      try {
        await ensurePublicSubmitAuth(auth);
        const fresh = await fetchParticipantsForEvent(eventSnapshot.id);
        if (!cancelled) setCurrentEventParticipants(fresh);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          emitGlobalSystemAlert('Lista del evento: no se pudo leer en Firestore (red o sesión).', { ms: 5500 });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, eventSnapshot?.id]);

  useEffect(() => {
    if (phase !== 'ready' || !eventSnapshot?.id || optionalVisibility.vnpPersonId === false) {
      setVnpLookupMatches([]);
      return;
    }
    const raw = form.vnpPersonId || '';
    const canon = canonicalizeVnpPersonId(raw);
    if (vnpLookupTimerRef.current) clearTimeout(vnpLookupTimerRef.current);
    if (!canon || canon.length < 8) {
      setVnpLookupMatches([]);
      return;
    }
    vnpLookupTimerRef.current = setTimeout(async () => {
      setVnpLookupLoading(true);
      try {
        await ensurePublicSubmitAuth(auth);
        const rows = await fetchParticipantsByVnpPersonId(canon);
        const filtered = filterPublicVnpLookupRows(rows, eventSnapshot.id, currentEventParticipants);
        setVnpLookupMatches(filtered);
      } catch (e) {
        console.error(e);
        emitGlobalSystemAlert('Búsqueda por ID VNPM: consulta a Firestore falló.', { ms: 5000 });
        setVnpLookupMatches([]);
      } finally {
        setVnpLookupLoading(false);
      }
    }, 450);
    return () => {
      if (vnpLookupTimerRef.current) clearTimeout(vnpLookupTimerRef.current);
    };
  }, [form.vnpPersonId, phase, eventSnapshot?.id, optionalVisibility.vnpPersonId, currentEventParticipants]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!resolvedLinkId) {
        setLoadError('Enlace inválido (falta el identificador en la URL).');
        setPhase('error');
        return;
      }
      setPhase('loading');
      setLoadError('');
      try {
        try {
          await ensurePublicSubmitAuth(auth);
        } catch (authErr) {
          console.warn(
            'Registro público: sesión anónima no disponible antes de cargar el enlace; se intenta lectura igual (reglas permiten lectura pública del enlace).',
            authErr
          );
        }
        let snap;
        let lastFetchErr;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            snap = await fetchPublicRegistrationLinkSnapshot(resolvedLinkId);
            lastFetchErr = undefined;
            break;
          } catch (err) {
            lastFetchErr = err;
            if (attempt === 0) await new Promise((r) => setTimeout(r, 450));
          }
        }
        if (!snap && lastFetchErr) throw lastFetchErr;
        if (cancelled) return;
        if (!snap.exists()) {
          setLoadError(
            'Este enlace no existe o no coincide con esta instalación. Comprueba que guardaste el QR después de «Guardar» y que usas la misma app desplegada.'
          );
          setPhase('error');
          return;
        }
        const data = snap.data();
        if (!data?.eventSnapshot?.id) {
          setLoadError('Este enlace está incompleto. Pide a la organización que generen uno nuevo.');
          setPhase('error');
          return;
        }
        setLinkDoc(data);
        if (cancelled) return;
        setPhase('ready');
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          const code = e?.code || '';
          const hint = String(e?.message || '').toLowerCase();
          const looksLikeNetwork =
            !code &&
            (hint.includes('network') || hint.includes('fetch') || hint.includes('failed to fetch') || hint.includes('load failed'));
          let msg =
            'No se pudo cargar el formulario. Revisa tu conexión o intenta más tarde.';
          if (code === 'permission-denied') {
            msg =
              'Permiso denegado: Firestore está bloqueando la lectura. Publica las reglas (firestore.rules) o revisa en Consola Firebase → Firestore → Reglas.';
          } else if (code === 'auth/operation-not-allowed') {
            msg =
              'Acceso anónimo desactivado en Firebase. En Authentication → Método de acceso, activa «Anónimo».';
          } else if (code === 'unavailable' || code === 'failed-precondition') {
            msg =
              hint.includes('index') || hint.includes('índice')
                ? 'Falta un índice en Firestore para este enlace. Contacta al equipo técnico o usa el enlace con el id del evento hasta actualizar índices.'
                : 'Servicio temporalmente no disponible. Intenta de nuevo en unos segundos.';
          } else if (code === 'deadline-exceeded' || code === 'aborted') {
            msg =
              'La petición tardó demasiado o se canceló. Prueba con mejor señal de red o intenta de nuevo en unos segundos.';
          } else if (looksLikeNetwork) {
            msg =
              'No se pudo conectar con el servidor. Revisa tu conexión, cambia de Wi‑Fi a datos o viceversa, e intenta de nuevo.';
          }
          setLoadError(msg);
          setPhase('error');
          emitGlobalSystemAlert(shortPublicLinkLoadMessage(e), { ms: 7500 });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resolvedLinkId]);

  const setField = useCallback((key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  }, []);

  const onBirthChange = useCallback((v) => {
    const age = calculateAgeFromBirthDate(v);
    setForm((prev) => ({ ...prev, birthDate: v, age }));
  }, []);

  const onPhoneChange = useCallback((raw) => {
    setField('phone', formatPhoneNumber(raw));
  }, [setField]);

  const handleStartAnotherRegistration = useCallback(() => {
    if (resolvedLinkId && eventSnapshot?.id) clearPublicRegDraft(resolvedLinkId, eventSnapshot.id);
    const defaultLoc = String(form.location || eventSnapshot?.locations?.[0] || '').trim();
    setForm({
      ...emptyForm(),
      ...getDefaultTransportFieldsForEventType(eventSnapshot?.eventType),
      location: defaultLoc,
    });
    publicFormBootstrappedRef.current = true;
    setSubmitError('');
    setSuccessId(null);
    setSuccessResponsivaSignUrl('');
    setVnpLookupMatches([]);
    setServedAreasMenuOpen(false);
    setPreferredServeMenuOpen(false);
    setPhase('ready');
  }, [form.location, resolvedLinkId, eventSnapshot?.id, eventSnapshot?.locations, eventSnapshot?.eventType]);

  const selectableCampaigns = useMemo(
    () => (eventSnapshot ? getValidDiscountCampaignsForPerson(eventSnapshot, form) : []),
    [eventSnapshot, form]
  );

  const tryEnqueueOfflineRegistration = useCallback(
    (loc) => {
      const locTrim = String(loc || '').trim();
      if (!resolvedLinkId || !eventSnapshot?.id || !locTrim) return false;
      const id = enqueuePublicRegistrationOffline({
        linkKey: resolvedLinkId,
        eventId: eventSnapshot.id,
        loc: locTrim,
        form,
      });
      if (!id) return false;
      emitGlobalSystemAlert('Registro en cola local (localStorage); se sube a Firestore al reconectar.', {
        tone: 'warn',
        ms: 8200,
      });
      return true;
    },
    [resolvedLinkId, eventSnapshot, form]
  );

  const validatePublicFormForSubmit = useCallback(
    (loc) => {
      const locTrim = String(loc || '').trim();
      const mergedPreview = applyOptionalVisibilityDefaults(
        { ...form, location: locTrim },
        optionalVisibility,
        eventSnapshot
      );
      return getPublicRegistrationFormIssues(
        mergedPreview,
        eventSnapshot?.minDeposit || 0,
        eventSnapshot?.eventType || 'General',
        pricing,
        optionalVisibility,
        eventSnapshot,
        editorFieldVis,
        publicRegPrivacyContext
      );
    },
    [form, optionalVisibility, eventSnapshot, pricing, editorFieldVis, publicRegPrivacyContext]
  );

  const confirmConsentIfNeeded = useCallback(async () => {
    if (!needsRegistrationConsentConfirmation(!!form.privacyAccepted, form.sensitiveDataConsent)) {
      return true;
    }
    return requestPrivacyConsentConfirm();
  }, [form.privacyAccepted, form.sensitiveDataConsent, requestPrivacyConsentConfirm]);

  /** Si había pendientes (p. ej. cerró el navegador sin red), intenta enviarlos al abrir el formulario. */
  useEffect(() => {
    if (phase !== 'ready' || !resolvedLinkId) return;
    let cancelled = false;
    (async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      const r = await processPublicRegistrationOfflineQueue(auth);
      if (cancelled || !r.processed) return;
      emitGlobalSystemAlert(`${r.processed} registro(s) en cola enviado(s) a Firestore.`, { tone: 'ok', ms: 5500 });
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, resolvedLinkId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!eventSnapshot || phase !== 'ready') return;
    setSubmitError('');
    setSubmitting(true);
    const loc = String(form.location || '').trim();
    if (!loc) {
      setSubmitError('Elige una sede.');
      setSubmitting(false);
      return;
    }

    const issues = validatePublicFormForSubmit(loc);
    if (issues.length) {
      setSubmitError(formatValidationIssues(issues));
      setSubmitting(false);
      return;
    }
    if (!(await confirmConsentIfNeeded())) {
      setSubmitting(false);
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      if (tryEnqueueOfflineRegistration(loc)) {
        setSubmitError(
          'Sin internet: el envío quedó en cola en este dispositivo (localStorage). Se subirá solo al reconectar.'
        );
      } else {
        setSubmitError('Sin internet: no se pudo guardar en cola en este dispositivo.');
      }
      setSubmitting(false);
      return;
    }

    try {
      await ensurePublicSubmitAuth(auth);
      const fresh = await fetchParticipantsForEvent(eventSnapshot.id);
      const result = await submitPublicRegistration({
        rawEntry: form,
        loc,
        eventSnapshot,
        globalSnapshot,
        optionalVisibility,
        participants: fresh,
      });
      if (!result.ok) {
        const re =
          String(result.error || '').trim() ||
          'Motivo no especificado por el servidor. Intenta de nuevo o contacta a la organización.';
        setSubmitError(re);
        const head = re.split(/[.\n]/)[0].trim().slice(0, 130);
        if (head) emitGlobalSystemAlert(`Registro no guardado: ${head}`, { tone: 'warn', ms: 8500 });
        setSubmitting(false);
        return;
      }
      setSuccessId(result.participantId);
      setSuccessResponsivaSignUrl(String(result.responsivaSignUrl || '').trim());
      clearPublicRegDraft(resolvedLinkId, eventSnapshot.id);
      registerPublicRegistrationSuccess(auth, resolvedLinkId);
      setPhase('done');
    } catch (err) {
      console.error(err);
      if (isLikelyRetriableNetworkFailure(err) && tryEnqueueOfflineRegistration(loc)) {
        setSubmitError('Red inestable: registro en cola local; se enviará al recuperar conexión.');
        return;
      }
      emitGlobalSystemAlert(shortFirebaseClientMessage(err), { ms: 7500 });
      const c = err?.code || '';
      const msg = String(err?.message || '').trim();
      const technical = [c && `Código: ${c}`, msg && `Detalle: ${msg}`].filter(Boolean).join('\n');
      if (c === 'auth/operation-not-allowed') {
        setSubmitError(
          `No se pudo iniciar sesión para enviar. En Firebase Console → Authentication → Sign-in method, activa «Anónimo».\n\n${technical}`
        );
      } else if (c === 'auth/network-request-failed' || /network|offline|fetch/i.test(msg)) {
        setSubmitError(
          `No hay conexión estable con el servidor de cuentas. Revisa datos o Wi‑Fi, cierra la app del navegador y vuelve a abrir el enlace.\n\n${technical}`
        );
      } else if (c === 'permission-denied') {
        setSubmitError(
          `Permiso denegado al guardar el registro. Vuelve a intentar; si sigue igual, abre el enlace en Safari o Chrome (no dentro de WhatsApp u otra app).\n\n${technical}`
        );
      } else if (c === 'unavailable' || c === 'deadline-exceeded') {
        setSubmitError(`El servicio tardó en responder. Intenta de nuevo en unos segundos.\n\n${technical}`);
      } else if (c === 'auth/too-many-requests') {
        setSubmitError(`Demasiados intentos. Espera un minuto e intenta de nuevo.\n\n${technical}`);
      } else {
        setSubmitError(
          [
            'Error al enviar el formulario.',
            technical || 'No se recibió detalle del error (revisa la consola si puedes).',
            'Prueba otra red, otro navegador o abrir el enlace fuera de WhatsApp.',
          ].join('\n\n')
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (phase === 'loading') {
    return (
      <div className={`${publicShellClass} flex items-center justify-center`}>
        <p className="text-slate-600 font-bold text-base px-2 text-center">Cargando formulario…</p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className={`${publicShellClass} flex items-center justify-center`}>
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow border border-slate-200 dark:border-slate-700 p-6 text-center max-h-[85dvh] overflow-y-auto">
          <p className="text-slate-800 font-black text-lg mb-2">No disponible</p>
          <p className="text-slate-600 text-sm leading-relaxed">{loadError}</p>
        </div>
      </div>
    );
  }

  if (phase === 'sessionExpired') {
    return (
      <div className={`${publicShellClass} flex items-center justify-center`}>
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow border border-amber-200 dark:border-amber-700 p-6 text-center max-h-[85dvh] overflow-y-auto">
          <p className="text-amber-800 dark:text-amber-200 font-black text-lg mb-2">Sesión cerrada</p>
          <p className="text-slate-600 text-sm leading-relaxed mb-4">
            El enlace estuvo abierto más de una hora sin completar un registro. Por seguridad se cerró la sesión
            temporal. Vuelve a abrir el formulario para continuar.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded-xl border border-indigo-700 bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors w-full"
          >
            Recargar formulario
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className={`${publicShellClass} flex items-center justify-center`}>
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow border border-emerald-200 dark:border-emerald-700 p-6 text-center max-h-[85dvh] overflow-y-auto">
          <p className="text-emerald-700 dark:text-emerald-300 font-black text-lg mb-2">¡Registro enviado!</p>
          <p className="text-slate-600 text-sm leading-relaxed">
            Tu información quedó registrada.{' '}
            {successId ? <span className="text-slate-400 font-mono text-xs block mt-2">Ref. {successId}</span> : null}
          </p>
          {successResponsivaSignUrl ? (
            <a
              href={successResponsivaSignUrl}
              className="inline-flex items-center justify-center mt-4 min-h-[44px] px-4 py-2 rounded-xl border border-indigo-300 bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100 transition-colors"
            >
              Firmar responsiva digital ahora
            </a>
          ) : null}
          <p className="text-[11px] text-slate-500 mt-4 leading-snug">
            Puede ejercer sus derechos ARCO conforme al{' '}
            <a href={privacyPublicUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold underline">
              aviso de privacidad integral
            </a>
            .
          </p>
          <button
            type="button"
            onClick={handleStartAnotherRegistration}
            className="inline-flex items-center justify-center mt-3 min-h-[44px] px-4 py-2 rounded-xl border border-emerald-700 bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors"
          >
            Agregar otro registro
          </button>
        </div>
      </div>
    );
  }

  const customFields = Array.isArray(eventSnapshot?.customFields) ? eventSnapshot.customFields : [];

  return (
    <div className={publicShellClass}>
      <div className="max-w-lg mx-auto w-full pt-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mb-4">
          <div className="bg-indigo-600 px-5 py-4 text-white">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-90">Registro al evento</p>
            <h1 className="text-xl font-black leading-tight">{eventSnapshot?.name || 'Evento'}</h1>
            {eventSnapshot?.date || eventSnapshot?.dateStart || eventSnapshot?.dateEnd ? (
              <p className="text-xs font-bold text-indigo-100 mt-1 capitalize">
                {formatEventDateRangeLabel(eventSnapshot)}
              </p>
            ) : null}
          </div>
        </div>

        <form noValidate onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 space-y-6">
          {submitError ? (
            <div
              ref={submitErrorRef}
              role="alert"
              className="text-red-800 text-sm font-bold whitespace-pre-line bg-red-50 border-2 border-red-300 rounded-xl p-4 shadow-sm"
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-2">No se pudo enviar</p>
              {submitError}
            </div>
          ) : null}
          <PublicRegistrationFormSections
            inputClasses={inputClasses}
            labelClasses={labelClasses}
            btnPrimary={btnPrimary}
            rosterParticipants={currentEventParticipants}
            form={form}
            setField={setField}
            setForm={setForm}
            eventSnapshot={eventSnapshot}
            optionalVisibility={optionalVisibility}
            isCampa={isCampa}
            isGeneral={isGeneral}
            isBautizos={isBautizos}
            isDesayunoEvent={isDesayunoEvent}
            customFields={customFields}
            selectableCampaigns={selectableCampaigns}
            showTravelFrom={showTravelFrom}
            showTravelTo={showTravelTo}
            onPhoneChange={onPhoneChange}
            onBirthChange={onBirthChange}
            vnpLookupMatches={vnpLookupMatches}
            vnpLookupLoading={vnpLookupLoading}
            personOfInterestVnpSet={personOfInterestVnpSet}
            onApplyVnpProfile={onApplyVnpProfile}
            allergyOptionsList={allergyOptionsList}
            serveAreaOptionsList={serveAreaOptionsList}
            servedAreasMenuOpen={servedAreasMenuOpen}
            setServedAreasMenuOpen={setServedAreasMenuOpen}
            preferredServeMenuOpen={preferredServeMenuOpen}
            setPreferredServeMenuOpen={setPreferredServeMenuOpen}
            submitting={submitting}
            GENDERS={GENDERS}
            BLOOD_TYPES={BLOOD_TYPES}
            RESPONSIVA_STATUSES={RESPONSIVA_STATUSES}
            PAYMENT_METHODS={PAYMENT_METHODS}
            paymentMethodOptions={paymentMethodOptionsPublic}
            SI={SI}
            formatCompanionPhone={formatPhoneNumber}
            companionRequiredFieldClass={companionRequiredFieldHighlight}
            privacyNotice={privacyNotice}
            privacyAccepted={!!form.privacyAccepted}
            onPrivacyAcceptedChange={(v) => setForm((prev) => ({ ...prev, privacyAccepted: v }))}
            sensitiveDataConsent={form.sensitiveDataConsent}
            onSensitiveDataConsentChange={(v) => setForm((prev) => ({ ...prev, sensitiveDataConsent: v }))}
          />
        </form>

        {PUBLIC_OPTIONAL_KEYS.some((k) => optionalVisibility[k.key] === false) ? (
          <p className="text-center text-[10px] text-slate-400 font-bold mt-4 px-2">
            Parte del formulario fue simplificada por la organización (secciones opcionales desactivadas en este enlace).
          </p>
        ) : null}
        <PrivacyConsentConfirmModal
          open={privacyConsentConfirmModal.isOpen}
          privacyAccepted={!!form.privacyAccepted}
          sensitiveConsentAccepted={form.sensitiveDataConsent}
          retentionDays={privacyNotice.sensitiveRetentionDays}
          onConfirm={() => closePrivacyConsentConfirm(true)}
          onCancel={() => closePrivacyConsentConfirm(false)}
        />
      </div>
    </div>
  );
}
