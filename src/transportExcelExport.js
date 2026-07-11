import { normalizeArrivalCarCount } from './bautizosParty.js';
import {
  buildBautizosCarDisplayGroups,
  buildBautizosCarFamilyInfo,
  buildCarGroupKeyToGroup,
  buildManualCarGroupViews,
  countConfirmedCarsInSet,
  effectiveCarsForCarLine,
  filterBautizosDisplayGroupExcludingManual,
  isManualCarPlanGroup,
  manualGroupEffectiveCars,
  manualGroupMaxRegisteredCars,
  resolveManualCarGroupTitularSk,
} from './transportPlanningCore.js';
import { resolveCarVehicleMetaForExport } from './transportCarMetaExport.js';

const CAR_GROUP_SUMMARY_HEADERS = [
  'Tipo grupo',
  'Grupo',
  'Titular',
  'Sede',
  'Personas',
  'Carros registrados',
  'Carros en plan',
  'Carros confirmados',
  'Notas',
];

const CAR_VEHICLE_DETAIL_HEADERS = [
  'Grupo',
  'Titular',
  'Carro',
  'Marca',
  'Modelo',
  'Color',
  'Placas',
  'Quizá no vaya',
  'Conductor',
  'Pasajeros',
];

export function resolveBautizosExportGroupLeader(grp, plan) {
  const hosts = Array.isArray(grp?.hosts) ? grp.hosts : [];
  if (!hosts.length) return null;
  const manualHostId = String(plan?.bautizosGroupTitularByGroupId?.[String(grp?.groupId || '')] || '').trim();
  if (manualHostId) {
    const pick = hosts.find((h) => String(h?.hostId || '').trim() === manualHostId);
    if (pick) return pick;
  }
  const adults = hosts.filter((h) => Number.isFinite(h?.hostAge) && h.hostAge >= 18);
  if (adults.length > 0) {
    return [...adults].sort((a, b) => (b.hostAge || 0) - (a.hostAge || 0))[0] || null;
  }
  return hosts[0] || null;
}

export function resolveBautizosDisplayGroupCars(grp, plan, keyToGroup) {
  const keys = new Set((grp?.lines || []).map((l) => String(l.sourceKey || '').trim()).filter(Boolean));
  let explicitCars = null;
  for (const sk of keys) {
    const g = keyToGroup.get(sk);
    const c = parseInt(g?.cars, 10);
    if (!Number.isFinite(c) || c < 1) continue;
    explicitCars = explicitCars == null ? c : Math.max(explicitCars, c);
  }
  if (explicitCars != null) return explicitCars;

  let overrideCars = null;
  for (const h of grp?.hosts || []) {
    const c = parseInt(plan?.familyCarOverride?.[h.hostId], 10);
    if (!Number.isFinite(c) || c < 1) continue;
    overrideCars = overrideCars == null ? c : Math.max(overrideCars, c);
  }
  if (overrideCars != null) return overrideCars;

  if (grp?.isFamily) return 1;
  const host = grp?.hosts?.[0];
  if (!host) return 1;
  return Math.max(1, normalizeArrivalCarCount(host.hostCarros));
}

export function sumRegisteredCarsForBautizosGroup(grp) {
  let total = 0;
  for (const h of grp?.hosts || []) {
    total += Math.max(0, normalizeArrivalCarCount(h.hostCarros));
  }
  return Math.max(1, total || (grp?.hosts?.length || 1));
}

function participantTitularKeysFromLines(lines, excludeSk = '') {
  const exclude = String(excludeSk || '').trim();
  return [...new Set(
    (lines || [])
      .filter((line) => line?.kind === 'participant')
      .map((line) => String(line.sourceKey || '').trim())
      .filter((sk) => sk && sk !== exclude)
  )];
}

function hostTitularKeysFromGroup(grp, excludeSk = '') {
  const exclude = String(excludeSk || '').trim();
  return [...new Set(
    (grp?.hosts || [])
      .map((host) => hostToTitularSk(host))
      .filter((sk) => sk && sk !== exclude)
  )];
}

function hostToTitularSk(host) {
  const participantLine = (host?.lines || []).find((ln) => ln?.kind === 'participant');
  if (participantLine?.sourceKey) return String(participantLine.sourceKey);
  const hid = String(host?.hostId || '').trim();
  return hid ? `p:${hid}` : '';
}

function groupSedeLabel(lines) {
  const sedes = [...new Set((lines || []).map((l) => String(l?.location || '').trim()).filter(Boolean))];
  return sedes.join(', ') || '—';
}

function buildNameIndexFromCarLines(carLines) {
  const map = new Map();
  for (const line of carLines || []) {
    const sk = String(line?.sourceKey || '').trim();
    if (sk) map.set(sk, String(line?.name || '').trim() || '—');
  }
  return map;
}

function sourceKeyLabel(nameBySk, sk) {
  const key = String(sk || '').trim();
  if (!key) return '—';
  return nameBySk.get(key) || key;
}

function vehicleMetaField(meta, field) {
  const value = String(meta?.[field] || '').trim();
  return value || 'Pendiente';
}

