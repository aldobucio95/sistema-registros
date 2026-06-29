import React, { useEffect, useMemo, useState } from 'react';
import { Church, Filter } from 'lucide-react';
import {
  BAPTISM_SHIRT_SIZES,
  normalizeBaptismShirtSize,
  participantHasBaptismChip,
  getBautizosCompanionsArray,
  isBautizosCompanionBaptized,
} from '../../../bautizosParty.js';
import { buildLocationScopeSet, participantInLocationScope } from '../../../rbac/permissions.js';
import {
  uiButtons, uiForm, uiShell,
  uiPageHeader, uiPageHeaderIcon,
  uiTable, uiEmptyState, uiDropdown, uiToolbar,
  uiKbd, uiFilter, uiRosterMobile, uiListMobile,
  uiMobileMenu,
} from '../../../ui/uiFormatClasses.js';
import MobileMenuSection from '../../../components/mobile/MobileMenuSection.jsx';
import MobileFilterPanelBody from '../../../components/mobile/MobileFilterPanelBody.jsx';
import ListMobileCard from '../../../components/ListMobileCard.jsx';

function ageDisplayForPerson(p, calculateAgeFromBirthDate) {
  const fromBirth = p?.birthDate && String(p.birthDate).trim() ? calculateAgeFromBirthDate(p.birthDate) : '';
  if (fromBirth) return `${fromBirth} años`;
  if (p?.age != null && String(p.age).trim() !== '') return `${String(p.age).trim()} años`;
  return '—';
}

/**
 * Lista de bautizados (chip de bautizo) con talla de playera; filtros anidados estilo Registro global.
 */
