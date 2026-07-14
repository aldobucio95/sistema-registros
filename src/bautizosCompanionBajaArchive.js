/** v2 stub: Bautizos party cancel/archive removed with Bautizos event type. */
export function getBautizosPartyCancelTargetMeta() {
  return null;
}

export function planBautizosPartyCancelArchive() {
  return { ok: false, reason: 'Bautizos unsupported in v2' };
}

export function applyBautizosPartyCancelArchive() {
  return { ok: false };
}
