import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Trash2, X } from 'lucide-react';
import CarVehicleMetaPanel from '../../components/transport/CarVehicleMetaPanel.jsx';
import { createCarCatalogView } from '../../data/carBrandModelsCatalog.js';
import {
  assignPersonToCarUnit,
  countAssignedToUnit,
  getCarLinesForUnit,
  getCarUnits,
  getDefaultCarCapacity,
  getUnitsForSede,
  normalizeTransportPlanning,
  passengersForBusGroup,
} from '../../transportPlanningCore.js';
import {
  blankCarUnitDoc,
  buildCarUnitSummaryEntry,
  deleteCarUnitDoc,
  fetchCarUnitDoc,
  patchCarUnitDoc,
  saveCarUnitPatch,
} from '../v3/index.js';
import { CAR_META_SAVE_DEBOUNCE_MS, clampInt } from '../transportConstants.js';
import {
  uiButtons,
  uiForm,
  uiListRow,
  uiModal,
} from '../../ui/uiFormatClasses.js';
import VirtualizedScrollList from '../../components/roster/VirtualizedScrollList.jsx';

const drawerOverlay =
  'fixed inset-0 z-[200] flex items-stretch justify-end p-0 sm:p-0';
const drawerPanel =
  'relative w-full max-w-lg h-full max-h-[100dvh] flex flex-col bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-600 overflow-hidden';

/**
 * Panel lateral (uiModal) para editar unidad de carro o camión.
 * Lazy getDoc solo al abrir carro. Nunca setPlan dentro de updaters ajenos.
 */
