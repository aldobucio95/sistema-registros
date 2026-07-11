import { buildParticipantChangeLogEntries } from './participantEventFieldScope.js';
import { getFilledBautizosCompanions } from './bautizosParty.js';
import { normalizeCarVehicleMeta } from './bautizosCarMeta.js';
import { formatFieldChange, formatLogScalar, logScalarsEquivalent } from './activityLogDiff.js';
import { normalizeBirthDateToIso } from './birthDateIsoUtils.js';
import { formatPersonNameString } from './participantNameFormat.js';

const COMPANION_DIFF_FIELDS = [
  { key: 'name', label: 'nombre' },
  { key: 'relationship', label: 'parentesco' },
  { key: 'willBeBaptized', label: 'bautismo' },
  { key: 'wantsBautizosTransport', label: 'transporte evento' },
  { key: 'llegaEnCarro', label: 'llega en carro' },
  { key: 'regresaEnCarro', label: 'regresa en carro' },
  { key: 'travelFrom', label: 'sale de' },
  { key: 'travelTo', label: 'regresa a' },
  { key: 'birthDate', label: 'fecha nacimiento' },
  { key: 'linkedCompanionSourceKey', label: 'vínculo acompañante' },
  { key: 'linkedRegistrantId', label: 'vínculo registro' },
];

const REGISTRATION_EDIT_SCALAR_FIELDS = [
  { key: 'name', label: 'Nombre' },
  { key: 'phone', label: 'Teléfono' },
  { key: 'paid', label: 'Monto Pagado' },
  { key: 'emergencyContact', label: 'Contacto emergencia' },
  { key: 'emergencyPhone', label: 'Tel. emergencia' },
  { key: 'emergencyRelationship', label: 'Parentesco emergencia' },
  { key: 'alias', label: 'Alias' },
  { key: 'birthDate', label: 'Fecha nacimiento' },
  { key: 'vnpPersonId', label: 'ID VNPM' },
  { key: 'llegaEnCarro', label: 'Llega en carro' },
  { key: 'regresaEnCarro', label: 'Regresa en carro' },
  { key: 'transportType', label: 'Tipo transporte' },
  { key: 'wantsBautizosTransport', label: 'Transporte evento (Bautizos)' },
  { key: 'wantsBautizosFood', label: 'Alimentos evento (Bautizos)' },
  { key: 'carrosLlegada', label: 'Carros llegada' },
  { key: 'attendanceSpecialType', label: 'Asistencia especial' },
  { key: 'isScholarship', label: 'Becado' },
  { key: 'scholarshipType', label: 'Tipo beca' },
  { key: 'scholarshipPartialAmount', label: 'Beca parcial — monto becado ($)' },
  { key: 'responsivaStatus', label: 'Responsiva' },
  { key: 'isServer', label: 'Servidor' },
  { key: 'serverAssignment', label: 'Asignación' },
  { key: 'ambosServeInSegment', label: 'Ambos: sirve en segmento' },
  { key: 'campAssignment', label: 'Asig. Campista' },
  { key: 'willBeBaptized', label: 'Bautizo' },
  { key: 'baptismSegment', label: 'Bautizo (Teens/Jóvenes)' },
  { key: 'baptismShirtSize', label: 'Talla playera (bautizados)' },
  { key: 'canSwim', label: 'Nado' },
  { key: 'age', label: 'Edad' },
  { key: 'travelFrom', label: 'Sale de' },
  { key: 'travelTo', label: 'Regresa a' },
  { key: 'isMarried', label: 'Es casado' },
  { key: 'spouseName', label: 'Nombre de pareja' },
  { key: 'spouseParticipantId', label: 'Registro pareja (id)' },
  { key: 'spousePhone', label: 'Tel. pareja (pendiente)' },
  { key: 'goesWithChildren', label: 'Va con hijos' },
  { key: 'childrenCount', label: 'Cant. hijos' },
  { key: 'servedOtherCampa', label: 'Sirvió en otro campa' },
  { key: 'servedAreas', label: 'áreas previas' },
  { key: 'preferredServeArea', label: 'área deseada' },
  { key: 'servesInCongress', label: 'Sirve en congre' },
  { key: 'congressServeArea', label: 'área en congre' },
  { key: 'hasAllergy', label: 'Alergia' },
  { key: 'allergyCategory', label: 'Categoría Alergia' },
  { key: 'allergyDetails', label: 'Detalle Alergia' },
  { key: 'hasDisease', label: 'Enfermedad' },
  { key: 'diseaseDetails', label: 'Detalle Enfermedad' },
  { key: 'diseaseMedication', label: 'Medicamento' },
  { key: 'hasDisability', label: 'Discapacidad' },
  { key: 'disabilityDetails', label: 'Detalle Discapacidad' },
  { key: 'status', label: 'Estado registro' },
  { key: 'registeredCost', label: 'Costo lista (manual)' },
];

