/** v2 stub: companion waitlist phantoms removed with Bautizos event type. */
export function isCompanionWaitlistPhantomStoredParticipant() {
  return false;
}

export function isCompanionWaitlistPending() {
  return false;
}

export function resolveCompanionWaitlistSource() {
  return null;
}

export function companionDisplayIsWaitlistPending() {
  return false;
}

export function stripCompanionWaitlistPhantomRows(rows) {
  return Array.isArray(rows) ? rows : [];
}

export function CompanionWaitlistBadge() {
  return null;
}
