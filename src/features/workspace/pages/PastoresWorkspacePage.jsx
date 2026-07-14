import React from 'react';
import { useWorkspaceShell } from '../../../screens/eventWorkspace/WorkspaceShellContext.jsx';

export default function PastoresWorkspacePage() {
  const shell = useWorkspaceShell();
  return shell.renderPastoresPage();
}
