import React, { useMemo, useState } from 'react';
import { Church, Save } from 'lucide-react';
import {
  eventHasMultipleCalendarDays,
  getPastorRealCostAmount,
  isPastorParticipant,
  normalizePastorStayDate,
} from '../pastorAttendance.js';
import { compareIsoDates, getEventEffectiveEndDate, getEventEffectiveStartDate } from '../eventDateHelpers.js';

const inputSm =
  'w-full min-w-0 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100';

function buildDraftFromPerson(person, prevDraft) {
  if (prevDraft) return { ...prevDraft };
  return {
    pastorRealCost: getPastorRealCostAmount(person) ? String(getPastorRealCostAmount(person)) : '',
    pastorStayStart: normalizePastorStayDate(person?.pastorStayStart),
    pastorStayEnd: normalizePastorStayDate(person?.pastorStayEnd),
  };
}

/**
 * Administración de pastores del evento: costo real individual y fechas de estancia.
 * Solo visible para administradores.
 */
export default function PastoresPage({
  event,
  participants,
  visibleLocations,
  formatMoney,
  onSavePastorFields,
  savingPastorId = '',
}) {
  const eventType = event?.eventType;
  const multiDay = eventHasMultipleCalendarDays(event);
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

  const getDraft = (person) => {
    const id = String(person?.id || '').trim();
    return buildDraftFromPerson(person, draftById[id]);
  };

  const patchDraft = (person, patch) => {
    const id = String(person?.id || '').trim();
    if (!id) return;
    setDraftById((prev) => ({
      ...prev,
      [id]: { ...buildDraftFromPerson(person, prev[id]), ...patch },
    }));
  };

  const validateDraft = (draft) => {
    const start = normalizePastorStayDate(draft.pastorStayStart);
    const end = normalizePastorStayDate(draft.pastorStayEnd);
    if (start && end && compareIsoDates(start, end) > 0) {
      return 'La fecha de llegada no puede ser posterior a la de salida.';
    }
    if (start && eventStart && compareIsoDates(start, eventStart) < 0) {
      return 'La fecha de llegada no puede ser anterior al inicio del evento.';
    }
    if (end && eventEnd && compareIsoDates(end, eventEnd) > 0) {
      return 'La fecha de salida no puede ser posterior al fin del evento.';
    }
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
    const costRaw = String(draft.pastorRealCost ?? '').trim().replace(',', '.');
    const pastorRealCost = costRaw === '' ? 0 : parseFloat(costRaw);
    await onSavePastorFields(id, {
      pastorRealCost,
      pastorStayStart: normalizePastorStayDate(draft.pastorStayStart),
      pastorStayEnd: normalizePastorStayDate(draft.pastorStayEnd),
    });
    setDraftById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const totalPastorCost = rows.reduce((s, p) => s + getPastorRealCostAmount(p), 0);

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
            {multiDay ? ' y las fechas de llegada y salida del evento' : ''}.
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
            const dirty =
              draftById[id] != null ||
              String(draft.pastorRealCost) !== String(getPastorRealCostAmount(person) || '') ||
              draft.pastorStayStart !== normalizePastorStayDate(person.pastorStayStart) ||
              draft.pastorStayEnd !== normalizePastorStayDate(person.pastorStayEnd);
            const saving = savingPastorId === id;
            return (
              <div
                key={id}
                className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
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
                    {saving ? 'Guardando…' : dirty ? 'Guardar' : 'Guardar'}
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
                  {multiDay ? (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                          Llega al evento
                        </label>
                        <input
                          type="date"
                          className={inputSm}
                          min={eventStart || undefined}
                          max={eventEnd || undefined}
                          value={draft.pastorStayStart}
                          onChange={(e) => patchDraft(person, { pastorStayStart: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                          Se va del evento
                        </label>
                        <input
                          type="date"
                          className={inputSm}
                          min={eventStart || undefined}
                          max={eventEnd || undefined}
                          value={draft.pastorStayEnd}
                          onChange={(e) => patchDraft(person, { pastorStayEnd: e.target.value })}
                        />
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
