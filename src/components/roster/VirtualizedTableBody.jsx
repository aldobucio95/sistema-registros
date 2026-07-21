import React, { useCallback, useRef, useEffect, useState, useLayoutEffect, useReducer } from 'react';
import {
  Virtualizer,
  elementScroll,
  observeElementRect,
  observeElementOffset as defaultObserveElementOffset,
} from '@tanstack/react-virtual';

/** Mínimo de filas para activar virtualización (menos nodos DOM en listas grandes). */
export const ROSTER_VIRTUALIZE_THRESHOLD = 40;

/** Estimación cercana a filas reales (~120–140px) para menos resize/thrash al scrollear. */
export const ROSTER_ROW_ESTIMATE = 120;
/** Filas con columna de acciones rápidas (~140–150px medidos en runtime). */
export const ROSTER_ROW_HEAVY_ESTIMATE = 145;
export const ROSTER_ROW_EXPANDED_ESTIMATE = 420;
/** Menos overscan en filas pesadas → menos filas montadas por tick de scroll. */
export const ROSTER_HEAVY_OVERSCAN = 1;

function getRowItemKey(item) {
  if (!item) return '';
  if (item.kind === 'branch') return `branch-${item.branchPerson?.id ?? ''}`;
  if (item.person?.id) return `person-${item.person.id}`;
  if (item.id) return `person-${item.id}`;
  return '';
}

const MemoVirtualRow = React.memo(
  function MemoVirtualRow({ item, index, rowMeta, renderItem }) {
    return renderItem(item, index, rowMeta);
  },
  (prev, next) =>
    prev.itemKey === next.itemKey &&
    prev.itemExpanded === next.itemExpanded &&
    prev.rowMeta.isScrolling === next.rowMeta.isScrolling
);

/** Alineado con breakpoint `md:` de Tailwind. */
export function useIsMdUp() {
  const [isMdUp, setIsMdUp] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : true
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = () => setIsMdUp(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isMdUp;
}

function readListOffsetInScrollContent(scrollEl, probeEl) {
  if (!scrollEl || !probeEl) return 0;
  const scrollRect = scrollEl.getBoundingClientRect();
  const probeRect = probeEl.getBoundingClientRect();
  return Math.max(0, probeRect.top - scrollRect.top + (scrollEl.scrollTop || 0));
}

/**
 * Virtualizer que solo re-renderiza React cuando cambia el rango visible,
 * como máximo 1 vez por frame (rAF).
 */
function useRosterVirtualizer(options) {
  const rerender = useReducer((x) => x + 1, 0)[1];
  const rangeRef = useRef(null);
  const isScrollingRef = useRef(false);
  const optionsRef = useRef(options);
  const rafRef = useRef(null);
  const pendingRef = useRef(null);
  optionsRef.current = options;

  const flushRange = useCallback(() => {
    rafRef.current = null;
    const inst = pendingRef.current;
    if (!inst) return;
    const range = inst.range;
    const prev = rangeRef.current;
    const next = range
      ? { startIndex: range.startIndex, endIndex: range.endIndex }
      : null;
    const rangeChanged =
      !prev ||
      !next ||
      prev.startIndex !== next.startIndex ||
      prev.endIndex !== next.endIndex;
    if (!rangeChanged) return;
    rangeRef.current = next;
    rerender();
  }, [rerender]);

  const [virtualizer] = useState(() => {
    const instance = new Virtualizer({
      observeElementRect,
      observeElementOffset: defaultObserveElementOffset,
      scrollToFn: elementScroll,
      ...options,
      onChange: (inst) => {
        pendingRef.current = inst;
        const wasScrolling = isScrollingRef.current;
        const scrolling = !!inst.isScrolling;
        isScrollingRef.current = scrolling;

        if (wasScrolling && !scrolling) {
          if (rafRef.current != null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
          rangeRef.current = {
            startIndex: inst.range?.startIndex ?? -1,
            endIndex: inst.range?.endIndex ?? -1,
          };
          if (!optionsRef.current.skipScrollEndRerender) {
            rerender();
          }
          optionsRef.current.onChange?.(inst);
          return;
        }

        if (rafRef.current == null) {
          rafRef.current = requestAnimationFrame(flushRange);
        }
        optionsRef.current.onChange?.(inst);
      },
    });
    return instance;
  });

  virtualizer.setOptions({
    observeElementRect,
    observeElementOffset: defaultObserveElementOffset,
    scrollToFn: elementScroll,
    ...options,
    onChange: virtualizer.options.onChange,
  });

  useLayoutEffect(() => virtualizer._didMount(), [virtualizer]);
  useLayoutEffect(() => virtualizer._willUpdate());
  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    },
    []
  );

  return virtualizer;
}

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
  const viRef = useRef(vi);
  viRef.current = vi;

  const measureRow = useCallback(() => {
    const el = elementRef.current;
    if (!el) return;

    let size = el.offsetHeight;
    const nextEl = el.nextElementSibling;
    if (
      nextEl &&
      nextEl.tagName === 'TR' &&
      !nextEl.hasAttribute('data-index') &&
      nextEl.getAttribute('aria-hidden') !== 'true'
    ) {
      size += nextEl.offsetHeight;
    }

    const currentVi = viRef.current;
    if (size > 0 && Math.abs(size - currentVi.size) >= 8) {
      virtualizer.resizeItem(currentVi.index, size);
    }
  }, [virtualizer]);

  useLayoutEffect(() => {
    if (virtualizer.isScrolling) return;
    measureRow();
  }, [measureRow, vi.index, vi.size, virtualizer.isScrolling]);

  useEffect(() => {
    const scrollEl = virtualizer.scrollElement;
    if (!scrollEl) return undefined;
    const onScrollEnd = () => measureRow();
    scrollEl.addEventListener('scrollend', onScrollEnd, { passive: true });
    return () => scrollEl.removeEventListener('scrollend', onScrollEnd);
  }, [virtualizer, measureRow]);

  const refCallback = useCallback((el) => {
    elementRef.current = el;
  }, []);

  return cloneElementWithRef(children, refCallback, vi.index);
}

