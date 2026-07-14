import React, { lazy, Suspense } from 'react';

const ExpandedRosterDetailRowBridge = lazy(() => import('./ExpandedRosterDetailRowBridge.jsx'));

function ExpandedRowFallback({ colSpan = 3 }) {
  return (
    <tr className="bg-indigo-50/20 border-b border-slate-100">
      <td colSpan={colSpan} className="px-4 py-6 text-center">
        <p className="text-sm font-semibold text-slate-500">Cargando detalles…</p>
      </td>
    </tr>
  );
}

/**
 * Monta la fila expandida solo al abrir (lazy chunk + Suspense).
 */
export default function ExpandedRosterDetailRowLazy({ person, loc, displayIndex, colSpan = 3 }) {
  return (
    <Suspense fallback={<ExpandedRowFallback colSpan={colSpan} />}>
      <ExpandedRosterDetailRowBridge person={person} loc={loc} displayIndex={displayIndex} colSpan={colSpan} />
    </Suspense>
  );
}
