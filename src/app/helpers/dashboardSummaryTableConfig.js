import { normalizeEventType } from '../../eventTypePresets.js';

/** Preferencias de bloques visibles en el resumen (cascarón unificado). */
export const defaultViewPrefs = {
  statsConfig: true,
  chartLocations: true,
  chartIncome: true,
  chartPaymentStatus: true,
  chartGender: true,
  chartAgeBrackets: true,
  chartAttendanceRoles: true,
  chartBloodType: true,
  chartScholarship: true,
  chartSwimming: true,
  chartMedical: true,
  chartServers: true,
  chartAges: true,
  chartBaptism: true,
  chartCustom: true,
  tableDetails: true,
};

/** Columnas de tipos de asistencia (multi-flag). */
export const SUMMARY_TABLE_ROLE_COLUMN_KEYS = [
  'roleServidor',
  'roleEmpleado',
  'roleBautizado',
  'roleBecado',
  'roleCampero',
  'roleCortesia',
  'rolePastor',
  'roleAsistente',
  'multiRole',
];

/** Columnas operativas / dinero (todos los presets). */
export const SUMMARY_TABLE_OPS_COLUMN_KEYS = [
  'waitlist',
  'cancelled',
  'refund',
  'paid',
  'donations',
  'paidEfectivo',
  'paidTarjeta',
  'pending',
  'expected',
];

/** Segmentos Campa (no son roles). */
export const SUMMARY_TABLE_CAMPA_SEGMENT_KEYS = ['teens', 'jovenes'];

/** Orden canónico de columnas en «Visualización de Datos Generales». */
export const SUMMARY_TABLE_COLUMN_KEYS = [
  'count',
  ...SUMMARY_TABLE_ROLE_COLUMN_KEYS,
  ...SUMMARY_TABLE_CAMPA_SEGMENT_KEYS,
  ...SUMMARY_TABLE_OPS_COLUMN_KEYS,
];

export const SUMMARY_TABLE_COLUMN_DEFAULTS = {
  count: true,
  roleServidor: true,
  roleEmpleado: true,
  roleBautizado: true,
  roleBecado: true,
  roleCampero: true,
  roleCortesia: true,
  rolePastor: true,
  roleAsistente: true,
  multiRole: true,
  teens: true,
  jovenes: true,
  waitlist: true,
  cancelled: true,
  refund: true,
  donations: true,
  paid: true,
  paidEfectivo: true,
  paidTarjeta: true,
  pending: true,
  expected: false,
};

export const SUMMARY_TABLE_COLUMN_LABELS = {
  count: 'Inscritos',
  roleServidor: 'Servidor',
  roleEmpleado: 'Empleado',
  roleBautizado: 'Bautizado',
  roleBecado: 'Becado',
  roleCampero: 'Campero',
  roleCortesia: 'Cortesía',
  rolePastor: 'Pastor',
  roleAsistente: 'Asistente',
  multiRole: 'Multi-rol',
  teens: 'Teens',
  jovenes: 'Jóvenes',
  waitlist: 'Lista de espera',
  cancelled: 'Cancelados',
  refund: 'Con devolución',
  paid: 'Recaudado',
  donations: 'Donaciones',
  paidEfectivo: 'Efectivo',
  paidTarjeta: 'Tarjeta',
  pending: 'Pendiente',
  expected: 'Total esperado',
};

/** Mapa columna tabla → clave de attendanceRoles. */
export const SUMMARY_ROLE_COLUMN_TO_KEY = {
  roleServidor: 'servidor',
  roleEmpleado: 'empleado',
  roleBautizado: 'bautizado',
  roleBecado: 'becado',
  roleCampero: 'campero',
  roleCortesia: 'cortesia',
  rolePastor: 'pastor',
  roleAsistente: 'asistente',
};

export const getSummaryTableColumnKeysForEventType = (eventType) => {
  const t = normalizeEventType(eventType);
  if (t === 'Campa') return SUMMARY_TABLE_COLUMN_KEYS;
  return SUMMARY_TABLE_COLUMN_KEYS.filter(
    (k) => !SUMMARY_TABLE_CAMPA_SEGMENT_KEYS.includes(k)
  );
};

export const getSummaryTableColumnDefaultsForEventType = (eventType) => {
  const keys = getSummaryTableColumnKeysForEventType(eventType);
  const out = {};
  for (const k of keys) {
    out[k] = SUMMARY_TABLE_COLUMN_DEFAULTS[k] !== false;
  }
  return out;
};

/** Stats iniciales / acumulables en reduceGlobalTableStats y buildTableByLocation. */
export const EMPTY_SUMMARY_TABLE_STATS = () => ({
  count: 0,
  roleServidor: 0,
  roleEmpleado: 0,
  roleBautizado: 0,
  roleBecado: 0,
  roleCampero: 0,
  roleCortesia: 0,
  rolePastor: 0,
  roleAsistente: 0,
  multiRole: 0,
  teens: 0,
  jovenes: 0,
  waitlist: 0,
  cancelled: 0,
  refund: 0,
  paid: 0,
  donations: 0,
  paidEfectivo: 0,
  paidTarjeta: 0,
  paidTarjetaGross: 0,
  paidTarjetaNet: 0,
  pending: 0,
  expected: 0,
  /** Residuales para tarjetas Campa (no columnas de tabla). */
  scholarship: 0,
  servers: 0,
});

export const SUMMARY_TABLE_MONEY_KEYS = new Set([
  'paid',
  'donations',
  'paidEfectivo',
  'paidTarjeta',
  'pending',
  'expected',
]);
