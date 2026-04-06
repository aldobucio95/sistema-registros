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

/** Dominio del correo sintético usuario@dominio (Email/Password). Sustituir con VITE_AUTH_EMAIL_DOMAIN si hace falta. */
export const AUTH_EMAIL_DOMAIN = import.meta.env.VITE_AUTH_EMAIL_DOMAIN || 'vnpm-registros.com';

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
