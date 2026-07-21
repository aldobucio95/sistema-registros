import React, { useMemo } from 'react';
import {
  ATTENDANCE_ROLE_LABELS,
  filterParticipantsByAttendanceRole,
  isMultiRolePerson,
  listActiveRoleKeys,
  attendanceRolesFromLegacyPerson,
} from '../../attendanceRoles.js';
import { uiEmptyState, uiListRow, uiShell, uiBadgeSoft } from '../../ui/uiFormatClasses.js';
import VirtualizedScrollList from '../../components/roster/VirtualizedScrollList.jsx';

/**
 * Vista de padrón filtrada por un tipo de asistencia (menú lateral).
 */
export default function AttendanceRoleRosterPage({
  roleKey,
  participants = [],
  onOpenPerson,
  emptyHint,
}) {
  const label = ATTENDANCE_ROLE_LABELS[roleKey] || roleKey;
  const rows = useMemo(
    () => filterParticipantsByAttendanceRole(participants, roleKey),
    [participants, roleKey]
  );

  return (
    <div className="space-y-4 p-4 max-w-5xl mx-auto">
      <div>
        <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">{label}</h2>
        <p className="text-[11px] text-slate-500 font-semibold">
          {rows.length} registro{rows.length === 1 ? '' : 's'} con este tipo de asistencia
          {emptyHint ? ` · ${emptyHint}` : ''}
        </p>
      </div>

      <section className={`${uiShell.card} overflow-hidden`}>
        <div className="p-3">
          <VirtualizedScrollList
            className="max-h-[min(70vh,40rem)] overflow-y-auto"
            items={rows}
            getItemKey={(p) => p.id}
            emptyContent={
              <div className={uiEmptyState.wrap}>
                <p className={uiEmptyState.title}>Sin registros</p>
                <p className={uiEmptyState.help}>
                  Nadie tiene el tipo «{label}» en este evento todavía.
                </p>
              </div>
            }
            renderItem={(p) => {
              const roles = listActiveRoleKeys(attendanceRolesFromLegacyPerson(p));
              const multi = isMultiRolePerson(p);
              return (
                <button
                  type="button"
                  className={`${uiListRow.wrap} w-full text-left mb-1.5`}
                  onClick={() => onOpenPerson?.(p)}
                >
                  <span className={uiListRow.main}>
                    <span className={uiListRow.primary}>{p.name || 'Sin nombre'}</span>
                    <span className={uiListRow.secondary}>
                      {p.location || '—'}
                      {roles.length > 1 ? ` · ${roles.map((k) => ATTENDANCE_ROLE_LABELS[k]).join(', ')}` : ''}
                    </span>
                  </span>
                  <span className={uiListRow.meta}>
                    {multi ? <span className={uiBadgeSoft('amber')}>Multi-rol</span> : null}
                  </span>
                </button>
              );
            }}
          />
        </div>
      </section>
    </div>
  );
}
