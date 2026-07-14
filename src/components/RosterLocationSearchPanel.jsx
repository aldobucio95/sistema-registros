import React, { useEffect, useRef, useState } from 'react';
import { Clock, Search, X } from 'lucide-react';
import { uiRosterSearch } from '../ui/uiFormatClasses.js';
import { rosterSearchFieldId } from '../ui/rosterFilterField.js';

/** Retraso antes de aplicar búsqueda al roster (evita re-render masivo por tecla). */
export const ROSTER_SEARCH_DEBOUNCE_MS = 200;

/** Barra de búsqueda destacada en registro por sede o registro global. */
function RosterLocationSearchPanel({
  loc,
  /** Término ya aplicado a filtros (desde el padre). El input usa estado local hasta el debounce. */
  searchTerm: appliedSearchTerm = '',
  debouncedSearchTerm: appliedSearchTermLegacy,
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
  const applied = appliedSearchTermLegacy ?? appliedSearchTerm;
  const inputId = inputIdOverride ?? rosterSearchFieldId(loc);
  const labelId = `${inputId}-label`;
  const [draft, setDraft] = useState(applied);
  const debounceRef = useRef(null);
  const appliedRef = useRef(applied);

  useEffect(() => {
    appliedRef.current = applied;
    setDraft(applied);
  }, [applied]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  const scheduleAppliedSearch = (nextDraft) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null;
      if (nextDraft !== appliedRef.current) onSearchChange(nextDraft);
    }, ROSTER_SEARCH_DEBOUNCE_MS);
  };

  const active = rosterSearchActive ?? !!String(draft || '').trim();
  const filteringPending = draft !== applied;
  const hintText = statsLine ? '' : active ? hintWhenActive || '' : hintWhenIdle;

  const handleChange = (e) => {
    const next = e.target.value;
    setDraft(next);
    scheduleAppliedSearch(next);
  };

  const handleClear = () => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setDraft('');
    onSearchChange('');
    onClear?.();
  };

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
          value={draft}
          onChange={handleChange}
        />
        {draft.trim() ? (
          <button type="button" className={uiRosterSearch.clearBtn} aria-label="Borrar búsqueda" onClick={handleClear}>
            <X size={16} aria-hidden />
          </button>
        ) : null}
      </div>
      {statsLine ? <div className={uiRosterSearch.statsBlock}>{statsLine}</div> : null}
      {hintText ? <p className={uiRosterSearch.hint}>{hintText}</p> : null}
      {filteringPending ? (
        <p className={uiRosterSearch.filteringPill} aria-live="polite">
          <Clock size={12} className="shrink-0" aria-hidden />
          Filtrando…
        </p>
      ) : null}
    </div>
  );
}

export default React.memo(RosterLocationSearchPanel);
