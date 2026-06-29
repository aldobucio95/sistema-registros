import {
  BAUTIZOS_ATTENDANCE,
  companionBautizadoToParticipantPayload,
  companionRowIsEffectivelyEmpty,
  getBautizosCompanionsArray,
  getBautizosLineListPrice,
  getBautizosSplitPartyDerivedMembers,
  isBautizosCompanionBaptized,
  isBautizosSplitPartyHostPerson,
} from './bautizosParty.js';
import {
  calculateAgeFromBirthDate,
  getBautizosListPriceBreakdown,
  getBautizosTitularListPrice,
} from './publicRegistrationLogic.js';

const SIN_ESPECIFICAR = 'Sin especificar';
const SI = 'Si';

function isActiveParticipant(p) {
  const s = String(p?.status || 'active');
  return s === 'active' || s === 'waitlist';
}

function isCancelledOrArchived(p) {
  const s = String(p?.status || 'active');
  return s === 'cancelled' || s === 'archived';
}

/** @returns {object} participante ancla del grupo (host de split o el focal). */
function resolvePartyAnchor(focalPerson, roster) {
  const splitHostId = String(focalPerson?.bautizosSplitPartyHostParticipantId || '').trim();
  if (splitHostId) {
    const host = (roster || []).find((p) => String(p?.id || '') === splitHostId);
    if (host) return host;
  }
  return focalPerson;
}

function rosterById(roster) {
  const m = new Map();
  for (const p of roster || []) {
    const id = String(p?.id || '').trim();
    if (id) m.set(id, p);
  }
  return m;
}

/**
 * Reparte `total` en partes enteras proporcionales a `weights` (centavos).
 * @param {number} total
 * @param {number[]} weights
 * @returns {number[]}
 */
export function splitProportionalAmounts(total, weights) {
  const T = Math.max(0, Math.round((Number(total) || 0) * 100));
  const ws = (weights || []).map((w) => Math.max(0, Number(w) || 0));
  const sum = ws.reduce((a, b) => a + b, 0);
  if (T <= 0 || sum <= 0) return ws.map(() => 0);
  const raw = ws.map((w) => (T * w) / sum);
  const floors = raw.map((x) => Math.floor(x));
  let rem = T - floors.reduce((a, b) => a + b, 0);
  const order = raw
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac);
  const out = [...floors];
  for (let k = 0; k < order.length && rem > 0; k += 1) {
    out[order[k].i] += 1;
    rem -= 1;
  }
  return out.map((c) => c / 100);
}

/** Rellena campos obligatorios vacíos con «Sin especificar». */
export function fillBautizosPromotionDefaults(payload, host, loc, _event) {
  const l = String(loc || host?.location || '').trim();
  const p = { ...(payload || {}) };
  const textFields = [
    'name',
    'phone',
    'birthDate',
    'gender',
    'bloodType',
    'emergencyContact',
    'emergencyPhone',
    'emergencyRelationship',
    'allergyCategory',
    'allergyDetails',
    'diseaseDetails',
    'diseaseMedication',
    'disabilityDetails',
    'paymentService',
    'alias',
  ];
  for (const key of textFields) {
    if (!String(p[key] ?? '').trim()) p[key] = SIN_ESPECIFICAR;
  }
  if (!String(p.travelFrom ?? '').trim()) p.travelFrom = l || SIN_ESPECIFICAR;
  if (!String(p.travelTo ?? '').trim()) p.travelTo = l || SIN_ESPECIFICAR;
  if (!String(p.location ?? '').trim()) p.location = l;
  if (!String(p.age ?? '').trim() && String(p.birthDate || '').trim() && p.birthDate !== SIN_ESPECIFICAR) {
    p.age = calculateAgeFromBirthDate(p.birthDate) || '';
  }
  if (!String(p.age ?? '').trim()) p.age = SIN_ESPECIFICAR;
  return p;
}

/** Quita stubs del host y filas `p:` / `c:` que apuntan al host dado de baja. */
export function stripHostFromCompanionsArray(companions, hostId) {
  const hid = String(hostId || '').trim();
  if (!hid) return Array.isArray(companions) ? [...companions] : [];
  return getBautizosCompanionsArray({ bautizosCompanions: companions }).filter((c) => {
    const sk = String(c?.linkedCompanionSourceKey || '').trim();
    const lid = String(c?.linkedRegistrantId || '').trim();
    if (sk === `p:${hid}` || lid === hid) return false;
    if (sk.startsWith(`c:${hid}::`)) return false;
    return true;
  });
}

