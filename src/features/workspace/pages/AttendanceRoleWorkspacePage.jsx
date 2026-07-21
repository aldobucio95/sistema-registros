import React, { useMemo } from 'react';
import { useWorkspaceShell } from '../../../screens/eventWorkspace/WorkspaceShellContext.jsx';
import AttendanceRoleRosterPage from '../../attendance/AttendanceRoleRosterPage.jsx';
import { ATTENDANCE_ROLE_TAB } from '../../../attendanceRoles.js';

const TAB_TO_ROLE = Object.fromEntries(
  Object.entries(ATTENDANCE_ROLE_TAB).map(([role, tab]) => [tab, role])
);
// Alias legado
TAB_TO_ROLE.Bautizados = 'bautizado';
TAB_TO_ROLE.ServersPage = 'servidor';
TAB_TO_ROLE.Becados = 'becado';
TAB_TO_ROLE.PastoresPage = 'pastor';

/**
 * Página de workspace: padrón filtrado por tipo de asistencia.
 */
export default function AttendanceRoleWorkspacePage({ roleKey: roleKeyProp }) {
  const shell = useWorkspaceShell();
  const roleKey =
    roleKeyProp ||
    TAB_TO_ROLE[shell.deferredActiveTab] ||
    TAB_TO_ROLE[shell.activeTab] ||
    'campero';

  const participants = useMemo(() => {
    const list = Array.isArray(shell.allParticipants) ? shell.allParticipants : [];
    const eventId = shell.currentEvent?.id;
    return list.filter((p) => {
      if (eventId && String(p?.eventId || '') !== String(eventId)) return false;
      const s = p?.status || 'active';
      return s !== 'archived' && s !== 'cancelled' && s !== 'waitlist';
    });
  }, [shell.allParticipants, shell.currentEvent?.id]);

  return (
    <AttendanceRoleRosterPage
      roleKey={roleKey}
      participants={participants}
      onOpenPerson={(p) => {
        if (typeof shell.openEditModal === 'function') shell.openEditModal(p);
        else if (typeof shell.setEditingId === 'function') shell.setEditingId(p.id);
      }}
    />
  );
}
