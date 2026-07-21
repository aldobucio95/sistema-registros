import React, { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { uiRosterSectionScroll } from '../ui/uiFormatClasses.js';

const visibilityBySection = new Map();
const visibilityListeners = new Set();
const prevShowControlsBySection = new Map();
let prevActiveSectionId = null;

function subscribeSectionVisibility(onStoreChange) {
  visibilityListeners.add(onStoreChange);
  return () => visibilityListeners.delete(onStoreChange);
}

function getActiveSectionSnapshot() {
  let bestId = null;
  let best = 0;
  for (const [id, ratio] of visibilityBySection) {
    if (ratio > best) {
      best = ratio;
      bestId = id;
    }
  }
  // #region agent log
  if (prevActiveSectionId !== bestId) {
    prevActiveSectionId = bestId;
    fetch('http://127.0.0.1:7409/ingest/332642dd-c03e-4db9-85e6-913026f5ed31',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'bdd59f'},body:JSON.stringify({sessionId:'bdd59f',runId:'pre-fix',hypothesisId:'H1-H2-H5',location:'RosterSectionScrollWrap.jsx:getActiveSectionSnapshot',message:'active section changed',data:{bestId,bestRatio:best,entries:Object.fromEntries(visibilityBySection),threshold:0.02},timestamp:Date.now()})}).catch(()=>{});
  }
  // #endregion
  return bestId;
}

function notifySectionVisibility() {
  visibilityListeners.forEach((fn) => fn());
}

function findScrollableParent(el) {
  let parent = el?.parentElement;
  while (parent && parent !== document.body) {
    const style = getComputedStyle(parent);
    const oy = style.overflowY;
    const ox = style.overflowX;
    const scrollableY =
      (oy === 'auto' || oy === 'scroll' || oy === 'overlay') &&
      parent.scrollHeight > parent.clientHeight + 1;
    const scrollableX =
      (ox === 'auto' || ox === 'scroll' || ox === 'overlay') &&
      parent.scrollWidth > parent.clientWidth + 1;
    if (scrollableY || scrollableX) return parent;
    parent = parent.parentElement;
  }
  return null;
}

function scrollAnchorIntoSection(anchorEl, { block = 'start', behavior = 'smooth' } = {}) {
  if (!anchorEl) return;
  const offset =
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches ? 56 : 72;
  const scrollParent = findScrollableParent(anchorEl);
  const workspaceScroll =
    typeof document !== 'undefined'
      ? document.querySelector('[data-vnpm-workspace-scroll]')
      : null;
  // #region agent log
  fetch('http://127.0.0.1:7409/ingest/332642dd-c03e-4db9-85e6-913026f5ed31',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'bdd59f'},body:JSON.stringify({sessionId:'bdd59f',runId:'pre-fix',hypothesisId:'H3-H4',location:'RosterSectionScrollWrap.jsx:scrollAnchorIntoSection',message:'scroll request',data:{block,hasAnchor:!!anchorEl,anchorId:anchorEl?.id||null,offset,foundParentTag:scrollParent?.tagName||null,foundParentDataAttr:scrollParent?.getAttribute?.('data-vnpm-workspace-scroll')??null,parentIsWorkspace:!!(scrollParent&&workspaceScroll&&scrollParent===workspaceScroll),parentScrollTop:scrollParent?.scrollTop??null,parentClientH:scrollParent?.clientHeight??null,parentScrollH:scrollParent?.scrollHeight??null,aTop:anchorEl.getBoundingClientRect().top,aBottom:anchorEl.getBoundingClientRect().bottom,pTop:scrollParent?.getBoundingClientRect?.()?.top??null,pBottom:scrollParent?.getBoundingClientRect?.()?.bottom??null,topDelta:scrollParent?(block==='end'?anchorEl.getBoundingClientRect().bottom-scrollParent.getBoundingClientRect().bottom+16:anchorEl.getBoundingClientRect().top-scrollParent.getBoundingClientRect().top-offset):null,targetScrollTop:scrollParent?(scrollParent.scrollTop+(block==='end'?anchorEl.getBoundingClientRect().bottom-scrollParent.getBoundingClientRect().bottom+16:anchorEl.getBoundingClientRect().top-scrollParent.getBoundingClientRect().top-offset)):null},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
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
  // #region agent log
  fetch('http://127.0.0.1:7409/ingest/332642dd-c03e-4db9-85e6-913026f5ed31',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'bdd59f'},body:JSON.stringify({sessionId:'bdd59f',runId:'pre-fix',hypothesisId:'H3',location:'RosterSectionScrollWrap.jsx:scrollAnchorIntoSection:fallback',message:'no scroll parent; using scrollIntoView',data:{block,anchorId:anchorEl?.id||null},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  anchorEl.scrollIntoView({ behavior, block: block === 'end' ? 'end' : 'start' });
}

function useActiveScrollSection() {
  return useSyncExternalStore(subscribeSectionVisibility, getActiveSectionSnapshot, () => null);
}

export default function RosterSectionScrollWrap({
  sectionId,
  children,
  controlsEnabled = true,
}) {
  const wrapRef = useRef(null);
  const topRef = useRef(null);
  const bottomRef = useRef(null);
  const activeSectionId = useActiveScrollSection();

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !controlsEnabled) {
      visibilityBySection.delete(sectionId);
      notifySectionVisibility();
      return undefined;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        visibilityBySection.set(sectionId, entry?.isIntersecting ? entry.intersectionRatio : 0);
        notifySectionVisibility();
      },
      {
        threshold: [0, 0.05, 0.1, 0.2, 0.35, 0.5, 0.65, 0.8, 1],
        rootMargin: '-12% 0px -12% 0px',
      }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      visibilityBySection.delete(sectionId);
      notifySectionVisibility();
    };
  }, [sectionId, controlsEnabled]);

  const scrollToTop = useCallback(() => {
    scrollAnchorIntoSection(topRef.current || wrapRef.current, { block: 'start' });
  }, []);

  const scrollToBottom = useCallback(() => {
    scrollAnchorIntoSection(bottomRef.current, { block: 'end' });
  }, []);

  const sectionRatio = visibilityBySection.get(sectionId) || 0;
  const showControls =
    controlsEnabled && activeSectionId === sectionId && sectionRatio > 0.02;

  // #region agent log
  {
    const prevShow = prevShowControlsBySection.get(sectionId);
    if (prevShow !== showControls) {
      prevShowControlsBySection.set(sectionId, showControls);
      fetch('http://127.0.0.1:7409/ingest/332642dd-c03e-4db9-85e6-913026f5ed31',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'bdd59f'},body:JSON.stringify({sessionId:'bdd59f',runId:'pre-fix',hypothesisId:'H1-H2-H5',location:'RosterSectionScrollWrap.jsx:showControls',message:'controls visibility toggled',data:{sectionId,showControls,activeSectionId,sectionRatio,controlsEnabled},timestamp:Date.now()})}).catch(()=>{});
    }
  }
  // #endregion

  return (
    <>
      <div ref={wrapRef} className={uiRosterSectionScroll.wrap}>
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
      {showControls ? (
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
      ) : null}
    </>
  );
}
