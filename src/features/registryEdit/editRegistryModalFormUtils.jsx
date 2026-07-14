import React from 'react';
import {
  CheckCircle2, AlertCircle, Clock, Copy, FileSignature, Briefcase, Gift, Church,
} from 'lucide-react';
import { SI_LABEL } from '../../appConstants.js';
import { isSiValue as isSiValueShared } from '../../publicRegistrationLogic.js';
import { attendanceSpecialChoiceButtonClass } from '../../publicRegistrationLogic.js';
import {
  participantAgeBracketForResponsiva,
  isResponsivaDigitalEnabledForEvent,
  isResponsivaDigitalActiveForParticipant,
  getResponsivaParticipantRowApplies,
} from '../../responsivaSignLogic.js';
import { normalizeBirthDateToIso } from '../../birthDateIsoUtils.js';
import { formFieldStack } from '../../formFieldClasses.js';
import { uiRosterMobile } from '../../ui/uiFormatClasses.js';
import { emitGlobalSystemAlert } from '../../globalSystemAlertsBridge.js';

export const fieldStack = formFieldStack;

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

export const hasValidFullName = (fullName) => {
  const parts = String(fullName || '')
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean);
  return parts.length >= 3;
};

export const isValidPhone = (phone) =>
  phone.startsWith('+') ? phone.length > 5 : phone.replace(/\D/g, '').length === 10;

export const resolveLlegaEnCarro = (personLike) => {
  if (typeof personLike?.llegaEnCarro === 'boolean') return personLike.llegaEnCarro;
  if (isSiValueShared(personLike?.llegaEnCarro)) return true;
  if (personLike?.llegaEnCarro === 'No') return false;
  return (personLike?.transportType || 'Camión') === 'Carro';
};

export const resolveRegresaEnCarro = (personLike) => {
  if (typeof personLike?.regresaEnCarro === 'boolean') return personLike.regresaEnCarro;
  if (isSiValueShared(personLike?.regresaEnCarro)) return true;
  if (personLike?.regresaEnCarro === 'No') return false;
  return (personLike?.transportType || 'Camión') === 'Carro';
};

export function CopyButton({ text, label }) {
  if (!text || String(text).trim() === '' || String(text).trim() === '—') return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        navigator.clipboard
          .writeText(String(text).trim())
          .then(() => emitGlobalSystemAlert(`¡${label} copiado!`, { tone: 'success', ms: 2000 }))
          .catch(() => emitGlobalSystemAlert('Error al copiar', { tone: 'warn', ms: 2000 }));
      }}
      className="ml-1.5 p-0.5 inline-flex items-center justify-center rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all active:scale-90 cursor-pointer"
      title={`Copiar ${label}`}
    >
      <Copy size={12} className="shrink-0" />
    </button>
  );
}

export const GENDERS = ['Hombre', 'Mujer'];
export const RESPONSIVA_STATUSES = ['Pendiente', 'Entregada'];
export const DEFAULT_SERVE_AREA_OPTIONS = ['Jueces', 'Capitanes', 'Staff', 'Seguridad', 'Otro'];
export const DEFAULT_ALLERGY_OPTIONS = ['Alimentos', 'Medicamentos', 'Ambientales', 'Insectos', 'Otra'];

export const ATTENDANCE_SPECIAL = {
  ninguno: 'ninguno',
  empleado: 'empleado',
  cortesia: 'cortesia',
  pastor: 'pastor',
};

export const isFreeAttendanceType = (t) =>
  t === ATTENDANCE_SPECIAL.empleado ||
  t === ATTENDANCE_SPECIAL.cortesia ||
  t === ATTENDANCE_SPECIAL.pastor;

