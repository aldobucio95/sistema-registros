import React, { useMemo, useState } from 'react';
import { Link2, Network, UserPlus, Wrench, X } from 'lucide-react';
import {
  getBautizosCompanionsArray,
  normalizeBautizosAttendanceType,
  BAUTIZOS_ATTENDANCE,
  normalizeRelationshipKey,
  parseLinkSourceKey,
  buildBautizosSourceLinkMap,
  resolveBautizosUltimateSourceKey,
  getBautizosCompanionCanonicalKey,
  bautizosCompanionIsAlsoBautizadoRegistrant,
  isBautizosCompanionBaptized,
  normalizePersonNameKey,
  collectBautizosSplitDerivedCompanionLinkRepairs,
} from '../../../bautizosParty.js';
import {
  uiForm,
  uiShell,
  uiPageHeader,
  uiPageHeaderIcon,
  uiTable,
  uiEmptyState,
  uiKbd,
  uiModal,
  uiButtons,
  uiListToolbarBtn,
  uiRosterMobile,
  uiListMobile,
} from '../../../ui/uiFormatClasses.js';
import ListMobileCard from '../../../components/ListMobileCard.jsx';
import { buildLocationScopeSet, participantInLocationScope } from '../../../rbac/permissions.js';

/** Alias local para conservar legibilidad del archivo. */
const normName = normalizePersonNameKey;

/** nlc:<registrantId>:<bloque> → id del registrado dueño de la fila. */
function parseNlcHostRegistrantId(ek) {
  if (!String(ek).startsWith('nlc:')) return null;
  const rest = String(ek).slice(4);
  const i = rest.indexOf(':');
  if (i === -1) return rest || null;
  return rest.slice(0, i) || null;
}

