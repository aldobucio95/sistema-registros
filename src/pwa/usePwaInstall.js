import { useCallback, useEffect, useState } from 'react';

function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false;
  try {
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
    if (window.navigator.standalone === true) return true;
  } catch {
    /* ignore */
  }
  return false;
}

function detectIos() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const iPadOS13 = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return iOS || iPadOS13;
}

/**
 * Instalación PWA: `beforeinstallprompt` (Chromium, Android), instrucciones para Safari iOS.
 */
export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(() => isStandaloneDisplay());
  const [isIos] = useState(() => detectIos());

  useEffect(() => {
    const syncInstalled = () => setIsInstalled(isStandaloneDisplay());
    syncInstalled();
    const onVis = () => syncInstalled();
    document.addEventListener('visibilitychange', onVis);

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return { outcome: 'unavailable' };
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === 'accepted') setIsInstalled(true);
    return { outcome };
  }, [deferredPrompt]);

  const canUseNativeInstallPrompt = Boolean(deferredPrompt) && !isInstalled;

  return {
    isInstalled,
    isIos,
    canUseNativeInstallPrompt,
    promptInstall,
  };
}
