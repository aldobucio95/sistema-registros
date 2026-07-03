#!/usr/bin/env node
/**
 * Audita el estado de Firestore tras una posible restauración masiva.
 * Compara conteos actuales vs copias en Storage (app_auto_backups).
 *
 * Uso:
 *   node scripts/audit-firestore-restore.mjs --credentials C:\ruta\sa.json
 *
 * Requiere cuenta de servicio con lectura en Firestore (registros-vnpm) y Storage.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { pathToFileURL } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'registros-vnpm';
const DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || 'registros-vnpm';
const BACKUP_PREFIX = 'app_auto_backups';

function parseCredentialsArg() {
  const eq = process.argv.find((a) => a.startsWith('--credentials='));
  if (eq) return resolve(eq.slice('--credentials='.length).trim().replace(/^["']|["']$/g, ''));
  const idx = process.argv.indexOf('--credentials');
  if (idx !== -1 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith('-')) {
    return resolve(process.argv[idx + 1].trim().replace(/^["']|["']$/g, ''));
  }
  return null;
}

async function loadServiceAccountObject(credPath) {
  const lower = String(credPath).toLowerCase();
  if (lower.endsWith('.js') || lower.endsWith('.mjs')) {
    const mod = await import(pathToFileURL(resolve(credPath)).href);
    const obj = mod.default ?? mod;
    if (!obj || typeof obj !== 'object') {
      throw new Error('El archivo .js/.mjs debe exportar las credenciales como default.');
    }
    return obj;
  }
  return JSON.parse(readFileSync(credPath, 'utf8'));
}

async function countCollection(db, name) {
  const snap = await db.collection(name).count().get();
  return snap.data().count;
}

async function fetchRecentRestoreLogs(db, limitN = 10) {
  const snap = await db
    .collection('app_logs')
    .orderBy('createdAt', 'desc')
    .limit(200)
    .get();
  const hits = [];
  for (const doc of snap.docs) {
    const d = doc.data() || {};
    const action = String(d.action || '');
    const details = String(d.details || '');
    if (
      /restauraci[oó]n/i.test(action) ||
      /restauraci[oó]n/i.test(details) ||
      d.isBackup === true
    ) {
      hits.push({
        id: doc.id,
        action,
        details: details.slice(0, 200),
        createdAt: d.createdAt,
        backupId: d.backupId || d.revertInfo?.backupId || null,
      });
      if (hits.length >= limitN) break;
    }
  }
  return hits;
}

async function listBackupManifests(db) {
  const snap = await db.collection('app_backups').get();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => String(b.id).localeCompare(String(a.id)));
}

async function countParticipantsInStorageBackup(bucket, storagePath) {
  const file = bucket.file(storagePath);
  const [buf] = await file.download();
  const parsed = JSON.parse(buf.toString('utf8'));
  const participants = Array.isArray(parsed.participants) ? parsed.participants : [];
  const events = Array.isArray(parsed.events) ? parsed.events : [];
  return {
    participants: participants.length,
    events: events.length,
    timestamp: parsed.timestamp ?? null,
    date: parsed.date ?? null,
  };
}

async function main() {
  const credPath = parseCredentialsArg();
  if (!credPath) {
    console.error('Indica credenciales: node scripts/audit-firestore-restore.mjs --credentials <ruta.json>');
    process.exit(1);
  }
  if (!existsSync(credPath)) {
    console.error(`No existe: ${credPath}`);
    process.exit(1);
  }

  const sa = await loadServiceAccountObject(credPath);
  const app = initializeApp({
    credential: cert(sa),
    projectId: PROJECT_ID,
    storageBucket: `${PROJECT_ID}.firebasestorage.app`,
  });

  const firestore = getFirestore(app, DATABASE_ID);
  const bucket = getStorage(app).bucket();

  console.log('=== Auditoría post-restauración ===');
  console.log(`Proyecto: ${PROJECT_ID} | BD: ${DATABASE_ID}`);
  console.log('');

  const [participantsCount, eventsCount, configSnap] = await Promise.all([
    countCollection(firestore, 'app_participants'),
    countCollection(firestore, 'app_events'),
    firestore.doc('app_data/config').get(),
  ]);
  const config = configSnap.exists ? configSnap.data() : {};
  console.log('--- Firestore (estado actual en servidor) ---');
  console.log(`app_participants: ${participantsCount}`);
  console.log(`app_events:       ${eventsCount}`);
  console.log(`dataBulkGeneration: ${config.dataBulkGeneration ?? 0}`);
  console.log(`lastBackupDate:     ${config.lastBackupDate ?? '(sin fecha)'}`);
  console.log('');

  const restoreLogs = await fetchRecentRestoreLogs(firestore);
  console.log('--- Últimos logs de restauración / copia (máx. 10) ---');
  if (!restoreLogs.length) {
    console.log('(No se encontraron entradas recientes con «Restauración» en los últimos 200 logs)');
  } else {
    for (const row of restoreLogs) {
      const when = row.createdAt?.toDate?.()
        ? row.createdAt.toDate().toISOString()
        : String(row.createdAt || '');
      console.log(`- [${when}] ${row.action}`);
      if (row.details) console.log(`    ${row.details}`);
      if (row.backupId) console.log(`    backupId: ${row.backupId}`);
    }
  }
  console.log('');

  const manifests = await listBackupManifests(firestore);
  console.log(`--- Copias en app_backups (${manifests.length} manifests) ---`);
  for (const m of manifests.slice(0, 12)) {
    const line = [`id=${m.id}`, `formatVersion=${m.formatVersion ?? '?'}`];
    if (m.storagePath) {
      try {
        const counts = await countParticipantsInStorageBackup(bucket, m.storagePath);
        line.push(`participants=${counts.participants}`, `events=${counts.events}`);
      } catch (e) {
        line.push(`(error leyendo Storage: ${e.message})`);
      }
    } else if (m.formatVersion === 2) {
      line.push('(chunks en Firestore, no contado aquí)');
    }
    console.log(`- ${line.join(' | ')}`);
  }
  if (manifests.length > 12) {
    console.log(`  … y ${manifests.length - 12} copias más`);
  }

  console.log('');
  console.log('--- Interpretación ---');
  console.log(
    'Si ejecutaste «Restaurar copia de seguridad», la app BORRA todos los app_participants y app_events'
  );
  console.log(
    'y los reemplaza solo con lo que trae la copia. Si la copia tenía ~50% de registros, Firestore quedó así.'
  );
  console.log(
    'Si ves el banner «Alinear caché y recargar» pero NO hay log de Restauración de Sistema, puede ser solo caché local.'
  );
  console.log('');
  console.log(
    'Recuperación: elige la copia con MÁS participants (arriba) y restaura solo si confirmas el conteo.'
  );
  console.log('Firebase Console → Firestore → registros-vnpm → app_participants (agregación) para verificar.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
