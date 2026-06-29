import React from 'react';
import { MapPin } from 'lucide-react';
import { uiRosterMobile } from '../ui/uiFormatClasses.js';

/** Clic en controles anidados (copiar, enlaces); no en la zona táctil del participante. */
function isNestedInteractiveTarget(target, container) {
  if (!(target instanceof Element) || target === container) return false;
  const hit = target.closest(
    'button, a, input, select, textarea, label, [contenteditable="true"]'
  );
  return Boolean(hit && container.contains(hit));
}

/**
 * Fila de roster en vista móvil (<md). Reutiliza renderers de App.jsx vía props.
 */
export default function RosterParticipantMobileCard({
  personId,
  anchorId,
  isExpanded = false,
  onToggleExpand,
  onRowClick,
  participantContent,
  financesContent,
  actionsContent,
  sedeLabel,
  showSede = false,
  expandedContent = null,
  className = '',
  branchMeta = null,
}) {
  const canToggle = typeof onToggleExpand === 'function' || typeof onRowClick === 'function';

  const handleParticipantTap = (e) => {
    if (isNestedInteractiveTarget(e.target, e.currentTarget)) return;
    if (typeof onRowClick === 'function') onRowClick(e);
    else if (typeof onToggleExpand === 'function') onToggleExpand();
  };

  const participantTapProps = canToggle
    ? {
        className: uiRosterMobile.participantTap,
        onClick: handleParticipantTap,
        onKeyDown: (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleParticipantTap(e);
          }
        },
        role: 'button',
        tabIndex: 0,
        title: 'Tocar para ver u ocultar detalles',
        'aria-expanded': isExpanded,
      }
    : { className: '' };

  return (
    <div
      id={anchorId}
      className={`${uiRosterMobile.card} ${isExpanded ? uiRosterMobile.cardExpanded : ''} ${className}`.trim()}
      data-roster-person-id={personId}
    >
      <div className={uiRosterMobile.cardSection}>
        <div {...participantTapProps}>
          <div>
            <p className={uiRosterMobile.sectionLabel}>Participante</p>
            {participantContent}
            {branchMeta ? (
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">{branchMeta}</p>
            ) : null}
          </div>
          {showSede && sedeLabel ? (
            <div className="mt-1.5">
              <p className={uiRosterMobile.sectionLabel}>Sede</p>
              <span className={uiRosterMobile.sedeBadge}>
                <MapPin size={12} aria-hidden />
                {sedeLabel}
              </span>
            </div>
          ) : null}
        </div>
        {financesContent != null ? (
          <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
            <p className={uiRosterMobile.sectionLabel}>Finanzas</p>
            <div className="text-left">{financesContent}</div>
          </div>
        ) : null}
      </div>
      {actionsContent ? (
        <div
          className="mt-1 pt-1 border-t border-slate-200 dark:border-slate-700"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <p className={uiRosterMobile.sectionLabel}>Acciones</p>
          <div className={uiRosterMobile.actionsPanel}>{actionsContent}</div>
        </div>
      ) : null}
      {isExpanded && expandedContent ? (
        <div className={uiRosterMobile.expandPanel}>{expandedContent}</div>
      ) : null}
    </div>
  );
}
