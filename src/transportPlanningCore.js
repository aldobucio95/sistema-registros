import { isSiValue } from './publicRegistrationLogic.js';
import {
  BAUTIZOS_ATTENDANCE,
  buildBautizadoMetaForCanonical,
  buildBautizosCanonicalCompanionPlan,
  buildBautizosSourceLinkMap,
  getBautizosCompanionsArray,
  isBautizosLapInfantCompanion,
  normalizeArrivalCarCount,
  normalizeBautizosAttendanceType,
  parseLinkSourceKey,
  resolveBautizosUltimateSourceKey,
} from './bautizosParty.js';

const PARTICIPANT_STATUS_ARCHIVED = 'archived';
const PARTICIPANT_STATUS_CANCELLED = 'cancelled';
const PARTICIPANT_STATUS_WAITLIST = 'waitlist';

/**
 * Solo filas que deben entrar al transporte: activas en sede (no espera, canceladas ni archivadas).
 * En Campa, tampoco quienes tienen beca pendiente de aprobación (misma noción que columna «Espera» del cupo).
 */
export function participantIncludedInTransportPlanning(p, eventType) {
  if (!p) return false;
  const s = p.status || 'active';
  if (
    s === PARTICIPANT_STATUS_ARCHIVED ||
    s === PARTICIPANT_STATUS_CANCELLED ||
    s === PARTICIPANT_STATUS_WAITLIST
  ) {
    return false;
  }
  const et = String(eventType || '').trim();
  if (et === 'Campa' && isSiValue(p.isScholarship) && p.scholarshipPendingApproval === true) {
    return false;
  }
  return true;
}

function resolveLlegaEnCarro(personLike) {
  if (typeof personLike?.llegaEnCarro === 'boolean') return personLike.llegaEnCarro;
  if (isSiValue(personLike?.llegaEnCarro)) return true;
  if (personLike?.llegaEnCarro === 'No') return false;
  return (personLike?.transportType || 'Camión') === 'Carro';
}

/** Quién toma camión de ida (misma idea que filtro «go-bus» en listas). */
export function personGoesByEventBus(personLike, eventType) {
  if (String(eventType || '').trim() === 'Bautizos') {
    return isSiValue(personLike?.wantsBautizosTransport) && !resolveLlegaEnCarro(personLike);
  }
  return !resolveLlegaEnCarro(personLike);
}

export function personArrivesByCarForPlanning(personLike, eventType) {
  if (String(eventType || '').trim() === 'Bautizos') {
    return resolveLlegaEnCarro(personLike);
  }
  return resolveLlegaEnCarro(personLike);
}

function getAmbosServeInSegmentOrEmpty(personLike) {
  const mix = String(personLike?.ambosServeInSegment || '').trim();
  return mix === 'Teens' || mix === 'Jóvenes' ? mix : '';
}

/**
 * Misma lógica que `getCampaAttendanceSegment` en App (Teens / Jóvenes / Ambos).
 */
export function getCampaAttendanceSegmentForTransport(person) {
  const ageNum = parseInt(person?.age, 10) || 0;
  if (isSiValue(person?.isServer)) {
    const sa = String(person?.serverAssignment || '').trim();
    if (sa === 'Ambos') {
      const mix = getAmbosServeInSegmentOrEmpty(person);
      if (mix === 'Teens' || mix === 'Jóvenes') return mix;
      return 'Ambos';
    }
    if (sa === 'Teens' || sa === 'Jóvenes') return sa;
    const camp = String(person?.campAssignment || '').trim();
    if (camp === 'Teens' || camp === 'Jóvenes') return camp;
    return ageNum < 18 ? 'Teens' : 'Jóvenes';
  }
  const assignment = String(person?.campAssignment || '').trim();
  if (assignment === 'Teens' || assignment === 'Jóvenes') return assignment;
  return ageNum < 18 ? 'Teens' : 'Jóvenes';
}

/** Con división Teens/Jóvenes activa: filas que van al bloque Teens (incl. Ambos, alineado a métricas «Todos» con x2). */
export function campaBusLineInTeensBlock(line) {
  const seg = String(line?.campaSegment || '').trim();
  return seg === 'Teens' || seg === 'Ambos';
}

export function campaBusLineInJovenesBlock(line) {
  const seg = String(line?.campaSegment || '').trim();
  return seg === 'Jóvenes' || seg === 'Ambos';
}

export function parseBusGroupKey(groupKey) {
  const raw = String(groupKey || '').trim();
  const idx = raw.indexOf('|');
  if (idx === -1) return { sedeBase: raw || '—', subevent: null };
  return {
    sedeBase: raw.slice(0, idx).trim() || '—',
    subevent: raw.slice(idx + 1).trim() || null,
  };
}

export function buildBusGroupSections(busLines, locations, isCampa, splitCampaBySubevent) {
  const sedeSet = new Set((locations || []).map((x) => String(x).trim()).filter(Boolean));
  for (const row of busLines || []) {
    const s = String(row.busSede || '—').trim() || '—';
    sedeSet.add(s);
  }
  const sedes = [...sedeSet];
  sedes.sort((a, b) => String(a).localeCompare(String(b), 'es'));
  const out = [];
  for (const sedeBase of sedes) {
    const hasPassengers = (busLines || []).some((r) => String(r.busSede || '').trim() === sedeBase);
    if (!hasPassengers) continue;
    if (isCampa && splitCampaBySubevent) {
      out.push({
        groupKey: `${sedeBase}|Teens`,
        sedeBase,
        subevent: 'Teens',
        title: `${sedeBase} · Teens`,
      });
      out.push({
        groupKey: `${sedeBase}|Jóvenes`,
        sedeBase,
        subevent: 'Jóvenes',
        title: `${sedeBase} · Jóvenes`,
      });
    } else {
      out.push({
        groupKey: sedeBase,
        sedeBase,
        subevent: null,
        title: sedeBase,
      });
    }
  }
  return out;
}

