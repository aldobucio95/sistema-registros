import React from 'react';
import {
  ATTENDANCE_ROLE_KEYS,
  ATTENDANCE_ROLE_LABELS,
  ATTENDANCE_ROLE_MENU_ORDER,
} from '../../attendanceRoles.js';
import {
  blankCostRubro,
  normalizeAttendanceWeights,
  normalizeCostRubros,
  DEFAULT_ATTENDANCE_WEIGHTS,
} from '../../eventCostModel.js';
import { resolveEventAttendanceConfig } from '../../eventTypePresets.js';
import { uiButtons, uiForm } from '../../ui/uiFormatClasses.js';

/**
 * Configuración de tipos de asistencia, toggles, rubros y ponderaciones del evento.
 */
export default function EventAttendanceConfigFields({
  eventType,
  value = {},
  onChange,
  showCostSection = true,
}) {
  const cfg = resolveEventAttendanceConfig({ eventType, ...value });
  const enabled = cfg.enabledAttendanceTypes;
  const rubros = normalizeCostRubros(value.costRubros);
  const weights = normalizeAttendanceWeights(value.attendanceWeights);

  const patch = (partial) => onChange?.({ ...value, eventType, ...partial });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <span className={uiForm.labelXs}>Tipos de asistencia habilitados</span>
        <div className="flex flex-wrap gap-2">
          {ATTENDANCE_ROLE_MENU_ORDER.map((key) => (
            <label
              key={key}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200"
            >
              <input
                type="checkbox"
                checked={enabled[key] === true}
                onChange={(e) =>
                  patch({
                    enabledAttendanceTypes: { ...enabled, [key]: e.target.checked },
                  })
                }
              />
              {ATTENDANCE_ROLE_LABELS[key]}
            </label>
          ))}
        </div>
      </div>

      <label className="block space-y-1">
        <span className={uiForm.labelXs}>Tipo base del evento</span>
        <select
          className={uiForm.input}
          value={cfg.baseAttendanceType}
          onChange={(e) => patch({ baseAttendanceType: e.target.value })}
        >
          {ATTENDANCE_ROLE_KEYS.filter((k) => enabled[k]).map((k) => (
            <option key={k} value={k}>
              {ATTENDANCE_ROLE_LABELS[k]}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap gap-4">
        <label className="inline-flex items-center gap-2 text-xs font-bold">
          <input
            type="checkbox"
            checked={cfg.responsivaEnabled}
            onChange={(e) => patch({ responsivaEnabled: e.target.checked })}
          />
          Responsivas
        </label>
        <label className="inline-flex items-center gap-2 text-xs font-bold">
          <input
            type="checkbox"
            checked={cfg.publicRegistrationEnabled}
            onChange={(e) => patch({ publicRegistrationEnabled: e.target.checked })}
          />
          Registro público
        </label>
        <label className="inline-flex items-center gap-2 text-xs font-bold">
          <input
            type="checkbox"
            checked={cfg.transportEnabled}
            onChange={(e) => patch({ transportEnabled: e.target.checked })}
          />
          Transporte
        </label>
      </div>

      {showCostSection ? (
        <div className="space-y-3 border-t border-slate-200 dark:border-slate-700 pt-3">
          <div className="flex items-center justify-between gap-2">
            <span className={uiForm.labelXs}>Rubros de costo</span>
            <button
              type="button"
              className={uiButtons.secondary}
              onClick={() =>
                patch({
                  costRubros: [...rubros, blankCostRubro({ label: 'Nuevo concepto', amount: 0 })],
                })
              }
            >
              Agregar rubro
            </button>
          </div>
          {rubros.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Sin rubros. Se usará el costo legacy del evento si existe.</p>
          ) : null}
          <div className="space-y-2">
            {rubros.map((r, idx) => (
              <div key={r.id} className="grid grid-cols-[1fr_6rem_auto_auto] gap-2 items-center">
                <input
                  className={uiForm.input}
                  value={r.label}
                  onChange={(e) => {
                    const next = rubros.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x));
                    patch({ costRubros: next });
                  }}
                />
                <input
                  type="number"
                  min={0}
                  className={uiForm.input}
                  value={r.amount}
                  onChange={(e) => {
                    const next = rubros.map((x, i) =>
                      i === idx ? { ...x, amount: Number(e.target.value) || 0 } : x
                    );
                    patch({ costRubros: next });
                  }}
                />
                <label className="text-[10px] font-bold">
                  <input
                    type="checkbox"
                    checked={r.enabled !== false}
                    onChange={(e) => {
                      const next = rubros.map((x, i) =>
                        i === idx ? { ...x, enabled: e.target.checked } : x
                      );
                      patch({ costRubros: next });
                    }}
                  />{' '}
                  Activo
                </label>
                <button
                  type="button"
                  className={uiButtons.dangerSoft}
                  onClick={() => patch({ costRubros: rubros.filter((_, i) => i !== idx) })}
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <span className={uiForm.labelXs}>Ponderación por tipo (factor de cobro)</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ATTENDANCE_ROLE_MENU_ORDER.filter((k) => enabled[k]).map((k) => (
                <label key={k} className="block space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-500">{ATTENDANCE_ROLE_LABELS[k]}</span>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    className={uiForm.input}
                    value={weights[k] ?? DEFAULT_ATTENDANCE_WEIGHTS[k]}
                    onChange={(e) =>
                      patch({
                        attendanceWeights: {
                          ...weights,
                          [k]: Number(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </label>
              ))}
            </div>
            <p className="text-[10px] text-slate-500">
              Empleado / Cortesía / Pastor → cobro 0 (cubre el evento). Con varios roles se usa el factor máximo.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
