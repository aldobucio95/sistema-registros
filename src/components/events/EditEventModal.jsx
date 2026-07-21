import React from 'react';
import { uiModal } from '../../ui/uiFormatClasses.js';
import EventAttendanceConfigFields from './EventAttendanceConfigFields.jsx';
import { CLOSED_EDIT_EVENT_MODAL } from '../../editEventModalState.js';

/**
 * Modal de edición de evento: nombre + configuración de asistencias / costos.
 */
export default function EditEventModal({
  renameModal,
  setRenameModal,
  onSubmit,
  btnPrimary,
  btnSecondary,
  inputClasses,
}) {
  if (!renameModal?.isOpen) return null;

  const close = () => setRenameModal({ ...CLOSED_EDIT_EVENT_MODAL });

  const attendanceValue = {
    enabledAttendanceTypes: renameModal.enabledAttendanceTypes,
    baseAttendanceType: renameModal.baseAttendanceType,
    responsivaEnabled: renameModal.responsivaEnabled,
    publicRegistrationEnabled: renameModal.publicRegistrationEnabled,
    transportEnabled: renameModal.transportEnabled,
    costRubros: renameModal.costRubros,
    attendanceWeights: renameModal.attendanceWeights,
  };

  return (
    <div className={`${uiModal.overlay} z-50`}>
      <button
        type="button"
        className={uiModal.backdrop}
        onClick={close}
        aria-label="Cerrar modal editar evento"
      />
      <form
        className={`${uiModal.panel} max-w-lg p-6 animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto`}
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmit?.();
        }}
      >
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">Editar evento</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Nombre y configuración de tipos de asistencia del evento.
        </p>
        <div className="space-y-4">
          <label className="block space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Nombre del evento
            </span>
            <input
              type="text"
              autoFocus
              className={inputClasses}
              placeholder="Nombre del evento"
              value={renameModal.name || ''}
              onChange={(e) => setRenameModal({ ...renameModal, name: e.target.value })}
            />
          </label>

          <EventAttendanceConfigFields
            eventType={renameModal.eventType}
            value={attendanceValue}
            onChange={(next) =>
              setRenameModal({
                ...renameModal,
                enabledAttendanceTypes: next.enabledAttendanceTypes,
                baseAttendanceType: next.baseAttendanceType,
                responsivaEnabled: next.responsivaEnabled,
                publicRegistrationEnabled: next.publicRegistrationEnabled,
                transportEnabled: next.transportEnabled,
                costRubros: next.costRubros,
                attendanceWeights: next.attendanceWeights,
              })
            }
          />

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={close} className={btnSecondary}>
              Cancelar
            </button>
            <button type="submit" disabled={!String(renameModal.name || '').trim()} className={btnPrimary}>
              Guardar
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
