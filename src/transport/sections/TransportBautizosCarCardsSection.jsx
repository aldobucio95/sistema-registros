import React from 'react';
import { Car } from 'lucide-react';
import { TransportLazySection } from '../transportPlanningUi.jsx';
import VirtualizedList from '../../components/VirtualizedList.jsx';

function chunkCards(items, size = 2) {
  const rows = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

/** Tarjetas por familia/registro Bautizos (colapsable). */
export default function TransportBautizosCarCardsSection({
  groups,
  isOpen,
  onOpenChange,
  renderGroupCard,
}) {
  if (!groups?.length) return null;
  const cardRows = chunkCards(groups, 2);
  return (
    <TransportLazySection
      open={isOpen === true}
      onOpenChange={onOpenChange}
      debugSection="bautizosCarCards"
      shellClassName="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm"
      headerClassName="w-full cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
      header={
        <span className="flex items-center gap-2">
          <Car size={14} className="text-indigo-500 shrink-0" />
          Personas por carro — una tarjeta por registro o familia (árboles familiares)
          <span className="font-bold normal-case tracking-normal text-slate-400">
            ({groups.length} grupo{groups.length !== 1 ? 's' : ''})
          </span>
        </span>
      }
    >
      <div className="p-3 space-y-3">
        <VirtualizedList
          items={cardRows}
          itemHeight={252}
          overscan={6}
          useParentScroll
          renderItem={(rowGroups, index) => (
            <div
              key={`car-card-row-${index}`}
              className="grid grid-cols-1 lg:grid-cols-2 gap-3"
            >
              {rowGroups.map((grp) => (
                <React.Fragment key={`grp-${grp.groupId}`}>{renderGroupCard(grp)}</React.Fragment>
              ))}
            </div>
          )}
        />
      </div>
    </TransportLazySection>
  );
}
