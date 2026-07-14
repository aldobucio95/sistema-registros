import React from 'react';
import { useWorkspaceShell } from '../../../screens/eventWorkspace/WorkspaceShellContext.jsx';

export default function BautizosCompanionsWorkspacePage() {
  const shell = useWorkspaceShell();
  return shell.renderBautizosCompanionsPage();
}
