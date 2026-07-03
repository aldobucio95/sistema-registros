/**
 * Programación de copias automáticas (diarias a medianoche local) y IDs de respaldo.
 */

/** Hora local a la que debe dispararse la copia diaria (0 = 12:00 a.m.). */
export const BACKUP_DAILY_LOCAL_HOUR = 0;

const DAILY_BACKUP_ID_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Id de copia diaria `YYYY-MM-DD` en hora local. */
export function formatLocalDateId(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isDailyBackupId(backupId) {
  return DAILY_BACKUP_ID_RE.test(String(backupId || '').trim());
}

/** Milisegundos hasta la próxima medianoche local. */
export function msUntilNextLocalMidnight(from = new Date()) {
  const next = new Date(from);
  next.setDate(next.getDate() + 1);
  next.setHours(BACKUP_DAILY_LOCAL_HOUR, 0, 0, 0);
  return Math.max(1000, next.getTime() - from.getTime());
}

/** Copia puntual antes de restaurar (única por instante). */
export function buildPreRestoreBackupId(now = new Date()) {
  return `${formatLocalDateId(now)}_pre-restore_${now.getTime()}`;
}

/** ¿Falta la copia diaria de hoy? */
export function isDailyBackupDue(lastBackupDate, now = new Date()) {
  const today = formatLocalDateId(now);
  return String(lastBackupDate || '').trim() !== today;
}
