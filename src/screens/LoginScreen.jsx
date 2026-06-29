import React from 'react';
import { UserCircle, Lock, Eye, EyeOff } from 'lucide-react';
import AppVersionBadge from '../AppVersionBadge.jsx';
import PanelNoticeToast from '../components/PanelNoticeToast.jsx';
import { uiButtons, uiForm } from '../ui/uiFormatClasses.js';
import { buildPrivacyNoticePublicUrl } from '../privacyNotice.js';

/* Logo multicolor de Google (oficial aproximado para botón «Continuar con Google») */
function GoogleMark({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

const labelClasses = `${uiForm.labelXs} px-1 block mb-1.5`;

/**
 * Pantalla de inicio de sesión (chunk lazy).
 * Estado y handlers viven en App.jsx.
 */
export default function LoginScreen({
  debugToast,
  loginForm,
  setLoginForm,
  handleLogin,
  handleGoogleLogin,
  loginBusy,
  googleLoginBusy,
  loginError,
  showLoginPassword,
  setShowLoginPassword,
}) {
  return (
    <div className="login-screen-island min-h-screen bg-blue-950 flex items-center justify-center p-4 relative [color-scheme:light] text-slate-900">
      {debugToast && <PanelNoticeToast notice={debugToast} />}
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-md w-full animate-in fade-in zoom-in duration-500 border border-slate-200/80">
        <div className="bg-blue-900 p-8 text-center border-b border-blue-800/50">
          <div className="mx-auto mb-5 w-full max-w-[min(100%,280px)] rounded-2xl bg-white p-4 shadow-lg">
            <img
              src="/favicon.png"
              alt="Vida Nueva Para el Mundo"
              className="w-full h-auto max-h-[5.5rem] sm:max-h-24 object-contain object-center mx-auto"
              width={400}
              height={245}
              decoding="async"
            />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight leading-tight">Registros VNPM</h1>
          <p className="text-blue-200 text-xs uppercase tracking-widest mt-2 font-bold">Sistema de Gestión</p>
        </div>
        <div className="p-8">
          <h2 className="text-lg font-black text-slate-800 text-center mb-6">Iniciar sesión</h2>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className={labelClasses}>Usuario o correo</label>
              <div className="relative mt-1">
                <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  className={`${uiForm.input} pl-10 pr-4 py-3 text-sm focus:ring-blue-600 transition-all`}
                  placeholder="Usuario o correo"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className={labelClasses} htmlFor="login-password">
                Contraseña
              </label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  id="login-password"
                  name="password"
                  type={showLoginPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  className={`${uiForm.input} pl-10 pr-12 py-3 text-sm focus:ring-blue-600 transition-all`}
                  placeholder="Mínimo 8 caracteres"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  title={showLoginPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-label={showLoginPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {loginError && (
              <p className="text-xs text-red-500 font-bold animate-in slide-in-from-top-1 text-left whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto">
                {loginError}
              </p>
            )}
            <button
              type="submit"
              disabled={loginBusy || googleLoginBusy}
              className={`${uiButtons.primary} w-full bg-blue-800 hover:bg-blue-900 disabled:bg-slate-400 py-3 px-4 transition-all shadow-lg shadow-blue-900/20 active:scale-95 flex justify-center items-center gap-2`}
            >
              {loginBusy ? <span className="animate-pulse">Iniciando sesión…</span> : 'Iniciar sesión'}
            </button>
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest">
                <span className="bg-white px-3 text-slate-400">o</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loginBusy || googleLoginBusy}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 font-bold text-sm hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <GoogleMark className="flex-shrink-0" />
              {googleLoginBusy ? <span className="animate-pulse">Conectando con Google…</span> : 'Continuar con Google'}
            </button>
            <p className="text-[10px] text-slate-500 text-center leading-relaxed">
              Si tu acceso es con Gmail, puedes entrar con <strong className="text-slate-600">correo y contraseña</strong> (las que definió el administrador) o con{' '}
              <strong className="text-slate-600">Continuar con Google</strong>. La primera vez que uses Google puede pedirte también la contraseña del sistema para vincular la cuenta.
            </p>
          </form>
        </div>
        <div className="px-8 pb-5 -mt-1 flex flex-col items-center gap-2">
          <AppVersionBadge variant="login-inline" />
          <p className="text-[10px] text-slate-400 text-center leading-snug max-w-xs">
            El personal autorizado trata datos personales en nombre del responsable del evento.{' '}
            <a href={buildPrivacyNoticePublicUrl(typeof window !== 'undefined' ? window.location.origin : '')} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold underline">
              Aviso de privacidad
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
