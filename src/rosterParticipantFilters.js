/**
 * Filtros de lista de participantes (roster / registro global): claves extra y lógica por tipo de evento.
 */
import {
  BAUTIZOS_ATTENDANCE,
  expandBautizosGlobalRegistryRows,
  expandBautizosWaitlistRegistryRows,
  getBautizosCompanionsArray,
  normalizeBautizosAttendanceType,
} from './bautizosParty.js';
import { isSiValue } from './publicRegistrationLogic.js';
import {
  BLOOD_TYPE_STATS_OTHER,
  BLOOD_TYPE_UNSPECIFIED,
  BLOOD_TYPES_ABO_RH,
  classifyBloodTypeForStats,
} from './registrationFormShared.js';
import { personLikeIsPersonOfInterest } from './vnpPersonFlags.js';
import { participantMatchesCarDataPendingFilter } from './carDataWhatsApp.js';

/** Estado de registro (activo / lista de espera / cancelado) en filtros anidados. */
export const REGISTRATION_STATUS_FILTER_OPTIONS = Object.freeze([
  { id: 'all', label: 'Todos' },
  { id: 'active', label: 'Activo' },
  { id: 'waitlist', label: 'Lista de espera' },
  { id: 'cancelled', label: 'Cancelado' },
]);

/** Claves añadidas a createEmptyLocationRosterFilters / registro global. */
export const ROSTER_EXTRA_FILTER_KEYS = [
  'filterBautizosAttendance',
  'filterBloodType',
  'filterBautizosFood',
  'filterBautizosTransport',
  'filterBautizosCompanions',
  'filterDiscountCampaign',
  'filterCustomFieldKey',
  'filterCustomFieldPresence',
  'filterAge',
  'filterPersonOfInterest',
  'filterCarDataPending',
];

export const ROSTER_EXTRA_FILTER_DEFAULTS = Object.freeze({
  filterBautizosAttendance: 'all',
  filterBloodType: 'all',
  filterBautizosFood: 'all',
  filterBautizosTransport: 'all',
  filterBautizosCompanions: 'all',
  filterDiscountCampaign: 'all',
  filterCustomFieldKey: 'all',
  filterCustomFieldPresence: 'all',
  filterAge: 'all',
  filterPersonOfInterest: 'all',
  filterCarDataPending: 'all',
});

/** Tipo de asistencia (evento Bautizos) en filtros anidados. */
export const BAUTIZOS_ATTENDANCE_FILTER_OPTIONS = Object.freeze([
  { id: 'all', label: 'Todos' },
  { id: BAUTIZOS_ATTENDANCE.bautizado, label: 'Bautizados' },
  { id: 'companions', label: 'Acompañante' },
  { id: BAUTIZOS_ATTENDANCE.asistente, label: 'Asistente' },
  { id: BAUTIZOS_ATTENDANCE.servidor, label: 'Servidor' },
  { id: BAUTIZOS_ATTENDANCE.empleado, label: 'Empleado' },
  { id: BAUTIZOS_ATTENDANCE.cortesia, label: 'Cortesía' },
]);

/** Transporte Bautizos: camión del evento vs llegada en carro. */
export const BAUTIZOS_TRANSPORT_FILTER_OPTIONS = Object.freeze([
  { id: 'all', label: 'Todos' },
  { id: 'evento', label: 'Evento' },
  { id: 'carro', label: 'Carro' },
]);

export const BAUTIZOS_AGE_FILTER_OPTIONS = Object.freeze([
  { id: 'all', label: 'Todos' },
  { id: 'minor', label: 'Menor de edad' },
  { id: 'adult', label: 'Mayor de edad' },
]);

/** Personas de interés (marca global VNPM) en filtros anidados. */
export const PERSON_OF_INTEREST_FILTER_OPTIONS = Object.freeze([
  { id: 'all', label: 'Todos' },
  { id: 'marked', label: 'Marcadas como de interés' },
  { id: 'not-marked', label: 'Sin marca de interés' },
]);

/** Claves que cuentan para el badge de filtros activos (evento Bautizos). */
export function participantMatchesRegistrationStatusFilter(personLike, filterId) {
  const id = String(filterId || 'all').trim();
  if (!id || id === 'all') return true;
  const st = personLike?.status || 'active';
  if (id === 'active') return st === 'active';
  if (id === 'waitlist') return st === 'waitlist';
  if (id === 'cancelled') return st === 'cancelled';
  return true;
}

export const BAUTIZOS_DROPDOWN_FILTER_COUNT_KEYS = Object.freeze([
  'filterRegistrationStatus',
  'filterBautizosAttendance',
  'filterTransport',
  'filterAge',
  'filterLiquidation',
  'filterWhatsAppPending',
  'filterFirstTimeId',
  'filterPendingRefund',
  'filterResponsiva',
  'filterPersonOfInterest',
  'filterCarDataPending',
]);