export default function BautizadosPage({
  currentEvent,
  allParticipants,
  visibleLocations = [],
  participantIsActiveInEvent,
  participantIsActiveInRoster,
  getBaptismAccountingSegment,
  applyGlobalRegistryLikeFilters,
  globalLocationFilters,
  renderGlobalRegistryListToolbar,
  calculateAgeFromBirthDate,
  canEditShirtSizes,
  onSaveBaptismShirtSize,
  renderParticipantAssistanceBadges,
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterSede, setFilterSede] = useState('all');
  const [filterGender, setFilterGender] = useState('all');
  const [filterShirt, setFilterShirt] = useState('all');
  const [segmentScope, setSegmentScope] = useState('all');

  const eventId = currentEvent?.id;
  const eventType = currentEvent?.eventType;
  const isCampa = eventType === 'Campa';
  const locationScopeSet = useMemo(() => buildLocationScopeSet(visibleLocations), [visibleLocations]);

  const baseRows = useMemo(() => {
    if (!eventId) return [];
    const out = [];
    for (const p of allParticipants || []) {
      if (String(p.eventId) !== String(eventId) || !participantIsActiveInEvent(p)) continue;
      if (!participantIsActiveInRoster(p)) continue;
      if (!participantInLocationScope(p, locationScopeSet)) continue;
      if (!participantHasBaptismChip(p, eventType)) continue;
      out.push(p);
    }
    if (eventType === 'Bautizos') {
      for (const p of allParticipants || []) {
        if (String(p.eventId) !== String(eventId) || !participantIsActiveInEvent(p)) continue;
        if (!participantIsActiveInRoster(p)) continue;
        if (!participantInLocationScope(p, locationScopeSet)) continue;
        const comps = getBautizosCompanionsArray(p);
        for (let i = 0; i < comps.length; i++) {
          const c = comps[i] || {};
          const nm = String(c?.name || '').trim();
          if (!nm || !isBautizosCompanionBaptized(c)) continue;
          out.push({
            id: `virt-bautizado:${String(p.id)}:${String(c?.id || i)}`,
            eventId,
            name: nm,
            location: p.location || '',
            gender: '',
            age: '',
            baptismShirtSize: c?.baptismShirtSize || '',
            __isVirtualCompanionBaptized: true,
            __sourceRegistrantName: String(p?.name || '').trim(),
          });
        }
      }
    }
    return out;
  }, [allParticipants, eventId, eventType, participantIsActiveInEvent, participantIsActiveInRoster, locationScopeSet]);

  const afterGlobalFilters = useMemo(() => {
    let rows = applyGlobalRegistryLikeFilters(baseRows);
    if (globalLocationFilters.length > 0) {
      rows = rows.filter((p) => globalLocationFilters.includes(p.location));
    }
    return rows;
  }, [applyGlobalRegistryLikeFilters, baseRows, globalLocationFilters]);

  const sedes = useMemo(() => {
    const s = new Set();
    for (const p of baseRows) {
      const loc = String(p.location || '').trim();
      if (loc) s.add(loc);
    }
    const locList =
      Array.isArray(visibleLocations) && visibleLocations.length > 0
        ? visibleLocations
        : currentEvent?.locations || [];
    for (const loc of locList) {
      const norm = String(loc || '').trim();
      if (norm) s.add(norm);
    }
    return [...s].sort((a, b) => a.localeCompare(b, 'es'));
  }, [baseRows, currentEvent?.locations, visibleLocations]);

  const genders = useMemo(() => {
    const s = new Set();
    for (const p of baseRows) {
      const g = String(p.gender || '').trim();
      if (g) s.add(g);
    }
    return [...s].sort((a, b) => a.localeCompare(b, 'es'));
  }, [baseRows]);

  const filtered = useMemo(() => {
    return afterGlobalFilters.filter((p) => {
      if (filterSede !== 'all' && String(p.location || '').trim() !== filterSede) return false;
      if (filterGender !== 'all' && String(p.gender || '').trim() !== filterGender) return false;
      const shirt = normalizeBaptismShirtSize(p.baptismShirtSize);
      if (filterShirt === 'pending') return !shirt;
      if (filterShirt !== 'all' && shirt !== filterShirt) return false;
      if (isCampa && segmentScope !== 'all') {
        const seg = typeof getBaptismAccountingSegment === 'function' ? getBaptismAccountingSegment(p) : null;
        if (segmentScope === 'teens' && seg !== 'Teens') return false;
        if (segmentScope === 'jovenes' && seg !== 'Jóvenes') return false;
      }
      return true;
    });
  }, [afterGlobalFilters, filterSede, filterGender, filterShirt, getBaptismAccountingSegment, isCampa, segmentScope]);

  const countWith = (fn) => afterGlobalFilters.filter(fn).length;

  const segmentSummary = useMemo(() => {
    if (!isCampa) return { teens: 0, jovenes: 0, noDefinido: 0, total: 0, chartBg: '#e2e8f0' };
    let teens = 0;
    let jovenes = 0;
    let noDefinido = 0;
    for (const p of filtered) {
      const seg = typeof getBaptismAccountingSegment === 'function' ? getBaptismAccountingSegment(p) : null;
      if (seg === 'Teens') teens += 1;
      else if (seg === 'Jóvenes') jovenes += 1;
      else noDefinido += 1;
    }
    const total = teens + jovenes + noDefinido;
    if (!total) return { teens, jovenes, noDefinido, total, chartBg: '#e2e8f0' };
    const teenPct = (teens / total) * 100;
    const jovenPct = (jovenes / total) * 100;
    const chartBg = `conic-gradient(#0ea5e9 0% ${teenPct}%, #7c3aed ${teenPct}% ${teenPct + jovenPct}%, #94a3b8 ${teenPct + jovenPct}% 100%)`;
    return { teens, jovenes, noDefinido, total, chartBg };
  }, [filtered, getBaptismAccountingSegment, isCampa]);

  const activeFilterCount =
    (filterSede !== 'all' ? 1 : 0) + (filterGender !== 'all' ? 1 : 0) + (filterShirt !== 'all' ? 1 : 0);

  const clearFilters = () => {
    setFilterSede('all');
    setFilterGender('all');
    setFilterShirt('all');
  };

  useEffect(() => {
    if (!filtersOpen) return;
    const onPointerDown = (ev) => {
      const t = ev.target;
      if (!(t instanceof Element)) return;
      if (!t.closest('[data-dropdown-root="bautizados-filters"]')) setFiltersOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [filtersOpen]);

  const bautizadosFiltersMenuContent = (
    <>
      <button
        type="button"
        onClick={clearFilters}
        className={`w-full ${uiButtons.secondary}`}
      >
        Limpiar filtros bautizados
      </button>
      <div>
        <p className={`${uiDropdown.sectionTitle} mb-1`}>Sede</p>
        <div className="space-y-1">
          <label className={uiFilter.optionRow}>
            <input type="radio" className={uiFilter.circleControl} checked={filterSede === 'all'} onChange={() => setFilterSede('all')} />
            Todas <span className="text-slate-400 font-bold tabular-nums">({afterGlobalFilters.length})</span>
          </label>
          {sedes.map((loc) => (
            <label key={loc} className={uiFilter.optionRow}>
              <input type="radio" className={uiFilter.circleControl} checked={filterSede === loc} onChange={() => setFilterSede(loc)} />
              {loc}{' '}
              <span className="text-slate-400 font-bold tabular-nums">
                ({countWith((p) => String(p.location || '').trim() === loc)})
              </span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <p className={`${uiDropdown.sectionTitle} mb-1`}>Género</p>
        <div className="space-y-1">
          <label className={uiFilter.optionRow}>
            <input type="radio" className={uiFilter.circleControl} checked={filterGender === 'all'} onChange={() => setFilterGender('all')} />
            Todos
          </label>
          {genders.map((g) => (
            <label key={g} className={uiFilter.optionRow}>
              <input type="radio" className={uiFilter.circleControl} checked={filterGender === g} onChange={() => setFilterGender(g)} />
              {g}{' '}
              <span className="text-slate-400 font-bold tabular-nums">
                ({countWith((p) => String(p.gender || '').trim() === g)})
              </span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <p className={`${uiDropdown.sectionTitle} mb-1`}>Talla playera</p>
        <div className="space-y-1">
          <label className={uiFilter.optionRow}>
            <input type="radio" className={uiFilter.circleControl} checked={filterShirt === 'all'} onChange={() => setFilterShirt('all')} />
            Todas
          </label>
          <label className={uiFilter.optionRow}>
            <input type="radio" className={uiFilter.circleControl} checked={filterShirt === 'pending'} onChange={() => setFilterShirt('pending')} />
            Sin talla{' '}
            <span className="text-slate-400 font-bold tabular-nums">
              ({countWith((p) => !normalizeBaptismShirtSize(p.baptismShirtSize))})
            </span>
          </label>
          {BAPTISM_SHIRT_SIZES.map((sz) => (
            <label key={sz} className={uiFilter.optionRow}>
              <input type="radio" className={uiFilter.circleControl} checked={filterShirt === sz} onChange={() => setFilterShirt(sz)} />
              {sz}{' '}
              <span className="text-slate-400 font-bold tabular-nums">
                ({countWith((p) => normalizeBaptismShirtSize(p.baptismShirtSize) === sz)})
              </span>
            </label>
          ))}
        </div>
      </div>
      {isCampa ? (
        <div>
          <p className={`${uiDropdown.sectionTitle} mb-1`}>Segmento Campa</p>
          <div className={`${uiMobileMenu.sectionGrid2} gap-1`}>
            {[
              { id: 'all', label: 'Todos', cls: 'bg-indigo-600 text-white' },
              { id: 'teens', label: 'Teens', cls: 'bg-sky-600 text-white' },
              { id: 'jovenes', label: 'Jóvenes', cls: 'bg-violet-600 text-white' },
            ].map((op) => (
              <button
                key={op.id}
                type="button"
                onClick={() => setSegmentScope(op.id)}
                className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide transition-colors ${uiMobileMenu.btnCompact} ${
                  segmentScope === op.id ? op.cls : 'border border-slate-200 text-slate-600 dark:border-slate-600 dark:text-slate-300'
                }`}
              >
                {op.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );

  if (!currentEvent) return null;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto max-md:space-y-3">
      <div className={`${uiShell.card} p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2.5`}>
        <div className="flex items-start gap-2.5 min-w-0">
          <div className={`${uiPageHeaderIcon('sky')} !p-2`}>
            <Church size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Bautizados</h2>
            <p className={`${uiPageHeader.subtitle} mt-0.5 max-w-2xl max-md:hidden text-[11px]`}>
              Personas con bautizo marcado (Campa: opción bautizo; Bautizos: asistencia como bautizado). Mismos filtros de
              búsqueda y sede que Registro global; aquí puede filtrar por sede, género y talla de playera.
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[9px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-wider">Listado</p>
          <p className="text-xl font-black text-sky-700 dark:text-sky-400">{filtered.length}</p>
        </div>
      </div>

      {renderGlobalRegistryListToolbar(
        baseRows,
        'Búsqueda y filtros globales (misma barra que Registro global). Los filtros de sede/género/talla de esta página se combinan con ellos.',
        {
          extraMobilePanelSections: (
            <MobileMenuSection label="Filtros bautizados" tone="sky">
              <MobileFilterPanelBody>{bautizadosFiltersMenuContent}</MobileFilterPanelBody>
            </MobileMenuSection>
          ),
        }
      )}

      <div className={`${uiShell.card} p-4 max-md:hidden`}>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative inline-block" data-dropdown-root="bautizados-filters">
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className={uiDropdown.trigger}
            >
              <Filter size={14} className="text-slate-500" />
              Filtros (bautizados)
              {activeFilterCount > 0 && (
                <span className={uiToolbar.countBadge}>
                  {activeFilterCount > 9 ? '9+' : activeFilterCount}
                </span>
              )}
            </button>
            {filtersOpen && (
              <div className={`${uiDropdown.menu} ${uiFilter.dropdownScope}`}>
                {bautizadosFiltersMenuContent}
              </div>
            )}
          </div>
          {isCampa ? (
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 p-1">
              <button
                type="button"
                onClick={() => setSegmentScope('all')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide transition-colors ${
                  segmentScope === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setSegmentScope('teens')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide transition-colors ${
                  segmentScope === 'teens'
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                Teens
              </button>
              <button
                type="button"
                onClick={() => setSegmentScope('jovenes')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide transition-colors ${
                  segmentScope === 'jovenes'
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                Jóvenes
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {isCampa && (
        <div className={`${uiShell.card} p-4 md:p-5 max-md:p-3`}>
          <div className="flex flex-col lg:flex-row lg:items-center gap-5">
            <div className="flex items-center gap-4">
              <div
                className="w-24 h-24 rounded-full border border-slate-200 dark:border-slate-600 shadow-inner shrink-0"
                style={{ background: segmentSummary.chartBg }}
                title="Distribución bautizados Campa por segmento"
              />
              <div>
                <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Campa · Bautizados por segmento
                </p>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  Total visible: {segmentSummary.total}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1">
              <div className="rounded-xl border border-sky-200 dark:border-sky-500/45 bg-sky-50 dark:bg-sky-950/25 px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-wide text-sky-700 dark:text-sky-200">Teens</p>
                <p className="text-xl font-black text-sky-700 dark:text-sky-300">{segmentSummary.teens}</p>
              </div>
              <div className="rounded-xl border border-violet-200 dark:border-violet-500/45 bg-violet-50 dark:bg-violet-950/25 px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-wide text-violet-700 dark:text-violet-200">Jóvenes</p>
                <p className="text-xl font-black text-violet-700 dark:text-violet-300">{segmentSummary.jovenes}</p>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/70 px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-600 dark:text-slate-300">Sin segmento</p>
                <p className="text-xl font-black text-slate-700 dark:text-slate-200">{segmentSummary.noDefinido}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`${uiShell.card} overflow-hidden max-md:border-0 max-md:shadow-none max-md:bg-transparent`}>
        {!filtered.length ? (
          <div className={uiEmptyState.wrap}>
            <Church size={28} className={uiEmptyState.icon} />
            <p className={uiEmptyState.title}>No hay bautizados</p>
            <p className={uiEmptyState.help}>Ajusta los filtros para ver coincidencias.</p>
          </div>
        ) : (
          <>
          <div className={uiListMobile.shellSky}>
            {filtered.map((p, i) => {
              const cur = normalizeBaptismShirtSize(p.baptismShirtSize);
              const isVirtualCompanion = !!p.__isVirtualCompanionBaptized;
              const seg =
                isCampa && typeof getBaptismAccountingSegment === 'function'
                  ? getBaptismAccountingSegment(p)
                  : null;
              const segLabel = seg === 'Teens' ? 'Teens' : seg === 'Jóvenes' ? 'Jóvenes' : isCampa ? 'Sin definir' : null;
              const metaRows = [
                { key: 'sede', label: 'Sede', value: String(p.location || '').trim() || '—' },
                ...(segLabel ? [{ key: 'seg', label: 'Segmento', value: segLabel }] : []),
                { key: 'edad', label: 'Edad', value: ageDisplayForPerson(p, calculateAgeFromBirthDate) },
                { key: 'gen', label: 'Género', value: String(p.gender || '').trim() || '—' },
                {
                  key: 'talla',
                  label: 'Talla playera',
                  span: 2,
                  value: (
                    <select
                      disabled={!canEditShirtSizes || isVirtualCompanion}
                      value={cur || ''}
                      onChange={(e) => void onSaveBaptismShirtSize(p.id, e.target.value)}
                      className={`w-full min-h-[26px] !py-0.5 !px-1.5 !text-[9px] ${uiForm.inputCompact} disabled:opacity-60`}
                    >
                      <option value="">Sin talla</option>
                      {BAPTISM_SHIRT_SIZES.map((sz) => (
                        <option key={sz} value={sz}>
                          {sz}
                        </option>
                      ))}
                    </select>
                  ),
                },
              ];
              if (isVirtualCompanion) {
                metaRows.unshift({
                  key: 'virt',
                  label: 'Tipo',
                  value: 'Acompañante bautizado',
                });
              }
              return (
                <ListMobileCard
                  key={p.id}
                  variant="compact"
                  tone="sky"
                  titleLabel=""
                  title={`${i + 1}. ${p.name || '—'}`}
                  metaRows={metaRows}
                />
              );
            })}
          </div>
          <div className={`${uiTable.wrap} hidden md:block`}>
            <table className={uiTable.table}>
              <thead className={uiTable.thead}>
                <tr>
                  <th className={uiTable.th}>#</th>
                  <th className={uiTable.th}>Nombre</th>
                  <th className={uiTable.th}>Sede</th>
                  {isCampa ? <th className={uiTable.th}>Segmento</th> : null}
                  <th className={uiTable.th}>Edad</th>
                  <th className={uiTable.th}>Género</th>
                  <th className={uiTable.th}>Talla playera</th>
                </tr>
              </thead>
              <tbody className={uiTable.tbody}>
                {filtered.map((p, i) => {
                  const cur = normalizeBaptismShirtSize(p.baptismShirtSize);
                  const isVirtualCompanion = !!p.__isVirtualCompanionBaptized;
                  return (
                    <tr key={p.id} className={uiTable.tr}>
                      <td className={uiTable.td}>
                        <span className={`${uiKbd.base} min-w-[1.6rem] justify-center`} title="Número en esta lista">
                          {i + 1}
                        </span>
                      </td>
                      <td className={`${uiTable.td} align-top font-bold text-slate-800 dark:text-slate-100`}>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span>{p.name || '—'}</span>
                          {isVirtualCompanion ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-200 dark:bg-sky-900/40 dark:text-sky-100 dark:border-sky-600">
                              Acompañante bautizado
                            </span>
                          ) : null}
                        </div>
                        {typeof renderParticipantAssistanceBadges === 'function' ? (
                          <div className="flex flex-wrap gap-1 mt-1.5 font-normal">
                            {renderParticipantAssistanceBadges(p)}
                          </div>
                        ) : null}
                      </td>
                      <td className={uiTable.td}>{String(p.location || '').trim() || '—'}</td>
                      {isCampa ? (
                        <td className={uiTable.td}>
                          {(() => {
                            const seg = typeof getBaptismAccountingSegment === 'function' ? getBaptismAccountingSegment(p) : null;
                            if (seg === 'Teens') return 'Teens';
                            if (seg === 'Jóvenes') return 'Jóvenes';
                            return 'Sin definir';
                          })()}
                        </td>
                      ) : null}
                      <td className={uiTable.td}>{ageDisplayForPerson(p, calculateAgeFromBirthDate)}</td>
                      <td className={uiTable.td}>{String(p.gender || '').trim() || '—'}</td>
                      <td className={uiTable.td}>
                        <select
                          disabled={!canEditShirtSizes || isVirtualCompanion}
                          value={cur || ''}
                          onChange={(e) => void onSaveBaptismShirtSize(p.id, e.target.value)}
                          className={`min-w-[5.5rem] ${uiForm.inputCompact} disabled:opacity-60`}
                        >
                          <option value="">Sin talla</option>
                          {BAPTISM_SHIRT_SIZES.map((sz) => (
                            <option key={sz} value={sz}>
                              {sz}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
