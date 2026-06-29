/**
 * Enlace ligero entre App (estado) y pantallas lazy que aún no usan React Context:
 * login y hub de eventos (`setAppShellBindings` antes de renderizar).
 * La vista con evento seleccionado usa `WorkspaceShellProvider` en lugar de este singleton.
 */
let _bindings = null;

export function setAppShellBindings(next) {
  _bindings = next;
}

export function useAppShellBindings() {
  if (_bindings == null) {
    throw new Error('useAppShellBindings: bindings no inicializados');
  }
  return _bindings;
}
