/**
 * Textos de auditoría para cambios en el panel Resumen (dashboard).
 */

export const EXPENSE_ACTIVITY_GENERIC =
  'Cambio en lista de gastos (detalle no visible por preferencia de privacidad del usuario).';

const VIEW_PREF_LABELS = {
  statsConfig: 'Tarjetas principales',
  chartLocations: 'Gráfica: sedes',
  chartIncome: 'Gráfica: ingresos',
  chartPaymentStatus: 'Gráfica: estado de pagos',
  chartGender: 'Gráfica: género',
  chartAgeBrackets: 'Gráfica: rangos de edad',
  chartBloodType: 'Gráfica: tipo de sangre',
  chartScholarship: 'Gráfica: becas',
  chartSwimming: 'Gráfica: nado',
  chartMedical: 'Gráfica: salud',
  chartServers: 'Gráfica: servidores',
  chartAges: 'Gráfica: asistencia',
  chartBaptism: 'Gráfica: bautizos',
  chartAttendanceSpecial: 'Gráfica: empleado / cortesía',
  chartCustom: 'Gráfica: campos extra',
  tableDetails: 'Tabla de desglose general',
};

const SCHOLARSHIP_FILTER_LABELS = {
  all: 'Todos',
  becado: 'Cualquier becado',
  partial: 'Beca parcial',
  total: 'Beca total',
  No: 'No becado',
};

const SERVER_FILTER_LABELS = {
  all: 'Todos',
  Si: 'Solo servidores',
  No: 'Solo camperos',
  Teens: 'Servidor en Teens',
  Jóvenes: 'Servidor en Jóvenes',
  Ambos: 'Servidor tarifa única Ambos',
};

const ASSIGNMENT_FILTER_LABELS = {
  all: 'Todas',
  Teens: 'Teens',
  Jóvenes: 'Jóvenes',
  Ambos: 'Ambos',
};

const BAPTISM_COUNT_FILTER_LABELS = {
  all: 'Todos',
  teens: 'Se bautiza en Teens',
  jovenes: 'Se bautiza en Jóvenes',
  no: 'No se bautiza',
};

const TABLE_COL_LABELS = {
  count: 'Inscritos',
  bautizados: 'Bautizados',
  companions: 'Acompañantes',
  asistentesBautizos: 'Asistentes',
  bautizosTransport: 'Transp. evento',
  bautizosCarro: 'Llevan carro',
  empleadosBautizos: 'Empleados',
  scholarship: 'Becados',
  serveYes: 'Servidores',
  serveNo: 'Camperos',
  bautizos: 'Bautizos',
  teens: 'Teens',
  jovenes: 'Jóvenes',
  cancelled: 'Cancelados',
  refund: 'Con devolución',
  paid: 'Recaudado',
  donations: 'Donaciones',
  paidEfectivo: 'Efectivo',
  paidTarjeta: 'Tarjeta',
  pending: 'Pendiente',
  cortesia: 'Cortesías',
  expected: 'Total esperado',
};

const SCOPE_KEY_LABELS = {
  dashBautizosScope: 'Alcance del dashboard (Bautizos)',
  dashBautizosParty: 'Vista Bautizados / Acompañantes',
  dashRegs: 'Tarjeta registros',
  dashBautizosTransport: 'Transporte (Bautizos)',
  dashBautizosCars: 'Carros (Bautizos)',
  dashBautizosServidores: 'Servidores (Bautizos)',
  dashBautizosCortesia: 'Cortesía (Bautizos)',
  dashBautizosEmpleado: 'Empleado (Bautizos)',
  dashScholarship: 'Becados (resumen)',
  dashServers: 'Servidores (resumen)',
  dashRealCostX2: 'Costo real ×2',
  dashCortesia: 'Cortesía (métricas)',
  dashEmpleado: 'Empleado (métricas)',
  dashRecaudado: 'Recaudado',
  dashPendiente: 'Pendiente',
  dashDonations: 'Donaciones',
  dashEventDates: 'Fechas del evento',
  dashPricing: 'Precios (Bautizos)',
  dashBautizosListPrices: 'Precios comida/transporte',
  dashMinDeposit: 'Apartado mín.',
  dashRealCost: 'Costo real',
  dashBalance: 'Balance',
  chartLocations: 'Alcance gráfica sedes',
  chartIncome: 'Alcance gráfica ingresos',
  tableDetails: 'Alcance tabla general',
  chartPaymentStatus: 'Alcance gráfica pagos',
  chartGender: 'Alcance gráfica género',
  chartAgeBrackets: 'Alcance gráfica edades',
  chartBloodType: 'Alcance gráfica sangre',
  chartSwimming: 'Alcance gráfica nado',
  chartMedical: 'Alcance gráfica salud',
  chartServers: 'Alcance gráfica servidores',
  chartAges: 'Alcance gráfica asistencia',
  chartBaptism: 'Alcance gráfica bautizos',
  chartAttendanceSpecial: 'Alcance empleado/cortesía',
  sectionTravelDepart: 'Alcance salida / viaje',
};

const campaSegmentLabel = (v) => {
  if (v === 'all' || v == null || v === '') return 'Todos';
  if (v === 'teens') return 'Teens';
  if (v === 'jovenes') return 'Jóvenes';
  return String(v);
};

const bautizosPartyLabel = (v) => {
  if (v === 'all' || v == null || v === '') return 'Todos';
  if (v === 'baptized') return 'Bautizados';
  if (v === 'companions') return 'Acompañantes';
  if (v === 'asistente') return 'Asistentes';
  if (v === 'servidor') return 'Servidores';
  if (v === 'empleado') return 'Empleados';
  if (v === 'cortesia') return 'Cortesías';
  return String(v);
};

