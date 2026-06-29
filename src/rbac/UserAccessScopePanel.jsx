import React, { useEffect, useState } from 'react';
import { getDocFromCache, getDocFromServer } from 'firebase/firestore';
import { MapPin } from 'lucide-react';
import { getDocRef } from '../firebaseRefs.js';
import { normalizeRole } from './roles.js';
import UserTelemetryAuditSection from '../UserTelemetryAuditSection.jsx';
import UserScopeEventsContent from './UserScopeEventsContent.jsx';

/**
 * Detalle de eventos / sedes / menú. Al abrirse hace getDoc(app_users) para datos recientes (también SuperUsuario).
 */
export default function UserAccessScopePanel({
  open,
  userId,
  listUser,
  events,
  globalPanelNav,
  globalConfig = null,
  showFullFieldAudit = false,
  viewer = null,
}) {
  const [loading, setLoading] = useState(false);
  const [remote, setRemote] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !userId) {
      setRemote(null);
      setError(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setRemote(null);
      try {
        const ref = getDocRef('app_users', String(userId));
        let snap;
        try {
          snap = await getDocFromCache(ref);
        } catch {
          snap = await getDocFromServer(ref);
        }
        if (cancelled) return;
        if (snap.exists()) {
          setRemote({ id: snap.id, ...snap.data() });
        } else {
          setError('No se encontró el documento de usuario en el servidor.');
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setError('No se pudo cargar el perfil desde Firebase.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, userId]);

  if (!open) return null;

  const targetUser =
    remote != null ? { ...listUser, ...remote, id: userId } : { ...listUser, id: userId };

  if (loading) {
    return (
      <div className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 bg-slate-50/90 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 animate-pulse">
        Cargando alcance desde el servidor…
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-3 text-xs text-red-800 dark:text-red-100 bg-red-50/80 dark:bg-red-950 border-t border-red-100 dark:border-red-900">
        {error}
      </div>
    );
  }

  return (
    <div className="px-4 py-3 bg-slate-50/90 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 space-y-4">
      {!loading && !error && showFullFieldAudit ? (
        <UserTelemetryAuditSection
          user={targetUser}
          viewer={viewer}
          events={events}
          globalPanelNav={globalPanelNav}
          globalConfig={globalConfig}
        />
      ) : null}
      {!showFullFieldAudit ? (
        <div className="flex items-start gap-2">
          <MapPin size={14} className="text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" aria-hidden />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-300">Sedes y eventos</p>
            <UserScopeEventsContent user={targetUser} events={events} globalPanelNav={globalPanelNav} editorConfig={globalConfig} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
