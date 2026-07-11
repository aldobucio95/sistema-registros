import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function resolveScrollParent(el, scrollParentSelector) {
  if (!el) return null;
  if (scrollParentSelector) {
    const matched = el.closest(scrollParentSelector);
    if (matched) return matched;
  }
  let parent = el.parentElement;
  while (parent && parent !== document.body) {
    const style = getComputedStyle(parent);
    const oy = style.overflowY;
    if ((oy === 'auto' || oy === 'scroll' || oy === 'overlay') && parent.scrollHeight > parent.clientHeight + 1) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
}

export function resolveVirtualListItemMeasureKey(item, index) {
  if (item?.key != null && String(item.key).trim()) return String(item.key);
  if (item?.id != null && String(item.id).trim()) return String(item.id);
  return `idx:${index}`;
}

export function estimateVirtualListItemHeights(items, itemHeight, getItemHeight) {
  return (items || []).map((item, index) => {
    if (typeof getItemHeight === 'function') {
      const h = Number(getItemHeight(item, index)) || itemHeight;
      return Math.max(1, h);
    }
    return itemHeight;
  });
}

/** Combina alturas estimadas con mediciones reales (ResizeObserver). */
export function mergeEstimatedAndMeasuredHeights(estimatedHeights, measuredByKey, items) {
  return estimatedHeights.map((estimated, index) => {
    const key = resolveVirtualListItemMeasureKey(items[index], index);
    const measured = measuredByKey[key];
    if (measured != null && measured > 0) return Math.max(estimated, measured);
    return estimated;
  });
}

export function buildHeightLayout(heights, fallbackHeight) {
  const safeHeights = (heights || []).map((h) => Math.max(1, Number(h) || fallbackHeight));
  const offsets = [];
  let total = 0;
  for (const h of safeHeights) {
    offsets.push(total);
    total += h;
  }
  return { heights: safeHeights, offsets, totalHeight: total || fallbackHeight };
}

function findIndexAtOffset(offsets, heights, scrollTop) {
  let lo = 0;
  let hi = heights.length - 1;
  if (hi < 0) return 0;
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    if (offsets[mid] <= scrollTop) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

function VirtualizedMeasuredRow({ measureKey, layoutHeight, top, onMeasure, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !onMeasure) return undefined;

    const report = () => {
      const h = Math.ceil(el.getBoundingClientRect().height);
      if (h > 0) onMeasure(measureKey, h);
    };

    report();
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => report())
        : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [measureKey, onMeasure, layoutHeight]);

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top,
        left: 0,
        right: 0,
        minHeight: layoutHeight,
      }}
    >
      {children}
    </div>
  );
}

