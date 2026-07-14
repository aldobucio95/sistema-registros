import React from 'react';
import { useWorkspaceShell } from '../../../screens/eventWorkspace/WorkspaceShellContext.jsx';

export default function ResponsivasWorkspacePage() {
  const shell = useWorkspaceShell();
  return shell.renderResponsivasPage();
}
