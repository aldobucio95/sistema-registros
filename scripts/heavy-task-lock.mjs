/**
 * Candado para tareas pesadas (build, deploy) — evita procesos Node concurrentes que saturan RAM.
 */
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';

const AGENT_DIR = join(process.cwd(), '.agent');
const LOCK_FILE = join(AGENT_DIR, 'heavy-task.lock');
const STALE_MS = 2 * 60 * 60 * 1000;

function ensureAgentDir() {
  if (!existsSync(AGENT_DIR)) mkdirSync(AGENT_DIR, { recursive: true });
}

export function readLock() {
  if (!existsSync(LOCK_FILE)) return null;
  try {
    return JSON.parse(readFileSync(LOCK_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function isStale(lock) {
  const started = Number(lock?.startedAt) || 0;
  return !started || Date.now() - started > STALE_MS;
}

export function isLocked() {
  const lock = readLock();
  if (!lock) return false;
  if (isStale(lock)) {
    try {
      unlinkSync(LOCK_FILE);
    } catch {
      /* ignore */
    }
    return false;
  }
  return true;
}

export function acquire(taskName) {
  ensureAgentDir();
  const existing = readLock();
  if (existing && !isStale(existing)) {
    const msg = `[heavy-task-lock] Ocupado por "${existing.task}" (pid ${existing.pid}) desde ${new Date(existing.startedAt).toLocaleString('es-MX')}. Aborta ese proceso o borra .agent/heavy-task.lock si quedó huérfano.`;
    console.error(msg);
    process.exit(1);
  }
  if (existing && isStale(existing)) {
    try {
      unlinkSync(LOCK_FILE);
    } catch {
      /* ignore */
    }
  }
  const payload = {
    task: String(taskName || 'unknown'),
    pid: process.pid,
    startedAt: Date.now(),
  };
  writeFileSync(LOCK_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return payload;
}

export function release() {
  if (!existsSync(LOCK_FILE)) return;
  try {
    const lock = readLock();
    if (lock && lock.pid === process.pid) unlinkSync(LOCK_FILE);
  } catch {
    /* ignore */
  }
}

export function runWithLock(taskName, fn) {
  acquire(taskName);
  try {
    return fn();
  } finally {
    release();
  }
}
