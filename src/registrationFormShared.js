/** Mismas listas y helpers que en App.jsx (nuevo registro / edición) para alinear opciones. */

/** Valor explícito «no indicado»; cuenta como dato válido (no como error ni como «Otro»). */
export const BLOOD_TYPE_UNSPECIFIED = 'Sin especificar';

export const BLOOD_TYPES_ABO_RH = Object.freeze(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);

/** Opciones del `<select>`: primero sin especificar, luego ABO/Rh estándar. */
export const BLOOD_TYPES_SELECT_OPTIONS = Object.freeze([BLOOD_TYPE_UNSPECIFIED, ...BLOOD_TYPES_ABO_RH]);

/** Clave en conteos de dashboard para tipos no estándar (texto libre distinto a «Sin especificar»). */
export const BLOOD_TYPE_STATS_OTHER = 'Otro';

/**
 * Normaliza a un tipo ABO/Rh del catálogo; `null` si no reconoce (p. ej. texto libre).
 * Misma lógica que el histórico en App (espacios, 0 vs O).
 */
export function normalizeBloodTypeAboRh(raw) {
  if (raw == null || raw === '') return null;
  let s = String(raw).trim().replace(/\s+/g, '').toUpperCase();
  if (!s) return null;
  if (s.startsWith('0') && (s.includes('+') || s.includes('-'))) s = `O${s.slice(1)}`;
  if (BLOOD_TYPES_ABO_RH.includes(s)) return s;
  const compact = s.replace(/[^ABO+\-]/gi, '');
  if (BLOOD_TYPES_ABO_RH.includes(compact)) return compact;
  return null;
}

/**
 * Para estadísticas: ABO/Rh canónico, «Sin especificar», u «Otro». Vacío → no cuenta en gráficas.
 */
export function classifyBloodTypeForStats(raw) {
  const t = String(raw ?? '').trim();
  if (!t) return null;
  if (t === BLOOD_TYPE_UNSPECIFIED) return BLOOD_TYPE_UNSPECIFIED;
  const nk = normalizeBloodTypeAboRh(raw);
  if (nk) return nk;
  return BLOOD_TYPE_STATS_OTHER;
}

export const DEFAULT_SERVE_AREA_OPTIONS = ['Jueces', 'Capitanes', 'Staff', 'Seguridad', 'Otro'];
export const DEFAULT_ALLERGY_OPTIONS = ['Alimentos', 'Medicamentos', 'Ambientales', 'Insectos', 'Otra'];

export const SI_LABEL = 'Sí';

export const parsePreferredServeArea = (str, knownOpts = DEFAULT_SERVE_AREA_OPTIONS) => {
  const selected = new Set();
  let otroText = '';
  if (!str || typeof str !== 'string') return { selected, otroText };
  const parts = str.split(',').map((p) => p.trim()).filter(Boolean);
  for (const p of parts) {
    if (p === 'Otro') selected.add('Otro');
    else if (p.startsWith('Otro: ')) {
      selected.add('Otro');
      otroText = p.slice(6).trim();
    } else if (knownOpts.includes(p)) selected.add(p);
    else {
      selected.add('Otro');
      otroText = p;
    }
  }
  return { selected, otroText };
};

export const formatPreferredServeArea = (selected, otroText) => {
  const arr = [...selected].filter((x) => x !== 'Otro');
  if (selected.has('Otro')) arr.push(otroText ? `Otro: ${otroText}` : 'Otro');
  return arr.join(', ');
};