function companionStableKey(c, index = 0) {
  const id = String(c?.id || '').trim();
  if (id) return id;
  const name = String(c?.name || c?.linkedCompanionName || '')
    .trim()
    .toLowerCase();
  const rel = String(c?.relationship || c?.linkedCompanionRelationship || '')
    .trim()
    .toLowerCase();
  return `row:${index}:${name}|${rel}`;
}

function companionDisplayLabel(c) {
  const name = String(c?.name || c?.linkedCompanionName || '').trim() || 'Sin nombre';
  const rel = String(c?.relationship || c?.linkedCompanionRelationship || '').trim();
  const linked =
    String(c?.linkedCompanionSourceKey || '').trim() ||
    String(c?.linkedRegistrantId || '').trim();
  let label = rel ? `${name} (${rel})` : name;
  if (linked) label += ' [vinculado]';
  return label;
}

function companionFieldDiffs(prevRow, nextRow) {
  const parts = [];
  for (const { key, label } of COMPANION_DIFF_FIELDS) {
    const prevVal = formatLogScalar(prevRow?.[key]);
    const nextVal = formatLogScalar(nextRow?.[key]);
    if (!logScalarsEquivalent(prevRow?.[key], nextRow?.[key]) && prevVal !== nextVal) {
      parts.push(`${label} ${prevVal}→${nextVal}`);
    }
  }
  return parts;
}

function normalizeCompanionRowForLog(c) {
  const row = c && typeof c === 'object' ? c : {};
  const out = {};
  for (const { key } of COMPANION_DIFF_FIELDS) {
    let val = row[key];
    if (key === 'birthDate') {
      out[key] = normalizeBirthDateToIso(val) || '';
    } else if (key === 'name') {
      out[key] = formatPersonNameString(val || row.linkedCompanionName || '');
    } else {
      out[key] = val ?? '';
    }
    if (typeof out[key] === 'string') {
      out[key] = out[key].trim().normalize('NFC').replace(/\s+/g, ' ');
    }
  }
  return out;
}

function companionsLogEquivalent(prevRaw, nextRaw) {
  const prev = getFilledBautizosCompanions({ bautizosCompanions: prevRaw });
  const next = getFilledBautizosCompanions({ bautizosCompanions: nextRaw });
  if (prev.length !== next.length) return false;
  const prevKeys = prev.map((c, i) => companionStableKey(c, i));
  const nextKeys = next.map((c, i) => companionStableKey(c, i));
  for (let i = 0; i < prev.length; i += 1) {
    const key = prevKeys[i];
    const nextIdx = nextKeys.indexOf(key);
    if (nextIdx < 0) return false;
    const a = normalizeCompanionRowForLog(prev[i]);
    const b = normalizeCompanionRowForLog(next[nextIdx]);
    if (JSON.stringify(a) !== JSON.stringify(b)) return false;
  }
  for (let i = 0; i < next.length; i += 1) {
    if (!prevKeys.includes(nextKeys[i])) return false;
  }
  return true;
}

