import React from 'react';
import VirtualizedList from '../../VirtualizedList.jsx';

const ROSTER_ROW_HEIGHT_MOBILE = 132;
// Las filas desktop colapsadas ocupan más que 92px por nombre, badges y acciones.
const ROSTER_ROW_HEIGHT_DESKTOP = 118;
const ROSTER_ROW_EXPANDED_EXTRA_MOBILE = 460;
const ROSTER_ROW_EXPANDED_EXTRA_DESKTOP = 520;

export function getLocationRosterRowBaseHeight(isMobile) {
  return isMobile ? ROSTER_ROW_HEIGHT_MOBILE : ROSTER_ROW_HEIGHT_DESKTOP;
}

export function getLocationRosterRowExpandedExtra(isMobile) {
  return isMobile ? ROSTER_ROW_EXPANDED_EXTRA_MOBILE : ROSTER_ROW_EXPANDED_EXTRA_DESKTOP;
}

/** Altura estimada por fila (expansión sin invalidar el modelo). */
export function buildLocationRosterGetItemHeight({ isMobile, expandedPersonIds = new Set() }) {
  const base = getLocationRosterRowBaseHeight(isMobile);
  const expandedExtra = getLocationRosterRowExpandedExtra(isMobile);
  return (rowItem) => {
    if (rowItem?.kind === 'branch') return base;
    const personId = String(rowItem?.person?.id || '').trim();
    if (personId && expandedPersonIds.has(personId)) return base + expandedExtra;
    return base;
  };
}

/**
 * Sección virtualizada del roster por sede (Activos / Espera / Cancelados).
 * Un solo layout (móvil o escritorio) y scroll del panel principal.
 */
export default function LocationRosterVirtualSection({
  items = [],
  isMobile = false,
  emptyMessage = '',
  renderRow,
  expandedPersonIds = new Set(),
  desktopTableHeader = null,
  mobileListClassName = '',
  desktopBodyClassName = '',
  overscan = 8,
}) {
  if (!items.length) {
    return (
      <p className="px-3 py-10 text-center text-slate-400 italic font-medium text-sm md:px-6 md:py-16">
        {emptyMessage}
      </p>
    );
  }

  const getItemHeight = buildLocationRosterGetItemHeight({ isMobile, expandedPersonIds });
  const baseHeight = getLocationRosterRowBaseHeight(isMobile);

  if (isMobile) {
    return (
      <div className={mobileListClassName}>
        <VirtualizedList
          items={items}
          itemHeight={baseHeight}
          getItemHeight={getItemHeight}
          overscan={overscan}
          useParentScroll
          renderItem={(item, index) => renderRow(item, index)}
        />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] table-fixed border-collapse">
        {desktopTableHeader}
      </table>
      <VirtualizedList
        items={items}
        itemHeight={baseHeight}
        getItemHeight={getItemHeight}
        overscan={overscan}
        useParentScroll
        renderItem={(item, index) => renderRow(item, index)}
      />
    </div>
  );
}