export function getBautizosPartyCancelTargetMeta(target) {
  const t = target || {};
  const kind = String(t.kind || '').trim();
  const labels = {
    host: 'Titular del grupo',
    derived: 'Bautizado vinculado',
    linked: 'Registro vinculado',
    simple: 'Acompañante simple',
    baptized_array: 'Acompañante bautizado',
  };
  return {
    key: String(t.key || ''),
    kind,
    kindLabel: labels[kind] || 'Integrante',
    name: String(t.name || '').trim() || '(sin nombre)',
    relationship: String(t.relationship || '').trim(),
    docId: String(t.docId || '').trim() || null,
    companionId: String(t.companionId || '').trim() || null,
  };
}

export function bautizosPartyCancelModalApplies(host, roster, event) {
  if (!host || event?.eventType !== 'Bautizos') return false;
  return listBautizosPartyCancelTargets(host, roster, event).length > 0;
}

/**
 * Lista integrantes seleccionables (además del focal, que siempre se da de baja/archiva).
 * @returns {Array<{ key, kind, name, relationship, docId?, companionId?, companionRow? }>}
 */
export function listBautizosPartyCancelTargets(focalHost, roster, event) {
  if (!focalHost || event?.eventType !== 'Bautizos') return [];
  const rosterArr = Array.isArray(roster) ? roster : [];
  const byId = rosterById(rosterArr);
  const focalId = String(focalHost.id || '').trim();
  if (!focalId) return [];

  const anchor = resolvePartyAnchor(focalHost, rosterArr);
  const anchorId = String(anchor?.id || '').trim();
  const targets = [];
  const seen = new Set([focalId]);

  const pushParticipant = (person, kind) => {
    const pid = String(person?.id || '').trim();
    if (!pid || seen.has(pid) || isCancelledOrArchived(person) || !isActiveParticipant(person)) return;
    seen.add(pid);
    targets.push({
      key: `p:${pid}`,
      kind,
      name: person.name,
      relationship: kind === 'host' ? 'Titular' : 'Integrante del grupo',
      docId: pid,
    });
  };

  if (anchorId && anchorId !== focalId) {
    pushParticipant(anchor, 'host');
  }

  if (anchorId && isBautizosSplitPartyHostPerson(anchor, rosterArr)) {
    for (const d of getBautizosSplitPartyDerivedMembers(anchor, rosterArr)) {
      if (String(d?.id) === focalId) continue;
      pushParticipant(d, 'derived');
    }
  }

  for (const c of getBautizosCompanionsArray(anchor)) {
    if (companionRowIsEffectivelyEmpty(c)) continue;
    const sk = String(c?.linkedCompanionSourceKey || '').trim();
    if (sk.startsWith('p:')) {
      const pid = String(c?.linkedRegistrantId || sk.slice(2)).trim();
      if (pid && pid !== focalId) {
        const linked = byId.get(pid);
        if (linked) pushParticipant(linked, 'linked');
      }
      continue;
    }
    const cid = String(c?.id || '').trim();
    if (!cid || seen.has(`c:${cid}`)) continue;
    if (isBautizosCompanionBaptized(c)) {
      seen.add(`c:${cid}`);
      targets.push({
        key: `c:${cid}`,
        kind: 'baptized_array',
        name: c.name,
        relationship: String(c.relationship || '').trim(),
        companionId: cid,
        companionRow: c,
      });
      continue;
    }
    seen.add(`c:${cid}`);
    targets.push({
      key: `c:${cid}`,
      kind: 'simple',
      name: c.name,
      relationship: String(c.relationship || '').trim(),
      companionId: cid,
      companionRow: c,
    });
  }

  return targets;
}

function survivorListPriceWeight(survivor, event) {
  if (survivor.kind === 'existing_doc') {
    return getBautizosTitularListPrice(survivor.person, event);
  }
  if (survivor.kind === 'promote_baptized') {
    const pl = companionBautizadoToParticipantPayload(survivor.host, survivor.companionRow, survivor.loc);
    return getBautizosTitularListPrice(pl, event);
  }
  if (survivor.kind === 'promote_simple') {
    const { food, transport } = getBautizosListPriceBreakdown(event);
    return getBautizosLineListPrice(survivor.companionRow, food, transport, event, { ignoreLinkedCharge: true });
  }
  return 0;
}