function pushVehicleRowsForGroup(rows, { groupLabel, titularName, titularSk, effectiveCars, exportPlan, nameBySk, fallbackTitularSks = [] }) {
  const K = Math.max(1, parseInt(effectiveCars, 10) || 1);
  for (let i = 1; i <= K; i++) {
    const meta = resolveCarVehicleMetaForExport(exportPlan, titularSk, i, fallbackTitularSks);
    const passengers = (meta.passengerSourceKeys || [])
      .map((sk) => sourceKeyLabel(nameBySk, sk))
      .filter(Boolean)
      .join('; ');
    rows.push([
      groupLabel,
      titularName,
      `${i} de ${K}`,
      vehicleMetaField(meta, 'brand'),
      vehicleMetaField(meta, 'model'),
      vehicleMetaField(meta, 'color'),
      vehicleMetaField(meta, 'plates'),
      meta.maybeAbsent ? 'Sí' : 'No',
      meta.pendingDriver ? 'Pendiente' : sourceKeyLabel(nameBySk, meta.driverSourceKey),
      meta.pendingPassengers ? 'Pendiente' : passengers || '—',
    ]);
  }
}

function carsRegisteredFromMemberLines(memberLines) {
  let total = 0;
  for (const line of memberLines || []) {
    if (line?.kind === 'participant') {
      total += normalizeArrivalCarCount(line.carrosLlegada);
    }
  }
  if (total < 1) {
    total = (memberLines || []).reduce(
      (sum, line) => sum + (line?.kind === 'participant' ? normalizeArrivalCarCount(line.carrosLlegada) : 0),
      0
    );
  }
  return Math.max(1, total || (memberLines?.length || 1));
}

function buildBautizosCarExportBlocks({ plan, carLines, roster, lineInExportScope }) {
  const keyToGroup = buildCarGroupKeyToGroup(plan);
  const manualViews = buildManualCarGroupViews(plan, carLines);
  const manualKeys = new Set(manualViews.flatMap((view) => view.memberKeys || []));
  const blocks = [];

  for (const view of manualViews) {
    const scopedLines = (view.memberLines || []).filter(lineInExportScope);
    if (!scopedLines.length) continue;
    const savingsNote =
      view.carsBeforeMerge > view.effectiveCars
        ? `Registro: ${view.carsBeforeMerge} → Plan: ${view.effectiveCars}`
        : '';
    blocks.push({
      kind: 'manual',
      groupLabel: view.label,
      titularName: view.titularName,
      titularSk: view.titularSk,
      sede: groupSedeLabel(scopedLines),
      people: view.memberLines.length,
      registeredCars: view.carsBeforeMerge,
      planCars: view.effectiveCars,
      confirmedCars: countConfirmedCarsInSet(plan, view.titularSk, view.effectiveCars),
      notes: savingsNote,
      fallbackTitularSks: participantTitularKeysFromLines(view.memberLines, view.titularSk),
    });
  }

  let familyN = 0;
  let regN = 0;
  const displayGroups = buildBautizosCarDisplayGroups(roster, carLines);
  for (const grp of displayGroups) {
    const filtered = filterBautizosDisplayGroupExcludingManual(grp, manualKeys);
    if (!filtered) continue;
    const scopedLines = (filtered.lines || []).filter(lineInExportScope);
    if (!scopedLines.length) continue;
    const leader = resolveBautizosExportGroupLeader(filtered, plan);
    const titularSk = hostToTitularSk(leader || filtered.hosts?.[0]);
    const eff = resolveBautizosDisplayGroupCars(filtered, plan, keyToGroup);
    const registered = sumRegisteredCarsForBautizosGroup(filtered);
    const groupLabel = filtered.isFamily ? `Familia ${(familyN += 1)}` : `Registro ${(regN += 1)}`;
    const notes =
      registered > eff ? `Registro: ${registered} → Plan: ${eff}` : filtered.isFamily ? 'Árbol familiar' : '';
    blocks.push({
      kind: filtered.isFamily ? 'family' : 'registration',
      groupLabel,
      titularName: String(leader?.hostName || filtered.hosts?.[0]?.hostName || '—'),
      titularSk,
      sede: groupSedeLabel(scopedLines),
      people: (filtered.lines || []).length,
      registeredCars: registered,
      planCars: eff,
      confirmedCars: countConfirmedCarsInSet(plan, titularSk, eff),
      notes,
      fallbackTitularSks: hostTitularKeysFromGroup(filtered, titularSk),
    });
  }

  return blocks;
}