export const normalizeAttendanceSpecial = (personLike) => {
  const t = personLike?.attendanceSpecialType;
  if (
    t === ATTENDANCE_SPECIAL.empleado ||
    t === ATTENDANCE_SPECIAL.cortesia ||
    t === ATTENDANCE_SPECIAL.pastor
  ) {
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

export { attendanceSpecialChoiceButtonClass };

export const SI = 'Si';
export const isSiValue = isSiValueShared;
export const formatSiNo = (v) => (isSiValue(v) ? SI_LABEL : 'No');

export const parsePreferredServeArea = (str, knownOpts = DEFAULT_SERVE_AREA_OPTIONS) => {
  const raw = String(str || '').trim();
  if (!raw) return { selected: new Set(), otroText: '' };
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
  const selected = new Set();
  let otroText = '';
  for (const p of parts) {
    const m = p.match(/^Otro:\s*(.+)$/i);
    if (m) {
      selected.add('Otro');
      otroText = m[1].trim();
    } else if (knownOpts.includes(p)) {
      selected.add(p);
    } else {
      selected.add('Otro');
      otroText = p;
    }
  }
  return { selected, otroText };
};

export const formatPreferredServeArea = (selected, otroText) => {
  const arr = [...selected];
  return arr
    .map((s) => (s === 'Otro' && otroText ? `Otro: ${otroText}` : s))
    .join(', ');
};

export const isValidDiscountCampaignRow = (c) =>
  !!(
    c &&
    c.enabled !== false &&
    String(c.concept || '').trim() &&
    (Number(c.finalAmount) || 0) > 0
  );

export const findDiscountCampaignById = (eventLike, id) => {
  if (id == null || id === '') return null;
  const all = Array.isArray(eventLike?.discountCampaigns) ? eventLike.discountCampaigns : [];
  return all.find((x) => String(x.id) === String(id)) || null;
};

export const participantIsArchived = (p) => (p?.status || 'active') === 'archived';
export const participantIsCancelled = (p) => (p?.status || 'active') === 'cancelled';

export function getResponsivaCardUiState(person, eventLike) {
  if (!getResponsivaParticipantRowApplies(person, eventLike)) {
    return { applies: false };
  }
  const rd =
    person?.responsivaDigital && typeof person.responsivaDigital === 'object'
      ? person.responsivaDigital
      : {};
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
    isResponsivaDigitalEnabledForEvent(eventLike) &&
    isResponsivaDigitalActiveForParticipant(person, eventLike);
  let digitalPhase = null;
  if (digitalEnabled) {
    if (delivered) digitalPhase = 'delivered';
    else if (rd.lastSignLinkSentAt) digitalPhase = 'pending_sign';
    else digitalPhase = 'needs_link';
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

function getResponsivaDigitalPipelineState(person, eventLike) {
  if (!eventLike || !getResponsivaParticipantRowApplies(person, eventLike)) return { applies: false };
  if (!isResponsivaDigitalActiveForParticipant(person, eventLike)) return { applies: false };
  const rd =
    person?.responsivaDigital && typeof person.responsivaDigital === 'object'
      ? person.responsivaDigital
      : {};
  const hasDigitalSig = !!(rd.submittedAt || rd.signatureDataUrl);
  const isLocal = rd.method === 'local' && !!(rd.recordedAt || rd.signedLocallyAt);
  const statusOk = String(person?.responsivaStatus || '').trim() === 'Entregada';
  const delivered = statusOk || hasDigitalSig || isLocal;
  if (delivered) return { applies: true, phase: 'delivered' };
  if (rd.lastSignLinkSentAt) return { applies: true, phase: 'pending_sign' };
  return { applies: true, phase: 'needs_link' };
}

const ROSTER_RESPONSIVA_WA_CLASS =
  'border border-sky-700 bg-sky-600 text-white hover:bg-sky-700 shadow-sm transition-colors disabled:opacity-55 disabled:cursor-not-allowed disabled:hover:bg-sky-600';
const ROSTER_RESPONSIVA_LOCAL_CLASS =
  'border border-slate-400 bg-slate-100 text-slate-800 hover:bg-slate-200 shadow-sm transition-colors disabled:opacity-55 disabled:cursor-not-allowed';
const ROSTER_QUICK_ACTION_BTN_BASE =
  'inline-flex shrink-0 items-center justify-center whitespace-nowrap px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all shadow-sm active:scale-[0.98]';
const ROSTER_QUICK_ACTION_ICON_PROPS = { size: 14, className: 'inline mr-1 shrink-0' };
const ROSTER_MOBILE_CHIP_ICON = 12;

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
  const label = busy ? 'Enviando' : st.phase === 'delivered' ? 'Entregada' : st.phase === 'pending_sign' ? 'Pendiente' : 'Enlace';
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
          variant === 'modal' || variant === 'chip' ? 'shrink-0' : ROSTER_QUICK_ACTION_ICON_PROPS.className
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
          variant === 'modal' || variant === 'chip' ? 'shrink-0' : ROSTER_QUICK_ACTION_ICON_PROPS.className
        }
        aria-hidden
      />
      <span className={variant === 'compact' ? 'hidden sm:inline' : ''}>
        {busy ? '…' : variant === 'chip' ? 'En sitio' : 'Local'}
      </span>
    </button>
  );
}
