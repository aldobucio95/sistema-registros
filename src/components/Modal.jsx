import { useEffect, useId } from 'react';
import { XCircle } from 'lucide-react';

const SIZE_MAX = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
};

const Z_CLASS = {
  30: 'z-30',
  40: 'z-40',
  50: 'z-50',
  60: 'z-[60]',
};

/**
 * Shell unificado para overlays: backdrop + panel, Escape, aria-modal.
 * Convención de estado en la app: `{ isOpen, ...payload }` + `onClose` que resetea payload;
 * para solo abrir/cerrar usar `useDisclosure()` (ver src/hooks/useDisclosure.js).
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {import('react').ReactNode} [props.title] — Título o bloque personalizado (cabecera con botón cerrar)
 * @param {import('react').ReactNode} [props.children]
 * @param {import('react').ReactNode} [props.footer]
 * @param {keyof typeof SIZE_MAX | string} [props.size='md']
 * @param {30|40|50|60} [props.zIndex=50]
 * @param {boolean} [props.closeOnBackdrop=true]
 * @param {boolean} [props.showCloseButton=true]
 * @param {string} [props.className] — clases extra del panel exterior
 * @param {string} [props.bodyClassName] — clases del cuerpo (área bajo el título)
 * @param {string} [props.overlayClassName] — clases del backdrop (p. ej. overflow-y-auto)
 * @param {boolean} [props.scrollBody=false] — cuerpo con scroll interno (modales altos)
 * @param {'default'|'bare'} [props.variant='default'] — bare: solo panel + children (sin cabecera estándar)
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  zIndex = 50,
  closeOnBackdrop = true,
  showCloseButton = true,
  className = '',
  bodyClassName = '',
  overlayClassName = '',
  scrollBody = false,
  variant = 'default',
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const maxW = SIZE_MAX[size] || SIZE_MAX.md;
  const z = Z_CLASS[zIndex] || 'z-50';

  if (variant === 'bare') {
    return (
      <div
        className={`fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center ${z} p-4 overflow-y-auto ${overlayClassName}`}
        role="presentation"
        onClick={closeOnBackdrop ? onClose : undefined}
      >
        <div
          role="dialog"
          aria-modal="true"
          className={`bg-white rounded-3xl shadow-2xl w-full ${maxW} animate-in zoom-in-95 duration-200 max-h-[min(90vh,100%)] overflow-y-auto ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center ${z} p-4 overflow-y-auto ${overlayClassName}`}
      role="presentation"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={`bg-white rounded-3xl shadow-2xl w-full ${maxW} animate-in zoom-in-95 duration-200 flex flex-col max-h-[min(90vh,100%)] overflow-hidden ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title != null || showCloseButton) && (
          <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex justify-between items-start gap-3 shrink-0">
            {title != null && (
              <div id={titleId} className="min-w-0 flex-1">
                {typeof title === 'string' ? (
                  <h3 className="text-xl font-black text-slate-800">{title}</h3>
                ) : (
                  title
                )}
              </div>
            )}
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:bg-slate-100 p-2 rounded-full shrink-0 ml-auto"
                aria-label="Cerrar"
              >
                <XCircle size={20} />
              </button>
            )}
          </div>
        )}
        <div
          className={`px-6 py-6 flex-1 min-h-0 ${scrollBody ? 'overflow-y-auto overscroll-contain' : ''} ${bodyClassName}`}
        >
          {children}
        </div>
        {footer != null && (
          <div className="px-6 pb-6 pt-0 border-t border-slate-100 shrink-0">{footer}</div>
        )}
      </div>
    </div>
  );
}