function isBautizadoActivoInEvent(p) {
  return normalizeBautizosAttendanceType(p?.bautizosAttendanceType) === BAUTIZOS_ATTENDANCE.bautizado;
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

function companionRelationshipDisplay(c) {
  return String(
    c?.relationship || c?.linkedCompanionRelationship || c?.linkedCompanionNameRelation || ''
  ).trim();
}

function findDirectRelationshipLabel(roster, registrantId, targetParticipantId) {
  const sa = String(registrantId);
  const sb = String(targetParticipantId);
  for (const p of roster) {
    if (String(p.id) !== sa) continue;
    for (const c of getBautizosCompanionsArray(p)) {
      const sk = String(c?.linkedCompanionSourceKey || '').trim();
      if (sk === `p:${sb}`) return companionRelationshipDisplay(c);
    }
  }
  const tb = normName((roster.find((x) => String(x.id) === sb) || {})?.name);
  for (const p of roster) {
    if (String(p.id) !== sa) continue;
    for (const c of getBautizosCompanionsArray(p)) {
      if (tb && normName(c.name) === tb) return companionRelationshipDisplay(c) || '';
    }
  }
  return '';
}

function genderFlags(personLike) {
  const g = String(personLike?.gender || '').trim().toLowerCase();
  if (g.includes('mujer') || g === 'f' || g.includes('femen')) return { male: false, female: true };
  if (g.includes('hombre') || g === 'm' || g.includes('mascul')) return { male: true, female: false };
  return { male: false, female: false };
}

function spouseLabelForGender(participantById, id) {
  const g = genderFlags(participantById.get(String(id)));
  if (g.female) return 'Esposa';
  if (g.male) return 'Esposo';
  return 'Cónyuge';
}

/**
 * Las etiquetas de parentesco que el sistema **infiere** se devuelven siempre con la primera
 * letra en mayúscula (p. ej. «Hijo», «Nieta», «Bisnieto/a»). Las etiquetas que vienen
 * directamente del registro del usuario se mantienen tal y como las capturó.
 */
function childLabelForGender(participantById, id) {
  const g = genderFlags(participantById.get(String(id)));
  if (g.female) return 'Hija';
  if (g.male) return 'Hijo';
  return 'Hijo/a';
}

function grandchildLabelForGender(participantById, id) {
  const g = genderFlags(participantById.get(String(id)));
  if (g.female) return 'Nieta';
  if (g.male) return 'Nieto';
  return 'Nieto/a';
}

function greatGrandchildLabelForGender(participantById, id) {
  const g = genderFlags(participantById.get(String(id)));
  if (g.female) return 'Bisnieta';
  if (g.male) return 'Bisnieto';
  return 'Bisnieto/a';
}

/**
 * `target` registró a `source` como acompañante con `targetListsSourceAs`:
 * «source es targetListsSourceAs de target».
 * Devuelve cómo se relaciona `target` con `source` (vista de `source` hacia `target`).
 */
/**
 * Inversión de parentesco: si `target` registró a `source` como `targetListsSourceAs`,
 * devuelve cómo se ve `target` desde `source`. Todas las etiquetas devueltas son
 * **inferidas**, por lo que siempre van con la primera letra en mayúscula.
 *
 * Si no encuentra mapeo se devuelve el texto original tal cual lo capturó el usuario.
 */
function inverseRelationship(targetListsSourceAs, targetId, participantById) {
  const k = normalizeRelationshipKey(targetListsSourceAs);
  const gT = genderFlags(participantById.get(String(targetId)));
  const ch = childLabelForGender(participantById, targetId);
  const par = gT.female ? 'Madre' : gT.male ? 'Padre' : 'Padre/Madre';
  const sib = gT.female ? 'Hermana' : gT.male ? 'Hermano' : 'Hermano/a';
  const sobr = gT.female ? 'Sobrina' : gT.male ? 'Sobrino' : 'Sobrino/a';
  const tioa = gT.female ? 'Tía' : gT.male ? 'Tío' : 'Tío/a';
  const prim = gT.female ? 'Prima' : gT.male ? 'Primo' : 'Primo/a';
  const yn = gT.female ? 'Nuera' : gT.male ? 'Yerno' : 'Yerno/Nuera';
  const sue = gT.female ? 'Suegra' : gT.male ? 'Suegro' : 'Suegro/a';
  const ab = gT.female ? 'Abuela' : gT.male ? 'Abuelo' : 'Abuelo/a';
  const bisab = gT.female ? 'Bisabuela' : gT.male ? 'Bisabuelo' : 'Bisabuelo/a';
  const map = {
    padre: ch,
    papa: ch,
    madre: ch,
    mama: ch,
    hijo: par,
    hija: par,
    esposo: 'Esposa',
    esposa: 'Esposo',
    marido: 'Esposa',
    mujer: 'Esposo',
    conyuge: 'Cónyuge',
    hermano: sib,
    hermana: sib,
    abuelo: grandchildLabelForGender(participantById, targetId),
    abuela: grandchildLabelForGender(participantById, targetId),
    nieto: ab,
    nieta: ab,
    tio: sobr,
    tia: sobr,
    sobrino: tioa,
    sobrina: tioa,
    primo: prim,
    prima: prim,
    suegro: yn,
    suegra: yn,
    yerno: sue,
    nuera: sue,
    tutor: 'Tutorado/a',
  };
  if (map[k]) return map[k];
  if (k.startsWith('padre') || k.startsWith('papa')) return ch;
  if (k.startsWith('madre') || k.startsWith('mama')) return ch;
  if (k.startsWith('hij')) return par;
  if (k.startsWith('niet') && !k.startsWith('bisniet')) return ab;
  if (k.startsWith('bisniet')) return bisab;
  return String(targetListsSourceAs || '').trim() || 'Familiar';
}

function rkRel(s) {
  return normalizeRelationshipKey(s);
}

function isSpouseRel(k) {
  return (
    k.includes('espos') ||
    k === 'marido' ||
    k === 'mujer' ||
    k.includes('conyug')
  );
}

function isChildRel(k) {
  return k === 'hijo' || k === 'hija' || k.startsWith('hijo') || k.startsWith('hija');
}

function isParentRel(k) {
  return (
    k === 'padre' || k === 'madre' || k === 'papa' || k === 'mama' ||
    k.startsWith('padre') || k.startsWith('madre') ||
    k.startsWith('papa') || k.startsWith('mama')
  );
}

function isSiblingRel(k) {
  return k.includes('herman');
}

function isGrandchildRel(k) {
  return k === 'nieto' || k === 'nieta' || (k.includes('niet') && !k.includes('bis'));
}

/**
 * Prioridad de visualización del parentesco (menor número = mayor prioridad):
 *   1) esposo/esposa (cónyuge)
 *   2) hijo/hija o padre/madre
 *   3) nieto/nieta
 *   4) cualquier otro parentesco
 *   99) sin etiqueta
 */
function relDisplayPriority(label) {
  const k = rkRel(label);
  if (!k || k === '—') return 99;
  if (isSpouseRel(k)) return 1;
  if (isChildRel(k) || isParentRel(k)) return 2;
  if (isGrandchildRel(k)) return 3;
  return 4;
}

function composeKinToRoot(labelFromRootToCurrent, stepCurrentToNext, nextId, participantById) {
  const L = String(labelFromRootToCurrent || '').trim();
  const S = String(stepCurrentToNext || '').trim();
  if (rkRel(S) === 'familiar') {
    if (!L) return 'Familiar';
    const l = rkRel(L);
    if (isChildRel(l)) return grandchildLabelForGender(participantById, nextId);
    if (isSpouseRel(l)) return childLabelForGender(participantById, nextId);
    if (isGrandchildRel(l)) return greatGrandchildLabelForGender(participantById, nextId);
    if (l.includes('herman')) return childLabelForGender(participantById, nextId);
    return 'Familiar';
  }
  if (!L) return S;
  const l = rkRel(L);
  const s = rkRel(S);

  if (isSpouseRel(l) && isChildRel(s)) return childLabelForGender(participantById, nextId);
  if (isSpouseRel(l) && isParentRel(s)) {
    const g = genderFlags(participantById.get(String(nextId)));
    return g.female ? 'Suegra' : g.male ? 'Suegro' : 'Suegro/a';
  }
  if (isChildRel(l) && isChildRel(s)) return grandchildLabelForGender(participantById, nextId);
  if (isGrandchildRel(l) && isChildRel(s)) return greatGrandchildLabelForGender(participantById, nextId);
  if (isChildRel(l) && isSiblingRel(s)) return childLabelForGender(participantById, nextId);

  return S;
}

function resolveCompanionTargetParticipantId(registrant, companion, roster, idMap) {
  const sk = String(companion?.linkedCompanionSourceKey || '').trim();
  if (sk.startsWith('p:')) {
    const id = String(sk.slice(2)).trim();
    if (id && idMap.has(id)) return id;
    return id || null;
  }
  const pickName = normName(String(companion.linkedCompanionName || companion.name || '').trim());
  if (!pickName) return null;
  const rid = String(registrant.id);
  for (const p of roster) {
    if (String(p.id) === rid) continue;
    if (normName(p.name) === pickName) return String(p.id);
  }
  return null;
}

function buildKinGraph(roster) {
  const idMap = new Map(roster.map((p) => [String(p.id), p]));
  const neighbors = new Map();
  const relFromTo = new Map();
  const addN = (a, b) => {
    if (!neighbors.has(a)) neighbors.set(a, new Set());
    neighbors.get(a).add(b);
  };
  for (const p of roster) {
    const pid = String(p.id);
    for (const c of getBautizosCompanionsArray(p)) {
      const to = resolveCompanionTargetParticipantId(p, c, roster, idMap);
      if (!to || to === pid) continue;
      const relRaw = String(
        c.relationship || c.linkedCompanionRelationship || c.linkedCompanionNameRelation || ''
      ).trim();
      addN(pid, to);
      addN(to, pid);
      if (relRaw) {
        relFromTo.set(`${pid}|${to}`, relRaw);
      } else {
        if (!relFromTo.has(`${pid}|${to}`) && !relFromTo.has(`${to}|${pid}`)) {
          relFromTo.set(`${pid}|${to}`, '—');
        }
      }
    }
  }
  return { neighbors, relFromTo };
}

function stepHowTargetRelatesToSource(sourceId, targetId, relFromTo, participantById) {
  const key = `${sourceId}|${targetId}`;
  const direct = relFromTo.get(key);
  const rev = relFromTo.get(`${targetId}|${sourceId}`);
  if (direct && direct !== '—') return direct;
  if (rev && rev !== '—') return inverseRelationship(rev, targetId, participantById);
  if (direct === '—' || rev === '—') return 'Familiar';
  if (!direct && !rev) return '';
  return '';
}

function inferKinLabelsAndParents(rootId, familyIds, roster, participantById) {
  const root = String(rootId);
  const inFam = new Set(familyIds.map(String));
  const { neighbors, relFromTo } = buildKinGraph(roster);
  const labelToRoot = new Map([[root, '']]);
  const parent = new Map([[root, null]]);
  const q = [root];
  while (q.length) {
    const u = q.shift();
    const ns = neighbors.get(u);
    if (!ns) continue;
    for (const v of ns) {
      if (!inFam.has(v)) continue;
      const step = stepHowTargetRelatesToSource(u, v, relFromTo, participantById);
      if (!step) continue;
      if (parent.has(v)) continue;
      const composed = composeKinToRoot(labelToRoot.get(u), step, v, participantById);
      parent.set(v, u);
      labelToRoot.set(v, composed);
      q.push(v);
    }
  }
  for (const id of inFam) {
    if (id === root) continue;
    if (!parent.has(id)) {
      parent.set(id, root);
      const direct = findDirectRelationshipLabel(roster, root, id);
      const inv = findDirectRelationshipLabel(roster, id, root);
      const fb = direct || (inv ? inverseRelationship(inv, id, participantById) : '');
      labelToRoot.set(id, fb || 'Integrante del grupo');
    }
  }
  /**
   * Ajustes de jerarquía del árbol para que el orden visual siga la lógica familiar esperada:
   * 1) Si alguien es cónyuge de la raíz, cuelga directamente de la raíz.
   * 2) Si alguien está marcado como Hijo/Hija de otro integrante de la familia,
   *    ese vínculo de parentela directa tiene prioridad sobre etiquetas tipo Nieto/Nieta
   *    respecto a la raíz.
   */
  for (const id of inFam) {
    if (id === root) continue;
    const relRootToId = stepHowTargetRelatesToSource(root, id, relFromTo, participantById);
    if (isSpouseRel(rkRel(relRootToId))) {
      parent.set(id, root);
      continue;
    }
    /**
     * Si raíz e integrante son "padre/madre" de la misma persona dentro del árbol,
     * priorizamos vínculo conyugal entre ambos (jerarquía: esposo/esposa).
     */
    const sharesChildWithRoot = (() => {
      for (const k of inFam) {
        if (k === id || k === root) continue;
        const rootToK = rkRel(stepHowTargetRelatesToSource(root, k, relFromTo, participantById));
        const idToK = rkRel(stepHowTargetRelatesToSource(id, k, relFromTo, participantById));
        if (isChildRel(rootToK) && isChildRel(idToK)) return true;
      }
      return false;
    })();
    if (sharesChildWithRoot) {
      parent.set(id, root);
      labelToRoot.set(id, spouseLabelForGender(participantById, id));
      continue;
    }
    let bestParent = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const u of inFam) {
      if (u === id) continue;
      const relUToId = stepHowTargetRelatesToSource(u, id, relFromTo, participantById);
      const relKey = rkRel(relUToId);
      if (!isChildRel(relKey)) continue;
      const uToRoot = rkRel(labelToRoot.get(u) || '');
      /**
       * Preferimos padres que estén más "arriba" en la familia:
       * raíz/cónyuge (0), hijo/a de raíz (1), resto (2).
       */
      const generationScore = !uToRoot ? 0 : isSpouseRel(uToRoot) ? 0 : isChildRel(uToRoot) ? 1 : 2;
      const nameScore = String((participantById.get(String(u)) || {}).name || '').toLowerCase();
      const candidateScore = generationScore * 1000 + nameScore.length;
      if (candidateScore < bestScore) {
        bestScore = candidateScore;
        bestParent = String(u);
      }
    }
    if (bestParent) parent.set(id, bestParent);
  }
  return { parent, labelToRoot, relFromTo };
}

