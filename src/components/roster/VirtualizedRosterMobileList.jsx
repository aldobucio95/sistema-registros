import React, { useCallback, useState, useLayoutEffect, useRef } from 'react';
import {
  ROSTER_ROW_ESTIMATE,
  ROSTER_ROW_EXPANDED_ESTIMATE,
  ROSTER_VIRTUALIZE_THRESHOLD,
  useIsMdUp,
  useRosterVirtualizer,
} from './VirtualizedTableBody.jsx';

function readListOffsetInScrollContent(scrollEl, probeEl) {
  if (!scrollEl || !probeEl) return 0;
  const scrollRect = scrollEl.getBoundingClientRect();
  const probeRect = probeEl.getBoundingClientRect();
  return Math.max(0, probeRect.top - scrollRect.top + (scrollEl.scrollTop || 0));
}

/**
 * Lista móvil (div) virtualizada con scroll del workspace.
 * No monta filas en viewport `md+` (la tabla desktop cubre ese caso).
 */
export default function VirtualizedRosterMobileList({
  items,
  renderItem,
  isItemExpanded,
  emptyContent,
  enabled = false,
  estimateSize,
  overscan = 4,
}) {
  const isMdUp = useIsMdUp();
  const viewportActive = !isMdUp;
  const shouldVirtualize = enabled && viewportActive && items.length >= ROSTER_VIRTUALIZE_THRESHOLD;

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
  const rootRef = useRef(null);
  const listOffsetRef = useRef(0);

  useLayoutEffect(() => {
    const el = document.querySelector('[data-vnpm-workspace-scroll]');
    setScrollEl(el || document.documentElement);
  }, []);

  useLayoutEffect(() => {
    if (!shouldVirtualize || !scrollEl) return undefined;
    const root = rootRef.current;
    if (!root) return undefined;

    const refreshOffset = () => {
      listOffsetRef.current = readListOffsetInScrollContent(scrollEl, root);
    };
    refreshOffset();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(refreshOffset) : null;
    ro?.observe(root);
    if (scrollEl !== document.documentElement) ro?.observe(scrollEl);
    return () => ro?.disconnect();
  }, [shouldVirtualize, scrollEl, items.length]);

  const observeElementOffset = useCallback((instance, cb) => {
    const element = instance.scrollElement;
    if (!element) return undefined;

    let idleTimer = null;
    const notify = (isScrolling) => {
      cb(element.scrollTop - listOffsetRef.current, isScrolling);
    };

    const onScroll = () => {
      notify(true);
      if (idleTimer != null) window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        idleTimer = null;
        notify(false);
      }, 120);
    };
    const onScrollEnd = () => {
      if (idleTimer != null) window.clearTimeout(idleTimer);
      idleTimer = null;
      notify(false);
    };

    element.addEventListener('scroll', onScroll, { passive: true });
    element.addEventListener('scrollend', onScrollEnd, { passive: true });
    notify(false);
    return () => {
      element.removeEventListener('scroll', onScroll);
      element.removeEventListener('scrollend', onScrollEnd);
      if (idleTimer != null) window.clearTimeout(idleTimer);
    };
  }, []);

  const virtualizer = useRosterVirtualizer({
    count: items.length,
    estimateSize: getSize,
    overscan,
    enabled: shouldVirtualize,
    getScrollElement: () => scrollEl,
    observeElementOffset,
    isScrollingResetDelay: 100,
  });

  if (!viewportActive) {
    return null;
  }

  if (items.length === 0) {
    return emptyContent ?? null;
  }

  if (!shouldVirtualize) {
    return items.map((item, index) => renderItem(item, index));
  }

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={rootRef}
      style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}
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
          {renderItem(items[vi.index], vi.index)}
        </div>
      ))}
    </div>
  );
}
