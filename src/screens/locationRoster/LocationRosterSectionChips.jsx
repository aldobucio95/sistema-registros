import React from 'react';

/**
 * Chips de conteo canónico en las secciones del roster por sede (Bautizos).
 * Extraído de App.jsx para reducir superficie y evitar regresiones titular-only.
 */
export function LocationRosterActivosChip({ isBautizos, activeCount }) {
  return (
    <span
      className="chip-roster-count-activos text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg shrink-0"
      title={
        isBautizos
          ? 'Total activos (titulares + acompañantes deduplicados), mismo criterio que el resumen y el dashboard.'
          : `Activos en esta sede (${activeCount}).`
      }
    >
      {activeCount}
    </span>
  );
}

export function LocationRosterWaitlistChip({ waitlistCount, rosterSearchActive, filteredCount }) {
  return (
    <>
      <span className="chip-roster-count-waitlist text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-lg shrink-0">
        {waitlistCount} en espera
      </span>
      {rosterSearchActive && filteredCount > 0 ? (
        <span className="chip-roster-count-filter-hit text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg">
          {filteredCount} coincidencia{filteredCount === 1 ? '' : 's'}
        </span>
      ) : null}
    </>
  );
}

export function LocationRosterCancelledChip({ cancelledCount, rosterSearchActive, filteredCount }) {
  return (
    <>
      <span className="chip-roster-count-cancelled text-[10px] font-black text-rose-800 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-lg shrink-0">
        {cancelledCount} en esta sede
      </span>
      {rosterSearchActive && filteredCount > 0 ? (
        <span className="chip-roster-count-filter-hit text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg">
          {filteredCount} coincidencia{filteredCount === 1 ? '' : 's'}
        </span>
      ) : null}
    </>
  );
}
