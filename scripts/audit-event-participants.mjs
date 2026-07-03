#!/usr/bin/env node
/**
 * Auditoría de participantes reales en Firestore para un evento.
 *
 * Uso:
 *   node scripts/audit-event-participants.mjs --event-id evt_1776464008680 --credentials C:\sa.json
 *   node scripts/audit-event-participants.mjs --event-id evt_1776464008680 --credentials C:\sa.json --json
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { pathToFileURL } from 'url';
import { createRequire } from 'module';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const require = createRequire(import.meta.url);
const rosterCounts = require('../functions/lib/dashboardTodosRosterTotal.cjs');
const {
  computeDashboardTodosRosterTotal,
  filterDashboardTodosRosterRows,
  expandBautizosGlobalRegistryRows,
  computeBautizosActiveBreakdown,
  getBautizosCompanionsArray,
} = rosterCounts;

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'registros-vnpm';
const DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || 'registros-vnpm';

const EVENT_ID_DEFAULT = 'evt_1776464008680';

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
    const obj = mod.default ?? mod;
    if (!obj || typeof obj !== 'object') {
      throw new Error('El archivo .js/.mjs debe exportar las credenciales como default.');
    }
    return obj;
  }
  return JSON.parse(readFileSync(credPath, 'utf8'));
}

function resolveCredentialsPath() {
  const fromArg = parseArg('--credentials');
  if (fromArg) return resolve(fromArg);
  const fromEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (fromEnv && existsSync(fromEnv)) return resolve(fromEnv);
  return null;
}

function normStatus(p) {
  return String(p?.status || 'active').trim() || 'active';
}

function hasName(p) {
  return Boolean(String(p?.name || '').trim());
}

function paidAmount(p) {
  const n = parseFloat(p?.paid);
  return Number.isFinite(n) ? n : 0;
}

function isCompanionWaitlistPhantomStoredParticipant(personLike) {
  if (personLike?._isCompanionWaitlistVirtual === true) return true;
  return String(personLike?.id || '').trim().startsWith('cw:');
}

function isCompanionWaitlistPending(companionLike) {
  return companionLike?.companionWaitlistPending === true;
}

function rowAtLocation(row, locNorm) {
  return String(row?.location || '').trim() === locNorm;
}

/** Misma regla que `analyzeBautizosWaitlistExpandedAtLocation` (sin dependencias de Firebase cliente). */
function computeWaitlistCountsForEventAudit(participants, eventRow, locations) {
  const evId = String(eventRow?.id || '').trim();
  const locationList = (locations || []).map((x) => String(x).trim()).filter(Boolean);
  const bySede = Object.fromEntries(locationList.map((loc) => [loc, { total: 0, titulars: 0, companionsAll: 0 }]));

  if (!evId || String(eventRow?.eventType || '') !== 'Bautizos' || locationList.length === 0) {
    return { bySede, global: { total: 0 } };
  }

  const roster = (participants || []).filter(
    (p) =>
      String(p?.eventId || '') === evId &&
      normStatus(p) !== 'archived' &&
      normStatus(p) !== 'cancelled' &&
      !isCompanionWaitlistPhantomStoredParticipant(p)
  );

  for (const loc of locationList) {
    const locNorm = String(loc).trim();
    const waitlistTitulars = roster.filter(
      (p) => normStatus(p) === 'waitlist' && rowAtLocation(p, locNorm)
    );
    const seen = new Set();
    let total = 0;

    const partA = expandBautizosGlobalRegistryRows(waitlistTitulars, roster);
    for (const row of partA) {
      if (!rowAtLocation(row, locNorm)) continue;
      const id = String(row?.id || '').trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      total += 1;
    }

    for (const host of roster) {
      if (normStatus(host) !== 'active' || !rowAtLocation(host, locNorm)) continue;
      for (const c of getBautizosCompanionsArray(host)) {
        if (!isCompanionWaitlistPending(c)) continue;
        const vid = `cw:${String(host.id || '').trim()}::${String(c?.id || '').trim()}`;
        if (seen.has(vid)) continue;
        seen.add(vid);
        total += 1;
      }
    }

    bySede[loc] = {
      total,
      titulars: waitlistTitulars.length,
      companionsAll: Math.max(0, total - waitlistTitulars.length),
    };
  }

  const globalTotal = locationList.reduce((sum, loc) => sum + (bySede[loc]?.total || 0), 0);
  return { bySede, global: { total: globalTotal } };
}

