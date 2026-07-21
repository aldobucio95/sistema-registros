import React from 'react';
import {
  ATTENDANCE_ROLE_LABELS,
  ATTENDANCE_ROLE_MENU_ORDER,
  toggleAttendanceRole,
} from '../../attendanceRoles.js';
import { resolveEventAttendanceConfig } from '../../eventTypePresets.js';
import { uiForm } from '../../ui/uiFormatClasses.js';

/**
 * Selector multi-rol de asistencia según tipos habilitados en el evento.
 */
export default function AttendanceRolesPicker({
  eventDoc,
  roles,
  onChange,
  disabled = false,
  className = '',
}) {
  const cfg = resolveEventAttendanceConfig(eventDoc);
  const enabledKeys = ATTENDANCE_ROLE_MENU_ORDER.filter((k) => cfg.enabledAttendanceTypes[k]);

  if (enabledKeys.length === 0) {
    return (
      <p className="text-xs text-slate-500 italic">
        Este evento no tiene tipos de asistencia habilitados.
      </p>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <span className={uiForm.labelXs}>Tipos de asistencia</span>
      <div className="flex flex-wrap gap-2">
        {enabledKeys.map((key) => {
          const checked = roles?.[key] === true;
          return (
            <label
              key={key}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                checked
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600'
              } ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
            >
              <input
                type="checkbox"
                className="sr-only"
                disabled={disabled}
                checked={checked}
                onChange={(e) => {
                  const result = toggleAttendanceRole(roles, key, e.target.checked);
                  if (result.error) {
                    onChange?.(result.roles, result.error);
                    return;
                  }
                  onChange?.(result.roles, null);
                }}
              />
              {ATTENDANCE_ROLE_LABELS[key] || key}
            </label>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-500 font-semibold">
        Puedes combinar varios tipos (con las restricciones del evento). Empleado, Cortesía y Pastor son cobertura del evento.
      </p>
    </div>
  );
}