export default function VirtualizedList({
  items = [],
  itemHeight = 72,
  getItemHeight = null,
  overscan = 6,
  maxHeight = 640,
  renderItem,
  className = '',
  innerClassName = '',
  useParentScroll = false,
  scrollParentSelector = '[data-vnpm-workspace-scroll]',
}) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(Math.min(maxHeight, Math.max(itemHeight * 4, 320)));
  const [measuredByKey, setMeasuredByKey] = useState({});
  const useVariableHeights = typeof getItemHeight === 'function';
  const useMeasuredHeights = useVariableHeights;

  const estimateSignature = useMemo(
    () =>
      items
        .map((item, index) => {
          const est = estimateVirtualListItemHeights([item], itemHeight, getItemHeight)[0];
          const key = resolveVirtualListItemMeasureKey(item, index);
          return `${key}:${est}`;
        })
        .join('|'),
    [items, itemHeight, getItemHeight]
  );

  useEffect(() => {
    setMeasuredByKey({});
  }, [estimateSignature]);

  const estimatedHeights = useMemo(
    () => estimateVirtualListItemHeights(items, itemHeight, getItemHeight),
    [items, itemHeight, getItemHeight]
  );

  const mergedHeights = useMemo(() => {
    if (!useMeasuredHeights) return estimatedHeights;
    return mergeEstimatedAndMeasuredHeights(estimatedHeights, measuredByKey, items);
  }, [estimatedHeights, measuredByKey, items, useMeasuredHeights]);

  const { heights, offsets, totalHeight } = useMemo(
    () => buildHeightLayout(mergedHeights, itemHeight),
    [mergedHeights, itemHeight]
  );

  const onMeasure = useCallback((key, height) => {
    setMeasuredByKey((prev) => {
      if (prev[key] === height) return prev;
      return { ...prev, [key]: height };
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    if (useParentScroll) {
      const scrollParent = resolveScrollParent(el, scrollParentSelector);
      if (!scrollParent) return undefined;

      const updateFromParent = () => {
        const listEl = containerRef.current;
        if (!listEl) return;
        const listRect = listEl.getBoundingClientRect();
        const parentRect = scrollParent.getBoundingClientRect();
        const nextViewport = Math.max(itemHeight, parentRect.height || scrollParent.clientHeight || itemHeight * 4);
        const nextScrollTop = Math.max(0, parentRect.top - listRect.top);
        setViewportHeight(nextViewport);
        setScrollTop(nextScrollTop);
      };

      updateFromParent();
      scrollParent.addEventListener('scroll', updateFromParent, { passive: true });
      window.addEventListener('resize', updateFromParent);
      const ro =
        typeof ResizeObserver !== 'undefined'
          ? new ResizeObserver(() => updateFromParent())
          : null;
      ro?.observe(el);
      ro?.observe(scrollParent);

      return () => {
        scrollParent.removeEventListener('scroll', updateFromParent);
        window.removeEventListener('resize', updateFromParent);
        ro?.disconnect();
      };
    }

    const updateViewport = () => {
      setViewportHeight(el.clientHeight || Math.min(maxHeight, Math.max(itemHeight * 4, 320)));
    };

    updateViewport();

    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => updateViewport())
        : null;
    ro?.observe(el);

    return () => ro?.disconnect();
  }, [itemHeight, maxHeight, useParentScroll, scrollParentSelector, items.length, totalHeight]);

  const containerHeight = useParentScroll
    ? totalHeight || itemHeight
    : Math.min(maxHeight, Math.max(itemHeight, totalHeight || itemHeight));

  const { startIndex, endIndex, visibleItems } = useMemo(() => {
    if (!items.length) {
      return { startIndex: 0, endIndex: 0, visibleItems: [] };
    }
    if (!useVariableHeights) {
      const rawStart = Math.floor(scrollTop / itemHeight);
      const visibleCount = Math.ceil(viewportHeight / itemHeight);
      const start = clamp(rawStart - overscan, 0, Math.max(0, items.length - 1));
      const end = clamp(rawStart + visibleCount + overscan, 0, items.length);
      return { startIndex: start, endIndex: end, visibleItems: items.slice(start, end) };
    }

    const rawStart = findIndexAtOffset(offsets, heights, scrollTop);
    let end = rawStart;
    let acc = offsets[rawStart] || 0;
    const limit = scrollTop + viewportHeight;
    while (end < items.length && acc < limit) {
      acc += heights[end] || itemHeight;
      end += 1;
    }
    const start = clamp(rawStart - overscan, 0, Math.max(0, items.length - 1));
    const finalEnd = clamp(end + overscan, 0, items.length);
    return { startIndex: start, endIndex: finalEnd, visibleItems: items.slice(start, finalEnd) };
  }, [items, itemHeight, useVariableHeights, heights, offsets, overscan, scrollTop, viewportHeight]);

  const listBody = (
    <div className={innerClassName} style={{ height: totalHeight || itemHeight, position: 'relative' }}>
      {visibleItems.map((item, idx) => {
        const actualIndex = startIndex + idx;
        const top = useVariableHeights ? offsets[actualIndex] || 0 : actualIndex * itemHeight;
        const layoutHeight = useVariableHeights ? heights[actualIndex] || itemHeight : itemHeight;
        const measureKey = resolveVirtualListItemMeasureKey(item, actualIndex);
        const row = renderItem(item, actualIndex);

        if (useMeasuredHeights) {
          return (
            <VirtualizedMeasuredRow
              key={measureKey}
              measureKey={measureKey}
              layoutHeight={layoutHeight}
              top={top}
              onMeasure={onMeasure}
            >
              {row}
            </VirtualizedMeasuredRow>
          );
        }

        return (
          <div
            key={measureKey}
            style={{
              position: 'absolute',
              top,
              left: 0,
              right: 0,
              height: layoutHeight,
            }}
          >
            {row}
          </div>
        );
      })}
    </div>
  );

  if (useParentScroll) {
    return (
      <div ref={containerRef} className={className} style={{ height: containerHeight, position: 'relative' }}>
        {listBody}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ height: containerHeight, overflowY: 'auto' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      {listBody}
    </div>
  );
}
