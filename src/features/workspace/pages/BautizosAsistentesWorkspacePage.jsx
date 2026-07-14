import React from 'react';
import { useWorkspaceShell } from '../../../screens/eventWorkspace/WorkspaceShellContext.jsx';

export default function BautizosAsistentesWorkspacePage() {
  const shell = useWorkspaceShell();
  return shell.renderBautizosAsistentesPage?.() ?? null;
}
