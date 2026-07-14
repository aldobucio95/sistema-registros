import React from 'react';
import { useWorkspaceShell } from '../../../screens/eventWorkspace/WorkspaceShellContext.jsx';

export default function BautizosCortesiasWorkspacePage() {
  const shell = useWorkspaceShell();
  return shell.renderBautizosCortesiasPage?.() ?? null;
}
