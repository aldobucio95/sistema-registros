#!/usr/bin/env node
/**
 * Repara un documento app_events dañado por revert parcial de Transporte.
 * Restaura campos faltantes desde la copia más reciente en Storage (sin tocar participantes).
 *
 * Uso:
 *   node scripts/repair-event-from-backup.mjs --credentials C:\sa.json --event-id <id> --dry-run
 *   node scripts/repair-event-from-backup.mjs --credentials C:\sa.json --event-id <id> --apply
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { pathToFileURL } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'registros-vnpm';
const DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || 'registros-vnpm';

/** No sobrescribir: el revert de Transporte dejó el plan actual; el robot recalcula el total. */
const PRESERVE_FROM_CURRENT = new Set(['transportPlanning', 'activeRosterUnitsTotal']);

/** Campos legacy / alias que el dashboard también consulta. */
const CORE_EVENT_FIELDS = [
  'name',
  'eventType',
  'date',
  'dateStart',
  'dateEnd',
  'startDate',
  'endDate',
  'paymentDeadlineDate',
  'bautizosListPriceFood',
  'bautizosListPriceTransport',
  'globalCost',
  'pricingType',
  'minDeposit',
  'realCost',
  'serverCost',
  'serverCostTeens',
  'serverCostJovenes',
  'serverCostAmbos',
  'locations',
  'locationCaps',
  'regStatus',
  'eventTotalCap',
  'order',
  'cardPaymentEnabled',
  'cardPaymentByLocation',
  'cardCommissionRate',
  'cashCutScheduleByLocation',
  'campaRealCostCountOptions',
  'bautizosResponsivaConfig',
  'responsivaEnabled',
  'responsivaDigitalEnabled',
  'responsivaDigitalAgeScope',
  'responsivaDigitalTextMinors',
  'responsivaDigitalTextAdults',
  'editorRegistrationFields',
  'customFields',
  'discountCampaigns',
  'dynamicPrices',
  'dynamicServerPrices',
  'campaTeensDateStart',
  'campaTeensDateEnd',
  'campaJovenesDateStart',
  'campaJovenesDateEnd',
];

function parseArg(name) {
  const eq = process.argv.find((a) => a.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1).trim().replace(/^["']|["']$/g, '');
  const idx = process.argv.indexOf(name);
  if (idx !== -1 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith('-')) {
    return process.argv[idx + 1].trim().replace(/^["']|["']$/g, '');
  }
  return null;
}

async function loadServiceAccountObject(credPath) {
  const lower = String(credPath).toLowerCase();
  if (lower.endsWith('.js') || lower.endsWith('.mjs')) {
    const mod = await import(pathToFileURL(resolve(credPath)).href);
    return mod.default ?? mod;
  }
  return JSON.parse(readFileSync(credPath, 'utf8'));
}

function isMissingOnCurrent(key, currentVal) {
  if (currentVal === undefined) return true;
  if (currentVal == null) return true;
  if (key === 'locations' && Array.isArray(currentVal) && currentVal.length === 0) return true;
  if (typeof currentVal === 'string' && !currentVal.trim()) return true;
  return false;
}

function hasBackupValue(key, backupVal) {
  if (backupVal === undefined) return false;
  if (backupVal == null) return false;
  if (key === 'locations' && Array.isArray(backupVal) && backupVal.length === 0) return false;
  if (typeof backupVal === 'string' && !backupVal.trim()) return false;
  return true;
}

function buildRepairPatch(current, backup) {
  const patch = {};
  const allKeys = new Set([...CORE_EVENT_FIELDS, ...Object.keys(backup || {})]);
  for (const key of allKeys) {
    if (key === 'id' || PRESERVE_FROM_CURRENT.has(key)) continue;
    if (!hasBackupValue(key, backup[key])) continue;
    if (isMissingOnCurrent(key, current[key])) {
      patch[key] = backup[key];
    }
  }
  return patch;
}

async function loadLatestBackupEvent(db, bucket, eventId) {
  const manifests = await db.collection('app_backups').get();
  const sorted = manifests.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((m) => m.storagePath)
    .sort((a, b) => String(b.id).localeCompare(String(a.id)));

  for (const m of sorted) {
    try {
      const [buf] = await bucket.file(m.storagePath).download();
      const parsed = JSON.parse(buf.toString('utf8'));
      const ev = (parsed.events || []).find((e) => String(e.id) === String(eventId));
      if (ev) return { backupId: m.id, event: ev };
    } catch {
      /* siguiente copia */
    }
  }
  return null;
}

async function main() {
  const credPath = parseArg('--credentials');
  const eventId = parseArg('--event-id');
  const apply = process.argv.includes('--apply');
  const dryRun = process.argv.includes('--dry-run') || !apply;

  if (!credPath || !eventId) {
    console.error(
      'Uso: node scripts/repair-event-from-backup.mjs --credentials <sa.json> --event-id <id> [--dry-run|--apply]'
    );
    process.exit(1);
  }

  const sa = await loadServiceAccountObject(credPath);
  const app = initializeApp({
    credential: cert(sa),
    projectId: PROJECT_ID,
    storageBucket: `${PROJECT_ID}.firebasestorage.app`,
  });
  const db = getFirestore(app, DATABASE_ID);
  const bucket = getStorage(app).bucket();

  const evRef = db.doc(`app_events/${eventId}`);
  const evSnap = await evRef.get();
  if (!evSnap.exists) {
    console.error(`No existe app_events/${eventId}`);
    process.exit(1);
  }
  const current = evSnap.data();

  const found = await loadLatestBackupEvent(db, bucket, eventId);
  if (!found) {
    console.error('No se encontró este evento en ninguna copia app_backups/Storage.');
    process.exit(1);
  }

  const backup = found.event;
  const patch = buildRepairPatch(current, backup);

  console.log(`Evento: ${eventId}`);
  console.log(`Copia fuente: ${found.backupId}`);
  console.log(`Modo: ${dryRun ? 'dry-run (sin escribir)' : 'APPLY'}`);
  console.log('');
  console.log('Estado actual (campos clave):');
  for (const key of CORE_EVENT_FIELDS) {
    const cur = current[key];
    const short =
      cur == null
        ? '—'
        : typeof cur === 'object'
          ? JSON.stringify(cur).slice(0, 60)
          : String(cur).slice(0, 60);
    console.log(`  ${key}: ${short}`);
  }
  console.log('');
  console.log(`Campos a restaurar (${Object.keys(patch).length}):`);
  if (!Object.keys(patch).length) {
    console.log('  (ninguno — el evento ya tiene valores o la copia no ayuda)');
    return;
  }
  for (const [k, v] of Object.entries(patch)) {
    const shown =
      typeof v === 'object'
        ? JSON.stringify(v).length > 120
          ? `${JSON.stringify(v).slice(0, 117)}…`
          : JSON.stringify(v)
        : v;
    console.log(`  ${k}: ${shown}`);
  }
  console.log('');
  console.log('Preservados del documento actual: transportPlanning, activeRosterUnitsTotal');

  if (!dryRun) {
    await evRef.update(patch);
    console.log('');
    console.log('✓ Evento actualizado. Recarga la app (F5).');
  } else {
    console.log('');
    console.log('Ejecuta con --apply para escribir en Firestore.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
