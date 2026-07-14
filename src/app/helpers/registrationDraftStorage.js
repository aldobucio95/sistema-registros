import { BLOOD_TYPE_UNSPECIFIED } from '../../registrationFormShared.js';
import { ATTENDANCE_SPECIAL } from '../../publicRegistrationLogic.js';
import { isBautizosCompanionBaptized } from '../../bautizosParty.js';

export const EMPTY_ENTRY = {
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
  /** 'total' | 'partial' — solo aplica si isScholarship es Sí (formulario nuevo registro). */
  scholarshipType: 'total',
  /** Beca parcial: monto cubierto por la beca (cantidad becada); a liquidar = costo de lista actual menos este monto. */
  scholarshipPartialAmount: '',
  isServer: 'No',
  serverAssignment: '',
  campAssignment: '',
  customData: {},
  paymentHistory: [],
  /** Campamentos: se bautiza en el evento; conteo por Teens / Jóvenes (servidor Ambos elige baptismSegment). */
  willBeBaptized: 'No',
  baptismSegment: '',
  /** Ambos: 'Teens' | 'Jóvenes' | '' — dónde sirve; en el otro segmento va como campista (precio mixto). */
  ambosServeInSegment: '',
  llegaEnCarro: false,
  regresaEnCarro: false,
  carrosLlegada: 1,
  transportType: 'Camión',
  isMarried: 'No',
  spouseName: '',
  /** Id de `app_participants` de la pareja ya inscrita; vacío si aún no registra o solo hay nombre/tel. */
  spouseParticipantId: '',
  /** Teléfono de la pareja cuando aún no hay segundo registro (texto libre). */
  spousePhone: '',
  goesWithChildren: 'No',
  childrenCount: '',
  servedOtherCampa: 'No',
  servedAreas: '',
  preferredServeArea: '',
  servesInCongress: 'No',
  congressServeArea: '',
  /** Asignación administrativa de área para servir (página Servidores). */
  assignedServeArea: '',
  travelFrom: '',
  travelTo: '',
  wantsBautizosFood: 'Si',
  wantsBautizosTransport: 'No',
  // Sección 3: ID único de persona (persiste entre eventos del mismo perfil)
  vnpPersonId: '',
  // Sección 1: Método / Servicio (para abono inicial y posterior)
  paymentMethod: 'Efectivo',
  paymentService: '',
  cardReference: '',
  /** Nuevo registro: se llenan cuando se precargó desde eventos anteriores. */
  preloadedFromPreviousEvents: false,
  preloadedFromEventIds: [],
  preloadedFromEventNames: [],
  /** '' = automático (primera campaña vigente hoy que aplique); si no, id de campaña elegida en el alta. */
  selectedDiscountCampaignId: '',
  /** Mismo teléfono principal que otro inscrito (p. ej. menor con contacto del adulto). Omite bloqueo anti-duplicado por teléfono. */
  allowSharedMainPhone: false,
  /** Bautizos: bautizado | servidor | empleado | cortesía (empleado/cortesía = sin costo de lista). */
  bautizosAttendanceType: 'bautizado',
  /** Bautizos: filas { id, name, relationship, wantsBautizosTransport, llegaEnCarro, regresaEnCarro, carrosLlegada, travelFrom, travelTo }. */
  bautizosCompanions: [],
  /** Campa / Bautizos: talla de playera para bautizados (CH, M, G, XL, XXL). */
  baptismShirtSize: '',
  /** LFPDPPP: consentimiento y trazabilidad del aviso de privacidad. */
  privacyNoticeVersion: '',
  privacyNoticeAcceptedAt: '',
  privacyNoticeChannel: '',
  sensitiveDataConsent: '',
  sensitiveDataConsentAt: '',
};

/** Vacío a efectos de merge importación → borrador (valores distintos de vacío en el formulario tienen prioridad). */
const isRegistrationDraftValueEmpty = (val) => {
  if (val == null) return true;
  if (typeof val === 'boolean') return false;
  if (typeof val === 'number') return !Number.isFinite(val);
  if (Array.isArray(val)) return val.length === 0;
  if (typeof val === 'object') return Object.keys(val).length === 0;
  return String(val).trim() === '';
};

/**
 * Campos del borrador actual que deben conservarse frente a una nueva precarga (perfil u otro origen).
 * Si el valor sigue igual que la plantilla vacía y el import trae dato distinto, prevalece lo importado.
 */
const pickCurrentRegistrationOverrides = (imported, current) => {
  const o = {};
  for (const key of Object.keys(EMPTY_ENTRY)) {
    if (key === 'customData' || key === 'paymentHistory') continue;
    const v = current[key];
    if (isRegistrationDraftValueEmpty(v)) continue;
    const def = EMPTY_ENTRY[key];
    if (Object.prototype.hasOwnProperty.call(EMPTY_ENTRY, key) && v === def) {
      const imp = imported[key];
      if (!isRegistrationDraftValueEmpty(imp) && imp !== v) continue;
    }
    o[key] = v;
  }
  return o;
};

