import React, { useCallback, useEffect, useRef, useState } from 'react';
import SedeAutocompleteInput from '../SedeAutocompleteInput.jsx';
import {
  CAR_BRAND_CUSTOM,
  CAR_MODEL_CUSTOM,
  createCarCatalogView,
  findCarCatalogBrandKey,
} from '../../data/carBrandModelsCatalog.js';

const inputSm =
  'w-full min-w-0 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100';

const CAR_META_TEXT_DEBOUNCE_MS = 300;

/** Texto controlado localmente; el padre recibe cambios con debounce (o al perder foco). */
function useDebouncedTextField(externalValue, onCommit, delay = CAR_META_TEXT_DEBOUNCE_MS) {
  const [local, setLocal] = useState(() => String(externalValue || ''));
  const timerRef = useRef(null);
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  useEffect(() => {
    setLocal(String(externalValue || ''));
  }, [externalValue]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const scheduleCommit = useCallback(
    (nextValue, immediate = false) => {
      const v = String(nextValue ?? '');
      setLocal(v);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (immediate) {
        onCommitRef.current?.(v);
        return;
      }
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        onCommitRef.current?.(v);
      }, delay);
    },
    [delay]
  );

  return [local, scheduleCommit, () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }];
}

/**
 * Metadatos de un carro (marca, modelo, color, placas) y marca «quizá no vaya».
 */