function groupCount(map, key) {
  const k = key || '(vacío)';
  map.set(k, (map.get(k) || 0) + 1);
}

function inferEventType(eventRow, participants) {
  const fromDoc = String(eventRow?.eventType || '').trim();
  if (fromDoc) return fromDoc;
  let bautizosHints = 0;
  for (const p of participants) {
    if (String(p?.bautizosAttendanceType || '').trim()) bautizosHints += 1;
    if (Array.isArray(p?.bautizosCompanions) && p.bautizosCompanions.length > 0) bautizosHints += 1;
  }
  return bautizosHints > 0 ? 'Bautizos' : '';
}

function countEmbeddedCompanions(participants, { statusFilter } = {}) {
  let hosts = 0;
  let companionsNamed = 0;
  let companionsWaitlistPending = 0;
  for (const p of participants) {
    if (isCompanionWaitlistPhantomStoredParticipant(p)) continue;
    const st = normStatus(p);
    if (statusFilter && !statusFilter(st)) continue;
    const comps = getBautizosCompanionsArray(p).filter((c) => String(c?.name || '').trim());
    if (comps.length === 0) continue;
    hosts += 1;
    companionsNamed += comps.length;
    companionsWaitlistPending += comps.filter((c) => isCompanionWaitlistPending(c)).length;
  }
  return { hosts, companionsNamed, companionsWaitlistPending };
}

