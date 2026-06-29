/**
 * Nombre legible del navegador para logs (instalación / sesión).
 * @returns {string}
 */
export function getInstallPromptBrowserNameEs() {
  if (typeof navigator === 'undefined') return 'el navegador';
  const ua = String(navigator.userAgent || '');
  if (/Edg\//i.test(ua)) return 'Microsoft Edge';
  if (/OPR\//i.test(ua) || /Opera/i.test(ua)) return 'Opera';
  if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return 'Google Chrome';
  if (/Firefox\//i.test(ua)) return 'Mozilla Firefox';
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua) && !/CriOS/i.test(ua)) return 'Safari';
  if (/CriOS/i.test(ua)) return 'Chrome (iOS)';
  return 'el navegador';
}

function chromiumInstalledAppLabelEs(displayModeRaw) {
  const ua = typeof navigator !== 'undefined' ? String(navigator.userAgent || '') : '';
  const modeNote = displayModeRaw === 'minimal-ui' ? ' · interfaz mínima' : '';
  if (/Edg\//i.test(ua)) {
    return `Instalada con «Instalar aplicación» en Microsoft Edge${modeNote}`;
  }
  if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) {
    return `Instalada con «Instalar aplicación» en Google Chrome${modeNote}`;
  }
  if (/OPR\//i.test(ua) || /Opera/i.test(ua)) {
    return `Instalada como aplicación en Opera${modeNote}`;
  }
  return `Instalada como aplicación en modo independiente (navegador)${modeNote}`;
}

/**
 * Sufijo para logs de inicio/cierre de sesión (mismo criterio que la telemetría del usuario).
 * @returns {string}
 */
export function getSessionLogClientSuffix() {
  const info = getClientRuntimeDisplayInfo();
  if (info.runtimeKind === 'web') {
    return ' Origen: versión web (pestaña del navegador).';
  }
  if (info.displayModeRaw === 'ios-standalone') {
    return ' Origen: app añadida a la pantalla de inicio (Safari en iOS / iPadOS).';
  }
  const ua = typeof navigator !== 'undefined' ? String(navigator.userAgent || '') : '';
  if (info.displayModeRaw === 'standalone' || info.displayModeRaw === 'minimal-ui') {
    if (/Edg\//i.test(ua)) {
      return ' Origen: app instalada con «Instalar aplicación» en Microsoft Edge.';
    }
    if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) {
      return ' Origen: app instalada con «Instalar aplicación» en Google Chrome.';
    }
    return ' Origen: app instalada en modo independiente (navegador).';
  }
  if (info.displayModeRaw === 'fullscreen') {
    return ' Origen: pantalla completa (puede ser app instalada o solo el navegador).';
  }
  return ' Origen: aplicación o modo independiente.';
}

/**
 * Web (pestaña) vs PWA / «añadir a inicio» / modo independiente.
 * @returns {{ runtimeKind: 'web'|'pwa', displayModeRaw: string, runtimeLabelEs: string }}
 */
export function getClientRuntimeDisplayInfo() {
  if (typeof window === 'undefined') {
    return { runtimeKind: 'web', displayModeRaw: 'ssr', runtimeLabelEs: '—' };
  }
  try {
    if (window.navigator?.standalone === true) {
      return {
        runtimeKind: 'pwa',
        displayModeRaw: 'ios-standalone',
        runtimeLabelEs: 'Añadida a la pantalla de inicio (Safari / iOS · no usa el diálogo de Chrome)',
      };
    }
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return {
        runtimeKind: 'pwa',
        displayModeRaw: 'standalone',
        runtimeLabelEs: chromiumInstalledAppLabelEs('standalone'),
      };
    }
    if (window.matchMedia('(display-mode: minimal-ui)').matches) {
      return {
        runtimeKind: 'pwa',
        displayModeRaw: 'minimal-ui',
        runtimeLabelEs: chromiumInstalledAppLabelEs('minimal-ui'),
      };
    }
    if (window.matchMedia('(display-mode: fullscreen)').matches) {
      return {
        runtimeKind: 'pwa',
        displayModeRaw: 'fullscreen',
        runtimeLabelEs: 'Pantalla completa (puede ser app instalada o el navegador)',
      };
    }
  } catch {
    /* ignore */
  }
  return {
    runtimeKind: 'web',
    displayModeRaw: 'browser',
    runtimeLabelEs: 'Versión web (pestaña del navegador)',
  };
}

/** @returns {boolean} */
export function isClientPwaRuntime() {
  return getClientRuntimeDisplayInfo().runtimeKind === 'pwa';
}

/**
 * Datos del navegador para auditoría (SuperUsuario los ve en la tabla de usuarios).
 * No usa identificadores persistentes del dispositivo; solo viewport y UA acotado.
 */
export function getClientDeviceSnapshot() {
  if (typeof window === 'undefined') {
    return {};
  }
  const rt = getClientRuntimeDisplayInfo();
  const iw = Math.round(Number(window.innerWidth) || 0);
  const ih = Math.round(Number(window.innerHeight) || 0);
  let narrow = false;
  try {
    narrow = window.matchMedia('(max-width: 768px)').matches;
  } catch {
    narrow = iw <= 768;
  }
  let coarsePointer = false;
  try {
    coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  } catch {
    coarsePointer = false;
  }
  let uaFull = '';
  let uaShort = '';
  try {
    const ua = typeof navigator !== 'undefined' ? String(navigator.userAgent || '') : '';
    uaFull = ua.length > 8000 ? `${ua.slice(0, 7997)}…` : ua;
    uaShort = ua.length > 180 ? `${ua.slice(0, 177)}…` : ua;
  } catch {
    uaFull = '';
    uaShort = '';
  }
  const uiProfile = narrow ? 'móvil' : 'escritorio';
  return {
    lastClientInnerWidth: iw,
    lastClientInnerHeight: ih,
    lastClientUiProfile: uiProfile,
    lastClientCoarsePointer: coarsePointer,
    /** Cadena completa del User-Agent (acotada) para auditoría SuperUsuario. */
    lastClientUserAgent: uaFull,
    lastClientUserAgentShort: uaShort,
    lastClientDeviceSeenAt: new Date().toISOString(),
    /** `web` = pestaña; `pwa` = instalada o modo independiente. */
    lastClientRuntimeKind: rt.runtimeKind,
    lastClientRuntimeLabelEs: rt.runtimeLabelEs,
    lastClientDisplayModeRaw: rt.displayModeRaw,
  };
}