/** Resumen legible de datos de carro capturados en el formulario de edición/alta. */
export function describeCarDraftMetaRegistrationChange(carDraftMeta) {
  if (!carDraftMeta || typeof carDraftMeta !== 'object') return null;
  const parts = [];
  for (const [vehicleKey, raw] of Object.entries(carDraftMeta)) {
    const m = normalizeCarVehicleMeta(raw);
    const carLabel = String(vehicleKey || '').includes('|c')
      ? `carro ${String(vehicleKey).split('|c').pop()}`
      : 'carro';
    const bits = [];
    if (m.brand) bits.push(`marca ${m.brand}`);
    if (m.model) bits.push(`modelo ${m.model}`);
    if (m.color) bits.push(`color ${m.color}`);
    if (m.plates) bits.push(`placas ${m.plates}`);
    if (m.driverSourceKey) bits.push('conductor asignado');
    if (Array.isArray(m.passengerSourceKeys) && m.passengerSourceKeys.length) {
      bits.push(`${m.passengerSourceKeys.length} pasajero(s)`);
    }
    if (bits.length) parts.push(`${carLabel}: ${bits.join(', ')}`);
  }
  if (!parts.length) return null;
  return `Datos de carro (${parts.join('; ')})`;
}

export function describeBautizosCompanionsRegistrationChange(prevRaw, nextRaw) {
  if (companionsLogEquivalent(prevRaw, nextRaw)) return null;

  const prev = getFilledBautizosCompanions({ bautizosCompanions: prevRaw });
  const next = getFilledBautizosCompanions({ bautizosCompanions: nextRaw });

  const prevKeys = prev.map((c, i) => companionStableKey(c, i));
  const nextKeys = next.map((c, i) => companionStableKey(c, i));
  const prevKeySet = new Set(prevKeys);

  const removed = [];
  const added = [];
  const modified = [];

  for (let i = 0; i < prev.length; i += 1) {
    const key = prevKeys[i];
    const nextIdx = nextKeys.indexOf(key);
    if (nextIdx < 0) {
      removed.push(companionDisplayLabel(prev[i]));
      continue;
    }
    const diffs = companionFieldDiffs(prev[i], next[nextIdx]);
    if (diffs.length) {
      modified.push(`${companionDisplayLabel(next[nextIdx])}: ${diffs.join(', ')}`);
    }
  }

  for (let i = 0; i < next.length; i += 1) {
    if (!prevKeySet.has(nextKeys[i])) {
      added.push(companionDisplayLabel(next[i]));
    }
  }

  const segments = [];
  if (removed.length) segments.push(`eliminó ${removed.join('; ')}`);
  if (added.length) segments.push(`agregó ${added.join('; ')}`);
  if (modified.length) segments.push(`modificó ${modified.join('; ')}`);

  if (!removed.length && !added.length && !modified.length) return null;

  const summary = segments.join('; ');
  return `Acompañantes (${prev.length}→${next.length}): ${summary}`;
}

export function describePrivacyNoticeChange(original, edited) {
  const parts = [];
  const prevV = String(original?.privacyNoticeVersion || '').trim();
  const nextV = String(edited?.privacyNoticeVersion || '').trim();
  if (prevV !== nextV && (prevV || nextV)) {
    parts.push(formatFieldChange('Aviso privacidad (versión)', prevV || '—', nextV || '—'));
  }
  const prevAt = String(original?.privacyNoticeAcceptedAt || '').trim();
  const nextAt = String(edited?.privacyNoticeAcceptedAt || '').trim();
  if (prevAt !== nextAt && (prevAt || nextAt)) {
    parts.push(formatFieldChange('Aviso privacidad (aceptado)', prevAt || '—', nextAt || '—'));
  }
  const prevCh = String(original?.privacyNoticeChannel || '').trim();
  const nextCh = String(edited?.privacyNoticeChannel || '').trim();
  if (prevCh !== nextCh && (prevCh || nextCh)) {
    parts.push(formatFieldChange('Canal aviso privacidad', prevCh || '—', nextCh || '—'));
  }
  return parts.length ? parts.join(', ') : null;
}

