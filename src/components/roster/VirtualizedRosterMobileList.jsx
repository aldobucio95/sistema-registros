import React, { useCallback, useState, useLayoutEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ROSTER_ROW_ESTIMATE,
  ROSTER_ROW_EXPANDED_ESTIMATE,
  ROSTER_VIRTUALIZE_THRESHOLD,
} from './VirtualizedTableBody.jsx';

/**
 * Lista móvil (div) virtualizada con scroll de ventana.
 */
export default function VirtualizedRosterMobileList({
  items,
  renderItem,
  isItemExpanded,
  emptyContent,
  enabled = false,
  estimateSize,
  overscan = 10,
}) {
  const shouldVirtualize = enabled && items.length >= ROSTER_VIRTUALIZE_THRESHOLD;

  const getSize = useCallback(
    (index) => {
      const item = items[index];
      if (estimateSize) return estimateSize(item, index);
      const expanded = isItemExpanded?.(item, index);
      return expanded ? ROSTER_ROW_EXPANDED_ESTIMATE + 80 : ROSTER_ROW_ESTIMATE + 40;
    },
    [items, estimateSize, isItemExpanded]
  );

  const [scrollEl, setScrollEl] = useState(null);

  useLayoutEffect(() => {
    const el = document.querySelector('[data-vnpm-workspace-scroll]');
    setScrollEl(el || document.documentElement);
  }, []);

  const virtualizer = useVirtualizer({
    count: items.length,
    estimateSize: getSize,
    overscan,
    enabled: shouldVirtualize,
    getScrollElement: () => scrollEl,
  });

  if (items.length === 0) {
    return emptyContent ?? null;
  }

  if (!shouldVirtualize) {
    return items.map((item, index) => renderItem(item, index));
  }

  const virtualItems = virtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
      : 0;

  return (
    <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
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
          {renderItem(items[vi.index], vi.index)}
        </div>
      ))}
    </div>
  );
}
