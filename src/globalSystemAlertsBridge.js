/**
 * Puente imperativo → host React (`GlobalSystemAlertsHost` en main.jsx).
 * No importar React aquí.
 */

/** @typedef {{ text: string, tone?: 'danger'|'ok'|'warn', ms?: number }} SystemAlertPayload */

/** @type {null | ((p: SystemAlertPayload) => void)} */
let sink = null;

/** Lo registra solo el host montado en la raíz. */
export function registerGlobalSystemAlertSink(fn) {
  sink = typeof fn === 'function' ? fn : null;
}

/**
 * @param {string} text
 * @param {{ tone?: 'danger'|'ok'|'warn', ms?: number }} [opts]
 * ms: duración; si es 0, el host usa un default corto.
 */
export function emitGlobalSystemAlert(text, opts = {}) {
  const t = String(text || '').trim();
  if (!t || !sink) return;
  sink({
    text: t,
    tone: opts.tone || 'danger',
    ms: typeof opts.ms === 'number' ? opts.ms : undefined,
  });
}
