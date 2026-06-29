import { deleteField } from 'firebase/firestore';

/** Lee `onlineSince` desde datos planos de `app_users` (número o Timestamp). */
export function onlineSinceMsFromPlainData(data) {
  if (!data || typeof data !== 'object') return null;
  const v = data.onlineSince;
  if (v == null) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v.toMillis === 'function') return v.toMillis();
  return null;
}

/**
 * Al marcar usuario desconectado: quita `onlineSince`, guarda fin de sesión y duración si se conoce el inicio.
 * SuperUsuario puede ver `lastSessionDurationMs`, `lastSessionEndedAt`, `lastAccessAt` en el panel.
 */
export function buildUserOfflineSessionPatch(prevData, endedAtMs = Date.now()) {
  const started = onlineSinceMsFromPlainData(prevData);
  const patch = {
    isOnline: false,
    onlineSince: deleteField(),
    lastSessionEndedAt: endedAtMs,
    lastAccessAt: new Date(endedAtMs).toISOString(),
  };
  if (started != null && endedAtMs > started) {
    patch.lastSessionDurationMs = endedAtMs - started;
  }
  return patch;
}
