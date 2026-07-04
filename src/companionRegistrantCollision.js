import { getBautizosCompanionsArray } from './bautizosParty.js';
import { normalizeBirthDateToIso } from './birthDateIsoUtils.js';
import {
  nameFuzzyRatio,
  nameTokensSubsetMatch,
  normalizePersonNameForMatch,
  sharedNameTokens,
  tokenizePersonName,
} from './personNameMatch.js';

export const COLLISION_CONFIDENCE = Object.freeze({
  CERTAIN: 'certain',
  PROBABLE: 'probable',
  POSSIBLE: 'possible',
});

const REASON_LABELS = {
  link_existing: 'Vínculo cruzado detectado',
  vnp: 'Mismo ID VNPM',
  name_exact: 'Nombre completo idéntico',
  name_tokens: 'Tokens de nombre coincidentes',
  name_fuzzy: 'Nombre muy similar',
  birthDate: 'Misma fecha de nacimiento',
};

export function buildCompanionCollisionAckKey(hostId, companionId, registrantId) {
  const h = String(hostId || '').trim();
  const c = String(companionId || '').trim();
  const r = String(registrantId || '').trim();
  if (!h || !c || !r) return '';
  return `dup:companion:${h}:${c}:${r}`;
}

function companionDisplayName(c) {
  return String(c?.name || c?.linkedCompanionName || '').trim();
}

function isActiveOrWaitlistParticipant(p) {
  const status = p?.status || 'active';
  if (status === 'cancelled' || status === 'archived') return false;
  return status === 'active' || status === 'waitlist';
}

function clusterFullyAcknowledged(cluster, participantsById) {
  const ackKey = cluster?.ackKey;
  if (!ackKey) return false;
  const host = participantsById.get(String(cluster.companionSide?.hostId || ''));
  const reg = participantsById.get(String(cluster.registrantSide?.participantId || ''));
  const hostAck = Array.isArray(host?.duplicateAlertAcknowledgedKeys)
    ? host.duplicateAlertAcknowledgedKeys.includes(ackKey)
    : false;
  const regAck = Array.isArray(reg?.duplicateAlertAcknowledgedKeys)
    ? reg.duplicateAlertAcknowledgedKeys.includes(ackKey)
    : false;
  return hostAck && regAck;
}

function isAlreadyLinked(c, registrantId) {
  const sk = String(c?.linkedCompanionSourceKey || '').trim();
  const rid = String(registrantId || '').trim();
  if (!sk || !rid) return false;
  if (sk === `p:${rid}`) return true;
  const linkedReg = String(c?.linkedRegistrantId || '').trim();
  return linkedReg === rid;
}

/**
 * Evalúa match entre fila acompañante y registro activo.
 * @returns {{ confidence: string|null, reasons: string[], score: number }}
 */
export function evaluateCompanionRegistrantMatch(companion, registrant, options = {}) {
  const canonicalizeVnp = options.canonicalizeVnpPersonId || ((v) => String(v || '').trim());
  const reasons = [];
  let score = 0;

  const cName = companionDisplayName(companion);
  const rName = String(registrant?.name || '').trim();
  if (!cName || !rName) return { confidence: null, reasons: [], score: 0 };

  const cBirth = normalizeBirthDateToIso(companion?.birthDate) || '';
  const rBirth = normalizeBirthDateToIso(registrant?.birthDate) || '';
  const sameBirth = !!(cBirth && rBirth && cBirth === rBirth);

  const cVnp = canonicalizeVnp(companion?.vnpPersonId || companion?.linkedVnpId || '');
  const rVnp = canonicalizeVnp(registrant?.vnpPersonId || '');
  if (cVnp && rVnp && cVnp === rVnp) {
    reasons.push('vnp');
    score += 100;
    if (sameBirth) reasons.push('birthDate');
    return { confidence: COLLISION_CONFIDENCE.CERTAIN, reasons, score };
  }

  const sk = String(companion?.linkedCompanionSourceKey || '').trim();
  const rid = String(registrant?.id || '').trim();
  if (sk === `p:${rid}` || String(companion?.linkedRegistrantId || '').trim() === rid) {
    reasons.push('link_existing');
    score += 100;
    return { confidence: COLLISION_CONFIDENCE.CERTAIN, reasons, score };
  }

  const nc = normalizePersonNameForMatch(cName);
  const nr = normalizePersonNameForMatch(rName);
  if (nc && nr && nc === nr) {
    reasons.push('name_exact');
    score += 50;
    if (sameBirth) {
      reasons.push('birthDate');
      score += 30;
    }
    return { confidence: COLLISION_CONFIDENCE.CERTAIN, reasons, score };
  }

  if (sameBirth) {
    reasons.push('birthDate');
    score += 20;
  }

  if (nameTokensSubsetMatch(cName, rName)) {
    reasons.push('name_tokens');
    score += 40;
    if (sameBirth || tokenizePersonName(cName).length >= 2) {
      return { confidence: COLLISION_CONFIDENCE.PROBABLE, reasons, score };
    }
  }

  const fuzzy = nameFuzzyRatio(cName, rName);
  const shared = sharedNameTokens(cName, rName);
  if (shared.length >= 2 && fuzzy >= 0.88) {
    reasons.push('name_fuzzy');
    score += 25;
    if (sameBirth && fuzzy >= 0.75) {
      return { confidence: COLLISION_CONFIDENCE.PROBABLE, reasons, score };
    }
    return { confidence: COLLISION_CONFIDENCE.POSSIBLE, reasons, score };
  }

  if (sameBirth && fuzzy >= 0.75 && shared.length >= 1) {
    reasons.push('name_fuzzy');
    return { confidence: COLLISION_CONFIDENCE.POSSIBLE, reasons, score: score + 15 };
  }

  if (fuzzy >= 0.92 && shared.length >= 2) {
    reasons.push('name_fuzzy');
    return { confidence: COLLISION_CONFIDENCE.POSSIBLE, reasons, score: score + 20 };
  }

  return { confidence: null, reasons: [], score: 0 };
}

