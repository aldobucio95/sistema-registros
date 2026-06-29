/**
 * Tras cada `firebase deploy --only hosting`, los clientes deben cargar el bundle nuevo.
 * `version.json` en el origen lleva `buildId` único por build.
 *
 * Único mecanismo de recarga por nueva versión de Hosting (evitar duplicar con Workbox
 * `autoUpdate` ni con Firestore `clientReloadNonce`): si el cliente ve un `buildId`
 * distinto al compilado en esta sesión, recarga de inmediato con pestaña visible; si la
 * pestaña está oculta, marca recarga pendiente y aplica al volver a `visible`.
 *
 * Los errores de chunk/import rotos tras un deploy siguen forzando recarga en seguida.
 *
 * Importante: Workbox precachea `index.html` y JS; un `reload()` normal puede seguir sirviendo
 * el shell viejo desde la caché del SW. Por eso la recarga efectiva va con limpieza de
 * `caches` + `unregister()` del service worker (luego `main.jsx` registra el SW nuevo).
 */
const LOCAL_BUILD_ID = import.meta.env.VITE_APP_BUILD_ID || '';

/** Cada cuánto preguntar por un deploy nuevo (solo con pestaña visible). */
const POLL_MS = 30_000;

/** Tras volver a la app, segunda comprobación (CDN / red móvil a veces van tarde). */
const RECHECK_AFTER_VISIBLE_MS = 2_000;

function versionJsonUrl() {
  const base = import.meta.env.BASE_URL || '/';
  const normalized = base.endsWith('/') ? base : `${base}/`;
  return new URL('version.json', window.location.origin + normalized).href;
}

function fetchSignal() {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(12_000);
  }
  return undefined;
}

/** Lee el manifiesto del último deploy en Hosting (sin caché HTTP agresiva en móvil). */
async function fetchRemoteManifest() {
  const url = `${versionJsonUrl()}?t=${Date.now()}&r=${Math.random().toString(36).slice(2)}`;
  const res = await fetch(url, {
    cache: 'no-store',
    signal: fetchSignal(),
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  if (!data || typeof data !== 'object') return null;
  const buildId =
    (typeof data.buildId === 'string' && data.buildId.trim()) ||
    (typeof data.version === 'string' && data.version.trim()) ||
    '';
  return buildId ? { buildId } : null;
}

function needsReload(remote) {
  return !!(remote && LOCAL_BUILD_ID && remote.buildId !== LOCAL_BUILD_ID);
}

let pendingDeployReload = false;
let reloadInProgress = false;

function triggerReloadForNewDeploy() {
  if (reloadInProgress) return;
  if (document.visibilityState === 'visible') {
    void hardReloadAfterDeploy();
    return;
  }
  pendingDeployReload = true;
}

function flushPendingReloadIfVisible() {
  if (!pendingDeployReload || document.visibilityState !== 'visible') return;
  void hardReloadAfterDeploy();
}

/**
 * Sin esto, el SW sigue respondiendo con el `index.html` y chunks antiguos del precache.
 */
async function hardReloadAfterDeploy() {
  if (reloadInProgress) return;
  reloadInProgress = true;
  pendingDeployReload = false;
  try {
    if (typeof caches !== 'undefined' && typeof caches.keys === 'function') {
      const keys = await caches.keys();
      await Promise.all(keys.map((name) => caches.delete(name)));
    }
    const reg = await navigator.serviceWorker?.getRegistration?.();
    if (reg) await reg.unregister();
  } catch {
    /* recargar igual: mejor intento parcial que quedar bloqueado */
  }
  window.location.reload();
}

let checking = false;

async function checkDeployAndMaybeReload() {
  if (!import.meta.env.PROD || !LOCAL_BUILD_ID) return;
  if (checking) return;
  checking = true;
  try {
    const remote = await fetchRemoteManifest();
    if (needsReload(remote)) {
      try {
        const reg = await navigator.serviceWorker?.getRegistration?.();
        await reg?.update?.();
      } catch {
        /* ignorar: el hard reload siguiente limpia estado */
      }
      triggerReloadForNewDeploy();
    }
  } catch {
    /* red / timeout / CORS: no bucle */
  } finally {
    checking = false;
  }
}

function startHostingVersionCheck() {
  if (!import.meta.env.PROD || !LOCAL_BUILD_ID) return;

  /** Chunk 404 tras un deploy nuevo: recuperar con recarga inmediata. */
  window.addEventListener(
    'error',
    (ev) => {
      const t = ev?.target;
      if (t?.tagName === 'SCRIPT' && typeof t.src === 'string' && t.src.includes('/assets/')) {
        void hardReloadAfterDeploy();
      }
    },
    true,
  );
  window.addEventListener('unhandledrejection', (ev) => {
    const msg = String(ev.reason?.message ?? ev.reason ?? '');
    if (
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Importing a module script failed')
    ) {
      ev.preventDefault();
      void hardReloadAfterDeploy();
    }
  });

  queueMicrotask(() => void checkDeployAndMaybeReload());

  /** Safari móvil (bfcache): al restaurar la página desde memoria. */
  window.addEventListener('pageshow', (ev) => {
    flushPendingReloadIfVisible();
    void checkDeployAndMaybeReload();
    if (ev.persisted) {
      window.setTimeout(() => {
        flushPendingReloadIfVisible();
        void checkDeployAndMaybeReload();
      }, RECHECK_AFTER_VISIBLE_MS);
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    flushPendingReloadIfVisible();
    void checkDeployAndMaybeReload();
    window.setTimeout(() => {
      flushPendingReloadIfVisible();
      void checkDeployAndMaybeReload();
    }, RECHECK_AFTER_VISIBLE_MS);
  });

  window.addEventListener('focus', () => {
    flushPendingReloadIfVisible();
    void checkDeployAndMaybeReload();
  });

  /** Al recuperar red (móvil cambia WiFi ↔ datos o sale de modo avión). */
  window.addEventListener('online', () => void checkDeployAndMaybeReload());

  window.setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    void checkDeployAndMaybeReload();
  }, POLL_MS);
}

startHostingVersionCheck();
