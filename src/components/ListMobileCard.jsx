import React from 'react';
import { uiListMobile, uiListRow } from '../ui/uiFormatClasses.js';

const TONE_ITEM = {
  sky: uiListMobile.itemSky,
  amber: uiListMobile.itemAmber,
  violet: uiListMobile.itemViolet,
  indigo: uiListMobile.itemIndigo,
  orange: uiListMobile.itemOrange,
  purple: uiListMobile.itemPurple,
};

const TONE_ACCENT = {
  sky: uiListMobile.toneSky,
  amber: uiListMobile.toneAmber,
  violet: uiListMobile.toneViolet,
  indigo: uiListMobile.toneIndigo,
  orange: uiListMobile.toneOrange,
  purple: uiListMobile.tonePurple,
};

/**
 * Tarjeta genérica para listados simples en móvil (<md).
 * variant="compact": densidad máxima, meta en grid 2 col (Bautizados, Servidores, Acompañantes).
 */
export default function ListMobileCard({
  title,
  titleLabel = 'Nombre',
  metaRows = [],
  actions = null,
  expandedContent = null,
  isExpanded = false,
  onToggle,
  className = '',
  variant = 'default',
  tone = null,
}) {
  const compact = variant === 'compact';
  const interactive = typeof onToggle === 'function';
  const toneItemClass = compact && tone ? TONE_ITEM[tone] || '' : '';
  const toneAccentClass = !compact && tone ? TONE_ACCENT[tone] || '' : '';
  return (
    <div
      className={`${toneItemClass} px-2 ${compact ? 'py-1' : 'py-2.5'} ${
        compact ? '' : 'border-b border-slate-100 dark:border-slate-800'
      } ${toneAccentClass} hover:bg-white/60 dark:hover:bg-slate-800/30 transition-colors ${className}`}
    >
      <div
        className={interactive ? 'cursor-pointer' : ''}
        onClick={interactive ? onToggle : undefined}
        onKeyDown={
          interactive
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onToggle();
                }
              }
            : undefined
        }
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
      >
        {titleLabel && !compact ? (
          <p
            className={`${compact ? 'text-[7px]' : 'text-[10px]'} font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 ${
              compact ? 'mb-0' : 'mb-1'
            }`}
          >
            {titleLabel}
          </p>
        ) : null}
        <div
          className={`font-black text-slate-800 dark:text-slate-100 break-words ${
            compact ? 'text-[11px] leading-tight' : 'text-sm'
          }`}
        >
          {title}
        </div>
        {metaRows.length > 0 ? (
          <div
            className={
              compact
                ? 'mt-0.5 grid grid-cols-2 gap-x-1.5 gap-y-0'
                : 'mt-2 space-y-1.5'
            }
          >
            {metaRows.map((row) => (
              <div
                key={row.key || row.label}
                className={row.span === 2 || row.fullWidth ? 'col-span-2' : undefined}
              >
                <p className={`${compact ? 'text-[6px]' : 'text-[10px]'} font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 leading-none`}>
                  {row.label}
                </p>
                <div
                  className={`font-semibold text-slate-600 dark:text-slate-300 break-words ${
                    compact ? 'text-[8px] leading-tight mt-0' : 'text-[11px] mt-0.5'
                  }`}
                >
                  {row.value}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      {actions ? (
        <div
          className={`${uiListRow.actions} ${
            compact ? 'mt-0.5 pt-0.5' : 'mt-2 pt-2'
          } border-t border-slate-100 dark:border-slate-800 flex-wrap`}
        >
          {actions}
        </div>
      ) : null}
      {isExpanded && expandedContent ? (
        <div
          className={`${compact ? 'mt-0.5 pt-0.5' : 'mt-2 pt-2'} border-t border-slate-100 dark:border-slate-800`}
        >
          {expandedContent}
        </div>
      ) : null}
    </div>
  );
}
