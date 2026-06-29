import './hostingVersionCheck.js';
import { registerSW } from 'virtual:pwa-register';
import React, { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useParams, useSearchParams } from 'react-router-dom';
import './index.css';
import PublicRegistrationPage from './PublicRegistrationPage.jsx';
import ResponsivaSignPage from './ResponsivaSignPage.jsx';
import PrivacyNoticePage from './PrivacyNoticePage.jsx';
import GlobalSystemAlertsHost from './GlobalSystemAlertsHost.jsx';
import { installGlobalErrorHandlers, logError } from './errorLogger.js';
import { migrateLegacyLocalStorageCache } from './firestoreVersionCache.js';

const App = React.lazy(() => import('./App.jsx'));

function AppChunkFallback() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-3 bg-slate-50 text-slate-600">
      <div className="h-9 w-9 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" aria-hidden />
      <p className="text-sm font-bold tracking-wide">Cargando aplicación…</p>
    </div>
  );
}

/** Vite `base` (p. ej. subcarpeta en hosting); `undefined` en raíz `/`. */
const ROUTER_BASENAME = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || undefined;

registerSW({ immediate: true });

installGlobalErrorHandlers();
void migrateLegacyLocalStorageCache();

function PublicRegistrationRoute() {
  const { linkId } = useParams();
  return <PublicRegistrationPage linkId={linkId} />;
}

function ResponsivaSignRouteLabeled() {
  const { urlLabel, secret } = useParams();
  return <ResponsivaSignPage routeUrlLabel={urlLabel} routeSecret={secret} />;
}

function ResponsivaSignRouteLegacy() {
  const { token } = useParams();
  return <ResponsivaSignPage routeToken={token} />;
}

/** Compatibilidad: ?reg=abc → /registro-publico/abc */
function LegacyRegOrApp() {
  const [searchParams] = useSearchParams();
  const reg = searchParams.get('reg');
  if (reg) {
    return <Navigate to={`/registro-publico/${encodeURIComponent(reg)}`} replace />;
  }
  return (
    <Suspense fallback={<AppChunkFallback />}>
      <App />
    </Suspense>
  );
}

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }

  static getDerivedStateFromError(err) {
    return { err };
  }

  componentDidCatch(err, info) {
    console.error('Root error boundary:', err, info);
    void logError('RootErrorBoundary', err, {
      componentStack: String(info?.componentStack || '').slice(0, 4000),
    });
  }

  render() {
    if (this.state.err) {
      return (
        <div className="min-h-[100dvh] box-border bg-slate-100 px-4 py-8 flex items-center justify-center">
          <div className="max-w-lg w-full bg-white rounded-2xl shadow border border-red-200 p-6 text-center">
            <p className="text-slate-900 font-black text-lg mb-2">Algo salió mal</p>
            <p className="text-slate-600 text-sm mb-4">
              Recarga la página. Si abriste el registro público, prueba otro navegador o copia el enlace completo.
            </p>
            <pre className="text-left text-[11px] text-red-800 bg-red-50 rounded-lg p-3 overflow-auto max-h-40 whitespace-pre-wrap break-words">
              {String(this.state.err?.message || this.state.err)}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootErrorBoundary>
      <BrowserRouter basename={ROUTER_BASENAME}>
        <GlobalSystemAlertsHost />
        <Routes>
          <Route path="/registro-publico/:linkId" element={<PublicRegistrationRoute />} />
          <Route path="/aviso-privacidad" element={<PrivacyNoticePage />} />
          <Route path="/responsiva-firma/:urlLabel/:secret" element={<ResponsivaSignRouteLabeled />} />
          <Route path="/responsiva-firma/:token" element={<ResponsivaSignRouteLegacy />} />
          <Route path="*" element={<LegacyRegOrApp />} />
        </Routes>
      </BrowserRouter>
    </RootErrorBoundary>
  </StrictMode>
);
