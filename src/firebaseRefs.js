import { app, publicApp } from './firebaseConfig.js';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { initializeFirestore, collection, doc, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

export const auth = getAuth(app);
export const publicAuth = getAuth(publicApp);
/** Mismo proyecto que Firestore; usado p. ej. para copias automáticas (`app_auto_backups/`). */
export const storage = getStorage(app);

/**
 * Caché local persistente (IndexedDB): menos lecturas de red al reutilizar datos,
 * mejor comportamiento offline y reanudación de pestañas.
 */
const firestoreSharedSettings = {
  experimentalForceLongPolling: true,
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
};

/**
 * Base Firestore **nombrada** `registros-vnpm` (no la `(default)`).
 * Despliega reglas a esta BD: `firebase.json` → `firestore[].database`.
 * Si las reglas solo están en `(default)`, verás `permission-denied` al escribir.
 */
export const db = initializeFirestore(app, firestoreSharedSettings, 'registros-vnpm');

export const publicDb = initializeFirestore(publicApp, firestoreSharedSettings, 'registros-vnpm');

/**
 * Se eliminan los niveles de anidación. 
 * Ahora las funciones acceden directamente a la colección en la raíz.
 */
export const getColRef = (colName) => collection(db, colName);

export const getDocRef = (colName, docId) => doc(db, colName, docId);

/** Subcolección de metadatos de carro por evento (`app_events/{eventId}/transport_car_meta`). */
export const getTransportCarMetaColRef = (eventId) =>
  collection(db, 'app_events', String(eventId || '').trim(), 'transport_car_meta');

export const getTransportCarMetaDocRef = (eventId, vehicleDocId) =>
  doc(db, 'app_events', String(eventId || '').trim(), 'transport_car_meta', String(vehicleDocId || '').trim());

export const getPublicColRef = (colName) => collection(publicDb, colName);

export const getPublicDocRef = (colName, docId) => doc(publicDb, colName, docId);