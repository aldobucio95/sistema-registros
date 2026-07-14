import React from 'react';
import { useWorkspaceShell } from '../../../screens/eventWorkspace/WorkspaceShellContext.jsx';

export default function TransportPlanningWorkspacePage() {
  const shell = useWorkspaceShell();
  return shell.renderTransportPlanningPage();
}
