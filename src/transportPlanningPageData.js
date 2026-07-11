import {
  buildBusGroupSections,
  buildManualCarGroupViews,
  effectiveCarsForCarLine,
  filterBautizosDisplayGroupExcludingManual,
  parseBusGroupKey,
  passengersForBusGroup,
  sortTransportLinesByRosterOrder,
  totalCarsCount,
} from './transportPlanningCore.js';

export function transportRosterSignature(roster) {
  return (roster || []).map((p) => String(p?.id || '').trim()).join('|');
}

export function buildTransportPassengersForSection({
  busLines = [],
  section,
  isCampa = false,
  splitCampaBySubevent = false,
  resolveCampaAmbosTransit,
}) {
  const passengersBase = passengersForBusGroup(busLines, section);
  return passengersBase
    .filter((row) => {
      if (!(isCampa && splitCampaBySubevent)) return true;
      if (String(row?.campaSegment || '') !== 'Ambos') return true;
      const t = resolveCampaAmbosTransit(row.sourceKey);
      if (section?.subevent === 'Teens') return t.teenArrive || t.teenReturn;
      if (section?.subevent === 'Jóvenes') return t.jovenArrive || t.jovenReturn;
      return true;
    })
    .map((row) => {
      if (!(isCampa && splitCampaBySubevent)) return { ...row, transportSourceKey: row.sourceKey };
      if (String(row?.campaSegment || '') !== 'Ambos') return { ...row, transportSourceKey: row.sourceKey };
      const sub = String(section?.subevent || '').trim();
      return { ...row, transportSourceKey: `${row.sourceKey}|${sub || 'Ambos'}` };
    });
}

export function buildTransportBusPassengersByGroupKey({
  busSectionsEffective = [],
  busLines = [],
  isCampa = false,
  splitCampaBySubevent = false,
  resolveCampaAmbosTransit,
  roster = [],
}) {
  const out = {};
  for (const section of busSectionsEffective) {
    const rows = buildTransportPassengersForSection({
      busLines,
      section,
      isCampa,
      splitCampaBySubevent,
      resolveCampaAmbosTransit,
    });
    out[section.groupKey] = sortTransportLinesByRosterOrder(rows, roster);
  }
  return out;
}

export function computeTransportPlanningPageModel({
  locations = [],
  busLines = [],
  carLines = [],
  bautizosCarDisplayGroups = [],
  roster = [],
  plan,
  isBautizos = false,
  isCampa = false,
  splitCampaBySubevent = false,
  resolveCampaAmbosTransit,
}) {
  const busSectionsBase = buildBusGroupSections(busLines, locations, isCampa, splitCampaBySubevent);
  const busSectionsEffective = [...busSectionsBase];
  const keys = new Set(busSectionsEffective.map((section) => section.groupKey));
  for (const k of Object.keys(plan?.unitsByLocation || {})) {
    if (keys.has(k)) continue;
    keys.add(k);
    const { sedeBase, subevent } = parseBusGroupKey(k);
    busSectionsEffective.push({
      groupKey: k,
      sedeBase,
      subevent,
      title: subevent ? `${sedeBase} · ${subevent}` : k,
      orphan: true,
    });
  }

  const busPassengersByGroupKey = buildTransportBusPassengersByGroupKey({
    busSectionsEffective,
    busLines,
    isCampa,
    splitCampaBySubevent,
    resolveCampaAmbosTransit,
    roster,
  });

  const manualCarGroupViews = buildManualCarGroupViews(plan, carLines);
  const manualGroupedKeys = new Set();
  for (const view of manualCarGroupViews) {
    for (const k of view.memberKeys || []) manualGroupedKeys.add(String(k).trim());
  }

  const carLinesEligibleForManualGroupAdd = carLines.filter((line) => {
    const sk = String(line?.sourceKey || '').trim();
    return sk && !manualGroupedKeys.has(sk);
  });

  const manualGroupAddMemberOptions = carLinesEligibleForManualGroupAdd.map((line) => {
    const roleLabel = line.kind === 'companion' ? 'Acompañante' : 'Titular';
    const cars = Number(line.carrosLlegada) || 1;
    return {
      value: String(line.sourceKey || '').trim(),
      label: `${line.name || '—'} · ${line.location || '—'} · ${cars} carro${cars !== 1 ? 's' : ''} · ${roleLabel}`,
    };
  });

  const bautizosCarCardGroups =
    isBautizos && manualGroupedKeys.size > 0
      ? bautizosCarDisplayGroups
          .map((grp) => filterBautizosDisplayGroupExcludingManual(grp, manualGroupedKeys))
          .filter(Boolean)
      : bautizosCarDisplayGroups;

  const carsTotal = totalCarsCount(carLines, plan, isBautizos, roster);

  return {
    busSectionsEffective,
    busPassengersByGroupKey,
    manualCarGroupViews,
    manualGroupedKeys,
    carLinesEligibleForManualGroupAdd,
    manualGroupAddMemberOptions,
    bautizosCarCardGroups,
    carsTotal,
  };
}

/** Ítems virtualizables para la tabla fila a fila (eventos no Bautizos). */
export function buildCampaTransportRowByRowItems({
  carLines = [],
  plan,
  keyToGroup,
  bautizosFamilyInfo = null,
  isBautizos = false,
}) {
  if (isBautizos) return [];
  const items = [];
  for (const line of carLines) {
    const sk = String(line?.sourceKey || '').trim();
    if (!sk) continue;
    const g = keyToGroup?.get?.(sk);
    const eff = effectiveCarsForCarLine(line, plan, keyToGroup, isBautizos, bautizosFamilyInfo);
    const isGroup = !!(g && g.memberKeys && g.memberKeys.length > 1);
    items.push({
      key: `campa:${sk}`,
      kind: 'data-row',
      detailKey: `car:${sk}`,
      sourceKey: sk,
      line,
      group: g,
      effectiveCars: eff,
      carCount: eff,
      isGroup,
      isTitularForVehicles: !isGroup || line.kind === 'participant',
    });
  }
  return items;
}
