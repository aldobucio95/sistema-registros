import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Bus, Car, ChevronDown, FileDown, MessageCircle, Plus, Trash2, X } from 'lucide-react';
import {
  assignBautizosMembersToCarSlots,
  bautizosFamilyEffectiveCarCount,
  buildBautizosCarDisplayGroups,
  buildBautizosCarFamilyInfo,
  buildBusGroupSections,
  buildCarGroupKeyToGroup,
  buildManualCarGroupViews,
  buildTransportPlanningLines,
  carVehicleMetaStorageKey,
  countAssignedToUnit,
  countConfirmedCarsInSet,
  defaultVehicleLabel,
  effectiveCarsForCarLine,
  filterBautizosDisplayGroupExcludingManual,
  getCarVehicleMetaFromPlan,
  getUnitsForSede,
  isManualCarPlanGroup,
  makeBusUnitId,
  manualCarGroupLinesForMember,
  manualGroupMaxRegisteredCars,
  manualGroupParticipantSourceKeys,
  normalizeTransportPlanning,
  parseBusGroupKey,
  participantIncludedInTransportPlanning,
  passengersForBusGroup,
  sortTransportLinesByRosterOrder,
  suggestBautizosFamilyCarGroups,
  totalCarsCount,
  getTransportAttendanceEntry,
  applyTransportPlanningAutoNormalization,
  transportPlanningStructureSignature,
  sanitizeBautizosGroupTitularByGroupId,
} from '../transportPlanningCore.js';
import CarVehicleMetaPanel from '../components/transport/CarVehicleMetaPanel.jsx';
import { collectCarColorSuggestions, applyCarMetaPassengerInheritance } from '../bautizosCarMeta.js';
import BautizosCarCrewFields from '../components/transport/BautizosCarCrewFields.jsx';
import TransportBautizosCarCard from '../components/transport/TransportBautizosCarCard.jsx';
import {
  buildBautizosFamilyMemberOptions,
  buildBautizosCarSlotsForTransport,
  buildCarCrewAssignmentPatches,
  buildCarInventorySlotsForOwner,
  buildCopyTitularCarMetaPatches,
  buildDefaultManualGroupCrewPatches,
  buildManualGroupOrphanCarMetaCleanup,
  buildRosterSourceKeyLabelIndex,
  buildTransportCarContextForHost,
  collectAssignedCrewSourceKeysOnOtherCars,
  filterDriverMemberOptions,
  formatCarMetaDisplayValue,
  formatTransportCarMemberRole,
  listManualGroupTitularCarMetaSources,
  manualGroupCrewRequiresPassengers,
  materializeTitularCarMetaOnPlan,
  mergeCarMetaPatchesIntoPlan,
  removeCarMetaKeysFromPlan,
  titularNeedsCarMetaHydration,
  titularSourceKeyHasCarMetaCaptured,
} from '../bautizosCarMeta.js';
import {
  collectCarMetaCatalogEntries,
  createCarCatalogView,
  customCarCatalogsEqual,
  EMPTY_CUSTOM_CAR_CATALOG,
  normalizeCustomCarCatalog,
  upsertCustomCarCatalog,
} from '../data/carBrandModelsCatalog.js';
import { buildLocationScopeSet, participantInLocationScope } from '../rbac/permissions.js';
import { uiPageHeader, uiModal, uiButtons } from '../ui/uiFormatClasses.js';
import {
  fetchAllCarMetaForEvent,
  fetchCarMetaForTitular,
  mergeCarMetaCacheIntoPlan,
  migrateInlineCarMetaToSubcollection,
  saveCarMetaVehicleToFirestore,
  saveTransportPlanStructure,
  slotsFromTitularCarMetaSummary,
  transportPlanningFromEventDoc,
  vehicleKeysForTitular,
} from '../transportCarMetaStore.js';

const CAR_META_SAVE_DEBOUNCE_MS = 700;
const PLAN_STRUCTURE_SAVE_DEBOUNCE_MS = 800;

const btnPrimary =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-500/30 transition-colors disabled:opacity-50 disabled:pointer-events-none';
const btnSecondary =
  'inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 dark:border-slate-600 transition-colors disabled:opacity-50';
const btnWhatsAppCarData =
  'inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide border border-[#1DA851] bg-[#25D366] text-white hover:bg-[#20BD5A] transition-colors disabled:opacity-50 disabled:pointer-events-none';
const inputSm =
  'w-full min-w-0 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100';

function clampInt(n, min, max) {
  const x = parseInt(n, 10);
  if (!Number.isFinite(x)) return min;
  return Math.min(max, Math.max(min, x));
}

function transportPlanningSignature(raw) {
  try {
    return JSON.stringify(normalizeTransportPlanning(raw));
  } catch {
    return '';
  }
}

/** Carga meta de subcolección para titulares con resumen pero sin datos inline en plan/cache. */
async function hydrateCarMetaCacheForTitulars(eventId, titularSks, plan, baseCache = {}) {
  const cache = { ...(baseCache || {}) };
  for (const sk of titularSks || []) {
    const owner = String(sk || '').trim();
    if (!owner.startsWith('p:')) continue;
    const workingPlan = mergeCarMetaCacheIntoPlan(plan, cache);
    if (!titularNeedsCarMetaHydration(workingPlan, owner)) continue;
    const eid = String(eventId || '').trim();
    if (!eid) continue;
    const fetched = await fetchCarMetaForTitular(eid, owner);
    Object.assign(cache, fetched);
  }
  return cache;
}

