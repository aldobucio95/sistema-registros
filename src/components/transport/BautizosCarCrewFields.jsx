import React from 'react';
import { uiFilter, uiFormField } from '../../ui/uiFormatClasses.js';
import { isCarCrewFieldSatisfied } from '../../bautizosCarMeta.js';

const labelCls = 'text-[10px] font-bold text-slate-600 dark:text-slate-300';
const selectSm =
  'w-full min-w-0 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100';

/**
 * Conductor y pasajeros de un vehículo (familia Bautizos).
 */
export default function BautizosCarCrewFields({
  meta,
  memberOptions = [],
  driverMemberOptions,
  passengerMemberOptions,
  canEdit,
  onDriverChange,
  onPassengersChange,
  onPendingDriverChange,
  onPendingPassengersChange,
  requirePassengers = true,
  compact = false,
}) {
  const driverOptions = driverMemberOptions ?? memberOptions;
  const driverSk = String(meta?.driverSourceKey || '');
  const passengers = Array.isArray(meta?.passengerSourceKeys) ? meta.passengerSourceKeys : [];
  const pendingDriver = meta?.pendingDriver === true;
  const pendingPassengers = meta?.pendingPassengers === true;
  const passengerPool = passengerMemberOptions ?? memberOptions.filter((m) => String(m.sourceKey) !== driverSk);
  const passengerOptions = passengerPool.filter((m) => String(m.sourceKey) !== driverSk);
  const crewOpts = { requiresPassengers: requirePassengers };

  if (!canEdit) {
    const driverLabel = memberOptions.find((m) => m.sourceKey === driverSk)?.label || '—';
    const passengerLabels = passengers
      .map((sk) => memberOptions.find((m) => m.sourceKey === sk)?.label)
      .filter(Boolean);
    return (
      <div className={`space-y-1.5 ${compact ? 'text-[10px]' : 'text-xs'}`}>
        <p className="text-slate-700 dark:text-slate-200">
          <span className="font-black uppercase text-[9px] text-slate-500">Conductor</span>{' '}
          {pendingDriver ? <span className="text-amber-700 dark:text-amber-300 font-bold">Pendiente</span> : driverLabel}
        </p>
        {requirePassengers ? (
          <p className="text-slate-700 dark:text-slate-200">
            <span className="font-black uppercase text-[9px] text-slate-500">Pasajeros</span>{' '}
            {pendingPassengers ? (
              <span className="text-amber-700 dark:text-amber-300 font-bold">Pendiente</span>
            ) : passengerLabels.length ? (
              passengerLabels.join(', ')
            ) : (
              '—'
            )}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`grid gap-3 ${compact ? 'grid-cols-1' : requirePassengers ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
      <div className={uiFormField.stack}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={labelCls}>Conductor</span>
          <label className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-amber-400 accent-amber-600"
              checked={pendingDriver}
              disabled={!canEdit}
              onChange={(e) => onPendingDriverChange?.(e.target.checked)}
            />
            Pendiente
          </label>
        </div>
        <select
          className={selectSm}
          value={pendingDriver ? '' : driverOptions.some((m) => m.sourceKey === driverSk) ? driverSk : ''}
          disabled={pendingDriver}
          onChange={(e) => onDriverChange?.(e.target.value)}
        >
          <option value="">Seleccionar conductor…</option>
          {driverOptions.map((m) => (
            <option key={m.sourceKey} value={m.sourceKey}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {requirePassengers ? (
      <div className={uiFormField.stack}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={labelCls}>Pasajeros</span>
          <label className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-amber-400 accent-amber-600"
              checked={pendingPassengers}
              disabled={!canEdit}
              onChange={(e) => onPendingPassengersChange?.(e.target.checked)}
            />
            Pendiente
          </label>
        </div>
        <div
          className={`rounded-lg border border-slate-200 dark:border-slate-600 bg-white/80 dark:bg-slate-900/50 p-2 space-y-1 ${
            pendingPassengers ? 'opacity-60 pointer-events-none' : ''
          }`}
        >
          {passengerOptions.length === 0 ? (
            <p className="text-[10px] text-slate-400 italic">Sin miembros disponibles</p>
          ) : (
            passengerOptions.map((m) => {
              const checked = passengers.includes(m.sourceKey);
              return (
                <label key={m.sourceKey} className={uiFilter.optionRow}>
                  <input
                    type="checkbox"
                    className={uiFilter.circleControl}
                    checked={checked}
                    disabled={!canEdit || pendingPassengers}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...passengers, m.sourceKey]
                        : passengers.filter((sk) => sk !== m.sourceKey);
                      onPassengersChange?.(next);
                    }}
                  />
                  {m.label}
                </label>
              );
            })
          )}
        </div>
        {!pendingPassengers && !isCarCrewFieldSatisfied(meta, 'passengers', crewOpts) ? (
          <p className="text-[9px] text-amber-700 dark:text-amber-300 font-semibold">
            Seleccione al menos un pasajero o marque como pendiente.
          </p>
        ) : null}
      </div>
      ) : null}
    </div>
  );
}
