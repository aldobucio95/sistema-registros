import React, { useMemo } from 'react';
import { Car } from 'lucide-react';
import { TransportLazySection } from '../transportPlanningUi.jsx';
import VirtualizedList from '../../components/VirtualizedList.jsx';
import {
  TRANSPORT_MANUAL_GROUP_CARD_BASE_HEIGHT,
  buildManualCarGroupGetItemHeight,
  buildManualCarGroupRowItems,
} from '../transportManualCarGroupsVirtual.js';

/** Grupos manuales de carro compartido (colapsable). */
export default function TransportManualCarGroupsSection({
  views,
  isOpen,
  onOpenChange,
  expandedCardKeys = new Set(),
  renderGroupCard,
}) {
  const cardRows = useMemo(() => buildManualCarGroupRowItems(views || [], 2), [views]);
  const getItemHeight = useMemo(
    () => buildManualCarGroupGetItemHeight(expandedCardKeys),
    [expandedCardKeys]
  );
  if (!views?.length) return null;
  return (
    <TransportLazySection
      open={isOpen === true}
      onOpenChange={onOpenChange}
      debugSection="manualCarGroups"
      shellClassName="bg-indigo-50/80 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-700/60 overflow-hidden shadow-sm"
      headerClassName="w-full cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-2 bg-indigo-100/80 dark:bg-indigo-900/40 border-b border-indigo-200/80 dark:border-indigo-700/50 text-[10px] font-black uppercase tracking-widest text-indigo-800 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/55"
      header={
        <span className="flex items-center gap-2">
          <Car size={14} className="shrink-0" />
          Carros compartidos (grupos manuales)
          <span className="font-bold normal-case tracking-normal text-indigo-600/80 dark:text-indigo-300/80">
            ({views.length} grupo{views.length !== 1 ? 's' : ''})
          </span>
        </span>
      }
    >
      <div className="p-3">
        <VirtualizedList
          items={cardRows}
          itemHeight={TRANSPORT_MANUAL_GROUP_CARD_BASE_HEIGHT}
          getItemHeight={getItemHeight}
          overscan={6}
          useParentScroll
          renderItem={(row, index) => (
            <div
              key={row.key || `manual-card-row-${index}`}
              className="grid grid-cols-1 lg:grid-cols-2 gap-3 pb-3"
            >
              {(row.views || []).map((view) => (
                <React.Fragment key={view.id}>{renderGroupCard(view)}</React.Fragment>
              ))}
            </div>
          )}
        />
      </div>
    </TransportLazySection>
  );
}
