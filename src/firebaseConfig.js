import { initializeApp } from 'firebase/app';

/**
 * Debe coincidir con el proyecto en Firebase Console, .firebaserc y GitHub Actions (projectId).
 */
const firebaseConfig = {
  apiKey: 'AIzaSyBgBijbYRZ-w1yC1dbR0fmYVcuTmF-Ih4k',
  authDomain: 'registros-vnpm.firebaseapp.com',
  projectId: 'registros-vnpm',
  storageBucket: 'registros-vnpm.firebasestorage.app',
  messagingSenderId: '298121019886',
  appId: '1:298121019886:web:8a5de09ce384c8a2690eff',
  measurementId: 'G-Z65XRSJHHJ',
};

export const app = initializeApp(firebaseConfig);
/** Instancia secundaria para crear usuarios Auth sin cerrar la sesión del administrador. */
export const secondaryApp = initializeApp(firebaseConfig, 'Secondary');
/** Instancia aislada para enlaces públicos (QR / responsiva) sin tocar la sesión del panel. */
export const publicApp = initializeApp(firebaseConfig, 'PublicLinks');

/** Dominio del correo sintético usuario@dominio (Email/Password). Sustituir con VITE_AUTH_EMAIL_DOMAIN si hace falta. */
export const AUTH_EMAIL_DOMAIN = import.meta.env.VITE_AUTH_EMAIL_DOMAIN || 'registros-vnpm.com';

/**
 * Cuentas internas del sistema (dominio reservado para accesos administrados).
 * Por defecto coincide con el dominio que menciona el proyecto; ajusta con VITE_INTERNAL_AUTH_EMAIL_DOMAIN.
 */
export const INTERNAL_AUTH_EMAIL_DOMAIN =
  import.meta.env.VITE_INTERNAL_AUTH_EMAIL_DOMAIN || 'registros-vnpm.com';

/** URL pública del panel (para enlaces en correos y textos). Ej.: https://tudominio.web.app */
export const APP_PUBLIC_URL = (
  import.meta.env.VITE_APP_PUBLIC_URL ||
  (typeof window !== 'undefined' ? window.location.origin : '') ||
  ''
).replace(/\/$/, '');

/** Normalización para comparar correos de acceso (Firebase Auth). */
export function normalizeAuthEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

const LEGACY_INTERNAL_DOMAINS = new Set([
  'registro-vnpm.com',
  'vnpm-registros.com',
]);

export function isInternalAuthEmail(email) {
  const e = normalizeAuthEmail(email);
  const at = e.lastIndexOf('@');
  if (at < 0) return false;
  const domain = e.slice(at + 1);
  const internal = INTERNAL_AUTH_EMAIL_DOMAIN.toLowerCase();
  const synthetic = AUTH_EMAIL_DOMAIN.toLowerCase();
  return domain === internal || domain === synthetic || LEGACY_INTERNAL_DOMAINS.has(domain);
}

/** Gmail / Googlemail: mismo correo sirve para «Continuar con Google». */
export function isGmailAuthEmail(email) {
  const e = normalizeAuthEmail(email);
  const at = e.lastIndexOf('@');
  if (at < 0) return false;
  const domain = e.slice(at + 1);
  return domain === 'gmail.com' || domain === 'googlemail.com';
}

/** Misma normalización que el prefijo del correo sintético (minúsculas, caracteres no permitidos -> _). */
export function normalizeUsernameKey(username) {
  const safe = String(username || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '_');
  return safe || 'user';
}

export function usernameToAuthEmail(username) {
  return `${normalizeUsernameKey(username)}@${AUTH_EMAIL_DOMAIN}`;
}

/**
 * Para el formulario de login: si escriben un correo (p. ej. el de Firebase Authentication), se usa tal cual;
 * si no, el correo sintético usuario@dominio (misma regla que usernameToAuthEmail).
 */
export function loginIdentifierToAuthEmail(input) {
  const t = String(input || '').trim();
  if (!t) return '';
  if (t.includes('@')) return t.toLowerCase();
  return usernameToAuthEmail(t);
}

/** Variantes para buscar `username` en Firestore (mayúsculas / capitalización distinta al correo). */
export function buildUsernameCandidates(raw) {
  const t = String(raw || '').trim();
  if (!t) return [];
  const lc = t.toLowerCase();
  const uc = t.toUpperCase();
  const cap = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
  const key = normalizeUsernameKey(t);
  return [...new Set([t, lc, uc, cap, key])].filter(Boolean);
}
