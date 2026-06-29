import React from 'react';
import { uiMobileMenu } from '../../ui/uiFormatClasses.js';

/**
 * Sección dentro del panel colapsable móvil (título + contenido).
 * layout: stack (filtros en columna) | grid2 (2 columnas) | inline (chips/botones en fila).
 */
export default function MobileMenuSection({
  label,
  children,
  tone = 'slate',
  grid2 = false,
  layout,
  className = '',
}) {
  const resolvedLayout = layout ?? (grid2 ? 'grid2' : 'stack');
  const toneCls =
    tone === 'indigo'
      ? 'max-md:text-indigo-700 max-md:dark:text-indigo-200'
      : tone === 'violet'
        ? 'max-md:text-violet-800 max-md:dark:text-violet-200'
        : tone === 'sky'
          ? 'max-md:text-sky-800 max-md:dark:text-sky-200'
          : tone === 'amber'
            ? 'max-md:text-amber-900 max-md:dark:text-amber-200'
            : '';
  const layoutCls =
    resolvedLayout === 'grid2'
      ? uiMobileMenu.sectionGrid2
      : resolvedLayout === 'inline'
        ? uiMobileMenu.sectionInline
        : '';
  const labelSpan2 = resolvedLayout === 'grid2' && label;
  return (
    <div className={`${uiMobileMenu.section} ${layoutCls} ${className}`}>
      {label ? (
        <span
          className={`${uiMobileMenu.sectionLabel} ${toneCls} ${labelSpan2 ? uiMobileMenu.sectionLabelSpan2 : ''}`}
        >
          {label}
        </span>
      ) : null}
      {children}
    </div>
  );
}
