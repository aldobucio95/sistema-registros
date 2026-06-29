/**
 * Réplica mínima de la liquidación en `publicRegistrationLogic.js` para Cloud Functions.
 * Si cambia la lógica de costos en la app, actualizar aquí en paralelo.
 */
const SI = 'Si';
const SI_LABEL = 'Sí';

function isSiValue(v) {
  const s = String(v ?? '').trim();
  if (s === SI || s === SI_LABEL) return true;
  if (s.toLowerCase() === 'sí') return true;
  if (s.length === 2 && s[0] === 'S' && (s[1] === '?' || s[1] === '\uFFFD')) return true;
  return false;
}

const ATTENDANCE_SPECIAL = { ninguno: 'ninguno', empleado: 'empleado', cortesia: 'cortesia' };

function normalizeAttendanceSpecial(personLike) {
  const t = personLike?.attendanceSpecialType;
  if (t === ATTENDANCE_SPECIAL.empleado || t === ATTENDANCE_SPECIAL.cortesia) return t;
  return ATTENDANCE_SPECIAL.ninguno;
}

const isFreeAttendanceType = (t) => t === ATTENDANCE_SPECIAL.empleado || t === ATTENDANCE_SPECIAL.cortesia;

const BAUTIZOS_ATTENDANCE = {
  bautizado: 'bautizado',
  servidor: 'servidor',
  empleado: 'empleado',
  cortesia: 'cortesia',
};

function normalizeBautizosAttendanceType(raw) {
  const s = String(raw || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (s === 'servidor') return BAUTIZOS_ATTENDANCE.servidor;
  if (s === 'empleado') return BAUTIZOS_ATTENDANCE.empleado;
  if (s === 'cortesia') return BAUTIZOS_ATTENDANCE.cortesia;
  return BAUTIZOS_ATTENDANCE.bautizado;
}

function isFreeBautizosAttendance(personLike) {
  return normalizeBautizosAttendanceType(personLike?.bautizosAttendanceType) === BAUTIZOS_ATTENDANCE.cortesia;
}

function participantHasBaptismChip(personLike, eventType) {
  const et = String(eventType || '').trim();
  if (et === 'Bautizos') {
    return normalizeBautizosAttendanceType(personLike?.bautizosAttendanceType) === BAUTIZOS_ATTENDANCE.bautizado;
  }
  return false;
}

function getBautizosTitularListPrice(personLike, eventLike = null) {
  if (!eventLike || eventLike.eventType !== 'Bautizos') return 0;
  if (isFreeBautizosAttendance(personLike)) return 0;
  const t = normalizeBautizosAttendanceType(personLike?.bautizosAttendanceType);
  if (t === BAUTIZOS_ATTENDANCE.empleado) return 0;
  if (t === BAUTIZOS_ATTENDANCE.servidor) return getBautizosListPrice(personLike, eventLike);
  if (participantHasBaptismChip(personLike, 'Bautizos')) return getBautizosListPrice(personLike, eventLike);
  return 0;
}

function getBautizosCompanionsArray(personLike) {
  const raw = personLike?.bautizosCompanions;
  if (!Array.isArray(raw)) return [];
  return raw.filter((c) => c && typeof c === 'object');
}

function resolveLlegaEnCarroLine(line) {
  if (typeof line?.llegaEnCarro === 'boolean') return line.llegaEnCarro;
  if (isSiValue(line?.llegaEnCarro)) return true;
  if (line?.llegaEnCarro === 'No') return false;
  return false;
}

function bautizosCompanionAgeYearsCompletedAsOf(birthDate, asOfYmd) {
  if (!birthDate || typeof birthDate !== 'string') return null;
  const b = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(b.getTime())) return null;
  const refStr = String(asOfYmd || '').trim();
  const ref = refStr ? new Date(`${refStr}T12:00:00`) : new Date();
  if (Number.isNaN(ref.getTime())) return null;
  let age = ref.getFullYear() - b.getFullYear();
  const monthDiff = ref.getMonth() - b.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < b.getDate())) age -= 1;
  if (!Number.isFinite(age) || age < 0 || age > 120) return null;
  return age;
}

function resolveBautizosLapInfantPolicyReferenceIso(eventLike) {
  if (!eventLike || typeof eventLike !== 'object') return '';
  const start = String(eventLike.dateStart || '').trim();
  if (start) return start;
  return String(eventLike.date || '').trim();
}

function isBautizosUnder3YearsAtEvent(personLike, eventLike) {
  const ref = resolveBautizosLapInfantPolicyReferenceIso(eventLike);
  const age = bautizosCompanionAgeYearsCompletedAsOf(String(personLike?.birthDate || '').trim(), ref);
  return age !== null && age < 3;
}

