import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { signInAnonymously, setPersistence, browserLocalPersistence, signOut } from 'firebase/auth';
import { publicAuth } from './firebaseRefs.js';
import {
  loadResponsivaSignSession,
  submitResponsivaDigitalSignature,
  resolveResponsivaDocIdFromRoute,
  formatPhoneNumber,
  isValidPhone,
} from './responsivaSignLogic.js';
import { deleteCurrentUserIfAnonymous } from './anonymousAuthCleanup.js';
import { uiButtons } from './ui/uiFormatClasses.js';
import { buildPrivacyNoticePublicUrl } from './privacyNotice.js';
import { formPublicInputClasses, formPublicLabelClasses } from './formFieldClasses.js';
import { buildWhatsAppMeUrl } from './whatsappUrl.js';
import { emitGlobalSystemAlert } from './globalSystemAlertsBridge.js';
import { shortFirebaseClientMessage } from './shortSystemMessages.js';

const publicShellClass =
  'min-h-[100dvh] box-border bg-slate-100 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]';
const inputClasses = formPublicInputClasses;
const labelClasses = formPublicLabelClasses;
const btnPrimary =
  `${uiButtons.primary} w-full min-h-[48px] py-3 px-4 text-base active:scale-[0.99]`;
const btnSecondary =
  `${uiButtons.secondary} w-full min-h-[48px] py-3 px-4 text-base active:scale-[0.99]`;

async function ensureAnonymousFirestoreAuth(authInstance) {
  try {
    await setPersistence(authInstance, browserLocalPersistence);
  } catch {
    /* */
  }
  const refreshOrClear = async () => {
    const u = authInstance.currentUser;
    if (!u) return;
    try {
      await u.getIdToken(true);
    } catch {
      await signOut(authInstance);
    }
  };
  await refreshOrClear();
  if (!authInstance.currentUser) {
    let lastErr;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await signInAnonymously(authInstance);
        lastErr = undefined;
        break;
      } catch (e) {
        lastErr = e;
        if (attempt < 2) await new Promise((r) => setTimeout(r, 450 * (attempt + 1)));
      }
    }
    if (!authInstance.currentUser && lastErr) throw lastErr;
  }
  if (typeof authInstance.authStateReady === 'function') {
    await authInstance.authStateReady();
  }
  if (authInstance.currentUser) {
    await authInstance.currentUser.getIdToken();
  }
}

/**
 * Puntero/táctil → coordenadas del buffer del canvas (el CSS suele escalar el elemento con w-full
 * y el tamaño lógico width/height no coincide con getBoundingClientRect).
 */
function getCanvasPointerMapping(canvas, e) {
  const r = canvas.getBoundingClientRect();
  const touch = e.touches?.[0] ?? e.changedTouches?.[0];
  const clientX = touch != null ? touch.clientX : e.clientX;
  const clientY = touch != null ? touch.clientY : e.clientY;
  const scaleX = canvas.width / Math.max(r.width, 1e-6);
  const scaleY = canvas.height / Math.max(r.height, 1e-6);
  const ok = Number.isFinite(clientX) && Number.isFinite(clientY);
  return {
    x: ok ? (clientX - r.left) * scaleX : 0,
    y: ok ? (clientY - r.top) * scaleY : 0,
    scaleX,
    scaleY,
  };
}

function compressSignatureCanvas(source) {
  const maxW = 560;
  const w = source.width;
  const h = source.height;
  const scale = w > maxW ? maxW / w : 1;
  const c2 = document.createElement('canvas');
  c2.width = Math.round(w * scale);
  c2.height = Math.round(h * scale);
  const ctx = c2.getContext('2d');
  if (!ctx) return source.toDataURL('image/jpeg', 0.82);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, c2.width, c2.height);
  ctx.drawImage(source, 0, 0, c2.width, c2.height);
  return c2.toDataURL('image/jpeg', 0.82);
}

