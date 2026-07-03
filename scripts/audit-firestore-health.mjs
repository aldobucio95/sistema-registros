#!/usr/bin/env node
/**
 * Auditoría de salud de Firestore (participantes, eventos, robots, restauraciones).
 *
 * Uso:
 *   node scripts/audit-firestore-health.mjs --credentials C:\ruta\sa.json
 *   node scripts/audit-firestore-health.mjs --credentials C:\ruta\sa.json --event-id <id>
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { pathToFileURL } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'registros-vnpm';
const DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || 'registros-vnpm';

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

const PARTICIPANT_STATUS_CANCELLED = 'cancelled';

function isActiveParticipant(p) {
  const st = String(p?.status || 'active').trim();
  return st === 'active' || st === 'waitlist' || st === PARTICIPANT_STATUS_CANCELLED;
}

function countRosterUnitsSimple(rows, eventType) {
  if (eventType === 'Bautizos') {
    return rows.filter((p) => {
      const st = String(p?.status || 'active');
      if (st === 'archived') return false;
      return true;
    }).length;
  }
  return rows.filter((p) => isActiveParticipant(p)).length;
}

function eventDocHealth(ev) {
  const missing = [];
  if (!String(ev?.name || '').trim()) missing.push('name');
  if (!String(ev?.eventType || '').trim()) missing.push('eventType');
  if (!Array.isArray(ev?.locations) || ev.locations.length === 0) missing.push('locations');
  return missing;
}

async function main() {
  const credPath = parseArg('--credentials');
  const filterEventId = parseArg('--event-id');
  if (!credPath) {
    console.error('Uso: node scripts/audit-firestore-health.mjs --credentials <sa.json> [--event-id <id>]');
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
  const db = getFirestore(app, DATABASE_ID);
  const bucket = getStorage(app).bucket();

  console.log('=== Auditoría de salud Firestore ===');
  console.log(`Proyecto: ${PROJECT_ID} | BD: ${DATABASE_ID}`);
  console.log('');

  const [participantsAgg, eventsSnap, configSnap] = await Promise.all([
    db.collection('app_participants').count().get(),
    db.collection('app_events').get(),
    db.doc('app_data/config').get(),
  ]);
  const totalParticipants = participantsAgg.data().count;
  const config = configSnap.exists ? configSnap.data() : {};

  console.log('--- Totales en servidor ---');
  console.log(`app_participants (docs):     ${totalParticipants}`);
  console.log(`app_events (docs):           ${eventsSnap.size}`);
  console.log(`dataBulkGeneration:          ${config.dataBulkGeneration ?? 0}`);
  console.log(`lastBackupDate:              ${config.lastBackupDate ?? '—'}`);
  console.log(`logStorageMaxEntries:        ${config.logStorageMaxEntries ?? '—'}`);
  console.log('');

  const participantsByEvent = new Map();
  const statusGlobal = { active: 0, waitlist: 0, archived: 0, cancelled: 0, other: 0 };

  const partSnap = await db.collection('app_participants').select('eventId', 'status', 'name', 'location').get();
  for (const doc of partSnap.docs) {
    const d = doc.data();
    const eid = String(d.eventId || '').trim() || '(sin eventId)';
    if (!participantsByEvent.has(eid)) {
      participantsByEvent.set(eid, []);
    }
    participantsByEvent.get(eid).push({ id: doc.id, ...d });
    const st = String(d.status || 'active');
    if (st in statusGlobal) statusGlobal[st] += 1;
    else statusGlobal.other += 1;
  }

  console.log('--- Participantes por status (global) ---');
  for (const [k, v] of Object.entries(statusGlobal)) {
    if (v) console.log(`  ${k}: ${v}`);
  }
  console.log('');

  console.log('--- Eventos: conteo real vs activeRosterUnitsTotal ---');
  const eventIssues = [];
  for (const evDoc of eventsSnap.docs) {
    if (filterEventId && evDoc.id !== filterEventId) continue;
    const ev = { id: evDoc.id, ...evDoc.data() };
    const rows = participantsByEvent.get(evDoc.id) || [];
    const stored = Math.floor(Number(ev.activeRosterUnitsTotal) || 0);
    const missingFields = eventDocHealth(ev);
    const activeRows = rows.filter((p) => String(p.status || 'active') !== 'archived');
    const simpleCount = countRosterUnitsSimple(activeRows, ev.eventType);

    const line = [
      `id=${ev.id}`,
      `name=${String(ev.name || '—').slice(0, 40)}`,
      `type=${ev.eventType || '?'}`,
      `docs=${rows.length}`,
      `activos≈${activeRows.length}`,
      `storedTotal=${stored}`,
      simpleCount !== stored ? `⚠ delta=${simpleCount - stored}` : 'total OK',
    ];
    console.log(`- ${line.join(' | ')}`);
    if (missingFields.length) {
      eventIssues.push({ id: ev.id, name: ev.name, missingFields });
    }
  }
  console.log('');

  if (eventIssues.length) {
    console.log('--- Eventos con documento INCOMPLETO (posible revert de Transporte) ---');
    for (const issue of eventIssues) {
      console.log(`- ${issue.id} (${issue.name || 'sin nombre'}): faltan ${issue.missingFields.join(', ')}`);
    }
    console.log('');
  }

  const logsSnap = await db.collection('app_logs').orderBy('createdAt', 'desc').limit(300).get();
  const restoreHits = [];
  const systemHits = [];
  for (const doc of logsSnap.docs) {
    const d = doc.data() || {};
    const action = String(d.action || '');
    const details = String(d.details || '');
    const user = String(d.username || '');
    if (/restauraci[oó]n/i.test(action) || /restauraci[oó]n/i.test(details)) {
      restoreHits.push({ id: doc.id, action, details: details.slice(0, 160), user, createdAt: d.createdAt });
    }
    if (user === 'Sistema' || /purga|copia de seguridad|recorte|robot/i.test(details)) {
      systemHits.push({ id: doc.id, action, details: details.slice(0, 120), createdAt: d.createdAt });
    }
    if (restoreHits.length >= 8 && systemHits.length >= 8) break;
  }

  console.log('--- Últimas restauraciones (app_logs) ---');
  if (!restoreHits.length) console.log('  (ninguna en últimos 300 logs)');
  else {
    for (const r of restoreHits.slice(0, 8)) {
      const when = r.createdAt?.toDate?.() ? r.createdAt.toDate().toISOString() : '';
      console.log(`  [${when}] ${r.action} — ${r.user}`);
      console.log(`    ${r.details}`);
    }
  }
  console.log('');

  console.log('--- Acciones automáticas recientes (Sistema / purga / copia) ---');
  if (!systemHits.length) console.log('  (ninguna destacada en últimos 300 logs)');
  else {
    for (const r of systemHits.slice(0, 8)) {
      const when = r.createdAt?.toDate?.() ? r.createdAt.toDate().toISOString() : '';
      console.log(`  [${when}] ${r.action}`);
      console.log(`    ${r.details}`);
    }
  }
  console.log('');

  const backupsSnap = await db.collection('app_backups').get();
  const backups = backupsSnap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => String(b.id).localeCompare(String(a.id)));
  console.log(`--- Copias app_backups (${backups.length}) vs participantes actuales (${totalParticipants}) ---`);
  for (const b of backups.slice(0, 8)) {
    if (b.storagePath) {
      try {
        const [buf] = await bucket.file(b.storagePath).download();
        const parsed = JSON.parse(buf.toString('utf8'));
        const n = Array.isArray(parsed.participants) ? parsed.participants.length : 0;
        const diff = n - totalParticipants;
        console.log(`  ${b.id}: backup=${n} participantes | vs hoy ${diff >= 0 ? '+' : ''}${diff}`);
      } catch (e) {
        console.log(`  ${b.id}: no se pudo leer Storage (${e.message})`);
      }
    } else {
      console.log(`  ${b.id}: formato legacy/chunks`);
    }
  }

  console.log('');
  console.log('--- Robots en Cloud Functions (NO borran inscritos de eventos activos) ---');
  console.log('  • syncEventActiveRosterUnitsOnParticipantWrite — recalcula activeRosterUnitsTotal');
  console.log('  • trimActivityLogsScheduled — cada 6 h recorta app_logs (no participantes)');
  console.log('  • purgeSensitiveDataAfterEventRetention — 3:00 CDMX, borra CAMPOS sensibles 90 días POST-evento');
  console.log('  • enqueueWeeklyPaymentReminderWhatsApp — lunes 11:00, cola WhatsApp (no borra docs)');
  console.log('  • purgeStaleAnonymousAuthUsers — medianoche, solo Auth anónimo');
  console.log('');
  console.log('La restauración de Transporte (2:10 a.m.) solo afecta transportPlanning del evento.');
  console.log('Si los docs existen pero el evento perdió name/eventType, la app puede mostrar menos registros.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
