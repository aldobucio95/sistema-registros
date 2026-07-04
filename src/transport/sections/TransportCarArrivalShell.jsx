import React from 'react';
import { Car } from 'lucide-react';
import { btnSecondary } from '../transportPlanningUi.jsx';

/** Encabezado y acciones comunes de la sección «Llegan en carro». */
export default function TransportCarArrivalShell({
  isBautizos,
  canEdit,
  bautizosCarCapacity,
  onApplyBautizosFamilies,
  children,
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 px-1 flex items-center gap-2">
        <Car size={14} />
        Llegan en carro
      </h3>
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
