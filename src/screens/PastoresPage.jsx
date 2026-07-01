import React, { useMemo, useState } from 'react';
import { Church, Link2, MapPin, Save, Users } from 'lucide-react';
import {
  eventSupportsPastorStayDates,
  getPastorRealCostAmount,
  isPastorParticipant,
  normalizePastorStayDate,
} from '../pastorAttendance.js';
import { compareIsoDates, getEventEffectiveEndDate, getEventEffectiveStartDate } from '../eventDateHelpers.js';
import { getBautizosCompanionsArray } from '../bautizosParty.js';
import { resolveBautizosCarDataAnchor } from '../bautizosCarMeta.js';
import BautizosCarDataSummaryCard from '../components/transport/BautizosCarDataSummaryCard.jsx';
import CopyButton from '../components/CopyButton.jsx';
import { formatBirthDateExcelLabel } from '../birthDateIsoUtils.js';
import { uiKbd, uiListMobile, uiRosterMobile } from '../ui/uiFormatClasses.js';

const inputSm =
  'w-full min-w-0 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-[11px] font-semibold text-slate-800 dark:text-slate-100';

function companionDraftKey(hostId, companionId) {
  return `${hostId}::${companionId}`;
}

function buildDraftFromPerson(person, prevDraft) {
  if (prevDraft) return { ...prevDraft };
  return {
    pastorRealCost: getPastorRealCostAmount(person) ? String(getPastorRealCostAmount(person)) : '',
    pastorStayStart: normalizePastorStayDate(person?.pastorStayStart),
    pastorStayEnd: normalizePastorStayDate(person?.pastorStayEnd),
  };
}

function buildCompanionDraftFromRow(companion, prevDraft) {
  if (prevDraft) return { ...prevDraft };
  return {
    pastorStayStart: normalizePastorStayDate(companion?.pastorStayStart),
    pastorStayEnd: normalizePastorStayDate(companion?.pastorStayEnd),
  };
}

function listPastorCompanions(person) {
  return getBautizosCompanionsArray(person).filter((c) => String(c?.name || '').trim());
}

function displayLocation(person) {
  return String(person?.location || '').trim() || 'Sin sede';
}

function DetailRow({ label, value, copyLabel = null }) {
  const text = value == null ? '' : String(value).trim();
  if (!text || text === '—') return null;
  return (
    <div className="flex items-start justify-between gap-2 min-w-0">
      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide shrink-0">
        {label}
      </span>
      <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-100 text-right min-w-0 break-words leading-snug">
        {text}
        {copyLabel ? <CopyButton text={text} label={copyLabel} /> : null}
      </span>
    </div>
  );
}

function transportDetailRows(companion) {
  const rows = [];
  const rel = String(companion?.relationship || companion?.linkedCompanionRelationship || '').trim();
  if (rel) rows.push({ key: 'rel', label: 'Parentesco', value: rel });
  if (companion?.llegaEnCarro) rows.push({ key: 'go-car', label: 'Transporte ida', value: 'Llega en carro' });
  else if (companion?.wantsBautizosTransport === 'Si' || companion?.wantsBautizosTransport === 'Sí') {
    rows.push({ key: 'go-bus', label: 'Transporte ida', value: 'Transporte del evento' });
  }
  if (companion?.regresaEnCarro) rows.push({ key: 'ret-car', label: 'Transporte regreso', value: 'Regresa en carro' });
  const from = String(companion?.travelFrom || '').trim();
  const to = String(companion?.travelTo || '').trim();
  if (from) rows.push({ key: 'from', label: 'Sede salida', value: from, copyLabel: 'sede de salida' });
  if (to) rows.push({ key: 'to', label: 'Sede regreso', value: to, copyLabel: 'sede de regreso' });
  const cars = companion?.carrosLlegada;
  if (cars != null && String(cars).trim() !== '') {
    rows.push({ key: 'cars', label: 'Carros', value: String(cars) });
  }
  return rows;
}

function PersonDetailsPanel({ person, isCompanion = false }) {
  const birth = formatBirthDateExcelLabel(person?.birthDate);
  return (
    <div className="rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 px-2.5 py-2 space-y-1">
      {!isCompanion ? (
        <DetailRow label="Sede" value={displayLocation(person)} copyLabel="sede" />
      ) : null}
      <DetailRow label="Teléfono" value={person?.phone} copyLabel="teléfono" />
      <DetailRow label="ID VNPM" value={person?.vnpPersonId} copyLabel="ID VNPM" />
      <DetailRow label="Edad" value={person?.age != null && String(person.age).trim() !== '' ? String(person.age) : ''} />
      <DetailRow label="Género" value={person?.gender} />
      <DetailRow label="Nacimiento" value={birth && birth !== '—' ? birth : ''} copyLabel="fecha de nacimiento" />
    </div>
  );
}