const filterOptionActive = (id) => {
  const s = String(id ?? 'all').trim();
  return !!s && s !== 'all';
};

export const BLOOD_TYPE_FILTER_OPTIONS = Object.freeze([
  { id: 'all', label: 'Todos' },
  { id: 'unspecified', label: 'Sin especificar' },
  ...BLOOD_TYPES_ABO_RH.map((bt) => ({ id: bt, label: bt })),
  { id: 'other', label: 'Otro (no estándar)' },
]);

function participantHasDiscountCampaign(p) {
  return !!(
    String(p?.discountCampaignId || '').trim() ||
    String(p?.selectedDiscountCampaignId || '').trim()
  );
}

export function participantHasNamedBautizosCompanions(p) {
  return getBautizosCompanionsArray(p).some((c) => String(c?.name || '').trim());
}

function participantCustomFieldPresence(p, fieldKey) {
  const val = String(p?.customData?.[fieldKey] ?? '').trim();
  return !!val;
}

/** Edad en años para filtros (campo `age` o `birthDate`). */
export function getParticipantAgeYearsForFilter(p) {
  if (!p) return NaN;
  const direct = parseInt(p.age, 10);
  if (Number.isFinite(direct) && direct >= 0) return direct;
  const raw = String(p.birthDate || '').trim();
  if (!raw) return NaN;
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return NaN;
  const b = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(b.getTime())) return NaN;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const monthDiff = now.getMonth() - b.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < b.getDate())) age -= 1;
  return Number.isFinite(age) && age >= 0 && age <= 120 ? age : NaN;
}

/** Coincide con filtro de tipo de asistencia Bautizos (incl. filas virtuales de Registro global). */
export function participantMatchesBautizosAttendanceFilter(personLike, filterId) {
  const id = String(filterId || 'all').trim();
  if (!id || id === 'all') return true;
  const virtualKind = String(personLike?.__virtualKind || '').trim();
  if (id === 'companions') {
    return virtualKind === 'companion' || personLike?._isCompanionWaitlistVirtual === true;
  }
  if (id === BAUTIZOS_ATTENDANCE.bautizado) {
    if (virtualKind === 'companion') return false;
    if (virtualKind === 'companion-baptized') return true;
    return normalizeBautizosAttendanceType(personLike?.bautizosAttendanceType) === BAUTIZOS_ATTENDANCE.bautizado;
  }
  if (virtualKind) return false;
  return normalizeBautizosAttendanceType(personLike?.bautizosAttendanceType) === id;
}

/**
 * Transporte Bautizos usando `filterTransport`: evento = camión del evento; carro = llega en carro.
 * Acepta ids legados go-bus / go-car por registros guardados.
 */
export function participantMatchesBautizosTransportFilter(personLike, filterId, resolveLlegaEnCarro) {
  const id = String(filterId || 'all').trim();
  if (!id || id === 'all') return true;
  const car = typeof resolveLlegaEnCarro === 'function' ? resolveLlegaEnCarro(personLike) : false;
  if (id === 'carro' || id === 'go-car') return car;
  if (id === 'evento' || id === 'go-bus') return isSiValue(personLike?.wantsBautizosTransport) && !car;
  return true;
}

export function participantMatchesBautizosAgeFilter(personLike, filterId) {
  const id = String(filterId || 'all').trim();
  if (!id || id === 'all') return true;
  const age = getParticipantAgeYearsForFilter(personLike);
  if (!Number.isFinite(age)) return false;
  if (id === 'minor') return age < 18;
  if (id === 'adult') return age >= 18;
  return true;
}

export function participantMatchesPersonOfInterestFilter(personLike, filterId, interestSet, opts = {}) {
  const id = String(filterId || 'all').trim();
  if (!id || id === 'all') return true;
  const marked = personLikeIsPersonOfInterest(personLike, interestSet, opts);
  if (id === 'marked') return marked;
  if (id === 'not-marked') return !marked;
  return true;
}

/**
 * Filtros que solo aplican a titulares (antes de expandir acompañantes canónicos).
 */
export function applyTitularOnlyBautizosRosterFilters(rows, f) {
  let r = rows;
  if (f.filterBautizosCompanions === 'with') {
    r = r.filter((p) => participantHasNamedBautizosCompanions(p));
  } else if (f.filterBautizosCompanions === 'without') {
    r = r.filter((p) => !participantHasNamedBautizosCompanions(p));
  }
  return r;
}

/**
 * Expande titulares a filas virtuales (plan canónico del dashboard) para que el listado
 * y los filtros de tipo de asistencia incluyan bautizados + acompañantes por separado.
 */
function partitionRowsByRegistrationStatus(rows) {
  const active = [];
  const waitlist = [];
  const rest = [];
  for (const p of rows || []) {
    const st = p?.status || 'active';
    if (st === 'active') active.push(p);
    else if (st === 'waitlist') waitlist.push(p);
    else rest.push(p);
  }
  return { active, waitlist, rest };
}

