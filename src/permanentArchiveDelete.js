/**
 * Permanent delete of archived participants.
 *
 * Linked donations from archive/cancel flows store the participant on
 * `sourceParticipantId` (not `participantId`). Archive index cleanup requires a
 * person-shaped object for getArchiveProfileDocId / participantFirebaseId match.
 */

/** Field on `app_donations` that links credit/refund donation rows to a participant. */
export const DONATION_SOURCE_PARTICIPANT_FIELD = 'sourceParticipantId';

/**
 * Build the person object for `removeArchiveProfileIndexEntryIfMatches`.
 * Passing a bare VNPM/phone string makes getArchiveProfileDocId invent a
 * `pid_t-<timestamp>` key and skips real index cleanup.
 *
 * @param {{ rawParticipant?: object|null, firestoreData?: object|null, pid: string }} p
 * @returns {object|null}
 */
export function resolvePersonForArchiveIndexCleanup({ rawParticipant, firestoreData, pid }) {
  const id = String(pid || '').trim();
  if (!id) return null;
  if (rawParticipant && typeof rawParticipant === 'object') {
    return { ...rawParticipant, id: rawParticipant.id != null ? rawParticipant.id : id };
  }
  if (firestoreData && typeof firestoreData === 'object') {
    return { ...firestoreData, id };
  }
  return null;
}

/**
 * @param {string} pid
 * @returns {{ field: string, value: string } | null}
 */
export function linkedDonationsQueryForParticipant(pid) {
  const value = String(pid || '').trim();
  if (!value) return null;
  return { field: DONATION_SOURCE_PARTICIPANT_FIELD, value };
}