export function describeCollisionReasons(reasons) {
  const list = Array.isArray(reasons) ? reasons : [];
  if (!list.length) return '';
  return list.map((r) => REASON_LABELS[r] || r).join(' · ');
}

export function describeCollisionCluster(cluster) {
  const cs = cluster?.companionSide || {};
  const rs = cluster?.registrantSide || {};
  const tokens = sharedNameTokens(cs.displayName, rs.name);
  const tokenNote = tokens.length ? ` (${tokens.join(', ')})` : '';
  return `Acompañante «${cs.displayName || '—'}» en registro de ${cs.hostName || '—'} (${cs.location || '?'}) ↔ activo «${rs.name || '—'}» (${rs.location || '?'})${tokenNote}`;
}

/**
 * Índice de colisiones acompañante ↔ registro activo (Bautizos).
 */
export function buildCompanionRegistrantCollisionIndex(participants, eventId, options = {}) {
  const eid = String(eventId || '').trim();
  const minConfidence = options.minConfidence || COLLISION_CONFIDENCE.POSSIBLE;
  const canonicalizeVnp = options.canonicalizeVnpPersonId || ((v) => String(v || '').trim());
  const confidenceRank = { certain: 3, probable: 2, possible: 1 };
  const minRank = confidenceRank[minConfidence] || 1;

  if (!eid) {
    return { clusters: [], byRegistrantId: new Map(), byHostId: new Map(), total: 0 };
  }

  const pool = (Array.isArray(participants) ? participants : []).filter(
    (p) => String(p?.eventId || '') === eid && isActiveOrWaitlistParticipant(p)
  );
  const participantsById = new Map(pool.map((p) => [String(p.id), p]));
  const registrants = pool.filter((p) => (p?.status || 'active') === 'active');

  const clusters = [];
  const seenPair = new Set();

  for (const host of pool) {
    const hostId = String(host?.id || '').trim();
    if (!hostId) continue;
    const companions = getBautizosCompanionsArray(host);
    for (const c of companions) {
      const cName = companionDisplayName(c);
      if (!cName) continue;
      const companionId = String(c?.id || '').trim() || `${hostId}:${cName}`;
      const sourceKey = companionId.startsWith('bc-') ? `c:${hostId}::${companionId}` : `c:${hostId}::${companionId}`;

      for (const reg of registrants) {
        const regId = String(reg?.id || '').trim();
        if (!regId || regId === hostId) continue;
        if (isAlreadyLinked(c, regId)) continue;

        const pairKey = `${hostId}|${companionId}|${regId}`;
        if (seenPair.has(pairKey)) continue;

        const match = evaluateCompanionRegistrantMatch(c, reg, { canonicalizeVnpPersonId: canonicalizeVnp });
        if (!match.confidence) continue;
        if ((confidenceRank[match.confidence] || 0) < minRank) continue;

        const cluster = {
          kind: 'companion_registrant',
          confidence: match.confidence,
          reasons: match.reasons,
          score: match.score,
          companionSide: {
            hostId,
            hostName: String(host.name || '').trim(),
            location: String(host.location || '').trim(),
            companionRow: c,
            companionId,
            sourceKey,
            displayName: cName,
          },
          registrantSide: {
            participantId: regId,
            name: String(reg.name || '').trim(),
            location: String(reg.location || '').trim(),
            attendanceType: String(reg.bautizosAttendanceType || '').trim(),
          },
          suggestedAction: match.confidence === COLLISION_CONFIDENCE.POSSIBLE ? 'review_only' : 'link_companion_to_registrant',
          ackKey: buildCompanionCollisionAckKey(hostId, companionId, regId),
        };

        if (clusterFullyAcknowledged(cluster, participantsById)) continue;

        seenPair.add(pairKey);
        clusters.push(cluster);
      }
    }
  }

  clusters.sort((a, b) => (b.score || 0) - (a.score || 0));

  const byRegistrantId = new Map();
  const byHostId = new Map();
  for (const cl of clusters) {
    const rid = String(cl.registrantSide?.participantId || '');
    const hid = String(cl.companionSide?.hostId || '');
    if (rid) {
      if (!byRegistrantId.has(rid)) byRegistrantId.set(rid, []);
      byRegistrantId.get(rid).push(cl);
    }
    if (hid) {
      if (!byHostId.has(hid)) byHostId.set(hid, []);
      byHostId.get(hid).push(cl);
    }
  }

  const actionable = clusters.filter((c) => c.confidence !== COLLISION_CONFIDENCE.POSSIBLE);
  return {
    clusters,
    byRegistrantId,
    byHostId,
    total: actionable.length,
    actionableCount: actionable.length,
  };
}

