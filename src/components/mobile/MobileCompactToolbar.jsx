import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { uiMobileMenu } from '../../ui/uiFormatClasses.js';

/**
 * Barra fija móvil: búsqueda + control esencial + toggle de panel.
 * El panel va en `panelChildren` (fuera del sticky, como hermano).
 */
export default function MobileCompactToolbar({
  searchSlot = null,
  primarySlot = null,
  metaSlot = null,
  optionsOpen = false,
  onToggleOptions,
  hasActiveFilters = false,
  optionsTitle = 'Más opciones',
  className = '',
}) {
  return (
    <div className={`${uiMobileMenu.stickyBar} ${className}`}>
      <div className={uiMobileMenu.stickyInner}>
        <div className={uiMobileMenu.stickyRow}>
          {searchSlot}
          {typeof onToggleOptions === 'function' ? (
            <button
              type="button"
              onClick={onToggleOptions}
              className={`${uiMobileMenu.optionsBtnBase} ${
                optionsOpen || hasActiveFilters ? uiMobileMenu.optionsBtnActive : uiMobileMenu.optionsBtnIdle
              }`}
              title={optionsTitle}
              aria-expanded={optionsOpen}
              aria-label={optionsTitle}
            >
              <SlidersHorizontal size={14} />
              {hasActiveFilters ? <span className={uiMobileMenu.filterDot} aria-hidden /> : null}
            </button>
          ) : null}
        </div>
        {primarySlot || metaSlot ? (
          <div className={uiMobileMenu.primaryRow}>
            {primarySlot}
            {metaSlot}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Panel colapsable debajo de la barra compacta (solo móvil). */
export function MobileCompactToolbarPanel({
  open = false,
  children,
  className = '',
  panelClassName = '',
}) {
  return (
    <div className={`${uiMobileMenu.panelWrap(open)} ${className}`}>
      <div className={`${uiMobileMenu.panel} ${panelClassName}`}>{children}</div>
    </div>
  );
}
