/** Preferencia de entrada de fecha de nacimiento en el panel (por usuario de la app, persistente). */

import { useEffect, useState } from 'react';

export const REGISTRY_BIRTHDATE_MODE_NATIVE = 'native';
export const REGISTRY_BIRTHDATE_MODE_DROPDOWN = 'dropdown';
export const REGISTRY_BIRTHDATE_MODE_EVENT = 'vnpm-registry-birthdate-mode-change';

export function registryBirthDateModeStorageKey(userId) {
  return userId ? `vnpm-registry-birthdate-mode:${String(userId)}` : '';
}

export function readRegistryBirthDateMode(userId) {
  if (!userId || typeof window === 'undefined') return REGISTRY_BIRTHDATE_MODE_NATIVE;
  try {
    const v = localStorage.getItem(registryBirthDateModeStorageKey(userId));
    return v === REGISTRY_BIRTHDATE_MODE_DROPDOWN ? REGISTRY_BIRTHDATE_MODE_DROPDOWN : REGISTRY_BIRTHDATE_MODE_NATIVE;
  } catch {
    return REGISTRY_BIRTHDATE_MODE_NATIVE;
  }
}

export function writeRegistryBirthDateMode(userId, mode) {
  if (!userId || typeof window === 'undefined') return;
  try {
    const m =
      mode === REGISTRY_BIRTHDATE_MODE_DROPDOWN ? REGISTRY_BIRTHDATE_MODE_DROPDOWN : REGISTRY_BIRTHDATE_MODE_NATIVE;
    localStorage.setItem(registryBirthDateModeStorageKey(userId), m);
    window.dispatchEvent(
      new CustomEvent(REGISTRY_BIRTHDATE_MODE_EVENT, { detail: { userId: String(userId), mode: m } })
    );
  } catch {
    /* ignore */
  }
}

/** Sincroniza el modo día/mes/año vs calendario entre titular y acompañantes en el mismo formulario. */
export function useRegistryBirthDateMode(userId) {
  const [mode, setMode] = useState(() => readRegistryBirthDateMode(userId));

  useEffect(() => {
    setMode(readRegistryBirthDateMode(userId));
  }, [userId]);

  useEffect(() => {
    if (!userId || typeof window === 'undefined') return undefined;
    const uid = String(userId);
    const handler = (e) => {
      if (String(e?.detail?.userId || '') === uid) {
        setMode(
          e.detail.mode === REGISTRY_BIRTHDATE_MODE_DROPDOWN
            ? REGISTRY_BIRTHDATE_MODE_DROPDOWN
            : REGISTRY_BIRTHDATE_MODE_NATIVE
        );
      }
    };
    window.addEventListener(REGISTRY_BIRTHDATE_MODE_EVENT, handler);
    return () => window.removeEventListener(REGISTRY_BIRTHDATE_MODE_EVENT, handler);
  }, [userId]);

  return mode;
}
