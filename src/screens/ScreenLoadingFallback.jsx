import AppVersionBadge from '../AppVersionBadge.jsx';

/** Placeholder mientras carga un chunk lazy (login, hub, workspace). */
export default function ScreenLoadingFallback({ title = 'Cargando…' }) {
  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400 relative">
      <div
        className="h-9 w-9 border-2 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin"
        aria-hidden
      />
      <p className="text-sm font-bold">{title}</p>
      <AppVersionBadge />
    </div>
  );
}