/**
 * Virtualiza filas de `<tbody>` usando el scroll del workspace.
 * `renderItem(item, index, { isScrolling })` — en scroll se puede aligerar la fila.
 */
export default function VirtualizedTableBody({
  items,
  renderItem,
  isItemExpanded,
  emptyRow,
  enabled = false,
  estimateSize,
  overscan = 5,
  colSpan = 3,
  heavyRows = false,
}) {
  const isMdUp = useIsMdUp();
  const viewportActive = isMdUp;
  const shouldVirtualize = enabled && viewportActive && items.length >= ROSTER_VIRTUALIZE_THRESHOLD;
  const effectiveOverscan = heavyRows ? ROSTER_HEAVY_OVERSCAN : overscan;

  const getSize = useCallback(
    (index) => {
      const item = items[index];
      if (estimateSize) return estimateSize(item, index);
      const expanded = isItemExpanded?.(item, index);
      if (expanded) return ROSTER_ROW_EXPANDED_ESTIMATE;
      return heavyRows ? ROSTER_ROW_HEAVY_ESTIMATE : ROSTER_ROW_ESTIMATE;
    },
    [items, estimateSize, isItemExpanded, heavyRows]
  );

  const [scrollEl, setScrollEl] = useState(null);
  const tbodyProbeRef = useRef(null);
  const listOffsetRef = useRef(0);
  const heavyRowsRef = useRef(heavyRows);
  heavyRowsRef.current = heavyRows;

  useLayoutEffect(() => {
    const el = document.querySelector('[data-vnpm-workspace-scroll]');
    setScrollEl(el || document.documentElement);
  }, []);

  useLayoutEffect(() => {
    if (!shouldVirtualize || !scrollEl) return undefined;
    const probe = tbodyProbeRef.current;
    if (!probe) return undefined;

    const refreshOffset = () => {
      listOffsetRef.current = readListOffsetInScrollContent(scrollEl, probe);
    };
    refreshOffset();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(refreshOffset) : null;
    ro?.observe(probe);
    if (scrollEl !== document.documentElement) ro?.observe(scrollEl);
    return () => ro?.disconnect();
  }, [shouldVirtualize, scrollEl, items.length]);

  const observeElementOffset = useCallback((instance, cb) => {
    const element = instance.scrollElement;
    if (!element) return undefined;

    let idleTimer = null;
    const notify = (isScrolling) => {
      cb(element.scrollTop - listOffsetRef.current, isScrolling);
      if (heavyRowsRef.current) {
        const tbody = tbodyProbeRef.current?.closest('tbody');
        if (tbody) {
          if (isScrolling) tbody.setAttribute('data-roster-scrolling', 'true');
          else tbody.removeAttribute('data-roster-scrolling');
        }
      }
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
    overscan: effectiveOverscan,
    enabled: shouldVirtualize,
    getScrollElement: () => scrollEl,
    observeElementOffset,
    isScrollingResetDelay: 120,
  });

  if (!viewportActive) {
    return null;
  }

  if (items.length === 0) {
    return emptyRow ?? null;
  }

  if (!shouldVirtualize) {
    return items.map((item, index) => renderItem(item, index, { isScrolling: false }));
  }

  const virtualItems = virtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? Math.max(0, virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end)
      : 0;
  const rowMeta = { isScrolling: !!virtualizer.isScrolling };

  return (
    <>
      <tr aria-hidden="true" ref={tbodyProbeRef} style={{ height: 0, padding: 0, border: 0 }}>
        <td colSpan={colSpan} style={{ height: 0, padding: 0, border: 0, lineHeight: 0 }} />
      </tr>
      {paddingTop > 0 && (
        <tr aria-hidden="true">
          <td colSpan={colSpan} style={{ height: paddingTop, padding: 0, border: 0, lineHeight: 0 }} />
        </tr>
      )}
      {virtualItems.map((vi) => {
        const item = items[vi.index];
        const itemExpanded = !!isItemExpanded?.(item, vi.index);
        const itemKey = getRowItemKey(item);
        const rowEl = heavyRows ? (
          <MemoVirtualRow
            itemKey={itemKey}
            itemExpanded={itemExpanded}
            item={item}
            index={vi.index}
            rowMeta={rowMeta}
            renderItem={renderItem}
          />
        ) : (
          renderItem(item, vi.index, rowMeta)
        );
        return (
          <VirtualizedRowWrapper key={vi.key} vi={vi} virtualizer={virtualizer}>
            {rowEl}
          </VirtualizedRowWrapper>
        );
      })}
      {paddingBottom > 0 && (
        <tr aria-hidden="true">
          <td colSpan={colSpan} style={{ height: paddingBottom, padding: 0, border: 0, lineHeight: 0 }} />
        </tr>
      )}
    </>
  );
}

export { useRosterVirtualizer };