function isBautizosLapInfantCompanion(companionLike, eventLike) {
  return isBautizosUnder3YearsAtEvent(companionLike, eventLike);
}

function getBautizosLineListPrice(line, food, transport, eventLike = null) {
  if (line?.linkedNoExtraCharge || String(line?.linkedCompanionSourceKey || '').trim()) return 0;
  if (isBautizosUnder3YearsAtEvent(line, eventLike)) return 0;
  const arrivesByCar = resolveLlegaEnCarroLine(line);
  const transportWanted = isSiValue(line?.wantsBautizosTransport);
  const chargeTransport = transportWanted && !arrivesByCar;
  if (chargeTransport) return food + transport;
  return food;
}

const DEFAULT_BAUTIZOS_LIST_PRICE_FOOD = 150;
const DEFAULT_BAUTIZOS_LIST_PRICE_TRANSPORT = 350;

function getBautizosListPriceBreakdown(eventLike) {
  const food = Number(eventLike?.bautizosListPriceFood ?? DEFAULT_BAUTIZOS_LIST_PRICE_FOOD) || 0;
  const transport = Number(eventLike?.bautizosListPriceTransport ?? DEFAULT_BAUTIZOS_LIST_PRICE_TRANSPORT) || 0;
  return { food, transport, both: food + transport };
}

function resolveLlegaEnCarroPricing(personLike) {
  if (typeof personLike?.llegaEnCarro === 'boolean') return personLike.llegaEnCarro;
  if (isSiValue(personLike?.llegaEnCarro)) return true;
  if (personLike?.llegaEnCarro === 'No') return false;
  return (personLike?.transportType || 'Camión') === 'Carro';
}

function getBautizosListPrice(personLike, eventLike = null) {
  if (isBautizosUnder3YearsAtEvent(personLike, eventLike)) return 0;
  const { food, transport } = getBautizosListPriceBreakdown(eventLike);
  const arrivesByCar = resolveLlegaEnCarroPricing(personLike);
  const transportWanted = isSiValue(personLike?.wantsBautizosTransport);
  const chargeTransport = transportWanted && !arrivesByCar;
  if (chargeTransport) return food + transport;
  return food;
}

function getBautizosPartyListPrice(personLike, eventLike = null) {
  const { food, transport } = getBautizosListPriceBreakdown(eventLike);
  let total = getBautizosTitularListPrice(personLike, eventLike);
  for (const c of getBautizosCompanionsArray(personLike)) {
    total += getBautizosLineListPrice(c, food, transport, eventLike);
  }
  return total;
}

function normalizeServerTierCosts(globalCost, tierOrEvent) {
  const g = Number(globalCost) || 0;
  const legacySrv = Number(tierOrEvent?.serverCost) || 0;
  const ambosRaw = tierOrEvent?.serverCostAmbos;
  const ambos = ambosRaw != null && ambosRaw !== '' ? Number(ambosRaw) : legacySrv;
  const teensRaw = tierOrEvent?.serverCostTeens;
  const teens = teensRaw != null && teensRaw !== '' ? Number(teensRaw) : g;
  const jovRaw = tierOrEvent?.serverCostJovenes;
  const jovenes = jovRaw != null && jovRaw !== '' ? Number(jovRaw) : g;
  const ambosN = Number.isFinite(ambos) ? ambos : 0;
  return {
    global: g,
    server: ambosN,
    serverAmbos: ambosN,
    serverTeens: Number.isFinite(teens) ? teens : g,
    serverJovenes: Number.isFinite(jovenes) ? jovenes : g,
  };
}

function tierHasServerPricesInCamperTier(tier) {
  if (!tier) return false;
  if (tier.serverCostTeens != null && tier.serverCostTeens !== '') return true;
  if (tier.serverCostJovenes != null && tier.serverCostJovenes !== '') return true;
  if (tier.serverCostAmbos != null && tier.serverCostAmbos !== '') return true;
  if (tier.serverCost != null && tier.serverCost !== '' && Number(tier.serverCost) > 0) return true;
  return false;
}

const serverTiersFromNormalized = (n) => ({
  server: n.server,
  serverAmbos: n.serverAmbos,
  serverTeens: n.serverTeens,
  serverJovenes: n.serverJovenes,
});

function resolveCamperGlobalForIso(event, isoDate) {
  const g0 = Number(event?.globalCost) || 0;
  if (event?.pricingType !== 'dynamic' || !Array.isArray(event?.dynamicPrices) || event.dynamicPrices.length === 0) {
    return g0;
  }
  const sorted = [...event.dynamicPrices].sort((a, b) => String(a.dateUntil).localeCompare(String(b.dateUntil)));
  for (const tier of sorted) {
    if (isoDate <= tier.dateUntil) {
      return Number(tier.globalCost) || 0;
    }
  }
  return g0;
}

