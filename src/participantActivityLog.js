import { addDoc, collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from './firebaseRefs.js';

/** Subcolección bajo `app_participants/{participantId}/…` (append-only). */
export const PARTICIPANT_ACTIVITY_SUBCOLLECTION = 'participant_activity';

export const PARTICIPANT_ACTIVITY_FETCH_LIMIT = 100;

/**
 * @param {string} participantId
 * @returns {import('firebase/firestore').CollectionReference}
 */
export function getParticipantActivityCollectionRef(participantId) {
  return collection(db, 'app_participants', String(participantId), PARTICIPANT_ACTIVITY_SUBCOLLECTION);
}

/**
 * Un evento de actividad por documento (1 escritura; sin lecturas).
 * @param {object} opts
 * @param {string} opts.participantId
 * @param {string} [opts.eventId]
 * @param {string} [opts.actorUsername]
 * @param {string} [opts.actorUserId]
 * @param {string} [opts.kind]
 * @param {string} opts.message
 */
export async function appendParticipantActivityEntry({
  participantId,
  eventId = '',
  actorUsername = '',
  actorUserId = '',
  kind = 'other',
  message,
}) {
  if (!participantId || !message) return;
  const col = getParticipantActivityCollectionRef(participantId);
  await addDoc(col, {
    eventId: eventId != null ? String(eventId) : '',
    at: Date.now(),
    actorUsername: String(actorUsername || '').trim() || '—',
    actorUserId: actorUserId != null ? String(actorUserId) : '',
    kind: String(kind || 'other').slice(0, 64),
    message: String(message).slice(0, 4000),
  });
}

/**
 * Solo cuando un administrador abre el panel (1 lectura acotada).
 * @param {string} participantId
 * @param {number} [max]
 * @returns {Promise<Array<{ id: string } & Record<string, unknown>>>}
 */
export async function fetchParticipantActivityEntries(participantId, max = PARTICIPANT_ACTIVITY_FETCH_LIMIT) {
  if (!participantId) return [];
  const col = getParticipantActivityCollectionRef(participantId);
  const q = query(col, orderBy('at', 'desc'), limit(Math.min(Math.max(1, max), 200)));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