function sortParticipantIdsForTree(ids, participantById) {
  return [...ids].sort((a, b) => {
    const pa = participantById.get(String(a)) || {};
    const pb = participantById.get(String(b)) || {};
    const ageA = parseInt(pa.age, 10);
    const ageB = parseInt(pb.age, 10);
    const okA = Number.isFinite(ageA);
    const okB = Number.isFinite(ageB);
    if (okA && okB && ageA !== ageB) return ageB - ageA;
    const na = String(pa.name || '').localeCompare(String(pb.name || ''), 'es');
    return na;
  });
}

function buildFamilyTreeUINode(family, roster, participantById) {
  const ids = family.participantIds.map((id) => String(id));
  if (ids.length === 0) {
    return { id: 'empty', label: 'Familia', subtitle: '—', location: '', children: [] };
  }
  const withAge = ids
    .map((id) => {
      const p = participantById.get(id) || {};
      const age = parseInt(p.age, 10);
      return { id, p, age: Number.isFinite(age) ? age : 0, name: String(p.name || '').trim() || '—' };
    })
    .sort((a, b) => b.age - a.age || a.name.localeCompare(b.name, 'es'));
  /**
   * Raíz del árbol:
   * 1) mayor adulto (>=18) si existe,
   * 2) si no hay adultos con edad válida, primer elemento ordenado.
   *
   * Esto evita elegir como referencia a un hijo cuando en la familia sí hay adultos,
   * y permite que la jerarquía (esposo/esposa > padre/madre) se refleje correctamente.
   */
  const adultCandidates = withAge.filter((x) => Number.isFinite(x.age) && x.age >= 18);
  const rootPick = (adultCandidates.length > 0 ? adultCandidates[0] : withAge[0]);
  const rootId = String(rootPick.id);
  const { parent, labelToRoot, relFromTo } = inferKinLabelsAndParents(rootId, ids, roster, participantById);

  const REL_PLACEHOLDER = '—';

  /**
   * Parentescos calculados SIEMPRE respecto a la raíz del árbol.
   *
   * Se reúnen las posibles etiquetas que se pueden mostrar para el participante:
   *   a) Directa: lo que la raíz declaró del participante en su propio registro («Hija», «Esposa», etc.).
   *   b) Inversa: lo que el participante declaró de la raíz, invertido para verlo desde la raíz.
   *   c) Inferida: la composición que sale del BFS desde la raíz (p. ej. esposa de hijo → nuera).
   *   d) Inferida desde el padre asignado en el árbol.
   *
   * Prioridad de etiqueta:
   *   1) esposo/esposa
   *   2) hijo/hija o padre/madre
   *   3) nieto/nieta
   *   4) cualquier otro parentesco
   *
   * Desempate por origen:
   *   primero inferidas/calculadas, luego directas registradas y al final inversas registradas.
   */
  const subtitleForParticipant = (pid) => {
    if (String(pid) === rootId) {
      return 'Persona de referencia (mayor o primer adulto en la lista)';
    }
    const sp = String(pid);
    const candidates = [];
    const direct = relFromTo.get(`${rootId}|${sp}`);
    if (direct && direct !== REL_PLACEHOLDER) {
      candidates.push({ source: 0, label: String(direct).trim() });
    }
    const inv = relFromTo.get(`${sp}|${rootId}`);
    if (inv && inv !== REL_PLACEHOLDER) {
      const inverted = inverseRelationship(inv, sp, participantById);
      if (inverted) candidates.push({ source: 1, label: String(inverted).trim() });
    }
    const inferred = labelToRoot.get(sp);
    if (inferred && inferred !== REL_PLACEHOLDER) {
      candidates.push({ source: 2, label: String(inferred).trim() });
    }
    const parentId = parent.get(sp);
    if (parentId) {
      const fromParent = stepHowTargetRelatesToSource(String(parentId), sp, relFromTo, participantById);
      if (fromParent && fromParent !== REL_PLACEHOLDER) {
        // Se usa como respaldo para favorecer "Hijo/Hija de X" frente a "Nieto/Nieta" de raíz.
        candidates.push({ source: 3, label: String(fromParent).trim() });
      }
    }
    if (candidates.length === 0) return '—';
    const sourceRank = (source) => {
      if (source === 2 || source === 3) return 0; // inferidas/calculadas
      if (source === 0) return 1; // directa registrada
      if (source === 1) return 2; // inversa registrada
      return 9;
    };
    candidates.sort((a, b) => {
      const pa = relDisplayPriority(a.label);
      const pb = relDisplayPriority(b.label);
      if (pa !== pb) return pa - pb;
      return sourceRank(a.source) - sourceRank(b.source);
    });
    return candidates[0].label;
  };

  const childrenByParent = new Map();
  for (const id of ids) {
    if (id === rootId) continue;
    const pr = parent.get(id);
    if (!pr) continue;
    if (!childrenByParent.has(pr)) childrenByParent.set(pr, []);
    childrenByParent.get(pr).push(id);
  }
  for (const [, arr] of childrenByParent) sortParticipantIdsForTree(arr, participantById);

  const idSet = new Set(ids.map(String));
  const usedNames = new Set(ids.map((id) => normName((participantById.get(id) || {}).name)));
  const nlcRel = family.nlcRel || new Map();
  const nlcRelByRegistrant = family.nlcRelByRegistrant || new Map();
  const nlcLinkers = family.nlcLinkers || new Map();

  /** Elige host del extra priorizando jerarquía de parentesco (esposo/esposa > padre/madre > ...). */
  const pickHostForExtra = (canonKey) => {
    const relMap = nlcRelByRegistrant.get(canonKey) || new Map();
    const candidates = [];
    const host = parseNlcHostRegistrantId(canonKey);
    if (host && idSet.has(String(host))) candidates.push(String(host));
    const linkers = nlcLinkers.get(canonKey) || [];
    for (const lid of linkers) if (idSet.has(String(lid))) candidates.push(String(lid));
    const uniq = [...new Set(candidates.filter(Boolean))];
    if (uniq.length > 0) {
      uniq.sort((a, b) => {
        const ra = String(relMap.get(String(a)) || '').trim();
        const rb = String(relMap.get(String(b)) || '').trim();
        const pa = relDisplayPriority(ra);
        const pb = relDisplayPriority(rb);
        if (pa !== pb) return pa - pb;
        const na = String((participantById.get(String(a)) || {}).name || '').trim();
        const nb = String((participantById.get(String(b)) || {}).name || '').trim();
        return na.localeCompare(nb, 'es');
      });
      return uniq[0];
    }
    return rootId;
  };

  const extrasByHost = new Map();
  for (const ek of family.canonExtras || []) {
    const name = (family.nlcName && family.nlcName.get(ek)) || 'Acompañante';
    const nn = normName(name);
    if (!nn || nn === normName(rootPick.name) || usedNames.has(nn)) continue;
    usedNames.add(nn);
    const host = pickHostForExtra(ek);
    if (!extrasByHost.has(host)) extrasByHost.set(host, []);
    extrasByHost.get(host).push({ key: ek, name, rel: nlcRel.get(ek) || '' });
  }

  const extraSubtitle = (x) => {
    const t = String(x.rel || '').trim();
    if (t && t !== '—') return t;
    return 'Acompañante (sin parentesco en registro)';
  };

  const buildParticipantBranch = (pid) => {
    const p = participantById.get(String(pid)) || {};
    const name = String(p.name || '').trim() || '—';
    const sub = subtitleForParticipant(pid);
    const kidPids = [...(childrenByParent.get(String(pid)) || [])].sort((a, b) => {
      const ra = stepHowTargetRelatesToSource(String(pid), String(a), relFromTo, participantById);
      const rb = stepHowTargetRelatesToSource(String(pid), String(b), relFromTo, participantById);
      const pa = relDisplayPriority(ra);
      const pb = relDisplayPriority(rb);
      if (pa !== pb) return pa - pb; // esposo/esposa antes que hijo/hija
      return sortParticipantIdsForTree([a, b], participantById)[0] === a ? -1 : 1;
    });
    const chBranches = kidPids.map((cid) => buildParticipantBranch(cid));
    const extras = extrasByHost.get(String(pid)) || [];
    const exNodes = extras.map((x) => ({
      id: x.key,
      label: x.name,
      subtitle: extraSubtitle(x),
      location: '',
      children: [],
    }));
    const orderedChildren = [...chBranches, ...exNodes].sort((a, b) => {
      const pa = relDisplayPriority(a?.subtitle || '');
      const pb = relDisplayPriority(b?.subtitle || '');
      if (pa !== pb) return pa - pb; // esposo/esposa antes que hijo/hija
      return String(a?.label || '').localeCompare(String(b?.label || ''), 'es');
    });
    return {
      id: `pt-${pid}`,
      label: name,
      subtitle: sub,
      location: String(p?.location || '').trim(),
      children: orderedChildren,
    };
  };

  const rootNode = buildParticipantBranch(rootId);
  rootNode.id = `fam-${rootId}`;

  return rootNode;
}

