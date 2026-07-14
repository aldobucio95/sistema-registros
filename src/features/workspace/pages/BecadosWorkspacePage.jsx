import React from 'react';
import { useWorkspaceShell } from '../../../screens/eventWorkspace/WorkspaceShellContext.jsx';

export default function BecadosWorkspacePage() {
  const shell = useWorkspaceShell();
  return shell.renderBecadosPage();
}
