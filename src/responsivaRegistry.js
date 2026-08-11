import { getStorage, ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { setDoc, deleteDoc } from 'firebase/firestore';
import { app, publicApp } from './firebaseConfig.js';
import { auth, getDocRef, getPublicDocRef, publicAuth } from './firebaseRefs.js';
import { sanitizeFirestoreDocId } from './firestoreDocId.js';

export const RESPONSIVA_REGISTRY_COLLECTION = 'app_responsiva_registry';

/**
 * Id estable por evento + participante (solo caracteres seguros para id de doc).
 */
export function responsivaRegistryDocId(eventId, participantId) {
  const e = sanitizeFirestoreDocId(eventId, { fallback: 'event', maxChars: 120 });
  const p = sanitizeFirestoreDocId(participantId, { fallback: 'participant', maxChars: 120 });
  return `${e}__${p}`;
}

/**
 * Ruta de Storage para la firma.
 * Flujos públicos usan sufijo único: las reglas solo permiten `create` anónimo (no `update`),
 * así un visitante no puede sobrescribir `…/{participantId}.jpg` de otro registro.
 * @param {{ eventId: string, participantId: string, usePublic?: boolean, uniqueToken?: string|number|null }} p
 */
export function buildResponsivaSignatureStoragePath({
  eventId,
  participantId,
  usePublic = false,
  uniqueToken = null,
}) {
  const safeE = sanitizeFirestoreDocId(eventId, { fallback: 'event', maxChars: 120 });
  const safeP = sanitizeFirestoreDocId(participantId, { fallback: 'participant', maxChars: 120 });
  if (!usePublic) {
    return `responsiva_signatures/${safeE}/${safeP}.jpg`;
  }
  const raw =
    uniqueToken != null && String(uniqueToken).trim()
      ? String(uniqueToken).trim()
      : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const safeTok = sanitizeFirestoreDocId(raw, { fallback: 'sig', maxChars: 80, lowercase: true });
  return `responsiva_signatures/${safeE}/${safeP}__${safeTok}.jpg`;
}

/**
 * Sube la imagen de firma a Storage (JPEG data URL). Falla silenciosamente en consola si reglas/bucket no permiten.
 * @returns {Promise<{ path: string, url: string } | null>}
 */
export async function uploadResponsivaSignatureImage({
  eventId,
  participantId,
  dataUrl,
  usePublic = false,
  uniqueToken = null,
}) {
  if (!dataUrl || !String(dataUrl).startsWith('data:image/')) return null;
  const storage = getStorage(usePublic ? publicApp : app);
  const path = buildResponsivaSignatureStoragePath({
    eventId,
    participantId,
    usePublic,
    uniqueToken,
  });
  const r = ref(storage, path);
  await uploadString(r, dataUrl, 'data_url');
  const url = await getDownloadURL(r);
  return { path, url };
}

/**
 * Registro consolidado para la vista «Responsivas» (auditoría). Se fusiona con datos del participante en UI.
 */
export async function upsertResponsivaRegistryEntry({
  eventId,
  participantId,
  participantName,
  location,
  kind,
  submittedAt,
  recordedAt,
  signerName,
  signerRelationship,
  signatureStoragePath,
  signatureStorageUrl,
  hasSignatureImage,
  usePublic = false,
}) {
  const id = responsivaRegistryDocId(eventId, participantId);
  const now = Date.now();
  await setDoc(
    (usePublic ? getPublicDocRef : getDocRef)(RESPONSIVA_REGISTRY_COLLECTION, id),
    {
      eventId: String(eventId),
      participantId: String(participantId),
      participantName: String(participantName || '').trim(),
      location: String(location || '').trim(),
      kind,
      updatedAt: now,
      submittedAt: submittedAt ?? null,
      recordedAt: recordedAt ?? null,
      signerName: signerName != null ? String(signerName).trim() : null,
      signerRelationship: signerRelationship != null ? String(signerRelationship).trim() : null,
      signatureStoragePath: signatureStoragePath || null,
      signatureStorageUrl: signatureStorageUrl || null,
      hasSignatureImage: !!hasSignatureImage,
    },
    { merge: true }
  );
}

function storageDeleteAppsInOrder() {
  const order = [];
  if (auth.currentUser) order.push(false);
  if (publicAuth.currentUser) order.push(true);
  if (order.length === 0) order.push(false);
  return order;
}

/**
 * Elimina imagen de firma en Storage si existe (mismo path que `uploadResponsivaSignatureImage`).
 * Usa la instancia con sesión activa (panel primero) para evitar 403 por peticiones sin auth.
 */
export async function deleteResponsivaSignatureImageIfAny(signatureStoragePath) {
  const path = typeof signatureStoragePath === 'string' ? signatureStoragePath.trim() : '';
  if (!path || !path.startsWith('responsiva_signatures/')) return;
  for (const usePublic of storageDeleteAppsInOrder()) {
    try {
      const storage = getStorage(usePublic ? publicApp : app);
      await deleteObject(ref(storage, path));
      return;
    } catch (err) {
      const code = String(err?.code || '');
      if (code === 'storage/object-not-found') return;
      if (code === 'storage/unauthorized' || code === 'storage/unauthenticated') continue;
    }
  }
}

/**
 * Quita responsiva del registro en Firestore/Storage: doc en `app_responsiva_registry` y archivo en Storage.
 * No modifica `app_participants` (eso lo hace quien llama con deleteField u otro payload).
 */
export async function removeResponsivaArtifactsForParticipant({ eventId, participantId, responsivaDigital }) {
  const rd = responsivaDigital && typeof responsivaDigital === 'object' ? responsivaDigital : {};
  await deleteResponsivaSignatureImageIfAny(rd.signatureStoragePath);
  const regId = responsivaRegistryDocId(eventId, participantId);
  try {
    await deleteDoc(getDocRef(RESPONSIVA_REGISTRY_COLLECTION, regId));
  } catch (e) {
    console.warn('removeResponsivaArtifactsForParticipant registry', e);
  }
}
