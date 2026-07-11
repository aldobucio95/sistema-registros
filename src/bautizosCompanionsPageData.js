import {
  BAUTIZOS_ATTENDANCE,
  bautizosCompanionIsAlsoBautizadoRegistrant,
  buildActiveRegistrantMetaForCompanionDedupe,
  buildBautizosCanonicalCompanionPlan,
  buildBautizosSourceLinkMap,
  getBautizosCompanionCanonicalKey,
  getBautizosCompanionsArray,
  isBautizosCompanionBaptized,
  parseLinkSourceKey,
  resolveBautizosUltimateSourceKey,
} from './bautizosParty.js';

function normalizePersonNameKeyLocal(raw) {
  return String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function normalizeBautizosAttendanceTypeLocal(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (s.includes('bautiz')) return BAUTIZOS_ATTENDANCE.bautizado;
  if (s.includes('acompa')) return BAUTIZOS_ATTENDANCE.acompanante;
  return s;
}

function isBautizadoActivoInEventLocal(p) {
  return normalizeBautizosAttendanceTypeLocal(p?.bautizosAttendanceType) === BAUTIZOS_ATTENDANCE.bautizado;
}

function companionRowBelongsToFamilyTree(row, familyTrees, sourceLinkMap) {
  const pk = String(row?.personKey || '').trim();
  if (!pk || !familyTrees?.length) return false;
  if (pk.startsWith('p:')) {
    const pid = pk.slice(2);
    return familyTrees.some((g) => g.participantIds.includes(pid));
  }
  let nlcKey = pk;
  if (pk.startsWith('c:')) {
    const ultimate = resolveBautizosUltimateSourceKey(pk, sourceLinkMap);
    const parsed = parseLinkSourceKey(ultimate) || parseLinkSourceKey(pk);
    if (parsed?.kind === 'companion') {
      nlcKey = `nlc:${parsed.hostId}:${parsed.companionId}`;
    }
  }
  if (!nlcKey.startsWith('nlc:')) return false;
  return familyTrees.some((g) => g.canonExtras.includes(nlcKey));
}

class DSU {
  constructor() {
    this.p = new Map();
  }
  id(x) {
    if (!this.p.has(x)) this.p.set(x, x);
    return x;
  }
  find(x) {
    this.id(x);
    if (this.p.get(x) !== x) this.p.set(x, this.find(this.p.get(x)));
    return this.p.get(x);
  }
  union(a, b) {
    this.id(a);
    this.id(b);
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.p.set(ra, rb);
  }
}

function rkRel(s) {
  return String(s || '').trim().toLowerCase();
}

function isSpouseRel(k) {
  return k.includes('espos') || k === 'marido' || k === 'mujer' || k.includes('conyug');
}

function isChildRel(k) {
  return k === 'hijo' || k === 'hija' || k.startsWith('hijo') || k.startsWith('hija');
}

function isParentRel(k) {
  return (
    k === 'padre' || k === 'madre' || k === 'papa' || k === 'mama' ||
    k.startsWith('padre') || k.startsWith('madre') || k.startsWith('papa') || k.startsWith('mama')
  );
}

function isGrandchildRel(k) {
  return k === 'nieto' || k === 'nieta' || (k.includes('niet') && !k.includes('bis'));
}

function relDisplayPriority(label) {
  const k = rkRel(label);
  if (!k || k === '—') return 99;
  if (isSpouseRel(k)) return 1;
  if (isChildRel(k) || isParentRel(k)) return 2;
  if (isGrandchildRel(k)) return 3;
  return 4;
}

export function computeBautizosCompanionsPageModel({
  roster = [],
}) {
  const participantById = new Map();
  for (const p of roster || []) participantById.set(String(p.id), p);

  const bautizadoIdSet = new Set();
  const bautizadoNameSet = new Set();
  const vnpToBautizadoId = new Map();
  for (const p of roster) {
    if (!isBautizadoActivoInEventLocal(p)) continue;
    const id = String(p.id);
    bautizadoIdSet.add(id);
    bautizadoNameSet.add(normalizePersonNameKeyLocal(p.name));
    const v = String(p.vnpPersonId || '').trim();
    if (v) vnpToBautizadoId.set(v, id);
  }

  const sourceLinkMap = buildBautizosSourceLinkMap(roster);
  const raw = [];
  for (const p of roster) {
    const comps = getBautizosCompanionsArray(p);
    for (let i = 0; i < comps.length; i++) {
      const c = comps[i] || {};
      const companionName = String(c.name || '').trim();
      if (!companionName) continue;
      if (isBautizosCompanionBaptized(c)) continue;
      if (bautizosCompanionIsAlsoBautizadoRegistrant(c, bautizadoIdSet, bautizadoNameSet, vnpToBautizadoId)) continue;
      const isLinked = !!c?.linkedNoExtraCharge || !!String(c?.linkedCompanionSourceKey || '').trim();
      const personKey = getBautizosCompanionCanonicalKey(p.id, c, i, sourceLinkMap);
      raw.push({
        id: `${p.id}-${String(c.id || '').trim() || i}`,
        registradoName: p.name || '',
        registradoId: p.id,
        location: p.location || '',
        companionName,
        relationship: String(c?.relationship || '').trim(),
        isLinked,
        personKey,
      });
    }
  }

  raw.sort((a, b) => {
    const la = String(a.location || '');
    const lb = String(b.location || '');
    if (la !== lb) return la.localeCompare(lb);
    const na = String(a.registradoName || '').localeCompare(String(b.registradoName || ''));
    if (na !== 0) return na;
    return String(a.companionName || '').localeCompare(String(b.companionName || ''));
  });

  const byPersonKey = new Map();
  for (const r of raw) {
    let agg = byPersonKey.get(r.personKey);
    if (!agg) {
      agg = {
        personKey: r.personKey,
        companionName: r.companionName,
        isLinked: r.isLinked,
        byRegistrant: new Map(),
      };
      byPersonKey.set(r.personKey, agg);
    } else {
      agg.isLinked = agg.isLinked || r.isLinked;
    }
    const rid = String(r.registradoId);
    if (!agg.byRegistrant.has(rid)) {
      agg.byRegistrant.set(rid, {
        name: String(r.registradoName || '').trim() || '—',
        relationship: String(r.relationship || '').trim(),
        location: String(r.location || '').trim(),
      });
    }
  }

  const registradosConAcompananteVisible = new Set(raw.map((r) => String(r.registradoId))).size;
  const listRows = [];
  for (const agg of byPersonKey.values()) {
    const sortedRegs = [...agg.byRegistrant.entries()].sort((a, b) =>
      a[1].name.localeCompare(b[1].name, 'es')
    );
    const names = sortedRegs.map(([, v]) => v.name);
    const rels = sortedRegs.map(([, v]) => v.relationship);
    const locs = sortedRegs.map(([, v]) => v.location).filter(Boolean);
    const distinctRel = [...new Set(rels.filter(Boolean))];
    const relationshipOut =
      distinctRel.length === 0 ? '' : distinctRel.length === 1 ? distinctRel[0] : rels.map((x) => (x ? x : '—')).join(' · ');
    const distinctLoc = [...new Set(locs)];
    const locationOut =
      distinctLoc.length === 0 ? '' : distinctLoc.length === 1 ? distinctLoc[0] : [...distinctLoc].sort((a, b) => a.localeCompare(b, 'es')).join(' · ');
    listRows.push({
      id: String(agg.personKey).replace(/:/g, '_'),
      personKey: agg.personKey,
      companionName: agg.companionName,
      isLinked: agg.isLinked,
      registradoName: names.join(', '),
      relationship: relationshipOut,
      location: locationOut,
    });
  }

  listRows.sort((a, b) => {
    const c = String(a.companionName || '').localeCompare(String(b.companionName || ''), 'es');
    if (c !== 0) return c;
    return String(a.registradoName || '').localeCompare(String(b.registradoName || ''), 'es');
  });

  const nlcM = new Map();
  const nlcRel = new Map();
  const nlcRelByRegistrant = new Map();
  const nlcLinkers = new Map();
  const d = new DSU();
  const allKeys = new Set();
  const inRoster = new Set(roster.map((p) => String(p.id)));
  for (const p of roster) {
    d.id(`pt:${p.id}`);
    allKeys.add(`pt:${p.id}`);
  }

  const upsertCompanion = (canonKey, name, rel, hostId, linkerId) => {
    allKeys.add(canonKey);
    if (!nlcM.has(canonKey)) {
      nlcM.set(canonKey, name);
      nlcRel.set(canonKey, rel || '');
    } else {
      if (name && nlcM.get(canonKey) === '—') nlcM.set(canonKey, name);
      if (rel) {
        const prev = String(nlcRel.get(canonKey) || '').trim();
        const next = String(rel || '').trim();
        if (!prev || (next && relDisplayPriority(next) < relDisplayPriority(prev))) {
          nlcRel.set(canonKey, next);
        }
      }
    }
    if (!nlcRelByRegistrant.has(canonKey)) nlcRelByRegistrant.set(canonKey, new Map());
    const relMap = nlcRelByRegistrant.get(canonKey);
    const normalizedRel = String(rel || '').trim();
    const upsertRegistrantRel = (rid) => {
      const id = String(rid || '').trim();
      if (!id) return;
      const prev = String(relMap.get(id) || '').trim();
      if (!prev || (normalizedRel && relDisplayPriority(normalizedRel) < relDisplayPriority(prev))) {
        relMap.set(id, normalizedRel);
      }
    };
    if (linkerId) upsertRegistrantRel(linkerId);
    if (hostId) upsertRegistrantRel(hostId);
    if (linkerId) {
      if (!nlcLinkers.has(canonKey)) nlcLinkers.set(canonKey, []);
      if (!nlcLinkers.get(canonKey).includes(String(linkerId))) {
        nlcLinkers.get(canonKey).push(String(linkerId));
      }
      d.union(canonKey, `pt:${linkerId}`);
    }
    if (hostId && inRoster.has(hostId)) {
      allKeys.add(`pt:${hostId}`);
      d.union(canonKey, `pt:${hostId}`);
    }
  };

  for (const p of roster) {
    const comps = getBautizosCompanionsArray(p);
    comps.forEach((c, i) => {
      const nm = String(c.name || '').trim();
      if (!nm) return;
      const skRaw = String(c?.linkedCompanionSourceKey || '').trim();
      const relStr = String(
        c.relationship || c.linkedCompanionRelationship || c.linkedCompanionNameRelation || ''
      ).trim();
      const dispName = String(c.linkedCompanionName || c.name || '').trim() || '—';
      if (skRaw.startsWith('p:')) {
        const oid = String(skRaw.slice(2)).trim();
        if (oid) {
          allKeys.add(`pt:${p.id}`);
          allKeys.add(`pt:${oid}`);
          d.union(`pt:${p.id}`, `pt:${oid}`);
        }
        return;
      }
      if (skRaw.startsWith('c:')) {
        const ultimate = resolveBautizosUltimateSourceKey(skRaw, sourceLinkMap);
        const parsed = parseLinkSourceKey(ultimate) || parseLinkSourceKey(skRaw);
        if (parsed?.kind === 'companion') {
          const canonKey = `nlc:${parsed.hostId}:${parsed.companionId}`;
          upsertCompanion(canonKey, dispName, relStr, parsed.hostId, String(p.id));
        }
        return;
      }
      const cid = String(c.id || '').trim() || `i${i}`;
      const canonKey = `nlc:${p.id}:${cid}`;
      upsertCompanion(canonKey, nm, relStr, String(p.id), null);
      d.union(`pt:${p.id}`, canonKey);
    });
  }

  for (const k of allKeys) d.find(k);
  const byRoot = new Map();
  for (const k of allKeys) {
    const r = d.find(k);
    if (!byRoot.has(r)) byRoot.set(r, []);
    byRoot.get(r).push(k);
  }

  const mergedCanon = new Map();
  for (const [, keys] of byRoot) {
    const seenByName = new Map();
    for (const k of keys) {
      if (!k.startsWith('nlc:')) continue;
      const nn = normalizePersonNameKeyLocal(nlcM.get(k) || '');
      if (!nn) continue;
      if (!seenByName.has(nn)) {
        seenByName.set(nn, k);
        mergedCanon.set(k, k);
      } else {
        mergedCanon.set(k, seenByName.get(nn));
        const survivor = seenByName.get(nn);
        if (!nlcRel.get(survivor) && nlcRel.get(k)) nlcRel.set(survivor, nlcRel.get(k));
        if (nlcM.get(survivor) === '—' && nlcM.get(k) && nlcM.get(k) !== '—') {
          nlcM.set(survivor, nlcM.get(k));
        }
        const arrA = nlcLinkers.get(survivor) || [];
        const arrB = nlcLinkers.get(k) || [];
        for (const lid of arrB) if (!arrA.includes(lid)) arrA.push(lid);
        nlcLinkers.set(survivor, arrA);
      }
    }
  }

  const familyTrees = [];
  for (const [r, keys] of byRoot) {
    const participants = new Set();
    const canonExtras = new Set();
    for (const k of keys) {
      if (k.startsWith('pt:')) participants.add(k.slice(3));
      if (k.startsWith('nlc:')) canonExtras.add(mergedCanon.get(k) || k);
    }
    const nPeople = participants.size + canonExtras.size;
    if (nPeople < 3) continue;
    familyTrees.push({
      root: r,
      keys,
      participantIds: [...participants].sort((a, b) => a.localeCompare(b, 'en')),
      canonExtras: [...canonExtras],
      nlcName: nlcM,
      nlcRel,
      nlcRelByRegistrant,
      nlcLinkers,
      nPeople,
    });
  }
  familyTrees.sort((a, b) => (a.participantIds[0] || '').localeCompare(b.participantIds[0] || ''));

  const companionMatchCount = buildBautizosCanonicalCompanionPlan(
    roster,
    buildActiveRegistrantMetaForCompanionDedupe(roster),
    { includeBaptizedCompanions: false }
  ).size;

  const soloListRows = listRows.filter((row) => !companionRowBelongsToFamilyTree(row, familyTrees, sourceLinkMap));

  return {
    participantById,
    sourceLinkMap,
    listRows,
    soloListRows,
    familyTrees,
    companionMatchCount,
    registradosConAcompananteVisible,
  };
}