export function prepareBautizosRowsForRosterFilter(rows, f, { roster } = {}) {
  const rosterList = Array.isArray(roster) ? roster : rows;
  const regStatus = String(f?.filterRegistrationStatus || 'all').trim();
  if (regStatus === 'waitlist') {
    return expandBautizosWaitlistRegistryRows(rows, rosterList);
  }
  if (regStatus === 'active') {
    return expandBautizosGlobalRegistryRows(rows, rosterList);
  }
  if (regStatus === 'cancelled') {
    return expandBautizosGlobalRegistryRows(rows, rosterList);
  }
  const { active, waitlist, rest } = partitionRowsByRegistrationStatus(rows);
  const cancelled = [];
  const other = [];
  for (const p of rest) {
    if ((p?.status || 'active') === 'cancelled') cancelled.push(p);
    else other.push(p);
  }
  return [
    ...expandBautizosGlobalRegistryRows(active, rosterList),
    ...expandBautizosWaitlistRegistryRows(waitlist, rosterList),
    ...expandBautizosGlobalRegistryRows(cancelled, rosterList),
    ...other,
  ];
}

/** @deprecated Usar prepareBautizosRowsForRosterFilter */
export const prepareBautizosRowsForCompanionAttendanceFilter = prepareBautizosRowsForRosterFilter;

/**
 * Aplica filtros dependientes del tipo de evento sobre `processedData` (ya filtrado por criterios comunes).
 */
export function applyEventScopedRosterFilters(processedData, f, ctx) {
  let rows = processedData;
  const { isCampa, isBautizos, isGeneral, customFields, resolveLlegaEnCarro, eventSnapshot, roster } = ctx;

  if (isCampa) {
    if (filterOptionActive(f.filterSwim)) {
      rows = rows.filter((p) => p.canSwim === f.filterSwim);
    }
    if (f.filterMedical === 'allergy') rows = rows.filter((p) => isSiValue(p.hasAllergy));
    else if (f.filterMedical === 'disease') rows = rows.filter((p) => isSiValue(p.hasDisease));
    else if (f.filterMedical === 'disability') rows = rows.filter((p) => isSiValue(p.hasDisability));

    if (filterOptionActive(f.filterBloodType)) {
      rows = rows.filter((p) => {
        const cls = classifyBloodTypeForStats(p.bloodType);
        if (f.filterBloodType === 'unspecified') return cls === BLOOD_TYPE_UNSPECIFIED;
        if (f.filterBloodType === 'other') return cls === BLOOD_TYPE_STATS_OTHER;
        return cls === f.filterBloodType;
      });
    }
  }

  if (isBautizos) {
    if (filterOptionActive(f.filterBautizosAttendance)) {
      rows = rows.filter((p) => participantMatchesBautizosAttendanceFilter(p, f.filterBautizosAttendance));
    }
    if (filterOptionActive(f.filterAge)) {
      rows = rows.filter((p) => participantMatchesBautizosAgeFilter(p, f.filterAge));
    }
    if (filterOptionActive(f.filterBautizosFood)) {
      const wantSi = f.filterBautizosFood === 'Si' || f.filterBautizosFood === 'Sí';
      rows = rows.filter((p) => isSiValue(p.wantsBautizosFood) === wantSi);
    }
    if (filterOptionActive(f.filterBautizosTransport) && !filterOptionActive(f.filterTransport)) {
      const wantSi = f.filterBautizosTransport === 'Si' || f.filterBautizosTransport === 'Sí';
      rows = rows.filter((p) => isSiValue(p.wantsBautizosTransport) === wantSi);
    }
    if (f.filterCarDataPending === 'pending') {
      rows = rows.filter((p) => participantMatchesCarDataPendingFilter(p, eventSnapshot, roster));
    }
  }

  if (isCampa || isGeneral) {
    if (f.filterDiscountCampaign === 'with') {
      rows = rows.filter((p) => participantHasDiscountCampaign(p));
    } else if (f.filterDiscountCampaign === 'without') {
      rows = rows.filter((p) => !participantHasDiscountCampaign(p));
    } else if (f.filterDiscountCampaign !== 'all') {
      const cid = String(f.filterDiscountCampaign);
      rows = rows.filter(
        (p) =>
          String(p.discountCampaignId || '') === cid ||
          String(p.selectedDiscountCampaignId || '') === cid
      );
    }
  }

  if (isGeneral && Array.isArray(customFields) && customFields.length > 0) {
    const fieldKey = f.filterCustomFieldKey;
    const presence = f.filterCustomFieldPresence;
    if (fieldKey && fieldKey !== 'all' && presence && presence !== 'all') {
      rows = rows.filter((p) => {
        const filled = participantCustomFieldPresence(p, fieldKey);
        if (presence === 'filled') return filled;
        if (presence === 'empty') return !filled;
        return true;
      });
    }
  }

  return rows;
}
