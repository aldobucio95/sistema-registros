import React, { useMemo } from 'react';
import VirtualizedList from '../../components/VirtualizedList.jsx';
import {
  TRANSPORT_ROW_BY_ROW_BASE_HEIGHT,
  buildTransportRowByRowGetItemHeight,
} from '../transportRowByRowVirtual.js';

/**
 * Cuerpo virtualizado para la tabla fila a fila (scroll del workspace).
 * Cada ítem renderiza uno o más <tr> dentro de una tabla anidada.
 */
export default function TransportRowByRowVirtualBody({
  items = [],
  expandedCarDetailKeys = new Set(),
  renderBlock,
  overscan = 8,
}) {
  const getItemHeight = useMemo(
    () => buildTransportRowByRowGetItemHeight(expandedCarDetailKeys),
    [expandedCarDetailKeys]
  );

  if (!items.length) return null;

  return (
    <tr>
      <td colSpan={99} className="p-0 align-top">
        <VirtualizedList
          items={items}
          itemHeight={TRANSPORT_ROW_BY_ROW_BASE_HEIGHT}
          getItemHeight={getItemHeight}
          overscan={overscan}
          useParentScroll
          renderItem={(item, index) => (
            <table className="w-full text-left text-xs border-collapse">
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {renderBlock(item, index)}
              </tbody>
            </table>
          )}
        />
      </td>
    </tr>
  );
}
