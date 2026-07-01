/**
 * Servicios dominicales del corte de caja (horarios por sede y asignación por marca de tiempo).
 */
import { SERVICE_OPTIONS } from './appConstants.js';

export const CASH_CUT_NO_SERVICE_LABEL = 'Fuera de servicios dominicales';

export const DEFAULT_SERVICE_SLOTS = {
  Primero: { start: '07:00', end: '11:00' },
  Segundo: { start: '11:00', end: '13:00' },
  Tercero: { start: '13:00', end: '17:00' },
};

function parseHHMM(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') return null;
  const [hh, mm] = hhmm.split(':').map((n) => parseInt(n, 10));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return hh * 60 + mm;
}

/**
 * Horarios de servicio (Primero/Segundo/Tercero) por sede.
 * Prioridad: config global → evento → legado + `serviceSlots`.
 */
export function getCashCutScheduleForLocation(
  event,
  locName,
  globalSlots = DEFAULT_SERVICE_SLOTS,
  globalScheduleByLocation = null
) {
  const scheduleFromRaw = (raw) => {
    if (!raw || typeof raw !== 'object') return null;
    const out = {};
    for (const s of SERVICE_OPTIONS) {
      const slot = raw[s];
      if (slot && typeof slot.start === 'string' && typeof slot.end === 'string' && slot.start && slot.end) {
        out[s] = { start: slot.start, end: slot.end };
      }
    }
    return Object.keys(out).length > 0 ? out : null;
  };

  const fromGlobal = scheduleFromRaw(globalScheduleByLocation?.[locName]);
  if (fromGlobal) return fromGlobal;

  const fromEvent = scheduleFromRaw(event?.cashCutScheduleByLocation?.[locName]);
  if (fromEvent) return fromEvent;

  const legacy = event?.cashCutServicesByLocation?.[locName];
  const list =
    Array.isArray(legacy) && legacy.length
      ? SERVICE_OPTIONS.filter((s) => legacy.includes(s))
      : [...SERVICE_OPTIONS];
  const out = {};
  for (const s of list) {
    out[s] = {
      start: globalSlots[s]?.start || DEFAULT_SERVICE_SLOTS[s].start,
      end: globalSlots[s]?.end || DEFAULT_SERVICE_SLOTS[s].end,
    };
  }
  return out;
}

/**
 * Asigna un abono/egreso al servicio dominical según sede y hora local.
 * El último servicio del día incluye la hora de cierre (p. ej. 17:00 en Tercero).
 */
export function resolveCashCutServiceForTimestamp(
  ts,
  locName,
  { event = null, globalSlots = DEFAULT_SERVICE_SLOTS, globalScheduleByLocation = null } = {}
) {
  const d = ts instanceof Date ? ts : new Date(ts);
  if (Number.isNaN(d.getTime())) return CASH_CUT_NO_SERVICE_LABEL;
  if (d.getDay() !== 0) return CASH_CUT_NO_SERVICE_LABEL;
  const loc = String(locName || '').trim();
  if (!loc || !event) return CASH_CUT_NO_SERVICE_LABEL;

  const slotsMap = getCashCutScheduleForLocation(event, loc, globalSlots, globalScheduleByLocation);
  const configured = SERVICE_OPTIONS.filter((s) => slotsMap[s]);
  if (!configured.length) return CASH_CUT_NO_SERVICE_LABEL;

  const nowMin = d.getHours() * 60 + d.getMinutes();
  for (let i = 0; i < configured.length; i++) {
    const service = configured[i];
    const slot = slotsMap[service];
    const start = parseHHMM(slot?.start);
    const end = parseHHMM(slot?.end);
    if (start == null || end == null) continue;
    const isLast = i === configured.length - 1;
    if (nowMin >= start && (nowMin < end || (isLast && nowMin <= end))) return service;
  }
  return CASH_CUT_NO_SERVICE_LABEL;
}
