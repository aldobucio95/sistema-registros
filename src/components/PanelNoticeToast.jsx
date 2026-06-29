import React from 'react';
import { Bug, LogIn, LogOut } from 'lucide-react';
import { uiFeedback } from '../ui/uiFormatClasses.js';

/**
 * Aviso global (modo depuración o actividad de sesión), mismo estilo que el toast de depuración.
 * `type`: `active` | `inactive` (depuración), `session-login` | `session-logout`.
 */
export default function PanelNoticeToast({ notice }) {
  if (!notice?.msg) return null;
  const t = notice.type;
  if (t === 'session-login') {
    return (
      <div className={`${uiFeedback.toastLeft} border-l-4 border-indigo-500`}>
        <LogIn className="text-indigo-500 flex-shrink-0 mt-0.5" size={20} aria-hidden />
        <p className="text-xs font-bold leading-relaxed">{notice.msg}</p>
      </div>
    );
  }
  if (t === 'session-logout') {
    return (
      <div className={`${uiFeedback.toastLeft} border-l-4 border-slate-500 dark:border-slate-400`}>
        <LogOut className="text-slate-600 dark:text-slate-300 flex-shrink-0 mt-0.5" size={20} aria-hidden />
        <p className="text-xs font-bold leading-relaxed">{notice.msg}</p>
      </div>
    );
  }
  return (
    <div className={`${uiFeedback.toastLeft} border-l-4 border-orange-500`}>
      <Bug className="text-orange-500 flex-shrink-0 mt-0.5" size={20} aria-hidden />
      <p className="text-xs font-bold leading-relaxed">{notice.msg}</p>
    </div>
  );
}
