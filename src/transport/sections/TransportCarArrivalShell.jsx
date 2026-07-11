import React from 'react';
import { Car } from 'lucide-react';
import { btnSecondary } from '../transportPlanningUi.jsx';

/** Encabezado y acciones comunes de la sección «Llegan en carro». */
export default function TransportCarArrivalShell({
  isBautizos,
  canEdit,
  bautizosCarCapacity,
  onApplyBautizosFamilies,
  carVehicleRegistrationStats,
  children,
}) {
  const stats = carVehicleRegistrationStats || { registered: 0, incomplete: 0, total: 0 };
  const showStats = stats.total > 0;

  return (
    <div className="space-y-3">
      <div className="px-1">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Car size={14} />
          Llegan en carro
        </h3>
        {showStats ? (
          <p className="text-[10px] text-slate-600 dark:text-slate-300 mt-1 leading-snug">
            Carros con datos (marca, modelo, color o placas):{' '}
            <span className="font-black tabular-nums text-emerald-700 dark:text-emerald-400">{stats.registered}</span>
            {' · '}
            Incompletos:{' '}
            <span
              className={`font-black tabular-nums ${
                stats.incomplete > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {stats.incomplete}
            </span>
          </p>
        ) : null}
      </div>
      {canEdit && isBautizos ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnSecondary} onClick={() => onApplyBautizosFamilies?.()}>
            Sincronizar grupos en plan (carros del titular · {bautizosCarCapacity} plazas/carro)
          </button>
        </div>
      ) : null}
      {children}
    </div>
  );
}
