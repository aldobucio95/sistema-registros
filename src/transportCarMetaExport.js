import { vehicleMetaHasBasicVehicleFields } from './bautizosCarMeta.js';
import { getCarVehicleMetaFromPlan, normalizeCarVehicleMeta } from './transportPlanningCore.js';
import {
  fetchAllCarMetaForEvent,
  fetchCarMetaForTitular,
  mergeCarMetaCacheIntoPlan,
  mergeFetchedCarMetaMaps,
} from './transportCarMetaStore.js';
import { isTransportV2Plan } from './transport/v2/transportMigration.js';
import { buildTransportExcelCarGroupBlocks } from './transportExcelExport.js';

export function countCarVehicleRegistrationStatsFromBlocks(blocks, getCarMeta) {
  let registered = 0;
  let incomplete = 0;
  for (const block of blocks || []) {
    const K = Math.max(1, parseInt(block.planCars, 10) || 1);
    const titularSk = block.titularSk;
    const fallbackSks = block.fallbackTitularSks || [];
    for (let i = 1; i <= K; i++) {
      const meta = getCarMeta(titularSk, i, fallbackSks);
      if (vehicleMetaHasBasicVehicleFields(meta)) registered += 1;
      else incomplete += 1;
    }
  }
  return { registered, incomplete, total: registered + incomplete };
}

export function computeCarVehicleRegistrationStats({
  plan,
  carLines = [],
  roster = [],
  isBautizos = false,
  getCarMeta,
}) {
  const blocks = buildTransportExcelCarGroupBlocks({
    plan,
    carLines,
    roster,
    isBautizos,
    lineInExportScope: () => true,
  });
  const resolveMeta =
    typeof getCarMeta === 'function'
      ? getCarMeta
      : (titularSk, carIndex, fallbackSks) =>
          resolveCarVehicleMetaForExport(plan, titularSk, carIndex, fallbackSks);
  return countCarVehicleRegistrationStatsFromBlocks(blocks, resolveMeta);
}

function metaHasVehicleData(meta) {
  const m = normalizeCarVehicleMeta(meta);
  if (m.maybeAbsent) return true;
  if (m.brand || m.model || m.color || m.plates || m.driverSourceKey) return true;
  return Array.isArray(m.passengerSourceKeys) && m.passengerSourceKeys.length > 0;
}

/** Titulares cuyos vehículos deben cargarse antes de exportar PDF/Excel. */
export function collectTransportCarExportTitularKeys({
  plan,
  carLines = [],
  roster = [],
  isBautizos = false,
}) {
  const keys = new Set();
  const blocks = buildTransportExcelCarGroupBlocks({
    plan,
    carLines,
    roster,
    isBautizos,
    lineInExportScope: () => true,
  });
  for (const block of blocks) {
    if (block.titularSk) keys.add(String(block.titularSk).trim());
    for (const sk of block.fallbackTitularSks || []) keys.add(String(sk).trim());
  }
  return [...keys].filter(Boolean);
}

export function resolveCarVehicleMetaForExport(exportPlan, titularSk, carIndex = 1, fallbackTitularSks = []) {
  const primary = String(titularSk || '').trim();
  const candidates = [primary, ...(fallbackTitularSks || []).map((sk) => String(sk || '').trim())].filter(
    (sk, idx, arr) => sk && arr.indexOf(sk) === idx
  );
  for (const sk of candidates) {
    const meta = getCarVehicleMetaFromPlan(exportPlan, sk, carIndex);
    if (metaHasVehicleData(meta)) return meta;
  }
  return getCarVehicleMetaFromPlan(exportPlan, primary, carIndex);
}

/** Carga meta de carro desde subcolección v1/v2 para exportaciones. */
export async function loadCarMetaCacheForTransportExport(eventId, plan, existingCache = {}, opts = {}) {
  const eid = String(eventId || '').trim();
  const normalized = plan || {};
  if (!eid) return { ...(existingCache || {}) };

  let cache = { ...(existingCache || {}) };
  try {
    const allEvent = await fetchAllCarMetaForEvent(eid, {
      preferV2: isTransportV2Plan(normalized),
      transportVersion: normalized.transportVersion,
    });
    cache = mergeFetchedCarMetaMaps(cache, allEvent);
  } catch {
    /* continuar con fallback por titular */
  }

  const titularKeys =
    opts.titularKeys ||
    collectTransportCarExportTitularKeys({
      plan: normalized,
      carLines: opts.carLines || [],
      roster: opts.roster || [],
      isBautizos: opts.isBautizos === true,
    });
  const missingOwners = (titularKeys || []).filter((sk) => {
    const owner = String(sk || '').trim();
    if (!owner) return false;
    return !Object.keys(cache).some((vehicleKey) => {
      const parsedOwner = String(vehicleKey || '').split('|c')[0].trim();
      return parsedOwner === owner;
    });
  });

  if (missingOwners.length) {
    const partialMaps = await Promise.all(
      missingOwners.map((sk) =>
        fetchCarMetaForTitular(eid, sk, { preferV2: isTransportV2Plan(normalized) }).catch(() => ({}))
      )
    );
    cache = mergeFetchedCarMetaMaps(cache, ...partialMaps);
  }

  return cache;
}

export function buildTransportExportPlan(plan, carMetaCache) {
  return mergeCarMetaCacheIntoPlan(plan, carMetaCache);
}