function TreeBranch({ node, depth = 0 }) {
  const pad = depth === 0 ? '' : 'pl-4 border-l-2 border-teal-300/80 dark:border-teal-600 ml-2';
  return (
    <div className={pad}>
      <div className="rounded-lg border border-teal-200/80 dark:border-teal-500/50 bg-white/90 dark:bg-slate-900/70 px-2.5 py-1.5 mb-2 shadow-sm">
        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{node.label}</p>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-normal leading-snug">
          {node.subtitle}
          {node.location ? ` · ${node.location}` : ''}
        </p>
      </div>
      {node.children && node.children.length > 0 ? (
        <div className="space-y-1">
          {node.children.map((ch) => (
            <TreeBranch key={ch.id} node={ch} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function BautizosCompanionsPage({
  currentEvent,
  allParticipants,
  participantIsActiveInRoster,
  applyGlobalRegistryLikeFilters,
  globalLocationFilters,
  visibleLocations = [],
  renderGlobalRegistryListToolbar,
  isSuperUser = false,
  onRepairSplitPartyCompanionLinks,
  allParticipantsForRepairs,
}) {
  const [repairModalOpen, setRepairModalOpen] = useState(false);
  const [repairBusy, setRepairBusy] = useState(false);
  const locationScopeSet = useMemo(() => buildLocationScopeSet(visibleLocations), [visibleLocations]);

  const basePool = useMemo(() => {
    const evId = currentEvent?.id;
    if (!evId) return [];
    return (allParticipants || []).filter(
      (p) =>
        String(p.eventId) === String(evId) &&
        participantIsActiveInRoster(p) &&
        participantInLocationScope(p, locationScopeSet)
    );
  }, [allParticipants, currentEvent?.id, participantIsActiveInRoster, locationScopeSet]);

  const evRosterFiltered = useMemo(() => {
    let roster = applyGlobalRegistryLikeFilters(basePool);
    if (globalLocationFilters.length > 0) {
      roster = roster.filter((p) => globalLocationFilters.includes(p.location));
    }
    return roster;
  }, [basePool, applyGlobalRegistryLikeFilters, globalLocationFilters]);

  const sedeScopeHint =
    visibleLocations.length === 1
      ? `Mostrando solo la sede ${visibleLocations[0]}.`
      : visibleLocations.length > 0 && visibleLocations.length < (currentEvent?.locations || []).length
        ? `Sedes visibles para tu usuario: ${visibleLocations.join(', ')}.`
        : null;

  const participantById = useMemo(() => {
    const m = new Map();
    for (const p of allParticipants || []) m.set(String(p.id), p);
    return m;
  }, [allParticipants]);

  const splitPartyRepairPlans = useMemo(() => {
    if (!isSuperUser || currentEvent?.eventType !== 'Bautizos' || !currentEvent?.id) return [];
    const roster = (allParticipantsForRepairs || allParticipants || []).filter(
      (p) => String(p.eventId) === String(currentEvent.id)
    );
    return collectBautizosSplitDerivedCompanionLinkRepairs(roster);
  }, [isSuperUser, currentEvent?.eventType, currentEvent?.id, allParticipantsForRepairs, allParticipants]);

  const splitPartyRepairMatchCount = useMemo(
    () => splitPartyRepairPlans.reduce((n, plan) => n + (plan.matches?.length || 0), 0),
    [splitPartyRepairPlans]
  );

  const bautizadoMeta = useMemo(() => {
    const bautizadoIdSet = new Set();
    const bautizadoNameSet = new Set();
    const vnpToBautizadoId = new Map();
    for (const p of evRosterFiltered) {
      if (!isBautizadoActivoInEvent(p)) continue;
      const id = String(p.id);
      bautizadoIdSet.add(id);
      bautizadoNameSet.add(normName(p.name));
      const v = String(p.vnpPersonId || '').trim();
      if (v) vnpToBautizadoId.set(v, id);
    }
    return { bautizadoIdSet, bautizadoNameSet, vnpToBautizadoId };
  }, [evRosterFiltered]);

  const sourceLinkMap = useMemo(() => buildBautizosSourceLinkMap(evRosterFiltered), [evRosterFiltered]);

  const { listRows, registradosConAcompananteVisible } = useMemo(() => {
    const { bautizadoIdSet, bautizadoNameSet, vnpToBautizadoId } = bautizadoMeta;
    const raw = [];
    for (const p of evRosterFiltered) {
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
      let relationshipOut;
      if (distinctRel.length === 0) relationshipOut = '';
      else if (distinctRel.length === 1) relationshipOut = distinctRel[0];
      else relationshipOut = rels.map((x) => (x ? x : '—')).join(' · ');

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

    return { listRows, registradosConAcompananteVisible };
  }, [evRosterFiltered, bautizadoMeta, sourceLinkMap]);

  const unifiedFamilySection = useMemo(() => {
    /** Acompañantes únicos por persona; clave canónica `nlc:<host>:<companionId>` (raíz de la cadena de vínculos). */
    const nlcM = new Map();
    const nlcRel = new Map();
    /** Relaciones observadas por registrante para cada acompañante canónico. */
    const nlcRelByRegistrant = new Map();
    /** Registradores que vinculan al mismo acompañante (para fallback de host si el host no está en el roster). */
    const nlcLinkers = new Map();
    const d = new DSU();
    const allKeys = new Set();
    const inRoster = new Set(evRosterFiltered.map((p) => String(p.id)));
    for (const p of evRosterFiltered) {
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
    for (const p of evRosterFiltered) {
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
    /**
     * Segunda pasada: dentro de cada componente DSU, fusiona acompañantes con el mismo nombre normalizado.
     * Esto cubre el caso en que la cadena de vínculos no está bien resuelta y la misma persona termina con
     * dos claves canónicas distintas.
     */
    const byRoot = new Map();
    for (const k of allKeys) {
      const r = d.find(k);
      if (!byRoot.has(r)) byRoot.set(r, []);
      byRoot.get(r).push(k);
    }
    /** Mapa: key canónica original → key canónica fusionada por nombre dentro del componente. */
    const mergedCanon = new Map();
    for (const [, keys] of byRoot) {
      const seenByName = new Map();
      for (const k of keys) {
        if (!k.startsWith('nlc:')) continue;
        const nn = normName(nlcM.get(k) || '');
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
    const trees = [];
    for (const [r, keys] of byRoot) {
      const participants = new Set();
      const canonExtras = new Set();
      for (const k of keys) {
        if (k.startsWith('pt:')) participants.add(k.slice(3));
        if (k.startsWith('nlc:')) canonExtras.add(mergedCanon.get(k) || k);
      }
      const nPeople = participants.size + canonExtras.size;
      if (nPeople < 3) continue;
      trees.push({
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
    trees.sort((a, b) => (a.participantIds[0] || '').localeCompare(b.participantIds[0] || ''));
    return { trees, nlcM, nlcRel, nlcRelByRegistrant, nlcLinkers };
  }, [evRosterFiltered, sourceLinkMap]);

  const familyTrees = unifiedFamilySection.trees;

  if (!currentEvent) return null;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto">
      <div className={`${uiShell.card} p-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5`}>
        <div className="flex items-start gap-2.5 min-w-0">
          <div className={`${uiPageHeaderIcon('teal')} !p-2`}>
            <UserPlus size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Acompañantes</h2>
            <p className={`${uiPageHeader.subtitle} mt-0.5 leading-snug max-w-2xl max-md:hidden text-[11px]`}>
              Inscritos activos con acompañantes (no bautizados como acompañante ni duplicados por vínculo). Mismos filtros de
              búsqueda concatenada y sede que Registro global y Servidores.
            </p>
            {sedeScopeHint ? (
              <p className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 mt-1">{sedeScopeHint}</p>
            ) : null}
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
              Filas en tabla:{' '}
              <span className="font-black text-slate-800 dark:text-slate-100 tabular-nums">{listRows.length}</span>
              <span className="text-slate-400"> · </span>
              Registros con al menos un acompañante visible:{' '}
              <span className="font-black text-slate-800 dark:text-slate-100 tabular-nums">
                {registradosConAcompananteVisible}
              </span>
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          {isSuperUser && typeof onRepairSplitPartyCompanionLinks === 'function' ? (
            <button
              type="button"
              onClick={() => setRepairModalOpen(true)}
              disabled={splitPartyRepairPlans.length <= 0}
              className={`${uiListToolbarBtn} disabled:opacity-45 disabled:pointer-events-none`}
              title="Revisar y vincular en Firebase acompañantes duplicados en registros derivados de grupos partidos"
            >
              <Wrench size={14} className="shrink-0 text-slate-500 dark:text-slate-400" />
              <span>Reparar vínculos</span>
              {splitPartyRepairPlans.length > 0 ? (
                <span className="tabular-nums text-indigo-700 dark:text-indigo-300">
                  ({splitPartyRepairPlans.length})
                </span>
              ) : null}
            </button>
          ) : null}
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-wider">Coincidencias</p>
            <p className="text-2xl font-black text-teal-700 dark:text-teal-400 tabular-nums">{listRows.length}</p>
          </div>
        </div>
      </div>

      {typeof renderGlobalRegistryListToolbar === 'function'
        ? renderGlobalRegistryListToolbar(
            basePool,
            'Solo afectan a esta vista de Acompañantes (misma barra que Registro global y Servidores). La búsqueda también localiza por nombre o ID VNPM del acompañante en la ficha del registrado.'
          )
        : null}

      {repairModalOpen && isSuperUser ? (
        <div className={uiModal.overlay} role="dialog" aria-modal="true" aria-labelledby="bautizos-repair-links-title">
          <button
            type="button"
            className={uiModal.backdrop}
            aria-label="Cerrar"
            disabled={repairBusy}
            onClick={() => !repairBusy && setRepairModalOpen(false)}
          />
          <div className={uiModal.panelMd}>
            <div className={uiModal.header}>
              <div className="min-w-0">
                <h3 id="bautizos-repair-links-title" className={uiModal.title}>
                  Reparar vínculos de acompañantes
                </h3>
                <p className={`${uiForm.help} mt-1`}>
                  {splitPartyRepairPlans.length} registro(s) derivado(s) · {splitPartyRepairMatchCount} coincidencia(s) por
                  vincular al titular del grupo.
                </p>
              </div>
              <button
                type="button"
                className={uiButtons.closeIcon}
                disabled={repairBusy}
                onClick={() => setRepairModalOpen(false)}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>
            <div className={`${uiModal.body} space-y-4`}>
              <p className={uiForm.help}>
                Se marcarán como <strong className="text-slate-700 dark:text-slate-200">vinculados sin cobro extra</strong>{' '}
                los acompañantes que hoy están duplicados en registros derivados (cuando un acompañante también se bautizó y
                se creó otro registro activo). La lista completa se conserva en cada ficha; solo cambia el vínculo en Firebase.
              </p>
              {splitPartyRepairPlans.length === 0 ? (
                <div className={`${uiEmptyState.wrap} py-6`}>
                  <p className={uiEmptyState.title}>Sin coincidencias</p>
                  <p className={uiEmptyState.help}>No hay registros derivados pendientes de reparación.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {splitPartyRepairPlans.map((plan) => (
                    <div
                      key={plan.participantId}
                      className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-800/40 overflow-hidden"
                    >
                      <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-600 bg-white/80 dark:bg-slate-900/50">
                        <p className="text-xs font-black text-slate-800 dark:text-slate-100 leading-snug">
                          Registro derivado: <span className="text-indigo-700 dark:text-indigo-300">{plan.derivedName}</span>
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                          Titular del grupo: <span className="font-semibold text-slate-700 dark:text-slate-200">{plan.hostName}</span>
                          {plan.location ? (
                            <>
                              {' '}
                              · Sede: <span className="font-semibold">{plan.location}</span>
                            </>
                          ) : null}
                        </p>
                      </div>
                      <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                        {plan.matches.map((m, mi) => (
                          <li
                            key={`${plan.participantId}-${mi}`}
                            className="px-3 py-2 flex flex-wrap items-start gap-x-3 gap-y-1 text-[11px]"
                          >
                            <span className="font-bold text-slate-800 dark:text-slate-100 min-w-0 flex-1">
                              {m.companionName}
                              {m.relationship ? (
                                <span className="font-semibold text-slate-500 dark:text-slate-400">
                                  {' '}
                                  · {m.relationship}
                                </span>
                              ) : null}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-800 dark:text-teal-200 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-700/50 rounded-md px-1.5 py-0.5 shrink-0">
                              <Link2 size={10} className="shrink-0" aria-hidden />
                              Vincular a titular
                            </span>
                            <span className="w-full text-[9px] font-mono text-slate-400 dark:text-slate-500 break-all">
                              {m.linkKey}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className={uiModal.footer}>
              <button
                type="button"
                className={uiButtons.secondary}
                disabled={repairBusy}
                onClick={() => setRepairModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={uiButtons.primary}
                disabled={repairBusy || splitPartyRepairPlans.length === 0}
                onClick={() => {
                  if (!onRepairSplitPartyCompanionLinks) return;
                  setRepairBusy(true);
                  void onRepairSplitPartyCompanionLinks(splitPartyRepairPlans).then((ok) => {
                    setRepairBusy(false);
                    if (ok) setRepairModalOpen(false);
                  });
                }}
              >
                {repairBusy ? 'Guardando…' : 'Aplicar en Firebase'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!listRows.length ? (
        <div className={`${uiShell.card} ${uiEmptyState.wrap}`}>
          <UserPlus size={28} className={uiEmptyState.icon} />
          <p className={uiEmptyState.title}>Sin acompañantes</p>
          <p className={uiEmptyState.help}>No hay acompañantes que mostrar con los filtros actuales.</p>
        </div>
      ) : (
        <>
        <div className={uiListMobile.shellViolet}>
          {listRows.map((r, i) => (
            <ListMobileCard
              key={r.id}
              variant="compact"
              tone="violet"
              titleLabel=""
              title={`${i + 1}. ${r.companionName}${r.isLinked ? ' (Vinculado)' : ''}`}
              metaRows={[
                { key: 'reg', label: 'Acompaña a', value: r.registradoName || '—' },
                { key: 'rel', label: 'Parentesco', value: r.relationship || '—' },
                { key: 'loc', label: 'Sede', value: r.location || '—' },
              ]}
            />
          ))}
        </div>
        <div className={`${uiTable.wrap} ${uiShell.card} hidden md:block`}>
          <table className={uiTable.table}>
            <thead className={uiTable.thead}>
              <tr>
                <th className={uiTable.th}>Nombre acompañante</th>
                <th className={uiTable.th}>Acompaña a</th>
                <th className={uiTable.th}>Parentesco</th>
                <th className={uiTable.th}>Sede</th>
              </tr>
            </thead>
            <tbody className={uiTable.tbody}>
              {listRows.map((r, i) => (
                <tr key={r.id} className={uiTable.tr}>
                  <td className={`${uiTable.td} align-top`}>
                    <span className={`${uiKbd.base} min-w-[1.6rem] h-6 justify-center shrink-0 mr-2 align-middle`}>
                      {i + 1}
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 align-middle">{r.companionName}</span>
                    {r.isLinked ? (
                      <span className="ml-1.5 align-middle inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-teal-100 text-teal-800 border border-teal-200 dark:bg-teal-900/40 dark:text-teal-100 dark:border-teal-600">
                        Vinculado
                      </span>
                    ) : null}
                  </td>
                  <td className={`${uiTable.td} font-semibold text-left break-words max-w-[14rem] md:max-w-md`}>
                    {r.registradoName || '—'}
                  </td>
                  <td className={`${uiTable.td} break-words max-w-[12rem]`}>{r.relationship || '—'}</td>
                  <td className={`${uiTable.td} break-words max-w-[10rem]`}>{r.location || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}

      {familyTrees.length > 0 ? (
        <section className="space-y-3 pt-2">
          <div className="flex items-start gap-3">
            <div className={uiPageHeaderIcon('teal')}>
              <Network size={22} />
            </div>
            <div className="min-w-0">
              <h3 className={uiPageHeader.title}>Árboles familiares (un gráfico por familia)</h3>
              <p className={`${uiPageHeader.subtitle} mt-1 leading-snug`}>
                Cada sección reúne a toda la familia conectada (bautizados, registrados y acompañantes), sin importar el rol. Solo
                se dibuja si en el grupo hay 3 o más personas. La raíz es el participante de mayor edad en la lista, y todos los
                parentescos mostrados se calculan respecto a esa raíz.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {familyTrees.map((g) => {
              const node = buildFamilyTreeUINode(g, evRosterFiltered, participantById);
              return (
                <div
                  key={g.root}
                  className="rounded-2xl border border-teal-200 bg-teal-50/40 px-4 py-3 shadow-sm dark:bg-transparent dark:border-2 dark:border-teal-500"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-teal-700 dark:text-teal-200">Familia</p>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-teal-600 text-white rounded px-1.5 py-0.5">
                      {g.nPeople} en el grupo
                    </span>
                  </div>
                  <TreeBranch node={node} depth={0} />
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
