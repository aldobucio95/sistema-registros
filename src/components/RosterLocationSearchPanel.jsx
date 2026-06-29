import React from 'react';
import { Clock, Search, X } from 'lucide-react';
import { uiRosterSearch } from '../ui/uiFormatClasses.js';
import { rosterSearchFieldId } from '../ui/rosterFilterField.js';

/** Barra de búsqueda destacada en registro por sede o registro global. */
export default function RosterLocationSearchPanel({
  loc,
  searchTerm,
  debouncedSearchTerm,
  rosterSearchActive,
  onSearchChange,
  onClear,
  inputId: inputIdOverride,
  labelText = 'Buscar en esta sede',
  labelBadge = 'Activos · Espera · Cancelados',
  placeholder = 'Nombre, teléfono, ID VNPM o comentarios…',
  hintWhenIdle = '',
  hintWhenActive,
  statsLine = null,
}) {
  const inputId = inputIdOverride ?? rosterSearchFieldId(loc);
  const labelId = `${inputId}-label`;
  const active = rosterSearchActive ?? !!String(searchTerm || '').trim();
  const debounced = debouncedSearchTerm ?? searchTerm;
  const hintText = statsLine ? '' : active ? hintWhenActive || '' : hintWhenIdle;

  return (
    <div
      className={`${uiRosterSearch.panel}${active ? ` ${uiRosterSearch.panelActive}` : ''}`}
      role="search"
    >
      <div id={labelId} className={uiRosterSearch.labelRow}>
        <Search className={uiRosterSearch.labelIcon} size={16} aria-hidden />
        <span className={uiRosterSearch.labelText}>{labelText}</span>
        {labelBadge ? <span className={uiRosterSearch.labelBadge}>{labelBadge}</span> : null}
      </div>
      <div className={uiRosterSearch.inputWrap}>
        <input
          id={inputId}
          name="rosterSearch"
          type="text"
          role="searchbox"
          enterKeyHint="search"
          autoComplete="off"
          aria-labelledby={labelId}
          placeholder={placeholder}
          className={uiRosterSearch.input}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchTerm.trim() ? (
          <button type="button" className={uiRosterSearch.clearBtn} aria-label="Borrar búsqueda" onClick={onClear}>
            <X size={16} aria-hidden />
          </button>
        ) : null}
      </div>
      {statsLine ? <div className={uiRosterSearch.statsBlock}>{statsLine}</div> : null}
      {hintText ? <p className={uiRosterSearch.hint}>{hintText}</p> : null}
      {searchTerm !== debounced ? (
        <p className={uiRosterSearch.filteringPill} aria-live="polite">
          <Clock size={12} className="shrink-0" aria-hidden />
          Filtrando…
        </p>
      ) : null}
    </div>
  );
}