/**
 * Administración de pastores del evento: costo real individual, fechas de estancia y grupo familiar.
 * Solo visible para administradores.
 */
export default function PastoresPage({
  event,
  participants,
  roster = [],
  visibleLocations,
  formatMoney,
  onSavePastorFields,
  savingPastorId = '',
}) {
  const eventType = event?.eventType;
  const isBautizos = eventType === 'Bautizos';
  const showStayDates = eventSupportsPastorStayDates(event);
  const eventStart = getEventEffectiveStartDate(event) || '';
  const eventEnd = getEventEffectiveEndDate(event) || '';

  const rows = useMemo(() => {
    const locSet =
      Array.isArray(visibleLocations) && visibleLocations.length > 0
        ? new Set(visibleLocations.map((l) => String(l).trim()))
        : null;
    return (participants || [])
      .filter((p) => isPastorParticipant(p, eventType))
      .filter((p) => {
        if (!locSet) return true;
        return locSet.has(String(p.location || '').trim());
      })
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'es'));
  }, [participants, eventType, visibleLocations]);

  const [draftById, setDraftById] = useState({});
  const [companionDraftByKey, setCompanionDraftByKey] = useState({});

  const getDraft = (person) => {
    const id = String(person?.id || '').trim();
    return buildDraftFromPerson(person, draftById[id]);
  };

  const getCompanionDraft = (hostPerson, companion) => {
    const hostId = String(hostPerson?.id || '').trim();
    const cid = String(companion?.id || '').trim();
    const key = companionDraftKey(hostId, cid);
    return buildCompanionDraftFromRow(companion, companionDraftByKey[key]);
  };

  const patchDraft = (person, patch) => {
    const id = String(person?.id || '').trim();
    if (!id) return;
    setDraftById((prev) => ({
      ...prev,
      [id]: { ...buildDraftFromPerson(person, prev[id]), ...patch },
    }));
  };

  const patchCompanionDraft = (hostPerson, companion, patch) => {
    const hostId = String(hostPerson?.id || '').trim();
    const cid = String(companion?.id || '').trim();
    if (!hostId || !cid) return;
    const key = companionDraftKey(hostId, cid);
    setCompanionDraftByKey((prev) => ({
      ...prev,
      [key]: { ...buildCompanionDraftFromRow(companion, prev[key]), ...patch },
    }));
  };

  const syncCompanionWithPastor = (hostPerson, companion) => {
    const hostDraft = getDraft(hostPerson);
    patchCompanionDraft(hostPerson, companion, {
      pastorStayStart: hostDraft.pastorStayStart,
      pastorStayEnd: hostDraft.pastorStayEnd,
    });
  };

  const validateStayRange = (start, end) => {
    const s = normalizePastorStayDate(start);
    const e = normalizePastorStayDate(end);
    if (s && e && compareIsoDates(s, e) > 0) {
      return 'La fecha de llegada no puede ser posterior a la de salida.';
    }
    if (s && eventStart && compareIsoDates(s, eventStart) < 0) {
      return 'La fecha de llegada no puede ser anterior al inicio del evento.';
    }
    if (e && eventEnd && compareIsoDates(e, eventEnd) > 0) {
      return 'La fecha de salida no puede ser posterior al fin del evento.';
    }
    return '';
  };

  const validateDraft = (draft) => {
    const stayErr = validateStayRange(draft.pastorStayStart, draft.pastorStayEnd);
    if (stayErr) return stayErr;
    const costRaw = String(draft.pastorRealCost ?? '').trim().replace(',', '.');
    if (costRaw !== '' && (!Number.isFinite(parseFloat(costRaw)) || parseFloat(costRaw) < 0)) {
      return 'El costo real debe ser un número mayor o igual a cero.';
    }
    return '';
  };

  const handleSave = async (person) => {
    const id = String(person?.id || '').trim();
    if (!id) return;
    const draft = getDraft(person);
    const err = validateDraft(draft);
    if (err) {
      window.alert(err);
      return;
    }
    const companions = listPastorCompanions(person);
    const companionStayDates = [];
    for (const c of companions) {
      const cd = getCompanionDraft(person, c);
      const stayErr = validateStayRange(cd.pastorStayStart, cd.pastorStayEnd);
      if (stayErr) {
        window.alert(`${String(c.name || 'Acompañante')}: ${stayErr}`);
        return;
      }
      companionStayDates.push({
        id: String(c.id || '').trim(),
        pastorStayStart: normalizePastorStayDate(cd.pastorStayStart),
        pastorStayEnd: normalizePastorStayDate(cd.pastorStayEnd),
      });
    }
    const costRaw = String(draft.pastorRealCost ?? '').trim().replace(',', '.');
    const pastorRealCost = costRaw === '' ? 0 : parseFloat(costRaw);
    await onSavePastorFields(id, {
      pastorRealCost,
      pastorStayStart: normalizePastorStayDate(draft.pastorStayStart),
      pastorStayEnd: normalizePastorStayDate(draft.pastorStayEnd),
      companionStayDates,
    });
    setDraftById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setCompanionDraftByKey((prev) => {
      const next = { ...prev };
      for (const c of companions) {
        delete next[companionDraftKey(id, String(c.id || '').trim())];
      }
      return next;
    });
  };

  const totalPastorCost = rows.reduce((s, p) => s + getPastorRealCostAmount(p), 0);

  const renderStayDateFields = (draft, onPatch, idPrefix, compact = false) => {
    if (!showStayDates) return null;
    const labelClass = compact
      ? 'text-[9px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide'
      : 'text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide';
    return (
      <>
        <div className="space-y-0.5">
          <label htmlFor={`${idPrefix}-stay-start`} className={labelClass}>
            Llega
          </label>
          <input
            id={`${idPrefix}-stay-start`}
            type="date"
            className={inputSm}
            min={eventStart || undefined}
            max={eventEnd || undefined}
            value={draft.pastorStayStart}
            onChange={(e) => onPatch({ pastorStayStart: e.target.value })}
          />
        </div>
        <div className="space-y-0.5">
          <label htmlFor={`${idPrefix}-stay-end`} className={labelClass}>
            Se va
          </label>
          <input
            id={`${idPrefix}-stay-end`}
            type="date"
            className={inputSm}
            min={eventStart || undefined}
            max={eventEnd || undefined}
            value={draft.pastorStayEnd}
            onChange={(e) => onPatch({ pastorStayEnd: e.target.value })}
          />
        </div>
      </>
    );
  };

  const renderPastorCard = (person, displayIndex, { mobileShell = false } = {}) => {
    const id = String(person.id || '').trim();
    const draft = getDraft(person);
    const companions = isBautizos ? listPastorCompanions(person) : [];
    const carAnchor =
      isBautizos && roster?.length
        ? resolveBautizosCarDataAnchor(person, roster, event)
        : { eligible: false };
    const companionDirty = companions.some((c) => {
      const key = companionDraftKey(id, String(c.id || '').trim());
      if (companionDraftByKey[key] == null) return false;
      const cd = getCompanionDraft(person, c);
      return (
        cd.pastorStayStart !== normalizePastorStayDate(c.pastorStayStart) ||
        cd.pastorStayEnd !== normalizePastorStayDate(c.pastorStayEnd)
      );
    });
    const dirty =
      draftById[id] != null ||
      companionDirty ||
      String(draft.pastorRealCost) !== String(getPastorRealCostAmount(person) || '') ||
      draft.pastorStayStart !== normalizePastorStayDate(person.pastorStayStart) ||
      draft.pastorStayEnd !== normalizePastorStayDate(person.pastorStayEnd);
    const saving = savingPastorId === id;
    const locLabel = displayLocation(person);

    const shellClass = mobileShell
      ? `${uiListMobile.itemViolet} px-2.5 py-2 space-y-2`
      : 'rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 shadow-sm space-y-2';

    return (
      <div key={id} className={shellClass}>
        <div className="flex flex-wrap items-start gap-2 justify-between">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              <span className={`${uiKbd.base} min-w-[1.5rem] h-5 justify-center shrink-0 text-[10px]`}>
                {displayIndex}
              </span>
              <span className="font-black text-slate-800 dark:text-slate-100 text-sm break-words min-w-0">
                {person.name || '(sin nombre)'}
              </span>
              <CopyButton text={person.name} label="nombre" />
            </div>
            <span className={`${uiRosterMobile.sedeBadge} text-[10px] py-0.5`}>
              <MapPin size={11} className="shrink-0" />
              {locLabel}
              <CopyButton text={locLabel === 'Sin sede' ? '' : locLabel} label="sede" />
            </span>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave(person)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-violet-700 text-white hover:bg-violet-800 disabled:opacity-60 shrink-0"
          >
            <Save size={13} />
            {saving ? 'Guardando…' : dirty ? 'Guardar' : 'Guardar'}
          </button>
        </div>

        <PersonDetailsPanel person={person} />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="space-y-0.5 col-span-2 sm:col-span-1">
            <label className="text-[9px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
              Costo real
            </label>
            <input
              type="text"
              inputMode="decimal"
              className={inputSm}
              placeholder="0"
              value={draft.pastorRealCost}
              onChange={(e) => patchDraft(person, { pastorRealCost: e.target.value })}
            />
          </div>
          {renderStayDateFields(draft, (patch) => patchDraft(person, patch), `pastor-${id}`, true)}
        </div>

        {isBautizos && companions.length > 0 ? (
          <div className="rounded-lg border border-violet-200/80 dark:border-violet-500/35 bg-violet-50/35 dark:bg-violet-950/15 px-2.5 py-2 space-y-2">
            <p className="text-[9px] font-black text-violet-800 dark:text-violet-200 uppercase tracking-wider inline-flex items-center gap-1">
              <Users size={11} />
              Acompañantes ({companions.length})
            </p>
            <div className="space-y-2">
              {companions.map((companion) => {
                const cid = String(companion.id || '').trim();
                const cd = getCompanionDraft(person, companion);
                const transportRows = transportDetailRows(companion);
                return (
                  <div
                    key={cid || companion.name}
                    className="rounded-lg border border-violet-100 dark:border-violet-500/25 bg-white dark:bg-slate-900 px-2.5 py-2 space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center gap-1 min-w-0">
                      <span className="text-[12px] font-bold text-slate-800 dark:text-slate-100 break-words">
                        {companion.name}
                      </span>
                      <CopyButton text={companion.name} label="nombre del acompañante" />
                    </div>
                    <div className="space-y-0.5">
                      {transportRows.map((row) => (
                        <DetailRow
                          key={row.key}
                          label={row.label}
                          value={row.value}
                          copyLabel={row.copyLabel}
                        />
                      ))}
                    </div>
                    <PersonDetailsPanel person={companion} isCompanion />
                    {showStayDates ? (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          {renderStayDateFields(
                            cd,
                            (patch) => patchCompanionDraft(person, companion, patch),
                            `companion-${id}-${cid}`,
                            true
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => syncCompanionWithPastor(person, companion)}
                          className="inline-flex items-center gap-1 text-[9px] font-bold text-violet-700 dark:text-violet-300 hover:text-violet-900 dark:hover:text-violet-100"
                        >
                          <Link2 size={11} />
                          Igualar fechas del titular
                        </button>
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {isBautizos && carAnchor.eligible && carAnchor.anchorPerson ? (
          <BautizosCarDataSummaryCard
            hostPerson={carAnchor.anchorPerson}
            companions={carAnchor.companionsForCrew}
            plan={event?.transportPlanning}
            roster={roster}
            eventLike={event}
            className="!p-2"
          />
        ) : null}
      </div>
    );
  };

  return (
    <div className="p-3 sm:p-4 space-y-3">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm px-3 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <Church className="text-violet-600 shrink-0" size={16} />
            Pastores
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
            Costo real, fechas de estancia
            {isBautizos ? ' y grupo familiar' : ''}.
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Pastores</p>
          <p className="text-xl font-black text-violet-700 dark:text-violet-300 tabular-nums leading-tight">
            {rows.length}
          </p>
          <p className="text-[9px] font-bold text-slate-500">
            Capturado:{' '}
            <span className="text-violet-700 dark:text-violet-300 tabular-nums">{formatMoney(totalPastorCost)}</span>
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 italic px-1">
          No hay pastores registrados en las sedes visibles de este evento.
        </p>
      ) : (
        <>
          <div className={uiRosterMobile.list}>
            {rows.map((person, i) => renderPastorCard(person, i + 1, { mobileShell: true }))}
          </div>
          <div className="hidden md:block space-y-2">
            {rows.map((person, i) => renderPastorCard(person, i + 1, { mobileShell: false }))}
          </div>
        </>
      )}
    </div>
  );
}