export default function ResponsivaSignPage({ routeToken, routeUrlLabel, routeSecret }) {
  const token = useMemo(
    () =>
      resolveResponsivaDocIdFromRoute({
        routeToken,
        routeUrlLabel,
        routeSecret,
      }).trim(),
    [routeToken, routeUrlLabel, routeSecret]
  );
  const [phase, setPhase] = useState('loading');
  const [loadError, setLoadError] = useState('');
  const [session, setSession] = useState(null);
  const [step, setStep] = useState('sign');
  const [signerName, setSignerName] = useState('');
  const [signerRelationship, setSignerRelationship] = useState('');
  const [emergencyContactNameInput, setEmergencyContactNameInput] = useState('');
  const [emergencyPhoneInput, setEmergencyPhoneInput] = useState('');
  const [signatureDataUrl, setSignatureDataUrl] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [doneInfo, setDoneInfo] = useState(null);
  const [privacyAckRead, setPrivacyAckRead] = useState(false);
  const privacyPublicUrl = buildPrivacyNoticePublicUrl(typeof window !== 'undefined' ? window.location.origin : '');

  const canvasRef = useRef(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setLoadError('Falta el enlace completo.');
        setPhase('error');
        return;
      }
      try {
        await ensureAnonymousFirestoreAuth(publicAuth);
        const s = await loadResponsivaSignSession(token);
        if (cancelled) return;
        if (!s.ok) {
          setLoadError(s.error || 'No se pudo cargar.');
          setPhase('error');
          return;
        }
        setSession(s);
        setPhase('ready');
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          const hint = shortFirebaseClientMessage(e);
          emitGlobalSystemAlert(hint, { ms: 7200 });
          setLoadError(hint);
          setPhase('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (session?.participantIsMinor === false) {
      setSignerRelationship('');
    }
  }, [session?.participantIsMinor]);

  const getCanvasContext = () => {
    const c = canvasRef.current;
    if (!c) return null;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    return { c, ctx };
  };

  const startDraw = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const pair = getCanvasContext();
    if (!pair) return;
    const el = pair.c;
    if (typeof el.setPointerCapture === 'function' && e.pointerId != null) {
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* */
      }
    }
    drawingRef.current = true;
    const { ctx, c } = pair;
    const { x, y, scaleX, scaleY } = getCanvasPointerMapping(c, e);
    ctx.strokeStyle = '#0f172a';
    const avgScale = (scaleX + scaleY) / 2;
    ctx.lineWidth = Math.max(1.6, Math.min(3.5, 2.2 * avgScale));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const moveDraw = (e) => {
    if (!drawingRef.current) return;
    if (e.pointerType === 'mouse' && (e.buttons & 1) === 0) return;
    const pair = getCanvasContext();
    if (!pair) return;
    const { ctx, c } = pair;
    if (e.type.startsWith('touch') && !e.touches?.[0]) return;
    const { x, y } = getCanvasPointerMapping(c, e);
    ctx.lineTo(x, y);
    ctx.stroke();
    e.preventDefault();
  };

  const endDraw = (e) => {
    const pair = getCanvasContext();
    if (pair?.c && typeof pair.c.releasePointerCapture === 'function' && e?.pointerId != null) {
      try {
        if (pair.c.hasPointerCapture(e.pointerId)) pair.c.releasePointerCapture(e.pointerId);
      } catch {
        /* */
      }
    }
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (pair) {
      setSignatureDataUrl(compressSignatureCanvas(pair.c));
    }
  };

  const clearCanvas = () => {
    const pair = getCanvasContext();
    if (!pair) return;
    const { ctx, c } = pair;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    setSignatureDataUrl('');
  };

  useEffect(() => {
    if (phase !== 'ready' || step !== 'sign') return;
    const t = requestAnimationFrame(() => {
      clearCanvas();
    });
    return () => cancelAnimationFrame(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset canvas when entering sign step
  }, [phase, step]);

  const handleContinueToReview = useCallback(() => {
    setSubmitError('');
    const name = signerName.trim();
    if (name.length < 3) {
      setSubmitError('Escribe el nombre completo de quien firma.');
      return;
    }
    const isMinor = session?.participantIsMinor !== false;
    if (isMinor) {
      const rel = signerRelationship.trim();
      if (rel.length < 2) {
        setSubmitError('Indica el parentesco con el menor (obligatorio).');
        return;
      }
    }
    const ecName = emergencyContactNameInput.trim();
    if (ecName.length < 2) {
      setSubmitError('Nombre del contacto de emergencia obligatorio (al menos 2 caracteres).');
      return;
    }
    const em = formatPhoneNumber(emergencyPhoneInput);
    if (!isValidPhone(em)) {
      setSubmitError('Teléfono del contacto de emergencia obligatorio (10 dígitos, formato XX-XXXX-XXXX como en el registro).');
      return;
    }
    if (!signatureDataUrl || !signatureDataUrl.startsWith('data:image/')) {
      setSubmitError('Firma en el recuadro blanco con el dedo o el mouse.');
      return;
    }
    if (!privacyAckRead) {
      setSubmitError('Debe confirmar que leyó el aviso de privacidad antes de firmar.');
      return;
    }
    setStep('review');
  }, [signerName, signerRelationship, emergencyContactNameInput, emergencyPhoneInput, signatureDataUrl, session?.participantIsMinor, privacyAckRead]);

  const handleSubmitFinal = useCallback(async () => {
    setSubmitError('');
    setSubmitting(true);
    try {
      const isMinor = session?.participantIsMinor !== false;
      const res = await submitResponsivaDigitalSignature({
        token,
        signerName: signerName.trim(),
        signerRelationship: isMinor ? signerRelationship.trim() : '',
        emergencyContactName: emergencyContactNameInput.trim(),
        emergencyPhone: formatPhoneNumber(emergencyPhoneInput),
        signatureDataUrl,
      });
      if (!res.ok) {
        setSubmitError(res.error || 'No se pudo enviar.');
        setSubmitting(false);
        return;
      }
      setDoneInfo(res);
      await deleteCurrentUserIfAnonymous(publicAuth);
      setPhase('done');
    } catch (e) {
      console.error(e);
      const hint = shortFirebaseClientMessage(e);
      emitGlobalSystemAlert(hint, { ms: 7200 });
      setSubmitError(hint);
    } finally {
      setSubmitting(false);
    }
  }, [token, signerName, signerRelationship, emergencyContactNameInput, emergencyPhoneInput, signatureDataUrl, session?.participantIsMinor]);

  if (phase === 'loading') {
    return (
      <div className={`${publicShellClass} flex items-center justify-center`}>
        <p className="text-slate-600 font-semibold">Cargando…</p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className={publicShellClass}>
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow border border-red-100 p-6">
          <h1 className="text-lg font-black text-slate-900 mb-2">No disponible</h1>
          <p className="text-sm text-slate-600 whitespace-pre-wrap">{loadError}</p>
        </div>
      </div>
    );
  }

  if (phase === 'done') {
    if (!doneInfo) {
      return (
        <div className={`${publicShellClass} flex items-center justify-center`}>
          <p className="text-slate-600 font-semibold">Listo.</p>
        </div>
      );
    }
    const wa = doneInfo.phone;
    const confirmMsg = `Confirmación: ya quedó registrada la responsiva firmada digitalmente para ${doneInfo.participantName || 'el menor'} (${doneInfo.eventName || 'evento'}).`;
    const waUrl = wa ? buildWhatsAppMeUrl(wa, confirmMsg) : '';

    return (
      <div className={publicShellClass}>
        <div className="max-w-lg mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow border border-emerald-100 dark:border-emerald-700 p-6">
          <h1 className="text-xl font-black text-emerald-800 dark:text-emerald-300 mb-2">Responsiva recibida</h1>
          <p className="text-sm text-slate-600 mb-4">
            El registro quedó marcado como <strong>Entregada</strong> y la firma quedó guardada en el sistema.
          </p>
          {waUrl ? (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${btnPrimary} text-center no-underline block mb-3 bg-emerald-600 hover:bg-emerald-700`}
            >
              {doneInfo.participantIsMinor === true
                ? 'Abrir WhatsApp (teléfono de emergencia)'
                : 'Abrir WhatsApp (teléfono del registro)'}
            </a>
          ) : null}
          <p className="text-[11px] text-slate-500">
            Puedes usar WhatsApp para avisar al equipo si te lo pidieron; el envío al sistema ya está completo.
          </p>
        </div>
      </div>
    );
  }

  const { participant, eventSnapshot, bodyText, participantIsMinor } = session;
  const isMinorParticipant = participantIsMinor !== false;

  return (
    <div className={publicShellClass}>
      <div className="max-w-lg mx-auto">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow border border-slate-200 dark:border-slate-700 overflow-hidden mb-4">
          <div className="bg-indigo-600 px-4 py-3">
            <h1 className="text-white font-black text-lg leading-tight">
              {isMinorParticipant ? 'Responsiva (menor de edad)' : 'Responsiva (mayor de edad)'}
            </h1>
            <p className="text-indigo-100 text-xs font-semibold mt-1">{eventSnapshot?.name || 'Evento'}</p>
          </div>
          <div className="p-4 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
              {isMinorParticipant ? 'Participante menor' : 'Participante'}
            </p>
            <p className="text-base font-black text-slate-900">{participant?.name || '—'}</p>
          </div>
        </div>

        {step === 'sign' ? (
          <div className="bg-white rounded-2xl shadow border border-slate-200 p-4 space-y-4">
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-wide text-indigo-900">Privacidad y firma digital</p>
              <p className="text-xs text-slate-700 leading-snug">
                La firma digital puede considerarse dato biométrico/sensible. Consulte el{' '}
                <a href={privacyPublicUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-700 font-bold underline">
                  aviso de privacidad integral
                </a>
                . Firmar la responsiva no extiende automáticamente el consentimiento a todos los datos de salud del registro.
              </p>
              <label className="flex items-start gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-indigo-600 rounded"
                  checked={privacyAckRead}
                  onChange={(e) => setPrivacyAckRead(e.target.checked)}
                />
                <span>He leído el aviso de privacidad y entiendo el tratamiento de mi firma digital.</span>
              </label>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{bodyText}</p>
            </div>
            <div>
              <label className={labelClasses}>
                {isMinorParticipant
                  ? 'Nombre completo de quien firma (tutor o representante)'
                  : 'Nombre completo de quien firma'}
              </label>
              <input
                type="text"
                className={inputClasses}
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                autoComplete="name"
                placeholder="Como en identificación oficial"
              />
            </div>
            {isMinorParticipant ? (
              <div>
                <label className={labelClasses}>Parentesco con el menor</label>
                <input
                  type="text"
                  className={inputClasses}
                  value={signerRelationship}
                  onChange={(e) => setSignerRelationship(e.target.value)}
                  autoComplete="off"
                  required
                  placeholder="Ej. Madre, padre, tutor legal"
                />
              </div>
            ) : null}
            <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Contacto de emergencia</p>
              <div>
                <label className={labelClasses}>Nombre del contacto</label>
                <input
                  type="text"
                  className={inputClasses}
                  value={emergencyContactNameInput}
                  onChange={(e) => setEmergencyContactNameInput(e.target.value)}
                  autoComplete="section-emergency name"
                  placeholder="Nombre completo"
                />
              </div>
              <div>
                <label className={labelClasses}>Teléfono del contacto</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="section-emergency tel"
                  className={inputClasses}
                  value={emergencyPhoneInput}
                  onChange={(e) => setEmergencyPhoneInput(formatPhoneNumber(e.target.value))}
                  placeholder="55-1234-5678"
                />
              </div>
            </div>

            <div>
              <label className={labelClasses}>Firma (dibuja en el recuadro)</label>
              <canvas
                ref={canvasRef}
                width={340}
                height={160}
                className="w-full touch-none rounded-xl border-2 border-slate-200 bg-white cursor-crosshair"
                style={{ touchAction: 'none' }}
                onPointerDown={startDraw}
                onPointerMove={moveDraw}
                onPointerUp={endDraw}
                onPointerCancel={endDraw}
              />
              <button type="button" className="mt-2 text-xs font-bold text-indigo-600" onClick={clearCanvas}>
                Borrar firma
              </button>
            </div>

            {submitError ? <p className="text-sm text-red-600 font-semibold">{submitError}</p> : null}

            <button type="button" className={btnPrimary} onClick={handleContinueToReview}>
              Continuar
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow border border-slate-200 p-4 space-y-4">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide">Revisar y enviar</h2>
            <p className="text-sm text-slate-600">
              Al pulsar <strong>Enviar responsiva</strong>, el sistema guardará la firma y marcará la responsiva como entregada.
            </p>
            <div className="rounded-lg border border-slate-200 p-2 bg-slate-50">
              <p className="text-xs text-slate-500">Firma</p>
              {signatureDataUrl ? (
                <img src={signatureDataUrl} alt="Firma" className="max-h-28 object-contain mx-auto" />
              ) : null}
            </div>
            <p className="text-sm">
              <span className="text-slate-500">Firmante:</span>{' '}
              <span className="font-bold text-slate-900">{signerName.trim()}</span>
            </p>
            {isMinorParticipant && signerRelationship.trim() ? (
              <p className="text-sm">
                <span className="text-slate-500">Parentesco:</span> {signerRelationship.trim()}
              </p>
            ) : null}
            <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-sm space-y-1">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Contacto de emergencia</p>
              <p>
                <span className="text-slate-500">Nombre:</span>{' '}
                <span className="font-bold text-slate-900">{emergencyContactNameInput.trim()}</span>
              </p>
              <p>
                <span className="text-slate-500">Teléfono:</span>{' '}
                <span className="font-bold text-slate-900 font-mono">{formatPhoneNumber(emergencyPhoneInput)}</span>
              </p>
            </div>

            {submitError ? <p className="text-sm text-red-600 font-semibold">{submitError}</p> : null}

            <button
              type="button"
              className={btnPrimary}
              disabled={submitting}
              onClick={handleSubmitFinal}
            >
              {submitting ? 'Enviando…' : 'Enviar responsiva'}
            </button>
            <button type="button" className={btnSecondary} disabled={submitting} onClick={() => setStep('sign')}>
              Volver
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
