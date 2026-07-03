import { truncateActivityLogDetails } from './activityLogDiff.js';

function lineLabel(line) {
  return String(line?.name || 'Sin nombre').trim() || 'Sin nombre';
}

function memberNamesFromLines(memberLines, max = 8) {
  const names = (memberLines || []).map(lineLabel).filter(Boolean);
  if (!names.length) return '—';
  if (names.length <= max) return names.join('; ');
  return `${names.slice(0, max).join('; ')}; y ${names.length - max} más`;
}

export function titularNameFromSk(titularSk, memberLines, rosterById = null) {
  const sk = String(titularSk || '').trim();
  const line = (memberLines || []).find((l) => String(l?.sourceKey || '').trim() === sk);
  if (line) return lineLabel(line);
  const hostId = sk.replace(/^p:/, '');
  if (hostId && rosterById?.get?.(hostId)) return String(rosterById.get(hostId)).trim();
  return hostId ? `registro ${hostId}` : '—';
}

export function describeManualGroupCreated({ memberLines, anchorTitularSk, inheritedCars }) {
  const count = memberLines?.length || 0;
  const titular = titularNameFromSk(anchorTitularSk, memberLines);
  const integrantes = memberNamesFromLines(memberLines);
  return truncateActivityLogDetails(
    `Creó grupo manual (${count} integrante${count !== 1 ? 's' : ''}). Titular ancla: ${titular}. Carros compartidos: ${inheritedCars}. Integrantes: ${integrantes}.`
  );
}

export function describeManualGroupMembersAdded({
  addedLines,
  groupLabel = '',
  titularName = '',
  totalMembers,
  effectiveCars,
  orphanMode = '',
}) {
  const added = memberNamesFromLines(addedLines);
  const n = addedLines?.length || 0;
  const orphanNote = orphanMode === 'maybeAbsent' ? ' · datos huérfanos: quizá no vaya' : '';
  return truncateActivityLogDetails(
    `Agregó ${n} persona${n !== 1 ? 's' : ''} al grupo manual${groupLabel ? ` «${groupLabel}»` : ''}${titularName ? `. Titular: ${titularName}` : ''}. Total grupo: ${totalMembers}. Carros: ${effectiveCars}. Nombres: ${added}${orphanNote}.`
  );
}

export function describeManualGroupSeparated({ groupId, memberLines }) {
  const count = memberLines?.length || 0;
  const names = memberNamesFromLines(memberLines, 5);
  return truncateActivityLogDetails(
    `Separó grupo manual (${String(groupId || '').slice(0, 12)}…). ${count} registro${count !== 1 ? 's' : ''} liberado${count !== 1 ? 's' : ''}: ${names}.`
  );
}

export function describeManualGroupTitularChange({ groupLabel = '', prevTitularName, nextTitularName }) {
  return truncateActivityLogDetails(
    `Cambió titular del grupo${groupLabel ? ` «${groupLabel}»` : ''}: ${prevTitularName || '—'} → ${nextTitularName || '—'}. Datos de carro copiados al nuevo titular.`
  );
}

export function describeManualGroupCarsChange({ groupLabel = '', prevCars, nextCars, titularName = '' }) {
  return truncateActivityLogDetails(
    `Ajustó carros del grupo${groupLabel ? ` «${groupLabel}»` : ''}${titularName ? ` (titular ${titularName})` : ''}: ${prevCars} → ${nextCars}.`
  );
}

export function describeFamilyCarOverrideChange({ hostName, prevCars, nextCars }) {
  return truncateActivityLogDetails(
    `Sobrescribió carros de familia${hostName ? ` (${hostName})` : ''}: ${prevCars} → ${nextCars}.`
  );
}