export function describeSpouseLinkChange(original, edited, resolveName = null) {
  const prevId = String(original?.spouseParticipantId || '').trim();
  const nextId = String(edited?.spouseParticipantId || '').trim();
  if (prevId === nextId) return null;
  const nameOf = (id) => {
    if (!id) return '—';
    if (typeof resolveName === 'function') {
      const n = resolveName(id);
      if (n) return n;
    }
    return id;
  };
  return formatFieldChange('Pareja vinculada', nameOf(prevId), nameOf(nextId));
}

export function describeRegisteredCostChange(prevCost, nextCost, reason = '') {
  const prev = Number(prevCost ?? 0);
  const next = Number(nextCost ?? 0);
  if (prev === next) return null;
  const suffix = reason ? ` (${reason})` : '';
  return `Costo lista (${prev} → ${next})${suffix}`;
}

function waNotificationSummary(n) {
  const kind = String(n?.kind || 'aviso').trim();
  const sent = n?.sent ? 'enviado' : 'pendiente';
  return `${kind} (${sent})`;
}

/** Resumen de cambios en cola WA (no el texto del mensaje). */
export function describeWhatsAppQueueChange(prevRaw, nextRaw) {
  const prev = Array.isArray(prevRaw) ? prevRaw : [];
  const next = Array.isArray(nextRaw) ? nextRaw : [];
  if (JSON.stringify(prev) === JSON.stringify(next)) return null;

  const prevById = new Map(prev.map((n) => [String(n?.id || ''), n]).filter(([k]) => k));
  const nextById = new Map(next.map((n) => [String(n?.id || ''), n]).filter(([k]) => k));

  const parts = [];
  for (const [id, p] of prevById) {
    if (!nextById.has(id)) {
      parts.push(`eliminó aviso ${waNotificationSummary(p)}`);
      continue;
    }
    const n = nextById.get(id);
    if (!!p?.sent !== !!n?.sent) {
      parts.push(
        `${String(n?.kind || 'aviso')}: ${p?.sent ? 'enviado' : 'pendiente'}→${n?.sent ? 'enviado' : 'pendiente'}`
      );
    }
  }
  for (const [id, n] of nextById) {
    if (!prevById.has(id)) parts.push(`añadió aviso ${waNotificationSummary(n)}`);
  }

  if (!parts.length) return `Cola WhatsApp (${prev.length}→${next.length} avisos)`;
  return `Cola WhatsApp: ${parts.slice(0, 5).join('; ')}${parts.length > 5 ? `; y ${parts.length - 5} más` : ''}`;
}

export function describeNewRegistrationCompanions(companions) {
  const filled = getFilledBautizosCompanions({ bautizosCompanions: companions });
  if (!filled.length) return '';
  const labels = filled.map(companionDisplayLabel);
  if (labels.length <= 3) {
    return ` Acompañantes: ${labels.join('; ')}.`;
  }
  return ` Acompañantes (${labels.length}): ${labels.slice(0, 3).join('; ')}; y ${labels.length - 3} más.`;
}

/**
 * Cambios legibles al editar un registro (sin costo recalculado ni campaña — esos van después en App.jsx).
 */
