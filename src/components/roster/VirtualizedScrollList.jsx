import React, { useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ROSTER_VIRTUALIZE_THRESHOLD } from './VirtualizedTableBody.jsx';

/** Umbral más bajo: paneles de Transporte son más chicos que el roster completo. */
export const TRANSPORT_VIRTUALIZE_THRESHOLD = 24;

export const TRANSPORT_ROW_ESTIMATE = 56;

/**
 * Lista virtualizada con scroll en un contenedor propio (no ventana/workspace).
 * Por debajo del umbral renderiza `.map()` directo.
 */
export default function VirtualizedScrollList({
  items = [],
  renderItem,
  estimateSize = TRANSPORT_ROW_ESTIMATE,
  threshold = TRANSPORT_VIRTUALIZE_THRESHOLD,
  overscan = 8,
  className = '',
  emptyContent = null,
  enabled = true,
  getItemKey,
}) {
  const parentRef = useRef(null);
  const list = Array.isArray(items) ? items : [];
  const shouldVirtualize = enabled && list.length >= threshold;

  const getSize = useCallback(
    (index) => {
      if (typeof estimateSize === 'function') return estimateSize(list[index], index);
      return Math.max(1, Number(estimateSize) || TRANSPORT_ROW_ESTIMATE);
    },
    [estimateSize, list]
  );

  const virtualizer = useVirtualizer({
    count: list.length,
    estimateSize: getSize,
    overscan,
    enabled: shouldVirtualize,
    getScrollElement: () => parentRef.current,
  });

  if (list.length === 0) {
    return emptyContent;
  }

  if (!shouldVirtualize) {
    return (
      <div ref={parentRef} className={className}>
        {list.map((item, index) => (
          <React.Fragment key={getItemKey ? getItemKey(item, index) : index}>
            {renderItem(item, index)}
          </React.Fragment>
        ))}
      </div>
    );
  }

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div ref={parentRef} className={className}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((vi) => (
          <div
            key={vi.key}
            data-index={vi.index}
            ref={virtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${vi.start}px)`,
            }}
          >
            {renderItem(list[vi.index], vi.index)}
          </div>
        ))}
      </div>
    </div>
  );
}

export { ROSTER_VIRTUALIZE_THRESHOLD };
