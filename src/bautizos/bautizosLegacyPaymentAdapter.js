import { isLegacyBautizosParticipant } from './bautizosLegacyReadAdapter.js';

/** Fila virtual de acompañante o bautizado derivado de `bautizosCompanions[]` (lectura plana). */
export function isBautizosLegacyCompanionVirtualRow(personLike) {
  return (
    personLike?.__globalRegistryCompanionRow === true ||
    personLike?.__legacyCompanionRow === true ||
    personLike?.__legacyCompanionBaptized === true
  );
}

/** Documento titular persistido que aún tiene `bautizosCompanions[]` (no fila virtual). */
export function isBautizosLegacyHostStoredRow(personLike) {
  if (!personLike || isBautizosLegacyCompanionVirtualRow(personLike)) return false;
  return isLegacyBautizosParticipant(personLike);
}

/** Extrae la clave del subregistro `bautizosCompanions[].id` desde ids virtuales o del registro global. */
export function parseBautizosCompanionKeyFromVirtualRowId(id) {
  const s = String(id || '').trim();
  const patterns = [
    /^gr-companion:[^:]+:(.+)$/,
    /^virt-acompanante:[^:]+:(.+)$/,
    /^virt-bautizado:[^:]+:(.+)$/,
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m) return String(m[1] || '').trim();
  }
  return '';
}

/** Titular legado o acompañante virtual: finanzas repartidas FIFO sobre el documento host. */
export function shouldUseBautizosLegacyPartyFinances(personLike, eventLike) {
  if (!eventLike || eventLike.eventType !== 'Bautizos') return false;
  if (isBautizosLegacyCompanionVirtualRow(personLike)) return true;
  if (isBautizosLegacyHostStoredRow(personLike)) return true;
  return false;
}
