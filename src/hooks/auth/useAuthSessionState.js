import { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  app,
  loginIdentifierToAuthEmail,
  AUTH_EMAIL_DOMAIN,
  normalizeAuthEmail,
} from '../../firebaseConfig.js';
import { auth } from '../../firebaseRefs.js';

/* global __initial_auth_token */

/**
 * Firebase Auth user + login form UI state (Phase C extraction from App.jsx).
 */
export function useAuthSessionState() {
  const [fbUser, setFbUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);
  const [googleLoginBusy, setGoogleLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState('');
  const loginInProgressRef = useRef(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        }
      } catch (error) {
        console.error('Error authenticating to Firebase:', error);
      }
    };
    void initAuth();
    const unsubscribe = onAuthStateChanged(auth, setFbUser);
    return () => unsubscribe();
  }, []);

  return {
    fbUser,
    setFbUser,
    loginForm,
    setLoginForm,
    showLoginPassword,
    setShowLoginPassword,
    loginBusy,
    setLoginBusy,
    googleLoginBusy,
    setGoogleLoginBusy,
    loginError,
    setLoginError,
    loginInProgressRef,
  };
}

/**
 * Resuelve correo Firebase Auth a partir del identificador del formulario de login.
 * @returns {{ email: string, error: string|null }}
 */
export async function resolveStaffLoginEmail(trimUser) {
  let email = loginIdentifierToAuthEmail(trimUser);
  if (!email) {
    return { email: '', error: 'Ingresa tu usuario o correo.' };
  }
  if (!trimUser.includes('@')) {
    try {
      const functions = getFunctions(app, 'us-central1');
      const resolveLoginAuthEmail = httpsCallable(functions, 'resolveLoginAuthEmail');
      const res = await resolveLoginAuthEmail({ username: trimUser });
      const resolved = res?.data?.authEmail;
      if (resolved && String(resolved).includes('@')) {
        email = normalizeAuthEmail(resolved);
      }
    } catch (err) {
      console.warn(err);
    }
  }
  return { email, error: null };
}

/**
 * Mensaje de error legible para fallos de signInWithEmailAndPassword.
 */
export function mapStaffLoginFirebaseError(err, email) {
  const c = err?.code;
  if (c === 'auth/invalid-credential' || c === 'auth/wrong-password' || c === 'auth/user-not-found') {
    return (
      `Usuario o contraseña incorrectos.\n\n` +
      `Intentaste con:\n${email}\n\n` +
      `Si escribes solo el nombre (sin @), el correo se forma como nombre@${AUTH_EMAIL_DOMAIN}. ` +
      `Si tu cuenta usa otro correo, escríbelo completo en el primer campo.`
    );
  }
  if (c === 'auth/invalid-email') {
    return 'El correo no es válido. Usa el formato usuario@dominio o tu correo completo.';
  }
  if (c === 'auth/too-many-requests') {
    return 'Demasiados intentos. Espera unos minutos e intenta de nuevo.';
  }
  return 'No se pudo iniciar sesión. Revisa la conexión e intenta de nuevo.';
}
