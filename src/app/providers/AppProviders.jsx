import React from 'react';
import { EventDataProvider } from './EventDataContext.jsx';
import { ParticipantMutationsProvider } from './ParticipantMutationsContext.jsx';
import { WorkspaceUIProvider } from './WorkspaceUIContext.jsx';

/**
 * Compone los proveedores del workspace (evento seleccionado).
 * Los valores se pasan desde App.jsx; inicialmente espejan `mergeWorkspaceShellParts`.
 */
export function AppProviders({ eventData, participantMutations, workspaceUI, children }) {
  return (
    <EventDataProvider value={eventData}>
      <ParticipantMutationsProvider value={participantMutations}>
        <WorkspaceUIProvider value={workspaceUI}>{children}</WorkspaceUIProvider>
      </ParticipantMutationsProvider>
    </EventDataProvider>
  );
}
