/**
 * v2 shim: formerly full Bautizos-event party/companion domain.
 * Only Campa baptism helpers remain (from campaBaptism.js).
 * Remaining exports are no-ops for leftover call sites during extraction cleanup.
 */
import { participantHasBaptismChip } from './campaBaptism.js';

export {
  BAPTISM_SHIRT_SIZES,
  normalizeBaptismShirtSize,
  participantHasBaptismChip,
} from './campaBaptism.js';

export const BAUTIZOS_ATTENDANCE = Object.freeze({
  bautizado: 'bautizado',
  asistente: 'asistente',
  servidor: 'servidor',
  empleado: 'empleado',
  cortesia: 'cortesia',
  pastor: 'pastor',
});

export function normalizePersonNameKey(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export function normalizeArrivalCarCount(raw) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

export function getBautizosCompanionsArray() {
  return [];
}
export function companionRowIsEffectivelyEmpty() {
  return true;
}
export function isBautizosCompanionBaptized() {
  return false;
}
export function buildBautizosSourceLinkMap() {
  return new Map();
}
export function resolveBautizosUltimateSourceKey(sk) {
  return String(sk || '').trim();
}
export function bautizosLlegaEnCarroForTransportPricing() {
  return false;
}
export function bautizosLineUsesEventTransportOnly() {
  return false;
}
export function expandBautizosGlobalRegistryRows(rows) {
  return Array.isArray(rows) ? rows : [];
}
export function expandBautizosGlobalRegistryActivosDisplayRows(rows) {
  return Array.isArray(rows) ? rows : [];
}
export function buildBautizadosListBaseRows(roster) {
  return Array.isArray(roster) ? roster.filter((p) => participantHasBaptismChip(p, 'Campa')) : [];
}
export function flattenBautizosParticipantsForRead(rows) {
  return Array.isArray(rows) ? rows : [];
}

export function normalizeBautizosAttendanceType(raw) {
  return String(raw || '').trim().toLowerCase() || 'bautizado';
}

export function normalizeBautizosCompanionsForPersist() {
  return [];
}

export function getFilledBautizosCompanions() {
  return [];
}

export function isBautizosPastorAttendance() {
  return false;
}

export function hasBautizosBaptizedCompanionInParty() {
  return false;
}

export function getBautizosSplitPartySlotDescriptors() {
  return [];
}

export function buildParticipantLikeForBautizosSplitSlot(p) {
  return p;
}
