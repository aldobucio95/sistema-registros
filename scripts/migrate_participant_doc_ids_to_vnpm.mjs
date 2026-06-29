#!/usr/bin/env node
/**
 * Migra documentos de `app_participants` con id legado (p. ej. timestamp) al id estable
 * derivado del VNPM (`id_VNPM-...`), alineado con la app y `scripts/lib/vnpmParticipantDocId.mjs`.
 *
 * Requisitos:
 * - Archivo JSON de cuenta de servicio de Google Cloud (Firestore). Al ejecutar, se pedirá la ruta
 *   (o puedes pasarla con --credentials=ruta o --credentials ruta).
 *
 * Uso:
 *   node scripts/migrate_participant_doc_ids_to_vnpm.mjs --dry-run
 *   node scripts/migrate_participant_doc_ids_to_vnpm.mjs --apply
 *   node scripts/migrate_participant_doc_ids_to_vnpm.mjs --dry-run --credentials C:\\creds\\sa.json
 *   (Los .js deben hacer export default del objeto de cuenta de servicio.)
 *
 * Colecciones actualizadas:
 * - app_participants (fusión + borrado de docs legado)
 * - app_donations (campo participantId)
 * - app_responsiva_registry (id de documento + campo participantId)
 * - app_responsiva_sign_tokens (campo participantId)
 *
 * No migra archivos en Storage (rutas de firma siguen usando el id antiguo en el path); si hace falta,
 * renombrar objetos sería un paso aparte.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { pathToFileURL } from 'url';
import readline from 'node:readline/promises';
import { stdin as stdinStream, stdout as stdoutStream } from 'node:process';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldPath } from 'firebase-admin/firestore';
import {
  canonicalizeVnpPersonId,
  participantDocumentIdFromVnpPersonId,
  responsivaRegistryDocId,
} from './lib/vnpmParticipantDocId.mjs';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'registros-vnpm';
const DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || 'registros-vnpm';

const COL_PARTICIPANTS = 'app_participants';
const COL_DONATIONS = 'app_donations';
const COL_REGISTRY = 'app_responsiva_registry';
const COL_TOKENS = 'app_responsiva_sign_tokens';

function parseArgs() {
  if (process.argv.includes('--dry-run')) return { dryRun: true, apply: false };
  if (process.argv.includes('--apply')) return { dryRun: false, apply: true };
  return { invalid: true };
}

/**
 * Ruta al JSON por flag (--credentials= o --credentials <ruta>) o pregunta en consola.
 */