export function passengersForBusGroup(busLines, section) {
  const { sedeBase, subevent } = section;
  return (busLines || []).filter((row) => {
    if (String(row.busSede || '').trim() !== String(sedeBase).trim()) return false;
    if (!subevent) return true;
    if (subevent === 'Teens') return campaBusLineInTeensBlock(row);
    if (subevent === 'Jóvenes') return campaBusLineInJovenesBlock(row);
    return true;
  });
}

export function defaultTransportPlanningState() {
  return {
    v: 1,
    defaultBusCap: 40,
    defaultVanCap: 15,
    bautizosCarCapacity: 5,
    unitsByLocation: {},
    busAssign: {},
    carGroups: [],
    familyCarOverride: {},
    /** Bautizos: titular manual por grupo/familia (`groupId` -> `hostId`). */
    bautizosGroupTitularByGroupId: {},
    /** Metadatos opcionales del carro por `sourceKey` (persona registrada/acompañante). */
    carMetaBySource: {},
    /**
     * Campa con x2 (Ambos): preferencias de traslados por persona.
     * Clave: sourceKey `p:<id>`.
     */
    campaAmbosTransitBySource: {},
    /**
     * Confirmación de asistencia el día del evento (camión o carro).
     * Clave: sourceKey (`p:<id>` o `c:<hostId>::<companionId>`).
     */
    transportAttendanceBySource: {},
  };
}

export function normalizeTransportAttendanceEntry(raw) {
  if (!raw || typeof raw !== 'object') {
    return { confirmed: false, confirmedAt: '', confirmedBy: '' };
  }
  return {
    confirmed: raw.confirmed === true,
    confirmedAt: String(raw.confirmedAt || ''),
    confirmedBy: String(raw.confirmedBy || ''),
  };
}

export function getTransportAttendanceEntry(plan, sourceKey) {
  const sk = String(sourceKey || '').trim();
  if (!sk) return normalizeTransportAttendanceEntry(null);
  return normalizeTransportAttendanceEntry(plan?.transportAttendanceBySource?.[sk]);
}

export function isTransportAttendanceConfirmed(plan, sourceKey) {
  return getTransportAttendanceEntry(plan, sourceKey).confirmed === true;
}

/** Grupos familiares Bautizos derivados de vínculos (ids `fam-auto-*`). */
export function computeBautizosFamAutoCarGroups(bautizosCarDisplayGroups) {
  return (bautizosCarDisplayGroups || [])
    .filter((grp) => Array.isArray(grp?.lines) && grp.lines.length > 1)
    .map((grp) => ({
      id: `fam-auto-${String(grp.groupId || '').replace(/[^a-zA-Z0-9_-]/g, '_')}`,
      memberKeys: [...new Set(grp.lines.map((l) => String(l?.sourceKey || '').trim()).filter(Boolean))],
      cars: grp.isFamily ? 1 : null,
    }))
    .filter((g) => g.memberKeys.length > 1);
}

/**
 * Aplica normalizaciones automáticas (grupos fam-auto, titulares inválidos) antes de comparar o guardar.
 */
export function applyTransportPlanningAutoNormalization(plan, { isBautizos = false, bautizosCarDisplayGroups = [] } = {}) {
  const next = normalizeTransportPlanning(plan);
  if (!isBautizos) return next;

  const autoGroups = computeBautizosFamAutoCarGroups(bautizosCarDisplayGroups);
  const keep = (next.carGroups || []).filter((g) => !String(g?.id || '').startsWith('fam-auto-'));
  let merged = { ...next, carGroups: [...keep, ...autoGroups] };

  const validHostsByGroup = new Map(
    (bautizosCarDisplayGroups || []).map((grp) => [
      String(grp?.groupId || ''),
      new Set((grp?.hosts || []).map((h) => String(h?.hostId || '').trim()).filter(Boolean)),
    ])
  );
  const current = merged.bautizosGroupTitularByGroupId || {};
  const cleaned = {};
  for (const [gid, hidRaw] of Object.entries(current)) {
    const hid = String(hidRaw || '').trim();
    const valid = validHostsByGroup.get(String(gid || ''));
    if (!valid || !valid.has(hid)) continue;
    cleaned[gid] = hid;
  }
  if (JSON.stringify(cleaned) !== JSON.stringify(current)) {
    merged = { ...merged, bautizosGroupTitularByGroupId: cleaned };
  }
  return merged;
}

/** Firma estable para detectar cambios reales (ignora auto-sync al entrar a Transporte). */
export function transportPlanningDirtySignature(plan, context = {}) {
  try {
    return JSON.stringify(applyTransportPlanningAutoNormalization(plan, context));
  } catch {
    return '';
  }
}

export function normalizeTransportPlanning(raw) {
  const base = defaultTransportPlanningState();
  if (!raw || typeof raw !== 'object') return base;
  const unitsByLocation =
    raw.unitsByLocation && typeof raw.unitsByLocation === 'object' ? { ...raw.unitsByLocation } : {};
  const busAssign = raw.busAssign && typeof raw.busAssign === 'object' ? { ...raw.busAssign } : {};
  const carGroups = Array.isArray(raw.carGroups) ? raw.carGroups.map((g) => ({ ...g })) : [];
  const familyCarOverride =
    raw.familyCarOverride && typeof raw.familyCarOverride === 'object' ? { ...raw.familyCarOverride } : {};
  const bautizosGroupTitularByGroupId =
    raw.bautizosGroupTitularByGroupId && typeof raw.bautizosGroupTitularByGroupId === 'object'
      ? { ...raw.bautizosGroupTitularByGroupId }
      : {};
  const carMetaBySource =
    raw.carMetaBySource && typeof raw.carMetaBySource === 'object'
      ? Object.fromEntries(
          Object.entries(raw.carMetaBySource).map(([k, v]) => [k, normalizeCarVehicleMeta(v)])
        )
      : {};
  const campaAmbosTransitBySource =
    raw.campaAmbosTransitBySource && typeof raw.campaAmbosTransitBySource === 'object'
      ? { ...raw.campaAmbosTransitBySource }
      : {};
  const transportAttendanceBySource =
    raw.transportAttendanceBySource && typeof raw.transportAttendanceBySource === 'object'
      ? Object.fromEntries(
          Object.entries(raw.transportAttendanceBySource).map(([k, v]) => [
            String(k).trim(),
            normalizeTransportAttendanceEntry(v),
          ])
        )
      : {};
  return {
    ...base,
    ...raw,
    defaultBusCap: Math.max(1, parseInt(raw.defaultBusCap, 10) || base.defaultBusCap),
    defaultVanCap: Math.max(1, parseInt(raw.defaultVanCap, 10) || base.defaultVanCap),
    bautizosCarCapacity: Math.max(1, parseInt(raw.bautizosCarCapacity, 10) || base.bautizosCarCapacity),
    unitsByLocation,
    busAssign,
    carGroups,
    familyCarOverride,
    bautizosGroupTitularByGroupId,
    carMetaBySource,
    campaAmbosTransitBySource,
    transportAttendanceBySource,
  };
}

