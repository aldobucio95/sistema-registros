import React, { useMemo, useState } from 'react';
import { Church, Save, Users } from 'lucide-react';
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

const inputSm =
  'w-full min-w-0 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100';

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

function companionTransportLabel(companion) {
  const parts = [];
  const rel = String(companion?.relationship || companion?.linkedCompanionRelationship || '').trim();
  if (rel) parts.push(rel);
  if (companion?.llegaEnCarro) parts.push('Llega en carro');
  if (companion?.regresaEnCarro) parts.push('Regresa en carro');
  const from = String(companion?.travelFrom || '').trim();
  const to = String(companion?.travelTo || '').trim();
  if (from || to) parts.push(`Salida: ${from || '—'} · Regreso: ${to || '—'}`);
  return parts.join(' · ');
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

  const renderStayDateFields = (draft, onPatch, idPrefix) => {
    if (!showStayDates) return null;
    return (
      <>
        <div className="space-y-1">
          <label
            htmlFor={`${idPrefix}-stay-start`}
            className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide"
          >
            Llega al evento
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
        <div className="space-y-1">
          <label
            htmlFor={`${idPrefix}-stay-end`}
            className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide"
          >
            Se va del evento
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

  return (
    <div className="p-6 space-y-5">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
            <Church className="text-violet-600" size={18} />
            Pastores
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Registros activos con tipo de asistencia Pastor. Aquí se captura el costo real individual de cada uno
            {showStayDates ? ', las fechas de llegada y salida' : ''}
            {isBautizos ? ' y se revisan acompañantes y datos de carros del grupo' : ''}.
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Pastores</p>
          <p className="text-2xl font-black text-violet-700 dark:text-violet-300 tabular-nums">{rows.length}</p>
          <p className="text-[10px] font-bold text-slate-500 mt-1">
            Costo real capturado:{' '}
            <span className="text-violet-700 dark:text-violet-300 tabular-nums">{formatMoney(totalPastorCost)}</span>
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 italic px-1">
          No hay pastores registrados en las sedes visibles de este evento.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((person) => {
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
            return (
              <div
                key={id}
                className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{person.name || '(sin nombre)'}</p>
                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      {(person.location || '').trim() || 'Sin sede'}
                      {person.phone ? ` · ${person.phone}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleSave(person)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-violet-700 text-white hover:bg-violet-800 disabled:opacity-60"
                  >
                    <Save size={14} />
                    {saving ? 'Guardando…' : dirty ? 'Guardar cambios' : 'Guardar'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
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
                  {renderStayDateFields(draft, (patch) => patchDraft(person, patch), `pastor-${id}`)}
                </div>

                {isBautizos && carAnchor.eligible && carAnchor.anchorPerson ? (
                  <BautizosCarDataSummaryCard
                    hostPerson={carAnchor.anchorPerson}
                    companions={carAnchor.companionsForCrew}
                    plan={event?.transportPlanning}
                    roster={roster}
                    eventLike={event}
                  />
                ) : null}

                {isBautizos && companions.length > 0 ? (
                  <div className="rounded-xl border border-violet-100 dark:border-violet-500/40 bg-violet-50/30 dark:bg-violet-950/20 p-3 space-y-3">
                    <p className="text-[10px] font-black text-violet-800 dark:text-violet-200 uppercase tracking-wider inline-flex items-center gap-1.5">
                      <Users size={12} />
                      Acompañantes ({companions.length})
                    </p>
                    <div className="space-y-3">
                      {companions.map((companion) => {
                        const cid = String(companion.id || '').trim();
                        const cd = getCompanionDraft(person, companion);
                        const transport = companionTransportLabel(companion);
                        return (
                          <div
                            key={cid || companion.name}
                            className="rounded-lg border border-violet-100 dark:border-violet-500/30 bg-white dark:bg-slate-900 p-3 space-y-3"
                          >
                            <div>
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                {companion.name}
                              </p>
                              {transport ? (
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                  {transport}
                                </p>
                              ) : null}
                            </div>
                            {showStayDates ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {renderStayDateFields(
                                  cd,
                                  (patch) => patchCompanionDraft(person, companion, patch),
                                  `companion-${id}-${cid}`
                                )}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
