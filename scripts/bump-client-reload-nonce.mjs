#!/usr/bin/env node
/**
 * Actualiza `app_data/config.clientReloadNonce` en Firestore (uso opcional / emergencia).
 * La recarga tras deploy la lleva solo `src/hostingVersionCheck.js` comparando `version.json`.
 * Este script puede servir para forzar revisión en clientes sin redeploy si lo enlazas tú
 * desde otro proceso (la app ya no recarga sola al cambiar este campo).
 *
 * Si lo usas tras hosting deploy, ejecútalo manualmente **después** de `deploy --only hosting`.
 *
 * Credenciales (una de estas):
 * - Variable de entorno `GOOGLE_APPLICATION_CREDENTIALS` = ruta al JSON de cuenta de servicio
 * - `--credentials=ruta.json` o `--credentials ruta.json`
 * - Si existen: `./credenciales.json` o `./scripts/credenciales.json` (respecto al cwd)
 *
 * Variables opcionales: `FIREBASE_PROJECT_ID` (default registros-vnpm), `FIRESTORE_DATABASE_ID` (default registros-vnpm).
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'registros-vnpm';
const DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || 'registros-vnpm';

function resolveCredentialsPath() {
  const fromEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (fromEnv) {
    const p = resolve(String(fromEnv).trim());
    if (existsSync(p)) return p;
  }
  const eq = process.argv.find((a) => a.startsWith('--credentials='));
  if (eq) {
    const p = eq.slice('--credentials='.length).trim().replace(/^["']|["']$/g, '');
    return resolve(p);
  }
  const idx = process.argv.indexOf('--credentials');
  if (idx !== -1 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith('-')) {
    return resolve(process.argv[idx + 1].trim().replace(/^["']|["']$/g, ''));
  }
  for (const rel of ['credenciales.json', 'scripts/credenciales.json']) {
    const p = resolve(process.cwd(), rel);
    if (existsSync(p)) return p;
  }
  const nearScript = resolve(__dirname, 'credenciales.json');
  if (existsSync(nearScript)) return nearScript;
  return null;
}

async function loadServiceAccount(credPath) {
  const lower = String(credPath).toLowerCase();
  if (lower.endsWith('.js') || lower.endsWith('.mjs')) {
    const { pathToFileURL } = await import('node:url');
    const mod = await import(pathToFileURL(resolve(credPath)).href);
    const obj = mod.default ?? mod;
    if (!obj || typeof obj !== 'object') throw new Error('Credenciales .js/.mjs inválidas.');
    return obj;
  }
  return JSON.parse(readFileSync(credPath, 'utf8'));
}

async function main() {
  const credPath = resolveCredentialsPath();
  if (!credPath) {
    console.error(
      'No se encontró cuenta de servicio. Usa GOOGLE_APPLICATION_CREDENTIALS, --credentials=ruta.json, o coloca credenciales.json en la raíz del proyecto.'
    );
    process.exit(1);
  }
  if (!existsSync(credPath)) {
    console.error(`No existe el archivo de credenciales: ${credPath}`);
    process.exit(1);
  }

  const sa = await loadServiceAccount(credPath);
  const app = initializeApp({ credential: cert(sa), projectId: PROJECT_ID });
  const db = getFirestore(app, DATABASE_ID);
  const nonce = Date.now();
  await db.collection('app_data').doc('config').set({ clientReloadNonce: nonce }, { merge: true });
  console.log(`OK: clientReloadNonce = ${nonce}`);
  console.log('Los navegadores con la app abierta deberían recargar en unos segundos.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
