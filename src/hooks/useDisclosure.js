import { useCallback, useState } from 'react';

/**
 * Modales sin payload: solo abrir/cerrar.
 * Preferir `{ open, onOpen, onClose, onToggle }` en lugar de booleanos sueltos (`isFooOpen`).
 *
 * @param {boolean} [initialOpen=false]
 */
export function useDisclosure(initialOpen = false) {
  const [open, setOpen] = useState(initialOpen);
  const onOpen = useCallback(() => setOpen(true), []);
  const onClose = useCallback(() => setOpen(false), []);
  const onToggle = useCallback(() => setOpen((v) => !v), []);
  return { open, setOpen, onOpen, onClose, onToggle };
}
