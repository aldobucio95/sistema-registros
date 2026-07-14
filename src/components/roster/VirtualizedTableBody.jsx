import React, { useCallback, useRef, useEffect, useState, useLayoutEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

/** Mínimo de filas para activar virtualización (menos nodos DOM en listas grandes). */
export const ROSTER_VIRTUALIZE_THRESHOLD = 40;

export const ROSTER_ROW_ESTIMATE = 72;
export const ROSTER_ROW_EXPANDED_ESTIMATE = 420;

function cloneElementWithRef(element, refCallback, index) {
  if (!React.isValidElement(element)) return element;

  if (element.type === React.Fragment) {
    const childrenArray = React.Children.toArray(element.props.children);
    if (childrenArray.length === 0) return element;
    
    const firstChild = cloneElementWithRef(childrenArray[0], refCallback, index);
    
    return (
      <React.Fragment key={element.key}>
        {firstChild}
        {childrenArray.slice(1)}
      </React.Fragment>
    );
  }

  return React.cloneElement(element, {
    ref: (el) => {
      refCallback(el);
      if (element.ref) {
        if (typeof element.ref === 'function') element.ref(el);
        else element.ref.current = el;
      }
    },
    'data-index': index,
  });
}

function VirtualizedRowWrapper({ vi, virtualizer, children }) {
  const elementRef = useRef(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    let size = el.offsetHeight;
    const nextEl = el.nextElementSibling;
    if (nextEl && nextEl.tagName === 'TR' && !nextEl.hasAttribute('data-index')) {
      size += nextEl.offsetHeight;
    }

    if (size !== vi.size) {
      virtualizer.resizeItem(vi.index, size);
    }
  }, [vi.index, vi.size, virtualizer]);

  const refCallback = useCallback((el) => {
    elementRef.current = el;
  }, []);

  return cloneElementWithRef(children, refCallback, vi.index);
}

/**
 * Virtualiza filas de `<tbody>` usando scroll de ventana.
 * Solo monta filas visibles + overscan; filas expandidas usan altura estimada mayor.
 */
export default function VirtualizedTableBody({
  items,
  renderItem,
  isItemExpanded,
  emptyRow,
  enabled = false,
  estimateSize,
  overscan = 8,
  colSpan = 3,
}) {
  const shouldVirtualize = enabled && items.length >= ROSTER_VIRTUALIZE_THRESHOLD;

  const getSize = useCallback(
    (index) => {
      const item = items[index];
      if (estimateSize) return estimateSize(item, index);
      const expanded = isItemExpanded?.(item, index);
      return expanded ? ROSTER_ROW_EXPANDED_ESTIMATE : ROSTER_ROW_ESTIMATE;
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
    return emptyRow ?? null;
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
    <>
      {paddingTop > 0 && (
        <tr aria-hidden="true">
          <td colSpan={colSpan} style={{ height: paddingTop, padding: 0, border: 0, lineHeight: 0 }} />
        </tr>
      )}
      {virtualItems.map((vi) => (
        <VirtualizedRowWrapper key={vi.key} vi={vi} virtualizer={virtualizer}>
          {renderItem(items[vi.index], vi.index)}
        </VirtualizedRowWrapper>
      ))}
      {paddingBottom > 0 && (
        <tr aria-hidden="true">
          <td colSpan={colSpan} style={{ height: paddingBottom, padding: 0, border: 0, lineHeight: 0 }} />
        </tr>
      )}
    </>
  );
}
