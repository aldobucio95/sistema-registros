import { WA_EMOJI as E } from './whatsappEmojiConstants.js';
import {
  getBautizosCompanionsArray,
  isBautizosCompanionBaptized,
  bautizosCompanionParticipatesAsServer,
  normalizeBautizosAttendanceType,
  BAUTIZOS_ATTENDANCE,
  bautizosLineUsesEventTransportOnly,
  bautizosLlegaEnCarroForTransportPricing,
  normalizeArrivalCarCount,
} from './bautizosParty.js';
import { isCompanionWaitlistPending } from './bautizosCompanionWaitlist.js';
import {
  getBautizosCompanionInformativeListPrice,
  getBautizosTitularListPrice,
  buildBautizosDashboardLiquidationUnits,
  getBautizosFifoUnitBalances,
} from './publicRegistrationLogic.js';
import {
  collectCarMetaMissingFieldLabels,
  formatCarMetaDisplayValue,
  normalizeCarVehicleMeta,
  resolveManualCarGroupContext,
  buildManualGroupMemberOptions,
  buildCarDataSummaryForRosterPerson,
  resolveMemberLabel,
} from './bautizosCarMeta.js';
function formatFinanceMoneyMx(n) {
  return Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const E_CAR = '\u{1F697}';

/** @param {string} loc @param {object} eventSnapshot */
export function resolveWaOrgContactLabel(loc, eventSnapshot) {
  const campa = String(eventSnapshot?.eventType || '') === 'Campa';
  if (campa) return 'Tribu Norte';
  return resolveVnOfficeContactLabel(loc);
}

const VN_OFFICE_SUR_SEDES = new Set(['sur', 'neza', 'coapa']);
const VN_OFFICE_NORTE_SEDES = new Set(['norte', 'izcalli']);

/** Etiqueta de contacto según sede inscrita (mensajes WA de oficina). */
export function resolveVnOfficeContactLabel(loc) {
  const key = String(loc || '')
    .trim()
    .toLocaleLowerCase('es');
  if (VN_OFFICE_SUR_SEDES.has(key)) return 'la Oficina VN Sur';
  if (VN_OFFICE_NORTE_SEDES.has(key)) return 'la Oficina VN Norte';
  return 'la Oficina VN Norte';
}

/**
 * @param {{ personName?: string, officeLabel?: string, purposeLine?: string }} p
 */
export function buildWaMessageHeader({ personName = '', officeLabel = '', purposeLine = '' }) {
  const name = String(personName || '').trim();
  const org = String(officeLabel || '').trim();
  const purpose = String(purposeLine || '').trim();
  const orgPart = org ? `de ${org} ` : '';
  return `${E.wave} ¡Hola! ${name}, te contactamos ${orgPart}${purpose}`.replace(/\s+/g, ' ').trim();
}

/** @param {object} companion */
export function resolveCompanionWaStatusLabel(companion) {
  if (isCompanionWaitlistPending(companion)) return 'En espera';
  return 'Activo';
}

/** @param {object} personOrCompanion @param {{ isCompanion?: boolean }} [opts] */
export function resolveParticipantWaRoleLabel(personOrCompanion, opts = {}) {
  const isCompanion = opts.isCompanion === true;
  if (isCompanion) {
    if (bautizosCompanionParticipatesAsServer(personOrCompanion)) return 'Servidor';
    return isBautizosCompanionBaptized(personOrCompanion) ? 'Bautizado' : 'Acompañante';
  }
  const t = normalizeBautizosAttendanceType(personOrCompanion?.bautizosAttendanceType);
  if (t === BAUTIZOS_ATTENDANCE.asistente) return 'Asistente';
  if (t === BAUTIZOS_ATTENDANCE.servidor) return 'Servidor';
  if (t === BAUTIZOS_ATTENDANCE.empleado) return 'Empleado';
  if (t === BAUTIZOS_ATTENDANCE.cortesia) return 'Cortesía';
  if (t === BAUTIZOS_ATTENDANCE.pastor) return 'Pastor';
  return 'Bautizado';
}

/** @param {object} lineLike @param {object} [eventLike] */
export function resolveTransportModeLabel(lineLike, eventLike = null) {
  if (bautizosLineUsesEventTransportOnly(lineLike, eventLike)) return 'Transporte evento';
  if (bautizosLlegaEnCarroForTransportPricing(lineLike)) {
    const n = normalizeArrivalCarCount(lineLike?.carrosLlegada);
    return n > 1 ? `Carro propio (${n})` : 'Carro propio';
  }
  return '—';
}

function resolveTitularWaStatusLabel(person) {
  const st = String(person?.status || 'active').trim().toLowerCase();
  if (st === 'waitlist') return 'En espera';
  return 'Activo';
}

function formatListPriceSuffix(price, waitlistPending) {
  const txt = `$${formatFinanceMoneyMx(price)} lista`;
  return waitlistPending ? `${txt} (no confirmado aún)` : txt;
}

/**
 * @param {object} person
 * @param {object} eventSnapshot
 * @param {object[]|null} [rosterParticipants]
 * @param {{ promotedCompanionIds?: string[] }} [opts]
 * @returns {string[]}
 */
export function buildBautizosPartyDetailedLines(person, eventSnapshot, rosterParticipants = null, opts = {}) {
  if (String(eventSnapshot?.eventType || '') !== 'Bautizos') return [];
  if (String(person?.bautizosSplitPartyHostParticipantId || '').trim()) return [];

  const promotedSet = new Set(
    (opts.promotedCompanionIds || []).map((id) => String(id || '').trim()).filter(Boolean)
  );
  const lines = [];
  const titularName = String(person?.name || '').trim();
  if (titularName) {
    const role = resolveParticipantWaRoleLabel(person);
    const status = resolveTitularWaStatusLabel(person);
    const transport = resolveTransportModeLabel(person, eventSnapshot);
    const price = getBautizosTitularListPrice(person, eventSnapshot);
    lines.push(
      `    ${E.idBadge} Titular: ${titularName} — ${role} · ${status} · ${transport} · ${formatListPriceSuffix(price, false)}`
    );
  }

  getBautizosCompanionsArray(person)
    .filter((c) => String(c?.name || '').trim())
    .forEach((c, idx) => {
      const name = String(c.name || '').trim();
      const rel = String(c?.relationship || '').trim();
      const relSuffix = rel && rel !== 'Integrante del mismo registro' ? ` (${rel})` : '';
      const role = resolveParticipantWaRoleLabel(c, { isCompanion: true });
      const wasPromoted = promotedSet.has(String(c?.id || '').trim());
      const status = wasPromoted ? 'Activo' : resolveCompanionWaStatusLabel(c);
      const transport = resolveTransportModeLabel(c, eventSnapshot);
      const price = getBautizosCompanionInformativeListPrice(c, eventSnapshot, rosterParticipants);
      const waitlist = isCompanionWaitlistPending(c) && !wasPromoted;
      lines.push(
        `    ${E.idBadge} Acomp. ${idx + 1}: ${name}${relSuffix} — ${role} · ${status} · ${transport} · ${formatListPriceSuffix(price, waitlist)}`
      );
    });

  return lines;
}

/**
 * Grupo manual de transporte: integrantes compartidos y tripulación por carro.
 * @param {object} person
 * @param {object} eventSnapshot
 * @param {object[]|null} [roster]
 * @returns {string[]}
 */
export function buildBautizosManualCarGroupSummaryLines(person, eventSnapshot, roster = null) {
  if (String(eventSnapshot?.eventType || '') !== 'Bautizos') return [];
  const plan = eventSnapshot?.transportPlanning;
  const manualCtx = resolveManualCarGroupContext(person, plan, roster);
  if (!manualCtx?.group || (manualCtx.memberKeys?.length || 0) < 2) return [];

  const memberOpts = buildManualGroupMemberOptions(plan, manualCtx.group, roster);
  const memberNames = memberOpts.map((o) => String(o?.label || '').trim()).filter((n) => n && n !== '—');
  if (!memberNames.length) return [];

  const anchor = manualCtx.anchorPerson || person;
  const summary = buildCarDataSummaryForRosterPerson({
    person: anchor,
    companions: getBautizosCompanionsArray(anchor),
    plan,
    roster,
    eventLike: eventSnapshot,
  });
  const labelIndex = summary.labelIndex;
  const anchorComps = summary.companions || getBautizosCompanionsArray(anchor);
  const personSk = `p:${String(person?.id || '').trim()}`;
  const personLabel = resolveMemberLabel(personSk, anchor, anchorComps, labelIndex) || String(person?.name || '').trim();

  const lines = [`    ${E_CAR} Grupo manual de transporte:`];
  lines.push(`    · Integrantes del grupo: ${memberNames.join(', ')}`);
  if (personLabel && !manualCtx.isAnchor) {
    lines.push(`    · Tu registro comparte carro con el titular del grupo (${String(manualCtx.anchorPerson?.name || '').trim() || 'ancla'})`);
  }

  const inventory = summary.inventory || [];
  if (!inventory.length) {
    lines.push(`    · Vehículos y tripulación: pendiente de capturar en transporte`);
    return lines;
  }

  inventory.forEach((slot, idx) => {
    const meta = normalizeCarVehicleMeta(slot?.meta);
    if (meta.maybeAbsent) return;
    const carNum = slot?.carIndex ?? idx + 1;
    const driver =
      resolveMemberLabel(meta.driverSourceKey, anchor, anchorComps, labelIndex) || 'pendiente';
    const passengers = (meta.passengerSourceKeys || [])
      .map((sk) => resolveMemberLabel(sk, anchor, anchorComps, labelIndex))
      .filter(Boolean);
    const paxPart = passengers.length ? ` · pasajeros: ${passengers.join(', ')}` : '';
    lines.push(`    · Carro ${carNum}: conductor ${driver}${paxPart}`);
  });

  return lines;
}

/**
 * @param {object} person
 * @param {object} eventSnapshot
 * @param {object} [plan]
 * @param {object[]|null} [roster]
 * @returns {string[]}
 */
export function buildBautizosTransportSummaryLines(person, eventSnapshot, plan, roster = null) {
  if (String(eventSnapshot?.eventType || '') !== 'Bautizos') return [];

  const manualLines = buildBautizosManualCarGroupSummaryLines(person, eventSnapshot, roster);
  const carCount = normalizeArrivalCarCount(person?.carrosLlegada);
  const anyCar =
    bautizosLlegaEnCarroForTransportPricing(person) ||
    getBautizosCompanionsArray(person).some((c) => bautizosLlegaEnCarroForTransportPricing(c));

  const lines = [];
  if (anyCar) {
    lines.push(`    ${E_CAR} Resumen transporte:`);
    if (bautizosLlegaEnCarroForTransportPricing(person)) {
      lines.push(`    · Titular: ${resolveTransportModeLabel(person, eventSnapshot)}`);
    } else if (bautizosLineUsesEventTransportOnly(person, eventSnapshot)) {
      lines.push(`    · Titular: Transporte evento`);
    }
    getBautizosCompanionsArray(person)
      .filter((c) => String(c?.name || '').trim())
      .forEach((c, idx) => {
        if (!bautizosLlegaEnCarroForTransportPricing(c) && !bautizosLineUsesEventTransportOnly(c, eventSnapshot)) {
          return;
        }
        const nm = String(c.name || '').trim();
        lines.push(`    · Acomp. ${idx + 1} (${nm}): ${resolveTransportModeLabel(c, eventSnapshot)}`);
      });
    if (carCount > 0 && bautizosLlegaEnCarroForTransportPricing(person)) {
      lines.push(`    · Vehículos registrados en titular: ${carCount}`);
    }
  }

  if (manualLines.length) {
    if (lines.length) lines.push('');
    lines.push(...manualLines);
  }

  return lines;
}

/**
 * @param {{
 *   target?: number,
 *   paid?: number,
 *   debt?: number,
 *   isScholarship?: boolean,
 *   scholarshipType?: string,
 *   scholarshipPartialAmount?: number,
 *   showBreakdown?: boolean,
 *   person?: object,
 *   eventSnapshot?: object,
 *   rosterParticipants?: object[]|null,
 * }} ctx
 * @returns {string[]}
 */
export function buildBautizosFinanceStatusLines(ctx = {}) {
  const target = Math.max(0, Number(ctx.target) || 0);
  const paid = Math.max(0, Number(ctx.paid) || 0);
  const debt =
    ctx.debt != null && Number.isFinite(Number(ctx.debt))
      ? Math.max(0, Number(ctx.debt))
      : Math.max(target - paid, 0);
  const lines = [];

  if (ctx.isScholarship && String(ctx.scholarshipType || '') === 'partial') {
    const partial = Math.max(0, Number(ctx.scholarshipPartialAmount) || 0);
    if (partial > 0.005) {
      lines.push(
        `    ${E.graduationCap} Beca parcial: cubre $${formatFinanceMoneyMx(partial)}; costo a liquidar $${formatFinanceMoneyMx(target)}; abonado $${formatFinanceMoneyMx(paid)}.`
      );
    }
  } else if (ctx.isScholarship) {
    lines.push(`    ${E.graduationCap} Registro becado (cobertura total).`);
    return lines;
  }

  if (target <= 0.005) return lines;

  lines.push(`    ${E.dollarBanknote} Total a liquidar: $${formatFinanceMoneyMx(target)}`);
  lines.push(`    ${E.dollarBanknote} Abonado: $${formatFinanceMoneyMx(paid)}`);
  lines.push(
    `    ${E.barChart} Saldo pendiente: ${debt <= 0.005 ? `Liquidado ${E.checkMark}` : `$${formatFinanceMoneyMx(debt)}`}`
  );

  if (ctx.showBreakdown && ctx.person && ctx.eventSnapshot) {
    const breakdown = buildBautizosPartyCostBreakdownFromPerson(
      ctx.person,
      ctx.eventSnapshot,
      ctx.rosterParticipants
    );
    if (breakdown.length) {
      lines.push('');
      lines.push(`    ${E.card} Desglose de costos de lista:`);
      lines.push(...breakdown);
    }
  }
  return lines;
}

function buildBautizosPartyCostBreakdownFromPerson(person, eventSnapshot, rosterParticipants) {
  const companions = getBautizosCompanionsArray(person).filter((c) => String(c?.name || '').trim());
  if (!companions.length) return [];
  const lines = [];
  const titularPrice = getBautizosTitularListPrice(person, eventSnapshot);
  lines.push(`    ${E.barChart} Titular (bautizado): $${formatFinanceMoneyMx(titularPrice)}`);
  companions.forEach((c, idx) => {
    const name = String(c?.name || '').trim();
    const price = getBautizosCompanionInformativeListPrice(c, eventSnapshot, rosterParticipants);
    const rel = String(c?.relationship || '').trim();
    const relSuffix = rel && rel !== 'Integrante del mismo registro' ? ` (${rel})` : '';
    lines.push(
      `    ${E.idBadge} Acompañante ${idx + 1}: ${name}${relSuffix} — $${formatFinanceMoneyMx(price)}`
    );
  });
  return lines;
}

/**
 * @param {object} person
 * @param {object} eventSnapshot
 * @param {number} paid
 * @param {number} target
 * @returns {string[]}
 */
export function buildBautizosPerLineLiquidationLines(person, eventSnapshot, paid, target) {
  const L = Math.max(0, Number(target) || 0);
  const paidGross = Math.max(0, Number(paid) || 0);
  if (L <= 0.005 || String(eventSnapshot?.eventType || '') !== 'Bautizos') return [];

  const units = buildBautizosDashboardLiquidationUnits(person, eventSnapshot, null, L);
  const balances = getBautizosFifoUnitBalances(units, paidGross);
  if (!balances.length) return [];

  const lines = [`    ${E.card} Liquidación por persona:`];
  for (const u of balances) {
    if (u.kind === 'titular') {
      const label = String(person?.name || '').trim() || 'Titular';
      lines.push(formatUnitLiquidationLine(label, u));
      continue;
    }
    const cname = String(u.companionName || '').trim() || 'Acompañante';
    lines.push(formatUnitLiquidationLine(cname, u));
  }
  return lines;
}

function formatUnitLiquidationLine(label, unit) {
  const owed = Math.max(0, Number(unit?.owed) || 0);
  if (owed <= 0.005) {
    return `    · ${label}: sin costo en lista`;
  }
  if (unit.isLiquidated) {
    return `    · ${label}: liquidado ${E.checkMark}`;
  }
  const bal = Math.max(0, Number(unit?.balance) || 0);
  const alloc = Math.max(0, Number(unit?.paidAllocated) || 0);
  if (alloc > 0.005) {
    return `    · ${label}: pendiente $${formatFinanceMoneyMx(bal)} (abonado $${formatFinanceMoneyMx(alloc)} de $${formatFinanceMoneyMx(owed)})`;
  }
  return `    · ${label}: pendiente $${formatFinanceMoneyMx(bal)}`;
}

/** @param {string} paymentDeadlineDate */
export function formatPaymentDeadlineLabel(paymentDeadlineDate) {
  const dl = String(paymentDeadlineDate || '').trim();
  if (dl && /^\d{4}-\d{2}-\d{2}$/.test(dl)) {
    return new Date(`${dl}T12:00:00`).toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  return 'la fecha acordada con la oficina';
}

/**
 * @param {object} eventSnapshot
 * @param {boolean} hasPendingDebt
 * @param {string} [paymentDeadlineDate]
 * @returns {string[]}
 */
export function buildPaymentDeadlineAndRefundBlock(eventSnapshot, hasPendingDebt, paymentDeadlineDate = '') {
  if (!hasPendingDebt) return [];
  const dl =
    String(paymentDeadlineDate || '').trim() ||
    String(eventSnapshot?.paymentDeadlineDate || '').trim();
  const deadlineLabel = formatPaymentDeadlineLabel(dl);
  return [
    '',
    `    ${E.tearOffCalendar} Fecha límite de pago: ${deadlineLabel}.`,
    'Debes liquidar tu registro antes de esa fecha. Si no se liquida a tiempo, no se garantiza la devolución del dinero abonado.',
  ];
}

/**
 * @param {{
 *   person?: object,
 *   plan?: object,
 *   roster?: object[],
 *   inventory?: object[],
 *   requiresPassengers?: boolean,
 * }} p
 * @returns {string[]}
 */
export function buildCarDataStatusLines(p) {
  const inventory = Array.isArray(p?.inventory)
    ? p.inventory
    : Array.isArray(p?.carSlots)
      ? p.carSlots
      : [];
  if (!inventory.length) return [];

  const crewOpts = { requiresPassengers: p?.requiresPassengers !== false };
  const lines = [`    ${E_CAR} Estado de vehículos:`];

  inventory.forEach((slot, idx) => {
    const meta = slot?.meta || slot;
    const carNum = slot?.carIndex ?? idx + 1;
    const brand = formatCarMetaDisplayValue(meta, 'brand');
    const model = formatCarMetaDisplayValue(meta, 'model');
    const color = formatCarMetaDisplayValue(meta, 'color');
    const hasVehicleData = [brand, model, color].some((v) => v && v !== 'Pendiente');
    const missing = collectCarMetaMissingFieldLabels(meta, crewOpts);

    if (!hasVehicleData && missing.length > 3) {
      lines.push(`    · Carro ${carNum}: (sin datos)`);
      return;
    }

    const vehicleDesc = hasVehicleData
      ? [brand, model, color].filter((v) => v && v !== 'Pendiente').join(' ')
      : '(sin datos)';
    const driverSk = String(meta?.driverSourceKey || '').trim();
    const driverLabel = driverSk ? `conductor asignado` : 'conductor pendiente';
    const pendingTxt = missing.length ? ` · pendiente: ${missing.join(', ')}` : '';
    lines.push(`    · Carro ${carNum}: ${vehicleDesc} · ${driverLabel}${pendingTxt}`);
  });

  return lines;
}

/** Nombres de acompañantes promovidos por id. */
export function resolvePromotedCompanionNames(person, promotedCompanionIds) {
  const ids = new Set((promotedCompanionIds || []).map((id) => String(id || '').trim()).filter(Boolean));
  if (!ids.size) return [];
  return getBautizosCompanionsArray(person)
    .filter((c) => ids.has(String(c?.id || '').trim()))
    .map((c) => String(c?.name || '').trim())
    .filter(Boolean);
}