/**
 * Combina datos importados (otro evento, archivo u origen externo) con el borrador del formulario de nuevo registro.
 * Prioridad a lo ya capturado o elegido en el formulario; el resto se rellena con lo importado.
 */
export const mergeNewRegistrationWithImport = (imported, current) => {
  if (!imported || typeof imported !== 'object') {
    return current && typeof current === 'object' ? { ...current } : { ...EMPTY_ENTRY };
  }
  if (!current || typeof current !== 'object') return { ...imported };

  const impC = imported.customData && typeof imported.customData === 'object' ? imported.customData : {};
  const curC = current.customData && typeof current.customData === 'object' ? current.customData : {};
  const mergedCustom = { ...impC };
  for (const ck of new Set([...Object.keys(impC), ...Object.keys(curC)])) {
    const cv = curC[ck];
    mergedCustom[ck] = isRegistrationDraftValueEmpty(cv) ? impC[ck] : cv;
  }

  const overrides = pickCurrentRegistrationOverrides(imported, current);
  const out = {
    ...imported,
    ...overrides,
    customData: mergedCustom,
    paymentHistory: [],
    llegaEnCarro: imported.llegaEnCarro,
    regresaEnCarro: imported.regresaEnCarro,
    preloadedFromPreviousEvents: !!imported.preloadedFromPreviousEvents,
    preloadedFromEventIds: Array.isArray(imported.preloadedFromEventIds) ? [...imported.preloadedFromEventIds] : [],
    preloadedFromEventNames: Array.isArray(imported.preloadedFromEventNames) ? [...imported.preloadedFromEventNames] : [],
  };
  if (!isRegistrationDraftValueEmpty(current.paidNet)) out.paidNet = current.paidNet;
  return out;
};

const LAST_SUCCESSFUL_REG_FORM_PREFIX = 'vnpm_last_registration_form';

export const lastSuccessfulRegFormStorageKey = (userId, eventId) =>
  `${LAST_SUCCESSFUL_REG_FORM_PREFIX}:${String(userId || 'anon')}:${String(eventId || '')}`;

/** Deja el borrador listo para un nuevo alta (sin reutilizar VNPM ni abonos del intento anterior). */
export const stripEntrySnapshotForNewRegistrationDraft = (entry) => {
  if (!entry || typeof entry !== 'object') return { ...EMPTY_ENTRY };
  const o = { ...entry };
  o.vnpPersonId = '';
  o.paid = '';
  o.paidNet = '';
  o.paymentHistory = [];
  o.cardReference = '';
  o.preloadedFromPreviousEvents = false;
  o.preloadedFromEventIds = [];
  o.preloadedFromEventNames = [];
  o.responsivaStatus = '';
  o.spouseParticipantId = '';
  o.allowSharedMainPhone = false;
  if (Array.isArray(o.bautizosCompanions)) {
    o.bautizosCompanions = o.bautizosCompanions.map((c) => {
      if (!c || typeof c !== 'object') return c;
      const row = { ...c };
      if (isBautizosCompanionBaptized(row)) row.vnpPersonId = '';
      return row;
    });
  }
  return o;
};

export const persistLastSuccessfulRegistrationSnapshot = (userId, eventId, entryPayload, extras = {}) => {
  if (typeof window === 'undefined' || !userId || !eventId || !entryPayload) return;
  try {
    const stripped = stripEntrySnapshotForNewRegistrationDraft(entryPayload);
    window.localStorage.setItem(
      lastSuccessfulRegFormStorageKey(userId, eventId),
      JSON.stringify({
        savedAt: Date.now(),
        entry: stripped,
        newRegGeneralComment:
          typeof extras.newRegGeneralComment === 'string' ? extras.newRegGeneralComment : '',
        newRegDraftCarMeta:
          extras.newRegDraftCarMeta &&
          typeof extras.newRegDraftCarMeta === 'object' &&
          !Array.isArray(extras.newRegDraftCarMeta)
            ? extras.newRegDraftCarMeta
            : {},
      })
    );
  } catch {
    /* ignore quota / private mode */
  }
};

const REGISTRATION_FORM_DRAFT_PREFIX = 'vnpm_registration_form_draft';

export const registrationFormDraftStorageKey = (userId, eventId) =>
  `${REGISTRATION_FORM_DRAFT_PREFIX}:${String(userId || '')}:${String(eventId || '')}`;

export function persistRegistrationFormDraft(userId, eventId, payload) {
  if (typeof window === 'undefined' || !userId || !eventId || !payload) return;
  try {
    window.localStorage.setItem(
      registrationFormDraftStorageKey(userId, eventId),
      JSON.stringify({ savedAt: Date.now(), ...payload })
    );
  } catch {
    /* quota / private mode */
  }
}

export function clearRegistrationFormDraft(userId, eventId) {
  if (typeof window === 'undefined' || !userId || !eventId) return;
  try {
    window.localStorage.removeItem(registrationFormDraftStorageKey(userId, eventId));
  } catch {
    /* */
  }
}
