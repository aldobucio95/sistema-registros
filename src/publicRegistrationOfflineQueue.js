import { emitGlobalSystemAlert } from './globalSystemAlertsBridge.js';
import { fetchPublicRegistrationLinkSnapshot } from './publicRegistrationLinkFetch.js';
import { ensurePublicSubmitAuth } from './publicRegistrationAuth.js';
import { buildOptionalVisibilityFromPublicLinkDoc } from './publicLinkDocHelpers.js';
import {
  submitPublicRegistration,
  fetchParticipantsForEvent,
  canonicalizeVnpPersonId,
} from './publicRegistrationLogic.js';
import { registerPublicRegistrationSuccess } from './publicAnonymousAuthLifecycle.js';

const QUEUE_VERSION = 1;
const STORAGE_KEY = 'vnpm_pub_offline_queue_v1';
const MAX_ITEM_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 25;

function loadBag() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { v: QUEUE_VERSION, items: [] };
    const p = JSON.parse(raw);
    if (!p || p.v !== QUEUE_VERSION || !Array.isArray(p.items)) return { v: QUEUE_VERSION, items: [] };
    return p;
  } catch {
    return { v: QUEUE_VERSION, items: [] };
  }
}

function saveBag(bag) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bag));
  } catch (e) {
    console.warn('publicRegistrationOfflineQueue: no se pudo guardar', e);
  }
}

/** Errores que conviene reintentar al volver la red (no reglas ni validación de negocio). */
export function isLikelyRetriableNetworkFailure(err) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const code = err && typeof err === 'object' ? String(err.code || '').trim() : '';
  if (
    ['unavailable', 'deadline-exceeded', 'aborted', 'cancelled', 'network-request-failed', 'auth/network-request-failed'].includes(
      code
    )
  ) {
    return true;
  }
  const msg = String(err?.message || '').toLowerCase();
  if (/failed to fetch|networkerror|load failed|offline|timed out|network.*error/i.test(msg)) return true;
  return false;
}

function fingerprintForQueueItem(form, loc) {
  const vnp = canonicalizeVnpPersonId(form?.vnpPersonId || '');
  const locS = String(loc || '').trim();
  if (vnp) return `${vnp}@@${locS}`;
  const phone = String(form?.phone || '').replace(/\D/g, '');
  const name = String(form?.name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  return `${phone}@@${name}@@${locS}`;
}

export function peekPublicOfflineQueueCount() {
  return loadBag().items.length;
}

/**
 * Añade o sustituye un pendiente con el mismo enlace + evento + huella (misma persona aprox.).
 * @returns {string|null} id del elemento encolado
 */
export function enqueuePublicRegistrationOffline({ linkKey, eventId, loc, form }) {
  const lk = String(linkKey || '').trim();
  const eid = String(eventId || '').trim();
  if (!lk || !eid || !form || typeof form !== 'object') return null;
  const locTrim = String(loc || '').trim();
  const fp = fingerprintForQueueItem(form, locTrim);
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const bag = loadBag();
  const now = Date.now();
  bag.items = bag.items.filter((it) => {
    const itFp = it._fp || fingerprintForQueueItem(it.form, it.loc);
    return !(String(it.linkKey) === lk && String(it.eventId) === eid && itFp === fp);
  });
  bag.items.push({
    id,
    linkKey: lk,
    eventId: eid,
    loc: locTrim,
    form: { ...form },
    enqueuedAt: now,
    attempts: 0,
    _fp: fp,
  });
  saveBag(bag);
  return id;
}

let flushTail = Promise.resolve();

export function processPublicRegistrationOfflineQueue(authInstance) {
  flushTail = flushTail
    .then(() => processPublicRegistrationOfflineQueueBody(authInstance))
    .catch((e) => {
      console.warn('publicRegistrationOfflineQueue flush', e);
      return { processed: 0, failedRetriable: 0, dropped: 0, businessRejected: 0 };
    });
  return flushTail;
}

async function processPublicRegistrationOfflineQueueBody(authInstance) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { processed: 0, failedRetriable: 0, dropped: 0, businessRejected: 0 };
  }

  const bag = loadBag();
  if (!bag.items.length) return { processed: 0, failedRetriable: 0, dropped: 0, businessRejected: 0 };

  const now = Date.now();
  let processed = 0;
  let failedRetriable = 0;
  let dropped = 0;
  let businessRejected = 0;

  const pending = [...bag.items].sort((a, b) => (a.enqueuedAt || 0) - (b.enqueuedAt || 0));

  while (pending.length) {
    const item = pending.shift();
    if (now - (item.enqueuedAt || 0) > MAX_ITEM_AGE_MS) {
      dropped++;
      continue;
    }
    if ((item.attempts || 0) >= MAX_ATTEMPTS) {
      dropped++;
      emitGlobalSystemAlert('Cola offline: registro descartado tras muchos reintentos.', { tone: 'warn', ms: 7000 });
      continue;
    }

    try {
      await ensurePublicSubmitAuth(authInstance);
      const snap = await fetchPublicRegistrationLinkSnapshot(item.linkKey);
      if (!snap.exists()) {
        item.attempts = (item.attempts || 0) + 1;
        saveBag({ v: QUEUE_VERSION, items: [item, ...pending] });
        failedRetriable++;
        return { processed, failedRetriable, dropped, businessRejected };
      }
      const linkDoc = snap.data();
      const evId = String(linkDoc?.eventSnapshot?.id || '').trim();
      if (evId && evId !== String(item.eventId)) {
        dropped++;
        emitGlobalSystemAlert('Cola: el enlace ya no coincide con el evento; se descartó un pendiente.', {
          tone: 'warn',
          ms: 7500,
        });
        continue;
      }
      const eventSnapshot = linkDoc.eventSnapshot;
      const globalSnapshot = linkDoc.globalSnapshot || {};
      const optionalVisibility = buildOptionalVisibilityFromPublicLinkDoc(linkDoc);
      const fresh = await fetchParticipantsForEvent(eventSnapshot.id);
      const result = await submitPublicRegistration({
        rawEntry: item.form,
        loc: item.loc,
        eventSnapshot,
        globalSnapshot,
        optionalVisibility,
        participants: fresh,
      });
      if (result.ok) {
        processed++;
        registerPublicRegistrationSuccess(authInstance, item.linkKey);
        continue;
      }
      businessRejected++;
      const head = String(result.error || '').split(/[.\n]/)[0].trim().slice(0, 120);
      emitGlobalSystemAlert(
        head ? `Cola: no se pudo enviar (${head})` : 'Cola: Firestore rechazó un registro pendiente.',
        { tone: 'warn', ms: 9000 }
      );
    } catch (err) {
      if (isLikelyRetriableNetworkFailure(err)) {
        item.attempts = (item.attempts || 0) + 1;
        saveBag({ v: QUEUE_VERSION, items: [item, ...pending] });
        failedRetriable++;
        return { processed, failedRetriable, dropped, businessRejected };
      }
      item.attempts = (item.attempts || 0) + 1;
      if ((item.attempts || 0) >= MAX_ATTEMPTS) {
        dropped++;
        emitGlobalSystemAlert('Cola offline: error no de red; elemento descartado.', { tone: 'danger', ms: 7000 });
      } else {
        saveBag({ v: QUEUE_VERSION, items: [item, ...pending] });
        failedRetriable++;
        return { processed, failedRetriable, dropped, businessRejected };
      }
    }
  }

  saveBag({ v: QUEUE_VERSION, items: [] });
  return { processed, failedRetriable, dropped, businessRejected };
}
