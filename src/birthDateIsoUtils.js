/** Utilidades compartidas para fecha ISO (YYYY-MM-DD) en selects o input date. */

export const MONTHS_ES = [
  { v: '01', label: 'Enero' },
  { v: '02', label: 'Febrero' },
  { v: '03', label: 'Marzo' },
  { v: '04', label: 'Abril' },
  { v: '05', label: 'Mayo' },
  { v: '06', label: 'Junio' },
  { v: '07', label: 'Julio' },
  { v: '08', label: 'Agosto' },
  { v: '09', label: 'Septiembre' },
  { v: '10', label: 'Octubre' },
  { v: '11', label: 'Noviembre' },
  { v: '12', label: 'Diciembre' },
];

export function daysInMonth(yearNum, monthNum) {
  if (!yearNum || !monthNum) return 31;
  return new Date(yearNum, monthNum, 0).getDate();
}

export function parseIso(s) {
  const iso = normalizeBirthDateToIso(s);
  if (!iso) return { y: '', m: '', d: '' };
  return { y: iso.slice(0, 4), m: iso.slice(5, 7), d: iso.slice(8, 10) };
}

export function pad2(n) {
  const x = Number(n);
  if (!Number.isFinite(x) || x < 1) return '';
  return x < 10 ? `0${x}` : String(x);
}

export function composeIfComplete(parts) {
  const { y, m, d } = parts;
  if (!y || !m || !d) return '';
  const yStr = String(y);
  if (yStr.length !== 4) return '';
  const yn = parseInt(yStr, 10);
  const mn = parseInt(m, 10);
  let di = parseInt(d, 10);
  if (!Number.isFinite(yn) || !Number.isFinite(mn) || !Number.isFinite(di)) return '';
  const cap = daysInMonth(yn, mn);
  di = Math.min(Math.max(di, 1), cap);
  return `${yStr}-${m}-${pad2(di)}`;
}

/** Normaliza fechas legacy (Timestamp, dd/mm/aaaa, ISO parcial) a YYYY-MM-DD para formulario y Firestore. */
export function normalizeBirthDateToIso(raw) {
  if (raw == null || raw === '') return '';
  if (typeof raw?.toDate === 'function') {
    const d = raw.toDate();
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  if (typeof raw === 'object' && typeof raw.seconds === 'number') {
    const d = new Date(raw.seconds * 1000);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  const s = String(raw).trim();
  if (!s) return '';
  const isoHead = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoHead) return `${isoHead[1]}-${isoHead[2]}-${isoHead[3]}`;
  const mx = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mx) {
    return composeIfComplete({
      y: mx[3],
      m: pad2(parseInt(mx[2], 10)),
      d: pad2(parseInt(mx[1], 10)),
    });
  }
  try {
    const d = new Date(s.includes('T') ? s : `${s}T12:00:00`);
    if (!Number.isNaN(d.getTime())) {
      const p = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    }
  } catch {
    /* ignore */
  }
  return '';
}

const MONTH_ABBR_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** Etiqueta para Excel / listados: «31 Dic 2024». */
export function formatBirthDateExcelLabel(birthDate) {
  const raw = String(birthDate ?? '').trim();
  if (!raw) return '';
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const day = parseInt(iso[3], 10);
    const monthIdx = parseInt(iso[2], 10) - 1;
    const year = iso[1];
    if (monthIdx >= 0 && monthIdx < 12 && Number.isFinite(day) && day >= 1) {
      return `${day} ${MONTH_ABBR_ES[monthIdx]} ${year}`;
    }
  }
  try {
    const d = new Date(raw.includes('T') ? raw : `${raw}T12:00:00`);
    if (!Number.isNaN(d.getTime())) {
      return `${d.getDate()} ${MONTH_ABBR_ES[d.getMonth()]} ${d.getFullYear()}`;
    }
  } catch {
    /* ignore */
  }
  return raw;
}