export default function CarVehicleMetaPanel({
  carIndex,
  meta,
  canEdit,
  showMaybeAbsent = false,
  showPendingToggles = false,
  colorSuggestions = [],
  onFieldChange,
  onPendingFieldChange,
  onMaybeAbsentChange,
  compact = false,
  carCatalogView,
}) {
  const catalog = carCatalogView || createCarCatalogView();
  const b = String(meta?.brand || '');
  const m = String(meta?.model || '');
  const color = String(meta?.color || '');
  const plates = String(meta?.plates || '');
  const maybeAbsent = meta?.maybeAbsent === true;
  const pendingBrand = meta?.pendingBrand === true;
  const pendingModel = meta?.pendingModel === true;
  const pendingColor = meta?.pendingColor === true;
  const pendingPlates = meta?.pendingPlates === true;

  const pendingToggle = (field, pending, fieldValue) => {
    const hasValue = String(fieldValue || '').trim();
    if (!showPendingToggles || (hasValue && !pending)) return null;
    return (
      <label className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 dark:text-amber-300 cursor-pointer shrink-0">
        <input
          type="checkbox"
          className="rounded border-amber-400 accent-amber-600"
          checked={pending}
          disabled={!canEdit}
          onChange={(e) => handlePendingFieldChange(field, e.target.checked)}
        />
        Pendiente
      </label>
    );
  };

  const fieldLabel = (text, field, pending, fieldValue) => (
    <div className="flex flex-wrap items-center justify-between gap-1">
      <span className={labelCls}>{text}</span>
      {pendingToggle(field, pending, fieldValue)}
    </div>
  );

  const knownBrand = catalog.isKnownCarBrand(b);
  const canonBrand = knownBrand ? findCarCatalogBrandKey(catalog.mergedMap, b) || b : b;
  const brands = catalog.getSortedCarBrands();
  const models = knownBrand ? catalog.getCarModelsForBrand(b) : [];
  const modelInList = knownBrand && catalog.isKnownCarModel(b, m);
  const canonModel =
    modelInList && m
      ? models.find((md) => String(md).localeCompare(m, 'es', { sensitivity: 'base' }) === 0) || m
      : m;

  const [brandManualMode, setBrandManualMode] = useState(() => !knownBrand && Boolean(b));
  const [modelManualMode, setModelManualMode] = useState(() => knownBrand && Boolean(m) && !modelInList);

  useEffect(() => {
    if (knownBrand) setBrandManualMode(false);
    else if (b) setBrandManualMode(true);
  }, [knownBrand, b]);

  useEffect(() => {
    if (!knownBrand) {
      setModelManualMode(false);
      return;
    }
    if (!m) {
      setModelManualMode(false);
      return;
    }
    setModelManualMode(!modelInList);
  }, [knownBrand, m, modelInList]);

  const brandSelectVal = knownBrand ? canonBrand : brandManualMode ? CAR_BRAND_CUSTOM : '';
  const modelSelectVal = !knownBrand ? '' : modelInList ? canonModel : modelManualMode ? CAR_MODEL_CUSTOM : '';

  const commitColor = useCallback(
    (value) => onFieldChange?.('color', value),
    [onFieldChange]
  );
  const commitPlates = useCallback(
    (value) => onFieldChange?.('plates', value),
    [onFieldChange]
  );
  const commitBrandText = useCallback(
    (value) => onFieldChange?.('brand', value),
    [onFieldChange]
  );
  const commitModelText = useCallback(
    (value) => onFieldChange?.('model', value),
    [onFieldChange]
  );
  const [localColor, setLocalColor, cancelColorCommit] = useDebouncedTextField(color, commitColor);
  const [localPlates, setLocalPlates, cancelPlatesCommit] = useDebouncedTextField(plates, commitPlates);
  const [localBrandText, setLocalBrandText, cancelBrandCommit] = useDebouncedTextField(knownBrand ? '' : b, commitBrandText);
  const [localModelText, setLocalModelText, cancelModelCommit] = useDebouncedTextField(m, commitModelText);

  const handlePendingFieldChange = (field, checked) => {
    if (checked) {
      if (field === 'color') cancelColorCommit();
      if (field === 'plates') cancelPlatesCommit();
      if (field === 'brand') cancelBrandCommit();
      if (field === 'model') cancelModelCommit();
    }
    onPendingFieldChange?.(field, checked);
  };

  const labelCls = compact
    ? 'text-[9px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400'
    : 'text-[10px] font-bold text-slate-600 dark:text-slate-300';

  const readBrandModel = () => {
    const line = [b, m].filter(Boolean).join(' ') || '—';
    return (
      <p className="text-xs text-slate-700 dark:text-slate-200">
        <span className="font-bold">{line}</span>
        {color ? <span className="text-slate-500"> · {color}</span> : null}
        {plates ? <span className="font-mono text-slate-500"> · {plates}</span> : null}
      </p>
    );
  };

  return (
    <div
      className={`rounded-lg border p-2.5 ${
        maybeAbsent
          ? 'border-amber-300/80 bg-amber-50/60 dark:border-amber-700/50 dark:bg-amber-950/20'
          : 'border-slate-200 dark:border-slate-600 bg-white/80 dark:bg-slate-900/50'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <p className="text-[10px] font-black uppercase tracking-wide text-slate-600 dark:text-slate-300">
          Vehículo carro {carIndex}
          {maybeAbsent ? (
            <span className="ml-2 normal-case font-bold text-amber-700 dark:text-amber-300">· Quizá no vaya</span>
          ) : null}
        </p>
        {showMaybeAbsent ? (
          <label className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-slate-300 accent-amber-600"
              checked={maybeAbsent}
              disabled={!canEdit}
              onChange={(e) => onMaybeAbsentChange?.(e.target.checked)}
            />
            Quizá no vaya
          </label>
        ) : null}
      </div>

      {!canEdit ? (
        readBrandModel()
      ) : (
        <div className={`grid gap-2 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
          <div className="flex flex-col gap-1">
            {fieldLabel('Marca', 'brand', pendingBrand, b)}
            <select
              className={inputSm}
              value={pendingBrand ? '' : brandSelectVal}
              disabled={pendingBrand}
              onChange={(e) => {
                const v = e.target.value;
                if (v === CAR_BRAND_CUSTOM) {
                  setBrandManualMode(true);
                  onFieldChange?.('brand', '');
                } else if (v) {
                  setBrandManualMode(false);
                  onFieldChange?.('brand', v, { resetModel: true });
                } else {
                  setBrandManualMode(false);
                  onFieldChange?.('brand', '');
                }
              }}
            >
              <option value="">Marca…</option>
              {brands.map((br) => (
                <option key={br} value={br}>
                  {br}
                </option>
              ))}
              <option value={CAR_BRAND_CUSTOM}>Otra marca…</option>
            </select>
            {brandManualMode && !pendingBrand ? (
              <input
                type="text"
                className={inputSm}
                placeholder="Escriba la marca"
                value={knownBrand ? '' : localBrandText}
                onChange={(e) => setLocalBrandText(e.target.value)}
                onBlur={(e) => setLocalBrandText(e.target.value, true)}
              />
            ) : null}
          </div>
          <div className="flex flex-col gap-1">
            {fieldLabel('Modelo', 'model', pendingModel, m)}
            {!knownBrand || pendingModel ? (
              <input
                type="text"
                className={inputSm}
                placeholder="Modelo…"
                value={pendingModel ? '' : localModelText}
                disabled={pendingModel}
                onChange={(e) => setLocalModelText(e.target.value)}
                onBlur={(e) => setLocalModelText(e.target.value, true)}
              />
            ) : (
              <>
                <select
                  className={inputSm}
                  value={modelSelectVal}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === CAR_MODEL_CUSTOM) {
                      setModelManualMode(true);
                      onFieldChange?.('model', '');
                    } else if (v) {
                      setModelManualMode(false);
                      onFieldChange?.('model', v);
                    } else {
                      setModelManualMode(false);
                      onFieldChange?.('model', '');
                    }
                  }}
                >
                  <option value="">Modelo…</option>
                  {models.map((md) => (
                    <option key={md} value={md}>
                      {md}
                    </option>
                  ))}
                  <option value={CAR_MODEL_CUSTOM}>Otro modelo…</option>
                </select>
                {modelManualMode ? (
                  <input
                    type="text"
                    className={inputSm}
                    placeholder="Escriba el modelo"
                    value={modelInList ? '' : localModelText}
                    onChange={(e) => setLocalModelText(e.target.value)}
                    onBlur={(e) => setLocalModelText(e.target.value, true)}
                  />
                ) : null}
              </>
            )}
          </div>
          <div className="flex flex-col gap-1">
            {fieldLabel('Color', 'color', pendingColor, color)}
            <SedeAutocompleteInput
              type="text"
              className={inputSm}
              placeholder="Escriba el color…"
              listId={`car-color-${carIndex}`}
              suggestions={colorSuggestions}
              value={pendingColor ? '' : localColor}
              disabled={pendingColor || !canEdit}
              onChange={(e) => setLocalColor(e.target.value)}
              onBlur={(e) => setLocalColor(e.target.value, true)}
            />
          </div>
          <div className="flex flex-col gap-1">
            {fieldLabel('Placas', 'plates', pendingPlates, plates)}
            <input
              type="text"
              className={inputSm}
              placeholder="—"
              value={pendingPlates ? '' : localPlates}
              disabled={pendingPlates}
              onChange={(e) => setLocalPlates(e.target.value)}
              onBlur={(e) => setLocalPlates(e.target.value, true)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export { inputSm as carVehicleInputSm };
