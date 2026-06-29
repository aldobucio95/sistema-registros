import { normalizeBirthDateToIso } from './birthDateIsoUtils.js';

const SI = 'Si';
const SI_LABEL = 'Sí';

function isSiValue(v) {
  const s = String(v ?? '').trim();
  if (s === SI || s === SI_LABEL) return true;
  if (s.toLowerCase() === 'sí') return true;
  if (s.length === 2 && s[0] === 'S' && (s[1] === '?' || s[1] === '\uFFFD')) return true;
  return false;
}

export const BAUTIZOS_ATTENDANCE = {
  bautizado: 'bautizado',
  /** Asiste al evento y paga lista como bautizado, pero no se bautiza en la ceremonia. */
  asistente: 'asistente',
  servidor: 'servidor',
  empleado: 'empleado',
  cortesia: 'cortesia',
};

/** Tallas de playera para bautizados (Campa / Bautizos). */
export const BAPTISM_SHIRT_SIZES = Object.freeze(['CH', 'M', 'G', 'XL', 'XXL']);

export function normalizeBaptismShirtSize(raw) {
  const s = String(raw ?? '')
    .trim()
    .toUpperCase();
  if (!s) return '';
  if (BAPTISM_SHIRT_SIZES.includes(s)) return s;
  return '';
}

/**
 * Quién cuenta como «con chip de bautizo» en listados y roster.
 * Campa: `willBeBaptized`. Bautizos: solo asistencia tipo bautizado (no servidor/empleado/cortesía; acompañantes van en otra estructura).
 */
export function participantHasBaptismChip(personLike, eventType) {
  const et = String(eventType || '').trim();
  if (personLike?._isCompanionWaitlistVirtual === true) return false;
  if (personLike?.__globalRegistryCompanionRow === true) return false;
  if (et === 'Campa') return isSiValue(personLike?.willBeBaptized);
  if (et === 'Bautizos') {
    return normalizeBautizosAttendanceType(personLike?.bautizosAttendanceType) === BAUTIZOS_ATTENDANCE.bautizado;
  }
  return false;
}

/** Parentescos que cumplen el requisito de acompañamiento obligatorio para menores. */
export const BAUTIZOS_GUARDIAN_RELATIONSHIPS = new Set(['padre', 'madre', 'tutor', 'mama', 'papa']);

/** Alcance unificado del dashboard Bautizos (botonera única por tarjeta/gráfica). */
export const BAUTIZOS_DASHBOARD_SCOPE_OPTIONS = Object.freeze([
  { id: 'all', label: 'Todos' },
  { id: 'baptized', label: 'Bautizados' },
  { id: 'companions', label: 'Acompañantes' },
  { id: BAUTIZOS_ATTENDANCE.asistente, label: 'Asistentes' },
  { id: BAUTIZOS_ATTENDANCE.servidor, label: 'Servidores' },
  { id: BAUTIZOS_ATTENDANCE.empleado, label: 'Empleados' },
  { id: BAUTIZOS_ATTENDANCE.cortesia, label: 'Cortesías' },
]);

export const BAUTIZOS_DASHBOARD_SCOPE_IDS = BAUTIZOS_DASHBOARD_SCOPE_OPTIONS.map((o) => o.id);

export function normalizeBautizosDashboardScope(raw) {
  const s = String(raw || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!s || s === 'all') return 'all';
  if (s === 'baptized' || s === 'bautizado' || s === 'bautizados') return 'baptized';
  if (s === 'companions' || s === 'acompanantes' || s === 'acompanante') return 'companions';
  if (s === 'asistente') return BAUTIZOS_ATTENDANCE.asistente;
  if (s === 'servidor') return BAUTIZOS_ATTENDANCE.servidor;
  if (s === 'empleado') return BAUTIZOS_ATTENDANCE.empleado;
  if (s === 'cortesia') return BAUTIZOS_ATTENDANCE.cortesia;
  return 'all';
}

/** Alcance global único del dashboard Bautizos (`dashBautizosScope`). */
export function resolveBautizosDashboardGlobalScope(scopes) {
  if (!scopes || typeof scopes !== 'object') return 'all';
  if (scopes.dashBautizosScope != null && String(scopes.dashBautizosScope).trim() !== '') {
    return normalizeBautizosDashboardScope(scopes.dashBautizosScope);
  }
  if (scopes.dashBautizosParty != null && String(scopes.dashBautizosParty).trim() !== '') {
    return normalizeBautizosDashboardScope(scopes.dashBautizosParty);
  }
  return 'all';
}

/** @deprecated Usar resolveBautizosDashboardGlobalScope (alcance global, no por tarjeta). */
export function resolveBautizosDashboardScopeForSection(scopes, _sectionKey) {
  return resolveBautizosDashboardGlobalScope(scopes);
}

export function getBautizosDashboardScopeLabel(scope) {
  const sc = normalizeBautizosDashboardScope(scope);
  const hit = BAUTIZOS_DASHBOARD_SCOPE_OPTIONS.find((o) => o.id === sc);
  return hit ? hit.label : 'Todos';
}

export function bautizosDashboardScopeUsesSplitPayments(scope) {
  const sc = normalizeBautizosDashboardScope(scope);
  return sc === 'baptized' || sc === 'companions';
}

/** Filtro por tipo de asistencia en titular (asistente / servidor / empleado / cortesía). */
export function bautizosAttendanceDashboardScopeMatches(personLike, scope) {
  if (!scope || scope === 'all') return true;
  return normalizeBautizosAttendanceType(personLike?.bautizosAttendanceType) === scope;
}

/** Titular entra al conteo según el alcance unificado del dashboard. */
export function bautizosDashboardTitularCountsForScope(personLike, scope) {
  const sc = normalizeBautizosDashboardScope(scope);
  if (sc === 'all') return true;
  if (sc === 'baptized') {
    return normalizeBautizosAttendanceType(personLike?.bautizosAttendanceType) === BAUTIZOS_ATTENDANCE.bautizado;
  }
  if (sc === 'companions') return false;
  return bautizosAttendanceDashboardScopeMatches(personLike, sc);
}

/** Acompañante canónico entra al conteo según el alcance unificado (puede filtrar por titular en tipos de asistencia). */
export function bautizosDashboardCompanionCountsForScope(companionLike, scope, hostLike) {
  const sc = normalizeBautizosDashboardScope(scope);
  if (sc === 'all') return true;
  const baptized = isBautizosCompanionBaptized(companionLike);
  if (sc === 'baptized') return baptized;
  if (sc === 'companions') return !baptized;
  if (hostLike && bautizosAttendanceDashboardScopeMatches(hostLike, sc)) {
    return String(companionLike?.name || '').trim().length > 0;
  }
  return false;
}

/** Fila titular visible en listados del dashboard según alcance unificado. */
export function participantMatchesBautizosDashboardScope(personLike, scope) {
  const sc = normalizeBautizosDashboardScope(scope);
  if (sc === 'all') return true;
  return bautizosDashboardTitularCountsForScope(personLike, sc);
}

/** Titulares del roster que entran al alcance (sin acompañantes). */
export function bautizosDashboardFilterTitularRows(rows, scope) {
  const sc = normalizeBautizosDashboardScope(scope);
  if (sc === 'all') return rows || [];
  if (sc === 'companions') return [];
  return (rows || []).filter((p) => bautizosDashboardTitularCountsForScope(p, sc));
}

/** Entradas del plan canónico de acompañantes que entran al alcance. */
export function bautizosDashboardFilterCanonicalCompanions(companionInfos, scope) {
  return (companionInfos || []).filter((info) =>
    bautizosDashboardCompanionCountsForScope(info?.sourceCompanion, scope, info?.sourceRegistrant)
  );
}

/** Total de personas (titulares + acompañantes canónicos) para tarjetas del dashboard. */
export function countBautizosDashboardPeople(rosterBase, canonicalCompanions, scope, opts = {}) {
  const sc = normalizeBautizosDashboardScope(scope);
  const roster = rosterBase || [];
  const canons = canonicalCompanions || [];
  if (sc === 'all') return roster.length + canons.length;
  if (sc === 'baptized') {
    const titulars = roster.filter(
      (p) => normalizeBautizosAttendanceType(p.bautizosAttendanceType) === BAUTIZOS_ATTENDANCE.bautizado
    ).length;
    const baptizedCompanions =
      typeof opts.companionBaptizedCount === 'number'
        ? opts.companionBaptizedCount
        : bautizosDashboardFilterCanonicalCompanions(canons, sc).length;
    return titulars + baptizedCompanions;
  }
  if (sc === 'companions') {
    return bautizosDashboardFilterCanonicalCompanions(canons, sc).length;
  }
  return (
    bautizosDashboardFilterTitularRows(roster, sc).length +
    bautizosDashboardFilterCanonicalCompanions(canons, sc).length
  );
}

/**
 * ¿Incluir pagos/pendiente de esta ficha titular en totales financieros del dashboard?
 * En alcance «Acompañantes» se incluye la fila del host para extraer solo la porción de acompañantes (split).
 */
export function bautizosDashboardIncludeRegistrationFinancials(personLike, scope) {
  const sc = normalizeBautizosDashboardScope(scope);
  if (sc === 'all') return true;
  if (bautizosDashboardTitularCountsForScope(personLike, sc)) return true;
  if (sc === 'companions') return true;
  return false;
}

/** Fragmentos reutilizables para notas del dashboard (alcance Todos). */
const BZ_HINT_TITULARES_ALL =
  'fichas titulares activas de todos los tipos de asistencia: Bautizado, Asistente, Servidor, Empleado y Cortesía';
const BZ_HINT_ACOMPANANTES_ALL =
  'cada acompañante con nombre (una vez por persona, sin duplicar por vínculo), incluidos los marcados para bautizarse en el evento y los que no se bautizan';

