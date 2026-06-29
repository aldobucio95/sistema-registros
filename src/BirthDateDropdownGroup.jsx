import React, { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { MONTHS_ES, daysInMonth, parseIso, pad2, composeIfComplete } from './birthDateIsoUtils.js';

const YEAR_MIN_OFFSET = 110;
const YEAR_MAX_OFFSET = 1;

function digitsOnly(raw, maxLen) {
  return String(raw ?? '').replace(/\D/g, '').slice(0, maxLen);
}

function clampDayForParts(dRaw, yStr, mStr) {
  const digits = digitsOnly(dRaw, 2);
  if (!digits) return '';
  let n = parseInt(digits, 10);
  if (!Number.isFinite(n)) return '';
  const yn = parseInt(yStr, 10);
  const mn = parseInt(mStr, 10);
  const cap = Number.isFinite(yn) && Number.isFinite(mn) ? daysInMonth(yn, mn) : 31;
  if (n < 1) n = 1;
  if (n > cap) n = cap;
  return pad2(n);
}

function clampYearForParts(yRaw) {
  const digits = digitsOnly(yRaw, 4);
  if (!digits) return '';
  const currentYear = new Date().getFullYear();
  const minY = currentYear - YEAR_MIN_OFFSET;
  const maxY = currentYear + YEAR_MAX_OFFSET;
  let n = parseInt(digits, 10);
  if (!Number.isFinite(n)) return digits;
  if (digits.length >= 4) {
    if (n < minY) n = minY;
    if (n > maxY) n = maxY;
    return String(n);
  }
  return digits;
}

/**
 * Día y año editables por teclado; mes en desplegable (valor ISO YYYY-MM-DD).
 */
export default function BirthDateDropdownGroup({ value, onChange, required = false, inputClasses }) {
  const [draft, setDraft] = useState(() => parseIso(value));
  const [dayText, setDayText] = useState(() => {
    const { d } = parseIso(value);
    return d ? String(parseInt(d, 10)) : '';
  });
  const [yearText, setYearText] = useState(() => parseIso(value).y);
  const prevValueRef = useRef(value);

  useEffect(() => {
    const prev = prevValueRef.current;
    prevValueRef.current = value;

    if (value) {
      const parsed = parseIso(value);
      if (parsed.y && parsed.m && parsed.d) {
        setDraft(parsed);
        setDayText(parsed.d ? String(parseInt(parsed.d, 10)) : '');
        setYearText(parsed.y || '');
      }
      return;
    }

    // Solo vaciar campos locales si el padre borró una fecha ISO válida (p. ej. limpiar formulario).
    if (prev && parseIso(prev).y) {
      setDraft({ y: '', m: '', d: '' });
      setDayText('');
      setYearText('');
    }
  }, [value]);

  const currentYear = new Date().getFullYear();
  const yearBounds = useMemo(
    () => ({ min: currentYear - YEAR_MIN_OFFSET, max: currentYear + YEAR_MAX_OFFSET }),
    [currentYear]
  );

  const pushParent = useCallback(
    (next) => {
      const iso = composeIfComplete(next);
      if (iso) onChange(iso);
    },
    [onChange]
  );

  const applyDraft = useCallback(
    (nextDraft, nextDayText, nextYearText) => {
      setDraft(nextDraft);
      if (nextDayText !== undefined) setDayText(nextDayText);
      if (nextYearText !== undefined) setYearText(nextYearText);
      pushParent(nextDraft);
    },
    [pushParent]
  );

  const setMonth = (m) => {
    setDraft((prev) => {
      let next = { ...prev, m };
      const dClamped = clampDayForParts(next.d || dayText, next.y || yearText, m);
      next = { ...next, d: dClamped };
      setDayText(dClamped ? String(parseInt(dClamped, 10)) : '');
      pushParent(next);
      return next;
    });
  };

  const onDayChange = (e) => {
    const raw = e.target.value;
    const digits = digitsOnly(raw, 2);
    setDayText(digits);
    setDraft((prev) => {
      const d = digits.length ? clampDayForParts(digits, prev.y || yearText, prev.m) : '';
      const next = { ...prev, d };
      pushParent(next);
      return next;
    });
  };

  const onDayBlur = () => {
    setDraft((prev) => {
      const d = clampDayForParts(dayText, prev.y || yearText, prev.m);
      const next = { ...prev, d };
      const display = d ? String(parseInt(d, 10)) : '';
      applyDraft(next, display, undefined);
      return next;
    });
  };

  const onYearChange = (e) => {
    const raw = e.target.value;
    const digits = digitsOnly(raw, 4);
    setYearText(digits);
    setDraft((prev) => {
      let y = digits;
      if (digits.length >= 4) y = clampYearForParts(digits);
      let next = { ...prev, y };
      if (next.m && (next.d || dayText)) {
        const d = clampDayForParts(next.d || dayText, y, next.m);
        next = { ...next, d };
      }
      pushParent(next);
      return next;
    });
  };

  const onYearBlur = () => {
    setDraft((prev) => {
      const y = clampYearForParts(yearText);
      let next = { ...prev, y };
      if (next.m && (next.d || dayText)) {
        const d = clampDayForParts(next.d || dayText, y, next.m);
        next = { ...next, d };
        const dayDisplay = d ? String(parseInt(d, 10)) : '';
        applyDraft(next, dayDisplay, y);
        return next;
      }
      applyDraft(next, undefined, y);
      return next;
    });
  };

  const subLabel =
    'text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1 block text-center sm:text-left';

  const selectCell = (child) => <div className="min-w-0">{child}</div>;

  const dayPlaceholder = required ? 'Día' : '—';
  const yearPlaceholder = required ? 'Año' : '—';
  const monthSelectClasses = `vnpm-birth-month-select ${inputClasses} appearance-none cursor-pointer text-left pl-3 pr-8`;

  const selectsRow = (
    <div className="grid min-w-0 w-full grid-cols-3 items-stretch gap-2 sm:gap-3">
      {selectCell(
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          required={required}
          value={dayText}
          onChange={onDayChange}
          onBlur={onDayBlur}
          placeholder={dayPlaceholder}
          aria-label="Día de nacimiento"
          className={inputClasses}
          maxLength={2}
        />
      )}
      {selectCell(
        <div className="relative min-w-0">
          <select
            required={required}
            value={draft.m}
            onChange={(e) => setMonth(e.target.value)}
            className={monthSelectClasses}
          >
            <option value="">{required ? 'Mes' : '(opcional)'}</option>
            {MONTHS_ES.map((mo) => (
              <option key={mo.v} value={mo.v}>
                {mo.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
            aria-hidden
          />
        </div>
      )}
      {selectCell(
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          required={required}
          value={yearText}
          onChange={onYearChange}
          onBlur={onYearBlur}
          placeholder={yearPlaceholder}
          aria-label="Año de nacimiento"
          className={inputClasses}
          maxLength={4}
          min={yearBounds.min}
          max={yearBounds.max}
        />
      )}
    </div>
  );

  const subLabelRow = (
    <div className="mt-0.5 grid min-w-0 w-full grid-cols-3 gap-2 sm:gap-3">
      <div>
        <span className={subLabel}>Día</span>
      </div>
      <div>
        <span className={subLabel}>Mes</span>
      </div>
      <div>
        <span className={subLabel}>Año</span>
      </div>
    </div>
  );

  return (
    <div className="w-full min-w-0">
      {selectsRow}
      {subLabelRow}
    </div>
  );
}
