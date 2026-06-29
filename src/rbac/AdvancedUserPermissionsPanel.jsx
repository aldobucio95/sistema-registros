import React from 'react';

const SECTION_PANEL =
  'rounded-xl border border-slate-800/80 bg-slate-900/35 dark:bg-slate-900/50 p-2.5 space-y-1';
const SECTION_TITLE =
  'text-[9px] sm:text-[10px] font-black uppercase tracking-widest pl-1.5 border-l-2';
const ROW =
  'flex flex-wrap items-center gap-x-2 gap-y-0.5 px-2.5 py-1.5 rounded-md cursor-pointer hover:bg-slate-800/50 transition-colors';
const ROW_LABEL = 'text-[11px] font-bold text-slate-200 shrink-0';
const ROW_HINT = 'text-[10px] text-slate-400 leading-snug flex-1 min-w-0';

function PermissionRow({ checked, disabled, onChange, label, hint, checkboxClass = 'accent-indigo-600' }) {
  return (
    <label className={ROW}>
      <input
        type="checkbox"
        className={`${checkboxClass} w-3.5 h-3.5 rounded shrink-0`}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={ROW_LABEL}>{label}</span>
      <span className={ROW_HINT}>{hint}</span>
    </label>
  );
}

/**
 * Permisos avanzados (SuperUsuario): una tarjeta por sección, filas compactas (título + descripción en línea).
 * @param {'full' | 'roster-only'} delegateMode — `roster-only`: solo la sección de baja (Administrador).
 */
export default function AdvancedUserPermissionsPanel({
  value,
  onChange,
  fieldsDisabled = false,
  delegateMode = 'full',
}) {
  const role = value?.role || 'Editor';
  const patch = (key, val) => onChange({ [key]: val });
  const showFull = delegateMode === 'full';
  const showRosterSection = role === 'Editor';

  const whatsAppChecked =
    role === 'Administrador' ? value.canSendWhatsAppQuickAction !== false : !!value.canSendWhatsAppQuickAction;
  const responsivaDigitalChecked =
    role === 'Administrador'
      ? value.canSendResponsivaDigitalQuickAction !== false
      : !!value.canSendResponsivaDigitalQuickAction;

  const rosterSection = showRosterSection ? (
    <div className={SECTION_PANEL}>
      <p className={`${SECTION_TITLE} text-amber-400 border-amber-500`}>Registros y participantes</p>
      <div className="divide-y divide-slate-800/50 mt-1">
        <PermissionRow
          checkboxClass="accent-amber-600"
          label="Dar de baja registros"
          hint="Cancelar inscripciones en el roster (no archiva ni borra del archivo global)."
          checked={!!value.canCancelRegistrations}
          disabled={fieldsDisabled}
          onChange={(v) => patch('canCancelRegistrations', v)}
        />
      </div>
    </div>
  ) : null;

  if (!showFull) {
    return rosterSection ? <div className="space-y-2">{rosterSection}</div> : null;
  }

  return (
    <div className="space-y-2">
      {rosterSection}
      <div className={SECTION_PANEL}>
        <p className={`${SECTION_TITLE} text-indigo-400 border-indigo-500`}>Control financiero y egresos</p>
        <div className="divide-y divide-slate-800/50 mt-1">
          {role !== 'Administrador' ? (
            <PermissionRow
              checkboxClass="accent-indigo-600"
              label="Ver finanzas"
              hint="Reportes y resúmenes de dinero."
              checked={!!value.canViewFinances}
              disabled={fieldsDisabled}
              onChange={(v) => patch('canViewFinances', v)}
            />
          ) : null}
          <PermissionRow
            checkboxClass="accent-amber-600"
            label="Donaciones ocultas"
            hint="Donaciones y becas especiales."
            checked={!!value.canViewHiddenDonations}
            disabled={fieldsDisabled}
            onChange={(v) => patch('canViewHiddenDonations', v)}
          />
          <PermissionRow
            checkboxClass="accent-emerald-600"
            label="Lista de gastos del evento"
            hint="Gestionar y auditar egresos del evento."
            checked={!!value.canViewExpenses}
            disabled={fieldsDisabled}
            onChange={(v) => patch('canViewExpenses', v)}
          />
          <PermissionRow
            checkboxClass="accent-slate-500"
            label="Privacidad de gastos"
            hint="Ocultar conceptos de egreso propios para otros gestores."
            checked={value.hideMyExpenseConcepts !== false}
            disabled={fieldsDisabled}
            onChange={(v) => patch('hideMyExpenseConcepts', v)}
          />
        </div>
      </div>

      <div className={SECTION_PANEL}>
        <p className={`${SECTION_TITLE} text-sky-400 border-sky-500`}>Comunicación y deslindes</p>
        <div className="divide-y divide-slate-800/50 mt-1">
          <PermissionRow
            checkboxClass="accent-sky-600"
            label="Enviar WhatsApp"
            hint="Avisos y acciones rápidas en registros."
            checked={whatsAppChecked}
            disabled={fieldsDisabled}
            onChange={(v) => patch('canSendWhatsAppQuickAction', v)}
          />
          <PermissionRow
            checkboxClass="accent-teal-600"
            label="Responsiva en sitio"
            hint="Marcar responsiva física en el evento."
            checked={value.canMarkResponsivaLocalQuickAction !== false}
            disabled={fieldsDisabled}
            onChange={(v) => patch('canMarkResponsivaLocalQuickAction', v)}
          />
          <PermissionRow
            checkboxClass="accent-cyan-600"
            label="Responsiva digital"
            hint="Enviar enlace o deslinde digital."
            checked={responsivaDigitalChecked}
            disabled={fieldsDisabled}
            onChange={(v) => patch('canSendResponsivaDigitalQuickAction', v)}
          />
        </div>
      </div>

      <div className={SECTION_PANEL}>
        <p className={`${SECTION_TITLE} text-violet-400 border-violet-500`}>Auditoría y fechas</p>
        <div className="divide-y divide-slate-800/50 mt-1">
          <PermissionRow
            checkboxClass="accent-violet-600"
            label="Editar fechas del historial"
            hint="Fechas de registro y abonos anteriores."
            checked={!!value.canEditRegistryDates}
            disabled={fieldsDisabled}
            onChange={(v) => patch('canEditRegistryDates', v)}
          />
          {role === 'Administrador' ? (
            <PermissionRow
              checkboxClass="accent-rose-600"
              label="Marcar personas de interés"
              hint="Bloquea precarga y registro de esas personas (ID VNPM)."
              checked={!!value.canMarkPersonsOfInterest}
              disabled={fieldsDisabled}
              onChange={(v) => patch('canMarkPersonsOfInterest', v)}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