export function makeBusUnitId() {
  return `u-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Clave de almacenamiento para metadatos del carro N de un titular (`p:<id>|c2`, etc.). */
export function carVehicleMetaStorageKey(titularSourceKey, carIndex = 1) {
  const sk = String(titularSourceKey || '').trim();
  const i = Math.max(1, parseInt(carIndex, 10) || 1);
  return `${sk}|c${i}`;
}

export function normalizeCarVehicleMeta(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      brand: '',
      model: '',
      color: '',
      plates: '',
      maybeAbsent: false,
      pendingBrand: false,
      pendingModel: false,
      pendingColor: false,
      pendingPlates: false,
      driverSourceKey: '',
      passengerSourceKeys: [],
      pendingDriver: false,
      pendingPassengers: false,
      ownerSourceKey: '',
    };
  }
  const passengerSourceKeys = Array.isArray(raw.passengerSourceKeys)
    ? raw.passengerSourceKeys.map((x) => String(x || '').trim()).filter(Boolean)
    : [];
  return {
    brand: String(raw.brand || ''),
    model: String(raw.model || ''),
    color: String(raw.color || ''),
    plates: String(raw.plates || ''),
    maybeAbsent: raw.maybeAbsent === true,
    pendingBrand: raw.pendingBrand === true,
    pendingModel: raw.pendingModel === true,
    pendingColor: raw.pendingColor === true,
    pendingPlates: raw.pendingPlates === true,
    driverSourceKey: String(raw.driverSourceKey || ''),
    passengerSourceKeys,
    pendingDriver: raw.pendingDriver === true,
    pendingPassengers: raw.pendingPassengers === true,
    ownerSourceKey: String(raw.ownerSourceKey || ''),
    inheritsFromVehicleKey: String(raw.inheritsFromVehicleKey || ''),
  };
}

/** Lee metadatos del carro N; el carro 1 acepta clave legada sin sufijo `|c1`. */
export function getCarVehicleMetaFromPlan(plan, titularSourceKey, carIndex = 1) {
  const sk = String(titularSourceKey || '').trim();
  if (!sk) return normalizeCarVehicleMeta(null);
  const i = Math.max(1, parseInt(carIndex, 10) || 1);
  const indexedKey = carVehicleMetaStorageKey(sk, i);
  const raw = plan?.carMetaBySource?.[indexedKey] ?? (i === 1 ? plan?.carMetaBySource?.[sk] : null);
  return normalizeCarVehicleMeta(raw);
}

/** Carros confirmados (no marcados como «quizá no vayan»). */
export function countConfirmedCarsInSet(plan, titularSourceKey, effectiveCars) {
  const K = Math.max(1, parseInt(effectiveCars, 10) || 1);
  let n = 0;
  for (let i = 1; i <= K; i++) {
    if (!getCarVehicleMetaFromPlan(plan, titularSourceKey, i).maybeAbsent) n += 1;
  }
  return n;
}

/** Suma carros confirmados para un titular dado el total efectivo registrado. */
export function confirmedCarsForTitular(plan, titularSourceKey, effectiveCars) {
  return countConfirmedCarsInSet(plan, titularSourceKey, effectiveCars);
}

export function defaultVehicleLabel(sedeName, index0, _kind, subeventLabel = '') {
  const s = String(sedeName || 'Sede').trim() || 'Sede';
  const sub = String(subeventLabel || '').trim();
  if (sub) return `${s} ${sub} ${index0 + 1}`;
  return `${s} ${index0 + 1}`;
}

/** @returns {{ busLines: object[], carLines: object[] }} */
export function buildTransportPlanningLines(roster, eventType, locations, eventLike = null) {
  const et = String(eventType || '').trim();
  const isBautizos = et === 'Bautizos';
  const locSet = new Set((locations || []).map((x) => String(x).trim()).filter(Boolean));
  const busLines = [];
  const carLines = [];

  const pushBus = (row) => {
    busLines.push(row);
  };
  const pushCar = (row) => {
    carLines.push(row);
  };

  if (isBautizos) {
    const active = (roster || []).filter((p) => participantIncludedInTransportPlanning(p, et));
    const bautizadoRoster = active.filter(
      (p) => normalizeBautizosAttendanceType(p.bautizosAttendanceType) === BAUTIZOS_ATTENDANCE.bautizado
    );
    const meta = buildBautizadoMetaForCanonical(bautizadoRoster);
    /** Incluye acompañantes que se bautizan en el evento: deben figurar en camión/carro como el resto de la familia. */
    const canonPlan = buildBautizosCanonicalCompanionPlan(active, meta, { includeBaptizedCompanions: true });

    for (const p of active) {
      const pid = String(p.id || '').trim();
      if (!pid) continue;
      const loc = String(p.location || '').trim();
      const from = String(p.travelFrom || p.location || '').trim() || '—';
      if (personGoesByEventBus(p, et)) {
        pushBus({
          sourceKey: `p:${pid}`,
          kind: 'participant',
          name: String(p.name || '').trim() || '—',
          location: loc,
          busSede: from,
        });
      }
      if (personArrivesByCarForPlanning(p, et)) {
        pushCar({
          sourceKey: `p:${pid}`,
          kind: 'participant',
          name: String(p.name || '').trim() || '—',
          location: loc,
          carrosLlegada: normalizeArrivalCarCount(p.carrosLlegada),
          hostId: pid,
        });
      }
    }

    for (const info of canonPlan.values()) {
      const c = info.sourceCompanion;
      const hostId = String(info.registrantId || '').trim();
      const canonKey = String(info.canonKey || '').trim();
      if (!canonKey || !c) continue;
      const nm = String(c.name || '').trim();
      if (!nm) continue;
      const from = String(c.travelFrom || info.sourceRegistrant?.location || '').trim() || '—';
      const loc = String(info.sourceRegistrant?.location || '').trim();
      if (personGoesByEventBus(c, et) && !isBautizosLapInfantCompanion(c, eventLike)) {
        pushBus({
          sourceKey: canonKey,
          kind: 'companion',
          name: nm,
          location: loc,
          busSede: from,
          hostId,
        });
      }
      if (personArrivesByCarForPlanning(c, et)) {
        pushCar({
          sourceKey: canonKey,
          kind: 'companion',
          name: nm,
          location: loc,
          carrosLlegada: normalizeArrivalCarCount(c.carrosLlegada),
          hostId,
        });
      }
    }
  } else {
    const isCampa = et === 'Campa';
    for (const p of roster || []) {
      if (!participantIncludedInTransportPlanning(p, et)) continue;
      const pid = String(p.id || '').trim();
      if (!pid) continue;
      const loc = String(p.location || '').trim();
      const from = String(p.travelFrom || p.location || '').trim() || '—';
      if (personGoesByEventBus(p, et)) {
        pushBus({
          sourceKey: `p:${pid}`,
          kind: 'participant',
          name: String(p.name || '').trim() || '—',
          location: loc,
          busSede: from,
          ...(isCampa ? { campaSegment: getCampaAttendanceSegmentForTransport(p) } : {}),
        });
      }
      if (personArrivesByCarForPlanning(p, et)) {
        pushCar({
          sourceKey: `p:${pid}`,
          kind: 'participant',
          name: String(p.name || '').trim() || '—',
          location: loc,
          carrosLlegada: normalizeArrivalCarCount(p.carrosLlegada),
          hostId: pid,
        });
      }
    }
  }

  const normLoc = (s) => {
    const t = String(s || '').trim();
    if (locSet.has(t)) return t;
    return t || '—';
  };
  for (const row of busLines) {
    row.busSede = normLoc(row.busSede);
  }
  for (const row of carLines) {
    row.location = normLoc(row.location);
  }

  return { busLines, carLines };
}

export function groupBusLinesBySede(busLines) {
  const m = new Map();
  for (const row of busLines || []) {
    const k = String(row.busSede || '—').trim() || '—';
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(row);
  }
  return m;
}

/** Unidades existentes por sede o []. */
export function getUnitsForSede(plan, sede) {
  const k = String(sede || '').trim();
  const u = plan.unitsByLocation[k];
  return Array.isArray(u) ? u : [];
}

export function countAssignedToUnit(plan, unitId) {
  const id = String(unitId || '').trim();
  if (!id) return 0;
  let n = 0;
  for (const v of Object.values(plan.busAssign || {})) {
    if (String(v) === id) n += 1;
  }
  return n;
}

/**
 * Grupos de carro: { id, memberKeys[], cars? }
 * Si cars omitido, se calcula con heurística.
 */
export function buildCarGroupKeyToGroup(plan) {
  const map = new Map();
  const groups = Array.isArray(plan.carGroups) ? plan.carGroups : [];
  for (const g of groups) {
    const id = String(g?.id || '').trim();
    if (!id) continue;
    const keys = Array.isArray(g.memberKeys) ? g.memberKeys.map((x) => String(x).trim()).filter(Boolean) : [];
    for (const key of keys) map.set(key, { ...g, id, memberKeys: keys });
  }
  return map;
}

/** Grupo creado con «Unir selección en un carro» (`cg-*`). */
export function isManualCarPlanGroup(g) {
  return String(g?.id || '').trim().startsWith('cg-');
}

/** Grupos manuales con al menos dos integrantes. */
export function getManualCarPlanGroups(plan) {
  return (Array.isArray(plan?.carGroups) ? plan.carGroups : []).filter(
    (g) => isManualCarPlanGroup(g) && (g.memberKeys || []).length >= 2
  );
}

/**
 * Máximo de carros registrados (`carrosLlegada`) entre titulares del grupo manual.
 * Incluye vehículos marcados «quizá no vaya» (conteo de registro, no confirmados).
 */
export function manualGroupMaxRegisteredCars(memberLines) {
  const byHost = new Map();
  for (const line of memberLines || []) {
    if (String(line?.kind || '') !== 'participant') continue;
    const hid = String(line.hostId || '').trim();
    if (!hid) continue;
    const n = normalizeArrivalCarCount(line.carrosLlegada);
    byHost.set(hid, Math.max(byHost.get(hid) || 0, n));
  }
  if (byHost.size > 0) {
    return Math.max(1, ...byHost.values());
  }
  let fallback = 0;
  for (const line of memberLines || []) {
    fallback = Math.max(fallback, normalizeArrivalCarCount(line?.carrosLlegada));
  }
  return Math.max(1, fallback);
}

/** Carros efectivos del grupo manual: al menos el máximo registrado entre titulares. */
export function manualGroupEffectiveCars(planGroup, memberLines) {
  const inherited = manualGroupMaxRegisteredCars(memberLines);
  const c = parseInt(planGroup?.cars, 10);
  const explicit = Number.isFinite(c) && c >= 1 ? c : 1;
  return Math.max(inherited, explicit);
}

/**
 * Vistas de grupos manuales para UI/PDF.
 * @returns {Array<{ id, label, memberKeys, memberLines, effectiveCars, carsBeforeMerge, titularSk, inheritedCars }>}
 */
export function buildManualCarGroupViews(plan, carLines) {
  const lineByKey = new Map();
  for (const line of carLines || []) {
    const sk = String(line.sourceKey || '').trim();
    if (sk) lineByKey.set(sk, line);
  }

  let manualN = 0;
  return getManualCarPlanGroups(plan).map((g) => {
    manualN += 1;
    const memberKeys = (g.memberKeys || []).map((x) => String(x).trim()).filter(Boolean);
    const memberLines = memberKeys.map((k) => lineByKey.get(k)).filter(Boolean);

    const hostIds = new Set();
    for (const line of memberLines) {
      const hid = String(line.hostId || '').trim();
      if (hid) hostIds.add(hid);
    }
    let carsBeforeMerge = 0;
    for (const hid of hostIds) {
      const participant =
        memberLines.find((l) => l.kind === 'participant' && String(l.hostId || '').trim() === hid) ||
        memberLines.find((l) => String(l.hostId || '').trim() === hid && l.kind === 'participant');
      const fromLine = participant || memberLines.find((l) => String(l.hostId || '').trim() === hid);
      carsBeforeMerge += normalizeArrivalCarCount(fromLine?.carrosLlegada);
    }
    if (carsBeforeMerge < 1 && memberLines.length > 0) {
      carsBeforeMerge = memberLines.reduce(
        (sum, line) => sum + (line.kind === 'participant' ? normalizeArrivalCarCount(line.carrosLlegada) : 0),
        0
      );
      if (carsBeforeMerge < 1) carsBeforeMerge = hostIds.size || memberLines.length;
    }

    const inheritedCars = manualGroupMaxRegisteredCars(memberLines);
    const effectiveCars = manualGroupEffectiveCars(g, memberLines);
    const titularLine = memberLines.find((l) => l.kind === 'participant') || memberLines[0];
    return {
      id: String(g.id || '').trim(),
      label: `Grupo manual ${manualN}`,
      memberKeys,
      memberLines,
      effectiveCars,
      inheritedCars,
      carsBeforeMerge: Math.max(1, carsBeforeMerge),
      titularSk: String(titularLine?.sourceKey || memberKeys[0] || '').trim(),
    };
  });
}

/**
 * Omite titulares y líneas ya asignados a un grupo manual (`cg-*`) en tarjetas familiares.
 * @returns {object|null} Grupo filtrado o null si no queda nadie por mostrar.
 */
export function filterBautizosDisplayGroupExcludingManual(grp, manualGroupedKeys) {
  const keys = manualGroupedKeys instanceof Set ? manualGroupedKeys : new Set(manualGroupedKeys || []);
  if (!grp || keys.size === 0) return grp;

  const skInManual = (sk) => keys.has(String(sk || '').trim());
  const hostInManual = (hostId) => skInManual(`p:${String(hostId || '').trim()}`);

  const filteredHosts = (grp.hosts || [])
    .filter((h) => !hostInManual(h.hostId))
    .map((h) => {
      const lines = (h.lines || []).filter((ln) => !skInManual(ln.sourceKey));
      const memberKeys = (h.memberKeys || []).filter((k) => !skInManual(k));
      return { ...h, lines, memberKeys };
    })
    .filter((h) => (h.lines || []).length > 0);

  if (filteredHosts.length === 0) return null;

  const filteredLines = (grp.lines || []).filter((ln) => !skInManual(ln.sourceKey));
  if (filteredLines.length === 0) return null;

  return {
    ...grp,
    hosts: filteredHosts,
    lines: filteredLines,
    isFamily: filteredHosts.length > 1 ? grp.isFamily : false,
  };
}

/** Separa líneas ya asignadas a un grupo del plan (2+ integrantes) vs. sueltas. */
export function splitCarLinesByPlanGroups(carLines, plan) {
  const keyToGroup = buildCarGroupKeyToGroup(plan);
  const groupedKeys = new Set();
  for (const g of plan?.carGroups || []) {
    if ((g.memberKeys || []).length < 2) continue;
    for (const k of g.memberKeys || []) {
      const sk = String(k).trim();
      if (sk) groupedKeys.add(sk);
    }
  }
  const ungroupedLines = (carLines || []).filter((l) => !groupedKeys.has(String(l.sourceKey || '').trim()));
  return { groupedKeys, ungroupedLines, keyToGroup };
}

/** Nombres de otros integrantes del mismo grupo manual (excluye `sourceKey`). */
export function manualCarGroupMateNames(plan, carLines, sourceKey) {
  const sk = String(sourceKey || '').trim();
  if (!sk) return [];
  const keyToGroup = buildCarGroupKeyToGroup(plan);
  const g = keyToGroup.get(sk);
  if (!g || !isManualCarPlanGroup(g) || (g.memberKeys || []).length < 2) return [];
  const lineByKey = new Map();
  for (const line of carLines || []) {
    const k = String(line.sourceKey || '').trim();
    if (k) lineByKey.set(k, line);
  }
  return (g.memberKeys || [])
    .map((k) => String(k).trim())
    .filter((k) => k && k !== sk)
    .map((k) => String(lineByKey.get(k)?.name || '').trim())
    .filter(Boolean);
}

/**
 * Líneas del grupo manual que comparten `sourceKey` (incluye la propia).
 * Útil para slotear varios registros en el mismo carro.
 */
export function manualCarGroupLinesForMember(plan, carLines, sourceKey) {
  const sk = String(sourceKey || '').trim();
  if (!sk) return [];
  const keyToGroup = buildCarGroupKeyToGroup(plan);
  const g = keyToGroup.get(sk);
  if (!g || !isManualCarPlanGroup(g) || (g.memberKeys || []).length < 2) return [];
  const lineByKey = new Map();
  for (const line of carLines || []) {
    const k = String(line.sourceKey || '').trim();
    if (k) lineByKey.set(k, line);
  }
  return (g.memberKeys || [])
    .map((k) => lineByKey.get(String(k).trim()))
    .filter(Boolean);
}

/**
 * Líneas «llegan en carro» agrupadas por titular del registro (hostId = id participante bautizos).
 */
export function buildBautizosCarFamilyInfo(carLines) {
  const byHost = new Map();
  for (const line of carLines || []) {
    const hid = String(line.hostId || '').trim();
    if (!hid) continue;
    if (!byHost.has(hid)) {
      byHost.set(hid, { memberKeys: [], lines: [], hostCarros: 1 });
    }
    const bucket = byHost.get(hid);
    const sk = String(line.sourceKey || '').trim();
    if (sk && !bucket.memberKeys.includes(sk)) bucket.memberKeys.push(sk);
    bucket.lines.push(line);
    if (line.kind === 'participant') {
      bucket.hostCarros = normalizeArrivalCarCount(line.carrosLlegada);
    }
  }
  return byHost;
}

/**
 * Carros efectivos para una familia Bautizos: override manual → cars del grupo → carros del registro (titular) → mínimo por plazas.
 */
export function bautizosFamilyEffectiveCarCount(hostId, fam, plan, keyToGroup) {
  const memberKeys = fam.memberKeys || [];
  const n = memberKeys.length;
  if (n < 1) return 1;

  const o = plan.familyCarOverride?.[hostId];
  if (o != null && o !== '') {
    const v = parseInt(o, 10);
    if (Number.isFinite(v) && v >= 1) return v;
  }

  const cap = Math.max(1, parseInt(plan.bautizosCarCapacity, 10) || 5);

  for (const sk of memberKeys) {
    const g = keyToGroup.get(sk);
    if (!g || !Array.isArray(g.memberKeys) || g.memberKeys.length < 2) continue;
    const c = parseInt(g.cars, 10);
    if (Number.isFinite(c) && c >= 1) return c;

    const gset = new Set(g.memberKeys.map((x) => String(x).trim()));
    const familyInGroup = memberKeys.every((k) => gset.has(String(k).trim()));
    if (familyInGroup) {
      return Math.max(1, fam.hostCarros);
    }
    return Math.max(1, Math.ceil(g.memberKeys.length / cap));
  }

  if (n >= 2) return Math.max(1, fam.hostCarros);
  return Math.max(1, fam.hostCarros);
}

const TRANSPORT_ROSTER_ORDER_UNKNOWN = 1_000_000_000;

/** Índice de orden del roster filtrado/ordenado global (`sourceKey` o `id` de participante → índice). */
export function buildTransportRosterOrderIndex(roster) {
  const index = new Map();
  (roster || []).forEach((p, i) => {
    const id = String(p?.id || '').trim();
    if (!id) return;
    index.set(id, i);
    index.set(`p:${id}`, i);
  });
  return index;
}

export function transportLineRosterOrder(line, orderIndex) {
  const idx = orderIndex instanceof Map ? orderIndex : buildTransportRosterOrderIndex(orderIndex);
  const sk = String(line?.sourceKey || '').trim();
  if (idx.has(sk)) return idx.get(sk);
  const hostId = String(line?.hostId || '').trim();
  if (hostId) {
    if (idx.has(hostId)) return idx.get(hostId);
    const hostSk = `p:${hostId}`;
    if (idx.has(hostSk)) return idx.get(hostSk);
  }
  return TRANSPORT_ROSTER_ORDER_UNKNOWN;
}

export function compareTransportLinesByRosterOrder(a, b, orderIndex) {
  const oa = transportLineRosterOrder(a, orderIndex);
  const ob = transportLineRosterOrder(b, orderIndex);
  if (oa !== ob) return oa - ob;
  if (a?.kind === 'participant' && b?.kind !== 'participant') return -1;
  if (b?.kind === 'participant' && a?.kind !== 'participant') return 1;
  return String(a?.name || '').localeCompare(String(b?.name || ''), 'es');
}

export function sortTransportLinesByRosterOrder(lines, rosterOrIndex) {
  const orderIndex =
    rosterOrIndex instanceof Map ? rosterOrIndex : buildTransportRosterOrderIndex(rosterOrIndex);
  return [...(lines || [])].sort((a, b) => compareTransportLinesByRosterOrder(a, b, orderIndex));
}

function hostRosterOrder(hostId, orderIndex) {
  const hid = String(hostId || '').trim();
  if (!hid) return TRANSPORT_ROSTER_ORDER_UNKNOWN;
  if (orderIndex.has(hid)) return orderIndex.get(hid);
  const hostSk = `p:${hid}`;
  if (orderIndex.has(hostSk)) return orderIndex.get(hostSk);
  return TRANSPORT_ROSTER_ORDER_UNKNOWN;
}

/**
 * Reparte personas en Car 1…K según plazas por carro (visualización).
 */
export function assignBautizosMembersToCarSlots(lines, effectiveCars, seatsPerCar, roster = null) {
  const K = Math.max(1, parseInt(effectiveCars, 10) || 1);
  const cap = Math.max(1, parseInt(seatsPerCar, 10) || 5);
  const sorted = roster
    ? sortTransportLinesByRosterOrder(lines, roster)
    : [...(lines || [])].sort((a, b) => {
        if (a.kind === 'participant' && b.kind !== 'participant') return -1;
        if (b.kind === 'participant' && a.kind !== 'participant') return 1;
        return String(a.name || '').localeCompare(String(b.name || ''), 'es');
      });
  const slots = Array.from({ length: K }, (_, i) => ({ carIndex: i + 1, members: [] }));
  sorted.forEach((line, idx) => {
    const slotIdx = Math.min(Math.floor(idx / cap), K - 1);
    slots[slotIdx].members.push({
      sourceKey: line.sourceKey,
      name: line.name,
      kind: line.kind,
    });
  });
  return slots;
}

/** @param familyInfo {Map} resultado de buildBautizosCarFamilyInfo; omitir en no-Bautizos. */
export function effectiveCarsForCarLine(line, plan, keyToGroup, isBautizos, familyInfo) {
  if (isBautizos && familyInfo) {
    const hid = String(line.hostId || '').trim();
    if (hid) {
      const fam = familyInfo.get(hid);
      if (fam) return bautizosFamilyEffectiveCarCount(hid, fam, plan, keyToGroup);
    }
    return normalizeArrivalCarCount(line.carrosLlegada);
  }

  const sk = String(line.sourceKey || '').trim();
  const g = keyToGroup.get(sk);
  if (g && g.memberKeys && g.memberKeys.length > 1) {
    const c = parseInt(g.cars, 10);
    if (Number.isFinite(c) && c >= 1) return c;
    if (isBautizos) {
      const cap = Math.max(1, parseInt(plan.bautizosCarCapacity, 10) || 5);
      return Math.max(1, Math.ceil(g.memberKeys.length / cap));
    }
    return 1;
  }
  return normalizeArrivalCarCount(line.carrosLlegada);
}

export function totalCarsCount(carLines, plan, isBautizos, roster = []) {
  const keyToGroup = buildCarGroupKeyToGroup(plan);

  const addTitularConfirmed = (titularSk, rawCount) => {
    const K = Math.max(1, parseInt(rawCount, 10) || 1);
    return confirmedCarsForTitular(plan, titularSk, K);
  };

  if (!isBautizos) {
    const seenGroups = new Set();
    let total = 0;
    for (const line of carLines || []) {
      const sk = String(line.sourceKey || '').trim();
      const g = keyToGroup.get(sk);
      if (g && g.memberKeys && g.memberKeys.length > 1) {
        const gid = g.id;
        if (seenGroups.has(gid)) continue;
        seenGroups.add(gid);
        const c = parseInt(g.cars, 10);
        const eff = Number.isFinite(c) && c >= 1 ? c : 1;
        const titularLine = (carLines || []).find(
          (l) => g.memberKeys.includes(String(l.sourceKey).trim()) && l.kind === 'participant'
        );
        const titularSk = titularLine?.sourceKey || sk;
        total += addTitularConfirmed(titularSk, eff);
        continue;
      }
      total += addTitularConfirmed(sk, normalizeArrivalCarCount(line.carrosLlegada));
    }
    return total;
  }

  const coveredKeys = new Set();
  const seenManualGroups = new Set();
  let total = 0;

  for (const g of getManualCarPlanGroups(plan)) {
    const gid = String(g.id || '').trim();
    if (!gid || seenManualGroups.has(gid)) continue;
    seenManualGroups.add(gid);
    const memberKeys = (g.memberKeys || []).map((x) => String(x).trim()).filter(Boolean);
    for (const k of memberKeys) coveredKeys.add(k);
    const memberLines = memberKeys
      .map((k) => (carLines || []).find((l) => String(l.sourceKey || '').trim() === k))
      .filter(Boolean);
    const eff = manualGroupEffectiveCars(g, memberLines);
    const titularLine = (carLines || []).find(
      (l) => memberKeys.includes(String(l.sourceKey).trim()) && l.kind === 'participant'
    );
    const titularSk = titularLine?.sourceKey || memberKeys[0] || '';
    total += addTitularConfirmed(titularSk, eff);
  }

  const countBautizosDisplayGroup = (grp) => {
    const keys = new Set(grp.lines.map((l) => String(l.sourceKey || '').trim()).filter(Boolean));
    const linkedPlanGroups = new Map();
    for (const sk of keys) {
      const g = keyToGroup.get(sk);
      if (g?.id && !isManualCarPlanGroup(g)) linkedPlanGroups.set(String(g.id), g);
    }
    let explicitCars = null;
    for (const g of linkedPlanGroups.values()) {
      const c = parseInt(g?.cars, 10);
      if (!Number.isFinite(c) || c < 1) continue;
      explicitCars = explicitCars == null ? c : Math.max(explicitCars, c);
    }
    if (explicitCars != null) {
      const leaderLine = (grp.lines || []).find((l) => l.kind === 'participant');
      const titularSk = leaderLine?.sourceKey || (grp.hosts?.[0]?.hostId ? `p:${grp.hosts[0].hostId}` : '');
      return addTitularConfirmed(titularSk, explicitCars);
    }

    let overrideCars = null;
    for (const h of grp.hosts || []) {
      if (coveredKeys.has(`p:${String(h.hostId || '').trim()}`)) continue;
      const o = plan.familyCarOverride?.[h.hostId];
      const c = parseInt(o, 10);
      if (!Number.isFinite(c) || c < 1) continue;
      overrideCars = overrideCars == null ? c : Math.max(overrideCars, c);
    }
    if (overrideCars != null) {
      const leaderHost = (grp.hosts || []).find((h) => !coveredKeys.has(`p:${String(h.hostId || '').trim()}`));
      const titularSk = leaderHost?.hostId ? `p:${leaderHost.hostId}` : '';
      if (titularSk) return addTitularConfirmed(titularSk, overrideCars);
      return 0;
    }

    if (grp.isFamily) {
      const leaderHost = (grp.hosts || []).find((h) => !coveredKeys.has(`p:${String(h.hostId || '').trim()}`));
      if (!leaderHost) return 0;
      const titularSk = leaderHost.hostId ? `p:${leaderHost.hostId}` : '';
      return addTitularConfirmed(titularSk, 1);
    }

    let hostTotal = 0;
    for (const host of grp.hosts || []) {
      const hostSk = `p:${String(host.hostId || '').trim()}`;
      if (coveredKeys.has(hostSk)) continue;
      const fam = { memberKeys: host.memberKeys, hostCarros: host.hostCarros, lines: host.lines };
      const eff = bautizosFamilyEffectiveCarCount(host.hostId, fam, plan, keyToGroup);
      hostTotal += addTitularConfirmed(hostSk, eff);
    }
    return hostTotal;
  };

  const displayGroups = buildBautizosCarDisplayGroups(roster, carLines);
  for (const grp of displayGroups) {
    const participantLines = (grp.lines || []).filter((l) => l.kind === 'participant');
    const uncoveredParticipants = participantLines.filter(
      (l) => !coveredKeys.has(String(l.sourceKey || '').trim())
    );
    if (participantLines.length > 0 && uncoveredParticipants.length === 0) continue;
    total += countBautizosDisplayGroup(grp);
  }
  return total;
}

/** Agrupa carLines por host (Bautizos): una familia = titular + acompañantes; `cars` = carros del registro del titular. */
export function suggestBautizosFamilyCarGroups(carLines) {
  const info = buildBautizosCarFamilyInfo(carLines);
  const groups = [];
  let idx = 0;
  for (const [hostId, fam] of info) {
    if (fam.memberKeys.length < 2) continue;
    idx += 1;
    groups.push({
      id: `fam-${hostId}-${idx}`,
      memberKeys: [...fam.memberKeys],
      cars: Math.max(1, fam.hostCarros),
    });
  }
  return groups;
}

/**
 * Bautizos: agrupa hosts de carro por familia usando la misma red de vínculos
 * (`linkedCompanionSourceKey`) que alimenta los árboles familiares de Acompañantes.
 * Si no hay vínculo entre registros, queda un grupo por registro.
 */
export function buildBautizosCarDisplayGroups(roster, carLines) {
  const activeRoster = Array.isArray(roster) ? roster : [];
  const lines = Array.isArray(carLines) ? carLines : [];
  const orderIndex = buildTransportRosterOrderIndex(activeRoster);
  const byHost = new Map();
  for (const line of lines) {
    const hostId = String(line?.hostId || '').trim();
    if (!hostId) continue;
    if (!byHost.has(hostId)) byHost.set(hostId, []);
    byHost.get(hostId).push(line);
  }
  const hostIds = [...byHost.keys()];
  if (hostIds.length === 0) return [];

  class DSU {
    constructor(ids) {
      this.p = new Map();
      for (const id of ids) this.p.set(id, id);
    }
    find(x) {
      if (!this.p.has(x)) this.p.set(x, x);
      if (this.p.get(x) !== x) this.p.set(x, this.find(this.p.get(x)));
      return this.p.get(x);
    }
    union(a, b) {
      const ra = this.find(a);
      const rb = this.find(b);
      if (ra !== rb) this.p.set(ra, rb);
    }
  }

  const hostSet = new Set(hostIds);
  const dsu = new DSU(hostIds);
  const sourceLinkMap = buildBautizosSourceLinkMap(activeRoster);

  for (const p of activeRoster) {
    const pid = String(p?.id || '').trim();
    if (!pid || !hostSet.has(pid)) continue;
    for (const c of getBautizosCompanionsArray(p)) {
      const nm = String(c?.name || '').trim();
      if (!nm) continue;
      const skRaw = String(c?.linkedCompanionSourceKey || '').trim();
      if (skRaw.startsWith('p:')) {
        const otherId = String(skRaw.slice(2)).trim();
        if (hostSet.has(otherId)) dsu.union(pid, otherId);
        continue;
      }
      if (!skRaw.startsWith('c:')) continue;
      const ultimate = resolveBautizosUltimateSourceKey(skRaw, sourceLinkMap);
      const parsed = parseLinkSourceKey(ultimate) || parseLinkSourceKey(skRaw);
      if (parsed?.kind !== 'companion') continue;
      const hostId = String(parsed.hostId || '').trim();
      if (hostSet.has(hostId)) dsu.union(pid, hostId);
    }
  }

  const rosterById = new Map(activeRoster.map((p) => [String(p?.id || '').trim(), p]));
  const byRoot = new Map();
  for (const hostId of hostIds) {
    const root = dsu.find(hostId);
    if (!byRoot.has(root)) byRoot.set(root, []);
    byRoot.get(root).push(hostId);
  }

  const groups = [];
  for (const hosts of byRoot.values()) {
    const sortedHosts = [...hosts].sort((a, b) => hostRosterOrder(a, orderIndex) - hostRosterOrder(b, orderIndex));
    const hostRows = sortedHosts.map((hostId) => {
      const hostLines = sortTransportLinesByRosterOrder(byHost.get(hostId) || [], orderIndex);
      const participantLine = hostLines.find((x) => x.kind === 'participant') || hostLines[0] || null;
      return {
        hostId,
        hostName: String(participantLine?.name || rosterById.get(hostId)?.name || '').trim() || '—',
        location: String(participantLine?.location || rosterById.get(hostId)?.location || '').trim() || '—',
        hostAge: (() => {
          const n = parseInt(rosterById.get(hostId)?.age, 10);
          return Number.isFinite(n) ? n : null;
        })(),
        lines: hostLines,
        memberKeys: hostLines.map((x) => String(x.sourceKey || '').trim()).filter(Boolean),
        hostCarros: participantLine ? normalizeArrivalCarCount(participantLine.carrosLlegada) : 1,
      };
    });
    const allLines = hostRows.flatMap((h) => h.lines);
    groups.push({
      groupId: hostRows.map((h) => h.hostId).join('|'),
      isFamily: hostRows.length > 1,
      hosts: hostRows,
      lines: allLines,
    });
  }

  groups.sort((a, b) => {
    const minOrder = (grp) =>
      Math.min(
        ...(grp.hosts || []).map((h) => hostRosterOrder(h.hostId, orderIndex)),
        TRANSPORT_ROSTER_ORDER_UNKNOWN
      );
    return minOrder(a) - minOrder(b);
  });
  return groups;
}
