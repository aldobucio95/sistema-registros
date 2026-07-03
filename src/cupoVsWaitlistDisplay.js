/**
 * Etiquetas y estado para la tabla «Cupo vs Espera por Sede» del modal de cupo.
 * Separa el límite configurado del remanente disponible (evita mostrar «Ilimitado» cuando el cupo global está lleno).
 */

export function resolveCupoLimitMode(eventTotalCap) {
  const globalCap = Math.max(0, Number(eventTotalCap) || 0);
  return globalCap > 0 ? 'global' : 'perSede';
}

/**
 * @returns {{ limit: number | null, scope: 'global' | 'sede' | 'unlimited', label: string, detail: string | null }}
 */
export function resolveConfiguredCapLimit({ eventTotalCap, locationCap }) {
  const globalCap = Math.max(0, Number(eventTotalCap) || 0);
  if (globalCap > 0) {
    return {
      limit: globalCap,
      scope: 'global',
      label: String(globalCap),
      detail: 'Compartido entre sedes',
    };
  }
  const sedeCap = Math.max(0, Number(locationCap) || 0);
  if (sedeCap > 0) {
    return {
      limit: sedeCap,
      scope: 'sede',
      label: String(sedeCap),
      detail: null,
    };
  }
  return {
    limit: null,
    scope: 'unlimited',
    label: 'Ilimitado',
    detail: null,
  };
}

/**
 * @returns {number | null} null = sin tope (ilimitado)
 */
export function computeCapRemaining({
  eventTotalCap,
  globalUsed,
  locationCap,
  activeAtSede,
}) {
  const mode = resolveCupoLimitMode(eventTotalCap);
  if (mode === 'global') {
    const globalCap = Math.max(0, Number(eventTotalCap) || 0);
    const used = Math.max(0, Number(globalUsed) || 0);
    return Math.max(0, globalCap - used);
  }
  const sedeCap = Math.max(0, Number(locationCap) || 0);
  if (sedeCap <= 0) return null;
  const active = Math.max(0, Number(activeAtSede) || 0);
  return Math.max(0, sedeCap - active);
}

/**
 * @returns {{ key: string, label: string, tone: 'full' | 'available' | 'waitlist' }}
 */
export function resolveSedeCapStatus({
  eventTotalCap,
  globalUsed,
  locationCap,
  activeAtSede,
  waitCount = 0,
}) {
  const globalCap = Math.max(0, Number(eventTotalCap) || 0);
  const used = Math.max(0, Number(globalUsed) || 0);
  const wait = Math.max(0, Number(waitCount) || 0);

  if (globalCap > 0 && used >= globalCap) {
    return {
      key: 'globalFull',
      label: wait > 0 ? 'Lleno (global) · espera' : 'Lleno (global)',
      tone: 'full',
    };
  }

  const sedeCap = Math.max(0, Number(locationCap) || 0);
  if (globalCap <= 0 && sedeCap > 0) {
    const active = Math.max(0, Number(activeAtSede) || 0);
    if (active >= sedeCap) {
      return {
        key: 'sedeFull',
        label: wait > 0 ? 'Lleno (sede) · espera' : 'Lleno (sede)',
        tone: 'full',
      };
    }
  }

  if (wait > 0) {
    return { key: 'hasWaitlist', label: 'Disponible · espera', tone: 'waitlist' };
  }

  return { key: 'available', label: 'Disponible', tone: 'available' };
}

export function formatCapRemainingDisplay(remaining) {
  if (remaining == null) return '—';
  return String(remaining);
}

/**
 * Texto compacto del chip de cupo en la vista de cada sede (misma lógica que el modal).
 */
export function buildSedeCapChipViewModel({
  eventTotalCap,
  globalUsed,
  locationCap,
  activeAtSede,
  waitCount = 0,
}) {
  const active = Math.max(0, Number(activeAtSede) || 0);
  const configured = resolveConfiguredCapLimit({ eventTotalCap, locationCap });
  const remaining = computeCapRemaining({
    eventTotalCap,
    globalUsed,
    locationCap,
    activeAtSede: active,
  });
  const status = resolveSedeCapStatus({
    eventTotalCap,
    globalUsed,
    locationCap,
    activeAtSede: active,
    waitCount,
  });
  const remainingLabel = formatCapRemainingDisplay(remaining);

  const text =
    configured.scope === 'unlimited'
      ? `Activos ${active} · Ilimitado`
      : `Activos ${active} · Límite ${configured.label} · Rem. ${remainingLabel}`;

  const title =
    configured.scope === 'global'
      ? `Unidades activas en esta sede: ${active}. Límite global del evento: ${configured.label}. Remanente compartido: ${remainingLabel}.`
      : configured.scope === 'sede'
        ? `Unidades activas en esta sede: ${active}. Límite de la sede: ${configured.label}. Remanente en sede: ${remainingLabel}.`
        : `Unidades activas en esta sede: ${active}. Sin tope de cupo configurado.`;

  return { text, title, status, configured, remaining, remainingLabel, active };
}
