import { formatNosVemosDateLabel } from './eventDateHelpers.js';
import { SI_LABEL } from './appConstants.js';
import { WA_EMOJI as E } from './whatsappEmojiConstants.js';
import { getBautizosCompanionsArray } from './bautizosParty.js';
import { getBautizosCompanionInformativeListPrice, getBautizosTitularListPrice } from './publicRegistrationLogic.js';
import { dedupeUnsentCarDataNotifications } from './carDataWhatsApp.js';
import {
  buildCarDataWaSubjectContext,
  carCrewRequiresPassengerSelection,
} from './bautizosCarMeta.js';
import {
  buildBautizosPartyDetailedLines,
  buildBautizosTransportSummaryLines,
  buildBautizosFinanceStatusLines,
  buildBautizosPerLineLiquidationLines,
  buildPaymentDeadlineAndRefundBlock,
  buildCarDataStatusLines,
  buildWaMessageHeader,
  resolveWaOrgContactLabel,
  resolvePromotedCompanionNames,
  formatPaymentDeadlineLabel,
} from './whatsappBautizosStatusBlocks.js';

export { resolveVnOfficeContactLabel } from './whatsappBautizosStatusBlocks.js';

const SI_CANON = 'Si';

/** Alineado con `isSiValue` en App.jsx (valor guardado típico `Si`). */
function isSiStored(v) {
  if (v === true) return true;
  const s = String(v ?? '').trim();
  if (!s) return false;
  if (s === SI_CANON || s === SI_LABEL) return true;
  const lower = s.toLowerCase();
  return lower === 'si' || lower === 'sí' || lower === 'yes' || lower === 'true';
}

/** Nota al pie en avisos con datos financieros o confirmación de alta de registro. */
export const WA_FINANCE_REGISTRATION_REVIEW_NOTE =
  '¡Por favor revisa que TODA la información sea correcta y no falte nada! Cualquier duda contáctanos por este medio.';

/** Pie LFPDPPP en mensajes WhatsApp con datos de registro. */
export function appendPrivacyFooter(text, avisoUrl) {
  const url = String(avisoUrl || '').trim();
  const base = String(text || '').trim();
  if (!url) return base;
  if (/aviso de privacidad/i.test(base)) return base;
  return `${base}\n\nEste mensaje contiene datos de registro del evento. Consulte nuestro aviso de privacidad: ${url}`;
}

/** Cierra bloques unificados (finanzas, promoción, beca; y formato anterior sin la nota). */
const RE_CLOSING_UNIFIED =
  /(\n*¡Por favor revisa que TODA la información sea correcta y no falte nada! Cualquier duda contáctanos por este medio\.\s*|\n*(\u{1F4AC}\s*)?(Cualquier duda, estamos para servirte\.?|Gracias\.?)\s*)+$/iu;

/**
 * @param {number|string} n
 */