/** Texto explicativo bajo gráficas/tarjetas según alcance seleccionado. */
export function getBautizosDashboardScopeChartHint(scope, variant = 'generic') {
  const label = getBautizosDashboardScopeLabel(scope);
  const sc = normalizeBautizosDashboardScope(scope);
  const prefix = sc === 'all' ? '' : `Alcance «${label}». `;
  if (sc === 'all') {
    if (variant === 'counts') {
      return `Incluye ${BZ_HINT_TITULARES_ALL}, más ${BZ_HINT_ACOMPANANTES_ALL}; cada persona suma 1 al total.`;
    }
    if (variant === 'locations') {
      return `Por sede: ${BZ_HINT_TITULARES_ALL}, más ${BZ_HINT_ACOMPANANTES_ALL}.`;
    }
    if (variant === 'income') {
      return `Recaudación de ${BZ_HINT_TITULARES_ALL} (pagos del titular) y la parte de pagos atribuida a acompañantes en cada registro.`;
    }
    if (variant === 'companionSplit') {
      return `«Registros activos»: ${BZ_HINT_TITULARES_ALL}. «Acompañantes»: solo quienes no se bautizan en el evento (sin duplicar registro propio); los subregistros marcados para bautizarse no entran en esta porción.`;
    }
    if (variant === 'transportCar') {
      return `Transporte del evento (camión) vs en carro: ${BZ_HINT_TITULARES_ALL} y ${BZ_HINT_ACOMPANANTES_ALL} (deduplicados).`;
    }
    if (variant === 'payment') {
      return `Liquidados y con saldo pendiente por persona (titular y cada ${BZ_HINT_ACOMPANANTES_ALL}): se reparte el monto a liquidar del registro según precio de lista y los abonos cubren unidades en orden hasta agotar el saldo (ej. 6×$150 con $450 pagados → 3 liquidados y 3 pendientes). Cortesía o empleado sin cobro de lista cuentan como liquidados.`;
    }
    if (variant === 'gender') {
      return `Hombres, mujeres y sin especificar por persona (${BZ_HINT_TITULARES_ALL} y ${BZ_HINT_ACOMPANANTES_ALL}); quien no tiene género en la ficha entra en «Sin especificar».`;
    }
    if (variant === 'age') {
      return `Rangos de edad por persona (titular y acompañantes; edad desde fecha de nacimiento o campo edad). Sin dato válido → «Sin especificar».`;
    }
    if (variant === 'transportCard') {
      return `Personas con transporte del evento marcado en Sí: ${BZ_HINT_TITULARES_ALL} y ${BZ_HINT_ACOMPANANTES_ALL} (cada acompañante una sola vez).`;
    }
    if (variant === 'carsCard') {
      return `Personas que no toman el transporte del evento (se asume carro): ${BZ_HINT_TITULARES_ALL} y ${BZ_HINT_ACOMPANANTES_ALL} (deduplicados). No suma vehículos salvo casilla explícita de carros.`;
    }
    if (variant === 'servidorCard') {
      return `Solo fichas titulares con tipo Servidor (excluye Bautizado, Asistente, Empleado, Cortesía y acompañantes). Con «Todos» en esta tarjeta: todos los servidores activos visibles.`;
    }
    if (variant === 'cortesiaCard') {
      return `Solo fichas titulares con tipo Cortesía (sin cobro de lista; excluye los demás tipos y acompañantes).`;
    }
    if (variant === 'empleadoCard') {
      return `Solo fichas titulares con tipo Empleado (excluye Bautizado, Asistente, Servidor, Cortesía y acompañantes).`;
    }
    return `Datos de ${BZ_HINT_TITULARES_ALL}, más ${BZ_HINT_ACOMPANANTES_ALL} cuando la métrica suma personas al total.`;
  }
  if (sc === 'baptized') {
    if (variant === 'locations') {
      return `${prefix}Solo titulares tipo Bautizado y subregistros de acompañante marcados para bautizarse; por sede. No incluye Asistente, Servidor, Empleado, Cortesía ni acompañantes que no se bautizan.`;
    }
    if (variant === 'income') {
      return `${prefix}Recaudación atribuida solo a la parte titular bautizada del registro (sin cuota de acompañantes no bautizados).`;
    }
    if (variant === 'companionSplit') {
      return `${prefix}Titulares bautizados y subregistros marcados para bautizo; no se cuentan acompañantes que no se bautizan.`;
    }
    if (variant === 'transportCar') {
      return `${prefix}Transporte y carro solo de titulares bautizados y de acompañantes con «¿Se bautiza?» en Sí.`;
    }
    return `${prefix}Solo titulares con tipo de asistencia Bautizado y acompañantes marcados para bautizarse en el evento.`;
  }
  if (sc === 'companions') {
    if (variant === 'locations') {
      return `${prefix}Solo acompañantes que no se bautizan en el evento, una vez por persona. No incluye fichas titulares (Bautizado, Asistente, Servidor, Empleado, Cortesía) ni subregistros marcados para bautizarse.`;
    }
    if (variant === 'income') {
      return `${prefix}Recaudación atribuida solo a la parte de acompañantes no bautizados del registro.`;
    }
    if (variant === 'companionSplit') {
      return `${prefix}Solo acompañantes sin bautismo; no se incluyen fichas titulares ni subregistros marcados para bautizarse.`;
    }
    if (variant === 'transportCar') {
      return `${prefix}Transporte y carro solo de acompañantes no bautizados (deduplicados por plan canónico).`;
    }
    return `${prefix}Solo acompañantes que no se bautizan en el evento (cada persona cuenta una sola vez).`;
  }
  const tipo = label.toLowerCase();
  if (variant === 'locations') {
    return `${prefix}Solo registros titulares con tipo de asistencia «${label}» en cada sede; acompañantes del mismo titular se incluyen si aplican a ese registro.`;
  }
  if (variant === 'income') {
    return `${prefix}Recaudación por sede de inscritos con tipo «${label}» (pagos del titular en ese segmento).`;
  }
  if (variant === 'companionSplit') {
    return `${prefix}Desglose limitado a titulares «${label}» y sus acompañantes vinculados en el formulario.`;
  }
  if (variant === 'transportCar') {
    return `${prefix}Transporte del evento vs en carro para titulares «${label}» y acompañantes de esos registros.`;
  }
  return `${prefix}Solo inscritos con tipo de asistencia «${label}» (segmento: ${tipo}).`;
}

/** @deprecated Usar bautizosDashboardTitularCountsForScope */
export function bautizosDashboardTitularCountsForPartyScope(personLike, partyScope) {
  return bautizosDashboardTitularCountsForScope(personLike, partyScope);
}

/** @deprecated Usar bautizosDashboardCompanionCountsForScope */
export function bautizosDashboardCompanionCountsForPartyScope(companionLike, partyScope, hostLike) {
  return bautizosDashboardCompanionCountsForScope(companionLike, partyScope, hostLike);
}