function buildGenericCarExportBlocks({ plan, carLines, isBautizos, roster, lineInExportScope }) {
  const keyToGroup = buildCarGroupKeyToGroup(plan);
  const familyInfo = isBautizos ? buildBautizosCarFamilyInfo(carLines) : null;
  const blocks = [];
  const usedGroupIds = new Set();
  let manualN = 0;
  let groupN = 0;

  for (const g of plan?.carGroups || []) {
    if ((g.memberKeys || []).length < 2) continue;
    const gid = String(g.id || '').trim();
    if (!gid || usedGroupIds.has(gid)) continue;
    const memberLines = (carLines || []).filter((line) =>
      (g.memberKeys || []).includes(String(line.sourceKey || '').trim())
    );
    const scopedLines = memberLines.filter(lineInExportScope);
    if (!scopedLines.length) continue;
    usedGroupIds.add(gid);

    const titularSk = resolveManualCarGroupTitularSk(plan, g);
    const titularLine =
      memberLines.find((l) => String(l.sourceKey || '').trim() === titularSk) ||
      memberLines.find((l) => l.kind === 'participant') ||
      memberLines[0];
    const effectiveCars = isManualCarPlanGroup(g)
      ? manualGroupEffectiveCars(g, memberLines)
      : (() => {
          const c = parseInt(g.cars, 10);
          if (Number.isFinite(c) && c >= 1) return c;
          return Math.max(1, Math.ceil(memberLines.length / Math.max(1, parseInt(plan.bautizosCarCapacity, 10) || 5)));
        })();
    const registeredCars = isManualCarPlanGroup(g)
      ? Math.max(manualGroupMaxRegisteredCars(memberLines), carsRegisteredFromMemberLines(memberLines))
      : carsRegisteredFromMemberLines(memberLines);
    const groupLabel = isManualCarPlanGroup(g)
      ? `Grupo manual ${(manualN += 1)}`
      : `Grupo ${(groupN += 1)}`;

    blocks.push({
      kind: isManualCarPlanGroup(g) ? 'manual' : 'group',
      groupLabel,
      titularName: String(titularLine?.name || '—'),
      titularSk: titularSk || String(titularLine?.sourceKey || ''),
      sede: groupSedeLabel(scopedLines),
      people: memberLines.length,
      registeredCars,
      planCars: effectiveCars,
      confirmedCars: countConfirmedCarsInSet(plan, titularSk || titularLine?.sourceKey, effectiveCars),
      notes: registeredCars > effectiveCars ? `Registro: ${registeredCars} → Plan: ${effectiveCars}` : '',
      fallbackTitularSks: participantTitularKeysFromLines(memberLines, titularSk || titularLine?.sourceKey),
    });
  }

  for (const line of carLines || []) {
    if (!lineInExportScope(line)) continue;
    const sk = String(line.sourceKey || '').trim();
    const g = keyToGroup.get(sk);
    if (g && (g.memberKeys || []).length > 1) continue;
    const eff = effectiveCarsForCarLine(line, plan, keyToGroup, isBautizos, familyInfo);
    const registered = normalizeArrivalCarCount(line.carrosLlegada);
    blocks.push({
      kind: 'individual',
      groupLabel: 'Vehículo individual',
      titularName: String(line.name || '—'),
      titularSk: sk,
      sede: String(line.location || '').trim() || '—',
      people: 1,
      registeredCars: registered,
      planCars: eff,
      confirmedCars: countConfirmedCarsInSet(plan, sk, eff),
      notes: '',
    });
  }

  return blocks;
}

export function buildTransportExcelCarGroupBlocks({
  plan,
  carLines,
  roster,
  isBautizos,
  lineInExportScope,
}) {
  const scopeFn = typeof lineInExportScope === 'function' ? lineInExportScope : () => true;
  if (isBautizos) return buildBautizosCarExportBlocks({ plan, carLines, roster, lineInExportScope: scopeFn });
  return buildGenericCarExportBlocks({ plan, carLines, isBautizos, roster, lineInExportScope: scopeFn });
}

export function buildTransportExcelCarGroupSections({
  plan,
  carLines,
  roster,
  isBautizos,
  lineInExportScope,
}) {
  const blocks = buildTransportExcelCarGroupBlocks({
    plan,
    carLines,
    roster,
    isBautizos,
    lineInExportScope,
  });
  if (!blocks.length) {
    return { summaryRows: [], vehicleRows: [] };
  }

  const nameBySk = buildNameIndexFromCarLines(carLines);
  const summaryRows = [['Resumen por grupo (carro)'], CAR_GROUP_SUMMARY_HEADERS];
  const vehicleRows = [['Detalle de vehículos por grupo'], CAR_VEHICLE_DETAIL_HEADERS];

  for (const block of blocks) {
    const tipo =
      block.kind === 'manual'
        ? 'Grupo manual'
        : block.kind === 'family'
          ? 'Familia'
          : block.kind === 'registration'
            ? 'Registro'
            : block.kind === 'individual'
              ? 'Individual'
              : 'Grupo';
    summaryRows.push([
      tipo,
      block.groupLabel,
      block.titularName,
      block.sede,
      block.people,
      block.registeredCars,
      block.planCars,
      block.confirmedCars,
      block.notes || '',
    ]);
    pushVehicleRowsForGroup(vehicleRows, {
      groupLabel: block.groupLabel,
      titularName: block.titularName,
      titularSk: block.titularSk,
      effectiveCars: block.planCars,
      exportPlan: plan,
      nameBySk,
      fallbackTitularSks: block.fallbackTitularSks,
    });
  }

  return { summaryRows, vehicleRows, blocks };
}
