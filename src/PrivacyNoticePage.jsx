import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { Shield } from 'lucide-react';
import { publicDb } from './firebaseRefs.js';
import {
  DEFAULT_PRIVACY_NOTICE_BODY,
  mergePrivacyNoticeConfig,
  PUBLIC_PRIVACY_DOC_COLLECTION,
  PUBLIC_PRIVACY_DOC_ID,
  resolvePrivacyNoticeBody,
} from './privacyNotice.js';

function renderMarkdownSimple(text) {
  const lines = String(text || '').split('\n');
  return lines.map((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      return (
        <h1 key={i} className="text-xl font-black text-slate-900 dark:text-slate-100 mt-6 mb-3 first:mt-0">
          {trimmed.slice(2)}
        </h1>
      );
    }
    if (trimmed.startsWith('## ')) {
      return (
        <h2 key={i} className="text-sm font-black uppercase tracking-wide text-indigo-800 dark:text-indigo-200 mt-5 mb-2">
          {trimmed.slice(3)}
        </h2>
      );
    }
    if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      return (
        <p key={i} className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-2">
          {trimmed.replace(/\*\*/g, '')}
        </p>
      );
    }
    if (!trimmed) return <div key={i} className="h-2" />;
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={i} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
        {parts.map((part, j) =>
          part.startsWith('**') && part.endsWith('**') ? (
            <strong key={j}>{part.slice(2, -2)}</strong>
          ) : (
            <span key={j}>{part}</span>
          )
        )}
      </p>
    );
  });
}

export default function PrivacyNoticePage() {
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(() => mergePrivacyNoticeConfig(null));
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ref = doc(publicDb, PUBLIC_PRIVACY_DOC_COLLECTION, PUBLIC_PRIVACY_DOC_ID);
        const snap = await getDoc(ref);
        if (cancelled) return;
        if (snap.exists()) {
          setNotice(mergePrivacyNoticeConfig(snap.data()));
        } else {
          setNotice(mergePrivacyNoticeConfig({ bodyMarkdown: DEFAULT_PRIVACY_NOTICE_BODY }));
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError('No se pudo cargar el aviso. Intente más tarde.');
          setNotice(mergePrivacyNoticeConfig({ bodyMarkdown: DEFAULT_PRIVACY_NOTICE_BODY }));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Shield className="text-indigo-600 shrink-0" size={28} />
          <div>
            <h1 className="text-lg font-black">Aviso de privacidad integral</h1>
            <p className="text-xs text-slate-500">
              LFPDPPP · Versión {notice.version || '1.0'}
              {notice.updatedAt ? ` · ${String(notice.updatedAt).slice(0, 10)}` : ''}
            </p>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
        {loading ? (
          <p className="text-sm text-slate-500 animate-pulse">Cargando aviso…</p>
        ) : (
          <>
            {error ? <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">{error}</p> : null}
            {(notice.responsibleName || notice.arcoEmail) && (
              <div className="mb-6 rounded-xl border border-indigo-100 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 p-4 text-sm">
                {notice.responsibleName ? (
                  <p>
                    <span className="font-bold">Responsable:</span> {notice.responsibleName}
                  </p>
                ) : null}
                {notice.responsibleAddress ? (
                  <p>
                    <span className="font-bold">Domicilio:</span> {notice.responsibleAddress}
                  </p>
                ) : null}
                {notice.arcoEmail ? (
                  <p>
                    <span className="font-bold">Correo ARCO:</span>{' '}
                    <a className="text-indigo-700 underline" href={`mailto:${notice.arcoEmail}`}>
                      {notice.arcoEmail}
                    </a>
                  </p>
                ) : null}
                {notice.arcoPhone ? (
                  <p>
                    <span className="font-bold">Teléfono:</span> {notice.arcoPhone}
                  </p>
                ) : null}
              </div>
            )}
            <article className="prose prose-sm max-w-none space-y-1">
              {renderMarkdownSimple(resolvePrivacyNoticeBody(notice))}
            </article>
            <p className="mt-8 text-[11px] text-slate-500 leading-snug border-t border-slate-200 dark:border-slate-800 pt-4">
              Datos médicos sin autorización de perfil permanente se eliminan automáticamente{' '}
              {notice.sensitiveRetentionDays || 90} días después del término del evento.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
