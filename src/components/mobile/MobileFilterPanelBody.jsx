import React from 'react';
import { uiFilter, uiMobileMenu } from '../../ui/uiFormatClasses.js';

/**
 * Cuerpo de panel de filtros móvil: lista vertical de grupos con borde y opciones alineadas.
 * El scroll es el de la página (sin contenedor interno con overflow).
 */
export default function MobileFilterPanelBody({ children, className = '' }) {
  return (
    <div className={`${uiMobileMenu.filterPanel} ${uiFilter.dropdownScope} ${className}`}>
      {children}
    </div>
  );
}
