/**
 * Recuperación local de registros que fallaron al guardar en Firestore.
 * Persistido en localStorage por dispositivo/navegador; cada entrada lleva ownerUserId.
 */

import { buildLogId } from './activityLogCore.js';

export const FAILED_REGISTRATION_RECOVERY_KEY = 'vnpm_failed_registration_recovery';
export const FAILED_REGISTRATION_RECOVERY_MAX = 40;

const KIND_LABELS = {
  registro_nuevo: 'Nuevo registro',
  registro_actualizado: 'Actualización de registro',
  lista_espera_nueva: 'Lista de espera',
  lista_espera_actualizada: 'Actualización en lista de espera',
};

function getStorage() {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  if (typeof globalThis !== 'undefined' && globalThis.localStorage) return globalThis.localStorage;
  return null;
}

function readStore() {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const arr = JSON.parse(storage.getItem(FAILED_REGISTRATION_RECOVERY_KEY) || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeStore(items) {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(
      FAILED_REGISTRATION_RECOVERY_KEY,
      JSON.stringify((items || []).slice(0, FAILED_REGISTRATION_RECOVERY_MAX))
    );
  } catch {
    /* quota */
  }
}

function recoveryFingerprint(record) {
  const name = String(record?.entryPayload?.name || record?.summaryName || '').trim().toLowerCase();
  return [
    String(record?.ownerUserId || ''),
    String(record?.eventId || ''),
    String(record?.loc || ''),
    name,
    record?.sendToWaitlist ? 'wl' : 'reg',
  ].join('|');
}

function formatFailedAt(ms) {
  try {
    return new Date(ms).toLocaleString('es-MX');
  } catch {
    return '—';
  }
}

/** @param {object} input */
export function buildFailedRegistrationRecoveryRecord(input) {
  const failedAt = Number(input?.failedAt) || Date.now();
  const entryPayload = input?.entryPayload && typeof input.entryPayload === 'object' ? input.entryPayload : {};
  const kind = String(input?.kind || 'registro_nuevo').trim();
  const sendToWaitlist = !!input?.sendToWaitlist;
  return {
    id: String(input?.id || buildLogId(failedAt)),
    failedAt,
    failedAtLabel: formatFailedAt(failedAt),
    ownerUserId: String(input?.ownerUserId || ''),
    ownerUsername: String(input?.ownerUsername || ''),
    eventId: String(input?.eventId || ''),
    eventName: String(input?.eventName || ''),
    eventType: String(input?.eventType || ''),
    loc: String(input?.loc || ''),
    kind,
    kindLabel: KIND_LABELS[kind] || kind,
    sendToWaitlist,
    errorCode: String(input?.errorCode || ''),
    errorMessage: String(input?.errorMessage || ''),
    summaryName: String(entryPayload?.name || input?.summaryName || '').trim(),
    entryPayload,
    newRegGeneralComment: String(input?.newRegGeneralComment || ''),
    newRegDraftCarMeta:
      input?.newRegDraftCarMeta && typeof input.newRegDraftCarMeta === 'object' && !Array.isArray(input.newRegDraftCarMeta)
        ? input.newRegDraftCarMeta
        : {},
    newRegPrivacyAccepted: !!input?.newRegPrivacyAccepted,
    newRegSensitiveConsent: String(input?.newRegSensitiveConsent || ''),
    participantDocId: input?.participantDocId != null ? String(input.participantDocId) : '',
    firestoreSnapshot: input?.firestoreSnapshot && typeof input.firestoreSnapshot === 'object' ? input.firestoreSnapshot : null,
  };
}

/** Guarda o actualiza un intento fallido (mismo titular/evento/sede en este dispositivo). */
export function persistFailedRegistrationRecovery(input) {
  const record = buildFailedRegistrationRecoveryRecord(input);
  if (!record.ownerUserId) return record;
  const fp = recoveryFingerprint(record);
  const items = readStore().filter((r) => recoveryFingerprint(r) !== fp);
  items.unshift(record);
  writeStore(items);
  return record;
}

/** Lista recuperaciones visibles para el usuario actual (o todas si includeAllUsers). */
export function listFailedRegistrationRecoveries({ viewerUserId, includeAllUsers = false } = {}) {
  const uid = String(viewerUserId || '').trim();
  const items = readStore();
  const filtered = includeAllUsers
    ? items
    : items.filter((r) => String(r?.ownerUserId || '') === uid);
  return filtered.sort((a, b) => (Number(b?.failedAt) || 0) - (Number(a?.failedAt) || 0));
}

export function removeFailedRegistrationRecovery(id) {
  const target = String(id || '').trim();
  if (!target) return false;
  const next = readStore().filter((r) => String(r?.id || '') !== target);
  writeStore(next);
  return true;
}

/** Convierte un registro fallido al formato de fila compacta (estilo log de actividad). */
export function failedRegistrationRecoveryToLogRow(record) {
  const r = record && typeof record === 'object' ? record : {};
  return {
    id: r.id,
    timestamp: r.failedAtLabel || formatFailedAt(r.failedAt),
    username: r.ownerUsername || '—',
    eventName: r.eventName || '—',
    action: r.sendToWaitlist ? 'Lista de Espera (falló)' : 'Nuevo Registro (falló)',
    details: buildFailedRegistrationRecoverySummary(r, { compact: true }),
    status: 'error',
    isError: true,
    entityType: 'participant',
    entityId: r.summaryName || r.participantDocId || '',
    errorMessage: r.errorMessage || '',
    __recoveryRecord: r,
  };
}

/** Texto legible para modal / fila comprimida. */
export function buildFailedRegistrationRecoverySummary(record, { compact = false } = {}) {
  const r = record && typeof record === 'object' ? record : {};
  const entry = r.entryPayload && typeof r.entryPayload === 'object' ? r.entryPayload : {};
  const name = String(r.summaryName || entry.name || 'Sin nombre').trim();
  const paid = Number.parseFloat(entry.paid);
  const paidTxt = Number.isFinite(paid) && paid > 0 ? `$${paid.toLocaleString('es-MX')}` : 'sin abono';
  const comps = Array.isArray(entry.bautizosCompanions)
    ? entry.bautizosCompanions.filter((c) => String(c?.name || '').trim()).length
    : 0;
  const err = r.errorMessage ? ` Error: ${r.errorMessage}` : '';
  const base = `${name} · ${r.eventName || 'evento'} · sede ${r.loc || '—'} · ${paidTxt}${comps ? ` · ${comps} acompañante(s)` : ''}${err}`;
  if (compact) return base;
  const lines = [
    `Persona: ${name}`,
    `Evento: ${r.eventName || '—'} (${r.eventType || '—'})`,
    `Sede: ${r.loc || '—'}`,
    `Tipo: ${r.kindLabel || r.kind || '—'}${r.sendToWaitlist ? ' (lista de espera)' : ''}`,
    `Abono inicial: ${paidTxt}`,
    `Teléfono: ${String(entry.phone || '—')}`,
    `ID VNPM: ${String(entry.vnpPersonId || '—')}`,
  ];
  if (comps) lines.push(`Acompañantes: ${comps}`);
  if (r.newRegGeneralComment?.trim()) lines.push(`Comentario: ${r.newRegGeneralComment.trim()}`);
  if (r.newRegPrivacyAccepted) lines.push('Aviso de privacidad: aceptado');
  if (r.newRegSensitiveConsent) lines.push(`Datos médicos permanentes: ${r.newRegSensitiveConsent}`);
  if (r.errorCode || r.errorMessage) {
    lines.push(`Fallo Firestore: ${[r.errorCode, r.errorMessage].filter(Boolean).join(' — ')}`);
  }
  lines.push(`Fecha del intento: ${r.failedAtLabel || formatFailedAt(r.failedAt)}`);
  lines.push(`Usuario: ${r.ownerUsername || '—'}`);
  return lines.join('\n');
}

export function failedRegistrationRecoveryJson(record) {
  try {
    return JSON.stringify(record, null, 2);
  } catch {
    return '{}';
  }
}
