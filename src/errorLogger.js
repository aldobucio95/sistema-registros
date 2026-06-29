/**
 * Registro centralizado de errores hacia `app_logs` (segunda fuente de verdad).
 *
 * No depende de la consola: cada error se guarda como un log visible con un snapshot
 * lateral en texto plano (mensaje, stack y contexto). Es standalone para poder usarse
 * desde `main.jsx` (sin contexto de React) y desde `App.jsx`.
 */
import {
  buildLogId,
  writeLogDoc,
  writeSnapshotDoc,
  normalizeErrorMessage,
  flushPendingLogQueue,
} from './activityLogCore.js';
import { withLogVisibleInPanel, buildLogEntityFields } from './activityLogsMeta.js';

/** Proveedor de contexto (usuario/evento) inyectado por App.jsx; opcional. */
let contextProvider = null;

/** App.jsx registra aquí un getter que devuelve `{ username, eventId, eventName }`. */
export function setErrorLogContextProvider(fn) {
  contextProvider = typeof fn === 'function' ? fn : null;
}

function readContext() {
  try {
    return contextProvider ? contextProvider() || {} : {};
  } catch {
    return {};
  }
}

function safeStack(err) {
  try {
    if (err && err.stack) return String(err.stack).slice(0, 8000);
  } catch {
    /* ignore */
  }
  return '';
}

let lastSignature = '';
let lastSignatureAt = 0;

/** Evita ráfagas del mismo error (mismo texto en <4s). */
function isDuplicateBurst(signature) {
  const now = Date.now();
  if (signature && signature === lastSignature && now - lastSignatureAt < 4000) {
    return true;
  }
  lastSignature = signature;
  lastSignatureAt = now;
  return false;
}

/**
 * Registra un error en `app_logs` + snapshot lateral.
 * @param {string} scope - origen (p. ej. 'RootErrorBoundary', 'window.onerror', 'handleAddPerson').
 * @param {Error|string} error
 * @param {object} [context] - datos adicionales en texto plano (ids, payload resumido, etc.).
 * @param {object} [options] - { usePublic, username, eventId, eventName }.
 */
export async function logError(scope, error, context = {}, options = {}) {
  try {
    const ctx = readContext();
    const usePublic = !!options.usePublic;
    const createdAt = Date.now();
    const logId = buildLogId(createdAt);
    const message = normalizeErrorMessage(error) || 'Error desconocido';
    const signature = `${scope}::${message}`;
    if (isDuplicateBurst(signature)) return null;

    const username = String(options.username || ctx.username || 'Sistema');
    const eventId = String(options.eventId || ctx.eventId || 'Global');
    const eventName = String(options.eventName || ctx.eventName || 'Sistema');

    const details = `Error en ${scope}: ${message}`.slice(0, 600);

    // 1) Snapshot lateral con toda la info del error (no depende de la consola).
    await writeSnapshotDoc(logId, {
      entityType: 'error',
      entityId: scope,
      kind: 'error',
      createdAt,
      snapshot: {
        scope: String(scope || ''),
        message,
        stack: safeStack(error),
        name: error && error.name ? String(error.name) : '',
        code: error && error.code ? String(error.code) : '',
        context: context || {},
        url: typeof window !== 'undefined' ? String(window.location?.href || '') : '',
        userAgent: typeof navigator !== 'undefined' ? String(navigator.userAgent || '') : '',
        at: new Date(createdAt).toISOString(),
        username,
        eventId,
      },
      usePublic,
    });

    // 2) Documento de actividad (visible en el panel, expandible para ver el detalle).
    const logDoc = withLogVisibleInPanel({
      id: logId,
      createdAt,
      eventId,
      eventName,
      timestamp: new Date().toLocaleString('es-MX'),
      username,
      action: 'Error',
      details,
      revertInfo: null,
      ...buildLogEntityFields({
        entityType: 'error',
        entityId: scope,
        status: 'error',
        hasSnapshot: true,
        isError: true,
        errorMessage: message,
      }),
    });
    await writeLogDoc(logDoc, { usePublic });
    return logId;
  } catch {
    // Nunca debe propagar: registrar errores jamás debe tumbar la app.
    return null;
  }
}

let handlersInstalled = false;

/** Engancha window.onerror / unhandledrejection y reintenta la cola al cargar / recuperar conexión. */
export function installGlobalErrorHandlers(options = {}) {
  if (handlersInstalled || typeof window === 'undefined') return;
  handlersInstalled = true;
  const usePublic = !!options.usePublic;

  window.addEventListener('error', (event) => {
    const err = event?.error || event?.message || 'window.error';
    void logError('window.onerror', err, {
      filename: event?.filename || '',
      lineno: event?.lineno || 0,
      colno: event?.colno || 0,
    }, { usePublic });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    void logError('unhandledrejection', reason instanceof Error ? reason : String(reason), {}, { usePublic });
  });

  const tryFlush = () => {
    void flushPendingLogQueue();
  };
  window.addEventListener('online', tryFlush);
  // Reintento inicial diferido para no competir con el arranque.
  setTimeout(tryFlush, 4000);
}