/**
 * @param {{ host, roster, event, selectedTargetKeys, action }} opts
 * @returns {{
 *   focalDocId: string,
 *   loc: string,
 *   action: string,
 *   cancelDocIds: string[],
 *   cancelDocs: object[],
 *   promotions: object[],
 *   survivorPatches: object[],
 *   paymentPreview: object[],
 *   hasPromotions: boolean,
 * }}
 */
export function planBautizosPartyCancelArchive({ host, roster, event, selectedTargetKeys, action }) {
  const rosterArr = Array.isArray(roster) ? roster : [];
  const byId = rosterById(rosterArr);
  const focal = host;
  const focalId = String(focal?.id || '').trim();
  const loc = String(focal?.location || '').trim();
  const anchor = resolvePartyAnchor(focal, rosterArr);
  const anchorId = String(anchor?.id || '').trim();
  const selected = new Set((selectedTargetKeys || []).map((k) => String(k).trim()).filter(Boolean));
  const targets = listBautizosPartyCancelTargets(focal, rosterArr, event);
  const targetByKey = new Map(targets.map((t) => [t.key, t]));

  const cancelDocIds = new Set([focalId]);
  for (const key of selected) {
    const t = targetByKey.get(key);
    if (!t) continue;
    if (t.docId) cancelDocIds.add(String(t.docId));
    if (t.kind === 'simple' || t.kind === 'baptized_array') {
      // array-only: no doc to cancel
    }
  }

  const survivors = [];
  for (const t of targets) {
    if (selected.has(t.key)) continue;
    if (t.docId) {
      const person = byId.get(t.docId);
      if (person && isActiveParticipant(person)) {
        survivors.push({ kind: 'existing_doc', person, target: t });
      }
      continue;
    }
    if (t.kind === 'simple') {
      survivors.push({ kind: 'promote_simple', companionRow: t.companionRow, target: t });
    } else if (t.kind === 'baptized_array') {
      survivors.push({ kind: 'promote_baptized', companionRow: t.companionRow, target: t });
    }
  }

  const cancelDocs = [...cancelDocIds]
    .map((id) => byId.get(id) || (id === focalId ? focal : null))
    .filter(Boolean);

  const paymentPool = cancelDocs.reduce((sum, p) => sum + Math.max(0, parseFloat(p?.paid || 0) || 0), 0);

  const weights = survivors.map((s) => {
    const w = survivorListPriceWeight({ ...s, host: anchor, loc }, event);
    return w > 0 ? w : 1;
  });
  const paidShares = splitProportionalAmounts(paymentPool, weights);
  const listShares = splitProportionalAmounts(
    cancelDocs.reduce((sum, p) => sum + Math.max(0, parseFloat(p?.registeredCost || 0) || 0), 0) ||
      weights.reduce((a, b) => a + b, 0),
    weights
  );

  const promotions = [];
  const survivorPatches = [];
  const paymentPreview = [];

  survivors.forEach((s, idx) => {
    const paid = paidShares[idx] || 0;
    const registeredCost =
      s.kind === 'existing_doc'
        ? getBautizosTitularListPrice(s.person, event)
        : listShares[idx] || survivorListPriceWeight({ ...s, host: anchor, loc }, event);
    const meta = getBautizosPartyCancelTargetMeta(s.target);

    paymentPreview.push({
      key: meta.key,
      name: meta.name,
      kindLabel: meta.kindLabel,
      listWeight: weights[idx],
      paidShare: paid,
      registeredCost,
      willPromote: s.kind !== 'existing_doc',
    });

    if (s.kind === 'existing_doc') {
      const person = s.person;
      const patch = {
        bautizosSplitPartyHostParticipantId: null,
        paid,
        paidNet: paid,
        registeredCost,
        registeredCostManual: false,
        bautizosCompanions: stripHostFromCompanionsArray(person.bautizosCompanions, focalId),
      };
      if (anchorId && cancelDocIds.has(anchorId) && anchorId !== String(person.id)) {
        patch.bautizosCompanions = stripHostFromCompanionsArray(patch.bautizosCompanions, anchorId);
      }
      survivorPatches.push({ docId: String(person.id), patch, previousData: person });
      return;
    }

    if (s.kind === 'promote_simple') {
      const row = s.companionRow || {};
      let payload = {
        name: String(row.name || '').trim() || SIN_ESPECIFICAR,
        phone: String(row.phone || '').trim(),
        birthDate: String(row.birthDate || '').trim(),
        gender: row.gender ?? '',
        bloodType: String(row.bloodType ?? '').trim(),
        emergencyContact: String(row.emergencyContact || '').trim(),
        emergencyPhone: String(row.emergencyPhone || '').trim(),
        emergencyRelationship: String(row.emergencyRelationship || '').trim(),
        hasAllergy: row.hasAllergy,
        allergyCategory: String(row.allergyCategory || '').trim(),
        allergyDetails: String(row.allergyDetails || '').trim(),
        hasDisease: row.hasDisease,
        diseaseDetails: String(row.diseaseDetails || '').trim(),
        diseaseMedication: String(row.diseaseMedication || '').trim(),
        hasDisability: row.hasDisability,
        disabilityDetails: String(row.disabilityDetails || '').trim(),
        wantsBautizosFood: anchor?.wantsBautizosFood,
        wantsBautizosTransport: row.wantsBautizosTransport,
        llegaEnCarro: !!row.llegaEnCarro,
        regresaEnCarro: !!row.regresaEnCarro,
        carrosLlegada: row.carrosLlegada,
        travelFrom: String(row.travelFrom || anchor?.travelFrom || loc).trim(),
        travelTo: String(row.travelTo || anchor?.travelTo || loc).trim(),
        location: loc,
        bautizosAttendanceType: BAUTIZOS_ATTENDANCE.asistente,
        willBeBaptized: 'No',
        bautizosCompanions: [],
        vnpPersonId: String(row.vnpPersonId || '').trim(),
        paid,
        paidNet: paid,
        registeredCost,
        registeredCostManual: false,
        paymentMethod: anchor?.paymentMethod || 'Efectivo',
        paymentService: anchor?.paymentService || '',
        isScholarship: 'No',
        scholarshipType: 'total',
        scholarshipPartialAmount: '',
        customData: anchor?.customData && typeof anchor.customData === 'object' ? { ...anchor.customData } : {},
      };
      payload = fillBautizosPromotionDefaults(payload, anchor, loc, event);
      payload.bautizosAttendanceType = BAUTIZOS_ATTENDANCE.asistente;
      payload.willBeBaptized = 'No';
      promotions.push({
        kind: 'promote_simple',
        sourceKey: s.target.key,
        payload,
        paid,
        registeredCost,
      });
      return;
    }

    if (s.kind === 'promote_baptized') {
      let payload = companionBautizadoToParticipantPayload(anchor, s.companionRow, loc);
      payload.paid = paid;
      payload.paidNet = paid;
      payload.registeredCost = registeredCost;
      payload.registeredCostManual = false;
      payload.paymentMethod = anchor?.paymentMethod || 'Efectivo';
      payload.paymentService = anchor?.paymentService || '';
      payload = fillBautizosPromotionDefaults(payload, anchor, loc, event);
      payload.bautizosAttendanceType = BAUTIZOS_ATTENDANCE.bautizado;
      payload.willBeBaptized = SI;
      promotions.push({
        kind: 'promote_baptized',
        sourceKey: s.target.key,
        payload,
        paid,
        registeredCost,
      });
    }
  });

  // Parchear supervivientes existentes que no están en la lista pero tienen stubs del focal
  for (const p of rosterArr) {
    const pid = String(p?.id || '').trim();
    if (!pid || cancelDocIds.has(pid) || !isActiveParticipant(p)) continue;
    if (survivorPatches.some((sp) => sp.docId === pid)) continue;
    const comps = getBautizosCompanionsArray(p);
    const stripped = stripHostFromCompanionsArray(comps, focalId);
    const stripped2 = anchorId ? stripHostFromCompanionsArray(stripped, anchorId) : stripped;
    const splitHost = String(p?.bautizosSplitPartyHostParticipantId || '').trim();
    const needsSplitClear = splitHost && cancelDocIds.has(splitHost);
    if (stripped2.length !== comps.length || needsSplitClear) {
      const patch = { bautizosCompanions: stripped2 };
      if (needsSplitClear) patch.bautizosSplitPartyHostParticipantId = null;
      survivorPatches.push({ docId: pid, patch, previousData: p });
    }
  }

  return {
    focalDocId: focalId,
    loc,
    action: action || 'cancel_entry',
    cancelDocIds: [...cancelDocIds],
    cancelDocs,
    promotions,
    survivorPatches,
    paymentPreview,
    hasPromotions: promotions.length > 0 || survivorPatches.some((sp) => sp.patch?.bautizosSplitPartyHostParticipantId === null),
    anchorId,
    partyAnchor: anchor,
  };
}