export default function TransportPlanningPage({
  currentEvent,
  allParticipants,
  visibleLocations = [],
  applyGlobalRegistryLikeFilters,
  globalLocationFilters = [],
  renderGlobalRegistryListToolbar,
  canEdit,
  /** Asignar camión y confirmar asistencia (incluye Lector con acceso a Transporte). */
  canEditTransportOps = false,
  transportOpsUserLabel = '',
  showToast,
  getDocRef,
  updateDoc,
  addLog,
  isCampa = false,
  /** Alineado al dashboard: si es true, camiones Campa por Teens / Jóvenes (servidor Ambos en ambos bloques). */
  countAmbosDoubleInAllCounts = true,
  /** Catálogo personalizado de marcas/modelos (`app_data/config.customCarCatalog`). */
  customCarCatalog = EMPTY_CUSTOM_CAR_CATALOG,
  /** Preferencias de visualización (sincronizadas por usuario en Firestore). */
  transportUiPrefs = {
    bautizosCarCardsOpen: false,
    rowByRowOpen: false,
    manualCarGroupsOpen: true,
    expandedCarDetailKeys: [],
  },
  onTransportUiPrefsChange,
  /** Actualiza `currentEvent.transportPlanning` en App tras guardar (evita falso dirty y sync prematuro). */
  onTransportPlanSaved,
  canSendCarDataWhatsApp = false,
  titularHasPendingCarData,
  onSendCarDataWhatsApp,
  onBulkSendCarDataWhatsApp,
  resolveParticipantById,
}) {
  const eventId = currentEvent?.id;
  const eventType = String(currentEvent?.eventType || '').trim();
  const isBautizos = eventType === 'Bautizos';
  const splitCampaBySubevent = isCampa && countAmbosDoubleInAllCounts !== false;
  const locations = useMemo(() => {
    if (Array.isArray(visibleLocations) && visibleLocations.length > 0) {
      return visibleLocations.map((x) => String(x).trim()).filter(Boolean);
    }
    return Array.isArray(currentEvent?.locations)
      ? currentEvent.locations.map((x) => String(x).trim()).filter(Boolean)
      : [];
  }, [currentEvent?.locations, visibleLocations]);

  const locationScopeSet = useMemo(() => buildLocationScopeSet(locations), [locations]);

  const carCatalogView = useMemo(
    () => createCarCatalogView(customCarCatalog),
    [customCarCatalog]
  );

  const basePool = useMemo(() => {
    if (!eventId) return [];
    return (allParticipants || []).filter(
      (p) =>
        String(p.eventId) === String(eventId) &&
        participantIncludedInTransportPlanning(p, eventType) &&
        participantInLocationScope(p, locationScopeSet)
    );
  }, [allParticipants, eventId, eventType, locationScopeSet]);

  const evRosterFiltered = useMemo(() => {
    let roster =
      typeof applyGlobalRegistryLikeFilters === 'function'
        ? applyGlobalRegistryLikeFilters(basePool)
        : basePool;
    if (globalLocationFilters.length > 0) {
      roster = roster.filter((p) => globalLocationFilters.includes(p.location));
    }
    return roster;
  }, [basePool, applyGlobalRegistryLikeFilters, globalLocationFilters]);

  const sedeScopeHint =
    visibleLocations.length === 1
      ? `Mostrando solo la sede ${visibleLocations[0]}.`
      : visibleLocations.length > 0 && visibleLocations.length < (currentEvent?.locations || []).length
        ? `Sedes visibles para tu usuario: ${visibleLocations.join(', ')}.`
        : null;

  const { busLines, carLines } = useMemo(() => {
    const built = buildTransportPlanningLines(evRosterFiltered, eventType, locations, currentEvent);
    return {
      busLines: sortTransportLinesByRosterOrder(built.busLines, evRosterFiltered),
      carLines: sortTransportLinesByRosterOrder(built.carLines, evRosterFiltered),
    };
  }, [evRosterFiltered, eventType, locations, currentEvent]);

  const [plan, setPlan] = useState(() =>
    transportPlanningFromEventDoc(currentEvent?.transportPlanning)
  );
  const [saving, setSaving] = useState(false);
  const [mergeConflictModal, setMergeConflictModal] = useState(null);
  /** Meta de carro cargada bajo demanda desde subcolección (no está en app_events). */
  const [loadedCarMetaByKey, setLoadedCarMetaByKey] = useState({});
  const [loadingTitularSks, setLoadingTitularSks] = useState(() => new Set());
  /** Titulares cuya subcolección ya se consultó (aunque no haya docs). */
  const [fetchedTitularSks, setFetchedTitularSks] = useState(() => new Set());
  const [mergingManualGroup, setMergingManualGroup] = useState(false);
  const carMetaMigrationStartedRef = useRef(false);
  const prevSyncEventIdRef = useRef(eventId);
  const planRef = useRef(plan);
  const loadedCarMetaRef = useRef(loadedCarMetaByKey);
  const carMetaSaveTimersRef = useRef(new Map());
  const structureSaveTimerRef = useRef(null);
  const structureBootRef = useRef(true);
  planRef.current = plan;
  loadedCarMetaRef.current = loadedCarMetaByKey;

  const mergedCarMetaByKey = useMemo(
    () => ({ ...loadedCarMetaByKey, ...(plan.carMetaBySource || {}) }),
    [plan.carMetaBySource, loadedCarMetaByKey]
  );

  const planForCarMetaRead = useMemo(
    () => mergeCarMetaCacheIntoPlan(plan, loadedCarMetaByKey),
    [plan, loadedCarMetaByKey]
  );

  const resolveHostCarContext = useCallback(
    (hostId) =>
      buildTransportCarContextForHost({
        hostId,
        plan: planForCarMetaRead,
        roster: evRosterFiltered,
      }),
    [planForCarMetaRead, evRosterFiltered]
  );

  const buildCrewMemberOptions = useCallback(
    (carCtx) =>
      buildBautizosFamilyMemberOptions({
        hostPerson: carCtx.hostPerson,
        companions: carCtx.companions,
        hostSourceKey: carCtx.hostSourceKey,
      }),
    []
  );

  const canSaveTransport = canEdit || canEditTransportOps;

  React.useEffect(() => {
    if (!isBautizos || !eventId || carMetaMigrationStartedRef.current) return;
    const raw = currentEvent?.transportPlanning;
    const normalized = normalizeTransportPlanning(raw);
    const inlineKeys = Object.keys(normalized.carMetaBySource || {});
    if (!inlineKeys.length) return;
    carMetaMigrationStartedRef.current = true;
    migrateInlineCarMetaToSubcollection(
      eventId,
      normalized,
      evRosterFiltered,
      updateDoc,
      getDocRef
    )
      .then(({ migrated, plan: migratedPlan }) => {
        if (migrated) {
          setPlan(migratedPlan);
          setLoadedCarMetaByKey({});
          setFetchedTitularSks(new Set());
        }
      })
      .catch((e) => {
        console.error(e);
        carMetaMigrationStartedRef.current = false;
      });
  }, [isBautizos, eventId, currentEvent?.transportPlanning, evRosterFiltered, updateDoc, getDocRef]);

  const titularCarMetaIsLoaded = useCallback(
    (titularSk, effectiveCars) => {
      const owner = String(titularSk || '').trim();
      if (!owner) return false;
      const inlineKeys = vehicleKeysForTitular(owner, effectiveCars);
      if (inlineKeys.some((k) => Boolean(plan.carMetaBySource?.[k]))) return true;
      if (inlineKeys.some((k) => Boolean(loadedCarMetaByKey?.[k]))) return true;
      return fetchedTitularSks.has(owner);
    },
    [plan.carMetaBySource, loadedCarMetaByKey, fetchedTitularSks]
  );

  React.useEffect(() => {
    if (!isBautizos || !eventId) {
      setLoadedCarMetaByKey({});
      setFetchedTitularSks(new Set());
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const all = await fetchAllCarMetaForEvent(eventId);
        if (cancelled) return;
        setLoadedCarMetaByKey(all);
        const owners = new Set();
        for (const meta of Object.values(all || {})) {
          const owner = String(meta?.ownerSourceKey || '').trim();
          if (owner) owners.add(owner);
        }
        setFetchedTitularSks(owners);
      } catch (e) {
        console.error('[transport] prefetch car meta', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isBautizos, eventId]);

  const loadCarMetaForTitular = useCallback(
    async (titularSk, effectiveCars = 1) => {
      const owner = String(titularSk || '').trim();
      if (!eventId || !owner) return;
      if (titularCarMetaIsLoaded(owner, effectiveCars)) return;
      setLoadingTitularSks((prev) => new Set(prev).add(owner));
      try {
        const fetched = await fetchCarMetaForTitular(eventId, owner);
        if (Object.keys(fetched).length) {
          setLoadedCarMetaByKey((prev) => ({ ...fetched, ...prev }));
        }
      } finally {
        setFetchedTitularSks((prev) => new Set(prev).add(owner));
        setLoadingTitularSks((prev) => {
          const next = new Set(prev);
          next.delete(owner);
          return next;
        });
      }
    },
    [eventId, titularCarMetaIsLoaded]
  );

  const busSectionsBase = useMemo(
    () => buildBusGroupSections(busLines, locations, isCampa, splitCampaBySubevent),
    [busLines, locations, isCampa, splitCampaBySubevent]
  );

  const busSectionsEffective = useMemo(() => {
    const base = [...busSectionsBase];
    const keys = new Set(base.map((s) => s.groupKey));
    for (const k of Object.keys(plan.unitsByLocation || {})) {
      if (keys.has(k)) continue;
      keys.add(k);
      const { sedeBase, subevent } = parseBusGroupKey(k);
      base.push({
        groupKey: k,
        sedeBase,
        subevent,
        title: subevent ? `${sedeBase} · ${subevent}` : k,
        orphan: true,
      });
    }
    return base;
  }, [busSectionsBase, plan.unitsByLocation]);

  const keyToGroup = useMemo(() => buildCarGroupKeyToGroup(plan), [plan]);
  const bautizosFamilyInfo = useMemo(
    () => (isBautizos ? buildBautizosCarFamilyInfo(carLines) : null),
    [isBautizos, carLines]
  );
  const bautizosCarDisplayGroups = useMemo(
    () => (isBautizos ? buildBautizosCarDisplayGroups(evRosterFiltered, carLines) : []),
    [isBautizos, evRosterFiltered, carLines]
  );

  const planDirtyContext = useMemo(
    () => ({ isBautizos, bautizosCarDisplayGroups }),
    [isBautizos, bautizosCarDisplayGroups]
  );

  const remoteStructureSig = useMemo(
    () =>
      transportPlanningStructureSignature(
        normalizeTransportPlanning(currentEvent?.transportPlanning),
        planDirtyContext
      ),
    [currentEvent?.id, currentEvent?.transportPlanning, planDirtyContext]
  );

  const localStructureSig = useMemo(
    () => transportPlanningStructureSignature(plan, planDirtyContext),
    [plan, planDirtyContext]
  );

  const flushCarMetaSave = useCallback(
    async (vehicleKey) => {
      const vk = String(vehicleKey || '').trim();
      if (!canSaveTransport || !eventId || !vk) return;
      const merged = mergeCarMetaCacheIntoPlan(planRef.current, loadedCarMetaRef.current);
      const fullMeta = merged?.carMetaBySource?.[vk];
      if (!fullMeta) return;
      setSaving(true);
      try {
        const savedPlan = await saveCarMetaVehicleToFirestore({
          eventId: String(eventId),
          vehicleKey: vk,
          meta: fullMeta,
          currentPlan: merged,
          roster: evRosterFiltered,
          getDocRef,
          updateDoc,
        });
        setLoadedCarMetaByKey((prev) => ({ ...prev, [vk]: fullMeta }));
        setPlan((prev) => {
          const carMetaBySource = { ...(prev.carMetaBySource || {}) };
          delete carMetaBySource[vk];
          return { ...prev, carMetaBySource };
        });
        if (typeof onTransportPlanSaved === 'function') {
          onTransportPlanSaved(savedPlan);
        }
        const catalogEntries = collectCarMetaCatalogEntries({ [vk]: fullMeta });
        const nextCustomCatalog = upsertCustomCarCatalog(customCarCatalog, catalogEntries);
        if (!customCarCatalogsEqual(customCarCatalog, nextCustomCatalog)) {
          await updateDoc(getDocRef('app_data', 'config'), {
            customCarCatalog: nextCustomCatalog,
          });
        }
      } catch (e) {
        console.error('[transport] auto-save car meta', e);
        showToast('No se pudo guardar datos de carro.');
      } finally {
        setSaving(false);
      }
    },
    [
      canSaveTransport,
      eventId,
      evRosterFiltered,
      getDocRef,
      updateDoc,
      onTransportPlanSaved,
      customCarCatalog,
      showToast,
    ]
  );

  const queueCarMetaSave = useCallback(
    (vehicleKey) => {
      const vk = String(vehicleKey || '').trim();
      if (!vk) return;
      const prevTimer = carMetaSaveTimersRef.current.get(vk);
      if (prevTimer) clearTimeout(prevTimer);
      carMetaSaveTimersRef.current.set(
        vk,
        setTimeout(() => {
          carMetaSaveTimersRef.current.delete(vk);
          void flushCarMetaSave(vk);
        }, CAR_META_SAVE_DEBOUNCE_MS)
      );
    },
    [flushCarMetaSave]
  );

  const queueCarMetaSavesForPatches = useCallback(
    (patches) => {
      for (const item of patches || []) {
        queueCarMetaSave(item?.vehicleKey);
      }
    },
    [queueCarMetaSave]
  );

  const flushStructureSave = useCallback(async () => {
    if (!canSaveTransport || !eventId) return;
    const snapshot = applyTransportPlanningAutoNormalization(planRef.current, planDirtyContext);
    setSaving(true);
    try {
      const mergedForSummary = mergeCarMetaCacheIntoPlan(snapshot, loadedCarMetaRef.current);
      const savedPlan = await saveTransportPlanStructure({
        eventId: String(eventId),
        plan: applyCarMetaPassengerInheritance(mergedForSummary),
        roster: evRosterFiltered,
        getDocRef,
        updateDoc,
      });
      if (typeof onTransportPlanSaved === 'function') {
        onTransportPlanSaved(savedPlan);
      }
    } catch (e) {
      console.error('[transport] auto-save plan structure', e);
      showToast('No se pudo guardar el plan de transporte.');
    } finally {
      setSaving(false);
    }
  }, [
    canSaveTransport,
    eventId,
    planDirtyContext,
    evRosterFiltered,
    getDocRef,
    updateDoc,
    onTransportPlanSaved,
    showToast,
  ]);

  const queueStructureSave = useCallback(() => {
    if (structureSaveTimerRef.current) clearTimeout(structureSaveTimerRef.current);
    structureSaveTimerRef.current = setTimeout(() => {
      structureSaveTimerRef.current = null;
      void flushStructureSave();
    }, PLAN_STRUCTURE_SAVE_DEBOUNCE_MS);
  }, [flushStructureSave]);

  React.useEffect(() => {
    if (!canSaveTransport || !eventId) return undefined;
    if (structureBootRef.current) {
      structureBootRef.current = false;
      return undefined;
    }
    if (localStructureSig === remoteStructureSig) return undefined;
    queueStructureSave();
    return () => {
      if (structureSaveTimerRef.current) {
        clearTimeout(structureSaveTimerRef.current);
        structureSaveTimerRef.current = null;
      }
    };
  }, [localStructureSig, remoteStructureSig, canSaveTransport, eventId, queueStructureSave]);

  React.useEffect(() => {
    structureBootRef.current = true;
  }, [eventId]);

  React.useEffect(() => {
    const next = transportPlanningFromEventDoc(currentEvent?.transportPlanning);
    const eventChanged = String(prevSyncEventIdRef.current || '') !== String(currentEvent?.id || '');
    prevSyncEventIdRef.current = currentEvent?.id;
    setPlan((prev) => {
      if (eventChanged) return next;
      if (transportPlanningStructureSignature(prev, planDirtyContext) !== remoteStructureSig) {
        return prev;
      }
      if (transportPlanningSignature(prev) === transportPlanningSignature(next)) return prev;
      return next;
    });
  }, [currentEvent?.id, currentEvent?.transportPlanning, planDirtyContext, remoteStructureSig]);

  const carColorSuggestions = useMemo(
    () => collectCarColorSuggestions(planForCarMetaRead),
    [planForCarMetaRead]
  );

  const manualCarGroupViews = useMemo(
    () => buildManualCarGroupViews(plan, carLines),
    [plan, carLines]
  );
  const manualGroupedKeys = useMemo(() => {
    const keys = new Set();
    for (const view of manualCarGroupViews) {
      for (const k of view.memberKeys || []) keys.add(String(k).trim());
    }
    return keys;
  }, [manualCarGroupViews]);
  const bautizosCarCardGroups = useMemo(() => {
    if (!isBautizos || manualGroupedKeys.size === 0) return bautizosCarDisplayGroups;
    return bautizosCarDisplayGroups
      .map((grp) => filterBautizosDisplayGroupExcludingManual(grp, manualGroupedKeys))
      .filter(Boolean);
  }, [isBautizos, bautizosCarDisplayGroups, manualGroupedKeys]);
  const carsTotal = useMemo(
    () => totalCarsCount(carLines, plan, isBautizos, evRosterFiltered),
    [carLines, plan, isBautizos, evRosterFiltered]
  );

  const pendingCarDataTitularCount = useMemo(() => {
    if (!isBautizos || typeof titularHasPendingCarData !== 'function') return 0;
    const seen = new Set();
    let n = 0;
    for (const p of evRosterFiltered) {
      const tid = String(p?.id || '').trim();
      if (!tid || seen.has(tid)) continue;
      if (!titularHasPendingCarData(p)) continue;
      seen.add(tid);
      n += 1;
    }
    return n;
  }, [isBautizos, evRosterFiltered, titularHasPendingCarData]);

  const renderCarDataWhatsAppButton = (hostId, locationLabel, compact = false) => {
    if (!canSendCarDataWhatsApp || typeof onSendCarDataWhatsApp !== 'function') return null;
    const titular =
      typeof resolveParticipantById === 'function' ? resolveParticipantById(hostId) : null;
    if (!titular || typeof titularHasPendingCarData !== 'function' || !titularHasPendingCarData(titular)) {
      return null;
    }
    const loc = String(locationLabel || titular.location || '').trim();
    return (
      <button
        type="button"
        className={compact ? `${btnWhatsAppCarData} shrink-0` : btnWhatsAppCarData}
        title="Solicitar datos de carro por WhatsApp (solo este titular)"
        onClick={() => onSendCarDataWhatsApp(titular, loc)}
      >
        <MessageCircle size={compact ? 12 : 14} aria-hidden />
        {compact ? 'WA datos carro' : 'WhatsApp · datos carro'}
      </button>
    );
  };

  const totalUnitsAll = useMemo(() => {
    let n = 0;
    for (const u of Object.values(plan.unitsByLocation || {})) {
      if (Array.isArray(u)) n += u.length;
    }
    return n;
  }, [plan.unitsByLocation]);

  const carTableColSpan = (canEdit ? 1 : 0) + 9 + (isBautizos ? 1 : 0);

  const setTransportAttendance = useCallback(
    (sourceKey, confirmed) => {
      const sk = String(sourceKey || '').trim();
      if (!sk || !canEditTransportOps) return;
      setPlan((prev) => {
        const next = normalizeTransportPlanning(prev);
        const transportAttendanceBySource = { ...(next.transportAttendanceBySource || {}) };
        if (confirmed) {
          transportAttendanceBySource[sk] = {
            confirmed: true,
            confirmedAt: new Date().toISOString(),
            confirmedBy: String(transportOpsUserLabel || '').trim(),
          };
        } else {
          delete transportAttendanceBySource[sk];
        }
        return { ...next, transportAttendanceBySource };
      });
    },
    [canEditTransportOps, transportOpsUserLabel]
  );

  const renderTransportAttendanceCheckbox = (sourceKey) => {
    const sk = String(sourceKey || '').trim();
    if (!sk) return <span className="text-slate-400">—</span>;
    const entry = getTransportAttendanceEntry(plan, sk);
    const checked = entry.confirmed === true;
    return (
      <label className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
        <input
          type="checkbox"
          className="rounded border-slate-300"
          checked={checked}
          disabled={!canEditTransportOps}
          onChange={(e) => setTransportAttendance(sk, e.target.checked)}
        />
        <span className={checked ? 'text-emerald-700 dark:text-emerald-400' : ''}>
          {checked ? 'Asistió' : 'Confirmar'}
        </span>
      </label>
    );
  };

  const expandedCarDetailKeys = useMemo(
    () => new Set(transportUiPrefs?.expandedCarDetailKeys || []),
    [transportUiPrefs?.expandedCarDetailKeys]
  );

  const expandedFamilyCardKeys = useMemo(
    () => new Set(transportUiPrefs?.expandedFamilyCardKeys || []),
    [transportUiPrefs?.expandedFamilyCardKeys]
  );

  const expandedCarFormKeys = useMemo(
    () => new Set(transportUiPrefs?.expandedCarFormKeys || []),
    [transportUiPrefs?.expandedCarFormKeys]
  );

  const patchTransportUiPrefs = useCallback(
    (patch) => {
      if (typeof onTransportUiPrefsChange !== 'function') return;
      onTransportUiPrefsChange((prev) => ({ ...prev, ...patch }));
    },
    [onTransportUiPrefsChange]
  );

  const toggleCarDetailKey = useCallback(
    (detailKey) => {
      const key = String(detailKey || '').trim();
      if (!key || typeof onTransportUiPrefsChange !== 'function') return;
      onTransportUiPrefsChange((prev) => {
        const set = new Set(prev.expandedCarDetailKeys || []);
        if (set.has(key)) set.delete(key);
        else set.add(key);
        return { ...prev, expandedCarDetailKeys: [...set] };
      });
    },
    [onTransportUiPrefsChange]
  );

  const toggleFamilyCardKey = useCallback(
    (cardKey) => {
      const key = String(cardKey || '').trim();
      if (!key || typeof onTransportUiPrefsChange !== 'function') return;
      onTransportUiPrefsChange((prev) => {
        const set = new Set(prev.expandedFamilyCardKeys || []);
        if (set.has(key)) set.delete(key);
        else set.add(key);
        return { ...prev, expandedFamilyCardKeys: [...set] };
      });
    },
    [onTransportUiPrefsChange]
  );

  const toggleCarFormKey = useCallback(
    (formKey) => {
      const key = String(formKey || '').trim();
      if (!key || typeof onTransportUiPrefsChange !== 'function') return;
      onTransportUiPrefsChange((prev) => {
        const set = new Set(prev.expandedCarFormKeys || []);
        if (set.has(key)) set.delete(key);
        else set.add(key);
        return { ...prev, expandedCarFormKeys: [...set] };
      });
    },
    [onTransportUiPrefsChange]
  );

  const handleToggleFamilyCard = useCallback(
    async (cardKey, titularSk, effectiveCars) => {
      const key = String(cardKey || '').trim();
      const willExpand = !expandedFamilyCardKeys.has(key);
      toggleFamilyCardKey(key);
      if (willExpand && titularSk) {
        await loadCarMetaForTitular(titularSk, effectiveCars);
      }
    },
    [expandedFamilyCardKeys, toggleFamilyCardKey, loadCarMetaForTitular]
  );

  const handleToggleCarForm = useCallback(
    async (formKey, titularSk, effectiveCars) => {
      const key = String(formKey || '').trim();
      const willExpand = !expandedCarFormKeys.has(key);
      toggleCarFormKey(key);
      if (willExpand && titularSk) {
        await loadCarMetaForTitular(titularSk, effectiveCars);
      }
    },
    [expandedCarFormKeys, toggleCarFormKey, loadCarMetaForTitular]
  );

  const handleToggleCarDetailKey = useCallback(
    async (detailKey, titularSk, effectiveCars) => {
      const key = String(detailKey || '').trim();
      const willExpand = !expandedCarDetailKeys.has(key);
      toggleCarDetailKey(key);
      if (willExpand && titularSk) {
        await loadCarMetaForTitular(titularSk, effectiveCars);
      }
    },
    [expandedCarDetailKeys, toggleCarDetailKey, loadCarMetaForTitular]
  );

  const resolveSlotsForTitular = useCallback(
    (titularSk, effectiveCars, cardExpanded, hostPerson, companions, fallbackLines) => {
      const summaryEntry = plan.bautizosCarMetaSummaryByTitular?.[titularSk];
      const metaLoaded = titularCarMetaIsLoaded(titularSk, effectiveCars);
      if ((!cardExpanded || !metaLoaded) && summaryEntry) {
        return slotsFromTitularCarMetaSummary(summaryEntry);
      }
      return buildBautizosCarSlotsForTransport({
        plan: planForCarMetaRead,
        hostSourceKey: titularSk,
        effectiveCars,
        hostPerson,
        companions,
        labelIndex: buildRosterSourceKeyLabelIndex(evRosterFiltered),
        fallbackLines,
        roster: evRosterFiltered,
        seatsPerCar: plan.bautizosCarCapacity,
      });
    },
    [plan, planForCarMetaRead, evRosterFiltered, titularCarMetaIsLoaded]
  );

  const renderCarDetailToggle = (detailKey, label = 'Datos de carro', extra = '', onToggle) => {
    const key = String(detailKey || '').trim();
    if (!key) return null;
    const open = expandedCarDetailKeys.has(key);
    return (
      <button
        type="button"
        className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
        onClick={() => (typeof onToggle === 'function' ? onToggle() : toggleCarDetailKey(key))}
        aria-expanded={open}
      >
        <ChevronDown size={14} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
        <span>
          {label}
          {extra ? ` · ${extra}` : ''}
        </span>
      </button>
    );
  };

  const getPassengersForSection = (section) => {
    const passengersBase = passengersForBusGroup(busLines, section);
    return passengersBase
      .filter((row) => {
        if (!(isCampa && splitCampaBySubevent)) return true;
        if (String(row?.campaSegment || '') !== 'Ambos') return true;
        const t = resolveCampaAmbosTransit(row.sourceKey);
        if (section.subevent === 'Teens') return t.teenArrive || t.teenReturn;
        if (section.subevent === 'Jóvenes') return t.jovenArrive || t.jovenReturn;
        return true;
      })
      .map((row) => {
        if (!(isCampa && splitCampaBySubevent)) return { ...row, transportSourceKey: row.sourceKey };
        if (String(row?.campaSegment || '') !== 'Ambos') return { ...row, transportSourceKey: row.sourceKey };
        const sub = String(section?.subevent || '').trim();
        return { ...row, transportSourceKey: `${row.sourceKey}|${sub || 'Ambos'}` };
      });
  };

  const sortPassengersForDisplay = (passengers) =>
    sortTransportLinesByRosterOrder(passengers, evRosterFiltered);

  const exportTransportPlanPdf = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const M = { l: 40, r: 40, t: 42, b: 52 };
      const contentW = pageW - M.l - M.r;
      let y = M.t;

      const C = {
        indigo: [79, 70, 229],
        indigoSoft: [224, 231, 255],
        white: [255, 255, 255],
        slate900: [15, 23, 42],
        slate600: [71, 85, 105],
        slate200: [226, 232, 240],
        slate100: [241, 245, 249],
        stripe: [248, 250, 252],
        border: [203, 213, 225],
      };

      /** Numeración global de personas (camión + carro). */
      const regCounter = { n: 0 };
      const nextRegNum = () => {
        regCounter.n += 1;
        return String(regCounter.n);
      };

      const getCarMetaForExport = (titularSk, carIndex = 1) => getCarMeta(titularSk, carIndex);

      const remainingY = () => pageH - M.b - y;
      const ensure = (need) => {
        if (need <= 0) return;
        if (y + need <= pageH - M.b) return;
        doc.addPage();
        y = M.t;
      };

      /** Evita partir un bloque lógico: si no cabe entero en la página actual, salta de página. */
      const startBlock = (estimatedH) => {
        if (estimatedH <= 0) return;
        const room = pageH - M.b - y;
        if (estimatedH <= pageH - M.t - M.b) {
          if (estimatedH > room) {
            doc.addPage();
            y = M.t;
          }
        } else {
          doc.addPage();
          y = M.t;
        }
      };

      const drawFooterPageNums = () => {
        const n = doc.getNumberOfPages();
        for (let i = 1; i <= n; i++) {
          doc.setPage(i);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(...C.slate600);
          doc.text(`Página ${i} de ${n}`, M.l, pageH - 28);
          doc.setDrawColor(...C.border);
          doc.setLineWidth(0.35);
          doc.line(M.l, pageH - 36, pageW - M.r, pageH - 36);
        }
      };

      const drawWrapped = (text, x, y0, maxW, size, style = 'normal', color = C.slate900) => {
        doc.setFont('helvetica', style);
        doc.setFontSize(size);
        doc.setTextColor(...color);
        const lines = doc.splitTextToSize(String(text || ''), maxW);
        doc.text(lines, x, y0);
        return lines.length * (size * 1.15);
      };

      const tableLayout = (rows, colWeights, opts) => {
        const padX = 6;
        const padY = 5;
        const fontBody = opts.fontBody ?? 7.5;
        const minRowH = opts.minRowH ?? 16;
        const headH = opts.headH ?? 20;
        const widths = colWeights.map((w) => w * contentW);
        const cellPadW = (i) => Math.max(14, widths[i] - padX * 2);
        const rowHeights = rows.map((row) => {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(fontBody);
          let h = minRowH;
          row.forEach((cell, i) => {
            const lines = doc.splitTextToSize(String(cell ?? '—'), cellPadW(i));
            h = Math.max(h, lines.length * (fontBody * 1.12) + padY * 2);
          });
          return h;
        });
        return { padX, padY, fontBody, headH, widths, rowHeights, cellPadW };
      };

      const measureTable = (headers, rows, colWeights, opts = {}) => {
        if (!rows.length) return 0;
        const { headH, rowHeights } = tableLayout(rows, colWeights, opts);
        return headH + rowHeights.reduce((a, b) => a + b, 0) + 12;
      };

      const drawTableSegment = (headers, rows, colWeights, opts, layout, rowOffsetGlobal) => {
        const { padX, padY, fontBody, headH, widths, rowHeights, cellPadW } = layout;
        const fontHead = opts.fontHead ?? 8;
        const x0 = M.l;
        let y0 = y;

        doc.setFillColor(...C.slate200);
        doc.setDrawColor(...C.border);
        doc.rect(x0, y0, contentW, headH, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(fontHead);
        doc.setTextColor(...C.slate900);
        let cx = x0 + padX;
        headers.forEach((h, i) => {
          const lines = doc.splitTextToSize(String(h), cellPadW(i));
          doc.text(lines, cx, y0 + 13);
          cx += widths[i];
        });
        y0 += headH;

        rows.forEach((row, ri) => {
          const rh = rowHeights[rowOffsetGlobal + ri];
          const stripe = (rowOffsetGlobal + ri) % 2 === 0;
          if (stripe) {
            doc.setFillColor(...C.stripe);
            doc.rect(x0, y0, contentW, rh, 'F');
          }
          doc.setDrawColor(...C.border);
          doc.rect(x0, y0, contentW, rh, 'S');
          let colX = x0 + padX;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(fontBody);
          doc.setTextColor(...C.slate900);
          row.forEach((cell, i) => {
            const lines = doc.splitTextToSize(String(cell ?? '—'), cellPadW(i));
            doc.text(lines, colX, y0 + padY + fontBody * 0.85);
            colX += widths[i];
          });
          y0 += rh;
        });

        y = y0 + 12;
      };

      /** Tabla con salto de página: repite encabezado en cada continuación. */
      const drawTablePaginated = (headers, rows, colWeights, opts = {}) => {
        if (!rows.length) return;
        const layout = tableLayout(rows, colWeights, opts);
        const { headH, rowHeights } = layout;
        let rowStart = 0;
        while (rowStart < rows.length) {
          if (remainingY() < headH + (rowHeights[rowStart] || 16) + 14) {
            doc.addPage();
            y = M.t;
          }
          let chunkEnd = rowStart;
          let used = headH;
          while (chunkEnd < rows.length) {
            const rh = rowHeights[chunkEnd];
            if (used + rh + 12 > remainingY()) {
              if (chunkEnd === rowStart) chunkEnd += 1;
              break;
            }
            used += rh;
            chunkEnd += 1;
          }
          if (chunkEnd === rowStart) chunkEnd = rowStart + 1;
          const slice = rows.slice(rowStart, chunkEnd);
          drawTableSegment(headers, slice, colWeights, opts, layout, rowStart);
          rowStart = chunkEnd;
          if (rowStart < rows.length) {
            doc.addPage();
            y = M.t;
          }
        }
      };

      const drawTable = (headers, rows, colWeights, opts = {}) => {
        drawTablePaginated(headers, rows, colWeights, opts);
      };

      const eventName = String(currentEvent?.name || currentEvent?.eventName || 'Evento').trim();
      const now = new Date().toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });

      ensure(64);
      doc.setFillColor(...C.indigo);
      doc.rect(M.l, y, contentW, 56, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(17);
      doc.setTextColor(...C.white);
      doc.text('Plan de transporte', M.l + 14, y + 24);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      const sub1 = doc.splitTextToSize(eventName, contentW - 28);
      doc.text(sub1, M.l + 14, y + 42);
      y += 66;

      doc.setDrawColor(...C.border);
      doc.setLineWidth(0.6);
      doc.roundedRect(M.l, y, contentW, 52, 4, 4, 'S');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...C.slate600);
      doc.text(`Tipo de evento: ${eventType || '—'}`, M.l + 12, y + 16);
      doc.text(`Generado: ${now}`, M.l + 12, y + 30);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.slate900);
      doc.text(`Unidades de camión (total): ${totalUnitsAll}`, M.l + 12, y + 44);
      doc.text(`Carros estimados: ${carsTotal}`, M.l + 280, y + 44);
      y += 62;

      const sectionTitle = (label, minNextContentH = 0) => {
        if (minNextContentH > 0) {
          startBlock(30 + minNextContentH);
        } else {
          ensure(30);
        }
        y += 4;
        doc.setFillColor(...C.slate100);
        doc.setDrawColor(...C.border);
        doc.roundedRect(M.l, y, contentW, 22, 3, 3, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...C.indigo);
        doc.text(label, M.l + 10, y + 15);
        doc.setTextColor(...C.slate900);
        y += 32;
      };

      sectionTitle('Transporte del evento (camión / camioneta)');
      const sections = busSectionsEffective;
      let anyBus = false;
      for (const section of sections) {
        const passengers = sortPassengersForDisplay(getPassengersForSection(section));
        const units = getUnitsForSede(plan, section.groupKey);
        if (!passengers.length && !units.length) continue;
        anyBus = true;
        const assigned = passengers.filter((row) => !!plan.busAssign[row.transportSourceKey || row.sourceKey]).length;

        const subHeadText = `${section.title}  ·  Pasajeros: ${passengers.length}  ·  Asignados: ${assigned}  ·  Unidades: ${units.length}`;
        const subHeadH = (() => {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9.5);
          const lines = doc.splitTextToSize(subHeadText, contentW);
          return 8 + lines.length * (9.5 * 1.15) + 10;
        })();

        const uRows = units.length
          ? units.map((u) => {
              const occ = countAssignedToUnit(plan, u.id);
              const cap = Math.max(1, parseInt(u.capacity, 10) || 1);
              return [u.label || '—', u.kind === 'van' ? 'Camioneta' : 'Camión', `${occ} / ${cap}`];
            })
          : [];

        const pHeaders =
          isCampa && splitCampaBySubevent
            ? ['No.', 'Pasajero', 'Sede', 'Segmento', 'Unidad asignada', 'Asistió']
            : ['No.', 'Pasajero', 'Sede', 'Unidad asignada', 'Asistió'];
        const pWeights =
          isCampa && splitCampaBySubevent ? [0.06, 0.31, 0.14, 0.13, 0.27, 0.09] : [0.07, 0.35, 0.16, 0.33, 0.09];
        const pRows = passengers.map((p) => {
          const assignKey = p.transportSourceKey || p.sourceKey;
          const uid = plan.busAssign[assignKey] || '';
          const unit = units.find((x) => String(x.id) === String(uid));
          const unitLabel = unit ? unit.label : 'Sin asignar';
          const num = nextRegNum();
          if (isCampa && splitCampaBySubevent) {
            return [num, p.name, p.location || '—', String(p.campaSegment || '—'), unitLabel, '[ ]'];
          }
          return [num, p.name, p.location || '—', unitLabel, '[ ]'];
        });

        const uH = uRows.length ? measureTable(['Unidad', 'Tipo', 'Ocupación / plazas'], uRows, [0.52, 0.22, 0.26]) : 22;
        const pH = pRows.length ? measureTable(pHeaders, pRows, pWeights) : 0;
        startBlock(subHeadH + uH + pH + 16);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(...C.slate900);
        const sh = drawWrapped(subHeadText, M.l, y + 8, contentW, 9.5, 'bold');
        y += 8 + sh + 10;

        if (uRows.length) {
          drawTablePaginated(['Unidad', 'Tipo', 'Ocupación / plazas'], uRows, [0.52, 0.22, 0.26]);
        } else {
          ensure(16);
          doc.setFontSize(8);
          doc.setTextColor(...C.slate600);
          doc.text('Sin unidades definidas en esta sección.', M.l + 4, y);
          y += 18;
        }

        if (pRows.length) {
          drawTablePaginated(pHeaders, pRows, pWeights);
        }
        y += 4;
      }
      if (!anyBus) {
        ensure(20);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(...C.slate600);
        doc.text('No hay secciones de camión con pasajeros o unidades en este plan.', M.l + 4, y);
        doc.setFont('helvetica', 'normal');
        y += 22;
      }

      const seatsForSlotting = Math.max(1, parseInt(plan.bautizosCarCapacity, 10) || 5);

      const resolvePdfGroupLeader = (grp) => {
        const hosts = Array.isArray(grp?.hosts) ? grp.hosts : [];
        if (!hosts.length) return null;
        const manualHostId = String(plan?.bautizosGroupTitularByGroupId?.[String(grp?.groupId || '')] || '').trim();
        if (manualHostId) {
          const pick = hosts.find((h) => String(h?.hostId || '').trim() === manualHostId);
          if (pick) return pick;
        }
        const adults = hosts.filter((h) => Number.isFinite(h?.hostAge) && h.hostAge >= 18);
        if (adults.length > 0) {
          return [...adults].sort((a, b) => (b.hostAge || 0) - (a.hostAge || 0))[0] || null;
        }
        return hosts[0] || null;
      };

      const getHostParticipantSourceKeyPdf = (host) => {
        const participantLine = (host?.lines || []).find((ln) => ln?.kind === 'participant');
        if (participantLine?.sourceKey) return String(participantLine.sourceKey);
        const hid = String(host?.hostId || '').trim();
        return hid ? `p:${hid}` : '';
      };

      const carSectionMinContentH = carLines.length ? 96 : 24;
      sectionTitle('Llegan en carro (vehículo particular)', carSectionMinContentH);
      if (!carLines.length) {
        ensure(20);
        doc.setFontSize(9);
        doc.setTextColor(...C.slate600);
        doc.text('No hay registros que lleguen en carro.', M.l + 4, y);
        y += 22;
      } else {
        let displayGroups = bautizosCarDisplayGroups;
        if (isBautizos && (!displayGroups || displayGroups.length === 0) && bautizosFamilyInfo?.size) {
          displayGroups = [];
          for (const [hostId, fam] of bautizosFamilyInfo.entries()) {
            const lines = fam.lines || [];
            const participantLine = lines.find((l) => l.kind === 'participant') || lines[0];
            displayGroups.push({
              groupId: hostId,
              isFamily: false,
              hosts: [
                {
                  hostId,
                  hostName: String(participantLine?.name || '—').trim(),
                  location: String(participantLine?.location || '').trim() || '—',
                  hostAge: null,
                  lines,
                  memberKeys: fam.memberKeys || [],
                  hostCarros: fam.hostCarros ?? 1,
                },
              ],
              lines,
            });
          }
        }

        const buildNonBautizosBlocks = () => {
          const blocks = [];
          const usedGroupIds = new Set();
          for (const line of carLines) {
            const g = keyToGroup.get(line.sourceKey);
            if (g && (g.memberKeys || []).length > 1 && !usedGroupIds.has(g.id)) {
              usedGroupIds.add(g.id);
              const memberLines = carLines.filter((l) => (g.memberKeys || []).includes(String(l.sourceKey).trim()));
              const c = parseInt(g.cars, 10);
              const K =
                Number.isFinite(c) && c >= 1 ? c : Math.max(1, Math.ceil(memberLines.length / seatsForSlotting));
              const titularLine = memberLines.find((l) => l.kind === 'participant') || memberLines[0];
              const slots = assignBautizosMembersToCarSlots(memberLines, K, seatsForSlotting, evRosterFiltered);
              blocks.push({
                kind: 'group',
                title: getCarGroupDisplayLabel(g),
                titularName: String(titularLine?.name || '—'),
                titularHostId: String(titularLine?.hostId || titularLine?.sourceKey || ''),
                titularSk: String(titularLine?.sourceKey || ''),
                effCars: K,
                slots,
              });
            }
          }
          for (const line of carLines) {
            const g = keyToGroup.get(line.sourceKey);
            if (g && (g.memberKeys || []).length > 1) continue;
            const eff = effectiveCarsForCarLine(line, plan, keyToGroup, isBautizos, bautizosFamilyInfo);
            const slots = assignBautizosMembersToCarSlots([line], eff, seatsForSlotting, evRosterFiltered);
            blocks.push({
              kind: 'single',
              title: 'Vehículo individual',
              titularName: String(line.name || '—'),
              titularHostId: String(line.hostId || line.sourceKey || ''),
              titularSk: String(line.sourceKey || ''),
              effCars: eff,
              slots,
            });
          }
          return blocks;
        };

        const carBlocks =
          isBautizos && displayGroups?.length
            ? displayGroups
                .map((grp, gi) => {
                const leader = resolvePdfGroupLeader(grp);
                const leaderHost = leader || grp.hosts?.[0];
                const leaderHostId = String(leaderHost?.hostId || '').trim();
                const carCtx = resolveHostCarContext(leaderHostId);
                const titularSk = carCtx.hostSourceKey;
                const pdfManualKeys = new Set(
                  buildManualCarGroupViews(plan, carLines).flatMap((v) => v.memberKeys || [])
                );
                const filteredLines = (grp.lines || []).filter(
                  (l) => !pdfManualKeys.has(String(l.sourceKey || '').trim())
                );
                if (filteredLines.length === 0) return null;
                const eff = resolveDisplayGroupCars(grp);
                const slots = buildBautizosCarSlotsForTransport({
                  plan,
                  hostSourceKey: titularSk,
                  effectiveCars: eff,
                  hostPerson: carCtx.hostPerson,
                  companions: carCtx.companions,
                  labelIndex: carCtx.labelIndex,
                  fallbackLines: filteredLines,
                  roster: evRosterFiltered,
                  seatsPerCar: seatsForSlotting,
                });
                const titleBase = grp.isFamily ? `Grupo familiar ${gi + 1}` : `Registro ${gi + 1}`;
                return {
                  kind: 'bautizos',
                  title: `${titleBase} · ${filteredLines.length} persona${filteredLines.length !== 1 ? 's' : ''}`,
                  titularName: String(leader?.hostName || grp.hosts?.[0]?.hostName || '—'),
                  titularHostId: String(leader?.hostId || grp.hosts?.[0]?.hostId || ''),
                  titularSk,
                  effCars: eff,
                  slots,
                  grp,
                };
              })
                .filter(Boolean)
            : buildNonBautizosBlocks();

        const manualPdfBlocks = isBautizos
          ? buildManualCarGroupViews(plan, carLines).map((view) => {
              const titularLine =
                view.memberLines.find((l) => l.kind === 'participant') || view.memberLines[0];
              const slots = assignBautizosMembersToCarSlots(
                view.memberLines,
                view.effectiveCars,
                seatsForSlotting,
                evRosterFiltered
              );
              return {
                kind: 'manual',
                title: `${view.label} · ${view.memberLines.length} personas · carro compartido`,
                titularName: String(titularLine?.name || '—'),
                titularHostId: String(titularLine?.hostId || ''),
                titularSk: view.titularSk,
                effCars: view.effectiveCars,
                slots,
                savingsNote:
                  view.carsBeforeMerge > view.effectiveCars
                    ? `Registro: ${view.carsBeforeMerge} carro(s) → Plan: ${view.effectiveCars} compartido(s)`
                    : '',
              };
            })
          : [];

        const allCarBlocks = [...manualPdfBlocks, ...carBlocks];

        const estimateCarBlockHeight = (blk) => {
          let h = 34 + 14 + 12 + 8;
          blk.slots.forEach((slot) => {
            const vm = getCarMetaForExport(blk.titularSk, slot.carIndex);
            const vLine = [vm.brand, vm.model].filter(Boolean).join(' ') || '—';
            doc.setFontSize(8.5);
            const tentative = vm.maybeAbsent ? ' · Quizá no vaya' : '';
            const vwrap = doc.splitTextToSize(
              `Vehículo carro ${slot.carIndex}: ${vLine} · Color: ${vm.color || '—'} · Placas: ${vm.plates || '—'}${tentative}`,
              contentW - 8
            );
            h += vwrap.length * 10 + 8;
            const rowsForMeasure = slot.members.map((m) => {
              const line = carLines.find((l) => String(l.sourceKey) === String(m.sourceKey));
              const isTit =
                String(m.kind) === 'participant' && String(line?.hostId || '') === String(blk.titularHostId || '');
              return ['—', m.name, line?.location || '—', isTit ? 'Titular del vehículo' : 'Acompañante', '[ ]'];
            });
            h += 14 + measureTable(['No.', 'Nombre', 'Sede', 'Rol', 'Asistió'], rowsForMeasure, [0.08, 0.33, 0.17, 0.33, 0.09], {
              fontBody: 7.5,
              minRowH: 15,
              headH: 18,
            });
            h += 6;
          });
          h += 8;
          return h;
        };

        allCarBlocks.forEach((blk, bi) => {
          startBlock(estimateCarBlockHeight(blk) + 24);

          doc.setFillColor(...C.indigoSoft);
          doc.setDrawColor(...C.indigo);
          doc.setLineWidth(0.8);
          doc.roundedRect(M.l, y, contentW, 26, 3, 3, 'FD');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(...C.indigo);
          doc.text(`${bi + 1}. ${blk.title}`, M.l + 10, y + 17);
          y += 34;

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(...C.slate900);
          doc.text(`Titular del registro / contacto: ${blk.titularName}`, M.l + 4, y);
          y += 14;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(...C.slate600);
          doc.text(
            `Carros físicos en este grupo: ${blk.effCars} · Confirmados: ${countConfirmedCarsInSet(plan, blk.titularSk, blk.effCars)} · Plazas de referencia por carro: ${seatsForSlotting}`,
            M.l + 4,
            y
          );
          y += 12;
          if (blk.savingsNote) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(22, 101, 52);
            doc.text(blk.savingsNote, M.l + 4, y);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...C.slate600);
            y += 12;
          }

          blk.slots.forEach((slot) => {
            const nMembers = slot.members.length;
            const vm = getCarMetaForExport(blk.titularSk, slot.carIndex);
            const slotRowsPreview = slot.members.map((m) => {
              const line = carLines.find((l) => String(l.sourceKey) === String(m.sourceKey));
              const isTit =
                String(m.kind) === 'participant' && String(line?.hostId || '') === String(blk.titularHostId || '');
              return ['—', m.name, line?.location || '—', isTit ? 'Titular del vehículo' : 'Acompañante', '[ ]'];
            });
            const slotH =
              14 +
              measureTable(['No.', 'Nombre', 'Sede', 'Rol', 'Asistió'], slotRowsPreview, [0.08, 0.33, 0.17, 0.33, 0.09], {
                fontBody: 7.5,
                minRowH: 15,
                headH: 18,
              }) +
              8;
            startBlock(slotH);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(...C.indigo);
            doc.text(
              `Carro ${slot.carIndex} de ${blk.effCars} · ${nMembers} persona${nMembers !== 1 ? 's' : ''} (mismo vehículo)${vm.maybeAbsent ? ' · Quizá no vaya' : ''}`,
              M.l + 4,
              y
            );
            y += 14;
            const vLine = [vm.brand, vm.model].filter(Boolean).join(' ') || '—';
            const vmLine = `Vehículo: ${vLine} · Color: ${vm.color || '—'} · Placas: ${vm.plates || '—'}`;
            const vh = drawWrapped(vmLine, M.l + 4, y, contentW - 8, 8.5, 'normal', C.slate900);
            y += vh + 6;
            const slotRows = slot.members.map((m) => {
              const line = carLines.find((l) => String(l.sourceKey) === String(m.sourceKey));
              const isTit =
                String(m.kind) === 'participant' && String(line?.hostId || '') === String(blk.titularHostId || '');
              return [nextRegNum(), m.name, line?.location || '—', isTit ? 'Titular del vehículo' : 'Acompañante', '[ ]'];
            });
            drawTablePaginated(['No.', 'Nombre', 'Sede', 'Rol', 'Asistió'], slotRows, [0.08, 0.33, 0.17, 0.33, 0.09], {
              fontBody: 7.5,
              minRowH: 15,
              headH: 18,
            });
          });
          y += 8;
        });
      }

      drawFooterPageNums();

      const safeEvent = (eventName || 'evento').replace(/[^\w\-]+/g, '_');
      doc.save(`plan_transporte_${safeEvent}.pdf`);
      showToast('PDF exportado.');
    } catch (e) {
      console.error(e);
      showToast('No se pudo exportar el PDF de transporte.');
    }
  };

  const setDefaultCaps = (field, value) => {
    const n = clampInt(value, 1, 200);
    setPlan((prev) => ({ ...prev, [field]: n }));
  };

  const addUnit = (section, kind) => {
    const groupKey = String(section?.groupKey || '').trim() || '—';
    const { sedeBase } = parseBusGroupKey(groupKey);
    setPlan((prev) => {
      const next = normalizeTransportPlanning(prev);
      const list = [...getUnitsForSede(next, groupKey)];
      const cap = kind === 'van' ? next.defaultVanCap : next.defaultBusCap;
      const id = makeBusUnitId();
      list.push({
        id,
        kind: kind === 'van' ? 'van' : 'bus',
        capacity: cap,
        label: defaultVehicleLabel(sedeBase, list.length - 1, kind, section?.subevent || ''),
      });
      return { ...next, unitsByLocation: { ...next.unitsByLocation, [groupKey]: list } };
    });
  };

  const updateUnit = (groupKey, unitId, patch) => {
    const gk = String(groupKey || '').trim();
    setPlan((prev) => {
      const next = normalizeTransportPlanning(prev);
      const list = getUnitsForSede(next, gk).map((u) => (String(u.id) === String(unitId) ? { ...u, ...patch } : u));
      return { ...next, unitsByLocation: { ...next.unitsByLocation, [gk]: list } };
    });
  };

  const removeUnit = (groupKey, unitId) => {
    const gk = String(groupKey || '').trim();
    setPlan((prev) => {
      const next = normalizeTransportPlanning(prev);
      const list = getUnitsForSede(next, gk).filter((u) => String(u.id) !== String(unitId));
      const busAssign = { ...next.busAssign };
      for (const [k, v] of Object.entries(busAssign)) {
        if (String(v) === String(unitId)) delete busAssign[k];
      }
      return { ...next, unitsByLocation: { ...next.unitsByLocation, [gk]: list }, busAssign };
    });
  };

  const suggestUnitsForGroup = (section, passengerCount) => {
    const groupKey = String(section?.groupKey || '').trim();
    const { sedeBase } = parseBusGroupKey(groupKey);
    const nPass = passengerCount;
    if (nPass === 0) {
      showToast('No hay pasajeros en camión en este bloque.');
      return;
    }
    setPlan((prev) => {
      const next = normalizeTransportPlanning(prev);
      const cap = next.defaultBusCap;
      const count = Math.max(1, Math.ceil(nPass / cap));
      const list = [];
      for (let i = 0; i < count; i++) {
        list.push({
          id: makeBusUnitId(),
          kind: 'bus',
          capacity: cap,
          label: defaultVehicleLabel(sedeBase, i, 'bus', section?.subevent || ''),
        });
      }
      return { ...next, unitsByLocation: { ...next.unitsByLocation, [groupKey]: list } };
    });
  };

  const assignBus = (sourceKey, unitId) => {
    const sk = String(sourceKey || '').trim();
    const uid = String(unitId || '').trim();
    setPlan((prev) => {
      const next = normalizeTransportPlanning(prev);
      const busAssign = { ...next.busAssign };
      if (!uid) delete busAssign[sk];
      else busAssign[sk] = uid;
      return { ...next, busAssign };
    });
  };

  const [carPick, setCarPick] = useState(() => new Set());

  const toggleCarPick = (sk) => {
    setCarPick((prev) => {
      const n = new Set(prev);
      if (n.has(sk)) n.delete(sk);
      else n.add(sk);
      return n;
    });
  };

  const mergeSelectedCars = async () => {
    if (mergingManualGroup) return;
    const keys = [...carPick].filter(Boolean);
    if (keys.length < 2) {
      showToast('Selecciona al menos dos personas para compartir carro.');
      return;
    }
    const memberLines = keys
      .map((k) => carLines.find((l) => String(l.sourceKey || '').trim() === String(k).trim()))
      .filter(Boolean);
    const titularSks = memberLines
      .filter((l) => String(l?.kind || '') === 'participant')
      .map((l) => String(l.sourceKey || '').trim())
      .filter(Boolean);

    setMergingManualGroup(true);
    try {
      showToast('Cargando datos de carro…');
      const hydratedCache = await hydrateCarMetaCacheForTitulars(
        eventId,
        titularSks,
        plan,
        loadedCarMetaByKey
      );
      const workingPlan = mergeCarMetaCacheIntoPlan(plan, hydratedCache);
      const sourcesWithData = listManualGroupTitularCarMetaSources(
        workingPlan,
        titularSks,
        evRosterFiltered
      );
      if (sourcesWithData.length >= 2) {
        setMergeConflictModal({
          keys,
          memberLines,
          titularSks,
          sources: sourcesWithData,
          selectedSourceSk: sourcesWithData[0]?.titularSk || titularSks[0],
          anchorTitularSk: sourcesWithData[0]?.titularSk || titularSks[0],
          orphanMode: 'maybeAbsent',
          hydratedCache,
        });
        return;
      }
      if (sourcesWithData.length === 1) {
        const sourceSk = sourcesWithData[0]?.titularSk || titularSks[0];
        finalizeManualGroupMerge(keys, memberLines, sourceSk, sourceSk, 'maybeAbsent', hydratedCache);
        return;
      }
      finalizeManualGroupMerge(keys, memberLines, titularSks[0], null, 'maybeAbsent', hydratedCache);
    } catch (e) {
      console.error(e);
      showToast('No se pudo fusionar el grupo de carro.');
    } finally {
      setMergingManualGroup(false);
    }
  };

  const finalizeManualGroupMerge = (
    keys,
    memberLines,
    anchorTitularSk,
    dataSourceSk,
    orphanMode,
    hydratedCache = null
  ) => {
    const cache = hydratedCache && typeof hydratedCache === 'object' ? hydratedCache : {};
    const anchorSk = String(anchorTitularSk || '').trim() || manualGroupParticipantSourceKeys({ memberKeys: keys })[0] || '';
    const anchorHostId = anchorSk.startsWith('p:') ? anchorSk.slice(2) : '';
    const dataFrom = String(dataSourceSk || anchorSk).trim() || anchorSk;
    const inheritedCars = manualGroupMaxRegisteredCars(memberLines);
    const titularSks = manualGroupParticipantSourceKeys({ memberKeys: keys });
    const otherTitulars = titularSks.filter((sk) => sk !== anchorSk);

    setPlan((prev) => {
      let next = mergeCarMetaCacheIntoPlan(prev, cache);
      let groups = Array.isArray(next.carGroups) ? [...next.carGroups] : [];
      groups = groups
        .map((g) => ({
          ...g,
          memberKeys: (g.memberKeys || []).filter((k) => !keys.includes(k)),
        }))
        .filter((g) => (g.memberKeys || []).length > 1);
      const groupId = `cg-${Date.now()}`;
      groups.push({ id: groupId, memberKeys: keys, cars: inheritedCars });
      const titularMap = { ...(next.bautizosGroupTitularByGroupId || {}) };
      if (anchorHostId) titularMap[groupId] = anchorHostId;
      next = { ...next, carGroups: groups, bautizosGroupTitularByGroupId: titularMap };

      let patches = [];
      if (dataFrom && dataFrom !== anchorSk) {
        patches.push(...buildCopyTitularCarMetaPatches(next, dataFrom, anchorSk, inheritedCars));
        next = mergeCarMetaPatchesIntoPlan(next, patches);
        patches = [];
      } else if (dataFrom && titularSourceKeyHasCarMetaCaptured(next, anchorSk)) {
        next = materializeTitularCarMetaOnPlan(next, anchorSk, inheritedCars).plan;
      }
      const { patches: orphanPatches, keysToRemove } = buildManualGroupOrphanCarMetaCleanup(
        next,
        otherTitulars,
        orphanMode
      );
      patches = [...patches, ...orphanPatches];
      next = mergeCarMetaPatchesIntoPlan(next, patches);
      next = removeCarMetaKeysFromPlan(next, keysToRemove);
      patches = buildDefaultManualGroupCrewPatches(next, anchorSk, keys, inheritedCars);
      next = mergeCarMetaPatchesIntoPlan(next, patches);
      return applyCarMetaPassengerInheritance(next);
    });

    setLoadedCarMetaByKey((prev) => ({ ...prev, ...cache }));
    setFetchedTitularSks((prev) => {
      const next = new Set(prev);
      for (const sk of titularSks) next.add(sk);
      return next;
    });
    for (let i = 1; i <= inheritedCars; i += 1) {
      queueCarMetaSave(carVehicleMetaStorageKey(anchorSk, i));
    }

    setCarPick(new Set());
    setMergeConflictModal(null);
    showToast(
      `Grupo manual creado: ${keys.length} persona${keys.length !== 1 ? 's' : ''} · ${inheritedCars} carro${inheritedCars !== 1 ? 's' : ''}.`
    );
    if (typeof onTransportUiPrefsChange === 'function') {
      onTransportUiPrefsChange((prev) => ({ ...prev, manualCarGroupsOpen: true }));
    }
  };

  const setManualGroupLeader = (view, hostId) => {
    const gid = String(view?.id || '').trim();
    const hid = String(hostId || '').trim();
    const newAnchorSk = hid ? `p:${hid}` : '';
    const prevAnchorSk = String(view?.titularSk || '').trim();
    if (!gid || !hid || !newAnchorSk || newAnchorSk === prevAnchorSk) return;
    const effectiveCars = view?.effectiveCars || 1;
    setPlan((prev) => {
      let next = normalizeTransportPlanning(prev);
      const titularMap = { ...(next.bautizosGroupTitularByGroupId || {}), [gid]: hid };
      next = { ...next, bautizosGroupTitularByGroupId: titularMap };
      const copyPatches = buildCopyTitularCarMetaPatches(next, prevAnchorSk, newAnchorSk, effectiveCars);
      next = mergeCarMetaPatchesIntoPlan(next, copyPatches);
      return applyCarMetaPassengerInheritance(next);
    });
    showToast('Titular del grupo manual actualizado. Los datos de carro se copiaron al nuevo titular.');
  };

  const unmergeManualCarGroup = (groupId) => {
    const gid = String(groupId || '').trim();
    if (!gid) return;
    setPlan((prev) => {
      const next = normalizeTransportPlanning(prev);
      return {
        ...next,
        carGroups: (next.carGroups || []).filter((g) => String(g.id || '').trim() !== gid),
      };
    });
    showToast('Grupo separado. Cada registro vuelve a contarse por separado.');
  };

  const applyBautizosFamilies = () => {
    if (!isBautizos) return;
    const suggested = suggestBautizosFamilyCarGroups(carLines);
    if (suggested.length === 0) {
      showToast('No hay familias con varios integrantes en carro para agrupar.');
      return;
    }
    setPlan((prev) => {
      const next = normalizeTransportPlanning(prev);
      const cap = Math.max(1, parseInt(next.bautizosCarCapacity, 10) || 5);
      const merged = [...(next.carGroups || []).filter((g) => !String(g.id || '').startsWith('fam-'))];
      for (const g of suggested) {
        const fromReg = parseInt(g.cars, 10);
        const cars =
          Number.isFinite(fromReg) && fromReg >= 1
            ? fromReg
            : Math.max(1, Math.ceil(g.memberKeys.length / cap));
        merged.push({ ...g, cars });
      }
      return { ...next, carGroups: merged };
    });
    showToast('Familias agrupadas (carros según registro del titular; ajusta plazas o override si aplica).');
  };

  const setGroupCars = (groupId, cars) => {
    const c = clampInt(cars, 1, 99);
    setPlan((prev) => {
      const next = normalizeTransportPlanning(prev);
      const groups = (next.carGroups || []).map((g) =>
        String(g.id) === String(groupId) ? { ...g, cars: c } : g
      );
      return { ...next, carGroups: groups };
    });
  };

  const setFamilyOverride = (hostId, cars) => {
    const h = String(hostId || '').trim();
    if (!h) return;
    const c = clampInt(cars, 1, 99);
    setPlan((prev) => {
      const next = normalizeTransportPlanning(prev);
      const familyCarOverride = { ...(next.familyCarOverride || {}) };
      familyCarOverride[h] = c;
      return { ...next, familyCarOverride };
    });
  };

  const resolveCampaAmbosTransit = (sourceKey) => {
    const sk = String(sourceKey || '').trim();
    const raw = plan?.campaAmbosTransitBySource?.[sk];
    return {
      teenArrive: raw?.teenArrive !== false,
      teenReturn: raw?.teenReturn === true,
      jovenArrive: raw?.jovenArrive === true,
      jovenReturn: raw?.jovenReturn !== false,
    };
  };

  const setCampaAmbosTransit = (sourceKey, patch) => {
    const sk = String(sourceKey || '').trim();
    if (!sk) return;
    setPlan((prev) => {
      const next = normalizeTransportPlanning(prev);
      const cur = next?.campaAmbosTransitBySource?.[sk] && typeof next.campaAmbosTransitBySource[sk] === 'object'
        ? next.campaAmbosTransitBySource[sk]
        : {};
      const campaAmbosTransitBySource = {
        ...(next.campaAmbosTransitBySource || {}),
        [sk]: { ...cur, ...patch },
      };
      return { ...next, campaAmbosTransitBySource };
    });
  };

  const getCarMeta = (sourceKey, carIndex = 1) =>
    getCarVehicleMetaFromPlan(planForCarMetaRead, sourceKey, carIndex);

  const renderCollapsedCarMetaCells = (ownerSk, carIndex = 1) => {
    const meta = getCarMeta(ownerSk, carIndex);
    const cellCls = 'px-3 py-2 text-slate-700 dark:text-slate-200 text-[10px] font-semibold';
    const pend = (field) => {
      const v = formatCarMetaDisplayValue(meta, field);
      return v === 'Pendiente' ? (
        <span className="text-amber-700 dark:text-amber-300 font-bold">Pendiente</span>
      ) : (
        v || '—'
      );
    };
    return (
      <>
        <td className={cellCls}>{pend('brand')}</td>
        <td className={cellCls}>{pend('model')}</td>
        <td className={cellCls}>{pend('color')}</td>
        <td className={cellCls}>{pend('plates')}</td>
      </>
    );
  };

  const buildMemberOptionsFromGroup = (g, lines) => {
    const lineByKey = new Map((lines || []).map((ln) => [String(ln.sourceKey || '').trim(), ln]));
    return (g?.memberKeys || [])
      .map((k) => {
        const sk = String(k || '').trim();
        const ln = lineByKey.get(sk);
        if (!ln) return null;
        return {
          sourceKey: sk,
          label: String(ln.name || '').trim() || '—',
          kind: ln.kind === 'participant' ? 'host' : 'companion',
        };
      })
      .filter(Boolean);
  };

  const buildMemberOptionsFromLines = (lines) =>
    (lines || []).map((ln) => ({
      sourceKey: String(ln.sourceKey || '').trim(),
      label: String(ln.name || '').trim() || '—',
      kind: ln.kind === 'participant' ? 'host' : 'companion',
    }));

  const writeCarMetaAtKey = useCallback(
    (storageKey, patch) => {
      const sk = String(storageKey || '').trim();
      if (!sk || !patch || typeof patch !== 'object') return;
      const mergedRead = mergeCarMetaCacheIntoPlan(planRef.current, loadedCarMetaRef.current);
      const current =
        mergedRead?.carMetaBySource?.[sk] && typeof mergedRead.carMetaBySource[sk] === 'object'
          ? mergedRead.carMetaBySource[sk]
          : {};
      const nextMeta = { ...current };
      for (const [k, v] of Object.entries(patch)) {
        if (k === 'maybeAbsent') nextMeta.maybeAbsent = v === true;
        else if (k.startsWith('pending')) nextMeta[k] = v === true;
        else if (k === 'passengerSourceKeys') {
          nextMeta.passengerSourceKeys = Array.isArray(v)
            ? v.map((x) => String(x || '').trim()).filter(Boolean)
            : [];
        } else if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
          nextMeta[k] = String(v ?? '');
        }
      }
      setPlan((prev) => ({
        ...prev,
        carMetaBySource: { ...(prev.carMetaBySource || {}), [sk]: nextMeta },
      }));
      setLoadedCarMetaByKey((prev) => ({ ...prev, [sk]: nextMeta }));
      queueCarMetaSave(sk);
    },
    [queueCarMetaSave]
  );

  const setCarMetaField = (sourceKey, field, value, carIndex = 1) => {
    const key = carVehicleMetaStorageKey(sourceKey, carIndex);
    if (field === 'maybeAbsent') {
      writeCarMetaAtKey(key, { maybeAbsent: value === true });
      return;
    }
    writeCarMetaAtKey(key, { [field]: value });
  };

  const setCarMetaPatch = useCallback(
    (sourceKey, patch, carIndex = 1) => {
      const key = carVehicleMetaStorageKey(sourceKey, carIndex);
      writeCarMetaAtKey(key, patch);
    },
    [writeCarMetaAtKey]
  );

  const applyCarCrewPatches = useCallback(
    (patches) => {
      if (!Array.isArray(patches) || patches.length === 0) return;
      const nextPlan = mergeCarMetaPatchesIntoPlan(planRef.current, patches);
      const mergedRead = mergeCarMetaCacheIntoPlan(nextPlan, loadedCarMetaRef.current);
      const cacheNext = { ...loadedCarMetaRef.current };
      for (const item of patches) {
        const vk = String(item?.vehicleKey || '').trim();
        if (vk && mergedRead?.carMetaBySource?.[vk]) {
          cacheNext[vk] = mergedRead.carMetaBySource[vk];
        }
      }
      setPlan(nextPlan);
      setLoadedCarMetaByKey(cacheNext);
      queueCarMetaSavesForPatches(patches);
    },
    [queueCarMetaSavesForPatches]
  );
  const trySetCarMaybeAbsent = (titularSk, carIndex, nextVal, effectiveCars) => {
    const K = Math.max(1, parseInt(effectiveCars, 10) || 1);
    if (K < 2) return;
    if (!nextVal) {
      setCarMetaField(titularSk, 'maybeAbsent', false, carIndex);
      return;
    }
    const confirmed = countConfirmedCarsInSet(plan, titularSk, K);
    const cur = getCarVehicleMetaFromPlan(plan, titularSk, carIndex);
    if (cur.maybeAbsent) return;
    if (confirmed <= 1) {
      showToast('Debe quedar al menos un carro confirmado (sin marcar «quizá no vaya»).');
      return;
    }
    setCarMetaField(titularSk, 'maybeAbsent', true, carIndex);
  };

  const setAllCarsMaybeAbsentExcept = (titularSk, effectiveCars, keepCarIndex = 1) => {
    const K = Math.max(1, parseInt(effectiveCars, 10) || 1);
    if (K < 2) return;
    const keep = Math.min(K, Math.max(1, parseInt(keepCarIndex, 10) || 1));
    for (let i = 1; i <= K; i++) {
      setCarMetaField(titularSk, 'maybeAbsent', i !== keep, i);
    }
  };

  const clearAllCarsMaybeAbsent = (titularSk, effectiveCars) => {
    const K = Math.max(1, parseInt(effectiveCars, 10) || 1);
    for (let i = 1; i <= K; i++) {
      setCarMetaField(titularSk, 'maybeAbsent', false, i);
    }
  };

  const renderCarVehicleMetaBlock = (titularSk, carIndex, effectiveCars, opts = {}) => {
    const meta = getCarMeta(titularSk, carIndex);
    const K = Math.max(1, parseInt(effectiveCars, 10) || 1);
    const memberOptions = opts.memberOptions || [];
    const requirePassengers =
      opts.requirePassengers ??
      (memberOptions.length > 1 || memberOptions.some((m) => m.kind === 'companion'));
    const vehicleKey = carVehicleMetaStorageKey(titularSk, carIndex);
    const inventory = buildCarInventorySlotsForOwner(planForCarMetaRead, titularSk, K);
    const assignedOnOtherCars = collectAssignedCrewSourceKeysOnOtherCars(inventory, vehicleKey);
    const driverSk = String(meta?.driverSourceKey || '');
    let driverMemberOptions = filterDriverMemberOptions(memberOptions, assignedOnOtherCars);
    if (driverSk && !driverMemberOptions.some((m) => String(m.sourceKey) === driverSk)) {
      const currentDriver = memberOptions.find((m) => String(m.sourceKey) === driverSk);
      if (currentDriver) driverMemberOptions = [currentDriver, ...driverMemberOptions];
    }
    const passengerMemberOptions = filterDriverMemberOptions(
      memberOptions.filter((m) => String(m.sourceKey) !== driverSk),
      assignedOnOtherCars
    );
    return (
      <div key={`${titularSk}-car-wrap-${carIndex}`} className="space-y-2">
        <CarVehicleMetaPanel
          key={`${titularSk}-car-${carIndex}`}
          carIndex={carIndex}
          meta={meta}
          canEdit={canEdit}
          compact={opts.compact}
          showMaybeAbsent={K >= 2}
          showPendingToggles={canEdit}
          carCatalogView={carCatalogView}
          colorSuggestions={carColorSuggestions}
          onFieldChange={(field, value, extra) => {
            if (field === 'brand' && extra?.resetModel) {
              setCarMetaPatch(titularSk, { brand: value, model: '', pendingBrand: false }, carIndex);
              return;
            }
            const pendingKey = `pending${field.charAt(0).toUpperCase()}${field.slice(1)}`;
            setCarMetaPatch(titularSk, { [field]: value, [pendingKey]: false }, carIndex);
          }}
          onPendingFieldChange={(field, checked) => {
            const pendingKey = `pending${field.charAt(0).toUpperCase()}${field.slice(1)}`;
            setCarMetaPatch(titularSk, { [pendingKey]: checked }, carIndex);
          }}
          onMaybeAbsentChange={(checked) => trySetCarMaybeAbsent(titularSk, carIndex, checked, K)}
        />
        {!meta.maybeAbsent && memberOptions.length > 0 ? (
          <BautizosCarCrewFields
            meta={meta}
            memberOptions={memberOptions}
            driverMemberOptions={driverMemberOptions}
            passengerMemberOptions={passengerMemberOptions}
            requirePassengers={requirePassengers}
            canEdit={canEdit}
            compact={opts.compact}
            onDriverChange={(sk) =>
              applyCarCrewPatches(
                buildCarCrewAssignmentPatches({
                  inventory,
                  vehicleKey,
                  patch: {
                    driverSourceKey: sk,
                    pendingDriver: false,
                    passengerSourceKeys: (meta.passengerSourceKeys || []).filter((p) => p !== sk),
                  },
                  exclusivePersonKeys: sk ? [sk] : [],
                  roster: evRosterFiltered,
                })
              )
            }
            onPassengersChange={(keys) =>
              applyCarCrewPatches(
                buildCarCrewAssignmentPatches({
                  inventory,
                  vehicleKey,
                  patch: { passengerSourceKeys: keys, pendingPassengers: false },
                  exclusivePersonKeys: keys,
                  roster: evRosterFiltered,
                })
              )
            }
            onPendingDriverChange={(checked) =>
              setCarMetaPatch(
                titularSk,
                { pendingDriver: checked, ...(checked ? { driverSourceKey: '' } : {}) },
                carIndex
              )
            }
            onPendingPassengersChange={(checked) =>
              setCarMetaPatch(
                titularSk,
                { pendingPassengers: checked, ...(checked ? { passengerSourceKeys: [] } : {}) },
                carIndex
              )
            }
          />
        ) : null}
      </div>
    );
  };

  const renderCarVehicleBulkActions = (titularSk, effectiveCars) => {
    const K = Math.max(1, parseInt(effectiveCars, 10) || 1);
    if (K < 2 || !canEdit) return null;
    const confirmed = countConfirmedCarsInSet(plan, titularSk, K);
  return (
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
          {confirmed} confirmado{confirmed !== 1 ? 's' : ''} · {K - confirmed} quizá no vaya{K - confirmed !== 1 ? 'n' : ''}
        </span>
        <label className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
          Solo confirmar carro
          <select
            className={`${inputSm} w-auto min-w-[4.5rem]`}
            defaultValue="1"
            onChange={(e) => setAllCarsMaybeAbsentExcept(titularSk, K, e.target.value)}
          >
            {Array.from({ length: K }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className={btnSecondary} onClick={() => setAllCarsMaybeAbsentExcept(titularSk, K, 1)}>
          Marcar todos menos el 1.º
        </button>
        <button type="button" className={btnSecondary} onClick={() => clearAllCarsMaybeAbsent(titularSk, K)}>
          Confirmar todos
        </button>
      </div>
    );
  };

  const resolveDefaultGroupLeader = (grp) => {
    const adults = (grp?.hosts || []).filter((h) => Number.isFinite(h?.hostAge) && h.hostAge >= 18);
    if (adults.length > 0) {
      return [...adults].sort((a, b) => (b.hostAge || 0) - (a.hostAge || 0))[0] || null;
    }
    return (grp?.hosts || [])[0] || null;
  };

  const resolveGroupLeader = (grp) => {
    const hosts = Array.isArray(grp?.hosts) ? grp.hosts : [];
    if (!hosts.length) return null;
    const manualHostId = String(plan?.bautizosGroupTitularByGroupId?.[String(grp?.groupId || '')] || '').trim();
    if (manualHostId) {
      const pick = hosts.find((h) => String(h?.hostId || '').trim() === manualHostId);
      if (pick) return pick;
    }
    return resolveDefaultGroupLeader(grp);
  };

  const setGroupLeader = (grp, hostId) => {
    const gid = String(grp?.groupId || '').trim();
    const hid = String(hostId || '').trim();
    if (!gid || !hid) return;
    setPlan((prev) => {
      const next = normalizeTransportPlanning(prev);
      const map = { ...(next.bautizosGroupTitularByGroupId || {}) };
      map[gid] = hid;
      return { ...next, bautizosGroupTitularByGroupId: map };
    });
  };

  const getHostParticipantSourceKey = (host) => {
    const participantLine = (host?.lines || []).find((ln) => ln?.kind === 'participant');
    if (participantLine?.sourceKey) return String(participantLine.sourceKey);
    const hid = String(host?.hostId || '').trim();
    return hid ? `p:${hid}` : '';
  };

  const resolveDisplayGroupCars = (grp) => {
    const keys = new Set((grp?.lines || []).map((l) => String(l.sourceKey || '').trim()).filter(Boolean));
    let explicitCars = null;
    for (const sk of keys) {
      const g = keyToGroup.get(sk);
      const c = parseInt(g?.cars, 10);
      if (!Number.isFinite(c) || c < 1) continue;
      explicitCars = explicitCars == null ? c : Math.max(explicitCars, c);
    }
    if (explicitCars != null) return explicitCars;

    let overrideCars = null;
    for (const h of grp?.hosts || []) {
      const c = parseInt(plan.familyCarOverride?.[h.hostId], 10);
      if (!Number.isFinite(c) || c < 1) continue;
      overrideCars = overrideCars == null ? c : Math.max(overrideCars, c);
    }
    if (overrideCars != null) return overrideCars;

    if (grp?.isFamily) return 1;
    const host = grp?.hosts?.[0];
    if (!host) return 1;
    const fam = { memberKeys: host.memberKeys, hostCarros: host.hostCarros, lines: host.lines };
    return bautizosFamilyEffectiveCarCount(host.hostId, fam, plan, keyToGroup);
  };

  const carGroupLabelById = useMemo(() => {
    const map = new Map();
    let familyN = 0;
    let manualN = 0;
    let genericN = 0;
    const groups = Array.isArray(plan?.carGroups) ? plan.carGroups : [];
    for (const g of groups) {
      const id = String(g?.id || '').trim();
      if (!id) continue;
      if (id.startsWith('fam-auto-') || id.startsWith('fam-')) {
        familyN += 1;
        map.set(id, `Familia ${familyN}`);
      } else if (id.startsWith('cg-')) {
        manualN += 1;
        map.set(id, `Grupo manual ${manualN}`);
      } else {
        genericN += 1;
        map.set(id, `Grupo ${genericN}`);
      }
    }
    return map;
  }, [plan?.carGroups]);

  const getCarGroupDisplayLabel = (g) => {
    const id = String(g?.id || '').trim();
    if (!id) return 'Grupo';
    return carGroupLabelById.get(id) || 'Grupo';
  };

  React.useEffect(() => {
    if (!isBautizos) return;
    const autoGroups = (bautizosCarDisplayGroups || [])
      .filter((grp) => Array.isArray(grp?.lines) && grp.lines.length > 1)
      .map((grp) => ({
        id: `fam-auto-${String(grp.groupId || '').replace(/[^a-zA-Z0-9_-]/g, '_')}`,
        memberKeys: [...new Set(grp.lines.map((l) => String(l?.sourceKey || '').trim()).filter(Boolean))],
        cars: grp.isFamily ? 1 : null,
      }))
      .filter((g) => g.memberKeys.length > 1);

    const nextAutoSig = JSON.stringify(
      autoGroups.map((g) => ({ id: g.id, keys: [...g.memberKeys].sort(), cars: g.cars ?? null })).sort((a, b) => a.id.localeCompare(b.id))
    );
    const curAuto = (plan.carGroups || []).filter((g) => String(g?.id || '').startsWith('fam-auto-'));
    const curAutoSig = JSON.stringify(
      curAuto
        .map((g) => ({
          id: String(g?.id || ''),
          keys: [...new Set((g?.memberKeys || []).map((k) => String(k).trim()).filter(Boolean))].sort(),
          cars: parseInt(g?.cars, 10) >= 1 ? parseInt(g.cars, 10) : null,
        }))
        .sort((a, b) => a.id.localeCompare(b.id))
    );
    if (nextAutoSig === curAutoSig) return;

    setPlan((prev) => {
      const next = normalizeTransportPlanning(prev);
      const keep = (next.carGroups || []).filter((g) => !String(g?.id || '').startsWith('fam-auto-'));
      const merged = { ...next, carGroups: [...keep, ...autoGroups] };
      const mergedSig = JSON.stringify(
        (merged.carGroups || [])
          .filter((g) => String(g?.id || '').startsWith('fam-auto-'))
          .map((g) => ({
            id: String(g?.id || ''),
            keys: [...new Set((g?.memberKeys || []).map((k) => String(k).trim()).filter(Boolean))].sort(),
            cars: parseInt(g?.cars, 10) >= 1 ? parseInt(g.cars, 10) : null,
          }))
          .sort((a, b) => a.id.localeCompare(b.id))
      );
      if (mergedSig === curAutoSig) return prev;
      return merged;
    });
  }, [isBautizos, bautizosCarDisplayGroups, plan.carGroups]);

  React.useEffect(() => {
    if (!isBautizos) return;
    const cleaned = sanitizeBautizosGroupTitularByGroupId(plan, bautizosCarDisplayGroups);
    if (JSON.stringify(cleaned) === JSON.stringify(plan?.bautizosGroupTitularByGroupId || {})) return;
    setPlan((prev) => {
      const next = normalizeTransportPlanning(prev);
      return { ...next, bautizosGroupTitularByGroupId: cleaned };
    });
  }, [isBautizos, bautizosCarDisplayGroups, plan?.bautizosGroupTitularByGroupId, plan?.carGroups]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Bus className="text-indigo-600 shrink-0" size={22} />
              Transporte
            </h2>
            <p className={`${uiPageHeader.subtitle} mt-1 leading-snug max-w-2xl max-md:hidden text-[11px]`}>
              Camiones y camionetas por sede de salida, asignación de pasajeros y conteo de carros. Mismos filtros de
              búsqueda y sede que Registro global y Acompañantes.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug max-w-2xl md:hidden">
              Camiones, camionetas y carros por sede. Usa la barra de búsqueda y filtros debajo.
            </p>
            {sedeScopeHint ? (
              <p className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 mt-1">{sedeScopeHint}</p>
            ) : null}
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
              Registros en plan:{' '}
              <span className="font-black text-slate-800 dark:text-slate-100 tabular-nums">{evRosterFiltered.length}</span>
              <span className="text-slate-400"> · </span>
              En camión:{' '}
              <span className="font-black text-slate-800 dark:text-slate-100 tabular-nums">{busLines.length}</span>
              <span className="text-slate-400"> · </span>
              En carro:{' '}
              <span className="font-black text-slate-800 dark:text-slate-100 tabular-nums">{carLines.length}</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                Coincidencias
              </p>
              <p className="text-2xl font-black text-indigo-700 dark:text-indigo-400 tabular-nums">
                {evRosterFiltered.length}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">
                Unidades totales: <span className="text-indigo-600 dark:text-indigo-400">{totalUnitsAll}</span>
                {' · '}
                Carros estimados: <span className="text-indigo-600 dark:text-indigo-400">{carsTotal}</span>
              </div>
              <button type="button" className={btnSecondary} onClick={() => void exportTransportPlanPdf()}>
                <FileDown size={14} />
                Exportar PDF
              </button>
              {isBautizos && canSendCarDataWhatsApp && pendingCarDataTitularCount > 0 ? (
                <button
                  type="button"
                  className={btnWhatsAppCarData}
                  onClick={() => onBulkSendCarDataWhatsApp?.()}
                  title="Enviar solicitud de datos de carro a todos los titulares pendientes visibles"
                >
                  <MessageCircle size={14} aria-hidden />
                  WhatsApp datos carro ({pendingCarDataTitularCount})
                </button>
              ) : null}
              {saving ? (
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 px-2 py-1">
                  Guardando…
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-xs">
          <label className="flex items-center gap-2 font-bold text-slate-600 dark:text-slate-300">
            Plazas camión (sugerencia)
            <input
              type="number"
              min={1}
              className={`${inputSm} w-20`}
              disabled={!canEdit}
              value={plan.defaultBusCap}
              onChange={(e) => setDefaultCaps('defaultBusCap', e.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 font-bold text-slate-600 dark:text-slate-300">
            Plazas camioneta (sugerencia)
            <input
              type="number"
              min={1}
              className={`${inputSm} w-20`}
              disabled={!canEdit}
              value={plan.defaultVanCap}
              onChange={(e) => setDefaultCaps('defaultVanCap', e.target.value)}
            />
          </label>
          {isBautizos ? (
            <label className="flex items-center gap-2 font-bold text-slate-600 dark:text-slate-300">
              Plazas / carro (familias Bautizos)
              <input
                type="number"
                min={1}
                className={`${inputSm} w-20`}
                disabled={!canEdit}
                value={plan.bautizosCarCapacity}
                onChange={(e) => {
                  const n = clampInt(e.target.value, 1, 30);
                  setPlan((prev) => ({ ...normalizeTransportPlanning(prev), bautizosCarCapacity: n }));
                }}
              />
            </label>
          ) : null}
        </div>
        {isCampa ? (
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-3 leading-snug border-t border-slate-100 dark:border-slate-700 pt-3">
            Campamento: con «Contar servidor Ambos x2…» activo en el dashboard, los camiones se planifican por bloques{' '}
            <span className="font-bold">Teens</span> y <span className="font-bold">Jóvenes</span>. En «Ambos», por defecto
            se considera llega en Teens y regresa en Jóvenes (transporte del evento), y puedes ajustar manualmente
            «Regresa Teens / Llega Jóvenes». Si desactivas esa casilla, un solo bloque por sede de salida.
          </p>
        ) : null}
      </div>

      {typeof renderGlobalRegistryListToolbar === 'function'
        ? renderGlobalRegistryListToolbar(
            basePool,
            'Solo afectan a esta vista de Transporte (misma barra que Registro global y Acompañantes). Filtra quién aparece en camión y carro según los criterios elegidos.'
          )
        : null}

      <div className="space-y-4">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 px-1">
          En transporte del evento (por sede de salida{splitCampaBySubevent ? ' · Teens / Jóvenes' : ''})
        </h3>
        {busSectionsEffective.length === 0 && busLines.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No hay pasajeros en camión.</p>
        ) : null}

        {busSectionsEffective.map((section) => {
          const passengersBase = passengersForBusGroup(busLines, section);
          const passengers = sortPassengersForDisplay(
            passengersBase
              .filter((row) => {
                if (!(isCampa && splitCampaBySubevent)) return true;
                if (String(row?.campaSegment || '') !== 'Ambos') return true;
                const t = resolveCampaAmbosTransit(row.sourceKey);
                if (section.subevent === 'Teens') return t.teenArrive || t.teenReturn;
                if (section.subevent === 'Jóvenes') return t.jovenArrive || t.jovenReturn;
                return true;
              })
              .map((row) => {
                if (!(isCampa && splitCampaBySubevent)) return { ...row, transportSourceKey: row.sourceKey };
                if (String(row?.campaSegment || '') !== 'Ambos') return { ...row, transportSourceKey: row.sourceKey };
                const sub = String(section?.subevent || '').trim();
                return { ...row, transportSourceKey: `${row.sourceKey}|${sub || 'Ambos'}` };
              })
          );
          const groupKey = section.groupKey;
          const units = getUnitsForSede(plan, groupKey);
          if (passengers.length === 0 && units.length === 0) return null;
          const requiredHint = Math.max(1, Math.ceil(passengers.length / plan.defaultBusCap));
          const assignedInSection = passengers.filter((row) => !!plan.busAssign[row.transportSourceKey || row.sourceKey]).length;
          return (
            <div
              key={`bus-${groupKey}`}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm"
            >
              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                <div className="font-black text-slate-800 dark:text-slate-100 flex flex-wrap items-center gap-2 min-w-0">
                  <Bus size={18} className="text-indigo-500 shrink-0" />
                  <span className="break-words">{section.title}</span>
                  <span className="text-[10px] font-bold text-slate-500">
                    {passengers.length} en camión · {assignedInSection} asignados · sugerido ≥ {requiredHint} camión(es){' '}
                    ({plan.defaultBusCap} plazas)
                  </span>
                </div>
                {canEdit ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={btnSecondary}
                      onClick={() => suggestUnitsForGroup(section, passengers.length)}
                    >
                      Generar unidades ({plan.defaultBusCap} plazas)
                    </button>
                    <button type="button" className={btnSecondary} onClick={() => addUnit(section, 'bus')}>
                      <Plus size={14} /> Camión
                    </button>
                    <button type="button" className={btnSecondary} onClick={() => addUnit(section, 'van')}>
                      <Plus size={14} /> Camioneta
                    </button>
                  </div>
                ) : null}
              </div>

              {units.length > 0 ? (
                <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2 border-b border-slate-100 dark:border-slate-800">
                  {units.map((u) => {
                    const occ = countAssignedToUnit(plan, u.id);
                    const cap = Math.max(1, parseInt(u.capacity, 10) || 1);
                    return (
                      <div
                        key={u.id}
                        className="rounded-xl border border-slate-200 dark:border-slate-600 p-3 flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black uppercase text-slate-500">
                            {u.kind === 'van' ? 'Camioneta' : 'Camión'}
                          </span>
                          {canEdit ? (
                            <button
                              type="button"
                              className="text-red-600 hover:text-red-700 p-1"
                              title="Quitar unidad"
                              onClick={() => removeUnit(groupKey, u.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          ) : null}
                        </div>
                        <p className="text-sm font-black text-indigo-700 dark:text-indigo-300 tabular-nums">
                          Asignados: {occ} <span className="text-slate-500 font-bold text-xs">/ {cap} plazas</span>
                        </p>
                        <input
                          type="text"
                          className={inputSm}
                          disabled={!canEdit}
                          value={u.label || ''}
                          onChange={(e) => updateUnit(groupKey, u.id, { label: e.target.value })}
                        />
                        <label className="text-[10px] font-bold text-slate-500 flex items-center gap-2">
                          Plazas
                          <input
                            type="number"
                            min={1}
                            className={`${inputSm} w-20`}
                            disabled={!canEdit}
                            value={cap}
                            onChange={(e) =>
                              updateUnit(groupKey, u.id, { capacity: clampInt(e.target.value, 1, 200) })
                            }
                          />
                          <span className="tabular-nums text-slate-700 dark:text-slate-200">
                            {occ}/{cap}
                          </span>
                        </label>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="px-4 py-3 text-xs text-amber-700 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-950/40">
                  Sin unidades definidas. Usa «Generar» o añade camión/camioneta.
                </p>
              )}

              <details className="group border-t border-slate-100 dark:border-slate-800 open:bg-slate-50/50 dark:open:bg-slate-900/40">
                <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-2 text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 [&::-webkit-details-marker]:hidden">
                  <span>
                    Lista de asistentes ({passengers.length}) — expandir para asignar
                  </span>
                  <ChevronDown
                    size={18}
                    className="text-slate-400 shrink-0 transition-transform group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <div className="overflow-x-auto px-0 pb-3">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800 text-[10px] uppercase font-black text-slate-500 border-b border-slate-100 dark:border-slate-700">
                        <th className="px-3 py-2">Persona</th>
                        <th className="px-3 py-2">Sede registro</th>
                        {isCampa && splitCampaBySubevent ? (
                          <th className="px-3 py-2">Segmento</th>
                        ) : null}
                        {isCampa && splitCampaBySubevent ? (
                          <th className="px-3 py-2">Ajuste x2</th>
                        ) : null}
                        <th className="px-3 py-2">Asignación</th>
                        <th className="px-3 py-2">Asistió (día evento)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {passengers.map((row) => {
                        const assignKey = row.transportSourceKey || row.sourceKey;
                        const cur =
                          plan.busAssign[assignKey] ||
                          (String(row?.campaSegment || '') === 'Ambos' ? plan.busAssign[row.sourceKey] || '' : '');
                        return (
                          <tr key={`${groupKey}-${assignKey}`}>
                            <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-100">{row.name}</td>
                            <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{row.location || '—'}</td>
                            {isCampa && splitCampaBySubevent ? (
                              <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                                <div className="flex flex-col gap-1">
                                  <span>{String(row.campaSegment || '—')}</span>
                                  {String(row?.campaSegment || '') === 'Ambos' ? (
                                    <span className="text-[10px] text-slate-400">Default: llega Teens / regresa Jóvenes</span>
                                  ) : null}
                                </div>
                              </td>
                            ) : null}
                            {isCampa && splitCampaBySubevent ? (
                              <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                                {String(row?.campaSegment || '') === 'Ambos' ? (
                                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
                                    <label className="inline-flex items-center gap-1">
                                      <input
                                        type="checkbox"
                                        className="rounded border-slate-300"
                                        checked={resolveCampaAmbosTransit(row.sourceKey).teenReturn}
                                        onChange={(e) => setCampaAmbosTransit(row.sourceKey, { teenReturn: e.target.checked })}
                                        disabled={!canEdit}
                                      />
                                      Regresa Teens
                                    </label>
                                    <label className="inline-flex items-center gap-1">
                                      <input
                                        type="checkbox"
                                        className="rounded border-slate-300"
                                        checked={resolveCampaAmbosTransit(row.sourceKey).jovenArrive}
                                        onChange={(e) => setCampaAmbosTransit(row.sourceKey, { jovenArrive: e.target.checked })}
                                        disabled={!canEdit}
                                      />
                                      Llega Jóvenes
                                    </label>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                            ) : null}
                            <td className="px-3 py-2">
                              <select
                                className={inputSm}
                                disabled={!canEditTransportOps}
                                value={cur}
                                onChange={(e) => assignBus(assignKey, e.target.value)}
                              >
                                <option value="">Sin asignar</option>
                                {units.map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.label} ({u.kind === 'van' ? 'Camioneta' : 'Camión'})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2">{renderTransportAttendanceCheckbox(assignKey)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 px-1 flex items-center gap-2">
          <Car size={14} />
          Llegan en carro
        </h3>
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            {isBautizos ? (
              <button type="button" className={btnSecondary} onClick={applyBautizosFamilies}>
                Sincronizar grupos en plan (carros del titular · {plan.bautizosCarCapacity} plazas/carro)
              </button>
            ) : null}
          </div>
        ) : null}

        {manualCarGroupViews.length > 0 ? (
          <details
            className="group bg-indigo-50/80 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-700/60 overflow-hidden shadow-sm"
            open={transportUiPrefs?.manualCarGroupsOpen !== false}
            onToggle={(e) => patchTransportUiPrefs({ manualCarGroupsOpen: e.currentTarget.open })}
          >
            <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-2 bg-indigo-100/80 dark:bg-indigo-900/40 border-b border-indigo-200/80 dark:border-indigo-700/50 text-[10px] font-black uppercase tracking-widest text-indigo-800 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/55 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2">
                <Car size={14} className="shrink-0" />
                Carros compartidos (grupos manuales)
                <span className="font-bold normal-case tracking-normal text-indigo-600/80 dark:text-indigo-300/80">
                  ({manualCarGroupViews.length} grupo{manualCarGroupViews.length !== 1 ? 's' : ''})
                </span>
              </span>
              <ChevronDown
                size={18}
                className="text-indigo-400 shrink-0 transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <div className="p-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
              {manualCarGroupViews.map((view) => {
                const savings = view.carsBeforeMerge > view.effectiveCars;
                const manualSlots = resolveSlotsForTitular(
                  view.titularSk,
                  view.effectiveCars,
                  expandedFamilyCardKeys.has(view.id),
                  evRosterFiltered.find(
                    (p) => String(p?.id || '').trim() === String(view.titularSk || '').replace(/^p:/, '')
                  ),
                  [],
                  view.memberLines
                );
                const manualCrewOpts = {
                  requiresPassengers: manualGroupCrewRequiresPassengers(view.memberLines.length),
                };
                const titularSummary = plan.bautizosCarMetaSummaryByTitular?.[view.titularSk];
                return (
                  <TransportBautizosCarCard
                    key={view.id}
                    cardKey={view.id}
                    cardExpanded={expandedFamilyCardKeys.has(view.id)}
                    onToggleCard={() =>
                      void handleToggleFamilyCard(view.id, view.titularSk, view.effectiveCars)
                    }
                    expandedCarFormKeys={expandedCarFormKeys}
                    onToggleCarForm={(formKey) =>
                      void handleToggleCarForm(formKey, view.titularSk, view.effectiveCars)
                    }
                    titularSk={view.titularSk}
                    effectiveCars={view.effectiveCars}
                    seatsPerCar={plan.bautizosCarCapacity}
                    slots={manualSlots}
                    titularSummary={titularSummary}
                    isLoadingMeta={loadingTitularSks.has(view.titularSk)}
                    getSlotMeta={(carIndex) => getCarMeta(view.titularSk, carIndex)}
                    crewOpts={manualCrewOpts}
                    showCollapsedCrew
                    collapsedTitularLabel={view.titularName}
                    className="rounded-xl border border-indigo-200 dark:border-indigo-600/50 bg-white dark:bg-slate-900 p-4 shadow-sm"
                    header={
                      <>
                        <p className="text-sm font-black text-indigo-800 dark:text-indigo-200 truncate" title={view.titularName}>
                          {view.titularName}
                        </p>
                        <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-300 mt-0.5">
                          Titular del grupo · conductor
                        </p>
                        <p className="text-[10px] font-bold text-indigo-500/90 dark:text-indigo-400/90 mt-1">
                          {view.label} · {view.memberLines.length} persona{view.memberLines.length !== 1 ? 's' : ''} ·{' '}
                          {view.effectiveCars} carro{view.effectiveCars !== 1 ? 's' : ''} compartido
                          {view.effectiveCars !== 1 ? 's' : ''}
                        </p>
                        {savings ? (
                          <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 mt-1">
                            Registro: {view.carsBeforeMerge} carro{view.carsBeforeMerge !== 1 ? 's' : ''} → Plan:{' '}
                            {view.effectiveCars} compartido{view.effectiveCars !== 1 ? 's' : ''}
                          </p>
                        ) : view.inheritedCars > 1 ? (
                          <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 mt-1">
                            Máximo registrado entre titulares: {view.inheritedCars} carro
                            {view.inheritedCars !== 1 ? 's' : ''} (incluye «quizá no vaya»)
                          </p>
                        ) : null}
                      </>
                    }
                    headerControls={
                      canEdit && (view.participantHosts || []).length > 1 ? (
                        <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 flex flex-col gap-0.5">
                          Cambiar titular del grupo (datos de carro)
                          <select
                            className={`${inputSm} max-w-full sm:max-w-[16rem]`}
                            value={String(view.titularSk || '').replace(/^p:/, '')}
                            onChange={(e) => setManualGroupLeader(view, e.target.value)}
                          >
                            {(view.participantHosts || []).map((h) => (
                              <option key={h.hostId} value={h.hostId}>
                                {h.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null
                    }
                    toolbar={
                      <>
                        {canEdit ? (
                          <>
                            <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 flex flex-col gap-0.5">
                              Carros del grupo
                              <input
                                type="number"
                                min={1}
                                className={`${inputSm} w-20`}
                                value={view.effectiveCars}
                                onChange={(e) => setGroupCars(view.id, e.target.value)}
                              />
                            </label>
                            <button
                              type="button"
                              className={btnSecondary}
                              onClick={() => unmergeManualCarGroup(view.id)}
                            >
                              Separar grupo
                            </button>
                          </>
                        ) : null}
                        {renderCarDataWhatsAppButton(
                          String(view.titularSk || '').replace(/^p:/, ''),
                          view.memberLines?.[0]?.location,
                          true
                        )}
                      </>
                    }
                    expandedPrefix={
                      <ul className="flex flex-wrap gap-1.5">
                        {view.memberLines.map((line) => (
                          <li
                            key={line.sourceKey}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-100/90 dark:bg-indigo-900/50 text-[10px] font-bold text-indigo-900 dark:text-indigo-100 border border-indigo-200/80 dark:border-indigo-600/40"
                          >
                            <span className="truncate max-w-[12rem]" title={line.name}>
                              {line.name}
                            </span>
                            {line.kind === 'companion' ? (
                              <span className="text-indigo-500 dark:text-indigo-300 font-semibold">Acomp.</span>
                            ) : (
                              <span className="text-indigo-600 dark:text-indigo-300 font-black uppercase text-[9px]">
                                Titular
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    }
                    bulkActions={renderCarVehicleBulkActions(view.titularSk, view.effectiveCars)}
                    renderCarForm={(carIndex, eff) =>
                      renderCarVehicleMetaBlock(view.titularSk, carIndex, eff, {
                        compact: true,
                        memberOptions: buildMemberOptionsFromLines(view.memberLines),
                        requirePassengers: manualGroupCrewRequiresPassengers(view.memberLines.length),
                      })
                    }
                  />
                );
              })}
            </div>
          </details>
        ) : null}

        {isBautizos && bautizosCarCardGroups.length > 0 ? (
          <details
            className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm"
            open={transportUiPrefs?.bautizosCarCardsOpen === true}
            onToggle={(e) => patchTransportUiPrefs({ bautizosCarCardsOpen: e.currentTarget.open })}
          >
            <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2">
                <Car size={14} className="text-indigo-500 shrink-0" />
                Personas por carro — una tarjeta por registro o familia (árboles familiares)
                <span className="font-bold normal-case tracking-normal text-slate-400">
                  ({bautizosCarCardGroups.length} grupo{bautizosCarCardGroups.length !== 1 ? 's' : ''})
                </span>
              </span>
              <ChevronDown
                size={18}
                className="text-slate-400 shrink-0 transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <div className="p-3 space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {bautizosCarCardGroups.map((grp) => {
                const groupPeople = grp.lines.length;
                const groupEff = resolveDisplayGroupCars(grp);
                const leader = resolveGroupLeader(grp);
                const cardHosts = grp.isFamily && leader ? [leader] : grp.hosts;
                return (
                  <div
                    key={`grp-${grp.groupId}`}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {grp.isFamily ? 'Familia' : 'Registro'} · {grp.hosts.length} titular{grp.hosts.length !== 1 ? 'es' : ''} · {groupPeople}{' '}
                        persona{groupPeople !== 1 ? 's' : ''}
                      </p>
                      {canEdit && grp.hosts.length > 1 ? (
                        <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 inline-flex items-center gap-2">
                          Titular familiar
                          <select
                            className={`${inputSm} w-44`}
                            value={String(leader?.hostId || '')}
                            onChange={(e) => setGroupLeader(grp, e.target.value)}
                          >
                            {grp.hosts.map((h) => (
                              <option key={h.hostId} value={h.hostId}>
                                {h.hostName}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                    </div>
                    <div className="space-y-3">
                      {cardHosts.map((host) => {
                        const cardLines =
                          grp.isFamily && leader
                            ? (grp.lines || []).map((ln) => {
                                if (ln.kind === 'participant' && String(ln.hostId || '') !== String(leader.hostId || '')) {
                                  return { ...ln, kind: 'companion' };
                                }
                                return ln;
                              })
                            : host.lines;
                        const fam = {
                          memberKeys: host.memberKeys,
                          hostCarros: host.hostCarros,
                          lines: cardLines,
                        };
                        const famOverride =
                          plan.familyCarOverride && plan.familyCarOverride[host.hostId] != null
                            ? plan.familyCarOverride[host.hostId]
                            : '';
                        const carCtx = resolveHostCarContext(host.hostId);
                        const titularSk = carCtx.hostSourceKey;
                        const eff = grp.isFamily
                          ? groupEff
                          : bautizosFamilyEffectiveCarCount(host.hostId, fam, plan, keyToGroup);
                        const slots = resolveSlotsForTitular(
                          titularSk,
                          eff,
                          expandedFamilyCardKeys.has(host.hostId),
                          carCtx.hostPerson,
                          carCtx.companions,
                          cardLines
                        );
                        const crewMemberOptions = buildCrewMemberOptions(carCtx);
                        const confirmedCars = countConfirmedCarsInSet(planForCarMetaRead, titularSk, eff);
                        const familyCrewOpts = {
                          requiresPassengers:
                            crewMemberOptions.length > 1 ||
                            crewMemberOptions.some((m) => m.kind === 'companion'),
                        };
                        return (
                          <TransportBautizosCarCard
                            key={host.hostId}
                            cardKey={host.hostId}
                            cardExpanded={expandedFamilyCardKeys.has(host.hostId)}
                            onToggleCard={() =>
                              void handleToggleFamilyCard(host.hostId, titularSk, eff)
                            }
                            expandedCarFormKeys={expandedCarFormKeys}
                            onToggleCarForm={(formKey) =>
                              void handleToggleCarForm(formKey, titularSk, eff)
                            }
                            titularSk={titularSk}
                            effectiveCars={eff}
                            seatsPerCar={plan.bautizosCarCapacity}
                            slots={slots}
                            titularSummary={plan.bautizosCarMetaSummaryByTitular?.[titularSk]}
                            isLoadingMeta={loadingTitularSks.has(titularSk)}
                            getSlotMeta={(carIndex) => getCarMeta(titularSk, carIndex)}
                            crewOpts={familyCrewOpts}
                            header={
                              <>
                                <p
                                  className="text-sm font-black text-slate-900 dark:text-slate-100 truncate"
                                  title={host.hostName}
                                >
                                  {host.hostName}
                                </p>
                                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                  Sede {host.location} · {cardLines.length} persona
                                  {cardLines.length !== 1 ? 's' : ''} en carro
                                  {grp.isFamily ? ' · titular familiar' : ''}
                                  {carCtx.inheritedFromTitular && carCtx.titularName
                                    ? ` · datos del titular ${carCtx.titularName}`
                                    : ''}
                                </p>
                                <p className="text-[10px] text-slate-600 dark:text-slate-300 mt-1">
                                  Carros en registro:{' '}
                                  <span className="font-black tabular-nums text-indigo-600 dark:text-indigo-400">
                                    {host.hostCarros}
                                  </span>
                                  {' · '}Carros efectivos:{' '}
                                  <span className="font-black tabular-nums text-indigo-600 dark:text-indigo-400">
                                    {eff}
                                  </span>
                                  {eff >= 2 ? (
                                    <>
                                      {' · '}
                                      <span className="font-black tabular-nums text-emerald-700 dark:text-emerald-400">
                                        {confirmedCars} confirmados
                                      </span>
                                    </>
                                  ) : null}
                                </p>
                              </>
                            }
                            toolbar={
                              <>
                                {renderCarDataWhatsAppButton(host.hostId, host.location, true)}
                                {canEdit ? (
                                  <label className="flex flex-col gap-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 shrink-0">
                                    Cantidad carros por familia
                                    <input
                                      type="number"
                                      min={1}
                                      className={`${inputSm} w-20`}
                                      placeholder="1"
                                      title="Sobrescribe el total de carros de este registro/familia"
                                      value={famOverride === '' ? '' : famOverride}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        if (v === '') {
                                          setPlan((prev) => {
                                            const next = normalizeTransportPlanning(prev);
                                            const o = { ...(next.familyCarOverride || {}) };
                                            delete o[host.hostId];
                                            return { ...next, familyCarOverride: o };
                                          });
                                        } else setFamilyOverride(host.hostId, v);
                                      }}
                                    />
                                  </label>
                                ) : null}
                              </>
                            }
                            bulkActions={renderCarVehicleBulkActions(titularSk, eff)}
                            renderCarForm={(carIndex, effective) =>
                              renderCarVehicleMetaBlock(titularSk, carIndex, effective, {
                                compact: true,
                                memberOptions: crewMemberOptions,
                              })
                            }
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
          </details>
        ) : null}

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <details
            className="group"
            open={transportUiPrefs?.rowByRowOpen === true}
            onToggle={(e) => patchTransportUiPrefs({ rowByRowOpen: e.currentTarget.open })}
          >
            <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 [&::-webkit-details-marker]:hidden">
              <span>
                Detalle fila a fila ({carLines.length}) — expandir
              </span>
              <ChevronDown size={18} className="text-slate-400 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <p className="px-4 pt-2 text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
              Marca y modelo: lista de referencia ~2025–2026. Con 2 o más carros por familia, capture datos de cada vehículo
              y marque «Quizá no vaya» en los que podrían no asistir (siempre debe quedar al menos uno confirmado).
            </p>
            {canEdit && (isCampa || isBautizos) ? (
              <div className="px-4 pt-3">
                <button
                  type="button"
                  className={btnSecondary}
                  onClick={() => void mergeSelectedCars()}
                  disabled={carPick.size < 2 || mergingManualGroup}
                >
                  {mergingManualGroup ? 'Cargando…' : 'Unir selección en un carro'}
                </button>
              </div>
            ) : null}
            <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-[10px] uppercase font-black text-slate-500 border-b border-slate-100 dark:border-slate-700">
                  {canEdit ? <th className="px-3 py-2 w-10" /> : null}
                  <th className="px-3 py-2">Persona</th>
                  <th className="px-3 py-2">Sede</th>
                  <th className="px-3 py-2">Carros (registro)</th>
                  <th className="px-3 py-2">Grupo / carros efectivos</th>
                  <th className="px-3 py-2">Marca</th>
                  <th className="px-3 py-2">Modelo</th>
                  <th className="px-3 py-2">Color</th>
                  <th className="px-3 py-2">Placas</th>
                  <th className="px-3 py-2">Asistió (día evento)</th>
                  {isBautizos ? <th className="px-3 py-2">Carros familia (manual)</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {carLines.length === 0 ? (
                  <tr>
                    <td colSpan={carTableColSpan} className="px-4 py-8 text-center text-slate-400 italic">
                      No hay registros que lleguen en carro.
                    </td>
                  </tr>
                ) : (
                  <>
                    {isBautizos
                      ? manualCarGroupViews.flatMap((view) => {
                          const manualRows = [];
                          const vehicleDetailKey = `manual-vehicles:${view.id}`;
                          const vehicleOpen = expandedCarDetailKeys.has(vehicleDetailKey);
                          manualRows.push(
                            <tr
                              key={`manual-hdr-${view.id}`}
                              className="bg-indigo-50/90 dark:bg-indigo-950/50 border-y border-indigo-200/80 dark:border-indigo-700/50"
                            >
                              <td colSpan={carTableColSpan} className="px-3 py-2">
                                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-black text-indigo-800 dark:text-indigo-200">
                                  <span>
                                    {view.label} · {view.memberLines.length} persona
                                    {view.memberLines.length !== 1 ? 's' : ''} · {view.effectiveCars} carro
                                    {view.effectiveCars !== 1 ? 's' : ''} compartido
                                    {view.effectiveCars !== 1 ? 's' : ''}
                                    {view.carsBeforeMerge > view.effectiveCars
                                      ? ` · Registro: ${view.carsBeforeMerge} → Plan: ${view.effectiveCars}`
                                      : ''}
                                  </span>
                                  {canEdit ? (
                                    <button
                                      type="button"
                                      className={btnSecondary}
                                      onClick={() => unmergeManualCarGroup(view.id)}
                                    >
                                      Separar grupo
                                    </button>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          );
                          for (const line of view.memberLines) {
                            const sk = line.sourceKey;
                            manualRows.push(
                              <tr key={`manual-${view.id}-${sk}`} className="bg-indigo-50/30 dark:bg-indigo-950/20">
                                {canEdit ? (
                                  <td className="px-3 py-2">
                                    <input
                                      type="checkbox"
                                      className="rounded border-slate-300"
                                      checked={carPick.has(sk)}
                                      onChange={() => toggleCarPick(sk)}
                                    />
                                  </td>
                                ) : null}
                                <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-100">
                                  {line.name}
                                  {line.kind === 'participant' ? (
                                    <span className="ml-2 text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400">
                                      Titular
                                    </span>
                                  ) : null}
                                </td>
                                <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{line.location || '—'}</td>
                                <td className="px-3 py-2 tabular-nums">{line.carrosLlegada}</td>
                                <td className="px-3 py-2">
                                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                                    {view.label} · {view.effectiveCars} efectivo{view.effectiveCars !== 1 ? 's' : ''}
                                  </span>
                                </td>
                                {renderCollapsedCarMetaCells(view.titularSk, 1)}
                                <td className="px-3 py-2">{renderTransportAttendanceCheckbox(sk)}</td>
                                {isBautizos ? <td className="px-3 py-2 text-slate-400">—</td> : null}
                              </tr>
                            );
                          }
                          manualRows.push(
                            <tr key={`manual-veh-hdr-${view.id}`} className="bg-indigo-50/20 dark:bg-indigo-950/15">
                              <td colSpan={carTableColSpan} className="px-3 py-2">
                                {renderCarDetailToggle(
                                  vehicleDetailKey,
                                  vehicleOpen ? 'Ocultar datos de carro del grupo' : 'Ver datos de carro del grupo',
                                  `${view.effectiveCars} carro${view.effectiveCars !== 1 ? 's' : ''}`,
                                  () =>
                                    void handleToggleCarDetailKey(
                                      vehicleDetailKey,
                                      view.titularSk,
                                      view.effectiveCars
                                    )
                                )}
                              </td>
                            </tr>
                          );
                          if (vehicleOpen) {
                            manualRows.push(
                              <tr key={`manual-veh-${view.id}`}>
                                <td colSpan={carTableColSpan} className="px-3 py-3 bg-slate-50/50 dark:bg-slate-800/30">
                                  {renderCarVehicleBulkActions(view.titularSk, view.effectiveCars)}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {Array.from({ length: view.effectiveCars }, (_, i) =>
                                      renderCarVehicleMetaBlock(view.titularSk, i + 1, view.effectiveCars, {
                                        compact: true,
                                        memberOptions: buildMemberOptionsFromLines(view.memberLines),
                                        requirePassengers: manualGroupCrewRequiresPassengers(view.memberLines.length),
                                      })
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          }
                          return manualRows;
                        })
                      : null}
                    {isBautizos
                      ? bautizosCarDisplayGroups.flatMap((grp) => {
                    const familyRows = [];
                    const groupEff = resolveDisplayGroupCars(grp);
                    const leader = resolveGroupLeader(grp);
                    familyRows.push(
                      <tr key={`fam-${grp.groupId}`} className="bg-slate-50/80 dark:bg-slate-800/40">
                        <td colSpan={carTableColSpan} className="px-3 py-2 text-[10px] font-black uppercase tracking-wide text-slate-600 dark:text-slate-300">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span>
                              {grp.isFamily ? 'Grupo familiar' : 'Registro'} · {grp.hosts.length} titular{grp.hosts.length !== 1 ? 'es' : ''} · {grp.lines.length} personas
                            </span>
                            {canEdit && grp.hosts.length > 1 ? (
                              <label className="text-[10px] font-bold normal-case tracking-normal text-slate-600 dark:text-slate-300 inline-flex items-center gap-2">
                                Titular familiar
                                <select
                                  className={`${inputSm} w-44`}
                                  value={String(leader?.hostId || '')}
                                  onChange={(e) => setGroupLeader(grp, e.target.value)}
                                >
                                  {grp.hosts.map((h) => (
                                    <option key={h.hostId} value={h.hostId}>
                                      {h.hostName}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                    for (const host of grp.hosts) {
                      const fam = { memberKeys: host.memberKeys, hostCarros: host.hostCarros, lines: host.lines };
                      const hostEff = grp.isFamily ? groupEff : bautizosFamilyEffectiveCarCount(host.hostId, fam, plan, keyToGroup);
                      const famOverride =
                        plan.familyCarOverride && plan.familyCarOverride[host.hostId] != null
                          ? plan.familyCarOverride[host.hostId]
                          : '';
                      const hostCarCtx = resolveHostCarContext(
                        grp.isFamily ? String((leader || host)?.hostId || host.hostId) : host.hostId
                      );
                      const hostTitularSk = hostCarCtx.hostSourceKey;
                      const showVehicleRows = !grp.isFamily || String(host.hostId) === String(leader?.hostId || host.hostId);
                      const hostVehicleDetailKey = `bautizos-host:${grp.groupId}:${host.hostId}`;
                      const hostVehicleDetailsOpen = expandedCarDetailKeys.has(hostVehicleDetailKey);
                      familyRows.push(
                        <tr key={`host-${grp.groupId}-${host.hostId}`} className="bg-white/70 dark:bg-slate-900/40">
                          <td colSpan={carTableColSpan} className="px-3 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span>
                                {host.hostName} · sede {host.location} · carros registro {host.hostCarros} · efectivos {hostEff}
                                {showVehicleRows && hostEff >= 2 ? (
                                  <span className="text-emerald-700 dark:text-emerald-400">
                                    {' '}
                                    · {countConfirmedCarsInSet(planForCarMetaRead, hostTitularSk, hostEff)} confirmados
                                  </span>
                                ) : null}
                              </span>
                              <div className="flex flex-wrap items-center gap-2">
                                {showVehicleRows
                                  ? renderCarDataWhatsAppButton(host.hostId, host.location, true)
                                  : null}
                                {showVehicleRows
                                  ? renderCarDetailToggle(
                                      hostVehicleDetailKey,
                                      hostVehicleDetailsOpen ? 'Ocultar datos de carro' : 'Ver datos de carro',
                                      `${hostEff} carro${hostEff !== 1 ? 's' : ''}`
                                    )
                                  : null}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                      if (showVehicleRows && hostVehicleDetailsOpen) {
                        familyRows.push(
                          <tr key={`host-vehicles-${grp.groupId}-${host.hostId}`}>
                            <td colSpan={carTableColSpan} className="px-3 py-3 bg-slate-50/50 dark:bg-slate-800/30">
                              {renderCarVehicleBulkActions(hostTitularSk, hostEff)}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {Array.from({ length: hostEff }, (_, i) =>
                                  renderCarVehicleMetaBlock(hostTitularSk, i + 1, hostEff, {
                                    compact: true,
                                    memberOptions: buildCrewMemberOptions(hostCarCtx),
                                  })
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      }
                      for (const line of host.lines) {
                        const sk = line.sourceKey;
                        if (manualGroupedKeys.has(String(sk).trim())) continue;
                        const g = keyToGroup.get(sk);
                        const isTitularRow =
                          String(line?.kind || '') === 'participant' &&
                          String(host?.hostId || '') === String((leader || host)?.hostId || '');
                        const eff = grp.isFamily
                          ? groupEff
                          : effectiveCarsForCarLine(line, plan, keyToGroup, isBautizos, bautizosFamilyInfo);
                        const lineHasVehicleDetails =
                          isTitularRow && showVehicleRows && String(host.hostId) === String((leader || host)?.hostId || '');
                        familyRows.push(
                          <tr key={`${grp.groupId}-${sk}`}>
                            {canEdit ? (
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  className="rounded border-slate-300"
                                  checked={carPick.has(sk)}
                                  onChange={() => toggleCarPick(sk)}
                                />
                              </td>
                            ) : null}
                            <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-100">
                              {line.name}
                              {isTitularRow ? (
                                <span className="ml-2 text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400">Titular</span>
                              ) : null}
                              {lineHasVehicleDetails ? (
                                <div className="mt-1">
                                  {renderCarDetailToggle(
                                    `bautizos-host:${grp.groupId}:${host.hostId}`,
                                    expandedCarDetailKeys.has(`bautizos-host:${grp.groupId}:${host.hostId}`)
                                      ? 'Ocultar datos'
                                      : 'Ver datos de carro',
                                    `${eff} carro${eff !== 1 ? 's' : ''}`
                                  )}
                                </div>
                              ) : null}
                            </td>
                            <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{line.location || '—'}</td>
                            <td className="px-3 py-2 tabular-nums">{line.carrosLlegada}</td>
                            <td className="px-3 py-2">
                              {g && g.memberKeys && g.memberKeys.length > 1 ? (
                                <div className="flex flex-col gap-1">
                                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                                    {getCarGroupDisplayLabel(g)}
                                  </span>
                                  {canEdit ? (
                                    <input
                                      type="number"
                                      min={1}
                                      className={`${inputSm} w-20`}
                                      value={parseInt(g.cars, 10) >= 1 ? g.cars : eff}
                                      onChange={(e) => setGroupCars(g.id, e.target.value)}
                                    />
                                  ) : (
                                    <span className="tabular-nums font-bold">{eff}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="tabular-nums">{eff}</span>
                              )}
                            </td>
                            {renderCollapsedCarMetaCells(
                              String(line.kind) !== 'participant' &&
                                (parseInt(line.carrosLlegada, 10) || 0) >= 1
                                ? sk
                                : hostTitularSk,
                              1
                            )}
                            <td className="px-3 py-2">{renderTransportAttendanceCheckbox(sk)}</td>
                            <td className="px-3 py-2">
                              {line.kind === 'participant' ? (
                                canEdit ? (
                                  <input
                                    type="number"
                                    min={1}
                                    className={`${inputSm} w-20`}
                                    placeholder="—"
                                    value={famOverride === '' ? '' : famOverride}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      if (v === '') {
                                        setPlan((prev) => {
                                          const next = normalizeTransportPlanning(prev);
                                          const o = { ...(next.familyCarOverride || {}) };
                                          delete o[host.hostId];
                                          return { ...next, familyCarOverride: o };
                                        });
                                      } else setFamilyOverride(host.hostId, v);
                                    }}
                                  />
                                ) : (
                                  <span className="tabular-nums">{famOverride !== '' ? famOverride : '—'}</span>
                                )
                              ) : (
                                '—'
                              )}
                            </td>
                          </tr>
                        );
                      }
                    }
                    return familyRows;
                  })
                      : !isBautizos
                        ? carLines.flatMap((line) => {
                    const sk = line.sourceKey;
                    const g = keyToGroup.get(sk);
                    const eff = effectiveCarsForCarLine(line, plan, keyToGroup, isBautizos, bautizosFamilyInfo);
                    const isGroup = g && g.memberKeys && g.memberKeys.length > 1;
                    const isTitularForVehicles = !isGroup || line.kind === 'participant';
                    const titularSk = line.kind === 'participant' ? sk : sk;
                    const carDetailKey = `car:${sk}`;
                    const carDetailsOpen = expandedCarDetailKeys.has(carDetailKey);
                    const rows = [
                      <tr key={sk}>
                        {canEdit ? (
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              className="rounded border-slate-300"
                              checked={carPick.has(sk)}
                              onChange={() => toggleCarPick(sk)}
                            />
                          </td>
                        ) : null}
                        <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-100">{line.name}</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{line.location || '—'}</td>
                        <td className="px-3 py-2 tabular-nums">{line.carrosLlegada}</td>
                        <td className="px-3 py-2">
                          {isGroup ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                                {getCarGroupDisplayLabel(g)}
                              </span>
                              {canEdit ? (
                                <input
                                  type="number"
                                  min={1}
                                  className={`${inputSm} w-20`}
                                  value={parseInt(g.cars, 10) >= 1 ? g.cars : eff}
                                  onChange={(e) => setGroupCars(g.id, e.target.value)}
                                />
                              ) : (
                                <span className="tabular-nums font-bold">{eff}</span>
                              )}
                            </div>
                          ) : (
                            <span className="tabular-nums">{eff}</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {isTitularForVehicles
                            ? renderCarDetailToggle(
                                carDetailKey,
                                carDetailsOpen ? 'Ocultar datos' : 'Ver datos de carro',
                                `${eff} carro${eff !== 1 ? 's' : ''}`
                              )
                            : (
                              <span className="text-slate-400">—</span>
                            )}
                        </td>
                        <td className="px-3 py-2 text-slate-400">—</td>
                        <td className="px-3 py-2 text-slate-400">—</td>
                        <td className="px-3 py-2 text-slate-400">—</td>
                        <td className="px-3 py-2">{renderTransportAttendanceCheckbox(sk)}</td>
                      </tr>,
                    ];
                    if (isTitularForVehicles && carDetailsOpen) {
                      const crewMemberOptions = isGroup
                        ? buildMemberOptionsFromGroup(g, carLines)
                        : buildMemberOptionsFromLines([line]);
                      rows.push(
                        <tr key={`${sk}-vehicles`}>
                          <td colSpan={carTableColSpan} className="px-3 py-3 bg-slate-50/50 dark:bg-slate-800/30">
                            {renderCarVehicleBulkActions(titularSk, eff)}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {Array.from({ length: eff }, (_, i) =>
                                renderCarVehicleMetaBlock(titularSk, i + 1, eff, {
                                  compact: true,
                                  memberOptions: crewMemberOptions,
                                })
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    }
                    return rows;
                  })
                        : null}
                  </>
                )}
              </tbody>
            </table>
            </div>
          </details>
        </div>
        {isBautizos ? (
          <p className="text-[10px] text-slate-500 dark:text-slate-400 px-1">
            Por defecto, titular y acompañantes comparten los carros indicados en el registro del titular. Con varios carros,
            ingrese marca, modelo, color y placas de cada uno, y asigne conductor y pasajeros (o márquelos como pendientes).
            Los grupos manuales comparten los mismos datos por carro. «Quizá no vaya» excluye ese carro del conteo estimado (debe
            quedar al menos un carro confirmado). Los cambios se sincronizan con el registro por sede y global.
          </p>
        ) : (
          <p className="text-[10px] text-slate-500 dark:text-slate-400 px-1">
            Con 2 o más carros registrados, capture los datos de cada vehículo y use «Quizá no vaya» si alguno podría no
            asistir al final.
          </p>
        )}
      </div>

      {mergeConflictModal ? (
        <div className={uiModal.overlay} role="dialog" aria-modal="true" aria-labelledby="manual-merge-title">
          <button
            type="button"
            className={uiModal.backdrop}
            aria-label="Cerrar"
            onClick={() => setMergeConflictModal(null)}
          />
          <div className={uiModal.panelMd}>
            <div className={uiModal.header}>
              <div className="min-w-0">
                <h3 id="manual-merge-title" className={uiModal.title}>
                  Datos de carro en conflicto
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                  Varias personas del grupo ya tienen datos de vehículo. Elige cuáles conservar y qué hacer con los
                  demás titulares.
                </p>
              </div>
              <button
                type="button"
                className={uiButtons.closeIcon}
                onClick={() => setMergeConflictModal(null)}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>
            <div className={`${uiModal.body} space-y-4`}>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-2">
                  Conservar datos de
                </p>
                <div className="space-y-2">
                  {mergeConflictModal.sources.map((src) => (
                    <label
                      key={src.titularSk}
                      className="flex items-start gap-2 rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="manual-merge-source"
                        className="mt-0.5"
                        checked={mergeConflictModal.selectedSourceSk === src.titularSk}
                        onChange={() =>
                          setMergeConflictModal((prev) => ({
                            ...prev,
                            selectedSourceSk: src.titularSk,
                            anchorTitularSk: src.titularSk,
                          }))
                        }
                      />
                      <span className="min-w-0">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{src.label}</span>
                        <span className="block text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{src.preview}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-2">
                  Datos de los demás titulares
                </p>
                <div className="space-y-2">
                  <label className="flex items-start gap-2 rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 cursor-pointer">
                    <input
                      type="radio"
                      name="manual-merge-orphan"
                      className="mt-0.5"
                      checked={mergeConflictModal.orphanMode === 'maybeAbsent'}
                      onChange={() =>
                        setMergeConflictModal((prev) => ({ ...prev, orphanMode: 'maybeAbsent' }))
                      }
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-200">
                      Marcar como <strong>quizá no vaya</strong> (conservar por si acaso)
                    </span>
                  </label>
                  <label className="flex items-start gap-2 rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 cursor-pointer">
                    <input
                      type="radio"
                      name="manual-merge-orphan"
                      className="mt-0.5"
                      checked={mergeConflictModal.orphanMode === 'clear'}
                      onChange={() =>
                        setMergeConflictModal((prev) => ({ ...prev, orphanMode: 'clear' }))
                      }
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-200">
                      <strong>Eliminar</strong> los datos duplicados de los otros titulares
                    </span>
                  </label>
                </div>
              </div>
            </div>
            <div className={uiModal.footer}>
              <button type="button" className={uiButtons.secondary} onClick={() => setMergeConflictModal(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className={uiButtons.primary}
                onClick={() =>
                  finalizeManualGroupMerge(
                    mergeConflictModal.keys,
                    mergeConflictModal.memberLines,
                    mergeConflictModal.anchorTitularSk || mergeConflictModal.selectedSourceSk,
                    mergeConflictModal.selectedSourceSk,
                    mergeConflictModal.orphanMode,
                    mergeConflictModal.hydratedCache
                  )
                }
              >
                Crear grupo manual
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
