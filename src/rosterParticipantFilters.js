/**
 * Filtros de lista de participantes (roster / registro global): claves extra y lógica por tipo de evento.
 */
import { isSiValue } from './publicRegistrationLogic.js';
import {
  BLOOD_TYPE_STATS_OTHER,
  BLOOD_TYPE_UNSPECIFIED,
  BLOOD_TYPES_ABO_RH,
  classifyBloodTypeForStats,
} from './registrationFormShared.js';
import { personLikeIsPersonOfInterest } from './vnpPersonFlags.js';

/** Estado de registro (activo / lista de espera / cancelado) en filtros anidados. */
export const REGISTRATION_STATUS_FILTER_OPTIONS = Object.freeze([
  { id: 'all', label: 'Todos' },
  { id: 'active', label: 'Activo' },
  { id: 'waitlist', label: 'Lista de espera' },
  { id: 'cancelled', label: 'Cancelado' },
]);

/** Claves añadidas a createEmptyLocationRosterFilters / registro global. */
export const ROSTER_EXTRA_FILTER_KEYS = [
  'filterBloodType',
  'filterDiscountCampaign',
  'filterCustomFieldKey',
  'filterCustomFieldPresence',
  'filterAge',
  'filterPersonOfInterest',
];

export const ROSTER_EXTRA_FILTER_DEFAULTS = Object.freeze({
  filterBloodType: 'all',
  filterDiscountCampaign: 'all',
  filterCustomFieldKey: 'all',
  filterCustomFieldPresence: 'all',
  filterAge: 'all',
  filterPersonOfInterest: 'all',
});

export function participantMatchesRegistrationStatusFilter(personLike, filterId) {
  const id = String(filterId || 'all').trim();
  if (!id || id === 'all') return true;
  const st = personLike?.status || 'active';
  if (id === 'active') return st === 'active';
  if (id === 'waitlist') return st === 'waitlist';
  if (id === 'cancelled') return st === 'cancelled';
  return true;
}

export const DROPDOWN_FILTER_COUNT_KEYS = Object.freeze([
  'filterRegistrationStatus',
  'filterTransport',
  'filterAge',
  'filterLiquidation',
  'filterWhatsAppPending',
  'filterFirstTimeId',
  'filterPendingRefund',
  'filterResponsiva',
  'filterPersonOfInterest',
]);

/** @deprecated Alias de compatibilidad. */
export const BAUTIZOS_DROPDOWN_FILTER_COUNT_KEYS = DROPDOWN_FILTER_COUNT_KEYS;

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

export function participantMatchesAgeFilter(personLike, filterId) {
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

/** Personas de interés (marca global VNPM) en filtros anidados. */
export const PERSON_OF_INTEREST_FILTER_OPTIONS = Object.freeze([
  { id: 'all', label: 'Todos' },
  { id: 'marked', label: 'Marcadas como de interés' },
  { id: 'not-marked', label: 'Sin marca de interés' },
]);

/**
 * Aplica filtros dependientes del tipo de evento sobre `processedData` (ya filtrado por criterios comunes).
 */
export function applyEventScopedRosterFilters(processedData, f, ctx) {
  let rows = processedData;
  const { isCampa, isGeneral, customFields } = ctx;

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