export function buildRegistrationEditScalarChanges({
  originalPerson,
  editedPerson,
  eventType,
  scholarshipDetailsMeaningful = false,
  hasAdminRights = false,
  loc = '',
  resolveSpouseName = null,
  includeManualRegisteredCost = true,
}) {
  const changes = [];
  const filteredFields = REGISTRATION_EDIT_SCALAR_FIELDS.filter((f) => {
    if (f.key === 'registeredCost' && !includeManualRegisteredCost) return false;
    if ((f.key === 'scholarshipType' || f.key === 'scholarshipPartialAmount') && !scholarshipDetailsMeaningful) {
      return false;
    }
    if (f.key === 'registeredCost' && !editedPerson?.registeredCostManual) return false;
    return true;
  });

  changes.push(
    ...buildParticipantChangeLogEntries(
      originalPerson,
      editedPerson,
      filteredFields,
      eventType,
      (f, prev, next) => `${f.label} (${formatLogScalar(prev)} → ${formatLogScalar(next)})`,
      {
        shouldSkipField: (f, orig, edit) => {
          if (f.key === 'age') {
            const prevBirth = normalizeBirthDateToIso(orig?.birthDate) || '';
            const nextBirth = normalizeBirthDateToIso(edit?.birthDate) || '';
            if (prevBirth && nextBirth && prevBirth === nextBirth) return true;
          }
          if (f.key === 'birthDate') {
            const prevBirth = normalizeBirthDateToIso(orig?.birthDate) || '';
            const nextBirth = normalizeBirthDateToIso(edit?.birthDate) || '';
            if (prevBirth && nextBirth && prevBirth === nextBirth) return true;
          }
          return false;
        },
      }
    )
  );

  if (!!originalPerson?.allowSharedMainPhone !== !!editedPerson?.allowSharedMainPhone) {
    changes.push(
      formatFieldChange(
        'Mismo teléfono permitido',
        originalPerson?.allowSharedMainPhone ? 'Sí' : 'No',
        editedPerson?.allowSharedMainPhone ? 'Sí' : 'No'
      )
    );
  }

  const companionChange = describeBautizosCompanionsRegistrationChange(
    originalPerson?.bautizosCompanions,
    editedPerson?.bautizosCompanions
  );
  if (companionChange) changes.push(companionChange);

  if (
    String(originalPerson?.bautizosAttendanceType || '') !== String(editedPerson?.bautizosAttendanceType || '')
  ) {
    changes.push(
      formatFieldChange(
        'Tipo de asistencia (bautizos)',
        originalPerson?.bautizosAttendanceType,
        editedPerson?.bautizosAttendanceType
      )
    );
  }

  const privacyChange = describePrivacyNoticeChange(originalPerson, editedPerson);
  if (privacyChange) changes.push(privacyChange);

  const spouseChange = describeSpouseLinkChange(originalPerson, editedPerson, resolveSpouseName);
  if (spouseChange) changes.push(spouseChange);

  const waChange = describeWhatsAppQueueChange(
    originalPerson?.whatsAppFinanceNotifications,
    editedPerson?.whatsAppFinanceNotifications
  );
  if (waChange) changes.push(waChange);

  if (hasAdminRights && String(originalPerson?.location || '') !== String(editedPerson?.location || loc)) {
    changes.push(formatFieldChange('Sede', originalPerson?.location, editedPerson?.location || loc));
  }

  return changes;
}

/** Diff humano desde snapshot `registro_editado`. */
function inferEventTypeFromEditSnapshot(snapshot) {
  if (snapshot?.eventType) return snapshot.eventType;
  const prev = snapshot?.previousData || {};
  const next = snapshot?.payload || {};
  if (prev.bautizosCompanions != null || next.bautizosCompanions != null) return 'Bautizos';
  if (prev.campAssignment != null || next.campAssignment != null) return 'Campa';
  return 'Campa';
}

export function describeRegistrationEditSnapshot(snapshot, eventType = null) {
  if (!snapshot || snapshot.kind !== 'registro_editado') return null;
  const prev = snapshot.previousData || {};
  const next = snapshot.payload || {};
  const evType = eventType || inferEventTypeFromEditSnapshot(snapshot);
  const changes = buildRegistrationEditScalarChanges({
    originalPerson: prev,
    editedPerson: next,
    eventType: evType,
    scholarshipDetailsMeaningful: true,
    includeManualRegisteredCost: true,
  });
  const prevCost = Number(prev.registeredCost ?? 0);
  const nextCost = Number(next.registeredCost ?? 0);
  if (prevCost !== nextCost && !changes.some((c) => c.startsWith('Costo lista'))) {
    const costLine = describeRegisteredCostChange(prevCost, nextCost);
    if (costLine) changes.push(costLine);
  }
  if (!changes.length) return 'Sin diferencias detectadas en campos rastreados.';
  return changes.join(', ');
}
