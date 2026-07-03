import {
  nameFuzzyRatio,
  nameTokensSubsetMatch,
  normalizePersonNameForMatch,
  tokenizePersonName,
} from './personNameMatch.js';
import { normalizeBirthDateToIso } from './birthDateIsoUtils.js';

export function buildCampaSpouseCollisionAckKey(idA, idB) {
  const a = String(idA || '').trim();
  const b = String(idB || '').trim();
  if (!a || !b) return '';
  const pair = [a, b].sort().join('|');
  return `dup:campa_spouse:${pair}`;
}

function isActiveParticipant(p) {
  const status = p?.status || 'active';
  if (status === 'cancelled' || status === 'archived') return false;
  return status === 'active' || status === 'waitlist';
}

function clusterAcknowledged(cluster, participantsById) {
  const ackKey = cluster?.ackKey;
  if (!ackKey) return false;
  const a = participantsById.get(String(cluster.memberA?.id || ''));
  const b = participantsById.get(String(cluster.memberB?.id || ''));
  const ackA = Array.isArray(a?.duplicateAlertAcknowledgedKeys)
    ? a.duplicateAlertAcknowledgedKeys.includes(ackKey)
    : false;
  const ackB = Array.isArray(b?.duplicateAlertAcknowledgedKeys)
    ? b.duplicateAlertAcknowledgedKeys.includes(ackKey)
    : false;
  return ackA && ackB;
}

/**
 * Detecta parejas Campa sin vínculo bidireccional o nombres de cónyuge similares a otro activo.
 */
export function buildCampaFamilyCollisionIndex(participants, eventId, options = {}) {
  const eid = String(eventId || '').trim();
  if (!eid) return { clusters: [], byParticipantId: new Map(), total: 0 };

  const pool = (Array.isArray(participants) ? participants : []).filter(
    (p) => String(p?.eventId || '') === eid && isActiveParticipant(p) && (p?.status || 'active') === 'active'
  );
  const participantsById = new Map(pool.map((p) => [String(p.id), p]));
  const clusters = [];

  for (const p of pool) {
    const pid = String(p.id || '').trim();
    const spouseId = String(p.spouseParticipantId || '').trim();
    const spouseName = String(p.spouseName || '').trim();

    if (spouseId) {
      const spouse = participantsById.get(spouseId);
      if (spouse) {
        const reverse = String(spouse.spouseParticipantId || '').trim();
        if (reverse !== pid) {
          const ackKey = buildCampaSpouseCollisionAckKey(pid, spouseId);
          const cluster = {
            kind: 'campa_spouse_unlinked',
            confidence: 'probable',
            reasons: ['spouse_one_way'],
            memberA: { id: pid, name: p.name, location: p.location },
            memberB: { id: spouseId, name: spouse.name, location: spouse.location },
            ackKey,
            suggestedAction: 'link_spouse_bidirectional',
          };
          if (!clusterAcknowledged(cluster, participantsById)) clusters.push(cluster);
        }
      }
    } else if (spouseName) {
      for (const other of pool) {
        const oid = String(other.id || '').trim();
        if (oid === pid) continue;
        if (String(other.spouseParticipantId || '').trim() === pid) continue;

        const exact = normalizePersonNameForMatch(spouseName) === normalizePersonNameForMatch(other.name);
        const fuzzy = nameFuzzyRatio(spouseName, other.name);
        const subset = nameTokensSubsetMatch(spouseName, other.name);
        if (!exact && !subset && fuzzy < 0.88) continue;

        const pBirth = normalizeBirthDateToIso(p.birthDate) || '';
        const oBirth = normalizeBirthDateToIso(other.birthDate) || '';
        const birthBoost = pBirth && oBirth && pBirth === oBirth;

        const confidence = exact || (subset && fuzzy >= 0.85) || birthBoost ? 'probable' : 'possible';
        const ackKey = buildCampaSpouseCollisionAckKey(pid, oid);
        const cluster = {
          kind: 'campa_spouse_name_match',
          confidence,
          reasons: exact ? ['spouse_name_exact'] : subset ? ['spouse_name_tokens'] : ['spouse_name_fuzzy'],
          memberA: { id: pid, name: p.name, location: p.location, spouseName },
          memberB: { id: oid, name: other.name, location: other.location },
          ackKey,
          suggestedAction: 'link_spouse_bidirectional',
        };
        if (!clusterAcknowledged(cluster, participantsById)) clusters.push(cluster);
      }
    }
  }

  const seen = new Set();
  const unique = clusters.filter((c) => {
    const key = c.ackKey;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const byParticipantId = new Map();
  for (const cl of unique) {
    for (const mid of [cl.memberA?.id, cl.memberB?.id]) {
      const id = String(mid || '').trim();
      if (!id) continue;
      if (!byParticipantId.has(id)) byParticipantId.set(id, []);
      byParticipantId.get(id).push(cl);
    }
  }

  const actionable = unique.filter((c) => c.confidence !== 'possible');
  return { clusters: unique, byParticipantId, total: actionable.length };
}

export function describeCampaSpouseCluster(cluster) {
  const a = cluster?.memberA || {};
  const b = cluster?.memberB || {};
  if (cluster?.kind === 'campa_spouse_unlinked') {
    return `Pareja sin vínculo bidireccional: ${a.name || '—'} ↔ ${b.name || '—'}`;
  }
  return `Posible pareja (${a.spouseName || 'nombre cónyuge'}): ${a.name || '—'} ↔ ${b.name || '—'}`;
}