async function resolveCredentialsPath() {
  const eq = process.argv.find((a) => a.startsWith('--credentials='));
  if (eq) {
    return resolve(eq.slice('--credentials='.length).trim().replace(/^["']|["']$/g, ''));
  }
  const idx = process.argv.indexOf('--credentials');
  if (idx !== -1 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith('-')) {
    return resolve(process.argv[idx + 1].trim().replace(/^["']|["']$/g, ''));
  }

  const rl = readline.createInterface({ input: stdinStream, output: stdoutStream });
  try {
    const line = await rl.question(
      'Ruta al archivo de credenciales (.json de Google Cloud o .js que exporte el objeto): '
    );
    const trimmed = String(line || '').trim().replace(/^["']|["']$/g, '');
    if (!trimmed) {
      throw new Error('No se indicó ninguna ruta.');
    }
    return resolve(trimmed);
  } finally {
    rl.close();
  }
}

async function loadServiceAccountObject(credPath) {
  const lower = String(credPath).toLowerCase();
  if (lower.endsWith('.js') || lower.endsWith('.mjs')) {
    const mod = await import(pathToFileURL(resolve(credPath)).href);
    const obj = mod.default ?? mod;
    if (!obj || typeof obj !== 'object') {
      throw new Error('El archivo .js/.mjs debe usar export default { ... } con las credenciales.');
    }
    return obj;
  }
  const raw = readFileSync(credPath, 'utf8');
  return JSON.parse(raw);
}

async function initFirebaseAdmin(credPath) {
  if (!existsSync(credPath)) {
    throw new Error(`No existe el archivo de credenciales: ${credPath}`);
  }
  const sa = await loadServiceAccountObject(credPath);
  const credential = cert(sa);
  return initializeApp({ credential, projectId: PROJECT_ID });
}

function parseRegisteredAtMs(data) {
  const v = data?.registeredAt;
  if (v == null) return 0;
  if (typeof v?.toDate === 'function') return v.toDate().getTime();
  const t = Date.parse(String(v));
  return Number.isFinite(t) ? t : 0;
}

function mergePaymentHistories(list) {
  const seen = new Set();
  const out = [];
  for (const row of list) {
    if (!row || typeof row !== 'object') continue;
    const key = `${row.recordedAt}|${row.amount}|${row.id}|${row.date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  out.sort((a, b) => String(a.recordedAt || a.date || '').localeCompare(String(b.recordedAt || b.date || '')));
  return out;
}

function mergeWhatsAppNotifications(list) {
  const seen = new Set();
  const out = [];
  for (const row of list) {
    if (!row || typeof row !== 'object') continue;
    const key = row.id || JSON.stringify(row);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function remapSpouse(pid, idMap) {
  const s = String(pid || '').trim();
  if (!s) return '';
  return idMap.has(s) ? idMap.get(s) : s;
}

/**
 * @param {Array<{ id: string, data: object }>} sources
 * @param {string} targetId
 * @param {Map<string, string>} idMap
 */
function mergeParticipantSources(sources, targetId, idMap) {
  const sorted = [...sources].sort((a, b) => parseRegisteredAtMs(b.data) - parseRegisteredAtMs(a.data));
  if (!sorted.length) throw new Error('mergeParticipantSources: sin fuentes');
  const base = { ...sorted[0].data };
  base.id = targetId;
  const vnp = canonicalizeVnpPersonId(sorted[0].data?.vnpPersonId);
  if (vnp) base.vnpPersonId = vnp;

  const histories = sorted.flatMap((s) => (Array.isArray(s.data.paymentHistory) ? s.data.paymentHistory : []));
  base.paymentHistory = mergePaymentHistories(histories);

  const wa = sorted.flatMap((s) =>
    Array.isArray(s.data.whatsAppFinanceNotifications) ? s.data.whatsAppFinanceNotifications : []
  );
  base.whatsAppFinanceNotifications = mergeWhatsAppNotifications(wa);

  base.spouseParticipantId = remapSpouse(base.spouseParticipantId, idMap);
  return base;
}

async function fetchAllDocs(db, collectionName) {
  const col = db.collection(collectionName);
  const out = [];
  let lastSnap = null;
  const page = 400;
  while (true) {
    let q = col.orderBy(FieldPath.documentId()).limit(page);
    if (lastSnap) q = q.startAfter(lastSnap);
    const snap = await q.get();
    if (snap.empty) break;
    for (const d of snap.docs) {
      out.push({ id: d.id, data: d.data() || {} });
    }
    if (snap.docs.length < page) break;
    lastSnap = snap.docs[snap.docs.length - 1];
  }
  return out;
}

async function commitBatches(db, ops, chunkSize = 400) {
  for (let i = 0; i < ops.length; i += chunkSize) {
    const batch = db.batch();
    for (const op of ops.slice(i, i + chunkSize)) {
      op(batch);
    }
    await batch.commit();
  }
}

async function main() {
  const parsed = parseArgs();
  if (parsed.invalid) {
    console.error('Uso: node scripts/migrate_participant_doc_ids_to_vnpm.mjs --dry-run | --apply');
    console.error('Opcional: --credentials=ruta.json o --credentials ruta.json (si no, se pregunta por la ruta).');
    process.exit(1);
  }
  const { dryRun, apply } = parsed;

  let credPath;
  try {
    credPath = await resolveCredentialsPath();
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }
  const app = await initFirebaseAdmin(credPath);
  const db = getFirestore(app, DATABASE_ID);

  console.log(`Proyecto: ${PROJECT_ID}, base de datos: ${DATABASE_ID}, modo: ${dryRun ? 'DRY-RUN' : 'APPLY'}`);

  const participants = await fetchAllDocs(db, COL_PARTICIPANTS);
  /** @type {Map<string, Array<{ id: string, data: object }>>} */
  const legacyByTarget = new Map();

  let skippedNoVnpm = 0;
  let alreadyCanonical = 0;

  for (const row of participants) {
    const targetId = participantDocumentIdFromVnpPersonId(row.data?.vnpPersonId);
    if (!targetId) {
      skippedNoVnpm++;
      continue;
    }
    if (row.id === targetId) {
      alreadyCanonical++;
      continue;
    }
    if (!legacyByTarget.has(targetId)) legacyByTarget.set(targetId, []);
    legacyByTarget.get(targetId).push({ id: row.id, data: row.data });
  }

  /** @type {Map<string, string>} idMap: oldId -> targetId */
  const idMap = new Map();
  for (const [targetId, legacies] of legacyByTarget) {
    for (const { id } of legacies) {
      if (id !== targetId) idMap.set(id, targetId);
    }
  }

  const plans = [];
  for (const [targetId, legacies] of legacyByTarget) {
    const targetRef = db.collection(COL_PARTICIPANTS).doc(targetId);
    const targetSnap = await targetRef.get();
    const sources = [...legacies];
    if (targetSnap.exists) {
      const alreadyIn = legacies.some((l) => l.id === targetId);
      if (!alreadyIn) {
        sources.push({ id: targetId, data: targetSnap.data() || {} });
      }
    }
    const merged = mergeParticipantSources(sources, targetId, idMap);
    const toDelete = legacies.map((l) => l.id).filter((oid) => oid !== targetId);
    plans.push({ targetId, sources: sources.map((s) => s.id), merged, toDelete });
  }

  console.log(
    JSON.stringify(
      {
        totalParticipants: participants.length,
        alreadyCanonical,
        skippedNoStableVnpmId: skippedNoVnpm,
        legacyGroups: legacyByTarget.size,
        idRemappings: idMap.size,
      },
      null,
      2
    )
  );

  for (const p of plans.slice(0, 15)) {
    console.log(
      `- target ${p.targetId} <= fuentes [${p.sources.join(', ')}], borrar [${p.toDelete.join(', ')}]`
    );
  }
  if (plans.length > 15) console.log(`  ... y ${plans.length - 15} grupos más`);

  if (dryRun) {
    console.log('\nDry-run: no se escribió nada. Ejecuta con --apply para aplicar.');
    process.exit(0);
  }

  // ——— APPLY ———
  const writeOps = [];
  for (const plan of plans) {
    writeOps.push((batch) => {
      batch.set(db.collection(COL_PARTICIPANTS).doc(plan.targetId), plan.merged);
    });
  }
  await commitBatches(db, writeOps);
  console.log(`Escritos ${plans.length} documentos canónicos en ${COL_PARTICIPANTS}.`);

  const mergedTargetIds = new Set(plans.map((p) => p.targetId));

  const donations = await fetchAllDocs(db, COL_DONATIONS).catch(() => []);
  const donationUpdates = [];
  for (const { id, data } of donations) {
    const pid = String(data.participantId || '').trim();
    if (pid && idMap.has(pid)) {
      donationUpdates.push((batch) => {
        batch.update(db.collection(COL_DONATIONS).doc(id), { participantId: idMap.get(pid) });
      });
    }
  }
  await commitBatches(db, donationUpdates);
  console.log(`Actualizados ${donationUpdates.length} registros en ${COL_DONATIONS}.`);

  const spouseUpdates = [];
  for (const row of participants) {
    if (idMap.has(row.id)) continue;
    if (mergedTargetIds.has(row.id)) continue;
    const sp = String(row.data.spouseParticipantId || '').trim();
    if (sp && idMap.has(sp)) {
      spouseUpdates.push((batch) => {
        batch.update(db.collection(COL_PARTICIPANTS).doc(row.id), {
          spouseParticipantId: idMap.get(sp),
        });
      });
    }
  }
  await commitBatches(db, spouseUpdates);
  console.log(`Actualizado spouseParticipantId en ${spouseUpdates.length} participantes.`);

  const registry = await fetchAllDocs(db, COL_REGISTRY).catch(() => []);
  const registryOps = [];
  for (const { id, data } of registry) {
    const pid = String(data.participantId || '').trim();
    if (!pid || !idMap.has(pid)) continue;
    const newPid = idMap.get(pid);
    const ev = String(data.eventId || '').trim();
    const newDocId = responsivaRegistryDocId(ev, newPid);
    if (newDocId === id) {
      registryOps.push((batch) => {
        batch.update(db.collection(COL_REGISTRY).doc(id), { participantId: newPid });
      });
    } else {
      const newRef = db.collection(COL_REGISTRY).doc(newDocId);
      const existingNew = await newRef.get();
      const now = Date.now();
      let next = { ...data, participantId: newPid, updatedAt: now };
      if (existingNew.exists) {
        const ex = existingNew.data() || {};
        next = {
          ...ex,
          ...data,
          participantId: newPid,
          updatedAt: Math.max(Number(ex.updatedAt) || 0, Number(data.updatedAt) || 0, now),
        };
      }
      registryOps.push((batch) => {
        batch.set(newRef, next);
        batch.delete(db.collection(COL_REGISTRY).doc(id));
      });
    }
  }
  await commitBatches(db, registryOps, 200);
  console.log(`Responsiva registry: ${registryOps.length} documentos (set/delete/update).`);

  const tokens = await fetchAllDocs(db, COL_TOKENS).catch(() => []);
  const tokenUpdates = [];
  for (const { id, data } of tokens) {
    const pid = String(data.participantId || '').trim();
    if (pid && idMap.has(pid)) {
      tokenUpdates.push((batch) => {
        batch.update(db.collection(COL_TOKENS).doc(id), { participantId: idMap.get(pid) });
      });
    }
  }
  await commitBatches(db, tokenUpdates);
  console.log(`Tokens responsiva: ${tokenUpdates.length} actualizaciones.`);

  const deleteOps = [];
  for (const oid of idMap.keys()) {
    deleteOps.push((batch) => {
      batch.delete(db.collection(COL_PARTICIPANTS).doc(oid));
    });
  }
  await commitBatches(db, deleteOps);
  console.log(`Eliminados ${deleteOps.length} documentos legado de ${COL_PARTICIPANTS}.`);

  console.log('\nMigración terminada.');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
