import React from 'react';
import { useWorkspaceShell } from '../../screens/eventWorkspace/WorkspaceShellContext.jsx';

/**
 * Puente lazy: delega el render expandido al shell hasta completar extracción total.
 */
export default function ExpandedRosterDetailRowBridge({ person, loc, displayIndex, colSpan = 3 }) {
  const { renderExpandedRosterDetailTableRow } = useWorkspaceShell();
  if (typeof renderExpandedRosterDetailTableRow !== 'function') {
    return (
      <tr className="bg-rose-50/30 border-b border-slate-100">
        <td colSpan={colSpan} className="px-4 py-4 text-center text-rose-600 text-sm">
          No se pudo cargar el detalle del registro.
        </td>
      </tr>
    );
  }
  return renderExpandedRosterDetailTableRow(person, loc, { displayIndex });
}