async function main() {
  const eventId = parseArg('--event-id') || EVENT_ID_DEFAULT;
  const asJson = process.argv.includes('--json');
  const credPath = resolveCredentialsPath();

  if (!credPath) {
    console.error(
      'Indica credenciales:\n' +
        `  node scripts/audit-event-participants.mjs --event-id ${eventId} --credentials C:\\ruta\\sa.json\n` +
        '  o define GOOGLE_APPLICATION_CREDENTIALS'
    );
    process.exit(1);
  }
  if (!existsSync(credPath)) {
    console.error(`No existe el archivo de credenciales: ${credPath}`);
    process.exit(1);
  }

  const sa = await loadServiceAccountObject(credPath);
  const app = initializeApp({
    credential: cert(sa),
    projectId: PROJECT_ID,
  });
  const db = getFirestore(app, DATABASE_ID);

  const evRef = db.doc(`app_events/${eventId}`);
  const evSnap = await evRef.get();

  const aggSnap = await db.collection('app_participants').where('eventId', '==', eventId).count().get();
  const countFromAggregation = aggSnap.data().count;

  const partSnap = await db.collection('app_participants').where('eventId', '==', eventId).get();

  const byStatus = new Map();
  const byLocation = new Map();
  const byAttendance = new Map();
  let withName = 0;
  let withoutName = 0;
  let withPaid = 0;
  let totalPaid = 0;
  let archived = 0;
  let activeLike = 0;
  let waitlist = 0;
  let cancelled = 0;

  const sampleIds = [];
  const participants = partSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const inferredEventType = inferEventType(evSnap.exists ? evSnap.data() : null, participants);
  const eventForLogic = {
    id: eventId,
    ...(evSnap.exists ? evSnap.data() : {}),
    eventType: inferredEventType || evSnap.data()?.eventType || '',
  };
  const locations = Array.isArray(eventForLogic.locations) ? eventForLogic.locations : [];

  const activeBreakdown =
    eventForLogic.eventType === 'Bautizos'
      ? computeBautizosActiveBreakdown(filterDashboardTodosRosterRows(participants, eventForLogic))
      : null;
  const activeRosterTotal = computeDashboardTodosRosterTotal(participants, eventForLogic);
  const waitlistCounts =
    locations.length > 0
      ? computeWaitlistCountsForEventAudit(participants, eventForLogic, locations)
      : { global: { total: 0 }, bySede: {} };

  const waitlistTitularDocs = participants.filter(
    (p) =>
      !isCompanionWaitlistPhantomStoredParticipant(p) &&
      normStatus(p) === 'waitlist'
  ).length;

  const embeddedActive = countEmbeddedCompanions(participants, {
    statusFilter: (st) => st === 'active',
  });
  const embeddedWaitlist = countEmbeddedCompanions(participants, {
    statusFilter: (st) => st === 'waitlist',
  });
  const embeddedActiveHosts = countEmbeddedCompanions(
    participants.filter((p) => normStatus(p) === 'active'),
    {}
  );
  const companionWaitlistOnActiveHosts = countEmbeddedCompanions(
    participants.filter((p) => normStatus(p) === 'active'),
    {}
  ).companionsWaitlistPending;

  for (const doc of partSnap.docs) {
    const p = doc.data();
    if (sampleIds.length < 5) sampleIds.push(doc.id);
    const st = normStatus(p);
    groupCount(byStatus, st);
    groupCount(byLocation, String(p.location || '').trim());
    groupCount(byAttendance, String(p.bautizosAttendanceType || p.attendanceType || '').trim());

    if (hasName(p)) withName += 1;
    else withoutName += 1;

    const paid = paidAmount(p);
    if (paid > 0) {
      withPaid += 1;
      totalPaid += paid;
    }

    if (st === 'archived') archived += 1;
    else if (st === 'waitlist') waitlist += 1;
    else if (st === 'cancelled') cancelled += 1;
    else activeLike += 1;
  }

  const event = evSnap.exists ? { id: eventId, ...evSnap.data() } : null;
  const storedTotal = event ? Math.floor(Number(event.activeRosterUnitsTotal) || 0) : null;

  const rosterUnits = {
    eventTypeUsed: eventForLogic.eventType || '(desconocido)',
    eventTypeInferred: !String(event?.eventType || '').trim() && Boolean(inferredEventType),
    active: {
      titulares: activeBreakdown?.titulares ?? filterDashboardTodosRosterRows(participants, eventForLogic).length,
      acompanantesCanonicos: activeBreakdown?.acompanantesCanonicos ?? Math.max(0, activeRosterTotal - filterDashboardTodosRosterRows(participants, eventForLogic).length),
      totalTitularMasAcompanantes: activeRosterTotal,
      embeddedCompanionsRawOnActiveHosts: embeddedActiveHosts.companionsNamed,
      companionWaitlistPendingOnActiveHosts: companionWaitlistOnActiveHosts,
    },
    waitlist: {
      titularDocs: waitlistTitularDocs,
      totalTitularMasAcompanantes: waitlistCounts.global.total,
      acompanantesCanonicos: Math.max(0, waitlistCounts.global.total - waitlistTitularDocs),
      embeddedCompanionsRawOnWaitlistHosts: embeddedWaitlist.companionsNamed,
      bySede: Object.fromEntries(
        Object.entries(waitlistCounts.bySede || {}).map(([loc, s]) => [
          loc,
          {
            total: s.total,
            titulares: s.titulars,
            acompanantes: s.companionsAll ?? Math.max(0, (s.total || 0) - (s.titulars || 0)),
          },
        ])
      ),
      typeLines: [],
    },
    userExpected: { activeTotal: 497, waitlistTotal: 123 },
    deltaVsExpected: {
      active: activeRosterTotal - 497,
      waitlist: waitlistCounts.global.total - 123,
    },
  };

  const eventHealth = {
    exists: evSnap.exists,
    name: event?.name ?? null,
    eventType: event?.eventType ?? null,
    startDate: event?.startDate ?? null,
    endDate: event?.endDate ?? null,
    paymentDeadlineDate: event?.paymentDeadlineDate ?? null,
    locations: Array.isArray(event?.locations) ? event.locations : [],
    bautizosListPriceFood: event?.bautizosListPriceFood ?? null,
    bautizosListPriceTransport: event?.bautizosListPriceTransport ?? null,
    activeRosterUnitsTotal: storedTotal,
  };

  const report = {
    auditedAt: new Date().toISOString(),
    projectId: PROJECT_ID,
    databaseId: DATABASE_ID,
    eventId,
    event: eventHealth,
    participants: {
      countAggregation: countFromAggregation,
      countQueryDocs: partSnap.size,
      countsMatch: countFromAggregation === partSnap.size,
      withName,
      withoutName,
      withPaid,
      totalPaidSum: Math.round(totalPaid * 100) / 100,
      activeLike,
      waitlist,
      cancelled,
      archived,
      notArchived: partSnap.size - archived,
      byStatus: Object.fromEntries([...byStatus.entries()].sort((a, b) => b[1] - a[1])),
      byLocation: Object.fromEntries([...byLocation.entries()].sort((a, b) => b[1] - a[1])),
      byAttendanceType: Object.fromEntries([...byAttendance.entries()].sort((a, b) => b[1] - a[1])),
      sampleDocIds: sampleIds,
    },
    dashboardComparison: {
      activeRosterUnitsTotalInEvent: storedTotal,
      participantDocsNotArchived: partSnap.size - archived,
      deltaStoredVsNotArchived:
        storedTotal != null ? storedTotal - (partSnap.size - archived) : null,
      activeRosterComputed: activeRosterTotal,
      waitlistExpandedComputed: waitlistCounts.global.total,
    },
    rosterUnits,
  };

  if (asJson) {
    const outPath = parseArg('--out') || `audit-event-${eventId}.json`;
    writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(JSON.stringify(report, null, 2));
    console.error(`\nGuardado: ${outPath}`);
    return;
  }

  console.log('=== Auditoría de participantes por evento ===');
  console.log(`Evento: ${eventId}`);
  console.log(`Proyecto: ${PROJECT_ID} | BD: ${DATABASE_ID}`);
  console.log(`Fecha auditoría: ${report.auditedAt}`);
  console.log('');

  console.log('--- Documento app_events ---');
  if (!evSnap.exists) {
    console.log('  ⚠ NO EXISTE el documento del evento');
  } else {
    console.log(`  name:                 ${eventHealth.name ?? '—'}`);
    console.log(`  eventType:            ${eventHealth.eventType ?? '—'}`);
    console.log(`  startDate / endDate:  ${eventHealth.startDate ?? '—'} / ${eventHealth.endDate ?? '—'}`);
    console.log(`  paymentDeadlineDate:  ${eventHealth.paymentDeadlineDate ?? '—'}`);
    console.log(`  locations (${eventHealth.locations.length}): ${eventHealth.locations.join(', ') || '—'}`);
    console.log(`  precios comida/trans: ${eventHealth.bautizosListPriceFood ?? '—'} / ${eventHealth.bautizosListPriceTransport ?? '—'}`);
    console.log(`  activeRosterUnitsTotal (campo en evento): ${storedTotal ?? '—'}`);
    if (!eventHealth.name || !eventHealth.eventType || !eventHealth.startDate) {
      console.log('  ⚠ Evento INCOMPLETO — explica dashboard sin fechas/filtros (bug revert Transporte)');
    }
  }
  console.log('');

  console.log('--- Participantes en app_participants (servidor) ---');
  console.log(`  Conteo agregación Firestore:  ${countFromAggregation}`);
  console.log(`  Docs leídos (query):          ${partSnap.size}`);
  if (!report.participants.countsMatch) {
    console.log('  ⚠ Los conteos no coinciden — reintenta o revisa índices');
  }
  console.log(`  Con nombre:                   ${withName}`);
  console.log(`  Sin nombre (filas vacías):    ${withoutName}`);
  console.log(`  Con abono > 0:                ${withPaid}`);
  console.log(`  Suma paid (aprox dashboard):  $${totalPaid.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);
  console.log('');
  console.log('  Por status:');
  for (const [k, v] of [...byStatus.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${k}: ${v}`);
  }
  console.log('');
  console.log('  Por sede (location):');
  for (const [k, v] of [...byLocation.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${k}: ${v}`);
  }
  console.log('');
  console.log('  Por tipo asistencia (muestra):');
  for (const [k, v] of [...byAttendance.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
    console.log(`    ${k || '(sin tipo)'}: ${v}`);
  }
  console.log('');

  console.log('--- Comparación con dashboard ---');
  console.log(`  Registros totales (campo evento):     ${storedTotal ?? '—'}`);
  console.log(`  Docs participante no archivados:      ${partSnap.size - archived}`);
  console.log(`  Delta campo vs docs:                  ${report.dashboardComparison.deltaStoredVsNotArchived ?? '—'}`);
  console.log('');
  console.log('--- Titulares + acompañantes (lógica app / dashboard) ---');
  console.log(`  eventType usado:                      ${rosterUnits.eventTypeUsed}${rosterUnits.eventTypeInferred ? ' (inferido)' : ''}`);
  console.log('');
  console.log('  ACTIVOS (titular + acompañante canónico):');
  console.log(`    Titulares en roster activo:         ${rosterUnits.active.titulares}`);
  console.log(`    Acompañantes canónicos:             ${rosterUnits.active.acompanantesCanonicos}`);
  console.log(`    TOTAL activos:                      ${rosterUnits.active.totalTitularMasAcompanantes}`);
  console.log(`    (esperado usuario:                  497, delta ${rosterUnits.deltaVsExpected.active >= 0 ? '+' : ''}${rosterUnits.deltaVsExpected.active})`);
  console.log(`    Acomp. en espera ligados a activos: ${rosterUnits.active.companionWaitlistPendingOnActiveHosts}`);
  console.log('');
  console.log('  LISTA DE ESPERA (titular + acompañante expandido):');
  console.log(`    Titulares waitlist (docs):          ${rosterUnits.waitlist.titularDocs}`);
  console.log(`    Acompañantes en espera (canónico):  ${rosterUnits.waitlist.acompanantesCanonicos}`);
  console.log(`    TOTAL lista de espera:              ${rosterUnits.waitlist.totalTitularMasAcompanantes}`);
  console.log(`    (esperado usuario:                  123, delta ${rosterUnits.deltaVsExpected.waitlist >= 0 ? '+' : ''}${rosterUnits.deltaVsExpected.waitlist})`);
  if (waitlistCounts.global.lines?.length) {
    console.log('    Desglose por tipo (espera):');
    for (const line of waitlistCounts.global.lines) {
      console.log(`      ${line.label}: ${line.count}`);
    }
  }
  console.log('');
  console.log('  Por sede (espera expandida):');
  for (const [loc, s] of Object.entries(rosterUnits.waitlist.bySede).sort((a, b) => b[1].total - a[1].total)) {
    console.log(`    ${loc}: total ${s.total} (tit ${s.titulares} + acomp ${s.acompanantes})`);
  }
  console.log('');
  console.log('Interpretación:');
  console.log('  • TOTAL activos = misma regla que «Registros totales» del dashboard (modo Todos)');
  console.log('  • TOTAL espera = titulares waitlist + acompañantes canónicos + acomp. pendientes en activos');
  console.log('  • Docs Firestore (265) ≠ personas: acompañantes viven en bautizosCompanions del titular');
  console.log('  • Si faltan fechas/precios en app_events, la app oculta filtros aunque existan los datos');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
