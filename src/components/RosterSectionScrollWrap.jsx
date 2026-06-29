import React, { useCallback, useRef } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { uiRosterSectionScroll } from '../ui/uiFormatClasses.js';

function findScrollableParent(el) {
  let parent = el?.parentElement;
  while (parent && parent !== document.body) {
    const oy = getComputedStyle(parent).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && parent.scrollHeight > parent.clientHeight + 1) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
}

function scrollAnchorIntoSection(anchorEl, { block = 'start', behavior = 'smooth' } = {}) {
  if (!anchorEl) return;
  const offset =
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches ? 56 : 72;
  const scrollParent = findScrollableParent(anchorEl);
  if (scrollParent) {
    const aRect = anchorEl.getBoundingClientRect();
    const pRect = scrollParent.getBoundingClientRect();
    const topDelta =
      block === 'end'
        ? aRect.bottom - pRect.bottom + 16
        : aRect.top - pRect.top - offset;
    scrollParent.scrollTo({
      top: scrollParent.scrollTop + topDelta,
      behavior,
    });
    return;
  }
  anchorEl.scrollIntoView({ behavior, block });
}

export default function RosterSectionScrollWrap({ sectionId, children }) {
  const topRef = useRef(null);
  const bottomRef = useRef(null);

  const scrollToTop = useCallback(() => {
    scrollAnchorIntoSection(topRef.current, { block: 'start' });
  }, []);

  const scrollToBottom = useCallback(() => {
    scrollAnchorIntoSection(bottomRef.current, { block: 'end' });
  }, []);

  return (
    <>
      <div className={uiRosterSectionScroll.wrap}>
        <div
          id={`${sectionId}-top`}
          ref={topRef}
          className={uiRosterSectionScroll.topAnchor}
          aria-hidden
        />
        {children}
        <div
          id={`${sectionId}-bottom`}
          ref={bottomRef}
          className={uiRosterSectionScroll.bottomAnchor}
          aria-hidden
        />
      </div>
      <div className={uiRosterSectionScroll.controls} role="group" aria-label="Desplazamiento de sección">
        <button
          type="button"
          onClick={scrollToTop}
          className={uiRosterSectionScroll.btn}
          title="Ir al inicio de la sección"
          aria-label="Ir al inicio de la sección"
        >
          <ChevronUp size={14} aria-hidden />
          <span className={uiRosterSectionScroll.btnLabel}>Inicio</span>
        </button>
        <button
          type="button"
          onClick={scrollToBottom}
          className={uiRosterSectionScroll.btn}
          title="Ir al final de la sección"
          aria-label="Ir al final de la sección"
        >
          <ChevronDown size={14} aria-hidden />
          <span className={uiRosterSectionScroll.btnLabel}>Final</span>
        </button>
      </div>
    </>
  );
}