function resolveServerPricingForIso(event, isoDate) {
  const fixed = normalizeServerTierCosts(Number(event?.globalCost) || 0, event);
  const fixedSrv = serverTiersFromNormalized(fixed);

  if (Array.isArray(event?.dynamicServerPrices) && event.dynamicServerPrices.length > 0) {
    const sorted = [...event.dynamicServerPrices].sort((a, b) => String(a.dateUntil).localeCompare(String(b.dateUntil)));
    for (const tier of sorted) {
      if (isoDate <= tier.dateUntil) {
        return serverTiersFromNormalized(normalizeServerTierCosts(0, tier));
      }
    }
    return fixedSrv;
  }

  if (event?.pricingType === 'dynamic' && Array.isArray(event?.dynamicPrices) && event.dynamicPrices.length > 0) {
    const sorted = [...event.dynamicPrices].sort((a, b) => String(a.dateUntil).localeCompare(String(b.dateUntil)));
    const legacy = sorted.some(tierHasServerPricesInCamperTier);
    if (legacy) {
      for (const tier of sorted) {
        if (isoDate <= tier.dateUntil) {
          return serverTiersFromNormalized(normalizeServerTierCosts(0, tier));
        }
      }
      return fixedSrv;
    }
  }

  return fixedSrv;
}

function getPricingFromSnapshotForDate(event, dateMs) {
  if (!event) return { global: 0, server: 0, serverAmbos: 0, serverTeens: 0, serverJovenes: 0 };
  const tMs = Number(dateMs) || Date.now();
  const isoDate = new Date(tMs).toISOString().split('T')[0];
  const global = resolveCamperGlobalForIso(event, isoDate);
  const srv = resolveServerPricingForIso(event, isoDate);
  return { global, ...srv };
}

function getPersonCost(person, pricing, eventLike = null) {
  if (eventLike?.eventType === 'Bautizos') {
    return getBautizosPartyListPrice(person, eventLike);
  }
  if (!pricing) return 0;
  const g = Number(pricing.global) || 0;
  if (!isSiValue(person?.isServer)) return g;
  const a = String(person.serverAssignment || '').trim();
  if (a === 'Ambos') {
    const mix = String(person.ambosServeInSegment || '').trim();
    if (mix === 'Teens') {
      const st = Number.isFinite(Number(pricing.serverTeens)) ? Number(pricing.serverTeens) : g;
      return st + g;
    }
    if (mix === 'Jóvenes') {
      const sj = Number.isFinite(Number(pricing.serverJovenes)) ? Number(pricing.serverJovenes) : g;
      return sj + g;
    }
    return Number(pricing.serverAmbos ?? pricing.server) || 0;
  }
  if (a === 'Teens') return Number.isFinite(Number(pricing.serverTeens)) ? Number(pricing.serverTeens) : g;
  if (a === 'Jóvenes') return Number.isFinite(Number(pricing.serverJovenes)) ? Number(pricing.serverJovenes) : g;
  return g;
}

function resolveRegisteredCost(person, pricing, eventLike = null) {
  if (person?.registeredCostManual === true) {
    const m = parseFloat(person?.registeredCost);
    if (Number.isFinite(m) && m >= 0) return m;
  }
  const parsed = parseFloat(person?.registeredCost);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return getPersonCost(person, pricing, eventLike);
}

function getLiquidationTarget(person, currentPricing, eventLike = null) {
  if (isFreeAttendanceType(normalizeAttendanceSpecial(person))) return 0;
  if (eventLike?.eventType === 'Bautizos' && isFreeBautizosAttendance(person)) return 0;
  const listPrice = resolveRegisteredCost(person, currentPricing, eventLike);
  if (!isSiValue(person?.isScholarship)) return listPrice;
  if (person?.scholarshipType === 'partial') {
    const montoBecado = parseFloat(person.scholarshipPartialAmount || 0);
    if (!Number.isFinite(montoBecado) || montoBecado <= 0) return listPrice;
    const toLiquidate = listPrice - montoBecado;
    return Math.max(0, Math.min(toLiquidate, listPrice));
  }
  return 0;
}

function computeParticipantLiquidationTarget(person, eventLike) {
  let regMs = Date.now();
  if (person?.registeredAt != null && String(person.registeredAt).trim()) {
    const t = new Date(person.registeredAt).getTime();
    if (Number.isFinite(t)) regMs = t;
  }
  const pricing = getPricingFromSnapshotForDate(eventLike, regMs);
  return getLiquidationTarget(person, pricing, eventLike);
}

module.exports = { computeParticipantLiquidationTarget };
