import React from 'react';
import { MapPin } from 'lucide-react';
import GlobalRegistryEventAttendanceControl from './GlobalRegistryEventAttendanceControl.jsx';

function BautizosGlobalRegistryLiteRow({
  mobile = false,
  rowKey = '',
  rowDisplayIndex = 0,
  name = '',
  locationLabel = '',
  subRegistrationLabel = '',
  debtText = '',
  confirmed = false,
  sourceKey = '',
  canMarkEventAttendance = false,
  onToggleBySourceKey,
}) {
  const attendanceNode =
    canMarkEventAttendance && sourceKey ? (
      <GlobalRegistryEventAttendanceControl
        sourceKey={sourceKey}
        initialConfirmed={confirmed}
        onToggleBySourceKey={onToggleBySourceKey}
        compact
      />
    ) : confirmed ? (
      <span className="text-[10px] font-black text-emerald-700">Asistio</span>
    ) : (
      <span className="text-[10px] font-bold text-slate-400">Pendiente</span>
    );

  if (mobile) {
    return (
      <div
        key={rowKey}
        className={`rounded-2xl border bg-white px-3 py-3 shadow-sm ${confirmed ? 'border-emerald-300' : 'border-slate-100'}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400">#{rowDisplayIndex}</span>
              <span className="truncate text-sm font-black text-slate-800">{name || 'Sin nombre'}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-1 font-bold text-indigo-700">
                <MapPin size={11} />
                {locationLabel}
              </span>
              {subRegistrationLabel ? (
                <span className="rounded-lg bg-amber-50 px-2 py-1 font-bold text-amber-700">
                  {subRegistrationLabel}
                </span>
              ) : null}
            </div>
            <div className="mt-2 text-[11px] font-bold text-slate-600">
              Saldo: {debtText}
            </div>
          </div>
          <div className="shrink-0 text-right">{attendanceNode}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`grid grid-cols-[minmax(0,2.3fr)_minmax(120px,1fr)_minmax(120px,0.9fr)_minmax(110px,0.8fr)] items-start gap-3 border-b border-slate-100 px-4 py-3 ${confirmed ? 'bg-emerald-50/40' : 'bg-white'}`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-400">#{rowDisplayIndex}</span>
          <span className="truncate text-sm font-black text-slate-800">{name || 'Sin nombre'}</span>
        </div>
        {subRegistrationLabel ? (
          <div className="mt-1 text-[11px] font-bold text-amber-700">
            {subRegistrationLabel}
          </div>
        ) : null}
      </div>
      <div className="min-w-0">
        <span className="inline-flex items-center gap-1 text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-1">
          <MapPin size={12} />
          {locationLabel}
        </span>
      </div>
      <div className="min-w-0">{attendanceNode}</div>
      <div className="min-w-0">
        <span className="text-sm font-bold text-slate-700">{debtText}</span>
      </div>
    </div>
  );
}

export default React.memo(BautizosGlobalRegistryLiteRow);
