import React, { useMemo } from 'react';
import { FileSpreadsheet, XCircle } from 'lucide-react';
import { uiOverlay } from '../ui/uiFormatClasses.js';

function buildSectionRows(eventType) {
  const bautizos = eventType === 'Bautizos';
  const campa = eventType === 'Campa';
  const rows = [
    { key: 'dashboard', label: 'Dashboard' },
    {
      key: 'registroGlobal',
      label: 'Registro global',
      hint: 'Todas las sedes a las que tienes acceso; no depende de la selección de sedes.',
    },
    {
      key: 'locations',
      label: 'Registro por sede (una hoja por sede)',
      hint: 'Solo las sedes marcadas arriba.',
    },
  ];
  if (bautizos || campa) {
    rows.push({ key: 'bautizados', label: 'Bautizados' });
  }
  if (bautizos) {
    rows.push({ key: 'becados', label: 'Acompañantes' });
    rows.push({ key: 'asistentes', label: 'Asistentes' });
    rows.push({ key: 'serversPage', label: 'Servidores y empleados' });
  } else if (campa) {
    rows.push({ key: 'becados', label: 'Becados' });
    rows.push({ key: 'serversPage', label: 'Servidores' });
    rows.push({ key: 'responsivas', label: 'Responsivas' });
  }
  rows.push(
    { key: 'transporte', label: 'Transporte' },
    { key: 'cashCut', label: 'Corte de caja' },
    { key: 'comisionTarjeta', label: 'Comisión tarjeta', requiresFinancial: true },
    { key: 'expenseList', label: 'Lista de gastos' }
  );
  return rows;
}

export default function ExcelExportScopeModal({
  isOpen,
  eventName,
  eventType,
  allLocations,
  selectedLocations,
  onSelectedLocationsChange,
  sectionAvailability,
  selectedSections,
  onSelectedSectionsChange,
  isExporting,
  onCancel,
  onConfirm,
  onValidationError,
  btnPrimary,
  btnSecondary,
}) {
  const sectionRows = useMemo(() => buildSectionRows(eventType), [eventType]);

  const visibleSections = useMemo(
    () => sectionRows.filter((row) => !row.requiresFinancial || sectionAvailability?.comisionTarjeta),
    [sectionRows, sectionAvailability?.comisionTarjeta]
  );

  if (!isOpen) return null;

  const allLocsSelected =
    allLocations.length > 0 && selectedLocations.length === allLocations.length;
  const toggleAllLocations = () => {
    onSelectedLocationsChange(allLocsSelected ? [] : [...allLocations]);
  };

  const allSectionsOn = visibleSections.every((row) => {
    const avail = sectionAvailability?.[row.key];
    return !avail || selectedSections[row.key];
  });
  const toggleAllSections = () => {
    const next = { ...selectedSections };
    for (const row of visibleSections) {
      if (!sectionAvailability?.[row.key]) continue;
      next[row.key] = !allSectionsOn;
    }
    onSelectedSectionsChange(next);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const locs = selectedLocations.map((l) => String(l).trim()).filter(Boolean);
    if (locs.length === 0) {
      onValidationError?.('Selecciona al menos una sede.');
      return;
    }
    const sections = {};
    let anySection = false;
    for (const row of visibleSections) {
      if (!sectionAvailability?.[row.key]) continue;
      sections[row.key] = !!selectedSections[row.key];
      if (sections[row.key]) anySection = true;
    }
    if (!anySection) {
      onValidationError?.('Selecciona al menos una sección.');
      return;
    }
    onConfirm({ locations: locs, sections });
  };

  return (
    <div className={uiOverlay.modalLight} role="dialog" aria-modal="true" aria-labelledby="excel-export-title">
      <form
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[min(90vh,720px)] flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700"
        onSubmit={handleSubmit}
      >
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3 shrink-0">
          <div>
            <h3 id="excel-export-title" className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <FileSpreadsheet size={20} className="text-emerald-600 shrink-0" />
              Exportar Excel
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
              {eventName ? `Evento: ${eventName}` : 'Elige sedes y secciones a incluir en el archivo.'}
            </p>
          </div>
          <button type="button" onClick={onCancel} className="text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-full shrink-0" aria-label="Cerrar">
            <XCircle size={20} />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto space-y-5 flex-1 min-h-0">
          <section>
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Sedes</p>
              <button type="button" className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline" onClick={toggleAllLocations}>
                {allLocsSelected ? 'Quitar todas' : 'Seleccionar todas'}
              </button>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-2 leading-snug">
              Aplica a «Registro por sede» y a las demás secciones operativas. «Registro global» siempre exporta todas las sedes a las que tienes acceso.
            </p>
            {allLocations.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Este evento no tiene sedes configuradas.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {allLocations.map((loc) => {
                  const checked = selectedLocations.includes(loc);
                  return (
                    <label
                      key={loc}
                      className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/80"
                    >
                      <input
                        type="checkbox"
                        className="rounded border-slate-300"
                        checked={checked}
                        onChange={() => {
                          if (checked) onSelectedLocationsChange(selectedLocations.filter((x) => x !== loc));
                          else onSelectedLocationsChange([...selectedLocations, loc]);
                        }}
                      />
                      <span className="truncate">{loc}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Secciones</p>
              <button type="button" className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline" onClick={toggleAllSections}>
                {allSectionsOn ? 'Quitar todas' : 'Seleccionar todas'}
              </button>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-2 leading-snug">
              El orden de las hojas en el archivo sigue la lista (Dashboard, Registro global, sedes, etc.).
            </p>
            <div className="space-y-1.5">
              {visibleSections.map((row) => {
                const avail = !!sectionAvailability?.[row.key];
                if (!avail) return null;
                return (
                  <label
                    key={row.key}
                    className="flex items-start gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/80"
                  >
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 mt-0.5 shrink-0"
                      checked={!!selectedSections[row.key]}
                      onChange={() =>
                        onSelectedSectionsChange({
                          ...selectedSections,
                          [row.key]: !selectedSections[row.key],
                        })
                      }
                    />
                    <span className="min-w-0">
                      <span className="block">{row.label}</span>
                      {row.hint ? (
                        <span className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                          {row.hint}
                        </span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </div>
          </section>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex gap-3 shrink-0">
          <button type="button" onClick={onCancel} className={btnSecondary} disabled={isExporting}>
            Cancelar
          </button>
          <button type="submit" className={`${btnPrimary} flex-1`} disabled={isExporting || allLocations.length === 0}>
            {isExporting ? 'Generando…' : 'Descargar Excel'}
          </button>
        </div>
      </form>
    </div>
  );
}