const labelScopeValue = (key, val) => {
  if (val === 'all' || val == null || val === '') return 'Todas las sedes / todos';
  if (key === 'dashBautizosScope' || key === 'dashBautizosParty') return bautizosPartyLabel(val);
  if (
    key === 'tableDetails' ||
    key === 'chartLocations' ||
    key === 'chartIncome' ||
    key === 'dashRecaudado' ||
    key === 'dashPendiente' ||
    key === 'dashBalance' ||
    key === 'dashDonations' ||
    key.startsWith('chartCustom_')
  ) {
    return campaSegmentLabel(val);
  }
  return campaSegmentLabel(val);
};

function labelScopeKey(key) {
  if (key.startsWith('chartCustom_')) {
    const n = key.replace('chartCustom_', '');
    return `Gráfica extra (${n})`;
  }
  return SCOPE_KEY_LABELS[key] || key;
}

const visiblePref = (o, k) => o?.[k] !== false;

const pushViewPrefsDiff = (prev, next, parts) => {
  const keys = new Set([...Object.keys(prev?.viewPrefs || {}), ...Object.keys(next?.viewPrefs || {})]);
  keys.forEach((k) => {
    const a = visiblePref(prev?.viewPrefs, k);
    const b = visiblePref(next?.viewPrefs, k);
    if (a === b) return;
    const lab = VIEW_PREF_LABELS[k] || k;
    parts.push(`${lab}: ${a ? 'visible' : 'oculto'} → ${b ? 'visible' : 'oculto'}`);
  });
};

const pushScalarFilter = (prev, next, key, label, valueLabels, parts) => {
  const a = prev?.[key] ?? 'all';
  const b = next?.[key] ?? 'all';
  if (a === b) return;
  const la = valueLabels[a] ?? a;
  const lb = valueLabels[b] ?? b;
  parts.push(`${label}: «${la}» → «${lb}»`);
};

/**
 * @param {object|null} prev
 * @param {object|null} next
 * @returns {string}
 */
export function describeDashboardConfigDelta(prev, next) {
  if (!prev || !next || typeof prev !== 'object' || typeof next !== 'object') {
    return 'Actualizó bloques, filtros o columnas del resumen (detalle no disponible).';
  }

  const parts = [];

  try {
    pushViewPrefsDiff(prev, next, parts);

    pushScalarFilter(prev, next, 'summaryFilterScholarship', 'Filtro beca', SCHOLARSHIP_FILTER_LABELS, parts);
    pushScalarFilter(prev, next, 'summaryFilterServer', 'Filtro servidor/campero', SERVER_FILTER_LABELS, parts);
    pushScalarFilter(prev, next, 'summaryFilterAssignment', 'Filtro asignación', ASSIGNMENT_FILTER_LABELS, parts);
    pushScalarFilter(prev, next, 'summaryFilterBaptism', 'Filtro bautizo (conteo)', BAPTISM_COUNT_FILTER_LABELS, parts);

    const scopePrev = prev.summaryCampaScopes && typeof prev.summaryCampaScopes === 'object' ? prev.summaryCampaScopes : {};
    const scopeNext = next.summaryCampaScopes && typeof next.summaryCampaScopes === 'object' ? next.summaryCampaScopes : {};
    const scopeKeys = new Set([...Object.keys(scopePrev), ...Object.keys(scopeNext)]);
    scopeKeys.forEach((k) => {
      const a = scopePrev[k] ?? 'all';
      const b = scopeNext[k] ?? 'all';
      if (a === b) return;
      const section = labelScopeKey(k);
      parts.push(`Alcance «${section}»: ${labelScopeValue(k, a)} → ${labelScopeValue(k, b)}`);
    });

    const colPrev = prev.summaryTableColumns && typeof prev.summaryTableColumns === 'object' ? prev.summaryTableColumns : {};
    const colNext = next.summaryTableColumns && typeof next.summaryTableColumns === 'object' ? next.summaryTableColumns : {};
    const colKeys = new Set([...Object.keys(colPrev), ...Object.keys(colNext)]);
    colKeys.forEach((k) => {
      const a = colPrev[k] !== false;
      const b = colNext[k] !== false;
      if (a === b) return;
      const lab = TABLE_COL_LABELS[k] || k;
      parts.push(`Columna «${lab}»: ${a ? 'visible' : 'oculta'} → ${b ? 'visible' : 'oculta'}`);
    });

    if (prev.showLocChartValues !== next.showLocChartValues) {
      const from = prev.showLocChartValues ? 'montos' : 'porcentajes';
      const to = next.showLocChartValues ? 'montos' : 'porcentajes';
      parts.push(`Gráfica de sedes: ${from} → ${to}`);
    }
    if (prev.showIncChartValues !== next.showIncChartValues) {
      const from = prev.showIncChartValues ? 'montos' : 'porcentajes';
      const to = next.showIncChartValues ? 'montos' : 'porcentajes';
      parts.push(`Gráfica de ingresos: ${from} → ${to}`);
    }
  } catch {
    return 'Actualizó bloques, filtros o columnas del resumen (detalle no disponible).';
  }

  if (parts.length === 0) {
    return 'Actualizó el resumen (sin cambios detectables en la configuración guardada).';
  }

  const MAX = 1400;
  const joined = parts.join('; ');
  if (joined.length <= MAX) return joined;
  return `${joined.slice(0, MAX - 20)}… (y más)`;
}