export function normalizeBautizosAttendanceType(raw) {
  const s = String(raw || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (s === 'asistente') return BAUTIZOS_ATTENDANCE.asistente;
  if (s === 'servidor') return BAUTIZOS_ATTENDANCE.servidor;
  if (s === 'empleado') return BAUTIZOS_ATTENDANCE.empleado;
  if (s === 'cortesia') return BAUTIZOS_ATTENDANCE.cortesia;
  return BAUTIZOS_ATTENDANCE.bautizado;
}

/** Paga precio de lista del evento (comida ± transporte), sin ser cortesía ni empleado. */
export function bautizosAttendancePaysEventListPrice(personLike) {
  if (isFreeBautizosAttendance(personLike)) return false;
  const t = normalizeBautizosAttendanceType(personLike?.bautizosAttendanceType);
  return (
    t === BAUTIZOS_ATTENDANCE.bautizado ||
    t === BAUTIZOS_ATTENDANCE.asistente ||
    t === BAUTIZOS_ATTENDANCE.servidor
  );
}

/** Talla de playera / paquete de participante pagado (no servidor ni cortesía). */
export function bautizosAttendanceUsesParticipantPackage(personLike) {
  const t = normalizeBautizosAttendanceType(personLike?.bautizosAttendanceType);
  return t === BAUTIZOS_ATTENDANCE.bautizado || t === BAUTIZOS_ATTENDANCE.asistente;
}

/** Solo el tipo bautizado lleva chip de bautizo en el evento. */
export function bautizosWillBeBaptizedFromAttendance(rawType) {
  return normalizeBautizosAttendanceType(rawType) === BAUTIZOS_ATTENDANCE.bautizado ? SI : 'No';
}

export function isFreeBautizosAttendance(personLike) {
  return normalizeBautizosAttendanceType(personLike?.bautizosAttendanceType) === BAUTIZOS_ATTENDANCE.cortesia;
}

/** Etiqueta fija de asignación servidor en Bautizos (sin Teens/Jóvenes/Ambos). */
export const BAUTIZOS_SERVER_ASSIGNMENT_LABEL = 'Servidor';

export function bautizosShowsServerParticipation(personLike) {
  const t = normalizeBautizosAttendanceType(personLike?.bautizosAttendanceType);
  return t === BAUTIZOS_ATTENDANCE.servidor || t === BAUTIZOS_ATTENDANCE.empleado;
}

/** Filas virtuales en Registro Global (acompañantes expandidos como entradas individuales). */
export const GLOBAL_REGISTRY_VIRTUAL_KIND = Object.freeze({
  companion: 'companion',
  companionBaptized: 'companion-baptized',
});

/** Etiqueta legible del tipo de asistencia Bautizos (incluye filas virtuales de acompañante). */
export function getBautizosAttendanceTypeLabel(personLike) {
  if (personLike?.__virtualKind === GLOBAL_REGISTRY_VIRTUAL_KIND.companion) return 'Acompañante';
  const t = normalizeBautizosAttendanceType(personLike?.bautizosAttendanceType);
  if (t === BAUTIZOS_ATTENDANCE.asistente) return 'Asistente';
  if (t === BAUTIZOS_ATTENDANCE.servidor) return 'Servidor';
  if (t === BAUTIZOS_ATTENDANCE.empleado) return 'Empleado';
  if (t === BAUTIZOS_ATTENDANCE.cortesia) return 'Cortesía';
  return 'Bautizado';
}

/** Clave de chip de asistencia para roster / Registro global. */
export function resolveBautizosAttendanceChipKind(personLike) {
  if (personLike?.__virtualKind === GLOBAL_REGISTRY_VIRTUAL_KIND.companion) return 'acompanante';
  const t = normalizeBautizosAttendanceType(personLike?.bautizosAttendanceType);
  if (t === BAUTIZOS_ATTENDANCE.asistente) return 'asistente';
  if (t === BAUTIZOS_ATTENDANCE.servidor) return 'servidor';
  if (t === BAUTIZOS_ATTENDANCE.empleado) return 'empleado';
  if (t === BAUTIZOS_ATTENDANCE.cortesia) return 'cortesia';
  return 'bautizado';
}

function resolveBautizosCompanionRegisteredAt(host, companion) {
  const explicit = String(companion?.registeredAt ?? '').trim();
  if (explicit) return explicit;
  return String(host?.registeredAt ?? host?.createdAt ?? '').trim();
}

function buildVirtualBaptizedCompanionGlobalRow(host, companion, index, meta) {
  const nm = String(companion?.name || '').trim();
  if (!nm) return null;
  if (
    bautizosCompanionIsAlsoBautizadoRegistrant(
      companion,
      meta.bautizadoIdSet,
      meta.bautizadoNameSet,
      meta.vnpToBautizadoId
    )
  ) {
    return null;
  }
  const hostId = String(host?.id || '').trim();
  const cid = String(companion?.id || index).trim();
  return {
    id: `virt-bautizado:${hostId}:${cid}`,
    eventId: host.eventId,
    name: nm,
    location: String(host?.location || '').trim(),
    status: host?.status || 'active',
    gender: String(companion?.gender || '').trim(),
    age: companion?.age != null ? String(companion.age).trim() : '',
    birthDate: normalizeBirthDateToIso(companion?.birthDate) || '',
    phone: '',
    registeredAt: resolveBautizosCompanionRegisteredAt(host, companion),
    baptismShirtSize: companion?.baptismShirtSize || '',
    bautizosAttendanceType: BAUTIZOS_ATTENDANCE.bautizado,
    __globalRegistryVirtual: true,
    __virtualKind: GLOBAL_REGISTRY_VIRTUAL_KIND.companionBaptized,
    __hostRegistrantId: hostId,
    __sourceRegistrantName: String(host?.name || '').trim(),
    __companionRelationship: String(
      companion?.relationship || companion?.linkedCompanionRelationship || ''
    ).trim(),
  };
}

function buildVirtualCompanionGlobalRow(planEntry, canonKey) {
  const host = planEntry?.sourceRegistrant;
  const companion = planEntry?.sourceCompanion;
  const nm = String(companion?.name || companion?.linkedCompanionName || '').trim();
  if (!host || !nm) return null;
  return {
    id: `virt-acompanante:${canonKey}`,
    eventId: host.eventId,
    name: nm,
    location: String(host?.location || '').trim(),
    status: host?.status || 'active',
    gender: String(companion?.gender || '').trim(),
    age: companion?.age != null ? String(companion.age).trim() : '',
    birthDate: normalizeBirthDateToIso(companion?.birthDate) || '',
    phone: '',
    registeredAt: resolveBautizosCompanionRegisteredAt(host, companion),
    bautizosAttendanceType: '',
    __globalRegistryVirtual: true,
    __virtualKind: GLOBAL_REGISTRY_VIRTUAL_KIND.companion,
    __hostRegistrantId: String(host.id || '').trim(),
    __sourceRegistrantName: String(host?.name || '').trim(),
    __companionRelationship: String(
      companion?.relationship || companion?.linkedCompanionRelationship || ''
    ).trim(),
    __companionLinked: !!companion?.linkedNoExtraCharge || !!companion?.linkedCompanionSourceKey,
  };
}

/**
 * Registro Global Bautizos: titulares + cada acompañante canónico y cada acompañante bautizado como fila propia.
 */
export function expandBautizosGlobalRegistryRows(titularRows, rosterForPlan) {
  const titulars = Array.isArray(titularRows) ? titularRows : [];
  const roster = Array.isArray(rosterForPlan) ? rosterForPlan : titulars;
  const titularIdSet = new Set(titulars.map((p) => String(p?.id || '').trim()).filter(Boolean));
  const meta = buildActiveRegistrantMetaForCompanionDedupe(roster);
  const out = [...titulars];
  const seenVirtual = new Set();

  for (const host of titulars) {
    const comps = getBautizosCompanionsArray(host);
    for (let i = 0; i < comps.length; i++) {
      const c = comps[i] || {};
      if (!String(c?.name || '').trim() || !isBautizosCompanionBaptized(c)) continue;
      if (c?.companionWaitlistPending === true) continue;
      const row = buildVirtualBaptizedCompanionGlobalRow(host, c, i, meta);
      if (!row || seenVirtual.has(row.id)) continue;
      seenVirtual.add(row.id);
      out.push(row);
    }
  }

  const plan = buildBautizosCanonicalCompanionPlan(roster, meta, { includeBaptizedCompanions: false });
  for (const [canonKey, entry] of plan) {
    const hostId = String(entry?.registrantId || entry?.sourceRegistrant?.id || '').trim();
    if (!titularIdSet.has(hostId)) continue;
    const row = buildVirtualCompanionGlobalRow(entry, canonKey);
    if (!row || seenVirtual.has(row.id)) continue;
    seenVirtual.add(row.id);
    out.push(row);
  }

  return out;
}

/**
 * Registro global / sede (vista lista): titulares + ramas de acompañantes bautizados.
 * Sin filas del plan canónico (evita inflar conteos respecto al dashboard y registro por sede).
 */
export function expandBautizosGlobalRegistryActivosDisplayRows(titularRows, rosterForPlan) {
  const titulars = Array.isArray(titularRows) ? titularRows : [];
  const roster = Array.isArray(rosterForPlan) ? rosterForPlan : titulars;
  const meta = buildActiveRegistrantMetaForCompanionDedupe(roster);
  const out = [...titulars];
  const seenVirtual = new Set();

  for (const host of titulars) {
    const comps = getBautizosCompanionsArray(host);
    for (let i = 0; i < comps.length; i++) {
      const c = comps[i] || {};
      if (!String(c?.name || '').trim() || !isBautizosCompanionBaptized(c)) continue;
      if (c?.companionWaitlistPending === true) continue;
      const row = buildVirtualBaptizedCompanionGlobalRow(host, c, i, meta);
      if (!row || seenVirtual.has(row.id)) continue;
      seenVirtual.add(row.id);
      out.push(row);
    }
  }

  return out;
}

export {
  expandBautizosWaitlistRegistryRows,
  expandBautizosWaitlistRegistryDisplayRows,
} from './bautizosWaitlistRegistryExpand.js';

/**
 * Inscritos tipo servidor o empleado (vista «Servidores y empleados» en Bautizos).
 * Cada titular cuenta una sola vez: un empleado con «Participa como servidor» (isServer=Sí)
 * no se suma aparte del tipo servidor.
 */
export function participantIsBautizosServidorOrEmpleadoAttendance(personLike) {
  const t = normalizeBautizosAttendanceType(personLike?.bautizosAttendanceType);
  return t === BAUTIZOS_ATTENDANCE.servidor || t === BAUTIZOS_ATTENDANCE.empleado;
}

/** Empleado que además participa como servidor (isServer=Sí); no duplica el total unificado. */
export function participantIsBautizosEmpleadoParticipatingAsServer(personLike) {
  return (
    normalizeBautizosAttendanceType(personLike?.bautizosAttendanceType) === BAUTIZOS_ATTENDANCE.empleado &&
    isSiValue(personLike?.isServer)
  );
}

/** Conteo único de personas en «Servidores y empleados» (servidor + empleado, sin doble conteo). */
export function countBautizosServidoresYEmpleadosUnicos(rows) {
  let n = 0;
  for (const p of rows || []) {
    if (participantIsBautizosServidorOrEmpleadoAttendance(p)) n += 1;
  }
  return n;
}

/** Solo tipo Servidor (conteos separados de empleado en dashboard / tarjetas). */
export function participantIsBautizosServidorAttendance(personLike) {
  return normalizeBautizosAttendanceType(personLike?.bautizosAttendanceType) === BAUTIZOS_ATTENDANCE.servidor;
}

export function bautizosServerToggleLocked(personLike) {
  return normalizeBautizosAttendanceType(personLike?.bautizosAttendanceType) === BAUTIZOS_ATTENDANCE.servidor;
}

/**
 * Sincroniza `isServer` / `serverAssignment` según tipo de asistencia Bautizos.
 * Empleado: servidor Sí por defecto; se puede desmarcar. Servidor: siempre Sí.
 */
export function syncBautizosAttendanceServerFields(entryLike) {
  const t = normalizeBautizosAttendanceType(entryLike?.bautizosAttendanceType);
  const out = { ...(entryLike || {}) };
  if (t === BAUTIZOS_ATTENDANCE.servidor) {
    out.isServer = SI;
    out.serverAssignment = BAUTIZOS_SERVER_ASSIGNMENT_LABEL;
    out.ambosServeInSegment = '';
    return out;
  }
  if (t === BAUTIZOS_ATTENDANCE.empleado) {
    const explicitNo = String(out.isServer ?? '').trim() === 'No';
    out.isServer = explicitNo ? 'No' : SI;
    out.serverAssignment = isSiValue(out.isServer) ? BAUTIZOS_SERVER_ASSIGNMENT_LABEL : '';
    out.ambosServeInSegment = '';
    return out;
  }
  out.isServer = 'No';
  out.serverAssignment = '';
  out.ambosServeInSegment = '';
  return out;
}

function resolveLlegaEnCarroLine(line) {
  if (typeof line?.llegaEnCarro === 'boolean') return line.llegaEnCarro;
  if (isSiValue(line?.llegaEnCarro)) return true;
  if (line?.llegaEnCarro === 'No') return false;
  return false;
}

function resolveRegresaEnCarroLine(line) {
  if (typeof line?.regresaEnCarro === 'boolean') return line.regresaEnCarro;
  if (isSiValue(line?.regresaEnCarro)) return true;
  if (line?.regresaEnCarro === 'No') return false;
  return false;
}

export function normalizeArrivalCarCount(raw) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

/**
 * Años cumplidos en una fecha de referencia (YYYY-MM-DD). Si `asOfYmd` está vacío, usa la fecha actual.
 * Misma lógica de cumpleaños que `calculateAgeFromBirthDate` en `publicRegistrationLogic.js` (evita import circular).
 * @returns {number|null}
 */
export function bautizosCompanionAgeYearsCompletedAsOf(birthDate, asOfYmd) {
  const iso = normalizeBirthDateToIso(birthDate);
  if (!iso) return null;
  const b = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(b.getTime())) return null;
  const refStr = String(asOfYmd || '').trim();
  const ref = refStr ? new Date(`${refStr}T12:00:00`) : new Date();
  if (Number.isNaN(ref.getTime())) return null;
  let age = ref.getFullYear() - b.getFullYear();
  const monthDiff = ref.getMonth() - b.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < b.getDate())) age -= 1;
  if (!Number.isFinite(age) || age < 0 || age > 120) return null;
  return age;
}

/**
 * Texto estándar para UI (formulario de registro, acompañantes, resúmenes).
 */
export const BAUTIZOS_UNDER_3_POLICY_NOTE =
  'Menores de 3 años al día del evento: sin cobro de comida ni transporte del evento (viajan en brazos; no ocupan asiento en camión).';

/**
 * Fecha de referencia para la política de menores de 3 años: inicio del evento (`dateStart` o `date`).
 * Alineado con `getEventEffectiveStartDate` en `eventDateHelpers.js` (sin importar para evitar ciclo con transporte).
 * @param {object|null|undefined} eventLike
 * @returns {string} YYYY-MM-DD o cadena vacía
 */
export function resolveBautizosLapInfantPolicyReferenceIso(eventLike) {
  if (!eventLike || typeof eventLike !== 'object') return '';
  const start = String(eventLike.dateStart || '').trim();
  if (start) return start;
  return String(eventLike.date || '').trim();
}

/**
 * Menor de 3 años cumplidos al día del evento (edad 0, 1 o 2). Requiere `birthDate` en la fila o titular.
 * @param {object} personLike
 * @param {object|null|undefined} eventLike — documento del evento (para `dateStart` / `date`); si falta fecha en el evento, se usa hoy.
 */
export function isBautizosUnder3YearsAtEvent(personLike, eventLike) {
  const ref = resolveBautizosLapInfantPolicyReferenceIso(eventLike);
  const age = bautizosCompanionAgeYearsCompletedAsOf(String(personLike?.birthDate || '').trim(), ref);
  return age !== null && age < 3;
}

/** @deprecated Alias de `isBautizosUnder3YearsAtEvent` (antes «≤2 años»). */
export function isBautizosLapInfantCompanion(companionLike, eventLike) {
  return isBautizosUnder3YearsAtEvent(companionLike, eventLike);
}

/**
 * Precio de una línea (registrado o acompañante): comida fija + transporte opcional
 * (misma regla que `getBautizosListPrice` en `publicRegistrationLogic.js`).
 * @param {object|null|undefined} [eventLike] — necesario para política de menores de 3 años según fecha del evento
 * @param {{ ignoreLinkedCharge?: boolean }} [opts] — si `ignoreLinkedCharge`, ignora `linkedNoExtraCharge` / `linkedCompanionSourceKey` (solo referencia informativa en UI)
 */
export function getBautizosLineListPrice(line, food, transport, eventLike = null, opts = {}) {
  const ignoreLinked = opts && opts.ignoreLinkedCharge === true;
  if (
    !ignoreLinked &&
    (line?.linkedNoExtraCharge || String(line?.linkedCompanionSourceKey || '').trim())
  )
    return 0;
  if (isBautizosUnder3YearsAtEvent(line, eventLike)) return 0;
  const arrivesByCar = resolveLlegaEnCarroLine(line);
  const transportWanted = isSiValue(line?.wantsBautizosTransport);
  const chargeTransport = transportWanted && !arrivesByCar;
  if (chargeTransport) return food + transport;
  return food;
}

export function getBautizosCompanionsArray(personLike) {
  const raw = personLike?.bautizosCompanions;
  if (!Array.isArray(raw)) return [];
  return raw.filter((c) => c && typeof c === 'object');
}

/** Fila sin datos capturados (plantilla vacía o «Agregar acompañante» sin llenar). */
export function companionRowIsEffectivelyEmpty(c) {
  if (!c || typeof c !== 'object') return true;
  if (isSiValue(c?.willBeBaptized)) return false;
  if (String(c?.linkedCompanionSourceKey || '').trim()) return false;
  if (String(c?.linkedCompanionName || '').trim()) return false;
  if (String(c?.linkedRegistrantId || '').trim()) return false;
  const nm = String(c?.name || '').trim();
  const rel = String(c?.relationship || '').trim();
  return nm.length < 2 && rel.length < 2;
}

/** Acompañantes con al menos nombre o parentesco (u otra señal de fila activa). */
export function getFilledBautizosCompanions(personLike) {
  return getBautizosCompanionsArray(personLike).filter((c) => !companionRowIsEffectivelyEmpty(c));
}

/** Normaliza fechas legacy en filas de acompañantes para formulario o persistencia. */
export function normalizeBautizosCompanionsForForm(rawList) {
  return getBautizosCompanionsArray({ bautizosCompanions: rawList }).map((row) => ({
    ...row,
    birthDate: normalizeBirthDateToIso(row?.birthDate) || '',
  }));
}

/** Acompañante marcado para bautizarse (pasa a conteo/lista de bautizados). */
export function isBautizosCompanionBaptized(companionLike) {
  return isSiValue(companionLike?.willBeBaptized);
}