/**
 * Hint al crear registro: busca colisiones con acompañantes existentes.
 */
export function buildNewEntryCompanionCollisionHint(name, birthDate, participants, eventId, options = {}) {
  const eid = String(eventId || '').trim();
  const candidateName = String(name || '').trim();
  if (!eid || !candidateName) return null;

  const candidateBirth = normalizeBirthDateToIso(birthDate) || '';

  const directMatches = [];
  const pool = (Array.isArray(participants) ? participants : []).filter(
    (p) => String(p?.eventId || '') === eid && isActiveOrWaitlistParticipant(p)
  );

  for (const host of pool) {
    const hostId = String(host?.id || '').trim();
    for (const c of getBautizosCompanionsArray(host)) {
      const cName = companionDisplayName(c);
      if (!cName) continue;
      const fakeReg = { id: '__new__', name: candidateName, birthDate: candidateBirth };
      const match = evaluateCompanionRegistrantMatch(c, fakeReg, options);
      if (!match.confidence || match.confidence === COLLISION_CONFIDENCE.POSSIBLE) continue;
      if (match.confidence === COLLISION_CONFIDENCE.POSSIBLE && options.includePossible !== true) continue;
      const minConf = options.minHintConfidence || COLLISION_CONFIDENCE.PROBABLE;
      if (match.confidence === COLLISION_CONFIDENCE.POSSIBLE && minConf !== COLLISION_CONFIDENCE.POSSIBLE) continue;

      directMatches.push({
        confidence: match.confidence,
        reasons: match.reasons,
        hostId,
        hostName: String(host.name || '').trim(),
        hostLocation: String(host.location || '').trim(),
        companionRow: c,
        companionId: String(c?.id || '').trim(),
        companionName: cName,
        ackKey: buildCompanionCollisionAckKey(hostId, String(c?.id || cName), '__new__'),
        summary: `Ya figura como acompañante de ${host.name || '—'} (${host.location || '?'})`,
      });
    }
  }

  if (!directMatches.length) return null;

  directMatches.sort((a, b) => {
    const rank = { certain: 3, probable: 2, possible: 1 };
    return (rank[b.confidence] || 0) - (rank[a.confidence] || 0);
  });

  const top = directMatches[0];
  const lines = directMatches.slice(0, 4).map((m) => {
    const rel = String(m.companionRow?.relationship || '').trim();
    return `${m.companionName}${rel ? ` (${rel})` : ''} · titular ${m.hostName} · ${m.hostLocation} · ${describeCollisionReasons(m.reasons)}`;
  });

  return {
    summary: `Esta persona ya figura como acompañante en ${directMatches.length} registro${directMatches.length === 1 ? '' : 's'} del evento.`,
    lines,
    matches: directMatches,
    topMatch: top,
    suggestLink: true,
  };
}

/** Parche de acompañante para vincular a registro activo. */
export function buildCompanionLinkPatch(companionRow, registrant) {
  const rid = String(registrant?.id || '').trim();
  const rName = String(registrant?.name || '').trim();
  if (!rid) return null;
  return {
    ...companionRow,
    linkedCompanionSourceKey: `p:${rid}`,
    linkedRegistrantId: rid,
    linkedCompanionName: rName || companionDisplayName(companionRow),
    linkedNoExtraCharge: true,
  };
}

/** Aplica vínculo en array bautizosCompanions del titular. */
export function applyCompanionLinkToHostCompanions(hostCompanions, companionId, registrant) {
  const cid = String(companionId || '').trim();
  const list = Array.isArray(hostCompanions) ? hostCompanions : [];
  return list.map((c) => {
    const id = String(c?.id || '').trim();
    const name = companionDisplayName(c);
    if (cid && id === cid) return buildCompanionLinkPatch(c, registrant);
    if (!cid && name && name === companionDisplayName({ name: companionId })) return buildCompanionLinkPatch(c, registrant);
    return c;
  });
}
