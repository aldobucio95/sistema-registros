/**
 * Versiones de la app:
 * - Pública (todos): semver de `package.json` → v.1.0.8
 * - Interna (solo SuperUsuario dentro de la app): semver + buildSeq → v.1.0.8.3i
 * - `APP_VERSION` / Firestore: valor técnico completo (p. ej. 1.0.8.3) para seguimiento de clientes.
 */
import { getClientDeviceSnapshot } from './clientTelemetry.js';

const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};

export const APP_SEMVER = env.VITE_APP_VERSION ? String(env.VITE_APP_VERSION) : '0.0.0';

/** Contador de builds de producción (solo sube con `vite build`). */
export const APP_BUILD_SEQ = env.VITE_APP_BUILD_SEQ ? String(env.VITE_APP_BUILD_SEQ) : '0';

/**
 * Valor técnico guardado en Firestore (`lastClientAppVersion`); incluye el 4.º dígito de build interno.
 */
export const APP_VERSION = env.VITE_APP_DISPLAY_VERSION
  ? String(env.VITE_APP_DISPLAY_VERSION)
  : `${APP_SEMVER}-dev`;

export const APP_BUILD_ID =
  env.VITE_APP_BUILD_ID ? String(env.VITE_APP_BUILD_ID) : 'dev';

/** Primera versión que guarda `lastClientAppVersion` en Firestore al iniciar sesión. */
export const APP_VERSION_TRACKING_INTRODUCED_IN = '1.0.0';

/** Etiqueta pública: solo los 3 dígitos de `package.json` (login y usuarios no SuperUsuario). */
export function getAppPublicVersionLabel() {
  return `v.${APP_SEMVER}`;
}

/** Etiqueta interna: 4.º dígito de build + sufijo «i» (solo SuperUsuario dentro de la app). */
export function getAppInternalVersionLabel() {
  if (APP_VERSION.endsWith('-dev')) {
    return `v.${APP_SEMVER}.devi`;
  }
  const seq = String(APP_BUILD_SEQ || '0').trim();
  if (seq && seq !== '0') {
    return `v.${APP_SEMVER}.${seq}i`;
  }
  return getAppPublicVersionLabel();
}

/** @deprecated Usar getAppPublicVersionLabel o getAppInternalVersionLabel según el contexto. */
export function getAppVersionLabel() {
  return getAppPublicVersionLabel();
}

/** Tooltip con id de bundle; en vista interna incluye la versión de build. */
export function getAppVersionFullLabel({ internal = false } = {}) {
  const short = APP_BUILD_ID.length > 14 ? `${APP_BUILD_ID.slice(0, 10)}…` : APP_BUILD_ID;
  const versionLabel = internal ? getAppInternalVersionLabel() : getAppPublicVersionLabel();
  return `${versionLabel} · ${short}`;
}

/** Formatea `lastClientAppVersion` almacenado para la columna de SuperUsuario. */
export function formatStoredClientVersionForSuperUser(storedVersion) {
  const raw = String(storedVersion || '').trim().replace(/^v\.?/i, '');
  if (!raw) return 'v.?.?.?';
  const devMatch = raw.match(/^(\d+\.\d+\.\d+)-dev$/);
  if (devMatch) return `v.${devMatch[1]}.devi`;
  const parts = raw.split('.');
  if (parts.length >= 4 && /^\d+$/.test(parts[3])) {
    return `v.${parts[0]}.${parts[1]}.${parts[2]}.${parts[3]}i`;
  }
  if (parts.length >= 3) {
    return `v.${parts[0]}.${parts[1]}.${parts[2]}`;
  }
  return `v.${raw}`;
}

/** Campos a escribir en `app_users` cuando el cliente confirma qué bundle ejecuta. */
export function buildClientVersionPatch() {
  return {
    lastClientAppVersion: APP_VERSION,
    lastClientAppBuildId: APP_BUILD_ID,
    lastClientAppVersionSeenAt: new Date().toISOString(),
    ...getClientDeviceSnapshot(),
  };
}

export function hasRecordedClientAppVersion(userDoc) {
  const v = userDoc?.lastClientAppVersion;
  return v != null && String(v).trim() !== '';
}