export function formatFinanceMoneyMx(n) {
  return Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Fecha/hora MX + sede (misma línea que pide la plantilla).
 * @param {number} reportedAtMs
 * @param {string} loc
 */
export function formatFinanceDateTimeWithLocation(reportedAtMs, loc) {
  const base = new Date(Number(reportedAtMs) || Date.now()).toLocaleString('es-MX');
  const sede = String(loc || '').trim();
  return sede ? `${base}, sede ${sede}` : base;
}

/**
 * Texto para «Nos vemos el …» (solo primer día; Campa según segmento del participante).
 * @param {object} eventSnapshot
 * @param {object} [person]
 */
export function eventDateLabelForNosVemos(eventSnapshot, person) {
  if (!eventSnapshot) return '';
  const raw = formatNosVemosDateLabel(eventSnapshot, person);
  return raw && raw !== '—' ? raw : '';
}

export function isCampaEventType(eventSnapshot) {
  return String(eventSnapshot?.eventType || '') === 'Campa';
}

export function isBautizosEventType(eventSnapshot) {
  return String(eventSnapshot?.eventType || '') === 'Bautizos';
}

/**
 * Líneas de desglose de lista para el registro raíz (titular + cada acompañante con nombre).
 * @param {object} person
 * @param {object} eventSnapshot
 * @param {object[]|null|undefined} [rosterParticipants]
 * @returns {string[]}
 */
export function buildBautizosPartyCostBreakdownLines(person, eventSnapshot, rosterParticipants = null) {
  if (!isBautizosEventType(eventSnapshot)) return [];
  if (String(person?.bautizosSplitPartyHostParticipantId || '').trim()) return [];

  const companions = getBautizosCompanionsArray(person).filter((c) => String(c?.name || '').trim());
  if (!companions.length) return [];

  const lines = [];

  const titularPrice = getBautizosTitularListPrice(person, eventSnapshot);
  lines.push(`    ${E.barChart} Titular (bautizado): $${formatFinanceMoneyMx(titularPrice)}`);

  companions.forEach((c, idx) => {
    const name = String(c?.name || '').trim();
    const price = getBautizosCompanionInformativeListPrice(c, eventSnapshot, rosterParticipants);
    const rel = String(c?.relationship || '').trim();
    const relSuffix =
      rel && rel !== 'Integrante del mismo registro' ? ` (${rel})` : '';
    lines.push(
      `    ${E.idBadge} Acompañante ${idx + 1}: ${name}${relSuffix} — $${formatFinanceMoneyMx(price)}`
    );
  });

  return lines;
}

/**
 * Titular + acompañantes con nombre (Bautizos, registro raíz).
 * @param {object} person
 * @param {object} eventSnapshot
 * @returns {string[]}
 */
export function buildBautizosPartyRosterLines(person, eventSnapshot) {
  if (!isBautizosEventType(eventSnapshot)) return [];
  if (String(person?.bautizosSplitPartyHostParticipantId || '').trim()) return [];

  const titularName = String(person?.name || '').trim();
  const companions = getBautizosCompanionsArray(person).filter((c) => String(c?.name || '').trim());
  if (!titularName && !companions.length) return [];

  const lines = [];
  if (titularName) {
    lines.push(`    ${E.idBadge} Titular (bautizado): ${titularName}`);
  }
  companions.forEach((c, idx) => {
    const name = String(c?.name || '').trim();
    const rel = String(c?.relationship || '').trim();
    const relSuffix = rel && rel !== 'Integrante del mismo registro' ? ` (${rel})` : '';
    lines.push(`    ${E.idBadge} Acompañante ${idx + 1}: ${name}${relSuffix}`);
  });
  return lines;
}

function appendBautizosPartyDetailedLines(lines, person, eventSnapshot, rosterParticipants = null, opts = {}) {
  const rosterLines = buildBautizosPartyDetailedLines(person, eventSnapshot, rosterParticipants, opts);
  if (rosterLines.length) lines.push(...rosterLines);
}

function appendBautizosTransportIfAny(lines, person, eventSnapshot, rosterParticipants = null) {
  const transportLines = buildBautizosTransportSummaryLines(
    person,
    eventSnapshot,
    eventSnapshot?.transportPlanning,
    rosterParticipants
  );
  if (transportLines.length) {
    lines.push('');
    lines.push(...transportLines);
  }
}

function resolvePaymentDeadlineFromContext(p, eventSnapshot) {
  return (
    String(p?.paymentDeadlineDate || '').trim() ||
    String(eventSnapshot?.paymentDeadlineDate || '').trim()
  );
}

/**
 * Monto total a liquidar conocido al momento del aviso (para ocultar bullets si costo 0).
 * @param {{ amount?: number, pendingAmount?: number, isLiquidado?: boolean, kind?: string, liquidationTarget?: number }} n
 */
export function resolveLiquidationTargetOnNotification(n) {
  if (n == null) return 0;
  if (n.liquidationTarget != null && Number.isFinite(Number(n.liquidationTarget))) {
    return Math.max(0, Number(n.liquidationTarget));
  }
  const amount = Number(n.amount) || 0;
  const pend = Number(n.pendingAmount) || 0;
  return Math.max(0, amount + pend);
}

/**
 * Mensaje financiero estándar (registro o abono).
 * @param {{
 *   person: object,
 *   loc: string,
 *   amount: number,
 *   pendingAmount: number,
 *   isLiquidado: boolean,
 *   kind: 'registro'|'abono',
 *   reportedAtMs?: number,
 *   liquidationTarget?: number|null,
 *   eventSnapshot: object,
 *   rosterParticipants?: object[]|null,
 * }} p
 */
export function buildFinanceWhatsAppMessage(p) {
  const {
    person,
    loc,
    amount,
    pendingAmount,
    isLiquidado,
    kind,
    reportedAtMs = Date.now(),
    liquidationTarget = null,
    eventSnapshot,
    rosterParticipants = null,
    avisoUrl = '',
    paymentDeadlineDate = '',
  } = p;

  const ev = eventSnapshot || {};
  const eventName = String(ev?.name || '').trim() || 'el evento';
  const personName = String(person?.name || '').trim() || '';
  const vnpId = String(person?.vnpPersonId || '').trim() || 'N/A';
  const repLoc = formatFinanceDateTimeWithLocation(reportedAtMs, loc);
  const liq =
    liquidationTarget != null && Number.isFinite(Number(liquidationTarget))
      ? Math.max(0, Number(liquidationTarget))
      : resolveLiquidationTargetOnNotification({ amount, pendingAmount, isLiquidado, kind, liquidationTarget });
  const showMoney = liq > 0.005;
  const amtTxt = formatFinanceMoneyMx(amount);
  const pendTxt = formatFinanceMoneyMx(pendingAmount);
  const nosVemos = isLiquidado ? eventDateLabelForNosVemos(ev, person) : '';
  const org = resolveWaOrgContactLabel(loc, ev);
  const deadline = resolvePaymentDeadlineFromContext({ paymentDeadlineDate }, ev);
  const hasDebt = !isLiquidado && Number(pendingAmount) > 0.005;

  const lines = [];

  if (kind === 'registro') {
    lines.push(
      buildWaMessageHeader({
        personName,
        officeLabel: org,
        purposeLine: `para notificarte que tu registro en ${eventName} ha sido exitoso. ${E.whiteCheck}`,
      })
    );
    lines.push('');
    lines.push(`    ${E.calendar} Fecha de registro: ${repLoc}`);
    lines.push(`    ${E.idBadge} Tu ID único es: ${vnpId}`);
    appendBautizosPartyDetailedLines(lines, person, eventSnapshot, rosterParticipants);
    appendBautizosTransportIfAny(lines, person, eventSnapshot, rosterParticipants);
    if (showMoney) {
      lines.push(`    ${E.dollarBanknote} Abono: $${amtTxt}`);
      lines.push(`    ${E.barChart} Saldo pendiente: ${isLiquidado ? `Liquidado ${E.checkMark}` : `$${pendTxt}`}`);
      const breakdown = buildBautizosPartyCostBreakdownLines(person, eventSnapshot, rosterParticipants);
      if (breakdown.length) {
        lines.push('');
        lines.push(`    ${E.card} Desglose de costos de lista:`);
        lines.push(...breakdown);
      }
      if (hasDebt) {
        lines.push(...buildBautizosPerLineLiquidationLines(person, eventSnapshot, amount, liq));
        lines.push(...buildPaymentDeadlineAndRefundBlock(ev, true, deadline));
      }
    }
    lines.push('');
    if (isLiquidado && nosVemos) {
      lines.push(`${E.partyPopper} ¡Nos vemos el ${nosVemos}! ${E.sparkles} ¡No faltes!`);
      lines.push('');
    }
    lines.push(WA_FINANCE_REGISTRATION_REVIEW_NOTE);
  } else if (kind === 'abono') {
    lines.push(
      `${E.wave} ¡Hola! ${personName}, se registró tu abono en ${eventName}. ${E.dollarBanknote}`
    );
    lines.push('');
    lines.push(`    ${E.calendar} Fecha y hora de abono: ${repLoc}`);
    lines.push(`    ${E.idBadge} Tu ID único es: ${vnpId}`);
    appendBautizosPartyDetailedLines(lines, person, eventSnapshot, rosterParticipants);
    lines.push(`    ${E.dollarBanknote} Abono aplicado: $${amtTxt}`);
    if (showMoney) {
      lines.push(`    ${E.barChart} Saldo pendiente: ${isLiquidado ? `Liquidado ${E.checkMark}` : `$${pendTxt}`}`);
      if (hasDebt) {
        lines.push(...buildBautizosPerLineLiquidationLines(person, eventSnapshot, liq - pendingAmount, liq));
      }
    }
    lines.push('');
    if (isLiquidado && nosVemos) {
      lines.push(`${E.partyPopper} ¡Nos vemos el ${nosVemos}! ${E.sparkles} ¡No faltes!`);
      lines.push('');
    }
    lines.push(WA_FINANCE_REGISTRATION_REVIEW_NOTE);
  } else {
    const amt = formatFinanceMoneyMx(amount);
    const pend = formatFinanceMoneyMx(pendingAmount);
    lines.push(`${E.wave} ¡Hola! ${personName}, movimiento registrado en ${eventName}.`);
    lines.push(`    ${E.calendar} Fecha: ${repLoc}`);
    lines.push(`    ${E.idBadge} Tu ID único es: ${vnpId}`);
    appendBautizosPartyDetailedLines(lines, person, eventSnapshot, rosterParticipants);
    lines.push(`    ${E.dollarBanknote} Monto: $${amt}`);
    lines.push(`    ${E.barChart} Saldo pendiente: ${isLiquidado ? `Liquidado ${E.checkMark}` : `$${pend}`}`);
    lines.push('');
    lines.push(WA_FINANCE_REGISTRATION_REVIEW_NOTE);
  }

  return appendPrivacyFooter(lines.join('\n'), avisoUrl);
}

/**
 * Mensaje manual desde el panel (sin cola de avisos): mismo tono, emojis y bloques que los avisos de cola
 * (`buildFinanceWhatsAppMessage` / abono). Incluye Tribu Norte vs oficina VN Norte, ID VNPM, montos y nota al pie.
 * @param {{
 *   person: object,
 *   loc: string,
 *   liquidationTarget: number|string,
 *   eventSnapshot: object,
 *   reportedAtMs?: number,
 *   sentByLabel?: string|null,
 * }} p
 */
export function buildGenericManualWhatsAppMessage(p) {
  const {
    person,
    loc,
    liquidationTarget,
    eventSnapshot,
    reportedAtMs = Date.now(),
    sentByLabel = '',
    rosterParticipants = null,
    paymentDeadlineDate = '',
  } = p || {};

  const ev = eventSnapshot || {};
  const eventName = String(ev?.name || '').trim() || 'el evento';
  const personName = String(person?.name || '').trim() || '';
  const vnpId = String(person?.vnpPersonId || '').trim() || 'N/A';
  const repLoc = formatFinanceDateTimeWithLocation(reportedAtMs, loc);
  const org = resolveWaOrgContactLabel(loc, ev);

  const paid = Math.max(0, parseFloat(person?.paid || 0) || 0);
  const target = Math.max(0, Number(liquidationTarget) || 0);
  const debt = Math.max(target - paid, 0);
  const deadline = resolvePaymentDeadlineFromContext({ paymentDeadlineDate }, ev);

  const lines = [];
  lines.push(
    buildWaMessageHeader({
      personName,
      officeLabel: org,
      purposeLine: `con un mensaje respecto a tu participación en ${eventName}.`,
    })
  );
  lines.push('');
  lines.push(`    ${E.calendar} Fecha y hora del mensaje: ${repLoc}`);
  lines.push(`    ${E.idBadge} Tu ID único es: ${vnpId}`);
  appendBautizosPartyDetailedLines(lines, person, eventSnapshot, rosterParticipants);
  appendBautizosTransportIfAny(lines, person, eventSnapshot, rosterParticipants);

  lines.push(
    ...buildBautizosFinanceStatusLines({
      target,
      paid,
      debt,
      isScholarship: isSiStored(person?.isScholarship),
      scholarshipType: person?.scholarshipType,
      scholarshipPartialAmount: person?.scholarshipPartialAmount,
    })
  );

  if (debt > 0.005) {
    lines.push(...buildBautizosPerLineLiquidationLines(person, eventSnapshot, paid, target));
    lines.push(...buildPaymentDeadlineAndRefundBlock(ev, true, deadline));
  }

  const who = String(sentByLabel || '').trim();
  if (who) {
    lines.push(`    ${E.speechBalloon} Te escribe: ${who}`);
  }

  lines.push('');
  lines.push(WA_FINANCE_REGISTRATION_REVIEW_NOTE);
  return lines.join('\n');
}

/**
 * Baja de inscripción (mismo tono que avisos financieros: sin markdown de Telegram).
 */
export function buildBajaWhatsAppMessage({ person, loc, reportedAtMs = Date.now(), eventSnapshot, rosterParticipants = null }) {
  const ev = eventSnapshot || {};
  const eventName = String(ev?.name || '').trim() || 'el evento';
  const name = String(person?.name || '').trim() || '';
  const vnpId = String(person?.vnpPersonId || '').trim() || 'N/A';
  const repLoc = formatFinanceDateTimeWithLocation(reportedAtMs, loc);
  const org = resolveWaOrgContactLabel(loc, ev);

  const lines = [
    buildWaMessageHeader({
      personName: name,
      officeLabel: org,
      purposeLine: `para notificarte que tu inscripción en ${eventName} ha sido dada de baja.`,
    }),
    '',
    `    ${E.calendar} Fecha y sede del movimiento: ${repLoc}`,
    `    ${E.idBadge} Tu ID único es: ${vnpId}`,
  ];
  appendBautizosPartyDetailedLines(lines, person, eventSnapshot, rosterParticipants);
  lines.push(
    '',
    `${E.warning} Si esto fue un error, contáctanos de inmediato.`,
    '',
    `${E.speechBalloon} Cualquier duda, estamos para servirte.`
  );
  return lines.join('\n');
}

/**
 * Solicitud de beca en lista de espera (pendiente de aprobación).
 */
export function buildScholarshipPendingWhatsAppMessage({
  person,
  loc,
  reportedAtMs = Date.now(),
  eventSnapshot,
  rosterParticipants = null,
}) {
  const ev = eventSnapshot || {};
  const eventName = String(ev?.name || '').trim() || 'el evento';
  const name = String(person?.name || '').trim() || '';
  const vnpId = String(person?.vnpPersonId || '').trim() || 'N/A';
  const repLoc = formatFinanceDateTimeWithLocation(reportedAtMs, loc);
  const org = resolveWaOrgContactLabel(loc, ev);
  const isPartial = String(person?.scholarshipType || '') === 'partial';
  const partialAmount = Number(person?.scholarshipPartialAmount || 0);
  const partialLine =
    isPartial && partialAmount > 0
      ? `Monto becado indicado: $${formatFinanceMoneyMx(partialAmount)}.`
      : '';

  const lines = [
    buildWaMessageHeader({
      personName: name,
      officeLabel: org,
      purposeLine: `respecto a tu registro en ${eventName} (lista de espera). ${E.hourglassDone}`,
    }),
    '',
    `    ${E.calendar} Fecha y sede del reporte: ${repLoc}`,
    `    ${E.idBadge} Tu ID único es: ${vnpId}`,
  ];
  appendBautizosPartyDetailedLines(lines, person, eventSnapshot, rosterParticipants);
  lines.push(
    `    ${E.graduationCap} Solicitud de beca ${isPartial ? 'parcial' : 'total'} registrada; está pendiente de aprobación administrativa.`,
    ...(partialLine ? [`    ${E.dollarBanknote} ${partialLine}`] : []),
    `    ${E.megaphone} Te avisaremos por este medio cuando sea aprobada y, en su caso, promovida a inscritos.`,
    '',
    WA_FINANCE_REGISTRATION_REVIEW_NOTE,
  );
  return lines.join('\n');
}

/**
 * @typedef {{ target: number, paid: number, isScholarship: boolean, scholarshipType?: string, scholarshipPartialAmount?: number }} WaFinanceSnapshot
 */

/**
 * Promoción de lista de espera a inscrito (y variante beca aprobada).
 * `financeSnapshot` puede venir de `notification.waFinanceSnapshot` al fusionar avisos antiguos.
 */
export function buildPromoteWaitlistWhatsAppMessage({
  person,
  loc,
  reportedAtMs = Date.now(),
  eventSnapshot,
  financeSnapshot,
  rosterParticipants = null,
  paymentDeadlineDate = '',
}) {
  const ev = eventSnapshot || {};
  const eventName = String(ev?.name || '').trim() || 'el evento';
  const name = String(person?.name || '').trim() || '';
  const vnpId = String(person?.vnpPersonId || '').trim() || 'N/A';
  const repLoc = formatFinanceDateTimeWithLocation(reportedAtMs, loc);
  const org = resolveWaOrgContactLabel(loc, ev);
  const deadline = resolvePaymentDeadlineFromContext({ paymentDeadlineDate }, ev);

  const fs = financeSnapshot || {};
  const target = Math.max(0, Number(fs.target) || 0);
  const paid = Math.max(0, Number(fs.paid) || 0);
  const debt = Math.max(target - paid, 0);
  const isBecado = !!fs.isScholarship;
  const st = String(fs.scholarshipType || 'none');
  const partialAmt = Math.max(0, Number(fs.scholarshipPartialAmount) || 0);

  const lines = [
    buildWaMessageHeader({
      personName: name,
      officeLabel: org,
      purposeLine: `para notificarte que tu registro en ${eventName} fue promovido de lista de espera a inscrito(a) confirmado. ${E.partyPopper}`,
    }),
    '',
    `    ${E.calendar} Fecha y hora del movimiento: ${repLoc}`,
    `    ${E.idBadge} Tu ID único es: ${vnpId}`,
  ];
  appendBautizosPartyDetailedLines(lines, person, eventSnapshot, rosterParticipants);
  appendBautizosTransportIfAny(lines, person, eventSnapshot, rosterParticipants);

  if (isBecado && st === 'partial' && partialAmt > 0.005) {
    lines.push(
      `    ${E.graduationCap} Beca aprobada (parcial): la beca cubre $${formatFinanceMoneyMx(partialAmt)}; costo a liquidar según lista $${formatFinanceMoneyMx(target)}; abono ya registrado $${formatFinanceMoneyMx(paid)}.`
    );
  } else if (isBecado) {
    lines.push(`    ${E.graduationCap} Beca aprobada (total): cobertura completa según tu registro.`);
  } else {
    lines.push(`    ${E.whiteCheck} Tu inscripción quedó confirmada en la lista de inscritos.`);
  }

  if (target > 0.005) {
    lines.push(
      `    ${E.barChart} Saldo pendiente: ${debt <= 0.005 ? `Liquidado ${E.checkMark}` : `$${formatFinanceMoneyMx(debt)}`}`
    );
    if (debt > 0.005) {
      lines.push(...buildBautizosPerLineLiquidationLines(person, eventSnapshot, paid, target));
      lines.push(...buildPaymentDeadlineAndRefundBlock(ev, true, deadline));
    }
  }

  lines.push('');
  const nosVemos = debt <= 0.005 ? eventDateLabelForNosVemos(ev, person) : '';
  if (nosVemos) {
    lines.push(`${E.partyPopper} ¡Nos vemos el ${nosVemos}! ${E.sparkles} ¡No faltes!`);
    lines.push('');
  }
  lines.push(WA_FINANCE_REGISTRATION_REVIEW_NOTE);
  return lines.join('\n');
}

/**
 * Promoción parcial de acompañante(s) de lista de espera — aviso al titular.
 */
export function buildPromoteCompanionWaitlistWhatsAppMessage({
  person,
  loc,
  reportedAtMs = Date.now(),
  eventSnapshot,
  financeSnapshot,
  promotedCompanionIds = [],
  rosterParticipants = null,
  paymentDeadlineDate = '',
}) {
  const ev = eventSnapshot || {};
  const eventName = String(ev?.name || '').trim() || 'el evento';
  const name = String(person?.name || '').trim() || '';
  const vnpId = String(person?.vnpPersonId || '').trim() || 'N/A';
  const repLoc = formatFinanceDateTimeWithLocation(reportedAtMs, loc);
  const org = resolveWaOrgContactLabel(loc, ev);
  const deadline = resolvePaymentDeadlineFromContext({ paymentDeadlineDate }, ev);
  const promotedNames = resolvePromotedCompanionNames(person, promotedCompanionIds);
  const promotedLabel = promotedNames.length ? promotedNames.join(', ') : 'tu acompañante';

  const fs = financeSnapshot || {};
  const target = Math.max(0, Number(fs.target) || 0);
  const paid = Math.max(0, Number(fs.paid) || 0);
  const debt = Math.max(target - paid, 0);

  const lines = [
    buildWaMessageHeader({
      personName: name,
      officeLabel: org,
      purposeLine: `para informarte sobre la confirmación de acompañante(s) en ${eventName}. ${E.whiteCheck}`,
    }),
    '',
    `    ${E.calendar} Fecha y hora del movimiento: ${repLoc}`,
    `    ${E.idBadge} Tu ID único es: ${vnpId}`,
    `    ${E.megaphone} Se confirmó en la lista de inscritos a: ${promotedLabel}.`,
  ];
  appendBautizosPartyDetailedLines(lines, person, eventSnapshot, rosterParticipants, {
    promotedCompanionIds,
  });
  appendBautizosTransportIfAny(lines, person, eventSnapshot, rosterParticipants);

  lines.push(
    ...buildBautizosFinanceStatusLines({
      target,
      paid,
      debt,
      showBreakdown: true,
      person,
      eventSnapshot,
      rosterParticipants,
    })
  );

  if (debt > 0.005) {
    lines.push(...buildBautizosPerLineLiquidationLines(person, eventSnapshot, paid, target));
    lines.push(...buildPaymentDeadlineAndRefundBlock(ev, true, deadline));
  }

  lines.push('');
  const nosVemos = debt <= 0.005 ? eventDateLabelForNosVemos(ev, person) : '';
  if (nosVemos) {
    lines.push(`${E.partyPopper} ¡Nos vemos el ${nosVemos}! ${E.sparkles} ¡No faltes!`);
    lines.push('');
  }
  lines.push(WA_FINANCE_REGISTRATION_REVIEW_NOTE);
  return lines.join('\n');
}

/**
 * Recordatorio de pago (cola automática semanal o manual): saldo pendiente y fecha límite del evento.
 * @param {{
 *   person: object,
 *   loc: string,
 *   pendingDebt: number,
 *   paymentDeadlineDate: string,
 *   reportedAtMs?: number,
 *   eventSnapshot: object,
 * }} p
 */
export function buildPaymentReminderWhatsAppMessage(p) {
  const {
    person,
    loc,
    pendingDebt,
    paymentDeadlineDate,
    reportedAtMs = Date.now(),
    eventSnapshot,
    rosterParticipants = null,
  } = p;

  const ev = eventSnapshot || {};
  const eventName = String(ev?.name || '').trim() || 'el evento';
  const personName = String(person?.name || '').trim() || '';
  const vnpId = String(person?.vnpPersonId || '').trim() || 'N/A';
  const repLoc = formatFinanceDateTimeWithLocation(reportedAtMs, loc);
  const org = resolveWaOrgContactLabel(loc, ev);
  const debtTxt = formatFinanceMoneyMx(Math.max(0, Number(pendingDebt) || 0));
  const deadlineLabel = formatPaymentDeadlineLabel(paymentDeadlineDate || ev?.paymentDeadlineDate);

  const lines = [
    buildWaMessageHeader({
      personName,
      officeLabel: org,
      purposeLine: `con un recordatorio para liquidar tu lugar en ${eventName}. ${E.card}`,
    }),
    '',
    `    ${E.calendar} Fecha del aviso: ${repLoc}`,
    `    ${E.idBadge} Tu ID único es: ${vnpId}`,
  ];
  appendBautizosPartyDetailedLines(lines, person, eventSnapshot, rosterParticipants);
  lines.push(
    `    ${E.barChart} Monto pendiente por liquidar: $${debtTxt}`,
    `    ${E.tearOffCalendar} Fecha límite de pago: ${deadlineLabel}`,
    '',
    'Por favor realiza tu pago a tiempo para conservar tu lugar. Si ya liquidaste, ignora este mensaje o envíanos tu comprobante por este medio.',
    '',
    'Debes liquidar tu registro antes de esa fecha. Si no se liquida a tiempo, no se garantiza la devolución del dinero abonado.',
    '',
    WA_FINANCE_REGISTRATION_REVIEW_NOTE
  );
  return lines.join('\n');
}

/** Rubros solicitados en mensaje WA de datos de carro. */
function carWaRequestFieldLines(crewOpts) {
  const fields = ['Marca', 'Modelo', 'Color', 'Placas', 'Conductor'];
  if (crewOpts.requiresPassengers !== false) fields.push('Pasajeros');
  return fields.map((field) => `• ${field}:`);
}

/**
 * Solicitud de datos de vehículo y tripulación (Bautizos, solo titular).
 * @param {{
 *   person: object,
 *   loc: string,
 *   eventSnapshot: object,
 *   carSlots?: object[],
 *   reportedAtMs?: number,
 * }} p
 */
export function buildCarDataRequestWhatsAppMessage(p) {
  const {
    person,
    loc,
    eventSnapshot,
    carSlots,
    reportedAtMs = Date.now(),
    requiresPassengers,
    carDataSubjectContext,
    rosterParticipants = null,
    avisoUrl = '',
  } = p;
  const ev = eventSnapshot || {};
  const eventName = String(ev?.name || '').trim() || 'el evento';
  const personName = String(person?.name || '').trim() || '';
  const vnpId = String(person?.vnpPersonId || '').trim() || 'N/A';
  const sede = String(loc || person?.location || '').trim();
  const office = resolveWaOrgContactLabel(sede, ev);
  const sedeRegistrationLabel = sede ? `sede ${sede}` : 'sede de inscripción';
  const repLoc = formatFinanceDateTimeWithLocation(reportedAtMs, sede || loc);
  const crewOpts = {
    requiresPassengers:
      typeof requiresPassengers === 'boolean'
        ? requiresPassengers
        : carCrewRequiresPassengerSelection(person, getBautizosCompanionsArray(person)),
  };
  const subject =
    carDataSubjectContext || buildCarDataWaSubjectContext(person, getBautizosCompanionsArray(person));
  const lines = [
    buildWaMessageHeader({
      personName,
      officeLabel: office,
      purposeLine: `respecto al evento ${eventName}. 🚗`,
    }),
    '',
    `${E.calendar} Fecha del aviso: ${repLoc}`,
    `${E.idBadge} Tu ID único es: ${vnpId}`,
  ];
  appendBautizosPartyDetailedLines(lines, person, eventSnapshot, rosterParticipants);
  const transportLines = buildBautizosTransportSummaryLines(
    person,
    eventSnapshot,
    eventSnapshot?.transportPlanning,
    rosterParticipants
  );
  if (transportLines.length) {
    lines.push('');
    lines.push(...transportLines);
  }
  const carStatusLines = buildCarDataStatusLines({
    inventory: carSlots,
    requiresPassengers: crewOpts.requiresPassengers,
  });
  if (carStatusLines.length) {
    lines.push('');
    lines.push(...carStatusLines);
  }
  lines.push(
    '',
    subject.requestIntro,
    ...carWaRequestFieldLines(crewOpts),
    '',
    `Por favor envíanos esta información lo antes posible. También puedes actualizar el registro en ${sedeRegistrationLabel}.`,
    '',
    WA_FINANCE_REGISTRATION_REVIEW_NOTE
  );
  return appendPrivacyFooter(lines.join('\n'), avisoUrl);
}

/**
 * @param {object} n
 * @param {object} person
 * @param {(p: object) => number} [getLiquidationTarget]
 * @returns {WaFinanceSnapshot}
 */
export function resolveWaFinanceSnapshotFromNotification(n, person, getLiquidationTarget) {
  if (n?.waFinanceSnapshot && typeof n.waFinanceSnapshot === 'object') {
    const s = n.waFinanceSnapshot;
    return {
      target: Math.max(0, Number(s.target) || 0),
      paid: Math.max(0, Number(s.paid) || 0),
      isScholarship: !!s.isScholarship,
      scholarshipType: String(s.scholarshipType || 'none'),
      scholarshipPartialAmount: Math.max(0, Number(s.scholarshipPartialAmount) || 0),
    };
  }
  const target = getLiquidationTarget ? Math.max(0, Number(getLiquidationTarget(person)) || 0) : 0;
  const paid = Math.max(0, parseFloat(person?.paid || 0) || 0);
  return {
    target,
    paid,
    isScholarship: isSiStored(person?.isScholarship),
    scholarshipType: String(person?.scholarshipType || 'none'),
    scholarshipPartialAmount: Math.max(0, Number(person?.scholarshipPartialAmount) || 0),
  };
}

const MERGE_RULE = '\n\n────────────────\n\n';

/** Tipos que se reconstruyen al fusionar (plantilla unificada + un solo cierre). */
const STRUCTURED_QUEUE_KINDS = new Set([
  'registro',
  'abono',
  'promocion_espera',
  'promocion_acompanante',
  'beca_aprobada',
  'baja',
  'beca_pendiente_aprobacion',
  'recordatorio_pago',
]);

/** Avisos con datos financieros o alta de registro (excluye baja). */
const STRUCTURED_KINDS_WITH_REVIEW_NOTE = new Set([
  'registro',
  'abono',
  'promocion_espera',
  'promocion_acompanante',
  'beca_aprobada',
  'beca_pendiente_aprobacion',
  'recordatorio_pago',
]);

/**
 * Fusiona avisos sin enviar: registro, abono, promoción, beca pendiente, baja (plantilla coherente);
 * otros `kind` usan `message` guardado.
 *
 * @param {object} person
 * @param {string} loc
 * @param {object[]} unsentNotifications ya filtrados `!sent`
 * @param {object} eventSnapshot
 * @param {(n: object) => string} getMarkKey
 * @param {(p: object) => number} [getLiquidationTarget] — para recomponer promoción si falta `waFinanceSnapshot`
 * @param {object[]|null} [rosterParticipants] — para desglose de acompañantes en Bautizos
 */
export function buildMergedFinanceWhatsAppMessage(
  person,
  loc,
  unsentNotifications,
  eventSnapshot,
  getMarkKey,
  getLiquidationTarget,
  rosterParticipants = null
) {
  const sorted = dedupeUnsentCarDataNotifications(unsentNotifications || [])
    .filter((n) => n && !n.sent)
    .sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));

  const mergeMarkKeys = sorted.map((n) => getMarkKey(n));

  if (!sorted.length) {
    return { text: '', mergeMarkKeys: [] };
  }

  const mergeableKinds = new Set([...STRUCTURED_QUEUE_KINDS, 'datos_carro']);
  const unifiedMerge = sorted.every((n) => mergeableKinds.has(String(n?.kind || '')));

  const blocks = sorted
    .map((n, i) => {
      const k = String(n.kind || '');
      let block;

      if (k === 'registro' || k === 'abono') {
        block = buildFinanceWhatsAppMessage({
          person,
          loc,
          amount: Number(n.amount) || 0,
          pendingAmount: Number(n.pendingAmount) || 0,
          isLiquidado: !!n.isLiquidado,
          kind: k === 'registro' ? 'registro' : 'abono',
          reportedAtMs: n.createdAt,
          liquidationTarget: n.liquidationTarget,
          eventSnapshot,
          rosterParticipants,
          paymentDeadlineDate: n.paymentDeadlineDate,
        });
      } else if (k === 'promocion_espera' || k === 'beca_aprobada') {
        const financeSnapshot = resolveWaFinanceSnapshotFromNotification(n, person, getLiquidationTarget);
        block = buildPromoteWaitlistWhatsAppMessage({
          person,
          loc,
          reportedAtMs: n.createdAt,
          eventSnapshot,
          financeSnapshot,
          rosterParticipants,
          paymentDeadlineDate: n.paymentDeadlineDate,
        });
      } else if (k === 'promocion_acompanante') {
        const financeSnapshot = resolveWaFinanceSnapshotFromNotification(n, person, getLiquidationTarget);
        block = buildPromoteCompanionWaitlistWhatsAppMessage({
          person,
          loc,
          reportedAtMs: n.createdAt,
          eventSnapshot,
          financeSnapshot,
          promotedCompanionIds: n.promotedCompanionIds,
          rosterParticipants,
          paymentDeadlineDate: n.paymentDeadlineDate,
        });
      } else if (k === 'baja') {
        block = buildBajaWhatsAppMessage({
          person,
          loc,
          reportedAtMs: n.createdAt,
          eventSnapshot,
          rosterParticipants,
        });
      } else if (k === 'beca_pendiente_aprobacion') {
        block = buildScholarshipPendingWhatsAppMessage({
          person,
          loc,
          reportedAtMs: n.createdAt,
          eventSnapshot,
          rosterParticipants,
        });
      } else if (k === 'recordatorio_pago') {
        block = buildPaymentReminderWhatsAppMessage({
          person,
          loc,
          pendingDebt: Number(n.pendingDebt) || 0,
          paymentDeadlineDate: String(n.paymentDeadlineDate || '').trim(),
          reportedAtMs: n.createdAt,
          eventSnapshot,
          rosterParticipants,
        });
      } else if (k === 'datos_carro') {
        block = buildCarDataRequestWhatsAppMessage({
          person,
          loc,
          eventSnapshot,
          carSlots: n.carSlots,
          reportedAtMs: n.createdAt,
          carDataSubjectContext: n.carDataSubjectContext,
          rosterParticipants,
        });
      } else {
        block = String(n.message || '').trim();
      }

      if (!block) return '';

      if (!unifiedMerge) {
        return block;
      }

      let trimmed = block.replace(RE_CLOSING_UNIFIED, '').trim();
      trimmed = trimmed.replace(/\n*Este mensaje contiene datos de registro del evento\. Consulte nuestro aviso de privacidad:.*$/s, '').trim();
      if (i > 0) {
        trimmed = trimmed.replace(/^(\u{1F44B}\s*)?¡Hola![^\n]+\n+/u, '').trim();
        trimmed = trimmed.replace(/^Hola[^\n]+\n+/u, '').trim();
      }
      return trimmed;
    })
    .filter(Boolean);

  if (!blocks.length) {
    return { text: '', mergeMarkKeys: [] };
  }

  const mergedNeedsReviewNote = sorted.some(
    (n) =>
      STRUCTURED_KINDS_WITH_REVIEW_NOTE.has(String(n?.kind || '')) ||
      String(n?.kind || '') === 'datos_carro'
  );

  const text =
    unifiedMerge && blocks.length > 0
      ? `${blocks.join(MERGE_RULE)}\n\n${
          mergedNeedsReviewNote
            ? WA_FINANCE_REGISTRATION_REVIEW_NOTE
            : `${E.speechBalloon} Cualquier duda, estamos para servirte.`
        }`
      : blocks.join(MERGE_RULE);

  return { text, mergeMarkKeys };
}