export default function TransportUnitEditorDrawer({
  open = false,
  onClose,
  kind = 'car', // 'car' | 'bus'
  eventId,
  plan,
  setPlan,
  unitId = '',
  groupKey = '',
  carLines = [],
  busLines = [],
  section = null,
  canEdit = false,
  canEditTransportOps = false,
  customCarCatalog,
  assignBus,
  updateUnit,
  removeUnit,
  renderTransportAttendanceCheckbox,
  sortPassengersForDisplay,
  initialDriverSourceKey = '',
}) {
  const carCatalogView = useMemo(() => createCarCatalogView(customCarCatalog), [customCarCatalog]);
  const defaultCap = getDefaultCarCapacity(plan);
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [poolQuery, setPoolQuery] = useState('');
  const saveTimerRef = useRef(null);

  const lineBySk = useMemo(() => {
    const m = new Map();
    for (const line of [...(carLines || []), ...(busLines || [])]) {
      const sk = String(line?.sourceKey || '').trim();
      if (sk) m.set(sk, line);
    }
    return m;
  }, [carLines, busLines]);

  const carUnit = useMemo(() => {
    if (kind !== 'car') return null;
    return getCarUnits(plan).find((u) => u.id === unitId) || null;
  }, [kind, plan, unitId]);

  const busUnit = useMemo(() => {
    if (kind !== 'bus') return null;
    return getUnitsForSede(plan, groupKey).find((u) => String(u.id) === String(unitId)) || null;
  }, [kind, plan, groupKey, unitId]);

  const loadCar = useCallback(async () => {
    const eid = String(eventId || '').trim();
    const uid = String(unitId || '').trim();
    if (!eid || !uid || kind !== 'car') return;
    setLoading(true);
    try {
      let next = await fetchCarUnitDoc(eid, uid);
      if (!next) {
        next = blankCarUnitDoc({
          eventId: eid,
          unitId: uid,
          label: carUnit?.label || '',
          capacity: carUnit?.capacity || defaultCap,
        });
        if (initialDriverSourceKey) {
          next = patchCarUnitDoc(next, { driverSourceKey: initialDriverSourceKey });
        }
      }
      setDoc(next);
    } catch (err) {
      console.error('[transport-drawer] fetchCarUnitDoc', err);
    } finally {
      setLoading(false);
    }
  }, [eventId, unitId, kind, carUnit, defaultCap, initialDriverSourceKey]);

  useEffect(() => {
    if (!open) {
      setDoc(null);
      setPoolQuery('');
      return undefined;
    }
    if (kind === 'car') void loadCar();
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [open, kind, loadCar]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const scheduleCarSave = useCallback(
    (nextDoc) => {
      const eid = String(eventId || '').trim();
      const uid = String(unitId || '').trim();
      if (!eid || !uid || !nextDoc) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      const driverLabel = lineBySk.get(nextDoc.driverSourceKey)?.name || '';
      saveTimerRef.current = setTimeout(() => {
        void saveCarUnitPatch(eid, uid, nextDoc, { driverLabel }).then((saved) => {
          if (!saved) return;
          setPlan((prev) => {
            const normalized = normalizeTransportPlanning(prev);
            return {
              ...normalized,
              carUnitSummaryById: {
                ...(normalized.carUnitSummaryById || {}),
                [uid]: buildCarUnitSummaryEntry(saved, { driverLabel }),
              },
            };
          });
        });
      }, CAR_META_SAVE_DEBOUNCE_MS);
    },
    [eventId, unitId, lineBySk, setPlan]
  );

  const syncCarAssign = useCallback(
    (nextDoc) => {
      const uid = String(nextDoc?.id || unitId || '').trim();
      setPlan((prev) => {
        const normalized = normalizeTransportPlanning(prev);
        const carAssign = { ...(normalized.carAssign || {}) };
        for (const [sk, vid] of Object.entries(carAssign)) {
          if (String(vid) === uid) delete carAssign[sk];
        }
        const driverSk = String(nextDoc?.driverSourceKey || '').trim();
        if (driverSk) carAssign[driverSk] = uid;
        for (const sk of nextDoc?.passengerSourceKeys || []) {
          const k = String(sk || '').trim();
          if (k) carAssign[k] = uid;
        }
        return { ...normalized, carAssign };
      });
    },
    [setPlan, unitId]
  );

  const updateCarDoc = useCallback(
    (patch) => {
      setDoc((prev) => {
        const base = prev || blankCarUnitDoc({ eventId, unitId, capacity: defaultCap });
        return patchCarUnitDoc(base, patch);
      });
      // Side effects after state — compute next from current doc + patch
      const base = doc || blankCarUnitDoc({ eventId, unitId, capacity: defaultCap });
      const next = patchCarUnitDoc(base, patch);
      scheduleCarSave(next);
      if (patch.driverSourceKey !== undefined || patch.passengerSourceKeys !== undefined) {
        syncCarAssign(next);
      }
    },
    [doc, eventId, unitId, defaultCap, scheduleCarSave, syncCarAssign]
  );

  const updateCarPlanFields = useCallback(
    (fields) => {
      if (!canEdit) return;
      const uid = String(unitId || '').trim();
      setPlan((prev) => {
        const normalized = normalizeTransportPlanning(prev);
        return {
          ...normalized,
          carUnits: getCarUnits(normalized).map((u) =>
            u.id === uid
              ? {
                  ...u,
                  ...(fields.label !== undefined ? { label: String(fields.label || '').trim() } : {}),
                  ...(fields.capacity !== undefined
                    ? { capacity: clampInt(fields.capacity, 1, 20) }
                    : {}),
                }
              : u
          ),
        };
      });
      updateCarDoc(fields);
    },
    [canEdit, unitId, setPlan, updateCarDoc]
  );

  const handleDeleteCar = useCallback(async () => {
    if (!canEdit) return;
    const uid = String(unitId || '').trim();
    setPlan((prev) => {
      const normalized = normalizeTransportPlanning(prev);
      const carAssign = { ...(normalized.carAssign || {}) };
      for (const [sk, vid] of Object.entries(carAssign)) {
        if (String(vid) === uid) delete carAssign[sk];
      }
      const summary = { ...(normalized.carUnitSummaryById || {}) };
      delete summary[uid];
      return {
        ...normalized,
        carUnits: getCarUnits(normalized).filter((u) => u.id !== uid),
        carAssign,
        carUnitSummaryById: summary,
      };
    });
    try {
      await deleteCarUnitDoc(eventId, uid);
    } catch (err) {
      console.error('[transport-drawer] deleteCarUnitDoc', err);
    }
    onClose?.();
  }, [canEdit, unitId, setPlan, eventId, onClose]);

  const assignedCarLines = useMemo(
    () => (kind === 'car' ? getCarLinesForUnit(carLines, plan, unitId) : []),
    [kind, carLines, plan, unitId]
  );

  const unassignedCarLines = useMemo(() => {
    if (kind !== 'car') return [];
    const assign = plan?.carAssign || {};
    return (carLines || []).filter((l) => {
      const sk = String(l.sourceKey || '').trim();
      return sk && !String(assign[sk] || '').trim();
    });
  }, [kind, carLines, plan]);

  const memberOptions = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const l of [...assignedCarLines, ...unassignedCarLines]) {
      const sk = String(l.sourceKey || '').trim();
      if (!sk || seen.has(sk)) continue;
      seen.add(sk);
      out.push({ sourceKey: sk, label: String(l.name || sk).trim() || '—' });
    }
    return out;
  }, [assignedCarLines, unassignedCarLines]);

  const filteredPool = useMemo(() => {
    const q = poolQuery.trim().toLowerCase();
    if (!q) return unassignedCarLines;
    return unassignedCarLines.filter((l) => String(l.name || '').toLowerCase().includes(q));
  }, [unassignedCarLines, poolQuery]);

  const passengerCheckboxOptions = useMemo(
    () => memberOptions.filter((m) => m.sourceKey !== doc?.driverSourceKey),
    [memberOptions, doc?.driverSourceKey]
  );

  const busPassengers = useMemo(() => {
    if (kind !== 'bus' || !section) return [];
    const base = passengersForBusGroup(busLines, section);
    const sorted = typeof sortPassengersForDisplay === 'function' ? sortPassengersForDisplay(base) : base;
    return sorted;
  }, [kind, section, busLines, sortPassengersForDisplay]);

  const busAssigned = countAssignedToUnit(plan, unitId);

  if (!open) return null;

  const title =
    kind === 'car'
      ? carUnit?.label || 'Editar carro'
      : busUnit?.label || 'Editar unidad';

  return (
    <div className={drawerOverlay} role="dialog" aria-modal="true" aria-labelledby="transport-unit-drawer-title">
      <button type="button" className={uiModal.backdrop} aria-label="Cerrar" onClick={() => onClose?.()} />
      <div className={drawerPanel}>
        <div className={uiModal.header}>
          <div className="min-w-0">
            <h3 id="transport-unit-drawer-title" className={uiModal.title}>
              {title}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {kind === 'car' ? 'Datos del vehículo y tripulación' : 'Asignación de pasajeros'}
            </p>
          </div>
          <button type="button" className={uiButtons.closeIcon} onClick={() => onClose?.()} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className={`${uiModal.body} space-y-4`}>
          {kind === 'car' ? (
            loading && !doc ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 size={16} className="animate-spin" />
                Cargando…
              </div>
            ) : (
              <>
                {canEdit ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block space-y-1">
                      <span className={uiForm.labelXs}>Etiqueta</span>
                      <input
                        className={uiForm.input}
                        value={carUnit?.label || ''}
                        onChange={(e) => updateCarPlanFields({ label: e.target.value })}
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className={uiForm.labelXs}>Plazas</span>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        className={uiForm.input}
                        value={carUnit?.capacity || defaultCap}
                        onChange={(e) => updateCarPlanFields({ capacity: e.target.value })}
                      />
                    </label>
                  </div>
                ) : null}

                <CarVehicleMetaPanel
                  carIndex={1}
                  meta={doc || {}}
                  canEdit={canEdit}
                  showMaybeAbsent
                  showPendingToggles
                  carCatalogView={carCatalogView}
                  onFieldChange={(field, value) => updateCarDoc({ [field]: value })}
                  onPendingFieldChange={(field, value) => {
                    const pendingKey = `pending${String(field || '')
                      .charAt(0)
                      .toUpperCase()}${String(field || '').slice(1)}`;
                    updateCarDoc({
                      [pendingKey]: value,
                      ...(value ? { [field]: '' } : {}),
                    });
                  }}
                  onMaybeAbsentChange={(value) => updateCarDoc({ maybeAbsent: value })}
                />

                <div className="space-y-3">
                  <label className="block space-y-1">
                    <span className={uiForm.labelXs}>Conductor</span>
                    <select
                      className={uiForm.input}
                      disabled={!canEdit && !canEditTransportOps}
                      value={doc?.pendingDriver ? '' : doc?.driverSourceKey || ''}
                      onChange={(e) => {
                        const driverSk = e.target.value;
                        const passengers = (doc?.passengerSourceKeys || []).filter((p) => p !== driverSk);
                        updateCarDoc({
                          driverSourceKey: driverSk,
                          passengerSourceKeys: passengers,
                          pendingDriver: false,
                        });
                      }}
                    >
                      <option value="">Seleccionar…</option>
                      {memberOptions.map((m) => (
                        <option key={m.sourceKey} value={m.sourceKey}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="space-y-1">
                    <span className={uiForm.labelXs}>Pasajeros</span>
                    <VirtualizedScrollList
                      className="max-h-40 overflow-y-auto"
                      items={passengerCheckboxOptions}
                      estimateSize={44}
                      getItemKey={(m) => m.sourceKey}
                      renderItem={(m) => {
                        const checked = (doc?.passengerSourceKeys || []).includes(m.sourceKey);
                        return (
                          <label
                            className={`${uiListRow.wrapCompact} cursor-pointer mb-1.5 ${checked ? uiListRow.pressed : ''}`}
                          >
                            <input
                              type="checkbox"
                              className="rounded border-slate-300"
                              disabled={!canEdit && !canEditTransportOps}
                              checked={checked}
                              onChange={(e) => {
                                const cur = doc?.passengerSourceKeys || [];
                                const next = e.target.checked
                                  ? [...cur, m.sourceKey]
                                  : cur.filter((k) => k !== m.sourceKey);
                                updateCarDoc({ passengerSourceKeys: next, pendingPassengers: false });
                              }}
                            />
                            <span className={uiListRow.primary}>{m.label}</span>
                          </label>
                        );
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <span className={uiForm.labelXs}>Agregar desde sin asignar</span>
                  <input
                    className={uiForm.input}
                    placeholder="Buscar persona…"
                    value={poolQuery}
                    onChange={(e) => setPoolQuery(e.target.value)}
                  />
                  <VirtualizedScrollList
                    className="max-h-36 overflow-y-auto"
                    items={filteredPool}
                    estimateSize={48}
                    getItemKey={(line) => line.sourceKey}
                    emptyContent={
                      <p className="text-xs text-slate-400 italic px-1">Nadie disponible en el pool.</p>
                    }
                    renderItem={(line) => (
                      <button
                        type="button"
                        className={`${uiListRow.wrapCompact} w-full text-left mb-1`}
                        disabled={!canEdit && !canEditTransportOps}
                        onClick={() => {
                          const sk = line.sourceKey;
                          if (!doc?.driverSourceKey) {
                            updateCarDoc({ driverSourceKey: sk, pendingDriver: false });
                          } else if (!(doc.passengerSourceKeys || []).includes(sk)) {
                            updateCarDoc({
                              passengerSourceKeys: [...(doc.passengerSourceKeys || []), sk],
                              pendingPassengers: false,
                            });
                          }
                          setPlan((prev) => assignPersonToCarUnit(prev, sk, unitId));
                        }}
                      >
                        <span className={uiListRow.main}>
                          <span className={uiListRow.primary}>{line.name}</span>
                          <span className={uiListRow.secondary}>{line.location || '—'}</span>
                        </span>
                      </button>
                    )}
                  />
                </div>

                {assignedCarLines.length > 0 ? (
                  <ul className="space-y-1">
                    {assignedCarLines.map((line) => (
                      <li key={line.sourceKey} className={uiListRow.wrapCompact}>
                        <span className={uiListRow.main}>
                          <span className={uiListRow.primary}>{line.name}</span>
                        </span>
                        <span className={uiListRow.actions}>
                          {renderTransportAttendanceCheckbox?.(line.sourceKey)}
                          {(canEdit || canEditTransportOps) ? (
                            <button
                              type="button"
                              className={uiButtons.iconOnlyDanger}
                              title="Quitar"
                              onClick={() => {
                                setPlan((prev) => assignPersonToCarUnit(prev, line.sourceKey, ''));
                                const isDriver = doc?.driverSourceKey === line.sourceKey;
                                if (isDriver) {
                                  updateCarDoc({ driverSourceKey: '' });
                                } else {
                                  updateCarDoc({
                                    passengerSourceKeys: (doc?.passengerSourceKeys || []).filter(
                                      (k) => k !== line.sourceKey
                                    ),
                                  });
                                }
                              }}
                            >
                              <X size={14} />
                            </button>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {canEdit ? (
                  <button type="button" className={uiButtons.dangerSoft} onClick={() => void handleDeleteCar()}>
                    <Trash2 size={14} className="inline mr-1" />
                    Eliminar carro
                  </button>
                ) : null}
              </>
            )
          ) : (
            <>
              {canEdit && busUnit ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block space-y-1">
                    <span className={uiForm.labelXs}>Etiqueta</span>
                    <input
                      className={uiForm.input}
                      value={busUnit.label || ''}
                      onChange={(e) => updateUnit?.(groupKey, unitId, { label: e.target.value })}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className={uiForm.labelXs}>Plazas</span>
                    <input
                      type="number"
                      min={1}
                      className={uiForm.input}
                      value={busUnit.capacity || 40}
                      onChange={(e) =>
                        updateUnit?.(groupKey, unitId, { capacity: clampInt(e.target.value, 1, 200) })
                      }
                    />
                  </label>
                </div>
              ) : null}
              <p className="text-[11px] font-semibold text-slate-500">
                Asignados: {busAssigned} / {busUnit?.capacity || '—'}
              </p>
              <VirtualizedScrollList
                className="max-h-[50vh] overflow-y-auto"
                items={busPassengers}
                estimateSize={52}
                getItemKey={(row) => row.transportSourceKey || row.sourceKey}
                renderItem={(row) => {
                  const sk = row.transportSourceKey || row.sourceKey;
                  const assigned = String(plan?.busAssign?.[sk] || '').trim();
                  return (
                    <div className={`${uiListRow.wrapCompact} mb-1.5`}>
                      <span className={uiListRow.main}>
                        <span className={uiListRow.primary}>{row.name}</span>
                        <span className={uiListRow.secondary}>{row.location || row.busSede || '—'}</span>
                      </span>
                      <span className={uiListRow.actions}>
                        {renderTransportAttendanceCheckbox?.(row.sourceKey)}
                        {(canEdit || canEditTransportOps) ? (
                          <select
                            className={`${uiForm.inputCompact} w-36`}
                            value={assigned === String(unitId) ? String(unitId) : ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              assignBus?.(sk, v ? unitId : '');
                            }}
                          >
                            <option value="">Sin asignar</option>
                            <option value={String(unitId)}>Esta unidad</option>
                          </select>
                        ) : null}
                      </span>
                    </div>
                  );
                }}
              />
              {canEdit ? (
                <button
                  type="button"
                  className={uiButtons.dangerSoft}
                  onClick={() => {
                    removeUnit?.(groupKey, unitId);
                    onClose?.();
                  }}
                >
                  <Trash2 size={14} className="inline mr-1" />
                  Eliminar unidad
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
