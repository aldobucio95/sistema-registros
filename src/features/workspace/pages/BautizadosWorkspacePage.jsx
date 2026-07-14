import React from 'react';
import { useWorkspaceShell } from '../../../screens/eventWorkspace/WorkspaceShellContext.jsx';

export default function BautizadosWorkspacePage() {
  const shell = useWorkspaceShell();
  return shell.renderBautizadosPage();
}
