/**
 * Debe mantenerse alineado con `src/publicRegistrationLogic.js`
 * (canonicalizeVnpPersonId, participantDocumentIdFromVnpPersonId, resolveParticipantDocumentIdForWrite).
 * Altas en un segundo evento con el mismo VNPM usan sufijo `__e_<eventId>` en el id de documento.
 * Ver también `responsivaRegistryDocId` en `src/responsivaRegistry.js`.
 */

const normalizeIdText = (txt) =>
  String(txt || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u00f1/gi, 'n')
    .replace(/\u00df/gi, 'ss')
    .toUpperCase();

export function canonicalizeVnpPersonId(raw) {
  const t = String(raw || '').trim();
  if (!t) return '';
  const m = t.match(/^VNPM-(.*)$/i);
  if (!m) return t;
  const rest = normalizeIdText(m[1]).replace(/[^A-Z0-9]/g, '');
  if (!rest) return '';
  return `VNPM-${rest}`;
}

/** @returns {string|null} */
export function participantDocumentIdFromVnpPersonId(vnpRaw) {
  const vnp = canonicalizeVnpPersonId(vnpRaw || '');
  if (vnp.length >= 4) {
    const safe = vnp.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
    return `id_${safe}`;
  }
  return null;
}

export function responsivaRegistryDocId(eventId, participantId) {
  const e = String(eventId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const p = String(participantId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${e}__${p}`;
}
