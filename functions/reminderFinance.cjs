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

function getPersonCost(person, pricing) {
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

function resolveRegisteredCost(person, pricing) {
  if (person?.registeredCostManual === true) {
    const m = parseFloat(person?.registeredCost);
    if (Number.isFinite(m) && m >= 0) return m;
  }
  const parsed = parseFloat(person?.registeredCost);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return getPersonCost(person, pricing);
}

function getLiquidationTarget(person, currentPricing) {
  if (isFreeAttendanceType(normalizeAttendanceSpecial(person))) return 0;
  const listPrice = resolveRegisteredCost(person, currentPricing);
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
  return getLiquidationTarget(person, pricing);
}

module.exports = { computeParticipantLiquidationTarget };