function hasCompanionFullNameThreeParts(fullName) {
  const parts = String(fullName || '')
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean);
  return parts.length >= 3;
}

/** Misma regla que en `App.jsx` / `publicRegistrationLogic.js`. */
export function companionRowPhoneLooksValid(phone) {
  const p = String(phone ?? '');
  return p.startsWith('+') ? p.length > 5 : p.replace(/\D/g, '').length === 10;
}

export function normalizeRelationshipKey(rel) {
  return String(rel || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function companionRowIsGuardian(rel) {
  const k = normalizeRelationshipKey(rel);
  if (!k) return false;
  if (BAUTIZOS_GUARDIAN_RELATIONSHIPS.has(k)) return true;
  if (k.startsWith('padre') || k.startsWith('papa')) return true;
  if (k.startsWith('madre') || k.startsWith('mama')) return true;
  if (k.startsWith('tutor')) return true;
  return false;
}

export function minorHasRequiredGuardianCompanion(personLike, eventLike = null) {
  const ageNum = parseInt(personLike?.age, 10);
  if (!Number.isFinite(ageNum) || ageNum >= 18) return true;
  const rows = getFilledBautizosCompanions(personLike);
  const refIso = resolveBautizosLapInfantPolicyReferenceIso(eventLike);
  return rows.some((c) => {
    if (companionRowIsGuardian(c?.relationship)) return true;
    const nm = String(c?.name || '').trim();
    const rel = String(c?.relationship || '').trim();
    if (nm.length < 2 || rel.length < 2) return false;
    const cAge = bautizosCompanionAgeYearsCompletedAsOf(String(c?.birthDate || '').trim(), refIso);
    return cAge != null && cAge >= 18;
  });
}

/**
 * Normaliza filas de acompañantes para persistir (ids, Si/No transporte, sedes por defecto).
 */
/**
 * Misma regla que `resolveLlegaEnCarro` en `App.jsx` y `resolveLlegaEnCarroPricing` en `publicRegistrationLogic.js`
 * (llega en carro o legado `transportType === 'Carro'`).
 */
export function bautizosLlegaEnCarroForTransportPricing(personLike) {
  if (typeof personLike?.llegaEnCarro === 'boolean') return personLike.llegaEnCarro;
  if (isSiValue(personLike?.llegaEnCarro)) return true;
  if (personLike?.llegaEnCarro === 'No') return false;
  // Bautizos: transporte del evento prevalece sobre `transportType` legacy «Carro».
  if (isSiValue(personLike?.wantsBautizosTransport)) return false;
  return (personLike?.transportType || 'Camión') === 'Carro';
}

/**
 * Reglas Bautizos: nombre y parentesco por fila; si el acompañante se bautiza (`willBeBaptized`),
 * mis requisitos que un inscrito Bautizos (teléfono, género, nacimiento, emergencia, tipo de sangre
 * y bloque médico según `fv`). Transporte según visibilidad.
 * Usar desde formulario público y desde `getRegistrationFormIssues` en la app.
 *
 * @param {object} merged
 * @param {string[]} issues
 * @param {(key: string) => boolean} fv — campo visible
 * @param {object|null|undefined} [eventLike] — fecha del evento para política de infante en brazos
 */
export function appendBautizosCompanionsValidationIssues(merged, issues, fv, eventLike = null) {
  if (!fv('bautizosCompanions')) return;
  const ageNum = parseInt(merged.age, 10);
  const isMinor = Number.isFinite(ageNum) && ageNum > 0 && ageNum < 18;
  const comps = getFilledBautizosCompanions(merged);
  comps.forEach((c, idx) => {
    const n = idx + 1;
    const nm = String(c?.name || '').trim();
    const rel = String(c?.relationship || '').trim();
    const baptizedCompanion = isBautizosCompanionBaptized(c);
    if (baptizedCompanion) {
      if (!hasCompanionFullNameThreeParts(nm)) {
        issues.push(`Acompañante ${n}: nombre completo (nombre y dos apellidos)`);
      }
    } else if (nm.length < 2) {
      issues.push(`Acompañante ${n}: nombre completo obligatorio`);
    }
    if (rel.length < 2) {
      issues.push(`Acompañante ${n}: parentesco obligatorio`);
    }
    if (baptizedCompanion) {
      if (!companionRowPhoneLooksValid(c?.phone || '')) {
        issues.push(`Acompañante ${n}: teléfono personal (10 dígitos válidos)`);
      }
      if (c?.gender === '' || c?.gender == null) {
        issues.push(`Acompañante ${n}: género`);
      }
      if (!(normalizeBirthDateToIso(c?.birthDate) || '').trim()) {
        issues.push(`Acompañante ${n}: fecha de nacimiento`);
      }
      if (fv('bloodType') && !String(c?.bloodType ?? '').trim()) {
        issues.push(`Acompañante ${n}: tipo de sangre`);
      }
      if (!String(c?.emergencyContact || '').trim()) {
        issues.push(`Acompañante ${n}: nombre del contacto de emergencia`);
      }
      if (!companionRowPhoneLooksValid(c?.emergencyPhone || '')) {
        issues.push(`Acompañante ${n}: teléfono de emergencia (10 dígitos)`);
      }
      if (!(c?.emergencyRelationship || '').trim()) {
        issues.push(`Acompañante ${n}: parentesco del contacto de emergencia`);
      }
      if (fv('allergies') && c?.hasAllergy !== 'No' && String(c?.allergyDetails || '').trim() === '' && String(c?.allergyCategory || '').trim() === '') {
        issues.push(`Acompañante ${n}: alergias (categoría o detalle)`);
      }
      if (fv('diseases') && c?.hasDisease !== 'No' && String(c?.diseaseDetails || '').trim() === '') {
        issues.push(`Acompañante ${n}: detalle de enfermedad`);
      }
      if (fv('disability') && c?.hasDisability !== 'No' && String(c?.disabilityDetails || '').trim() === '') {
        issues.push(`Acompañante ${n}: detalle de discapacidad`);
      }
    }
    if (fv('bautizosTransport') && isSiValue(c?.wantsBautizosTransport)) {
      if (!isBautizosLapInfantCompanion(c, eventLike) && !bautizosLlegaEnCarroForTransportPricing(c)) {
        const from = String(c?.travelFrom || merged.travelFrom || merged.location || '').trim();
        const to = String(c?.travelTo || merged.travelTo || merged.location || '').trim();
        if (fv('travelFrom') && !from) issues.push(`Acompañante ${n}: sede de salida (transporte)`);
        if (fv('travelTo') && !to) issues.push(`Acompañante ${n}: sede de regreso (transporte)`);
      }
    }
    appendBautizosTransportChoiceIssues(c, issues, `Acompañante ${n}: `, fv, eventLike);
  });
  if (isMinor && !minorHasRequiredGuardianCompanion(merged, eventLike)) {
    issues.push(
      'Menor de edad: debe ir acompañado de al menos un adulto responsable (Padre, Madre, Tutor, Mamá o Papá, o acompañante mayor de edad con nombre, parentesco y fecha de nacimiento).'
    );
  }
}

/**
 * Normaliza nombre para comparaciones (trim, minúsculas, sin acentos).
 */
export function normalizePersonNameKey(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Reglas para determinar si una línea (registrado o acompañante) viaja en carro a la salida.
 * Solo cuenta con «Llega en carro» explícito (misma regla que transporte y dashboard).
 */
export function bautizosLineGoesByCar(lineLike) {
  return bautizosLlegaEnCarroForTransportPricing(lineLike);
}

/**
 * Línea (titular o acompañante) que viaja en transporte del evento y no en carro propio.
 * Tiene prioridad sobre `transportType` legacy o `carrosLlegada` por defecto.
 */
export function bautizosLineUsesEventTransportOnly(lineLike, eventLike = null) {
  if (!lineLike) return false;
  if (isBautizosUnder3YearsAtEvent(lineLike, eventLike)) return false;
  if (isBautizosLapInfantCompanion(lineLike, eventLike)) return false;
  if (bautizosLlegaEnCarroForTransportPricing(lineLike)) return false;
  return isSiValue(lineLike?.wantsBautizosTransport);
}

/** Menor de 3 años / infante en brazos: exento de elegir transporte. */
export function bautizosHasExplicitTransportChoice(lineLike, eventLike = null) {
  if (!lineLike) return false;
  if (isBautizosUnder3YearsAtEvent(lineLike, eventLike)) return true;
  if (isBautizosLapInfantCompanion(lineLike, eventLike)) return true;
  return bautizosLlegaEnCarroForTransportPricing(lineLike) || isSiValue(lineLike?.wantsBautizosTransport);
}

export function appendBautizosTransportChoiceIssues(lineLike, issues, labelPrefix, fv, eventLike = null) {
  if (!fv('bautizosTransport')) return;
  if (!bautizosHasExplicitTransportChoice(lineLike, eventLike)) {
    issues.push(`${labelPrefix}Elige transporte del evento o llegada en carro`);
  }
}

/**
 * @param {string} sk
 * @returns {{ kind: 'participant', participantId: string }
 *   | { kind: 'companion', hostId: string, companionId: string }
 *   | null}
 */
export function parseLinkSourceKey(sk) {
  const s = String(sk || '').trim();
  if (!s) return null;
  if (s.startsWith('p:')) {
    const participantId = s.slice(2).trim();
    return participantId ? { kind: 'participant', participantId } : null;
  }
  if (s.startsWith('c:')) {
    const rest = s.slice(2);
    const idx = rest.indexOf('::');
    if (idx === -1) return null;
    const hostId = rest.slice(0, idx).trim();
    const companionId = rest.slice(idx + 2).trim();
    return hostId && companionId ? { kind: 'companion', hostId, companionId } : null;
  }
  return null;
}

/** Construye `Map<ownSourceKey, linkedSourceKey>` para una colección de participantes. */
export function buildBautizosSourceLinkMap(roster) {
  const m = new Map();
  for (const p of roster || []) {
    const pid = String(p?.id || '').trim();
    if (!pid) continue;
    for (const c of getBautizosCompanionsArray(p)) {
      const cid = String(c?.id || '').trim();
      if (!cid) continue;
      const sk = String(c?.linkedCompanionSourceKey || '').trim();
      if (!sk) continue;
      m.set(`c:${pid}::${cid}`, sk);
    }
  }
  return m;
}

/** Resuelve `c:H::C` siguiendo `linkedCompanionSourceKey` hasta la fila origen. */
export function resolveBautizosUltimateSourceKey(startSk, sourceLinkMap) {
  const visited = new Set();
  let current = String(startSk || '').trim();
  while (current && current.startsWith('c:') && !visited.has(current)) {
    visited.add(current);
    const next = sourceLinkMap?.get?.(current);
    if (!next || next === current) return current;
    current = String(next).trim();
  }
  return current;
}

/**
 * Devuelve la clave canónica (raíz de la cadena de vínculos) de la persona acompañante
 * para evitar contabilizar varias veces a la misma persona cuando varios registros la vinculan.
 *
 * - `p:<participantId>` → la persona ES un participante: clave = `p:<participantId>`.
 * - `c:<H>::<C>` → siguiendo la cadena de `linkedCompanionSourceKey` hasta la fila origen.
 * - sin vínculo → la fila propia: `c:<registrantId>::<companionId>`.
 * - sin id → `anon:<registrantId>:<index>` (no se puede canonicalizar; el índice estabiliza la clave).
 */
export function getBautizosCompanionCanonicalKey(registrantId, companionRow, index, sourceLinkMap) {
  const sk = String(companionRow?.linkedCompanionSourceKey || '').trim();
  if (sk.startsWith('p:')) return sk;
  if (sk.startsWith('c:')) return resolveBautizosUltimateSourceKey(sk, sourceLinkMap);
  const cid = String(companionRow?.id || '').trim();
  if (cid) return `c:${String(registrantId)}::${cid}`;
  return `anon:${String(registrantId)}:${index}`;
}

/**
 * `true` si la fila de acompañante representa a una persona que ya está activa como bautizado en el roster.
 * En ese caso, no debe contarse como acompañante porque ya está como participante registrado.
 */
export function bautizosCompanionIsAlsoBautizadoRegistrant(c, bautizadoIdSet, bautizadoNameSet, vnpToBautizadoId) {
  const sk = String(c?.linkedCompanionSourceKey || '').trim();
  if (sk.startsWith('p:')) {
    const id = String(sk.slice(2)).trim();
    if (id && bautizadoIdSet?.has?.(id)) return true;
  }
  const v = String(c?.vnpPersonId || c?.linkedVnpId || '').trim();
  if (v && vnpToBautizadoId?.has?.(v)) return true;
  const n1 = normalizePersonNameKey(c?.name);
  const n2 = normalizePersonNameKey(c?.linkedCompanionName);
  if (n1 && bautizadoNameSet?.has?.(n1)) return true;
  if (n2 && bautizadoNameSet?.has?.(n2)) return true;
  return false;
}

/**
 * Construye un plan canónico de acompañantes únicos para todo el evento.
 *
 * Cada clave canónica se asigna al "host" preferido (el registrante dueño de la fila origen
 * si está en el roster; si no, el primer registrador que la encontró). Permite contar cada
 * acompañante una sola vez en cualquier agregación (asistentes, transporte, carros, etc.).
 *
 * @param {Array} roster — lista plana de participantes a considerar (incluyendo cancelados si aplica).
 * @param {{ bautizadoIdSet: Set<string>, bautizadoNameSet: Set<string>, vnpToBautizadoId: Map<string,string> }} bautizadoMeta
 * @param {{ includeBaptizedCompanions?: boolean, waitlistOnly?: boolean }} [options] — si true, incluye filas de acompañante con bautizo en el evento (p. ej. plan de transporte); por defecto se omiten para no duplicar conteos de «solo acompañantes» en dashboard. `waitlistOnly`: solo acompañantes con `companionWaitlistPending`.
 * @returns {Map<string, { canonKey: string, registrantId: string, sourceCompanion: object, sourceRegistrant: object }>}
 */
export function buildBautizosCanonicalCompanionPlan(roster, bautizadoMeta, options) {
  const includeBaptizedCompanions = options?.includeBaptizedCompanions === true;
  const waitlistOnly = options?.waitlistOnly === true;
  const list = Array.isArray(roster) ? roster : [];
  const idMap = new Map();
  for (const p of list) {
    const pid = String(p?.id || '').trim();
    if (pid) idMap.set(pid, p);
  }
  /**
   * Índice de la fila «origen» de cada acompañante (la propia, no las vinculadas).
   * Permite resolver el host real para una clave canónica `c:H::C`.
   */
  const ownIndex = new Map();
  for (const p of list) {
    const comps = getBautizosCompanionsArray(p);
    for (let i = 0; i < comps.length; i++) {
      const c = comps[i] || {};
      const cid = String(c?.id || '').trim();
      if (!cid) continue;
      const ownKey = `c:${String(p.id)}::${cid}`;
      if (!ownIndex.has(ownKey)) ownIndex.set(ownKey, { row: c, registrant: p });
    }
  }
  const sourceLinkMap = buildBautizosSourceLinkMap(list);
  const meta = bautizadoMeta || { bautizadoIdSet: new Set(), bautizadoNameSet: new Set(), vnpToBautizadoId: new Map() };
  const plan = new Map();
  for (const p of list) {
    const comps = getBautizosCompanionsArray(p);
    for (let i = 0; i < comps.length; i++) {
      const c = comps[i] || {};
      const nm = String(c?.name || '').trim();
      if (!nm) continue;
      if (waitlistOnly) {
        if (c?.companionWaitlistPending !== true) continue;
      } else if (c?.companionWaitlistPending === true) continue;
      if (!includeBaptizedCompanions && isBautizosCompanionBaptized(c)) continue;
      if (bautizosCompanionIsAlsoBautizadoRegistrant(c, meta.bautizadoIdSet, meta.bautizadoNameSet, meta.vnpToBautizadoId)) continue;
      const canon = getBautizosCompanionCanonicalKey(p.id, c, i, sourceLinkMap);
      if (!canon) continue;
      if (canon.startsWith('p:')) continue;
      if (plan.has(canon)) continue;
      let hostRegistrant = p;
      let hostRow = c;
      const parsed = parseLinkSourceKey(canon);
      if (parsed?.kind === 'companion' && parsed.hostId && idMap.has(parsed.hostId)) {
        const idx = ownIndex.get(canon);
        if (idx) {
          hostRegistrant = idx.registrant;
          hostRow = idx.row;
        }
      }
      plan.set(canon, {
        canonKey: canon,
        registrantId: String(hostRegistrant.id),
        sourceCompanion: hostRow,
        sourceRegistrant: hostRegistrant,
      });
    }
  }
  return plan;
}

/**
 * Acompañantes visibles en ficha expandida y chip del registro (incluye vínculos cruzados `p:` y grupo del host).
 * @param {string} registrantId
 * @param {object[]} roster — participantes del mismo evento (activos recomendado)
 */
export function getBautizosCompanionsVisibleForRegistrant(registrantId, roster) {
  const id = String(registrantId || '').trim();
  const list = Array.isArray(roster) ? roster : [];
  const byId = new Map();
  for (const p of list) {
    const pid = String(p?.id || '').trim();
    if (pid) byId.set(pid, p);
  }
  const self = byId.get(id);
  if (!self) return [];

  const out = [];
  const seen = new Set();

  const addRow = (row, dedupeKey) => {
    const nm = String(row?.name || row?.linkedCompanionName || '').trim();
    if (!nm) return;
    if (isBautizosCompanionBaptized(row)) return;
    const key = String(dedupeKey || nm).trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(row);
  };

  const ingestHostParty = (host, skipLinkedPersonId) => {
    const hid = String(host?.id || '').trim();
    if (!hid) return;
    for (const hc of getBautizosCompanionsArray(host)) {
      const hsk = String(hc?.linkedCompanionSourceKey || '').trim();
      if (hsk === `p:${skipLinkedPersonId}`) continue;
      if (hsk.startsWith('p:')) {
        const tid = hsk.slice(2);
        if (tid === id) continue;
        const target = byId.get(tid);
        const tname = String(hc?.linkedCompanionName || hc?.name || target?.name || '').trim();
        addRow({ ...hc, name: tname, linkedNoExtraCharge: true, linkedCompanionSourceKey: hsk }, `p:${tid}`);
      } else if (!hsk) {
        addRow(hc, `c:${hid}::${String(hc?.id || '').trim()}`);
      } else {
        addRow(hc, hsk);
      }
    }
  };

  for (const c of getBautizosCompanionsArray(self)) {
    const sk = String(c?.linkedCompanionSourceKey || '').trim();
    if (sk.startsWith('p:')) {
      const tid = sk.slice(2);
      const target = byId.get(tid);
      const name = String(c?.linkedCompanionName || c?.name || target?.name || '').trim();
      addRow({ ...c, name, linkedNoExtraCharge: true, linkedCompanionSourceKey: sk }, `p:${tid}`);
      if (target && tid !== id) ingestHostParty(target, id);
    } else {
      addRow(c, sk || `c:${id}::${String(c?.id || '').trim()}`);
    }
  }

  for (const host of list) {
    const hid = String(host?.id || '').trim();
    if (!hid || hid === id) continue;
    const linksMe = getBautizosCompanionsArray(host).some(
      (c) => String(c?.linkedCompanionSourceKey || '').trim() === `p:${id}`
    );
    if (!linksMe) continue;
    addRow(
      {
        name: String(host?.name || '').trim(),
        relationship: 'Registro vinculado',
        linkedNoExtraCharge: true,
        linkedCompanionSourceKey: `p:${hid}`,
      },
      `p:${hid}`
    );
    ingestHostParty(host, id);
  }

  return out;
}

/** Opciones para vincular acompañante (registro activo o fila de otro titular). */
export function buildBautizosExistingCompanionOptions(roster, eventId, excludePersonId) {
  const eid = String(eventId || '').trim();
  const exclude = String(excludePersonId || '').trim();
  const list = Array.isArray(roster) ? roster : [];
  return list
    .filter((p) => String(p?.eventId || '') === eid)
    .filter((p) => !exclude || String(p?.id || '') !== exclude)
    .flatMap((p) => {
      const ownerName = String(p?.name || '').trim();
      const ownerLoc = String(p?.location || '').trim();
      const participantOpt = ownerName
        ? [
            {
              value: `p:${String(p.id)}`,
              sourceType: 'participant',
              registrantId: String(p.id),
              registrantName: ownerName,
              companionId: '',
              companion: {
                name: ownerName,
                relationship: String(p?.emergencyRelationship || '').trim() || 'Adulto responsable',
              },
              label: `${ownerName} (registro activo)${ownerLoc ? ` · ${ownerLoc}` : ''}`,
            },
          ]
        : [];
      const companionsOpts = getBautizosCompanionsArray(p)
        .filter((c) => String(c?.name || '').trim())
        .map((c, idx) => {
          const compId = String(c?.id || '').trim() || `idx-${idx}`;
          const sourceKey = `c:${String(p.id)}::${compId}`;
          const companionName = String(c?.name || '').trim();
          const relationship = String(c?.relationship || '').trim();
          return {
            value: sourceKey,
            sourceType: 'companion',
            registrantId: String(p.id),
            registrantName: ownerName,
            companionId: compId,
            companion: c,
            label: `${companionName}${relationship ? ` (${relationship})` : ''} · ${ownerName}${ownerLoc ? ` · ${ownerLoc}` : ''}`,
          };
        });
      return [...participantOpt, ...companionsOpts];
    });
}

/**
 * Construye los metadatos de bautizados activos (id/nombre/vnp) usados para detectar acompañantes
 * que ya tienen registro propio y no deben contarse en duplicado.
 *
 * @param {Array} activeBautizadoRoster — solo los bautizados activos (no cancelados, asistencia bautizado).
 */
export function buildBautizadoMetaForCanonical(activeBautizadoRoster) {
  const bautizadoIdSet = new Set();
  const bautizadoNameSet = new Set();
  const vnpToBautizadoId = new Map();
  for (const p of activeBautizadoRoster || []) {
    const id = String(p?.id || '').trim();
    if (!id) continue;
    bautizadoIdSet.add(id);
    bautizadoNameSet.add(normalizePersonNameKey(p?.name));
    const v = String(p?.vnpPersonId || '').trim();
    if (v) vnpToBautizadoId.set(v, id);
  }
  return { bautizadoIdSet, bautizadoNameSet, vnpToBautizadoId };
}

/**
 * Metadatos de todos los registros activos (no cancelados) para deduplicar acompañantes
 * que también tienen ficha propia en el evento (cualquier tipo de asistencia).
 * Misma forma que `buildBautizadoMetaForCanonical` (reutiliza `bautizosCompanionIsAlsoBautizadoRegistrant`).
 */
export function buildActiveRegistrantMetaForCompanionDedupe(activeNonCancelledRoster) {
  return buildBautizadoMetaForCanonical(activeNonCancelledRoster);
}

/**
 * VNPM ya usados en el evento por titulares y por acompañantes bautizados.
 * Al editar un registro, exclúyelo para no contar sus filas anteriores como «ocupadas».
 *
 * @param {function(object): boolean} options.participantBlocksDuplicateRegistration
 * @param {function(string): string} options.canonicalizeVnpPersonId
 */
export function collectBlockingVnpPersonIdsForBautizosEvent(participants, eventId, options) {
  const { excludeParticipantId, canonicalizeVnpPersonId, participantBlocksDuplicateRegistration } = options || {};
  const set = new Set();
  for (const p of participants || []) {
    if (String(p?.eventId || '') !== String(eventId || '')) continue;
    if (typeof participantBlocksDuplicateRegistration === 'function' && !participantBlocksDuplicateRegistration(p)) {
      continue;
    }
    if (excludeParticipantId != null && String(p.id) === String(excludeParticipantId)) continue;
    const vm = canonicalizeVnpPersonId(p?.vnpPersonId || '');
    if (vm) set.add(vm);
    for (const c of getBautizosCompanionsArray(p)) {
      if (!isBautizosCompanionBaptized(c)) continue;
      const vc = canonicalizeVnpPersonId(c?.vnpPersonId || '');
      if (vc) set.add(vc);
    }
  }
  return set;
}

/**
 * Valida teléfonos e IDs VNPM de acompañantes bautizados antes de persistir (admin o público).
 * Las dependencias se inyectan para no acoplar a Firestore ni a `App.jsx`.
 *
 * @returns {string|null} mensaje de error o null si todo bien
 */
export function getBautizosBaptizedCompanionSubmitBlockingError({
  hostEntry,
  hostDocId,
  normalizedCompanions,
  participants,
  eventId,
  excludeParticipantId,
  canonicalizeVnpPersonId,
  generateVnpPersonId,
  participantBlocksDuplicateRegistration,
  phoneDuplicateInEvent,
  isPhoneShareFamilyAllowed,
  digitsOnlyPhone,
  calculateAgeFromBirthDate,
}) {
  const hostVnp =
    canonicalizeVnpPersonId(hostEntry?.vnpPersonId || '') || generateVnpPersonId(hostEntry);
  const blockingVnps = collectBlockingVnpPersonIdsForBautizosEvent(participants, eventId, {
    excludeParticipantId,
    canonicalizeVnpPersonId,
    participantBlocksDuplicateRegistration,
  });

  const baptized = (normalizedCompanions || []).filter((c) => isSiValue(c?.willBeBaptized));
  const vnpSeen = new Set();
  for (const c of baptized) {
    const nm = String(c.name || '').trim();
    if (!nm) continue;
    const cvnp = canonicalizeVnpPersonId(c.vnpPersonId || '') || generateVnpPersonId(c);
    if (cvnp === hostVnp) {
      return `Acompañante bautizado (${nm}): el ID VNPM no puede coincidir con el del titular.`;
    }
    if (blockingVnps.has(cvnp)) {
      return `Acompañante bautizado (${nm}): el ID VNPM ya está en uso en este evento.`;
    }
    if (vnpSeen.has(cvnp)) {
      return 'Dos acompañantes bautizados no pueden compartir el mismo ID VNPM.';
    }
    vnpSeen.add(cvnp);
    const cAge = calculateAgeFromBirthDate(c.birthDate || '');
    const cd = digitsOnlyPhone(c.phone || '');
    if (
      phoneDuplicateInEvent(
        c.name,
        cd,
        participants,
        eventId,
        hostDocId,
        cAge,
        false
      )
    ) {
      return `Acompañante bautizado (${nm}): ya hay un inscrito o en lista de espera con este teléfono.`;
    }
    const hd = digitsOnlyPhone(hostEntry?.phone || '');
    if (cd.length >= 10 && hd.length >= 10 && cd === hd) {
      if (!isPhoneShareFamilyAllowed(c.name, cAge, hostEntry?.name, hostEntry?.age)) {
        return `Acompañante bautizado (${nm}): el teléfono coincide con el del titular sin regla familiar permitida.`;
      }
    }
  }
  for (let i = 0; i < baptized.length; i++) {
    for (let j = i + 1; j < baptized.length; j++) {
      const a = baptized[i];
      const b = baptized[j];
      const da = digitsOnlyPhone(a.phone || '');
      const db = digitsOnlyPhone(b.phone || '');
      if (da.length < 10 || da !== db) continue;
      const ageA = calculateAgeFromBirthDate(a.birthDate || '');
      const ageB = calculateAgeFromBirthDate(b.birthDate || '');
      if (!isPhoneShareFamilyAllowed(a.name, ageA, b.name, ageB)) {
        return 'Dos acompañantes bautizados comparten el mismo teléfono sin regla familiar permitida.';
      }
    }
  }
  return null;
}

/** Hay al menos un acompañante con nombre marcado para bautizarse: el alta se parte en varios registros completos. */
export function hasBautizosBaptizedCompanionInParty(personLike) {
  return getBautizosCompanionsArray(personLike).some(
    (c) => String(c?.name || '').trim() && isBautizosCompanionBaptized(c)
  );
}

/**
 * Descriptores de cada documento a crear: siempre el host y cada acompañante bautizado (orden de índice).
 * @returns {Array<{ slotKey: string, companionIndex: number | null }>|null}
 */
export function getBautizosSplitPartySlotDescriptors(personLike) {
  const companions = getBautizosCompanionsArray(personLike);
  const baptizedIdx = companions
    .map((c, i) => (String(c?.name || '').trim() && isBautizosCompanionBaptized(c) ? i : -1))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b);
  if (!baptizedIdx.length) return null;
  return [{ slotKey: 'host', companionIndex: null }, ...baptizedIdx.map((i) => ({ slotKey: `bc:${i}`, companionIndex: i }))];
}

/** Construye el objeto «persona» Firestore para un slot del grupo (host o acompañante bautizado). */
export function buildParticipantLikeForBautizosSplitSlot(personLike, loc, descriptor) {
  const l = String(loc || personLike?.location || '').trim();
  if (descriptor.slotKey === 'host') {
    return { ...personLike, location: l };
  }
  const row = getBautizosCompanionsArray(personLike)[descriptor.companionIndex];
  return companionBautizadoToParticipantPayload(personLike, row, l);
}

export function getDisplayNameForBautizosSplitSlot(personLike, descriptor) {
  if (descriptor.slotKey === 'host') return String(personLike?.name || '').trim();
  const row = getBautizosCompanionsArray(personLike)[descriptor.companionIndex];
  return String(row?.name || '').trim();
}

export function companionBautizadoToParticipantPayload(hostEntry, companionRow, loc) {
  const l = String(loc || '').trim();
  const h = hostEntry || {};
  const c = companionRow || {};
  return {
    name: String(c.name || '').trim(),
    phone: String(c.phone || '').trim(),
    birthDate: String(c.birthDate || '').trim(),
    age: '',
    gender: c.gender === '' || c.gender == null ? '' : String(c.gender).trim(),
    bloodType: String(c.bloodType ?? '').trim(),
    emergencyContact: String(c.emergencyContact || '').trim(),
    emergencyPhone: String(c.emergencyPhone || '').trim(),
    emergencyRelationship: String(c.emergencyRelationship || '').trim(),
    hasAllergy: isSiValue(c.hasAllergy) ? SI : 'No',
    allergyCategory: String(c.allergyCategory || '').trim(),
    allergyDetails: String(c.allergyDetails || '').trim(),
    hasDisease: isSiValue(c.hasDisease) ? SI : 'No',
    diseaseDetails: String(c.diseaseDetails || '').trim(),
    diseaseMedication: String(c.diseaseMedication || '').trim(),
    hasDisability: isSiValue(c.hasDisability) ? SI : 'No',
    disabilityDetails: String(c.disabilityDetails || '').trim(),
    wantsBautizosFood: isSiValue(h.wantsBautizosFood) ? SI : 'No',
    wantsBautizosTransport: isSiValue(c.wantsBautizosTransport) ? SI : 'No',
    llegaEnCarro: !!c.llegaEnCarro,
    regresaEnCarro: !!c.regresaEnCarro,
    carrosLlegada: normalizeArrivalCarCount(c.carrosLlegada),
    transportType: 'Camión',
    travelFrom: String(c.travelFrom || h.travelFrom || l).trim() || l,
    travelTo: String(c.travelTo || h.travelTo || l).trim() || l,
    location: l,
    bautizosAttendanceType: BAUTIZOS_ATTENDANCE.bautizado,
    willBeBaptized: SI,
    baptismShirtSize: normalizeBaptismShirtSize(h.baptismShirtSize),
    bautizosCompanions: [],
    vnpPersonId: String(c.vnpPersonId || '').trim(),
    alias: '',
    responsivaStatus: String(h.responsivaStatus || '').trim(),
    customData: h.customData && typeof h.customData === 'object' ? { ...h.customData } : {},
    paid: 0,
    paymentMethod: 'Efectivo',
    paymentService: String(h.paymentService || '').trim(),
    cardReference: '',
    isScholarship: 'No',
    scholarshipType: 'total',
    scholarshipPartialAmount: '',
    allowSharedMainPhone: false,
  };
}

/**
 * Lista de acompañantes persistida en cada integrante del grupo: vínculos `p:` al resto + filas simples (no bautizados en el formulario).
 */
export function buildSplitPartyCompanionsForSlot({
  personLike,
  loc,
  targetSlotKey,
  docIdBySlotKey,
  vnpCompanionHelpers,
}) {
  const l = String(loc || '').trim();
  const descriptors = getBautizosSplitPartySlotDescriptors(personLike);
  if (!descriptors) {
    return normalizeBautizosCompanionsForPersist(personLike, l, vnpCompanionHelpers);
  }
  const companions = getBautizosCompanionsArray(personLike);
  const linkedRows = [];
  for (const d of descriptors) {
    if (d.slotKey === targetSlotKey) continue;
    const oid = docIdBySlotKey[d.slotKey];
    if (!oid) continue;
    const dispName = getDisplayNameForBautizosSplitSlot(personLike, d);
    let transportLine = null;
    if (d.slotKey === 'host') {
      transportLine = personLike;
    } else if (d.companionIndex != null) {
      transportLine = getBautizosCompanionsArray(personLike)[d.companionIndex];
    }
    const arrivesByCar = transportLine ? resolveLlegaEnCarroLine(transportLine) : true;
    const transportWanted = transportLine && isSiValue(transportLine.wantsBautizosTransport);
    linkedRows.push({
      id: `bc-link-${oid}`,
      name: dispName,
      relationship: 'Integrante del mismo registro',
      linkedNoExtraCharge: true,
      linkedCompanionSourceKey: `p:${oid}`,
      linkedCompanionName: dispName,
      linkedCompanionRelationship: '',
      linkedRegistrantName: '',
      linkedRegistrantId: oid,
      linkedCompanionId: '',
      wantsBautizosTransport: transportWanted ? SI : 'No',
      willBeBaptized: 'No',
      llegaEnCarro: arrivesByCar,
      regresaEnCarro: transportLine ? !!transportLine.regresaEnCarro : false,
      carrosLlegada: normalizeArrivalCarCount(transportLine?.carrosLlegada),
      travelFrom: String(transportLine?.travelFrom || l).trim() || l,
      travelTo: String(transportLine?.travelTo || l).trim() || l,
    });
  }
  const hostDocId = String(docIdBySlotKey?.host || '').trim();
  const simpleRaw = companions.filter((c) => String(c?.name || '').trim() && !isBautizosCompanionBaptized(c));
  const simpleWithStableIds = simpleRaw.map((c, idx) => {
    const existingId = String(c?.id || '').trim();
    return {
      ...c,
      id: existingId || `bc-${hostDocId || 'host'}-${idx}`,
    };
  });
  const hostDisplayName = getDisplayNameForBautizosSplitSlot(personLike, { slotKey: 'host', companionIndex: null });

  let simpleRows;
  if (targetSlotKey === 'host' || !hostDocId) {
    simpleRows = simpleWithStableIds;
  } else {
    simpleRows = simpleWithStableIds.map((c) => {
      const cid = String(c.id || '').trim();
      const dispName = String(c.name || '').trim();
      return {
        id: `bc-link-${hostDocId}-${cid.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
        name: dispName,
        relationship: String(c.relationship || '').trim(),
        linkedNoExtraCharge: true,
        linkedCompanionSourceKey: `c:${hostDocId}::${cid}`,
        linkedCompanionName: dispName,
        linkedCompanionRelationship: String(c.relationship || '').trim(),
        linkedRegistrantName: hostDisplayName,
        linkedRegistrantId: hostDocId,
        linkedCompanionId: cid,
        wantsBautizosTransport: c.wantsBautizosTransport,
        willBeBaptized: 'No',
        llegaEnCarro: !!c.llegaEnCarro,
        regresaEnCarro: !!c.regresaEnCarro,
        carrosLlegada: normalizeArrivalCarCount(c.carrosLlegada),
        travelFrom: String(c.travelFrom || l).trim() || l,
        travelTo: String(c.travelTo || l).trim() || l,
        birthDate: String(c.birthDate || '').trim(),
      };
    });
  }

  const combinedRaw = [...linkedRows, ...simpleRows];
  return normalizeBautizosCompanionsForPersist({ bautizosCompanions: combinedRaw }, l, vnpCompanionHelpers);
}

/** Registros derivados (`bautizosSplitPartyHostParticipantId`) del host indicado. */
export function getBautizosSplitPartyDerivedMembers(hostPerson, roster) {
  const hostId = String(hostPerson?.id || '').trim();
  if (!hostId) return [];
  return (Array.isArray(roster) ? roster : []).filter(
    (p) => String(p?.bautizosSplitPartyHostParticipantId || '').trim() === hostId
  );
}

export function isBautizosSplitPartyHostPerson(person, roster) {
  return getBautizosSplitPartyDerivedMembers(person, roster).length > 0;
}

export function isBautizosSplitPartyGroupMember(person, roster) {
  return (
    isBautizosSplitPartyHostPerson(person, roster) ||
    Boolean(String(person?.bautizosSplitPartyHostParticipantId || '').trim())
  );
}

/** Convierte el titular de un registro derivado a fila de acompañante bautizado (estado virtual del grupo). */
export function derivedTitularToBaptizedCompanionRow(derivedPerson, { pLinkStub = null } = {}) {
  const d = derivedPerson || {};
  const row = {
    id: `bc-${String(d.id || '').trim()}`,
    name: String(d.name || '').trim(),
    phone: String(d.phone || '').trim(),
    birthDate: normalizeBirthDateToIso(d.birthDate) || '',
    gender: d.gender === '' || d.gender == null ? '' : String(d.gender).trim(),
    bloodType: String(d.bloodType ?? '').trim(),
    emergencyContact: String(d.emergencyContact || '').trim(),
    emergencyPhone: String(d.emergencyPhone || '').trim(),
    emergencyRelationship: String(d.emergencyRelationship || '').trim(),
    hasAllergy: isSiValue(d.hasAllergy) ? SI : 'No',
    allergyCategory: String(d.allergyCategory || '').trim(),
    allergyDetails: String(d.allergyDetails || '').trim(),
    hasDisease: isSiValue(d.hasDisease) ? SI : 'No',
    diseaseDetails: String(d.diseaseDetails || '').trim(),
    diseaseMedication: String(d.diseaseMedication || '').trim(),
    hasDisability: isSiValue(d.hasDisability) ? SI : 'No',
    disabilityDetails: String(d.disabilityDetails || '').trim(),
    willBeBaptized: SI,
    wantsBautizosTransport: isSiValue(d.wantsBautizosTransport) ? SI : 'No',
    llegaEnCarro: !!d.llegaEnCarro,
    regresaEnCarro: !!d.regresaEnCarro,
    carrosLlegada: normalizeArrivalCarCount(d.carrosLlegada),
    travelFrom: String(d.travelFrom || '').trim(),
    travelTo: String(d.travelTo || '').trim(),
    vnpPersonId: String(d.vnpPersonId || '').trim(),
  };
  if (pLinkStub) {
    if (pLinkStub.wantsBautizosTransport != null) {
      row.wantsBautizosTransport = isSiValue(pLinkStub.wantsBautizosTransport) ? SI : 'No';
    }
    if (typeof pLinkStub.llegaEnCarro === 'boolean') row.llegaEnCarro = pLinkStub.llegaEnCarro;
    if (typeof pLinkStub.regresaEnCarro === 'boolean') row.regresaEnCarro = pLinkStub.regresaEnCarro;
    if (pLinkStub.carrosLlegada != null) row.carrosLlegada = normalizeArrivalCarCount(pLinkStub.carrosLlegada);
    if (pLinkStub.travelFrom) row.travelFrom = String(pLinkStub.travelFrom).trim();
    if (pLinkStub.travelTo) row.travelTo = String(pLinkStub.travelTo).trim();
  }
  return row;
}

/**
 * Reconstruye el «formulario virtual» del grupo partido (filas bautizadas completas + simples)
 * para recalcular precios y reconstruir espejos `p:` / `c:` en todos los documentos.
 */
export function buildBautizosSplitPartyVirtualEntry(hostPerson, derivedMembers, opts = {}) {
  const hostId = String(hostPerson?.id || '').trim();
  const derivedById = new Map();
  for (const d of derivedMembers || []) {
    const id = String(d?.id || '').trim();
    if (id) derivedById.set(id, d);
  }
  const editedId = String(opts.editedId || '').trim();
  const editedPayload = opts.editedPayload && typeof opts.editedPayload === 'object' ? opts.editedPayload : null;

  let hostState = { ...(hostPerson || {}) };
  if (editedId && editedId === hostId && editedPayload) {
    hostState = { ...hostState, ...editedPayload };
  }

  const simpleCompanions = getBautizosCompanionsArray(hostState).filter((c) => {
    const sk = String(c?.linkedCompanionSourceKey || '').trim();
    if (sk.startsWith('p:')) return false;
    if (isBautizosCompanionBaptized(c)) return false;
    return !companionRowIsEffectivelyEmpty(c);
  });

  const baptizedRows = [];
  const seenBaptized = new Set();

  for (const c of getBautizosCompanionsArray(hostState)) {
    const sk = String(c?.linkedCompanionSourceKey || '').trim();
    if (!sk.startsWith('p:')) continue;
    const did = String(c?.linkedRegistrantId || sk.slice(2)).trim();
    if (!did) continue;
    let derived = derivedById.get(did) || null;
    if (editedId === did && editedPayload) {
      derived = { ...(derived || { id: did }), ...editedPayload, id: did };
    }
    if (!derived) continue;
    baptizedRows.push(
      derivedTitularToBaptizedCompanionRow(derived, {
        pLinkStub: editedId === hostId ? c : null,
      })
    );
    seenBaptized.add(did);
  }

  for (const c of getBautizosCompanionsArray(hostState)) {
    const sk = String(c?.linkedCompanionSourceKey || '').trim();
    if (sk.startsWith('p:')) continue;
    if (!isBautizosCompanionBaptized(c)) continue;
    baptizedRows.push({ ...c, willBeBaptized: SI, birthDate: normalizeBirthDateToIso(c.birthDate) || '' });
  }

  if (editedId && editedId !== hostId && !seenBaptized.has(editedId) && editedPayload) {
    baptizedRows.push(derivedTitularToBaptizedCompanionRow({ id: editedId, ...editedPayload }));
  }

  return {
    ...hostState,
    bautizosCompanions: [...baptizedRows, ...simpleCompanions],
  };
}

export function buildDocIdBySlotKeyForSplitParty(virtualEntry, hostId, hostCompanionState, derivedMembers) {
  const descriptors = getBautizosSplitPartySlotDescriptors(virtualEntry);
  if (!descriptors) return null;
  const docIdBySlotKey = { host: String(hostId).trim() };
  const pLinks = getBautizosCompanionsArray(hostCompanionState).filter((c) =>
    String(c?.linkedCompanionSourceKey || '').startsWith('p:')
  );
  const baptizedDesc = descriptors.filter((d) => d.slotKey !== 'host');
  for (let i = 0; i < baptizedDesc.length; i++) {
    const d = baptizedDesc[i];
    const pLink = pLinks[i];
    let did = String(pLink?.linkedRegistrantId || String(pLink?.linkedCompanionSourceKey || '').slice(2)).trim();
    if (!did) {
      const row = getBautizosCompanionsArray(virtualEntry)[d.companionIndex];
      const match = (derivedMembers || []).find(
        (p) =>
          normalizePersonNameKey(p.name) === normalizePersonNameKey(row?.name) ||
          (row?.vnpPersonId && String(p?.vnpPersonId || '') === String(row.vnpPersonId))
      );
      did = String(match?.id || '').trim();
    }
    if (did) docIdBySlotKey[d.slotKey] = did;
  }
  return docIdBySlotKey;
}

const SPLIT_DERIVED_TITULAR_SYNC_KEYS = [
  'name',
  'phone',
  'birthDate',
  'gender',
  'bloodType',
  'emergencyContact',
  'emergencyPhone',
  'emergencyRelationship',
  'hasAllergy',
  'allergyCategory',
  'allergyDetails',
  'hasDisease',
  'diseaseDetails',
  'diseaseMedication',
  'hasDisability',
  'disabilityDetails',
  'wantsBautizosTransport',
  'llegaEnCarro',
  'regresaEnCarro',
  'carrosLlegada',
  'travelFrom',
  'travelTo',
  'vnpPersonId',
  'baptismShirtSize',
  'location',
];

function buildSplitPartyDerivedTitularSyncPatch(virtualEntry, loc, slotDescriptor) {
  const plSlot = buildParticipantLikeForBautizosSplitSlot(virtualEntry, loc, slotDescriptor);
  const patch = {};
  for (const k of SPLIT_DERIVED_TITULAR_SYNC_KEYS) {
    if (plSlot[k] !== undefined) patch[k] = plSlot[k];
  }
  patch.registeredCost = 0;
  patch.registeredCostManual = true;
  return patch;
}

/**
 * Plan de parches para sincronizar espejos del grupo partido tras editar host o derivado.
 * @returns {Array<{ participantId: string, patch: object, location: string }>}
 */
export function planBautizosSplitPartyMirrorSync({
  editedId,
  editedPayload,
  roster,
  loc,
  vnpCompanionHelpers,
  recalcHostCost,
  hostListPrice,
}) {
  const editedIdStr = String(editedId || '').trim();
  const edited = editedPayload && typeof editedPayload === 'object' ? { ...editedPayload } : {};
  const rosterList = Array.isArray(roster) ? roster : [];

  const hostId = String(edited.bautizosSplitPartyHostParticipantId || editedIdStr).trim();
  const hostFromRoster = rosterList.find((p) => String(p?.id || '') === hostId);
  if (!hostFromRoster) return [];

  const derivedMembers = getBautizosSplitPartyDerivedMembers(hostFromRoster, rosterList);
  if (!derivedMembers.length) return [];

  const virtualEntry = buildBautizosSplitPartyVirtualEntry(hostFromRoster, derivedMembers, {
    editedId: editedIdStr,
    editedPayload: edited,
  });

  const descriptors = getBautizosSplitPartySlotDescriptors(virtualEntry);
  if (!descriptors) return [];

  let hostState = hostFromRoster;
  if (editedIdStr === hostId) hostState = { ...hostFromRoster, ...edited };

  const docIdBySlotKey = buildDocIdBySlotKeyForSplitParty(virtualEntry, hostId, hostState, derivedMembers);
  if (!docIdBySlotKey) return [];

  const l = String(loc || virtualEntry.location || hostFromRoster.location || '').trim();
  const plans = [];

  for (const d of descriptors) {
    const pid = String(docIdBySlotKey[d.slotKey] || '').trim();
    if (!pid || pid === editedIdStr) continue;

    const comps = buildSplitPartyCompanionsForSlot({
      personLike: virtualEntry,
      loc: l,
      targetSlotKey: d.slotKey,
      docIdBySlotKey,
      vnpCompanionHelpers,
    });

    if (d.slotKey === 'host') {
      const hostPatch = { bautizosCompanions: comps };
      if (recalcHostCost && Number.isFinite(hostListPrice)) {
        hostPatch.registeredCost = hostListPrice;
      }
      plans.push({ participantId: pid, patch: hostPatch, location: l });
      continue;
    }

    const titularPatch = buildSplitPartyDerivedTitularSyncPatch(virtualEntry, l, d);
    titularPatch.bautizosCompanions = comps;
    titularPatch.bautizosSplitPartyHostParticipantId = hostId;
    plans.push({ participantId: pid, patch: titularPatch, location: l });
  }

  return plans;
}

/**
 * Plan de reparación para un registro derivado (grupo partido).
 * @typedef {object} BautizosSplitCompanionLinkRepairPlan
 * @property {string} participantId
 * @property {string} derivedName
 * @property {string} hostId
 * @property {string} hostName
 * @property {string} location
 * @property {object[]} bautizosCompanions
 * @property {Array<{ companionName: string, relationship: string, linkKey: string }>} matches
 */

/**
 * En registros derivados de un grupo partido (acompañante bautizado), las filas de acompañantes
 * que no se bautizan deben apuntar al host (`c:<hostId>::<companionId>`) para no duplicar el menú lateral.
 * @returns {BautizosSplitCompanionLinkRepairPlan|null}
 */
export function planBautizosSplitDerivedCompanionLinkRepair(derivedPerson, hostPerson) {
  const hostId = String(derivedPerson?.bautizosSplitPartyHostParticipantId || '').trim();
  if (!hostId || !hostPerson || String(hostPerson.id) !== hostId) return null;

  const hostByName = new Map();
  for (const c of getBautizosCompanionsArray(hostPerson)) {
    if (isBautizosCompanionBaptized(c)) continue;
    const sk = String(c?.linkedCompanionSourceKey || '').trim();
    if (sk) continue;
    const nm = normalizePersonNameKey(c?.name);
    const cid = String(c?.id || '').trim();
    if (!nm || !cid) continue;
    if (!hostByName.has(nm)) hostByName.set(nm, c);
  }

  const matches = [];
  let changed = false;
  const next = getBautizosCompanionsArray(derivedPerson).map((c) => {
    if (isBautizosCompanionBaptized(c)) return c;
    const sk = String(c?.linkedCompanionSourceKey || '').trim();
    if (sk.startsWith('p:') || sk.startsWith('c:')) return c;

    const nm = normalizePersonNameKey(c?.name);
    const hostRow = nm ? hostByName.get(nm) : null;
    if (!hostRow) return c;

    const hostCid = String(hostRow.id || '').trim();
    if (!hostCid) return c;

    const expectedSk = `c:${hostId}::${hostCid}`;
    if (sk === expectedSk && c?.linkedNoExtraCharge) return c;

    changed = true;
    matches.push({
      companionName: String(c.name || hostRow.name || '').trim(),
      relationship: String(c.relationship || hostRow.relationship || '').trim(),
      linkKey: expectedSk,
    });
    return {
      ...c,
      linkedNoExtraCharge: true,
      linkedCompanionSourceKey: expectedSk,
      linkedCompanionName: String(c.name || hostRow.name || '').trim(),
      linkedCompanionRelationship: String(c.relationship || hostRow.relationship || '').trim(),
      linkedRegistrantId: hostId,
      linkedRegistrantName: String(hostPerson.name || '').trim(),
      linkedCompanionId: hostCid,
      willBeBaptized: 'No',
    };
  });

  if (!changed) return null;
  return {
    participantId: String(derivedPerson.id),
    derivedName: String(derivedPerson.name || '').trim() || '—',
    hostId,
    hostName: String(hostPerson.name || '').trim() || '—',
    location: String(derivedPerson.location || hostPerson.location || '').trim(),
    bautizosCompanions: next,
    matches,
  };
}

/** @returns {object[]|null} Nuevo arreglo `bautizosCompanions` o null si no hubo cambios. */
export function repairBautizosSplitDerivedCompanionLinks(derivedPerson, hostPerson) {
  const plan = planBautizosSplitDerivedCompanionLinkRepair(derivedPerson, hostPerson);
  return plan ? plan.bautizosCompanions : null;
}

/**
 * Planes de reparación para registros derivados del evento que aún tienen acompañantes «sueltos» duplicados.
 * @param {object[]} roster
 * @returns {BautizosSplitCompanionLinkRepairPlan[]}
 */
export function collectBautizosSplitDerivedCompanionLinkRepairs(roster) {
  const list = Array.isArray(roster) ? roster : [];
  const byId = new Map();
  for (const p of list) {
    const id = String(p?.id || '').trim();
    if (id) byId.set(id, p);
  }
  const out = [];
  for (const p of list) {
    const hostId = String(p?.bautizosSplitPartyHostParticipantId || '').trim();
    if (!hostId) continue;
    const host = byId.get(hostId);
    if (!host) continue;
    const plan = planBautizosSplitDerivedCompanionLinkRepair(p, host);
    if (plan) out.push(plan);
  }
  return out;
}

/**
 * Validación de teléfonos / VNPM para un grupo partido (sin subregistros bautizados en el host).
 */
export function getBautizosSplitPartySubmitBlockingError({
  personLike,
  loc,
  participants,
  eventId,
  docIdBySlotKey,
  canonicalizeVnpPersonId,
  generateVnpPersonId,
  participantBlocksDuplicateRegistration,
  phoneDuplicateInEvent,
  isPhoneShareFamilyAllowed,
  digitsOnlyPhone,
  calculateAgeFromBirthDate,
}) {
  const descriptors = getBautizosSplitPartySlotDescriptors(personLike);
  if (!descriptors) return null;
  const blockingVnps = collectBlockingVnpPersonIdsForBautizosEvent(participants, eventId, {
    excludeParticipantId: undefined,
    canonicalizeVnpPersonId,
    participantBlocksDuplicateRegistration,
  });
  const batch = [];
  for (const d of descriptors) {
    const pl = buildParticipantLikeForBautizosSplitSlot(personLike, loc, d);
    const age =
      d.slotKey === 'host'
        ? pl.age
        : calculateAgeFromBirthDate(pl.birthDate || '');
    const vnp =
      canonicalizeVnpPersonId(pl.vnpPersonId || '') ||
      generateVnpPersonId({ ...pl, age: age || pl.age });
    batch.push({ descriptor: d, pl, age, vnp, name: getDisplayNameForBautizosSplitSlot(personLike, d) });
  }
  const seenV = new Set();
  for (const { vnp, name } of batch) {
    if (blockingVnps.has(vnp)) {
      return `Integrante del grupo (${name}): el ID VNPM ya está en uso en este evento.`;
    }
    if (seenV.has(vnp)) {
      return 'Dos integrantes del mismo registro no pueden compartir el mismo ID VNPM.';
    }
    seenV.add(vnp);
  }
  for (const { pl, age, name, descriptor } of batch) {
    const docId = docIdBySlotKey[descriptor.slotKey];
    const cd = digitsOnlyPhone(pl.phone || '');
    if (
      phoneDuplicateInEvent(
        pl.name,
        cd,
        participants,
        eventId,
        docId,
        age,
        !!pl.allowSharedMainPhone
      )
    ) {
      return `Integrante del grupo (${name}): ya hay un inscrito o en lista de espera con este teléfono.`;
    }
  }
  for (let i = 0; i < batch.length; i++) {
    for (let j = i + 1; j < batch.length; j++) {
      const a = batch[i];
      const b = batch[j];
      const da = digitsOnlyPhone(a.pl.phone || '');
      const db = digitsOnlyPhone(b.pl.phone || '');
      if (da.length < 10 || da !== db) continue;
      if (!isPhoneShareFamilyAllowed(a.pl.name, a.age, b.pl.name, b.age)) {
        return 'Dos integrantes del grupo comparten el mismo teléfono sin regla familiar permitida.';
      }
    }
  }
  return null;
}

/**
 * @param {object} [vnpCompanionHelpers] — si se pasa `{ canonicalizeVnpPersonId, generateVnpPersonId }`,
 *   cada fila bautizada recibe `vnpPersonId` estable (existente canónico o generado).
 */
export function normalizeBautizosCompanionsForPersist(personLike, loc = '', vnpCompanionHelpers = null) {
  const safeLoc = String(loc || personLike?.location || '').trim();
  const raw = getFilledBautizosCompanions(personLike);
  const canon = vnpCompanionHelpers?.canonicalizeVnpPersonId;
  const gen = vnpCompanionHelpers?.generateVnpPersonId;
  return raw.map((row, idx) => {
    const idRaw = String(row?.id || '').trim();
    const id = idRaw || `bc-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`;
    const arrivesByCar = !!row?.llegaEnCarro;
    const baptized = isSiValue(row?.willBeBaptized);
    const base = {
      id,
      name: String(row?.name || '').trim(),
      relationship: String(row?.relationship || '').trim(),
      linkedNoExtraCharge: !!row?.linkedNoExtraCharge,
      linkedCompanionSourceKey: String(row?.linkedCompanionSourceKey || '').trim(),
      linkedCompanionName: String(row?.linkedCompanionName || '').trim(),
      linkedCompanionRelationship: String(row?.linkedCompanionRelationship || '').trim(),
      linkedRegistrantName: String(row?.linkedRegistrantName || '').trim(),
      linkedRegistrantId: String(row?.linkedRegistrantId || '').trim(),
      linkedCompanionId: String(row?.linkedCompanionId || '').trim(),
      wantsBautizosTransport: arrivesByCar ? 'No' : (isSiValue(row?.wantsBautizosTransport) ? SI : 'No'),
      willBeBaptized: baptized ? SI : 'No',
      llegaEnCarro: arrivesByCar,
      regresaEnCarro: !!row?.regresaEnCarro,
      carrosLlegada: normalizeArrivalCarCount(row?.carrosLlegada),
      travelFrom: String(row?.travelFrom || safeLoc).trim() || safeLoc,
      travelTo: String(row?.travelTo || safeLoc).trim() || safeLoc,
      birthDate: normalizeBirthDateToIso(row?.birthDate) || '',
    };
    if (!baptized) {
      return appendCompanionWaitlistPersistFields(base, row);
    }
    const genderNorm = row?.gender === '' || row?.gender == null ? '' : String(row.gender).trim();
    const birthNorm = normalizeBirthDateToIso(row?.birthDate) || '';
    let vnpPersonId = '';
    if (typeof canon === 'function' && typeof gen === 'function') {
      const vnpId = canon(row?.vnpPersonId || '');
      vnpPersonId = vnpId || gen({ name: base.name, birthDate: birthNorm, gender: genderNorm });
    } else {
      vnpPersonId = String(row?.vnpPersonId || '').trim();
    }
    return appendCompanionWaitlistPersistFields({
      ...base,
      phone: String(row?.phone || '').trim(),
      gender: genderNorm,
      birthDate: birthNorm,
      vnpPersonId,
      bloodType: String(row?.bloodType ?? '').trim(),
      emergencyContact: String(row?.emergencyContact || '').trim(),
      emergencyPhone: String(row?.emergencyPhone || '').trim(),
      emergencyRelationship: String(row?.emergencyRelationship || '').trim(),
      hasAllergy: isSiValue(row?.hasAllergy) ? SI : 'No',
      allergyCategory: String(row?.allergyCategory || '').trim(),
      allergyDetails: String(row?.allergyDetails || '').trim(),
      hasDisease: isSiValue(row?.hasDisease) ? SI : 'No',
      diseaseDetails: String(row?.diseaseDetails || '').trim(),
      diseaseMedication: String(row?.diseaseMedication || '').trim(),
      hasDisability: isSiValue(row?.hasDisability) ? SI : 'No',
      disabilityDetails: String(row?.disabilityDetails || '').trim(),
    }, row);
  });
}

function appendCompanionWaitlistPersistFields(base, row) {
  const out = { ...base };
  if (row?.companionWaitlistPending === true) {
    out.companionWaitlistPending = true;
    if (row?.companionWaitlistCreatedAt != null) {
      out.companionWaitlistCreatedAt = row.companionWaitlistCreatedAt;
    }
    if (row?.companionWaitlistPromoteListPrice != null) {
      out.companionWaitlistPromoteListPrice = row.companionWaitlistPromoteListPrice;
    }
  }
  return out;
}
