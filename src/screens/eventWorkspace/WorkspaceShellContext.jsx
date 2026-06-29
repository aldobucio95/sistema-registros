import React, { createContext, useContext } from 'react';

const WorkspaceShellContext = createContext(null);

/** Proveedor del shell del workspace (evento seleccionado). Sustituye el uso de `setAppShellBindings` para esta pantalla. */
export function WorkspaceShellProvider({ value, children }) {
  return <WorkspaceShellContext.Provider value={value}>{children}</WorkspaceShellContext.Provider>;
}

export function useWorkspaceShell() {
  const ctx = useContext(WorkspaceShellContext);
  if (ctx == null) {
    throw new Error('useWorkspaceShell: fuera de WorkspaceShellProvider');
  }
  return ctx;
}
