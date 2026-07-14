import { useCallback, useMemo } from 'react';
import { arrayUnion, updateDoc, writeBatch } from 'firebase/firestore';
import {
  applyCompanionLinkToHostCompanions,
  buildCompanionRegistrantCollisionIndex,
  describeCollisionCluster,
  describeCollisionReasons,
} from '../../companionRegistrantCollision.js';
import { truncateActivityLogDetails } from '../../activityLogDiff.js';
import { db, getDocRef } from '../../firebaseRefs.js';

const EMPTY_COLLISION_INDEX = {
  clusters: [],
  byRegistrantId: new Map(),
  byHostId: new Map(),
  total: 0,
  actionableCount: 0,
};

/**
 * Colisiones acompañante ↔ registrante activo (eventos Bautizos).
 *
 * @param {Object} deps
 * @param {Array} deps.allParticipants
 * @param {{ id: string, eventType?: string }|null} deps.currentEvent
 * @param {(raw: string) => string} [deps.canonicalizeVnpPersonId]
 * @param {boolean} deps.hasAdminRights
 * @param {string|undefined} deps.currentUserRole
 * @param {(loc: string) => boolean} deps.hasLocationAccess
 * @param {(title: string, detail: string, user: string|null, event: object|null, meta?: object) => void} deps.addLog
 * @param {(participantId: string, kind: string, detail: string) => void} deps.logParticipantActivity
 * @param {(msg: string) => void} deps.showToast
 */
export function useCompanionCollisions({
  allParticipants,
  currentEvent,
  canonicalizeVnpPersonId = (v) => String(v || '').trim(),
  hasAdminRights,
  currentUserRole,
  hasLocationAccess,
  addLog,
  logParticipantActivity,
  showToast,
}) {
  const companionCollisionsInEvent = useMemo(() => {
    if (!currentEvent || currentEvent.eventType !== 'Bautizos') {
      return EMPTY_COLLISION_INDEX;
    }
    return buildCompanionRegistrantCollisionIndex(allParticipants, currentEvent.id, {
      canonicalizeVnpPersonId,
      minConfidence: 'possible',
    });
  }, [allParticipants, currentEvent, canonicalizeVnpPersonId]);

  const performLinkCompanionCollision = useCallback(
    async (cluster) => {
      if (!cluster?.companionSide?.hostId || !cluster?.registrantSide?.participantId) {
        showToast('Colisión inválida.');
        return false;
      }
      if (!hasAdminRights || currentUserRole === 'Lector') {
        showToast('Solo administradores pueden vincular acompañantes.');
        return false;
      }
      const hostId = String(cluster.companionSide.hostId);
      const regId = String(cluster.registrantSide.participantId);
      const host = allParticipants.find((p) => String(p.id) === hostId && p.eventId === currentEvent?.id);
      const registrant = allParticipants.find((p) => String(p.id) === regId && p.eventId === currentEvent?.id);
      if (!host || !registrant) {
        showToast('No se encontraron los registros.');
        return false;
      }
      const loc = String(host.location || '').trim();
      if (loc && !hasLocationAccess(loc)) {
        showToast('No tienes permiso en la sede del titular.');
        return false;
      }
      const companionId = String(cluster.companionSide.companionId || '').trim();
      const nextCompanions = applyCompanionLinkToHostCompanions(host.bautizosCompanions, companionId, registrant);
      try {
        await updateDoc(getDocRef('app_participants', hostId), {
          bautizosCompanions: nextCompanions,
        });
        const detail = truncateActivityLogDetails(
          `Vinculó acompañante «${cluster.companionSide.displayName || '—'}» del titular ${host.name || '—'} (${loc || '?'}) al registro activo ${registrant.name || '—'} (${registrant.location || '?'}). Motivo: ${describeCollisionReasons(cluster.reasons)}.`
        );
        addLog('Actualización de Registro', detail, null, currentEvent, {
          collectionName: 'app_participants',
          docId: hostId,
          action: 'update',
          previousData: host,
        });
        logParticipantActivity(hostId, 'actualizacion', detail);
        showToast('Acompañante vinculado al registro activo.');
        return true;
      } catch (e) {
        console.error(e);
        showToast('No se pudo vincular el acompañante.');
        return false;
      }
    },
    [
      allParticipants,
      currentEvent,
      hasAdminRights,
      currentUserRole,
      hasLocationAccess,
      addLog,
      logParticipantActivity,
      showToast,
    ]
  );

  const performAckCompanionCollision = useCallback(
    async (cluster) => {
      if (!cluster?.ackKey) {
        showToast('Colisión inválida.');
        return;
      }
      if (!hasAdminRights || currentUserRole === 'Lector') {
        showToast('Solo administradores pueden reconocer colisiones.');
        return;
      }
      const hostId = String(cluster.companionSide?.hostId || '');
      const regId = String(cluster.registrantSide?.participantId || '');
      const ackKey = String(cluster.ackKey);
      const ids = [hostId, regId].filter(Boolean);
      const batch = writeBatch(db);
      let n = 0;
      for (const pid of ids) {
        const fresh = allParticipants.find((p) => String(p.id) === pid && p.eventId === currentEvent?.id);
        if (!fresh) continue;
        batch.update(getDocRef('app_participants', pid), {
          duplicateAlertAcknowledgedKeys: arrayUnion(ackKey),
        });
        n += 1;
      }
      if (!n) {
        showToast('No se encontraron registros.');
        return;
      }
      try {
        await batch.commit();
        const detail = truncateActivityLogDetails(
          `Reconoció colisión acompañante↔activo: ${describeCollisionCluster(cluster)}.`
        );
        addLog('Configuración', detail, null, currentEvent);
        showToast('Colisión marcada como reconocida.');
      } catch (e) {
        console.error(e);
        showToast('No se pudo guardar.');
      }
    },
    [allParticipants, currentEvent, hasAdminRights, currentUserRole, addLog, showToast]
  );

  return {
    companionCollisionsInEvent,
    performLinkCompanionCollision,
    performAckCompanionCollision,
  };
}
